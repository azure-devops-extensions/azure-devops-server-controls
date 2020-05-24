import { ITestResultTreeData, TreeNodeType } from "TestManagement/Scripts/Scenarios/Common/Common";
import { TestResultsGridActionsHub } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsGridActionsHub";
import { Constants, FilterHelper, GroupByPivotHelper } from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import { FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { TestResultSource } from "TestManagement/Scripts/Scenarios/TestTabExtension/Sources/TestResultSource";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import { TestCaseResultIdentifierWithDuration } from "TestManagement/Scripts/TFS.TestManagement";
import * as TCMLicenseAndFeatureFlagUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { PerformanceUtils } from "TestManagement/Scripts/TFS.TestManagement.Performance";
import { TestResultsStore } from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsGridTreeStore";
import { TestTabTelemetryService } from "TestManagement/Scripts/Scenarios/TestTabExtension/Telemetry";
import * as Utils_String from "VSS/Utils/String";

export class TestResultsListViewActionCreator {
    constructor(private _resultsActionHub: TestResultsGridActionsHub, private _testResultsGridTreeStore: TestResultsStore) {
        this._source = TestResultSource.getInstance();
    }

    public initialize(artifactData: Common.IViewContextData) {
        PerformanceUtils.addSplitTiming(TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails, TMUtils.TRAPerfScenarios.TestResultGrid_GridUpdateStarted);
        const groupBy = GroupByPivotHelper.getDefaultGroupByOption();
        const filterString = FilterHelper.generateFilterString(FilterHelper.getInitialFilterState());
        const isInProgress = artifactData.status === Common.ViewContextStatus.InProgress;
        this._artifactData = artifactData;
        this._source.resetCache();

        this._resultsActionHub.isInProgressView.invoke(isInProgress);
        this._source.getTestResultsByGroup(this._artifactData, groupBy, filterString, isInProgress).then(
            response => {
                this._resultsActionHub.initializeTestResults.invoke({ groupedResults: response, context: this._artifactData});
                if (this._testResultsGridTreeStore && this._testResultsGridTreeStore.getState().isFilteredOrGrouped) {
                    this._getShallowTestCaseResultsInBatches();
                }
            },
            reason => {
                this._resultsActionHub.onError.invoke(this._getErrorMessageText(reason));
            }
        );
    }

    public onGroupByChanged(artifactData: Common.IViewContextData, groupBy: string) {
        this._resultsActionHub.onGroupByChanged.invoke(groupBy);
        // if response for resultForGroup empty on GroupBy changed then store will use its cache
        this._source.getTestResultsByGroup(artifactData, groupBy).then((response) => {
            if (response && response.resultsForGroup.length > 0) {
                this._resultsActionHub.groupedResultsFetched.invoke(response);
            }
        },
            (error) => {
                this._resultsActionHub.onError.invoke(this._getErrorMessageText(error));
            }).then(() => {
                this._getShallowTestCaseResultsInBatches(Constants.groupByChangedAction);
            },
                (error) => {
                    this._resultsActionHub.onError.invoke(this._getErrorMessageText(error));
                });
    }

    public onFilterChanged(viewContext: CommonBase.ViewContext, filterState: FilterState) {
        TestTabTelemetryService.getInstance().publishEvents(TestTabTelemetryService.featureTestTab_Filter, {
            "OutcomeFilters": filterState["Outcome"],
            "FilterCount": Object.keys(filterState).length,
            "OwnerFilterApplied": filterState["Owner"] ? true : false,
            "ContainerFilterApplied": filterState["AutomatedTestStorage"] ? true : false
        });
        this._resultsActionHub.filterChanged.invoke(filterState);
        this._getShallowTestCaseResultsInBatches(Constants.filterchangedAction);
    }

    public loadMoreData(groupId: string, results: TestCaseResultIdentifierWithDuration[], uniqueId: number) {
        this._source.getTestResultsByQueryForGivenResultIdentifiers(results).then(response => {
            this._resultsActionHub.loadMoreData.invoke({ groupId: groupId, results: response, uniqueId: uniqueId });
        });
    }

    public enableReloadButton() {
        this._resultsActionHub.enableReloadButton.invoke(true);
    }

    public onInProgressResults() {
        this._resultsActionHub.enableReloadButton.invoke(false);
        const groupBy = GroupByPivotHelper.getDefaultGroupByOption();
        let filterString = FilterHelper.generateFilterString(FilterHelper.getInitialFilterState());
        this._source.resetCache();

        this._source.getTestResultsByGroup(this._artifactData, groupBy, filterString, true).then(
            response => {
                this._resultsActionHub.initializeTestResults.invoke({ groupedResults: response, context: this._artifactData});
                if (this._testResultsGridTreeStore.getState().isFilteredOrGrouped) {
                    this._getShallowTestCaseResultsInBatches();
                }
            },
            reason => {
                this._resultsActionHub.onError.invoke(this._getErrorMessageText(reason));
            }
        );
    }

    public onLoadMoreClick() {
        this._resultsActionHub.onFetchMoreResults.invoke(null);
        this._getShallowTestCaseResultsInBatches(Constants.loadMoreAction);
    }

    public expandTestResults(item: ITestResultTreeData, results: TestCaseResultIdentifierWithDuration[]) {
        if (TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isHierarchicalViewForResultsEnabled() && item.nodeType === TreeNodeType.group && item.isTestCaseRow) {
            this._source.getSelectedTestCaseResult(this._artifactData, item.runId, item.resultId).then(testCaseResult => {
                if (results) {
                    this._source.getTestResultsByQueryForGivenResultIdentifiers(results).then(response => {
                        this._resultsActionHub.expandTestResults.invoke({ groupId: item.groupId, results: response, testCaseResultDetails: testCaseResult });
                        return;
                    });
                } else {
                    this._resultsActionHub.expandTestResults.invoke({ groupId: item.groupId, results: null, testCaseResultDetails: testCaseResult });
                }
            }, (error) => {
                this._resultsActionHub.onError.invoke(this._getErrorMessageText(error));
            });
        } else {
            if (results) {
                this._source.getTestResultsByQueryForGivenResultIdentifiers(results).then(response => {
                    this._resultsActionHub.expandTestResults.invoke({ groupId: item.groupId, results: response });
                    return;
                });
            } else {
                this._resultsActionHub.expandTestResults.invoke({ groupId: item.groupId, results: null });
            }
        }
    }

    public collapseTestResults(path: string) {
        this._resultsActionHub.collapseTestResults.invoke(path);
    }

    public onColumnOptionsClick(columnTorender: string[]) {
        this._resultsActionHub.onGridColumnChanged.invoke(columnTorender);
    }

    public onTestResultSelectionChanged(data: ITestResultTreeData, index: number) {
        this._resultsActionHub.onTestResultSelectionChanged.invoke({ selection: data, index: index });
    }

    public clearTestResultFocus() {
        this._resultsActionHub.clearTestResultFocus.invoke(null);
    }

    public enableTestResultFocus() {
        this._resultsActionHub.enableTestResultFocus.invoke(null);
    }

    public toggleSort() {
        this._resultsActionHub.sortDataInGridAndToggleState.invoke(null);
    }

    private _getShallowTestCaseResultsInBatches(action?: string): void {
        this._source.getShallowTestResultDetails(this._artifactData, action).then(
            (results) => {
                if (results && results.length > 0) {
                    this._resultsActionHub.shallowResultsFetched.invoke(results);
                    return true;
                } else {
                    return false;
                }
            }
        ).then((shouldRenderMore) => {
            if (shouldRenderMore) {
                this._getShallowTestCaseResultsInBatches();
            }
        }, (error) => {
            this._resultsActionHub.onError.invoke(this._getErrorMessageText(error));
        });
    }

    private _getErrorMessageText(errorMessage): string {
        if (errorMessage == null) {
            return Utils_String.empty;
        } else if (errorMessage.message != null) {
            return errorMessage.message;
        } else if (errorMessage.info != null) {
            return errorMessage.info;
        } else {
            return errorMessage.toString();
        }
    }

    private _source: TestResultSource;
    private _artifactData: Common.IViewContextData;
}
