import * as Locations from "VSS/Locations";

export namespace GeneralZeroDataIllustrationPaths {
    export const SomethingWrongOnServer = "Illustrations/general-something-wrong-on-server.svg";
}

export namespace WorkZeroDataIllustrationPaths {
    export const ChartingNotSupported = "Illustrations/zerodata-charting-not-supported.svg";
    export const CustomRules = "Illustrations/zerodata-custom-rules.svg";
    export const GetBackToRecentWork = "Illustrations/zerodata-get-back-to-recent-work.svg";
    export const GetStartedWithSprints = "Illustrations/zerodata-get-started-with-sprint.svg";
    export const InvalidWorkItemType = "Illustrations/zerodata-invalid-workitem-type.svg";
    export const KeepAnEyeOnImportantWork = "Illustrations/zerodata-keep-an-eye-on-important-work.svg";
    export const MentionSomeone = "Illustrations/zerodata-mention-someone.svg";
    export const NoCharts = "Illustrations/zerodata-no-charts.svg";
    export const UnsavedQuery = "Illustrations/zerodata-unsaved-query.svg";
    export const WorkItemNotFound = "Illustrations/zerodata-workitem-not-found.svg";
    export const YourWorkInOnePlace = "Illustrations/zerodata-your-work-in-one-place.svg";
    export const QueryNoResultFound = "Illustrations/general-no-results-found.svg";
    export const NoPlan = "Illustrations/zerodata-no-plan.svg";
    export const InitializingTestResults = "Illustrations/zerodata-initializing-test-results.svg";
    export const NoWorkScheduled = "Illustrations/zerodata-no-work-scheduled.svg";
    export const SprintDragAndDrop = "Illustrations/zerodata-sprint-drag-n-drop.svg";
    export const ConfigurationRequired = "Illustrations/zerodata-feature-not-configured.svg";
}

export namespace WorkWidgetIllustrationPaths {
    export const YouDontHavePermission = "Illustrations/widget-you-dont-have-permission.svg";
}

export namespace WorkIllustrationUrlUtils {
    export function getIllustrationImageUrl(path: string): string {
        return Locations.urlHelper.getVersionedContentUrl(path);
    }
}
