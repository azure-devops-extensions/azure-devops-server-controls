/// <reference types="react" />

import * as React from "react";
import "VSS/LoaderPlugins/Css!ProjectOverview/Scripts/Components/MetricSection";
import ProjectOverviewResources = require("ProjectOverview/Scripts/Resources/TFS.Resources.ProjectOverview");
import { ChartContainer } from "ProjectOverview/Scripts/Components/Charts/ChartContainer";
import * as ChartProps from "ProjectOverview/Scripts/Components/Charts/ChartProps";

// Hack: hardcoding activity pane width. automatic calculation not working properly with initial render
const activityPaneWidth = 320;

export interface RightPanelUpsellProps {
    text: string,
    link: string;
    onClick?: () => void;
    showUpsell: boolean;
}

export interface MetricSectionProps {
    header: string;
    metricsSubSections: MetricSubSectionProps[];
    isMetricsEmpty: boolean;
    emptyMetricsMsg: string;
    headingLevel: number;
    upsellProps?: RightPanelUpsellProps;
    showMetricInfo?: boolean;
    metricsInfoMsg?: string;
}

export const MetricSection = (props: MetricSectionProps): JSX.Element => {
    const renderUpsell = (): JSX.Element => {
        return (props.upsellProps.showUpsell ?
            <div className="upsell">
                <a href={props.upsellProps.link} onClick={props.upsellProps.onClick}>{props.upsellProps.text}</a>
            </div>
            : null
        );
    }

    const renderContent = (): JSX.Element => {
        let iconClassName = "icon-span bowtie-icon bowtie-status-info";

        return (
            <div className="metrics-content">
                <div
                    className={props.upsellProps.showUpsell ? "header with-upsell" : "header"}
                    role="heading"
                    aria-level={props.headingLevel}>
                    {props.header}
                    {props.showMetricInfo &&
                        <span className={iconClassName}
                            title={props.metricsInfoMsg} />
                    }
                </div>
                {props.isMetricsEmpty ?
                    <div className="empty-metrics">{props.emptyMetricsMsg}</div>
                    : props.metricsSubSections.map((metricsSubSection, index) =>
                        <MetricSubSection
                            {...metricsSubSection}
                            key={index} />)
                }
            </div>);
    }

    return (
        <div className="metrics-section">
            {renderContent()}
            {renderUpsell()}
        </div>
    );
}

export interface MetricSubSectionProps {
    individualMetrics: IndividualMetricData[];
    name: string;
    chartType: ChartProps.ChartType;
    chartData?: ChartProps.AreaChartProps;    //Contains additional graph data if required
}

const MetricSubSection = (props: MetricSubSectionProps): JSX.Element => {
    if (props.chartType === ChartProps.ChartType.BarChart) {
        return MetricBarChartSubSection(props);
    }

    return (
        <div className="metrics-subsection">
            <div className={"metric-chart"}>
                <ChartContainer
                    chartProps={getChartPropsFromMetricProps(props)}
                    chartType={props.chartType} />
            </div>
            <div className="metric-data">
                {props.individualMetrics.map((metric, index) =>
                    <IndividualMetricComponent
                        metrics={metric}
                        chartType={props.chartType}
                        key={index} />)
                }
            </div>
            <div className="metric-title">
                {props.name.split("\\n").map(i => {
                    return <div className="name" key={i}>{i}</div>;
                })}
            </div>
        </div>
    );
}

export interface IndividualMetricData {
    value: number;
    icon: string;
    capValue?: number;
    capText?: string;
    iconColorCss?: string;
    metricTitle?: string;
}

const IndividualMetricComponent = (props: { metrics: IndividualMetricData, chartType: ChartProps.ChartType }): JSX.Element => {
    let iconclassName = "icon-span bowtie-icon " + props.metrics.icon;
    if (props.metrics.iconColorCss) {
        iconclassName += " icon-" + props.metrics.iconColorCss;
    }

    let renderMetricData = true;

    //To avoid displaying value in case of no data
    if (props.metrics.value < 0) {
        renderMetricData = false;
    }

    const renderValue = (): JSX.Element => {
        let valueSuffix = props.chartType === ChartProps.ChartType.PieChart ? "%" : "";
        let displayValue = props.metrics.value.toString() + valueSuffix;
        if (props.metrics.capValue && props.metrics.value > props.metrics.capValue) {
            displayValue = (props.metrics.capText ? props.metrics.capText : props.metrics.capValue) + "+";
        }

        return (
            <div className="value">{displayValue}</div>);
    }

    return (
        <div className="individual-metric">
            <span className={iconclassName} />
            {renderMetricData &&
                renderValue()}
        </div>
    );
}

const MetricBarChartSubSection = (props: MetricSubSectionProps): JSX.Element => {

    return (
        <div className="metrics-subsection">
            <div className="metric-chart">
                <ChartContainer
                    chartProps={getChartPropsFromMetricProps(props) }
                    chartType={props.chartType} />
            </div>
            <div className="individual-bar-metric">
                <div className="left-metric">
                    <IndividualBarMetricComponent
                        metrics={props.individualMetrics[0]}
                        title={props.name} />
                </div>
                <div className="right-metric">
                    <IndividualBarMetricComponent
                        metrics={props.individualMetrics[1]}
                        title={props.name} />
                </div>
            </div>
        </div>
    );
}

const IndividualBarMetricComponent = (props: { metrics: IndividualMetricData, title: string }): JSX.Element => {
    let iconclassName = "icon-span bowtie-icon " + props.metrics.icon;
    if (props.metrics.iconColorCss) {
        iconclassName += " icon-" + props.metrics.iconColorCss;
    }

    let swatchClassName = "swatch background-" + props.metrics.iconColorCss;

    let displayValue = props.metrics.value.toString();
    if (props.metrics.capValue && props.metrics.value > props.metrics.capValue) {
        displayValue = (props.metrics.capText ? props.metrics.capText : props.metrics.capValue) + "+";
    }

    return (
        <div>
            <span className={iconclassName} />
            <div className="value">{displayValue}</div>
            <div className="metric-title">{props.title}</div>
            <div>
                <div className={swatchClassName} />
                <div className="metric-title">{props.metrics.metricTitle}</div>
            </div>
        </div>
    );
}

const getBarChartData = (props: MetricSubSectionProps): ChartProps.BarChartProps => {
    let barValues: number[] = [];
    let barCss: string[] = [];

    props.individualMetrics.map((metric, index) => {
        barValues.push(metric.value);
        barCss.push(getBarColorCss(metric.value, metric.iconColorCss));
    });

    return { values: barValues, cssBgColor: barCss };
}


//if value is 0 overwrite bar color with grey else keep it same as Icon color
const getBarColorCss = (value: number, iconColorCss: string): string => {
    if (value === 0) {
        return "grey";
    }
    else {
        return iconColorCss;
    }
}

export function getChartPropsFromMetricProps(props: MetricSubSectionProps): ChartProps.ChartProps {
    switch (props.chartType) {
        case ChartProps.ChartType.AreaChart:
            return props.chartData;
        case ChartProps.ChartType.PieChart:
            return { passPercentage: props.individualMetrics[0].value };
        case ChartProps.ChartType.BarChart:
            return getBarChartData(props);
    }
}
