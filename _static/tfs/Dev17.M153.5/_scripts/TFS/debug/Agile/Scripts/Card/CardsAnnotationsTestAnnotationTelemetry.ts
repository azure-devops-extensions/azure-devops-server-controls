import Agile_Boards = require("Agile/Scripts/TFS.Agile.Boards");
import VSS_Performance = require("VSS/Performance");

export class PerfScenarios {
    public static GetTestSuites = "TestAnnotationPerf_GetTestSuites";
}

export class FeatureScenarios {
    public static BadgeClick = "TestAnnotationFeature_BadgeClick";
    public static AddTest = "TestAnnotationFeature_AddTest";
    public static DragDropComplete = "TestAnnotationFeature_DragDropTest";
    public static GetTestSuites = "TestAnnotationFeature_GetTestSuites";
    public static SetOutcome = "TestAnnotationFeature_SetOutcome";
}

export class TelemeteryHelper {
    public static startPerfScenario(scenario: string) {
        var scenarioManager = VSS_Performance.getScenarioManager();

        var activeScenarios = scenarioManager.getScenarios(Agile_Boards.KanbanTelemetry.CI_AREA_AGILE, scenario);
        $.each(activeScenarios, (i, scenario: VSS_Performance.IScenarioDescriptor) => {
            scenario.abort();
        });

        scenarioManager.startScenario(Agile_Boards.KanbanTelemetry.CI_AREA_AGILE, scenario);
    }

    public static endPerfScenario(scenario: string) {
        var scenarioManager = VSS_Performance.getScenarioManager();
        scenarioManager.endScenario(Agile_Boards.KanbanTelemetry.CI_AREA_AGILE, scenario);
    }

    public static publishFeatureTelemetry(feature: string, data?: IDictionaryStringTo<any>) {
        if (!data) {
            data = {};
        }

        Agile_Boards.KanbanTelemetry.publish(feature, data);
    }
}



