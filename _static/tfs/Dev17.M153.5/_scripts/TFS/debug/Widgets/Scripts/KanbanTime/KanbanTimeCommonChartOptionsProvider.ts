import * as Q from "q";

import * as KanbanTimeContracts from  "Widgets/Scripts/KanbanTime/KanbanTimeContracts";
import * as Charts_Contracts from "Charts/Contracts";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";

import { DateSKParser } from "Analytics/Scripts/DateSKParser";

import * as DateUtils from "VSS/Utils/Date";
import * as Utils_Number from "VSS/Utils/Number";
import * as StringUtils from "VSS/Utils/String";
import * as Resources from "Charting/Scripts/Resources/TFS.Resources.Charting";

export class KanbanTimeCommonChartOptionsProvider {
    public static TooltipItemLimit = 3; // Maximum number of work item display in tooltip

    public static convertToChartOptions(startDate: string, standardDevSeries: Charts_Contracts.DataSeries, averageLineSeries: Charts_Contracts.DataSeries,
        scatterPlotSeries: Charts_Contracts.DataSeries[], animated: boolean = true, chartType: KanbanTimeContracts.KanbanTimeType, yAxisMinMax?: KanbanTimeContracts.AxisMinMaxValue): Charts_Contracts.CommonChartOptions {

        let commonChartOptions = {
            chartType: Charts_Contracts.ChartTypesConstants.Hybrid,
            series: [],
            xAxis: {
                labelFormatMode: Charts_Contracts.LabelFormatModes.DateTime_DayInMonth,
                labelValues: this.createDateArray(startDate, standardDevSeries.data.length),
                renderToEdges: true
            },
            yAxis: {
                startOnTick: false
            },
            legend: {
                enabled: false
            },
            suppressAnimation: !animated
        } as Charts_Contracts.CommonChartOptions;

        // 1. Add standard deviation
        let chartTypes = [Charts_Contracts.ChartTypesConstants.AreaRange];
        commonChartOptions.series.push(standardDevSeries);

        // 2. Add completed workitems if it is provided
        if (scatterPlotSeries && scatterPlotSeries.length > 0) {
            scatterPlotSeries.forEach(series => {
                chartTypes.push(Charts_Contracts.ChartTypesConstants.Scatter);
                commonChartOptions.series.push(series);
            });
            commonChartOptions.tooltip = {
                customTooltipMapping: KanbanTimeCommonChartOptionsProvider.getTooltipMapping(chartType)
            }
        }

        // 3. Add average line
        chartTypes.push(Charts_Contracts.ChartTypesConstants.Line);
        commonChartOptions.series.push(averageLineSeries);

        commonChartOptions.specializedOptions = {
            chartTypes: chartTypes
        };

        // Set the chart scale
        if (yAxisMinMax) {
            commonChartOptions.yAxis.min = Math.floor(yAxisMinMax.minValue); // Round down to nearest int
            commonChartOptions.yAxis.max = Math.ceil(yAxisMinMax.maxValue); // Round up to nearest int

            // This prevents the case where highcharts shows a single y value in the middle of the chart which looks odd
            if (commonChartOptions.yAxis.min === commonChartOptions.yAxis.max) {
                commonChartOptions.yAxis.max += 1;
            }
        }

        return commonChartOptions;
    }

    private static createDateArray(startingDate: string, count: number): Date[] {
        var dates: Date[] = [];
        var date = DateSKParser.parseDateStringAsLocalTimeZoneDate(startingDate);
        for (var i = 0; i < count; i++) {
            dates.push(date);
            date = DateUtils.addDays(date, 1, true);
        }
        return dates;
    }

    private static getTooltipMapping(chartType: KanbanTimeContracts.KanbanTimeType): (points: Charts_Contracts.DataPoint[]) => Charts_Contracts.TooltipLineItem[] {
        return (points: Charts_Contracts.DataPoint[]) => {
            let itemList: Charts_Contracts.TooltipLineItem[] = [];

            let point = points[0];
            let days = Number(point.values[0]);
            let formatString;
            if (chartType == KanbanTimeContracts.KanbanTimeType.Lead) {
                formatString = days === 1 ? Resources.LeadTimeSingleDay : Resources.LeadTimePluralDaysFormat;
            } else {
                formatString = days === 1 ? Resources.CycleTimeSingleDay : Resources.CycleTimePluralDaysFormat;
            }

            // create subHeader first
            itemList.push({
                text: StringUtils.format(formatString, Utils_Number.toDecimalLocaleString(days))
            });

            // Populate the work item information, if there is custom data present
            if (point.seriesCustomData) {
                let customDataList: KanbanTimeContracts.ScatterPlotCustomDataWorkItem[] = point.seriesCustomData[point.seriesDataIndex];
                for (let i = 0; i < customDataList.length && i <= KanbanTimeCommonChartOptionsProvider.TooltipItemLimit; ++i) {
                    if (i < KanbanTimeCommonChartOptionsProvider.TooltipItemLimit) {
                        let truncatedText = customDataList[i].title.length > 30
                            ? customDataList[i].title.substring(0, 27) + "..."
                            : customDataList[i].title;

                        itemList.push({
                            styleType: {
                                color: customDataList[i].workItemTypeColor,
                                customTooltipData: { "icon": customDataList[i].workItemTypeIcon },
                                renderCustomStyle: (tooltipStyleType: Charts_Contracts.TooltipStyleType) => {
                                    let container: JQuery = $("<div/>");
                                    WorkItemTypeIconControl.renderWorkItemTypeIcon(container[0], "", { color: tooltipStyleType.color, icon: tooltipStyleType.customTooltipData["icon"] });
                                    let output = container[0].innerHTML;
                                    WorkItemTypeIconControl.unmountWorkItemTypeIcon(container[0]);
                                    container.remove();
                                    return output;
                                }
                            },
                            text: truncatedText
                        });
                    } else if (i === KanbanTimeCommonChartOptionsProvider.TooltipItemLimit) {
                        itemList.push({
                            text: StringUtils.format(Resources.MoreItemFormat, customDataList.length - KanbanTimeCommonChartOptionsProvider.TooltipItemLimit)
                        });
                    }
                }
            }

            return itemList;
        }
    }
}