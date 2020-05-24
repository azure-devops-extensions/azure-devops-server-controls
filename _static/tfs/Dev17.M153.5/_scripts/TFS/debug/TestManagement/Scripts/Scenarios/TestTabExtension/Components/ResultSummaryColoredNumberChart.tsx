/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/TestTabExtension/Components/ResultSummaryColoredNumberChart";

import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";

/**
   * Props for colored number charts shown in summary view
   */
export interface ISummaryColoredNumberChartProps extends ComponentBase.Props {
    /** The title to show below chart value */
    title: string;
    /** The chart value to be shown in bold */
    value: number;
    /** The color of chart number */
    color: string;
}

export class ResultSummaryColoredNumberChartComponent extends ComponentBase.Component<ISummaryColoredNumberChartProps> {

    public render(): JSX.Element {
        return <div className="testresults-colored-number-chart">
            <div className="chart-value" style={{ color: this.props.color }}>
                {this.props.value}
            </div>
            <div className="chart-title-legend">
                {this._getLegendCircleElement(this.props.color)}
                <span className="legend-title">{this.props.title}</span>
            </div>
        </div>;
    }

    private _getLegendCircleElement(color: string): JSX.Element {
        const barWidth: string = "14px";
        const barHeight: string = "14px";
        const legendCircle: JSX.Element =
            <span className="legend-circle">
                <svg width={barWidth} height={barHeight}>
                    <circle className="color-circle" cx="7" cy="7" r="7" fill={color} />
                </svg>
            </span>;

        return legendCircle;
    }
}
