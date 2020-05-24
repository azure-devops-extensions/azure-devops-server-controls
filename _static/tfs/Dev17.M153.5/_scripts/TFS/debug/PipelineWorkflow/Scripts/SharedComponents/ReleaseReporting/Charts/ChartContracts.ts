import * as Charts_Contracts from "Charts/Contracts";

export module ChartTypes {
    export let StackedColumn = "stackedColumn";
    export let StackedBar = "stackedBar";
}

export module AxisColor {
    export let RedColor = "#E15C6E";
    export let GreenColor = "#1AB294";
    export let OrangeColor = "#FF6600";
    export let GrayColor = "#DCDCDC";
}

export interface IChartDisplayOptions {
    ChartOptions: Charts_Contracts.ChartOptions;
    chartType: string;
    xAxisOptions?: Charts_Contracts.AxisOptions;
    yAxisOptions?: Charts_Contracts.AxisOptions;
    yAxisSecondaryOptions?: Charts_Contracts.AxisOptions;
    specializedOptions?: Charts_Contracts.PieChartOptions | Charts_Contracts.FunnelChartOptions;
}

export interface IChartDataSeries {
    dataseries: Charts_Contracts.DataSeries;
    hybridChartType?: string;
}