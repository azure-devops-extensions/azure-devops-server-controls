import * as Q from "q";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { Constants } from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";
import * as QueryRequirementHelper from "TestManagement/Scripts/Scenarios/TestTabExtension/Helpers/QueryWorkItemHelper";
import { DataProvider } from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import { TestCaseResultIdentifier, TestCaseResultIdentifierWithDuration } from "TestManagement/Scripts/TFS.TestManagement";
import TCM_Types = require("TestManagement/Scripts/TFS.TestManagement.Types");
import { ITestCaseResultsWithContinuationToken } from "TestManagement/Scripts/TFS.TestManagement.Types";
import { ServiceManager as TMServiceManager, ITestResultsService } from "TestManagement/Scripts/TFS.TestManagement.Service";
import * as TMService from "TestManagement/Scripts/TFS.TestManagement.Service";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export class TestResultSource {
    private static _testResultSource: TestResultSource;

    private constructor() {
        this._continuationTokenForTestResults = null;
        this._groupByFieldCache = {};
        this._actionCache = {};
        this._resultsFetchedForCurrentBatch = 0;
        this._fetchingResults = false;
    }

    public static getInstance(): TestResultSource {
        if (!TestResultSource._testResultSource) {
            TestResultSource._testResultSource = new TestResultSource();
        }

        return TestResultSource._testResultSource;
    }

    public resetCache() {
        this._continuationTokenForTestResults = null;
        this._groupByFieldCache = {};
        this._actionCache = {};
        this._detailedTestResultCache = {};
        this._resultsFetchedForCurrentBatch = 0;
        this._fetchingResults = false;
    }

    public getTestRunById(runId: number): IPromise<TCMContracts.TestRun> {
        let deferred: Q.Deferred<TCMContracts.TestRun> = Q.defer<TCMContracts.TestRun>();

        TMService.ServiceManager.instance().testResultsService().getTestRunById(runId).then(
            (testRun: TCMContracts.TestRun) => {
                deferred.resolve(testRun);
            },
            (error) => {
                deferred.reject(error);
            }
        );

        return deferred.promise;
    }

    public getTestReport(artifact: Common.IViewContextData): IPromise<TCMContracts.TestResultSummary> {
        const deferred = Q.defer<TCMContracts.TestResultSummary>();
        const testQueryParam = DataProvider.getTestQueryParameter(artifact.viewContext, artifact.data);

        DataProvider.getDataProvider(artifact.viewContext).then((dataProvider: DataProviderCommon.IDataProvider) => {
            dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.TestReport)
                .then((testReport: TCMContracts.TestResultSummary) => {
                    deferred.resolve(testReport);
                }, (error) => {
                    Diag.logWarning(error.message || JSON.stringify(error));
                    deferred.reject(error);
                });
        });

        return deferred.promise;
    }

    public getTestResultsByGroup(artifact: Common.IViewContextData, groupByField: string, filterString?: string, isInProgress?: boolean): IPromise<TCMContracts.TestResultsDetails> {
        if (!this._shouldFetchGroupedResults(groupByField) ||
            this._groupByFieldCache[groupByField]) {
            return new Promise((resolve, reject) => {
                const groupedResults: TCMContracts.TestResultsDetails = {
                    groupByField: groupByField,
                    resultsForGroup: []
                };
                resolve(groupedResults);
            });
        } else {
            return new Promise((resolve, reject) => {
                const testQueryParam = DataProvider.getTestQueryParameter(artifact.viewContext, artifact.data, groupByField, filterString, null, true, isInProgress);
                DataProvider.getDataProvider(artifact.viewContext).then(
                    (dataProvider: DataProviderCommon.IDataProvider) => {
                        dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.TestResults)
                            .then((testResults: TCMContracts.TestResultsDetails) => {
                                this._groupByFieldCache[groupByField] = true;
                                resolve(testResults);
                            },
                            (error) => {
                                reject(error);
                            });
                    });
            });
        }
    }

    public getTestResultsByQueryForGivenResultIdentifiers(results: TestCaseResultIdentifierWithDuration[]): IPromise<TCMContracts.TestResultsQuery> {
        const resultsQuery: TCMContracts.TestCaseResult[] = [];

        results.map(resultIdentifier => {
            resultsQuery.push(<TCMContracts.TestCaseResult>{ id: resultIdentifier.testResultId, testRun: <TCMContracts.ShallowReference>{ id: resultIdentifier.testRunId.toString() } });
        });

        return this._getTestResultsByQuery(resultsQuery);
    }

    public getSelectedTestCaseResult(artifact: Common.IViewContextData, runId: number, resultId: number): IPromise<TCMContracts.TestCaseResult> {

        let testCaseResultIdentifier = new TestCaseResultIdentifier(runId, resultId).toString();
        let deferred: Q.Deferred<TCMContracts.TestCaseResult> = Q.defer<TCMContracts.TestCaseResult>();

        if (this._detailedTestResultCache[testCaseResultIdentifier]) {
            deferred.resolve(this._detailedTestResultCache[testCaseResultIdentifier]);
        }
        else {
            DataProvider.getDataProvider(artifact.viewContext).then((dataProvider: DataProviderCommon.IDataProvider) => {
                dataProvider.getTestResultData(runId, resultId, TCMContracts.ResultDetails.SubResults)
                    .then((testcaseResults: TCMContracts.TestCaseResult) => {
                        this._detailedTestResultCache[testCaseResultIdentifier] = testcaseResults;
                        deferred.resolve(testcaseResults);
                    }, (error) => {
                        deferred.reject(error);
                    });
            }, (error) => {
                deferred.reject(error);
            });
        }

        return deferred.promise;
    }

    public getShallowTestResultDetails(artifact: Common.IViewContextData, action?: string): IPromise<TCMContracts.ShallowTestCaseResult[]> {
        if (!this._shouldFetchShallowResults(action)) {
            return new Promise<TCMContracts.ShallowTestCaseResult[]>((resolve, reject) => {
                if (this._resultsFetchedForCurrentBatch === Constants.batchResultsSize) {
                    this._resultsFetchedForCurrentBatch = 0;
                }
                const results: TCMContracts.ShallowTestCaseResult[] = [];
                resolve(results);
            });
        }

        // to prevent multiple calls on Load More Click
        this._fetchingResults = true;
        this._actionCache[action] = true;

        return new Promise<TCMContracts.ShallowTestCaseResult[]>((resolve, reject) => {
            const testQueryParam = DataProvider.getTestQueryParameter(artifact.viewContext, artifact.data);
            testQueryParam.viewContextData.payload = this._continuationTokenForTestResults;

            DataProvider.getDataProvider(artifact.viewContext).then((dataProvider: DataProviderCommon.IDataProvider) => {
                dataProvider.getViewContextData(testQueryParam,
                    DataProviderCommon.DataType.TestResultDetailsWithContinuationToken)
                    .then((resultsWithContinuationToken: ITestCaseResultsWithContinuationToken) => {
                        if (resultsWithContinuationToken) {
                            this._continuationTokenForTestResults = resultsWithContinuationToken.continuationToken;
                            this._resultsFetchedForCurrentBatch += resultsWithContinuationToken.results.length;
                            this._fetchingResults = false;
                            resolve(resultsWithContinuationToken.results);
                        } else {
                            reject(Resources.ResultsWithContinuationTokenNotFound);
                        }
                    }).then(undefined,
                    (error) => {
                        reject(error);
                    });
            });
        });
    }

    public getWorkItems(queryPattern: string, categoryType: QueryRequirementHelper.workItemCategoryType, onSuccess: (response: any) => void, onFailure?: (error?: any) => void) {
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        
        QueryRequirementHelper.QueryWorkItemHelper.getWorkItemsByIdAndTitle(
            queryPattern,
            tfsContext.contextData.project.name,
            categoryType,
            onSuccess,
            onFailure
        );
    }

	public getTestResultsFieldValues(viewContext: Common.IViewContextData, continuationToken?: string): IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken> {
		const deferred: Q.Deferred<TCM_Types.ITestResultsFieldDetailsWithContinuationToken> = Q.defer<TCM_Types.ITestResultsFieldDetailsWithContinuationToken>();
		const testQueryParam = DataProvider.getTestQueryParameter(viewContext.viewContext, viewContext.data);
		testQueryParam.viewContextData.payload = continuationToken;
		

        DataProvider.getDataProvider(viewContext.viewContext).then((dataProvider: DataProviderCommon.IDataProvider) => {
            dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.TestResultsFields)
				.then((resultGroupDetailsFields: TCM_Types.ITestResultsFieldDetailsWithContinuationToken) => {
                    deferred.resolve(resultGroupDetailsFields);
                }, (error) => {
                    deferred.reject(error);
                });
        });

        return deferred.promise;
    }

    // Fetch grouped results only in Group By TestRun, Requirement, TestSuite
    private _shouldFetchGroupedResults(groupByField: string) {
        return Utils_String.equals(groupByField, Common.TestResultsGroupPivots.Group_By_Test_Run)
            || Utils_String.equals(groupByField, Common.TestResultsGroupPivots.Group_By_Requirement)
            || Utils_String.equals(groupByField, Common.TestResultsGroupPivots.Group_By_Test_Suite);
    }

    private isGroupByNone(groupByField: string) {
        return Utils_String.equals(groupByField, Utils_String.empty);
    }

    private _shouldFetchShallowResults(action: string) {
        if (this._fetchingResults) {
            return false;
        }

        // For filter/groupBy changed only first time results should be fetched
        if (action === Constants.filterchangedAction
            || action === Constants.groupByChangedAction) {
            if (this._actionCache[Constants.filterchangedAction] ||
                this._actionCache[Constants.groupByChangedAction]) {
                return false;
            }
        }

        // If results fetched for current batch are there and continuation token null, then donot fetch
        // If all results for current batch has been fetched, donot fetch more
        if ((this._resultsFetchedForCurrentBatch > 0
            && !this._continuationTokenForTestResults)
            || this._resultsFetchedForCurrentBatch === Constants.batchResultsSize) {
            return false;
        } else {
            return true;
        }
    }

    private _getTestResultsByQuery(results: TCMContracts.TestCaseResult[]): IPromise<TCMContracts.TestResultsQuery> {
        let service: ITestResultsService = TMServiceManager.instance().testResultsService();
        
        const fields = [
            "Outcome",
            "TestCaseTitle",
            "AutomatedTestName",
            "AutomatedTestStorage",
            "TestResultGroupType"
        ];

        fields.push(Common.TestResultsFieldConstants.getFieldNameMap(Resources.ResultGridHeader_Duration));
        fields.push(Common.TestResultsFieldConstants.getFieldNameMap(Resources.ResultGridHeader_StageName));
        fields.push(Common.TestResultsFieldConstants.getFieldNameMap(Resources.ResultGridHeader_Owner));
        fields.push(Common.TestResultsFieldConstants.getFieldNameMap(Resources.ResultGridHeader_FailingSince));
        fields.push(Common.TestResultsFieldConstants.getFieldNameMap(Resources.ResultGridHeader_DateStarted));
        fields.push(Common.TestResultsFieldConstants.getFieldNameMap(Resources.ResultGridHeader_DateCompleted));

        if (LicenseAndFeatureFlagUtils.isReportCustomizationFeatureEnabled()) {
            fields.push(Common.Constants.OutcomeConfidenceField);
        }

        results = results.filter((currentResult, currentIndex, resultsList) => {
            return resultsList.indexOf(currentResult) === currentIndex;
        });

        const query = { results: results, fields: fields, resultsFilter: null };
        return service.getTestResultsByQuery(query);
    }

    private _detailedTestResultCache = {};
    private _continuationTokenForTestResults: string;
    private _groupByFieldCache: IDictionaryStringTo<boolean>;
    private _actionCache: IDictionaryStringTo<boolean>;
    private _resultsFetchedForCurrentBatch: number;
    private _fetchingResults: boolean;
}