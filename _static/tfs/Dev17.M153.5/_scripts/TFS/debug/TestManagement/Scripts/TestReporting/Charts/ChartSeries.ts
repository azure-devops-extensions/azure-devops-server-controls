import { DataSeries } from "Charts/Contracts";
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import Detailed_Charts = require("TestManagement/Scripts/TestReporting/Charts/ChartBase");
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import Contracts = require("TFS/TestManagement/Contracts");
import Utils_String = require("VSS/Utils/String");

export class TriSeriesFactory {
    public static getSeriesImplementor(seriesType: string): TriSeries {
        let series: TriSeries;

        switch (seriesType) {
            case Detailed_Charts.SeriesTypes.PassPercentage:
                series = new PassPercentSeries();
                break;
            case Detailed_Charts.SeriesTypes.FailPercentage:
                series = new FailPercentSeries();
                break;
            case Detailed_Charts.SeriesTypes.OthersPercentage:
                series = new OthersPercentSeries();
                break;
            case Detailed_Charts.SeriesTypes.PassedTests:
                series = new PassedTestsSeries();
                break;
            case Detailed_Charts.SeriesTypes.FailedTests:
                series = new FailedTestsSeries();
                break;
            case Detailed_Charts.SeriesTypes.OtherTests:
                series = new OtherTestsSeries();
                break;
            case Detailed_Charts.SeriesTypes.TotalTests:
                series = new TotalTestsSeries();
                break;
            case Detailed_Charts.SeriesTypes.Duration:
                series = new DurationSeries();
                break;
            case Detailed_Charts.SeriesTypes.StackedColumn:
                series = new StackedColumnSeries();
                break;
            default:
                throw new Error(Utils_String.format("Error: Series type {0} is not valid", seriesType));
        }

        return series;
    }
}

export class TriSeries {
    public convert(data: Contracts.AggregatedDataForResultTrend[]): DataSeries[] {
        return [<DataSeries>{
            data: this.getData(data),
            name: this.getLabel(),
            color: this.getColor()
        }];
    }

    public getLabel(data?: Contracts.AggregatedDataForResultTrend[]): string {
        throw new Error("Not implemented");
    }

    public getMinValue(): number {
        return 0;
    }

    public getMaxValue(): number {
        return null;
    }

    protected getData(data: Contracts.AggregatedDataForResultTrend[]): number[] {
        throw new Error("Not implemented");
    }

    protected getColor(): string {
        throw new Error("Not implemented");
    }
}

export class PassPercentSeries extends TriSeries {
    public getMaxValue(): number {
        return 100;
    }

    public getLabel(): string {
        return Resources.PassPercentageSeriesLabel;
    }

    protected getData(data: Contracts.AggregatedDataForResultTrend[]): number[] {
        let seriesData = $.map(data, (datum: Contracts.AggregatedDataForResultTrend): number => {
            let totalTests = (datum.totalTests) ? (datum.totalTests) : 0;
            let passedTests = (datum.resultsByOutcome[Contracts.TestOutcome.Passed]) ? datum.resultsByOutcome[Contracts.TestOutcome.Passed].count : 0;                      

            if (totalTests !== 0) {
                let passPercentage = ((passedTests * 100) / (totalTests));
                if (passPercentage === Math.round(passPercentage)) {
                    return passPercentage;
                }
                else {
                    return CommonUtils.TestReportDataParser.getCustomizedDecimalValue(passPercentage);
                }
            }
            else {
                return 0;
            }
        });

        return seriesData;
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.Passed;
    }
}

export class FailPercentSeries extends TriSeries {
    public getMaxValue(): number {
        return 100;
    }

    public getLabel(): string {
        return Resources.FailPercentageSeriesLabel;
    }

    protected getData(data: Contracts.AggregatedDataForResultTrend[]): number[] {
        let seriesData = $.map(data, (datum: Contracts.AggregatedDataForResultTrend): number => {
            let totalTests = (datum.totalTests) ? (datum.totalTests) : 0;
            let failedTests = (datum.resultsByOutcome[Contracts.TestOutcome.Failed]) ? datum.resultsByOutcome[Contracts.TestOutcome.Failed].count : 0;           

            if (totalTests !== 0) {
                let failPercentage = ((failedTests * 100) / (totalTests));
                if (failPercentage === Math.round(failPercentage)) {
                    return failPercentage;
                }
                else {
                    return CommonUtils.TestReportDataParser.getCustomizedDecimalValue(failPercentage);
                }
            }
            else {
                return 0;
            }
        });

        return seriesData;
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.Failed;
    }
}

export class OthersPercentSeries extends TriSeries {
    public getMaxValue(): number {
        return 100;
    }

    public getLabel(): string {
        return Resources.OtherPercentageSeriesLabel;
    }

    protected getData(data: Contracts.AggregatedDataForResultTrend[]): number[] {
        let seriesData = $.map(data, (datum: Contracts.AggregatedDataForResultTrend): number => {
            let totalTests = 0;
            let passedTests = 0;
            let failedTests = 0;
            let notImpactedTests = 0;
            for (let key in datum.resultsByOutcome) {
                if (datum.resultsByOutcome.hasOwnProperty(key)) {
                    let resultByOutcome = datum.resultsByOutcome[key];
                    if (resultByOutcome) {
                        totalTests += resultByOutcome.count;
                    }

                    if (parseInt(key) === Contracts.TestOutcome.Passed) {
                        passedTests = resultByOutcome.count;
                    } else if (parseInt(key) === Contracts.TestOutcome.Failed) {
                        failedTests = resultByOutcome.count;
                    }
                    else if (parseInt(key) === Contracts.TestOutcome.NotImpacted) {
                        notImpactedTests = resultByOutcome.count;
                    }

                }
            }

            if (totalTests !== 0) {
                let otherTests = totalTests - (passedTests + failedTests + notImpactedTests);
                let othersPercentage = ((otherTests * 100) / (totalTests - notImpactedTests));  // Subtracting not impacted here because total tests is calculated differently
                if (othersPercentage === Math.round(othersPercentage)) {
                    return othersPercentage;
                }
                else {
                    return CommonUtils.TestReportDataParser.getCustomizedDecimalValue(othersPercentage);
                }
            }
            else {
                return 0;
            }
        });

        return seriesData;
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.OtherOutcome;
    }
}

export class PassedTestsSeries extends TriSeries {
    public getLabel(): string {
        return Resources.PassedTestsSeriesLabel;
    }

    protected getData(data: Contracts.AggregatedDataForResultTrend[]): number[] {
        let seriesData = $.map(data, (datum: Contracts.AggregatedDataForResultTrend): number => {

            let passedRecord = datum.resultsByOutcome[Contracts.TestOutcome.Passed];
            return (passedRecord) ? passedRecord.count : 0;
        });

        return seriesData;
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.Passed;
    }
}

export class FailedTestsSeries extends TriSeries {
    public getLabel(): string {
        return Resources.FailedTestsSeriesLabel;
    }

    protected getData(data: Contracts.AggregatedDataForResultTrend[]): number[] {
        let seriesData = $.map(data, (datum: Contracts.AggregatedDataForResultTrend): number => {

            let failureRecord = datum.resultsByOutcome[Contracts.TestOutcome.Failed];
            return failureRecord ? failureRecord.count : 0;
        });

        return seriesData;
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.Failed;
    }
}

export class OtherTestsSeries extends TriSeries {
    public getLabel(): string {
        return Resources.OtherTestsSeriesLabel;
    }

    protected getData(data: Contracts.AggregatedDataForResultTrend[]): number[] {
        let seriesData = $.map(data, (datum: Contracts.AggregatedDataForResultTrend): number => {
            let totalTests = 0;
            for (let key in datum.resultsByOutcome) {
                if (datum.resultsByOutcome.hasOwnProperty(key)) {
                    let resultByOutcome = datum.resultsByOutcome[key];
                    if (resultByOutcome) {
                        totalTests += resultByOutcome.count;
                    }
                }
            }
            let passedTests = (datum.resultsByOutcome[Contracts.TestOutcome.Passed]) ? datum.resultsByOutcome[Contracts.TestOutcome.Passed].count : 0;
            let failedTests = (datum.resultsByOutcome[Contracts.TestOutcome.Failed]) ? datum.resultsByOutcome[Contracts.TestOutcome.Failed].count : 0;
            let nonImpactedTests = (datum.resultsByOutcome[Contracts.TestOutcome.NotImpacted]) ? datum.resultsByOutcome[Contracts.TestOutcome.NotImpacted].count : 0;

            return totalTests - (passedTests + failedTests + nonImpactedTests);
        });

        return seriesData;
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.OtherOutcome;
    }
}

export class TotalTestsSeries extends TriSeries {
    public getLabel(): string {
        return Resources.TotalTestsSeriesLabel;
    }

    protected getData(data: Contracts.AggregatedDataForResultTrend[]): number[] {
        return $.map(data, ((datum: Contracts.AggregatedDataForResultTrend): number => {
            let totalTests = 0;
            for (let key in datum.resultsByOutcome) {
                if (datum.resultsByOutcome.hasOwnProperty(key)) {
                    let resultByOutcome = datum.resultsByOutcome[key];
                    if (resultByOutcome) {
                        totalTests += resultByOutcome.count;
                    }
                }
            }
            return totalTests;
        }));
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.TotalTests;
    }
}

export class DurationSeries extends TriSeries {
    public getLabel(data?: Contracts.AggregatedDataForResultTrend[]): string {
        if (!this.analyzedDurationUnit) {
            this.getData(data);
        }
        return Utils_String.localeFormat(Resources.DurationSeriesLabel, this.analyzedDurationUnit);
    }

    protected getData(data: Contracts.AggregatedDataForResultTrend[]): number[] {
        //if getLabel is called before, then data is already converted
        if (!this.analyzedDurationsInUnitScale) {
            let durations = $.map(data, (datum: Contracts.AggregatedDataForResultTrend): string => {
                return datum.duration;
            });
            let analyzedDuration = new Detailed_Charts.DurationNormalizer(durations).normalize();
            this.analyzedDurationUnit = analyzedDuration.unit;
            this.analyzedDurationsInUnitScale = analyzedDuration.durationsInUnitScale;
        }
        return this.analyzedDurationsInUnitScale;
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.Duration;
    }

    private analyzedDurationUnit: string;
    private analyzedDurationsInUnitScale: number[];
}

export class StackedColumnSeries extends TriSeries {

    public convert(data: Contracts.AggregatedDataForResultTrend[]): DataSeries[] {
        let returnValue: DataSeries[] = [];
        let passedTestSeries: PassedTestsSeries = new PassedTestsSeries();
        let failedTestSeries: FailedTestsSeries = new FailedTestsSeries();
        let otherTestsSeries: OtherTestsSeries = new OtherTestsSeries();

        return returnValue.concat(passedTestSeries.convert(data)).concat(failedTestSeries.convert(data)).concat(otherTestsSeries.convert(data));
    }

    public getLabel(): string {
        return Resources.StackedColumnSeriesLabelText;
    }
}