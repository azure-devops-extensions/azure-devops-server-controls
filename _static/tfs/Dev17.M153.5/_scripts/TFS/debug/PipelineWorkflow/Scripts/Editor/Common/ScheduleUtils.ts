import { DayTimePickerDefaults } from "DistributedTaskControls/Components/DayTimePicker";

import { PipelineReleaseSchedule } from "PipelineWorkflow/Scripts/Common/Types";

import { ScheduleDays } from "ReleaseManagement/Core/Contracts";


import * as Context from "VSS/Context";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

/**
 * Helper class which contains some utils method for schedules
 */
export class ScheduleUtils {

    /**
     * Utils method to compare two schedule array
     */
    public static areSchedulesArrayEqual(originalArray: PipelineReleaseSchedule[], modifiedArray: PipelineReleaseSchedule[]): boolean {
        return Utils_Array.arrayEquals(originalArray, modifiedArray, ScheduleUtils.areSchedulesEqual);
    }

    /**
     * Utils method to compare two schedules
     */
    public static areSchedulesEqual(source: PipelineReleaseSchedule, target: PipelineReleaseSchedule): boolean {
        if (source && target) {
            const sourceDaysToRelease = source.daysToRelease ? source.daysToRelease.toString() : null;
            const targetDaysToRelease = target.daysToRelease ? target.daysToRelease.toString() : null;
            return (sourceDaysToRelease === targetDaysToRelease
                && source.startHours === target.startHours
                && source.startMinutes === target.startMinutes
                && Utils_String.ignoreCaseComparer(source.timeZoneId, target.timeZoneId) === 0);
        }

        if (!source && !target) {
            return true;
        }

        return false;
    }

    /**
     * Utils method to get default schedule
     */
    public static getDefaultSchedule(): PipelineReleaseSchedule {
        let schedule: PipelineReleaseSchedule = {
            daysToRelease: DayTimePickerDefaults.days,
            jobId: null,
            timeZoneId: Context.getPageContext().globalization.timeZoneId,
            startHours: DayTimePickerDefaults.startHours,
            startMinutes: DayTimePickerDefaults.startMinutes
        };

        return schedule;
    }

    /**
     * Utils method to check if no day is selected in schedule.
     */
    public static isNoDaySelected(schedule: PipelineReleaseSchedule): boolean {
        let noDaySelected: boolean = false;
        if (schedule && schedule.daysToRelease === ScheduleDays.None) {
            noDaySelected = true;
        }

        return noDaySelected;
    }
}