/// <reference types="jquery" />
import Diag = require("VSS/Diag");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Array = require("VSS/Utils/Array");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import { DayOfWeek } from "VSS/Common/Contracts/System";
import { DateRange } from "TFS/Work/Contracts";

export namespace IterationDateUtil {
    /**
     * Return the localized sprint dates display string. Returns null if dates not passed in.
     * @param startDate
     * @param finishDate
     */
    export function getSprintDatesDisplay(startDate: Date, finishDate: Date): string {
        let display: string = "";
        if (startDate && finishDate) {
            display = Utils_String.format(AgileControlsResources.IterationDateRange,
                Utils_Date.localeFormat(startDate, "M", /*ignoreTimeZone*/ true),
                Utils_Date.localeFormat(finishDate, "M", /*ignoreTimeZone*/ true));
        }
        return display;
    }

    /**
     * Return a date with the timezone changed to UTC
     *  e.g. [Sun Feb 13 00:00:00 PST 2000] => [Sat Feb 12 16:00:00 PST 2000] (== [Sun Feb 13 00:00:00 UMT 2000])
     * @param dateString
     * @param format
     */
    export function parseLocaleUTC(dateString, format): Date {
        // parse the date using the user's locale format.
        // This will generate a date in their current timezone.
        let date = Utils_Date.parseLocale(dateString, format, true);
        return Utils_Date.shiftToLocal(date);
    }

    /**This method is an extensibility point for the column object in the grid control.
     * Override the get Column Value to allow for formatting the start and end date columns.
     * The "this" reference below refers to the grid control, not the AdminAreaIteration object.     * 
     * @param dataIndex data index in current page
     * @param columnIndex column index
     * @param columnOrder column order
     */
    export function getIterationDateColumnValue(dataIndex: number, columnIndex: number, columnOrder: number): string {
        // Not all inputs are required by getColumnValue(), let that function deal with parameter checking. Not asserting here is by design.
        let date = this.getColumnValue(dataIndex, columnIndex, columnOrder);
        let value = "";

        if (date) {
            date = Utils_Date.shiftToUTC(date);
            value = Utils_Date.localeFormat(date, "d", true); /* short date format, locale specific */
        }

        return value;
    }

    /**
     * Get suggested date defaults for the iteration.  
     * @param startDateLocal 
     * @param finishDateLocal 
     * @param weekends 
     */
    export function getIterationDateDefaultInformation(startDateLocal: Date, finishDateLocal: Date, weekends: number[]): { suggestedStartDate: Date, workingDaysOffset: number } {
        // Iteration dates are stored as 0:00 UTC. In order to test for the current "day of the week"
        // (which will be checking the local day of the week) we shift the date value to get an
        // equivalent local time with the same "date" and "time" (00:00) as the UTC value.
        // Then we do the date calculations (and "weekend" test) before shifting back to an
        // equivalent local time (which is then back to 00:00 UTC).
        let suggestedStartDateUTC = Utils_Date.shiftToUTC(finishDateLocal);
        suggestedStartDateUTC = IterationDateUtil.getNextWorkingDay(suggestedStartDateUTC, weekends);

        const originalNumWorkingDays = IterationDateUtil.getNumberOfWorkingDays(
            Utils_Date.shiftToUTC(startDateLocal),
            Utils_Date.shiftToUTC(finishDateLocal),
            weekends,
            [] // Using these working days to calcualate suggested dates.  Should not include any days off. 
        );

        const suggestedEndDateUTC = IterationDateUtil.addWorkingDays(suggestedStartDateUTC, originalNumWorkingDays, weekends);
        const offset = Utils_Date.daysBetweenDates(suggestedEndDateUTC, suggestedStartDateUTC, true /* exclusive */);

        return {
            suggestedStartDate: Utils_Date.shiftToLocal(suggestedStartDateUTC),
            workingDaysOffset: offset
        };
    }

    /**  Get the next working day after a starting date.
     *   Note: When getting the "day" to check against the weekend we use the local day (not UTC day)
     *   so if you want the UTC day, first use VSS.Utils_Core.Utils_Date.convertToLocal, then convert
     *   the results back with convertToUTC.
     * @param startDate The date to start from
     * @param weekends [optional] Array of values (0-6) that represent days considered to be weekends
     * @returns Returns the next date after startDate which is not a weekend day. If startDate is null|undefined then return null.
     */
    export function getNextWorkingDay(startDate?: Date, weekends?: any[]): Date {
        if (startDate) {
            Diag.Debug.assertParamIsDate(startDate, "startDate");
        }
        Diag.Debug.assertParamIsArray(weekends, "weekends", false);

        let nextDate = null;

        if (startDate) {
            nextDate = new Date(startDate.getTime());

            do {
                nextDate.setDate(nextDate.getDate() + 1);
            } while (Utils_Array.contains(weekends, nextDate.getDay()));
        }

        return nextDate;
    }

    /** Get the number of working days between today and end date, including the end date. Return 0 if today is not in the current iteration.
     *  End date is expected to be passed in as a UTC time. 
     * 
     *  This method uses end date in UTC and today in local time. Iteration dates come from the server in UTC 
     *  as our way of attempting to ignore the time. When it gets to the client javascript automatically converts it to local time. 
     *  To return it back to our "date only" format we convert it to UTC - which should be a date at 00:00 hours. 
     *  We then want to compare that date to local time. Local time must be stripped of any hours, minutes, etc, otherwise the same 
     *  date at different hours will not be equivalent. 
     *  
     *  For example, if today is 10/10/2017 in Seattle (UTC -8). My iteration end date is 10/15/2017 
     *  (stored on server as 10/15/2017 00:00 UTC), on the client end date will be converted to 10/14/2017 18:00.
     *  Now we need to compare today in Seattle (10/10/2017 at 00:00) to the end date converted back to UTC (10/15/2017 00:00) 
     *  in order to accurately know if today is in the iteration. This example would return 6 working days left (no weekends). 
     *  
     * @param endDate The date to end at in UTC
     * @param weekends Array of values (0-6) that represent days considered to be weekends
     * @returns Returns the number of working days between startDate and endDate
     */
    export function getNumberWorkingDaysLeft(endDate: Date, weekends: any[], teamDaysOff: DateRange[]): number {
        Diag.Debug.assertParamIsDate(endDate, "endDate");
        Diag.Debug.assertParamIsArray(weekends, "weekends", false);

        // Get today in local time with no hours so that we are just comparing dates. 
        // Without this 10/1/17 2:00 is greater than 10/1/17 00:00.  We want these to be equivalent. 

        return this.getNumberOfWorkingDays(getTodayInLocalTimeWithNoHours(), endDate, weekends, teamDaysOff)
    }

    /**  Get the number of working days between start date and end date, including both of them.
     *   e.g. --
     *   1. startDate = 20th June Saturday, endDate = 21st June Sunday => return 0
     *   2. startDate = 22nd June Monday, endDate = 22nd June Monday   => return 1
     *   3. startDate = 22nd June Monday, endDate = 23rd June Tuesday  => return 2
     *   4. startDate = 22nd June Monday, endDate = 29th June Monday   => return 6
     *   Note: When getting the "day" to check against the weekend we use the local day (not UTC day)
     *   so if you want the UTC day, first use VSS.Utils_Core.Utils_Date.convertToLocal, then convert
     *   the results back with convertToUTC.
     * @param startDate The date to start from
     * @param endDate The date to end at
     * @param weekends Array of values (0-6) that represent days considered to be weekends
     * @returns Returns the number of working days between startDate and endDate
     */
    export function getNumberOfWorkingDays(startDate: Date, endDate: Date, weekends: any[], teamDaysOff: DateRange[]): number {
        Diag.Debug.assertParamIsDate(startDate, "startDate");
        Diag.Debug.assertParamIsDate(endDate, "endDate");
        Diag.Debug.assertParamIsArray(weekends, "weekends", false);
        Diag.Debug.assert(startDate <= endDate, "end date should be equal to or higher than start date");

        let numWorkingDays = 0,
            nextDate = new Date(startDate.getTime());

        while (nextDate <= endDate) {
            // Only count day if it is a working day (not weekend) and the team is working (not a team day off)
            if (!Utils_Array.contains(weekends, nextDate.getDay()) && !hasOverlapWithTeamDaysOff(nextDate, teamDaysOff)) {
                numWorkingDays += 1;
            }
            nextDate.setDate(nextDate.getDate() + 1);
        }

        return numWorkingDays;
    }

    /**
     * Check if the provided date is a team day off
     * @param date Date to check
     * @param teamDaysOff Set of date ranges that the team is taking off
     */
    export function hasOverlapWithTeamDaysOff(date: Date, teamDaysOff: DateRange[]): boolean {
        Diag.Debug.assertParamIsDate(date, "date");
        Diag.Debug.assertParamIsArray(teamDaysOff, "teamDaysOff", false);

        for (const teamDaysOffRange of teamDaysOff) {
            if (date >= teamDaysOffRange.start && date <= teamDaysOffRange.end) {
                return true;
            }
        }

        return false;
    }

    /** add "numWorkingDays" amount of working days to the startDate and returns the date computed.
    *  Note: If numWorkingDays = 0, it will return startDate itself.
    *        The startDate and the returned endDate are also counted in the computation.
    *        e.g. 
    *                  startDate = 20 June Monday, numWorkingDays = 1, returns 20 June Monday itself.
    *                  startDate = 20 June Monday, numWorkingDays = 2, returns 21 June Tuesday.
    *                  startDate = 18 June Sat, numWorkingDays = 1, returns 20 June Monday.
    * @startDate The date to start from
    * @numWorkingDays The number of working days to be added
    * @weekends Array of values (0-6) that represent days considered to be weekends
    * @returns Returns the date after adding "numWorkingDays" amount of working days to startDate
    */
    export function addWorkingDays(startDate: Date, numWorkingDays: number, weekends: number[]): Date {
        Diag.Debug.assertParamIsDate(startDate, "startDate");
        Diag.Debug.assertParamIsInteger(numWorkingDays, "numWorkingDays");
        Diag.Debug.assertParamIsArray(weekends, "weekends", false);
        Diag.Debug.assert(numWorkingDays >= 0, "number of working days to be added must be non-negative");

        let remainingWorkingDays = numWorkingDays,
            endDate = new Date(startDate.getTime());

        while (remainingWorkingDays > 0) {
            if (!Utils_Array.contains(weekends, endDate.getDay())) {
                remainingWorkingDays -= 1;
            }
            if (remainingWorkingDays > 0) {
                endDate.setDate(endDate.getDate() + 1);
            }
        }

        return endDate;
    }

    export function getWeekendsFromWorkingDays(workingDays: DayOfWeek[]): DayOfWeek[] {
        const weekends: DayOfWeek[] = [];

        for (let i = DayOfWeek.Sunday; i <= DayOfWeek.Saturday; i++) {
            if (!workingDays || workingDays.indexOf(i) < 0) {
                weekends.push(i);
            }
        }

        return weekends;
    }

    /**
     * Determine if the iteration includes today.  Expecting the dates in UTC time. Calculates using today local time. 
     * (i.e. all dates should have time 00:00.  This way the date is true to what is stored server side)     
     * @param startDate - Start date of iteration in UTC. 
     * @param endDate - End date of iteration in UTC. 
     */
    export function isTodayInSprint(startDate: Date, endDate: Date): boolean {
        // Zero out the time so that we are just comparing dates. 
        // Without this 10/1/17 2:00 is greater than 10/1/17 00:00.  We want these to be equivalent. 
        let today = getTodayInLocalTimeWithNoHours();

        return startDate <= today && endDate >= today;
    }

    /**
     * Return today (in local time) with no hours, minutes, seconds, milliseconds.
     */
    export function getTodayInLocalTimeWithNoHours(): Date {
        let today = new Date(Date.now());
        return Utils_Date.stripTimeFromDate(today);
    }
}