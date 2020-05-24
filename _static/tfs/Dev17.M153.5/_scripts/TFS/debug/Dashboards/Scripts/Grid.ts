///<amd-dependency path="gridster"/>
///<reference path='../../Presentation/Scripts/gridster.d.ts' />
///<reference types="jquery" />
///<reference types="q" />

//This file contains the Dashboard Grid control, and supporting implementation/interfaces for using it.

import Q = require("q");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import Dashboards_Control_WidgetHost = require("Dashboards/Scripts/WidgetHost");
import Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Errors = require("Dashboards/Scripts/Notifications");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import {WidgetSource} from  "Dashboards/Scripts/WidgetSource";
import { PinArgs } from "Dashboards/Scripts/Pinning.PushToDashboardInternal";

import TFS_Server_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_RestClient = require("TFS/Dashboards/RestClient");
import {WidgetSizeConverter} from "TFS/Dashboards/WidgetHelpers";

import Performance = require("VSS/Performance");
import Controls = require("VSS/Controls");
import Context = require("VSS/Context");
import Controls_Notifications = require("VSS/Controls/Notifications");
import Diag = require("VSS/Diag");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import { TelemetryEventData } from "VSS/Telemetry/Services";

/**
 * This interface let you pass grid information. Mostly used for the communication class, it allows
 * to pass the grid without the overhead of Gridster. This interface is intended to be small by
 * passing only the unique identifier of the dashboard and its collection of widgets.
 */
export interface IDashBoardGridData {
    /**
     * Dashboard Unique identifier
     */
    id: string;

    /**
     * Collection of Widget
     */
    widgets: Array<TFS_Dashboards_Contracts.Widget>;
}

/**
 * Communications gateway. Every communication must pass throught the dashboard communication hub to
 * talk to the back-end server.
 */
export interface IDashboardController {
    /**
     * Send to the server every widgets position.
    * @param {dashboard} Dashboard to send to server
    * @param {errorReason} Action name to show in the collision error
     * @return {Dashboard} The server response that contain the dashboard response
     */
    replaceDashboard(dashboard: TFS_Dashboards_Contracts.Dashboard, errorReason: string): IPromise<TFS_Dashboards_Contracts.WidgetsVersionedList>;
    /**
     * Add a single widget to the server.
     * @param {Widget} The widget information to be saved
     * @return {WidgetResponse} The server response that contain the unique identifier of the widget
     */
    addWidget(widget: TFS_Dashboards_Contracts.Widget): IPromise<TFS_Dashboards_Contracts.WidgetResponse>;

    getDashboard(dashboardId: string, forceReload?: boolean): IPromise<void>;


    dashboardData: TFS_Dashboards_Contracts.Dashboard;

    /**
     * Update a single widget to the server.
     * @param {Widget} The widget information to be saved
    */
    updateWidget(widget: TFS_Dashboards_Contracts.Widget): IPromise<TFS_Dashboards_Contracts.Widget>;

}

/**
 * Contains information about the WidgetHost and its related HtmlElement
 */
export interface IDashboardsGridWidgetHostContainer {
    /**
     * WidgetHost is the container
     */
    widgethost: Dashboard_Shared_Contracts.IWidgetHost;

    /**
     * Html Element that is related to the widgethost
     */
    element: JQuery;
}

/**
 * Represent coordinate of a widget against the grid. This is based on a scale starting at 1 (not 0).
 */
export interface IGridCoordinate {
    row: number;
    column: number;
}

/**
 * Grids settings. This is not Gridster's setting but the abstracted Grid that the Dashboard owns.
 */
export class DashboardGridSettings {
    /**
     * The minimum horitontal placeholder for widgets
     */
    minimumColumns: number;
    /**
     * The maximum horizontal placeholder of widgets
     */
    maximumColumns: number;
    /**
     * The minimum vertical placeholder of widgets
     */
    minimumRows: number;
    /**
     * Margin between widget
     */
    horizontalMargin: number;
    /**
     * Margin between widget
     */
    verticalMargin: number;
    /**
     * Default width of a 1x1 widget
     */
    defaultWidgetWidth: number;
    /**
     * Default height of a 1x1 widget
     */
    defaultWidgetHeight: number;

    /*
    * Set default values
    */
    constructor() {
        this.minimumColumns = 2;
        this.maximumColumns = 4;
        this.minimumRows = 2;
        this.horizontalMargin = WidgetSizeConverter.GetWidgetMarginWidth() / 2;
        this.verticalMargin = WidgetSizeConverter.GetWidgetMarginHeight() / 2;
        this.defaultWidgetWidth = WidgetSizeConverter.GetWidgetWidth();
        this.defaultWidgetHeight = WidgetSizeConverter.GetWidgetHeight();
    }
}

export interface IDashboardGrid {
    /**
     * Add a widget into the dashboard
     */
    addWidget: (widget: TFS_Dashboards_Contracts.Widget, source: WidgetSource) => IPromise<TFS_Dashboards_Contracts.Widget>;

    /**
     * Add multiple widgets to the dashboard.
     */
    addWidgets: (widget: TFS_Dashboards_Contracts.Widget[]) => void;

    /**
    * Update widget state by providing its settings
    */
    refreshWidgetSettings: (widgetId: string, settings: Dashboard_Shared_Contracts.ISettings) => void;

    /**
     * This method is called by the one that contain the Grid (for example the View) when the mode change
     * @param {boolean} isEditMode : True if edit mode; False if view mode
     */
    onModeChange(isEditMode: boolean);

    /**
     * Notifies the grid whether it has been obscured by something, such as a dialog or dashboard blade, so it can take any necessary actions.
     * @param {boolean} isObscured - True if the grid is hidden underneath a dialog, curtain, blade, etc.
     */
    setObscured(isObscured: boolean);

    /**
    *   This method is called by the container when the dashboard has finished loading so that the grid can perform any post operations as needed.
    */
    onDashboardLoaded: () => void;

    /** Destroy the Grid control and visual tree. */
    dispose: () => void;

    /**
    * Get the set of widgets from the grid.
    */
    getWidgets: () => IDashboardsGridWidgetHostContainer[];

    /**
     * Check if widget settings has been resized but not visually updated yet
     */
    widgetResizing(widgetId: string): boolean;

    /** Returns true if the user is currently interacting with the grid */
    isUserDragging(): boolean;

    /** Returns the number of widgets that were in the viewport at initial load time (and therefore get fully loaded right away). */
    getCountOfWidgetsInInitialLoad(): number;

    /** Returns the number of widgets that were in the viewport at initial load time (and therefore get fully loaded right away). */
    getCountOfFirstPartyWidgetsInInitialLoad(): number;
}

export interface DashboardGridOptions {


    /**
     * permissions container for the dashboard.
     */
    dashboardPermission?: Dashboard_Shared_Contracts.IDashboardPermissions;

    /**
    * Performance telemetry scenarios for the dashboard.
    */
    telemetryScenarios?: Performance.IScenarioDescriptor[];

    /**
     * Call the configuration for a WidgetHost
     * @param widgetHost - The widgethost that contain the widget to configure
     */
    configureWidget?: (widgetHost: Dashboard_Shared_Contracts.IWidgetHost) => void;

    /**
    *  Callback triggered each time a widget finished rendered
    */
    widgetRenderedCallback?: (widget: Dashboard_Shared_Contracts.IWidgetHost) => void;

    /**
    *  Callback triggered each time a widget is start the drag
    */
    widgetStartDragCallback?: () => void;

    /**
    *  Callback triggered each time a widget is done with the drag
    */
    widgetDoneDragCallback?: () => void;

    /**
    *  Callback triggered each time a widget is removed from the grid
    */
    widgetRemoveCallback?: (Widget: TFS_Dashboards_Contracts.Widget) => void;

    /**
     * Get the view mode from the Dashboard View. Using boolean instead of the "DashboardMode" because
     * not sure if we want to expose DashboardMode.
     * @returns {boolean} : True if Edit Mode; False if View Mode
     */
    isEditMode?: () => boolean;

    /**
     * Get the container width that is visible (full width - menu). This is a method because the width can change depending
     * of the resize of the window since the initialization
     * @returns {number} Pixel of the container of the Grid
     */
    getVisibleWidthSize?: () => number;

    controller?: IDashboardController;

    /**
     * Toggle Open or Close the blade menu
     * @param {boolean} open :True = Open, False = Close
     */
    toggleBladeMenu?: (open: boolean) => void;

    /**
     * Indicate if the blade menu is open
     * @returns {boolean} : True if Closed; False if opened (can be opened or in transition)
     */
    isBladeMenuClosed?: () => IPromise<boolean>;

    /** callback after modifying widgets on dashboard */
    widgetsModifiedCallback?: (args: PinArgs) => void;
}

/**
 * Concrete Rest class for communication
 */
export class DashboardController implements IDashboardController {
    /**
     * Auto-generated Dashboard's Rest client
     */
    private httpClient: TFS_Dashboards_RestClient.DashboardHttpClient;

    private dashboardGroupId: string;

    private projectId: string;

    public dashboardData: TFS_Dashboards_Contracts.Dashboard;


    public _savingPromise: IPromise<any>;
    public _saving: boolean = false;

    /**
     * Create the Http Client for Rest calls
     */
    constructor(groupId: string) {
        this.httpClient = TFS_Dashboards_Common.DashboardHttpClientFactory.getClient();
        this.dashboardData = <TFS_Dashboards_Contracts.Dashboard>{};
        this.dashboardGroupId = groupId;

        var context = Context.getDefaultWebContext();
        this.projectId = context.project == undefined ? null : context.project.id;
    }

    /**
     * Get data for the dashboard from data island or rest service.
     * If URL doesn't contain dashboard ID and forcereload is false (default) this will load from data island.
     * @param dashboardId
     * @param forceReload reloads from server if true, defaults to false
     */
    public getDashboard(dashboardId: string, forceReload: boolean = false): IPromise<void> {
        // If saving, chain and execute after previous save is done
        if (this._saving) {
            return this._savingPromise.then(() => getData());
        }

        var getData = () => {
            var httpClient = TFS_Dashboards_Common.DashboardHttpClientFactory.getClient();

            var promise = Q.defer<void>();
            httpClient.getDashboard(
                TFS_Dashboards_Common.getTeamContext(),
                dashboardId).then(response => {
                    this.dashboardData = response;
                    promise.resolve(null);
                }, error => {
                    promise.reject(error);
                });
            return promise.promise;
        }

        // if we are entering through our landing page .i.e. through the _dashboards url, we pull the widget from the island.
        if (!forceReload &&
            TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard() === dashboardId) {
            var data = TFS_Dashboards_Common.DashboardPageExtension.getWidgetsFromDataIsland();
            if (data && data.id === dashboardId) {
                this.dashboardData = data;
                return Q.resolve<void>(null);
            }
            else {
                return getData();
            }
        }
        // in all other cases including switching of dashboards and refresh on bookmarkable pages (that contain #dashboardId fragments), we pull the dashboard from the server.
        else {
            return getData();
        }
    }


    /**
    * Send to the server every widgets position.
    * @param {dashboard} Dashboard to send to server
    * @param {errorReason} Action name to show in the collision error
    * @return {Dashboard} The server response that contain the dashboard response
    */
    public replaceDashboard(dashboard: TFS_Dashboards_Contracts.Dashboard, errorReason: string):
        IPromise<TFS_Dashboards_Contracts.WidgetsVersionedList> {

        // Cloning dashboard state to be able to precisely send to server what was asked
        // This is a deep-copy of an object that works slightly faster than jquery extend
        // (date handling is not great, but we don't have any date fields here)
        var clonedDashboard = <TFS_Dashboards_Contracts.Dashboard>JSON.parse(JSON.stringify(dashboard));
        // If already saving, chain and execute after previous save is done
        if (this._saving) {
            return this._savingPromise.then(() => this.replaceDashboard(clonedDashboard, errorReason));
        }

        this._saving = true;

        Diag.Debug.logInfo("Sending every widgets of the Dashboard to the server VIA Rest API");
        TFS_Dashboards_Errors.DashboardMessageArea.clearMessage();

        // Using stateful internal widget etag from previous operation
        // When server updates widget-level etag as a result of previous operation, we apply it to next one
        // this can happen when moving/deleting widgets, which increments their internal etag
        // If another user updates a widget in between our updates, we'll get a conflict, since entire payload is sent
        clonedDashboard.widgets.forEach(widgetToSave => {
            var currentWidgets = this.dashboardData.widgets.filter((widget) => { return widget.id === widgetToSave.id });
            if (currentWidgets.length > 0) {
                widgetToSave.eTag = currentWidgets[0].eTag;
            }
        });

        this._savingPromise = this.httpClient.replaceWidgets(
            clonedDashboard.widgets, // Using cloned dashboard at the time of the call
            TFS_Dashboards_Common.getTeamContext(),
            this.dashboardData.id,
            this.wrapETagHeader(this.dashboardData.eTag) // Using most current etag from last operation
        );

        this._savingPromise.then(
            (data) => {
                // Saving etag for the next operation
                this.dashboardData.eTag = this.parseETagHeader(data.eTag[0]);
                this.dashboardData.widgets = data.widgets;
                this._saving = false;
            },
            err => {
                this._saving = false;
                this.displayError(err, errorReason);

                return Q.reject(err);
            }
        );

        return this._savingPromise;
    }

    public displayError(err: any, errorReason: string) {
        if (err.status === 409) {
            let message = Utils_String.format(Dashboards_Resources.ErrorMessage_UpdateWidgetPositionConflict,
                errorReason,
                Utils_String.format(
                    "<a onclick='location.reload(true)' href='{0}'>{1}</a>",
                    window.location.href, Dashboards_Resources.ErrorMessage_UpdateWidgetPositionConflict_Refresh)
            );

            TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, message, true);
        }
        else if (err.status === 403) {
            var refreshPage = Utils_String.format("<a onclick='location.reload(true)' href='{0}'>{1}</a>",
                window.location.href,
                Dashboards_Resources.ManageDashboardsDialog_RefreshLink);
            let message = Utils_String.format(Dashboards_Resources.Error_DashboardOutOfSync, refreshPage);

            TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, message, true);
        }
        else if (err.status === 500)
        {
            // check if this is the ax related exception.
            const axServiceUnavailableCode = "VS403281";
            const codePrepend = axServiceUnavailableCode + ": ";
            const message = err.message as string;
            if (message && message.search(axServiceUnavailableCode) === 0)
            {
                TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, message.replace(codePrepend, Utils_String.empty), true);
            }

        }
        else {
            TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, Dashboards_Resources.ErrorMessage_UpdateWidgetPosition);
        }
        Dashboards_Telemetry.DashboardsTelemetry.onDashboardError("putDashboard", err.message, this.dashboardData.id);
    }


    /**
    * Add a single widget to the server.
    * @param {Widget} The widget information to be saved
    * @param {boolean} Internal callback parameter, preventing widget from being added to data structure again
    * @return {Widget} The server response that contain the unique identifier of the widget
    */
    public addWidget(widget: TFS_Dashboards_Contracts.Widget, requeue : boolean = false): IPromise<TFS_Dashboards_Contracts.Widget> {
        Diag.Debug.logInfo("Sending a new widget from the Dashboard to the server VIA Rest API");
        TFS_Dashboards_Errors.DashboardMessageArea.clearMessage();

        if (!requeue) {
            this.dashboardData.widgets.push(widget);
        }

        var clonedWidget = <TFS_Dashboards_Contracts.Widget>JSON.parse(JSON.stringify(widget));

        // If already saving, chain and execute after previous save is done
        if (this._saving) {
            return this._savingPromise.then(() => this.addWidget(widget, true));
        }

        this._saving = true;

        Diag.Debug.logInfo("Sending new widget to the server VIA Rest API");
        TFS_Dashboards_Errors.DashboardMessageArea.clearMessage();

        // Using stateful internal dashboard etag from previous operation
        // Add widget only needs this part of Dashboard contract to participate in dashboard versioning
        clonedWidget.dashboard = <TFS_Dashboards_Contracts.Dashboard>{ eTag: this.dashboardData.eTag };

        this._savingPromise = this.httpClient.createWidget(
            clonedWidget,
            TFS_Dashboards_Common.getTeamContext(),
            this.dashboardData.id
        );

        this._savingPromise.then(
            (data: TFS_Dashboards_Contracts.Widget ) => { // Casting data as savingPromise is multiple types
                // Saving etag for the next operation
                this.dashboardData.eTag = data.dashboard.eTag;
                // Saving new ID of the widget for future operations
                // This will also populate it in the dashboardData array as it's stored there by reference
                widget.id = data.id;
                this._saving = false;

                // Returning reference to the widget state
                return widget;
            },
            err => {
                this._saving = false;
                this.displayError(err, Dashboards_Resources.ErrorMessage_UpdateWidgetPositionConflict_AddAction);

                return Q.reject(err);
            }
        );

        return this._savingPromise;

    }

    public updateWidget(widget: TFS_Dashboards_Contracts.Widget): IPromise<TFS_Dashboards_Contracts.Widget> {
        // If already saving, chain and execute after previous save is done
        if (this._saving) {
            return this._savingPromise.then(() => this.updateWidget(widget));
        }

        this._saving = true;

        widget.dashboard = <TFS_Dashboards_Contracts.Dashboard>{ eTag: this.dashboardData.eTag };

        // Look up current etag for this widget
        this.dashboardData.widgets.some((storedWidget) => {
            if (storedWidget.id == widget.id) {
                widget.eTag = storedWidget.eTag;
                return true;
            }
            return false;
        });

        this._savingPromise = this.httpClient.updateWidget(
            widget,
            TFS_Dashboards_Common.getTeamContext(),
            this.dashboardData.id,
            widget.id
        ).then(
            (data: TFS_Dashboards_Contracts.Widget) => {
                // Updating single widget may increment dashboard-level etag due to position changes
                // and we take that version and carry it forward to the next dashboard update
                this.dashboardData.eTag = data.dashboard.eTag;

                this.dashboardData.widgets.some((storedWidget, index) => {
                    // Note that updating single widget doesn't bring over the dashboard ETag, which may be in conflict
                    // However, we do allow updating of one widget if size+position doesn't change
                    if (storedWidget.id == data.id) {
                        this.dashboardData.widgets[index].eTag = data.eTag;
                        return true;
                    }
                    return false;
                });

                widget = data;
                this._saving = false;
                return data;
            },
            err => {
                this._saving = false;
                this.displayError(err, Dashboards_Resources.ErrorMessage_UpdateWidgetPositionConflict_UpdateWidgetAction);
                return Q.reject(err);
            }
        );

        return this._savingPromise;

    }
    /**
     * Parses ETag header, since ETag has to have double quotes around its value when sent via HTTP header
     * @param header
     */
    public parseETagHeader(header: string) {
        if (header) {
            return header.replace(/\"/g, "");
        }
        else {
            return null;
        }
    }

    /**
     * Wraps ETag header, since ETag has to have double quotes around its value when sent via HTTP header
     * @param header
     */
    public wrapETagHeader(header: string) {
        if (header) {
            return "\"" + header + "\"";
        }
        else {
            return null;
        }
    }

    public getDashboardGroup(groupId: string): IPromise<TFS_Dashboards_Contracts.DashboardGroup> {
        return this.httpClient.getDashboards(TFS_Dashboards_Common.getTeamContext());
    }
}

/**
 * This is the main class for the dashboard code. It contains the Gridster control, the list of widgets and all communication endpoints.
 */
export class DashboardGrid extends Controls.Control<DashboardGridOptions> implements IDashboardGrid {

    /**
     * Class used to indicate that the grid is obscured by something (dialog, dashboard blade, etc.)
     */
    public static ClassObscured = "obscured";

    /**
     * Gridster contains all widgets in this container
     */
    public static ClassGridsterWidgets = "gridster-items";


    /**
     * Dashboard initial settings about the grid itself.
     */
    private settings: DashboardGridSettings;

    /**
     * This is Gridster. We abstract Gridster and this one shouldn't be called directly.
     */
    public _gridsterControl: Gridster;

    /**
     * The communication object to the back-end
     */
    public controller: IDashboardController;

    /**
     * For Telemetry purposes. The construction starting time is saved.
     */
    private gridStartTime: number;

    public _widgetHosts: IDashboardsGridWidgetHostContainer[] = [];

    private dragging: boolean = false;

    private _loadOrder: number = 0;

    private widgetsInInitialLoad: number = 0;
    private firstPartyWidgetsInInitialLoad: number = 0;

    /**
     *  Constructor that accept default setting for this instance of the DashboardGrid
     * Create a new Dashboard with options
     * @options {DashboardGridOptions} Required options
     */
    public constructor(options: DashboardGridOptions) {
        super(options);
        this.gridStartTime = Date.now();
        this.settings = new DashboardGridSettings();

        this.controller = options.controller;

    }

    public getCountOfWidgetsInInitialLoad(): number {
        return this.widgetsInInitialLoad;
    }

    public getCountOfFirstPartyWidgetsInInitialLoad(): number {
        return this.firstPartyWidgetsInInitialLoad;
    }

    /**
     * This method is called by the Extensibility framework once the control is createIn an HtmlElement.
     * It call the render which generate the underlying Gridster control. Since this one is loaded with
     * AMD this one need to wait until it is present to continue the rendering (postRender) which add
     * widgets into the grid.
     */
    public initialize() {
        super.initialize();
        this._render();
    }

    public dispose() {
        if (this._gridsterControl) {
            this._gridsterControl.destroy(true);
            this._gridsterControl = null;
        }

        if (this._widgetHosts && this._widgetHosts.length > 0) {
            this._widgetHosts.forEach((container: IDashboardsGridWidgetHostContainer) => {
                container.widgethost.dispose();
            });
            this._widgetHosts = [];
        }

        super.dispose();
    }

    /**
     * Return the widget hosts in the grid and their element containers.
     */
    public getWidgets(): IDashboardsGridWidgetHostContainer[] {
        return this._widgetHosts;
    }

    private _getCurrentHostAjaxRequests(): PerformanceResourceTiming[] {
        if (window.performance && typeof window.performance.getEntriesByType === "function") {
            // get and record all the xhr requests that were made before the widget completes, limit it to requests for the current host only.
            const resources = <PerformanceResourceTiming[]>window.performance.getEntriesByType("resource") || [];
            const allAjaxRequests = resources.filter(r => r.initiatorType === "xmlhttprequest");
            return allAjaxRequests.filter(
                r => r.name.indexOf(TFS_Host_TfsContext.TfsContext.getDefault().contextData.host.uri) === 0);
        }
        else {
            // short circuit the xhr telemetry payload property.
            return null;
        }
    }

    /**
    *  Reporting each widget loading telemetry
    */
    private _widgetLoadedCallback(widgetHost: Dashboard_Shared_Contracts.IWidgetHost): void {
        const widget = widgetHost.getWidget();
        let widgetScenario = widgetHost.getPerformanceScenario();

        if (widgetScenario && widgetScenario.isActive()) {
            // identify and record index of the widget in the list of hosts.
            widgetScenario.addData({
                widgetCoordinates: widget.position,
                widgetInitializeOrder: Utils_Array.findIndex(this._widgetHosts,
                    (hostContainer) => hostContainer.widgethost.getWidget().id === widget.id) + 1
            });

            // identify and record number of widgets that have completed loading before (exclude the current one).
            widgetScenario.addData({
                widgetsCompletedBefore: this._loadOrder++
            });

            // add in state of page load scenario to allow filtering for initial load widgets.
            widgetScenario.addData({
                isPageNavigationScenarioActive: Performance.getScenarioManager().getScenarios(
                    TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.Area,
                    TFS_Dashboards_Telemetry.DashboardScenarios.AllWidgetsLoaded).length > 0
            });

            // identify and record xhr related telemetry artifacts for the current widget.
            if (window.performance) {
                // get and record all the xhr requests that were made before the widget completed,
                // limit it to requests for the current host only.
                var ajaxRequests = this._getCurrentHostAjaxRequests();
                if (ajaxRequests) {
                    widgetScenario.addData({
                        xhrRequestsBefore: ajaxRequests.length
                    });
                }
            }
        }

        if (this._options.widgetRenderedCallback) {
            this._options.widgetRenderedCallback(widgetHost);
        }
    }


    /**
     * Sort a widget list from top to bottom, and left to right within each row.
     * @param {Widget[]} initialWidgets - The list of widgets
     * @return {Widget[]} Sorted list by row and column ascending
     */
    private sortWidgetsFromTopToBottom(initialWidgets: TFS_Dashboards_Contracts.Widget[]): TFS_Dashboards_Contracts.Widget[] {
        initialWidgets = (<any>initialWidgets).sort(
            (widgetLeft: TFS_Dashboards_Contracts.Widget, widgetRight: TFS_Dashboards_Contracts.Widget) => {
                var posLeft: TFS_Dashboards_Contracts.WidgetPosition = widgetLeft.position;
                var posRight: TFS_Dashboards_Contracts.WidgetPosition = widgetRight.position;
                if (posLeft.row > posRight.row ||
                    posLeft.row === posRight.row &&
                    posLeft.column > posRight.column) {
                    return 1;
                }
                return -1;
            });

        return initialWidgets;
    }

    /**
     * Find maximum row and column numbers required by widgets
     * @param {Widget[]} initialWidgets - The list of widgets in which we will extract the maximum row and column
     * @return {IGridCoordinate} Maximum row/column required by widgets
     */
    protected maxRowColumn(widgets: TFS_Dashboards_Contracts.Widget[]): IGridCoordinate {
        var result = <IGridCoordinate>{
            column: this.settings.minimumColumns,
            row: this.settings.minimumRows
        }
        widgets.forEach((widget) => {
            var rightMost = widget.position.column + widget.size.columnSpan - 1;
            if (result.column < rightMost) {
                result.column = rightMost;
            }

            // *** CAREFUL CAREFUL CAREFUL ***
            //
            // Use caution when touching this code. It is easy to break Gridster in non-obvious ways.
            // We have turned off automatic stylesheet generation in Gridster for performance reasons.
            // To enable the first and only stylesheet calculation to be valid, our calculation
            // of "max rows" MUST mirror how Gridster calculates max_rows.
            //
            // Gridster calcaulates max_rows as the sum the heights of all widgets in the grid.
            // It relies on this "max_size" to correctly generate the stylesheet that is used to position widgets
            // in the grid. It uses this algorithm to handle the "worst case" (i.e., every widget in the first column,
            // stacked on top of each other)
            result.row += widget.size.rowSpan;
        });

        return result;
    }

    /**
    * Check if position or size on gridster has been updated.
    * @param {JQuery} gridsterWidget - gridster element wrapped in a Jquery object.
    * @param {TFS_Dashboards_Contracts.Widget} modelWidget - private copy of widget stored in the grid control.
    * NOTE: protected to allow for test to access it publically as a facade.
    */
    protected isPositionUpdated(gridsterWidget: JQuery, modelWidget: TFS_Dashboards_Contracts.Widget): boolean {
        return !(
            +gridsterWidget.attr("data-col") == modelWidget.position.column
            && +gridsterWidget.attr("data-row") == modelWidget.position.row
            && +gridsterWidget.attr("data-sizex") == modelWidget.size.columnSpan
            && +gridsterWidget.attr("data-sizey") == modelWidget.size.rowSpan
        );
    }

    /***
     * Synchronize from Gridster to our widget collection the position and size of every widgets
     * @returns the list of ids for widgets that have changed positions. Note that new widgets may not have one till their first positioning.
     * NOTE: we can look at expanding the return contract if we believe it would help to have the full widget payload to avoid lookups or otherwise.
     * NOTE: protected to allow for test to access it publically as a facade.
     */
    public _syncPositionsWithGridster(): string[] {

        var updatedWidgets: string[] = [];

        // Get all widgets coordinate and update widgets
        //NOTE: $widgets is not present in the type definition so we cast to any here
        var htmlWidgets = (<any>this._gridsterControl).$widgets.get(); // Get array of elements
        htmlWidgets.forEach(htmlWidget => {
            var $htmlWidget = $(htmlWidget);

            // Find the widget in the model and associate the coordinate
            this.controller.dashboardData.widgets.forEach(modelWidget => {
                if ($htmlWidget.attr(Dashboards_Constants.JQuerySelectors.DataGridWidgetIdAttribute) === modelWidget.id) {

                    if (this.isPositionUpdated($htmlWidget, modelWidget)) {
                        modelWidget.position.column = +$htmlWidget.attr("data-col");
                        modelWidget.position.row = +$htmlWidget.attr("data-row");
                        modelWidget.size.columnSpan = +$htmlWidget.attr("data-sizex");
                        modelWidget.size.rowSpan = +$htmlWidget.attr("data-sizey");

                        // grid.controller.dashboarddata.widgets.position and grid.widgethostcontainer.widgethost.widgets.position needs to be in sync all the time
                        // else it will result in widgetcollision exception when a widget is configured => moved (things got out of sync here after replacedashboard succeeds) => configured
                        // when widget is moved, gridster should syncs with controller and also widgethost, so when configure sends data to server using widgethost data, position is in sync with server
                        var widgetHostContainers = this._widgetHosts.filter(x => x.widgethost.getWidget().id === modelWidget.id);
                        if (widgetHostContainers.length > 0) {
                            widgetHostContainers[0].widgethost.rePosition(modelWidget.position.row, modelWidget.position.column);
                        }

                        updatedWidgets.push(modelWidget.id);
                    }
                }
            });
        });

        return updatedWidgets;
    }

    private prevX: number = -1;

    public onDashboardLoaded(): void {
        if (this._widgetHosts && this._widgetHosts.length > 0) {
            $.each(this._widgetHosts, (index: number, host: IDashboardsGridWidgetHostContainer) => {
                host.widgethost.onDashboardLoaded();
            });
        }
    }

    /**
     * Keep track is before dragging we has the blade menu open.
     * Used when we stop dragging to put back the state (open or not)
     */
    private wasBladeOpenedBeforeDrag: boolean;

    /**
     * add a split to the telemetry scenario (if available)
     * @param splitName name of the split.
     */
    private logSplit(splitName: string): void {
        // if scenario available log split.
        // if no scenario is available treat it as a no- op at this time.
        if (this._options.telemetryScenarios) {
            for (var scenario of this._options.telemetryScenarios) {
                if (scenario) {
                    scenario.addSplitTiming(splitName);
                }
            }
        }
    }

    /**
     * This use the JQuery Gridster to create the division for each widgets
     *
     * This should only be called once on the grid instance.
     */
    public _render(): void {
        var options: GridsterOptions = this._generateGridsterOptions();
        this.logSplit(TFS_Dashboards_Telemetry.DashboardSplits.GridInitializationStarted);

        // This was needed to avoid the odd div overlay for gridster control items due to control div layering.
        // Gridster control should be wrapped within a Tfs control to better present it within the
        // enhancement and control/view models.
        var grid = $("<div/>").attr("id", Dashboards_Constants.DomIds.DashboardsWidgetsContainerID);
        grid.addClass(TFS_Dashboards_Common.ClassGridster);
        grid.addClass(DashboardGrid.ClassGridsterWidgets);
        grid.appendTo(this.getElement());

        //Only a single grid instance should exist at any time.
        if ($("div." + DashboardGrid.ClassGridsterWidgets).length > 1) {
            Diag.logError("Multiple Gridster containers detected on this page.");
        }

        this._gridsterControl = <Gridster>grid.gridster(options).data('gridster'); //Use the grid created above as this control's gridster instance.

        // PERF #1: Remove Grid from the DOM before adding widgets to it.  Leaving Grid in the DOM while adding widgets
        //          generates a bunch of unnecessary reflows which visibly slows down pageload
        //
        grid.hide();

        // PERF #2  Prevent Gridster from automatically regenerating our stylesheet every time a widget is added.
        //          The CSS regeneration + reflows are very expensive
        //
        var gridsterOptions = (<any>this._gridsterControl).options;
        gridsterOptions.autogenerate_stylesheet = false;

        // Populate the Grid
        this.logSplit(TFS_Dashboards_Telemetry.DashboardSplits.WidgetInitializationStarted);
        this.addWidgets(this.controller.dashboardData.widgets);
        this.logSplit(TFS_Dashboards_Telemetry.DashboardSplits.WidgetInitializationEnded); // possible TTI for dashboard at this time?

        // END PERF #2:  now that we've populated the grid, allow Gridster to recompuate stylesheets as needed
        gridsterOptions.autogenerate_stylesheet = true;

        // END PERF #1:  we're done populating the Grid, now we can add it back to the DOM
        grid.show();

        this.logSplit(TFS_Dashboards_Telemetry.DashboardSplits.GridInitializationEnded);

        this._virtualizeWidgets(true);
        var container = Utils_UI.Positioning.getVerticalScrollContainer(grid);
        container.scroll(() => { this._virtualizeWidgets(false); });
        $(window).resize(Utils_Core.throttledDelegate(this, 10, () => { this._virtualizeWidgets(false); }));

        if (!this._options.dashboardPermission.canEdit) {
            this._gridsterControl.disable();
        }
    }

    private _virtualizeWidgets(initialLoad: boolean): void {
        this._widgetHosts.forEach((hostContainer: IDashboardsGridWidgetHostContainer) => {
            if (!hostContainer.widgethost.isInitialized()) {
                if (TFS_Dashboards_Common.CssHtmlUtilities.isInViewport(
                    hostContainer.element,
                    $(window))) {
                    hostContainer.widgethost.load(initialLoad);

                    if (initialLoad) {
                        ++this.widgetsInInitialLoad;

                        if (Dashboards_Telemetry.DashboardsTelemetry.contributionIdBelongsToFirstParty(hostContainer.widgethost.getWidget().contributionId)) {
                            ++this.firstPartyWidgetsInInitialLoad;
                        }
                    }
                }
            }
        });
    }

    private _generateGridsterOptions() {
        var maxDimensions = this.maxRowColumn(this.controller.dashboardData.widgets || []); // use the initial widgets list when available

        var preventClick = e => {
            e.stopPropagation();
            e.preventDefault();
        }; //Used to temporary remove clicking propagation during drag-n-drop

        return {
            widget_margins: [this.settings.horizontalMargin, this.settings.verticalMargin],
            widget_base_dimensions: [this.settings.defaultWidgetWidth, this.settings.defaultWidgetHeight],
            min_cols: maxDimensions.column,
            min_rows: maxDimensions.row,
            autogrow_cols: true,
            draggable: {
                handle: "." + Dashboards_Control_WidgetHost.WidgetEditOverlayControl.ClassDragHandle +
                        ",.widget-container",
                stop: (event: Event, ui: { helper: JQuery; }) => {
                    this.dragging = false;

                    var player = (<any>ui).$player; //Get the draggable element
                    setTimeout(() => {
                        player[0].removeEventListener('click', preventClick, true); //Prevent any click
                    });

                    this._updateWidgetPositionIfChanged(false, Dashboards_Resources.ErrorMessage_UpdateWidgetPositionConflict_MoveAction);

                    $(player).removeClass('leftdrag').removeClass('rightdrag');
                    if (typeof this._options.widgetDoneDragCallback === "function") {
                        this._options.widgetDoneDragCallback();
                    }
                    $(player).removeClass('player-revert'); //Make sure we are not in drag-drop mode. Gridster wasn't removing it when in Edit Mode
                    Diag.Debug.logInfo(new Date() + "-----------------Stop Drag-----------------");
                    if (!this.wasBladeOpenedBeforeDrag) {
                        if (!TFS_Dashboards_Common.DashboardPageExtension.isNewDashboardExperience()) {
                            this._options.toggleBladeMenu(true);
                        }
                    }
                },
                drag: (event: Event, ui: GridsterUi) => {
                    var player = (<any>ui).$player; //Get the draggable element
                    var currentMouseX = (<any>event).pageX;
                    if (this.prevX > currentMouseX) {
                        $(player).removeClass('rightdrag').addClass('leftdrag');
                    }
                    else if (this.prevX < currentMouseX) { // dragged right
                        $(player).removeClass('leftdrag').addClass('rightdrag');
                    }

                    if (this.wasBladeOpenedBeforeDrag && parseInt(player.css('left')) + player.width() >= this._options.getVisibleWidthSize()) {
                        if (!TFS_Dashboards_Common.DashboardPageExtension.isNewDashboardExperience()) {
                            this._options.toggleBladeMenu(false);
                        }
                        this.wasBladeOpenedBeforeDrag = false;
                    }
                    this.prevX = currentMouseX;
                },
                start: (event: Event, ui: { helper: JQuery; }) => {
                    this.dragging = true;

                    var htmlElementOfDraggedWidget = (<any>ui).$player[0];
                    htmlElementOfDraggedWidget.addEventListener('click', preventClick, true); //Enable back the click event that was disabled in the stop
                    this.closeMenu(htmlElementOfDraggedWidget);
                    if (typeof this._options.widgetStartDragCallback === "function") {
                        this._options.widgetStartDragCallback();
                    }

                    this._options.isBladeMenuClosed().then(() => {
                        this.wasBladeOpenedBeforeDrag = true;
                        Diag.Debug.logInfo(new Date() + "-----------------Start Drag----------------" + this.wasBladeOpenedBeforeDrag);
                    });
                },
                items: undefined,
                distance: undefined,
                limit: undefined,
                offset_left: undefined
            }
        };
    }

    /**
     * Save positions to server if any widget position has changed in gridseter
     */
    public _updateWidgetPositionIfChanged(forceSync: boolean = false, errorReason: string): void {
        var updatedWidgets: string[] = this._syncPositionsWithGridster();
        if (updatedWidgets.length > 0 || forceSync) {
            $('.hub-progress').show();
            this._virtualizeWidgets(false);
            this.controller.replaceDashboard(this.controller.dashboardData, errorReason).then(() => {
                $('.hub-progress').hide();
            });
        }
    }

    /**
     * Close the menu of the Html Element passed by parameter
     * @htmlElementOfDraggedWidget {any} : the HtmlElement of the widget. This is any since it cames from JQuery helper
     */
    private closeMenu(htmlElementOfDraggedWidget: any): void {
        $(htmlElementOfDraggedWidget).find('.menu-item').removeClass("hover focus");
        $(htmlElementOfDraggedWidget).find('.menu').removeAttr('style');
    }

    /**
     * add the widget inside Gridster.
     * @param {Widget} the Widget to add
     * @exception {Error} If Gridster control is not defined
     * @return {JQuery} The created html for the widget that is living inside Gridster control
     */
    public _addWidgetOnGridsterControl(widgetData: TFS_Dashboards_Contracts.Widget, source: WidgetSource): IDashboardsGridWidgetHostContainer {
        if (typeof (this._gridsterControl) !== "undefined") {
            var host = $("<span />")
                .addClass(Dashboards_Constants.DomClassNames.WidgetHostInGridster)
                .attr(Dashboards_Constants.JQuerySelectors.DataGridWidgetIdAttribute, widgetData.id);

            var widgethost: Dashboard_Shared_Contracts.IWidgetHost;
            if (source == WidgetSource.DragAndDrop && widgetData.id == null) {
                // Hide for drag and drop since we don't want to see the widget until it is under the cursor
                host.css("opacity", 0);
            } else if (widgetData.id != null) {
                widgethost = <Dashboards_Control_WidgetHost.WidgetHost>Controls.BaseControl.createIn(
                    Dashboards_Control_WidgetHost.WidgetHost,
                    host,
                    <Dashboards_Control_WidgetHost.IWidgetHostOptions>{
                        widget: widgetData,
                        remove: () => this.removeWidget(widgethost),
                        configure: () => this.configureWidget(widgethost),
                        dashboardPermission: this._options.dashboardPermission,
                        isLoaded: () => this._widgetLoadedCallback(widgethost),
                        widgetsModifiedCallback: this._options.widgetsModifiedCallback,
                        widgetFactory: null,
                        displayMode: Dashboards_Control_WidgetHost.WidgetHostDisplayMode.widget,
                        gridster: this._gridsterControl
                    });
            }

            //Smart Add Logic if not a row and column set yet (this is defined only if already saved)
            if ((widgetData.position.row === null || widgetData.position.column === null || widgetData.position.row === 0 || widgetData.position.column === 0 )) {
                var maximumColumns = Math.ceil(this._options.getVisibleWidthSize() /
                    (WidgetSizeConverter.GetWidgetWidth() + WidgetSizeConverter.GetWidgetMarginWidth()));
                this._smartAdjustPositionsAndSize(widgetData, maximumColumns);
            }

            var jqueryElement = this._gridsterControl.add_widget(host,
                widgetData.size.columnSpan,
                widgetData.size.rowSpan,
                widgetData.position.column,
                widgetData.position.row);

            return {
                element: jqueryElement,
                widgethost: widgethost
            }
        }
        else {
            throw new Error("Gridster control must be instantiated before adding widget.");
        }
    }

    /**
     * Smart position new widget added by the user. This method shouldn't be invoked when adding widget from a page load.
     * The idea is to positionate the widget at a place visible for the user if possible.
     * @param {Widget} widgetData - Widget to add
     * @param {number} maximumColumns - Number of maximum columns that we can use to add widget
     */
    public _smartAdjustPositionsAndSize(widgetData: TFS_Dashboards_Contracts.Widget, maximumColumns: number): void {
        var widgetsSpace = this._getWidgetSpaceMatrix(maximumColumns);
        var foundAnEmptySpace = false;

        //Loop all spaces that we can see
        for (let heightIndex = 0; heightIndex < widgetsSpace[0].length; heightIndex++) {
            if (foundAnEmptySpace) {
                break;
            }
            for (let widthIndex = 0; widthIndex < widgetsSpace.length; widthIndex++) {
                //If left corner is free (false | undefined), looks neightbord space if widget > 1 x 1
                if (!widgetsSpace[widthIndex][heightIndex]) {
                    let isAllSquareEmpty = true;
                    //Make sure that all square required are fine
                    for (let widthSizeIndex = 0; widthSizeIndex < widgetData.size.columnSpan; widthSizeIndex++) {
                        if (widgetsSpace[widthIndex + widthSizeIndex] == null) {
                            isAllSquareEmpty = false;
                            break;
                        }
                        for (let heightSizeIndex = 0; heightSizeIndex < widgetData.size.rowSpan; heightSizeIndex++) {
                            if (widgetsSpace[widthIndex + widthSizeIndex][heightIndex + heightSizeIndex]) {
                                isAllSquareEmpty = false;
                                break;
                            }
                        }
                    }

                    if (isAllSquareEmpty) {
                        //If we have all space required, we stop looping and make it as valid space by changing the widgetData
                        foundAnEmptySpace = true;
                        widgetData.position.row = heightIndex + 1; //Adjust to Gridster base 0 to base 1
                        widgetData.position.column = widthIndex + 1; //Adjust to Gridster base 0 to base 1
                        break;
                    }
                }
            }
        }

        //Cannot add anywhere in the current Gridster spaces. Letting Gridster may add Widget under the blade instead of under the first row.
        //so we will use the first column which will happen only when no space in the screen. This also make vertical scrolling first and
        //horizontal scrolling second.
        if (!foundAnEmptySpace) {
            widgetData.position.row = this._getLastRows() + 1;
            widgetData.position.column = 1; //First column
        }
    }

    /**
     * Get last rows that a widget occupy
     * @returns {number} Base 1 row (because of Gridster) in which a widget occupy space.
     */
    public _getLastRows(): number {
        var lastRowsIndex = 0; //No widget, thus no "last row".
        this.controller.dashboardData.widgets.forEach((elem) => {
            var widgetBottomRow = elem.position.row + (elem.size.rowSpan - 1); //-1 because we always have atleast 1 rowSpan
            if (widgetBottomRow > lastRowsIndex) {
                lastRowsIndex = widgetBottomRow;
            }
        });

        return lastRowsIndex;
    }

    /**
     * Get a matrix of boolean where widget are located
     * @param {number} maximumColumns - The maximum number of position per column
     * @returns {boolean[][]} - The matrix to take decision
     */
    public _getWidgetSpaceMatrix(maximumColumns: number): boolean[][] {
        var widgetsSpace: boolean[][] = [];

        //Initialize the first row with the maximum amount of column we support
        for (let widthIndex = 0; widthIndex < maximumColumns; widthIndex++) {
            widgetsSpace[widthIndex] = [];
        }

        //For each widget, we setup the space it takes (including the space with the custom width and height)
        //$widgets.each((index: number, elem: Element) => {
        this.controller.dashboardData.widgets.forEach((elem) => {
            if (elem.position.column > 0 && elem.position.row > 0) { // Excluding pinned widgets from map
                let x = elem.position.column - 1;   // Gridster is based 1, we need to get back to 0
                let y = elem.position.row - 1;      // Gridster is based 1, we need to get back to 0
                let w = elem.size.columnSpan;
                let h = elem.size.rowSpan;
                //We just add the data if in the viewport range
                if (x < maximumColumns) {
                    for (let widthIndex = 0; widthIndex < w; widthIndex++) {
                        //We do not need to add data if the widget is partially outside viewport, just the portion in-viewport is important
                        if (x + widthIndex < maximumColumns) {
                            for (let heightIndex = 0; heightIndex < h; heightIndex++) {
                                widgetsSpace[x + widthIndex][y + heightIndex] = true;
                            }
                        }
                    }
                }
            }
        });
        return widgetsSpace;
    }

    /**
     * Remove a widget from the dashboard. This used in a call back method that is executed
     * when a WidgetHost calls the remove method from the menu. The reason it is a call back is that
     * we want to the grid to take care of the removal.
     */
    private removeWidget(widgetHost: Dashboard_Shared_Contracts.IWidgetHost) {
        let targetWidget = widgetHost.getWidget();
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onRemoveWidget(targetWidget.contributionId, this.controller.dashboardData.id, targetWidget.id);

        //1- Remove from the widgets' list of Widget
        var widgets = this.controller.dashboardData.widgets;
        for (var i = 0; i < widgets.length; i++) {
            if (widgets[i].id === targetWidget.id) {
                widgets.splice(i, 1);
                break;
            }
        }

        //2- Remove from UI, Gridster require to have an HtmlElement
        this._gridsterControl.remove_widget(widgetHost.getElement().parent().get(0), false, () => {
            //3- The widget id is null if it wasn't successfully saved to the server when added to the dashboard.
            //This means we shouldn't need to delete the widget because we're just removing the widget right
            //after it was added.
            if (targetWidget.id != null) {
                // Updating entire dashboard, because removing a widget can automatically re-arrange the rest of them
                this._updateWidgetPositionIfChanged(true, Dashboards_Resources.ErrorMessage_UpdateWidgetPositionConflict_DeleteAction);
                if (typeof this._options.widgetRemoveCallback === "function") {
                    this._options.widgetRemoveCallback(targetWidget);
                }
            }
        });
    }

    /**
     * Configure a single widget from its widget host. This is trigged by the menu inside the widget
     * @param widgetHost The container of the widget
     */
    public configureWidget(widgetHost: Dashboard_Shared_Contracts.IWidgetHost): void {
        this._options.configureWidget(widgetHost);
    }

    private scrollToNewlyAddedWidget($widget: JQuery) {
        var $dashboardContainer = $("#container-with-scroll");

        // Check if the widget will be fully visible (vertically). We add the buffer to
        // ensure that the whole widget plus a small surrounding area is visible.
        var widgetTop = $widget.position().top;
        var widgetBottom = widgetTop + $widget.height();

        var viewTop = $dashboardContainer.scrollTop();
        var viewBottom = $dashboardContainer.scrollTop() + $dashboardContainer.height();

        if (widgetTop < viewTop || widgetBottom > viewBottom) {
            //Hide the widget first so that we can show it after scrolling
            $widget.hide();

            $dashboardContainer.animate({
                scrollTop: widgetTop
            }, {
                    duration: 500,
                    complete: () => $widget.fadeIn()
                });
        }
    }

    /**
     * update controller state with the latest settings provided by the configuration
     * @param widgetId unique identifier for widget
     * @param settings settings from the configuration of the widget.
     */
    private updateDashboardControllerWithLatestSettings(widgetId: string, settings: Dashboard_Shared_Contracts.ISettings): void {
        if (this.controller && this.controller.dashboardData && this.controller.dashboardData.widgets) {
            this.controller.dashboardData.widgets.forEach(widget=> {
                if (widget.id === widgetId) {
                    widget.settings = settings.customSettings.data;
                    widget.settingsVersion = settings.customSettings.version;
                    widget.name = settings.generalSettings.WidgetName;
                    widget.size = settings.generalSettings.WidgetSize;
                }
            });
        }
    }

    /**
    * Add a widget into Dashboard. It adds the Widget into the grid, add it into Gridster and get the coordinate from Gridster to send
    * them to the server to be saved. In the case of failure, the widget is removed from the grid and the grid's widget collection.
    * @param {widget} Widget to add
    */
    public addWidget(widget: TFS_Dashboards_Contracts.Widget, source: WidgetSource): IPromise<TFS_Dashboards_Contracts.Widget> {
        TFS_Dashboards_Errors.DashboardMessageArea.clearMessage();
        var deferred = Q.defer<TFS_Dashboards_Contracts.Widget>();
        if (widget != null) {
            if (this.controller.dashboardData.widgets.length < TFS_Dashboards_Common.DashboardPageExtension.getMaxWidgetsPerDashboard()) {
                var gridsterWidget = this._addWidgetOnGridsterControl(widget, source);
                // This scenario works when new catalog widget is added, so it doesn't have server-side generated ID
                // Add widget to gridster
                if (widget.id == null) {
                    if (source == WidgetSource.AddButton || source == WidgetSource.DoubleClick) {
                        // Since this is a newly-added widget, ensure the widget location is visible in the viewport before adding
                        this.scrollToNewlyAddedWidget(gridsterWidget.element);
                    }

                    // get gridster-calculated coordinates
                    widget.position = <TFS_Dashboards_Contracts.WidgetPosition>
                        {
                            column: +gridsterWidget.element.attr("data-col"),
                            row: +gridsterWidget.element.attr("data-row")
                        };

                    // and now we can push positioned widget to server
                    $('.hub-progress').show();
                    this.controller.addWidget(widget)
                        .then((widgetResponse: TFS_Dashboards_Contracts.Widget) => {
                            // Server returns the widget's ID, so we are updating gridster html to keep track of it
                            gridsterWidget.element.attr(Dashboards_Constants.JQuerySelectors.DataGridWidgetIdAttribute, widgetResponse.id);

                            // Create widgetHost for the widget returned by the server and update the IDashboardsGridWidgetHostContainer
                            gridsterWidget.widgethost = <Dashboards_Control_WidgetHost.WidgetHost>Controls.BaseControl.createIn(
                                Dashboards_Control_WidgetHost.WidgetHost,
                                gridsterWidget.element,
                                <Dashboards_Control_WidgetHost.IWidgetHostOptions>{
                                    widget: widgetResponse,
                                    remove: () => this.removeWidget(gridsterWidget.widgethost),
                                    configure: () => this.configureWidget(gridsterWidget.widgethost),
                                    dashboardPermission: this._options.dashboardPermission,
                                    isLoaded: (widgetHost: Dashboard_Shared_Contracts.IWidgetHost) => {
                                        widgetHost.onModeChange(this._options.isEditMode());
                                        this._widgetLoadedCallback(widgetHost);
                                    },
                                    widgetsModifiedCallback: this._options.widgetsModifiedCallback,
                                    widgetFactory: null,
                                    displayMode: Dashboards_Control_WidgetHost.WidgetHostDisplayMode.widget,
                                    gridster: this._gridsterControl
                                });
                            gridsterWidget.widgethost.load(false);

                            // now put widget into our own array for storage
                            this._widgetHosts.push(gridsterWidget);
                            deferred.resolve(widgetResponse);
                        }, (reason) => {
                            // If we couldn't save widget to server, fade and remove from dashboard
                            deferred.reject("Server couldn't save : " + reason);
                            this._fadeOutAndRemoveElement(this._gridsterControl, gridsterWidget.element);
                        }
                        ).then(() => {
                            $('.hub-progress').hide();
                        });
                }
                else {
                    // This scenario works when server-side generated ID is present, so no need to send it to server.
                    // This would be any previous widgets and pinned widgets.
                    // Widget position potentially get out of sync, since gridster may not add it to the desired position
                    // , so you have to run _syncPositionsWithGridster after addWidget
                    this._widgetHosts.push(gridsterWidget);
                }
            }
            else {
                var errorMessage: string = Utils_String.format(Dashboards_Resources.ErrorWidgetCountExceeded, TFS_Dashboards_Common.DashboardPageExtension.getMaxWidgetsPerDashboard());

                TFS_Dashboards_Errors.DashboardMessageArea.setMessage(Controls_Notifications.MessageAreaType.Error, errorMessage);
                Dashboards_Telemetry.DashboardsTelemetry.onDashboardError("addWidget", errorMessage, this.controller.dashboardData.id);
            }
        }
        return deferred.promise;
    }

    /**
     * Fade out and remove the invalid element after 3 seconds.
     * @param gridster the gridster object
     * @param badWidget the invalid widget to be removed.
     */
    public _fadeOutAndRemoveElement(gridster: Gridster, badWidget: JQuery): void {
        var invalidWidgetDomClass: string = "invalid-widget";
        var showDelayInMs: number = 3000;

        var span: JQuery = $("<span/>").
            addClass(invalidWidgetDomClass).
            text(Dashboards_Resources.InvalidWidget_Message);

        badWidget.append(span);
        badWidget.delay(showDelayInMs).fadeOut("slow", () => {
            gridster.remove_widget(badWidget.get(0));
        });
    }

    /**
     * add a list of widget into the system. These one are sorted from the TOP row to the bottom.
     * This is required because Gridster has a natural reverse gravity that push added widget up until it reaches the top
     * or touch another widget. This is also what Gridster is doing with its deserialization example.
     * @param Widget[]} initialWidgets - The list of widgets to add to the grid
     */
    public addWidgets(widgets: TFS_Dashboards_Contracts.Widget[]): void {
        if (widgets != null) {

            // Sort widgets in place of gridster default, top to bottom and Left to right within each row.
            widgets = this.sortWidgetsFromTopToBottom(widgets);
            widgets.forEach(widgetToAdd => {
                this.addWidget(widgetToAdd, WidgetSource.Initialization);
            });

            // In case gridster repositioned widgets, save them back to server. As this is first load, the only widgets that
            // can unpositioned are pinned widgets and widgets repositioned due to removal of other widgets
            // This should only run if user is admin and will have ability to save back to server if there's indeed a change
            if (this._options.dashboardPermission.canEdit) {
                this._updateWidgetPositionIfChanged(false, Dashboards_Resources.ErrorMessage_UpdateWidgetPositionConflict_MoveAction);
            }

        }
    }

    public widgetResizing(widgetId: string): boolean {
        var hostContainers: IDashboardsGridWidgetHostContainer[] = this._widgetHosts.filter(
            (value: IDashboardsGridWidgetHostContainer, index: number, array: IDashboardsGridWidgetHostContainer[]) => {
                return (value.widgethost.getWidget().id == widgetId);
            });

        // There should be only 1 widget host that matches the id of given widget
        if (hostContainers.length !== 1) {
            return false;
        }

        var updateSize = hostContainers[0].widgethost.getWidget().size;

        // If widget got resized, we have to force the server update
        // Doing this here, as we won't know previous size after resize_widget call (which is next)
        var resized = (+hostContainers[0].element.attr("data-sizex") != updateSize.columnSpan
            || +hostContainers[0].element.attr("data-sizey") != updateSize.rowSpan);

        return resized;
    }

    public refreshWidgetSettings(widgetId: string, settings: Dashboard_Shared_Contracts.ISettings): void {
        var hostContainers: IDashboardsGridWidgetHostContainer[] = this._widgetHosts.filter(
            (value: IDashboardsGridWidgetHostContainer, index: number, array: IDashboardsGridWidgetHostContainer[]) => {
                return (value.widgethost.getWidget().id == widgetId);
            });

        // There should be only 1 widget host that matches the id of given widget
        if (hostContainers.length != 1) {
            return;
        }

        var updateSize = hostContainers[0].widgethost.getWidget().size;

        // If widget got resized, we have to force the server update
        // Doing this here, as we won't know previous size after resize_widget call (which is next)
        var resized = (+hostContainers[0].element.attr("data-sizex") != updateSize.columnSpan
            || +hostContainers[0].element.attr("data-sizey") != updateSize.rowSpan);

        // update the size of the widget host in gridster
        this._gridsterControl.resize_widget(hostContainers[0].element, updateSize.columnSpan, updateSize.rowSpan);

        // update the inner div inside the widget host
        hostContainers[0].widgethost.resizeWidget();

        // refresh widget custom settings and call callback if needed
        hostContainers[0].widgethost.reload(settings).then(null, () => {
            /* WidgetHost already logs exception and returns failure on promise. Don't allow the reload failure to go to unhandled path. */
        });

        // update controller copy of widget to latest state (in case of new widgets,
        // the host and controller have copies instead of reference to the same widget)
        this.updateDashboardControllerWithLatestSettings(widgetId, settings);

        // Resizing of widgets might push other widgets around, so update widget positions
        // Forcing update if the size is changed
        this._updateWidgetPositionIfChanged(resized, Dashboards_Resources.ErrorMessage_UpdateWidgetPositionConflict_MoveAction);

    }

    /**
     * This method is called by the one that contain the Grid (for example the View) when the mode change
     * @param {boolean} isEditMode : True if edit mode; False if view mode
     */
    public onModeChange(isEditMode: boolean) {
        if (this._widgetHosts != null) {
            var widgetCount = this._widgetHosts.length;
            this._widgetHosts.forEach(widgetHost => {
                widgetHost.widgethost.onModeChange(isEditMode);
            });
        }
    }

    /**
     * This method notifies the grid whether it has been obscured by something, such as a dialog or dashboard blade, so it can take any necessary actions.
     * @param {boolean} isObscured - True if the grid is hidden underneath a dialog, curtain, blade, etc.
     */
    public setObscured(isObscured: boolean) {
        $("." + TFS_Dashboards_Common.ClassGridster).toggleClass(DashboardGrid.ClassObscured, isObscured);
    }

    /** Returns true if the user is currently interacting with the grid */
    public isUserDragging() {
        return this.dragging;
    }
}
