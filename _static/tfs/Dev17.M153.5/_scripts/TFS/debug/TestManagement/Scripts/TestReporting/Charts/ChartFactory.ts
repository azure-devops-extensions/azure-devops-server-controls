import Charts_Contracts = require("Charts/Contracts");
import Charts_Controls = require("Charts/Controls");

import { ChartConfigurationOptions, ChartTypes } from "TestManagement/Scripts/TestReporting/Charts/ChartBase";
import Detailed_Charts = require("TestManagement/Scripts/TestReporting/Charts/ChartBase");
import { TriSeriesFactory, TriSeries } from "TestManagement/Scripts/TestReporting/Charts/ChartSeries";
import Contracts = require("TFS/TestManagement/Contracts");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");

export enum Chart {
    Line = 0,
    Column,
    Pie,
    StackedColumn,
    TrendCombo
}

export interface IChartOptions {
    configurationOptions: ChartConfigurationOptions;
}

export interface ITrendComboChartOptions extends IChartOptions {
    data: Contracts.AggregatedDataForResultTrend[];
}

export class PieChart {
    public static create(element: JQuery, series: Charts_Contracts.DataSeries, className = ".tab-content-container") {
        let chartOptions: Charts_Contracts.ChartOptions = <Charts_Contracts.ChartOptions>{
            hostOptions: <Charts_Contracts.ChartHostOptions>{
                width: 75,
                height: 75
            },
            colorCustomizationOptions: <Charts_Contracts.ColorCustomizationOptions>{
                colorByXAxis: true
            },
            suppressAnimation: false,
            click: () => { },
            legend: <Charts_Contracts.LegendOptions>{
                enabled: false
            },
            tooltip: <Charts_Contracts.TooltipOptions>{
                enabled: false
            },
            suppressMargin: true,
            specializedOptions: <Charts_Contracts.PieChartOptions>{
                innerSize: "65%",
                showLabels: false
            }
        };

        let commonChartOptions = <Charts_Contracts.CommonChartOptions>{
            chartType: Charts_Contracts.ChartTypesConstants.Pie,
            series: [series]
        };

        commonChartOptions = $.extend({}, chartOptions, commonChartOptions);

        this._storeParentElementStyle(className, element);
        Charts_Controls.create(element, commonChartOptions);
        this._restoreParentElementStyle();
    }

    private static _storeParentElementStyle(className: string, element){
           this._parentElement = element;
           while (this._parentElement && this._parentElement.length > 0){
               if (this._parentElement.is(className)){
                   this._elementDisplayValue = this._parentElement.css("display");
                   return;
               }
               else{
                   this._parentElement = this._parentElement.parent();
               }
           }
    }

    private static _restoreParentElementStyle(){
            if (this._parentElement && this._parentElement.length > 0 && this._elementDisplayValue){
                this._parentElement.attr("style", "display: " + this._elementDisplayValue);
            }
    }

    private static _elementDisplayValue;
    private static _parentElement;
}

export class ComboChart {

    public create(container: JQuery, options: IChartOptions): void {
        let chartOptions: Charts_Contracts.ChartOptions;
        let commonChartOptions: Charts_Contracts.CommonChartOptions;

        this._chartConfigOptions = options.configurationOptions;

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

    protected _getLabel(series: TriSeries): string {
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
            click: (click: Charts_Contracts.ClickEvent) => this._handleClick(click),
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
        return <Charts_Contracts.CommonChartOptions>{
            xAxis: this._getXAxisOptions(),
            yAxis: this._getYAxisOptions(),
            series: this._getSeries(),
            yAxisSecondary: this._getSecondaryYAxisOptions(),
            narrowPaddingEnabled: false,
            chartType: Charts_Contracts.ChartTypesConstants.Hybrid
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
            labelsEnabled: false,
            markingsEnabled: true
        };
    }

    private _getYAxisOptions(series?: TriSeries): Charts_Contracts.AxisOptions {
        let seriesImplementor: TriSeries = (series) ? series : this._yAxisSeriesImplementor;

        return <Charts_Contracts.AxisOptions>{
            allowDecimals: false,
            labelFormatMode: Charts_Contracts.LabelFormatModes.Linear,
            labelsEnabled: true,
            markingsEnabled: false,
            title: this._getLabel(seriesImplementor),
            min: seriesImplementor.getMinValue(),
            max: seriesImplementor.getMaxValue()
        };
    }

    private _getSecondaryYAxisOptions(): Charts_Contracts.AxisOptions {
        return this._getYAxisOptions(this._secondaryYAxisSeriesImplementor);
    }

    private _setSeriesImplementors() {
        this._yAxisSeriesImplementor = TriSeriesFactory.getSeriesImplementor(this._chartConfigOptions.yAxisOptions.seriesType);
        this._secondaryYAxisSeriesImplementor = TriSeriesFactory.getSeriesImplementor(this._chartConfigOptions.secondaryYAxisOptions.seriesType);
    }

    private _getSeries(): Charts_Contracts.DataSeries[] {
        let dataSeries: Charts_Contracts.DataSeries[] = [];
        return dataSeries.concat(this._getDataSeriesForYAxis()).concat(this._getDataSeriesForSecondaryYAxis());
    }

    protected _chartTypeMap: IDictionaryStringTo<string[]> = {
        [ChartTypes.Line]: [Charts_Contracts.ChartTypesConstants.Line],
        [ChartTypes.Column]: [Charts_Contracts.ChartTypesConstants.Column],
        [ChartTypes.StackedColumn]: [Charts_Contracts.ChartTypesConstants.Column,
            Charts_Contracts.ChartTypesConstants.Column, Charts_Contracts.ChartTypesConstants.Column]
    };

    protected _yAxisSeriesImplementor: TriSeries;
    protected _secondaryYAxisSeriesImplementor: TriSeries;
    protected _chartConfigOptions: Detailed_Charts.ChartConfigurationOptions;
}

export class TrendComboChart extends ComboChart {

    public create(container: JQuery, options: ITrendComboChartOptions): void {
        this._data = options.data;
        super.create(container, options);
    }

    protected _handleClick(click: Charts_Contracts.ClickEvent): void {
        if ($.isFunction(this._chartConfigOptions.onDataClicked) && this._data[click.itemX]) {
            let context: Contracts.TestResultsContext = this._data[click.itemX].testResultsContext;
            let id: number;
            switch (context.contextType) {
                case Contracts.TestResultsContextType.Build:
                    id = context.build.id;
                    break;
                case Contracts.TestResultsContextType.Release:
                    id = context.release.id;
                    break;
                default:
                    Diag.logError(Utils_String.format("Unsupported context type: {0}", context.contextType));
                    return;
            }
            this._chartConfigOptions.onDataClicked(id as any, context);
        }
    }
    
    protected _getChartTypes(): string[] {
        let returnValue: string[] = [];

        returnValue = returnValue.concat(this._chartTypeMap[this._chartConfigOptions.chartType]);

        if (this._chartConfigOptions.secondaryChartType) {
            returnValue = returnValue.concat(this._chartTypeMap[this._chartConfigOptions.secondaryChartType]);
        }

        return returnValue;
    }

    protected _getLabel(series: TriSeries): string {
        return series.getLabel(this._data);
    }

    protected _extractCategories(): string[] {
        let categories = $.map(this._data, (datum: Contracts.AggregatedDataForResultTrend): string => {
            if (datum.testResultsContext.build) {
                return datum.testResultsContext.build.number;
            }
            else if (datum.testResultsContext.release) {
                return datum.testResultsContext.release.name;
            }
        });
        return categories;
    }

    protected _getDataSeriesForYAxis(): Charts_Contracts.DataSeries[] {
        return this._yAxisSeriesImplementor.convert(this._data);
    }

    protected _getDataSeriesForSecondaryYAxis(): Charts_Contracts.DataSeries[] {
        let series: Charts_Contracts.DataSeries[] = this._secondaryYAxisSeriesImplementor.convert(this._data);
        series.forEach((s) => {
            s.useSecondaryAxis = true;
        });
        return series;
    }

    private _data: Contracts.AggregatedDataForResultTrend[];
 }

export class ChartFactory {
    public static create(chart: Chart, container: JQuery, options: IChartOptions): void {
        switch (chart) {
            case Chart.TrendCombo:
                new TrendComboChart().create(container, <ITrendComboChartOptions>options);
                break;
            case Chart.Pie:
                break;
            default:
                throw new Error(Utils_String.format("Chart '{0}' not yet supported.", Chart[chart]));
        }
    }
}


export class ColumnLine {
    private yAxisSeriesImplementor: TriSeries;
    private secondaryYAxisSeriesImplementor: TriSeries;
    private chartConfigOptions: Detailed_Charts.ChartConfigurationOptions;
    private data: Contracts.AggregatedDataForResultTrend[];
    
    public create(element: JQuery, chartConfigOptions: Detailed_Charts.ChartConfigurationOptions, data: Contracts.AggregatedDataForResultTrend[]) {
        this.chartConfigOptions = chartConfigOptions;
        this.data = data;

        let chartOptions: Charts_Contracts.ChartOptions = this._getChartOptions();
        let commonChartOptions: Charts_Contracts.CommonChartOptions = this._getCommonChartOptions();

        commonChartOptions = $.extend({}, chartOptions, commonChartOptions);

        Charts_Controls.create(element, commonChartOptions);
    }

    public _getChartOptions(): Charts_Contracts.ChartOptions {
        return <Charts_Contracts.ChartOptions>{
            hostOptions: this._getChartHostOptions(),
            suppressAnimation: false,
            click: (click: Charts_Contracts.ClickEvent) => this._handleClick(click),
            legend: this._getLegendOptions(),
            tooltip: this._getTooltipOptions(),
            specializedOptions: <Charts_Contracts.LineChartOptions>{
                includeMarkers: true
            }
        };
    }

    public _handleClick(click: Charts_Contracts.ClickEvent) {
        if ($.isFunction(this.chartConfigOptions.onDataClicked)) {
            let buildId = this.data[click.itemX].testResultsContext.build.id;
            this.chartConfigOptions.onDataClicked(buildId as any);
        }
    }

    public _getCommonChartOptions(): Charts_Contracts.CommonChartOptions {
        this._setSeriesImplementors();
        return <Charts_Contracts.CommonChartOptions>{
            xAxis: this._getXAxisOptions(),
            yAxis: this._getYAxisOptions(),
            series: this._getSeries(),
            yAxisSecondary: this._getSecondaryYAxisOptions(),
            narrowPaddingEnabled: false,
            chartType: this._getChartType()
        };
    }

    public _getChartHostOptions(): Charts_Contracts.ChartHostOptions {
        return <Charts_Contracts.ChartHostOptions>{
            width: this.chartConfigOptions.width,
            height: this.chartConfigOptions.height
        };
    }

    public _getLegendOptions(): Charts_Contracts.LegendOptions {
        return <Charts_Contracts.LegendOptions>{
            enabled: true
        };
    }

    public _getTooltipOptions(): Charts_Contracts.TooltipOptions {
        return <Charts_Contracts.TooltipOptions>{
            enabled: true,
            onlyShowFocusedSeries: false
        };
    }

    public _getXAxisOptions(): Charts_Contracts.AxisOptions {
        return <Charts_Contracts.AxisOptions>{
            labelValues: this._extractCategories(),
            labelFormatMode: Charts_Contracts.LabelFormatModes.Textual,
            labelsEnabled: false,
            markingsEnabled: true
        };
    }

    public _getYAxisOptions(): Charts_Contracts.AxisOptions {
        return this._getAxisOptions(this.yAxisSeriesImplementor);
    }

    public _getSecondaryYAxisOptions(): Charts_Contracts.AxisOptions {
        return this._getAxisOptions(this.secondaryYAxisSeriesImplementor);
    }

    public _getAxisOptions(series: TriSeries): Charts_Contracts.AxisOptions {
        return <Charts_Contracts.AxisOptions>{
            allowDecimals: false,
            labelFormatMode: Charts_Contracts.LabelFormatModes.Linear,
            labelsEnabled: true,
            markingsEnabled: false,
            title: series.getLabel(this.data),
            min: series.getMinValue(),
            max: series.getMaxValue()
        };
    }

    //test?
    public _setSeriesImplementors() {
        this.yAxisSeriesImplementor = TriSeriesFactory.getSeriesImplementor(this.chartConfigOptions.yAxisOptions.seriesType);
        this.secondaryYAxisSeriesImplementor = TriSeriesFactory.getSeriesImplementor(this.chartConfigOptions.secondaryYAxisOptions.seriesType);
    }

    public _getSeries(): Charts_Contracts.DataSeries[] {
        let dataSeries: Charts_Contracts.DataSeries[] = [];
        return dataSeries.concat(this._getDataSeriesForYAxis()).concat(this._getDataSeriesForSecondaryYAxis());
    }

    public _getChartType(): string {
        return Charts_Contracts.ChartTypesConstants.ColumnLine;
    }

    public _extractCategories(): string[] {
        let categories = $.map(this.data, (datum: Contracts.AggregatedDataForResultTrend): string => {
            if (datum.testResultsContext.build) {
                return datum.testResultsContext.build.number;
            }
            else if (datum.testResultsContext.release) {
                return datum.testResultsContext.release.name;
            }
        });
        return categories;
    }

    public _getDataSeriesForYAxis(): Charts_Contracts.DataSeries[] {
        return this.yAxisSeriesImplementor.convert(this.data);
    }

    public _getDataSeriesForSecondaryYAxis(): Charts_Contracts.DataSeries[] {
        let series: Charts_Contracts.DataSeries[] = this.secondaryYAxisSeriesImplementor.convert(this.data);
        series.forEach((s) => {
            s.useSecondaryAxis = true;
        });
        return series;
    }

    /**
     * For testing purpose only
     * @param chartConfigOptions
     * @param data
     */
    public _initialize(chartConfigOptions: Detailed_Charts.ChartConfigurationOptions,
            data: Contracts.AggregatedDataForResultTrend[],
            yAxisSeriesImplementor: TriSeries,
            secondaryYAxisSeriesImplementor: TriSeries
        ) {
        this.chartConfigOptions = chartConfigOptions;
        this.data = data;
        this.yAxisSeriesImplementor = yAxisSeriesImplementor;
        this.secondaryYAxisSeriesImplementor = secondaryYAxisSeriesImplementor;
    }
}
