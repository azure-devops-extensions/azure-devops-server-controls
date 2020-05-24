import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import {
    ChangeList,
    GitHistoryQueryResults,
    HistoryEntry
} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";
import * as FeatureManagement_Contracts_Async from "VSS/FeatureManagement/Contracts";
import * as FeatureManagement_RestClient_Async from "VSS/FeatureManagement/RestClient";
import * as Utils_Accessibility from "VSS/Utils/Accessibility";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_Date from "VSS/Utils/Date";
import { DelayAnnounceHelper } from "VersionControl/Scripts/DelayAnnounceHelper";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { HistoryCommitsSource } from "VersionControl/Scenarios/History/GitHistory/Sources/HistoryCommitsSource";
import { HistorySourcesHub } from "VersionControl/Scenarios/History/GitHistory/Sources/HistorySourcesHub";
import * as GitCommitExtendedContracts from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { GraphSettingsConstants } from "VersionControl/Scenarios/History/GitHistory/GitGraph/GraphConstants";
import { IHistoryGraph } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import { GitPermissionsSource, GitRepositoryPermissionSet } from "VersionControl/Scenarios/Shared/Permissions/GitPermissionsSource";
import * as SearchCriteriaUtil from "VersionControl/Scripts/Utils/SearchCriteriaUtil";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import VCContracts = require("TFS/VersionControl/Contracts");
import VCLegacyContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import { HistoryTabAggregatedState } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";
import VCOM = require("VersionControl/Scripts/TFS.VersionControl");

import {
    HistoryTabActionsHub,
    HistoryItemsLoadedPayload,
    GitHistoryDataProviderArguments,
    GitCommitLookupArguments,
    GitHistoryQueryArguments,
    GitArtifactsQueryArguments,
    GitGraphQueryArguments,
    CommitOrder,
    GitLogHistoryMode,
    GitHistorySearchCriteria,
    GitHistoryDataOptions,
    IMessage,
    HistoryPermissionSet
} from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { SettingsPermissions, SettingsPermissionsSource } from "VersionControl/Scenarios/Shared/Permissions/SettingsPermissionsSource";

/**
 * The entry point to trigger actions on the History tab.
 */
export class HistoryTabActionCreator {
    private _delayAnnounceHelper: DelayAnnounceHelper;

    constructor(
        private actionsHub: HistoryTabActionsHub,
        private sourcesHub: HistorySourcesHub,
        private _getAggregatedState: () => HistoryTabAggregatedState,
        private readonly shouldReportLoadError = (path: string) => true,
        private _settingsPermissionSource?: SettingsPermissionsSource,
        private skipInitialUpdatePermissions: boolean = false,
    ) {
        this._delayAnnounceHelper = new DelayAnnounceHelper();
        if (!this._settingsPermissionSource){
            this._settingsPermissionSource = new SettingsPermissionsSource();
        }
        this.initializeFilterPanelVisibility();

        if (!skipInitialUpdatePermissions) {
            this.updatePermissions();
        }
    }

    public flushErrorNotification = (): void => {
        this.actionsHub.errorFlushed.invoke(null);
    }

    /*
     * In order to avoid flickering of history list results and spinner
     * This clears the history list rendered on the page when the tab is changed
     */
    public clearHistoryList = (): void => {
        this.actionsHub.historyItemsCleared.invoke(null);
    }

    /**
     * Fetches history of a renamed file
     * @param item the item for which rename history has to be fetched
     * @param currentSearchCriteria GitHistorySearchCriteria to be passed to the server
     * @param appendToExistingResults flag to whether append the the results to current list or overwrite
     * @param excludeInitialSourceRename if the first rename commit entry in the list has to be removed or not
     */
    public fetchRenameHistory(
        item: HistoryEntry,
        currentSearchCriteria: GitHistorySearchCriteria,
        dataOptions: GitHistoryDataOptions,
        appendToExistingResults: boolean,
        excludeInitialSourceRename: boolean): void {
        const childHistoryItemVersion: string = "P" + item.changeList.version;

        const newSearchCriteria = <GitHistorySearchCriteria>$.extend({}, currentSearchCriteria, {
            itemPath: item.serverItem,
            itemVersion: childHistoryItemVersion,
            skip: 0,
        });

        this.fetchHistory(newSearchCriteria, dataOptions, appendToExistingResults, excludeInitialSourceRename, true);
    }

    public fetchMoreItems(
        unpopulatedCount: number,
        uncalculatedCount: number,
        currentSearchCriteria: GitHistorySearchCriteria,
        dataOptions: GitHistoryDataOptions,
        maxItemToFetch: number,
        currentResultLength: number,
        startingCommitId: string
    ): void {
        let searchCriteria: GitHistorySearchCriteria;
        let appendToExistingResults: boolean;

        if (unpopulatedCount > 0 || uncalculatedCount > 0) {
            searchCriteria = $.extend({}, currentSearchCriteria, {
                top: (currentSearchCriteria.top + maxItemToFetch)
            }) as GitHistorySearchCriteria;
            appendToExistingResults = false;
        }
        else {
            searchCriteria = $.extend({}, currentSearchCriteria, {
                top: maxItemToFetch
            }) as GitHistorySearchCriteria;

            searchCriteria.skip = currentResultLength;

            // In case, the starting commit id is undefined, we don't create the item version.
            // Because GitCommitVersionSpec creates an invalid item version which server doesn't 
            // understand and throws error.
            if (startingCommitId) {
                searchCriteria.itemVersion = new VCSpecs.GitCommitVersionSpec(startingCommitId).toVersionString();
            }
            appendToExistingResults = true;
        }

        this.fetchHistory(searchCriteria, dataOptions, appendToExistingResults);
    }

    public setGraphColumnDisplay = (
        show: boolean,
        searchCriteria: GitHistorySearchCriteria,
        dataOptions: GitHistoryDataOptions,
        appendToExistingResults: boolean = false,
        excludeInitialSourceRename: boolean = false
    ): void => {
        if (this.actionsHub.historyItemsLoadStarted) {
            this.actionsHub.historyItemsLoadStarted.invoke(null);
        }
        VSS.requireModules(["VSS/FeatureManagement/Contracts", "VSS/FeatureManagement/RestClient"])
            .spread((
                FeatureManagement_Contracts: typeof FeatureManagement_Contracts_Async,
                FeatureManagement_RestClient: typeof FeatureManagement_RestClient_Async) => 
            {
                const featureId = "ms.vss-code-web.version-control-git-graph";
                const userScope = "me";
                Service.getClient(FeatureManagement_RestClient.FeatureManagementHttpClient)
                    .setFeatureState(
                        {
                            featureId,
                            state: show ? FeatureManagement_Contracts_Async.ContributedFeatureEnabledValue.Enabled : FeatureManagement_Contracts_Async.ContributedFeatureEnabledValue.Disabled,
                            scope: {
                                userScoped: true,
                                settingScope: null,
                            },
                        } as FeatureManagement_Contracts_Async.ContributedFeatureState,
                        featureId,
                        userScope)
                    .then((result) => {
                        // Reset top and skip
                        searchCriteria.top = undefined;
                        searchCriteria.skip = undefined;

                        this.fetchHistory(searchCriteria, dataOptions, appendToExistingResults, excludeInitialSourceRename);
                    },(error) => {
                        VSS.handleError(error);
                    });
            });
    }

    public fetchHistory = (
        searchCriteria: GitHistorySearchCriteria,
        dataOptions: GitHistoryDataOptions,
        appendToExistingResults: boolean = false,
        excludeInitialSourceRename: boolean = false,
        isFetchingRenameHistory?: boolean
    ): void => {
        if (this.actionsHub.historyItemsLoadStarted && !appendToExistingResults) {
            this.actionsHub.historyItemsLoadStarted.invoke(null);
        }

        this._delayAnnounceHelper.startAnnounce(VCResources.FetchingResultsText);

        const dataProviderArgs: GitHistoryDataProviderArguments = this._getDataProviderArguments(searchCriteria, dataOptions, isFetchingRenameHistory);

        if (this.sourcesHub && this.sourcesHub.historyCommitsSource) {
            this.sourcesHub.historyCommitsSource.getCommitsFromDataProvider(dataProviderArgs).then<void>(
                commitSearchResults => {
                    if (commitSearchResults && !commitSearchResults.searchCancelled && commitSearchResults.commits) {

                        this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText);

                        this._invokeHistoryItemsLoadedAction(
                            commitSearchResults,
                            searchCriteria,
                            dataOptions,
                            appendToExistingResults,
                            excludeInitialSourceRename,
                            isFetchingRenameHistory);

                        this._fetchArtifactsIfNecessary(commitSearchResults, searchCriteria, dataOptions, excludeInitialSourceRename);
                    }
                },
                (error: Error) => {
                    this._delayAnnounceHelper.stopAndCancelAnnounce(VCResources.ResultsFetchedText, true);
                    if (this.shouldReportLoadError(searchCriteria.itemPath)) {
                        this.actionsHub.historyItemsLoadErrorRaised.invoke(error);
                    }
                });
        }
    }

    /* Loads the history items from the json island if exists else fetch the history from the server
     */
    public loadHistoryItems = (
        searchCriteria: GitHistorySearchCriteria,
        dataOptions: GitHistoryDataOptions
    ): void => {
        if (this.sourcesHub && this.sourcesHub.historyCommitsSource) {
            const commitSearchResults = this.sourcesHub.historyCommitsSource.getCommitsFromJsonIsland();
            if (commitSearchResults && commitSearchResults.commits) {
                const historyQueryResult: VCLegacyContracts.GitHistoryQueryResults = this.sourcesHub.historyCommitsSource.getHistoryQueryResults(commitSearchResults);
                this._truncateToFirstRenameCommit(commitSearchResults, historyQueryResult, searchCriteria, false);
                const historyItemsLoadedPayload: HistoryItemsLoadedPayload = {
                    gitHistoryQueryResult: historyQueryResult,
                    searchCriteria: searchCriteria,
                    dataOptions: dataOptions,
                    resultsObjectType: commitSearchResults.resultsObjectType,
                    webClientGraphRows: commitSearchResults.graphRows,
                    isGitGraphFeatureEnabled: commitSearchResults.isGitGraphFeatureEnabled,
                    skipResultsForNextFetch: historyQueryResult.results.length,
                    appendToExistingResults: false,
                };
                this.actionsHub.historyItemsLoaded.invoke(historyItemsLoadedPayload);
                this.actionsHub.historyArtifactsLoadStarted.invoke(void 0);

                this._fetchArtifactsIfNecessary(commitSearchResults, searchCriteria, dataOptions);
            }
            else { //If json island for history commits does not exist then fetch the history from the server
                this.fetchHistory(searchCriteria, dataOptions);
            }
        }
    }

    public dismissGraphMessage = (key: string): void => {
        this.actionsHub.historyGraphMessageDismissed.invoke(key);
    }

    public graphRowSelected = (historyGraph: IHistoryGraph, selectedCommitId: string): void => {
        historyGraph.select(selectedCommitId);

        this.actionsHub.historyGraphRowSelected.invoke(historyGraph);
    }

    public graphRowUnSelected = (historyGraph: IHistoryGraph): void => {
        historyGraph.unSelect();

        this.actionsHub.historyGraphRowUnSelected.invoke(historyGraph);
    }

    public setHistoryCommitsSourcesHub(sourcesHub: HistorySourcesHub): void {
        this.sourcesHub = sourcesHub;
    }

    public onHistoryItemclick = (event: React.MouseEvent<HTMLAnchorElement>, customerIntelligenceData: CustomerIntelligenceData): void => {
        let ciPropertiesChangeLinkOpen: { [x: string]: any } = {};
        if (event.type === "click") {
            ciPropertiesChangeLinkOpen = {
                "Event": "Click",
                "IsCtrl": event.ctrlKey
            };
        }

        this._recordTelemetry(customerIntelligenceData, CustomerIntelligenceConstants.CHANGELINK_OPENED, true, ciPropertiesChangeLinkOpen);

        onClickNavigationHandler(event , CodeHubContributionIds.historyHub, (event.currentTarget as HTMLAnchorElement).href);
    }

    public updatePermissions(): void {
        if (this.sourcesHub && this.sourcesHub.permissionsSource) {
            this.sourcesHub.permissionsSource.queryDefaultGitRepositoryPermissionsAsync()
                .then(permissionSet => this._handlePermissionsUpdated(permissionSet))
                .then(null, this._raiseError);
        }
        this._settingsPermissionSource.querySettingsPermissionsAsync()
            .then(permissionSet => { this._handleSettingsPermissionsUpdated(permissionSet); }, this._raiseError);
    }

    private _handlePermissionsUpdated(permissionSet: GitRepositoryPermissionSet): void {
        this.actionsHub.permissionsUpdated.invoke(permissionSet);
    }

    private _handleSettingsPermissionsUpdated(permissionSet: SettingsPermissions): void {
        this.actionsHub.settingsPermissionsUpdated.invoke(permissionSet);
    }

    @autobind
    private _raiseError(error: Error): void {
        this.actionsHub.historyItemsLoadErrorRaised.invoke(error);
    }

    private _recordTelemetry = (
        customerIntelligenceData: CustomerIntelligenceData,
        featureName: string,
        publishImmediate: boolean,
        properties: {[x: string]: any }): void => {

        const ciData = new CustomerIntelligenceData();
        if (customerIntelligenceData) {
            ciData.area = customerIntelligenceData.area ? customerIntelligenceData.area : ciData.area;
            ciData.properties = $.extend({}, properties, customerIntelligenceData.properties);
        }

        ciData.publish(featureName, false, null, publishImmediate);
    }

    private _fetchArtifactsIfNecessary(
        commitSearchResults: GitCommitExtendedContracts.GitCommitSearchResultsExtended,
        searchCriteria: GitHistorySearchCriteria,
        dataOptions: GitHistoryDataOptions,
        excludeInitialSourceRename: boolean = false
    ): void {
        if (this._shouldFetchArtifacts(dataOptions) && commitSearchResults.commits.length > 0) {
            const commitsToFetchArtifactsFor = commitSearchResults.commits.map((commit: VCContracts.GitCommitRef) => {
                return commit.commitId;
            });
            const dataProviderArgs = this._getDataProviderArgumentsForArtifacts(searchCriteria, dataOptions, commitsToFetchArtifactsFor);
            this._fetchArtifacts(dataProviderArgs);
        }
    }

    private _fetchArtifacts(dataProviderArgs: GitHistoryDataProviderArguments): void {
        this.sourcesHub.historyCommitsSource.getCommitsFromDataProvider(dataProviderArgs).then(
            commitSearchResultsOnlyArtifacts => {
                if (commitSearchResultsOnlyArtifacts && commitSearchResultsOnlyArtifacts.commits) {
                    this.actionsHub.historyArtifactsLoaded.invoke(this._buildCommitArtifactsMap(commitSearchResultsOnlyArtifacts));
                }
            },
            error => this.actionsHub.historyItemsLoadErrorRaised.invoke(error));
    }

    private _invokeHistoryItemsLoadedAction(
        commitsSearchResults: GitCommitExtendedContracts.GitCommitSearchResultsExtended,
        searchCriteria: GitHistorySearchCriteria,
        dataOptions: GitHistoryDataOptions,
        appendToExistingResults: boolean,
        excludeInitialSourceRename: boolean,
        isFetchingRenameHistory?: boolean,
    ): void {
        const historyQueryResult: VCLegacyContracts.GitHistoryQueryResults = this.sourcesHub.historyCommitsSource.getHistoryQueryResults(commitsSearchResults);
        this._truncateToFirstRenameCommit(
            commitsSearchResults,
            historyQueryResult,
            searchCriteria,
            excludeInitialSourceRename);
        const historyResultLength = historyQueryResult.results.length;
        const historyItemsLoadedPayload: HistoryItemsLoadedPayload = {
            gitHistoryQueryResult: historyQueryResult,
            searchCriteria: searchCriteria,
            dataOptions: dataOptions,
            resultsObjectType: commitsSearchResults.resultsObjectType,
            skipResultsForNextFetch: (excludeInitialSourceRename) ? historyResultLength : historyResultLength + ((searchCriteria && searchCriteria.skip) ? searchCriteria.skip : 0),
            appendToExistingResults: appendToExistingResults,
            webClientGraphRows: commitsSearchResults.graphRows,
            isGitGraphFeatureEnabled: commitsSearchResults.isGitGraphFeatureEnabled,
            fetchRenameHistoryCalled: isFetchingRenameHistory,
        };

        this.actionsHub.historyItemsLoaded.invoke(historyItemsLoadedPayload);
    }

    private _removeInitialSourceRenameFromResults(historyEntries: VCLegacyContracts.GitHistoryQueryResults,
        searchCriteria: GitHistorySearchCriteria,
        excludeInitialSourceRename: boolean): void {
        if (historyEntries.results) {
            // checks if the first entry in the result is a source rename and
            // if the flag excludeInitialSourceRename is set to true it removes the first entry from the result array.
            if (excludeInitialSourceRename && historyEntries.results[0] && historyEntries.results[0].itemChangeType &&
                VCOM.ChangeType.isSourceRenameDelete(historyEntries.results[0].itemChangeType)) {

                // Don't include the initial source-rename result. This happens when following renames
                // and we don't want duplicate entries for the rename changeset/commit
                historyEntries.results.splice(0, 1);
                this._scrubResultsForRename(historyEntries, searchCriteria);
            }
        }
    }

    private _scrubResultsForRename(gitHistoryQuery: GitHistoryQueryResults,
        searchCriteria: GitHistorySearchCriteria): void {
        if (gitHistoryQuery.results[0]) {
            // Replacing itemPath and starting commit ID with the 
            // Path and commitID of the original file before rename
            // For the next show more click to work correctly 
            if (gitHistoryQuery.results[0].serverItem) {
                searchCriteria.itemPath = gitHistoryQuery.results[0].serverItem;
            }
            if (gitHistoryQuery.results[0].changeList) {
                const gitCommit = gitHistoryQuery.results[0].changeList as VCLegacyContracts.GitCommit;
                if (gitCommit && gitCommit.commitId) {
                    gitHistoryQuery.startingCommitId = gitCommit.commitId.full;
                }
            }
        }
    }

    private _buildCommitArtifactsMap(commitSearchResultsOnlyArtifacts: GitCommitExtendedContracts.GitCommitSearchResultsExtended):
        GitCommitExtendedContracts.GitCommitArtifactsMap {
        const commitArtifactsMap: GitCommitExtendedContracts.GitCommitArtifactsMap = {};

        if (commitSearchResultsOnlyArtifacts.pullRequests != null) {
            $.each(commitSearchResultsOnlyArtifacts.pullRequests, (key: string, pullRequest: VCContracts.GitPullRequest) => {
                this._getInitializedGitCommitArtifactsEntry(commitArtifactsMap, key);
                commitArtifactsMap[key].pullRequest = {
                    id: pullRequest.pullRequestId.toString(),
                    title: pullRequest.title,
                    url: this.sourcesHub.historyCommitsSource.getPullRequestUrl(pullRequest.pullRequestId),
                };
            });
        }

        if (commitSearchResultsOnlyArtifacts.commits != null) {
            $.each(commitSearchResultsOnlyArtifacts.commits, (key: string, gitRefCommit: VCContracts.GitCommitRef) => {
                this._getInitializedGitCommitArtifactsEntry(commitArtifactsMap, gitRefCommit.commitId);
                commitArtifactsMap[gitRefCommit.commitId].statuses = this.sourcesHub.historyCommitsSource.convertArtifactUriToPublicUrl(gitRefCommit.statuses);
            });
        }

        if (commitSearchResultsOnlyArtifacts.tags != null) {
            $.each(commitSearchResultsOnlyArtifacts.tags, (key: string, gitTags: GitCommitExtendedContracts.GitTag[]) => {
                this._getInitializedGitCommitArtifactsEntry(commitArtifactsMap, key);
                commitArtifactsMap[key].tags = gitTags;
            });
        }

        return commitArtifactsMap;
    }

    private _getInitializedGitCommitArtifactsEntry(commitArtifactsMap: GitCommitExtendedContracts.GitCommitArtifactsMap, key: string): void {
        if (!commitArtifactsMap.hasOwnProperty(key)) {
            commitArtifactsMap[key] = {} as GitCommitExtendedContracts.GitCommitExtended;
        }
    }

    private _truncateToFirstRenameCommit(
        commitSearchResults: GitCommitExtendedContracts.GitCommitSearchResultsExtended,
        historyQueryResult: VCLegacyContracts.GitHistoryQueryResults,
        searchCriteria: GitHistorySearchCriteria,
        excludeInitialSourceRename: boolean
    ): void {
        let renameCommitIndex: number = -1;
        this._removeInitialSourceRenameFromResults(historyQueryResult, searchCriteria, excludeInitialSourceRename);

        $.each(historyQueryResult.results, (index: number, historyEntry: HistoryEntry) => {
            const commitExtended = historyEntry.changeList as GitCommitExtendedContracts.GitCommitExtended;

            // Truncate the fetched commits to the first rename commit in the result.
            // This is needed for cyclically renmaed files for which server send older file's commits also.
            if (VCOM.ChangeType.hasChangeFlag(historyEntry.itemChangeType, VCLegacyContracts.VersionControlChangeType.Rename)) {
                renameCommitIndex = index;
                return false;
            }
        });

        if (renameCommitIndex > -1) {
            historyQueryResult.results = historyQueryResult.results.splice(0, renameCommitIndex + 1);
        }
    }

    private _getQueryCriteria(searchCriteria: GitHistorySearchCriteria): VCContracts.GitQueryCommitsCriteria {
        let querySearchCriteria = $.extend({}, searchCriteria);
        querySearchCriteria.user = SearchCriteriaUtil.getAuthorfromTFSIdentity({
            alias: searchCriteria.alias,
            displayName: searchCriteria.user,
        });
        const queryCriteria: VCContracts.GitQueryCommitsCriteria = this.sourcesHub.historyCommitsSource.getQueryCriteria(querySearchCriteria);
        this._changeCommitertoAuthor(queryCriteria);
        return queryCriteria;
    }

    // Making it public for UTs
    public _getDataProviderArguments(
        searchCriteria: GitHistorySearchCriteria,
        dataOptions: GitHistoryDataOptions,
        isFetchingRenameHistory?: boolean
    ): GitHistoryDataProviderArguments {
        if (searchCriteria && dataOptions) {
            const queryCriteria: VCContracts.GitQueryCommitsCriteria = this._getQueryCriteria(searchCriteria);
            let gitHistoryMode = GitLogHistoryMode.simplified;
            if (searchCriteria && searchCriteria.gitLogHistoryMode && GitLogHistoryMode[searchCriteria.gitLogHistoryMode]) {
                gitHistoryMode = GitLogHistoryMode[searchCriteria.gitLogHistoryMode];
            }

            const includeCommitArgs: boolean = !!queryCriteria.fromCommitId || !!queryCriteria.toCommitId;
            let includeHistoryArgs: boolean = true;
            if (includeCommitArgs) {
                // HistoryQuery Arguments not required, when commit lookup arguments are present
                // OR, when fetching artifacts only for given commit Ids
                includeHistoryArgs = false;
            }

            const gitDataProviderArguments: GitHistoryDataProviderArguments = {
                gitCommitLookupArguments: (includeCommitArgs) ? this._getGitCommitsLookupArguments(queryCriteria) : null,
                gitHistoryQueryArguments: (includeHistoryArgs) ? this._getGitHistoryQueryArguments(queryCriteria, gitHistoryMode) : null,
                gitArtifactsQueryArguments: null,
                gitGraphQueryArguments: this._getGitGraphQueryArguments(queryCriteria, dataOptions, isFetchingRenameHistory)
            }
            return gitDataProviderArguments;
        }
        return null;
    }

    // Making it public for UTs
    public _getDataProviderArgumentsForArtifacts(searchCriteria: GitHistorySearchCriteria,
        dataOptions: GitHistoryDataOptions,
        commitsToFetchArtifactsFor: string[] = []
    ): GitHistoryDataProviderArguments {
        if (searchCriteria && dataOptions) {
            const queryCriteria: VCContracts.GitQueryCommitsCriteria = this._getQueryCriteria(searchCriteria);

            const gitDataProviderArguments: GitHistoryDataProviderArguments = {
                gitCommitLookupArguments: null,
                gitHistoryQueryArguments: null,
                gitArtifactsQueryArguments: this._getGitArtifactsQueryArguments(queryCriteria, dataOptions, commitsToFetchArtifactsFor),
                gitGraphQueryArguments: null
            }
            return gitDataProviderArguments;
        }
        return null;
    }

    public _getGitGraphQueryArguments(queryCriteria: VCContracts.GitQueryCommitsCriteria, dataOptions: GitHistoryDataOptions, isFetchingRenameHistory?: boolean): GitGraphQueryArguments {
        const skip = queryCriteria.$skip || 0;
        const fetchGraphDataOption = dataOptions && dataOptions.fetchGraph;

        if (isFetchingRenameHistory === undefined) {
            isFetchingRenameHistory = this._getAggregatedState().historyListState.fetchRenameHistoryCalled;
        }

        return {
            fetchGraph: skip < GraphSettingsConstants.GraphRowLimit && fetchGraphDataOption && !isFetchingRenameHistory,
            emptyLineLengthLimit: GraphSettingsConstants.EmptyLineLengthLimit,
            emptyLineLengthMultiplier: false,
            order: fetchGraphDataOption ? CommitOrder.topoOrder : CommitOrder.dateOrder,
        };
    }

    private initializeFilterPanelVisibility(): void {
        let localFilterPanelVisibility: string;

        try {
            localFilterPanelVisibility = localStorage.getItem(VCResources.GitHistoryTab_Ls_Key_isFilterPanelVisible);
        } catch (error) {
            localFilterPanelVisibility = "true";
        } finally {
            let filterPanelVisibilityStatus: boolean;
            filterPanelVisibilityStatus = localFilterPanelVisibility ? (localFilterPanelVisibility === "true") : true;
            if (filterPanelVisibilityStatus) {
                this.actionsHub.toggleFilterPanelVisibility.invoke(null);
            }
        }
    }

    public toggleFilterPanelVisibility(): void {
        this.actionsHub.toggleFilterPanelVisibility.invoke(null);
    }

    private _getGitCommitsLookupArguments(queryCriteria: VCContracts.GitQueryCommitsCriteria): GitCommitLookupArguments {
        const commitLookUpArgs: GitCommitLookupArguments = {
            fromCommitId: queryCriteria.fromCommitId,
            toCommitId: queryCriteria.toCommitId,
            skip: queryCriteria.$skip,
            maxResultCount: queryCriteria.$top,
        }
        return commitLookUpArgs;
    }

    private _getGitArtifactsQueryArguments(queryCriteria: VCContracts.GitQueryCommitsCriteria, dataOptions: GitHistoryDataOptions, commitsToFetchArtifactsFor: string[]): GitArtifactsQueryArguments {
        const gitArtifactsArgs: GitArtifactsQueryArguments = {
            fetchBuildStatuses: dataOptions.fetchBuildStatuses,
            fetchPullRequests: dataOptions.fetchPullRequests,
            fetchTags: dataOptions.fetchTags,
            startFromVersion: queryCriteria.itemVersion,
            commitIds: commitsToFetchArtifactsFor,
        }
        return gitArtifactsArgs;
    }

    private _getGitHistoryQueryArguments(queryCriteria: VCContracts.GitQueryCommitsCriteria, historyMode: GitLogHistoryMode = GitLogHistoryMode.simplified): GitHistoryQueryArguments {
        const gitHistoryArgs: GitHistoryQueryArguments = {
            startFromVersion: queryCriteria.itemVersion,
            notInVersion: queryCriteria.compareVersion,
            order: CommitOrder.dateOrder,
            path: queryCriteria.itemPath,
            historyMode: historyMode,
            stopAtAdds: false,
            fromDate: queryCriteria.fromDate,
            toDate: queryCriteria.toDate,
            author: queryCriteria.author,
            committer: queryCriteria.user,
            skip: queryCriteria.$skip,
            maxResultCount: queryCriteria.$top,
        }
        return gitHistoryArgs;
    }

    private _changeCommitertoAuthor(searchCriteria: VCContracts.GitQueryCommitsCriteria): void {
        if (!searchCriteria.author) {
            searchCriteria.author = searchCriteria.user;
            searchCriteria.user = null;
        }
    }

    private _shouldFetchArtifacts(dataOptions: GitHistoryDataOptions): boolean {
        return dataOptions
            && (!!dataOptions.fetchBuildStatuses
                || !!dataOptions.fetchPullRequests
                || !!dataOptions.fetchTags);
    }
}
