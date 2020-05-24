
//----------------------------------------------------------
// Generated file, DO NOT EDIT.

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.TestManagement.Client
// Microsoft.TeamFoundation.TestManagement.Common
//----------------------------------------------------------


export enum TcmProperty {
    None = 0,
    UsedWebGridViewForAuthoring = 1,
}

export enum TestOutcome {
    Unspecified = 0,
    None = 1,
    Passed = 2,
    Failed = 3,
    Inconclusive = 4,
    Timeout = 5,
    Aborted = 6,
    Blocked = 7,
    NotExecuted = 8,
    Warning = 9,
    Error = 10,
    NotApplicable = 11,
    Paused = 12,
    MaxValue = 12,
}

export enum TestPointState {
    None = 0,
    Ready = 1,
    Completed = 2,
    NotReady = 3,
    InProgress = 4,
    MaxValue = 4,
}

export enum TestResultState {
    Unspecified = 0,
    Pending = 1,
    Queued = 2,
    InProgress = 3,
    Paused = 4,
    Completed = 5,
    MaxValue = 5,
}

export enum TestRunState {
    Unspecified = 0,
    NotStarted = 1,
    InProgress = 2,
    Completed = 3,
    Aborted = 4,
    Waiting = 5,
    NeedsInvestigation = 6,
    MaxValue = 6,
}

export enum TestSuiteState {
    None = 0,
    InPlanning = 1,
    InProgress = 2,
    Completed = 3,
}

export enum TestSuiteType {
    None = 0,
    DynamicTestSuite = 1,
    StaticTestSuite = 2,
    RequirementTestSuite = 3,
}

export module WitLinkTypes {
    export var TestResult = "Test Result";
    export var TestResultAttachment = "Result Attachment";
    export var Session = "Session";
    export var Test = "Test";
}

export module WorkItemFieldNames {
    export var Actions = "Microsoft.VSTS.TCM.Steps";
    export var ActivatedBy = "Microsoft.VSTS.Common.ActivatedBy";
    export var ActivatedDate = "Microsoft.VSTS.Common.ActivatedDate";
    export var AutomationStatus = "Microsoft.VSTS.TCM.AutomationStatus";
    export var ClosedBy = "Microsoft.VSTS.Common.ClosedBy";
    export var ClosedDate = "Microsoft.VSTS.Common.ClosedDate";
    export var DataField = "Microsoft.VSTS.TCM.LocalDataSource";
    export var Description = "System.Description";
    export var IntegrationBuild = "Microsoft.VSTS.Build.IntegrationBuild";
    export var Owner = "System.AssignedTo";
    export var Parameters = "Microsoft.VSTS.TCM.Parameters";
    export var Priority = "Microsoft.VSTS.Common.Priority";
    export var StateChangeDate = "Microsoft.VSTS.Common.StateChangeDate";
    export var Storage = "Microsoft.VSTS.TCM.AutomatedTestStorage";
    export var TestId = "Microsoft.VSTS.TCM.AutomatedTestId";
    export var TestName = "Microsoft.VSTS.TCM.AutomatedTestName";
    export var TestType = "Microsoft.VSTS.TCM.AutomatedTestType";
    export var WorkItemType = "System.WorkItemType";
    export var TestIdIsNotNull = "Microsoft.VSTS.TCM.AutomatedTestId.IsNotNull";
}

export module TestSessionPropertyBagKeys {
    export var requirementId = "RequirementId";
    export var testPlanId = "TestPlanId";
    export var testSettingsId = "TestSettingsId";
}

export module TelemetryData {
    export var OpenTestPlanWITFeature = "OpenTestPlanWIT";
    export var OpenTestSuiteWITFeature = "OpenTestSuiteWIT";
}

export module ExportHtml {
    export var TestSuitesLimit = 75;
}

