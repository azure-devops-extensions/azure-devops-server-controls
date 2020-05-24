import * as KanbanTimeContracts from "Widgets/Scripts/KanbanTime/KanbanTimeContracts";
import * as StringUtils from "VSS/Utils/String";
import * as DateUtils from "VSS/Utils/Date";

import { DateSKParser } from "Analytics/Scripts/DateSKParser";

export class KanbanTimeDataCalculator {
    /** This is the fraction of the full rolling period used for calculating the size of the rolling window. */
    public static RollingWindowFraction: number = 0.2;

    /**
     * Get the standard deviation from first date in data to today.
     * @param calcData is assumed to be the data for (startDate - (movingWindowDays - 1)) to today. This is not validated/enforced by the function. Days without data are ignored during window calculations.
     * @param startDate is a date in the format "yyyy-MM-dd".
     * @param movingWindowDays is how large the moving window should be when calculating standard deviations.
     */
    public static getWindowedStdDeviations(calcData: KanbanTimeContracts.KanbanTimeStdDevCalculationData[], startDate: string, movingWindowDays: number): number[] {
        return KanbanTimeDataCalculator.processData(KanbanTimeDataCalculator.computeStandardDeviations, calcData, startDate, movingWindowDays);
    }

    /**
     * Get the moving average from first date in data to today.
     * @param calcData is assumed to be the data for (startDate - (movingWindowDays - 1)) to today. This is not validated/enforced by the function. Days without data are ignored during window calculations.
     * @param startDate is a date in the format "yyyy-MM-dd".
     * @param movingWindowDays is how large the moving window should be when calculating averages.
     */
    public static getWindowedMovingAverage(calcData: KanbanTimeContracts.KanbanTimeStdDevCalculationData[], startDate: string, movingWindowDays: number): number[] {
        return KanbanTimeDataCalculator.processData(KanbanTimeDataCalculator.computeAverage, calcData, startDate, movingWindowDays);
    }

    /**
     * Get the average of the kanbantime
     */
    public static getOverallAverage(calcData: KanbanTimeContracts.KanbanTimeStdDevCalculationData[]) {
        if (calcData && calcData.length > 0) {
            let totalSum = 0;
            let totalCount = 0;
            for (let i = 0; i < calcData.length; i++) {
                totalSum += calcData[i].sum;
                totalCount += calcData[i].count;
            }
            return totalSum / totalCount;
        } else {
            return 0;
        }
    }

    /**
     * Get the moving average window based on the rolling period
     */
    public static getMovingWindow(rollingPeriod: number): number {
        var movingWindow = Math.floor(rollingPeriod * KanbanTimeDataCalculator.RollingWindowFraction);

        // Make sure we are always return 1 as minumum.
        return (movingWindow < 1) ? 1 : movingWindow;
    }

    public static getChartMinMaxValue(stdDevData: [number, number], workItemKanbanTime: number[]): KanbanTimeContracts.AxisMinMaxValue {
        let scatterMin = (workItemKanbanTime && workItemKanbanTime.length > 1) ? Math.min(...workItemKanbanTime) : null;
        let scatterMax = (workItemKanbanTime && workItemKanbanTime.length > 1) ? Math.max(...workItemKanbanTime) : null;
        let stdDevMin = Math.min(...stdDevData.filter(tuple => tuple != null).map(tuple => tuple[0]));
        let stdDevMax = Math.max(...stdDevData.filter(tuple => tuple != null).map(tuple => tuple[1]));
        return {
            maxValue: scatterMax ? Math.max(scatterMax, stdDevMax) : stdDevMax,
            minValue: scatterMin ? Math.min(scatterMin, stdDevMin) : stdDevMin
        }
    }

    private static processData(func: Function, calcData: KanbanTimeContracts.KanbanTimeStdDevCalculationData[], startDate: string, movingWindowDays: number): number[] {
        if (movingWindowDays < 1) {
            movingWindowDays = 1;
        }

        let combinedCalcData = KanbanTimeDataCalculator.combineDataByDateAndFillMissingDays(calcData, startDate, movingWindowDays);

        let elements: number[] = [];
        for (let i = 0, l = combinedCalcData.length - movingWindowDays + 1; i < l; ++i) {
            elements.push(
                func(combinedCalcData.slice(i, i + movingWindowDays)
                    .filter(data => data.count > 0)));
        }

        let prevVal = elements[0];
        for (let i = 1, l = elements.length; i < l; ++i) {
            if (prevVal != null && elements[i] == null) {
                elements[i] = prevVal;
            }

            prevVal = elements[i];
        }

        return elements;
    }

    private static combineDataByDateAndFillMissingDays(stdDevCalcData: KanbanTimeContracts.KanbanTimeStdDevCalculationData[], startDateString: string, movingWindowDays: number): KanbanTimeContracts.KanbanTimeStdDevCalculationData[] {
        let dataCopy = stdDevCalcData.slice();
        let combinedCalcData: KanbanTimeContracts.KanbanTimeStdDevCalculationData[] = [];

        let date = DateSKParser.parseDateStringAsLocalTimeZoneDate(startDateString);
        date = DateUtils.addDays(date, -(movingWindowDays - 1));

        // TODO replace with getTodayInAccountTimeZone
        let endDate = new Date();

        var daysAgo = DateUtils.daysBetweenDates(endDate, date, true);

        // Pad days with 0s so there are no missing days to make it easier to process later when doing the computations
        for (var i = 0; i <= daysAgo; ++i) {
            dataCopy.push({
                completedDate: DateUtils.format(date, DateSKParser.dateStringFormat),
                count: 0,
                sum: 0,
                sumOfSquares: 0,
                workItemType: StringUtils.empty
            });

            date = DateUtils.addDays(date, 1, true /* adjustDSTOffset */);
        }

        // Sort the data by completed date
        dataCopy.sort((a, b) => StringUtils.defaultComparer(a.completedDate, b.completedDate));

        // Combine data with the same completed date
        dataCopy.forEach((item) => {
            if (combinedCalcData.length === 0 || combinedCalcData[combinedCalcData.length - 1].completedDate !== item.completedDate) {
                combinedCalcData.push({
                    completedDate: item.completedDate,
                    count: item.count,
                    sum: item.sum,
                    sumOfSquares: item.sumOfSquares,
                    workItemType: StringUtils.empty // We do not care about the work item types anymore since we're merging them all by completed date
                });
            } else {
                let lastItem = combinedCalcData[combinedCalcData.length - 1];
                lastItem.count += item.count;
                lastItem.sum += item.sum;
                lastItem.sumOfSquares += item.sumOfSquares;
            }
        });

        return combinedCalcData;
    }

    private static computeStandardDeviations(windowData: { count: number, sum: number, sumOfSquares: number }[]): number {
        if (windowData.length > 0) {
            let data = windowData.reduce((a, b) => {
                return {
                    count: a.count + b.count,
                    sum: a.sum + b.sum,
                    sumOfSquares: a.sumOfSquares + b.sumOfSquares
                };
            });

            let sumOfSquaresDivCount = data.sumOfSquares / data.count;
            let powSumCount = Math.pow(data.sum, 2) / Math.pow(data.count, 2)
            // With negative value, sqrt will return NaN, we would return zero for that case.
            return sumOfSquaresDivCount - powSumCount > 0 ? Math.sqrt(sumOfSquaresDivCount - powSumCount) : 0;
        } else {
            return null;
        }
    }

    private static computeAverage(windowData: { sum: number, count: number }[]): number {
        if (windowData.length > 0) {
            let data = windowData.reduce((a, b) => {
                return {
                    sum: a.sum + b.sum,
                    count: a.count + b.count
                };
            });

            return data.sum / data.count
        } else {
            return null;
        }
    }
}