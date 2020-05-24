/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import * as Charts_Contracts from "Charts/Contracts";

import { ChartFactoryComponent, IChartFactoryComponentProps } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/ChartFactoryComponent";
import { ReleaseReportingKeys } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Constants";
import * as ReleaseChartContracts from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Charts/ChartContracts";
import { IEnvironmentDeployments, IDeploymentRenderingData } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingDialog";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

export interface IDeploymentTimeTrendChartProps extends ComponentBase.Props {
    environmentDeployments: IEnvironmentDeployments;
    chartHeight: number;
    chartWidth: number;
    suppressAnimation?: boolean;
}

export interface IStateless extends ComponentBase.State {
}

export class DeploymentTimeTrendChart extends ComponentBase.Component<IDeploymentTimeTrendChartProps, IStateless>  {
    constructor(props: IDeploymentTimeTrendChartProps) {
        super(props);
    }

    public render(): JSX.Element {
        let chartFactoryProps: IChartFactoryComponentProps = {
            chartDisplayOptions: this._getChartDisplayOptions(),
            chartData: this._getChartData()
        };
        return (
              <ChartFactoryComponent {...chartFactoryProps} />
        );
    }

    private _getChartDisplayOptions(): ReleaseChartContracts.IChartDisplayOptions {
        return {
            chartType: ReleaseChartContracts.ChartTypes.StackedColumn,
            ChartOptions: {
                hostOptions: {
                    height: this.props.chartHeight,
                    width: this.props.chartWidth
                },
                legend: {
                    enabled: false
                },
                suppressAnimation: this.props.suppressAnimation ? true : false
            },
            xAxisOptions: {
                labelValues: this._getDeploymentStartedOn(),
                labelFormatMode: "dateTime_DayInMonth",
                labelsEnabled: false,
                suppressLabelTruncation: true
            },
            yAxisOptions: {
                allowDecimals: false
            }
        };
    }

    private _getChartData(): ReleaseChartContracts.IChartDataSeries[] {
        let totlaDeploymentTime: Charts_Contracts.Datum[] = [];

        for (let deployment of this.props.environmentDeployments.deployments) {
            totlaDeploymentTime.push({ name: deployment.id.toString(), y: deployment.totalTimeInSeconds, color: this._getColorForDeploymentStatus(deployment.status) });
        }

        let dataSeries: ReleaseChartContracts.IChartDataSeries = {
            dataseries:
            {
                name: Resources.DeploymentDurationText,
                data: totlaDeploymentTime,
            }
        };

        return [dataSeries];
    }

    private _getColorForDeploymentStatus(status: ReleaseContracts.DeploymentStatus): string {
        // Read from ReleaseSummary.css
        switch (status) {
            case ReleaseContracts.DeploymentStatus.Failed:
                return ReleaseChartContracts.AxisColor.RedColor;
            case ReleaseContracts.DeploymentStatus.Succeeded:
                return ReleaseChartContracts.AxisColor.GreenColor;
            case ReleaseContracts.DeploymentStatus.PartiallySucceeded:
                return ReleaseChartContracts.AxisColor.OrangeColor;
            default:
                return ReleaseChartContracts.AxisColor.GrayColor;
        }
    }

    private _getDeploymentStartedOn(): Date[] {
        let deploymentStartedOn: Date[] = [];
        if (!!this.props.environmentDeployments.deployments) {
            for (let deployment of this.props.environmentDeployments.deployments) {
                deploymentStartedOn.push(deployment.startedOn);
            }
        }
        return deploymentStartedOn;
    }

}