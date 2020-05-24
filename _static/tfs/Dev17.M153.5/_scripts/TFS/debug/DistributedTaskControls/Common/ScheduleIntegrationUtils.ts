// Copyright (c) Microsoft Corporation.  All rights reserved.

import { DayConstants } from "DistributedTaskControls/Common/DayConstants";
import { ScheduleDays } from "DistributedTaskControls/Common/Types";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export class ScheduleIntegrationUtils {

    public static getScheduleSummaryText(days: ScheduleDays, startHours: number, startMinutes: number): string {
        if (days === ScheduleDays.None) {
            return Resources.NoScheduleSelected;
        }
        else {
            return Utils_String.format(Resources.ScheduleSummaryText, this._getDaysSummaryText(days), this._getTimeText(startHours, startMinutes, true));
        }
    }

    public static getScheduleTimeText(startHours: number, startMinutes: number): string {
        return this._getTimeText(startHours, startMinutes, false);
    }

    public static getScheduleDaysText(days: ScheduleDays): string {
        if (days === ScheduleDays.None) {
            return Resources.NoScheduleSelected;
        }
        else {
            return this._getDaysSummaryText(days);
        }
    }

    private static _getDaysSummaryText(days: ScheduleDays): string {
        let daysSummaryText: string = Utils_String.empty;
        let continuousDaysText: string;
        let daysSelected: string[] = [];
        let daysEnabled: number[] = [];
        for (let i = 0; i < 7; i++) {
            daysEnabled.push(0);
        }
        if ((days & ScheduleDays.Monday) === ScheduleDays.Monday) {
            daysSelected.push(Resources.Monday);
            daysEnabled[0] = 1;
        }
        if ((days & ScheduleDays.Tuesday) === ScheduleDays.Tuesday) {
            daysSelected.push(Resources.Tuesday);
            daysEnabled[1] = 2;
        }
        if ((days & ScheduleDays.Wednesday) === ScheduleDays.Wednesday) {
            daysSelected.push(Resources.Wednesday);
            daysEnabled[2] = 3;
        }
        if ((days & ScheduleDays.Thursday) === ScheduleDays.Thursday) {
            daysSelected.push(Resources.Thursday);
            daysEnabled[3] = 4;
        }
        if ((days & ScheduleDays.Friday) === ScheduleDays.Friday) {
            daysSelected.push(Resources.Friday);
            daysEnabled[4] = 5;
        }
        if ((days & ScheduleDays.Saturday) === ScheduleDays.Saturday) {
            daysSelected.push(Resources.Saturday);
            daysEnabled[5] = 6;
        }
        if ((days & ScheduleDays.Sunday) === ScheduleDays.Sunday) {
            daysSelected.push(Resources.Sunday);
            daysEnabled[6] = 7;
        }

        continuousDaysText = this._getContinuousDaysText(daysEnabled);
        if (continuousDaysText !== Utils_String.empty) {
            daysSummaryText = continuousDaysText;
        }
        else if (daysSelected.length === 1) {
            daysSummaryText = daysSelected[0];
        }
        else if (daysSelected.length === 2) {
            daysSummaryText = Utils_String.format(Resources.DaysSummaryText, daysSelected[0], daysSelected[1]);
        }
        else if (daysSelected.length > 2) {
            let summary: string = daysSelected.join(", ");
            let lastIndex: number = summary.lastIndexOf(",");
            daysSummaryText = Utils_String.format(Resources.DaysSummaryText, summary.substr(0, lastIndex), summary.substr(lastIndex + 2));
        }
        return daysSummaryText;
    }

    private static _getTimeText(startHours: number, startMinutes: number, includeAt: boolean): string {
        let minutesText: string = (startMinutes <= 9) ? Utils_String.format(Resources.MinutesLessThanTen, "0", startMinutes.toString()) : startMinutes.toString();
        if (includeAt) {
            return (Utils_String.format(Resources.ScheduleTime, startHours, minutesText));
        } else {
            return (Utils_String.format(Resources.TrimmedScheduleTime, startHours, minutesText));
        }
    }

    private static _getContinuousDaysText(days: number[]): string {
        let daysContinuous: boolean = true;
        let startingIndex = Utils_Array.first(days, (day: number) => day !== 0);
        let lastIndex: number;
        let daySummary: string = Utils_String.empty;
        for (let i = 6; i >= 0; i--) {
            if (days[i] !== 0) {
                lastIndex = i;
                break;
            }
        }
        startingIndex = startingIndex - 1;
        for (let i = startingIndex; i <= lastIndex; i++) {
            if (days[i] === 0) {
                daysContinuous = false;
            }
        }
        if (daysContinuous && startingIndex >= 0 && lastIndex >= 1 && (lastIndex - startingIndex) > 1) {
            daySummary = Utils_String.format(Resources.ContinuousDaysSummaryText, DayConstants.getDayNameMap(startingIndex), DayConstants.getDayNameMap(lastIndex));
        }
        return daySummary;
    }
}
