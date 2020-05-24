import * as TCMContracts from "TFS/TestManagement/Contracts";
import { RunOutcome } from "TestManagement/Scripts/Scenarios/TestTabExtension/CommonHelper";


export class TestReportColorPalette {

    public static Failed = "#F15854";
    public static ExisitingFailures = "#F5A9A9";
    public static Passed = "#60BD68";
    public static NotImpacted = "#F9C900";
    public static OtherOutcome = "#787878";
    public static Duration = "#5DA5DA";
    public static TotalTests = "#B276B2";
}

export interface ITreeItem {
    nodeType?: TreeNodeType;
    depth?: number;
    expanded?: boolean;
    key?: any;
}

export enum TreeNodeType {
    leaf = 1,
    group,
    showMore
}

export class TestOutcomeIcon {

    public static getIconDetails(outcome: TCMContracts.TestOutcome): IconDetails {
        if (!this._iconClassNames) {
            this._iconClassNames = {};
            this._iconClassNames[TCMContracts.TestOutcome.Unspecified] = { iconName: "Help", className: "icon-inconclusive" };
            this._iconClassNames[TCMContracts.TestOutcome.None] = { iconName: "Remove", className: "icon-inconclusive" };
            this._iconClassNames[TCMContracts.TestOutcome.Passed] = { iconName: "CheckMark", className: "icon-passed" };
            this._iconClassNames[TCMContracts.TestOutcome.Failed] = { iconName: "Cancel", className: "icon-failed" };
            this._iconClassNames[TCMContracts.TestOutcome.Inconclusive] = { iconName: "Unknown", className: "icon-inconclusive" };
            this._iconClassNames[TCMContracts.TestOutcome.Timeout] = { iconName: "Clock", className: "icon-inconclusive" };
            this._iconClassNames[TCMContracts.TestOutcome.Aborted] = { iconName: "CircleStop", className: "icon-failed" };
            this._iconClassNames[TCMContracts.TestOutcome.Blocked] = { iconName: "Blocked2", className: "icon-failed" };
            this._iconClassNames[TCMContracts.TestOutcome.NotExecuted] = { iconName: "NotExecuted", className: "icon-inconclusive" };
            this._iconClassNames[TCMContracts.TestOutcome.Warning] = { iconName: "Warning", className: "icon-warning" };
            this._iconClassNames[TCMContracts.TestOutcome.Error] = { iconName: "Error", className: "icon-failed" };
            this._iconClassNames[TCMContracts.TestOutcome.NotApplicable] = { iconName: "Blocked", className: "icon-inconclusive" };
            this._iconClassNames[TCMContracts.TestOutcome.Paused] = { iconName: "CirclePause", className: "icon-inconclusive" };
            this._iconClassNames[TCMContracts.TestOutcome.InProgress] = { iconName: "MSNVideos", className: "icon-inprogress" };
            this._iconClassNames[TCMContracts.TestOutcome.NotImpacted] = { iconName: "NotImpactedSolid", className: "icon-inconclusive" };
        }
        return (outcome) ? this._iconClassNames[outcome] : this._iconClassNames[TCMContracts.TestOutcome.None];
    }

    public static mapTestOutcomeStringToEnum(outcome: string): TCMContracts.TestOutcome {
        switch (outcome) {
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Unspecified]:
                return TCMContracts.TestOutcome.Unspecified;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.None]:
                return TCMContracts.TestOutcome.None;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Passed]:
                return TCMContracts.TestOutcome.Passed;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Failed]:
                return TCMContracts.TestOutcome.Failed;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Inconclusive]:
                return TCMContracts.TestOutcome.Inconclusive;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Timeout]:
                return TCMContracts.TestOutcome.Timeout;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Aborted]:
                return TCMContracts.TestOutcome.Aborted;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Blocked]:
                return TCMContracts.TestOutcome.Blocked;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.NotExecuted]:
                return TCMContracts.TestOutcome.NotExecuted;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Warning]:
                return TCMContracts.TestOutcome.Warning;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Error]:
                return TCMContracts.TestOutcome.Error;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.NotApplicable]:
                return TCMContracts.TestOutcome.NotApplicable;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.Paused]:
                return TCMContracts.TestOutcome.Paused;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.InProgress]:
                return TCMContracts.TestOutcome.InProgress;
            case TCMContracts.TestOutcome[TCMContracts.TestOutcome.NotImpacted]:
                return TCMContracts.TestOutcome.NotImpacted;
            default:
                return TCMContracts.TestOutcome.None;
        }
    }

    private static _iconClassNames: IDictionaryNumberTo<IconDetails>;
}

export class IconDetails {
    public iconName: string;
    public className: string;
}

export interface ITestResultTreeData extends ITreeItem {
    storage: string;
    test?: string;
    testTitle?: string;
    failingSince?: string;
    resolution?: string;
    activeBugs?: string[];
    isNewFailure?: boolean;
    runId?: number;
    resultId?: number;
    testcaseObject?: TCMContracts.ShallowReference;
    testCaseRefId?: number;
    failingContextId?: number;
    failingContextName?: string;
    isTestCaseRow?: boolean;
    outcome?: TCMContracts.TestOutcome;
    runOutcome?: RunOutcome;
    duration?: string;
    durationInMs?: number;
    dateStarted?: string;
    dateCompleted?: string;
    owner?: string;
    environmentName?: string;
    isUnreliable?: boolean;
    groupId?: string;
    parentGroupId?: string;
    totalTestsCount?: number;
    filteredTestsCount?: number;
    subresults?: TCMContracts.TestSubResult[];
    subResultId?: number;
    isCurrentArtifact?: boolean;
}
