import * as ArrayUtils from "VSS/Utils/Array";
import * as DateUtils from "VSS/Utils/Date";

import { DateSKParser } from "Analytics/Scripts/DateSKParser";

import { Iteration } from 'Analytics/Scripts/CommonClientTypes';

/**
 *  Helper class to support operations on the Time Period Control, including the Date/Iteration pickers.
 */
export class TimePeriodHelper {
    /**
     * Returns the end date for an iteration based on the iteration path.
     */
    public static getEndDateOfIteration(allIterations: Iteration[], iterationPath: string): string {
        let dateString: string;
        let endDate: string;
        let selectedIteration = this.getSelectedIterationFromPath(iterationPath, allIterations);

        if (selectedIteration) {
            endDate = selectedIteration.EndDateTimeOffset;
        }

        if (endDate) {
            let date = DateUtils.parseDateString(endDate);
            dateString = DateUtils.localeFormat(date, 'd', true);
        } else {
            dateString = "";
        }

        return dateString;
    }

    /**
     * Looks up an iteration by iteration path
     * @param iterationPath
     * @param allIterations - list of all iterations
     */
    public static getSelectedIterationFromPath(iterationPath: string, allIterations: Iteration[]): Iteration {
        let iteration: Iteration = null;

        iteration = ArrayUtils.first(allIterations, (iteration) => { return iteration.IterationPath === iterationPath });

        return iteration;
    }

    /**
     * Returns a list of iterations which end after the specified start date
     * @param iterations - list of all iterations.
     * @param timePeriodStartDate - user-selected start date for the time period.
     */
    public static getValidIterations(iterations: Iteration[], timePeriodStartDate: Date): Iteration[] {
        let validIterations: Iteration[] = [];
        iterations.forEach(iteration => {
            if (this.isValidIteration(iteration, timePeriodStartDate)) {
                validIterations.push(iteration);
            }
        });
        return validIterations;
    }

    /**
     * Returns a list of iterations which end after the specified start date
     * @param iterations - list of all iterations.
     * @param timePeriodStartDate - user-selected start date for the time period.
     */
    public static isValidIteration(iteration: Iteration, timePeriodStartDate: Date): boolean {
        let isValid = false;
        if (iteration.EndDateTimeOffset) {
            let iterationEndDate: Date = DateUtils.parseDateString(iteration.EndDateTimeOffset, DateSKParser.dateSKFormat, false);

            isValid = (DateUtils.defaultComparer(iterationEndDate, timePeriodStartDate) > 0);
        }
        return isValid;
    }
}