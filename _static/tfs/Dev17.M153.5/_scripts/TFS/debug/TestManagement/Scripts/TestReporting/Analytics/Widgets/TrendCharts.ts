/// <amd-dependency path='VSS/LoaderPlugins/Css!TestManagement' />

import q = require("q");

import Charting_Contracts = require("Charting/Scripts/Contracts");

import Dashboard_Contracts = require("Dashboards/Scripts/Contracts");
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import Detailed_Charts = require("TestManagement/Scripts/TestReporting/Charts/ChartBase");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import * as AnalyticsTypes from "TestManagement/Scripts/TestReporting/Analytics/Types";
import * as AnalyticsChart from "TestManagement/Scripts/TestReporting/Analytics/Charts";
import { AnalyticsChartingClient } from "TestManagement/Scripts/TestReporting/Analytics/AnalyticsChartingClient";

import Contracts = require("TFS/TestManagement/Contracts");
import TFS_Dashboard_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboard_WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");

import Controls = require("VSS/Controls");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Diag = require("VSS/Diag");
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");

import TFS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");

import * as VssContext from "VSS/Context";

let TelemetryService = TCMTelemetry.TelemetryService;

export class TestResultsTrendChartWidget extends TFS_Control_BaseWidget.BaseWidgetControl<Dashboard_Contracts.WidgetOptions> 
    implements TFS_Dashboard_WidgetContracts.IConfigurableWidget {

    public initialize(): void {
        super.initialize();
        this.getElement().addClass("vsts-test-result-trend-widget");

        this._analyticsClient = new AnalyticsChartingClient("AnalyticsTestTrendWidget");
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

        return this._fetchData(widgetSettings.customSettings.data)
            .then((chartData: AnalyticsTypes.IAnalyticsGroupChartData) => {
                try {
                    this._renderChart(chartData);
                    this._successfullWidgetSetting = $.extend(true, {}, widgetSettings);
                    return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Success();
                }
                catch (error) {
                    return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(error);
                }
            }, (error) => {
                return TFS_Dashboard_WidgetHelpers.WidgetStatusHelper.Failure(error);
            });
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
                                    <div class="tri-widget-body" />
                                </div>`);
        this.getElement().append(skeleton);
    }

    private _renderChart(chartData: AnalyticsTypes.IAnalyticsGroupChartData): void {
        new AnalyticsChart.TrendComboChart().create(this.getElement().find(".tri-widget-body"), <AnalyticsTypes.IAnalyticsChartRenderingOptions>{
            chartConfigOptions: this._chartConfigOptions,
            chartData: chartData
        });
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

    private _chartDataClicked(event: Charting_Contracts.ChartClickEventArgs, context: Contracts.TestResultsContext): void {
        let workflowId: number;
        switch (context.contextType) {
            case Contracts.TestResultsContextType.Build:
                if (event.customData && event.customData.buildId) {
                    workflowId = event.customData.buildId;
                }
                break;
            case Contracts.TestResultsContextType.Release:
                if (event.customData && event.customData.releaseId) {
                    workflowId = event.customData.releaseId;
                }
                break;
            default:
                Diag.logError(Utils_String.format("Unsupported context type: {0}", context.contextType));
        }

        Diag.logInfo(Utils_String.format("[TestResultChartWidgetBase._chartDataClicked]: bar clicked for build id: {0}", workflowId));
        this.openWorkflowLink(workflowId, context);
        TelemetryService.publishEvent(TelemetryService.featureTestTrendChart_NavigateToBuildSummary, event.target, event.value);
    }

    private openWorkflowLink(workflowId: number, context: Contracts.TestResultsContext): void {
        switch (context.contextType) {
            case Contracts.TestResultsContextType.Build:
                let buildUrl: string = TMUtils.UrlHelper.getBuildSummaryUrl(workflowId);
                window.open(buildUrl, "_blank");
                break;
            case Contracts.TestResultsContextType.Release:
                let releaseUrl: string = TMUtils.UrlHelper.getReleaseSummaryUrl(workflowId);
                window.open(releaseUrl, "_blank");
                break;
            default:
                Diag.logError(Utils_String.format("Unsupported context type: {0}", context.contextType));
                return;
        }
    }

    /// <summary>
    /// fetches the data for chart from the server
    /// </summary>
    private _fetchData(customSettings: string): IPromise<AnalyticsTypes.IAnalyticsGroupChartData> {
        let deferred: q.Deferred<AnalyticsTypes.IAnalyticsGroupChartData> = q.defer<AnalyticsTypes.IAnalyticsGroupChartData>(); 
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
            let primaryChartDataPromise = this._analyticsClient.getChartData(VssContext.getDefaultWebContext().project.id, publishContextDetails, this._chartConfigOptions.branch.repositoryId, this._chartConfigOptions.branch.branchName,
                this._chartConfigOptions.primaryChartOptions, this._chartConfigOptions.periodGroup, this._chartConfigOptions.periodGroupValue, this._isStackedChart(this._chartConfigOptions.chartType));
            let secondaryChartDataPromise = this._analyticsClient.getChartData(VssContext.getDefaultWebContext().project.id, publishContextDetails, this._chartConfigOptions.branch.repositoryId, this._chartConfigOptions.branch.branchName,
                this._chartConfigOptions.secondaryChartOptions, this._chartConfigOptions.periodGroup, this._chartConfigOptions.periodGroupValue, this._isStackedChart(this._chartConfigOptions.secondaryChartType));

            q.all([primaryChartDataPromise, secondaryChartDataPromise]).spread((primaryData: AnalyticsTypes.IAnalyticsChartData[], secondaryData: AnalyticsTypes.IAnalyticsChartData[]) => {
                deferred.resolve({ primaryChartData: primaryData, secondaryChartData: secondaryData } as AnalyticsTypes.IAnalyticsGroupChartData);
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
SDK.registerContent("testresults.analytics.trend.initialize", (context) => {
    return Controls.create(TestResultsTrendChartWidget, context.$container, context.options);
});
