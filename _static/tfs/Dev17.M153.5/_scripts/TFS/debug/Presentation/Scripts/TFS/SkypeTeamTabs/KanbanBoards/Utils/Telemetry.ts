import * as Context from "VSS/Context";
import * as Telemetry from "VSS/Telemetry/Services";
import { IDashboardConfigData } from "Presentation/Scripts/TFS/SkypeTeamTabs/Dashboards/Models/IDashboardConfigData";

/**
 * Consolidate all telemetry calls into a single class.
 */
export class SkypeTeamTabTelemetry {
    /**
     * Every telemetry collected goes into the SkypeTeamTab group
     */
    public static Area = "SkypeTeamTab";

    /**
     * Used by concrete telemetry method of this file
     * @param {string} featureName - The feature name.
     * @param {IDictionaryStringTo<string | number | boolean>} properties - The key:value list of event properties.
     * @param {number} startTime - The Date.now() at the start of the event process.
     * @param {boolean} immediate - If true, make ajax calls to publish the event immediately. Otherwise queue the event and send in delayed batches.
     */
    private static publish(featureName: string, properties: IDictionaryStringTo<string | number | boolean>, startTime?: number, immediate: boolean = false): void {
        var context = Context.getPageContext();
        if (context && context.diagnostics) {
            properties["SessionId"] = context.diagnostics.sessionId;
        }
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(SkypeTeamTabTelemetry.Area, featureName, properties, startTime), immediate);
    }

    /**
     * Give some information about the created tab
     * @param {string} viewId - The exact unique identifier of this view. Allow to go deeper to see possible slowlyness
     */
    public static onCreateTab(backlogLevel: string): void {
        var measuredFeatureName = "OnCreateTab";
        var properties: { [key: string]: any } = {
            "backlog": backlogLevel
        };

        SkypeTeamTabTelemetry.publish(measuredFeatureName, properties);
    }
    /**
     * Record telemetry when user hit no team project scenario.
     * and how many card got loaded
     */
    public static onNoTeamProjectsAvailable(): void {
        var measuredFeatureName = "SkypeTeamTabDataProvider.NoTeamProjectsAvailable";
        SkypeTeamTabTelemetry.publish(measuredFeatureName, {});
    }

    public static onCreateDashboardsTab(selection: IDashboardConfigData, measuredFeatureName: string): void {
        var properties = {
            dashboard: selection.dashboard.selected.id,
            team: selection.team.selected.id,
            project: selection.project.selected.id,
        }

        SkypeTeamTabTelemetry.publish(measuredFeatureName, properties);
    }
}