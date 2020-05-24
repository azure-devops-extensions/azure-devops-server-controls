/// <reference types="react" />
/// <reference types="react-dom" />

import * as Charts from "Charts/Controls";
import * as Charts_Contracts from "Charts/Contracts";
import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";

export interface IChartBaseComponentProps extends ComponentBase.Props {
    options: Charts_Contracts.CommonChartOptions;
}

export class ChartBaseComponent extends ComponentBase.Component<IChartBaseComponentProps, ComponentBase.State>  {
    constructor(props: IChartBaseComponentProps) {
        super(props);
    }

    public componentDidMount(): void {
        this._publishChart();
    }

    public componentDidUpdate(nextProps: IChartBaseComponentProps): void {
        if (this.props.options.series !== nextProps.options.series) {
            this._publishChart();
        }
    }

    public render(): JSX.Element {
        return <div className="chart" ref={(container) => { this._container = container; }} />;
    }

    private _publishChart() {
        /* tslint:disable:no-inner-html */
        this._container.innerHTML = "";
        Charts.create($(this._container), this.props.options);
        /* tslint:enable:no-inner-html */
    }

    private _container: HTMLElement;

}