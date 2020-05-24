import * as React from "react";
import * as ReactDOM from "react-dom";
import { TelemetryEventData } from "VSS/Telemetry/Services";

import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { HistoryList } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryList";
import { HistoryListColumns, DefaultColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { HistoryListProps, HistoryListItem, HistoryListColumnMapper } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListInterfaces";
import { HistoryListPermissionsStore } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryListPermissionsStore";
import { HistoryListStore, HistoryListState } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryListStore";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { HistoryEntry, GitObjectType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as Telemetry from "VSS/Telemetry/Services";

export function renderInto(container: HTMLElement, props: HistoryListContainerProps): void {
    ReactDOM.render(
        <HistoryListContainer {...props} />,
        container);
}

/**
 * History List Properties
 * @param actionCreator Action Creator for the HistoryList Component
 * @param repositoryContext Repository Context
 * @param onScenarioComplete a callback after the scenario is completed
 * @param store store for the HistoryList Component
 * @param permissionStore store for the getting permissions for HistoryList
 * @param headerVisible Flag to decide whether the headers for the columns should be visible. True by default.
 * @param columns List of columns to be shown in History List.Only basic columns(DefaultColumns.BasicColumns) will be displayed by default
 */
export interface HistoryListContainerProps {
    actionCreator: HistoryTabActionCreator;
    repositoryContext: RepositoryContext;
    onScenarioComplete?(splitTimingName: string): void;
    historyListStore: HistoryListStore;
    permissionStore?: HistoryListPermissionsStore;
    headerVisible?: boolean;
    columns?: HistoryListColumnMapper[];
    shouldDisplayError?: boolean;
    onSelectionChanged?(selection: HistoryListItem[]): void;
    telemetryEventData?: TelemetryEventData;
    currentBranchFullname?: string;
    className?: string;
    infiniteScroll?: boolean;
}

export class HistoryListContainer extends React.Component<HistoryListContainerProps, HistoryListState> {
    private static MAX_ITEMS_TO_FETCH: number = 150;

    constructor(props: HistoryListContainerProps, context?: any) {
        super(props, context);

        this.state = this.props.historyListStore.state;
    }

    public componentDidMount(): void {
        this.props.historyListStore.addChangedListener(this._onStoreChanged);
        if (this.props.permissionStore) {
            this.props.permissionStore.addChangedListener(this._onStoreChanged);
        }
    }

    public componentWillUnmount(): void {
        this.props.historyListStore.removeChangedListener(this._onStoreChanged);
        if (this.props.permissionStore) {
            this.props.permissionStore.removeChangedListener(this._onStoreChanged);
        }
    }

    public render(): JSX.Element {
        return <HistoryList {...this._getHistoryListProps() } />
    }

    private _fetchRenameHistory(historyItem: HistoryEntry): void {
        const newState = $.extend(this.state, { isLoading: true }) as HistoryListState;
        this.setState(newState);

        this.props.actionCreator.fetchRenameHistory(historyItem, this.state.searchCriteria, this.state.dataOptions, true, true);
    }

    private _fetchMoreItems(): void {
        const startingCommitId = this.state.historyResults.startingCommitId;
        const newState = $.extend(this.state, { isLoading: true }) as HistoryListState;

        this.setState(newState);

        this.props.actionCreator.fetchMoreItems(
            this.state.historyResults.unpopulatedCount,
            this.state.historyResults.unprocessedCount,
            this.state.searchCriteria,
            this.state.dataOptions,
            HistoryListContainer.MAX_ITEMS_TO_FETCH,
            this.state.skipResultsForShowMore,
            startingCommitId
        );

        const telemetryProps = {
            "currentResultsLength": this.state.historyResults.results.length.toString()
        };

        // In case of commitsearch page, we wont have starting commitId. So we will log searched string 
        const searchFromVersion = (this.state.searchCriteria) ? this.state.searchCriteria.fromVersion : null;
        if (startingCommitId) {
            $.extend(telemetryProps, { "startingCommitId": startingCommitId.toString() });
        } else if (searchFromVersion) {
            $.extend(telemetryProps, { "searchFromversion": searchFromVersion });
        }

        this._recordTelemetry(CustomerIntelligenceConstants.HISTORYLIST_SHOW_MORE_HISTORY, telemetryProps);
    }

    private _onStoreChanged = (): void => {
        this.setState(this.props.historyListStore.state);
    }

    private _getHistoryListProps(): HistoryListProps {
        return {
            historyResults: this.state.historyResults,
            lastDisplayedCommit: this.state.lastDisplayedCommit,
            repositoryContext: this.props.repositoryContext,
            resultsObjectType: this.state.resultsObjectType,
            headerVisible: this.props.headerVisible,
            columns: this._getSanitizedColumns(),
            shouldDisplayError: this.props.shouldDisplayError,
            error: this.state.error,
            telemetryEventData: this.props.telemetryEventData,
            currentBranchFullname: this.props.currentBranchFullname,
            isLoading: this.state.isLoading,
            shouldFetchRenameHistory: this.state.shouldFetchRenameHistory,
            isArtifactsLoading: this.state.isArtifactsLoading,
            gitGraph: this.state.gitGraph,
            gitGraphMessage: this.state.gitGraphMessage,
            isGitGraphFeatureEnabled: this.state.isGitGraphFeatureEnabled,
            dataOptions: this.state.dataOptions,
            permissionSet: this.props.permissionStore ? this.props.permissionStore.getPermissions(): null,
            fetchRenameHistory: (historyItem: HistoryEntry) => { this._fetchRenameHistory(historyItem); },
            fetchMoreItems: () => { this._fetchMoreItems(); },
            onScenarioComplete: this.props.onScenarioComplete,
            onSelectionChanged: this.props.onSelectionChanged,
            onGraphRowSelected: (selectedCommitId: string) => { this.props.actionCreator.graphRowSelected(this.state.gitGraph, selectedCommitId); },
            onGraphRowUnSelected: () => { this.props.actionCreator.graphRowUnSelected(this.state.gitGraph); },
            updateLastDisplayedCommitId: (commitId: string) => { this._updateLastDisplayedCommitId(commitId); },
            onItemSelected: this.props.actionCreator.onHistoryItemclick,
            infiniteScroll: this.props.infiniteScroll,
            className: this.props.className,
            clearSelection: this.state.clearSelection,
        }
    }

    private _getSanitizedColumns(): HistoryListColumnMapper[] {
        const columns: HistoryListColumnMapper[] = this.props.columns || DefaultColumns.AllColumns;

        // Sanitizing for graph column based upon the passed data options
        if (!this._showGraphColumn()) {
            this._removeColumn(HistoryListColumns.GraphColumn, columns);
        }
        // Sanitizing for change type column based on result objects type
        if (this.state.resultsObjectType !== GitObjectType.Blob) {
            this._removeColumn(HistoryListColumns.ChangeTypeColumn, columns);
        }
        if (this.state.dataOptions) {
            // Sanitizing for pull request column base on dataOptions
            if (!this.state.dataOptions.fetchPullRequests) {
                this._removeColumn(HistoryListColumns.PullRequestColumn, columns);
            }
            // Sanitizing for build column base on dataOptions
            if (!this.state.dataOptions.fetchBuildStatuses) {
                this._removeColumn(HistoryListColumns.BuildStatusColumn, columns);
            }
        }
        return columns;
    }

    private _removeColumn(columnToRemove: HistoryListColumnMapper, columnList: HistoryListColumnMapper[]): void {
        const index = columnList.indexOf(columnToRemove);
        if (index >= 0) {
            columnList.splice(index, 1);
        }
    }

    private _showGraphColumn(): boolean {
        return this.state.dataOptions && this.state.dataOptions.fetchGraph && this.state.isGitGraphFeatureEnabled;
    }

    private _updateLastDisplayedCommitId(commitId: string): void {
        // Restoring it to default vlaue true for next fetch
        this.setState({ shouldFetchRenameHistory: true, lastDisplayedCommit: commitId });
    }

    private _recordTelemetry(featureName: string, properties: { [x: string]: string }): void {
        const ciData = new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            featureName,
            properties);

        if (this.props.telemetryEventData) {
            ciData.area = this.props.telemetryEventData.area ? this.props.telemetryEventData.area : ciData.area;
            ciData.properties = $.extend({}, properties, this.props.telemetryEventData.properties);
        }

        Telemetry.publishEvent(ciData);
    }
}
