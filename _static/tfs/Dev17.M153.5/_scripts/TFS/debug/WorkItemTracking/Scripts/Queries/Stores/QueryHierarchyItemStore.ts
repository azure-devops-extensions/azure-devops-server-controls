import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import { ExtendedQueryHierarchyItem } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import * as StoreBase from "VSS/Flux/Store";
import { Debug } from "VSS/Diag";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { PerformanceEvents } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { equals } from "VSS/Utils/String";
/**
 * Query hierarchy item data provider
 */
export interface IQueryHierarchyItemDataProvider {
    /**
     * Gets the status of the store.
     *
     * @returns True if data is available.
     */
    isLoaded(): boolean;

    /**
     * Check if the root level query folders have been loaded
     *
     * @returns True if data is available.
     */
    areRootFolderItemsLoaded(): boolean;

    /**
     * Checks if a specific item exists in the data store.
     *
     * @param idOrPath Query id or path.
     * @returns True if the query item exists in the data store.
     */
    itemExists(idOrPath: string): boolean;

    /**
     * Gets query item by its path
     *
     * @param idOrPath Query id or path.
     * @returns Query hierarchy item
     */
    getItem(idOrPath: string): ExtendedQueryHierarchyItem;

    /**
     * Gets the My Queries folder
     */
    getMyQueriesFolderItem(): ExtendedQueryHierarchyItem;

    /**
     * Gets the Shared Queries folder
     */
    getSharedQueriesFolderItem(): ExtendedQueryHierarchyItem;

    /**
     * Get root query folders
     */
    getRootFolderItems(): ExtendedQueryHierarchyItem[];
}

export class QueryHierarchyItemStore extends StoreBase.Store implements IQueryHierarchyItemDataProvider {

    private _idToIndexStore: IDictionaryStringTo<number>;
    private _pathToIndexStore: IDictionaryStringTo<number>;
    private _idToPathStore: IDictionaryStringTo<string>;
    private _items: ExtendedQueryHierarchyItem[];
    private _rootFolderItems: ExtendedQueryHierarchyItem[];

    constructor(actions: ActionsHub) {
        super();

        this._items = null;
        this._idToIndexStore = {};
        this._pathToIndexStore = {};
        this._idToPathStore = {};

        actions.InitializeQueryHierarchyItem.addListener((items: QueryHierarchyItem[]) => {
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_QUERYHIERARCHYITEMSTORE_INITIALIZEQUERYHIERARCHYITEM, true);
            const extendedItems = this._createExtendedQueryHierarchyItems(items);
            this._onAdd(extendedItems);
            PerfScenarioManager.addSplitTiming(PerformanceEvents.QUERIESHUB_STORES_QUERYHIERARCHYITEMSTORE_INITIALIZEQUERYHIERARCHYITEM, false);
        });

        actions.InitializeQueryRootHierarchyItem.addListener((items: QueryHierarchyItem[]) => {
            const extendedItems = this._createExtendedQueryHierarchyItems(items);
            this._rootFolderItems = extendedItems;
        });

        actions.QueryFolderChildrenLoaded.addListener((queryFolder: QueryHierarchyItem) => {
            const items: ExtendedQueryHierarchyItem[] = [];
            const loadChildren = (queryItem: QueryHierarchyItem) => {
                const extendedFolderItem = this._createExtendedQueryHierarchyItem(queryItem);
                if (queryItem.isFolder) {
                    extendedFolderItem.isChildrenLoaded = (queryItem.hasChildren && queryItem.children && queryItem.children.length > 0);
                }

                items.push(extendedFolderItem);

                if (extendedFolderItem.hasChildren && extendedFolderItem.isChildrenLoaded) {
                    for (const childQueryItem of extendedFolderItem.children) {
                        loadChildren(childQueryItem);
                    }
                }
            };

            loadChildren(queryFolder);
            this._onAdd(items);
        });

        actions.QueryFolderEmptyContentLoaded.addListener((emptyContent: ExtendedQueryHierarchyItem) => {
            if (emptyContent && emptyContent.isEmptyFolderContext) {
                this._onAdd(emptyContent);
            }
        });

        actions.QueryFolderEmptyContentRemoved.addListener((emptyContent: ExtendedQueryHierarchyItem) => {
            if (emptyContent && emptyContent.isEmptyFolderContext) {
                this._onRemove(emptyContent);
            }
        });

        actions.QueryFolderDeleted.addListener((item) => {
            this._onRemove(item);
        });

        actions.QueryDeleted.addListener((item) => {
            this._onRemove(item);
        });

        actions.QueryItemCreated.addListener((item) => {
            this._onAdd(item);
        });

        actions.QueryItemUpdated.addListener((item) => {
            this._onAdd(item);
        });

        actions.QueryFavoriteEmptyContentAdded.addListener((emptyContent: ExtendedQueryHierarchyItem) => {
            if (emptyContent && emptyContent.isEmptyFolderContext) {
                this._onAdd(emptyContent);
            }
        });

        actions.QueryFavoriteEmptyContentRemoved.addListener((emptyContent: ExtendedQueryHierarchyItem) => {
            if (emptyContent && emptyContent.isEmptyFolderContext) {
                this._onRemove(emptyContent);
            }
        });
    }

    public isLoaded(): boolean {
        return this._items ? true : false;
    }

    public areRootFolderItemsLoaded(): boolean {
        return this._rootFolderItems && this._rootFolderItems.length > 0 ? true : false;
    }

    public getMyQueriesFolderItem(): ExtendedQueryHierarchyItem {
        if (this.areRootFolderItemsLoaded()) {
            const personalFolders = this._rootFolderItems.filter((item: ExtendedQueryHierarchyItem) => !item.isPublic && item.isFolder);
            if (personalFolders && personalFolders.length > 0) {
                return personalFolders[0];
            }
        }
        return null;
    }

    public getSharedQueriesFolderItem(): ExtendedQueryHierarchyItem {
        if (this.areRootFolderItemsLoaded()) {
            const sharedQueriesFolder = this._rootFolderItems.filter((item: ExtendedQueryHierarchyItem) => item.isPublic && item.isFolder);
            if (sharedQueriesFolder && sharedQueriesFolder.length > 0) {
                return sharedQueriesFolder[0];
            }
        }
        return null;
    }

    public itemExists(idOrPath: string): boolean {
        return this._itemExistById(idOrPath) || this._itemExistByPath(idOrPath);
    }

    public getItem(idOrPath: string): ExtendedQueryHierarchyItem {
        return this._getById(idOrPath) || this._getByPath(idOrPath);
    }

    public getRootFolderItems(): ExtendedQueryHierarchyItem[] {
        return this._rootFolderItems;
    }

    public getAll(): ExtendedQueryHierarchyItem[] {
        return this.isLoaded() ?
            Object.keys(this._idToIndexStore).map(key => this._items[this._idToIndexStore[key]]) :
            [];
    }

    private _getByPath(path: string): ExtendedQueryHierarchyItem {
        if (!this.isLoaded()) {
            return null;
        }

        path = QueryUtilities.convertPathForStore(path);

        const index = this._pathToIndexStore[path];

        if (typeof (index) === "undefined") {
            // index not found
            return null;
        } else {
            // index found
            Debug.assert(index < this._items.length, "QueryHierarchyItemStore: id index store out of range.");
            return this._items[index];
        }
    }

    private _getById(id: string): ExtendedQueryHierarchyItem {
        if (!this.isLoaded()) {
            return null;
        }

        const index = this._idToIndexStore[id.toLowerCase()];

        if (typeof (index) === "undefined") {
            // index not found
            return null;
        } else {
            // index found
            Debug.assert(index < this._items.length, "QueryHierarchyItemStore: id index store out of range.");
            return this._items[index];
        }

    }

    private _itemExistByPath(path: string): boolean {
        return this._getByPath(path) ? true : false;
    }

    private _itemExistById(id: string): boolean {
        return this._getById(id) ? true : false;

    }

    private _onAdd(items: ExtendedQueryHierarchyItem | ExtendedQueryHierarchyItem[]): void {
        if (!items) {
            return;
        }

        let itemsChanged = false;

        if (!this._items) {
            this._items = [];
            itemsChanged = true;
        }

        if (Array.isArray(items)) {
            for (const item of items) {
                itemsChanged = this._addItem(item) || itemsChanged;
            }
        }
        else {
            itemsChanged = this._addItem(items) || itemsChanged;
        }

        if (itemsChanged) {
            this.emitChanged();
        }
    }

    private _onRemove(items: ExtendedQueryHierarchyItem | ExtendedQueryHierarchyItem[]): void {
        if (!items || !this.isLoaded()) {
            return;
        }

        let itemsChanged = false;

        if (Array.isArray(items)) {
            for (const item of items) {
                itemsChanged = this._removeItem(item) || itemsChanged;
            }
        }
        else {
            itemsChanged = this._removeItem(items) || itemsChanged;
        }

        if (itemsChanged) {
            this.emitChanged();
        }
    }

    private _addItem(item: ExtendedQueryHierarchyItem): boolean {
        const id = item.id.toLowerCase();
        const itemPath = QueryUtilities.convertPathForStore(item.path);
        let index = this._items.length;

        const existingItem = this._getById(id);
        if (existingItem && !this._isEqual(item, existingItem)) {
            // Existing item found by query id and the item data is not the same
            index = this._idToIndexStore[id];

            // Overwrite the item data
            this._items[index] = item;

            // Update id to path mapping
            const oldPath = this._idToPathStore[id];
            if (oldPath !== undefined && oldPath !== itemPath) {
                delete this._pathToIndexStore[oldPath];
            }
            this._idToPathStore[id] = itemPath;

            // Update path lookup to the item index
            this._pathToIndexStore[itemPath] = index;

            //Update root folder items lookup if it is
            const myQueriesFolder = this.getMyQueriesFolderItem();
            if (myQueriesFolder && equals(myQueriesFolder.id, id, true) && !this._isEqual(item, myQueriesFolder)) {
                const index = this._rootFolderItems.findIndex((i: ExtendedQueryHierarchyItem) => !i.isPublic && i.isFolder);
                if (index > -1) {
                    this._rootFolderItems[index] = item;
                }
            }

            const sharedQueriesFolder = this.getSharedQueriesFolderItem();
            if (sharedQueriesFolder && equals(sharedQueriesFolder.id, id, true) && !this._isEqual(item, sharedQueriesFolder)) {
                const index = this._rootFolderItems.findIndex((i: ExtendedQueryHierarchyItem) => i.isPublic && i.isFolder);
                if (index > -1) {
                    this._rootFolderItems[index] = item;
                }
            }

            return true;
        } else if (!existingItem) {
            // No existing item found by query id. Meaning the same query item has never been added
            // If the same path exists, meaning the previous pointed item has been moved already
            this._items.push(item);
            this._idToIndexStore[id] = index;
            this._pathToIndexStore[itemPath] = index;
            this._idToPathStore[id] = itemPath;
            return true;
        }

        // We should not update item when the data is the same
        return false;
    }

    private _removeItem(item: ExtendedQueryHierarchyItem): boolean {
        const id = item.id.toLowerCase();
        const path = this._idToPathStore[id];
        const itemIndex = this._idToIndexStore[id];

        if (typeof (itemIndex) === "number") {
            // Found id index and remove it
            delete this._idToIndexStore[id];
            delete this._idToPathStore[id];
            delete this._pathToIndexStore[path];

            // Clear the items store. We never actually change the items array length
            if (itemIndex < this._items.length) {
                this._items[itemIndex] = null;
            }

            return true;
        }

        return false;
    }

    private _isEqual(currentItem: ExtendedQueryHierarchyItem, existingItem: ExtendedQueryHierarchyItem): boolean {
        return currentItem.path === existingItem.path
            && currentItem.name === existingItem.name
            && currentItem.wiql === existingItem.wiql
            && currentItem.isEmptyFolderContext === existingItem.isEmptyFolderContext
            && currentItem.hasChildren === existingItem.hasChildren
            && (currentItem.isChildrenLoaded === undefined || currentItem.isChildrenLoaded === existingItem.isChildrenLoaded) // If the children is not loaded dont mind checking.
            && (currentItem.isChildrenLoaded === undefined || ((currentItem.children && currentItem.children.length) === (existingItem.children && existingItem.children.length)))
            && (currentItem.isChildrenLoaded === undefined || this._isChildrenEqual(currentItem.children, existingItem.children));
    }

    // Checks only first level children equality.
    private _isChildrenEqual(currentItem: QueryHierarchyItem[], existingItem: QueryHierarchyItem[]) {
        let isEqual = true;

        if (currentItem && existingItem) {
            for (let i = 0; i < currentItem.length; i++) {
                isEqual = isEqual
                    && currentItem[i].name === existingItem[i].name
                    && currentItem[i].wiql === existingItem[i].wiql
                    && currentItem[i].path === existingItem[i].path;
            }
        }

        return isEqual;
    }

    private _createExtendedQueryHierarchyItem(item: QueryHierarchyItem): ExtendedQueryHierarchyItem {
        return item ? {
            ...item,
            isChildrenLoaded: undefined,
            isEmptyFolderContext: false
        } : null;
    }

    private _createExtendedQueryHierarchyItems(items: QueryHierarchyItem[]): ExtendedQueryHierarchyItem[] {
        return items ? items.map((item) => {
            return this._createExtendedQueryHierarchyItem(item);
        }) : null;
    }
}
