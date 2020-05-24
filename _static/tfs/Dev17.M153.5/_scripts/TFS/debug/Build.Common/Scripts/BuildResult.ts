import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");

import * as BuildContracts from "TFS/Build/Contracts";

export interface DisplayValues {
    iconClassName: string;
    textClassName: string;
    text: string;
}

export module BuildResult {
    let _resultMap: IDictionaryNumberTo<DisplayValues> = null;

    // TODO: remove this when the Explorer tab goes away
    export function getName(result: BuildContracts.BuildResult, display: boolean = false): string {
        return display ? getDisplayText(result) : getTextClassName(result);
    }

    export function getIconClassName(result: BuildContracts.BuildResult): string {
        let displayValues = getDisplayValues(result);
        if (displayValues) {
            return displayValues.iconClassName;
        }
        else {
            return "";
        }
    }

    export function getTextClassName(result: BuildContracts.BuildResult): string {
        let displayValues = getDisplayValues(result);
        if (displayValues) {
            return displayValues.textClassName;
        }
        else {
            return "";
        }
    }

    export function getLinkedBuildTextClassName (result: BuildContracts.BuildResult): string {
        return "build-" + getTextClassName(result);
    }

    export function getDisplayText(result: BuildContracts.BuildResult): string {
        let displayValues = getDisplayValues(result);
        if (displayValues) {
            return displayValues.text;
        }
        else {
            return "";
        }
    }

    export function getDisplayValues(result: BuildContracts.BuildResult): DisplayValues {
        _ensureMaps();
        let displayValues = _resultMap[result];

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
        if (!_resultMap) {
            let resultMap: IDictionaryNumberTo<DisplayValues> = {};
            resultMap[BuildContracts.BuildResult.Canceled] = {
                iconClassName: "build-muted-icon-color bowtie-icon bowtie-status-stop-outline",
                textClassName: "canceled",
                text: BuildCommonResources.BuildResultCanceled,
            };

            resultMap[BuildContracts.BuildResult.Failed] = {
                iconClassName: "build-failure-icon-color bowtie-icon bowtie-edit-delete",
                textClassName: "failed",
                text: BuildCommonResources.BuildResultFailed,
            };

            resultMap[BuildContracts.BuildResult.PartiallySucceeded] = {
                iconClassName: "build-warning-icon-color bowtie-icon bowtie-status-warning",
                textClassName: "partiallysucceeded",
                text: BuildCommonResources.BuildResultPartiallySucceeded,
            };

            resultMap[BuildContracts.BuildResult.Succeeded] = {
                iconClassName: "build-success-icon-color bowtie-icon bowtie-check",
                textClassName: "succeeded",
                text: BuildCommonResources.BuildResultSucceeded
            };

            _resultMap = resultMap;
        }
    }
}