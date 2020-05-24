import { autobind } from "OfficeFabric/Utilities";
import * as Q from "q";
import * as Performance from "VSS/Performance";
import * as Utils_Array from "VSS/Utils/Array";
import { Uri } from "VSS/Utils/Url";
import { IArtifactResult } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Logic/ArtifactResolver";

import { WikiSearchResponse } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { VersionControlRecursionType } from "TFS/VersionControl/Contracts";
import { ArtifactUriQueryResult, WorkItemReference } from "TFS/WorkItemTracking/Contracts";
import { WikiPage, WikiPageResponse } from "TFS/Wiki/Contracts";

import { LinkWorkItemsSource } from "Wiki/Scenarios/Integration/LinkWorkItems/LinkWorkItemsSource";
import {
    ArtifactUriToWorkItemReferencesMap,
    RenamePageDialogActionsHub,
    WikiPageUpdateData,
    WorkItemData,
} from "Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialogActionsHub";
import { RenamePageDialogSource } from "Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialogSource";
import { RenamePageDialogState } from "Wiki/Scenarios/Integration/RenamePageDialog/RenamePageDialogStore";
import { TelemetryWriter } from "Wiki/Scenarios/Shared/Sources/TelemetryWriter";
import { WikiPagesSource } from "Wiki/Scenarios/Shared/Sources/WikiPagesSource";
import { VersionedPageContent } from "Wiki/Scripts/Contracts";
import { Areas, TelemetryConstants } from "Wiki/Scripts/CustomerIntelligenceConstants";
import {
    escapeRegExp,
    getHostName,
    getLinkFromPath,
    getProjectName,
    getWikiPageUrlPath,
    replaceForwardSlashesToBackSlashes,
} from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { getWikiPageArtifactId, getWikiPageArtifactUri } from "Wiki/Scripts/WikiPageArtifactHelpers";

export interface Sources {
    LinkWorkItemsSource: LinkWorkItemsSource;
    RenamePageDialogSource: RenamePageDialogSource;
    WikiPagesSource: WikiPagesSource;
}

const defaultMaxWikiSearchResults = 200;
const defaultMaxWorkItemUrisQuery = 200;

export class RenamePageDialogActionCreator {
    private _scenarioDescriptor: Performance.IScenarioDescriptor;
    private _hasPublishedTelemetry = false;

    constructor(
        private _actionsHub: RenamePageDialogActionsHub,
        private _sources: Sources,
        private _projectId: string,
        private _repoId: string,
        private _getRenamePageDialogState: () => RenamePageDialogState,
    ) {
    }

    public EvaluatePageRename(pagePath: string): void {
        this._actionsHub.evaluationStarted.invoke(null);
        this._scenarioDescriptor = Performance.getScenarioManager().startScenario(Areas.Wiki, TelemetryConstants.HandleBrokenLinks);
        this._scenarioDescriptor.addSplitTiming("EvaluationStarted");
        const promises: IPromise<void>[] = [];

        promises.push(this._fetchWikiPageLinks(pagePath));

        promises.push(this._sources.WikiPagesSource.getPageAndSubPages(pagePath, VersionControlRecursionType.Full).then(
            (wikiPages: WikiPage[]) => {
                const wikiPagePaths: string[] = wikiPages.map((wikiPage: WikiPage) => wikiPage.path);

                return this._fetchAllAssociatedWorkItems(wikiPagePaths);
            },
            (error: Error) => {
                // Todo: handle error scenario
                throw error;
            },
        ));

        Q.allSettled(promises).then(() => {
            this._scenarioDescriptor.addSplitTiming("EvaluationCompleted");
        });
    }

    public handleBrokenLinks(
        workItemIdToDataMap: IDictionaryNumberTo<WorkItemData>,
        topLevelPageOldPath: string,
        topLevelPageNewPath: string,
    ): void {
        const promises: IPromise<void>[] = [];
        let wikiPagesUpdateData: WikiPageUpdateData[] = [];

        this._scenarioDescriptor.addSplitTiming("WikiPageLinksAutofixStarted");

        promises.push(
            this._getAllBrokenWikiPageLinks(topLevelPageOldPath)
                .then(() => {
                    const state: RenamePageDialogState = this._getRenamePageDialogState();
                    if (state) {
                        wikiPagesUpdateData = state.wikiPagesUpdateData;
                        return this._autoFixWikiPageLinks(wikiPagesUpdateData, topLevelPageOldPath, topLevelPageNewPath);
                    }
                }));

        promises.push(this._autoFixWorkItemUris(workItemIdToDataMap, topLevelPageOldPath, topLevelPageNewPath));

        Q.allSettled(promises).then(() => {
            this._scenarioDescriptor.addSplitTiming("WikiPageLinksAutofixCompleted" + wikiPagesUpdateData.length);
            this._scenarioDescriptor.end();
            this._publishTelemetry(true, false);

            this._actionsHub.autofixCompleted.invoke(null);
        });
    }

    public loadMoreWikiPageLinks(pagePath: string): IPromise<void> {
        const state = this._getRenamePageDialogState();

        if (!state.hasFetchedAllBrokenPageLinks && !state.isFetchingMorePageLinks) {
            return this._fetchWikiPageLinks(pagePath, true, state.wikiPagesUpdateData.length);
        } else {
            Q.resolve(null);
        }
    }

    public updateStarted(autofixingLinks: boolean): void {
        if (!autofixingLinks) {
            // publish telemetry now as the dialog will close when the update is complete
            this._publishTelemetry(false, true);
        }

        this._actionsHub.updateStarted.invoke(autofixingLinks);
    }

    public onDialogDismissed(autofixingLinks: boolean): void {
        this._publishTelemetry(autofixingLinks, false);
    }

    /// <summary>
    /// Called to trace CI log for aggregated set of properties.
    /// Multiple calls to this method will log telemetry only once per instance of the dialog.
    /// If user aborts the move/rename operation at any stage, "isAutofixing" and "updateWithoutFixing"
    /// both should be set to false.
    /// </summary> 
    /// <param name="isAutofixing">It should true only if user clicked on autofix option.</param>
    /// <param name="updateWithoutFixing">It should be true only if user completes operation without autofix.</param>
    private _publishTelemetry(isAutofixing: boolean, updateWithoutFixing: boolean): void {
        if (!this._hasPublishedTelemetry) {
            const state = this._getRenamePageDialogState();
            const telemetryData = {
                ...this._getRenamePageDialogState().brokenLinksAutoFixMetrics,
                evaluationStarted: state.hasEvaluationStarted,
                pagesToFixCount: state.wikiPagesToFixCount,
                workItemsToFixCount: state.workItemsToFixCount,
                autofixing: isAutofixing,
                updateWithoutFixing: updateWithoutFixing,
            };
            const telemetryWriter = new TelemetryWriter();

            telemetryWriter.publish(TelemetryConstants.HandleBrokenLinks, telemetryData);
            this._hasPublishedTelemetry = true;
        }
    }

    private _autoFixWikiPageLinks(
        wikiPagesUpdateData: WikiPageUpdateData[],
        topLevelPageOldPath: string,
        topLevelPageNewPath: string,
    ): Q.Promise<void> {
        if (!wikiPagesUpdateData || wikiPagesUpdateData.length === 0) {
            return Q.resolve(null);
        }

        // Initial promise to start the chaining
        let promise = Q.when(null);

        for (let wikiPageUpdateData of wikiPagesUpdateData) {
            const oldPagePath: string = wikiPageUpdateData.pagePath;
            const newPagePath: string = this._getNewPagePath(
                oldPagePath,
                topLevelPageOldPath,
                topLevelPageNewPath,
            );

            promise = promise.then(
                () => {
                    return this._updateWikiPageWithRetrial(
                        oldPagePath,
                        newPagePath,
                        topLevelPageOldPath,
                        topLevelPageNewPath,
                    ).then(
                        () => {
                            this._actionsHub.wikiPageLinksUpdateSucceeded.invoke(oldPagePath);
                        },
                        (error: Error) => {
                            this._actionsHub.wikiPageLinksUpdateFailed.invoke(oldPagePath);
                        },
                    );
                },
            );
        }

        return promise;
    }

    private _updateWikiPageWithRetrial(oldPagePath: string, newPagePath: string, topLevelPageOldPath: string, topLevelPageNewPath: string, totalAttempts: number = 0): IPromise<void> {
        const maxUpdateAttempts = 3;

        return this._sources.WikiPagesSource.getVersionedPageContent(newPagePath, true).then(
            (versionedPageContent: VersionedPageContent) => {
                return this._sources.WikiPagesSource.savePage(
                    newPagePath,
                    this._getUpdatedContent(versionedPageContent.content, topLevelPageOldPath, topLevelPageNewPath),
                    versionedPageContent.version,
                    WikiResources.RenamePageDialogCommitMessage,
                );
            }
        ).then(
            (response: WikiPageResponse) => {
                // Do nothing. Promise will be fulfilled.
            },
            (error: Error) => {
                if (++totalAttempts < maxUpdateAttempts) {
                    return this._updateWikiPageWithRetrial(oldPagePath, newPagePath, topLevelPageOldPath, topLevelPageNewPath, totalAttempts);
                } else {
                    throw error;
                }
            },
        );
    }

    /**
     * Making it public for UTs
     * @param initialContent: page content whose links needs to be fixed.
     * @param topLevelPageOldPath: old page path for the top level page that was renamed.
     * @param topLevelPageNewPath: new page path for the top level page that was renamed.
     */
    public _getUpdatedContent(initialContent: string, topLevelPageOldPath: string, topLevelPageNewPath: string): string {
        let pageContent: string = initialContent;

        const wikiLinkPath: string = getLinkFromPath(topLevelPageOldPath);
        const escapedOldPathWithForwardSlashes: string = escapeRegExp(wikiLinkPath);
        const newAbsolutePathWithForwardSlashes: string = getLinkFromPath(topLevelPageNewPath);
        /**
         * The following regex matches two patterns.
         *  1. [any display name](full page path or url path)
         *  2. [any display name]: full page path or url path
         */
        const wikiPathFromRootRegex: RegExp = new RegExp("(\\[.+?\\]\\()(\\\\?" + escapedOldPathWithForwardSlashes + ")((\\/.*?)?(#.+)?\\))"
            + "|" + "(\\[.+?\\]:\\s*)(\\\\?" + escapedOldPathWithForwardSlashes + ")((\\/.*?)?(#.+)?(\\s|$))", "gi");
        pageContent = pageContent.replace(wikiPathFromRootRegex, "$1$6" + newAbsolutePathWithForwardSlashes + "$3$8");

        /**
         * A backslash link should be replaced by new backslash link.
         * This is because we only match and replace page path only till root level.
         * If we replace old path that has backslash with new path having forward slashes we may end up with following type of links
         * [link display value](/rootPagePathPostReplacement\childLinkWithBackSlashes\sub-child)
         * Once we end up with mix slashes scenario, we wont be able to search of replace them later.
         */
        const escapedOldPathWithBackSlashes: string = escapeRegExp(replaceForwardSlashesToBackSlashes(wikiLinkPath));
        const newAbsolutePathLinkWithBackSlashes: string = replaceForwardSlashesToBackSlashes(getLinkFromPath(topLevelPageNewPath));

        const wikiPathBackSlashRegex: RegExp = new RegExp("(\\[.+?\\]\\()(\\\\?" + escapedOldPathWithBackSlashes + ")((\\\\.*?)?(#.+)?\\))"
            + "|" + "(\\[.+?\\]:\\s*)(\\\\?" + escapedOldPathWithBackSlashes + ")((\\/.*?)?(#.+)?(\\s|$))", "gi");
        pageContent = pageContent.replace(wikiPathBackSlashRegex, "$1$6" + newAbsolutePathLinkWithBackSlashes + "$3$8");

        const escapedOldUrlPath = escapeRegExp(getWikiPageUrlPath(topLevelPageOldPath));
        const newUrlPath = getWikiPageUrlPath(topLevelPageNewPath);
        const urlFormatRegexString: string = this._getUrlFormatRegexString();

        const urlPathRegex = new RegExp("(\\[.+?\\]\\(" + urlFormatRegexString + ")(" + escapedOldUrlPath + ")((%2F.*?)?(&.+)?(#.+)?\\))"
            + "|" + "(\\[.+?\\]:\\s*" + urlFormatRegexString + ")(" + escapedOldUrlPath + ")((%2F.*?)?(&.+)?(#.+)?(\\s|$))", "gi");
        pageContent = pageContent.replace(urlPathRegex, "$1$7" + newUrlPath + "$3$9");

        return pageContent;
    }

    private _autoFixWorkItemUris(
        workItemIdToDataMap: IDictionaryNumberTo<WorkItemData>,
        topLevelPageOldPagePath: string,
        topLevelPageNewPagePath: string,
    ): IPromise<void> {
        const workItemIdToUpdateUris: IDictionaryNumberTo<IDictionaryStringTo<string>> = {};
        let shouldUpdateWorkItems = false;

        for (const workItemId in workItemIdToDataMap) {
            if (workItemIdToDataMap.hasOwnProperty(workItemId)) {
                const wikiPagePaths: string[] = workItemIdToDataMap[workItemId].wikiPagePaths;
                const updateUris: IDictionaryStringTo<string> = {};

                wikiPagePaths.forEach((pagePath: string) => {
                    const newPagePath: string = this._getNewPagePath(pagePath, topLevelPageOldPagePath, topLevelPageNewPagePath);
                    const newUri: string = getWikiPageArtifactUri(getWikiPageArtifactId(this._projectId, this._repoId, newPagePath));
                    const oldUri: string = getWikiPageArtifactUri(getWikiPageArtifactId(this._projectId, this._repoId, pagePath));

                    updateUris[oldUri] = newUri;
                });
                workItemIdToUpdateUris[parseInt(workItemId)] = updateUris;
                shouldUpdateWorkItems = true;
            }
        }

        if (shouldUpdateWorkItems) {
            return this._sources.RenamePageDialogSource.updateWorkItemsArtifactUris(workItemIdToUpdateUris)
                .then((updateResults: IDictionaryNumberTo<boolean>) => {
                    this._actionsHub.workItemUpdateResultsLoaded.invoke(updateResults);
                },
                    (error: Error) => {
                        this._actionsHub.workItemUpdatesFailed.invoke(null);
                    }
                );
        } else {
            return Q.resolve(null);
        }
    }

    @autobind
    private _getAllBrokenWikiPageLinks(pagePath: string): IPromise<void> {
        if (!this._getRenamePageDialogState().hasFetchedAllBrokenPageLinks) {
            return this.loadMoreWikiPageLinks(pagePath).then(() => {
                return this._getAllBrokenWikiPageLinks(pagePath);
            });
        } else {
            return Q.resolve(null);
        }
    }

    private _getNewPagePath(pagePathToUpdate: string, topLevelPageOldPath: string, topLevelPageNewPath: string): string {
        if (pagePathToUpdate === topLevelPageOldPath) {
            return topLevelPageNewPath;
        } else {
            // Page is renamed as it is a sub page of top level page which is renamed.
            return pagePathToUpdate.replace(topLevelPageOldPath + "/", topLevelPageNewPath + "/");
        }
    }

    private _fetchAllAssociatedWorkItems(wikiPagePaths: string[]): IPromise<void> {
        const wikiPageArtifactUris: string[] = wikiPagePaths.map(
            (pagePath: string) => getWikiPageArtifactUri(getWikiPageArtifactId(this._projectId, this._repoId, pagePath))
        );

        return this._fetchAllWorkItemReferencesFromArtifactUris(wikiPageArtifactUris)
            .then((artifactUrisWorkItemReferencesMap: ArtifactUriToWorkItemReferencesMap) => {
                this._actionsHub.workItemReferencesLoaded.invoke(artifactUrisWorkItemReferencesMap);

                const workItemIds: number[] = [];
                const workItemIdMap: IDictionaryNumberTo<boolean> = {};


                wikiPageArtifactUris.forEach((artifactUri: string) => {
                    artifactUrisWorkItemReferencesMap[artifactUri].forEach((workItemReference: WorkItemReference) => {
                        const workItemId = workItemReference.id;

                        if (!workItemIdMap[workItemId]) {
                            workItemIdMap[workItemId] = true;
                            workItemIds.push(workItemId);
                        }
                    });
                });

                return this._sources.RenamePageDialogSource.resolveArtifacts(workItemIds).then(
                    (artifactResult: IArtifactResult) => {
                        this._actionsHub.workItemsDisplayDataLoaded.invoke(artifactResult.resolvedArtifacts);
                    },
                    (error: Error) => {
                        // Todo: handle error scenario
                        throw error;
                    },
                );
            });
    }

    private _fetchAllWorkItemReferencesFromArtifactUris(wikiPageArtifactUris: string[]): IPromise<ArtifactUriToWorkItemReferencesMap> {
        if (!wikiPageArtifactUris || wikiPageArtifactUris.length === 0) {
            return Q.resolve({});
        }

        let promise = Q.when({});
        for (let count = 0; count < wikiPageArtifactUris.length; count += defaultMaxWorkItemUrisQuery) {
            promise = promise.then((artifactUrisResult: ArtifactUriToWorkItemReferencesMap) => {
                return this._sources.LinkWorkItemsSource.queryWorkItemsForArtifactUris(wikiPageArtifactUris.slice(count, count + defaultMaxWorkItemUrisQuery), null)
                    .then((result: ArtifactUriQueryResult) => {
                        Object.assign(artifactUrisResult, result.artifactUrisQueryResult);
                        return artifactUrisResult;
                    });
            });
        }

        return promise;
    }

    private _fetchWikiPageLinks(
        pagePath: string,
        isLoadMore: boolean = false,
        skipCount: number = 0,
        maxResultsCount: number = defaultMaxWikiSearchResults): IPromise<void> {

        // Todo: remove setTimeout, instead use scopes for action.
        setTimeout(() => { this._actionsHub.fetchingPageLinks.invoke(isLoadMore) }, 0);

        return this._sources.RenamePageDialogSource.queryWikiPageNameSearch(pagePath, skipCount, maxResultsCount, this._projectId).then(
            (response: WikiSearchResponse) => {
                this._actionsHub.wikiPageSearchResultLoaded.invoke({
                    wikiSearchResponse: response,
                    isLoadMore,
                });
            },
            (error: Error) => {
                // Todo: handle error scenario
                throw error;
            }
        );
    }

    private _getUrlFormatRegexString(): string {
        /**
         * The Regex string is of following format
         * There can be 3 types of url in use today, they are.
         * New hosted url format: devops.azure.com/<org name>/<project name>/_wiki/wikis
         * Old hosted url format: <org name>.visualStudio.com/<project name>/_wiki/wikis
         * onPremServerUrl:8080/tfs/<collection name>/<project name>/_wiki/wikis
         * 
         * In regex, we are matching, <org/collection name> <project name> <_wiki/wikis> <pagePath=>
         * Between every set there can be any number of non new line characters.
         * If it is hosted it org name will be used, else collection name will be used.
         */
        const urlFormatRegexString: string =
            ".+?" + escapeRegExp(getHostName()) +
            "*?/" + escapeRegExp(encodeURI(getProjectName())) +
            "/_wiki/wikis" + 
            ".+?pagePath=";

        return urlFormatRegexString;
    }
}
