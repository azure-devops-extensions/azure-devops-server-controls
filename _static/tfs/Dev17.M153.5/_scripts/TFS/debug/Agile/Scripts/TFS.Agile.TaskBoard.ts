/// <reference types="jquery" />
import "VSS/LoaderPlugins/Css!Agile";
import "VSS/LoaderPlugins/Css!Agile/Taskboard/Taskboard";
import "VSS/LoaderPlugins/Css!Boards";

import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Array = require("VSS/Utils/Array");
import Performance = require("VSS/Performance");
import Controls = require("VSS/Controls");
import TreeView = require("VSS/Controls/TreeView");
import Events_Action = require("VSS/Events/Action");
import Navigation_Services = require("VSS/Navigation/Services");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import Navigation = require("VSS/Controls/Navigation");
import Notifications = require("VSS/Controls/Notifications");
import Utils_String = require("VSS/Utils/String");

import TFS_Admin = require("Admin/Scripts/TFS.Admin");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");

import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TaskboardResources = require("Agile/Scripts/Resources/TFS.Resources.AgileTaskboard");
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import { SprintsHubStorageConstants } from "Agile/Scripts/Generated/HubConstants";

import { WitIdentityImages } from "WorkItemTracking/Scripts/Utils/WitIdentityImages";
import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");
import WITControls_RecycleBin = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.RecycleBin");
import { RecycleBinConstants, RecycleBinTelemetryConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_PendingOperationHelper = require("Presentation/Scripts/TFS/FeatureRef/PendingOperationHelper");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import { haveBacklogManagementPermission } from "WorkItemTracking/Scripts/Utils/PermissionHandler";
import { TaskBoardModel, ITaskboardModelOptions } from "Agile/Scripts/Taskboard/TaskBoardModel";
import { TaskBoardView, TaskBoardViewState } from "Agile/Scripts/Taskboard/TaskBoardView";
import TFS_Agile_Utils = require("Agile/Scripts/Common/Utils");
import Service = require("VSS/Service");
import TeamServices = require("TfsCommon/Scripts/Team/Services");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import Telemetry = require("VSS/Telemetry/Services");
import Menus = require("VSS/Controls/Menus");
import Cards = require("Agile/Scripts/Card/Cards");
import BoardsSettingsControls = require("Agile/Scripts/Board/BoardsSettingsControls");
import TFS_Agile_Controls = require("Agile/Scripts/Common/Controls");
import TFS_Agile_WorkItemChanges = require("Agile/Scripts/Common/WorkItemChanges");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import ConfigurationsConstants = require("Presentation/Scripts/TFS/TFS.Configurations.Constants");

import Agile_Utils_CSC_NO_REQUIRE = require("Agile/Scripts/Settings/CommonSettingsConfiguration");
import Configurations_NO_REQUIRE = require("Presentation/Scripts/TFS/TFS.Configurations");
import CardStyleCustomization_NO_REQUIRE = require("Agile/Scripts/Card/CardCustomizationStyle");
import EngagementDispatcher_NO_REQUIRE = require("Engagement/Dispatcher");
import { NavigationUtils } from "Agile/Scripts/Common/NavigationUtils";
import { BacklogConfigurationService } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";

import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");

import { DroppableWorkItemChangeOptions } from "Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements";
import { DragDropScopes } from "Agile/Scripts/Common/Agile";

var WorkItemUtils = TFS_Agile_Utils.WorkItemUtils;
var ContextUtils = TFS_OM_Common.ContextUtils;
var DatabaseCoreFieldRefName = TFS_Agile_Utils.DatabaseCoreFieldRefName;
const globalEvents = Events_Services.getService();

/* tslint:disable:member-ordering */
export class TaskBoard implements IDisposable {
    /**
     * Creates the taskboard in the provided element.
     * 
     * @param $element Element that the taskboard will be placed in.
     * @param pivotFilter Pivot Filter control that pivots on people
     * @param groupFilter Pivot Filter control that pivots on group by (stories or team)
     */
    public static createIn($element: JQuery, pivotFilter: Navigation.PivotFilter, groupFilter: Navigation.PivotFilter): TaskBoard {
        Diag.Debug.assertParamIsJQueryObject($element, "$element");
        Diag.Debug.assertParamIsObject(pivotFilter, "pivotFilter");
        Diag.Debug.assertParamIsObject(groupFilter, "groupFilter");

        const dataJSON = $("script", $element).eq(0).html();
        const boardCardSettingsJSON = $(".taskboard-card-settings", $element).html();
        let taskboard: TaskBoard;
        let taskboardDisplayed = false;
        let updateFilterUI = true;

        var historySvc = Navigation_Services.getHistoryService();

        // If we have a payload, construct the taskboard.
        if (dataJSON) {
            const options: ITaskboardModelOptions = Utils_Core.parseMSJSON(dataJSON, false);
            const boardCardSettings: Cards.IBoardCardSettings = Utils_Core.parseMSJSON(boardCardSettingsJSON, false);
            taskboard = new TaskBoard($element, options, boardCardSettings);

            // Attach handler for filtering by person
            pivotFilter.getElement().bind("changed.VSS.Agile", <any>((e, item: Navigation.IPivotFilterItem) => {
                var filter: { [fieldRefName: string]: any } = {};
                filter[options.filters[0].fieldName] = item.value;
                // using setTimeout to improve UI response (so that filter menu doesn't remain displayed until the full refresh has occurred)
                Utils_Core.delay(this, 0, () => {
                    taskboard.filterWorkItems(filter);
                });
            }));

            // Attach handler for group filtering by requirements items/people
            // NOTE: Here, we don't trigger a redraw of the filter UI, because
            // the filter selection has already changed to trigger this handler.
            groupFilter.getElement().bind("changed.VSS.Agile", <any>((e, item: Navigation.IPivotFilterItem) => {
                updateFilterUI = false;
                historySvc.addHistoryPoint(item.value, { action: item.value });
            }));

            // Attach navigation handlers for displaying the team member view and stories view. On attaching
            // each of the handlers, the current state will be checked to see if the handler needs to be invoked
            // immediately.
            historySvc.attachNavigate(TaskboardGroupBy.PEOPLE_CLASSIFICATION, (sender, state) => {
                taskboardDisplayed = true;
                taskboard.show(TaskboardGroupBy.PEOPLE_CLASSIFICATION);
                taskboard.updateGroupFilter(state.action, updateFilterUI);
                updateFilterUI = true;
            },
                true);

            historySvc.attachNavigate(TaskboardGroupBy.PARENT_CLASSIFICATION, (sender, state) => {
                taskboardDisplayed = true;
                taskboard.show(TaskboardGroupBy.PARENT_CLASSIFICATION);
                taskboard.updateGroupFilter(state.action, updateFilterUI);
                updateFilterUI = true;
            },
                true);

            // If neither navigation handler was invoked to display the taskboard, then
            // display the previous view (if it exists). If previous view selectedValue doesn't match what we expect (i.e. we stored a bad key),
            // or the selectedValue does not exist, display the default value.
            if (!taskboardDisplayed) {
                const selectedVal = options.filters[1].selectedValue;
                if (selectedVal && (selectedVal === TaskboardGroupBy.PARENT_CLASSIFICATION || selectedVal === TaskboardGroupBy.PEOPLE_CLASSIFICATION)) {
                    historySvc.addHistoryPoint(options.filters[1].selectedValue, { action: options.filters[1].selectedValue });
                } else {
                    taskboard.show(null);
                    taskboard.updateGroupFilter(null, true);
                }
            }

            // Once the board is displayed, check query params if page was redirected. If true, show a page redirected message
            if (Utils_String.caseInsensitiveContains(historySvc.getCurrentQueryString(), "redirect=true")) {
                historySvc.replaceHistoryPoint(null, null);
                taskboard.getTaskBoardView().getMessageArea().setMessage(TaskboardResources.Taskboard_RedirectToDefaultIteration, Notifications.MessageAreaType.Info);
            }
        }

        // Card Styling telemetry for Taskboard

        if (taskboard._boardCardSettings) {
            var enabledRuleCount = this._getEnabledStyleRuleCount(taskboard._boardCardSettings.styles);

            if (enabledRuleCount > 0) {
                Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_TASKBOARD_STYLERULES, {
                        "EnabledRuleCount": enabledRuleCount,
                    }));
            }
        }

        return taskboard;
    }

    private static _getEnabledStyleRuleCount(styles: any): number {
        var styleCount = 0;

        if (styles) {
            styles.forEach((style) => {
                if (style.isEnabled) {
                    styleCount++;
                }
            });
        }
        return styleCount;
    }

    private _container: JQuery;
    private _contributedPivotFilters: Menus.MenuBar;
    private _model: TaskBoardModel;
    private _view: TaskBoardView;
    private _workItemDraggingHandler: IEventHandler;
    private _workItemChangeRequestedHandler: IEventHandler;
    private _workItemReorderRequestedHandler: IEventHandler;
    private _editWorkItemHandler: IEventHandler;
    private _discardWorkItemHandler: IEventHandler;
    private _moveWorkItemToIterationHandler: IEventHandler;
    private _createNewWorkItemHandler: IEventHandler;
    private _newParentItemDiscardedHandler: () => void;
    private _pivotFilter: Navigation.PivotFilter;
    private _groupFilter: Navigation.PivotFilter;
    private _boardCardSettings: Cards.IBoardCardSettings;
    private static _boardType = "TASKBOARD";
    private _taskboardMenuBar: Menus.MenuBar;
    private _commonSettingsRegistered: boolean;
    private _workItemIdsToRemove: IDictionaryNumberTo<number>;
    private _workItemChangeEventHandler: IEventHandler;
    private _backlogLevelHelper: TFS_Agile_WorkItemChanges.BacklogLevelHelper;
    private _overriddenNewItemIterationPath?: string;
    private _allowParentItemsToBeDraggable: boolean;
    private _useNewTaskboardDisplay: boolean;
    private _membershipTracker: TFS_Agile.MembershipTracker;
    private _permissions: TeamServices.ITeamPermissions;

    private _disposed: boolean;

    public static CSS_TASKBOARD_MENUBAR = ".taskboard-menubar";
    protected _reorderManager: TFS_Agile.IReorderManager;

    /**
     * Constructs a TaskBoard object. This object plays the role of a Controller
     * that wires together a data source and a view, and handles events initiated by the user.
     *
     * @param container The element into which the taskboard view will be placed
     * @param data The initializer object for the TaskBoardData object
     * @param boardCardSettings The board card settings
     * @param newItemIterationPath The optional iteration path for new items added to the board. This will override the AgileSettings
     * @param allowParentItemsToBeDraggable Should parents (ie User Stories) be draggable? Default to true to drag stories to different iterations.
     * @param onNewParentItemDiscarded Callback for when a new parent item is discarded.
     * @param useNewTaskboardDisplay Whether the taskboard use the display pattern expected in the new SprintsHub page
     */
    constructor(
        container: JQuery,
        data: ITaskboardModelOptions,
        boardCardSettings?: Cards.IBoardCardSettings,
        newItemIterationPath?: string,
        allowParentItemsToBeDraggable: boolean = true,
        onNewParentItemDiscarded?: () => void,
        useNewTaskboardDisplay: boolean = false) {
        Diag.Debug.assertParamIsObject(container, "container");
        Diag.Debug.assertParamIsObject(data, "data");

        this._membershipTracker = new TFS_Agile.MembershipTracker(/* Taskboard does not subscribe to membership events, pass null */null);

        this._container = container;
        this._model = new TaskBoardModel(data, useNewTaskboardDisplay);
        this._boardCardSettings = boardCardSettings;
        this._workItemIdsToRemove = {};
        this._overriddenNewItemIterationPath = newItemIterationPath;

        this._setupHandlers();
        this._newParentItemDiscardedHandler = onNewParentItemDiscarded;

        this._primeWorkItemMetadata();

        // get pivot filter
        this._pivotFilter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(".person-filter"));
        this._groupFilter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(".group-filter"));
        this._reorderManager = new TFS_Agile.ReorderManager(data.team.id);

        if (this._pivotFilter) {
            // update people filter
            this._updatePeopleFilter();
        }

        if (boardCardSettings) {
            this._createSettingsMenubar(boardCardSettings);
        }

        this._allowParentItemsToBeDraggable = allowParentItemsToBeDraggable;
        this._useNewTaskboardDisplay = useNewTaskboardDisplay;

        // Do not use the global filter in the new display
        if (this._useNewTaskboardDisplay) {
            this._model.setFilter(null);
        }

        // Attach recycle events
        globalEvents.attachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._handleDeleteStarted);
        globalEvents.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._handleDeleteFailed);

        this._createContributedPivotFilters(["ms.vss-work-web.sprint-board-pivot-filter-menu"]);
        TFS_Agile_Utils.enableDragCancelling();

        const backlogsContext = TFS_Agile.BacklogContext.getInstance();
        if (backlogsContext.updateUrlActionAndParameter) {
            const agileContext: TFS_Agile.AgileContext = new TFS_Agile.AgileContext();
            const iterationName = agileContext.getContext().iteration.name;
            NavigationUtils.rewriteBacklogsUrl(NavigationUtils.taskboardPageAction, iterationName);
        } else if (!useNewTaskboardDisplay) {
            NavigationUtils.rememberMruHub();
        }

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_TASKBOARD_ITEMCOUNT, {
                ParentItemCount: this._model.getParentItemCount(),
                ChildItemCount: this._model.getChildItemCount()
            }));
    }

    public getTaskBoardView(): TaskBoardView {
        return this._view;
    }

    public getTaskBoardModel(): TaskBoardModel {
        return this._model;
    }

    /**
     * Shows the taskboard
     * @param classificationType The type of classification.  Valid values for classification are exposed as TaskBoardView.*_CLASSIFICATION
     */
    public show(classificationType: string): void {
        Diag.Debug.assert(this._model !== null, "Model should not be null");

        Diag.logTracePoint("TaskBoard.show.start");

        // Default the the classification type if it is not set.
        classificationType = classificationType || TaskboardGroupBy.PARENT_CLASSIFICATION;

        // If the view has not been created, create the view and attach to its events.
        if (!this._view) {
            this._view = new TaskBoardView(this._container, this._model.teamId, this._allowParentItemsToBeDraggable, this._useNewTaskboardDisplay);
            this._attachViewEvents();

            if (this._boardCardSettings) {
                const cardSettingsProvider: Cards.CardSettingsProvider = new Cards.CardSettingsProvider(this._boardCardSettings);
                this._view.setCardSettingsProvider(cardSettingsProvider);
            }
        }

        this._view.display(this._model, classificationType);
    }

    /**
     * Apply a new filter to the taskboard
     * 
     * @param filter The filter to apply, as a dictionary of field reference names to values.
     */
    public filterWorkItems(filter: WITOM.IFieldValueDictionary) {
        Diag.logTracePoint("Taskboard.filterWorkItems.start");
        Diag.Debug.assertParamIsObject(filter, "filter");

        var startTime = Date.now();

        var fieldRefName: string;

        this._model.setFilter(filter);
        this._view.applyFilter();
        for (fieldRefName in filter) {
            if (filter.hasOwnProperty(fieldRefName)) {
                ContextUtils.saveTeamUserStringSetting(
                    this._model.teamId, SprintsHubStorageConstants.AgileBoardFilter + fieldRefName, filter[fieldRefName]);
            }
        }

        Diag.logTracePoint("Taskboard.filterWorkItems.complete");
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATION_TASKBOARD_FILTER,
            {}, startTime));
    }

    /**
     * Return work item manager.
     */
    public getWorkItemManager(): WorkItemManager {
        return this._model.getWorkItemManager();
    }

    /**
     * Add a new parent work item to the taskboard
     * @param workItemType The work item type that the parent should be
     */
    public addNewParentItem(workItemType: string) {
        this._createNewWorkItem(workItemType, null, this._overriddenNewItemIterationPath, /*isNewParent*/true);
    }

    public dispose() {
        this._disposed = true;
        this.detachEvents();

        if (this._membershipTracker) {
            this._membershipTracker.dispose();
            this._membershipTracker = null;
        }

        this._view.dispose();
        this._view = null;

        this._model.dispose();
        this._model = null;

        if (this._reorderManager) {
            this._reorderManager.dispose();
            this._reorderManager = null;
        }
    }

    public detachEvents() {
        this._detachViewEvents();
        // Detach recycle bin events
        globalEvents.detachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._handleDeleteStarted);
        globalEvents.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._handleDeleteFailed);
    }

    /**
     * Helper to check if a workitem exists on the taskboard
     * @param id
     */
    public isWorkItemOnTheBoard(id: number): boolean {
        return this._model && this._model.isWorkItemOnTheBoard(id);
    }

    /**
     * Get droppableWorkItemChangeOptions for the details panel 
     */
    public getWorkItemChangeOptionsForDetailsPanel(): DroppableWorkItemChangeOptions {
        const store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        const options: DroppableWorkItemChangeOptions = {
            scope: DragDropScopes.WorkItem,
            workItemUpdate: (data) => {  //Save the updates that the DroppableWorkItemChangeEnhancement has made to the workItem
                if (data.success) {
                    store.beginSaveWorkItemsBatch(data.workItems, () => {
                        if (this._view) {
                            for (let item of data.workItems) {
                                this._view.refreshTile(item.id);
                            }
                        }
                    }, () => {
                        // Reset all failed work items
                        for (const workItem of data.workItems) {
                            workItem.reset();
                        }
                    });
                }
            },
            getDraggedWorkItemIds: (draggable: JQuery) => [this._view.getIdNumberFromElement(draggable)],
            isValidDropTarget: (workItemIds: number[], fieldName: string) => workItemIds.every(id => this.isWorkItemOnTheBoard(id)),
            beginGetWorkItems: (workItemIds: number[], callback) => {
                WorkItemManager.get(store).beginGetWorkItems(workItemIds, callback);
            }
        };
        // TODO: Implement error handling #1145475

        return options;
    }

    public get isDisposed(): boolean {
        return this._disposed;
    }

    private _createContributedPivotFilters(contributionIds: string[]) {
        if (!this._contributedPivotFilters) {
            var menuElem = $("<div />").addClass("agile-board-pivot-contributions").appendTo($(".filters"));
            this._contributedPivotFilters = Controls.create(Menus.MenuBar, menuElem, <Menus.MenuBarOptions>{
                contributionIds: contributionIds,
                getContributionContext: <Function>(() => {
                    var agileContextService = Service.getService(TFS_Agile.AgileContext);
                    var agileContext = agileContextService && agileContextService.getContext();
                    return {
                        iteration: agileContext && agileContext.iteration,
                        team: this._model.team
                    };
                }),
                cssClass: TaskBoard.CSS_TASKBOARD_MENUBAR.substr(1),
                emptyMenuInTabOrder: false
            });
        } else {
            this._contributedPivotFilters.refreshContributedItems();
        }
    }

    private _createSettingsMenubar(boardCardSettings: Cards.IBoardCardSettings) {
        /// <summary> Creates board settings menubar</summary>
        /// <param name="boardCardSettings" type="IDictionaryStringTo<TFS_Agile.ICardFieldSetting[]>">Card settings for the board</param>

        const $menubar = $(TaskBoard.CSS_TASKBOARD_MENUBAR);

        if (!this._taskboardMenuBar && $menubar.length > 0) {
            $menubar.toggleClass("agile-important-hidden", false);
            this._taskboardMenuBar = <Menus.MenuBar>Controls.Enhancement.enhance(Menus.MenuBar, $menubar);

            // Initialize fullscreen menuitem
            Navigation.FullScreenHelper.initialize(this._taskboardMenuBar);
        }

        // Initialize commonSettingsConfiguration menuitem and register tabs
        this._attachCommonConfigurationRegistration();

        // Taskboard menu bar can be null in the sprints hub
        if (this._taskboardMenuBar) {
            TFS_Agile_Controls.CommonSettingsConfigurationControl.initialize(this._taskboardMenuBar, () => { this._recordTaskboardCommonConfigDialogTelemetry(); });
        }
    }

    private _attachCommonConfigurationRegistration() {
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        Service.getService(TeamServices.TeamPermissionService).beginGetTeamPermissions(tfsContext.navigation.projectId, this._model.teamId).then((permissions: TeamServices.ITeamPermissions) => {
            this._permissions = permissions;
            Events_Action.getService().registerActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, this._launchCommonConfiguration);
        });
    }

    private _launchCommonConfiguration = (actionArgs, next: (args) => void) => {
        VSS.using([
            "Presentation/Scripts/TFS/TFS.Configurations",
            "Agile/Scripts/Settings/CommonSettingsConfiguration"], (
                Configuration: typeof Configurations_NO_REQUIRE,
                Agile_Utils_CSC: typeof Agile_Utils_CSC_NO_REQUIRE
            ) => {
                if (!this.isDisposed) {
                    const perfScenario = TFS_Agile_Controls.CommonSettingsConfigurationControl.createPerfScenario(TFS_Agile.AgileCustomerIntelligenceConstants.ITERATION_BOARD_VIEW, !this._commonSettingsRegistered);

                    if (!this._commonSettingsRegistered) {
                        Configuration.TabControlsRegistration.clearRegistrations(TFS_Agile.TabControlsRegistrationConstants.COMMON_CONFIG_SETTING_INSTANCE_ID);
                        const isEditable = this._permissions.currentUserHasTeamAdminPermission && (haveBacklogManagementPermission());

                        // card field tab
                        const cardFieldControlOptions: BoardsSettingsControls.IFieldSettingsControlOptions = {
                            teamId: this._model.teamId,
                            boardCardSettings: this._boardCardSettings.cards,
                            additionalCoreFields: this._getAdditionalCoreFieldsForCardCustomization(this._boardCardSettings.cards),
                            isEditable: isEditable,
                            boardType: TaskBoard._boardType,
                            defaultWorkItemTypeName: this._getDefaultWorkITemType(),
                            refreshOnSave: true
                        };

                        // card style tab
                        const cardStyleOptions: CardStyleCustomization_NO_REQUIRE.ICardStyleSettingsCSCControlInitOptions = {
                            teamId: this._model.teamId,
                            styleRules: this._boardCardSettings.styles,
                            isEditable: isEditable,
                            disableSave: null,
                            itemTypes: this._getWitTypes(),
                            requireRefreshOnSave: true,
                            boardIdentity: this._model.teamId,
                            boardType: TFS_Agile_Utils.BoardType.Taskboard
                        };

                        actionArgs = actionArgs || {};

                        Agile_Utils_CSC.CommonSettingsConfigurationUtils.registerTaskboardSettingsForIterationLevel(this._model.teamId, this._permissions, !actionArgs.hideBacklogVisibilitiesTab, cardFieldControlOptions, cardStyleOptions, null);

                        this._commonSettingsRegistered = true;
                    }

                    actionArgs = $.extend({
                        perfScenario: perfScenario
                    }, actionArgs);
                    next(actionArgs);
                }
            });
    }

    private _getWitTypes(): string[] {
        const witTypes: string[] = [];
        if (this._boardCardSettings && this._boardCardSettings.cards) {
            for (const witType of Object.keys(this._boardCardSettings.cards)) {
                if (this._boardCardSettings.cards[witType]) {
                    witTypes.push(witType);
                }
            }
        }
        return witTypes;
    }

    private _getDefaultWorkITemType(): string {
        let defaultWorkItemTypeName = this._getDefaultWorkItemTypeNameForTaskBacklog();
        if (!defaultWorkItemTypeName) {
            defaultWorkItemTypeName = TFS_Agile.BacklogContext.getInstance().level.defaultWorkItemType;
        }
        return defaultWorkItemTypeName;
    }

    private _recordTaskboardCommonConfigDialogTelemetry() {
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_COMMON_CONFIG_DIALOG_OPENED, {
                Page: TFS_Agile.AgileCustomerIntelligenceConstants.ITERATION_BOARD_VIEW,
            }));
    }

    private _getDefaultWorkItemTypeNameForTaskBacklog(): string {
        return BacklogConfigurationService.getBacklogConfiguration().taskBacklog.defaultWorkItemType;
    }

    private _getAdditionalCoreFieldsForCardCustomization(boardCardSettings: IDictionaryStringTo<Cards.ICardFieldSetting[]>): IDictionaryStringTo<string[]> {
        var additionalCoreFields: IDictionaryStringTo<string[]> = {};

        var childWitTypes = this._model.getChildWorkItemTypes();
        $.each(childWitTypes, (index: number, itemType: string) => {
            additionalCoreFields[itemType] = [];
            additionalCoreFields[itemType].push(this._model.getWorkRollupFieldRefName());
        });

        return additionalCoreFields;
    }

    private _setupHandlers(): void {
        // <summary>Setup event handlers for events on the taskboard</summary>
        this._workItemDraggingHandler = (source, id) => {
            this._primeWorkItemManager(id);
        };

        this._workItemChangeRequestedHandler = (source, args) => {
            Diag.Debug.assertParamIsObject(args, "args");
            Diag.Debug.assertParamIsNumber(args.id, "args.id");
            Diag.Debug.assertParamIsObject(args.workItemChanges, "args.workItemChanges");
            Diag.Debug.assertParamIsFunction(args.changeCompletedHandler, "args.changeCompletedHandler");

            this._changeWorkItem(args.id, args.workItemChanges, args.changeCompletedHandler);
        };

        this._workItemReorderRequestedHandler = (source, reorderOperation: TFS_Agile.IReorderOperation) => {
            Diag.Debug.assertIsObject(reorderOperation, "Unexpected reorderOperation");
            this._reorderManager.queueReorder(reorderOperation);
        };

        this._editWorkItemHandler = (source, id: number) => {
            this._editWorkItem(id);
        };

        this._discardWorkItemHandler = (source, id: number) => {
            this._discardNewWorkItem(id);
        }

        this._moveWorkItemToIterationHandler = (source, args: { id: number; iterationPath: string; }) => {
            this.moveWorkItemToIteration(args.id, args.iterationPath);
        }

        this._createNewWorkItemHandler = (source, args) => {
            this._createNewWorkItem(args.workItemType, args.parentId, this._overriddenNewItemIterationPath);
        }
    }

    /**
     * Update people filter from model
     */
    private _updatePeopleFilter() {
        if (!this._pivotFilter) {
            return; // We don't have a pivot filter.
        }

        var pivotFilterItems: Navigation.IPivotFilterItem[] = [],
            peopleFilterValues: string[] = this._model.getFilterValues(),
            filter: WITOM.IFieldValueDictionary = this._model.getFilter() || {},
            selectedValue = filter[DatabaseCoreFieldRefName.AssignedTo];

        // determine the correct filter to mark as selected = filter["System.AssignedTo"];
        // Default to "All" if there's not filter set
        if (selectedValue === undefined) {
            selectedValue = TaskBoardModel.ALL_VALUE;
        }

        // Build the pivot filter items.
        var showItemIcons = false; // Should the pivot filter menu show (and reserve space for) menu items' icons?
        $.each(peopleFilterValues, (i, peopleFilterValue: string) => {
            var value: string;
            var displayText = peopleFilterValue;
            var identity: TFS_OM_Identities.IIdentityReference;

            switch (i) {
                case 0: // All
                    value = TaskBoardModel.ALL_VALUE;
                    break;
                case 1: // Unassigned
                    value = TaskBoardModel.UNASSIGNED_VALUE;
                    break;
                default:
                    identity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(peopleFilterValue);
                    if (identity) {
                        displayText = identity.displayName;
                    }
                    value = peopleFilterValue;
                    break;
            }

            var pivotFilterItem: Navigation.IPivotFilterItem = {
                value: value,
                selected: value === selectedValue,
                title: peopleFilterValue,
                text: displayText  // All items must have text (for rendering when selected), even if they also have custom HTML for rendering when in the menu.
            }

            if (TFS_Agile_Utils.isUseNewIdentityControlsEnabled()) {
                // Render a custom item with the new identity display control.

                // (Determine what to display.)
                var item: string | Identities_Picker_RestClient.IEntity; // The identity to display. If unique-name string, the control will resolve the details from the server.
                var userFriendlyDisplayName: string; // The text to be displayed if/while the identity's details are being resolved from the server - not needed/used if item is already an IEntity.
                if (value === TaskBoardModel.ALL_VALUE) {
                    item = Identities_Picker_Controls.EntityFactory.createStringEntity(displayText, WitIdentityImages.AllUsersImageUrl);
                    userFriendlyDisplayName = displayText;
                }
                else if (value === TaskBoardModel.UNASSIGNED_VALUE) {
                    item = Identities_Picker_Controls.EntityFactory.createStringEntity(displayText, WitIdentityImages.UnassignedImageUrl);
                    userFriendlyDisplayName = displayText;
                }
                else {
                    item = (identity && identity.uniqueName) || displayText;
                    userFriendlyDisplayName = (identity && identity.displayName) || displayText;
                }

                // (Create & insert the actual control.)
                let $container = $("<span>");
                let options: Identities_Picker_Controls.IIdentityDisplayOptions = {
                    identityType: { User: true, Group: true },
                    operationScope: { Source: true, IMS: true },
                    item: item,
                    friendlyDisplayName: userFriendlyDisplayName, // Display this name until the identity is asynchronously resolved.
                    size: Identities_Picker_Controls.IdentityPickerControlSize.Small, // 16px
                    turnOffHover: true,
                    consumerId: TFS_Agile.IdentityControlConsumerIds.TaskBoardFilterDisplayControl
                };
                Controls.BaseControl.create(Identities_Picker_Controls.IdentityDisplayControl, $container, options);
                $.extend(pivotFilterItem, {
                    // Our filter is a dropdown-behavior pivot filter (see Navigation.DropdownFilterBehavior). This simply passes
                    // the IPivotFilterItems on to a PopupMenu as MenuItems.
                    html: $container,
                    showText: false
                });
            }
            else if (identity) {
                // Render a classic pivot item with the identity image as the icon.
                var getIdentityImage = () => {
                    return IdentityImage.identityImageElementByIdentifier(identity, null, peopleFilterValue, displayText);
                };
                $.extend(pivotFilterItem, {
                    text: displayText,
                    icon: identity && (identity.id || identity.uniqueName) ? getIdentityImage : null,
                    cssClass: identity ? "identity" : ""
                });
                showItemIcons = true;
            } else {
                // Just render a plain text pivot item.
                $.extend(pivotFilterItem, {
                    text: displayText
                });
            }

            pivotFilterItems.push(pivotFilterItem);
        });
        this._pivotFilter.updateItems(pivotFilterItems, { showItemIcons: showItemIcons });
    }

    /**
     * Update group filter from model
     */
    public updateGroupFilter(group: string, updateUI: boolean) {

        var values = [],
            filter = this._model.getGroupFilter() || {},
            groups = filter.values,
            selected = group;

        // if we don't have a filter element, don't do anything
        if (!this._groupFilter) {
            return;
        }

        // determine the correct filter to mark as selected
        // Default to "stories" if there's no filter set
        if (selected === null) {
            selected = TaskboardGroupBy.PARENT_CLASSIFICATION;
        }

        Utils_Core.delay(this, 500, () => {
            // persist the current group filter selection.   Do it in a delay because IE9 will only send
            // the header portion of the request (it's a post operation) while it's busy rendering/initializing which means
            // that these calls (setString) will appear to take a long time on the server.  Once rendering is completed
            // IE9 will send the body of the request.
            ContextUtils.saveTeamUserStringSetting(
                this._model.teamId, SprintsHubStorageConstants.AgileBoardFilter + SprintsHubStorageConstants.Group, selected);
        });

        // if we don't want to refresh the drop-down UI, return
        if (!updateUI) {
            return;
        }

        $.each(groups, (i, text) => {
            var value;

            switch (i) {
                case 0: // Team
                    value = TaskboardGroupBy.PEOPLE_CLASSIFICATION;
                    break;
                case 1: // Stories
                    value = TaskboardGroupBy.PARENT_CLASSIFICATION;
                    break;
                default:
                    value = text;
                    break;
            }

            values.push({
                text: text,
                value: value,
                selected: value === selected,
                title: text
            });
        });
        this._groupFilter.updateItems(values);
    }

    /**
     * Handle the start of a work item being edited
     * 
     * @param id The work item ID
     */
    private _primeWorkItemManager(id: number) {
        Diag.Debug.assert(typeof id === 'number', "Expected that id would be number");

        this._model.getWorkItemManager().beginGetWorkItem(id, $.noop);
    }

    /**
     * prefetch work item type data for the taskboard
     */
    private _primeWorkItemMetadata() {
        // Pre-fetch work item types.
        var store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        store.beginGetProject(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId,
            (project: WITOM.Project) => {
                if (!this.isDisposed) {
                    Diag.Debug.assertParamIsObject(project, "project");
                    project.beginGetWorkItemTypes(this._model.getChildWorkItemTypes(), () => { });

                    // Pre-fetch notes data without impacting TTI
                    project.nodesCacheManager.beginGetNodes();
                }
            });
        this._model.getWorkItemStore().beginGetLinkTypes($.noop);
    }

    /**
     * Handle an update to a work item
     * 
     * @param id The work item ID
     * @param workItemChanges Object which contains fieldData (maps field refnames to their new value) and other changes
     * @param changeCompletedHandler Function to invoke when the change has been completed.
     */
    private _changeWorkItem(id: number, workItemChanges: any, changeCompletedHandler: Function) {

        Diag.Debug.assertParamIsNumber(id, "id");
        Diag.Debug.assertParamIsObject(workItemChanges, "workItemChanges");
        Diag.Debug.assertParamIsFunction(changeCompletedHandler, "changeCompletedHandler");

        var witManager = this._model.getWorkItemManager(),
            pendingOperationId = "task-board-change-workitem",
            fieldChanges = workItemChanges.fieldChanges,
            newParentId = workItemChanges.newParentId;

        TFS_PendingOperationHelper.PendingOperationHelper.addOperation(pendingOperationId);

        var changeHandler = (args: WITOM.IWorkItemsBulkSaveSuccessResult, error?: number) => {
            // Notify that the change has been completed.
            if (!error) { //success

                changeCompletedHandler(id, args);

                // update the people filter in case of change to task items
                if (!this._model.isParentId(id)) {
                    this._updatePeopleFilter();
                }

            } else {
                changeCompletedHandler(id, args, error);
            }

            TFS_PendingOperationHelper.PendingOperationHelper.removeOperation(pendingOperationId);
        }

        witManager.beginGetWorkItem(id, (workItem) => {
            var refname, field;

            // New Parent ID has been set, so we need to relink
            // Also, New Parent ID can be zero, denoting an unparenting operation.
            // So we need to allow zero to go through.
            if (newParentId !== undefined && newParentId !== null) {
                WorkItemUtils.reparentWorkItem(workItem, newParentId);
            }

            // apply requested field changes
            for (refname in fieldChanges) {
                if (fieldChanges.hasOwnProperty(refname)) { // For JSLint
                    field = workItem.getField(refname);
                    if (field) {
                        field.setValue(fieldChanges[refname]);
                    }
                }
            }

            if (workItem.isValid()) {

                witManager.store.beginSaveWorkItemsBatch(
                    [workItem],
                    (args: WITOM.IWorkItemsBulkSaveSuccessResult) => {
                        Diag.Debug.assert(args && jQuery.isArray(args.workItems), "Expected a list of updated work items to be passed when the work items are saved");
                        Diag.Debug.assert(args.workItems.length === 1, "Expected exactly one item in the list of updated work items");
                        // Notify that the change has been completed.
                        changeHandler(args);
                    },
                    (err) => {
                        // Notify that the change has been completed.
                        changeHandler(err, TaskBoardViewState.SERVER_ERROR);
                    });
            }
            else {
                // Notify that the change has been completed.
                changeHandler(null, TaskBoardViewState.CLIENT_ERROR);
            }
        },
            (error) => {
                // Since the work item could not be loaded update the model with the information about the error.
                this._model.setWorkItemError(id, error);

                // Notify that the change has been completed.
                changeHandler(error, TaskBoardViewState.SERVER_ERROR);
            });
    }

    /**
     * Handle a request to edit a work item by displaying the appropriate work item edit form
     * @param id The work item ID
     */
    private _editWorkItem(id: number) {
        Diag.Debug.assert(typeof (id) === "number", "Expected a number to be passed to editWorkItem");

        // in both close and save we need to do the same thing because an item may be in error state so we need to refresh the UI in any case       
        const closeHandler = (workItem: WITOM.WorkItem) => {
            if (!this.isDisposed) {
                this._workItemCloseHandler(id, workItem);
            }
        };

        WITDialogShim.showWorkItemById(id, this._model.tfsContext, {
            close: closeHandler
        });
    }

    /** Public for unit testing */
    public _workItemCloseHandler(id: number, workItem: WITOM.WorkItem) {
        Diag.logTracePoint("taskboard_editWorkItemServerSave.complete");
        if (workItem) {
            if (this._model.isParentId(id)) {
                // update the pivot parent workitem title
                this._view.refreshPivotAfterEdit(id);
            } else if (workItem.isNew()) {
                // the new item has been discarded
                this._view.removeItems([id]);
            } else {
                // refresh the tile
                if (id < 0) {
                    this._view.rebindTile(id, workItem.id);
                    id = workItem.id;
                }
                this._updatePeopleFilter();
                this._view.refreshTileAfterEdit(id);
            }
        }
        Diag.logTracePoint("taskboard_editWorkItemDisplay.complete");
    }

    public moveWorkItemToIteration(workItemId: number, iterationPath: string, $tile?: JQuery) {
        this.getTaskBoardView().showSavingOverlay(workItemId);
        new TFS_Agile_Utils.MoveToIterationHelper().moveToIteration([workItemId], iterationPath, CustomerIntelligenceConstants.CustomerIntelligencePropertyValue.VIEWTYPE_TASKBOARD)
            .then(
            (updatedWorkItemIds: number[]) => {

                // if not drag and drop then include the moved work item as updated so it will be removed
                if (!$tile && !Utils_Array.contains(updatedWorkItemIds, workItemId)) {
                    updatedWorkItemIds.push(workItemId);
                }

                // Remove updated workitems from board
                this.getTaskBoardView().removeItems(updatedWorkItemIds);

                if ($tile && !Utils_Array.contains(updatedWorkItemIds, workItemId)) {
                    // Dragged item has not been updated, restore tile visibility
                    $tile.css("visibility", "visible");
                }

                this.getTaskBoardView().hideSavingOverlay(workItemId);
            },
            (errorMessage: string) => {
                if ($tile) {
                    $tile.css("visibility", "visible");
                }
                this.getTaskBoardView().hideSavingOverlay(workItemId);
                this.getTaskBoardView().showError(workItemId, {
                    name: errorMessage,
                    message: errorMessage
                });
            }
            );
    }

    /**
     * Handle a request to discard the work item
     *
     * @param id The work item ID
     */
    private _discardNewWorkItem(id: number) {
        Diag.Debug.assertParamIsNumber(id, "id");
        this._model.getWorkItemManager().beginGetWorkItem(id,
            (workItem: WITOM.WorkItem) => {
                if (workItem && workItem.isNew()) {
                    this._view.removeItems([id]);
                    workItem.discardIfNew();
                }
            });
    }

    private _createNewWorkItem(workItemType: string, parentId?: number, overridenIterationPath?: string, isNewParentItem: boolean = false) {
        const createWorkItem = (workItemType: WITOM.WorkItemType) => {
            WorkItemUtils.beginCreateWorkItem(this._model.teamId, workItemType).then(
                (workItem: WITOM.WorkItem) => {
                    if (parentId) {
                        workItem.addLinks([WITOM.WorkItemLink.create(workItem, WorkItemUtils.PARENT_LINK_NAME, parentId, "")]);
                        // inherit field values from parent (using cached/payload data)
                        workItem.setFieldValue(WITConstants.CoreFieldRefNames.AreaId, this._model.getFieldValue(parentId, WITConstants.CoreFieldRefNames.AreaId));
                        workItem.setFieldValue(this._model.getTeamFieldRefName(), this._model.getFieldValue(parentId, this._model.getTeamFieldRefName()));
                    }

                    // set the work item iteration to that of the current taskboard
                    WorkItemUtils.setWorkItemIterationUsingAgileContext(workItem);

                    // override the work item iteration if necessary
                    if (overridenIterationPath) {
                        workItem.setFieldValue(WITConstants.CoreField.IterationPath, overridenIterationPath);
                    }

                    if (!this.isDisposed) {
                        // apply the current filter value
                        this._model.applyFilterValues(workItem);

                        // update the view with the new work item tile
                        this._view.createNewTile(workItem.getUniqueId(), isNewParentItem);
                    }
                },
                (error: TfsError) => VSS.handleError(error)
            );
        };

        TFS_Agile_Utils.WorkItemUtils.beginGetWorkItemType(workItemType).then(
            (workItemType: WITOM.WorkItemType) => {
                if (!this.isDisposed) {
                    this._model.getWorkItemStore().beginGetLinkTypes(() => {
                        createWorkItem(workItemType);
                    });
                }
            },
            (error: TfsError) => VSS.handleError(error)
        );
    }

    /**
     * Attaches event handlers to the view events.
     */
    private _attachViewEvents() {
        this._view.attachNewParentWorkItemDiscarded(this._newParentItemDiscardedHandler);
        this._view.attachWorkItemDragging(this._workItemDraggingHandler);
        this._view.attachWorkItemChangeRequested(this._workItemChangeRequestedHandler);
        this._view.attachWorkItemReorderRequested(this._workItemReorderRequestedHandler);
        this._view.attachEditWorkItem(this._editWorkItemHandler);
        this._view.attachCreateNewWorkItem(this._createNewWorkItemHandler);
        this._view.attachDiscardWorkItem(this._discardWorkItemHandler);
        this._view.attachMoveWorkItemToIteration(this._moveWorkItemToIterationHandler);
        this._attachWorkItemChangeEvent();
    }

    /**
     * Detaches event handlers from the view events.
     */
    private _detachViewEvents() {
        this._view.detachNewParentWorkItemDiscarded(this._newParentItemDiscardedHandler);
        this._view.detachWorkItemDragging(this._workItemDraggingHandler);
        this._view.detachWorkItemChangeRequested(this._workItemChangeRequestedHandler);
        this._view.detachWorkItemReorderRequested(this._workItemReorderRequestedHandler);
        this._view.detachEditWorkItem(this._editWorkItemHandler);
        this._view.detachCreateNewWorkItem(this._createNewWorkItemHandler);
        this._view.detachDiscardWorkItem(this._discardWorkItemHandler);
        this._view.detachMoveWorkItemToIteration(this._moveWorkItemToIterationHandler);
        this._detachWorkItemChangeEvent();
        this._detachCommonConfigurationRegistration();
    }

    private _detachCommonConfigurationRegistration() {
        Events_Action.getService().unregisterActionWorker(ConfigurationsConstants.Actions.LAUNCH_COMMON_CONFIGURATION, this._launchCommonConfiguration);
    }

    private _ensureInitializedBacklogLevelHelper() {
        if (!this._backlogLevelHelper) {
            this._backlogLevelHelper = new TFS_Agile_WorkItemChanges.BacklogLevelHelper();
        }
    }

    private _attachWorkItemChangeEvent() {
        this._workItemChangeEventHandler = (sender: WorkItemManager, args: WITOM.IWorkItemChangedArgs) => {
            Diag.Debug.assertParamIsObject(args, "args");
            Diag.Debug.assertParamIsObject(args.workItem, "args.workItem");

            if (args.workItem && args.workItem.id) {
                var workItemId = args.workItem.id;
                switch (args.change) {
                    case WorkItemChangeType.Saved:
                        if (this._workItemIdsToRemove[workItemId]) {
                            delete this._workItemIdsToRemove[workItemId];
                            this.getTaskBoardView().removeItems([workItemId], true);
                        }
                        break;
                    case WorkItemChangeType.ProjectChanged:
                        this._workItemIdsToRemove[workItemId] = workItemId;
                        break;
                    case WorkItemChangeType.TypeChanged:
                        var originalWorkItemType = args.workItem.getOriginalWorkItemType();
                        var workItemType = args.workItem.workItemType;
                        if (!this._areSameBacklogLevel(originalWorkItemType.name, workItemType.name)) {
                            this._workItemIdsToRemove[workItemId] = workItemId;
                        }
                        else if (originalWorkItemType.project.id === args.workItem.workItemType.project.id) {
                            // if types changed are in the same backlog level, and the project names are the same.
                            delete this._workItemIdsToRemove[workItemId];
                        }
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

    private _areSameBacklogLevel(workItemType: string, workItemTypeToCompare: string): boolean {
        this._ensureInitializedBacklogLevelHelper();
        var level = this._backlogLevelHelper.getLevel(workItemType);
        var levelToCompare = this._backlogLevelHelper.getLevel(workItemTypeToCompare);
        return level !== -1 && levelToCompare !== -1 && level === levelToCompare;
    }

    private _detachWorkItemChangeEvent() {
        this._workItemIdsToRemove = {};
        this.getWorkItemManager().detachWorkItemChanged(this._workItemChangeEventHandler);
    }

    private _handleDeleteStarted = (startedArguments: WITControls_RecycleBin.IDeleteEventArguments) => {
        const workItemIds = startedArguments.workItemIds;
        if (workItemIds && workItemIds.length > 0) {
            // Allow JQuery to complete the drop operation and remove the cloned tile
            Utils_Core.delay(this, 0, () => {
                this._view.removeItems(workItemIds, true);
            });
        }
    }

    private _handleDeleteFailed = (message: string) => {
        this._view.getMessageArea().setError(message, () => {
            window.location.reload();
        });
    }
}

VSS.initClassPrototype(TaskBoard, {
    _container: null,
    _model: null,
    _view: null,
    _workItemDraggingHandler: null,
    _workItemChangeRequestedHandler: null,
    _workItemReorderRequestedHandler: null,
    _editWorkItemHandler: null,
    _pivotFilter: null
});

export class SprintPlanningBoardView extends Controls.BaseControl {

    private _groupFilter: any;
    private _personFilter: any;
    private _sprintView: TFS_Agile_Controls.SprintViewControl;
    private _taskBoard: TaskBoard;

    /**
     * Top-level UI control to manage the Taskboard page
     */
    constructor(options?) {
        super(options);
    }

    public initialize() {
        this._personFilter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(".person-filter"));
        this._groupFilter = <Navigation.PivotFilter>Controls.Enhancement.ensureEnhancement(Navigation.PivotFilter, $(".group-filter"));

        // create the taskboard
        this._taskBoard = TaskBoard.createIn($("#taskboard"), this._personFilter, this._groupFilter);

        // get the drag-drop options for the tree controls
        const treeOptions = this._getSprintViewOptions();

        // Create the sprint view tree
        this._sprintView = <TFS_Agile_Controls.SprintViewControl>Controls.Enhancement.enhance(TFS_Agile_Controls.SprintViewControl, ".team-iteration-view", treeOptions);

        // Create the backlog view tree
        <TFS_Agile_Controls.BacklogViewControl>Controls.Enhancement.enhance(TFS_Agile_Controls.BacklogViewControl, ".team-backlog-view", treeOptions);

        this._createRecycleBin();

        // listen for changes to the edit iteration dialog
        globalEvents.attachEvent(TFS_Admin.Notifications.CLASSIFICATION_CHANGED, this._handleIterationChanged);

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.TELEMETRY_TASKBOARD_DISPLAYEDROWSDATA, {
                "ClassificationType": this._taskBoard.getTaskBoardView().getClassificationType(),
                "TotalRows": this._taskBoard.getTaskBoardView().getRowCount(),
                "CollapsedRows": this._taskBoard.getTaskBoardView().getVisibleSummaryRowCount()
            }));

        Performance.getScenarioManager().recordPageLoadScenario(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            "IterationBoard.Open");

        // bootstrapping the Engagement experiences for iteration board
        VSS.using(["Engagement/Dispatcher"], (EngagementDispatcher: typeof EngagementDispatcher_NO_REQUIRE) => {
            EngagementDispatcher.Dispatcher.getInstance().start("IterationBoard");
        });
    }

    /**
     * When the iteration information changes we want to redirect the user to the updated taskboard
     */
    private _handleIterationChanged = (sender, iterationPath: string) => {
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let actionName = tfsContext.navigation.currentAction;
        let teamSettings = TFS_OM.ProjectCollection.getConnection(tfsContext).getService(TFS_TeamAwarenessService.TeamAwarenessService).getTeamSettings(tfsContext.currentTeam.identity.id);
        let location = TFS_Agile.LinkHelpers.generateIterationLink(actionName, iterationPath, teamSettings.backlogIteration.friendlyPath);

        // let the dialog finish closing before redirect away to the new URL
        Utils_Core.delay(this, 0, function () {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: location
            });
        });
    }

    /**
     * Creates the options to be used by the sprint view to enable dropping of work items.
     */
    private _getSprintViewOptions() {
        var that = this;
        return {
            droppable: {
                scope: TFS_Agile.DragDropScopes.WorkItem,  // Match the scope of the draggable items in the grid.
                accept: function ($tile: JQuery) {
                    var workItemType: string = $tile.data(TFS_Agile.DataKeys.DataKeyType);
                    return that._sprintView.isValidDropTargetForWorkItemTypes($(this), [workItemType], true)
                },
                hoverClass: "dragHover",
                drop: function (event, ui) { that._droppableDropHandler(this, event, ui); },
                tolerance: "pointer"
            }
        };
    }

    private _createRecycleBin() {
        const recycleBinOptions: WITControls_RecycleBin.IRecycleBinOptions = {
            sourceAreaName: RecycleBinTelemetryConstants.TASK_BOARD_SOURCE,
            dragDropScope: TFS_Agile.DragDropScopes.WorkItem,
            dataKey: TFS_Agile.DataKeys.DataKeyId
        };
        Controls.Enhancement.enhance(WITControls_RecycleBin.RecycleBin, ".recycle-bin", recycleBinOptions);
    }

    private _droppableDropHandler(droppableElement, event, ui) {
        var treeNode: TreeView.TreeNode = $(droppableElement).data("nodeData");
        var iterationPath = treeNode.iterationPath;
        var $tile = ui.draggable;
        var workItemId = $tile.data(TFS_Agile.DataKeys.DataKeyId);
        var workItemType = $tile.data(TFS_Agile.DataKeys.DataKeyType);

        // Hide the tile when the drop is complete, to prevent flickering. It will be restored in case it's a
        // no-op (same iteration assignment), or actual reassignment
        if (Utils_Array.contains(BacklogConfigurationService.getBacklogConfiguration().taskBacklog.workItemTypes, workItemType, Utils_String.ignoreCaseComparer)) {
            $tile.css("visibility", "hidden");
        }

        this._taskBoard.moveWorkItemToIteration(workItemId, iterationPath, $tile);
    }
}
