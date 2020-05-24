import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import * as Utils_String from "VSS/Utils/String";

export interface IGroupSummary {
    groupSummaryData: IDictionaryStringTo<TCMContracts.TestResultsDetailsForGroup>;
    summaryLoaded: boolean;
}

export class TestResultsGroupByManager {
    constructor() {
        this.resetCache();
    }

    public resetCache() {
        this._cachedGroupKeyToResultsForGroups = {};
    }

    public populateShallowResult(result: TCMContracts.ShallowTestCaseResult) {
        const testCaseResult: TCMContracts.TestCaseResult = CommonUtils.TCMContractsConverter.convertShallowTestResultToTestCaseResult(result);
        
        this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_Container, result.automatedTestStorage, result, testCaseResult);
        this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_Owner, result.owner, result, testCaseResult);
        if (result.priority != null) {
            this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_Priority, result.priority.toString(), result, testCaseResult);
        }
        if (result.runId != null) {
            this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_Test_Run, result.runId.toString(), result, testCaseResult);
        }
        this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_None, Utils_String.empty, result, testCaseResult);
    }

    public getGroupByResults(groupByField: string): TCMContracts.TestResultsDetails {
        const groupSummaryMap = this._cachedGroupKeyToResultsForGroups[groupByField]
            ? this._cachedGroupKeyToResultsForGroups[groupByField].groupSummaryData
            : null;

        if (groupSummaryMap) {
            return {
                groupByField: groupByField,
                resultsForGroup: Object.keys(groupSummaryMap).map(key => groupSummaryMap[key])
            } as TCMContracts.TestResultsDetails;
        } else {
            return {
                groupByField: groupByField,
                resultsForGroup: []
            } as TCMContracts.TestResultsDetails;
        }
    }

    public isGroupBySummaryLoaded(groupByField: string) {
        return this._cachedGroupKeyToResultsForGroups[groupByField] &&
            this._cachedGroupKeyToResultsForGroups[groupByField].summaryLoaded;
    }

    public populateGroupedResults(groupedResults: TCMContracts.TestResultsDetails) {
        const allResultsLoaded: boolean = Utils_String.equals(groupedResults.groupByField, Common.TestResultsGroupPivots.Group_By_Requirement) || Utils_String.equals(groupedResults.groupByField, Common.TestResultsGroupPivots.Group_By_Test_Suite);

        if (!this._cachedGroupKeyToResultsForGroups.hasOwnProperty(groupedResults.groupByField)) {
            this._cachedGroupKeyToResultsForGroups[groupedResults.groupByField] = {
                summaryLoaded: true,
                groupSummaryData: {}
            };
        } else {
            this._cachedGroupKeyToResultsForGroups[groupedResults.groupByField].summaryLoaded = true;
        }

        groupedResults.resultsForGroup.forEach((groupedResult: TCMContracts.TestResultsDetailsForGroup) => {
            const groupSummaryMap = this._cachedGroupKeyToResultsForGroups[groupedResults.groupByField].groupSummaryData;
            const groupById = this._getGroupByIdFromGroupedResults(groupedResults.groupByField, groupedResult);

            if (groupSummaryMap.hasOwnProperty(groupById)) {
                groupSummaryMap[groupById].groupByValue = groupedResult.groupByValue;
                groupSummaryMap[groupById].resultsCountByOutcome = groupedResult.resultsCountByOutcome;
                if (allResultsLoaded) {
                    groupSummaryMap[groupById].results = groupedResult.results;
                }
            } else {
                let resultsForGroup: TCMContracts.TestResultsDetailsForGroup = {
                    groupByValue: groupedResult.groupByValue,
                    results: allResultsLoaded ? groupedResult.results : [],
                    resultsCountByOutcome: groupedResult.resultsCountByOutcome
                };
                groupSummaryMap[groupById] = resultsForGroup;
            }
        });
    }

    public shouldCalculateTotalDuration(groupByField: string) {
        return groupByField === Common.TestResultsGroupPivots.Group_By_Requirement ||
            groupByField === Common.TestResultsGroupPivots.Group_By_Test_Run ||
            groupByField === Common.TestResultsGroupPivots.Group_By_Test_Suite;
    }

    private _populateGroupedResultsForEachGroupBy(groupByField: string, groupByValue: string, result: TCMContracts.ShallowTestCaseResult, testCaseResult: TCMContracts.TestCaseResult) {
        if (!this._cachedGroupKeyToResultsForGroups.hasOwnProperty(groupByField)) {
            this._cachedGroupKeyToResultsForGroups[groupByField] = {
                summaryLoaded: true,
                groupSummaryData: {}
            };
        }
        const groupSummaryMap = this._cachedGroupKeyToResultsForGroups[groupByField].groupSummaryData;
        const outcome: number = TCMContracts.TestOutcome[result.outcome];

        if (groupSummaryMap.hasOwnProperty(groupByValue)) {
            groupSummaryMap[groupByValue].results.push(testCaseResult);
            if (this._shouldCalculateTotalResultCount(groupByField)) {
                if (groupSummaryMap[groupByValue].resultsCountByOutcome.hasOwnProperty(outcome)) {
                    groupSummaryMap[groupByValue].resultsCountByOutcome[outcome].count += 1;
                } else {
                    const aggregatedResults: TCMContracts.AggregatedResultsByOutcome = {
                        count: 1,
                        duration: 0,
                        groupByField: null,
                        groupByValue: null,
                        outcome: TCMContracts.TestOutcome[result.outcome],
                        rerunResultCount: 0
                    };

                    groupSummaryMap[groupByValue].resultsCountByOutcome[outcome] = aggregatedResults;
                }
            }
        }
        else {
            let resultsForGroup: TCMContracts.TestResultsDetailsForGroup = null;
            if (groupByField === Common.TestResultsGroupPivots.Group_By_Test_Run) {
                resultsForGroup = {
                    groupByValue:
                        {
                            id: groupByValue
                        },
                    results: [],
                    resultsCountByOutcome: []
                };
            }
            else {
                resultsForGroup = {
                    groupByValue: groupByValue,
                    results: [],
                    resultsCountByOutcome: []
                };
            }

            resultsForGroup.results.push(testCaseResult);
            if (this._shouldCalculateTotalResultCount(groupByField)) {
                if (resultsForGroup.resultsCountByOutcome.hasOwnProperty(outcome)) {
                    resultsForGroup.resultsCountByOutcome[outcome].count += 1;
                } else {
                    const aggregatedResults: TCMContracts.AggregatedResultsByOutcome = {
                        count: 1,
                        duration: 0,
                        groupByField: null,
                        groupByValue: null,
                        outcome: TCMContracts.TestOutcome[result.outcome],
                        rerunResultCount: 0
                    };

                    resultsForGroup.resultsCountByOutcome[outcome] = aggregatedResults;
                }
            }
            groupSummaryMap[groupByValue] = resultsForGroup;
        }
    }

    private _getGroupByIdFromGroupedResults(groupByField: string, groupedResult: TCMContracts.TestResultsDetailsForGroup): string {
        let groupById: string;
        switch (groupByField) {
            case Common.TestResultsGroupPivots.Group_By_Test_Run:
                const testRun = <TCMContracts.TestRun>groupedResult.groupByValue;
                groupById = testRun.id.toString();
                break;

            case Common.TestResultsGroupPivots.Group_By_Test_Suite:
                const testSuite = <TCMContracts.TestSuite>groupedResult.groupByValue;
                groupById = testSuite.id.toString();
                break;

            case Common.TestResultsGroupPivots.Group_By_Requirement:
                const workItem = <TCMContracts.WorkItemReference>groupedResult.groupByValue;
                const workItemId: number = parseInt(workItem.id);
                groupById = workItem.id;
                break;

            case Common.TestResultsGroupPivots.Group_By_Container:
            case Common.TestResultsGroupPivots.Group_By_Priority:
            case Common.TestResultsGroupPivots.Group_By_None:
            case Common.TestResultsGroupPivots.Group_By_Owner:
                groupById = <string>groupedResult.groupByValue;
                break;
        }
        return groupById;
    }

    private _isGroupByNone(groupByField: string) {
        return Utils_String.equals(Utils_String.empty, groupByField);
    }

    private _shouldCalculateTotalResultCount(groupByField: string) {
        return groupByField === Common.TestResultsGroupPivots.Group_By_Container ||
            groupByField === Common.TestResultsGroupPivots.Group_By_Owner ||
            groupByField === Common.TestResultsGroupPivots.Group_By_Priority;
    }

    private _cachedGroupKeyToResultsForGroups: IDictionaryStringTo<IGroupSummary>;
}
