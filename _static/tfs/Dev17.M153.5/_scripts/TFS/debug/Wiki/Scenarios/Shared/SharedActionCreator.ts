import * as Q from "q";

import { autobind } from "OfficeFabric/Utilities";
import * as VSS_ClientTrace_Contract from "VSS/ClientTrace/Contracts";
import * as VSSContext from "VSS/Context";
import * as VSS_Error from "VSS/Error";
import { StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";
import * as Navigation_Services from "VSS/Navigation/Services";
import { getClient } from "VSS/Service";
import { SettingsHttpClient } from "VSS/Settings/RestClient";
import * as Utils_String from "VSS/Utils/String";

import { GitRepository, GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiType, WikiV2 } from "TFS/Wiki/Contracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { UrlEscapeConstants } from "SearchUI/Helpers/WikiHelper";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { refreshPage } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";
import { WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { GitRepositoryData } from "Wiki/Scripts/Contracts";
import { DraftVersionsConstants } from "Wiki/Scripts/Generated/Constants"
import {
    getPageNameFromPath,
    gitVersionDescriptorToVersionSpec,
    versionDescriptorToString,
    showBranchSecurityPermissions,
} from "Wiki/Scripts/Helpers";
import {
    getWikiPublishUrl,
    getWikiUrl,
    redirectToUrl,
    removeDefaultUrlParams,
} from "Wiki/Scripts/WikiUrls";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";

import { PublishWikiSource } from "Wiki/Scenarios/Publish/PublishWikiSource";
import { getRequestNoLongerValidError } from "Wiki/Scenarios/Shared/Components/Errors";
import { ErrorProps, SharedActionsHub, WikiMetadataLoadedPayload, WikiPermissions } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { AdminSecuritySourceAsync } from "Wiki/Scenarios/Shared/Sources/AdminSecuritySourceAsync";
import { WikiRepoSource, WikiMetadata } from "Wiki/Scenarios/Shared/Sources/WikiRepoSource";
import { SharedState } from "Wiki/Scenarios/Shared/Stores/SharedStoresHub";
import { TelemetrySpy } from "Wiki/Scenarios/Shared/Sources/TelemetrySpy";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { WikiHubViewState } from "Wiki/Scripts/WikiHubViewState";

export interface Sources {
    wikiRepoSource: WikiRepoSource;
    wikiAdminSecuritySource: AdminSecuritySourceAsync;
    publishWikiSource: PublishWikiSource;
}

export class SharedActionCreator {
    constructor(
        private _hubViewState: WikiHubViewState,
        private _sources: Sources,
        private _actionsHub: SharedActionsHub,
        private _getSharedState: () => SharedState,
        private _tfsContext: TfsContext,
        private _telemetrySpy?: TelemetrySpy,
    ) { }

    /**
     * Checks if any content is dirty. If so, prompts navigate away dialog and callback is called on confirming navigate away
     * @param {function} tentativeAction - Callback : called when user confirms to navigate away
     * @returns
     */
    public checkChangesToLose(tentativeAction: () => void): boolean {
        if (this._getSharedState().commonState.isPageDirty) {
            this._actionsHub.navigateAwayDialogPrompted.invoke(tentativeAction);
            return true;
        } else {
            return false;
        }
    }

    @autobind
    public dismissNavigateAwayDialog(): void {
        this._actionsHub.navigateAwayDialogDismissed.invoke(undefined);
    }

    @autobind
    public promptNavigateAwayDialog(tentativeAction: () => void): void {
        this._actionsHub.navigateAwayDialogPrompted.invoke(tentativeAction);
    }

    public updateUrl(parameters: UrlParameters, replaceHistoryPoint?: boolean, suppressViewOptionsChangeEvent?: boolean): void {
        /* '-' in URL relates to space in the page path.
         * So we need to convert '-' in page path to '%2D' to differentiate.
         */
        if (parameters && parameters.pagePath) {
            parameters.pagePath = parameters.pagePath.replace(UrlEscapeConstants.HyphenRegExp, UrlEscapeConstants.HyphenEncoding);
        }

        const updatedParameters = $.extend({}, this._hubViewState.viewOptions.getViewOptions(), parameters) as UrlParameters;
        removeDefaultUrlParams(updatedParameters);

        const historyBehavior = replaceHistoryPoint
            ? HistoryBehavior.replace
            : HistoryBehavior.newEntry;

        this._hubViewState.updateNavigationState(historyBehavior, () => {
            this._hubViewState.viewOptions.setViewOptions(updatedParameters, suppressViewOptionsChangeEvent);
        });
    }

    public showErrorIfNecessary(error: Error | JSX.Element, errorProps?: ErrorProps): void {
        this._actionsHub.stoppedLoading.invoke(null);

        // Do not show error if the error is RequestNoLongerValidError
        if (!(error instanceof Error) || error.name !== getRequestNoLongerValidError().name) {
            this._showError(error, errorProps);
        }
    }

    public clearError(): void {
        this._actionsHub.errorCleared.invoke(null);
    }

    public createWiki(): void {
        this._actionsHub.startedLoading.invoke(null);
        this._sources.wikiRepoSource.createWiki().then(
            (wiki: WikiV2) => {
                // Invoke action that a wiki is created. Listened by telemetry handler.
                this._actionsHub.wikiCreated.invoke(WikiType.ProjectWiki);

                const routeParams = {
                    wikiIdentifier: wiki.name,
                } as UrlParameters;

                redirectToUrl(getWikiUrl(WikiActionIds.View, routeParams, StateMergeOptions.routeValues));
            },
            (error: Error) => {
                this.showErrorIfNecessary(error);
                VSS_Error.publishErrorToTelemetry(error, false, VSS_ClientTrace_Contract.Level.Error, {
                    "Source": "createWiki"
                });
            }
        );
    }

    public publishWiki(): void {
        redirectToUrl(getWikiPublishUrl());
    }

    public loadWiki(): void {
        this._actionsHub.startedLoading.invoke(void 0);

        this._sources.wikiRepoSource.getWikiMetadata().then(
            (wikiMetadata: WikiMetadata) => {
                let payload: WikiMetadataLoadedPayload;
                if (!wikiMetadata) {
                    // WikiMetadata info is not present
                    payload = {} as WikiMetadataLoadedPayload;
                } else if (!this._isWikiRepositoryDataPresent(wikiMetadata)) {
                    // WikiMetadata info says no wiki repository is present
                    payload = {
                        wiki: wikiMetadata.landingWiki,
                        wikiVersion: wikiMetadata.landingWikiVersion,
                        wikiVersionError: wikiMetadata.wikiVersionError,
                        tfsContext: this._tfsContext,
                        isTfvcOnlyProject: wikiMetadata.isTfvcOnlyProject,
                        isProjectWikiExisting: wikiMetadata.isProjectWikiExisting,
                        isStakeholder: wikiMetadata.isStakeholder,
                    } as WikiMetadataLoadedPayload;
                } else {
                    // WikiMetadata info has a wiki repository
                    const repositoryContext = new GitRepositoryContext(
                        this._tfsContext,
                        wikiMetadata.wikiRepositoryData.repository);

                    const { sshUrl, sshEnabled, cloneUrl } = wikiMetadata.wikiRepositoryData ? wikiMetadata.wikiRepositoryData : {} as GitRepositoryData;
                    payload = {
                        wiki: wikiMetadata.landingWiki,
                        wikiVersion: wikiMetadata.landingWikiVersion,
                        wikiVersionError: wikiMetadata.wikiVersionError,
                        repositoryContext: repositoryContext,
                        sshUrl,
                        sshEnabled,
                        cloneUrl,
                        signalrHubUrl: wikiMetadata.signalrHubUrl,
                        tfsContext: this._tfsContext,
                        isTfvcOnlyProject: wikiMetadata.isTfvcOnlyProject,
                        isProjectWikiExisting: wikiMetadata.isProjectWikiExisting,
                        isStakeholder: wikiMetadata.isStakeholder,
                        draftVersions: wikiMetadata.draftVersions,
                    };
                }
                this._actionsHub.wikiMetadataLoaded.invoke(payload);
                this._loadPermissionsData(payload.wiki);

                if (payload.wiki) {
                    const replaceHistoryPoint = true;
                    const suppressUpdateEvent = false;

                    if (this._getSharedState().urlState.action === WikiActionIds.Update) {
                        /*
                            Update is a Wiki scoped action but not scoped to a specific version. Hence, if action is update,
                            1. Update only the landing wiki identifier in the URL. Version is not required.
                        */
                        this.updateUrl(
                            {
                                wikiIdentifier: wikiMetadata.landingWiki.name,
                            },
                            replaceHistoryPoint,
                            suppressUpdateEvent);
                    } else if (this._getSharedState().urlState.action !== WikiActionIds.Publish) {
                        /*
                            Publish is not a Wiki scoped action. Hence, if action is not publish,
                            1. Update the landing wiki identifier in the URL.
                            2. Update the landing wiki version in the URL.
                        */
                        this.updateUrl(
                            {
                                wikiIdentifier: wikiMetadata.landingWiki.name,
                                wikiVersion: versionDescriptorToString(wikiMetadata.landingWikiVersion),
                            },
                            replaceHistoryPoint,
                            suppressUpdateEvent);
                    }
                }
            },
            (error: Error) => {
                this.showErrorIfNecessary(error);
                VSS_Error.publishErrorToTelemetry(error, false, VSS_ClientTrace_Contract.Level.Error, {
                    "Source": "loadWiki"
                });
            });
    }

    public notifyContentRendered = (scenario: string, data?: any): void => {
        this._telemetrySpy.notifyContentRendered(scenario, data);
    }

    // TODO: TASK: 1191926 handle error scenarios
    public showProjectWikiSecurityDialog = (): void => {
        this._sources.wikiAdminSecuritySource.getProjectWikiRepoId().then(
            (wikiRepoId: string) => {
                showBranchSecurityPermissions(this._tfsContext, wikiRepoId);
            });
    }

    // made public for tests
    public _loadPermissionsData(wiki: WikiV2): void {
        this._sources.wikiRepoSource.getWikiPermissionData(
            wiki ? wiki.projectId : getProjectId(),
            wiki ? wiki.repositoryId : null,
            this._getSharedState().commonState.isStakeholder)
            .then((wikiPermissions: WikiPermissions) => {
                this._actionsHub.permissionsChanged.invoke(wikiPermissions);
            });
    }

    @autobind
    public wikiVersionErrorCleanup(): IPromise<boolean> {
        const commonState = this._getSharedState().commonState;
        const permissionState = this._getSharedState().permissionState;
        const currentWiki = commonState.wiki;
        const currentWikiVersion = commonState.wikiVersion;
        let wikiHasMoreVersions: boolean = currentWiki && currentWiki.versions && currentWiki.versions.length > 1;
        if (WikiFeatures.isRichCodeWikiEditingEnabled()) {
            // If current version is a draft version then definitely wiki has more versions, no need to unpublish wiki
            wikiHasMoreVersions = wikiHasMoreVersions || this.isWikiVersionDraftVersion();
        }

        const onWikiCleanupComplete = (wiki: WikiV2) => {
            if (wikiHasMoreVersions) {
                // Navigate to the same wiki, to the default version
                redirectToUrl(
                    getWikiUrl(
                        WikiActionIds.View,
                        {
                            wikiIdentifier: currentWiki.id,
                        },
                        StateMergeOptions.routeValues)
                );
            } else {
                // Navigate to default wiki
                redirectToUrl(
                    getWikiUrl(
                        WikiActionIds.View,
                        {
                            wikiIdentifier: null,
                        },
                        StateMergeOptions.routeValues)
                );
            }
        };

        const deferred = Q.defer<boolean>();

        if (wikiHasMoreVersions) {
            //Remove the unavailable draft version and update the draft versions in user settings
            let commonState = this._getSharedState().commonState;
            if (WikiFeatures.isRichCodeWikiEditingEnabled() && commonState.draftVersions) {
                let draftVersions: GitVersionDescriptor[];
                draftVersions = commonState.draftVersions;
                draftVersions = draftVersions.filter((versionDesc: GitVersionDescriptor) => {
                    return versionDesc.version !== currentWikiVersion.version;
                });
                this.updateDraftVersionsInUserSettings(draftVersions).then(
                    () => { },
                    (error: any) => {
                        deferred.reject(new Error(WikiResources.WikiVersionErrorCtaFailureText));
                    }
                );
            }

            // Remove the unavailable version
            if (!permissionState.hasContributePermission) {
                deferred.reject(new Error(WikiResources.WikiVersionErrorCtaNoPermissionMessage));
            } else {
                this._sources.publishWikiSource.unpublishWikiVersion(
                    currentWiki.id,
                    currentWiki.projectId,
                    gitVersionDescriptorToVersionSpec(currentWikiVersion),
                ).then(
                    (wiki: WikiV2) => {
                        this._telemetrySpy.unpublishedWikiVersion();
                        onWikiCleanupComplete(wiki);

                        deferred.resolve(true);
                    },
                    (error: Error) => {
                        deferred.reject(new Error(WikiResources.WikiVersionErrorCtaFailureText));
                    }
                );
            }
        } else {
            // Unpublish the wiki
            if (!permissionState.hasCreatePermission) {
                deferred.reject(new Error(WikiResources.WikiVersionErrorCtaNoPermissionMessage));
            } else {
                this._sources.publishWikiSource.unpublishWiki(
                    currentWiki.id
                ).then(
                    (wiki: WikiV2) => {
                        this._telemetrySpy.unpublishedWiki();
                        onWikiCleanupComplete(wiki);

                        deferred.resolve(true);
                    },
                    (error: Error) => {
                        deferred.reject(new Error(WikiResources.WikiVersionErrorCtaFailureText));
                    }
                );
            }
        }

        return deferred.promise;
    }

    // Returns true if the current version is one of the draft versions else returns false
    public isWikiVersionDraftVersion(): boolean {
        const commonState = this._getSharedState().commonState;
        if (commonState.draftVersions && commonState.wiki.type === WikiType.CodeWiki) {
            const version = commonState.wikiVersion.version;
            const draftVersions = commonState.draftVersions;
            for (let i = 0; i < draftVersions.length; i++) {
                if (version === draftVersions[i].version) {
                    return true;
                }
            }
        }
        return false;
    }

    // Update the draft versions in user settings
    public updateDraftVersionsInUserSettings(draftVersions: GitVersionDescriptor[]): IPromise<void> {
        const wiki = this._getSharedState().commonState.wiki;
        let settingsToUpdate: IDictionaryStringTo<GitVersionDescriptor[]> = {};
        let keyForDraftVersions = DraftVersionsConstants.DraftVersionsSettingsServiceKey.concat(wiki.id);
        settingsToUpdate[keyForDraftVersions] = draftVersions;
        return getClient(SettingsHttpClient).setEntriesForScope(settingsToUpdate, "me", "project", wiki.projectId.toString());
    }

    private _showError(error: Error | JSX.Element, errorProps: ErrorProps): void {
        this._actionsHub.errorRaised.invoke({
            error: error, errorProps: errorProps
        });
    }

    private _isWikiRepositoryDataPresent(wikiMetadata: WikiMetadata): boolean {
        return !!wikiMetadata
            && !!wikiMetadata.wikiRepositoryData;
    }
}

export function getProjectId(): string {
    return VSSContext.getPageContext().webContext.project.id;
}