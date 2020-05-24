/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/MetricsLabel";

import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";


export interface IMetricsLabelProps extends ComponentBase.Props {
    text?: string;
    id?: string;
}

/**
 * Handles common presentation of a label for a report-visual/Metrics label.
 */
export class MetricsLabel extends ComponentBase.Component<IMetricsLabelProps, any> {
    public render(): JSX.Element {
        return <div className="metrics-label" id={this.props.id ? this.props.id : undefined} > {this.props.text}</div>;
    }
}
