
import ko = require("knockout");
import q = require("q");

import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import * as CommonHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import * as TCMConstants from "Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants";
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import { DataProvider } from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultsGrid = require("TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.Grid");
import TCMOM = require("TestManagement/Scripts/TFS.TestManagement");
import TcmService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TRACommonControls = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls");
import ViewModel = require("TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel");
import * as ViewSettings from "TestManagement/Scripts/TestReporting/Common/View.Settings";
import { IFilter, FilterState } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { ServiceManager as TMServiceManager } from "TestManagement/Scripts/TFS.TestManagement.Service";
import { ITestCaseResultsWithContinuationToken } from "TestManagement/Scripts/TFS.TestManagement.Types";
import { TestResultsOutcomeFilterPivots } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { TestResultsFilteringManager } from "TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResults.FilteringManager";
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");
import BuildContracts = require("TFS/Build/Contracts");
import RMContracts_LAZY_LOAD = require("ReleaseManagement/Core/Contracts");
import ReleaseHelper_LAZY_LOAD = require("TestManagement/Scripts/Utils/TFS.TestManagement.ReleaseStatusHelper");
import RMUtils_LAZY_LOAD = require("ReleaseManagement/Core/Utils");

import Contracts = require("TFS/TestManagement/Contracts");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import Performance = require("VSS/Performance");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

export interface IGridItem extends Grids.IGridHierarchyItem {
    pivotValue?: string;
    id?: string;
    state?: Common.GroupState;
    children?: IGridItem[];
    runId?: number;
    resultId?: number;
    testCaseRefId?: number;
    isTestCaseItem: boolean;
    payload?: any; //generic information for each test row
}

export interface IGroupValueData {
    header: string;
    groupDuration: string;
    passedCount: number;
    notImpactedCount: number;
    totalCount: number;
}

interface IGroupSummary {
    summaryLoaded: boolean;
    groupSummaryData: IDictionaryStringTo<Contracts.TestResultsDetailsForGroup>;
}

export class ResultListViewModel extends Adapters_Knockout.TemplateViewModel implements ViewModel.IResultsViewModel {

    constructor(messageViewModel: MessageArea.MessageAreaViewModel, filterMessageViewModel: MessageArea.MessageAreaViewModel, viewModelList: ViewModel.ResultsViewModel) {
        super();
        this._hierarchicalDatasource = {};
        this._idToTestResultMap = {};
        this._cachedFields = {};
        this._cachedGroupKeyToResultsForGroups = {};
        this._filterManager = new TestResultsFilteringManager();

        viewModelList.add(this);
        this._messageViewModel = messageViewModel;
        this._filterMessageViewModel = filterMessageViewModel;

        this._resultCache = {};
    }

    public onDisplayedDelegate: () => void = null;

    /// <summary>
    /// Entry method to be called from host callback
    /// </summary>
    public load(viewContextdata: Common.IViewContextData): void {
        this._storeContextData(viewContextdata);
        this.reload();
    }

    public reload(): void {
        this._resetCache();
        this._clearMessages();
        this._setInProgressBinding(this._viewContext, DataProvider.getTestQueryParameter(this._viewContext.viewContext, this._viewContext.data)).then(() => {
            this._loadDataForSelectedGroupbyAndFilter();
        }).then(undefined, (reason: any) => {
            Diag.logError(Utils_String.format("Failed to Set InProgress Bindings. Error: {0}", (reason)));
        });
    }

    public handleOnDisplayed(): void {
        if (this.onDisplayedDelegate) {
            this.onDisplayedDelegate();
        }
    }

    public getSelectedGroupBy(): string {
        return this._selectedGroupByOption;
    }

    public setSelectedGroupBy(groupBy: string) {
        this._selectedGroupByOption = groupBy;
    }

    public getSelectedOutcomeFilter(): string {
        return this._selectedOutcomeFilterByOption;
    }

    /// <summary>
    /// Updates the default filters
    /// </summary>
    public setSelectedOutcomeFilter(outcomeFilter: string) {
        this._selectedOutcomeFilterByOption = outcomeFilter;
    }

    public getSelectedFilterState(): FilterState {
        return this._selectedFilterState;
    }

    /// <summary>
    /// Updates the default filter state used in filter bar
    /// </summary>
    public setSelectedFilterState(filterState: FilterState) {
        this._selectedFilterState = filterState;
    }

    public setSortBy(sortByField: string): void {
        this._sortByField = sortByField;
    }

    /// <summary>
    /// Updates data source based on pivot change
    /// </summary>
    public updateDataSource(): void {
        if (this._viewContext) {
            let searchText: string = CommonHelper.FilterHelper.getSearchText(this._selectedFilterState);
            this._loadData(this._viewContext.viewContext, this._viewContext.data, this._selectedGroupByOption, this._getSelectedFilterString(), null, searchText);
        }
    }

    /// <summary>
    /// Checks whether the selected filter option is applicable for the results in grid.
    /// </summary>
    public isSelectedFilterPivotApplicable() {

        if (LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled()) {
            return true; // If filter bar is shown we want to always fetch the results for filters chosen. In future, we can optimize to not fetch if only outcome filter is chosen
        }

        let isSelectedFilterApplicable: boolean = false;
        switch (this._selectedOutcomeFilterByOption) {
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Passed:
                if (this.resultsHavePassedOutcome) {
                    isSelectedFilterApplicable = true;
                }
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Aborted:
                isSelectedFilterApplicable = true;
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Failed:
                if (this.resultsHaveFailedOutcome) {
                    isSelectedFilterApplicable = true;
                }
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_NotImpacted:
                if (this.resultsHaveNotImpactedOutcome) {
                    isSelectedFilterApplicable = true;
                }
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Others:
                if (this.otherResultOutcomes.length !== 0) {
                    isSelectedFilterApplicable = true;
                }
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_All:
                if (this.allResultOutcomes.length !== 0) {
                    isSelectedFilterApplicable = true;
                }
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_PassedOnRerun:
                isSelectedFilterApplicable = true;
                break;
            default:
                Diag.logError("[ResultsGridViewModel.isFilterPivotApplicable]: Error: Not a valid filter");
                break;
        }
        this.noTestResultsForTheFilters(!isSelectedFilterApplicable);
        this.noTestResultsForTheFilters.valueHasMutated();

        Diag.logVerbose(Utils_String.format("[ResultsGridViewModel.isFilterPivotApplicable]: method called, isSelectedFilterApplicable: {0}", isSelectedFilterApplicable));
        return isSelectedFilterApplicable;
    }

    /// <summary>
    /// Sets a test result as selected item in viewModel
    /// </summary>
    public setSelectedTestCaseResult(runId: number, resultId: number): void {
        const selectedTestResultIdString: string = new TCMOM.TestCaseResultIdentifier(runId, resultId).toString();
        let prevSelection: Contracts.TestCaseResult = this.selectedTestCaseResult(), prevTestResultIdentifierString: string;

        if (prevSelection && prevSelection.testRun && prevSelection.testRun.id) {
            prevTestResultIdentifierString = new TCMOM.TestCaseResultIdentifier(parseInt(prevSelection.testRun.id), prevSelection.id).toString();
        }
        if (!Utils_String.equals(selectedTestResultIdString, prevTestResultIdentifierString)) {
            if (this._idToTestResultMap[selectedTestResultIdString]) {
                this.selectedTestCaseResult(this._idToTestResultMap[selectedTestResultIdString]);
                Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails);
            }
            else {
                // Fetch the result from the server
                DataProvider.getDataProvider(this._viewContext.viewContext).then((dataProvider) => {
                    dataProvider.getTestResultData(runId, resultId, Contracts.ResultDetails.SubResults)
                        .then((testCaseResult: Contracts.TestCaseResult) => {

                            //Populating build and release definition Id depending on context to fetch results trend
                            dataProvider.populateTestResultWithContextData(testCaseResult, this._viewContext.data);

                            this._idToTestResultMap[selectedTestResultIdString] = testCaseResult;
                            this.selectedTestCaseResult(testCaseResult);

                            Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails);
                        },
                        (error) => {
                            if (error && error.serverError && error.serverError.typeKey === "AccessDeniedException") {
                                this._messageViewModel.logInfoJQuery($("<span/>").html(Resources.ViewTestResultPermissionMessage));
                            }
                            else {
                                this._messageViewModel.logError(error);
                            }

                            Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_NavigateResultDetails);
                        });
                }, (error) => {
                    Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
                });
            }
        }
    }

    public getViewContext(): CommonBase.ViewContext {
        return this._viewContext.viewContext;
    }

    public getResultFromCache(resultIdentifier: string): ResultsGrid.IResultViewModel {
        return resultIdentifier ? this._resultCache[resultIdentifier] : null;
    }

    public addResultToCache(resultIdentifier: string, result: ResultsGrid.IResultViewModel) {
        this._resultCache[resultIdentifier] = result;
    }

    public getResultCacheSize(): number {
        return Object.keys(this._resultCache).length;
    }

    /// <summary>
    /// Gets a test result from dictionary.
    /// </summary>
    public getTestCaseResult(runId: number, resultId: number): Contracts.TestCaseResult {
        let selectedTestResultIdentifier: TCMOM.TestCaseResultIdentifier,
            testResultIdString: string;

        selectedTestResultIdentifier = new TCMOM.TestCaseResultIdentifier(runId, resultId);
        testResultIdString = selectedTestResultIdentifier.toString();

        return this._idToTestResultMap[testResultIdString];
    }

    /// <summary>
    /// Access method for _hierarchicalDatasource, added to support testability
    /// </summary>
    public getHierarchicalDataSource(): IDictionaryStringTo<Grids.IGridSource> {
        return this._hierarchicalDatasource;
    }

    /// <summary>
    /// Access method for _idToTestResultMap, added to support testability
    /// </summary>
    public getIdToTestResultMap(): IDictionaryStringTo<Contracts.TestCaseResult> {
        return this._idToTestResultMap;
    }

    public getResultsForGrid(resultIdentifiersToFetch: string[]): IPromise<ResultsGrid.IResultViewModel[]> {
        let deferred: Q.Deferred<ResultsGrid.IResultViewModel[]> = q.defer<ResultsGrid.IResultViewModel[]>();
        let results: Contracts.TestCaseResult[] = [];
        let resultIdentifierTuple: string[];

        resultIdentifiersToFetch.forEach((resultIdentifier: string) => {
            resultIdentifierTuple = resultIdentifier.split(":");
            results.push(<Contracts.TestCaseResult>{ id: parseInt(resultIdentifierTuple[1]), testRun: <Contracts.ShallowReference>{ id: resultIdentifierTuple[0] } });
        });

        let fields: string[] = [
            "Outcome",
            "TestCaseTitle",
            "AutomatedTestName",
            "AutomatedTestStorage",
            "State"
        ];

        if (LicenseAndFeatureFlagUtils.isReportCustomizationFeatureEnabled()) {
            fields.push(Common.Constants.OutcomeConfidenceField);
        }

        this._fillFieldsForSelectedColumnsFromUserSettings(fields);

        let query: Contracts.TestResultsQuery = { results: results, fields: fields, resultsFilter: null };

        DataProvider.getDataProvider(this._viewContext.viewContext).then((dataProvider) => {
            return dataProvider.getTestResultsByQuery(query)
                .then((resultQuery: Contracts.TestResultsQuery) => {
                    let resultDataForGrid: ResultsGrid.IResultViewModel[] = [];
                    resultQuery.results.forEach((testCaseResult: Contracts.TestCaseResult) => {
                        resultDataForGrid.push(this.getResultViewModelFromContract(testCaseResult));
                    });
                    deferred.resolve(resultDataForGrid);
                },
                (error) => {
                    if (error && error.serverError && Utils_String.equals(error.serverError.typeKey, "AccessDeniedException", true)) {
                        this._messageViewModel.logInfoJQuery($("<span/>").html(Resources.ViewTestResultPermissionMessage));
                    }
                    else {
                        this._messageViewModel.logError(Resources.TestResultsServerError);
                    }
                    Diag.logError(Utils_String.format("[ResultsGridViewModel.getResultsForGrid]: method failed, Error: {0}", error));
                    deferred.reject(error);
                    Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PagedResultsFetchInGrid);
                    Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PopulateResultsInGrid);
                    Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails);
                });
        }, (error) => {
            Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
        });

        return deferred.promise;
    }

    /// <summary>
    /// Get the result view model from testCaseResult
    /// </summary>
    public getResultViewModelFromContract(testCaseResult: Contracts.TestCaseResult): ResultsGrid.IResultViewModel {
        let contextId: number = 0;
        let contextName: string = Utils_String.empty;
        if (testCaseResult.failingSince) {
            switch (this.getViewContext()) {
                case CommonBase.ViewContext.Build:
                    contextId = testCaseResult.failingSince.build ? testCaseResult.failingSince.build.id : 0;
                    contextName = this._getFailingSinceBuildString(this._viewContext.data.mainData.id, testCaseResult);
                    break;
                case CommonBase.ViewContext.Release:
                    contextId = testCaseResult.failingSince.release ? testCaseResult.failingSince.release.id : 0;
                    contextName = this._getFailingSinceReleaseString(this._viewContext.data.mainData.id, testCaseResult);
                    break;
            }
        }

        let resultViewModel: ResultsGrid.IResultViewModel = {
            test: testCaseResult.testCaseTitle,
            testTitle: testCaseResult.automatedTestName,
            storage: testCaseResult.automatedTestStorage || Utils_String.empty,
            failingSince: testCaseResult.failingSince ? Utils_Date.ago(testCaseResult.failingSince.date) : Utils_String.empty,
            failingContextName: contextName,
            isNewFailure: testCaseResult.failingSince ? this._viewContext.data.mainData.id === testCaseResult.failingSince.build.id : false,
            runId: parseInt(testCaseResult.testRun.id),
            resultId: testCaseResult.id,
            testCaseRefId: testCaseResult.testCaseReferenceId,
            failingContextId: contextId,
            isTestCaseRow: true,
            outcome: Contracts.TestOutcome[testCaseResult.outcome],
            duration: (testCaseResult.durationInMs) ? TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForResultSummary(testCaseResult.durationInMs) : TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForResultSummary(0),
            dateStarted: (testCaseResult.startedDate) ? Utils_String.dateToString(testCaseResult.startedDate, true) : Utils_String.empty,
            dateCompleted: (testCaseResult.completedDate) ? Utils_String.dateToString(testCaseResult.completedDate, true) : Utils_String.empty,
            owner: (testCaseResult.owner) ? testCaseResult.owner.displayName : Resources.NotAvailable,
            environmentName: testCaseResult.releaseReference ? this._getEnvironmentNameFromId(testCaseResult.releaseReference.environmentId) : Utils_String.empty,
            isUnreliable: LicenseAndFeatureFlagUtils.isReportCustomizationFeatureEnabled() ? this._isTestUnreliable(testCaseResult.customFields) : false,
            resultState: TCMConstants.TestResultState[testCaseResult.state]
        };
        return resultViewModel;
    }

    public getTestResultsFieldValues(fieldName: string): string[] | IPromise<string[]> {
        if (fieldName === Common.FilterByFields.Outcome) {
            return this._getResultsFieldValuesForOutcomeFilter();
        }
        else {
            switch (this._viewContext.viewContext) {
                case CommonBase.ViewContext.Build:
                    return this._getResultsFieldValuesForBuild(this._viewContext.data, fieldName);
                case CommonBase.ViewContext.Release:
                    return this._getResultsFieldValuesForRelease(this._viewContext.data, fieldName);
            }
        }

        return [];
    }

    public populateInitialDataForFilters() {
        if (LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled() && !this._isFilterCachePopulated()) {
            this._populateDataSourceForFilters(this._batchedResultsPopulatedCallback);
        }
    }

    private _setInProgressBinding(viewContext: Common.IViewContextData, testQueryParam: DataProviderCommon.ITestsQueryParameters): IPromise<void> {
        if (!LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled()) {
            return new Promise<void>((resolve, reject) => {
                resolve();
            });
        }

        return new Promise<void>((resolve, reject) => {
            if (viewContext.viewContext === CommonBase.ViewContext.Build) {
                let build = testQueryParam.viewContextData.mainData;

                if (build.status === BuildContracts.BuildStatus.InProgress) {
                    this.shouldShowInProgressView(true);
                } else if (build.status === BuildContracts.BuildStatus.Completed) {
                    this.shouldShowInProgressView(false);
                }
                resolve();
            } else if (viewContext.viewContext === CommonBase.ViewContext.Release) {
                let release = testQueryParam.viewContextData.mainData;
                let filters = testQueryParam.viewContextData.subData;
                let selectedEnvironment = (filters && filters.environment) ? filters.environment : null;

                if (!selectedEnvironment || selectedEnvironment.id === 0) {
                    this._setInProgressBindingOnReleaseStatus(release).then(() => {
                        resolve();
                    }, (reason) => {
                        reject(reason);
                    });
                }
                else {
                    this._setInProgressBindingOnReleaseEnvironmentStatus(selectedEnvironment).then(() => {
                        resolve();
                    }, (reason) => {
                        reject(reason);
                    });
                }
            }
        });
    }

    private _setInProgressBindingOnReleaseEnvironmentStatus(selectedEnvironment: any): IPromise<void> {
        return new Promise<void>((resolve, reject) => {
            VSS.using(["ReleaseManagement/Core/Contracts", "ReleaseManagement/Core/Utils"], (RMContracts: typeof RMContracts_LAZY_LOAD, RMUtils: typeof RMUtils_LAZY_LOAD) => {
                if (selectedEnvironment.status === RMContracts.EnvironmentStatus.InProgress) {
                    this.shouldShowInProgressView(true);
                }
                else if (RMUtils.ReleaseEnvironmentStatusHelper.isEnvironmentCompleted(selectedEnvironment)) {
                    this.shouldShowInProgressView(false);
                }
                resolve();
            }, () => { reject("Failed to load release scripts"); });
        });
    }

    private _setInProgressBindingOnReleaseStatus(release: any): IPromise<void> {
        return new Promise<void>((resolve, reject) => {
            VSS.using(["TestManagement/Scripts/Utils/TFS.TestManagement.ReleaseStatusHelper"],
                (ReleaseHelper: typeof ReleaseHelper_LAZY_LOAD) => {
                    this.shouldShowInProgressView(ReleaseHelper.ReleaseStatusHelper.getComputedReleaseStatus(release) === ReleaseHelper.ComputedReleaseStatus.InProgress);
                    resolve();
                },
                () => {
                    reject("Failed to load release scripts");
                }
            );
        });
    }

    private _getResultsFieldValuesForOutcomeFilter(): string[] {
        let uniqueValues = [
            TestResultsOutcomeFilterPivots.Filter_By_Failed
        ];

        if (LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled()) {
            uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_Aborted);
        }

        if (!this.shouldShowInProgressView()) {
            uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_Passed);

            if (LicenseAndFeatureFlagUtils.isNewOutcomeFiltersForRerunEnabled()) {
                uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_PassedOnRerun);
            }
            uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_NotImpacted);
            uniqueValues.push(TestResultsOutcomeFilterPivots.Filter_By_Others);
        }

        return uniqueValues;
    }

    private _populateDataSourceForFilters(batchSuccessCallback: Function) {
        if (this._viewContext) {
            const shouldPopulateCacheForFilter: boolean = !this._isFilterCachePopulated() || this._resultDetailsFetchedCount < this._totalResultsCount;
            if (!this._populatingCache && shouldPopulateCacheForFilter) {
                const testQueryParam: DataProviderCommon.ITestsQueryParameters = DataProvider.getTestQueryParameter(this._viewContext.viewContext, this._viewContext.data, this._selectedGroupByOption);

                let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PopulateResultsCacheForFilter);
                scenario.addData({ "viewContext": this._viewContext.viewContext });
                scenario.addData({ "artifactId": this._viewContext.data.mainData.id });

                this._resultsLeftToFetchForTheCurrentBatch = ResultListViewModel._batchSizeForTestResultsFetch;
                this._populateCache(this._viewContext.viewContext, testQueryParam, this._continuationTokenForTestResults, batchSuccessCallback);
            }
        }
    }

    private _getResultsFieldValuesForBuild(data: Common.IData, fieldName: string): string[] | IPromise<string[]> {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_GetResultGroupsByBuild);
        scenario.addData({ "buildId": data.mainData.id });

        let deferred = q.defer<string[]>();
        let fields = [Common.FilterByFields.Container, Common.FilterByFields.Owner];
        let buildId: number = data.mainData.id;
        let cacheKey = this._getCacheKeyForBuild(buildId, fieldName);

        if (this._cachedUniqueValuesForBuild[cacheKey]) {
            return this._cachedUniqueValuesForBuild[cacheKey];
        }

        TcmService.ServiceManager.instance().testResultsService().getResultGroupsByBuildV1(buildId, DataProviderCommon.SourceWorkflow.BUILD_SOURCE_WORKFLOW, fields)
            .then((testResultsGroup: Contracts.TestResultsGroupsForBuild) => {
                scenario.end();

                if (testResultsGroup != null && testResultsGroup.fields != null) {
                    let fieldValuesForSelectedField: string[] = null;
                    testResultsGroup.fields.forEach((field: Contracts.FieldDetailsForTestResults) => {
                        let fieldValues = field.groupsForField as string[];
                        Utils_Array.sortIfNotSorted(fieldValues, Utils_String.localeIgnoreCaseComparer);
                        let buildDataFieldNameToString: string = this._getCacheKeyForBuild(buildId, field.fieldName);
                        this._cachedUniqueValuesForBuild[buildDataFieldNameToString] = fieldValues;

                        if (Utils_String.equals(field.fieldName, fieldName)) {
                            fieldValuesForSelectedField = fieldValues;
                        }
                    });

                    if (fieldValuesForSelectedField) {
                        deferred.resolve(fieldValuesForSelectedField);
                        return deferred.promise;
                    }
                }

                this._cachedUniqueValuesForBuild[cacheKey] = [];
                deferred.resolve([]);
            }, (error) => {
                scenario.abort();

                this._cachedUniqueValuesForBuild[cacheKey] = [];
                deferred.resolve([]);
            });

        return deferred.promise;
    }

    private _getResultsFieldValuesForRelease(data: Common.IData, fieldName: string): string[] | IPromise<string[]> {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInRelease_GetResultGroupsByRelease);
        scenario.addData({ "releaseId": data.mainData.id });

        let deferred = q.defer<string[]>();
        let fields = [Common.FilterByFields.Container, Common.FilterByFields.Owner];
        let releaseId: number = data.mainData.id;
        let releaseEnvId: number = (data.subData) ? data.subData.environment.id : 0;
        let cacheKey = this._getCacheKeyForRelease(releaseId, releaseEnvId, fieldName);

        if (this._cachedUniqueValuesForRelease[cacheKey]) {
            return this._cachedUniqueValuesForRelease[cacheKey];
        }

        TcmService.ServiceManager.instance().testResultsService().getResultGroupsByReleaseV1(releaseId, DataProviderCommon.SourceWorkflow.RELEASE_SOURCE_WORKFLOW, releaseEnvId, fields)
            .then((testResultsGroup: Contracts.TestResultsGroupsForRelease) => {
                scenario.end();

                if (testResultsGroup != null && testResultsGroup.fields != null) {
                    let fieldValuesForSelectedField: string[] = null;
                    testResultsGroup.fields.forEach((field: Contracts.FieldDetailsForTestResults) => {
                        let fieldValues = field.groupsForField as string[];
                        Utils_Array.sortIfNotSorted(fieldValues, Utils_String.localeIgnoreCaseComparer);
                        let releaseDataFieldNameToString: string = this._getCacheKeyForRelease(releaseId, releaseEnvId, field.fieldName);
                        this._cachedUniqueValuesForRelease[releaseDataFieldNameToString] = fieldValues;

                        if (Utils_String.equals(field.fieldName, fieldName)) {
                            fieldValuesForSelectedField = fieldValues;
                        }
                    });

                    if (fieldValuesForSelectedField) {
                        deferred.resolve(fieldValuesForSelectedField);
                        return deferred.promise;
                    }
                }

                this._cachedUniqueValuesForRelease[cacheKey] = [];
                deferred.resolve([]);
            }, (error) => {
                scenario.abort();

                //IF there are some errors we don't want to call multiple times
                this._cachedUniqueValuesForRelease[cacheKey] = [];
                deferred.resolve([]);
            });

        return deferred.promise;
    }

    private _getCacheKeyForBuild(buildId: number, fieldName: string): string {
        let buildDataToString: Utils_String.StringBuilder = new Utils_String.StringBuilder();

        buildDataToString.append(buildId.toString());
        buildDataToString.append(":");
        buildDataToString.append(fieldName);

        return buildDataToString.toString();
    }

    private _getCacheKeyForRelease(releaseId: number, releaseEnvId: number, fieldName: string): string {
        let buildDataToString: Utils_String.StringBuilder = new Utils_String.StringBuilder();

        buildDataToString.append(releaseId.toString());
        buildDataToString.append(":");
        buildDataToString.append(releaseEnvId.toString());
        buildDataToString.append(":");
        buildDataToString.append(fieldName);

        return buildDataToString.toString();
    }

    private _getEnvironmentNameFromId(envId: number): string {
        let environments = this._viewContext.data.mainData.environments ? this._viewContext.data.mainData.environments : null;

        if (environments) {
            for (let index = 0; index < environments.length; index++) {
                if (environments[index].id === envId) {
                    return environments[index].name;
                }
            }
        }
        return Utils_String.empty;
    }

    private _isTestUnreliable(customFields: Contracts.CustomTestField[]): boolean {

        if (customFields) {
            for (let index = 0; index < customFields.length; index++) {
                if (Utils_String.equals(customFields[index].fieldName, Common.Constants.OutcomeConfidenceField, true)) {
                    return parseFloat(customFields[index].value) === 0;
                }
            }
        }

        return false;
    }

    private _fillFieldsForSelectedColumnsFromUserSettings(fields: string[]) {
        let usersettingsSelectedColumns = ViewSettings.TestReportViewSettings.getInstance().getViewSettings().selectedColumns, failingSinceFieldInFieldsArray: boolean = false,
            failingSinceText: string = Common.TestResultsFieldConstants.getFieldNameMap(Resources.ResultGridHeader_FailingSince);
        usersettingsSelectedColumns.forEach((column) => {
            if (Utils_String.equals(column.columnName, Resources.ResultGridHeader_FailingBuild, true) || Utils_String.equals(column.columnName, Resources.ResultGridHeader_FailingSince, true) || Utils_String.equals(column.columnName, Resources.ResultGridHeader_FailingRelease, true)) {
                fields.forEach((field) => {
                    if (Utils_String.equals(field, failingSinceText, true)) {
                        failingSinceFieldInFieldsArray = true;
                    }
                });
                if (!failingSinceFieldInFieldsArray) {
                    fields.push(failingSinceText);
                }
            }
            else if (Utils_String.equals(column.columnName, Resources.ResultGridHeader_StageName, true)) {
                fields.push(Common.TestResultsFieldConstants.getFieldNameMap(column.columnName));
            }
            else {
                fields.push(Common.TestResultsFieldConstants.getFieldNameMap(column.columnName));
            }
        });
    }

    /// <summary>
    /// Reset the members variables.
    /// </summary>
    private _resetCache() {

        this._hierarchicalDatasource = {};
        this._idToTestResultMap = {};
        this._cachedFields = {};
        this._cachedGroupedTestResults = {};
        this._cachedGroupKeyToResultsForGroups = {};
        this._resultCache = {};
        this._populatingCache = false;
        this._resultDetailsFetchedCount = -1;
        this._totalResultsCount = -1;
        this._continuationTokenForTestResults = null;
        this._cachedUniqueValuesForBuild = {};
        this._cachedUniqueValuesForRelease = {};
        this._filterManager.resetCache();

        this.otherResultOutcomes = [];
        this.allResultOutcomes = [];
        this.resultsHavePassedOutcome = false;
        this.resultsHaveFailedOutcome = false;
        this.resultsHaveNotImpactedOutcome = false;
    }

    private _clearMessages(): void {
        if (this._messageViewModel) {
            this._messageViewModel.clear();
        }
        if (this._filterMessageViewModel) {
            this._filterMessageViewModel.clear();
        }
    }

    private _storeContextData(viewContextdata: Common.IViewContextData) {
        this._viewContext = viewContextdata;
    }

    /// <summary>
    /// Get the filter by option in OData format
    /// </summary>
    private _getSelectedOutcomeFilter(outcomeFilter: string): string {
        let ODataString: string = "Outcome eq {0}";

        switch (outcomeFilter) {
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Others:
                return Utils_String.format(ODataString, Common.TestResultConstants.OTHER_OUTCOME_LIST.join(","));
            case Common.TestResultsOutcomeFilterPivots.Filter_By_All:
                return null;
            default:
                return Utils_String.format(ODataString, outcomeFilter);
        }
    }

    /**
     * Get selected filter string for query parameter
     */
    private _getSelectedFilterString(): string {
        let filterString: string;
        if (LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled()) {
            filterString = CommonHelper.FilterHelper.generateFilterString(this._selectedFilterState);
        } else {
            filterString = this._getSelectedOutcomeFilter(this._selectedOutcomeFilterByOption);
        }
        return filterString;
    }

    private static _getOutcomeFilterString(outcomeFilter: string): string {
        switch (outcomeFilter) {
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Others:
                return Common.TestResultConstants.OTHER_OUTCOME_LIST.join(",");
            default:
                return outcomeFilter;
        }
    }

    private _getSortByFromUserSetting(): string {
        const viewSettingsInstance = ViewSettings.TestReportViewSettings.getInstance();
        const sortOrder: Grids.IGridSortOrder[] = viewSettingsInstance.getViewSettings().sortOrder;

        let sortBy: string = null;
        if (sortOrder && sortOrder[0]) {
            sortBy = Common.TestResultConstants.getTestResultPropertiesMap(sortOrder[0].index) + " " + sortOrder[0].order;
        }

        return sortBy;
    }

    /// <summary>
    /// Loads the data in grid for the selected group by and filter
    /// </summary>
    private _loadDataForSelectedGroupbyAndFilter(): void {

        //sortBy has to be persisted in user settings. Read it from user settings.
        this._sortByField = this._getSortByFromUserSetting();
        this.updateDataSource();
    }

    /// <summary>
    /// Loads the data in viewModel for a viewContext based on test query parameter
    /// </summary>
    private _loadData(viewContext: CommonBase.ViewContext, contextData: CommonBase.IData, groupBy: string, filterString: string, sortBy: string, searchText: string): void {

        if (LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled()) {
            let groupByField: string = groupBy ? groupBy : Utils_String.empty;
            let isGroupByNone: boolean = Utils_String.equals(Utils_String.empty, groupByField);
            let isGroupSummaryPopulated: boolean = this._cachedGroupKeyToResultsForGroups && this._cachedGroupKeyToResultsForGroups[groupByField]
                && this._cachedGroupKeyToResultsForGroups[groupByField].summaryLoaded;

            if (isGroupByNone || isGroupSummaryPopulated) {
                if (this._isFilterCachePopulated()) {
                    this._filterUsingClientSideCache(viewContext, contextData, groupByField, filterString, sortBy, searchText);
                } else {
                    this._populateDataSourceForFilters(this._batchedResultsPopulatedCallback);
                }
            }
            else {
                const isDefaultFilter: boolean = Utils_String.equals(filterString, CommonHelper.FilterHelper.generateFilterString(CommonHelper.FilterHelper.getInitialFilterState()));
                const isDefaultGroupBy: boolean = Utils_String.equals(groupBy, Common.TestResultsGroupPivots.Group_By_Test_Run);
                if (isDefaultFilter && isDefaultGroupBy) {
                    // For default filters(Failed + aborted) we want to use server side filtering

                    const testQueryParam: DataProviderCommon.ITestsQueryParameters = DataProvider.getTestQueryParameter(viewContext, contextData, groupBy, filterString);
                    this._fetchData(viewContext, testQueryParam).then((gridSource: Grids.IGridSource) => {
                        this._update(gridSource);
                        this._showFilterMessage(this._totalResultsCount, this._totalResultsCount, 0, false);
                    });
                } else {
                    this.populateInitialDataForFilters();
                    this._loadGroupSummary(viewContext, contextData, groupByField);
                }
            }
        } else {
            let cacheKey: string = ResultListViewModel._getHierarchicalDataSourceCacheKey(groupBy, filterString, sortBy, searchText);
            if (this._hierarchicalDatasource && this._hierarchicalDatasource[cacheKey]) {
                this._update(this._hierarchicalDatasource[cacheKey]);
            } else {
                Diag.logVerbose(Utils_String.format("[ResultsGridViewModel._loadData]: method called, Group: {0}, Filter: {1}", groupBy, filterString));
                let testQueryParam: DataProviderCommon.ITestsQueryParameters = DataProvider.getTestQueryParameter(viewContext, contextData, groupBy, filterString);
                this._fetchData(viewContext, testQueryParam).then((gridSource: Grids.IGridSource) => {
                    this._update(gridSource);
                });
            }
        }
    }

    private _isFilterCachePopulated(): boolean {
        return this._resultDetailsFetchedCount >= 0;
    }

    private _filterUsingClientSideCache(viewContext: CommonBase.ViewContext, contextData: CommonBase.IData, groupByField: string, filterString: string, sortBy: string, searchText: string) {
        let scenario: Performance.IScenarioDescriptor = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_FilteringUsingClientSideCache);
        scenario.addData({ "viewContext": viewContext });
        scenario.addData({ "artifactId": contextData.mainData.id });

        let groupedResults: Contracts.TestResultsDetails = this._cachedGroupedTestResults[groupByField];
        let filteredGroupResults: Contracts.TestResultsDetails = this._filterManager.filterGroupedResults(groupedResults, this._selectedFilterState);
        let gridSource: Grids.IGridSource = this._populateDatasource(filteredGroupResults, groupByField, filterString, sortBy, searchText);
        this._update(gridSource);

        let filterStatesCount = this._getFilterStateCountForTelemetry(this._selectedFilterState);
        ResultListViewModel._publishFilterTelemetry(viewContext, contextData, gridSource, filterStatesCount, false);

        let nextResultsToFetchCount: number = this._totalResultsCount - this._resultDetailsFetchedCount > ResultListViewModel._batchSizeForTestResultsFetch ?
            ResultListViewModel._batchSizeForTestResultsFetch : this._totalResultsCount - this._resultDetailsFetchedCount;
        this._showFilterMessage(this._resultDetailsFetchedCount, this._totalResultsCount, nextResultsToFetchCount, $.isEmptyObject(this._selectedFilterState));
        scenario.end();
    }

    private _loadGroupSummary(viewContext: CommonBase.ViewContext, contextData: CommonBase.IData, groupBy: string) {
        let testQueryParam: DataProviderCommon.ITestsQueryParameters;
        // Fetch all results if Group by Requirement or TestSuite as we don't have the Grouped Results
        const shouldFetchResultsForGroups: boolean = Utils_String.equals(groupBy, Common.TestResultsGroupPivots.Group_By_Requirement) || Utils_String.equals(groupBy, Common.TestResultsGroupPivots.Group_By_Test_Suite);
        if (shouldFetchResultsForGroups) {
            testQueryParam = DataProvider.getTestQueryParameter(viewContext, contextData, groupBy, null, null, true);
        } else {
            testQueryParam = DataProvider.getTestQueryParameter(viewContext, contextData, groupBy, null, null, false);
        }
        this._fetchData(viewContext, testQueryParam).then((gridSource) => {
            this.updateDataSource();
        });
    }

    private _showFilterMessage(filteredItems: number, totalItems: number, nextIncrement: number, filterCleared: boolean) {

        // Create the message info.
        const $msgInfoContainer = $(Utils_UI.domElem("div", "grid-message-area"));
        const filterMessage: string = Utils_String.format(filterCleared ? Resources.TestResultsFilterClearedMessage : Resources.TestResultsFilterMessage, filteredItems, totalItems);
        const $filterMessage = $("<span/>").text(Utils_String.format("{0} ", filterMessage));

        if (nextIncrement > 0) {
            const nextItemsMessage: string = Utils_String.format(filterCleared ? Resources.TestResultsFilterClearedNextItemsMessage : Resources.TestResultsFilterNextItemsMessage, nextIncrement);
            const $filterNextLink = $("<a/>").attr({
                "id": ResultListViewModel._showFilteredItemsLink,
                "role": "button",
                "href": "#"
            }).text(nextItemsMessage);
            $filterNextLink.appendTo($filterMessage);
            $filterNextLink.click(this._onLoadMoreFilterMessageClick);
        }

        $filterMessage.appendTo($msgInfoContainer);
        this._filterMessageViewModel.logInfoJQuery($msgInfoContainer);
    }

    private _onLoadMoreFilterMessageClick = (e: JQueryEventObject) => {
        if (e) {
            e.preventDefault();
        }

        this._populateDataSourceForFilters(this._batchedResultsPopulatedCallback);
        ResultListViewModel._publishPopulateCacheTelemetry(this._viewContext.viewContext, this._viewContext.data.mainData.id, this._resultDetailsFetchedCount, this._totalResultsCount);
    }

    private _batchedResultsPopulatedCallback = () => {
        // TODO: retain result selection
        if (!this.fetchingData()) {
            this.updateDataSource();
        }
    }

    /// <summary>
    /// The method fetches data from data provider for a test query
    /// </summary>
    private _fetchData(viewContext: CommonBase.ViewContext, testQueryParam: DataProviderCommon.ITestsQueryParameters): IPromise<Grids.IGridSource> {

        let deferred: Q.Deferred<Grids.IGridSource> = q.defer<Grids.IGridSource>();

        this.fetchingData(true);
        testQueryParam.isInProgress = this.shouldShowInProgressView();
        DataProvider.getDataProvider(viewContext)
            .then((dataProvider) => dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.TestResults))
            .then((groupedResults: Contracts.TestResultsDetails) => {
                // Return the grid source only if the current filter  string is equal to the one that we have fetched for
                this._populateGroupSummaryCache(groupedResults, this._fetchedAllResults(testQueryParam.filter, testQueryParam.includeResults));
                //We don't need to save the outcomes for every group-filter combination. Do it the first time only.
                if (this._totalResultsCount === -1) {
                    this._populateOutcomesForResults(groupedResults);
                    this._totalResultsCount = this._getTotalResultsCount(groupedResults);
                }

                let gridSource: Grids.IGridSource = this._populateDatasource(groupedResults, testQueryParam.groupBy, testQueryParam.filter, testQueryParam.sortBy);
                Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TestResultsInBuild_GetGroupByDetails);

                this.fetchingData(false);
                deferred.resolve(gridSource);
            })
            .then(undefined, (error) => {
                this.fetchingData(false);
                if (error && error.info) {
                    this._messageViewModel.logInfo(error.info);
                } else if (error && error.serverError && error.serverError.typeKey === "AccessDeniedException") {
                    this._messageViewModel.logInfoJQuery($("<span/>").html(Resources.ViewTestResultPermissionMessage));
                }
                else {
                    Diag.logWarning(Utils_String.format("[ResultsGridViewModel._fetchData]: method returned error: {0}", error));
                    this._messageViewModel.logError(Resources.TestResultsServerError);
                }
                Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInTestTab_WithResultDetails);
                Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PopulateResultsInGrid);

                deferred.reject(error);
            });
        return deferred.promise;
    }

    private _populateCache(viewContext: CommonBase.ViewContext, testQueryParam: DataProviderCommon.ITestsQueryParameters, continuationToken: string, batchedCallback: Function) {
        this._populatingCache = true;
        testQueryParam.viewContextData.payload = continuationToken;
        DataProvider.getDataProvider(viewContext)
            .then((dataProvider) => dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.TestResultDetailsWithContinuationToken))
            .then((resultsWithContinuationToken: ITestCaseResultsWithContinuationToken) => {

                if (resultsWithContinuationToken) {
                    let testcaseResults: Contracts.ShallowTestCaseResult[] = resultsWithContinuationToken.results;
                    if (testcaseResults) {
                        testcaseResults.forEach((result: Contracts.ShallowTestCaseResult) => {
                            this._filterManager.populateCache(result);
                            this._populateGroupedResults(result);
                        });
                    }
                    this._resultDetailsFetchedCount = this._resultDetailsFetchedCount < 0 ? 0 : this._resultDetailsFetchedCount;
                    this._resultDetailsFetchedCount += testcaseResults.length;
                    this._resultsLeftToFetchForTheCurrentBatch -= testcaseResults.length;

                    if (batchedCallback) {
                        batchedCallback();
                    }

                    let continuationToken: string = resultsWithContinuationToken.continuationToken;
                    if (continuationToken && this._resultsLeftToFetchForTheCurrentBatch) {
                        this._populateCache(viewContext, testQueryParam, continuationToken, batchedCallback);
                    } else {
                        this._populatingCache = false;

                        Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PopulateResultsCacheForFilter);
                    }
                    this._continuationTokenForTestResults = continuationToken;
                }
            })
            .then(undefined, (error) => {
                Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_PopulateResultsCacheForFilter);
                Diag.logError(Utils_String.format("failed to fetch paged test results. Error: {0}", (error.message || error)));
            });
    }

    // TODO: change the variable to be false by default to be consistent
    private _fetchedAllResults(filterString: string, includeResults: boolean = true) {
        return filterString == null && includeResults;
    }

    private _populateGroupedResults(result: Contracts.ShallowTestCaseResult) {
        this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_Container, result.automatedTestStorage, result);
        this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_Owner, result.owner, result);
        if (result.priority != null) {
            this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_Priority, result.priority.toString(), result);
        }
        if (result.runId != null) {
            this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_Test_Run, result.runId.toString(), result);
        }
        this._populateGroupedResultsForEachGroupBy(Common.TestResultsGroupPivots.Group_By_None, Utils_String.empty, result);
    }

    /**
     * This only populates the results for each group by using the paginated getResults api
     * @param groupByField
     * @param groupByValue
     * @param result
     */
    private _populateGroupedResultsForEachGroupBy(groupByField: string, groupByValue: string, result: Contracts.ShallowTestCaseResult) {
        if (!this._cachedGroupedTestResults.hasOwnProperty(groupByField)) {
            this._cachedGroupedTestResults[groupByField] = {
                groupByField: groupByField,
                resultsForGroup: []
            };
        }
        if (!this._cachedGroupKeyToResultsForGroups.hasOwnProperty(groupByField)) {
            this._cachedGroupKeyToResultsForGroups[groupByField] = {
                summaryLoaded: Utils_String.equals(Utils_String.empty, groupByField),
                groupSummaryData: {}
            };
        }
        let groupSummaryMap = this._cachedGroupKeyToResultsForGroups[groupByField].groupSummaryData;
        if (groupSummaryMap.hasOwnProperty(groupByValue)) {
            groupSummaryMap[groupByValue].results.push(CommonUtils.TCMContractsConverter.convertShallowTestResultToTestCaseResult(result));
        } else {
            let resultsForGroup: Contracts.TestResultsDetailsForGroup = null;
            if (groupByField === Common.TestResultsGroupPivots.Group_By_Test_Run) {
                resultsForGroup = {
                    groupByValue: {
                        id: groupByValue
                    },
                    results: [],
                    resultsCountByOutcome: []
                };
            } else {
                resultsForGroup = {
                    groupByValue: groupByValue,
                    results: [],
                    resultsCountByOutcome: []
                };
            }

            resultsForGroup.results.push(CommonUtils.TCMContractsConverter.convertShallowTestResultToTestCaseResult(result));
            this._cachedGroupedTestResults[groupByField].resultsForGroup.push(resultsForGroup);
            groupSummaryMap[groupByValue] = resultsForGroup;
        }
    }

    /**
     * This only populates the summary for each group by field using the group by api
     * @param groupedResults
     */
    private _populateGroupSummaryCache(groupedResults: Contracts.TestResultsDetails, allResultsLoaded: boolean) {

        if (!this._cachedGroupedTestResults.hasOwnProperty(groupedResults.groupByField)) {
            this._cachedGroupedTestResults[groupedResults.groupByField] = {
                groupByField: groupedResults.groupByField,
                resultsForGroup: []
            };
        }
        if (!this._cachedGroupKeyToResultsForGroups.hasOwnProperty(groupedResults.groupByField)) {
            this._cachedGroupKeyToResultsForGroups[groupedResults.groupByField] = {
                summaryLoaded: true,
                groupSummaryData: {}
            };
        } else {
            this._cachedGroupKeyToResultsForGroups[groupedResults.groupByField].summaryLoaded = true;
        }
        groupedResults.resultsForGroup.forEach((groupedResult: Contracts.TestResultsDetailsForGroup) => {
            let groupSummaryMap = this._cachedGroupKeyToResultsForGroups[groupedResults.groupByField].groupSummaryData;

            let groupById = this._getGroupByIdFromGroupedResults(groupedResults.groupByField, groupedResult);
            if (groupSummaryMap.hasOwnProperty(groupById)) {
                groupSummaryMap[groupById].groupByValue = groupedResult.groupByValue;
                groupSummaryMap[groupById].resultsCountByOutcome = groupedResult.resultsCountByOutcome;
                if (allResultsLoaded) {
                    groupSummaryMap[groupById].results = groupedResult.results;
                }
            } else {
                let resultsForGroup: Contracts.TestResultsDetailsForGroup = {
                    groupByValue: groupedResult.groupByValue,
                    results: allResultsLoaded ? groupedResult.results : [],
                    resultsCountByOutcome: groupedResult.resultsCountByOutcome
                };
                this._cachedGroupedTestResults[groupedResults.groupByField].resultsForGroup.push(resultsForGroup);
                groupSummaryMap[groupById] = resultsForGroup;
            }
        });
    }

    private _getGroupByIdFromGroupedResults(groupByField: string, groupedResult: Contracts.TestResultsDetailsForGroup): string {
        let groupById: string;
        switch (groupByField) {
            case Common.TestResultsGroupPivots.Group_By_Test_Run:
                let testRun = <Contracts.TestRun>groupedResult.groupByValue;
                groupById = testRun.id.toString();
                break;

            case Common.TestResultsGroupPivots.Group_By_Test_Suite:
                let testSuite = <Contracts.TestSuite>groupedResult.groupByValue;
                groupById = testSuite.id.toString();
                break;

            case Common.TestResultsGroupPivots.Group_By_Requirement:
                let workItem = <Contracts.WorkItemReference>groupedResult.groupByValue;
                let workItemId: number = parseInt(workItem.id);
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

    /// <summary>
    /// Updates the data source with test result details
    /// </summary>
    private _update(gridSource: Grids.IGridSource): void {
        this.dataSource(gridSource);

        // Check if the data source contains any value otherwise show no tests found.
        this.noTestResultsForTheFilters(this.dataSource().getSource() == null ||
            this.dataSource().getSource().length === 0);
        this.noTestResultsForTheFilters.valueHasMutated();
    }

    private static _getHierarchicalDataSourceCacheKey(groupby: string, filterby: string, sortby: string, searchText: string) {
        return Utils_String.format("{0}:{1}:{2}:{3}", groupby, filterby, sortby, searchText);
    }

    /// <summary>
    /// Returns the pivot value with passed header prepended.
    /// </summary>
    private _getPivotValueWithPassedHeader(groupedResult: Contracts.TestResultsDetailsForGroup, groupByField: string, groupByValue: string): IGroupValueData {
        let pivotValue: string;
        let totalTests: number = 0;
        let passedTests: number = 0;
        let notImpactedTests: number = 0;
        let totalMilliseconds: number = 0;
        let aggregatedPassedResult: Contracts.AggregatedResultsByOutcome;
        let aggregateNotImpactedResult: Contracts.AggregatedResultsByOutcome;

        for (let outcomeKey in groupedResult.resultsCountByOutcome) {
            totalTests += groupedResult.resultsCountByOutcome[outcomeKey].count;
            totalMilliseconds += CommonUtils.TestReportDataParser.getDurationInMilliseconds(groupedResult.resultsCountByOutcome[outcomeKey].duration);
        }

        aggregatedPassedResult = groupedResult.resultsCountByOutcome[Contracts.TestOutcome.Passed];
        if (aggregatedPassedResult) {
            passedTests = aggregatedPassedResult.count;
        }

        aggregateNotImpactedResult = groupedResult.resultsCountByOutcome[Contracts.TestOutcome.NotImpacted];
        if (aggregateNotImpactedResult) {
            notImpactedTests = aggregateNotImpactedResult.count;
        }

        // For Aborted Runs, {n/m Passed} will not be shown
        if (this._isRunStateAborted(groupedResult.groupByValue.state)
            && LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled()) {
            pivotValue = this._getPivotValue(groupByField, groupByValue);
        } else if (this._isRunStateInProgress(groupedResult.groupByValue.state)) {
            pivotValue = Utils_String.format(Resources.InProgressTestRunString, this._getPivotValue(groupByField, groupByValue));
        } else {
            pivotValue = Utils_String.format(Resources.TestResultsPassedNumberHeader,
                passedTests,
                totalTests,
                this._getPivotValue(groupByField, groupByValue));
        }

        let groupData: IGroupValueData = {
            header: pivotValue,
            groupDuration: TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForResultSummary(totalMilliseconds),
            passedCount: passedTests,
            notImpactedCount: notImpactedTests,
            totalCount: totalTests,
        };

        return groupData;
    }

    private static _publishFilterTelemetry(viewContext: CommonBase.ViewContext,
        contextData: CommonBase.IData,
        gridSource: Grids.IGridSource,
        filterStatesCount: IDictionaryStringTo<number>,
        isResultsCached: boolean
    ): void {
        try {
            let id = contextData.mainData.id;
            let expandedStates = gridSource.getExpandStates();
            let count = expandedStates ? expandedStates.length : 0;
            let sourceWorkflow: string = DataProviderCommon.SourceWorkflow.BUILD_SOURCE_WORKFLOW;

            switch (viewContext) {
                case CommonBase.ViewContext.Build:
                    sourceWorkflow = DataProviderCommon.SourceWorkflow.BUILD_SOURCE_WORKFLOW;
                    break;
                case CommonBase.ViewContext.Release:
                    sourceWorkflow = DataProviderCommon.SourceWorkflow.RELEASE_SOURCE_WORKFLOW;
                    break;
            }

            TelemetryService.publishEvents(TelemetryService.featureTestTab_Filter, {
                "Context": sourceWorkflow,
                "Id": id,
                "Filter": filterStatesCount,
                "ResultsCount": count,
                "IsResultsCached": isResultsCached
            });
        }
        catch (e) {
        }
    }

    private static _publishPopulateCacheTelemetry(viewContext: CommonBase.ViewContext,
        id: number,
        resultsFetchedCount: number,
        totalResultsCount: number
    ): void {
        try {

            let sourceWorkflow: string = DataProviderCommon.SourceWorkflow.BUILD_SOURCE_WORKFLOW;

            switch (viewContext) {
                case CommonBase.ViewContext.Build:
                    sourceWorkflow = DataProviderCommon.SourceWorkflow.BUILD_SOURCE_WORKFLOW;
                    break;
                case CommonBase.ViewContext.Release:
                    sourceWorkflow = DataProviderCommon.SourceWorkflow.RELEASE_SOURCE_WORKFLOW;
                    break;
            }

            TelemetryService.publishEvents(TelemetryService.featureTestTab_PopulateCacheForFilter, {
                "Context": sourceWorkflow,
                "id": id,
                "ResultsFetchedCount": resultsFetchedCount,
                "TotalResultsCount": totalResultsCount
            });
        }
        catch (e) {
        }
    }

    private _getFilterStateCountForTelemetry(filterState: IDictionaryStringTo<IFilter>): IDictionaryStringTo<number> {
        let filter: IDictionaryStringTo<number> = {};
        if (filterState != null) {
            for (let filterType in filterState) {
                filter[filterType] = filterState[filterType].values.length;
            }
        }

        return filter;
    }

    private _populateOutcomesForResults(groupedResults: Contracts.TestResultsDetails) {
        groupedResults.resultsForGroup.forEach((groupedResult: Contracts.TestResultsDetailsForGroup) => {
            for (let outcomeKey in groupedResult.resultsCountByOutcome) {
                if (parseInt(outcomeKey) === Contracts.TestOutcome.Passed) {
                    this.resultsHavePassedOutcome = true;
                }
                else if (parseInt(outcomeKey) === Contracts.TestOutcome.Failed) {
                    this.resultsHaveFailedOutcome = true;
                }
                else if (parseInt(outcomeKey) === Contracts.TestOutcome.NotImpacted) {
                    this.resultsHaveNotImpactedOutcome = true;
                }
                else {
                    this.otherResultOutcomes.push(outcomeKey);
                }

                this.allResultOutcomes.push(outcomeKey);
            }
        });

        Diag.logVerbose(Utils_String.format("[ResultsGridViewModel.getOutcomesForResults]: method called, PassedOutcome: {0}, FailedOutcome: {1}, NotImpactedOutcome: {2}, otherOutcomesLength",
            this.resultsHavePassedOutcome, this.resultsHaveFailedOutcome, this.resultsHaveNotImpactedOutcome, this.otherResultOutcomes.length));
    }

    private _getTotalResultsCount(groupedResults: Contracts.TestResultsDetails): number {
        let totalResultsCount: number = 0;
        groupedResults.resultsForGroup.forEach((groupedResult: Contracts.TestResultsDetailsForGroup) => {
            for (let outcomeKey in groupedResult.resultsCountByOutcome) {
                totalResultsCount += groupedResult.resultsCountByOutcome[outcomeKey].count;
            }
        });
        return totalResultsCount;
    }

    /// <summary>
    /// Populates data source based on pivot
    /// </summary>
    /// <param>
    /// pivot
    /// </param>
    private _populateDatasource(groupedResults: Contracts.TestResultsDetails, pivot: string, filter: string, sortby: string, searchText?: string): Grids.IGridSource {
        let cacheKey: string = ResultListViewModel._getHierarchicalDataSourceCacheKey(pivot, filter, sortby, searchText);
        let payloads: IDictionaryStringTo<any> = {};

        if (LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled() || !this._hierarchicalDatasource[cacheKey]) {

            //Group mappings from Id to Group properties
            let mapGroupIdToChildren: IDictionaryStringTo<IGridItem[]> = {};
            let mapGroupIdToState: IDictionaryStringTo<Common.GroupState> = {};
            let mapGroupIdToGroupName: IDictionaryStringTo<string> = {};

            let orderedGroupKeys: string[] = [];

            groupedResults.resultsForGroup.forEach((groupedResult: Contracts.TestResultsDetailsForGroup) => {

                let groupByValue: string;
                let groupById: string;
                switch (groupedResults.groupByField) {
                    case Common.TestResultsGroupPivots.Group_By_Test_Run:
                        let testRun = <Contracts.TestRun>groupedResult.groupByValue;
                        groupById = testRun.id.toString();
                        groupByValue = testRun.name;
                        payloads[groupById] = {};
                        break;

                    case Common.TestResultsGroupPivots.Group_By_Test_Suite:
                        let testSuite = <Contracts.TestSuite>groupedResult.groupByValue;
                        groupById = testSuite.id.toString();
                        groupByValue = (testSuite.id === 0) ? Utils_String.empty : testSuite.name;
                        payloads[groupById] = (testSuite.id !== 0) ? { suiteId: testSuite.id, suiteName: testSuite.name, planId: testSuite.plan ? testSuite.plan.id : Utils_String.empty } : {};
                        break;

                    case Common.TestResultsGroupPivots.Group_By_Requirement:
                        let workItem = <Contracts.WorkItemReference>groupedResult.groupByValue;
                        let workItemId: number = parseInt(workItem.id);
                        groupById = workItem.id;
                        groupByValue = (workItemId === 0) ? Utils_String.empty : workItem.name;
                        payloads[groupById] = (workItemId !== 0) ? workItem : {};
                        break;

                    case Common.TestResultsGroupPivots.Group_By_Container:
                    case Common.TestResultsGroupPivots.Group_By_Priority:
                    case Common.TestResultsGroupPivots.Group_By_None:
                    case Common.TestResultsGroupPivots.Group_By_Owner:
                        groupByValue = <string>groupedResult.groupByValue;
                        groupById = groupByValue;
                        payloads[groupById] = {};
                        break;
                }

                let groupValueData: IGroupValueData = this._getPivotValueWithPassedHeader(groupedResult, groupedResults.groupByField, groupByValue);
                let pivotValue: string = groupValueData.header;

                mapGroupIdToGroupName[groupById] = pivotValue;

                if (groupedResults.groupByField === Common.TestResultsGroupPivots.Group_By_Test_Run
                    && this._isRunStateAborted(groupedResult.groupByValue.state)
                    && LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled()) {
                    payloads[groupById].groupDuration = "";
                } else {
                    payloads[groupById].groupDuration = groupValueData.groupDuration;
                }

                if (groupedResults.groupByField === Common.TestResultsGroupPivots.Group_By_Test_Run
                    && groupedResult.groupByValue.state
                    && ValueMap.TestRunState.getStateToEnum(groupedResult.groupByValue.state) === ValueMap.TestRunState.InProgress) {
                    mapGroupIdToState[groupById] = Common.GroupState.InProgress;
                } else if (groupValueData.notImpactedCount === groupValueData.totalCount) {
                    mapGroupIdToState[groupById] = Common.GroupState.PartiallySucceeded;
                }
                else if (groupValueData.passedCount === 0) {
                    mapGroupIdToState[groupById] = Common.GroupState.Failed;
                }
                else if (groupValueData.passedCount === groupValueData.totalCount) {
                    mapGroupIdToState[groupById] = Common.GroupState.Passed;
                }
                else {
                    mapGroupIdToState[groupById] = Common.GroupState.PartiallySucceeded;
                }

                if (groupedResult.results && groupedResult.results.length > 0) {
                    mapGroupIdToChildren[groupById] = [];
                    groupedResult.results.forEach((result) => {
                        let value: IGridItem = {
                            runId: parseInt(result.testRun.id),
                            resultId: result.id,
                            testCaseRefId: result.testCaseReferenceId,
                            isTestCaseItem: true
                        };
                        mapGroupIdToChildren[groupById].push(value);
                    });
                    orderedGroupKeys.push(groupById);
                }

                if (LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled() && orderedGroupKeys.indexOf(groupById) < 0) {
                    if (groupedResult.groupByValue && this._isRunStateAborted(groupedResult.groupByValue.state)
                        && this._isOutcomeFilterAborted(filter)) {
                        mapGroupIdToChildren[groupById] = [];
                        orderedGroupKeys.push(groupById);
                    }
                }
            });

            let propertyValues: IGridItem[], gridSource: Grids.IGridSource;
            if (Utils_String.equals(Common.TestResultsGroupPivots.Group_By_None, pivot, true)) {
                let flatData: Grids.IGridSourceItem[] = [];

                for (let property in mapGroupIdToChildren) {
                    propertyValues = <IGridItem[]>mapGroupIdToChildren[property];
                    TMUtils.ArrayUtils.addRange(flatData, propertyValues);
                }

                gridSource = new Grids.GridDefaultSource(flatData);
            }
            else {
                let hierarchicalData: Grids.IGridHierarchyItem[] = [];
                let keys: string[] = [];
                let key: string;

                orderedGroupKeys.forEach((x: string) => {
                    keys.push(x);
                });

                for (key in keys) {
                    let children: IGridItem[] = [];
                    propertyValues = <IGridItem[]>mapGroupIdToChildren[keys[key]];
                    TMUtils.ArrayUtils.addRange(children, propertyValues);

                    let item: IGridItem = {
                        pivotValue: mapGroupIdToGroupName[keys[key]],
                        id: keys[key],
                        state: mapGroupIdToState[keys[key]],
                        children: children,
                        isTestCaseItem: false,
                        payload: payloads[keys[key]]
                    };

                    if (this._doesItemMeetsFilterCriteria(item)) {
                        hierarchicalData.push(item);
                    }
                }

                gridSource = new Grids.GridHierarchySource(hierarchicalData);
            }

            if (!LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled()) {
                this._hierarchicalDatasource[cacheKey] = gridSource;
            }
            return gridSource;
        }
        return this._hierarchicalDatasource[cacheKey];
    }

    private _isRunStateAborted(runState: string): boolean {
        if (!runState) {
            return false;
        } else {
            return runState === Common.TestResultsOutcomeFilterPivots.Filter_By_Aborted;
        }
    }

    private _isOutcomeFilterAborted(filter: string): boolean {
        if (!filter) {
            return false;
        } else {
            return filter.indexOf(Common.TestResultsOutcomeFilterPivots.Filter_By_Aborted) > 0;
        }
    }

    private _isRunStateInProgress(runState: string): boolean {
        if (!runState) {
            return false;
        } else {
            return ValueMap.TestResultState.getStateToEnum(runState) === ValueMap.TestResultState.InProgress;
        }
    }

    private _getPivotValue(pivot: string, pivotValue: string): string {
        Diag.logVerbose(Utils_String.format("[ResultsGridViewModel._getPivotValue]: method called, pivot: {0}", pivot));
        let displayPivotValue: string = Utils_String.empty;
        switch (pivot) {
            case Common.TestResultsGroupPivots.Group_By_Container:
                displayPivotValue = pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_Test_Run:
                displayPivotValue = pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_Requirement:
                displayPivotValue = Utils_String.equals(pivotValue, Utils_String.empty) ? Resources.NotAssociatedText : pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_Test_Suite:
                displayPivotValue = pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_Priority:
                displayPivotValue = Utils_String.equals("255", pivotValue) ? Utils_String.empty : Utils_String.format("{0}: {1}", Resources.PriorityText, pivotValue);
                break;
            case Common.TestResultsGroupPivots.Group_By_Owner:
                displayPivotValue = pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_None:
                displayPivotValue = Resources.AllText;
                break;
            default:
                Diag.logError(Utils_String.format("[ResultsGridViewModel._getPivotValue]: Unsupported pivot: {0}", pivot));
                break;
        }

        if (Utils_String.equals(displayPivotValue, Utils_String.empty)) {
            displayPivotValue = Resources.UnspecifiedText;
        }

        return displayPivotValue;
    }

    private _getFailingSinceBuildString(buildId: number, result: Contracts.TestCaseResult): string {
        let contextName: string = (buildId === result.failingSince.build.id) ? Resources.CurrentBuild : result.failingSince.build.number;
        return contextName;
    }

    private _getFailingSinceReleaseString(releaseId: number, result: Contracts.TestCaseResult): string {
        let contextName: string = (releaseId === result.failingSince.release.id) ? Resources.CurrentRelease : result.failingSince.release.name;
        return contextName;
    }

    // This method will evolve over time, right now implementing it just for VSCS ask
    private _doesItemMeetsFilterCriteria(item: IGridItem): boolean {
        let returnValue: boolean = true;

        let groupBySettingsCommand: string = ViewSettings.TestReportViewSettings.getInstance().getViewSettings().groupBySetting.command;
        let grouBySettingsValue: string = ViewSettings.TestReportViewSettings.getInstance().getViewSettings().groupBySetting.value;

        if (groupBySettingsCommand && grouBySettingsValue && (Utils_String.equals(this._selectedGroupByOption, Common.TestResultDetailsCommands.mapGroupByCommandToPivot[groupBySettingsCommand]))) {
            returnValue = Utils_String.equals(grouBySettingsValue, item.id);
        }

        return returnValue;
    }

    public dataSource: KnockoutObservable<Grids.IGridSource> = ko.observable(null);
    public noTestResultsForTheFilters: KnockoutObservable<boolean> = ko.observable(true);
    public fetchingData: KnockoutObservable<boolean> = ko.observable(false);
    public selectedTestCaseResult: KnockoutObservable<Contracts.TestCaseResult> = ko.observable(null);
    public shouldShowInProgressView: KnockoutObservable<boolean> = ko.observable(false);

    private _selectedGroupByOption: string = Common.TestResultDetailsCommands.mapGroupByCommandToPivot[ViewSettings.TestReportViewSettings.getInstance().getViewSettings().groupBySetting.command] || Common.TestResultsGroupPivots.Group_By_Test_Run;
    private _selectedOutcomeFilterByOption: string = Common.TestResultDetailsCommands.mapFilterByCommandToPivot[ViewSettings.TestReportViewSettings.getInstance().getViewSettings().filterBySetting.command] || Common.TestResultsOutcomeFilterPivots.Filter_By_Failed;
    private _selectedFilterState: FilterState = CommonHelper.FilterHelper.getInitialFilterState();
    private _sortByField: string;

    private _webSettingsService: TFS_WebSettingsService.WebSettingsService;
    private _messageViewModel: MessageArea.MessageAreaViewModel;
    private _filterMessageViewModel: MessageArea.MessageAreaViewModel;
    private _resultCache: IDictionaryStringTo<ResultsGrid.IResultViewModel> = {};
    private _cachedUniqueValuesForBuild: IDictionaryStringTo<string[]> = {};
    private _cachedUniqueValuesForRelease: IDictionaryStringTo<string[]> = {};

    //These members should be reset with every call load().
    public otherResultOutcomes: string[] = [];
    public allResultOutcomes: string[] = [];
    public resultsHavePassedOutcome: boolean;
    public resultsHaveFailedOutcome: boolean;
    public resultsHaveNotImpactedOutcome: boolean;
    public resultsHaveAbortedOutcome: boolean;
    public storeViewContextData: Common.IViewContextData;
    protected _viewContext: Common.IViewContextData;
    private _idToTestResultMap: IDictionaryStringTo<Contracts.TestCaseResult>;
    private _hierarchicalDatasource: IDictionaryStringTo<Grids.IGridSource>;
    private _cachedFields: IDictionaryStringTo<string[]>;

    private _resultDetailsFetchedCount: number = -1;
    private _totalResultsCount: number = -1;
    private _continuationTokenForTestResults: string = null;
    private _populatingCache: boolean = false;
    private _resultsLeftToFetchForTheCurrentBatch: number;

    private _cachedGroupedTestResults: IDictionaryStringTo<Contracts.TestResultsDetails>;
    private _cachedGroupKeyToResultsForGroups: IDictionaryStringTo<IGroupSummary>;
    private _filterManager: TestResultsFilteringManager;

    private static readonly _showFilteredItemsLink = "showFilteredItemsLinkId";
    private static readonly _batchSizeForTestResultsFetch = 100000;
}

