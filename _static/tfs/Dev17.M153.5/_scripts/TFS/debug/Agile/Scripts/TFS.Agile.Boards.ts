///<reference types="jquery" />

import "VSS/LoaderPlugins/Css!Agile";

import VSS_Notifications = require("VSS/Controls/Notifications");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Array = require("VSS/Utils/Array");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import BoardResources = require("Agile/Scripts/Resources/TFS.Resources.AgileTaskboard");
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Events_Action = require("VSS/Events/Action");
import Events_Document = require("VSS/Events/Document");
import Events_Handlers = require("VSS/Events/Handlers");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import TFS_Agile = require("Agile/Scripts/Common/Agile");
import TFS_Agile_WorkItemChanges = require("Agile/Scripts/Common/WorkItemChanges");
import TFS_Agile_Utils = require("Agile/Scripts/Common/Utils");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import Cards = require("Agile/Scripts/Card/Cards");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import { BacklogConfigurationService, BacklogFieldTypes } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import TFS_UI_Controls_Common = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WIT_WebApi = require("TFS/WorkItemTracking/RestClient");
import WIT_Contracts = require("TFS/WorkItemTracking/Contracts");
import Performance = require("VSS/Performance");
import Telemetry = require("VSS/Telemetry/Services");
import Q = require("q");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Work_Contracts = require("TFS/Work/Contracts");
import Work_WebApi = require("TFS/Work/RestClient");
import BoardAutoRefreshCommon = require("Agile/Scripts/Board/BoardsAutoRefreshCommon");
import Util_Cards = require("Agile/Scripts/Card/CardUtils");
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IWorkItemData, ILinkInfo } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");

import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import { TelemetryUtils } from "WorkItemTracking/Scripts/Utils/TelemetryUtils";
import { EmbeddedHelper } from "Agile/Scripts/Common/EmbeddedHelper";
import { TextFilterProvider } from "WorkItemTracking/Scripts/Filtering/TextFilterProvider";
import { IFilterDataSource, FilterManager, FilterState, isFilterStateEmpty, IFilter } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { FieldFilterProvider } from "WorkItemTracking/Scripts/Filtering/FieldFilterProvider";
import { TagsFilterProvider } from "WorkItemTracking/Scripts/Filtering/TagsFilterProvider";
import { AssignedToFilterProvider } from "WorkItemTracking/Scripts/Filtering/AssignedToFilterProvider";
import { IterationPathFilterProvider } from "WorkItemTracking/Scripts/Filtering/IterationPathFilterProvider";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { PageWorkItemHelper } from "WorkItemTracking/Scripts/Utils/PageWorkItemHelper";

var delegate = Utils_Core.delegate;
var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var DatabaseCoreFieldRefName = TFS_Agile_Utils.DatabaseCoreFieldRefName;

export var annotationItemSourceTypeFactory: TFS_Core_Utils.TypeFactory;
export const parentItemFieldRefName = "System.ParentItem";
export const unparentedId = -1;
export var maxBacklogOrderValue = Math.pow(2, 32);

export namespace Notifications {
    export const BoardMemberAdded = "VSS.Agile.Boards.BoardMemberAdded";
    export const BoardItemAdded = "VSS.Agile.Boards.BoardItemAdded";
    export const BoardItemUpdated = "VSS.Agile.Boards.BoardItemUpdated";
    export const BoardItemRemoved = "VSS.Agile.Boards.BoardItemRemoved";
    export const BoardItemNeedsUpdate = "VSS.Agile.Boards.BoardItemNeedsUpdate";
    export const BoardItemSourceChanged = "VSS.Agile.Boards.BoardItemSourceChanged";

    /** Items on the board have been updated (e.g., new items have been paged in) */
    export const BoardItemsUpdated = "VSS.Agile.Boards.BoardItemsUpdated";

    /** Board model has updated as a result of updated settings or live updates */
    export const BoardModelUpdated = "VSS.Agile.Boards.BoardModelUpdated";

    /** Board itself has updated (e.g., new settings) */
    export const BoardUpdated = "VSS.Agile.Boards.BoardUpdated";

    export const BoardMemberItemCountChanged = "VSS.Agile.Boards.BoardMemberItemCountChanged";
    export const BoardTileMoveLock = "VSS.Agile.Boards.BoardTileMoveLock";
    export const BoardTileMoveUnlock = "VSS.Agile.Boards.BoardTileMoveUnlock";
    export const BoardTileMoved = "VSS.Agile.Boards.BoardTileMoved";
    export const BoardNewItemEdited = "VSS.Agile.Boards.BoardNewItemEdited";
    export const BoardAddNewIncomingItem = "VSS.Agile.Boards.BoardAddNewIncomingItem";
    export const BoardItemFilteringComplete = "VSS.Agile.Boards.BoardItemFilteringComplete";
    export const BoardRedraw = "VSS.Agile.Boards.Redraw";
    /** The internal board height has changed. e.g. A card was moved to a column and increased height of column */
    export const BoardHeightChanged = "VSS.Agile.Boards.BoardHeightChanged";
    /** The board must fix its height when its container changes */
    export const BoardContainerResized = "VSS.Agile.Boards.BoardContainerResized";
    export const BoardExpandMember = "VSS.Agile.Boards.ExpandMemeber";
    export const BoardLayoutUpdated = "VSS.Agile.Boards.LayoutUpdated";
    export const BoardCriteriaFilterChanged = "TFS.Agile.Boards.BoardFilterChanged";
    export const BoardMessageDisplay = "VSS.Agile.Boards.BoardMessageDisplay";

    export const ToggleBoardsHubFilterON = "TFS.Agile.BoardsHub.ToggleFilterON";
}

export interface BoardModel {
    board: any;
    boardSettings: IBoardSettings;
    boardCardSettings: any;
    itemTypes: string[];
    notReady?: boolean;
    itemSource?: any;
    boardFilterSettings?: IBoardFilterSettings;
}

export interface IBoardFilterSettings {
    initialFilter: IDictionaryStringTo<IFilter>;
}

export interface IWorkItemSourceChangedArgs extends WITOM.IWorkItemChangedArgs {
    /*
     * work item id.
     */
    id?: number;
    /*
     * function return the work item.
     */
    getItem?: () => Item;
}

// NOTE: Exporting class for unit test accessibility.
export class BoardMembershipEvaluator extends TFS_Agile.BaseBacklogMembershipEvaluator {

    constructor(callback: IResultCallback) {
        /// <summary>Handles evaluating work items membership validity for the Board.</summary>
        /// <param name="callback" type="IResultCallback">Function to call when the evaluator has been initialized.</param>

        super(TFS_Agile.BacklogContext.getInstance().team.id);

        Diag.Debug.assertParamIsType(callback, "function", "callback", true);

        if (callback) {
            this._beginGetSettings(callback);
        }
    }

    private _isIterationValid(item: Item): boolean {
        /// <summary>Checks whether the iteration field is valid for product backlog membership</summary>
        /// <param name="workItem" type="WITOM.WorkItem">The work item we are evaluating</param>
        /// <returns type="Boolean">True if the iteration field is valid, otherwise false</returns>

        var path = item.fieldValue(DatabaseCoreFieldRefName.IterationPath);
        return super._isBacklogIterationPathValid(path);
    }

    private _isWorkItemTypeValid(item: Item): boolean {
        /// <summary>OVERRIDE: Check whether the work item type is valid for product backlog membership</summary>
        /// <param name="workItem" type="WITOM.WorkItem">The work item we are evaluating</param>
        /// <returns type="Boolean">True if the work item type is valid, otherwise false</returns>
        var backlogContext = TFS_Agile.BacklogContext.getInstance();
        var isValid: boolean = backlogContext.backlogContainsWorkItemType(item.fieldValue(DatabaseCoreFieldRefName.WorkItemType));
        return isValid;
    }

    public _isValid(item: Item): boolean {
        /// <summary>OVERRIDE: Check for product backlog membership validity</summary>
        /// <param name="item" type="Item">The work item we are evaluating</param>
        /// <returns type="Boolean">True if the work item is valid, otherwise false</returns>
        var teamFieldName = this._teamSettings.teamFieldName,
            teamFieldValue = item.fieldValue(teamFieldName);

        var isValid: boolean = this._isWorkItemTypeValid(item);

        if (isValid && !item.isNew()) {
            //check team/iteration only for saved items
            isValid = this._isTeamFieldValid(teamFieldValue) && this._isIterationValid(item);
        }
        return isValid;
    }
}

// NOTE: Exporting class for unit test accessibility.
export class FunctionCollection {

    public static SORT_ASCENDING: number = 0;
    public static teamMembership: any = (function () {
        var evaluator,
            fn;

        fn = function (item, callback) {
            Diag.Debug.assertParamIsType(item, Item, "item");
            Diag.Debug.assertParamIsType(callback, "function", "callback");
            Diag.Debug.assertIsNotUndefined(evaluator, "initialize hasn't been called for the teamMembership function");
            evaluator.evaluate(item, callback);
        };

        fn.initialize = function (callback) {
            evaluator = new BoardMembershipEvaluator(callback);
        };

        return /*cast {(item, callback: {(...args: any[]) => any;}) => void; }*/fn;
    }());

    public static compareValues(value1: any, value2: any, caseInsensitive: boolean): number {
        /// <summary>Compare values. null and undefined are equivalent and sort lower than other values.</summary>
        /// <param name="value1" type="Object">The first value to compare</param>
        /// <param name="value2" type="Object">The second value to compare</param>
        /// <param name="caseInsensitive" type="Boolean">Indicates whether string comparisons should be case insensitive.</param>
        /// <returns type="Number">Returns 0 if value1==value2, &lt;0 if value1&lt;value2, &gt;0 if value1&gt;value2.</returns>

        switch (typeof value1) {
            case "string":
                return caseInsensitive ? Utils_String.localeIgnoreCaseComparer(value1, value2) : Utils_String.localeComparer(value1, value2);
            case "number":
                return value1 - value2;
            case "boolean": // boolean? - false < true
                return (value1 === value2) ? 0 : (value1 ? 1 : 0);
            case "object":
                if (value1 instanceof Date) {
                    return Utils_Date.defaultComparer(value1, value2);
                } else if ($.isFunction(value1.compare)) {
                    return value1.compare(value2);
                }

                Diag.Debug.fail("Can't compare object values without a .compare function. value1: " + value1);
                return 0;
            default:
                Diag.Debug.fail("Don't know how to compare values. value1: " + typeof value1);
                return 0;
        }
    }

    public static typeChecked(comparer: (left: any, right: any, caseInsensitive: boolean) => any): (left: any, right: any, caseInsensitive: boolean) => any {
        /// <summary>
        ///     Wrap a real comparer in a function that checks the types of the comparison
        ///     values match. If either of the values are null|undefined the guard function returns
        ///     the comparison result itself, otherwise it defers to the guarded comparer.</summary>
        /// <param name="comparer" type="Function">
        ///     The comparer that will be used if ordering cannot be determined
        ///     by inspecting the values in a type-independent manner.
        /// </param>
        /// <returns type="Function">A function that compares values.</returns>

        Diag.Debug.assertParamIsType(comparer, "function", "comparer");

        return function (value1, value2, caseInsensitive) {
            var typeofV1 = typeof value1,
                typeofV2 = typeof value2;

            if (value1 === null || typeofV1 === "undefined") {
                return (value2 === null || typeofV2 === "undefined") ? 0 : -1;
            }
            if (value2 === null || typeofV2 === "undefined") {
                return 1;
            }

            if (typeofV1 !== typeofV2) {
                Diag.Debug.fail("Type mismatch when comparing values. value1:" + typeofV1 + ", value2:" + typeofV2);
                return 0;
            }

            return comparer(value1, value2, caseInsensitive);
        };
    }

    public static proposedInProgressItemComparer(data: any, item1: WorkItemItemAdapter, item2: WorkItemItemAdapter): number {
        /// <summary>
        ///     Comparer for Kanban board's Proposed and InProgress columns. Sorting is ascending
        ///     on the Product Backlog Order field.
        /// </summary>
        /// <param name="data" type="Object">
        ///     Data to be used in the comparison.
        ///     {
        ///         itemSource: The source of the 2 items being compared,
        ///         fields: The common process configuration fields
        ///     }
        /// </param>
        /// <param name="item1" type="Item">The first item</param>
        /// <param name="item2" type="Item">The second item</param>
        /// <returns type="Number">Returns 0 if value1==value2, less than 0 if value is less than value2, greater than 0 if value1 is greater than value2.</returns>

        Diag.Debug.assertParamIsObject(data, "data");
        Diag.Debug.assertParamIsType(item1, Item, "item1");
        Diag.Debug.assertParamIsType(item2, Item, "item2");

        var itemSource = data.itemSource as WorkItemSource,
            orderField = data.fields.orderField,
            item1Ancestors = itemSource.getAncestors(item1.id()),
            item2Ancestors = itemSource.getAncestors(item2.id()),
            item1Ancestor,
            item2Ancestor,
            item1AncestorValue,
            item2AncestorValue,
            i, l;

        // If either of the items is a temporary item and if the order value is not present in either of them, use id to compare them. 
        // temporary items are placed before real items
        if ((item1.getTempId() < 0 || item2.getTempId() < 0) && !(item1.fieldValue(orderField) && item2.fieldValue(orderField))) {
            return item1.getTempId() - item2.getTempId();
        }

        l = Math.max(item1Ancestors.length, item2Ancestors.length);
        for (i = 0; i < l; i++) {
            if (item1Ancestors[i] === null || item1Ancestors[i] === undefined) {
                return -1;
            } else if (item2Ancestors[i] === null || item2Ancestors[i] === undefined) {
                return 1;
            } else if (item1Ancestors[i] !== item2Ancestors[i]) {
                item1Ancestor = itemSource.getCachedItem(item1Ancestors[i]);
                item2Ancestor = itemSource.getCachedItem(item2Ancestors[i]);

                item1AncestorValue = item1Ancestor.fieldValue(orderField);
                if (item1AncestorValue === null || item1AncestorValue === undefined) {
                    item1AncestorValue = maxBacklogOrderValue;
                }

                item2AncestorValue = item2Ancestor.fieldValue(orderField);
                if (item2AncestorValue === null || item2AncestorValue === undefined) {
                    item2AncestorValue = maxBacklogOrderValue;
                }

                return (item1AncestorValue - item2AncestorValue) ||
                    (item1Ancestor.id() - item2Ancestor.id());
            }
        }

        Diag.Debug.fail("Should always return while looping through ancestors");
    }

    public static completedItemComparer(data: any, item1: Item, item2: Item): number {
        /// <summary>
        ///     Comparer for Kanban board's Completed columns. Sorting is descending
        ///     on the ClosedDate field
        /// </summary>
        /// <param name="data" type="Object">
        ///     Data to be used in the comparison.
        ///     {
        ///         itemSource: The source of the 2 items being compared,
        ///         fields: The common process configuration fields
        ///     }
        /// </param>
        /// <param name="item1" type="Item">The first item</param>
        /// <param name="item2" type="Item">The second item</param>
        /// <returns type="Number">Returns 0 if value1==value2, less than 0 if value1 is less than value2, greater than 0 if value1 is greater than value2.</returns>

        Diag.Debug.assertParamIsObject(data, "data");
        Diag.Debug.assertParamIsType(item1, Item, "item1");
        Diag.Debug.assertParamIsType(item2, Item, "item2");

        var closedDateField = data.fields.closedDateField,
            item1Value = item1.fieldValue(closedDateField),
            item2Value = item2.fieldValue(closedDateField);

        if (!item1Value) {
            if (!item2Value) {
                return item1.id() - item2.id();
            }
            return -1;
        }
        else if (!item2Value) {
            return 1;
        }
        else {
            return (item2Value - item1Value) || (item1.id() - item2.id());
        }
    }

    public static orderItemsByFields(data: any, item1: any, item2: any): number {
        /// <summary>Orders items by one or more fields.</summary>
        /// <param name="data" type="Object">Details of the fields to order by.</param>
        /// <param name="item1" type="Object">The first item to order by the specified fields.</param>
        /// <param name="item2" type="Object">The second item to order by the specified fields.</param>
        /// <returns type="Number">Returns 0 if value1==value2, less than 0 if value1 is less than value2, greater than 0 if value1 is greater than value2.</returns>

        Diag.Debug.assertParamIsType(data, Object, "data");
        Diag.Debug.assertParamIsType(data.fields, Array, "data.fields");
        Diag.Debug.assertParamIsType(item1, Item, "item1");
        Diag.Debug.assertParamIsType(item2, Item, "item2");

        var i, l,
            val1, val2,
            fieldName,
            result = 0,
            comparer = FunctionCollection.typeChecked(FunctionCollection.compareValues),
            fields = data.fields;

        for (i = 0, l = fields.length; !result && i < l; i += 1) {
            fieldName = fields[i].fieldName;

            val1 = item1.fieldValue(fieldName);
            val2 = item2.fieldValue(fieldName);

            result = comparer(val1, val2, fields[i].caseInsensitive) * (fields[i].order === FunctionCollection.SORT_ASCENDING ? 1 : -1);
        }

        return result;
    }

    /**
     * Orders checklist items by order field or id if order doesn't exist
     *
     * @param data field name to order by
     * @param item1 The first item to order by
     * @param item2 The second item to order by
     * @return Returns 0 if value1==value2, less than 0 if value1 is less than value2, greater than 0 if value1 is greater than value2.
     */
    public static checklistComparer(data: any, item1: Item, item2: Item): number {
        Diag.Debug.assertParamIsType(data, Object, "data");
        Diag.Debug.assertParamIsType(item1, Item, "item1");
        Diag.Debug.assertParamIsType(item2, Item, "item2");

        var rank1 = item1.fieldValue(data.orderFieldName);
        var rank2 = item2.fieldValue(data.orderFieldName);

        if (rank1 && rank2) {
            return rank1 - rank2;
        }
        else if (rank1) {
            return -1;
        }
        else if (rank2) {
            return 1;
        }
        else {
            return item1.id() - item2.id();
        }
    }

    public static getFunction(functionReference: any): (...args: any[]) => any {
        /// <summary>Gets a function implementation based on it's function reference.</summary>
        /// <param name="functionReference" type="Object">The function reference details.</param>
        /// <returns type="Function">The function identified by the function reference</returns>
        Diag.Debug.assertParamIsType(functionReference, "object", "functionReference");
        Diag.Debug.assertParamIsType(functionReference.id, "string", "functionReference.id");
        Diag.Debug.assertParamIsType(functionReference.data, "object", "functionReference", true);

        var id = functionReference.id,
            data = functionReference.data,
            fn,
            initialize;

        id = id.charAt(0).toLowerCase() + id.slice(1);
        fn = this[id];

        if (data) {
            initialize = fn.initialize;
            fn = Utils_Core.curry(fn, data);        // get the wrapper function that "pre-applies" the data argument.
            fn.initialize = initialize; // setup the initialize function if the wrapped function had one.
        }

        return fn;
    }
}



export abstract class Item {

    public static EVENT_ITEM_CHANGED: string = "item-changed";
    public static EVENT_OPERATION_STARTING: string = "item-operation-starting";
    public static EVENT_OPERATION_COMPLETE: string = "item-operation-complete";

    public startTime: number; // for telemetry of new item.
    private _operations: any;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _parentId: number;

    constructor() {
        /// <summary>An item on a board.</summary>
        this._operations = [];
    }

    public id(): number {
        /// <summary>Returns id for the item</summary>
        /// <returns type="number" />

        Diag.Debug.fail("id: IsAbstract");

        return 0;
    }

    public isReadOnly(): boolean {
        return false;
    }

    public getTempId(): number {
        /// <summary>Returns temporary id for the item</summary>
        /// <returns type="number" />

        Diag.Debug.fail("getTempid: IsAbstract");

        return 0;
    }

    public getParentId(): number {
        /// <summary>Returns id for the parent of this item</summary>
        /// <returns type="number" />

        return this._parentId;
    }

    public setParentId(id: number): void {
        /// <summary>Sets id for the item</summary>

        this._parentId = id;
    }

    public type(): string {
        /// <summary>Returns type for the item</summary>
        /// <returns type="string" />

        Diag.Debug.fail("type: IsAbstract");

        return null;
    }

    public setPendingAutoRefreshEvent(eventPayload: BoardAutoRefreshCommon.AutoRefreshEventPayload): void {
        /// <summary>Sets most recent pending auto-refresh event for this item.</summary>

        Diag.Debug.fail("type: IsAbstract");
    }

    public getPendingAutoRefreshEvent(): BoardAutoRefreshCommon.AutoRefreshEventPayload {
        /// <summary>Gets most recent pending auto-refresh event for this item.</summary>

        Diag.Debug.fail("type: IsAbstract");
        return null;
    }

    public skipPlacement(skipPlacement?: boolean): boolean {
        /// <summary>Set skip placement value</summary>
        /// <returns type="skipPlacement">The value whether item placement will be skipped</returns>
        Diag.Debug.fail("skipPlacement: IsAbstract");

        return false;
    }

    public fieldValue(fieldName: string, value?: string, raiseRefreshEvent?: boolean, setByRule?: boolean): any {
        /// <summary>Returns the value for the item's given field (or undefined if invalid field)</summary>
        /// <param name="fieldName" type="String">The field name</param>
        /// <param name="value" type="String" optional="true">The new value for the specified field.</param>
        /// <param name="raiseRefreshEvent" type="boolean" optional="true">If set to true alongwith passing the value, the setter will also raise the ItemChanged event with change as "Refresh"</param>
        /// <param name="setByRule" type="boolean" optional="true">If set to true mark setByRule=true on the field update</param>
        /// <returns type="any" />

        Diag.Debug.fail("fieldValue: IsAbstract");
    }

    public fieldValues(fieldUpdateList: FieldNameValuePair[]) {
        /// <summary>Update list of field values of item</summary>
        /// <param name="fieldUpdateList" type="array" elementType=FieldNameValuePair">List of fields to updated.</param>

        Diag.Debug.fail("fieldValues: IsAbstract");
    }

    public field(fieldName: string): Cards.CardField {
        /// <summary>gets the field</summary>
        /// <param name="fieldname" type="string">fieldName</param>

        Diag.Debug.fail("field: IsAbstract");
        return null;
    }

    public children(): Item[] {
        /// <summary>gets the children (already fetched)</summary>

        Diag.Debug.fail("children: IsAbstract");
        return [];
    }

    /**
     * Gets the annotation item source
     * This is a link between AnnotationAdapter and AnnotationItemSource through ItemSource
     * The reference chain is link => AnnotationAdapter->Item->ItemSource->AnnotationItemSource
     * @param {string} annotationItemSourceType
     * @returns {AnnotationItemSource}
     */
    public abstract getAnnotationItemSource(annotationItemSourceType: string): AnnotationItemSource;

    public discardChildItem(childWorkItemId: number) {
        /// <summary>Discard the newly created child item</summary>
        /// <param name="childWorkItemId" type="number">The id of the item to be discarded</param>
        Diag.Debug.fail("discardChildItem: IsAbstract");
        return null;
    }

    public beginAddNewChild(teamId: string, childWorkItemType: string): Q.Promise<Item> {

        Diag.Debug.fail("beginAddNewChild: IsAbstract");
        return null;
    }

    public beginGetChildren(): IPromise<Item[]> {
        /// <summary>gets the children</summary>
        /// <param name="fieldname" type="string">fieldName</param>

        Diag.Debug.fail("beginGetChildren: IsAbstract");
        return null;
    }

    public beginRefresh(): IPromise<Item> {
        /// <summary>refreshes the item</summary>
        Diag.Debug.fail("beginRefresh: IsAbstract");
        return null;
    }

    public beginSave(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Begin the save process on the item</summary>
        /// <param name="callback" type="IResultCallback">The callback to be called on successful save</param>
        /// <param name="errorCallback" type="IErrorCallback">The callback to be called when encountered an error</param>
        Diag.Debug.fail("beginSave: IsAbstract");
    }

    public isValidValue(field: string, currentValue: string, newValue: string) {
        /// <summary>Checks if currentValue can be transitioned to newValue for the specified field</summary>
        /// <param name="field" type="String">The field that we are trying to validate</param>
        /// <param name="currentValue" type="String">The current value of the field</param>
        /// <param name="newValue" type="String">The new value of the field</param>
        Diag.Debug.fail("isValidValue: IsAbstract");
    }

    public isNew(): boolean {
        /// <summary>Checks if the item is a new item</summary>
        /// <returns type="boolean">if the item is new. New items cannot be moved on the board till saved </returns>
        Diag.Debug.fail("isNew: IsAbstract");
        return false;
    }

    public message(message?: string): string {
        /// <summary>Get or set a non-persistent message on the item</summary>
        /// <param name="message" type="String" optional="true">The message to set.</param>
        /// <returns type="String">The current message</returns>
        Diag.Debug.fail("message: IsAbstract");

        return "";
    }

    public operation(): any {
        /// <summary>Gets any pending operations on the item</summary>
        /// <returns type="Object">The current operation, or <c>null</c> if there is no operation</returns>
        return this._operations.length ? this._operations[0] : null;
    }

    public reset() {
        /// <summary>Reset the item</summary>
    }

    public discard() {
        /// <summary>Discard/Deletes the item</summary>
    }

    public dispose() {
        // clean up running document table for any pending operations
        if (this._operations) {
            const runningDocumentsTable = Events_Document.getRunningDocumentsTable();
            while (this._operations.length > 0) {
                const operation = this._operations[0];
                this.removeOperation(runningDocumentsTable, operation.running, 0);
            }
        }
    }

    public fire(eventName, sender, eventArgs) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    public postRemoveCleanup() {
        /// <summary>clean up data after remove</summary>
        Diag.Debug.fail("message: IsAbstract");
    }

    public _fireEvent(eventName: string, sender?: any, args?: any) {
        /// <summary>Invoke the specified event passing the specified arguments.</summary>
        /// <param name="eventName" type="String">The event to invoke.</param>
        /// <param name="sender" type="Object" optional="true">The sender of the event.</param>
        /// <param name="args" type="Object" optional="true">The arguments to pass through to the specified event.</param>

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

    public attachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Attatch a handler to an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to attach.</param>
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    public detachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Detatch a handler from an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to detach.</param>
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    public _startOperation(type: string, message: string, completeCallback?: IResultCallback): any {
        /// <summary>Starts recording of an operation on the item</summary>
        /// <param name="type" type="String">Tag for the operation</param>
        /// <param name="message" type="String">The message to display for the operation</param>
        /// <param name="completeCallback" type="IResultCallback" optional="true">The callback to call when the operation is completed.</param>
        /// <returns type="Object">An object that encapsulates the operation (using the "Dispose" pattern). 
        /// When the operation is completed - call the "completed" function on the return object to cleanup and fire the appropriate notifications
        /// and call the completed callback. If the operation must be aborted, call the abort function to cleanup. </returns>
        var running,
            runningDocumentsTable = Events_Document.getRunningDocumentsTable(),
            operation = {
                type: type,
                message: message,
                complete: () => {
                    var index = Utils_Array.indexOf(this._operations, operation);
                    if (index !== -1) {
                        this.removeOperation(runningDocumentsTable, running, index);
                        this._fireEvent(Item.EVENT_OPERATION_COMPLETE, this, operation);
                        if ($.isFunction(completeCallback)) {
                            completeCallback(operation);
                        }
                    }
                },
                abort: () => {
                    var index = Utils_Array.indexOf(this._operations, operation);
                    if (index !== -1) {
                        this.removeOperation(runningDocumentsTable, running, index);
                    }
                }
            };

        this._operations.push(operation);

        this._fireEvent(Item.EVENT_OPERATION_STARTING, this, operation);

        running = runningDocumentsTable.add("WorkItemItemAdapter", { isDirty: function () { return true; } });
        operation["running"] = running;

        return operation;
    }

    private removeOperation(runningDocumentsTable: Events_Document.RunningDocumentsTable, running: Events_Document.RunningDocumentsTableEntry, index: number) {
        runningDocumentsTable.remove(running);
        this._operations.splice(index, 1);
    }
}

export abstract class AnnotationItemSource {
    // ParentSource is required for an AnnotationItemSource to raise ITEM_CHANGED events
    // on its behalf when it gets data.
    public constructor(protected parentSource: ItemSource, teamId: string) {
    }

    /**
     * Returns the type of the AnnotationItemSource.
     */
    public abstract type(): string;

    /**
     * Get from cache
     * @param {number} id
     */
    public abstract getItem(id: number);

    /**
     * Get from cache for multiple items
     * @param {number[]} ids
    */
    public abstract getItems(ids: number[]);

    /**
     * Get from cache if not available, fetch it from server
     * @param {number} id
     * @param {WorkItemChangeArgs} args
     */
    public abstract beginGetItem(id: number, args?: WorkItemChangeEventArgs);

    /**
     * Get from cache or from server for multiple item ids
     * @param {number[]} ids
     * @param {WorkItemChangeArgs} args
     */
    public abstract beginGetItems(ids: number[], args?: WorkItemChangeEventArgs);

    /**
     * Disposes AnnotationItemSource.
     */
    public abstract dispose();
}

export abstract class ItemSource {
    /**
     * Returns the initialization function to be called which downloads the required modules and then executes the passed callback
     * @param type: Annotation item source type for which initialization function is sought
     */
    public static getItemSourceInitializationFuntion(type: string): Function {
        if (!ItemSource._itemSourceModuleMap[type]) {
            Diag.Debug.fail("Initialization methof is not registered for annotation item source " + type);
        }

        return ItemSource._itemSourceModuleMap[type];
    }

    /**
     * Sets the initialization function in the map
     * @param type: Annotation item source type which is the key in above mentioned map
     * @param initializationCallback: Function to be called to download required modules
     */
    public static registerItemSourceInitializationFunction(type: string, initializationCallback: Function): void {
        ItemSource._itemSourceModuleMap[type] = initializationCallback;
    }

    public static Events: any = {
        ItemChange: "item-change"
    };
    public static ChangeTypes: any = $.extend({
        MessageChange: "message-change",
        ChecklistChanged: "checklist-changed",
        AnnotationItemSourceChanged: "annotation-item-source-changed"
    }, WorkItemChangeType);

    private static _itemSourceModuleMap: IDictionaryStringTo<Function> = {};

    private _disposed: boolean;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _teamId: string;

    public _configuration: any;

    private _annotationItemSources: IDictionaryStringTo<AnnotationItemSource>;

    /**
     * Abstract class for Board Item
     * @param {any} configuration The item source configuration data
     * @param {AnnotationItemSource[]} annotationItemSources? Annotation Item Sources
     */
    constructor(configuration: any, teamId: string, annotationItemSources?: AnnotationItemSource[]) {
        Diag.Debug.assertParamIsType(configuration, Object, "configuration", true);

        this._teamId = teamId;

        this._annotationItemSources = {};

        if (annotationItemSources) {
            annotationItemSources.forEach((annotationItemSource: AnnotationItemSource) => {
                this._annotationItemSources[annotationItemSource.type()] = annotationItemSource;
            });
        }

        this._configuration = configuration;

        // Fix the transitions dictionary to use good keys
        for (let name of Object.keys(configuration.transitions)) {
            configuration.transitions[TFS_Agile_Utils.WorkItemUtils.getKeyFromWorkItemTypeName(name)] = configuration.transitions[name];
        }
    }

    /**
     * Registers an annotation item source
     * @param {AnnotationItemSource} annotationItemSource
     */
    public registerAnnotationItemSource(annotationItemSourceType: string, annotationItemSource: AnnotationItemSource): void {
        Diag.Debug.assertIsNotNull(annotationItemSourceType, "annotationItemSourceType is null");

        this._annotationItemSources[annotationItemSourceType] = annotationItemSource;
    }

    /**
     * Unregisters an annotation item source
     * @param {string} annotationItemSourceType
     */
    public unregisterAnnotationItemSource(annotationItemSourceType: string): void {
        Diag.Debug.assertIsNotNull(annotationItemSourceType, "annotationItemSourceType is null");

        if (this._annotationItemSources.hasOwnProperty(annotationItemSourceType)) {
            this._annotationItemSources[annotationItemSourceType].dispose();
            this._annotationItemSources[annotationItemSourceType] = null;
        }
    }

    /**
     * Returns the AnnotationItemSource by type
     * @param {string} annotationItemSourceType
     * @returns {AnnotationItemSource}
     */
    public getRegisteredAnnotationItemSource(annotationItemSourceType: string): AnnotationItemSource {
        Diag.Debug.assertIsNotNull(annotationItemSourceType, "annotationItemSourceType is null");

        if (this._annotationItemSources &&
            this._annotationItemSources.hasOwnProperty(annotationItemSourceType)) {
            return this._annotationItemSources[annotationItemSourceType];
        }

        return null;
    }

    /**
     * Initiates call for all annotation item sources to fetch data for given ids.
     * @param {number[]} itemIds
     * @param {WorkItemChangeEventArgs} args?
     */
    public retrieveAnnotationItemSourceData(itemIds: number[], args?: WorkItemChangeEventArgs): void {

        for (var sourceType in this._annotationItemSources) {
            if (this._annotationItemSources.hasOwnProperty(sourceType) && this._annotationItemSources[sourceType]) {
                this._annotationItemSources[sourceType].beginGetItems(itemIds, args);
            } else {
                let initializeAnnotationSource = ItemSource.getItemSourceInitializationFuntion(sourceType);
                if ($.isFunction(initializeAnnotationSource)) {
                    initializeAnnotationSource(() => {
                        if (!this.isDisposed) {
                            this._annotationItemSources[sourceType] = annotationItemSourceTypeFactory.createInstance(sourceType, [this, this._teamId]);
                            this._annotationItemSources[sourceType].beginGetItems(itemIds, args);
                        }
                    });
                }
            }
        }
    }

    /**
     * AnnotationItemSource can raise events to update Item (Tile) after fetching data for the same (beginGetItems).
     * AnnotationItemSource has a reference to ItemSource. Here ItemSource is providing a way to raise event on 
     * behalf of AnnotationItemSource.
     * @param itemId
     * @param annotationItemSource
     */
    public abstract raiseEventForAnnotationItemSource(itemIds: number[], annotationItemSource: AnnotationItemSource): void;

    /**
     * Disposes the item source and annotation item sources
     */
    public dispose() {

        for (var sourceType in this._annotationItemSources) {
            if (this._annotationItemSources.hasOwnProperty(sourceType)
                && this._annotationItemSources[sourceType]) {
                this._annotationItemSources[sourceType].dispose();
            }
        }

        this._annotationItemSources = null;

        this._disposed = true;
    }

    private get isDisposed(): boolean {
        return this._disposed;
    }

    public abstract type();

    /**
     * Settings for the items provided by the item source
     * @param {Cards.CardSettingsProvider} setting?
     * @returns {Cards.CardSettingsProvider}
     */
    public abstract boardCardsSetting(setting?: Cards.CardSettingsProvider): Cards.CardSettingsProvider;

    /**
     * Returns the item corresponding to the id given
     * @param id
     * @returns
     */
    public abstract getCachedItem(id: number): Item;

    /**
     * Return the parent id of a specified item
     * @param {number} id
     * @returns {number}
     */
    public abstract getParent(id: number): number;

    /**
     * Get the field definition for specified field
     * @param {string} fieldRefName
     * @returns {Cards.CardFieldDefinition}
     */
    public abstract getFieldDefinition(fieldRefName: string): Cards.CardFieldDefinition;

    /**
     * Gets the map of field reference name to field definition for all fields
     * @returns {IDictionaryStringTo<Cards.CardFieldDefinition>}
     */
    public abstract getFieldDefinitions(): IDictionaryStringTo<Cards.CardFieldDefinition>;

    /**
     * Gets the value of the given field of all the items in the itemSource,
     * whose types are allowed on this board.
     * @param fieldName Name of the field for which the values are to be retrieved
     */
    public abstract getFieldValuesOfAllBoardItems(fieldName: string): string[];

    /**
     * Gives the item types which can be belong to this source
     * @returns {string[]}
     */
    public abstract getItemTypes(): string[];

    /**
    * Returns the number of items
    * @returns {number}
    */
    public abstract getItemCount(): number;

    /**
     * Asynchronously retrieves a specific item
     * @param {number} id The identifier for the item
     * @param {IResultCallback} callback The function to provide the item
     * @param {IErrorCallback} errorCallback? The function to call on error.
     */
    public abstract beginGetItem(id: number, callback: IResultCallback, errorCallback?: IErrorCallback);

    /**
     * Asynchronously retrieves the full list of items
     * @param {IResultCallback} callback The function to provide the items
     * @param {IErrorCallback} errorCallback? The function to call on error.
     */
    public abstract beginGetItems(callback: IResultCallback, errorCallback?: IErrorCallback);

    /**
     * Asynchronously retrieves the next page of items
     * @param {string} teamId Team Id
     * @param {string} scope The scope to use when retrieving the paged data
     * @param {number} pageSize page size
     * @param {IResultCallback} callback The function to provide the items
     * @param {IErrorCallback} errorCallback? The function to call on error.
     * @param {IDictionaryStringTo<any>} pagingCountData? Telemetry data for paging counts CI events
     * @returns {Ajax.IAjaxRequestContext} Request context for the ajax call
     */
    public abstract beginPageItems(teamId: string, scope: string, pageSize: number, callback: IResultCallback, errorCallback?: IErrorCallback, pagingCountData?: IDictionaryStringTo<any>): Ajax.IAjaxRequestContext;

    /**
     * Returns true if the source has enough items to retrieve the next page based on currently paged index
     * @param {string} scope The scope to use when retrieving the paged data
     * @returns {boolean}
     */
    public abstract canPageItems(scope: string): boolean;

    /**
     * Returns all the valid transitions
     * @param criteria
     */
    public abstract getValidTransitions(criteria);

    /**
     * Updates the transitions
     * @param {string} oldColumnName
     * @param {string} newColumnName
     */
    public abstract updateTransitions(oldColumnName: string, newColumnName: string);

    /**
     * Creates a specific item
     * @param teamId Id of team owning the item
     * @param {string} boardItemType The type of the new Item
     * @returns {JQueryPromise<Item>} A promise to return a new board item
     */
    public abstract beginCreateNewItem(teamId: string, boardItemType: string): Q.Promise<Item>;

    /**
     * Returns and sets the parentItems Map, if already set returns directly else makes a server call
     * @param childrenToFetch ChildIds for which the parentChild Map is need to be fetched
     * @param errorCallback Function to call with the error thrown by server if any
     */
    public abstract beginGetParents(childrenToFetch?: number[], errorCallback?: Function): IPromise<Work_Contracts.ParentChildWIMap[]>;

    /**
    * The method which returns the parent id for a given item id
    */
    public abstract getParentId(id: number): number;

    /**
     * Sets the data structure holding the Array of ParentItems of type ParentChildWIMap
     * @param parentChildMap Map to set the itemSource parentChildMap or merge based on the condition
     */
    public abstract setParentChildMap(parentChildMap: Work_Contracts.ParentChildWIMap[]): void;

    /**
     * Gets the children for the specified items
     * @param {number[]} parentIds? The items for which children information is needed
     * @returns {IPromise<IDictionaryNumberTo<Item[]>>} A promise to return the children Items
     */
    public abstract beginGetChildren(parentIds?: number[]): IPromise<IDictionaryNumberTo<Item[]>>;

    /**
     * Fires the given event for the item provided.
     * @param eventName
     * @param sender
     * @param eventArgs
     * @returns
     */
    public fire(eventName, sender, eventArgs) {
        return this._fireEvent(eventName, sender, eventArgs);
    }

    /**
     * Invoke the specified event passing the specified arguments.
     * @param {string} eventName The event to invoke.
     * @param {any} sender? The sender of the event.
     * @param {any} args? The arguments to pass through to the specified event.
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
     * @param {string} eventName The event name.
     * @param {IEventHandler} handler The handler to attach.
     */
    public attachEvent(eventName: string, handler: IEventHandler) {
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    /**
     * Detach a handler from an event.
     * @param {string} eventName The event name.
     * @param {IEventHandler} handler The handler to detach.
     */
    public detachEvent(eventName: string, handler: IEventHandler) {
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    /**
    * Called to auto refresh list of items (e.g. through SignalR) on board.
    * @param {Dictionary<Number, BoardAutoRefreshCommon.AutoRefreshEventPayload>} workItemDataMap
    * with keys as workItem Ids of items to be refreshed.
     */
    public abstract autoRefreshItems(workItemDataMap: TFS_Core_Utils.Dictionary<BoardAutoRefreshCommon.AutoRefreshEventPayload>): IPromise<{ successCount: number, failureCount: number }>;
}

annotationItemSourceTypeFactory = new TFS_Core_Utils.TypeFactory();

/**
 * Event Args when WorkItemChange event is fired.
 */
export interface WorkItemChangeEventArgs {
    /**
     * WorkItem for which event has been raised.
     */
    workItem: WITOM.WorkItem;
    /**
     * Links updated as part of work item change
     * (Currently keeping only this information)
     */
    links: ILinkInfo[];
}

/**
 * Event Args when ItemChange event is fired. 
 */
export interface ItemChangeEventArgs {
    /**
     * Item for which event has been raised.
     */
    item: Item;
    /**
     * Type of the change
     */
    change: any;
    /**
     * AnnotationItemSource associated with the item change
     */
    annotationItemSource: AnnotationItemSource;
    /**
     * Name of the Work item type being changed
     * Used only when Cards Annotation feature flag is enabled.
     */
    workItemType?: string;
}

// NOTE: Exporting class for unit test accessibility.
export class WorkItemItemAdapter extends Item {

    private _reorderManager: TFS_Agile.IReorderManager;
    private _wiManager: WorkItemManager;
    private _id: number;
    private _order: number;
    private _workItem: WITOM.WorkItem;
    private _workItemData: WIT_Contracts.WorkItem;
    private _workItemSource: WorkItemSource;
    private _onWorkItemChangedDelegate: Function;
    private _onTrySetWorkItem: Function;
    private _pendingChanges: any;
    private _message: any;
    private _cardSetting: Cards.CardSettings;
    private _fieldMap: IDictionaryStringTo<Cards.WitCardField>;
    private _skipPlacement: boolean;
    private _mostRecentAutoRefreshEvent: BoardAutoRefreshCommon.AutoRefreshEventPayload = null;

    constructor(workItemSource: WorkItemSource, workItemId: number, reorderManager: TFS_Agile.IReorderManager, workItem?: WITOM.WorkItem, workItemData?: WIT_Contracts.WorkItem) {
        /// <summary>An adapter to convert WorkItems into Items for the board.</summary>
        /// <param name="workItemSource" type="WorkItemSource">The work item source instance.</param>
        /// <param name="workItemId" type="Number">The work item identifier.</param>
        /// <param name="workItem" type="WorkItem" optional="true" >The work item object.</param>

        super();

        Diag.Debug.assertParamIsType(workItemSource, WorkItemSource, "workItemSource");
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        this._workItemSource = workItemSource;

        this._id = workItemId;
        this._fieldMap = {};
        this._reorderManager = reorderManager;
        this._wiManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore));
        this._workItemData = workItemData;

        if (workItem) {
            this._setWorkItem(workItem);
        } else {
            this._trySetWorkItem();
        }

        this._skipPlacement = false;
    }

    public id(): number {
        /// <summary>See Item.id().</summary>
        /// <returns type="Number">The id</returns>
        if (this._workItem) {
            return this._workItem.getUniqueId();
        }
        else {
            return this._id;
        }
    }

    public isReadOnly(): boolean {
        if (this._workItem) {
            return this._workItem.isReadOnly();
        }

        return false;
    }

    public type(): string {
        /// <summary>Returns type for the item</summary>
        /// <returns type="string" />
        /// <summary>See Item.type().</summary>
        /// <returns type="string">The type</returns>
        return this.fieldValue(DatabaseCoreFieldRefName.WorkItemType);
    }

    /**
     * Returns the AnnotationItemSource for given id.
     * @param {string} annotationItemSourceType
     * @remarks This is a link between AnnotationAdapter and AnnotationItemSource through ItemSource
     *          The reference chain is => AnnotationAdapter->Item->ItemSource->AnnotationItemSource
     * @returns
     */
    public getAnnotationItemSource(annotationItemSourceType: string): AnnotationItemSource {
        Diag.Debug.assertIsNotNull(annotationItemSourceType, "annotationItemSourceType is null");

        return this._workItemSource.getRegisteredAnnotationItemSource(annotationItemSourceType);
    }

    public getOrder(): number {
        if (this._order) {
            return this._order;
        }

        return 0;
    }

    public setOrder(order: number) {
        this._order = order;
    }

    public getTempId(): number {
        /// <summary>Returns the tempId of the work item backing this Item</summary>
        /// <returns type="Number">the tempId</returns>

        if (this._workItem) {
            return this._workItem.tempId;
        }

        return 0;
    }

    public setPendingAutoRefreshEvent(eventPayload: BoardAutoRefreshCommon.AutoRefreshEventPayload): void {
        /// <summary>Sets most recent pending auto-refresh event for this item.</summary>

        this._mostRecentAutoRefreshEvent = eventPayload;
    }

    public getPendingAutoRefreshEvent(): BoardAutoRefreshCommon.AutoRefreshEventPayload {
        /// <summary>Gets most recent pending auto-refresh event for this item.</summary>

        return this._mostRecentAutoRefreshEvent;
    }

    public fieldValue(fieldName: string, value?: string, raiseRefreshEvent?: boolean, setByRule?: boolean): any {
        /// <summary>See Item.fieldValue().</summary>
        /// <param name="fieldName" type="String">The field name.</param>
        /// <param name="value" type="String" optional="true">The new value for the specified field.</param>
        /// <param name="raiseRefreshEvent" type="boolean" optional="true">If set to true alongwith passing the value, the setter will also raise the ItemChanged event with change as "Refresh"</param>
        /// <param name="setByRule" type="boolean" optional="true">If set to true mark setByRule=true on the field update</param>
        /// <returns type="any">The field's value (or undefined if not set).</returns>
        Diag.Debug.assertParamIsType(fieldName, "string", "fieldName");
        Diag.Debug.assertParamIsType(value, "string", "value", true);

        var witValue;

        // Adding support for Parent Work Items
        // If the field is set for System.ParentItems and if parentId is present for a given childId
        // return parentId else return 0, depicting Unparented
        if (fieldName === parentItemFieldRefName) {
            return this._workItemSource.getParentId(this.id());
        }

        // When reorder is completed, work item cache does not invalidate the item if it is pinned. Hence the order field from cache could be stale.
        // As a work around we keep order locally. 
        // If _order is defined, return the stored order value.
        // Otherwise read from the cache if exists, or read from the page load data.
        if (value === undefined) {
            // If this is a read operation.
            var orderFieldRefName = this._getOrderFieldReferenceName();
            if (Utils_String.ignoreCaseComparer(fieldName, orderFieldRefName) === 0) {
                if (this._order !== undefined && this._order !== null) {
                    return this._order;
                }
            }
        }

        if (this._workItem) {
            if (value !== undefined) {
                this._workItem.setFieldValue(fieldName, value, setByRule);
                if (raiseRefreshEvent) {
                    this._raiseItemChanged({ change: ItemSource.ChangeTypes.Refresh });
                }
            }
            var field = this._workItem.getField(fieldName);
            if (field) {
                witValue = field.getValue();
            }
            if (witValue !== null && witValue !== undefined) {
                return witValue.valueOf();
            }
            return witValue;
        }
        else {
            if (typeof value !== "undefined") {
                if (!this._pendingChanges) {
                    this._pendingChanges = {};
                }
                this._pendingChanges[fieldName] = value;
                this._raiseItemChanged({ change: ItemSource.ChangeTypes.FieldChange });
                if (raiseRefreshEvent) {
                    this._raiseItemChanged({ change: ItemSource.ChangeTypes.Refresh });
                }
            }
            else {
                if (this._pendingChanges && this._pendingChanges.hasOwnProperty(fieldName)) {
                    return this._pendingChanges[fieldName];
                } else if (this._workItemData) {
                    if (this._workItemData.fields) {
                        return this._workItemData.fields[fieldName];
                    } else {
                        return null;
                    }
                }
                else {
                    return this._workItemSource.getPayloadFieldValue(this._id, fieldName);
                }
            }
        }
    }

    public isWorkItemPaged(): boolean {
        /// <summary>Checks if the given workitem is present in the paged payload</summary>
        /// <returns type="boolean"> Indicates whether the payload was found</returns>
        return this._workItemSource.isWorkItemPaged(this._id);
    }

    public fieldValues(fieldUpdateList: { fieldName: string; fieldValue?: string }[]) {
        /// <summary>Update list of field values of item</summary>
        /// <param name="fieldUpdateList" type="{ fieldName: string; fieldValue?: string}[]">List of fields to updated.</param>
        for (var i = 0; i < fieldUpdateList.length; i++) {
            var fieldUpdate = fieldUpdateList[i];
            this.fieldValue(fieldUpdate.fieldName, fieldUpdate.fieldValue);
        }
    }

    public children(): Item[] {
        return this._workItemSource.getChildren(this._id);
    }

    public beginAddNewChild(teamId: string, childWorkItemType: string): Q.Promise<Item> {
        return this._workItemSource.beginCreateNewChildItem(teamId, this.id(), childWorkItemType);
    }

    public discardChildItem(childWorkItemId: number) {
        /// <summary>Discard the newly created child item</summary>
        /// <param name="childWorkItemId" type="number">The id of the item to be discarded</param>
        return this._workItemSource.discardChildItem(this.id(), childWorkItemId);
    }

    public beginGetChildren(): IPromise<Item[]> {
        /// <summary>gets the children</summary>

        var deferred = Q.defer<Item[]>();

        //TODO:error handling if childrenMap does not have child data for this item
        this._workItemSource.beginGetChildren([this._id]).then(
            childrenMap => { deferred.resolve(childrenMap[this._id]); },
            () => { deferred.reject("no child data available"); }); // TODO: Localize

        return deferred.promise;
    }

    public beginRefresh(): IPromise<Item> {
        /// <summary>refreshes the item</summary>
        var deferred = Q.defer<Item>();

        this._wiManager.beginGetWorkItem(this._id,
            (workItem: WITOM.WorkItem) => {
                this._setWorkItem(workItem);
                deferred.resolve(this);
            },
            (error) => { deferred.reject(error); },
            false,
            null,
            true
        );
        return deferred.promise;
    }

    public beginSave(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>See Item.beginSave().</summary>
        /// <param name="callback" type="IResultCallback">The callback to be called on successful save</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">The callback to be called when encountered an error</param>
        Diag.Debug.assertParamIsType(callback, "function", "callback");
        Diag.Debug.assertParamIsType(errorCallback, "function", "errorCallback", true);

        var operation;
        var that = this;

        var onSaveCompleted = (fn) => {
            // Ensure that the 'save-completed' notification is fired when saving is completed regardless of whether there were
            // any changes saved. There's cases where WIT subsystem doesn't fire the event, but the board relies on it firing
            // to update the acquired/released collections.
            // Scenario: Drag drop tile when server is unavailble;
            // Drag a tile to a new member when the 'updateWorkItems' API call is unavailable - so that we can't save the update.
            // SaveCompleted is fired in this case as part of the error handling. Then drag the tile back to the original member.
            // WIT doesn't raise the event because the work item is no longer considered dirty (since the newly set value is the 
            // same as the original value - the first update wasn't persisted). The code here ensures that the save-completed
            // event is fired.
            return function () {
                if ($.isFunction(fn)) {
                    fn.apply(that, arguments);
                }
                operation.complete();
            };
        };

        var onSaveSucceeded = (fn) => {
            return function () {
                that._workItemSource.fireSaveCompleted(that);
                onSaveCompleted(fn).call(that, arguments);
            };
        };

        operation = this._startOperation(BoardResources.Taskboard_SavingTile, BoardResources.Taskboard_SavingTile);
        this.beginRefresh().then(
            (workItem: WorkItemItemAdapter) => {
                Diag.Debug.assert(workItem === this, "Expected the items to be the same after refres");
                var oldId = this.id();
                if (this.id() <= 0) {
                    workItem._workItem.beginSave(
                        (args: WITOM.IWorkItemsBulkSaveSuccessResult) => {
                            this.pinAndUnblockReorderOperation(args.workItems[0], oldId);
                            onSaveSucceeded(callback).call(this, args);
                        },
                        (error: Error) => {
                            onSaveCompleted(errorCallback).call(this, error);
                            if (error) {
                                this.message(error.message);
                            }
                        });

                }
                else {
                    //for existing items we don't need to reorder on a save, so trigger a workitem save
                    workItem._workItem.beginSave(onSaveSucceeded(callback), onSaveCompleted(errorCallback), "KanbanBoard");
                }
            },
            (error: Error) => {
                onSaveCompleted(function (error: Error) {
                    this._reorderManager.dequeueReorder([that.id()]);
                    that.message(error.message);
                    if ($.isFunction(errorCallback)) {
                        errorCallback.apply(that, arguments);
                    }
                }).call(this, error);
            });
    }

    public skipPlacement(skipPlacement?: boolean): boolean {
        if (typeof skipPlacement !== "undefined") {
            this._skipPlacement = skipPlacement;
        }

        return this._skipPlacement;
    }

    public source(): WorkItemSource {
        return this._workItemSource;
    }

    public field(fieldName: string): Cards.WitCardField {
        /// <summary> gets the field</summary>
        /// <param name="fieldname" type="string">fieldName</param>        

        var field: Cards.WitCardField = this._fieldMap[fieldName];
        if (!field) {
            var fieldSetting = this._getCardSetting().getField(fieldName);
            field = new WitBoardCardField(this, this._workItemSource.getFieldDefinition(fieldName), fieldSetting);
            this._fieldMap[fieldName] = field;
        }
        return field;
    }

    /**
     * See Item.beginReorder().
     * @param reorderChange
     * @param callback - The callback to be called on successful reorder
     * @param errorCallback - The callback to be called when encountered an error
     * @param ignoreError - true to ignore errors and not show an error message (will still call error callback)
     */
    public beginReorder(reorderChange: TFS_Agile.IReorderOperation, callback?: IResultCallback, errorCallback?: IErrorCallback, ignoreError?: boolean) {
        Diag.Debug.assertParamIsType(callback, "function", "callback", true);
        Diag.Debug.assertParamIsType(errorCallback, "function", "errorCallback", true);

        // first element of ancestor chain will be the work item itself if there are no ancestors or the top most ancestor if there are ancestors
        // for newly created item replace the nextId with top most ancestor, so that new item is created above top most ancestor
        if (this.isNew()) {
            // get the chain of ancestors for the nextId
            var ancestorChain = this._workItemSource.getAncestors(reorderChange.NextId);
            reorderChange.NextId = ancestorChain[0];
        }

        var startTime = Date.now();
        var reorderingOperation = this._startOperation(BoardResources.Taskboard_SavingTile, BoardResources.Taskboard_SavingTile);
        var changes: TFS_Agile.IReorderOperation = {
            ParentId: reorderChange.ParentId,
            Ids: [this.id()],
            PreviousId: reorderChange.PreviousId,
            NextId: reorderChange.NextId,
            completedCallback: (reorderManager: TFS_Agile.IReorderManager, result: TFS_Agile.IReorderResult) => {
                if (result.success) {
                    this.message(null);
                    this._onReorderComplete(result);
                    var endTime = Date.now();
                    var elapsedTime = (endTime - startTime);
                    if ($.isFunction(callback)) {
                        callback.call(this, elapsedTime);
                    }
                }
                else if (result.error) {
                    if (!ignoreError) {
                        this.message(result.error.message);
                    }
                    if ($.isFunction(errorCallback)) {
                        errorCallback.call(this);
                    }
                }
                reorderingOperation.complete();
            },
            continueOnFailure: ignoreError
        };

        Diag.logVerbose(Utils_String.format("beginReorder {0},{1},{2},{3}", changes.ParentId, changes.Ids, changes.PreviousId, changes.NextId));
        this._reorderManager.queueReorder(changes);
    }

    public isValidValue(field: string, currentValue: string, newValue: string): boolean {
        /// <summary>See Item.isValidValue()</summary>
        /// <param name="field" type="String">The field that we are trying to validate</param>
        /// <param name="currentValue" type="String">The current value of the field</param>
        /// <param name="newValue" type="String">The new value of the field</param>
        /// <returns type="Boolean">Returns true if the value is valid for the given state, false otherwise</returns>
        Diag.Debug.assertParamIsType(field, "string", "field");
        Diag.Debug.assertParamIsType(currentValue, "string", "currentValue");
        Diag.Debug.assertParamIsType(newValue, "string", "newValue");

        var transitions,
            currentValueTransitions,
            workItemTypeName = this.fieldValue(DatabaseCoreFieldRefName.WorkItemType);

        transitions = this._workItemSource.getValidTransitions(workItemTypeName);

        // Get the set of transitions that are valid from the current field value.
        // Do a case insensitive lookup
        $.each(transitions, function (name, value) {
            if (Utils_String.localeIgnoreCaseComparer(currentValue, name) === 0) {
                currentValueTransitions = value;
                return false;
            }
        });

        if (currentValueTransitions) {
            // If the newValue is contained in the transitions, it is valid.
            return Utils_Array.contains(currentValueTransitions, newValue);
        }

        return false;
    }

    public isNew(): boolean {
        /// <summary>Checks if the item is a new item</summary>
        /// <returns type="boolean">if the item is new. New items cannot be moved on the board till saved </returns>
        if (this.id() < 0) {
            return true;
        }
        return false;
    }

    public isValid(): boolean {
        /// <summary>Specifies whether the underlying workitem is in valid state</summary>
        /// <returns type="boolean">if the item is valid, requires to have the workitem opened</returns>
        if (this._workItem) {
            return this._workItem.isValid();
        }
        return false;
    }

    /**
     * Checks if the underlying work item is attached. When the board loads for the first time, only few
     * fields, which are required to display the card, are fetched and directly put in the card. The 
     * underlying work item is not attached. Only once someone opens/edits/refreshes the card, the 
     * underlying work item is fetched and attached.
     */
    public isWorkItemAttached(): boolean {
        if (this._workItem) {
            return true;
        }
        return false;
    }

    public message(message?: string): string {
        /// <summary>Get or set the message on the item</summary>
        /// <param name="message" type="String" optional="true">The message. If not undefined the message will be set.</param>
        /// <returns type="String">The current message on the item</returns>
        if (typeof message !== "undefined") {
            this._setMessage(message);
        }
        return this._getMessage();
    }

    public reset(preserveMessage?: string) {
        ///<summary>Resets the item</summary>
        ///<param name="preserveMessage" type="string" optional="true" />
        var message = preserveMessage ? this.message() : null;

        if (this._workItem) {
            this._workItem.reset();
        }
        else {
            if (this._pendingChanges) {
                delete this._pendingChanges;
            }

            // we're calling an 'internal' method which we know about since we're dealing with WIT Items and WIT ItemSources.
            this._workItemSource.fireResetEvent(this);
        }

        this.message(message);
    }

    public discard() {
        ///<summary>Discards the item</summary>
        Diag.Debug.assert(this.id() < 0, "Discard of saved work items is not supported");

        if (this._workItem) {
            this._workItem.discardIfNew();
        }
    }

    public unpinIfOpened(fieldName: string, extensionId: string) {
        ///<summary>Unpins the workitem, if already opened and also updates the paged value for the given field</summary>
        ///<param name="fieldName" type="string">The name of the field</param>
        ///<param name="extensionId" type="string">The extensionId for the extension field</param>
        if (this._workItem) {
            // Ensure that the fieldValue for the paged data is present in the paged data, before discarding it
            if (this.isWorkItemPaged()) {
                this._wiManager.unpin(this._workItem);
                // Remove the item from the cache, only if we have a backup in the paged data
                this._trySetWorkItem();
            }
            else {
                if (this._workItem.extensions && this._workItem.extensions.length > 0) {
                    this._workItem.getField(fieldName)._reset();
                    // Reset the extension
                    this._workItem.beginResetExtension(extensionId, () => this._wiManager.setWorkItem(this._workItem));
                }
            }
        }
    }

    public dispose() {
        super.dispose();
        this._reorderManager.dequeueReorder([this.id(), this.getTempId()]);
        this._detachWorkItemEvents();

        if (this._onTrySetWorkItem) {
            this._wiManager.detachWorkItemChanged(this._onTrySetWorkItem);
            this._onTrySetWorkItem = null;
        }

        if (this._workItem) {
            this._wiManager.unpin(this._workItem);
        }

        this._fieldMap = null;
    }

    public pinAndUnblockReorderOperation(workItem: WITOM.WorkItem, oldId: number) {
        ///<summary>Pins the given work item and unblocks reorder operation</summary>
        ///<param name="workItem" type="WorkItem">Work item to pin</param>
        ///<param name="oldId" type="number">temporary work item id for a newly created work item</param>

        this._wiManager.pin(workItem);
        this._reorderManager.changeReorderId(oldId, workItem.id);
        this._reorderManager.unblockReadyOperations();
    }

    public postRemoveCleanup() {
        var parentId = this.getParentId();
        if (parentId) {
            this._workItemSource.disassociate(parentId, this._id);
            this._raiseChecklistChanged(parentId);
        }
    }

    private _getCardSetting(): Cards.CardSettings {
        ///<summary>Gets the card setting for the item</summary>
        if (!this._cardSetting) {
            this._cardSetting = this._workItemSource.boardCardsSetting().getCardSettingsForItemType(this.type());
        }
        return this._cardSetting;
    }

    private _onReorderComplete(result: any) {
        if (result.success) {
            $.each(result.updatedWorkItemIds, (index: number, id: number) => {
                const item = this._workItemSource.getCachedItem(id);
                if (item) {
                    item.setOrder(result.updatedWorkItemOrders[index]);
                }
            });
        }
    }

    private _getOrderFieldReferenceName() {
        return this._workItemSource.getProcessFieldTypeReferenceName(BacklogFieldTypes.Order);
    }

    public getEffortFieldRefName() {
        return this._workItemSource.getProcessFieldTypeReferenceName(BacklogFieldTypes.Effort);

    }

    private _trySetWorkItem() {

        this._workItem = this._wiManager.getWorkItem(this._id);

        if (this._workItem) {
            this._setWorkItem(this._workItem);
        }
        else {
            this._onTrySetWorkItem = (sender, args) => {
                if (args.workItem.id === this._id) {
                    this._wiManager.detachWorkItemChanged(this._onTrySetWorkItem);
                    this._setWorkItem(args.workItem);
                    this._onTrySetWorkItem = null;
                }
            };
            this._wiManager.attachWorkItemChanged(this._onTrySetWorkItem);
        }
    }

    private _getMessage(): string {
        /// <summary>Get the current message on the item (either from the underlying work item or the wrapper's message.</summary>
        /// <returns type="String">The message</returns>
        var error;
        if (this._workItem) {
            error = this._workItem.getError();
            return error && error.message;
        }
        else {
            return this._message;
        }
    }

    private _setMessage(message: string) {
        /// <summary>Set the message</summary>
        /// <param name="message" type="String">The message to set. If message is falsy the message will be cleared.</param>
        if (this._workItem) {
            if (message) {
                this._workItem.setError(new Error(message));
            }
            else {
                this._workItem.clearError();
            }
        }
        else {
            this._message = message;
            this._raiseItemChanged({ change: ItemSource.ChangeTypes.MessageChange });
        }
    }

    private _raiseItemChanged(args?: any) {
        /// <summary>Raise event to alert listeners that the item has changed.</summary>
        /// <param name="args" type="Object" optional="true">Arguments for the event.</param>
        this._fireEvent(Item.EVENT_ITEM_CHANGED, this, $.extend({
            item: this
        }, args));
    }

    private _setWorkItem(workItem: WITOM.WorkItem) {
        /// <summary>Set the real work item</summary>
        /// <param name="workItem" type="WITOM.WorkItem">The work item</param>
        Diag.Debug.assertParamIsType(workItem, WITOM.WorkItem, "workItem");

        this._workItem = workItem;

        // Pin the work item because we're binding the Item to the WorkItem and we
        // don't want the work item to be released whilst the Item is around.
        this._wiManager.pin(workItem);

        // apply any pending fields edits
        if (this._pendingChanges) {
            $.each(this._pendingChanges, function (fieldName, value) {
                workItem.setFieldValue(fieldName, value);
            });
            delete this._pendingChanges;
        }


        this._detachWorkItemEvents();
        this._attachWorkItemEvents();
    }

    private _attachWorkItemEvents() {
        /// <summary>Attach to work item changed event on the work item</summary>
        Diag.Debug.assertIsNotNull(this._workItem, "this._workItem");

        this._onWorkItemChangedDelegate = delegate(this, this._onWorkItemChanged);
        this._workItem.attachWorkItemChanged(this._onWorkItemChangedDelegate);
    }

    private _detachWorkItemEvents() {
        /// <summary>Detach from work item changed event on the work item</summary>
        if (this._workItem) {
            this._workItem.detachWorkItemChanged(this._onWorkItemChangedDelegate);
            this._onWorkItemChangedDelegate = null;
        }
    }

    private _onWorkItemChanged(sender, args) {
        // Attach to work item events that may affect the display of the item
        // (but not it's location in the board).
        // We care about two types of changes:
        //   1. Immediate updates to the item that affect the values of the fields
        //   2. Operations that are affecting the work item.

        switch (args.change) {
            // Potential field changes
            case ItemSource.ChangeTypes.Opened:
            case ItemSource.ChangeTypes.Reset:
            case ItemSource.ChangeTypes.Refresh:
                this._message = null; // clear message without raising notification
                this._raiseItemChanged(args);
                break;
            case ItemSource.ChangeTypes.FieldChange:
            case ItemSource.ChangeTypes.ErrorChanged:
                this._raiseItemChanged(args);
                break;
            case ItemSource.ChangeTypes.Saved:
                this._workItemSource.updatePayloadData(this._workItem);

                var workItemChangeArgs: WorkItemChangeEventArgs = { workItem: this._workItem, links: args.changedWorkItemLinks };
                this._workItemSource.updateAnnotationItemSourcesData(this._workItem, workItemChangeArgs);

                var links = args.changedWorkItemLinks;
                if (!this._handleLinkChanges(links)) {// if it was an otherwise normal save operation
                    this._raiseChecklistChanged(this.getParentId());
                }
                this._raiseItemChanged(args);
                break;
            case ItemSource.ChangeTypes.Discarded:
                //if the item is being discarded which happens for temp items attempt a dequeue on the reorder queue
                //if the id is not queued for re-order it is a no-op and handled inside ReorderManager, no additional checkes needed here
                Diag.Debug.assertIsType(args.workItem, WITOM.WorkItem, "args.workItem");
                this._reorderManager.dequeueReorder([args.workItem.getUniqueId()]);
                break;
            default:
                break;
        }
    }

    private _handleLinkChanges(links: ILinkInfo[]): boolean {
        var changeMade: boolean = false;
        if (links) {
            for (var i = 0, len = links.length; i < len; i++) {
                var parentId = links[i].targetId;
                if (links[i].linkData.LinkType === TFS_Agile_Utils.WorkItemUtils.PARENT_LINKTYPE_ID) { // This item is the child
                    if (links[i].command === "remove") { // if i am removing a parent link
                        this._workItemSource.disassociate(parentId, this._id);
                    }
                    else if (links[i].command === "add") { // If I have created a new parent link
                        this._workItemSource.setChild(parentId, this._id);
                    }
                    this._raiseChecklistChanged(parentId);
                    changeMade = true;
                }
                else if (links[i].linkData.LinkType === TFS_Agile_Utils.WorkItemUtils.CHILD_LINKTYPE_ID) { // This item is the parent
                    if (links[i].command === "add") { //If I am adding a child link
                        this._workItemSource.beginGetChildren([this._id], true);
                    }
                    else if (links[i].command === "remove") { //if i am removing a child link
                        this._workItemSource.disassociate(this._id, parentId);
                    }
                    this._raiseChecklistChanged(this._id);
                    changeMade = true;
                }
            }
        }
        return changeMade;
    }

    private _raiseChecklistChanged(parentId: number) {
        if (parentId) {
            var parentItem = this._workItemSource.getCachedItem(parentId);
            if (parentItem) {
                var isAllChildAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations)
                if (isAllChildAnnotationEnabled) {
                    parentItem.fire(Item.EVENT_ITEM_CHANGED, parentItem, {
                        item: parentItem,
                        change: ItemSource.ChangeTypes.ChecklistChanged,
                        workItemType: this._workItemData ? this._workItemData.fields[WITConstants.CoreFieldRefNames.WorkItemType] : this._workItem.workItemType.name
                    });
                } else {
                    parentItem.fire(Item.EVENT_ITEM_CHANGED, parentItem, {
                        item: parentItem,
                        change: ItemSource.ChangeTypes.ChecklistChanged
                    });
                }
            }
        }
    }
}

export class WitBoardCardField extends Cards.WitCardField {

    private _card: WorkItemItemAdapter;

    constructor(card: WorkItemItemAdapter, cardFieldDefinition: Cards.WitCardFieldDefinition, cardFieldSetting: Cards.ICardFieldSetting) {
        super(card.id(), cardFieldDefinition, cardFieldSetting);
        this._card = card;
    }

    /**
     * gets/sets the field value
     * @param string the field value 
     */
    public value(fieldValue?: any): any {
        if (fieldValue !== undefined) {
            this._card.fieldValue(this.referenceName(), fieldValue);
        } else {
            fieldValue = this._card.fieldValue(this.referenceName());
        }
        return fieldValue;
    }

    /* 
     * gets if the field is editable
     * @returns boolean 
     */
    public isEditable(): boolean {

        switch (this.referenceName()) {
            // the effort field specific to the board 
            case this._card.getEffortFieldRefName():
                return true;
            default:
                return super.isEditable();
        }

    }

    public getAllowedValues(currentValue: string): string[] {
        // for effort field
        if (!Utils_String.ignoreCaseComparer(this.referenceName(), this._card.getEffortFieldRefName())) {
            return ["1", "2", "3", "5", "8", "13"];
        }
        return super.getAllowedValues(currentValue);
    }

    public hasAllowedValues(): boolean {
        var hasAllowed = false;

        // for identity fields
        if (this.definition().type() === Cards.CardFieldType.Identity) {
            hasAllowed = true;
        }
        // for effort field
        else if (!Utils_String.ignoreCaseComparer(this.referenceName(), this._card.getEffortFieldRefName())) {
            hasAllowed = true;
        } else {
            hasAllowed = super.hasAllowedValues();
        }
        return hasAllowed;
    }
}

interface IBoardWorkItemPayloadModel {
    payload: IBoardWorkItemPayload;
}

interface IBoardWorkItemPayload {
    columns: string[];
    hierarchy: IDictionaryNumberTo<number>;
    rows: any[][];
}

export class WorkItemSource extends ItemSource {

    public static itemSourceType: string = "wit";
    private static checklistPageSize: number = 200;

    public lastIncomingPagedIndex: number;
    public lastOutgoingPagedIndex: number;
    public orderedIncomingIds: number[];
    public orderedOutgoingIds: number[];

    private _reorderManager: TFS_Agile.IReorderManager;
    protected _witManager: WorkItemManager;
    private _pageData: any;
    private _pageColumns: any;
    private _parentIds: any;

    // _childrenIds should be always sorted on update
    private _childrenIds: IDictionaryNumberTo<number[]>;

    private _items: TFS_Core_Utils.Dictionary<WorkItemItemAdapter>;
    private _workItemTypes: string[];
    private _boardCardsSetting: Cards.CardSettingsProvider;
    private _fieldDefMap: IDictionaryStringTo<Cards.WitCardFieldDefinition>;
    private _processFieldTypeMap: IDictionaryNumberTo<string>;
    private _workItemChangedDelegate: Function;
    private _witHttpClient: WIT_WebApi.WorkItemTrackingHttpClient;
    private _store: WITOM.WorkItemStore;
    private _checklistOrderFieldName: string;
    private _checklistComparer: any;
    private _descendentBacklogDefaultWorkItemType: string;
    public _parentChildMap: Work_Contracts.ParentChildWIMap[];
    private _childParentMap: IDictionaryNumberTo<number>;

    constructor(configuration: any, reorderManager: TFS_Agile.IReorderManager) {
        /// <summary>An ItemSource where work items are drawn from the Work Item store.</summary>
        /// <param name="configuration" type="Object">The configuration for the item source.</param>

        super(configuration, reorderManager.teamId);
        this._reorderManager = reorderManager;
        this._initialize(configuration);
    }

    private _initialize(configuration: any) {
        if (configuration.payload.hierarchy) {
            this._parentIds = {};
            $.each(configuration.payload.hierarchy, (id: number, parentId: number) => {
                this._parentIds[parentId] = true;
            });
        }

        this.orderedIncomingIds = configuration.payload.orderedIncomingIds;
        this.lastIncomingPagedIndex = -1;
        this.orderedOutgoingIds = configuration.payload.orderedOutgoingIds;
        this.lastOutgoingPagedIndex = -1;
        this._items = new TFS_Core_Utils.Dictionary<WorkItemItemAdapter>();
        this._store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        this._witManager = WorkItemManager.get(this._store);
        this._workItemChangedDelegate = delegate(this, this._workItemChanged);
        this._witManager.attachWorkItemChanged(this._workItemChangedDelegate);
        this._pageData = {};
        this._childrenIds = {};
        this._pageColumns = {};
        this._fieldDefMap = {};
        this._processFieldTypeMap = {};

        if (configuration.itemTypes) {
            var isInlineWorkItemsEnabled;
            var isAllChildAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations);
            if (isAllChildAnnotationEnabled) {
                isInlineWorkItemsEnabled = Board.BoardAnnotationSettings.isAnyAnnotationEnabled();
            } else {
                isInlineWorkItemsEnabled = Board.BoardAnnotationSettings.isAnnotationApplicable(BoardAnnotationsIdentifier.ChecklistAnnotation);
            }
            this._workItemTypes = configuration.itemTypes;

            if (isInlineWorkItemsEnabled) {
                var descendentBacklogLevelConfiguration = TFS_Agile_Utils.BacklogLevelUtils.getDescendentBacklogLevelConfigurationForWorkItemType(this._workItemTypes[0]);
                this._descendentBacklogDefaultWorkItemType = descendentBacklogLevelConfiguration.defaultWorkItemType;
            }

            // Pre-fetch work item types.
            this._store.beginGetProject(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId,
                (project: WITOM.Project) => {
                    Diag.Debug.assertParamIsObject(project, "project");
                    project.beginGetWorkItemTypes(isInlineWorkItemsEnabled ? this._workItemTypes.concat(this._descendentBacklogDefaultWorkItemType) : this._workItemTypes, () => { });

                    // Pre-fetch notes data without impacting TTI
                    project.nodesCacheManager.beginGetNodes();
                });

            if (isInlineWorkItemsEnabled) {

                this._checklistOrderFieldName = BacklogConfigurationService.getBacklogFieldName(BacklogFieldTypes.Order);

                this._checklistComparer = FunctionCollection.getFunction({
                    id: "checklistComparer",
                    data: {
                        orderFieldName: this._checklistOrderFieldName
                    }
                });
            }
        }

        if (configuration.fieldDefinitions) {
            Util_Cards.initializeFieldDefinitions(configuration.fieldDefinitions, this._fieldDefMap);
        }
    }

    public dispose() {
        if (this._workItemChangedDelegate) {
            this._witManager.detachWorkItemChanged(this._workItemChangedDelegate);
            this._workItemChangedDelegate = null;
        }

        this._fieldDefMap = null;
        super.dispose();
    }

    public type(): string {
        return WorkItemSource.itemSourceType;
    }

    private _getWitHttpClient() {
        if (!this._witHttpClient) {
            this._witHttpClient = this._store.tfsConnection.getHttpClient<WIT_WebApi.WorkItemTrackingHttpClient>(WIT_WebApi.WorkItemTrackingHttpClient);
        }
        return this._witHttpClient;
    }

    public boardCardsSetting(setting?: Cards.CardSettingsProvider): Cards.CardSettingsProvider {
        /// <summary>settings for the items provided by the item source</summary>

        if (setting !== undefined) {
            this._boardCardsSetting = setting;
        }
        return this._boardCardsSetting;
    }

    /**
     * Provides a way for an AnnotationItemSource to raise event through WorkItemSource.
     * @param {number[]} itemIds
     * @param {AnnotationItemSource} annotationItemSource
     */
    public raiseEventForAnnotationItemSource(itemIds: number[], annotationItemSource: AnnotationItemSource): void {
        Diag.Debug.assertIsNotNull(itemIds, "itemIds is null");
        Diag.Debug.assertIsNotNull(annotationItemSource, "annotationItemSource is null");

        itemIds.forEach((itemId: number) => {
            var item = this._items.get(itemId);

            Diag.Debug.assertIsNotNull(item, "item is null");

            item.fire(Item.EVENT_ITEM_CHANGED, this, {
                item: item,
                change: ItemSource.ChangeTypes.AnnotationItemSourceChanged,
                annotationItemSource: annotationItemSource
            });
        });
    }

    public getProcessFieldTypeReferenceName(fieldType: BacklogFieldTypes): string {

        var fieldRefName: string = this._processFieldTypeMap[fieldType];

        if (!fieldRefName) {
            fieldRefName = BacklogConfigurationService.getBacklogFieldName(fieldType);
            this._processFieldTypeMap[fieldType] = fieldRefName;
        }
        return fieldRefName;
    }

    public isParent(id) {
        Diag.Debug.assertParamIsType(id, "number", "id");
        if (this._parentIds) {
            return this._parentIds.hasOwnProperty(id);
        }
        else {
            return false;
        }
    }

    public getParent(id) {
        Diag.Debug.assertParamIsType(id, "number", "id");
        if (this._configuration.payload.hierarchy) {
            return this._configuration.payload.hierarchy[id];
        }
        else {
            return null;
        }
    }

    public getCachedItem(id): WorkItemItemAdapter {
        Diag.Debug.assertParamIsType(id, "number", "id");
        return this._items.get(id);
    }

    public getCachedItems(): WorkItemItemAdapter[] {
        return this._items.values();
    }

    public getAncestors(id) {
        Diag.Debug.assertParamIsType(id, "number", "id");

        var parentId = this.getParent(id),
            chain;

        if (parentId) {
            chain = this.getAncestors(parentId);
            chain.push(id);
        }
        else {
            chain = [id];
        }

        return chain;
    }

    public getItemTypes(): string[] {
        /// <summary>Returns the work item types which can be belong to this source</summary>
        return this._workItemTypes;
    }

    /**
    * Returns the number of items
    * @returns {number}
    */
    public getItemCount(): number {
        return this._items.count();
    }

    public getFieldDefinition(fieldRefName: string): Cards.WitCardFieldDefinition {
        /// <summary>get the field definition for specified field</summary>
        /// <param name="fieldRefName" type="string">field reference name</param>
        /// <returns type="WitCardFieldDefinition"></returns>

        var fieldDef = this._fieldDefMap[fieldRefName.toUpperCase()];
        if (!fieldDef) {
            fieldDef = new Cards.WitCardFieldDefinition(fieldRefName);
            this._fieldDefMap[fieldRefName.toUpperCase()] = fieldDef;
        }
        return fieldDef;
    }

    public getFieldDefinitions(): IDictionaryStringTo<Cards.CardFieldDefinition> {
        /// <summary>gets the map of field reference name to field definition for all fields</summary>
        /// <returns type="IDictionaryStringTo<Cards.CardFieldDefinition>"></returns>
        return this._fieldDefMap;
    }

    /**
     * Gets the value of the given field of all the items in the itemSource,
     * whose types are allowed on this board.
     * @param fieldName Name of the field for which the values are to be retrieved
     */
    public getFieldValuesOfAllBoardItems(fieldName: string): string[] {
        const fieldValues: string[] = [];
        const boardTypes = this.getItemTypes();
        for (const item of this._items.values()) {
            const type = item.type();
            // Return the values of items belonging to the types allowed on the current board only
            if (Utils_Array.contains(boardTypes, type, Utils_String.localeIgnoreCaseComparer)) {
                const fieldValue = item.fieldValue(fieldName);
                if (fieldValue) {
                    fieldValues.push(fieldValue);
                }
            }
        }

        return Utils_Array.unique(fieldValues, Utils_String.localeIgnoreCaseComparer);
    }

    public beginGetItem(id: number, callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>See ItemSource.beginGetItem</summary>
        /// <param name="id" type="Number">See ItemSource.beginGetItem</param>
        /// <param name="callback" type="IResultCallback">See ItemSource.beginGetItem</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">See ItemSource.beginGetItem</param>
        Diag.Debug.assertParamIsType(id, "number", "id");
        Diag.Debug.assertParamIsType(callback, "function", "callback");

        this._witManager.beginGetWorkItem(id,
            (workItem: WITOM.WorkItem) => {
                // createItem takes care of ensuring we don't create multiple Items that wrap
                // the same WorkItem
                this._witManager.pin(workItem);
                callback(this.createItem(id));
            },
            errorCallback,
            false, null, true
        );
    }

    public beginGetItems(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Asynchronously retrieves the full list of items</summary>
        /// <param name="callback" type="IResultCallback">The function to provide the items</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">The function to call on error.</param>
        Diag.Debug.assertParamIsType(callback, "function", "callback");
        Diag.Debug.assertParamIsType(errorCallback, "function", "errorCallback", true);
        var items: WorkItemItemAdapter[];

        if (this._configuration.itemIds) {
            this._witManager.beginGetWorkItems(this._configuration.itemIds, (workItems) => {
                items = $.map(workItems, (workItem) => {

                    // TODO: Review whether we can avoid pinning the values in the WitManager
                    // Currently required so that they are not removed from the cache whilst we have
                    // a reference to them in the "Item".
                    this._witManager.pin(workItem);

                    return this.createItem(workItem);
                });

                callback(items);
            }, errorCallback, { includeExtensionFields: true });
        }
        else if (this._configuration.payload) {
            this._pageColumns = this._configuration.payload.columns;
            this.buildCache(this._configuration.payload.rows);

            items = $.map(this._pageData, (row, i) => {
                var id = +i;
                var item = this.createItem(id);

                if (!this.isParent(id)) {
                    return item;
                }
                else {
                    return null;
                }
            });

            callback(items);
        }
        else {
            callback([]);
        }
    }

    // export for unit testing
    public createItem(id: number, workItem?: WITOM.WorkItem) {
        var out;

        out = {};

        if (!this._items.tryGetValue(id, out)) {
            out.value = new WorkItemItemAdapter(this, id, this._reorderManager, workItem);
            this._items.set(id, out.value);
        }

        return out.value;
    }

    public clearItems() {
        var items = this._items.values();
        for (var i = 0, len = items.length; i < len; i++) {
            items[i].dispose();
        }
        this._items.clear();
    }

    public clearItem(id: number) {
        var out: any = {};
        if (this._items.tryGetValue(id, out)) {
            out.value.dispose();
        }
        this._items.remove(id);
    }

    private _getChildIDsWiql(parentIDs: number[]): string {
        Diag.Debug.assertParamIsArray(parentIDs, "parentIDs", true);

        if (!parentIDs || parentIDs.length === 0) {
            return "";
        }

        var wiql: string = "SELECT [{0}] FROM WorkItemLinks " +
            "WHERE ([Source].[System.Id] IN ({1})) AND ([System.Links.LinkType] = '{2}') " +
            "AND ([Target].[System.WorkItemType] = '{3}') mode(MustContain)";

        return Utils_String.format(wiql,
            WITConstants.CoreFieldRefNames.Id,
            parentIDs.toString(),
            TFS_Agile_Utils.WorkItemUtils.CHILD_LINK_NAME,
            this._descendentBacklogDefaultWorkItemType);
    }

    /**
     * Used only when Card Annotation feature flag for all backlog level child work item types is on.
     * Modified WIQL that specifies which child work item types to query, parameterized by TYPES.
     */
    private _getChildIDsWithTypeWiql(parentIDs: number[], types: string[]): string {
        Diag.Debug.assertParamIsArray(parentIDs, "parentIDs", true);

        if (!parentIDs || parentIDs.length === 0) {
            return "";
        }

        var wiql: string = "SELECT [{0}] FROM WorkItemLinks " +
            "WHERE ([Source].[System.Id] IN ({1})) AND ([System.Links.LinkType] = '{2}') " +
            "AND ([Target].[System.WorkItemType] IN ({3})) mode(MustContain)";

        return Utils_String.format(wiql,
            WITConstants.CoreFieldRefNames.Id,
            parentIDs.toString(),
            TFS_Agile_Utils.WorkItemUtils.CHILD_LINK_NAME,
            types);
    }

    private _beginGetChildIDs(parentIDs: number[]): IPromise<IDictionaryNumberTo<number[]>> {
        Diag.Debug.assertParamIsArray(parentIDs, "parentIDs", true);

        var deferred = Q.defer<IDictionaryNumberTo<number[]>>();
        if (!parentIDs || parentIDs.length === 0) {
            deferred.resolve({});
            return deferred.promise;
        }

        var wiql = this._getChildIDsWiql(parentIDs);
        this._getWitHttpClient().queryByWiql({ query: wiql }, tfsContext.navigation.project).then(queryResult => {

            var parentChildMap: IDictionaryNumberTo<number[]> = {};
            $.each(queryResult.workItemRelations, (i: number, relation: WIT_Contracts.WorkItemLink) => {

                if (relation.source && relation.target) {
                    var sourceID: number = relation.source.id;
                    var targetID: number = relation.target.id;

                    if (!parentChildMap[sourceID]) {
                        parentChildMap[sourceID] = [];
                    }
                    parentChildMap[sourceID].push(targetID);
                }
            });

            deferred.resolve(parentChildMap);
        });


        return deferred.promise;
    }

    private _beginGetChildIDsWithType(parentIDs: number[], types: string[]): IPromise<IDictionaryNumberTo<number[]>> {
        Diag.Debug.assertParamIsArray(parentIDs, "parentIDs", true);

        var deferred = Q.defer<IDictionaryNumberTo<number[]>>();
        if (!parentIDs || parentIDs.length === 0) {
            deferred.resolve({});
            return deferred.promise;
        }

        var stringedTypes = $.map(types, (type) => {
            return "'" + type + "'";
        });

        var wiql = this._getChildIDsWithTypeWiql(parentIDs, stringedTypes);
        this._getWitHttpClient().queryByWiql({ query: wiql }, tfsContext.navigation.project).then(queryResult => {

            var parentChildMap: IDictionaryNumberTo<number[]> = {};
            $.each(queryResult.workItemRelations, (i: number, relation: WIT_Contracts.WorkItemLink) => {

                if (relation.source && relation.target) {
                    var sourceID: number = relation.source.id;
                    var targetID: number = relation.target.id;

                    if (!parentChildMap[sourceID]) {
                        parentChildMap[sourceID] = [];
                    }
                    parentChildMap[sourceID].push(targetID);
                }
            });

            deferred.resolve(parentChildMap);
        });

        return deferred.promise;
    }

    /**
     * Returns and sets the parentItems Map, if already set returns directly else makes a server call
     * @param childrenToFetch ChildIds for which the parentChild Map is need to be fetched. If not present return the current parentChildMap
     * @param errorCallback Function to call with the error thrown by server if any
     */
    public beginGetParents(childrenToFetch?: number[], errorCallback?: Function): IPromise<Work_Contracts.ParentChildWIMap[]> {
        var deferred = Q.defer<Work_Contracts.ParentChildWIMap[]>();

        if (!this._parentChildMap && childrenToFetch && childrenToFetch.length > 0) {
            this.beginGetParentChildMap(childrenToFetch, errorCallback).then((parentChildMap: Work_Contracts.ParentChildWIMap[]) => {

                deferred.resolve(this._parentChildMap);
            });
        }
        else {
            deferred.resolve(this._parentChildMap);
        }

        return deferred.promise;
    }

    /**
     * Sets the data structure holding the Array of ParentItems of type ParentChildWIMap
     * @param parentChildMap Map to set the itemSource parentChildMap or merge based on the condition
     */
    public setParentChildMap(parentChildMap: Work_Contracts.ParentChildWIMap[]): void {
        if (parentChildMap) {
            this._parentChildMap = [];
            if (parentChildMap.length > 0) {
                if (parentChildMap[0].id !== unparentedId) {
                    this._parentChildMap.push({ childWorkItemIds: [unparentedId], id: unparentedId, title: AgileControlsResources.Kanban_Unparented });
                }
                this._parentChildMap = this._parentChildMap.concat(parentChildMap);
                this._setChildParentMap(this._parentChildMap);
            }
        }
    }

    /**
     * The method which returns the childId to ParentId Map one-to-one relation
     */
    public getParentId(id: number): number {
        if (!this._childParentMap) {
            return null;
        }

        if (this._childParentMap[id]) {
            return this._childParentMap[id];
        }
        else {
            return unparentedId;
        }
    }

    // Making it public for Unit testing
    public beginGetParentChildMapInternal(childrenToFetch: number[]): IPromise<Work_Contracts.ParentChildWIMap[]> {

        const backlogContext = TFS_Agile.BacklogContext.getInstance();
        const backlogLvlIdentifier = backlogContext.level.id;
        const teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: backlogContext.team.id
        };
        const tfsConnection = new Service.VssConnection(tfsContext.contextData);
        const workHttpClient = tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        return workHttpClient.getBoardMappingParentItems(teamContext, backlogLvlIdentifier, childrenToFetch);
    }

    // Making it public for Unit testing
    public beginGetParentChildMap(childrenToFetch: number[], errorCallback?: Function): IPromise<Work_Contracts.ParentChildWIMap[]> {
        // read parent data by paging for 200 children at a time
        const pageSize = WorkItemSource.checklistPageSize;
        const totalNumberOfChildrenToFetch: number = childrenToFetch.length;
        const parentItemsPromises: Q.IPromise<Work_Contracts.ParentChildWIMap[]>[] = [];
        for (let i = 0; i < totalNumberOfChildrenToFetch; i += pageSize) {
            const idsToPage = childrenToFetch.slice(i, i + pageSize);
            parentItemsPromises.push(this.beginGetParentChildMapInternal(idsToPage));
        }

        return Q.all(parentItemsPromises).then(
            (parentChildMap: Array<Work_Contracts.ParentChildWIMap[]>) => {
                for (let i = 0, len = parentChildMap.length; i < len; i++) {
                    this._mergeParentChildMap(parentChildMap[i]);
                }

                return this._parentChildMap;
            },
            (error: Error) => {
                // Show error message when the board filter parent item fetch fails
                if ($.isFunction(errorCallback)) {
                    errorCallback(error.message, VSS_Notifications.MessageAreaType.Error);
                }
                return this._parentChildMap;
            });
    }

    private _mergeParentChildMap(parentChildMap: Work_Contracts.ParentChildWIMap[]): void {
        // Merge previous this._parentChildMap with the another parentItems array
        // Which is obtained in scenario when we click on see more items
        // For making it optimal constructing a dictionary to check if a particular ParentId is already present
        // If present merge the respective childIds, else append the new parentId
        if (!this._parentChildMap) {
            this.setParentChildMap(parentChildMap);
            return;
        }

        const parentChildDictionary: IDictionaryNumberTo<number> = {};
        this._parentChildMap.forEach((item, index) => {
            parentChildDictionary[item.id] = index;
        });

        for (const item of parentChildMap) {
            const originalIndex = parentChildDictionary[item.id];
            if (originalIndex !== undefined) {
                this._parentChildMap[originalIndex].childWorkItemIds = this._parentChildMap[originalIndex].childWorkItemIds.concat(item.childWorkItemIds);
            } else {
                this._parentChildMap.push(item);
            }
        }

        this._setChildParentMap(this._parentChildMap);
    }

    private _setChildParentMap(parentChildMap: Work_Contracts.ParentChildWIMap[]): void {
        if (parentChildMap && parentChildMap.length > 0) {
            this._childParentMap = {};
            for (var row of parentChildMap) {
                for (var childId of row.childWorkItemIds) {
                    this._childParentMap[childId] = row.id;
                }
            }
        }
    }

    public beginGetChildren(parentsToFetch: number[], forceServerCall?: boolean): IPromise<IDictionaryNumberTo<Item[]>> {
        var deferred = Q.defer<IDictionaryNumberTo<Item[]>>();

        var childIds: number[] = [];
        var children: number[];
        var childItemsDictionary: IDictionaryNumberTo<Item[]> = {};
        var parentItem: Item;

        var needToMakeServerCall: boolean = false;
        if (forceServerCall) {
            needToMakeServerCall = true;
        }
        else if (parentsToFetch && parentsToFetch.length) {
            // TODO: Optionally we can optimize to only get the ids we don't already have.
            //       However this current implementation will go get all if any child item
            //       is not present.
            $.each(parentsToFetch, (index: number, parentId: number) => {
                var childIdsForParent = this._childrenIds[parentId]
                if (childIdsForParent && childIdsForParent.length > 0) {
                    var childItems = childItemsDictionary[parentId] = [];
                    for (var i = 0; i < childIdsForParent.length; i++) {
                        var out: any = {};
                        if (this._items.tryGetValue(childIdsForParent[i], out)) {
                            var childItem = out.value;
                            if (!childItem) {
                                needToMakeServerCall = true;
                                return false;
                            }
                            childItems.push(childItem);
                        }
                    }
                }
                else {
                    needToMakeServerCall = true;
                    return false;
                }
            });
        }

        if (needToMakeServerCall) {
            childItemsDictionary = {};
            // get all child Ids using WIQL query based on parent work item ids
            var promise;
            var isAllChildAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations)
            if (isAllChildAnnotationEnabled) {
                const workItemTypeNames: string[] = isAllChildAnnotationEnabled ? Board.BoardAnnotationSettings.getApplicableAnnotationNames() : [];
                promise = this._beginGetChildIDsWithType(parentsToFetch, workItemTypeNames);
            } else {
                promise = this._beginGetChildIDs(parentsToFetch);
            }

            promise.then((childHierarchy) => {

                $.each(parentsToFetch, (index, parentId) => {
                    children = childHierarchy[parentId];
                    if (children && children.length) {
                        Utils_Array.addRange(childIds, children);
                    }
                });

                // read all children by paging
                if (childIds.length > 0) {
                    var fields = [WITConstants.CoreFieldRefNames.Id, WITConstants.CoreFieldRefNames.Title, WITConstants.CoreFieldRefNames.State,
                    WITConstants.CoreFieldRefNames.WorkItemType, WITConstants.CoreFieldRefNames.AssignedTo, this._checklistOrderFieldName];

                    this._beginGetItems(childIds, fields).then((childItems: IDictionaryNumberTo<Item>) => {
                        $.each(parentsToFetch, (index, parentId) => {
                            children = childHierarchy[parentId];
                            if (children && children.length) {
                                childItemsDictionary[parentId] = $.map(children, (value, i) => {
                                    childItems[value].setParentId(parentId);
                                    return childItems[value];
                                });
                                this._clearChildren(parentId);
                                this._setChildrenIds(parentId, childItemsDictionary[parentId]);
                                parentItem = this._items.get(parentId);
                                var isAllChildAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations)
                                if (isAllChildAnnotationEnabled) {
                                    $.each(childItems, (index, workItemAdapter) => {
                                        const childWorkItemTypeName = workItemAdapter.type();
                                        parentItem.fire(Item.EVENT_ITEM_CHANGED, this, {
                                            item: parentItem,
                                            change: ItemSource.ChangeTypes.ChecklistChanged,
                                            workItemType: childWorkItemTypeName
                                        });
                                    });
                                } else {
                                    parentItem.fire(Item.EVENT_ITEM_CHANGED, this, {
                                        item: parentItem,
                                        change: ItemSource.ChangeTypes.ChecklistChanged
                                    });
                                }
                            };
                        });

                        deferred.resolve(childItemsDictionary);
                    });
                }
                else {
                    deferred.resolve(childItemsDictionary);
                }
            });
        }
        else {
            deferred.resolve(childItemsDictionary);
        }
        return deferred.promise;
    }

    public getChildren(parentId: number): Item[] {
        var childItems: Item[] = [],
            childIds: number[] = this._childrenIds[parentId];

        if (childIds && childIds.length) {
            $.each(childIds, (index, childId) => {
                let item = this._items.get(childId);
                if (item) {
                    Utils_Array.add(childItems, item);
                }
            });
        }
        return childItems;
    }

    /**
     * Sets a new parent for the given child work item and sorts the child id list
     *
     * @param parentId Id of a new parent
     * @param childId child Id
     */
    public setChild(parentId: number, childId: number) {
        var childIds = this._childrenIds[parentId];
        if (childIds) {
            if (!(childIds.indexOf(childId) >= 0)) {
                childIds.push(childId);

                // sort childrenIds
                var childItems: Item[] = [];
                $.each(childIds, (index, childId) => {
                    Utils_Array.add(childItems, this._items.get(childId));
                });
                this._setChildrenIds(parentId, childItems);
            }
        } else {
            this._childrenIds[parentId] = [childId];
        }

        // set a new parent
        var childItem: Item = this._items.get(childId);
        childItem.setParentId(parentId);
    }

    /**
    * Sorts the children Id list of the given work item
    *
    * @param parentId parent work item id 
    */
    public sortChildrenIds(parentId: number) {
        var childItems = this.getChildren(parentId);
        this._setChildrenIds(parentId, childItems);
    }

    private _clearChildren(parentId: number) {
        var existingChildIds = this._childrenIds[parentId];
        if (existingChildIds && existingChildIds.length) {
            $.each(existingChildIds, (index, childId) => {
                this.clearItem(childId);
            });
        }

        this._childrenIds[parentId] = [];
    }

    private _setChildrenIds(parentId: number, childItems: Item[]) {
        this._childrenIds[parentId] = [];

        // sort children by stack rank
        childItems.sort(this._checklistComparer);

        // set new child data
        if (childItems && childItems.length) {
            $.each(childItems, (index, childItem) => {
                this._items.set(childItem.id(), childItem as any);
            });

            var newChildIds = $.map(childItems, (childItem) => { return childItem.id(); });
            this._childrenIds[parentId] = newChildIds;
        }
    }

    private _beginGetItems(itemIds: number[], fields: string[]): IPromise<IDictionaryNumberTo<Item>> {

        var deferred = Q.defer<IDictionaryNumberTo<Item>>();
        var items: IDictionaryNumberTo<Item> = {};
        if (itemIds && itemIds.length) {
            PageWorkItemHelper.pageWorkItems(itemIds, null, fields)
                .then((workItems: WIT_Contracts.WorkItem[]) => {
                    $.each(workItems, (i, workItem) => {
                        items[workItem.id] = new WorkItemItemAdapter(this, workItem.id, this._reorderManager, null, workItem);
                    });
                    deferred.resolve(items);
                });
        } else {
            deferred.resolve(items);
        }
        return deferred.promise;
    }

    private _getParentOptionFields(teamId: string): string[] {
        return TFS_Agile_Utils.WorkItemUtils.getParentOptionFields(teamId);
    }

    /**
     * Asynchronously retrieves the next page of items
     * @param teamId current teamId guid as string
     * @param scope The scope to use when retrieving the paged data
     * @param pageSize page size
     * @param callback The function to provide the items
     * @param errorCallback The function to call on error
     * @param pagingCountData Telemetry data for paging counts CI events
     */
    public beginPageItems(teamId: string, scope: string, pageSize: number, callback: IResultCallback, errorCallback?: IErrorCallback, pagingCountData?: IDictionaryStringTo<any>): Ajax.IAjaxRequestContext {
        const idsToPage = this.getNextPageIds(scope, pageSize);

        // Update the parentChildMap in item source with the new sets of ids obtained after clicking on see-more-items
        // Fetch the Parent information for new items being paged only if parentChildMap is set
        if (this._parentChildMap && idsToPage.length > 0) {
            this.beginGetParentChildMap(idsToPage, null);
        }

        return this._beginPageItems(teamId, idsToPage, callback, errorCallback, pagingCountData);
    }

    public getNextPageIds(scope: string, pageSize: number): number[] {
        /// <summary>Returns an array of the IDs of the next page items from the source based on currently paged index</summary>
        /// <param name="scope" type="string">The scope to use when retrieving the paged data</param>
        /// <param name="pageSize" type="number">page size</param>
        Diag.Debug.assert(pageSize > 0, "Invalid page size");

        var idsToPage: number[];
        var firstIndexToPage = 0;

        if (Utils_String.localeIgnoreCaseComparer(scope, BoardColumnType.INCOMING) === 0) {
            firstIndexToPage = this.lastIncomingPagedIndex + 1;
            idsToPage = this.orderedIncomingIds.slice(firstIndexToPage, firstIndexToPage + pageSize);
            this.lastIncomingPagedIndex += idsToPage.length;
        }
        else if (Utils_String.localeIgnoreCaseComparer(scope, BoardColumnType.OUTGOING) === 0) {
            firstIndexToPage = this.lastOutgoingPagedIndex + 1;
            idsToPage = this.orderedOutgoingIds.slice(firstIndexToPage, firstIndexToPage + pageSize);
            this.lastOutgoingPagedIndex += idsToPage.length;
        }
        else {
            Diag.Debug.fail("Unexpected scope passed to WorkItemSource.beginPageItems");
        }
        return idsToPage;
    }

    public canPageItems(scope: string): boolean {
        /// <summary>Returns true if the source has enough items to retrieve the next page based on currently paged index</summary>
        /// <param name="scope" type="string">The scope to use when retrieving the paged data</param>

        var canPageItems = false;
        if (Utils_String.localeIgnoreCaseComparer(scope, BoardColumnType.INCOMING) === 0) {
            canPageItems = this.orderedIncomingIds.length > 0 && this.lastIncomingPagedIndex + 1 < this.orderedIncomingIds.length;
        }
        else if (Utils_String.localeIgnoreCaseComparer(scope, BoardColumnType.OUTGOING) === 0) {
            canPageItems = this.orderedOutgoingIds.length > 0 && this.lastOutgoingPagedIndex + 1 < this.orderedOutgoingIds.length;
        }
        else {
            Diag.Debug.fail("Unexpected scope passed to WorkItemSource.canPageItems");
        }
        return canPageItems;
    }

    public getValidTransitions(workItemTypeName: string): any {
        /// <summary>Returns the valid transitions for the board</summary>
        /// <param name="workItemTypeName" type="String">The type of work item</param>
        /// <returns type="Object">A JSON object that holds all the valid transition for the given work item type</returns>
        Diag.Debug.assertParamIsType(workItemTypeName, "string", "workItemTypeName");

        return this._configuration.transitions[TFS_Agile_Utils.WorkItemUtils.getKeyFromWorkItemTypeName(workItemTypeName)];
    }

    /**
     * Updates the transitions with the new member name
     * @param oldColumnName Original name of the member
     * @param newColumnName New name of the member
     */
    public updateTransitions(oldColumnName: string, newColumnName: string) {
        var transitions = this._configuration.transitions;
        var workItemTypes = this.getItemTypes();
        workItemTypes.forEach((workItemType: string) => {
            let key = TFS_Agile_Utils.WorkItemUtils.getKeyFromWorkItemTypeName(workItemType);
            var currentTransitions = transitions[key];
            var oldColumnTransitions = currentTransitions[oldColumnName];
            Diag.Debug.assertIsNotNull(oldColumnTransitions);

            for (var currentColumn in currentTransitions) {
                if (currentTransitions.hasOwnProperty(currentColumn)) {
                    var allowedStates = currentTransitions[currentColumn];
                    var index = Utils_Array.indexOf(allowedStates, oldColumnName);
                    if (index > -1) {
                        allowedStates[index] = newColumnName;
                    }
                }
            }
            transitions[key][newColumnName] = oldColumnTransitions;
            delete transitions[key][oldColumnName];
        });
    }

    public getPayloadFieldValue(id, fieldName) {
        var fieldIndex;

        if (this._pageData[id]) {
            $.each(this._pageColumns, function (i, columnName) {
                if (columnName === fieldName) {
                    fieldIndex = i;
                    return false; // break
                }
            });

            return this._pageData[id][fieldIndex];
        }
        return null;
    }

    public isWorkItemPaged(id: number): boolean {
        /// <summary>Checks if the given workitem is present in the paged payload</summary>
        /// <param name="id" type="number">The id of the given item</param>
        /// <returns type="boolean"> Indicates whether the payload was found</returns>
        return !!this._pageData[id];
    }

    public updatePayloadData(workItem: WITOM.WorkItem) {
        /// <summary>Updates the paged data, to be in sync with the latest workitem</summary>
        /// <param name="workItem" type="WITOM.WorkItem">The workitem to sync the paged data with</param>
        if (workItem) {
            var pageData = this._pageData[workItem.id];
            if (pageData) {
                for (var i = 0, l = this._pageColumns.length; i < l; i++) {
                    pageData[i] = workItem.getFieldValue(this._pageColumns[i]);
                }
            }
        }
    }

    /**
     * Updates the AnnotationItemSource cache with latest data for given workitem.
     * @param {WITOM.WorkItem} workItem
     * @param {WorkItemChangeEventArgs} args
     */
    public updateAnnotationItemSourcesData(workItem: WITOM.WorkItem, args: WorkItemChangeEventArgs): void {
        Diag.Debug.assertIsNotNull(workItem, "workItem is null");

        this.retrieveAnnotationItemSourceData([workItem.id], args);
    }

    public buildCache(payloadRows: any[]) {
        /// <summary> Builds a cache of payload rows </summary>
        /// <param name="payloadRows" type="Array">Payload rows</param>
        if (payloadRows) {
            for (var i = 0, l = payloadRows.length; i < l; i++) {
                var row = payloadRows[i];
                var id = row[0];
                this._pageData[id] = row;

                //update latest data that we have in the work item manager cache
                var workItem = this._witManager.getWorkItem(id);
                if (workItem && workItem.isDirty()) {
                    this.updatePageRow(workItem);
                }
            }
        }
        this._updatePagingIndices();
    }

    public updatePageRow(workItem: any) {
        /// <summary>Unconditionally updates a row with current work item information</summary>
        /// <param name="workItem" type="Object">The work item that we want to update in the grid</param>
        Diag.Debug.assertParamIsObject(workItem, "workItem");

        let id, row, i, l, pageColumns, field;

        id = workItem.getUniqueId();

        row = this._pageData[id];

        if (row) {
            pageColumns = this._pageColumns;

            for (i = 0, l = pageColumns.length; i < l; i++) {
                field = workItem.getField(pageColumns[i]);

                if (field) {
                    if (field.fieldDefinition.id === WITConstants.CoreField.Id) {
                        row[i] = workItem.getUniqueId();
                    }
                    else {
                        row[i] = field.getValue();
                    }
                }
                else {
                    row[i] = null;
                }
            }
        }
    }

    public fireResetEvent(item: Item) {
        /// <summary>Fires the 'save-completed' event</summary>
        /// <param name="item" type="Item">The item to fire the event for</param>
        this._fireChangeEvent(item, ItemSource.ChangeTypes.Reset);
    }

    public fireDiscardedEvent(item: Item) {
        /// <summary>Fires the 'discarded' event</summary>
        /// <param name="item" type="Item">The item to fire the event for</param>
        this._fireChangeEvent(item, ItemSource.ChangeTypes.Discarded);
    }

    public fireSaveCompleted(item: Item) {
        /// <summary>Fires the 'save-completed' event</summary>
        /// <param name="item" type="Item">The item to fire the event for</param>
        this._fireChangeEvent(item, ItemSource.ChangeTypes.SaveCompleted);
    }

    public beginCreateNewItem(teamId: string, workItemTypeName: string): Q.Promise<Item> {
        /// <summary>Creates an workitem on the board of the specified type, and retuns an Item corresponding to it.</summary>
        /// <param name="workItemType" type="string">The type of the new workItem</param>
        /// <returns type="JQueryPromiseVR<Item, TfsError>"> A promise to return a new board item</param>

        var deferred = Q.defer<Item>();

        var getNewItem = (workItem: WITOM.WorkItem) => {
            var out: any = {};

            this._items.tryGetValue(workItem.getUniqueId(), out);
            deferred.resolve(out.value);
        };

        // Create an unparented workitem of the specified type ; on successful CREATE, the workItem manager will
        // raise an event which will cause the Board to create an Item out of the new WorkItem.
        TFS_Agile_Utils.WorkItemUtils.beginGetWorkItemType(workItemTypeName)
            .then(
            (witType: WITOM.WorkItemType) => {
                TFS_Agile_Utils.WorkItemUtils.beginCreateWorkItem(
                    teamId,
                    witType, {
                        parenting: { id: 0, fields: null },
                        useDefaultIteration: true
                    })
                    .then(
                    (workItem: WITOM.WorkItem) => { getNewItem(workItem); },
                    (error: TfsError) => { deferred.reject(error); });
            },
            (error: TfsError) => { deferred.reject(error); });

        return deferred.promise;
    }

    public beginCreateNewChildItem(teamId: string, parentId: number, workItemTypeName: string): Q.Promise<Item> {
        // Create an workitem of the specified type with the parentId linked ; on successful CREATE, the workItem manager will
        // raise an event which will cause the Board to create an Item out of the new WorkItem.

        var deferred = Q.defer<Item>();

        let getNewItem = (workItem: WITOM.WorkItem) => {

            if (!this._childrenIds[parentId]) {
                this._childrenIds[parentId] = [];
            }

            this._childrenIds[parentId].push(workItem.getUniqueId());
            deferred.resolve(this._items.get(workItem.getUniqueId()));
        };

        this._store.beginGetLinkTypes(() => {
            TFS_Agile_Utils.WorkItemUtils.beginGetWorkItemType(workItemTypeName)
                .then(
                (witType: WITOM.WorkItemType) => {
                    TFS_Agile_Utils.WorkItemUtils.beginCreateWorkItem(teamId, witType, {
                        parenting: {
                            id: parentId,
                            fields: this._getParentOptionFields(teamId)
                        },
                        useDefaultIteration: false
                    }).then(
                        (workItem: WITOM.WorkItem) => { getNewItem(workItem); },
                        (error: TfsError) => { deferred.reject(error); });
                },
                (error: TfsError) => { deferred.reject(error); });
        }, (error: TfsError) => { deferred.reject(error); });

        return deferred.promise;
    }

    /**
     * Discard the child item of the given parent
     *
     * @param parentId The id of the parent item 
     * @param childWorkItemId The id of the child item to be discarded
     */
    public discardChildItem(parentId: number, childWorkItemId: number): boolean {
        if (this._items && this._items.get(childWorkItemId)) {
            this.clearItem(childWorkItemId);
        }
        else {
            return false;
        }

        return this._removeChild(this._childrenIds[parentId], childWorkItemId);
    }

    private _removeChild(childrenIds: number[], childId: number): boolean {
        let index: number;
        if (childrenIds && childrenIds.length > 0) {
            if ((index = Utils_Array.indexOf(childrenIds, childId)) >= 0) {
                childrenIds.splice(index, 1);
                return true;
            }
        }

        return false;
    }

    public disassociate(parentId: number, childId: number): boolean {
        return this._removeChild(this._childrenIds[parentId], childId);
    }

    private _fireChangeEvent(item: Item, change) {
        /// <summary>Fires an item change event for a given change</summary>
        /// <param name="item" type="Item">The item to fire the event for</param>
        /// <param name="chagne" type="String">The change type</param>
        Diag.Debug.assertParamIsType(item, Item, "item");
        Diag.Debug.assertParamIsType(change, "string", "change");

        this._fireEvent(ItemSource.Events.ItemChange, this, {
            change: change,
            id: item.id(),
            getItem: function () {
                return item;
            }
        });
    }

    private _beginPageItems(teamId: string, workItemIds: number[], callback: IResultCallback, errorCallback?: IErrorCallback, pagingCountData?: IDictionaryStringTo<any>): Ajax.IAjaxRequestContext {
        let pageTimeStart = Date.now();

        const routeData = {
            area: "api",
            includeVersion: true,
            teamId: teamId
        };
        const apiLocation = tfsContext.getActionUrl(/*Action*/ "PageBoardWorkItems", /*Controller*/ "backlog", routeData);

        var backlogContext = TFS_Agile.BacklogContext.getInstance();
        let data = {
            hubCategoryReferenceName: backlogContext.level.id, // TODO: Verify
            workItemIds: workItemIds.join(",")
        };

        return Ajax.postMSJSON(
            apiLocation,
            data,
            (model: IBoardWorkItemPayloadModel) => {
                var pageTimeEnd = Date.now();
                var pageDuration = pageTimeEnd - pageTimeStart;

                this._publishPagingTelemetry(pageDuration, workItemIds.length, pagingCountData);
                this._updatePagedData(model.payload);
                var items: Item[] = [];
                for (var i = 0, l = model.payload.rows.length; i < l; i++) {
                    var id = model.payload.rows[i][0];
                    var item = this.createItem(id);
                    if (!this.isParent(id)) {
                        items.push(item);
                    }
                }

                callback(items);
            },
            errorCallback);
    }

    private _publishPagingTelemetry(pageDuration: number, pageSize: number, pagingCountData?: IDictionaryStringTo<any>) {
        Diag.logVerbose("Number of work items(page size): " + pageSize + " Total Paging Time: " + pageDuration);

        var ciData = $.extend(pagingCountData || {}, {
            "PageSize": pageSize,
            "PagingDuration": pageDuration
        });

        KanbanTelemetry.publish(KanbanTelemetry.KANBAN_PAGINGCOLUMNS, ciData);
    }

    private _updatePagedData(payload: IBoardWorkItemPayload) {
        var idIndex = 0;
        for (var i = 0, l = payload.rows.length; i < l; i++) {
            this._pageData[payload.rows[i][idIndex]] = payload.rows[i];
        }
        if (payload.hierarchy) {
            $.each(payload.hierarchy, (id: number, parentId: number) => {
                this._parentIds[parentId] = true;
                this._configuration.payload.hierarchy[id] = parentId;
            });
        }
    }

    private _updatePagingIndices() {
        var i = 0, l = 0;
        if (this.orderedIncomingIds) {
            for (i = 0, l = this.orderedIncomingIds.length; i < l; i++) {
                if (this._pageData.hasOwnProperty(this.orderedIncomingIds[i])) {
                    this.lastIncomingPagedIndex++;
                }
            }
        }
        if (this.orderedOutgoingIds) {
            for (i = 0, l = this.orderedOutgoingIds.length; i < l; i++) {
                if (this._pageData.hasOwnProperty(this.orderedOutgoingIds[i])) {
                    this.lastOutgoingPagedIndex++;
                }
            }
        }
    }

    private _workItemChanged(sender: any, args?: any) {
        /// <summary>Fire an ItemChange event on the work item change.</summary>
        /// <param name="sender" type="Object">The source of the event.</param>
        /// <param name="args" type="Object" optional="true">Arguments for the event handler.</param>
        Diag.Debug.assertParamIsType(sender, "object", "sender");
        Diag.Debug.assertParamIsType(args, "object", "args", true);

        var id = args.workItem.getUniqueId(),
            tempId = args.workItem.tempId;

        if (this.isParent(id)) {
            return;
        }

        var getItem = () => {
            // function to return a wrapped work item.
            // We don't want to create the wrappers unneccesarily because they attach to the work-item-change
            // events.

            return this.createItem(id, args.workItem);
        };

        // update id in the global items map in case of id change
        var out: any = {};
        if (id > 0 && this._items.tryGetValue(tempId, out)) {
            // this is a hack to change the private _id member without exposing a setter for id on the Item object
            // restricting this to work item source that owns creation of the work item adapter

            this._updateItemID(tempId, id);

            id = tempId;
            getItem = () => {
                return out.value;
            };
        }

        args = $.extend({}, args, {
            id: id,
            getItem: getItem
        });

        this._fireEvent(ItemSource.Events.ItemChange, this, args);
    }

    private _updateItemID(oldId: number, newId: number) {
        var children: number[], index: number, out: any = {};

        // update the id in the global items table
        if (this._items.tryGetValue(oldId, out)) {
            out.value._id = newId;
            this._items.set(newId, out.value);
            this._items.remove(oldId);
        }

        // if this is a child id, update the children hierarchy table
        for (var key in this._childrenIds) {
            if (this._childrenIds.hasOwnProperty(key)) {
                children = this._childrenIds[key];

                if ((index = Utils_Array.indexOf(children, oldId)) >= 0) {
                    children.splice(index, 1, newId);
                    break;
                }
            }
        }
    }

    private _updateWorkItemPayload(workItemMap: TFS_Core_Utils.Dictionary<WITOM.WorkItem>,
        workItemPayload: IWorkItemData,
        callback: IResultCallback,
        errorCallback?: IErrorCallback): void {

        var workItem = workItemMap.get(workItemPayload.fields[WITConstants.CoreField.Id]);
        workItem.updateWorkItemPayload(workItemPayload, callback, errorCallback);
    }

    private _shouldRefreshWorkItem(workItemData: BoardAutoRefreshCommon.AutoRefreshEventPayload, revision: number, stackRank: number, isNewItem: boolean): boolean {
        // For stack rank only changes, we need not refresh the work item if the stack rank of the workitem is the most recent value.
        if (parseInt(workItemData.stackRank) === stackRank) {
            return false;
        }
        // if this is a new item created on the same board(which is being refreshed) and this is a stack rank only change(revision === 2), we need not refresh the board
        if (isNewItem && workItemData.revision === 2) {
            return false;
        }

        return (workItemData.forceRefresh || !workItemData.wasWorkItemAttached || (revision < workItemData.revision));
    }

    /**
     * Refreshes multiple workitems making a single call to the server.
     * @param {Dictionary<Number, WITOM.WorkItem>} workItemMap
     * @param {IResultCallback} callback with count of successful and error refresh
     * @param {IErrorCallback} errorCallback
     * @param {boolean} excludeFromUserRecentActivity If true, the user's activity history isn't updated to include viewing this item
     */
    public beginWorkItemsRefresh(
        workItemMap: TFS_Core_Utils.Dictionary<WITOM.WorkItem>,
        callback: IResultCallback,
        errorCallback?: IResultCallback,
        excludeFromUserRecentActivity?: boolean): void {
        if (workItemMap) {
            var keys: number[] = workItemMap.keys().map(k => parseInt(k, 10));

            if (keys && keys.length > 0) {
                var store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
                var successList: number[] = [];
                var errorCount: number = 0;

                var returnIfComplete = () => {
                    if (keys.length === successList.length + errorCount) {
                        if (errorCount === 0 && $.isFunction(callback)) {
                            callback.call(this);
                        }
                        else if (errorCount > 0 && $.isFunction(errorCallback)) {
                            errorCallback.call(this, successList);
                        }
                    }
                };

                var successHandler = (workItem: WITOM.WorkItem) => {
                    successList.push(workItem.id);
                    returnIfComplete();
                }

                var errorHandler = () => {
                    errorCount++;
                    returnIfComplete();
                }

                store.beginGetWorkItemData(keys, (workItemPayload: any) => {
                    if (!$.isArray(workItemPayload)) {
                        this._updateWorkItemPayload(workItemMap, workItemPayload, successHandler, errorHandler);
                    }
                    else {
                        for (let index in workItemPayload) {
                            this._updateWorkItemPayload(workItemMap, workItemPayload[index], successHandler, errorHandler);
                        }
                    }

                }, () => {
                    errorCount = keys.length;
                    returnIfComplete();
                }, /* isDeleted: */ undefined, /* includeHistory: */ undefined, excludeFromUserRecentActivity);
            }
        }
    }

    /**
    * Called to auto refresh list of items (e.g. through SignalR) on board.
    * @param {Dictionary<Number, BoardAutoRefreshCommon.AutoRefreshEventPayload>} workItemDataMap
    * with keys as workItem Ids of items to be refreshed.
    */
    public autoRefreshItems(workItemDataMap: TFS_Core_Utils.Dictionary<BoardAutoRefreshCommon.AutoRefreshEventPayload>): IPromise<{ successCount: number, failureCount: number }> {
        var that = this;

        var deferred = Q.defer<{ successCount: number, failureCount: number }>();
        var errorHandler = (reason: any) => {
            deferred.reject(reason);
        };

        var workItemRefreshHandler = (workItems: WITOM.WorkItem[]) => {
            var workItemsToRefresh = new TFS_Core_Utils.Dictionary<WITOM.WorkItem>();

            for (let index in workItems) {
                var workItemData = workItemDataMap.get(workItems[index].id);
                var item: WorkItemItemAdapter = this._items.get(workItems[index].id);
                var stackRank: number = 0;

                if (item) {
                    stackRank = item.getOrder();
                }
                // for new items on the same board the temp id of work item is negative number
                if (that._shouldRefreshWorkItem(workItemData, workItems[index].revision, stackRank, workItems[index].tempId < 0)) {
                    workItemsToRefresh.add(workItems[index].id, workItems[index]);

                    // setting the order field value to null
                    // to avoid cached/stale value from being used for order field type
                    if (item) {
                        item.setOrder(null);
                    }
                }
                else {
                    Diag.logTracePoint(BoardAutoRefreshCommon.TracePoints.WarningInUpdateAlreadyFresh);
                }
            }

            if (workItemsToRefresh.count() > 0) {
                this.beginWorkItemsRefresh(
                    workItemsToRefresh,
                    () => {
                        deferred.resolve({ successCount: workItemsToRefresh.count(), failureCount: 0 });
                    },
                    (workItemIds: number[]) => {
                        deferred.resolve({ successCount: workItemIds.length, failureCount: workItemsToRefresh.count() - workItemIds.length });
                    }, /* excludeFromUserRecentActivity: */ true);
            }
            else {
                deferred.resolve({ successCount: 0, failureCount: 0 });
            }
        };

        this._witManager.beginGetWorkItems(workItemDataMap.keys().map(k => parseInt(k, 10)), workItemRefreshHandler, errorHandler, { includeExtensionFields: true, excludeFromUserRecentActivity: true });
        return deferred.promise;
    }
}

export interface IBoardMemberCount {
    /// <summary>number of items owned by a member</summary>
    owned: number;

    /// <summary>number of items acquired by a member</summary>
    acquired: number;

    /// <summary>number of items released by a member</summary>
    released: number;

    /// <summary>number of items filtered in a member meeting search criteria</summary>
    filtered: number;

    /// <summary>total number of items that are in progress</summary>
    wip: number;

    /// <summary>total number of items</summary>
    count: number;
}

export interface IBoardMemberContentMetaData {
    boardColumnType: string;
}

export interface FieldNameValuePair {
    fieldName: string;
    fieldValue: string;
}

export interface IBoardColumn {
    /// <summary>Column identifier.</summary>
    id: string;

    /// <summary>The display name for the column.</summary>
    name: string;

    /// <summary>The type of column.</summary>
    columnType: any; // ColumnType;

    /// <summary>The column work in progress limit.</summary>
    itemLimit: number;

    /// <summary>Is column split?</summary>
    isSplit: boolean;

    /// <summary>Description of the column.</summary>
    description?: string;

    /// <summary>The state mappings for the column (for each work item type).</summary>
    stateMappings?: IDictionaryStringTo<string>;

    /// <summary>Flag to indicate if the column has been logically deleted.</summary>
    isDeleted?: boolean;

    /// <summary>The order of the column.</summary>
    order?: number;
}

export interface IBoardRow {
    /// <summary>Row identifier.</summary>
    id: string;

    /// <summary>The display name for the row.</summary>
    name: string;
}

export interface IBoardSettings {
    /// <summary>The board's unique identifier, this is a guid.</summary>
    id: string;

    /// <summary>The work item type extension instance id.</summary>
    extensionId: string;

    /// <summary>The board fields.</summary>
    boardFields: IDictionaryStringTo<string>;

    /// <summary>The team's unique identifier, this is a guid.</summary>
    teamId: string;

    /// <summary>An ordered array of non-deleted column definitions.</summary>
    columns: IBoardColumn[];

    /// <summary>The sortable fields per column type</summary>
    sortableFieldsByColumnType: IDictionaryStringTo<string>;

    /// <summary>Row definitions for the board</summary>
    rows?: IBoardRow[];

    /// <summary>The category reference name associated with the board.</summary>
    categoryReferenceName: string;

    /// <summary>The allowed states for each work item type, index by ColumnType. 
    /// Note that this value can be null in the initial payload to improve performance. 
    /// </summary>
    allowedMappings?: IWorkItemTypeToState[];

    /// <summary>Flag to indicate if the board settings returned from the server are in a valid state.</summary>
    isValid?: boolean;

    /// <summary>Flag to indicate if you have permission to edit the board settings.</summary>
    canEdit?: boolean;

    /** Flag to indicate if the board should preserve backlog order when dragging cards across columns. */
    preserveBacklogOrder?: boolean;

    /** Feature enabled flag for card reordering. */
    cardReorderingFeatureEnabled?: boolean;

    /** Flag to control the Auto board refresh ON or OFF state */
    autoRefreshState?: boolean;
}

/**
 * Settings for Annotations on the Board
 */
export interface IBoardAnnotationSettingsOptions {
    annotationSettings: IAnnotationSettings[];
}

/**
 * Settings of an Annotation
 */
export interface IAnnotationSettings {
    /**
     * Id of the annotation type.
     */
    id: string;
    /**
     * Whether annotation is enabled or not.
     */
    isEnabled: boolean;
    /**
     * Annotation item source ids required for the annotation.
     */
    annotationItemSourceIds: string[];
    /**
     * Applicable for requirement backlog.
     */
    isApplicableForRequirementBacklog: boolean;
    /**
     * Applicable for portfolio backlogs.
     */
    isApplicableForPortfolioBacklogs: boolean;

    /**
     * Name to be used in settings page.
     */
    displayNameInSettingsPage?: string;

    /**
     * Reference name to be used throughout the product.
     * Used only under Card Annotations feature flag.
     */
    workItemTypeName?: string;

    /*
     * Icon to be shown in settings page.
     */
    previewIcon?: JQuery;
}

export class BoardAnnotationsIdentifier {
    public static ChecklistAnnotation: string = "Microsoft.VSTS.Agile.ChecklistAnnotation";
    public static TestAnnotation: string = "Microsoft.VSTS.TestManagement.TestAnnotation";
    public static CardAnnotation: string = "Microsoft.VSTS.Agile.{0}Annotation";
}

export class BoardAnnotationSettingsProvider {
    private _boardAnnotationSettingsOptions: IBoardAnnotationSettingsOptions;
    private _applicableAnnotationIds: string[];
    private _applicableAnnotationNames: string[];
    private _applicableAnnotationItemSources: string[];

    public constructor(boardAnnotationSettingsOptions: IBoardAnnotationSettingsOptions) {
        Diag.Debug.assertIsNotNull(boardAnnotationSettingsOptions, "boardAnnotationSettingsOptions is null");

        this._boardAnnotationSettingsOptions = boardAnnotationSettingsOptions;
        this._applicableAnnotationIds = [];
        this._applicableAnnotationNames = [];
        this._applicableAnnotationItemSources = [];

        this._constructApplicableAnnotationsAndItemSourcesList();
    }

    /**
     * Returns appropriate settings for annotations at all backlog levels.
     */
    public getApplicableAnnotationSettings(): IAnnotationSettings[] {
        var result: IAnnotationSettings[] = [];
        this._boardAnnotationSettingsOptions.annotationSettings.forEach(annotationSettings => {
            if (Utils_Array.contains(this._applicableAnnotationIds, annotationSettings.id)) {
                result.push(annotationSettings);
            }
        });

        return result;
    }

    /**
     * Display name to be shown in card annotation settings page
     * @param annotationId: annotation id for which information is sought
     */
    public getDisplayName(annotationId: string): string {
        for (let i = 0, length = this._boardAnnotationSettingsOptions.annotationSettings.length; i < length; i++) {
            if (Utils_String.equals(annotationId, this._boardAnnotationSettingsOptions.annotationSettings[i].id, true)) {
                return this._boardAnnotationSettingsOptions.annotationSettings[i].displayNameInSettingsPage;
            }
        }

        return annotationId;
    }

    /**
     * Visualization icon to be shown in card annotation settings page
     * @param annotationId: annotation id for which information is sought
     */
    public getPreviewIcon(annotationId: string): JQuery {
        for (let i = 0, length = this._boardAnnotationSettingsOptions.annotationSettings.length; i < length; i++) {
            if (Utils_String.equals(annotationId, this._boardAnnotationSettingsOptions.annotationSettings[i].id, true)) {
                return this._boardAnnotationSettingsOptions.annotationSettings[i].previewIcon;
            }
        }

        return $("<div>");
    }

    /**
     * Asserts if the annotation type is applicable for the current board
     * based on the board type and its enable status in settings.
     * @param {string} annotationId
     * @returns {boolean} true if annotation is enabled else false.
     */
    public isAnnotationApplicable(annotationId: string): boolean {
        Diag.Debug.assertIsNotNull(annotationId, "annotationId is null");

        return Utils_Array.contains(this._applicableAnnotationIds, annotationId);
    }

    /**
     * Check if annotation is registred.
     * @param annotationId
     */
    public isAnnotationRegistered(annotationId: string): boolean {
        for (let i = 0, length = this._boardAnnotationSettingsOptions.annotationSettings.length; i < length; i++) {
            if (Utils_String.equals(annotationId, this._boardAnnotationSettingsOptions.annotationSettings[i].id, true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns the list of annotations applicable on the current board.
     * @returns {string[]}
     */
    public getApplicableAnnotationIds(): string[] {
        return this._applicableAnnotationIds;
    }

    /**
     * Return the list of names of the annotation applicable on the current board.
     * Used only when Card Annotations feature flag is enabled.
     */
    public getApplicableAnnotationNames(): string[] {
        return this._applicableAnnotationNames;
    }

    /**
     * Indicates if the given annotation item source is applicable for this board.
     * If any annotation needs this annotation item source, this function returns true.
     * @param {string} annotationItemSourceId
     */
    public isAnnotationItemSourceApplicable(annotationItemSourceId: string): boolean {
        Diag.Debug.assertIsNotNull(annotationItemSourceId, "annotationItemSourceId is null");

        return Utils_Array.contains(this._applicableAnnotationItemSources, annotationItemSourceId);
    }

    /**
     * Returns the list of applicable annotation item sources for current board and settings context.
     * @returns
     */
    public getApplicableAnnotationItemSources(): string[] {
        return this._applicableAnnotationItemSources;
    }

    /**
     * Returns if any annotation is enabled.
     * @returns
     */
    public isAnyAnnotationEnabled(): boolean {
        return this._applicableAnnotationIds.length > 0;
    }

    /**
     * Returns all annotation item sources corresponding to an annotation
     * @param {string} annotationId
     * @returns
     */
    public getAnnotationItemSources(annotationId: string): string[] {
        Diag.Debug.assertIsNotNull(annotationId, "annotationId is null");

        var itemSources: string[];

        this._boardAnnotationSettingsOptions.annotationSettings.forEach((annotationSettings: IAnnotationSettings) => {
            if (annotationSettings.id === annotationId) {
                itemSources = annotationSettings.annotationItemSourceIds;
                return;
            }
        });

        return itemSources;
    }

    /**
     * Disposes BoardAnnotationSettingsProvider
     */
    public dispose(): void {
        this._applicableAnnotationIds = null;
        this._applicableAnnotationItemSources = null;
        this._boardAnnotationSettingsOptions = null;
    }

    private _constructApplicableAnnotationsAndItemSourcesList(): void {
        var backlogContext = TFS_Agile.BacklogContext.getInstance();

        this._boardAnnotationSettingsOptions.annotationSettings.forEach((annotationSettings: IAnnotationSettings) => {
            if (annotationSettings.isEnabled) {
                if ((annotationSettings.isApplicableForRequirementBacklog && backlogContext.isRequirement) ||
                    (annotationSettings.isApplicableForPortfolioBacklogs && backlogContext.isPortfolioInContext())) {
                    this._applicableAnnotationIds.push(annotationSettings.id);
                    this._applicableAnnotationNames.push(annotationSettings.workItemTypeName);
                    this._applicableAnnotationItemSources = Utils_Array.union(this._applicableAnnotationItemSources, annotationSettings.annotationItemSourceIds);
                }
            }
        });
    }
}

export interface IWorkItemTypeToState extends IDictionaryStringTo<string[]> {
    /// <summary>String indexer for work item type name to array of states.</summary>
}

/// <summary>Identifies the column type.</summary>
export enum ColumnType {
    INCOMING,
    INPROGRESS,
    OUTGOING
}

export class BoardColumnType {
    public static INCOMING = "incoming";
    public static INPROGRESS = "inprogress";
    public static OUTGOING = "outgoing";
}

export class BoardFieldType {
    public static ColumnField = "ColumnField";
    public static RowField = "RowField";
    public static DoneField = "DoneField";
}

export interface LayoutOptions {
    cssClass: string,
    collapsed?: boolean
}

export interface MemberLimit {
    limit: number
}

export class BoardMember {
    private _id: string;
    private _node: BoardNode;
    private _values: any;
    private _title: string;
    private _childNode: BoardNode;
    private _itemComparer: any;
    private _items: TFS_Core_Utils.Dictionary<WorkItemItemAdapter>;
    private _layoutOptions: LayoutOptions;
    private _metadata: IBoardMemberContentMetaData;
    private _handlesNull: boolean;
    private _ordering: any;
    private _acquired: TFS_Core_Utils.Dictionary<boolean>;
    private _released: TFS_Core_Utils.Dictionary<boolean>;
    private _filtered: TFS_Core_Utils.Dictionary<boolean>;
    private _limits: MemberLimit;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _previousMember: BoardMember;
    private _nextMember: BoardMember;
    private _memberInPreviousLane: BoardMember;
    private _memberInNextLane: BoardMember;
    private _canAddNewItemButton: boolean;
    private _description: string;
    private _itemsLoadComplete: boolean;
    private _filterableFieldNamesByItemType: IDictionaryStringTo<string[]>;
    private _localTextFilter: string;
    private _searchStartTime: number;
    private _shouldReceiveNewItems: boolean;

    private _filterManager: FilterManager;

    // store total item count of the all its sibling members of the same common ancestor. In this case, it is the total item count of the column.
    public totalGroupMemberCount: number;
    // The flag to decide whether this member should accept acquisitions
    public disableAcquisitions: boolean;

    constructor(
        id: string,
        node: BoardNode,
        values: any[],
        title?: string,
        childNode?: BoardNode,
        layoutOptions?: LayoutOptions,
        metadata?: any,
        handlesNull?: boolean,
        ordering?: any,
        limits?: any,
        previousMember?: BoardMember,
        nextMember?: BoardMember,
        canAddNewItemButton?: boolean,
        description?: string,
        filterableFieldNamesByItemType?: IDictionaryStringTo<string[]>) {
        /// <summary>A member of a Board</summary>
        /// <param name="id" type="string">The member id (guid)</param>
        /// <param name="node" type="BoardNode">The node to which this member belongs.</param>
        /// <param name="values" type="Array" elementType="String">The list of values for the member</param>
        /// <param name="title" type="String" optional="true">The title of this board member</param>
        /// <param name="childNode" type="BoardNode" optional="true">The BoardNode that this member points to.</param>
        /// <param name="layoutOptions" type="Object" optional="true">Options that affect the node's views</param>
        /// <param name="metadata" type="Object" optional="true">board member metadata</param>
        /// <param name="handlesNull" type="boolean" optional="true">indicates whether null is handled or not</param>
        /// <param name="ordering" type="Object" optional="true">Details for the ordering function to use on the board.</param>>
        /// <param name="limits" type="Object" optional="true">Details for the WIP limits.</param>
        /// <param name="previousMember" type="BoardMember" optional="true">Previous member of this member.</param>
        /// <param name="nextMember" type="BoardMember" optional="true">Next member of this member.</param>
        /// <param name="canAddNewItemButton" type="boolean" optional="true">Whether this member supports item creation via add button or not</param>
        /// <param name="filterableFieldNamesByItemType" type="Dictionary<string, string[]>" optional="true">The dictionary of item type to list of field names to index on for search</param>
        // No check for id as it could be from split column and those member does not have id
        Diag.Debug.assertParamIsType(node, BoardNode, "node");
        Diag.Debug.assertParamIsType(values, Array, "values");
        Diag.Debug.assertParamIsType(title, "string", "title", true);
        Diag.Debug.assertParamIsType(childNode, Object, "childNode", true);
        Diag.Debug.assertParamIsType(layoutOptions, Object, "layoutOptions", true);
        Diag.Debug.assertParamIsType(metadata, Object, "metadata", true);
        Diag.Debug.assertParamIsType(handlesNull, "boolean", "handlesNull", true);
        Diag.Debug.assertParamIsType(ordering, Object, "ordering", true);
        Diag.Debug.assertParamIsType(previousMember, BoardMember, "previousMember", true);
        Diag.Debug.assertParamIsType(nextMember, BoardMember, "nextMember", true);
        this._id = id;
        this._node = node;
        this._values = values;
        this._title = title || values[0];
        this._childNode = childNode || null;
        this._layoutOptions = layoutOptions;
        this._metadata = metadata;
        this._handlesNull = handlesNull;
        this._items = new TFS_Core_Utils.Dictionary<WorkItemItemAdapter>();
        this._ordering = ordering;
        this._limits = limits;
        this._previousMember = previousMember;
        this._nextMember = nextMember;
        this._canAddNewItemButton = canAddNewItemButton;
        this._description = description;
        this._itemsLoadComplete = false;
        this._filterableFieldNamesByItemType = filterableFieldNamesByItemType;

        if (this.isFilterable()) {
            this._setupFilteringCapability();
        }

        this._acquired = new TFS_Core_Utils.Dictionary<boolean>();
        this._released = new TFS_Core_Utils.Dictionary<boolean>();
        this._filtered = new TFS_Core_Utils.Dictionary<boolean>();
    }

    public isTopLevel(): boolean {
        var parent = this._node.parentMember();
        if (parent) {
            return false;
        }

        return true;
    }

    public isFilterable(): boolean {
        return !this._childNode;
    }

    public getRootNodeFieldName(): string {
        if (this.isTopLevel()) {
            return this.node().fieldName();
        }
        else {
            return this.node().parentMember().getRootNodeFieldName();
        }
    }

    public getRootMember(): BoardMember {
        /// <summary>Walks up the node tree to find the root board member</summary>
        /// <returns type="BoardMember">The root board member instance</returns>
        var rootMember: BoardMember = this;
        while (rootMember.node().parentMember()) {
            rootMember = rootMember.node().parentMember();
        }
        return rootMember;
    }

    public getColumnMember(): BoardMember {
        /// <summary>Walks up the node tree to find the board member correpsonding to the column</summary>
        /// <returns type="BoardMember">The column board member instance</returns>
        var columnMember: BoardMember = this;
        while (!columnMember.metadata()) {
            columnMember = columnMember.node().parentMember();
        }
        return columnMember;
    }

    public executeUp(action: (member: BoardMember) => void) {
        /// <summary>Walks up the tree executing the provided action at each level</summary>
        /// <param name="action" type="Function">The action to execute at each level</returns>
        Diag.Debug.assertIsFunction(action);

        var member: BoardMember = this;
        while (member.node().parentMember()) {
            action(member);
            member = member.node().parentMember();
        }
    }

    public getTopLevelMemberValue(fieldName: string): string {
        /// <summary>Walk up the path to the root and retrieve the member that belongs to the node with the provided fieldName</summary>
        /// <param name="fieldName" type="string">The fieldName for the node</returns>
        if (Utils_String.ignoreCaseComparer(this.node().fieldName(), fieldName) === 0 || this.isTopLevel()) {
            return this.values()[0];
        }
        else {
            return this.node().parentMember().getTopLevelMemberValue(fieldName);
        }
    }

    public isFiltered(): boolean {
        return this._filterManager && this._filterManager.isFiltering();
    }

    public id(): string {
        /// <summary>Get the member id</summary>
        /// <returns type="string">The member's id (guid)</returns>
        return this._id;
    }

    public node(): BoardNode {
        /// <summary>Get the node to which this member belongs.</summary>
        /// <returns type="BoardNode">The member's containing node.</returns>
        return this._node;
    }

    public itemSource(): ItemSource {
        /// <summary>Get the item source that is contributing to this member's items.</summary>
        /// <returns type="ItemSource">The member's item source.</returns>
        return this.node().board().itemSource();
    }

    /** Returns the member's filter manager instance */
    public filterManager(): FilterManager {
        return this._filterManager;
    }

    public title(value?: string): string {
        /// <summary>Gets or sets the title</summary>
        /// <param name="value" type="String" optional="true">The title to display</param>
        /// <returns type="String">The title</returns>
        if (value !== undefined) {
            this._title = value;
        }
        return this._title;
    }

    public canAddNewItemButton(): boolean {
        /// <summary>Tells whether this member supports item creation or not</summary>
        /// <returns type="boolean" />
        return this._canAddNewItemButton;
    }

    public values(): any[] {
        /// <summary>Gets or sets the values</summary>
        /// <returns type="Array" elementType="String">The list of values</returns>
        return this._values;
    }

    public childNode(): BoardNode {
        /// <summary>Gets the child node</summary>
        /// <returns type="BoardNode">The child board node</returns>
        return this._childNode;
    }

    public previousMember(previousMember?: BoardMember): BoardMember {
        /// <summary>Sets the previous member</summary>
        /// <param name="previousMember" type="BoardMember">previous board member</param>
        if (previousMember !== undefined) {
            this._previousMember = previousMember;
        }
        return this._previousMember;
    }

    public nextMember(nextMember?: BoardMember): BoardMember {
        /// <summary>Sets the next member</summary>
        /// <param name="nextMember" type="BoardMember">next board member</param>
        if (nextMember !== undefined) {
            this._nextMember = nextMember;
        }
        return this._nextMember;
    }

    public memberInPreviousLane(memberInPreviousLane?: BoardMember): BoardMember {
        /// <summary>Sets the member corresponding to this member in previous lane</summary>
        /// <param name="memberInPreviousLane" type="BoardMember">previous lane's board member</param>
        if (memberInPreviousLane !== undefined) {
            this._memberInPreviousLane = memberInPreviousLane;
        }
        return this._memberInPreviousLane;
    }

    public memberInNextLane(memberInNextLane?: BoardMember): BoardMember {
        /// <summary>Sets the member corresponding to this member in next lane</summary>
        /// <param name="memberInNextLane" type="BoardMember">next lane's board member</param>
        if (memberInNextLane !== undefined) {
            this._memberInNextLane = memberInNextLane;
        }
        return this._memberInNextLane;
    }

    public description(): string {
        /// <summary>Get the description for this member</summary>
        /// <returns type="string">The member's description.</returns>
        return this._description;
    }

    public isMatch(value: string): boolean {
        /// <summary>Returns true if the value is match for this board member's values.</summary>
        /// <param name="value" type="String">The value to check</param>
        /// <returns type="Boolean">True if the value is match, false otherwise.</returns>

        if (this.handlesNull() && (value === null || value === undefined || value === "")) {
            return true;
        }

        if (Boolean(value)) {
            return Utils_Array.contains(this._values, value, Utils_String.localeIgnoreCaseComparer);
        }
    }

    public getFieldUpdateList(includeDuplicateFieldNames: boolean = false): FieldNameValuePair[] {
        /// <summary>Returns the field update list from this point in the hierarchy upto the root node</summary>
        /// <param name="includeDuplicateFieldNames" type="boolean">Includes duplicate field names</param>
        var fieldUpdateList: FieldNameValuePair[] = [];

        var node = this.node();
        var member: BoardMember = this;
        var index = 0;
        var fieldNameDictionary: IDictionaryStringTo<boolean> = {};

        while (node != null && member != null) {
            var fieldName = node.fieldName();
            if (includeDuplicateFieldNames || !fieldNameDictionary[fieldName]) {
                fieldUpdateList[index++] = { fieldName: fieldName, fieldValue: member.values()[0] };
                fieldNameDictionary[fieldName] = true;
            }
            member = node.parentMember();
            if (member) {
                node = member.node();
            }
        }

        return fieldUpdateList;
    }

    public itemComparer(): (...args: any[]) => any {
        /// <summary>Get the function for comparing items.</summary>
        /// <returns type="Function">The comparison function</returns>

        var board,
            ordering;

        if (!this._itemComparer) {
            board = this._node.board();
            ordering = $.extend({}, this._ordering);
            ordering.data = $.extend({ itemSource: board.itemSource() }, ordering.data);

            this._itemComparer = FunctionCollection.getFunction(ordering);
        }
        return this._itemComparer;
    }

    public layoutOptions(): LayoutOptions {
        /// <summary>Get the layout options for this member.</summary>
        /// <returns type="Object">The layout options for consumptions by views.</returns>
        return this._layoutOptions;
    }

    public metadata(): IBoardMemberContentMetaData {
        /// <summary>Get generic metadata for this member.</summary>
        /// <returns type="Object">metadata</returns>
        return this._metadata;
    }

    public handlesNull(): boolean {
        /// <summary>check if null value is handled by this member.</summary>
        /// <returns type="boolean">true if null is handled. false otherwise</returns>
        return this._handlesNull;
    }

    public rootColumnType(): string {
        /// <returns type="string">Return column type of a root member</returns>
        return this.getRootMember().metadata() ? this.getRootMember().metadata().boardColumnType : "";
    }

    public isPagingEnabled(): boolean {
        /// <summary>Is paging enabled in this board member</summary>
        /// <returns type="boolean">True if paging is enabled. False otherwise</returns>
        return this.isIncoming() || this.isOutgoing();
    }

    public isIncoming(): boolean {
        /// <summary>Is this member an incoming column type?</summary>
        /// <returns type="boolean">True if in incoming. False otherwise</returns>
        var columnType = this.rootColumnType();
        return Utils_String.ignoreCaseComparer(columnType, BoardColumnType.INCOMING) === 0;
    }

    public isInProgress(): boolean {
        /// <summary>is this member in progress?</summary>
        /// <returns type="boolean">true if in-progress. false otherwise</returns>
        var columnType = this.rootColumnType();
        return Utils_String.ignoreCaseComparer(columnType, BoardColumnType.INPROGRESS) === 0;
    }

    public isOutgoing(): boolean {
        /// <summary>Is this member in outgoing column type?</summary>
        /// <returns type="boolean">True if in outgoing. False otherwise</returns>
        var columnType = this.rootColumnType();
        return Utils_String.ignoreCaseComparer(columnType, BoardColumnType.OUTGOING) === 0;
    }

    public isCollapsible(): boolean {
        /// <summary>Is this member collapsible? </summary>
        /// <returns type="boolean">True if the member is collapsible. False otherwise</returns>
        return this.isIncoming() || this.isOutgoing();
    }

    public limits(limit?: MemberLimit): MemberLimit {
        /// <summary>Get the member limit specification.</summary>
        /// <param name="limit" type="MemberLimit" optional="true" />
        /// <returns type="MemberLimit">The limits for the member. Used to initialize the LimitDisplay control.</returns>
        if (limit !== undefined) {
            this._limits = limit;
        }
        return this._limits;
    }

    /**
     * Gets the item identified by the passed in id
     * @param id Id of item
     */
    public item(id: number): Item {
        return this._items.get(id);
    }

    public items(): WorkItemItemAdapter[] {
        /// <summary>Get the items associated with this member.</summary>
        /// <returns type="Array" elementType="Item">The collection of items held by this member.</returns>
        return this._items.values();
    }

    /**
     * Unpin all the descendent items, which have been opened already and also update the paged data for the given field
     */
    public unpinOpenedItems(fieldName: string, extensionId: string) {
        var leafMembers: BoardMember[] = [];
        BoardNode.getLeafMembers(this._node, leafMembers);
        leafMembers.forEach((currentMember: BoardMember) => {
            var items = currentMember.items();
            if (items && items.length > 0) {
                items.forEach((item: WorkItemItemAdapter) => {
                    item.unpinIfOpened(fieldName, extensionId);
                });
            }
        });
    }

    public startReceivingNewItems() {
        Diag.Debug.assert(!this._shouldReceiveNewItems, "Member is already expecting new items");
        this._shouldReceiveNewItems = true;
    }

    public stopReceivingNewItems() {
        Diag.Debug.assert(this._shouldReceiveNewItems, "Member was not expecting new items");
        this._shouldReceiveNewItems = false;
    }

    public shouldReceiveNewItems(): boolean {
        return this._shouldReceiveNewItems;
    }

    public getItemContainer(item: Item): BoardMember {
        /// <summary>Gets the container for the item. If this member has a sub-node, it defers
        /// the question to the subnode. Otherwise the current member is the container.</summary>
        /// <param name="item" type="Item">The item to locate a container for.</param>
        /// <returns type="BoardMember">The container for the item.</returns>
        Diag.Debug.assertParamIsType(item, Item, "item");

        return this._childNode ? this._childNode.getItemContainer(item) : this;
    }

    public updateItem(item: WorkItemItemAdapter, deferPlacement: boolean, container?: BoardMember) {
        /// <summary>Update the member with an item. The item may be being added to the member,
        /// being moved from another member, or already be associated with this member.</summary>
        /// <param name="item" type="Item">The item used for the update.</param>
        /// <param name="deferPlacement" type="boolean">whether item placement will be deferred or not</param>
        /// <param name="container" type="BoardMember" optional="true">The member where the item currently resides (if any).</param>
        Diag.Debug.assertParamIsType(item, Item, "item");
        Diag.Debug.assertParamIsType(container, BoardMember, "container", true);

        var id = item.id();

        if (container) {
            if (this === container) {
                Diag.Debug.assert(this._items.containsKey(id), "The item is meant to already be owned by this member but doesn't appear in the _items collection");
                Diag.Debug.assert(!this._acquired.containsKey(id), "An item should not be both owned and acquired for the same member");

                if (this._released.containsKey(id)) {
                    this._released.remove(id);
                    this._releaseAcquisition(id);
                }
            }
            else {
                // another container owns this item

                Diag.Debug.assert(!this._items.containsKey(id), "The item is not meant to be owned by this member but appears in the _items collection");
                Diag.Debug.assert(!this._released.containsKey(id), "An item should only be released from the owning member");

                container.removeItem(item, true);

                // if we have acquired it, now we'll take ownership
                if (this._acquired.containsKey(id)) {
                    this._acquired.remove(id);
                    this._releaseAcquisition(id);
                }
            }
        }

        this._items.set(id, item);

        // If the cards on the board are filtered, we need to update the filtered items list as well.
        if (this.isFiltered() && !this._filtered.containsKey(id)) {
            this._filtered.add(id, true);
        }

        if (container) {
            this._fireItemUpdated(item);
        }
        else {
            this._fireItemAdded(item, deferPlacement);
        }
    }

    public removeItem(item: Item, isMove?: boolean) {
        /// <summary>Remove an item from the member.</summary>
        /// <param name="item" type="Item">The item to remove.</param>
        /// <param name="isMove" type="Boolean" optional="true">A flag to indicate if the item removal is part of an operation to move the item to another location.</param>
        Diag.Debug.assertParamIsType(item, Item, "item");
        Diag.Debug.assertParamIsType(isMove, "boolean", "isMove", true);

        var id = item.id();

        Diag.Debug.assert(this._items.containsKey(id), "We should only be removing items that we already own");

        this._items.remove(id); // TODO: Should we be disposing the item (which should then un-pin the item from the wit manager now)?

        if (this._filtered.containsKey(id)) {
            this._filtered.remove(id);
        }

        if (this._released.containsKey(id)) {
            this._released.remove(id);
            if (!isMove) {
                this._releaseAcquisition(id);
            }
        }

        this._fireItemRemoved(item, isMove);
    }

    public validateName(name: string, isDefault?: boolean): string {
        /// <summary>Validates the name of the member</summary>
        /// <param name="name" type="string">The name to validate.</param>
        /// <param name="isDefault" type="Boolean" optional="true">A flag to indicate if the member is associated with the deault swimlane.</param>
        /// <returns type="BoardMember">The validation error message, empty if no errors.</returns>
        var board = this.node().board();
        var settings = board.getBoardSettings();
        if (this.metadata()) { // Column member
            return BoardColumnValidator.getTitleValidationErrors(name, settings.columns.filter(c => c.name !== this.title()));
        }
        else { // Row member
            return BoardRowValidator.getTitleValidationErrors(name, settings.rows.filter(r => r.name !== this.title()), isDefault);
        }
    }

    /**
     * Invoke the rest api to update the member's title
     *
     * @param newValue The updated title of the member
     * @return A promise that will resolve with a boolean after successfully updating the row name
     */
    public beginUpdateTitle(newValue: string): IPromise<boolean> {
        var board = this.node().board();
        var settings = board.getBoardSettings();
        var deferred = Q.defer<boolean>();
        var startTime: number = Date.now();
        var oldValue: string;

        if (this.metadata()) {
            // Member associated with a column node

            var errorHandler = (error: {
                message: string;
                serverError: any;
            }) => {
                this._updateMemberAcquisitionStatus(leafMembers, false);
                for (var i = 0, l = settings.columns.length; i < l; i++) {
                    var column: IBoardColumn = settings.columns[i];
                    if (Utils_String.equals(column.id, this.id(), true)) {
                        column.name = oldValue;
                        break;
                    }
                }
                this.title(oldValue);
                deferred.reject(error);
            };

            for (var i = 0, l = settings.columns.length; i < l; i++) {
                var column: IBoardColumn = settings.columns[i];
                if (Utils_String.equals(column.id, this.id(), true)) {
                    oldValue = column.name;
                    column.name = newValue;
                    break;
                }
            }
            this.title(newValue);

            var node = this.node();
            var upperNode = node.parentMember() ? node.parentMember().node() : node;
            var leafMembers = [];
            BoardNode.getLeafMembers(upperNode, leafMembers); // Get leaf members under the given member's node
            // Update member status for all the leaf members to disable acquisitions, while being renamed
            this._updateMemberAcquisitionStatus(leafMembers, true, this.id());

            new BoardSettingsManager().beginUpdateColumns(<Work_Contracts.BoardColumn[]>settings.columns, settings.id).then(
                (value: Work_Contracts.BoardColumn[]) => {
                    Board.invalidateStore(settings.extensionId);
                    var fieldName = node.fieldName();
                    this._updateNodeMemberValues(board.rootNode(), node.layoutStyle(), oldValue, newValue);
                    board.itemSource().updateTransitions(oldValue, newValue);
                    this.getRootMember().unpinOpenedItems(fieldName, settings.extensionId);
                    // Update item container for all the items in the column
                    this._updateMemberItemContainer(leafMembers, fieldName, newValue, this.id());
                    // Update member status for all the leaf members to re-enable acquisitions
                    this._updateMemberAcquisitionStatus(leafMembers, false, this.id());
                    board.setBoardColumnSettings(value);
                    KanbanTelemetry.OnColumnRenamedInline(startTime);
                    deferred.resolve(true);
                },
                errorHandler);
        }
        else {
            // Member associated with a row node

            var errorHandler = (error: {
                message: string;
                serverError: any;
            }) => {
                this._updateMemberAcquisitionStatus(members, false);
                for (var i = 0, l = settings.rows.length; i < l; i++) {
                    var row: IBoardRow = settings.rows[i];
                    if (Utils_String.equals(row.id, this.id(), true)) {
                        row.name = oldValue;
                        break;
                    }
                }
                this.title(oldValue);
                deferred.reject(error);
            };

            for (var i = 0, l = settings.rows.length; i < l; i++) {
                var row: IBoardRow = settings.rows[i];
                if (Utils_String.equals(row.id, this.id(), true)) {
                    oldValue = row.name;
                    row.name = newValue;
                    break;
                }
            }
            this.title(newValue);

            // Update member status for all the leaf members to disable acquisitions, while being renamed
            var members = this.childNode().members();
            this._updateMemberAcquisitionStatus(members, true);

            new BoardSettingsManager().beginUpdateRows(<Work_Contracts.BoardRow[]>settings.rows, settings.id).then(
                (value: Work_Contracts.BoardRow[]) => {
                    Board.invalidateStore(settings.extensionId);
                    var node = this.node();
                    var fieldName = node.fieldName();
                    this._updateNodeMemberValues(board.rootNode(), node.layoutStyle(), oldValue, newValue);
                    this.getRootMember().unpinOpenedItems(fieldName, settings.extensionId);
                    // Update item container only for the items in the current lane
                    this._updateMemberItemContainer(members, fieldName, newValue);
                    // Update member status for all the leaf members to re-enable acquisitions
                    this._updateMemberAcquisitionStatus(members, false);
                    board.setBoardRowSettings(value);
                    KanbanTelemetry.OnLaneRenamedInline(startTime);
                    deferred.resolve(true);
                },
                errorHandler);
        }
        return deferred.promise;
    }

    public changeItemId(oldId: number, newId: number) {
        /// <summary>Change id of a tracked item.</summary>
        /// <param name="oldId" type="number">old id of the tracked  item</param>
        /// <param name="newId" type="number">new id of the item</param>

        Diag.Debug.assert(this._items.containsKey(oldId), "Change id only for a tracked item");

        this._items.set(newId, this._items.get(oldId));

        if (this._released.containsKey(oldId)) {
            this._released.set(newId, this._released.get(oldId));
        }
        if (this._acquired.containsKey(oldId)) {
            this._acquired.set(newId, this._acquired.get(oldId));
        }
        if (this._filtered.containsKey(oldId)) {
            this._filtered.set(newId, this._filtered.get(oldId));
        }

        this._items.remove(oldId);
        this._released.remove(oldId);
        this._acquired.remove(oldId);
        this._filtered.remove(oldId);

        this._fireItemUpdated(this._items.get(newId), oldId);
    }

    public clear() {
        /// <summary>Clear the list of items that this member is managing.</summary>
        var that = this;

        $.each(this._items.values(), function (i, item) {
            that.removeItem(item);
        });
    }

    public acquire(id: number) {
        /// <summary>Temporarily acquire an item from another member.</summary>
        /// <param name="id" type="Number">The id of the item to acquire.</param>
        Diag.Debug.assertParamIsType(id, "number", "id");

        this._logAcquisition(id, "Acquiring item");
        var board = this._node.board(),
            acquisitions = board.acquisitions(), // id -> BoardMember
            out,
            owner;

        out = {};

        // clear the item out of any current owner
        if (acquisitions.tryGetValue(id, out)) {
            // cancel any pending release immediately since we're taking acquisition of the item now.
            owner = out.value;
            owner.release.cancel();
            if (owner.member !== this) {
                owner.member.release(id, false);
            }
        }
        else {
            // find out who owns the item and release it
            board.currentContainer(id).release(id);
        }

        // update our list of acquired items
        this._acquired.set(id, true);

        // take ownership and install a release mechanism
        this._setupRelease(acquisitions, id);

        this._fireItemCountChanged();
    }

    public scheduleRelease(id: number) {
        /// <summary>Schedule the release of an item to another member. Provided the release
        /// is not interrupted before the scheduled time the item will be released from this member.</summary>
        /// <param name="id" type="Number">The id of the item to release.</param>
        Diag.Debug.assertParamIsType(id, "number", "id");

        this._logAcquisition(id, "Setup delayed release");
        var acquisitions;

        // if we currently have the item (either owned or acquired) schedule a release
        if (this._acquired.containsKey(id) || this._items.containsKey(id)) {

            acquisitions = this._node.board().acquisitions();
            Diag.Debug.assert(acquisitions.get(id).member === this, "Didn't expect someone else to have a pending release");

            this._setupRelease(acquisitions, id).start();
        }
    }

    public getItemCount(): IBoardMemberCount {
        /// <summary>Get the item counts for the member. The counts include the number of items
        /// owned, acquired (from other members), released (to other members) and the net count.</summary>
        /// <returns type="IBoardMemberCount">Object with properties: owned, acquired, released, count</returns>
        var itemCount: IBoardMemberCount = {
            owned: this._items.count(),
            acquired: this._acquired.count(),
            released: this._released.count(),
            wip: this._items.count(),
            filtered: 0,
            count: 0
        };

        // If cards on the board are filtered based on search criteria, take the count of items in the
        // filtered list. Otherwise, take the owned items count.
        if (this.isFiltered()) {
            itemCount.filtered = this._filtered.count();
        } else {
            itemCount.filtered = this._items.count();
        }

        if (this._childNode) {
            $.each(this._childNode.members(), (i, childMember: BoardMember) => {
                var childMemberItemCount = childMember.getItemCount();
                itemCount.owned += childMemberItemCount.owned;
                itemCount.acquired += childMemberItemCount.acquired;
                itemCount.released += childMemberItemCount.released;
                itemCount.filtered += childMemberItemCount.filtered;
            });
        }

        itemCount.count = itemCount.filtered + itemCount.acquired - itemCount.released;
        itemCount.wip = itemCount.owned + itemCount.acquired - itemCount.released;

        return itemCount;
    }

    public getFirstAncestorWithItemLimit(): BoardMember {
        /// <summary>Get the first ancestor in a board member tree who has an item limit defined.</summary>
        /// <returns type="BoardMember">null if such ancestor not found. otherwise the first ancestor who has an item limit</returns>
        var parent = this._node.parentMember();
        if (parent) {
            if (parent.hasItemLimit()) {
                return parent;
            }
            else {
                return parent.getFirstAncestorWithItemLimit();
            }
        }

        return null;
    }

    public getBoardMemberAncestorByLayout(cssClass: string): BoardMember {
        /// <summary>Get the first ancestor in a board member tree who is swimlane.</summary>
        /// <param>cssClass: the layout style, it is used as criteria to find the member in the tree<param>
        /// <returns type="BoardMember">null if such ancestor not found. otherwise the first ancestor who is swimlane</returns>
        // TODO: Add Unit Test
        var parent = this._node.parentMember();
        if (parent) {
            if (parent.layoutOptions()
                && Utils_String.ignoreCaseComparer(parent.layoutOptions().cssClass, cssClass) === 0) {
                return parent;
            }
            else {
                return parent.getBoardMemberAncestorByLayout(cssClass);
            }
        }

        return null;
    }

    public hasItemLimit(): boolean {
        /// <summary> does this member have a limit </summary>
        /// <returns type="boolean">true if this member has a limit</returns>
        return this._limits && this._limits.limit !== undefined;
    }

    public fire(eventName, sender, eventArgs) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    public _fireEvent(eventName: string, sender?: any, args?: any) {
        /// <summary>Invoke the specified event passing the specified arguments.</summary>
        /// <param name="eventName" type="String">The event to invoke.</param>
        /// <param name="sender" type="Object" optional="true">The sender of the event.</param>
        /// <param name="args" type="Object" optional="true">The arguments to pass through to the specified event.</param>

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

    public attachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Attatch a handler to an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to attach.</param>
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    public detachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Detatch a handler from an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to detach.</param>
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    public onItemsLoaded() {
        this._itemsLoadComplete = true;
    }

    public setLocalTextFilter(searchFilter: string) {
        this._localTextFilter = searchFilter.trim();

        this._searchStartTime = Date.now();
        if (this._filterManager) {
            const filterState = this._filterManager.getFilters();
            this._addMemberFilterStringToFilterState(filterState);

            this._filterManager.setFilters(filterState);

            this._onBoardItemSearchComplete(this._filterManager.filter());
        }
    }

    public clearLocalTextFilter() {
        this._localTextFilter = "";

        this._filtered.clear();
        if (this._filterManager) {
            const filterState = this._filterManager.getFilters();
            const textFilterState = filterState[TextFilterProvider.PROVIDER_TYPE];
            // When a text filter is set, only keep the global value, removing the local member filter string
            if (textFilterState) {
                textFilterState.values = textFilterState.values.slice(0, 1);
            }

            this._filterManager.setFilters(filterState);
            this.calculateFilteredItems();
        }
    }

    public isDataSetComplete() {
        // check if itemsource and all the items are loaded to enable text search filter
        return this._itemsLoadComplete && Boolean(this.itemSource());
    }

    private _addMemberFilterStringToFilterState(filterState: FilterState): void {
        const textFilterState = filterState[TextFilterProvider.PROVIDER_TYPE];
        if (textFilterState) {
            const filterValues = textFilterState.values;
            // By convention the second filter is the member specific filter
            filterValues[1] = this._localTextFilter;
        } else {
            filterState[TextFilterProvider.PROVIDER_TYPE] = {
                values: ["", this._localTextFilter]
            };
        }
    }

    /**
     * Apply global filter state on member. Given filter state will be combined with any local filtering
     * @param filterState New filter state
     * @returns Value indicating wether filtering is active or now after applying given state
     */
    public filterItems(filterState: FilterState): boolean {
        var perfCriteriaFilterScenario = Performance.getScenarioManager().startScenario(KanbanTelemetry.CI_AREA_AGILE, KanbanTelemetry.Perf_Scenario_CriteriaFilterTiles);
        // perfCriteriaFilterScenario.addData({
        //     "Wiql": Predicate_WIT.WiqlHelper.getWiql(filter),
        //     "WorkItemCount": this.items().length,
        //     "ColumnType": this.rootColumnType()
        // });

        let filterActive = false;

        if (this._filterManager) {
            perfCriteriaFilterScenario.addSplitTiming(KanbanTelemetry.Perf_Split_PreCriteriaFilter);

            // Add local filter string, if set
            if (!!this._localTextFilter) {
                this._addMemberFilterStringToFilterState(filterState);
            }

            if (isFilterStateEmpty(filterState)) {
                this._filterManager.clearFilters();
            } else {
                this._filterManager.setFilters(filterState);
                perfCriteriaFilterScenario.addSplitTiming(KanbanTelemetry.Perf_Split_PostCriteriaFilter);

                filterActive = true;
            }

            this.calculateFilteredItems();

            perfCriteriaFilterScenario.end();
        }

        return filterActive;
    }

    /** Ensure that the full text search index is created */
    public ensureSearchIndex() {
        if (this.isFilterable() && this._filterManager) {
            // triggering a search ensures that the index is created
            this._localTextFilter = this._localTextFilter || "";
            this.setLocalTextFilter(this._localTextFilter);
        }
    }

    public calculateFilteredItems(): void {
        if (this._filterManager) {
            const results = this._filterManager.filter();
            this._fireEvent(Notifications.BoardItemFilteringComplete, this, results);
            this._updateFilteredItemsMap(results);
        }
    }

    public dispose() {
        if (this._events) {
            this._events.unsubscribeAll();
            this._events = null;
        }
    }

    private _setupFilteringCapability() {
        const board = this.node().board();
        this._filterManager = new FilterManager(
            new BoardMemberFilterDataSource(
                board.itemTypes(),
                this,
                this._filterableFieldNamesByItemType));

        // Text filtering
        this._filterManager.registerFilterProvider(TextFilterProvider.PROVIDER_TYPE, new TextFilterProvider());

        // Field filtering
        this._filterManager.registerFilterProvider(
            WITConstants.CoreFieldRefNames.AssignedTo,
            new AssignedToFilterProvider());
        this._filterManager.registerFilterProvider(
            WITConstants.CoreFieldRefNames.WorkItemType,
            new FieldFilterProvider(WITConstants.CoreFieldRefNames.WorkItemType));
        this._filterManager.registerFilterProvider(
            WITConstants.CoreFieldRefNames.State,
            new FieldFilterProvider(WITConstants.CoreFieldRefNames.State));
        this._filterManager.registerFilterProvider(
            WITConstants.CoreFieldRefNames.IterationPath,
            new IterationPathFilterProvider(board.teamId));

        // Register the parent filter only if it is not the root level
        if (!board.isRootBacklogLevel()) {
            // Parent/child relationship is implemented as a virtual field so use a field filtering provider
            this._filterManager.registerFilterProvider(
                parentItemFieldRefName,
                new FieldFilterProvider(parentItemFieldRefName));
        }

        // Tag filtering
        this._filterManager.registerFilterProvider(
            WITConstants.CoreFieldRefNames.Tags,
            new TagsFilterProvider());

        this._filterManager.activate();
    }

    private _updateFilteredItemsMap(results: number[]): void {
        this._filtered.clear();

        for (const result of results) {
            this._filtered.add(result, true);
        }

        this._fireItemCountChanged();
    }

    private _onBoardItemSearchComplete(results: number[]) {
        var searchCoreEndTime: number = Date.now();

        this._fireEvent(Notifications.BoardItemFilteringComplete, this, results);

        var searchEndTime: number = Date.now();
        var searchCoreDuration = searchCoreEndTime - this._searchStartTime;
        var searchRenderingDuration = searchEndTime - searchCoreEndTime;
        var searchDuration = searchEndTime - this._searchStartTime;

        this._updateFilteredItemsMap(results);

        Diag.logVerbose(this.rootColumnType() + " Total Search Time: " + searchDuration + ", Core: " + searchCoreDuration +
            ", Rendering: " + searchRenderingDuration + ", Filter: " + this._localTextFilter + ", #Match: " + results.length);
    }

    private _updateNodeMemberValues(rootNode: BoardNode, layoutStyle: string, oldValue: string, newValue: string) {
        var node = rootNode;
        node.members().forEach((curMember: BoardMember) => {
            if (node.layoutStyle() === layoutStyle) {
                var values = curMember.values();
                var index = values.indexOf(oldValue);
                if (index > -1) {
                    curMember.title(newValue);
                    values[index] = newValue;
                }
            }
            if (curMember.childNode()) {
                this._updateNodeMemberValues(curMember.childNode(), layoutStyle, oldValue, newValue);
            }
        });
    }

    private _updateMemberItemContainer(members: BoardMember[], fieldName: string, newValue: string, memberId?: string): void {
        members.forEach((currentMember: BoardMember) => {
            if (memberId) { // Member associated with column node
                if (Utils_String.equals(currentMember.id(), memberId) ||
                    (Utils_String.isEmptyGuid(currentMember.id()) // Doing-done, wherein, the items are stored in the nodes with empty Guid
                        && Utils_String.equals(currentMember.node().parentMember().id(), memberId))) {
                    var items = currentMember.items();
                    items.forEach((item) => currentMember.node().updateItemContainer(item, fieldName, newValue, true));
                }
            }
            else { // Member associated with row node
                if (currentMember.childNode()) {
                    this._updateMemberItemContainer(currentMember.childNode().members(), fieldName, newValue);
                }
                else {
                    var items = currentMember.items();
                    items.forEach((item) => currentMember.node().updateItemContainer(item, fieldName, newValue, true));
                }
            }
        });
    }

    private _updateMemberAcquisitionStatus(members: BoardMember[], disableAcquisitions: boolean, memberId?: string): void {
        members.forEach((currentMember: BoardMember) => {
            if (memberId) { // Member associated with column node
                if (Utils_String.equals(currentMember.id(), memberId) ||
                    (Utils_String.isEmptyGuid(currentMember.id()) // Doing-done, wherein, the items are stored in the nodes with empty Guid
                        && Utils_String.equals(currentMember.node().parentMember().id(), memberId))) {
                    currentMember.disableAcquisitions = disableAcquisitions;
                }
            }
            else { // Member associated with row node
                if (currentMember.childNode()) {
                    this._updateMemberAcquisitionStatus(currentMember.childNode().members(), disableAcquisitions);
                }
                else {
                    currentMember.disableAcquisitions = disableAcquisitions;
                }
            }
        });
    }

    private _logAcquisition(id: number, message: string) {
        /// <summary>Log an acquisition message</summary>
        /// <param name="id" type="Number">Id</param>
        /// <param name="message" type="String">Message.</param>
        Diag.logVerbose(Utils_String.format("[{0},{1}] ", id, this._title) + message);
    }

    private _setupRelease(acquisitions: TFS_Core_Utils.Dictionary<Object>, id: number): any {
        /// <summary>Setup the release of an item after a short delay.</summary>
        /// <param name="acquisitions" type="TFS_Core_Utils.Dictionary">The collection of active acquisitions in the board.</param>
        /// <param name="id" type="Number">The id of the item to release.</param>
        /// <returns type="Object">The delayed function that will perform the release.
        /// The delayed function has not been started.</returns>
        Diag.Debug.assertParamIsType(acquisitions, TFS_Core_Utils.Dictionary, "acquisitions");
        Diag.Debug.assertParamIsType(id, "number", "id");

        var owner = {
            member: this,
            release: new Utils_Core.DelayedFunction(this, 100, "release-item", this.release, [id, true])
        };
        acquisitions.set(id, owner);

        return owner.release;
    }

    public release(id: number, returnToOwner?: boolean) {
        /// <summary>Release an item from this member. The item should either be owned
        /// by this member or have been previously acquired from another member.</summary>
        /// <param name="id" type="Number">The id of the item to release.</param>
        /// <param name="returnToOwner" type="Boolean" optional="true">If true, the item will be returned to the owning member.</param>
        Diag.Debug.assertParamIsType(id, "number", "id");
        Diag.Debug.assertParamIsType(returnToOwner, "boolean", "returnToOwner", true);

        this._logAcquisition(id, "Releasing item");
        var board = this._node.board(),
            acquisitions,
            out,
            owner;

        out = {};

        // had we acquired it earlier?
        if (this._acquired.containsKey(id)) {
            this._acquired.remove(id);

            acquisitions = board.acquisitions();
            if (acquisitions.tryGetValue(id, out)) {
                Diag.Debug.assert(out.value.member === this, "Expected that this member would be the one that setup the previous acquisition");
                this._releaseAcquisition(id);

                if (returnToOwner) {
                    this._logAcquisition(id, "Returning item to owner");
                    owner = board.currentContainer(id);
                    Diag.Debug.assert(Boolean(owner), "Expected to find an original owner for item. Id: " + id);
                    owner._released.clear(id);
                    owner._fireItemCountChanged();
                }
            }
        }
        // do we own it?
        else if (this._items.containsKey(id)) {
            this._released.set(id, true);
        }
        // why are we being asked to release it?
        else {
            Diag.Debug.fail("Asked to release an item I didn't own or have acquired. id: " + id + "; member: " + this._title);
        }

        this._logAcquisition(id, "Released item");
        this._fireItemCountChanged();
    }

    private _releaseAcquisition(id: number) {
        /// <summary>Description</summary>
        /// <param name="id" type="Number">The id of the item to release the acquisition for.</param>
        Diag.Debug.assertParamIsType(id, "number", "id");
        var acquisitions = this._node.board().acquisitions();

        if (acquisitions.containsKey(id)) {
            acquisitions.get(id).release.cancel();
            acquisitions.remove(id);
        }
    }

    private _resetIndexState() {
        if (this._filterManager) {
            // Trigger data update on filter manage, this resets the index
            this._filterManager.dataUpdated();
        }

        Diag.logVerbose("Search index is now stale");
    }

    private _fireItemAdded(item, deferPlacement: boolean) {
        this._fireItemChange(Notifications.BoardItemAdded, { item: item, deferPlacement: deferPlacement });
        if (!item.isNew()) {
            // create index only if it's not a new card (new card doesn't have any content yet)
            this._resetIndexState();
        }
    }

    private _fireItemUpdated(item, oldId?: number) {
        this._fireItemChange(Notifications.BoardItemUpdated, { item: item, oldId: oldId });
        this._resetIndexState();
    }

    private _fireItemRemoved(item, isMove) {
        this._fireItemChange(Notifications.BoardItemRemoved, { item: item, isMove: isMove });
        if (!item.isNew()) {
            this._resetIndexState();
        }
    }

    private _fireItemChange(event, args?) {
        this._fireEvent(event, this, args);
        this._fireItemCountChanged();
    }

    private _fireItemCountChanged() {
        /// <summary>Fire the item-count-changed event.</summary>
        this._updateCountForSwimlane();
        this._updateCountForWIPLimit();
    }

    private _updateCountForSwimlane() {
        var swimlaneAncestor = this.getBoardMemberAncestorByLayout("swimlane");
        if (swimlaneAncestor) {
            swimlaneAncestor._fireEvent(Notifications.BoardMemberItemCountChanged, swimlaneAncestor, swimlaneAncestor.getItemCount());
        }
    }

    private _updateCountForWIPLimit() {
        if (this.hasItemLimit()) {
            var counts = this.getItemCount();
            this._logAcquisition(0, "Firing item count changed: " + Utils_String.format("Owned:{0}, Acquired:{1}, Released:{2}", counts.owned, counts.acquired, counts.released));
            this._fireEvent(Notifications.BoardMemberItemCountChanged, this, counts);
        }
        else {
            var ancestor = this.getFirstAncestorWithItemLimit();
            if (ancestor) {
                ancestor._fireItemCountChanged();
            }
        }
    }
}

export interface IFunctionReference {
    id: string,
    data?: any
}

export interface IBoardMemberMetadata {
    id: string,
    title: string,
    values: string[],
    canAddNewItemButton: boolean,
    itemIds?: number[],
    childNode?: IBoardNodeMetadata,
    layoutOptions?: LayoutOptions,
    itemOrdering?: IFunctionReference,
    limits?: MemberLimit,
    metadata?: IBoardMemberContentMetaData,
    description?: string,
    handlesNull?: boolean
}

export interface IBoardNodeMetadata {
    fieldName: string,
    layoutStyle: string,
    members: IBoardMemberMetadata[],
    isItemDriven?: boolean
}

export class BoardNodeLayoutStyle {
    public static HORIZONTAL = "horizontal";
    public static VERTICAL = "vertical";
}

export class BoardNode {

    private _board: Board;
    private _fieldName: string;
    private _layoutStyle: string;
    private _itemDriven: any;
    private _parentMember: BoardMember;
    private _members: BoardMember[];
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _childNodeMembers: BoardMember[];
    private _childNodes: BoardNode[];

    constructor(
        board: Board,
        config: any,
        parentMember?: BoardMember,
        filterableFieldNamesByItemType?: IDictionaryStringTo<string[]>) {
        /// <summary>The board node</summary>
        /// <param name="board" type="Board">The board to which this node belongs.</param>
        /// <param name="config" type="Object">Configuration options</param>
        /// <param name="filterableFieldNamesByItemType" type="Dictionary<string, string[]>">Dictionary of item type to field names to filter board</param>
        Diag.Debug.assertParamIsType(board, Board, "board");
        Diag.Debug.assertParamIsType(config, "object", "config");
        this._parentMember = parentMember;
        this._board = board;
        this._fieldName = config.fieldName;
        this._layoutStyle = config.layoutStyle;
        this._itemDriven = config.isItemDriven;
        this._childNodeMembers = [];
        this._childNodes = [];
        var processMember = (i, memberConfig) => {
            var childNode = memberConfig.childNode ? new BoardNode(board, memberConfig.childNode, null, filterableFieldNamesByItemType) : null;
            if (childNode) {
                this._childNodes.push(childNode);
            }
            var member = this.addMember(
                memberConfig.id,
                memberConfig.values,
                memberConfig.title,
                childNode,
                memberConfig.layoutOptions,
                memberConfig.metadata,
                memberConfig.handlesNull,
                memberConfig.itemOrdering,
                memberConfig.limits,
                null,
                null,
                memberConfig.canAddNewItemButton,
                memberConfig.description,
                filterableFieldNamesByItemType);
            this._childNodeMembers.push(member);

            if (childNode) {
                childNode.parentMember(member);
            }
        };

        if (config.members) {
            this._members = [];
            $.each(config.members, processMember);
        }

    }

    public static getLeafMembers(node: BoardNode, leafMembers: BoardMember[]) {
        /// <summary>Gets all leaf members of the given node.</summary>
        /// <param name="node" type="BoardNode">The node</param>
        /// <param name="leafMembers" type="Array" typeElelement="BoardMember">Array containing the leafMembers</param>
        $.each(node.members(), (i: number, member: BoardMember) => {
            if (!member.childNode()) {
                leafMembers.push(member);
            } else {
                this.getLeafMembers(member.childNode(), leafMembers);
            }
        });
    }

    public static setLeafMembersPrevAndNext(node: BoardNode) {
        /// <summary>Assign previous and next member to all the leaf members of the given node.</summary>
        /// <param name="node" type="BoardNode">The node</param>
        var leafMembers: BoardMember[] = null;
        var swimlanesPresent = false;

        // When dealing with support for swimlanes, we expect three upper level members:
        //    one for incoming
        //    one for in progress (optional -- there may be none)
        //    one for outgoing
        // The in progress member view is expected to have a vertical layout style if we are dealing with swimlanes.
        Diag.Debug.assert(node.members().length >= 2, "Uexpected number of board members, there must be at least 2.");

        var inProgressMemberView = node.members()[1].childNode();
        if (inProgressMemberView != null && inProgressMemberView.layoutStyle() === "vertical") {

            var defaultSwimlaneMemberView: BoardMember = null;

            $.each(inProgressMemberView.members(), (i: number, member: BoardMember) => {
                if (Utils_String.isEmptyGuid(member.id())) {
                    // Store the "default" swimlane so that the incoming and outgoing columns next/prev map to the default swimlane.
                    // We do this last (so that the last to write wins).
                    defaultSwimlaneMemberView = member;
                }
                else {
                    // Setup the next/prev mappings for each swimlane such that the first/last members (incoming/outgoing) are mapped.
                    leafMembers = [node.members()[0]];
                    BoardNode.getLeafMembers(member.childNode(), leafMembers);
                    leafMembers.push(node.members()[2]);
                    BoardNode._setMembersPrevAndNext(leafMembers);
                }
            });

            // Per the above comment, we want to do this last, such that the next from incoming and the prev from outgoing point to default lane's members.
            leafMembers = [node.members()[0]];
            BoardNode.getLeafMembers(defaultSwimlaneMemberView.childNode(), leafMembers);
            leafMembers.push(node.members()[2]);
            BoardNode._setMembersPrevAndNext(leafMembers);
            swimlanesPresent = true;

            BoardNode.setNextAndPreviousLaneMembers(inProgressMemberView.members());
        }

        if (!swimlanesPresent) {
            leafMembers = [];
            BoardNode.getLeafMembers(node, leafMembers);
            BoardNode._setMembersPrevAndNext(leafMembers);
        }
    }

    public static setNextAndPreviousLaneMembers(inProgressMembers: BoardMember[]) {
        /// <summary>Assign corresponding member in previous and next lane to all in progress leaf members.</summary>
        /// <param name="inProgressMembers" type="Array" elementType="BoardMember">In progress board members</param>
        var previousLaneLeafMembers: BoardMember[] = null;
        var currentLaneLeafMembers: BoardMember[] = null;

        if (inProgressMembers.length > 1) {
            inProgressMembers.forEach((member: BoardMember, i: number) => {
                previousLaneLeafMembers = currentLaneLeafMembers;
                currentLaneLeafMembers = [];
                BoardNode.getLeafMembers(member.childNode(), currentLaneLeafMembers);
                if (previousLaneLeafMembers && previousLaneLeafMembers.length > 0) {
                    BoardNode.setNextAndPreviousLaneMembersForGivenLanes(currentLaneLeafMembers, previousLaneLeafMembers);
                }
            });
        }
    }

    public static setNextAndPreviousLaneMembersForGivenLanes(currentLaneLeafMembers: BoardMember[], previousLaneLeafMembers: BoardMember[]) {
        /// <summary>Assign previous lane members and next lane members to consecutive lane members.</summary>
        /// <param name="currentLaneLeafMembers" type="Array" elementType="BoardMember">Current lane leaf members</param>
        /// <param name="previousLaneLeafMembers" type="Array" elementType="BoardMember">Previous lane leaf members</param>
        Diag.Debug.assert(currentLaneLeafMembers.length === previousLaneLeafMembers.length, "Uexpected number of members in different lanes.");

        currentLaneLeafMembers.forEach((leafMember: BoardMember, j: number) => {
            leafMember.memberInPreviousLane(previousLaneLeafMembers[j]);
        });
        previousLaneLeafMembers.forEach((leafMember: BoardMember, j: number) => {
            leafMember.memberInNextLane(currentLaneLeafMembers[j]);
        });
    }

    private static _setMembersPrevAndNext(members: BoardMember[]) {
        $.each(members, (i: number, member: BoardMember) => {
            member.previousMember(i > 0 ? members[i - 1] : null);
            member.nextMember(i + 1 < members.length ? members[i + 1] : null);
        });
    }

    public board(): Board {
        /// <summary>Gets the board.</summary>
        /// <returns type="Board">The board.</returns>
        return this._board;
    }

    public fieldName(): string {
        /// <summary>Gets the field name</summary>
        /// <returns type="String">The field name</returns>
        return this._fieldName;
    }

    public parentMember(value?: BoardMember): BoardMember {
        /// <summary>Gets the parent member</summary>
        /// <returns type="BoardMember"></returns>
        if (value) {
            this._parentMember = value;
        }
        return this._parentMember;
    }

    public layoutStyle(): string {
        /// <summary>Gets the layout style</summary>
        /// <returns type="String">The layout style</returns>
        return this._layoutStyle;
    }

    public members(): BoardMember[] {
        /// <summary>Gets the members</summary>
        /// <returns type="Array" elementType="BoardMember">The members</returns>
        return this._members;
    }

    public allFilterableMembers(includeDescendants: boolean = true): BoardMember[] {
        /// <summary>Gets all filterable members</summary>
        /// <param name="includeDescendants" type="boolean">If true, includes all descendants. If not, finds only child nodes </param>
        /// <returns type="Array" elementType="BoardMember">The filterable descendants</returns>

        var allFilterableMembers = [];
        $.each(this._members, (i: number, member: BoardMember) => {
            if (member.isFilterable()) {
                allFilterableMembers.push(member);
            }

            if (includeDescendants) {
                var childNode = member.childNode();
                if (childNode) {
                    var descendantMembers = childNode.allFilterableMembers();
                    allFilterableMembers = allFilterableMembers.concat(descendantMembers || []);
                }
            }
        });

        return allFilterableMembers;
    }

    public addMember(
        id: string,
        values: any[],
        title: string,
        childNode?: BoardNode,
        layoutOptions?: any,
        metadata?: IBoardMemberContentMetaData,
        handlesNull?: boolean,
        ordering?: any,
        limits?: any,
        previousMember?: BoardMember,
        nextMember?: BoardMember,
        canAddNewItemButton?: boolean,
        description?: string,
        filterableFieldNamesByItemType?: IDictionaryStringTo<string[]>): BoardMember {
        /// <summary>Creates, adds and returns a BoardMember to the members list for this node</summary>
        /// <param name="id" type="String(Guid)">The id of member</param>
        /// <param name="values" type="Array" elementType="String">The values</param>
        /// <param name="title" type="String">The title of the member.</param>
        /// <param name="childNode" type="BoardNode" optional="true">The child node</param>
        /// <param name="layoutOptions" type="Object" optional="true">Options that affect the node's views</param>
        /// <param name="metadata" type="IBoardMetaData" optional="true">board member metadata</param>
        /// <param name="ordering" type="Object" optional="true">Details about the ordering function used to order tiles on the board.</param>
        /// <param name="limits" type="Object" optional="true">Details for the WIP limits.</param>
        /// <param name="previousMember" type="BoardMember" optional="true">Previous member of this member.</param>
        /// <param name="nextMember" type="BoardMember" optional="true">Next member of this member.</param>
        /// <param name="canAddNewItemButton" type="boolean" optional="true">Whether this member supports item creation using new item button or not</param>
        /// <param name="filterableFieldNamesByItemType" type="Dictionary<string, string[]>" optional="true">The dictionary of item type to list of field names to index on for search</param>
        /// <returns type="BoardMember">The BoardMember created</returns>
        // No check for id as it could be from split column and those member does not have id
        Diag.Debug.assertParamIsArray(values, "values");
        Diag.Debug.assertParamIsType(childNode, BoardNode, "childNode", true);

        var member = new BoardMember(
            id,
            this,
            values,
            title,
            childNode,
            layoutOptions,
            metadata,
            handlesNull,
            ordering,
            limits,
            previousMember,
            nextMember,
            canAddNewItemButton,
            description,
            filterableFieldNamesByItemType);

        // TODO: insert at correct position (when using item driven members)
        this._members.push(member);

        this._fireEvent(Notifications.BoardMemberAdded, this, { member: member });

        return member;
    }

    public isItemDriven(): boolean {
        /// <summary>Are the node's members added dynamically depending on the items added to the board.</summary>
        /// <returns type="Boolean">true if the node is dynamic.</returns>
        return this._itemDriven === true;
    }

    public updateItemContainer(item: Item, fieldName: string, newFieldValue: string, setByRule?: boolean) {
        /// <summary>Updates the given field of the item container.</summary>
        /// <param name="item" type="Item">The item to locate a container for.</param>
        /// <param name="fieldName" type="string">The name of the field to be updated.</param>
        /// <param name="newFieldValue" type="string">The new value.</param>
        /// <param name="setByRule" type="boolean" optional="true">If set to true mark setByRule=true on the field update</param>
        Diag.Debug.assertParamIsType(item, Item, "item");
        var parentFieldName = TFS_Agile_Utils.ControlUtils.getParentFieldReferenceName(fieldName);
        if (parentFieldName &&
            Utils_String.equals(item.fieldValue(fieldName), item.fieldValue(parentFieldName))) {
            // Also update the value of the system field, if applicable, specially for WEF fields
            item.fieldValue(parentFieldName, newFieldValue, false, setByRule);
        }
        item.fieldValue(fieldName, newFieldValue, true, setByRule);
    }

    public getItemContainer(item: Item): BoardMember {
        /// <summary>Gets the item container in which the item belongs.</summary>
        /// <param name="item" type="Item">The item to locate a container for.</param>
        /// <returns type="BoardMember">The matching item container.</returns>
        Diag.Debug.assertParamIsType(item, Item, "item");

        var fieldValue = item.fieldValue(this._fieldName),
            itemContainer: BoardMember,
            newMember;

        // If we have recieved a boolean then we need to convert it to a string
        // because member values are always stored as strings and need to be compared.
        if (typeof (fieldValue) === "boolean") {
            fieldValue = fieldValue.toString();
        }

        // If  Kanban.Column type extension isn't defined yet, use the first member's title as a default. 
        if (!fieldValue && item.isNew()) {
            fieldValue = this._members[0].title();
        }

        $.each(this._members || [], function (i, member) {
            // Test the value against the members first before asking for the item container
            // so that when we're dealing with item-driven nodes we can be sure that it was the missing 
            // member that caused us to fail, and not a failure to match against a sub-node.
            if (member.isMatch(fieldValue)) {
                itemContainer = member.getItemContainer(item);
                return false;
            }
        });

        if (!itemContainer && this._itemDriven) {
            // NOTE: The code here is not being actively used and will not pass the param assert, but this fits generic board idea, future user should carefully review.  
            newMember = this.addMember(null, [fieldValue], fieldValue, null, { width: "single" }, null, null, null, this._members.length > 0 ? this._members[this._members.length - 1] : null);
            Diag.Debug.assert(newMember.isMatch(fieldValue), "Expected that the new member we just added would be a match for the value we used to construct it.");

            itemContainer = newMember.getItemContainer(item);
            Diag.Debug.assertIsNotNull(itemContainer, "Expected that we would have an item container after just adding it.");
        }

        return itemContainer;
    }

    public fire(eventName, sender, eventArgs) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    public _fireEvent(eventName: string, sender?: any, args?: any) {
        /// <summary>Invoke the specified event passing the specified arguments.</summary>
        /// <param name="eventName" type="String">The event to invoke.</param>
        /// <param name="sender" type="Object" optional="true">The sender of the event.</param>
        /// <param name="args" type="Object" optional="true">The arguments to pass through to the specified event.</param>

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

    public attachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Attatch a handler to an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to attach.</param>
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    public detachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Detatch a handler from an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to detach.</param>
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    public dispose() {
        if (this._members) {
            for (let member of this._members) {
                member.dispose();
            }
        }

        if (this._childNodeMembers) {
            for (let member of this._childNodeMembers) {
                member.dispose();
            }
        }

        if (this._childNodes) {
            for (let childNode of this._childNodes) {
                childNode.dispose();
            }
        }

        this._members = [];
        this._childNodeMembers = [];
        this._childNodes = [];
    }
}

export class Board {

    /**
     * Creates a board object
     * @param configuration Configuration options
     * @param eventsHelper current scopedEventsHelper
     * @param itemSource workItemSource
     */
    public static createBoard(configuration: BoardModel, eventsHelper: ScopedEventHelper, itemSource: WorkItemSource): Board {
        return new Board(configuration, eventsHelper, itemSource);
    }

    /**
     * Get a new board model for specified team
     * @param teamId teamId guid
     * @param successCallback of type IResultCallback
     * @param errorCallback of type IErrorCallback
     */
    public static beginGetModel(teamId: string, successCallback: IResultCallback, errorCallback: IErrorCallback) {
        // Pass the current backlog context
        const backlogContext = TFS_Agile.BacklogContext.getInstance();

        // this is the guid for this particular message
        if (!TFS_UI_Controls_Common.DismissableMessageAreaControl.isDismissedOnClient(TFS_Agile.NotificationGuids.LimitedPortfolioAccess, TFS_WebSettingsService.WebSettingsScope.User)) {
            if (backlogContext.isPortfolioInContext()) {
                $(".tfs-basic-user-limited-portfolio-access-notification").addClass("visible").show();
            }
            else {
                $(".tfs-basic-user-limited-portfolio-access-notification").removeClass("visible").hide();
            }
        }

        const routeData = {
            area: "api",
            includeVersion: true,
            teamId: teamId
        };
        const apiLocation = tfsContext.getActionUrl(/*Action*/ "GetBoardModel", /*Controller*/ "backlog", routeData);
        const data = {
            hubCategoryReferenceName: backlogContext.level.id
        };

        Ajax.getMSJSON(apiLocation, data, successCallback, errorCallback);
    }

    protected _items: TFS_Core_Utils.Dictionary<any>;

    private _teamId: string;
    private _id: string;
    private _node: BoardNode;
    private _itemSource: WorkItemSource;
    private _itemContainer: TFS_Core_Utils.Dictionary<any>;
    private _itemChangeHandler: any;
    private _fields: any;
    private _membershipEvaluator: any;
    private _acquisitions: TFS_Core_Utils.Dictionary<Object>;
    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _lockedItems: number[] = [];
    private _cardSettingsProvider: Cards.CardSettingsProvider;
    private _filterPageSize: number;
    private _pageSize: number;
    private _boardSettings: IBoardSettings;
    private _onBoardTileMoveLockDelegate: Events_Action.IActionWorker;
    private _onBoardTileMoveUnlockDelegate: Events_Action.IActionWorker;
    private _itemTypes: string[];
    private _autoRefreshBoardItemsDelegate: IArgsFunctionR<void>;
    private _backlogLevelHelper: TFS_Agile_WorkItemChanges.BacklogLevelHelper;
    private _currentBacklogLevel: number;
    private _pendingBoardRefresh: boolean;
    // used to store work item ids that changed workitem type from child type to current backlog level type.
    private _workItemIdsTypeChanged: IDictionaryNumberTo<boolean>;
    private _eventsHelper: ScopedEventHelper;
    private _isRootBacklogLevel: boolean = null;
    public static BoardAnnotationSettings: BoardAnnotationSettingsProvider;

    constructor(model: BoardModel, eventsHelper: ScopedEventHelper, itemSource: WorkItemSource) {
        /// <summary>Represents a board of items with a hierarchical grouping structure</summary>
        /// <param name="model" type="Object">The configuration options</param>
        Diag.Debug.assertParamIsObject(model, "model");
        Diag.Debug.assertParamIsObject(model.board, "model.board");
        Diag.Debug.assertParamIsObject(model.board.node, "model.board.node");
        Diag.Debug.assertParamIsObject(model.boardSettings, "model.boardSettings");
        Diag.Debug.assert(!!eventsHelper, "EventsHelper should be provided.");
        this._eventsHelper = eventsHelper;
        var configuration = model.board;
        this._boardSettings = model.boardSettings;
        this._itemTypes = model.itemTypes || (model.itemSource ? model.itemSource.itemTypes : null);

        this._items = null;
        this._events = null;
        this._teamId = this._boardSettings.teamId;
        this._id = configuration.id;
        this._pageSize = configuration.pageSize;
        this._filterPageSize = configuration.filterPageSize;
        this._node = new BoardNode(this, configuration.node, null, configuration.filterableFieldNamesByItemType);
        BoardNode.setLeafMembersPrevAndNext(this._node);
        this._fields = configuration.fields;
        this._membershipEvaluator = FunctionCollection.getFunction(configuration.membership);
        this._acquisitions = new TFS_Core_Utils.Dictionary<Object>({ throwOnKeyMissing: true });
        this._workItemIdsTypeChanged = {};
        this._pendingBoardRefresh = false;

        if (itemSource) {
            itemSource.clearItems();
            this.setItemSource(itemSource);
        }

        // This provides a mechanism for locking work items such 
        // that they do not get moved via rules until being unlocked.
        this._onBoardTileMoveLockDelegate = delegate(this, this._onBoardTileMoveLock);
        this._onBoardTileMoveUnlockDelegate = delegate(this, this._onBoardTileMoveUnlock);
        var actionSvc = Events_Action.getService();
        actionSvc.registerActionWorker(Notifications.BoardTileMoveLock, this._onBoardTileMoveLockDelegate, Events_Action.ActionService.MaxOrder);
        actionSvc.registerActionWorker(Notifications.BoardTileMoveUnlock, this._onBoardTileMoveUnlockDelegate, Events_Action.ActionService.MaxOrder);
    }

    private _onBoardTileMoveLock(actionArgs, next) {
        Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
        Diag.Debug.assertParamIsNotNull(actionArgs.id, "actionArgs.id");

        this._lockedItems.push(actionArgs.id);
    }

    private _onBoardTileMoveUnlock(actionArgs, next) {
        Diag.Debug.assertParamIsObject(actionArgs, "actionArgs");
        Diag.Debug.assertParamIsNotNull(actionArgs.id, "actionArgs.id");

        var index = this._lockedItems.indexOf(actionArgs.id);
        var itemUnlocked = false;
        // Remove all occurrences of locked item id from array. Ideally it should not happen that we have
        // more than one occurrence, but in case there are many we want to remove all of them to actually
        // "unlock" the item.
        while (index > -1) {
            this._lockedItems.splice(index, 1);
            itemUnlocked = true;
            index = this._lockedItems.indexOf(actionArgs.id);
        }

        if (itemUnlocked && this._pendingBoardRefresh) {
            this._pendingBoardRefresh = false;
            this._eventsHelper.fire(BoardAutoRefreshCommon.Events.RefreshBoard, this);
        }
    }

    public hasLockedItems(): boolean {
        return this._lockedItems.length > 0;
    }

    public setPendingBoardRefresh(value: boolean): void {
        this._pendingBoardRefresh = value;
    }

    public static invalidateStore(extensionId: string) {
        /// <summary>Invalidates the work item store's extensions, and reset the manager's cache.</summary>
        var store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        store.invalidateExtensions([extensionId]);
        // TODO: Investigate what happens when a board has dirty items on it, and we reset the cache?
        WorkItemManager.get(store).resetCache();
    }

    public dispose() {
        if (this._itemSource) {
            this._itemSource.detachEvent(ItemSource.Events.ItemChange, this._itemChangeHandler);
            this._itemSource.dispose();
            this._itemSource = null;
            $.each(this._itemContainer.values(), (i, container) => {
                container.clear();
            });
        }

        this._workItemIdsTypeChanged = {};
        this._backlogLevelHelper = null;

        if (this._cardSettingsProvider) {
            this._cardSettingsProvider.dispose();
            this._cardSettingsProvider = null;
        }

        var actionSvc = Events_Action.getService();
        actionSvc.unregisterActionWorker(Notifications.BoardTileMoveLock, this._onBoardTileMoveLockDelegate);
        actionSvc.unregisterActionWorker(Notifications.BoardTileMoveUnlock, this._onBoardTileMoveUnlockDelegate);
        if (this._node) {
            this._node.dispose();
            this._node = null;
        }

        if (this._events) {
            this._events.unsubscribeAll();
            this._events = null;
        }

        this.unsubscribeFromAutoRefreshEvents();
    }

    /**
     * Id of the team owning the board
     */
    public get teamId(): string {
        return this._teamId;
    }

    public id(): string {
        /// <summary>Gets the board id</summary>
        /// <returns type="string">The board id (guid)</returns>
        return this._id;
    }

    public getItemSource(): ItemSource {
        return this._itemSource;
    }

    public getBoardSettings(): IBoardSettings {
        /// <summary> Get the board settings</summary>
        /// <returns type="IBoardSettings">The board settings while initializing</returns>
        return this._boardSettings;
    }

    public setBoardColumnSettings(columns: IBoardColumn[]): void {
        /// <summary> Updates the board column settings</summary>
        this._boardSettings.columns = columns;
    }

    public setBoardRowSettings(rows: IBoardRow[]): void {
        /// <summary> Updates the board row settings</summary>
        this._boardSettings.rows = rows;
    }

    public rootNode(): BoardNode {
        /// <summary>Gets the root node</summary>
        /// <returns type="BoardNode">The root node</returns>
        return this._node;
    }

    public itemTypes(): string[] {
        /// <summary>Gets the types displayed on this board</summary>
        /// <returns type="Array" elementType="String">The item types</returns>
        return this._itemTypes;
    }

    public getField(fieldType: string): string {
        /// <summary>Get the field matching the specified field type. These field types map to the types.
        /// in the Common Project Configuration settings.</summary>
        /// <param name="fieldType" type="String">The type of the field to retrieve.</param>
        /// <returns type="String">The name of the field with the given type, or undefined if no such field exists.</returns>
        Diag.Debug.assertParamIsType(fieldType, "string", "fieldType");

        return this._fields[fieldType];
    }

    public beginPopulate(callback: IResultCallback, errorCallback?: IErrorCallback) {
        /// <summary>Populates the board object with the contents of the item source</summary>
        /// <param name="callback" type="IResultCallback">The function to call back when the population has completed. It receives an array of items.</param>
        /// <param name="errorCallback" type="IErrorCallback" optional="true">The function to call if an error occurs during the population.</param>
        Diag.Debug.assertParamIsType(callback, "function", "callback");
        Diag.Debug.assertParamIsType(errorCallback, "function", "errorCallback", true);

        var beginGetItems = () => {
            this._itemSource.beginGetItems((items: Item[]) => {
                this._updateItems(items);
                var shouldFetchChild = false;
                // Get item ids if any annotation is enabled. Update AnnotationItemSource data.
                var isAllChildAnnotationEnabled = FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessAgileCardAnnotations);
                if (isAllChildAnnotationEnabled) {
                    shouldFetchChild = Board.BoardAnnotationSettings.isAnyAnnotationEnabled();
                } else {
                    shouldFetchChild = Board.BoardAnnotationSettings.isAnnotationApplicable(BoardAnnotationsIdentifier.ChecklistAnnotation);
                }
                if (shouldFetchChild) {
                    var itemIds = $.map(items, (item) => { return item.id(); });

                    this._itemSource.retrieveAnnotationItemSourceData(itemIds);

                    this._itemSource.beginGetChildren(itemIds).then(
                        (childItemsDictionary: IDictionaryNumberTo<Item[]>) => {
                            // record telemetry.
                            var parentsCount = 0;
                            var childCount = 0;
                            $.each(childItemsDictionary, (index: number, childItems: Item[]) => {
                                childCount += childItems.length;
                                parentsCount++;
                            });

                            var averageNumberOfChildPerParent = parentsCount > 0 ? Math.round(childCount / parentsCount) : 0;
                            KanbanTelemetry.publish(KanbanTelemetry.KANBAN_CHECKLIST, {
                                "NumberOfCardsWithChecklist": parentsCount,
                                "AverageNumberOfChecklistsOnCard": averageNumberOfChildPerParent
                            });
                        });
                }
                callback(items);
            }, errorCallback);
        };

        if (this._itemSource) {
            if ($.isFunction(this._membershipEvaluator.initialize)) {
                this._membershipEvaluator.initialize();
            }
            beginGetItems();
        }
        else {
            Utils_Core.delay(this, 0, callback, []);
        }
    }

    /**
     * Asynchronously retrieves the next page of items
     * @param isFilterActive is filter active
     * @param columnType Column type
     * @param callback The function to provide the items
     * @param errorCallback The function to call on error
     * @param pagingCountData Telemetry data for paging counts CI events
     */
    public beginPageMoreItems(isFilterActive: boolean, columnType: string, callback: IResultCallback, errorCallback?: IErrorCallback, pagingCountData?: IDictionaryStringTo<any>): Ajax.IAjaxRequestContext {
        const pageSize = isFilterActive ? this._filterPageSize : this._pageSize;
        const teamId = this._boardSettings.teamId;

        return this.itemSource().beginPageItems(teamId, columnType, pageSize, (items: Item[]) => {
            this._updateItems(items);

            // If any annotation is enabled, get item ids and update AnnotationItemSource data.
            if (Board.BoardAnnotationSettings.isAnyAnnotationEnabled()) {
                var itemIds = $.map(items, (item) => { return item.id(); });
                this._itemSource.retrieveAnnotationItemSourceData(itemIds);

                // Update items' children only if Checklist annotation is enabled.
                if (Board.BoardAnnotationSettings.isAnnotationApplicable(BoardAnnotationsIdentifier.ChecklistAnnotation)) {
                    this._itemSource.beginGetChildren(itemIds);
                }
            }
            callback(items);
        }, errorCallback, pagingCountData);
    }

    /**
     * Returns true if the current backlog level is the root/topmost level.
     */
    public isRootBacklogLevel(): boolean {
        if (this._isRootBacklogLevel === null) {
            const backlogContext = TFS_Agile.BacklogContext.getInstance();
            const backlogConfiguration = BacklogConfigurationService.getBacklogConfiguration();
            this._isRootBacklogLevel = !!(backlogContext
                && backlogContext.level
                && backlogConfiguration
                && backlogConfiguration.isRootLevelBacklog(backlogContext.level.id));
        }

        return this._isRootBacklogLevel;
    }

    private _ensureInitializedBacklogLevelHelper() {
        if (!this._backlogLevelHelper) {
            // initialize _backlogLevelHelper
            this._backlogLevelHelper = new TFS_Agile_WorkItemChanges.BacklogLevelHelper();

            // initialize _currentBacklogLevel
            let backlogContext = TFS_Agile.BacklogContext.getInstance();
            let defaultWorkItemTypeName = backlogContext.level.defaultWorkItemType;
            this._currentBacklogLevel = this._backlogLevelHelper.getLevel(defaultWorkItemTypeName);
        }
    }

    private _isItemTypeChildBacklogLevel(workItemType: string): boolean {
        this._ensureInitializedBacklogLevelHelper();
        var level = this._backlogLevelHelper.getLevel(workItemType);
        return this._currentBacklogLevel !== -1 && level !== -1 && (this._currentBacklogLevel + 1) === level;
    }

    private _isItemTypeCurrentBacklogLevel(workItemType: string): boolean {
        this._ensureInitializedBacklogLevelHelper();
        var level = this._backlogLevelHelper.getLevel(workItemType);
        return this._currentBacklogLevel !== -1 && level !== -1 && this._currentBacklogLevel === level;
    }

    public setItemSource(itemSource?: WorkItemSource): ItemSource {
        /// <summary>Sets or gets the item source used for this board</summary>
        /// <param name="itemSource" type="ItemSource" optional="true">The item source to set</param>
        /// <param name="suppressFire" type="boolean" optional="true">Defaults to false. If set to true will suppress the item source changed event</param>
        /// <returns type="ItemSource">The item source</returns>
        Diag.Debug.assertParamIsType(itemSource, ItemSource, "itemSource", true);

        if (itemSource !== undefined) {
            // Setup event handler. The events that the board cares about are those that
            // will affect where an item is place (noting that we don't want to react to
            // dynamic changes (e.g. field-change events).
            if (!this._itemChangeHandler) {
                this._itemChangeHandler = delegate(this, (sender: WorkItemSource, args: IWorkItemSourceChangedArgs) => {
                    switch (args.change) {
                        case ItemSource.ChangeTypes.Opened:
                            // TODO: It would be better to have this done as an ActionManager.performAction operation
                            // rather than using the notification service and relying on the UI layer to play along.
                            // When the UI wants to defer the update to a later stage (e.g. during a drag-drop action)
                            // it can register a higher priority action worker for the duration of the move. The default
                            // action worker would do the _itemUpdated immediately.
                            this._eventsHelper.fire(Notifications.BoardItemNeedsUpdate, this, {
                                id: args.id,
                                update: () => {
                                    this._itemUpdated(sender, args);
                                }
                            });
                            // TODO: Should we cancel any acquisition here?
                            break;
                        case ItemSource.ChangeTypes.Created:
                        case ItemSource.ChangeTypes.SaveCompleted:
                            this._itemUpdated(sender, args);
                            break;
                        case ItemSource.ChangeTypes.Refresh:
                        case ItemSource.ChangeTypes.Reset:
                            delete this._workItemIdsTypeChanged[args.id];
                            // TODO: Should we cancel any acquisition here?
                            this._itemUpdated(sender, args);
                            break;
                        case ItemSource.ChangeTypes.FieldChange:
                            if (args.id !== args.getItem().id()) {
                                this._itemUpdated(sender, args);
                            }
                            break;
                        case ItemSource.ChangeTypes.Discarded:
                        case ItemSource.ChangeTypes.Deleted:
                            delete this._workItemIdsTypeChanged[args.id];
                            this._itemDiscarded(sender, args);
                            break;
                        case ItemSource.ChangeTypes.TypeChanged:
                            var originalTypeName = args.workItem.getOriginalWorkItemType().name;
                            var currentTypeName = args.workItem.workItemType.name;
                            var isOriginalTypeAChildItem = this._isItemTypeChildBacklogLevel(originalTypeName);
                            var isTypeCurrentLevel = this._isItemTypeCurrentBacklogLevel(currentTypeName);

                            // if type changed from child item type to current backlog level item type.
                            if (isTypeCurrentLevel && isOriginalTypeAChildItem) {
                                this._workItemIdsTypeChanged[args.id] = true;
                            }
                            break;
                        case ItemSource.ChangeTypes.Saved:
                            if (this._workItemIdsTypeChanged[args.id]) {
                                delete this._workItemIdsTypeChanged[args.id];
                                this._eventsHelper.fire(Notifications.BoardMessageDisplay, this,
                                    {
                                        message: AgileControlsResources.BoardRefreshRequired,
                                        messageType: VSS_Notifications.MessageAreaType.Warning,
                                        clickCallback: () => {
                                            window.location.reload();
                                        }
                                    });
                            }
                            break;
                        default:
                            break;
                    }

                    // Let consumers know that something has changed on the board
                    this._eventsHelper.fire(Notifications.BoardItemsUpdated, this);
                });
            }

            // if already connected to source, disconnect first.
            if (this._itemSource) {
                this._itemSource.detachEvent(ItemSource.Events.ItemChange, this._itemChangeHandler);
                this._itemSource.dispose();
                $.each(this._itemContainer.values(), function (i, container) {
                    container.clear();
                });
            }

            this._items = new TFS_Core_Utils.Dictionary<Item>();
            this._itemContainer = new TFS_Core_Utils.Dictionary<BoardMember>();
            this._itemSource = itemSource;
            itemSource.attachEvent(ItemSource.Events.ItemChange, this._itemChangeHandler);
        }

        return this._itemSource;
    }

    public itemSource(): ItemSource {
        return this._itemSource;
    }

    /**
     * Update and persist the work in progress limits for the board
     * @param updatedMember The member who's limit has been updated
     * @param newLimit The new limit for the member
     * @param successCallback The callback that is called on successful save of the limits
     * @param errorCallback The callback that is called on an error when saving the limits
     */
    public updateLimit(updatedMember: BoardMember, newLimit: number, successCallback?: IResultCallback, errorCallback?: IErrorCallback) {
        Diag.Debug.assertParamIsType(updatedMember, BoardMember, "updatedMember");
        Diag.Debug.assertParamIsType(newLimit, "number", "newLimit");
        Diag.Debug.assertParamIsType(successCallback, "function", "successCallback", true);
        Diag.Debug.assertParamIsType(errorCallback, "function", "errorCallback", true);

        const limits = $.map(updatedMember.node().members(), function (member) {
            const limit = member.limits();
            if (!limit) {
                return null;
            }

            if (member === updatedMember) {
                limit.limit = newLimit;
                member.limits(limit);
            }

            return Utils_String.format("{0}:{1}", member.title(), limit.limit);
        });
        const limitSetting = limits.toString();

        const routeData = {
            area: "api",
            includeVersion: true,
            teamId: this._boardSettings.teamId
        };
        const apiLocation = tfsContext.getActionUrl(/*Action*/ "SetTeamWorkInProgressLimits", /*Controller*/ "backlog", routeData);

        Ajax.postMSJSON(apiLocation, { data: limitSetting }, successCallback, errorCallback);
    }

    public currentContainer(id: number): BoardMember {
        /// <summary>Get the current container of a specified item.</summary>
        /// <param name="id" type="Number">The id of the item to get the container for.</param>
        /// <returns type="BoardMember">The member that currently owns the item with the specified id</returns>
        return this._itemContainer.get(id);
    }

    public acquisitions(): any {
        /// <summary>Get the container that holds the current item acquisitions.</summary>
        /// <returns type="Object">The dictionary of acquisitions currently in flight</returns>
        return this._acquisitions;
    }

    public fire(eventName, sender, eventArgs) {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs);
    }

    public _fireEvent(eventName: string, sender?: any, args?: any) {
        /// <summary>Invoke the specified event passing the specified arguments.</summary>
        /// <param name="eventName" type="String">The event to invoke.</param>
        /// <param name="sender" type="Object" optional="true">The sender of the event.</param>
        /// <param name="args" type="Object" optional="true">The arguments to pass through to the specified event.</param>

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

    public attachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Attatch a handler to an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to attach.</param>
        if (!this._events) {
            this._events = new Events_Handlers.NamedEventCollection();
        }

        this._events.subscribe(eventName, <any>handler);
    }

    public detachEvent(eventName: string, handler: IEventHandler) {
        /// <summary>Detatch a handler from an event.</summary>
        /// <param name="eventName" type="String">The event name.</param>
        /// <param name="handler" type="IEventHandler">The handler to detach.</param>
        if (this._events) {
            this._events.unsubscribe(eventName, <any>handler);
        }
    }

    public getCardSettingsProvider(): Cards.CardSettingsProvider {
        /// <summary>Gets the cardSettingsProvider for the board using which the cardSettings can be get and set</summary>
        /// <returns type="TFS_Agile.CardSettingsProvider">The board's cardSettings provider</returns>
        return this._cardSettingsProvider;
    }

    public setCardSettingsProvider(provider: Cards.CardSettingsProvider) {
        /// <summary>Sets the carSettingsProvider for the board</summary>
        /// <param name="provider" type="TFS_Agile.CardSettingsProvider">The card settings provider for the board</param>
        /// <returns type="Boolean">True if meets board criteria, false otherwise</returns>
        this._cardSettingsProvider = provider;
    }

    public isAutoBoardRefreshOn(): boolean {
        return this._boardSettings.autoRefreshState;
    }

    private _meetsBoardCriteria(item: any): boolean {
        /// <summary>Determines whether the item meets the board's high level criteria</summary>
        /// <param name="item" type="Object">The item to check</param>
        /// <returns type="Boolean">True if meets board criteria, false otherwise</returns>
        Diag.Debug.assertParamIsType(item, Item, "item");

        var isMember;

        this._membershipEvaluator(item, function (member) {
            isMember = member;
        });

        return isMember;
    }

    private _updateItems(items: Item[]) {
        Diag.Debug.assertParamIsType(items, Array, "items", true);

        Performance.getScenarioManager().split(KanbanTelemetry.Perf_Split_UpdateItemsStart);

        var length = items.length;
        for (var i = 0; i < length; i++) {
            var item = items[i];
            this._itemUpdated(this.itemSource(), {
                id: item.id(),
                getItem: () => {
                    return item;
                },
                deferPlacement: true
            });
        }

        Performance.getScenarioManager().split(KanbanTelemetry.Perf_Split_UpdateItemsEnd);

        /** Let consumsers know there are new items */
        this._eventsHelper.fire(Notifications.BoardItemsUpdated, this);
    }

    /**
     * Handles updates to the underlying item source
     * @param sender Source of the event.
     * @param args The arguments for the event including the item id stored as 'id' and a function 'getItem'
     * that gets the fully fledged item.
     */
    private _itemUpdated(sender: any, args?: any) {
        Diag.Debug.assertParamIsType(sender, Object, "sender");
        Diag.Debug.assertParamIsType(args.id, "number", "args.id");
        Diag.Debug.assertParamIsType(args.getItem, "function", "args.getItem");
        Diag.Debug.assertParamIsType(args.deferPlacement, "boolean", "args.deferPlacement", true);

        const id = args.id,
            isTracked = this._items.containsKey(id);
        let item;

        if (isTracked) {
            item = this._items.get(id);
            if (id !== item.id()) {
                this._changeItemId(id, item.id());
            }
        }
        else {
            item = args.getItem();
            // This is called on all work item updated events
            // Make sure we only react to work item create events triggered by the board
            const itemContainer = this._node.getItemContainer(item);
            if (id < 0 && itemContainer && !itemContainer.shouldReceiveNewItems()) {
                return;
            }
        }

        if (this._meetsBoardCriteria(item)) {
            this._updateItem(item, args.deferPlacement, args.change);
        }
        else if (isTracked) {
            this.removeItem(item, KanbanTelemetry.KANBAN_ITEM_REMOVED_MEMBERSHIP_CHANGED);
        }
    }

    private _itemDiscarded(sender: any, args?: any) {
        /// <summary>Handles discard of underlying item source</summary>
        /// <param name="sender" type="Object">Source of the event.</param>
        /// <param name="args" type="Object">The arguments for the event including the item id stored as 'id' and a function 'getItem'
        /// that gets the fully fledged item.</param>
        Diag.Debug.assertParamIsType(sender, Object, "sender");
        Diag.Debug.assertParamIsType(args.id, "number", "args.id");
        Diag.Debug.assertParamIsType(args.getItem, "function", "args.getItem");

        var id = args.id,
            isTracked = this._items.containsKey(id);

        if (isTracked) {
            var item = this._items.get(id);
            this.removeItem(item, KanbanTelemetry.KANBAN_ITEM_REMOVED_DELETED);
        }
    }

    private _changeItemId(oldId: number, newId: number) {
        /// <summary>Change the item id</summary>
        /// <param name="oldId" type="number">The old id of the item </param>
        /// <param name="newId" type="number">The new id of the item </param>

        Diag.Debug.assert(this._items.containsKey(oldId), "Change id only for a tracked work item");

        var currentContainer = this._itemContainer.get(oldId);

        this._items.set(newId, this._items.get(oldId));
        this._itemContainer.set(newId, currentContainer);
        if (this._acquisitions.containsKey(oldId)) {
            this._acquisitions.set(newId, this._acquisitions.get(oldId));
        }

        currentContainer.changeItemId(oldId, newId);

        this._acquisitions.remove(oldId);
        this._itemContainer.remove(oldId);
        this._items.remove(oldId);

    }

    private _updateItem(item: WorkItemItemAdapter, deferPlacement: boolean, changeType: string) {
        /// <summary>Update the item in the board to ensure it appears in the correct member.
        /// Additional members may be created to add the item.</summary>
        /// <param name="item" type="Item">The item to update.</param>
        Diag.Debug.assertParamIsType(item, Item, "item");

        var id = item.id();
        var currentContainer = this._itemContainer.get(id);
        var targetContainer = this._node.getItemContainer(item);

        if (!targetContainer) { // it has no home
            if (currentContainer) { // it was on the board, so remove it
                this.removeItem(item, KanbanTelemetry.KANBAN_ITEM_REMOVED_INVALID_NODE);
            }
        }
        else {
            if (targetContainer === currentContainer) {
                // If the container is the same then make sure to clear out any pending 
                // acquisitions. This will handle any drag/drop error cases
                var out: any = {};
                if (this._acquisitions.tryGetValue(id, out)) {
                    var acquisition = out.value;
                    var member = acquisition.member;
                    member.release(id, true);
                }
            }
            else {
                this._items.set(id, item);
                this._itemContainer.set(id, targetContainer);
            }

            targetContainer.updateItem(item, deferPlacement, currentContainer);

            if (changeType === ItemSource.ChangeTypes.Refresh) {
                let targetContainerHasLockedItems = false;
                // get the container for each of the locked items and check if any of them matches the targetContainer
                for (let index in this._lockedItems) {
                    if (targetContainer === this._itemContainer.get(this._lockedItems[index])) {
                        targetContainerHasLockedItems = true;
                        break;
                    }
                }

                // if there are no locked items in the targetContainer apply filter on it
                if (!targetContainerHasLockedItems) {
                    targetContainer.calculateFilteredItems();
                }
            }
        }

        this._eventsHelper.fire(Notifications.BoardTileMoved);
    }

    /**
     * Remove the item from the board.
     *
     * @param item The item to update.
     * @param reason The reason for the removal. For telemetry purposes
     */
    public removeItem(item: Item, reason?: string) {
        Diag.Debug.assertParamIsType(item, Item, "item");

        var id = item.id(),
            container = this._itemContainer.get(id);

        if (container) {
            // remove item from board member
            container.removeItem(item);
            this._itemContainer.remove(id);
        }

        // item to cleanup its cache
        item.postRemoveCleanup();

        // remove item from board
        this._items.remove(id);

        // clear from global cache
        this._itemSource.clearItem(id);

        if (reason) {
            KanbanTelemetry.OnItemRemoved(reason);
        }
    }

    /**
    * Remove an item by the given id from the board.
    *
    * @param itemId item id to remove
    *  @param reason The reason for the removal. For telemetry purposes
    */
    public removeItemById(itemId: number, reason?: string) {

        var item: Item = this._itemSource.getCachedItem(itemId);
        if (item) {
            this.removeItem(item, reason);
        }
    }

    protected _autoRefreshBoardItems(sender: any, workItemDataList: BoardAutoRefreshCommon.AutoRefreshEventPayload[]): void {

        var errorHandler = (errorTraceMessage: string) => {
            Diag.logTracePoint(errorTraceMessage);
            this._eventsHelper.fire(BoardAutoRefreshCommon.Events.ItemsAutoRefreshCompleted, this, 0);
        };

        var workItemDataMap = new TFS_Core_Utils.Dictionary<BoardAutoRefreshCommon.AutoRefreshEventPayload>();
        let itemsRemoved: number = 0;
        for (let index in workItemDataList) {
            var workItemData = workItemDataList[index];

            var item: WorkItemItemAdapter = this._itemSource.getCachedItem(workItemData.id);
            if (this._lockedItems.indexOf(workItemData.id) > -1) {
                // Item is locked right now. Just signal that it needs to be refreshed, when unlocked.
                if (item) {
                    item.setPendingAutoRefreshEvent(workItemData);
                }
            }
            else {
                switch (workItemData.changeType) {
                    case BoardAutoRefreshCommon.EventType.ItemUpdated:
                        if (this._items.containsKey(workItemData.id)) {
                            workItemData.wasWorkItemAttached = item.isWorkItemAttached();
                            if (!workItemDataMap.containsKey(workItemData.id)) {
                                workItemDataMap.add(workItemData.id, workItemData);
                            }
                        }
                        else {
                            Diag.logTracePoint(BoardAutoRefreshCommon.TracePoints.WarningInUpdateNotOnBoard);
                        }
                        break;
                    case BoardAutoRefreshCommon.EventType.ItemCreated:
                    case BoardAutoRefreshCommon.EventType.ItemAdded:
                        if (!this._items.containsKey(workItemData.id)) {
                            if (!workItemDataMap.containsKey(workItemData.id)) {
                                workItemDataMap.add(workItemData.id, workItemData);
                            }
                        }
                        else {
                            Diag.logTracePoint(BoardAutoRefreshCommon.TracePoints.WarningInAddAlreadyOnBoard);
                        }
                        break;
                    case BoardAutoRefreshCommon.EventType.ItemDeleted:
                    case BoardAutoRefreshCommon.EventType.ItemRemoved:
                        if (this._items.containsKey(workItemData.id)) {
                            this.removeItemById(workItemData.id);
                            itemsRemoved++;
                        }
                        else {
                            Diag.logTracePoint(BoardAutoRefreshCommon.TracePoints.WarningInDeleteNotOnBoard);
                        }
                        break;
                    case BoardAutoRefreshCommon.EventType.ItemRestored:
                        if (!this._items.containsKey(workItemData.id)) {
                            if (!workItemDataMap.containsKey(workItemData.id)) {
                                workItemDataMap.add(workItemData.id, workItemData);
                            }
                        }
                        else {
                            Diag.logTracePoint(BoardAutoRefreshCommon.TracePoints.InfoInRestoreAlreadyOnBoard);
                        }
                        break;
                    default:
                        Diag.logTracePoint(BoardAutoRefreshCommon.TracePoints.ErrorUnknownEventType);
                        break;
                }
            }
        }
        if (itemsRemoved > 0) {
            var ciData: IDictionaryStringTo<any> = {
                "SuccessfullyUpdated": itemsRemoved,
                "ErrorUpdating": 0
            };
            BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("ItemsRemoved", this._boardSettings.extensionId, ciData);
        }
        if (workItemDataMap.count() > 0) {
            var successHandler = (val: { successCount: number, failureCount: number }) => {
                if (val.successCount > 0 || val.failureCount > 0) {
                    var ciData: IDictionaryStringTo<any> = {
                        "SuccessfullyUpdated": val.successCount,
                        "ErrorUpdating": val.failureCount
                    };
                    BoardAutoRefreshCommon.PublishAutoRefreshTelemetry("GetWICallResult", this._boardSettings.extensionId, ciData);
                }

                this._eventsHelper.fire(BoardAutoRefreshCommon.Events.ItemsAutoRefreshCompleted, this, val.successCount);
            };
            this._itemSource.autoRefreshItems(workItemDataMap).then(successHandler,
                errorHandler.bind(null, BoardAutoRefreshCommon.TracePoints.ErrorInUpdate));
        } else {
            this._eventsHelper.fire(BoardAutoRefreshCommon.Events.ItemsAutoRefreshCompleted, this, 0);
        }
    }

    /**
    * Subcsribes to auto-refresh events.
    */
    public subscribeForAutoRefreshEvents() {
        if (!this._autoRefreshBoardItemsDelegate) {
            this._autoRefreshBoardItemsDelegate = delegate(this, this._autoRefreshBoardItems);
            this._eventsHelper.attachEvent(BoardAutoRefreshCommon.Events.ItemsNeedAutoRefresh, this._autoRefreshBoardItemsDelegate);
            this._boardSettings.autoRefreshState = true;
        }
    }

    public unsubscribeFromAutoRefreshEvents() {
        if (this._autoRefreshBoardItemsDelegate) {
            this._eventsHelper.detachEvent(BoardAutoRefreshCommon.Events.ItemsNeedAutoRefresh, this._autoRefreshBoardItemsDelegate);
            this._autoRefreshBoardItemsDelegate = null;
            this._boardSettings.autoRefreshState = false;
        }
    }
}

/*
 * @interface board settings changes used for telemetry.
 */
export interface IBoardSettingChanges {
    /// <summary>is column name changed?</summary>
    isColumnNameChanged: boolean;

    /// <summary>is WIP limit changed?</summary>
    isWIPLimitChanged: boolean;

    /// <summary>is split column checkbox state changed </summary>
    isSplitColumnStateChanged: boolean;

    /// <summary>is description changed</summary>
    isDescriptionChanged: boolean;

    /// <summary>is column state changed?</summary>
    isColumnStateChanged: boolean;

    /// <summary>is column order changed?</summary>
    isColumnOrderChanged: boolean;

    /// <summary>total number of columns</summary>
    totalColumnCount: number;

    /// <summary>how many new columns are added?</summary>
    newColumnCount: number;

    /// <summary>how many columns are deleted?</summary>
    deletedColumnCount: number;

    /// <summary>number of columns that have description set</summary>
    descriptionColumnCount: number;

    /// <summary>number of columns that are split</summary>
    splitColumnCount: number;

    /// <summary>average WIP limit for in progress column</summary>
    averageWipLimitInProgressColumn: number;

    /// <summary>is column deleted</summary>
    isColumnDeleted: boolean;

    /// <summary>is column added</summary>
    isColumnAdded: boolean;
}

/*
 * @interface changes on tile drag drop used for telemetry.
 */
export interface ITileDragDropChanges {
    isColumnChanged: boolean;
    isLaneChanged: boolean;
    columnStateChanged: string;
    doingDoneStateChanged: string;
}

interface ICardFieldsSettingTelemetry {
    /** card type */
    type: string;
    /** Flag indicate whether show id on card is enabled */
    showId: boolean;
    /** Flag indicate whether show tag on card is enabled */
    showTag: boolean;
    /** Flag indicate whether show effort on card is enabled */
    showEffort: boolean;
    /** Flag indicate whether show assigned to on card is enabled */
    showAssignedTo: boolean;
    /** Flag indicate whether show empty field on card is enabled */
    showEmptyFields: boolean;
    /** Count of additional fields shown on card */
    additionalFieldCount: number;
}

/*
 * Kanban board telemetry.
 */
export class KanbanTelemetry {
    // CI Areas
    public static CI_AREA_AGILE: string = "Agile";

    // CI features
    public static KANBAN_FILTERSEARCH = "KanbanFilterSearch";
    public static KANBAN_FILTERINDEXING = "KanbanFilterIndexing";
    public static KANBAN_PAGINGCOLUMNS = "KanbanPagingColumns";
    public static KANBAN_DRAG_DROP = "KanbanDragDrop";
    public static KANBAN_ITEM_REMOVED = "KanbanItemRemoved";
    public static KANBAN_UPDATE_LANE_SETTINGS = "UpdateKanbanLaneSettings";
    public static KANBAN_UPDATE_COLUMN_SETTINGS = "UpdateKanbanColumnSettings";
    public static KANBAN_UPDATEBOARDSETTINGS = "UpdateKanbanBoardSettings";
    public static KANBAN_REFRESHBOARD = "KanbanBoardRefresh";
    public static KANBAN_ADDNEWITEM = "KanbanAddNewItem";
    public static KANBAN_REORDER = "KanbanReorder";
    public static KANBAN_DEFINITION_OF_DONE = "KanbanDefinitionOfDone";
    public static KANBAN_COLLAPSECOLUMN = "KanbanCollapseColumn";
    public static KANBAN_FILTER_PAGING_COMPLETE = "KanbanFilterPagingComplete";
    public static KANBAN_TILE_EDIT = "KanbanTileEdit";
    public static KANBAN_CARDSTYLESETTINGSUPDATE = "CardStyleSettingsUpdate";
    public static KANBAN_CHECKLIST = "KanbanChecklist";
    public static KANBAN_AUTOBOARDREFRESH_SETTING_ON = "KanbanAutoBoardRefreshTurnedOn";
    public static KANBAN_AUTOBOARDREFRESH_SETTING_OFF = "KanbanAutoBoardRefreshTurnedOff";

    // Keyboard Shortcuts
    public static KANBAN_ADDNEWITEM_KEYBOARD_SHORTCUT = "KanbanAddNewItemKeyboardShortcut";
    public static KANBAN_SELECTFIRSTTILE_KEYBOARD_SHORTCUT = "KanbanSelectFirstTileKeyboardShortcut";
    public static KANBAN_ADDCHILD_KEYBOARD_SHORTCUT = "KanbanAddChildItemKeyboardShortcut";
    public static KANBAN_OPENTILE_KEYBOARD_SHORTCUT = "KanbanOpenTileKeyboardShortcut";
    public static KANBAN_EXPANDTILE_KEYBOARD_SHORTCUT = "KanbanExpandTileKeyboardShortcut";
    public static KANBAN_RENAMETILE_KEYBOARD_SHORTCUT = "KanbanRenameTileKeyboardShortcut";
    public static KANBAN_NEWITEM_KEYBOARD_SHORTCUT = "KanbanNewItemTileKeyboardShortcut";
    public static KANBAN_EXPANDSWIMLANES_KEYBOARD_SHORTCUT = "KanbanExpandSwimlanesKeyboardShortcut";
    public static KANBAN_COLLAPSESWIMLANES_KEYBOARD_SHORTCUT = "KanbanCollapseSwimlanesKeyboardShortcut";
    public static KANBAN_MOVETILEUP_KEYBOARD_SHORTCUT = "KanbanMoveTileUpKeyboardShortcut";
    public static KANBAN_MOVETILEDOWN_KEYBOARD_SHORTCUT = "KanbanMoveTileDownKeyboardShortcut";
    public static KANBAN_MOVETILELEFT_KEYBOARD_SHORTCUT = "KanbanMoveTileLeftKeyboardShortcut";
    public static KANBAN_MOVETILERIGHT_KEYBOARD_SHORTCUT = "KanbanMoveTileRightKeyboardShortcut";
    public static KANBAN_MOVETILETOPOFCOLUMN_KEYBOARD_SHORTCUT = "KanbanMoveTileTopOfColumnKeyboardShortcut";
    public static KANBAN_MOVETILEBOTTOMOFCOLUMN_KEYBOARD_SHORTCUT = "KanbanMoveTileBottomOfColumnKeyboardShortcut";
    public static KANBAN_SELECTSWIMLANEABOVE_KEYBOARD_SHORTCUT = "KanbanSelectSwimLaneAboveKeyboardShortcut";
    public static KANBAN_SELECTSWIMLANEBELOW_KEYBOARD_SHORTCUT = "KanbanSelectSwimLaneBelowKeyboardShortcut";
    public static KANBAN_LAUNCHFILTER_KEYBOARD_SHORTCUT = "KanbanLaunchFilterKeyboardShortcut";

    // Entire board load
    public static Perf_Scenario_KanbanBoard_Load = "KanbanBoardPerf_LoadBoard";
    public static Perf_Split_BoardDrawBegin = "BoardDrawBegin";
    public static Perf_Split_ItemSourceRetrieved = "ItemSourceRetrieved";
    public static Perf_Split_BoardDrawComplete = "BoardDrawComplete";

    // Draw board
    public static Perf_Scenario_DrawBoard = "KanbanBoardPerf_DrawBoard";
    public static Perf_Split_PreUpdateLayout = "PreUpdateLayout";
    public static Perf_Split_PreSetBoard = "PreSetBoard";

    // Save card
    public static Perf_Scenario_SaveCard = "KanbanBoardPerf_SaveCard";

    // Open card
    public static Perf_Scenario_OpenCard = "KanbanBoardPerf_OpenCard";

    // Load workItemTracking controls
    public static Perf_Split_LoadWITControlsStart = "LoadWITControlsStart";
    public static Perf_Split_LoadWITControlsEnd = "LoadWITControlsEnd";

    // Place tiles
    public static Perf_Scenario_PlaceTiles = "KanbanBoardPerf_PlaceTiles";
    public static Perf_Split_BeginPopulateSuccess = "BeginPopulateSuccess";
    public static Perf_Split_UpdateItemsStart = "UpdateItemsStart";
    public static Perf_Split_UpdateItemsEnd = "UpdateItemsEnd";

    // Criteria Filter 
    public static Perf_Scenario_CriteriaFilterTiles = "KanbanBoardPerf_CriteriaFilterTiles";
    public static Perf_Split_PreCriteriaFilter = "ActualCriteriaFilteringStart";
    public static Perf_Split_PostCriteriaFilter = "ActualCriteriaFilteringEnd";

    // Swimlane adjustments
    public static Perf_Scenario_UpdateSwimlaneHeaders = "KanbanBoardPerf_UpdateSwimlaneHeaders";

    // Item removal causes
    public static KANBAN_ITEM_REMOVED_DELETED = "KanbanItemRemoved_Deleted";
    public static KANBAN_ITEM_REMOVED_INVALID_NODE = "KanbanItemRemoved_InvalidNode";
    public static KANBAN_ITEM_REMOVED_MEMBERSHIP_CHANGED = "KanbanItemRemoved_MembershipChanged";

    public static OnBoardSettingsSave(settings: IBoardSettingChanges, elapsedTimeInMilliseconds: number) {
        var ciData: IDictionaryStringTo<any> = {
            "IsWIPLimitChanged": settings.isWIPLimitChanged,
            "IsColumnNameChanged": settings.isColumnNameChanged,
            "IsSplitColumnStateChanged": settings.isSplitColumnStateChanged,
            "IsDescriptionChanged": settings.isDescriptionChanged,
            "IsColumnStateChanged": settings.isColumnStateChanged,
            "IsColumnOrderChanged": settings.isColumnOrderChanged,
            "AddedColumnCount": settings.newColumnCount,
            "DeletedColumnCount": settings.deletedColumnCount,
            "TotalColumnCount": settings.totalColumnCount,
            "DescriptionColumnCount": settings.descriptionColumnCount,
            "SplitColumnCount": settings.splitColumnCount,
            "AverageWipLimitInProgressColumn": settings.averageWipLimitInProgressColumn,
            "ElapsedTime": elapsedTimeInMilliseconds,
            "IsColumnDeleted": settings.isColumnDeleted,
            "IsColumnAdded": settings.isColumnAdded
        };
        this.publish(KanbanTelemetry.KANBAN_UPDATEBOARDSETTINGS, ciData, true);
    }

    public static OnBoardDisplay(board: Board, isInitialLoad: boolean, staleCache: boolean = false, currentFilter: FilterState = null) {
        if (!isInitialLoad) {
            const currentBoardFilter: string = currentFilter ? JSON.stringify(currentFilter) : "";
            const cidata = KanbanTelemetry._getBoardTelemetryData(board, staleCache, currentBoardFilter);
            this.publish(KanbanTelemetry.KANBAN_REFRESHBOARD, cidata);
        }
    }

    private static _getBoardTelemetryData(board: Board, staleCache?: boolean, currentBoardFilter?: string): IDictionaryStringTo<any> {
        var members = board.rootNode().members();
        var inProgressAverageItemCount = 0;
        var inProgressMaxItemCount = 0;
        var inProgressItemCount = 0;
        var inProgressColumnCount = 0;
        var splitColumnCount = 0;
        var hasDefinitionOfDone = false;
        var hasWipLimit = false;
        var defaultLaneHasName = false;
        var settings = board.getBoardSettings();
        var rows = settings.rows || [];

        // get ci data for in progress column.
        if (members.length > 2) {
            var columnMembers: BoardMember[] = null;
            var swimlaneChildNode = members[1].childNode();
            var swimlanesPresent = swimlaneChildNode && TFS_Agile_Utils.ControlUtils.checkIfFieldReferenceNameIsForSwimlane(swimlaneChildNode.fieldName());
            if (swimlanesPresent) {
                var swimlaneMembers = members[1].childNode().members();
                columnMembers = swimlaneMembers[0].childNode().members();
            }
            else {
                columnMembers = members.filter((members) => members.isInProgress());
            }

            $.each(columnMembers, (i: number, member: BoardMember) => {
                var count = member.totalGroupMemberCount;
                inProgressMaxItemCount = Math.max(inProgressMaxItemCount, count);
                inProgressItemCount += count;
                inProgressColumnCount++;
            });

            if (inProgressColumnCount > 0) {
                inProgressAverageItemCount = Math.round(inProgressItemCount / inProgressColumnCount);
            }
        }

        $.each(settings.columns, (index: number, column: IBoardColumn) => {
            if (column.isSplit) {
                splitColumnCount++;
            }
            if (column.itemLimit > 0) {
                hasWipLimit = true;
            }
            if (column.description) {
                hasDefinitionOfDone = true;
            }
        });

        $.each(rows, (index: number, row: IBoardRow) => {
            if (Utils_String.isEmptyGuid(row.id) && row.name) {
                defaultLaneHasName = true;
                return false;
            }
        });

        // Count the number of card customized styles for the board.
        var cardSettingsProvider = board.getCardSettingsProvider();
        var styleRuleCount = 0;
        var enabledStyleRuleCount = 0;
        var tagColorRuleCount = 0;
        var enabledTagColorRuleCount = 0;
        if (cardSettingsProvider) {
            var cardStyles = cardSettingsProvider.getCardSettings().styles;
            if (cardStyles) {

                $.each(cardStyles, (index: number, style: Cards.IStyleRule) => {
                    if (Utils_String.ignoreCaseComparer(style.type, "tagStyle") === 0) {
                        if (style.isEnabled) {
                            enabledTagColorRuleCount++;
                        }
                        tagColorRuleCount++;
                    } else {
                        if (style.isEnabled) {
                            enabledStyleRuleCount++;
                        }
                        styleRuleCount++;
                    }
                });
            }
        }

        // See if the user has enabled compaction on either of the cards
        var cardSettings = cardSettingsProvider.getCardSettings();
        var compactionEnabled: boolean = false;

        // Card customization fields
        var cardFieldsSettingTelemetry: ICardFieldsSettingTelemetry[] = [];
        var effortFieldRefName = BacklogConfigurationService.getBacklogFieldName(BacklogFieldTypes.Effort);
        $.each(cardSettings.cards, (key: string, card: any) => {
            var cardFieldSetting = {
                type: key,
                showId: false,
                showTag: false,
                showEffort: false,
                showAssignedTo: false,
                showEmptyFields: false,
                additionalFieldCount: 0,
            }
            cardFieldsSettingTelemetry.push(cardFieldSetting);

            $.each(card, (index: number, field: any) => {
                var fieldIdentifier = field[Cards.CardSettings.FIELD_IDENTIFIER];
                if (!fieldIdentifier) {
                    if (field[Cards.CardSettings.SHOW_EMPTY_FIELDS] === "false") {
                        // We check the generic field settings "" for the compaction setting
                        compactionEnabled = true;
                    }
                    else if (field[Cards.CardSettings.SHOW_EMPTY_FIELDS] === "true") {
                        cardFieldSetting.showEmptyFields = true;
                    }
                }
                else {
                    if (Utils_String.ignoreCaseComparer(fieldIdentifier, TFS_Agile_Utils.DatabaseCoreFieldRefName.Tags) === 0) {
                        cardFieldSetting.showTag = true;
                    }
                    else if (Utils_String.ignoreCaseComparer(fieldIdentifier, TFS_Agile_Utils.DatabaseCoreFieldRefName.AssignedTo) === 0) {
                        cardFieldSetting.showAssignedTo = true;
                    }
                    else if (Utils_String.ignoreCaseComparer(fieldIdentifier, TFS_Agile_Utils.DatabaseCoreFieldRefName.Id) === 0) {
                        cardFieldSetting.showId = true;
                    }
                    else if (Utils_String.ignoreCaseComparer(fieldIdentifier, effortFieldRefName) === 0) {
                        cardFieldSetting.showEffort = true;
                    }
                    else if (Utils_String.ignoreCaseComparer(fieldIdentifier, TFS_Agile_Utils.DatabaseCoreFieldRefName.Title) === 0) {
                        // do nothing 
                    }
                    else {
                        cardFieldSetting.additionalFieldCount++;
                    }
                }
            });
        });

        var autoRefreshEnabled: boolean = board.isAutoBoardRefreshOn();

        var cidata: IDictionaryStringTo<any> = {
            "TotalColumnCount": settings.columns.length,
            "AverageItemCount": inProgressAverageItemCount, // average number of cards in in-progress columns
            "MaxItemCount": inProgressMaxItemCount, // max number of cards in in-progress columns
            "TotalLaneCount": rows.length,
            "HasLanes": rows.length > 1,
            "HasDefinitionOfDone": hasDefinitionOfDone,
            "HasWIPLimit": hasWipLimit,
            "DefaultLaneHasName": defaultLaneHasName,
            "HasSplitColumn": splitColumnCount > 0,
            "SplitColumnCount": splitColumnCount,
            "StyleRuleCount": styleRuleCount,
            "EnabledStyleRuleCount": enabledStyleRuleCount,
            "TagColorRuleCount": tagColorRuleCount,
            "EnabledTagColorRuleCount": enabledTagColorRuleCount,
            "CompactionEnabled": compactionEnabled,
            "StaleCache": staleCache,
            "CardSettings": JSON.stringify(cardFieldsSettingTelemetry),
            //Boardfilter has identity field which cannot be traced for GDPR compliance
            //Info is available in DT if needed for investigation
            //"CurrentBoardFilter": currentBoardFilter,
            "AutoRefreshEnabled": autoRefreshEnabled,
            "ExtensionId": settings.extensionId
        };

        return cidata;
    }

    public static OnAddNewItem(itemType: string, startTime: number) {
        var endTime = Date.now();
        var ciData: IDictionaryStringTo<any> = {
            "ItemType": itemType,
            "ElapsedTime": endTime - startTime
        };
        this.publish(KanbanTelemetry.KANBAN_ADDNEWITEM, ciData);
    }

    public static OnColumnRenamedInline(startTime: number) {
        var endTime = Date.now();
        var elapsedTime = endTime - startTime;
        var ciData: IDictionaryStringTo<any> = {
            "IsColumnNameChangedInline": true,
            "ElapsedTime": elapsedTime
        };
        this.publish(KanbanTelemetry.KANBAN_UPDATE_COLUMN_SETTINGS, ciData);
    }

    public static OnLaneRenamedInline(startTime: number) {
        var endTime = Date.now();
        var elapsedTime = endTime - startTime;
        var ciData: IDictionaryStringTo<any> = {
            "IsLaneNameChangedInline": true,
            "ElapsedTime": elapsedTime
        };
        this.publish(KanbanTelemetry.KANBAN_UPDATE_LANE_SETTINGS, ciData);
    }

    public static OnColumnInlineRenameStart() {
        var ciData: IDictionaryStringTo<any> = {
            "ColumnInlineRenameStart": true
        };
        this.publish(KanbanTelemetry.KANBAN_UPDATE_COLUMN_SETTINGS, ciData);
    }

    public static OnLaneInlineRenameStart() {
        var ciData: IDictionaryStringTo<any> = {
            "LaneInlineRenameStart": true
        };
        this.publish(KanbanTelemetry.KANBAN_UPDATE_LANE_SETTINGS, ciData);
    }

    public static OnExpandCollapseColumn(isCollapsed: boolean, columnType: string, isPageLoad: boolean) {
        var ciData: IDictionaryStringTo<any> = {
            "ColumnType": columnType,
            "Collapsed": isCollapsed,
            "IsPageLoad": isPageLoad
        };
        this.publish(KanbanTelemetry.KANBAN_COLLAPSECOLUMN, ciData);
    }

    public static OnFilter(filterArea: string) {
        var ciData: IDictionaryStringTo<any> = {
            "Action": "click",
            "FilterArea": filterArea
        };
        this.publish(KanbanTelemetry.KANBAN_FILTERSEARCH, ciData);
    }

    public static OnDragDrop(changes: ITileDragDropChanges, startTime: number) {
        var endTime = Date.now();
        var ciData: IDictionaryStringTo<any> = {
            "IsColumnChanged": changes.isColumnChanged,
            "IsLaneChanged": changes.isLaneChanged,
            "ColumnStateChanged": changes.columnStateChanged,
            "DoingDoneStateChanged": changes.doingDoneStateChanged,
            "ElapsedTime": endTime - startTime
        };
        this.publish(KanbanTelemetry.KANBAN_DRAG_DROP, ciData);
    }

    public static OnItemRemoved(reason: string) {
        if (
            reason === KanbanTelemetry.KANBAN_ITEM_REMOVED_MEMBERSHIP_CHANGED ||
            reason === KanbanTelemetry.KANBAN_ITEM_REMOVED_DELETED ||
            reason === KanbanTelemetry.KANBAN_ITEM_REMOVED_INVALID_NODE
        ) {
            this.publish(KanbanTelemetry.KANBAN_ITEM_REMOVED, {
                "Reason": reason
            });
        }
    }

    public static OnTileEdit(startTime: number) {
        var endTime = Date.now();
        var ciData: IDictionaryStringTo<any> = {
            "ElapsedTime": endTime - startTime
        };
        this.publish(KanbanTelemetry.KANBAN_TILE_EDIT, ciData);
    }

    public static OnCardStyleSettingUpdate(styleRules: Cards.IStyleRule[]) {
        let usage = new TelemetryUtils.BoardFieldUsageData();
        let styleData: IDictionaryNumberTo<Cards.IStyleRule> = {};

        styleRules.forEach((style: Cards.IStyleRule, index: number) => {
            styleData[index] = style;

            style.criteria.clauses.forEach((clause: Cards.IQueryClause, index: number) => {
                switch (clause.fieldName) {
                    case WITConstants.CoreFieldRefNames.BoardColumn:
                        usage.column = true;
                        break;
                    case WITConstants.CoreFieldRefNames.BoardColumnDone:
                        usage.done = true;
                        break;
                    case WITConstants.CoreFieldRefNames.BoardLane:
                        usage.lane = true;
                        break;
                    default:
                        break;
                }
            });
        });

        TelemetryUtils.recordBoardFieldsUsageChange(CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE, KanbanTelemetry.KANBAN_CARDSTYLESETTINGSUPDATE, usage);
    }

    public static recordChecklistTelemetry(itemType: string, action: string, sourceOfAction?: string) {
        KanbanTelemetry.publish(KanbanTelemetry.KANBAN_CHECKLIST, {
            "ItemType": itemType,
            "Action": action,
            "SourceOfAction": sourceOfAction
        });
    }

    public static publish(featureName: string, cidata: IDictionaryStringTo<any>, immediate: boolean = false): void {
        cidata.IsEmbedded = EmbeddedHelper.isEmbedded();
        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            KanbanTelemetry.CI_AREA_AGILE,
            featureName,
            cidata), immediate);
    }
}

export class BoardColumnValidator {
    public static getTitleValidationErrors(title: string, columns: IBoardColumn[]): string {
        let message = "";
        if (title) {
            title = title.trim();
        }
        if (!title || Utils_String.localeComparer(title, "") === 0) {
            message = AgileControlsResources.CustomizeColumnsEmptyColumnName;
        }
        else if (title.length > 255) {
            // Length limit
            message = AgileControlsResources.CustomizeColumns_LongColumnName;
        }
        else if (Utils_String.containsControlChars(title) || Utils_String.containsMismatchedSurrogateChars(title)) {
            // Invalid character
            message = AgileControlsResources.CustomizeColumnsInvalidCharactersColumnName;
        }
        else {
            // Check duplicate column name
            if (BoardValidator.isTitleDuplicate(title, columns)) {
                message = AgileControlsResources.CustomizeColumnsDuplicateColumnName;
            }
        }
        return message;
    }
}

export class BoardRowValidator {
    /**
     * Validates that swimlane name is not empty, has a length less than 256, and does not contain invalid characters.
     * Swimlane name can be empty if it is the default lane.
     * @return A result containing valid state and message to be displayed.
     */
    public static getTitleValidationErrors(title: string, rows: IBoardRow[], isDefault: boolean): string {
        let message = "";
        title = title.trim();
        let isLaneNameEmpty = (Utils_String.localeComparer(title, "") === 0);

        if (!isDefault || (isDefault && !isLaneNameEmpty)) {
            if (isLaneNameEmpty) {
                message = AgileControlsResources.Swimlane_Settings_EmptyLaneName;
            }
            else if (title.length > 255) {
                // Length limit
                message = AgileControlsResources.Swimlane_Settings_LongLaneName;
            }
            else if (Utils_String.containsControlChars(title) || Utils_String.containsMismatchedSurrogateChars(title)) {
                // Invalid character
                message = AgileControlsResources.Swimlane_Settings_InvalidCharactersLaneName;
            }
            else {
                // Duplicate name
                if (BoardValidator.isTitleDuplicate(title, rows)) {
                    message = AgileControlsResources.Swimlane_Settings_DuplicateLaneName;
                }
            }
        }
        return message;
    }
}

export class BoardValidator {

    /**
     * Validates if the title is duplicate
     * @param newName The name to be validated
     * @param members The current set of members, whose names should be compared against
     * @return True if no more data needs to be loaded, false otherwise
     */
    public static isTitleDuplicate(newName: string, members: { name: string }[]): boolean {
        let isDuplicate: boolean = false;
        $.each(members, (index: number, currentMember: { name: string }) => {
            if (Utils_String.equals(newName, currentMember.name, true)) {
                isDuplicate = true;
                return false; // break
            }
        });
        return isDuplicate;
    }
}

export class BoardSettingsManager {
    private _tfsConnection: Service.VssConnection;
    private _workHttpClient: Work_WebApi.WorkHttpClient;
    private _teamContext: TFS_Core_Contracts.TeamContext;

    constructor() {
        this._tfsConnection = new Service.VssConnection(tfsContext.contextData);
        this._workHttpClient = this._tfsConnection.getHttpClient<Work_WebApi.WorkHttpClient>(Work_WebApi.WorkHttpClient);
        const backlogContext = TFS_Agile.BacklogContext.getInstance();
        this._teamContext = <TFS_Core_Contracts.TeamContext>{
            projectId: tfsContext.contextData.project.id,
            teamId: backlogContext.team.id
        };
    }

    /**
     * Involed the rest api to update the column
     */
    public beginUpdateColumns(columns: Work_Contracts.BoardColumn[], boardId: string): IPromise<Work_Contracts.BoardColumn[]> {
        return this._workHttpClient.updateBoardColumns(<Work_Contracts.BoardColumn[]>columns, this._teamContext, boardId);
    }

    /**
     * Involed the rest api to update the row
     */
    public beginUpdateRows(rows: Work_Contracts.BoardRow[], boardId: string): IPromise<Work_Contracts.BoardRow[]> {
        let deferred = Q.defer<Work_Contracts.BoardRow[]>();

        this._workHttpClient.updateBoardRows(<Work_Contracts.BoardRow[]>rows, this._teamContext, boardId).then(
            (value: Work_Contracts.BoardRow[]) => {
                deferred.resolve(value);
            },
            (error: {
                message: string;
                serverError: any;
            }) => {
                if (error.serverError.customProperties && error.serverError.customProperties.InputWithError) {
                    let rowWithError = error.serverError.customProperties.InputWithError;
                    if (Utils_String.localeIgnoreCaseComparer(error.serverError.typeKey, "BoardValidatorInvalidCharException") === 0) {
                        error.message = Utils_String.format(AgileControlsResources.BoardValidator_LaneNameContainsInvalidChar, rowWithError);
                    }
                    else if (Utils_String.localeIgnoreCaseComparer(error.serverError.typeKey, "BoardValidatorRowNameLengthInvalidException") === 0) {
                        error.message = Utils_String.format(AgileControlsResources.BoardValidator_LaneNameLengthInvalid, rowWithError);
                    }
                    else if (Utils_String.localeIgnoreCaseComparer(error.serverError.typeKey, "BoardValidatorDuplicateRowNameException") === 0) {
                        error.message = Utils_String.format(AgileControlsResources.BoardValidator_MustNotHaveDuplicateLaneName, rowWithError);
                    }
                }
                else if (Utils_String.localeIgnoreCaseComparer(error.serverError.typeKey, "BoardValidatorRowCountInvalidException") === 0) {
                    error.message = AgileControlsResources.BoardValidator_LaneCountInvalid;
                }
                else if (Utils_String.localeIgnoreCaseComparer(error.serverError.typeKey, "DeletedBoardRowIsNotEmptyException") === 0) {
                    error.message = AgileControlsResources.BoardValidator_DeletedLaneHasItems;
                }
                deferred.reject(error);
            });
        return deferred.promise;
    }
}


/**
 * Filter data source for a single board member
 */
export class BoardMemberFilterDataSource implements IFilterDataSource {
    private visibleColumnReferenceNames: string[];

    constructor(
        private itemTypeNames: string[],
        private boardMember: BoardMember,
        private filterableFieldNamesByItemType: IDictionaryStringTo<string[]>) {
        this.visibleColumnReferenceNames = this.getVisibleColumnReferenceNames();
    }

    private getVisibleColumnReferenceNames(): string[] {
        const fieldNames: string[] = [];

        for (const itemTypeName of this.itemTypeNames) {
            fieldNames.push(...this.filterableFieldNamesByItemType[itemTypeName]);
        }

        return Utils_Array.unique(fieldNames.filter(f => !!f), Utils_String.ignoreCaseComparer);
    }

    getDataSourceName = () => "Kanban";

    getVisibleColumns = () => this.visibleColumnReferenceNames;

    getItemCount(): number {
        return this.boardMember.items().length;
    }

    getIds(): number[] {
        return this.boardMember.items().map(item => item.id());
    }

    getValue(id: number, fieldName: string): any {
        const item = this.boardMember.item(id);
        return item && item.fieldValue(fieldName);
    }

    getUniqueValues(fieldName: string): string[] {
        throw new Error("Not implemented");
    }
}