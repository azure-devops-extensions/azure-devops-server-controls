
import Q = require("q");
import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import Dashboards_UIContracts = require("Dashboards/Scripts/Contracts");
import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import QueryResultConfiguration = require("MyWork/Scripts/TFS.MyWork.Controls.Widget.WITConfiguration");
import Resources = require("MyWork/Scripts/Resources/TFS.Resources.MyWork");
import SDK = require("VSS/SDK/Shim");
import Telemetry = require("MyWork/Scripts/TFS.MyWork.Telemetry");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Locations = require("VSS/Locations");
import WidgetHostZIndexModifier = require("Widgets/Scripts/Shared/WidgetHostZIndexModifier");
import Widgets_LiveTitle = require("Widgets/Scripts/Shared/WidgetLiveTitle");
import Widgets_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import WIT_Widget_Api = require("MyWork/Scripts/TFS.MyWork.Widget.Wit");
import WITControlsAccessories = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Accessories");
import WITQueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import WITWorkItemsProvider = require("WorkItemTracking/Scripts/Controls/WorkItemsProvider");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Widget_QueryResultGrid = require("Widgets/Scripts/Shared/WidgetQueryResultGrid");
import { QueryHierarchy, QueryDefinition } from "WorkItemTracking/SharedScripts/QueryHierarchy";
import { IQueryResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

var delegate = Utils_Core.delegate;
var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

export interface IWITWidgetGridOptions extends Grids.IGridOptions {
    tfsContext: TFS_Host_TfsContext.TfsContext;
}

export module WITWidgetConstants {
    export var CORE_CSS_CLASS = "wit-querygrid-widget-view";
    export var GRID_CONTAINER_CSS_CLASS = "wit-widget-view-grid-container";
    export var TITLE_CSS_CLASS = "wit-widget-view-title";
    export var SHOW_MORE_CSS_CLASS = "wit-widget-view-show-more";
    export var NO_RESULTS_CONTAINER_CSS_CLASS = "wit-widget-no-results-container";
    export var NO_RESULTS_MESSAGE_CSS_CLASS = "wit-widget-no-results-message";
    export var NO_RESULTS_SYMBOL_CSS_CLASS = "wit-widget-no-results-symbol";
    export var ERROR_CONTAINER_CSS_CLASS = "wit-widget-error-container";
    export var ERROR_MESSAGE_CSS_CLASS = "wit-widget-error-symbol";
    export var ERROR_SYMBOL_CSS_CLASS = "wit-widget-no-results-image";
    export var REFRESH_INTERVAL = 5 * 60 * 1000;
    export var WIDGET_SIDE_PADDING = 26; //px
    export var WIDGET_DEFAULT_WIDTH = 474; //px
    export var RESULT_ITEM_HEIGHT = 30; //px;
    export var WIDGET_TOP_PADDING = 90; //px
    export var NO_RESULTS_SYMBOL = "chart-noresult-3.png";
    export var NON_DASHBOARD_MODE = "non-dashboard-mode";
    export var GRID_MAX_ITEM_COUNT = 21;
}

export module WITWidgetEvents {
    export var SORT_EVENT = "wit-widget-sort-event";
    export var ROW_CLICK_EVENT = "wit-widget-row-click-event";
    export var COLUMN_RESIZE_EVENT = "wit-widget-column-resize-event";
    export var COLUMN_MOVE_EVENT = "wit-widget-column-move-event";
    export var QUERYSELECTOR_TREENODE_CLICK_EVENT = "wit-widget-query-selector-node-click-event";
}

export class WITWidgetTelemetryConstants {
    public static WIT_WIDGET_VIEW_ALL_EVENT = "WitWidgetViewAll";
    public static WIT_WIDGET_CONFIG_CHANGE_EVENT = "WitWidgetConfigChange";
    public static WIT_WIDGET_CONFIG_CHANGE_ERROR = "WitWidgetConfigChangeError";
    public static WIT_WIDGET_SORT_ERROR = "WitWidgetSortError";
}

var HTML_TEMPLATE =
    `<span class='${WITWidgetConstants.TITLE_CSS_CLASS}'/>
     <div class='${WITWidgetConstants.GRID_CONTAINER_CSS_CLASS}'/>
     <div class='${WITWidgetConstants.NO_RESULTS_CONTAINER_CSS_CLASS}'>
         <div class='${WITWidgetConstants.NO_RESULTS_MESSAGE_CSS_CLASS}'/>
         <div class='${WITWidgetConstants.NO_RESULTS_SYMBOL_CSS_CLASS}'/>
     </div>
     <div class='${WITWidgetConstants.ERROR_CONTAINER_CSS_CLASS}'>
         <div class='${WITWidgetConstants.ERROR_MESSAGE_CSS_CLASS}'/>
         <div class='${WITWidgetConstants.ERROR_SYMBOL_CSS_CLASS}'/>
     </div>
     <a class='${WITWidgetConstants.SHOW_MORE_CSS_CLASS}'/>`;

export class WITWidgetGrid extends Widget_QueryResultGrid.WidgetQueryResultGrid {

    private _querySettings: WidgetQuerySettings;
    private _fieldsInitialized: boolean;

    constructor(options: Widget_QueryResultGrid.IWidgetGridsOptions) {
        super(options);
    }

    public initializeOptions(options?: Widget_QueryResultGrid.IWidgetGridsOptions) {
        super.initializeOptions(options);
    }

    /**
     * Called as the column is being resized
     * @param columnIndex {number} index of the column being resized
     * @param initialWidth {number} width of the column before resize started
     * @param finish {boolean} true if this is the last call to the method (i.e., on mouse up -- user has finished resizing this column)
     */
    public _applyColumnSizing(columnIndex: number, initialWidth = -1, finish = false) {
        super._applyColumnSizing(columnIndex, initialWidth, finish);

        // Finish up if this is the final call
        if (finish === true) {
            if (this._querySettings) {
                // update the rest of the columns, so when we do sort it would reflect the new size
                this.getColumns().forEach((c) => { this._querySettings.updateColumnWidth(c.name, c.width) });
            }
        }
    }

    /**
     * Sorting the data within the grid based on the column field
     * @param sortOrder - The order to sort the grid
     * @param sortColumns - The column to sort the data
     */
    public onSort(sortOrder: any, sortColumns?: any): void {
        if (!this.getStore().fieldMap && !this._fieldsInitialized) {
            this.getStore().beginGetFields((fields: WITOM.FieldDefinition[]) => {
                this._fieldsInitialized = true;
                super.onSort(sortOrder, sortColumns);
            },
                (error: Error) => {
                    Telemetry.MyWorkTelemetry.publishTelemetryWIT(
                        WITWidgetTelemetryConstants.WIT_WIDGET_SORT_ERROR,
                        { error: error.message }, Telemetry.TelemetryConstants.SOURCE_QUERY_RESULTS_WIDGET);
                });
        } else {
            super.onSort(sortOrder, sortColumns);
        }
    }

    public beginShowResults(workItemsProvider: any, callback?: IResultCallback, errorCallback?: IErrorCallback, extras?: any) {
        super.beginShowResults(
            workItemsProvider,
            ((queryResultsModel: IQueryResult) => {
                if (workItemsProvider.settings) {
                    this._querySettings = <WidgetQuerySettings>workItemsProvider.settings;
                }

                if (queryResultsModel.isTreeQuery || queryResultsModel.isLinkQuery) {
                    this.collapseAll();
                }

                if (callback) {
                    callback.call(this, queryResultsModel);
                }
            }),
            (error: any) => {
                if (errorCallback) {
                    errorCallback.call(this, error);
                }
            },
            extras);
    }

    /**
     * Override the parent getMaxVisibleRow
     */
    public getMaxVisibleRowCount(): number {
        if (this._querySettings) {
            return this._querySettings.getMaxRecords();
        } else {
            return 0;
        }
    }
}

export interface ColumnWidth {
    [name: string]: number;
}

export class WidgetQuerySettings {
    public static DefaultColumnCount = 5;
    public static ID_COL_WIDTH = 50;
    public static DEFAULT_COL_WIDTH = 75;
    public static TreeQueryTypeIdentifier = "tree";
    public static OneHopQueryTypeIdentifier = "oneHop";

    public query: QueryDefinition;

    private _queryId: string;
    private _queryName: string;
    private _queryPath: string;
    private _sortColumns: string[];
    private _projectId: string;
    private _projectName: string;
    private _availableColumns: string[];
    private _selectedColumns: string[];
    private _queryType: string;
    private _columnWidths: ColumnWidth;
    private _maxRecords: number;
    private _canvasWidth: number;
    private _loaded: boolean = false;
    private _widthsInitialized: boolean = false;
    private _widgetCol: number;
    private _widgetRow: number;

    public __test() {
        var that = this;
        return {
            $columnWidths: that._columnWidths,
            $canvasWidth: that._canvasWidth,
            $queryName: this._queryName,
            $queryPath: this._queryPath,
            $projectId: this._projectId,
            $projectName: this._projectName,
            $queryType: this._queryType,
            $maxRecords: this._maxRecords
        };
    }

    constructor(options?) {
        this._columnWidths = {};
        if (options) {
            this._widgetCol = options.widgetCol;
            this._widgetRow = options.widgetRow;
            this._selectedColumns = $.map(options.selectedColumns || [], (val, ind) => {
                return val.referenceName;
            });;
        } else {
            this._selectedColumns = [];
            this._canvasWidth = WITWidgetConstants.WIDGET_DEFAULT_WIDTH; //USE DEFAULT
        }
    }

    public getProject(projectNameOrId: string): JQueryPromise<WITOM.Project> {
        var deferred = jQuery.Deferred<WITOM.Project>();
        var store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        store.beginGetProject(projectNameOrId, (project: WITOM.Project) => {
            deferred.resolve(project);
        }, (error) => deferred.reject(error));

        return deferred.promise();
    }

    public beginGetQueryById(queryId: string, projectName?: string): JQueryPromise<void> {
        var deferred = jQuery.Deferred<void>();

        this.getProject(projectName || tfsContext.contextData.project.id).then((project: WITOM.Project) => {
            QueryHierarchy.beginGetQueryItemByIdOrPath(project, queryId).then(
                (query) => {

                    this.query = <QueryDefinition>query;
                    this._queryId = this.query.id;
                    this._queryName = this.query.name;
                    this._queryPath = this.query.storedPath;
                    this._projectId = this.query.project.guid;
                    this._projectName = this.query.project.name;
                    this._queryType = this.query.queryType;
                    this._maxRecords = this._determineMaxRecords();
                    this._canvasWidth = this._determineMaxWidth();

                    query.project.store.beginGetFields((fields: WITOM.FieldDefinition[]) => {
                        deferred.resolve();
                    }, (error) => deferred.reject(error));

                }, (error) => {
                    deferred.reject(error);
                });
        }, (error) => deferred.reject(error));

        return deferred.promise();
    }

    public getQueryType(): string {
        return this._queryType;
    }

    public getMaxRecords(): number {
        return this._maxRecords;
    }

    public getCanvasWidth(): number {
        return this._canvasWidth;
    }

    public areWidthsInitialized(): boolean {
        return this._widthsInitialized;
    }

    /**
     * Setting the columns that are going to be used to render the widget
     * @param results The result from performing the query
     */
    public setColumns(results: IQueryResult): void {
        var selected: string[];
        var columnsName = $.map(results.columns, (c) => (c.name));
        // filter selected to only existing one in query
        if (this._loaded) {
            selected = Utils_Array.intersect(this._selectedColumns, columnsName);
        }

        if (!selected || selected.length === 0) {
            this._selectedColumns = columnsName.slice(0, WidgetQuerySettings.DefaultColumnCount);
            this._availableColumns = columnsName.slice(WidgetQuerySettings.DefaultColumnCount);
        } else {
            this._selectedColumns = selected;
            this._availableColumns = Utils_Array.subtract(columnsName, selected);
        }

        this.setWidths();
    }

    /**
     * Adjust the column width that is going to be render
     */
    public setWidths(): void {
        if (this.areWidthsInitialized()) {
            return;
        }
        this._widthsInitialized = true;
        this._canvasWidth = this._determineMaxWidth();

        var hasId = $.inArray(WITConstants.CoreFieldRefNames.Id, this._selectedColumns) !== -1;
        var hasTitle = $.inArray(WITConstants.CoreFieldRefNames.Title, this._selectedColumns) !== -1;
        var remainingWidth = this._canvasWidth;
        var remainingColumns = this._selectedColumns.length;

        if (hasId) {
            this._columnWidths[WITConstants.CoreFieldRefNames.Id] = WidgetQuerySettings.ID_COL_WIDTH;
            remainingWidth = this._canvasWidth - WidgetQuerySettings.ID_COL_WIDTH;
            remainingColumns = this._selectedColumns.length - 1;
        }

        if (!hasTitle) {
            this._selectedColumns.forEach((col) => {
                if (col !== WITConstants.CoreFieldRefNames.Id) {
                    this._columnWidths[col] = (remainingWidth / remainingColumns);
                }
            });
        } else {
            this._selectedColumns.forEach((col) => {
                if (col !== WITConstants.CoreFieldRefNames.Id && col !== WITConstants.CoreFieldRefNames.Title) {
                    this._columnWidths[col] = WidgetQuerySettings.DEFAULT_COL_WIDTH;
                    remainingWidth -= WidgetQuerySettings.DEFAULT_COL_WIDTH;
                }
            });

            this._columnWidths[WITConstants.CoreFieldRefNames.Title] = remainingWidth;
        }
    }

    public getSelectedColumns(): string[] {
        return this._selectedColumns;
    }

    public getColumnWidths(): ColumnWidth {
        return this._columnWidths;
    }

    public updateColumnWidth(columnName: string, width: number) {
        if (this._columnWidths) {
            this._columnWidths[columnName] = width;
        }
    }

    public load() {
        this._loaded = true;
    }

    private _determineMaxWidth(): number {
        return (WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(this._widgetCol) - WITWidgetConstants.WIDGET_SIDE_PADDING);
    }

    private _determineMaxRecords(): number {
        return Math.floor((WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(this._widgetRow) - WITWidgetConstants.WIDGET_TOP_PADDING) / WITWidgetConstants.RESULT_ITEM_HEIGHT);
    }
}

/**
 * This implementation is to have the following 2 behavior that work specific for widget
 *   1. Limit the item return from the query result
 *   2. Resize the column width when user resize the column within widget
 */
export class WidgetQueryResultProvider extends WITWorkItemsProvider.QueryResultsProvider {

    public settings: WidgetQuerySettings;

    constructor(querySettings, options?) {
        super(querySettings.query, options);
        this.settings = querySettings;
        this.settings.load();
    }

    public beginGetResults(callback?: IResultCallback, errorCallback?: IErrorCallback, runQuery?: boolean) {
        super.beginGetResults(
            (queryResultModel) => {
                this.applyWidgetColumnSettings(queryResultModel);
                callback(queryResultModel);
            },
            errorCallback, runQuery);
    }

    // Override _beginQuery to set the top for our query
    public _beginQuery(callback, errorCallback?, extras?) {
        var extrasWithTop = $.extend({}, extras);
        delete extrasWithTop.persistenceId; //Explicitly removing persistenceId so that column widths don't get saved back to the query store.
        super._beginQuery(callback, errorCallback, extrasWithTop);
    }

    public setColumnWidth(columnName, width) {
        var widths = [];

        if (this.queryResultsModel && this.queryResultsModel.columns) {
            $.each(this.queryResultsModel.columns, (i, column) => {
                if (Utils_String.ignoreCaseComparer(columnName, column.name) === 0) {
                    if (column.width !== width) {
                        column.width = width;
                    }
                }

                widths[i] = column.name + ";" + Math.ceil(column.width);
            });
        }
    }

    public applyWidgetColumnSettings(queryResultModel: IQueryResult) {
        this.settings.setColumns(queryResultModel);
        var selectedColumns = this.settings.getSelectedColumns();
        var columns = selectedColumns.map((colName) => {
            return queryResultModel.columns.filter((col) => {
                return col.name === colName;
            })[0];
        });
        this.setColumns(columns);

        // Apply Columns Width
        var widths = this.settings.getColumnWidths();
        selectedColumns.forEach((col) => this.setColumnWidth(col, widths[col]));

        if (!queryResultModel.sortColumns) {
            return;
        }

        // Apply Sort
        if (queryResultModel.sortColumns.length > 1) {
            super.setSortColumns([]);
        } else {
            super.setSortColumns(queryResultModel.sortColumns);
        }
    }
}

export class WITWidgetView
    extends Widgets_BaseWidget.BaseWidgetControl<Dashboards_UIContracts.WidgetOptions>
    implements Dashboards_WidgetContracts.IConfigurableWidget, Widget_QueryResultGrid.IQueryWidgetContextMenuHelper {
    private _$titleAnchor: JQuery;
    private _$gridContainer: JQuery;
    private _$showMoreAnchor: JQuery;
    private _$noResultsContainer: JQuery;
    private _$noResultsMessage: JQuery;
    private _$noResultsSymbol: JQuery;
    private _$errorContainer: JQuery;
    private _$errorMessage: JQuery;
    private _$errorSymbol: JQuery;
    private _grid: WITWidgetGrid;
    private _witManager: WIT_Widget_Api.WitManager;
    private _itemCount: number;
    private _widgetSettings: QueryResultConfiguration.IQueryResultConfiguration;
    private _rawSettings: string;
    private _widgetTitle: string;
    private _queryId: string;
    private _maxQueryCount: number;
    private _widgetSize: TFS_Dashboards_Contracts.WidgetSize;
    private _contextMenuHelper: Widget_QueryResultGrid.QueryWidgetContextMenuHelper;

    public __test() {
        var that = this;
        return {
            $titleAnchor: this._$titleAnchor,
            $gridContainer: this._$gridContainer,
            $showMoreAnchor: this._$showMoreAnchor,
            $noResultsContainer: this._$noResultsContainer,
            $noResultsMessage: this._$noResultsMessage,
            $noResultsSymbol: this._$noResultsSymbol,
            grid: this._grid
        };
    }

    constructor(options: Dashboards_UIContracts.WidgetOptions) {
        if (options == null) {
            throw new Error("Option required");
        }

        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: WITWidgetConstants.CORE_CSS_CLASS
        }, options));
    }

    public initialize() {
        super.initialize();
        this._contextMenuHelper = new Widget_QueryResultGrid.QueryWidgetContextMenuHelper(this);
    }

    public dispose() {
        this._contextMenuHelper.dispose();
        super.dispose();
    }

    public preload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        this._witManager = new WIT_Widget_Api.WitManager(tfsContext);
        this._initializeContent();

        this._grid = <WITWidgetGrid>Controls.BaseControl.createIn(WITWidgetGrid, this._$gridContainer, {
            readOnlyMode: true,
            tfsContext: tfsContext,
            asyncInit: false,
            onToggled: (itemCount) => { this._updateViewAllAnchorText(itemCount); },
            widgetControl: this,
        });

        this._initializeDashboardWidget(settings);
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public load(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {
        return this._loadWidget(settings);
    }

    public onDashboardLoaded(): void {
        VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"]);
    }

    /**
     * no Ops
     */
    public updateViewOnDelete(workItemIds: number[]): void{
    }

    private _initializeContent() {
        this._element.html(HTML_TEMPLATE);

        this._$titleAnchor = this._getElementByClass(WITWidgetConstants.TITLE_CSS_CLASS).first();
        this._$gridContainer = this._getElementByClass(WITWidgetConstants.GRID_CONTAINER_CSS_CLASS).first();
        this._$showMoreAnchor = this._getElementByClass(WITWidgetConstants.SHOW_MORE_CSS_CLASS).first();
        this._$noResultsContainer = this._getElementByClass(WITWidgetConstants.NO_RESULTS_CONTAINER_CSS_CLASS).first();
        this._$noResultsMessage = this._getElementByClass(WITWidgetConstants.NO_RESULTS_MESSAGE_CSS_CLASS).first();
        this._$noResultsSymbol = this._getElementByClass(WITWidgetConstants.NO_RESULTS_SYMBOL_CSS_CLASS).first();
        this._$errorContainer = this._getElementByClass(WITWidgetConstants.ERROR_CONTAINER_CSS_CLASS).first();
        this._$errorMessage = this._getElementByClass(WITWidgetConstants.ERROR_MESSAGE_CSS_CLASS).first();
        this._$errorSymbol = this._getElementByClass(WITWidgetConstants.ERROR_SYMBOL_CSS_CLASS).first();

        this._$noResultsSymbol.append($("<img/>").attr("src", tfsContext.configuration.getResourcesFile(WITWidgetConstants.NO_RESULTS_SYMBOL)));
        this._$noResultsMessage.html(Resources.WITWidgetNoResultsEmptyMessage);
        this._$errorSymbol.text(Resources.WITWidgetNoResultsErrorSymbol);
        this._$showMoreAnchor.text(Resources.WITWidgetViewAllAnchorText);
        if (WidgetLinkHelper.mustOpenNewWindow()) {
            this._$showMoreAnchor.attr("target", "_blank");
        }
        this._$titleAnchor.hide();
        this._$showMoreAnchor.hide();
        this._$noResultsContainer.hide();
        this._$errorContainer.hide();
        this._$gridContainer.hide();

        this._$showMoreAnchor.bind("click", delegate(this, this._onShowMore));
    }

    private _getElementByClass(className: string): JQuery {
        return this.getElement().find("." + className);
    }

    private _getWidgetName(): string {
        var widgetName = this._widgetTitle;
        if (this._widgetSettings && this._widgetSettings.query) {
            var currentArtifactname = this._widgetSettings.query.queryName;

            widgetName = Widgets_LiveTitle.WidgetLiveTitleViewer.getLiveTitle(widgetName,
                this._widgetSettings, currentArtifactname);
        }
        return widgetName;
    }

    private _initializeDashboardWidget(settings: Dashboards_WidgetContracts.WidgetSettings) {
        this._rawSettings = settings.customSettings.data;
        this._widgetSize = settings.size;
        this._widgetSettings = this._extractSettings(this._rawSettings);
        this._widgetTitle = settings.name;
    }

    private _loadWidget(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {

        var deferred: Q.Deferred<Dashboards_WidgetContracts.WidgetStatus> = Q.defer<Dashboards_WidgetContracts.WidgetStatus>();

        var startLoadTime = Date.now();

        if (!this._widgetSettings) {
            WidgetHelpers.WidgetStatusHelper.Failure(Resources.InvalidConfigurationReconfigure).then(() => { },
                (status: Dashboards_WidgetContracts.WidgetStatus) => {
                    deferred.reject(status);
                });
        }

        else {

            if (!this._widgetSettings.query.queryId) {

                this.showUnConfiguredControl(settings.size, settings.name);
                WidgetHelpers.WidgetStatusHelper.Unconfigured().then((status: Dashboards_WidgetContracts.WidgetStatus) => {
                    deferred.resolve(status);
                });
            }

            else {
                this._grid.hideElement();
                this._loadQuery().then(() => {

                    this._updateLayout();
                    WidgetHelpers.WidgetStatusHelper.Success().then((status: Dashboards_WidgetContracts.WidgetStatus) => {
                        deferred.resolve(status);
                    });
                },
                    (error: Error) => {

                        WidgetHelpers.WidgetStatusHelper.Failure(error.message).then(() => { }, (status: Dashboards_WidgetContracts.WidgetStatus) => {
                            deferred.reject(status);
                        });
                        Telemetry.MyWorkTelemetry.publishTelemetryWIT(Telemetry.TelemetryConstants.WIDGET_LOAD_ERROR, { error: error.message }, Telemetry.TelemetryConstants.SOURCE_QUERY_RESULTS_WIDGET);
                    });
            }
        }

        return deferred.promise;
    }

    public reload(settings: Dashboards_WidgetContracts.WidgetSettings): IPromise<Dashboards_WidgetContracts.WidgetStatus> {

        this._widgetSettings = this._extractSettings(settings.customSettings.data);
        this._widgetTitle = settings.name;

        // If user didn't set the query, we would still show the unconfig state until a query is selected and loaded.
        if (settings.customSettings.data) {
            if (this._rawSettings !== settings.customSettings.data
                || !(this._widgetSize.columnSpan == settings.size.columnSpan && this._widgetSize.rowSpan == settings.size.rowSpan)) {

                var deferred: Q.Deferred<Dashboards_WidgetContracts.WidgetStatus> = Q.defer<Dashboards_WidgetContracts.WidgetStatus>();
                var refreshStartTime = Date.now();
                this._widgetSize = settings.size;
                this.hideUnConfiguredControl();

                this._loadQuery().then(() => {

                    Telemetry.MyWorkTelemetry.publishTelemetryWIT(
                        WITWidgetTelemetryConstants.WIT_WIDGET_CONFIG_CHANGE_EVENT,
                        {
                            WitWidgetRefreshTime: `${Date.now() - refreshStartTime}`,
                            WitWidgetRefreshItemsCount: `${this._itemCount}`
                        },
                        Telemetry.TelemetryConstants.SOURCE_QUERY_RESULTS_WIDGET);

                    this._updateLayout();
                    WidgetHelpers.WidgetStatusHelper.Success().then((status: Dashboards_WidgetContracts.WidgetStatus) => {
                        deferred.resolve(status);
                    });
                },
                    (error: Error) => {

                        Telemetry.MyWorkTelemetry.publishTelemetryWIT(WITWidgetTelemetryConstants.WIT_WIDGET_CONFIG_CHANGE_ERROR, { error: error.message }, Telemetry.TelemetryConstants.SOURCE_QUERY_RESULTS_WIDGET);
                        WidgetHelpers.WidgetStatusHelper.Failure(error.message).then(() => { }, (status: Dashboards_WidgetContracts.WidgetStatus) => {
                            deferred.reject(status);
                        });
                    });

                this._rawSettings = settings.customSettings.data;
                return deferred.promise;
            } else {
                this.updateWidgetTitleCount(this._itemCount);
                return WidgetHelpers.WidgetStatusHelper.Success();
            }
        } else {
            this.showUnConfiguredControl(settings.size, settings.name);
            return WidgetHelpers.WidgetStatusHelper.Unconfigured();
        }
    }


    private _loadQuery(): IPromise<{}> {
        var deferred = $.Deferred();

        var querySettings = new WidgetQuerySettings({
            widgetCol: this._widgetSize.columnSpan,
            widgetRow: this._widgetSize.rowSpan,
            selectedColumns: this._widgetSettings.selectedColumns
        });
        this._queryId = this._widgetSettings.query.queryId;

        if (!this._queryId) {
            deferred.reject();
            return deferred.promise();
        }

        querySettings.beginGetQueryById(this._queryId).then(() => {
            this._maxQueryCount = querySettings.getMaxRecords();
            this._grid.setCanvasMaxWidth(querySettings.getCanvasWidth());
            var project = querySettings.query.project;

            WorkItemTypeColorAndIconsProvider.getInstance().ensureColorAndIconsArePopulated([project.name]).then(() => {
                var resultProvider = new WidgetQueryResultProvider(querySettings);
                this._grid.beginShowResults(resultProvider, (queryResultModel: IQueryResult) => {
                    if (queryResultModel.hasMoreResult) {
                        var wiql = querySettings.query.queryText;
                        var teamContext = TFS_Dashboards_Common.getDashboardTeamContext();

                        var teamId = teamContext && teamContext.id;
                        this._witManager.getWorkItemsCount(wiql, project.guid, teamId).then((itemCount) => {

                            this._itemCount = itemCount;
                            deferred.resolve();
                        }, (error) => { deferred.reject(error); });
                    } else {
                        this._itemCount = queryResultModel.targetIds.length;
                        deferred.resolve();
                    }
                }, (error) => { deferred.reject(error); });
            }, (error) => { deferred.reject(error); });
        }, (error) => { deferred.reject(error); });

        return deferred.promise();
    }

    private _updateLayout() {
        if (this.isDisposed() || !this.teamContext) {
            return Diag.logWarning("Render Error: An attempt was made to render the \
                control either with no team context or with a disposed widget");
        }
        this.updateWidgetTitleCount(this._itemCount);
        this._updateViewAllAnchorLink();
        this._$errorContainer.hide();
        if (this._itemCount > 0) {
            this._$noResultsContainer.hide();
            this._$gridContainer.show();
            this._grid.showElement();
            this._grid.layout();
        } else {
            this.setZeroResultView();
        }
    }

    public getGrid(): Widget_QueryResultGrid.WidgetQueryResultGrid {
        return this._grid;
    }

    public setZeroResultView() {
        this._grid.hideElement();
        this._$noResultsContainer.show();
        this._$gridContainer.hide();
    }

    private _extractSettings(settingsString: string): QueryResultConfiguration.IQueryResultConfiguration {
        var empty = {
            query: { queryName: null, queryId: null },
            selectedColumns: null
        };

        if (!settingsString || settingsString === "\"\"") {
            return empty;
        }

        try {
            var widgetSetting: QueryResultConfiguration.IQueryResultConfiguration = JSON.parse(settingsString);

            if (!widgetSetting.query) {
                widgetSetting = null;
            }

            return widgetSetting;
        } catch (e) {
            return empty;
        }
    }

    private _onShowMore(e, args) {
        Telemetry.MyWorkTelemetry.publishTelemetryWIT(WITWidgetTelemetryConstants.WIT_WIDGET_VIEW_ALL_EVENT, {}, Telemetry.TelemetryConstants.SOURCE_QUERY_RESULTS_WIDGET, true);
    }

    public updateWidgetTitleCount(itemCount) {
        var widgetTitle = this._getWidgetName();

        let titleText = itemCount
            ? Utils_String.format(Resources.WITWidgetTitleWithCountFormat, widgetTitle, itemCount)
            : Utils_String.format(Resources.WITWidgetTitleFormat, widgetTitle);

        this._$titleAnchor.text(titleText);
        this._$titleAnchor.show();

        this.addTooltipIfOverflow(this._$titleAnchor);
    }

    private _updateViewAllAnchorLink(projectName?: string, teamName?: string) {
        if (this._queryId && this._queryId !== Utils_String.empty) {
            var url = Locations.urlHelper.getMvcUrl({
                project: projectName || this.webContext.project.name,
                team: teamName || this.teamContext.name,
                controller: "queries",
                action: "resultsById",
                parameters: [this._queryId]
            });
            this._$showMoreAnchor
                .attr('href', url)
                .attr('aria-label',
                    Utils_String.format(Resources.QueryResults_ViewAllAriaLabel_Format, this._widgetSettings.query.queryName)
                );

            if (WidgetLinkHelper.mustOpenNewWindow()) {
                this._$showMoreAnchor.attr("target", "_blank");
            }
        }
        this._$showMoreAnchor.show();
    }

    private _updateViewAllAnchorText(itemCount: number) {
        if (itemCount > this._maxQueryCount) {
            this._$showMoreAnchor.show();
        } else {
            this._$showMoreAnchor.hide();
        }
    }

    private _getApiLocation(action?: string, params?: any): string {
        return tfsContext.getActionUrl(action || "", "wit", $.extend({ area: "api" }, params));
    }
}

SDK.VSS.register("Microsoft.VisualStudioOnline.MyWork.WITViewWidget", () => WITWidgetView);
SDK.registerContent("Microsoft.VisualStudioOnline.MyWork.WITViewWidget.Initialize", (context) => {
    return Controls.create(WITWidgetView, context.$container, context.options);
});
