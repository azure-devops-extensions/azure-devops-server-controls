import * as Chart_Contracts from "Charts/Contracts";
import * as moment from "Presentation/Scripts/moment";
import * as ArrayUtils from "VSS/Utils/Array";
import * as DateUtils from "VSS/Utils/Date";
import * as StringUtils from "VSS/Utils/String";
import { BurndownConstants } from "Widgets/Scripts/Burndown/BurndownConstants";
import { WorkItemEffort } from "Widgets/Scripts/Burndown/BurndownDataContract";
import { BurndownDataFactory } from "Widgets/Scripts/Burndown/BurndownDataFactory";
import { DateSampleInterval } from "Widgets/Scripts/Burndown/BurndownSettings";
import { Iteration } from "Analytics/Scripts/CommonClientTypes";
import { ChartOptionFactoryBase } from "Widgets/Scripts/ModernWidgetTypes/ChartOptionFactoryBase";
import * as Resources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import { getTodayInAccountTimeZone } from "Widgets/Scripts/Shared/TimeZoneUtilities";
import { BurnDirection } from 'Widgets/Scripts/Burndown/BurnDirection';
import * as CultureUtils from "VSS/Utils/Culture";
import { DataPoint, TooltipLineItem, TooltipLineItemMarkerType } from "Charts/Contracts";
import * as WidgetResources from 'Widgets/Scripts/Resources/TFS.Resources.Widgets';
import Utils_Number = require("VSS/Utils/Number");


export interface BurndownChartClickInfo {
    seriesName: string;
    dataPointName: string;
    sampleDate: string;
}

export interface BurnChartInputs {
    /** The start date to show on the chart */
    startDate: string;
    /** Whether the chart should animate or not */
    suppressAnimations?: boolean;
    /**
     * The iterations to show on the chart.
     */
    iterations?: Iteration[];
    /**
     * The interval of the generated sample dates.
     * Ignored if the iterations property is set.
     */
    sampleDatesInterval?: DateSampleInterval;
    /**
     * The dates of the work item effort aggregations.
     * The array is ordered by the dates from earliest to latest.
     */
    sampleDates: string[];
    /**
     * Keys are dates, values are the aggregated effort.
     */
    datesToPrimarySeriesEffort: IDictionaryStringTo<number>;
    /**
     * The average burndown.
     */
    averageBurn: number;
    /**
     * The last date in sampleDates between the start date exclusively and end date inclusively in sampleDates
     * that aligns with the configured sampleDatesInterval.
     * Used by the trendlines as the place to start forecasting from. It is possible for the end date
     * chosen by the user to not align with the date interval chosen, which is why this property is needed.
     * Ignored if the iterations property is set.
     */
    lastGeneratedIntervalSampleDate?: string;
    /**
     * The work item effort aggregations.
     */
    datesToTotalEffort: IDictionaryStringTo<number>;
    /**
     * Completed work item effort data points.
     */
    completedEffort: WorkItemEffort[];
    /**
     * Remaining work item effort data points.
     */
    remainingEffort: WorkItemEffort[];
    /**
     * Whether the chart should show the stacked bar series for completed effort.
     */
    showCompletedEffort: boolean;
    /**
     * Whether the chart should show the effort burndown/burnup trendline.
     */
    showBurnTrendline: boolean;
    /**
     * Whether the chart should show the effort scope change trendline.
     */
    showScopeTrendline: boolean;
    /**
     * Whether the chart should show burnup instead of burndown
     */
    burnDirection: BurnDirection;
    /**
     * Whether the remaining effort should be stacked by work item type.
     */
    showStackedWorkItemTypes: boolean;
    /**
     * The handler for clicking the chart.
     */
    onClick: (clickInfo: BurndownChartClickInfo) => void;
    /**
     * The dictionary mapping work item types to colors that should be used when rendering the chart.
     * Only used if showStackedWorkItemTypes is set to true.
     */
    workItemTypeColorDictionary?: IDictionaryStringTo<string>;
    /**
     * Boolean flag indicting if the parent dashboard is currently embedded
     */
    allowChartClicks: boolean;
}

class ChartOptionStrategyFactory {
    public static getStrategy(chartData: BurnChartInputs): ChartOptionStrategy {
        return (chartData.iterations != null)
            ? new IterationChartOptionStrategy(chartData)
            : new DateIntervalChartOptionStrategy(chartData);
    }
}

export abstract class ChartOptionStrategy {
    public abstract getLabelValues(): string[];
    protected readonly localeDatePattern: string;

    constructor(protected chartInputs: BurnChartInputs) {
        this.localeDatePattern = CultureUtils.getDateTimeFormat().ShortDatePattern;
    }

    private getWorkItemStackedEffortColumnSeries(effort: WorkItemEffort[], witColorDictionary: IDictionaryStringTo<string>): Chart_Contracts.DataSeries[] {
        const series = [];

        // Split remaining (burndown) or completed (burnup) effort by work item type
        const effortByWorkItemTypeDictionary: IDictionaryStringTo<WorkItemEffort[]> = {};
        for (let e of effort) {
            if (effortByWorkItemTypeDictionary[e.WorkItemType] == null) {
                effortByWorkItemTypeDictionary[e.WorkItemType] = [e];
            } else {
                effortByWorkItemTypeDictionary[e.WorkItemType].push(e);
            }
        }

        // Aggregate effort for each work item type into series
        for (let key in effortByWorkItemTypeDictionary) {
            series.push({
                name: key,
                data: this.reduceEffortToSeriesData(effortByWorkItemTypeDictionary[key], this.chartInputs),
                color: (witColorDictionary != null) ? witColorDictionary[key] : undefined
            });
        }

        // Arrange alphabetically by work item type
        ArrayUtils.sortIfNotSorted(series, (a, b) => StringUtils.defaultComparer(a.name, b.name));

        return series;
    }

    private getPrimaryEffortColumnSeries(effort: WorkItemEffort[], labelName: string, color: string): Chart_Contracts.DataSeries[] {
        const remainingEffortSeriesData = [];
        if (this.chartInputs.showStackedWorkItemTypes) {
            return this.getWorkItemStackedEffortColumnSeries(effort, this.chartInputs.workItemTypeColorDictionary);
        } else {
            return [{
                name: labelName,
                data: this.reduceEffortToSeriesData(effort, this.chartInputs),
                color: color,
            }];
        }
    }

    private getCompletedEffortSeriesForBurdownSecondary(): Chart_Contracts.DataSeries {
        return {
            name: Resources.BurndownWidget_CompletedEffortSeriesName,
            data: this.reduceEffortToSeriesData(this.chartInputs.completedEffort, this.chartInputs),
            color: BurndownConstants.completedEffortSeriesColor
        };
    }

    public getBurndownColumnSeries(): Chart_Contracts.DataSeries[] {
        const columnSeries = this.getPrimaryEffortColumnSeries(
            this.chartInputs.remainingEffort,
            Resources.BurndownWidget_RemainingEffortSeriesName,
            BurndownConstants.remainingEffortSeriesColor);

        if (this.chartInputs.showCompletedEffort) {
            columnSeries.push(this.getCompletedEffortSeriesForBurdownSecondary());
        }

        return columnSeries;
    }

    public getBurnupColumnSeries(): Chart_Contracts.DataSeries[] {
        const columnSeries = this.getPrimaryEffortColumnSeries(
            this.chartInputs.completedEffort,
            Resources.BurndownWidget_CompletedEffortSeriesName,
            BurndownConstants.completedEffortSeriesColor);

        return columnSeries;
    }

    private reduceEffortToSeriesData(effort: WorkItemEffort[], featureChartData: BurnChartInputs): number[] {
        const today = DateUtils.format(getTodayInAccountTimeZone(), "yyyy-MM-dd");

        // For each date, sum the Aggregated Effort
        let datesToEffortDictionary = BurndownDataFactory.getEffortByDate(effort);

        // Flatten dictionary to array and ensure that there is data for every date we're charting
        const seriesData = [];
        const dates = this.getSampleDates();
        for (let date of dates) {
            let val = (datesToEffortDictionary[date] != null)
                ? datesToEffortDictionary[date]
                : (StringUtils.ignoreCaseComparer(date, today) <= 0) // Is the date earlier than or equal to today?
                    ? 0 // Fill holes with 0s on days that have already passed
                    : null; // Fill holes with nulls on days in the future
            seriesData.push(val);
        }

        return seriesData;
    }

    protected getSampleDates(): string[] {
        return this.chartInputs.sampleDates;
    }

    protected localeFormatDateString(date: string) {
        return DateUtils.localeFormat(
            DateUtils.parseDateString(date, "yyyy-MM-dd", true),
            this.localeDatePattern,
            true /* ignore time zone */);
    }
}

export class IterationChartOptionStrategy extends ChartOptionStrategy {
    public getLabelValues(): string[] {
        const axisLabelValues = [this.localeFormatDateString(this.chartInputs.startDate)];
        axisLabelValues.push(...this.chartInputs.iterations.map(i => i.IterationName));
        return axisLabelValues;
    }
}

export class DateIntervalChartOptionStrategy extends ChartOptionStrategy {
    public getLabelValues(): string[] {
        return this.chartInputs.sampleDates.map(d => this.localeFormatDateString(d));
    }
}

/**
 * Takes relevant analytics data, and generates pertinent chart options for rendering by common ChartComponent.
 */
export class BurndownChartOptionFactory extends ChartOptionFactoryBase<BurnChartInputs> {
    private readonly localeDateFormat: string;

    constructor() {
        super();
        this.localeDateFormat = CultureUtils.getDateTimeFormat().ShortDatePattern;
    }

    /**
     * Generates chart options for Simple version of Velocity Chart
     * Will need to be re-factored to populate relevant series and x-Axis labelling based on data from server
     */
    public createChartOptions(featureChartData: BurnChartInputs): Chart_Contracts.CommonChartOptions {
        const strategy = ChartOptionStrategyFactory.getStrategy(featureChartData);

        let options = {
            chartType: Chart_Contracts.ChartTypesConstants.Hybrid,
            series: [],
            xAxis: { labelValues: strategy.getLabelValues() },
            yAxis: { endOnTick: false },
            specializedOptions: { chartTypes: [] },
            legendClick: (legendClickEvent: Chart_Contracts.LegendClickEvent) => { }, //No-Op on legend
            suppressAnimation: featureChartData.suppressAnimations
        } as Chart_Contracts.CommonChartOptions;

        if (featureChartData.allowChartClicks) {
            options.click = (clickEvent: Chart_Contracts.ClickEvent) => this._handleClick(clickEvent, featureChartData);
        }

        const specializedOptions = (options.specializedOptions as Chart_Contracts.HybridChartOptions);

        let columnSeries: Chart_Contracts.DataSeries[];
        if (featureChartData.burnDirection === BurnDirection.Up) {
            columnSeries = strategy.getBurnupColumnSeries();
        }
        else
        {
            columnSeries = strategy.getBurndownColumnSeries();
        }

        options.series.push(...columnSeries);
        options.series.forEach(() => specializedOptions.chartTypes.push(Chart_Contracts.ChartTypesConstants.Column));

        const today = DateUtils.format(getTodayInAccountTimeZone(), "yyyy-MM-dd");
        const pastDays = featureChartData.sampleDates.filter(date => StringUtils.ignoreCaseComparer(date, today) <= 0);

        let datesToTotalEffort = featureChartData.datesToTotalEffort;
        let averageScopeChange: number;

        if (featureChartData.showScopeTrendline || (featureChartData.burnDirection === BurnDirection.Up && featureChartData.showBurnTrendline)) {
            averageScopeChange = BurndownDataFactory.getAverageChange(datesToTotalEffort, pastDays);
        }

        // The largest plotted trendline value
        let maximumTrendlineValue: number;

        if (featureChartData.showBurnTrendline) {
            // List of past values of the burn line (note that this is not guaranteed sorted)
            let values = pastDays.map(key => featureChartData.datesToPrimarySeriesEffort[key]);
            // Value of the last bar in the past (note that the pastDays is sorted, so this is guaranteed last)
            let lastHistoricValue = featureChartData.datesToPrimarySeriesEffort[pastDays[pastDays.length - 1]];

            // We adjust the burndown rate to make it hit 0 exactly on a sample date
            let steps: number;
            let adjustedBurnValue: number;

            // Burndown logic
            if (featureChartData.burnDirection === BurnDirection.Down && featureChartData.averageBurn > 0) {
                // If we are burning down, predict how many steps it will take to burn
                steps = Math.ceil(lastHistoricValue / featureChartData.averageBurn);
                // And adjust the burn value so that line intersects with zero at that step exctly
                adjustedBurnValue = lastHistoricValue / steps;
            }
            // Burnup logic
            else if (featureChartData.burnDirection === BurnDirection.Up && featureChartData.showBurnTrendline && -featureChartData.averageBurn - averageScopeChange > 0) {
                // If we are burning faster than adding scope, predict how many steps it will take to burn
                steps = Math.ceil((datesToTotalEffort[pastDays[pastDays.length - 1]] - lastHistoricValue) / (-featureChartData.averageBurn - averageScopeChange));
                // And adjust the burn value so that they intersect on that step exactly
                adjustedBurnValue = -(datesToTotalEffort[pastDays[pastDays.length - 1]] + averageScopeChange * steps - lastHistoricValue) / steps;
            }
            else {
                // Don't predict if we're burning the wrong way! (i.e. we are never going to reach zero, or lines are not going to intersect) - just draw trend line going up until chart end
                adjustedBurnValue = featureChartData.averageBurn;
                steps = featureChartData.sampleDates.length - pastDays.length;
            }

            // If we have enough data points to calculate a trend
            if (pastDays.length >= 2) {

                let burnPredictionSteps =
                    this.pushWithinChartTrendPrediction(values, adjustedBurnValue, featureChartData.sampleDates.length);

                if (
                    (featureChartData.averageBurn > 0 && featureChartData.burnDirection === BurnDirection.Down)
                    ||
                    // If average burn is faster than scope change, there's going to be an intersection eventually
                    (-featureChartData.averageBurn > averageScopeChange && featureChartData.burnDirection === BurnDirection.Up)
                ) {
                    // Annotation
                    let lastSampleIsOnInterval = (featureChartData.iterations != null) || (featureChartData.lastGeneratedIntervalSampleDate === featureChartData.sampleDates[featureChartData.sampleDates.length - 1]);

                    const projectionIsOutsideChart = (pastDays.length + steps) > ((lastSampleIsOnInterval) ? featureChartData.sampleDates.length : featureChartData.sampleDates.length - 1);
                    let labelTextFormat = Resources.BurndownWidget_ProjectCompletionForecastFormat;
                    let labelColor: string;
                    let lineColor: string;
                    let axisPosition: number;

                    let projectedCompletionDate: Date;

                    // When the projection goes outside the chart (but will eventually finish), we draw the red Project Completion label.
                    if (projectionIsOutsideChart) {

                        // The predicted position is always at the end of the chart, to right align the label saying so
                        axisPosition = values.length - 1;

                        labelTextFormat = Resources.BurndownWidget_ProjectCompletionForecastOutsideChartFormat;
                        labelColor = BurndownConstants.forecastAnnotationOutsideChartLabelColor;
                        lineColor = "rgba(0,0,0,0)"; // Transparent

                        let stepsOutsideChart = (pastDays.length + steps - ((lastSampleIsOnInterval) ? featureChartData.sampleDates.length : featureChartData.sampleDates.length - 1));
                        let periodName: string;
                        if (featureChartData.iterations != null) {
                            const lastChartedDateString = featureChartData.sampleDates[featureChartData.sampleDates.length - 1];
                            const lastPastIteration = featureChartData.iterations[pastDays.length - 2]; // -1 for the start date and -1 for 0 indexing
                            const iterationLength = DateUtils.daysBetweenDates(
                                DateUtils.parseDateString(lastPastIteration.StartDateTimeOffset, null, true /* ignore time zone */), // TODO: look for these instances and replace with better code for handling datetimeoffset
                                DateUtils.parseDateString(lastPastIteration.EndDateTimeOffset, null, true /* ignore time zone */));

                            const lastSampleDate = DateUtils.parseDateString(lastChartedDateString, "yyyy-MM-dd", true /* ignore time zone */);
                            projectedCompletionDate = DateUtils.addDays(lastSampleDate, iterationLength * stepsOutsideChart, true /* adjust DST offset */);
                            periodName = stepsOutsideChart === 1 ? Resources.TimePeriod_IterationSingular : Resources.TimePeriod_IterationPlural;
                        } else {

                            // Do we need to 'prorate' the last part of the burnline prediction?
                            if (!lastSampleIsOnInterval && featureChartData.sampleDates.length >= 2 && burnPredictionSteps > 0){
                                // Calculate how long is the last period
                                let lastPeriodLength = moment(featureChartData.sampleDates[featureChartData.sampleDates.length - 1])
                                    .diff(moment(featureChartData.sampleDates[featureChartData.sampleDates.length - 2]),"day");
                                let lastPeriodRatio = 1;
                                // If burning down by weeks or months, calculate the length of last period compared to others
                                if (featureChartData.sampleDatesInterval === DateSampleInterval.Weeks){
                                    lastPeriodRatio = lastPeriodLength / 7;
                                }
                                else if (featureChartData.sampleDatesInterval === DateSampleInterval.Months){
                                    lastPeriodRatio = lastPeriodLength / 30; // Hardcoded at 30
                                }

                                // Undo initial burndown and burn by prorated amount
                                values[values.length-1] = values[values.length-2] - adjustedBurnValue * lastPeriodRatio;
                            }

                            let projectedCompletionMoment: Moment;
                            const lastChartedDateString = featureChartData.lastGeneratedIntervalSampleDate;
                            switch (featureChartData.sampleDatesInterval) {
                                case DateSampleInterval.Days:
                                    projectedCompletionMoment = moment(lastChartedDateString)
                                        .add(stepsOutsideChart, "day");
                                    periodName = stepsOutsideChart === 1 ? Resources.TimePeriod_DaySingular : Resources.TimePeriod_DayPlural;
                                    break;
                                case DateSampleInterval.Weeks:
                                    projectedCompletionMoment = moment(lastChartedDateString)
                                        .add(stepsOutsideChart, "week");
                                    periodName = stepsOutsideChart === 1 ? Resources.TimePeriod_WeekSingular : Resources.TimePeriod_WeekPlural;
                                    break;
                                case DateSampleInterval.Months:
                                    projectedCompletionMoment = moment(lastChartedDateString)
                                        .startOf("month")
                                        .add(stepsOutsideChart, "month")
                                        .endOf("month");
                                    periodName = stepsOutsideChart === 1 ? Resources.TimePeriod_MonthSingular : Resources.TimePeriod_MonthPlural;
                                    break;
                            }

                            projectedCompletionDate = projectedCompletionMoment.toDate();
                        }

                        // Filling out only the specific part for outside the chart
                        labelTextFormat = StringUtils.format(labelTextFormat, "{0}", stepsOutsideChart, periodName);
                    }
                    else
                    {
                        // The predicted position is all past days plus number of steps we predicted it will take to intersect
                        // note that axis position is zero based, so subtracting 1 from the length of past days
                        axisPosition = pastDays.length + steps - 1;

                        projectedCompletionDate = DateUtils.parseDateString(featureChartData.sampleDates[axisPosition], "yyyy-MM-dd", true /* ignore time zone */);
                    }

                    const projectedCompletionDateFormattedString = DateUtils.localeFormat(projectedCompletionDate, this.localeDateFormat, true /* ignore time zone */);
                    const labelText = StringUtils.format(labelTextFormat, projectedCompletionDateFormattedString);

                    options.xAxis.annotationLines = [{
                        labelText: labelText,
                        labelColor: labelColor,
                        axisPosition: axisPosition,
                        lineColor: lineColor
                    }];
                }
            }

            options.series.push({
                name: (featureChartData.burnDirection === BurnDirection.Down) ? Resources.BurndownWidget_BurndownTrendlineSeriesName : Resources.BurnupWidget_BurnupTrendlineSeriesName,
                data: values,
                color: BurndownConstants.burnTrendLineColor
            });
            specializedOptions.chartTypes.push(Chart_Contracts.ChartTypesConstants.Line);

            maximumTrendlineValue = BurndownChartOptionFactory.maxValue([maximumTrendlineValue].concat(values));
        }

        const totalScopeValues = pastDays.map(key => datesToTotalEffort[key] || 0);

        // The largest value that can be plotted is the highest (non-forecasted) total scope value * 1.25
        const maximumAllowedChartValue = 1.25 * BurndownChartOptionFactory.maxValue(totalScopeValues);

        if (featureChartData.showScopeTrendline) {
            this.pushWithinChartTrendPrediction(totalScopeValues, -averageScopeChange, featureChartData.sampleDates.length);

            options.series.push({
                name: Resources.BurndownWidget_TotalScopeTrendlineSeriesName,
                data: totalScopeValues,
                color: BurndownConstants.scopeTrendLineColor
            });
            specializedOptions.chartTypes.push(Chart_Contracts.ChartTypesConstants.Line);

            maximumTrendlineValue = BurndownChartOptionFactory.maxValue([maximumTrendlineValue].concat(totalScopeValues));
        }

        if (maximumTrendlineValue > maximumAllowedChartValue) {
            options.yAxis.max = maximumAllowedChartValue;
        }

        options.tooltip = {
            customTooltipMapping: BurndownChartOptionFactory.customTooltipMapping
        };

        return options;
    }

    /**
     * Filters out elements that evaluate true for isNaN then returns the maximum of the remaining values.
     * @param values - The numbers to compare
     */
    private static maxValue(values: number[]): number {
        return Math.max(...values.filter(val => !isNaN(val)));
    }

    /**
     * Adds trend prediction to the existing trend values, lower-bound by zero.
     * @param values existing values
     * @param burnRate rate at which to trend
     * @param maxValuesLength maximum length that the resulting values can be
     */
    public pushWithinChartTrendPrediction(values: number[], burnRate: number, maxValuesLength: number) : number {
        let burnPreditionSteps = 0;
        let startValue = values[values.length - 1];

        while (true) {
            let burnedValue = startValue - (burnPreditionSteps + 1) * burnRate;
            if (
                burnedValue >= 0 // Stop drawing when we hit zero (if going down).
                && values.length < maxValuesLength // Stop drawing when reaching right side of chart
            ) {
                burnPreditionSteps++;
                values.push(burnedValue);
            } else {
                // If we reached zero (for burndown), or ran number of steps predicted by burnup logic above, stop adding more data
                break;
            }
        }
        return burnPreditionSteps;
    }

    /***
     * Interprets the chart click event details into semantically relevant format.
     * Note: this is made public for UT
     */
    public _handleClick(clickEvent: Chart_Contracts.ClickEvent, chartInputs: BurnChartInputs): void {
        let seriesName = clickEvent.seriesName; //This is the localized name for the clicked series
        let seriesDataIndex = clickEvent.seriesDataIndex; //This corresponds to the position of the iteration in the list.

        // Clicking on the total scope trendline should never do anything.
        if (seriesName === Resources.BurndownWidget_TotalScopeTrendlineSeriesName) {
            return;
        }

        // Clicking on the Burndown/Burnup trendline shouldnt do anything if the date clicked is in the future.
        if(seriesName === Resources.BurndownWidget_BurndownTrendlineSeriesName || seriesName === Resources.BurnupWidget_BurnupTrendlineSeriesName) {
            // Check if the click event is on a future date.
            if(moment(chartInputs.sampleDates[seriesDataIndex]).isAfter(moment(), "day")) {
                return;
            } else {
                //Change the series name to get data based on the bar under it.
                seriesName = (seriesName === Resources.BurndownWidget_BurndownTrendlineSeriesName) ? WidgetResources.BurndownWidget_RemainingEffortSeriesName : WidgetResources.BurndownWidget_CompletedEffortSeriesName;
            }
        }

        chartInputs.onClick({
            seriesName: seriesName,
            sampleDate: chartInputs.sampleDates[seriesDataIndex],
            dataPointName: clickEvent.labelName
        });
    }

    private static customTooltipMapping(points: DataPoint[]): TooltipLineItem[] {
        return points.map<TooltipLineItem>(point => {

            const roundedVal = Math.round(+point.values[0]*10)/10;
            const localedNumber = Utils_Number.toDecimalLocaleString(roundedVal);

            return {
                styleType: {
                    color: point.color,
                    type: TooltipLineItemMarkerType.Square
                },
                text: `${point.seriesName}: ${localedNumber}`
            };
        });
    }
}