/// <reference types="react" />

import * as React from "react";

import { css } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import * as ComponentBase from "VSS/Flux/Component";

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/Components/DonutChartLegend";

export interface IDonutChartLegend {
    count: number | string;
    label: string;
    color: string;
    sublabel?: string;
}

export interface IDonutChartLegendProps extends ComponentBase.Props {
    legend: IDonutChartLegend[];
}

export class DonutChartLegendComponent extends ComponentBase.Component<IDonutChartLegendProps, ComponentBase.State> {

    public render(): JSX.Element {
        let dataCount: JSX.Element[] = [];
        let dataColor: JSX.Element[] = [];
        let dataLabel: JSX.Element[] = [];

        this.props.legend.forEach((l) => {
            dataCount.push(<div key={l.label} className="legend-cell data-count">{l.count}</div>);
            dataColor.push(<div key={l.label} title={l.label} className="legend-cell data-color" >{this._getLegendCircleElement(l.color)}</div >);
            dataLabel.push(<div key={l.label} className="legend-cell data-value">{l.label}</div>);

            if (!!l.sublabel) {
                dataCount.push(<div key={l.sublabel} className="legend-sub-cell data-count"></div>);
                dataColor.push(<div key={l.sublabel} title={l.sublabel} className="legend-sub-cell data-color" ></div >);
                dataLabel.push(<div key={l.sublabel} className="legend-sub-cell data-value">{l.sublabel}</div>);
            }
        });
        return (
            <div className={css("donut-legend-container", this.props.cssClass || Utils_String.empty)}>
                <div>{dataCount}</div>
                <div>{dataColor}</div>
                <div className="legend-labels">{dataLabel}</div>
            </div>
        );
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
