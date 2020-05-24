import {
    AddBacklogItemStatus,
    AddChildTaskGridBehavior,
    Backlog,
    BacklogOptions,
    IBacklogWorkItemChangeIterationResult
} from "Agile/Scripts/Backlog/Backlog";
import { BacklogBehaviorConstants } from "Agile/Scripts/Backlog/Constants";
import { MoveToPositionHelper } from "Agile/Scripts/Backlog/ProductBacklogContextMenu";
import TFS_Agile_ProductBacklog_ContextMenu = require("Agile/Scripts/Backlog/ProductBacklogContextMenu");
import { ProductBacklogDataManager } from "Agile/Scripts/Backlog/ProductBacklogDataManager";
import TFS_Agile_ProductBacklog_Grid = require("Agile/Scripts/Backlog/ProductBacklogGrid");
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_Agile_Controls = require("Agile/Scripts/Common/Controls");
import { SprintsHubTelemetryHelper } from "Agile/Scripts/Common/HubTelemetryHelper";
import { WorkItemUtils } from "Agile/Scripts/Common/Utils";
import TFS_Agile_WorkItemChanges = require("Agile/Scripts/Common/WorkItemChanges");
import { AgileHubServerConstants } from "Agile/Scripts/Generated/HubConstants";
import { IterationBacklogGridReorderBehavior } from "Agile/Scripts/IterationBacklog/IterationBacklogGridReorderBehavior";
import { IterationBacklogMembershipEvaluator } from "Agile/Scripts/IterationBacklog/IterationBacklogMembershipEvaluator";
import { OrphanTasksGroup } from "Agile/Scripts/IterationBacklog/OrphanTasksGroup";
import ProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import SprintPlanningResources = require("Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning");
import Agile_Utils_CSC_NO_REQUIRE = require("Agile/Scripts/Settings/CommonSettingsConfiguration");
import { SprintViewUsageTelemetryConstants } from "Agile/Scripts/SprintsHub/SprintView/SprintContentViewTelemetryConstants";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { FormatUtils } from "Presentation/Scripts/TFS/FeatureRef/FormatUtils";
import Configurations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Configurations");
import ConfigurationsConstants = require("Presentation/Scripts/TFS/TFS.Configurations.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TeamServices = require("TfsCommon/Scripts/Team/Services");
import { GridO, IGridColumn } from "VSS/Controls/Grids";
import Menus = require("VSS/Controls/Menus");
import Notifications = require("VSS/Controls/Notifications");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import { IDisplayColumnResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import * as ColumnOptionsPanel_Async from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnOptionsPanel";
import { RecycleBinTelemetryConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IRecycleBinOptions } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin";
import { haveBacklogManagementPermission } from "WorkItemTracking/Scripts/Utils/PermissionHandler";

/*tslint:disable:member-ordering*/

;
let delegate = Utils_Core.delegate;
let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
let ContextUtils = TFS_OM.ContextUtils;

export interface IIterationBacklogOptions extends BacklogOptions {
    /** Field aggregator for use with the capacity pane */
    fieldAggregator: FieldAggregator;

    /** Max number of work items on an iteration backlog  */
    maxItemsCount: number;

    /** a const value that means no checking for maximum is needed */
    unlimitedItemsCount: number;

    /** Optional. The activity field reference name used for checking if a work item is a valid drop target. */
    activityFieldRefName?: string;
}

export class IterationBacklog extends Backlog {

    public static CSSClass_NO_CONTENT_GUTTER_CONTAINER: string = ".hub-no-content-gutter";
    public static HELPLINK_DISABLED_REQUIREMENTS_REORDERING: string = "https://go.microsoft.com/fwlink/?linkid=2007013";
    private static DATASOURCE_NAME = "SprintBacklogGrid";

    protected _options: IIterationBacklogOptions;
    private _fieldAggregator: FieldAggregator;
    private _activityFieldRefName?: string;
    private _iterationBacklogGridReorderBehavior: IterationBacklogGridReorderBehavior;
    private _orphanedRow: TFS_Agile_ProductBacklog_Grid.IGridGroupRow;
    private _permissions: TeamServices.ITeamPermissions;

    /**
     * IterationBaklog constructor
     * 
     * @param $backlogElement actual grid element
     * @param fieldAggregator The field aggregator instance
     * @param eventHelper Scoped event helper to aid with create and dispose
     * @param options The iteration backlog options
     */
    constructor(options: IIterationBacklogOptions) {
        super(options);
        Diag.Debug.assertParamIsObject(options.$backlogElement, "$backlogElement");
        Diag.Debug.assertParamIsObject(options.fieldAggregator, "FieldAggregator");

        this._fieldAggregator = options.fieldAggregator;
        this._activityFieldRefName = options.activityFieldRefName;

        this.createMessageArea();
        this._isIterationBacklog = true;

        // NOTE: This is done before the grid is created to ensure we receive row updated events while the grid is
        //       being initially rendered.
        const $gridElement = this.getGridElement();
        $gridElement.bind(GridO.EVENT_ROW_UPDATED + ".VSS.Agile", delegate(this, this._rowUpdatedHandler));

        // Setup the options for the grid and create it.
        const gridOptions = this._createGridOptions();

        gridOptions.iterationBacklog = true;
        TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.updatePayloadColumns(true, gridOptions.columns);
        this.createGrid(gridOptions);

        // enable or disable drag drop UI.
        var enableDragDrop = haveBacklogManagementPermission();

        if (enableDragDrop) {
            this._grid.enableDragDrop();
        } else {
            this._grid.disableDragDrop();
        }

        // Attach a handler so we are notified when dropping of a parent work item is completed.
        this.attachDropWorkItemCompleted(this._dropWorkItemCompleted);

        // Setup limit checking
        this._checkLimit(this._fieldAggregator);

        // Attach to data manager events
        let dataManager = this.getGridDataManager();
        dataManager.attachNewItem((sender, args) => this._checkLimit(this._fieldAggregator));

        dataManager.attachMoveItems((source, args) => {
            this._handleMoveWorkItems(args.workItemIds, args.workItemIdsToReparent, args.targetLocation, args.performReorder).then(() => {
                if (args.perfScenario) {
                    args.perfScenario.end();
                }
            });
        });

        // Iniitialize extra UI elements for the existing backlog page
        if (!this._options.isNewHub) {
            // Add Panel initialization uses 'TFS_Agile.IsWebAccessAsyncEnabled()', which reports true even for the iteration backlog (which is actually sync.)
            // It therefore expects the add panel settings to be available in 'Backlog.addPanelSettings' (which would be set during the async payload response
            // callback, before the subsequent re- initialization). Fixing the behavior of 'IsWebAccessAsyncEnabled()' may have broad consequences, so for now
            // we simply read the add panel settings prior to core backlog initialization.
            this._initializeAddPanelSettings();
            this.initializeAddPanel();

            this._refreshToolbarCommandStates();
        }

        // Initialize the filter bar
        this._initializeFilter();

        // Hide the "it's lonely in here" empty-backlog watermark (if there) when an item is successfully added.
        this._eventHelper.attachEvent(TFS_Agile.Notifications.BACKLOG_ITEM_ADDED, this._hideZeroData);

        this._attachReorderRequestComplete();

        this._setupMembershipEvaluation();

        this._focusBacklogGrid();
    }

    public getMoveToPositionHelper(): MoveToPositionHelper {
        const grid = this.getGrid();
        const itemHierarchy = this.getItemHierarchy();
        return new TFS_Agile_ProductBacklog_ContextMenu.IterationMoveToPositionHelper(
            grid,
            itemHierarchy,
            TFS_Agile_ProductBacklog_ContextMenu.ContextMenuContributionUtils.createSelectionFilter(grid, itemHierarchy));
    }

    private _hideZeroData = (sender, eventArgs): void => {
        let $watermarkContainer = $(IterationBacklog.CSSClass_NO_CONTENT_GUTTER_CONTAINER, this.getElement());
        if ($watermarkContainer) {
            $watermarkContainer.hide();
        }
    }

    protected _attachWorkItemChangeEvent() {
        this._workItemChangeEventHandler = (sender: WorkItemManager, args: WITOM.IWorkItemChangedArgs) => {
            Diag.Debug.assertParamIsObject(args, "args");
            Diag.Debug.assertParamIsObject(args.workItem, "args.workItem");

            if (args.workItem && args.workItem.id) {
                let workItemId = args.workItem.id;
                switch (args.change) {
                    case WorkItemChangeType.Saved:
                        if (this._workItemIdsToRemove[workItemId]) {
                            delete this._workItemIdsToRemove[workItemId];
                            this._removeWorkItemFromGrid(workItemId);
                        }
                        break;
                    case WorkItemChangeType.ProjectChanged:
                        this._workItemIdsToRemove[workItemId] = workItemId;
                        break;
                    case WorkItemChangeType.Discarded:
                    case WorkItemChangeType.Reset:
                    case WorkItemChangeType.Refresh:
                        delete this._workItemIdsToRemove[workItemId];
                        break;
                    default:
                        break;
                }
            }
        };
        this.getWorkItemManager().attachWorkItemChanged(this._workItemChangeEventHandler);
    }

    protected _handleMoveWorkItems(workItemIds: number[], workItemIdsToReparent: number[], targetLocation: TFS_Agile_WorkItemChanges.ILocation, performReorder: boolean): IPromise<void> {
        this._fieldAggregator.reparentWorkItems(workItemIds, targetLocation.parentId || 0);
        return super._handleMoveWorkItems(workItemIds, workItemIdsToReparent, targetLocation, performReorder);
    }

    public _setupMembershipEvaluation() {
        super._setupMembershipEvaluation();
        // Register handler for explicit membership verification requests
        Events_Action.getService().registerActionWorker(TFS_Agile.Actions.VERIFY_MEMBERSHIP_EXPLICIT, this._verifiyExplicitMembership);
    }

    protected _createMembershipEvaluator(dataManager: ProductBacklogDataManager) {
        return new IterationBacklogMembershipEvaluator(dataManager);
    }

    protected _getRecycleBinOptions(): IRecycleBinOptions {
        return {
            sourceAreaName: RecycleBinTelemetryConstants.ITERATION_BACKLOG_SOURCE,
            dragDropScope: TFS_Agile.DragDropScopes.WorkItem,
            dataKey: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.DATA_WORK_ITEM_IDS,
            readWorkItemsBeforeDeletion: true /* Need to read workitems for updating UI of capacity pane */
        };
    }

    private _verifiyExplicitMembership = (actionArgs: { workItems: WITOM.WorkItem[] }, next: Function): void => {
        for (let workItem of actionArgs.workItems) {
            this._verifyMembership(workItem.id);
        }
    }

    private _initializeAddPanelSettings() {
        let $addPanelSettings = $(".add-panel-settings:first", this.getElement());
        this.addPanelSettings = Utils_Core.parseMSJSON($addPanelSettings.html(), false);
        this.readAddPanelVisibleSetting(); // read the add panel visibility setting from local storage.
    }

    protected _attachCommonConfigurationRegistration() {
        Service.getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(tfsContext.navigation.projectId, this._backlogContext.team.id).then((permissions: TeamServices.ITeamPermissions) => {
            this._permissions = permissions;
            Events_Action.getService().registerActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, this._launchCommonConfiguration);
        });
    }

    protected _detachCommonConfigurationRegistration() {
        Events_Action.getService().unregisterActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, this._launchCommonConfiguration);
        this._commonConfigurationRegistered = false;
    }

    private _launchCommonConfiguration = (actionArgs, next: Function): void => {
        VSS.using([
            "Presentation/Scripts/TFS/TFS.Configurations",
            "Agile/Scripts/Settings/CommonSettingsConfiguration"], (
                Configuration: typeof Configurations_NO_REQUIRE,
                Agile_Utils_CSC: typeof Agile_Utils_CSC_NO_REQUIRE
            ) => {
                if (!this.isDisposed) {
                    const perfScenario = TFS_Agile_Controls.CommonSettingsConfigurationControl.createPerfScenario(TFS_Agile.AgileCustomerIntelligenceConstants.ITERATION_BACKLOG_VIEW, !this._commonConfigurationRegistered);

                    if (!this._commonConfigurationRegistered) {

                        actionArgs = actionArgs || {};

                        Configuration.TabControlsRegistration.clearRegistrations(TFS_Agile.TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID);
                        Agile_Utils_CSC.CommonSettingsConfigurationUtils.registerGeneralSettingsForIterationLevel(this._backlogContext.team.id, this._permissions, !actionArgs.hideBacklogVisibilitiesTab);
                        this._commonConfigurationRegistered = true;
                    }

                    actionArgs = $.extend({
                        perfScenario
                    }, actionArgs);
                    next(actionArgs);
                }
            });
    }

    /** Determine the appropriate Iteration Backlog toolbar item states (hidden, toggled, enabled, etc.).
      * @override */
    protected _getUpdatedToolbarCommandStates(): Menus.ICommand[] {
        return <Menus.ICommand[]>[
            {
                id: Backlog.CMD_TOGGLE_ADD_PANEL,
                toggled: this.addPanelVisible
            },
            {
                id: Backlog.CMD_TOGGLE_FILTER,
                toggled: this._filterManager && this._filterManager.isActive(),
            }];
    }

    /** Handler to provide to the Add Panel when an item is to be added.
      * @override */
    protected addWorkItem(source: any, args?: { workItem: WITOM.WorkItem; callback: (status: AddBacklogItemStatus, continuationPromise?: PromiseLike<boolean>) => void }): void {
        // Set the iteration path since we are in the Iteration Backlog.
        if (args.workItem) {
            WorkItemUtils.setWorkItemIterationUsingAgileContext(args.workItem);
        }

        super.addWorkItem(source, args);
    }

    /** Toggle the add panel on or off.
      * @override
      * @param  show  If true, show the add panel; if false, hide it; if undefined, toggle it. */
    protected _updateAddPanelDisabledState = () => {
        if (this.addPanel && this.addPanelVisible) {
            const backlogFiltered = this.isBacklogFiltered();
            if (backlogFiltered || !this._isCurrentGridSelectionValidForAddPanel()) {
                const title = backlogFiltered ? ProductBacklogResources.AddPanel_TitleDisabledWhileFiltering : null;
                this.addPanel.disable(title);
            } else {
                this.addPanel.enable();
            }
        }
    }

    public createGrid(options?: any): TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid {
        const isAdvancedFeatureActive = (): boolean => {
            return haveBacklogManagementPermission();
        };

        const getSupportedBacklogLevel = (workItemType: string) => {
            // do not allow adding children if the grid is filtering.
            if (this._grid && this._grid.isFiltered()) {
                return;
            }

            const childBacklogLvlName = this._getChildWorkItemCategory(workItemType);
            return BacklogConfigurationService.getBacklogConfiguration().getBacklogByDisplayName(childBacklogLvlName);
        };

        this._addChildBehavior = new AddChildTaskGridBehavior(
            getSupportedBacklogLevel,
            () => this._backlogContext.team.id,
            this._eventHelper,
            this._getParentOptionFields(this._backlogContext.team.id),
            (error: Error) => this.getMessageArea().setError(Utils_String.format(ProductBacklogResources.Add_WorkItems_Error, error.message)),
            isAdvancedFeatureActive,
            (workItem: WITOM.WorkItem, parentId: number) => {
                WorkItemUtils.setWorkItemIterationUsingAgileContext(workItem);
            });

        options.behaviors = [this._addChildBehavior];
        options.datasourceName = IterationBacklog.DATASOURCE_NAME;

        const grid = super.createGrid(options);
        this.createGridReorderBehavior();

        // Ensure the Add Panel is enabled/disabled appropriately as the grid selection changes.
        grid._bind(GridO.EVENT_SELECTED_INDEX_CHANGED, this._updateAddPanelDisabledState);

        return grid;
    }

    /** Determine if the current grid selection (if anything) is valid for the Add Panel. */
    protected _isCurrentGridSelectionValidForAddPanel(): boolean {
        let isValidForAddPanel = true; // Defensively assume it's valid unless we prove otherwise.

        let grid = this.getGrid();
        let dataManager = this.getGridDataManager();
        if (grid && dataManager && dataManager.getItemsCount() > 0) {
            let selectedIndex = grid.getSelectedDataIndex();
            if (selectedIndex === -1) {
                // If no selection, the add panel will be based on the first item in the grid.
                selectedIndex = 0;
            }

            let selectedWorkItemId = dataManager.getWorkItemIdAtTreeIndex(selectedIndex);

            // The selected item must be real and requirement-level (root-level, since Iteration Backlog doesn't show story-story hierachy).
            // We should also allow the add panel to be enabled if the selected node is the UnparentedTasksGroup.
            let selectedWorkItem = TFS_Agile_ProductBacklog_Grid.GridGroupRowBase.getGroupRow(selectedWorkItemId);
            isValidForAddPanel = (selectedWorkItem === null || selectedWorkItem instanceof OrphanTasksGroup) && dataManager.isRootNode(selectedWorkItemId);
        }

        return isValidForAddPanel;
    }

    public createGridReorderBehavior() {
        let itemHierarchy = this.getItemHierarchy();
        let topLevel = this._backlogContext.includeParents ? BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels()[0] : this._backlogContext.level;
        this._iterationBacklogGridReorderBehavior = new IterationBacklogGridReorderBehavior(
            this._grid,
            this.getSelectionFilter(),
            new TFS_Agile_WorkItemChanges.LocationEnumerator(itemHierarchy),
            new TFS_Agile_WorkItemChanges.LocationValidator(topLevel, itemHierarchy),
            new TFS_Agile_WorkItemChanges.LocationSelector(itemHierarchy),
            this._getBacklogLevelHelper(),
            itemHierarchy);

        this._iterationBacklogGridReorderBehavior.updateReorderRequirementStatus();

        this._showHideReorderRequirementMessage();
        this._grid.setGridReorderBehavior(this._iterationBacklogGridReorderBehavior);
    }

    private _showHideReorderRequirementMessage() {
        if (this._iterationBacklogGridReorderBehavior.isReorderRequirementDisabled) {
            let $link = $("<a />", {
                href: IterationBacklog.HELPLINK_DISABLED_REQUIREMENTS_REORDERING,
                text: SprintPlanningResources.ReorderingRequirementsDisabled_HyperLinkText,
                target: "_blank",
                rel: "noopener noreferrer"

            });

            let problemWorkItemIds = this._iterationBacklogGridReorderBehavior.workItemsBlockingReorder.join(", ");

            let $messageDiv = $("<div>")
                .append("<span>" + Utils_String.format(SprintPlanningResources.ReorderingRequirementsDisabled_Message, problemWorkItemIds) + " " + "</span>")
                .append($link); 0
            this.getMessageArea().setMessage({
                header: $messageDiv
            }, Notifications.MessageAreaType.Info);
        }
    }

    public launchNewColumnOptionsPanel(props?: ColumnOptionsPanel_Async.IColumnOptionsPanelProps) {
        // Get work item type names
        const workItemTypeNames = this._getWorkItemTypeNamesInBacklog();

        // Launch dialog
        super.launchNewColumnOptionsPanel({
            project: tfsContext.navigation.projectId,
            workItemTypeNames: workItemTypeNames
        } as ColumnOptionsPanel_Async.IColumnOptionsPanelProps);
    }

    /**
     * Returns an array of work item ids being dragged.
     */
    public getDraggedWorkItemIds = (): number[] => {
        return this.getGrid().getSelectedWorkItemIds();
    }

    /**
     * Handler called after drop to save / react to the work item updates.
     * @param data Containing the result of the work item(s) update.
     */
    public dropHandlerForWorkItemUpdate = (data: { success: boolean, fieldName: string, workItems: any[] }): void => {
        const store = TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        if (data.success) {
            store.beginSaveWorkItemsBatch(data.workItems, () => {
                for (const workItem of data.workItems) {
                    const rowSavingManager = this._grid.getRowSavingManager();
                    rowSavingManager.clearRowSaving(workItem.id);
                }

                //  Since this was a successful save, clear any stale error messages.
                this.getMessageArea().clear();

                //  Record telemetry for drag-and-drop usage.
                SprintsHubTelemetryHelper.publishTelemetry(
                    SprintViewUsageTelemetryConstants.WORK_DETAILS_WORK_ITEMS_DROPPED,
                    {
                        fieldName: data.fieldName,
                        workItemCount: data.workItems.length
                    }
                );
            }, () => {
                //  Failed save attempt, display error message of first failed work item.
                const firstWorkItemWithError = Utils_Array.first(data.workItems, workItem => workItem.hasError())
                const error_message = VSS.getErrorMessage(firstWorkItemWithError.getError());

                // Reset all failed work items
                for (const workItem of data.workItems) {
                    workItem.reset();
                }

                // Report error for the first failed work item
                this._handleErrors(
                    data.workItems.map(w => w.id),
                    error_message);
            });
        } else {
            // No work item was updated, report error for the first work item.
            this._handleErrors(
                data.workItems.map(w => w.id),
                SprintPlanningResources.DropWorkItemToProgressControl_InvalidFieldAssignment);
        }
    }

    /**
     * Determines if the control is a valid drop target for the given work item ids and the field.
     * @param workItemIds Work item ids.
     * @param fieldName field name.
     */
    public isValidDropTargetHandler = (workItemIds: number[], fieldName: string): boolean => {

        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");
        //  fieldName is null for the team GroupedProgressControl; the team GroupedProgressControl is not droppable.
        Diag.Debug.assertIsNotUndefined(fieldName, "fieldName");
        Diag.Debug.assertIsNotNull(this._activityFieldRefName, "activityFieldName");

        if (Utils_String.equals(fieldName, this._activityFieldRefName, true /* ignoreCase */)) {
            // Important: Check if the workItemIds represent only root nodes; only leaf nodes (child workitems) have the activity field.
            // if we don't have any leaf nodes, it's not a valid drop target.
            const dataManager = this._grid.getDataManager();
            return workItemIds.some(workItemId => !dataManager.isRootNode(workItemId));
        }

        return true;
    }

    /**
     * Begins a work items retrieval request.
     * @param workItemIds Work item ids to retrieve.
     * @param callback To call when retrieval operation completes.
     */
    public beginGetWorkItemsHandler = (workItemIds: number[], callback: (workItem: any) => void): void => {
        const store = TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        //  Show the work items as saving and disable the appropriate parent workItem row.
        for (const workItemId of workItemIds) {
            const rowsToBeDisabled = this._getWorkItemIdsOfRowsToBeUpdated(workItemId);
            const rowSavingManager = this._grid.getRowSavingManager();
            rowSavingManager.markRowAsSaving(workItemId, rowsToBeDisabled);
        }

        WorkItemManager.get(store).beginGetWorkItems(
            workItemIds,
            callback,
            () => {
                this._handleErrors(workItemIds, null);
            });
    }

    protected _getContextMenuCreator(): TFS_Agile_ProductBacklog_ContextMenu.BacklogContextMenuCreator {
        if (!this._backlogContextMenuCreator) {
            this._backlogContextMenuCreator = new TFS_Agile_ProductBacklog_ContextMenu.IterationBacklogContextMenuCreator(
                this._grid, () => this._backlogContext.team, this.getItemHierarchy(), this._gridOptions.behaviors, this._getMessageSuppressor());
        }

        return this._backlogContextMenuCreator;
    }

    /**
     * Handles errors that occur while retrieving workItems or attempting workItem saves.
     * @param workItemId The id of the workItem that threw the error.
     * @param message OPTIONAL: Error message that should be shown to the user.
     */
    private _handleErrors(workItemIds: number[], message?: string): void {

        var errorMessage = message;

        if (!errorMessage) {
            //Show default error message
            errorMessage = SprintPlanningResources.DropWorkItemToProgressControl_UpdateFailed;
        }
        this.getMessageArea().setError(errorMessage);

        // Clear the work item saving indicator from the workItems and re-enable the appropriate parent workItem row
        if (workItemIds) {
            for (let workItemId of workItemIds) {
                let rowSavingManager = this._grid.getRowSavingManager();
                rowSavingManager.clearRowSaving(workItemId);
            }
        }
    }

    private _getWorkItemTypeNamesInBacklog(): string[] {
        let workItemTypeNames: string[] = [];
        const backlogConfiguration = BacklogConfigurationService.getBacklogConfiguration();
        workItemTypeNames = backlogConfiguration.requirementBacklog.workItemTypes.concat(backlogConfiguration.taskBacklog.workItemTypes);
        return workItemTypeNames;
    }

    /**
     * Gets the backlog query wiql and query name
     * 
     * @param fields List of fields to include in the query
     * @param success Success callback
     * @param error Error callback
     */
    public _beginGetBacklogQuery(fields: any[], success: IResultCallback, error?: IErrorCallback) {

        Diag.Debug.assertParamIsArray(fields, "fields");
        Diag.Debug.assertParamIsFunction(success, "success");
        Diag.Debug.assertParamIsFunction(error, "error");

        let requestIteration = TFS_OM.ProjectCollection.getDefaultConnection().getService<TFS_Agile.AgileContext>(TFS_Agile.AgileContext).getContext().iteration,
            queryName = this._getBacklogQueryName();

        TFS_Agile.BacklogQueryManager.beginGetIterationBacklogQuery(
            fields,
            requestIteration.id,
            function (wiql) {
                success(wiql, queryName);
            },
            error);
    }

    /**
     * OVERRIDE: Gets the default backlog query name
     */
    public _getBacklogQueryName(): string {
        let requestIteration = TFS_OM.ProjectCollection.getDefaultConnection().getService<TFS_Agile.AgileContext>(TFS_Agile.AgileContext).getContext().iteration;
        return Utils_String.format("{0} - {1} - {2}", this._backlogContext.team.name, requestIteration.name, SprintPlanningResources.CreateQuery_Backlog);
    }

    /**
     * Persist the column state
     * 
     * @param columns List of column definitions
     * @param callback The callback to invoke on completion
     */
    public _saveColumns(columns: IGridColumn[], callback?: IResultCallback) {
        Diag.Debug.assertParamIsArray(columns, "columns");

        let columnsJSON = this._serializeGridColumns(columns);
        ContextUtils.saveTeamUserStringSetting(
            this._backlogContext.team.id, "IterationBacklogColumnOptions", columnsJSON, callback);
    }

    /**
     * Persist the column state
     * 
     * @param columns List of column definitions
     * @param callback The callback to invoke on completion
     */
    public _saveDialogResultsColumns(columns: IDisplayColumnResult[], callback?: IResultCallback) {
        Diag.Debug.assertParamIsArray(columns, "columns");

        if (!super._matchesCurrentColumns(columns)) {
            let columnsJSON = this._serializeGridColumns(columns);
            ContextUtils.saveTeamUserStringSetting(
                this._backlogContext.team.id, "IterationBacklogColumnOptions", columnsJSON, callback);
        }
    }

    /**
     * Refreshes the display
     */
    public _refreshDisplay() {

        // let the dialog finish closing before redirect away to the new URL
        Utils_Core.delay(this, 0, function () {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_RELOAD);
        });
    }

    /**
     * OVERRIDE: same as base, but also removes workItem from aggregator.
     * 
     * @param workItemIds - The ids of the work items to remove
     */
    public _removeWorkItemsFromGrid(workItemIds: number[]) {
        this._grid.showBusyOverlay();
        let dataManager = this.getGridDataManager();
        for (let id of workItemIds) {
            let childIds = dataManager.getDescendantWorkItemIds(id);
            if (childIds && childIds.length > 0) {
                // if the id to be removed has children, then unparented the children that are not contains in the items to be removed.
                let itemsNotRemoved = Utils_Array.subtract(childIds, workItemIds);
                if (itemsNotRemoved.length > 0) {
                    this._moveIdsToOrphanedRow(id, itemsNotRemoved);
                }
            }
        }

        WorkItemManager.get(TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore)).beginGetWorkItems(workItemIds,
            (workItems) => {
                let aggregator = this._fieldAggregator;
                $.each(workItems, function (index, workItem) {
                    aggregator.remove(workItem);
                });
                super._removeWorkItemsFromGrid(workItemIds);
                this._grid.hideBusyOverlay();
            },
            () => {
                this._grid.hideBusyOverlay();
            });
    }

    /**
     *  OVERRIDE: same as base, but also removes workItem from aggregator.
     * 
     * @param workItemId The id of the work item to remove
     */
    public _removeWorkItemFromGrid(workItemId: number) {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        let dataManager = this.getGridDataManager();
        if (dataManager.getDescendantCount(workItemId) > 0) {
            // if the item to remove has children, move all the children to custom row.
            this._moveIdsToOrphanedRow(workItemId);
        }

        WorkItemManager.get(TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore)).beginGetWorkItems([workItemId],
            (workItems) => {
                let aggregator = this._fieldAggregator;
                $.each(workItems, function (index, workItem) {
                    aggregator.remove(workItem);
                });

                super._removeWorkItemFromGrid(workItemId);
            });
    }

    /** 
     * Move all children of the given parent id to orphan row. If childIds is passed, move only those ids.
     * @param parentId the parent id.
     * @param childIds Ids to be moved. The child ids must be children of the given parent id.
     */
    private _moveIdsToOrphanedRow(parentId: number, childIds?: number[]) {
        let dataManager = this.getGridDataManager();
        if (!childIds) {
            childIds = dataManager.getDescendantWorkItemIds(parentId);
        }
        if (childIds && childIds.length > 0) {
            let groupRowId = this._orphanedRow.getRowId();
            if (!this._isOrphanedRowVisible()) {
                // custom row does not exist in the grid, then add one.
                this._addCustomRows(this._gridOptions);
            }

            // move childIds to the custom row.
            dataManager.moveWorkItems(
                {
                    workItemIds: childIds,
                    targetLocation: {
                        parentId: groupRowId,
                        previousId: null,
                        nextId: null
                    }
                },
                false,
                false);
        }
    }

    private _isOrphanedRowVisible() {
        let customRowId = this._orphanedRow.getRowId();
        return this.getGridDataManager().getWorkItemTreeIndex(customRowId) !== undefined;
    }

    /**
     * Check for exceeding limit condition and show an error
     */
    public _checkLimit(fieldAggregator?: FieldAggregator) {

        let dataManager = this.getGridDataManager(),
            count = dataManager.getItemsCount(),
            maxCount = this._options.maxItemsCount,
            unlimitedCount = this._options.unlimitedItemsCount; // this is a const value that means no checking for maximum is needed

        if (count > maxCount && maxCount !== unlimitedCount) {
            this.getMessageArea().setError(Utils_String.format(SprintPlanningResources.IterationBacklog_ExceededLimit, maxCount, count), function () {
                Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                    url: AgileHubServerConstants.HelpLinkPlanAnIteration
                });
                // re evaluate the condition again
                Utils_Core.delay(this, 0, function () {
                    this._checkLimit(fieldAggregator);
                });
            });
        }
        else {
            if (fieldAggregator && fieldAggregator.isAggregatedCapacityLimitExceeded()) {
                this.getMessageArea().setError(SprintPlanningResources.AggregatedCapacity_LimitExceeded, () => {
                });
            }
        }
    }

    /**
     *  Add custom group rows that group a particular set of child rows, such as Orphan Tasks.
     *  It does this by :
     *     (1) determining the entries in the gridOptions that correspond to child rows
     *     (2) Creating a custom row and parenting the chid rows determined in (1) under it.
     * 
     * @param gridOptions The grid options structure that will be used for constructing the Grid.
     */
    private _addCustomRows(gridOptions: any) {
        const orphanGroupPreprocessor = (gridOptions: any, childRows: number[], customParent: number) => {
            const childRowIds = childRows.map(child => <number>gridOptions.targetIds[child]);
            this._fieldAggregator.reparentToCustomRow(childRowIds, customParent);
        }

        if (!this._orphanedRow) {
            this._orphanedRow = new OrphanTasksGroup(gridOptions, orphanGroupPreprocessor);
            TFS_Agile_ProductBacklog_Grid.GridGroupRowBase.workitemIDMap[this._orphanedRow.getRowId()] = this._orphanedRow;
            $.extend(gridOptions, this._orphanedRow.buildHierarchy(this._orphanedRow.getChildRows()));
        }
        else {
            let groupRowId = this._orphanedRow.getRowId();
            if (!this._grid.isWorkItemPaged(groupRowId)) {
                // Add custom row to page data used for rendering the row.
                let customRow = [];
                let defaultRowFields = this._orphanedRow.getDefaultRow();
                let columns = this._grid.getPageColumns();
                $.each(columns, (i, columnName) => {
                    if (columnName in defaultRowFields) {
                        customRow[i] = defaultRowFields[columnName];
                    }
                    else {
                        customRow[i] = null;
                    }
                });
                this._grid.addWorkItemPageData(groupRowId, columns, customRow);
            }
            // Insert the custom row to datasource.
            this.getGridDataManager().addGroupingItem(groupRowId, null, false, 1);
        }

        return gridOptions;
    }

    private _createGridOptions() {
        let that = this,
            i, l,
            gridOptions,
            gridColumns,
            aggregateField,
            aggregateColumn;

        // Get the default set of options for the grid.
        gridOptions = this.getGridOptions();
        gridColumns = gridOptions.columns;

        //Add custom group rows, such as Orphaned Tasks, Orphaned Bugs etc., to their own virtual row.
        gridOptions = this._addCustomRows(gridOptions);

        // Find the column for the aggregate field.
        aggregateField = this._fieldAggregator.getAggregateField();

        for (i = 0, l = gridColumns.length; i < l; i += 1) {
            if (gridColumns[i].name === aggregateField) {
                aggregateColumn = gridColumns[i];
                break;
            }
        }

        // If the aggregate column is in the grid, attach handler to custom draw the column.
        if (aggregateColumn) {
            aggregateColumn.getColumnValue = function (dataIndex, columnIndex, columnOrder) {
                // "this" is the grid instance
                return that._getRemainingWorkColumnValue(this, dataIndex, columnIndex, columnOrder);
            };
        }

        return gridOptions;
    }

    public getGridOptions() {
        let gridOptions = super.getGridOptions();

        // Add a post-processing function that sets the rows to collapsed state. 
        $.extend(gridOptions, {
            resultGridPostInitializeCallback: (grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid) => {
                if (grid) {
                    grid.collapseAllNodes();
                }
            }
        });

        return gridOptions;
    }

    public _contextMenuCreator(menuOptions: TFS_Agile_ProductBacklog_Grid.IGridMenuOptions, options?: TFS_Agile_ProductBacklog_Grid.IProductBacklogGridMenuOptions) {
        if (menuOptions.contextInfo) {
            menuOptions.contextInfo.item = {
                "readWorkItemsBeforeDeletion": true
            };
        }
        super._contextMenuCreator(menuOptions, options);
    }

    /**
     * Filters and serializes the grid columns in preparation for server persistence
     * 
     * @param columns List of columns
     * @return JSON string containing column information
     */
    private _serializeGridColumns(columns: any[]): string {
        Diag.Debug.assertParamIsArray(columns, "columns");

        columns = $.map(columns, (column) => {
            if (column.name !== BacklogBehaviorConstants.BACKLOG_BUTTONS_COLUMN_NAME) {
                return column;
            } else {
                return null;
            }
        });

        return Utils_Core.stringifyMSJSON(columns);
    }

    /**
     * Handler invoked when droping of a work item has been completed.
     * 
     * @param event event
     * @param args Arguments for the event.
     */
    public _dropWorkItemCompleted = (event: any, args?: IBacklogWorkItemChangeIterationResult) => {

        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(args, "args");

        for (let workItemId of args.workItemIds) {
            this._verifyMembership(workItemId);
        }

        this._iterationBacklogGridReorderBehavior.updateReorderRequirementStatus();
        this._showHideReorderRequirementMessage();

        // If save was successful clear all messages
        if (args.success) {
            this._checkLimit(this._fieldAggregator);
        }
    }

    /**
     * Called to get the value for the remaining work column.
     * 
     * @param grid The grid instance we are operating on
     * @param dataIndex data index in current page
     * @param columnIndex column Index
     * @param columnOrder column Order
     * @return 
     */
    private _getRemainingWorkColumnValue(grid: any, dataIndex: number, columnIndex: number, columnOrder: number): string {

        // Only assert the values we consume directly
        Diag.Debug.assertParamIsObject(grid, "grid");
        Diag.Debug.assertParamIsNumber(dataIndex, "dataIndex");

        let value: string;
        let dataManager = grid.getDataManager();
        let workItemId = grid.getWorkItemIdAtDataIndex(dataIndex);
        let workItemTypeName = grid.getWorkItemTypeNameById(workItemId);

        // If this is a leaf node, get the column value from the grid as normal.
        if (dataManager.isLeafNode(workItemId) &&
            Utils_Array.contains(BacklogConfigurationService.getBacklogConfiguration().taskBacklog.workItemTypes, workItemTypeName, Utils_String.ignoreCaseComparer)) {
            value = grid.getColumnValue(dataIndex, columnIndex, columnOrder);
        }
        else if (dataManager.isRootNode(workItemId)) {
            // Get the aggregated value for the work item since this is a root node.
            value = FormatUtils.formatRemainingWorkForDisplay(
                this._fieldAggregator.getAggregatedValue(FieldAggregator.PARENT_ID_FIELD_NAME, workItemId));
        }

        return value;
    }

    /**
     * Update row
     * 
     * @param event Information about the event.
     * @param rowInfo Information about the row which has been updated.
     */
    private _rowUpdatedHandler(event: any, rowInfo: any) {

        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(rowInfo, "rowInfo");

        // If custom group row, apply settings
        if (rowInfo.rowExtn) {
            rowInfo.row.addClass(rowInfo.rowExtn.getCssClass());
        }
    }

    private _verifyMembership(workItemId: number) {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        let actionArgs;
        let hasChildInIteration = false;
        let dataManager = this.getGridDataManager();
        let aggregator = this._fieldAggregator;
        let workItemIds = dataManager.getDescendantWorkItemIds(workItemId);
        let _base = delegate(this, super._removeWorkItemFromGrid);

        workItemIds.push(workItemId);

        let verifyMembership = (workItem: WITOM.WorkItem) => {
            actionArgs = {
                workItem: workItem,
                sendResult: function (isMember: boolean) {
                    Diag.Debug.assertParamIsBool(isMember, "isMember");
                    if (isMember) {
                        hasChildInIteration = true;
                    }
                    else {
                        aggregator.remove(workItem);
                        _base(workItem.id);
                    }
                }
            };

            Events_Action.getService().performAction(TFS_Agile.Actions.EVALUATE_MEMBERSHIP, actionArgs);
        }

        WorkItemManager.get(TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore)).beginGetWorkItems(workItemIds, (workItems) => {
            let parent: WITOM.WorkItem;

            $.each(workItems, (index: number, workItem) => {
                if (workItem.id === workItemId) {
                    parent = workItem;
                } else {
                    verifyMembership(workItem);
                }
            });

            if (!hasChildInIteration) {
                verifyMembership(parent);
            }
        });
    }

    public dispose() {
        if (this._grid) {
            this._grid._unbind(GridO.EVENT_SELECTED_INDEX_CHANGED, this._updateAddPanelDisabledState);
        }
        this.detachDropWorkItemCompleted(this._dropWorkItemCompleted);

        Events_Action.getService().unregisterActionWorker(TFS_Agile.Actions.VERIFY_MEMBERSHIP_EXPLICIT, this._verifiyExplicitMembership);
        this._eventHelper.detachEvent(TFS_Agile.Notifications.BACKLOG_ITEM_ADDED, this._hideZeroData);

        this._options = null;
        this._fieldAggregator = null;
        this._iterationBacklogGridReorderBehavior = null;
        this._orphanedRow = null;

        // Call base class dispose
        super.dispose();
    }
}

VSS.initClassPrototype(IterationBacklog, {
    _options: null,
    _fieldAggregator: null
});