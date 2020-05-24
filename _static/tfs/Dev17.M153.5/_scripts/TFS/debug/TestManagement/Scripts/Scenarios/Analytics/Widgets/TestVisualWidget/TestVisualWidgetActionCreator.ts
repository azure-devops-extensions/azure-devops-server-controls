
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Definitions from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import { TestVisualWidgetSettings } from "TestManagement/Scripts/Scenarios/Analytics/Widgets/TestVisualWidget/TestVisualWidgetSettings";
import { TestResultsReportActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActionsCreator";

/**
 * Handles action creator behavior for TestVisualWidget. 
 * 
 * This one is avery thin wrapper around TestResultsReportActionsCreator.
 */
export class TestVisualWidgetActionCreator {

    /**
     * Requests formats a request for to be handled via TestResultsReportActionsCreator     
     */
    public getResults(widgetSettings: TestVisualWidgetSettings){
        //This is all work to obtain the store state for the view
        const instanceId = widgetSettings.definitionId;
        let testResultContext = ((widgetSettings.contextType === TCMContracts.TestResultsContextType.Build) ?
        {
            contextType: widgetSettings.contextType,
            build: { definitionId: widgetSettings.definitionId } as Partial<TCMContracts.BuildReference>
        } :
        {
            contextType: widgetSettings.contextType,
            release: { definitionId: widgetSettings.definitionId } as Partial<TCMContracts.ReleaseReference>
        }) as TCMContracts.TestResultsContext;
 
 
         //Invoke actions to start filling in data.
         const actionCreator = TestResultsReportActionsCreator.getInstance(instanceId.toString());
         actionCreator.beginRenderingTestResultsReport(testResultContext);
    }
}
