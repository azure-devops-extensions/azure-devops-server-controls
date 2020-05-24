
/**
 * @brief This file contains classes to fetch data related to Build sub-system
 */

import * as q from "q";

import * as BuildContracts from "TFS/Build/Contracts";

import * as Common from "TestManagement/Scripts/TestReporting/Common/Common";
import { FilterByFields } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as TIAContracts from "TFS/TestImpact/Contracts";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { DataProviderBase } from "TestManagement/Scripts/TestReporting/DataProviders/Base.DataProvider";
import { ServiceManager as TMServiceManager, ITestResultsService } from "TestManagement/Scripts/TFS.TestManagement.Service";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";

import { format as StringFormat, empty as EmptyString } from "VSS/Utils/String";

import * as TMUtils from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { ITestCaseResultsWithContinuationToken, ITestResultsFieldDetailsWithContinuationToken } from "TestManagement/Scripts/TFS.TestManagement.Types";
import * as VssContext from "VSS/Context";
import Diag = require("VSS/Diag");

export class BuildDataProvider extends DataProviderBase implements DataProviderCommon.IDataProvider {

    public constructor() {
        super();
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
            case DataProviderCommon.DataType.CodeCoverageSummary:
                promise = this._getCodeCoverageSummary(testsQueryParameters.viewContextData.mainData);
                break;
            case DataProviderCommon.DataType.BuildCodeCoverage:
                promise = this._getBuildCodeCoverage(testsQueryParameters.viewContextData.mainData);
                break;
            case DataProviderCommon.DataType.Artifacts:
                promise = this._getBuildArtifacts(testsQueryParameters.viewContextData.mainData);
                break;
            case DataProviderCommon.DataType.BuildResultsTrend:
                promise = this._getBuildResultsTrend(testsQueryParameters.viewContextData.mainData, testsQueryParameters.viewContextData.subData, testsQueryParameters.viewContextData.payload);
                break;
            case DataProviderCommon.DataType.TestImpact:
                promise = this._getTIAEnabledInfo(testsQueryParameters.viewContextData.mainData);
                break;
            case DataProviderCommon.DataType.TestResultsFields:
                promise = this._getResultsFieldValuesForBuild(testsQueryParameters.viewContextData);
                break;
            default:
                throw (StringFormat("Invalid/Unsupported data type: {0}", dataType));
        }
        return promise;
    }

    public populateTestResultWithContextData(result: TCMContracts.TestCaseResult, data: Common.IData) {
        if (data && data.mainData) {
            result.buildReference = <TCMContracts.BuildReference>{};
            result.buildReference.definitionId = parseInt(data.mainData.definition.id);
        }
    }

	private _getResultsFieldValuesForBuild(data: Common.IData): IPromise<ITestResultsFieldDetailsWithContinuationToken> {
		let deferred: Q.Deferred<ITestResultsFieldDetailsWithContinuationToken> = q.defer<ITestResultsFieldDetailsWithContinuationToken>();
		let fields = [FilterByFields.Container, FilterByFields.Owner];
		let continuationToken = data.payload;

		TMServiceManager.instance().testResultsService().getResultGroupsByBuild(data.mainData.id, DataProviderCommon.SourceWorkflow.BUILD_SOURCE_WORKFLOW, fields, continuationToken).then(response => {
            deferred.resolve(response);
        }, (error) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    private _getTIAEnabledInfo(build: BuildContracts.Build): IPromise<boolean> {
        let deferred: Q.Deferred<boolean> = q.defer<boolean>();

        TMUtils.getTestImpactManager().beginGetTIAEnabledInfo(build.id).then(
            (tiaType: TIAContracts.BuildType) => {
                if (tiaType === TIAContracts.BuildType.TestImpactOn || tiaType === TIAContracts.BuildType.BaseLine) {
                    deferred.resolve(true);
                }
                else {
                    deferred.resolve(false);
                }
            });

        return deferred.promise;
    }

    private _getBuildResultsTrend(build: BuildContracts.Build, filters: any, buildCount: number): IPromise<TCMContracts.AggregatedDataForResultTrend[]> {
        let service = TMServiceManager.instance().testResultsService();
        let testRunTitle = (filters && filters.testRunTitle) ? filters.testRunTitle : null;
        let filter: TCMContracts.TestResultTrendFilter = <TCMContracts.TestResultTrendFilter>{
            definitionIds: [build.definition.id],
            publishContext: DataProviderCommon.SourceWorkflow.BUILD_SOURCE_WORKFLOW,
            branchNames: null,
            testRunTitles: (testRunTitle) ? [testRunTitle] : null,
            buildCount: buildCount || Common.Constants.BuildTrendCount
        };
        return service.getBuildResultsTrend(filter);
    }

    /// <summary>
    /// Fetches Test report data from the server
    /// </summary>
    /// <param name='build'>build reference object</param>    
    /// <return>promise for test report</return>
    private _getTestReport(testsQueryParameters: DataProviderCommon.ITestsQueryParameters): IPromise<TCMContracts.TestResultSummary> {
        let deferred: Q.Deferred<TCMContracts.TestResultSummary> = q.defer<TCMContracts.TestResultSummary>();
        let build: BuildContracts.Build = <BuildContracts.Build>testsQueryParameters.viewContextData.mainData;
        let service: ITestResultsService = TMServiceManager.instance().testResultsService();
		let isAbortedRunsEnabled = LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled();
		let isInProgressEnabled = LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled();

        if (build.status !== BuildContracts.BuildStatus.Completed) {
			if (isInProgressEnabled) {
                if (build.status !== BuildContracts.BuildStatus.InProgress) {
                    deferred.reject({
                        errorCode: DataProviderCommon.DataProviderErrorCodes.ScenarioNotCompleted,
                        info: Resources.NoTestsMessageWhileBuildInProgress
                    });
                    return deferred.promise;
                }
            } else {
                deferred.reject({
                    errorCode: DataProviderCommon.DataProviderErrorCodes.ScenarioNotCompleted,
                    info: Resources.BuildHasNotCompletedText
                });
                return deferred.promise;
            }
        }

        const includeFailureDetails: boolean = build.status === BuildContracts.BuildStatus.Completed;

        let buildReference: TCMContracts.BuildReference = {
            buildSystem: EmptyString,
            id: build.id,
            number: build.buildNumber,
            uri: build.uri,
            branchName: build.sourceBranch,
            definitionId: build.definition.id,
            repositoryId: EmptyString
        };

        this._buildIdForReport = build.id;

        service.getTestReportForBuild(build.id, testsQueryParameters.sourceWorkflow, includeFailureDetails, null).then(
            (report: TCMContracts.TestResultSummary) => {
                if (buildReference.id === this._buildIdForReport) {
                    const shouldShowTestReports: boolean = report.aggregatedResultsAnalysis.totalTests > 0 ||
                        this._areThereNotImpactedTests(report) ||
						(isAbortedRunsEnabled && this._areThereRunsByState(TCMContracts.TestRunState.Aborted, report)) ||
						(isInProgressEnabled && this._areThereRunsByState(TCMContracts.TestRunState.InProgress, report));

                    if (shouldShowTestReports) {
                        Diag.logVerbose("Tests are found for reporting.");
                        deferred.resolve(report);
                    }
                    // All other cases come here, for e.g. totalTests < 0
                    else {
                        Diag.logVerbose("No tests are found for reporting.");
                        let isXamlBuild = build.definition.type === BuildContracts.DefinitionType.Xaml;
                        let infoMessage = Resources.BuildDetailsSummaryNoTestRuns;
                        if (!build.controller && !isXamlBuild) {
                            infoMessage = Resources.BuildDoesNotHaveTestReports;
                        }
                        if (isInProgressEnabled && build.status === BuildContracts.BuildStatus.InProgress) {
                            infoMessage = Resources.NoTestsMessageWhileBuildInProgress;
                        }
                        if (build.deleted) {
                            infoMessage = Resources.BuildDeletedNoTestResults;
                        }

                        deferred.reject({
                            errorCode: DataProviderCommon.DataProviderErrorCodes.NoTestResultsInScenario,
                            info: infoMessage
                        });
                    }
                }
            },
            (error) => {
                if (buildReference.id === this._buildIdForReport) {
                    deferred.reject({
                        errorCode: DataProviderCommon.DataProviderErrorCodes.ServerError,
                        info: error
                    });
                }
            });

        return deferred.promise;
    }

    private _areThereNotImpactedTests(report: TCMContracts.TestResultSummary) {
        return report.aggregatedResultsAnalysis.resultsByOutcome &&
            report.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.NotImpacted] &&
            report.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.NotImpacted].count > 0;
    }

    private _areThereRunsByState(state: TCMContracts.TestRunState, report: TCMContracts.TestResultSummary) {
        return report.aggregatedResultsAnalysis.runSummaryByState &&
            report.aggregatedResultsAnalysis.runSummaryByState[state] &&
            report.aggregatedResultsAnalysis.runSummaryByState[state].runsCount > 0;
    }

    private _getTestResultsByGroup(testsQueryParameters: DataProviderCommon.ITestsQueryParameters): IPromise<TCMContracts.TestResultsDetails> {
        let deferred: Q.Deferred<TCMContracts.TestResultsDetails> = q.defer<TCMContracts.TestResultsDetails>();
        let build: BuildContracts.Build = testsQueryParameters.viewContextData.mainData;
        let service: ITestResultsService = TMServiceManager.instance().testResultsService();

        if (build.status !== BuildContracts.BuildStatus.Completed) {
            if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled()) {
                if (build.status !== BuildContracts.BuildStatus.InProgress
                    && build.status !== BuildContracts.BuildStatus.Cancelling) {
                    deferred.reject({
                        errorCode: DataProviderCommon.DataProviderErrorCodes.ScenarioNotCompleted,
                        info: Resources.NoTestsMessageWhileBuildInProgress
                    });
                    return deferred.promise;
                }
            } else {
                deferred.reject({ info: Resources.BuildHasNotCompletedText });
                return deferred.promise;
            }
        }

        this._buildIdForResults = build.id;

        service.getGroupedResultsByBuildId(build.id,
            testsQueryParameters.sourceWorkflow, testsQueryParameters.groupBy, testsQueryParameters.filter,
            testsQueryParameters.sortBy, testsQueryParameters.includeResults, testsQueryParameters.isInProgress)
            .then((groupedResults: TCMContracts.TestResultsDetails) => {
                if (build.id === this._buildIdForResults) {
                    if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled() &&
                        groupedResults.resultsForGroup &&
                        groupedResults.resultsForGroup.length <= 0) {
                        deferred.reject({ info: Resources.NoTestsMessageWhileBuildInProgress });
                    }
                    else {
                        deferred.resolve(groupedResults);
                    }
                }
            },
            (error) => {
                if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled() && build.status === BuildContracts.BuildStatus.InProgress) {
                    deferred.reject({ info: Resources.NoTestsMessageWhileBuildInProgress });
                } else if (build.id === this._buildIdForResults) {
                    deferred.reject(error);
                }
            });

        return deferred.promise;
    }

    private _getTestResultsWithContinuationToken(testsQueryParameters: DataProviderCommon.ITestsQueryParameters): IPromise<ITestCaseResultsWithContinuationToken> {
        let deferred: Q.Deferred<ITestCaseResultsWithContinuationToken> = q.defer<ITestCaseResultsWithContinuationToken>();
        let build: BuildContracts.Build = testsQueryParameters.viewContextData.mainData;
        let continuationToken: string = testsQueryParameters.viewContextData.payload;

        if (build.status !== BuildContracts.BuildStatus.Completed) {
            if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled()) {
                if (build.status !== BuildContracts.BuildStatus.InProgress) {
                    deferred.reject({
                        errorCode: DataProviderCommon.DataProviderErrorCodes.ScenarioNotCompleted,
                        info: Resources.NoTestsMessageWhileBuildInProgress
                    });
                    return deferred.promise;
                }
            } else {
                deferred.reject({ info: Resources.BuildHasNotCompletedText });
                return deferred.promise;
            }
        }

        this._buildIdForResults = build.id;
        TMServiceManager.instance().testResultsService().getTestResultsByBuildWithContinuationToken(build.id, testsQueryParameters.sourceWorkflow, null, continuationToken)
            .then((testCaseResultsWithContinuationToken: ITestCaseResultsWithContinuationToken) => {
                if (build.id === this._buildIdForResults) {
                    deferred.resolve(testCaseResultsWithContinuationToken);
                }
            },
            (error) => {
                if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled() && build.status === BuildContracts.BuildStatus.InProgress) {
                    deferred.reject({ info: Resources.NoTestsMessageWhileBuildInProgress });
                } else if (build.id === this._buildIdForResults) {
                    deferred.reject(error);
                }
            });

        return deferred.promise;
    }

    private _getCodeCoverageSummary(build: BuildContracts.Build): IPromise<TCMContracts.CodeCoverageSummary> {

        let deferred: Q.Deferred<TCMContracts.CodeCoverageSummary> = q.defer<TCMContracts.CodeCoverageSummary>();
        if (build.status !== BuildContracts.BuildStatus.Completed) {
            deferred.reject({ info: Resources.BuildHasNotCompletedTextForCodeCoverage, buildInProgress: true });
            return deferred.promise;
        }

        let buildReference: TCMContracts.BuildReference = {
            buildSystem: EmptyString,
            id: build.id,
            number: build.buildNumber,
            uri: build.uri,
            branchName: build.sourceBranch,
            definitionId: build.definition.id,
            repositoryId: EmptyString
        };

        this._buildIdForCodeCoverage = build.id;

        TMUtils.getCodeCoverageManager().beginGetCodeCoverageSummary(buildReference.id).then(
            (codeCoverageSummary: TCMContracts.CodeCoverageSummary) => {
                if (buildReference.id === this._buildIdForCodeCoverage) {
                    if (codeCoverageSummary && codeCoverageSummary.coverageData && codeCoverageSummary.coverageData.length > 0) {
                        // Promise resolved
                        deferred.resolve(codeCoverageSummary);
                    }
                    else {
                        let infoMessage = Resources.BuildDetailsSummaryNoCodeCoverageNoLink;
                        if (!build.controller) {
                            infoMessage = infoMessage + " " + Resources.BuildDetailsSummaryNoCodeCoverageLink;
                        }

                        // Promise rejected
                        deferred.reject({
                            info: infoMessage
                        });
                    }
                }
            },
            (error) => {
                if (buildReference.id === this._buildIdForCodeCoverage) {
                    deferred.reject(error);
                }
            });

        return deferred.promise;
    }

    private _getBuildCodeCoverage(build: BuildContracts.Build): IPromise<TCMContracts.BuildCoverage[]> {

        let deferred: Q.Deferred<TCMContracts.BuildCoverage[]> = q.defer<TCMContracts.BuildCoverage[]>();
        if (build.status !== BuildContracts.BuildStatus.Completed) {
            deferred.reject({ info: Resources.BuildHasNotCompletedTextForCodeCoverage, buildInProgress: true });
            return deferred.promise;
        }

        let buildReference: TCMContracts.BuildReference = {
            buildSystem: EmptyString,
            id: build.id,
            number: build.buildNumber,
            uri: build.uri,
            branchName: build.sourceBranch,
            definitionId: build.definition.id,
            repositoryId: EmptyString
        };

        this._buildIdForCodeCoverage = build.id;

        TMUtils.getCodeCoverageManager().beginGetBuildCodeCoverage(buildReference.id).then(
            (buildCoverage: TCMContracts.BuildCoverage[]) => {
                if (buildReference.id === this._buildIdForCodeCoverage) {
                    if (buildCoverage && buildCoverage.length > 0) {
                        // Promise resolved
                        deferred.resolve(buildCoverage);
                    }
                    else {
                        //no build code coverage available associated with build
                        let infoMessage = Resources.BuildDetailsSummaryNoCodeCoverageToDisplay;

                        //message for xaml
                        if (build.controller) {
                            infoMessage = Resources.BuildDetailsSummaryNoCodeCoverageNoLink + " " + Resources.BuildDetailsSummaryNoCodeCoverageLink;
                        }

                        // Promise rejected
                        deferred.reject({
                            info: infoMessage
                        });
                    }
                }
            },
            (error) => {
                if (buildReference.id === this._buildIdForCodeCoverage) {
                    deferred.reject(error);
                }
            });

        return deferred.promise;
    }

    private _getBuildArtifacts(build: BuildContracts.Build): IPromise<BuildContracts.BuildArtifact[]> {

        let deferred: Q.Deferred<BuildContracts.BuildArtifact[]> = q.defer<BuildContracts.BuildArtifact[]>();

        let buildReference: TCMContracts.BuildReference = {
            buildSystem: EmptyString,
            id: build.id,
            number: build.buildNumber,
            uri: build.uri,
            branchName: build.sourceBranch,
            definitionId: build.definition.id,
            repositoryId: EmptyString
        };

        TMUtils.getBuildManager().beginGetBuildArtifacts(buildReference.id).then(
            (buildArtifacts: BuildContracts.BuildArtifact[]) => {
                deferred.resolve(buildArtifacts);
            }
        ),
            (error) => {
                if (buildReference.id === this._buildIdForCodeCoverage) {
                    deferred.reject(error);
                }
            };

        return deferred.promise;
    }

    private _buildIdForResults: number;
    private _buildIdForReport: number;
    private _buildIdForRun: number;
    private _buildIdForCodeCoverage: number;
}