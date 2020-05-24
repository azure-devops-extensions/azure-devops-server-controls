import * as Q from "q";
import * as React from "react";
import ReactDOM = require("react-dom");
import * as WidgetContracts from "TFS/Dashboards/WidgetContracts";
import { ExtendedPieChart, IExtendedPieChartProps } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/ExtendedPieChart";

import { CardMetrics, ICardMetricsProps } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/CardMetrics";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

/**
 *  This class serves as an adapter - it is not a normal part of a Widget.
 *  Implements a Stateful Pie Chart view. This expresses a subset of what is rendered via "CardMetrics", in lieu of a views at the level of individual visuals.
 *  Normally, a first class 
 */
export class TestPieChartComponent extends CardMetrics {
    public render(): JSX.Element {
        return (<ExtendedPieChart {...this._getPieChartProps()} />);
    }

    protected _getPieChartProps(): IExtendedPieChartProps {
        const props: IExtendedPieChartProps = {
            title: this.props.passRateCardTitle || Resources.TestsInThePipelineText,
            chartDiameter: this.props.chartDiameter
        };

        if (this.state.testOutcomeMetricsData) {
            props.chartData = this._getDonutChartData();
            props.scalarContent = this.state.testOutcomeMetricsData.passPercentage;
        }

        return props;
    }
}
