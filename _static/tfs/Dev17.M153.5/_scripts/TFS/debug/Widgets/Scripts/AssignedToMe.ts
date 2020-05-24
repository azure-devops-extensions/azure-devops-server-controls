import Q = require("q");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");

import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");

import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Url = require("VSS/Utils/Url");
import Utils_Date = require("VSS/Utils/Date");
import Grids = require("VSS/Controls/Grids");
import Events_Action = require("VSS/Events/Action");
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import VSS = require("VSS/VSS");

import Resources_Widgets = require("Widgets/Scripts/Resources/TFS.Resources.Widgets");
import TFS_Control_BaseWidget = require("Widgets/Scripts/VSS.Control.BaseWidget");
import Widget_Utils = require("Widgets/Scripts/TFS.Widget.Utilities");
import TFS_WorkItemTracking = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Widget_QueryResultGrid = require("Widgets/Scripts/Shared/WidgetQueryResultGrid");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITWorkItemsProvider = require("WorkItemTracking/Scripts/Controls/WorkItemsProvider");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import Widget_Telemetry = require("Widgets/Scripts/VSS.Widget.Telemetry");
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { IQueryResult, IQueryDisplayColumn } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemTypeColorAndIconsProvider, IColorAndIcon } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { BacklogConfigurationService, WorkItemStateCategory, BacklogConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { TempQueryUtils } from "WorkItemTracking/Scripts/Utils/TempQueryUtils";

import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");

import ItemList = require("Widgets/Scripts/Shared/ItemListControl");
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { AgileSettingsHelper } from "Widgets/Scripts/Shared/AgileSettingsHelper";
import { BacklogsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { WidgetLinkHelper } from "Widgets/Scripts/WidgetLinkHelper";

var tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var delegate = Utils_Core.delegate;

/**
 * Implementation for dealing with browser local storage
 */
export module LocalStorageWrapper {
    export function write(key: string, data: string): void {
        Service.getLocalService(Settings.LocalSettingsService).write(key, data, Settings.LocalSettingsScope.Project);
    }

    export function read(key: string, defaultValue: string): string {
        return Service.getLocalService(Settings.LocalSettingsService).read(key, defaultValue, Settings.LocalSettingsScope.Project);
    }
}

export module Constants {
    export var CORE_CSS_CLASS = "assigned-to-me";
    export var COUNT_FILTER_LIST_CONTAINER_CSS_CLASS = "assigned-to-me-count-filter-list-container";
    export var GRID_CONTAINER_CSS_CLASS = "assigned-to-me-grid-container";
    export var TITLE_CSS_CLASS = "assigned-to-me-title";
    export var SHOW_MORE_CSS_CLASS = "assigned-to-me-show-more";
    export var RESULTS_CONTAINER_CSS_CLASS = "assigned-to-me-results-container";

    export var MESSAGE_CONTAINER_CSS_CLASS = "assigned-to-me-message-container";
    export var MESSAGE_TEXT_CSS_CLASS = "assigned-to-me-message-text";
    export var MESSAGE_IMAGE_CSS_CLASS = "assigned-to-me-message-image";

    export var ERROR_CONTAINER_CSS_CLASS = "assigned-to-me-error-container";
    export var ERROR_MESSAGE_CSS_CLASS = "assigned-to-me-error-message";
    export var ERROR_SYMBOL_CSS_CLASS = "assigned-to-me-error-symbol";

    export var TELEMETRY_LABEL = "Label";
    export var TELEMETRY_RIGHT_CLICK_MENU = "RightClickContextMenu";
    export var TELEMETRY_WORK_ITEM = "WorkItem";
    export var TELEMETRY_SUMMARY_FIELD = "SummaryField";
    export var TELEMETRY_VIEW_ALL = "ViewAll";
    export var TELEMETRY_VIEW_BOARD = "ViewBoard";

    export var TELEMETRY_WORKITEM_TYPE_COUNT = "WorkItemTypeCount";
    export var TELEMETRY_PROCESS_OR_CLAUSES = "ProcessOrClauses";
    export var TELEMETRY_TOTAL_WORKITEM_COUNT = "TotalWorkItemCount";
    export var TELEMETRY_TEMPQUERYID_CREATED = "TempQueryIDCreated";
}

export class AssignedToMeGrid extends Widget_QueryResultGrid.WidgetQueryResultGrid {

    // default grid column for each column
    public static ID_COL_WIDTH = 55;
    public static STATE_COL_WIDTH = 85;

    private _queryResult: IQueryResult;

    constructor(options: Widget_QueryResultGrid.IWidgetGridsOptions) {
        super(options);
        this.setCanvasSize(options.widgetHeight, options.widgetWidth);
    }

    public initializeOptions(options?: Widget_QueryResultGrid.IWidgetGridsOptions) {
        super.initializeOptions($.extend({
            extendViewportBy: 20,
        }, options));
    }

    /**
     * Repaint a new grid in place based on the height and width
     * @param height - height of the grid
     * @param width - width of the grid
     */
    public resizeGrid(height: number, width: number): void {
        this.hideElement();
        this.setCanvasSize(height, width);
        this.refresh();
        this.layout();
        this.showElement();
    }

    /**
    * Rescale all the columns within the grid to react based on the widget total width. This is very useful in the lightbox mode
    * @param height - height of the grid
    * @param width - width of the grid
    */
    public rescaleGrid(height: number, width: number): void {
        var grandTotalColumnWidth = this.getColumns().reduce((sum, c) => sum + c.width, 0);

        if (grandTotalColumnWidth !== width) {
            this.setCanvasSize(height, width);
            var ratio = width / grandTotalColumnWidth;
            var columnProportions = this.getColumns().map((c) => c.width / width);
            this.getColumns().forEach((c, i) => {
                //ID column is the smallest.. so we would keep it that way.
                this._columns[i].width = Math.max(c.width * ratio, AssignedToMeGrid.ID_COL_WIDTH);
                this._onColumnResize(this._columns[i]);
            });
            this.layout();
        }
    }

    // Override parent auto scroll (or smart) behavior because we already limit the row we show
    // When clearing the filter event with the filter manager, it is trying to be smart and force a delayScroll event which would scroll the 'last' selected item
    // into view and causing flashing view and reduce data set.
    public getSelectedRowIntoView(force?: boolean): boolean {
        return true;
    }

    // Fire widget click telemetry event before invoke parent method
    public onSort(sortOrder: Grids.IGridSortOrder[], sortColumns?: Grids.IGridColumn[]): void {
        Widget_Telemetry.WidgetTelemetry.onWidgetClick(this._options.widgetTypeId, Constants.TELEMETRY_LABEL, { "ClickTarget": sortColumns[0].text });
        super.onSort(sortOrder, sortColumns);
    }

    // Fire widget click telemetry event before invoke parent method
    public getActionArguments(action: string, sourceType?: string): any {
        Widget_Telemetry.WidgetTelemetry.onWidgetClick(this._options.widgetTypeId, Constants.TELEMETRY_RIGHT_CLICK_MENU, { "ClickTarget": action });
        return super.getActionArguments(action, sourceType);
    }

    // Fire widget click telemetry event before invoke parent method
    public _onRowClick(e: JQueryEventObject): boolean {
        Widget_Telemetry.WidgetTelemetry.onWidgetClick(this._options.widgetTypeId, Constants.TELEMETRY_WORK_ITEM);
        return super._onRowClick(e);
    }
}

export interface AssignedToMeFilterOptions {
    filterManager: FilterManager;
}

export interface AssignedToMeLocalStorageInfo {
    // The actual wiql for the query
    Wiql: string;

    // The tempQueryId created before
    tempQueryId: string;

    // the time stamp when the query was created
    queryTimeStamp: string;
}

/**
 * Minimal implementation filter that is required by the grid to work properly with the sorting and filtering
 */
export class AssignedToMeFilter extends FieldFilterProvider {
    public static PROVIDER_TYPE = "wi-state";

    constructor(options?: AssignedToMeFilterOptions) {
        super(WITConstants.CoreFieldRefNames.State);
    }

    public getMatchingItems(ids: number[]): number[] {
        // The matching work items are always the ids that were passed in to filter on.
        let result: number[] = [];

        for (const key in this._filterValueMap) {
            result.push(+key);
        }

        return result;
    }
}

/**
 * This implementation overwrite the default QueryResultProvider so it would handle the grid's column resize
 * during intial load and widget's size changes
 *
 */
export class AssignedToMeQueryResultProvider extends WITWorkItemsProvider.QueryResultsProvider {

    private _columnWidths: IDictionaryStringTo<number>;
    private _widgetWidth: number;
    private _fullColumnsSet: IQueryDisplayColumn[];
    private _reduceColumnsSet: IQueryDisplayColumn[];
    private _initialLoad: boolean;

    constructor(queryDefinition: QueryDefinition, options) {
        super(queryDefinition, options);
        this._widgetWidth = options.widgetWidth;
        this.initializeSettings();
    }

    private initializeSettings(): void {
        this._columnWidths = {};
        this._columnWidths[WITConstants.CoreFieldRefNames.Id] = AssignedToMeGrid.ID_COL_WIDTH;
        this._columnWidths[WITConstants.CoreFieldRefNames.State] = AssignedToMeGrid.STATE_COL_WIDTH;
        this.computeColumnWidth();
        this._initialLoad = true;
    }

    private computeColumnWidth(): void {
        if (this.hideIDColumn()) {
            this._columnWidths[WITConstants.CoreFieldRefNames.Id] = 0;
        } else {
            this._columnWidths[WITConstants.CoreFieldRefNames.Id] = AssignedToMeGrid.ID_COL_WIDTH;
        }
        this._columnWidths[WITConstants.CoreFieldRefNames.Title] = this._widgetWidth -
            this._columnWidths[WITConstants.CoreFieldRefNames.Id] - AssignedToMeGrid.STATE_COL_WIDTH;
    }

    public _applyWidgetColumnSettings(model: IQueryResult): void {
        this.computeColumnWidth();

        // Store the existing columns for later use
        if (!this._fullColumnsSet) {
            this._fullColumnsSet = model.columns;
            this._reduceColumnsSet = this._fullColumnsSet.filter((col: IQueryDisplayColumn) => {
                return col.name != WITConstants.CoreFieldRefNames.Id;
            });
        }

        // Set the columns we want to display based on the widget size
        var selectedColumnsSet = this.hideIDColumn() ? this._reduceColumnsSet : this._fullColumnsSet;
        $.each(selectedColumnsSet, (i, column: IQueryDisplayColumn) => {
            selectedColumnsSet[i].width = this._columnWidths[column.name];
        });
        this.setColumns(selectedColumnsSet);
    }

    private hideIDColumn(): boolean {
        var hide = this._widgetWidth < (Widget_QueryResultGrid.WidgetQueryResultGrid.DEFAULT_WIDGET_CANVAS_WIDTH - (2 * AssignedToMeView.WIDGET_SIDE_PADDING));
        return hide;
    }

    public beginGetResults(callback?: IResultCallback, errorCallback?: IErrorCallback, runQuery?: boolean) {
        super.beginGetResults(
            (queryResultModel: IQueryResult) => {
                // Only apply the column auto resize on initial load, else we don't want to change anything.
                if (this._initialLoad) {
                    this._applyWidgetColumnSettings(queryResultModel);
                    this._initialLoad = false;
                }
                callback(queryResultModel);
            },
            errorCallback, runQuery);
    }

    public updateWidgetWidth(width: number, updateColumnSize?: boolean) {
        this._widgetWidth = width;
        if (updateColumnSize) {
            this._applyWidgetColumnSettings(this.queryResultsModel);
        }
    }
}

export interface AssignedToMeViewOptions extends Dashboard_Shared_Contracts.WidgetOptions {
    /* Option to overwrite the default Filter Manager */
    filterManager?: FilterManager;

    /* Option to overwrite the default Query result provider */
    resultProvider?: AssignedToMeQueryResultProvider;

    /* Option to overwrite the URLBuilderHelper */
    wiqlURLBuilder?: wiqlURLBuilder;
}

/**
* Class that encapsulates business logic and rendering for the AssignToMe widget
* @extends VSS_Control_BaseWidget.BaseWidget
*/
export class AssignedToMeView
    extends TFS_Control_BaseWidget.BaseWidgetControl<AssignedToMeViewOptions>
    implements WidgetContracts.IConfigurableWidget, Widget_QueryResultGrid.IQueryWidgetContextMenuHelper {

    private title: string;
    private _$titleElement: JQuery;
    private _$gridContainer: JQuery;
    private _$itemListContainer: JQuery;
    private _$resultsContainer: JQuery;
    private _$messageContainer: JQuery;

    private _widgetSize: TFS_Dashboards_Contracts.WidgetSize;
    private _wiql: string;
    private _grid: AssignedToMeGrid;
    private _itemListControl: ItemList.ItemListControl;
    private _customFilter: AssignedToMeFilter;
    private _filterManager: FilterManager;
    private _resultProvider: AssignedToMeQueryResultProvider;
    private _urlBuilderHelper: wiqlURLBuilder;
    private _isInLightbox = false;
    private _contextMenuHelper: Widget_QueryResultGrid.QueryWidgetContextMenuHelper;

    private _size: ItemList.SizeOptions;
    // A mappings of all the ids for a giving workItemType
    private _workItemTypeIdMappings: IDictionaryStringTo<number[]> = {};
    private _filterItemList: ItemList.CountFilterItem[];

    /** Padding on both sides of widget, not available for control rendering */
    public static WIDGET_SIDE_PADDING = 15;
    public static WIDGET_TOP_PADDING = 140;

    public static MAX_WORK_ITEM_LIMIT = 200;

    public static AssignedToMeStorageKey = "AssignedToMeTempQuery";

    public constructor(options?: AssignedToMeViewOptions) {
        super(options);
    }

    /**
     * Extends options for control with style enhancements, called by base control during initialization
     * @param {Dashboard_Shared_Contracts.WidgetOptions} options for the control.
     */
    public initializeOptions(options?: AssignedToMeViewOptions) {
        super.initializeOptions($.extend({
            coreCssClass: Constants.CORE_CSS_CLASS
        }, options));

        /* test hooks*/
        if (this._options.filterManager) {
            this._filterManager = this._options.filterManager;
        }
        if (this._options.resultProvider) {
            this._resultProvider = this._options.resultProvider;
        }
        this._urlBuilderHelper = this._options.wiqlURLBuilder ? this._options.wiqlURLBuilder : new wiqlURLBuilder();
        this._contextMenuHelper = new Widget_QueryResultGrid.QueryWidgetContextMenuHelper(this);
    }

    public getWidgetTypeId(): string {
        return this._options.typeId;
    }

    public dispose() {
        this._contextMenuHelper.dispose();
        const iconContainers = this.getElement().find("." + ItemList.ItemListControl.ColorClass);
        iconContainers.each((i, e) => WorkItemTypeIconControl.unmountWorkItemTypeIcon(e));

        super.dispose();
    }

    /**
    * Paint the widget with whatever initial information was available from the host.
    * No network calls are made at this time.
    * @param {WidgetContracts.WidgetSettings} settings with name and configuration artifacts used by the widget to render.
    * @returns a promise with the state of the operation.
    */
    public preload(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        this.initializeWidgetContext(settings);
        this.initializeLayout();
        this._size = this.getWidgetSize(settings);
        this.title = Utils_String.format(
            Resources_Widgets.AssignedToMeWidget_DefaultTitle,
            TFS_Host_TfsContext.TfsContext.getDefault().contextData.user.name);

        // Setup the grid control
        this._grid = <AssignedToMeGrid>Controls.BaseControl.createIn(AssignedToMeGrid, this._$gridContainer, <Widget_QueryResultGrid.IWidgetGridsOptions>{
            readOnlyMode: true,
            tfsContext: tfsContext,
            asyncInit: false,
            widgetControl: this,
            widgetWidth: this._size.width - 2 * AssignedToMeView.WIDGET_SIDE_PADDING,
            widgetHeight: this._size.height,
            widgetTypeId: this.getWidgetTypeId(),
            gridSidePadding: AssignedToMeView.WIDGET_SIDE_PADDING,
            gridTopPadding: AssignedToMeView.WIDGET_TOP_PADDING,
            lightboxMode: this._isInLightbox
        });

        // Setup our own special control for this
        this._itemListControl = <ItemList.ItemListControl>Controls.BaseControl.createIn(ItemList.ItemListControl,
            this._$itemListContainer, <ItemList.ItemListControlOptions>{
                onSelectionChanged: (selection: ItemList.CountFilterItem[]) => {
                    this._filterGrid(selection);
                },
                colorAndIconDrawer: (container: JQuery, color: string, icon: string, tooltip: string) => {
                    if (container) {
                        container.css("top", "24px");
                        WorkItemTypeIconControl.renderWorkItemTypeIcon(container[0], "", { color: color, icon: icon }, { tooltip: tooltip } as WorkItemTypeIconControl.IIconAccessibilityOptions);
                    }
                },
                marginForColorAndIcon: "20px"
            });

        return WidgetHelpers.WidgetStatusHelper.Success();
    }


    public updateViewOnDelete(workItemIds: number[]): void {
        if (workItemIds.length > 0) {
            var newItemFilterList: ItemList.CountFilterItem[] = [];
            // Now we would adjust the filter counter with the new ids and update the counter filter
            for (var workItemType in this._workItemTypeIdMappings) {
                var data = this._workItemTypeIdMappings[workItemType];
                // filter the workItemMapping list with the item we want to remove
                this._workItemTypeIdMappings[workItemType] = data.filter((value) => {
                    return !Utils_Array.contains(workItemIds, value);
                });
                var item = this._filterItemList.filter((item) => {
                    return item.label === workItemType;
                });
                if (this._workItemTypeIdMappings[workItemType].length > 0) {
                    newItemFilterList.push({
                        label: workItemType,
                        value: this._workItemTypeIdMappings[workItemType].length,
                        color: item[0].color,
                        icon: item[0].icon
                    });
                }
            }
            // Update the list with the new list and update the item Filter control
            this._filterItemList = newItemFilterList;
            this._itemListControl.setItems(this._filterItemList);
        }
    }

    /**
    * Setup data and renders the widget
    * @param {WidgetContracts.WidgetSettings} settings with name and configuration artifacts used by the widget to render.
    * @returns a promise with the state of the operation.
    */
    public load(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        return this.getDataAndRender(this._size);
    }

    /**
    * Refresh the widget when settings are provided by the configuration experience.
    * @param {WidgetContracts.WidgetSettings} settings with name and configuration artifacts used by the widget to render.
    */
    public reload(settings: WidgetContracts.WidgetSettings): IPromise<WidgetContracts.WidgetStatus> {
        var size = this.getWidgetSize(settings);
        this._itemListControl.renderSize({
            width: (size.width - AssignedToMeView.WIDGET_SIDE_PADDING * 2),
            height: size.height
        });
        this._resultProvider.updateWidgetWidth(size.width - AssignedToMeView.WIDGET_SIDE_PADDING * 2, true);
        // We are repainting the itemListControl... so it make sense to clear the filter selection
        this._filterManager.clearFilters();
        this._grid.resizeGrid(size.height, size.width - 2 * AssignedToMeView.WIDGET_SIDE_PADDING);
        return WidgetHelpers.WidgetStatusHelper.Success();
    }

    public listen(event: string, data: WidgetContracts.EventArgs<any>): void {
        if (event === WidgetHelpers.WidgetEvent.LightboxResized) {
            var lightboxSize = <WidgetContracts.EventArgs<WidgetContracts.Size>>data;
            var height = lightboxSize.data.height;
            var width = lightboxSize.data.width;
            this.getElement().css("width", width).css("height", height);
            var itemListSize = <ItemList.SizeOptions>{
                height: height, width: width - 2 * AssignedToMeView.WIDGET_SIDE_PADDING
            };
            this._itemListControl.renderSize(itemListSize, true);
            this._grid.rescaleGrid(height, width - 2 * AssignedToMeView.WIDGET_SIDE_PADDING);
        } else if (event === WidgetHelpers.WidgetEvent.LightboxOptions) {
            var callback = data.data;
            var lightboxOptions = <Dashboard_Shared_Contracts.WidgetLightboxOptions>{};
            lightboxOptions.title = this.title;
            callback(lightboxOptions);
        }
    }


    public lightbox(widgetSettings: WidgetContracts.WidgetSettings, lightboxSize: WidgetContracts.Size): IPromise<WidgetContracts.WidgetStatus> {
        this._isInLightbox = true;
        widgetSettings.lightboxOptions.height = lightboxSize.height;
        widgetSettings.lightboxOptions.width = lightboxSize.width;
        return this.preload(widgetSettings).then(() => {
            this.getElement().addClass("lightboxed");
            this.getElement().css("width", lightboxSize.width).css("height", lightboxSize.height);
            return this.load(widgetSettings);
        });
    }

    public onDashboardLoaded(): void {
        VSS.requireModules(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls"]);
    }

    private initializeWidgetContext(settings: WidgetContracts.WidgetSettings) {
        this._widgetSize = settings.size;
    }

    private getWidgetSize(settings: WidgetContracts.WidgetSettings): ItemList.SizeOptions {

        var size: ItemList.SizeOptions = {};
        if (this._isInLightbox) {
            size.width = settings.lightboxOptions.width;
            size.height = settings.lightboxOptions.height;
        } else {
            size.width = WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(settings.size.columnSpan);
            size.height = WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(settings.size.rowSpan);
        };
        return size;
    }

    /**
     * Render the ItemListControl and AssignedToMeGrid based on the data that pass in here
     **   This widget doesn't support more than 200 items because we feel that the ROI of supporting it is low
     **   If the query data is 0 then we will give them the option to navigate to their backlog
     * @param size - The expected size for the ItemListControl
     * @param data - The data to populate the AssignedToMeGrid
     */
    public _renderControls(size: ItemList.SizeOptions, data: IQueryResult): void {
        this._$resultsContainer.hide();
        // No more work, let user go to backlog to pick up more work
        if (data.targetIds.length === 0) {
            this._buildMessageBlock(
                Utils_String.format(Resources_Widgets.AssignedToMeWidget_NoWorkText,
                    BacklogsUrls.getExternalBacklogContentUrl(this.teamContext.name)),
                AssignedToMeView.GetNoWorkImage());
        }
        // If the total of the item is greater than the payload, we have too much data
        else if (data.targetIds.length > AssignedToMeView.MAX_WORK_ITEM_LIMIT) {
            var tooMuchWorkImage = Utils_String.format("{0}{1}/{2}", TFS_Host_TfsContext.TfsContext.getDefault().configuration.getResourcesPath(),
                "Widgets", encodeURIComponent("assignedToMe-tooMuchWork.svg"));
            this._buildMessageBlock(Resources_Widgets.AssignedToMeWidget_TooMuchWorkText, tooMuchWorkImage, data.wiql);
        } else {
            this._repaintFilterList(data, size);
            this._$resultsContainer.show();
        }
        this._setupGridFilter(data.targetIds);
    }

    private getDataAndRender(size: ItemList.SizeOptions): IPromise<WidgetContracts.WidgetStatus> {
        var startTime = Date.now();

        let pendingPromises: IPromise<any>[] = [];
        let handleError = (e) => {
            var error: string = Widget_Utils.ErrorParser.stringifyError(e);
            return WidgetHelpers.WidgetStatusHelper.Failure(error);
        };        

        let processResultsAndReturn = () => {
            // Once backlog configurationa and colors are fetched, get query results
            return Q.allSettled(pendingPromises).then((settledPromises) => {
                if (this.isDisposed()) {
                    return WidgetHelpers.WidgetStatusHelper.Success();
                }

                for (let promise of settledPromises) {
                    if (Utils_String.equals(promise.state, "rejected", true)) {
                        return handleError(promise.reason);
                    }
                }

                const backlogConfiguration = settledPromises[1].value as BacklogConfiguration;
                return this.getQueryResultData(backlogConfiguration).then((queryResult: IQueryResult) => {
                    if (this.isDisposed()) {
                        return WidgetHelpers.WidgetStatusHelper.Success();
                    }

                    this._renderControls(size, queryResult);
                    this.updateWidgetTitleCount(queryResult.targetIds.length);
                    this.telemetryDataOnLoad(Object.keys(this._workItemTypeIdMappings).length,
                        WiqlTemplateHelper.getProcessOrConditions(backlogConfiguration),
                        queryResult.targetIds.length, startTime);
                    return WidgetHelpers.WidgetStatusHelper.Success();
                }, handleError);
            });
        };

        // Fetch backlog configuration and colors in parallel
        pendingPromises.push(WorkItemTypeColorAndIconsProvider.getInstance().ensureColorAndIconsArePopulated([tfsContext.contextData.project.name]));
        pendingPromises.push(BacklogConfigurationService.beginGetBacklogConfiguration(this.teamContext.id, tfsContext));
        return processResultsAndReturn();
    }

    private telemetryDataOnLoad(workItemTypeCount: number, processClauses: number, totalWorkItem: number, startTime: number): void {
        var properties: IDictionaryStringTo<string> = {};
        properties[Constants.TELEMETRY_WORKITEM_TYPE_COUNT] = workItemTypeCount.toString();
        properties[Constants.TELEMETRY_PROCESS_OR_CLAUSES] = processClauses.toString();
        properties[Constants.TELEMETRY_TOTAL_WORKITEM_COUNT] = totalWorkItem.toString();

        this._options.widgetService.then((widgetService) => {
            widgetService.getWidgetId().then((widgetId: string) => {
                Widget_Telemetry.WidgetTelemetry.onWidgetLoaded(this.getWidgetTypeId(), widgetId, properties);
            });
        });
    }

    /**
     * Minimum implementation for the filter to meet grid expectation. Grid expect a filter is attach to it when doing sorting.
     * @param workIds - The initial set of the workIDs for the Work Item.
     */
    public _setupGridFilter(workIds: number[]): void {
        // Setup the filter that go with the grid
        if (this._filterManager == null) {
            this._filterManager = this._grid.getFilterManager();
        }

        // Filter is always active in this view.
        this._filterManager.activate();

        this._customFilter = new AssignedToMeFilter(<AssignedToMeFilterOptions>{
            filterManager: this._filterManager
        });
        this._filterManager.registerFilterProvider(AssignedToMeFilter.PROVIDER_TYPE, this._customFilter);
    }

    /**
     * Get the URL path of a image to display when there is no more work assigned to the user.
     */
    public static GetNoWorkImage(): string {
        // We have 2 svg to choose from
        var chosenImageNumber = ((new Date()).getHours() % 2) + 1;
        var imageFile = Utils_String.format("assignedToMe-noWork-{0}.svg", chosenImageNumber);
        return Utils_String.format("{0}{1}/{2}", TFS_Host_TfsContext.TfsContext.getDefault().configuration.getResourcesPath(), "Widgets", encodeURIComponent(imageFile));
    }

    /**
     * Build the message with a text and image to show to the user.
     * @param message - The message to show to the user
     * @param imgNamePath - the path to the image to show to the user
     * @param wiql - the wiql to use to build the URL path when user click on the message link, if ommitted, we would navigate to backlog page
     */
    public _buildMessageBlock(message: string, imgNamePath: string, wiql?: string): void {
        this._$messageContainer.empty();
        this._$messageContainer
            .append($("<div>")
                .addClass(Constants.MESSAGE_TEXT_CSS_CLASS)
                .html(message))
            .append(($("<div>")
                .addClass(Constants.MESSAGE_IMAGE_CSS_CLASS))
                .append($("<img>").attr("src", imgNamePath)));

        // attach the event Handler
        var clickAction = wiql ? this._onTooManyResultClick : this._onBackLogClick;
        this._$messageContainer.find("#backlog-href").on("click", delegate(this, clickAction));
    }

    public _filterGrid(selection: ItemList.CountFilterItem[]): void {

        // Payload for telemetry
        var properties: IDictionaryStringTo<string> = {};
        if (selection.length > 0) {
            var fullList: number[] = [];
            $.each(selection, (i, itemList: ItemList.CountFilterItem) => {
                fullList = fullList.concat(this._workItemTypeIdMappings[itemList.label]);
            });

            this._filterManager.setFilter(AssignedToMeFilter.PROVIDER_TYPE, { values: fullList });

            properties["ClickTarget"] = (selection.length === 1) ? selection[0].label : "Other";
        }
        else {
            this._filterManager.clearFilters();
        }
        // Fire the telemetry event
        Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.getWidgetTypeId(), Constants.TELEMETRY_SUMMARY_FIELD, properties);
    }

    public _repaintFilterList(
        queryResult: IQueryResult,
        size: ItemList.SizeOptions): void {

        var typeCount: IDictionaryStringTo<number> = {};
        queryResult.payload.rows.forEach((row: string[]) => {
            var workItemType = row[1];
            var workItemId = row[2];
            if (typeCount[workItemType]) {
                typeCount[workItemType] += 1;
            } else {
                this._workItemTypeIdMappings[workItemType] = [];
                typeCount[workItemType] = 1;
            }
            this._workItemTypeIdMappings[workItemType].push(Number(row[0]));
        });

        this._filterItemList = [];
        const projectName = tfsContext.contextData.project.name;
        for (var workItemType in typeCount) {
            const colorAndIcon: IColorAndIcon = WorkItemTypeColorAndIconsProvider.getInstance().getColorAndIcon(projectName, workItemType);
            var option = <ItemList.CountFilterItem>{
                color: colorAndIcon.color,
                icon: colorAndIcon.icon,
                value: typeCount[workItemType],
                label: workItemType,
            };
            this._filterItemList.push(option);
        }

        this._itemListControl.setItems(this._filterItemList);
        this._itemListControl.renderSize({
            width: (size.width - AssignedToMeView.WIDGET_SIDE_PADDING * 2),
            height: size.height
        });
    }

    public getQueryResultData(backlogConfiguration: BacklogConfiguration): IPromise<IQueryResult> {
        var deferred: Q.Deferred<IQueryResult> = Q.defer<IQueryResult>();
        var store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TFS_WorkItemTracking.WorkItemStore>(TFS_WorkItemTracking.WorkItemStore);
        store.beginGetProject(tfsContext.contextData.project.id,
            (project: TFS_WorkItemTracking.Project) => {
                WiqlTemplateHelper.buildWiqlFromBacklogConfiguration(project, backlogConfiguration).then((wiql) => {
                    if (this.isDisposed()) {
                        deferred.resolve(null); //Once disposed, the obligations of this class is released. Async Consumer likewise bails on disposed state.
                    }

                    this._wiql = wiql;
                    var queryData = {
                        name: "tempNewQuery",
                        path: null,
                        wiql: this._wiql,
                        isFolder: false,
                        isPublic: false,
                        hasChildren: false,
                        id: "",
                    }

                    var queryDefinition = new QueryDefinition(project, queryData);
                    queryDefinition.setQuery(this._wiql);

                    if (this._resultProvider == null) {
                        this._resultProvider = new AssignedToMeQueryResultProvider(queryDefinition, { widgetWidth: this._size.width - (2 * AssignedToMeView.WIDGET_SIDE_PADDING) });
                    } else {
                        this._resultProvider.updateWidgetWidth(this._size.width - (this._size.width - 2 * AssignedToMeView.WIDGET_SIDE_PADDING));
                    }
                    this._grid.beginShowResults(this._resultProvider, (queryResult) => {
                        deferred.resolve(queryResult);
                    }, (error) => {
                        deferred.reject(error);
                    });
                });
            }, (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    public initializeLayout(): void {
        this._$titleElement = $("<h2>").addClass(Constants.TITLE_CSS_CLASS);
        this._$itemListContainer = this.createDivWithClass(Constants.COUNT_FILTER_LIST_CONTAINER_CSS_CLASS);
        this._$gridContainer = this.createDivWithClass(Constants.GRID_CONTAINER_CSS_CLASS);

        this._$resultsContainer = this.createDivWithClass(Constants.RESULTS_CONTAINER_CSS_CLASS)
            .append(this._$itemListContainer)
            .append(this._$gridContainer);

        this._$messageContainer = this.createDivWithClass(Constants.MESSAGE_CONTAINER_CSS_CLASS);

        this.getElement().append(this._$titleElement)
            .append(this._$resultsContainer)
            .append(this._$messageContainer);
    }

    private createDivWithClass(className: string): JQuery {
        return $("<div>").addClass(className);
    }

    public updateWidgetTitleCount(count: number): void {
        // Don't need to render the title if we are in the lightbox mode
        if (!this._isInLightbox) {
            var titleValue = Utils_String.format(Resources_Widgets.AssignedToMeWidget_DefaultTitle, TFS_Host_TfsContext.TfsContext.getDefault().contextData.user.name) + " " +
                Utils_String.format("({0})", count);
            this._$titleElement.text(titleValue);

            this.addTooltipIfOverflow(this._$titleElement);
        }
    }

    public getGrid(): Widget_QueryResultGrid.WidgetQueryResultGrid {
        return this._grid;
    }

    public setZeroResultView(): void {
        this._$resultsContainer.hide();
        this._buildMessageBlock(
            Utils_String.format(Resources_Widgets.AssignedToMeWidget_NoWorkText,
                BacklogsUrls.getExternalBacklogContentUrl(this.teamContext.name)),
            AssignedToMeView.GetNoWorkImage());
    }

    public _onBackLogClick() {
        this.fireTelemetryAndNavigate(Constants.TELEMETRY_VIEW_BOARD);
    }

    public _onTooManyResultClick() {
        this._urlBuilderHelper.BuildQueryURLFragment(this._wiql).then(urlFragment => {
            this.fireTelemetryAndNavigate(Constants.TELEMETRY_VIEW_BOARD, urlFragment);
        });
    }

    private fireTelemetryAndNavigate(telemetryEventString: string, urlForNavigate?: string) {
        var properties: IDictionaryStringTo<string> = {};
        properties[Constants.TELEMETRY_TEMPQUERYID_CREATED] = String(this._urlBuilderHelper.newTempQueryCreated());
        Widget_Telemetry.WidgetTelemetry.onWidgetClick(this.getWidgetTypeId(), telemetryEventString, properties);
        const eventAction = WidgetLinkHelper.mustOpenNewWindow()
            ? Events_Action.CommonActions.ACTION_WINDOW_OPEN
            : Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE;

        if (urlForNavigate) {
            Events_Action.getService().performAction(eventAction, {
                url: urlForNavigate
            });
        }
    }
}

/**
 * A helper method that would create a wiql from backlog configuration
 */
export class WiqlTemplateHelper {

    /**
     * Get the number of the OR clause that is build into the template
     */
    public static getProcessOrConditions(backlogConfiguration: BacklogConfiguration): number {
        // All the process + bug        
        return (backlogConfiguration.getAllBacklogLevels().length) + 1;
    }

    /**
    * Create the Wiql query to gather the user's work items.    
    * Note: This layer needs to do some async fan out to obtain context about allowed state.
    */
    public static buildWiqlFromBacklogConfiguration(project: TFS_WorkItemTracking.Project, backlogConfiguration: BacklogConfiguration): IPromise<string> {
        const q: Q.Deferred<string> = Q.defer<string>();        

        let workItemTypeList: string[] = [];

        // Get all the workItem type from the backlog
        for (let backlog of backlogConfiguration.getAllBacklogLevels()) {
            workItemTypeList = workItemTypeList.concat(backlog.workItemTypes || []);
        }        

        project.getWorkItemTypes(workItemTypeList).then((workItemTypes: TFS_WorkItemTracking.WorkItemType[]) => {
            const promises = [];
            // build the promises to get the workItem states
            workItemTypes.forEach((workItemType: TFS_WorkItemTracking.WorkItemType) => {
                promises.push(project.store.getAllowedValues(WITConstants.CoreFieldRefNames.State, project.name, workItemType.name));
            });
            Q.all(promises).then((allowedStateValuesByType:string[][]) => {               
                const expandedQuery = this.generateWiqlImpl(backlogConfiguration,workItemTypes, allowedStateValuesByType, project.name);
                q.resolve(expandedQuery);
            }, (error) => {
                q.reject(error);
            });
        }, (error) => {
            q.reject(error);
        });
        return q.promise;
    }

    /**
     * Synchronous WIQL generator, responsible for string construction details.
     * Occurs after the Work Item Types have been identified and states are mapped out.
     */
    private static generateWiqlImpl(
        backlogConfiguration: BacklogConfiguration,
        workItemTypes: TFS_WorkItemTracking.WorkItemType[],
        allowedStateValuesByType:string[][],
        projectName:string){        

        // This is used to build the final wiql
        const wiqlCoreTemplate = `SELECT [${WITConstants.CoreFieldRefNames.Id}],[${WITConstants.CoreFieldRefNames.State}],[${WITConstants.CoreFieldRefNames.Title}] ` +
        `from WorkItems where [${WITConstants.CoreFieldRefNames.TeamProject}] = '${projectName}' AND ({0})`;

        // This is used to build a condition clause for each work item type
        const typeInclusionConditionTemplate = `([${WITConstants.CoreFieldRefNames.AssignedTo}] = @me AND [${WITConstants.CoreFieldRefNames.WorkItemType}] = '{0}'{1})`;
        
        // Template for sorting the result
        const sortingConditionTemplate = ` ORDER BY [${WITConstants.CoreFieldRefNames.ChangedDate}] DESC`;
        
        // This is used to filter the terminal states for omission.
        const stateConditionTemplate = ` AND [${WITConstants.CoreFieldRefNames.State}] <> '{0}'`;        

        const typeConditions: string[] = [];
        allowedStateValuesByType.forEach((stateValues: string[], index) => {
            var agileStateFilterConditions = [];
            
            //Recognize Terminal States for filtering
            stateValues.forEach((state: string) => {
                
                // check for terminal states which are irrelevant to user
                let agileState = backlogConfiguration.getWorkItemStateCategory(workItemTypes[index].name, state);
                if (!agileState || agileState === WorkItemStateCategory.Completed) {
                    agileStateFilterConditions.push(Utils_String.format(stateConditionTemplate, state));
                }
            });
            
            // Filter out terminal states
            if (agileStateFilterConditions.length > 0) {
                typeConditions.push(Utils_String.format(typeInclusionConditionTemplate, workItemTypes[index].name, agileStateFilterConditions.join(Utils_String.empty)));
            }
        });
                
        return Utils_String.format(wiqlCoreTemplate, typeConditions.join(" OR ")) + sortingConditionTemplate;
    }
}


/**
 * A helper method for dealing with creating the TempWiqlQuery Id
 */
export class wiqlURLBuilder {

    private _createdNewTempQueryId = false;

    /**
     * Build a URL Fragment that would point to the given wiql, if the wiql is too long to make it unsafe for the browser,
     * it would create a tempQueryID and use that in the URL.
     * @param wiql - the wiql to build the URL path with
     */
    public BuildQueryURLFragment(wiql: string): IPromise<string> {
        var q: Q.Deferred<string> = Q.defer<string>();
        var queryURLFragment = tfsContext.getActionUrl("", "queries", {
            _a: "query",
            wiql: wiql,
            name: Resources_Widgets.AssignedToMeWidget_TempQueryName
        } as TFS_Host_TfsContext.IRouteData);
        var fullUrl = tfsContext.getHostUrl() + queryURLFragment;
        if (!Utils_Url.isUrlWithinConstraints(fullUrl)) {
            this._buildTempQueryId(wiql).then((tempQueryId) => {
                q.resolve(
                    tfsContext.getActionUrl("", "queries", {
                        tempQueryId: tempQueryId,
                        fullScreen: false
                    } as TFS_Host_TfsContext.IRouteData));
            }, (error) => {
                q.reject(error);
            });
        } else {
            q.resolve(queryURLFragment);
        }
        return q.promise;
    }

    // TODO: Factor out of this widget as it is not used here.
    public BuildQueryURL(wiql: string, queryName: string): IPromise<string> {
        var q: Q.Deferred<string> = Q.defer<string>();
        var queryURLFragment = tfsContext.getActionUrl("", "queries", {
            _a: "query",
            wiql: wiql,
            name: queryName
        } as TFS_Host_TfsContext.IRouteData);
        var fullUrl = tfsContext.getHostUrl() + queryURLFragment;
        if (!Utils_Url.isUrlWithinConstraints(fullUrl)) {
            this._buildTempQueryId(wiql).then((tempQueryId) => {
                q.resolve(
                    tfsContext.getActionUrl("", "queries", {
                        tempQueryId: tempQueryId,
                        fullScreen: false
                    } as TFS_Host_TfsContext.IRouteData));
            }, (error) => {
                q.reject(error);
            });
        } else {
            q.resolve(fullUrl);
        }
        return q.promise;
    }

    /**
     * Create a tempQueryId with the wiql if there isn't one in the browser LocalStorage
     * @param wiql - the wiql for creating the query
     */
    public _buildTempQueryId(wiql: string): IPromise<string> {
        var q: Q.Deferred<string> = Q.defer<string>();
        var previousData = this._getAssignedToMeLocalStorageInfo();
        var needNewTempQuery = true;
        this._createdNewTempQueryId = false;

        // There are 2 conditions that would cause us to create a new temp QueryID.
        // 1. If the the storeWiql is different than our wiql.. -> it means it either we hadn't create tempQueryId yet, or the process template changed.
        // 2. The stored timestamp is longer than the 90 days time frame, we would create a new temp query.
        if (previousData.Wiql === wiql) {
            // There is not easy way to determine when a tempquery expired after than making a query and check whether it return a 404 or not.
            // So, we are keeping track with a timestamp ourselves
            var startDate = Utils_Date.shiftToUTC(new Date(Number(previousData.queryTimeStamp)));
            var currentDate = Utils_Date.shiftToUTC(new Date());
            if (Utils_Date.daysBetweenDates(startDate, currentDate, true) < Widget_QueryResultGrid.WidgetQueryResultGrid.COPY_QUERY_URL_DAYS_TO_EXPIRE) {
                needNewTempQuery = false;
            }
        }

        const successCallback = (tempQueryId) => {
            this.setAssignedToMeLocalStorageInfo(<AssignedToMeLocalStorageInfo>{
                Wiql: wiql,
                tempQueryId: tempQueryId,
                queryTimeStamp: new Date().getTime().toString()
            });
            this._createdNewTempQueryId = true;
            q.resolve(tempQueryId);
        };
        const errorCallback = (error) => {
            q.reject(error);
        };

        if (needNewTempQuery) {
            TempQueryUtils.beginCreateTemporaryQueryId(tfsContext, wiql).then(successCallback, errorCallback);
        } else {
            q.resolve(previousData.tempQueryId);
        }
        return q.promise;
    }

    /**
     * A method to check did a new TempQueryID had been created after execute the _buildTempQueryId method
     */
    public newTempQueryCreated(): boolean {
        return this._createdNewTempQueryId;
    }

    public _getAssignedToMeLocalStorageInfo(): AssignedToMeLocalStorageInfo {
        var undefined = "undefined";
        var standardData = <AssignedToMeLocalStorageInfo>{
            Wiql: undefined,
            tempQueryId: undefined,
            queryTimeStamp: (new Date()).getTime().toString()
        }
        var data = LocalStorageWrapper.read(AssignedToMeView.AssignedToMeStorageKey, undefined);

        if (data === undefined) {
            return standardData;
        } else {
            try {
                return <AssignedToMeLocalStorageInfo>JSON.parse(data);
            } catch (e) {
                return standardData;
            }
        }
    }

    private setAssignedToMeLocalStorageInfo(data: AssignedToMeLocalStorageInfo): void {
        LocalStorageWrapper.write(AssignedToMeView.AssignedToMeStorageKey, JSON.stringify(data));
    }
}


// register control as an enhancement to allow the contribution model to associate it with the widget host.
SDK.registerContent("dashboards.assignedToMe-init", (context) => {
    return Controls.create(AssignedToMeView, context.$container, context.options);
});

