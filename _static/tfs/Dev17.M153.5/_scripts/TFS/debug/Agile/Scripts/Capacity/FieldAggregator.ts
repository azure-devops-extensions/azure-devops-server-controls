/// <reference types="jquery" />
import Capacity_Models = require("Agile/Scripts/Capacity/CapacityModels");
import TFS_Agile_Utils = require("Agile/Scripts/Common/Utils");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Diag = require("VSS/Diag");
import Events_Handlers = require("VSS/Events/Handlers");
import { getService as getEventService } from "VSS/Events/Services";
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import { Actions, WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager, WorkItemStoreEventParam } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");

var DatabaseCoreFieldRefName = TFS_Agile_Utils.DatabaseCoreFieldRefName;
var WorkItemUtils = TFS_Agile_Utils.WorkItemUtils;

export class FieldAggregator {
    public static EVENTS_AGGREGATION_CHANGED: string = "event-aggregation-changed";
    public static EMPTY_VALUE: string = "__empty";
    public static PARENT_ID_FIELD_NAME: string = "PARENT-ID";

    private _aggregatedData: Capacity_Models.AggregatedCapacity;
    private _previousValueData: IDictionaryStringTo<IDictionaryStringTo<any>>;
    private _aggregateField: string;
    private _isTrackedWorkItem: (workitem: WITOM.WorkItem) => boolean;
    private _aggregatedCapacityLimitExceeded: boolean;
    private _fieldLookupHandler: any;
    private _fieldEvents: IDictionaryStringTo<Events_Handlers.NamedEventCollection<any, any>>;
    private _isDisposed: boolean;

    constructor(aggregateField: string,
        initialData: IDictionaryStringTo<IDictionaryStringTo<any>>,
        previousValueData: IDictionaryStringTo<IDictionaryStringTo<any>>,
        aggregatedCapacityLimitExceeded: boolean,
        isTrackedWorkItem: (workitem: WITOM.WorkItem) => boolean,
        /**
         * This class is responsible for tracking changes to fields, aggregating the values, and
         * raising events when it changes.
         * 
         * @param aggregateField Field to aggregate the values for.
         * @param initialData 
         * The initial aggregated data.  The object has the following structure:
         *    {
         *      "[Field Name]": {
         *        "[Field Value 1]": [Aggregated value]
         *        "[Field Value 2]": [Aggregated value]
         *      }
         *      "[Another Field]": {
         *         ...
         *      }
         *        ...
         *      }
         *    }
         * 
         * @param previousValueData 
         * All of the initial values that the aggregations were calculated based on.  These will be used
         * When work items are loaded to ensure that the aggregations are updated appropriately if the
         * values have changed since the initial aggregations were calculated.  The object has the
         * following structure:
         *  {
         *     "[field name]": {
         *       "[work item id]": [Previous value]
         *       ...
         *     }
         *     ...
         *  }
         * 
         * @param isTrackedWorkItem 
         * Function which is invoked when a work item change occurs to determine if this is a work item that aggregated data should be tracked for.
         * 
         * @param fieldLookupHandler 
         * OPTIONAL: Function which the field aggregator will use to look up field values.  The signature of the function is the work item and the
         * name of the field being looked up.
         * 
         */
        fieldLookupHandler?: Function) {

        Diag.Debug.assertParamIsString(aggregateField, "aggregateField");
        Diag.Debug.assertParamIsObject(initialData, "initialData");
        Diag.Debug.assertParamIsObject(previousValueData, "previousValueData");
        Diag.Debug.assertIsFunction(isTrackedWorkItem, "isTrackedWorkItem");
        Diag.Debug.assertParamIsBool(aggregatedCapacityLimitExceeded, "aggregatedCapacityLimitExceeded");

        this._aggregateField = aggregateField;
        this._aggregatedData = new Capacity_Models.AggregatedCapacity(initialData);
        this._isTrackedWorkItem = isTrackedWorkItem;
        this._fieldLookupHandler = fieldLookupHandler;
        this._previousValueData = previousValueData;
        this._aggregatedCapacityLimitExceeded = aggregatedCapacityLimitExceeded;
        this._fieldEvents = {};

        // Register for work item changed events.
        var store = TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        WorkItemManager.get(store).attachWorkItemChanged(this._workItemChangedHandler);

        // Register for work item deleted events.
        getEventService().attachEvent(Actions.WORKITEM_DELETED, this._workItemDeletedHandler);

        this._isDisposed = false;
    }

    public get disposed(): boolean {
        return this._isDisposed;
    }

    /**
     * Get the field name that this aggregator is aggregating values of.
     * 
     * @return 
     */
    public getAggregateField(): string {

        return this._aggregateField;
    }

    /**
     * Get the value of aggregatedCapacityLimitExceeded property
     * 
     * @return true if the aggregated capacity limit was exceeded, otherwise false
     */
    public isAggregatedCapacityLimitExceeded(): boolean {

        return this._aggregatedCapacityLimitExceeded;
    }

    /**
     * Gets current aggregated value for the provided field value.
     * 
     * @param fieldName Name of the field to get the aggregated value for.
     * @param fieldValue 
     * OPTIONAL: Value to get the aggregated aggregated value for.  When not provided, the value returned
     * will be the sum of the aggregated values for the field.
     * 
     * @return 
     */
    public getAggregatedValue(fieldName: string, fieldValue?: string): number {

        Diag.Debug.assert(!!this._aggregatedData, "Missing aggregated data object");

        return this._aggregatedData.getAggregatedValue(fieldName, fieldValue);
    }

    /**
     * Gets current aggregated values for the provided field.  The format of returned data is:
     *   {
     *     "Some Onecharenko": 5
     *     "Another Person": 7
     *   }
     * 
     * @param fieldName Name of the field to get the aggregated values for.
     * @return 
     */
    public getAggregatedValues(fieldName: string): any {

        Diag.Debug.assert(!!this._aggregatedData, "Missing aggregated data object");

        return this._aggregatedData.getAggregatedValues(fieldName);
    }

    /**
     * Remove the data of the provided work item from the tracked aggregations and raise the appropriate update events.
     * 
     * @param workItem Work item to be removed.
     */
    public remove(workItem: WITOM.WorkItem) {
        Diag.Debug.assertParamIsObject(workItem, "workItem");

        // Remove tracked aggregations and raise appropriate events
        this._removeWorkitemFromAggregations(workItem.id);
    }

    /**
     * Attach a handler for the aggregation changed event.
     * 
     * @param fieldName Name of the field to listen to changes in the aggregation for.
     * @param handler 
     * The handler to attach.The handler will be invoked with a sender and an object of the following format:
     *   {
     *       fieldName: [Name of the field which has changed.],
     *       fieldValue: [Value which the aggregation has changed for.],
     *       aggregatedValue: [The new aggregated value for the field value.]
     *   }
     * 
     */
    public attachAggregationChanged(fieldName: string, handler: IEventHandler) {

        Diag.Debug.assertParamIsString(fieldName, "fieldName");
        Diag.Debug.assertParamIsFunction(handler, "handler");

        var events = this._fieldEvents[fieldName];

        if (!events) {
            events = new Events_Handlers.NamedEventCollection();
            this._fieldEvents[fieldName] = events;
        }

        events.subscribe(FieldAggregator.EVENTS_AGGREGATION_CHANGED, <any>handler);
    }

    /**
     * Remove a handler for the aggregation changed event
     * 
     * @param fieldName Name of the field to detach listener from.
     * @param handler The handler to remove
     */
    public detachAgregationChanged(fieldName: string, handler: IEventHandler) {

        Diag.Debug.assertParamIsString(fieldName, "fieldName");
        Diag.Debug.assertParamIsFunction(handler, "handler");

        var events = this._fieldEvents[fieldName];

        if (events) {
            events.unsubscribe(FieldAggregator.EVENTS_AGGREGATION_CHANGED, <any>handler);
        }
    }

    /**
     * Detaches from workItemChanged event and unsubscribes all fieldChanged handlers
     */
    public dispose(): void {
        // detach workItemChangedEvent
        const store = TFS_OM.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        WorkItemManager.get(store).detachWorkItemChanged(this._workItemChangedHandler);

        // Detach workItem deleted event
        getEventService().detachEvent(Actions.WORKITEM_DELETED, this._workItemDeletedHandler);

        // Unsubscribe from all fieldChanged events
        if (this._fieldEvents) {
            for (const key of Object.keys(this._fieldEvents)) {
                const events = this._fieldEvents[key];
                events.unsubscribeAll();
            }
        }

        // Dispose local caches
        this._aggregateField = null;
        this._aggregatedData = null;
        this._previousValueData = null;
        this._fieldLookupHandler = null;
        this._fieldEvents = {};
        this._isDisposed = true;
    }

    /**
     * Handler for work item delete event.
     * 
     * @param store work item store.
     * @param args Arguments for the event.
     */
    private _workItemDeletedHandler = (store: WITOM.WorkItemStore, args: WorkItemStoreEventParam) => {
        this._removeWorkitemFromAggregations(args.workItemId);
    }

    /**
     * Handler for work item changed events.
     * 
     * @param sender The sender of the event (work item manager).
     * @param args Arguments for the event.
     */
    private _workItemChangedHandler = (sender: any, args?: any) => {

        Diag.Debug.assertParamIsObject(sender, "sender");
        Diag.Debug.assertParamIsObject(args, "args");

        var changeType = WorkItemChangeType;

        // See if this is a work item that we want to track changes for.
        if (args.change === changeType.Opened || args.change === changeType.Saved || args.change === changeType.ErrorChanged) {
            // This code needs to be executed last because of Dev11 Bug #923330. The problem is that
            // we have a handler for the WorkItemForm save event which will add the newly saved
            // WorkItem to the grid's data manager. The WorkItemForm's save event is always triggered
            // after the WorkItemManager save event which is what we attach to for this function. The 
            // below code requires the WorkItem to be added to the grid's data manager before it executes
            // otherwise aggregation will not be correctly updated for the newly added WorkItem.
            Utils_Core.delay(this, 0, this._handleWorkItemUpdate, args.workItem);
        }
    }

    /**
     * Reparent the specified workitems under the new parent id
     * 
     * @param workitemIds workItemIds to be reparented.
     * @param newParentId The Id of the new parent.
     */
    public reparentWorkItems(workItemIds: number[], newParentId: number) {
        Diag.Debug.assertIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertParamIsNumber(newParentId, "newParentId");

        for (let workItemId of workItemIds) {
            this.reparentWorkItem(workItemId, newParentId);
        }
    }

    /**
     * Reparent the specified workitem under the new parent id.
     * 
     * @param workitemId workItemId to be reparented.
     * @param newParentId The ID of the new parent.
     */
    public reparentWorkItem(workitemId: number, newParentId: number) {
        Diag.Debug.assertParamIsNumber(workitemId, "workitemId");
        Diag.Debug.assertParamIsNumber(newParentId, "newParentId");

        var remainingWorkField = this._aggregateField;
        var parentIDField = FieldAggregator.PARENT_ID_FIELD_NAME;

        var initialData = this._aggregatedData.getAggregatedCapacity();
        var previousData = this._previousValueData;

        if ((newParentId === 0) && (previousData[parentIDField] === void 0)) {
            // When there are no child items in a sprint, we have no "previousData".
            // Re-ordering top-level items should not fail in this case.
            return;
        }

        Diag.Debug.assert(previousData[parentIDField] !== void 0, "Expected to find previous data for the parent ID field");
        var oldParentId = previousData[parentIDField][workitemId];

        if (oldParentId !== newParentId) {
            var oldParentsRemainingWork = initialData[parentIDField][oldParentId] || 0;
            var newParentsRemainingWork = initialData[parentIDField][newParentId] || 0;
            var workItemRemainingWork = previousData[remainingWorkField][workitemId] || 0;

            previousData[parentIDField][workitemId] = newParentId;
            initialData[parentIDField][oldParentId] = oldParentsRemainingWork - workItemRemainingWork;
            initialData[parentIDField][newParentId] = newParentsRemainingWork + workItemRemainingWork;
        }
    }

    /**
     * Updates aggregated capacity when default activity for user changes.
     * 
     * @param userDisplayname Distinct display name of the user.
     * @param newActivityName The new default activity name.
     * @param activityFieldName The activity field name.
     */
    public updateDefaultActivity(userDisplayName: string, newActivityName: string, activityFieldName: string) {

        /*
        * The work item's activity is determined by either of these two
        *  1) If the Activity Name is expilicity defined in the Work Item itself
        *  2) If not then the Default Activity of the user to whom the work item is assigned
        *  3) This function updates the "calculated" activity of the work item for the scenario 2) 
        */
        Diag.Debug.assertParamIsString(userDisplayName, "userDisplayName");
        Diag.Debug.assertParamIsString(newActivityName, "newActivityName");
        Diag.Debug.assertParamIsString(activityFieldName, "activityFieldName");

        var previousData = this._previousValueData;
        var aggregatedData = this._aggregatedData.getAggregatedCapacity();
        var assignedToFieldName = DatabaseCoreFieldRefName.AssignedTo;
        var remainingWorkFieldName = this._aggregateField;
        var newActivityKey = newActivityName || FieldAggregator.EMPTY_VALUE;

        var workItems: IDictionaryStringTo<any> = previousData[assignedToFieldName];
        var workItemId: any;
        for (workItemId in workItems) {
            if (workItems.hasOwnProperty(workItemId)) {
                //Is the work item belong to the user and the activity is not defined in the work item
                if (previousData[assignedToFieldName][workItemId] === userDisplayName && previousData["ACTUAL-ACTIVITY-NAME"][workItemId] === "") {
                    //Change the previous default activity name to the new default activity name
                    var oldActivityName = previousData[activityFieldName][workItemId];

                    if (Utils_String.localeIgnoreCaseComparer(oldActivityName, newActivityName) === 0) {
                        continue;
                    }
                    else {
                        var oldActivityKey = oldActivityName || FieldAggregator.EMPTY_VALUE;
                        previousData[activityFieldName][workItemId] = newActivityName;

                        var capacityToAdjust: number = previousData[remainingWorkFieldName][workItemId] || 0;
                        var oldActivityValue = aggregatedData[activityFieldName][oldActivityKey] || 0;
                        var newActivityValue = aggregatedData[activityFieldName][newActivityKey] || 0;
                        aggregatedData[activityFieldName][oldActivityKey] = oldActivityValue - capacityToAdjust;
                        aggregatedData[activityFieldName][newActivityKey] = newActivityValue + capacityToAdjust;
                    }
                }
            }
        }
    }

    /**
     * Reparent the specified workitems under the given custom row ID.
     * 
     * @param workitems An array of workitem IDs of potential children.
     * @param customRowId The ID of the custom group row.
     */
    public reparentToCustomRow(workitems: number[], customRowId: number) {

        if (!workitems.length) {
            return;
        }

        var remainingWorkField = this._aggregateField;
        var parentIDField = FieldAggregator.PARENT_ID_FIELD_NAME;

        var initialData = this._aggregatedData.getAggregatedCapacity();
        var previousData = this._previousValueData;

        // For every specified child row, set the parent as the custom row. 
        // Also, save the efforts from the child rows, so that they can be aggregated under the new parent. 
        var customRowEffort: number = 0;
        $.each(workitems, (i, id) => {
            if (Object.keys(previousData).length > 0) {
                previousData[parentIDField][id] = customRowId;
                if (previousData[remainingWorkField][id]) {
                    customRowEffort += previousData[remainingWorkField][id];
                }
            }
        });

        // Aggregate the child rows' efforts under the customParent, and deduct it from the row corresponding
        // to workitems without a parent, "0".
        initialData[parentIDField][customRowId] = customRowEffort;
        initialData[parentIDField][0] -= customRowEffort;
    }

    /**
     * Remove the data of the provided work item id from the tracked aggregations and raise the appropriate update events.
     * @param workItemId Work item id for which the data needs to be removed.
     */
    private _removeWorkitemFromAggregations(workItemId: number) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        let aggregationChangedEventArgs = [];

        // Get AggregateField value from lookup instead because the item's aggregateField could be updated in which case the computation will be wrong
        let previousAggregateFieldValue = this._lookupPreviousValueByWorkItemId(workItemId, this._aggregateField);
        if (!previousAggregateFieldValue) {
            // Workitem hasn't been included in aggregate before, ignore now
            return;
        }

        /**
         * 'aggregatedData' contains aggregated data for all the tracked fields such as assignedTo, Activity, etc..
         * Example 'aggregatedData' object looks like the following
         * aggregatedData: {
         *      System.AssignedTo: { "User1 <Domain1\User1>": 100, "User2 <Domain2\User2>": 200 },
         *      Microsoft.VSTS.Common.Activity: { "Testing": 150, "Development": 150 }
         * }
         */
        let aggregatedData = this._aggregatedData.getAggregatedCapacity();

        /**
         * For each trackedField in aggregatedData, do the following
         * 1. Get trackedField's value from lookup instead because it could be updated in the workitem
         * 2. Get 'previousAggregatedValue' for the trackedFieldValue and compute new sum
         * 3. Update 'aggregatedData' with new aggregated value
         */
        for (let trackedField in aggregatedData) {
            if (aggregatedData.hasOwnProperty(trackedField)) {
                let trackedFieldValue = this._lookupPreviousValueByWorkItemId(workItemId, trackedField);

                // If the work item has the tracked field, update the aggregation.
                if (trackedFieldValue !== undefined) {
                    let previousAggregatedValue = this._aggregatedData.getAggregatedValue(trackedField, trackedFieldValue);
                    previousAggregatedValue -= previousAggregateFieldValue;

                    this._aggregatedData.setAggregatedValue(trackedField, trackedFieldValue, previousAggregatedValue);

                    aggregationChangedEventArgs.push(this._createAggregationChangedEventArgs(trackedField, trackedFieldValue, previousAggregatedValue));
                }

                // Remove fieldValue from previousData cache
                const fieldDataCollection = this._previousValueData[trackedField];
                if (fieldDataCollection && fieldDataCollection[workItemId]) {
                    delete fieldDataCollection[workItemId];
                }
            }
        }

        // Raise event about change in capacity for the impacted field values.
        this._raiseEvents(aggregationChangedEventArgs);
    }

    /**
     * Called when a work item is loaded or saved.
     * 
     * @param workItem WorkItem which was loaded.
     */
    private _handleWorkItemUpdate(workItem: WITOM.WorkItem) {

        if (!workItem.isValid()) {
            return;
        }

        var isTrackedWorkItem = this._isTrackedWorkItem(workItem);
        if (!isTrackedWorkItem) {
            return;
        }

        Diag.logTracePoint("SprintBacklog._handleWorkItemUpdate.start");

        var aggregatedData = this._aggregatedData.getAggregatedCapacity();
        var fieldName;
        var field: WITOM.Field;
        var changedFields: IDictionaryStringTo<WITOM.Field> = {};
        var previousAggregateValue;

        // Treat work item load/save as field change since the fields could have changed underneath us.

        // If this is a new work item, only treat the aggregate value as changed so that the new value
        // does not get counted twice.
        // NOTE: The aggregated value as treated as the field that changed because it will trigger updates
        //       of all of the impacted tracked fields.
        previousAggregateValue = this._lookupPreviousValue(workItem, this._aggregateField);
        if (previousAggregateValue !== undefined) {
            // Add the tracked fields.
            for (fieldName in aggregatedData) {
                if (aggregatedData.hasOwnProperty(fieldName)) {
                    field = workItem.getField(fieldName);

                    if (field) {
                        changedFields[field.fieldDefinition.id] = field;
                    }
                }
            }
        }
        else {
            // The work item is new, so just store the values of the tracked fields
            for (fieldName in aggregatedData) {
                if (aggregatedData.hasOwnProperty(fieldName)) {
                    // Cache the previous value for the field so next time the work item is saved we know what the original
                    // values of the tracked fields were.
                    this._storePreviousValue(workItem, fieldName);
                }
            }
        }

        // Add the aggregate field to the list of changed fields.
        field = workItem.getField(this._aggregateField);
        if (field) {
            changedFields[field.fieldDefinition.id] = field;
        }

        this._handleFieldChanged(workItem, changedFields);
        Diag.logTracePoint("SprintBacklog._handleWorkItemUpdate.complete");
    }

    /**
     * Saves off the current value of the field from the work item in the previous value data.
     * 
     * @param workItem Work item to store the field value from.
     * @param fieldName Name of the field to store the value from.
     */
    private _storePreviousValue(workItem: any, fieldName: string) {

        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var fieldDataCollection,
            fieldValue;

        fieldDataCollection = this._previousValueData[fieldName];

        // Create the field data object if it does not exist already.
        if (!fieldDataCollection) {
            fieldDataCollection = {};
            this._previousValueData[fieldName] = fieldDataCollection;
        }

        // Set the value in the previous data collection for this work item.
        fieldValue = this._getFieldValue(workItem, fieldName);
        if (fieldValue !== undefined) {
            fieldDataCollection[workItem.id] = fieldValue;
        }
    }

    /**
     * Gets the previous value of the field for the work item.
     * 
     * @param workItem Work item to get the previous field value for.
     * @param fieldName Name of the field to get the value for.
     * @param useCurrentIfNotCached OPTIONAL: Indicates if the current value should be used if no cached value exists.
     */
    private _lookupPreviousValue(workItem: any, fieldName: string, useCurrentIfNotCached?: boolean) {

        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        let fieldValue = this._lookupPreviousValueByWorkItemId(workItem.id, fieldName);

        // See if we need to lookup the current value from the work item.
        if (useCurrentIfNotCached && fieldValue === undefined) {
            fieldValue = this._getFieldValue(workItem, fieldName);
        }

        return fieldValue;
    }

    /**
     * Gets the previous value of the field for the given workItemId.
     * Note: this doesn't use current value if no cached value exists
     */
    private _lookupPreviousValueByWorkItemId(workItemId: number, fieldName: string) {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        let fieldValue;
        const fieldDataCollection = this._previousValueData[fieldName];
        if (fieldDataCollection) {
            // If we have data for the field, lookup the value for this work item.
            fieldValue = fieldDataCollection[workItemId];
        }

        return fieldValue;
    }

    /**
     * Updates the aggregated value based on the changed field and raises appropriate events based on the updated value.
     * 
     * @param workItem Work item that was changed.
     * @param changedFields Array of fields that were updated.
     */
    private _handleFieldChanged(workItem: WITOM.WorkItem, changedFields: any) {

        var updatePreviousValue = false,
            changedField,
            changedFieldId,
            changedFieldName,
            aggregationChangedEventArgs = [],
            aggregatedData = this._aggregatedData.getAggregatedCapacity();

        for (changedFieldId in changedFields) {
            if (changedFields.hasOwnProperty(changedFieldId)) {
                changedField = changedFields[changedFieldId];
                changedFieldName = changedField.fieldDefinition.referenceName;

                // If the field being changed is one of the tracked fields, update the aggregated values.
                if (changedFieldName in aggregatedData) {
                    updatePreviousValue = true;
                    this._handleTrackedFieldChanged(workItem, changedFieldName, aggregationChangedEventArgs);
                }
                // If the aggregate field was changed, update the aggregated values for all tracked fields.
                else if (changedFieldName === this._aggregateField) {
                    updatePreviousValue = true;
                    this._handleAggregationFieldChanged(workItem, aggregationChangedEventArgs);
                }

                // Save off the new value as the previous value if the change is for a tracked or aggregated field.
                if (updatePreviousValue) {
                    this._storePreviousValue(workItem, changedFieldName);
                }
            }
        }

        // Raise event about change in capacity for the impacted field values.
        this._raiseEvents(aggregationChangedEventArgs);
    }

    /**
     * Raise the aggregation changed events.
     * 
     * @param aggregationChangedEventArgs Array of aggregation changed event arguments.
     */
    private _raiseEvents(aggregationChangedEventArgs: any[]) {

        Diag.Debug.assertParamIsArray(aggregationChangedEventArgs, "aggregationChangedEventArgs");

        var i, l;

        // Raise event about change in capacity for the impacted field values.
        for (i = 0, l = aggregationChangedEventArgs.length; i < l; i += 1) {
            this._raiseAggregationChanged(aggregationChangedEventArgs[i]);
        }
    }

    /**
     * Update the aggregations based on the change to the aggregation field
     * 
     * @param workItem Work item which has changed.
     * @param changedFieldName FieldName which was changed.
     * @param aggregationChangedEventArgs Array to add information about any aggregation changes to.
     */
    private _handleTrackedFieldChanged(workItem: WITOM.WorkItem, changedFieldName: string, aggregationChangedEventArgs: any[]) {

        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsString(changedFieldName, "changedFieldName");
        Diag.Debug.assertParamIsArray(aggregationChangedEventArgs, "aggregationChangedEventArgs");

        var field,
            aggregateValue,
            previousFieldValue,
            currentFieldValue,
            previousSum,
            lookupValue,
            newSum;

        // If the work item has the aggregate field, update the aggregations.
        field = workItem.getField(this._aggregateField);
        if (field) {
            // Subtract the previous aggregate field value from the original field values sum and add it to the new values sum. 
            previousFieldValue = this._lookupPreviousValue(workItem, changedFieldName);
            currentFieldValue = this._getFieldValue(workItem, changedFieldName);

            // If the field has changed, update the aggregations.
            if (previousFieldValue !== currentFieldValue) {
                // Lookup the value for the aggregate field getting the current value if a cached one does not exist.
                lookupValue = this._lookupPreviousValue(workItem, this._aggregateField, true);

                //Ensure it is always a number; cast empty strings to zero
                if (typeof (lookupValue) !== "number") {
                    lookupValue = 0;
                }
                aggregateValue = lookupValue;

                // If there was a previous field value, update the sum for the previous field value.
                if (previousFieldValue !== undefined) {
                    previousSum = this.getAggregatedValue(changedFieldName, previousFieldValue);
                    newSum = previousSum - aggregateValue;  // subtract out the value of the aggregate field.
                    this._aggregatedData.setAggregatedValue(changedFieldName, previousFieldValue, newSum);

                    // Create the event arguments so an event will be raised for this aggregation change.
                    aggregationChangedEventArgs.push(this._createAggregationChangedEventArgs(changedFieldName, previousFieldValue, newSum));
                }

                // Update the sum for the current field value.
                previousSum = this.getAggregatedValue(changedFieldName, currentFieldValue);
                newSum = previousSum + aggregateValue;  // add in the value of the aggregate field.
                this._aggregatedData.setAggregatedValue(changedFieldName, currentFieldValue, newSum);

                // Create the event arguments so an event will be raised for this aggregation change.
                aggregationChangedEventArgs.push(this._createAggregationChangedEventArgs(changedFieldName, currentFieldValue, newSum));
            }
        }
    }

    /**
     * Update the aggregations based on the change to the aggregation field
     * 
     * @param workItem Work item which has changed.
     * @param aggregationChangedEventArgs Array to add information about any aggregation changes to.
     */
    private _handleAggregationFieldChanged(workItem: WITOM.WorkItem, aggregationChangedEventArgs: any[]) {

        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsArray(aggregationChangedEventArgs, "aggregationChangedEventArgs");

        var aggregatedData = this._aggregatedData.getAggregatedCapacity(),
            previousAggregateValue,
            currentAggregateValue,
            currentFieldValue,
            previousSum,
            newSum,
            propertyName;

        previousAggregateValue = this._lookupPreviousValue(workItem, this._aggregateField);
        currentAggregateValue = this._getFieldValue(workItem, this._aggregateField) || 0;

        // If the aggregated value has changed, update the aggregations.
        if (previousAggregateValue !== currentAggregateValue) {
            // If this is the first time the remaining work field has changed for the work item the previous aggregate value
            // will be undefined, so default it to zero.
            previousAggregateValue = previousAggregateValue || 0;

            // Subtract the original aggregated value from the tracked fields sums and add the new value.
            for (propertyName in aggregatedData) {
                if (aggregatedData.hasOwnProperty(propertyName)) {
                    // If the work item has the field, update the fields aggregation.
                    if (this._getFieldValue(workItem, propertyName) !== undefined) {
                        // Get the value of the tracked field from the work item using the current value if it is not cached.
                        currentFieldValue = this._lookupPreviousValue(workItem, propertyName, true);
                        previousSum = this.getAggregatedValue(propertyName, currentFieldValue);

                        // Subtract off the old aggregate value and add in the new one.
                        newSum = previousSum + currentAggregateValue - previousAggregateValue;
                        this._aggregatedData.setAggregatedValue(propertyName, currentFieldValue, newSum);

                        // Create the event arguments so an event will be raised for this aggregation change.
                        aggregationChangedEventArgs.push(this._createAggregationChangedEventArgs(propertyName, currentFieldValue, newSum));
                    }
                }
            }
        }
    }

    /**
     * Creates the event arguments for the field changed event.
     * 
     * @param fieldName Name of the field whose aggregation has changed.
     * @param fieldValue Value whose aggregation has changed.
     * @param aggregatedValue New aggregated value for the field value.
     */
    private _createAggregationChangedEventArgs(fieldName: string, fieldValue: any, aggregatedValue: number) {

        Diag.Debug.assertParamIsString(fieldName, "fieldName");
        Diag.Debug.assertParamIsNotUndefined(fieldValue, "fieldValue");
        Diag.Debug.assertParamIsNumber(aggregatedValue, "aggregatedValue");

        return {
            fieldName: fieldName,
            fieldValue: fieldValue,
            aggregatedValue: aggregatedValue
        };
    }

    /**
     * Notifies listeners that the aggregation has changed.
     * 
     * @param args args
     */
    private _raiseAggregationChanged(args?: any) {

        Diag.Debug.assertParamIsObject(args, "args");

        var events = this._fieldEvents[args.fieldName];

        if (events) {
            events.invokeHandlers(FieldAggregator.EVENTS_AGGREGATION_CHANGED, this, args);
        }
    }

    /**
     * Lookup the value of a work item field.
     * 
     * @param workItem Work item to lookup the value from.
     * @param fieldName Name of the field to be looked up.
     * @return 
     */
    private _getFieldValue(workItem: WITOM.WorkItem, fieldName: string): any {

        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var value;

        // If we have a field lookup handler, then use it.
        if (this._fieldLookupHandler) {
            value = this._fieldLookupHandler(workItem, fieldName);
        }

        // If the handler could not look up the value, do it directly.
        if (value === undefined) {
            value = WorkItemUtils.getFieldValueByName(workItem, fieldName);
        }

        return value;
    }
}

/**
 * Get activity field value for lookup
 * @param activityFieldDisplayName WorkItem Activity field display name
 * @param allowedActivities List of allowed activities
 * @param workItem workItem object
 * @param getTeamMemberCapacity helper that returns teamMemberCapacity
 */
export function getActivityFieldValue(
    activityFieldDisplayName: string,
    allowedActivities: string[],
    workItem: WITOM.WorkItem,
    getTeamMemberCapacity: (assignedToFieldValue: string) => Capacity_Models.TeamMemberCapacityModel
) {
    // Try and get the value from the activity field directly.
    let value = WorkItemUtils.getFieldValueByName(workItem, activityFieldDisplayName);
    if (!value) {
        // No activity field value, so try and get the value from the team members activity.
        const assignedTo: string = WorkItemUtils.getFieldValueByName(workItem, DatabaseCoreFieldRefName.AssignedTo);
        if (assignedTo) {
            // If the assigned to is a member of the team, use the activity set on the team member.
            const teamMemberCapacity = !!getTeamMemberCapacity && getTeamMemberCapacity(assignedTo)
            if (teamMemberCapacity) {
                // If the team member has a default activity, use it.
                const activity = teamMemberCapacity.getDefaultActivity();
                if (activity) {
                    value = activity;
                }
            }
        }
    } else if (!Utils_Array.contains(allowedActivities, value, Utils_String.ignoreCaseComparer)) {
        // The value is not in the set of allowed values, so treat it as unassigned.
        value = "";
    }

    return value;
}