import { HistoryQueryResult } from "Widgets/Scripts/MonteCarloWidget/MonteCarloHistoryQuery";
import { TimePeriodConfiguration, DateSamplingConfiguration } from 'Widgets/Scripts/Burndown/BurndownSettings';

export interface MonteCarloProcessedDataResult {
    average: number;
    stdDev: number;
}

/** This class calculates the average and standard deviation of the MonteCarloHistoryQuery results. */
export class MonteCarloDataProcessor {
    public getStats(historyQueryResults: HistoryQueryResult[], timePeriod: TimePeriodConfiguration): MonteCarloProcessedDataResult {
        let completedDates = this.aggregateQueryResults(historyQueryResults);; // counts of tasks completed on each date
        let numDays = this.getNumDays(timePeriod);
        let numTasks = completedDates.length === 0 ? 0 : completedDates.reduce((sum, currentValue) => sum + currentValue);

        let average = numTasks / numDays;
        let stdDev = this.getStdDev(average, completedDates, numDays);
        
        return {
            average: average,
            stdDev: stdDev
        }
    }

    /** takes each query result and adds it to the map */
    private aggregateQueryResults(historyQueryResults: HistoryQueryResult[]): number[] {
        let completedDates = [];
        for (let result of historyQueryResults) {
            completedDates.push(result.countOfWorkItems);
        }
        return completedDates;
    }

    private getStdDev(average: number, completedDates: number[], numDays: number): number{
        // calculate std dev of tasks finished each day: https://www.mathsisfun.com/data/standard-deviation-formulas.html

        if (completedDates.length === 0) {
            return 0;
        }

        let countVariance = 0;
        for (let tasksCompleted of completedDates) {
            countVariance  += (tasksCompleted - average) ** 2;
        }

        // include days that didn't have any tasks completed
        let numZeroWorkItemDays = numDays - completedDates.length;
        for (let i = 0; i < numZeroWorkItemDays; i++) {
            countVariance += (0 - average) ** 2;
        }

        let avgVariance = countVariance / numDays;

        return Math.sqrt(avgVariance);
    }

    /** Returns the number of days tasks were completed over. */
    private getNumDays(timePeriod: TimePeriodConfiguration): number {
        var startDate = new Date(timePeriod.startDate);
        let endDate = new Date((<DateSamplingConfiguration>timePeriod.samplingConfiguration.settings).endDate);

        let timeDiff = Math.abs(endDate.getTime() - startDate.getTime());
        return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // divide by number of milliseconds in a day
    }
}