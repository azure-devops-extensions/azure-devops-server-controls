
import moment = require("Presentation/Scripts/moment");
import Utils_Date = require("VSS/Utils/Date");
import Culture = require("VSS/Utils/Culture");

/**
 * Contain general date functions.
 */
export class DateManipulationFunctions {

    /**
    * Get the amount of days in a month. Used to determine the size of the month
    * @param Date a date that is in the month in question
    * @returns number number of days in the month
    */
    public static getAmountOfDaysInMonth(value: Date): number {
        if (value == null) {
            throw Error("Date must be defined");
        }
        return new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
    }

    /**
     * Get the number of months between 2 dates.
     *  - If the same month, will return 0
     *  - If 2 subsequents months, will return 1
     * @param dateFrom a date that is in the start month
     * @param dateTo a date that is in the end months
     * @return {number} - Number of months between 2 dates. Always positive.
     */
    public static getMonthsCountBetweenDates(dateFrom: Date, dateTo: Date): number {
        let absoluteTo = this.getDateAbsoluteMonthInNumber(dateTo);
        let absoluteFrom = this.getDateAbsoluteMonthInNumber(dateFrom);
        return Math.abs(absoluteTo - absoluteFrom);
    }

    /**
     * Return a integer that represent the sum of month for the year and month
     * @param {Date} - Date to get the absolute number of months
     * @return {number} - Months
     */
    public static getDateAbsoluteMonthInNumber(date: Date): number {
        let month = Number(moment(date).format("MM"));
        let year = Number(moment(date).format("YYYY"));
        let absolute = month + (year * 12);
        return absolute;
    }

    /**
    * Get a list of date that is an array of Year+Month between inclusively the dateFrom date and the dateTo date
    * @param dateFrom a date that is in the start month
    * @param dateTo a date that is in the end months
    * @returns {Date[]} List of Date months inclusively from dateFrom to dateTo
    */
    public static getMonthsInclusive(dateFrom: Date, dateTo: Date): Date[] {
        if (dateFrom == null) {
            throw Error("Date from must be defined");
        }
        if (dateTo == null) {
            throw Error("Date to must be defined");
        }
        if (dateFrom > dateTo) {
            throw Error("Date from must be smaller or equal than date to");
        }

        let dates: Date[] = [];
        while (true) {
            dates.push(new Date(dateFrom.getFullYear(), dateFrom.getMonth()));
            if (dateFrom.getFullYear() === dateTo.getFullYear() && dateFrom.getMonth() === dateTo.getMonth()) {
                break;
            }
            dateFrom = moment(dateFrom).add(1, "month").toDate();
        }

        return dates;
    }

    /**
     * Is the given date last day of a month in UTC
     * @param date date to check
     * @returns true if date is the last day of a month. false otherwise
     */
    public static isLastDayOfMonthInUTC(date: Date): boolean {
        if (date == null) {
            throw Error("Date must be defined");
        }

        let oneMinute = 60 * 1000;
        let utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * oneMinute));

        return utcDate.getDate() === DateManipulationFunctions.getAmountOfDaysInMonth(utcDate);
    }

    /**
     * Format locale date into UTC date string using locale-specific date format.
     * e.g. [Sun Dec 31 16:00:00 PST 2000] (== [Mon Jan 1 00:00:00 UMT 2001]) => "1/1/2001"
     * @param date The date in locale format
     * @param format? Date string format
     * @returns formatted date string in UTC
     */
    public static getUtcDateLabel(localeDate: Date, format?: string): string {
        if (localeDate == null) {
            throw Error("Date must be defined");
        }
        return Utils_Date.localeFormat(Utils_Date.shiftToUTC(localeDate), format, true);
    }

    /**
     * Return formatted dd/mm string based on culture ShortDatePattern locale format.
     * e.g. if the locale format is "yyyy/dd/mm" => "dd/mm"
     * @returns formatted dd/mm string based on the locale format.
     */
    public static getShortDayMonthPattern(): string {
        const dateTimeFormat = Culture.getDateTimeFormat();
        let resultPattern = dateTimeFormat.ShortDatePattern;

        //  Remove the year portion to keep month day (we use 'm' and 'd' only).
        //  If the pattern does not match our regex, we default to the full short-date pattern.
        const shortMonthDayPatternArray = dateTimeFormat.ShortDatePattern.match(/([d].*[m])|([m].*[d])/gi);

        if (shortMonthDayPatternArray && shortMonthDayPatternArray.length > 0) {
            resultPattern = shortMonthDayPatternArray[0];
        }
        
        return resultPattern;
    }

    /**
     * Get the number of days from the 1st day of the input date to now
     * @param {Date} date The date used to calculate the number of days from
     * @returns the number of days
     */
    public static getNumberOfDaysFromFirstDayOfDateToNow(date: Date): number {
        if (date == null) {
            throw Error("Date must be defined");
        }

        let oneDay = 1000 * 60 * 60 * 24;
        let firstDayOfTheMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        let timespan = moment(Date.now()).diff(moment(firstDayOfTheMonth));
        return timespan / oneDay;
    }

    /**
     * Take a date where the year and month is preserved while the day is changed to the first day
     * @param {Date} date - Date to be transformed
     * @return {Date} - A clone of the initial date with the day changed
     */
    public static getDateWithFirstDayOfMonth(date: Date): Date {
        if (date == null) {
            throw Error("Date must be defined");
        }
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }

    /**
     * Take a date where the year and month is preserved while the day is changed to the last day of the month
     * @param {Date} date - Date to be transformed
     * @return {Date} - A clone of the initial date with the day changed
     */
    public static getDateWithLastDayOfMonth(date: Date): Date {
        if (date == null) {
            throw Error("Date must be defined");
        }
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }

    /**
     * Get days between two dates.  Return negative number if date1 is after date2. The result is exclusive of the second date (Mon->Fri==4).
     * @param {Date} date1 - Date to compare
     * @param {Date} date2 - Date to compare
     * @return {number} - Number of days between the two dates (non-inclusive) 
     */
    public static getDaysBetween(date1: Date, date2: Date): number {
        let numberOfDays = Utils_Date.daysBetweenDates(date1, date2, /*non-inclusive*/ true);

        // If date1 is after date2, return a negative number
        if (date1 > date2) {
            numberOfDays = numberOfDays * -1;
        }

        return numberOfDays;
    }
}
