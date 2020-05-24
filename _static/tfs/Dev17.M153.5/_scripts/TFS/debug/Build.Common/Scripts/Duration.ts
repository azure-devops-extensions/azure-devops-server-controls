import * as BuildCommonResources from "Build.Common/Scripts/Resources/TFS.Resources.Build.Common";
import {BuildStatus} from "Build.Common/Scripts/BuildStatus";

import BuildContracts = require("TFS/Build/Contracts");

import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

export function getBuildDurationText(status: BuildContracts.BuildStatus, startTime: Date, finishTime: Date): string {
    return _getDurationText(status, startTime, finishTime, null, (start, finish) => {
        return Utils_String.format(BuildCommonResources.BuildCompletedAgoFormat, Utils_Date.ago(finish, new Date()));
    });
}

export function getBuildDurationQueueText(status: BuildContracts.BuildStatus, startTime: Date, finishTime: Date, queue: string): string {
    if (!queue) {
        queue = BuildCommonResources.BuildDurationNoQueueName;
    }

    return _getDurationText(status, startTime, finishTime, queue, (start, finish) => {
        return Utils_String.format(BuildCommonResources.BuildDurationCompletedAgoQueueFormat, getDurationText(start, finish), queue, getDurationText(finish, new Date()));
    });
}

function _getDurationText(status: BuildContracts.BuildStatus, startTime: Date, finishTime: Date, queue: string, completedFormat: (startTime: Date, finishTime: Date) => string) {
    let result: string = "";

    if (!startTime) {
        startTime = new Date();
    }

    if (status === BuildContracts.BuildStatus.NotStarted) {
        if (queue) {
            result = Utils_String.format(BuildCommonResources.BuildNotStartedDurationTextQueueFormat, queue);
        }
        else {
            result = Utils_String.format(BuildCommonResources.BuildNotStartedDurationTextFormat);
        }
    }
    else if (!BuildStatus.isFinished(status, finishTime)) {
        if (queue) {
            result = Utils_String.format(BuildCommonResources.BuildDurationInProgressQueueFormat, getDurationText(startTime, new Date()), queue);
        }
        else {
            result = Utils_String.format(BuildCommonResources.BuildDurationInProgressFormat, getDurationText(startTime, new Date()));
        }
    }
    else {
        // sometimes builds are finished but have no FinishTime in the database
        //  when this happens, build.finishTime is DateTime.MinValue
        //  for display purposes, pretend that the build finished immediately
        if (!finishTime || Utils_Date.isMinDate(finishTime)) {
            finishTime = startTime;
        }

        result = completedFormat(startTime, finishTime);
    }

    return result;
}

/**
 * Calculates a duration string from two dates
 * @param date1 The first date
 * @param date2 The second date
*/
export function getDurationText(date1: Date, date2: Date = new Date()): string {
    if (!date1) {
        date1 = new Date();
    }
    if (!date2) {
        date2 = new Date();
    }

    var diff: number = Math.abs(date1.valueOf() - date2.valueOf());
    return getDurationTextFromTime(diff);
}

/**
 * Calculates a duration string
 * @param dateDiff The time in ms.
*/
export function getDurationTextFromTime(dateDiff: number): string {
    var seconds: number = dateDiff / 1000;
    var minutes: number = seconds / 60;

    if (minutes < 2) {
        return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatSeconds, Math.round(seconds));
    }

    var hours: number = minutes / 60;

    if (hours < 2) {
        return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatMinutes, Utils_Number.toDecimalLocaleString(Math.round(minutes * 10) / 10));
    }

    var days: number = hours / 24;
    if (days < 2) {
        return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatHours, Utils_Number.toDecimalLocaleString(Math.round(hours * 10) / 10));
    }

    return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatDays, Math.round(days));
}