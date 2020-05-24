/// <reference types="react" />
import * as React from "react";

import { getMetricData, PassRateGrowth } from "Build/Scripts/BuildMetrics";
import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";

import { BuildMetric } from "TFS/Build/Contracts";

import { format } from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!Build/BuildMetricPassRate";

export interface Props {
    metrics: BuildMetric[];
    aggregatedMetrics: BuildMetric[];
    className?: string;
}

export class Component extends React.Component<Props, {}> {
    public render(): JSX.Element {
        // we get total percentage from aggregated metrics
        // but to calculate growth we need metrics that are not aggregated so that we can compare metrics with previous days ones
        let growth = getMetricData(this.props.metrics).growth;
        let metricData = getMetricData(this.props.aggregatedMetrics);
        let metricGrowthClass = "bowtie-arrow-right";
        let className = "build-metric-passrate " + (this.props.className ? this.props.className : "");

        switch (growth) {
            case PassRateGrowth.Increase:
                metricGrowthClass = "bowtie-arrow-up-right";
                break;
            case PassRateGrowth.Decrease:
                metricGrowthClass = "bowtie-arrow-down-right";
                break;
        }

        let percentage = metricData.percentage + "%";
        return <span className={className} aria-label={format(BuildResources.PassrateAriaLabel, percentage)}><span className="percentage">{percentage}</span><span className={"passrate-growth bowtie-icon " + metricGrowthClass}></span></span>;
    }
}
