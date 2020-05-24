import {IChartDisplayOptions, IChartDataSeries } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/ChartContracts";
import * as Charts_Contracts from "Charts/Contracts";
import { BaseChartHelper } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/BaseChartHelper";


export class StackedBarChartHelper extends BaseChartHelper {

    public getChartOptions(chartDisplayOptions: IChartDisplayOptions,
        chartData: IChartDataSeries[]) {
        let commonChartOptions: Charts_Contracts.CommonChartOptions = {
            yAxis: chartDisplayOptions.yAxisOptions,
            xAxis: chartDisplayOptions.xAxisOptions,
            yAxisSecondary: chartDisplayOptions.yAxisSecondaryOptions,
            hostOptions: chartDisplayOptions.ChartOptions.hostOptions,
            colorCustomizationOptions: chartDisplayOptions.ChartOptions.colorCustomizationOptions,
            suppressAnimation: chartDisplayOptions.ChartOptions.suppressAnimation,
            suppressMargin: chartDisplayOptions.ChartOptions.suppressMargin,
            series: this.getDataSeries(chartData),
            chartType: this.getChartType(),
            legend: chartDisplayOptions.ChartOptions.legend,
            tooltip: chartDisplayOptions.ChartOptions.tooltip
        };
        return commonChartOptions;
    }

    public getChartType(): string {
        return Charts_Contracts.ChartTypesConstants.StackedBar;
    }
}