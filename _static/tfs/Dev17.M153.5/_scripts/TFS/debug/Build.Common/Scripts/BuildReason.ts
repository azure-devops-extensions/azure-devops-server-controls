import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");

import * as BuildContracts from "TFS/Build/Contracts";

import "VSS/LoaderPlugins/Css!Build.Common/BuildReason";

let reasonMap: IDictionaryNumberTo<string> = {};
reasonMap[BuildContracts.BuildReason.BatchedCI] = "icon icon-tfs-build-reason-batchedci";
reasonMap[BuildContracts.BuildReason.CheckInShelveset] = "bowtie-icon bowtie-build-reason-checkin-shelveset";
reasonMap[BuildContracts.BuildReason.IndividualCI] = "icon icon-tfs-build-reason-individualci";
reasonMap[BuildContracts.BuildReason.Manual] = "bowtie-icon bowtie-user bowtie-size-mini";
reasonMap[BuildContracts.BuildReason.PullRequest] = "bowtie-icon bowtie-tfvc-pull-request";
reasonMap[BuildContracts.BuildReason.Schedule] = "icon icon-tfs-build-reason-schedule";
reasonMap[BuildContracts.BuildReason.UserCreated] = "icon icon-tfs-build-reason-usercreated";
reasonMap[BuildContracts.BuildReason.ValidateShelveset] = "icon icon-tfs-build-reason-validateshelveset";
reasonMap[BuildContracts.BuildReason.BuildCompletion] = "bowtie-icon bowtie-build bowtie-size-mini";

export module BuildReason {
    let _names: IDictionaryNumberTo<{ name: string, displayName: string }> = null;

    // ScheduleForced only exists in XAML build
    export const ScheduleForced: number = 0x10;

    export function getIconCssClass(reason: BuildContracts.BuildReason): string {
        let iconCssClass: string = "";

        if (reason) {
            iconCssClass = reasonMap[reason];
        }

        return iconCssClass || "";
    }

    export function getName(reason: BuildContracts.BuildReason, display?: boolean): string {
        _ensureNames();

        let names = _names[reason];
        if (!names) {
            names = _names[BuildContracts.BuildReason.None];
        }

        return names[display === true ? "displayName" : "name"];
    }

    export function containsFlag(reason: number, flag: number): boolean {
        return (reason & flag) === flag;
    }

    export function getStyles(buildReason: BuildContracts.BuildReason): string[] {
        if (buildReason === BuildContracts.BuildReason.PullRequest) {
            return ["bowtie-icon", "bowtie-tfvc-pull-request"];
        }
        else if (buildReason === BuildContracts.BuildReason.Manual) {
            return ["bowtie-icon", "bowtie-user", "bowtie-size-mini"];
        }
        else if (buildReason === BuildContracts.BuildReason.BuildCompletion) {
            return ["bowtie-icon", "bowtie-build", "bowtie-size-mini"];
        }
        else {
            return ["icon", "icon-tfs-build-reason-" + BuildReason.getName(buildReason).toLowerCase()];
        }
    }

    function _ensureNames() {
        if (!_names) {
            let names: IDictionaryNumberTo<{ name: string, displayName: string }> = {};
            names[BuildContracts.BuildReason.None] = { name: "none", displayName: "" };
            names[BuildContracts.BuildReason.Manual] = { name: "manual", displayName: BuildCommonResources.BuildReasonManual };
            names[BuildContracts.BuildReason.IndividualCI] = { name: "individualci", displayName: BuildCommonResources.BuildReasonIndividualCI };
            names[BuildContracts.BuildReason.BatchedCI] = { name: "batchedci", displayName: BuildCommonResources.BuildReasonBatchedCI };
            names[BuildContracts.BuildReason.Schedule] = { name: "schedule", displayName: BuildCommonResources.BuildReasonSchedule };
            names[ScheduleForced] = { name: "scheduleforced", displayName: BuildCommonResources.BuildReasonScheduleForced };
            names[BuildContracts.BuildReason.UserCreated] = { name: "usercreated", displayName: BuildCommonResources.BuildReasonUserCreated };
            names[BuildContracts.BuildReason.ValidateShelveset] = { name: "validateshelveset", displayName: BuildCommonResources.BuildReasonValidateShelveset };
            names[BuildContracts.BuildReason.CheckInShelveset] = { name: "checkinshelveset", displayName: BuildCommonResources.BuildReasonCheckInShelveset };
            names[BuildContracts.BuildReason.PullRequest] = { name: "pullrequest", displayName: BuildCommonResources.BuildReasonPullRequest };
            names[BuildContracts.BuildReason.BuildCompletion] = { name: "buildcompletion", displayName: BuildCommonResources.BuildReasonBuildCompletion };
            _names = names;
        }
    }
}