import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { FilterState, FilterValue, IFilter } from "TestManagement/Scripts/Scenarios/Common/TestResultsFilter/TestResults.Filtering.Common";
import * as Common from "TestManagement/Scripts/TestReporting/TestTabExtension/Common";
import * as TCMPermissionUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils";
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import * as Contracts from "TFS/TestManagement/Contracts";
import * as Utils_String from "VSS/Utils/String";

export class Constants {
    public static pageSize: number = 100;
    public static batchResultsSize: number = 100000;
    public static loadMoreAction: string = "loadMoreAction";
    public static filterchangedAction: string = "filterChangedAction";
    public static groupByChangedAction: string = "groupByChangedAction";
    public static maxDepthAllowed: number = 3;
}

export class GroupByPivotHelper {

    public static getGroupByOptions() {

        let groupByOptions = [];
        groupByOptions.push(
            {
                key: Common.TestResultsGroupPivots.Group_By_Test_Run,
                name: Resources.TestRunText
            });
        groupByOptions.push(
            {
                key: Common.TestResultsGroupPivots.Group_By_Container,
                name: Resources.TestFileText
            });
        groupByOptions.push(
            {
                key: Common.TestResultsGroupPivots.Group_By_Priority,
                name: Resources.PriorityText
            });
        // Adding Group By Requirement and Suite only in case of member user and workService is enabled
        if (TCMPermissionUtils.PermissionUtils.isMember() && TCMPermissionUtils.PermissionUtils.isWorkServiceEnabled()) {
            groupByOptions.push(
                {
                    key: Common.TestResultsGroupPivots.Group_By_Requirement,
                    name: Resources.RequirementText
                });
            groupByOptions.push(
                {
                    key: Common.TestResultsGroupPivots.Group_By_Test_Suite,
                    name: Resources.TestSuiteText
                });
        }
        groupByOptions.push(
            {
                key: Common.TestResultsGroupPivots.Group_By_Owner,
                name: Resources.Owner
            });
        groupByOptions.push(
            {
                key: Common.TestResultsGroupPivots.Group_By_None,
                name: Resources.NoneText
            });

        return groupByOptions;
	}

    public static getDefaultGroupByOption() {
        return Common.TestResultsGroupPivots.Group_By_Test_Run;
    }

    public static getRunId(groupedResult: Contracts.TestResultsDetailsForGroup, field: string): number {
        return Utils_String.equals(field, Common.TestResultsGroupPivots.Group_By_Test_Run)
            ?  parseInt(groupedResult.groupByValue.id)
            : 0;
    }

    /// <summary>
    /// Returns pivot value for the groups.
    /// </summary>
    public static getPivotValueForGroupValue(groupedResult: Contracts.TestResultsDetailsForGroup, feild: string) {

        let groupByValue: string;
        switch (feild) {
            case Common.TestResultsGroupPivots.Group_By_Test_Run:
                const testRun = groupedResult.groupByValue;
                groupByValue = testRun.name;
                break;

            case Common.TestResultsGroupPivots.Group_By_Test_Suite:
                const testSuite = <Contracts.TestSuite>groupedResult.groupByValue;
                groupByValue = (testSuite.id === 0) ? Utils_String.empty : testSuite.name;
                break;

            case Common.TestResultsGroupPivots.Group_By_Requirement:
                const workItem = <Contracts.WorkItemReference>groupedResult.groupByValue;
                const workItemId: number = parseInt(workItem.id);
                groupByValue = (workItemId === 0) ? Utils_String.empty : workItem.name;
                break;

            case Common.TestResultsGroupPivots.Group_By_Container:
            case Common.TestResultsGroupPivots.Group_By_Priority:
            case Common.TestResultsGroupPivots.Group_By_None:
            case Common.TestResultsGroupPivots.Group_By_Owner:
                groupByValue = <string>groupedResult.groupByValue;
                break;
        }

        return GroupByPivotHelper.getPivotValue(feild, groupByValue);
    }

    private static getPivotValue(pivot: string, pivotValue: string): string {
        let displayPivotValue: string = Utils_String.empty;
        switch (pivot) {
            case Common.TestResultsGroupPivots.Group_By_Container:
                displayPivotValue = pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_Test_Run:
                displayPivotValue = pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_Requirement:
                displayPivotValue = Utils_String.equals(pivotValue, Utils_String.empty) ? Resources.NotAssociatedText : pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_Test_Suite:
                displayPivotValue = pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_Priority:
                displayPivotValue = Utils_String.equals("255", pivotValue) ? Utils_String.empty : Utils_String.format("{0}: {1}", Resources.PriorityText, pivotValue);
                break;
            case Common.TestResultsGroupPivots.Group_By_Owner:
                displayPivotValue = pivotValue;
                break;
            case Common.TestResultsGroupPivots.Group_By_None:
                displayPivotValue = Resources.AllText;
                break;
            default:
                break;
        }

        if (Utils_String.equals(displayPivotValue, Utils_String.empty)) {
            displayPivotValue = Resources.UnspecifiedText;
        }

        return displayPivotValue;
    }
}

export class TestOutcome {
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

    public static getIconDetails(outcome) {
        if (!this._iconClassNames) {
            this._iconClassNames = {};
            this._iconClassNames[TestOutcome.Unspecified] = { iconName: "Help", className: "icon-inconclusive" };
            this._iconClassNames[TestOutcome.None] = { iconName: "Remove", className: "icon-inconclusive" };
            this._iconClassNames[TestOutcome.Passed] = { iconName: "CheckMark", className: "icon-passed" };
            this._iconClassNames[TestOutcome.Failed] = { iconName: "Cancel", className: "icon-failed" };
            this._iconClassNames[TestOutcome.Inconclusive] = { iconName: "Unknown", className: "icon-inconclusive" };
            this._iconClassNames[TestOutcome.Timeout] = { iconName: "Clock", className: "icon-inconclusive" };
            this._iconClassNames[TestOutcome.Aborted] = { iconName: "CircleStop", className: "icon-failed" };
            this._iconClassNames[TestOutcome.Blocked] = { iconName: "Blocked2", className: "icon-failed" };
            this._iconClassNames[TestOutcome.NotExecuted] = { iconName: "NotExecuted", className: "icon-inconclusive" };
            this._iconClassNames[TestOutcome.Warning] = { iconName: "Warning", className: "icon-warning" };
            this._iconClassNames[TestOutcome.Error] = { iconName: "Error", className: "icon-failed" };
            this._iconClassNames[TestOutcome.NotApplicable] = { iconName: "Blocked", className: "icon-inconclusive" };
            this._iconClassNames[TestOutcome.Paused] = { iconName: "CirclePause", className: "icon-inconclusive" };
            this._iconClassNames[TestOutcome.InProgress] = { iconName: "MSNVideos", className: "icon-inprogress" };
            this._iconClassNames[TestOutcome.NotImpacted] = { iconName: "NotImpactedSolid", className: "icon-inconclusive" };
        }
        return (outcome) ? this._iconClassNames[outcome] : this._iconClassNames[TestOutcome.None];
    }

    private static _iconClassNames = null;
}

export class IconDetails {
    public iconName: string;
    public className: string;
}

export class FilterHelper {
    /**
     * generates filter string for the given filter state
     * Filter string format: Outcome eq 1,2 and Owner eq owner1,owner2
     * @param filterState
     */
    public static generateFilterString(filterState: FilterState): string {
        let andFilterStrings: string[] = [];
        for (let filterType in filterState) {
            let selectedFilterValues: IFilter = filterState[filterType];
            if (selectedFilterValues.values.length) {

                let oDataString: string;
                // Sort the values so as to avoid sending request to server for every permutation
                selectedFilterValues.values.sort();

                switch (filterType) {
                    case Common.FilterByFields.Outcome:
                        oDataString = "Outcome eq {0}";
                        let outcomes: string[] = selectedFilterValues.values.map((outcomeFilter: string) => this._getOutcomeFilterString(outcomeFilter));
                        andFilterStrings.push(Utils_String.format(oDataString, outcomes.join(",")));
                        break;
                    case Common.FilterByFields.Owner:
                        oDataString = "Owner eq {0}";
                        let ownerValues = selectedFilterValues.values.join(",");
                        if (Utils_String.equals(ownerValues, Utils_String.empty)) {
                            // Workaround when only unspecified owner is selected in owner filter
                            ownerValues = ",";
                        }
                        andFilterStrings.push(Utils_String.format(oDataString, ownerValues));
                        break;
                    case Common.FilterByFields.Container:
                        oDataString = "AutomatedTestStorage eq {0}";
                        let containerValues = selectedFilterValues.values.join(",");
                        if (Utils_String.equals(containerValues, Utils_String.empty)) {
                            // Workaround when only unspecified container is selected in container filter
                            containerValues = ",";
                        }
                        andFilterStrings.push(Utils_String.format(oDataString, containerValues));
                        break;
                }
            }
        }
        return andFilterStrings.join(" and ");
    }

    public static getSearchText(filterState: FilterState): string {
        if (filterState && filterState.hasOwnProperty(Common.FilterByFields.TestCaseName)) {
            let selectedSearchTexts: IFilter = filterState[Common.FilterByFields.TestCaseName];
            if (selectedSearchTexts.values.length) {
                return selectedSearchTexts.values.join(",");
            }
        }
        return null;
    }

    public static getInitialFilterState(): FilterState {
        const initialFilterState: FilterState = {};
        let outcomeDefaultFilterValues: string[] = [];

        outcomeDefaultFilterValues.push(Common.TestResultsOutcomeFilterPivots.Filter_By_Failed);
        if (LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled()) {
            outcomeDefaultFilterValues.push(Common.TestResultsOutcomeFilterPivots.Filter_By_Aborted);
        }
        initialFilterState[Common.FilterByFields.Outcome] = {
            "values": outcomeDefaultFilterValues
        };
        return initialFilterState;
    }

    public static getOutcomeFilterDisplayName(result: FilterValue): string {
        let displayString: string = result.toString();
        switch (result) {
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Failed:
                displayString = Resources.TestResultsFilterByOutcomeFailed;
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Aborted:
                displayString = Resources.TestResultsFilterByOutcomeAborted;
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Passed:
                displayString = Resources.TestResultsFilterByOutcomePassed;
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_NotImpacted:
                displayString = Resources.TestResultsFilterByOutcomeNotImpacted;
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Others:
                displayString = Resources.TestResultsFilterByOutcomeOthers;
                break;
            case Common.TestResultsOutcomeFilterPivots.Filter_By_PassedOnRerun:
                displayString = Resources.TestResultsFilterByOutcomePassedOnRerun;
                break;
        }

        return displayString;
    }

    private static _getOutcomeFilterString(outcomeFilter: string): string {
        switch (outcomeFilter) {
            case Common.TestResultsOutcomeFilterPivots.Filter_By_Others:
                return Common.TestResultConstants.OTHER_OUTCOME_LIST.join(",");
            default:
                return outcomeFilter;
        }
    }
}

export class RunOutcome {

    private static _friendlyNames: any = null;
    private static _iconClassNames: any = null;
    private static _OutcomeToEnum: any = null;

    public static Unspecified: number = 0;
    public static Passed: number = 1;
    public static Failed: number = 2;
    public static Others: number = 3;
    public static Aborted: number = 4;
    public static InProgress: number = 5;
    public static NotImpacted: number = 6;

    public static getFriendlyName(outcome) {
        if (!this._friendlyNames) {
            this._friendlyNames = {};
            this._friendlyNames[RunOutcome.Unspecified] = Resources.TestRunStateUnspecified;
            this._friendlyNames[RunOutcome.Passed] = Resources.PassedText;
            this._friendlyNames[RunOutcome.Failed] = Resources.FailedText;
            this._friendlyNames[RunOutcome.Others] = Resources.OthersText;
            this._friendlyNames[RunOutcome.Aborted] = Resources.TestRunStateAborted;
            this._friendlyNames[RunOutcome.InProgress] = Resources.TestRunStateInProgress;
            this._friendlyNames[RunOutcome.NotImpacted] = Resources.ResultStateNotImpacted;
        }
        return this._friendlyNames[outcome];
    }

    public static getIconClassName(outcome) {
        if (!this._iconClassNames) {
            this._iconClassNames = {};
            this._iconClassNames[RunOutcome.Unspecified] = "bowtie-symbol-feedback-request bowtie-icon-small";
            this._iconClassNames[RunOutcome.Passed] = "bowtie-status-success bowtie-icon-small";
            this._iconClassNames[RunOutcome.Failed] = "bowtie-status-failure bowtie-icon-small";
            this._iconClassNames[RunOutcome.Others] = "bowtie-status-help bowtie-icon-small";
            this._iconClassNames[RunOutcome.Aborted] = "bowtie-status-stop bowtie-icon-small";
            this._iconClassNames[RunOutcome.InProgress] = "bowtie-status-run bowtie-icon-small";
            this._iconClassNames[RunOutcome.NotImpacted] = "bowtie-not-impacted bowtie-icon-small";
        }
        return this._iconClassNames[outcome];
    }

    public static getOutcomeToEnum(outcome) {
        if (!this._OutcomeToEnum) {
            this._OutcomeToEnum = {};
            this._OutcomeToEnum["Unspecified"] = 0;
            this._OutcomeToEnum["Passed"] = 1;
            this._OutcomeToEnum["Failed"] = 2;
            this._OutcomeToEnum["Others"] = 3;
            this._OutcomeToEnum["Aborted"] = 4;
            this._OutcomeToEnum["InProgress"] = 5;
            this._OutcomeToEnum["NotImpacted"] = 6;
        }
        return this._OutcomeToEnum[outcome];
    }

    public static getIconDetails(outcome) {
        if (!this._iconClassNames) {
            this._iconClassNames = {};
            this._iconClassNames[RunOutcome.Unspecified] = { iconName: "Help", className: "icon-inconclusive" };
            this._iconClassNames[RunOutcome.Passed] = { iconName: "CheckMark", className: "icon-passed" };
            this._iconClassNames[RunOutcome.Failed] = { iconName: "Cancel", className: "icon-failed" };
            this._iconClassNames[RunOutcome.Others] = { iconName: "Unknown", className: "icon-inconclusive" };
            this._iconClassNames[RunOutcome.Aborted] = { iconName: "CircleStop", className: "icon-failed" };
            this._iconClassNames[RunOutcome.InProgress] = { iconName: "MSNVideos", className: "icon-inprogress" };
            this._iconClassNames[RunOutcome.NotImpacted] = { iconName: "NotImpactedSolid", className: "icon-inconclusive" };
        }
        return (outcome) ? this._iconClassNames[outcome] : this._iconClassNames[RunOutcome.Others];
    }

    constructor() {
    }
}
