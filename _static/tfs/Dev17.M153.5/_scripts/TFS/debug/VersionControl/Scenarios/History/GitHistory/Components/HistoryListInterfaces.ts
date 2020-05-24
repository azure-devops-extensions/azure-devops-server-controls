import * as React from "react";
import { IColumn } from "OfficeFabric/DetailsList";
import { TelemetryEventData } from "VSS/Telemetry/Services";

import { GitHistoryDataOptions, IMessage, HistoryPermissionSet } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";
import { IHistoryGraph } from "VersionControl/Scenarios/History/GitHistory/GitGraph/HistoryGraphContracts";

import { HistoryEntry, GitObjectType, GitHistoryQueryResults } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export type HistoryListColumnMapper = ((props: HistoryListProps) => IColumn);

export interface HistoryListProps {
    repositoryContext: RepositoryContext;
    historyResults: GitHistoryQueryResults;
    resultsObjectType: GitObjectType;
    lastDisplayedCommit: string;
    headerVisible?: boolean;
    columns?: HistoryListColumnMapper[];
    shouldDisplayError?: boolean;
    error?: Error;
    telemetryEventData?: TelemetryEventData;
    currentBranchFullname?: string;
    isLoading?: boolean;
    infiniteScroll?: boolean;
    className?: string;
    shouldFetchRenameHistory?: boolean;
    isArtifactsLoading?: boolean;
    gitGraph?: IHistoryGraph;
    gitGraphMessage?: IMessage;
    isGitGraphFeatureEnabled?: boolean;
    dataOptions?: GitHistoryDataOptions;
    permissionSet?: HistoryPermissionSet;
    fetchRenameHistory(historyEntry: HistoryEntry): void;
    fetchMoreItems(): void;
    onScenarioComplete?(splitTimingName: string): void;
    onSelectionChanged(selection: HistoryListItem[]): void;
    onGraphRowSelected(selectedCommitId: string): void;
    onGraphRowUnSelected(): void;
    updateLastDisplayedCommitId(commitId: string): void;
    onItemSelected?(event: React.MouseEvent<HTMLAnchorElement>, telemetryEventData: TelemetryEventData): void;
    clearSelection?: boolean;
}

export interface HistoryListItem {
    item: HistoryEntry;
    renameRow?: RenameRow;
    isShowMoreLinkItem?: boolean;
    isSpinnerItem?: boolean;
}

export interface RenameRow {
    isHideRename: boolean;
    oldFileName: string;
}
