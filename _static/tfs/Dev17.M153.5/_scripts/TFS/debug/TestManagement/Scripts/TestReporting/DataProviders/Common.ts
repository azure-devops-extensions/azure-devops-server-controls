/* File contains common data structures that can be used across Data providers */
/* This file should only be used to define common interfaces and shouldn't have any class definitions */

import * as Common from "TestManagement/Scripts/TestReporting/Common/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";

/**
 * @brief supported Data types across data providers
 */
export enum DataType {
    TestReport = 0,
    TestResults,
    TestResultDetailsWithContinuationToken,
    TestRuns,
    CodeCoverageSummary,
    BuildCodeCoverage,
    Artifacts,
    BuildResultsTrend,
    TestImpact,
    ReleaseResultsTrend,
	TestResultsFields
}

/**
 * @brief Common errors codes returned from Data providers
 */
export enum DataProviderErrorCodes {
    ScenarioNotCompleted = 0,
    NoTestResultsInScenario,
    ServerError
}

/// <summary>
/// Interface to define query parameters for build
/// </summary>
export interface ITestsQueryParameters {
    viewContextData: Common.IData;
    sourceWorkflow: string;
    groupBy?: string;
    filter?: string;
    sortBy?: string;
    includeResults?: boolean;
    isInProgress?: boolean;
}

/// <summary>
/// Interface to define interaction with data providers
/// </summary>
export interface IDataProvider {
    getViewContextData?: (sourceInput: ITestsQueryParameters, dataType: DataType) => IPromise<any>;
    getTestResultData?: (runId: number, resultId: number, detailsToInclude?: TCMContracts.ResultDetails) => IPromise<any>;
    getTestResultsByQuery ?: (query: TCMContracts.TestResultsQuery) => IPromise<TCMContracts.TestResultsQuery>;
    populateTestResultWithContextData ?: (result: TCMContracts.TestCaseResult, data: Common.IData) => void;
}


export class SourceWorkflow {
    public static BUILD_SOURCE_WORKFLOW = "CI";
    public static RELEASE_SOURCE_WORKFLOW = "CD";
}