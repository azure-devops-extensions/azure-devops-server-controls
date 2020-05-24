import * as ReleaseChartContracts from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/ChartContracts";
import * as Charts_Contracts from "Charts/Contracts";

export class BaseChartHelper {

    public getChartOptions(chartDisplayOptions: ReleaseChartContracts.IChartDisplayOptions,
        chartData: ReleaseChartContracts.IChartDataSeries[]) {
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
            legend: chartDisplayOptions.ChartOptions.legend
        };
        return commonChartOptions;
    }

    public getDataSeries(chartData: ReleaseChartContracts.IChartDataSeries[]): Charts_Contracts.DataSeries[] {
        let dataSeriesArray: Charts_Contracts.DataSeries[] = [];
        let chartDataLength = chartData.length;
        for (let i = 0; i < chartDataLength; i++) {
            dataSeriesArray.push(chartData[i].dataseries);
        }
        return dataSeriesArray;
    }

    public getChartType(): string {
        return Charts_Contracts.ChartTypesConstants.Line;
    }
}