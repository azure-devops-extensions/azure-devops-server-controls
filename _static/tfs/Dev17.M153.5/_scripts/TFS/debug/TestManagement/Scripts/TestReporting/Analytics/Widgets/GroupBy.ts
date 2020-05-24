/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import q = require("q");

import Dashboard_Contracts = require("Dashboards/Scripts/Contracts");

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WebSettingsService, WebSettingsScope } from "Presentation/Scripts/TFS/TFS.WebSettingsService";

import Detailed_Charts = require("TestManagement/Scripts/TestReporting/Charts/ChartBase");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import * as AnalyticsTypes from "TestManagement/Scripts/TestReporting/Analytics/Types";
import { AnalyticsChartingClient } from "TestManagement/Scripts/TestReporting/Analytics/AnalyticsChartingClient";
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";

import Contracts = require("TFS/TestManagement/Contracts");
import TFS_Dashboard_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboard_WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

import Controls = require("VSS/Controls");
import Grids = require("VSS/Controls/Grids");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Diag = require("VSS/Diag");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");

import TFS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");

import * as VssContext from "VSS/Context";

import * as Dashboard_Services from "TFS/Dashboards/Services";

interface ITestResultsGroupByWidgetGridOptions extends Grids.IGridOptions {
    chartOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions;
    data: AnalyticsTypes.IAnalyticsChartData[];
    uniqueId: string;
}

//Move this grid to different file.
class GroupByWidgetGrid extends Grids.GridO<ITestResultsGroupByWidgetGridOptions> {

    public initialize() {
        super.initialize();
        this._rowHeight = 30;

        this.getElement().focusout(() => {
            if (this.getElement().has(":focus").length === 0) {
                this._active = false;
            }
        });
    }

    public initializeOptions(options?: ITestResultsGroupByWidgetGridOptions) {
        this._chartOptions = options.chartOptions;
        this._data = this._convertAPIDataToChartData(options.data);
        this._uniqueId = options.uniqueId;
        this._sortOrderKey = this._uniqueId.concat("-sortOrder");

        // Call API and get width
        this._webSettingsService = TFS_OM_Common.Application.getConnection(TfsContext.getDefault()).getService<WebSettingsService>(WebSettingsService);

        this._webSettingsService.beginReadSetting(GroupByWidgetGrid.webSettingRegistryPath + "/" + this._uniqueId, WebSettingsScope.User, (option: any) => {
            if (option && option.value) {
                this._settingsEntries = JSON.parse(option.value);

                if (this._settingsEntries != null) {
                    for (let _i = 0; _i < this._columns.length; _i++) {
                        let key = this._uniqueId.concat("-" + this._columns[_i].index);
                        if (this._settingsEntries[key] != null) {
                            this._columns[_i].width = this._settingsEntries[key] * this._chartOptions.width;
                        }
                    }

                    let sortOrderStr: string = this._settingsEntries[this._sortOrderKey];
                    if (sortOrderStr != null) {
                        this.sortData(sortOrderStr);
                    }

                    this.layout();
                }
            }
        }, (error) => {
            Diag.logError(error);
        });

        super.initializeOptions($.extend({
            coreCssClass: "grid groupby-analytics-widget-grid",           //TODO: Css defined in _Widget.css file. Name appropriately and move to different css file. grid css is added but remove
            allowMultiSelect: false,
            gutter: {
                contextMenu: false
            },
            columns: this._getColumns(),
            source: this._data
        } as ITestResultsGroupByWidgetGridOptions, options));
    }

    public _onColumnResize(column) {
        super._onColumnResize(column);
        let key = this._uniqueId.concat("-" + column.index);
        let ratio: number = column.width / this._chartOptions.width;
        this._settingsEntries[key] = ratio;

        // Save to settings service.
        this._webSettingsService.beginWriteSetting(GroupByWidgetGrid.webSettingRegistryPath + "/" + this._uniqueId, JSON.stringify(this._settingsEntries), WebSettingsScope.User);
    }

    private _getColumns(): Grids.IGridColumn[] {
        return [
            <Grids.IGridColumn>{
                index: this._groupByColumnName,
                width: this._settingsEntries != null && this._settingsEntries[this._groupByColumnName] != null ? this._chartOptions.width * this._settingsEntries[this._groupByColumnName] : this._chartOptions.width * 0.6,      //70% of widget width.
                text: this._groupByColumnName,
                headerCss: "groupby-analytics-header",
                rowCss: "groupby-analytics-cellcontent",
                getCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                    let cell = this._drawCell
                        .apply(this, arguments);

                    let stackByContainer = $("<div />");
                    stackByContainer.text(this.getRowData(dataIndex).stackByValue);
                    stackByContainer.prependTo(cell);
                    return cell;
                },
                canSortBy: false
            },
            {
                index: this._groupByAggregateColumnName,
                width: this._settingsEntries != null && this._settingsEntries[this._groupByAggregateColumnName] != null ? this._chartOptions.width * this._settingsEntries[this._groupByAggregateColumnName] : this._chartOptions.width * 0.3,      //30% of widget width.,
                text: this._groupByAggregateColumnName,
                headerCss: "groupby-analytics-header",
                rowCss: "groupby-analytics-cellcontent",
                getCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                    let cell = this._drawCell
                        .apply(this, arguments);

                    let aggrContainer = $("<div />");
                    let cellValue: string = this.getRowData(dataIndex).metricValue;
                    if (this._chartOptions.primaryChartOptions.metric === AnalyticsTypes.Chart_Metric.Rate) {
                        cellValue += "%";
                    }

                    aggrContainer.text(cellValue);
                    aggrContainer.prependTo(cell);
                    return cell;
                },
                canSortBy: true
            }
        ];
    }

    public onSort(sortOrder: Grids.IGridSortOrder[], sortColumns?: Grids.IGridColumn[]) {
        super.onSort(sortOrder, sortColumns);

        let order: string = Utils_Array.first(sortOrder).order;

        //Currently on One column can be sorted. So expecting array contains one element.
        this.sortData(order);
        this.setDataSource(this._data);

        // Save to settings service.
        this._settingsEntries[this._sortOrderKey] = order;

        this._webSettingsService.beginWriteSetting(GroupByWidgetGrid.webSettingRegistryPath + "/" + this._uniqueId, JSON.stringify(this._settingsEntries), WebSettingsScope.User);
    }

    private sortData(order: string) {
        if (order == "asc") {
            this._data.sort((a, b) => { return (a.metricValue as number) - (b.metricValue as number); });
        }
        else {
            this._data.sort((a, b) => { return (b.metricValue as number) - (a.metricValue as number); });
        }
    }

    private _convertAPIDataToChartData(apiData: AnalyticsTypes.IAnalyticsChartData[]): AnalyticsTypes.IAnalyticsChartData[] {
        let convertedData: number[];

        switch (this._chartOptions.primaryChartOptions.stackBy) {
            case AnalyticsTypes.Chart_StackBy.Container:
                this._groupByColumnName = "Container";
                break;
            case AnalyticsTypes.Chart_StackBy.Test:
                this._groupByColumnName = "Test";
                break;
            case AnalyticsTypes.Chart_StackBy.Owner:
                this._groupByColumnName = "Test owner";
                break;
            case AnalyticsTypes.Chart_StackBy.Outcome:
                this._groupByColumnName = "Outcome";
                break;
            case AnalyticsTypes.Chart_StackBy.Priority:
                this._groupByColumnName = "Priority";
                break;
            case AnalyticsTypes.Chart_StackBy.TestRun:
                this._groupByColumnName = "TestRun";
                break;
        }

        switch (this._chartOptions.primaryChartOptions.metric) {
            case AnalyticsTypes.Chart_Metric.Duration:
                let metricData: string[] = apiData.map(d => d.metricValue.toString());
                let analyzedDuration = new Detailed_Charts.DurationNormalizer(metricData).normalize();
                convertedData = analyzedDuration.durationsInUnitScale.map(d => d);
                this._groupByAggregateColumnName = Utils_String.localeFormat(Resources.DurationSeriesLabel, analyzedDuration.unit);
                break;
            case AnalyticsTypes.Chart_Metric.Rate:
                switch (this._chartOptions.primaryChartOptions.outcome) {
                    case AnalyticsTypes.Chart_Outcome.All:
                    case AnalyticsTypes.Chart_Outcome.Pass:
                        this._groupByAggregateColumnName = "Pass rate";
                        break;
                    case AnalyticsTypes.Chart_Outcome.Fail:
                        this._groupByAggregateColumnName = "Fail rate";
                        break;
                }

                convertedData = apiData.map(d => CommonUtils.TestReportDataParser.getCustomizedDecimalValue(d.metricValue as number));
                break;
            case AnalyticsTypes.Chart_Metric.Count:
                switch (this._chartOptions.primaryChartOptions.outcome) {
                    case AnalyticsTypes.Chart_Outcome.All:
                        this._groupByAggregateColumnName = "Total count";
                        break;
                    case AnalyticsTypes.Chart_Outcome.Pass:
                        this._groupByAggregateColumnName = "Passed count";
                        break;
                    case AnalyticsTypes.Chart_Outcome.Fail:
                        this._groupByAggregateColumnName = "Failed count";
                        break;
                }

                convertedData = apiData.map(d => d.metricValue as number);
                break;
        }

        return apiData.map((d: AnalyticsTypes.IAnalyticsChartData, index: number) => {
            return { stackByValue: d.stackByValue, metricValue: convertedData[index] } as AnalyticsTypes.IAnalyticsChartData;
        });
    }

    private _chartOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions;
    private _data: AnalyticsTypes.IAnalyticsChartData[];
    private _groupByColumnName: string;
    private _groupByAggregateColumnName: string;
    private _webSettingsService: WebSettingsService;
    private _settingsEntries: IDictionaryStringTo<any> = {};
    private _uniqueId: string;
    private _sortOrderKey: string;
    private static readonly webSettingRegistryPath: string = "/AnalyticsTestGroupByWidget";
}



export class TestResultsTrendChartWidget extends TFS_Control_BaseWidget.BaseWidgetControl<Dashboard_Contracts.WidgetOptions>
    implements TFS_Dashboard_WidgetContracts.IConfigurableWidget {

    public initialize(): void {
        super.initialize();
        this.getElement().addClass("vsts-test-result-trend-widget");

        this._analyticsClient = new AnalyticsChartingClient("AnalyticsTestGroupByWidget");
    }

    public preload(widgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {
        this._createView();

        if (!widgetSettings.customSettings.data) {
            // Configuration options are not available. Widget configuration required.
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
        }

        return this._updateChartConfigOptions(widgetSettings.customSettings.data).then((status: TFS_Dashboard_WidgetContracts.WidgetStatus) => {
            this._updateWidgetStaticProperties(widgetSettings);
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
        });
    }

    public load(widgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {
        if (!widgetSettings.customSettings.data) {
            this.showUnConfiguredControl(widgetSettings.size, widgetSettings.name);
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Unconfigured();
        }

        Dashboard_Services.WidgetHostService.getService(this._options).then((widgetService: Dashboard_Services.IWidgetHostService) => {
            let widgetIdPromise = widgetService.getWidgetId();
            let fetchDataPromise = this._fetchData(widgetSettings.customSettings.data);

            q.all([widgetIdPromise, fetchDataPromise]).spread((widgetId: string, data: AnalyticsTypes.IAnalyticsChartData[]) => {
                try {
                    this._renderGrid(widgetId, data);
                    this._successfullWidgetSetting = $.extend(true, {}, widgetSettings);
                    return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
                }
                catch (error) {
                    return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(error);
                }
            }, (error) => {
                return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(error);
            });

        }, (error) => {
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(error);
        });

        return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
    }

    public reload(newWidgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {

        if (!this._hasConfigurationChanged(newWidgetSettings)) {
            // Only change is widget name so let's not re-render the chart again
            this._updateWidgetTitle(newWidgetSettings.name);
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
        }

        if (this.getElement().hasClass(TestResultsTrendChartWidget.CLASS_NAME_UNCONFIGURED)) {
            this.getElement().empty();
            this._createView();
        } else {
            this.getElement().find(".tri-widget-body").empty();
        }

        if (!newWidgetSettings.customSettings.data) {
            this.showUnConfiguredControl(newWidgetSettings.size, newWidgetSettings.name);
            return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Unconfigured();
        }

        return this._updateChartConfigOptions(newWidgetSettings.customSettings.data).then((status: TFS_Dashboard_WidgetContracts.WidgetStatus) => {
            this._updateWidgetStaticProperties(newWidgetSettings);
            return this.load(newWidgetSettings);
        });
    }

    private _createView(): void {
        let skeleton: JQuery = $(`<div class="view-container">
                                    <div class="tri-widget-title-container" />
                                    <div class="tri-widget-body groupby-analytics-widget" />
                                </div>`);
        this.getElement().append(skeleton);
    }

    private _renderGrid(widgetId: string, data: AnalyticsTypes.IAnalyticsChartData[]): void {
        //TODO: use react grid instead jquery controls.
        <GroupByWidgetGrid>Controls.BaseControl.createIn(GroupByWidgetGrid, this.getElement().find(".tri-widget-body"),
            {
                chartOptions: this._chartConfigOptions,
                data: data,
                uniqueId: widgetId
            } as ITestResultsGroupByWidgetGridOptions
        );
    }

    private _updateWidgetStaticProperties(widgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings): void {
        this._updateWidgetTitle(widgetSettings.name);
        this._updateChartDimensions(widgetSettings.size);
    }

    private _updateWidgetTitle(title: string): void {
        let titleContainer = this.getElement().find(".tri-widget-title-container");
        let titleElement: JQuery;

        titleContainer.empty();

        if ((this._options.typeId === TestResultsTrendChartWidget.TESTRESULTS_FAILURE_TREND_WIDGET_TYPE_ID ||
            this._options.typeId === TestResultsTrendChartWidget.TESTRESULTS_DURATION_TREND_WIDGET_TYPE_ID)) {

            titleElement = $(`<div>
                                <div class="tri-widget-title-text" />
                                <span class="bowtie-icon bowtie-status-info-outline tri-info-icon" />
                              </div>`);

            let $titleText = titleElement.find(".tri-widget-title-text").text(title);
            RichContentTooltip.addIfOverflow(title, $titleText);
            RichContentTooltip.add(Resources.OldWidgetInfoText, titleElement.find(".tri-info-icon"));
        } else {
            titleElement = $(`<div class="tri-widget-title-text" />`);
            titleElement.text(title);
            RichContentTooltip.addIfOverflow(title, titleElement);
        }

        titleContainer.append(titleElement);
    }

    private _updateChartDimensions(size: TFS_Dashboards_Contracts.WidgetSize): void {
        this._chartConfigOptions.height = TFS_Dashboard_WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(size.rowSpan) - 40;
        this._chartConfigOptions.width = TFS_Dashboard_WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(size.columnSpan);
    }

    private _updateChartConfigOptions(data: string): IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> {
        let retValue: IPromise<TFS_Dashboard_WidgetContracts.WidgetStatus> = TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();

        try {
            let parsedData = JSON.parse(data);

            // For existing settings for build
            if (!parsedData.context) {
                parsedData.context = Contracts.TestResultsContextType.Build;
            }

            this._chartConfigOptions = parsedData;
            if (parsedData.context) {
                if (parsedData.context == Contracts.TestResultsContextType.Build && (parsedData.buildDefinition || parsedData.buildDefintion)) {
                    if (parsedData.buildDefinition) {
                        this._chartConfigOptions.buildDefinition = parsedData.buildDefinition;
                    }
                    else if (parsedData.buildDefintion) { // This is required for backward compatibility 
                        this._chartConfigOptions.buildDefinition = parsedData.buildDefintion;
                    }
                }
                else if (parsedData.context == Contracts.TestResultsContextType.Release && parsedData.releaseDefinition) {
                    this._chartConfigOptions.releaseDefinition = parsedData.releaseDefinition;
                }
            }

            //this._chartConfigOptions.onDataClicked = Utils_Core.delegate(this, this._chartDataClicked);
            retValue = TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
        }
        catch (e) {
            retValue = TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(e);
        }

        return retValue;
    }

    /// <summary>
    /// fetches the data for chart from the server
    /// </summary>
    private _fetchData(customSettings: string): IPromise<AnalyticsTypes.IAnalyticsChartData[]> {
        let deferred: q.Deferred<AnalyticsTypes.IAnalyticsChartData[]> = q.defer<AnalyticsTypes.IAnalyticsChartData[]>();
        let publishContextDetails: Contracts.TestResultsContext;

        if (this._chartConfigOptions.context && this._chartConfigOptions.context == Contracts.TestResultsContextType.Build && this._chartConfigOptions.buildDefinition) {
            publishContextDetails = {
                contextType: Contracts.TestResultsContextType.Build,
                build: { definitionId: this._chartConfigOptions.buildDefinition.id }
            } as Contracts.TestResultsContext;
        }
        else if (this._chartConfigOptions.context && this._chartConfigOptions.context == Contracts.TestResultsContextType.Release && this._chartConfigOptions.releaseDefinition) {
            publishContextDetails = {
                contextType: Contracts.TestResultsContextType.Release,
                release: { environmentDefinitionId: this._chartConfigOptions.releaseEnvironment.definitionEnvironmentId, definitionId: this._chartConfigOptions.releaseDefinition.id }
            } as Contracts.TestResultsContext;
        }

        if (publishContextDetails) {
            let primaryChartDataPromise = this._analyticsClient.getGroupByChartData(VssContext.getDefaultWebContext().project.id, publishContextDetails, this._chartConfigOptions.branch.repositoryId, this._chartConfigOptions.branch.branchName,
                this._chartConfigOptions.primaryChartOptions, this._chartConfigOptions.periodGroup, this._chartConfigOptions.periodGroupValue);

            q.all([primaryChartDataPromise]).spread((primaryData: AnalyticsTypes.IAnalyticsChartData[]) => {
                deferred.resolve(primaryData);
            }, (error) => {
                deferred.reject(error);
            });
        }

        return deferred.promise;
    }

    private _isStackedChart(chartType: Detailed_Charts.ChartTypes): boolean {
        switch (chartType) {
            case Detailed_Charts.ChartTypes.StackedColumn:
            case Detailed_Charts.ChartTypes.StackedArea:
            case Detailed_Charts.ChartTypes.MultiLine:
                return true;
            default:
                return false;
        }
    }

    private _hasConfigurationChanged(newWidgetSettings: TFS_Dashboard_WidgetContracts.WidgetSettings): boolean {
        return (this._successfullWidgetSetting === null
            || this._successfullWidgetSetting === undefined
            || (newWidgetSettings.customSettings.data !== this._successfullWidgetSetting.customSettings.data)
            || (newWidgetSettings.size.columnSpan !== this._successfullWidgetSetting.size.columnSpan)
            || (newWidgetSettings.size.rowSpan !== this._successfullWidgetSetting.size.rowSpan));
    }

    private static CLASS_NAME_UNCONFIGURED = "unconfigured";
    private static TESTRESULTS_DURATION_TREND_WIDGET_TYPE_ID = "Microsoft.VisualStudioTeamServices.Dashboards.TestResultsDurationTrendWidget";
    private static TESTRESULTS_FAILURE_TREND_WIDGET_TYPE_ID = "Microsoft.VisualStudioTeamServices.Dashboards.TestResultsFailureTrendWidget";
    private static TESTRESULTS_TREND_WIDGET_TYPE_ID = "Microsoft.VisualStudioTeamServices.Dashboards.TestResultsTrendWidget";
    private _successfullWidgetSetting: TFS_Dashboard_WidgetContracts.WidgetSettings;
    private _chartConfigOptions: AnalyticsTypes.IAnalyticsChartConfigurationOptions;
    private _analyticsClient: AnalyticsChartingClient;
}

// register control as an enhancement to allow the contribution model to associate it with the widget host.
SDK.registerContent("testresults.analytics.groupby.initialize", (context) => {
    return Controls.create(TestResultsTrendChartWidget, context.$container, context.options);
});