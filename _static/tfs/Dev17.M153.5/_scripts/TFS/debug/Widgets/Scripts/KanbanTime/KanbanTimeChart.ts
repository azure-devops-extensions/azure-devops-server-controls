/// <reference types="q" />
/// <reference types="jquery" />

import * as Q from "q";

import { DateSKParser } from "Analytics/Scripts/DateSKParser";

import * as Chart_Controls from "Charts/Controls";
import * as Charts_Contracts from "Charts/Contracts";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import { EmptyChartHelper } from "Charting/Scripts/EmptyChartHelper";
import * as KanbanTimeContracts from  "Widgets/Scripts/KanbanTime/KanbanTimeContracts";
import { KanbanTimeDataService } from "Widgets/Scripts/KanbanTime/KanbanTimeDataService";
import { KanbanTimeDataCalculator } from "Widgets/Scripts/KanbanTime/KanbanTimeDataCalculator";
import { KanbanTimeSeriesProvider } from "Widgets/Scripts/KanbanTime/KanbanTimeSeriesProvider";
import { KanbanTimeCommonChartOptionsProvider } from "Widgets/Scripts/KanbanTime/KanbanTimeCommonChartOptionsProvider";
import { KanbanTimeAgileSettingsHelper } from "Widgets/Scripts/KanbanTime/KanbanTimeAgileSettingsHelper";
import { IColorAndIcon } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

import * as ChartingResources from "Charting/Scripts/Resources/TFS.Resources.Charting";

import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

import * as Controls from "VSS/Controls";
import * as ArrayUtils from "VSS/Utils/Array";
import * as DateUtils from "VSS/Utils/Date";

/**
 * A chart that fetches and renders lead/cycle time data for a given backlog category
 * or work item type list for given teams in the current project.
 */
export class KanbanTimeChart extends Controls.Control<KanbanTimeContracts.KanbanTimeChartOptions> {
    private dataService: KanbanTimeContracts.IKanbanTimeDataService; // Service that gets data from Analytics service
    public static MAX_WORKITEM: number = 500;
    private randomEmptyImageIndex: number;

    constructor(options: KanbanTimeContracts.KanbanTimeChartOptions) {
        super(options);
    }

    public initialize() {
        this.initializeDataService();
    }

    public initializeOptions(options?: KanbanTimeContracts.KanbanTimeChartOptions): void {
        if (options && options.backlogCategory == null && options.workItemTypes == null) {
            throw new Error("KanbanTimeChartOptions must define one or both of backlogCategory and workItemType");
        }

        super.initializeOptions(options);
    }

    /**
     * Draws the chart as soon as its backing data is retrieved.
     * The chart's data is retrieved asynchronously, so this method returns a promise that resolves
     * once the chart's data is loaded, processed, and ultimately rendered on the chart.
     * @returns a promise that resolves when the chart finishes drawing.
     */
    public drawWhenDataIsReady(): IPromise<KanbanTimeContracts.ChartData> {
        this.getElement().empty();

        // Get the workItem color first
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        return KanbanTimeAgileSettingsHelper.getWITColorAndIconDictionary(tfsContext.contextData.project)
            .then((colorAndIconDictionary: IDictionaryStringTo<IColorAndIcon>) => {
                let startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(this._options.startDate);
                // TODO #881036: Use getTodayInAccountTimeZone instead of new Date()
                let rollingPeriod = DateUtils.daysBetweenDates(new Date(), startDate);
                let movingWindowDays = KanbanTimeDataCalculator.getMovingWindow(rollingPeriod);
                let stdDevQueryOptions = this.stdDevQueryOptions(startDate, movingWindowDays);

                // Get standard deviation values
                return this.dataService.getStdDevCalculationData(stdDevQueryOptions)
                    .then((data: KanbanTimeContracts.KanbanTimeStdDevCalculationData[]) => {
                        if (data.length === 0) {
                            this.renderEmptyMessage(this.getElement());
                            return Q.resolve(null);
                        }

                        let workItemTypeStats = this.getWorkItemTypeStats(data, startDate, colorAndIconDictionary);
                        let totalWorkItemCount = this.getTotalWorkItemCount(workItemTypeStats);

                        // Value should be determined using the pre-filtered total work item count
                        let showScatterPlot = totalWorkItemCount <= KanbanTimeChart.MAX_WORKITEM;

                        // Apply filters to std dev data
                        if (this._options.backlogCategory != null && this._options.workItemTypes != null) {
                            data = data.filter(d => ArrayUtils.contains(this._options.workItemTypes, d.workItemType));
                            workItemTypeStats = this.getWorkItemTypeStats(data, startDate, colorAndIconDictionary);
                            totalWorkItemCount = this.getTotalWorkItemCount(workItemTypeStats);
                        }
                        
                        let standardDevData = KanbanTimeDataCalculator.getWindowedStdDeviations(data, this._options.startDate, movingWindowDays);
                        let averageData = KanbanTimeDataCalculator.getWindowedMovingAverage(data, this._options.startDate, movingWindowDays);
                        let overallAverage = KanbanTimeDataCalculator.getOverallAverage(data);
                        let standardDevSeries = KanbanTimeSeriesProvider.getStandardDeviationSeries(standardDevData, averageData, this._options.timeType);
                        let averageLineSeries = KanbanTimeSeriesProvider.getAverageLineSeries(averageData, !showScatterPlot /* showTooltip */);

                        let chartDataResponse = <KanbanTimeContracts.ChartData>{
                            averageKanbanTime: overallAverage,
                            workItemTypeStats: workItemTypeStats,
                            totalWorkItemCount: totalWorkItemCount
                        };

                        // If the total work item is greater than the Maximum desired work item.. we are not going to skip on retreiving the completedWorkItem
                        if (!showScatterPlot) {
                            chartDataResponse.yAxisMinMax = KanbanTimeDataCalculator.getChartMinMaxValue(standardDevSeries.data as [number, number], null);
                            let yAxisMinMax = this._options.yAxisMinMax ? this._options.yAxisMinMax : chartDataResponse.yAxisMinMax;
                            this.createChart(standardDevSeries, averageLineSeries, [], this._options.startDate, this._options.animate, this._options.height, this._options.width, this._options.timeType, yAxisMinMax);
                            return Q.resolve(chartDataResponse);
                        } else {
                            let completedWorkItemsQueryOptions = this._options;
                            return this.dataService.getCompletedWorkItems(completedWorkItemsQueryOptions)
                                .then((workItems: KanbanTimeContracts.CompletedWorkItem[]) => {
                                    // Apply filters to scatter plot data
                                    if (this._options.backlogCategory != null && this._options.workItemTypes != null) {
                                        workItems = workItems.filter(wi => ArrayUtils.contains(this._options.workItemTypes, wi.workItemType));
                                    }

                                    chartDataResponse.yAxisMinMax = KanbanTimeDataCalculator.getChartMinMaxValue(standardDevSeries.data as [number, number], workItems.map(wi => wi.kanbanTime));
                                    let chartMinMax = this._options.yAxisMinMax ? this._options.yAxisMinMax : chartDataResponse.yAxisMinMax;
                                    let scatterPlotSeries = KanbanTimeSeriesProvider.getScatterSeries(workItems, standardDevSeries.data as [number, number], colorAndIconDictionary, this._options.height, this._options.startDate);
                                    this.createChart(standardDevSeries, averageLineSeries, scatterPlotSeries, this._options.startDate, this._options.animate, this._options.height, this._options.width, this._options.timeType, chartMinMax);
                                    return Q.resolve(chartDataResponse);
                                });
                        }
                    })
            })
            .then(null, e => Q.reject(e));
    }

    private createChart(standardDevSeries: Charts_Contracts.DataSeries,
        averageLineSeries: Charts_Contracts.DataSeries,
        scatterPlotData: Charts_Contracts.DataSeries[],
        startDate: string,
        animated: boolean,
        height: number,
        width: number,
        chartType: KanbanTimeContracts.KanbanTimeType,
        yAxisMinMax: KanbanTimeContracts.AxisMinMaxValue): void {

        let chartOptions = KanbanTimeCommonChartOptionsProvider.convertToChartOptions(
            startDate,
            standardDevSeries,
            averageLineSeries,
            scatterPlotData,
            animated,
            chartType,
            yAxisMinMax
        );

        chartOptions.hostOptions = {
            height: height,
            width: width,
        };

        // If we have scatter plot data, we want to enable the click handler
        if (scatterPlotData !== null && scatterPlotData.length > 0 && this._options.onClick && typeof this._options.onClick === "function") {
            chartOptions.click = (clickEvent: Charts_Contracts.ClickEvent) => {
                if(clickEvent.seriesCustomData) {
                    let wi = clickEvent.seriesCustomData[clickEvent.seriesDataIndex];
                    this._options.onClick(wi);
                }
            };
        }
        Chart_Controls.create(this.getElement(), chartOptions);
    }

    private stdDevQueryOptions(startDate: Date, movingWindow: number): KanbanTimeContracts.KanbanTimeDataQueryOptions {
        // We need to use a different start date to account for the moving window when querying for data
        let windowedStartDate = DateUtils.addDays(startDate, -(movingWindow - 1), true /* adjustDSTOffset */);
        let queryOptions: KanbanTimeContracts.KanbanTimeDataQueryOptions = {
            startDate: DateUtils.format(windowedStartDate, DateSKParser.dateStringFormat),
            teamIds: this._options.teamIds,
            backlogCategory: this._options.backlogCategory,
            workItemTypes: this._options.workItemTypes,
            timeType: this._options.timeType,
            timeoutMs: this._options.timeoutMs
        };

        return queryOptions;
    }

    /**
     * Get the workItem that are display in the chart
     * this should only get call after the chart is draw.
     */
    private getWorkItemTypeStats(data: KanbanTimeContracts.KanbanTimeStdDevCalculationData[], startDate: Date, colorDictionary: IDictionaryStringTo<IColorAndIcon>): KanbanTimeContracts.WorkItemTypeStats[] {
        let list: KanbanTimeContracts.WorkItemTypeStats[] = [];
        if (data && data.length > 0) {
            let workItemMapping: IDictionaryStringTo<KanbanTimeContracts.WorkItemTypeStats> = {};
            let startDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(this._options.startDate);
            data.forEach(value => {
                let completedDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(value.completedDate);

                // Skip data before start date when calculating this data
                if (DateUtils.defaultComparer(completedDate, startDate) >= 0) {
                    if (workItemMapping[value.workItemType] == null) {
                        workItemMapping[value.workItemType] = <KanbanTimeContracts.WorkItemTypeStats>{
                            workItemType: value.workItemType,
                            color: colorDictionary[value.workItemType].color,
                            icon: colorDictionary[value.workItemType].icon,
                            count: value.count
                        }
                    } else {
                        workItemMapping[value.workItemType].count += value.count;
                    }
                }
            });
            let keys = Object.keys(workItemMapping);
            keys.forEach(key => {
                list.push(workItemMapping[key]);
            });
        }
        return list;
    }

    private getTotalWorkItemCount(list: KanbanTimeContracts.WorkItemTypeStats[]): number {
        if (list && list.length >= 0) {
            let total = 0;
            list.forEach(item => {
                total += item.count;
            });
            return total;
        } else {
            return null;
        }
    }

    /**
     * Retrieves the lead data service.
     */
    private initializeDataService(): void {
        this.dataService = ProjectCollection.getDefaultConnection().getService(KanbanTimeDataService);
    }

    /**
     * Render zero data image
     */
    private renderEmptyMessage($container: JQuery): void {
        if (this.randomEmptyImageIndex == null) {
            this.randomEmptyImageIndex = Math.floor(Math.random() * EmptyChartHelper.NumberOfAvailableZeroResultImage);
        }
        EmptyChartHelper.showEmptyChartMessage(
                $container,
                this.randomEmptyImageIndex,
                this._options.timeType === KanbanTimeContracts.KanbanTimeType.Lead ?
                    ChartingResources.KanbanTime_LeadTime_emptyAltTextDescription : ChartingResources.KanbanTime_CycleTime_emptyAltTextDescription,
                null
        );
    } 
}
