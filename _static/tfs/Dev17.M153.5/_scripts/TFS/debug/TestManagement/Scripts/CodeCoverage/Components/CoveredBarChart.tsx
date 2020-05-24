import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";

export interface ICoveredBarChartProps extends ComponentBase.Props {
    width: number;
    coveredPercentage: number;
}

export class CoveredBarChart extends ComponentBase.Component<ICoveredBarChartProps, ComponentBase.State> {
    public render(): JSX.Element {
        return (
            <div className="bar-chart-container">
                <div className="covered-bar" style={{width: this.props.coveredPercentage / 100 * this.props.width + "px"}} />
                <div className="not-covered-bar" style={{width: (100 - this.props.coveredPercentage) / 100 * this.props.width + "px"}} />
            </div>
        );
    } 
}