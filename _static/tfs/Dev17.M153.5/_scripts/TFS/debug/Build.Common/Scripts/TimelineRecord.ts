import BuildContracts = require("TFS/Build/Contracts");

/**
 * Gets a css class to represent a timeline record state
 * @param state The state
 * @param result The result. This is used when the state is Completed
 */
export function getTimelineRecordStateIconClass(state: BuildContracts.TimelineRecordState, result: BuildContracts.TaskResult) {
    switch (state) {
        case BuildContracts.TimelineRecordState.InProgress:
            return "build-brand-icon-color bowtie-icon bowtie-play-fill";
        case BuildContracts.TimelineRecordState.Completed:
            switch (result) {
                case BuildContracts.TaskResult.Succeeded:
                    return "build-success-icon-color bowtie-icon bowtie-check";
                case BuildContracts.TaskResult.SucceededWithIssues:
                    return "build-warning-icon-color bowtie-icon bowtie-status-warning";
                case BuildContracts.TaskResult.Failed:
                    return "build-failure-icon-color bowtie-icon bowtie-edit-delete";
                case BuildContracts.TaskResult.Canceled:
                    return "build-muted-icon-color bowtie-icon bowtie-status-stop-outline";
                case BuildContracts.TaskResult.Skipped:
                    return "build-muted-icon-color bowtie-icon bowtie-status-no";
                case BuildContracts.TaskResult.Abandoned:
                    return "build-muted-icon-color bowtie-icon bowtie-math-minus-light";
                default:
                    // state is completed, but there is no result. no icon
                    return "";
            }
        case BuildContracts.TimelineRecordState.Pending:
        default:
            return "build-muted-icon-color bowtie-icon bowtie-build-queue";
    }
}