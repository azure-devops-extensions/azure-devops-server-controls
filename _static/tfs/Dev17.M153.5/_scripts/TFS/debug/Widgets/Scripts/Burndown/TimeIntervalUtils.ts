import { Iteration } from 'Analytics/Scripts/CommonClientTypes';
import { DateSamplingConfiguration, DateSampleInterval } from "Widgets/Scripts/Burndown/BurndownSettings";
import * as moment from 'Presentation/Scripts/moment';

export class TimeIntervalUtils {
    public static getSampleDates(startDate: string, iterations: Iteration[]): { sampleDates: string[], lastIntervalDate: string }
    public static getSampleDates(startDate: string, dateSamplingConfiguration: DateSamplingConfiguration): { sampleDates: string[], lastIntervalDate: string }
    public static getSampleDates(startDate: string, param2: Iteration[] | DateSamplingConfiguration): { sampleDates: string[], lastIntervalDate: string } {

        // Dates always has the start date in it first.
        let dates: string[] = [startDate];
        let lastIntervalDate: string;

        if (TimeIntervalUtils.isIterations(param2)) {
            dates.push(...TimeIntervalUtils.getIterationEndDates(param2));
        } else {
            const startMoment = moment(startDate);

            const { endDate, lastDayOfWeek, sampleInterval } = param2;
            const endMoment = moment(endDate);

            let intervalArg: string;
            let currentMoment: Moment;
            switch(sampleInterval) {
                case DateSampleInterval.Days:
                    intervalArg = "day";
                    currentMoment = startMoment;
                    break;
                case DateSampleInterval.Weeks:
                    intervalArg = "week";
                    // Clone moment to move the weekday
                    currentMoment = startMoment.clone();
                    // Move currentmoment to _last_ occurance of chosen end of week. Note that this always goes back in time, moment-specific behavior.
                    currentMoment.isoWeekday(lastDayOfWeek);
                    // Check that we actually went back in time (we could be in same day)
                    if (currentMoment.isBefore(startMoment, "day")) {
                        // If went back, jump forward to _next_ occurance of chosen end of week
                        currentMoment.add(7, "day");
                    }
                    break;
                case DateSampleInterval.Months:
                    intervalArg = "month";
                    // End of the month
                    currentMoment = startMoment
                        .endOf(intervalArg);
                    break;
            }

            // Append interval dates
            while(currentMoment.isBefore(endMoment, "day") || currentMoment.isSame(endMoment, "day")) {
                if (!currentMoment.isSame(startDate,"day")) {
                    dates.push(currentMoment.format("YYYY-MM-DD" /* Moment date formatting for 'yyyy-MM-dd' */));
                }

                if (sampleInterval === DateSampleInterval.Months) {
                    currentMoment
                        .startOf("month")
                        .add(1, intervalArg)
                        .endOf("month");
                } else {
                    currentMoment.add(1, intervalArg);
                }
            }

            // Remember the last date that fits the interval (or start date if we didn't generate any more)
            lastIntervalDate = dates[dates.length - 1];

            // If the end date didn't match up to an interval, add it
            if (endDate !== dates[dates.length - 1]) {
                dates.push(endDate);
            }
        }

        return { sampleDates: dates, lastIntervalDate: lastIntervalDate };
    }

    private static isIterations(info: Iteration[] | DateSamplingConfiguration): info is Iteration[] {
        let samplingConfig = info as DateSamplingConfiguration;
        return (typeof samplingConfig.lastDayOfWeek === 'undefined' && (typeof samplingConfig.sampleInterval === 'undefined'));
    }

    private static getIterationEndDates(iterations: Iteration[]): string[] {
        return iterations.map(
            iteration => iteration.EndDateTimeOffset.substr(0, "yyyy-MM-dd".length)
        );
    }
}
