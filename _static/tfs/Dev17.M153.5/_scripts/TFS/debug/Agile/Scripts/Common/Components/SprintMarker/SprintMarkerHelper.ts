import { IterationTimeframe } from "Agile/Scripts/Models/Iteration";
import { css } from "OfficeFabric/Utilities";
import * as AgileControlsResources from "Agile/Scripts/Resources/TFS.Resources.AgileControls";

export const PAST_SPRINT_CLASS = "past-sprint";
export const CURRENT_SPRINT_CLASS = "current-sprint";
export const FUTURE_SPRINT_CLASS = "future-sprint";

export function mapToMarkerData(type: IterationTimeframe): { text: string, cssClass: string } {
    switch (type) {
        case IterationTimeframe.Past:
            return { text: AgileControlsResources.PastMarkerText, cssClass: css("sprint-marker", PAST_SPRINT_CLASS) };
        case IterationTimeframe.Current:
            return { text: AgileControlsResources.CurrentMarkerText, cssClass: css("sprint-marker", CURRENT_SPRINT_CLASS) };
        case IterationTimeframe.Future:
            return { text: AgileControlsResources.FutureMarkerText, cssClass: css("sprint-marker", FUTURE_SPRINT_CLASS) };
        default:
            throw new Error("Unknown Type");
    }
}
