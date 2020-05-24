import * as Q from "q";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { Fabric } from "OfficeFabric/Fabric";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { autobind, css, format } from "OfficeFabric/Utilities";
import * as Context from "VSS/Context";
import * as EventsService from "VSS/Events/Services";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";
import * as VSSResourcesPlatform from "VSS/Resources/VSS.Resources.Platform";
import * as Utils_String from "VSS/Utils/String";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { WikiV2, WikiType } from "TFS/Wiki/Contracts";

import { WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { getPageNameFromPath } from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";
import { WikiHubViewState, URL_Changed_Event } from "Wiki/Scripts/WikiHubViewState";
import { getWikiUrl, redirectToUrl } from "Wiki/Scripts/WikiUrls";

import { PublishWikiSource } from "Wiki/Scenarios/Publish/PublishWikiSource";
import { FullPageErrorComponent } from "Wiki/Scenarios/Shared/Components/FullPageErrorComponent";
import { MicropediaHeader } from "Wiki/Scenarios/Shared/Components/MicropediaHeader";
import { NoWikiPermissions, ZeroDataComponent } from "Wiki/Scenarios/Shared/Components/ZeroDataComponent";
import { SharedActionCreator } from "Wiki/Scenarios/Shared/SharedActionCreator";
import { ErrorProps, SharedActionsHub, UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { TelemetrySpy } from "Wiki/Scenarios/Shared/Sources/TelemetrySpy";
import { TelemetryWriter } from "Wiki/Scenarios/Shared/Sources/TelemetryWriter";
import { WikiRepoSource } from "Wiki/Scenarios/Shared/Sources/WikiRepoSource";
import { SharedState, SharedStoresHub } from "Wiki/Scenarios/Shared/Stores/SharedStoresHub";

import * as CompareModule_Async from "Wiki/Scenarios/Compare/Components/CompareModule";
import * as HistoryModule_Async from "Wiki/Scenarios/History/Components/HistoryModule";
import { showImageForError } from "Wiki/Scenarios/Overview/Components/ErrorPage";
import { OverviewModule } from "Wiki/Scenarios/Overview/Components/OverviewModule";
import * as PublishModule_Async from "Wiki/Scenarios/Publish/Components/PublishModule";
import { AdminSecuritySourceAsync } from "Wiki/Scenarios/Shared/Sources/AdminSecuritySourceAsync";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Shared/Components/WikiContainer";

export interface SharedContainerProps {
    sharedActionCreator: SharedActionCreator;
    sharedStoresHub: SharedStoresHub;
    sharedActionsHub: SharedActionsHub;
}

export interface WikiContainerProps { }

export function renderInto(container: HTMLElement, props: WikiContainerProps): void {
    ReactDOM.render(
        <WikiContainer {...props} />,
        container);
}

export function unmountFrom(container: Element): void {
    ReactDOM.unmountComponentAtNode(container);
}

export class WikiContainer extends React.Component<WikiContainerProps, SharedState> {
    private _hubViewState: WikiHubViewState;
    private _sharedActionCreator: SharedActionCreator;
    private _sharedStoresHub: SharedStoresHub;
    private _sharedActionsHub: SharedActionsHub;
    private _telemetrySpy: TelemetrySpy;
    private _telemetryPublished: boolean;

    constructor(props: WikiContainerProps) {
        super(props);

        this._hubViewState = new WikiHubViewState();

        this._sharedActionsHub = new SharedActionsHub();
        this._sharedStoresHub = new SharedStoresHub(this._sharedActionsHub, this._hubViewState);

        const tfsContext = TfsContext.getDefault();
        const wikiRepoSource = new WikiRepoSource();
        const wikiAdminSecuritySource = new AdminSecuritySourceAsync();
        const publishWikiSource = new PublishWikiSource();
        const telemetryWriter = new TelemetryWriter();
        this._telemetrySpy = new TelemetrySpy(telemetryWriter, this._sharedActionsHub, this._hubViewState);

        this._sharedActionCreator = new SharedActionCreator(
            this._hubViewState,
            {
                wikiRepoSource,
                wikiAdminSecuritySource,
                publishWikiSource,
            },
            this._sharedActionsHub,
            this._sharedStoresHub.getSharedState,
            tfsContext,
            this._telemetrySpy,
        );

        this.state = this._sharedStoresHub.state;

        this._telemetryPublished = false;

        // Loading the wiki corresponding to the wiki identifier in the URL.
        this._sharedActionCreator.loadWiki();
    }

    public componentDidMount(): void {
        this._sharedStoresHub.commonStore.addChangedListener(this._updateSharedState);
        this._sharedStoresHub.navigateAwayDialogStore.addChangedListener(this._updateSharedState);
        this._sharedStoresHub.permissionStore.addChangedListener(this._updateSharedState);

        EventsService.getService().attachEvent(URL_Changed_Event, this._onHubViewStateChanged);
        this._telemetrySpy.publishLandedOnWikiHub();
    }

    public componentWillUnmount(): void {
        this._sharedStoresHub.commonStore.removeChangedListener(this._updateSharedState);
        this._sharedStoresHub.navigateAwayDialogStore.removeChangedListener(this._updateSharedState);
        this._sharedStoresHub.permissionStore.removeChangedListener(this._updateSharedState);

        EventsService.getService().detachEvent(URL_Changed_Event, this._onHubViewStateChanged);

        this._sharedStoresHub.dispose();
        this._hubViewState.dispose();
    }

    public render(): JSX.Element {
        const action = this.state.urlState.action;

        if (action === WikiActionIds.History) {
            queueModulePreload("Wiki/Scenarios/Compare/Components/CompareModule");
        }

        if (this.state.commonState.isLoading) {
            return (
                <Spinner
                    label={VCResources.LoadingText}
                    size={SpinnerSize.large}
                    className={"wiki-spinner"}
                />
            );
        }

        const isImmersiveWikiEnabled = WikiFeatures.isImmersiveWikiEnabled();
        const childContainerProps: SharedContainerProps = {
            sharedActionCreator: this._sharedActionCreator,
            sharedActionsHub: this._sharedActionsHub,
            sharedStoresHub: this._sharedStoresHub,
        };

        return (
            <Fabric className={css("wiki-container", { immersive: isImmersiveWikiEnabled })}>
                {this._shouldShowError() &&
                    <MessageBar
                        className={"wiki-message-bar"}
                        key={"ErrorMessage"}
                        messageBarType={MessageBarType.error}
                        onDismiss={this._onDismissError}
                        isMultiline={true}
                        dismissButtonAriaLabel={WikiResources.MessageBarDismissButtonAriaLabel}>
                        {
                            (this.state.commonState.error instanceof Error)
                                ? this.state.commonState.error.message
                                : this.state.commonState.error
                        }
                    </MessageBar>
                }
                {isImmersiveWikiEnabled &&
                    <MicropediaHeader {...childContainerProps} />
                }
                {this._renderContent(childContainerProps)}
            </Fabric>
        );
    }

    private _renderContent(childContainerProps: SharedContainerProps): JSX.Element | JSX.Element[] {
        const action = this.state.urlState.action;
        const isWikiAvailable = Boolean(this.state.commonState.repositoryContext);
        const isVersionAvailable = !Boolean(this.state.commonState.wikiVersionError);
        const hasLoadError = Boolean(this.state.commonState.error);

        return !isVersionAvailable
            ? this._getWikiVersionErrorComponent()
            : action === WikiActionIds.Publish
                ? <AsyncPublishModule key={"Publish"} {...childContainerProps} />
                : isWikiAvailable
                    ? [
                        action === WikiActionIds.Compare && <AsyncCompareModule key={"Compare"} {...childContainerProps} />,
                        action === WikiActionIds.History && <AsyncHistoryModule key={"History"} {...childContainerProps} />,
                        action === WikiActionIds.Update && <AsyncPublishModule key={"Publish"} {...childContainerProps} />,
                        (action === WikiActionIds.View || action === WikiActionIds.Edit) && <OverviewModule key={"Overview"} {...childContainerProps} />
                    ]
                    : !hasLoadError && this._getPermissionsComponent();
    }

    @autobind
    private _publishWikiLandingPageTelemetry(publishMethod: () => void) {
        // We should publish each telemetry once per page load
        if (this._telemetryPublished) {
            return;
        }

        publishMethod();
        this._telemetryPublished = true;
    }

    private _shouldShowError(): boolean {
        let showError = false;

        if (this.state.commonState.error) {
            if (this.state.urlState.action === WikiActionIds.Compare || this.state.urlState.action === WikiActionIds.History) {
                showError = true;
            } else {
                showError = !showImageForError(this.state.commonState.error);
            }
        }

        return showError;
    }

    // todo: add some isPermissionLoaded checks if we really want to log telemetry here
    private _getPermissionsComponent(): JSX.Element {
        const permissions = this.state.permissionState;
        const isTfvcOnlyProject: boolean = this.state.commonState.isTfvcOnlyProject;
        const isProjectWikiPresent: boolean = this.state.commonState.isProjectWikiExisting;

        // Early bailouts
        if (isProjectWikiPresent) {
            this._publishWikiLandingPageTelemetry(this._telemetrySpy.publishLandingPageInsufficientReadPermissionScreen);
            return <NoWikiPermissions onSecurityDialogOpened={this._sharedActionCreator.showProjectWikiSecurityDialog} />;
        }

        // for stakeholders always show no permissions - As of today M142, stakeholders cant create/publish wiki because of there
        // licensing even if they have required permissions. 
        // This does not hold true for public projects where stakeholders have all the access but for wiki public projects,
        // isStakeholder is always false for all users
        if (this.state.commonState.isStakeholder) {
            return <NoWikiPermissions />;
        }

        // for tfvc only project don't rely on Git permissions - always show ZeroDataComponent
        if (!isTfvcOnlyProject) {
            const hasCodeWikiCreationPermission = WikiFeatures.isProductDocumentationEnabled() && permissions.hasContributePermission;
            const hasProjectWikiCreatePermission = permissions.hasCreatePermission;

            if (!hasCodeWikiCreationPermission && !hasProjectWikiCreatePermission) {
                this._publishWikiLandingPageTelemetry(this._telemetrySpy.publishLandingPageInsufficientWritePermissionScreen);
                return <NoWikiPermissions />;
            } else {
                // send the telemetry even if you have permission to one of these options
                this._publishWikiLandingPageTelemetry(this._telemetrySpy.publishLandingPageCreateWikiScreen);

                const createProjectWikiAction = hasProjectWikiCreatePermission ? this._onCreateWiki : null;
                const createCodeWikiAction = hasCodeWikiCreationPermission ? this._onPublishWiki : null;

                return (
                    <ZeroDataComponent
                        onCreateWiki={createProjectWikiAction}
                        onPublishWiki={createCodeWikiAction}
                    />
                );
            }

        }

        this._publishWikiLandingPageTelemetry(this._telemetrySpy.publishLandingPageCreateWikiScreen);
        return (
            <ZeroDataComponent
                onCreateWiki={this._onCreateWiki}
            />
        );
    }

    @autobind
    private _getWikiVersionErrorComponent(): JSX.Element {
        const commonState = this.state.commonState;
        const currentWiki = commonState.wiki;
        const currentWikiVersion = commonState.wikiVersion;
        const wikiHasMoreVersions: boolean = currentWiki && currentWiki.versions && currentWiki.versions.length > 1;
        let ctaText: string;
        if (WikiFeatures.isRichCodeWikiEditingEnabled() && this._sharedActionCreator.isWikiVersionDraftVersion()) {
            ctaText = WikiResources.RemoveDraftVersionCtaText;
        } else {
            ctaText = wikiHasMoreVersions
                ? WikiResources.UnpublishVersionCtaText
                : WikiResources.UnpublishWikiCtaText
        }

        // Publish CI that we have hit into a version unavailable error state
        this._publishWikiLandingPageTelemetry(this._telemetrySpy.publishWikiVersionUnavailableError);

        return (
            <FullPageErrorComponent
                primaryText={this._getPrimaryErrorText()}
                secondaryText={format(this._getSecondaryErrorText(), currentWikiVersion.version)}
                imageUrl={"Wiki/general-robot-error.svg"}
                ctaText={ctaText}
                onCta={this._sharedActionCreator.wikiVersionErrorCleanup}
            />
        );
    }

    private _getPrimaryErrorText = (): string => {
        return this._isCodeWiki() ? WikiResources.WikiCodeVersionErrorPrimaryText : WikiResources.WikiVersionErrorPrimaryText;
    }

    private _getSecondaryErrorText = (): string => {
        return this._isCodeWiki() ? WikiResources.WikiCodeVersionErrorSecondaryText : WikiResources.WikiVersionErrorSecondaryText;
    }

    private _isCodeWiki = (): boolean => {
        return this.state.commonState.wiki.type === WikiType.CodeWiki;
    }

    @autobind
    private _onPublishWiki(): void {
        this._sharedActionCreator.publishWiki();
    }

    @autobind
    private _updateSharedState(): void {
        this.setState(this._sharedStoresHub.state);
    }

    @autobind
    private _onDismissError(): void {
        this._sharedActionCreator.clearError();
    }

    @autobind
    private _onHubViewStateChanged(updatedUrlParams: UrlParameters): void {
        // Clear common state error
        this._sharedActionCreator.clearError();

        // Update window title
        this._updateWindowTitle();
        this.setState(this._sharedStoresHub.state);
    }

    @autobind
    private _onCreateWiki(): void {
        this._sharedActionCreator.createWiki();
    }

    @autobind
    private _updateWindowTitle(): void {
        const urlState = this._sharedStoresHub.state.urlState;
        const pageTitle = getPageNameFromPath(urlState.pagePath);
        const windowTitleFormat = Context.getPageContext().webAccessConfiguration.isHosted
            ? VSSResourcesPlatform.PageTitleWithContent_Hosted
            : VSSResourcesPlatform.PageTitleWithContent;

        let windowTitle = pageTitle;
        switch (urlState.action) {
            case WikiActionIds.Edit:
                windowTitle = pageTitle
                    ? Utils_String.format(WikiResources.WindowTitleWhileEditing, pageTitle)
                    : WikiResources.WindowTitleForNewPage;
                break;
            case WikiActionIds.History:
                windowTitle = Utils_String.format(WikiResources.WindowTitleForRevisionsPage, pageTitle);
                break;
            case WikiActionIds.Compare:
                windowTitle = Utils_String.format(WikiResources.WindowTitleForComparePage, pageTitle);
                break;
        }

        windowTitle = windowTitle || WikiResources.WindowTitleDefault;

        document.title = Utils_String.format(windowTitleFormat, windowTitle);
    }
}

const AsyncHistoryModule = getAsyncLoadedComponent(
    ["Wiki/Scenarios/History/Components/HistoryModule"],
    (module: typeof HistoryModule_Async) => module.HistoryModule,
    () => <Spinner className={"wiki-spinner"} />);

const AsyncCompareModule = getAsyncLoadedComponent(
    ["Wiki/Scenarios/Compare/Components/CompareModule"],
    (module: typeof CompareModule_Async) => module.CompareModule,
    () => <Spinner className={"wiki-spinner"} />);

const AsyncPublishModule = getAsyncLoadedComponent(
    ["Wiki/Scenarios/Publish/Components/PublishModule"],
    (module: typeof PublishModule_Async) => module.PublishModule,
    () => <Spinner className={"wiki-spinner"} />);