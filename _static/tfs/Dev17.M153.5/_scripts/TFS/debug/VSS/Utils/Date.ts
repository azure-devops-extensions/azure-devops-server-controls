
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Culture = require("VSS/Utils/Culture");
import Diag = require("VSS/Diag");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_String = require("VSS/Utils/String");

export var utcOffset = 0;
export var timeZoneMap: Contracts_Platform.DaylightSavingsAdjustmentEntry[];

var defaultPageContext = Context.getPageContext();
if (defaultPageContext && defaultPageContext.globalization) {
    utcOffset = defaultPageContext.globalization.timezoneOffset || 0;
}
if (defaultPageContext && defaultPageContext.timeZonesConfiguration) {
    timeZoneMap = defaultPageContext.timeZonesConfiguration.daylightSavingsAdjustments;
}

var slice: (start: number, end?: number) => any[] = Array.prototype.slice; // Needs to be typed because Array is declared as any above. When we get rid of above we get type for free.

var minute = 1000 * 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;


export var MILLISECONDS_IN_MINUTE = minute;
export var MILLISECONDS_IN_HOUR = hour;
export var MILLISECONDS_IN_DAY = day;
export var MILLISECONDS_IN_WEEK = week;
export var DATETIME_MINDATE_UTC_MS = -62135596800000;

// Regex for checking whether a date is in ISO 8601 date format or not.
// Accepted formats:
//  yyyy-MM-ddTHH:mm:ss
//  yyyy-MM-ddTHH:mm:ssZ
//  yyyy-MM-ddTHH:mm:ss+HH:mm
//  yyyy-MM-ddTHH:mm:ss-HH:mm
//  yyyy-MM-ddTHH:mm:ss.sss
//  yyyy-MM-ddTHH:mm:ss.sssssss
//  yyyy-MM-ddTHH:mm:ss.sssZ
//  yyyy-MM-ddTHH:mm:ss.sss+HH:mm
//  yyyy-MM-ddTHH:mm:ss.sss-HH:mm
//  yyyy-MM-ddTHH:mm:ss.sssssss-HH:mm
//  +yyyyyy-MM-ddTHH:mm:ss
var isoDateRegex = /^(\d{4}|\+{1}\d{6})-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,7})?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Checks whether the specified datestring is in ISO 8601 date format or not.
 * @param dateString
 */
export function isIsoDate(dateString: string): boolean {
    return isoDateRegex.test(dateString);
}

/**
    * Checks whether this date object corresponds to a min date or not
    * 
    * @return 
    */
export function isMinDate(date: Date): boolean {
    var utcTime = date.getTime() - date.getTimezoneOffset() * 60000;
    return utcTime === DATETIME_MINDATE_UTC_MS; // this constant is utc min date value
}

// Sprint 93 - We are doing exports.compare = function... intentionally to not be part of d.ts file. 
// We will include it again in a few sprints with the expected logic (date1-date2)
/**
    * Compares this date object with the given date object
    * 
    * @param date1 Date object to compare
    * @param date2 Date object to compare
    * @return 
    */
exports.compare = function (date1: Date, date2: Date): number {

    if (date2 instanceof Date) {
        return date2.getTime() - date1.getTime();
    }

    return -1;
}

/**
    * Compares two date objects. Returns a number:
    *    Less than 0 if date1 is earlier than date2
    *    Zero if date1 is the same as date2
    *    Greater than zero if date1 is later than date2
    *
    * If an argument is not an instance of a Date then it is considered earlier than
    * the other argument, or the same if the other argument is also not an instance of 
    * a Date
    * 
    * @param date1 Date object to compare
    * @param date2 Date object to compare
    * @return 
    */
export function defaultComparer(date1: Date, date2: Date): number {

    if (date1 instanceof Date && date2 instanceof Date) {
        return date1.getTime() - date2.getTime();
    }

    if (date1 instanceof Date) {
        return 1;
    }

    if (date2 instanceof Date) {
        return -1;
    }

    // Both date objects are not dates: consider them equal
    return 0;
}


/**
    * Compare two dates to see if they are equal - returning true if they are equal.
    * 
    * @param date1 The first value to compare
    * @param date2 The second value to compare
    * @return 
    */
export function equals(date1: Date, date2: Date): boolean {
    if (date1 === null || date1 === undefined) {
        return date1 === date2;
    }
    else {
        return (date1 instanceof Date) && defaultComparer(date1, date2) === 0;
    }
}

/**
    * Shifts the date to match the UTC date.  This is done by creating a new date with the same UTC year, month, 
    * date and time all converted to UTC. 
    * 
    * @param date The date to be converted.
    * @return 
    */
export function shiftToUTC(date: Date): Date {

    Diag.Debug.assertParamIsObject(date, "date");

    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds());
}

/**
    * Shifts the date to match the local date.  This is done by adding the timezone offset to the date.
    * 
    * @param date The date to be converted.
    * @return 
    */
export function shiftToLocal(date: Date): Date {

    Diag.Debug.assertParamIsObject(date, "date");

    return new Date(date.getTime() - (date.getTimezoneOffset() * minute));
}

/**
    * Parses the string into a date.
    * 
    * @param dateString Date string to parse.
    * @param parseFormat Optional format string to use in parsing the date. May be null or undefined
    * @param ignoreTimeZone 
    *     Optional value indicating to ignore the time zone set set in user preferences?
    *     Should be set to true when a Date string should be parsed irrespective of the user's time zone (e.g. calendar control).
    * 
    * @return 
    */
export function parseDateString(dateString: string, parseFormat?: string, ignoreTimeZone?: boolean): Date {

    Diag.Debug.assertParamIsString(dateString, "dateString");
    Diag.Debug.assert(ignoreTimeZone === undefined || typeof (ignoreTimeZone) === "boolean", "ignoreTimeZone");

    var date: Date;
    var year: number;

    // Attempt to parse with the parse format.
    date = parseLocale(dateString, parseFormat ? [parseFormat] : null, ignoreTimeZone);

    // If the date could not be parsed with the parse format parse it directly if it's in ISO format
    if (!date && isIsoDate(dateString)) {
        date = new Date(dateString);
    }

    if (!(date instanceof Date) || isNaN(<any>date)) {
        // Still couldn't parse - the string doesn't represent a valid date
        date = null;
    }
    else {
        // Javascript parses 2-digit years as 19xx, but we want 2-digit years
        // to map to the current century. Examine the year, and if it is in
        // the 1900's, then correct the century unless the date was entered
        // with the '19' prefix.
        year = date.getFullYear();
        if (year >= 1900 && year < 2000) {
            if (dateString.indexOf(<any>year) < 0) {
                // The year is 19xx but 19xx does not appear in the date string
                // so set the year to the current century.
                date.setFullYear((year % 100) + Math.floor(new Date().getFullYear() / 100) * 100);
            }
        }
    }

    return date;
}

/**
    * Returns the number of days between the two dates. Note that any time component is ignored and the dates
    * can be supplied in any order
    * 
    * @param startDate The first date
    * @param endDate The second date
    * @param exclusive If true then the result is exclusive of the second date (Mon->Fri==4).
    * Otherwise the date includes the later date (Mon->Fri==5)
    */
export function daysBetweenDates(startDate: Date, endDate: Date, exclusive?: boolean): number {
    Diag.Debug.assertParamIsDate(startDate, "startDate");
    Diag.Debug.assertParamIsDate(endDate, "endDate");

    startDate = new Date(startDate.getTime());
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(endDate.getTime());
    endDate.setHours(0, 0, 0, 0);

    return Math.round(Math.abs(endDate.getTime() - startDate.getTime()) / day) + (exclusive === true ? 0 : 1);
}

/**
    * @param value Date string
    * @param formats Date string formats
    * @param ignoreTimeZone 
    * @return 
    */
export function parseLocale(value: string, formats?: string[]| string, ignoreTimeZone?: boolean): Date {

    var args: any[];
    var localDateTime: Date;
    var newDateTime: Date;

    if (typeof formats === "string") {
        args = [formats];
    } else {
        args = [].concat(formats);
    }

    localDateTime = Utils_String.parseDateString(value, Culture.getCurrentCulture(), args);

    if (ignoreTimeZone || !localDateTime) {
        return localDateTime;
    }
    else {
        newDateTime = convertUserTimeToClientTimeZone(localDateTime, true);
        return newDateTime;
    }
}

/**
    * @param date The Date object to format
    * @param format Date string format
    * @param ignoreTimeZone 
    * @return 
    */
export function localeFormat(date: Date, format?: string, ignoreTimeZone?: boolean): string {
    if (!ignoreTimeZone) {
        date = convertClientTimeToUserTimeZone(date, true);
    }
    return Utils_String.dateToString(date, true, format);
}

/**
    * Converts a time from the client (e.g. new Date()) to the user's preferred timezone
    * 
    * @param date The Date object to convert
    * @param adjustOffset 
    *     If true, consider the date portion when converting (get the timezone offset at that particular date).
    *     False indicates to use the current (today's) timezone offset regardless of the date given.
    * 
    */
export function convertClientTimeToUserTimeZone(date: Date, adjustOffset: boolean = true): Date {
    return convertBetweenClientAndUserTime(date, adjustOffset, true);
}

/**
    * Converts a time from the user's preferred timezone to the client (e.g. new Date()) timezone
    * 
    * @param date The Date object to convert
    * @param adjustOffset 
    *     If true, consider the date portion when converting (get the timezone offset at that particular date).
    *     False indicates to use the current (today's) timezone offset regardless of the date given.
    * 
    */
export function convertUserTimeToClientTimeZone(date: Date, adjustOffset: boolean = true): Date {
    return convertBetweenClientAndUserTime(date, adjustOffset, false);
}

function convertBetweenClientAndUserTime(date: Date, adjustOffset: boolean, toUserTime: boolean): Date {

    var localTime: number;
    var localOffset: number;
    var newUtc: number;

    // Get current time in milliseconds according to client
    localTime = date.getTime();

    // Get client's timezone offset in milliseconds
    localOffset = date.getTimezoneOffset() * 60000;

    var offset = utcOffset;

    if (adjustOffset) {
        offset = getOffsetForDate(date);
    }

    // Adjust client's time to utc, and then adjust to appropriate timezone
    if (toUserTime) {
        newUtc = localTime + localOffset + offset;
    }
    else {
        newUtc = localTime - localOffset - offset;
    }

    var clientDate = <Date>new Date(newUtc); // Explicit cast because of Date declare override at top of file

    if (adjustOffset) {
        if (getOffsetForDate(clientDate) === getOffsetForDate(date)) {
            clientDate = adjustOffsetForTimes(date, clientDate);
        }
    }

    return clientDate;
}

/**
    * Strip the time from the given date (return a new date) such that the new date is of 12:00:00 AM
    */
export function stripTimeFromDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
    * Get the equivalent of "Now" in the user's time zone.
    */
export function getNowInUserTimeZone(): Date {
    return convertClientTimeToUserTimeZone(new Date(), false);
}

/**
    * Get the equivalent of "Today" (date as of midnight) in the user's time zone
    */
export function getTodayInUserTimeZone(): Date {
    return stripTimeFromDate(getNowInUserTimeZone());
}

/**
    * @param date The Date object to format
    * @param format Date string format
    * @return 
    */
export function format(date: Date, format?: string): string {
    return Utils_String.dateToString(date, false, format);
}

interface IDateStep {
    limit: number;
    format: string;
    arg?: number
}

/**
    * Generate a string indicating how long ago the date is.
    * 
    * @param date The Date object to format
    * @param now 
    * @return A friendly string
    */
export function ago(date: Date, now?: Date): string {

    var i: number;
    var len: number;
    var result: string;
    var minute = 60;
    var hour = minute * 60;
    var day = hour * 24;
    var week = day * 7;
    var month = (day * 365) / 12;
    var year = day * 365;
    var diff: number;
    var step: IDateStep;
    var steps: IDateStep[];

    steps = [
        <IDateStep>{ limit: minute, format: Resources_Platform.AgoLessThanAMinute },
        <IDateStep>{ limit: minute * 1.5, format: Resources_Platform.AgoAMinute },
        <IDateStep>{ limit: hour, format: Resources_Platform.AgoMinutes, arg: minute },
        <IDateStep>{ limit: hour * 1.5, format: Resources_Platform.AgoAnHour },
        <IDateStep>{ limit: day, format: Resources_Platform.AgoHours, arg: hour },
        <IDateStep>{ limit: day * 1.5, format: Resources_Platform.AgoADay },
        <IDateStep>{ limit: week, format: Resources_Platform.AgoDays, arg: day },
        <IDateStep>{ limit: week * 1.5, format: Resources_Platform.AgoAWeek },
        <IDateStep>{ limit: month, format: Resources_Platform.AgoWeeks, arg: week },
        <IDateStep>{ limit: month * 1.5, format: Resources_Platform.AgoAMonth },
        <IDateStep>{ limit: year, format: Resources_Platform.AgoMonths, arg: month },
        <IDateStep>{ limit: year * 1.5, format: Resources_Platform.AgoAYear },
        <IDateStep>{ limit: Number.POSITIVE_INFINITY, format: Resources_Platform.AgoYears, arg: year }];

    if (now === null || typeof now === "undefined") {
        // This might be used for testing purposes
        now = new Date();
    }

    // Getting the difference between now and the specified date
    diff = now.getTime() - date.getTime();
    // Converting diff to seconds
    diff /= 1000;

    for (i = 0, len = steps.length; i < len; i++) {
        step = steps[i];
        if (diff < step.limit) {
            if (step.arg) {
                result = Utils_String.format(step.format, Math.round(diff / step.arg));
            }
            else {
                result = step.format;
            }
            break;
        }
    }

    if (!result) {
        result = this.toString();
    }

    return result;
}

/**
    * Adds days to a given date
    * 
    * @param date The Date object to add to
    * @param days Number of days to add
    * @param adjustOffset is true then the offset will be adjusted if the offset between the date passed
    * and the date obtained after adding days is different.
    * 
    */
export function addDays(date: Date, days: number, adjustOffset: boolean = false): Date {
    var newDate = <Date>new Date(); // Explicit cast here because of Date declare override at top of file.
    newDate.setTime(date.getTime() + days * 86400000);
    if (adjustOffset) {
        newDate = adjustOffsetForTimes(date, newDate);
    }

    return newDate;
}

/**
    * Adds hours to a given date
    * 
    * @param date The Date object to add to
    * @param hours Number of hours to add
    * @param adjustOffset is true then the offset will be adjusted if the offset between the date passed
    * and the date obtained after adding hours is different.
    * 
    */
export function addHours(date: Date, hours: number, adjustOffset: boolean = false): Date {
    var newDate = <Date>new Date(); // Explicit cast here because of Date declare override at top of file.
    newDate.setTime(date.getTime() + hours * 3600000);
    if (adjustOffset) {
        newDate = adjustOffsetForTimes(date, newDate);
    }

    return newDate;
}

/**
    * Adds minutes to a given date
    * 
    * @param date The Date object to add to
    * @param minutes Number of minutes to add
    * @param adjustOffset is true then the offset will be adjusted if the offset between the date passed
    * and the date obtained after adding minutes is different.
    * 
    */
export function addMinutes(date: Date, minutes: number, adjustOffset: boolean = false): Date {
    var newDate = <Date>new Date(); // Explicit cast here because of Date declare override at top of file.
    newDate.setTime(date.getTime() + minutes * 60000);
    if (adjustOffset) {
        newDate = adjustOffsetForTimes(date, newDate);
    }

    return newDate;
}

/**
    * Adjusts the time zone offset by applying the time difference in the offsets.
    * 
    * @param oldDate The Date object which was used before time zone changed.
    * @param newDate The Date object which was used after time zone changed.
    */
export function adjustOffsetForTimes(oldDate: Date, newDate: Date, applicationDate: Date = null): Date {

    // this function should be used if the offset between the old date and new date is different
    // and their difference is to be applied to the applied date passed in.
    // for eg. if the oldDate is March 11 00:00 AM 7GMT and the newDate is March 9 23:00 PM 8GMT
    // then there is a offset difference of 1 hour. This will happen when you use addDays(oldDate, -1)
    // because of the offset difference the result you will get March 9 23:00 PM 8GMT instead of March 10 00:00 AM 8GMT
    // hence the offset is applied to March 9 23:00 PM to get March 10 00:00 AM 8GMT 
        
    var setDate = newDate;

    if (applicationDate !== null) {
        setDate = applicationDate;
    }

    var oldOffset = oldDate.getTimezoneOffset();
    var newOffset = newDate.getTimezoneOffset();
    if (oldOffset != newOffset) {
        setDate = addDays(setDate,(newOffset - oldOffset) / (60 * 24));
    }

    return setDate;
}

/**
    * Gets the offset of the date passed in.
    * 
    * @param date The Date object for which the offset is required.
    * @param defaultToUtcOffset A value indicating whether the server side set utc offset should be returned if no offset for date is returned.
    */
export function getOffsetForDate(date: Date): number {

    if (!timeZoneMap) {
        return utcOffset;
    }

    var utcDate = shiftToUTC(date);

    // find the right offset for this date.
    for (var i = 0; i < timeZoneMap.length; i++) {
        if (i === timeZoneMap.length - 1 && utcDate === timeZoneMap[i].start) {
            return timeZoneMap[i].offset;
        }
        else if (i === timeZoneMap.length - 1) {
            // exit when no range is found
            break;
        }

        if (utcDate >= timeZoneMap[i].start && utcDate < timeZoneMap[i + 1].start) {
            return timeZoneMap[i].offset;
        }
    }

    // no offset found use the server side set offset for the current date.
    return utcOffset;
}

/**
    * Checks whether given day is today in user timezone
    * 
    * @param date The Date object to check
    */
export function isGivenDayToday(date: Date): boolean {
    return daysBetweenDates(getTodayInUserTimeZone(), date, true) === 0;
}

/**
    * Checks whether given day is a day in past in user timezone
    * 
    * @param date The Date object to check
    */
export function isGivenDayInPast(date: Date): boolean {
    var today = getTodayInUserTimeZone(),
        timeDifference = date.getTime() - today.getTime();

    return timeDifference < 0;
}

/**
    * Checks whether given day is a day in future in user timezone
    * 
    * @param date The Date object to check
    */
export function isGivenDayInFuture(date: Date): boolean {
    var today = getTodayInUserTimeZone(),
        timeDifference = date.getTime() - today.getTime();

    return timeDifference > 0;
}

interface IDateStep2 {
    limit: number;
    format: IFunctionPR<Date, string>;
}

/**
    * Get a user friendly string for a date that indicates how long ago the date was. e.g. "4 hours ago", "Tuesday", "7/4/2012".
    * 
    * @param date The Date object to format
    * @param now 
    * @return A string version of the date.
    */
export function friendly(date: Date, now?: Date): string {

    var i: number;
    var len: number;
    var result: string;
    var day = 60 * 60 * 24;
    var diff: number;
    var step: IDateStep2;
    var steps: IDateStep2[];
    var firstDayOfWeek: Date;

    if (now === null || typeof now === "undefined") {
        now = new Date();
    }

    firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(),
        now.getDate() - now.getDay() + Culture.getDateTimeFormat().FirstDayOfWeek);

    steps = [
        {
            limit: day,
            format: function (dt) {
                return ago(dt, now);
            }
        },
        {
            limit: (<any>now - <any>firstDayOfWeek) / 1000,
            format: function (dt) {
                return localeFormat(dt, 'dddd');
            }
        },
        {
            limit: Number.POSITIVE_INFINITY,
            format: function (dt) {
                return localeFormat(dt, 'd');
            }
        }];

    // Getting the difference between now and the specified date in seconds
    diff = (now.getTime() - date.getTime()) / 1000;

    for (i = 0, len = steps.length; i < len; i++) {
        step = steps[i];
        if (diff < step.limit && step.limit > 0) {
            result = step.format(date);
            break;
        }
    }

    if (!result) {
        result = date.toString();
    }

    return result;
}