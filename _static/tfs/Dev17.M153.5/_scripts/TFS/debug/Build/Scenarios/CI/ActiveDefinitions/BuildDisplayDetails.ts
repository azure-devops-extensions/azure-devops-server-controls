import { VssIconType } from "VSSUI/VssIcon";
import * as Resources from "Build/Scripts/Resources/TFS.Resources.Build";
import {
    Build,
    BuildDefinition,
    BuildResult,
    BuildReason,
    BuildStatus
} from "TFS/Build/Contracts";

export interface BuildStatusDisplayDetails {
    text: string;
    iconType: VssIconType;
    iconName: string;
    className: string;
}

export function getBuildStatusDisplayDetails(item: Build): BuildStatusDisplayDetails {
    if (item) {
        switch (item.status) {
            case BuildStatus.Completed: {
                switch (item.result) {
                    case BuildResult.Succeeded:
                        return {
                            text: Resources.BuildStatusTextSucceeded,
                            iconType: VssIconType.fabric,
                            iconName: "SkypeCircleCheck",
                            className: "ci-success-color build-status-icon"
                        };
                    case BuildResult.PartiallySucceeded:
                        return {
                            text: Resources.BuildStatusTextPartiallySucceeded,
                            iconType: VssIconType.fabric,
                            iconName: "AlertSolid",
                            className: "ci-warning-color build-status-icon"
                        };
                    case BuildResult.Failed:
                        return {
                            text: Resources.BuildStatusTextFailed,
                            iconType: VssIconType.fabric,
                            iconName: "StatusErrorFull",
                            className: "ci-failure-color build-status-icon"
                        };
                    case BuildResult.Canceled:
                        return {
                            text: Resources.BuildStatusTextCanceled,
                            iconType: VssIconType.bowtie,
                            iconName: "bowtie-status-stop-outline",
                            className: "ci-no-color build-status-icon"
                        };
                }
            }
            case BuildStatus.Cancelling: {
                return {
                    text: Resources.BuildStatusTextCancelling,
                    iconType: VssIconType.bowtie,
                    iconName: "bowtie-status-stop-outline",
                    className: "ci-no-color build-status-icon"
                };
            }
            case BuildStatus.InProgress: {
                return {
                    text: Resources.BuildStatusTextInProgress,
                    iconType: VssIconType.fabric,
                    iconName: "Spinner",
                    className: "ci-running-color build-status-icon"
                };
            }
            case BuildStatus.NotStarted: {
                return {
                    text: Resources.BuildStatusTextQueued,
                    iconType: VssIconType.fabric,
                    iconName: "BuildQueue",
                    className: "ci-no-color build-status-icon"
                };
            }
        }
    }

    return {
        text: "",
        iconType: VssIconType.fabric,
        iconName: null,
        className: ""
    };
}
