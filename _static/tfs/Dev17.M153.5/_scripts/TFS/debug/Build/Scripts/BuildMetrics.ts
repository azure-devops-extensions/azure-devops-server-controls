import { DefinitionMetrics } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { getUtcDateFormat, getUtcDateString } from "Build/Scripts/Utilities/DateUtility";

import { BuildMetric } from "TFS/Build/Contracts";

export enum PassRateGrowth {
    Increase = 0,
    Decrease = 1,
    Constant = 2
}

export interface IMetricData {
    queuedMetric: number;
    runningMetric: number;
    totalValue: number;
    percentage: number;
    growth: PassRateGrowth;
}

export function getMetricData(metrics: BuildMetric[]): IMetricData {
    metrics = metrics || [];
    let successValue = 0;
    let totalValue = 0;
    let queuedMetric = 0;
    let runningMetric = 0;
    let percentage = 0;

    let currentSuccessValue = 0;
    let currentTotalValue = 0;
    let currentConsiderableMetricsCount = 0;

    let currentUTCTime = getUtcDateString(0);
    let growth = PassRateGrowth.Constant;

    metrics.forEach((metric) => {
        if (metric.name === DefinitionMetrics.CurrentBuildsInQueue) {
            queuedMetric = metric.intValue;
        }
        else if (metric.name === DefinitionMetrics.CurrentBuildsInProgress) {
            runningMetric = metric.intValue;
        }
        else {
            if (considerMetric(metric.name)) {
                let metricDate = metric.date ? getUtcDateFormat(metric.date) : null;
                if (metricDate == currentUTCTime) {
                    currentTotalValue += metric.intValue;
                    currentConsiderableMetricsCount++;
                }
                else {
                    totalValue += metric.intValue;
                }

                if (metric.name === DefinitionMetrics.SuccessfulBuilds) {
                    if (metricDate == currentUTCTime) {
                        currentSuccessValue += metric.intValue;
                    }
                    else {
                        successValue += metric.intValue;
                    }
                }
            }
        }
    });

    percentage = Math.round(((currentSuccessValue + successValue) / (currentTotalValue + totalValue)) * 100);

    let currentPercentage = currentTotalValue > 0 ? currentSuccessValue / currentTotalValue : 0;
    let previousPercentage = totalValue > 0 ? successValue / totalValue : 0;

    if (currentConsiderableMetricsCount === 0) {
        // nothing happened today to consider increase or decrease
        growth = PassRateGrowth.Constant;
    }
    else if (currentPercentage > previousPercentage) {
        growth = PassRateGrowth.Increase;
    }
    else if (currentPercentage < previousPercentage) {
        growth = PassRateGrowth.Decrease;
    }

    return {
        queuedMetric: queuedMetric,
        runningMetric: runningMetric,
        growth: growth,
        percentage: isNaN(percentage) ? 0 : percentage,
        totalValue: currentTotalValue + totalValue
    };
}

function considerMetric(metricName: string) {
    if (metricName === DefinitionMetrics.FailedBuilds
        || metricName === DefinitionMetrics.SuccessfulBuilds
        || metricName === DefinitionMetrics.PartiallySuccessfulBuilds) {
        return true;
    }

    return false;
}
