import * as React from "react";

import { CommonChartOptions, AreaChartOptions, ChartTypesConstants } from "Charts/Contracts";
import { create } from "Charts/Controls";

import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/Charts/AreaChart";

// Following colors represent themePrimary and themeLighter of Office fabric. Office fabric colors are available via css selector
// only. Thus hardcoding the colors here.
const lineColor = "#0078d4";
const fillColor = "#deecf9";

export class AreaChartProps {
    data: number[];
    screenReaderTableHeader: string;
}

export class AreaChart extends React.Component<AreaChartProps, {}> {
    private _container: HTMLElement;

    public componentDidMount(): void {
        this._publishChart();
    }

    public componentWillUnmount(): void {
        this._container.innerHTML = "";
    }

    public componentDidUpdate(prevProps: AreaChartProps): void {
        if (this.props.data !== prevProps.data) {
            this._publishChart();
        }
    }

    public render(): JSX.Element {
        return <div className="po-area-chart" ref={(container) => { this._container = container } } />;
    }

    private _publishChart() {
        this._container.innerHTML = "";
        create($(this._container), getAreaChartOptions(
            this.props.data,
            this._container.offsetHeight,
            this._container.offsetWidth,
            this.props.screenReaderTableHeader));
    }
}

function getAreaChartOptions(data: number[], height: number, width: number, screenReaderTableHeader: string): CommonChartOptions {
    let options: CommonChartOptions = {
        hostOptions: {
            height,
            width,
        },
        legend: {
            enabled: false,
        },
        chartType: ChartTypesConstants.Area,
        series: [{
            data,
            color: fillColor,
            name: screenReaderTableHeader,
        }],
        suppressAnimation: true,
        suppressMargin: true,
        xAxis: {
            labelsEnabled: false,
            markingsEnabled: false,
        },
        yAxis: {
            labelsEnabled: false,
            markingsEnabled: false,
        },
        tooltip: {
            enabled: false,
        },
    };

    options.specializedOptions = {
        lineColor,
    } as AreaChartOptions;

    return options;
}