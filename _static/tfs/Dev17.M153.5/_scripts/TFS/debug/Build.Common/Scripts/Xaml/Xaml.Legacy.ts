/// <reference types="jquery" />

import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");

import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export class BuildStatus {
    private static _names: any = null;

    private static _ensureNames() {
        var names;

        if (!BuildStatus._names) {
            names = {};
            names[BuildStatus.None] = { name: "none", displayName: "" };
            names[BuildStatus.InProgress] = { name: "inprogress", displayName: BuildCommonResources.BuildStatusInProgress };
            names[BuildStatus.Succeeded] = { name: "succeeded", displayName: BuildCommonResources.BuildStatusSucceeded };
            names[BuildStatus.PartiallySucceeded] = { name: "partiallysucceeded", displayName: BuildCommonResources.BuildStatusPartiallySucceeded };
            names[BuildStatus.Failed] = { name: "failed", displayName: BuildCommonResources.BuildStatusFailed };
            names[BuildStatus.Stopped] = { name: "stopped", displayName: BuildCommonResources.BuildStatusStopped };
            names[BuildStatus.NotStarted] = { name: "notstarted", displayName: BuildCommonResources.BuildStatusNotStarted };
            BuildStatus._names = names;
        }
    }

    public static None: number = 0;
    public static InProgress: number = 1;
    public static Succeeded: number = 2;
    public static PartiallySucceeded: number = 4;
    public static Failed: number = 8;
    public static Stopped: number = 0x10;
    public static NotStarted: number = 0X20;
    public static All: number = 0x3f;

    public static getName(status, display?: boolean): string {
        /// <param name="display" type="boolean"  optional="true"/>
        /// <returns type="string" />

        BuildStatus._ensureNames();

        var st = BuildStatus._names[status];
        if (!st) {
            st = BuildStatus._names[BuildStatus.None];
        }

        return st[display === true ? "displayName" : "name"];
    }

    constructor() {
    }
}

export class BuildTextConverter {
    public static getBuildReasonDescriptionText(build) {
        var text, definition, changesetVersion,
            totalCs, requestCount, requestedFor;

        requestCount = build.requests.length;
        definition = BuildTextConverter.getBuildDefinitionText(build);
        requestedFor = build.requestedFor;

        text = (build.vc && build.vc.versionText) ?
            Utils_String.format(BuildCommonResources.BuildDetailViewDefaultReasonFormat, requestedFor, definition, build.project, build.vc.versionText)
            : Utils_String.format(BuildCommonResources.BuildDetailViewReasonFormatWithoutVersionText, requestedFor, definition, build.project);

        if (build.reason === BuildReason.CheckInShelveset) {
            if (build.finished) {
                if (requestCount > 1) {
                    totalCs = (build.vc.successCs || 0) + (build.vc.failCs || 0);
                    if (!totalCs) {
                        // No checkin needed
                        text = Utils_String.format(BuildCommonResources.BuildDetailViewBatchedGatedNoChanges, requestCount, definition, build.project);
                    }
                    else if (build.vc.successCs > 0) {
                        // There are some successful checkins
                        text = Utils_String.format(BuildCommonResources.BuildDetailViewBatchedGatedCommitted, build.vc.successCs, requestCount, definition, build.project);
                    }
                    else // successful == 0 && failed > 0
                    {
                        // No successful checkins
                        text = Utils_String.format(BuildCommonResources.BuildDetailViewBatchedGatedRejected, build.vc.failCs, requestCount, definition, build.project);
                    }
                }
                else {
                    if (build.vc.csId > 0) {
                        // id > 0  => changeset created
                        changesetVersion = Utils_String.format(BuildCommonResources.BuildDetailViewChangesetFormat, build.vc.csId);
                        text = Utils_String.format(BuildCommonResources.BuildDetailViewGatedCommittedFormat, requestedFor, changesetVersion, definition, build.project);
                    }
                    else if (build.vc.csId === 0) {
                        // id == 0 => nothing to checkin
                        text = Utils_String.format(BuildCommonResources.BuildDetailViewGatedNoChangesFormat, requestedFor, definition, build.project);
                    }
                    else {
                        // id < 0  => checkin failed
                        text = Utils_String.format(BuildCommonResources.BuildDetailViewGatedRejectedFormat, requestedFor, definition, build.project);
                    }
                }
            }
            else {
                // build in progress
                text = Utils_String.format(BuildCommonResources.BuildDetailViewGatedInProgressFormat, requestedFor, definition, build.project);
            }
        }
        else if (build.reason === BuildReason.ValidateShelveset) {
            if (build.finished) {
                text = Utils_String.format(BuildCommonResources.BuildDetailViewPrivateCompletedFormat, build.vc.shelvesetName, requestedFor, definition, build.project);
            }
            else {
                text = Utils_String.format(BuildCommonResources.BuildDetailViewPrivateInProgressFormat, build.vc.shelvesetName, requestedFor, definition, build.project);
            }
        }

        return text;
    }

    private static getBuildDefinitionText(build) {
        var text = BuildCommonResources.BuildDetailViewUnknownDefinition;
        if (build && build.definition) {
            text = build.definition;
        }
        return text;
    }

    public static getBuildDurationTextSimple(build) {
        var startTime = new Date();
        var endTime = new Date();

        if (build.status === BuildStatus.NotStarted) {
            // When the build hasn't started the StartTime is not set, so we have a special case.
            startTime = new Date();
            endTime = new Date();
        }
        else if (!build.finished) {
            startTime = build.startTime;
            endTime = new Date();
        }
        else if (Utils_Date.isMinDate(build.finishTime)) {
            // it is possible for the build to be finished but finishTime is not set
            startTime = build.startTime;
            endTime = build.startTime;
        }
        else {
            startTime = build.startTime;
            endTime = build.finishTime;
        }

        return Utils_String.format(BuildCommonResources.BuildDurationCompletedSimpleFormat, BuildTextConverter.getDuration(startTime, endTime));
    }

    public static getDuration(date1, date2) {
        var seconds, minutes, hours, days, diff;

        diff = Math.abs(date1 - date2);
        seconds = diff / 1000;
        minutes = seconds / 60;
        if (minutes < 2) {
            return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatSeconds, Math.round(seconds));
        }
        hours = minutes / 60;
        if (hours < 2) {
            return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatMinutes, Math.round(minutes * 10) / 10);
        }
        days = hours / 24;
        if (days < 2) {
            return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatHours, Math.round(hours * 10) / 10);
        }
        return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatDays, Math.round(days));
    }

    public static getTestRunInformation(build) {
        if (build.information) {
            for (var i = 0; i < build.information.length; i++) {
                if (build.information[i].type === InformationTypes.ConfigurationSummary && build.information[i].testRuns && build.information[i].testRuns.length > 0) {
                    var firstRun = build.information[i].testRuns[0];

                    return Utils_String.format(BuildCommonResources.BuildTestPassedResults, firstRun.passed, firstRun.total);
                }
            }
        }

        return '';
    }
}

class InformationTypes {
    public static ConfigurationSummary: string = "ConfigurationSummary";

    constructor() {
    }
}

class BuildReason {
    private static _names: any = null;

    private static _ensureNames() {
        var names;

        if (!BuildReason._names) {
            names = {};
            names[BuildReason.None] = { name: "none", displayName: "" };
            names[BuildReason.Manual] = { name: "manual", displayName: BuildCommonResources.BuildReasonManual };
            names[BuildReason.IndividualCI] = { name: "individualci", displayName: BuildCommonResources.BuildReasonIndividualCI };
            names[BuildReason.BatchedCI] = { name: "batchedci", displayName: BuildCommonResources.BuildReasonBatchedCI };
            names[BuildReason.Schedule] = { name: "schedule", displayName: BuildCommonResources.BuildReasonSchedule };
            names[BuildReason.ScheduleForced] = { name: "scheduleforced", displayName: BuildCommonResources.BuildReasonScheduleForced };
            names[BuildReason.UserCreated] = { name: "usercreated", displayName: BuildCommonResources.BuildReasonUserCreated };
            names[BuildReason.ValidateShelveset] = { name: "validateshelveset", displayName: BuildCommonResources.BuildReasonValidateShelveset };
            names[BuildReason.CheckInShelveset] = { name: "checkinshelveset", displayName: BuildCommonResources.BuildReasonCheckInShelveset };
            BuildReason._names = names;
        }
    }

    public static None: number = 0;
    public static Manual: number = 1;
    public static IndividualCI: number = 2;
    public static BatchedCI: number = 4;
    public static Schedule: number = 8;
    public static ScheduleForced: number = 0x10;
    public static UserCreated: number = 0x20;
    public static ValidateShelveset: number = 0x40;
    public static CheckInShelveset: number = 0x80;
    public static Triggered: number = 0xbf;
    public static All: number = 0xff;

    public static getName(reason, display?: boolean): string {
        /// <param name="display" type="boolean"  optional="true"/>
        /// <returns type="string" />

        BuildReason._ensureNames();

        var rs = BuildReason._names[reason];
        if (!rs) {
            rs = BuildReason._names[BuildReason.None];
        }

        return rs[display === true ? "displayName" : "name"];
    }

    public static containsFlag(reason: number, flag: number): boolean {
        return (reason & flag) === flag;
    }

    constructor() {
    }
}

export function convertQualitiesToMenuItems(qualities: string[], args?: any): any[] {
    var items: any[] = [];
    var defaultArgs = $.extend({}, args || {}, { selectedQuality: "" });
    items.push({
        rank: 0,
        id: "build-quality",
        text: BuildCommonResources.BuildDetailViewNoQualityAssignedText,
        title: BuildCommonResources.BuildDetailViewNoQualityAssignedText,
        showText: true,
        'arguments': defaultArgs,
        select: true,
        noIcon: true
    });
    $.each(qualities, (index, value) => {
        var rowArgs = $.extend({}, args || {}, { selectedQuality: value });
        items.push({
            rank: index + 1,
            id: "build-quality",
            text: value,
            title: value,
            showText: true,
            noIcon: true,
            'arguments': rowArgs,
            select: true
        });
    });
    return items;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("Xaml.Legacy", exports);
