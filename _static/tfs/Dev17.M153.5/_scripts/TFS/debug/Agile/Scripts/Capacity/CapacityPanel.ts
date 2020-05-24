/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Handlers = require("VSS/Events/Handlers");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Notifications = require("VSS/Controls/Notifications");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import TFS_DroppableEnhancements = require("Presentation/Scripts/TFS/FeatureRef/DroppableEnhancements");
import TFS_ProgressControl = require("Presentation/Scripts/TFS/FeatureRef/ProgressControl");
import TFS_Agile_Utils = require("Agile/Scripts/Common/Utils");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_UI_Controls_Identities = require("Presentation/Scripts/TFS/TFS.UI.Controls.Identities");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Agile_ProductBacklog_Grid = require("Agile/Scripts/Backlog/ProductBacklogGrid");

import { WitIdentityImages } from "WorkItemTracking/Scripts/Utils/WitIdentityImages";

import Capacity_Models = require("Agile/Scripts/Capacity/CapacityModels");
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";

import ProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import SprintPlanningResources = require("Agile/Scripts/Resources/TFS.Resources.AgileSprintPlanning");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import { CapacityPanelConstants, GroupedProgressControlConstants } from "Agile/Scripts/Backlog/Constants";
import { RichContentTooltip } from "VSS/Controls/PopupContent";

var delegate = Utils_Core.delegate;
var DatabaseCoreFieldRefName = TFS_Agile_Utils.DatabaseCoreFieldRefName;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

/**
 * Interface representing capacity panel settings
 */
export interface ICapacityPanelOptions {
    /** Field aggregator for capacity calculations */
    fieldAggregator: FieldAggregator;

    /** Message area control to display error messages */
    messageArea: Notifications.MessageAreaControl;

    /** Optional grid. When set, drag drop onto capacity panel is enabled */
    grid?: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid;
}

export class CapacityPanel {
    private _capacityOptions: Capacity_Models.ICapacityOptions;
    private _messageAreaControl: Notifications.MessageAreaControl;
    private _fieldAggregator: FieldAggregator;
    private _grid: TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid;

    constructor(options: ICapacityPanelOptions) {
        this._messageAreaControl = options.messageArea;
        this._fieldAggregator = options.fieldAggregator;
        this._grid = options.grid;
        this._createCapacityPane(this._fieldAggregator);
    }

    public _createCapacityPane(fieldAggregator: FieldAggregator) {

        Diag.Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        var capacityDataService = Capacity_Models.getService();

        let teamCapacity = capacityDataService.getCapacityPageModel();
        this._capacityOptions = capacityDataService.getCapacityOptions();

        // If team member capacities are loaded, build capacity pane
        if (teamCapacity) {
            this._checkForCapacityError(teamCapacity);
            this._buildCapacityPaneControls(fieldAggregator);
            $(".capacity-pane").css("display", "block")
        }
        // Otherwise, make call to get team member capacities
        else {
            // Show spinner while waiting for async call
            var $container = $(".capacity-pane-container")
                .addClass("in-progress-container")
                .addClass("capacity-pane");

            capacityDataService.beginGetTeamCapacityModel(this._capacityOptions.iterationId, this._capacityOptions.allowedActivities, this._capacityOptions.accountCurrentDate).then(teamCapacity => {
                $container.removeClass("in-progress-container");
                teamCapacity = teamCapacity;
                this._checkForCapacityError(teamCapacity);
                this._buildCapacityPaneControls(fieldAggregator);
                $(".capacity-pane").css("display", "block");
            }, (reason) => {
                // There was an issue getting Team Capacity, show message
                this._messageAreaControl.setError(SprintPlanningResources.Capacity_CopyPrevious_ServerError);
                $container.removeClass("in-progress-container");
            });
        }
    }

    private _checkForCapacityError(teamCapacity) {
        if (teamCapacity) {
            if (this._hasCapacityError(teamCapacity)) {
                this._messageAreaControl.setError(SprintPlanningResources.Sprint_Negative_Capacity_Message, function () {
                    window.location.href = tfsContext.getActionUrl("capacity", "backlogs", { parameters: this._getIterationUrlParts(this._sprintViewControl) });
                });
            }
        }
    }

    private _hasCapacityError(teamCapacity: Capacity_Models.TeamCapacityModel): boolean {

        Diag.Debug.assertParamIsObject(teamCapacity, "teamCapacity");

        var error = false,
            teamMemberCapacityCollection = teamCapacity.getTeamMemberCapacityCollection();

        for (var i = 0, l = teamMemberCapacityCollection.length; i < l; i += 1) {
            if (teamMemberCapacityCollection[i].getTotalRemainingCapacity() < 0) {
                error = true;
                break;
            }
        }

        return error;
    }


    private _buildCapacityPaneControls(fieldAggregator: FieldAggregator) {

        // Set title
        let $backlogsPaneHeader = $(".backlogs-tool-panel-header");
        let title = ProductBacklogResources.ToolPanel_Capacity;
        let $capacityTitle = $("<h1>").addClass("capacity-pane-title");
        $capacityTitle.text(title);
        $capacityTitle.appendTo($backlogsPaneHeader);
        RichContentTooltip.addIfOverflow(title, $capacityTitle);

        var progressOptions = this._capacityOptions,
            assignedToGroupedProgressDataProvider,
            activityProgressDataProvider,
            teamProgressDataProvider,
            canDragToProgressControl = !!this._grid, //Allow addition of behaviours only if the feature is enabled and it is a sprintbacklogview
            rowsToBeDisabled,
            attachDroppableBehavior: ((sender: any, args: any) => void) = null,
            attachExpandOnHoverBehaviour: ((sender: any, args: any) => void) = null;

        var handleErrors = (workItemIds: number[], message) => {
            /**
             * @param workItemId The id of the workItem that threw the error
             * @param message OPTIONAL: Error message that should be shown to the user
             */
            //Handles errors that occur while retrieving workItems or attempting workItem saves

            var errorMessage = message;

            if (!errorMessage) {
                //Show default error message
                errorMessage = SprintPlanningResources.DropWorkItemToProgressControl_UpdateFailed;
            }
            this._messageAreaControl.setError(errorMessage);

            // Clear the work item saving indicator from the workItems and re-enable the appropriate parent workItem row
            if (workItemIds) {
                for (let workItemId of workItemIds) {
                    let rowSavingManager = this._grid.getRowSavingManager();
                    rowSavingManager.clearRowSaving(workItemId);
                }
            }
        }

        if (canDragToProgressControl) { //Only enhance if all conditions are satisfied 
            attachExpandOnHoverBehaviour = function (sender, args) {
                var $control = args.control;

                <TFS_DroppableEnhancements.UpdateControlOnHoverEnhancement>Controls.Enhancement.enhance(TFS_DroppableEnhancements.UpdateControlOnHoverEnhancement, $control, {
                    scope: TFS_Agile.DragDropScopes.IterationBacklog, // Match the scope of the draggable items in the grid.
                    tolerance: "pointer",
                    onOverCallback: args.onOverCallback,
                    onOutCallBack: args.onOutCallBack
                });
            };

            attachDroppableBehavior = (sender, args) => {
                var control = args.control,
                    text = args.value,
                    store = TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore),
                    fieldName = args.fieldName;

                if (fieldName) {//FieldName is null for the teamProgressControlGroup which is not a valid drop zone
                    <TFS_DroppableEnhancements.DroppableWorkItemChangeEnhancement>Controls.Enhancement.enhance(TFS_DroppableEnhancements.DroppableWorkItemChangeEnhancement, control.getElement(),
                        <TFS_DroppableEnhancements.DroppableWorkItemChangeOptions>{
                            text: text,
                            fieldName: fieldName,
                            scope: TFS_Agile.DragDropScopes.IterationBacklog, // Match the scope of the draggable items in the grid.
                            hoverClass: "dragHover",
                            tolerance: "pointer",
                            workItemUpdate: (data) => {  //Save the updates that the DroppableWorkItemChangeEnhancement has made to the workItem
                                if (data.success) {
                                    store.beginSaveWorkItemsBatch(data.workItems, () => {
                                        for (let workItem of data.workItems) {
                                            let rowSavingManager = this._grid.getRowSavingManager();
                                            rowSavingManager.clearRowSaving(workItem.id);
                                        }

                                        // Since this was a successful save, clear any stale error messages
                                        this._messageAreaControl.clear();
                                    }, () => {
                                        // Failed save attempt, display error message of first failed work item
                                        let firstWorkItemWithError = Utils_Array.first(data.workItems, workItem => workItem.hasError())
                                        var error_message = VSS.getErrorMessage(firstWorkItemWithError.getError());

                                        // Reset all failed work items
                                        for (let workItem of data.workItems) {
                                            workItem.reset();
                                        }

                                        // Report error for the first failed work item
                                        handleErrors(data.workItems.map(w => w.id), error_message);
                                    });
                                } else {
                                    // No work item was updated, report error for the first work item
                                    handleErrors(data.workItems.map(w => w.id), SprintPlanningResources.DropWorkItemToProgressControl_InvalidFieldAssignment);

                                }
                            },
                            getDraggedWorkItemIds: delegate(this, this._getDraggedWorkItemIds),
                            isValidDropTarget: delegate(this, this._checkForValidProgressControlDropTarget),
                            beginGetWorkItems: (workItemIds: number[], callback) => {
                                // Show the work items as saving and disable the appropriate parent workItem row
                                for (let workItemId of workItemIds) {
                                    rowsToBeDisabled = this._getWorkItemIdsOfRowsToBeUpdated(workItemId);
                                    let rowSavingManager = this._grid.getRowSavingManager();
                                    rowSavingManager.markRowAsSaving(workItemId, rowsToBeDisabled);
                                }

                                WorkItemManager.get(store).beginGetWorkItems(workItemIds, callback, () => { handleErrors(workItemIds, null); });
                            }
                        });
                }
            };
        }

        $(".capacity-pane-container").addClass("capacity-pane");

        // Create the assigned to progress control
        assignedToGroupedProgressDataProvider = new AssignedToGroupedProgressDataProvider(fieldAggregator);
        <GroupedProgressControl>Controls.BaseControl.createIn(GroupedProgressControl, $("." + CapacityPanelConstants.ASSIGNED_TO_GROUPED_PROGRESS_CONTAINER), $.extend(progressOptions, {
            dataProvider: assignedToGroupedProgressDataProvider,
            headerText: Utils_String.format(SprintPlanningResources.Capacity_By, progressOptions.assignedToFieldDisplayName),
            dropHandler: attachDroppableBehavior,
            expandOnHoverHandler: attachExpandOnHoverBehaviour,
            renderDisplayContents: (displayText: string) => {
                if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileUseNewIdentityControls)) {
                    var item: string | Identities_Picker_RestClient.IEntity; // The identity to display. If unique-name string, the control will resolve the details from the server.
                    var userFriendlyDisplayName: string; // The text to be displayed if/while the identity's details are being resolved from the server - not needed/used if item is already an IEntity.
                    if (displayText === SprintPlanningResources.Capacity_Unassigned) {
                        // Use a fake 'string entity', which will not need to be resolved from the server.
                        item = Identities_Picker_Controls.EntityFactory.createStringEntity(displayText, WitIdentityImages.UnassignedImageUrl);
                        userFriendlyDisplayName = displayText;
                    }
                    else {
                        // The control will need to resolve the real entity details from the server, given the unique name.
                        // displayText is the disambiguated display name (e.g. "John <FOO\john>" or "Jane <jane@foo.com>").
                        // We can parse the unique ("FOO\john" or "jane@foo.com") & display names ("John" or "Jane") from this, but fall-back to it.
                        var identityRef: TFS_OM_Identities.IIdentityReference = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(displayText);
                        item = (identityRef && identityRef.uniqueName) || displayText;
                        userFriendlyDisplayName = (identityRef && identityRef.displayName) || displayText;
                    }

                    // Create the new 'identity display control'.
                    var $container = $("<div>");
                    let options: Identities_Picker_Controls.IIdentityDisplayOptions = {
                        identityType: { User: true },
                        operationScope: { IMS: true },
                        item: item,
                        friendlyDisplayName: userFriendlyDisplayName,
                        size: Identities_Picker_Controls.IdentityPickerControlSize.Medium,  // (Currently 24px)
                        consumerId: TFS_Agile.IdentityControlConsumerIds.SprintPlanningDisplayControl
                    };
                    Controls.BaseControl.createIn(Identities_Picker_Controls.IdentityDisplayControl, $container, options);

                    return $container;
                }
                else {
                    // Create the classic 'identity view control'.
                    return TFS_UI_Controls_Identities.IdentityViewControl.getIdentityViewElement(displayText);
                }
            }
        }));

        // Create the team progress control
        teamProgressDataProvider = new TeamGroupedProgressDataProvider(fieldAggregator);
        <GroupedProgressControl>Controls.BaseControl.createIn(GroupedProgressControl, $(".team-capacity-control"), $.extend(progressOptions, {
            dataProvider: teamProgressDataProvider,
            headerText: SprintPlanningResources.Capacity_TeamCapacityGroupName,
            expandOnHoverHandler: attachExpandOnHoverBehaviour,
            renderDisplayContents: false
        }));

        // Create the Activity group if the activity field was provided.
        if (progressOptions.activityFieldName) {
            activityProgressDataProvider = new ActivityGroupedProgressDataProvider(fieldAggregator, progressOptions.activityFieldName);
            <GroupedProgressControl>Controls.BaseControl.createIn(GroupedProgressControl, $(".activity-grouped-progress-control"), $.extend(progressOptions, {
                dataProvider: activityProgressDataProvider,
                headerText: Utils_String.format(SprintPlanningResources.Capacity_By, progressOptions.activityFieldDisplayName),
                dropHandler: attachDroppableBehavior,
                expandOnHoverHandler: attachExpandOnHoverBehaviour,
                renderDisplayContents: false
            }));
        }
        else {
            // Hide the activity group since it will not have any content.
            $(".activity-grouped-progress-control").css("display", "none");
        }
    }

    public _getWorkItemIdsOfRowsToBeUpdated(workItemId: number) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var listOfIds = [];

        //For the sprint backlog, disable/enable the parents of child workItems only
        let dataManager = this._grid.getDataManager();
        if (!dataManager.isRootNode(workItemId)) {
            listOfIds = [dataManager.getRootWorkItemId(workItemId)];
        }

        return listOfIds;
    }

    private _getDraggedWorkItemIds(): number[] {
        return this._grid.getSelectedWorkItemIds();
    }

    private _checkForValidProgressControlDropTarget(workItemIds: number[], fieldName): boolean {

        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertIsNotUndefined(fieldName, "fieldName"); //fieldName is null for the team GroupedProgressControl; the team GroupedProgressControl is not droppable              

        if (fieldName === this._capacityOptions.activityFieldName) {
            // Important: Check if the workItemIds represent only root nodes; only leaf nodes (child workitems) have the activity field, 
            // if we don't have any leaf nodes, it's not a valid drop target.
            let dataManager = this._grid.getDataManager();
            return workItemIds.some(workItemId => !dataManager.isRootNode(workItemId));
        }

        return true;
    }
}

VSS.initClassPrototype(Capacity_Models.GroupValidator, {
    _invalidValidator: null
});

export class GroupedProgressDataProvider {

    public static EVENT_DATA_CHANGED: string = "event-data-changed";
    public static CHANGETYPE_REMOVE: string = "changetype-remove";
    public static CHANGETYPE_UPDATE: string = "changetype-update";

    private _events: Events_Handlers.NamedEventCollection<any, any>;

    /**
     * GroupedProgressDataProvider is an abstract class that represents a data provider for the GroupedProgressControl
     */
    constructor() {

        // Instantiate the event handler list
        this._events = new Events_Handlers.NamedEventCollection();
    }

    /**
     * Gets the initial data for the chart.  The data returned is an array of:
     *   {
     *     id: [ID of the item]
     *     text: [Text to display for the item]
     *     current: [The current progress]
     *     total: [The total available progress]
     *   }
     * 
     * @return The list of data to show in the GroupedProgressControl
     */
    public getData(): IGroupedProgressDataChange[] {

        Diag.Debug.fail("getData must be overridden by derived classes");

        return [];
    }

    /**
     * Register to receive updates when the chart data has changed. The callback will be
     * invoked anytime the capacity information has changed.  The argument provided
     * to the callback has the following format:
     *   {
     *     id: [ID of the item]
     *     text: [Text to display for the item]
     *     current: [The current progress]
     *     total: [The total available progress]
     *   }
     * 
     * @param changeCallback Function to be invoked any time the data changes.
     */
    public registerForChanges(changeCallback: (changeType: string, changeCallback: IGroupedProgressDataChange) => void) {

        Diag.Debug.assertParamIsFunction(changeCallback, "changeCallback");

        this._events.subscribe(GroupedProgressDataProvider.EVENT_DATA_CHANGED, changeCallback);
    }

    /**
     * Notifies all registrants that data has changed
     * 
     * @param changeType Represents the type of change. I.e. Update, Remove
     * @param data The data that changed
     */
    public _$raiseDataChanged(changeType: string, data: IGroupedProgressDataChange) {

        Diag.Debug.assertParamIsString(changeType, "changeType");
        Diag.Debug.assertParamIsObject(data, "data");

        this._events.invokeHandlers(GroupedProgressDataProvider.EVENT_DATA_CHANGED, changeType, data);
    }

    /**
     *     Gets the name of the field that this data provider is grouping upon
     *     Valid field names are required by the dragToProgressControl feature
     *     and are used to identify valid drop zones.
     *     Children of this class that should not be drop targets should return null.
     * 
     * @return The name of the Field that is being grouped upon
     */
    public getGroupFieldName(): string {

        Diag.Debug.fail("getGroupFieldName must be overridden by derived classes");

        return null;
    }
}

VSS.initClassPrototype(GroupedProgressDataProvider, {
    _events: null
});

export class AssignedToGroupedProgressDataProvider extends GroupedProgressDataProvider {

    public static FIELDVALUE_UNASSIGNED: any = "__" + SprintPlanningResources.Capacity_Unassigned;

    private _teamCapacity: Capacity_Models.TeamCapacityModel;
    private _fieldAggregator: FieldAggregator;

    /**
     *     GroupedProgressDataProvider derivation. This data provider is concerned with the Assigned To
     *     allocation & capacity for a team iteration
     * 
     * @param fieldAggregator The field aggregator
     */
    constructor(fieldAggregator: FieldAggregator) {

        super();

        Diag.Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");

        this._initialize(fieldAggregator);
    }

    /**
     *     OVERRIDE:
     *     Gets the name of this GroupedProgressDataProvider
     * 
     * @return The name of the GroupedProgressDataProvider
     */
    public getGroupFieldName(): string {

        return DatabaseCoreFieldRefName.AssignedTo;
    }

    private _teamRemainingWork: any[] = null;
    /**
     * OVERRIDE:
     * Gets the initial data for the chart.  The data returned is an array of:
     *   {
     *     id: [ID of the item]
     *     text: [Text to display for the item]
     *     current: [The current progress]
     *     total: [The total available progress]
     *   }
     * 
     * @return The list of data to show in the GroupedProgressControl
     */
    public getData(): any[] {

        Diag.Debug.assertIsNotNull(this._teamCapacity, "this._teamCapacity must be set prior to retrieving data");

        var data = [];

        var bulkMode = false;

        var teamCapacityModel = <Capacity_Models.TeamCapacityModel>this._teamCapacity;
        bulkMode = teamCapacityModel.isUnderBulkOperation();

        if (bulkMode && this._teamRemainingWork) {
            return this._teamRemainingWork;
        }
        // Unassigned always goes in first position
        this._getUnallocatedRemainingWork(data);

        // Team will always be returned sorted from TeamCapacity
        this._getAllocatedTeamRemainingWork(data);

        // Get the independently sorted unknown AssignedTo data
        data = this._getUnknownCapacity(data);

        this._teamRemainingWork = null;
        if (bulkMode) {
            this._teamRemainingWork = data;
        }
        return data;
    }

    /**
     * Initialize the data provider
     * 
     * @param fieldAggregator The field aggregator
     */
    private _initialize(fieldAggregator: FieldAggregator) {

        Diag.Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");

        this._teamCapacity = Capacity_Models.getService().getCapacityPageModel();
        this._teamCapacity.attachTeamMemberCapacityChanged(delegate(this, this._handleTeamMemberCapacityChanged));
        this._fieldAggregator = fieldAggregator;
        this._fieldAggregator.attachAggregationChanged(DatabaseCoreFieldRefName.AssignedTo, delegate(this, this._handleAggregationChanged));
    }

    /**
     * Get the remaining work for this sprint that is not assigned to anyone and add it to the array
     * 
     * @param data The collection to append the team information to which will be sent to the view control
     */
    private _getUnallocatedRemainingWork(data: any[]) {

        Diag.Debug.assertParamIsObject(data, "data");

        var unallocatedWork = this._fieldAggregator.getAggregatedValue(DatabaseCoreFieldRefName.AssignedTo, Capacity_Models.AggregatedCapacity.UNASSIGNED_USERID);

        if (unallocatedWork > 0) { // If the unallocated work is 0 we dont want to visually represent this
            data.push({
                id: AssignedToGroupedProgressDataProvider.FIELDVALUE_UNASSIGNED,
                text: SprintPlanningResources.Capacity_Unassigned,
                current: unallocatedWork,
                total: 0
            });
        }
    }

    /**
     * Add the capacity / allocation information for each member of the team
     * 
     * @param data The collection to append the team information to which will be sent to the view control
     */
    private _getAllocatedTeamRemainingWork(data: any[]) {

        Diag.Debug.assertParamIsObject(data, "data");

        var i: number, l: number,
            displayName: string,
            uniqueName: string,
            teamMemberCapacity: Capacity_Models.TeamMemberCapacityModel,
            actualRemainingCapacity: number,
            currentAllocation: number,
            teamMemberCapacityCollection = this._teamCapacity.getTeamMemberCapacityCollection();

        for (i = 0, l = teamMemberCapacityCollection.length; i < l; i += 1) {
            teamMemberCapacity = teamMemberCapacityCollection[i];
            displayName = teamMemberCapacity.getTeamMemberDisplayName();
            uniqueName = teamMemberCapacity.uniqueName;

            currentAllocation = this._getAllocatedRemainingWork(displayName);
            actualRemainingCapacity = teamMemberCapacity.getTotalRemainingCapacity();

            // If the user has no capacity or allocation then don't add them
            if (actualRemainingCapacity !== 0 || currentAllocation !== 0) {
                data.push({
                    id: uniqueName,
                    text: displayName,
                    current: currentAllocation,
                    total: (actualRemainingCapacity > 0 ? actualRemainingCapacity : 0)
                });
            }
        }
    }

    /**
     *     Get the capacity information for identities that are not part of the current team but have work items allocated to them that are
     *     associated with the current team iteration.
     * 
     * @param data The collection to append the team information to which will be sent to the view control
     * @return Return sorted array of capacity information for individuals who are not part of the team
     */
    private _getUnknownCapacity(data: any[]): any[] {

        Diag.Debug.assertParamIsObject(data, "data");

        // Get all aggregated data from fieldaggregator
        var aggregatedValues = this._fieldAggregator.getAggregatedValues(DatabaseCoreFieldRefName.AssignedTo),
            currentAllocation,
            assignedTo,
            unknownCapacityData = [];

        // Find the list of field values that are not a team member and are not unassigned & push them into array
        for (assignedTo in aggregatedValues) {
            if (aggregatedValues.hasOwnProperty(assignedTo)) {
                if (!this._teamCapacity.isTeamMember(assignedTo) && assignedTo !== FieldAggregator.EMPTY_VALUE) {
                    currentAllocation = aggregatedValues[assignedTo];

                    // If this identity has 0 allocation then do not add them
                    if (currentAllocation !== 0) {
                        unknownCapacityData.push({
                            id: assignedTo,
                            text: assignedTo,
                            current: currentAllocation,
                            total: 0
                        });
                    }
                }
            }
        }

        // Sort the array by display name
        unknownCapacityData = unknownCapacityData.sort(function (first, second) {
            return Utils_String.localeIgnoreCaseComparer(first.text, second.text);
        });

        return data.concat(unknownCapacityData);
    }

    /**
     * Get the current allocated remaining work assigned to a specific Team Member
     * 
     * @param teamMemberDisplayName A GUID string representing the team member's display name
     * @return The total remaining work assigned to the team member
     */
    private _getAllocatedRemainingWork(teamMemberDisplayName: string): number {

        Diag.Debug.assertParamIsString(teamMemberDisplayName, "teamMemberDisplayName");

        return this._fieldAggregator.getAggregatedValue(DatabaseCoreFieldRefName.AssignedTo, teamMemberDisplayName);
    }

    /**
     * Event handler for when team capacity changes are made
     * 
     * @param teamMemberCapacity The team member capacity information that changed
     */
    private _handleTeamMemberCapacityChanged(teamMemberCapacity: Capacity_Models.TeamMemberCapacityModel) {

        Diag.Debug.assertParamIsObject(teamMemberCapacity, "teamMemberCapacity");

        var displayName = teamMemberCapacity.getTeamMemberDisplayName(),
            uniqueName = teamMemberCapacity.uniqueName,
            actualRemainingCapacity = teamMemberCapacity.getTotalRemainingCapacity(),
            currentAllocation = this._getAllocatedRemainingWork(displayName),
            totalCapacity = (actualRemainingCapacity > 0 ? actualRemainingCapacity : 0),
            changeType = GroupedProgressDataProvider.CHANGETYPE_UPDATE,
            data: IGroupedProgressDataChange = {
                id: uniqueName,
                text: displayName,
                current: currentAllocation,
                total: totalCapacity
            };

        if (currentAllocation === 0 && totalCapacity === 0) {
            changeType = GroupedProgressDataProvider.CHANGETYPE_REMOVE;
        }

        this._$raiseDataChanged(changeType, data);
    }

    /**
     * Handle changes to field aggregation
     * 
     * @param fieldAggregator The field aggregator
     * @param aggregatedData The aggregated data in the following format
     *   {
     *       fieldName: [Name of the field which has changed]
     *       fieldValue: [Value which the aggregation has changed for]
     *       aggregatedValue: [The new aggregated value for the field value]
     *   }
     * 
     */
    private _handleAggregationChanged(fieldAggregator: FieldAggregator, aggregatedData: any) {

        Diag.Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        Diag.Debug.assertParamIsObject(aggregatedData, "aggregatedData");

        var teamMemberCapacity,
            uniqueName,
            total = 0,
            displayName,
            fieldName = aggregatedData.fieldName,
            aggregatedValue,
            actualRemainingCapacity,
            changeType = GroupedProgressDataProvider.CHANGETYPE_UPDATE;

        if (fieldName === DatabaseCoreFieldRefName.AssignedTo) { // Only interested in AssignedTo field
            displayName = aggregatedData.fieldValue;
            aggregatedValue = aggregatedData.aggregatedValue;
            teamMemberCapacity = this._teamCapacity.getTeamMemberCapacity(displayName);

            if (teamMemberCapacity) {
                // This is someone in our team
                actualRemainingCapacity = teamMemberCapacity.getTotalRemainingCapacity();
                uniqueName = teamMemberCapacity.uniqueName;
                total = (actualRemainingCapacity > 0 ? actualRemainingCapacity : actualRemainingCapacity);
            }
            else {
                if (displayName === "") {
                    // This is the special "Unassigned" case
                    displayName = SprintPlanningResources.Capacity_Unassigned;
                    uniqueName = AssignedToGroupedProgressDataProvider.FIELDVALUE_UNASSIGNED;
                }
                else {
                    // This is a real identity that is not a member of the team
                    uniqueName = Capacity_Models.getIdentityUniqueName(displayName);
                }
            }

            // If the total & current are 0 then we want to tell the progress control to remove this entry if it exists.
            if (total === 0 && aggregatedValue === 0) {
                changeType = GroupedProgressDataProvider.CHANGETYPE_REMOVE;
            }

            this._$raiseDataChanged(changeType, {
                id: uniqueName,
                text: displayName,
                current: aggregatedValue,
                total: total
            });
        }
    }
}

VSS.initClassPrototype(AssignedToGroupedProgressDataProvider, {
    _teamCapacity: null,
    _fieldAggregator: null,
    _assignedToGroupName: null,
});

class ActivityGroupedProgressDataProvider extends GroupedProgressDataProvider {

    public static FIELDVALUE_UNASSIGNED: any = "__" + SprintPlanningResources.Capacity_Unassigned;
    public static ACTUAL_ACTIVITY_FIELD_NAME = "ACTUAL-ACTIVITY-NAME";

    private _teamCapacity: Capacity_Models.TeamCapacityModel;
    private _fieldAggregator: FieldAggregator;
    private _activityFieldName: string;

    /**
     *     GroupedProgressDataProvider derivation. This data provider is concerned with the Activity
     *     allocation & capacity for a team iteration
     * 
     * @param fieldAggregator The field aggregator
     * @param activityFieldName Name of the activity field.
     */
    constructor(fieldAggregator: FieldAggregator, activityFieldName: string) {

        super();

        Diag.Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        Diag.Debug.assertParamIsString(activityFieldName, "activityFieldName");

        this._activityFieldName = activityFieldName;
        this._teamCapacity = Capacity_Models.getService().getCapacityPageModel();
        this._teamCapacity.attachActivityCapacityChanged(delegate(this, this._handleActivityCapacityChanged));
        this._teamCapacity.attachTeamMemberDefaultActivityChanged(delegate(this, this._handleTeamMemberDefaultActivityChanged));
        this._fieldAggregator = fieldAggregator;
        this._fieldAggregator.attachAggregationChanged(activityFieldName, delegate(this, this._handleAggregationChanged));
    }

    /**
     * Event handler for when team capacity changes are made
     * 
     * @param teamMemberCapacity The team member capacity information that changed
     */
    private _handleTeamMemberDefaultActivityChanged(teamMemberCapacity: Capacity_Models.TeamMemberCapacityModel) {

        Diag.Debug.assertParamIsObject(teamMemberCapacity, "teamMemberCapacity");

        this._fieldAggregator.updateDefaultActivity(teamMemberCapacity.getTeamMemberDisplayName(), teamMemberCapacity.getDefaultActivity(), this._activityFieldName);
    }

    /**
     *     OVERRIDE:
     *     Gets the name of this GroupedProgressDataProvider
     * 
     * @return The name of the GroupedProgressDataProvider
     */
    public getGroupFieldName(): string {

        return this._activityFieldName;
    }

    /**
     * OVERRIDE:
     * Gets the initial data for the chart.  The data returned is an array of:
     *   {
     *     id: [ID of the item]
     *     text: [Text to display for the item]
     *     current: [The current progress]
     *     total: [The total available progress]
     *   }
     * 
     * @return The list of data to show in the GroupedProgressControl
     */
    public getData(): IGroupedProgressDataChange[] {

        var result: IGroupedProgressDataChange[] = [];

        // Add the data for the unassigned activity.
        var unassignedInfo = this._buildData("");

        if (unassignedInfo.current !== 0 || unassignedInfo.total !== 0) {
            result.push(unassignedInfo);
        }

        // Get the list of activities to display and sort them.
        var activities = this._teamCapacity.getActivityValues()
            .filter(activity => this._shouldDisplay(activity))
            .sort(Utils_String.localeIgnoreCaseComparer)
            .map(activity => this._buildData(activity));

        // Add the item for each activity.
        return result.concat(activities);
    }

    /**
     * Event handler for when activity capacity changes are made
     * 
     * @param args 
     * Arguments for the event of the following structure:
     *   {
     *       activity: [Name of the activity that has changed]
     *       capacity: [Capacity for the activity]
     *   }
     * 
     */
    private _handleActivityCapacityChanged(args?: any) {

        Diag.Debug.assertParamIsObject(args, "args");

        this._raiseDataChangedForActivity(args.activity);
    }

    /**
     * Handle changes to field aggregation
     * 
     * @param fieldAggregator The field aggregator
     * @param aggregatedData The aggregated data in the following format
     *   {
     *       fieldName: [Name of the field which has changed]
     *       fieldValue: [Value which the aggregation has changed for]
     *       aggregatedValue: [The new aggregated value for the field value]
     *   }
     * 
     */
    private _handleAggregationChanged(fieldAggregator: FieldAggregator, aggregatedData: any) {

        Diag.Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        Diag.Debug.assertParamIsObject(aggregatedData, "aggregatedData");

        this._raiseDataChangedForActivity(aggregatedData.fieldValue);
    }

    /**
     * Determines if the capacity information for the provided activity should be displayed.
     * 
     * @param activity Activity to check.
     * @return 
     */
    private _shouldDisplay(activity: string): boolean {

        var current = this._fieldAggregator.getAggregatedValue(this._activityFieldName, activity),
            total = this._teamCapacity.getActivityCapacity(activity),
            result = false;

        if (current !== 0 || total !== 0) {
            // Always display an activity which has work assigned to it or that has capacity.
            result = true;
        }

        return result;
    }

    /**
     * Build the data for an activity.
     * 
     * @param activity Activity to build the data for.
     * @return 
     * Data in the format that the getData and event methods expect.  For details on the object structure see the getData method.
     * 
     */
    private _buildData(activity: string): any {

        var id,
            text,
            current = this._fieldAggregator.getAggregatedValue(this._activityFieldName, activity),
            total = this._teamCapacity.getActivityCapacity(activity);

        // For the special case where activity is empty, use the Unassigned field value and id.
        id = activity || ActivityGroupedProgressDataProvider.FIELDVALUE_UNASSIGNED;
        text = activity || SprintPlanningResources.Capacity_Unassigned;

        return {
            id: id,
            text: text,
            current: current,
            total: total
        };
    }

    /**
     * Raises the data changed event for the provided activity.
     * 
     * @param activity Activity to raise the data changed event for.
     */
    private _raiseDataChangedForActivity(activity: string) {

        var changeType = GroupedProgressDataProvider.CHANGETYPE_UPDATE,
            data = this._buildData(activity);

        // if the activity should not be displayed anymore, set the change type to remove.
        if (!this._shouldDisplay(activity)) {
            changeType = GroupedProgressDataProvider.CHANGETYPE_REMOVE;
        }

        this._$raiseDataChanged(changeType, data);
    }
}

VSS.initClassPrototype(ActivityGroupedProgressDataProvider, {
    _teamCapacity: null,
    _fieldAggregator: null,
    _activityFieldName: null
});

export class TeamGroupedProgressDataProvider extends GroupedProgressDataProvider {

    private _teamCapacity: Capacity_Models.TeamCapacityModel;
    private _fieldAggregator: FieldAggregator;
    private _teamDisplayName: string;

    /**
     *     GroupedProgressDataProvider derivation. This data provider is concerned with the Team's overall
     *     allocation & capacity for a specific iteration
     * 
     * @param fieldAggregator The field aggregator
     */
    constructor(fieldAggregator: FieldAggregator) {

        super();

        Diag.Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");

        this._teamCapacity = Capacity_Models.getService().getCapacityPageModel();
        this._teamCapacity.attachTeamCapacityChanged(delegate(this, this._handleCapacityChanged));

        this._fieldAggregator = fieldAggregator;
        this._fieldAggregator.attachAggregationChanged(DatabaseCoreFieldRefName.AssignedTo, delegate(this, this._handleAggregationChanged));

        this._teamDisplayName = SprintPlanningResources.Capacity_TeamCapacityDisplayName;
    }

    /**
     * Gets the name of this GroupedProgressDataProvider 
     * 
     * @return The name of the GroupedProgressDataProvider
     */
    public getGroupFieldName(): string {

        return null;
    }

    /**
     * OVERRIDE:
     * Gets the initial data for the chart.  The data returned is an array of:
     *   {
     *     id: [ID of the item]
     *     text: [Text to display for the item]
     *     current: [The current progress]
     *     total: [The total available progress]
     *   }
     * 
     * @return The list of data to show in the GroupedProgressControl
     */
    public getData(): IGroupedProgressDataChange[] {

        var data: IGroupedProgressDataChange[] = [];
        var current = this._getAllocatedWork();
        var total = this._teamCapacity.getTotalRemainingCapacity();

        if (current !== 0 || total !== 0) {
            data.push(this._buildDataTuple(current, total));
        }

        return data;
    }

    /**
     * Builds the data tuple to raise data changed event with
     * 
     * @param current The current unit towards progress
     * @param total The total available progress unit
     */
    private _buildDataTuple(current: number, total: number) {
        Diag.Debug.assertParamIsNumber(current, "current");
        Diag.Debug.assertParamIsNumber(total, "total");

        return {
            id: this._teamDisplayName,
            text: this._teamDisplayName,
            current: current,
            total: total
        };
    }

    /**
     * Returns the allocated work for the current iteration
     * 
     * @return 
     */
    private _getAllocatedWork(): number {

        return this._fieldAggregator.getAggregatedValue(DatabaseCoreFieldRefName.AssignedTo, Capacity_Models.AggregatedCapacity.TEAM_USERID);
    }

    /**
     * Handle changes to team capacity
     * 
     * @param teamCapacity The TeamCapacity instance after the capacity changes have been made
     */
    private _handleCapacityChanged(teamCapacity: Capacity_Models.TeamCapacityModel) {
        Diag.Debug.assertParamIsObject(teamCapacity, "teamCapacity");

        var current = this._getAllocatedWork(),
            total = teamCapacity.getTotalRemainingCapacity(),
            changeType = (current !== 0 || total !== 0) ? GroupedProgressDataProvider.CHANGETYPE_UPDATE : GroupedProgressDataProvider.CHANGETYPE_REMOVE;

        this._$raiseDataChanged(changeType, this._buildDataTuple(current, total));
    }

    /**
     * Handle changes to field aggregation
     * 
     * @param fieldAggregator The field aggregator
     * @param aggregatedData The aggregated data in the following format
     *   {
     *       fieldName: [Name of the field which has changed]
     *       fieldValue: [Value which the aggregation has changed for]
     *       aggregatedValue: [The new aggregated value for the field value]
     *   }
     * 
     */
    private _handleAggregationChanged(fieldAggregator: FieldAggregator, aggregatedData: any) {

        Diag.Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        Diag.Debug.assertParamIsObject(aggregatedData, "aggregatedData");

        var current = this._getAllocatedWork(),
            total = this._teamCapacity.getTotalRemainingCapacity(),
            changeType = (current !== 0 || total !== 0) ? GroupedProgressDataProvider.CHANGETYPE_UPDATE : GroupedProgressDataProvider.CHANGETYPE_REMOVE;

        this._$raiseDataChanged(changeType, this._buildDataTuple(current, total));
    }
}

VSS.initClassPrototype(TeamGroupedProgressDataProvider, {
    _teamCapacity: null,
    _fieldAggregator: null,
    _teamDisplayName: null
});

export interface IGroupedProgressControlOptions {
    suffixFormat?: string;
    dataProvider: GroupedProgressDataProvider;
    headerText: string;
    dropHandler?: IEventHandler;
    expandOnHoverHandler: IEventHandler;
    renderDisplayContents: boolean | ((displayText: any) => JQuery);
    fixedTopText?: string;
}

export class GroupedProgressControl extends Controls.BaseControl {

    public static enhancementTypeName: string = "VSS.Agile.SprintPlanning.GroupedProgressControl";

    public static CSSCLASS_GROUP: string = "capacity-pane-progress-group";
    public static CSSCLASS_GROUP_HEADING: string = "capacity-pane-progress-group-heading";
    public static CSSCLASS_GROUP_HEADING_TABLE: string = "capacity-pane-progress-group-heading-table";
    public static CSSCLASS_EXPAND_COLLAPSE_CELL: string = "capacity-pane-progress-expand-collapse-cell";
    public static CSSCLASS_EXPAND_COLLAPSE: string = "capacity-expand-collapse bowtie-icon";
    public static CSSCLASS_EXPAND: string = "bowtie-triangle-left";
    public static CSSCLASS_COLLAPSE: string = "bowtie-triangle-down";
    public static CSSCLASS_GROUPEDPROGRESSCONTROL: string = "grouped-progress-control";
    public static DATA_SORT_LABEL: string = "sort-label";
    public static EVENT_PROGRESS_CONTROL_CREATED: string = "progress-control-created";
    public static EVENT_GROUPED_PROGRESS_CONTROL_HEADER_TABLE_CREATED: string = "grouped-progress-control-header-table-created";
    public static HEADER_TABLE_EXPANSION_DELAY: number = 500;

    private _$container: JQuery;
    private _$internalContainer: JQuery;
    private _$expandCollapse: JQuery;
    private _fixedTopText: string;
    private _dataProvider: GroupedProgressDataProvider;
    private _suffixFormat: string;
    private _maxTotal: number;
    private _controlMap: IDictionaryStringTo<JQuery>;
    private _headerText: string;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _expandFunction: Utils_Core.DelayedFunction;
    private _isExpanded: boolean;
    private _dragDroptoProgressControlHandler: IEventHandler;
    private _headerTableAutoExpansionHandler: IEventHandler;

    /**
     * Instantiate a GroupedProgressControl
     * 
     * @param $container The container to create the control in
     * @param dataProvider The data provider
     * @param options 
     *     {
     *         suffixFormat: "{0} hours"
     *     }
     * 
     */
    constructor(options?: IGroupedProgressControlOptions) {

        super(options);

        Diag.Debug.assertParamIsObject(options, "options");

        this._suffixFormat = options.suffixFormat || "{0}";
        this._dataProvider = options.dataProvider;

        this._fixedTopText = options.fixedTopText;
        this._headerText = options.headerText;
        this._isExpanded = true; // Grouped Progress control is initially expanded

        this._dragDroptoProgressControlHandler = options.dropHandler;
        this._headerTableAutoExpansionHandler = options.expandOnHoverHandler;
    }

    /**
     * Initialize data use by this control
     */
    public initialize() {

        this._$container = this.getElement();

        this._$container.addClass(GroupedProgressControl.CSSCLASS_GROUPEDPROGRESSCONTROL);

        // Register for changes with the data provider
        this._dataProvider.registerForChanges(delegate(this, this._handleDataChanged));

        //Attach behaviour event handlers if they exist                
        if ($.isFunction(this._dragDroptoProgressControlHandler)) {
            this.attachEvent(GroupedProgressControl.EVENT_PROGRESS_CONTROL_CREATED, this._dragDroptoProgressControlHandler);
        }
        //TODO: Review potential move of _headerTableAutoExpansionHandler function out of the groupedProgressControls
        if ($.isFunction(this._headerTableAutoExpansionHandler)) {
            this.attachEvent(GroupedProgressControl.EVENT_GROUPED_PROGRESS_CONTROL_HEADER_TABLE_CREATED, this._headerTableAutoExpansionHandler);
        }

        this._expandFunction = new Utils_Core.DelayedFunction(this,
            GroupedProgressControl.HEADER_TABLE_EXPANSION_DELAY,
            "autoExpandGroupProgressControlHeaders",
            this._toggleExpandedState);

        this._draw();
    }

    public fire(eventName, sender, eventArgs) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    /**
     * Invoke the specified event passing the specified arguments.
     * 
     * @param eventName The event to invoke.
     * @param sender The sender of the event.
     * @param args The arguments to pass through to the specified event.
     */
    public _fireEvent(eventName: string, sender?: any, args?: any) {
        if (this._events) {
            // Invoke handlers until a handler returns false to cancel handler chain.
            var eventBubbleCancelled;
            this._events.invokeHandlers(eventName, sender, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });
            if (eventBubbleCancelled) {
                return false;
            }
        }
    }

    /**
     * Attatch a handler to an event.
     * 
     * @param eventName The event name.
     * @param handler The handler to attach.
     */
    public attachEvent(eventName: string, handler: IEventHandler) {
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    /**
     * Detatch a handler from an event.
     * 
     * @param eventName The event name.
     * @param handler The handler to detach.
     */
    public detachEvent(eventName: string, handler: IEventHandler) {
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    /**
     * Initialize the GroupedProgressControl
     */
    private _draw() {

        var that = this,
            i, l,
            data,       // data retrieved from the data provider
            tuple,      // reference to individual tuple of data used when iterating
            $groupHeaderMessage,
            $headerTable;

        // Draw can be called in the case where max total increases and all data has to be retrieved again, so clear all controls here
        this._$container.empty();

        this._$internalContainer = $("<div/>");
        this._controlMap = {};

        // Ask data provider for initial data
        data = this._dataProvider.getData();

        this._maxTotal = this._calculateMaxTotal(data);

        // Iterate over data, drawing and storing a reference to the control as we go
        for (i = 0, l = data.length; i < l; i += 1) {
            tuple = data[i];

            // Draw the control for this tuple
            this._drawControlForTuple(tuple);
        }

        // Add the group header.
        $groupHeaderMessage = $("<div />")
            .addClass(GroupedProgressControl.CSSCLASS_GROUP_HEADING)
            .text(this._headerText);

        let labelString: string = Utils_String.format(SprintPlanningResources.Capacity_ExpandCollapse_AriaLabel, this._headerText);

        // Add the expand collapse image.
        this._$expandCollapse = $("<div/>")
            .addClass(GroupedProgressControl.CSSCLASS_COLLAPSE)
            .addClass(GroupedProgressControl.CSSCLASS_EXPAND_COLLAPSE)
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-label", labelString)
            .attr("aria-expanded", this._isExpanded.toString())
            .bind("keydown.VSS.Agile",
            function (event) {
                if (event.keyCode === Utils_UI.KeyCode.ENTER) {
                    that._$expandCollapse.click();
                    return false; // Block event propagation
                }
            });

        RichContentTooltip.add(labelString, this._$expandCollapse);

        // Build the heading table containing the title and expand/collapse button.
        $headerTable = $("<table cellpadding='0'/>")
            .addClass(GroupedProgressControl.CSSCLASS_GROUP_HEADING_TABLE)
            .append($("<tr />")
                .append($("<td />")
                    .append($groupHeaderMessage)
                )
                .append($("<td />")
                    .addClass(GroupedProgressControl.CSSCLASS_EXPAND_COLLAPSE_CELL)
                    .append(this._$expandCollapse)
                )
                .bind("click.VSS.Agile",
                function () {
                    // Show/Hide the progress.
                    that._toggleExpandedState();
                })
            );

        this._$container.append($headerTable);

        this._$container.append(this._$internalContainer);

        // Raise this event so that newly-created/updated header tables get enhanced with the expansion behaviour
        this._fireEvent(GroupedProgressControl.EVENT_GROUPED_PROGRESS_CONTROL_HEADER_TABLE_CREATED, this, {
            control: $headerTable,
            onOverCallback: delegate(this, this._headerAutoExpandOverHandler),
            onOutCallBack: delegate(this, this._headerAutoExpandOutHandler)
        });
    }

    /**
     * Handles expansion of the header table when a draggable is dragged over it.
     */
    private _headerAutoExpandOverHandler() {
        if (!this._isExpanded) {
            this._expandFunction.reset();
        }
    }

    /**
     * Handles the out event when a draggable is dragged out of the header table.
     */
    private _headerAutoExpandOutHandler() {
        this._expandFunction.cancel();
    }

    /**
     * Shows/Hides the progress.
     */
    private _toggleExpandedState() {
        var cssClassCollapsed = "collapsed";

        this._isExpanded = !this._isExpanded; //Toggle Expansion state

        // Change the icon if the icon should be different for expanded and collapsed state.
        if (GroupedProgressControl.CSSCLASS_COLLAPSE !== GroupedProgressControl.CSSCLASS_EXPAND) {
            this._$expandCollapse.toggleClass(GroupedProgressControl.CSSCLASS_COLLAPSE, this._isExpanded);
            this._$expandCollapse.toggleClass(GroupedProgressControl.CSSCLASS_EXPAND, !this._isExpanded);
            this._$expandCollapse.attr("aria-expanded", this._isExpanded.toString());
        }

        // Show/Hide all of the progress controls.
        this._$internalContainer.toggle(this._isExpanded);

        this._$container.toggleClass(cssClassCollapsed, !this._isExpanded); //If expanded, remove cssCollapsed style                
    }

    /**
     * Calculates the maximum total that will be passed to the ProgressControl
     * 
     * @param data The information retrieved from the data provider
     * @return 
     */
    private _calculateMaxTotal(data: any): number {

        Diag.Debug.assertParamIsArray(data, "data");

        var i, l,
            maxTotal = 0,
            tuple;

        for (i = 0, l = data.length; i < l; i += 1) {
            tuple = data[i];
            maxTotal = Math.max(Math.max(tuple.total, tuple.current), maxTotal);
        }

        return maxTotal;
    }

    /**
     * Add the control to the container
     * 
     * @param $control The control to add
     * @param key The key to use in the controlMap for storing a reference to the control
     */
    private _addControl($control: JQuery, key: string) {

        Diag.Debug.assertParamIsObject($control, "$control");
        Diag.Debug.assertParamIsString(key, "key");

        var labelToInsert = $control.data(GroupedProgressControl.DATA_SORT_LABEL),
            $insertionControl,
            insertAfter = true,
            $progressControls = $("." + GroupedProgressControlConstants.CSSCLASS_PROGRESS_CONTROL, this._$internalContainer),
            fixedTopText = this._fixedTopText;

        if ($progressControls.length === 0 || labelToInsert === this._fixedTopText) {
            this._$internalContainer.prepend($control);
        }
        else {
            $progressControls.each(function (i, element) {
                var label;

                $insertionControl = $(element);
                label = $insertionControl.data(GroupedProgressControl.DATA_SORT_LABEL);
                if (label === undefined || (fixedTopText !== label && Utils_String.localeComparer(labelToInsert, label) < 0)) {
                    //if (label === undefined || (fixedTopText !== label && labelToInsert < label)) {
                    insertAfter = false;
                    return false;
                }
            });

            if (insertAfter) {
                $control.insertAfter($insertionControl);
            }
            else {
                $control.insertBefore($insertionControl);
            }
        }

        // Update the control map with <id, control> key value pair
        this._controlMap[key] = $control;
    }

    /**
     * Replaces a control with a new one
     * 
     * @param $control The new control that we want to replace the old one with
     * @param key The key to replace in the control map
     */
    private _replaceControl($control: JQuery, key: string) {

        Diag.Debug.assertParamIsObject($control, "$control");
        Diag.Debug.assertParamIsString(key, "key");

        this._controlMap[key].replaceWith($control);
        this._controlMap[key] = $control;
    }

    /**
     * Inserts control, handling insertion or replacement as needed
     * 
     * @param $control The new control that we want to replace the old one with
     * @param key The key to replace in the control map
     */
    private _insertControl($control: JQuery, key: string) {

        Diag.Debug.assertParamIsObject($control, "$control");
        Diag.Debug.assertParamIsString(key, "key");

        if (key in this._controlMap) {
            this._replaceControl($control, key);
        }
        else {
            this._addControl($control, key);
        }
    }

    /**
     * Draw the control for a tuple
     * 
     * @param tuple 
     *     The tuple data to be used when creating the control
     *     {
     *         id: the unique identifier for this tuple
     *         text: The display text
     *         total: the total available progress
     *         current: the current progress
     *     }
     * 
     */
    private _drawControlForTuple(tuple: any) {

        Diag.Debug.assertParamIsObject(tuple, "tuple");

        var control = this._drawControl(tuple.text, tuple.current, tuple.total),
            fieldName = this._dataProvider.getGroupFieldName(),
            text = tuple.text;

        this._insertControl(control.getElement(), tuple.id);

        if (text === SprintPlanningResources.Capacity_Unassigned) {
            //This is the unassigned progress control so text is supposed to be an empty string
            text = "";
        }

        // Raise this event so that newly-created/updated progress controls get enhanced with the droppable behaviour
        this._fireEvent(GroupedProgressControl.EVENT_PROGRESS_CONTROL_CREATED, this, {
            control: control,
            value: text,
            fieldName: fieldName
        });
    }

    /**
     * Removes the control associated with the tuple
     * 
     * @param tuple 
     *     The tuple data to be used when creating the control
     *     {
     *         id: the unique identifier for this tuple
     *         text: The display text
     *         total: the total available progress
     *         current: the current progress
     *     }
     * 
     */
    private _removeTuple(tuple: any) {

        Diag.Debug.assertParamIsObject(tuple, "tuple");

        var id = tuple.id;

        if (id in this._controlMap) {
            // Remove control from DOM
            this._controlMap[id].remove();

            // Delete control from the control lookup
            delete this._controlMap[id];
        }
    }

    /**
     * Draw an individual progress control
     * 
     * @param text Text to display
     * @param current Current progress
     * @param total Total available progress for this tuple
     * @return The created progressControl 
     */
    private _drawControl(text: string, current: number, total: number): TFS_ProgressControl.ProgressControl {

        Diag.Debug.assertParamIsString(text, "text");
        Diag.Debug.assertParamIsNumber(current, "current");
        Diag.Debug.assertParamIsNumber(total, "total");

        var $container = $("<div/>").addClass(GroupedProgressControlConstants.CSSCLASS_PROGRESS_CONTROL);

        // Add the text as the sort label for alphabetical ordering
        $container.data(GroupedProgressControl.DATA_SORT_LABEL, text);

        var control = <TFS_ProgressControl.ProgressControl>Controls.Enhancement.enhance(TFS_ProgressControl.ProgressControl, $container, {
            current: current,
            total: total,
            maxTotal: this._maxTotal,
            text: text,
            suffixFormat: this._suffixFormat,
            renderDisplayContents: this._options.renderDisplayContents
        });

        return control;
    }

    /**
     * Event handler for when data provider notifies of changes that require redrawing of a single tuple
     * 
     * @param changeType Represents the type of change. I.e. Update, Remove
     * @param data 
     *     The information about the tuple that changed and needs to be redrawn
     *     {
     *         id: [ID of the item]
     *         text: [Text to display for the item]
     *         current: [The current progress]
     *         total: [The total available progress]
     *     }
     * 
     */
    private _handleDataChanged(changeType: string, data: IGroupedProgressDataChange) {

        Diag.Debug.assertParamIsString(changeType, "changeType");
        Diag.Debug.assertParamIsObject(data, "data");

        var maxTotal = this._maxTotal;

        switch (changeType) {
            case GroupedProgressDataProvider.CHANGETYPE_UPDATE:
                // If maxTotal increased then we have to redraw everything
                if (data.total > maxTotal || data.current > maxTotal) {
                    this._maxTotal = Math.max(data.total, data.current);
                    this._draw();
                }
                else {
                    this._maxTotal = this._calculateMaxTotal(this._dataProvider.getData());

                    // If the max total decreased then we have to redraw everything
                    if (this._maxTotal !== maxTotal) {
                        this._draw();
                    }
                    else {
                        this._drawControlForTuple(data);
                    }
                }
                break;
            case GroupedProgressDataProvider.CHANGETYPE_REMOVE:
                this._removeTuple(data);

                this._maxTotal = this._calculateMaxTotal(this._dataProvider.getData());

                // Anytime we remove and the maxTotal changes we need to redraw everything
                if (this._maxTotal !== maxTotal) {
                    this._draw();
                }

                break;
            default:
                Diag.Debug.fail("Unknown changeType provided to _handleDataChanged");
                break;
        }

        Diag.logTracePoint("CapacityPane.update.complete");
    }
}

VSS.initClassPrototype(GroupedProgressControl, {
    _$container: null,
    _$internalContainer: null,
    _$expandCollapse: null,
    _fixedTopText: null,
    _dataProvider: null,
    _suffixFormat: null,
    _maxTotal: null,
    _controlMap: null,
    _headerText: null,
    _events: null,
    _expandFunction: null,
    _isExpanded: false,
    _dragDroptoProgressControlHandler: null,
    _headerTableAutoExpansionHandler: null,
    _headerTableAutoExpandTimeoutID: null
});

export interface IGroupedProgressDataChange {
    id: string;
    text: string;
    current: number;
    total: number;
}
