import Agile_Controls_Resources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");

// tcm client and data contracts
export interface ITestPoint {
    testCaseId: number;
    testPointId: number;
    testCaseTitle: string;
    outcome: string;
    sequenceNumber: number;
}

export interface ITestSuite {
    requirementId: number;
    testSuiteId: number;
    testPlanId: number;
    testPoints: ITestPoint[];
}

export enum TestOutcome {
    Active,
    Passed,
    Failed,
    Blocked,
    NotApplicable,
    Paused,
    InProgress
}

export class TestOutcomeHelper {

    public static toByte(outcome: TestOutcome): number {
        switch (outcome) {
            case TestOutcome.Active:
                return 1;
            case TestOutcome.Passed:
                return 2;
            case TestOutcome.Failed:
                return 3;
            case TestOutcome.Blocked:
                return 7;
            case TestOutcome.NotApplicable:
                return 11;
            case TestOutcome.Paused:
                return 12;
            case TestOutcome.InProgress:
                return 13;
            default:
                return 1;
        }
    }

    public static fromString(outcome: string): TestOutcome {
        switch (outcome) {
            case Agile_Controls_Resources.TestOutcome_Active:
                return TestOutcome.Active;
            case Agile_Controls_Resources.TestOutcome_Passed:
                return TestOutcome.Passed;
            case Agile_Controls_Resources.TestOutcome_Failed:
                return TestOutcome.Failed;
            case Agile_Controls_Resources.TestOutcome_Blocked:
                return TestOutcome.Blocked;
            case Agile_Controls_Resources.TestOutcome_NotApplicable:
                return TestOutcome.NotApplicable;
            case Agile_Controls_Resources.TestOutcome_Paused:
                return TestOutcome.Paused;
            case Agile_Controls_Resources.TestOutcome_InProgress:
                return TestOutcome.InProgress;
            default:
                return TestOutcome.Active;
        }
    }

    public static GetOutcomeText(outcome: number): string {
        switch (outcome) {
            case TestOutcome.Passed:
                return Agile_Controls_Resources.TestOutcome_Passed;
            case TestOutcome.Failed:
                return Agile_Controls_Resources.TestOutcome_Failed;
            case TestOutcome.Blocked:
                return Agile_Controls_Resources.TestOutcome_Blocked;
            case TestOutcome.NotApplicable:
                return Agile_Controls_Resources.TestOutcome_NotApplicable;
            case TestOutcome.Paused:
                return Agile_Controls_Resources.TestOutcome_Paused;
            case TestOutcome.InProgress:
                return Agile_Controls_Resources.TestOutcome_InProgress;
            case TestOutcome.Active:
                return Agile_Controls_Resources.TestOutcome_Active;
            default:
                return "";
        }
    }
}

export var testCaseWorkItemType = "Test Case";



