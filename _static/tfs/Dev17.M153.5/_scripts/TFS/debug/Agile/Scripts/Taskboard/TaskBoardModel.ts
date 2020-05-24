/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { delegate } from "VSS/Utils/Core";
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Number = require("VSS/Utils/Number");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_FormatUtils = require("Presentation/Scripts/TFS/FeatureRef/FormatUtils");
import Diag = require("VSS/Diag");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import AgileUtils = require("Agile/Scripts/Common/Utils");
import TaskboardResources = require("Agile/Scripts/Resources/TFS.Resources.AgileTaskboard");
import Cards = require("Agile/Scripts/Card/Cards");
import { StatesTransitionData, TaskBoardStateTransitionDataHelper } from "Agile/Scripts/Taskboard/TaskBoardStateTransitionDataHelper";
import Util_Cards = require("Agile/Scripts/Card/CardUtils");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { BacklogConfigurationService, WorkItemStateCategory } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import WITResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { TaskboardGroupBy } from "Agile/Scripts/Taskboard/TaskboardConstants";
import { IFilterDataSource } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { FilterManager } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { TextFilterProvider, TextFilterProviderWithUnassigned } from "WorkItemTracking/Scripts/Filtering/TextFilterProvider";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { TagsFilterProvider } from "WorkItemTracking/Scripts/Filtering/TagsFilterProvider";
import { AssignedToFilterProvider } from "WorkItemTracking/Scripts/Filtering/AssignedToFilterProvider";
import { ITeam } from "Agile/Scripts/Models/Team";

var DatabaseCoreFieldRefName = AgileUtils.DatabaseCoreFieldRefName;
var TfsContext = TFS_Host_TfsContext.TfsContext;
var FormatUtils = TFS_FormatUtils.FormatUtils;

export interface ITeamFieldInfo {
    refName: string;
    defaultValue: any;
}

export interface IClassificationData {
    templateId: number;
    pivotKey: any;
}

export interface IClassification {
    getPivotFieldDisplayName(): string;
    getPivotField(): string;
    getClassification(): IClassificationData[];
    isValidPivot(pivotValue: any): boolean;
    supportsPivotOperations(): boolean;
}

export interface IMetaStateRollupData {
    workItemCount: number;
    remainingWork: number;
}

export interface IRollupByMetaState {
    //key is metastate, value is number of work items and their sum of remaining work
    rollup: IDictionaryNumberTo<IMetaStateRollupData>;
}


export interface IRollup {
    horizontalRollup: IDictionaryStringTo<number>;
    verticalRollup: IDictionaryStringTo<number>;

    // key is pivot, value is the rollupByMetaState for that pivot
    pivotRollupByMetaState: IDictionaryStringTo<IRollupByMetaState>;

}

/** Taskboard Filter Interface */
export interface ITaskboardFilter {
    fieldName: string;
    values: string[];
    selectedValue: string;
}

/** TaskBoard Payload */
export interface ITaskboardPayload {
    data: IDictionaryNumberTo<(string | number)[]>;
    columns: string[];
}

/** Taskboard model options interface */
export interface ITaskboardModelOptions {
    /** Id of the team the taskboard is shown for */
    team: ITeam;

    /** Child workItemTypeNames */
    childWorkItemTypes: string[];

    /** List of fieldDefinitions */
    fieldDefinitions: Cards.IFieldDefinition[];

    /** Initial filters */
    filters: ITaskboardFilter[];

    /**
     * Flag indicating whether there are any nested tasks on current board.
     * Reordering is disabled when there are nested tasks.
     */
    hasNestedTasks: boolean;

    /** Order by field (such as stack rank) */
    orderByField: string;

    /** Parent ids */
    parentIds: number[];

    /** Parent workItem plural name */
    parentNamePlural: string;

    /** Taskboard content payload */
    payload: ITaskboardPayload;

    /** Work item ids that caused re-ordering to be disabled */
    reorderBlockingWorkItemIds?: number[];

    /** Remaining work suffix format (such as '{0} h') */
    remainingWorkFormat: string;

    /** List of states */
    states: string[];

    /** Default team field value */
    teamFieldDefaultValue: string;

    /** Team fieldReference name */
    teamFieldRefName: string;

    /** State transitions dictionary */
    transitions: IDictionaryStringTo<IDictionaryStringTo<string[]>>;

    /** Rollup field reference name */
    workRollupField: string;

    /** Optional tfsContext */
    tfsContext?: TFS_Host_TfsContext.TfsContext;
}

export class TaskBoardModel implements IFilterDataSource {

    public static ALL_VALUE: string = "{*}";
    public static UNASSIGNED_VALUE: string = "";
    public static NULL_PIVOT_KEY: string = "__null";
    public static NEW_ROW_PIVOT_KEY: string = "__new";
    public static NO_PARENT_ID: number = 0;
    public static PARENTID_FIELDNAME: string = "ParentId";
    public static WORK_ROLLUP_NAME: string = ".WORK_ROLLUP";
    public static ORDER_BY_NAME: string = ".ORDER_BY";
    public static DATASOURCE_NAME: string = "Taskboard";

    private _team: ITeam;
    private _filterColumns: string[];
    private _useNewTaskboardDisplay: boolean;
    private _visibleIds: IDictionaryNumberTo<number>;
    private _filterManager: FilterManager; // for tracking the state of the Hub filter
    private _columnsLookupTable: IDictionaryStringTo<number>; // refName => column position
    private _fieldData: IDictionaryNumberTo<any[]>; // workItemId => fieldValues[]
    public _parentWorkItemIds: number[];
    public _indexOfUnparentedRow: number = 0;
    private _parentsLookupTable: IDictionaryNumberTo<number>;
    private _childWorkItemIds: number[];
    private _childrenLookupTable: IDictionaryNumberTo<number[]>; // workItemId => children
    private _remainingWorkFormat: string;
    private _workRollupField: string;
    private _store: WITOM.WorkItemStore;
    private _classificationProviders: IDictionaryStringTo<IClassification>;
    private _orderByField: string;
    private _parentNamePlural: string;
    private _stateTransitionData: StatesTransitionData;
    private _fieldOverrides: IDictionaryNumberTo<IDictionaryStringTo<any>>; // workItemId => )_
    private _states: IDictionaryStringTo<string>; // stateName => stateName - really a HashMap
    private _teamField: ITeamFieldInfo;
    private _childWorkItemTypes: string[];
    private _peopleList: any;
    private _peopleLookup: IDictionaryStringTo<boolean>;
    private _filterField: string;
    private _filter: WITOM.IFieldValueDictionary;
    private _groupFilter: any;
    private _workItemErrors: any;
    private _hasOrphanTasks: any = null;
    private _hasNestedTasks: boolean = null;
    private _reorderBlockingWorkItemIds: number[] = [];
    //this is map from field reference name to WitCardFieldDefinition
    private _fieldDefMap: IDictionaryStringTo<Cards.WitCardFieldDefinition>;
    //this is map from field reference name to WitCardField (field model used for editing card fields) for each work item id
    //  { 1: { "System.AssignedTo" : Field,
    //          "System.Title" : Field },
    //    2: { "System.AssignedTo" : Field,
    //          "System.Title" : Field } }
    private _fieldMap: IDictionaryNumberTo<IDictionaryStringTo<Cards.WitCardField>>;
    private _handleWorkItemChangedDelegate: (sender, args) => void;

    public tfsContext: TFS_Host_TfsContext.TfsContext;

    /**
     * List of states in taskboard column order
     */
    public states: string[];

    /**
     * Lower case version of 'states' property
     */
    public stateKeys: string[];

    constructor(data: ITaskboardModelOptions, useNewTaskboardDisplay: boolean = false) {
        Diag.Debug.assert(data !== null, "NullReference: data");
        this._useNewTaskboardDisplay = useNewTaskboardDisplay;
        this._initialize(data);
    }

    public get teamId(): string {
        return this._team.id;
    }

    public get team(): ITeam {
        return this._team;
    }

    /**
     * Gets the work item store
     * 
     * @return 
     */
    public getWorkItemStore(): WITOM.WorkItemStore {
        return this._store;
    }

    /**
     * Gets the work item manager
     * 
     * @return 
     */
    public getWorkItemManager(): WorkItemManager {

        return WorkItemManager.get(this._store);
    }

    /**
     * Gets the child work item type names
     * 
     * @return Array of work item type names
     */
    public getChildWorkItemTypes(): string[] {

        return this._childWorkItemTypes.slice(0);
    }

    /**
     * Gets the parent work item type plural
     * 
     * @return Parent WIT plural string
     */
    public getParentNamePlural(): string {

        return this._parentNamePlural;
    }

    /**
     * Gets the team field information
     * 
     * @return { refName:string, defaultValue:string }
     */
    public getTeamFieldInfo(): ITeamFieldInfo {
        return <ITeamFieldInfo>$.extend({}, this._teamField);
    }

    /**
     * Gets the team field refname
     * 
     * @return refName
     */
    public getTeamFieldRefName(): string {
        return this._teamField.refName;
    }

    /**
     * Gets the work rollup field refname
     * 
     * @return refName
     */
    public getWorkRollupFieldRefName(): string {
        return this._workRollupField;
    }

    /**
     * Gets the order field refname
     * 
     * @return refName
     */
    public getOrderFieldRefName(): string {
        return this._orderByField;
    }

    /**
     * Gets the value of the state field from the work item as lower case to be used as a key (ex. for dictionary use)
     * @param id The id of the work item
     */
    public getStateFieldValueAsKey(id: number): string {
        const fieldValue = this.getFieldValue(id, DatabaseCoreFieldRefName.State);
        return fieldValue ?
            fieldValue.toLocaleLowerCase() :
            id;
    }

    /**
     * Gets the value of the field from the work item.
     *
     * @param id Id of the work item to get the field from.
     * @param fieldName Name of the field to get from the work item.
     * @return The value of the field from the work item if it exists.
     */
    public getFieldValue(id: number, fieldName: string): any {
        if (fieldName === DatabaseCoreFieldRefName.Id) {
            return Number(id);
        }

        // See if the field has been overridden.
        const overrideValue = this._getOverrideValue(id, fieldName);
        if (overrideValue !== undefined) {
            return overrideValue;
        }

        if (fieldName === TaskBoardModel.WORK_ROLLUP_NAME) {
            fieldName = this._workRollupField;

            // If there is no remaining work field, return zero for the work rollup.
            if (!fieldName) {
                return 0;
            }
        }

        if (fieldName === TaskBoardModel.ORDER_BY_NAME) {
            // Use the field that was configured for ordering.
            fieldName = this._orderByField;
        }

        // Attempt to retrieve the workitem from the WITOM cache
        const cachedWorkItem = WorkItemManager.get(this._store).getWorkItem(id);

        if (cachedWorkItem) {
            if (fieldName === this._getClassificationProvider(TaskboardGroupBy.PARENT_CLASSIFICATION).getPivotField()) {
                const parentLink = AgileUtils.WorkItemUtils.getWorkItemParentLink(cachedWorkItem);
                if (parentLink) {
                    let parentId = parentLink.getTargetId();
                    // check if the parent is one of the taskboard listed parents
                    // Related: Bug# 330367
                    if (!this.isParentId(parentId)) {
                        parentId = 0;
                    }
                    return parentId;
                } else {
                    return 0;
                }
            }

            const field = cachedWorkItem.getField(fieldName);
            if (field) {
                return field.getValue();
            }
        }

        // If we weren't able to acquire a cached workitem above then use the payload data

        // Lookup the payload column index.
        const index = this._lookupPayloadColumnIndex(fieldName);

        if (this._fieldData.hasOwnProperty("" + id)) {
            const value = this._fieldData[id][index];
            if (typeof (value) !== 'undefined') {
                return value;
            } else {
                Diag.Debug.assert(false, "Expected to find value for WorkItem field");
                return undefined;
            }
        } else {
            // If we did not find the work item in the field data, it means this work item was probably not created.
            // This can happen if there are required fields on the Task form and the dialog is dismissed without saving.
            return undefined;
        }
    }

    /**
     *  gets the field
     * 
     * @param id The id of the workitem for which field model is requested
     * @param fieldname The name of the field
     * @param fieldSetting The customized settings for the field from board card settings
     */
    public field(id: number, fieldName: string, fieldSetting: Cards.ICardFieldSetting): Cards.CardField {

        var field: Cards.WitCardField;
        if (this._fieldMap[id]) {
            field = this._fieldMap[id][fieldName];
        }
        else {
            this._fieldMap[id] = {};
        }
        if (!field) {
            field = new TaskBoardCardField(this, id, this.getFieldDefinition(fieldName), fieldSetting);
            this._fieldMap[id][fieldName] = field;
        }

        return field;
    }

    /**
     * get the field definition for specified field
     * 
     * @param fieldRefName field reference name
     * @return 
     */
    public getFieldDefinition(fieldRefName: string): Cards.WitCardFieldDefinition {

        var fieldDef = this._fieldDefMap[fieldRefName.toUpperCase()];
        if (!fieldDef) {
            fieldDef = new Cards.WitCardFieldDefinition(fieldRefName);
            this._fieldDefMap[fieldRefName.toUpperCase()] = fieldDef;
        }
        return fieldDef;
    }

    public getFieldDefinitions(): IDictionaryStringTo<Cards.WitCardFieldDefinition> {
        /// <summary>get the field definition map containing field definitions for all fields</summary>
        /// <returns type="IDictionaryStringTo<Cards.WitCardFieldDefinition>"></returns>
        return this._fieldDefMap;
    }

    /**
     * returns the parent id for a particular work item
     * 
     * @param id Id of the Work Item 
     */
    public getParent(id: number): any {

        var fieldName = this._getClassificationProvider(TaskboardGroupBy.PARENT_CLASSIFICATION).getPivotField();
        return this.getFieldValue(id, fieldName);
    }

    /**
     * Sets the pivot field's value to be the new value.
     * 
     * @param id Id of the Work Item to change the pivot field value of
     * @param fieldName The field to change the value of
     * @param newValue New value, as a string or number
     */
    public setFieldValue(id: number, fieldName: string, newValue): void {

        Diag.Debug.assertParamIsNumber(id, "id");
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var cachedWorkItem = WorkItemManager.get(this._store).getWorkItem(id),
            index,
            workItemFound = false;

        if (fieldName === TaskBoardModel.ORDER_BY_NAME) {
            // Use the field that was configured for ordering.
            fieldName = this._orderByField;
        }

        if (cachedWorkItem) {
            cachedWorkItem.setFieldValue(fieldName, newValue);
            workItemFound = true;
        }

        // Also change the field in the payload
        if (this._fieldData.hasOwnProperty("" + id)) {
            // Lookup the payload column index.
            index = this._lookupPayloadColumnIndex(fieldName);

            this._fieldData[id][index] = newValue;
            workItemFound = true;
        }

        if (!workItemFound) {
            throw new Error(Utils_String.format(TaskboardResources.Error_WorkItemNotLoaded, id));
        }
    }

    /**
     * Removes data from the model
     * 
     * @param id The work item ID
     */
    public removeData(id: number): boolean {
        var existingData = this._fieldData[id];
        if (typeof existingData !== 'undefined') {
            delete this._fieldData[id];
            return true;
        }

        return false;
    }

    /**
     * Associates an error with the provided work item id.
     * 
     * @param id Id of the work item to associate the error with.
     * @param error Error object.
     */
    public setWorkItemError(id: number, error: Error): void {

        Diag.Debug.assertParamIsNumber(id, "id");
        Diag.Debug.assertParamIsObject(error, "error");

        this._workItemErrors[id] = error;
    }

    /**
     * Clear any errors associated with the work item.
     * 
     * @param id Id of the work item to clear the error for.
     */
    public clearWorkItemError(id: number): void {

        Diag.Debug.assertParamIsNumber(id, "id");

        delete this._workItemErrors[id];
    }

    /**
     * Gets error message associated with the provided work item ID.
     * 
     * @param id Id of the work item to get the error for.
     * @return The error message or undefined if one is not associated with the work item.
     */
    public getWorkItemErrorMessage(id: number): string {

        Diag.Debug.assertParamIsNumber(id, "id");

        var workItem,
            invalidFields,
            error = this._workItemErrors[id],
            errorText;

        // If there was an error associated with the work item, use it.
        if (error) {
            errorText = VSS.getErrorMessage(error);
        }
        else {
            // Get the error from the work item.
            workItem = WorkItemManager.get(this._store).getWorkItem(id);
            Diag.Debug.assertIsObject(workItem, "Could not find work item associated with id: " + id);

            invalidFields = workItem.getInvalidFields(true);

            // If the work item has invalid fields, get the error for the field.
            if (invalidFields && invalidFields.length > 0) {
                errorText = invalidFields[0].getErrorText();
            }
            else if (workItem.hasError()) {
                // The work item has an error associated with it, so display the error.
                errorText = VSS.getErrorMessage(workItem.getError());
            }
        }

        return errorText;
    }

    /**
     * Sets overrides on the provided fields.
     * 
     * @param id Id of the work item overrides are being set for.
     * @param overrides Object that maps field refnames to their new value
     */
    public setOverrideValues(id: number, overrides: IDictionaryStringTo<any>): void {

        Diag.Debug.assertParamIsNumber(id, "id");
        Diag.Debug.assertParamIsObject(overrides, "overrides");

        Diag.Debug.assert(!Boolean(this._fieldOverrides[id]), "InvalidOperationException: Field Overrides already exist for id '" + id + "'.");

        this._fieldOverrides[id] = overrides;
    }

    /**
     * Clears any override values set for the provided work item id.
     * 
     * @param id Id of the work item overrides are being cleared for.
     */
    public clearOverrideValues(id: number): void {

        Diag.Debug.assertParamIsNumber(id, "id");

        delete this._fieldOverrides[id];
    }

    /**
     * Clears any data that the model has cached about the work item state.  This includes field overrides and error information.
     * 
     * @param id Id of the work item to clear state for.
     */
    public clearWorkItemSavedState(id: number): void {

        Diag.Debug.assertParamIsNumber(id, "id");

        this.clearOverrideValues(id);
        this.clearWorkItemError(id);
    }

    /**
     *     Gets the set of valid transitions for the work item type of the work item provided.
     *     returns object in the format:
     *     result = {
     *         "[from state]": ["valid to state", ...],
     *         ...
     *     }
     * 
     * @param id 
     *     Id of the work item transitions are being looked up for.
     * 
     * @return 
     */
    public getValidTransitions(id: number): IDictionaryStringTo<string[]> {
        if (this._stateTransitionData) {
            var workItemTypeName = <string>this.getFieldValue(id, DatabaseCoreFieldRefName.WorkItemType);
            var workItemTransitions = this._stateTransitionData.transitions[AgileUtils.WorkItemUtils.getKeyFromWorkItemTypeName(workItemTypeName)];
            return workItemTransitions;
        }
        return null;
    }

    /**
     *     Gets the set of valid transitions for the work item type of the work item provided and for the current state.
     *     returns object in the format
     *     result = ["valid state 1", "valid state 2", ...]
     * 
     * @param id 
     *     Id of the work item transitions are being looked up for.
     * 
     * @param currentState 
     *     current state of the work item
     * 
     * @return 
     */
    public getValidStateTransitions(id: number, currentState: string): string[] {
        var validWorkItemTransitions = this.getValidTransitions(id);

        currentState = currentState.trim();

        if (validWorkItemTransitions) {
            var stateValues = Object.keys(validWorkItemTransitions);
            for (var i = 0, length = stateValues.length; i < length; i++) {
                if (Utils_String.localeIgnoreCaseComparer(stateValues[i], currentState) === 0) {
                    var validStateTransitions = validWorkItemTransitions[stateValues[i]].slice();
                    validStateTransitions = validStateTransitions.concat(currentState);
                    return validStateTransitions.sort(Utils_String.localeIgnoreCaseComparer);
                }
            }
        }
        return [currentState];
    }

    /**
     *     Gets an array of child work item IDs of parent "id".
     * 
     * @return 
     */
    public getChildWorkItemIdsByParent(id: number): number[] {

        // If we have a cached work items list, return it.
        if (!this._childrenLookupTable) {
            this._buildChildParentCaches();
        }
        return this._childrenLookupTable[id];
    }

    /**
     * Gets an array of child work item IDs.
     */
    public getChildWorkItemIds(): number[] {
        // If we have a cached work items list, return it.
        if (!this._childWorkItemIds) {
            this._buildChildParentCaches();
        }

        return this._childWorkItemIds;
    }

    public clearChildrenLookupTable() {
        this._childrenLookupTable = null;
        this._childWorkItemIds = null;
    }

    /**
     * Set the state of orphan tasks
     */
    public setOrphanTasksFlag(flag: boolean): void {
        this._hasOrphanTasks = flag;
    }

    /**
     * Clears child lookup table and child work item id list associated with the given parent id
     * @param parentId parent work item id
     */
    public clearChildLookupTableAndIdList(parentId: number) {
        const childIds = this._childrenLookupTable[parentId];
        if (childIds) {
            childIds.forEach(id => {
                this._childWorkItemIds.splice(this._childWorkItemIds.indexOf(id), 1);
            });

            delete this._childrenLookupTable[parentId];
        }
    }

    /**
     * Remove the given id associated with the given parent id. Return true if remove successful.
     * 
     * @param idToRemove work item id to remove
     * @param parentId parent work item id
     */
    public removeChildIdFromChildLookupTableAndIdList(idToRemove: number, parentId: number): boolean {
        const index = this._childWorkItemIds.indexOf(idToRemove);
        if (index >= 0) {
            this._childWorkItemIds.splice(index, 1);
        }
        return this._removeIdFromChildLookupTable(idToRemove, parentId);
    }

    /**
    * Clears parent lookup table and id list associated with the given work item
    * 
    * @param parentId parent work item id
    */
    public clearParentLookupTableAndIdList(parentId: number) {

        var index = Utils_Array.indexOf(this._parentWorkItemIds, parentId);
        if (index !== -1) {
            this._parentWorkItemIds.splice(index, 1);
        }

        if (this._parentsLookupTable[parentId]) {
            delete this._parentsLookupTable[parentId];
        }
    }

    /**
     *     Updates the order of items in '_childrenLookupTable' after a reorder operation.
     *  WorkItemId at position where itemId must be added  WorkItemId of the item that needs to be updated  Parent workItemId of nextItem/item 
     */
    public updateChildrenLookupTable(itemId: number, nextItemId: number, parentId: number) {

        var childLookupTable: number[] = this._childrenLookupTable[parentId];
        var removeItemIdFromChildLookupTable: boolean = this._removeIdFromChildLookupTable(itemId, parentId);
        Diag.Debug.assert(removeItemIdFromChildLookupTable, "Expected to find itemId in childLookupTable");
        var targetIndexInTableRow: number = nextItemId ? childLookupTable.indexOf(nextItemId) : childLookupTable.length;
        childLookupTable.splice(targetIndexInTableRow, 0, itemId);
    }

    /**
     * Retrieve the name of the datasource, used in Telemetry.
     */
    public getDataSourceName(): string {
        return TaskBoardModel.DATASOURCE_NAME;
    }

    /**
     * Retrieve the total number of items, including both "parent" and "child" items
     */
    public getItemCount(): number {
        return this.getChildItemCount() + this.getParentItemCount();
    }

    /**
     * Retrieve the set of ids used to index the data.  
     * Includes both "parent" (row) and "child" (tile) elements
     */
    public getIds(): number[] {
        let parentIds: number[] = this._parentWorkItemIds || [];

        // If the "unparented" row exists, include it as a filter-able item
        if (this.hasOrphanTasks()) {
            parentIds = parentIds.concat([TaskBoardModel.NO_PARENT_ID]);
        }

        return this.getChildWorkItemIds().concat(parentIds);
    }

    /**
     * Retrieves data for a single field from the data provider.
     * @param id Id of item
     * @param fieldName Fieldname to get value for
     */
    public getValue(id: number, fieldName: string): any {
        //team project name is stored in the filter, and does not have a per-item override
        if (fieldName === WITConstants.CoreFieldRefNames.TeamProject) {
            return null;
        }

        // handle "unparented" tile seperately
        if (id === TaskBoardModel.NO_PARENT_ID) {
            if (Utils_String.equals(fieldName, DatabaseCoreFieldRefName.Title, true)) {
                return TaskboardResources.Taskboard_Unparented;
            }
            return null;
        }

        return this.getFieldValue(id, fieldName);
    }

    /**
     * Retrieves the set of visible columns
     */
    public getVisibleColumns(): string[] {
        return this._filterColumns;
    }

    /**
     * Get all unique values from all items for a given field name
     * @param fieldName Field to get values for
     */
    public getUniqueValues(fieldName: string): string[] {
        if (!this._columnsLookupTable[fieldName]) {
            return [];
        }
        const ids: number[] = this.getIds();
        const rawValues: any[] = ids.map((id) => this.getValue(id, fieldName)).filter((val) => (val !== null) && (val !== ""));

        //expand and de-dupe tags
        if (Utils_String.equals(fieldName, DatabaseCoreFieldRefName.Tags, true)) {
            const tagValues: IDictionaryStringTo<boolean> = {};
            for (const raw of rawValues) {
                const tags = TagUtils.splitAndTrimTags(raw);
                for (const tag of tags) {
                    tagValues[tag] = true;
                }
            }
            return Utils_Array.uniqueSort(Object.keys(tagValues), Utils_String.localeIgnoreCaseComparer);
        }

        return Utils_Array.uniqueSort(rawValues, Utils_String.localeIgnoreCaseComparer);
    }

    /**
     * Return the FilterManager to be used by the Hub Filter
     */
    public getFilterManager(): FilterManager {
        return this._filterManager;
    }


    /**
     *     Updates the order of items in '_childrenLookupTable' after a workitem save.
     *  WorkItemId of the item that needs to be updated  Parent workItemId of nextItem/item  Old parent workItemId of the item  
     */
    public updateChildrenLookupTableAfterEdit(itemId: number, newParentId: number, oldParentId?: number) {

        // Remove from oldParentId
        if (oldParentId != null) {
            this._removeIdFromChildLookupTable(itemId, oldParentId);
        }
        else {
            for (var id in this._childrenLookupTable) {
                if (this._removeIdFromChildLookupTable(itemId, Number(id))) {
                    break;
                }
            }
        }

        // newParentId is null if workitem is removed from taskboard, 0 if unparented
        if (newParentId == null) {
            this._childWorkItemIds.splice(this._childWorkItemIds.indexOf(itemId), 1);
            return;
        }

        var childLookupTable: number[] = this._childrenLookupTable[newParentId];
        if (childLookupTable.length === 0) {
            childLookupTable.push(itemId);
        }
        else {
            var tileSortValue: number = this.getFieldValue(itemId, TaskBoardModel.ORDER_BY_NAME) || Number.MAX_VALUE;
            var insertIndex: number = childLookupTable.length;
            $.each(childLookupTable, (index, workItemId) => {
                var iterationTileSortValue = this.getFieldValue(workItemId, TaskBoardModel.ORDER_BY_NAME) || Number.MAX_VALUE;
                if ((tileSortValue < iterationTileSortValue) ||
                    (tileSortValue === iterationTileSortValue && itemId < workItemId)) {
                    insertIndex = index;
                    return false;
                }

            });
            childLookupTable.splice(insertIndex, 0, itemId);
        }
    }

    private _removeIdFromChildLookupTable(id: number, parentId: number): boolean {
        var childLookupTable: number[] = this._childrenLookupTable[parentId];
        var itemIndex: number = childLookupTable.indexOf(id);
        if (itemIndex < 0) {
            return false;
        }
        childLookupTable.splice(itemIndex, 1);
        return true;
    }

    /**
     * Gets the Child Work Ids that are assigned to the specified person
     *
     * @param person - Uniqueified Name that identifies the person
     */
    public getPeopleChildrenLookupTable(): IDictionaryStringTo<number[]> {
        let peopleChildrenLookupTable = {};
        let childWorkItems: number[] = this.getChildWorkItemIds();
        let classification: IClassification = this._getClassificationProvider(TaskboardGroupBy.PEOPLE_CLASSIFICATION);

        for (let id of childWorkItems) {
            let assignedTo: string = this.getFieldValue(id, classification.getPivotField()) || TaskBoardModel.NULL_PIVOT_KEY;
            assignedTo = assignedTo.toUpperCase();

            if (!peopleChildrenLookupTable[assignedTo]) {
                peopleChildrenLookupTable[assignedTo] = [];
            }
            peopleChildrenLookupTable[assignedTo].push(id);
        }

        return peopleChildrenLookupTable;
    }

    private _buildChildParentCaches(): void {
        var tempResult = [],
            prop,
            fieldData,
            parentLookup,
            fieldName,
            parents,
            id,
            parentOrderOnBoard,
            i, l;

        this._childrenLookupTable = {};
        parents = this._parentWorkItemIds;
        parentLookup = {}; // build a lookup between parent WI ID and its order
        parentOrderOnBoard = 0;

        if (this.hasOrphanTasks()) {
            // parentLook up is used for setting 'parent' in the tempResult below
            // which is used for sorting the child work items. To make sure that 
            // orphan task work items appear before the others, add the entry 0 to parentLookup.
            parentLookup[0] = parentOrderOnBoard;
            parentOrderOnBoard += 1;
        }

        for (i = 0, l = parents.length; i < l; i += 1, parentOrderOnBoard += 1) {
            var parentId = parents[i];
            parentLookup[parentId] = parentOrderOnBoard;
            this._childrenLookupTable[parentId] = [];
        }
        this._childrenLookupTable[0] = []; // For unparented children

        fieldName = this._getClassificationProvider(TaskboardGroupBy.PARENT_CLASSIFICATION).getPivotField();

        var idField = this._columnsLookupTable[DatabaseCoreFieldRefName.Id];
        // Add each of the child work item ids and order by fields to the array.
        fieldData = this._fieldData;
        for (prop in fieldData) {
            // If this is not one of the parent work items, add it to the list.
            if (!this.isParentId(prop)) {
                id = fieldData[prop][idField];
                tempResult.push({
                    parentId: this.getFieldValue(id, fieldName),
                    parent: parentLookup[this.getFieldValue(id, fieldName)],
                    id: id,

                    // Ensure that tiles without an order field value get pushed to the end of the list
                    orderByValue: this.getFieldValue(id, TaskBoardModel.ORDER_BY_NAME) || Number.MAX_VALUE
                });
            }
        }

        // Order by the order by value and ID.
        tempResult.sort(function (a, b) {
            var compareA,
                compareB;

            // If the order by values are equal, compare based on ID.
            if (a.parent === b.parent) {
                if (a.orderByValue === b.orderByValue) {
                    compareA = a.id;
                    compareB = b.id;
                }
                else {
                    compareA = a.orderByValue;
                    compareB = b.orderByValue;
                }
            }
            else {
                compareA = a.parent;
                compareB = b.parent;
            }
            return (compareA > compareB) ? 1 : ((compareA < compareB) ? -1 : 0);
        });

        // Build the result array with just the child ids.
        var result: number[] = [];
        for (i = 0, l = tempResult.length; i < l; i += 1) {
            result.push(tempResult[i].id);

            var index = tempResult[i].parentId || 0;
            if (!this._childrenLookupTable[index]) {
                this._childrenLookupTable[index] = [];
            }
            this._childrenLookupTable[index].push(tempResult[i].id);
        }

        // Cache the list of work item ids.
        this._childWorkItemIds = result;
    }

    /**
     *     Returns true if the id is for a parent work item and false otherwise.
     * 
     * @param id id of workitem
     * @return 
     */
    public isParentId(id: number): boolean {

        return this._parentsLookupTable.hasOwnProperty("" + id);
    }

    /**
     * Checks whether the state field is complete
     * 
     * @param id Id of the work item we are evaluating
     * @return True if the state field is mapped to complete metastate, otherwise false
     */
    public isStateComplete(id: number): boolean {

        let stateValue = this.getFieldValue(id, DatabaseCoreFieldRefName.State);
        let workItemType = this.getFieldValue(id, DatabaseCoreFieldRefName.WorkItemType);
        let metaState = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStateCategory(workItemType, stateValue);

        //return true if the work item state maps to the complete metastate, false otherwise
        switch (metaState) {
            case WorkItemStateCategory.Completed:
                return true;

            case WorkItemStateCategory.Proposed:
            case WorkItemStateCategory.InProgress:
            case WorkItemStateCategory.Resolved:
                return false;

            default:
                return false;
        }
    }



    /**
     * Checks if the given work item has active child tasks
     * 
     * @param id Id of the parent work item we are evaluating
     * @return True/false
     */
    public hasActiveChildItems(parentId: number): boolean {
        // check if this is a parent work item    
        if (this.isParentId(parentId)) {
            var id;
            var childWorkItemIds = this.getChildWorkItemIdsByParent(parentId);

            for (var i = 0; i < childWorkItemIds.length; i++) {
                id = childWorkItemIds[i];
                // if this item is a child of the provided parent work item and is not complete
                if (!this.isStateComplete(id)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
    * Checks if the given work item has children
    * 
    * @param id Id of the parent work item we are evaluating
    * @return true if the given item has child. false otherwise
    */
    public hasChildren(parentId: number): boolean {
        if (this.isParentId(parentId)) {
            var childWorkItemIds = this.getChildWorkItemIdsByParent(parentId);
            if (childWorkItemIds && childWorkItemIds.length > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     *     Updates the rollup information (count and effort) to include the data for the provided work item
     *             pivotRollupResult: {
     *                 [pivot key]: {
     *                     [metastate]:  { count, rollup}
     *                   }
     *              }
     * 
     * @param rollupResult The rollup result object to be updated
     * @param pivot The pivot in the rollup result whose stats need to be updated 
     * @param id The work item id being evaluated for the rollup update 
     * @param state The work item state 
     * @param remainingwork The remaining work in the work item
     */
    private _updatePivotRollupByMetaState(pivotRollupResult: IDictionaryStringTo<IRollupByMetaState>, pivot: any, id: number, state: string, remainingWork: number): void {
        Diag.Debug.assertIsObject(pivotRollupResult, "pivotRollupResult");

        //get the rollup for the specific pivot
        if (!pivotRollupResult[pivot]) {
            pivotRollupResult[pivot] = { rollup: {} };
        }
        var rollupMetaStateData = pivotRollupResult[pivot];

        //update the rollup only if the provided id is a child
        if (!this.isParentId(id)) {

            let workItemType = this.getFieldValue(id, DatabaseCoreFieldRefName.WorkItemType);
            let metaStateValue = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStateCategory(workItemType, state);

            if (!rollupMetaStateData.rollup[metaStateValue]) {
                rollupMetaStateData.rollup[metaStateValue] = { remainingWork: 0, workItemCount: 0 };
            }

            rollupMetaStateData.rollup[metaStateValue].workItemCount++;
            rollupMetaStateData.rollup[metaStateValue].remainingWork += remainingWork;
        }
    }


    /**
     *     Calculate the rollup for the provided classification type.  The result
     *     will be in the format:
     *         result = {
     *             HorizontalRollup: {
     *                 [field value]: [rollup]
     *                 ...
     *             }
     *             VerticalRollup: {
     *                 [field value]: [rollup]
     *                 ...
     *             }
     *             PivotRollupByMetaState: {
     *                 [pivot key]: {
     *                     [metastate]:  { count, rollup}
     *                   }
     *              }
     *         }
     * 
     * @param classificationType 
     *     The type of classification.  Valid values for classification are
     *     exposed as TaskBoardView.*_CLASSIFICATION
     * 
     * @return 
     */
    public calculateRollup(classificationType: string): IRollup {

        Diag.Debug.assertParamIsString(classificationType, "classificationType");

        var prop,
            id,
            remainingWork: number,
            stateValue: string,
            pivotValue: any, //string for people classification, number for parent classification
            result: IRollup = {
                horizontalRollup: {},
                verticalRollup: {},
                pivotRollupByMetaState: {}
            };

        var idField = this._columnsLookupTable[DatabaseCoreFieldRefName.Id];

        // Lookup the remaining work for each of the data rows we have.
        for (prop in this._fieldData) {
            if (this._fieldData.hasOwnProperty(prop)) {
                id = this._fieldData[prop][idField];

                if (!this.isParentId(id) && this.isItemVisible(id)) {

                    remainingWork = parseFloat(this.getFieldValue(id, TaskBoardModel.WORK_ROLLUP_NAME)) || 0;
                    stateValue = <string>this.getFieldValue(id, DatabaseCoreFieldRefName.State);
                    pivotValue = this.getPivotFieldValue(id, classificationType);

                    // only add rollups for work items with a state that appears on the taskboard
                    if (this._states[stateValue]) {

                        if (remainingWork) {
                            // Add the rollup for the state.
                            result.horizontalRollup[stateValue] = (result.horizontalRollup[stateValue] || 0) + remainingWork;

                            // Add the rollup for the pivot field.
                            result.verticalRollup[pivotValue] = (result.verticalRollup[pivotValue] || 0) + remainingWork;
                        }

                        this._updatePivotRollupByMetaState(result.pivotRollupByMetaState, pivotValue, id, stateValue, remainingWork);
                    }
                }
            }
        }

        return result;
    }



    /**
     *     Gets the classification data for the provided classification type.
     *     Returns an array of classification data items.  A classification
     *     data item has the following structure:
     *         {
     *             templateId: [Work Item ID to use in generating header information for the classification],
     *             pivotKey: [Unique Key which identifies the classification]
     *         }
     * 
     * @param classificationType 
     *     The type of classification.  Valid values for classification are
     *     exposed as TaskBoardView.*_CLASSIFICATION
     * 
     * @return 
     */
    public getClassification(classificationType: string): IClassificationData[] {

        Diag.Debug.assertParamIsString(classificationType, "classificationType");

        var provider = this._getClassificationProvider(classificationType);
        return provider.getClassification();
    }

    /**
     * Gets the value of the pivot field for the provided classification type.
     * @param id ID of the work item to get the field value from.
     * @param classificationType The type of classification. Valid values for classification are exposed as TaskBoardView.*_CLASSIFICATION
     * @param isNewParent Is this a new parent row?
     */
    public getPivotFieldValue(id: number, classificationType: string, isNewParent: boolean = false) {
        const provider = this._getClassificationProvider(classificationType);
        let pivotValue = this.getFieldValue(id, provider.getPivotField());

        if (!provider.isValidPivot(pivotValue)) {
            if (isNewParent) {
                pivotValue = TaskBoardModel.NEW_ROW_PIVOT_KEY;
            } else {
                pivotValue = TaskBoardModel.NULL_PIVOT_KEY;
            }
        }

        return pivotValue;
    }

    /**
     *     Gets the display name for the pivot field for the provided classification type.
     * 
     * @param classificationType 
     *     The type of classification.  Valid values for classification are
     *     exposed as TaskBoardView.*_CLASSIFICATION
     * 
     */
    public getPivotFieldDisplayName(classificationType: string): string {

        Diag.Debug.assertParamIsString(classificationType, "classificationType");

        var provider = this._getClassificationProvider(classificationType);
        return provider.getPivotFieldDisplayName();
    }

    /**
     * Formats the remaining work for the view. This should be moved to TaskBoardView
     * 
     * @param work 
     * @return The formatted summary work string
     */
    public formatRemainingWork(work: string): string {
        var formattedWork = '';
        if (work && work !== "0") {
            formattedWork = this._remainingWorkFormat;
            formattedWork = formattedWork.replace('{0}', work);
        }

        return formattedWork;
    }

    /**
     * Get the current filter value
     */
    public getFilter(): WITOM.IFieldValueDictionary {
        return this._filter;
    }

    /**
     * set the filter value for filtering tasks
     * 
     * @param filter The filter to apply, as a dictionary of field reference names to values.
    *  If the parameter is null the filter will be cleared, and if all filter values are null the filter will be cleared.
     */
    public setFilter(filter: WITOM.IFieldValueDictionary) {

        var fieldRefName: string;

        if (filter) {
            // determine whether we have any non-null filter values otherwise clear the filter
            for (fieldRefName in filter) {
                if (filter.hasOwnProperty(fieldRefName) && filter[fieldRefName] !== TaskBoardModel.ALL_VALUE) {
                    this._filter = filter;
                    return;
                }
            }
        }

        // didn't find a non-null filter
        this._filter = null;
    }

    /**
     * Get the current group filter value
     */
    public getGroupFilter() {
        return this._groupFilter;
    }

    /**
     * Set the group filter value for filtering tasks
     * 
     * @param filter The filter to apply.
     */
    public setGroupFilter(filter: any) {
        this._groupFilter = filter;

    }

    /**
     * Returns true if the model has visible items
     */
    public hasVisibleIds(): boolean {
        return Object.keys(this._visibleIds).length > 0;
    }

    /**
     * Set the Ids that should be visible
     * @param ids The Id's of the currenctly stored items that should be visible
     */
    public setVisibleIds(ids: number[]): void {
        Diag.Debug.assertParamIsArray(ids, "ids");
        this._visibleIds = ids.reduce((dict, id) => {
            dict[id] = id;
            return dict;
        }, {});
    }

    /**
     * Use the FilterManager to reset the current set of visibleIds
     */
    public refreshVisibleIds(): void {
        if (this._filterManager) {
            this.setVisibleIds(this._filterManager.filter());
        }
    }

    /**
     *  Checks whether the specified item is supposed to be visible
     * @param id The Id of the item to be checked
    */
    public isItemVisible(id: number): boolean {
        return this._visibleIds[id] != null;
    }

    public isUserRowVisible(user: string, children: number[]): boolean {
        if (!this._filterManager) {
            return true;
        }

        // Only render the row if it has visible "child" items
        return this._tilesAreVisible(children);

    }

    /**
     * A "parent" or row will be visible from Hub Filtering if the row is visible or if any of its "children" are visible
     * @param id 
     */
    public isStoryRowVisible(id: number): boolean {
        Diag.Debug.assertParamIsNumber(id, "id");

        const children = this.getChildWorkItemIdsByParent(id);
        if (this._tilesAreVisible(children)) {
            return true
        }

        return this.isItemVisible(id);
    }

    private _tilesAreVisible(ids: number[]): boolean {
        if (ids != null) {
            for (const childId of ids) {
                if (this.isItemVisible(childId)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Determines whether a work item matches the current filter.
     * Return true if it matches, false otherwise. NB all tiles match the null filter
     * 
     * @param id The work item id
     * @return 
     */
    public matchesFilter(id: number): boolean {

        Diag.Debug.assertParamIsNumber(id, "id");

        var filter: WITOM.IFieldValueDictionary = this._filter,
            fieldRefName: string;

        //If item has been filtered out by HubFilter, return false
        if (this._useNewTaskboardDisplay && this._filterManager.filter().indexOf(id) === -1) {
            return false;
        }

        if (!filter) {
            return true;  // no filter, so all tiles are shown
        }
        else {
            // check each field in the filter. If ANY of them match, then return true
            for (fieldRefName in filter) {
                if (filter.hasOwnProperty(fieldRefName) && ((this.getFieldValue(id, fieldRefName) || "") === filter[fieldRefName])) {
                    return true;
                }
            }
            // we have a filter, but no match
            return false;
        }
    }

    /**
     * Applies the current filter values to the work item
     * 
     * @param workItem The work item to apply the filter values to
     */
    public applyFilterValues(workItem: WITOM.WorkItem): void {

        Diag.Debug.assertParamIsObject(workItem, "workItem");

        var filter: WITOM.IFieldValueDictionary = this._filter,
            fieldRefName: string,
            field: WITOM.Field;

        if (filter) {
            for (fieldRefName in filter) {
                if (filter.hasOwnProperty(fieldRefName) && Boolean(filter[fieldRefName])) {
                    field = workItem.getField(fieldRefName);
                    if (field) {
                        field.setValue(filter[fieldRefName]);
                    }
                }
            }
        }
    }

    /**
     * Return the people list to use in filter
     */
    public getPeopleValues(includeParentValues?: boolean): string[] {
        var i, l, IdList = this.getChildWorkItemIds(),
            peopleLookup = this._peopleLookup,
            values: string[] = [],
            fieldName = this._filterField,
            fieldValue,
            filter,
            filterValue;

        // merge in all names of people that have work assigned to them
        for (i = 0, l = IdList.length; i < l; i += 1) {
            fieldValue = this.getFieldValue(IdList[i], fieldName);
            if (fieldValue && !peopleLookup.hasOwnProperty(fieldValue)) {
                peopleLookup[fieldValue] = true;
            }
        }

        // merge in all names of people that have PBI items assigned to them
        if (includeParentValues) {
            for (i = 0, l = this._parentWorkItemIds.length; i < l; i++) {
                fieldValue = this.getFieldValue(this._parentWorkItemIds[i], fieldName);
                if (fieldValue && !peopleLookup.hasOwnProperty(fieldValue)) {
                    peopleLookup[fieldValue] = true;
                }
            }
        }

        // ensure the current filter value is in the list
        filter = this.getFilter() || {};
        filterValue = filter[fieldName];
        if (filterValue && filterValue !== TaskBoardModel.ALL_VALUE && filterValue !== TaskBoardModel.UNASSIGNED_VALUE && !peopleLookup.hasOwnProperty(filterValue)) {
            // we have a stale value in the filter - clear it
            this.setFilter(null);
        }

        // turn the people lookup into an array of values
        for (fieldName in peopleLookup) {
            if (peopleLookup.hasOwnProperty(fieldName)) {
                values.push(fieldName);
            }
        }

        return values;
    }

    public getFilterValues(removeTheAllOption?: boolean, includeParentValues?: boolean): string[] {
        var values = this.getPeopleValues(includeParentValues);
        values.sort();
        if (!removeTheAllOption) {
            values.splice(0, 0, TaskboardResources.Taskboard_FilterValue_All, WITResources.AssignedToEmptyText);
        }
        else {
            values.splice(0, 0, WITResources.AssignedToEmptyText);
        }
        return values;
    }

    /**
     *  Tells whether the payload for this page has orphan tasks or not 
     */
    public hasOrphanTasks(): boolean {
        var id, parentId;
        var parentIdField = this._columnsLookupTable[TaskBoardModel.PARENTID_FIELDNAME];
        var idField = this._columnsLookupTable[DatabaseCoreFieldRefName.Id];

        if (this._hasOrphanTasks === null) {
            for (var prop in this._fieldData) {
                if (this._fieldData.hasOwnProperty(prop)) {
                    id = this._fieldData[prop][idField];
                    if (!this.isParentId(id)) {
                        parentId = this._fieldData[prop][parentIdField];
                        if (parentId === 0) {
                            this._hasOrphanTasks = true;
                            break;
                        }
                    }
                }
            }
            if (!this._hasOrphanTasks) {
                this._hasOrphanTasks = false;
            }
        }

        return this._hasOrphanTasks;
    }

    public hasNestedTasks(): boolean {
        return this._hasNestedTasks;
    }

    public get reorderBlockingWorkItemIds(): number[] {
        return this._reorderBlockingWorkItemIds;
    }

    public dispose() {
        this.getWorkItemManager().detachWorkItemChanged(this._handleWorkItemChangedDelegate);
    }

    /**
     * Initializes the task board model with its data
     * 
     * @param options The data source used to populate the model
     */
    private _initialize(options: ITaskboardModelOptions): void {
        Diag.Debug.assert(options !== null, "NullReference: data");

        this._team = options.team;

        var that = this,
            i, l,
            value,
            filter: WITOM.IFieldValueDictionary = {},
            columns;

        this._fieldData = options.payload.data;
        this._remainingWorkFormat = options.remainingWorkFormat;
        this.tfsContext = options.tfsContext || TfsContext.getDefault();
        this.states = <string[]>options.states; // copy the array
        this._workRollupField = options.workRollupField;
        this._orderByField = <string>options.orderByField;
        this._parentNamePlural = <string>options.parentNamePlural;

        if ($.isArray(this.states)) {
            this.stateKeys = this.states.map(state => state.toLocaleLowerCase());
        }

        this._stateTransitionData = null;

        if (options.transitions) {
            this._stateTransitionData = {
                transitions: options.transitions
            };
            this._normalizeTransitions();
        }

        if (!this._stateTransitionData &&
            FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessAgileTaskboardDelayloadStateTransitions)) {

            TaskBoardStateTransitionDataHelper.beginGetStateTransitions().then((stateTransitionData) => {
                this._stateTransitionData = stateTransitionData;
                this._normalizeTransitions();
            });
        }

        this._parentWorkItemIds = <number[]>options.parentIds;
        this._store = TFS_OM_Common.ProjectCollection.getConnection(this.tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        this._teamField = {
            refName: options.teamFieldRefName,
            defaultValue: options.teamFieldDefaultValue
        };
        this._childWorkItemTypes = <string[]>options.childWorkItemTypes;
        this._workItemErrors = {};
        this._fieldDefMap = {};
        this._hasNestedTasks = (options.hasNestedTasks === true);
        this._reorderBlockingWorkItemIds = options.reorderBlockingWorkItemIds;
        this._fieldMap = {};

        // Initializing field definitions
        if (options.fieldDefinitions) {
            Util_Cards.initializeFieldDefinitions(options.fieldDefinitions, this._fieldDefMap);
        }

        // Get filter values
        if (options.filters && options.filters.length > 0) {
            this._peopleList = options.filters[0].values;
            this._filterField = options.filters[0].fieldName;
            filter[this._filterField] = (options.filters[0].selectedValue === null ? TaskBoardModel.ALL_VALUE : options.filters[0].selectedValue);
            this.setFilter(filter);

            // set the group filter that was saved
            if (options.filters.length > 1) {
                this.setGroupFilter(options.filters[1]);
            }
        }
        else {
            this._peopleList = [];
            this._peopleLookup = {};
            this._filterField = "";
        }
        this._buildPeopleLookup(this._peopleList);

        // build state map for quick lookup
        this._states = {};
        jQuery.each(options.states, function (index, val: string) {
            that._states[val] = val;
        });

        // Build the columns lookup table.  This is used in looking 
        // up field values from the field data.
        columns = options.payload.columns;
        this._filterColumns = [
            DatabaseCoreFieldRefName.AssignedTo,
            DatabaseCoreFieldRefName.State,
            DatabaseCoreFieldRefName.Tags,
            DatabaseCoreFieldRefName.Title,
            DatabaseCoreFieldRefName.WorkItemType
        ].filter(field => columns.indexOf(field) !== -1).concat([TaskBoardModel.WORK_ROLLUP_NAME]);
        this._columnsLookupTable = {};
        for (i = 0, l = columns.length; i < l; i += 1) {
            this._columnsLookupTable[columns[i]] = i;
        }

        // Build the parents lookup table.  This is used to determine
        // if an id is for a parent work item.
        this._parentsLookupTable = {};
        for (i = 0, l = options.parentIds.length; i < l; i += 1) {
            value = options.parentIds[i];
            this._parentsLookupTable[value] = value;
        }

        // Initialize an empty set of field overrides.  This will be an
        // associative array mapping a work item id to the fields being overridden.
        this._fieldOverrides = {};

        // Add the classification providers.
        this._classificationProviders = {};
        this._classificationProviders[TaskboardGroupBy.PARENT_CLASSIFICATION] = new ParentClassification(this);
        this._classificationProviders[TaskboardGroupBy.PEOPLE_CLASSIFICATION] = new PeopleClassification(this);

        // Listen for work items being saved so we can add the details of the parentId into the internal cache
        this._handleWorkItemChangedDelegate = delegate(this, this._handleWorkItemChanged);
        this.getWorkItemManager().attachWorkItemChanged(this._handleWorkItemChangedDelegate);

        //initialze hub filter dependencies
        if (this._useNewTaskboardDisplay) {
            this._initializeFilterManager();
        }
        this.setVisibleIds(Object.keys(this._fieldData).map(Number));
    }

    private _initializeFilterManager() {
        this._filterManager = new FilterManager(this);
        this._filterManager.clearFilterProviders();
        this._filterManager.registerFilterProvider(TextFilterProvider.PROVIDER_TYPE, new TextFilterProviderWithUnassigned());
        this._filterManager.registerFilterProvider(DatabaseCoreFieldRefName.WorkItemType, new FieldFilterProvider(DatabaseCoreFieldRefName.WorkItemType));
        this._filterManager.registerFilterProvider(DatabaseCoreFieldRefName.State, new FieldFilterProvider(DatabaseCoreFieldRefName.State));
        this._filterManager.registerFilterProvider(DatabaseCoreFieldRefName.AssignedTo, new AssignedToFilterProvider());
        this._filterManager.registerFilterProvider(DatabaseCoreFieldRefName.Tags, new TagsFilterProvider());
        this._filterManager.activate();
    }

    /**
     * Check if a workItem exists on the taskboard
     * @param id 
     */
    public isWorkItemOnTheBoard(id: number): boolean {
        return this._fieldData && !!this._fieldData[id];
    }

    private _handleWorkItemChanged(sender, args: IWorkItemChangedArgs) {
        Diag.Debug.assertParamIsObject(args, "args");
        Diag.Debug.assertParamIsObject(args.workItem, "args.workItem");

        const workItem = args.workItem;

        if (args.change === WorkItemChangeType.Saved) {

            // Prevent the work item from being cleared from the work item manager's cache.
            // Once work item has been edited we take the field values from the cached work item instead
            // of the initial payload sent to the page.
            // Without pinning the work item, the item could be cleared from the cache and we
            // fall back to the payload values which could be different.
            this.getWorkItemManager().pin(workItem);

            this._cacheWorkItem(workItem);
        }
    }

    /**
     * Normalize the keys in the Transitions objects to have lower case state names
     */
    private _normalizeTransitions() {
        if (this._stateTransitionData && this._stateTransitionData.transitions) {
            for (var wit of Object.keys(this._stateTransitionData.transitions)) {
                for (var state of Object.keys(this._stateTransitionData.transitions[wit])) {
                    this._stateTransitionData.transitions[wit][state.toLocaleLowerCase()] = this._stateTransitionData.transitions[wit][state];
                }
                this._stateTransitionData.transitions[AgileUtils.WorkItemUtils.getKeyFromWorkItemTypeName(wit)] = this._stateTransitionData.transitions[wit];
            }
        }
    }

    /**
     * Build the internal lookup collection of people who are in the team or
     * have had work assigned to them during the lifespan of this page.
     * 
     * @param people The initial array of people to setup in the associative object
     */
    private _buildPeopleLookup(people: string[]): void {
        Diag.Debug.assertParamIsArray(people, "people");

        var lookup: IDictionaryStringTo<boolean> = this._peopleLookup = {};

        jQuery.map(people, function (name: string) {
            lookup[name] = true; // any dummy value will do. We only care about the property name existing
        });
    }

    private _lookupPayloadColumnIndex(fieldName: string): number {
        /// <summary>Looks up the Payload Column Index for the fieldName</summary>
        /// <param name="fieldName" type="String">The field name to look for</param>
        /// <returns type="Number">
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        // Lookup the payload column index.
        var index = this._columnsLookupTable[fieldName];

        if (typeof (index) === "undefined") {
            throw new Error(Utils_String.format(TaskboardResources.Error_FieldNotLoaded, fieldName));
        }

        return index;
    }

    /**
     * Gets the value of the field from the work item.
     * 
     * @param id Id of the work item to get the field from.
     * @param fieldName Name of the field to get from the work item.
     * @return 
     */
    private _getOverrideValue(id: number, fieldName: string): any {

        Diag.Debug.assertParamIsNumber(id, "id");
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var overrides = this._fieldOverrides[id];

        // If we have overrides for the work item, see if the requested field is overridden.
        return overrides ? overrides[fieldName] : undefined;
    }

    /**
     *     Gets the classification provider for the provided classification type.
     * 
     * @param classificationType 
     *     The type of classification.  Valid values for classification are
     *     exposed as TaskBoardView.*_CLASSIFICATION
     * 
     */
    public _getClassificationProvider(classificationType: string): IClassification {
        var provider = this._classificationProviders[classificationType];
        return provider;
    }

    /**
     * Ensure a work item is in the model's cache.
     * @param workItem The work item to ensure is in the cache
     */
    private _cacheWorkItem(workItem: WITOM.WorkItem): void {
        Diag.Debug.assertParamIsObject(workItem, "workItem");

        let data = this._fieldData[workItem.id];
        let parentId: number = 0; // 0 is the default for work items with no parents

        // check if we already have this work item in the cache
        if (!data) {
            data = [];

            // set the cached data from the work item
            let columns: IDictionaryStringTo<number> = this._columnsLookupTable;
            for (let column in columns) {
                if (columns.hasOwnProperty(column)) {
                    let field = workItem.getField(column);
                    data[columns[column]] = (field ? field.getValue() : null);
                }
            }

            // set ParentId by examining the work item links for a "Parent" link and grabbing the target ID
            const classification: IClassification = this._getClassificationProvider(TaskboardGroupBy.PARENT_CLASSIFICATION);
            const parentLink: WITOM.WorkItemLink = AgileUtils.WorkItemUtils.getWorkItemParentLink(workItem);

            // This is a new child item if the type is included in the child work item types
            // If the work item type is not set this is probably a test.
            Diag.Debug.assertIsObject(workItem.workItemType);
            const isNewChild: boolean = Utils_Array.contains(this._childWorkItemTypes, workItem.workItemType.name, Utils_String.ignoreCaseComparer);

            if (parentLink || isNewChild) {
                if (parentLink) {
                    parentId = parentLink.getTargetId();

                    // check if the parent is one of the taskboard listed parents
                    // Related: Bug# 330367
                    if (!this.isParentId(parentId)) {
                        parentId = 0;
                    }
                }

                const index: number = this._columnsLookupTable[classification.getPivotField()];
                data[index] = parentId;

                this.getChildWorkItemIds().push(workItem.id);

                let childWorkItemIdsByParent = this.getChildWorkItemIdsByParent(parentId);
                if (childWorkItemIdsByParent) {
                    // Only if the parent work item is in the current cache, add the child id
                    childWorkItemIdsByParent.push(workItem.id);
                    this._visibleIds[workItem.id] = workItem.id;
                }
            } else {
                // This is a new parent. Set up the properties
                this._parentsLookupTable[workItem.id] = workItem.id;
                this._parentWorkItemIds.unshift(workItem.id);
                this._indexOfUnparentedRow++;
                this._childrenLookupTable[workItem.id] = [];
                this._visibleIds[workItem.id] = workItem.id;
            }

            // save the data in the model's cache
            this._fieldData[workItem.id] = data;
        }
    }

    /**
     * Return the number of parent items on the board.
     */
    public getParentItemCount(): number {
        if (this._parentWorkItemIds) {
            return this._parentWorkItemIds.length;
        }

        return 0;
    }

    /**
     * Return the number of child items on the board.
     */
    public getChildItemCount(): number {
        if (!this._childWorkItemIds) {
            this._buildChildParentCaches();
        }

        if (this._childWorkItemIds) {
            return this._childWorkItemIds.length;
        }

        return 0;
    }
}

VSS.initClassPrototype(TaskBoardModel, {
    _columnsLookupTable: null,
    _fieldData: null,
    _parentWorkItemIds: null,
    _parentsLookupTable: null,
    _childWorkItemIds: null,
    _remainingWorkFormat: null,
    _workRollupField: null,
    _store: null,
    _classificationProviders: null,
    _orderByField: null,
    _parentNamePlural: null,
    _transitions: null,
    _fieldOverrides: null,
    _dataModel: null,
    tfsContext: null,
    states: null,
    _states: null,
    _teamField: null,
    _childWorkItemTypes: null,
    _peopleList: null,
    _peopleLookup: null,
    _filterField: null,
    _filter: null,
    _workItemErrors: null
});

class ParentClassification implements IClassification {
    private _model: TaskBoardModel;

    /**
     * Constructor function for ParentClassification. Initializes the classification with the provided model.
     * @param model The taskboard model to build classification from.
     */
    constructor(model: TaskBoardModel) {
        this._model = model;
    }

    /**
     * Gets the pivot field name used for display purposes.
     */
    public getPivotFieldDisplayName(): string {
        return this._model.getParentNamePlural();
    }

    /**
     * Gets the field name for the field this classification is pivoting on.
     */
    public getPivotField() {
        return TaskBoardModel.PARENTID_FIELDNAME;
    }

    /**
     * Generates the classification data for parents.
     * @return An array of classification data items.
     */
    public getClassification(): IClassificationData[] {
        let results: IClassificationData[] = [];
        const parents: number[] = this._model._parentWorkItemIds;
        const l: number = parents.length;

        // If there are no parents, but there is an 'Unparented' row, only return that.
        if (l == 0) {
            this._addUnparentedRowIfNecessary(results);
        }

        for (let i = 0; i < l; i += 1) {
            if (i === this._model._indexOfUnparentedRow) {
                // Do this at the specified index if there were new parent items added to the taskboard
                this._addUnparentedRowIfNecessary(results);
            }

            const id: number = parents[i];
            results.push({
                templateId: id,
                pivotKey: id
            });
        }

        return results;
    }

    /**
     * Tells whether the given pivotValue corresponds to a valid parent work item in this view
     */
    public isValidPivot(pivotValue: any): boolean {
        if (pivotValue && this._model.isParentId(pivotValue)) {
            return true;
        }
        return false;
    }

    /**
     * Whether clicking on pivot and DragNDrop is supported
     */
    public supportsPivotOperations(): boolean {
        return true;
    }

    private _addUnparentedRowIfNecessary(results: IClassificationData[]) {
        if (this._model.hasOrphanTasks()) {
            // If there are orphan task work items, add an entry corresponding to the 'Unparented' row
            results.push({
                templateId: TaskBoardModel.NO_PARENT_ID,
                pivotKey: TaskBoardModel.NULL_PIVOT_KEY
            });
        }
    }
}

VSS.initClassPrototype(ParentClassification, {
    _model: null
});

class PeopleClassification implements IClassification {

    private _model: TaskBoardModel;

    /**
     *     Constructor function for PeopleClassification.  Initializes
     *     the classification with the provided model.
     * 
     * @param model The taskboard model to build classification from.
     */
    constructor(model: TaskBoardModel) {
        this._model = model;
    }

    /**
     *     Gets the pivot field name used for display purposes.
     */
    public getPivotFieldDisplayName() {
        return TaskboardResources.Taskboard_TeamMembers;
    }

    /**
     *     Gets the field name for the field this classification is pivoting on.
     */
    public getPivotField() {
        return DatabaseCoreFieldRefName.AssignedTo;
    }

    /**
     *     Generates the classification data for people.
     *     Returns an array of classification data items.  A
     *     classification data item has the following structure:
     *         {
     *             templateId: [work item with the user name],
     *             pivotKey: [assigned to]
     *         }
     * 
     * @return 
     */
    public getClassification(): IClassificationData[] {
        var childWorkItems,
            i, l,
            id: number,
            assignedTo: string,
            assignedToLookup = {},
            lookupValue,
            model = this._model,
            results: IClassificationData[] = [];

        // Add the classification for each of the child work items.
        childWorkItems = this._model.getChildWorkItemIds();
        for (i = 0, l = childWorkItems.length; i < l; i += 1) {
            id = childWorkItems[i];
            assignedTo = model.getFieldValue(id, this.getPivotField()) || TaskBoardModel.NULL_PIVOT_KEY;

            // If a classification for this assignedTo has not been
            /// added already, then add it.
            lookupValue = assignedToLookup[assignedTo];
            if (!lookupValue) {
                // Flag this value so we don't add it again.
                assignedToLookup[assignedTo] = true;

                // Generate the classification data and add it to the result.
                results.push({
                    templateId: id,
                    pivotKey: assignedTo
                });
            }
        }

        // Sort the result.
        results.sort(function (a, b) {
            var leftPivot,
                rightPivot;

            // Ensure unassigned always shows up first in the list.
            if (a.pivotKey === TaskBoardModel.NULL_PIVOT_KEY) {
                return -1;
            }
            if (b.pivotKey === TaskBoardModel.NULL_PIVOT_KEY) {
                return 1;
            }

            // Setup to perform case insensitive compare.
            leftPivot = a.pivotKey.toUpperCase();
            rightPivot = b.pivotKey.toUpperCase();

            return (leftPivot > rightPivot) ? 1 : ((leftPivot < rightPivot) ? -1 : 0);
        });

        return results;
    }

    /**
     *     Tells whether the given pivotValue corresponds to an actual user(person)
     */
    public isValidPivot(pivotValue: any): boolean {
        if (pivotValue) {
            return true;
        }
        return false;
    }

    /**
     *     Whether clicking on pivot and DragNDrop is supported
     */
    public supportsPivotOperations(): boolean {
        return false;
    }
}

export class TaskBoardCardField extends Cards.WitCardField {

    private _model: TaskBoardModel;

    constructor(model: TaskBoardModel, id: number, cardFieldDefinition: Cards.WitCardFieldDefinition, cardFieldSetting: Cards.ICardFieldSetting) {
        super(id, cardFieldDefinition, cardFieldSetting);
        this._model = model;
    }

    /**
     * see the base class for the description of method /// 
     */
    public value(fieldValue?: any): any {
        if (fieldValue !== undefined) {
            this._model.setFieldValue(this.itemId(), this.referenceName(), fieldValue);
        } else {
            fieldValue = this._model.getFieldValue(this.itemId(), this.referenceName());
        }
        return fieldValue;
    }

    /**
     * see the base class for the description of method
     */
    public getAllowedValues(currentValue: string): string[] {
        // for remaining field
        if (!Utils_String.ignoreCaseComparer(this.referenceName(), this._model.getWorkRollupFieldRefName())) {
            return this._buildRemainingWorkArray(currentValue);
        }

        return super.getAllowedValues(currentValue);
    }

    /**
     * see the base class for the description of method /// 
     */
    public hasAllowedValues(): boolean {
        var hasAllowed = false;

        // for identity fields
        if (this.definition().type() === Cards.CardFieldType.Identity) {
            hasAllowed = true;
        }
        // for remaining field
        else if (!Utils_String.ignoreCaseComparer(this.referenceName(), this._model.getWorkRollupFieldRefName())) {
            hasAllowed = true;
        } else {
            hasAllowed = super.hasAllowedValues();
        }
        return hasAllowed;
    }

    /**
     *     Calculates the array of values to populate the remainingWork dropdown for on-tile-edit.
     *     Expected behavior:
     *     - Array should contain 6 values, unless there are aren't smaller values to display.
     *     - Possible dropdown values are 0, 0.25, 0.5, 1, 2, 3, 4, ...
     *     - Values should start with the largest possible value less than the current value, and include the next 4 lower values
     *     - 0 should always be included in the dropdown, unless it is the current value
     *     - 0 is special, it maps to [1,2,3,5,8,13] (fibonacci numbers)
     *     Examples:
     *     - 23 -> [22, 21, 20, 19, 18, 0]
     *     - 3.5 -> [3, 2, 1, 0.5, 0.25, 0]
     *     - 0.6 -> [0.5, 0.25, 0]
     * 
     * @param workRollup  The currently assigned number of hours 
     * @return  An array of values to populate the remaining work dropdown 
     */
    private _buildRemainingWorkArray(workRollup: any): any[] {

        if (!workRollup) {
            workRollup = 0;
        }

        Diag.Debug.assert(typeof workRollup === 'number' || typeof workRollup === 'string', "workRollup should be a number or a string");

        var potentialHours = [];

        if (typeof workRollup === 'string') {
            if (workRollup === "") {
                workRollup = 0;
            }
            else {
                workRollup = Utils_Number.parseLocale(workRollup);
            }
        }

        // We start with the number which is one less than the ceiling. We don't use the floor, 
        // because we don't want to include the number itself if it is an integer
        var intRollup = Math.ceil(workRollup) - 1;
        var l = (Math.min(5, intRollup)); // Loop 5 times, or less, if we have a small number
        for (var i = 0; i < l; i += 1) { // Add the 5 integer values smaller than the number
            potentialHours.push(intRollup - i);
        }

        if (workRollup !== 0) {
            if (workRollup <= 5 && workRollup > 0.5) {
                potentialHours.push(0.5);
            }
            if (workRollup <= 4 && workRollup > 0.25) {
                potentialHours.push(0.25);
            }
            potentialHours.push("0");
        }
        else {// If 0, as a special case, we should add the fibonacci numbers
            potentialHours.push(1, 2, 3, 5, 8, 13);
        }

        // We do this last, to avoid having to format in multiple places
        l = potentialHours.length;
        for (i = 0; i < l; i += 1) {
            if (potentialHours[i] !== "0") {
                potentialHours[i] = FormatUtils.formatRemainingWorkForDisplay(potentialHours[i]);
            }
        }

        return potentialHours;
    }
}

VSS.initClassPrototype(PeopleClassification, {
    _model: null
});




