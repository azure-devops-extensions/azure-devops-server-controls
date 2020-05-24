/// <reference types="jquery" />

import TFS_Agile_WorkItemChanges = require("Agile/Scripts/Common/WorkItemChanges");
import Diag = require("VSS/Diag");
import Performance = require("VSS/Performance");
import Events_Handlers = require("VSS/Events/Handlers");
import Utils_Array = require("VSS/Utils/Array");
import VSS = require("VSS/VSS");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import QueryResultGrid = require("WorkItemTracking/Scripts/Controls/Query/QueryResultGrid");
import { IQueryResultsTreeData } from "WorkItemTracking/Scripts/OM/QueryInterfaces";

export interface IProductBacklogTreeData extends IQueryResultsTreeData {
    /** List of work item ids owned by the current team */
    ownedIds: number[];

    /** Id of root level parent work item */
    realParentIds?: number[];
}

/**
 * Interface representing backlog work item type data, to be kept in sync with BacklogOrderViewModel.cs
 */
export interface IBacklogWorkItemTypeData {
    ids: number[];
    types: string[];
}

/** 
* Define the parameter type to TFS_Agile_ProductBacklog_Grid.ProductBacklogGrid.refresh method
* @property {number} selectedWorkItemId - If provided the work item id that should be selected in the refreshed view
*/
export interface IRefreshProductBacklogGridArgs {
    selectedWorkItemId?: number
}

export interface IWorkItemMoveEffect {
    /** Work items being moved */
    workItemIds: number[];

    /** Location to where the items are being moved to */
    targetLocation: TFS_Agile_WorkItemChanges.ILocation;

    /** Optional: Performance scenario to end after work items have been moved */
    perfScenario?: Performance.IScenarioDescriptor;

    // This can be removed after the IReorderDropEffect is completely removed
    isValid?: boolean;  // true if the effect is valid
}

export interface IProductBacklogDataManagerEventHandler<T> extends IEventHandler {
    (sender: ProductBacklogDataManager, eventArgs: T): void;
}

export module Events {
    export interface IWorkItemsMovedEventArgs {
        /** Work items that were moved */
        workItemIds: number[];

        /** Work items to reparent */
        workItemIdsToReparent: number[];

        /** Location the work items were moved to */
        targetLocation: TFS_Agile_WorkItemChanges.ILocation;

        /** Value indicating whether items should be reordered */
        performReorder: boolean;

        /** Changes made to the work item tree */
        treeChanges: {
            /** Old tree index of workitem */
            oldTreeIndex: number;

            /** New tree index of workitem */
            newTreeIndex: number;

            /** Items moved in this operation (descendants) */
            treeSize: number;

            /** Ancestors affected in old location */
            affectedSourceAncestorIndexes: number[];

            /** Ancestors affected in new location */
            affectedTargetAncestorIndexes: number[];
        }[];

        /** Optional: Performance scenario to end after work items have been moved */
        perfScenario?: Performance.IScenarioDescriptor;
    }
}

export class ProductBacklogDataManager {

    public static EVENT_REFRESH: string = "refresh-event";
    public static EVENT_NEW_ITEM: string = "new-item-event";
    public static EVENT_ID_CHANGE: string = "id-change-event";
    public static EVENT_MOVE_ITEMS: string = "move-items-event";
    public static EVENT_REMOVED_ITEM: string = "removed-item-event";
    public static CHILD_LINKTYPE_ID: number = 2;

    private _events: Events_Handlers.NamedEventCollection<any, any>;
    private _treeData: IProductBacklogTreeData;
    private _orderId: { [Id: number]: number };
    /** Mapping from workItemId to the generated 'order' number */
    private _visibleOrderId: { [Id: number]: number };
    private _descendantCountMap: any;
    private _hasRealParentIds: boolean;
    private _ownedIds: { [id: number]: boolean };
    private _totalRootLevelItems: number;

    /**
     * Create ProductBacklogDataManager
     * 
     * @param treeData Data hierarchy
     */
    constructor(treeData: IProductBacklogTreeData) {
        Diag.Debug.assertParamIsObject(treeData, "treeData");

        this._events = new Events_Handlers.NamedEventCollection();
        this.setTreeData(treeData);
    }

    /**
     * Get workItem ownership
     * 
     * @param workItemId Id of the workItem
     * @return True if owned workItem. Tasks inherit parent's ownership
     */
    public isOwnedItem(workItemId: number): boolean {

        return Boolean(this._ownedIds[workItemId]);
    }

    public setTreeData(treeData: IProductBacklogTreeData) {
        this._treeData = treeData;
        this._ownedIds = {};
        if (this._treeData.ownedIds) {
            for (var i = 0; i < this._treeData.ownedIds.length; ++i) {
                this._ownedIds[this._treeData.ownedIds[i]] = true;
            }
        }
        this._refreshDataSets();
        this._descendantCountMap = {};

        this._hasRealParentIds = !!this._treeData.realParentIds;

        // Get the children counts.
        var childrenCounts = [];
        QueryResultGrid.QueryResultGrid.calculateExpandStates(treeData.sourceIds, treeData.targetIds, childrenCounts, 0, 0, treeData.sourceIds.length);

        for (var i = 0, l = childrenCounts.length; i < l; i++) {
            if (childrenCounts[i]) {
                this._descendantCountMap[this.getWorkItemIdAtTreeIndex(i)] = childrenCounts[i];
            }
        }
    }

    /**
     * Updates the ownership information for the given work item
     * @param id Workitem id
     * @param isOwned Value indicating whether the workitem is owned
     */
    public updateOwnedIds(id: number, isOwned: boolean) {
        this._ownedIds[id] = isOwned;
    }

    /**
     * Get the current tree data
     *
     * @return Current tree data
     */
    public getTreeData(): IProductBacklogTreeData {
        // Owned ids in treeData are stale, update it before returning
        this._treeData.ownedIds = this.getOwnedWorkItemIds() || [];

        return this._treeData;
    }

    /**
     *  Get list of owned work items ids
     */
    public getOwnedWorkItemIds(): number[] {
        return Object.keys(this._ownedIds).filter(id => this._ownedIds[id]).map(id => Number(id));
    }

    /** 
     * Get the current work item ids
     *
     * @return Array of work item ids
     */
    public getWorkItemIds(): number[] {
        return this._treeData.targetIds;
    }

    /**
     * Change workitemId
     * 
     * @param oldId oldId
     * @param newId newId
     */
    public changeWorkItemId(oldId: number, newId: number) {

        Diag.Debug.assertParamIsNumber(oldId, "oldId");
        Diag.Debug.assertParamIsNumber(newId, "newId");

        var index = this.getWorkItemTreeIndex(oldId);

        // this event need to be raised before the update so consumers can lookup the oldId
        this._raiseIdChange({
            oldId: oldId,
            newId: newId
        });

        // update the tree data
        this._treeData.targetIds[index] = newId;

        this._orderId[newId] = this._orderId[oldId];
        this._visibleOrderId[newId] = this._visibleOrderId[oldId];
        this._ownedIds[newId] = this._ownedIds[oldId];

        delete this._orderId[oldId];
        delete this._visibleOrderId[oldId];
        delete this._ownedIds[oldId];

        this._raiseRefresh({
            selectedWorkItemId: newId,
        });
    }

    /**
     *     Given a tree index this will return the top most ancestor of the work item at that index. Note that it is possible for
     *     the index provided to be its own root ancestor (this would mean it is already a root node).
     * 
     * @param index The tree index of the work item whose ancestor we are looking for
     */
    public getRootAncestorTreeIndex(index: number) {

        var rootAncestorIndex,
            ancestorWorkItemId;

        while (rootAncestorIndex === undefined) {
            ancestorWorkItemId = this.getParentOfWorkItemAtTreeIndex(index);

            if (ancestorWorkItemId === 0) {
                rootAncestorIndex = index;
            }
            else {
                index = this.getWorkItemTreeIndex(ancestorWorkItemId);
            }
        }

        return rootAncestorIndex;
    }

    /**
     * Return the index of the first leaf element in a workitem subTree
     * 
     * @param index the index of the workitem
     */
    public getFirstLeafTreeIndex(index: number) {

        Diag.Debug.assertParamIsNumber(index, "index");

        var i, l,
            sourceIds = this._treeData.sourceIds;
        for (i = index, l = sourceIds.length; i < l; i++) {
            if (this.getDescendantCount(this.getWorkItemIdAtTreeIndex(i)) === 0) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Return the index of the Last leaf element in a workitem subTree
     * 
     * @param index the index of the workitem
     */
    public getLastLeafTreeIndex(index: number) {

        Diag.Debug.assertParamIsNumber(index, "index");

        return index + this.getDescendantCount(this.getWorkItemIdAtTreeIndex(index));
    }

    /**
     * Return the workItemId of the Last leaf element in a workitem subTree
     * 
     * @param id the id of the workitem
     */
    public getLastLeafWorkItemId(id: number) {

        Diag.Debug.assertParamIsNumber(id, "workItemId");
        var indexOfLeafElement = this.getLastLeafTreeIndex(this.getWorkItemTreeIndex(id));
        return this.getWorkItemIdAtTreeIndex(indexOfLeafElement);
    }

    /**
     * Return index in tree datasource for workitemId
     * 
     * @param workitemId workitemId
     */
    public getWorkItemTreeIndex(workitemId: number) {

        var order = this.getWorkItemOrder(workitemId);

        // Check that we have an order before we subtract from it because we want to returned
        // undefined not NaN when the index could not be found.
        if (order !== undefined) {
            order -= 1;
        }

        return order;
    }

    /**
     * Return index in tree datasource for workitemId
     * 
     * @param workitemId workitemId
     *
     * @returns Order of work item id
     */
    public getWorkItemOrder(workitemId: number): number {

        return this._orderId[workitemId];
    }

    /**
     * Gets the list of child work item ids for a given work item.
     * That is, the direct children of a workitem excluding descendants beyond the first level.
     *
     * @param workItemId Work item id
     * @returns The list of work item ids
     */
    public getChildrenWorkItemIds(workItemId: number): number[] {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var targetIds = this._treeData.targetIds;
        var sourceIds = this._treeData.sourceIds;
        var workItemIds: number[] = [];
        var index = 0, count = 0;

        if (workItemId === 0) {
            index = 0;
            count = targetIds.length;
        }
        else {
            var workItemDataIndex = this.getWorkItemTreeIndex(workItemId);
            if (workItemDataIndex === undefined) {
                return null;
            }
            index = workItemDataIndex + 1;
            count = this.getDescendantCount(workItemId);
        }

        for (var i = index, l = index + count; i < l; i += (1 + this.getDescendantCount(targetIds[i]))) {
            Diag.Debug.assert(sourceIds[i] === workItemId, "Expected current item to be an immediate child of the parent");
            workItemIds.push(targetIds[i]);
        }

        return workItemIds;
    }

    /**
     * Gets the list of child work item ids for a given work item
     * 
     * @param workItemId Work item id
     * @return The list of work item ids
     */
    public getDescendantWorkItemIds(workItemId: number): any[] {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var index = this.getWorkItemTreeIndex(workItemId) + 1,
            count = this.getDescendantCount(workItemId);

        return this._treeData.targetIds.slice(index, index + count);
    }

    /**
     * Get the total number of children of as workitem
     * 
     * @param workItemId The ID of the work item to get the number of children for
     * @return 
     */
    public getDescendantCount(workItemId: number): number {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        return this._descendantCountMap[workItemId] || 0;
    }

    /**
     * Get the source id (parent) of a workitem in order location
     * 
     * @param order 1 based order of a workitem
     */
    public getParentWorkItemId(order: number): number {

        Diag.Debug.assertParamIsNumber(order, "order");

        return this.getParentOfWorkItemAtTreeIndex(order - 1);
    }

    /**
     * Get the source id of a workitem
     * 
     * @param workItemId 
     */
    public getParentIdFromWorkItemId(workItemId: number): number {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var treeIndex = this.getWorkItemTreeIndex(workItemId);
        return workItemId && treeIndex != null ? this.getParentOfWorkItemAtTreeIndex(treeIndex) : null;
    }

    /**
     * Get the source id (realParent) of a workitem in index location
     * 
     * @param index tree index of a workitem
     */
    public getRealParentId(index: number): number {

        return this._hasRealParentIds ? this._treeData.realParentIds[index] : 0;
    }

    /**
     * Get the source id (parent) of a workitem in index location
     * 
     * @param index tree index of a workitem
     */
    public getParentOfWorkItemAtTreeIndex(index: number): number {

        Diag.Debug.assertParamIsNumber(index, "index");

        return this._treeData.sourceIds[index] || 0;
    }

    /**
     * Get the parent of a workitem in index location
     * 
     * @param index tree index of a workitem
     */
    public getParentIndexFromTreeIndex(index: number): number {

        Diag.Debug.assertParamIsNumber(index, "index");

        var parentId = this.getParentOfWorkItemAtTreeIndex(index),
            parentIndex = parentId !== 0 ? this.getWorkItemTreeIndex(parentId) : -1;

        return parentIndex;
    }

    /**
     * Get the Previous Id of a workitem in order location.
     * 
     * @param order 
     *   1 based order of a workitem, or 0 to indicate the beginning of the list.
     * 
     */
    public getPrevWorkItemId(order: number): number {
        Diag.Debug.assertParamIsNumber(order, "order");

        var i,
            sourceIds = this._treeData.sourceIds,
            parentId = this.getParentWorkItemId(order);

        // scan backward for the first element with the same parent then it is the previous sibling
        for (i = order - 2; i >= 0; i -= 1) {
            if (sourceIds[i] === parentId) {
                return this._treeData.targetIds[i];
            }
        }
        return 0;
    }

    /**
     * Get the Next Id of a workitem in order location.
     * 
     * @param order 
     *   1 based order of a workitem, or 0 to indicate the end of the list.
     * 
     */
    public getNextWorkItemId(order: number): number {
        Diag.Debug.assertParamIsNumber(order, "order");

        var i, l,
            sourceIds = this._treeData.sourceIds,
            parentId = this.getParentWorkItemId(order);

        // scan forward for the first element with the same parent then it is the next sibling
        for (i = order, l = sourceIds.length; i < l; i += 1) {
            if (sourceIds[i] === parentId) {
                return this._treeData.targetIds[i];
            }
        }
        return 0;
    }

    /**
     * Get the id of a workitem in order location
     * 
     * @param order 1 based order of a workitem
     */
    public getWorkItemIdAtOrder(order: number): number {
        Diag.Debug.assertParamIsNumber(order, "order");

        return this.getWorkItemIdAtTreeIndex(order - 1);
    }

    /**
     * Get the id of a workitem in index location
     * 
     * @param index 0 based index of a workitem
     */
    public getWorkItemIdAtTreeIndex(index: number): number {
        Diag.Debug.assertParamIsNumber(index, "index");

        return this._treeData.targetIds[index] || 0;
    }

    /**
     * return the maximum element order in tree data
     */
    public getMaxOrder() {

        return this._treeData.targetIds.length;
    }

    public normalizeOrder(order) {

        var itemsNumber = this._treeData.targetIds.length;

        if (order < 1) {
            order = 1;
        }
        else if (order > itemsNumber) {
            order = itemsNumber + 1; // set any order value outside the range to end of orders
        }
        return order;
    }

    /**
     * Get number of elements in the tree
     */
    public getItemsCount(): number {
        return this._treeData && this._treeData.targetIds && this._treeData.targetIds.length || 0;
    }

    /**
     * Add a new grouping row 
     */
    public addGroupingItem(id: number, parentId?: number, refreshGrid: boolean = true, order?: number) {
        this._addWorkItemInternal(id, order ? order : this.getMaxOrder() + 1, null, parentId, refreshGrid);
    }

    /**
     * Adds a new work item
     * 
     * @param workItemId The id of the work item to add
     * @param order order in the tree data.  Not used when adding a child item.
     * @param workItem optional workitem object
     * @param parentId Optional: ID of the parent work item.
     * @param refreshGrid If true, refresh the grid. If false,the caller will need to refresh manually
     */
    public addWorkItem(workItemId: number, order: number, workItem?: WITOM.WorkItem, parentId?: number, refreshGrid: boolean = true) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");
        Diag.Debug.assertParamIsNumber(order, "order");
        Diag.Debug.assertIsNotNull(this._treeData, "_treeData is null");
        Diag.Debug.assert(workItemId > 0 || Boolean(workItem), "cannot supply new workitem without the workitem parameter");

        this._addWorkItemInternal(workItemId, order, workItem, parentId, refreshGrid)
    }

    /**
     * Remove the work item.
     * 
     * @param workItemId ID of the work item to remove.
     * @param refreshGrid If true, refresh the grid. If false,the caller will need to refresh manually
     */
    public removeWorkItem(workItemId: number, refreshGrid: boolean = true) {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var index = this.getWorkItemTreeIndex(workItemId),
            parentIndex,
            treeSize;

        // If the work item was not found, do nothing.
        if (index === undefined) {
            return;
        }

        parentIndex = this.getParentIndexFromTreeIndex(index);
        treeSize = this.getDescendantCount(workItemId) + 1;

        // Delete items from the owned array first before we remove it from treeData
        delete this._ownedIds[workItemId];
        let descendentWorkItemIds = this.getDescendantWorkItemIds(workItemId) || [];
        for (let id of descendentWorkItemIds) {
            delete this._ownedIds[id];
        }

        // Update the work items parents count of children to reflect the removal of the work item.
        this._updateChildrenCounts(index, treeSize * -1);

        // Remove the items tree from the datasource arrays
        this._treeData.sourceIds.splice(index, treeSize);
        this._treeData.linkIds.splice(index, treeSize);
        this._treeData.targetIds.splice(index, treeSize);
        if (this._hasRealParentIds) {
            this._treeData.realParentIds.splice(index, treeSize);
        }

        // Refresh the data sets and let the listeners know a work item has been removed.
        this._refreshDataSets();
        this._raiseRemovedItem({
            workItemIndex: index,
            parentWorkItemIndex: parentIndex,
            treeSize: treeSize,
            workItemId: workItemId
        });

        if (refreshGrid) {
            this._raiseRefresh({ selectedWorkItemId: workItemId });
        }
    }

    /**
     * Remove the work items and refresh the grid.
     * 
     * @param workItemIds IDs of the work items to be removed.
     */
    public removeWorkItems(workItemIds: number[]) {

        for (var j = 0, len = workItemIds.length; j < len; j++) {
            this.removeWorkItem(workItemIds[j], false);
        }

        // Refresh the grid once all the workitems have been removed
        this._raiseRefresh({});
    }

    /**
     * Get an array of ancestors of the node at the given index
     * 
     * @param index The index to start from (this will not be included in the array)
     * @return An array of ancestor indexes ordered from nearest to furthest
     */
    public getAncestorIndexes(index: number): number[] {

        Diag.Debug.assertParamIsNumber(index, "index");

        var ancestors: number[] = [];

        index = this.getParentIndexFromTreeIndex(index);

        while (index !== -1 && index !== undefined) {
            ancestors.push(index);
            index = this.getParentIndexFromTreeIndex(index);
        }

        return ancestors;
    }

    /** Reparent work items to a new parent. All work items will be added after the current children of the new parent
     *
     * @param workItemIds Work item ids to be reparented
     * @param newParentId Id of new parent
     * @param refresh Indicated whether a refresh event should be triggered
     * @param shouldReorder Should the work item be reordered
     */
    public reparentWorkItems(workItemIds: number[], newParentId: number, refresh: boolean = true, shouldReorder: boolean = true) {
        var parentsChildren = this.getChildrenWorkItemIds(newParentId);

        this.moveWorkItems({
            workItemIds: workItemIds,
            targetLocation: {
                parentId: newParentId,
                previousId: (parentsChildren && parentsChildren.length) ? parentsChildren[parentsChildren.length - 1] : null,
                nextId: null
            }
        },
            shouldReorder,
            refresh);
    }

    /**
     * Move work items to a new location
     *
     * @param effect Object describing the work items to be moved and the target location
     * @param performReorder Value indicating whether the items' order should be updated. Defaults to true.
     * @param refresGrid Value indicating whether the grid should be updated. Defaults to true.
     * @param focusOnFirstMovedItem Value indicating weather to scroll the first moved item into view, if not already in view.
     */
    public moveWorkItems(effect: IWorkItemMoveEffect, performReorder: boolean = true, refreshGrid: boolean = true, focusOnFirstMovedItem: boolean = false) {
        Diag.Debug.assertParamIsObject(effect, "effect");

        var eventArgs: Events.IWorkItemsMovedEventArgs = {
            targetLocation: effect.targetLocation,
            workItemIds: effect.workItemIds,
            workItemIdsToReparent: [],
            performReorder: performReorder,
            treeChanges: [],
            perfScenario: effect.perfScenario
        };

        // If no reference element is given, move to very first index
        var insertionIndex: number = 0;

        // Figure out the actual insertion index
        var target = effect.targetLocation;
        if (target.parentId) {
            // Insert as last child of parent
            insertionIndex = this.getWorkItemTreeIndex(target.parentId) + (this._descendantCountMap[effect.targetLocation.parentId] || 0) + 1;
        }

        if (target.previousId !== null) {
            insertionIndex = this.getWorkItemTreeIndex(target.previousId) + (this._descendantCountMap[effect.targetLocation.previousId] || 0) + 1;
        } else if (target.nextId !== null) {
            insertionIndex = this.getWorkItemTreeIndex(target.nextId);
        }

        // Move each included work item
        for (let workItemId of effect.workItemIds) {
            let sourceTreeSize = this.getDescendantCount(workItemId) + 1;

            let sourceIndex = this.getWorkItemTreeIndex(workItemId);
            let sourceAncestors = this.getAncestorIndexes(sourceIndex);

            let targetAncestors = [];
            if (target.parentId) {
                let immediateParentIndex = this.getWorkItemTreeIndex(target.parentId);
                targetAncestors = [immediateParentIndex].concat(this.getAncestorIndexes(immediateParentIndex));
            }

            // Update the children count array
            for (let i = 0, l = sourceAncestors.length; i < l; i += 1) {
                let ancestorWorkItemId = this.getWorkItemIdAtTreeIndex(sourceAncestors[i]);

                if (this._descendantCountMap.hasOwnProperty(ancestorWorkItemId)) {
                    this._descendantCountMap[ancestorWorkItemId] -= sourceTreeSize;

                    if (this._descendantCountMap[ancestorWorkItemId] === 0) {
                        delete this._descendantCountMap[ancestorWorkItemId];
                    }
                }
            }

            for (let i = 0, l = targetAncestors.length; i < l; i += 1) {
                let ancestorWorkItemId = this.getWorkItemIdAtTreeIndex(targetAncestors[i]);

                if (this._descendantCountMap.hasOwnProperty(ancestorWorkItemId)) {
                    this._descendantCountMap[ancestorWorkItemId] += sourceTreeSize;
                }
                else {
                    this._descendantCountMap[ancestorWorkItemId] = sourceTreeSize;
                }
            }

            if (this._treeData.sourceIds[sourceIndex] !== target.parentId) {
                eventArgs.workItemIdsToReparent.push(workItemId);
            }

            // Change the parent of the work item that is being moved prior to reordering because it is easier to find
            this._treeData.sourceIds[sourceIndex] = effect.targetLocation.parentId;
            this._treeData.linkIds[sourceIndex] =
                effect.targetLocation.parentId !== 0 ? ProductBacklogDataManager.CHILD_LINKTYPE_ID : 0;
            if (this._hasRealParentIds && effect.targetLocation.parentId) {
                // If reparenting, then change the real parent id of the work item being moved to the new parent id.
                this._treeData.realParentIds[sourceIndex] = effect.targetLocation.parentId;
            }

            // Remove the item at the sourceIndex and insert it at the newIndex for all data source arrays
            Utils_Array.reorder(this._treeData.sourceIds, sourceIndex, insertionIndex, sourceTreeSize);
            Utils_Array.reorder(this._treeData.linkIds, sourceIndex, insertionIndex, sourceTreeSize);
            Utils_Array.reorder(this._treeData.targetIds, sourceIndex, insertionIndex, sourceTreeSize);
            if (this._hasRealParentIds) {
                Utils_Array.reorder(this._treeData.realParentIds, sourceIndex, insertionIndex, sourceTreeSize);
            }

            eventArgs.treeChanges.push({
                oldTreeIndex: sourceIndex,
                newTreeIndex: insertionIndex,
                treeSize: sourceTreeSize,
                affectedSourceAncestorIndexes: sourceAncestors,
                affectedTargetAncestorIndexes: targetAncestors
            });

            // Need to do this for each work item, otherwise we cannot reliably translate work item ids to indices
            this._refreshDataSets();

            if (insertionIndex <= sourceIndex) {
                // Insert next item at next position           
                insertionIndex += sourceTreeSize;
            }
        }

        this._raiseMoveItems(eventArgs);

        let options = {};
        if (focusOnFirstMovedItem === true) {
            options = { selectedWorkItemId: effect.workItemIds[0] };
        }

        if (refreshGrid) {
            this._raiseRefresh(options);
        }
    }

    /**
     *     Refreshes the grid with the current data.You typically would call this after making a sequence of operations
     *     that do not refresh the grid.
     */
    public refresh() {
        this._raiseRefresh({});
    }

    /**
     * Returns true if the work item is a leaf node and false otherwise.
     * 
     * @param workItemId workItemId
     * @return 
     */
    public isLeafNode(workItemId: number): boolean {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        return this.getDescendantCount(workItemId) === 0;
    }

    /**
     * Returns true if the work item is a root node and false otherwise.
     * 
     * @param workItemId workItemId
     * @return 
     */
    public isRootNode(workItemId: number): boolean {
        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var index = this.getWorkItemTreeIndex(workItemId),
            parentId = (index === undefined) ? -1 : this.getParentOfWorkItemAtTreeIndex(index);

        // If there is no parent, then this is a root node.
        return parentId === 0;
    }

    /**
     * Lookup the root node work item ID for the provided work item id by walking up the tree.
     * 
     * @param workItemId Work item ID of the work item to look up the root node parent id for.
     * @return 
     */
    public getRootWorkItemId(workItemId: number): number {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        var currentWorkItemId,
            index,
            parentId = workItemId;

        // Walk up the tree until we hit the work item with no parent.
        do {
            currentWorkItemId = parentId;
            index = this.getWorkItemTreeIndex(currentWorkItemId);

            // If the work item is not in the grid, return undefined.
            if (index === undefined) {
                currentWorkItemId = undefined;
                break;
            }

            parentId = this.getParentOfWorkItemAtTreeIndex(index);
        } while (parentId !== 0);

        return currentWorkItemId;
    }

    /**
     *  Attach a handler for the EVENT_REFRESH event. 
     * 
     * @param handler The handler to attach
     */
    public attachRefresh(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(ProductBacklogDataManager.EVENT_REFRESH, <any>handler);
    }

    /**
     * Remove a handler for the EVENT_REFRESH event
     * 
     * @param handler The handler to remove
     */
    public detachRefresh(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(ProductBacklogDataManager.EVENT_REFRESH, <any>handler);
    }

    /**
     *  Attach a handler for the EVENT_NEW_ITEM event. 
     * 
     * @param handler The handler to attach
     */
    public attachNewItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(ProductBacklogDataManager.EVENT_NEW_ITEM, <any>handler);
    }

    /**
     * Remove a handler for the EVENT_NEW_ITEM event
     * 
     * @param handler The handler to remove
     */
    public detachNewItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(ProductBacklogDataManager.EVENT_NEW_ITEM, <any>handler);
    }

    /**
     *  Attach a handler for the EVENT_MOVE_ITEMS event. 
     * 
     * @param handler The handler to attach
     */
    public attachMoveItems(handler: IProductBacklogDataManagerEventHandler<Events.IWorkItemsMovedEventArgs>) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(ProductBacklogDataManager.EVENT_MOVE_ITEMS, handler);
    }

    /**
     * Remove a handler for the EVENT_MOVE_ITEMS event
     * 
     * @param handler The handler to remove
     */
    public detachMoveItems(handler: IProductBacklogDataManagerEventHandler<Events.IWorkItemsMovedEventArgs>) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(ProductBacklogDataManager.EVENT_MOVE_ITEMS, handler);
    }

    /**
     *  Attach a handler for the EVENT_ID_CHANGE event. 
     * 
     * @param handler The handler to attach
     */
    public attachIdChange(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(ProductBacklogDataManager.EVENT_ID_CHANGE, <any>handler);
    }

    /**
     * Remove a handler for the EVENT_ID_CHANGE event
     * 
     * @param handler The handler to remove
     */
    public detachIdChange(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(ProductBacklogDataManager.EVENT_ID_CHANGE, <any>handler);
    }

    /**
     * Attach a handler for the removed item event. 
     * 
     * @param handler 
     * The handler to attach.  This will be invoked with an argument in the following format:
     *   {
     *     workItemIndex: index,
     *     treeSize: treeSize
     *   }
     * 
     */
    public attachRemovedItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(ProductBacklogDataManager.EVENT_REMOVED_ITEM, <any>handler);
    }

    /**
     * Remove a handler for the removed item event.
     * 
     * @param handler The handler to remove
     */
    public detachRemovedItem(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(ProductBacklogDataManager.EVENT_REMOVED_ITEM, <any>handler);
    }

    public getWorkItemVisibleOrder(workItemId: number): number {
        return this._visibleOrderId[workItemId] || null;
    }

    public getTotalRootLevelItems(): number {
        return this._totalRootLevelItems;
    }

    /**
     * Get workitem index from visible order
     * 
     * @param order The order of the workitem
     * @return Index of the workitem
     */
    public getWorkItemIndexFromVisibleOrder(order: number): number {
        var index: number;
        $.each(this._visibleOrderId, (id, visibleOrder) => {
            if (visibleOrder === order) {
                index = this.getWorkItemTreeIndex(id);
                return false;
            }
        });
        return index;
    }

    /**
     * Get workitem index from order (Not valid in new backlog navigation)
     * 
     * @param order The order of the workitem
     * @return Index of the workitem
     */
    public getWorkItemIndexFromOrder(order: number): number {
        var index: number;
        $.each(this._orderId, (id, orderNumber) => {
            if (orderNumber === order) {
                index = this.getWorkItemTreeIndex(id);
                return false;
            }
        });
        return index;
    }

    public dispose() {
        if (this._events) {
            this._events.unsubscribeAll();
            this._events = null;
        }

        this._treeData = null;
        this._orderId = null;
        this._visibleOrderId = null;
        this._descendantCountMap = null;
        this._hasRealParentIds = null;
        this._ownedIds = null;
        this._totalRootLevelItems = null;
    }

    private _addWorkItemInternal(workItemId: number, order: number, workItem?: WITOM.WorkItem, parentId?: number, refreshGrid: boolean = true) {
        var sourceId = 0,
            linkId = 0,
            index = 0;

        // If the parent ID was not provided, add the item at the provided order.
        if (!parentId) {
            index = this.normalizeOrder(order) - 1; // convert to index

            // get the source & link ids of the element at the index location so new element has the same place in tree
            sourceId = this._treeData.sourceIds[index] || 0;
            linkId = this._treeData.linkIds[index] || 0;
        }
        else {
            // Parent ID was provided, if order is present determine the correct index to insert the new child, otherwise
            // insert the work item as the last child of the parent.
            Diag.Debug.assertParamIsNumber(parentId, "parentId");

            if (order > 0) {
                $.each(this.getDescendantWorkItemIds(parentId), (i, childWorkItemId) => {
                    var childOrder = this.getWorkItemOrder(childWorkItemId);
                    if (childOrder > order) {
                        index = this.getWorkItemTreeIndex(parentId) + i + 1;
                        return false;
                    }
                });
            }

            if (index === 0) {
                index = this.getLastLeafTreeIndex(this.getWorkItemTreeIndex(parentId)) + 1;
            }

            sourceId = parentId;
            linkId = ProductBacklogDataManager.CHILD_LINKTYPE_ID;
        }

        this._treeData.sourceIds.splice(index, 0, sourceId);
        this._treeData.linkIds.splice(index, 0, linkId);
        this._treeData.targetIds.splice(index, 0, workItemId);
        if (this._hasRealParentIds) {
            this._treeData.realParentIds.splice(index, 0, sourceId);
        }
        this._updateChildrenCounts(index, 1);

        this._refreshDataSets();

        this._raiseNewItem({
            workItemId: workItemId,
            workItem: workItem
        });

        if (refreshGrid) {
            this._raiseRefresh({ selectedWorkItemId: workItemId });
        }
    }

    /**
     * Build the calculated datasources bases on the _treeData
     */
    private _refreshDataSets() {
        var count = 0,
            orderLookup: number[] = [],
            visibleOrderLookup: number[] = [];

        // Build the order lookup object
        var targetIds = this._treeData.targetIds;
        var sourceIds = this._treeData.sourceIds;
        for (let i = 0, l = targetIds.length; i < l; i += 1) {
            if (!sourceIds[i]) {
                visibleOrderLookup[targetIds[i]] = ++count;
            }
            orderLookup[targetIds[i]] = i + 1; // save the workitem order id
        }

        this._orderId = orderLookup;
        this._visibleOrderId = visibleOrderLookup;
        this._totalRootLevelItems = count;
    }

    /**
     * Update children counts for the ancestor of index
     * 
     * @param index index in tree data source
     * @param incrementValue Value to increment the child counts by.
     */
    private _updateChildrenCounts(index: number, incrementValue: number) {

        Diag.Debug.assertParamIsNumber(index, "index");
        Diag.Debug.assertParamIsNumber(incrementValue, "incrementValue");

        var sourceIds = this._treeData.sourceIds,
            parentElement = sourceIds[index], // get the parent workitem
            childrenCount = this._descendantCountMap;

        while (parentElement !== 0) { // check if it has a parent
            // increase the tree size by the increment value.
            childrenCount[parentElement] = (childrenCount[parentElement] || 0) + incrementValue;

            index = this.getWorkItemTreeIndex(parentElement);
            parentElement = sourceIds[index];
        }
    }

    /**
     * Notifies listeners of refresh
     * 
     * @param args args
     */
    private _raiseRefresh(args: IRefreshProductBacklogGridArgs) {

        Diag.Debug.assertParamIsObject(args, "args");

        this._events.invokeHandlers(ProductBacklogDataManager.EVENT_REFRESH, this, args);
    }

    /**
     * Notifies listeners of NewItem
     * 
     * @param args args
     */
    private _raiseNewItem(args?: any) {

        Diag.Debug.assertParamIsObject(args, "args");

        this._events.invokeHandlers(ProductBacklogDataManager.EVENT_NEW_ITEM, this, args);
    }

    /**
     * Notifies listeners of MoveItems
     * 
     * @param args Arguments to pass to event handlers
     */
    private _raiseMoveItems(eventArgs: Events.IWorkItemsMovedEventArgs) {
        Diag.Debug.assertParamIsObject(eventArgs, "args");

        this._events.invokeHandlers(ProductBacklogDataManager.EVENT_MOVE_ITEMS, this, eventArgs);
    }

    /**
     * Notifies listeners of IdChange
     * 
     * @param args args
     */
    private _raiseIdChange(args?: any) {

        Diag.Debug.assertParamIsObject(args, "args");

        this._events.invokeHandlers(ProductBacklogDataManager.EVENT_ID_CHANGE, this, args);
    }

    /**
     * Notifies listeners of that a work item was removed.
     * 
     * @param args args
     */
    private _raiseRemovedItem(args?: any) {

        Diag.Debug.assertParamIsObject(args, "args");

        this._events.invokeHandlers(ProductBacklogDataManager.EVENT_REMOVED_ITEM, this, args);
    }
}

VSS.initClassPrototype(ProductBacklogDataManager, {
    _events: null,
    _treeData: null,
    _orderId: null,
    _descendantCountMap: null
});

