import * as Utils_Date from "VSS/Utils/Date";
import * as Utils_String from "VSS/Utils/String";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

const MILLISECONDS_IN_AN_HOUR = 1000 * 60 * 60;
const MILLISECONDS_IN_A_MINUTE = 1000 * 60;
let utcOffsetString: string;

/**
 * Returns true if difference between @param date and the current time is less than 24 hours. Returns false otherwise.
 * @param date
 */
export function isDateRecent(date: Date): boolean {
    if (!date) {
        return false;
    }

    const oneHourInMilliseconds: number = 60 * 60 * 1000;
    const dateNow: Date = new Date();

    return (Math.abs(dateNow.getTime() - date.getTime()) / oneHourInMilliseconds) < 24;
}

/**
 * Returns true if difference between @param date1 and @param date2 is less than the given @param rangeMs. Returns false otherwise.
 * @param date1
 * @param date2
 */
export function areDatesWithinRange(date1: Date, date2: Date, rangeMs: number = 1000): boolean {
    if (!date1 || !date2) {
        return false;
    }

    return (Math.abs(date1.getTime() - date2.getTime()) < rangeMs);
}

/**
 * Returns the appropriate string representation of the date given.
 * If the date given is recent, this returns a string such as "7 hours ago".
 * Otherwise, this returns a string such as "2/29/2016".
 */
export function getDateString(date: Date, isDateRecent: boolean): string {
    if (!date) {
        return undefined;
    }

    return isDateRecent ? Utils_Date.friendly(date) : Utils_Date.localeFormat(date, "d");
}

/**
 * Returns the appropriate string representation of the date given with an optional parameter of format along with UTCOffset, alongwith removeUTC if we dont want to add the UTC information.
 * If the date given is recent, this returns a string such as "7 hours ago".
 * Otherwise, this returns a string such as "2/29/2016 5:45 PM (UTC+05:30) by default, and as "2/29/2016 5:45 PM" if the removeUTC is true".
 */
export function getDateStringWithUTCOffset(date: Date, format?: string, removeUTC?: boolean): string {
    if (!date) {
        return undefined;
    }

    if (removeUTC) {
        return Utils_Date.localeFormat(date, format ? format : "g");
    }

    if (!utcOffsetString) {
        utcOffsetString = getUTCOffsetString(Utils_Date.utcOffset);
    }
    return Utils_String.format("{0} {1}", Utils_Date.localeFormat(date, format? format: "g"), utcOffsetString);
}

/**
 * Returns the appropriate string representation of the date given with an optional parameter of format along with friendly text, if applicable.
 * If the date given is recent, this returns a string such as "2/29/2016 5.45 PM (7 hours ago)".
 * Otherwise, this returns a string such as "2/29/2016 5:45 PM" according to the format if specified.
 */
export function getDateStringWithFriendlyText(date: Date, format?: string): string {
    if (!date) {
        return undefined;
    }

    const isCreationDateRecent: boolean = isDateRecent(date);
    const dateString: string = Utils_Date.localeFormat(date, format ? format : "g")

    if (isCreationDateRecent) {
        return Utils_String.format("{0} ({1})", dateString, Utils_Date.friendly(date));
    }

    return dateString;
}

/**
 * Returns TimeZone based on user profile in terms of UTCOffset.
 * examples: (UTC+05:30) , (UTC-10:00) 
 */
export function getUTCOffsetString(utcOffset: number): string {
    let offset = utcOffset;

    if (offset === 0) {
        return "(UTC)";
    }

    let sign = "+";
    if (offset < 0) {
        offset = -offset;
        sign = "-";
    }

    const offsetHrs: number = Math.floor(offset / MILLISECONDS_IN_AN_HOUR);
    const offsetHrsString: string = offsetHrs < 10 ? "0" + offsetHrs : "" + offsetHrs;

    const offsetMins: number = (offset % MILLISECONDS_IN_AN_HOUR) / MILLISECONDS_IN_A_MINUTE;
    const offsetMinsString: string = offsetMins < 10 ? "0" + offsetMins : "" + offsetMins;

    return Utils_String.format("(UTC{0}{1}:{2})", sign, offsetHrsString, offsetMinsString);
}

/**
 * Returns the date string in a format for consistent display across PR pages.
 */
export function getPrDisplayDateString(date: Date): string {
    return date ? getDateString(date, isDateRecent(date)) : "";
}

/**
 * Returns the date string in a format for consistent display in date tooltips across PR pages.
 */
export function getPrTooltipDateString(date: Date): string {
    return date ? Utils_Date.localeFormat(date, 'G') : "";
}