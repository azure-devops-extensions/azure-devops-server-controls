/// <reference types="jquery" />
import {
    HistoryViewActionsHub,
    IGroupedHistoryItem,
    IGroupedHistoryItemWithIndexAndNewResults,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/HistoryViewActionsHub";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Store } from "VSS/Flux/Store";

export interface IHistoryViewState {
    errorMessage: string;
    isHistoryForCurrentBuildOrEnvLoading: boolean;
    isHistoryForGroupsLoading: boolean;
    groupedHistoryItems: IGroupedHistoryItem[];
    branches: string[];
    currentBuildOrEnvHistory: IGroupedHistoryItem[];
    selectedBranch: string;
    maxHistoryItemsToShow: number;
}

export class HistoryViewStore extends Store {

    private _state: IHistoryViewState;

    constructor(private _actionsHub: HistoryViewActionsHub) {
        super();
        this._initialize();
    }

    public getState(): IHistoryViewState {
        return this._state;
    }

    private _initialize(): void {
        this._state = this._getDefaultState();

        this._actionsHub.onError.addListener(this._onErrorListener);
        this._actionsHub.closeErrorMessage.addListener(this._closeErrorMessage);
        this._actionsHub.setMaxHistoryItemsToShow.addListener(this._setMaxHistoryItemsToShowListener);
        this._actionsHub.currentBuildOrReleaseHistoryLoaded.addListener(this._currentBuildOrReleaseHistoryLoadedListener);
        this._actionsHub.historyLoaded.addListener(this._historyLoadedListener);
        this._actionsHub.branchesLoaded.addListener(this._branchesLoadedListener);
        this._actionsHub.previousButtonClicked.addListener(this._previousButtonClickedListener);
        this._actionsHub.nextButtonClicked.addListener(this._nextButtonClickedListener);
        this._actionsHub.branchSelected.addListener(this._branchSelectedListener);
        this._actionsHub.clearBranchFilter.addListener(this._clearBranchFilterListener);
        this._actionsHub.disableNextAndPrevButtons.addListener(this._disableNextAndPrevButtons);
    }

    private _getDefaultState(): IHistoryViewState {
        return {
            errorMessage: null,
            isHistoryForCurrentBuildOrEnvLoading: true,
            isHistoryForGroupsLoading: true,
            currentBuildOrEnvHistory: [],
            groupedHistoryItems: [],
            selectedBranch: null,
            maxHistoryItemsToShow: 50
        } as IHistoryViewState;
    }

    private _setMaxHistoryItemsToShowListener = (maxHistoryItemsToShow: number): void => {
        this._state.maxHistoryItemsToShow = maxHistoryItemsToShow;
        this.emitChanged();
    }

    private _currentBuildOrReleaseHistoryLoadedListener = (history: TCMContracts.TestHistoryQuery): void => {
        // IF there are no results present, then push the new results, ELSE merge the new results with old ones
        if (this._state.currentBuildOrEnvHistory.length === 0) {
            for (let i = 0; i < history.resultsForGroup.length; ++i) {
                this._state.currentBuildOrEnvHistory.push({
                    key: history.resultsForGroup[0].groupByValue,
                    historyForGroup: history.resultsForGroup[0],
                    leftIndex: 0,
                    rightIndex: Math.min(this._state.maxHistoryItemsToShow - 1, history.resultsForGroup[0].results.length - 1),
                    maxDateWithData: history.maxCompleteDate,
                    minDateWithData: history.maxCompleteDate,
                    nextButtonDisabled: false,
                    prevButtonDisabled: false
                });
                this._state.currentBuildOrEnvHistory[i].key = this._state.currentBuildOrEnvHistory[i].leftIndex.toString() + "." + this._state.currentBuildOrEnvHistory[i].rightIndex.toString() + "." + this._state.currentBuildOrEnvHistory[i].historyForGroup.groupByValue;
            }
            this._state.isHistoryForCurrentBuildOrEnvLoading = false;
        } else {
            this._state.currentBuildOrEnvHistory[0].historyForGroup.results = this._state.currentBuildOrEnvHistory[0].historyForGroup.results.concat(history.resultsForGroup[0].results);
            this._state.currentBuildOrEnvHistory[0].rightIndex = Math.min(this._state.currentBuildOrEnvHistory[0].leftIndex + this._state.maxHistoryItemsToShow - 1, this._state.currentBuildOrEnvHistory[0].historyForGroup.results.length - 1);
            this._state.currentBuildOrEnvHistory[0].key = this._state.currentBuildOrEnvHistory[0].leftIndex.toString() + "." + this._state.currentBuildOrEnvHistory[0].rightIndex.toString() + "." + this._state.currentBuildOrEnvHistory[0].historyForGroup.groupByValue;
        }
        // Sort according to completed date
        if (this._state.currentBuildOrEnvHistory.length > 0) {
            this._state.currentBuildOrEnvHistory[0].historyForGroup.results.sort(this._sortByCompletedDate);
        }

        this.emitChanged();
    }

    private _historyLoadedListener = (history: TCMContracts.TestHistoryQuery): void => {
        let index: number;
        for (let i = 0; i < history.resultsForGroup.length; ++i) {

            // Find if the history corresponding to the groupByValue is already in state
            index = this._findIndex(this._state.groupedHistoryItems, history.resultsForGroup[i]);

            // IF there are no results present, then push the new results, ELSE merge the new results with old ones
            if (index !== -1) {
                this._state.groupedHistoryItems[index].historyForGroup.results = this._state.groupedHistoryItems[index].historyForGroup.results.concat(history.resultsForGroup[i].results);
                this._state.groupedHistoryItems[index].rightIndex = Math.min(this._state.groupedHistoryItems[index].leftIndex + this._state.maxHistoryItemsToShow - 1, this._state.groupedHistoryItems[index].historyForGroup.results.length - 1);
                this._state.groupedHistoryItems[index].key = this._state.groupedHistoryItems[index].leftIndex.toString() + "." + this._state.groupedHistoryItems[index].rightIndex.toString() + "." + this._state.groupedHistoryItems[index].historyForGroup.groupByValue;
            } else {
                this._state.groupedHistoryItems.push({
                    key: history.resultsForGroup[i].groupByValue,
                    historyForGroup: history.resultsForGroup[i],
                    leftIndex: 0,
                    rightIndex: Math.min(this._state.maxHistoryItemsToShow - 1, history.resultsForGroup[i].results.length - 1),
                    maxDateWithData: history.maxCompleteDate,
                    minDateWithData: history.maxCompleteDate,
                    nextButtonDisabled: false,
                    prevButtonDisabled: false
                });

                index = this._findIndex(this._state.groupedHistoryItems, history.resultsForGroup[i]);
                this._state.groupedHistoryItems[index].key = this._state.groupedHistoryItems[index].leftIndex.toString() + "." + this._state.groupedHistoryItems[index].rightIndex.toString() + "." + this._state.groupedHistoryItems[index].key;

                // Sort according to completed date
                this._state.groupedHistoryItems[index].historyForGroup.results.sort(this._sortByCompletedDate);
            }
        }
        this._state.isHistoryForGroupsLoading = false;
        this.emitChanged();
    }

    private _findIndex(results: IGroupedHistoryItem[], newResult: TCMContracts.TestResultHistoryForGroup): number {
        for (let i = 0; i < results.length; ++i) {
            if (results[i].historyForGroup.groupByValue === newResult.groupByValue) {
                return i;
            }
        }
        return -1;
    }

    private _branchesLoadedListener = (branches: string[]): void => {
        this._state.branches = branches;
        this.emitChanged();
    }

    private _previousButtonClickedListener = (item: IGroupedHistoryItemWithIndexAndNewResults): void => {
        // Create a new object
        let groupHistoryItemObject: IGroupedHistoryItem = {
            key: item.groupedHistoryItem.key,
            historyForGroup: item.groupedHistoryItem.historyForGroup,
            leftIndex: item.groupedHistoryItem.leftIndex,
            rightIndex: item.groupedHistoryItem.rightIndex,
            maxDateWithData: item.groupedHistoryItem.maxDateWithData,
            minDateWithData: item.groupedHistoryItem.minDateWithData,
            nextButtonDisabled: false,
            prevButtonDisabled: false
        } as IGroupedHistoryItem;

        // If there are new results, we need to add them to the previous results, ELSE we just need to update the indices
        if (item.newResults) {
            groupHistoryItemObject.maxDateWithData = (item.newResults.maxCompleteDate < item.groupedHistoryItem.maxDateWithData) ? item.groupedHistoryItem.maxDateWithData : item.newResults.maxCompleteDate;
            groupHistoryItemObject.minDateWithData = (item.newResults.maxCompleteDate > item.groupedHistoryItem.minDateWithData) ? item.groupedHistoryItem.minDateWithData : item.newResults.maxCompleteDate;

            if (item.newResults.resultsForGroup.length > 0) {
                // If index is null, that means we need to update this._state.currentBuildOrEnvHistory, otherwise we update this._state.groupedHistoryItems[item.index]
                if (item.index != null) {
                    groupHistoryItemObject.historyForGroup.results = this._state.groupedHistoryItems[item.index].historyForGroup.results.concat(item.newResults.resultsForGroup[0].results);
                    groupHistoryItemObject.rightIndex = Math.min(this._state.groupedHistoryItems[item.index].rightIndex + this._state.maxHistoryItemsToShow, groupHistoryItemObject.historyForGroup.results.length - 1);
                    groupHistoryItemObject.leftIndex = Math.max(groupHistoryItemObject.rightIndex - (this._state.maxHistoryItemsToShow - 1), 0);
                } else {
                    groupHistoryItemObject.historyForGroup.results = this._state.currentBuildOrEnvHistory[0].historyForGroup.results.concat(item.newResults.resultsForGroup[0].results);
                    groupHistoryItemObject.rightIndex = Math.min(this._state.currentBuildOrEnvHistory[0].rightIndex + this._state.maxHistoryItemsToShow, groupHistoryItemObject.historyForGroup.results.length - 1);
                    groupHistoryItemObject.leftIndex = Math.max(groupHistoryItemObject.rightIndex - (this._state.maxHistoryItemsToShow - 1), 0);
                }
                groupHistoryItemObject.historyForGroup.results.sort(this._sortByCompletedDate);
            }
        } else {
            if (item.index != null) {
                groupHistoryItemObject.leftIndex = this._state.groupedHistoryItems[item.index].rightIndex + 1;
                groupHistoryItemObject.rightIndex = Math.min(this._state.groupedHistoryItems[item.index].rightIndex + this._state.maxHistoryItemsToShow, item.groupedHistoryItem.historyForGroup.results.length - 1);
            } else {
                groupHistoryItemObject.leftIndex = this._state.currentBuildOrEnvHistory[0].rightIndex + 1;
                groupHistoryItemObject.rightIndex = Math.min(this._state.currentBuildOrEnvHistory[0].rightIndex + this._state.maxHistoryItemsToShow, item.groupedHistoryItem.historyForGroup.results.length - 1);
            }
        }

        // Update key so that react will render it again
        groupHistoryItemObject.key = groupHistoryItemObject.leftIndex.toString() + "." + groupHistoryItemObject.rightIndex.toString() + "." + groupHistoryItemObject.historyForGroup.groupByValue;

        // Update state using spread operator for handling immutability 
        if (item.index != null) {
            this._state.groupedHistoryItems = this._state.groupedHistoryItems.map((it, ind) => {
                if (ind !== item.index) {
                    return it;
                }
                return {
                    ...it,
                    ...groupHistoryItemObject
                };
            });
        } else {
            this._state.currentBuildOrEnvHistory = this._state.currentBuildOrEnvHistory.map((it, ind) => {
                if (ind !== 0) {
                    return it;
                }
                return {
                    ...it,
                    ...groupHistoryItemObject
                };
            });
        }
        this.emitChanged();
    }

    private _nextButtonClickedListener = (item: IGroupedHistoryItemWithIndexAndNewResults): void => {
        // Create a new object
        let groupHistoryItemObject: IGroupedHistoryItem = {
            key: item.groupedHistoryItem.key,
            historyForGroup: item.groupedHistoryItem.historyForGroup,
            leftIndex: item.groupedHistoryItem.leftIndex,
            rightIndex: item.groupedHistoryItem.rightIndex,
            maxDateWithData: item.groupedHistoryItem.maxDateWithData,
            minDateWithData: item.groupedHistoryItem.minDateWithData,
            nextButtonDisabled: item.groupedHistoryItem.nextButtonDisabled,
            prevButtonDisabled: false
        } as IGroupedHistoryItem;

        // If there are new results, we need to add them to the previous results, ELSE we just need to update the indices
        if (item.newResults) {
            groupHistoryItemObject.maxDateWithData = (item.newResults.maxCompleteDate < item.groupedHistoryItem.maxDateWithData) ? item.groupedHistoryItem.maxDateWithData : item.newResults.maxCompleteDate;
            groupHistoryItemObject.minDateWithData = (item.newResults.maxCompleteDate > item.groupedHistoryItem.minDateWithData) ? item.groupedHistoryItem.minDateWithData : item.newResults.maxCompleteDate;
            if (groupHistoryItemObject.maxDateWithData > new Date() && (item.newResults.resultsForGroup.length === 0 || item.newResults.resultsForGroup[0].results.length <= this._state.maxHistoryItemsToShow)) {
                groupHistoryItemObject.nextButtonDisabled = true;
            }
            if (item.newResults.resultsForGroup.length > 0) {
                // If index is null, that means we need to update this._state.currentBuildOrEnvHistory, otherwise we update this._state.groupedHistoryItems[item.index]
                if (item.index != null) {
                    groupHistoryItemObject.historyForGroup.results = item.newResults.resultsForGroup[0].results.concat(this._state.groupedHistoryItems[item.index].historyForGroup.results);
                    groupHistoryItemObject.leftIndex = Math.max(item.newResults.resultsForGroup[0].results.length - this._state.maxHistoryItemsToShow, 0);
                    groupHistoryItemObject.rightIndex = Math.min(groupHistoryItemObject.leftIndex + this._state.maxHistoryItemsToShow - 1, groupHistoryItemObject.historyForGroup.results.length - 1);
                } else {
                    groupHistoryItemObject.historyForGroup.results = item.newResults.resultsForGroup[0].results.concat(this._state.currentBuildOrEnvHistory[0].historyForGroup.results);
                    groupHistoryItemObject.leftIndex = Math.max(item.newResults.resultsForGroup[0].results.length - this._state.maxHistoryItemsToShow, 0);
                    groupHistoryItemObject.rightIndex = Math.min(groupHistoryItemObject.leftIndex + this._state.maxHistoryItemsToShow - 1, groupHistoryItemObject.historyForGroup.results.length - 1);
                }
                groupHistoryItemObject.historyForGroup.results.sort(this._sortByCompletedDate);
            }
        } else {
            if (item.index != null) {
                groupHistoryItemObject.leftIndex = Math.max(this._state.groupedHistoryItems[item.index].leftIndex - this._state.maxHistoryItemsToShow, 0);
                groupHistoryItemObject.rightIndex = Math.min(groupHistoryItemObject.leftIndex + this._state.maxHistoryItemsToShow - 1, groupHistoryItemObject.historyForGroup.results.length - 1);
            } else {
                groupHistoryItemObject.leftIndex = Math.max(this._state.currentBuildOrEnvHistory[0].leftIndex - this._state.maxHistoryItemsToShow, 0);
                groupHistoryItemObject.rightIndex = Math.min(groupHistoryItemObject.leftIndex + this._state.maxHistoryItemsToShow - 1, groupHistoryItemObject.historyForGroup.results.length - 1);
            }
        }

        // Update key so that react will render it again
        groupHistoryItemObject.key = groupHistoryItemObject.leftIndex.toString() + "." + groupHistoryItemObject.rightIndex.toString() + "." + groupHistoryItemObject.historyForGroup.groupByValue;

        // Update state using spread operator for handling immutability 
        if (item.index != null) {
            this._state.groupedHistoryItems = this._state.groupedHistoryItems.map((it, ind) => {
                if (ind !== item.index) {
                    return it;
                }
                return {
                    ...it,
                    ...groupHistoryItemObject
                };
            });
        } else {
            this._state.currentBuildOrEnvHistory = this._state.currentBuildOrEnvHistory.map((it, ind) => {
                if (ind !== 0) {
                    return it;
                }
                return {
                    ...it,
                    ...groupHistoryItemObject
                };
            });
        }
        this.emitChanged();
    }

    private _branchSelectedListener = (branch: string): void => {
        this._state.selectedBranch = branch;
        this._state.groupedHistoryItems = [];
        this._state.isHistoryForGroupsLoading = true;
        this.emitChanged();
    }

    private _clearBranchFilterListener = (): void => {
        this._state.selectedBranch = null;
        this._state.groupedHistoryItems = [];
        this._state.isHistoryForGroupsLoading = true;
        this.emitChanged();
    }

    private _disableNextAndPrevButtons = (item: IGroupedHistoryItemWithIndexAndNewResults): void => {
        let groupHistoryItemObject: IGroupedHistoryItem = {
            key: item.groupedHistoryItem.key,
            historyForGroup: item.groupedHistoryItem.historyForGroup,
            leftIndex: item.groupedHistoryItem.leftIndex,
            rightIndex: item.groupedHistoryItem.rightIndex,
            maxDateWithData: item.groupedHistoryItem.maxDateWithData,
            minDateWithData: item.groupedHistoryItem.minDateWithData,
            nextButtonDisabled: true,
            prevButtonDisabled: true
        } as IGroupedHistoryItem;

        if (item.index != null) {
            this._state.groupedHistoryItems = this._state.groupedHistoryItems.map((it, ind) => {
                if (ind !== item.index) {
                    return it;
                }
                return {
                    ...it,
                    ...groupHistoryItemObject
                };
            });
        } else {
            this._state.currentBuildOrEnvHistory = this._state.currentBuildOrEnvHistory.map((it, ind) => {
                if (ind !== 0) {
                    return it;
                }
                return {
                    ...it,
                    ...groupHistoryItemObject
                };
            });
        }

        this.emitChanged();
    }

    private _sortByCompletedDate(result1: TCMContracts.TestCaseResult, result2: TCMContracts.TestCaseResult) {
        return (result1.completedDate > result2.completedDate) ? -1 : 1;
    }

    private _onErrorListener = (errorMessage: string): void => {
        this._state.errorMessage = errorMessage;
        this.emitChanged();
    }

    private _closeErrorMessage = (): void => {
        this._state.errorMessage = null;
        this.emitChanged();
    }

}