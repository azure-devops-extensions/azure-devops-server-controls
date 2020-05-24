import { ITestResultTreeData } from "TestManagement/Scripts/Scenarios/Common/Common";
import { FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { IViewContextData } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { Action } from "VSS/Flux/Action";

export class TestResultsGridActionsHub {
    public expandTestResults = new Action<TestResultsToGroupMap>();
    public collapseTestResults = new Action<string>();
    public loadMoreData = new Action<TestResultsToGroupMap>();
    public initializeTestResults = new Action<TestResultsPayload>();
    public onGridColumnChanged = new Action<string[]>();
    public onTestResultSelectionChanged = new Action<TestResultSelectionChange>();
    public onGroupByChanged = new Action<string>();
    public onError = new Action<string>();
    public filterChanged = new Action<FilterState>();
    public shallowResultsFetched = new Action<TCMContracts.ShallowTestCaseResult[]>();
    public groupedResultsFetched = new Action<TCMContracts.TestResultsDetails>();
    public isInProgressView = new Action<boolean>();
    public enableReloadButton = new Action<boolean>();
    public clearTestResultFocus = new Action<void>();
    public onFetchMoreResults = new Action<void>();
    public enableTestResultFocus = new Action<void>();
    public sortDataInGridAndToggleState = new Action<void>();
}

export class TestResultSelectionChange {
    selection: ITestResultTreeData;
    index: number;
}

export class TestResultsPayload {
    groupedResults: TCMContracts.TestResultsDetails;
    context: IViewContextData;
}

export class TestResultsToGroupMap {
    groupId: string;
    results: TCMContracts.TestResultsQuery;
    testCaseResultDetails?: TCMContracts.TestCaseResult;
    //adding uniqueId to make sure back channel for load more can be stopped using this
    uniqueId?: number;
}