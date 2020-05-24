import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import Telemetry = require("VSS/Telemetry/Services");


// The class implements wrappers on WebAccess Telemetry method
export class TelemetryService {

    // TestManagement area name
    public static areaTestManagement: string = "TestManagement";
    public static testHubPage: string = "TestHub";
    // Common events
    public static eventPageLoad: string = "PageLoad";
    public static eventBugCreated: string = "BugCreated";
    public static eventBugAddedToExisting: string = "BugAddedToExisting";
    public static eventClicked: string = "Clicked";
    public static eventTestTabClicked: string = "TestTabClicked";
    public static eventBuildLinkClicked: string = "BuildLinkClicked";
    public static eventBugLinkClicked: string = "LinkedBugViewed";
    public static eventAllEnvironments: string = "AllEnvironments";
    public static eventExtensionLoaded: string = "ExtensionLoaded";
    public static createTestPlan: string = "CreateTestPlan";
    public static deleteTestPlan: string = "DeleteTestPlan";
    public static createTestCaseUsingWit: string = "CreateTestCaseUsingWit";
    public static createTestCaseUsinfeatureExploreUsingClientgGrid: string = "CreateTestCaseUsingGrid";
    public static renameSuite: string = "RenameSuite";
    public static deleteSuite: string = "DeleteSuite";
    public static addQueryBasedSuite: string = "AddQueryBasedSuite";
    public static addRequirementBasedSuite: string = "AddRequirementBasedSuite";
    public static addStaticSuite: string = "AddStaticSuite";
    public static suiteActions: string = "Actions";
    public static addSharedSteps: string = "AddSharedSteps";
    public static addExistingTestCase: string = "AddExistingTestCase";
    public static assignTester: string = "AssignTester";
    public static assignConfiguration: string = "AssignConfiguration";
    public static exportLatestOutcomeChecked: string = "ExportLatestOutcomeChecked";
    public static exportSuiteViaMail: string = "ExportSuiteViaMail";
    public static exportSuiteViaPrint: string = "ExportSuiteViaPrint";
    public static exportHtmlExceedSuitesLimit: string = "ExportHtmlExceedSuitesLimit";
    public static filter: string = "filter";
    public static countOfTestsLinkedToBug: string = "CountOfTestsLinked";
    public static totalTests: string = "TotalTests";
    public static failedTests: string = "FailedTests";
    public static passedTests: string = "PassedTests";
    public static testResultSummaryDisplayed: string = "TestResultSummaryDisplayed";
    public static testResultSummaryChartForOlderBuilds: string = "testResultSummaryChartForOlderBuilds";
    public static buildDefinitionId: string = "BuildDefinitionID";
    public static testRunCount: string = "TestRunCount";
    public static totalTestsExists: string = "TotalTestsExists";
    public static passPercentageReported: string = "PassPercentageReported";
    public static failedTestsExists: string = "FailedTestsExists";
    public static dropDownSelected: string = "DropDownSelected";
    public static valueCount: string = "CountOfValues";
    public static sourceWorkFlow: string = "SourceWorkflow";
    public static errorOccurredDuringSignalRConnection: string = "ErrorOccurredDuringSignalRConnection";
    public static testHubSignalRConnectionDisconnected: string = "testHub.Disconnected";
    public static testHubSignalRConnectionError: string = "testHub.Error";
    public static testHubSignalRConnectionReconnecting: string = "testHub.Reconnecting";
    public static testHubSignalRConnectionReconnected: string = "testHub.Reconnected";

    // Properties
    public static signalRReconnectDelay: string = "reconnectDelay";
    public static signalRErrorMessage: string = "errorMessage";
    public static signalRReConnectCount: string = "reconnectCount";

    // Actions
    public static collapse = "collapse";
    public static expand = "expand";
    public static refresh = "refresh";
    public static numberOfPointsSelected = "NumberOfPoints";
    public static numberOfTestCases = "NumberOfTestCases";
    public static eventDoubleClicked: string = "DoubleClicked";
    public static eventKeyPressed: string = "KeyPressed";
    public static nextButtonClickedInPreviewAttachmentsDialog: string = "NextButtonClickedInPreviewAttachmentsDialog";
    public static previousButtonClickedInPreviewAttachmentsDialog: string = "PreviousButtonClickedInPreviewAttachmentsDialog";
    public static downloadButtonClickedInPreviewAttachmentsDialog: string = "DownloadButtonClickedInPreviewAttachmentsDialog";
    public static dropdownAttachmentSelectedInPreviewAttachmentsDialog: string = "DropdownAttachmentSelectedInPreviewAttachmentsDialog";

    // new test plan telemetry points
    public static breadcrumbRootClick: string = "BreadcrumbRootClick";
    public static favoritedThroughBreadcrumb: string = "FavoritedThroughBreadcrumb";
    public static unfavoritedThroughBreadcrumb: string = "UnfavoritedThroughBreadcrumb";
    public static navigateToMyPlansPage: string = "NavigateToMyPlansPage";
    public static navigateToAllPlansPage: string = "NavigateToAllPlansPage";
    public static testPlanDirectoryFilterClick: string = "TestPlanDirectoryFilterClick";
    public static featureNewTestPlanHub: string = "NewTestPlanHub";
    public static featureNewTestPlan_Payload = "NewTestPlan_Payload";
    public static featureNewTestPlan_FilterClick = "NewTestPlan_FilterClick";

    // List of feature names
    // Make sure that the names are same as in server project, if telemetry is being captured from the server as well
    public static featureOpenRequestFeedbackForm: string = "OpenRequestFeedbackForm";
    public static featureViewRequestFeedbackPreview: string = "ViewRequestFeedbackPreview";
    public static featureSentRequestFeedback: string = "SentRequestFeedback";
    public static featureRequestFeedbackInstructionsTrimmed: string = "RequestFeedbackInstructionsTrimmed";
    public static featureRequestFeedbackMailNotConfigured: string = "RequestFeedbackMailNotConfigured";
    public static featureOpenVerifyBugTestRunner: string = "OpenVerifyBugTestRunner";
    public static featureVerifyBugTestRunnerOpened: string = "VerifyBugTestRunnerOpened";
    public static featureVerifyBugDialogBox_ClickedYes: string = "VerifyBugDialogBoxClickedYes";
    public static featureVerifyBugDialogBox_ClickedNo: string = "VerifyBugDialogBoxClickedNo";
    public static featureOpenTestPlanWIT: string = "OpenTestPlanWIT";
    public static featureOpenTestSuiteWIT: string = "OpenTestSuiteWIT";
    public static featureTestRunsQueryList: string = "TestRunsQueryList";
    public static featureTestRunsQueryEditor: string = "TestRunsQueryEditor";
    public static featureTestResultsQueryList: string = "TestResultsQueryList";
    public static featureTestResultsQueryEditor: string = "ResultsQueryEditor";
    public static featureTestRunSummary: string = "TestRunSummary";
    public static featureTestResultSummary: string = "TestResultSummary";
    public static featureTestResultCreateBug: string = "TestResultCreateBug";
    public static featureTestResultAddToExistingBug: string = "TestResultAddToExistingBug";
    public static featureAddToExisingBug_BugSelected: string = "BugSelectedForAddToExistingBug";
    public static featureCaptureScreenshot: string = "CaptureScreenshot";
    public static featureRecordScreen: string = "RecordScreen";
    public static featureCaptureActions: string = "CaptureActionLogs";
    public static featureCancelRecordScreen: string = "CancelRecordScreen";
    public static featureStopRecordScreen: string = "StopRecordScreen";
    public static featureStopActionRecording: string = "StopActionCapture";
    public static featureRecordScreenCompleted: string = "RecordScreenCompleted";
    public static featureBugCreatedDuringScreenRecording: string = "BugCreatedDuringScreenRecording";
    public static featureIterationMoveDuringScreenRecording: string = "IterationMoveDuringScreenRecording";
    public static featureClosingRunnerDuringScreenRecording: string = "ClosingRunnerDuringScreenRecording";
    public static featureClosedRunnerDuringScreenRecording: string = "ClosedRunnerDuringScreenRecording";
    public static featureBugCreatedDuringActionRecording: string = "BugCreatedDuringActionRecording";
    public static featureActionLogDisabledFromExtension: string = "ActionLogDisabledFromExtension";
    public static featureActionLogRefreshWindowDialog: string = "ActionLogRefreshWindowDialog";
    public static featureActionLogAutoStoppedDuringMove: string = "ActionLogAutoStoppedDuringMove";
    public static featureActionLogAutoStoppedDuringSaveAndClose: string = "ActionLogAutoStoppedDuringSaveAndClose";
    public static featureClosingRunnerDuringActionRecording: string = "ClosingRunnerDuringActionRecording";
    public static featureActiveWindowsForScreenshot: string = "ActiveWindowCountForScreenshot";
    public static featureActiveWindowsForCaptureAction: string = "ActiveWindowCountForCaptureAction";
    public static featureInstallXTExtension: string = "InstallXTExtension";
    public static featureRelaunchWebRunner: string = "RelaunchWebRunner";
    public static featureTestResultUpdateAnalysis: string = "TestResultUpdateAnalysis";
    public static featureCodeCoverageTabInBuildSummary_CodeCoverageTabClicked: string = "CodeCoverageTabInBuildSummary_CodeCoverageTabClicked";
    public static featureDownloadCodeCoverageResults: string = "DownloadCodeCoverageResults";
    public static featureAddTestTaskLinkInBuildSummaryClicked: string = "AddTestTaskLinkInBuildSummaryClicked";
    public static featureEnableTIALinkClicked: string = "EnableTIALinkClicked";
    public static featureDismissTIALinkClicked: string = "DismissTIALinkClicked";
    public static featureTestTabInBuildSummary_AddTestTaskLinkClicked: string = "TestTabInBuildSummary_AddTestTaskLinkClicked";
    public static featureTestTabInBuildSummary_AddAssociatedWorkItemLinkClicked: string = "TestTabInBuildSummary_AddAssociatedWorkItemLinkClicked";
    public static featureTestTabInBuildSummary_FullScreenClicked: string = "TestTabInBuildSummary_FullScreenClicked";
    public static featureTestTabInBuildSummary_ExpandCollapseClicked: string = "TestTabInBuildSummary_ExpandCollapseClicked";
    public static featureTestTabInBuildSummary_CreateBugClicked: string = "TestTabInBuildSummary_CreateBugClicked";
    public static featureTestTabInBuildSummary_AddBugToExistingClicked: string = "TestTabInBuildSummary_AddBugToExistingClicked";
    public static featureTestTabInBuildSummary_BuildLinkClicked: string = "TestTabInBuildSummary_BuildLinkClicked";
    public static featureTestTabInReleaseSummary_ReleaseLinkClicked: string = "TestTabInReleaseSummary_ReleaseLinkClicked";
    public static featureTestTabInBuildSummary_DetailsPaneToggleClicked: string = "TestTabInBuildSummary_DetailsPaneToggleClicked";
    public static featureTestTabInBuildSummary_TestRowDoubleClicked: string = "TestTabInBuildSummary_TestRowDoubleClicked";
    public static featureTestTabInBuildSummary_TestRowVisited: string = "TestTabInBuildSummary_TestRowSingleVisited";
    public static featureTestTabInBuildSummary_TestRowEnterKeyPressed: string = "TestTabInBuildSummary_TestRowEnterKeyPressed";
    public static featureTestTabInBuildSummary: string = "TestTabInBuildSummary";
    public static featureTestTabInBuildSummary_TestTabDetailedReportClicked: string = "TestTabInBuildSummary_TestTabDetailedReportClicked";
    public static featureTestTabInBuildSummary_TestResultTitleClick = "TestTabInBuildSummary_TestResultTitleClick";
    public static featureTestTabInBuildSummary_TestRunTitleClick = "TestTabInBuildSummary_TestRunTitleClick";
	public static featureTestTabInBuildSummary_TestSuiteTitleClick = "TestTabInBuildSummary_TestSuiteTitleClick";
    public static featureTestResultsSectionInBuildSummaryTab_TestResultSummary = "TestResultsSectionInBuildSummaryTab_TestResultSummary";
    public static featureTestResultsSectionInBuildSummaryTab_TestRunsFallback = "TestResultsSectionInBuildSummaryTab_TestRunsFallback";
    public static featureTestTabInBuildSummary_OpenFailureTrend = "TestTabInBuildSummary_OpenFailureTrend";
    public static featureTestTabInBuildSummary_OpenDurationTrend = "TestTabInBuildSummary_OpenDurationTrend";
    public static featureTestTabInReleaseSummary_EnvironmentChanged: string = "TestTabInReleaseSummary_EnvironmentChanged";
    public static featureTestTabInBuildSummary_TestTabClicked: string = "TestTabInBuildSummary_TestTabClicked";
    public static featureTestTabInReleaseSummary_TestTabClicked: string = "TestTabInReleaseSummary_TestTabClicked";
    public static featureTestTabInBuildSummary_TestTabPageLoad: string = "TestTabInBuildSummary_TestTabPageLoad";
    public static featureTestTabInReleaseSummary_TestTabPageLoad: string = "TestTabInReleaseSummary_TestTabPageLoad";
    public static featureTestTabInBuildSummary_GroupByClicked: string = "TestTabInBuildSummary_GroupByClicked";
    public static featureTestTabInReleaseSummary_GroupByClicked: string = "TestTabInReleaseSummary_GroupByClicked";
    public static featureTestTabInBuildSummary_OutcomeFilterClicked: string = "TestTabInBuildSummary_OutcomeFilterClicked";
    public static featureTestTabInReleaseSummary_OutcomeFilterClicked: string = "TestTabInReleaseSummary_OutcomeFilterClicked";
    public static featureTestTabInBuildSummary_ColumnSorted: string = "TestTabInBuildSummary_ColumnSorted";
    public static featureTestTabinBuildSummary_ColumnsChanged: string = "TestTabInBuildSummary_ColumnsChanged";
    public static featureTestTabinBuildSummary_PreviewTestAttachment: string = "TestTabInBuildSummary_PreviewTestAttachment";
    public static featureTestTabinBuildSummary_TestResultHistory: string = "TestTabinBuildSummary_TestResultHistory";
    public static featureTestTab_FilterButtonClicked: string = "TestTab_FilterButtonClicked";
    public static featureRunsHubHistory_Load: string = "RunsHubHistory_Load";
    public static featureRunsHubHistory_GroupByEnvironmentSelected: string = "RunsHubHistory_GroupByEnvironmentSelected";
    public static featureRunsHubHistory_GroupByBranchSelected: string = "RunsHubHistory_GroupByBranchSelected";
    public static featureTestTabInBuildSummary_RequirementToTestsLinked: string = "TestTabInBuildSummary_RequirementToTestsLinked";
    public static featureTestTrendChart_NavigateToBuildSummary = "TestTrendChart_NavigateToBuildSummary";
    public static featureTestTab_TrendChartViewed = "TestTab_TrendChartViewed";
    public static featureTestTabInBuildSummary_RequirementTitleClick = "TestTabInBuildSummary_RequirementTitleClick";
    public static featureTestTab_Filter = "TestTab_Filter";
    public static featureTestTab_PopulateCacheForFilter = "TestTab_PopulateCacheForFilter";
    public static featureTestResultViewBug: string = "TestResultViewBug";
    public static featureExpandCollapseSingleTestIteration: string = "ExpandCollapseSingleTestIteration";
    public static featureExpandCollapseAllTestIterations: string = "ExpandCollapseAllTestIterations";
    public static featureDownloadTestIterationAttachment: string = "DownloadTestIterationAttachment";
    public static featureDownloadTestStepAttachment: string = "DownloadTestStepAttachment";
    public static featureDownloadTestResultOrRunAttachment: string = "DownloadTestResultOrRunAttachment";
    public static featureTestPlan: string = "TestPlan";
    public static featureDeleteTestPlan: string = "DeleteTestPlan";
    public static featureTestSuite: string = "TestSuite";
    public static featureTestCase: string = "TestCase";
    public static featureAddExistingTestCases: string = "AddExistingTestCases";
    public static featureSharedSteps: string = "SharedSteps";
    public static featureBulkMarkOutcome: string = "BulkMarkOutcome";
    public static featureBulkResetPointsToActive: string = "BulkResetPointsToActive";
    public static featureAssignTester: string = "AssignTester";
    public static featureAssignConfiguration: string = "AssignConfiguration";
    public static featureRemoveTestsFromSuites: string = "RemoveTestsFromSuites";
    public static featureColumnOptionsForTestView: string = "ColumnOptionsForListView";
    public static featureTestSuiteFilter: string = "TestSuiteViewFilter";
    public static featureExportToHtml: string = "ExportToHtml";
    public static featureCreateTestCase: string = "CreateTestCase";
    public static featureOpenInMTM: string = "OpenInMTM";
    public static featureTestPlansFilter: string = "TestPlansFilter";
    public static featureTestPlansResetFilter: string = "ResetTestPlansFilter";
    public static featureAddRunAttachmentOnWeb: string = "UploadRunAttachmentInWeb";
    public static featureAddResultAttachmentOnWeb: string = "UploadResultAttachmentInWeb";

    public static featureOpenTestCaseWIT: string = "OpenTestCaseWIT";
    public static featureRunTest: string = "RunTest";
    public static featureRunTestUsingClient: string = "RunTestUsingClient";
    public static featureRunAutomatedTests: string = "RunAutomatedTests";
    public static featureReleaseCreationFromAutomatedTestRunner: string = "ReleaseCreationFromAutomatedTestRunner";
    public static featureAutomatedRunTriggered: string = "AutomatedRunTriggered";
    public static featureAutomatedRunTriggeredFromRunWithOptions: string = "AutomatedRunTriggeredFromRunWithOptions";
    public static featureExploreUsingXTClient: string = "ExploreUsingClient";
    public static featureTesterFilter: string = "TesterFilter";
    public static featureOutcomeFilter: string = "OutcomeFilter";
    public static featureTagFilter: string = "TagFilter";
    public static featureConfigurationFilter: string = "ConfigurationFilter";
    public static featureOpenRequirementWIT: string = "OpenRequirementWIT";
    public static featureDetailsPaneTestResults: string = "DetailsPaneTestResults";
    public static featureDetailsPaneTestSuites: string = "DetailsPaneTestSuites";
    public static featureDetailsPaneRefresh: string = "DetailsPaneRefresh";
    public static featureDetailsPaneOpenInNewTab: string = "DetailsPaneOpenInNewTab";
    public static featureDetailsPaneTestCases: string = "DetailsPaneTestCases";
    public static featureLoadWebTestRunner: string = "LoadWebTestRunner";
    public static featureEditTestStep: string = "EditTestStep";
    public static featureMarkTestStepOutcome: string = "AddMarkTestStepOutcome";
    public static featureViewDescriptionInWebRunner: string = "ViewDescriptionInWebRunner";
    public static featureAddTestResultComment: string = "AddTestResultComment";
    public static featureAddTestResultAttachment: string = "AddTestResultAttachment";
    public static featureMarkTestResultOutcome: string = "MarkTestResultOutcome";
    public static featureMoveToNextTestCase: string = "MoveToNextTestCase";
    public static featureMoveToNextTestIteration: string = "MoveToNextTestIteration";
    public static featureAddParameterSet: string = "AddParameterSet";
    public static featureRenameParameterSet: string = "RenameParameterSet";
    public static featureViewParameterSetGrid: string = "ViewParameterSetGrid";
    public static featureSaveParameterSetGrid: string = "SaveParameterSetGrid";
    public static featureViewParameterWITForm: string = "ViewParameterSetWIT";
    public static featureViewReferenceTestPane: string = "ViewReferenceTestPane";
    public static featureAddTestCaseFromReferenceTestPane: string = "AddTestCaseFromReferenceTestPane";
    public static featureRefreshFromReferenceTestPane: string = "RefreshFromReferenceTestPane";
    public static featureRunTestFromWitCard: string = "RunTestFromWitCard";
    public static featureResumeRunTestFromWitCard: string = "ResumeRunTestFromWitCard";
    public static featureOrderTestCasesDone: string = "OrderTestCasesDone";
    public static featureOrderTestCasesCancel: string = "OrderTestCasesCancel";
    public static featureTestCaseMove: string = "TestCaseMove";
    public static featureSuiteReorder: string = "SuiteReorder";
    public static featureDeleteTestWorkItem: string = "DeleteTestWorkItem";
    public static featureDeleteMultipleTestWorkItems: string = "DeleteMultipleTestWorkItems";

    public static featureConfigurationsHub: string = "ConfigurationsHub";
    public static featureCreateTestConfiguration: string = "CreateTestConfiguration";
    public static featureDeleteTestConfiguration: string = "DeleteTestConfiguration";
    public static featureUpdateTestConfiguration: string = "UpdateTestConfiguration";
    public static featureCreateTestVariable: string = "CreateTestVariable";
    public static featureDeleteTestVariable: string = "DeleteTestVariable";
    public static featureUpdateTestVariable: string = "UpdateTestVariable";
    public static featureTestColumnExtension: string = "TestStatusInReleaseEnvironemntSummary";

    public static featureXTSessionsGridView_Sort: string = "XTSessionsGridView_Sort";
    public static featureControlTabInXTSessionsGridView_ExpandAll: string = "ControlTabInXTSessionsGridView_ExpandAll";
    public static featureControlTabInXTSessionsGridView_CollapseAll: string = "ControlTabInXTSessionsGridView_CollapseAll";
    public static featureControlTabInXTSessionsGridView_DetailsPane: string = "ControlTabInXTSessionsGridView_DetailsPane";
    public static featureControlTabInXTSessionsGridView_GroupByClicked: string = "ControlTabInXTSessionsGridView_GroupByClicked";
    public static featureControlTabInXTSessionsGridView_ShowClicked: string = "ControlTabInXTSessionsGridView_ShowClicked";
    public static featureControlTabInExploratorySessions_TeamTabClicked: string = "ControlTabInExploratorySessions_TeamTabClicked";
    public static featureControlTabInExploratorySessions_PeriodTabClicked: string = "ControlTabInExploratorySessions_PeriodTabClicked";
    public static featureControlTabInExploratorySessions_ViewTabClicked: string = "ControlTabInExploratorySessions_ViewTabClicked";
    public static featureControlTabInExploratorySessions_QueryTabClicked: string = "ControlTabInExploratorySessions_QueryTabClicked";
    public static featureRecentExploratorySessionsClicked: string = "RecentExploratorySessionsClicked";
    public static featureExploratorySessionsCount: string = "ExploratorySessionsCount";
    public static featureTestTabSignalR: string = "SignalR";
    public static featureTestTabInBuildSummary_DetailsPanelClosed: string = "TestTabInBuildSummary_DetailsPaneClosed";

    // Run with options dialog
    public static featureRunWithOptionsSettings: string = "RunWithOptionsSettings";

    // Preview Attachments Dialog
    public static featurePreviewAttachment_DialogOpened = "PreviewAttachmentsDialogOpened";
    public static featurePreviewAttachment_DialogOpenFailed = "PreviewAttachmentsDialogOpenFailed";
    public static featurePreviewAttachment_DownloadClicked = "DownloadButtonClickedInPreviewAttachmentDialog";
    public static featurePreviewAttachment_Next = "NextButtonClickedInPreviewAttachmentDialog";
    public static featurePreviewAttachment_Previous = "PreviousButtonClickedInPreviewAttachmentDialog";
    public static featurePreviewAttachment_DropdownAttachmentSelected = "DropdownAttachmentSelectedInPreviewAttachmentDialog";
    public static featurePreviewAttachment_AttachmentLoadTime = "AttachmentLoadTimeInPreviewAttachmentDialog";

    // Attachments Grid View
    public static featureAttachmentsGridView_DownloadAttachment = "AttachmentsGridView_DownloadAttachment";
    public static featureAttachmentsGridView_PreviewAttachment = "AttachmentsGridView_PreviewAttachment";
    public static featureAttachmentsGridView_MultipleAttachmentsDownloaded = "AttachmentsGridView_MultipleAttachmentsDownloaded";

    //Bugs Grid View
    public static featureBugsGridView_TestResultViewBug = "BugsGridView_TestResultViewBug";
    public static featureBugsGridView_sortOnBugs = "BugsGridView_SortOnBugs";
    public static featureBugsGridView_RemoveAssociation_Bugs = "BugsGridView_RemoveAssociation_Bugs";

    // Requirements Grid View
    public static featureRequirementsGridView_TestResultViewRequirements = "RequirementsGridView_TestResultViewRequirements";
    public static featureRequirementsGridView_SortOnRequirements = "RequirementsGridView_SortOnRequirements";
    public static featureRequirementsGridView_RemoveAssociation_Requirements = "RequirementsGridView_RemoveAssociation_Requirements";

    // Test Results Hierarchical List View and Details View New UI
    public static featureResultDetails_AttachmentClicked = "ResultDetails_AttachmentClicked";

    // Test Results History UI
    public static featureTestHistory_HistoryPaneViewed = "TestHistory_HistoryPaneViewed";
    public static featureTestHistory_BranchFilterUsed = "TestHistory_BranchFilterUsed";
    public static featureTestHistory_LeftOrRightArrowClicked = "TestHistory_LeftOrRightArrowClicked";
    public static featureTestHistory_BranchFilterCleared = "TestHistory_BranchFilterCleared";

    //List of contexts
    public static buildContext: string = "Build";
    public static releaseContext: string = "Release";

    // Test Analytics
    public static featureTestAX_AggregateTrendChart = "TestAX_AggregateTrendChart";
    public static featureTestAX_EnableAX = "TestAX_EnableAX";
    public static featureTestAX_FailedTestsCard = "TestAX_FailedTestsCard";
    public static featureTestAX_FailuresReport = "TestAX_FailuresReport";
    public static featureTestAX_Filter = "TestAX_Filter";
    public static featureTestAX_InstallAX = "TestAX_InstallAX";
    public static featureTestAX_NoTestResults = "TestAX_NoTestResults";
    public static featureTestAX_PassRateCard = "TestAX_PassRateCard";
    public static featureTestAX_ReportClick = "TestAX_ReportClick";
    public static featureTestAX_ResultsGrid = "TestAX_ResultsGrid";
    public static featureTestAX_ResultsGridElement = "TestAX_ResultsGridElement";
    public static featureTestAX_ResultsGridLoadMore = "TestAX_ResultsGridLoadMore";
    public static featureTestAX_TestDetailsView = "TestAX_TestDetailsView";
    public static featureTestAX_TestHistoryGrid = "TestAX_TestHistoryGrid";
    public static featureTestAX_TestHistoryGridLoadMore = "TestAX_TestHistoryGridLoadMore";
    public static featureTestAX_TestInsightsReport = "TestAX_TestInsightsReport";
    public static featureTestAX_TestTrendChart = "TestAX_TestTrendChart";
    public static featureTestAX_ViewTest = "TestAX_ViewTest";

    // Run with TestRunner (Azure Test Plans)
    public static featureRunWithTestRunnerATP_DownloadClicked = "TestRunnerATP_DownloadClicked";
    public static featureRunWithTestRunnerATP_LaunchClicked = "TestRunnerATP_LaunchClicked";

    public static featureTestTab_TestTabClicked: IDictionaryStringTo<string> = {
        "Build": TelemetryService.featureTestTabInBuildSummary_TestTabClicked,
        "Release": TelemetryService.featureTestTabInReleaseSummary_TestTabClicked
    };

    public static featureTestTab_TestTabPageLoad: IDictionaryStringTo<string> = {
        "Build": TelemetryService.featureTestTabInBuildSummary_TestTabPageLoad,
        "Release": TelemetryService.featureTestTabInReleaseSummary_TestTabPageLoad
    };

    public static featureTestTab_GroupByClicked: IDictionaryStringTo<string> = {
        "Build": TelemetryService.featureTestTabInBuildSummary_GroupByClicked,
        "Release": TelemetryService.featureTestTabInReleaseSummary_GroupByClicked
    };

    public static featureTestTab_OutcomeFilterClicked: IDictionaryStringTo<string> = {
        "Build": TelemetryService.featureTestTabInBuildSummary_OutcomeFilterClicked,
        "Release": TelemetryService.featureTestTabInReleaseSummary_OutcomeFilterClicked
    };

    // Logs information to customer intelligence service
    // @param(feature) = featureName
    // @param(key) = key of the information value
    // @param(value) = information value
    public static publishEvent(feature: string, key: string, value: any) {
        Diag.logVerbose("[TelemetryService.logProperty]: method called.");
        Diag.logVerbose(Utils_String.format("[TelemetryService.logProperty]: feature: {0}", feature));

        try {
            Telemetry.publishEvent(Telemetry.TelemetryEventData.fromProperty(TelemetryService.areaTestManagement,
                feature,
                key,
                value));
        }
        catch (e) {
            Diag.logError(Utils_String.format("[TelemetryService.logProperties]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    // Logs information to customer intelligence service
    // @param(feature) = featureName
    // @param(properties) = key/value pair of the information
    public static publishEvents(feature: string, properties: { [key: string]: any; }) {
        Diag.logVerbose("[TelemetryService.logProperties]: method called.");
        Diag.logVerbose(Utils_String.format("[TelemetryService.logProperties]: feature: {0}", feature));

        try {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(TelemetryService.areaTestManagement,
                feature,
                properties));
        }
        catch (e) {
            Diag.logError(Utils_String.format("[TelemetryService.logProperties]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }
}

export class TelemetryHelper {

    public static logTelemetryForPreviewAttachments(attachmentSource: string, featureName: string, fileNameExtension: string, size: number): void {
        TelemetryService.publishEvents(featureName, {
            "AttachmentSource": attachmentSource,
            "FilenameExtension": fileNameExtension,
            "SizeInKB": Math.ceil(size / 1024)
        });
    }
}