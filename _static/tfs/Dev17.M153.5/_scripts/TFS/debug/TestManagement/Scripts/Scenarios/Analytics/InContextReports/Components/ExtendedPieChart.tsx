/// <reference types="react" />

import * as React from "react";

import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { css } from "OfficeFabric/Utilities";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Number from "VSS/Utils/Number";
import { DonutChartLegendComponent, IDonutChartLegend, IDonutChartLegendProps } from "TestManagement/Scripts/Scenarios/Common/Components/DonutChartLegend";
import * as ComponentBase from "VSS/Flux/Component";
import { ChartComponent } from "WidgetComponents/ChartComponent";
import { CommonChartOptions, ChartTypesConstants, Datum, PieChartOptions } from "Charts/Contracts";
import { MetricsLabel } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/MetricsLabel";
import { AnalyticsUnavailableMessage, IAnalyticsUnavailableMessageProps } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AnalyticsUnavailableMessage";

import LWP = require("VSS/LWP");

import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/ExtendedPieChart";

export interface IExtendedPieChartDatum extends Datum {

    /** Custom text for Legend, to accomodate existing use scenario. Defaults to Datum.Name. */
    legendLabel?: string;
}

export interface IExtendedPieChartProps extends ComponentBase.Props {
    title?: string;
    footerText?: string;
    errorText?: string;
    chartDiameter?: number;

    scalarLabel?: string;
    scalarContent?: string | number;
    chartData?: IExtendedPieChartDatum[];
}

/**
 * Responsible for presentation of a common visual pattern:
 * -Title
 * -Scalar quantity on left side
 * -Pie chart in middle
 * -Legend on right side
 */
export class ExtendedPieChart extends ComponentBase.Component<IExtendedPieChartProps, ComponentBase.State> {
    public static className = "extended-pie-chart";
    public static spinnerClassName =  "extended-pie-chart-loadingspinner";

    public static bodyClassName = "extended-pie-chart-body";
    public static scalarClassName = "extended-pie-scalar";
    public static scalarLabelClassName = "extended-pie-scalar-label";
    public static scalarValueClassName = "extended-pie-scalar-value";
    public static legendClassName = "extended-pie-chart-legend";
    public static chartComponentClassName = "extended-pie-chart-component";
    public static footerClassName = "extended-pie-chart-footer";

    public static defaultProps: Partial<IExtendedPieChartProps> = {
        chartDiameter: 120
    };

    public render(): JSX.Element {
        const bodyContent = (!this.props.scalarContent || !this.props.chartData) ?
            <Spinner size={SpinnerSize.large} className={ExtendedPieChart.spinnerClassName} /> : (
                <div>
                    <div className={ExtendedPieChart.bodyClassName}>
                        <div className={ExtendedPieChart.scalarClassName}>
                            <div className={ExtendedPieChart.scalarLabelClassName}>
                                {this.props.scalarLabel}
                            </div>
                            <div className={ExtendedPieChart.scalarValueClassName}>
                                {this.props.scalarContent}
                            </div>
                        </div>
                        <div className={ExtendedPieChart.chartComponentClassName}>
                            <ChartComponent chartOptions={this._getDonutChartOptions()} />
                        </div>
                        <DonutChartLegendComponent cssClass={ExtendedPieChart.legendClassName} legend={this._getDataAsLegendProps()} />
                    </div>
                    <div className={ExtendedPieChart.footerClassName}>
                        {this.props.footerText}
                    </div>
                </div>
            );
        return (
            <div className={css(ExtendedPieChart.className, this.props.cssClass || Utils_String.empty)}>
                <MetricsLabel text={this.props.title} />
                {
                    !!this.props.errorText ?
                        <AnalyticsUnavailableMessage suggestion={this.props.errorText} /> :
                        bodyContent
                }
            </div>
        );
    }

    /**
     * Converts  component props to ChartOptions     
     */
    public static formatChartOptions(chartProps : IExtendedPieChartProps): CommonChartOptions{
        return {
            hostOptions: chartProps.chartDiameter ? {
                width: chartProps.chartDiameter,
                height: chartProps.chartDiameter
            } : null,
            legend: { enabled: false },
            chartType: ChartTypesConstants.Pie,
            suppressMargin: true,
            suppressAnimation: true,
            specializedOptions: {
                size: "120%",
                innerSize: "60%",
                showLabels: false
            } as PieChartOptions,
            series: [{ data: chartProps.chartData.filter(o => o.y !== 0) }],
            xAxis: { labelValues: ExtendedPieChart._getXLables(chartProps) }
        };
    }

    private _getDonutChartOptions(): CommonChartOptions {
        return ExtendedPieChart.formatChartOptions(this.props);
    }

    private _getDataAsLegendProps(): IDonutChartLegend[] {
        return this.props.chartData.filter(o => o.y !== 0).map((o, i) => {
            return {
                color: o.color,
                count: Utils_Number.formatAbbreviatedNumber(o.y),
                label: o.legendLabel ? o.legendLabel : o.name
            } as IDonutChartLegend;
        });
    }

    private static _getXLables(chartProps: IExtendedPieChartProps) {
        return chartProps.chartData.map(chartData => chartData.legendLabel || chartData.name || "");
    }
}

LWP.registerLWPComponent("extendedPieChart", ExtendedPieChart);