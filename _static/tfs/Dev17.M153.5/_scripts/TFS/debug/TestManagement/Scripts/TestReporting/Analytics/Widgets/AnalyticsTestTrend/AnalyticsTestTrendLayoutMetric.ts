import { AnalyticsTestTrendSettings } from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings";
import { TestTrendResult } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/Queries/TestTrendQuery';
import * as Chart_Contracts from 'Charts/Contracts';
import { ChartMetric, TestOutcome, INormalizedDuration } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types';
import * as CommonUtils from "TestManagement/Scripts/Scenarios/Common/CommonUtils";
import { TestOutcomeUtility } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/TestOutcomeUtility';
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { DurationNormalizer } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/DurationUtility';
import * as StringUtils from "VSS/Utils/String";
import { TestReportDataParser } from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import { TestMetricSettings } from "TestManagement/Scripts/TestReporting/Widgets/Config/Components/TestMetricPickerPropertyDefinition";

/**
 * Algorithms which vary based on the `ChartMetric` used by `AnalyticsTestTrendLayoutStateFactory`
 *
 * For examples of default values, take a look at the class {LayoutMetricBase}
 */
export interface ILayoutMetric {
    getName(): string;
    getColor(): string;
    getUngroupedValue(results: TestTrendResult[]): number;
    getChartType(): string;
    getValue(result: TestTrendResult): number;
    /** This allows computation of the chart's max y-axis value. If no computation is included, high charts will automatically computate a value */
    getMaxValue(): number;
}

abstract class LayoutMetricBase implements ILayoutMetric {
    abstract getName(): string;
    abstract getColor(): string;
    abstract getUngroupedValue(results: TestTrendResult[]): number;
    abstract getChartType(): string;

    getValue(result: TestTrendResult): number {
        return this.getUngroupedValue([result]);
    }

    getMaxValue(): number {
        return undefined;
    }
}

/**
 * Algorithms for `ChartMetric.PassRate`
 */
class PassRateLayoutMetric extends LayoutMetricBase {

    getName(): string {
        return Resources.PassRate;
    }

    getColor(): string {
        return TestOutcomeUtility.getColor(TestOutcome.Passed);
    }

    getUngroupedValue(results: TestTrendResult[]): number {
        let total=0, notExecuted=0, passed=0, notImpacted=0;
        for(let testRun of results)
        {
            total += testRun.ResultCount;
            notExecuted += testRun.ResultNotExecutedCount;
            passed += testRun.ResultPassCount;
            notImpacted += testRun.ResultNotImpactedCount;
        }
        const executed = total - notExecuted;
        if (executed === 0) {
            return 0;
        }
        let passRate = (passed + notImpacted) * 100.0 / executed;
        return CommonUtils.TestReportDataParser.getCustomizedDecimalValue(passRate);
    }

    getChartType(): string {
        return Chart_Contracts.ChartTypesConstants.Line;
    }

    // Pass Rate is measured by percentage, so we limit the chart axis to 100
    getMaxValue(): number {
        return 100;
    }
}

/**
 * Algorithms for `ChartMetric.ResultCount`
 */
class ResultCountLayoutMetric extends LayoutMetricBase {

    constructor(private chartMetric: TestMetricSettings) {
        super();
    }

    getColor(): string {
        return TestOutcomeUtility.getColor(this.chartMetric.testOutcomes);
    }

    getName(): string {
        return TestOutcomeUtility.getName(this.chartMetric.testOutcomes);
    }

    getUngroupedValue(results: TestTrendResult[]): number {
        const sumOfCounts =
            results
            .map(result => result.Count)
            .reduce((previousValue, currentValue) => previousValue + currentValue);
        return sumOfCounts;
    }

    getChartType(): string {
        return Chart_Contracts.ChartTypesConstants.Column;
    }
}

interface DurationLookup {
    groupByIndex: number;
    resultIndex: number;
}

/**
 * Algorithms for `ChartMetric.AverageDuration`
 */
class AverageDurationLayoutMetric extends LayoutMetricBase {

    private normalizedDurations: INormalizedDuration = null;
    private normalizedDurationsByResult = new Map<TestTrendResult, DurationLookup>();

    constructor(
        results: TestTrendResult[],
        resultsByGroup: Map<string, TestTrendResult[]>,
    ) {
        super();
        const considerFlattened = (resultsByGroup === null);
        let resultsList: TestTrendResult[][] = [];
        if (resultsByGroup) {
            resultsByGroup.forEach((results) =>
                resultsList.push(results)
            );
        } else {
            resultsList.push(results);
        }

        // This is the data shape that we need for DurationNormalizer
        let durationList =
            resultsList.map(
                (results) =>
                    results.map(
                        (result) =>
                            result.AverageDuration
                    )
                );

        // This will allow us to map individual results back to their normalized version retured by
        // DurationNormalizer.normalizeDurations
        resultsList.forEach(
            (results, groupByIndex) => results.map(
                (result, resultIndex) => {
                    this.normalizedDurationsByResult.set(
                        result,
                        {
                            groupByIndex: groupByIndex,
                            resultIndex: resultIndex,
                        }
                    );
                }
            )
        );

        let durationNormalizer = new DurationNormalizer();
        this.normalizedDurations = durationNormalizer.normalizeDurations(durationList, considerFlattened);
    }

    getColor(): string {
        return TestOutcomeUtility.defaultColor;
    }

    getName(): string {
        return StringUtils.localeFormat(Resources.DurationSeriesLabel, this.normalizedDurations.durationUnitString);
    }

    getUngroupedValue(results: TestTrendResult[]): number {
        const sumOfDurations =
            results
            .map(result => this.getNormalizedDuration(result))
            .reduce((previousValue, currentValue) => previousValue + currentValue);
        return TestReportDataParser.getCustomizedDecimalValue(sumOfDurations);
    }

    getChartType(): string {
        return Chart_Contracts.ChartTypesConstants.Column;
    }

    getNormalizedDuration(result: TestTrendResult): number {
        const durationLookup = this.normalizedDurationsByResult.get(result);
        const duration = this.normalizedDurations.durationValues[durationLookup.groupByIndex][durationLookup.resultIndex];
        return duration;
    }
}

class LayoutMetricFactory {
    getLayoutMetric(
        chartMetric: TestMetricSettings,
        results: TestTrendResult[],
        resultsByGroup: Map<string, TestTrendResult[]>,
    ): ILayoutMetric {
        switch (chartMetric.metric) {
            case ChartMetric.PassRate: return new PassRateLayoutMetric();
            case ChartMetric.ResultCount: return new ResultCountLayoutMetric(chartMetric);
            case ChartMetric.AverageDuration: return new AverageDurationLayoutMetric(results, resultsByGroup);
            default: throw new Error(`Unknown metric: ${chartMetric.metric}`);
        }
    }
}

export const layoutMetricFactory = new LayoutMetricFactory();