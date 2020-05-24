import * as Q from "q";

import { DateSKParser } from "Analytics/Scripts/DateSKParser";

import * as Charts_Contracts from "Charts/Contracts";
import * as Charts_Controls from "Charts/Controls";
import { EmptyChartHelper } from "Charting/Scripts/EmptyChartHelper";

import { WidgetDomClassNames } from "Dashboards/Scripts/Generated/Constants";
import { FunctionNameParser } from "Dashboards/Scripts/Common";
import { WidgetOptions, WidgetLightboxOptions, WidgetLightboxDialogConstants } from "Dashboards/Scripts/Contracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";

import { WidgetSize } from "TFS/Dashboards/Contracts";
import * as WidgetContracts from "TFS/Dashboards/WidgetContracts";
import { WidgetStatusHelper, WidgetEvent, WidgetSizeConverter } from "TFS/Dashboards/WidgetHelpers";

import * as Controls from "VSS/Controls";
import * as Service from "VSS/Service";
import { Cancelable } from "VSS/Utils/Core";
import * as SDK from "VSS/SDK/Shim";
import * as CultureUtils from "VSS/Utils/Culture";
import * as DateUtils from "VSS/Utils/Date";
import * as StringUtils from "VSS/Utils/String";

import * as TimeZoneUtils from "Widgets/Scripts/Shared/TimeZoneUtilities";
import { CFDSeriesColorAssigner, CFDPerformanceTelemetry } from "Widgets/Scripts/Shared/CumulativeFlowDiagramUtilities";
import * as CFD_Contracts from "Widgets/Scripts/CumulativeFlowDiagramContracts";
import { PlaceholderBoardUnsupportedError } from "Widgets/Scripts/CumulativeFlowDiagramErrors";
import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import * as ChartingClient from "Widgets/Scripts/DataServices/Legacy/AnalyticsChartingClient";
import { ChartColorPalettes } from "Widgets/Scripts/Shared/ChartColorPalettes";
import { RadioSettingsFieldPickerSettings } from "Widgets/Scripts/Shared/RadioSettingsFieldPicker";
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";
import { BaseWidgetControl } from "Widgets/Scripts/VSS.Control.BaseWidget";
import { WidgetTelemetry } from "Widgets/Scripts/VSS.Widget.Telemetry";
import { ICFDDataService, CFDDataService } from "Widgets/Scripts/DataServices/Legacy/CumulativeFlowDiagramDataService";
import { ITeamDataService, TeamDataService } from "Widgets/Scripts/DataServices/Legacy/TeamDataService";
import { AnalyticsActionControl } from "Widgets/Scripts/Shared/ControlUtilities";

import { AnalyticsExceptionType, AnalyticsExceptionParsing, ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { BoardsHubConstants } from "Agile/Scripts/Generated/HubConstants";
import { HubsService } from "VSS/Navigation/HubsService";

/**
 * Rendering options the widget uses to draw the chart.
 */
interface RenderOptions {
    widgetSettings: WidgetContracts.WidgetSettings;
    animateChart: boolean;
    isLightbox: boolean;

    /** Defines the size within which to render the widget. Uses widgetSettings.size if no size is provided here. */
    widgetRenderAreaSizeInPx?: WidgetContracts.Size;

    /** Used to check if the requested render has been canceled before taking actions to update the widget rendering. */
    cancelable: Cancelable;
}

export interface CumulativeFlowDiagramOptions extends WidgetOptions {
    /** Unit test override for window.location/window.open navigation */
    navigate?: (url: string, openInNewWindow: boolean) => void;
}

/**
 * A chart that presents a cumulative flow diagram for a configured team board.
 */
export class CumulativeFlowDiagram extends BaseWidgetControl<CumulativeFlowDiagramOptions> implements WidgetContracts.IWidget {
    /**
     * The date used by analytics and WIT to describe the property associated with the date as "current".
     * For example, a WorkItemRevision with a RevisedDate set to "end of time" means that it is the latest revision.
     */
    public static readonly endOfTime: Date = new Date("9999-01-01T00:00:00Z");
    public static readonly featureName: string = "CumulativeFlowDiagram";

    /**
     * Space allocation reserved for the header that cannot be used by the chart.
     * 22 for title, 16 for subheader, 10 for widget top margin, 10 for header bottom padding.
     */
    public static readonly chartHostHeightAdjustment: number = 58;

    /**
     * Space allocation on the right edge of the widget the chart cannot use to give appearance of a margin.
     * Eyeballed to give about 14px between the right of the chart and the right edge of the widget.
     */
    public static readonly chartHostWidthAdjustment: number = 9;

    /**
     * While the Analytics service is likely capable of handling a larger number, this value was chosen to have parity with the
     * existing agile experiences CFD (max of 6 months) and to limit sending large values that would not only take more time to retrieve
     * a result but would not be presented well because of the data density.
     */
    public static readonly maxAllowedTimePeriodDays: number = 180;

    /**
     * Minimum allowed time period that user can enter.
     * Lower values such as 3 days look odd on the chart, so a minimum was picked based upon what would look somewhat reasonable
     * and be useful on the chart as well as based upon what most people were saving for rolling periods according to telemetry.
     * 30 days and above was the common rolling period chosen.
     */
    public static readonly minAllowedTimePeriodDays: number = 14;

    /**
     * The default number of days the widget should be configured to look back.
     */
    public static readonly defaultTimePeriodDays: number = 30;

    private cfdDataService: ICFDDataService; // Service that gets cfd data from Analytics service
    private teamDataService: ITeamDataService; // Service that gets team data from Analytics service

    private $title: JQuery;
    private $subtitle: JQuery;
    private $chartContainer: JQuery;

    private chart: Charts_Contracts.ChartControl;

    private randomEmptyImageIndex: number;
    private clickThroughLink: string;
    private title: string;
    private subtitle: string;

    private latestRenderCancelable: Cancelable; // The latest cancelable passed to a call to render
    private latestRenderedChartOptions: Charts_Contracts.CommonChartOptions; // The latest options used to render the chart

    private navigateHandler: (url: string, openInNewWindow: boolean) => void;
    private isReady: boolean;

    // Using this variable to avoid errors from fast page switching (FPS) where the page switches, unloading data providers, but
    // the widget code continues to execute on the new page (because network requests finally came back) and makes requests
    // to get today in the account time zone only to find the data isn't on the page.
    private readonly todayInAccountTimeZone: Date;

    constructor(options?: CumulativeFlowDiagramOptions) {
        super(options);

        this.todayInAccountTimeZone = TimeZoneUtils.getTodayInAccountTimeZone();

        this.navigateHandler = options.navigate || ((url: string, openInNewWindow: boolean) => {
            if (openInNewWindow) {
                window.open(url, "_blank");
            } else {
                this.handleNavigation(url);
            }
        });

        this.isReady = true;
    }

    // Allows CFD Chart to perform Fast Page switch on click.
    private handleNavigation(url: string) {
        if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAllowFpsWidgets, false)) {
            Service.getLocalService(HubsService).navigateToHub(BoardsHubConstants.HUB_CONTRIBUTION_ID, url);
        }
        else {
            window.location.href = url;
        }
    }

    public initializeOptions(options?: WidgetOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "cumulative-flow-diagram"
        }, options));
    }

    /**
    * Widget Author implements this method if they want to override the visibility of the widget menu based on conditions
    * identified while initializing/loading the widget.
    */
    public canShowWidgetMenu(): IPromise<boolean> {
        return Q.resolve(this.isReady);
    }

    /**
     * Widget framework contract.
     * Called by the widget framework before load().
     * Creates skeleton of the widget DOM structure, adjusts settings, and initializes some member variables.
     * @param settings as available when the method is called by the host.
     * @returns widget status after this operation.
     */
    public preload(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        this.addSplitTiming("StartPreload");
        CFDPerformanceTelemetry.getInstance().register(this.performanceScenario);

        this.restrictStartDateToMaxAllowedDays(settings);
        this.prepareWidgetStructure();
        this.initializeDataServices();

        this.addSplitTiming("EndPreload");
        return WidgetStatusHelper.Success();
    }

    /**
     * Widget framework contract.
     * Called by the widget framework after preload().
     * Fetches required widget data and renders the widget view.
     * @param settings as available when the method is called by the host.
     * @returns widget status after this operation.
     */
    public load(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        this.addSplitTiming("StartLoad");

        var loadImpl = () => {
            let cancelable = new Cancelable(this);
            this.latestRenderCancelable = cancelable;

            return this.render({
                widgetSettings: settings,
                animateChart: true,
                isLightbox: false,
                cancelable: cancelable
            });
        };

        var extendedTelemetryProperties = {
            "IsConfigured": this.isConfigured(settings)
        };

        var methodName = FunctionNameParser.getMethodName(this, this.load);
        return WidgetTelemetry.executeAndTimeAsync(CumulativeFlowDiagram.featureName, methodName, loadImpl, extendedTelemetryProperties)
            // 'Finally' pattern
            .then(val => {
                this.addSplitTiming("EndLoad");
                CFDPerformanceTelemetry.getInstance().recordTelemetry(this.performanceScenario);
                return val;
            }, e => {
                this.addSplitTiming("EndLoad");
                CFDPerformanceTelemetry.getInstance().recordTelemetry(this.performanceScenario);
                throw e;
            });
    }

    /**
     * Widget framework contract.
     * Called by the widget framework during reconfiguration.
     * Fetches data only if necessary for the new settings and updates the widget view.
     * @param settings as available when the method is called by the host.
     * @returns widget status after this operation.
     */
    public reload(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        var reloadImpl = () => {
            // Cancel the previous render
            this.latestRenderCancelable.cancel();

            let cancelable = new Cancelable(this);
            this.latestRenderCancelable = cancelable;

            return this.render({
                widgetSettings: settings,
                animateChart: false,
                isLightbox: false,
                cancelable: cancelable
            });
        };

        var methodName = FunctionNameParser.getMethodName(this, this.reload);
        return WidgetTelemetry.executeAndTimeAsync(CumulativeFlowDiagram.featureName, methodName, reloadImpl);
    }

    /**
     * Widget framework contract.
     * Called by the widget framework to run the widget in a lightbox.
     * Framework doesn't call preload/load/reload, so this method handles fetching required data and rendering the widget view.
     * @param settings as available when the method is called by the host.
     * @param lightboxSize that is used to scale widget view as appropriate.
     * @returns widget status after this operation.
     */
    public lightbox(settings: WidgetContracts.WidgetSettings, lightboxSize: WidgetContracts.Size): IPromise<WidgetContracts.WidgetStatus> {
        var lightboxImpl = () => {
            let cancelable = new Cancelable(this);
            this.latestRenderCancelable = cancelable;

            return this.preload(settings)
                .then(() => {
                    return this.render({
                        widgetSettings: settings,
                        widgetRenderAreaSizeInPx: lightboxSize,
                        animateChart: true,
                        isLightbox: true,
                        cancelable: cancelable
                    });
                });
        };

        var methodName = FunctionNameParser.getMethodName(this, this.lightbox);
        return WidgetTelemetry.executeAndTimeAsync(CumulativeFlowDiagram.featureName, methodName, lightboxImpl);
    }

    /**
     * Widget framework contract.
     * Called by the widget framework to notify the widget of an event.
     * Listens for lightbox resize to handle repainting in the new view render area.
     * @param event to handle.
     * @param args for handling the event. For lightbox resize this is the new lightbox size.
     * @returns widget status after this operation.
     */
    public listen(event: string, args: any): void {
        if (event === WidgetEvent.LightboxResized) {
            var lightboxSize = (<WidgetContracts.EventArgs<WidgetContracts.Size>>args).data;
            this.resizeChart(lightboxSize, true /* isLightbox */);
        } else if (event === WidgetEvent.LightboxOptions) {
            // This information is retrieved from the rendered widget on the dashboard.
            // Because we don't show the lightbox button unless the widget finished loading successfully,
            // we are guaranteed to have set this.title and this.subtitle by the time this is called.
            var callback = args.data;
            var lightboxOptions = <WidgetLightboxOptions>{};
            lightboxOptions.title = this.title;
            lightboxOptions.subtitle = this.subtitle;
            callback(lightboxOptions);
        }
    }

    public dispose(): void {
        if (this.chart) {
            this.chart.dispose();
        }
        this.$chartContainer.empty();
        super.dispose();
    }

    /**
     * Retrieves the CFD data services.
     */
    private initializeDataServices(): void {
        var connection = ProjectCollection.getDefaultConnection();
        this.cfdDataService = connection.getService(CFDDataService);
        this.teamDataService = connection.getService(TeamDataService);
    }

    /**
     * Converts widget size dimensions into pixels
     * @param widgetSize - The size of the widget in span units
     */
    private static getWidgetSizeInPx(widgetSize: WidgetSize): WidgetContracts.Size {
        return {
            height: WidgetSizeConverter.RowsToPixelHeight(widgetSize.rowSpan),
            width: WidgetSizeConverter.ColumnsToPixelWidth(widgetSize.columnSpan)
        };
    }

    private static getBoardUrl(project: string, team: string, board: string): string {
        var tfsContext = TfsContext.getDefault();
        var boardUrl = tfsContext.getActionUrl("board", "backlogs", {
            project: project,
            team: team,
            parameters: board
        });

        return boardUrl;
    }

    /**
     * Modifies settings if necessary restricting a time period to not exceed 180 days.
     * This occurs when a start date is configured rather than a rolling period and enough
     * days have passed that the start date is over 180 days in the past from today.
     * @param settings to check and update.
     */
    private restrictStartDateToMaxAllowedDays(settings: WidgetContracts.WidgetSettings): void {
        if (this.isConfigured(settings)) {
            var customSettings = this.parseCustomSettings(settings.customSettings.data);

            // Restrict time period to max days allowed
            if (customSettings.chartDataSettings.timePeriod.identifier === CFD_Contracts.TimePeriodFieldIdentifiers.StartDate) {
                var earliestAllowedStartDate = DateUtils.addDays(this.todayInAccountTimeZone, -CumulativeFlowDiagram.maxAllowedTimePeriodDays);
                var configuredStartDate = DateUtils.parseDateString(<string>customSettings.chartDataSettings.timePeriod.settings, DateSKParser.dateStringFormat);
                // If configured date is earlier than earliest allowed, update settings
                if (DateUtils.defaultComparer(configuredStartDate, earliestAllowedStartDate) < 0) {
                    customSettings.chartDataSettings.timePeriod.settings = DateUtils.format(earliestAllowedStartDate, DateSKParser.dateStringFormat);
                    settings.customSettings.data = JSON.stringify(customSettings);
                }
            } else if (customSettings.chartDataSettings.timePeriod.settings > CumulativeFlowDiagram.maxAllowedTimePeriodDays) {
                // Don't exceed allowed rolling period
                customSettings.chartDataSettings.timePeriod.settings = CumulativeFlowDiagram.maxAllowedTimePeriodDays
                settings.customSettings.data = JSON.stringify(customSettings);
            }
        }
    }

    private prepareWidgetStructure(): void {
        // Header
        this.$title = $("<div>")
            .addClass("inner-title");

        this.$subtitle = $("<div>")
            .addClass(WidgetDomClassNames.SubTitle);
        var $header = $("<h2>")
            .addClass(WidgetDomClassNames.Title)
            .append(this.$title)
            .append(this.$subtitle);

        // Chart container
        this.$chartContainer = $("<div>").addClass("chart-instance");

        // Add to widget
        this.getElement()
            .addClass(WidgetDomClassNames.WidgetContainer)
            .append($header)
            .append(this.$chartContainer);
    }

    private isConfigured(settings: WidgetContracts.WidgetSettings): boolean {
        return settings.customSettings.data != null;
    }

    private parseCustomSettings(settingsData: string): CFD_Contracts.CumulativeFlowDiagramSettings {
        return JSON.parse(settingsData);
    }

    /**
     * Renders the widget.
     * @param options - Options on how to render the widget
     * @returns A promise that resolves when the widget is finished rendering
     */
    private render(options: RenderOptions): IPromise<WidgetContracts.WidgetStatus> {
        this.addSplitTiming("StartRender");
        let renderPromise: IPromise<void> = Q<void>(null);

        // Get defaults if unconfigured
        if (!this.isConfigured(options.widgetSettings)) {
            renderPromise = this.setDefaultSettings(options.widgetSettings);
        }

        return renderPromise
            .then(() => {
                if (!options.cancelable.canceled) {
                    this.updateHeader(options.widgetSettings);

                    // Use widget size if render area size isn't defined
                    options.widgetRenderAreaSizeInPx = options.widgetRenderAreaSizeInPx || CumulativeFlowDiagram.getWidgetSizeInPx(options.widgetSettings.size);

                    let chartSettings = this.parseCustomSettings(options.widgetSettings.customSettings.data);

                    // Fetch data to render chart
                    this.addSplitTiming("StartFetchData");
                    let historyPromise = this.cfdDataService.getCumulativeFlowHistory(chartSettings.chartDataSettings);
                    let boardColumnsPromise = this.cfdDataService.getBoardColumns(chartSettings.chartDataSettings.project, chartSettings.chartDataSettings.board);
                    let renderChartPromise = Q.all([historyPromise, boardColumnsPromise])
                        .spread((samplePoints: CFD_Contracts.CFDSamplePoint[], boardColumns: ChartingClient.Column[]) => {
                            this.addSplitTiming("EndFetchData");

                            // Only render if this is the most recent request
                            if (!options.cancelable.canceled) {
                                this.renderChart(samplePoints, boardColumns, chartSettings, options.widgetRenderAreaSizeInPx, options.isLightbox, options.animateChart);
                                this.logLoadedEvent(chartSettings, options.widgetRenderAreaSizeInPx);
                            }

                            return WidgetStatusHelper.Success();
                        });

                    this.setClickThroughLinkAsync(options.widgetSettings, renderChartPromise, options.cancelable);

                    return renderChartPromise;
                } else {
                    return WidgetStatusHelper.Success();
                }
            })
            .then(val => {
                this.addSplitTiming("EndRender");
                return val;
            }, e => {
                this.addSplitTiming("EndRender");

                if (AnalyticsExceptionParsing.recognizeAnalyticsException(e) === AnalyticsExceptionType.DataNotReady) {
                    this.isReady = false;
                    AnalyticsActionControl.createNotReadyActionControl(
                        this.getElement(),
                        options.widgetSettings);
                    return WidgetStatusHelper.Success();
                }
                else {
                    // We placed a link in our PlaceholderBoardUnsupportedError message
                    const isRichText = e instanceof PlaceholderBoardUnsupportedError;
                    return WidgetStatusHelper.Failure(ErrorParser.stringifyODataError(e), true /*isUserVisible*/, isRichText);
                }
            });
    }

    /**
     * Merges default settings into the given widgetSettings object.
     * @param widgetSettings to update.
     * @returns a promise that resolves when updating the settings is complete.
     */
    private setDefaultSettings(widgetSettings: WidgetContracts.WidgetSettings): IPromise<void> {
        this.addSplitTiming("StartSetDefaultSettings");
        const chartColorPalettes = ChartColorPalettes.getInstance();

        const dataSettings: CFD_Contracts.CumulativeFlowHistoryOptions = {
            project: this.webContext.project.id, // Default project is the current project
            team: this.teamContext.id, // Default team is the current team
            board: undefined,
            boardLane: null, // Default swimlane is the "All" option which is represented by null/undefined/empty string,
            timePeriod: { // Default time period is a Rolling Period
                identifier: CFD_Contracts.TimePeriodFieldIdentifiers.RollingPeriod,
                settings: CumulativeFlowDiagram.defaultTimePeriodDays
            },
            includeFirstBoardColumn: false // Default is to not include the first column
        };

        const customSettings: CFD_Contracts.CumulativeFlowDiagramSettings = {
            chartDataSettings: dataSettings,
            themeName: chartColorPalettes.getPaletteNames()[0] // Default is first color palette's invariant name
        };

        // Default board is the one for the lowest level backlog
        return this.teamDataService.getLowestLevelVisibleBoard(dataSettings.project, dataSettings.team)
            .then<void>(board => {
                // AX service placeholder board entries
                if (board.BoardId == null) {
                    const boardUrl = CumulativeFlowDiagram.getBoardUrl(
                        dataSettings.project,
                        dataSettings.team,
                        board.BoardName
                    );

                    const $boardLink = $("<a />")
                        .attr("href", boardUrl)
                        .text(board.BoardName);

                    // Using a link as the board name in the exception message
                    throw new PlaceholderBoardUnsupportedError($boardLink[0].outerHTML);
                }

                dataSettings.board = board.BoardId;

                // Set the widget name
                widgetSettings.name = StringUtils.format(WidgetResources.CumulativeFlowDiagram_TitleWithoutSwimlaneFormat,
                    this.teamContext.name,
                    board.BoardName);

                // Set custom settings
                widgetSettings.customSettings.data = JSON.stringify(customSettings);
                this.addSplitTiming("EndSetDefaultSettings");
            });
    }

    /**
     * Updates the rendered title and subtitle of the widget
     * @param settings - The widget settings
     */
    private updateHeader(settings: WidgetContracts.WidgetSettings): void {
        var chartSettings = this.parseCustomSettings(settings.customSettings.data);
        this.updateTitle(settings.name);
        this.updateSubtitle(chartSettings.chartDataSettings.timePeriod);
    }

    private updateTitle(newTitle: string): void {
        this.$title.text(newTitle);
        this.title = newTitle;
        this.addTooltipIfOverflow(this.$title);
    }

    private updateSubtitle(timePeriod: RadioSettingsFieldPickerSettings<number | string>): void {
        var subtitle;
        var cultureDateTimeFormat = CultureUtils.getDateTimeFormat();

        if (timePeriod.identifier === CFD_Contracts.TimePeriodFieldIdentifiers.RollingPeriod) {
            subtitle = (timePeriod.settings === 1)
                ? WidgetResources.TimePeriodSubtitleFormat_Singular
                : StringUtils.format(WidgetResources.TimePeriodSubtitleFormat_Plural, timePeriod.settings);
        } else {
            let date = DateSKParser.parseDateStringAsLocalTimeZoneDate(<string>timePeriod.settings);
            let dateString = cultureDateTimeFormat.ShortDatePattern != null
                ? DateUtils.format(date, cultureDateTimeFormat.ShortDatePattern)
                : date.toLocaleDateString();
            subtitle = StringUtils.format(WidgetResources.TimePeriodSubtitleFormat_StartDate, dateString);
        }

        this.$subtitle.text(subtitle);
        this.subtitle = subtitle;
    }

    /**
     * Transforms and prepares the provided data and visualizes it by rendering a CFD.
     * Renders a "no results" image instead if no sample points are provided.
     * @param samplePoints to visualize.
     * @param boardColumns of the sample points representing Kanban board columns.
     * @param chartSettings describing data parameters and chart aesthetics
     * @param widgetRenderAreaSizeInPx the chart should be rendered within
     * @param isLightbox indicates whether the widget is being rendered in a lightbox
     * @param animateChart determines whether or not the chart should animate when drawn
     */
    private renderChart(samplePoints: CFD_Contracts.CFDSamplePoint[],
        boardColumns: ChartingClient.Column[],
        chartSettings: CFD_Contracts.CumulativeFlowDiagramSettings,
        widgetRenderAreaSizeInPx: WidgetContracts.Size,
        isLightbox: boolean,
        animateChart: boolean): void {

        this.addSplitTiming("StartRenderChart");

        this.$chartContainer.empty();
        if (this.chart) {
            this.chart.dispose();
        }

        let series: Charts_Contracts.DataSeries[];
        if (samplePoints != null) {
            series = this.prepareDataSeries(samplePoints, boardColumns, chartSettings.chartDataSettings);
        }

        if (series == null || series.length === 0) {
            this.renderEmptyMessage(this.$chartContainer);
            this.latestRenderedChartOptions = null;
        } else {
            let showLegend = isLightbox;
            let hasProposedSeries = chartSettings.chartDataSettings.includeFirstBoardColumn && this.hasProposedSeries(samplePoints, boardColumns);
            this.latestRenderedChartOptions = this.getChartOptions(series, chartSettings, showLegend, animateChart, hasProposedSeries);
            this.mergeChartHostOptions(this.latestRenderedChartOptions, widgetRenderAreaSizeInPx, isLightbox);
            this.chart = Charts_Controls.create(this.$chartContainer, this.latestRenderedChartOptions);
        }

        this.addSplitTiming("EndRenderChart");
    }

    private logLoadedEvent(cfdSettings: CFD_Contracts.CumulativeFlowDiagramSettings, sizeInPx: WidgetContracts.Size) {
        this.publishLoadedEvent({
            "Width": sizeInPx.width,
            "Height": sizeInPx.height,

            "IncludeFirstBoardColumn": cfdSettings.chartDataSettings.includeFirstBoardColumn,
            "ThemeName": cfdSettings.themeName,

            "TimePeriodIdentifier": cfdSettings.chartDataSettings.timePeriod.identifier,
            "TimePeriodValue": cfdSettings.chartDataSettings.timePeriod.settings
        });
    }

    /**
     * Redraws chart using last known chart options at a different size.
     * Used to update chart aesthetics or size without fetching/preparing again.
     * @param newSize describing how large to draw the chart.
     * @param isLightbox indicates whether the widget is being rendered in a lightbox
     */
    private resizeChart(newSize: WidgetContracts.Size, isLightbox: boolean): void {
        if (this.latestRenderedChartOptions != null) {
            this.$chartContainer.empty();

            // Don't animate on redraw
            this.latestRenderedChartOptions.suppressAnimation = true;

            // Use new size
            this.mergeChartHostOptions(this.latestRenderedChartOptions, newSize, isLightbox);

            Charts_Controls.create(this.$chartContainer, this.latestRenderedChartOptions);
        }
    }

    private renderEmptyMessage($parent: JQuery): void {
        if (this.randomEmptyImageIndex == null) {
            this.randomEmptyImageIndex = Math.floor(Math.random() * EmptyChartHelper.NumberOfAvailableZeroResultImage);
        }

        EmptyChartHelper.showEmptyChartMessage($parent, this.randomEmptyImageIndex, WidgetResources.CumulativeFlowDiagram_emptyAltTextDescription, (openInNewWindow: boolean) => this.onClick(openInNewWindow));
    }

    private getChartOptions(series: Charts_Contracts.DataSeries[], settings: CFD_Contracts.CumulativeFlowDiagramSettings, showLegend: boolean, animateChart: boolean, hasProposedSeries: boolean): Charts_Contracts.CommonChartOptions {
        var xAxis = this.getXAxisOptions(settings.chartDataSettings.timePeriod);
        CFDSeriesColorAssigner.mergeThemeColorsIntoSeries(series, settings.themeName, hasProposedSeries);
        let userHasClickPermission: boolean = WidgetLinkHelper.canUserAccessWITQueriesPage ();

        let minCount = this.getMinValueOfSeries(series[0]);

        let chartOptions: Charts_Contracts.CommonChartOptions = {
            chartType: Charts_Contracts.ChartTypesConstants.StackedArea,
            legend: {
                enabled: showLegend
            },
            tooltip: {
                onlyShowFocusedSeries: true,
                reverseSeries: true  // We want to reverse the series display order to match the chart
            },
            xAxis: xAxis,
            yAxis: {
                min: minCount, // Scale down the first series of the chart (the "Done" state column)
                updateMinOnLegendClick: true, // Change the min value when a series is hidden/shown from user clicking the legend
                endOnTick: false, // Let the chart fill the whole area
                allowDecimals: false // Work Item counts are always whole numbers
            },
            series: series,
            suppressAnimation: !animateChart
        };

        if (userHasClickPermission) {
            chartOptions.click =  (clickEvent: Charts_Contracts.ClickEvent) => {
                const middleButton: number = 2;
                const openInNewWindow = clickEvent.ctrlKey || clickEvent.button === middleButton;
                this.onClick(openInNewWindow);
            }
        }

        return chartOptions;
    }

    private mergeChartHostOptions(chartOptions: Charts_Contracts.CommonChartOptions, size: WidgetContracts.Size, isLightbox: boolean): void {
        let headerHeight = 0;
        let bottomPadding = 0;
        if (!isLightbox) {
            headerHeight = CumulativeFlowDiagram.chartHostHeightAdjustment;
        }

        // By default, highchart adds some space below legends, when opened in lightbox, this space along with container space seems a bit more for PMs
        // Increase the host size, so space below legend will work as padding at the bottom.
        if (isLightbox) {
            bottomPadding = WidgetLightboxDialogConstants.BottomPaddingHeight;
        }

        chartOptions.hostOptions = {
            height: size.height - headerHeight + bottomPadding,
            width: size.width - CumulativeFlowDiagram.chartHostWidthAdjustment
        };
    }

    private onClick(openInNewWindow: boolean): void {
        if (this.clickThroughLink) {
            WidgetTelemetry.onWidgetClick(this.getTypeId(), "ClickThrough");
            openInNewWindow = openInNewWindow || WidgetLinkHelper.mustOpenNewWindow();
            this.navigateHandler(this.clickThroughLink, openInNewWindow);
        }
    }

    /**
     * Sets the click-through link of the widget.
     * @param settings to use to construct the click-through link.
     * @param renderChartPromise is the promise that resolves when rendering the chart is complete.
     * @param renderCancelable tells this method whether or not rendering has been canceled.
     */
    private setClickThroughLinkAsync(settings: WidgetContracts.WidgetSettings, renderChartPromise: IPromise<{}>, renderCancelable: Cancelable): void {
        this.addSplitTiming("StartSetClickThrough");

        var chartDataSettings = this.parseCustomSettings(settings.customSettings.data).chartDataSettings;

        // Don't set the click-through link until the chart associated with the link has been rendered
        renderChartPromise.then(() => {
            // Don't set the click-through link if rendering was canceled
            if (!renderCancelable.canceled) {
                this.clickThroughLink = CumulativeFlowDiagram.getBoardUrl(
                    chartDataSettings.project,
                    chartDataSettings.team,
                    chartDataSettings.board);
            }

            this.addSplitTiming("EndSetClickThrough");
        });
    }

    /**
     * Maps data to an array of charting data series.
     * Pads the data with 0s for dates missing values.
     * Assumes data is sorted by column id, then by date.
     * @param data - The data to map into series
     * @param boardColumns - The columns of the board represented by the CFD
     * @param rollingPeriod - The rolling period of the widget
     * @returns The data series rendered by the charting framework in descending column order.
     */
    private prepareDataSeries(data: CFD_Contracts.CFDSamplePoint[],
        boardColumns: ChartingClient.Column[],
        chartDataSettings: CFD_Contracts.CumulativeFlowHistoryOptions): Charts_Contracts.DataSeries[] {

        this.addSplitTiming("StartPrepareDataSeries");

        var gapFillValue = 0;

        // Analytics bases the dates of the data on account time zone,
        // so we need to base the start and end dates on account time zone as well.
        var endDate = this.todayInAccountTimeZone;

        // We don't want to adjust the hours and minutes (which should stay as midnight) according to DST rules
        var startDate: Date = chartDataSettings.timePeriod.identifier === CFD_Contracts.TimePeriodFieldIdentifiers.RollingPeriod
            ? DateUtils.addDays(endDate, -chartDataSettings.timePeriod.settings, true /* adjustDSTOffset */)
            : DateSKParser.parseDateStringAsLocalTimeZoneDate(<string>chartDataSettings.timePeriod.settings);

        // Transform array of sample points to dictionary of column IDs to series values
        // Pad series values with zeros where there are data gaps
        var colIdToSeriesVals: IDictionaryStringTo<number[]> = {};
        for (var i = 0, id: string; i < data.length; ++i) {
            var missingDays = 0;

            // The dates returned by Analytics are in account time zone.
            // When used directly to construct JavaScript date objects they are treated as UTC.
            // We want to use the dates as is, so we parse the date
            // strings as though they were in the local time zone for comparison purposes.
            var currentDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(data[i].SampleDate);

            // Are we now looking at a new series of values?
            if (id !== data[i].ColumnId) {
                // Create a data series
                id = data[i].ColumnId;

                colIdToSeriesVals[id] = new Array<number>(0);

                // Look for gaps between the start date and the earliest date in the new series
                missingDays = DateUtils.daysBetweenDates(startDate, currentDate, true);
            } else {
                // Look for holes between dates in the series
                var previousDate = DateSKParser.parseDateStringAsLocalTimeZoneDate(data[i - 1].SampleDate);
                missingDays = (DateUtils.daysBetweenDates(previousDate, currentDate, true)) - 1;
            }

            // Fill in gaps
            for (var j = 0; j < missingDays; ++j) {
                colIdToSeriesVals[id].push(gapFillValue);
            }

            // Add current value to series
            colIdToSeriesVals[id].push(data[i].Count);
        }

        // Back-fill series to end date
        var expectedNumberOfValues = DateUtils.daysBetweenDates(startDate, endDate, true) + 1;
        var keys = Object.keys(colIdToSeriesVals);
        keys.forEach(key => {
            var missingDays = expectedNumberOfValues - colIdToSeriesVals[key].length;
            for (var i = 0; i < missingDays; ++i) {
                colIdToSeriesVals[key].push(gapFillValue);
            }
        });

        // Map series values into series in the order of their associated columns
        var orderedBoardColumns = CumulativeFlowDiagram.filterAndOrderBoardColumns(boardColumns, startDate, chartDataSettings.includeFirstBoardColumn);
        var series: Charts_Contracts.DataSeries[] = [];
        orderedBoardColumns.forEach(column => {
            // Only include columns that have associated data for the rolling period
            if (colIdToSeriesVals[column.ColumnId] != null) {
                series.push({
                    name: CumulativeFlowDiagram.getAdjustedBoardColumnName(column),
                    data: colIdToSeriesVals[column.ColumnId]
                });
            }
        });

        this.addSplitTiming("EndPrepareDataSeries");
        return series;
    }

    /**
     * Filters out columns deleted before the start date and orders the remaining columns.
     * Order:
     *     - Done state column
     *     - Deleted columns (from most recently deleted to earliest)
     *     - Active columns (from last to first by column order)
     * @param boardColumns - The complete list of columns of a board
     * @param startDate - The start date of the rolling period
     * @param includeFirstColumn - Whether or not to include the first board column in the results
     * @returns an ordered array of columns
     */
    private static filterAndOrderBoardColumns(boardColumns: ChartingClient.Column[], startDate: Date, includeFirstColumn: boolean): ChartingClient.Column[] {
        // Filter columns into 'active' and 'deleted' removing columns that were deleted before the rolling period start date
        var deletedColumns: ChartingClient.Column[] = [];
        var activeColumns = boardColumns.filter(column => {
            var deletedDate = DateUtils.parseDateString(column.LatestRevisedDate);

            // A value other than "end of time" means the column is deleted
            var columnIsDeleted = !DateUtils.equals(deletedDate, CumulativeFlowDiagram.endOfTime);

            // Extract columns deleted after the start date
            if (columnIsDeleted && DateUtils.defaultComparer(deletedDate, startDate) >= 0) {
                deletedColumns.push(column);
            }

            return !columnIsDeleted;
        });

        // Order deleted columns by deletion date (latest to earliest)
        deletedColumns.sort((a, b) => {
            var deletedDateA = DateUtils.parseDateString(a.LatestRevisedDate);
            var deletedDateB = DateUtils.parseDateString(b.LatestRevisedDate);
            return DateUtils.defaultComparer(deletedDateB, deletedDateA);
        });

        // Order active columns by column order (last to first)
        activeColumns.sort((a, b) => {
            return b.ColumnOrder - a.ColumnOrder;
        });

        if (!includeFirstColumn) {
            // A kanban board requires a New state column and a Done state column, thus
            // activeColumns will always contain at least the Done state board column and first board column.
            // After sorting, the last entry in the array is the first board column.
            activeColumns.pop();
        }

        let orderedColumns = activeColumns.slice();

        // Insert sorted deleted columns immediately after the Done state column of the ordered active columns
        let spliceArgs = (<any[]>[1, 0]).concat(deletedColumns); // [startIndex, deleteCount, ...items]
        orderedColumns.splice.apply(orderedColumns, spliceArgs);

        return orderedColumns;
    }

    /**
     * Gets an adjusted name for a board column.
     * For example, deleted columns get "(deleted)" appended to their name.
     * @param boardColumn for which to get the adjusted name.
     * @returns the adjusted board column name.
     */
    private static getAdjustedBoardColumnName(column: ChartingClient.Column): string {
        let columnName = column.ColumnName;

        // A value other than "end of time" means the column is deleted
        var deletedDate = DateUtils.parseDateString(column.LatestRevisedDate);
        var columnIsDeleted = !DateUtils.equals(deletedDate, CumulativeFlowDiagram.endOfTime);

        // Append "(deleted)" to the name of deleted columns
        if (columnIsDeleted) {
            columnName += ` ${WidgetResources.CumulativeFlowDiagram_DeletedColumnNameSuffix}`;
        }

        return columnName;
    }

    private getMinValueOfSeries(series: Charts_Contracts.DataSeries): number {
        let min = undefined; // Highcharts default

        if (series != null && series.data != null && series.data.length > 0) {
            var data: number[] = <number[]>series.data;

            // Nulls in the data are treated as 0, undefined as NaN.
            min = Math.min.apply(null, data);
        }

        return min;
    }

    private getXAxisOptions(timePeriod: RadioSettingsFieldPickerSettings<string | number>): Charts_Contracts.AxisOptions {
        var labels: Date[] = [];

        // NOTE: Analytics returns dates based on account timezone, so we base the labels on midnight today in the account timezone
        var today = this.todayInAccountTimeZone;
        var daysAgo: number = timePeriod.identifier === CFD_Contracts.TimePeriodFieldIdentifiers.RollingPeriod
            ? <number>timePeriod.settings
            : DateUtils.daysBetweenDates(today, DateSKParser.parseDateStringAsLocalTimeZoneDate(<string>timePeriod.settings), true);
        var date = DateUtils.addDays(today, -daysAgo, true /* adjustDSTOffset */);

        for (var i = 0; i <= daysAgo; ++i) {
            labels.push(date);
            date = DateUtils.addDays(date, 1, true /* adjustDSTOffset */);
        }

        var axis: Charts_Contracts.AxisOptions = {
            labelValues: labels,
            labelFormatMode: Charts_Contracts.LabelFormatModes.DateTime_DayInMonth,
            renderToEdges: true
        };

        return axis;
    }

    /**
     * Returns true if there is data from the proposed column present
     * @param samplePoints {CFD_Contracts.CFDSamplePoint[]} The sample points for the CFD
     * @param columns {ChartingClient.Column[]}
     */
    private hasProposedSeries(samplePoints: CFD_Contracts.CFDSamplePoint[], columns: ChartingClient.Column[]): boolean {
        // The first column is "proposed"
        let proposedColumn = columns.filter(c => c.ColumnOrder === 0)[0];
        return !!proposedColumn && samplePoints.some(sp => sp.ColumnId === proposedColumn.ColumnId);
    }
}

SDK.VSS.register("dashboards.CumulativeFlowDiagram", () => CumulativeFlowDiagram);
SDK.registerContent("dashboards.cumulativeFlowDiagram-init", (context) => {
    return Controls.create(CumulativeFlowDiagram, context.$container, context.options);
});
