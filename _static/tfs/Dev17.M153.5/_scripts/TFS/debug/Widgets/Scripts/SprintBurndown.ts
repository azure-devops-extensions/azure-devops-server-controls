import Q = require("q");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import ActionRequiredControl = require("Dashboards/Scripts/ActionRequiredControl");
import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import HostUIActions = require("Presentation/Scripts/TFS/TFS.Host.UI.Actions");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");

import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Context = require("VSS/Context");
import Dialogs = require("VSS/Controls/Dialogs");
import Host = require("VSS/Events/Action");
import Notifications = require("VSS/Controls/Notifications");
import SDK = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Locations = require("VSS/Locations");
import * as LWP from "VSS/LWP";
import { IVssThemeService } from "VSS/Platform/Theming";

import Resources = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Widget_Utilities = require("Widgets/Scripts/TFS.Widget.Utilities");
import VSS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import Widget_Utils_Sprint = require("Widgets/Scripts/Shared/TFS.Widget.Utils.Sprint");

export interface ISprintBurndownWidget {
    initialize();

    loadNeedsConfiguration(): void;

    preloadImage(url: string): Q.IPromise<void>;

    render(options: ISprintBurndownWidgetRenderOptions);

    showLargeChart();
}

export interface ISprintBurndownWidgetRenderOptions {
    imageWidth: number;
    imageHeight: number;
    imageUrl: string;

    sprintName: string;
    sprintDateRange: string;
    iterationPath: string;

    onImageClick: () => boolean;
}

/**
 * The sprint burndown widget
 * 
 * Note that business logic goes in SprintBurndownController.
 */
export class SprintBurndownWidget extends VSS_Control_BaseWidget.BaseWidgetControl<Dashboard_Shared_Contracts.WidgetOptions>
                                  implements ISprintBurndownWidget, Dashboards_WidgetContracts.IWidget {

    private chartImageUrlBuilder: IChartImageUrlBuilder;
    private controller: SprintBurndownController;

    private $image: JQuery;
    private $largeImage: JQuery;

    private largeChartDialog: Dialogs.ModalDialog;

    private sprintName: string;
    private iterationPath: string;

    constructor(options?: any) {
        super(options);

        this.controller = new SprintBurndownController({
            widget: this,
        });

        this.chartImageUrlBuilder = new ChartImageUrlBuilder();
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {any} options for the control.
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "sprint-burndown"
        }, options));
    }

    public preload(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(widgetSettings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return this.controller.initialize().then<Dashboards_WidgetContracts.WidgetStatus>((data) => {
            this.publishLoadedEvent({});
            return data;
        });
    }

    public loadNeedsConfiguration(): void{
        if(!this.isDisposed()) {
            var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            var linkToSetIterations = tfsContext.getActionUrl("", "work", { area: "admin", team: null, project: tfsContext.contextData.project.name, _a: "iterations" } as TFS_Host_TfsContext.IRouteData);
            var actionRequiredOptions = <Dashboard_Shared_Contracts.IActionRequiredControlOptions>{
                titleName: Resources.SprintBurndown_GenericTitle,
                message: Resources.SprintBurndown_SetupIterationsMessage,
                ariaLabel: Resources.SprintBurndown_SetupIterationsMessage,
                linkText: Resources.SprintBurndown_SetupIterationsLink,
                linkUrl: linkToSetIterations,
                // We're not actually using an image, but the css rules also use this for applying text layout
                cssClass: "with-loading-img"
            };
    
            Controls.BaseControl.createIn(ActionRequiredControl.ActionRequiredControl, this.getElement(), actionRequiredOptions);
        }
    }
    
    public preloadImage(url: string): Q.IPromise<void> {
        var deferred = Q.defer<void>();

        var image = new Image();

        image.onload = () => {
            deferred.resolve(undefined);
        };

        image.onerror = (e) => {
            deferred.reject(e);
        };

        image.src = url;

        return deferred.promise;
    }

    public render(options: ISprintBurndownWidgetRenderOptions) {
        if(!this.isDisposed()) { //As widget rendering is invoked async, no-op after disposal has occurred.
            Diag.logTracePoint("ChartBurndown._drawLayout.start");
            
            this.sprintName = options.sprintName;
            this.iterationPath = options.iterationPath;
            
            var $sprintName = $("<h2/>").addClass(TFS_Dashboards_Constants.WidgetDomClassNames.Title).text(options.sprintName);
            var $sprintDateRange = $("<div/>")
                .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.SubTitle)
                .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.TruncatedTextWithEllipsis)
                .text(options.sprintDateRange)
                .appendTo($sprintName);
            
            this.$image = this.createImageElement(options.imageWidth, options.imageHeight);
            this.$image
                .attr("tabIndex", 0)
                .attr("alt", Resources.SprintBurndown_GenericTitle)
                .attr("src", options.imageUrl)          
                .addClass("sprint-burndown-chart")
                .click(options.onImageClick);
    
            Utils_UI.accessible(this.$image);
    
            this.getElement()
                .addClass(TFS_Dashboards_Constants.WidgetDomClassNames.WidgetContainer) // This class enables the widget to get styles from the widget sdk
                .append($sprintName)
                .append(this.$image);
        }        
    }

    private createImageElement(width: number, height: number): JQuery {
        return $("<img/>")
            .attr("width", width)
            .attr("height", height);
    }

    public dispose() {
        super.dispose();

        this.$largeImage = null;
        this.largeChartDialog = null;
    }

    public showLargeChart() {
        Diag.logTracePoint("ChartBurndown.showLargeChart.start");

        var $dialogHost = $("<div />");
        var $errorMessage = $("<div />").appendTo($dialogHost);
        var $parentDiv = $("<div />");
        var $window = $(window);
        var totalWidth = $window.width();
        var totalHeight = $window.height();
        var chartWidth = Math.floor(totalWidth * 65 / 100);
        var chartHeight = Math.floor(totalHeight * 65 / 100);
        var url = this.chartImageUrlBuilder.build(this.iterationPath, chartWidth, chartHeight, true);
        var $img = this.createImageElement(chartWidth, chartHeight);

        $img.attr("src", url);
        $img.hide()
            .bind("load",(event) => {
                $parentDiv.removeClass("in-progress-container");
                $img.show();
                Diag.logTracePoint("ChartBurndown.largeImageLoad.complete");
            })
            .bind("error",(event) => {
                // This generally shouldn't happen, but clear the 'in progress' spinner.
                $parentDiv.removeClass("in-progress-container");
                $errorMessage.text(Resources.SprintBurndownWidget_NoIterationsSetForTeamMessage);
            });

        $parentDiv.height(chartHeight)
            .width(chartWidth)
            .addClass("large-chart-container")
            .addClass("in-progress-container");

        $parentDiv.append($img);
        $dialogHost.append($parentDiv);

        this.$largeImage = $img;

        this.largeChartDialog = Dialogs.show(Dialogs.ModalDialog, {
            content: $dialogHost,
            width: "auto",
            height: "auto",
            resizable: false,
            buttons: [],
            title: Utils_String.format(Resources.SprintBurndownWidget_DialogTitle, this.sprintName.toUpperCase()),
            close: () => {
                this.largeChartDialog = null;
                $(document).unbind("click.tfs.agile.chart");
            },
            open: () => {
                // Prevent click from closing the dialog
                $dialogHost.parent().click(() => {
                    return false;
                });

                // Close the dialog when the user clicks outside it
                $(document).bind("click.tfs.agile.chart",(event) => {
                    if (event.which === 1 && this.largeChartDialog) {
                        this.largeChartDialog.close();
                    }
                });
            }
        });

        // Add an error region to the large chart container
        var messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $errorMessage, { closeable: false });

        // Give the dialog focus
        this.largeChartDialog.getElement().parent().focus();
    }
}

export interface ISprintBurndownControllerOptions {
    widget: ISprintBurndownWidget;

    webContext?: Contracts_Platform.WebContext;
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    sprintCapacitySummary?: Widget_Utils_Sprint.ISprintCapacitySummary;
}

interface IChartOptions {
    Width: number;
    Height: number;
    ShowDetails: boolean;
    Title: string;
    Foreground?: string;
    Background?: string;
    Line?: string;
}

interface IChartUrlParameters {
    chartOptions: string;
    counter: number;
    includeVersion: boolean;
    iterationPath: string;
    teamId: string;
}

export interface IChartImageUrlBuilder {
    build(iterationPath: string, width: number, height: number, showLabels: boolean): string;
}

export class ChartImageUrlBuilder {
    private webContext: Contracts_Platform.WebContext;
    private teamContext: Contracts_Platform.TeamContext;

    private counter = 0;

    constructor(webContext?: Contracts_Platform.WebContext, teamContext?: Contracts_Platform.TeamContext) {
        this.webContext = webContext || Context.getDefaultWebContext();
        this.teamContext = teamContext || TFS_Dashboards_Common.getDashboardTeamContext();
    }

    public build(iterationPath: string, width: number, height: number, showLabels: boolean): string {
        this.counter += 1;

        var themeService: IVssThemeService = LWP.getLWPService("IVssThemeService");
        const curTheme = themeService ? themeService.getCurrentTheme() : undefined;
        const isDarkTheme = curTheme ? curTheme.isDark : false;

        var chartOptions: IChartOptions = {
            Width: width,
            Height: height,
            ShowDetails: showLabels,
            Title: "",
            Foreground: isDarkTheme ? "#DEDEDE" : "#212121",
            Background: isDarkTheme ? "#201F1E" : "#FFFFFF",
            Line: isDarkTheme ? "#999999" : "#DDDDDD"
        };

        return Locations.urlHelper.getMvcUrl({
            area: "api",
            action: "Burndown",
            controller: "teamChart",
            team: this.teamContext.id,
            queryParams: {
                chartOptions: Utils_Core.stringifyMSJSON(chartOptions),
                counter: `${this.counter}`,
                includeVersion: "true",
                iterationPath: iterationPath,
                teamId: this.teamContext.id
            }
        });

    }
}

export interface SprintBurndownControllerOptions {
    widget: ISprintBurndownWidget;
    sprintCapacitySummary?: Widget_Utils_Sprint.ISprintCapacitySummary;
    chartImageUrlBuilder?: IChartImageUrlBuilder;
}

/**
 * Controller for the sprint burndown widget
 * 
 * This should contain all this business logic for the widget. All view code 
 * should go in SprintBurndownWidget to ensure unit-testability of this class.
 */
export class SprintBurndownController {
    public static enhancementTypeName: string = "tfs.agile.chart.burndown";

    private static imageWidth = 300;
    private static imageHeight = 85;

    private widget: ISprintBurndownWidget;
    private sprintCapacitySummary: Widget_Utils_Sprint.ISprintCapacitySummary;
    private chartImageUrlBuilder: IChartImageUrlBuilder;

    private sprintName: string;
    private sprintDateRange: string;
    private iterationPath: string;

    constructor(options: SprintBurndownControllerOptions) {
        this.widget = options.widget;

        this.sprintCapacitySummary = options.sprintCapacitySummary || Widget_Utils_Sprint.getSprintCapacitySummarySingleton();
        this.chartImageUrlBuilder = options.chartImageUrlBuilder || new ChartImageUrlBuilder();
    }

    public initialize(): IPromise<Dashboards_WidgetContracts.WidgetStatus> { 
        Diag.logTracePoint("ChartBurndown.initialize.start");
        return this.initializeWithData();
    }

    /**
     * Initialize the widget with data.
     */
    private initializeWithData(): IPromise<Dashboards_WidgetContracts.WidgetStatus> { 
       return this.sprintCapacitySummary.get()
            .then<Dashboards_WidgetContracts.WidgetStatus>(
            (data) => {
                this.processCapacitySummaryData(data);
                return WidgetHelpers.WidgetStatusHelper.Success();
            },
            (e) => {
                this.onComplete();

                let isHtmlError = Widget_Utils.ErrorParser.isHtmlError(e);
                let error = isHtmlError ? e.html : TFS_Widget_Utilities.ErrorParser.stringifyError(e);
                return WidgetHelpers.WidgetStatusHelper.Failure(error, true /* isUserVisible */, isHtmlError) as any;
            });
    }

    public onComplete() {
        Diag.logTracePoint("ChartBurndown.initialize.complete");
    }

    public processCapacitySummaryData(data: Widget_Utils_Sprint.ISprintCapacitySummaryData) {

        // no iterations configured.
        if (Widget_Utils.isUndefinedOrNull(data) || (data && !data.configured)) {
            this.widget.loadNeedsConfiguration();
        }

        else {
            this.sprintName = data.value.sprintName || "";
            this.sprintDateRange = data.value.sprintDateRange || "";

            var iterationPath = data.value.iterationPath;

            var imageUrl = this.chartImageUrlBuilder.build(iterationPath, SprintBurndownController.imageWidth, SprintBurndownController.imageHeight, false);

            this.widget.preloadImage(imageUrl)
                .then(() => {
                    this.widget.render({
                        imageWidth: SprintBurndownController.imageWidth,
                        imageHeight: SprintBurndownController.imageHeight,
                        imageUrl: imageUrl,

                        sprintName: this.sprintName || "",
                        sprintDateRange: this.sprintDateRange || "",
                        iterationPath: iterationPath,

                        onImageClick: () => this._onImageClick()
                    });
                }, () => {
                    this.widget.loadNeedsConfiguration();
                })
                .then(() => this.onComplete());
        }
    }

    /**
     * Handles onClick event for the burndown image
     */
    public _onImageClick() {
        this.widget.showLargeChart();

        return false;
    }
}

SDK.VSS.register("dashboards.sprintBurndown", () => SprintBurndownWidget);
SDK.registerContent("dashboards.sprintBurndown-init", (context) => {
    return Controls.create(SprintBurndownWidget, context.$container, context.options);
});
