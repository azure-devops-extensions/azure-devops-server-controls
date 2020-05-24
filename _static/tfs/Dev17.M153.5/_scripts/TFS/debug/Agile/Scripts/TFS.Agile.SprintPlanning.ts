/// <reference types="jquery" />
/// <reference types="knockout" />
import "VSS/LoaderPlugins/Css!Agile";

import TFS_Admin = require("Admin/Scripts/TFS.Admin");
import { Backlog } from "Agile/Scripts/Backlog/Backlog";
import { BacklogShortcutGroup } from "Agile/Scripts/Backlog/BacklogShortcutGroup";
import {
    CapacityPlanningPivotFilterManager,
    IterationBacklogPivotFilterManager,
} from "Agile/Scripts/Backlog/BacklogsPanelPivotFilterManager";
import TFS_Agile_ProductBacklog_Grid = require("Agile/Scripts/Backlog/ProductBacklogGrid");
import Events = require("Agile/Scripts/Backlog/Events");
import Capacity_Models = require("Agile/Scripts/Capacity/CapacityModels");
import { CapacityView } from "Agile/Scripts/Capacity/CapacityView";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_Agile_Controls = require("Agile/Scripts/Common/Controls");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import { NavigationUtils } from "Agile/Scripts/Common/NavigationUtils";
import TFS_Agile_Utils = require("Agile/Scripts/Common/Utils");
import { IterationBacklog, IIterationBacklogOptions } from "Agile/Scripts/IterationBacklog/IterationBacklog";
import SprintPlanningResources = require("Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning");
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Controls = require("VSS/Controls");
import Notifications = require("VSS/Controls/Notifications");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import Performance = require("VSS/Performance");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { AccessibilityMonitor } from "Presentation/Scripts/TFS/FeatureRef/AccessibilityMonitor";
import { getDefaultWebContext } from "VSS/Context";

TFS_Knockout.overrideDefaultBindings();

const delegate = Utils_Core.delegate;
const WorkItemUtils = TFS_Agile_Utils.WorkItemUtils;
const DatabaseCoreFieldRefName = TFS_Agile_Utils.DatabaseCoreFieldRefName;
const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
const TeamAwarenessService = TFS_TeamAwarenessService.TeamAwarenessService;
const globalEvents = Events_Services.getService();
const historySvc = Navigation_Services.getHistoryService();

interface IAggregatedCapacityViewData {
    remainingWorkField: string;
    aggregatedCapacity: IDictionaryStringTo<IDictionaryStringTo<number>>; // (fieldRefName -> (fieldValue -> sumOfRemainingWork))
    previousValueData: IDictionaryStringTo<IDictionaryStringTo<any>>; // (fieldRefName -> (workItemId -> fieldValue))
    aggregatedCapacityLimitExceeded: boolean;
}

export class SprintPlanningPageView extends Controls.BaseControl {

    public static CAPACITY_PAGE: string = "capacityPage";
    public static ITERATION_PAGE: string = "iterationPage";
    public static SPLITTER_MIN_WIDTH = 210;

    private _iterationBacklog: IterationBacklog;
    private _capacityView: CapacityView;
    private _capacityOptions: Capacity_Models.ICapacityOptions;
    private _activityAllowedValues: IDictionaryStringTo<boolean>;
    private _trackedWorkItemTypes: IDictionaryStringTo<boolean>;
    private _backlogsPanelPivotFilterManager: IterationBacklogPivotFilterManager;


    /**
     * OVERRIDE: Initialize the control
     */
    public initialize() {
        var capacityDataService = Capacity_Models.getService();
        this._capacityOptions = capacityDataService.getCapacityOptions();

        globalEvents.attachEvent(TFS_Admin.Notifications.CLASSIFICATION_CHANGED, delegate(this, this._handleIterationChanged));

        let ensureUrlContextAndRememberMruHub = (action: string) => {
            let backlogsContext = TFS_Agile.BacklogContext.getInstance();
            if (backlogsContext.updateUrlActionAndParameter) {
                let agileContext: TFS_Agile.AgileContext = new TFS_Agile.AgileContext();
                let iterationName = agileContext.getContext().iteration.path;
                NavigationUtils.rewriteBacklogsUrl(action, iterationName);
            }
            else {
                NavigationUtils.rememberMruHub();
            }
        };

        switch (this._options.pageName) {
            case SprintPlanningPageView.CAPACITY_PAGE:
                AccessibilityMonitor.getInstance().start("Agile", "Capacity");
                this._createCapacityPlanningView();
                ensureUrlContextAndRememberMruHub(NavigationUtils.capacityPageAction);
                break;
            case SprintPlanningPageView.ITERATION_PAGE:
                this._createSprintBacklogView();
                ensureUrlContextAndRememberMruHub(NavigationUtils.iterationPageAction);
                break;
            default:
                Diag.Debug.fail("This page is not supported");
        }

        if (Utils_String.caseInsensitiveContains(historySvc.getCurrentQueryString(), "redirect=true")) {
            historySvc.replaceHistoryPoint(null, null);
            let message = !!this._iterationBacklog ?
                SprintPlanningResources.IterationBacklog_RedirectToDefaultIteration : SprintPlanningResources.CapacityPlanning_RedirectToDefaultIteration;
            this.getMessageArea().setMessage(message, Notifications.MessageAreaType.Info);
        }
    }

    public getIterationBacklog(): IterationBacklog {
        return this._iterationBacklog;
    }

    /**
     * Gets the workItemIds of rows that are to be disabled/enabled to prevent unwanted events occuring while the workItem with id workItemId changes
     * 
     * @param workItemId The workItemId of the workItem that is being changed on the grid
     */
    public _getWorkItemIdsOfRowsToBeUpdated(workItemId: number) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var listOfIds = [];

        //For the sprint backlog, disable/enable the parents of child workItems only
        if (!this._iterationBacklog.getGridDataManager().isRootNode(workItemId)) {
            listOfIds = [this._iterationBacklog.getGridDataManager().getRootWorkItemId(workItemId)];
        }

        return listOfIds;
    }

    /**
     * When the iteration information changes we want to redirect the user to the updated
     * sprint backlog
     */
    private _handleIterationChanged(sender, iterationPath: string) {
        const actionName = tfsContext.navigation.currentAction; // could be "Iteration" or "Capacity"
        const teamSettings = TFS_OM.ProjectCollection.getConnection(tfsContext).getService(TeamAwarenessService).getTeamSettings(tfsContext.currentTeam.identity.id);
        const location = TFS_Agile.LinkHelpers.generateIterationLink(actionName, iterationPath, teamSettings.backlogIteration.friendlyPath);

        // let the dialog finish closing before redirect away to the new URL
        Utils_Core.delay(this, 0, function () {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_NAVIGATE, {
                url: location
            });
        });
    }

    /**
     * Creates the field aggregator
     * 
     * @param isTrackedWorkItem The function that determines whether the aggregator cares about a given work item
     * @param fieldLookupHandler OPTIONAL: Function which the field aggregator will use to look up field values.  The signature of the function is the work item and the name of the field being looked up.
     * @return 
     */
    private _createFieldAggregator(isTrackedWorkItem: (workitem: WITOM.WorkItem) => boolean, fieldLookupHandler?: Function): FieldAggregator {

        Diag.Debug.assertParamIsFunction(isTrackedWorkItem, "isTrackedWorkItem");

        var aggregatedCapacityInfo: IAggregatedCapacityViewData = Utils_Core.parseMSJSON($(".aggregated-capacity-data").html(), false);

        var fieldAggregator = new FieldAggregator(
            aggregatedCapacityInfo.remainingWorkField,
            aggregatedCapacityInfo.aggregatedCapacity,
            aggregatedCapacityInfo.previousValueData,
            aggregatedCapacityInfo.aggregatedCapacityLimitExceeded,
            isTrackedWorkItem,
            fieldLookupHandler);

        return fieldAggregator;
    }

    /**
     * Create the sprint backlog page
     */
    private _createSprintBacklogView() {

        Diag.logTracePoint("SprintBacklog.show.start");

        var childWorkItemTypes = this._capacityOptions.childWorkItemTypes;
        // Build the list of allowed values for the activity field.
        var activities = this._capacityOptions.allowedActivities;
        this._activityAllowedValues = {};
        for (var i = 0, l = activities.length; i < l; i += 1) {
            this._activityAllowedValues[activities[i]] = true;
        }

        // Build the list of tracked child work item types.
        this._trackedWorkItemTypes = {};
        for (i = 0, l = childWorkItemTypes.length; i < l; i += 1) {
            this._trackedWorkItemTypes[childWorkItemTypes[i]] = true;
        }

        var fieldAggregator = this._createFieldAggregator(
            (workItem: WITOM.WorkItem) => {
                var dataManager = this._iterationBacklog.getGridDataManager(),
                    workItemId = workItem.id;
                return dataManager.getWorkItemOrder(workItemId) !== undefined
                    && dataManager.isLeafNode(workItemId)
                    && workItem.workItemType.name in this._trackedWorkItemTypes;
            },
            delegate(this, this._lookupFieldValue));

        // Update the grid when the Parent ID aggregation changes.
        fieldAggregator.attachAggregationChanged(FieldAggregator.PARENT_ID_FIELD_NAME,
            (sender, args) => {
                Diag.Debug.assertParamIsObject(sender, "sender");
                Diag.Debug.assertParamIsObject(args, "args");

                var dataManager = this._iterationBacklog.getGridDataManager(),
                    grid = this._iterationBacklog.getGrid(),
                    dataIndex;

                // Trigger grid row update.
                dataIndex = dataManager.getWorkItemTreeIndex(Number(args.fieldValue));
                grid.updateRow(undefined, dataIndex);
            });

        // Get iteration backlog options from json island
        const $optionsElement = $(".iteration-backlog-options");
        const data = $optionsElement.eq(0).html();
        $optionsElement.empty();
        const options = <IIterationBacklogOptions>Utils_Core.parseMSJSON(data, false);
        // Set other options
        options.isNewHub = false;
        options.$backlogElement = this._element;
        options.fieldAggregator = fieldAggregator;
        options.eventHelper = new ScopedEventHelper(`SprintPlanning_${(new Date()).getTime().toString()}`);
        options.gridOptions = Controls.Enhancement.getEnhancementOptions(TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid, $("." + Backlog.CSS_GRID, this.getElement()));

        const webContext = getDefaultWebContext();
        options.reorderManager = new TFS_Agile.ReorderManager(webContext.team.id);

        // Create the sprint backlog
        this._iterationBacklog = new IterationBacklog(options);

        // Create the sprint view tree
        Controls.Enhancement.enhance(TFS_Agile_Controls.SprintViewControl, $(".team-iteration-view"), this._iterationBacklog.getSprintViewOptions());

        // Create the backlog view tree
        Controls.Enhancement.enhance(TFS_Agile_Controls.BacklogViewControl, $(".team-backlog-view"), this._iterationBacklog.getSprintViewOptions());

        // Create the capacity pane
        this._setupCapacityPane(fieldAggregator, options.eventHelper); // Always setup pane after the iteration backlog is created

        Diag.logTracePoint("SprintBacklog.show.complete");

        Performance.getScenarioManager().recordPageLoadScenario(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            "IterationBacklog.Open"
        );

        this._registerIterationBacklogShortcuts();
    }

    private _registerIterationBacklogShortcuts() {

        new BacklogShortcutGroup({
            getTeamId: () => tfsContext.currentTeam.identity.id,
            getBacklog: () => this._iterationBacklog,
            backlogElement: this._iterationBacklog.getGridElement()[0],
            activateFilter: () => { this._iterationBacklog.activateFilter(); },
            addNewItem: () => { this._iterationBacklog.setAddPanelState(true); },
            addPanelShortcuts: true
        });
    }

    /**
     * Gets the additional URL parts constituting the selected iteration needed to build the action URL
     * 
     * @param sprintViewControl The sprint tree view control
     * @return 
     */
    private _getIterationUrlParts(sprintViewControl: any): any[] {
        return sprintViewControl.getSelectedNode().iterationPath.split("\\");
    }

    /**
     * Lookup handler for looking up the value of the parent ID and activity field for the provided work item.
     * 
     * @param workItem Work item to look up the field for.
     * @param fieldName Name of the field being looked up.
     * @return 
     */
    private _lookupFieldValue(workItem: WITOM.WorkItem, fieldName: string): any {

        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var value;

        // If the field being looked up is the parent ID field, then get the value.
        if (fieldName === FieldAggregator.PARENT_ID_FIELD_NAME) {
            value = this._lookupParentIdFieldValue(workItem);
        }
        else if (fieldName === this._capacityOptions.activityFieldName) {
            value = this._lookupActivityFieldValue(workItem);
        }

        return value;
    }

    /**
     * Lookup handler for looking up the value of the parent ID for the provided work item.
     * 
     * @param workItem Work item to look up the field for.
     * @return 
     */
    private _lookupParentIdFieldValue(workItem: WITOM.WorkItem): any {

        Diag.Debug.assertParamIsObject(workItem, "workItem");

        var value,
            link,
            dataManager = this._iterationBacklog.getGridDataManager(),
            workItemId = workItem.id;

        // If this is a leaf node, then look up the parent ID.
        // NOTE: We only calculate rollup based on the leaf nodes because the entire hierarchy
        //       of tasks under a user story is shown and we do not want to include remaining work
        //       values of organizational tasks into the rollup.
        if (dataManager.getWorkItemOrder(workItemId) !== undefined && dataManager.isLeafNode(workItemId)) {
            value = dataManager.getRootWorkItemId(workItemId);

            // If the value could not be looked up (happens in the case where a new work item is added and has
            // not been added to the grid yet), get the parent ID from the parent link and using that to get the
            // root node id if the work item type is a child work item type.
            if (value === undefined) {
                link = WorkItemUtils.getWorkItemParentLink(workItem);
                if (link) {
                    value = dataManager.getRootWorkItemId(link.getTargetId());
                }
                Diag.Debug.assertIsNotUndefined(value, "Should always be able to lookup the parent ID in the grid, but could not.");
            }
        }

        return value;
    }

    /**
     * Lookup handler for looking up the value of the parent ID for the provided work item.
     * 
     * @param workItem Work item to look up the field for.
     * @return 
     */
    private _lookupActivityFieldValue(workItem: WITOM.WorkItem): any {

        Diag.Debug.assertParamIsObject(workItem, "workItem");

        // Try and get the value from the activity field directly.
        var value = WorkItemUtils.getFieldValueByName(workItem, this._capacityOptions.activityFieldName);
        if (value && !(value in this._activityAllowedValues)) {
            // The value is not in the set of allowed values, so treat it as unassigned.
            value = "";
        }
        else if (!value) {
            // No activity field value, so try and get the value from the team members activity.
            var assignedTo: string = WorkItemUtils.getFieldValueByName(workItem, DatabaseCoreFieldRefName.AssignedTo);
            if (assignedTo) {
                Diag.Debug.assert(typeof assignedTo === "string", "Expected the AssignedTo value to be a string");
                // If the assigned to is a member of the team, use the activity set on the team member.
                var teamCapacity = Capacity_Models.getService().getCapacityPageModel();
                if (teamCapacity) {
                    var teamMemberCapacity = teamCapacity.getTeamMemberCapacity(assignedTo);
                    if (teamMemberCapacity) {
                        // If the team member has a default activity, use it.
                        var activity = teamMemberCapacity.getDefaultActivity();
                        if (activity) {
                            value = activity;
                        }
                    }
                }
            }
        }

        return value;
    }

    /**
     * Create the capacity planning page
     */
    private _createCapacityPlanningView() {
        Diag.logTracePoint("CapacityPlanningView.show.start");

        var fieldAggregator = this._createFieldAggregator((workItem: WITOM.WorkItem) => false);

        // Create the sprint tree
        var sprintViewControl = <TFS_Agile_Controls.SprintViewControl>Controls.Enhancement.enhance(TFS_Agile_Controls.SprintViewControl, ".team-iteration-view");

        // Create the backlog view tree
        <TFS_Agile_Controls.BacklogViewControl>Controls.Enhancement.enhance(TFS_Agile_Controls.BacklogViewControl, ".team-backlog-view");

        // Create the capacity planning view
        this._capacityView = <CapacityView>Controls.BaseControl.createIn(CapacityView, $(".capacity-control"), {
            onOperationStart: delegate(this, this.showBusyOverlay),
            onOperationComplete: delegate(this, this.hideBusyOverlay),
            activityDisplayName: this._capacityOptions.activityFieldDisplayName,
            currentIteration: this._getIterationUrlParts(sprintViewControl),
            isEmpty: this._capacityOptions.isEmpty,
            isFirstIteration: this._capacityOptions.isFirstIteration,
            isAggregatedCapacityLimitExceeded: fieldAggregator.isAggregatedCapacityLimitExceeded(),
            teamId: tfsContext.currentTeam.identity.id
        });
        const eventHelper = new ScopedEventHelper(`Capacity_${(new Date()).getTime().toString()}`);

        this._setupCapacityPane(fieldAggregator, eventHelper);

        Diag.logTracePoint("CapacityPlanningView.show.complete");
    }

    /**
     * Setup the capacity pane
     * 
     * @param fieldAggregator The field aggregator for tracking allocated remaining work across the team
     */
    private _setupCapacityPane(fieldAggregator: FieldAggregator, eventHelper: ScopedEventHelper) {
        if (!this._backlogsPanelPivotFilterManager) {
            if (!!this._iterationBacklog) {
                let grid = this._iterationBacklog._grid;
                let selectedWorkItemIds = (): Events.IBacklogGridItem[] => {
                    return grid.getSelectedWorkItemIds().map(id => {
                        let item = {
                            workItemId: id,
                            workItemType: grid.getWorkItemTypeNameById(id)
                        };
                        return item;
                    });
                };
                this._backlogsPanelPivotFilterManager = new IterationBacklogPivotFilterManager({
                    fieldAggregator: fieldAggregator,
                    messageArea: this.getMessageArea(),
                    grid: this._iterationBacklog._grid
                }, selectedWorkItemIds,
                    eventHelper);
            } else {
                this._backlogsPanelPivotFilterManager = new CapacityPlanningPivotFilterManager({
                    fieldAggregator: fieldAggregator,
                    messageArea: this.getMessageArea(),
                    grid: null
                },
                    null,
                    eventHelper);
            }
        }
    }

    private getMessageArea(): Notifications.MessageAreaControl {
        if (!!this._iterationBacklog) {
            return this._iterationBacklog.getMessageArea();
        }
        else {
            return this._capacityView.getMessageArea();
        }
    }
}

VSS.initClassPrototype(SprintPlanningPageView, {
    _cssRightParam: null,
    _iterationBacklog: null,
    _capacityOptions: null,
    _activityAllowedValues: null,
    _trackedWorkItemTypes: null,
    _fieldAggregator: null
});