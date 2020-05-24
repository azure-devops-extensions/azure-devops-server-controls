///<amd-dependency path="VSS/Utils/Draggable"/>
///<amd-dependency path="jQueryUI/droppable"/>
/// <reference types="jquery" />
import * as React from "react";
import ReactDOM = require("react-dom");

import { registerCommonTemplates } from "Agile/Scripts/Board/Templates";
import Cards = require("Agile/Scripts/Card/Cards");
import CardControls = require("Agile/Scripts/Card/CardsControls");
import Util_Cards = require("Agile/Scripts/Card/CardUtils");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_Agile_Controls = require("Agile/Scripts/Common/Controls");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import {
  BoardType,
  ControlUtils,
  DatabaseCoreFieldRefName,
  isUseNewIdentityControlsEnabled,
  WorkItemCategoriesUtils
} from "Agile/Scripts/Common/Utils";
import { ITeam } from "Agile/Scripts/Models/Team";
import SprintPlanningResources = require("Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning");
import TaskboardResources = require("Agile/Scripts/Resources/TFS.Resources.AgileTaskboard");
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import { IClassificationData, IMetaStateRollupData, IRollup, TaskBoardModel } from "Agile/Scripts/Taskboard/TaskBoardModel";
import { TaskboardShortcutGroup } from "Agile/Scripts/Taskboard/TaskboardShortcutGroup";
import { GenericFilterZeroData } from "Presentation/Scripts/TFS/Components/GenericFilterZeroData";
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { WorkItemStateCategory } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { FormatUtils } from "Presentation/Scripts/TFS/FeatureRef/FormatUtils";
import { WorkItemTypeColorAndIcons, WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_UI_Controls_Common = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import Controls = require("VSS/Controls");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Notifications = require("VSS/Controls/Notifications");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Diag = require("VSS/Diag");
import VSSError = require("VSS/Error");
import Events_Handlers = require("VSS/Events/Handlers");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Telemetry = require("VSS/Telemetry/Services");
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import { BrowserCheckUtils, domElem, KeyCode } from "VSS/Utils/UI";
import VSS = require("VSS/VSS");
import { FilterManager, IFilter } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import * as WitZeroDataResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking.ZeroData";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { CommonContextMenuItems } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.Accessories";
import { haveBacklogManagementPermission } from "WorkItemTracking/Scripts/Utils/PermissionHandler";

interface IContentTemplate {
  people: string;
  requirements: string;
};

interface IElementBounds {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/* tslint:disable:member-ordering */
export class TaskBoardView {
  public static ADD_NEW_CARD_CLASS: string = "board-add-card";
  public static ADD_NEW_CARD_ICON_CLASS: string = "bowtie-math-plus-box-light";
  public static ADD_NEW_CARD_WRAPPER_CLASS: string = "add-new-item-wrapper";
  public static ATTR_TILE_ORDER = "order";   // Tile's order in the cell
  public static AXIS_ID_SEPARATOR: string = "_s";
  public static COLLAPSED_TILE_GUTTER: string = "<span class='collapsed-tile-gutter'/>";
  public static DATA_SUBCOLUMN_COUNT = "subColumnCount";
  public static DATA_SUBCOLUMN_HEIGHT = "height";
  public static DATA_PIVOT_KEY: string = "pivot-key";
  public static DATA_TILE_COUNT = "tileCount";
  public static DATA_TILE_HEIGHT = "height";
  public static DATA_BIND_CLICK: string = "bind-click";
  public static DATA_WIT_STATE: string = "wit-state";
  public static DATA_CLASSIFICATION_DATA: string = "classificationData";
  public static DRAG_START_DISTANCE: number = 5;
  public static IS_NEW_PARENT_ROW: string = "is-new-parent-row"
  public static ORDER_BY_FIELD_NAME = ".ORDER_BY";

  public static EVENT_CREATE_NEW_WORK_ITEM: string = "create-work-item";
  public static EVENT_DISCARD_WORK_ITEM: string = "discard-work-item";
  public static EVENT_MOVE_WORK_ITEM_TO_ITERATION: string = "move-work-item-to-iteration";
  public static EVENT_EDIT_WORK_ITEM: string = "edit-work-item";
  public static EVENT_INSERT_TILE_COMPLETED: string = "insert-tile-completed";
  public static EVENT_WORK_ITEM_DRAGGING: string = "work-item-drag-started";
  public static EVENT_WORK_ITEM_CHANGE_REQUESTED: string = "work-item-change-requested";
  public static EVENT_WORK_ITEM_REORDER_REQUESTED: string = "work-item-reorder-requested";
  public static EVENT_NEW_PARENT_DISCARDED: string = "new-parent-item-discarded";
  public static EXPANDER_CLASS = "taskboard-expander";

  public static FIELD_PARENT_ID: string = "ParentId";
  public static FLEX_CONTAINER_CLASS: string = "flexContainer";
  public static HIGHLIGHT_ON_ROW_CHANGE_CLASS: string = "highlight-on-row-change";
  public static HIGHLIGHTED_DROPPABLE_CLASS: string = "dragHover";
  public static HIGHLIGHTED_PARENT_CLASS: string = "dragReparentHover";
  public static HIGHLIGHTED_BORDER_CLASS: string = "rowReparentHover";
  public static ICON_EDIT_CLASS: string = "editIcon";
  public static EDIT_MODE_CLASS: string = "editMode";
  public static ICON_WARNING: string = "<span class='icon bowtie-icon bowtie-status-warning pivot-warning' style='display:none; '/>";
  public static PARENT_CLASSIFICATION_CONTENT_TEMPLATE: string = "<div class='taskboard-parent-wrapper'><span class='witTitle clickable-title' tabindex='0'>[System.Title]</span>{0}</div><div class='witRemainingWork ellipsis'/>";
  public static PARENT_CLASSIFICATION_SUMMARY_TEMPLATE: string = "<div class='ellipsis' tabindex=0>{0}{1}<span class='witTitle'>[System.Title]</span><div class='witStateSummary'/></div>";
  public static PEOPLE_CLASSIFICATION_CONTENT_TEMPLATE: string = "<div class='taskboard-parent-wrapper'><span class='witTitle clickable-title'>[System.AssignedTo]</span></div><div class='witRemainingWork ellipsis'/>";
  public static PEOPLE_CLASSIFICATION_SUMMARY_TEMPLATE: string = "<div class='ellipsis' tabindex=0><span class='peopleClassification witTitle'>[System.AssignedTo]</span><div class='witStateSummary'/></div>";
  public static TITLE_CLASS: string = CardControls.FieldRendererHelper.TITLE_CLASS;
  public static TITLE_SELECTOR: string = "." + TaskBoardView.TITLE_CLASS;
  public static ROW_ID_PREFIX: string = "taskboard-row-";
  public static ROW_CLASS: string = "taskboard-row";
  public static ROW_CSS_SELECTOR: string = ".taskboard-row";
  public static SUMMARY_ROW_CSS_CLASS: string = "taskboard-row-summary";
  public static SUMMARY_ROW_TEMPLATE: string = "<tr class='taskboard-row taskboard-row-summary' id='taskboard-summary-row-{0}' style='display: none; '><td class='taskboard-expander'><button class='bowtie-icon bowtie-toggle-tree-collapsed' title='{2}' aria-label='{3}'></button></td><td class='taskboard-cell taskboard-parent taskboard-parent-width' colspan='{1}'><div class='tbPivotItem'></div></td></tr>";
  public static SUMMARY_ROW_ID_PREFIX: string = "taskboard-summary-row-";
  public static CELL_CLASS = "taskboard-cell";
  public static CELL_SUBCOLUMN_CLASS = "subColumn";
  private static CELL_SUBCOLUMN_PREFIX = "subColumn";
  private static CELL_PADDING = 5;
  public static TASKBOARD_CHILD_TILE_CLASS = "childTbTile";
  public static TASKBOARD_MESSAGE_AREA_CLASS: string = "taskboard-message-area";
  public static TASKBOARD_DISMISSABLE_MESSAGE_AREA_CLASS: string = "taskboard-dismissable-message-area";
  public static TASKBOARD_REORDER_MESSAGE_AREA_ID: string = "taskboardReorderMessageArea";
  public static TASKBOARD_TABLE_BODY_ID: string = "taskboard-table-body";
  public static TASKBOARD_TABLE_HEADER_ID: string = "taskboard-table-header";
  public static TILE_CSS_CLASS = "tbTile";
  public static TILE_EDIT_TEXT_CLASS: string = "onTileEditTextDiv";
  public static TILE_DROP_ANIMATION_TOP_BUFFER: number = 5;
  public static TILE_DROP_ANIMATION_BOTTOM_BUFFER: number = 25;
  public static TILE_DROP_ANIMATION_SCROLLBAR_BUFFER: number = 25;
  public static TILE_DROP_ANIMATION_DURATION_DISTANCE_THRESHOLD: number = 50;
  public static TILE_DROP_ANIMATION_DURATION_FAST_TIME: number = 300;
  public static TILE_DROP_ANIMATION_DURATION_SLOW_TIME: number = 500;
  public static TILE_ID_PREFIX: string = "tile-";
  private static TILE_MARGIN = 5;
  private static TILE_WIDTH = 185;
  public static WORK_SUMMARY: string = "<span class='work-item-count'/><span class='witRemainingWork'/>";
  public static TILE_MAX_TAGS = "4";
  public static TILE_TAG_CHARACTER_LIMIT = "18";
  private static TASKBOARD_FOCUS_BORDER_GREYCOLOR: string = "#969696";
  private static TASKBOARD_ARIA_DESCRIBEDBY_ID: string = "taskboard-aria-describedby-id";
  private static TASKBOARD_TITLE_ID = "iteration-board-title-id";
  private static TASKBOARD_COLLAPSE_TEXT = "expand-collapse-text";
  private static TASKBOARD_COLLAPSE_BUTTON = "expand-collapse-button";
  private static TASKBOARD_EXPAND_ICON = "bowtie-icon bowtie-chevron-down-all";
  private static TASKBAORD_COLLAPSE_ICON = "bowtie-icon bowtie-chevron-up-all";

  public static itemSourceType: string = "wit";

  // Controls
  private _messageArea: Notifications.MessageAreaControl;
  private _contextMenu: Menus.PopupMenu;
  private _addNewItemControls: IDictionaryStringTo<TFS_Agile_Controls.AddNewItemControl>;

  // Functions, delegates, and helpers
  private _acceptTileHandler: any;
  private _highlightRowCurry: any;
  private _cardRenderer: CardControls.ICardRenderer;
  private _cardSettingsProvider: Cards.CardSettingsProvider;
  private _cardEditController: CardControls.ICardEditController;
  private _events: Events_Handlers.NamedEventCollection<any, any>;
  private _loadNewItemButtonPromises: IPromise<void>[] = [];
  private _shortcutGroup: TaskboardShortcutGroup;

  // Elements and Containers
  public _$container: JQuery;
  public _$tableBody: JQuery;
  private _$tableHeader: JQuery;
  public _$tableHeaderContainer: JQuery;
  public _$tableBodyContainer: JQuery;
  private _$messageArea: JQuery;
  private _$dismissableMessageArea: JQuery;
  private _currentHoveredDroppable: JQuery;
  private _currentPaintedDroppable: JQuery;
  private _$cardContextMenuContainer: JQuery;
  private _cellLookupTable: { [pivotValue: string]: { [stateName: string]: JQuery } };
  private _tileCache: IDictionaryNumberTo<JQuery>;
  private _zeroDataContainer: HTMLElement;

  // Models and other data
  private _teamId: string;
  private _model: TaskBoardModel;
  private _classificationType: string;
  private _templateFieldRegExp: RegExp;
  private _viewState: TaskBoardViewState;
  private _viewDisplayed: boolean;
  private _maxRowId: number;
  private _filteredRows: any;
  private _mousedownX: number;
  private _mousedownY: number;
  private _rowPivotKeyMap: any;
  private _parentContentTemplate: IContentTemplate;
  private _summaryContentTemplate: IContentTemplate;
  private _remainingWorkRollUp: IRollup;
  public _scrollBarWidth: number;
  private _pausePositionTile: boolean;
  private _customColumnCount: number;
  private _contextMenuId: number;
  // default border color to be replaced on blur of a tile.
  private _tileContentBorderColor: string;
  // bool used to decide if focus has to be reset on a tile after edit is completed.
  private _tileHasFocus: boolean = false;
  private _expandAllButtonState: boolean; // true means "Expand All" is visible 
  private _allowParentItemsToBeDraggable: boolean;
  private _useNewTaskboardDisplay: boolean;

  constructor(container: JQuery, teamId: string, allowParentItemsToBeDraggable: boolean = true, useNewTaskboardDisplay: boolean = false) {
    Diag.Debug.assertParamIsObject(container, "container");

    this._teamId = teamId;

    registerCommonTemplates();
    this._events = new Events_Handlers.NamedEventCollection();
    this._$container = container;
    this._templateFieldRegExp = /\[([\.a-zA-Z0-9_]+)\]/g;  // WitPlatform verifies this as @"^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$";
    this._pausePositionTile = false;

    const that = this;
    this._acceptTileHandler = function ($draggable) { // important to _not_ be a lambda function - we need 'this' at call time
      return that._acceptTile($(this), $draggable);
    };

    this._highlightRowCurry = Utils_Core.curry(this._highlightRow, this);
    this._viewState = new TaskBoardViewState();
    this._tileCache = {};
    this._filteredRows = {};
    this._parentContentTemplate = {
      people: null,
      requirements: null
    };
    this._summaryContentTemplate = {
      people: null,
      requirements: null
    };
    this._cardRenderer = CardControls.CardRendererFactory.createInstance(TaskBoardView.itemSourceType, [teamId]);
    this._cardEditController = new CardControls.BoardCardEditController(this._cardRenderer);

    this._allowParentItemsToBeDraggable = allowParentItemsToBeDraggable;
    this._useNewTaskboardDisplay = useNewTaskboardDisplay;

    // Register Taskboard shortcuts
    this._shortcutGroup = new TaskboardShortcutGroup();
  }

  /**
   * $current
   *     Sets the focus to the tile with the provided id.
   * 
   * @param id 
   *     ID of the work item to find the tile for.
   * 
   */
  public setFocusTile(id: number): void {
    Diag.Debug.assertParamIsNumber(id, "id");

    var $tile = this._findTile(id);
    if ($tile) {
      $tile.focus();
    }
  }

  /**
   * Refresh the Pivot display data from model
   * 
   * @param id Workitem Id
   */
  private _refreshSummaryRowTitle(id: number): void {

    Diag.Debug.assertParamIsNumber(id, "id");

    var value = this._getFormattedFieldValue(id, DatabaseCoreFieldRefName.Title),
      rowId = this._getRowIdFromPivotKey(id);
    $("#" + TaskBoardView.SUMMARY_ROW_ID_PREFIX + rowId + " .witTitle:first").html(value);
  }

  /**
   * Refresh the Pivot display data from model
   * 
   * @param id Workitem Id
   */
  public refreshPivotAfterEdit(id: number): void {

    this._refreshSummaryRowTitle(id);
    this.refreshTileAfterEdit(id);
  }

  /**
   * Refreshes the tile for the work item with the provided id and update the rollups.
   * @param id ID of the work item to refresh the tile for.
   */
  public refreshTile(id: number): void {

    Diag.Debug.assertParamIsNumber(id, "id");

    var $tile: JQuery;

    // Find the tile for the work item.
    $tile = this._findTile(id);
    if ($tile) {
      // Perform the update of the tile and update the rollups.
      this._updateTile($tile, id);
      this._updateTotals();

      // Update aria-label on the tile
      $tile.attr("aria-label", this._getTaskboardTileLabelText(id));

      if (this._tileHasFocus) {
        $tile.focus();
      }

      const filterManager = this._model.getFilterManager();
      if (filterManager) {
        filterManager.dataUpdated();
      }
    }
  }

  public getCardSettingsProvider(): Cards.CardSettingsProvider {
    return this._cardSettingsProvider;
  }

  public setCardSettingsProvider(provider: Cards.CardSettingsProvider) {
    this._cardSettingsProvider = provider;
  }

  /**
   * Displays a taskboard view
   * @param model The TaskBoard Model
   * @param classificationType The classification view (group by setting)
   * @param forceUpdate An option to force the taskboard to re-render, even if the underlying data and grouping hasn't changed
   */
  public display(model: TaskBoardModel, classificationType: string, forceUpdate: boolean = false): void {
    Diag.Debug.assertParamIsObject(model, "model");
    Diag.Debug.assertParamIsStringNotEmpty(classificationType, "classificationType");

    // If we are already displaying the classification requested, return.
    if ((this._classificationType === classificationType) && !forceUpdate) {
      Diag.logTracePoint('TaskBoardView.display.complete');
      return;
    }

    // If the view has already been displayed previously, clean it up.
    if (this._viewDisplayed) {
      // Destroy the droppable items in the container.
      $(".ui-droppable", this._$container).droppable("destroy");

      // Detach any tiles in the container because they will be re-attached to the new table.
      $(".tbTile", this._$container).detach();

      // Clean up zero data display, if it exists
      if (this._zeroDataContainer) {
        ReactDOM.unmountComponentAtNode(this._zeroDataContainer);
        this._zeroDataContainer = null;
      }

      // Empty out the contents of the container.
      this._$container.empty();
    }

    // Clear the view displayed flag.
    this._viewDisplayed = false;


    // message-area-control for taskboard
    this._$messageArea = $("<div>").addClass(TaskBoardView.TASKBOARD_MESSAGE_AREA_CLASS);

    // dismissable message-area-control for taskboard
    this._$dismissableMessageArea = $("<div>").addClass(TaskBoardView.TASKBOARD_DISMISSABLE_MESSAGE_AREA_CLASS);

    this._$tableHeaderContainer = $("<div/>")
      .addClass("taskboardTableHeaderScrollContainer nonScrollable");

    this._$tableBodyContainer = $("<div/>")
      .addClass("taskboardTableBodyScrollContainer scrollable")
      // set the tab index to -1 so on click the tableBodyContainer is focused instead of 'vss-PivotBar--content' (which had tab index added in PR 329760)
      // this is to keep focus inside the scrollable container so keyboard navigation works.
      .attr("tabindex", "-1");

    // Adding one level extra div to Align header and body on scrolling
    const $tableHeaderInnerContainer = $("<div/>")
      .addClass("tableHeaderInnerContainer");

    this._$tableHeaderContainer.append($tableHeaderInnerContainer);

    if (model.hasVisibleIds()) {
      this._populateContainer(classificationType);
    }
    else {
      // Display a specific "Zero Data display" if there are no items to display
      const zeroDataTsx = React.createElement(GenericFilterZeroData, { artifactName: WitZeroDataResources.ZeroData_Filter_WorkItems_ArtifactName });
      this._zeroDataContainer = this._$container.append($("<div/>"))[0];
      ReactDOM.render(zeroDataTsx, this._zeroDataContainer);
    }

    if (model !== this._model) {
      if (this._model != null) {
        this.detachFilterEvents(this._model.getFilterManager());
      }
      this.attachFilterEvents(model.getFilterManager());
    }

    // Save off the model and classification type.
    this._model = model;

    // clear the caches
    // TODO: there is an issue where model _childWorkItemIds are not kept in sync
    // To fix that issue, and then this can be removed
    this._model.clearChildrenLookupTable();

    this._classificationType = classificationType;
    this._rowPivotKeyMap = {};

    // Clear the "Assigned To" cache
    CardControls.AssignedToFieldRenderer.initializeCache();

    // Setup the parent content templates based on the new model.
    this._setupContentTemplates();

    // The message area needs to be added before the height calculation for the table body happens in _adjustTopOfDivsAndWidthOfTableContainingHeader method
    if (this._isAdvancedBacklogManagement() &&
      !TFS_UI_Controls_Common.DismissableMessageAreaControl.isDismissedOnClient(TaskBoardView.TASKBOARD_REORDER_MESSAGE_AREA_ID, TFS_WebSettingsService.WebSettingsScope.User)) {

      if (this._classificationType === TaskboardGroupBy.PEOPLE_CLASSIFICATION) {
        this._displayReorderDisabledMessage(TaskboardResources.Taskboard_PeopleClassification_ReorderMessage);
      }
      else if (this._model.hasNestedTasks()) {
        let problemWorkItemIds = this._model.reorderBlockingWorkItemIds.join(", ");

        var $link = $("<a />", {
          href: "https://go.microsoft.com/fwlink/?LinkID=521935",
          text: SprintPlanningResources.ReorderingRequirementsDisabled_HyperLinkText,
          target: "_blank",
          rel: "noopener noreferrer"
        });

        var $messageDiv = $("<div>")
          .append("<span>" + Utils_String.format(SprintPlanningResources.ReorderingRequirementsDisabled_Message, problemWorkItemIds) + " " + "</span>")
          .append($link);

        this._displayReorderDisabledMessage($messageDiv.html());
      }
    }

    // Ensure Rollup Data is Up to Date
    this.calculateRollup();

    // Build the table for the taskboard.
    if (model.hasVisibleIds()) {
      this._buildTaskboardTable();

      // update the row visibility based on the filter
      this._setAllRowsFiltering();
    }

    // Skip Rollup Calculation and just update UI
    this._updateTotals(true);

    // focus table body container so keyboard scrolling is enabled
    this._$tableBodyContainer.focus();

    // Set the flag indicating that the initial view generation has completed.
    this._viewDisplayed = true;

    Diag.logTracePoint('TaskBoardView.display.complete');
  }

  /**
   * A callback used by the SprintsHubTaskboardFilter
   * @param filter The new state for the FilterManager
   */
  public updateFilter = (filter: IDictionaryStringTo<IFilter>) => {
    this.applyFilter();
  }

  private attachFilterEvents(filterManager: FilterManager): void {
    if (filterManager != null) {
      filterManager.attachEvent(FilterManager.EVENT_FILTER_CHANGED, this.updateFilter);
      filterManager.attachEvent(FilterManager.EVENT_FILTER_CLEARED, this.updateFilter);
    }
  }

  private detachFilterEvents(filterManager: FilterManager): void {
    if (filterManager != null) {
      filterManager.detachEvent(FilterManager.EVENT_FILTER_CHANGED, this.updateFilter);
      filterManager.detachEvent(FilterManager.EVENT_FILTER_CLEARED, this.updateFilter);
    }
  }

  /**
   *     For each cell on the board, removes any sub-columns if present and adds appropriate number
   *     of sub-columns based on available width. If number of subcolumns is 1, we don't use custom layout
   *     for performance optimization
   */
  private _resetCellSubColumns() {
    var $tbCell: JQuery;

    $("td." + TaskBoardView.CELL_CLASS + ".ui-droppable", this._$container).each((index: number, tbCell: Element) => {
      $tbCell = $(tbCell);

      // Detach tiles in the cell
      $("." + TaskBoardView.TILE_CSS_CLASS, $tbCell).detach();
      $(tbCell).data(TaskBoardView.DATA_TILE_COUNT, 0);

      // Remove any existing subcolumns
      $("." + TaskBoardView.CELL_SUBCOLUMN_CLASS, $tbCell).remove();

      if (this._isEffectiveCustomLayout()) {
        this._createCustomColumnsInCell($tbCell, this._customColumnCount);
      }
    });
    this._recordCellSubColumnTelemetry();
  }

  /**
   * Logs number of sub-columns for the cells on the board (for custom layout)
   */
  private _recordCellSubColumnTelemetry() {
    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
      CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
      CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_TASKBOARD_CUSTOMLAYOUT, {
        "SubColumnCount": this._customColumnCount
      }));
  }

  private _calculateColumnSizeForCustomLayout(): number {
    // we get the width of the first cell of the header row to calculate the number of custom columns which should be created
    // there is an assumption made here that the width of all the taskboard cells is same
    var $headerRow = $('thead', this._$container).find(TaskBoardView.ROW_CSS_SELECTOR);
    var cell = $("." + TaskBoardView.CELL_CLASS + ":not(.taskboard-parent)", $headerRow);
    var cellWidth = cell.width();
    var effectiveCellWidth = cellWidth - 2 * TaskBoardView.CELL_PADDING - 1;

    // Find the effective cell width, by taking padding and border into account
    var subColumnWidth = TaskBoardView.TILE_WIDTH + 2 * TaskBoardView.TILE_MARGIN;

    //The number of columns that can be created
    var columnCount = Math.floor(effectiveCellWidth / subColumnWidth);
    return columnCount;
  }

  private _createCustomColumnsInCell($tbCell: JQuery, columnCount: number) {

    $tbCell.data(TaskBoardView.DATA_SUBCOLUMN_COUNT, columnCount);

    for (var i = 0; i < columnCount; i++) {
      var $column = $(domElem("div", TaskBoardView.CELL_SUBCOLUMN_CLASS)).attr("id", TaskBoardView.CELL_SUBCOLUMN_PREFIX + i);
      $column.data(TaskBoardView.DATA_SUBCOLUMN_HEIGHT, 0);

      $tbCell.append($column);
    }
  }

  public _getContainerElement(): JQuery {
    return this._$container;
  }

  /**
   * Attach a handler to be called when a new parent work item is descarded
   * @param handler The handler to attach
   */
  public attachNewParentWorkItemDiscarded(handler: () => void): void {
    this._events.subscribe(TaskBoardView.EVENT_NEW_PARENT_DISCARDED, handler);
  }

  /**
   * Attach a handler to be called when a new parent work item is descarded
   * @param handler The handler to attach
   */
  public detachNewParentWorkItemDiscarded(handler: () => void): void {
    this._events.unsubscribe(TaskBoardView.EVENT_NEW_PARENT_DISCARDED, handler);
  }

  /**
   * Attach a handler for the EVENT_WORK_ITEM_DRAGGING event
   * @param handler The handler to attach
   */
  public attachWorkItemDragging(handler: IEventHandler): void {
    this._events.subscribe(TaskBoardView.EVENT_WORK_ITEM_DRAGGING, <any>handler);
  }

  /**
   * Remove a handler for the EVENT_WORK_ITEM_DRAGGING event
   * @param handler The handler to remove
   */
  public detachWorkItemDragging(handler: IEventHandler): void {
    this._events.unsubscribe(TaskBoardView.EVENT_WORK_ITEM_DRAGGING, <any>handler);
  }

  /**
   * Attach a handler for the EVENT_WORK_ITEM_CHANGE_REQUESTED event
   * @param handler The handler to attach
   */
  public attachWorkItemChangeRequested(handler: IEventHandler): void {
    this._events.subscribe(TaskBoardView.EVENT_WORK_ITEM_CHANGE_REQUESTED, <any>handler);
  }

  /**
   * Remove a handler for the EVENT_WORK_ITEM_CHANGE_REQUESTEDworkItemCha event
   * @param handler The handler to remove
   */
  public detachWorkItemChangeRequested(handler: IEventHandler): void {
    this._events.unsubscribe(TaskBoardView.EVENT_WORK_ITEM_CHANGE_REQUESTED, <any>handler);
  }

  /**
   * Attach a handler for the EVENT_WORK_ITEM_REORDER_REQUESTED event
   * @param handler The handler to attach
   */
  public attachWorkItemReorderRequested(handler: IEventHandler): void {
    this._events.subscribe(TaskBoardView.EVENT_WORK_ITEM_REORDER_REQUESTED, <any>handler);
  }

  /**
   * Remove a handler for the EVENT_WORK_ITEM_REORDER_REQUESTED event
   * @param handler The handler to remove
   */
  public detachWorkItemReorderRequested(handler: IEventHandler): void {
    this._events.unsubscribe(TaskBoardView.EVENT_WORK_ITEM_REORDER_REQUESTED, <any>handler);
  }

  /**
   * Attach a handler for the EVENT_EDIT_WORK_ITEM event
   * @param handler The handler to attach
   */
  public attachEditWorkItem(handler: IEventHandler): void {
    this._events.subscribe(TaskBoardView.EVENT_EDIT_WORK_ITEM, <any>handler);
  }

  /**
   * Remove a handler for the EVENT_EDIT_WORK_ITEM event
   * @param handler The handler to remove
   */
  public detachEditWorkItem(handler: IEventHandler): void {
    this._events.unsubscribe(TaskBoardView.EVENT_EDIT_WORK_ITEM, <any>handler);
  }

  /**
   * Attach a handler for the EVENT_CREATE_NEW_WORK_ITEM event
   * @param handler The handler to attach
   */
  public attachCreateNewWorkItem(handler: IEventHandler): void {
    this._events.subscribe(TaskBoardView.EVENT_CREATE_NEW_WORK_ITEM, <any>handler);
  }

  /**
   * Remove a handler for the EVENT_CREATE_NEW_WORK_ITEM event
   * @param handler The handler to remove
   */
  public detachCreateNewWorkItem(handler: IEventHandler): void {
    this._events.unsubscribe(TaskBoardView.EVENT_CREATE_NEW_WORK_ITEM, <any>handler);
  }

  /**
   * Attach a handler for the EVENT_DISCARD_WORK_ITEM event
   * @param handler The handler to attach
   */
  public attachDiscardWorkItem(handler: IEventHandler): void {
    this._events.subscribe(TaskBoardView.EVENT_DISCARD_WORK_ITEM, <any>handler);
  }

  /**
   * Remove a handler for the EVENT_DISCARD_WORK_ITEM event
   * @param handler The handler to remove
   */
  public detachDiscardWorkItem(handler: IEventHandler): void {
    this._events.unsubscribe(TaskBoardView.EVENT_DISCARD_WORK_ITEM, <any>handler);
  }

  public attachMoveWorkItemToIteration(handler: IEventHandler): void {
    this._events.subscribe(TaskBoardView.EVENT_MOVE_WORK_ITEM_TO_ITERATION, handler as any);
  }

  public detachMoveWorkItemToIteration(handler: IEventHandler): void {
    this._events.unsubscribe(TaskBoardView.EVENT_MOVE_WORK_ITEM_TO_ITERATION, handler as any);
  }

  /**
   * Refresh a tile post Update
   */
  public refreshTileAfterEdit(id): void {

    this._viewState.clearError(id);

    // Clear out any state information we have saved in the model for this work item.
    this._model.clearWorkItemSavedState(id);

    this.refreshTile(id);
    this.setFocusTile(id);

    if (this._classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION) {
      var pivot_key = this._model.getPivotFieldValue(id, this._classificationType);
      var state = this._model.getStateFieldValueAsKey(id);
      var parentId = (pivot_key === TaskBoardModel.NULL_PIVOT_KEY) ? 0 : pivot_key;
      var pivotRowLookup = this._cellLookupTable[pivot_key];
      if (!pivotRowLookup || !pivotRowLookup[state]) {
        // Remove the tile from childLookupTable if it is removed from board
        parentId = null;
      }
      this._model.updateChildrenLookupTableAfterEdit(id, parentId);
    }
  }

  /**
   * Displays a work item on the taskboard.
   * If a tile already exists for the given work item then it will be refreshed, otherwise a new tile will be added.
   * 
   * @param id The ID of the work item to add to the taskboard
   */
  public displayWorkItem(id: number): void {
    Diag.Debug.assertParamIsNumber(id, "id");

    if (this._findTile(id)) {
      this.refreshTile(id);
    } else {
      this._createTile(id);
      this._updateTotals();
    }
  }

  /**
   * Applies the current filter set by the model
   */
  public applyFilter(): void {
    let getChildIds: (pivotKey) => number[];
    const map: IDictionaryStringTo<number[]> = this._getPeopleChildMap();
    if (map) {
      getChildIds = (pivotKey: string) => { return map[pivotKey.toUpperCase()] || [] };
    }
    else {
      getChildIds = (pivotKey) => {
        if (Utils_String.equals(pivotKey, TaskBoardModel.NULL_PIVOT_KEY, true)) {
          pivotKey = 0;
        }
        return this._model.getChildWorkItemIdsByParent(pivotKey);
      }
    }

    // Ensure rows to be expanded exist otherwise they will remain collapsed
    const classifications: IClassificationData[] = this._model.getClassification(this._classificationType);
    for (let classification of classifications) {
      if (!this._getDisplayRow(this._getRowId(classification))) {
        let childIds: number[] = getChildIds(classification.pivotKey);
        let matchesFilter: boolean = childIds.length === 0 || childIds.some(id => this._model.matchesFilter(id));
        if (matchesFilter) {
          // no need to toggle state for expand collapse all button here. This is just to ensure all detail rows exist. 
          // we will set expand collapse state in _setAllRowsFiltering
          this._toggleRowVisibility(classification, map);
        }
      }
    }

    let id;
    const tiles = this._tileCache;

    this._filteredRows = {};
    for (id in tiles) {
      if (tiles.hasOwnProperty(id)) {
        id = Number(id);
        let pivotKey = this._model.getPivotFieldValue(id, this._classificationType);

        this._setTileFiltering(id, tiles[id], pivotKey, false);
      }
    }

    this._setAllRowsFiltering();
  }


  public getRowCount(): number {
    return this._maxRowId;
  }

  public getVisibleSummaryRowCount(): number {
    return $(".taskboard-row-summary:visible").length;
  }

  public getClassificationType(): string {
    return this._classificationType;
  }

  /**
   * Finds the tile with the provided id.
   * @param id ID of the work item to find the tile for.
   * @return The tile from the cache
   */
  protected _findTile(id: number): JQuery {
    return this._tileCache[id];
  }

  /**
   * Handle keyboard navigation events on expand icon
   * @param event
   */
  private _onRowExpandIconKeyDown(event: JQueryKeyEventObject) {
    if ((event.keyCode === KeyCode.PAGE_DOWN || event.keyCode === KeyCode.PAGE_UP) && event.shiftKey) {
      // Get the row index
      const pivotKey = $(event.target).closest(TaskBoardView.ROW_CSS_SELECTOR).data(TaskBoardView.DATA_PIVOT_KEY);
      let rowId = this._getRowIdFromPivotKey(pivotKey);
      let indexChange = this._getKeyDownIndexChange(event);
      rowId += indexChange;

      // Focus on correct icon
      if (rowId >= 0 && rowId <= this._maxRowId) {
        const $row = $("#" + TaskBoardView.ROW_ID_PREFIX + rowId);
        if (this._isRowCollapsed($row)) {
          $row.find(".bowtie-toggle-tree-collapsed").focus();
        } else {
          $row.find(".bowtie-toggle-tree-expanded").focus();
        }
      }
    }
  }

  /**
   * Keyboard behavior for tiles
   * 
   * @param event  The event to be handled 
   */
  private _tileKeydownHandler(event: JQueryEventObject) {
    Diag.Debug.assertParamIsObject(event, "event");

    // Do not interfere with key presses when user is typing
    const element = <HTMLElement>event.target;
    if (element &&
      (Utils_String.equals(element.tagName, 'INPUT', true) ||
        Utils_String.equals(element.tagName, 'SELECT', true) ||
        Utils_String.equals(element.tagName, 'TEXTAREA', true) ||
        element.isContentEditable)) {
      return;
    }

    let $tile = $(event.target)

    // Open the work item
    if (event.keyCode === KeyCode.ENTER) {
      this._openItem($tile);
    }
    // Expand to show empty fields
    else if (event.keyCode === KeyCode.E) {
      this._expandTile($tile);
    }
    // Focus on new item button in current row if only C is pressed.  If Ctrl+C is pressed the user is trying to copy. 
    else if (event.keyCode === KeyCode.C && !event.ctrlKey) {
      this._openNewItemMenu($tile);
    }
    // Focus on expand collapse item 
    else if ((event.keyCode === KeyCode.PAGE_DOWN || event.keyCode === KeyCode.PAGE_UP) && event.shiftKey) {
      this._focusCollapseButton($tile);
    }

    // Figure out if we have a parent or child tile
    var id = this.getIdNumberFromElement($(event.target));
    var isParentTile: boolean = this._isParentTile(id);

    if (!isParentTile) {
      // Update state, move columns
      if ((event.keyCode === KeyCode.RIGHT || event.keyCode === KeyCode.LEFT) && (event.ctrlKey || event.metaKey)) {
        this._updateTileStateOnKeyDown(event);
      }
      // Reorder, move within cell
      else if ((event.keyCode === KeyCode.UP || event.keyCode === KeyCode.DOWN) && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
        this._reorderOnKeyDown(event);
      }
      // Reparent, move to next row
      else if ((event.keyCode === KeyCode.UP || event.keyCode === KeyCode.DOWN) && (event.ctrlKey || event.metaKey) && event.shiftKey) {
        this._reparentOrReassignTileOnKeyDown(event);
      }

      // Tab navigation in multiple column cells
      this._tileAccessibilityHandlerForCustomLayout(event);
    }
  }

  /**
   *      Opens the work item form in edit mode when the work item tile element is passed
   *
   * @param $tile  The tile element whose work item form is to be opened
   */
  private _openItem($tile: JQuery) {
    var $titletext = this._getClickableTitleSpan($tile);
    if ($titletext.length !== 0) {
      this._raiseEditWorkItem(this.getIdNumberFromElement($tile));
    }
  }

  private _expandTile($tile: JQuery) {
    const id = this.getIdNumberFromElement($tile);
    this._populateTile(id, $tile, true);
  }

  private _openNewItemMenu($tile: JQuery) {
    const $row = $tile.closest(TaskBoardView.ROW_CSS_SELECTOR);
    const pivotKey = $row.data(TaskBoardView.DATA_PIVOT_KEY);
    const newItemButton = this._addNewItemControls[pivotKey];
    newItemButton.expandPopupAndSelectDefaultMenuItem();
  }

  private _focusCollapseButton($tile: JQuery) {
    const $row = $tile.closest("." + TaskBoardView.ROW_CLASS);
    $row.find(".bowtie-toggle-tree-expanded").eq(0).focus();
  }

  /**
   *     Used for tabbing through tiles in a cell in custom layout
   * 
   * @param event  The event to be handled 
   */
  private _tileAccessibilityHandlerForCustomLayout(event: JQueryEventObject) {
    var $tile: JQuery,
      $focusElement: JQuery;

    $tile = $(event.target);

    if (this._isEffectiveCustomLayout()) {
      if (event.keyCode === KeyCode.TAB) {
        $focusElement = this._findNextFocusElement($tile, event.shiftKey);

        if ($focusElement) {
          $focusElement.focus();
          event.preventDefault();
        }
        else {
          if (!event.shiftKey) {
            // We couldn't find any element to focus on. It means this is the last tile on the page. Blur it so that 
            // we are not stuck on this forever
            $tile.blur();
            event.preventDefault();
          }
        }
      }
    }
  }

  /**
   * Get the index change value, returns 0 if not a valid key for index
   * @param event
   */
  private _getKeyDownIndexChange(event: JQueryKeyEventObject): number {
    if (event.keyCode === KeyCode.RIGHT || event.keyCode === KeyCode.DOWN || event.keyCode === KeyCode.PAGE_DOWN) {
      return 1;
    } else if (event.keyCode === KeyCode.LEFT || event.keyCode === KeyCode.UP || event.keyCode === KeyCode.PAGE_UP) {
      return -1;
    } else {
      // Not arrow key input, return 0
      return 0;
    }
  }

  private _updateTileStateOnKeyDown(event: JQueryEventObject) {
    // Determine which direction should we search
    let indexChange = this._getKeyDownIndexChange(event);
    if (!indexChange) {
      // we did not get arrow key input, return
      return;
    }

    // Get possible states
    const id = this.getIdNumberFromElement($(event.target));
    const fromState = this._model.getFieldValue(id, DatabaseCoreFieldRefName.State);
    const validStates = this._model.getValidStateTransitions(id, fromState);

    // Search through states until we find next valid state
    let index = Utils_Array.findIndex(this._model.states, (t: string) => Utils_String.equals(t, fromState, true));
    let toState = fromState;
    while (index >= 0 && index < this._model.states.length && toState === fromState) {
      index += indexChange;
      if (Utils_Array.contains<string>(validStates, this._model.states[index], Utils_String.ignoreCaseComparer)) {
        toState = this._model.states[index];
      }
    }

    // State has not changed, return
    if (toState === fromState) {
      return;
    }

    // Build up the set of field changes (including the filter).
    let fieldChanges = $.extend({}, this._model.getFilter());
    fieldChanges[DatabaseCoreFieldRefName.State] = toState;
    // Build up workItemChanges Object
    const workItemChanges = {
      fieldChanges: fieldChanges
    };

    // Raise the change request.
    this._raiseWorkItemChangeRequested(id, workItemChanges, (id: number, args: WITOM.IWorkItemsBulkSaveSuccessResult, errorType: number) => {
      this._workItemChangeRequestCompleted(id, args, errorType, /* setFocusOnTile */ true);
    });

    // Setup the view to indicate that the tile is being saved
    // This was moved to after the change request is raised due to a
    // regression in the speed of fadeTo call. This allows the save 
    // to start before, ignoring this regression's impact on the user
    if (!this._viewState.getError(id)) {
      this._beginSaveTile(id, fieldChanges);
    }
  }

  private _reorderOnKeyDown(event: JQueryEventObject) {
    let nextTiletId: number, prevTileId: number;
    const $tile = $(event.target);
    const $cell = $tile.closest(".ui-droppable." + TaskBoardView.CELL_CLASS);

    // We can't reorder this tile
    if (!this._isCardEditable(this.getIdNumberFromElement($tile)) || !this.isReorderSupported()) {
      return;
    }

    // Reorder up, get the previous two elements
    if (event.keyCode === KeyCode.UP) {
      const $nextTile = this._findNextFocusElementInCell($cell, $tile, /* Search backwards */ true);
      nextTiletId = this.getIdNumberFromElement($nextTile);
      if ($nextTile) {
        prevTileId = this.getIdNumberFromElement(this._findNextFocusElementInCell($cell, $nextTile, /* Search backwards */ true));
      }
    }
    // Reorder down, get the next two elements
    else if (event.keyCode === KeyCode.DOWN) {
      const $prevTile = this._findNextFocusElementInCell($cell, $tile);
      prevTileId = this.getIdNumberFromElement($prevTile);
      if ($prevTile) {
        nextTiletId = this.getIdNumberFromElement(this._findNextFocusElementInCell($cell, $prevTile));
      }

    }
    // Reorder if we have reorder targets
    if (nextTiletId || prevTileId) {
      this._reorderTile($tile, prevTileId, nextTiletId, /* setFocus */ true);
    }
  }

  private _reparentOrReassignTileOnKeyDown(event: JQueryEventObject) {
    // Get direction of reparent
    let indexChange = this._getKeyDownIndexChange(event);
    if (!indexChange) {
      // we did not get arrow key input, return
      return;
    }
    // Get original value
    const isPeopleClassification = this._classificationType === TaskboardGroupBy.PEOPLE_CLASSIFICATION;
    const id = this.getIdNumberFromElement($(event.target));
    let originalValue: string;
    if (isPeopleClassification) {
      originalValue = this._model.getFieldValue(id, DatabaseCoreFieldRefName.AssignedTo);
    } else {
      originalValue = this._model.getParent(id);
    }
    // If null from assignedTo or 0 for parentId, set null key
    if (!originalValue) {
      originalValue = TaskBoardModel.NULL_PIVOT_KEY;
    }
    // Find previous or next value
    const possibleValues = this._model.getClassification(this._classificationType);
    let index = Utils_Array.findIndex(possibleValues, (t: IClassificationData) => Utils_String.equals(t.pivotKey, originalValue, true));

    let newValue: string | number = originalValue;
    index += indexChange;
    if (index >= 0 && index < possibleValues.length) {
      newValue = possibleValues[index].pivotKey;
    }

    if (newValue === originalValue) {
      // No change
      return;
    }

    // Build up workItemChanges Object
    let workItemChanges;
    if (isPeopleClassification) {
      if (newValue == TaskBoardModel.NULL_PIVOT_KEY) {
        // If null pivot then unassign the work item
        newValue = "";
      }
      let assignedToChange: IDictionaryStringTo<string> = {};
      assignedToChange[DatabaseCoreFieldRefName.AssignedTo] = "" + newValue;
      workItemChanges = {
        fieldChanges: assignedToChange
      };
    } else {
      if (newValue == TaskBoardModel.NULL_PIVOT_KEY) {
        newValue = 0;
      }
      // Include filter
      const fieldChanges = $.extend({}, this._model.getFilter());
      workItemChanges = {
        fieldChanges: fieldChanges,
        newParentId: newValue
      };
    }

    // Raise the change request.
    this._raiseWorkItemChangeRequested(id, workItemChanges, (id: number, args: WITOM.IWorkItemsBulkSaveSuccessResult, errorType: number) => {
      if (!isPeopleClassification) {
        // Make sure we have the model updated
        this._model.updateChildrenLookupTableAfterEdit(id, Number(newValue));
      }
      this._workItemChangeRequestCompleted(id, args, errorType, /* setFocusOnTile */ true);
    });
  }

  private _getNextVisibleRow($row: JQuery, searchBackwards = false): JQuery {
    var $nextVisibleRow: JQuery,
      $nextRow = $row;

    do {
      $nextRow = searchBackwards ? $nextRow.prev(TaskBoardView.ROW_CSS_SELECTOR) : $nextRow.next(TaskBoardView.ROW_CSS_SELECTOR);
    } while ($nextRow.length > 0 && ($nextRow.css('display') === 'none'))

    if ($nextRow.length > 0) {
      $nextVisibleRow = $nextRow;
    }

    return $nextVisibleRow;
  }

  /**
   *     Returns the element which should get focus after the given element while tabbing through
   * 
   * @param $element 
   * @param searchBackwards  If true, the search will be in backward direction
   */
  private _findNextFocusElement($element: JQuery, searchBackwards = false): JQuery {
    var $cell: JQuery,
      $nextSiblingCell: JQuery,
      isExpander = false,
      $focusElement: JQuery;

    if ($element.hasClass(TaskBoardView.EXPANDER_CLASS)) {
      isExpander = true;
    }

    $cell = $element.closest(".ui-droppable." + TaskBoardView.CELL_CLASS);

    if ($cell.length > 0 || isExpander) {

      if (!isExpander) {
        // See if we can find a focus element in the current cell
        $focusElement = this._findNextFocusElementInCell($cell, $element, searchBackwards);
      }

      if (!$focusElement) {
        // Try to find focus element in the next sibling cells

        // If the element is expander, we need to start from previous row's last cell
        if (isExpander && searchBackwards) {
          $nextSiblingCell = this._findPreviousCellForExpander($element);
        }
        else {
          $nextSiblingCell = searchBackwards ? $cell.prev(".ui-droppable." + TaskBoardView.CELL_CLASS) : $cell.next(".ui-droppable." + TaskBoardView.CELL_CLASS);
        }

        while ($nextSiblingCell && $nextSiblingCell.length > 0 && !$focusElement) {
          $focusElement = this._findFirstFocusElementInCell($nextSiblingCell, searchBackwards);
          $nextSiblingCell = searchBackwards ? $nextSiblingCell.prev(".ui-droppable." + TaskBoardView.CELL_CLASS) : $nextSiblingCell.next(".ui-droppable." + TaskBoardView.CELL_CLASS);
        }

        if (!$focusElement && !searchBackwards) {
          // We still haven't found the focus element in the entire row.
          // the focus should go on expander of the next row.

          var $currentRow = $cell.closest(TaskBoardView.ROW_CSS_SELECTOR);
          if ($currentRow.length > 0) {
            var $focusExpanderRow = this._getNextVisibleRow($currentRow);

            if ($focusExpanderRow) {
              var $taskboardExpander = $("." + TaskBoardView.EXPANDER_CLASS, $focusExpanderRow);
              $focusElement = $taskboardExpander.find(".bowtie-toggle-tree-expanded, .bowtie-toggle-tree-collapsed").eq(0);
            }
          }
        }
      }
    }

    return $focusElement;
  }

  /**
   *     Returns the element in the given cell which should get focus after the given element while arrowing through
   * 
   * @param $cell 
   * @param $tile 
   * @param searchBackwards  If true, the search will be in backward direction 
   */
  private _findNextFocusElementInCell($cell: JQuery, $tile: JQuery, searchBackwards = false): JQuery {
    Diag.Debug.assertIsObject($cell, "Expected a $cell to be passed in");
    Diag.Debug.assertIsObject($tile, "Expected a $tile to be passed in");
    let $focusElement: JQuery;

    if (this._isEffectiveCustomLayout()) {
      const index: number = this._getOrderAttribute($tile);
      const cellChildTiles: Element[] = $("." + TaskBoardView.TILE_CSS_CLASS, $cell).toArray();

      if (searchBackwards) {
        if (index > 0) {
          $focusElement = $(this._getTileSelectorForOrderAttrib(index - 1), $cell);
        }
      }
      else {
        if (index < cellChildTiles.length - 1) {
          $focusElement = $(this._getTileSelectorForOrderAttrib(index + 1), $cell);;
        }
      }
    }
    else {
      $focusElement = searchBackwards ? $tile.prev("." + TaskBoardView.TILE_CSS_CLASS) : $tile.next("." + TaskBoardView.TILE_CSS_CLASS);
    }

    return $focusElement;
  }

  /**
   *  Return the JQuery selector string for tile with given order attribute equal to given value 
   */
  private _getTileSelectorForOrderAttrib(order: number) {
    return "." + TaskBoardView.TILE_CSS_CLASS + "[" + TaskBoardView.ATTR_TILE_ORDER + "=" + order + "]";
  }

  /**
   *     Returns the first element the given cell which should get focus while tabbing through
   * 
   * @param $cell 
   */
  private _findFirstFocusElementInCell($cell: JQuery, searchBackwards = false): JQuery {
    let cellChildTiles: Element[],
      $focusElement: JQuery,
      searchIndex: number;

    // See if there are any tiles in the cell
    cellChildTiles = $("." + TaskBoardView.TILE_CSS_CLASS, $cell).toArray();

    if (cellChildTiles.length > 0) {
      // Select first or last element based on search direction
      searchIndex = searchBackwards ? cellChildTiles.length - 1 : 0;
      $focusElement = $(this._getTileSelectorForOrderAttrib(searchIndex), $cell);
    }

    return $focusElement;
  }

  /**
   *     For the given expander element, returns the last taskboard child tile cell in the previous row
   * 
   * @param $expander Expander/Minimizer jquery element
   */
  private _findPreviousCellForExpander($expander: JQuery): JQuery {
    var $lastCell: JQuery;

    // Find cell prior to the given expander/minimizer
    // It would be last cell in the previous row
    var $expanderRow = $expander.closest(TaskBoardView.ROW_CSS_SELECTOR);

    if ($expanderRow.length > 0) {
      var $prevRow = this._getNextVisibleRow($expanderRow, true);
      if ($prevRow) {
        var $cell = $prevRow.find(".ui-droppable." + TaskBoardView.CELL_CLASS).last();
        if ($cell.length > 0) {
          $lastCell = $cell;
        }
      }
    }
    return $lastCell;
  }

  private _isSummaryRow($row: JQuery) {
    return $row.hasClass(TaskBoardView.SUMMARY_ROW_CSS_CLASS);
  }

  private _isNewParentTile($tile: JQuery): boolean {
    return $tile.data(TaskBoardView.IS_NEW_PARENT_ROW);
  }

  private _isParentTile(id): boolean {
    if (this._model.isParentId(id) || id == TaskBoardModel.NO_PARENT_ID) {
      return true;
    }
    return false
  }

  /**
   * Create a new tile for the provided work item id, and sets the title in edit mode
   * @param id The new id for the tile
   * @param isNewParentRow Is this a new parent row tile? Defaults to false, meaning this is a new task/child.
   */
  public createNewTile(id: number, isNewParentRow: boolean = false) {
    // reset from 0-data display if needed
    if (this._zeroDataContainer) {
      ReactDOM.unmountComponentAtNode(this._zeroDataContainer);
      this._zeroDataContainer = null;

      this._populateContainer(this._classificationType);
      this._buildTaskboardTable();
    }

    var $tile = this._createTile(id, isNewParentRow);
    Diag.Debug.assert($tile.length === 1, "_createTile must return a tile");

    //bring focus on the new tile once it is created
    $tile.focus();

    var fieldSetting = this._getCardFieldSetting(id, DatabaseCoreFieldRefName.Title);
    var field: Cards.CardField = this._model.field(id, DatabaseCoreFieldRefName.Title, fieldSetting),
      $fieldContainer: JQuery = this._cardRenderer.getFieldContainer($tile, DatabaseCoreFieldRefName.Title),
      fieldView: CardControls.CardFieldView = field ? this._cardRenderer.getFieldView($fieldContainer, field) : null;

    this._cardEditController.beginFieldEdit(fieldView,
      Utils_Core.delegate(this, Utils_Core.curry(this._editStartCallback, $tile)),
      Utils_Core.delegate(this, Utils_Core.curry(this._editCompleteCallback, $tile)),
      Utils_Core.delegate(this, Utils_Core.curry(this._editDiscardCallback, $tile)),
      this._getCardContext(id));
  }

  /**
   * Create a new tile for the provided work item id, add the contents to it and position it.
   * @param id ID of the work item to find the tile for.
   * @param isNewParentRow Is this a new parent row tile? Defaults to false, meaning this is a new task/child.
   * @return The created tile
   */
  public _createTile(id: number, isNewParentRow: boolean = false): JQuery {
    Diag.Debug.assertParamIsNumber(id, "id");

    var $tile = $(domElem("div", "tbTile"))
      .attr("id", TaskBoardView.TILE_ID_PREFIX + id)
      .attr("aria-label", this._getTaskboardTileLabelText(id))
      .attr('aria-roledescription', TaskboardResources.TaskboardCard_AriaRoleDescription)
      .attr("tabindex", "0")
      .data(TaskBoardView.DATA_BIND_CLICK, true)
      .data(TaskBoardView.IS_NEW_PARENT_ROW, isNewParentRow)
      .focus(() => {
        var matchesFilter = this._isParentTile(id) ? true : this._model.matchesFilter(id);
        var borderColor = this._getTileColorForWorkItem(this.getIdNumberFromElement($tile));
        var $content = $(".tbTileContent", $tile);
        // set the focus behavior on the tile content border
        $tile.addClass("focus");

        if ($content.length > 0) {
          // get the color of the default color of the border
          if (!this._tileHasFocus && this._tileContentBorderColor === undefined) {
            this._tileContentBorderColor = $content.css("border-top-color");
          }
          $content.css("border-color", matchesFilter ? borderColor : TaskBoardView.TASKBOARD_FOCUS_BORDER_GREYCOLOR);
        }
        this._tileHasFocus = true;
      })
      .blur(() => {
        var $content = $(".tbTileContent", $tile);
        if ($content.length > 0) {
          if (this._tileContentBorderColor) {
            $content.css("border-color", this._tileContentBorderColor);
          }
        }
        $tile.removeClass("focus");
        this._tileHasFocus = false;
      });

    this._attachEventsToTile($tile);

    this._bindTile($tile, id);

    return $tile;
  }

  /**
   * Returns taskboard tile label text. Format: 'workItem-type-name tile-title column column-name'
   * @param id workItemId
   */
  private _getTaskboardTileLabelText(id: number): string {
    const tileTitle = this._getFieldValue(id, DatabaseCoreFieldRefName.Title); // Card title
    if (id === TaskBoardModel.NO_PARENT_ID) {
      // return title if unparented row
      return tileTitle;
    }

    const workItemType = this._getFieldValue(id, DatabaseCoreFieldRefName.WorkItemType);
    let label = `${workItemType}, ${tileTitle}`
    if (!this._isParentTile(id)) {
      const tileColumn = this._getFieldValue(id, DatabaseCoreFieldRefName.State);
      label = `${label}, ${TaskboardResources.TaskboardColumn_AriaLabel} ${tileColumn}`
    }
    return label;
  }

  private _updateTileColors($tile: JQuery, id: number, matchesFilter: boolean) {
    var borderColor = this._getTileColorForWorkItem(id);
    var $content = $tile.find(".tbTileContent");
    var isParentTile = this._isParentTile(id);

    if (isParentTile && id == TaskBoardModel.NO_PARENT_ID) {
      $tile.addClass("dummyParent");
      $content.addClass("dummyParentTbTile");
      var $titleElement = $content.find(TaskBoardView.TITLE_SELECTOR);
      if ($titleElement && $titleElement.length > 0) {
        $titleElement.removeClass("clickable-title");
      }
    }
    else {
      //Need to apply the left border color on $tile. $content is the child of $tile which will have grey border on rest of the three sides.
      $tile.css("border-left-color", matchesFilter ? borderColor : "");

      //Add some opacity for non-matching tile icons
      let $icon = $content.find(".work-item-type-icon");
      $icon.css("opacity", matchesFilter ? "1" : "0.5");

      //Toggle cardStyleRules title style
      let $title = $content.find(".clickable-title");
      if ($title && $title.length > 0) {
        if (matchesFilter && $tile.cardStyleRulesForTitle) {
          // restore saved style for title
          $title[0].style.cssText = $tile.cardStyleRulesForTitle;
        } else if (!matchesFilter && $title[0].style["color"]) {
          // save style for title to re-apply if filter changes and clear
          $tile.cardStyleRulesForTitle = $title[0].style.cssText;
          $title[0].style.cssText = "";
        }
      }
    }
  }

  /**
   * Returns the background and border color of a tile
   *     
   * @param workItemId ID of the work item to find the tile for
   * @return border and background color
   */
  private _getTileColorForWorkItem(workItemId: number): string {
    if (workItemId == TaskBoardModel.NO_PARENT_ID) {
      return WorkItemTypeColorAndIcons.DEFAULT_UNPARENTED_WORKITEM_COLOR;
    }
    else {
      const cardContext = this._getCardContext(workItemId);
      const colorAndIconsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
      return colorAndIconsProvider.getColor(cardContext.projectName, cardContext.workItemTypeName);
    }
  }

  private _attachEventsToTile($tile: JQuery) {
    const id = this.getIdNumberFromElement($tile);
    const isParentTile: boolean = this._isParentTile(id);
    const isNewParentRow = this._isNewParentTile($tile);

    if (!this._isAdvancedBacklogManagement() || id === TaskBoardModel.NO_PARENT_ID || isNewParentRow || (isParentTile && !this._allowParentItemsToBeDraggable)) {
      $tile.draggable({
        start: () => false,
        drag: () => false
      });
    } else if (!isParentTile) { // for task tiles
      $tile.draggable({
        start: Utils_Core.curry(this._startDrag, this),
        scope: TFS_Agile.DragDropScopes.WorkItem,
        scroll: false,
        scrollables: [".taskboard .taskboardTableBodyScrollContainer.scrollable"],
        helper: () => {
          // Since we are using flex layout, the actual height of tile is determined by the browser
          // (so that the tiles stretches as long as its neighbour). A tile may have a hieght more
          // than what is needed to fit it's contents, in such a case the clone would be shorter than
          // the tile. We want the draggable helper to be of same height as the original tile.
          var tileHeight = $tile.height();
          var $helper = $tile.clone();
          $helper.data(TFS_Agile.DataKeys.DataKeyId, $tile.data(TFS_Agile.DataKeys.DataKeyId));
          $helper.css("display", "none");
          return $helper.height(tileHeight);
        },
        zIndex: 1000,
        scrollSensitivity: 60,
        scrollSpeed: 10,
        distance: TaskBoardView.DRAG_START_DISTANCE,
        drag: this._highlightRowCurry,
        // Use the body as the parent for the cloned item while dragging.  This is 
        // done because if the table cell is used, it takes longer for IE to calculate the
        // cloned elements width and height. With 500 items in the taskboard it was taking over
        // 1.6 seconds and by using the body element as the append to element this is reduced to under 250ms.
        // JQuery UI needs this information and it adds a noticable delay so we want to minimize it.
        appendTo: document.body
      } as JQueryUI.DraggableOptions);
    } else { // for parent tiles with valid backing work item
      $tile.draggable({
        start: Utils_Core.curry(this._startDrag, this),
        scope: TFS_Agile.DragDropScopes.WorkItem, // Now everything is draggable and droppable to an iteration from the taskboard
        helper: () => {
          var $helper = $tile.clone();
          $helper.data(TFS_Agile.DataKeys.DataKeyId, $tile.data(TFS_Agile.DataKeys.DataKeyId));
          return $helper;
        },
        distance: TaskBoardView.DRAG_START_DISTANCE,
        // consistent with kanban board drag coordinates to reduce gap between helper and cursor
        cursorAt: { left: 35, top: 42 },
        // Use the body as the parent for the helper while dragging.  This is 
        // done because if the table cell is used, it takes longer for IE to calculate the
        // cloned elements width and height. With 500 items in the taskboard it was taking over
        // 1.6 seconds and by using the body element as the append to element this is reduced to under 250ms.
        // JQuery UI needs this information and it adds a noticable delay so we want to minimize it.
        appendTo: document.body,
        scroll: false
      });
    }

    // Ignore dragging on the card ID.  This allows users to copy the id without starting a drag event. 
    $tile.draggable({ cancel: '.' + CardControls.FieldRendererHelper.ID_CLASS });

    // Add the key handler for tiles
    $tile.keydown((e: JQueryEventObject) => this._tileKeydownHandler(e));

    $tile.focus(function () {
      $(this).closest(TaskBoardView.ROW_CSS_SELECTOR).find("." + TaskBoardView.ADD_NEW_CARD_ICON_CLASS).addClass("enabled");
    }).blur(function () {
      var closest_row = $(this).closest(TaskBoardView.ROW_CSS_SELECTOR);
      if (!closest_row.is(':hover')) {
        closest_row.find("." + TaskBoardView.ADD_NEW_CARD_ICON_CLASS).removeClass("enabled");
      }
    });

    // To show the context menu on right clicking on the tile
    $tile.on("contextmenu", (event: JQueryEventObject) => {
      var $container = $tile.find(".card-context-menu");
      if ($container.length > 0) {
        this._handleCreateContextMenuEvent($tile, $container, event);
      }
    });

  }

  /**
   * Rebinds an existing tile earlier bound to an old Id to a new Id
   * @param oldId Old work item Id
   * @param newId New work item Id
   */
  public rebindTile(oldId: number, newId: number) {
    var $tile: JQuery = this._findTile(oldId);
    Diag.Debug.assert(Boolean($tile), "Didn't find tile for rebind to new id");

    if (!$tile) {
      return;
    }

    if (this._isNewParentTile($tile)) {
      this._dropAndRecreateRow(oldId, newId);
    } else {
      this._bindTile($tile, newId);
    }
  }

  /**
   * Drops and recreates a new parent row
   * @param oldParentId The old id before saving
   * @param newParentId The new id after saving
   */
  private _dropAndRecreateRow(oldParentId, newParentId) {
    this._deleteAndRecreateNewParentRow(oldParentId, newParentId);
    this.refreshTile(newParentId);
  }

  private _deleteAndRecreateNewParentRow(oldId: number, newId: number) {
    // Delete and recreate the row on save so we bind the drag drop areas correctly
    this._removeParentRow(oldId, false);

    let classificationData: IClassificationData = {
      templateId: newId,
      pivotKey: newId
    };

    this._addRow(
      classificationData,
      this._getPeopleChildMap(),
      false
    );
  }

  /**
   * Binds a tile to the specified Id
   * @param $tile The new tile to bind
   * @param id Work item Id
   */
  protected _bindTile($tile: JQuery, id: number) {
    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsNumber(id, "id");

    Diag.Debug.assert(!this._tileCache[id], "Do not expect tile to be present with id: " + id);

    let shouldAddNewItem = false;

    const existingId = this.getIdNumberFromElement($tile);
    if (existingId !== id) {
      $tile.attr("id", TaskBoardView.TILE_ID_PREFIX + id);

      //clears the old cache entry
      if (this._tileCache[existingId]) {
        delete this._tileCache[existingId];
      }

      let newParentRow = this._cellLookupTable[TaskBoardModel.NEW_ROW_PIVOT_KEY];
      if (newParentRow) {
        // New parent row added that just got saved
        this._cellLookupTable[id] = newParentRow;
        delete this._cellLookupTable[TaskBoardModel.NEW_ROW_PIVOT_KEY];
        shouldAddNewItem = true;
      }
    }

    // Store data on work item tile
    $tile.data(TFS_Agile.DataKeys.DataKeyId, id);
    const typeName = this._model.getFieldValue(id, WITConstants.CoreFieldRefNames.WorkItemType);
    $tile.data(TFS_Agile.DataKeys.DataKeyType, typeName);

    // Add the tile to the tile cache.
    this._tileCache[id] = $tile;

    // Add the contents to the tile and position it.
    this._updateTile($tile, id, shouldAddNewItem);
  }

  /**
   * Update the contents and location of the tile based on the current work item data.
   * @param $tile The tile in the view.
   * @param id Workitem id
   * @param addNewItemButton Should the new item button be added to this new tile?
   */
  private _updateTile($tile: JQuery, id: number, addNewItemButton: boolean = false) {
    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsNumber(id, "id");

    if (!$tile) {
      return;
    }

    const isParentTile: boolean = this._isParentTile(id);
    const isNewParentRow = this._isNewParentTile($tile);

    // Empty out the contents of the tile and add the updated content.
    if (this._viewDisplayed) {
      $tile.empty();
    }

    this._populateTile(id, $tile);
    if (isNewParentRow) {
      // Update the tile to be a parent
      $tile.addClass("parentTbTile");
      this._updateTileColors($tile, id, true);

      // Display on new row
      $tile = this._positionNewParentRowTile($tile, id);
    }
    else if (!isParentTile && !this._pausePositionTile) {
      // Ensure the tile is positioned correctly.
      $tile = this._positionTile($tile, id);
    }
    else if (isParentTile) {
      $tile.addClass("parentTbTile");

      this._updateTileColors($tile, id, true);

      // Verify that this parent row has the add button enabled
      if (addNewItemButton) {
        this.addAddNewItem(id, String(id), this._model.stateKeys[0]);
      }
    }

    if ($tile && this._viewDisplayed) {
      // Update the tile with any saving information.
      this._updateSavingDisplay($tile, id);
    }
  }

  private addAddNewItem(parentId: number, pivotKey: string, stateWhereButtonAppears: string) {
    // Add the '+ New Card' control to the first column if we are in parent classification
    let $columnCell = this._cellLookupTable[pivotKey][stateWhereButtonAppears];

    // Create wrapper as first element in cell
    let $addNewItemWrapper = $("<div></div>").addClass(TaskBoardView.ADD_NEW_CARD_WRAPPER_CLASS);
    $columnCell.prepend($addNewItemWrapper);
    const newItemButtonPromise = WorkItemCategoriesUtils.removeHiddenWorkItemTypeNames(this._model.getChildWorkItemTypes())
      .then<void>(
        (workItemTypes: string[]) => {
          if (workItemTypes && workItemTypes.length > 0) {
            let addButton = <TaskboardAddNewItemControl>Controls.BaseControl.createIn(TaskboardAddNewItemControl, $addNewItemWrapper, {
              itemTypes: workItemTypes,
              addNewItem: (workItemType: string) => {
                this._addWorkItem(workItemType, parentId);
              },
              debounceTime: 1000,
              iconRenderer: ControlUtils.buildColorElement,
              displayText: TaskboardResources.AddNewCardDisplayText,
              cssClass: TaskBoardView.ADD_NEW_CARD_CLASS
            });

            // Save the control
            this._addNewItemControls[pivotKey] = addButton;

            // Add the handler for tabbing accesibity if custom layout is enabled
            var $newItemElement = addButton.getElement();

            $newItemElement.bind("keydown.VSS.Agile", (e: JQueryKeyEventObject) => {
              if (this._isEffectiveCustomLayout()) {
                // We are handling backward tabbing only. Let the browser take care of forward tabbing
                if (e.shiftKey && e.keyCode === KeyCode.TAB) {
                  var $focusElement = this._findNextFocusElement($newItemElement, true);
                  if ($focusElement) {
                    $focusElement.focus();
                    e.preventDefault();
                  }
                }
              }
            });
          }
        },
        (error) => {
          VSSError.publishErrorToTelemetry({
            name: "CreateNewItemButtonError",
            message: Utils_String.format("failed to create new item button due to {0}", VSS.getErrorMessage(error))
          });
        });

    this._loadNewItemButtonPromises.push(newItemButtonPromise);
    // Accessible loading experience
    ProgressAnnouncer.forPromise(newItemButtonPromise, {
      announceStartMessage: TaskboardResources.TaskboardLoading_NewItemButtonStart,
      announceEndMessage: TaskboardResources.TaskboardLoading_NewItemButtonEnd,
      announceErrorMessage: TaskboardResources.TaskboardLoading_NewItemButtonError
    });
  }

  /**
   *     Saves the height of the given tile in the tiles's JQuery data object
   */
  private _addHeightData($tile: JQuery) {
    $tile.data(TaskBoardView.DATA_TILE_HEIGHT, $tile.height());
  }

  /**
   *     Updates the tile with information based on its saving state.
   * 
   * @param $tile 
   *     The tile in the view.
   * 
   * @param id id
   */
  private _updateSavingDisplay($tile: JQuery, id: number) {

    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsNumber(id, "id");

    var savingCacheData = this._viewState.getSaveData(id),
      errorType = this._viewState.getError(id),
      errorText;

    const tooltipKey = "tooltip";

    // If the work item for the tile is currently being saved or having an error          
    if (savingCacheData || errorType) {
      // Fade the contents.
      $(".tbTileContent", $tile).fadeTo(0, 0.5);

      // If the saving message has already been displayed, show it on the refreshed tile.
      if (errorType) {
        errorText = this._model.getWorkItemErrorMessage(id);
        Diag.Debug.assertIsNotUndefined(errorText, "Error message for work item in error state should be available.");

        let tooltip: RichContentTooltip = $tile.data(tooltipKey);
        if (tooltip) {
          tooltip.setTextContent(errorText);
        }
        else {
          tooltip = RichContentTooltip.add(errorText, $tile);
          $tile.data(tooltipKey, tooltip);
        }

        this._showStatusMessage($tile, TaskboardResources.Taskboard_ErrorTile, "witError");
      }
      else if (savingCacheData.savingDisplayed) {
        // Change the cursor to indicate the item is being saved.
        $tile.css("cursor", "progress");
        this._showSavingMessage($tile);
      }

      // Disable dragging and remove the "ui-state-disabled" class that it adds since we
      // do not want the entire contents of the tile to show up disabled.
      $tile.draggable("option", "disabled", true)
        .removeClass("ui-state-disabled");
    }
    else {
      // Enable dragging
      // First make sure that draggable is set. For parent tiles draggable will not be set upto this point
      // and we will still come here if the parent tile is added after construction of the board.
      $tile.draggable("option", "disabled", false);

      // Change the cursor back so the browser sets the appropriate cursor.
      $tile.css("cursor", "");

      // No errors so remove the title attribute
      let tooltip: RichContentTooltip = $tile.data(tooltipKey);
      if (tooltip) {
        tooltip.dispose();
        $tile.removeData(tooltipKey);
      }
    }
  }

  /**
   * Update the position of the tile in the taskboard.
   * @param $tile The new parent tile in the view. (Usually a story or bug)
   * @param id The temporary id of the tile (less than 0)
   */
  private _positionNewParentRowTile($tile: JQuery, id: number) {
    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsNumber(id, "id");

    const pivotValue = this._model.getPivotFieldValue(id, this._classificationType, /* isNewParent */ true);

    let classificationData: IClassificationData = {
      templateId: id,
      pivotKey: pivotValue
    };

    let pivotRowLookup = this._cellLookupTable[pivotValue];
    if (!pivotRowLookup) {
      // Append a new row for the repositioned tile, even if the row would otherwise be filtered out
      this._addRow(
        classificationData,
        this._getPeopleChildMap(),
        false
      );
    }

    // If custom layout is enabled create custom columns for cells within the newly added row
    if (this._isEffectiveCustomLayout()) {
      $.each(this._model.stateKeys, (index: number, state: string) => {
        this._createCustomColumnsInCell(this._cellLookupTable[pivotValue][state], this._customColumnCount);
      });
    }

    return $tile;
  }

  /**
   * Update the position of the tile in the taskboard.
   * @param $tile The child tile in the view. (Usually a task)
   * @param id The id of the tile
   */
  private _positionTile($tile: JQuery, id: number) {

    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsNumber(id, "id");

    var pivotValue = this._model.getPivotFieldValue(id, this._classificationType),
      state = this._model.getStateFieldValueAsKey(id),
      $targetContainer,
      pivotRowLookup,
      templateId: number,
      $sourceContainer: JQuery,
      cellChildTiles: Element[];

    // If we don't have a row for the tile, create one.
    pivotRowLookup = this._cellLookupTable[pivotValue];
    if (!pivotRowLookup) {
      // add row for the tile.
      templateId = id;
      if (Utils_String.equals(this._classificationType, TaskboardGroupBy.PARENT_CLASSIFICATION, true)) {
        if (Utils_String.equals(pivotValue, TaskBoardModel.NULL_PIVOT_KEY, true)) {
          // If pivot value is null and the classification is parent classification,
          // we need to create the "Unparented" row.
          this._model.setOrphanTasksFlag(true);
          templateId = TaskBoardModel.NO_PARENT_ID;
        }
        else {
          templateId = pivotValue;
        }
      }

      let classificationData: IClassificationData = {
        templateId: templateId,
        pivotKey: pivotValue
      };
      let $summaryRow = this._getSummaryRow(this._getRowId(classificationData));
      if ($summaryRow) {
        this._toggleRowVisibilityAndUpdateCollapseAllButton(classificationData, this._getPeopleChildMap());
        // Row will get populated when created, so we can just exit here
        return;
      }
      else {
        this._addRow(
          classificationData,
          this._getPeopleChildMap(),
          templateId !== TaskBoardModel.NO_PARENT_ID
        );
      }

      //if custom layout is enabled create custom columns for cells within the newly added row
      if (this._isEffectiveCustomLayout()) {
        $.each(this._model.stateKeys, (index: number, state: string) => {
          this._createCustomColumnsInCell(this._cellLookupTable[pivotValue][state], this._customColumnCount);
        });
      }
    }

    $targetContainer = this._cellLookupTable[pivotValue][state];

    if ($targetContainer) {
      $tile.addClass(TaskBoardView.TASKBOARD_CHILD_TILE_CLASS);

      // Adding the task to the appropriate container
      if (this._isEffectiveCustomLayout()) {

        $sourceContainer = $tile.closest("." + TaskBoardView.CELL_CLASS);
        if ($sourceContainer.length > 0) {
          if ($sourceContainer.is($targetContainer)) {
            // If the tile is already present in the cell, this is a repositioning operation.
            // One scenario when we might reach here is if stack order fields is changed.

            cellChildTiles = $("." + TaskBoardView.TILE_CSS_CLASS + ":not(.ui-draggable-dragging)", $targetContainer).toArray();
            this._sortTilesByOrder(cellChildTiles);

            var insertionIndex = this._findInsertionIndex(cellChildTiles, $tile);

            var currentIndex = this._getOrderAttribute($tile);
            var newIndex = insertionIndex > currentIndex ? insertionIndex - 1 : insertionIndex;

            this._rePositionTileAtIndex($tile, cellChildTiles, newIndex);
          }
          else {
            // If the tile is coming from another cell, we need to re-insert tiles in the source cell as well.
            this._removeTileFromCell($tile);
            this._insertTileCustomLayout($targetContainer, $tile, id);
          }
        }
        else {
          //if it is an orphan, there are only 2 possibilities
          //this is being called on board load, or if its a new card
          //in both these scenarios the tile is in order and needs to be appended to the cell
          this._appendTileInCell($targetContainer, $tile);
        }
      }
      else {
        this._insertTile($targetContainer, $tile, id);
      }
      this._setTileFiltering(id, $tile, pivotValue, this._viewDisplayed);
    }
    else {
      // If no container is found, task is removed (meaning that state is 
      // changed to a value which is not listed in the taskboard as a column)
      this._removeTile($tile, id);
      $tile = null;
    }

    return $tile;
  }

  /**
   * Removes the tiles or rows from the board with matching work item ids
   * @param ids The work item ids to remove from the board's view
   * @param unparentChildren If true, unparent the child items associated with parent
   */
  public removeItems(ids: number[], unparentChildren?: boolean) {
    let parentIds: number[] = [];
    let newParentIds: number[] = [];

    // Categorize the ids into parents or tiles
    ids.forEach((id) => {
      // cache parent ids for later processing
      if (this._model.isParentId(id)) {
        parentIds.push(id);
        return;
      }

      // remove tiles
      const $tile = this._tileCache[id];
      if ($tile && this._isNewParentTile($tile)) {
        // Temporarily added new row that needs to be deleted.
        newParentIds.push(id);
        return;
      } else {
        if ($tile) {
          this._removeTile($tile, id);
        }
        // regardless of whether there was a tile on board still remove this data and from the lookup table if it has a parent
        var parentId = this._model.getParent(id);
        if (parentId != undefined && parentId != null) {
          this._model.removeChildIdFromChildLookupTableAndIdList(id, parentId);
        }
        this._model.removeData(id);
      }
    });

    // clean up parents
    parentIds.forEach((parentId) => {
      this._removeParentRow(parentId, unparentChildren);
    });

    // clean up new parents
    newParentIds.forEach((newParentId) => {
      this._removeParentRow(newParentId, unparentChildren);
      this._raiseNewParentItemDiscarded();
    });

    this._updateTotals();
  }

  /**
   * Removes a parent row from the taskboard
   * @param parentId The id of the parent to remove
   * @param unparentChildren Should we unparent the child items associated with the parent?
   */
  private _removeParentRow(parentId: number, unparentChildren?: boolean) {
    let $tile;
    let pivotKey: string = parentId < 0 ? TaskBoardModel.NEW_ROW_PIVOT_KEY : String(parentId);
    var rowId = this._rowPivotKeyMap[pivotKey];
    var $row = $("#" + TaskBoardView.ROW_ID_PREFIX + rowId);
    var $summaryRow = $("#taskboard-summary-row-" + rowId);

    let children = this._model.getChildWorkItemIdsByParent(parentId);
    var childIds: number[] = children ? children.concat() : [];
    if (parentId < 0 || childIds.length === 0 || unparentChildren) {
      delete this._rowPivotKeyMap[pivotKey]
      delete this._cellLookupTable[pivotKey]
      delete this._filteredRows[pivotKey];

      this._model.removeData(parentId);
      this._model.clearParentLookupTableAndIdList(parentId);

      $tile = this._tileCache[parentId];
      if ($tile) {
        if (unparentChildren) {
          childIds.forEach((id) => {
            // Need to update the pivot manually so that it is moved vertically to the right row
            var pivotField = this._model._getClassificationProvider(TaskboardGroupBy.PARENT_CLASSIFICATION).getPivotField();
            this._model.setFieldValue(id, pivotField, TaskBoardModel.NO_PARENT_ID);
            this._model.updateChildrenLookupTableAfterEdit(id, TaskBoardModel.NO_PARENT_ID, parentId);

            var $childTile = this._tileCache[id];
            if ($childTile) {
              this._updateTile($childTile, id);
            }
          });
          this._model.clearChildLookupTableAndIdList(parentId);
        }
        this._removeTile($tile, parentId);
      }

      $summaryRow.empty().remove();
      $row.empty().remove();
    }
  }

  /**
   * Removes a tile from the view
   * @param $tile The tile to remove
   * @param id id
   */
  private _removeTile($tile: JQuery, id: number) {

    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsNumber(id, "id");

    delete this._tileCache[id];

    if (this._isEffectiveCustomLayout()) {
      this._removeTileFromCell($tile);
    }

    $tile.empty();
    $tile.remove();
  }

  /**
   *     Detaches the given tile. If the tile belongs to any cell, updates the tileCount for parent cell and
   *     re - inserts tiles after the given tile in given cell
   *
   * @param $tile  Tile to be removed
   */
  private _removeTileFromCell($tile: JQuery) {

    var $cell: JQuery,
      tileCount: number,
      index: number,
      cellChildTiles: Element[],
      tilesToReposition: Element[] = [];

    $cell = $tile.closest("." + TaskBoardView.CELL_CLASS);

    if ($cell.length > 0) {
      // The tile belongs to a cell

      index = this._getOrderAttribute($tile);

      if (index >= 0) {
        cellChildTiles = $("." + TaskBoardView.TILE_CSS_CLASS + ":not(.ui-draggable-dragging)", $cell).toArray();
        this._sortTilesByOrder(cellChildTiles);

        tilesToReposition = cellChildTiles.slice(index + 1);

        // decrease the tile count because we are going to detach the given tile
        tileCount = $cell.data(TaskBoardView.DATA_TILE_COUNT);
        $cell.data(TaskBoardView.DATA_TILE_COUNT, tileCount - 1);
      }
      else {
        return;
      }
    }
    $tile.detach();
    if (tilesToReposition.length > 0) {
      this._reInsertTiles($cell, tilesToReposition);
    } else {
      this._refreshCellColumnsHeightData($cell);
    }
  }

  /**
   *     Inserts the tile at the appropriate position within the cell.
   * 
   * @param $cell 
   *     The cell in the view the tile is being inserted into.
   * 
   * @param $tile 
   *     The tile in the view being inserted.
   * 
   * @param tileId id
   */
  private _insertTile($cell: JQuery, $tile: JQuery, tileId: number) {

    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsObject($cell, "$cell");
    Diag.Debug.assertParamIsNumber(tileId, "tileId");

    var insertionIndex: number,
      $insertBeforeTile: JQuery,
      cellChildTiles: Element[];

    var $parentTileForSourceRow = $tile.closest("tr").find(".parentTbTile");

    var $parentTileForTargetRow = $cell.closest("tr").find(".parentTbTile");

    $tile.detach();

    cellChildTiles = $("." + TaskBoardView.TILE_CSS_CLASS + ":not(.ui-draggable-dragging)", $cell).toArray();

    // Find the location where the tile belongs.
    insertionIndex = this._findInsertionIndex(cellChildTiles, $tile);
    if (insertionIndex < cellChildTiles.length) {
      $insertBeforeTile = $(cellChildTiles[insertionIndex]);
    }

    if ($insertBeforeTile) {
      $tile.insertBefore($insertBeforeTile);
    }
    else {
      // No tile was found to insert before, so we need to insert after
      // the last tile in the cell.
      $tile.appendTo($cell);
    }

    $(this._$tableBody).trigger(TaskBoardView.EVENT_INSERT_TILE_COMPLETED, [$parentTileForSourceRow, $parentTileForTargetRow]);
    //set the height for the parent tiles for the source row and the target row after insertion

  }

  /**
   *     Inserts the tile at the appropriate position within the cell for custom (compact) layout.
   * 
   * @param $cell 
   *     The cell in the view the tile is being inserted into.
   * 
   * @param $tile 
   *     The tile in the view being inserted.
   * 
   * @param tileId id
   */
  private _insertTileCustomLayout($cell: JQuery, $tile: JQuery, tileId: number) {

    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsObject($cell, "$cell");
    Diag.Debug.assertParamIsNumber(tileId, "tileId");

    var insertionIndex: number,
      cellChildTiles: Element[],
      tilesToReInsert: Element[] = [];

    var $parentTileForSourceRow = $tile.closest("tr").find(".parentTbTile");

    var $parentTileForTargetRow = $cell.closest("tr").find(".parentTbTile");

    cellChildTiles = $("." + TaskBoardView.TILE_CSS_CLASS + ":not(.ui-draggable-dragging)", $cell).toArray();

    // Tiles in $cellChildTiles may not be sorted. So we are sorting these.
    this._sortTilesByOrder(cellChildTiles);

    // Find the location where the tile belongs.
    insertionIndex = this._findInsertionIndex(cellChildTiles, $tile);

    tilesToReInsert = cellChildTiles.slice(insertionIndex);

    $tile.detach();
    if (tilesToReInsert.length > 0) {
      // Add the given tile to the list
      tilesToReInsert.splice(0, 0, $tile[0]);
      this._reInsertTiles($cell, tilesToReInsert);
    } else {
      this._appendTileInCell($cell, $tile);
    }

    $(this._$tableBody).trigger(TaskBoardView.EVENT_INSERT_TILE_COMPLETED, [$parentTileForSourceRow, $parentTileForTargetRow]);
    //set the height for the parent tiles for the source row and the target row after insertion
  }

  /**
   *     For a given tile and a set of tiles, return the index at which the tile should be placed.
   */
  private _findInsertionIndex(tiles: Element[], $tile: JQuery): number {
    var tileId = this.getIdNumberFromElement($tile),
      tileSortValue = this._getOrderFieldValueOrDefault(tileId),
      tileParentId = this._model.getParent(tileId),
      tileParentSortValue = this._getOrderFieldValueOrDefault(tileParentId);

    // Find the location where the tile belongs.
    for (var i = 0; i < tiles.length; i++) {
      var $iterationTile = $(tiles[i]);
      var iterationTileId = this.getIdNumberFromElement($iterationTile),
        iterationTileSortValue = this._getOrderFieldValueOrDefault(iterationTileId),
        iterationTileParentId = this._model.getParent(iterationTileId);

      // - If the tileSortValue is less than this iteration tiles sort value,
      //   then it should be placed before the iteration tile.
      //
      // - If the sort values are equal then 
      //   if the id of the tile being inserted is less than this iteration tiles id 
      //   or if this iteration tile is a temporary tile (iteration tile's id is negative)
      //   then it should be placed before the iteration tile.  
      //   This is done to ensure that the tiles always show up in
      //   a consistent order even when they have the same sort value.
      //   and all temporary tiles (with negative id) show up at the bottom in order of creation
      if (tileParentId === iterationTileParentId) {
        if ((tileSortValue < iterationTileSortValue) ||
          (tileSortValue === iterationTileSortValue &&
            ((tileId > 0 && (tileId < iterationTileId || iterationTileId < 0)) ||
              (tileId <= 0 && iterationTileId <= 0 && tileId > iterationTileId)))) {
          break;
        }
      } else {
        if (tileParentId === 0 && iterationTileParentId > 0) {
          break; // unparented child will appear before parented items
        } else if (tileParentId > 0 && iterationTileParentId === 0) {
          continue; // dont want to insert before unparented children
        } else {
          var iterationTileParentSortValue = this._getOrderFieldValueOrDefault(iterationTileParentId);
          if (tileParentSortValue < iterationTileParentSortValue ||
            (tileParentSortValue === iterationTileParentSortValue && tileParentId < iterationTileParentId)) {
            break;
          }
        }
      }
    }

    return i;
  }

  protected _sortTiles(tiles: Element[]) {
    /// <summary>
    ///     Sorts the given set of tiles in the order in which they should appear in a taskboard cell.
    ///     This is different from _sortTilesByOrder, which uses the data present on tile's JQuery object for sorting.
    /// < /summary>

    tiles.sort((a: Element, b: Element) => {
      var idA = this.getIdNumberFromElement($(a));
      var orderA = this._getOrderFieldValueOrDefault(idA);
      var idB = this.getIdNumberFromElement($(b));
      var orderB = this._getOrderFieldValueOrDefault(idB);

      // - If the order value of A is less than order value of B,
      //   then it should be placed before B.
      //
      // - If the sort values are equal then 
      //   if the id of A is less than id of B
      //   or if B is a temporary tile (B's id is negative)
      //   then A should be placed before B.  
      //   This is done to ensure that the tiles always show up in
      //   a consistent order even when they have the same sort value.
      //   and all temporary tiles (with negative id) show up at the bottom in order of creation
      if ((orderA < orderB) ||
        (orderA === orderB &&
          ((idA > 0 && (idA < idB || idB < 0)) ||
            (idA <= 0 && idB <= 0 && idA > idB)))) {
        return -1;
      }
      else if (idA === idB) {
        return 0;
      }
      else {
        return 1;
      }
    });
  }

  /**
   * Retrieve the order field value for the specified tile id, or max
   * value if the order field value is null/undefined to ensure that
   * tiles without an order field value get pushed to the end of the list,
   * and displayed in work item ID order.
   */
  private _getOrderFieldValueOrDefault(tileId: number): number {
    var tileSortValue: number = this._model.getFieldValue(tileId, TaskBoardView.ORDER_BY_FIELD_NAME);
    if (tileSortValue === null || tileSortValue === undefined) {
      return Number.MAX_VALUE;
    } else {
      return tileSortValue;
    }
  }

  private _appendTileInCell($cell: JQuery, $tile: JQuery) {
    Diag.Debug.assertParamIsNotNull($cell, "$cell");
    Diag.Debug.assertParamIsNotNull($tile, "$tile");

    var colWithMinHeight = 0, minHeight = Number.MAX_VALUE;
    var $subColumns = $("." + TaskBoardView.CELL_SUBCOLUMN_CLASS, $cell);
    var tileCount = $cell.data(TaskBoardView.DATA_TILE_COUNT);
    if (tileCount === undefined) {
      tileCount = 0;
    }

    $subColumns.each((index: number, column: Element) => {
      var height = $(column).data(TaskBoardView.DATA_SUBCOLUMN_HEIGHT);
      if (height < minHeight) {
        colWithMinHeight = index;
        minHeight = height;
      }
    });

    var $columnToInsertTile = $($subColumns[colWithMinHeight]);
    $tile.attr(TaskBoardView.ATTR_TILE_ORDER, tileCount);
    $columnToInsertTile.append($tile);
    $columnToInsertTile.data(TaskBoardView.DATA_SUBCOLUMN_HEIGHT, $columnToInsertTile[0].offsetHeight);

    $cell.data(TaskBoardView.DATA_TILE_COUNT, tileCount + 1);
  }


  private _sortTilesByOrder(tiles: Element[]) {
    if (tiles) {
      tiles.sort((a, b) => {
        var orderA = this._getOrderAttribute($(a));
        var orderB = this._getOrderAttribute($(b));
        if (orderA > orderB) {
          return 1;
        }
        else if (orderA < orderB) {
          return -1;
        }
        else {
          return 0
        }
      });
    }
  }

  private _rePositionTileAtIndex($tile: JQuery, tiles: Element[], indexToInsertAt: number) {
    /// <summary> 
    ///     Places $tile at the given index in given set of tiles assuming
    ///     that $tile is already in the set 'tiles'
    /// < /summary>

    var originalIndex = this._getOrderAttribute($tile),
      tilesToReInsert: Element[] = [],
      $cell = $($tile.closest(".taskboard-cell")[0]);

    // Make sure that Tile to be repositioned is there in set of given tiles
    Diag.Debug.assert($(tiles[originalIndex]).is($tile), "tile to be repositioned not valid");

    if (originalIndex === indexToInsertAt) {
      return;
    }

    var moveToIndex = (array: Element[], oldIndex: number, newIndex: number) => {
      // Move the element at oldIndex to newIndex
      array.splice(newIndex, 0, array.splice(oldIndex, 1)[0]);
    }

    if (originalIndex > indexToInsertAt) {
      // direction is UP
      tilesToReInsert = tiles.slice(indexToInsertAt);
      moveToIndex(tilesToReInsert, originalIndex - indexToInsertAt, 0);

    } else {
      // direction is DOWN
      tilesToReInsert = tiles.slice(originalIndex);
      moveToIndex(tilesToReInsert, 0, indexToInsertAt - originalIndex);
    }

    this._reInsertTiles($cell, tilesToReInsert);
  }

  private _refreshCellColumnsHeightData($cell: JQuery) {
    $("." + TaskBoardView.CELL_SUBCOLUMN_CLASS, $cell).each((index: number, column: Element) => {
      $(column).data(TaskBoardView.DATA_SUBCOLUMN_HEIGHT, $(column)[0].offsetHeight);
    });
  }

  private _reInsertTiles($cell: JQuery, tiles?: Element[]) {
    /// <summary>
    ///     Detaches the given tiles and appends them in the given cell.
    ///     The order in which cells are appended is same as the order in which they appear the provided list..
    /// < /summary>
    /// <param name="$cell" type="jQuery">Cell in which the tile has to be inserted.</param>
    /// <param name="$tiles type="jQuery">Tiles to be inserted.</param>

    Diag.Debug.assertParamIsNotNull($cell, "$cell");

    if (tiles) {
      // Detach
      this._detachTiles($cell, tiles);

      this._refreshCellColumnsHeightData($cell);

      // Re-insert the detached tiles
      this._appendTilesInCell($cell, tiles);
    }
  }

  /**
   *  Appends the given tiles in the cell 
   */
  private _appendTilesInCell($cell: JQuery, tiles: Element[]) {
    Diag.Debug.assertParamIsNotNull($cell, "$cell");
    Diag.Debug.assertParamIsNotNull(tiles, "tiles");

    tiles.forEach((tile: Element, i: number) => {
      this._appendTileInCell($cell, $(tile));
    });
  }

  /**
   *  Out of given tiles, detaches the tiles which are present in given cell and updates tile count of given cell
   */
  private _detachTiles($cell: JQuery, tiles: Element[]) {
    Diag.Debug.assertParamIsNotNull($cell, "$cell");
    Diag.Debug.assertParamIsNotNull(tiles, "tiles");

    var tileCount = $cell.data(TaskBoardView.DATA_TILE_COUNT),
      tilesDetached = 0;     // Out of given set of tiles, how many are already present in the cell

    tiles.forEach((tile: Element, i: number) => {
      if ($cell.has(tile).length > 0) {
        tilesDetached++;
        $(tile).detach();
        tile = null;
      }
    });
    $cell.data(TaskBoardView.DATA_TILE_COUNT, tileCount - tilesDetached);
  }

  /**
   * Get the tile detail rows (which excludes the header and summary rows)
   */
  private _getTileRows(): JQuery {
    return $("tbody " + TaskBoardView.ROW_CSS_SELECTOR, this._$tableBody).not(".taskboard-row-summary");
  }

  /**
   * Get all the rows including tile detail and summary rows
   */
  private _getAllRows(): JQuery {
    return $("tbody " + TaskBoardView.ROW_CSS_SELECTOR, this._$tableBody);
  }

  /**
   *     Show the "Saving..." message on the provided tile.
   * 
   * @param $tile Tile to show saving message on.
   */
  private _showSavingMessage($tile: JQuery) {
    Diag.Debug.assertParamIsObject($tile, "$tile");

    this._showStatusMessage($tile, TaskboardResources.Taskboard_SavingTile, "witSaving");
  }

  public showError(id: number, result: Error) {
    this._model.setWorkItemError(id, result);
    this._viewState.setError(id, 1);
    this.refreshTile(id);
  }

  /**
   *     Show the message in the status area of the tile.
   * 
   * @param $tile Tile to show the message on.
   * @param message Message to be displayed.
   * @param className Class to be applied to the status area.
   */
  private _showStatusMessage($tile: JQuery, message: string, className: string) {
    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsStringNotEmpty(message, "message");
    Diag.Debug.assertParamIsStringNotEmpty(className, "className");

    this._cardRenderer.hideExtraFields($tile);

    // Add the message to the tile.
    $(domElem("div", "tbStatusArea " + className))
      .text(message)
      .appendTo($tile);
  }

  private calculateRollup() {
    this._remainingWorkRollUp = this._model.calculateRollup(this._classificationType);
  }

  /**
   *     Updates the remaining work rollups for the column headers and the rows.
   */
  private _updateTotals(skipRollupCalculation?: boolean) {
    if (!skipRollupCalculation) {
      this.calculateRollup();
    }

    var $rows = this._getTileRows();
    var pivotElementClassName: string;
    if (this._classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION) {
      pivotElementClassName = "parentTbTile";
    }
    else {
      pivotElementClassName = "tbPivotItem";
    }

    // Update the parent rollups.
    $("." + pivotElementClassName, $rows).each((i, pivotElement) => {
      var pivotKey = $(pivotElement).closest(TaskBoardView.ROW_CSS_SELECTOR).data(TaskBoardView.DATA_PIVOT_KEY);
      if (pivotKey) {
        // This may not exist if we are grouped by people and the Zero Data taskboard is shown due to filtering
        var value = this._remainingWorkRollUp.verticalRollup[pivotKey];
        var workString = FormatUtils.formatRemainingWorkForDisplay(value);

        $(pivotElement).find('.' + CardControls.FieldRendererHelper.REMAINING_WORK_CLASS).eq(0).text(this._model.formatRemainingWork(workString));
      }
    });

    // Update the state rollups.
    $('th.taskboard-cell', this._$tableHeader).each((i, tbCell) => {
      var state = $(tbCell).data(TaskBoardView.DATA_WIT_STATE),
        value = this._remainingWorkRollUp.horizontalRollup[state] || 0;

      var workString = FormatUtils.formatRemainingWorkForDisplay(value);

      $(tbCell).find('.' + CardControls.FieldRendererHelper.REMAINING_WORK_CLASS).eq(0).text(this._model.formatRemainingWork(workString));
    });
  }

  /**
   * return the closet tile element to the supplied element
   * 
   * @param $element element to search tile in its ancestory
   */
  private _getClosestTile($element: JQuery): JQuery {

    Diag.Debug.assertParamIsObject($element, "$element");

    return $element.closest(".tbTile");
  }

  public _relayout() {
    // Complete active on-tile edit - because we will be detaching the tiles as part of relayout
    // On Chrome, blur gets fired on detaching an element. In our blur handler, we either
    // i)  Detach the tile if title is empty - In this case, we will end up trying to
    //     remove a tile which has alread been removed.
    //     OR
    // ii) Refresh the tile . Refreshing the tile involves positioning it correctly in the cell.
    //     Since we are in the middle of detaching the tiles, some tiles may have been detached and positioning
    //     wouldn't work as expected.
    this._cardEditController.endActiveEdit();

    // Store the expand state of rows so that we can set it after populating the board
    var expandStates = this._getRowsExpandStates();

    this._resetCellSubColumns();

    // clear the caches
    // TODO: there is an issue where model _childWorkItemIds are not kept in sync
    // To fix that issue, and then this can be removed
    this._model.clearChildrenLookupTable();

    if (this._isEffectiveCustomLayout()) {
      // Before populating the board, expand all the rows because custom layout needs the non-summary rows to be visible
      this._setAllRowsToExpanded(/*expand all*/ true);
    }

    // Populate the taskboard with the tiles for the work items.
    this._populateTaskboard();

    // Restore the expand state for all the rows        
    this._setRowsExpandStates(expandStates);
  }

  /**
   *     Returns a map from pivotKey to a boolean value. The boolean value denotes whether
   *     the state of the row corresponding to the pivot key is expanded or not - true denoting
   *     'expanded' and false denoting 'collapsed'.
   */
  private _getRowsExpandStates(): any {
    var expandStates: IDictionaryNumberTo<boolean> = {};
    var $rows: JQuery = this._getTileRows(),
      $row: JQuery,
      isCollapsed: boolean;

    $rows.each((index: number, row: Element) => {
      $row = $(row);
      isCollapsed = this._isRowCollapsed($row);
      expandStates[$row.data(TaskBoardView.DATA_PIVOT_KEY)] = !isCollapsed;
    });

    return expandStates;
  }

  /**
   *      Returns true if all rows in the taskboard are collapsed. Public for unit testing. 
   */
  public _areAllRowsCollapsed(): boolean {
    const $rows: JQuery = this._getTileRows();

    for (var i = 0; i < $rows.length; i++) {
      let $row = $($rows[i]);
      let isCollapsed = this._isRowCollapsed($row);
      if (!isCollapsed) {
        return false;
      }
    }

    return true;
  }

  /**
   *     Updates the expand state of the rows on the board as specified by the expandStates parameter
   * 
   * @param expandStates 
   *     A map from pivotValue(can be 'string' or 'number') to boolean -
   *     true denoting 'expanded' and false denoting 'collapsed'.
   * 
   */
  private _setRowsExpandStates(expandStates: IDictionaryNumberTo<boolean>) {
    const $rows: JQuery = this._getTileRows();
    let $row: JQuery;
    let pivotKey;

    $rows.each((index: number, row: Element) => {
      $row = $(row);
      pivotKey = $row.data(TaskBoardView.DATA_PIVOT_KEY);
      // If no expand/collapse state is specified in the given map
      // don't touch the current state
      if (expandStates[pivotKey] !== undefined) {
        this._showTileRow($row, expandStates[pivotKey], /*Do not update the expand/collapse all button*/ false);
      }
    });

    // Needed to determine state of all rows because we skipped it in showTileRow
    let areAllCollapsed = this._areAllRowsCollapsed();
    this._toggleExpandAllButton(areAllCollapsed);
  }

  /**
   *     Expands or collapses all rows on the board as specified by the expandState parameter
   * 
   * @param expandState 
   *     True denoting 'expanded' and false denoting 'collapsed'.
   * @param includeSummaryRows
   *      If the summary rows should be included in the expand/collapse all. This is only necessary 
   *      for an expand/collapse all where not all tile rows have been created. 
   */
  // Public for unit testing
  public _setAllRowsToExpanded(expandState: boolean, includeSummaryRows: boolean = false) {
    var $rows: JQuery = includeSummaryRows ? this._getAllRows() : this._getTileRows();

    $rows.each((index: number, row: Element) => {
      let $row = $(row);
      let isExpandRow = !this._isSummaryRow($row);
      // expandState true means expand the display row. Summary rows should do the opposite.
      let shouldExpand = isExpandRow ? expandState : !expandState;
      this._showTileRow($row, shouldExpand, /*Do not update the expand/collapse all button*/ false);
    })

    // Needed to determine state of all rows because we skipped it in showTileRow
    let areAllCollapsed = this._areAllRowsCollapsed();
    this._toggleExpandAllButton(areAllCollapsed);
  }

  /**
   *  Allign thead and tbody column. 
   */
  public _adjustTopOfDivsAndWidthOfTableContainingHeader() {

    // Bug In IE11 and IE10: on zooming horizontal bar is not comming, So fixing the height also
    if (BrowserCheckUtils.isIE()) {
      if (!BrowserCheckUtils.isLessThanOrEqualToIE9()) {
        this._$tableBodyContainer.css({ "height": this._$container.height() - this._$tableBodyContainer.position().top });
      }
    }

    this._scrollBarWidth = ControlUtils.widthOfScrollBar();

    var widthOfOuterDiv = this._$tableHeaderContainer.width();
    var $innerHeaderDiv = this._$tableHeaderContainer.find(".tableHeaderInnerContainer");

    // Setting the width of inner div to align column of header and rows when scrolling.
    $innerHeaderDiv.css({ "width": widthOfOuterDiv });
    $innerHeaderDiv.css({ "padding-right": this._scrollBarWidth }); // Filling buffer width with padding

    var widthOfHeader = this._$tableHeaderContainer.find("#" + TaskBoardView.TASKBOARD_TABLE_HEADER_ID).width();
    if (widthOfHeader > widthOfOuterDiv - this._scrollBarWidth) {
      $innerHeaderDiv.css({ "width": widthOfHeader + this._scrollBarWidth }); /* _scrollBarWidth is the buffer to handle alignment problem between content and header of Task board */
    }

    // Syncronizing the width of both header and row table 
    this._$tableBody.css({ "width": widthOfHeader });


  }

  /**
   *     Builds an empty taskboard table clearing out the current one if it exists.
   */
  private _buildTaskboardTable(): void {
    var i, l;

    // Create the taskboard table which contains header only
    var $tableContainsHeader = $("<table id='" + TaskBoardView.TASKBOARD_TABLE_HEADER_ID + "'>")
      .attr("summary",
        Utils_String.format(TaskboardResources.Taskboard_AccessibilityTableSummary,
          this._model.getPivotFieldDisplayName(this._classificationType)));

    // Build the heading.
    $(domElem("thead"))
      .append(this._buildHeadingRow(this._model.states))
      .appendTo($tableContainsHeader);

    // Create the taskboard table which contains body only
    var $tableContainsBody = $("<table id='" + TaskBoardView.TASKBOARD_TABLE_BODY_ID + "'>")
      .attr("summary",
        Utils_String.format(TaskboardResources.Taskboard_AccessibilityTableSummary,
          this._model.getPivotFieldDisplayName(this._classificationType)))
      .attr("aria-labelledby", TaskBoardView.TASKBOARD_TITLE_ID)
      .attr("aria-describedby", TaskBoardView.TASKBOARD_ARIA_DESCRIBEDBY_ID);

    // Setup the column widths [BUG1077867]
    var $colgroupBody = $(`
                <colgroup>
                    <col class="taskboard-expander">
                    <col class="taskboard-parent">
                </colgroup>
            `);

    var states = this._model.states;
    var columnWidthInPercentage = `${100 / (states.length)}%`;
    for (let i = 0; i < states.length; i++) {
      let $col = $("<col>").css("width", columnWidthInPercentage);
      $colgroupBody.append($col);
    }

    $tableContainsBody.append($colgroupBody);

    this._$tableHeader = $tableContainsHeader;
    this._$tableBody = $tableContainsBody;

    // Add the table to the taskboard container
    this._$tableHeaderContainer.find(".tableHeaderInnerContainer").append($tableContainsHeader);
    this._$tableBodyContainer.append($tableContainsBody);

    this._customColumnCount = this._calculateColumnSizeForCustomLayout();

    // Build the rows of the table.
    this._maxRowId = 0;
    this._cellLookupTable = {};
    this._addNewItemControls = {};

    let classification = this._model.getClassification(this._classificationType);
    let map: IDictionaryStringTo<number[]> = this._getPeopleChildMap();
    for (i = 0, l = classification.length; i < l; i += 1) {
      this._addRow(classification[i], map);
    }

    // Render Expand/Collapse all based on rows state 
    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAgileTaskboardExpandCollapseAll)) {
      this._addCollapseExpandAllButton();
    }

    // Syncronizing header and body scrolling
    this._$tableBodyContainer.bind("scroll", () => {
      this._$tableHeaderContainer.scrollLeft(this._$tableBodyContainer.scrollLeft());
    });

    $(window).bind("resize", this.resize);
    // "resize" event is not get triggered when we switch between poeple and backlog view
    this._adjustTopOfDivsAndWidthOfTableContainingHeader();

    if (this._isAdvancedBacklogManagement()) {
      // bind events for use in tile edit    
      $tableContainsBody.mouseover((event) => { this._onCardMouseOver(event); })
        .mouseout((event) => { this._onCardMouseOut(event); })
        .mousedown((event) => { this._onCardMouseDown(event); })
        .mouseup((event) => { this._onCardMouseUp(event); });

    }
  }

  /**
   * Set the TaskboardView's display
   */
  private _populateContainer(classificationType: string): void {
    this._$container.append(this._$dismissableMessageArea);
    this._$container.append(this._$messageArea);
    this._$container.append(this._$tableHeaderContainer).append(this._$tableBodyContainer);

    const suffix = classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION ?
      TaskboardResources.Tile_AriaDescribedBy_ChangeParentSuffix : TaskboardResources.Tile_AriaDescribedBy_AssignToSuffix;
    this._$container.append($(`<div id='${TaskBoardView.TASKBOARD_ARIA_DESCRIBEDBY_ID}'>`)
      .text(Utils_String.format(TaskboardResources.Taskboard_AriaDescribedBytext, suffix))
      .css('visibility', 'hidden'));
  }

  public resize = () => {
    if (!this._zeroDataContainer) {
      this._adjustTopOfDivsAndWidthOfTableContainingHeader();
      // on a resize event evaulate if need to relayout
      //optimization , if the number of custom columns to be created doesn't change don't relayout
      const currentCustomColumnCount = this._calculateColumnSizeForCustomLayout();
      if (this._customColumnCount !== currentCustomColumnCount) {
        this._customColumnCount = currentCustomColumnCount;
        this._relayout();
      }
    }
  }

  /**
   * Add appropriate image/text to "Collapse All" button containers. Need to render after all rows are rendered so we know the expand/collapse all state. 
   */
  private _addCollapseExpandAllButton() {

    // Get initial state of rows. If all rows are collapsed, show expand all 
    const showExpandAll = this._areAllRowsCollapsed();
    this._expandAllButtonState = showExpandAll;

    const $collapseAllButton = this._setUpExpandAllButton(this._expandAllButtonState);
    $collapseAllButton.click((e: JQueryEventObject) => {
      this._expandCollapseAll()
    });
  }

  /**
   * Check if Expand/Collapse all buttons should change state, and set the new state
   * @param setToExpandAll - Set the button to say "Expand All"
   */
  private _toggleExpandAllButton(setToExpandAll: boolean) {
    if (FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAgileTaskboardExpandCollapseAll)) {
      if (this._expandAllButtonState !== setToExpandAll) {
        this._expandAllButtonState = setToExpandAll;

        $("#" + TaskBoardView.TASKBOARD_COLLAPSE_BUTTON).children().remove();
        this._setUpExpandAllButton(this._expandAllButtonState);
      }
    }
  }

  private _setUpExpandAllButton(expandAllButtonState) {
    let icon = expandAllButtonState ? TaskBoardView.TASKBOARD_EXPAND_ICON : TaskBoardView.TASKBAORD_COLLAPSE_ICON;
    let text = expandAllButtonState ? TaskboardResources.Taskboard_Expand : TaskboardResources.Taskboard_Collapse;

    return $("#" + TaskBoardView.TASKBOARD_COLLAPSE_BUTTON)
      .append($(domElem("div", icon)))
      .append($(domElem("div", TaskBoardView.TASKBOARD_COLLAPSE_TEXT)).text(text))
      .attr("aria-label", text);
  }

  private _expandCollapseAll() {
    this._setAllRowsToExpanded(this._expandAllButtonState, /*include summary rows*/ true);
  }

  private _onCardMouseOver(event: JQueryMouseEventObject) {
    Diag.Debug.assertParamIsObject(event, "event");

    var $target = $(event.target),
      $tile = this._getClosestTile($target);

    // if mouse is over a tile and the target is an editable field
    if ($tile.length && this._cardRenderer.isTargetEditable($target)) {

      var id = this.getIdNumberFromElement($tile),
        fieldName = this._cardRenderer.getFieldName($target, $tile);

      if (this._isCardFieldEditable(id, fieldName)) {
        if (isUseNewIdentityControlsEnabled()) {
          $target.closest(".field-inner-element.ellipsis.onTileEditTextDiv").addClass("hover");
        }
        else {
          $target.addClass("hover");
        }
      }
    }
    return false;
  }

  private _onCardMouseOut(event: JQueryMouseEventObject) {
    Diag.Debug.assertParamIsObject(event, "event");

    var $target = $(event.target),
      $tile = this._getClosestTile($target);

    // if mouse is over a tile
    if ($tile.length && this._cardRenderer.isTargetEditable($target)) {
      if (isUseNewIdentityControlsEnabled()) {
        $target.closest(".field-inner-element.ellipsis.onTileEditTextDiv").removeClass("hover");
      }
      else {
        $target.removeClass("hover");
      }
    }
    return false;
  }

  private _onCardMouseDown(event: JQueryMouseEventObject) {
    Diag.Debug.assertParamIsObject(event, "event");

    var $target = $(event.target),
      $tile = this._getClosestTile($target);

    // if mouse is over a tile
    if ($tile.length && this._cardRenderer.isTargetEditable($target)) {
      if (isUseNewIdentityControlsEnabled()) {
        $target.closest(".field-inner-element.ellipsis.onTileEditTextDiv").removeClass("hover");
      }
      else {
        $target.removeClass("hover");
      }

      // if left mouse down
      if (event.which === 1) {
        var id = this.getIdNumberFromElement($tile),
          fieldName = this._cardRenderer.getFieldName($target, $tile);

        if (this._isCardFieldEditable(id, fieldName)) {
          this._mousedownX = event.pageX;
          this._mousedownY = event.pageY;
        } else {
          this._mousedownX = -100;
          this._mousedownY = -100;
        }
      }
    }
  }

  private _onCardMouseUp(event: JQueryMouseEventObject): void {
    Diag.Debug.assertParamIsObject(event, "event");

    var $target = $(event.target),
      $tile = this._getClosestTile($target);

    // if left mouse up over a tile
    if (event.which === 1 && $tile.length && this._cardRenderer.isTargetEditable($target)) {

      var id = this.getIdNumberFromElement($tile),
        fieldName = this._cardRenderer.getFieldName($target, $tile),
        xChange = Math.abs(this._mousedownX - event.pageX),
        yChange = Math.abs(this._mousedownY - event.pageY);

      // If the mouse has moved a sufficiently small distance to count as a click and not as a drag
      // and if the tile field can be edited
      if (!this._isDragEvent(xChange, yChange) && this._isCardFieldEditable(id, fieldName)) {
        this._cardMouseupHandler($tile, fieldName, this._cardRenderer.getFieldContainer($tile, fieldName, $target));
      }
    }
  }

  /**
   *     Handler for the mouseup event. Used primarily to initiate tile edit
   * 
   * @param $tile  the tile on which field needs to be edited
   * @param fieldRefName  the field to be edited
   */
  private _cardMouseupHandler($tile: JQuery, fieldRefName: string, $fieldContainer: JQuery): void {

    var id = this.getIdNumberFromElement($tile),
      fieldSetting = this._getCardFieldSetting(id, fieldRefName),
      field: Cards.CardField = this._model.field(id, fieldRefName, fieldSetting),
      fieldView: CardControls.CardFieldView = field ? this._cardRenderer.getFieldView($fieldContainer, field) : null;

    //edit of core fields that are not identity fields do not require the item fetch to complete
    //if it's identity we need fetch workitem to set field's scope
    if (Util_Cards.isCoreField(fieldRefName, this._model.getWorkRollupFieldRefName()) && !field.definition().isIdentity()) {
      if (this._isEffectiveCustomLayout()) {
        // store tile's current height, since a field edit could result in changing the height of tile
        this._addHeightData($tile);
      }
      this._cardEditController.beginFieldEdit(fieldView,
        Utils_Core.delegate(this, Utils_Core.curry(this._editStartCallback, $tile)),
        Utils_Core.delegate(this, Utils_Core.curry(this._editCompleteCallback, $tile)),
        Utils_Core.delegate(this, Utils_Core.curry(this._editDiscardCallback, $tile)),
        this._getCardContext(id));
    } else {
      // disable Tile Events and show status indicator while the item is being loaded
      this._disableTileEvents($tile);

      var container: JQuery = fieldView.getElement().find("." + CardControls.FieldRendererHelper.FIELD_INNER_ELEMENT);
      container.empty();
      container.text("");

      var statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(
        StatusIndicator.StatusIndicator,
        container,
        {
          message: VSS_Resources_Platform.Loading,
          throttleMinTime: 0
        });
      statusIndicator.delayStart(TaskBoardView.TILE_DROP_ANIMATION_DURATION_SLOW_TIME);

      this._model.getWorkItemManager().beginGetWorkItem(id,
        () => {
          statusIndicator.complete();
          this._enableTileEvents($tile, false);
          if (field.isEditable()) {
            //if the field is editable, initiate edit

            if (this._isEffectiveCustomLayout()) {
              // store tile's current height, since a field edit could result in changing the height of tile
              this._addHeightData($tile);
            }

            this._cardEditController.beginFieldEdit(fieldView,
              Utils_Core.delegate(this, Utils_Core.curry(this._editStartCallback, $tile)),
              Utils_Core.delegate(this, Utils_Core.curry(this._editCompleteCallback, $tile)),
              Utils_Core.delegate(this, Utils_Core.curry(this._editDiscardCallback, $tile)),
              this._getCardContext(id));
          } else {
            //redraw the readonly view as the field is not editable
            this._cardRenderer.renderField(fieldView.getElement(), field, false);
          }
        },
        () => {
          statusIndicator.complete();
          this._enableTileEvents($tile);
          //redraw the readonly view in case of error
          this._cardRenderer.renderField(fieldView.getElement(), field, false);
        });
    }
  }

  private _disableTileEvents($tile: JQuery) {
    // Do not trigger keyboard actions 
    $tile.off("keydown");

    // We shouldn't be able to click to open the form if the dropdown is showing.
    // For more information, see note in _cleanupCallback 

    this._unbindTileEditClick($tile);
    $tile.data(TaskBoardView.DATA_BIND_CLICK, false);

    // We shouldn't be able to drag if we're inputting info
    // the "ui-state-disabled" class makes the tile appear disabled, like when saving, which is not what we want
    $tile.draggable('disable');
    $tile.removeClass("ui-state-disabled");
  }

  private _enableTileEvents($tile: JQuery, delayClickBind: boolean = true) {
    var id = this.getIdNumberFromElement($tile);

    // Re-enable drag if no save is in progress for the tile. if the tile is saving its enable will be handled by the taskboard logic
    if (!this._viewState.getSaveData(id)) {
      $tile.draggable('enable');
    }

    // NOTE: There are two important parts here, both of which are necessary.
    // 1. We use a timeout because if there is no timeout, we can click on the assigned to field, 
    //    which opens the dropdown (unbinding the click handler), then if we click on the tile the click handler gets bound right away, 
    //    causing the tile to open. We don't want the tile to open when we click on it while the drop down is open. You can still cause
    //    the tile if you do a long click on the tile (i.e. >400ms) while the drop down is open.
    // 2. If we only used a timeout, but didn't have the DATA_BIND_CLICK flag, we would run into the following problem:
    //    Since we are in edit mode, we have disabled the click. We do not want any tile refreshes to rebind the click till edit is complete
    //    so we set the flag as disabled at start of edit, and turn it on only after the timeout.
    var bindClick = () => {
      if (id !== TaskBoardModel.NO_PARENT_ID) {
        $tile.unbind("click.VSS.Agile"); //to avoid binding multiple identical handlers
        $tile.bind("click.VSS.Agile", Utils_Core.delegate(this, this._clickItem, $tile));
        $tile.data(TaskBoardView.DATA_BIND_CLICK, true);
      }
    }

    if (delayClickBind) {
      Utils_Core.delay(this, 400, bindClick);
    } else {
      bindClick();
    }

    // Add keydown behavior
    $tile.keydown((e: JQueryEventObject) => this._tileKeydownHandler(e));
  }

  private _attachTitleClickEvent($tile: JQuery): void {
    const $titletext = this._getClickableTitleSpan($tile);
    const $titleLink = $tile.find(".clickable-title-link");
    if ($titleLink.length === 0 && $titletext.length > 0) {
      const id = this.getIdNumberFromElement($tile);
      const url = this._getWorkItemEditUrl(id);
      const $titleLinkWrapper = $(`<a href="${url}" class="clickable-title-link"></a>`).attr("tabindex", "-1");
      $titletext.wrap($titleLinkWrapper);

      // Attach a click event, but only if ctrl or meta was not pressed
      $titletext.unbind("click").on("click", (event) => {
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this._raiseEditWorkItem(id);
        }
      });

      // Disable the custom context menu when right clicking on the link
      $titletext.unbind("contextmenu").on("contextmenu", (event) => {
        event.stopPropagation();
      });
    }
  }

  /**
   *  Given change in x-position and y-position, tells if this should be considered as a drag or not 
   */
  private _isDragEvent(xChange: number, yChange: number): boolean {
    if ((xChange < TaskBoardView.DRAG_START_DISTANCE) && (yChange < TaskBoardView.DRAG_START_DISTANCE)) {
      return false;
    }

    return true;
  }

  private _getCardFieldSetting(id: number, fieldName: string): Cards.ICardFieldSetting {
    var typeName = this._model.getFieldValue(id, WITConstants.CoreFieldRefNames.WorkItemType);
    return this.getCardSettingsProvider().getCardSettingsForItemType(typeName).getField(fieldName);
  }


  /**
   *  A callback called by the control which binds and unbinds various events on the tile 
   * 
   * @param $tile  The tile of the field that the handler is being bound to. 
   */
  private _editStartCallback($tile: JQuery): void {
    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.logTracePoint("TaskBoardView.cardFieldEdit.start");
    this._disableTileEvents($tile);
  }

  /**
   * Callback to be called when the edit is completed, thus reverting the bindings on the tile
   * @param $tile  The tile of the field that the handler is being bound to.
   * @param fieldView  The field view that was updated.
   * @param e  The event triggering the edit complete.
   * @param discard Was this tile edit and then discarded?
   */
  private _editCompleteCallback($tile: JQuery, fieldView: CardControls.CardFieldView, e: JQueryEventObject, discard: boolean): void {
    const fieldRefName = fieldView.field().referenceName();
    const id = fieldView.field().itemId();
    const setFocusOnTile = Util_Cards.shouldFocusOnCardAfterEdit(id, fieldRefName, e, discard);

    let changes: IDictionaryStringTo<any> = {};
    changes[fieldRefName] = fieldView.field().value();

    this._resetAfterEdit($tile, fieldRefName, discard, setFocusOnTile);

    if (!discard) {
      if (!($tile.hasClass("parentTbTile")) && this._isEffectiveCustomLayout()) {
        // Check if the edit resulted change in height of tile, if yes we need to re-insert all the tiles
        // after this tile in the cell
        const heightBeforeEdit = $tile.data(TaskBoardView.DATA_TILE_HEIGHT);
        if ($tile.height() !== heightBeforeEdit) {
          const $cell = $tile.closest("." + TaskBoardView.CELL_CLASS);
          const tilesToReposition = this._getAfterTiles($tile);
          this._reInsertTiles($cell, tilesToReposition);
        }
      }

      const saveActions: TFS_Agile_Controls.IOnTileEditSaveActions = {
        focusOnTile: setFocusOnTile,
        createNewTile: Util_Cards.shouldCreateNewCardAfterEdit(id, fieldRefName, e)
      };

      this._saveCallback($tile, changes, saveActions);

      if (this._tileHasFocus) {
        $tile.focus();
      }
    }
  }

  /**
   *  Callback to be called when the edit is completed but discarded
   * 
   * @param fieldView  the field view on which the edit was initiated 
   */
  private _editDiscardCallback($tile: JQuery, fieldView: CardControls.CardFieldView): void {
    var fieldRefName = fieldView.field().referenceName();

    // attach the title click event if the edited field was title
    if (fieldRefName === DatabaseCoreFieldRefName.Title) {
      this._attachTitleClickEvent($tile);
    }
  }

  /**
   *  Returns the set of tiles which are after the given tile (in given tile's cell) 
   */
  private _getAfterTiles($tile: JQuery): Element[] {
    var tiles: Element[] = [];
    var index = this._getOrderAttribute($tile);
    var $cell = $tile.closest("." + TaskBoardView.CELL_CLASS);

    if ($cell.length > 0) {
      var cellChildTiles = $("." + TaskBoardView.TILE_CSS_CLASS + ":not(.ui-draggable-dragging)", $cell).toArray();
      this._sortTilesByOrder(cellChildTiles);
      tiles = cellChildTiles.slice(index + 1);
    }

    return tiles;
  }

  /**
   *  Specifies whether we can click on a particular field on this tile 
   * 
   * @return  Should return true if the tile is not being processed 
   */
  private _isCardEditable(id: number): boolean {
    return (!this._viewState.getSaveData(id));
  }

  private _isCardFieldEditable(id: number, fieldRefName: string): boolean {
    var isEditable: boolean = false;

    if (fieldRefName) {
      var fieldSettings = this._getCardFieldSetting(id, fieldRefName);
      // if target is a rendered editable field, and if current tile is in an editable state
      isEditable = this._isCardEditable(id) && this._model.field(id, fieldRefName, fieldSettings).isEditable();
    }
    return isEditable;
  }

  private _shouldRowBeExpanded(classificationData: IClassificationData, peopleChildMap?: IDictionaryStringTo<number[]>): boolean {
    if (peopleChildMap) {
      let person: string = classificationData.pivotKey;
      let childIds: number[] = peopleChildMap[person.toUpperCase()] || [];

      let matchesFilter: boolean = childIds.length === 0 || childIds.some(id => this._model.matchesFilter(id));
      if (matchesFilter) {
        return true;
      }
      return false;
    }
    else {
      /*
       * Auto Collapse Logic
       *
       * If parent is in a completed state, always collapsed
       * If there is a filter, and no child items match filter, then collapsed
       */

      let parentId = classificationData.pivotKey;

      if (Utils_String.equals(parentId, TaskBoardModel.NULL_PIVOT_KEY, true) ||
        Utils_String.equals(parentId, TaskBoardModel.NEW_ROW_PIVOT_KEY, true)) {
        parentId = 0;
      }

      if (parentId === 0 ||
        !this._model.isStateComplete(parentId)) {
        if (this._model.getFilterManager() == null && this._model.getFilter() === null) {
          return true;
        }

        let childIds: number[] = this._model.getChildWorkItemIdsByParent(parentId);
        if (!childIds) {
          return true;
        }

        let matchesFilter: boolean = childIds.length === 0 || childIds.some(id => this._model.matchesFilter(id));
        if (matchesFilter) {
          return true;
        }
      }
      return false;
    }
  }

  /**
  * add a row to the table
  * 
  * @param classification the classification of the element
  * @param peopleChildMap the children work items of each user row
  * @param appendRow whether the row should be added to the begining or end of the table
  */
  private _addRow(classification: IClassificationData, peopleChildMap?: IDictionaryStringTo<number[]>, appendRow: boolean = true): void {

    Diag.Debug.assertParamIsObject(classification, "classification");

    let $row: JQuery;
    let expanded: boolean = this._shouldRowBeExpanded(classification, peopleChildMap);
    if (expanded) {
      $row = this._buildDisplayRow(classification, this._model.stateKeys, peopleChildMap);
    }
    else {
      $row = this._buildSummaryRow(classification, this._model.stateKeys);
    }

    if (appendRow) {
      this._$tableBody.append($row);
    }
    else {
      this._$tableBody.prepend($row);
    }

    // Ideally we would populate the row before rendering, but custom layout requires it
    if (expanded && this._isEffectiveCustomLayout()) {
      this._populateRow($row, peopleChildMap);
    }
  }

  /**
   * Build the heading row of the taskboard.
   * 
   * @param states The states to display in the taskboard.
   */
  private _buildHeadingRow(states: string[]): JQuery {
    Diag.Debug.assert($.isArray(states), "states is expected to be an array");
    Diag.Debug.assert(states.length > 0, "states is expected to have at least one element");

    function addThElement(text) {
      var $th = $(domElem("th", "taskboard-cell"))
        .appendTo($headRow)
        .data(TaskBoardView.DATA_WIT_STATE, text);

      if (text) {
        $(domElem("span", "witState")).text(Utils_String.toSentenceCase(text)).appendTo($th);
        $(domElem("span", CardControls.FieldRendererHelper.REMAINING_WORK_CLASS)).text('').appendTo($th);
      }

      return $th;
    }

    var $headRow = $(domElem("tr", TaskBoardView.ROW_CLASS));
    // We haven't rendered the rows yet so we don't know the expanded/collapse state. Attach container that will hold Expand/Collapse icon, and add
    // appropriate image and text after rows are rendered and we know the state.
    var $collapseExpandAllIconContainer = $(domElem("button", TaskBoardView.TASKBOARD_COLLAPSE_BUTTON)).attr('id', TaskBoardView.TASKBOARD_COLLAPSE_BUTTON);

    // The row header's first column actually takes the space of the first two columns (taskboard-expander and taskboard-parent).  
    // This is so the expand/collapse all button is one element and the expand icon aligns on the left. 
    // We do not add a taskboard-parent column to this row. 
    $(domElem("th", TaskBoardView.EXPANDER_CLASS + " header-row"))
      .append($collapseExpandAllIconContainer)
      .appendTo($headRow);

    // Determine column widths. The widths of the n columns we set add up to 100% even though we have n+1
    // columns (the first represents the parent work items). The first column has a fixed pixel width
    // and the remaining columns get split evenly over the rest of the table's width.
    var columnWidthInPercentage = 100 / (states.length);

    for (var i = 0; i < states.length; i += 1) {
      addThElement(Utils_String.htmlEncode(states[i]))
        .css("width", String(columnWidthInPercentage) + '%')
        .attr("id", TaskBoardView.TASKBOARD_TABLE_HEADER_ID + "_s" + i);
    }

    return $headRow;
  }

  /**
   * create a new work item tile of the given type and displays it on the board
   * 
   * @param workItemType The work item type to be created.
   * @param parentId The work item id of the parent under which new work item has to be created
   */
  public _addWorkItem(workItemType: string, parentId: number) {
    this._recordAddItemTelemetry(workItemType);
    // create new tile
    this._raiseCreateNewWorkItem(workItemType, parentId);
  }

  /**
   * Gets an id to use for row (Creates one if one does not already exist)
   * @param classificationData
   */
  private _getRowId(classificationData: IClassificationData): number {
    let pivotKey = classificationData.pivotKey;
    if (!this._rowPivotKeyMap[pivotKey]) {
      // Add mapping for Pivot Key to Row ID.
      this._rowPivotKeyMap[pivotKey] = ++this._maxRowId;
    }
    return this._rowPivotKeyMap[pivotKey]
  }

  /**
   * Gets the summary row for the row id
   * @param id - id of the row
   */
  private _getSummaryRow(id: number): JQuery {
    let $row = $(`#${TaskBoardView.SUMMARY_ROW_ID_PREFIX + id}`, this._$tableBody);
    if ($row.length > 0) {
      return $row;
    }
    return null;
  }

  /**
   * Gets the display row for the row id
   * @param id - id of the row
   */
  private _getDisplayRow(id: number): JQuery {
    let $row = $(`#${TaskBoardView.ROW_ID_PREFIX + id}`, this._$tableBody);
    if ($row.length > 0) {
      return $row;
    }
    return null;
  }

  private _buildSummaryRow(classificationData: IClassificationData, states: string[]): JQuery {
    let contentTemplate: string;

    const dropItemHandler = Utils_Core.curry(this._dropItem, this);
    const parentID = classificationData.templateId;
    const pivotKey = classificationData.pivotKey;
    const id: number = this._getRowId(classificationData);

    if (this._classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION) {
      var $collapsedTileGutter = $(TaskBoardView.COLLAPSED_TILE_GUTTER);
      if (parentID == 0) {
        WorkItemTypeIconControl.renderWorkItemTypeIcon($collapsedTileGutter.get(0), null,
          {
            color: WorkItemTypeColorAndIcons.DEFAULT_UNPARENTED_WORKITEM_COLOR,
            icon: WorkItemTypeColorAndIcons.DEFAULT_UNPARENTED_WORKITEM_BOWTIE_ICON
          });
      }
      else {
        const cardContextTemp = this._getCardContext(parentID);
        WorkItemTypeIconControl.renderWorkItemTypeIcon($collapsedTileGutter.get(0), cardContextTemp.workItemTypeName, cardContextTemp.projectName);
      }
      contentTemplate = Utils_String.format(this._summaryContentTemplate[this._classificationType], $collapsedTileGutter[0].outerHTML);
    }
    else {
      contentTemplate = this._summaryContentTemplate[this._classificationType];
    }

    const $summaryRow = $(Utils_String.format(
      TaskBoardView.SUMMARY_ROW_TEMPLATE,
      id,
      states.length + 1,
      TaskboardResources.Taskboard_MaximizeRow,
      Utils_String.format(
        TaskboardResources.Taskboard_MaximizeRow_AriaLabel,
        this._getAriaLabelSuffix(parentID))));

    // Compose and inject the row's content.
    const $content: JQuery = this._applyTemplate(parentID, contentTemplate);
    $(".tbPivotItem", $summaryRow).append($content);

    $summaryRow.droppable({
      accept: function ($draggable) { return !$draggable.hasClass("parentTbTile"); },  // summary row should only accept child work item type tiles on the taskboard
      scope: TFS_Agile.DragDropScopes.WorkItem,
      hoverClass: TaskBoardView.HIGHLIGHTED_DROPPABLE_CLASS,
      drop: dropItemHandler,
      tolerance: 'pointer'
    });
    $summaryRow.data(TaskBoardView.DATA_PIVOT_KEY, pivotKey)
      .data(TaskBoardView.DATA_CLASSIFICATION_DATA, classificationData);

    // Attach Expand
    $summaryRow
      .bind("click.VSS.Agile", () => {
        this._toggleRowVisibilityAndUpdateCollapseAllButton(classificationData);
      })
      .bind("keydown.VSS.Agile", (e: JQueryKeyEventObject) => {
        if (e.keyCode === KeyCode.ENTER ||
          e.keyCode === KeyCode.RIGHT) {

          this._toggleRowVisibilityAndUpdateCollapseAllButton(classificationData);

          let $row = this._getDisplayRow(id);
          $row.find(".bowtie-toggle-tree-expanded").focus();

          e.preventDefault();
        }
        else {
          this._onRowExpandIconKeyDown(e);
        }
      });

    // Add the summary info (ex: warning icon, remaining work, how many inprogress, etc.)
    this._refreshSummaryRow($summaryRow, pivotKey);
    return $summaryRow.css("display", "");
  }

  /**
   * Build the row contents.
   *     Note that for accessibility purposes we are using the axis & headers attributes
   *     to "link" table cells to their parent row and column header. We accomplish
   *     this by giving each table header cell an id value (i.e. [taskboardid]_s[index])
   *     and ensure that cells intersecting these headers have the appropriate axis
   *     and header attributes that match.
   * @param classificationData Classification information for the row.
   * @param states The states of the taskboard (new, queued, active, closed, etc)
   * @param peopleChildMap Optional people to children map
   */
  private _buildDisplayRow(classificationData: IClassificationData, states: string[], peopleChildMap?: IDictionaryStringTo<number[]>): JQuery {
    var $row: JQuery;
    var parentID = classificationData.templateId;
    var pivotKey = classificationData.pivotKey;
    var dropItemHandler = Utils_Core.curry(this._dropItem, this);
    var cancelDropHandler = Utils_Core.curry(this.cancelDrop, this);

    let id: number = this._getRowId(classificationData);

    function addTdElement($elem: JQuery) {

      var td = $(domElem("td", "taskboard-cell"));

      if ($elem) {
        $elem.appendTo(td);
      }

      td.appendTo($row);

      return td;
    }

    // Create the row.
    $row = $(domElem("tr", TaskBoardView.ROW_CLASS))
      .addClass("taskboard-content-row")
      .attr("id", TaskBoardView.ROW_ID_PREFIX + id)
      .data(TaskBoardView.DATA_PIVOT_KEY, pivotKey)
      .data(TaskBoardView.DATA_CLASSIFICATION_DATA, classificationData);

    $row.bind("mouseenter", (e: JQueryKeyEventObject) => {
      $(e.currentTarget).find("." + TaskBoardView.ADD_NEW_CARD_ICON_CLASS).addClass("enabled");
      $(e.currentTarget).addClass("hover");
    }).bind("mouseleave", (e: JQueryKeyEventObject) => {
      var add_card = $(e.currentTarget).find(".board-add-card");
      if (!add_card.is(':focus')) {
        add_card.find("." + TaskBoardView.ADD_NEW_CARD_ICON_CLASS).removeClass("enabled");
      }
      $(e.currentTarget).removeClass("hover");
    });

    // Add the expander column. Explicitly leave out taskboard-cell class for the column so we don't try calculating remaining work for it.
    var $expandedIcon = $(domElem("button", "bowtie-icon bowtie-toggle-tree-expanded"))
      .attr(
        "aria-label",
        Utils_String.format(
          TaskboardResources.Taskboard_MinimizeRow_AriaLabel,
          this._getAriaLabelSuffix(parentID)))
      .attr("title", TaskboardResources.Taskboard_MinimizeRow);

    var $tdMin = $(domElem("td", TaskBoardView.EXPANDER_CLASS))
      .addClass(TaskBoardView.HIGHLIGHT_ON_ROW_CHANGE_CLASS)
      .append($expandedIcon)
      .appendTo($row);

    // Add the row heading column.
    addTdElement(this._buildRowHeadingContents(parentID))
      .addClass("taskboard-parent")
      .addClass(TaskBoardView.HIGHLIGHT_ON_ROW_CHANGE_CLASS)
      .attr("id", TaskBoardView.TASKBOARD_TABLE_BODY_ID + "_p" + parentID);

    // attach collapse
    $tdMin.bind("click.VSS.Agile", () => {
      this._toggleRowVisibilityAndUpdateCollapseAllButton(classificationData);
    })
      .bind("keydown.VSS.Agile", (e: JQueryKeyEventObject) => {
        if (e.keyCode === KeyCode.ENTER ||
          e.keyCode === KeyCode.LEFT) {

          this._toggleRowVisibilityAndUpdateCollapseAllButton(classificationData);

          let $summaryRow = this._getSummaryRow(id);
          $summaryRow.find(".bowtie-toggle-tree-collapsed").focus();

          e.preventDefault();
        }
        else {
          this._onRowExpandIconKeyDown(e);
        }
      });

    // Add the entry for this row's pivot key in the cell lookup table
    // so we can add state entries to it.
    this._cellLookupTable[pivotKey] = {};
    var $td: JQuery;

    for (var i = 0, l = states.length; i < l; i += 1) {

      // Add the column for the state.
      $td = addTdElement(null)
        .droppable({
          accept: this._acceptTileHandler,
          scope: TFS_Agile.DragDropScopes.WorkItem,
          drop: dropItemHandler,
          cancelDrop: cancelDropHandler,
          tolerance: 'pointer',
          over: Utils_Core.delegate(this, this._changeHoveredRow),
          out: Utils_Core.delegate(this, this._removeAllHighlighting)
        } as JQueryUI.DroppableOptions)
        .attr("axis", TaskBoardView.TASKBOARD_TABLE_BODY_ID + "_s" + i)
        .data(TaskBoardView.DATA_WIT_STATE, states[i])
        .data(TaskBoardView.DATA_PIVOT_KEY, pivotKey);

      if (this._isEffectiveCustomLayout()) {
        this._createCustomColumnsInCell($td, this._customColumnCount);
      }

      // Add the cell to the lookup table by pivot key and by state so the
      // cell can be looked up when placing tiles.
      this._cellLookupTable[pivotKey][states[i]] = $td;

    }

    // Add the '+ New Card' control to the first column if we are in parent classification
    if (this._isAdvancedBacklogManagement() &&
      this._classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION &&
      pivotKey !== TaskBoardModel.NEW_ROW_PIVOT_KEY) {
      this.addAddNewItem(parentID, pivotKey, states[0]);
    }

    // Custom Layout requires the row to be rendered before population 
    if (!this._isEffectiveCustomLayout()) {
      this._populateRow($row, peopleChildMap);
    }

    return $row;
  }

  private _getAriaLabelSuffix(parentID: number): string {
    if (Utils_String.equals(this._classificationType, "ParentClassification", true)) {
      return this._getFormattedFieldValue(parentID, DatabaseCoreFieldRefName.Title);
    }

    let suffix: string = this._getFormattedFieldValue(parentID, DatabaseCoreFieldRefName.AssignedTo);
    if (!suffix) {
      return WITResources.AssignedToEmptyText;
    }
    return suffix;
  }

  private _isEffectiveCustomLayout(): boolean {
    // Check if we need to use custom layout
    // i.e. if the window size allows more than one subcolumns in the cells
    //    If only one virtual column needs to be created within each cell we needn't use custom layout
    //    (Custom layout is more performance intensive, so in the above case we fall back to non-custom layout approach)
    return this._customColumnCount > 1;
  }

  /**
   * Tells whether parents operation should be enabled for given parent id or not
   */
  public _supportsPivotOperations(parentId: number): boolean {
    Diag.Debug.assertParamIsNumber(parentId, "id");

    var provider = this._model._getClassificationProvider(this._classificationType);
    return provider.supportsPivotOperations() && provider.isValidPivot(parentId);
  }

  /**
   * Logs telemetry if the user is trying to add a work item on the board
   */
  private _recordAddItemTelemetry(workItemType: string) {
    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
      CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
      CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATION_TASKBOARD_ADDNEWITEM, {
        "WorkItemType": workItemType
      }));
  }

  /**
   * sets warning for the summary row if the parent work item is complete, but has active child tasks
   * 
   * @param $summaryRow The row to set warning on
   * @param parentID WorkItem id corresonding to the pivot row
   */
  private _checkAndSetActiveChildrenWarning($summaryRow: JQuery, parentID: number) {

    var showWarning = false;
    if (this._classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION) {
      if (this._model.isStateComplete(parentID) && this._model.hasActiveChildItems(parentID)) {
        showWarning = true;
      }
      this._setSummaryRowWarning($summaryRow, parentID, showWarning);
    }
  }

  /**
   * sets the visibility of ActiveChildren warning on the summary row
   * 
   * @param $summaryRow The row to set warning on
   * @param parentID WorkItem id corresonding to the pivot row
   * @param showWarning whether the warning should be displayed or not
   */
  private _setSummaryRowWarning($summaryRow: JQuery, parentID: number, showWarning: boolean): void {

    Diag.Debug.assertParamIsObject($summaryRow, "$summaryRow");
    var $warningSpan = $(".bowtie-status-warning", $summaryRow);
    var warningToolTip, workItemTypeName, workItemState;

    if ($warningSpan && $warningSpan.length === 1) {

      if (showWarning) {
        //update the tooltip for the warning icon 
        workItemTypeName = this._model.getFieldValue(parentID, DatabaseCoreFieldRefName.WorkItemType);
        workItemState = this._model.getFieldValue(parentID, DatabaseCoreFieldRefName.State);
        warningToolTip = Utils_String.format(TaskboardResources.ActiveChildWorkItemsWarning, workItemTypeName, workItemState);

        RichContentTooltip.add(warningToolTip, $warningSpan);
      }
      //show / hide the warning 
      $warningSpan.css("display", showWarning ? "" : "none");
    }
  }

  /**
   * Changes the TaskBoardView's current hovered droppable to the one that's currently being used
   * 
   * @param view The TaskBoardView
   * @param event The originating dragOver() event
   * @param ui The JQuery UI object. ui.draggable is our draggable
   */
  private _changeHoveredRow(event, ui): void {
    this._currentHoveredDroppable = $(event.target);
  }

  /**
   * Removes all highlighting from the taskboard table
   * 
   * @param view The TaskBoardView
   * @param event The originating event
   * @param ui The JQuery UI object
   */
  private _removeAllHighlighting(event, ui): void {
    var $droppable = $(event.target);

    // Remove Droppable Highlight + Border highlights
    this._removeDroppableBorderHighlighting($droppable);

    // This delay ensures that the over event (_changeHoveredRow) occurs before
    // the out event, so that the _currentHoveredDroppable is not stale
    Utils_Core.delay(this, 0, () => {
      // Only remove the parent/expander highlighting if we moved rows
      if (this._currentHoveredDroppable && (this._currentHoveredDroppable[0] === $droppable[0] || this._getRowIdFromDroppable(this._currentHoveredDroppable) !== this._getRowIdFromDroppable($droppable))) {
        this._removeParentHighlighting($droppable);
      }
    });
  }

  /**
   * Removes highlighing from droppable and borders
   * 
   * @param $droppable The droppable to remove highlighing from
   */
  private _removeDroppableBorderHighlighting($droppable: JQuery): void {
    Diag.Debug.assertParamIsJQueryObject($droppable, "$droppable");

    $droppable.removeClass(TaskBoardView.HIGHLIGHTED_DROPPABLE_CLASS);
    $(TaskBoardView.ROW_CSS_SELECTOR, this._$container).each(function (i, row) {
      var $row = $(row);
      $row.children().removeClass(TaskBoardView.HIGHLIGHTED_BORDER_CLASS);
    });
  }

  /**
   * Removes highlighing from parent and expander
   * 
   * @param $droppable The droppable to remove highlighing from
   */
  private _removeParentHighlighting($droppable: JQuery): void {
    Diag.Debug.assertParamIsJQueryObject($droppable, "$droppable");

    $droppable.siblings("." + TaskBoardView.HIGHLIGHT_ON_ROW_CHANGE_CLASS).removeClass(TaskBoardView.HIGHLIGHTED_PARENT_CLASS);
  }

  /**
   * Highlights the specific row (parent+borders) that's in the draggable's data
   * 
   * @param view The TaskboardView Object
   * @param event The originating jQuery event
   * @param ui The jQuery UI Object.
   */
  private _highlightRow(view: TaskBoardView, event, ui): void {
    var $draggable = $(this),
      taskId,
      $currentRow,
      currentRowId,
      toAxisId,
      $currentDroppable = view._currentHoveredDroppable,
      $paintedDroppable = view._currentPaintedDroppable,
      fromPivot,
      toPivot;

    // Make sure the helper display has been updated
    ui.helper.css("display", "block");

    // Only run if there's no row painted, or if we have stale data painted
    if (!$paintedDroppable || $paintedDroppable !== $currentDroppable) {
      // Highlight only if there is a droppable that should be painted
      if ($currentDroppable) {
        taskId = view.getIdNumberFromElement($draggable);
        $currentRow = $currentDroppable.parents(TaskBoardView.ROW_CSS_SELECTOR);
        currentRowId = view.getIdNumberFromElement($currentRow);
        fromPivot = view._model.getPivotFieldValue(taskId, view._classificationType);
        toPivot = $currentDroppable.data(TaskBoardView.DATA_PIVOT_KEY);
        toAxisId = view._getAxisId($currentDroppable, "axis");

        // Set the painted-droppable data to the current droppable
        view._currentPaintedDroppable = $currentDroppable;

        // Highlights the droppable
        $currentDroppable.addClass(TaskBoardView.HIGHLIGHTED_DROPPABLE_CLASS);

        // Highlight the current row
        if (toPivot !== fromPivot) {
          $currentRow.children("." + TaskBoardView.HIGHLIGHT_ON_ROW_CHANGE_CLASS).addClass(TaskBoardView.HIGHLIGHTED_PARENT_CLASS);

          view._addBorderHighlighting($currentRow.children(), "axis", toAxisId);

          if (currentRowId === 1) {
            var $headerRow = $('thead', view._$container).find(TaskBoardView.ROW_CSS_SELECTOR);
            view._addBorderHighlighting($headerRow.children(), "id", toAxisId);
          } else {
            view._addBorderHighlighting($('#taskboard-row-' + (currentRowId - 1), view._$container).children(), "axis", toAxisId);
          }
        }
      }
    }
  }

  /**
   * Used to add the highlight on the row borders while hovering
   * 
   * @param $elementArray The array of elements to apply the highlighting to
   * @param attributeName The name of the attribute to determine where to stop highlighting
   * @param toAxisId The maximum ID of the cell to highlight
   */
  private _addBorderHighlighting($elementArray: JQuery, attributeName: string, toAxisId: number): void {
    Diag.Debug.assertParamIsObject($elementArray, "$elementArray");
    Diag.Debug.assertParamIsString(attributeName, "attributeName");
    Diag.Debug.assertParamIsNumber(toAxisId, "toAxisId");

    var view = this;

    $elementArray.filter(function (index) {
      return view._getAxisId($(this), attributeName) <= toAxisId;
    }).addClass(TaskBoardView.HIGHLIGHTED_BORDER_CLASS);
  }

  /**
   * Used to retrieve the axis ID from an element.
   * 
   * @param $element The element where the ID is extracted from
   * @param attributeName The name of the attribute used to extract the ID from
   */
  private _getAxisId($element: JQuery, attributeName: string): number {
    Diag.Debug.assertParamIsObject($element, "$element");
    Diag.Debug.assertParamIsString(attributeName, "attributeName");

    // Get the number of the attribute
    var attribute = $element.attr(attributeName),
      attributeSplit,
      result = 0;

    if (typeof attribute !== "undefined") {
      attributeSplit = attribute.split(TaskBoardView.AXIS_ID_SEPARATOR);
      Diag.Debug.assertIsString(attributeSplit[1], "The element's Axis Attribute did not have enough results post-split");
      Diag.Debug.assertIsNumber(Number(attributeSplit[1]), "The Axis Attribute post-split did not resolve into a number");
      result = Number(attributeSplit[1]) || 0;
    }

    return result;
  }

  /**
   * Get Id encoded in id property in element
   * 
   * @param $element the element to extract id from
   */
  private _getIdString($element: JQuery): string {
    let idString: string = "",
      index: number;
    if ($element && $element[0]) {
      idString = $element[0].id;
    }
    index = idString.lastIndexOf("-");

    if (index > 0 && idString[index - 1] === "-") {
      //handle -ve id
      return idString.substring(index);
    }
    return idString.substring(index + 1);
  }

  /**
   * Gets the row ID associated with the provided pivot key.
   */
  private _getRowIdFromPivotKey(pivotKey: number) {

    return this._rowPivotKeyMap[pivotKey];
  }

  /**
   * Get Id encoded in id property in element
   * 
   * @param $element the element to extract id from
   */
  public getIdNumberFromElement($element: JQuery): number {

    return Number(this._getIdString($element)) || 0;
  }

  /**
   * Get .clickable-title span present within a tile element
   * 
   * @param $tile the tile to extract title span from
   */
  private _getClickableTitleSpan($tile: JQuery): JQuery {
    var $titleContainer = $('.' + CardControls.FieldRendererHelper.ID_TITLE_CONTAINER_CLASS, $tile);
    var $title = $(TaskBoardView.TITLE_SELECTOR, $titleContainer);
    return $('span.' + CardControls.FieldRendererHelper.CLICKABLE_TITLE_CLASS, $title);
  }

  private _getOrderAttribute($tile: JQuery): number {
    /// <summary>Gets the order attribute value set on the given tile</summary>
    /// <param name="$tile" type="JQuery />

    return Number($tile.attr(TaskBoardView.ATTR_TILE_ORDER));
  }

  /**
   * Get the Id from the row of the droppable
   * 
   * @param $droppable The droppable
   */
  private _getRowIdFromDroppable($droppable: JQuery): number {

    Diag.Debug.assertParamIsJQueryObject($droppable, "$droppable");

    return this.getIdNumberFromElement($droppable.parent(TaskBoardView.ROW_CSS_SELECTOR));
  }

  private _isRowCollapsed($row: JQuery): boolean {
    return $row.css("display") === "none";
  }

  /**
   * Toggle the visibility of the row and it's summary row. Additionally, update the state of the expand/collapse all toggle. 
   * This should be used for single row updates.  If you're updating multiple rows do not use this call.  For perf reasons please
   * call _toggleRowVisibility directly for all rows, and then update the expand button. 
   * 
   * @param classificationData - Information on the row to toggle
   * @param peopleChildMap 
   */
  public _toggleRowVisibilityAndUpdateCollapseAllButton(classificationData: IClassificationData, peopleChildMap?: IDictionaryStringTo<number[]>) {
    this._toggleRowVisibility(classificationData, peopleChildMap);
    let areAllCollapsed = this._areAllRowsCollapsed();
    this._toggleExpandAllButton(areAllCollapsed);
  }

  /**
   * Toggle the visibility of the row and it's summary row.
   * 
   * @param classificationData - Information on the row to toggle
   * @param peopleChildMap - People child map used to construct display rows
   */
  // public for unit testing
  public _toggleRowVisibility(classificationData: IClassificationData, peopleChildMap?: IDictionaryStringTo<number[]>): boolean {

    let id: number = this._getRowId(classificationData);
    let $row = this._getDisplayRow(id);
    let $summaryRow = this._getSummaryRow(id);

    if (!$row && !$summaryRow) {
      Diag.Debug.fail("$row and $summaryRow both do not exist");
    }

    let isCollapsed: boolean = $row && this._isRowCollapsed($row);

    if (!$row) {
      isCollapsed = true;
      let map: IDictionaryStringTo<number[]> = peopleChildMap || this._getPeopleChildMap();
      $row = this._buildDisplayRow(classificationData, this._model.stateKeys, map);
      $summaryRow.before($row);
      if (this._isEffectiveCustomLayout()) {
        this._populateRow($row, map);
      }
    }

    if (!$summaryRow) {
      isCollapsed = false;
      $summaryRow = this._buildSummaryRow(classificationData, this._model.stateKeys);
      $summaryRow.css("display", "none");
      $row.after($summaryRow);
    }

    let pivotKey = $row.data(TaskBoardView.DATA_PIVOT_KEY);

    if (!isCollapsed) {
      this._refreshSummaryRow($summaryRow, pivotKey);
    }

    // Since the expand / collapse buttons are completely different elements,
    // We need to have logic to maintain focus on the expand/collapse buttons
    // when toggling between expanded and collapsed states.
    // The below code asigns focus to the expand button after a collapse
    // action if the collapse button had the focus before the collapse action 
    // (and vice-versa)
    const expandedBtn = $row.find(".bowtie-toggle-tree-expanded");
    const collapsedBtn = $summaryRow.find(".bowtie-toggle-tree-collapsed");
    const fromFocus = isCollapsed ? collapsedBtn[0] : expandedBtn[0];
    const toFocus = isCollapsed ? expandedBtn[0] : collapsedBtn[0];
    const setFocus = fromFocus && fromFocus == document.activeElement;

    $row.css("display", isCollapsed ? "" : "none");
    $summaryRow.css("display", isCollapsed ? "none" : "");

    if (setFocus && toFocus) {
      toFocus.focus();
    }

    return isCollapsed;
  }


  /**
   * Refresh the summary row
   * 
   * @param $summaryRow The row to refresh
   * @param pivotKey the pivot key for the summary row
   */
  private _refreshSummaryRow($summaryRow: JQuery, pivotKey: any): void {

    Diag.Debug.assertParamIsObject($summaryRow, "$summaryRow");
    Diag.Debug.assert($summaryRow.length == 1, "$summaryRow length not valid");

    //if we are toggling to summary view in parent classification set/unset warning on summary row
    //based on current state of pivot and existence of not-complete children
    if (this._classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION && pivotKey !== TaskBoardModel.NULL_PIVOT_KEY) {
      this._checkAndSetActiveChildrenWarning($summaryRow, pivotKey);
    }
    this._updateSummaryRowTotal($summaryRow, pivotKey);
  }

  /**
   *     Updates the remaining work rollup by metastate for the summaryRow.
   * 
   * @param $summaryRow The summary row which needs to be updated
   * @param pivotKey the pivot key for the summary row
   */
  private _updateSummaryRowTotal($summaryRow: JQuery, pivotKey: any): void {

    if (!this._remainingWorkRollUp) {
      this._remainingWorkRollUp = this._model.calculateRollup(this._classificationType);
    }

    var $witStatesSummary = $summaryRow.find('.witStateSummary').eq(0);

    //clear the existing summary rollup
    $witStatesSummary.empty();

    var rollupMetaStateData = this._remainingWorkRollUp.pivotRollupByMetaState[pivotKey];
    if (rollupMetaStateData) {
      //include rollup data for proposed and in progress metastates    
      this._updateWitStateSummary($witStatesSummary, WorkItemStateCategory.Proposed, rollupMetaStateData.rollup[WorkItemStateCategory.Proposed]);
      this._updateWitStateSummary($witStatesSummary, WorkItemStateCategory.InProgress, rollupMetaStateData.rollup[WorkItemStateCategory.InProgress]);
    }
  }

  /**
   *     Adds the remaining work rollup for a particular metastate (proposed/inprogress) to the summaryRow.
   * 
   * @param $witStatesSummary The summary row child div inside which roll up information needs to be added
   * @param witMetaState the metastate for which rollup information is being included (enum from TFS_OM.ProjectProcessConfiguration.StateType)
   * @param witMetaStateRollupData The pivot rollup for a metastate
   */
  private _updateWitStateSummary($witStatesSummary: JQuery, witMetaState: WorkItemStateCategory, witMetaStateRollupData: IMetaStateRollupData) {
    Diag.Debug.assert($witStatesSummary.length == 1, "$witStatesSummary length not valid");

    if (witMetaStateRollupData &&
      (witMetaState === WorkItemStateCategory.Proposed ||
        witMetaState === WorkItemStateCategory.InProgress)
    ) {

      var witStateCount = witMetaStateRollupData.workItemCount,
        witStateEffort = witMetaStateRollupData.remainingWork,
        stateSummaryString = '', summaryWork = '', $witStateSpan: JQuery,
        witStateSummaryFormats: IDictionaryNumberTo<string> = {};

      witStateSummaryFormats[WorkItemStateCategory.Proposed] = TaskboardResources.NotStartedWorkItems;
      witStateSummaryFormats[WorkItemStateCategory.InProgress] = TaskboardResources.InProgressWorkItems;

      //if there are some items for the specific metastate, include them to the summary
      if (witStateCount) {
        stateSummaryString = Utils_String.format(witStateSummaryFormats[witMetaState], witStateCount);

        //format the remaining work to appropriate format: e.g. (9 h)
        var value = FormatUtils.formatRemainingWorkForDisplay(witStateEffort);
        value = this._model.formatRemainingWork(value);
        if (value && value !== '') {
          summaryWork = Utils_String.format(TaskboardResources.RemainingWork, value);
        }

        $witStateSpan = $(TaskBoardView.WORK_SUMMARY);
        $witStateSpan.closest('.work-item-count').eq(0).text(stateSummaryString);
        $witStateSpan.closest('.' + CardControls.FieldRendererHelper.REMAINING_WORK_CLASS).eq(0).text(summaryWork);

        $witStatesSummary.append($witStateSpan);
      }
    }
  }

  /**
   *     Determines if the provided item should be accepted by the droppable (this).
   * 
   * @param $taskboardCell The taskboard cell that we are evaluating acceptance for
   * @param $tile The tile being dragged.
   */
  private _acceptTile($taskboardCell: JQuery, $tile: JQuery): boolean {

    // Handle vertical moves. If it's in the same column (states are the same):
    //      - Moved down rows (pivots are different), accept
    //      - Same row (pivots are the same), reject
    var workItemId = this.getIdNumberFromElement($tile);
    var currentState = this._model.getStateFieldValueAsKey(workItemId);
    var state = $taskboardCell.data(TaskBoardView.DATA_WIT_STATE);

    if ($tile.hasClass("parentTbTile")) {
      return false; // Do not accept Requirements on the task board columns
    }

    if (currentState === state) {
      var fromPivot = this._model.getPivotFieldValue(workItemId, this._classificationType);
      var toPivot = $taskboardCell.data(TaskBoardView.DATA_PIVOT_KEY);
      return (fromPivot !== toPivot);
    } else {
      // We aren't moving vertically, so we need to check if transition is valid
      // Get the valid transitions for the work item.
      var transitions = this._model.getValidTransitions(workItemId);
      if (transitions) {
        // Get the set of transitions that are valid from the current state.
        var currentStateTransitions = transitions[currentState];
        if (currentStateTransitions) {
          // If the state is contained in the transitions, it is valid.
          return Utils_Array.contains(currentStateTransitions, state, Utils_String.ignoreCaseComparer);
        }
      }
      else {
        //If transition data is not available then allow the transition
        return true;
      }
    }

    return false;
  }

  /**
   *     Builds the heading column contents for a row.
   * 
   * @param workItemID Id of the workitem to use for looking up field values
   */
  private _buildRowHeadingTile(workItemID: number): JQuery {

    Diag.Debug.assertParamIsNumber(workItemID, "workItemID");

    var $tile: JQuery = this._findTile(workItemID);
    if ($tile) {
      return $tile;
    }

    return this._createTile(workItemID);
  }

  /**
   *     Builds the heading column contents for a row.
   * 
   * @param workItemID Id of the workitem to use for looking up field values
   */
  private _buildRowHeadingContents(workItemID: number): JQuery {

    Diag.Debug.assertParamIsNumber(workItemID, "workItemID");
    if (this._classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION) {
      return this._buildRowHeadingTile(workItemID);
    }
    else {
      var $content = this._applyTemplate(workItemID, this._parentContentTemplate[this._classificationType]);
      return $("<div>").addClass("tbPivotItem").append($content);
    }
  }

  private _getPeopleChildMap(): IDictionaryStringTo<number[]> {
    if (Utils_String.equals(this._classificationType, TaskboardGroupBy.PEOPLE_CLASSIFICATION, true)) {
      return this._model.getPeopleChildrenLookupTable();
    }
    return null;
  }

  private _populateRow($row: JQuery, peopleChildMap?: IDictionaryStringTo<number[]>) {
    let childIds: number[];
    let classificationData: IClassificationData = $row.data(TaskBoardView.DATA_CLASSIFICATION_DATA);

    if (Utils_String.equals(classificationData.pivotKey, TaskBoardModel.NEW_ROW_PIVOT_KEY, true)) {
      // No-op for a new parent row. There should not be children.
      return;
    }

    if (peopleChildMap) {
      childIds = peopleChildMap[(<string>classificationData.pivotKey).toUpperCase()] || [];
    }
    else {
      let key: number;
      if (!classificationData ||
        Utils_String.equals(classificationData.pivotKey, TaskBoardModel.NULL_PIVOT_KEY, true)) {
        key = 0;
      }
      else {
        key = classificationData.pivotKey;
      }
      childIds = this._model.getChildWorkItemIdsByParent(key);
    }

    // Add the items to the table.
    for (let id of childIds) {
      if (!this._model.isItemVisible(id)) {
        continue;
      }
      // If we already have a tile, position it.
      var $tile = this._findTile(id);
      if ($tile) {
        this._positionTile($tile, id);
      }
      else {
        // Create a new tile.
        this._createTile(id);
      }
    }
  }

  /**
   *     Add all of the child work items to the taskboard.  If there are a large
   *     number of work items to be added, this method will yield control to the browser
   *     and schedule processing of the subsequent items.
   */
  private _populateTaskboard(): void {
    let $rows = this._getTileRows();
    let map: IDictionaryStringTo<number[]> = this._getPeopleChildMap();
    $rows.each((i: number, row: Element) => {
      this._populateRow($(row), map);
    });
  }

  /**
   * Setup the content templates.
   */
  private _setupContentTemplates(): void {

    var icon_warning = Utils_String.format(TaskBoardView.ICON_WARNING);

    this._parentContentTemplate.requirements = Utils_String.format(TaskBoardView.PARENT_CLASSIFICATION_CONTENT_TEMPLATE);
    this._parentContentTemplate.people = Utils_String.format(TaskBoardView.PEOPLE_CLASSIFICATION_CONTENT_TEMPLATE);
    this._summaryContentTemplate.requirements = Utils_String.format(TaskBoardView.PARENT_CLASSIFICATION_SUMMARY_TEMPLATE, "{0}", icon_warning);
    this._summaryContentTemplate.people = TaskBoardView.PEOPLE_CLASSIFICATION_SUMMARY_TEMPLATE;
  }

  /**
   *     Called when dragging an item is started.
   *     The function raises the EVENT_WORK_ITEM_DRAGGING event.
   *     'this' is the DOM element that started being dragged (not the clone)
   * 
   * @param view The owning view
   * @param event The originating startdrag() event
   * @param ui The jQuery UI draggable helper
   */
  private _startDrag(view: TaskBoardView, event, ui): void {

    var originalDraggable = $(this);

    var id = view.getIdNumberFromElement(originalDraggable);
    var isParentTile = view._model.isParentId(id);

    Diag.Debug.assert(Boolean(id), "Require that we would have an id set on the dragged item");
    // stash the id on the helper so that drop handlers can pick it off
    ui.helper.data("workItemId", id);
    ui.helper.focus();

    // At the initiation of a drag operation (via mouse down) we switch out the 'clickable-title'
    // class in order to get a "default" cursor during the drag. Once we have started the drag
    // we put the class back to ensure the original cursor is restored.
    $(TaskBoardView.TITLE_SELECTOR, originalDraggable).addClass("clickable-title");

    var revertCallback = function ($originalItem: JQuery) {
      $originalItem.focus();
    };

    // This allows the user to use drag-drop within a single taskboard cell to reorder tasks,
    // assuming the feature is available and the view isn't grouped by People.
    if (!isParentTile && view.isReorderSupported()) {

      var handleReorderItem = (event, ui, originalItem, originalItemIndex, currentItemIndex) => {
        view._reorderItemByDragDrop(event, ui, originalItem, originalItemIndex, currentItemIndex);
      };

      var getIdDelegate = (item: JQuery): string => {
        return item.attr('id');
      };
      if (view._isEffectiveCustomLayout()) {
        var _rePositionDelegate = ($tile: JQuery, tiles: Element[], newIndex) => {
          view._rePositionTileAtIndex($tile, tiles, newIndex);
        };
        TFS_Agile.ReorderItemHandler.attachReorderItemHandler(originalDraggable, ui.helper, handleReorderItem, getIdDelegate, "." + TaskBoardView.TILE_CSS_CLASS, revertCallback, "." + TaskBoardView.CELL_CLASS, _rePositionDelegate, Utils_Core.delegate(view, view._sortTilesByOrder));
      }
      else {
        TFS_Agile.ReorderItemHandler.attachReorderItemHandler(originalDraggable, ui.helper, handleReorderItem, getIdDelegate, "." + TaskBoardView.TILE_CSS_CLASS, revertCallback);
      }
    }
    else {
      originalDraggable.on("dragstop", (event, ui) => {
        originalDraggable.unbind("dragstop");
        // if the item is dropped in the same container and same index, revert and do nothing.
        if ($.isFunction(revertCallback)) {
          revertCallback(originalDraggable);
        }
      });
    }
    // notify others that we are starting the drag
    view._raiseWorkItemDragging(id);
  }

  /**
   *     Called when an item is dropped at the end of a drag gesture.
   *     Sets the value of System.State to the title of the column where the item was dropped
   *     and if that state is considered valide, saves the item.
   *     'this' is the DOM element at the drop location
   * 
   * @param view The owning view
   * @param event The originating startdrag() event
   * @param ui 
   *     The UI helper object managed by jQuery UI. ui.draggable represents the item being dragged
   * 
   */
  private _dropItem(view: TaskBoardView, event: Event, ui: any): void {
    var startTime = Date.now();
    var $draggable: JQuery = ui.draggable;
    var $droppable: JQuery = $(this);
    var toState: string = $droppable.data(TaskBoardView.DATA_WIT_STATE);
    var toPivot: string = $droppable.data(TaskBoardView.DATA_PIVOT_KEY);
    var id: number = view.getIdNumberFromElement($draggable); // Get the id of tile being updated
    var fromState: string;
    var fromPivot: string = view._model.getPivotFieldValue(id, view._classificationType);
    var pivotField;
    var workItemChanges;
    var assignedTo: string;
    var fieldChanges;
    var newParentId = null;

    //Ocassionally _dropItem gets called when the draggable is still being saved.
    //As per the current theory this happens due to resize of droppables during drop animation/reorder
    //We do not want to reparent until the previous operation is done
    //Ideally this check should happen during accept but accept is called way too often and we want that to be as fast as possible
    //We do not want to bear cost of this call in accept as this is related to a corner case scenario.
    //Look at following bug for history https://mseng.visualstudio.com/DefaultCollection/VSOnline/_workitems/edit/229602
    var savedDataState = view._viewState.getSaveData(id);
    if (savedDataState) {
      return;
    }

    Diag.logTracePoint("TaskBoardView._dropItem.start");

    // Build up the set of field changes (including the filter).
    fieldChanges = $.extend({}, view._model.getFilter());

    // Remove unassigned filter so that items moved while filtering are not set to unassigned
    if (fieldChanges.hasOwnProperty(DatabaseCoreFieldRefName.AssignedTo) && fieldChanges[DatabaseCoreFieldRefName.AssignedTo] === "") {
      delete fieldChanges[DatabaseCoreFieldRefName.AssignedTo];
    }

    // Update state
    fromState = view._model.getFieldValue(id, DatabaseCoreFieldRefName.State);
    fieldChanges[DatabaseCoreFieldRefName.State] = toState;

    // Start building the telemetry event.
    var telemetryFeature: string;
    var telemetryProperties: { [name: string]: any } = {
      "BoardPivot": (view._classificationType === TaskboardGroupBy.PEOPLE_CLASSIFICATION) ? "Person" : "Parent",
      "FromState": fromState,
      "ToState": toState,
      "WorkItemID": id,
    };

    // We moved across rows, need to make changes
    if (fromPivot !== toPivot) {

      // Make sure to keep the state the same on taskboard summary rows
      if ($droppable.hasClass("taskboard-row-summary")) {
        fieldChanges[DatabaseCoreFieldRefName.State] = fromState;
      }

      if (view._classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION) {
        var fromPivotId: number = parseInt(fromPivot) || 0;
        var toPivotId: number = parseInt(toPivot) || 0;
        view._model.updateChildrenLookupTableAfterEdit(id, toPivotId, fromPivotId);

        // Parent-based view, the story changes
        newParentId = (toPivot === TaskBoardModel.NULL_PIVOT_KEY) ? TaskBoardModel.NO_PARENT_ID : toPivot;
        pivotField = view._model._getClassificationProvider(TaskboardGroupBy.PARENT_CLASSIFICATION).getPivotField();

        // Need to update the pivot manually so that it is moved vertically to the right row
        view._model.setFieldValue(id, pivotField, newParentId);

      } else if (view._classificationType === TaskboardGroupBy.PEOPLE_CLASSIFICATION) {
        // People-based view, the assigned person changes
        assignedTo = (toPivot === TaskBoardModel.NULL_PIVOT_KEY) ? "" : toPivot;

        fieldChanges[DatabaseCoreFieldRefName.AssignedTo] = assignedTo;
      } else {
        Diag.Debug.fail("Pivot view classification type is unexpected.");
      }

      $.extend(telemetryProperties, {
        "FromParented": (fromPivot === TaskBoardModel.NULL_PIVOT_KEY) ? "No" : "Yes",
        "ToParented": (toPivot === TaskBoardModel.NULL_PIVOT_KEY) ? "No" : "Yes"
      });
      telemetryFeature = CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATION_TASKBOARD_REPARENT;
    }
    else {
      // Row (pivot) not changed --> state change
      $.extend(telemetryProperties, {
        "Parented": (fromPivot === TaskBoardModel.NULL_PIVOT_KEY) ? "No" : "Yes"
      });
      telemetryFeature = CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATION_TASKBOARD_CHANGE_STATE;
    }

    // Build up workItemChanges Object
    workItemChanges = {
      fieldChanges: fieldChanges,
      newParentId: newParentId
    };

    // Raise the change request.
    view._raiseWorkItemChangeRequested(id, workItemChanges, (id: number, args: WITOM.IWorkItemsBulkSaveSuccessResult, errorType: number) => {
      view._workItemChangeRequestCompleted(id, args, errorType);
    });
    Diag.logTracePoint("TaskBoardView._dropItem.saveStarted");

    view.removeHighlighting(view, $droppable);

    // Setup the view to indicate that the tile is being saved
    // This was moved to after the change request is raised due to a
    // regression in the speed of fadeTo call. This allows the save 
    // to start before, ignoring this regression's impact on the user
    if (!view._viewState.getError(id)) {
      view._beginSaveTile(id, fieldChanges);
    }

    // Start the animation procedure
    view._animateDrop($draggable, ui.helper);

    // Publish the telemetry event.
    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
      CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
      telemetryFeature,
      telemetryProperties, startTime
    ));
  }

  private cancelDrop(view: TaskBoardView) {
    var $droppable: JQuery = $(this);
    view.removeHighlighting(view, $droppable);
  }

  private removeHighlighting(view: TaskBoardView, $droppable: any) {
    // Unhighlight everything currently highlighted
    view._removeDroppableBorderHighlighting($droppable);
    view._removeParentHighlighting($droppable);

    // Remove the Current and Painted Droppables from the View
    view._currentHoveredDroppable = null;
    view._currentPaintedDroppable = null;
  }

  public isReorderSupported(): boolean {
    return (this._classificationType !== TaskboardGroupBy.PEOPLE_CLASSIFICATION) &&
      !this._model.hasNestedTasks();
  }

  private _reorderItemByDragDrop(event: Event, ui: any, originalItem: JQuery,
    _originalItemIndex: number, _currentItemIndex: number
  ): void {
    var prev: number = null;
    var next: number = null;

    var id: number = this.getIdNumberFromElement(originalItem);
    var pivot_key = this._model.getPivotFieldValue(id, this._classificationType);
    var parentId = (pivot_key === TaskBoardModel.NULL_PIVOT_KEY) ? 0 : pivot_key;
    var childIds: number[] = this._model.getChildWorkItemIdsByParent(parentId);
    var state: string = this._model.getStateFieldValueAsKey(id);
    var idAtTarget: number = null;

    var telemetryValues: { [x: string]: any } = {
      "BoardPivot": (this._classificationType === TaskboardGroupBy.PEOPLE_CLASSIFICATION) ? "Person" : "Parent",
      "State": state,
      "FromPos": _originalItemIndex,
      "ToPos": _currentItemIndex,
      "TaskCount": childIds.length,
      "Parented": (parentId === TaskBoardModel.NULL_PIVOT_KEY) ? "No" : "Yes",
      "WorkItemID": id
    };
    Telemetry.publishEvent(new Telemetry.TelemetryEventData(
      CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
      CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATION_TASKBOARD_REORDER,
      telemetryValues
    ));

    var diff: number = _currentItemIndex - _originalItemIndex;
    var childItems = this._cellLookupTable[pivot_key][state].find("." + TaskBoardView.TILE_CSS_CLASS).toArray();
    if (this._isEffectiveCustomLayout()) {
      this._sortTilesByOrder(childItems);
    }
    if (diff < 0) {
      // put before
      idAtTarget = this.getIdNumberFromElement($(childItems[_currentItemIndex + 1]));
      var index = childIds.indexOf(idAtTarget);
      prev = childIds[index - 1] || null;
      next = idAtTarget;
    }
    else if (diff > 0) {
      // put after
      idAtTarget = this.getIdNumberFromElement($(childItems[_currentItemIndex - 1]));
      var index = childIds.indexOf(idAtTarget);
      next = childIds[index + 1] || null;
      prev = idAtTarget;
    }

    this._reorderTile(originalItem, prev, next, false);
    this._animateDrop(originalItem, ui.helper);
  }

  private _reorderTile($tile: JQuery, previousId: number, nextId: number, setFocus: boolean) {
    const id: number = this.getIdNumberFromElement($tile);
    const pivot_key = this._model.getPivotFieldValue(id, this._classificationType);
    const parentId = (pivot_key === TaskBoardModel.NULL_PIVOT_KEY) ? 0 : pivot_key;

    const changes: TFS_Agile.IReorderOperation = {
      ParentId: parentId,
      Ids: [id],
      PreviousId: previousId || 0,
      NextId: nextId || 0,
      completedCallback: (src, result) => {
        if (result.success) {
          this._onReorderComplete(result);
          if (setFocus) {
            $tile.focus();
          }
        }
        else {
          this._onReorderFail(result);
        }
      }
    };

    this._model.updateChildrenLookupTable(id, changes.NextId, changes.ParentId);
    this.showSavingOverlay(id);
    this._raiseWorkItemReorderRequested(changes);
  }

  protected _onReorderComplete(result: any) {

    var beginRefreshCallback = (id: number, error?: Error) => {
      this.hideSavingOverlay(id);
      if (error) {
        this.showError(id, error);
      }
    };

    if (result && result.hasOwnProperty("updatedWorkItemOrders")) {
      // Taskboard pins the updated workitem in cache 
      // so refresh the successfully reordered items to invalidate and update the cache.
      $.each(result.updatedWorkItemIds, (idx: number, id: number) => {
        var workItem = this._model.getWorkItemManager().getWorkItem(id);
        if (workItem) {
          workItem.beginRefresh(
            () => { beginRefreshCallback(id); },
            (error: Error) => { beginRefreshCallback(id, error); }
          );
        } else {
          this._model.setFieldValue(id, TaskBoardView.ORDER_BY_FIELD_NAME, result.updatedWorkItemOrders[idx]);
          this.hideSavingOverlay(id);
        }
      });
    }
  }

  protected _onReorderFail(result) {
    for (let id of result.processedIds) {
      this.hideSavingOverlay(id);
      this.showError(id, result.error);
    }
  }

  public pausePositionTile() {
    this._pausePositionTile = true;
  }

  public resumePositionTile() {
    this._pausePositionTile = false;
  }

  public showSavingOverlay(id: number) {
    var $tile = this._findTile(id);
    if ($tile) {
      this._viewState.setSaveData(id, {
        savingDisplayed: true
      });
      this._showSavingMessage($tile);
      this.pausePositionTile();
      this.refreshTile(id);
      this.setFocusTile(id);
    }
  }

  public hideSavingOverlay(id: number) {
    this._model.clearOverrideValues(id);
    this._viewState.clearSaveData(id);
    this.resumePositionTile();
    this.refreshTile(id);
  }

  /**
   * Get message area and create one if it doesn't exist
   * @return MessageAreaControl 
   */
  public getMessageArea(): Notifications.MessageAreaControl {
    if (!this._messageArea) {
      this._messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, this._$messageArea, {
        closeable: true
      });
    }

    return this._messageArea;
  }

  /**
   *  Creates a dismissible message area control to display reorder disabled message. 
   */
  private _displayReorderDisabledMessage(message: string): void {

    var reorderDisabledMessage: TFS_UI_Controls_Common.INotificationMessage = {
      id: TaskBoardView.TASKBOARD_REORDER_MESSAGE_AREA_ID,
      scope: TFS_WebSettingsService.WebSettingsScope.User,
      type: Notifications.MessageAreaType.Info,
      header: message,
      content: null,
    };

    var notificationSettings: TFS_UI_Controls_Common.IDismissableNotificationSettings = {
      className: TaskBoardView.TASKBOARD_DISMISSABLE_MESSAGE_AREA_CLASS,
      clientDismissable: true,
      closeable: true,
      message: reorderDisabledMessage,
    };

    Controls.Enhancement.enhance(TFS_UI_Controls_Common.DismissableMessageAreaControl, this._$dismissableMessageArea, notificationSettings);
  }

  /**
   *     Called at the end of a drag gesture. Animates the gesture,
   *     moving the cloned helper to the final position of the tile, and
   *     scrolling the page if the final position is not in viewable area.
   * 
   * @param $tile The tile which is being dragged, in final position
   * @param $helper The helper created by draggable, to be cloned
   */
  private _animateDrop($tile: JQuery, $uiHelper): void {
    Diag.Debug.assertParamIsJQueryObject($tile, "$tile");
    Diag.Debug.assertParamIsJQueryObject($uiHelper, "$uiHelper");

    var $taskboard = this._$container,
      $newHelper = $uiHelper.clone(true).insertAfter($uiHelper), // Original helper disappears on drop, before animation occurs
      scrollLocationVertical = $taskboard.scrollTop(),
      scrollLocationHorizontal = $taskboard.scrollLeft(),
      scrollingAnimationObject: any = {};

    Diag.Debug.assertIsJQueryObject($taskboard, "$taskboard is not a JQuery object");
    Diag.Debug.assertIsJQueryObject($newHelper, "$newHelper is not a JQuery object");

    // Get the coordinates from the function
    var tileBounds = this._getElementBounds($tile);
    var taskboardBounds = this._getElementBounds($taskboard);
    var helperBounds = this._getElementBounds($uiHelper);

    var distance = Math.sqrt(Math.pow(tileBounds.left - helperBounds.left, 2) + Math.pow(tileBounds.top - helperBounds.top, 2));
    var offThePageTop = (tileBounds.top < taskboardBounds.top);
    var offThePageBottom = (tileBounds.bottom + TaskBoardView.TILE_DROP_ANIMATION_SCROLLBAR_BUFFER > taskboardBounds.bottom);
    var offThePageHorizontal = (tileBounds.right + TaskBoardView.TILE_DROP_ANIMATION_SCROLLBAR_BUFFER > taskboardBounds.right) || (tileBounds.left < taskboardBounds.left);

    // Change speed based on location of helper to final tile
    var animationDuration = (distance > TaskBoardView.TILE_DROP_ANIMATION_DURATION_DISTANCE_THRESHOLD) ? TaskBoardView.TILE_DROP_ANIMATION_DURATION_SLOW_TIME : TaskBoardView.TILE_DROP_ANIMATION_DURATION_FAST_TIME;

    // Default position values
    var animationLeft = tileBounds.left;
    var animationTop = tileBounds.top;

    // Hide the tile until animation finishes
    // $tile.hide() will remove the tile completely from the view, including its space. 
    // Using Visibility = hidden will hide the tile but leave the space it holds in the taskboard.
    $tile.css("visibility", "hidden");

    // Setup scroll object with properties based on where the tile is
    if (offThePageHorizontal) {
      scrollingAnimationObject.scrollLeft = scrollLocationHorizontal - taskboardBounds.right + tileBounds.right + TaskBoardView.TILE_DROP_ANIMATION_SCROLLBAR_BUFFER;
      animationLeft = taskboardBounds.right - $tile.width() - TaskBoardView.TILE_DROP_ANIMATION_SCROLLBAR_BUFFER;
    }
    // Separate behaviours for top and bottom scrolling
    if (offThePageTop) {
      scrollingAnimationObject.scrollTop = scrollLocationVertical - taskboardBounds.top + tileBounds.top - TaskBoardView.TILE_DROP_ANIMATION_TOP_BUFFER;
      animationTop = taskboardBounds.top + TaskBoardView.TILE_DROP_ANIMATION_TOP_BUFFER;
    } else if (offThePageBottom) {
      scrollingAnimationObject.scrollTop = scrollLocationVertical + (tileBounds.top - $taskboard.height());

      // Special case for the bottom row of tiles, which won't fully scroll
      if (scrollLocationVertical + tileBounds.top > $taskboard[0].scrollHeight) {
        animationTop = $(document).height() - $tile.height() - TaskBoardView.TILE_DROP_ANIMATION_BOTTOM_BUFFER;
      } else {
        animationTop = tileBounds.top - (scrollingAnimationObject.scrollTop - scrollLocationVertical);
      }
    }


    // Scroll automatically if the tile is off the page (either horizontally, vertically, or both)
    if (offThePageHorizontal || offThePageTop || offThePageBottom) {
      $taskboard.animate(scrollingAnimationObject, TaskBoardView.TILE_DROP_ANIMATION_DURATION_SLOW_TIME);
    }

    // Animate the actual helper to its final position
    $newHelper.animate(
      {
        left: animationLeft,
        top: animationTop
      },
      {
        duration: animationDuration,
        easing: 'easeInOutCubic',
        complete: () => {
          // Make the tile visible again
          $tile.css("visibility", "");
          // Set focus on the tile after rordering.
          // 200 ms to let the tile reorder and render complete
          Utils_Core.delay(this, 200, () => {
            $tile.focus();
          });
          // Remove the new helper now that we're done using it
          $newHelper.remove();

          //Checking if the tile is under right parent and reparenting it if not
          //This is in response to the bug https://mseng.visualstudio.com/DefaultCollection/VSOnline/_workitems#_a=edit&id=232759
          if (!this._isTileUnderRightParent($tile)) {
            this.refreshTile(this.getIdNumberFromElement($tile));
          }

        }
      });
  }

  /**
   *     Checks if the $tile is under the right parent
   * 
   * @param $tile Tile to check parent for.
   * @return True if $tile is under correct parent, false otherwise.
   */
  private _isTileUnderRightParent($tile: JQuery): boolean {
    Diag.Debug.assertParamIsJQueryObject($tile, "$tile");

    var id: number = this.getIdNumberFromElement($tile);
    var pivotValue = this._model.getPivotFieldValue(id, this._classificationType);
    var state = this._model.getStateFieldValueAsKey(id);
    var $targetContainer = this._cellLookupTable[pivotValue][state];
    return $targetContainer.find('#' + $tile.attr("id")).length > 0;
  }

  /**
   *     Gets the bounds (Top/Bottom/Left/Right) of a JQuery element as absolute
   *     pixels in relation to the documents. Uses .offset() for top/left and
   *     calculates bottom/right in relation to those.
   * 
   * @param $object The JQuery object used to get the bounds
   */
  private _getElementBounds($object: JQuery): IElementBounds {
    Diag.Debug.assertParamIsJQueryObject($object, "$object");

    var coords = $object.offset(),
      topCoord = Math.round(coords.top),
      leftCoord = Math.round(coords.left);

    return {
      top: topCoord,
      left: leftCoord,
      bottom: topCoord + $object.height(),
      right: leftCoord + $object.width()
    };
  }

  /**
   * Setup saving data for the provided work item id.
   * @param id ID of the work item that is being saved.
   * @param overrides Object that maps field refnames to their new value
   */
  private _beginSaveTile(id: number, overrides: any): void {
    Diag.Debug.assertParamIsNumber(id, "id");
    Diag.Debug.assertParamIsObject(overrides, "overrides");
    Diag.Debug.assert(this._viewState.getSaveData(id) === undefined, "InvalidOperationException: An item with id " + id + " is already being saved");
    // Setup the field override in the model so the tile is displayed in the 
    // correct position.
    this._model.setOverrideValues(id, overrides);

    // Setup the data that is used to indicate that the item is saving.
    this._viewState.setSaveData(id, {
      savingDisplayed: false
    });

    // Refresh the tile so it is displayed in the new position.
    this.refreshTile(id);

    // Setup delay to show the "Saving..." message after .5 seconds elapse without
    // the save completing.
    Utils_Core.delay(this, 500, function () {
      var tileSavingData = this._viewState.getSaveData(id),
        $tile;
      // If we have tile saving data, then the save of the tile has not been completed
      // (completion of the save clears the entry from the SavingCache).
      if (tileSavingData) {
        // Note: Lookup of the tile is done here using the current view to ensure even
        //       if the user has switched pivots, we find and update the currently displayed tile.
        $tile = this._findTile(id);
        Diag.Debug.assert(Boolean($tile), "Could not find tile with id " + id + ".");

        // Update the saving data to indicate that the save message has been displayed.
        // This will be used by the tile refresh method to determine if it should automatically display the
        // saving message next time the tile is refreshed (for example when the user switches to a different
        // pivot).
        tileSavingData.savingDisplayed = true;

        // The tile is still being saved so display the saving message.
        this._showSavingMessage($tile);
      }
    });
  }

  /**
   * Called when a field change request has been completed.
   * @param id ID of the work item that is was being saved.
   * @param args The result of a successful save action. Not included in error condition.
   * @param errorType Indicates the error type if failure happened.
   * @param setFocusOnTile Should focus be on the tile after refresh?
   * @param changes Changes to the tile
   */
  protected _workItemChangeRequestCompleted(id: number, args: WITOM.IWorkItemsBulkSaveSuccessResult, errorType: number, setFocusOnTile?: boolean, changes?: any): void {
    Diag.Debug.assertParamIsObject(this, "view");
    Diag.Debug.assertParamIsNumber(id, "id");

    // Remove the override values for the tile.
    this._model.clearOverrideValues(id);

    // Remove the saving cache information for the tile.
    this._viewState.clearSaveData(id);

    if (errorType) {
      this._viewState.setError(id, errorType);
    } else if (id < 0) {
      if (this._isParentTile(args.workItems[0].id)) {
        // Delete and recreate the row on save so we bind the drag drop areas correctly
        let nextId: number = this._model._parentWorkItemIds[0];
        this._deleteAndRecreateNewParentRow(id, args.workItems[0].id);

        // Reorder this item to the top of the list
        const changes: TFS_Agile.IReorderOperation = {
          ParentId: 0,
          Ids: [args.workItems[0].id],
          PreviousId: 0,
          NextId: nextId || 0,
          completedCallback: (src, result) => {
            this.hideSavingOverlay(args.workItems[0].id);
            if (!result.success) {
              this.showError(args.workItems[0].id, result.error);
            }
          }
        };
        this._raiseWorkItemReorderRequested(changes);
      } else {
        // Rebind the tile to the new id after a new item is saved
        this.rebindTile(id, args.workItems[0].id);
      }
      id = args.workItems[0].id;
    }

    this.refreshTile(id);

    //update parent pivot title
    if (this._isParentTile(id) && changes && changes.hasOwnProperty(DatabaseCoreFieldRefName.Title)) {
      this._refreshSummaryRowTitle(id);
    }

    // If we are supposed to set the focus on the tile after saving, and we haven't selected a different element,
    // then we set focus on the tile. This is for situations like tab and enter, which are supposed to save the tile, then set
    // focus on it after the save is complete. Note that if there is no focus, the active element on the page is the body, which is where
    // the focus will be if we are saving and haven't clicked on anything else.
    if (setFocusOnTile && (!document.activeElement || $(document.activeElement).is('body'))) {
      this.setFocusTile(id);
    }

    Diag.logTracePoint("TaskBoardView._workItemChangeRequestCompleted.complete");
  }

  /**
   * Called on a child tile when it is clicked
   * 
   * @param event The originating browser event
   * @param $tile The tile that is clicked
   */
  private _clickItem(event, $tile: JQuery): void {
    var id = this.getIdNumberFromElement($tile);
    this.setFocusTile(id);
  }

  private _mouseDown(event, $title: JQuery): void {
    // At the initiation of a drag operation (via mouse down) we switch out the 'clickable-title'
    // class in order to get a "default" cursor during the drag. Once we have started the drag
    // (or are actually clicking on the tile) we put the class back to ensure the original cursor is restored.
    $title.removeClass("clickable-title");
  }

  private _mouseUp(event, $title: JQuery): void {
    // At the initiation of a drag operation (via mouse down) we switch out the 'clickable-title'
    // class in order to get a "default" cursor during the drag. Once we have started the drag
    // (or are actually clicking on the tile) we put the class back to ensure the original cursor is restored.
    $title.addClass("clickable-title");
  }

  /**
   * Called on a child tile when it is clicked
   * 
   * @param id The work item ID
   * @return the workitem url to be edited
   */
  private _getWorkItemEditUrl(id: number): string {
    var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    return tfsContext.getActionUrl("edit", "workitems", $.extend({
      project: tfsContext.contextData.project.name,
      team: tfsContext.navigation.team,
      parameters: id
    }, Navigation.FullScreenHelper.getUrlData()));
  }

  /**
   * Fires the EVENT_NEW_PARENT_DISCARDED event
   */
  private _raiseNewParentItemDiscarded(): void {
    this._raiseEvent(TaskBoardView.EVENT_NEW_PARENT_DISCARDED, null);
  }

  /**
   * Fires the EVENT_WORK_ITEM_DRAGGING event
   * 
   * @param id The ID of the work item that has started to change
   */
  private _raiseWorkItemDragging(id: number): void {
    this._raiseEvent(TaskBoardView.EVENT_WORK_ITEM_DRAGGING, id);
  }

  /**
   * Notifies listeners that a change has been requested for a work item
   * 
   * @param id The work item ID
   * @param workItemChanges Object which contains fieldData (maps field refnames to their new value) and other changes
   * @param changeCompletedHandler Function to invoke when the change has been completed.
   */
  private _raiseWorkItemChangeRequested(id: number, workItemChanges: any, changeCompletedHandler: Function): void {
    this._raiseEvent(
      TaskBoardView.EVENT_WORK_ITEM_CHANGE_REQUESTED,
      {
        id: id,
        workItemChanges: workItemChanges,
        changeCompletedHandler: changeCompletedHandler
      });
  }

  /**
   * Notifies listeners that a reorder has been requested for a work item
   * 
   * @param id The work item ID
   * @param workItemChanges Object which contains fieldData (maps field refnames to their new value) and other changes
   * @param changeCompletedHandler Function to invoke when the change has been completed.
   */
  private _raiseWorkItemReorderRequested(changes: any): void {
    this._raiseEvent(TaskBoardView.EVENT_WORK_ITEM_REORDER_REQUESTED, changes)
  }

  /**
   * Notifies listeners that the user wants to edit the work item
   * @param id The work item ID
   */
  private _raiseEditWorkItem(id: number): void {
    this._raiseEvent(TaskBoardView.EVENT_EDIT_WORK_ITEM, id);
  }

  private _raiseDiscardWorkItem(id: number): void {
    this._raiseEvent(TaskBoardView.EVENT_DISCARD_WORK_ITEM, id);
  }

  private _raiseMoveWorkItemToIteration(id: number, iterationPath: string, $tile) {
    this._raiseEvent(TaskBoardView.EVENT_MOVE_WORK_ITEM_TO_ITERATION, { id, iterationPath, $tile });
  }

  private _raiseCreateNewWorkItem(workItemType: string, parentId: number) {
    this._raiseEvent(TaskBoardView.EVENT_CREATE_NEW_WORK_ITEM, { workItemType: workItemType, parentId: parentId });
  }

  /**
   * Notifies listeners for the specified event
   * 
   * @param event The event to be notified
   * @param args arguments to the event handler
   */
  private _raiseEvent(event: string, args: any) {
    this._events.invokeHandlers(event, this, args);
  }

  /**
   *     Expand the tokens in the template with the values from
   *     the work item with the provided id.
   * 
   * @param id 
   *     ID of the work item to use in expanding the template.
   * 
   * @param contentTemplate 
   *     Template HTML to expand the work item fields into.
   * 
   */
  private _applyTemplate(id: number, contentTemplate: string): JQuery {
    Diag.Debug.assertParamIsNumber(id, "id");
    Diag.Debug.assertParamIsString(contentTemplate, "contentTemplate");

    let ASSIGNED_TO_PLACEHOLDER_CLASS = "assigned-to-placeholder-class"; // Elements with this class should not leak beyond this function. This is a template processing implementation detail.

    // IMPORTANT NOTE: The templating system was originally designed for pure string HTML composition only. Since the introduction of a complex identity control, we must also support
    // 'live content' - composing fully-hydrated JQuery objects into the template rather than just strings. However, so far, we only have that one particular scenario. To avoid unnecessary
    // complexity, the code here deals only with the 'Assigned To' identity field scenario, but could be extended into a generic multi-field design if needed in the future by recording the
    // field ref name in the placeholder.

    // (1) Process all field placeholders (e.g. "[System.Title]") in the template into HTML, resulting in a valid HTML string that can be deserialized.
    //  - Fields that can simply be rendered with static HTML will be injected right here.
    //  - Fields that require live content (controls that must not be serialized to string due to their interative features) will have a placeholder div injected, which will be replaced in the third step.
    let contentString: string = contentTemplate.replace(this._templateFieldRegExp, (matched: string, fieldRefName?): string => {
      if (fieldRefName === DatabaseCoreFieldRefName.AssignedTo) {
        return `<div class='${ASSIGNED_TO_PLACEHOLDER_CLASS}'></div>`;
      }
      else if (id === TaskBoardModel.NO_PARENT_ID && fieldRefName === DatabaseCoreFieldRefName.Title) {
        return TaskboardResources.Taskboard_Unparented;
      }
      else {
        // This will sanitize & escape the field value.
        return this._getFormattedFieldValue(id, fieldRefName);
      }
    });

    // (2) Deserialize the HTML into an actual DOM tree.
    let $contentElement = $(contentString);
    var $assignedToPlaceholderElement: JQuery = $(`.${ASSIGNED_TO_PLACEHOLDER_CLASS}`, $contentElement);

    if ($assignedToPlaceholderElement && $assignedToPlaceholderElement.length > 0) {
      // (3) Inject the 'Assigned To' live content using the placeholder.
      // Note: AssignedTo Value will be null for uncached workitems and undefined or empty string for cached work items.
      let assignedToValue = this._model.getFieldValue(id, DatabaseCoreFieldRefName.AssignedTo);
      let $assignedToElement = null;
      if (isUseNewIdentityControlsEnabled()) {
        // Render a new identity display control.

        var user: TFS_OM_Identities.IIdentityReference = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(assignedToValue);

        // (Create & insert the actual control.)
        $assignedToElement = $("<div>");
        let options: Identities_Picker_Controls.IIdentityDisplayOptions = Util_Cards.setupCommonIdentityDisplayControlOptions(user);
        options.turnOffHover = false;
        options.consumerId = TFS_Agile.IdentityControlConsumerIds.TaskBoardRowHeaderDisplayControl;

        Controls.BaseControl.create(Identities_Picker_Controls.IdentityDisplayControl, $assignedToElement, options);
      }
      else {
        // Render the cached classic identity view control.
        $assignedToElement = $(CardControls.AssignedToFieldRenderer.getCachedIdentityViewHtml(assignedToValue || WITResources.AssignedToEmptyText));
      }
      $assignedToPlaceholderElement.replaceWith($assignedToElement);
    }

    return $contentElement;
  }

  /**
   *     Get the field value and format it appropriately.
   */
  public _getFormattedFieldValue(id: number, refname: string): string {
    if (id === TaskBoardModel.NO_PARENT_ID && refname === DatabaseCoreFieldRefName.Title) {
      return TaskboardResources.Taskboard_Unparented;
    }

    var fieldValue = this._model.getFieldValue(id, refname);

    if (refname === TaskBoardModel.WORK_ROLLUP_NAME) {
      fieldValue = FormatUtils.formatRemainingWorkForDisplay(fieldValue);
    }
    else if (fieldValue === undefined || fieldValue === null) {
      fieldValue = '';
    }
    else {
      Diag.Debug.assert(typeof (fieldValue) === 'string', 'Expected a string value to be returned from TaskBoardModel');
      fieldValue = Utils_String.htmlEncode(fieldValue);
    }

    return fieldValue;
  }


  /**
   * Unbind the click event from opening the tile
   * 
   * @param $tile The tile
   */
  private _unbindTileEditClick($tile: JQuery): void {
    Diag.Debug.assertParamIsJQueryObject($tile, "$tile");

    $tile.unbind("click.VSS.Agile");
  }

  private _resetAfterEdit($tile: JQuery, fieldRefName: string, discard: boolean, setFocusOnTile: boolean) {

    var id = this.getIdNumberFromElement($tile),
      $newCardButton = $tile.closest(TaskBoardView.ROW_CSS_SELECTOR).find("." + TaskboardAddNewItemControl.coreCssClass),
      tileDiscarded = false;

    this._enableTileEvents($tile);

    if (discard && id < 0) {
      // raise discard work item event
      this._raiseDiscardWorkItem(id);
      tileDiscarded = true;
      if (this._cellLookupTable[TaskBoardModel.NEW_ROW_PIVOT_KEY]) {
        delete this._cellLookupTable[TaskBoardModel.NEW_ROW_PIVOT_KEY];
      }
    }

    if (setFocusOnTile) {
      tileDiscarded ? $newCardButton.focus() : $tile.focus();
    }
  }

  private _saveCallback($tile: JQuery, changes: IDictionaryStringTo<any>, actions: TFS_Agile_Controls.IOnTileEditSaveActions): void {
    /// <summary> Callback to be called which should save the data which has been changed </summary>
    /// <param name="$tile" type="jQuery"> The tile holding the field that the combo was bound to </param>
    /// <param name="changes" type="IDictionaryStringTo<>"> dictionary of field to its new value </param>
    /// <param name="actions" type="IOnTileEditSaveActions"> actions to be performed post save </param>

    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsObject(changes, "changes");
    Diag.Debug.assertParamIsObject(actions, "actions");

    const id = this.getIdNumberFromElement($tile);
    let clientError: boolean = undefined;

    // Build workItemChange Object
    let workItemChanges = {
      fieldChanges: changes,
      newParentId: null
    };

    this._beginSaveTile(id, changes);
    this._raiseWorkItemChangeRequested(id, workItemChanges, (id: number, args: WITOM.IWorkItemsBulkSaveSuccessResult, errorType: number) => {
      this._workItemChangeRequestCompleted(id, args, errorType, actions.focusOnTile, changes);
      //open workItem for synchronous error
      if (errorType && clientError === undefined && changes && changes.hasOwnProperty(DatabaseCoreFieldRefName.Title)) {
        clientError = true;

        this._raiseEditWorkItem(id);
      }
    });

    if (clientError === undefined) {
      clientError = false;
    }

    // if save request successfully sent without any error
    // and user has pressed enter on a new card which has triggered the save
    // and the tile is not a new parent tile
    // add the next new item (fast card addition) of the same type under the same parent
    if (!clientError && actions.createNewTile && !this._isNewParentTile($tile)) {
      var workItemType = this._model.getFieldValue(id, DatabaseCoreFieldRefName.WorkItemType);
      var parentId = this._model.getParent(id);
      this._addWorkItem(workItemType, parentId);
    }
  }

  /**
   * Creates the DOM content and inserts it into the tile.
   * Includes the title and fields which can be edited on-tile
   * @param id  The id of the work item 
   * @param $tile  The object representing the tile element in the DOM
   */
  private _populateTile(id: number, $tile: JQuery, showEmptyFields?: boolean): void {

    Diag.Debug.assertParamIsNumber(id, "id");
    Diag.Debug.assertParamIsObject($tile, "$tile");

    var $content: JQuery,
      isParentTile: boolean = this._isParentTile(id);

    if (isParentTile) {
      $content = this._getParentTileContent(id, $tile, showEmptyFields);
    }
    else {
      $content = this._getChildTileContent(id, $tile, showEmptyFields);
    }
    $tile.empty().append($content);

    // No context menu for 'Unparented' parent tile.
    if (id !== TaskBoardModel.NO_PARENT_ID) {
      this._renderContextMenuButton($tile, $content);
    }

    this._attachEventsToTileContent(id, $tile);
  }

  /** 
   * Creates to DOM elements for the context menu elipsis on the tile. 
   *
   * @param $tile  The object representing the tile element in the DOM 
   * @param $tileContent  The object representing the tile content in the DOM 
   */
  private _renderContextMenuButton($tile: JQuery, $tileContent: JQuery) {

    // Remove the old single inline edit from editiable title control
    // TODO: remove when we remove edit icon from WITCardRenderer._renderIdAndTitleSection
    $tile.find("." + CardControls.FieldRendererHelper.ICON_EDIT_CLASS).remove();

    var $container = $(domElem("div", "card-context-menu")).append($(domElem("div", "bowtie-icon bowtie-ellipsis")));
    $container
      .focus(() => {
        $container.addClass("tabbed-focus");
      })
      .blur(() => {
        if (!this._contextMenu) {
          $container.removeClass("tabbed-focus");
        }
      }).bind("keydown.VSS.Agile", (e: JQueryEventObject) => {
        if (e.keyCode === KeyCode.ENTER) {
          this._handleCreateContextMenuEvent($tile, $container, e);
        }
      }).click((e: JQueryEventObject) => {
        this._handleCreateContextMenuEvent($tile, $container, e);
      });

    $tileContent.append($container);
  }

  /** 
   * Lazily creates the context menu for the tile. 
   *
   * @param $tile  The object representing the tile element in the DOM 
   * @param $container  The object representing the ellipsis content in the DOM, used to position the popup
   * @param e The JQuery event object, resulting from keyboard or click.
   */
  private _handleCreateContextMenuEvent($tile: JQuery, $container: JQuery, e: JQueryEventObject) {
    var id = this.getIdNumberFromElement($tile);

    if (!this._viewState.getSaveData(id) && (!this._contextMenu || !this._contextMenu.isActive() || this._contextMenuId !== id)) {
      this._disposeContextMenu();
      this._$cardContextMenuContainer = $container;
      this._contextMenu = this._createContextMenu($tile);
      this._contextMenu.popup($tile, $container);
      this._contextMenu.focus();
      this._contextMenuId = id;
    }

    e.preventDefault();
    e.stopPropagation();
  }

  /** 
   * Creates the context menu control for the tile, appended to the $tile DOM.
   *
   * @param $tile  The object representing the tile element in the DOM 
   */
  private _createContextMenu($tile: JQuery): Menus.PopupMenu {

    Diag.Debug.assert(this._model && !!this._model.team, "Model should not be null so does the team in the model.")

    var id = this.getIdNumberFromElement($tile);
    var menuItems = this._getContextMenuItems($tile);
    const team: ITeam = this._model && this._model.team;

    var menuOptions = {
      align: "left-bottom",
      items: [{ childItems: menuItems }],
      onHide: Utils_Core.delegate(this, this._disposeContextMenu),
      contributionIds: ["ms.vss-work-web.sprint-board-card-item-menu", "ms.vss-work-web.work-item-context-menu"],
      getContributionContext: (): TFS_Agile.ContibutionContexts.ICardContextMenu => {
        return {
          team,
          id,
          workItemType: <string>this._model.getFieldValue(id, DatabaseCoreFieldRefName.WorkItemType)
        };
      },
      arguments: {
        telemetry: {
          area: CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
          feature: CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_CARD_CONTEXT_MENU_CLICK
        }
      }
    };

    if (!this._$cardContextMenuContainer.hasClass("tabbed-focus")) {
      this._$cardContextMenuContainer.addClass("tabbed-focus");
    }

    return <Menus.PopupMenu>Controls.Control.createIn(Menus.PopupMenu, $tile, menuOptions);
  }

  /** 
   * Gets the default context menu items for the tile.
   *
   * @param $tile  The object representing the tile element in the DOM 
   */
  private _getContextMenuItems($tile: JQuery): Menus.IMenuItemSpec[] {
    var menuItems: Menus.IMenuItemSpec[] = [];

    var workItemId = this.getIdNumberFromElement($tile);

    menuItems.push({
      id: "open-item",
      text: TaskboardResources.TileContextMenu_OpenItem,
      icon: "bowtie-icon bowtie-arrow-open",
      groupId: "open",
      action: () => {
        this._openItem($tile);
      }
    });

    menuItems.push({
      id: "edit-title",
      text: TaskboardResources.TileContextMenu_EditTitle,
      icon: "bowtie-icon bowtie-edit",
      groupId: "modify",
      action: () => {
        var fieldSetting = this._getCardFieldSetting(workItemId, DatabaseCoreFieldRefName.Title);
        var field: Cards.CardField = this._model.field(workItemId, DatabaseCoreFieldRefName.Title, fieldSetting),
          $fieldContainer: JQuery = this._cardRenderer.getFieldContainer($tile, DatabaseCoreFieldRefName.Title),
          fieldView: CardControls.CardFieldView = field ? this._cardRenderer.getFieldView($fieldContainer, field) : null;

        this._cardEditController.beginFieldEdit(fieldView,
          Utils_Core.delegate(this, Utils_Core.curry(this._editStartCallback, $tile)),
          Utils_Core.delegate(this, Utils_Core.curry(this._editCompleteCallback, $tile)),
          Utils_Core.delegate(this, Utils_Core.curry(this._editDiscardCallback, $tile)),
          this._getCardContext(workItemId));
      }
    });

    // Add move to iteration
    const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
    const menuItem: Menus.IMenuItemSpec = CommonContextMenuItems.getMoveToIterationContextMenuItem(
      tfsContext,
      this._teamId,
      {},
      (error?: TfsError) => {
        this.showError(workItemId, {
          name: error ? error.message : "",
          message: error ? error.message : ""
        });
      },
      (_, iterationPath) => {
        this._raiseMoveWorkItemToIteration(workItemId, iterationPath, $tile);
      }
    );

    menuItem.groupId = "modify";
    menuItems.push(menuItem);

    return menuItems;
  }

  /** Dispose the context menu control. */
  private _disposeContextMenu() {
    if (this._contextMenu) {
      if (this._$cardContextMenuContainer && this._$cardContextMenuContainer.hasClass("tabbed-focus")) {
        this._$cardContextMenuContainer.removeClass("tabbed-focus");
      }
      this._contextMenu.dispose();
      this._contextMenu = null;
      this._$cardContextMenuContainer = null;
      this._contextMenuId = -1;
    }
  }

  /**
   *     Creates the DOM content HTML which will be inserted into the child tile.
   *     Includes the title and fields which can be edited on-tile
   * 
   * @param id  The id of the work item 
   * @param $tile  The object representing the parent tile element in the DOM 
   * @return Child tile content
   */
  private _getChildTileContent(id: number, $tile: JQuery, showEmptyFields?: boolean): JQuery {

    Diag.Debug.assertParamIsNumber(id, "id");
    Diag.Debug.assertParamIsObject($tile, "$tile");

    var $tileContent = $(domElem("div", "tbTileContent"));

    var cardSettings: Cards.CardSettings,
      cardStyleRules: Cards.IStyleRule[];
    // when the cardSettings provider is not available fallback to default settings while rendering the card
    var cardSettingsProvider = this.getCardSettingsProvider();
    if (cardSettingsProvider) {
      var typeName = this._getFieldValue(id, WITConstants.CoreFieldRefNames.WorkItemType);
      cardSettings = cardSettingsProvider.getCardSettingsForItemType(typeName);
      cardStyleRules = cardSettingsProvider.getCardSettings().styles;
    }
    if (!cardSettings) {
      cardSettings = new Cards.CardSettings([{ "fieldIdentifier": DatabaseCoreFieldRefName.Title }, { "fieldIdentifier": DatabaseCoreFieldRefName.AssignedTo }, { "fieldIdentifier": this._model.getWorkRollupFieldRefName() }]);
    }
    Util_Cards.populateFieldSettings(cardSettings.fields, this._model.getWorkRollupFieldRefName(), this._model.getOrderFieldRefName(), this._isAdvancedBacklogManagement(), (fieldIdentifier: string) => { return this._model.getFieldDefinition(fieldIdentifier); });

    var tagsField = cardSettings.getField(DatabaseCoreFieldRefName.Tags);
    if (tagsField) {
      tagsField[CardControls.FieldRendererHelper.MAX_TAGS_SETTING] = TaskBoardView.TILE_MAX_TAGS;;
      tagsField[CardControls.FieldRendererHelper.TAG_CHARACTER_LIMIT_SETTING] = TaskBoardView.TILE_TAG_CHARACTER_LIMIT;
    }

    this._cardRenderer.renderCard($tileContent, cardSettings, this._model.getFieldDefinitions(), (refName: string) => {
      return this._getFieldValue(id, refName);
    }, this._model.getWorkRollupFieldRefName(), BoardType.Taskboard, cardStyleRules, showEmptyFields, this._getCardContext(id));

    return $tileContent;
  }

  /**
   *     Creates the DOM content HTML which will be inserted into the parent tile.
   *     Includes the title and fields which can be edited on-tile
   * 
   * @param id  The id of the work item 
   * @param $tile  The object representing the parent tile element in the DOM 
   * @return Parent tile content
   */
  private _getParentTileContent(id: number, $tile: JQuery, showEmptyFields?: boolean): JQuery {

    Diag.Debug.assertParamIsNumber(id, "id");
    Diag.Debug.assertParamIsObject($tile, "$tile");

    var isAdvancedBacklogManagement: boolean = this._isAdvancedBacklogManagement();
    var $tileContent = $(domElem("div", "tbTileContent"));
    var fieldSettings: Cards.ICardFieldSetting[],
      cardStyleRules: Cards.IStyleRule[];

    if (id === TaskBoardModel.NO_PARENT_ID) {
      fieldSettings = [{ "fieldIdentifier": DatabaseCoreFieldRefName.Title, "isEditable": false.toString() }, { "fieldIdentifier": TaskBoardModel.WORK_ROLLUP_NAME }]
    }
    else {
      // when the cardSettings provider is not available fallback to default settings while rendering the card
      if (this.getCardSettingsProvider()) {
        cardStyleRules = this.getCardSettingsProvider().getCardSettings().styles;
        var typeName = this._getFieldValue(id, WITConstants.CoreFieldRefNames.WorkItemType);
        var cardSettingsForType = this.getCardSettingsProvider().getCardSettingsForItemType(typeName);
        if (cardSettingsForType && cardSettingsForType.fields) {
          fieldSettings = this.getCardSettingsProvider().getCardSettingsForItemType(typeName).fields.slice(0);
          Util_Cards.populateFieldSettings(fieldSettings, TaskBoardModel.WORK_ROLLUP_NAME, this._model.getOrderFieldRefName(), this._isAdvancedBacklogManagement(), (fieldIdentifier: string) => this._model.getFieldDefinition(fieldIdentifier));
          //append the .WORKROLLUP field settings on the parent tiles in readonly format
          fieldSettings = fieldSettings.concat([{ "fieldIdentifier": TaskBoardModel.WORK_ROLLUP_NAME, "isEditable": false.toString() }]);
        }
      }
      if (!fieldSettings) {
        fieldSettings = [{ "fieldIdentifier": DatabaseCoreFieldRefName.Title, "isEditable": isAdvancedBacklogManagement.toString() }, { "fieldIdentifier": DatabaseCoreFieldRefName.AssignedTo, "isEditable": isAdvancedBacklogManagement.toString() }, { "fieldIdentifier": TaskBoardModel.WORK_ROLLUP_NAME, "isEditable": false.toString() }, { "fieldIdentifier": DatabaseCoreFieldRefName.State, "isEditable": isAdvancedBacklogManagement.toString() }]
      }
    }
    var cardSettings = new Cards.CardSettings(fieldSettings);
    var tagsField = cardSettings.getField(DatabaseCoreFieldRefName.Tags);
    if (tagsField) {
      tagsField[CardControls.FieldRendererHelper.MAX_TAGS_SETTING] = TaskBoardView.TILE_MAX_TAGS;
      tagsField[CardControls.FieldRendererHelper.TAG_CHARACTER_LIMIT_SETTING] = TaskBoardView.TILE_TAG_CHARACTER_LIMIT;
    }

    this._cardRenderer.renderCard($tileContent, cardSettings, this._model.getFieldDefinitions(), (refName: string) => {
      return this._getFieldValue(id, refName);
    }, TaskBoardModel.WORK_ROLLUP_NAME, BoardType.Taskboard, cardStyleRules, showEmptyFields, this._getCardContext(id));

    return $tileContent;
  }

  private _getFieldValue(id: number, refname: string): string {

    if (id === TaskBoardModel.NO_PARENT_ID && refname === DatabaseCoreFieldRefName.Title) {
      return TaskboardResources.Taskboard_Unparented;
    }

    var fieldValue = this._model.getFieldValue(id, refname);
    if (fieldValue === null || fieldValue === undefined) {
      fieldValue = "";
    }
    return fieldValue;
  }

  private _attachEventsToTileContent(id: number, $tile: JQuery) {
    var $title: JQuery = $('.' + CardControls.FieldRendererHelper.ID_TITLE_CONTAINER_CLASS, $tile);
    var $titletext: JQuery = $('.' + CardControls.FieldRendererHelper.CLICKABLE_TITLE_CLASS, $title)

    if (id !== TaskBoardModel.NO_PARENT_ID) {
      if ($tile.data(TaskBoardView.DATA_BIND_CLICK)) {
        $tile.unbind("click.VSS.Agile");
        $tile.bind("click.VSS.Agile", Utils_Core.delegate(this, this._clickItem, $tile));
      }
      $tile.bind("mousedown", Utils_Core.delegate(this, this._mouseDown, $title));
      $tile.bind("mouseup", Utils_Core.delegate(this, this._mouseUp, $title));
      $titletext.hover(() => {
        this._attachTitleClickEvent($tile)
      })
    }
  }

  /**
   * Scroll the row as necessary to ensure that it appears in the view
   * 
   * @param $row The row to scroll into view. Only the first row matching the selection will be scrolled
   */
  private _scrollRowIntoView($row: JQuery): void {
    Diag.Debug.assertParamIsObject($row, "$row");

    // TODO: commenting out for the time being. We need to have a better implementation
    // than the one that the browser provides us because the taskboard column headers
    // are being scrolled out of view each time.
    // Option 1: Only scroll the view if the row doesn't appear in the current viewport
    // Option 2: Fix the taskboard so that the column headers don't scroll (in which case the following line is fine).

    //$row[0].scrollIntoView(true);
  }

  /**
   * dim/un-dim tiles not matching the current filter
   * 
   * @param $tile The tile
   * @param pivotValue The tile's pivot value (ParentID or AssignedTo value)
   * @param updateRow Indicates whether the corresponding row's filter status should be updated.
   * During bulk operations (e.g. page load or applying a new filter value) we don't want the row continually updated.
   */
  private _setTileFiltering(id, $tile: JQuery, pivotValue: any, updateRow: boolean): void {

    Diag.Debug.assertParamIsObject($tile, "$tile");
    Diag.Debug.assertParamIsNotUndefined(pivotValue, "pivotValue");
    Diag.Debug.assertParamIsBool(updateRow, "updateRow")

    var matchesFilter = (this._model.matchesFilter(id)),
      $row;

    var isParentTile = $tile.hasClass("parentTbTile");

    // toggle the class if our dimmed state is not correct and if it is not a parent tile
    if (!isParentTile) {
      $tile.toggleClass("tile-dimmed", !matchesFilter);
      this._updateTileColors($tile, id, matchesFilter);
    }

    // User story(Parent tile) do not contribute to the expand/collapse behavior
    if (matchesFilter && !isParentTile) {
      // ensure the pivotValue is in the _filteredRows collection if our tile matches
      this._filteredRows[pivotValue] = true;
    }

    // update row if we're not executing during view construction
    if (updateRow) {
      $row = $tile.closest(TaskBoardView.ROW_CSS_SELECTOR);
      this._showTileRow($row, true);
    }
  }

  /**
   * Update the row visibility to only show rows that have tiles matching the current filter
   */
  private _setAllRowsFiltering(): void {
    var i, l,
      $rows = this._getTileRows(),
      $row,
      $firstRow;
    const filterManager = this._model.getFilterManager();
    const showAll = this._useNewTaskboardDisplay ? (!filterManager.isFiltering()) : this._model.getFilter() === null; // No filter applied

    for (i = 0, l = $rows.length; i < l; i += 1) {
      $row = $rows.eq(i);

      // show the row if the filter is set to 'All' or the row appears in the collection of rows
      // that have tiles matching the current filter. The collection is populated when we check
      // set individual tiles filtering
      const id = $row.data(TaskBoardView.DATA_PIVOT_KEY);
      let show = showAll
        || Boolean(this._filteredRows[id])
        || (this._useNewTaskboardDisplay && filterManager.filter().indexOf(id) !== -1);

      if (show && this._classificationType === TaskboardGroupBy.PARENT_CLASSIFICATION) {
        var pivotKey = $row.data(TaskBoardView.DATA_PIVOT_KEY);
        if (pivotKey !== TaskBoardModel.NULL_PIVOT_KEY) {
          show = !this._model.isStateComplete(pivotKey);
        }
      }

      this._showTileRow($row, show, /*Do not update the expand/collapse all button*/ false);

      // capture the first row with a tile matching the filter
      if (show && !$firstRow) {
        $firstRow = $row;
      }
    }

    // Needed to determine state of all rows because we skipped it in showTileRow
    let areAllCollapsed = this._areAllRowsCollapsed();
    this._toggleExpandAllButton(areAllCollapsed);

    // scroll first matching row (if any) into view
    if ($firstRow) {
      this._scrollRowIntoView($firstRow);
    }
  }

  /**
   * Ensure the tile row has the appropriate visibility.
   * When the tile row is visible the summary row is hidden (and vice versa)
   * 
   * @param $row The row to set the visibility for
   * @param show true if the tile (detail) row should be visible,
   *                                   false if the summary row should be visible.
   */
  public _showTileRow($row: JQuery, show: boolean, updateCollapseAllButton: boolean = true): void {
    Diag.Debug.assertParamIsObject($row, "$row");
    Diag.Debug.assert($row.length === 1, "Expected $row to have exactly one match");
    Diag.Debug.assertParamIsBool(show, "show");

    var visible = ($row[0].style.display !== "none");

    // set visibility
    if (show !== visible) {
      updateCollapseAllButton ? this._toggleRowVisibilityAndUpdateCollapseAllButton($row.data(TaskBoardView.DATA_CLASSIFICATION_DATA), null) :
        this._toggleRowVisibility($row.data(TaskBoardView.DATA_CLASSIFICATION_DATA), null)
    }
  }

  private _isAdvancedBacklogManagement(): boolean {
    return haveBacklogManagementPermission();
  }

  private _getCardContext(workItemId: number): CardControls.IRenderCardContext {
    return {
      teamId: this._teamId,
      projectName: TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.name,
      workItemTypeName: this._model.getFieldValue(workItemId, DatabaseCoreFieldRefName.WorkItemType)
    };
  }

  public dispose() {
    if (this._cardRenderer) {
      this._cardRenderer.disposeCard(this._$container);
    }

    this._disposeContextMenu();

    // Tear down all the add buttons
    for (var key in this._addNewItemControls) {
      const addControl = this._addNewItemControls[key];
      const $addControlWrapper = addControl.getElement().parent();
      addControl.dispose();

      $addControlWrapper.unbind("keydown.VSS.Agile");
      $addControlWrapper.remove();
    }

    // Tear down all the work items & rows
    const $rows = this._getAllRows();
    $rows.each((i, row) => {
      const $row = $(row);
      const cellChildTiles = $("." + TaskBoardView.TILE_CSS_CLASS + ":not(.ui-draggable-dragging)", $row).toArray();
      this._detachTiles($row, cellChildTiles);
      $row.remove();
      row = null;
    });

    if (this._$tableBody) {
      this._$tableBody.remove();
      this._$tableBody = null;
    }

    if (this._$tableHeader) {
      this._$tableHeader.remove();
      this._$tableHeader = null;
    }

    if (this._$tableHeaderContainer) {
      this._$tableHeaderContainer.unbind("scroll");
      this._$tableHeaderContainer.remove();
      this._$tableBodyContainer = null;
    }

    if (this._zeroDataContainer) {
      ReactDOM.unmountComponentAtNode(this._zeroDataContainer);
      this._zeroDataContainer = null;
    }

    if (this._messageArea) {
      this._messageArea.clear();
    }
    if (this._model) {
      this.detachFilterEvents(this._model.getFilterManager());
    }

    if (this._$messageArea) {
      this._$messageArea.remove();
    }

    this._model = null;
    this._tileCache = null;
    this._cellLookupTable = null;

    this._shortcutGroup.dispose();
    $(window).unbind("resize", this.resize);
  }
}

VSS.initClassPrototype(TaskBoardView, {
  _container: null,
  _tableBody: null,
  _tableHeader: null,
  _tableHeaderContainer: null,
  _tableBodyContainer: null,
  _model: null,
  _cellLookupTable: null,
  _events: null,
  _classificationType: null,
  _templateFieldRegExp: null,
  _viewState: null,
  _acceptHandlerCurry: null,
  _highlightRowCurry: null,
  _viewDisplayed: false,
  _tileCache: null,
  _rowId: 0,
  _filteredRows: null,
  _mousedownX: 0,
  _mousedownY: 0,
  _rowPivotKeyMap: null,
  _currentHoveredDroppable: null,
  _currentPaintedDroppable: null,
  _parentContentTemplate: null,
  _summaryContentTemplate: null,
  _messageArea: null,
});


export class TaskboardAddNewItemControl extends TFS_Agile_Controls.AddNewItemControl {

  constructor(options?: TFS_Agile_Controls.IAddNewItemControlOptions) {
    super(options);

    this._addIconCssClass = "bowtie-icon " + TaskBoardView.ADD_NEW_CARD_ICON_CLASS;
    this._onHide = this.onHideCleanupPopupMenu;
    this._options.popupMenuAlign = "left-top";
  }

  public initialize() {
    super.initialize();

    var $element = this.getElement();

    if (!this._options.addIconCssClass) {
      $element.find("." + TFS_Agile_Controls.AddNewItemControl.displayTextCssClass).hide();
      $element.closest(".taskboard-cell").css("padding-bottom", "40px");
    }

    // Taskboard add button should use short cut and not tab index
    $element.attr("tabindex", -1);

    $element.off("click.TFS.Agile");

    $element.bind("click.TFS.Agile", (event: JQueryMouseEventObject) => {
      var itemTypes = this._itemTypes;
      if (itemTypes.length > 1) {
        this._element.closest(TaskBoardView.ROW_CSS_SELECTOR).off("mouseleave");
        this._element.closest(TaskBoardView.ROW_CSS_SELECTOR).bind("mouseleave", (e: JQueryKeyEventObject) => {
          $(e.currentTarget).removeClass("hover");
        });
      }
      this._clickHandler(event);
    }).bind("mouseenter", (e: JQueryKeyEventObject) => {
      $(e.currentTarget).addClass("wide");
      $(e.currentTarget).find("." + TFS_Agile_Controls.AddNewItemControl.displayTextCssClass).stop().fadeIn(300);
    }).bind("mouseleave", (e: JQueryKeyEventObject) => {
      $element.find("." + TFS_Agile_Controls.AddNewItemControl.displayTextCssClass).stop().fadeOut(200);
      $(e.currentTarget).removeClass("wide");
    }).focus(() => {
      this._element.find("." + TaskBoardView.ADD_NEW_CARD_ICON_CLASS).addClass("enabled");
      this._element.addClass("wide");
      this._element.find("." + TFS_Agile_Controls.AddNewItemControl.displayTextCssClass).stop().fadeIn(300);
    }).blur(() => {
      var closest_row = $(this).closest(TaskBoardView.ROW_CSS_SELECTOR);
      if (!closest_row.hasClass('hover')) {
        this._element.find("." + TaskBoardView.ADD_NEW_CARD_ICON_CLASS).removeClass("enabled");
      }
      this._element.find("." + TFS_Agile_Controls.AddNewItemControl.displayTextCssClass).stop().fadeOut(200);
      this._element.removeClass("wide");
    });

  }

  public onHideCleanupPopupMenu(escapeFocusReceiver: JQuery) {
    // If the popup menu is already escaped no need to escape it.
    if (!escapeFocusReceiver) {
      return;
    }
    escapeFocusReceiver.find(".text").stop().fadeOut(200);
    escapeFocusReceiver.removeClass("wide");
    var closest_row = escapeFocusReceiver.closest(TaskBoardView.ROW_CSS_SELECTOR);
    if (!closest_row.hasClass('hover')) {
      escapeFocusReceiver.find("." + TaskBoardView.ADD_NEW_CARD_ICON_CLASS).removeClass("enabled");
    }

    escapeFocusReceiver.closest(TaskBoardView.ROW_CSS_SELECTOR).off("mouseleave");
    escapeFocusReceiver.closest(TaskBoardView.ROW_CSS_SELECTOR).bind("mouseleave", (e: JQueryKeyEventObject) => {
      var add_card = $(e.currentTarget).find(".board-add-card");
      if (!add_card.is(':focus')) {
        add_card.find("." + TaskBoardView.ADD_NEW_CARD_ICON_CLASS).removeClass("enabled");
      }
      $(e.currentTarget).removeClass("hover");
    });
  }

  public dispose() {
    var $element = this.getElement();
    $element.unbind("click.TFS.Agile");
    $element.unbind("mouseenter");
    $element.unbind("mouseleave");
    $element.remove();

    super.dispose();
  }
}


export class TaskBoardViewState {

  public static CLIENT_ERROR: number = 1;
  public static SERVER_ERROR: number = 2;

  private _errorCache: any;
  private _savingCache: any;

  constructor() {
    this._errorCache = {};
    this._savingCache = {};
  }

  /**
   * Set Error associated with work item
   * 
   * @param id workitem id
   * @param errorType type of error
   */
  public setError(id: number, errorType: number) {
    this._errorCache[id] = errorType;
  }

  /**
   * Clear Error associated with work item
   * 
   * @param id workitem id
   */
  public clearError(id: number) {
    delete this._errorCache[id];
  }

  /**
   * return error associated with work item
   * 
   * @param id workitem id
   */
  public getError(id: number) {
    return this._errorCache[id];
  }

  /**
   * set Save Data associated with work item
   * 
   * @param id workitem id
   * @param save type of error
   */
  public setSaveData(id: number, save: any) {
    this._savingCache[id] = save;
  }

  /**
   * clear Save Dataassociated with work item
   * 
   * @param id workitem id
   */
  public clearSaveData(id: number) {
    delete this._savingCache[id];
  }

  /**
   * return Save Data associated with work item
   * 
   * @param id workitem id
   */
  public getSaveData(id: number) {
    return this._savingCache[id];
  }
}

VSS.initClassPrototype(TaskBoardViewState, {
  _errorCache: null,
  _savingCache: null
});




