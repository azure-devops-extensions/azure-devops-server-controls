import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Action } from "VSS/Flux/Action";

export interface IGroupedHistoryItem {
    key: string;
    historyForGroup: TCMContracts.TestResultHistoryForGroup;
    leftIndex: number;
    rightIndex: number;
    maxDateWithData: Date;
    minDateWithData: Date;
    nextButtonDisabled: boolean;
    prevButtonDisabled: boolean;
}

export interface IGroupedHistoryItemWithIndexAndNewResults {
    groupedHistoryItem: IGroupedHistoryItem;
    index?: number;
    newResults?: TCMContracts.TestHistoryQuery;
}

export class HistoryViewActionsHub {
    static readonly CHILD_SCOPE = "CHILD_SCOPE";

    public setMaxHistoryItemsToShow = new Action<number>(HistoryViewActionsHub.CHILD_SCOPE);
    public historyLoaded = new Action<TCMContracts.TestHistoryQuery>(HistoryViewActionsHub.CHILD_SCOPE);
    public currentBuildOrReleaseHistoryLoaded = new Action<TCMContracts.TestHistoryQuery>(HistoryViewActionsHub.CHILD_SCOPE);
    public branchesLoaded = new Action<string[]>(HistoryViewActionsHub.CHILD_SCOPE);
    public previousButtonClicked = new Action<IGroupedHistoryItemWithIndexAndNewResults>(HistoryViewActionsHub.CHILD_SCOPE);
    public nextButtonClicked = new Action<IGroupedHistoryItemWithIndexAndNewResults>(HistoryViewActionsHub.CHILD_SCOPE);
    public disableNextAndPrevButtons = new Action<IGroupedHistoryItemWithIndexAndNewResults>(HistoryViewActionsHub.CHILD_SCOPE);
    public branchSelected = new Action<string>(HistoryViewActionsHub.CHILD_SCOPE);
    public clearBranchFilter = new Action<void>(HistoryViewActionsHub.CHILD_SCOPE);
    public onError = new Action<string>(HistoryViewActionsHub.CHILD_SCOPE);
    public closeErrorMessage = new Action<void>(HistoryViewActionsHub.CHILD_SCOPE);
}
