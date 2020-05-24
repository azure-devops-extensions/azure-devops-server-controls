import * as Performance from "VSS/Performance";
import { TelemetryEventData } from "VSS/Telemetry/Services";

import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { CustomerIntelligenceData } from "VersionControl/Scripts/CustomerIntelligenceData";

export class ChangeDetailsPerfScenarios {
    public static CompareTab = "ChangeList.Details.CompareTabClick";
    public static Contents = "ChangeList.Details.ContentsTabClick";
    public static ChangesSummaryTab = "ChangeList.Details.ChangesSummaryTabClick";
    public static CommitDiffSummary = "ChangeList.Details.CommitDiffSummaryTabClick";
}

export class ChangeDetailsPerfSplitScenarios {
    public static ChangeListViewInitializeStart = "ChangelistView.initialize.start";
    public static ChangeListViewInitializeEnd = "ChangelistView.initialize.end";

    public static BeginGetItemStart = "ChangelistView.beginGetItem.start";
    public static BeginGetItemEnd = "ChangelistView.beginGetItem.end";

    public static GitMergeCommitParentChangeListLoadStart = "ChangelistView.gitMergeCommitParentChangeList.start";
    public static GitMergeCommitParentChangeListLoadEnd = "ChangelistView.gitMergeCommitParentChangeList.end";

    public static ChangesSummaryTabLoadBegin = "ChangesSummaryTabLoadBegin";
    public static ChangesSummaryTabLoadComplete = "ChangesSummaryTabLoadComplete";

    public static CommitDiffSummaryTabLoadBegin = "CommitDiffSummaryTabLoadBegin";
    public static CommitDiffSummaryTabLoadComplete = "CommitDiffSummaryTabLoadComplete";

    public static CompareTabLoadBegin = "CompareTabLoadBegin";
    public static CompareTabMountComplete = "CompareTabMountComplete";
    public static CompareTabLoadComplete = "CompareTabLoadComplete";

    public static ContentsTabLoadBegin = "ContentsTabLoadBegin";
    public static ContentsTabLoadComplete = "ContentsTabLoadComplete";
}

export class ChangeDetailsTelemetryFeatures {
    public static browseFiles = "ChangeList.Details.BrowseFiles";
    public static contextMenuItemAction = "ChangeList.Details.ContextMenuItemAction";
    public static diffSelection = "ChangeList.Details.DiffSelection";
    public static parentNavigation = "ChangeList.Details.ParentNavigation";
    public static fullScreen = "ChangeList.Details.FullScreen";
    public static showMore = "ChangeList.Details.ShowMoreChanges";
    public static SearchCommitInBranches = "ChangeList.Details.SearchCommitInBranches";
}

export class ChangeDetailsTelemetryProperties {
    public static actionMenuItemName = "MenuItem";
    public static parentIndex = "ParentIndex";
    public static selectedDiffAction = "SelectedDiffAction";
    public static fullScreenState = "State";
}

export class ChangeDetailsTelemetryPropertyValues {
    // actionMenuItem property values
    public static actionMenuItemRevert = "Revert";
    public static actionMenuItemCherryPick = "CherryPick";
    public static actionMenuItemNewBranch = "NewBranch";
    public static actionMenuItemNewTag = "NewTag";
    // fullscreen property values
    public static fullScreenStateOn = "On";
    public static fullScreenStateOff = "Off";
}

export function abortPerformanceScenario(performanceScenario: Performance.IScenarioDescriptor): void {
    if (performanceScenario && performanceScenario.isActive()) {
        performanceScenario.abort();
    }
}

export function addPerformanceScenarioSplitTiming(performanceScenario: Performance.IScenarioDescriptor, splitScenarioName: string): void {
    if (performanceScenario && performanceScenario.isActive()) {
        performanceScenario.addSplitTiming(splitScenarioName);
    }
}

export function getCustomerIntelligenceData(telemetryEventData?: TelemetryEventData): CustomerIntelligenceData {
    const ciData = new CustomerIntelligenceData();

    if (telemetryEventData) {
        ciData.area = telemetryEventData.area;
        ciData.properties = $.extend({}, telemetryEventData.properties);
    }

    return ciData;
}

export function getOrCreatePerformanceScenario(performanceScenario: Performance.IScenarioDescriptor, tabFeatureName: string): Performance.IScenarioDescriptor {
    let perfScenario = performanceScenario;

    if (!perfScenario || !perfScenario.isActive()) {
        perfScenario = Performance.getScenarioManager().startScenario(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            tabFeatureName);
    }

    return perfScenario;
}
