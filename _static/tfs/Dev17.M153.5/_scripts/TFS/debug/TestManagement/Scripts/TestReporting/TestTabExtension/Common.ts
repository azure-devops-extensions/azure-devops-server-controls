
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import TCMContracts = require("TFS/TestManagement/Contracts");

import Utils_String = require("VSS/Utils/String");
import Grids = require("VSS/Controls/Grids");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");

import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let TelemetryService = TCMTelemetry.TelemetryService;

export enum TargetPage {
    Build_Summary_Default_Tab = 0,
    Build_Summary_Test_Tab,
    Release_Summary_Default_Tab,
    Release_Summary_Test_Tab
}

/// <summary>
/// Enum for filters
/// </summary>
export enum Filters {
    GroupBy = 0,
    Outcome
}

export class Constants {
    public static BuildTrendCount = 10;
    public static EnterKeyCode = 13;
    public static OutcomeConfidenceField = "OutcomeConfidence";
}

export interface IData {
    mainData: any;      // Main data object: e.g. Build or Release
    subData?: any;      // sub-data object: e.g selected environment in a release
    compareWithData?: any;  // data object to compare with: e.g. selected build object or selected release object
    payload?: any;
}

/// <summary>
/// data received from view context source
/// </summary>
export interface IViewContextData {
    viewContext: CommonBase.ViewContext;
    data: IData;
    status?: ViewContextStatus; //Optional Status needed for InProgressData
}

export enum ViewContextStatus {
    InProgress,
    Completed,
    Others
}

export class TestCaseResultIdentifier {

    public testRunId: number;
    public testResultId: number;

    constructor(testRunId: number, testResultId: number) {
        this.testRunId = testRunId;
        this.testResultId = testResultId;
    }

    public toString(): string {
        let idBuilder: Utils_String.StringBuilder = new Utils_String.StringBuilder();

        idBuilder.append(this.testRunId.toString());
        idBuilder.append(":");
        idBuilder.append(this.testResultId.toString());

        return idBuilder.toString();
    }
}

VSS.initClassPrototype(TestCaseResultIdentifier, {
    testRunId: 0,
    testResultId: 0
});

export class TestResultsGroupPivots {
    public static Group_By_Container = "AutomatedTestStorage";
    public static Group_By_Test_Run = "TestRun";
    public static Group_By_Requirement = "Requirement";
    public static Group_By_Test_Suite = "TestSuite";
    public static Group_By_Priority = "Priority";
    public static Group_By_Owner = "Owner";
    public static Group_By_None = "";
}

export class TestResultsOutcomeFilterPivots {
    public static Filter_By_All = "All";
    public static Filter_By_Failed = "Failed";
    public static Filter_By_Passed = "Passed";
    public static Filter_By_Others = "Others";
    public static Filter_By_NotImpacted = "NotImpacted";
    public static Filter_By_PassedOnRerun = "PassedOnRerun";
    public static Filter_By_Aborted = "Aborted";
}

export class TestResultDetailsCommands {
    public static ExpandAll = "expand-all";
    public static CollapseAll = "collapse-all";
    public static BugMenuItem = "bug-menu-item";
    public static CreateBug = "create-bug";
    public static AddToExistingBug = "add-to-existing-bug";
    public static ColumnOptions = "column-options";
    public static RelatedRequirements = "related-requirements";
    public static Refresh = "refresh-result-summary";

    public static GroupByContainer = "group-by-container";
    public static GroupByTestRun = "group-by-test-run";
    public static GroupByTestSuite = "group-by-test-suite";
    public static GroupByPriority = "group-by-priority";
    public static GroupByNone = "group-by-none";
    public static GroupByRequirement = "group-by-requirement";
    public static GroupByOwner = "group-by-owner";

    public static FilterByAll = "filter-by-all";
    public static FilterByFailed = "filter-by-failed";
    public static FilterByPassed = "filter-by-passed";
    public static FilterByPassedOnRerun = "filter-by-passedonrerun";
    public static FilterByAborted = "filter-by-aborted";
    public static FilterByOthers = "filter-by-others";
    public static FilterByNotImpacted = "filter-by-notimpacted";

    public static ToggleFilterBar = "toggle-filter-bar";
    public static ToggleDetailsPane = "toggle-details-pane";

    public static mapGroupByCommandToPivot: IDictionaryStringTo<string> = {
        "group-by-container": TestResultsGroupPivots.Group_By_Container,
        "group-by-test-run": TestResultsGroupPivots.Group_By_Test_Run,
        "group-by-requirement": TestResultsGroupPivots.Group_By_Requirement,
        "group-by-test-suite": TestResultsGroupPivots.Group_By_Test_Suite,
        "group-by-priority": TestResultsGroupPivots.Group_By_Priority,
        "group-by-owner": TestResultsGroupPivots.Group_By_Owner,
        "group-by-none": TestResultsGroupPivots.Group_By_None
    };

    public static mapFilterByCommandToPivot: IDictionaryStringTo<string> = {
        "filter-by-all": TestResultsOutcomeFilterPivots.Filter_By_All,
        "filter-by-failed": TestResultsOutcomeFilterPivots.Filter_By_Failed,
        "filter-by-passed": TestResultsOutcomeFilterPivots.Filter_By_Passed,
        "filter-by-others": TestResultsOutcomeFilterPivots.Filter_By_Others,
        "filter-by-notimpacted": TestResultsOutcomeFilterPivots.Filter_By_NotImpacted,
        "filter-by-passedonrerun": TestResultsOutcomeFilterPivots.Filter_By_PassedOnRerun,
        "filter-by-aborted": TestResultsOutcomeFilterPivots.Filter_By_Aborted
    };
}

export enum GroupState {
    Passed,
    PartiallySucceeded,
    Failed,
    InProgress
}

export class Namespaces {
    public static SVGNamespace = "http://www.w3.org/2000/svg";
}

export interface IDuration {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

export interface ITestFailureData {
    newFailures: number;
    existingFailures: number;
    totalFailures: number;
}

export class TestResultConstants {
    public static OTHER_OUTCOME_LIST: TCMContracts.TestOutcome[] = [
        TCMContracts.TestOutcome.Blocked,
        TCMContracts.TestOutcome.Error,
        TCMContracts.TestOutcome.Inconclusive,
        TCMContracts.TestOutcome.InProgress,
        TCMContracts.TestOutcome.None,
        TCMContracts.TestOutcome.NotApplicable,
        TCMContracts.TestOutcome.NotExecuted,
        TCMContracts.TestOutcome.Paused,
        TCMContracts.TestOutcome.Timeout,
        TCMContracts.TestOutcome.Unspecified,
        TCMContracts.TestOutcome.Warning];

    public static getTestResultPropertiesMap(columnName) {
        if (!this._testResultProperties) {
            this._testResultProperties = {};
            this._testResultProperties[ColumnIndices.Test] = "TestCaseTitle";
            this._testResultProperties[ColumnIndices.Outcome] = "Outcome";
            this._testResultProperties[ColumnIndices.Duration] = "Duration";
            this._testResultProperties[ColumnIndices.DateStarted] = "DateStarted";
            this._testResultProperties[ColumnIndices.DateCompleted] = "DateCompleted";
        }
        return this._testResultProperties[columnName];
    }

    private static _testResultProperties: IDictionaryStringTo<string> = null;

    public static PAGE_SIZE: number = 100;
    public static PAGINATION_DELAY: number = 100;
}

export class TestResultsFieldConstants {
    public static getFieldNameMap(columnName: string): string {
        if (!this._testResultsFieldNames) {
            this._testResultsFieldNames = {};
            this._testResultsFieldNames[Resources.ResultGridHeader_FailingSince] = "FailingSince";
            this._testResultsFieldNames[Resources.ResultGridHeader_Duration] = "Duration";
            this._testResultsFieldNames[Resources.ResultGridHeader_DateCompleted] = "DateCompleted";
            this._testResultsFieldNames[Resources.ResultGridHeader_DateStarted] = "DateStarted";
            this._testResultsFieldNames[Resources.ResultGridHeader_Owner] = "Owner";
            this._testResultsFieldNames[Resources.ResultGridHeader_StageName] = "ReleaseEnvId";
        }
        return this._testResultsFieldNames[columnName];
    }
    private static _testResultsFieldNames: IDictionaryStringTo<string> = null;
}

export class TestReportColorPalette {

    public static Failed = "#DA0A00";
    public static Passed = "#107C10";
    public static Aborted = "#F15854";
    public static NotExecuted = "#828282";
    public static NotImpacted = "#FFB900";
    public static OtherOutcome = "#BFBFBF";
    public static ExisitingFailures = "#F5A9A9";
    public static Duration = "#5DA5DA";
    public static TotalTests = "#B276B2";
    public static AbortedForLegend = "#A80000";
}

export class TraceabilityWidgetColorPalette {
    public static PassedSection = "#339933";
    public static FailedSection = "#da0a00";
    public static OthersSection = "#787878";
}

export class SVGConstants {
    public static SVG = "svg";
    public static Rect = "rect";
    public static Title = "title";
}

export class TestResultsInsightProjectInfo {
    public static FEEDBACK_URL = "https://aka.ms/vsofeedback";
    public static PROJECT_NAME = "VSOnline";
    public static AREA_PATH = "VSOnline\\VS.in\\Agile Testing\\Test Reporting and Analysis";
    public static ITERATION_PATH = "VSOnline\\OneVS";
    public static SEARCH_TAG = "TRI_UserReportedBugs";
}



export class ColumnIndices {
    public static Outcome: string = "outcome";
    public static NewFailure: string = "newFailures";
    public static Test: string = "test";
    public static FailingSince: string = "failingSince";
    public static FailingBuild: string = "failingBuild";
    public static Duration: string = "duration";
    public static DateStarted: string = "dateStarted";
    public static DateCompleted: string = "dateCompleted";
    public static Owner: string = "owner";
    public static FailingRelease: string = "failingRelease";
    public static EnvironmentName: string = "environmentName";
}

export class FilterByFields {
    public static Outcome: string = "Outcome";
    public static Owner: string = "Owner";
    public static Container: string = "AutomatedTestStorage";
    public static TestCaseName: string = "TestCaseName";
    public static TestRun: string = "TestRun";
    public static Branch: string = "Branch";
    public static Environment: string = "Environment";
}

export class AvailableColumns {

    //For setting up column names in the left pane of column option Dialog box
    public static availableColumns(target: TargetPage): Grids.IGridColumn[] {
        let columns: Grids.IGridColumn[] = [];

        columns.push({
            text: Resources.ResultGridHeader_FailingSince,
            index: ColumnIndices.FailingSince
        });

        if (target === TargetPage.Build_Summary_Test_Tab) {
            columns.push({
                text: Resources.ResultGridHeader_FailingBuild,
                index: ColumnIndices.FailingBuild
            });
        }
        else if (target === TargetPage.Release_Summary_Test_Tab) {
            columns.push({
                text: Resources.ResultGridHeader_FailingRelease,
                index: ColumnIndices.FailingRelease
            });
        }

        columns.push({
            text: Resources.ResultGridHeader_Duration,
            index: ColumnIndices.Duration
        });

        columns.push({
            text: Resources.ResultGridHeader_DateStarted,
            index: ColumnIndices.DateStarted
        });

        columns.push({
            text: Resources.ResultGridHeader_DateCompleted,
            index: ColumnIndices.DateCompleted
        });

        columns.push({
            text: Resources.ResultGridHeader_Owner,
            index: ColumnIndices.Owner
        });

        if (target === TargetPage.Release_Summary_Test_Tab) {
            columns.push({
                text: Resources.ResultGridHeader_StageName,
                index: ColumnIndices.EnvironmentName
            });
        }

        return columns;
    }
}

export class TelemetryWrapperService {
    public static publishEvent(contextType: CommonBase.ViewContext, feature: IDictionaryStringTo<string>, key: string, value: any) {
        switch (contextType) {
            case CommonBase.ViewContext.Build:
                TelemetryService.publishEvent(feature[TelemetryService.buildContext], key, value);
                break;
            case CommonBase.ViewContext.Release:
                TelemetryService.publishEvent(feature[TelemetryService.releaseContext], key, value);
                break;
            default:
                Diag.logWarning("TelemetryService for this viewContext is not supported.");
                break;
        }
    }

    public static publishEvents(contextType: CommonBase.ViewContext, feature: IDictionaryStringTo<string>, properties: { [key: string]: any; }) {
        switch (contextType) {
            case CommonBase.ViewContext.Build:
                TelemetryService.publishEvents(feature[TelemetryService.buildContext], properties);
                break;
            case CommonBase.ViewContext.Release:
                TelemetryService.publishEvents(feature[TelemetryService.releaseContext], properties);
                break;
            default:
                Diag.logWarning("TelemetryService for this viewContext is not supported.");
                break;
        }
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestTabExtension/Common", exports);
