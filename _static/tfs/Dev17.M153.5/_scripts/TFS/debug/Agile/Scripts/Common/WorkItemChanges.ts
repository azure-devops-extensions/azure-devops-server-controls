/// <reference types="jquery" />
import Utils_String = require("VSS/Utils/String");
import { BacklogConfigurationService, IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import Diag = require("VSS/Diag");

/** Represents the location relative to other work items in hierarchy */
export interface ILocation {
    parentId: number;
    previousId: number;
    nextId: number;
}

export interface IItemHierarchy {
    nextSibling(workItemId: number): number;
    previousSibling(workItemId: number): number;
    parent(workItemId: number): number;
    children(workItemId: number): number[];
    /** Distance from root */
    depth(workItemId: number): number;
}

export type IWorkItemDataHierarchy = IItemDataHierarchy<IWorkItemHierarchyData>;

/** Represents the hierarchy of a given work item */
export interface IItemDataHierarchy<T> extends IItemHierarchy {
    getData(workItemId: number): T;
}

export interface ILocationEnumerator {
    getLocationsForExplicitReparent(previousId: number, workItemIds: number[]): ILocation[];

    getLocations(previousId: number, workItemIds: number[]): ILocation[];
}

/**
 * Enumerate possible drop locations when moving an item in a hierarchy, only evaluate tree structure
 */
export class LocationEnumerator implements ILocationEnumerator {
    private _itemHierarchy: IItemHierarchy;

    constructor(itemHierarchy: IItemHierarchy) {
        this._itemHierarchy = itemHierarchy;
    }

    public getLocationsForExplicitReparent(previousId: number, workItemIds: number[]): ILocation[] {
        var children = this._itemHierarchy.children(previousId);

        return [{
            parentId: previousId,
            previousId: (children && children.length && children[children.length - 1]) || null,
            nextId: null
        }];
    }

    public getLocations(previousId: number, workItemIds: number[]): ILocation[] {
        var locations: ILocation[] = [];

        if (previousId === 0) {
            var rootLevelItems = this._itemHierarchy.children(0);

            // Place item at top of the hierarchy
            locations.push({
                parentId: 0,
                previousId: null,
                nextId: rootLevelItems && rootLevelItems.length > 0 ? rootLevelItems[0] : null
            });

            return locations;
        }

        // Now find all the valid locations for this position
        var locations: ILocation[] = [];

        var childrenIds = this._itemHierarchy.children(previousId);

        // If a single item is selected and its the only child of 'previousId', then it cannot be reparented to its own parent.
        // If there are multiple items selected, then reparenting them to 'previousId' is a valid location.
        var isSingleChildTheItemBeingMoved = childrenIds && childrenIds.length === 1 &&
            workItemIds && workItemIds.length === 1 && childrenIds[0] === workItemIds[0];

        if (childrenIds && childrenIds.length && !isSingleChildTheItemBeingMoved) {
            // before the new parent's first child
            locations.push({
                parentId: previousId,
                previousId: null,
                nextId: childrenIds[0]
            });
        }
        else {
            if (!isSingleChildTheItemBeingMoved) { // its already a child of previousId
                // as a (new, first) child of the item
                locations.push({
                    parentId: previousId,
                    previousId: null,
                    nextId: null
                });
            }

            // Walk up the tree, evaluate locations under parents while walking up
            var currentId = previousId;
            do {
                var currentParentId = this._itemHierarchy.parent(currentId);
                var nextSiblingId = this._itemHierarchy.nextSibling(currentId) || null;
                locations.push({
                    parentId: currentParentId || 0,
                    previousId: currentId,
                    nextId: nextSiblingId
                });

                currentId = currentParentId;
            } while (currentParentId !== 0 && !nextSiblingId)
        }

        return locations;
    }
}

/** Interface representing the data returned by the Adapter Implementation */
export interface IWorkItemHierarchyData {
    id: number;
    type: string; // TODO NN: return null if not paged
    state: string; // TODO NN: Make sure this is always paged in - should return null if not paged
    isOwned: boolean;
}

export interface ILocationValidator {
    isValid(workItemIds: number[], locations: ILocation): boolean;
}

export class LocationValidator implements ILocationValidator {
    private _levelHelper: BacklogLevelHelper;
    private _itemHierarchy: IItemDataHierarchy<IWorkItemHierarchyData>

    constructor(
        topBacklogLevel: IBacklogLevelConfiguration,
        itemHierarchy: IItemDataHierarchy<IWorkItemHierarchyData>) {

        this._itemHierarchy = itemHierarchy;
        this._levelHelper = new BacklogLevelHelper(topBacklogLevel);
    }

    /** 
     * Checks if the location is a valid drop target for given workItemIds
     * @param workItemIds filtered workItemIds from current selection on grid
     * @param location drop target for current selection
     * @return true if the location is valid drop target for given workItemIds
     */
    public isValid(workItemIds: number[], location: ILocation): boolean {
        // The location is not a valid drop target if 
        // Any item in workItemIds is invalid or not paged
        // Any of the workItemIds is a parent for given location
        // Parent type is not valid for current selection
        // WorkItemIds are in sequential order and next/prev is in selection

        if (!workItemIds || workItemIds.length === 0) {
            return false;
        }

        var previousSiblingId = this._itemHierarchy.previousSibling(workItemIds[0]);
        var workItemData: IWorkItemHierarchyData = null;
        var isReparent = false;
        var isSelectionContiguous = true;
        var areAllItemsUnOwned = true;
        var areAllItemsOwned = true;

        // Creating workItemIdsMap for lookup
        var workItemIdsMap: IDictionaryNumberTo<boolean> = {};
        for (var id of workItemIds) {
            workItemIdsMap[id] = true;
        }

        for (var id of workItemIds) {
            if (id <= 0) {
                return false; // cannot move hidden/unparented/temporary rows
            }

            workItemData = this._itemHierarchy.getData(id);

            // Reorder/reparent is not available for unpaged items
            if (!workItemData || !workItemData.type) {
                return false;
            }

            // Check if location results in reparenting
            if (location.parentId !== this._itemHierarchy.parent(id)) {
                isReparent = true;
            }

            if (workItemData.isOwned) {
                areAllItemsUnOwned = false;
            }
            else {
                areAllItemsOwned = false;
            }

            // Check if selection is contiguous
            if (this._itemHierarchy.previousSibling(id) !== previousSiblingId) {
                isSelectionContiguous = false;
            }
            previousSiblingId = id;
        }

        // The location is invalid if selection is contiguous and target location falls inside the selection
        if (isSelectionContiguous && (workItemIdsMap[location.previousId] || workItemIdsMap[location.nextId])) {
            return false;
        }

        // Validate Reparent
        if (isReparent) {

            if (!this._isValidParentType(workItemData, location)) {
                // If current gesture is reparening, check if the parent type is valid. Invalid type hierarchy is not allowed via reparent
                // Since we only perform a type check, there is no need to validate all the workitems
                return false;
            }

            if (location.parentId) {
                // Any of the given workItemIds cannot be a parent of given location
                var parentId = location.parentId;
                do {
                    if (workItemIdsMap[parentId]) {
                        return false;
                    }
                    parentId = this._itemHierarchy.parent(parentId);
                } while (parentId);
            }
        }

        // Validate Reorder
        if (!areAllItemsUnOwned) {
            // Do we have any items we are reordering with?
            if (location.previousId || location.nextId) {
                var previousItem = location.previousId ? this._itemHierarchy.getData(location.previousId) : null;
                var nextItem = location.nextId ? this._itemHierarchy.getData(location.nextId) : null;

                // make sure all specified items are paged.
                if ((previousItem && !previousItem.type) || (nextItem && !nextItem.type)) {
                    return false;
                }

                // Update
                var itemLevel = this._levelHelper.getLevel(workItemData.type);
                var isPreviousItemLevelCompatible = previousItem &&
                    (this._levelHelper.getLevel(previousItem.type) === itemLevel);

                var isNextItemLevelCompatible = nextItem &&
                    (this._levelHelper.getLevel(nextItem.type) === itemLevel);

                var isItemTask = itemLevel === this._levelHelper.getRequirementLevel() + 1;

                if (!previousItem && nextItem) { ///// TOP
                    // if the next item is owned, it should be a compatible type so i can reorder without,
                    // if its not owned, i don't need to reorder its just a UI operation
                    // also tasks treated as unowned since they are not part of the ownership query. 
                    var taskLevel = this._levelHelper.getRequirementLevel() + 1;
                    if (nextItem.isOwned) {
                        if (!areAllItemsOwned ||
                            (!isNextItemLevelCompatible && this._levelHelper.getLevel(nextItem.type) !== taskLevel)) {
                            return false;
                        }
                    }
                }
                else if (previousItem && nextItem) { ////// MIDDLE
                    // of the items needs to be compatible
                    if ((!previousItem.isOwned || !isPreviousItemLevelCompatible) && (!nextItem.isOwned || !isNextItemLevelCompatible)) {
                        return false;
                    }
                    else if (!areAllItemsOwned && nextItem.isOwned) {
                        // A hybrid selection cannot go between two owned items
                        return false;
                    }
                }
                else { ////////////// BOTTOM
                    if (!previousItem.isOwned) {
                        return false; // cannot go below unowned items (unowned goes below owned)
                    }

                    if (!isItemTask && !isPreviousItemLevelCompatible) {
                        return false; // if you are a task you can always go to the bottom (from ordering perspective on the server, tasks go to bottom)
                    }
                }
                // there could be edge cases where we fail, but we should reorder in the UI and let the server return proper error.
            }
        }
        else {
            if (!isReparent || location.nextId) {
                // If all items are unowned, only reparenting as last child is valid
                return false;
            }
        }

        return true;
    }

    protected _isValidParentType(item: IWorkItemHierarchyData, location: ILocation): boolean {
        var itemLevel = this._levelHelper.getLevel(item.type);

        if (!location.parentId) {
            return itemLevel === this._levelHelper.getTopLevel(); // Moved to top level, must be same level as other root level items
        }

        var parent = this._itemHierarchy.getData(location.parentId);
        var parentLevel = this._levelHelper.getLevel(parent.type);

        if (itemLevel === parentLevel + 1) {
            // direct backlog level is supported
            return true;
        }

        if (itemLevel === parentLevel && itemLevel === this._levelHelper.getRequirementLevel()) {
            // Reparenting requirement to requirement, allowed if there is already a hierarchy
            var previousItem = location.previousId ? this._itemHierarchy.getData(location.previousId) : null;
            var nextItem = location.nextId ? this._itemHierarchy.getData(location.nextId) : null;

            var isPreviousItemLevelCompatible = previousItem &&
                (this._levelHelper.getLevel(previousItem.type) === itemLevel);

            var isNextItemLevelCompatible = nextItem &&
                (this._levelHelper.getLevel(nextItem.type) === itemLevel);

            return isPreviousItemLevelCompatible || isNextItemLevelCompatible;
        }

        return false;
    }
}

export class BacklogLevelHelper {
    public static ROOT_LEVEL: number = 1;

    // TODO
    private _backlogLevelMap: IDictionaryStringTo<number>;
    private _workItemLevelMap: IDictionaryStringTo<number>;
    private _requirementLevel: number;
    private _topLevel: number;

    constructor(topLevel?: IBacklogLevelConfiguration) {

        this._workItemLevelMap = {};
        this._backlogLevelMap = {};
        let allBacklogLevels = BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels();
        var level = 1;

        allBacklogLevels.forEach((backlogLevelConfiguration: IBacklogLevelConfiguration) => {
            this._backlogLevelMap[backlogLevelConfiguration.name.toLocaleUpperCase()] = level;

            backlogLevelConfiguration.workItemTypes.forEach(workItemType => {
                this._workItemLevelMap[workItemType.toLocaleUpperCase()] = level;
            });
            if (topLevel) {
                if (Utils_String.localeIgnoreCaseComparer(topLevel.name, backlogLevelConfiguration.name) === 0) {
                    this._topLevel = level;
                }
            }
            level++;
        });
        this._requirementLevel = level - 2;
    }

    /** 
     * return a level based on item type (where the item should be), 1 being top level (Epic), 2 is the next level (Feature) and so on, -1 = non backlog item
     */
    public getLevel(typeName: string): number {
        if (typeName && this._workItemLevelMap.hasOwnProperty(typeName.toLocaleUpperCase())) {
            return this._workItemLevelMap[typeName.toLocaleUpperCase()];
        }
        else return -1; // can't be a child or parent of any other backlog level;
    }

    /** Return level number for given backlog level name */
    public getLevelForBacklog(name: string): number {
        return name && this._backlogLevelMap.hasOwnProperty(name.toLocaleUpperCase()) && this._backlogLevelMap[name.toLocaleUpperCase()] || -1;
    }

    /** Return requirement level */
    public getRequirementLevel(): number {
        return this._requirementLevel;
    }

    /** Return level of top backlog level */
    public getTopLevel(): number {
        return this._topLevel;
    }
}

export interface ILocationSelector {
    select(workItemId: number[], locations: ILocation[]): ILocation;
}

export class LocationSelector implements ILocationSelector {
    constructor(private _itemHierarchy: IItemHierarchy) {
    }

    /** 
     * Selects the best location from a given set of locations in the following order
     * 1. Will prefer locations without reparent if possible
     * 2. Will prefer a location with the shallowest ancestor
     * @param workItemIds  Array of Work Item Ids
     * @param locations Array of locations
     */
    public select(workItemIds: number[], locations: ILocation[]): ILocation {

        Diag.Debug.assertIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertIsArray(locations, "locations");

        var allSelectedItemsHaveSameParent: boolean = true;
        var parentMap: IDictionaryNumberTo<boolean> = {};

        // put the first work item's parent id in the map
        if (workItemIds && workItemIds.length && workItemIds.length > 0) {
            parentMap[this._itemHierarchy.parent(workItemIds[0])] = true;
        }
        else {
            return null;
        }

        for (var id of workItemIds) {
            var parentId = this._itemHierarchy.parent(id);
            if (!parentMap[parentId]) {
                allSelectedItemsHaveSameParent = false;
                break;
            }
        }

        // Selected Items have the same parent. Prefer a reorder if such a location is available
        if (allSelectedItemsHaveSameParent) {
            var currentParentId = this._itemHierarchy.parent(workItemIds[0]);
            var locationsWithoutReparent = locations.filter(l => l.parentId === currentParentId);
            if (locationsWithoutReparent && locationsWithoutReparent.length) {
                return locationsWithoutReparent[0];
            }
        }

        // Selected Items do not have the same parent. Choose the shallowest ancestor
        var sortedLocationsByParentDepth = locations.sort(
            (location1, location2) => this._itemHierarchy.depth(location1.parentId) - this._itemHierarchy.depth(location2.parentId));

        return sortedLocationsByParentDepth[0];
    }
}

/** Interface representing the MultiSelect Filter */
export interface ISelectionFilter {
    filter(selectedWorkItemIds: number[]): number[];
}

/** Class for the filtering only the top level items out of the selected work items in multi-select scenario */
export class TopLevelItemsSelectionFilter implements ISelectionFilter {

    private _levelHelper: BacklogLevelHelper;
    private _itemHierarchy: IItemDataHierarchy<IWorkItemHierarchyData>;

    constructor(
        itemHierarchy: IItemDataHierarchy<IWorkItemHierarchyData>,
        private _pagingDelegate: ((workItemIds: number[], callBack: Function) => void)) {

        this._itemHierarchy = itemHierarchy;
        this._levelHelper = new BacklogLevelHelper();
    }

    /** 
     * This gets an array of work item ids, and spits out a filtered list of ids that are effectively going to 
     * partake in the reorder/reparent operation. (e.g.if a work item and its descendent is selected, descendent will be ignored). 
     * If the selected items are not valid for a reorder/reparent operation, this returns an empty array
     */
    public filter(selectedWorkItemIds: number[]): number[] {
        Diag.Debug.assertIsArray(selectedWorkItemIds, "selectedWorkItemIds");

        // for each selected item, add the item to a map [key: id, value: string]. 
        // Walk up its tree, if any of the items ancestors are in the selection, add the ancestor
        // In the end, check if the map contains items of the same level (handle BugsAs* behavior/ multiple work item types in the same level/category) . If yes, then return the items, else return []
        if (selectedWorkItemIds && selectedWorkItemIds.length > 0) {

            var filteredIdToLevelMap: IDictionaryNumberTo<number> = {};
            var ownedIds: number[] = [];  // need this to maintain ordering of ownedIds
            var unOwnedIds: number[] = [];  // need this to maintain ordering of unownedIds
            var processedIdsMap: IDictionaryNumberTo<boolean> = {}; // fast look up for the processedIds array to check if an item is present
            var selectedIdsMap: IDictionaryNumberTo<boolean> = {}; // fast look up if an item is present in the given array
            var requiredItemIds: IDictionaryNumberTo<boolean> = {};
            var idToAdd: number, parentId: number;

            // Collect all top level items for the given selection
            // build map of selected work items for fast look up
            for (var id of selectedWorkItemIds) {
                selectedIdsMap[id] = true;

                parentId = this._itemHierarchy.parent(id);
                idToAdd = id;
                while (parentId > 0) {
                    parentId = this._itemHierarchy.parent(id);
                    if (selectedIdsMap[parentId]) {
                        idToAdd = parentId;
                    }
                    id = parentId;
                }

                if (!requiredItemIds[idToAdd]) {
                    requiredItemIds[idToAdd] = true;
                }
            }

            var previousItemLevel: number;
            for (var id of selectedWorkItemIds) {
                var itemType = this._itemHierarchy.getData(id).type;
                if (!itemType || itemType === "") {
                    // issue a paging request
                    this._pagingDelegate(Object.keys(requiredItemIds).map(key => +key), () => { });
                    return [];
                }
                var itemLevel: number = this._levelHelper.getLevel(itemType);
                idToAdd = id;
                parentId = this._itemHierarchy.parent(id);

                // walk up the tree to see if ancestors are present in selection
                while (parentId > 0) {
                    parentId = this._itemHierarchy.parent(id);
                    if (selectedIdsMap[parentId]) {
                        itemType = this._itemHierarchy.getData(parentId).type;
                        itemLevel = this._levelHelper.getLevel(itemType);
                        idToAdd = parentId;
                    }
                    id = parentId;
                }
                filteredIdToLevelMap[idToAdd] = itemLevel;
                previousItemLevel = itemLevel;
                if (!processedIdsMap[idToAdd]) {
                    // If selection is hybrid, we move unowned items to end while preserving the order of owned items
                    if (this._itemHierarchy.getData(idToAdd).isOwned) {
                        ownedIds.push(idToAdd);
                    }
                    else {
                        unOwnedIds.push(idToAdd);
                    }
                    processedIdsMap[idToAdd] = true;
                }
            }

            for (var key of Object.keys(filteredIdToLevelMap)) {
                var currentItemLevel = filteredIdToLevelMap[key];
                if (previousItemLevel !== currentItemLevel) {
                    return [];
                }
                previousItemLevel = currentItemLevel;
            }

            return ownedIds.concat(unOwnedIds);
        }
        else {
            return [];
        }
    }
}
