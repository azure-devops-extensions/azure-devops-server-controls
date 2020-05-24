import { HistoryEntry, HistoryQueryResults, VersionControlChangeType } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { TfvcHistoryActionCreator } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcHistoryActionCreator";
import { TfvcChangeSetsStoresHub } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStoresHub";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface TfvcChangeListItems {
    tfvcHistoryItems: HistoryEntry[];
    hasMoreUpdates: boolean;
}

export interface TfvcHistoryListPayload {
    historyList: HistoryQueryResults,
    changesetId?: number,
    isLoadMore?: boolean,
}

export interface TfvcHistoryLoadStartPayload {
    changesetId?: number,
    isLoadMore?: boolean,
}

export interface ChangesHistoryListContainerProps {
    actionCreator: TfvcHistoryActionCreator;
    storesHub: TfvcChangeSetsStoresHub;
    repositoryContext: RepositoryContext;
    onScenarioComplete?(splitTimingName: string): void;
}

export interface CriteriaChangedPayload {
    itemPath: string;
    userName: string;
    userId: string;
    fromDate: string;
    toDate: string;
    fromVersion: string;
    toVersion: string;
}

export interface ChangeLinkRow {
    changeType: VersionControlChangeType,
    isExpanded: boolean,
    oldFileName?: string,
    isExpandedHistoryEmpty?: boolean;
    isLoadingHistory?: boolean;
}

export interface ChangeSetsListItem {
    item: HistoryEntry;
    itemDepth: number;
    changeLinkRow?: ChangeLinkRow;
    isSpinnerItem?: boolean;
    isShowMoreLinkItem?: boolean;
}

export interface ErrorPayload {
    error: Error;
    changesetId?: number;
}