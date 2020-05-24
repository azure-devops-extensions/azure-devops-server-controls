import * as Q from "q";

import * as KanbanTimeContracts from  "Widgets/Scripts/KanbanTime/KanbanTimeContracts";
import * as Charts_Contracts from "Charts/Contracts";
import { KanbanTimeDataCalculator } from "Widgets/Scripts/KanbanTime/KanbanTimeDataCalculator";
import { WorkItemTypeColorAndIconsProvider, IColorAndIcon } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { DateSKParser } from "Analytics/Scripts/DateSKParser";

import * as DateUtils from "VSS/Utils/Date";

export class KanbanTimeSeriesProvider {
    /**
     * We consider the size of the chart marker to be a cell.
     * The value is a guess of how large the marker is by default in the charting SDK.
     */
    public static get markerSizePx() { return 25; }

    public static StandardDeviationName = "Range";
    public static StandardDeviationColorLeadTime = "#eaeaea";
    public static StandardDeviationColorCycleTime = "#deecf9";

    public static AverageLineName = "Average";
    public static AverageLineColor = "#222";

    public static SeriesMarkerType = "circle";
    public static MixClusterColor = "#5e5c5b"; // The cluster color if the collection have more than one type 
    public static DefaultClusterName = "Cluster";
    public static ClusterRadius = 6;


    /**
     * Create a list of scatter plot series that would be use draw.
     * It would contain a seperate series for the cluster series
     * @param workItems - A list of the workItems for scatter plot
     * @param stdDevSeries - Tupple for the standard deviation data
     * @param colorDictionary - A dictionary look up the color for work item type
     * @param chartHeightPx - the height of the chart in px
     * @param startDateString - The string for the start date
     */
    public static getScatterSeries(workItems: KanbanTimeContracts.CompletedWorkItem[], stdDevData: [number, number], colorAndIconDictionary: IDictionaryStringTo<IColorAndIcon>,
        chartHeightPx: number, startDateString: string): Charts_Contracts.DataSeries[] {

        if (workItems && workItems.length > 0) {
            // 1. Sort all the workItem into date bucket
            // 2. Find the min & max of the values from the workItems and standard deviation.
            // 3. Compute the point px relatived to the min & max range of the data point
            // 4. Iterate through all the point that are on the same date and group them into a new series

            let seriesDictionary: IDictionaryStringTo<Charts_Contracts.DataSeries> = {};
            let dateWorkItemDictionary: IDictionaryStringTo<KanbanTimeContracts.CompletedWorkItem[]> = {};
            let startDate = DateUtils.parseDateString(startDateString, DateSKParser.dateStringFormat, true);

            // step 1
            workItems.forEach(wi => {
                let date = DateUtils.parseDateString(wi.completedDate, DateSKParser.dateStringFormat, true);
                let daysAgo = DateUtils.daysBetweenDates(startDate, date, true);
                let tuple: [number, number] = [daysAgo, KanbanTimeSeriesProvider.normalizeValue(wi.kanbanTime)];
                let index = daysAgo.toString();
                if (dateWorkItemDictionary[index] == null) {
                    dateWorkItemDictionary[index] = [wi];
                } else {
                    dateWorkItemDictionary[index].push(wi);
                }
            });

            // step 2
            let workItemKanbanTime = workItems.map(wi => wi.kanbanTime);
            let chartMinMax = KanbanTimeDataCalculator.getChartMinMaxValue(stdDevData, workItemKanbanTime);

            // step 3
            let kanbanTimeDifference = chartMinMax.maxValue - chartMinMax.minValue;
            let kanbanTimePerCell = kanbanTimeDifference * KanbanTimeSeriesProvider.markerSizePx / chartHeightPx;

            // step 4
            let indexKeys = Object.keys(dateWorkItemDictionary);
            indexKeys.forEach(index => {
                let workItemList = dateWorkItemDictionary[index];
                workItemList.sort((a, b) => a.kanbanTime - b.kanbanTime);
                for (let i = 0; i < workItemList.length;) {
                    let firstData = workItemList[i];
                    let bucket = [firstData];

                    // Look ahead and group any close enough data, if the data is identical we group them too.
                    while (++i < workItemList.length
                        && (workItemList[i].kanbanTime - firstData.kanbanTime <= kanbanTimePerCell
                            || KanbanTimeSeriesProvider.normalizeValue(workItemList[i].kanbanTime) == KanbanTimeSeriesProvider.normalizeValue(firstData.kanbanTime))
                    )
                    {
                        bucket.push(workItemList[i]);
                    }

                    let seriesName = KanbanTimeSeriesProvider.DefaultClusterName;
                    let seriesColor = KanbanTimeSeriesProvider.MixClusterColor;
                    let seriesMarkerRadius = KanbanTimeSeriesProvider.ClusterRadius;

                    if (bucket.length === 1) {
                        let dataPoint = bucket[0];
                        seriesName = dataPoint.workItemType;
                        seriesColor = colorAndIconDictionary[seriesName].color;
                        seriesMarkerRadius = null; // use the default
                    } else {
                        // See if the bucket have the same workItemType
                        let uniformWIT = bucket.every(x => x.workItemType === bucket[0].workItemType);
                        if (uniformWIT) {
                            seriesName += " " + bucket[0].workItemType;
                            seriesColor = colorAndIconDictionary[bucket[0].workItemType].color;
                        }
                    }

                    let sum = bucket.map(wi => wi.kanbanTime).reduce((a, b) => a + b);
                    let avg = KanbanTimeSeriesProvider.normalizeValue(sum / bucket.length);
                    let customDataList = bucket.map(point => <KanbanTimeContracts.ScatterPlotCustomDataWorkItem>{
                        title: point.title,
                        id: point.id,
                        workItemType: point.workItemType,
                        workItemTypeColor: colorAndIconDictionary[point.workItemType].color,
                        workItemTypeIcon: colorAndIconDictionary[point.workItemType].icon
                    });
                    let dataPoint = [+index, avg];
                    if (seriesDictionary[seriesName] == null) {
                        let series = {
                            name: seriesName,
                            data: [dataPoint],
                            color: seriesColor,
                            customData: [customDataList],
                            markerType: KanbanTimeSeriesProvider.SeriesMarkerType,
                            markerRadius: seriesMarkerRadius
                        } as Charts_Contracts.DataSeries;

                        seriesDictionary[seriesName] = series;
                    } else {
                        seriesDictionary[seriesName].data.push(dataPoint);
                        seriesDictionary[seriesName].customData.push(customDataList);
                    }
                }
            });

            let values: Charts_Contracts.DataSeries[] = [];
            let keys = Object.keys(seriesDictionary);
            keys.forEach(key => {
                values.push(seriesDictionary[key]);
            });

            return values;
        } else {
            return null;
        }
    }

    public static getAverageLineSeries(averages: number[], enableTooltip: boolean): Charts_Contracts.DataSeries {
        return {
            name: KanbanTimeSeriesProvider.AverageLineName,
            color: KanbanTimeSeriesProvider.AverageLineColor,
            data: averages.map(avg => {
                return avg != null ? KanbanTimeSeriesProvider.normalizeValue(avg) : null;
            }),
            enableTooltip: enableTooltip
        }
    }

    public static getStandardDeviationSeries(standardDeviations: number[], averages: number[], timeType: KanbanTimeContracts.KanbanTimeType): Charts_Contracts.DataSeries {
        let range = standardDeviations.map<[number, number]>((value, index) => {
            if (value == null || averages[index] == null) {
                return null;
            } else {
                return [KanbanTimeSeriesProvider.normalizeValue(averages[index] - value), KanbanTimeSeriesProvider.normalizeValue(averages[index] + value)];
            }
        });

        let color = (timeType === KanbanTimeContracts.KanbanTimeType.Lead)
            ? KanbanTimeSeriesProvider.StandardDeviationColorLeadTime
            : KanbanTimeSeriesProvider.StandardDeviationColorCycleTime;

        return {
            name: KanbanTimeSeriesProvider.StandardDeviationName,
            color: color,
            data: range,
            enableTooltip: false
        }
    }

    private static normalizeValue(value: number): number{
        return +value.toFixed(1);
    }
}