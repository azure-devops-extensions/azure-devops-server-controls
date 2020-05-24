import * as Utils_String from "VSS/Utils/String";
import * as VSSStore from "VSS/Flux/Store";
import { GitHistoryQueryResults } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitPullRequest } from "TFS/VersionControl/Contracts";
import { GitCommitExtended, GitCommitArtifactsMap } from "VersionControl/Scenarios/History/GitHistory/GitCommitExtendedContracts";
import { GraphSettingsConstants, GraphMessageType, GraphMessageDismissedKeys } from "VersionControl/Scenarios/History/GitHistory/GitGraph/GraphConstants";
import { HistoryItemsLoadedPayload, GitHistorySearchCriteria, GitHistoryDataOptions, IMessage } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { ChangeList, GitCommit, HistoryEntry, VersionControlChangeType, GitObjectType} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { IHistoryGraph } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";
import { HistoryGraphHelper } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphHelper";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface HistoryListState {
    searchCriteria: GitHistorySearchCriteria;
    dataOptions: GitHistoryDataOptions;
    historyResults: GitHistoryQueryResults;
    skipResultsForShowMore: number;
    isLoading: boolean;
    shouldFetchRenameHistory: boolean;
    resultsObjectType: GitObjectType;
    lastDisplayedCommit: string;
    error: Error;
    isArtifactsLoading: boolean;
    isGitGraphFeatureEnabled: boolean;
    gitGraph?: IHistoryGraph;
    gitGraphMessage?: IMessage;
    fetchRenameHistoryCalled: boolean;
    fetchRenameHistoryCalloutDismissed: boolean;
    isFilterPanelVisible: boolean;
    clearSelection: boolean;
}

export class HistoryListStore extends VSSStore.Store {
    public state = {} as HistoryListState;

    public populateHistoryList = (payload: HistoryItemsLoadedPayload): void => {
        const artifactsLoading: boolean = this.state.isArtifactsLoading;
        const gitHistoryQueryResult: GitHistoryQueryResults = $.extend(true, {}, payload.gitHistoryQueryResult);
        const fetchedItems: HistoryEntry[] = gitHistoryQueryResult.results;
        const currentHistoryResults = this.state.historyResults;
        const wasGitGraphEnabled = this.state.isGitGraphFeatureEnabled;
        gitHistoryQueryResult.results = [];

        // If appendToExistingResults is set to true the current state results should be included
        if (currentHistoryResults && payload.appendToExistingResults) {
            gitHistoryQueryResult.results = currentHistoryResults.results;
        }

        // If there are new items fetched then concat it to existing results
        if (fetchedItems.length > 0) {
            gitHistoryQueryResult.results = gitHistoryQueryResult.results.concat(fetchedItems);
        }

        // Truncate graph rows, if the number of graph rows is more than the total number of commits.
        if (payload.webClientGraphRows && payload.webClientGraphRows.length > gitHistoryQueryResult.results.length) {
            payload.webClientGraphRows = payload.webClientGraphRows.splice(0, gitHistoryQueryResult.results.length)
        }

        let gitHistoryGraph: IHistoryGraph;
        // Don't create graph if author filter is present.
        if (!payload.searchCriteria.user) {
            gitHistoryGraph = HistoryGraphHelper.getHistoryGraph(payload.webClientGraphRows);

            if (payload.isGitGraphFeatureEnabled) {
                // If helper returns an undefined or null graph object, we will retain the old graph.
                // This is predominently for showing graph data for existing rows beyond GraphRowLimit
                gitHistoryGraph = gitHistoryGraph || this.state.gitGraph;
            }

            // To retain the earlier selection of graph row
            if (this.state.gitGraph && this.state.gitGraph.selectedCommitId && gitHistoryGraph) {
                gitHistoryGraph.select(this.state.gitGraph.selectedCommitId);
            }
        }

        // Calculate the last displayed commit id
        const lastDisplayedCommit = this._getLastDisplayedCommitId(gitHistoryQueryResult.results);
        const hasResults = gitHistoryQueryResult.results && gitHistoryQueryResult.results.length > 0;
        this.state = {
            historyResults: gitHistoryQueryResult,
            searchCriteria: payload.searchCriteria,
            dataOptions: payload.dataOptions,
            skipResultsForShowMore : payload.skipResultsForNextFetch,
            isLoading: false,
            isArtifactsLoading: artifactsLoading,
            shouldFetchRenameHistory: (fetchedItems.length > 0),
            resultsObjectType: payload.resultsObjectType,
            lastDisplayedCommit,
            gitGraph: gitHistoryGraph,
            isGitGraphFeatureEnabled: payload.isGitGraphFeatureEnabled,
            gitGraphMessage: this._getGraphMessage(wasGitGraphEnabled, hasResults, payload),
            fetchRenameHistoryCalled: this.state.fetchRenameHistoryCalled || payload.fetchRenameHistoryCalled,
            fetchRenameHistoryCalloutDismissed: this.state.fetchRenameHistoryCalloutDismissed,
            isFilterPanelVisible: this.state.isFilterPanelVisible,
            clearSelection: false,
        } as HistoryListState;

        this.emitChanged();
    }

    public mergeArtifactsToHistoryList = (commitArtifactsMap: GitCommitArtifactsMap): void => {
        const currentHistoryResults = this.state.historyResults;
        if (currentHistoryResults != null
            && currentHistoryResults.results != null
            && currentHistoryResults.results.length > 0
            && Object.keys(commitArtifactsMap).length > 0) {

            $.each(currentHistoryResults.results, (index: number, historyEntry: HistoryEntry) => {
                const commitExtended = historyEntry.changeList as GitCommitExtended;
                const commitId = commitExtended.commitId.full;
                if (commitArtifactsMap.hasOwnProperty(commitId)) {
                    const commitArtifactsResult = commitArtifactsMap[commitId];
                    commitExtended.statuses = commitArtifactsResult.statuses;
                    commitExtended.pullRequest = commitArtifactsResult.pullRequest;
                    commitExtended.tags = commitArtifactsResult.tags;
                }
            });

            this.state.historyResults = currentHistoryResults;
            this.state.isArtifactsLoading = false;

            this.emitChanged();
        }
    }

    public updateFullComment = (changeList: ChangeList): void => {
        this.state.historyResults.results.forEach((historyEntry: HistoryEntry) => {
            if (historyEntry.changeList.version === changeList.version) {
                historyEntry.changeList.comment = changeList.comment;
                historyEntry.changeList.commentTruncated = false;
            }
        });

        this.emitChanged();
    }

    public clearAndStartLoading = (searchCriteria?: GitHistorySearchCriteria): void => {
        this.state = this._getDefaultState();
        if (searchCriteria) {
            this.state.searchCriteria = searchCriteria;
        }

        this.startLoading();
    }

    public startLoading = (): void => {
        this.state.isLoading = true;
        this.state.historyResults = undefined;
        this.state.dataOptions = undefined;
        this.state.fetchRenameHistoryCalled = undefined;
        this.state.fetchRenameHistoryCalloutDismissed = undefined;

        // When we load history list items, clear selection in the history list
        // History list takes care of selection for "show more" scenario
        this.state.clearSelection = true;

        this.emitChanged();
    }

    public failLoad = (error: Error): void => {
        this.state.error = error;
        this.state.isLoading = false;
        this.emitChanged();
    }

    public startLoadingMore = (): void => {
        this.state.isLoading = false;
        this.emitChanged();
    }

    public startLoadingArtifacts = (): void => {
        this.state.isArtifactsLoading = true;
        this.emitChanged();
    }

    public toggleFilterPanelVisibility = (): void => {
        this.state.isFilterPanelVisible = !this.state.isFilterPanelVisible;

        try {
            // This will also handle the case of localStorage being unavailable
            localStorage.setItem(VCResources.GitHistoryTab_Ls_Key_isFilterPanelVisible, this.state.isFilterPanelVisible ? "true" : "false");
        } catch (error) {
            // no-op
        }
        
        this.emitChanged();
    }
    
    public historyGraphUpdated = (historyGraph: IHistoryGraph): void => {
        this.state.gitGraph = historyGraph;
        this.emitChanged();
    }

    public clear = (): void => {
        this.state = this._getDefaultState();
        this.emitChanged();
    }

    public dispose(): void {
        this.state = null;
    }

    public dismissGraphMessage = (key: string): void => {
        this.state.gitGraphMessage = null;
        this._updateGraphUserMessageDismissed(key);
        this.emitChanged();
    }

    private _getDefaultState = (): HistoryListState => {
        let isGitGraphFeatureEnabled: boolean;
        const isFilterPanelVisible = this.state.isFilterPanelVisible;
        
        if (this.state) {
            // Toggle button is not displayed if isGitGraphFeatureEnabled is undefined
            // So we should assign it the old value in the defaultState as well.
            isGitGraphFeatureEnabled = this.state.isGitGraphFeatureEnabled;
        }

        return {
            historyResults: null,
            searchCriteria: null,
            dataOptions: null,
            isLoading: null,
            error: null,
            isGitGraphFeatureEnabled: isGitGraphFeatureEnabled,
            fetchRenameHistoryCalled: null,
            fetchRenameHistoryCalloutDismissed: undefined,
            isFilterPanelVisible: isFilterPanelVisible,
            clearSelection: false,
        } as HistoryListState;
    }

    private _getLastDisplayedCommitId(historyEntries: HistoryEntry[]): string {
        let lastCommitId: string = "";
        if (historyEntries && historyEntries.length > 0) {
            const item: HistoryEntry = historyEntries[historyEntries.length - 1];

            const gitCommit = item.changeList as GitCommit;

            if (gitCommit && gitCommit.commitId) {
                lastCommitId = gitCommit.commitId.full;
            }
        }
        return lastCommitId;
    }

    private _getGraphMessage(wasGitGraphEnabled: boolean,
        historyHasResults: boolean,
        payload: HistoryItemsLoadedPayload): IMessage {
        if (payload.isGitGraphFeatureEnabled) {
            if (historyHasResults && payload.searchCriteria && payload.searchCriteria.user
                && this._canShowEngagementMessageToUser(GraphMessageDismissedKeys.AuthorFilteredMessageDismissed)) {
                return {
                    key: GraphMessageType.AuthorFiltered,
                    title: VCResources.GitGraphMessage_Title_NoGraph,
                    content: VCResources.GitGraphMessage_Content_AuthorFiltered
                };
            } else if (payload.searchCriteria && payload.searchCriteria.skip > GraphSettingsConstants.GraphRowLimit
                && this._canShowEngagementMessageToUser(GraphMessageDismissedKeys.RowLimitReachedMessageDismissed)) {
                return {
                    key: GraphMessageType.RowLimitReached,
                    title: VCResources.GitGraphMessage_Title_NoGraph,
                    content: Utils_String.format(VCResources.GitGraphMessage_Content_RowLimitReached, GraphSettingsConstants.GraphRowLimit)
                };
            } else if (!wasGitGraphEnabled
                && historyHasResults
                && this._canShowEngagementMessageToUser(GraphMessageDismissedKeys.FeatureEnabledMessageDismissed)) {
                return {
                    key: GraphMessageType.FeatureEnabled,
                    title: VCResources.GitGraphMessage_Title_FeatureEnabled,
                    content: VCResources.GitGraphMessage_Content_FeatureEnabled
                };
            } else if ((payload.fetchRenameHistoryCalled || this.state.fetchRenameHistoryCalled) &&
                !this.state.fetchRenameHistoryCalloutDismissed) {
                return {
                    key: GraphMessageType.RenameHistory,
                    title: VCResources.GitGraphMessage_Title_NoGraph,
                    content: VCResources.GitGraphMessage_Content_RenameHistory
                };
            }
        }

        return this.state.gitGraphMessage;
    }

    private _canShowEngagementMessageToUser(userSettingKey: string): boolean {
        /* If the engagement value is true, it means the user has already seen the engagement message */
        try {
            return localStorage.getItem(userSettingKey) !== "true";
        } catch (e) {
            return false;
        }
    }

    private _updateGraphUserMessageDismissed(messageType: string): void {
        let updateLocalStorageKey: string = null;

        switch (messageType) {
            case GraphMessageType.AuthorFiltered:
                updateLocalStorageKey = GraphMessageDismissedKeys.AuthorFilteredMessageDismissed;
                break;
            case GraphMessageType.FeatureEnabled:
                updateLocalStorageKey = GraphMessageDismissedKeys.FeatureEnabledMessageDismissed;
                break;
            case GraphMessageType.RowLimitReached:
                updateLocalStorageKey = GraphMessageDismissedKeys.RowLimitReachedMessageDismissed;
                break;
            case GraphMessageType.RenameHistory:
                this.state.fetchRenameHistoryCalloutDismissed = true;
                break;
        }

        if (updateLocalStorageKey) {
            try {
                localStorage.setItem(updateLocalStorageKey, "true");
            } catch (error) {
                // no-op
            }
        }
    }
}
