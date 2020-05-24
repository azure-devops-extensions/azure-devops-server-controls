import {
    DetailsPaneMode,
    TestResultsViewStore,
} from "TestManagement/Scripts/Scenarios/TestTabExtension/Stores/TestResultsViewStore";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import { IViewContextData } from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import Diag = require("VSS/Diag");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_String = require("VSS/Utils/String");

// The class implements wrappers on WebAccess Telemetry method
export class TestTabTelemetryService {

    constructor(context?: IViewContextData){
        if (context){
            switch (context.status.toString()){
                case "0": this._artifactStatus = TestTabTelemetryService.inProgress; break;
                case "1": this._artifactStatus = TestTabTelemetryService.completed; break;
                case "2": this._artifactStatus = TestTabTelemetryService.others; break;
            }
            this._artifactId = context.data.mainData.id;
            this._artifactType = context.viewContext === CommonBase.ViewContext.Release ? TestTabTelemetryService.releaseContext : TestTabTelemetryService.buildContext;
            if (this._artifactType === TestTabTelemetryService.releaseContext){
                this._artifactStageId = context.data.subData.environment.id;
            }
        }
        TestTabTelemetryService._instance = this;
    }

    public static getInstance(){
        if (!TestTabTelemetryService._instance){
            TestTabTelemetryService._instance = new TestTabTelemetryService();
        }
        return TestTabTelemetryService._instance;
    }

    // We have to fill it with TestResultsViewStore object once we initialize TestResultView
    public static TestResultsViewStore: TestResultsViewStore = null;
    public static ViewContext: string = Utils_String.empty;

    // TestManagement area name
    public static areaTestManagement: string = "TestManagement";
    // Common events
    public static eventClicked: string = "Clicked";
    public static dropDownSelected: string = "DropDownSelected";
    public static inProgress: string = "InProgress";
    public static totalTests: string = "TotalTests";
    public static failedTests: string = "FailedTests";
    public static passedTests: string = "PassedTests";
    public static totalTestsExists: string = "TotalTestsExists";
    public static failedTestsExists: string = "FailedTestsExists";
    public static completed: string = "Completed";
    public static others: string = "Others";

    // Actions

    // List of feature names
    // Make sure that the names are same as in server project, if telemetry is being captured from the server as well
    public static featureTestTab_SignalRRefreshed = "NewTestTab_SignalRRefreshed";
    public static featureTestTab_DetailsPanelFullView: string = "TestTab_DetailsPaneFullView";
    public static featureTestTab_TestSummaryStatus: string = "NewTestTab_TestSummaryStatus";
    public static featureTestTab_SummaryExpandCollapseClicked: string = "NewTestTab_SummaryExpandCollapseClicked";
    public static featureTestTab_InProgressViewRefreshed: string = "NewTestTab_InProgressViewRefreshed";
    public static featureTestTab_AttachmentsExtensionType: string = "NewTestTab_AttachmentsExtensionType";
    public static featureTestTab_AttachmentsCount: string = "NewTestTab_AttachmentsCount";
    public static featureTestTab_AttachmentDownloadedCount: string = "NewTestTab_AttachmentDownloadedCount";
    public static featureTestTab_AttachmentDeletedCount: string = "NewTestTab_AttachmentDeletedCount";
    public static featureTestTab_EnteringFullScreen: string = "NewTestTab_EnteringFullScreen";
    public static featureTestTab_TestRunComment: string = "NewTestTab_TestRunComment";
    public static featureTestTab_PanelClose: string = "NewTestTab_PanelClose";
    public static featureTestTab_Filter = "NewTestTab_Filter";
    public static featureResultsListView_SelectionOfHierarchicalResults = "ResultsListView_SelectionOfHierarchicalResults";
    public static featureResultDetails_ExpandButtonClicked = "ResultDetails_ExpandButtonClicked";
    public static featureTestInBuildTimeline_ExpandCollapseClicked: string = "TestInBuildTimeline_ExpandCollapseClicked";
    public static featureResultDetails_AssociateWorkItem = "ResultDetails_AssociateWorkItem";
    public static featureTestTab_AddTestTaskLinkClicked: string = "NewTestTab_AddTestTaskLinkClicked";
    public static featureTestTab_AddBugToExistingClicked: string = "NewTestTab_AddBugToExistingClicked";
    public static featureTestTab_CreateBugClicked: string = "NewTestTab_CreateBugClicked";
    public static featureTestTab_BuildLinkClicked: string = "NewTestTab_BuildLinkClicked";
    public static featureTestTab_ReleaseLinkClicked: string = "NewTestTab_ReleaseLinkClicked";
    public static featureTestTab_FilterButtonClicked: string = "NewTestTab_FilterButtonClicked";
    public static featureTestTabSignalR: string = "NewTestTab_SignalR";
    public static errorOccurredDuringSignalRConnection: string = "NewTestTab_ErrorOccurredDuringSignalRConnection";
    public static featureTestTab_GroupByClicked: string = "NewTestTab_GroupByClicked";
    public static featureTestTab_TestTabClicked: string = "NewTestTab_TestTabClicked";
    public static featureTestTab_ColumnsChanged: string = "NewTestTab_ColumnsChanged";
    public static featureTestTab_TestRowVisited: string = "TestTab_TestRowSingleVisited";
    public static featureTestTab_DetailsPanelClosed: string = "TestTab_DetailsPaneClosed";
    public static featureTestTab_PreviewTestAttachment: string = "TestTab_PreviewTestAttachment";
    public static featureTestHistory_HistoryPaneViewed = "TestHistory_HistoryPaneViewed";
    public static featureTestHistory_BranchFilterUsed = "TestHistory_BranchFilterUsed";
    public static featureTestHistory_LeftOrRightArrowClicked = "TestHistory_LeftOrRightArrowClicked";
    public static featureTestHistory_BranchFilterCleared = "TestHistory_BranchFilterCleared";
    public static featureTestTab_StackTraceClicked = "NewTestTab_StackTraceClicked";

    public static featureCanvasInRelease: string = "ReleaseCanvas";
    public static featureCanvasInRelease_canvasRendered: string = "ReleaseCanvasRendered";
    public static featureCanvasInRelease_releaseId: string = "ReleaseId";
    public static featureCanvasInRelease_releaseEnvironmentId: string = "EnvironmentId";
    public static featureTimelineInBuild: string = "BuildTimeline";

    //List of contexts
    public static buildContext: string = "Build";
    public static releaseContext: string = "Release";

    private static _instance : TestTabTelemetryService;
    private _artifactStatus: string;
    private _artifactId: string;
    private _artifactStageId: string;
    private _artifactType: string;

    // Logs information to customer intelligence service
    // @param(feature) = featureName
    // @param(key) = key of the information value
    // @param(value) = information value
    public publishEvent(feature: string, key: string, value: any) {
        Diag.logVerbose("[TelemetryService.logProperty]: method called.");
        Diag.logVerbose(Utils_String.format("[TelemetryService.logProperty]: feature: {0}", feature));

        let properties: {[key : string]: any} = {};
        properties[key] = value;
        this.publishEvents(feature, properties);
    }

    // Logs information to customer intelligence service
    // @param(feature) = featureName
    // @param(properties) = key/value pair of the information
    public publishEvents(feature: string, properties: { [key: string]: any; }) {
        Diag.logVerbose("[TelemetryService.logProperties]: method called.");
        Diag.logVerbose(Utils_String.format("[TelemetryService.logProperties]: feature: {0}", feature));

        try {
            properties["artifactType"] = this._artifactType;
            properties["artifactId"] = this._artifactId;
            properties["artifactStatus"] = this._artifactStatus;
            if (this._artifactType === TestTabTelemetryService.releaseContext) {
                properties["artifactStageId"] = this._artifactStageId;
            }
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(TestTabTelemetryService.areaTestManagement,
                feature,
                properties));
        }
        catch (e) {
            Diag.logError(Utils_String.format("[TelemetryService.logProperties]: Error in logging Customer Intelligence data. Error: {0}", e.message));
        }
    }

    // Logs information to customer intelligence service with Details pane mode info
    // @param(feature) = featureName
    // @param(key) = key of the information value
    // @param(value) = information value
    public publishDetailsPaneEvents(feature: string, properties?: { [key: string]: any; }) {
        if (!!TestTabTelemetryService.TestResultsViewStore) {
            properties["DetailsPaneMode"] = DetailsPaneMode[TestTabTelemetryService.TestResultsViewStore.getState().detailsPaneMode];
        }
        else {
            Diag.logWarning("DetailsPaneTelemetryHelper.testResultsViewStore is not initialized.");
        }

        this.publishEvents(feature, properties);
    }


    // Logs information to customer intelligence service with Details pane mode info
    // @param(feature) = featureName
    // @param(properties) = key/value pair of the information
    public publishDetailsPaneEvent(feature: string, key: string, value: any) {
        let properties: { [key: string]: any; } = {};
        properties[key] = value;

        if (!!TestTabTelemetryService.TestResultsViewStore) {
            properties["DetailsPaneMode"] = DetailsPaneMode[TestTabTelemetryService.TestResultsViewStore.getState().detailsPaneMode];
        }
        else {
            Diag.logWarning("DetailsPaneTelemetryHelper.testResultsViewStore is not initialized.");
        }

        this.publishEvents(feature, properties);
    }
}