
import * as ReactPerf from "VSS/Flux/ReactPerf";
import Context = require("VSS/Context");
import Telemetry = require("VSS/Telemetry/Services");
import Diag = require("VSS/Diag");
import Performance = require("VSS/Performance");
import { Plan } from "TFS/Work/Contracts";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";

/**
 * React Performance helper
 */
class ReactPerformance {
    private static _isStarted = false;

    /**
     * Stars React perf measurement if not started before
     */
    public static start() {
        if (Diag.logLevel === Diag.LogVerbosity.Verbose) {
            if (!ReactPerformance._isStarted) {
                ReactPerformance._isStarted = true;
                ReactPerf.start();
            }
        }
    }

    /**
     * Stops React perf measurement only if it was started
     */
    public static stop() {
        if (Diag.logLevel === Diag.LogVerbosity.Verbose) {
            if (ReactPerformance._isStarted) {
                ReactPerformance._isStarted = false;
                ReactPerf.stop();
            }
        }
    }

    /**
     * Stops and prints out the perf measurement if it was started
     */
    public static stopAndPrint() {
        if (ReactPerformance._isStarted) {
            ReactPerformance._isStarted = false;
            ReactPerf.stop();
            ReactPerf.printWasted(ReactPerf.getLastMeasurements());
        }
    }
}

export class ViewLoadPerformanceScenario {
    public static InitialFavoritePlansHubLoadScenario = "FavoritePlansHubLoad";
    public static InitialAllPlansHubLoadScenario = "AllPlansHubLoad";
    public static InitialCreateWizardViewLoadScenario = "InitialCreateWizardViewLoad";
    public static InitialDeliveryTimelineViewLoadScenario = "InitialDeliveryTimelineViewLoad";
}

/**
 * Consolidates all load performance scenarios, this class can be enhanced later to support any scenarios, not only load perf on page navigation.
 */
export class ViewPerfScenarioManager {
    /**
     * What: Unique identifier generated per page. In the world of single page application, this is generated every "fake page"
     * which mean every time we start a scenario. For exemple, refreshing a Plan is 2 scenarios.
     * Why: This is used to corrolate telemetry into a single "session/page" for a user.
     */
    public static ScenarioUniqueIdentifier: string;

    public static startFavoritePlansHubInitialLoad(): void {
        ViewPerfScenarioManager.startScenario(ViewLoadPerformanceScenario.InitialFavoritePlansHubLoadScenario);
    }

    public static startAllPlansHubInitialLoad(): void {
        ViewPerfScenarioManager.startScenario(ViewLoadPerformanceScenario.InitialAllPlansHubLoadScenario);
    }

    public static startCreateWizardLoadScenario() {
        ViewPerfScenarioManager.startScenario(ViewLoadPerformanceScenario.InitialCreateWizardViewLoadScenario);
    }

    public static startDeliveryTimelineLoadScenario() {
        ViewPerfScenarioManager.startScenario(ViewLoadPerformanceScenario.InitialDeliveryTimelineViewLoadScenario);
        ReactPerformance.start();
    }

    /**
     * start a page load performance scenario
     */
    public static startScenario(scenario: string): Performance.IScenarioDescriptor {
        ViewPerfScenarioManager.ScenarioUniqueIdentifier = GUIDUtils.newGuid();

        // We will abort all page load scenarios before start a new one
        ViewPerfScenarioManager.abort();
        return Performance.getScenarioManager().startScenarioFromNavigation(ScaledAgileTelemetry.Area, scenario, true);
    }

    /**
     * Aborts any pending page load performance scenario
     */
    public static abort(): void {
        let scenarioDescriptors = ViewPerfScenarioManager._getAllScenarios();
        $.each(scenarioDescriptors, (index: number, scenarioDescriptor: Performance.IScenarioDescriptor) => {
            if (scenarioDescriptor.isActive()) {
                scenarioDescriptor.abort();
            }
        });

        ReactPerformance.stop();
    }

    /**
     * Ends any active page load performance scenario
     */
    public static end(): void {
        let scenarioDescriptors = ViewPerfScenarioManager._getAllScenarios();
        $.each(scenarioDescriptors, (index: number, scenarioDescriptor: Performance.IScenarioDescriptor) => {
            if (scenarioDescriptor.isActive()) {
                scenarioDescriptor.end();
            }
        });
        ReactPerformance.stopAndPrint();
    }

    /**
     * Add additional data to the view load performance scenario.
     * @param data Property bag of additional data
     */
    public static addData(data: any): void {
        let scenarioDescriptors = ViewPerfScenarioManager._getAllScenarios();
        $.each(scenarioDescriptors, (index: number, scenarioDescriptor: Performance.IScenarioDescriptor) => {
            if (scenarioDescriptor.isActive()) {
                scenarioDescriptor.addData(data);
            }
        });
    }

    /**
     * Insert split timing for all currently active scenarios
     * @param splitName Name of split timing
     */
    public static split(splitName: string): void {
        Performance.getScenarioManager().split(splitName);
    }

    private static _getScenarios(scenario: string): Performance.IScenarioDescriptor[] {
        return Performance.getScenarioManager().getScenarios(ScaledAgileTelemetry.Area, scenario);
    }

    private static _getAllScenarios(): Performance.IScenarioDescriptor[] {
        let scenarioDescriptors: Performance.IScenarioDescriptor[] = [];

        for (var scenarioName in ViewLoadPerformanceScenario) {
            if (ViewLoadPerformanceScenario.hasOwnProperty(scenarioName)) {
                let scenario: string = ViewLoadPerformanceScenario[scenarioName];
                scenarioDescriptors = scenarioDescriptors.concat(ViewPerfScenarioManager._getScenarios(scenario));
            }
        }
        return scenarioDescriptors;
    }
}

/**
 * Consolidate all telemetry calls, not dependent on the plan type, into a single class.
 * Telemetry data, specific to a given plan type would be recorded by specific telemetry helpers like 
 */
export class ScaledAgileTelemetry {
    /**
     * Every telemetry collected goes into the ScaledAgile group
     */
    public static Area = "ScaledAgile";

    public static KeyScenarioToken = "ScenarioToken";
    public static KeyTeamId = "TeamId";
    public static KeyPlanId = "PlanId";
    public static KeySessionId = "SessionId";

    /**
     * Used by concrete telemetry method of this file
     * @param {string} featureName - The feature name.
     * @param {IDictionaryStringTo<string | number | boolean>} properties - The key:value list of event properties.
     * @param {number} startTime - The Date.now() at the start of the event process.
     * @param {boolean} immediate - If true, make ajax calls to publish the event immediately. Otherwise queue the event and send in delayed batches.
     */
    public static publish(featureName: string, properties: IDictionaryStringTo<string | number | boolean>, startTime?: number, immediate: boolean = false): void {
        ScaledAgileTelemetry.addGenericProperties(properties);
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(ScaledAgileTelemetry.Area, featureName, properties, startTime), immediate);
    }

    /**
    * What: Add generic information
    * Why: Some information allow to filter down (session or scenario) or have a better understanding (like the window size)
    */
    private static addGenericProperties(existingProperties: IDictionaryStringTo<any>): void {
        let context = Context.getPageContext();
        if (context.webContext.team) {
            existingProperties[ScaledAgileTelemetry.KeyTeamId] = context.webContext.team.id;
        }
        existingProperties[ScaledAgileTelemetry.KeySessionId] = context.diagnostics.sessionId;
        existingProperties[ScaledAgileTelemetry.KeyScenarioToken] = ViewPerfScenarioManager.ScenarioUniqueIdentifier;
        existingProperties["WindowHeight"] = $(window).height(); //This can be optimized to not get the size from the Dom every time
        existingProperties["WindowWidth"] = $(window).width();  //This can be optimized to not get the size from the Dom every time
    }

    /**
     * Record telemetry about how long getTeams takes, how many teams retrieved per one server hit, how many time the server is hit.
     * and how many card got loaded
     * @param {number} itemsRetrivedPerServerHit - Number of items retrieve per one server hit.
     * @param {number} serverHitCount - Number of times the server is hit.
     * @param {number} startTime - Time when started the execution.
     */
    public static onGetAllTeams(totalItemsRetrieved: number, itemsRetrievedPerServerHit: number, serverHitCount: number, startTime: number): void {
        const properties: IDictionaryStringTo<any> = {
            "TotalItemsRetrieved": totalItemsRetrieved,
            "ItemsRetrievedPerServerHit": itemsRetrievedPerServerHit,
            "ServerHitCount": serverHitCount
        };
        ScaledAgileTelemetry.publish("DeliveryTimelineWizardDataProvider.GetAllTeams", properties, startTime);
    }

    public static onCreatePlanSucceeded(plan: Plan, copied: boolean = false): void {
        const properties: IDictionaryStringTo<any> = {
            "PlanType": plan.type,
            "Copied": copied,
            [ScaledAgileTelemetry.KeyPlanId]: plan.id
        };
        ScaledAgileTelemetry.publish("PlanCreated", properties, Date.now(), true);
    }

    public static onDeletePlanSucceeded(planId: string): void {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: planId
        };
        ScaledAgileTelemetry.publish("PlanDeleted", properties);
    }

    public static onOpenTeamAdminIterations(planId: string, teamStatusCode: string): void {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: planId,
            "TeamStatusCode": teamStatusCode
        };
        ScaledAgileTelemetry.publish("OpenTeamAdminIterations", properties, Date.now(), true);
    }

    public static onOpenTeamAdminAreas(planId: string, teamStatusCode: string): void {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: planId,
            "TeamStatusCode": teamStatusCode
        };
        ScaledAgileTelemetry.publish("OpenTeamAdminAreas", properties, Date.now(), true);
    }

    public static onOpenConfiguration(planId: string, teamStatusCode: string): void {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: planId,
            "TeamStatusCode": teamStatusCode
        };
        ScaledAgileTelemetry.publish("OpenConfiguration", properties);
    }

    public static onUpdatePlanRetry(planId: string): void {
        const properties: IDictionaryStringTo<any> = {
            [ScaledAgileTelemetry.KeyPlanId]: planId
        };
        ScaledAgileTelemetry.publish("PlanUpdateRetry", properties);
    }
}
