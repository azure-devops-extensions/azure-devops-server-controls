import { Selection } from "OfficeFabric/DetailsList";
import { autobind } from "OfficeFabric/Utilities";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { ShallowTestCaseResult, TestCaseResult, TestResultsDetails, TestResultsDetailsForGroup } from "TFS/TestManagement/Contracts";
import { ITestResultTreeData, TreeNodeType } from "TestManagement/Scripts/Scenarios/Common/Common";
import { TestResultDetailsActionHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/TestResultDetailsActionHub";
import { TestResultSelectionChange, TestResultsGridActionsHub, TestResultsPayload, TestResultsToGroupMap } from "TestManagement/Scripts/Scenarios/TestTabExtension/Actions/TestResultsGridActionsHub";
import { Constants, FilterHelper, GroupByPivotHelper, TestOutcome, RunOutcome } from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import { ContractConversionUtils } from "TestManagement/Scripts/Scenarios/TestTabExtension/ConvertUtils";
import { FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { ColumnOptionsHelper } from "TestManagement/Scripts/Scenarios/TestTabExtension/Helpers/ColumnOptionsHelper";
import { TestCaseResultIdentifierWithDuration } from "TestManagement/Scripts/TFS.TestManagement";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import { IViewContextData, TestResultsOutcomeFilterPivots } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { TestResultsFilteringManager } from "TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResults.FilteringManager";
import { TestResultsGroupByManager } from "TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResults.GroupByManager";
import { Store } from "VSS/Flux/Store";
import { delegate } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";

export interface ITestResultsState {
    errorMessage?: string;
    results: ITestResultTreeData[];
    columnToRender: string[];
    selection: Selection;
    lastSelectedIndex: number;
    needFocusOnSelectedElement: boolean;
    loading: boolean;
    totalResultsCount: number;
    fetchedResultsCount: number;
    showingResultsCount: number;
    viewContext: CommonBase.ViewContext;
    endPerfMarker: boolean;
    filterState: FilterState;
    isSortedDescending: boolean;
    isFilteredOrGrouped: boolean;
}

export class TestResultsStore extends Store {
    constructor(actionsHub: TestResultsGridActionsHub, resultDetailsActionHub: TestResultDetailsActionHub, viewContext: CommonBase.ViewContext) {
        super();

        this._state = this._getInitialState(viewContext);

        actionsHub.onError.addListener(delegate(this, this._onError));
        actionsHub.collapseTestResults.addListener(delegate(this, this._collapse));
        actionsHub.expandTestResults.addListener(delegate(this, this._expand));
        actionsHub.initializeTestResults.addListener(delegate(this, this._initializeData));
        actionsHub.loadMoreData.addListener(delegate(this, this._loadMoreData));
        actionsHub.onGridColumnChanged.addListener(delegate(this, this._updateGridColumn));
        actionsHub.filterChanged.addListener(delegate(this, this._onfilterChanged));
        actionsHub.shallowResultsFetched.addListener(delegate(this, this._cacheShallowResultsAndUpdateCurrentState));
        actionsHub.groupedResultsFetched.addListener(delegate(this, this._cacheGroupedResultsAndUpdateCurrentState));
        actionsHub.onGroupByChanged.addListener(delegate(this, this._onGroupByChanged));
        actionsHub.onTestResultSelectionChanged.addListener(delegate(this, this._testResultSelected));
        actionsHub.clearTestResultFocus.addListener(delegate(this, this._clearLastTestResultFocus));
        actionsHub.onFetchMoreResults.addListener(delegate(this, this._onFetchMoreResults));
        actionsHub.enableTestResultFocus.addListener(delegate(this, this._enableTestResultFocus));
        actionsHub.sortDataInGridAndToggleState.addListener(delegate(this, this._sortDataInGridAndToggleState));

        resultDetailsActionHub.exitDetailsPaneFullScreen.addListener(delegate(this, this._onExitDetailsPaneFullScreen));

        this._filterManager = new TestResultsFilteringManager();
        this._groupByManager = new TestResultsGroupByManager();

        this._groupByField = GroupByPivotHelper.getDefaultGroupByOption();
    }

    private _getInitialState(viewContext: CommonBase.ViewContext) {
        return {
            results: [],
            columnToRender: ColumnOptionsHelper.InitiallyRenderingColumnList(viewContext),
            selection: new Selection({
                onSelectionChanged: () => {
                    if (this._state.selection.count === 0) {
                        this._state.lastSelectedIndex = null;
                    }
                    // emitting change outside the if so that store updated event is called which thereby invokes _onTestResultsStoreChange in TestResultsListCommandBarStore
                    this.emitChanged();
                }
            }),
            loading: true,
            totalResultsCount: 0,
            fetchedResultsCount: 0,
            showingResultsCount: 0,
            viewContext: viewContext,
            endPerfMarker: false,
            errorMessage: null,
            filterState: FilterHelper.getInitialFilterState(),
            isFilteredOrGrouped: false, //required to check if the data is default rendered or filter/group by is applied
            isSortedDescending: true
        } as ITestResultsState;
    }

    public getState(): ITestResultsState {
        return this._state;
    }

    @autobind
    private _sortDataInGridAndToggleState() {
        this._state.isSortedDescending = !this._state.isSortedDescending;
        if (!this._state.isFilteredOrGrouped) {
            this._sortUnfilterdData();
        }
        else {
            this._updateResultsToRender();
        }
        this._expandFirstGroupBy();
        this._updateCurrentState();
        this.emitChanged();
    }

    private _sortUnfilterdData() {
        for (let key in this._groupsCache) {
            let retrievedResults: ITestResultTreeData[] = this._groupToResultsMap[key] ? this._groupToResultsMap[key] : [];
            let resultsToBeRetreived: TestCaseResultIdentifierWithDuration[] = this._resultIdsToBeFetched[key] ? this._resultIdsToBeFetched[key] : [];

            let combinedResults: TestCaseResultIdentifierWithDuration[] = [];

            retrievedResults.map(result => {
                const identifier = new TestCaseResultIdentifierWithDuration(result.runId, result.resultId, result.durationInMs);
                combinedResults.push(identifier);
            });
            let concatenatedResults: TestCaseResultIdentifierWithDuration[] = resultsToBeRetreived.concat(combinedResults);
            if (this._state.isSortedDescending) {
                this._resultIdsToBeFetched[key] = concatenatedResults.sort(ContractConversionUtils.sortingIdentifierDescending);
            }
            else {
                this._resultIdsToBeFetched[key] = concatenatedResults.sort(ContractConversionUtils.sortingIdentifierAscending);
            }
            // Resetting the cache so that there are no duplications as the data from this cache has been sorted and stored into 
            // cache _resultIdsToBeFetched for further processing
            this._groupToResultsMap[key] = [];
        }
    }

    private _resetCache() {
        this._groupByManager.resetCache();
        this._filterManager.resetCache();
        this._state.fetchedResultsCount = 0;
        this._state.showingResultsCount = 0;
        this._state.totalResultsCount = 0;
    }

    private _initializeData(data: TestResultsPayload) {
        let totalTestsCount: number = 0;
        this._resetCache();
        this._state.endPerfMarker = true;
        this._state.errorMessage = null;
        if (!data.groupedResults || data.groupedResults.resultsForGroup.length === 0) {
            this._state.loading = false;
            this.emitChanged();

            return;
        }

        data.groupedResults.resultsForGroup.forEach((groupSummary) => {
            if (groupSummary.resultsCountByOutcome) {
                for (let outcome in groupSummary.resultsCountByOutcome) {
                    totalTestsCount += groupSummary.resultsCountByOutcome[outcome].count;
                }
            }
        });

        this._state.totalResultsCount = totalTestsCount;
        this._context = data.context;
        this._cachegroupedResults(data.groupedResults);
        if (this._state.isFilteredOrGrouped) {
            this._onfilterChanged(this._state.filterState);
        }
        else {
            this._initializeGroupDetails(data.groupedResults);
            this._expandFirstGroupBy();
            this._updateCurrentState();
        }
        this.emitChanged();
    }

    private _onError(errorMessage: string) {
        this._state.loading = false;
        this._state.errorMessage = errorMessage;

        this.emitChanged();
    }

    private _collapse(groupId: string) {
        this._groupsCache[groupId].expanded = false;
        this._updateCurrentState();

        this.emitChanged();
    }

    private _expand(results: TestResultsToGroupMap) {
        this._groupsCache[results.groupId].expanded = true;
        this._insertTestResultsAndUpdateCurrentState(results);
        this.emitChanged();
    }

    private _expandFirstGroupBy() {
        // First groupBy should be expanded
        if (this._groupsCache &&
            Object.keys(this._groupsCache).length > 0) {
            const groupIdToExpand: string = Object.keys(this._groupsCache)[0];

            this._groupsCache[groupIdToExpand].expanded = true;
        }
    }

    private _updateGridColumn(updatedColumn: string[]) {
        this._state.columnToRender = updatedColumn;
        this.emitChanged();
    }

    private _loadMoreData(results: TestResultsToGroupMap) {
        if (!results.uniqueId || results.uniqueId === this._uniqueRedrawGridId) {
            this._insertTestResultsAndUpdateCurrentState(results);
            this.emitChanged();
        }
    }

    private _onFetchMoreResults() {
        if (this._state.showingResultsCount < this._state.fetchedResultsCount) {
            this._updateResultsAndEmitChanges();
        }
        this._isFirstBatchFetched = true;
    }

    private _insertTestResultsAndUpdateCurrentState(results: TestResultsToGroupMap) {
        if (results.testCaseResultDetails) {
            this._addSubResultsIntoGroupToResultsMap(results, this._context);
        }

        if (results.results && results.results.results.length > 0) {
            this._addResultsIntoTestRunToResultsMap(results.results.results, this._context, results.groupId);
        }

        this._updateCurrentState();
    }

    private _addSubResultsIntoGroupToResultsMap(results: TestResultsToGroupMap, context: IViewContextData) {
        if (results.testCaseResultDetails) {
            let parentDepth = this._groupsCache[results.groupId].depth;
            this._groupToResultsMap[results.groupId] = [];
            let subResults = [];
            if (parentDepth === 1) {
                subResults = results.testCaseResultDetails.subResults;
            } else {
                subResults = this._groupsCache[results.groupId].subresults;
            }
            if (subResults) {
                // Ordering from latest to oldest subresults
                for (let i = subResults.length - 1; i >= 0; --i) {
                    let testCaseResult = results.testCaseResultDetails, subResult = subResults[i];
                    let resultViewModel = ContractConversionUtils.getResultViewModelFromSubresult(testCaseResult, context, results.groupId, subResult, parentDepth);
                    this._groupToResultsMap[results.groupId].push(resultViewModel);
                    if (subResult.resultGroupType !== TCMContracts.ResultGroupType.None) {
                        this._groupsCache[testCaseResult.testRun.id.toString() + "." + testCaseResult.id.toString() + "." + subResult.id.toString()] = resultViewModel;
                    }
                }
            }
        }
    }

    private _addResultsIntoTestRunToResultsMap(results: TestCaseResult[], context: IViewContextData, groupId: string) {
        if (!this._groupsCache[groupId]) {
            groupId = this._groupIdOfRootLevelItems;
        }

        results.map(result => {
            const resultViewModel = ContractConversionUtils.getResultViewModelFromTestResult(result, context, groupId);
            const identifier = new TestCaseResultIdentifierWithDuration(resultViewModel.runId, resultViewModel.resultId, resultViewModel.durationInMs).toString();

            if (result.resultGroupType !== TCMContracts.ResultGroupType.None) {
                this._groupsCache[result.testRun.id.toString() + "." + result.id.toString()] = resultViewModel;
            }
            if (!this._groupToResultsMap[groupId]) {
                this._groupToResultsMap[groupId] = [];
            }
            // insert results corresponding to the given group id.
            this._groupToResultsMap[groupId].push(resultViewModel);

            //sort in same order as current order for more results that are being loaded
            if (this._state.isSortedDescending) {
                this._groupToResultsMap[groupId].sort(ContractConversionUtils.sortingComparatorDescending);
            }
            else {
                this._groupToResultsMap[groupId].sort(ContractConversionUtils.sortingComparatorAscending);
            }
        });
    }

    private _initializeGroupDetails(groupedResults: TCMContracts.TestResultsDetails) {
        this._groupsCache = {};
        this._groupToResultsMap = {};
        this._resultIdsToBeFetched = {};

        let groupBy = groupedResults.groupByField;

        groupedResults.resultsForGroup.map((resultGroup, index) => {
            if (TestResultsStore._shouldShowGroupDetails(resultGroup, this._state.filterState)) {
                let groupId = this._groupIdOfRootLevelItems;
                let currentGroupId = index.toString();
                if (groupBy) {
                    let runObject = this._getTestRunDetails(resultGroup, groupBy, currentGroupId);

                    // initialize _groupsCache to get group information.
                    this._groupsCache[currentGroupId] = runObject;
                    groupId = currentGroupId;
                }
                let sortedData;
                if (this._state.isSortedDescending) {
                    sortedData = resultGroup.results.sort(ContractConversionUtils.sortingComparatorDescending);
                }
                else {
                    sortedData = resultGroup.results.sort(ContractConversionUtils.sortingComparatorAscending);
                }

                sortedData.map(result => {
                    const identifier = new TestCaseResultIdentifierWithDuration(parseInt(result.testRun.id), result.id, result.durationInMs);

                    // inserting results which are yet to be fetched from server.
                    if (!this._resultIdsToBeFetched[groupId]) {
                        this._resultIdsToBeFetched[groupId] = [];
                    }
                    this._resultIdsToBeFetched[groupId].push(identifier);
                });
            }
        });
    }


    public getUniqueRedrawGridId(): number {
        return this._uniqueRedrawGridId;
    }

    public getNextResultsToBeFetched(groupId: string): TestCaseResultIdentifierWithDuration[] {
        if (!this._resultIdsToBeFetched[groupId]) {
            return;
        }

        let currentSize = this._resultIdsToBeFetched[groupId].length;
        if (currentSize > Constants.pageSize) {
            let idsToBeFetched = this._resultIdsToBeFetched[groupId].splice(0, Constants.pageSize - 1);
            return idsToBeFetched;
        }
        let idsToBeFetched = this._resultIdsToBeFetched[groupId];
        delete this._resultIdsToBeFetched[groupId];

        return idsToBeFetched;
    }

    private _onfilterChanged(filterState: FilterState) {
        this._uniqueRedrawGridId = new Date().getTime();
        this._state.filterState = filterState;
        this._state.isFilteredOrGrouped = true;
        this._state.loading = true;
        //allowing the first batch to reflect in UI
        this._isFirstBatchFetched = true;
        this._state.needFocusOnSelectedElement = false;
        this._updateResultsAndCurrentState();
        this.emitChanged();
    }

    private _onGroupByChanged(groupByField: string) {
        this._uniqueRedrawGridId = new Date().getTime();
        this._groupByField = groupByField;
        this._state.isFilteredOrGrouped = true;
        this._state.loading = true;
        this._updateResultsAndCurrentState();
        this._state.needFocusOnSelectedElement = false;

        //allowing the first batch to reflect in UI
        this._isFirstBatchFetched = true;
        this.emitChanged();
    }

    private _testResultSelected(testResultSelected: TestResultSelectionChange) {
        this._state.lastSelectedIndex = testResultSelected.index;
        this._state.needFocusOnSelectedElement = false;
        
        this.emitChanged();
    }

    private _clearLastTestResultFocus() {
        this._state.lastSelectedIndex = null;

        this.emitChanged();
    }

    private _enableTestResultFocus() {
        this._state.needFocusOnSelectedElement = true;

        this.emitChanged();
    }

    private _onExitDetailsPaneFullScreen() {
        this._state.needFocusOnSelectedElement = true;
        this.emitChanged();
    }

    private _cacheShallowResultsAndUpdateCurrentState(resultsShallowDetails: ShallowTestCaseResult[]) {
        this._cacheShallowResults(resultsShallowDetails);
        if (this._isFirstBatchFetched) {
            this._updateResultsAndEmitChanges();
            this._isFirstBatchFetched = false;
        }
        else {
            this.emitChanged();
        }
    }

    private _cacheGroupedResultsAndUpdateCurrentState(groupedResults: TestResultsDetails) {
        this._cachegroupedResults(groupedResults);
        this._updateResultsAndEmitChanges();
    }

    private _updateResultsAndCurrentState() {
        if (this._groupByManager.isGroupBySummaryLoaded(this._groupByField) &&
            this._state.fetchedResultsCount > 0) {
            this._updateResultsToRender();
            this._expandFirstGroupBy();
            this._updateCurrentState();
        }
    }

    private _updateResultsAndEmitChanges() {
        if (this._groupByManager.isGroupBySummaryLoaded(this._groupByField) &&
            this._state.fetchedResultsCount > 0) {
            // this is invoked from filter more and when groups are fetched and hence adding key here as well
            this._uniqueRedrawGridId = new Date().getTime();
            this._updateResultsToRender();
            this._expandFirstGroupBy();
            this._updateCurrentState();
            this.emitChanged();
        }
    }

    private _updateResultsToRender() {
        const groupedResults = this._groupByManager.getGroupByResults(this._groupByField);
        const filteredGroupedResults = this._filterManager.filterGroupedResults(groupedResults, this._state.filterState);

        this._initializeGroupDetails(filteredGroupedResults);
        //since fetchedResultsCount will be shown now hence assigning it to showingResultsCount
        this._state.showingResultsCount = this._state.fetchedResultsCount;
    }

    private _cacheShallowResults(resultsShallowDetails: ShallowTestCaseResult[]) {
        if (resultsShallowDetails && resultsShallowDetails.length > 0) {
            resultsShallowDetails.forEach(result => {
                this._filterManager.populateCache(result);
                this._groupByManager.populateShallowResult(result);
            });

            this._state.fetchedResultsCount += resultsShallowDetails.length;
        }
    }

    private _cachegroupedResults(groupedResults: TestResultsDetails) {
        this._groupByManager.populateGroupedResults(groupedResults);
    }

    private _updateCurrentState() {
        this._state.results = [];
        this._state.loading = false;
        if (this._groupToResultsMap[this._groupIdOfRootLevelItems] || this._groupByField === Utils_String.empty) {
            this._addLeafNodeResults(this._groupIdOfRootLevelItems);
        }
        for (let key in this._groupsCache) {
            let group = this._groupsCache[key];
            if (!group.isTestCaseRow) {
                this._state.results.push(group);
                if (group.expanded) {
                    this._addLeafNodeResults(key);
                }
            }
        }
    }

    private _addLeafNodeResults(groupId: string) {
        let leafNodes = this._groupToResultsMap[groupId];
        if (leafNodes) {
            for (let i = 0; i < leafNodes.length; ++i) {
                this._state.results.push(leafNodes[i]);
                if (leafNodes[i].depth <= Constants.maxDepthAllowed && leafNodes[i].expanded) {
                    this._addLeafNodeResults(leafNodes[i].groupId);
                }
            }
        }

        if (this._resultIdsToBeFetched[groupId]) {
            this._state.results.push({ nodeType: TreeNodeType.showMore, groupId: groupId, key: this.generateKey(this._resultIdsToBeFetched[groupId]) } as ITestResultTreeData);
        }
    }

    /// <summary>
    /// Calculates the run outcome based on the state of the run and tests in it
    /// </summary>
    private _getRunOutcome(groupedResult: TestResultsDetailsForGroup) {
        let runOutcome: number = -1;

        // If the logic is changed here, server side logic must be changed too. Both must be consistent.
        if (RunOutcome.getOutcomeToEnum(groupedResult.groupByValue.state) === RunOutcome.InProgress
            || RunOutcome.getOutcomeToEnum(groupedResult.groupByValue.state) === RunOutcome.Aborted) {
            runOutcome = RunOutcome.getOutcomeToEnum(groupedResult.groupByValue.state);
        }
        else if (!groupedResult.resultsCountByOutcome[TestOutcome.Failed] && groupedResult.resultsCountByOutcome[TestOutcome.Passed]) {
            runOutcome = RunOutcome.Passed;
        }
        else if (groupedResult.resultsCountByOutcome[TestOutcome.Failed]) {
            runOutcome = RunOutcome.Failed;
        }
        else if (groupedResult.resultsCountByOutcome[TestOutcome.NotImpacted]) {
            runOutcome = RunOutcome.NotImpacted;
        }
        else {
            runOutcome = RunOutcome.Others;
        }
        return runOutcome;
    }

    /// <summary>
    /// Returns details required for test run.
    /// </summary>
    private _getTestRunDetails(groupedResult: TestResultsDetailsForGroup, field: string, groupId: string): ITestResultTreeData {
        let totalTests: number = 0;
        let totalMilliseconds: number = 0;
        let filterredTestsCount = groupedResult.results.length;

        const shouldCalculateDuration = this._groupByManager.shouldCalculateTotalDuration(field);

        for (const outcomeKey in groupedResult.resultsCountByOutcome) {
            let outcome = groupedResult.resultsCountByOutcome[outcomeKey];

            totalTests += outcome.count;
            if (shouldCalculateDuration) {
                totalMilliseconds += CommonUtils.TestReportDataParser.getDurationInMilliseconds(outcome.duration);
            }
        }

        const groupByValue = GroupByPivotHelper.getPivotValueForGroupValue(groupedResult, field);

        // This will be runId when results are grouped by Test Run, otherwise it will be zero
        const runId: number = GroupByPivotHelper.getRunId(groupedResult, field);

        let runOutcome: number = -1;
        if (runId !== 0) {
            runOutcome = this._getRunOutcome(groupedResult);
        }

        const resultViewModel: ITestResultTreeData = {
            test: groupByValue,
            isTestCaseRow: false,
            duration: shouldCalculateDuration ? ContractConversionUtils.convertMilliSecondsToReadableFormatForResultSummary(totalMilliseconds) : Utils_String.empty,
            storage: groupedResult.groupByValue.storage,
            expanded: false,
            nodeType: TreeNodeType.group,
            groupId: groupId,
            filteredTestsCount: filterredTestsCount,
            totalTestsCount: totalTests,
            depth: 0,
            runId: runId,
            runOutcome: runOutcome
        };

        return resultViewModel;
    }

    // Donot show group details if no results are there except for Aborted Run
    private static _shouldShowGroupDetails(resultsForGroup: TCMContracts.TestResultsDetailsForGroup, filterState: FilterState): boolean {
        if (resultsForGroup.results.length > 0) {
            return true;
        }
        return TestResultsStore._shouldShowAbortedRuns(resultsForGroup, filterState);
    }

    private static _shouldShowAbortedRuns(resultsForGroup: TCMContracts.TestResultsDetailsForGroup, filterState: FilterState): boolean {
        const isRunStateAborted = resultsForGroup.groupByValue.state
            ? resultsForGroup.groupByValue.state === TestResultsOutcomeFilterPivots.Filter_By_Aborted
            : false;

        const filterString = FilterHelper.generateFilterString(filterState);
        const isOutcomeFilterAborted =
            filterString.indexOf(TestResultsOutcomeFilterPivots.Filter_By_Aborted) > 0;
        const searchText = FilterHelper.getSearchText(filterState);

        if (isRunStateAborted
            && (isOutcomeFilterAborted || filterString === Utils_String.empty)
            && (searchText === Utils_String.empty || searchText === null)) {
            return true;
        }

        return false;
    }


    private generateKey(resultIds: any[]): string {
        let uniqueKey: string = resultIds[0].toString();
        const currentSize = resultIds.length;

        if (currentSize > Constants.pageSize) {
            uniqueKey = uniqueKey.concat(resultIds[Constants.pageSize - 1].toString());
        } else {
            uniqueKey = uniqueKey.concat(resultIds[currentSize - 1].toString());
        }

        //making the key unique since in some scenarios loadging gets stuck as react does not call RowwDidMount as already mounted if key is same 
        return uniqueKey.concat("showMore" + new Date().getTime());
    }

    private _groupIdOfRootLevelItems: string = "-1";

    private _state: ITestResultsState;
    private _context: IViewContextData;
    private _groupsCache: IDictionaryStringTo<ITestResultTreeData> = {};
    private _groupToResultsMap = {};
    private _resultIdsToBeFetched = {};
    private _filterManager: TestResultsFilteringManager;
    private _groupByManager: TestResultsGroupByManager;
    private _groupByField: string;
    private _isFirstBatchFetched: boolean = true;
    private _uniqueRedrawGridId = new Date().getTime();
}
