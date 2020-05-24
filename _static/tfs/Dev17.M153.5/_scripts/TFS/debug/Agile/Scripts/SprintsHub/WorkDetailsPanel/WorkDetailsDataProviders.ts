/// <reference types="jquery" />
import {
    AggregatedCapacity,
    getIdentityUniqueName,
    IAggregateActivityCapacity,
    TeamCapacityModel,
    TeamMemberCapacityModel
} from "Agile/Scripts/Capacity/CapacityModels";
import { FieldAggregator } from "Agile/Scripts/Capacity/FieldAggregator";
import { DatabaseCoreFieldRefName } from "Agile/Scripts/Common/Utils";
import { Iteration } from "Agile/Scripts/Models/Iteration/Iteration";
import * as WorkDetailsPanelResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.WorkDetailsPanel";
import { CapacityActions } from "Agile/Scripts/SprintsHub/Capacity/ActionsCreator/CapacityActions";
import * as Contracts from "Agile/Scripts/SprintsHub/Capacity/CapacityContracts";
import * as Work_Contracts from "TFS/Work/Contracts";
import { Debug } from "VSS/Diag";
import { NamedEventCollection } from "VSS/Events/Handlers";
import { empty, localeIgnoreCaseComparer } from "VSS/Utils/String";

const AssignedToRefName = DatabaseCoreFieldRefName.AssignedTo;

export interface IGroupedProgressDataChange {
    id: string;
    text: string;
    current: number;
    total: number;
}

export abstract class GroupedProgressDataProvider {

    public static EVENT_DATA_CHANGED: string = "event-data-changed";
    public static CHANGETYPE_REMOVE: string = "changetype-remove";
    public static CHANGETYPE_UPDATE: string = "changetype-update";

    private _events: NamedEventCollection<any, any>;
    private _groupDisplayName: string = empty;
    private _aggregationChangedFieldRefName: string;
    private _isDisposed: boolean;

    protected _teamCapacity: TeamCapacityModel;
    protected _fieldAggregator: FieldAggregator;
    protected _capacityActions: CapacityActions;

    /**
     * Class constructor.
     * @param teamCapacity Team capacity model.
     * @param groupDisplayName Display name for this group.
     * @param fieldAggregator The field aggregator whose aggregation changes will cause changes in this provider.
     * @param aggregationChangedFieldRefName Field to track for aggregation changes in the field aggregator.
     * @param capacityActions Optional. The CapacityActions instance to use for reacting to team capacity changes.
     */
    constructor(
        teamCapacity: TeamCapacityModel,
        groupDisplayName: string,
        fieldAggregator: FieldAggregator,
        aggregationChangedFieldRefName: string,
        capacityActions?: CapacityActions) {

        Debug.assertParamIsObject(teamCapacity, "GroupedProgressDataProvider - teamCapacity cannot be null/undefined");
        Debug.assertIsNotNull(groupDisplayName, "groupDisplayName");
        Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        Debug.assertIsNotNull(aggregationChangedFieldRefName, "aggregationChangedFieldRefName");

        // Instantiate the event handler list
        this._events = new NamedEventCollection();
        this._teamCapacity = teamCapacity;
        this._groupDisplayName = groupDisplayName;
        this._fieldAggregator = fieldAggregator;
        this._aggregationChangedFieldRefName = aggregationChangedFieldRefName;
        this._capacityActions = capacityActions;
        this._isDisposed = false;
    }

    public get disposed(): boolean {
        return this._isDisposed;
    }

    /**
     * Disposes of the resources used by this class.
     */
    public dispose(): void {
        if (this._events) {
            this._events.unsubscribeAll();
            this._events = null;
        }

        if (this._fieldAggregator) {
            this._fieldAggregator.detachAgregationChanged(
                this._aggregationChangedFieldRefName,
                this.__handleAggregationChangedHandler);
        }

        if (this._capacityActions) {
            this.removeCapacityActionsListeners();
        }

        if (this._teamCapacity) {
            this.unsubscribeFromTeamCapacityModelChanges();
        }

        this._isDisposed = true;
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
    public abstract getData(): IGroupedProgressDataChange[];

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

        Debug.assertParamIsFunction(changeCallback, "changeCallback");

        this._events.subscribe(GroupedProgressDataProvider.EVENT_DATA_CHANGED, changeCallback);
    }

    /**
     * Notifies all registrants that data has changed
     * @param changeType Represents the type of change. I.e. Update, Remove
     * @param data The data that changed
     */
    public _$raiseDataChanged(changeType: string, data: IGroupedProgressDataChange) {

        Debug.assertParamIsString(changeType, "changeType");
        Debug.assertParamIsObject(data, "data");

        this._events.invokeHandlers(GroupedProgressDataProvider.EVENT_DATA_CHANGED, changeType, data);
    }

    /**
     * Gets the name of the field that this data provider is grouping upon
     * Valid field names are required by the dragToProgressControl feature
     * and are used to identify valid drop zones.
     * Children of this class that should not be drop targets should return null.
     * @return The name of the Field that is being grouped upon
     */
    public abstract getGroupFieldName(): string;

    /**
     * Gets the display name for this group
     */
    public getGroupDisplayName(): string {
        return this._groupDisplayName;
    }

    /**
     * Initializes the provider by adding itselft as listener of capacity actions (if provided),
     * and by subscribing to aggregation changes in the field aggregator.
     */
    protected initialize(): void {
        if (this._capacityActions) {
            this.addCapacityActionsListeners();
        }

        this._fieldAggregator.attachAggregationChanged(
            this._aggregationChangedFieldRefName,
            this.__handleAggregationChangedHandler);

        this.subscribeToTeamCapacityModelChanges();
    }

    /**
     * Adds listeners to capacity actions of interest. Called when instance is initialized.
     */
    protected abstract addCapacityActionsListeners(): void;

    /**
     * Remove listeners from capacity actions. Called when instance is disposed.
     */
    protected abstract removeCapacityActionsListeners(): void;

    /**
     * Subscribes to changes of interest in the team capacity model.
     */
    protected abstract subscribeToTeamCapacityModelChanges(): void;

    protected abstract unsubscribeFromTeamCapacityModelChanges(): void;

    /**
     * Handle changes to field aggregation.
     * @param fieldAggregator Field aggregator instance.
     * @param aggregatedData The aggregated data in the following format
     *   {
     *       fieldName: [Name of the field which has changed]
     *       fieldValue: [Value which the aggregation has changed for]
     *       aggregatedValue: [The new aggregated value for the field value]
     *   }
     */
    protected abstract handleAggregationChanged(fieldAggregator: FieldAggregator, aggregatedData: any): void;

    private __handleAggregationChangedHandler = (fieldAggregator: FieldAggregator, aggregatedData: any): void => {
        this.handleAggregationChanged(fieldAggregator, aggregatedData);
    }
}

export class AssignedToGroupDataProvider extends GroupedProgressDataProvider {

    public static FIELDVALUE_UNASSIGNED: string = `__${WorkDetailsPanelResources.Capacity_Unassigned}`;

    /**
     * GroupedProgressDataProvider derivation. This data provider is concerned with the Assigned To
     * allocation & capacity for a team iteration
     * @param fieldAggregator The field aggregator
     * @param teamCapacity The team capacity model.
     * @param groupDisplayName The group display name.
     * @param capacityActions Optional. The CapacityActions instance to use for reacting to team capacity changes.
     */
    constructor(
        fieldAggregator: FieldAggregator,
        teamCapacity: TeamCapacityModel,
        groupDisplayName: string,
        capacityActions?: CapacityActions) {

        super(teamCapacity, groupDisplayName, fieldAggregator, AssignedToRefName, capacityActions);
        this.initialize();
    }

    /**
     * OVERRIDE:
     * Gets the name of this GroupedProgressDataProvider
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
    public getData(): IGroupedProgressDataChange[] {

        Debug.assertIsNotNull(this._teamCapacity, "this._teamCapacity must be set prior to retrieving data");

        let data = [];

        let bulkMode = false;

        const teamCapacityModel = <TeamCapacityModel>this._teamCapacity;
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
     * Subscribes to changes of interest in the team capacity model.
     */
    protected subscribeToTeamCapacityModelChanges(): void {
        this._teamCapacity.attachTeamMemberCapacityChanged(this._handleTeamMemberCapacityChanged);
    }

    protected unsubscribeFromTeamCapacityModelChanges(): void {
        this._teamCapacity._removeTeamMemberCapacityChanged(this._handleTeamMemberCapacityChanged);
    }
    /**
     * Adds listeners to capacity actions of interest. Called when instance is initialized.
     */
    protected addCapacityActionsListeners(): void {
        if (this._capacityActions) {
            this._capacityActions.updateActivity.addListener(this._handleUpdateActivity);
            this._capacityActions.updateUserDaysOff.addListener(this._handleTeamMemberUserDaysOffChanged);
        }
    }

    /**
     * Remove listeners from capacity actions. Called when instance is disposed.
     */
    protected removeCapacityActionsListeners(): void {
        if (this._capacityActions) {
            this._capacityActions.updateActivity.removeListener(this._handleUpdateActivity);
            this._capacityActions.updateUserDaysOff.removeListener(this._handleTeamMemberUserDaysOffChanged);
        }
    }

    /**
     * Handle changes to field aggregation
     * @param fieldAggregator The field aggregator
     * @param aggregatedData The aggregated data in the following format
     *   {
     *       fieldName: [Name of the field which has changed]
     *       fieldValue: [Value which the aggregation has changed for]
     *       aggregatedValue: [The new aggregated value for the field value]
     *   }
     */
    protected handleAggregationChanged(fieldAggregator: FieldAggregator, aggregatedData: any): void {

        Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        Debug.assertParamIsObject(aggregatedData, "aggregatedData");

        let changeType = GroupedProgressDataProvider.CHANGETYPE_UPDATE;
        if (aggregatedData.fieldName === AssignedToRefName) { // Only interested in AssignedTo field
            let total = 0;
            let uniqueName = empty;
            let displayName = aggregatedData.fieldValue;
            const aggregatedValue = aggregatedData.aggregatedValue;
            const teamMemberCapacity = this._teamCapacity.getTeamMemberCapacity(displayName);

            if (teamMemberCapacity) {
                // This is someone in our team
                const actualRemainingCapacity = teamMemberCapacity.getTotalRemainingCapacity();
                uniqueName = teamMemberCapacity.uniqueName;
                total = (actualRemainingCapacity > 0 ? actualRemainingCapacity : actualRemainingCapacity);
            } else {
                if (displayName === "") {
                    // This is the special "Unassigned" case
                    displayName = WorkDetailsPanelResources.Capacity_Unassigned;
                    uniqueName = AssignedToGroupDataProvider.FIELDVALUE_UNASSIGNED;
                } else {
                    // This is a real identity that is not a member of the team
                    uniqueName = getIdentityUniqueName(displayName);
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

    /**
     * Get the remaining work for this sprint that is not assigned to anyone and add it to the array
     * @param data The collection to append the team information to which will be sent to the view control
     */
    private _getUnallocatedRemainingWork(data: IGroupedProgressDataChange[]) {

        Debug.assertParamIsObject(data, "data");

        const unallocatedWork = this._fieldAggregator.getAggregatedValue(AssignedToRefName, AggregatedCapacity.UNASSIGNED_USERID);

        if (unallocatedWork > 0) { // If the unallocated work is 0 we dont want to visually represent this
            data.push({
                id: AssignedToGroupDataProvider.FIELDVALUE_UNASSIGNED,
                text: WorkDetailsPanelResources.Capacity_Unassigned,
                current: unallocatedWork,
                total: 0
            });
        }
    }

    /**
     * Add the capacity / allocation information for each member of the team
     * @param data The collection to append the team information to which will be sent to the view control
     */
    private _getAllocatedTeamRemainingWork(data: IGroupedProgressDataChange[]) {
        Debug.assertParamIsObject(data, "data");

        const teamMemberCapacityCollection = this._teamCapacity.getTeamMemberCapacityCollection() || [];
        for (const teamMemberCapacity of teamMemberCapacityCollection) {
            const displayName = teamMemberCapacity.getTeamMemberDisplayName();
            const uniqueName = teamMemberCapacity.uniqueName;

            const currentAllocation = this._getAllocatedRemainingWork(displayName);
            const actualRemainingCapacity = teamMemberCapacity.getTotalRemainingCapacity();

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
     * Get the capacity information for identities that are not part of the current team but have work items allocated to them that are
     * associated with the current team iteration.
     * @param data The collection to append the team information to which will be sent to the view control
     * @return Return sorted array of capacity information for individuals who are not part of the team
     */
    private _getUnknownCapacity(data: IGroupedProgressDataChange[]): IGroupedProgressDataChange[] {
        Debug.assertParamIsObject(data, "data");

        // Get all aggregated data from fieldaggregator
        const aggregatedValues = this._fieldAggregator.getAggregatedValues(AssignedToRefName);

        // Find the list of field values that are not a team member and are not unassigned & push them into array
        let unknownCapacityData = [];
        for (const assignedTo in aggregatedValues) {
            if (aggregatedValues.hasOwnProperty(assignedTo)) {
                if (!this._teamCapacity.isTeamMember(assignedTo) && assignedTo !== FieldAggregator.EMPTY_VALUE) {
                    const currentAllocation = aggregatedValues[assignedTo];

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
        unknownCapacityData = unknownCapacityData.sort((f, s) => localeIgnoreCaseComparer(f.text, s.text));

        return data.concat(unknownCapacityData);
    }

    /**
     * Get the current allocated remaining work assigned to a specific Team Member
     * @param teamMemberDisplayName A GUID string representing the team member's display name
     * @return The total remaining work assigned to the team member
     */
    private _getAllocatedRemainingWork(teamMemberDisplayName: string): number {

        Debug.assertParamIsString(teamMemberDisplayName, "teamMemberDisplayName");

        return this._fieldAggregator.getAggregatedValue(AssignedToRefName, teamMemberDisplayName);
    }

    /**
     * Handler for when a team member's activity is updated.
     * @param payload The update activity event payload.
     */
    private _handleUpdateActivity = (payload: Contracts.IUpdateActivityPayload) => {
        Debug.assertParamIsObject(payload, "payload");

        const displayName = payload.user.displayName;
        const uniqueName = payload.user.uniqueName;
        const currentTeamMemberCapacity = this._teamCapacity.getTeamMemberCapacity(displayName);

        const currentTeamMemberActivity = currentTeamMemberCapacity.getActivityByIndex(payload.index);
        if (currentTeamMemberActivity) {
            currentTeamMemberActivity.capacityPerDayString(payload.activity.capacityPerDay.toString());
        }

        this.raiseDataChanged(displayName, uniqueName, currentTeamMemberCapacity);
    }

    /**
     * Event handler for when team capacity changes are made
     * @param teamMemberCapacity The team member capacity information that changed
     */
    private _handleTeamMemberCapacityChanged = (teamMemberCapacity: TeamMemberCapacityModel) => {
        Debug.assertParamIsObject(teamMemberCapacity, "teamMemberCapacity");

        const displayName = teamMemberCapacity.getTeamMemberDisplayName();
        const uniqueName = teamMemberCapacity.uniqueName;
        this.raiseDataChanged(displayName, uniqueName, teamMemberCapacity);
    }

    /**
     * Handler for when a team member's days off are updated.
     * @param userDaysOff Payload for updating a team member's days off.
     */
    private _handleTeamMemberUserDaysOffChanged = (userDaysOff: Contracts.IUpdateUserDaysOffPayload) => {
        Debug.assertParamIsObject(userDaysOff, "userDaysOff");

        const displayName = userDaysOff.user.displayName;
        const uniqueName = userDaysOff.user.uniqueName;
        const currentTeamMemberCapacity = this._teamCapacity.getTeamMemberCapacity(displayName);
        const userDaysoffDateRange = getAsDateRangeArray(userDaysOff.daysOff);

        currentTeamMemberCapacity.daysOff(userDaysoffDateRange);

        this.raiseDataChanged(displayName, uniqueName, currentTeamMemberCapacity);
    }

    /**
     * Raises an event signaling team member's capacity data has changed.
     * @param displayName Display name for the team member.
     * @param uniqueName Unique name for the team member.
     * @param teamMemberCapacity Model for the team member's capacity.
     */
    private raiseDataChanged(
        displayName: string,
        uniqueName: string,
        teamMemberCapacity: TeamMemberCapacityModel): void {

        const currentAllocation = this._getAllocatedRemainingWork(displayName);
        const actualRemainingCapacity = teamMemberCapacity.getTotalRemainingCapacity();
        const totalCapacity = (actualRemainingCapacity > 0 ? actualRemainingCapacity : 0);

        const data: IGroupedProgressDataChange = {
            id: uniqueName,
            text: displayName,
            current: currentAllocation,
            total: totalCapacity
        };

        if (currentAllocation === 0 && totalCapacity === 0) {
            this._$raiseDataChanged(GroupedProgressDataProvider.CHANGETYPE_REMOVE, data);
        } else {
            this._$raiseDataChanged(GroupedProgressDataProvider.CHANGETYPE_UPDATE, data);
        }
    }
}

export class ActivityGroupDataProvider extends GroupedProgressDataProvider {

    public static FIELDVALUE_UNASSIGNED: string = `__${WorkDetailsPanelResources.Capacity_Unassigned}`;

    private _activityFieldName: string;

    /**
     * GroupedProgressDataProvider derivation. This data provider is concerned with the Activity
     * allocation & capacity for a team iteration
     * @param fieldAggregator The field aggregator
     * @param activityFieldName Name of the activity field.
     * @param activityFieldDisplayName Activity field's display name.
     * @param teamCapacity The team capacity model.
     * @param capacityActions Optional. The CapacityActions instance to use for reacting to team capacity changes.
     */
    constructor(
        fieldAggregator: FieldAggregator,
        activityFieldName: string,
        activityDisplayName: string,
        teamCapacity: TeamCapacityModel,
        capacityActions?: CapacityActions) {

        super(teamCapacity, activityDisplayName, fieldAggregator, activityFieldName, capacityActions);
        this.initialize();

        Debug.assertParamIsString(activityFieldName, "activityFieldName cannot be null/undefined");
        this._activityFieldName = activityFieldName;
    }

    /**
     * OVERRIDE:
     * Gets the name of this GroupedProgressDataProvider
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
     * @return The list of data to show in the GroupedProgressControl
     */
    public getData(): IGroupedProgressDataChange[] {

        const result: IGroupedProgressDataChange[] = [];

        // Add the data for the unassigned activity.
        const unassignedInfo = this._buildData("");

        if (unassignedInfo.current !== 0 || unassignedInfo.total !== 0) {
            result.push(unassignedInfo);
        }

        // Get the list of activities to display and sort them.
        const activities = this._teamCapacity.getActivityValues()
            .filter(activity => this._shouldDisplay(activity))
            .sort(localeIgnoreCaseComparer)
            .map(activity => this._buildData(activity));

        // Add the item for each activity.
        return result.concat(activities);
    }

    /**
     * Subscribes to changes of interest in the team capacity model.
     */
    protected subscribeToTeamCapacityModelChanges(): void {
        this._teamCapacity.attachActivityCapacityChanged(this._handleActivityCapacityChanged);
        this._teamCapacity.attachTeamMemberDefaultActivityChanged(this._handleTeamMemberDefaultActivityChanged);
    }

    protected unsubscribeFromTeamCapacityModelChanges(): void {
        this._teamCapacity._removeActivityCapacityChanged(this._handleActivityCapacityChanged);
        this._teamCapacity.removeTeamMemberDefaultActivityChanged(this._handleTeamMemberDefaultActivityChanged);
    }

    /**
     * Adds listeners to capacity actions of interest. Called when instance is initialized.
     */
    protected addCapacityActionsListeners(): void {
        this._capacityActions.insertEmptyActivity.addListener(this._handleInsertEmptyActivity);
        this._capacityActions.updateActivity.addListener(this._handleUpdateActivity);
        this._capacityActions.removeActivity.addListener(this._handleRemoveActivity);
    }

    /**
     * Remove listeners from capacity actions. Called when instance is disposed.
     */
    protected removeCapacityActionsListeners(): void {
        this._capacityActions.insertEmptyActivity.removeListener(this._handleInsertEmptyActivity);
        this._capacityActions.updateActivity.removeListener(this._handleUpdateActivity);
        this._capacityActions.removeActivity.removeListener(this._handleRemoveActivity);
    }

    /**
     * Handle changes to field aggregation
     * @param fieldAggregator The field aggregator
     * @param aggregatedData The aggregated data in the following format
     *   {
     *       fieldName: [Name of the field which has changed]
     *       fieldValue: [Value which the aggregation has changed for]
     *       aggregatedValue: [The new aggregated value for the field value]
     *   }
     */
    protected handleAggregationChanged(fieldAggregator: FieldAggregator, aggregatedData: any): void {

        Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        Debug.assertParamIsObject(aggregatedData, "aggregatedData");

        this._raiseDataChangedForActivity(aggregatedData.fieldValue);
    }

    /**
     * Event handler for when team capacity changes are made
     * @param teamMemberCapacity The team member capacity information that changed
     */
    private _handleTeamMemberDefaultActivityChanged = (teamMemberCapacity: TeamMemberCapacityModel) => {

        Debug.assertParamIsObject(teamMemberCapacity, "teamMemberCapacity");

        this._fieldAggregator.updateDefaultActivity(teamMemberCapacity.getTeamMemberDisplayName(), teamMemberCapacity.getDefaultActivity(), this._activityFieldName);
    }

    /**
     * Handler for when an empty activity is added to a team member.
     * @param payload Payload for inserting an empty activity.
     */
    private _handleInsertEmptyActivity = (payload: Contracts.IAddRemoveActivityPayload): void => {
        const teamMemberCapacity = this._teamCapacity.getTeamMemberCapacity(payload.user.displayName);
        teamMemberCapacity.activities.splice(payload.index, 0, teamMemberCapacity.newEmptyActivity());
    }

    /**
     * Handler for when an activity is removed from a team member.
     * @param payload Payload for removing an activity.
     */
    private _handleRemoveActivity = (payload: Contracts.IAddRemoveActivityPayload): void => {
        const teamMemberCapacity = this._teamCapacity.getTeamMemberCapacity(payload.user.displayName);
        const activityModel = teamMemberCapacity.getActivityByIndex(payload.index);

        if (activityModel) {
            teamMemberCapacity.activities.remove(activityModel);
        }
    }

    /**
     * Handler for when an activity's name is updated.
     * @param payload Payload for updating an activity.
     */
    private _handleUpdateActivity = (payload: Contracts.IUpdateActivityPayload): void => {
        const teamMemberCapacity = this._teamCapacity.getTeamMemberCapacity(payload.user.displayName);
        const activityModel = teamMemberCapacity.getActivityByIndex(payload.index);

        if (activityModel) {
            activityModel.name(payload.activity.name);
            this._raiseDataChangedForActivity(payload.activity.name);
        }
    }

    /**
     * Event handler for when activity capacity changes are made
     * @param args
     * Arguments for the event of the following structure:
     *   {
     *       activity: [Name of the activity that has changed]
     *       capacity: [Capacity for the activity]
     *   }
     */
    private _handleActivityCapacityChanged = (args?: IAggregateActivityCapacity) => {

        Debug.assertParamIsObject(args, "args");

        this._raiseDataChangedForActivity(args.activity);
    }

    /**
     * Determines if the capacity information for the provided activity should be displayed.
     * @param activity Activity to check.
     */
    private _shouldDisplay(activity: string): boolean {
        const current = this._fieldAggregator.getAggregatedValue(this._activityFieldName, activity);
        const total = this._teamCapacity.getActivityCapacity(activity);
        return (!!current || !!total); // Always display an activity which has work assigned to it or that has capacity.
    }

    /**
     * Build the data for an activity.
     * @param activity Activity to build the data for.
     * Data in the format that the getData and event methods expect.  For details on the object structure see the getData method.
     */
    private _buildData(activity: string): IGroupedProgressDataChange {
        const current = this._fieldAggregator.getAggregatedValue(this._activityFieldName, activity);
        const total = this._teamCapacity.getActivityCapacity(activity);

        // For the special case where activity is empty, use the Unassigned field value and id.
        const id = activity || ActivityGroupDataProvider.FIELDVALUE_UNASSIGNED;
        const text = activity || WorkDetailsPanelResources.Capacity_Unassigned;

        return {
            id: id,
            text: text,
            current: current,
            total: total
        };
    }

    /**
     * Raises the data changed event for the provided activity.
     * @param activity Activity to raise the data changed event for.
     */
    private _raiseDataChangedForActivity(activity: string) {
        const data = this._buildData(activity);

        // if the activity should not be displayed anymore, set the change type to remove.
        if (!this._shouldDisplay(activity)) {
            this._$raiseDataChanged(GroupedProgressDataProvider.CHANGETYPE_REMOVE, data);
        } else {
            this._$raiseDataChanged(GroupedProgressDataProvider.CHANGETYPE_UPDATE, data);
        }
    }
}

export class TeamGroupDataProvider extends GroupedProgressDataProvider {
    private _teamDisplayName: string;

    /**
     * GroupedProgressDataProvider derivation. This data provider is concerned with the Team's overall
     * allocation & capacity for a specific iteration
     * @param fieldAggregator The field aggregator
     * @param teamCapacity The team capacity model.
     * @param capacityActions Optional. The CapacityActions instance to use for reacting to team capacity changes.
     */
    constructor(
        fieldAggregator: FieldAggregator,
        teamCapacity: TeamCapacityModel,
        capacityActions?: CapacityActions) {

        super(teamCapacity, WorkDetailsPanelResources.SectionTitle_TeamCapacity, fieldAggregator, AssignedToRefName, capacityActions);
        this.initialize();
        this._teamDisplayName = WorkDetailsPanelResources.TeamCapacitySection_TeamProgressTitle;
    }

    /**
     * Gets the name of this GroupedProgressDataProvider
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
     * @return The list of data to show in the GroupedProgressControl
     */
    public getData(): IGroupedProgressDataChange[] {

        const data: IGroupedProgressDataChange[] = [];
        const current = this._getAllocatedWork();
        const total = this._teamCapacity.getTotalRemainingCapacity();

        if (current !== 0 || total !== 0) {
            data.push(this._buildDataTuple(current, total));
        }

        return data;
    }

    /**
     * Subscribes to changes of interest in the team capacity model.
     */
    protected subscribeToTeamCapacityModelChanges(): void {
        this._teamCapacity.attachTeamCapacityChanged(this._handleCapacityChanged);
    }

    protected unsubscribeFromTeamCapacityModelChanges(): void {
        this._teamCapacity._removeTeamCapacityChanged(this._handleCapacityChanged);
    }

    /**
     * Adds listeners to capacity actions of interest. Called when instance is initialized.
     */
    protected addCapacityActionsListeners(): void {
        this._capacityActions.addMissingTeamMembers.addListener(this._handleAddMissingTeamMembers);
        this._capacityActions.addUser.addListener(this._handleAddUser);
        this._capacityActions.removeUser.addListener(this._handleRemoveUser);
        this._capacityActions.updateTeamDaysOff.addListener(this._handleUpdateTeamDaysOff);
        this._capacityActions.replaceUserCapacities.addListener(this._handleCopyUserCapacities);
        this._capacityActions.save.addListener(this._handleSave);
        this._capacityActions.undo.addListener(this._handleUndo);
        this._capacityActions.updateIteration.addListener(this._handleUpdateIteration);
    }

    /**
     * Remove listeners from capacity actions. Called when instance is disposed.
     */
    protected removeCapacityActionsListeners(): void {
        this._capacityActions.addMissingTeamMembers.removeListener(this._handleAddMissingTeamMembers);
        this._capacityActions.addUser.removeListener(this._handleAddUser);
        this._capacityActions.removeUser.removeListener(this._handleRemoveUser);
        this._capacityActions.updateTeamDaysOff.removeListener(this._handleUpdateTeamDaysOff);
        this._capacityActions.replaceUserCapacities.removeListener(this._handleCopyUserCapacities);
        this._capacityActions.save.removeListener(this._handleSave);
        this._capacityActions.undo.removeListener(this._handleUndo);
        this._capacityActions.updateIteration.removeListener(this._handleUpdateIteration);
    }

    /**
     * Handle changes to field aggregation
     * @param fieldAggregator The field aggregator
     * @param aggregatedData The aggregated data in the following format
     *   {
     *       fieldName: [Name of the field which has changed]
     *       fieldValue: [Value which the aggregation has changed for]
     *       aggregatedValue: [The new aggregated value for the field value]
     *   }
     */
    protected handleAggregationChanged(fieldAggregator: FieldAggregator, aggregatedData: any): void {

        Debug.assertParamIsObject(fieldAggregator, "fieldAggregator");
        Debug.assertParamIsObject(aggregatedData, "aggregatedData");

        const current = this._getAllocatedWork();
        const total = this._teamCapacity.getTotalRemainingCapacity();
        const changeType = (current !== 0 || total !== 0) ? GroupedProgressDataProvider.CHANGETYPE_UPDATE : GroupedProgressDataProvider.CHANGETYPE_REMOVE;

        this._$raiseDataChanged(changeType, this._buildDataTuple(current, total));
    }

    /**
     * Builds the data tuple to raise data changed event with
     * @param current The current unit towards progress
     * @param total The total available progress unit
     */
    private _buildDataTuple(current: number, total: number) {
        Debug.assertParamIsNumber(current, "current");
        Debug.assertParamIsNumber(total, "total");

        return {
            id: this._teamDisplayName,
            text: this._teamDisplayName,
            current: current,
            total: total
        };
    }

    /**
     * Returns the allocated work for the current iteration
     */
    private _getAllocatedWork(): number {

        return this._fieldAggregator.getAggregatedValue(AssignedToRefName, AggregatedCapacity.TEAM_USERID);
    }

    /**
     * Handle changes to team capacity
     * @param teamCapacity The TeamCapacity instance after the capacity changes have been made
     */
    private _handleCapacityChanged = (teamCapacity: TeamCapacityModel) => {
        Debug.assertParamIsObject(teamCapacity, "teamCapacity");

        const current = this._getAllocatedWork();
        const total = teamCapacity.getTotalRemainingCapacity();
        const changeType = (current !== 0 || total !== 0) ? GroupedProgressDataProvider.CHANGETYPE_UPDATE : GroupedProgressDataProvider.CHANGETYPE_REMOVE;

        this._$raiseDataChanged(changeType, this._buildDataTuple(current, total));
    }

    /**
     * Handles updates to team days off.
     * @param teamDaysOff The new value for team days off.
     */
    private _handleUpdateTeamDaysOff = (teamDaysOff: Contracts.IDaysOff[]): void => {
        const teamDaysoffDateRange = getAsDateRangeArray(teamDaysOff);
        this._teamCapacity.teamDaysOff(teamDaysoffDateRange);

        this.raiseDataChanged();
    }

    /**
     * Handles adding missing team members.
     * @param users New set of team members.
     */
    private _handleAddMissingTeamMembers = (users: Contracts.IUser[]): void => {
        const updatedMembers = users.map((user) => this._getAsTeamMember(user));
        this._teamCapacity.mergeMembers(updatedMembers);

        this.raiseDataChanged();
    }

    /**
     * Handles adding capacity for a new team member.
     * @param user The new user.
     */
    private _handleAddUser = (user: Contracts.IUser): void => {

        //  Add only if not already added.
        if (!this._teamCapacity.teamMemberCapacityMap[user.id]) {
            const teamMemberCapacity: Work_Contracts.TeamMemberCapacity = <Work_Contracts.TeamMemberCapacity>{
                teamMember: {
                    id: user.id,
                    displayName: user.displayName,
                    uniqueName: user.uniqueName
                },
                activities: [{
                    name: TeamCapacityModel.DEFAULT_ACTIVITY_NAME,
                    capacityPerDay: 0
                }],
                daysOff: [],
                url: "",
                _links: []
            };

            const teamMemberCapacityModel: TeamMemberCapacityModel = new TeamMemberCapacityModel(
                this._teamCapacity.iterationInfo,
                teamMemberCapacity,
                this._teamCapacity.pauseCalculations,
                this._teamCapacity.pauseIsDirty,
                false);

            this._teamCapacity.capacities.splice(0, 0, teamMemberCapacityModel);
            this.raiseDataChanged();
        }
    }

    /**
     * Handles removing an user from the team members list.
     * @param user The user to remove.
     */
    private _handleRemoveUser = (user: Contracts.IUser): void => {
        const teamMemberCapacity = this._teamCapacity.getTeamMemberCapacity(user.displayName);
        this._teamCapacity.capacities.remove(teamMemberCapacity);

        this.raiseDataChanged();
    }

    /**
     * Handles copying new user capacities from a given set.
     * @param newCapacities New user capacities.
     */
    private _handleCopyUserCapacities = (newCapacities: Contracts.IUserCapacity[]): void => {
        const teamMemberCapacityArray = this.getAsTeamMemberCapacityArray(
            newCapacities,
            true    //  Removing team member days off when copying from last iteration.
        );

        if (teamMemberCapacityArray) {
            this._teamCapacity.setupMerge();
            this._teamCapacity.mergeCapacities(teamMemberCapacityArray, false);
            this._teamCapacity.endMerge();
            this.raiseDataChanged();
        }
    }

    /**
     * Handles undoing unsaved changes.
     */
    private _handleUndo = (): void => {
        this._teamCapacity.undo();
    }

    /**
     * Handler for when capacity data is saved.
     * @param savedData The saved data.
     */
    private _handleSave = (savedData: Contracts.ICapacity): void => {
        const teamMemberCapacityArray = this.getAsTeamMemberCapacityArray(
            savedData.userCapacities,
            false   //  Don't reset team member's days off.
        );
        const teamDaysOffDateRangeArray = getAsDateRangeArray(savedData.teamDaysOff);

        //  Notify the model that the data is saved so it can change the dirty state.
        this._teamCapacity.capacities().forEach((capacityModel: TeamMemberCapacityModel) => {
            capacityModel.dataSaved();
        });

        this._teamCapacity.mergeCapacities(teamMemberCapacityArray, true);
        this._teamCapacity.overwriteTeamDaysOff(teamDaysOffDateRangeArray);

        this.raiseDataChanged();
    }

    private _handleUpdateIteration = (newIterationInfo: Iteration): void => {
        this._teamCapacity.updateIterationDates(newIterationInfo.startDateUTC, newIterationInfo.finishDateUTC);
    }

    /**
     * Raises the data changed event to notify team capacity has been updated.
     */
    private raiseDataChanged() {
        const current = this._getAllocatedWork();
        const total = this._teamCapacity.getTotalRemainingCapacity();
        const changeType = (current !== 0 || total !== 0) ?
            GroupedProgressDataProvider.CHANGETYPE_UPDATE :
            GroupedProgressDataProvider.CHANGETYPE_REMOVE;

        this._$raiseDataChanged(changeType, this._buildDataTuple(current, total));
    }

    /**
     * Converts a Contracts.IUserCapacity array into a Work_Contracts.TeamMemberCapacity array.
     * @param items Users capacity.
     * @param resetTeamMemberDaysOff A value indicating whether or not to reset the days off
     * of each team member.
     */
    private getAsTeamMemberCapacityArray(
        items: Contracts.IUserCapacity[],
        resetTeamMemberDaysOff: boolean): Work_Contracts.TeamMemberCapacity[] {

        if (!items || items.length === 0) {
            return null;
        }

        const result = items.map(
            (item) => {
                const newActivities = this._getAsActivityArray(item.activities);
                const teamMemberDaysOff = getAsDateRangeArray(item.daysOff);
                const newTeamMember = this._getAsTeamMember(item.teamMember);

                return {
                    activities: newActivities,
                    daysOff: (resetTeamMemberDaysOff) ? [] : teamMemberDaysOff,
                    teamMember: newTeamMember,
                    _links: null,
                    url: null
                };
            }
        );

        result.sort((c1: Work_Contracts.TeamMemberCapacity, c2: Work_Contracts.TeamMemberCapacity) => {
            return localeIgnoreCaseComparer(c1.teamMember.displayName, c2.teamMember.displayName);
        });

        return result;
    }

    /**
     * Converts a Contracts.IActivity array into an Work_Contracts.Activity array.
     * @param items Activities data.
     */
    private _getAsActivityArray(items: Contracts.IActivity[]): Work_Contracts.Activity[] {

        if (!items || items.length === 0) {
            return [];
        }

        return items.map((item) => {
            return {
                capacityPerDay: item.capacityPerDay,
                name: item.name
            };
        });
    }

    /**
     * Converts a Contracts.IUser into an Work_Contracts.Member.
     * @param item User data.
     */
    private _getAsTeamMember(item: Contracts.IUser): Work_Contracts.Member {

        if (!item) {
            return null;
        }

        return <Work_Contracts.Member>{
            id: item.id,
            displayName: item.displayName,
            uniqueName: item.uniqueName
        };
    }
}

/**
 * Converts a Contracts.IDaysOff array into an Work_Contracts.DateRange array.
 * @param items Days off data array.
 */
export function getAsDateRangeArray(items: Contracts.IDaysOff[]): Work_Contracts.DateRange[] {

    if (!items || items.length === 0) {
        return [];
    }

    return items.map((item) => {
        return {
            start: item.start,
            end: item.end
        };
    });
}