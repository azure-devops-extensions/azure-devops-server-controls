
import * as TCMContracts from "TFS/TestManagement/Contracts";
import { ServiceManager as TMServiceManager, ITestResultsService } from "TestManagement/Scripts/TFS.TestManagement.Service";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";


/**
 * @brief This file contains classes to fetch data related to Test sub-system
 */


/**
 *  @brief Data provider to fetch data from Test sub-system related to specific run or result artifacts.
 */
export class TestDataProvider {

    /// <summary>
    /// API to fetch test result data from server based on runId and resultId
    /// </summary>
    public static getTestResultData(runId: number, resultId: number, detailsToInclude: TCMContracts.ResultDetails): IPromise<TCMContracts.TestCaseResult> {
        let subResultsBitMask = TCMContracts.ResultDetails.SubResults;
        let includeDetails: TCMContracts.ResultDetails = detailsToInclude;
        // Check if the subResults bit is set. Reset this bit if Hierarchical View FF is off.
        if(detailsToInclude){
            includeDetails = (LicenseAndFeatureFlagUtils.isHierarchicalViewForResultsEnabled()) ? detailsToInclude : (detailsToInclude & (~subResultsBitMask));
        }
        return TMServiceManager.instance().testResultsService().getResultById(runId, resultId, (includeDetails) ? includeDetails : TCMContracts.ResultDetails.None);
    }

    /// <summary>
    /// API to fetch test result data array from server based on resultIds and columns
    /// </summary>
    public static getTestResultsByQuery(query: TCMContracts.TestResultsQuery): IPromise<TCMContracts.TestResultsQuery> {
        let service: ITestResultsService = TMServiceManager.instance().testResultsService();
        return service.getTestResultsByQuery(query);
    }
}