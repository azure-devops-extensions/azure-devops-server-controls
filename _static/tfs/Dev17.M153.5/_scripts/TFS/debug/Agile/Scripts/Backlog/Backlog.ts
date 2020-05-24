/*tslint:disable:member-ordering*/
/// <reference types="jquery" />
import Q = require("q");

import "VSS/LoaderPlugins/Css!Agile/Backlog/Backlogs";
import AdminSendMail_Async = require("Admin/Scripts/TFS.Admin.SendMail");
import { BacklogExpandCollapseButtonBehavior } from "Agile/Scripts/Backlog/BacklogExpandCollapseButtonBehavior";
import { BacklogBehaviorConstants } from "Agile/Scripts/Backlog/Constants";
import { IBacklogGridItem } from "Agile/Scripts/Backlog/Events";
import AddPanel_Async = require("Agile/Scripts/Backlog/ProductBacklogAddPanel");
import TFS_Agile_ProductBacklog_ContextMenu = require("Agile/Scripts/Backlog/ProductBacklogContextMenu");
import TFS_Agile_ProductBacklog_DM = require("Agile/Scripts/Backlog/ProductBacklogDataManager");
import TFS_Agile_ProductBacklog_Grid = require("Agile/Scripts/Backlog/ProductBacklogGrid");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import { AddItemInsertLocation } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCallout";
import TFS_Agile_Controls = require("Agile/Scripts/Common/Controls");
import { haveBacklogManagementPermission } from "WorkItemTracking/Scripts/Utils/PermissionHandler";
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import { IBacklogMembershipEvaluator } from "Agile/Scripts/Common/IBacklogMembershipEvaluator";
import TFS_Agile_Utils = require("Agile/Scripts/Common/Utils");
import TFS_Agile_WorkItemChanges = require("Agile/Scripts/Common/WorkItemChanges");
import AgileResources = require("Agile/Scripts/Resources/TFS.Resources.Agile");
import AgileProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import {
    BacklogConfigurationService,
    BacklogFieldTypes,
    IBacklogLevelConfiguration,
    WorkItemStateCategory
} from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import TFS_RowSavingManager = require("Presentation/Scripts/TFS/FeatureRef/RowSavingManager");
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Grids = require("VSS/Controls/Grids");
import Menus = require("VSS/Controls/Menus");
import Navigation = require("VSS/Controls/Navigation");
import Notifications = require("VSS/Controls/Notifications");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Diag = require("VSS/Diag");
import VSSError = require("VSS/Error");
import Events_Action = require("VSS/Events/Action");
import Events_Handlers = require("VSS/Events/Handlers");
import * as Events_Services from "VSS/Events/Services";
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Telemetry = require("VSS/Telemetry/Services");
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import { FilterBar } from "WorkItemTracking/Scripts/Controls/Filters/FilterBar";
import QueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import EmailWorkItemsModel_Async = require("WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems");
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { IColumnOptionsPanelDisplayColumn, IColumnOptionsResult, IDisplayColumnResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { IColumnOptionsPanelProps, showColumnOptionsPanel } from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnOptionsPanel";
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IDeleteEventArguments, IRecycleBinOptions, RecycleBin } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";
import { WorkItemEvents } from "WorkItemTracking/Scripts/Utils/Events";
import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");
import { QuerySaveDialogMode, QueryItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { MyQueriesFolderName } from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { IWorkItemDragInfo } from "Agile/Scripts/Common/IWorkItemDragInfo";
import { showDialog } from "WorkItemTracking/Scripts/Queries/Components/QuerySaveDialog.Renderer";

// Important: Only use type information from the imports.
// Otherwise it will be a real dependency and break the async loading.
const delegate = Utils_Core.delegate;
const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
const TeamAwarenessService = TFS_TeamAwarenessService.TeamAwarenessService;
const WorkItemUtils = TFS_Agile_Utils.WorkItemUtils;
const getErrorMessage = VSS.getErrorMessage;
const globalEvents = Events_Services.getService();

export interface IExpandCollapse {
    isExpanded(workItemId: number);
    expand(workItemId: number);
    collapse(workItemId: number);
}

export enum AddBacklogItemStatus {
    Added = 1,
    WorkItemFormOpened = 2
}

export class QuickExpandCollapseBehavior {
    constructor(private _itemHierarchy: TFS_Agile_WorkItemChanges.IItemHierarchy, private _expandCollapseHelper: IExpandCollapse) {
    }

    /**
     * Expands the shallowest level in given itemHierarchy by one level
     */
    public expandShallowestLevel() {

        let item = 0; // Parent of first level items
        let itemsCurrentLevel = this._itemHierarchy.children(item);
        let itemsNextLevel: number[] = [];
        let itemsToBeCollapsed: number[] = [];

        // Using breadth first search, iterate over the itemHierarchy to find items in shallowest level that can be expanded
        while (itemsCurrentLevel.length > 0) {
            item = itemsCurrentLevel.pop();

            if (!this._expandCollapseHelper.isExpanded(item)) {
                itemsCurrentLevel.push(item);
                break;
            }
            else {
                itemsNextLevel = itemsNextLevel.concat(this._itemHierarchy.children(item));
            }
            if (itemsCurrentLevel.length === 0 && itemsNextLevel.length > 0) {
                itemsCurrentLevel = itemsNextLevel;
                itemsNextLevel = [];
            }
        }

        // Expand the items by one level and collapse their immediate children
        $.each(itemsCurrentLevel, (idx, id) => {
            if (!this._expandCollapseHelper.isExpanded(id)) {
                this._expandCollapseHelper.expand(id);
                itemsToBeCollapsed = itemsToBeCollapsed.concat(this._itemHierarchy.children(id));
            }
        });

        // Collapse direct children of recently expanded items
        $.each(itemsToBeCollapsed, (idx, id) => {
            this._expandCollapseHelper.collapse(id);
        });
    }

    /**
     * Collapse the deepest level in given itemHierarchy by one level
     */
    public collapseDeepLevel() {

        let item = 0; // parent of first level items
        let itemsCurrentLevel = this._itemHierarchy.children(item);
        let itemsCurrentLevel_evaluated: number[] = [];
        let itemsNextLevel: number[] = []; // Items in the next level that are visible
        let itemsPrevLevel: number[] = []; // Keeps track of expanded items in previous level

        // Using breadth first search, iterate over the itemHierarchy to find items in deepest level (visible)
        while (itemsCurrentLevel.length > 0) {
            item = itemsCurrentLevel.pop();

            let childrenOfCurrentItem = this._itemHierarchy.children(item);
            if (childrenOfCurrentItem && childrenOfCurrentItem.length > 0) {
                itemsNextLevel = itemsNextLevel.concat(childrenOfCurrentItem);
                itemsCurrentLevel_evaluated.push(item);
            }

            if (itemsCurrentLevel.length === 0) {
                if (itemsNextLevel.length > 0) {
                    itemsPrevLevel = itemsCurrentLevel_evaluated;
                    itemsCurrentLevel = itemsNextLevel;
                    itemsNextLevel = itemsCurrentLevel_evaluated = [];
                }
                else {
                    break;
                }
            }
        }

        // Collapse the deepest visible rows in itemHierarchy by one level
        $.each(itemsPrevLevel, (idx, id) => {
            this._expandCollapseHelper.collapse(id);
        });
    }
}

export class ProductBacklogItemHierarchyAdapter implements TFS_Agile_WorkItemChanges.IItemDataHierarchy<TFS_Agile_WorkItemChanges.IWorkItemHierarchyData>{

    public static ITEM_NOT_PRESENT: number = 0; // Is either an unparented item, or is the top level item in the backlog
    public static CHILDREN_NOT_PRESENT: number[] = [];

    private _productBacklogDataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager;
    private _getWorkItemTypeAndState: (workItemId: number) => [string, string];
    private _isExpanded: (workItemId: number) => boolean;

    /**
     * Build the adapter for the data manager
     *
     * @param dataManager The Data Manager that we're encapsulating/adapting
     * @param getWorkItemTypeAndState Temporary method to retrieve the work item type for a given work item id. 
     * This is needed here because the DataManager's method relies on a separate JSON data island
     * to contain the mapping data. That data island isn't always available to the client needs
     * to supply the appropriate method.
     */
    constructor(dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager, getWorkItemTypeAndState: (workItemId: number) => [string, string], isExpanded: (workItemId: number) => boolean) {
        Diag.Debug.assertParamIsNotNull(dataManager, "dataManager");
        Diag.Debug.assertParamIsNotNull(getWorkItemTypeAndState, "getWorkItemTypeAndState");

        this._productBacklogDataManager = dataManager;
        this._getWorkItemTypeAndState = getWorkItemTypeAndState;
        this._isExpanded = isExpanded;
    }

    public nextSibling(workItemId: number): number {
        if (workItemId) {
            let workItemOrder = this._productBacklogDataManager.getWorkItemOrder(workItemId);
            let nextSiblingWorkItemId = this._productBacklogDataManager.getNextWorkItemId(workItemOrder);
            return (nextSiblingWorkItemId === 0) ? ProductBacklogItemHierarchyAdapter.ITEM_NOT_PRESENT : nextSiblingWorkItemId;
        }
        return null;
    }

    public previousSibling(workItemId: number): number {
        if (workItemId) {
            let workItemOrder = this._productBacklogDataManager.getWorkItemOrder(workItemId);
            let prevSiblingWorkItemId = this._productBacklogDataManager.getPrevWorkItemId(workItemOrder);
            return (prevSiblingWorkItemId === 0) ? ProductBacklogItemHierarchyAdapter.ITEM_NOT_PRESENT : prevSiblingWorkItemId;
        }
        return null;
    }

    public parent(workItemId: number): number {
        if (workItemId) {
            let workItemOrder = this._productBacklogDataManager.getWorkItemOrder(workItemId);
            let parentWorkItemId = this._productBacklogDataManager.getParentWorkItemId(workItemOrder);
            return (parentWorkItemId === 0) ? ProductBacklogItemHierarchyAdapter.ITEM_NOT_PRESENT : parentWorkItemId;
        }
        return null;
    }

    public children(workItemId: number): number[] {
        if (workItemId === 0 || this._isExpanded(workItemId)) {
            let childWorkItemIds = this._productBacklogDataManager.getChildrenWorkItemIds(workItemId);
            return childWorkItemIds ? childWorkItemIds : ProductBacklogItemHierarchyAdapter.CHILDREN_NOT_PRESENT;
        }
        return ProductBacklogItemHierarchyAdapter.CHILDREN_NOT_PRESENT;
    }

    /** 
     * Returns the depth of the work item in the hierarchy
     * Returns 1 for a top level item. Returns 0 if the workItemId is 0
     * @param workItemId
     */
    public depth(workItemId: number): number {
        let depth: number = 0;
        let currentId = workItemId;

        // Walk up the tree till the ancestor has no parent
        while (currentId) {
            ++depth;
            currentId = this.parent(currentId);
        }

        return depth;
    }

    public getData(workItemId: number): TFS_Agile_WorkItemChanges.IWorkItemHierarchyData {
        if (workItemId) {
            let workItemTypeAndState = this._getWorkItemTypeAndState(workItemId);

            return {
                id: workItemId,
                type: workItemTypeAndState[0],
                state: workItemTypeAndState[1],
                isOwned: this._productBacklogDataManager.isOwnedItem(workItemId)
            }
        }
        return null;
    }
}

export interface IBacklogErrorActionArgs {
    message: string;
    content?: JQuery;
}

export interface IBacklogEventHandler<TArgs> extends IEventHandler {
    (sender: any, args: TArgs): void;
}

export interface IBacklogWorkItemChangeIterationResult {
    /** Ids of items being dropped */
    workItemIds: number[];

    /** Value indicating whether the operation was successful */
    success: boolean;

    /** If dropped to an iteration, the new iteratin path */
    newIterationPath?: string;

    /** If child work items have been moved/reassigned */
    childWorkItems?: number[];
}

export interface BacklogOptions {
    /** Element to create the backlog in */
    $backlogElement: JQuery;

    /** Event helper to assist with disposing events */
    eventHelper: ScopedEventHelper;

    /** Is the backlog being created in the new xhr hub */
    isNewHub: boolean;

    /** Grid options which include source data */
    gridOptions: TFS_Agile_ProductBacklog_Grid.ProductBacklogGridOptions;

    /** Defer creating the grid until async backlog payload is delivered */
    deferInitialization?: boolean;

    reorderManager: TFS_Agile.IReorderManager;

    /** Callback for when column option changes have been submitted/saved */
    onColumnsChanged?: () => void;
}

export abstract class Backlog implements IDisposable {
    public static readonly EVENTS_DROP_WORK_ITEM_COMPLETED = "drop-work-item-completed";
    public static readonly CSS_GRID = "productbacklog-grid-results";
    public static readonly CMD_GENERATE_QUERY = "agile-generate-query";
    public static readonly CMD_COLUMN_OPTIONS = "agile-column-options";
    public static readonly CMD_EXPAND_ALL = "expand-all";
    public static readonly CMD_COLLAPSE_ALL = "collapse-all";
    public static readonly CMD_EXPAND_ONE_LEVEL = "expand-one-level";
    public static readonly CMD_COLLAPSE_ONE_LEVEL = "collapse-one-level";
    public static readonly CMD_TOGGLE_ADD_PANEL = "toggle-add-panel";
    public static readonly CMD_TOGGLE_FILTER = "toggle-filter";
    public static readonly SHOW_REFRESH_WARNING = "backlog-refresh-warning";
    public static readonly CSS_BACKLOGS_COMMON_MENUBAR = ".backlogs-common-menubar";
    public static readonly ADD_PANEL_VISIBLE_STATE_KEY = "AgileBacklog.AddPanelVisibleState";
    public static readonly CSSCLASS_INSERTION_HIGHLIGHT_TOP = "grid-row-insertion-highlight-top";
    public static readonly CSSCLASS_INSERTION_HIGHLIGHT_BOTTOM = "grid-row-insertion-highlight-bottom";

    private readonly filterMenuItem: Menus.IMenuItemSpec = {
        id: Backlog.CMD_TOGGLE_FILTER,
        text: VSS_Resources_Common.Filter,
        title: VSS_Resources_Common.FilterToolTip,
        setTitleOnlyOnOverflow: true,
        showText: false,
        icon: "bowtie-icon bowtie-search-filter",
        cssClass: "toggle-filter-bar"
    };

    protected _options: BacklogOptions;
    protected _gridOptions: any;
    protected _eventHelper: ScopedEventHelper;

    private _disposed: boolean;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _expandClickCount = 0;
    private _collapseClickCount = 0;
    private _sprintView: TFS_Agile_Controls.SprintViewControl;
    private readonly _telemetryQuickExpandCollapseDelay = 30 * 1000; // 30 Seconds
    private _workItemManager: WorkItemManager;
    private _messageSuppressor: TFS_Agile.IMessageSuppressor;
    private _messageArea: Notifications.MessageAreaControl;
    private _moveToIteration: TFS_Agile_Utils.MoveToIterationHelper;
    private _membershipTracker: TFS_Agile.MembershipTracker;
    protected _workItemIdsToRemove: IDictionaryNumberTo<number>;
    protected _workItemChangeEventHandler: IEventHandler;
    private _deleteItemsEventDelegate: Function;
    private _deleteItemsSucceededEventDelegate: Function;
    private _deleteItemsFailedEventDelegate: Function;
    private _recycleBin: RecycleBin;

    // Add Panel
    protected addPanel: AddPanel_Async.ProductBacklogAddPanel;
    // addPanelSettings is saved on the server, it contains settings other than the addPanel visibility.
    protected addPanelSettings: AddPanel_Async.IAddPanelSettings;
    protected addPanelVisible: boolean;
    private _addPanelBehavior: AddPanelBehavior;
    // Insertion line variables
    private _highlightedRow: JQuery;
    private _showAddPanelHighlight: boolean;
    private _insertionLineIndex: number;
    private _insertLocation: AddItemInsertLocation;
    private _insertEventsSetup: boolean;

    private _backlogLevelHelper: TFS_Agile_WorkItemChanges.BacklogLevelHelper;

    protected _itemHierarchy: TFS_Agile_WorkItemChanges.IItemDataHierarchy<TFS_Agile_WorkItemChanges.IWorkItemHierarchyData>;
    protected _backlogContextMenuCreator: TFS_Agile_ProductBacklog_ContextMenu.BacklogContextMenuCreator;

    public _$element: JQuery;
    public _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid;
    public _toolbar: Menus.MenuBar;
    private _backlogsCommonMenubar: Menus.MenuBar;
    public _reorderManager: TFS_Agile.IReorderManager;
    public _teamSettings: TFS_AgileCommon.ITeamSettings;
    public _gridDataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager;
    private _reorderOperationQueue: TFS_Core_Utils.OperationQueue;
    public _backlogContext: TFS_Agile.BacklogContext;

    // Deprecated: Please try to use polymorphism instead of checking this flag
    public _isIterationBacklog: boolean;
    private _ownershipEvaluator: BacklogOwnershipEvaluator;
    private _expandCollapseBehavior: QuickExpandCollapseBehavior;

    /** Filter used to filter the current selection on the backlog */
    protected _selectionFilter: TFS_Agile_WorkItemChanges.ISelectionFilter;

    protected _addChildBehavior: AddChildTaskGridBehavior;
    protected _expandCollapseButtonsBehavior: BacklogExpandCollapseButtonBehavior;

    /** Indicates whether the common configuration dialog has been registered */
    protected _commonConfigurationRegistered: boolean;

    protected _filterManager: FilterManager;
    private _filterBar: FilterBar;

    // Events, delegates, and functions
    private _expandCollapseTelemetryDelayedFunc: Utils_Core.DelayedFunction;
    private _messageSuppressorFunction: Events_Action.IActionWorker;

    /**
     * Backlog is an abstract class that represent a generic backlog that show message area, grid and interact with sprint view control
     *
     * @param $backlogElement
     * @param evaluator
     * @param deferInitialization Defer full initialization of the control until a later time.
     */
    constructor(options: BacklogOptions) {
        Diag.Debug.assertParamIsNotNull(options.$backlogElement, "$backlogElement");
        Diag.Debug.assertParamIsNotNull(options.gridOptions, "gridOptions");

        this._options = options;
        this._backlogContext = TFS_Agile.BacklogContext.getInstance();
        this._eventHelper = options.eventHelper;
        this._events = new Events_Handlers.NamedEventCollection();
        this._$element = options.$backlogElement;
        this._workItemManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore));
        const teamAwareness: TFS_TeamAwarenessService.TeamAwarenessService = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TFS_TeamAwarenessService.TeamAwarenessService>(TeamAwarenessService);
        this._teamSettings = teamAwareness.getTeamSettings(this._backlogContext.team.id);
        this._isIterationBacklog = false;
        this._workItemIdsToRemove = {};

        this._setupBacklogMembershipTracking();

        if (options.deferInitialization) {
            return;
        }

        this.initialize();
    }

    public abstract getMoveToPositionHelper(): TFS_Agile_ProductBacklog_ContextMenu.MoveToPositionHelper;
    protected abstract _createMembershipEvaluator(dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager): IBacklogMembershipEvaluator;
    protected abstract _updateAddPanelDisabledState: () => void;
    protected abstract _getRecycleBinOptions(): IRecycleBinOptions;
    protected abstract _attachCommonConfigurationRegistration(): void;
    protected abstract _detachCommonConfigurationRegistration(): void;

    protected initialize() {
        if (!this._options.isNewHub) {
            this._createToolbar();
            this._createBacklogsCommonMenuBar();
            this._createRecycleBin();
        } else {
            // register commonSettingsConfiguration tabs
            this._attachCommonConfigurationRegistration();
        }

        this._attachWorkItemChangeEvent();

        this._attachBulkEditEvents();

        this._registerGridWorkItemFilter();

        this._registerBacklogQuerySaveCompleted();

        this._registerMessageListeners();
        this._reorderManager = this._options.reorderManager;
        this._reorderOperationQueue = new TFS_Core_Utils.OperationQueue();
        this._moveToIteration = new TFS_Agile_Utils.MoveToIterationHelper();

        this._registerMoveToIterationAction();

        TFS_Agile_Utils.enableDragCancelling();

        this._attachDeleteEvents();
    }

    public getAddPanel(): AddPanel_Async.ProductBacklogAddPanel {
        return this.addPanel;
    }

    private _attachBulkEditEvents() {
        this._eventHelper.attachEvent(WorkItemEvents.BEFORE_BULK_EDIT, this._beforeBulkEdit);
        this._eventHelper.attachEvent(WorkItemEvents.AFTER_BULK_EDIT, this._afterBulkEdit);
        this._eventHelper.attachEvent(WorkItemEvents.BULK_EDIT_ERROR, this._errorBulkEdit);
    }

    private _beforeBulkEdit = (): void => {
        this._getMessageSuppressor().suppressAll();
    }

    private _afterBulkEdit = (args): void => {
        TFS_Agile_ProductBacklog_ContextMenu.ContextMenuContributionUtils.bulkSaveSuccessHandler(args.workItems, args.changes);
        this._getMessageSuppressor().disableSuppressAll();
    }

    private _errorBulkEdit = (error): void => {
        this._getMessageSuppressor().disableSuppressAll();
        TFS_Agile_ProductBacklog_ContextMenu.ContextMenuContributionUtils.bulkSaveErrorHandler(error);
    }

    private _disposeRecycleBin() {
        if (this._recycleBin) {
            this._recycleBin.dispose();
            this._recycleBin = null;
        }
    }

    private _createRecycleBin() {
        this._disposeRecycleBin();
        const recycleBinOptions: IRecycleBinOptions = this._getRecycleBinOptions();
        this._recycleBin = <RecycleBin>Controls.Enhancement.enhance(RecycleBin, ".recycle-bin", recycleBinOptions);
    }

    private _detachDeleteEvents() {
        if (this._deleteItemsEventDelegate) {
            globalEvents.detachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._deleteItemsEventDelegate);
            this._deleteItemsEventDelegate = null;
        }
        if (this._deleteItemsSucceededEventDelegate) {
            globalEvents.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemsSucceededEventDelegate);
            this._deleteItemsSucceededEventDelegate = null;
        }
        if (this._deleteItemsFailedEventDelegate) {
            globalEvents.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._deleteItemsFailedEventDelegate);
            this._deleteItemsFailedEventDelegate = null;
        }
    }

    private _attachDeleteEvents() {
        this._detachDeleteEvents();
        this._deleteItemsEventDelegate = (startedArguments: IDeleteEventArguments) => {
            const workItemIds = startedArguments.workItemIds;
            const firstDeletedRowIndex = this._grid.getSelectedDataIndex();
            this._removeWorkItemsFromGrid(workItemIds);
            this._grid.setRowSelection(firstDeletedRowIndex);
        };
        globalEvents.attachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._deleteItemsEventDelegate);

        this._deleteItemsSucceededEventDelegate = (sender?: any, succeededArguments?: IDeleteEventArguments) => {
            if (succeededArguments && succeededArguments.refreshRequired) {
                // Show an appropriate message suggesting to refresh the backlog
                this.getMessageArea().setMessage(AgileProductBacklogResources.BacklogInfo_RefreshRequired, Notifications.MessageAreaType.Info);
            }
        };
        globalEvents.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemsSucceededEventDelegate);

        this._deleteItemsFailedEventDelegate = (message: string) => {
            this.getMessageArea().setError(message, () => {
                window.location.reload();
            });
        };
        globalEvents.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._deleteItemsFailedEventDelegate);
    }

    private _detachBulkEditEvents() {
        this._eventHelper.detachEvent(WorkItemEvents.BEFORE_BULK_EDIT, this._beforeBulkEdit);
        this._eventHelper.detachEvent(WorkItemEvents.AFTER_BULK_EDIT, this._afterBulkEdit);
        this._eventHelper.detachEvent(WorkItemEvents.BULK_EDIT_ERROR, this._errorBulkEdit);
    }

    private _registerMoveToIterationAction() {
        Events_Action.getService().registerActionWorker(TFS_Agile.Actions.BACKLOG_MOVE_TO_ITERATION, this._setIterationPath);
    }

    private _setIterationPath = (actionArgs: TFS_Agile.IMoveToIterationActionArgs, next): void => {
        const workItemIds: number[] = actionArgs.workItemIds;
        const iterationPath: string = actionArgs.iterationPath;
        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (BulkEdit) => {
            BulkEdit.bulkUpdateWorkItems(
                tfsContext,
                workItemIds,
                [{ fieldName: "System.IterationPath", value: iterationPath }],
                {
                    immediateSave: true,
                    beforeSave: delegate(this, this._beforeIterationPathChange),
                    afterSave: delegate(this, this._afterIterationPathChange)
                },
                TFS_Agile_ProductBacklog_ContextMenu.ContextMenuContributionUtils.bulkSaveErrorHandler);
        });
    }

    private _beforeIterationPathChange(workItems: WITOM.WorkItem[]) {
        this._suppressWorkItems(workItems);
        this.getGrid().markRowsAsSaving(workItems);
    }

    private _afterIterationPathChange(workItems: WITOM.WorkItem[], changes: any[]) {
        let iterationPath = changes[0].value;

        for (let workItem of workItems) {
            // We pass the _isWorkItemInRequirementsBacklog as a callback to beginUpdateChildWorkItems(). This callback is used to check the 
            // child workItems that need be ignored (i.e. items that appear on the backlog). We want only the immediate child of type Task category getting 
            // updated along with the backlog item. This is specifically for "nested backlog items". Nested backlog items and their tasks 
            // should not be updated along with the parent backlog item. 
            // We also preprocess the children, to suppress membership evaluation

            TFS_Agile_Utils.WorkItemUtils.beginUpdateChildWorkItems(workItem,
                false,
                WITConstants.CoreField.IterationPath,
                iterationPath,
                (wi: WITOM.WorkItem) => this._isWorkItemInRequirementsBacklog(wi),
                () => {
                    if (!this.isDisposed) {
                        this.getGrid().clearRowsAsSaving(workItems);
                        this._unsuppressWorkItems(workItems);

                        //NOTE: this action worker is currently only registered for iteration backlog, so this is a no-op for all other scenarios
                        Events_Action.getService().performAction(TFS_Agile.Actions.VERIFY_MEMBERSHIP_EXPLICIT, { workItems: workItems });
                    }
                },
                TFS_Agile_ProductBacklog_ContextMenu.ContextMenuContributionUtils.bulkSaveErrorHandler,
                TFS_Agile_Utils.WorkItemUtils.getShouldUpdateMethodForIterationAssignment(workItem, iterationPath),
                (childWorkItems: WITOM.WorkItem[]) => {
                    this._suppressWorkItems(childWorkItems);
                });
        }
    }

    /**
     * Suppress Messages for WorkItems
     */
    protected _suppressWorkItems(workItems: WITOM.WorkItem[]) {
        this.suppressMembershipEvaluation(workItems.map(x => x.id));
    }

    /**
     * Unsuppress Messages for WorkItems and their children
     */
    protected _unsuppressWorkItems(workItems: WITOM.WorkItem[]) {
        let workItemIds: number[] = workItems.map(x => x.id);

        //Unsuppress the child items
        for (let id of workItemIds) {
            let childWorkItemIds: number[] = this.getGridDataManager().getDescendantWorkItemIds(id) || [];
            this.unsuppressMembershipEvaluation(childWorkItemIds);
        }

        //Unsuppress the parents
        this.unsuppressMembershipEvaluation(workItemIds);
    }

    public openAddChild() {
        let rowInfo: Grids.IGridRowInfo = this._grid.getSelectedRowInfo();
        this._addChildBehavior.openAddChild(rowInfo);
    }

    protected _focusBacklogGrid() {
        if (this._grid.getSelectionCount() <= 0 && this._grid.getTotalRows() > 0) {
            // Nothing is selected and there are rows in the grid
            // So Select the first row and bring focus to the grid

            this._grid.focus(0);
            this._grid._addSelection(0);
        }
    }

    /**
     * Gets the container for the add panel. (It may be empty as the add panel may not have been created yet)
     */
    public getAddPanelContainer(): JQuery {
        return $(".add-panel-data:first", this.getElement());
    }

    protected readAddPanelVisibleSetting(): void {
        // get initial visible state from local storage here if not there an initial state must be hard coded here.
        let settingsService = TFS_OM_Common.Application.getConnection(tfsContext).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
        let settingValue = settingsService.readLocalSetting(Backlog.ADD_PANEL_VISIBLE_STATE_KEY, TFS_WebSettingsService.WebSettingsScope.User);
        if (!settingValue) {
            // default value of addPanelVisibleSetting is true
            settingValue = "true";
        }
        this.addPanelVisible = settingValue === "true";
    }

    protected writeAddPanelVisibleSetting(): void {
        let settingsService = TFS_OM_Common.Application.getConnection(tfsContext).getService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService);
        settingsService.writeLocalSetting(Backlog.ADD_PANEL_VISIBLE_STATE_KEY, "" + this.addPanelVisible, TFS_WebSettingsService.WebSettingsScope.User);
    }

    /**
     * Tries to create the add panel if the inner json island indicates visible.
     * 
     * @param forceInitialize Force the creation, regardless of the json island.
     */
    public initializeAddPanel(forceInitialize?: boolean): IPromise<any> {

        // We create the add panel if the filter is turned on
        if ((!this.addPanel && this.addPanelVisible === true) || forceInitialize) {
            // Asynchronously initialize add panel
            const addPanelAnnouncer = new ProgressAnnouncer({
                announceStartMessage: AgileProductBacklogResources.ProductBacklogLoading_AddPanelStart,
                announceEndMessage: AgileProductBacklogResources.ProductBacklogLoading_AddPanelEnd,
                announceErrorMessage: AgileProductBacklogResources.ProductBacklogLoading_AddPanelError
            });
            this.addPanelSettings.announcer = addPanelAnnouncer;
            return VSS.requireModules(["Agile/Scripts/Backlog/ProductBacklogAddPanel"])
                .spread((AddPanel: typeof AddPanel_Async) => {
                    let $addPanel = this.getAddPanelContainer();

                    this.addPanel = new AddPanel.ProductBacklogAddPanel(this.addPanelSettings, $addPanel);
                    // Only set up the add panel's row highlight on the first display of the add panel
                    let initialDisplayCompleteHandler = () => {
                        let grid = this.getGrid();
                        Diag.Debug.assert(Boolean(grid), "The grid should be drawn prior to any add panel display complete events firing");

                        this._setupAddPanelRowHighlight();
                        this.addPanel.detachDisplayCompleteEvent(initialDisplayCompleteHandler);
                    };

                    // Resize the grid (fixing the height) whenever the add panel display state changes
                    let resizeDisplayCompleteHandler = () => {
                        let grid = this.getGrid();
                        Diag.Debug.assert(Boolean(grid), "The grid should be drawn prior to any add panel display complete events firing");
                        grid.resize();
                    }

                    this.addPanel.registerDisplayCompleteEvent(initialDisplayCompleteHandler);
                    this.addPanel.registerDisplayCompleteEvent(resizeDisplayCompleteHandler);
                    this.addPanel.registerAddEvent(delegate(this, this.addWorkItem));
                    // We need a hook into when the close button is pressed on the add panel so we can switch the state of the add items filter to off
                    this.addPanel.registerCloseEvent(() => this.setAddPanelState(false));
                    this.addPanel.render();
                });
        }
        else {
            return Q(null);
        }
    }

    protected _toggleAddPanel() {
        this.setAddPanelState(!this.addPanelVisible);
    }

    public setAddPanelState(show: boolean) {
        // Only the old hub has the add panel
        if (!this._options.isNewHub) {
            let priorVisibleState = this.addPanelVisible;
            this.addPanelVisible = show;

            let showHideAddPanel = (showPanel: boolean) => {
                if (!this.addPanel) {
                    return;
                }

                if (showPanel) {
                    this.addPanel.show();
                    this._updateAddPanelDisabledState();
                }
                else {
                    this.addPanel.hide();
                }
            };

            if (show) {
                if (!this.addPanel) {
                    this.initializeAddPanel(true).then(
                        () => {
                            showHideAddPanel(true);
                        }
                    );
                }
                else {
                    showHideAddPanel(true);
                }
            }
            else {
                showHideAddPanel(false);
            }

            // Update any consequences of toggling the panel.
            if (this.addPanelVisible !== priorVisibleState) {
                this.writeAddPanelVisibleSetting();
                this._refreshToolbarCommandStates();
            }
        }
    }

    public _registerMessageListeners() {
        Events_Action.getService().registerActionWorker(Backlog.SHOW_REFRESH_WARNING, (actionArgs, next) => {
            this._showRefreshMessage();
        });

        Events_Action.getService().registerActionWorker(TFS_Agile.Actions.BACKLOG_SHOW_ERROR_MESSAGE, (actionArgs: IBacklogErrorActionArgs, next) => {
            this.getMessageArea().setMessage({
                header: actionArgs.message,
                content: actionArgs.content
            }, Notifications.MessageAreaType.Error);
        });
    }

    public _checkLimit() {
        return;
    }

    public _refreshDisplay() {
        return;
    }

    /**
     * Gets the backlog query wiql and query name
     * 
     * @param fields List of fields to include in the query
     * @param success Success callback
     * @param error Error callback
     */
    public _beginGetBacklogQuery(fields: string[], success: IResultCallback, error?: IErrorCallback) {
        return;
    }

    /**
     * Gets the default backlog query name
     */
    public _getBacklogQueryName(): string {
        throw new Error("This is an abstract method.");
    }

    /**
     * Persist the column state
     * 
     * @param columns List of column definitions
     * @param callback The callback to invoke on completion
     */
    public _saveColumns(columns: Grids.IGridColumn[], callback?: IResultCallback) {
        return;
    }

    /**
     * Updates the column state from dialog results
     * 
     * @param columns List of column definitions
     * @param callback The callback to invoke on completion
     */
    public _saveDialogResultsColumns(columns: IDisplayColumnResult[], callback?: IResultCallback) {
        return;
    }

    /**
     * Sets up the handler for membership evaluated notifications
     */
    public _setupMembershipEvaluation() {
        this._eventHelper.attachEvent(TFS_Agile.Notifications.MEMBERSHIP_EVALUATED, this._processMembershipEvaluation);

        // React to changes in page data
        this._grid.attachWorkItemPagedEvent((grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, args: { workItemId: number; pageData: any }) => {
            // Check for changed ownership for newly paged in data
            let fieldIndex = grid.getColumnMap()[this._teamSettings.teamFieldName];
            let teamFieldValue = args.pageData[fieldIndex];
            if (teamFieldValue) {
                let evaluator = this._getOwnerShipEvaluator();
                evaluator.checkTeamFieldValue(teamFieldValue, isWorkitemOwned => {
                    this._gridDataManager.updateOwnedIds(args.workItemId, isWorkitemOwned);
                });
            }
        });
    }

    /**
     * Registers events to perform actions and react to notifications when changing a work item. This is so that we can
     * remove work items from the grid that no longer match the Backlog queries.
     */
    private _setupBacklogMembershipTracking() {
        this._membershipTracker = new TFS_Agile.MembershipTracker(this._eventHelper);

        Events_Action.getService().registerActionWorker(TFS_Agile.Actions.BACKLOG_BULK_EDIT_EVALUATE_MEMBERSHIP, this._bulkeditEvaluateMembership);
        Events_Action.getService().registerActionWorker(TFS_Agile.Actions.EVALUATE_MEMBERSHIP, this._evaluateMembershipAction);
    }

    private _evaluateMembership(workItem: WITOM.WorkItem, callback: (workItem: WITOM.WorkItem, isMember: boolean) => void): void {
        Diag.Debug.assertParamIsNotNull(workItem, "workItem");
        Diag.Debug.assertParamIsFunction(callback, "callback");

        let gridDataManager = this.getGridDataManager();
        let backlogContext = TFS_Agile.BacklogContext.getInstance();
        let workItemType: string = workItem.getFieldValue(WITConstants.CoreFieldRefNames.WorkItemType);
        let workItemTreeIndex = gridDataManager.getWorkItemTreeIndex(workItem.id);

        let useMembershipEvaluator = true;
        let ownershipEvaluator = this._getOwnerShipEvaluator();
        ownershipEvaluator.evaluate(workItem, (isValid: boolean) => {
            gridDataManager.updateOwnedIds(workItem.id, isValid);

            if (workItemTreeIndex) {
                // Update the row after evaluating ownership
                let rowIndex = this.getGrid().getRowIndex(workItemTreeIndex);
                this.getGrid().updateRow(rowIndex);
            }
        });

        if (workItemTreeIndex == null) {
            //not in the grid
            callback(workItem, true);
            useMembershipEvaluator = false;
        }
        else if (!backlogContext.backlogContainsWorkItemType(workItemType)) {
            // work item is not of an anchored type
            if (this._isIterationBacklog) {
                // if we are in the iteration backlog we want to also update child types
                if (!Utils_Array.contains(BacklogConfigurationService.getBacklogConfiguration().taskBacklog.workItemTypes, workItemType, Utils_String.ignoreCaseComparer)) {
                    callback(workItem, true);
                    useMembershipEvaluator = false;
                }
            }
            else {
                // Not iteration backlog and not an anchored type, do nothing
                callback(workItem, true);
                useMembershipEvaluator = false;
            }
        }

        if (useMembershipEvaluator) {
            let evaluator = this._createMembershipEvaluator(gridDataManager);

            evaluator.evaluate(workItem, (validMember: boolean) => {
                callback(workItem, validMember);
            });
        }
    }

    private _evaluateMembershipAction = (actionArgs: TFS_Agile.IEvaluateMembershipActionArgs, next): void => {
        Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
        Diag.Debug.assertParamIsObject(actionArgs.workItem, "actionArgs.workItem");
        Diag.Debug.assertParamIsFunction(actionArgs.sendResult, "actionArgs.sendResult");

        let workItem: WITOM.WorkItem = actionArgs.workItem;
        this._evaluateMembership(workItem, (workItem, validMember) => {
            if (!validMember) {
                actionArgs.sendResult(false);
            }
            else {
                next(actionArgs);
            }
        });
    }

    private _bulkeditEvaluateMembership = (actionArgs: TFS_Agile.IBacklogBulkEditEvaluateMembershipActionArgs, next): void => {
        Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
        Diag.Debug.assertParamIsArray(actionArgs.workItems, "actionArgs.workItems");
        Diag.Debug.assertParamIsArray(actionArgs.changes, "actionArgs.changes");

        let workItems: WITOM.WorkItem[] = actionArgs.workItems.slice(0);
        let invalidWorkItems: WITOM.WorkItem[] = [];

        let callback = (workItem: WITOM.WorkItem, isMember: boolean) => {
            if (!isMember) {
                invalidWorkItems.push(workItem);
            }
            workItem = workItems.pop();
            if (workItem) {
                this._evaluateMembership(workItem, callback);
            }
            else {
                //All Workitems have now been evaluated

                if (invalidWorkItems.length > 0) {

                    for (let invalidWorkItem of invalidWorkItems) {

                        if (this.getGridDataManager().getDescendantCount(invalidWorkItem.id) === 0) { // Leaf node so remove
                            this._removeWorkItemFromGrid(invalidWorkItem.id, false);
                        }
                        else {
                            //There was an invalid item with children. User will need to refresh to fix view, so stop here and display message
                            this._showRefreshMessage(AgileProductBacklogResources.BulkEdit_Backlog_RefreshRequired);
                            this._grid.refresh();
                            return;
                        }
                    }

                    this._beginGetSettingsField(TFS_AgileCommon.ProjectProcessConfiguration.FieldType.Team, (teamField: string) => {
                        let $div = $("<div>").addClass("backlog-info");
                        let $listHeader = $("<p>");
                        let $list = $("<ul>");

                        $listHeader.text(AgileProductBacklogResources.BulkEdit_WorkItemRemovedFromBacklog_ListHeader);

                        let invalidWorkItem = invalidWorkItems[0]; //We will simplify and use the first invalid item as the source for generating the message
                        let fieldRefNamesToCheck = [WITConstants.CoreFieldRefNames.TeamProject, WITConstants.CoreFieldRefNames.IterationPath, WITConstants.CoreFieldRefNames.State, teamField];

                        //Create map for easy look up
                        let changesMap: IDictionaryStringTo<any> = {};
                        let changedFields: IDictionaryStringTo<WITOM.Field> = {};
                        for (let change of actionArgs.changes) {

                            let field: WITOM.Field = invalidWorkItem.getField(change.fieldName);

                            if (field) {
                                changedFields[field.fieldDefinition.referenceName] = field;

                                if (field.fieldDefinition.id === WITConstants.CoreField.TeamProject) {
                                    changesMap[change.fieldName] = change.value.name;
                                }
                                else {
                                    changesMap[change.fieldName] = change.value;
                                }
                            }
                        }

                        let fieldChangedStates = this._checkFieldChanges(invalidWorkItem, changedFields, fieldRefNamesToCheck);

                        $.each(fieldChangedStates, (i, fieldChangeState) => {
                            if (fieldChangeState) {
                                //The field changed
                                let fieldDefinition = invalidWorkItem.getField(fieldRefNamesToCheck[i]).fieldDefinition;
                                let fieldValue = changesMap[fieldDefinition.name];

                                // if field name is not found, try field reference name
                                // Note that IFieldIdValue.fieldName is any type and it can be field name or field reference name or id.
                                // Bulk edit dialog in product backlog uses "field name" to collect changes and pass it the bulk update API whereas
                                // move/type change dialog uses field reference names to build payload
                                if (!fieldValue) {
                                    fieldValue = changesMap[fieldDefinition.referenceName];
                                }

                                if (fieldValue) {
                                    let $li = $("<li>"),
                                        fieldNameHtml = Utils_String.format("<strong>{0}</strong>", fieldDefinition.name),
                                        fieldValueHtml = Utils_String.format("<strong>{0}</strong>", fieldValue);

                                    $li.append(Utils_String.format(AgileProductBacklogResources.BacklogInfo_WorkItemRemoved_ListItem, fieldNameHtml, fieldValueHtml));

                                    $list.append($li);
                                }
                            }
                        });

                        $div.append($listHeader);
                        $div.append($list);

                        this.getMessageArea().setMessage({
                            header: AgileProductBacklogResources.BulkEdit_WorkItemRemovedFromBacklog_Header,
                            content: $div
                        }, Notifications.MessageAreaType.Info);
                    });

                    this._grid.refresh();
                }
                else {

                    //Check for stack rank changes if all items are valid
                    this._beginGetSettingsField(TFS_AgileCommon.ProjectProcessConfiguration.FieldType.Order, (orderFieldRefName: string) => {
                        for (let change of actionArgs.changes) {
                            let fieldDefinition: WITOM.FieldDefinition = this._workItemManager.store.getFieldDefinition(change.fieldName);
                            if (fieldDefinition && (Utils_String.ignoreCaseComparer(fieldDefinition.referenceName, orderFieldRefName) === 0)) {
                                this._showRefreshMessage(AgileProductBacklogResources.BulkEdit_Backlog_OrderFieldRefresh);
                                return;
                            }
                        }
                    });
                }

                if (actionArgs.workItems.length !== invalidWorkItems.length) {
                    next(actionArgs);
                }
            }
        };

        callback(null, true);
    }

    /**
     * Creates the toolbar for the backlog views.
     */
    public _createToolbar() {
        this._toolbar = <Menus.Toolbar>Controls.BaseControl.createIn(Menus.Toolbar, $(".hub-pivot-toolbar", this._$element), {
            items: this._buildToolbarItems(),
            executeAction: delegate(this, this._onToolbarItemClick),
            ariaAttributes: {
                label: AgileProductBacklogResources.Backlog_Toolbar_AriaLabel
            }
        });
    }

    /**
     * Toggles the filter bar visibility
     */
    public toggleFilter() {
        this._filterBar.toggle();
    }

    /**
     * Shows and focuses the filter bar
     */
    public activateFilter() {
        this._filterBar.showElement();
        this._filterBar.focus();
    }

    /**
     * Creates backlogs common menubar across the backlog views.
     */
    private _createBacklogsCommonMenuBar() {

        let $menubar = $(Backlog.CSS_BACKLOGS_COMMON_MENUBAR);
        if (!this._backlogsCommonMenubar && $menubar.length > 0) {
            $menubar.toggleClass("agile-important-hidden", false);
            this._backlogsCommonMenubar = <Menus.MenuBar>Controls.Enhancement.enhance(Menus.MenuBar, $menubar);

            // Initialize commonSettingsConfiguration menuitem and register tabs
            TFS_Agile_Controls.CommonSettingsConfigurationControl.initialize(this._backlogsCommonMenubar, () => { this._recordBacklogCommonConfigDialogTelemetry(); });
            this._attachCommonConfigurationRegistration();

            // Initialize fullscreen menuitem
            Navigation.FullScreenHelper.initialize(this._backlogsCommonMenubar);
        }
    }

    private _recordBacklogCommonConfigDialogTelemetry() {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_COMMON_CONFIG_DIALOG_OPENED, {
                Page: this._getPageNameForCI(),
            }));
    }

    private _getPageNameForCI(): string {
        return this._isIterationBacklog ?
            TFS_Agile.AgileCustomerIntelligenceConstants.ITERATION_BACKLOG_VIEW :
            TFS_Agile.AgileCustomerIntelligenceConstants.PRODUCT_BACKLOG_VIEW;
    }

    /** Build the common backlog menu items. */
    public _buildToolbarItems(): Menus.IMenuItemSpec[] {
        let menuItems: Menus.IMenuItemSpec[] = [];

        menuItems.push(
            {
                id: Backlog.CMD_TOGGLE_ADD_PANEL,
                text: VSS_Resources_Common.NewBacklogItem,
                title: VSS_Resources_Common.NewBacklogItemToolTip,
                showText: true,
                noIcon: true
            },
            { separator: true });

        menuItems = this._addExpandCollapseToToolbarItems(menuItems);
        menuItems.push({ separator: true });

        menuItems.push(
            { id: Backlog.CMD_GENERATE_QUERY, title: AgileProductBacklogResources.CreateQuery_Toolbar_Text, setTitleOnlyOnOverflow: true, text: AgileProductBacklogResources.CreateQuery_Toolbar_Text, noIcon: true },
            { separator: true },
            { id: Backlog.CMD_COLUMN_OPTIONS, title: WITResources.ColumnOptionsTitle, setTitleOnlyOnOverflow: true, text: WITResources.ColumnOptions, noIcon: true },
            { separator: true },
            {
                id: QueryResultGrid.QueryResultGrid.COMMAND_ID_EMAIL_QUERY_RESULT,
                text: AgileProductBacklogResources.EmailBacklogQueryResult,
                title: AgileProductBacklogResources.EmailBacklogQueryResult,
                setTitleOnlyOnOverflow: true,
                showText: false,
                icon: "bowtie-icon bowtie-mail-message"
            },
            this.filterMenuItem);

        return menuItems;
    }

    /**
     * Initialize anything related to the FilterBar, including the FilterManager.
     */
    protected _initializeFilter() {
        this._filterManager = this._grid.getFilterManager();

        // If we are in a new hub, we dont care about filter events, we handle them ourselves
        if (!this._options.isNewHub) {
            this._filterBar = <FilterBar>Controls.Enhancement.ensureEnhancement(FilterBar, this._$element);

            this._filterBar.bind(tfsContext.navigation.project, this._filterManager, this._grid);

            this._filterManager.attachEvent(FilterManager.EVENT_FILTER_CHANGED, this.__onFilterChangedHandler);
            // Attach to filter cleared event
            this._filterManager.attachEvent(FilterManager.EVENT_FILTER_CLEARED, this.__onFilterChangedHandler);

            // Refresh the toolbar on activate/deactivate
            this._filterManager.attachEvent(FilterManager.EVENT_FILTER_ACTIVATED, this._onFilterChangedAndResize);
            this._filterManager.attachEvent(FilterManager.EVENT_FILTER_DEACTIVATED, this._onFilterChangedAndResize);
        }
    }

    private _cleanupFilterBar() {
        if (this._filterBar) {
            this._filterBar.dispose();
            this._filterBar = null;
        }

        if (this._filterManager) {
            this._filterManager.detachEvent(FilterManager.EVENT_FILTER_CHANGED, this._onFilterChanged);
            this._filterManager.detachEvent(FilterManager.EVENT_FILTER_CLEARED, this._onFilterChanged);
            this._filterManager.detachEvent(FilterManager.EVENT_FILTER_ACTIVATED, this._onFilterChangedAndResize);
            this._filterManager.detachEvent(FilterManager.EVENT_FILTER_DEACTIVATED, this._onFilterChangedAndResize);
            this._filterManager = null;
        }
    }

    private _onFilterChangedAndResize = () => {
        this._onFilterChanged()
        this._grid.resize();

    }

    private __onFilterChangedHandler = () => {
        this._onFilterChanged();
    }

    protected _onFilterChanged(): void {
        this._updateAddPanelDisabledState();
        this._refreshToolbarCommandStates();

        // Ensure the toolbar reflects the current filter state
        const filterMenuItem = this._toolbar.getItem(this.filterMenuItem.id);
        if (filterMenuItem) {
            filterMenuItem.update({
                ...this.filterMenuItem,
                icon: (this._filterManager && this._filterManager.isFiltering()) ? "bowtie-icon bowtie-search-filter-fill" : "bowtie-icon bowtie-search-filter"
            });
        }
    }

    /** Refresh the backlog toolbar item states (hidden, toggle, enabled, etc.) */
    protected _refreshToolbarCommandStates() {
        Diag.Debug.assertIsNotNull(this._toolbar, "Toolbar should not be null");
        this._toolbar.updateCommandStates(this._getUpdatedToolbarCommandStates());
    }

    /** Determine the appropriate backlog toolbar item states (hidden, toggled, enabled, etc.). */
    protected _getUpdatedToolbarCommandStates(): Menus.ICommand[] {
        Diag.Debug.fail("_getUpdatedToolbarCommandStates() should be implemented in backlog sub-classes.");
        return [];
    }

    protected _addExpandCollapseToToolbarItems(menuItems: any[]) {
        menuItems.push(
            { id: Backlog.CMD_EXPAND_ONE_LEVEL, text: AgileResources.ExpandOneLevel, title: AgileResources.ExpandOneLevelToolTip, showText: false, icon: "bowtie-icon bowtie-toggle-expand" },
            { id: Backlog.CMD_COLLAPSE_ONE_LEVEL, text: AgileResources.CollapseOneLevel, title: AgileResources.CollapseOneLevelToolTip, showText: false, icon: "bowtie-icon bowtie-toggle-collapse" });
        return menuItems;
    }

    public expandOneLevel(): void {
        if (this.isGridLoaded()) {
            this._grid.performActionWithPreserveSelection(() => {
                this._expandCollapseBehavior.expandShallowestLevel();
                this._grid.updateLayoutAndRedraw();
            });
        }
    }

    public collapseOneLevel(): void {
        if (this.isGridLoaded()) {
            this._grid.performActionWithPreserveSelection(() => {
                this._expandCollapseBehavior.collapseDeepLevel();
                this._grid.updateLayoutAndRedraw();
            });
        }
    }

    private isGridLoaded(): boolean {
        return !!this.getGrid();
    }

    /**
     * Handles common menu items across all Backlog's
     * 
     * @param command The clicked menuitem's command name.
     */
    public _handleCommonMenuItemClick(command: string) {
        let grid = this.getGrid();

        if (!grid) {
            return; // For now all toolbar items operate on the grid so do nothing if the grid is not loaded.
        }

        switch (command) {
            case Backlog.CMD_TOGGLE_ADD_PANEL:
                this._toggleAddPanel();
                break;
            case Backlog.CMD_EXPAND_ALL:
                this._grid.performActionWithPreserveSelection(() => {
                    grid.expandAll();
                });
                this.recordIterationViewExpandAllTelemetry();
                break;
            case Backlog.CMD_COLLAPSE_ALL:
                this._grid.performActionWithPreserveSelection(() => {
                    grid.collapseAll();
                });
                break;
            case Backlog.CMD_EXPAND_ONE_LEVEL:
                this.expandOneLevel();
                this._expandClickCount++;
                this._recordBacklogsQuickExpandCollapseTelemetry();
                break;
            case Backlog.CMD_COLLAPSE_ONE_LEVEL:
                this.collapseOneLevel();
                this._collapseClickCount++;
                this._recordBacklogsQuickExpandCollapseTelemetry();
                break;
            case Backlog.CMD_COLUMN_OPTIONS:
                this.launchColumnOptions();
                break;
            case Backlog.CMD_GENERATE_QUERY:
                this.generateAndLaunchNewQuery();
                break;
            case QueryResultGrid.QueryResultGrid.COMMAND_ID_EMAIL_QUERY_RESULT:
                this.emailQueryResults();
                break;
            case Backlog.CMD_TOGGLE_FILTER:
                this.toggleFilter();
                break;
            default:
                Diag.Debug.fail("Toolbar command " + command + " was not an expected string");
                break;
        }
    }

    /**
     * Launch new query dialog with query based on backlog
     */
    public generateAndLaunchNewQuery(): void {
        Diag.logTracePoint('Backlog.ClickGenerateQuery.start');
        this._launchNewQueryDialog();
    }

    public emailQueryResults() {
        Diag.logTracePoint("Backlog.SendEmailQueryButtonClicked");

        VSS.requireModules(["Admin/Scripts/TFS.Admin.SendMail", "WorkItemTracking/Scripts/Dialogs/Models/EmailWorkItems"])
            .spread((AdminSendMail: typeof AdminSendMail_Async, EmailWorkItemsModel: typeof EmailWorkItemsModel_Async) => {
                this._emailQueryResults(AdminSendMail, EmailWorkItemsModel);
            });

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_BACKLOGS_EMAILBACKLOG, {}));
    }

    /**
     * Email query results based off of filter and backlog settings
     * @param AdminSendMail
     * @param EmailWorkItemsModel
     * @param witStore
     * @param getProjectWrapper
     */
    protected _emailQueryResults(AdminSendMail: typeof AdminSendMail_Async, EmailWorkItemsModel: typeof EmailWorkItemsModel_Async) {
        let options: EmailWorkItemsModel_Async.IEmailWorkItemsDialogModelOptions = { pageSourceForCI: "Backlog" };
        let grid = this.getGrid();
        let witStore: WITOM.WorkItemStore = this._workItemManager.store;
        let projectName: string = grid.getProjectName();

        let getProjectWrapper: EmailWorkItemsModel_Async.IGetProjectWrapper = (successCallback, errorCallback) => {
            Diag.Debug.assertParamIsFunction(successCallback, "successCallback");
            Diag.Debug.assertParamIsFunction(errorCallback, "errorCallback");

            witStore.beginGetProject(projectName, successCallback, errorCallback);
        };

        if (this._grid.isFiltered()) {
            options.subject = this._getBacklogQueryName();
            options.workItemSelectionOption = {
                workItems: grid.getCurrentWorkItemIds(),
                fields: this._getDisplayColumnFields(),
                store: witStore
            };
        }
        else {
            //no filter - send entire backlog (using the drill down version of the backlog query) 
            options.queryResultsAdapter = {
                queryId: "",
                queryName: this._getBacklogQueryName(),
                queryText: grid._options.wiql,
                fields: this._getDisplayColumnFields(),
                sortFields: $.map(grid.getSortColumns(), (column) => column.name),
                project: getProjectWrapper,
                workItemStore: witStore
            };
        }

        let emailDialogModel = new EmailWorkItemsModel.EmailWorkItemsDialogModel(options);
        AdminSendMail.Dialogs.sendMail(emailDialogModel);
    }

    protected _recordBacklogsQuickExpandCollapseTelemetry() {
        let publishTelemetry = () => {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_BACKLOGS_EXPAND_COLLAPSE_ONE_LEVEL,
                {
                    "NumOfExpandClicks": this._expandClickCount,
                    "NumOfCollapseClicks": this._collapseClickCount
                }));
            this._expandClickCount = this._collapseClickCount = 0;
        };

        if (this._expandCollapseTelemetryDelayedFunc) {
            this._expandCollapseTelemetryDelayedFunc.cancel();
            this._expandCollapseTelemetryDelayedFunc.setMethod(this, publishTelemetry);
        }
        else {
            this._expandCollapseTelemetryDelayedFunc = new Utils_Core.DelayedFunction(this, this._telemetryQuickExpandCollapseDelay, "expandCollapseTelemetryDelayedFunction", publishTelemetry);
        }
        this._expandCollapseTelemetryDelayedFunc.start();
    }

    public recordIterationViewExpandAllTelemetry() {
        if (this._isIterationBacklog) {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATIONEXPANDALL, {
                    "TeamId": null
                }));
        }
    }

    /** Record that a backlog item has been added.
     *  @param startTime The time the add was begun; the time since then will be recorded as the event timespan.
     *  @param addedFrom The experience where the item was added from - e.g. "AddPanel", "Grid", or more in the future. */
    public static _recordAddBacklogItemTelemetry(startTime: number, addedFrom: string) {
        let backlogManagementPermission: boolean = haveBacklogManagementPermission();
        let cidata: { [key: string]: any } = {
            "Action": "AddBacklogItem",
            "BacklogManagementPermission": backlogManagementPermission.toString(),
            "AddedFrom": addedFrom
        };

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ADDBACKLOGITEM,
            cidata, startTime));
    }

    /** Determines if workitem belongs to requirement backlog */
    public _isWorkItemIdInRequirementsBacklog(workItemId: number): boolean {
        let itemTypeName = this._getWorkItemTypeName(workItemId);
        return BacklogConfigurationService.getBacklogConfiguration().isWorkItemTypeInRequirementBacklog(itemTypeName);
    }

    /** Determines if workitem belongs to requirement backlog */
    public _isWorkItemInRequirementsBacklog(workitem: WITOM.WorkItem): boolean {
        return BacklogConfigurationService.getBacklogConfiguration().isWorkItemTypeInRequirementBacklog(workitem.workItemType.name);
    }

    public getWorkItemManager(): WorkItemManager {
        return this._workItemManager;
    }

    /**
     * return element of the backlog
     */
    public getElement() {
        return this._$element;
    }

    /**
     * return grid control used by the backlog
     */
    public getGrid() {

        // If we do not have the grid instance yet (Could be in the process of rendering the grid
        // for the first time), then try and get the instance from the grid element.
        if (!this._grid) {
            this._grid = <TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid>Controls.Enhancement.getInstance(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, this.getGridElement());
        }

        return this._grid;
    }

    /**
     * return grid data manager
     * 
     * @return 
     */
    public getGridDataManager(): TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager {

        // If the grid data manager has not been created yet, then create it.
        if (!this._gridDataManager) {
            // Get the grid options so we can use the source, target, and link information in initializing the data manager.
            let options = this.getGridOptions();

            // Setup the data manager.
            this._gridDataManager = new TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager({
                targetIds: options.targetIds.slice(0),
                sourceIds: options.sourceIds.slice(0),
                linkIds: options.linkIds.slice(0),
                realParentIds: options.realParentIds ? options.realParentIds.slice(0) : null,
                ownedIds: options.ownedIds ? options.ownedIds.slice(0) : null
            });

            if (options.payload) {
                // We do have initial work item data, evaluate the ownership for the items                
                let teamFieldIdx = Backlog.findColumnIndex(<string[]>options.payload.columns, this._teamSettings.teamFieldName);
                Diag.Debug.assert(teamFieldIdx !== -1, "Paged data should always contain value of team field");

                let idFieldIdx = Backlog.findColumnIndex(<string[]>options.payload.columns, WITConstants.CoreFieldRefNames.Id);
                Diag.Debug.assert(idFieldIdx !== -1, "Paged data should always contain id");

                let evaluator = this._getOwnerShipEvaluator();

                for (let i = 0; i < options.payload.rows.length; ++i) {
                    let row = options.payload.rows[i];
                    let workItemId = row[idFieldIdx];
                    let teamFieldValue = row[teamFieldIdx];
                    if (teamFieldValue) {
                        evaluator.checkTeamFieldValue(teamFieldValue, isWorkitemOwned => {
                            this._gridDataManager.updateOwnedIds(workItemId, isWorkitemOwned);
                        });
                    }
                }
            }
        }

        return this._gridDataManager;
    }

    /**
     * Determines if the Backlog is currently filtered
     * 
     * @return true if the backlog contents are currently filtered down
     */
    public isBacklogFiltered(): boolean {
        return this._filterManager && this._filterManager.isFiltering();
    }

    public getMessageArea() {
        if (!this._messageArea) {
            this.createMessageArea();
        }

        return this._messageArea;
    }

    /**
     * Creates the options to be used by the sprint view to enable dropping of work items.
     */
    public getSprintViewOptions() {
        let that = this;

        return {
            droppable: {
                scope: TFS_Agile.DragDropScopes.ProductBacklog,  // Match the scope of the draggable items in the grid.
                accept: function ($element) {
                    let $this = $(this);
                    return that._acceptDroppableHandler($element, $this);
                },
                hoverClass: "dragHover",
                drop: function (event, ui) {
                    let $this = $(this);

                    that._dropHandler(event, ui, $this);
                },
                tolerance: 'pointer'
            }
        };
    }

    /**
     * Gets the element that is used to contain the grid.
     * 
     * @return 
     */
    public getGridElement(): JQuery {
        let gridElement = $("." + Backlog.CSS_GRID, this.getElement());
        if (gridElement.length === 0) {
            gridElement = $("<div/>").addClass(Backlog.CSS_GRID);
            this.getElement().append(gridElement);
        }

        return gridElement;
    }

    /**
     * Create Backlog Grid without drawing.
     * 
     * A call to grid.resize() is required to layout/draw the grid when ready.
     *
     * @param options Options to be provided to the grid when it is created.
     */
    public createGrid(options?: any) {
        if (this._grid) {
            Diag.Debug.fail("Grid has already been created and attempting to recreate");
            // Grid already created, return
            return;
        }

        this.createQuickExpandCollapseBehavior();

        let dataManager = this.getGridDataManager();

        // If the options were not provided, get them.
        if (!options) {
            options = this.getGridOptions();
        }

        // Add expand collapse buttons if on new hub
        if (this._options.isNewHub) {
            this._expandCollapseButtonsBehavior = new BacklogExpandCollapseButtonBehavior(
                () => this.expandOneLevel(),
                () => this.collapseOneLevel()
            );
            if (options.behaviors) {
                options.behaviors.push(this._expandCollapseButtonsBehavior);
            } else {
                options.behaviors = [this._expandCollapseButtonsBehavior];
            }
        }

        options.dataManager = dataManager;
        options.contextMenuErrorHandler = delegate(this, this._contextMenuErrorHandler);
        options.eventHelper = this._eventHelper;

        // We suppress the draw/layout in the initial enhance to delay layout until ready to display and filters have been applied. 
        options.suppressRedraw = true;

        this._grid = <TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid>Controls.Enhancement.enhance(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, this.getGridElement(), options);

        this._eventHelper.attachEvent(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, this._resizeGrid);

        // Bind to column events so that we can persist the column info on the server
        this._grid.getElement().on("columnresize", this._onColumnsChanged);
        this._grid.getElement().on("columnmove", this._onColumnsChanged);

        // Switch workitem id in row saving manager
        this._gridDataManager.attachIdChange(this._onGridIdChange);

        const sprintView = this._getSprintView();
        if (sprintView) {
            // Attach a handler to the drag operation events to disable
            // sprint view control focus highlighting during a drag operation
            this._grid.attachDragEvent(this._onGridDragToSprintView);
        }

        return this._grid;
    }

    private _onGridIdChange = (source, args): void => {
        this._grid.getRowSavingManager().changeId(args.oldId, args.newId);
    }

    private _onGridDragToSprintView = (source, args): void => {
        const action = args.action;
        const sprintView = this._getSprintView();
        switch (action) {
            case TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DRAG_OPERATION_START:
                sprintView.enableFocusStyling(false);
                break;
            case TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DRAG_OPERATION_STOP:
                sprintView.enableFocusStyling(true);
                break;
        }
    }

    private _resizeGrid = () => {
        this._grid.resize();
    }

    private _cleanupGrid() {
        if (this._expandCollapseBehavior) {
            if (this._expandCollapseTelemetryDelayedFunc) {
                this._expandCollapseTelemetryDelayedFunc.cancel();
                this._expandCollapseTelemetryDelayedFunc = null;
            }

            this._expandCollapseBehavior = null;
        }

        if (this._gridDataManager) {
            this._gridDataManager.detachIdChange(this._onGridIdChange);
            this._gridDataManager.dispose();
            this._gridDataManager = null;
        }

        if (this._grid) {
            this._grid.getElement().off("columnresize", this._onColumnsChanged);
            this._grid.getElement().off("columnmove", this._onColumnsChanged);
            this._grid.detachDragEvent(this._onGridDragToSprintView);
            this._eventHelper.detachEvent(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, this._resizeGrid);
            this._grid.dispose();
            this._grid = null;
        }

        this._insertEventsSetup = false;
    }

    public createQuickExpandCollapseBehavior(): void {
        let getIndex = (workItemId: number): number => { return this._gridDataManager.getWorkItemTreeIndex(workItemId); };
        let collapse = (workItemId: number) => { this._grid.collapseNode(getIndex(workItemId)); };
        let expand = (workItemId: number) => { this._grid.expandNode(getIndex(workItemId)); };
        let isExpanded = (workItemId: number) => { return this._grid._getExpandState(getIndex(workItemId)) >= 0; };

        this._expandCollapseBehavior = new QuickExpandCollapseBehavior(this.getItemHierarchy(), { isExpanded, expand, collapse });
    }

    /**
     * Gets the options for the grid.
     */
    public getGridOptions() {
        let gridOptions = this._gridOptions;

        // If the grid options have not been looked up yet, then get them.
        if (!gridOptions) {
            gridOptions = this._options.gridOptions;
            gridOptions.contextMenuCreator = delegate(this, this._contextMenuCreator);

            // Enable raising of ROW_UPDATED events in the grid.
            if (!gridOptions.enabledEvents) {
                gridOptions.enabledEvents = {};
            }

            gridOptions.enabledEvents[Grids.GridO.EVENT_ROW_UPDATED] = true;

            // Save off the grid options for next time they are requested.
            this._gridOptions = gridOptions;
        }

        return gridOptions;
    }

    /**
     * Handler to execute before the iteration saves on context menu change
     * 
     * @param workItems The workitems that are changing
     * @param beforeSave The wrapped before save callback
     */
    public _beforeIterationSave(workItems: any[], beforeSave: Function) {
        Diag.Debug.assertParamIsObject(workItems, "workItems");
        Diag.Debug.assertParamIsFunction(beforeSave, "beforeSave");

        this.suppressMembershipEvaluation($.map(workItems, function (workItem) {
            return workItem.id;
        }));

        beforeSave(workItems);
    }

    /**
     *  Applies iteration updates to all child workItems for the provided work item.
     * 
     * @param workItems The list of work item instances that were saved
     * @param changes The changes that were made. In this case we know it is an iteration path
     * @param afterSave The post-save function to wrap
     */
    public _$updateChildIterationsAfterSave(workItems: WITOM.WorkItem[], changes: any[], afterSave: Function) {
        Diag.Debug.assertParamIsArray(workItems, "workItems");
        Diag.Debug.assertParamIsArray(changes, "changes");
        Diag.Debug.assertParamIsFunction(afterSave, "afterSave");

        let i, l,
            that = this,
            workItem,
            iterationPath = changes[0].value;

        function successCallback(args) {
            afterSave(workItems, args);
        }

        function errorCallback(error) {
            // If we end up supporting multi-select then we will need to revisit this error scenario
            that.getMessageArea().setError(error.message);
        }

        for (i = 0, l = workItems.length; i < l; i += 1) {
            workItem = workItems[i];

            // We pass the isBacklogItem() as a callback to beginUpdateChildWorkItems(). This callback is used to check the 
            // child workItems that need be ignored (i.e. items that appear on the backlog). We want only the immediate child of type Task category getting 
            // updated along with the backlog item. This is specifically for "nested backlog items". Nested backlog items and their tasks 
            // should not be updated along with the parent backlog item. In future releases, nested backlog items will get removed from the specs, then
            // this change may not be required anymore and may be reverted.

            WorkItemUtils.beginUpdateChildWorkItems(workItem,
                false,
                WITConstants.CoreField.IterationPath,
                iterationPath,
                (wi: WITOM.WorkItem) => this._isWorkItemInRequirementsBacklog(wi),
                successCallback,
                errorCallback,
                WorkItemUtils.getShouldUpdateMethodForIterationAssignment(workItem, iterationPath));
        }
    }

    /**
     * Create Message Area
     */
    public createMessageArea() {

        if (this._messageArea) {
            // already initialized
            return;
        }

        let that = this;

        this._messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $(".grid-status-message", this.getElement()), {
            closeable: true
        });
        this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, function () {
            // Resize the grid when the status message changes as it can grown and shrink.
            if (that._grid) {
                that._grid.resize();
            }
        });

        // Listen for errors being broadcast by other controls on the page and display them.
        Events_Action.getService().registerActionWorker(TFS_Agile.Actions.BACKLOG_ERROR, delegate(this, this._handleBacklogError));
    }

    private _handleBacklogError = (error: string) => {
        this.getMessageArea().setError(getErrorMessage(error));
    }

    /**
     * Gets the workItemIds of rows that are to be disabled/enabled to prevent unwanted events occurring while the workItem with id workItemId changes
     * 
     * @param workItemId The workItemId of the workItem that is being changed on the grid
     */
    public _getWorkItemIdsOfRowsToBeUpdated(workItemId: number) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        let listOfIds = [];

        //For the product backlog, disable/enable all the children of root nodes
        if (this._gridDataManager.isRootNode(workItemId)) {
            listOfIds = this._gridDataManager.getDescendantWorkItemIds(workItemId);
        }

        return listOfIds;
    }

    /**
     * Removes a work item from the grid
     * 
     * @param {number} workItemId - The id of the work item to remove
     * @param {boolean} refreshGrid - Where to refresh the grid or not, defaults to true
     */
    public _removeWorkItemFromGrid(workItemId: number, refreshGrid: boolean = true) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");
        this.getGridDataManager().removeWorkItem(workItemId, refreshGrid);
    }

    /**
     * Remove the specified work items from the grid
     * 
     * @param {number[]} workItemIds - The ids of the work items to remove
     */
    public _removeWorkItemsFromGrid(workItemIds: number[]) {

        this.getGridDataManager().removeWorkItems(workItemIds);
    }

    /**
     * Get the sprint view control.
     */
    public _getSprintView(): TFS_Agile_Controls.SprintViewControl {

        if (!this._sprintView) {
            // Find the sprint view control.
            this._sprintView = <TFS_Agile_Controls.SprintViewControl>Controls.Enhancement.getInstance(TFS_Agile_Controls.SprintViewControl, $(".team-iteration-view"));
        }

        return this._sprintView;
    }

    /**
     * Handle a request to edit a work item by displaying the appropriate work item edit form
     *
     * @param workItem The work item to edit
     * @param callback The function to call in the successful save case
     */
    protected _editWorkItem(workItem: WITOM.WorkItem, callback: IResultCallback) {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsFunction(callback, "callback");

        const closeHandler = (args) => {
            // args can be undefined when the form is closed before the work item is loaded.
            if (args && args.id !== 0) { // If it was a successful save
                callback(true);
            } else {
                callback(false);
            }
        }

        // Display the Work Item Form
        WITDialogShim.showWorkItem(workItem, {
            close: closeHandler
        });
    }

    /**
     * Returns an array of backlog grid items, one for each work item
     * currently selected in the iteration backlog grid.
     */
    public getSelectedBacklogGridItems = (): IBacklogGridItem[] => {
        const grid = this.getGrid();

        return grid.getSelectedWorkItemIds().map(id => {
            return {
                workItemId: id,
                workItemType: grid.getWorkItemTypeNameById(id)
            };
        });
    }

    public setAddPanelHighlight(show: boolean, insertLocation?: AddItemInsertLocation): void {
        const grid = this.getGrid();
        let rowInfo;

        // Make sure events are setup to respond to changes
        this._setupAddPanelRowHighlight();

        // Save the setting for grid events
        this._showAddPanelHighlight = show;
        this._insertLocation = insertLocation;
        if (show) {
            let effect = this._getCurrentAddEffect(insertLocation);

            if (effect.addUnparentedRow || effect.highlightedWorkItemId === 0) {
                // Display highlight at the end of the backlog
                this._insertionLineIndex = grid.getLastRowDataIndex();
            } else {
                this._insertionLineIndex = grid._getWorkItemDataIndex(effect.highlightedWorkItemId);
            }

            // Ensure data index is visible, redraw if anything has been expanded
            let exp = grid.getExpandedCount();
            grid.ensureDataIndexExpanded(this._insertionLineIndex);
            if (exp !== grid.getExpandedCount()) {
                grid.redraw();
            }

            // Scroll the row containing the insertion line into view
            grid.getRowIntoView(grid.getRowIndex(this._insertionLineIndex));

            rowInfo = grid.getRowInfo(this._insertionLineIndex);
            if (rowInfo) {
                this._cleanupHighlightedRow();
                this._highlightedRow = rowInfo.row[0];
                let isLastRow = grid.isLastRow(rowInfo.dataIndex);

                rowInfo.row.addClass((isLastRow || effect.isParent || (!effect.isParent && !effect.nextId)) ? Backlog.CSSCLASS_INSERTION_HIGHLIGHT_BOTTOM : Backlog.CSSCLASS_INSERTION_HIGHLIGHT_TOP);
            }
        } else {
            // If we previously highlighted the row we remove the highlighting (captured in the closure)
            this._cleanupHighlightedRow();
        }
    }

    private _cleanupHighlightedRow() {
        if (this._highlightedRow) {
            // But only if the row is still part of the DOM tree. If the row has been removed, don't bother.
            if (this._highlightedRow.parentElement !== null) {
                $(this._highlightedRow).removeClass(Backlog.CSSCLASS_INSERTION_HIGHLIGHT_BOTTOM + " " + Backlog.CSSCLASS_INSERTION_HIGHLIGHT_TOP);
            }
            this._highlightedRow = null;
        }
    }

    /**
     * Setup highlighting of the selected row when the add panel has focus.
     */
    private _setupAddPanelRowHighlight() {
        const grid = this.getGrid();

        if (this._insertEventsSetup) {
            // These events are set up, return
            return;
        }

        // Register a handler to get notified when the add panel receives and loses focus.
        // The handler will apply or remove the highlight depending on whether the panel has focus and is enabled.
        if (!this._options.isNewHub) {
            this.addPanel.registerFocusChangedEvent((sender: AddPanel_Async.ProductBacklogAddPanel, hasFocus: boolean) => {
                const show = hasFocus && sender && !sender.isDisabled();

                this.setAddPanelHighlight(show);
            });
        }

        // Register for row update events so that when the selected row is scrolled into view
        // and the row's DOM element is created, we can apply the selection if the add panel has focus
        grid.enableEvent(Grids.GridO.EVENT_ROW_UPDATED);
        grid.getElement().bind(Grids.GridO.EVENT_ROW_UPDATED, <any>((event, rowInfo) => {
            if (this._showAddPanelHighlight && rowInfo.dataIndex === this._insertionLineIndex) {
                if (rowInfo.row.hasClass(Backlog.CSSCLASS_INSERTION_HIGHLIGHT_BOTTOM)
                    || rowInfo.row.hasClass(Backlog.CSSCLASS_INSERTION_HIGHLIGHT_TOP)) {
                    // Note: When a new item is added to the grid, and its state switches from temporary to saved, 
                    // a work-item-id changed event is raised (temp id to final id) and the grid is updated. Unfortunately,
                    // this event is raised when only some of the dataManager's data structures are updated, so consumers
                    // get an incomplete view of the world. The add panel being one of those consumers, we do nothing if the
                    // row is already highlighted (cschleid).
                    return;
                }

                this.setAddPanelHighlight(true, this._insertLocation);
            }
        }));

        this._insertEventsSetup = true;
    }

    private _getAddPanelEffectForCurrentGridSelection(): IAddPanelEffect {
        let addPanelBehavior = this._getAddPanelBehavior();

        let selectedIndex = this.getGrid().getSelectedDataIndex();
        if (selectedIndex === -1) {
            // No selection (because nothing selected, or empty grid), try to select first item in the grid
            selectedIndex = 0;
        }

        let selectedWorkItemId = this.getGridDataManager().getWorkItemIdAtTreeIndex(selectedIndex);
        return addPanelBehavior.getEffect(selectedWorkItemId);
    }

    /** Get or create add panel behavior */
    private _getAddPanelBehavior(): AddPanelBehavior {
        if (!this._addPanelBehavior) {
            this._createAddPanelBehavior();
        }

        return this._addPanelBehavior;
    }

    /** Create new instance of the add panel behavior */
    protected _createAddPanelBehavior() {
        let backlogLevelHelper = this._getBacklogLevelHelper();

        let currentLevel = backlogLevelHelper.getLevel(this._backlogContext.level.defaultWorkItemType);
        this._addPanelBehavior = new AddPanelBehavior(
            currentLevel,
            this.getItemHierarchy(),
            backlogLevelHelper,
            () => !this._isIterationBacklog && !TFS_Agile.areAdvancedBacklogFeaturesEnabled(this._backlogContext.isRequirement),
            () => this.getRootBacklogLevel());
    }

    /** Return the current root level in the backlog. Due to hidden levels, this might be different than the root level in the
      * backlog level configuration.
      */
    public getRootBacklogLevel(): number {
        let backlogLevelHelper = this._getBacklogLevelHelper();

        if (!this._backlogContext.includeParents) {
            return backlogLevelHelper.getTopLevel();
        }

        if (!this._grid.getWorkItemIdAtDataIndex(0)) {
            // Grid is empty, default to first level

            const hiddenBacklogLevels = BacklogConfigurationService.getBacklogConfiguration().hiddenBacklogs;
            const allBacklogLevels = BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels();
            return 1 + Utils_Array.findIndex(allBacklogLevels, bl => !Utils_Array.contains(hiddenBacklogLevels, bl.id, Utils_String.ignoreCaseComparer));
        }

        // Return the level of the first item in the grid
        let rootItemType = this._grid.getWorkItemTypeNameByIndex(0);
        return backlogLevelHelper.getLevel(rootItemType);
    }

    /** Return the current filter used to filter selections on the backlog instance */
    public getSelectionFilter(): TFS_Agile_WorkItemChanges.ISelectionFilter {
        if (!this._selectionFilter) {
            this._selectionFilter = new TFS_Agile_WorkItemChanges.TopLevelItemsSelectionFilter(
                this.getItemHierarchy(),
                delegate(this._grid, this._grid.pageWorkItems));
        }

        return this._selectionFilter;
    }

    /**
     *     Call this after an action has been taken on the page. It will perform operations such as
     *     clearing the message area.
     */
    protected postActionCleanup() {

        // Clear the message if the reorder queue is not paused, as clicking on the message
        // is the only way to resume the queue and resend the message.
        if (!this._reorderManager.isPaused()) {
            this.getMessageArea().clear();
        }
    }

    /**
     * Create a work item on the backlog
     * @param workItemTypeName Type of work item to create
     * @param fields Fields to set at creation
     * @param insertLocation define where the item should be inserted into the grid
     * @returns A promise with the status and an optional additional promise to subscribe to
     */
    public createAndAddWorkItem(workItemTypeName: string, fields: WITOM.IFieldValueDictionary, insertLocation: AddItemInsertLocation): Promise<{ status: AddBacklogItemStatus, continuationPromise?: Promise<boolean> }> {
        return WorkItemUtils.beginGetWorkItemType(workItemTypeName)
            .then((workItemType: WITOM.WorkItemType) => {
                return WorkItemUtils.beginCreateWorkItem(this._backlogContext.team.id, workItemType, { parenting: null, useDefaultIteration: true });
            })
            .then((workItem: WITOM.WorkItem) => {
                return new Promise<{ status: AddBacklogItemStatus, continuationPromise?: Promise<boolean> }>((resolve, reject) => {
                    // Set fields passed in
                    for (let key in fields) {
                        workItem.setFieldValue(key, fields[key]);
                    }

                    if (!this.isDisposed) {
                        // Call internal work item helper
                        this.addWorkItem(
                            null /* source */,
                            {
                                workItem: workItem,
                                insertLocation: insertLocation,
                                callback: (status: AddBacklogItemStatus, continuationPromise?: Promise<boolean>) => {
                                    resolve({ status, continuationPromise });
                                }
                            }
                        );
                    } else {
                        reject("Backlog grid was disposed");
                    }
                });
            });
    }

    /**
     * Update the provided work items iteration path to the provided iteration path
     * @param workItemIds The work item ids to update
     * @param newIterationPath The new iteration path
     */
    private moveWorkItemsToIteration(workItemIds: number[], newIterationPath: string): IPromise<IBacklogWorkItemChangeIterationResult> {
        const rowSavingManager = this._getRowSavingManager();
        if (workItemIds && workItemIds.length > 0) {
            let rowsToBeDisabled: number[];
            for (let workItemId of workItemIds) {
                rowsToBeDisabled = this._getWorkItemIdsOfRowsToBeUpdated(workItemId);

                //Suppress "items have moved" messages since that is the intention of the user
                this.suppressMembershipEvaluation([workItemId].concat(rowsToBeDisabled));

                // Show the work item as saving and disable the appropriate child workItem rows
                rowSavingManager.markRowAsSaving(workItemId, rowsToBeDisabled);
            }

            return this._moveToIteration.moveToIteration(workItemIds, newIterationPath, this._getPageNameForCI()).then<IBacklogWorkItemChangeIterationResult>(
                (updatedWorkItemIds: number[]) => {
                    if (!this.isDisposed) {
                        // Clear the work item saving indicator from the workItem and re-enable the appropriate child workItem rows
                        for (let workItemId of workItemIds) {
                            //Unsuppress "items have moved" messages since we are done moving items
                            this.unsuppressMembershipEvaluation([workItemId].concat(rowsToBeDisabled));

                            rowSavingManager.clearRowSaving(workItemId);
                        }

                        // Since this was a successful save, clear any stale error messages
                        this.getMessageArea().clear();
                    }

                    // Let the listeners know that dropping of the work item has completed.
                    return {
                        workItemIds: workItemIds,
                        childWorkItems: updatedWorkItemIds,
                        success: true,
                        newIterationPath: newIterationPath
                    };
                },
                (error) => {
                    // Display the error message in the status area.
                    this.getMessageArea().setError(getErrorMessage(error));

                    // Clear the work item saving indicator from the workItem and re-enable the appropriate rows
                    for (let workItemId of workItemIds) {
                        rowSavingManager.clearRowSaving(workItemId);
                    }

                    // Let the listeners know that dropping of the work item has completed.
                    return {
                        workItemIds: workItemIds,
                        success: false
                    };
                }
            );
        } else {
            return Q.resolve({
                workItemIds: [],
                childWorkItems: [],
                success: true,
                newIterationPath: newIterationPath
            });
        }
    }

    /** Event handler - handle a new unsaved work item item that has been created via the add panel.
      * @param source The event source.
      * @param args   The event arguments - the unsaved work item, and a completion callback to be called when the
      *                                     event has been processed (although work item may not yet be saved). 
      */
    protected addWorkItem(source: any, args?: { workItem: WITOM.WorkItem; insertLocation?: AddItemInsertLocation, callback: (status: AddBacklogItemStatus, continuationPromise?: Promise<boolean>) => void }): void {
        Diag.logTracePoint('ProductBacklogAddPanel.addWorkItem.start');
        Diag.Debug.assertParamIsObject(args, "args");

        let startTime = Date.now();

        let workItem: WITOM.WorkItem = args.workItem;
        let insertLocation: AddItemInsertLocation = args.insertLocation;
        let callback = args.callback;
        let order: number = 0;
        let parentId: number = 0;
        let addAsLastChild: boolean = false;
        let dataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager = this.getGridDataManager();
        let grid = this.getGrid();
        let tempId: number = workItem.tempId;

        Diag.Debug.assertParamIsObject(workItem, "workItem");

        this.postActionCleanup();

        /** Called when we are done processing the add event.
          * The work item may still be saving in the background, but no more backlog-specific processing
          * is needed until that work item save completes. 
          */
        let completeAddEventHandling = (status: AddBacklogItemStatus, continuationPromise?: Promise<boolean>) => {
            // inform caller that we are complete
            if (callback) {
                callback(status, continuationPromise);
            }

            Diag.logTracePoint('ProductBacklogAddPanel.addWorkItem.displayed');
            Backlog._recordAddBacklogItemTelemetry(startTime, CustomerIntelligenceConstants.CustomerIntelligencePropertyValue.ADDBACKLOGITEM_ADDEDFROM_ADDPANEL);
        }

        //add work item to the work item manager
        WorkItemManager.get(workItem.store).setWorkItem(workItem);

        const effect: IAddPanelEffect = this._getCurrentAddEffect(insertLocation);

        // If the work item is not valid at this point, the user has the option to modify it before saving OR
        // canceling the add process. In case of canceling, we do not want to leave an empty unparented row behind.
        let deferUnparentedRowCreation = !workItem.isValid();

        /**
         * Select and ensure the row is in the viewport
         */
        let setSelectedRow = () => {
            let dataIndex = this._grid._getWorkItemDataIndex(tempId);
            if (typeof dataIndex === "undefined" || dataIndex < 0) {
                // Select item at order
                dataIndex = grid.getIndexFromOrder(order);
            }
            if (dataIndex) {
                grid.setSelectedDataIndex(dataIndex);
                grid.getSelectedRowIntoView();
            }
        }

        // Calculate parentId and order for a new unparented row
        let getUnparentedRowInfo = (): { parentId: number; order: number; } => {
            let currentLevel = this._getBacklogLevelHelper().getLevel(this._backlogContext.level.defaultWorkItemType);
            let parentId = this.getOrAddUnparentedRow(currentLevel, false)

            const siblingIds = dataManager.getChildrenWorkItemIds(parentId);
            // Find the last item in the unparented row, and add below that
            if (siblingIds.length > 0) {
                return {
                    parentId: parentId,
                    order: dataManager.getWorkItemOrder(siblingIds[siblingIds.length - 1]) + 1
                };
            }

            // Otherwise, add at the top of the unparented row
            return {
                parentId: parentId,
                order: dataManager.getWorkItemOrder(parentId) + 1
            };
        }

        if (!effect) {
            // Add item at the bottom
            order = dataManager.getMaxOrder();
            addAsLastChild = true;
        } else {

            if (effect.addUnparentedRow) {
                if (!deferUnparentedRowCreation) {
                    // Add item to a new unparented row
                    ({ parentId, order } = getUnparentedRowInfo());
                }

                addAsLastChild = true;
            } else if (effect.isParent) {
                parentId = effect.parentId;
                order = (dataManager.getWorkItemOrder(parentId) || 0) + 1;

                if (effect.nextId === null) {
                    // No reference element given, item will be the only child of the parent
                    addAsLastChild = true;
                }
            } else {
                parentId = effect.parentId;

                if (effect.nextId === null) {
                    if (parentId !== 0) {
                        // Add as last child of parent
                        order = (dataManager.getWorkItemOrder(parentId) || 0) + (dataManager.getDescendantCount(parentId) + 1);
                        addAsLastChild = true;
                    } else {
                        // Special handling for root level items
                        order = dataManager.getMaxOrder() + 1;
                    }
                } else {
                    // Add right above the reference element
                    order = dataManager.getWorkItemOrder(effect.nextId);
                }
            }
        }

        if (parentId > 0) {
            let link: WITOM.WorkItemLink = WITOM.WorkItemLink.create(workItem, WorkItemUtils.PARENT_LINK_NAME, parentId, "");
            workItem.addLinks([link]);
        }

        if (workItem.isValid()) {
            // Add the item to the grid.
            order = dataManager.normalizeOrder(order);

            if (addAsLastChild) {
                dataManager.addWorkItem(tempId, 0, workItem, parentId);
            } else {
                dataManager.addWorkItem(tempId, order, workItem);
            }

            // Items added through the add panel are always owned
            dataManager.updateOwnedIds(tempId, true);

            // Expand to newly created item
            let dataIndex = this._grid._getWorkItemDataIndex(tempId);
            if (dataIndex >= 0) {
                this._grid.ensureDataIndexExpanded(dataIndex);
                this._grid.redraw();
            }

            setSelectedRow();

            // Queue the reorder and ensure that the work item update completes before the reorder operation is
            // sent to the server.
            this._queueReorderByOrder(tempId, order,
                (successCallback, errorCallback) => {
                    workItem.beginSave((args) => {
                        Diag.Debug.assert(Boolean(args.workItems) && args.workItems.length === 1, "Expected 1 work item to be returned after save");

                        // after successful save we need to update the ids of the work items in the grid and in the data manager
                        let newId = args.workItems[0].id
                        dataManager.changeWorkItemId(tempId, newId);

                        // The item has been successfully added to the grid and in the desired location. All that remains
                        // is the background reorder operation, so we can now let users know that an item has been added.
                        // (Even if the reorder fails, the backlog item will remain and is still valid.)
                        this._eventHelper.fire(TFS_Agile.Notifications.BACKLOG_ITEM_ADDED, this);

                        if (successCallback) {
                            // Invoke the success callback with the new work item ID, so the reorder operation can
                            // be queued with the correct ID.
                            successCallback([tempId], [args.workItems[0].id]);
                        } else {
                            // Reorder might have been a noop, just mark the workitem as saved
                            this._getRowSavingManager().clearRowSaving(newId);
                        }
                    },
                        (error) => {
                            // Remove any attempted changes made
                            workItem.discardIfNew();
                            // Remove the row from the grid
                            dataManager.removeWorkItem(tempId);

                            // Display the error
                            this.getMessageArea().setError(error.message);

                            this._getRowSavingManager().clearRowSaving(tempId);
                            errorCallback();
                        });
                }, parentId);

            completeAddEventHandling(AddBacklogItemStatus.Added);
        } else {
            // We need to open the work item form.
            // Create another promise that we can send to the caller so that they can respond when the form is closed
            const workItemFormPromise = new Promise<boolean>((resolve, reject) => {
                let messageSupressor: TFS_Agile.IMessageSuppressor = this._getMessageSuppressor();
                let workItemManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService(WITOM.WorkItemStore));

                let workItemChangeHandler = (source: WorkItemManager, args?: WITOM.IWorkItemChangedArgs) => {
                    Diag.Debug.assertParamIsObject(args, "args");

                    if (args.change === WorkItemChangeType.PreSave) {
                        messageSupressor.suppressAll();
                    } else if (args.firstSave && args.change === WorkItemChangeType.SaveCompleted) {
                        Diag.Debug.assertParamIsObject(args.workItem, "args.workItem");

                        messageSupressor.disableSuppressAll();

                        // Note: Only add the newly created workitem to the backlogs view and ignore any other save events from the links created in this new workitem.
                        // Details: 'args.workitem' is the changed workitem, 'WorkItem' is newly created workitem to which handler is attached.
                        // These two will be same when the newly created workitem is saved. But different if a new link is added to the it and saved.
                        if (workItem.id > 0 && args.workItem.id === workItem.id) {
                            if (effect.addUnparentedRow) {
                                // Creating unparented row was deferred, do now
                                ({ parentId, order } = getUnparentedRowInfo());
                            }

                            order = dataManager.normalizeOrder(order);

                            if (addAsLastChild) {
                                dataManager.addWorkItem(workItem.id, 0, workItem, parentId);
                            } else {
                                dataManager.addWorkItem(workItem.id, order, workItem);
                            }

                            this._membershipTracker.verifyMembership(source, args, (isMember: boolean) => {
                                if (isMember) {
                                    this._queueReorderByOrder(workItem.id, order, null, parentId);
                                }
                            });
                            messageSupressor.suppressAll();
                        } else {
                            this._membershipTracker.verifyMembership(source, args);
                            messageSupressor.suppressAll();
                        }
                    }
                };

                workItemManager.attachWorkItemChanged(workItemChangeHandler);

                // Work item is not valid, open form to allow user to fix
                this._editWorkItem(workItem, (success: boolean) => {
                    workItemManager.detachWorkItemChanged(workItemChangeHandler);
                    messageSupressor.disableSuppressAll();

                    if (success) {
                        setSelectedRow();
                    }

                    // The form closed, resolve the promise
                    resolve(success);
                });
            });

            completeAddEventHandling(AddBacklogItemStatus.WorkItemFormOpened, workItemFormPromise);
        }
    }

    private _getCurrentAddEffect(insertLocation: AddItemInsertLocation): IAddPanelEffect {
        const addPanelBehavior = this._getAddPanelBehavior();

        // Decide behavior on location
        if (insertLocation !== undefined) {
            switch (insertLocation) {
                case AddItemInsertLocation.Top:
                    return addPanelBehavior.getEffectAddToTop();
                case AddItemInsertLocation.Selection:
                    return this._getAddPanelEffectForCurrentGridSelection();
                case AddItemInsertLocation.Bottom:
                    return addPanelBehavior.getEffectAddToBottom();
                default:
                    Diag.Debug.fail("Unexpected enum value for add item location: " + location);
            }
        }
        // Fallback to selection
        return this._getAddPanelEffectForCurrentGridSelection();
    }

    /**
     * Find a row representing unparented items of the given level, or create a new one
     * @param backlogLevel Level of unparented row
     * @param refreshGrid Value indicating whether the grid should be refreshed, if a a new row is added
     * @return Id of unparented row
     */
    public getOrAddUnparentedRow(backlogLevel: number, refreshGrid: boolean = true): number {
        let groupRow: OrphanGroup;
        let parentGroupRow: OrphanGroup;
        let rowAdded = false;

        let rootLevel = this.getRootBacklogLevel();
        for (let l = rootLevel; l < backlogLevel; ++l) {
            parentGroupRow = groupRow;
            groupRow = OrphanGroup.findOrphanedRowForLevel(l);
            if (!groupRow) {
                // Create a new orphan group row for the level
                groupRow = new OrphanGroup(l);
                let id = groupRow.getRowId();
                Diag.Debug.assert(id < 0);

                TFS_Agile_ProductBacklog_Grid.GridGroupRowBase.workitemIDMap[id] = groupRow;

                // Add grouping row to grid
                this.getGridDataManager().addGroupingItem(groupRow.getRowId(), parentGroupRow && parentGroupRow.getRowId() || null);
                this._grid.addWorkItemPageData(groupRow.getRowId(), this._grid.getPageColumns(), groupRow.extendPageData(this._grid.getPageColumns()));

                rowAdded = true;
            }
        }

        if (rowAdded && refreshGrid) {
            this._grid.refresh(false, {});
        }

        return groupRow.getRowId();
    }

    /** Create new instance of backlog level helper */
    protected _createBacklogLevelHelper() {
        let topLevel = this._backlogContext.includeParents ?
            BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels()[0] : this._backlogContext.level;
        this._backlogLevelHelper = new TFS_Agile_WorkItemChanges.BacklogLevelHelper(topLevel);
    }

    /** Get or create backlog level helper */
    protected _getBacklogLevelHelper(): TFS_Agile_WorkItemChanges.BacklogLevelHelper {
        if (!this._backlogLevelHelper) {
            this._createBacklogLevelHelper();
        }

        return this._backlogLevelHelper;
    }

    protected _getWorkItemTypeNameAndStateById(workItemId: number): [string, string] {
        let grid = this._grid;
        let type = grid.getWorkItemTypeNameById(workItemId);
        let state: string = grid.getWorkItemPageDataValue(workItemId, WITConstants.CoreFieldRefNames.State);

        if (!type) {
            try {
                Diag.Debug.assert(state === null, "Was expecting the state to be null if the type was null - non-paged data");

                // see if we can fall back and infer the type from the position
                let dataManager = grid.getDataManager();
                let dataIndex = dataManager.getWorkItemTreeIndex(workItemId);
                let parentDataIndex = dataManager.getParentOfWorkItemAtTreeIndex(dataIndex);
                if (parentDataIndex === 0) {
                    type = grid.getWorkItemTypeNameByIndex(0);
                    // default to the first Proposed meta state in the top-level
                    if (!!type && !state && !this._backlogContext.includeParents) {
                        let proposedStates = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStatesForStateCategory(type, WorkItemStateCategory.Proposed);
                        Diag.Debug.assert((proposedStates instanceof Array) && !!proposedStates.length, "Didn't get any proposed states from the following backlog level: " + this._backlogContext.level.name);
                        state = proposedStates[0];
                    }
                }
            }
            catch (e) {
                // swallow exception. At worst we return null for the type/state
                Diag.Debug.fail("Exception when attempting to infer default type/state");
            }
        }

        return [type, state];
    }

    /** Get or create the item hierarchy for the backlog */
    public getItemHierarchy(): TFS_Agile_WorkItemChanges.IItemDataHierarchy<TFS_Agile_WorkItemChanges.IWorkItemHierarchyData> {
        if (!this._itemHierarchy) {
            // Delegates to lookup additional information not directly accessible by the grid data manager
            let isExpanded = (workItemId: number) => {
                let dataIndex = this._grid._getWorkItemDataIndex(workItemId);
                return (dataIndex >= 0) && (this._grid._getExpandState(dataIndex) > 0);
            }

            this._itemHierarchy = new ProductBacklogItemHierarchyAdapter(
                this.getGridDataManager(),
                workItemId => this._getWorkItemTypeNameAndStateById(workItemId),
                isExpanded);
        }

        return this._itemHierarchy;
    }

    /**
     * queue a reorder operation for a workitem using the order
     * 
     * @param workItemId the workitem id being added
     * @param order the order of the workitem
     * @param reorderPreProcessingCallback 
     * OPTIONAL: Function to invoke before performing the reorderoperation.  The function should have the following signature:
     *     function reorderPreProcessingCallback(successCallback, errorCallback)
     * 
     * The successCallback can optionally be provided with a new work item ID for the work item being reordered (in cases where
     * the work item is being created, the ID will not be known in advance).
     * 
     * The reorder operation will be sent to the server only if the reorder preprocessing is successful.
     * 
     * @param parentId Optional parentId to override automatic detection
     */
    public _queueReorderByOrder(workItemId: number,
        order: number,
        reorderPreProcessingCallback?: (successCallback: (oldReorderWorkItemIds: number[], newReorderWorkItemIds: number[]) => void, errorCallback: Function) => void,
        parentId?: number) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");
        Diag.Debug.assertParamIsNumber(order, "order");

        let gridDataManager = this.getGridDataManager();
        let prevId = gridDataManager.getPrevWorkItemId(order);
        let nextId = gridDataManager.getNextWorkItemId(order);
        parentId = parentId || gridDataManager.getParentWorkItemId(order);

        this._getRowSavingManager().markRowAsSaving(workItemId);

        TFS_Agile.WorkItemReorderHelpers.queueReorderOperation(
            this._reorderOperationQueue,
            this._reorderManager,
            [workItemId],
            parentId,
            prevId,
            nextId,
            reorderPreProcessingCallback);
    }

    /**
     * Bulk reparent work items to a new parent. 
     *
     * @workItemIds Ids of work items to be reparented
     * @newParentId Id of new parent work item
     * @successCallback Callback after successful save
     * @errorCallback Callback in case an error occurs
     */
    public beginReparentWorkItems(workItemIds: number[], newParentId: number, successCallback?: IResultCallback, errorCallback?: Function) {
        let workItemManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore));

        let errorHandler = (error: TfsError) => {
            let message = Utils_String.format(AgileProductBacklogResources.StatusMessage_FatalError, error.message);

            // Display the error message in the status area.
            this.getMessageArea().setError(message, () => {
                window.location.reload();
            });

            // Unblock all work items in error state to allow user to interact with them to fix
            for (let workItemId of workItemIds) {
                this._getRowSavingManager().clearRowSaving(workItemId);
            }

            if ($.isFunction(errorCallback)) {
                errorCallback();
            }
        }

        if (!workItemIds || !workItemIds.length) {
            // Nothing to reparent, execute successCallback and return
            if ($.isFunction(successCallback)) {
                successCallback();
            }
            return;
        }

        workItemManager.beginGetWorkItems(
            workItemIds,
            (workItems: WITOM.WorkItem[]) => {
                let workItemReparented: boolean = false;

                // Queue updates for each workitem
                for (let workItem of workItems) {
                    if (WorkItemUtils.reparentWorkItem(workItem, newParentId)) {
                        workItemReparented = true;
                    }
                }

                // Perform one bulk save. This will only succeed if all workitems could be saved
                workItemManager.store.beginSaveWorkItems(workItems, (args: WITOM.IWorkItemsBulkSaveSuccessResult) => {
                    if (workItemReparented) {
                        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                            workItems.length > 1 ?
                                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_MULTISELECT_REPARENT :
                                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_REPARENT,
                            {
                                "NumberOfSelectedItems": workItems.length,
                            }));
                    }

                    if ($.isFunction(successCallback)) {
                        successCallback();
                    }
                },
                    errorHandler);
            },
            errorHandler);
    }

    public beginReparentWorkItem(isNewParent: boolean, workItemId: number, newParentId: number, successCallback?: IResultCallback, errorCallback?: () => any) {
        let workItemManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore));

        let handleError = (message: string) => {
            // Display the error message in the status area.
            this.getMessageArea().setError(message, () => {
                window.location.reload();
            });

            this._getRowSavingManager().clearRowSaving(workItemId);
        }

        // If the work item has a new parent, update the link.
        if (isNewParent) {
            workItemManager.beginGetWorkItem(workItemId,
                function (workItem) {
                    WorkItemUtils.reparentWorkItem(workItem, newParentId);

                    // Save the work item after making the parent link changes
                    workItem.beginSave(
                        function (args) {
                            Diag.Debug.assert(Boolean(args.workItems) && args.workItems.length === 1, "Expected 1 work item to be returned after save");
                            if ($.isFunction(successCallback)) {
                                successCallback();
                            }
                        },
                        function (error) {
                            handleError(Utils_String.format(AgileProductBacklogResources.StatusMessage_FatalError, error.message));
                            if ($.isFunction(errorCallback)) {
                                errorCallback();
                            }
                        });
                },
                function (error) {
                    handleError(Utils_String.format(AgileProductBacklogResources.StatusMessage_FatalError, error.message));
                    if ($.isFunction(errorCallback)) {
                        errorCallback();
                    }
                });
        }
        else {
            // After the move operation the parent has not changed, so just need to indicate success so the reorder operation can proceed.
            if ($.isFunction(successCallback)) {
                successCallback();
            }
        }
    }

    /** Ensure previous and next Ids are owned and belong to same level as items being reordered */
    protected _getReorderLocation(workItemIds: number[], location: TFS_Agile_WorkItemChanges.ILocation): TFS_Agile_WorkItemChanges.ILocation {
        let backlogLevelHelper = this._getBacklogLevelHelper();
        let itemHierarchy = this.getItemHierarchy();
        let targetLocation = <TFS_Agile_WorkItemChanges.ILocation>$.extend({}, location);

        let reorderData = itemHierarchy.getData(workItemIds[0]);
        Diag.Debug.assert(reorderData && reorderData.type !== null, "Data for previous item should be paged in");

        let reorderLevel = backlogLevelHelper.getLevel(reorderData.type);

        if (targetLocation.previousId) {
            if (OrphanGroup.getGroupRow(targetLocation.previousId) !== null) {
                targetLocation.previousId = null;
            }
            else {
                let previousData = itemHierarchy.getData(targetLocation.previousId);
                Diag.Debug.assert(previousData && previousData.type !== null, "Data for previous item should be paged in");

                let previousLevel = backlogLevelHelper.getLevel(previousData.type);

                if (previousLevel !== reorderLevel || !previousData.isOwned) {
                    targetLocation.previousId = null;
                }
            }
        }

        if (targetLocation.nextId) {
            if (OrphanGroup.getGroupRow(targetLocation.nextId) !== null) {
                targetLocation.nextId = null;
            }
            else {
                let nextData = itemHierarchy.getData(targetLocation.nextId);
                Diag.Debug.assert(nextData && nextData.type !== null, "Data for next item should be paged in");

                let nextLevel = backlogLevelHelper.getLevel(nextData.type);

                if (nextLevel !== reorderLevel || !nextData.isOwned) {
                    targetLocation.nextId = null;
                }
            }
        }
        return targetLocation;
    }

    protected _handleMoveWorkItems(workItemIds: number[], workItemIdsToReparent: number[], targetLocation: TFS_Agile_WorkItemChanges.ILocation, performReorder: boolean): IPromise<void> {
        for (let workItemId of workItemIds) {
            this._getRowSavingManager().markRowAsSaving(workItemId);
        }

        let deferred = Q.defer<void>();

        targetLocation = this._getReorderLocation(workItemIds, targetLocation);

        let ownedWorkItems = workItemIds.filter(id => this.getGridDataManager().isOwnedItem(id));
        if (performReorder && ownedWorkItems.length > 0) {
            // Queue the reorder with a reorder preprocessing callback.  This will ensure that the work item update is completed
            // prior to the reorder request being sent to the server.

            let unownedWorkItemsIdsToReparent = workItemIds.filter(id => !this.getGridDataManager().isOwnedItem(id));

            // Reorder owned items, reparent all items.
            TFS_Agile.WorkItemReorderHelpers.queueReorderOperation(
                this._reorderOperationQueue,
                this._reorderManager,
                ownedWorkItems,
                targetLocation.parentId,
                targetLocation.previousId,
                targetLocation.nextId,
                (successCallback, errorCallback) => {
                    this.beginReparentWorkItems(workItemIdsToReparent, targetLocation.parentId, () => {
                        for (let unownedWorkItemId of unownedWorkItemsIdsToReparent) {
                            this._getRowSavingManager().clearRowSaving(unownedWorkItemId);
                        }

                        if ($.isFunction(successCallback)) {
                            successCallback();
                        }
                    }, errorCallback);
                },
                () => {
                    deferred.resolve(null);
                });
        } else {
            this.beginReparentWorkItems(workItemIdsToReparent, targetLocation.parentId || 0, () => {
                for (let workItemId of workItemIds) {
                    this._getRowSavingManager().clearRowSaving(workItemId);
                }

                deferred.resolve(null);
            });
        }

        return deferred.promise;
    }

    protected _attachReorderRequestComplete() {
        this._reorderManager.attachRequestComplete(this._reorderRequestComplete);
    }

    private _reorderRequestComplete = (source, args): void => {
        let i, l,
            processed = args.processedIds;

        // if successfully reordered clear the reorder state for successful elements
        if (args.success && processed) {
            for (i = 0, l = processed.length; i < l; i++) {
                this._getRowSavingManager().clearRowSaving(processed[i]);
            }
        }
        else {
            if (args.clientError) {
                this.getMessageArea().setError(Utils_String.format(AgileProductBacklogResources.StatusMessage_RecoverableError, args.error.message), () => {
                    this._reorderManager.resume();
                });
            }
            else {
                this.getMessageArea().setError(Utils_String.format(AgileProductBacklogResources.StatusMessage_FatalError, args.error.message), () => {
                    window.location.reload();
                });

            }
        }
    }

    /**
     * Attach a handler for the drop work item completed event.
     * 
     * @param handler The handler to attach.
     */
    public attachDropWorkItemCompleted(handler: IBacklogEventHandler<IBacklogWorkItemChangeIterationResult>) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(Backlog.EVENTS_DROP_WORK_ITEM_COMPLETED, <any>handler);
    }

    /**
     * Remove a handler for the drop work item completed event
     * 
     * @param handler The handler to remove
     */
    public detachDropWorkItemCompleted(handler: IBacklogEventHandler<IBacklogWorkItemChangeIterationResult>) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(Backlog.EVENTS_DROP_WORK_ITEM_COMPLETED, <any>handler);
    }

    /**
     * Registers a notification handler for the backlog query save completed event
     */
    private _registerBacklogQuerySaveCompleted() {
        this._eventHelper.attachEvent(TFS_Agile.Notifications.BACKLOG_QUERY_SAVE_COMPLETED, this._querySaveCompleted);
    }

    private _querySaveCompleted = (source, args): void => {
        if (args.success) {
            this._showBacklogQueryCreatedMessage(args.query.path);
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_BACKLOGS_CREATEQUERY, {}));
        }
        else {
            this._showBacklogQueryErrorMessage();
        }

        Diag.logTracePoint('Backlog.NewQuerySave.Complete');
    }

    /**
     * Registers the action worker that will filter out evaluating work items changed by explicit actions (e.g. drag and drop)
     */
    /**
     * Filter the evaluation so that we only look at work items that are already on the backlog
     */
    private _registerGridWorkItemFilter() {
        Events_Action.getService().registerActionWorker(TFS_Agile.Actions.EVALUATE_MEMBERSHIP, this._verifyWorkItemFilterMembership);
        Events_Action.getService().registerActionWorker(TFS_Agile.Actions.BACKLOG_FILTER_SELECTION, this._filterSelectedAction);
    }

    private _verifyWorkItemFilterMembership = (actionArgs: TFS_Agile.IEvaluateMembershipActionArgs, next): void => {
        Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
        Diag.Debug.assertParamIsObject(actionArgs.workItem, "actionArgs.workItem");
        Diag.Debug.assertParamIsFunction(actionArgs.sendResult, "actionArgs.sendResult");

        if (this.getGridDataManager().getWorkItemTreeIndex(actionArgs.workItem.id) !== undefined) {
            next(actionArgs);
        }
        else {
            actionArgs.sendResult(true);
        }
    }

    private _filterSelectedAction = (actionArgs: TFS_Agile.IBacklogFilterWorkItemsActionArgs, next): number[] => {
        Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
        Diag.Debug.assertParamIsObject(actionArgs.selectedWorkItemIds, "actionArgs.selectedWorkItemIds");

        let selectionFilter = this.getSelectionFilter();
        if (selectionFilter) {
            return selectionFilter.filter(actionArgs.selectedWorkItemIds);
        } else if ($.isFunction(next)) {
            return next(actionArgs);
        }
    }

    /* protected */
    /**
     * Registers with the work item manager to clear the message area when a saving operation is initiated
     */
    public _registerMessageAreaClearing() {

        let $link = $("a.agile-portfolio-management-notification-disable");
        if ($link) {
            // Hooking to the <a href /> in the message, which will dismiss the notification.
            // When the notification is dismissed, the 'notification-dismissed' event is fired
            // which sends the flag to server for the "project" scope.
            $link.bind("click.tfs.agile", () => {
                let messageAreaControl = <Notifications.MessageAreaControl>Controls.Enhancement.getInstance(Notifications.MessageAreaControl, $(".agile-portfolio-management-notification"));
                messageAreaControl.clear();
            });
        }
    }

    /**
     * Get a meta fields ref name from the project settings
     * 
     * @param fieldType The fields meta type value
     * @param callback Callback which will receive field ref name as sole parameter
     */
    private _beginGetSettingsField(fieldType: number, callback: IResultCallback) {
        Diag.Debug.assertParamIsNumber(fieldType, "fieldType");
        Diag.Debug.assertParamIsFunction(callback, "callback");

        TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<TFS_AgileCommon.ProjectProcessConfigurationService>(TFS_AgileCommon.ProjectProcessConfigurationService).beginGetProcessSettings(function (processSettings) {
            let typeFields = processSettings.typeFields,
                fieldRefName;

            $.each(typeFields, function (i, typeField) {
                if (typeField.type === fieldType) {
                    fieldRefName = typeField.name;
                    return false;
                }
            });

            Diag.Debug.assertIsNotUndefined(fieldRefName, "Field reference name should be found");

            callback(fieldRefName);
        });
    }

    private _getOwnerShipEvaluator(): BacklogOwnershipEvaluator {
        if (!this._ownershipEvaluator) {
            this._ownershipEvaluator = new BacklogOwnershipEvaluator(this._backlogContext.team.id);
        }
        return this._ownershipEvaluator;
    }

    /**
     * Process the result of the membership evaluation.
     * 
     * @param args See VSS.Agile.Notifications.MEMBERSHIP_EVALUATED.
     * {
     *     workItem: the work item evaluated
     *     changedFields: the fields on the work item which have been modified
     *     isMember: is the work item still a valid member of the backlog?
     * }
     * 
     */
    private _processMembershipEvaluation = (source, args?: any) => {
        let workItem = args.workItem;
        let isMember = args.isMember;
        let changedFields: IDictionaryStringTo<WITOM.Field> = args.changedFields;

        if (!isMember) { // Not a member of the backlog any more
            if (this.getGridDataManager().getDescendantCount(workItem.id) === 0) { // Leaf node so remove
                this._beginShowRemovedWorkItemMessage(workItem, changedFields, () => {
                    this._removeWorkItemFromGrid(workItem.id);
                });
            }
            else { // Has children so just show refresh message
                this._showRefreshMessage();
            }
        }
        else if (this._checkFieldChanges(workItem, changedFields, [WITConstants.CoreFieldRefNames.WorkItemType])[0]) {
            // WorkItem type has changed, so show refresh message
            this._showRefreshMessage();
        }
        else { // Still a member of the backlog - now check if backlog order was changed
            this._beginGetSettingsField(TFS_AgileCommon.ProjectProcessConfiguration.FieldType.Order, (orderFieldRefName: string) => {
                if (this._checkFieldChanges(workItem, changedFields, [orderFieldRefName])[0]) {
                    this._showOrderFieldChangedMessage();
                }
            });
        }
    }

    /**
     * OVERRIDE: Workitem manager workItemChangeEvent handler.
     */
    protected _attachWorkItemChangeEvent() {

    }

    private _detachWorkItemChangeEvent() {
        this._workItemIdsToRemove = {};
        this.getWorkItemManager().detachWorkItemChanged(this._workItemChangeEventHandler);
    }

    /**
     * Check whether a specific field has changed on the most recent revision of a work item
     * 
     * @param workItem The work item to check
     * @param changedFields The set of fields that have been changed
     * @param fieldNames List of field ref names to check
	 * @param checkFirstRevision Pass True if changes should be checked on a WorkItem's First Revision (Brand New Work Item)
	 *
     * @return List of flags corresponding to the input array with true indicating a change, false otherwise
     */
    private _checkFieldChanges(workItem: WITOM.WorkItem, changedFields: IDictionaryStringTo<WITOM.Field>, fieldNames: string[], checkFirstRevision?: boolean): boolean[] {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsObject(changedFields, "changedFields");
        Diag.Debug.assertParamIsArray(fieldNames, "fieldNames");

        return $.map(fieldNames, function (item, index) {
            let field = workItem.getField(item);
            let fieldValueChanged = false;

            // If the set of changed fields doesn't contain the field then it did not change.
            if (field) {
                // rev 1 (new) work items will have many 'changed' fields and should
                // be ignored
                if ((workItem.revision > 1 || checkFirstRevision) && changedFields[field.fieldDefinition.referenceName]) {
                    fieldValueChanged = true;
                }
            }

            return fieldValueChanged;
        });
    }

    /**
     * Shows a message to the user indicating that the backlog integrity may be compromised and they should refresh.
     * 
     * @param message Message to override default refresh message
     */
    private _showRefreshMessage(message?: string) {

        let that = this,
            $div = $("<div>"),
            refreshMessage = message || AgileProductBacklogResources.BacklogInfo_RefreshRequired,
            $message = $("<span>").text(refreshMessage),
            $link = $("<a>").attr("href", "#").text(AgileProductBacklogResources.BacklogInfo_RefreshRequired_LinkText);

        $link.click(function (e) {
            if (e) {
                e.preventDefault();
            }

            that._refreshDisplay();
        });

        $div.append($message);
        $div.append($link);

        this.getMessageArea().setMessage({
            header: $div
        }, Notifications.MessageAreaType.Warning);
    }

    /**
     * Shows the message indicating that the order field was changed by a non-drag reorder operation (e.g. manual edit in work item from)
     */
    private _showOrderFieldChangedMessage() {
        this._showRefreshMessage(AgileProductBacklogResources.BacklogInfo_OrderFieldRefresh);
    }

    /**
     * Show the message indicating that the work item was removed
     * 
     * @param workItem The work item to show the message for
     * @param changedFields The set of fields that have changed on this work item.
     * @param callback Parameterless callback to invoke when message has been shown
     */
    private _beginShowRemovedWorkItemMessage(workItem: WITOM.WorkItem, changedFields: IDictionaryStringTo<WITOM.Field>, callback: IResultCallback) {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsObject(changedFields, "changedFields");
        Diag.Debug.assertParamIsFunction(callback, "callback");

        this._beginGetSettingsField(TFS_AgileCommon.ProjectProcessConfiguration.FieldType.Team, (teamField) => {
            let fieldsToCheck = [WITConstants.CoreFieldRefNames.TeamProject, WITConstants.CoreFieldRefNames.IterationPath, WITConstants.CoreFieldRefNames.State, teamField],
                fieldChangedStates = this._checkFieldChanges(workItem, changedFields, fieldsToCheck, true),
                fieldsThatChanged = [];

            $.each(fieldChangedStates, function (i, fieldChangeState) {
                if (fieldChangeState) {
                    fieldsThatChanged.push(fieldsToCheck[i]);
                }
            });

            this._showRemovedWorkItemMessage(workItem, fieldsThatChanged);
            callback();
        });
    }

    /**
     * Shows a message indicating that a work item was removed from the backlog grid by a non-explicit gesture (e.g. manual edit in work item from)
     * 
     * @param workItem The work item that was removed
     * @param fields The list of field reference names that changed
     */
    private _showRemovedWorkItemMessage(workItem: WITOM.WorkItem, fields: any[]) {

        function generateDetailsContent() {
            let $div = $("<div>").addClass("backlog-info"),
                $listHeader = $("<p>"),
                $list = $("<ul>"),
                $listFooter = $("<p>"),
                $editLink,
                actionUrl = tfsContext.getActionUrl("edit", "workItems", {
                    parameters: [workItem.id]
                });

            $listHeader.text(AgileProductBacklogResources.BacklogInfo_WorkItemRemoved_ListHeader);

            $.each(fields, function (i, fieldRefName) {
                let $li = $("<li>"),
                    fieldName = workItem.getField(fieldRefName).fieldDefinition.name,
                    fieldValue = workItem.getField(fieldRefName).getValue(),
                    fieldNameHtml = Utils_String.format("<strong>{0}</strong>", fieldName),
                    fieldValueHtml = Utils_String.format("<strong>{0}</strong>", fieldValue);

                $li.append(Utils_String.format(AgileProductBacklogResources.BacklogInfo_WorkItemRemoved_ListItem, fieldNameHtml, fieldValueHtml));

                $list.append($li);
            });

            $listFooter.append(AgileProductBacklogResources.BacklogInfo_WorkItemRemoved_Footer);
            $editLink = $("<a>").attr('href', actionUrl);
            $editLink.text(AgileProductBacklogResources.BacklogInfo_WorkItemRemoved_Footer_LinkText);
            $listFooter.append($editLink);

            $div.append($listHeader);
            $div.append($list);
            $div.append($listFooter);

            return $div;
        }

        this.getMessageArea().setMessage({
            header: Utils_String.format(AgileProductBacklogResources.BacklogInfo_WorkItemRemoved_Header, workItem.getTitle()),
            content: generateDetailsContent()
        }, Notifications.MessageAreaType.Info);
    }

    /**
     * Handler for common toolbar menu item click
     * 
     * @param e Event args
     */
    public _onToolbarItemClick(e?: any) {
        Diag.Debug.assertParamIsObject(e, "e");

        let command = e.get_commandName();

        this._handleCommonMenuItemClick(command);
    }

    /**
     * Launch the new query dialog providing the current Backlog query
     * 
     * @param cancelDialogAction The cancel function to ensure future dialog actions can be processed
     */
    private _launchNewQueryDialog(): void {
        if (!this.isDisposed) {
            const grid = this.getGrid();

            const queryItem = {
                wiql: grid._options.wiql,
                name: this._getBacklogQueryName()
            } as QueryItem;

            showDialog(QueriesHubContext.getInstance(), QuerySaveDialogMode.NewQuery, queryItem, MyQueriesFolderName, (savedQueryItem: QueryItem) => {
                this._eventHelper.fire(TFS_Agile.Notifications.BACKLOG_QUERY_SAVE_COMPLETED,
                    this,
                    {
                        success: true,
                        query: savedQueryItem
                    });
            }, () => this.isDisposed);
            Diag.logTracePoint('Backlog.Toolbar._launchNewQueryDialog_complete');
        }
    }

    /**
     * Shows the create query error message
     */
    private _showBacklogQueryErrorMessage() {
        this.getMessageArea().setError(AgileProductBacklogResources.CreateQuery_Error);
    }

    /**
     * Shows the backlog query created message
     * 
     * @param queryPath The path to the query
     */
    private _showBacklogQueryCreatedMessage(queryPath: string) {
        Diag.Debug.assertParamIsString(queryPath, "queryPath");
        let $div,
            $a,
            href = tfsContext.getActionUrl("Index", "queries") + "?path=" + encodeURIComponent(queryPath) + "&_a=query";

        $div = $("<div>").text(AgileProductBacklogResources.CreateQuery_Created);
        $a = $("<a>").addClass("backlog-query-navigate").attr("href", href).text(AgileProductBacklogResources.CreateQuery_ClickHere);

        $div.append($a);

        this.getMessageArea().setMessage({
            header: $div,
            type: Notifications.MessageAreaType.Info
        });
    }

    /**
     * Launch the column options experience
     */
    public launchColumnOptions(): void {
        Diag.logTracePoint('Backlog.ClickColumnOptions.start');

        this.launchNewColumnOptionsPanel();

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_BACKLOGS_COLUMNOPTIONS, {}));
    }

    public launchNewColumnOptionsPanel(props?: IColumnOptionsPanelProps) {
        const displayColumns: IColumnOptionsPanelDisplayColumn[] = this._getDisplayColumns().map(c => ({
            fieldRefName: c.name,
            width: c.width,
            isRequired: Utils_String.equals(c.name, WITConstants.CoreFieldRefNames.Title, true)
        } as IColumnOptionsPanelDisplayColumn));

        const defaultProps: IColumnOptionsPanelProps = {
            displayColumns: displayColumns,
            allowSort: false,
            onOkClick: (result: IColumnOptionsResult) => {
                this._saveDialogResultsColumns(result.display, () => {
                    if (!this._options.isNewHub) {
                        this._refreshDisplay();
                    }
                    if (this._options.onColumnsChanged) {
                        this._options.onColumnsChanged();
                    }
                });
            }
        };

        showColumnOptionsPanel({ ...defaultProps, ...props });
    }

    /**
     * Gets the work item fields that are included in the current backlog grid and being displayed.
     */
    private _getDisplayColumnFields() {
        let displayColumns = this._getDisplayColumns();

        return $.map(displayColumns, (column: Grids.IGridColumn) => {
            if (column.fieldId) { // Only columns with fieldIds have valid WIT fields
                return column.name;
            }
        });
    }

    protected _matchesCurrentColumns(columns: IDisplayColumnResult[]): boolean {
        //Confirm column settings have changed
        let currentColumns = this._getDisplayColumns();
        if (columns.length !== currentColumns.length) {
            return false;
        }
        else {
            for (let index = 0; index < columns.length; index += 1) {
                if (columns[index].id !== currentColumns[index].fieldId || columns[index].width !== currentColumns[index].width) {
                    return false;
                }
            }
        }
        //No differences have been found
        return true;
    }

    /**
     * Gets the list of columns that are being displayed on the Grid
     * 
     * @return List of column objects (properties vary)
     */
    private _getDisplayColumns(): Grids.IGridColumn[] {
        let allGridColumns = this._grid.getColumns(); // this will include hidden & static columns

        return $.map(allGridColumns, (column: Grids.IGridColumn) => {
            if (!column.hidden && column.canMove) {
                return column;
            }
        });
    }

    /**
     *     Handler given to the Grid which is in turn passed to the context menu creator to
     *     handle errors that occur when performing context actions.
     * 
     * @param error Error information
     */
    private _contextMenuErrorHandler(error: TfsError) {
        Diag.Debug.assertParamIsObject(error, "error");
        Diag.Debug.assertIsString(error.message, "error.message expected to be passed to _contextMenuErrorHandler");

        this.getMessageArea().setError(error.message);
    }

    /**
     * Handle grid column resize and move events
     */
    private _onColumnsChanged = () => {
        this._saveColumns(this._grid.getColumns());
    }

    protected _getMessageSuppressor(): TFS_Agile.IMessageSuppressor {
        if (!this._messageSuppressor) {
            this._messageSuppressor = this._registerMessageSuppressor();
        }

        return this._messageSuppressor;
    }

    /**
     * Suppress backlog membership evaluation for a set of work items
     * 
     * @param workItemIds The list of work item ids
     */
    public suppressMembershipEvaluation(workItemIds: number[]) {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");

        let suppressor = this._getMessageSuppressor();
        $.each(workItemIds, (i, workItemId) => {
            suppressor.suppress(workItemId);
        });
    }

    /**
     * Unuppress backlog membership evaluation for a set of work items
     * 
     * @param workItemIds The list of work item ids
     */
    public unsuppressMembershipEvaluation(workItemIds: number[]) {
        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertIsObject(this._messageSuppressor, "Unsuppress is called inappropriately");

        $.each(workItemIds, (i, workItemId) => {
            this._messageSuppressor.unsuppress(workItemId);
        });
    }

    /**
     * Affords suppressing membership evaluation by injecting action worker at beginning of action workflow
     * 
     * @return The suppressor object:
     * {
     *     suppress: function(workItemId)
     *     unsuppress: function(workItemId)
     *     isSuppressed: function(workItemId)
     * }
     *  
     */
    private _registerMessageSuppressor(): TFS_Agile.IMessageSuppressor {

        let suppressions: boolean[];
        let suppressAll: boolean = false;
        let suppressorHandle: TFS_Agile.IMessageSuppressor = {
            suppress: function (workItemId: number) {
                suppressions[workItemId] = true;
            },
            unsuppress: function (workItemId: number) {
                delete suppressions[workItemId];
            },
            isSuppressed: function (workItemId: number) {
                return suppressions[workItemId] || false;
            },
            suppressAll: function () {
                suppressAll = true;
            },
            disableSuppressAll: function () {
                suppressAll = false;
            }
        };

        suppressions = [];
        this._messageSuppressorFunction = function (actionArgs: TFS_Agile.IEvaluateMembershipActionArgs, next) {
            let id = actionArgs.workItem.id;

            // Check if we're suppressing or not.
            if (suppressAll) {
                return;
            }
            else if (suppressorHandle.isSuppressed(id)) {
                // Remove suppressions and send the result
                suppressorHandle.unsuppress(id);
            }
            else {
                next(actionArgs);
            }
        }
        Events_Action.getService().registerActionWorker(TFS_Agile.Actions.EVALUATE_MEMBERSHIP, this._messageSuppressorFunction, 10);

        return suppressorHandle;
    }

    /**
     *     Function passed to the grid that is called when the context menu creation is invoked. At this point in time we
     *     can dynamically add context-sensitive menu items based on the selected work item.
     * 
     * @param menuOptions Context menu options
     * @param options Options provided by the grid
     */
    public _contextMenuCreator(menuOptions: TFS_Agile_ProductBacklog_Grid.IGridMenuOptions, options?: TFS_Agile_ProductBacklog_Grid.IProductBacklogGridMenuOptions) {

        if (!options) {
            return;
        }

        let creator = this._getContextMenuCreator();

        if (creator) {
            creator.createContextMenu(options.workItemIds, menuOptions, options);
        }
    }

    /** Get (and create) context menu creator */
    protected _getContextMenuCreator(): TFS_Agile_ProductBacklog_ContextMenu.BacklogContextMenuCreator {
        return null;
    }

    /**
     * Get the work item type for a given work item
     * 
     * @param workItemId The work item to check
     * @return The work item type of the given work item
     */
    public _getWorkItemTypeName(workItemId: number): string {
        return this.getGrid().getWorkItemTypeNameById(workItemId);
    }

    /**
     * Get the work item category for valid children of the specified work item type.
     * 
     * @param workItemType The work item type
     */
    public _getChildWorkItemCategory(workItemType: string): string {
        let descendentBklgLvl = TFS_Agile_Utils.BacklogLevelUtils.getDescendentBacklogLevelConfigurationForWorkItemType(workItemType);
        return descendentBklgLvl ? descendentBklgLvl.name : Utils_String.empty;
    }

    public getDraggingWorkItemInformation(): IWorkItemDragInfo {
        // If there is row info for the item being dragged, see if it is a leaf node.
        let draggingRowInfo = this._grid.getDraggingRowInfo();
        if (draggingRowInfo) {
            // An item is being dragged
            let selectedWorkItemIds = this._grid.getSelectedWorkItemIds();

            if (!selectedWorkItemIds || selectedWorkItemIds.length === 0) {
                return null;
            }

            const areAllItemsOwned = selectedWorkItemIds.every(workItemId => this._gridDataManager.isOwnedItem(workItemId));
            const selectedWorkItemTypes = selectedWorkItemIds.map(workItemId => this._grid.getWorkItemTypeNameById(workItemId));

            let topLevelWorkItemIds = selectedWorkItemIds;
            let topLevelWorkItemTypes = selectedWorkItemTypes;

            const selectionFilter = this.getSelectionFilter();
            if (selectionFilter) {
                topLevelWorkItemIds = selectionFilter.filter(selectedWorkItemIds);
                topLevelWorkItemTypes = topLevelWorkItemIds.map((workItemId) => this._grid.getWorkItemTypeNameById(workItemId));
            }

            return {
                areAllItemsOwned,
                selectedWorkItemIds,
                selectedWorkItemTypes,
                topLevelWorkItemIds,
                topLevelWorkItemTypes
            };
        }
    }

    /**
     * Accept handler for the droppable items in the sprint list.  Will delegate to this._$acceptWorkItemDrop.
     * 
     * @param $element Element being dropped.
     * @return 
     */
    private _acceptDroppableHandler($element: JQuery, $droppedElement: JQuery): boolean {
        Diag.Debug.assertParamIsObject($element, "$element");
        Diag.Debug.assertParamIsObject($droppedElement, "$droppedElement");
        const dragInfo = this.getDraggingWorkItemInformation();
        if (dragInfo) {
            const {
                areAllItemsOwned,
                selectedWorkItemTypes
            } = dragInfo;

            let sprintView = this._getSprintView();
            return sprintView.isValidDropTargetForWorkItemTypes($droppedElement, selectedWorkItemTypes, areAllItemsOwned);
        }

        return false;
    }

    /**
     * Invoked when items are dropped on a sprint.  Will update the iteration path of the user story and all of its children to the new iteration.
     * 
     * @param event Information about the event.
     * @param ui Information about the ui elements being manipulated.
     * @param $droppedElement The element that the item was dropped on.
     */
    private _dropHandler(event: any, ui: any, $droppedElement: JQuery) {
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(ui, "ui");
        Diag.Debug.assertParamIsObject($droppedElement, "$droppedElement");
        Diag.logTracePoint('ProductBacklog._dropItemToSprint.start');

        // Get the work item IDs to be moved
        let workItemIds: number[] = ui.helper.data(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DATA_WORK_ITEM_IDS) || [];
        workItemIds = workItemIds.filter(id => OrphanGroup.getGroupRow(id) === null);

        // Get the node associated with the element that is being dropped on.
        let sprintView = this._getSprintView();
        let node = sprintView.getNodeFromElement($droppedElement);
        let newIterationPath = node.iterationPath;

        this.moveWorkItemsToIterationAndFireDropCompleted(workItemIds, newIterationPath);

        ui.helper.data(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DROP_SUCCESSFUL, true);
        Diag.logTracePoint('ProductBacklog._dropItemToSprintClientSide.complete');
    }

    public moveWorkItemsToIterationAndFireDropCompleted(workItemIds: number[], newIterationPath: string) {

        this.moveWorkItemsToIteration(workItemIds, newIterationPath).then(
            (workItemMoveResult: IBacklogWorkItemChangeIterationResult) => {
                if (!this.isDisposed) {
                    this._raiseDropWorkItemCompleted(workItemMoveResult);
                }
                Diag.logTracePoint('ProductBacklog._dropItemToSprint.complete');
            }, (error) => {
                Diag.logError(error.toString());
            }
        );
    }

    /**
     * Notifies listeners that dropping of a work item has completed.
     * 
     * @param args args
     */
    private _raiseDropWorkItemCompleted(args?: IBacklogWorkItemChangeIterationResult) {

        Diag.Debug.assertParamIsObject(args, "args");

        this._events.invokeHandlers(Backlog.EVENTS_DROP_WORK_ITEM_COMPLETED, this, args);
    }

    /**
     * Gets the fields necessary for reparenting an object
     * 
     * @return The array of fields to copy from the parent
     */
    public _getParentOptionFields(teamId: string): string[] {
        return TFS_Agile_Utils.WorkItemUtils.getParentOptionFields(teamId);
    }

    public _checkBugVisibility(processSettings: any): boolean {
        if (processSettings.bugWorkItems && this._teamSettings.showBugCategoryWorkItem === true) {
            return true;
        }
        return false;
    }

    public static findColumnIndex(columnNames: string[], columnName: string): number {
        return Utils_Array.findIndex(columnNames, name => {
            return Utils_String.ignoreCaseComparer(columnName, name) === 0;
        });
    }

    /** Return the grid's row saving manager, allowing to override */
    protected _getRowSavingManager(): TFS_RowSavingManager.RowSavingManager {
        Diag.Debug.assert(!!this._grid, "Grid not initialized");

        return this._grid.getRowSavingManager();
    }

    private _detachRemainingEvents() {
        Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.BACKLOG_BULK_EDIT_EVALUATE_MEMBERSHIP, this._bulkeditEvaluateMembership);
        Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.EVALUATE_MEMBERSHIP, this._evaluateMembershipAction);
        Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.BACKLOG_FILTER_SELECTION, this._filterSelectedAction);
        Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.EVALUATE_MEMBERSHIP, this._verifyWorkItemFilterMembership);
        Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.BACKLOG_MOVE_TO_ITERATION, this._setIterationPath);
        this._eventHelper.detachEvent(TFS_Agile.Notifications.BACKLOG_QUERY_SAVE_COMPLETED, this._querySaveCompleted);
        this._eventHelper.detachEvent(TFS_Agile.Notifications.MEMBERSHIP_EVALUATED, this._processMembershipEvaluation);

        // Unsubscribe all other events
        this._eventHelper.dispose();
        if (this._events) {
            this._events.unsubscribeAll();
            this._events = null;
        }
    }

    public dispose(): void {
        if (!this.isDisposed) {
            this._cleanupFilterBar();
            this._cleanupGrid();
            this._detachBulkEditEvents();

            if (this._messageSuppressor) {
                Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.EVALUATE_MEMBERSHIP, this._messageSuppressorFunction);
                this._messageSuppressorFunction = null;
                this._messageSuppressor = null;
            }

            if (this._messageArea) {
                Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.BACKLOG_ERROR, this._handleBacklogError);
                this._messageArea.dispose();
                this._messageArea = null;
            }

            if (this._sprintView) {
                this._sprintView.dispose();
                this._sprintView = null;
            }

            if (this._toolbar) {
                this._toolbar.dispose();
                this._toolbar = null;
            }

            if (this._backlogsCommonMenubar) {
                this._backlogsCommonMenubar.dispose();
                this._backlogsCommonMenubar = null;
            }

            if (this._reorderManager) {
                this._reorderManager.detachRequestComplete(this._reorderRequestComplete);
                this._reorderManager.dispose();
                this._reorderManager = null;
            }

            if (this._workItemManager) {
                this._detachWorkItemChangeEvent();
                this._workItemManager.dispose();
                this._workItemManager = null;
            }

            if (this._$element) {
                this._$element.empty();
                this._$element = null;
            }

            if (this._membershipTracker) {
                this._membershipTracker.dispose();
                this._membershipTracker = null;
            }

            this._disposeRecycleBin();
            this._detachDeleteEvents();

            this._detachCommonConfigurationRegistration();

            this._detachRemainingEvents();

            QueriesHubContext.dispose();

            this._addChildBehavior = null;
            this._expandCollapseButtonsBehavior = null;
            this._selectionFilter = null;
            this._ownershipEvaluator = null;
            this._gridOptions = null;
            this._backlogContext = null;
            this._backlogContextMenuCreator = null;
            this._backlogLevelHelper = null;
            this._itemHierarchy = null;
            this._disposed = true;
        }
    }

    public get isDisposed(): boolean {
        return this._disposed;
    }
}

VSS.initClassPrototype(Backlog, {
    _$element: null,
    _gridOptions: null,
    _events: null,
    _grid: null,
    _gridDataManager: null,
    _messageArea: null,
    _toolbar: null,
    _sprintView: null,
    _workItemManager: null,
    _messageSuppressor: null,
    _reorderManager: null,
    _teamSettings: null
});

export class BacklogOwnershipEvaluator extends TFS_Agile.BaseBacklogMembershipEvaluator {
    /**
     * OVERRIDE: Check for workItem ownership
     * 
     * @param workItem The work item we are evaluating
     * @return True if the work item is valid, otherwise false
     */
    public _isValid(workItem): boolean {

        let teamFieldName = this._teamSettings.teamFieldName;
        let workItemTeamFieldValue = workItem.getFieldValue(teamFieldName);

        return this._isTeamFieldValid(workItemTeamFieldValue);
    }

    /**
    * Return a value indicating whether the given team field value is owned in the current context
    *
    * @param workItemTeamFieldValue Value of work item's team field
    */
    public checkTeamFieldValue(workItemTeamFieldValue: string, callback: (isOwned: boolean) => void) {
        this._beginGetSettings(() => {
            callback(this._isTeamFieldValid(workItemTeamFieldValue));
        });
    }
}

/**
 * Base NOOP grid behavior that allows subclasses to selectively implement functionality.
 */
export class BaseGridBehavior implements TFS_Agile_ProductBacklog_Grid.IGridBehavior {

    public _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid;

    public setGrid(grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid) {
        // this method exists because we may not have the grid at the time that some of the behaviors are called
        // (e.g. setup of columns)
        this._grid = grid;
    }

    /**
     * Prepares any column changes needed by the extension.
     *
     * @param columns The collection of grid columns.
     * @param options Any options to pass to the behavior extension.
     */
    public onPrepareColumns(columns: Grids.IGridColumn[], options?: any) {
    }

    /**
     * Invoked when a grid-row context menu is opened.
     *
     * @param workItemId The work item id for the row.
     * @param menuOptions The context menu options.
     */
    public onCreateContextMenu(workItemId: number, menuOptions: any) {
    }
}

/**
 * A grid-add-in-behavior that extends the grid with "add work item" options
 */
export class AddChildTaskGridBehavior extends BaseGridBehavior implements TFS_Agile_ProductBacklog_ContextMenu.IBacklogContextMenuContribution {

    public static DIALOG_INITIALIZED = "add-child-grid-behavior-dialog-initialized";
    public static DIALOG_CLOSED = "add-child-grid-behavior-dialog-closed";
    public static MENU_ITEMS_ADD_TASK_ID = "add-task";
    public static CSS_ADD_ITEM_ICON = "backlog-decompose-button";

    protected _workItemIdToChildWorkItemTypes: IDictionaryNumberTo<string[]> = {}
    private _popupMenu: Menus.PopupMenu = null;

    constructor(
        private _supportedBacklogLevel: (workItemType: string) => IBacklogLevelConfiguration,
        private _getTeamId: () => string,
        private _eventHelper: ScopedEventHelper,
        private _parentFields?: any[],
        private _onError?: (error: Error) => any,

        // Checks if the user has advanced backlog features
        private _isBehaviorActive?: () => boolean,
        private _initializeWit?: (workItem: WITOM.WorkItem, parentId: number) => void) {
        super();
    }

    public getItems(teamId: string, workItemIds: number[], gridMenuOptions: TFS_Agile_ProductBacklog_Grid.IProductBacklogGridMenuOptions): Menus.IMenuItemSpec[] {
        if (!TFS_Agile.areAdvancedBacklogFeaturesEnabled(true) || workItemIds.length !== 1) {
            return;
        }
        // add in the extra "add work item" menu option
        let workItemTypes = this._workItemIdToChildWorkItemTypes[workItemIds[0]];
        if (workItemTypes && workItemTypes.length > 0) {
            return [this._createContextMenu(workItemIds[0], workItemTypes)];
        } else {
            return;
        }
    }

    /**
     * OVERRIDE: Prepares any column changes needed by the extension.
     */
    public onPrepareColumns(columns: Grids.IGridColumn[], options?: any) {
        Diag.Debug.assertParamIsArray(columns, "columns");

        if (this._isBehaviorActive && !this._isBehaviorActive()) {
            return;
        }

        // Get index to see if column has already been created
        const columnIndex = Utils_Array.findIndex(columns, (column: Grids.IGridColumn) => {
            return Utils_String.ignoreCaseComparer(column.name, BacklogBehaviorConstants.BACKLOG_BUTTONS_COLUMN_NAME) === 0;
        });

        const backlogButtonColumn = (columnIndex < 0) ? { ...BacklogBehaviorConstants.BACKLOG_BUTTONS_COLUMN_DEFAULTS } : columns[columnIndex];

        backlogButtonColumn.rowCss = "add-icon-cell";
        backlogButtonColumn.getCellContents = this._createAddItemCell;

        if (columnIndex < 0) {
            columns.splice(0, 0, backlogButtonColumn);
        }
    }

    private _beginCacheChildWorkItemTypes(workItemId: number): IPromise<void> {
        let workItemType = this._grid.getWorkItemTypeNameById(workItemId);

        if (this._workItemIdToChildWorkItemTypes[workItemId]) {
            this._workItemIdToChildWorkItemTypes[workItemId] = null;
        }

        let backlogLevelConfiguration = this._supportedBacklogLevel(workItemType);
        if (!backlogLevelConfiguration) {
            return Q<void>(null);
        }

        return TFS_Agile_Utils.WorkItemCategoriesUtils.removeHiddenWorkItemTypeNames(backlogLevelConfiguration.workItemTypes)
            .then((visibleWorkItemTypes: string[]) => {
                this._workItemIdToChildWorkItemTypes[workItemId] = visibleWorkItemTypes;
            }, (error) => {
                VSSError.publishErrorToTelemetry({
                    name: "beginCacheChildWorkItemTypes",
                    message: VSS.getErrorMessage(error)
                });
            });
    }

    /**
     * Creates and returns a context menu item for adding child work items
     * 
     * @return The context menu item options
     */
    private _createContextMenu(workItemId: number, workItemTypes: string[]): Menus.IMenuItemSpec {

        let onClick = (commandArgs: any) => {
            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.SINGLESELECT_CONTEXTMENU,
                { "Action": "add-child-item", "WorkItemType": commandArgs.workItemType }));

            this._addWorkItem(commandArgs.id, commandArgs.workItemType);
        },
            menuItem: Menus.IMenuItemSpec;

        // Set display text for context menu item
        let addChildItemText = workItemTypes.length > 1
            ? AgileProductBacklogResources.ContextMenu_AddChildItems
            : Utils_String.format(AgileProductBacklogResources.Add_WorkItems, workItemTypes[0]);

        menuItem = {
            rank: 4,
            text: addChildItemText,
            title: addChildItemText,
            setTitleOnlyOnOverflow: true,
            disabled: this._grid.getRowSavingManager().isRowSaving(workItemId),
            groupId: "modify"
        };

        // If there are multiple child work item types for this team then setup the flyout. Otherwise just add the handler for
        // clicking on the 1st tier menu item.
        if (workItemTypes.length > 1) {
            menuItem.childItems = (contextInfo: any, callback: IResultCallback, errorCallback?: IErrorCallback) => {
                let menuItems = this._createMenuItems(workItemTypes, onClick);
                callback(menuItems);
            };
        }
        else {
            menuItem["arguments"] = { workItemType: workItemTypes[0] };
            menuItem.action = onClick;
        }

        return menuItem;
    }

    private _createMenuItems(workItemTypes: string[], onClick: (commandArgs: any) => void): any[] {
        return $.map(workItemTypes, function (workItemType) {
            const id = new Date().getTime().toString();
            return {
                id: id,
                text: workItemType,
                "arguments": { workItemType: workItemType },
                action: onClick,
                icon: ($iconElement: JQuery) => {
                    let $icon = TFS_Agile_Utils.ControlUtils.buildColorElement(workItemType, {
                        labelledby: id
                    });

                    // To position the icon in 16px x 16px space(reserved by MenuItem)
                    if ($icon) {
                        $icon.addClass(TFS_Agile_Controls.AddNewItemControl.iconCssClass);
                    }
                    // To customize margin between icon and text
                    if ($iconElement) {
                        $iconElement.addClass(TFS_Agile_Controls.AddNewItemControl.iconElementCssClass);
                    }

                    return $icon;
                }
            };
        });
    }

    /**
     *     Create a new work item of type commandArgs.workItemType and open it in the
     *     work item form. Subsequently saving this work item will add it to the grid.
     */
    private _addWorkItem(parentId: number, workItemType: string) {
        let parentOptions = { id: parentId, fields: this._parentFields },
            createOptions: TFS_Agile_Utils.IWorkItemCreateOptions = { parenting: parentOptions, useDefaultIteration: false },
            rowSavingManager = this._grid.getRowSavingManager(),
            dataManager = this._grid.getDataManager(),
            itemSaved = false,
            onSave = (workItem: WITOM.WorkItem) => {
                if (itemSaved) {
                    return;
                }
                itemSaved = true;

                let startTime = Date.now();

                // Ensure the parent is expanded, this is done now, so when the item is added
                // and the refresh is raised, the grid layout will render the parent's children.
                let parentIndex = dataManager.getWorkItemTreeIndex(parentId);
                if (!this._grid._isExpanded(parentIndex)) {
                    this._grid.expandNode(parentIndex);
                }

                // Get the order value
                let fieldType = BacklogConfigurationService.getBacklogFieldName(BacklogFieldTypes.Order);
                let order = workItem.getFieldValue(fieldType);
                let orderValue = (order !== null && order !== undefined) ? order : -1;

                // Add the item & ensure it is selected and scrolled it into view
                dataManager.addWorkItem(workItem.id, orderValue, workItem, parentId);
                this._grid.setSelectedWorkItemId(workItem.id, true, true);

                Diag.logTracePoint('AddChildTaskGridBehavior._addWorkItem.complete');
                Backlog._recordAddBacklogItemTelemetry(startTime, CustomerIntelligenceConstants.CustomerIntelligencePropertyValue.ADDBACKLOGITEM_ADDEDFROM_GRID);
            };

        // If this is a group row, translate the  -ve ID to 0 == Unparented item. 
        if (parentOptions.id < 0) {
            parentOptions.id = 0;
        }

        Dialogs.Dialog.beginExecuteDialogAction((cancelDelegate) => {
            let rowsToBeDisabled = dataManager.getDescendantWorkItemIds(parentId);
            rowSavingManager.markRowAsProcessing(parentId, rowsToBeDisabled);

            // Create the work item & show the work item in the work item form
            WorkItemUtils.beginCreateWorkItemWithForm(
                this._getTeamId(),
                workItemType,
                createOptions,
                onSave,
                error => {
                    rowSavingManager.clearRowProcessing(parentId);
                    cancelDelegate();

                    if ($.isFunction(this._onError)) {
                        this._onError(error);
                    }
                },
                (workItem: WITOM.WorkItem) => {
                    if ($.isFunction(this._initializeWit)) {
                        this._initializeWit(workItem, parentId);
                        this._eventHelper.fire(AddChildTaskGridBehavior.DIALOG_INITIALIZED, this, workItem);
                    }
                    rowSavingManager.clearRowProcessing(parentId);
                },
                (workItem: WITOM.WorkItem) => {
                    this._grid.focus();
                    this._eventHelper.fire(AddChildTaskGridBehavior.DIALOG_CLOSED, this, workItem);
                }
            );
        });
    }

    /**
        @param rowInfo The information about the grid row that corresponds to the new task being added
    */
    public openAddChild(rowInfo: Grids.IGridRowInfo) {
        if (rowInfo) {
            let workItemId = this._grid.getWorkItemIdAtDataIndex(rowInfo.dataIndex);
            let workItemTypes = this._workItemIdToChildWorkItemTypes[workItemId];
            let $addIcon = $(rowInfo.row).find("." + AddChildTaskGridBehavior.CSS_ADD_ITEM_ICON);

            if ($addIcon && $addIcon.is(":visible")) {
                this._openChildTypeMenu($addIcon, workItemId, workItemTypes, true);
            }
        }
    }

    /**
        Add a child task to a work item given by the workItemId

        @param element: The jquery element belonging to the work item with the given workItemId
        @param workItemId: The Id of the work item
        @param workItemTypes: A list of types of work items that can be created.
        @param highlightFirstItem: True if the first work item type is to be selected when the menu pops up.  
    */
    private _openChildTypeMenu(element: JQuery, workItemId: number, workItemTypes: string[], highlightFirstItem: boolean) {

        if (this._grid.getRowSavingManager().isRowSaving(workItemId)) {
            return;
        }
        if (workItemTypes.length > 1) {
            let menu = this._createPopupMenu(workItemId, workItemTypes);
            menu.popup(element, element);
            // Make sure our popup has an aria-label
            menu.getElement().find(".sub-menu").attr("aria-label", AgileProductBacklogResources.KeyboardShortcutDescription_Add_Child);
            if (highlightFirstItem) {
                let firstMenuItem = menu._getFirstMenuItem();
                let subMenu: Menus.Menu<Menus.MenuOptions> = firstMenuItem.getSubMenu();
                let item = subMenu.getItem(AddChildTaskGridBehavior.MENU_ITEMS_ADD_TASK_ID);
                subMenu._selectItem(item);
            }
        }
        else {
            this._addWorkItem(workItemId, workItemTypes[0]);
        }
    }
    /**
     * Generate the add icon cell.
     * 
     * @param rowInfo The information about grid row that is being rendered.
     * @param dataIndex The index of the row.
     * @param expandedState Number of children in the tree under this row recursively.
     * @param level The hierarchy level of the row.
     * @param column Information about the column that is being rendered.
     * @param indentIndex Index of the column that is used for the indentation.
     * @param columnOrder The display order of the column.
     * @return Returns jQuery element representing the requested grid cell. The first returned element will be appended
     * to the row (unless the function returns null or undefined).
     */
    private _createAddItemCell = (rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) => {

        let workItemId = this._grid.getWorkItemIdAtDataIndex(dataIndex);

        // Have the grid generate the cell as normal.
        let $gridCell = this._grid._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);

        this._beginCacheChildWorkItemTypes(workItemId).then(() => {
            let workItemTypes = this._workItemIdToChildWorkItemTypes[workItemId];
            if (workItemTypes && workItemTypes.length) {
                let toolTip = Utils_String.format(AgileProductBacklogResources.Add_WorkItems, workItemTypes.join(AgileProductBacklogResources.Add_WorkItems_Seperator));

                let $addIcon = $("<i />")
                    .attr({ tabindex: "-1", role: "button" })
                    .attr("aria-label", AgileProductBacklogResources.KeyboardShortcutDescription_Add_Child)
                    .addClass("clickable bowtie-icon bowtie-math-plus-light " + AddChildTaskGridBehavior.CSS_ADD_ITEM_ICON)
                    .bind("click.VSS.Agile", (event) => {
                        this._openChildTypeMenu($addIcon, workItemId, workItemTypes, false);
                    })
                    .bind("keydown.VSS.Agile", (event) => {
                        if (event.keyCode === Utils_UI.KeyCode.ENTER || event.keyCode === Utils_UI.KeyCode.SPACE) {
                            $addIcon.click();
                            return false; // Block event propagation
                        }
                    })
                    .bind("mousedown.VSS.Agile", (event: any) => {
                        // The grid control sets the focus to a row on mouse down, but it does this on a 10 ms delay.
                        // This delay can cause the popup for the work items to disappear.  To prevent this from happening
                        // we stop propagation of this event and perform the selection our selves.

                        // Set the row as selected.
                        this._grid.setSelectedDataIndex(dataIndex);

                        // Stop propagation of the event so the grid does not try and focus the row on the delay.
                        event.stopPropagation();
                    });

                RichContentTooltip.add(toolTip, $addIcon, { setAriaDescribedBy: true });

                // Clear the default text of the cell and append the image to the cell.
                // NOTE: This is a temporary workaround until support for "getColumnValue()" column option allowing
                //       contents to be returned directly is finished.  When this work is done this method can be changed
                //       over to be the getColumnValue for the column and updated to just return the image.
                $gridCell.text("");
                $gridCell.append($addIcon);
            }
        });

        return $gridCell;
    }

    private _createPopupMenu(workItemId: number, workItemTypes: string[]) {
        let onClick = (commandArgs: any) => this._addWorkItem(workItemId, commandArgs.workItemType);
        let items = this._createMenuItems(workItemTypes, onClick);
        let menuOptions = {
            align: "right",
            items: [{ childItems: items }]
        };

        if (this._popupMenu) {
            $("." + TFS_Agile_Controls.AddNewItemControl.iconElementCssClass).each((i, element) =>
                TFS_Agile_Utils.ControlUtils.disposeColorElement(element.firstElementChild));
            this._popupMenu.dispose();
        }
        this._popupMenu = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, $(document.body), menuOptions);
        this._popupMenu.getElement().addClass('menu-add-child-task');
        return this._popupMenu;
    }
}

/**
 * A OrphanGroup class that extends GridGroupRowBase. Use it to support custom rows (Unparented) on the product/portfolio backlogs.
 */
export class OrphanGroup extends TFS_Agile_ProductBacklog_Grid.GridGroupRowBase {

    public static findOrphanedRowForLevel(backlogLevel: number) {
        let orphanGroup: OrphanGroup;

        $.each(TFS_Agile_ProductBacklog_Grid.GridGroupRowBase.workitemIDMap, (id: number, groupRow: TFS_Agile_ProductBacklog_Grid.IGridGroupRow) => {
            if (groupRow instanceof OrphanGroup) {
                let orphanGroupRow = <OrphanGroup>groupRow;

                if (orphanGroupRow.getBacklogLevel() === backlogLevel) {
                    orphanGroup = orphanGroupRow;

                    // Abort $.each
                    return false;
                }
            }
        });

        return orphanGroup;
    }

    private _backlogLevel: number;

    constructor(backlogLevel: number, id?: number, options?: any, preprocessor?: any) {
        super(id, options, preprocessor);

        this._backlogLevel = backlogLevel;
    }

    /**
     * Builds hierarchy of a custom row and child rows under it .
     * 
     * @param childRows An array of indices of child rows
     * @param rowInfo An optional rowInfo object that may contain any additional fields for the default row
     * @return The updated options object.
     */
    public buildHierarchy(childRows: number[], rowInfo?: { [id: string]: string }): any {

        let options = this.getGridOptions();

        // Build the custom row by setting the specified fields. 
        let customRow = this.extendPageData(options.payload.columns, rowInfo);

        // Insert the custom row at the beginning of the grid's rows. 
        options.payload.rows.splice(0, 0, customRow);

        return options;
    }

    public extendPageData(columns: string[], rowInfo?: { [id: string]: string }): any[] {
        let customRow: any[] = [];

        let id: number = rowInfo && +rowInfo[WITConstants.CoreFieldRefNames.Id];
        let defaultRowFields = this.getDefaultRow(id);
        $.extend(defaultRowFields, rowInfo);

        $.each(columns, (i, columnName) => {
            if (columnName in defaultRowFields) {
                customRow[i] = defaultRowFields[columnName];
            }
            else {
                customRow[i] = null;
            }
        });

        return customRow;
    }

    public getDefaultRow(id?: number): { [id: string]: string } {
        /// <summary>Gets the fields corresponding to the default row.</summary>
        /// <returns>A dictionary with field names & values.</returns>

        let customRow: { [id: string]: string } = {};

        id = id || this.getRowId();
        customRow[WITConstants.CoreFieldRefNames.Id] = "" + id;

        let customRowAboveBacklogLevels = BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels()[this._backlogLevel - 1];
        customRow[WITConstants.CoreFieldRefNames.WorkItemType] = customRowAboveBacklogLevels.defaultWorkItemType;

        let customRowInBacklogLevels = BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels()[this._backlogLevel];
        customRow[WITConstants.CoreFieldRefNames.Title] = Utils_String.format(AgileProductBacklogResources.GroupRow_OrphanProductBacklogItem, customRowInBacklogLevels.name);

        return customRow;
    }

    /** Get the backlog level this orphan group row represents */
    public getBacklogLevel(): number {
        return this._backlogLevel;
    }

    /**
     * Get the renderer object used for drawing the row.
     * 
     * @param rowInfo The rowInfo object that contains the jQuery data for the row
     * @param rowIndex The index into the _rows object.
     * @param dataIndex The index into the _workItems array.
     * @return A ICustomRowRenderer object specific to this group ; since this is a base class, return null.
     */
    public getRowRenderer(rowInfo: any, rowIndex: number, dataIndex: number): TFS_Agile_ProductBacklog_Grid.ICustomRowRenderer {

        return new OrphanGroupRenderer(rowInfo, rowIndex, dataIndex);
    }
}

/**
 * A OrphanGroupRenderer class that extends ICustomRowRenderer is used for rendering custom rows (Unparented) on the product/portfolio backlogs.
 */
export class OrphanGroupRenderer implements TFS_Agile_ProductBacklog_Grid.ICustomRowRenderer {

    /**
     * Get the renderer object used for drawing the row.
     *
     * @param rowInfo The rowInfo object that contains the jQuery data for the row
     * @param rowIndex The index into the _rows object.
     * @param dataIndex The index into the _workItems array.
     * @return A ICustomRowRenderer object specific to this group.
     */
    constructor(rowInfo, rowIndex, dataIndex) {

        this.attachEvents(rowInfo);
    }

    /**
     * Attach mouse/keyboard handlers for special behavior on the custom row.
     *
     * @param rowInfo The rowInfo object that contains the jQuery data for the row
     */
    public attachEvents(rowInfo: any) {

        rowInfo.row.on("dblclick", this.handleEvent);
    }

    /**
     * Handle a specific event, such as click/double-click etc.
     *
     * @param event The event object for the raised event
     */
    public handleEvent(event: any) {

        // If the user hasn't clicked on the expand icon, don't propagate this event. 
        if (!($(event.target).hasClass("grid-tree-icon"))) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /**
     * Get the CSS class corresponding to this custom row.
     *
     * @return A string with the CSS class name.
     */
    public getCssClass(): string {

        return "orphan-tasks-grid-row";
    }

    /**
     * Get the color for the workItem type corresponding to this custom row.
     *
     * @return A string with actual color used.
     */
    public getTypeColor(): string {

        return TFS_Agile_Utils.ControlUtils.getCSSPropertyValue("dummyParent", "border-left-color");
    }

    /**
     * Get the list of all fields that should be displayed ; RemainingWork is handled separately by the Grid
     *
     * @return A array of strings with the field names
     */
    public getDisplayFields() {

        let fields: string[] = [
            WITConstants.CoreFieldRefNames.Title,
            BacklogBehaviorConstants.BACKLOG_BUTTONS_COLUMN_NAME
        ];

        return fields;
    }
}

export interface IAddPanelEffect {
    /** Indicates the row to be highlighted */
    highlightedWorkItemId?: number;

    /** True if the highlighted workitem will be the parent of the newly added item */
    isParent: boolean;

    /** Parent id of added item */
    parentId: number;

    /** Reference element to place new item next to */
    nextId: number;

    /** True if a new item would be added to an unparented section */
    addUnparentedRow?: boolean;
}

export class AddPanelBehavior {
    private _currentLevel: number;
    private _itemHierarchy: TFS_Agile_WorkItemChanges.IItemDataHierarchy<TFS_Agile_WorkItemChanges.IWorkItemHierarchyData>;
    private _levelHelper: TFS_Agile_WorkItemChanges.BacklogLevelHelper;

    private _isLimitedExperience: () => boolean;
    private _getRootBacklogLevel: () => number;

    constructor(
        currentLevel: number,
        itemHierarchy: TFS_Agile_WorkItemChanges.IItemDataHierarchy<TFS_Agile_WorkItemChanges.IWorkItemHierarchyData>,
        levelHelper: TFS_Agile_WorkItemChanges.BacklogLevelHelper,
        isLimitedExperience: () => boolean,
        getRootBacklogLevel: () => number) {
        this._currentLevel = currentLevel;
        this._itemHierarchy = itemHierarchy;
        this._levelHelper = levelHelper;

        this._isLimitedExperience = isLimitedExperience;
        this._getRootBacklogLevel = getRootBacklogLevel;
    }

    /**
     * Returns the add effect
     * @param selectedWorkItemId Id of currently selected work item, add effect will be calculated in relation to this selection
     * @return Effect of adding a new item
     */
    public getEffect(selectedWorkItemId: number): IAddPanelEffect {
        if (this._isLimitedExperience() || !selectedWorkItemId) {
            return this._getEffectAtUnparented();
        }

        const workItemData = this._itemHierarchy.getData(selectedWorkItemId);
        if (!workItemData) {
            // Fallback in case data is not paged
            return this._getEffectAtUnparented();
        }

        const level = this._levelHelper.getLevel(workItemData.type);
        if (level === this._currentLevel) {
            return this._getEffectWhenSiblingFocused(selectedWorkItemId);
        } else if (level > this._currentLevel) {
            return this._getEffectWhenChildFocused(selectedWorkItemId, level);
        } else {
            return this._getEffectWhenParentFocused(selectedWorkItemId);
        }
    }

    public getEffectAddToTop(): IAddPanelEffect {
        let firstItemId = 0;
        let rootLevelItems = this._itemHierarchy.children(0);
        if (rootLevelItems && rootLevelItems.length > 0) {
            firstItemId = rootLevelItems[0];
        }

        const workItemData = this._itemHierarchy.getData(firstItemId);
        if (!workItemData) {
            // Fallback in case data is not paged
            return this._getEffectAtUnparented();
        }
        const level = this._levelHelper.getLevel(workItemData.type);
        if (level == this._currentLevel) {
            return {
                highlightedWorkItemId: firstItemId,
                isParent: false,
                parentId: 0,
                nextId: firstItemId
            };
        }

        return this._getEffectAtUnparented();
    }

    public getEffectAddToBottom(): IAddPanelEffect {
        return this._getEffectAtEnd();
    }

    private _getEffectWhenSiblingFocused(selectedWorkItemId: number): IAddPanelEffect {
        // Selected item is a valid sibling
        const effect = {
            highlightedWorkItemId: selectedWorkItemId,
            isParent: false,
            parentId: this._itemHierarchy.parent(selectedWorkItemId),
            nextId: selectedWorkItemId
        };

        if (this._isEffectAtLastSibling(selectedWorkItemId)) {
            // Selected work item is the last child of its parent, add new item at the bottom
            effect.highlightedWorkItemId = this._lastVisibleLeaf(selectedWorkItemId);
            effect.nextId = null;
        }

        return effect;
    }

    private _getEffectWhenChildFocused(selectedWorkItemId: number, level: number): IAddPanelEffect {
        // Walk up hierarchy to find valid item among parents
        let currentId = selectedWorkItemId;
        while (level > this._currentLevel) {
            currentId = this._itemHierarchy.parent(currentId);
            let currentData = this._itemHierarchy.getData(currentId);
            if (!currentData) {
                // Fallback for unpaged data
                return this._getEffectAtUnparented();
            }
            level = this._levelHelper.getLevel(currentData.type);
        }

        const effect = {
            highlightedWorkItemId: currentId,
            isParent: false,
            parentId: this._itemHierarchy.parent(currentId),
            nextId: currentId
        }

        // If the id is the last at the current level, adjust the selection to below
        if (this._isEffectAtLastSibling(currentId)) {
            effect.highlightedWorkItemId = this._lastVisibleLeaf(currentId);
            effect.nextId = null;
        }

        return effect;
    }

    private _getEffectWhenParentFocused(selectedWorkItemId: number) {
        // Try to find valid element in subtree of current element
        let validDescendantInfo = this._findValidElementInSubtree(selectedWorkItemId);
        if (validDescendantInfo !== null) {
            let parentId = validDescendantInfo.isParent ? validDescendantInfo.workItemId : this._itemHierarchy.parent(validDescendantInfo.workItemId);
            let siblings = this._itemHierarchy.children(parentId);

            return {
                highlightedWorkItemId: validDescendantInfo.workItemId,
                isParent: validDescendantInfo.isParent,
                parentId: parentId,
                nextId: siblings && siblings.length > 0 && siblings[0] || null
            };
        }

        // Try to find valid element under other root level items
        let rootLevelItems = this._itemHierarchy.children(0);
        for (let i = 0; i < rootLevelItems.length; ++i) {
            let rootLevelItemId = rootLevelItems[i];
            if (rootLevelItemId === selectedWorkItemId) {
                // Skip current item
                continue;
            }

            let validDescendantInfo = this._findValidElementInSubtree(rootLevelItemId);
            if (validDescendantInfo !== null) {
                let parentId = validDescendantInfo.isParent ? validDescendantInfo.workItemId : this._itemHierarchy.parent(validDescendantInfo.workItemId);
                let siblings = this._itemHierarchy.children(parentId);

                return {
                    highlightedWorkItemId: validDescendantInfo.workItemId,
                    isParent: validDescendantInfo.isParent,
                    parentId: parentId,
                    nextId: siblings && siblings.length > 0 && siblings[0] || null
                };
            }
        }

        return this._getEffectAtUnparented();
    }

    protected _getEffectAtUnparented(): IAddPanelEffect {
        // Try to find existing unparented row
        let unparentedId = this._findUnparentedRowIdForCurrentLevel();
        if (unparentedId) {
            let siblings = this._itemHierarchy.children(unparentedId);

            return {
                highlightedWorkItemId: unparentedId,
                isParent: true,
                parentId: unparentedId,
                nextId: siblings && siblings.length > 0 && siblings[0] || null
            };
        }
        return this._getEffectAtEnd();
    }

    private _getEffectAtEnd(): IAddPanelEffect {
        // Find last element as reference, new unparented row will need to be added
        let lastItemId = 0;

        let rootLevelItems = this._itemHierarchy.children(0);
        if (rootLevelItems && rootLevelItems.length > 0) {
            lastItemId = rootLevelItems[rootLevelItems.length - 1];
            let children = this._itemHierarchy.children(lastItemId);
            while (children && children.length > 0) {
                lastItemId = children[children.length - 1];
                children = this._itemHierarchy.children(lastItemId);
            }
        }

        // Current level might be the currently visible root level, if that's true, then don't add a new unparented row
        let addUnparentedRow = this._currentLevel !== this._getRootBacklogLevel();
        if (addUnparentedRow) {
            return {
                highlightedWorkItemId: lastItemId,
                isParent: true,
                parentId: null,
                nextId: null,
                addUnparentedRow: true
            };
        } else {
            // New root level item
            return {
                highlightedWorkItemId: lastItemId,
                isParent: false,
                parentId: 0,
                nextId: null
            };
        }
    }

    private _isEffectAtLastSibling(workItemId: number): boolean {
        const parentId = this._itemHierarchy.parent(workItemId);
        const children = this._itemHierarchy.children(parentId);
        return children && children.length > 0 && children[children.length - 1] === workItemId;
    }

    private _lastVisibleLeaf(workItemId: number): number {
        // Try to find the last visible leaf item under selectedWorkItemId
        let leafId = workItemId;
        let leafChildren = this._itemHierarchy.children(leafId);
        while (leafChildren && leafChildren.length > 0) {
            leafId = leafChildren[leafChildren.length - 1];
            leafChildren = this._itemHierarchy.children(leafId);
        }
        return leafId;
    }

    protected _findUnparentedRowIdForCurrentLevel(): number {
        let orphanGroup = OrphanGroup.findOrphanedRowForLevel(this._currentLevel - 1);

        return orphanGroup && orphanGroup.getRowId() || null;
    }

    protected _findValidElementInSubtree(parentId: number): { workItemId: number; isParent: boolean } {
        let stack = [parentId];
        while (stack.length > 0) {
            let id = stack.pop();
            let data = this._itemHierarchy.getData(id);
            let level = this._levelHelper.getLevel(data.type);

            if (level === this._currentLevel) {
                return {
                    workItemId: id,
                    isParent: false
                };
            } else if (level === this._currentLevel - 1) {
                return {
                    workItemId: id,
                    isParent: true
                }
            }

            let children = this._itemHierarchy.children(id);
            if (children && children.length > 0) {
                for (let i = children.length - 1; i >= 0; --i) {
                    stack.push(children[i]);
                }
            }
        }

        return null;
    }
}
