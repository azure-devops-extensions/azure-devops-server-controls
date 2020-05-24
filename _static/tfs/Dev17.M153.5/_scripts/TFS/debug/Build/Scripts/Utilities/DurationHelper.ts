// code copied from Tfs\Service\WebAccess\Utilization\Scripts\UrlStateHelper.ts
// by way of ReleaseManagement\Service\WebAccess\ReleasePipeline\Scripts\TFS.ReleaseManagement.Utils.Core.ts

import BuildCommonResources = require("Build.Common/Scripts/Resources/TFS.Resources.Build.Common");
import Utils_String = require("VSS/Utils/String");

export interface IDuration {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

export class DurationHelper {
    private _totalMilliseconds: number = 0;

    constructor(totalMilliseconds: number)
    constructor(timeSpan: string);
    constructor(timeSpanOrMilliseconds: string | number) {
        if (typeof timeSpanOrMilliseconds === "number") {
            this._totalMilliseconds = timeSpanOrMilliseconds;
        }
        else {
            this._totalMilliseconds = DurationHelper._parseTimeSpanAsMs(timeSpanOrMilliseconds);
        }
    }

    public static fromTimeSpanString(timeSpan: string): DurationHelper {
        return new DurationHelper(timeSpan);
    }

    get totalMilliseconds(): number {
        return this._totalMilliseconds;
    }

    set totalMilliseconds(value: number) {
        this._totalMilliseconds = value;
    }

    public toDuration(): IDuration {
        let ms = this._totalMilliseconds;

        let days = Math.trunc(ms / DurationHelper.msPerDay);
        ms = ms % DurationHelper.msPerDay;

        let hours = Math.trunc(ms / DurationHelper.msPerHour);
        ms = ms % DurationHelper.msPerHour;

        let minutes = Math.trunc(ms / DurationHelper.msPerMinute);
        ms = ms % DurationHelper.msPerMinute;

        let seconds = Math.trunc(ms / DurationHelper.msPerSecond);
        ms = ms % DurationHelper.msPerSecond;

        return {
            days,
            hours,
            minutes,
            seconds,
            milliseconds: ms
        };
    }

    public toHumanizedString(): string {
        let seconds = this._totalMilliseconds / DurationHelper.msPerSecond;
        let minutes = seconds / 60;
        if (minutes < 2) {
            return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatSeconds, Math.round(seconds));
        }
        let hours = minutes / 60;
        if (hours < 2) {
            return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatMinutes, Math.round(minutes * 10) / 10);
        }
        let days = hours / 24;
        if (days < 2) {
            return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatHours, Math.round(hours * 10) / 10);
        }
        return Utils_String.format(BuildCommonResources.BuildDetailViewDurationFormatDays, Math.round(days));
    }

    public static add(a: DurationHelper, b: DurationHelper): DurationHelper {
        return new DurationHelper(a._totalMilliseconds + b._totalMilliseconds);
    }

    public add(other: DurationHelper): DurationHelper {
        return DurationHelper.add(this, other);
    }

    private static _parseTimeSpanAsMs(timeSpan: string): number {
        // check if we have days
        let segments = timeSpan.split(".");

        let days = 0;
        if (segments[0] && segments[1] && segments[1].indexOf(":") > 0) {
            // this means we have days. The format is something like 2.03:04:50 or 1.04:50:47.6700
            days = parseInt(segments[0]);
            timeSpan = segments[1];
        }

        timeSpan = timeSpan.replace(".", ":");
        segments = timeSpan.split(":");

        let ms = 0;
        if (segments[3]) {
            let seconds = parseFloat("." + segments[3]);
            ms = Math.round(seconds * 1000);
        }

        let hours = (segments[0]) ? parseInt(segments[0]) : 0;
        let minutes = (segments[1]) ? parseInt(segments[1]) : 0;
        let seconds = (segments[1]) ? parseInt(segments[2]) : 0;

        return days * DurationHelper.msPerDay +
            hours * DurationHelper.msPerHour +
            minutes * DurationHelper.msPerMinute +
            seconds * DurationHelper.msPerSecond +
            ms;
    }

    static readonly msPerDay = 86400000;
    static readonly msPerHour = 3600000;
    static readonly msPerMinute = 60000;
    static readonly msPerSecond = 1000;
}
