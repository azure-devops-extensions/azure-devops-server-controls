/// <reference types="react" />
/// <reference types="react-dom" />

import { ChartBaseComponent, IChartBaseComponentProps } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/ChartBaseComponent";
import { StackedBarChartHelper } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/StackedBarChartHelper";
import { StackedColumnChartHelper } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/StackedColumnChartHelper";
import { BaseChartHelper } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/BaseChartHelper";
import * as ReleaseChartContracts from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/ChartContracts";
import * as Charts_Contracts from "Charts/Contracts";
import * as React from "react";
import * as ComponentBase from "VSS/Flux/Component";

export interface IChartFactoryComponentProps extends ComponentBase.Props {
    chartDisplayOptions: ReleaseChartContracts.IChartDisplayOptions;
    chartData: ReleaseChartContracts.IChartDataSeries[];
}


export class ChartFactoryComponent extends ComponentBase.Component<IChartFactoryComponentProps, any>  {
    constructor(props: IChartFactoryComponentProps) {
        super(props);
    }

    public render(): JSX.Element {
        let chartBaseComponentProps: IChartBaseComponentProps = {
            options: this._getChartOptions()
        };
        return <ChartBaseComponent {...chartBaseComponentProps} />;
    }

    private _getChartOptions(): Charts_Contracts.CommonChartOptions {
        let chartHelper = null;

        switch (this.props.chartDisplayOptions.chartType) {
            case ReleaseChartContracts.ChartTypes.StackedColumn:
                chartHelper = new StackedColumnChartHelper();
                break;
            case ReleaseChartContracts.ChartTypes.StackedBar:
                chartHelper = new StackedBarChartHelper();
                break;
            default:
                chartHelper = new BaseChartHelper();
                break;
        }

        return chartHelper.getChartOptions(this.props.chartDisplayOptions, this.props.chartData);
    }
}