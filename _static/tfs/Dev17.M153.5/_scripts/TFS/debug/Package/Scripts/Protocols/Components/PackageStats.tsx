import * as React from "react";

import { Component, Props, State } from "VSS/Flux/Component";
import * as Utils_Number from "VSS/Utils/Number";
import * as Utils_String from "VSS/Utils/String";

import { PackageAttribute } from "Package/Scripts/Protocols/Components/PackageAttribute";
import * as PackageResources from "Feed/Common/Resources";
import { Metric, MetricType, PackageMetrics } from "Package/Scripts/WebApi/VSS.Feed.Contracts";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Protocols/Components/PackageStats";

export interface IPackageStatsProps extends Props {
    packageMetrics: PackageMetrics;
}

export class PackageStats extends Component<IPackageStatsProps, State> {
    public render(): JSX.Element {
        return (
            <div className="package-stats">
                <PackageAttribute title={PackageResources.PackageAttributeTitle_Stats}>
                    {
                        this.props.packageMetrics &&
                        this.props.packageMetrics.aggregatedMetrics.map(
                            (metric: Metric, index: number) => {
                                return this.getPackageMetricDiv(metric, index);
                            }
                        )
                    }
                </PackageAttribute>
            </div>
        );
    }

    private getPackageMetricDiv(metric: Metric, key: number): JSX.Element {
        switch (metric.metricType) {
            case MetricType.TotalDownloads:
                return this.getAggregatedMetricDiv(
                    Utils_String.format(
                        PackageResources.Stats_TotalDownloads,
                        Utils_Number.formatAbbreviatedNumber(metric.value)),
                    "bowtie-icon bowtie-transfer-download",
                    key);
            case MetricType.UniqueUsers:
                const text: string = metric.value == 1
                    ? PackageResources.Stats_UniqueUser
                    : Utils_String.format(
                        PackageResources.Stats_UniqueUsers,
                        Utils_Number.formatAbbreviatedNumber(metric.value));
                return this.getAggregatedMetricDiv(
                    text,
                    "bowtie-icon bowtie-users",
                    key);
            default:
                break;
        }
    }

    private getAggregatedMetricDiv(
        text: string,
        icon: string,
        elementKey: number,
        className?: string
    ): JSX.Element {
        return (
            <div className={className} key={elementKey}>
                <span className={"package-attribute-item-icon " + icon} />
                <div className="package-metric-text">{text}</div>
            </div>);
    }
}
