/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "VSS/Flux/Component";
import { ChartComponent } from "WidgetComponents/ChartComponent";
import { CommonChartOptions, ChartTypesConstants, DataSeries, LabelFormatModes, ChartHostOptions } from "Charts/Contracts";

import LWP = require("VSS/LWP");

export interface IExtendedLineChartProps extends ComponentBase.Props {
    xAxisLabels?: string[];
    yAxisTitle?: string;
    yAxisMinimum?: number;
    yAxisMaximum?: number;
    chartDataSeries?: DataSeries[];
    chartHeight?: number;
    chartWidth?: number;
}

export class ExtendedLineChart extends ComponentBase.Component<IExtendedLineChartProps, ComponentBase.State> {

    public render(): JSX.Element {
        
        return (
            <ChartComponent chartOptions={this._getLineChartOptions()} />
        );
    }

    private _getLineChartOptions(): CommonChartOptions {
        
        let hostOptions: ChartHostOptions;
        if (this.props.chartHeight && this.props.chartWidth) {
            hostOptions = {
                height: this.props.chartHeight,
                width: this.props.chartWidth
            };
        }

        return {
            hostOptions: hostOptions,
            legend: { enabled: false },
            chartType: ChartTypesConstants.Line,
            xAxis: {
                labelFormatMode: LabelFormatModes.Textual,
                labelsEnabled: true,
                labelValues: this.props.xAxisLabels
            },
            yAxis: {
                allowDecimals: true,
                labelFormatMode: LabelFormatModes.Linear,
                labelsEnabled: true,
                markingsEnabled: false,
                title: this.props.yAxisTitle,
                min: this.props.yAxisMinimum,
                max: this.props.yAxisMaximum
            },
            yAxisSecondary: null,
            series: this.props.chartDataSeries,
            specializedOptions: {
                includeMarkers: false
            },
            tooltip: {
                onlyShowFocusedSeries: true
            },
            suppressMargin: false,
            suppressAnimation: true
        };
    }
}

LWP.registerLWPComponent("extendedLineChart", ExtendedLineChart);