import {
    HistoryViewActionsHub,
    IGroupedHistoryItem,
    IGroupedHistoryItemWithIndexAndNewResults,
} from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/HistoryViewActionsHub";
import { HistoryViewSource } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Sources/HistoryViewSource";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import Diag = require("VSS/Diag");
import * as Utils_Date from "VSS/Utils/Date";

export class HistoryViewActionsCreator {
    constructor(private _actionsHub: HistoryViewActionsHub, private _source: HistoryViewSource) {
    }

    public fetchHistoryForBuildOrRelease(viewContext: Common.IViewContextData, testCaseResult: TCMContracts.TestCaseResult, continuationToken?: string): void {
        let groupBy: TCMContracts.TestResultGroupBy;
        if (viewContext.viewContext === CommonBase.ViewContext.Build) {
            groupBy = TCMContracts.TestResultGroupBy.Branch;
        } else if (viewContext.viewContext === CommonBase.ViewContext.Release) {
            groupBy = TCMContracts.TestResultGroupBy.Environment;
        }
        let filter = {
            automatedTestName: testCaseResult.automatedTestName,
            buildDefinitionId: (viewContext.viewContext === CommonBase.ViewContext.Build) ? viewContext.data.mainData.definition.id : null,
            releaseEnvDefinitionId: (viewContext.viewContext === CommonBase.ViewContext.Release) ? viewContext.data.subData.environment.definitionEnvironmentId : null,
            groupBy: groupBy,
            continuationToken: continuationToken
        } as TCMContracts.TestHistoryQuery;

        this._source.getTestRunById(parseInt(testCaseResult.testRun.id)).then((testRun: TCMContracts.TestRun) => {
            filter.maxCompleteDate = testRun.completedDate;
            this._source.getTestHistory(filter).then((testHistory) => {
                this._actionsHub.currentBuildOrReleaseHistoryLoaded.invoke(testHistory);
                if (testHistory.continuationToken && testHistory.continuationToken !== "") {
                    this.fetchHistoryForBuildOrRelease(viewContext, testCaseResult, testHistory.continuationToken);
                }
            });
        });
    }

    public fetchHistoryForGroup(viewContext: Common.IViewContextData, testCaseResult: TCMContracts.TestCaseResult, branch?: string, continuationToken?: string): void {
        this._actionsHub.clearBranchFilter.invoke(null);
        if (branch != null && continuationToken == null) {
            this._actionsHub.branchSelected.invoke(branch);
        }
        let groupBy: TCMContracts.TestResultGroupBy;
        if (viewContext.viewContext === CommonBase.ViewContext.Build) {
            groupBy = TCMContracts.TestResultGroupBy.Branch;
        } else if (viewContext.viewContext === CommonBase.ViewContext.Release) {
            groupBy = TCMContracts.TestResultGroupBy.Environment;
        }

        let filter = {
            automatedTestName: testCaseResult.automatedTestName,
            groupBy: groupBy,
            branch: (branch != null) ? branch : null,
            continuationToken: continuationToken
        } as TCMContracts.TestHistoryQuery;

        this._source.getTestRunById(parseInt(testCaseResult.testRun.id)).then((testRun: TCMContracts.TestRun) => {
            filter.maxCompleteDate = testRun.completedDate;
            this._source.getTestHistory(filter).then((testHistory) => {
                for (let i = 0; i < testHistory.resultsForGroup.length; ++i) {
                    if (viewContext.viewContext === CommonBase.ViewContext.Release && testHistory.resultsForGroup[i].groupByValue === viewContext.data.subData.environment.definitionEnvironmentId.toString()) {
                        testHistory.resultsForGroup.splice(i, 1);
                        break;
                    }
                }

                this._actionsHub.historyLoaded.invoke(testHistory);
                if (testHistory.continuationToken && testHistory.continuationToken !== "") {
                    this.fetchHistoryForGroup(viewContext, testCaseResult, branch, testHistory.continuationToken);
                }
            });
        });
    }

    public getNextOrPreviousResults(viewContext: Common.IViewContextData, testCaseResult: TCMContracts.TestCaseResult, item: IGroupedHistoryItem,
        leftClicked: boolean, fetchMoreResults: boolean, branch?: string, index?: number): void {
        this._actionsHub.disableNextAndPrevButtons.invoke({ groupedHistoryItem: item, index: index });
        let groupedHistoryItemWithIndex: IGroupedHistoryItemWithIndexAndNewResults;
        if (!fetchMoreResults) {
            groupedHistoryItemWithIndex = {
                groupedHistoryItem: item,
                index: index
            };
            if (leftClicked) {
                this._actionsHub.previousButtonClicked.invoke(groupedHistoryItemWithIndex);
            } else {
                this._actionsHub.nextButtonClicked.invoke(groupedHistoryItemWithIndex);
            }
        } else {
            let groupBy: TCMContracts.TestResultGroupBy;
            if (viewContext.viewContext === CommonBase.ViewContext.Build) {
                groupBy = TCMContracts.TestResultGroupBy.Branch;
            } else if (viewContext.viewContext === CommonBase.ViewContext.Release) {
                groupBy = TCMContracts.TestResultGroupBy.Environment;
            }

            let filter: TCMContracts.TestHistoryQuery;
            // index null means request is for any particular branch or releaseEnvDefId
            if (index != null) {
                filter = {
                    automatedTestName: testCaseResult.automatedTestName,
                    groupBy: groupBy,
                    branch: (viewContext.viewContext === CommonBase.ViewContext.Build) ? item.historyForGroup.groupByValue : branch,
                    releaseEnvDefinitionId: (viewContext.viewContext === CommonBase.ViewContext.Release) ? parseInt(item.historyForGroup.groupByValue) : null
                } as TCMContracts.TestHistoryQuery;
            } else {
                filter = {
                    automatedTestName: testCaseResult.automatedTestName,
                    buildDefinitionId: (viewContext.viewContext === CommonBase.ViewContext.Build) ? parseInt(item.historyForGroup.groupByValue) : branch,
                    releaseEnvDefinitionId: (viewContext.viewContext === CommonBase.ViewContext.Release) ? parseInt(item.historyForGroup.groupByValue) : null,
                    groupBy: groupBy
                } as TCMContracts.TestHistoryQuery;
            }

            if (leftClicked) {
                filter.maxCompleteDate = Utils_Date.addDays(item.minDateWithData, -7);
            } else {
                filter.maxCompleteDate = Utils_Date.addDays(item.maxDateWithData, 7);
            }

            this._source.getTestHistory(filter).then((testHistory) => {
                groupedHistoryItemWithIndex = {
                    groupedHistoryItem: item,
                    index: index,
                    newResults: testHistory
                };
                if (leftClicked) {
                    this._actionsHub.previousButtonClicked.invoke(groupedHistoryItemWithIndex);
                } else {
                    this._actionsHub.nextButtonClicked.invoke(groupedHistoryItemWithIndex);
                }
            });
        }
    }

    public getBranches(testCaseResult: TCMContracts.TestCaseResult): void {
        let branchList: string[] = [];
        this._source.getBranchList(testCaseResult).then((branches) => {
            for (let i = 0; i < branches.length; ++i) {
                branchList.push(branches[i].name);
            }
            this._actionsHub.branchesLoaded.invoke(branchList);
        }, (error) => {
            Diag.logWarning(error);
            this._actionsHub.branchesLoaded.invoke([])
        });
    }

    public setMaxHistoryItemsToShow(setMaxHistoryItemsToShow: number): void {
        this._actionsHub.setMaxHistoryItemsToShow.invoke(setMaxHistoryItemsToShow);
    }

    public closeErrorMessage(): void {
        this._actionsHub.closeErrorMessage.invoke(null);
    }
}