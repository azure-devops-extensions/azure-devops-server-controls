import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import * as TCMLite from "TestManagement/Scripts/TFS.TestManagement.Lite";
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import Utils_Core = require("VSS/Utils/Core");
import { getService } from "VSS/Service";
import { WebPageDataService } from "VSS/Contributions/Services";
import { DesktopTestRunHelper } from "TestManagement/Scripts/TFS.TestManagement.DesktopTestRunHelper";

export class LicenseAndFeatureFlagUtils {
    private static _featureEnabled: boolean = null;
    private static _advancedTestExtensionEnabled: boolean = null;

    public static AreAdvancedTestManagementFeaturesEnabled(): boolean {
        if (this._isAdvancedTestExtensionEnabled()) {
            return true;
        }

        let isFeatureActive = TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(ServerConstants.LicenseFeatureIds.TestManagement);
        return isFeatureActive;
    }
    
    public static isModuleCoverageMergeEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.ModuleCoverageMerge, false);
    }

    public static isTIAMessageInBuildSummaryEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.BuildSummaryEnableTIALink, false);
    }

    public static isTIAUIEnabledInBuildSummaryAndGroupBy(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.ShowNotImpactedInTestResults, false);
    }

    public static isQuickStartTraceabilityEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TriQuickStartTraceability, false);
    }

    public static isTrendChartFeatureForRMEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TriTrendChartsForRM, true);
    }

    public static isTriShowTestRunSummaryInContextEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TriShowTestRunSummaryInContext, false);
    }

    public static isNewTestTabEnabledInOldBuild(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementTestTabExtensionBuild, false);
    }

    public static isEnableXtForEdgeFeatureEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTCMEnableXtForEdge, false);
    }

    public static isEnableDesktopScreenCaptureFeatureEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementEnableDesktopScreenShot , false);
    }

    public static isVideoWithAudioFeatureEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementEnableAudioWithVideo, false);
    }

    public static isReportCustomizationFeatureEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TriReportCustomization, false);
    }

    public static isRenderMarkDownCommentEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementRenderMarkDownComment, false);
    }

    public static isUpdateRunCommentEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementUpdateRunComment, false);
    }

    public static isAddAttachmentToRunsOrResultsEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TriAddRunResultAttachment, false);
    }

    public static isPreviewAttachmentsOfRunsOrResultsEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PreviewAttachments, false);
    }

    public static isLogStoreAttachmentsEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.LogStoreAttachments, false);
    }

    public static isGridViewOfRunsOrResultsAttachmentsEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementAttachmentsGridView, false);
    }

    public static isGridViewOfAssociatedBugsToTestResultsEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementBugsGridView, false);
    }

    public static isDirectQueryFromTcmServiceEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.QueryFromTcmService, false);
    }

    public static isPlannedTestingOnTcmServiceEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.EnablePlannedResultsOnTcmService, false);
    }

    public static isGridViewOfLinkedRequirementsEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementRequirementsGridView, false);
    }

    public static isNewOutcomeFiltersForRerunEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementFiltersForRerun, false);
    }

    public static isQueryFromTcmServiceEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.EnableQueryFromTcmService, false);
    }

    public static isPointCountFeatureDisabled(): boolean{
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementPointCountFeatureDisabled, false);
    }

    public static isReactBasedRunWithOptionsEnabled(): boolean{
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementReactBasedRunWithOptionsDialog, false);
    }

    public static isAddToExistingBugInTestResultSummaryPageEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.AddToExistingBugResultSummaryPage, false);
    }

    public static isQueryTestCaseRefInfoInWorkItemLinksIndependentlyEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementAddRefLinksToRequirement, false);
    }

    public static isTestResultsFilterInCICDEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TriTestResultsSearchAndFilter, false);
    }

    public static isAnalyticsTestResultsFiltersEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.AnalyticsTestResultsFilters, false);
    }

    public static isAnalyticsRouteAPIsToTestResultDailyEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.AnalyticsRouteAPIsToTestResultDaily, false);
    }

    public static isAnalyticsSwitchToTestSKContextFilterEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.AnalyticsSwitchToTestSKContextFilter, false);
    }

    public static isAnalyticsGroupByAndFilterOnTestSKEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.AnalyticsGroupByAndFilterOnTestSK, false);
    }

    public static isAbortedRunsFeatureEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TriReportingAbortedRuns, false);
    }

    public static isInProgressFeatureEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TriInProgress, false);
    }

    public static isSummaryEnabledForAllNotImpactedTests(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementShowSummaryForNotImpactedTests, false);
    }

    public static isDesktopTestRunnerOptionEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessShowDTROptionForTestRunner, false);
    }

    public static isTriSignalRIntegrationEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.TriSignalRIntegration, false);
    }

    public static isPublishOnTCMServiceEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.PublishOnTcmService, false);
    }

    public static isHierarchicalViewForResultsEnabled(): boolean{
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementHierarchicalViewForResults, false);
    }

    public static isTestCaseHistoryForNewUIEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementTestCaseHistory, false);
    }

    public static isLinkedStackTraceEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementLinkedStackTrace, false);
    }

    public static isNewTestResultLinkInCICDEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementNewTestResultLinkInCICD, false);
    }

    public static isNewTestPlanHubExperienceEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTestManagementNewTestPlanExperienceToggle, false);
    }

    public static isMyTestPlanSkinnyProviderEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTCMMineTestPlanSkinnyProvider, false);
    }

    public static isAllTestPlanSkinnyProviderEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTCMAllTestPlanSkinnyProvider, false);
    }

    public static isAdvTestExtPermissionsProviderEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessTCMAdvTestExtPermissionsProvider, false);
    }

    public static isUseOnlyLongPollingEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.UseOnlyLongPolling, false);
    }

    public static isShouldSendDurationInAPIEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.ShouldSendDurationInAPI, false);
    }

    public static isFilterInInProgressEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.ShouldEnableFilterInInProgress, false);
    }

    public static isLWPTestTabIsEnabled(): boolean {
        return FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.LWPTestTab, false);
    }

    private static _isAdvancedTestExtensionEnabled(): boolean {
        if (this._advancedTestExtensionEnabled === null) {
            let data = Utils_Core.parseJsonIsland($(document), ".__advancedTestExtensionEnabled");
            if (data) {
                this._advancedTestExtensionEnabled = data.advancedTestExtensionEnabled;
            } else {
                var response;

                // Added FF check to handle AT/DT scenario.
                if (LicenseAndFeatureFlagUtils.isAdvTestExtPermissionsProviderEnabled()) {
                    response = getService(WebPageDataService).getPageData<TCMLite.IJsonResponse>("ms.vss-test-web.testPlan-hub-advanced-test-extension-permissions-data-provider");
                } else {
                    response = getService(WebPageDataService).getPageData<TCMLite.IJsonResponse>("ms.vss-test-web.hub-testPlan-data-provider");
                }
                
                if (response) {
                    this._advancedTestExtensionEnabled = response.isAdvancedTestExtensionEnabled
                } else {
                    this._advancedTestExtensionEnabled = false;
                }
            }
        }

        return this._advancedTestExtensionEnabled;
    }
}
