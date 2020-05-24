import q = require("q");

import BuildClient = require("TFS/Build/RestClient");
import BuildContracts = require("TFS/Build/Contracts");

import GitClient = require("TFS/VersionControl/GitRestClient");
import TfvcClient = require("TFS/VersionControl/TfvcRestClient");
import VCContracts = require("TFS/VersionControl/Contracts");

import Client = require("TFS/TestManagement/RestClient");
import Contracts = require("TFS/TestManagement/Contracts");
import { TestManagementHttpClient } from "TestManagement/Scripts/TFS.TestManagement.WebApi";
import { TcmHttpClientWrapper as TcmHttpClient } from "TestManagement/Scripts/HttpClientWrappers/TcmHttpClientWrapper";
import { TestResultsHttpClientWrapper as TestResultsHttpClient } from "TestManagement/Scripts/HttpClientWrappers/TestResultsHttpClientWrapper";
import TCM_Types = require("TestManagement/Scripts/TFS.TestManagement.Types");
import TMOM = require("TestManagement/Scripts/TFS.TestManagement");
import { ITestCaseResultsWithContinuationToken, ITestResultsFieldDetailsWithContinuationToken } from "TestManagement/Scripts/TFS.TestManagement.Types";
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Service = require("VSS/Service");
import VSS = require("VSS/VSS");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import VssContext = require("VSS/Context");


export interface ITestResultsService {

    getTestResults(runId: number, detailsToInclude?: Contracts.ResultDetails, skip?: number, top?: number, outcomes?: Contracts.TestOutcome[]): IPromise<Contracts.TestCaseResult[]>;

    getTestRunById(runId: number): IPromise<Contracts.TestRun>;

    getTestReportForBuild(buildId: number, sourceWorkflow: string, includeFailureDetails?: boolean, buildToCompare?: Contracts.BuildReference): IPromise<Contracts.TestResultSummary>;

    getGroupedResultsByBuildId(buildId: number, sourceWorkflow: string, groupBy: string, filter: string, sortby: string, shouldIncludeResults: boolean, queryRunSummaryForInProgress: boolean): IPromise<Contracts.TestResultsDetails>;

    getResultById(runId: number, resultId: number, detailsToInclude?: Contracts.ResultDetails): IPromise<Contracts.TestCaseResult>;

    getTestResultsByQuery(query: Contracts.TestResultsQuery): IPromise<Contracts.TestResultsQuery>;

    getRecentBugs(automatedTestName?: string, testCaseId?: number, recentDays?: number): IPromise<Contracts.WorkItemReference[]>;

    getAssociatedBugs(runId: number, resultId: number): IPromise<Contracts.WorkItemReference[]>;

    getBuildResultsTrend(filer: Contracts.TestResultTrendFilter): IPromise<Contracts.AggregatedDataForResultTrend[]>;

    getReleaseResultsTrend(filer: Contracts.TestResultTrendFilter): IPromise<Contracts.AggregatedDataForResultTrend[]>;

    getTestReportForRelease(releaseId: number, releaseEnvId: number, sourceWorkflow: string, includeFailureDetails?: boolean, releaseToCompare?: Contracts.ReleaseReference): IPromise<Contracts.TestResultSummary>;

    getGroupedResultsByReleaseId(releaseId: number, releaseEnvId: number, sourceWorkflow: string, groupBy: string, filter: string, sortby: string, shouldIncludeResults: boolean, queryRunSummaryForInProgress: boolean): IPromise<Contracts.TestResultsDetails>;

    getGroupedResultHistory(filter: Contracts.ResultsFilter): IPromise<Contracts.TestResultHistory>;

    getTestMethodLinkedWorkItems(testName: string): IPromise<Contracts.TestToWorkItemLinks>;

    addWorkItemToTestLinks(workItemToTestLinks: Contracts.WorkItemToTestLinks): IPromise<Contracts.WorkItemToTestLinks>;

    deleteTestMethodToWorkItemLink(testName: string, workItemId: number): IPromise<boolean>;

    getTestSummaryByRequirements(resultsContext: Contracts.TestResultsContext, workItemIds: number[]): IPromise<Contracts.TestSummaryForWorkItem[]>;

    getResultGroupsByBuild(buildId: number, publishContext: string, fields?: string[], continuationToekn?: string): IPromise<ITestResultsFieldDetailsWithContinuationToken>;

    getResultGroupsByRelease(releaseId: number, publishContext: string, releaseEnvId?: number, fields?: string[], continuationToken?: string): IPromise<ITestResultsFieldDetailsWithContinuationToken>;

    getResultGroupsByBuildV1(buildId: number, publishContext: string, fields?: string[]): IPromise<Contracts.TestResultsGroupsForBuild>;

    getResultGroupsByReleaseV1(releaseId: number, publishContext: string, releaseEnvId?: number, fields?: string[]): IPromise<Contracts.TestResultsGroupsForRelease>;

    getResultRetentionSettings(): IPromise<Contracts.ResultRetentionSettings>;

    updateResultRetentionSettings(resultRetentionSettings: Contracts.ResultRetentionSettings): IPromise<Contracts.ResultRetentionSettings>;

    getTestResultsByBuildWithContinuationToken(buildId: number, publishContext?: string, top?: number, continuationToken?: string): IPromise<ITestCaseResultsWithContinuationToken>;

    getTestResultsByReleaseWithContinuationToken(releaseId: number, releaseEnvironmentId: number, publishContext?: string, top?: number, continuationToken?: string): IPromise<ITestCaseResultsWithContinuationToken>;

    queryTestHistory(filter: Contracts.TestHistoryQuery): IPromise<Contracts.TestHistoryQuery>;
}

export interface ITestPlanningService {

    getPoints(planId: number, suiteId: number, witFields?: string, configurationId?: string, testCaseId?: string, testPointIds?: string, includePointDetails?: boolean, skip?: number, top?: number): IPromise<Contracts.TestPoint[]>;

    updateTestPlan(planUpdateModel: Contracts.PlanUpdateModel, planId: number): IPromise<Contracts.TestPlan>;

    getAllTestPlans(): IPromise<Contracts.TestPlan[]>;

    getTestSuitesForPlan(planId: number, asTreeView?: boolean): IPromise<Contracts.TestSuite[]>;
}

export interface IBuildService {

    getBuild(buildId: number): IPromise<BuildContracts.Build>;
}

export interface IBuildService2 {

    getDefinition(definitionId: number): IPromise<BuildContracts.BuildDefinition>;
}

export interface IBuildService3 {

    getPullRequest(project: string, providerName: string, pullRequestId: string, repositoryId?: string, serviceEndpointId?: string): IPromise<BuildContracts.PullRequest>;
}

export interface IGitService {
    getRefs(repositoryId: string): IPromise<VCContracts.GitRef[]>;
    getItems(repositoryId: string, versionDescriptor?: VCContracts.GitVersionDescriptor): IPromise<VCContracts.GitItem[]>;
    
    // here sha1 is SHA1 hash of the tree object. This can be get using the "Git/Items/Get Item" endpoint for a branch.
    getTree(repositoryId: string, sha1: string): IPromise<VCContracts.GitTreeRef>;
}

export interface ITfvcService {
    getBranches(projectName: string): IPromise<VCContracts.TfvcBranch[]>;
    
    // scopePath = branch name
    getItems(projectName: string, scopePath: string): IPromise<VCContracts.TfvcItem[]>;
}

export class BaseService<T extends VSS_WebApi.VssHttpClient> extends Service.VssService {

    public initializeConnection(tfsConnection: Service.VssConnection) {
        super.initializeConnection(tfsConnection);
        this._httpClient = this.getHttpClient(tfsConnection);
    }

    protected getHttpClient(tfsConnection: Service.VssConnection): T {
        throw new Error("This method should be implemented in derived class");
    }

    protected getProjectName(): string {
        return this.getWebContext().project.name;
    }

    protected _httpClient: T;
}

export class TestManagementLegacyService extends BaseService<TestManagementHttpClient> implements ITestResultsService, ITestPlanningService {

    public getHttpClient(tfsConnection: Service.VssConnection): TestManagementHttpClient {
        return tfsConnection.getHttpClient<TestManagementHttpClient>(TestManagementHttpClient);
    }

    public getTestRunById(runId: number): IPromise<Contracts.TestRun> {
        return this._httpClient.getTestRunById(this.getProjectName(), runId);
    }

    public getTestResults(runId: number, detailsToInclude?: Contracts.ResultDetails, skip?: number, top?: number, outcomes?: Contracts.TestOutcome[]): IPromise<Contracts.TestCaseResult[]> {
        return this._httpClient.getTestResults(this.getProjectName(), runId, detailsToInclude, skip, top, outcomes);
    }

    public getResultRetentionSettings(): IPromise<Contracts.ResultRetentionSettings> {
        return this._httpClient.getResultRetentionSettings(this.getProjectName());
    }

    public updateResultRetentionSettings(resultRetentionSettings: Contracts.ResultRetentionSettings): IPromise<Contracts.ResultRetentionSettings> {
        return this._httpClient.updateResultRetentionSettings(resultRetentionSettings, this.getProjectName());
    }

    public getTestReportForBuild(buildId: number, sourceWorkflow: string, includeFailureDetails?: boolean, buildToCompare?: Contracts.BuildReference): IPromise<Contracts.TestResultSummary> {
        return this._httpClient.queryTestResultsReportForBuild(this.getProjectName(),
            buildId,
            sourceWorkflow,
            includeFailureDetails,
            buildToCompare);
    }

    public getGroupedResultsByBuildId(buildId: number, sourceWorkflow: string, groupBy: string, filter: string, sortBy: string, shouldIncludeResults: boolean, queryRunSummaryForInProgress: boolean): IPromise<Contracts.TestResultsDetails> {
        return this._httpClient.getTestResultDetailsForBuild(
            this.getProjectName(),
            buildId,
            sourceWorkflow,
            groupBy,
            filter,
            sortBy,
            shouldIncludeResults,
            queryRunSummaryForInProgress
        );
    }

    public getResultById(runId: number, resultId: number, detailsToInclude?: Contracts.ResultDetails): IPromise<Contracts.TestCaseResult> {
        return this._httpClient.getTestResultById(
            this.getProjectName(),
            runId,
            resultId,
            (detailsToInclude) ? detailsToInclude : Contracts.ResultDetails.None);
    }

    public getPoints(planId: number, suiteId: number, witFields?: string, configurationId?: string, testCaseId?: string, testPointIds?: string, includePointDetails?: boolean, skip?: number, top?: number): IPromise<Contracts.TestPoint[]> {
        return this._httpClient.getPoints(
            this.getProjectName(),
            planId,
            suiteId,
            witFields,
            configurationId,
            testCaseId,
            testPointIds,
            includePointDetails,
            skip,
            top);
    }

    public getTestResultsByQuery(query: Contracts.TestResultsQuery): IPromise<Contracts.TestResultsQuery> {
        return this._httpClient.getTestResultsByQuery(
            query,
            this.getProjectName());
    }

    public getRecentBugs(automatedTestName?: string, testCaseId?: number, recentDays?: number): IPromise<Contracts.WorkItemReference[]> {
        return this._httpClient.queryTestResultWorkItems(
            this.getProjectName(),
            TMOM.WorkItemCategories.Bug,
            automatedTestName,
            testCaseId,
            null,
            recentDays);
    }

    public getAssociatedBugs(runId: number, resultId: number): IPromise<Contracts.WorkItemReference[]> {
        return this._httpClient.getBugsLinkedToTestResult(
            this.getProjectName(),
            runId,
            resultId);
    }

    public getBuildResultsTrend(filter: Contracts.TestResultTrendFilter): IPromise<Contracts.AggregatedDataForResultTrend[]> {
        return this._httpClient.queryResultTrendForBuild(filter,
            this.getProjectName());
    }

    public getReleaseResultsTrend(filter: Contracts.TestResultTrendFilter): IPromise<Contracts.AggregatedDataForResultTrend[]> {
        return this._httpClient.queryResultTrendForRelease(filter,
            this.getProjectName());
    }

    public getTestReportForRelease(releaseId: number, releaseEnvId: number, sourceWorkflow: string, includeFailureDetails?: boolean, releaseToCompare?: Contracts.ReleaseReference): IPromise<Contracts.TestResultSummary> {
        return this._httpClient.queryTestResultsReportForRelease(this.getProjectName(),
            releaseId,
            releaseEnvId,
            sourceWorkflow,
            includeFailureDetails,
            releaseToCompare);
    }

    public getGroupedResultsByReleaseId(releaseId: number, releaseEnvId: number, sourceWorkflow: string, groupBy: string, filter: string, sortBy: string, shouldIncludeResults: boolean, queryRunSummaryForInProgress: boolean): IPromise<Contracts.TestResultsDetails> {
        return this._httpClient.getTestResultDetailsForRelease(this.getProjectName(),
            releaseId,
            releaseEnvId,
            sourceWorkflow,
            groupBy,
            filter,
            sortBy,
            shouldIncludeResults,
            queryRunSummaryForInProgress
        );
    }

    public getGroupedResultHistory(filter: Contracts.ResultsFilter): IPromise<Contracts.TestResultHistory> {
        return this._httpClient.queryTestResultHistory(filter, this.getProjectName());
    }

    public getTestMethodLinkedWorkItems(testName: string): IPromise<Contracts.TestToWorkItemLinks> {
        return this._httpClient.queryTestMethodLinkedWorkItems(this.getProjectName(),
            testName);
    }

    public addWorkItemToTestLinks(workItemToTestLinks: Contracts.WorkItemToTestLinks): IPromise<Contracts.WorkItemToTestLinks> {
        return this._httpClient.addWorkItemToTestLinks(workItemToTestLinks,
            this.getProjectName());
    }

    public deleteTestMethodToWorkItemLink(testName: string, workItemId: number): IPromise<boolean> {
        return this._httpClient.deleteTestMethodToWorkItemLink(this.getProjectName(),
            testName,
            workItemId);
    }

    public getTestSummaryByRequirements(resultsContext: Contracts.TestResultsContext, workItemIds: number[]): IPromise<Contracts.TestSummaryForWorkItem[]> {
        return this._httpClient.queryTestSummaryByRequirement(resultsContext,
            this.getProjectName(), workItemIds);
    }

    public updateTestPlan(planUpdateModel: Contracts.PlanUpdateModel, planId: number): IPromise<Contracts.TestPlan> {
        return this._httpClient.updateTestPlan(planUpdateModel,
            this.getProjectName(),
            planId);
    }

    public getAllTestPlans(): IPromise<Contracts.TestPlan[]> {
        return this._httpClient.getPlans(this.getProjectName());
    }

    public getTestSuitesForPlan(planId: number, asTreeView?: boolean): IPromise<Contracts.TestSuite[]> {
        return this._httpClient.getTestSuitesForPlan(this.getProjectName(), planId, Contracts.SuiteExpand.Children, null, null, asTreeView);
    }

    public getResultGroupsByBuild(buildId: number, publishContext: string, fields?: string[], continuationToken?: string): IPromise<ITestResultsFieldDetailsWithContinuationToken> {
        return this._httpClient.getResultGroupsByBuildWithContinuationToken(this.getProjectName(), buildId, publishContext, fields, continuationToken);
    }

    public getResultGroupsByRelease(releaseId: number, publishContext: string, releaseEnvId?: number, fields?: string[], continuationToken?: string): IPromise<ITestResultsFieldDetailsWithContinuationToken> {
        return this._httpClient.getResultGroupsByReleaseWithContinuationToken(this.getProjectName(), releaseId, publishContext, releaseEnvId, fields, continuationToken);
    }

    public getResultGroupsByBuildV1(buildId: number, publishContext: string, fields?: string[], continuationToken?: string): IPromise<Contracts.TestResultsGroupsForBuild> {
        return this._httpClient.getResultGroupsByBuildV1(this.getProjectName(), buildId, publishContext, fields);
    }

    public getResultGroupsByReleaseV1(releaseId: number, publishContext: string, releaseEnvId?: number, fields?: string[]): IPromise<Contracts.TestResultsGroupsForRelease> {
        return this._httpClient.getResultGroupsByReleaseV1(this.getProjectName(), releaseId, publishContext, releaseEnvId, fields);
    }

    public getTestResultsByBuildWithContinuationToken(buildId: number, publishContext?: string, top?: number, continuationToken?: string): IPromise<ITestCaseResultsWithContinuationToken> {
        return this._httpClient.getTestResultsByBuildWithContinuationToken(this.getProjectName(), buildId, publishContext, top, continuationToken);
    }

    public getTestResultsByReleaseWithContinuationToken(releaseId: number, releaseEnvironmentId: number, publishContext?: string, top?: number, continuationToken?: string): IPromise<ITestCaseResultsWithContinuationToken> {
        return this._httpClient.getTestResultsByReleaseWithContinuationToken(this.getProjectName(), releaseId, releaseEnvironmentId, publishContext, top, continuationToken);
    }

    public queryTestHistory(filter: Contracts.TestHistoryQuery): IPromise<Contracts.TestHistoryQuery> {
        return this._httpClient.queryTestHistory(filter, this.getProjectName());
    }
}

export class TestPlanningService extends BaseService<Client.TestHttpClient> implements ITestPlanningService {

    public getHttpClient(tfsConnection: Service.VssConnection): Client.TestHttpClient {
        return tfsConnection.getHttpClient<Client.TestHttpClient>(Client.TestHttpClient);
    }

    public getPoints(planId: number, suiteId: number, witFields?: string, configurationId?: string, testCaseId?: string, testPointIds?: string, includePointDetails?: boolean, skip?: number, top?: number): IPromise<Contracts.TestPoint[]> {
        return this._httpClient.getPoints(
            this.getProjectName(),
            planId,
            suiteId,
            witFields,
            configurationId,
            testCaseId,
            testPointIds,
            includePointDetails,
            skip,
            top);
    }

    public updateTestPlan(planUpdateModel: Contracts.PlanUpdateModel, planId: number): IPromise<Contracts.TestPlan> {
        return this._httpClient.updateTestPlan(planUpdateModel,
            this.getProjectName(),
            planId);
    }

    public getAllTestPlans(): IPromise<Contracts.TestPlan[]> {
        return this._httpClient.getPlans(this.getProjectName());
    }

    public getTestSuitesForPlan(planId: number, asTreeView?: boolean): IPromise<Contracts.TestSuite[]> {
        return this._httpClient.getTestSuitesForPlan(this.getProjectName(), planId, Contracts.SuiteExpand.Children, null, null, asTreeView);
    }
}

export class TCMResultsService extends BaseService<TestResultsHttpClient> {
    public getHttpClient(tcmConnection: Service.VssConnection): TestResultsHttpClient {
        return tcmConnection.getHttpClient<TestResultsHttpClient>(TestResultsHttpClient);
    }

    public getTestRunLogs(runId: number, type: Contracts.TestLogType, directoryPath?: string, fileNamePrefix?: string, fetchMetaData?: boolean, top?: number, continuationToken?: string): IPromise<TCM_Types.ITestLogWithContinuationToken> {
        return this._httpClient.getTestRunLogs(this.getProjectName(), runId, type, directoryPath, fileNamePrefix, fetchMetaData, top, continuationToken);
    }

    public getTestResultLogs(runId: number, resultId: number, type: Contracts.TestLogType, directoryPath?: string, fileNamePrefix?: string, fetchMetaData?: boolean, top?: number, continuationToken?: string): IPromise<TCM_Types.ITestLogWithContinuationToken> {
        return this._httpClient.getTestResultLogs(this.getProjectName(), runId, resultId, type, directoryPath, fileNamePrefix, fetchMetaData, top, continuationToken);
    }

    public getTestSubResultLogs(runId: number, resultId: number, subResultId: number, type: Contracts.TestLogType, directoryPath?: string, fileNamePrefix?: string, fetchMetaData?: boolean, top?: number, continuationToken?: string): IPromise<TCM_Types.ITestLogWithContinuationToken> {
        return this._httpClient.getTestSubResultLogs(this.getProjectName(), runId, resultId, subResultId, type, directoryPath, fileNamePrefix, fetchMetaData, top, continuationToken);
    }

    public getTestLogStoreEndpointDetailsForRunLog(runId: number, type: Contracts.TestLogType, filePath: string): IPromise<Contracts.TestLogStoreEndpointDetails> {
        return this._httpClient.getTestLogStoreEndpointDetailsForRunLog(this.getProjectName(), runId, type, filePath);
    }

    public getTestLogStoreEndpointDetailsForResultLog(runId: number, resultId: number, type: Contracts.TestLogType, filePath: string): IPromise<Contracts.TestLogStoreEndpointDetails> {
        return this._httpClient.getTestLogStoreEndpointDetailsForResultLog(this.getProjectName(), runId, resultId, type, filePath);
    }

    public getTestLogStoreEndpointDetailsForSubResultLog(runId: number, resultId: number, subResultId: number, type: Contracts.TestLogType, filePath: string): IPromise<Contracts.TestLogStoreEndpointDetails> {
        return this._httpClient.getTestLogStoreEndpointDetailsForSubResultLog(this.getProjectName(), runId, resultId, subResultId, type, filePath);
    }
}

export class TestResultsService extends BaseService<TcmHttpClient> implements ITestResultsService {

    public getHttpClient(tfsConnection: Service.VssConnection): TcmHttpClient {
        return tfsConnection.getHttpClient<TcmHttpClient>(TcmHttpClient);
    }

    public getTestRunById(runId: number): IPromise<Contracts.TestRun> {
        return this._httpClient.getTestRunById(this.getProjectName(), runId);
    }

    public getTestResults(runId: number, detailsToInclude?: Contracts.ResultDetails, skip?: number, top?: number, outcomes?: Contracts.TestOutcome[]): IPromise<Contracts.TestCaseResult[]> {
        return this._httpClient.getTestResults(this.getProjectName(), runId, detailsToInclude, skip, top, outcomes);
    }

    public getTestReportForBuild(buildId: number, sourceWorkflow: string, includeFailureDetails?: boolean, buildToCompare?: Contracts.BuildReference): IPromise<Contracts.TestResultSummary> {
        return this._httpClient.queryTestResultsReportForBuild(this.getProjectName(),
            buildId,
            sourceWorkflow,
            includeFailureDetails,
            buildToCompare);
    }

    public getGroupedResultsByBuildId(buildId: number, sourceWorkflow: string, groupBy: string, filter: string, sortBy: string, shouldIncludeResults: boolean, queryRunSummaryForInProgress: boolean): IPromise<Contracts.TestResultsDetails> {
        return this._httpClient.getTestResultDetailsForBuild(
            this.getProjectName(),
            buildId,
            sourceWorkflow,
            groupBy,
            filter,
            sortBy,
            shouldIncludeResults,
            queryRunSummaryForInProgress
        );
    }

    public getResultById(runId: number, resultId: number, detailsToInclude?: Contracts.ResultDetails): IPromise<Contracts.TestCaseResult> {
        return this._httpClient.getTestResultById(
            this.getProjectName(),
            runId,
            resultId,
            (detailsToInclude) ? detailsToInclude : Contracts.ResultDetails.None);
    }

    public getTestResultsByQuery(query: Contracts.TestResultsQuery): IPromise<Contracts.TestResultsQuery> {
        return this._httpClient.getTestResultsByQuery(
            query,
            this.getProjectName());
    }

    public getRecentBugs(automatedTestName?: string, testCaseId?: number, recentDays?: number): IPromise<Contracts.WorkItemReference[]> {
        return this._httpClient.queryTestResultWorkItems(
            this.getProjectName(),
            TMOM.WorkItemCategories.Bug,
            automatedTestName,
            testCaseId,
            null,
            recentDays);
    }

    public getAssociatedBugs(runId: number, resultId: number): IPromise<Contracts.WorkItemReference[]> {
        return this._httpClient.getBugsLinkedToTestResult(
            this.getProjectName(),
            runId,
            resultId);
    }

    public getBuildResultsTrend(filter: Contracts.TestResultTrendFilter): IPromise<Contracts.AggregatedDataForResultTrend[]> {
        return this._httpClient.queryResultTrendForBuild(filter,
            this.getProjectName());
    }

    public getReleaseResultsTrend(filter: Contracts.TestResultTrendFilter): IPromise<Contracts.AggregatedDataForResultTrend[]> {
        return this._httpClient.queryResultTrendForRelease(filter,
            this.getProjectName());
    }

    public getTestReportForRelease(releaseId: number, releaseEnvId: number, sourceWorkflow: string, includeFailureDetails?: boolean, releaseToCompare?: Contracts.ReleaseReference): IPromise<Contracts.TestResultSummary> {
        return this._httpClient.queryTestResultsReportForRelease(this.getProjectName(),
            releaseId,
            releaseEnvId,
            sourceWorkflow,
            includeFailureDetails,
            releaseToCompare);
    }

    public getGroupedResultsByReleaseId(releaseId: number, releaseEnvId: number, sourceWorkflow: string, groupBy: string, filter: string, sortBy: string, shouldIncludeResults: boolean, queryRunSummaryForInProgress: boolean): IPromise<Contracts.TestResultsDetails> {
        return this._httpClient.getTestResultDetailsForRelease(this.getProjectName(),
            releaseId,
            releaseEnvId,
            sourceWorkflow,
            groupBy,
            filter,
            sortBy,
            shouldIncludeResults,
            queryRunSummaryForInProgress
        );
    }

    public getGroupedResultHistory(filter: Contracts.ResultsFilter): IPromise<Contracts.TestResultHistory> {
        return this._httpClient.queryTestResultHistory(filter, this.getProjectName());
    }

    public getTestMethodLinkedWorkItems(testName: string): IPromise<Contracts.TestToWorkItemLinks> {
        return this._httpClient.queryTestMethodLinkedWorkItems(this.getProjectName(),
            testName);
    }

    public addWorkItemToTestLinks(workItemToTestLinks: Contracts.WorkItemToTestLinks): IPromise<Contracts.WorkItemToTestLinks> {
        return this._httpClient.addWorkItemToTestLinks(workItemToTestLinks,
            this.getProjectName());
    }

    public deleteTestMethodToWorkItemLink(testName: string, workItemId: number): IPromise<boolean> {
        return this._httpClient.deleteTestMethodToWorkItemLink(this.getProjectName(),
            testName,
            workItemId);
    }

    public getTestSummaryByRequirements(resultsContext: Contracts.TestResultsContext, workItemIds: number[]): IPromise<Contracts.TestSummaryForWorkItem[]> {
        return this._httpClient.queryTestSummaryByRequirement(resultsContext,
            this.getProjectName(), workItemIds);
    }

    public getResultGroupsByBuild(buildId: number, publishContext: string, fields?: string[], continuationToken?: string): IPromise<ITestResultsFieldDetailsWithContinuationToken> {
        return this._httpClient.getResultGroupsByBuildWithContinuationToken(this.getProjectName(), buildId, publishContext, fields, continuationToken);
    }

    public getResultGroupsByRelease(releaseId: number, publishContext: string, releaseEnvId?: number, fields?: string[], continuationToken?: string): IPromise<ITestResultsFieldDetailsWithContinuationToken> {
        return this._httpClient.getResultGroupsByReleaseWithContinuationToken(this.getProjectName(), releaseId, publishContext, releaseEnvId, fields, continuationToken);
    }

    public getResultGroupsByBuildV1(buildId: number, publishContext: string, fields?: string[], continuationToken?: string): IPromise<Contracts.TestResultsGroupsForBuild> {
        return this._httpClient.getResultGroupsByBuildV1(this.getProjectName(), buildId, publishContext, fields);
    }

    public getResultGroupsByReleaseV1(releaseId: number, publishContext: string, releaseEnvId?: number, fields?: string[]): IPromise<Contracts.TestResultsGroupsForRelease> {
        return this._httpClient.getResultGroupsByReleaseV1(this.getProjectName(), releaseId, publishContext, releaseEnvId, fields);
    }

    public getResultRetentionSettings(): IPromise<Contracts.ResultRetentionSettings> {
        throw new Error("Method not implemented.");
    }

    public updateResultRetentionSettings(resultRetentionSettings: Contracts.ResultRetentionSettings): IPromise<Contracts.ResultRetentionSettings> {
        throw new Error("Method not implemented.");
    }

    public getTestResultsByBuildWithContinuationToken(buildId: number, publishContext?: string, top?: number, continuationToken?: string): IPromise<ITestCaseResultsWithContinuationToken> {
        return this._httpClient.getTestResultsByBuildWithContinuationToken(this.getProjectName(), buildId, publishContext, top, continuationToken);
    }

    public getTestResultsByReleaseWithContinuationToken(releaseId: number, releaseEnvironmentId: number, publishContext?: string, top?: number, continuationToken?: string): IPromise<ITestCaseResultsWithContinuationToken> {
        return this._httpClient.getTestResultsByReleaseWithContinuationToken(this.getProjectName(), releaseId, releaseEnvironmentId, publishContext, top, continuationToken);
    }

    public queryTestHistory(filter: Contracts.TestHistoryQuery): IPromise<Contracts.TestHistoryQuery> {
        return this._httpClient.queryTestHistory(filter, this.getProjectName());
    }
}

/*
    Here we are inherting from 2_2 build class as 2_2 version gives us information for both XAML and VNext builds.
    We will come up with concrete solution here to invoke 2_2 only for XAML and latest for VNext based on type of build.
    Here is bug to track this issue: BUG 547302
*/
export class BuildService extends BaseService<BuildClient.BuildHttpClient2_2> implements IBuildService {

    public getHttpClient(tfsConnection: Service.VssConnection): BuildClient.BuildHttpClient2_2 {
        return tfsConnection.getHttpClient<BuildClient.BuildHttpClient2_2>(BuildClient.BuildHttpClient2_2);
    }

    public getBuild(buildId: number): IPromise<BuildContracts.Build> {
        return this._httpClient.getBuild(buildId, this.getProjectName());
    }
}

export class BuildService2 extends BaseService<BuildClient.BuildHttpClient4> implements IBuildService2 {

    public getHttpClient(tfsConnection: Service.VssConnection): BuildClient.BuildHttpClient4 {
        return tfsConnection.getHttpClient<BuildClient.BuildHttpClient4>(BuildClient.BuildHttpClient4);
    }

    public getDefinition(definitionId: number): IPromise<BuildContracts.BuildDefinition> {
        return this._httpClient.getDefinition(definitionId, this.getProjectName());
    }
}

export class BuildService3 extends BaseService<BuildClient.BuildHttpClient5> implements IBuildService3 {

    public getHttpClient(tfsConnection: Service.VssConnection): BuildClient.BuildHttpClient5 {
        return tfsConnection.getHttpClient<BuildClient.BuildHttpClient5>(BuildClient.BuildHttpClient5);
    }

    public getPullRequest(project: string, providerName: string, pullRequestId: string, repositoryId?: string, serviceEndpointId?: string): IPromise<BuildContracts.PullRequest> {
        return this._httpClient.getPullRequest(project, providerName, pullRequestId, repositoryId, serviceEndpointId);
    }
}

export class GitService extends BaseService<GitClient.GitHttpClient3> implements IGitService {

    public getHttpClient(tfsConnection: Service.VssConnection): GitClient.GitHttpClient3 {
        return tfsConnection.getHttpClient<GitClient.GitHttpClient3>(GitClient.GitHttpClient3);
    }

    public getRefs(repositoryId: string): IPromise<VCContracts.GitRef[]> {
        return this._httpClient.getRefs(repositoryId);
    }

    public getItems(repositoryId: string, versionDescriptor?: VCContracts.GitVersionDescriptor): IPromise<VCContracts.GitItem[]> {
        return this._httpClient.getItems(repositoryId, null, null, null, false, false, false, false, versionDescriptor);
    }

    public getTree(repositoryId: string, sha1: string): IPromise<VCContracts.GitTreeRef> {
        return this._httpClient.getTree(repositoryId, sha1);
    }
}


export class TfvcService extends BaseService<TfvcClient.TfvcHttpClient3> implements ITfvcService {

    public getHttpClient(tfsConnection: Service.VssConnection): TfvcClient.TfvcHttpClient3 {
        return tfsConnection.getHttpClient<TfvcClient.TfvcHttpClient3>(TfvcClient.TfvcHttpClient3);
    }

    public getBranches(projectName: string): IPromise<VCContracts.TfvcBranch[]> {
        return this._httpClient.getBranches(projectName, true, true, false, false);
    }

    public getItems(projectName: string, scopePath: string): IPromise<VCContracts.TfvcItem[]> {
        return this._httpClient.getItems(projectName, scopePath);
    }
}


export class ServiceManager {

    constructor() {
        if (!ServiceManager._allowPrivateConstruction) {
            throw new Error("This class should not be constructed from outside.");
        }

        this._webContext = VssContext.getDefaultWebContext();
        let vssConnection = new Service.VssConnection(this._webContext);
        this._testPlanningService = vssConnection.getService<TestPlanningService>(TestPlanningService);
        this._testManagementLegacyService = vssConnection.getService<TestManagementLegacyService>(TestManagementLegacyService);
        this._testResultsService = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isDirectQueryFromTcmServiceEnabled() ? vssConnection.getService<TestResultsService>(TestResultsService) : this._testManagementLegacyService;
        this._tcmResultsService = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils.isQueryFromTcmServiceEnabled() ? vssConnection.getService<TCMResultsService>(TCMResultsService) : null;
        this._buildService = vssConnection.getService<BuildService>(BuildService);
        this._buildService2 = vssConnection.getService<BuildService2>(BuildService2);
        this._buildService3 = vssConnection.getService<BuildService3>(BuildService3);
        this._gitService = vssConnection.getService<GitService>(GitService);
        this._tfvcService = vssConnection.getService<TfvcService>(TfvcService);
    }

    public static instance(): ServiceManager {
        if (ServiceManager._instance === null) {
            this._allowPrivateConstruction = true;
            this._instance = new ServiceManager();
            this._allowPrivateConstruction = false;
        }

        if (ServiceManager._mockPlanningService) {
            this._instance._testPlanningService = ServiceManager._mockPlanningService;
        }

        if (ServiceManager._mockResultsService) {
            this._instance._testResultsService = ServiceManager._mockResultsService;
            this._instance._testManagementLegacyService = ServiceManager._mockResultsService;
        }

        return this._instance;
    }

    public static setMockPlanningService(service: ITestPlanningService): void {
        this._mockPlanningService = service;
    }

    public static setMockResultsService(service: ITestPlanningService & ITestResultsService): void {
        this._mockResultsService = service;
    }

    public testPlanningService(): ITestPlanningService {
        return this._testPlanningService;
    }

    public testResultsService(): ITestResultsService {
        return this._testResultsService;
    }

    public tcmResultsService(): TCMResultsService {
        return this._tcmResultsService;
    }

    public testResultsServiceLegacy(): ITestPlanningService & ITestResultsService {
        return this._testManagementLegacyService;
    }

    public buildService(): IBuildService {
        return this._buildService;
    }

    public buildService2(): IBuildService2 {
        return this._buildService2;
    }

    public buildService3(): IBuildService3 {
        return this._buildService3;
    }

    public gitService(): IGitService {
        return this._gitService;
    }

    public tfvcService(): ITfvcService {
        return this._tfvcService;
    }

    private static _allowPrivateConstruction: boolean = false;
    private static _instance: ServiceManager = null;
    private static _mockPlanningService: ITestPlanningService = null;
    private static _mockResultsService: ITestPlanningService & ITestResultsService = null;

    private _testPlanningService: ITestPlanningService;
    private _testResultsService: ITestResultsService;
    private _tcmResultsService: TCMResultsService;
    private _testManagementLegacyService: ITestPlanningService & ITestResultsService;
    private _buildService: IBuildService;
    private _buildService2: IBuildService2;
    private _buildService3: IBuildService3;
    private _gitService: IGitService;
    private _tfvcService: ITfvcService;
    private _webContext: Contracts_Platform.WebContext;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.Model", exports);

