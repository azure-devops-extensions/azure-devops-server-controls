import Utils_Date = require("VSS/Utils/Date");
import Utils_Number = require("VSS/Utils/Number");

/**
 * Calculates a duration string
 * @param startTime The start time
 * @param finishTime The finish time
 * @returns A duration string, or an empty string if either date is null or undefined
 */
export function calculateDuration(startTime: Date, finishTime: Date) {
    if (!!startTime && !!finishTime) {
        var difference = finishTime.valueOf() - startTime.valueOf();

        // finish time shouldn't display as before start time
        if (difference < 0) {
            difference = 0;
        }

        var seconds = Math.floor(difference / 1000);
        if (seconds < 60) {
            return "0:" + Utils_Number.localeFormat(seconds % 60, "d2");
        }
        else {
            var minutes = Math.floor(seconds / 60);
            if (minutes < 60) {
                return "" + minutes + ":" + Utils_Number.localeFormat(seconds % 60, "d2");
            }
            else {
                var hours = Math.floor(minutes / 60);
                return "" + hours + ":" + Utils_Number.localeFormat(minutes % 60, "d2") + ":" + Utils_Number.localeFormat(seconds % 60, "d2");
            }
        }
    }
    else {
        return "";
    }
}

/**
 * Gets UTC date in format - yyyy-mm-dd 00:00:00.000
 * @param daysToSubtract Number of days to subtract
 * @param minDate If this has to be min date
 */
export function getUtcDateString(daysToSubtract: number = 0, minDate: boolean = false) {
    var date = new Date();
    if (minDate) {
        date = new Date(0, 0, 0);
    }
    date.setDate(date.getDate() - daysToSubtract);
    return getUtcDateFormat(date);
}

/**
 * Gets date sent in format - yyyy-mm-dd 00:00:00.000
 * @param date Date to convert to the preferrred format
 */
export function getUtcDateFormat(date: Date) {
    var utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60 * 1000));
    var utcDateWithOutTime = new Date(utcDate.setHours(0, 0, 0, 0));
    return Utils_Date.format(utcDateWithOutTime, 'yyyy-MM-ddTHH:mm:ssZ');
}

/**
 * Gets UTC date with outtime
 */
export function getUtcDate(date?: Date) {
    var date = date || new Date();
    var utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60 * 1000));
    return new Date(utcDate.setHours(0, 0, 0, 0));
}

export function isDateRecent(date: Date) {
    if (!date) {
        return false;
    }

    const oneHourInMilliseconds: number = 60 * 60 * 1000;
    const dateNow: Date = new Date();

    return (Math.abs(dateNow.getTime() - date.getTime()) / oneHourInMilliseconds) < 24;
}
