/// <reference types="knockout" />

import Charting_Contracts = require("Charting/Scripts/Contracts");



import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");

import BuildContracts = require("TFS/Build/Contracts");
import Contracts = require("TFS/TestManagement/Contracts");
import RMContracts = require("ReleaseManagement/Core/Contracts");

import Utils_String = require("VSS/Utils/String");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export class SeriesTypes {

    public static PassedTests = "PassedTests";
    public static FailedTests = "FailedTests";
    public static OtherTests = "OtherTests";
    public static TotalTests = "TotalTests";

    public static PassPercentage = "PassPercentage";
    public static FailPercentage = "FailPercentage";
    public static OthersPercentage = "OthersPercentage";

    public static Duration = "Duration";
    public static StackedColumn = "StackedColumn";
    public static Stacked = "Stacked";
}

export class ChartTypes {

    public static Column = "Column";

    public static Line = "Line";

    public static ColumnLineCombo = "ColumnLineCombo";

    public static StackedColumn = "StackedColumn";

    public static StackedArea = "StackedArea";

    public static MultiLine = "MultiLine";

    public static Area = "Area";
}

export class ChartViews {
    public static FailureTrend = "FailureTrend";

    public static DurationTrend = "DurationTrend";
}

export interface AxisOptions {

    seriesType: string;

    allowDecimals?: boolean;
}

export interface ChartConfigurationOptions {

    /** Width of the chart */
    width: number;

    /** Height of the chart */
    height: number;

    /** The title to be shown for the widget */
    title?: string;

    context?: Contracts.TestResultsContextType;

    /** Reference to the build definition for which trend needs to be shown */
    buildDefinition: BuildContracts.DefinitionReference;

    /** Reference to the release definition for which trend needs to be shown */
    releaseDefinition?: RMContracts.ReleaseDefinition;

    releaseEnvironment?: RMContracts.ReleaseEnvironment;

    testRunTitle?: string;

    /** Type of chart to show */
    chartType: string;

    /** Secondary chart to show */
    secondaryChartType?: string;

    /** Y-Axis type */
    yAxisOptions: AxisOptions;

    /** Secondary Y-Axis type */
    secondaryYAxisOptions?: AxisOptions;

    /* Add more configuration options as and when needed */
    onDataClicked?: (event: Charting_Contracts.ChartClickEventArgs, context?: Contracts.TestResultsContext) => void;
}



export class OptionsCreatorFactory {

    public static create(configOptions: ChartConfigurationOptions, data: Contracts.AggregatedDataForResultTrend[]): BaseChartOptionsCreator {
        let returnValue: BaseChartOptionsCreator;

        switch (configOptions.chartType) {
            case ChartTypes.Line:
            case ChartTypes.Column:
                returnValue = new CategoricalChartOptionsCreator(configOptions, data);
                break;
            case ChartTypes.ColumnLineCombo:
                returnValue = new ColumnLineComboChartOptionsCreator(configOptions, data);
                break;
            default:
                throw new Error(Utils_String.format("Error: Chart type {0} is not valid", configOptions.chartType));
        }

        return returnValue;
    }
}

export class BaseChartOptionsCreator {

    constructor(configOptions: ChartConfigurationOptions, data: Contracts.AggregatedDataForResultTrend[]) {
        this._configOptions = configOptions;
        this._data = data;
    }

    public create(): Charting_Contracts.ChartOptions {
        let options = <Charting_Contracts.ChartOptions>{};
        options.height = this._configOptions.height;
        options.width = this._configOptions.width;

        if ($.isFunction(this._configOptions.onDataClicked)) {
            options.onDataClick = this._configOptions.onDataClicked;
        }

        return options;
    }

    protected getConfigOptions(): ChartConfigurationOptions {
        return this._configOptions;
    } 

    protected getData(): Contracts.AggregatedDataForResultTrend[]{
        return this._data;
    }

    private _configOptions: ChartConfigurationOptions;
    private _data: Contracts.AggregatedDataForResultTrend[];
}

export class CategoricalChartOptionsCreator extends BaseChartOptionsCreator {

    constructor(configOptions: ChartConfigurationOptions, data: Contracts.AggregatedDataForResultTrend[], isSecondaryAxisData?: boolean) {
        super(configOptions, data);
        this._isSecondaryAxisData = isSecondaryAxisData;

        if (!isSecondaryAxisData) {
            this._dataConverter = DataConverterFactory.createDataConverter(configOptions.yAxisOptions.seriesType, data);
        }
        else {
            this._dataConverter = DataConverterFactory.createDataConverter(configOptions.secondaryYAxisOptions.seriesType, data);
        }
    }

    public create(): Charting_Contracts.DataSeriesChartOptions {

        let config = this.getConfigOptions();

        let options = <Charting_Contracts.DataSeriesChartOptions>super.create();
        options.xAxis = {
            dataType: Charting_Contracts.AxisDataType.Categorical,
            labels: {
                enabled: false
            }
        };

        options.yAxis = {
            min: this._dataConverter.getMinValue(),
            max: this._dataConverter.getMaxValue(),
            // Since most of test charts have yAxis as integers, we are setting scale type to integer by-default
            scaleMode: Charting_Contracts.NumericalScaleMode.Integer
        };

        options.yAxis.title = {
            text: this._dataConverter.getSeriesLabel()
        };

        options.series = this._dataConverter.convert();
        return options;
    }

    private _dataConverter: BaseCategoricalDataConverter;
    private _isSecondaryAxisData: boolean;
}

export class ColumnLineComboChartOptionsCreator extends BaseChartOptionsCreator {

    constructor(configOptions: ChartConfigurationOptions, data: Contracts.AggregatedDataForResultTrend[]) {
        super(configOptions, data);
        this._columnOptionsCreator = new CategoricalChartOptionsCreator(configOptions, data);
        this._lineOptionsCreator = new CategoricalChartOptionsCreator(configOptions, data, true);
    }

    public create(): Charting_Contracts.ColumnLineComboChartOptions {
        let config = this.getConfigOptions();
        let options = <Charting_Contracts.ColumnLineComboChartOptions>super.create();

        options.columnChartOptions = this._columnOptionsCreator.create();
        options.lineChartOptions = this._lineOptionsCreator.create();

        return options;
    }

    private _columnOptionsCreator: CategoricalChartOptionsCreator;
    private _lineOptionsCreator: CategoricalChartOptionsCreator;
}

export class DataConverterFactory {

    public static createDataConverter(seriesType: string, data: Contracts.AggregatedDataForResultTrend[]): BaseCategoricalDataConverter {
        let returnValue: BaseCategoricalDataConverter;

        switch (seriesType) {

            case SeriesTypes.PassPercentage:
                returnValue = new PassPercentToCategoricalDataConverter(data);
                break;
            case SeriesTypes.FailPercentage:
                returnValue = new FailPercentToCategoricalDataConverter(data);
                break;
            case SeriesTypes.OthersPercentage:
                returnValue = new OtherPercentToCategoricalDataConverter(data);
                break;
            case SeriesTypes.FailedTests:
                returnValue = new FailedTestsToCategoricalDataConverter(data);
                break;
            case SeriesTypes.Duration:
                returnValue = new DurationToCategoricalDataConverter(data);
                break;
            case SeriesTypes.TotalTests:
                returnValue = new TotalTestsToCategoricalDataConverter(data);
                break;
            case SeriesTypes.PassedTests:
                returnValue = new PassedTestsToCategoricalDataConverter(data);
                break;
            case SeriesTypes.OtherTests:
                returnValue = new OtherTestsToCategoricalDataConverter(data);
                break;
            default:
                throw new Error(Utils_String.format("Error: Series type {0} is not valid", seriesType));
        }

        return returnValue;
    }
}

export interface ITestResultTrendSeriesCustomData {
    buildId: number;
    buildUri: string;
}

export class BaseCategoricalDataConverter {

    constructor(data: Contracts.AggregatedDataForResultTrend[]) {
        this._data = data;
        this._categories = this._extractCategories();
    }

    public convert(): Charting_Contracts.CategoricalData {
        let categoricalData = <Charting_Contracts.CategoricalData>{};
        categoricalData.categories = this._categories;
        categoricalData.data = [{
            name: this.getSeriesLabel(),
            data: this.getSeriesData(),
            customData: this.getCustomData(),
            color: this.getSeriesColor()
        }];

        return categoricalData;
    }

    public getMinValue(): number {
        return 0;
    }

    public getMaxValue(): number {
        return undefined;
    }

    public getSeriesLabel(): string {
        throw this._notImplementedError;
    }

    protected getSeriesData(): number[] {
        throw this._notImplementedError;
    }

    protected getCustomData(): ITestResultTrendSeriesCustomData[] {
        return $.map(this.getData(), (datum: Contracts.AggregatedDataForResultTrend): ITestResultTrendSeriesCustomData => {
            return <ITestResultTrendSeriesCustomData>{
                buildId: datum.testResultsContext.build.id,
                buildUri: datum.testResultsContext.build.uri
            };
        });
    }

    protected getSeriesColor(): string {
        throw this._notImplementedError;
    }

    protected getData(): Contracts.AggregatedDataForResultTrend[]{
        return this._data;
    }

    private _extractCategories(): string[]{
        let categories = $.map(this._data, (datum: Contracts.AggregatedDataForResultTrend): string => {
            return datum.testResultsContext.build.number;
        });

        return categories;
    }

    private _data: Contracts.AggregatedDataForResultTrend[];
    private _categories: string[];
    private _notImplementedError = new Error("This needs to be implemented in the derived classes");
}

export class PassedTestsToCategoricalDataConverter extends BaseCategoricalDataConverter {
    protected getSeriesData(): number[] {
        let seriesData = $.map(this.getData(), (datum: Contracts.AggregatedDataForResultTrend): number => {

            let passedRecord = datum.resultsByOutcome[Contracts.TestOutcome.Passed];
            return (passedRecord) ? passedRecord.count : 0;
        });

        return seriesData;
    }

    public getSeriesLabel(): string {
        return Resources.PassedTestsSeriesLabel;
    }

    protected getSeriesColor(): string {
        return Common.TestReportColorPalette.Passed;
    }
}

export class FailedTestsToCategoricalDataConverter extends BaseCategoricalDataConverter {

    protected getSeriesData(): number[] {
        let seriesData = $.map(this.getData(), (datum: Contracts.AggregatedDataForResultTrend): number => {

            let failureRecord = datum.resultsByOutcome[Contracts.TestOutcome.Failed];
            return failureRecord ? failureRecord.count : 0;
        });

        return seriesData;
    }

    public getSeriesLabel(): string {
        return Resources.FailedTestsSeriesLabel;
    }

    protected getSeriesColor(): string {
        return Common.TestReportColorPalette.Failed;
    }
}

export class OtherTestsToCategoricalDataConverter extends BaseCategoricalDataConverter {

    protected getSeriesData(): number[] {
        let seriesData = $.map(this.getData(), (datum: Contracts.AggregatedDataForResultTrend): number => {
            let totalTests = 0, nonImpactedTests = 0; 
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

            if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy()) {
                nonImpactedTests = (datum.resultsByOutcome[Contracts.TestOutcome.NotImpacted]) ? datum.resultsByOutcome[Contracts.TestOutcome.NotImpacted].count : 0;
            }
            
            return totalTests - (passedTests + failedTests + nonImpactedTests);
        });

        return seriesData;
    }

    public getSeriesLabel(): string {
        return Resources.OtherTestsSeriesLabel;
    }

    protected getSeriesColor(): string {
        return Common.TestReportColorPalette.OtherOutcome;
    }
}

export class TotalTestsToCategoricalDataConverter extends BaseCategoricalDataConverter {

    protected getSeriesData(): number[] {
        return $.map(this.getData(), ((datum: Contracts.AggregatedDataForResultTrend): number => {
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

    public getSeriesLabel(): string {
        return Resources.TotalTestsSeriesLabel;
    }

    protected getSeriesColor(): string {
        return Common.TestReportColorPalette.TotalTests;
    }
}

export class DurationToCategoricalDataConverter extends BaseCategoricalDataConverter {

    constructor(data: Contracts.AggregatedDataForResultTrend[]) {
        super(data);
        let durations = $.map(this.getData(), (datum: Contracts.AggregatedDataForResultTrend): string => {
            return datum.duration;
        });

        this._analyzedDuration = new DurationNormalizer(durations).normalize();
    }

    protected getSeriesData(): number[] {
        return this._analyzedDuration.durationsInUnitScale;
    }

    public getSeriesLabel(): string {
        return Utils_String.localeFormat(Resources.DurationSeriesLabel, this._analyzedDuration.unit);
    }

    protected getSeriesColor(): string {
        return Common.TestReportColorPalette.Duration;
    }

    private _analyzedDuration: INormalizedDuration;
}

export interface INormalizedDuration {

    unit: string;

    durationsInUnitScale: number[];
}

export class DurationNormalizer {

    constructor(durations: string[]) {
        this._durations = durations;
    }

    public normalize(): INormalizedDuration {
        
        // If there are more than 50% entries greater than 5 hours, show duration in hours.
        let normalizedDuration = this._normalize(CommonUtils.TestReportDataParser.getDurationInHours, 5, 50);
        if (normalizedDuration[0]) {
            return {
                unit: Resources.UnitInHours,
                durationsInUnitScale: normalizedDuration[1]
            };
        }

        // If there are more than 50% entries greater than 5 minutes, show duration in minutes.
        normalizedDuration = this._normalize(CommonUtils.TestReportDataParser.getDurationInMinutes, 5, 50);
        if (normalizedDuration[0]) {
            return {
                unit: Resources.UnitInMinutes,
                durationsInUnitScale: normalizedDuration[1]
            };
        }

        // If there are more than 50% entries greater than 1 seconds, show duration in seconds.
        normalizedDuration = this._normalize(CommonUtils.TestReportDataParser.getDurationInSeconds, 1, 50);
        if (normalizedDuration[0]) {
            return {
                unit: Resources.UnitInSeconds,
                durationsInUnitScale: normalizedDuration[1]
            };
        }

        // Default is milliseconds.
        normalizedDuration = this._normalize(CommonUtils.TestReportDataParser.getDurationInMilliseconds, 0, 0);
        return {
            unit: Resources.UnitInMilliSeconds,
            durationsInUnitScale: normalizedDuration[1]
        };
    }

    private _normalize(converterFunction: (val: string) => number, threshold: number, expectedPercentEntriesExceedingThershold: number): [boolean, number[]]{

        let expectedEntriesExceedingThershold = Math.round(this._durations.length * (expectedPercentEntriesExceedingThershold / 100));
        let numValuesGreaterThanThreshold = 0;
        let normalizedDurations = $.map(this._durations, (duration: string): number => {
            let converterValue = converterFunction(duration);
            if (converterValue > threshold) {
                numValuesGreaterThanThreshold++;
            }

            return converterValue;
        });

        return [numValuesGreaterThanThreshold > expectedEntriesExceedingThershold, normalizedDurations];
    }

    private _durations: string[];
}

export class PassPercentToCategoricalDataConverter extends BaseCategoricalDataConverter {

    public getMaxValue(): number {
        return 100;
    }

    protected getSeriesData(): number[] {
        let seriesData = $.map(this.getData(), (datum: Contracts.AggregatedDataForResultTrend): number => {
            let totalTests = 0;
            let passedTests = 0;
            let nonImpactedTests = 0;

            for (let key in datum.resultsByOutcome) {
                if (datum.resultsByOutcome.hasOwnProperty(key)) {
                    let resultByOutcome = datum.resultsByOutcome[key];
                    if (resultByOutcome) {
                        totalTests += resultByOutcome.count;
                    }

                    if (parseInt(key) === Contracts.TestOutcome.Passed) {
                        passedTests = resultByOutcome.count;
                    }
                    else if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy() && parseInt(key) === Contracts.TestOutcome.NotImpacted) {
                        nonImpactedTests = resultByOutcome.count;
                    }
                }
            }

            if (totalTests !== 0) {
                let passPercentage = ((passedTests * 100) / (totalTests - nonImpactedTests));
                if (passPercentage === Math.round(passPercentage)) {
                    return passPercentage;
                }
                else {
                    return parseFloat(((passedTests * 100) / (totalTests - nonImpactedTests)).toFixed(2));
                }
            }
            else {
                return 0;
            }
        });

        return seriesData;
    }

    public getSeriesLabel(): string {
        return Resources.PassPercentageSeriesLabel;
    }

    protected getSeriesColor(): string {
        return Common.TestReportColorPalette.Passed;
    }
}

export class FailPercentToCategoricalDataConverter extends BaseCategoricalDataConverter {

    public getMaxValue(): number {
        return 100;
    }

    protected getSeriesData(): number[] {
        let seriesData = $.map(this.getData(), (datum: Contracts.AggregatedDataForResultTrend): number => {
            let totalTests = 0;
            let failedTests = 0;
            let nonImpactedTests = 0;

            for (let key in datum.resultsByOutcome) {
                if (datum.resultsByOutcome.hasOwnProperty(key)) {
                    let resultByOutcome = datum.resultsByOutcome[key];
                    if (resultByOutcome) {
                        totalTests += resultByOutcome.count;
                    }

                    if (parseInt(key) === Contracts.TestOutcome.Failed) {
                        failedTests = resultByOutcome.count;
                    }
                    else if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy() && parseInt(key) === Contracts.TestOutcome.NotImpacted) {
                        nonImpactedTests = resultByOutcome.count;
                    }
                }
            }

            if (totalTests !== 0) {
                let failPercentage = ((failedTests * 100) / (totalTests - nonImpactedTests));
                if (failPercentage === Math.round(failPercentage)) {
                    return failPercentage;
                }
                else {
                    return parseFloat(((failedTests * 100) / (totalTests - nonImpactedTests)).toFixed(2));
                }
            }
            else {
                return 0;
            }
        });

        return seriesData;
    }

    public getSeriesLabel(): string {
        return Resources.FailPercentageSeriesLabel;
    }

    protected getSeriesColor(): string {
        return Common.TestReportColorPalette.Failed;
    }
}

export class OtherPercentToCategoricalDataConverter extends BaseCategoricalDataConverter {

    public getMaxValue(): number {
        return 100;
    }

    protected getSeriesData(): number[] {
        let seriesData = $.map(this.getData(), (datum: Contracts.AggregatedDataForResultTrend): number => {
            let totalTests = 0;
            let passedTests = 0;
            let failedTests = 0;
            let nonImpactedTests = 0;

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
                    } else if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy() && parseInt(key) === Contracts.TestOutcome.NotImpacted) {
                        nonImpactedTests = resultByOutcome.count;
                    }
                }
            }

            if (totalTests !== 0) {
                let otherTests = totalTests - (passedTests + failedTests + nonImpactedTests);
                let othersPercentage = ((otherTests * 100) / (totalTests - nonImpactedTests));
                if (othersPercentage === Math.round(othersPercentage)) {
                    return othersPercentage;
                }
                else {
                    return parseFloat(((otherTests * 100) / (totalTests - nonImpactedTests)).toFixed(2));
                }
            }
            else {
                return 0;
            }
        });

        return seriesData;
    }

    public getSeriesLabel(): string {
        return Resources.OtherPercentageSeriesLabel;
    }

    protected getSeriesColor(): string {
        return Common.TestReportColorPalette.OtherOutcome;
    }
}
