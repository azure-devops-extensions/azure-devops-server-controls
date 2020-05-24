


import Q = require("q");
import { VssConnection } from "VSS/Service";

import Charting = require("Charting/Scripts/TFS.Charting");
import Charting_Charts = require("Charting/Scripts/TFS.Charting.Charts");
import Charting_Data_Client = require("Charting/Scripts/DataService/RestClient");
import Charting_Data_Contracts = require("Charting/Scripts/DataService/Contracts");
import Charting_DataServices = require("Charting/Scripts/TFS.Charting.DataServices");
import Charting_Hosts = require("Charting/Scripts/TFS.Charting.Hosts");

import Chart_Contracts = require("Charts/Contracts");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Navigation_Services = require("VSS/Navigation/Services");

import Ajax = require("VSS/Ajax");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");

import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import { WidgetTelemetry } from "Widgets/Scripts/VSS.Widget.Telemetry";

import Utils_String = require("VSS/Utils/String");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

/*
 * Decouple the construction of the chart container. The role of this class is to create the container
 * where the response data will be placed. It builds around this container a link where the user can click.
 */
export class BaseChartContainer {
    /*
     * Build a container that is clickable.
     * @param content {string} The Html content of the container
     * @param url {string} The url to be redirected with the container is clicked
     */
    public build(content: string, url: string) {
        var $link = $('<a>');
        $link.attr('href', url);
        $link.attr('data-is-clickable', 'true');
        $link.attr('class', 'full-widget-link');
        $link.html(content);
        return $link;
    }
}

export interface BaseChartWidgetOptions extends Dashboard_Shared_Contracts.WidgetOptions {
    /** Unit test override for window.location/window.open navigation */
    navigate?: (url: string, openInNewWindow: boolean) => void;
}

interface RenderOptions {
    widgetSettings: Dashboards_WidgetContracts.WidgetSettings;

    /** A hint to renderer to evaluate for bypassing of rendering, with re-use of prior state.   */
    preferBypassedRendering: boolean;

    /** Indicates that we shouldn't animate the chart when it renders */
    suppressAnimation: boolean;

    widgetSizeInPixels?: Dashboards_WidgetContracts.Size;
}

enum UpdateKind {
    NOTHING = 0,
    TITLE_ONLY,
    FULL_UPDATE
}

/*
 * Base class for Chart Widgets presenting ChartId & ChartConfiguration backed data.
 * Defers to derived implementation for providing hyperlinks to underlying page.
 */
export class BaseChartWidget
    extends TFS_Control_BaseWidget.BaseWidgetControl<BaseChartWidgetOptions>
    implements Dashboards_WidgetContracts.IConfigurableWidget {

    private chartHost: Charting_Hosts.ChartHost;
    private currentLink: string;

    /** The last known configuration & render-state of the widget. Used for determining if we need to reload.*/
    private chartRenderState: Charting_Charts.IChartState;

    /** Stored from previous render. Used for lightbox resize and determining title change in configuration preview. */
    private previousWidgetSettings: Dashboards_WidgetContracts.WidgetSettings;

    private isInLightbox: boolean = false;

    private title: string;

    private navigateHandler: (url: string, openInNewWindow: boolean) => void;

    /* Base Chart Widget doesn't use any WidgetOptions.*/
    constructor(options?: BaseChartWidgetOptions) {
        super(options);

        this.navigateHandler = options.navigate || ((url: string, openInNewWindow: boolean) => {
            if (openInNewWindow) {
                window.open(url, "_blank");
            } else {
                this.handleNavigation(url);
            }
        });
    }

    // Allows deriving classes to override navigation handling for fps scenarios.
    protected handleNavigation(url: string): void {
        window.location.href = url;
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "lw-chart-widget"
        }, options));
    }

    public dispose(): void {
        if (this.chartHost) {
            this.chartHost.dispose();
            this.chartHost = null;
        }
        super.dispose();
    }

    public static getSettingsVersion(customSettings: Dashboards_WidgetContracts.CustomSettings): TFS_Dashboards_Contracts.SemanticVersion {
        if (customSettings.version) {
            return customSettings.version;
        } else {
            return TFS_Dashboards_Common.SemanticVersionExtension.getInitialVersion();
        }
    }

    public preload(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        var version = BaseChartWidget.getSettingsVersion(widgetSettings.customSettings);
        this.createChartHost(version);

        // Chart Widget doesn't have a spec'ed pre-load experience.
        // Note: At this stage, if the config is in customsettings (not a legacy chartID)
        // then it can generate a link to the relevant feature page.
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /* Ensure we have the chartConfiguration data on hand, then move on to rendering. */
    public load(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return this.render({
            widgetSettings: widgetSettings,
            preferBypassedRendering: false,
            suppressAnimation: false
        });
    }

    public lightbox(widgetSettings: Dashboards_WidgetContracts.WidgetSettings, lightboxSize: Dashboards_WidgetContracts.Size): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this.isInLightbox = true;

        return this.preload(widgetSettings).then(() => {
            if (this.isDisposed()) {
                return WidgetHelpers.WidgetStatusHelper.Success();
            }

            return this.render({
                widgetSettings: widgetSettings,
                preferBypassedRendering: false,
                suppressAnimation: false,
                widgetSizeInPixels: lightboxSize
            });
        });
    }

    private isLightboxed(): boolean {
        return this.isInLightbox;
    }

    public listen(event: string, args: any): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        if (event === WidgetHelpers.WidgetEvent.LightboxResized) {
            var lightboxSize = (<Dashboards_WidgetContracts.EventArgs<Dashboards_WidgetContracts.Size>>args).data;
            return this.render({
                widgetSettings: this.previousWidgetSettings,
                preferBypassedRendering: false,
                suppressAnimation: true,
                widgetSizeInPixels: lightboxSize
            });
        } else if (event === WidgetHelpers.WidgetEvent.LightboxOptions) {
            var callback = args.data;
            var lightboxOptions = <Dashboard_Shared_Contracts.WidgetLightboxOptions>{};
            lightboxOptions.title = this.title;
            callback(lightboxOptions);
        }

        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    /**
     * Callback for when settings have been updated during configuration. Public for unit testing purposes.
     * @param settings The current settings that have been configured by the user.
     */
    public reload(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return this.render({
            widgetSettings: widgetSettings,
            preferBypassedRendering: !!this.chartRenderState, //Encourage renderer to bypass unneccessary steps, once neccessary initial state is safely established.
            suppressAnimation: true
        });
    }

    /* Returns a promise of a ChartConfiguration, sourced from either the customSettings or saved Chart Configuration */
    public static getChartConfiguration(widgetSettings: Dashboards_WidgetContracts.WidgetSettings, webContext: Contracts_Platform.WebContext):
        IPromise<Charting_Data_Contracts.ChartConfiguration> {
        var chartConfiguration: Charting_Data_Contracts.ChartConfiguration = null;
        var parsedSettings = JSON.parse(widgetSettings.customSettings.data);

        var majorVersion = BaseChartWidget.getSettingsVersion(widgetSettings.customSettings).major;

        if (majorVersion == 1 && parsedSettings.chartId) {
            return BaseChartWidget.retrieveChartConfiguration(parsedSettings.chartId, webContext);
        } else {
            //When dealing with a configurable widget, always use the current widget Name as Chart title
            //This is neccessary to ensure title-only edits are accurately reflected in Widget.
            parsedSettings.title = widgetSettings.name;

            return Q(<Charting_Data_Contracts.ChartConfiguration>parsedSettings);
        }
    }

    /** Base implementation, of link Url generator, to feature pages. to be handled by derived types. */
    public getLinkUrl(chartConfiguration: Charting_Data_Contracts.ChartConfiguration): string {
        return "";
    }

    /** Base Implementation of feature name provider.
      This allows the base chart to properly route a chart transform request to the right feature implementation on server */
    public getFeatureName(): string {
        return "";
    }

    /**
     * Retrive the chart configuration based on a chartId. It is used for V1 style chart widget which is from pinning.
     * It also decode the title that are from the ChartConfiguration to make it render correctly with charting host.
     * @param chartId - The id of the chart
     * @param webContext - The current webContext
     */
    public static retrieveChartConfiguration(chartId: string, webContext: Contracts_Platform.WebContext): IPromise<Charting_Data_Contracts.ChartConfiguration> {
        var client = Charting_Data_Client.getClient();
        return client.getChartConfiguration(webContext.project.id, chartId).then((chartConfigurationResponse) => {
            // When we get the chart information from the V1, those are from Pinned chart.
            // the title are encoded, so we need to decode before use it.
            var chartConfiguration = chartConfigurationResponse.chartConfiguration;

            // chartId is only relevant to V1 chart widgets (as of V2 chart information is stored in settings so we no longer need an external lookup)
            chartConfiguration.chartId = null;

            chartConfiguration.title = Utils_String.decodeHtmlSpecialChars(chartConfiguration.title);
            return Q(chartConfiguration);
        });
    }

    /**
     * Fetches configuration and passes it to the chart host, re-querying results if necessary
     */
    private render(options: RenderOptions): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        try {
            this.title = options.widgetSettings.name;
            this.hideUnConfiguredControl();

            // Bail early if the widget isn't configured.
            if (options.widgetSettings.customSettings.data == null) {
                this.showUnConfiguredControl(options.widgetSettings.size, this.title);
                return WidgetHelpers.WidgetStatusHelper.Unconfigured();
            }

            const previousSettings = this.previousWidgetSettings;
            this.previousWidgetSettings = options.widgetSettings;

            // When in config (preview mode), lots of updates can happen quickly. Look for rendering shortcuts
            if (options.preferBypassedRendering) {

                // Compare the previous settings with the current to determine if it is only the title that has changed
                const changesNeeded = this.analyzeChanges(previousSettings, options.widgetSettings);
                if (changesNeeded === UpdateKind.NOTHING) {
                    return WidgetHelpers.WidgetStatusHelper.Success(JSON.stringify(this.chartHost.getLegendItems()));
                }
                if (changesNeeded === UpdateKind.TITLE_ONLY) {
                    this.chartHost.updateTitle(this.title);
                    return WidgetHelpers.WidgetStatusHelper.Success(JSON.stringify(this.chartHost.getLegendItems()));
                }
            }

            // Full update/render needed
            return this.fullUpdateAndRender(options);
        } catch (e) {
            return WidgetHelpers.WidgetStatusHelper.Failure(Resources.BaseChart_InvalidConfiguration);
        }
    }

    private fullUpdateAndRender(options: RenderOptions): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return BaseChartWidget.getChartConfiguration(options.widgetSettings, this.webContext).then((chartConfiguration) => {
            if (this.isDisposed()) {
                return WidgetHelpers.WidgetStatusHelper.Success();
            }
            return this.getQueryResults(chartConfiguration, this.webContext).then((results) => {
                if (this.isDisposed()) {
                    return WidgetHelpers.WidgetStatusHelper.Success();
                }

                this.title = chartConfiguration.title;

                let widgetSizeInPixels = options.widgetSizeInPixels || this.getWidgetSizeInPixels(options.widgetSettings.size);

                this.updateHyperlink(chartConfiguration);

                if (this.performanceScenario && chartConfiguration.chartType) {
                    this.performanceScenario.addData({
                        pivot: BaseChartWidget.getChartGroup(chartConfiguration.chartType)
                    });
                }

                return this.updateChart(options.widgetSettings, chartConfiguration, results, widgetSizeInPixels, options.suppressAnimation);
            });
        }, () => {
            return WidgetHelpers.WidgetStatusHelper.Failure(Resources.BaseChart_InvalidConfiguration);
        });
    }

    public static getChartGroup(chartType: string): string {
        const chartTypeMap = Charting_Charts.ChartTypes.makeChartTypeMap();
        if (!chartTypeMap[chartType]) {
            throw Error("Unrecognized Chart Type");
        }

        switch (chartType) {
            case Charting_Charts.ChartTypes.areaChart:
            case Charting_Charts.ChartTypes.stackAreaChart:
            case Charting_Charts.ChartTypes.lineChart:
                return Charting_Charts.ChartGroup.historical;
            default:
                return Charting_Charts.ChartGroup.current;
        }
    }

    private analyzeChanges(previous: Dashboards_WidgetContracts.WidgetSettings, current: Dashboards_WidgetContracts.WidgetSettings): UpdateKind {
        if (previous && current) {
            const allCustomDataEqual = previous.customSettings.data === current.customSettings.data;
            const titlesEqual = previous.name === current.name;
            const versionAndSizeEqual = TFS_Dashboards_Common.SemanticVersionExtension.verifyVersionsEqual(previous.customSettings.version, current.customSettings.version)
                && previous.size.columnSpan === current.size.columnSpan
                && previous.size.rowSpan === current.size.rowSpan;

            if (allCustomDataEqual && titlesEqual && versionAndSizeEqual) {
                return UpdateKind.NOTHING;
            } else if (allCustomDataEqual && versionAndSizeEqual) {
                return UpdateKind.TITLE_ONLY;
            }
        }

        return UpdateKind.FULL_UPDATE;
    }

    /** Fetches query data, making a call to the server if necessary */
    private getQueryResults(chartConfiguration: Charting_Data_Contracts.ChartConfiguration, webContext: Contracts_Platform.WebContext): IPromise<Charting_DataServices.IDataTable> {
        if (this.canReuseResults(chartConfiguration)) {
            // Use the results from the last time we ran the query
            return Q.resolve(this.chartRenderState.results);
        } else {
            this.appendFilterContext(chartConfiguration);

            if (chartConfiguration.transformOptions.filter == null ||
                chartConfiguration.chartType == null) {
                return WidgetHelpers.WidgetStatusHelper.Failure(Resources.BaseChart_InvalidConfiguration) as any;
            }

            var client = BaseChartWidget.get4_1ChartingClient(webContext);

            return client.runTransformQuery([chartConfiguration.transformOptions], webContext.project.id, this.getFeatureName()).then(
                (rawResult: any) => {
                    // User should not encounter error in this case. If they do, it is probably related to
                    // some bad configuration
                    var results: Charting_DataServices.IDataTable = rawResult.result && rawResult.result.length > 0 && rawResult.result[0];
                    if (results) {
                        return results;
                    } else {
                        return WidgetHelpers.WidgetStatusHelper.Failure(Resources.BaseChart_InvalidConfiguration) as any;
                    }
                }, (error) => {
                    return this.buildErrorMessageFromRequest(error, chartConfiguration);
                });
        }
    }

    private getWidgetSizeInPixels(widgetSize: TFS_Dashboards_Contracts.WidgetSize): Dashboards_WidgetContracts.Size {
        return <Dashboards_WidgetContracts.Size>{
            width: WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(widgetSize.columnSpan),
            height: WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(widgetSize.rowSpan)
        };
    }

    private getChartSizeInPixels(widgetSizeInPixels: Dashboards_WidgetContracts.Size): Dashboards_WidgetContracts.Size {
        var titleHeight = 40; // 10 top + 20 + 10 bot
        var bottomPaddingSpace = 10;
        var lrPaddingSpace = 14;

        return <Dashboards_WidgetContracts.Size>{
            width: widgetSizeInPixels.width,
            height: widgetSizeInPixels.height - (this.isLightboxed() ? 0 : titleHeight)
        };
    }

    /**
     * By default, we do nothing. This can be override by implementation. For example, WitChart is adding information about Query.
     * @param {string} error - Error in a string format from the source. This is Exception Message.
     * @param {ChartConfiguration} chartconfig - Information about the configuration of the chart in problem
     * @returns {WidgetStatus} - Wrapped error in a promise
     */
    public buildErrorMessageFromRequest(error: string, chartconfig: Charting_Data_Contracts.ChartConfiguration): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return WidgetHelpers.WidgetStatusHelper.Failure(error);
    }

    /** Indicates if the new configuration semantically differs from the old, in a way which invalidates previously loaded transform results.
     *  This allows for irrelevant aspects such as name & color configuration to be re-rendered, without forcing a round-trip request to the server.
     */
    private canReuseResults(newConfiguration: Charting_Data_Contracts.ChartConfiguration): boolean {
        var canReuseResults = false;
        if (this.chartRenderState && this.chartRenderState.results && this.chartRenderState.configuration) {

            //Copy the existing transforms with the filterContext masked out (It is not a persisted, or user-configurable part of the contract)
            var baselineTransformText = JSON.stringify($.extend({}, this.chartRenderState.configuration.transformOptions, { filterContext: null }));
            var newTransformText = JSON.stringify($.extend({}, newConfiguration.transformOptions, { filterContext: null }));
            canReuseResults =
                //Feature area identifier. This is a string.
                this.chartRenderState.configuration.scope == newConfiguration.scope &&
                //Data source  (e.g Query ID)
                (baselineTransformText == newTransformText);
        }
        return canReuseResults;
    }

    private appendFilterContext(configuration: Charting_Data_Contracts.ChartConfiguration): void {
        var context = TFS_Host_TfsContext.TfsContext.getDefault();
        var teamContext = TFS_Dashboards_Common.getDashboardTeamContext();
        // WIT implementation requires some live "context" which isn't available from charting contract.
        // This information isn't persisted with a chart, because it isn't a setting, but "live" context.
        configuration.transformOptions.filterContext = {
            project: context.contextData.project.name,
            projectId: context.contextData.project.id,
            team: teamContext.name
        };
    }

    private createChartHost(version: TFS_Dashboards_Contracts.SemanticVersion): void {
        this.getElement().empty();

        let userHasClickPermission: boolean = this.hasClickPermission();

        let chartOptions = <Charting_Hosts.ChartHostOptions>{
            cssClass: "chart-container",
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            hideEditChart: true,
            hideDeleteChart: true,
            hideEllipsisMenu: true,
            suppressTitle: this.isLightboxed(),
            onLegendClick: () => {
                WidgetTelemetry.onWidgetClick(this.getTypeId(), "LegendElement", this.buildTelemetryProperties());
            },
            altTextExtraDescription: Resources.BaseChart_emptyAltTextDescription
        };

        if (userHasClickPermission) {
            chartOptions.onClick = (openInNewWindow: boolean) => {
                WidgetTelemetry.onWidgetClick(this.getTypeId(), "ChartElement", this.buildTelemetryProperties());

                if (this.currentLink) {
                    openInNewWindow = openInNewWindow || WidgetLinkHelper.mustOpenNewWindow();
                    this.navigateHandler(this.currentLink, openInNewWindow);
                }
            };
        }

        //Create the Chart Host Control
        this.chartHost = <Charting_Hosts.ChartHost>Controls.BaseControl.createIn(Charting_Hosts.ChartHost, this.getElement(), chartOptions);
    }

    protected hasClickPermission(): boolean {
        return true;
    }

    private updateHyperlink(configuration: Charting_Data_Contracts.ChartConfiguration): void {
        var link = this.getLinkUrl(configuration);
        this.currentLink = link;
    }

    private updateChart(widgetSettings: Dashboards_WidgetContracts.WidgetSettings, configuration: Charting_Data_Contracts.ChartConfiguration, results: Charting_DataServices.IDataTable, widgetSizeInPixels: Dashboards_WidgetContracts.Size, suppressAnimation?: boolean): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        var chartSizeInPixels = this.getChartSizeInPixels(widgetSizeInPixels);

        //Prepare and pass the chart data into the chart host for rendering
        this.chartRenderState = <Charting_Charts.IChartState>{
            configuration: configuration,
            results: results,
            width: chartSizeInPixels.width,
            height: chartSizeInPixels.height,
            suppressTitle: this.isLightboxed()
        };

        if (Math.min(widgetSizeInPixels.width, widgetSizeInPixels.height) <= 160) {
            this.chartRenderState.useCompactRenderMode = true;
        }

        var contractVersion = BaseChartWidget.getSettingsVersion(widgetSettings.customSettings);

        if (suppressAnimation) {
            this.chartHost.toggleEditMode(true);
        }

        this.chartHost.setState(this.chartRenderState, contractVersion.major);

        this.publishLoadedEvent(Charting_DataServices.ChartTelemetry.PackEssentialConfigurationForTelemetry(configuration));

        return WidgetHelpers.WidgetStatusHelper.Success(JSON.stringify(this.chartHost.getLegendItems()));
    }

    private buildTelemetryProperties(): IDictionaryStringTo<any> {
        return {
            "Mode": this.isInLightbox ? "LightBox" : "Widget",
            "ChartType": this.chartRenderState && this.chartRenderState.configuration && this.chartRenderState.configuration.chartType
        };
    }

    //Get the new 4_1 Charting client. This can be removed once default version moves up to include 4_1 payload.
    public static get4_1ChartingClient(webContext: WebContext): Charting_Data_Client.ReportingHttpClient4_1 {
        let tfsConnection: VssConnection = new VssConnection(webContext);
        return tfsConnection.getHttpClient<Charting_Data_Client.ReportingHttpClient4_1>(Charting_Data_Client.ReportingHttpClient4_1);
    }
}
