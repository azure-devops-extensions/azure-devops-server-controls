import * as React from "react";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import * as Props from "ProjectOverview/Scripts/Components/Charts/ChartProps";
import * as AreaChart_Async from "ProjectOverview/Scripts/Components/Charts/AreaChart";
import * as BarChart_Async from "ProjectOverview/Scripts/Components/Charts/BarChart";
import * as PieChart_Async from "ProjectOverview/Scripts/Components/Charts/PieChart";


export const ChartContainer = (props: Props.ChartContainerProps): JSX.Element => {
    switch (props.chartType) {
        case Props.ChartType.PieChart:
            return <AsyncPieChart {...props.chartProps as Props.PieChartProps} />
        case Props.ChartType.AreaChart:
            return <AsyncAreaChart {...props.chartProps as Props.AreaChartProps} />
        case Props.ChartType.BarChart:
            return <AsyncBarChart {...props.chartProps as Props.BarChartProps} />;
    }
    return null;
}

const AsyncAreaChart = getAsyncLoadedComponent(
    ["ProjectOverview/Scripts/Components/Charts/AreaChart"],
    (module: typeof AreaChart_Async) => module.AreaChart);

const AsyncPieChart = getAsyncLoadedComponent(
    ["ProjectOverview/Scripts/Components/Charts/PieChart"],
    (module: typeof PieChart_Async) => module.PieChart);

const AsyncBarChart = getAsyncLoadedComponent(
    ["ProjectOverview/Scripts/Components/Charts/BarChart"],
    (module: typeof BarChart_Async) => module.BarChart);