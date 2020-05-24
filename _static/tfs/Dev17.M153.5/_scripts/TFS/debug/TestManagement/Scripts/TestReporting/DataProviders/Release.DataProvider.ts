

/**
 * @brief This file contains classes to fetch data related to Release sub-system
 */

import * as q from "q";

import { ReleaseEnvironmentStatusHelper } from "ReleaseManagement/Core/Utils";
import { ReleaseEnvironment, EnvironmentStatus } from "ReleaseManagement/Core/Contracts";

import Diag = require("VSS/Diag");

import * as Common from "TestManagement/Scripts/TestReporting/Common/Common";
import { FilterByFields } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import { DataProviderBase, ErrorStringMap } from "TestManagement/Scripts/TestReporting/DataProviders/Base.DataProvider";
import { ServiceManager as TMServiceManager, ITestResultsService } from "TestManagement/Scripts/TFS.TestManagement.Service";
import { ITestCaseResultsWithContinuationToken } from "TestManagement/Scripts/TFS.TestManagement.Types";
import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";

import { format as StringFormat, empty as EmptyString } from "VSS/Utils/String";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import TCM_Types = require("TestManagement/Scripts/TFS.TestManagement.Types");


export class ReleaseDataProvider extends DataProviderBase implements DataProviderCommon.IDataProvider {

    public constructor() {
        super();
        Diag.logVerbose("Release.DataProvider: Resetting TestReport cache");
    }
    
    // #region Public variables section

    /// <summary>
    /// Gets data for a specific build and a specific data type
    /// </summary>
    /// <param name='build'>build reference object</param>
    /// <param name='dataType'>type of data to be fetched</param>
    public getViewContextData(testsQueryParameters: DataProviderCommon.ITestsQueryParameters, dataType: DataProviderCommon.DataType): IPromise<any> {
        let promise: IPromise<any>;

        switch (dataType) {
            case DataProviderCommon.DataType.TestReport:
                promise = this._getTestReport(testsQueryParameters);
                break;
            case DataProviderCommon.DataType.TestResults:
                promise = this._getTestResultsByGroup(testsQueryParameters);
                break;
            case DataProviderCommon.DataType.TestResultDetailsWithContinuationToken:
                promise = this._getTestResultsWithContinuationToken(testsQueryParameters);
                break;
            case DataProviderCommon.DataType.ReleaseResultsTrend:
                promise = this._getReleaseResultsTrend(testsQueryParameters);
                break;
            case DataProviderCommon.DataType.TestResultsFields:
                 promise = this._getResultsFieldValuesForRelease(testsQueryParameters.viewContextData);
                 break;
            default:
                throw (StringFormat("Invalid/Unsupported data type: {0}", dataType));
        }
        return promise;
    }

    public populateTestResultWithContextData(result: TCMContracts.TestCaseResult, data: Common.IData) {        
        if (data && data.mainData) {
            result.releaseReference = <TCMContracts.ReleaseReference>{};
            result.releaseReference.definitionId = parseInt(data.mainData.releaseDefinition.id);
        }
    }

	private _getResultsFieldValuesForRelease(data: Common.IData): IPromise<TCM_Types.ITestResultsFieldDetailsWithContinuationToken> {
		let deferred: Q.Deferred<TCM_Types.ITestResultsFieldDetailsWithContinuationToken> = q.defer<TCM_Types.ITestResultsFieldDetailsWithContinuationToken>();
		let fields = [FilterByFields.Container, FilterByFields.Owner];
		let releaseId: number = data.mainData.id;
		let releaseEnvId: number = (data.subData) ? data.subData.environment.id : 0;
		let continuationToken = data.payload;

		TMServiceManager.instance().testResultsService().getResultGroupsByRelease(releaseId, DataProviderCommon.SourceWorkflow.RELEASE_SOURCE_WORKFLOW, releaseEnvId, fields, continuationToken).then((response: TCM_Types.ITestResultsFieldDetailsWithContinuationToken) => {
			deferred.resolve(response);
		}, (error) => {
			deferred.reject(error);
		});

		return deferred.promise;
	}

    private _getReleaseResultsTrend(testsQueryParameters: DataProviderCommon.ITestsQueryParameters): IPromise<TCMContracts.AggregatedDataForResultTrend[]> {
        let service = TMServiceManager.instance().testResultsService(),
            release = (testsQueryParameters.viewContextData.mainData) ? testsQueryParameters.viewContextData.mainData : null,
            filters = (testsQueryParameters.viewContextData.subData) ? testsQueryParameters.viewContextData.subData : null;

        let selectedEnvDefinitionId = (filters && filters.environment) ? filters.environment.definitionEnvironmentId : null;
        let testRunTitle = (filters && filters.testRunTitle) ? filters.testRunTitle : null;
        let trendCount: number = testsQueryParameters.viewContextData.payload;

        if (!release || !release.releaseDefinition) { return; }
        
        let filter: TCMContracts.TestResultTrendFilter = <TCMContracts.TestResultTrendFilter>{
            definitionIds: [release.releaseDefinition.id],
            publishContext: DataProviderCommon.SourceWorkflow.RELEASE_SOURCE_WORKFLOW,
            branchNames: null,
            testRunTitles: (testRunTitle) ? [testRunTitle] : null,
            envDefinitionIds: (selectedEnvDefinitionId) ? [selectedEnvDefinitionId] : null,
            buildCount: trendCount || Common.Constants.ReleaseTrendCount
        };

        return service.getReleaseResultsTrend(filter);
    }

    private _getTestReport(testsQueryParameters: DataProviderCommon.ITestsQueryParameters): IPromise<TCMContracts.TestResultSummary> {
        let deferred: Q.Deferred<TCMContracts.TestResultSummary> = q.defer<TCMContracts.TestResultSummary>(),
            release = testsQueryParameters.viewContextData.mainData,
            filters = (testsQueryParameters.viewContextData.subData) ? testsQueryParameters.viewContextData.subData : null,
            compareWithRelease = testsQueryParameters.viewContextData.compareWithData;

        let selectedEnvironment = (filters && filters.environment) ? filters.environment : null;
        this._releaseIdForTestReport = release.id;

        this._getTestReportPromise(release.id, selectedEnvironment, testsQueryParameters.sourceWorkflow, compareWithRelease)
            .then((report: TCMContracts.TestResultSummary) => {

                if (this._releaseIdForTestReport === release.id) {

                    const shouldShowTestReports: boolean = report.aggregatedResultsAnalysis.totalTests > 0 ||
                        (LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled() && this._areThereRunsByState(TCMContracts.TestRunState.Aborted, report)) ||
                        (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled() && this._areThereRunsByState(TCMContracts.TestRunState.InProgress, report));

                    if (shouldShowTestReports) {
                        deferred.resolve(report);
                    }
                    else {
                        deferred.reject({
                            errorCode: DataProviderCommon.DataProviderErrorCodes.NoTestResultsInScenario,
                            info: Resources.EnvironmentDoesNotHaveTestReports
                        });
                    }
                }
            }, (error) => {
                if (this._releaseIdForTestReport === release.id) {
                    deferred.reject({
                        errorCode: DataProviderCommon.DataProviderErrorCodes.ServerError,
                        info: ErrorStringMap.getUserStringForServerError(error)
                    });
                }
            });

        return deferred.promise;
    }

    private _areThereRunsByState(state: TCMContracts.TestRunState, report: TCMContracts.TestResultSummary) {
        return report.aggregatedResultsAnalysis.runSummaryByState &&
            report.aggregatedResultsAnalysis.runSummaryByState[state] &&
            report.aggregatedResultsAnalysis.runSummaryByState[state].runsCount > 0;
    }

    private _getTestResultsByGroup(testsQueryParameters: DataProviderCommon.ITestsQueryParameters): IPromise<TCMContracts.TestResultsDetails> {
        let deferred: Q.Deferred<TCMContracts.TestResultsDetails> = q.defer<TCMContracts.TestResultsDetails>(),
            release = testsQueryParameters.viewContextData.mainData,
            filters = (testsQueryParameters.viewContextData.subData) ? testsQueryParameters.viewContextData.subData : null,
            compareWithRelease = testsQueryParameters.viewContextData.compareWithData,
            service: ITestResultsService = TMServiceManager.instance().testResultsService();

        let selectedEnvironment = (filters && filters.environment) ? filters.environment : null;
        this._releaseIdForTestResults = release.id;

        service.getGroupedResultsByReleaseId(release.id, selectedEnvironment.id, testsQueryParameters.sourceWorkflow,
            testsQueryParameters.groupBy, testsQueryParameters.filter, testsQueryParameters.sortBy, testsQueryParameters.includeResults, testsQueryParameters.isInProgress)
            .then((groupedResults: TCMContracts.TestResultsDetails) => {
                if (release.id === this._releaseIdForTestResults) {
                    if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled() &&
                        groupedResults.resultsForGroup &&
                        groupedResults.resultsForGroup.length <= 0) {
                        deferred.reject({
                            errorCode: DataProviderCommon.DataProviderErrorCodes.NoTestResultsInScenario,
                            info: Resources.EnvironmentDoesNotHaveTestReports
                        });
                    }
                    else {
                        deferred.resolve(groupedResults);
                    }
                }
            },
            (error) => {
                if (release.id === this._releaseIdForTestResults) {
                    deferred.reject(ErrorStringMap.getUserStringForServerError(error));
                }
            });

        return deferred.promise;
    }

    private _getTestResultsWithContinuationToken(testsQueryParameters: DataProviderCommon.ITestsQueryParameters): IPromise<ITestCaseResultsWithContinuationToken> {
        let deferred: Q.Deferred<ITestCaseResultsWithContinuationToken> = q.defer<ITestCaseResultsWithContinuationToken>();
        let release = testsQueryParameters.viewContextData.mainData;
        let filters = (testsQueryParameters.viewContextData.subData) ? testsQueryParameters.viewContextData.subData : null,
            selectedEnvironmentId = (filters && filters.environment) ? filters.environment.id : null;

        let continuationToken: string = testsQueryParameters.viewContextData.payload;
        this._releaseIdForTestResults = release.id;

        TMServiceManager.instance().testResultsService().getTestResultsByReleaseWithContinuationToken(release.id, selectedEnvironmentId, testsQueryParameters.sourceWorkflow, null, continuationToken)
            .then((testCaseResultsWithContinuationToken: ITestCaseResultsWithContinuationToken) => {
                if (release.id === this._releaseIdForTestResults) {
                    deferred.resolve(testCaseResultsWithContinuationToken);
                }
            },
            (error) => {
                if (release.id === this._releaseIdForTestResults) {
                    deferred.reject(ErrorStringMap.getUserStringForServerError(error));
                }
            });

        return deferred.promise;
    }

    private _getTestReportPromise(releaseId: number, releaseEnvironment: ReleaseEnvironment, sourceWorkflow: string, compareWithRelease: any): IPromise<TCMContracts.TestResultSummary> {
        let service: ITestResultsService = TMServiceManager.instance().testResultsService();

        if (releaseEnvironment.id === 0) {
            return service.getTestReportForRelease(releaseId, releaseEnvironment.id, sourceWorkflow, true, compareWithRelease);
        } else if (releaseEnvironment.status === EnvironmentStatus.InProgress){
            return service.getTestReportForRelease(releaseId, releaseEnvironment.id, sourceWorkflow, false, compareWithRelease);
        }
        else if (ReleaseEnvironmentStatusHelper.isEnvironmentCompleted(releaseEnvironment) && releaseEnvironment.deploySteps && releaseEnvironment.deploySteps.length > 0) {
            let maxDeploymentAttempt: number = Math.max.apply(Math, releaseEnvironment.deploySteps.map(s => s.attempt));
            let cacheKey: string = `${releaseEnvironment.id}::${maxDeploymentAttempt}`;
            let cachedPromise: IPromise<TCMContracts.TestResultSummary> = this._testReportPromiseCache[cacheKey];
            
            let testReportPromise: IPromise<TCMContracts.TestResultSummary> = null;
            if (cachedPromise) {
                testReportPromise = cachedPromise;
            } else {
                Diag.logVerbose(`Release.DataProvider: TestReport cache miss for ReleaseEnvironment Id: ${releaseEnvironment.id} Attempt: ${maxDeploymentAttempt}`);
                testReportPromise = service.getTestReportForRelease(releaseId, releaseEnvironment.id, sourceWorkflow, true, compareWithRelease);
                this._testReportPromiseCache[cacheKey] = testReportPromise;
            }

            return testReportPromise;
        }
        else { // undefined or notStarted or queued or scheduled or canceled w/o attempts
            return q.resolve(this._getEmptyTestResultSummary()); 
        }
    }

    private _getEmptyTestResultSummary(): TCMContracts.TestResultSummary {
        let emptyTestResultSummary = <TCMContracts.TestResultSummary>{};
        emptyTestResultSummary.aggregatedResultsAnalysis = <TCMContracts.AggregatedResultsAnalysis> { totalTests: 0 };

        return emptyTestResultSummary;
    }

    private _testReportPromiseCache: IDictionaryStringTo<IPromise<TCMContracts.TestResultSummary>> = {};
    private _releaseIdForTestResults: number;
    private _releaseIdForTestReport: number;
}