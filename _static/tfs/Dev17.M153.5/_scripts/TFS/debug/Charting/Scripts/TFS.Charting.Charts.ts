///<summary>Charting.Charts is responsible for Presentation of Chart Visuals.
/// Chart Controls can be hosted outside of Editor and Hosts, and must not have dependencies on either.
/// Consumer specific interactivity to be supported through an event handling contract which consumers can opt into using.
///</summary >

/// <reference types="jquery" />

import * as VSS from "VSS/VSS";
import * as VSS_Diag from "VSS/Diag";
import * as VSS_Context from "VSS/Context";
import * as LWP from "VSS/LWP";
import * as VSS_Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Utils_UI from "VSS/Utils/UI";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Culture from "VSS/Utils/Culture";
import * as Date_Utils from "VSS/Utils/Date";
import * as Diag from "VSS/Diag";
import * as DataServices from "Charting/Scripts/TFS.Charting.DataServices";
import * as Controls from "VSS/Controls";
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import * as Controls_StatusIndicator from "VSS/Controls/StatusIndicator";

import * as Charting from "Charting/Scripts/TFS.Charting";
import * as Charting_Color from "Charting/Scripts/TFS.Charting.Color";
import {EmptyChartHelper} from "Charting/Scripts/EmptyChartHelper";

import * as Chart_Contracts from "Charts/Contracts";
import * as Chart_Controls from "Charts/Controls";
import {ChartLimiter} from "Charting/Scripts/ChartLimiter";

var delegate = Utils_Core.delegate;
var getErrorMessage = VSS.getErrorMessage;
var PublishCIData = true;

export interface IChartState {
    configuration: DataServices.IChartConfiguration;
    results: DataServices.IDataTable;
    width?: number;
    height?: number;

    /**Hint for rendering with reduced labelling/legend capabilities */
    useCompactRenderMode?: boolean;
    suppressTitle?: boolean;
}

export class ChartGroup {
    public static current: string = "Current";
    public static historical: string = "Historical";
}

export class ChartTypes {
    public static pieChart: string = "PieChart";
    public static barChart: string = "BarChart";
    public static stackBarChart: string = "stackBarChart";
    public static columnChart: string = "ColumnChart";
    public static pivotTable: string = "PivotTable";
    public static stackAreaChart: string = "StackAreaChart";
    public static areaChart: string = "AreaChart";
    public static lineChart: string = "LineChart";

    public static makeChartTypeMap() {
        var chartMap = {};
        chartMap[ChartTypes.barChart] = BarChart;
        chartMap[ChartTypes.pieChart] = PieChart;
        chartMap[ChartTypes.columnChart] = ColumnChart;
        chartMap[ChartTypes.stackBarChart] = StackedBarChart;
        chartMap[ChartTypes.pivotTable] = PivotTable;
        chartMap[ChartTypes.stackAreaChart] = StackAreaChart;
        chartMap[ChartTypes.areaChart] = AreaChart;
        chartMap[ChartTypes.lineChart] = LineChart;

        return chartMap;
    }
}

export class ChartConstants {
    public static oneDimensionalToken: string = "oneDimensional";
    public static keyName: string = "key";
    public static valueName: string = "value";
}

/** A strongly typed definition of the Chart options payload for Lightweight Chart Controls. */
export interface LightweightChartOptions extends Controls.EnhancementOptions {
    /**Desired width of Chart control. */
    width?: number;
    /**Desired height of Chart control. */
    height?: number;

    /**Hint for rendering with reduced labelling/legend capabilities */
    useCompactRenderMode?: boolean;

    /**A color management object describing how to color a chart. */
    colorDictionary?: Chart_Contracts.ColorDictionary;

    /** Metadata about the chart. */
    transformOptions?: DataServices.ITransformOptions;

    /**Indicates if the chart is being used for an edit scenario.
   In this context, animations can be omitted. */
    editModeActive?: boolean;

    /** Optional parameter to specify a click handler.
     * If null/undefined, no-op. */
    onClick?: (openInNewWindow: boolean) => void;

    /** Optional parameter to specify a click handler.
     * If null/undefined, no-op. */
    onLegendClick?: () => void;

    /**
     * Additional contextual description appended to ChartingResources.EmptyChart_AltTextFormat when showing empty chart
     */
    altTextExtraDescription ?: string;

    /** Title of the chart for aria-labels. Not used for UI presentation. */
    accessibleTitle?: string;
};

export class LightweightChartBase extends Controls.Control<LightweightChartOptions>
    implements Charting_Color.IColorPickableChart {
    public static _statusIconClass: string = "status-progress";
    public static _warningIconClass: string = "icon-warning";
    public static _errorIconClass: string = "icon-tfs-build-status-failed"; //Yes, this is correct icon to use here.
    public static defaultWidth: number = 312;
    public static defaultHeight: number = 286;

    private _dataset: DataServices.IDataTableData[];
    private _isResultEmpty: boolean;
    private _message: string;
    private _messageIconclass: string;
    private _colorDictionary: Chart_Contracts.ColorDictionary;
    private _transformOptions: DataServices.ITransformOptions;
    private _sdkChart: Chart_Controls.ChartControlInternal;

    //List of last used elements for coloring the chart.
    protected coloringNames: string[];

    constructor(options?: LightweightChartOptions) {
        /// <param name="options" type="Object">Control options.</param>
        super(options);
    }

    public dispose(): void {
        if (this._sdkChart) {
            this._sdkChart.dispose();
            this._sdkChart = null;
        }
        super.dispose();
    }

    public initializeOptions(options?: LightweightChartOptions) {
        /// <param name="options" type="any" />

        super.initializeOptions($.extend({
            width: LightweightChartBase.defaultWidth,
            height: LightweightChartBase.defaultHeight
        }, options));
        this.setColorDictionary(this._options.colorDictionary);
    }

    public initialize() {
        super.initialize();
        if (this._options.transformOptions) {
            this.setTransformOptions(this._options.transformOptions);
        }
        this.getElement()
            .addClass("chart-instance unselectable")
            .addClass("chartpin");
        this._onUpdate();
    }

    public render() {
        var options = $.extend({
            seriesThreshold: this.getSeriesLimit(),
            groupByThreshold: this.getGroupByLimit()
        }, this._options);
        var renderData: TabularRenderData = new TabularRenderData(options, this.getDataset());

        this.clear();
        if (renderData.isReady()) {
            this.renderSDKChart(renderData);
        } else {
            this.setMessage(renderData.getUnreadyReason(), renderData.getUnreadyIcon(), renderData.isResultEmpty);
        }

        this.markTestInfo(renderData);
    }

    public getDataset(): DataServices.IDataTableData[] {
        return this._dataset;
    }

    /** Returns the *visible* set of items in the legend for this chart.*/
    public getColoringItems(): string[] {
        return this.coloringNames;
    }

    public setMessage(message: string, messageIconclass: string, isResultEmpty?: boolean) {
        ///<summary>Set the supplied textual message, but do not render it..</summary>
        this._message = message;
        this._messageIconclass = messageIconclass;
        this._isResultEmpty = isResultEmpty;
    }

    public displayMessage(message: string, messageIconclass: string) {
        ///<summary>Display the supplied textual message.</summary>
        this.setMessage(message, messageIconclass);

        this._onUpdate();
    }

    public clear() {
        ///<summary>Clear the visual state of the control</summary>
        this._element.empty();
        this.coloringNames = [];
    }

    public getLayoutContainer(): JQuery {
        ///<summary>Get the html layout container if you need to get out of SVG</summary>
        return this._element.children(".layout-container");
    }

    public setDataset(dataset: DataServices.IDataTableData[]) {
        ///<summary>Applies the specified dataset as input for the chart. Clears any prior message text.</summary>
        this._dataset = dataset;
        this.setMessage(null, null);
        this._onUpdate();
    }

    public setTransformOptions(transformOptions: DataServices.ITransformOptions) {
        this._transformOptions = transformOptions;
    }

    public getTransformOptions() {
        return this._transformOptions;
    }

    public repaintOnColorChange() {
        this._onUpdate();
    }

    public hasValidChart(): boolean {
        ///<summary>Indicates that there are no messages, and we do have data.
        /// A chart in this state has been successfully rendered.< / summary>
        return (this._message === null || typeof this._message === "undefined")
            && (this._dataset !== null && typeof this._dataset !== "undefined");
    }

    public isResultEmpty(): boolean {
        return this._isResultEmpty;
    }

    private _renderMessage() {
        if (this._isResultEmpty) {
            EmptyChartHelper.showEmptyChartMessage(this._element, this._getEmptyDataSetImageNumber(), this._options.altTextExtraDescription, this._options.onClick);
        }
        else {
            var statusControl = <Controls_StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(Controls_StatusIndicator.StatusIndicator,
                this._element, { center: true, imageClass: this._messageIconclass, message: this._message });
            statusControl.start();
        }
    }

    /**
     * Select an empty charting using the transformOption
     * we don't want the chart keep changinging on each key stroke on the chart live preview with title.
     * So, this would make it only change when user making configuraiton changes
     */
    public _getEmptyDataSetImageNumber(): number {
        var key = (new Date()).getHours();

        if (this._transformOptions) {
            key += JSON.stringify(this._transformOptions).length;
        }
        return key;
    }

    private _onUpdate() {
        ///<Summary>Render the current chart or informational message based on the current state.</Summary>
        Diag.logTracePoint("ChartBase._onUpdate.start");
        this._element.empty();

        //any messages take precedence over rendering
        if (this._message) {
            this._renderMessage()
        } else if (this._dataset) {
            try {
                this.render();

                if (this._message) {
                    this._element.empty();
                    this._renderMessage()
                }
            } catch (ex) {
                this._element.empty();
                if (this._doesNotHaveChartPrereqs()) {
                    this.setMessage(Resources.ChartMessage_UnsupportedBrowser, LightweightChartBase._errorIconClass);
                } else {
                    this.setMessage(Resources.ChartMessage_RenderFailed, LightweightChartBase._errorIconClass);
                }

                this._renderMessage();
                VSS_Diag.logError(ex);
            }
        }
        Diag.logTracePoint("ChartBase._onUpdate.end");
    }

    public markTestInfo(renderData: ChartCommonData) {
        ///<summary>Applies html class information to control for exposing state info which is only intended for test/verification purposes.</summary>
        var testClasses = renderData.getTestClasses();

        for (var key in testClasses) {
            this._element.toggleClass(key, testClasses[key]);
        }
    }

    private _doesNotHaveChartPrereqs(): Boolean {
        ///<summary>A number of modern browser capabilities are required for Client side chart rendering, including SVG and JS api's.
        /// This check allows for explaining to the user why we are unable to render (in the case of a legacy browser).
        ///</ summary>
        return Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE8();
    }

    public getColorPair(renderData: TabularRenderData, i: number, j: number): Chart_Contracts.ColorPair {
        if (renderData.useSeriesColoring()) {
            return this.getColorDictionary().getColorPair(renderData.seriesNames[i], i, this.usesSubduedPalette());
        } else {
            return this.getColorDictionary().getColorPair(renderData.groupNames[j], j, this.usesSubduedPalette());
        }
    }

    public getColorDictionary(): Chart_Contracts.ColorDictionary {
        return this._colorDictionary;
    }

    public setColorDictionary(colorDictionary: Chart_Contracts.ColorDictionary) {
        this._colorDictionary = colorDictionary;
    }

    //--------------------------- Everything below this line is for legacy conversion-----------------/
    // After we have moved to highcharts, LW charting stack will be substantially refactored to remove D3 render implementation
    // A minimal set of existing non-UI data model/conversion support as required by remaining code, based on what still needs to be present.

    protected getChartType(): string {
        throw Error("Not implemented");
    }

    public usesSubduedPalette(): boolean { return false; }

    protected isTrendChart(): boolean {
        return false;
    }

    /**
     * TODO: Express this as an atomic operation which produces all limits, and consumes size + if legend is in use
     * Each chart will need their own call to the limiter.
     */
    public getGroupByLimit(): number {
        return ChartLimiter.defaultGroupByLimit;
    }

    public getSeriesLimit(): number {
        return ChartLimiter.defaultSeriesLimit;
    }



    /**
     *  Convert legacy Dataset content into common DataSeries format
     */
    protected formatSeries(renderData: TabularRenderData): Chart_Contracts.DataSeries[] {
        var series = [];
        if (renderData.isOneDimensional()) {
            series = [{
                data: renderData.seriesValues.map((value, i) => {
                    return value[0];
                })
            }];
        } else {
            series = renderData.seriesNames.map((name: string, i: number) => {
                return {
                    name: name,
                    data: renderData.seriesValues[i]
                }
            });
        }
        return series;
    }

    /**
     *  Convert legacy Dataset content into common DataSeries format
     */
    protected formatCategories(renderData: TabularRenderData): string[] {
        var categoryNames = [];
        if (renderData.isOneDimensional()) {
            categoryNames = renderData.seriesNames;
        } else {
            categoryNames = renderData.groupNames;
        }

        if (this.isTrendChart()) {
            var dateFormat = Utils_Culture.getDateTimeFormat().ShortDatePattern;
            var dateCategories = categoryNames.map((dateValue: string, index: number) => {
                return Date_Utils.parseDateString(dateValue, dateFormat);
            });

            //Pass the converted categories if all were gracefully parsed.
            //If there were any inaccuracies with conversion(e.g. user changed format in another browser), our active format disagrees with server, and original short-form dates should be used.
            if (dateCategories.every((dateValue: Date) => { return dateValue != null; })) {
                categoryNames = dateCategories;
            }

        }
        return categoryNames;
    }

    protected handleClick(clickEvent: Chart_Contracts.ClickEvent, renderData: TabularRenderData) {
        if ($.isFunction(this._options.onClick)) {
            const middleButton = 2;
            const openInNewWindow = clickEvent.ctrlKey || clickEvent.button == middleButton;
            this._options.onClick(openInNewWindow);
        }
    }

    protected handleLegendClick(legendClickEvent: Chart_Contracts.LegendClickEvent) {
        if ($.isFunction(this._options.onLegendClick)) {
            this._options.onLegendClick();
        }

        // Returning false supresses default behavior. Hide this from the consuming handler for now.
        return true;
    }

    protected formatChartOptions(renderData: TabularRenderData): Chart_Contracts.CommonChartOptions {
        var chartOptions: Chart_Contracts.CommonChartOptions = {
            suppressAnimation: this._options.editModeActive,
            hostOptions: {
                width: this._options.width,
                height: this._options.height
            },
            chartType: this.getChartType(),
            colorCustomizationOptions: {
                colorDictionary: this.getColorDictionary(),
                useSubduedPalette: this.usesSubduedPalette()
            },
            series: this.formatSeries(renderData),
            yAxis: { allowDecimals: false },
            xAxis: { labelValues: this.formatCategories(renderData) },
            legendClick: (legendClickEvent: Chart_Contracts.LegendClickEvent) => {
                return this.handleLegendClick(legendClickEvent);
            },
            tooltip: {
                enabled: true,
                onlyShowFocusedSeries: true
            },
            legend: {
                limitLabelSize: true
            },
            title: this._options.accessibleTitle
        };

        /**
         * handleClick needs one of these two parameters to have any functional experience:
         * colorPicker - Used for the legacy chart editor dialog scenario
         * onClick - handler from the chart host. should be null if the destination page is unavailable.
         */
        if (this._options.onClick != null) {
            chartOptions.click = (clickEvent: Chart_Contracts.ClickEvent) => {
                this.handleClick(clickEvent, renderData);
            };
        }

        if (this.isTrendChart()) {
            chartOptions.xAxis.labelFormatMode = Chart_Contracts.LabelFormatModes.DateTime_DayInMonth;
        }
        if (this._options.useCompactRenderMode) {
            chartOptions.legend.enabled = false;
        }
        return chartOptions;
    }

    public renderSDKChart(renderData: TabularRenderData) {
        var chartOptions = this.formatChartOptions(renderData);
        this._sdkChart = <Chart_Controls.ChartControlInternal>Chart_Controls.create(this.getElement(), chartOptions);
        this.coloringNames = this._sdkChart.getColoringNames();
    }

}

export interface ChartCommonDataOptions {
    width?: number;
    height?: number;
}

export class ChartCommonData {
    ///<summary>Describes a minimal contract of Chart data</summary>
    constructor(options: ChartCommonDataOptions) {
        this._isReady = true;
        this.isResultEmpty = false;
        this._unreadyReason = null;
        this._unreadyIcon = null;

        if (options.width && options.height) {
            this.width = options.width;
            this.height = options.height;
        } else {
            this.markUnready(Resources.ChartSizeMissingMessage);
        }

    }

    public isReady(): Boolean {
        return this._isReady;
    }

    public getUnreadyReason(): string {
        return this._unreadyReason;
    }

    public getUnreadyIcon(): string {
        if (!this._unreadyIcon) {
            this._unreadyIcon = LightweightChartBase._errorIconClass;
        }

        return this._unreadyIcon;
    }

    public markUnready(unreadyReason?: string, unreadyIcon?: string) {
        ///<summary>Marks the data set as unready. The error icon will be used by default if no icon name is specified.</summary>
        this._isReady = false;
        this._unreadyReason = unreadyReason;
        this._unreadyIcon = unreadyIcon;
    }

    public getTestClasses(): Object {
        return {};
    }

    ///<summary>True if query result is empty. If query is not defined or result is not empty, returns false.</summary>
    public isResultEmpty: boolean;
    public width: number;
    public height: number;
    public _isReady: boolean;
    public _unreadyReason: string;
    public _unreadyIcon: string;
}

export interface TabularRenderDataOptions extends ChartCommonDataOptions {
    seriesThreshold?: number;
    groupByThreshold?: number;
    transpose?: boolean;
    useSeriesColoring?: boolean;
}

export class TabularRenderData extends ChartCommonData {
    ///<summary>Tabular Render data operates on expectation of a complete (non-sparse) set of consistently sized series elements which form a rectangular table in Row Major order.
    /// Series  === Each series corresponds to a Row
    /// GroupBy === Each groupBy value corresponds to Columns within the rows
    ///</summary >
    private static _otherKey: string = Resources.ChartsRemainingItems;

    private _maxSeriesCount: number;
    private _maxGroupCount: number;

    private _seriesHasOtherItem: boolean = false;
    private _groupHasOtherItem: boolean = false;

    constructor(options: TabularRenderDataOptions, dataset: DataServices.IDataTableData[]) {
        super(options);
        var useSparseLookup = true;
        if (this.isReady()) {
            if (dataset && dataset.length > 0 && String(dataset[0].value).length > 0) {
                this._maxSeriesCount = (options && options.seriesThreshold) ? options.seriesThreshold : ChartLimiter.defaultSeriesLimit;
                this._maxGroupCount = (options && options.groupByThreshold) ? options.groupByThreshold : ChartLimiter.defaultGroupByLimit;
                dataset = TabularRenderData._transposeIfOneDimensional(dataset);
                if (options.transpose) {
                    dataset = TabularRenderData._transpose(dataset);
                }

                this._useSeriesColoring = options.useSeriesColoring;

                this._prepareNames(dataset);
                this._prepareValues(dataset);
                this._prepareTotals(dataset);

                if (PublishCIData) {
                    DataServices.ChartTelemetry.OnModelReady(dataset);
                    PublishCIData = false;
                }
            } else {
                this.isResultEmpty = true;
                this.markUnready(Resources.ChartMessage_NoDataToDisplay_Body);
            }
        }
    }

    private _getSeriesNames(dataset: DataServices.IDataTableData[]): string[] {
        ///<summary>Get the series key names. </summary>

        return this.getNames(dataset, this._maxSeriesCount, true);
    }

    private _getGroupNames(dataset: DataServices.IDataTableData[]): string[] {
        ///<summary>Get the group key names from the first series. If the other rows have different sizes or orderings, the data will be malformed.</summary>

        return this.getNames(dataset[0].value, this._maxGroupCount, false);
    }

    private getNames(dataset: any, threshold: number, seriesType: boolean): string[] {
        ///<summary>Get the series/group key names. </summary>

        var names = [];
        for (var i = 0; i < dataset.length; i++) {
            if (i < threshold || (i === threshold && i === dataset.length - 1)) {
                names[i] = TabularRenderData.cleanKey(dataset[i].key);
            } else if (i === threshold) {
                names[i] = TabularRenderData.cleanKey(TabularRenderData._otherKey);
                seriesType ? this._seriesHasOtherItem = true : this._groupHasOtherItem = true;
            }
        }
        return names;
    }

    private _prepareNames(dataset: DataServices.IDataTableData[]) {
        this.seriesNames = this._getSeriesNames(dataset);
        this.groupNames = this._getGroupNames(dataset);
    }

    private _prepareValues(dataset: DataServices.IDataTableData[]) {
        var i, j, targetRow = 0;
        this.seriesValues = new Array<number[]>();

        for (i = 0; i < dataset.length; i++) {
            if (i <= this._maxSeriesCount) {
                this.seriesValues[i] = new Array<number>();
                targetRow = i;
                // Initialize each element
                for (j = 0; j < this.groupNames.length; j++) {
                    this.seriesValues[targetRow][j] = 0;
                }
            }
            else {
                targetRow = this._maxSeriesCount;
            }

            for (j = 0; j < dataset[i].value.length; j++) {
                var targetColumn: number = (j < this._maxGroupCount) ? j : this._maxGroupCount,
                    entry: number = dataset[i].value[j].value;
                this.seriesValues[targetRow][targetColumn] += entry;
            }
        }
    }

    private _prepareTotals(dataset: DataServices.IDataTableData[]) {
        ///<summary>Calculate the total values for the charts.</summary>
        var i, j;

        this.seriesTotals = new Array();
        this.groupTotals = new Array();
        this.maxValue = 0;

        var rows = this.seriesNames.length;
        var cols = this.groupNames.length;

        for (j = 0; j < cols; j++) {
            this.groupTotals[j] = 0
        }

        for (i = 0; i < rows; i++) {
            for (j = 0; j < cols; j++) {
                var sample = this.seriesValues[i][j];
                this.groupTotals[j] += sample;
                this.maxValue = Math.max(sample, this.maxValue);
            }

            this.seriesTotals[i] = this.seriesValues[i].reduce(function (a, b) {
                return a + b;
            }, 0);
        }
        this.grandTotal = this.seriesTotals.reduce(function (a, b) {
            return a + b;
        }, 0);
    }

    public isOneDimensional(): boolean {
        ///<Summary>Indicates if this table is intended for use as a single dimensional set.
        /// Note: a data set with a single column can still be rendered as if it were multi-dimensional.< / Summary >
        if (this.groupNames && this.groupNames.length > 0) {
            return this.groupNames[0] === ChartConstants.oneDimensionalToken;
        } else {
            return true;
        }
    }

    /**Exposes the names of elements used for coloring the chart */
    public getColoringDimensionNames(): string[] {
        return this.useSeriesColoring() ? this.seriesNames : this.groupNames;
    }

    public useSeriesColoring(): boolean {
        return this.isOneDimensional() || this._useSeriesColoring;
    }

    public getTestClasses(): Object {
        var classes = super.getTestClasses();
        classes["one-dimensional"] = this.isOneDimensional();
        return classes;
    }

    private static _transposeIfOneDimensional(dataset: DataServices.IDataTableData[]): DataServices.IDataTableData[] {
        ///<summary>Transpose it to a sequence of single valued series</summary>
        if (dataset.length === 1 && dataset[0].key === ChartConstants.oneDimensionalToken) {

            var replacement: DataServices.IDataTableData[] = [],
                series: DataServices.IDataTableKVP[] = dataset[0].value;
            for (var i = 0, l = series.length; i < l; i++) {
                replacement[i] = {
                    key: series[i].key, value: [{
                        key: ChartConstants.oneDimensionalToken,
                        value: series[i].value
                    }]
                }
            }
            return replacement;
        } else {
            return dataset;
        }
    }

    private static _transpose(dataset: DataServices.IDataTableData[]): DataServices.IDataTableData[] {
        var replacement: DataServices.IDataTableData[] = [],
            replacementSeries: DataServices.IDataTableKVP[];
        for (var i = 0, l = dataset[0].value.length; i < l; i++) { //Group Field
            replacementSeries = [];

            for (var j = 0, m = dataset.length; j < m; j++) { //Date

                replacementSeries[j] = {
                    key: dataset[j].key,
                    value: dataset[j].value[i].value
                };
            }

            replacement[i] = {
                key: dataset[0].value[i].key,
                value: replacementSeries
            };
        }
        return replacement;
    }

    public static cleanKey(keyName: string): string {
        ///<summary>Present the supplied key name in a user friendly fashion</summary>
        var serverNullKey = "[NULL]";
        return (keyName !== null
            && typeof keyName !== "undefined"
            && keyName !== serverNullKey
            && keyName !== "NULL") ? keyName : Resources.ChartDataNullValueLabel;
    }

    public width: number;
    public height: number;

    public seriesNames: string[];
    public groupNames: string[];
    public seriesTotals: number[];
    public seriesValues: any[];
    public groupTotals: number[];
    public grandTotal: number;
    public maxValue: number;

    private _useSeriesColoring: boolean;
}

export class PieChart extends LightweightChartBase {

    protected getChartType(): string {
        return Chart_Contracts.ChartTypesConstants.Pie;
    }

    protected formatChartOptions(renderData: TabularRenderData): Chart_Contracts.CommonChartOptions {
        var options = super.formatChartOptions(renderData);
        var minDimension = Math.min(this._options.width, this._options.height);
        var legendOffset = 120;

        options.legend.rightAlign = this.isRightAligned();

        var verticalCenter;
        var diameter;
        if (this.isRightAligned()) {
            diameter = Math.min(Math.floor(minDimension * 0.94), this._options.width - ChartLimiter.reservedHorzontalSpaceForLegend).toString();
            verticalCenter = Math.floor((this._options.height) / 2) - 40;
        } else {
            diameter = Math.min(Math.floor(minDimension * 0.8), this._options.height - (ChartLimiter.defaultLegendHeight+ 20)).toString();
            verticalCenter = Math.floor((this._options.height - legendOffset) / 2);
        }
        var showLabels = true;

        if (this._options.useCompactRenderMode) {
            diameter = Math.floor(minDimension * 0.94);
            showLabels = false;
            verticalCenter = null;
        }

        options.specializedOptions = <Chart_Contracts.PieChartOptions>{
            showLabels: showLabels,

            //Visual Consistency Note: The legends use variable space, depending on # of  rendered elements.
            // The Pies themselves should always be the same size (for a given widget size), to not drive users to frustration when adjacent.
            // Center the pies horizontally, and always offset vertically at a fixed position.
            size: diameter,
            center: [null, verticalCenter],  //horizontal center, 80 px vertical offset. This looks good, for 1-3 rows on a 2*2 widget. See above for more context.
        };
        return options;
    }

    public getSeriesLimit(): number {
        var limit: number;
        if (this._options.useCompactRenderMode) {
            limit = 10000;
        } else if (this.isRightAligned()) {
            limit = ChartLimiter.getVerticalLegendElements(this._options.height);
        } else {
            limit = ChartLimiter.getHorizontalLegendElements(this._options.width);
        }
        return limit;
    }

    /** Indicates if chart Widget is in a landscape POV */
    public isRightAligned(): boolean {
        var titleOffset = 40;
        return (this._options.width > (this._options.height + titleOffset));
    }

}

export class ColumnChart extends LightweightChartBase {
    protected getChartType(): string { return Chart_Contracts.ChartTypesConstants.Column; }
    public getSeriesLimit(): number { return ChartLimiter.getAllowedColumns(this._options.width); }
}

export class BarChart extends LightweightChartBase {
    protected getChartType(): string { return Chart_Contracts.ChartTypesConstants.Bar; }
    public getSeriesLimit(): number { return ChartLimiter.getAllowedRows(this._options.height); }

    protected formatSeries(renderData: TabularRenderData): Chart_Contracts.DataSeries[] {
        var resultSeries = [];
        if (renderData.isOneDimensional()) {
            resultSeries = super.formatSeries(renderData);
        }
        else {
            var i, j;
            //Fill Down each of the Columns
            for (j = 0; j < renderData.groupNames.length; j++) {
                var columnData = [];
                for (i = 0; i < renderData.seriesNames.length; i++) {

                    columnData.push(renderData.seriesValues[i][j]);
                };
                resultSeries.push({
                    name: renderData.groupNames[j],
                    data: columnData
                });
            }
        }
        return resultSeries;
    }

    protected formatCategories(renderData: TabularRenderData): string[] {
        // Existing LW Chart convention-  All bar charts categorize against the series names
        return renderData.seriesNames;
    }
}

export class StackedBarChart extends BarChart {
    protected getChartType(): string { return Chart_Contracts.ChartTypesConstants.StackedBar; }
    public getSeriesLimit(): number { return ChartLimiter.getAllowedRows(this._options.height, ChartLimiter.reservedVerticalSpaceForRows + ChartLimiter.defaultLegendHeight); }
    public getGroupByLimit(): number { return ChartLimiter.getHorizontalLegendElements(this._options.width); }
}

export class PivotTable extends LightweightChartBase {

    public initialize() {
        super.initialize();
        this.getElement().addClass("pivot-chart");
        this.getElement().removeClass("unselectable");
    }

    protected getChartType(): string { return Chart_Contracts.ChartTypesConstants.Table; }
    public getSeriesLimit(): number { return ChartLimiter.getAllowedRows(this._options.height, ChartLimiter.reservedVerticalSpaceForRows + ChartLimiter.defaultLegendHeight); }
    public getGroupByLimit(): number { return ChartLimiter.getAllowedColumns(this._options.width, ChartLimiter.reservedHorizontalSpaceForCols + ChartLimiter.widthPerLegendItem); }

    public usesSubduedPalette(): boolean { return true; }

    protected formatChartOptions(renderData: TabularRenderData): Chart_Contracts.CommonChartOptions {
        var chartOptions = super.formatChartOptions(renderData);

        var yAxisNames = renderData.seriesNames.concat([Resources.PivotTableTotalText]);
        chartOptions.yAxis = { labelValues: yAxisNames };

        var xAxisNames = renderData.groupNames.concat([Resources.PivotTableTotalText]);
        chartOptions.xAxis = { labelValues: xAxisNames };

        return chartOptions;
    }

    /**
     *  Convert legacy Dataset content into common DataSeries format
     */
    protected formatSeries(renderData: TabularRenderData): Chart_Contracts.DataSeries[] {
        var resultSeries = [];

        var i, j;
        //Fill Down each of the Columns
        for (j = 0; j < renderData.groupNames.length; j++) {
            var columnData = [];
            for (i = 0; i < renderData.seriesNames.length; i++) {

                columnData.push([j, i, renderData.seriesValues[i][j]]);
            };
            resultSeries.push({
                name: renderData.groupNames[j],
                data: columnData
            });
        }

        //And now populate the  Totals Section
        var columnData = [];

        //series(row) totals
        i = renderData.seriesNames.length;
        for (j = 0; j < renderData.groupNames.length; j++) {
            columnData.push([j, i, renderData.groupTotals[j]]);
        }
        //and group (column) totals
        j = renderData.groupNames.length;
        for (i = 0; i < renderData.seriesNames.length; i++) {
            columnData.push([j, i, renderData.seriesTotals[i]]);
        }
        //And grand total.
        i = renderData.seriesNames.length;
        j = renderData.groupNames.length;
        columnData.push([j, i, renderData.grandTotal]);

        // Use theme service to set a dark-theme compatible color.
        const themeService = LWP.getLWPService("IVssThemeService");
        const totalsBackGroundColor = themeService ? themeService.getThemeValue("background-color") : "#FFFFFF";

        //Renders with solid white background on light theme.
        // Note: SVG doesn't invert in high contrast, so we're on the hook for that in this case.
        var totalsBackground = VSS_Context.isHighContrastMode() ? "#000000": totalsBackGroundColor;

        resultSeries.push({
            name: Resources.PivotTableTotalText,
            data: columnData,
            color: totalsBackground    
        });

        return resultSeries;
    }
}

export class HistoricalChartBase extends LightweightChartBase {

    public initializeOptions(options: LightweightChartOptions) {//Apply colors based on series, not the grouped dates.
        super.initializeOptions($.extend({ useSeriesColoring: true }, options));
    }

    protected isTrendChart(): boolean { return true; }
    public getGroupByLimit(): number { return 10000; }
    public getSeriesLimit(): number { return ChartLimiter.getHorizontalLegendElements(this._options.width); }
}

export class AreaChart extends HistoricalChartBase {
    public getChartType(): string { return Chart_Contracts.ChartTypesConstants.Area; }

}

export class StackAreaChart extends HistoricalChartBase {
    public initializeOptions(options?: LightweightChartOptions) {
        super.initializeOptions($.extend({ transpose: true }, options));
    }

    public getChartType(): string { return Chart_Contracts.ChartTypesConstants.StackedArea; }
}

export class LineChart extends StackAreaChart {
    public getChartType(): string { return Chart_Contracts.ChartTypesConstants.Line; }
}


// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Charting.Charts", exports);
