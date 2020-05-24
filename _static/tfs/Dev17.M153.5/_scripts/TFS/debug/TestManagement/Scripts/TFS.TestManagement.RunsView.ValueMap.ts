//Auto converted from TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap.debug.js

/// <reference types="jquery" />









import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");

import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let queueRequest = VSS.queueRequest;

export class RunExplorerViewTabs {
    public static RunCharts: string = "runCharts";
    public static RunQuery: string = "runQuery";
    public static ResultQuery: string = "resultQuery";
    public static ResultQueryEditor: string = "resultQueryEditor";
    public static RunQueryEditor: string = "runQueryEditor";
    public static ResultSummary: string = "resultSummary";
    public static ResultHistory: string = "resultHistory";
    public static ExploratorySession: string = "exploratorySession";
    public static Error: string = "error";
    constructor() {
    }
}

export class RunExplorerParams {
    public static Param_runId: string = "runId";
    public static Param_resultId: string = "resultId";
    constructor() {
    }
}

export class TestQueryableItemTypes {
    public static TestResult: string = "TestResult";
    public static TestRun: string = "TestRun";
    public static ExploratorySession: string = "ExploratorySession";
    constructor() {
    }
}

export class TestQueryConstants {

    public static RECENT_RUNS_QUERY_ID: string = "8AC4BE34-5582-43AF-8830-6797C47F5870";
    public static RECENT_RESULT_ROOT_QUERY_ID: string = "6618FEF0-354F-4CDF-960A-D01E5E00B173";
    public static EXPLORATORY_SESSIONS_QUERY_ID: string = "de84d7a7-3ed5-461d-bead-a4c625b61fa7";
    public static RUNS_TITLE_QUERY_ID: string = "3018B3CE-1579-4538-9556-A6092E4C1E1A";
    public static NUMBER_OF_RECENT_RUNS: number = 5;
    public static PAGINATION_DELAY: number = 100;

    public static QUERYEDITOR_CONTROLMODE_DROP: string = "drop";
    public static QUERYEDITOR_CONTROLMODE_TEXT: string = "text";
    public static QUERYEDITOR_CONTROLTYPE_LIST: string = "list";

    public static isRecentRunsQueryId(queryId) {
        return queryId.toUpperCase() === TestQueryConstants.RECENT_RUNS_QUERY_ID;
    }

    public static isRecentResultsRootQueryId(queryId) {
        return queryId.toUpperCase() === TestQueryConstants.RECENT_RESULT_ROOT_QUERY_ID;
    }

    constructor() {
    }
}

export class TestOutcome {

    private static _friendlyNames: any = null;
    private static _iconClassNames: any = null;
    private static _OutcomeToEnum: any = null;

    public static Unspecified: number = 0;
    public static None: number = 1;
    public static Passed: number = 2;
    public static Failed: number = 3;
    public static Inconclusive: number = 4;
    public static Timeout: number = 5;
    public static Aborted: number = 6;
    public static Blocked: number = 7;
    public static NotExecuted: number = 8;
    public static Warning: number = 9;
    public static Error: number = 10;
    public static NotApplicable: number = 11;
    public static Paused: number = 12;
    public static InProgress: number = 13;
    public static NotImpacted: number = 14;

    public static getFriendlyName(outcome) {
        if (!this._friendlyNames) {
            this._friendlyNames = {};
            this._friendlyNames[TestOutcome.Unspecified] = Resources.TestOutcome_Result_Unspecified;
            this._friendlyNames[TestOutcome.None] = Resources.TestOutcome_None;
            this._friendlyNames[TestOutcome.Passed] = Resources.TestOutcome_Passed;
            this._friendlyNames[TestOutcome.Failed] = Resources.TestOutcome_Failed;
            this._friendlyNames[TestOutcome.Inconclusive] = Resources.TestOutcome_Inconclusive;
            this._friendlyNames[TestOutcome.Timeout] = Resources.TestOutcome_Timeout;
            this._friendlyNames[TestOutcome.Aborted] = Resources.TestOutcome_Aborted;
            this._friendlyNames[TestOutcome.Blocked] = Resources.TestOutcome_Blocked;
            this._friendlyNames[TestOutcome.NotExecuted] = Resources.TestOutcome_NotExecuted;
            this._friendlyNames[TestOutcome.Warning] = Resources.TestOutcome_Warning;
            this._friendlyNames[TestOutcome.Error] = Resources.TestOutcome_Error;
            this._friendlyNames[TestOutcome.NotApplicable] = Resources.TestOutcome_NotApplicable;
            this._friendlyNames[TestOutcome.Paused] = Resources.TestOutcome_Paused;
            this._friendlyNames[TestOutcome.InProgress] = Resources.TestOutcome_InProgress;
            this._friendlyNames[TestOutcome.NotImpacted] = Resources.TestOutcome_NotImpacted;
        }
        return this._friendlyNames[outcome];
    }

    public static getIconClassName(outcome) {
        if (!this._iconClassNames) {
            this._iconClassNames = {};
            this._iconClassNames[TestOutcome.Unspecified] = "bowtie-symbol-feedback-request bowtie-icon-small";
            this._iconClassNames[TestOutcome.None] = "bowtie-status-run-outline bowtie-icon-small";
            this._iconClassNames[TestOutcome.Passed] = "bowtie-status-success bowtie-icon-small";
            this._iconClassNames[TestOutcome.Failed] = "bowtie-status-failure bowtie-icon-small";
            this._iconClassNames[TestOutcome.Inconclusive] = "bowtie-status-help bowtie-icon-small";
            this._iconClassNames[TestOutcome.Timeout] = "bowtie-status-waiting bowtie-icon-small";
            this._iconClassNames[TestOutcome.Aborted] = "bowtie-status-stop bowtie-icon-small";
            this._iconClassNames[TestOutcome.Blocked] = "bowtie-math-minus-circle bowtie-icon-small";
            this._iconClassNames[TestOutcome.NotExecuted] = "bowtie-not-executed bowtie-status-run-not-executed bowtie-icon-small";
            this._iconClassNames[TestOutcome.Warning] = "bowtie-status-warning bowtie-icon-small";
            this._iconClassNames[TestOutcome.Error] = "bowtie-status-error bowtie-icon-small";
            this._iconClassNames[TestOutcome.NotApplicable] = "bowtie-status-no-fill bowtie-no-fill-not-applicable bowtie-icon-small";
            this._iconClassNames[TestOutcome.Paused] = "bowtie-status-pause bowtie-icon-small";
            this._iconClassNames[TestOutcome.InProgress] = "bowtie-status-run bowtie-icon-small";
            this._iconClassNames[TestOutcome.NotImpacted] = "bowtie-not-impacted bowtie-icon-small";
        }
        return this._iconClassNames[outcome];
    }

    public static getOutcomeToEnum(outcome) {
        if (!this._OutcomeToEnum) {
            this._OutcomeToEnum = {};
            this._OutcomeToEnum["Unspecified"] = 0;
            this._OutcomeToEnum["None"] = 1;
            this._OutcomeToEnum["Passed"] = 2;
            this._OutcomeToEnum["Failed"] = 3;
            this._OutcomeToEnum["Inconclusive"] = 4;
            this._OutcomeToEnum["Timeout"] = 5;
            this._OutcomeToEnum["Aborted"] = 6;
            this._OutcomeToEnum["Blocked"] = 7;
            this._OutcomeToEnum["NotExecuted"] = 8;
            this._OutcomeToEnum["Warning"] = 9;
            this._OutcomeToEnum["Error"] = 10;
            this._OutcomeToEnum["NotApplicable"] = 11;
            this._OutcomeToEnum["Paused"] = 12;
            this._OutcomeToEnum["InProgress"] = 13;
            this._OutcomeToEnum["NotImpacted"] = 14;
        }
        return this._OutcomeToEnum[outcome];
    }

    constructor() {
    }
}

export class TestResultState {

    private static _friendlyNames: any = null;
    private static _StateToEnum: any = null;

    public static Unspecified: number = 0;
    public static Pending: number = 1;
    public static Queued: number = 2;
    public static InProgress: number = 3;
    public static Paused: number = 4;
    public static Completed: number = 5;
    public static NotImpacted: number = 14;

    public static getFriendlyName(resultState) {
        if (!this._friendlyNames) {
            this._friendlyNames = {};
            this._friendlyNames[TestResultState.Unspecified] = Resources.ResultStateUnspecified;
            this._friendlyNames[TestResultState.Pending] = Resources.ResultStatePending;
            this._friendlyNames[TestResultState.Queued] = Resources.ResultStateQueued;
            this._friendlyNames[TestResultState.InProgress] = Resources.ResultStateInProgress;
            this._friendlyNames[TestResultState.Paused] = Resources.ResultStatePaused;
            this._friendlyNames[TestResultState.Completed] = Resources.ResultStateCompleted;
            this._friendlyNames[TestResultState.NotImpacted] = Resources.ResultStateNotImpacted;
        }
        return this._friendlyNames[resultState];
    }

    public static getStateToEnum(state) {
        if (!this._StateToEnum) {
            this._StateToEnum = {};
            this._StateToEnum["Unspecified"] = 0;
            this._StateToEnum["Pending"] = 1;
            this._StateToEnum["Queued"] = 2;
            this._StateToEnum["InProgress"] = 3;
            this._StateToEnum["Paused"] = 4;
            this._StateToEnum["Completed"] = 5;
            this._StateToEnum["NotImpacted"] = 14;
        }
        return this._StateToEnum[state];
    }

    constructor() {
    }
}

export class TestRunState {

    private static _friendlyNames: any = null;
    private static _iconClassNames: any = null;
    private static _StateToEnum: IDictionaryStringTo<number> = null;

    public static Unspecified: number = 0;
    public static NotStarted: number = 1;
    public static InProgress: number = 2;
    public static Completed: number = 3;
    public static Aborted: number = 4;
    public static Waiting: number = 5;
    public static NeedsInvestigation: number = 6;

    public static getStateToEnum(state: string) {
        if (!this._StateToEnum) {
            this._StateToEnum = {};
            this._StateToEnum["unspecified"] = 0;
            this._StateToEnum["notstarted"] = 1;
            this._StateToEnum["inprogress"] = 2;
            this._StateToEnum["completed"] = 3;
            this._StateToEnum["aborted"] = 4;
            this._StateToEnum["waiting"] = 5;
            this._StateToEnum["needsinvestigation"] = 5;
        }
        return this._StateToEnum[state.toLowerCase()];
    }

    public static getFriendlyName(state) {
        if (!this._friendlyNames) {
            this._friendlyNames = {};
            this._friendlyNames[TestRunState.Unspecified] = Resources.TestRunStateUnspecified;
            this._friendlyNames[TestRunState.NotStarted] = Resources.TestRunStateNotStarted;
            this._friendlyNames[TestRunState.InProgress] = Resources.TestRunStateInProgress;
            this._friendlyNames[TestRunState.Completed] = Resources.TestRunStateCompleted;
            this._friendlyNames[TestRunState.Aborted] = Resources.TestRunStateAborted;
            this._friendlyNames[TestRunState.Waiting] = Resources.TestRunStateWaiting;
            this._friendlyNames[TestRunState.NeedsInvestigation] = Resources.TestRunStateNeedsInvestigation;
        }
        return this._friendlyNames[state];
    }

    public static getIconClassName(state: number, isPartiallyPassed?: boolean) {
        let iconClassName: string;

        if (!this._iconClassNames) {
            this._iconClassNames = {};
            this._iconClassNames[TestRunState.Unspecified] = "bowtie-icon bowtie-status-help bowtie-icon-small";
            this._iconClassNames[TestRunState.NotStarted] = "bowtie-icon bowtie-status-waiting bowtie-icon-small";
            this._iconClassNames[TestRunState.InProgress] = "bowtie-icon bowtie-status-run bowtie-icon-small";
            this._iconClassNames[TestRunState.Completed] = "bowtie-icon bowtie-status-success bowtie-icon-small";
            this._iconClassNames[TestRunState.Aborted] = "bowtie-icon bowtie-status-stop bowtie-icon-small";
            this._iconClassNames[TestRunState.Waiting] = "bowtie-icon bowtie-status-waiting bowtie-icon-small";
            this._iconClassNames[TestRunState.NeedsInvestigation] = "bowtie-icon bowtie-status-info bowtie-icon-small";
        }

        if (state === TestRunState.Completed) {
            iconClassName = (isPartiallyPassed) ? "bowtie-icon partially-succeeded bowtie-status-warning bowtie-icon-small" : this._iconClassNames[TestRunState.Completed];
        }
        else {
            iconClassName = this._iconClassNames[state];
        }

        return iconClassName;
    }

    constructor() {
    }
}
// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.RunsView.ValueMap", exports);
