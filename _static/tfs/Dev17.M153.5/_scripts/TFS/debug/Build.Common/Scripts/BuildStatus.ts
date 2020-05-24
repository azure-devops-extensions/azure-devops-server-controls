import {BuildResult, DisplayValues} from "Build.Common/Scripts/BuildResult";
import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");

import * as BuildContracts from "TFS/Build/Contracts";

import {isMinDate} from "VSS/Utils/Date";

export module BuildStatus {
    let _statusMap: IDictionaryNumberTo<DisplayValues> = null;

    // TODO: remove this when the Explorer tab goes away
    export function getName(status: BuildContracts.BuildStatus, display: boolean = false): string {
        return display ? getDisplayText(status, 0) : getTextClassName(status, 0);
    }

    export function getIconClassName(status: BuildContracts.BuildStatus, result: BuildContracts.BuildResult): string {
        let statusValues = getDisplayValues(status, result);
        if (statusValues) {
            return statusValues.iconClassName;
        }
        else {
            return "";
        }
    }

    export function getTextClassName(status: BuildContracts.BuildStatus, result: BuildContracts.BuildResult): string {
        let statusValues = getDisplayValues(status, result);
        if (statusValues) {
            return statusValues.textClassName;
        }
        else {
            return "";
        }
    }

    export function getDisplayText(status: BuildContracts.BuildStatus, result: BuildContracts.BuildResult): string {
        let statusValues = getDisplayValues(status, result);
        if (statusValues) {
            return statusValues.text;
        }
        else {
            return "";
        }
    }

    export function isFinished(status: BuildContracts.BuildStatus, finishTime: Date): boolean {
        return ((!!finishTime && isMinDate(finishTime))
            || status === BuildContracts.BuildStatus.Completed);
    }

    export function getDisplayValues(status: BuildContracts.BuildStatus, result: BuildContracts.BuildResult): DisplayValues {
        _ensureMaps();

        let displayValues: DisplayValues = null;
        if (status) {
            if (status === BuildContracts.BuildStatus.Completed) {
                if (result) {
                    displayValues = BuildResult.getDisplayValues(result);
                }
            }
            else {
                displayValues = _statusMap[status];
            }
        }

        if (displayValues) {
            // copy
            return {
                iconClassName: displayValues.iconClassName,
                textClassName: displayValues.textClassName,
                text: displayValues.text
            };
        }
        else {
            return {
                iconClassName: "",
                textClassName: "",
                text: ""
            };
        }
    }

    function _ensureMaps() {
        if (!_statusMap) {
            let statusMap: IDictionaryNumberTo<DisplayValues> = {};
            statusMap[BuildContracts.BuildStatus.InProgress] = {
                iconClassName: "build-brand-icon-color bowtie-icon bowtie-play-fill",
                textClassName: "inprogress",
                text: BuildCommonResources.BuildStatusInProgress
            };

            statusMap[BuildContracts.BuildStatus.NotStarted] = {
                iconClassName: "build-muted-icon-color bowtie-icon bowtie-build-queue",
                textClassName: "queued",
                text: BuildCommonResources.BuildStatusNotStarted
            };

            statusMap[BuildContracts.BuildStatus.Postponed] = {
                iconClassName: "build-muted-icon-color bowtie-icon bowtie-build-queue",
                textClassName: "postponed",
                text: BuildCommonResources.BuildStatusPostponed
            };

            statusMap[BuildContracts.BuildStatus.Cancelling] = {
                iconClassName: "build-muted-icon-color bowtie-icon bowtie-status-stop-outline",
                textClassName: "canceled",
                text: BuildCommonResources.BuildStatusCancelling
            };

            _statusMap = statusMap;
        }
    }
}