import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { areFilterStatesEqual, FilterState, FilterValueItem } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class Utility {

    public static getTestInsightsInstanceId(parentInstanceId: string, testContext: CommonTypes.ITestContext, confValues: CommonTypes.IReportConfiguration): string {
        return Utils_String.format("{0};{1};Period-{2}", parentInstanceId, testContext.testIdentifier, CommonTypes.Period[confValues.period] as string);
    }

    public static publishTelemetry(featureName: string, testResultContext: TCMContracts.TestResultsContext, confValues: CommonTypes.IReportConfiguration,
        telemetryData: IDictionaryStringTo<string | number>, elapsedTime: number): void {
        let definitionIdType: string;
        let definitionId: number;
        switch (testResultContext.contextType) {
            case TCMContracts.TestResultsContextType.Build:
                definitionIdType = TestAnalyticsConstants.BuildDefinitionId;
                definitionId = testResultContext.build.definitionId;
                break;
            case TCMContracts.TestResultsContextType.Release:
                definitionIdType = TestAnalyticsConstants.ReleaseDefinitionId;
                definitionId = testResultContext.release.definitionId;
                break;
        }

        let commonTelemetryData: { [property: string]: string | number; } = {
            [TestAnalyticsConstants.Report]: TestAnalyticsConstants.TestFailures,
            [definitionIdType]: definitionId,
            [TestAnalyticsConstants.LoadTimeInMS]: elapsedTime
        };

        if (confValues && confValues.configuredFilters && confValues.configuredFilters[CommonTypes.Filter.Workflow]) {
            Object.assign(commonTelemetryData, {
                [TestAnalyticsConstants.WorkFlow]: confValues.configuredFilters[CommonTypes.Filter.Workflow].values.map((w: FilterValueItem) => w.value).join(",")
            });
        }

        let combinedTelemetryData = Object.assign(commonTelemetryData, telemetryData);

        TelemetryService.publishEvents(featureName, combinedTelemetryData);
    }

    public static publishTelemetryForGettingStarted(featureName: string, testReport: string, testResultContext: TCMContracts.TestResultsContext){
        let definitionIdType: string;
        let definitionId: number;
        let workflow: CommonTypes.Workflow;
        switch (testResultContext.contextType) {
            case TCMContracts.TestResultsContextType.Build:
                definitionIdType = TestAnalyticsConstants.BuildDefinitionId;
                definitionId = testResultContext.build.definitionId;
                workflow = CommonTypes.Workflow.Build;
                break;
            case TCMContracts.TestResultsContextType.Release:
                definitionIdType = TestAnalyticsConstants.ReleaseDefinitionId;
                definitionId = testResultContext.release.definitionId;
                workflow = CommonTypes.Workflow.Release;
                break;
        }
        let telemetryData: { [property: string]: string | number; } = {
            [TestAnalyticsConstants.Report]: testReport,
            [definitionIdType]: definitionId,
            [TestAnalyticsConstants.WorkFlow]: CommonTypes.Workflow[workflow].toString()
        };

        TelemetryService.publishEvents(featureName, telemetryData);
    }

    public static getDeletedEnvironmentDefIdDisplayString(envId: string): string {
        return Utils_String.format(Resources.DeletedStageIdDisplayText, envId);
    }

    public static areConfValuesEqual(confValues1: CommonTypes.IReportConfiguration, confValues2: CommonTypes.IReportConfiguration): boolean {
        if (!confValues1 && !confValues2) {
            return true;
        }

        if (!confValues1 || !confValues2) {
            return false;
        }

        if (confValues1.groupBy !== confValues2.groupBy) {
            return false;
        }

        if (confValues1.period !== confValues2.period) {
            return false;
        }

        if (confValues1.outcomes || confValues2.outcomes) {
            if (!Utils_Array.arrayEquals<CommonTypes.TestOutcome, CommonTypes.TestOutcome>(confValues1.outcomes, confValues2.outcomes, this._testOutComeArrayComparer, false, false)) {
                return false;
            }
        }
               
        return areFilterStatesEqual(confValues1.configuredFilters, confValues2.configuredFilters);
    }

    public static getFormattedValueStringForODataQuery(value: string): string {
        if (!value) {
            return value;
        }

        let formattedString: string = value;
        
        // Convert single quotes to double quotes
        formattedString = value.replace(/'/g, "''");
        
        return formattedString;
    }

    public static doesWorkflowFilterContainOnlyBuild(filters: FilterState): boolean {
        return filters &&
            filters[CommonTypes.Filter.Workflow] &&
            filters[CommonTypes.Filter.Workflow].values &&
            filters[CommonTypes.Filter.Workflow].values.length === 1 &&
            Utils_Array.contains(filters[CommonTypes.Filter.Workflow].values.map((v: FilterValueItem) => v.value as string), CommonTypes.Workflow.Build.toString());
    }

    public static areFiltersApplied(configuredFilters: FilterState): boolean {
        if(configuredFilters){
            for(let key in configuredFilters){
                if(configuredFilters[key].values && configuredFilters[key].values.length > 0){
                    return true;
                }
            }
        }        
        return false;
    }

    private static _testOutComeArrayComparer = (a: CommonTypes.TestOutcome, b: CommonTypes.TestOutcome) => a === b;
}