/*
This is not correct way to have charts here in this file. There is already some chart related files in TestReporting/Charts.
Both code should be merged and re-factored out appropriateky rather having duplicates.
*/

import Charts_Contracts = require("Charts/Contracts");
import Charts_Controls = require("Charts/Controls");
import * as AnalyticsTypes from "TestManagement/Scripts/TestReporting/Analytics/Types";
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import { SeriesTypes, ChartTypes, DurationNormalizer } from "TestManagement/Scripts/TestReporting/Charts/ChartBase";
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");

export class TriSeriesFactory {
    public static getSeriesImplementor(seriesType: string): TriSeries {
        let series: TriSeries;

        switch (seriesType) {
            case SeriesTypes.PassPercentage:
                series = new PassPercentSeries();
                break;
            case SeriesTypes.FailPercentage:
                series = new FailPercentSeries();
                break;
            case SeriesTypes.PassedTests:
                series = new PassedTestsSeries();
                break;
            case SeriesTypes.FailedTests:
                series = new FailedTestsSeries();
                break;
            case SeriesTypes.TotalTests:
                series = new TotalTestsSeries();
                break;
            case SeriesTypes.Duration:
                series = new DurationSeries();
                break;
            case SeriesTypes.Stacked:
                series = new StackedSeries();
                break;
            default:
                throw new Error(Utils_String.format("Error: Series type {0} is not valid", seriesType));
        }

        return series;
    }
}

export class TriSeries {
    public convert(data: AnalyticsTypes.IAnalyticsChartData[]): Charts_Contracts.DataSeries[] {
        return [<Charts_Contracts.DataSeries>{
            data: this.getData(data),
            name: this.getLabel(),
            color: this.getColor()
        }];
    }

    public initialize(seriesToShow: string) {
        throw new Error("Not implemented");
    }

    public getLabel(data?: AnalyticsTypes.IAnalyticsChartData[]): string {
        throw new Error("Not implemented");
    }

    public getMinValue(): number {
        return 0;
    }

    public getMaxValue(): number {
        return null;
    }

    public getData(data: AnalyticsTypes.IAnalyticsChartData[]): number[] {
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

    public getData(data: AnalyticsTypes.IAnalyticsChartData[]): number[] {
        let seriesData = data.map((datum: AnalyticsTypes.IAnalyticsChartData): number => {
            let value: number = datum.metricValue as number;
            return value === Math.round(value) ? value : CommonUtils.TestReportDataParser.getCustomizedDecimalValue(value);
        });

        return seriesData;
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.Passed;
    }
}

export class FailPercentSeries extends PassPercentSeries {
    public getLabel(): string {
        return Resources.FailPercentageSeriesLabel;
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.Failed;
    }
}

export class PassedTestsSeries extends TriSeries {
    public getLabel(): string {
        return Resources.PassedTestsSeriesLabel;
    }

    public getData(data: AnalyticsTypes.IAnalyticsChartData[]): number[] {
        return data.map((datum: AnalyticsTypes.IAnalyticsChartData): number => {
            return datum.metricValue as number;
        });
    }

    protected getColor(): string {
        return Common.TestReportColorPalette.Passed;
    }
}

export class FailedTestsSeries extends PassedTestsSeries {
    public getLabel(): string {
        return Resources.FailedTestsSeriesLabel;
    }    

    protected getColor(): string {
        return Common.TestReportColorPalette.Failed;
    }
}

export class TotalTestsSeries extends PassedTestsSeries {
    public getLabel(): string {
        return Resources.TotalTestsSeriesLabel;
    }    

    protected getColor(): string {
        return Common.TestReportColorPalette.TotalTests;
    }
}

export class DurationSeries extends TriSeries {
    public getLabel(data?: AnalyticsTypes.IAnalyticsChartData[]): string {
        if (!this.analyzedDurationUnit) {
            this.getData(data);
        }
        return Utils_String.localeFormat(Resources.DurationSeriesLabel, this.analyzedDurationUnit);
    }

    public getData(data: AnalyticsTypes.IAnalyticsChartData[]): number[] {
        //if getLabel is called before, then data is already converted
        if (!this.analyzedDurationsInUnitScale) {
            let durations = $.map(data, (datum: AnalyticsTypes.IAnalyticsChartData): string => {
                return datum.metricValue.toString();
            });
            let analyzedDuration = new DurationNormalizer(durations).normalize();
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

export class StackedSeries extends TriSeries {

    public initialize(seriesToShow: string) {
        this._seriesToShow = seriesToShow;
    }

    public convert(data: AnalyticsTypes.IAnalyticsChartData[]): Charts_Contracts.DataSeries[] {

        let dataSeries: Charts_Contracts.DataSeries[] = [];
        let allDates: IDictionaryStringTo<boolean> = {};
        let stackByToDataMap: IDictionaryStringTo<IDictionaryStringTo<number | string>> = {};

        data.forEach((d: AnalyticsTypes.IAnalyticsChartData) => {
            //Add date to date list.
            allDates[d.date] = true;

            //Organise data by stack value
            if (!stackByToDataMap[d.stackByValue]) {
                stackByToDataMap[d.stackByValue] = {};
            }
            stackByToDataMap[d.stackByValue][d.date] = d.metricValue;
        });


        //Fill in values for stack for date not present.
        Object.keys(stackByToDataMap).map((stackBy: string) => {
            let dateAndMetricChartData: AnalyticsTypes.IAnalyticsChartData[] = [];

            //Iterate over date list and see for each date there is value for stack by. If not then add 0.
            Object.keys(allDates).forEach(d => {
                if (!stackByToDataMap[stackBy][d]) {
                    stackByToDataMap[stackBy][d] = 0;       //Assigning zero as if will work with duration and other series.
                }

                dateAndMetricChartData.push({ date: d, metricValue: stackByToDataMap[stackBy][d] } as AnalyticsTypes.IAnalyticsChartData);
            });

            //Sort by date.
            Utils_Array.sortIfNotSorted(dateAndMetricChartData, (c1, c2) => { return Utils_String.defaultComparer(c1.date, c2.date); });

            dataSeries.push(<Charts_Contracts.DataSeries>{
                data: TriSeriesFactory.getSeriesImplementor(this._seriesToShow).getData(dateAndMetricChartData),
                name: stackBy
            });
        });        

        return dataSeries;

        //return [<Charts_Contracts.DataSeries>{
        //    data: [1, 21, 3, 4, 5, 6],
        //    name: "Sample"
        //    //color: this.getColor()
        //}, <Charts_Contracts.DataSeries>{
        //    data: [11, 22, 3, 4, 5, 6],
        //    name: "Sample",
        //    //color: this.getColor()
        //}, <Charts_Contracts.DataSeries>{
        //    data: [12, 23, 3, 4, 5, 6],
        //    name: "Sample"
        //    //color: this.getColor()
        //}, <Charts_Contracts.DataSeries>{
        //    data: [13, 24, 3, 4, 5, 6],
        //    name: "Sample"
        //    //color: this.getColor()
        //}, <Charts_Contracts.DataSeries>{
        //    data: [14, 25, 3, 4, 5, 6],
        //    name: "Sample"
        //    //color: this.getColor()
        //},
        //<Charts_Contracts.DataSeries>{
        //    data: [15, 26, 3, 4, 5, 6],
        //    name: "Sample"
        //    //color: this.getColor()
        //}];
    }

    public getLabel(data?: AnalyticsTypes.IAnalyticsChartData[]): string {
        //Here data is only to analyze series unit.
        return TriSeriesFactory.getSeriesImplementor(this._seriesToShow).getLabel(data);
    }   

    private _seriesToShow: string;
}

export class ComboChart {

    public create(container: JQuery, options: AnalyticsTypes.IAnalyticsChartRenderingOptions): void {
        let chartOptions: Charts_Contracts.ChartOptions;
        let commonChartOptions: Charts_Contracts.CommonChartOptions;

        this._chartConfigOptions = options.chartConfigOptions;

        chartOptions = this._getChartOptions();
        commonChartOptions = this._getCommonChartOptions();
        commonChartOptions = $.extend({}, chartOptions, commonChartOptions);

        Charts_Controls.create(container, commonChartOptions);
    }

    protected _getChartTypes(): string[] {
        throw new Error("Needs to be implemented in the derived class.");
    }

    protected _handleClick(click: Charts_Contracts.ClickEvent) {
        throw new Error("Needs to be implemented in the derived class.");
    }

    protected _getYAxisLabel(series: TriSeries): string {
        throw new Error("Needs to be implemented in the derived class.");
    }

    protected _extractCategories(): string[] {
        throw new Error("Needs to be implemented in the derived class.");
    }

    protected _getDataSeriesForYAxis(): Charts_Contracts.DataSeries[] {
        throw new Error("Needs to be implemented in the derived class.");
    }

    protected _getDataSeriesForSecondaryYAxis(): Charts_Contracts.DataSeries[] {
        throw new Error("Needs to be implemented in the derived class.");
    }

    private _getChartOptions(): Charts_Contracts.ChartOptions {
        return <Charts_Contracts.ChartOptions>{
            hostOptions: this._getChartHostOptions(),
            suppressAnimation: false,
            //click: (click: Charts_Contracts.ClickEvent) => this._handleClick(click),
            legend: this._getLegendOptions(),
            tooltip: this._getTooltipOptions(),
            specializedOptions: <Charts_Contracts.HybridChartOptions>{
                chartTypes: this._getChartTypes(),
                includeMarkers: true
            }
        };
    }

    private _getCommonChartOptions(): Charts_Contracts.CommonChartOptions {
        this._setSeriesImplementors();
        let secondaryYAxisOptions: Charts_Contracts.AxisOptions;
        let chartType: string = Charts_Contracts.ChartTypesConstants.Hybrid;

        //Not a good way to not populate secondary chart when stacked chat used.
        switch (this._chartConfigOptions.chartType) {
            case ChartTypes.StackedColumn:                
                chartType = Charts_Contracts.ChartTypesConstants.StackedColumn;
                break;
            case ChartTypes.StackedArea:
                chartType = Charts_Contracts.ChartTypesConstants.StackedArea;
                break;
            case ChartTypes.MultiLine:
                chartType = Charts_Contracts.ChartTypesConstants.Line;          //Line chart with multiple series can plot multiple lines.
                break;
            default:
                secondaryYAxisOptions = this._getYAxisOptions(this._secondaryYAxisSeriesImplementor);
                break;
        }

        return <Charts_Contracts.CommonChartOptions>{
            xAxis: this._getXAxisOptions(),
            yAxis: this._getYAxisOptions(this._yAxisSeriesImplementor),
            series: this._getSeries(),
            yAxisSecondary: secondaryYAxisOptions,
            narrowPaddingEnabled: false,
            chartType: chartType
        };
    }

    private _getChartHostOptions(): Charts_Contracts.ChartHostOptions {
        return <Charts_Contracts.ChartHostOptions>{
            width: this._chartConfigOptions.width,
            height: this._chartConfigOptions.height
        };
    }

    private _getLegendOptions(): Charts_Contracts.LegendOptions {
        return <Charts_Contracts.LegendOptions>{
            enabled: true
        };
    }

    private _getTooltipOptions(): Charts_Contracts.TooltipOptions {
        return <Charts_Contracts.TooltipOptions>{
            enabled: true,
            onlyShowFocusedSeries: false
        };
    }

    private _getXAxisOptions(): Charts_Contracts.AxisOptions {
        return <Charts_Contracts.AxisOptions>{
            labelValues: this._extractCategories(),
            labelFormatMode: Charts_Contracts.LabelFormatModes.Textual,
            labelsEnabled: true,
            markingsEnabled: true
        };
    }

    private _getYAxisOptions(series: TriSeries): Charts_Contracts.AxisOptions {
        return <Charts_Contracts.AxisOptions>{
            allowDecimals: false,
            labelFormatMode: Charts_Contracts.LabelFormatModes.Linear,
            labelsEnabled: true,
            markingsEnabled: false,
            title: this._getYAxisLabel(series),
            min: series.getMinValue(),
            max: series.getMaxValue()
        };
    }

    private _setSeriesImplementors() {
        this._yAxisSeriesImplementor = this._getSeriesImplementor(this._chartConfigOptions.chartType, this._chartConfigOptions.yAxisOptions.seriesType);
        this._secondaryYAxisSeriesImplementor = this._getSeriesImplementor(this._chartConfigOptions.secondaryChartType, this._chartConfigOptions.secondaryYAxisOptions.seriesType);
    }

    private _getSeriesImplementor(chartType: string, seriesType: string): TriSeries {
        switch (chartType) {
            case ChartTypes.StackedColumn:
            case ChartTypes.StackedArea:
            case ChartTypes.MultiLine:
                let stackedSeries = TriSeriesFactory.getSeriesImplementor(SeriesTypes.Stacked);
                stackedSeries.initialize(seriesType);
                return stackedSeries;
            default:
                return TriSeriesFactory.getSeriesImplementor(seriesType);
        }
    }

    private _getSeries(): Charts_Contracts.DataSeries[] {
        let dataSeries: Charts_Contracts.DataSeries[] = [];
        switch (this._chartConfigOptions.chartType) {
            case ChartTypes.StackedColumn:                          //For stacked chart, secondary chart is not an option. So not populating its series.
            case ChartTypes.StackedArea:
            case ChartTypes.MultiLine: 
                return dataSeries.concat(this._getDataSeriesForYAxis());
            default:
                return dataSeries.concat(this._getDataSeriesForYAxis()).concat(this._getDataSeriesForSecondaryYAxis());
        }
        
    }


    protected _chartTypeMap: IDictionaryStringTo<[string]> = {
        [ChartTypes.Line]: [Charts_Contracts.ChartTypesConstants.Line],
        [ChartTypes.Column]: [Charts_Contracts.ChartTypesConstants.Column],
        [ChartTypes.Area]: [Charts_Contracts.ChartTypesConstants.Area]
    };

    protected _yAxisSeriesImplementor: TriSeries;
    protected _secondaryYAxisSeriesImplementor: TriSeries;
    protected _chartConfigOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions;
}

export class TrendComboChart extends ComboChart {

    public create(container: JQuery, options: AnalyticsTypes.IAnalyticsChartRenderingOptions): void {
        this._data = options.chartData;
        super.create(container, options);
    }

    //protected _handleClick(click: Charts_Contracts.ClickEvent): void {
    //    if ($.isFunction(this._chartConfigOptions.onDataClicked) && this._data[click.itemX]) {
    //        let context: Contracts.TestResultsContext = this._data[click.itemX].testResultsContext;
    //        let id: number;
    //        switch (context.contextType) {
    //            case Contracts.TestResultsContextType.Build:
    //                id = context.build.id;
    //                break;
    //            case Contracts.TestResultsContextType.Release:
    //                id = context.release.id;
    //                break;
    //            default:
    //                Diag.logError(Utils_String.format("Unsupported context type: {0}", context.contextType));
    //                return;
    //        }
    //        this._chartConfigOptions.onDataClicked(id as any, context);
    //    }
    //}

    protected _getChartTypes(): string[] {
        let returnValue: string[] = [];

        returnValue = returnValue.concat(this._chartTypeMap[this._chartConfigOptions.chartType]);

        if (this._chartConfigOptions.secondaryChartType) {
            returnValue = returnValue.concat(this._chartTypeMap[this._chartConfigOptions.secondaryChartType]);
        }

        return returnValue;
    }

    protected _getYAxisLabel(series: TriSeries): string {
        return series.getLabel(this._data.primaryChartData);
    }

    protected _extractCategories(): string[] {
        let dates: string[] = this._data.primaryChartData.map((datum: AnalyticsTypes.IAnalyticsChartData): string => {
            return datum.date;
        });

        switch (this._chartConfigOptions.chartType) {
            //There will be duplicate dates in this list. Get unique.
            case ChartTypes.StackedColumn:
            case ChartTypes.StackedArea:
            case ChartTypes.MultiLine:
                return Utils_Array.unique(dates);
            default:
                return dates;
        }        
    }

    protected _getDataSeriesForYAxis(): Charts_Contracts.DataSeries[] {
        return this._yAxisSeriesImplementor.convert(this._data.primaryChartData);
    }

    protected _getDataSeriesForSecondaryYAxis(): Charts_Contracts.DataSeries[] {
        let series: Charts_Contracts.DataSeries[] = this._secondaryYAxisSeriesImplementor.convert(this._data.secondaryChartData);
        series.forEach((s) => {
            s.useSecondaryAxis = true;
        });
        return series;
    }

    private _data: AnalyticsTypes.IAnalyticsGroupChartData;
}
