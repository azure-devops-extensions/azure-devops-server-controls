
import * as Common from "TestManagement/Scripts/TestReporting/Common/Common";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { TestDataProvider } from "TestManagement/Scripts/TestReporting/DataProviders/Test.DataProvider";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

import { Debug } from "VSS/Diag";

/**
 * @brief base class for data providers
 */
export class DataProviderBase {
    /// <summary>
    /// get testcase result data from the server
    /// </summary>
    public getTestResultData(runId: number, resultId: number, detailsToInclude?: TCMContracts.ResultDetails): IPromise<TCMContracts.TestCaseResult> {
        return TestDataProvider.getTestResultData(runId, resultId, (detailsToInclude) ? detailsToInclude : TCMContracts.ResultDetails.None);
    }

    /// <summary>
    /// get testcase result data array from the server for specified result ids
    /// </summary>
    public getTestResultsByQuery(query: TCMContracts.TestResultsQuery): IPromise<TCMContracts.TestResultsQuery> {
        return TestDataProvider.getTestResultsByQuery(query);
    }
}

/// <summary>
/// API to get user facing string mapped to a server error
/// </summary>
export class ErrorStringMap {
    public static getUserStringForServerError(error: any): string {
        Debug.assertIsNotNull(error, "error cannot be null or undefined.");

        let errorString: string = error.toString();

        if (error.serverError) {
            switch (error.serverError.typeKey) {
                case ErrorStringMap.EXCEPTIONTYPE_MISSINGLICENSEEXCEPTION:
                    errorString = Resources.NoTestResultsForStakeHolder;
                    break;
            }
        }

        return errorString;
    }

    private static EXCEPTIONTYPE_MISSINGLICENSEEXCEPTION: string = "MissingLicenseException";
}