import * as Chart_Contracts from 'Charts/Contracts';
import { TestTrendResult } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/Queries/TestTrendQuery';
import { AnalyticsTestTrendSettings } from 'TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendSettings';
import { DateSKParser } from "Analytics/Scripts/DateSKParser";
import { ScalarComponentProps } from 'WidgetComponents/ScalarComponent';
import { LayoutState } from 'WidgetComponents/LayoutState';
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import * as Utils_Date from "VSS/Utils/Date";
import * as StringUtils from "VSS/Utils/String";
import * as ArrayUtils from 'VSS/Utils/Array';
import { GroupingProperty, ChartMetric } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { layoutMetricFactory, ILayoutMetric} from "TestManagement/Scripts/TestReporting/Analytics/Widgets/AnalyticsTestTrend/AnalyticsTestTrendLayoutMetric";
import { TrendChartOptions } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions';
import { GroupingPropertyUtility } from 'TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/GroupingPropertyUtility';
import { TestMetricSettings } from 'TestManagement/Scripts/TestReporting/Widgets/Config/Components/TestMetricPickerPropertyDefinition';

interface SingleMetricLayoutState {
    dateSKs: number[],
    layoutMetric: ILayoutMetric,
    seriesList: Chart_Contracts.DataSeries[],
    chartType: string,
}

export class AnalyticsTestTrendLayoutStateFactory {

    getLayoutState(
        settings: AnalyticsTestTrendSettings,
        title: string,
        testRuns: TestTrendResult[],
        secondaryTestRuns?: TestTrendResult[],
    ): LayoutState {

        this.fillChartVisual(testRuns, settings.timePeriodInDays);
        let primaryMetricLayoutState = this.getLayoutStateForMetric(testRuns, settings, settings.chartMetric);
        let secondaryMetricLayoutState = this.getLayoutStateForMetric(secondaryTestRuns, settings, settings.secondaryChartMetric, primaryMetricLayoutState);

        let scalarData = this.getScalarData(testRuns, primaryMetricLayoutState.dateSKs, primaryMetricLayoutState.layoutMetric);

        return {
            title: { text: title },
            subtitle: { text: this.getSubtitle(settings.timePeriodInDays) },
            scalarData: scalarData,
            chartData: {
                chartOptions: this.getChartOptions(primaryMetricLayoutState, secondaryMetricLayoutState),
            },
        };
    }

    // Note - public for testing purposes
    public getDateSKs(testRuns: TestTrendResult[]): number[] {
        let dateSKs = testRuns.map(testRun => testRun.CompletedDateSK);
        return ArrayUtils.unique(dateSKs);
    }

    /** Fills the chart's x-axis with an empty column for days with no data in the time period specified - public for testing purposes */
    public fillChartVisual(testRuns: TestTrendResult[], timePeriod: number): void {
        let dateSKs = this.getDateSKs(testRuns);

        for (let day = 0; day < timePeriod; day++) {
            let dateToCompare: Date = Utils_Date.addDays(Utils_Date.shiftToLocal(new Date()), -day);
            let findDateSK = DateSKParser.dateStringToDateSK(Utils_Date.format(dateToCompare, DateSKParser.dateStringFormat));

            if (dateSKs.indexOf(findDateSK) < 0) {
                testRuns.push({
                    CompletedDateSK: findDateSK,
                    Count: 0,
                    ResultCount: 0,
                    AverageDuration: 0,
                    ResultNotExecutedCount: 0,
                    ResultPassCount: 0,
                    ResultNotImpactedCount: 0,
                    Branch: {
                        BranchName: ""
                    },
                    Test: {
                        TestOwner: "",
                        Priority: null
                    }
                })
            }
        }

        testRuns.sort((testRunA, testRunB) => (testRunA.CompletedDateSK - testRunB.CompletedDateSK));
    }

    private getLayoutStateForMetric(
        testRuns: TestTrendResult[],
        settings: AnalyticsTestTrendSettings,
        chartMetric: TestMetricSettings,
        // This is only used when we're dealing with the secondary metric
        primaryMetricLayoutState?: SingleMetricLayoutState,
    ): SingleMetricLayoutState
    {
        if (chartMetric.metric === ChartMetric.None) {
            return null;
        }

        let testRunsByGroup = this.getTestRunsByGroup(testRuns, chartMetric);
        let dateSKs = this.getDateSKs(testRuns);
        let layoutMetric = layoutMetricFactory.getLayoutMetric(chartMetric, testRuns, testRunsByGroup);
        let seriesList = this.getSeriesList(settings, chartMetric, dateSKs, testRuns, layoutMetric);
        let chartType = this.getChartType(layoutMetric, primaryMetricLayoutState);

        let isSecondary = primaryMetricLayoutState !== undefined;
        if (isSecondary) {
            seriesList.forEach(dataSeries => dataSeries.useSecondaryAxis = true);
        }

        return {
            dateSKs: dateSKs,
            layoutMetric: layoutMetric,
            seriesList: seriesList,
            chartType: chartType,
        };
    }

    private getChartType(
        layoutMetric: ILayoutMetric,
        primaryLayoutState?: SingleMetricLayoutState,
    ) {
        // When we have two metrics, we want one column chart and one line chart

        // The primary metric gets first choice
        let isPrimaryMetric = !primaryLayoutState;
        if (isPrimaryMetric) {
            return layoutMetric.getChartType();
        }

        // The secondary metric gets whatever is left
        if (primaryLayoutState.chartType === Chart_Contracts.ChartTypesConstants.Column) {
            return Chart_Contracts.ChartTypesConstants.Line;
        } else {
            return Chart_Contracts.ChartTypesConstants.Column;
        }
    }

    private getChartOptions(
        primaryMetric: SingleMetricLayoutState,
        secondaryMetric: SingleMetricLayoutState,
    ): Chart_Contracts.CommonChartOptions
    {
        // Add data from primary metric
        let series = [ ...primaryMetric.seriesList ];
        let dateSKs = [ ...primaryMetric.dateSKs ];
        let allMetrics = [ primaryMetric ];
        let options: Partial<Chart_Contracts.CommonChartOptions> = {};

        if (secondaryMetric) {
            // Add data from secondary metric
            series = [...series, ...secondaryMetric.seriesList];
            dateSKs = ArrayUtils.unique([...dateSKs, ...secondaryMetric.dateSKs]);
            allMetrics.push(secondaryMetric);
            options = {
                yAxisSecondary: {
                    title: secondaryMetric.layoutMetric.getName(),
                    max: secondaryMetric.layoutMetric.getMaxValue(),
                    /**
                     * endOnTick is automatically opted-in for High Charts.
                     * However, its implementation sometimes rounds chart axes above its max values, so we opt-out.
                     *
                     * https://api.highcharts.com/highcharts/yAxis.max
                    */
                    endOnTick: false
                },
            };
        }

        let chartTypes: string[] = [];
        for (let metric of allMetrics) {
            for (let _ of metric.seriesList) {
                chartTypes.push(metric.chartType);
            }
        }

        return {
            ...options,
            chartType: Chart_Contracts.ChartTypesConstants.Hybrid,
            series: series,
            xAxis: {
                labelFormatMode: Chart_Contracts.LabelFormatModes.DateTime_DayInMonth,
                labelValues: dateSKs.map(dateSK => DateSKParser.parseDateSKAsLocalTimeZoneDate(dateSK)),
            },
            yAxis: {
                title: primaryMetric.layoutMetric.getName(),
                max: primaryMetric.layoutMetric.getMaxValue(),
                endOnTick: false
            },
            specializedOptions: {
                chartTypes: chartTypes,
            },
        };
    }

    private getScalarData(
        testRuns: TestTrendResult[],
        dateSKs: number[],
        layoutMetric: ILayoutMetric
    ): ScalarComponentProps {

        let lastDateSk = Math.max(...dateSKs);
        let testRunsFromLastDate = testRuns.filter(testRun => testRun.CompletedDateSK === lastDateSk);

        return {
            description: Resources.LastDay,
            measure: layoutMetric.getName(),
            value: layoutMetric.getUngroupedValue(testRunsFromLastDate),
        };
    }

    private getSubtitle(timePeriodInDays: number): string {
        return StringUtils.format(Resources.LastDays, timePeriodInDays);
    }

    /**
     * For each GroupBy option, there is a label that corresponds to each unique group
     * eg. if grouping by branch, the keys will be each unique Branch.BranchName value
     * eg. if grouping by Test Run, the keys will be each unique Title which is the name of the test run.
     */
    private getTestRunsByGroup(testRuns: TestTrendResult[], chartMetric: TestMetricSettings): Map<string, TestTrendResult[]> {
        if (chartMetric.groupBy === GroupingProperty.None) {
            return null;
        }
        let testRunsByGroup = new Map<string, TestTrendResult[]>();
        testRuns.forEach(testRun => {
            let groupName = this.getGroupName(testRun, chartMetric.groupBy);
            if (testRunsByGroup.has(groupName)) {
                testRunsByGroup.get(groupName).push(testRun);
            } else {
                testRunsByGroup.set(groupName, [testRun]);
            }
        });
        return testRunsByGroup;
    }

    private getGroupName(testRun: TestTrendResult, groupBy: GroupingProperty) {
        switch (groupBy) {
            case GroupingProperty.Branch: {
                return testRun.Branch.BranchName;
            }
            case GroupingProperty.TestRun: {
                return testRun.Title;
            }
            case GroupingProperty.Container: {
                return testRun.Test.ContainerName;
            }
            case GroupingProperty.Owner: {
                return testRun.Test.TestOwner;
            }
            case GroupingProperty.Priority: {
                let priority = testRun.Test.Priority;
                if (priority === 255) {
                    return Resources.NotAvailable;
                }
                return String(priority);
            }
            default: {
                return null;
            }
        }
    }

    private getSeriesList(
        settings: AnalyticsTestTrendSettings,
        chartMetric: TestMetricSettings,
        dateSKs: number[],
        testRuns: TestTrendResult[],
        layoutMetric: ILayoutMetric
    ): Chart_Contracts.DataSeries[] {
        let seriesList = [];

        if(chartMetric.groupBy !== GroupingProperty.None) {
            let testRunsByGroup: Map<string, TestTrendResult[]> = this.getTestRunsByGroup(testRuns, chartMetric);
            testRunsByGroup.forEach((testRuns, groupName) => {
                seriesList.push({
                    name: !groupName ? GroupingPropertyUtility.getNotAvailableText(chartMetric.groupBy) : groupName,
                    data: this.getSeriesData(testRuns, dateSKs, testRuns.map(testRun => layoutMetric.getValue(testRun))),
                });
            });
        } else {
            seriesList.push({
                name: layoutMetric.getName(),
                data: testRuns.map(testRun => layoutMetric.getValue(testRun)),
            })
        }
        //Stacked chart will assign its own colors but if there's no stacking, let the metric decide what color to use
        if(seriesList.length == 1) {
            seriesList[0].color = layoutMetric.getColor();
        } else {
            seriesList = this.reduceSeriesList(settings, seriesList, dateSKs);
        }
        return seriesList;
    }

    private getSeriesData(testRuns: TestTrendResult[], dateSKs: number[], metricValues: number[]): number[] {
        let paddedData = dateSKs.map(dateSK => null);
        testRuns.forEach((testRun, index) => {
            let dateIndex = dateSKs.indexOf(testRun.CompletedDateSK);
            paddedData[dateIndex] = metricValues[index];
        });
        return paddedData;
    }

    private reduceSeriesList(
        settings: AnalyticsTestTrendSettings,
        seriesList: Chart_Contracts.DataSeries[],
        dateSKs: number[],
    ): Chart_Contracts.DataSeries[] {
        let seriesSumList = seriesList.map(series => {
            return {
                dataSeries: {
                    name: series.name,
                    data: series.data,
                } as Chart_Contracts.DataSeries,
                aggregate: series.data.reduce((total: number, next: number) => total + next) as number
            }
        });

        seriesSumList.sort((a,b) => {
            return b.aggregate - a.aggregate;
        });

        let maxStackedSeriesCount = this.getMaxStackedSeriesCount(settings);

        let reducedSeriesList = seriesSumList.slice(0, maxStackedSeriesCount).map(series => series.dataSeries);

        let truncatedSeriesSumList = seriesSumList.slice(maxStackedSeriesCount);

        if(truncatedSeriesSumList.length > 0) {
            let othersSeries: Chart_Contracts.DataSeries = {
                name: StringUtils.format(Resources.OthersArtifactWithCountText, truncatedSeriesSumList.length),
                data: []
            };
            for(let date = 0; date < dateSKs.length; date++) {
                othersSeries.data[date] = truncatedSeriesSumList
                    .map(series => series.dataSeries.data[date])
                    .reduce((total: number, next: number) => total += next);
            }
            reducedSeriesList.push(othersSeries);
        }

        return reducedSeriesList;
    }

    private getMaxStackedSeriesCount(settings: AnalyticsTestTrendSettings) {
        if (settings.chartMetric.groupBy !== GroupingProperty.None &&
            settings.secondaryChartMetric.groupBy !== GroupingProperty.None)
        {
            // Both metrics want to place items in the legend
            // Split the max items between them
            return TrendChartOptions.maxStackedSeriesCount / 2;
        }

        return TrendChartOptions.maxStackedSeriesCount;
    }
}