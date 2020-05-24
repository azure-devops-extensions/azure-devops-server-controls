import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import { QueryHierarchyCIEvents } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";
import Diag = require("VSS/Diag");
import { Project, createError } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { Exceptions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { isVisualizeFollowsEnabled } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import Q = require("q");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import TFS_Wit_Contracts = require("TFS/WorkItemTracking/Contracts");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import WITWebApi = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi");

function Error_queryItemAlreadyExist(name: string): Error {
    return createError(Utils_String.format(Resources.QueryItemAlreadyExist, name), { name: Exceptions.QueryItemAlreadyExistException });
};

// Aligns to server data from ToJson of Microsoft.TeamFoundation.Server.WebAccess.WorkItemTracking.QueryItem
// ~\WebAccess\workitemtracking\Serializers\JsonExtensions.cs
export interface IQueryItemData {
    id: string;
    name: string;
    parent: string;
    folder: boolean;
    query?: string;
}

// Aligns to server data: Microsoft.TeamFoundation.WorkItemTracking.Server.QueryItem
// This is required for when we hit the UpdateQueries API.
// TODO: We should update the server to reuse the same json object for get/set.
export interface IQueryItemUpdateData {
    id: string;
    name: string;
    parentId?: string;
    queryText?: string;
    isFolder?: boolean;
}

export interface IQueryItemMoveInfo {
    queryItem: QueryItem;
    oldParent: QueryFolder;
}

export interface IQueryHierarchyData {
    privateQueries: IQueryItemData[];
    publicQueries: IQueryItemData[];
    assignedToMe: IQueryItemData;
    createdByMe: IQueryItemData;
    unsavedWorkItems: IQueryItemData;
    followedWorkItems: IQueryItemData;
    recycleBin: IQueryItemData;
}

export interface IQueryFavoriteItem {
    id: string;
    queryItem: WITWebApi.IQueryHierarchyItem;
}

export interface IQueryFavoritesData {
    /// <summary>DTO for GetQueryFavorites endpoint in ApiWitController</summary>
    myFavorites: IQueryFavoriteItem[];
    teamFavorites: IQueryFavoriteItem[];
}

export module QueryItemFactory {
    export function create(project: Project, query: WITWebApi.IQueryHierarchyItem): QueryItem {
        let queryItem: QueryItem;

        if (query) {
            if (query.isFolder) {
                queryItem = new QueryFolder(project, query);
            } else {
                queryItem = new QueryDefinition(project, query);
            }
        }

        return queryItem;
    }

    /**
     * Converts a QueryItem to an object that satisfies the QueryHierarchyItem interface (a REST contract)
     * Used for delivering a REST-compatible object to a VSTS extension's callback.
     * @param item QueryItem
     * @return QueryHierarchyItem
     */
    export function queryItemToQueryHierarchyItem(item: QueryItem | QueryDefinition): TFS_Wit_Contracts.QueryHierarchyItem {
        const wiql: string = (<QueryDefinition>item).queryText || undefined;
        const hierarchyItem = <TFS_Wit_Contracts.QueryHierarchyItem>{
            id: item.id,
            name: item.name,
            isPublic: !item.personal,
            wiql: wiql,
            path: item.storedPath
        };
        return hierarchyItem;
    }
}

export class QueryItem {
    public static EVENT_CREATED = "query-item-created";
    public static EVENT_MOVED = "query-item-moved";
    public static EVENT_RENAMED = "query-item-renamed";
    public static EVENT_REMOVED = "query-item-removed";
    public static EVENT_SAVED = "query-item-saved";
    public static DEFAULT_PATH_SEPARATOR = "/";

    public storedPath: string;
    public parentPath: string;
    public id: string;
    public newQueryId: string;
    public name: string;
    public parent: QueryFolder;
    public parentId: string;
    public personal: boolean;
    public project: Project;
    public isDirty: boolean;
    public sortModifier: number;
    public sortPrefix: number;
    public queryType: string;
    public lastSaveFailure: TfsError;
    public isInvalidSyntax?: boolean;

    constructor(project: Project, itemData: WITWebApi.IQueryHierarchyItem | TFS_Wit_Contracts.QueryHierarchyItem) {
        this.project = project;
        this.initialize();

        if (itemData) {
            this.updateFromData(itemData);
        }
    }

    protected initialize() {
    }

    public updateFromData(itemData: WITWebApi.IQueryHierarchyItem | TFS_Wit_Contracts.QueryHierarchyItem) {
        this.id = itemData.id;
        this.name = itemData.name;
        this.storedPath = itemData.path;
        this.personal = !itemData.isPublic;

        if ($.isNumeric(itemData.queryType)) {
            this.queryType = TFS_Wit_Contracts.QueryType[itemData.queryType];
        }
        else {
            this.queryType = <string>itemData.queryType;
        }
    }

    public path(includeRoot: boolean = false, separator?: string) {
        /// <summary>Calculates a path from the root of the query hierarchy and returns it</summary>
        /// <param name="includeRoot" type="boolean" optional="true">If true name of root will be included in path</param>
        /// <param name="separator" type="boolean" optional="true">Separator to separate path segments</param>

        return Utils_UI.calculateTreePath.call(this, includeRoot, separator || QueryItem.DEFAULT_PATH_SEPARATOR, "name", "root");
    }

    public beginRename(newName: string): IPromise<QueryItem> {
        /// <summary>Rename the query item to a new name</summary>
        /// <param name="newName" type="string">New name of query item</param>

        Diag.Debug.assertParamIsStringNotEmpty(newName, "newName");

        let itemAtNewPath: QueryItem;

        const rename = (): IPromise<QueryItem> => {
            if (itemAtNewPath && itemAtNewPath !== this) {
                // Item already exists at the new path and it's not the original item (which would be the case for a rename that only changed the case)
                const error = Error_queryItemAlreadyExist(newName);

                return Q.reject(error);
            } else {
                const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

                return QueryHierarchy.beginRenameQueryItem(this.project, this.id, newName).then(
                    (renamedQueryItem: QueryItem) => {
                        this.name = renamedQueryItem.name;

                        $(window).trigger(QueryItem.EVENT_RENAMED, this);
                        return this;
                    });
            }
        };

        if (this.parent) {
            return this.parent.beginLoadChildren().then(
                (queryFolder: QueryFolder) => {
                    itemAtNewPath = this.parent.findByPath(newName);

                    return rename();
                });
        } else {
            return rename();
        }
    }

    public beginMove(newName: string, newParent: QueryFolder): IPromise<IQueryItemMoveInfo> {
        /// <summary>Extends on pattern of rename method by allowing for movement of query items under new parent.
        /// Note: The notification from this method provides a moveInfo object describing {queryItem, oldParent} as opposed to typical updated query node
        ///</summary>
        /// <param name="newName" type="String">The new name for the query Item.</param>
        /// <param name="newParent" type="Object">The new parent for the query Item.</param>

        Diag.Debug.assertParamIsStringNotEmpty(newName, "newName");
        Diag.Debug.assertParamIsObject(newParent, "newParent");

        const oldParent = this.parent;
        const moveInfo: IQueryItemMoveInfo = {
            queryItem: this,
            oldParent: oldParent
        };

        return newParent.beginLoadChildren().then(
            (queryFolder: QueryFolder) => {
                if (newParent.findByPath(newName)) {
                    // Conflicting item exists at new path
                    const error = Error_queryItemAlreadyExist(newName);

                    return Q.reject(error);
                }

                const moveItem = (): IPromise<IQueryItemMoveInfo> => {
                    const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

                    return QueryHierarchy.beginMoveQueryItem(this.project, this.id, newParent.id).then(
                        (movedQueryItem: QueryItem) => {
                            oldParent.remove(this);
                            this.storedPath = movedQueryItem.storedPath;

                            // Public/private state might have changed, update based on parent
                            this.setPersonal(movedQueryItem.personal);
                            newParent.add(this);

                            this.isDirty = false;

                            $(window).trigger(QueryItem.EVENT_SAVED, this);
                            $(window).trigger(QueryItem.EVENT_MOVED, moveInfo);

                            return moveInfo;
                        });
                };

                // Move and rename have to be made in two separate calls, rename item first if requested
                if (Utils_String.localeIgnoreCaseComparer(this.name, newName) !== 0) {

                    return QueryHierarchy.beginRenameQueryItem(this.project, this.id, newName).then(
                        (renamedQueryItem: QueryItem) => {
                            this.name = renamedQueryItem.name;

                            // Now move
                            return moveItem();
                        });
                } else {
                    // No rename, move immediately
                    return moveItem();
                }
            });
    }

    public setPersonal(isPersonal: boolean) {
        this.personal = isPersonal;
    }

    public beginDelete(): IPromise<QueryItem> {
        /// <summary>Deletes this query item from the hierarchy</summary>

        if (!this.id && this.newQueryId) {
            // Unsaved query - don't make server call, just invoke delete handlers
            this.onDelete(true);
            return Q.resolve(this);
        }

        const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

        return QueryHierarchy.beginDeleteQueryItem(this.project, this.id).then(
            () => {
                this.onDelete(true);
                return this;
            });
    }

    public onDelete(fire: boolean) {
        if (this.parent) {
            this.parent.remove(this);
        }

        const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

        delete queryHierarchy.all[this.id || this.name];

        if (fire) {
            $(window).trigger(QueryItem.EVENT_REMOVED, this);
        }
    }
}

VSS.initClassPrototype(QueryItem, {
    id: null,
    name: null,
    parent: null,
    parentId: null,
    personal: false,
    project: null,
    isDirty: false,
    sortModifier: 1,
    sortPrefix: 0
});

export class QueryDefinition extends QueryItem {

    public static DEFAULT_NEW_QUERY_WIQL: string = "SELECT [System.Id], [System.WorkItemType], [System.Title], [System.AssignedTo], [System.State], [System.Tags] FROM Workitems WHERE [System.TeamProject] = @project AND [System.WorkItemType]<>'' AND [System.State]<>''";
    public static ASSIGNED_TO_ME_ID: string = "A2108D31-086C-4FB0-AFDA-097E4CC46DF4";
    public static UNSAVED_WORKITEMS_ID: string = "B7A26A56-EA87-4C97-A504-3F028808BB9F";
    public static FOLLOWED_WORKITEMS_ID: string = "202230E0-821E-401D-96D1-24A7202330D0";
    public static CREATED_BY_ME_ID: string = "53FB153F-C52C-42F1-90B6-CA17FC3561A8";
    public static SEARCH_RESULTS_ID: string = "2CBF5136-1AE5-4948-B59A-36F526D9AC73";
    public static CUSTOM_WIQL_QUERY_ID: string = "08E20883-D56C-4461-88EB-CE77C0C7936D";
    public static RECYCLE_BIN_QUERY_ID: string = "2650C586-0DE4-4156-BA0E-14BCFB664CCA";

    private _originalQueryText: string;
    public queryText: string;
    public specialQuery: boolean;
    public customQuery: boolean;
    public tempQueryId: string;

    public static defaultNewQueryWiql() {
        return QueryDefinition.DEFAULT_NEW_QUERY_WIQL;
    }

    public static isMyWorkItems(query: QueryDefinition): boolean {
        if (!query.id) {
            return false;
        }

        return query.id.toUpperCase() === QueryDefinition.ASSIGNED_TO_ME_ID;
    }

    public static isUnsavedWorkItems(query: QueryDefinition): boolean {
        if (!query.id) {
            return false;
        }

        return query.id.toUpperCase() === QueryDefinition.UNSAVED_WORKITEMS_ID;
    }

    public static isFollowedWorkItems(query: QueryDefinition): boolean {
        if (!query.id) {
            return false;
        }

        return query.id.toUpperCase() === QueryDefinition.FOLLOWED_WORKITEMS_ID;
    }

    public static isCreatedByMe(query: QueryDefinition): boolean {
        if (!query.id) {
            return false;
        }

        return query.id.toUpperCase() === QueryDefinition.CREATED_BY_ME_ID;
    }

    public static isSearchResults(query: QueryDefinition): boolean {
        if (!query.id) {
            return false;
        }

        return query.id.toUpperCase() === QueryDefinition.SEARCH_RESULTS_ID;
    }

    public static isCustomWiqlQuery(query: QueryDefinition): boolean {
        if (!query.id) {
            return false;
        }

        return query.id.toUpperCase() === QueryDefinition.CUSTOM_WIQL_QUERY_ID;
    }

    /**
     * checks if the given query is a recycle bin query
     *
     * @param query query item to check
     * @return true if it's a recycle bin query. returns false otherwise
     */
    public static isRecycleBinQuery(query: QueryItem): boolean {
        if (!query.id) {
            return false;
        }

        // query.id can be null in case of temp queries (for eg. in Work item finder dialog)
        return query.id && query.id.toUpperCase() === QueryDefinition.RECYCLE_BIN_QUERY_ID;
    }

    public static isFollowsQuery(query: QueryItem): boolean {
        if (!query.id) {
            return false;
        }

        // query.id can be null in case of temp queries (for eg. in Work item finder dialog)
        return query.id && query.id.toUpperCase() === QueryDefinition.FOLLOWED_WORKITEMS_ID;
    }

    public static isCustomizableAdHocQuery(query: QueryDefinition): boolean {
        /// <summary>Determines whether the given query is and adhoc query and can be customized and saved</summary>
        /// <param name="query">Query to be checked</param>

        // Only "Assigned to me", "Unsaved workitems", "Followed workitems" and "Recycle bin" can be customized.
        return QueryDefinition.isMyWorkItems(query)
            || QueryDefinition.isUnsavedWorkItems(query)
            || QueryDefinition.isFollowedWorkItems(query)
            || QueryDefinition.isRecycleBinQuery(query);
    }

    public static isCustomizableSpecialQuery(query: QueryDefinition): boolean {
        /// <summary>Returns a value indicating whether the query can be customized, i.e., column options be changed
        /// or clauses modified.</summary>

        return query.specialQuery &&
            (QueryDefinition.isMyWorkItems(query)
                || QueryDefinition.isCreatedByMe(query)
                || QueryDefinition.isUnsavedWorkItems(query)
                || QueryDefinition.isFollowedWorkItems(query)
                || QueryDefinition.isRecycleBinQuery(query));
    }

    public static isUneditableQuery(query: QueryDefinition): boolean {
        return query.specialQuery &&
            (QueryDefinition.isUnsavedWorkItems(query)
                || QueryDefinition.isFollowedWorkItems(query));
    }

    public static isSpecialQueryId(id: string): boolean {
        /// <summary>Determine whether the given id refers to a special query</summary>
        /// <param name="id" type="string">Id to check</param>

        const upperId = id.toUpperCase();

        return (upperId === QueryDefinition.ASSIGNED_TO_ME_ID
            || upperId === QueryDefinition.SEARCH_RESULTS_ID
            || upperId === QueryDefinition.CREATED_BY_ME_ID
            || upperId === QueryDefinition.CUSTOM_WIQL_QUERY_ID
            || upperId === QueryDefinition.UNSAVED_WORKITEMS_ID
            || upperId === QueryDefinition.FOLLOWED_WORKITEMS_ID
            || upperId === QueryDefinition.RECYCLE_BIN_QUERY_ID);
    }

    constructor(project: Project, itemData?: WITWebApi.IQueryHierarchyItem | TFS_Wit_Contracts.QueryHierarchyItem) {
        super(project, itemData);

        if (itemData) {
            this.queryText = itemData.wiql || (<any>itemData).query;
        }
    }

    public setQuery(wiql: string) {
        if (this.queryText !== wiql) {
            this._originalQueryText = this.queryText;
            this.queryText = wiql;
            this.isDirty = true;
        }
    }

    public path(includeRoot: boolean = false, separator?: string) {
        /// <summary>Calculates a path from the root of the query hierarchy and returns it</summary>
        /// <param name="includeRoot" type="boolean" optional="true">If true name of root will be included in path</param>
        /// <param name="separator" type="boolean" optional="true">Separator to separate path segments</param>

        if (this.parent) {
            return super.path(includeRoot, separator);
        } else {
            return this.storedPath;
        }
    }
}

VSS.initClassPrototype(QueryDefinition, {
    queryText: null,
    _originalQueryText: null,
    specialQuery: false,
    customQuery: false,
    tempQueryId: null
});

export class QueryFolder extends QueryItem {
    public children: QueryItem[];
    public childrenMap: { [id: string]: QueryItem };
    public specialFolder: boolean;
    public hasChildren: boolean;
    public prefetchLevel: number;

    constructor(project: Project, itemData: WITWebApi.IQueryHierarchyItem, prefetchLevel: number = 0) {
        super(project, itemData);

        this.prefetchLevel = prefetchLevel;
    }

    protected initialize() {
        this.children = [];
        this.childrenMap = {};
        super.initialize();
    }

    public beginLoadChildren(): IPromise<QueryFolder> {
        /// <summary>Load the children of this folder up to a predefined level - if not already loaded</summary>

        if (this.prefetchLevel >= QueryHierarchy.QUERY_PREFETCH_DEPTH
            || !this.hasChildren) {
            // We have already loaded the required levels, immediately notify caller
            return Q.resolve(this);
        } else {
            return QueryHierarchy.beginGetQueryHierarchyNonRoot(this).then(
                (queryData) => {
                    this.prefetchLevel = QueryHierarchy.QUERY_PREFETCH_DEPTH;

                    this.updateFromData(queryData);
                    return this;
                });
        }
    }

    public childrenLoaded(): boolean {
        /// <summary>Returns a value indicating whether the children of this folder have been loaded</summary>
        /// <return type="boolean">Value indicating whether children have been loaded</return>

        return this.hasChildren && this.children && this.children.length > 0;
    }

    public updateFromData(itemData: WITWebApi.IQueryHierarchyItem) {
        /// <summary>Updates this OM element from data received from the API</summary>
        /// <param name="itemData" type="WITWebApi.QueryHierarchyItem">Data to update item from</param>

        super.updateFromData(itemData);

        this.hasChildren = itemData.hasChildren;

        if (itemData.children) {
            this.addOrUpdateChildrenFromData(itemData.children);
        }
    }

    public addOrUpdateChildrenFromData(children: WITWebApi.IQueryHierarchyItem[]) {
        /// <summary>Add children to the folder or update existing children</summary>
        /// <param name="children" type="WITWebApi.QueryHierachyItem[]" />

        const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

        $.each(children, (index: number, childData: WITWebApi.IQueryHierarchyItem) => {
            if (this.childrenMap[childData.id]) {
                const existingChild = this.childrenMap[childData.id];

                existingChild.updateFromData(childData);

                if (existingChild instanceof QueryFolder) {
                    (<QueryFolder>existingChild).prefetchLevel = this.prefetchLevel - 1;
                }
            } else {
                // Before create new queryItem in queryHierarchy, see if there is any cached queryItem referencing the same id as parent.
                // If there is any (>=1), instead of create new queryItem object, we will:
                //   1. Update the parent object of the cached queryItem (logically making it grandchild). Calling it as "newQueryFolder"
                //   2. Build relation between "this" and the "newQueryFolder".
                //   3. Put the "newQueryFolder" into cache
                //
                // The problem that we are trying to solve:
                //   Consider the full hierarchy as: SharedQueries->F1->F2->F3
                //                                                       |->Q1
                //
                //   queryHierarchy can be built partially by calling Project.prototype.beginGetQueryItemByPath("SharedQueries\F1\F2")
                //   => queryHierarchy.all: Q1 (parent: F2)
                //                          F3 (parent: F2)
                //
                //   After calling above function, later when we build hierarchy from root with depth = 2
                //   => queryHierarchy.all: Q1 (parent: F2)
                //                          F3 (parent: F2)
                //                          SharedQueries (parent: [ROOT])
                //                          F1 (parent: SharedQueries)
                //                          F2' (parent: F1)
                //
                //  At this point, the parent of Q1 and F3 is not the same object as F2' in the cache, and the parent/children relations are broken.
                //
                let newQueryFolder: QueryFolder;

                if (childData.isFolder && queryHierarchy && childData.id && !this._getQueryItemFromQueryHierarchy(childData)) {
                    $.each(queryHierarchy.all, (index: number, cachedQueryItem: QueryItem) => {
                        // Check if the cachedQueryItem is referencing childData.id as parent.
                        if (cachedQueryItem.id && cachedQueryItem.id !== childData.id && cachedQueryItem.parentId === childData.id) {
                            // Check if "newQueryFolder" has been created already by previously found grandchild
                            if (newQueryFolder && cachedQueryItem.parent !== newQueryFolder) {
                                cachedQueryItem.parent = newQueryFolder;
                            }
                            // Fist time find a grandchild. But we are not going to fix if cachedQueryItem.parent is undefined as we don't think this is a possible scenario
                            else if (!newQueryFolder && cachedQueryItem.parent) {
                                cachedQueryItem.parent.updateFromData(childData);
                                cachedQueryItem.parent.prefetchLevel = this.prefetchLevel - 1;
                                this.add(cachedQueryItem.parent);
                                // Keep the ticket locally for future use
                                newQueryFolder = cachedQueryItem.parent;
                            }
                        }
                    });
                }

                // Continue to create new queryItem if the childData is still unprocessed
                if (!newQueryFolder) {
                    let newItem: QueryItem;
                    if (childData.isFolder) {
                        newItem = new QueryFolder(this.project, childData, this.prefetchLevel - 1);
                    } else {
                        newItem = new QueryDefinition(this.project, childData);
                    }

                    this.add(newItem);
                }
            }
        });
    }

    public add(queryItem: QueryItem, isNewlyCreatedItem?: boolean) {
        /// <summary>Adds a query item to this folder</summary>
        /// <param name="queryItem" type="QueryItem" />
        /// <param name="isNewlyCreatedItem" type="boolean" optional="true" />
        queryItem.parent = this;
        queryItem.parentId = this.id;
        queryItem.project = this.project;

        this.children.push(queryItem);

        if (queryItem.id) {
            this.childrenMap[queryItem.id] = queryItem;
        }
        else if (queryItem.name) {
            this.childrenMap[queryItem.name] = queryItem;
        }

        // Folder now has children (previously it might have been empty)
        this.hasChildren = true;

        const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

        if (queryHierarchy) {
            if (queryItem.id) {
                queryHierarchy.all[queryItem.id] = queryItem;
            }
            else if (queryItem.name) {
                queryHierarchy.all[queryItem.name] = queryItem;
            }
        }

        if (isNewlyCreatedItem) {
            $(window).trigger(QueryItem.EVENT_CREATED, queryItem);
        }
    }

    public remove(queryItem: QueryItem) {
        /// <param name="queryItem" type="QueryItem" />

        if (queryItem.id) {
            delete this.childrenMap[queryItem.id];
        }
        if (queryItem.name) {
            delete this.childrenMap[queryItem.name];
        }

        Utils_Array.remove(this.children, queryItem);

        if (this.children.length === 0) {
            this.hasChildren = false;
        }
    }

    public findByPath(path: string): QueryItem {
        /// <summary>Finds a query item under the current folder with the given path</summary>
        /// <param name="path" type="string">Path under the current folder</param

        return <QueryItem>Utils_UI.findTreeNode.call(this, path, QueryItem.DEFAULT_PATH_SEPARATOR, Utils_String.localeIgnoreCaseComparer, "name");
    }

    public beginFindByPath(path: string): IPromise<QueryItem> {
        /// <summary>Finds a query item under the current folder with the given path</summary>
        /// <param name="path" type="string">Path under the current folder</param>

        const itemInTree = <QueryItem>Utils_UI.findTreeNode.call(this, path, QueryItem.DEFAULT_PATH_SEPARATOR, Utils_String.localeIgnoreCaseComparer, "name");
        if (itemInTree) {
            return Q.resolve<QueryItem>(itemInTree);
        } else {
            let fullPath: string = path;

            const localPath = this.path(false);
            if (localPath !== "") {
                fullPath = this.path(false) + QueryItem.DEFAULT_PATH_SEPARATOR + path;
            }

            return QueryHierarchy.beginGetQueryItemByIdOrPath(this.project, fullPath).then(
                (queryItem: QueryItem) => {
                    if (queryItem) {
                        const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

                        return queryHierarchy._ensureItemInTree(fullPath, queryItem);
                    }
                    else {
                        return Q.resolve(null);
                    }
                }
            );
        }
    }

    public clear() {
        /// <summary>Clear the folder</summary>

        this.children = [];
        this.childrenMap = {};
    }

    public beginCreateNewFolder(name: string): IPromise<QueryFolder> {
        /// <summary>Create a new folder under the current path. If an item with the name already exists, an error will be thrown.</summary>
        /// <param name="name" type="string">Name of the folder to create</param>

        return this.beginLoadChildren().then(
            (queryFolder: QueryFolder) => {
                const existingItem: QueryItem = this.findByPath(name);
                if (existingItem) {
                    const error = Error_queryItemAlreadyExist(name);

                    return Q.reject(error);
                }
                else {
                    return QueryHierarchy.beginCreateQueryFolder(this.project, name, this.id).then(
                        (queryFolder: QueryFolder) => {
                            this.add(queryFolder, true);
                            return queryFolder;
                        });
                }
            });

    }

    public beginCreateNewQuery(name: string, wiql: string, newQueryId: string): IPromise<QueryDefinition> {
        /// <summary>Create a new query under the current path. If an item with the name already exists, an error will be thrown.</summary>
        /// <param name="name" type="string">Name of the folder to create</param>
        /// <param name="wiql" type="string">WIQL of query</param>
        /// <param name="newQueryId" type="string">Temporary id assigned to the new query</param>

        return this.beginLoadChildren().then((queryFolder: QueryFolder) => {
            const item: QueryDefinition = <QueryDefinition>this.findByPath(name);

            if (item && !item.newQueryId) {
                // if an item already exists, and it's NOT a new/unsaved query, throw exception
                const error = Error_queryItemAlreadyExist(name);

                return Q.reject(error);
            }
            else {
                return QueryHierarchy.beginCreateQueryDefinition(this.project, name, wiql, this.id).then(
                    (queryDefininition: QueryDefinition) => {
                        if (newQueryId) {
                            queryDefininition.newQueryId = newQueryId;
                        }

                        this.add(queryDefininition, true);

                        $(window).trigger(QueryItem.EVENT_SAVED, queryDefininition);

                        const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

                        // If this is a new query saved for the first time, we need to update the queryHierarchy to reflect the new id
                        if (queryDefininition.newQueryId && queryHierarchy && queryHierarchy.findQueryById(queryDefininition.name)) {
                            queryHierarchy.updateNewQueryId(queryDefininition.name, queryDefininition.id);
                        }

                        return queryDefininition;
                    });
            }
        });
    }

    public onDelete(fire: boolean) {
        for (let i = this.children.length - 1; i >= 0; i--) {
            this.children[i].onDelete(fire);
        }

        super.onDelete(fire);
    }

    public setPersonal(isPersonal: boolean) {
        /// <summary>Recursively applies the personal property to this queryItem and it's descendants if they aren't already in specified state</summary>
        /// <param name="isPersonal" type="boolean">Value indicating whether this item is a personal item</param>

        Diag.Debug.assertParamIsBool(isPersonal, "isPersonal");

        super.setPersonal(isPersonal);

        if (this.personal !== isPersonal) {
            if (this.children) {
                for (let i = 0, l = this.children.length; i < l; i++) {
                    this.children[i].setPersonal(isPersonal);
                }
            }
        }
    }

    public _ensureItemInTree(path: string, queryItem: QueryItem): IPromise<QueryItem> {
        /// <summary>Ensure that the given queryItem is attached to the query hierarchy at the given path.
        /// This method will start from the root of the query hierarchy and recursively expand folders in a depth-first
        /// way until a path to the given item is established and it can be attached.
        /// </summary>
        /// <param name="path" type="string">Full path to where the given query item should be attached</param>
        /// <param name="queryItem" type="QueryItem">Query item to attach to the hierarchy</param>

        // Item has been retrieved, now build up path from root to this item in order
        // to attach it to the tree. Split the path by the default separator and traverse the
        // tree from root to requested node.
        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERYHIERARCHY_ENSUREITEMINTREE, true);

        const deferred = Q.defer<QueryItem>();

        const pathSegments = path.split(QueryItem.DEFAULT_PATH_SEPARATOR);

        const f = (parentFolder: QueryFolder, pathIdx: number) => {
            const pathSegment = pathSegments.slice(0, pathIdx + 1).join(QueryItem.DEFAULT_PATH_SEPARATOR);
            if (!pathSegment || pathSegment === path) {
                // Ensure that the retrieved item is in parent folder
                if (!parentFolder.childrenMap[queryItem.id]) {
                    parentFolder.add(queryItem);
                }

                const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

                if (queryHierarchy) {
                    queryHierarchy.triggerUpdate();
                }

                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.QUERYHIERARCHY_ENSUREITEMINTREE, false);

                // Use item from parentFolder to make sure all relationship properties are
                // correctly set up
                deferred.resolve(parentFolder.childrenMap[queryItem.id]);
                return;
            }

            // Expand children of the parent folder
            parentFolder.beginLoadChildren().then((queryFolder: QueryFolder) => {
                const existing = this.findByPath(pathSegment);
                if (existing) {
                    f((<QueryFolder>existing), pathIdx + 1);
                } else {
                    const newItem = parentFolder.findByPath(pathSegment);
                    if (newItem) {
                        parentFolder.add(newItem);

                        f((<QueryFolder>newItem), pathIdx + 1);
                    } else {
                        // Error!
                        deferred.reject(createError(Utils_String.format(Resources.QueryFolderDoesNotExist, pathSegment), { name: Exceptions.QueryFolderDoesNotExistException }));
                    }
                }
            }, (error) => deferred.reject(error));
        };

        // Traverse requested path and fetch elements
        f(this, 0);

        return deferred.promise;
    }

    private _getQueryItemFromQueryHierarchy(queryItemData: WITWebApi.IQueryHierarchyItem): QueryItem {
        let key: string;
        if (queryItemData.id) {
            key = queryItemData.id;
        }
        else if (queryItemData.name) {
            key = queryItemData.name;
        }

        let targetQueryItem: QueryItem;
        const queryHierarchy = QueryHierarchy.getQueryHierarchy(this.project);

        if (queryHierarchy) {
            targetQueryItem = queryHierarchy.all[key];
        }

        return targetQueryItem;
    }
}

VSS.initClassPrototype(QueryFolder, {
    children: null,
    childrenMap: null,
    specialFolder: false,
    prefetchLevel: 0
});

export class QueryHierarchy extends QueryFolder {
    public static EVENT_CHANGED: string = "query-hierarchy-changed";
    public static EVENT_REFRESHED: string = "query-hierarchy-refreshed";
    public static EVENT_LOADED: string = "query-hierarchy-loaded";
    private static HIERARCHY_PROMISE_KEY: string = "query-hierarchy-promise";
    private static ADHOC_QUERIES_PROMISE_KEY: string = "query-hierarchy-adhoc-queries-promise";
    private static QUERY_FAVORITES_PROMISE_KEY: string = "query-hierarchy-query-favorites-promise";
    private static QUERY_HIERARCHY_KEY: string = "query-hierarchy";
    public static ROOT_QUERY_PREFETCH_DEPTH: number = 1;
    public static QUERY_PREFETCH_DEPTH: number = 2;

    public all: { [idOrName: string]: QueryItem; };
    public myQueries: QueryFolder;
    public sharedQueries: QueryFolder;
    public root: boolean;
    public sortModifier: number;
    public assignedToMe: QueryDefinition;
    public createdByMe: QueryDefinition;
    public project: Project;
    public unsavedWorkItems: any;
    public followedWorkItems: any;

    constructor(project: Project, data: WITWebApi.IQueryHierarchyItem, prefetchLevel: number) {
        super(project, data, prefetchLevel);
    }

    protected initialize() {
        this.all = {};
        super.initialize();
    }

    public clear() {
        /// <summary>Clear hierarchy</summary>

        super.clear();

        this.all = {};
        this.myQueries = null;
        this.sharedQueries = null;
        this.assignedToMe = null;
        this.unsavedWorkItems = null;
        this.followedWorkItems = null;
    }

    public updateFromData(itemData: WITWebApi.IQueryHierarchyItem) {
        /// <summary>Updates the QueryHierarchy from DTO data</summary>
        /// <param name="itemData" type="WITWebApi.QueryHierarchyItem">data transfer object for hierarchy</param>
        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERYHIERARCHY_UPDATEFROMDATA, true);

        super.updateFromData(itemData);

        if (itemData) {

            // Assume the first public child folder is the 'Shared Queries' folder and the
            // first private child is 'My Queries' folder.
            let found = 0;
            for (let i = 0, l = this.children.length; i < l && found < 2; ++i) {
                const child: QueryItem = this.children[i];

                if (!(child instanceof QueryFolder)) {
                    Diag.Debug.assert(QueryDefinition.isSpecialQueryId(child.id), "Unexpected query item in hierarchy");

                    continue;
                }

                if (child.personal) {
                    this.myQueries = <QueryFolder>child;
                    ++found;
                } else {
                    this.sharedQueries = <QueryFolder>child;
                    ++found;
                }
            }

            // Mark special folders
            if (this.myQueries) {
                this.myQueries.specialFolder = true;
            }

            if (this.sharedQueries) {
                this.sharedQueries.specialFolder = true;
            }

            $(window).trigger(QueryHierarchy.EVENT_LOADED, this);
        }

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERYHIERARCHY_UPDATEFROMDATA, false);
    }

    public findQueryById(id: string) {
        /// <summary>Finds a query by id using the global hierarchy lookup</summary>
        /// <param name="id" type="string">Id of query to find</param>

        return this.all[id];
    }

    public beginFindQueryById(id: string, insertToHierarchy: boolean = true): IPromise<QueryItem> {
        /// <summary>Finds a query by id asynchronously. If it's not already in the hierarchy it will be attempted to
        /// download it from the server and insert into the hierarchy.</summary>
        /// <param name="id" type="string">Id of query to find</param>
        /// <param name="insertToHierarchy" type="boolean" optional="true">If true, the retrieved item will
        /// be inserted in to the hierarchy, if it's no already a part of it. This might result in more
        /// server calls to retrieve parent items</param>

        if (this.all[id]
            || QueryDefinition.isSpecialQueryId(id)) {
            // There is no server-side support for special queries, they are
            // client only, so only lookup in local data
            return Q.resolve(this.all[id]);
        } else {
            return QueryHierarchy.beginGetQueryItemByIdOrPath(this.project, id).then(
                (queryItem) => {
                    if (queryItem && insertToHierarchy) {
                        return this._ensureItemInTree(queryItem.storedPath, queryItem);
                    } else {
                        return queryItem;
                    }
                });
        }
    }

    public beginRefresh(): IPromise<void> {
        /// <summary>Refreshed the complete hierarchy from the server</summary>

        let completed = 0;
        const deferred = Q.defer<void>();

        const completeRefresh = () => {
            if (++completed === 2) {
                this._triggerRefresh();

                deferred.resolve(null);
            }
        };

        this.clear();

        this._beginGetAdHocQueriesRefreshCache().then(
            (adhocQueries) => {
                this._loadAdHocQueries(adhocQueries);

                completeRefresh();
            },
            (error) => deferred.reject(error));

        QueryHierarchy._beginGetQueryHierarchyRaw(this.project).then(
            (queryHierarchyData) => {
                this.updateFromData(queryHierarchyData);

                completeRefresh();
            },
            (error) => deferred.reject(error));

        return deferred.promise;
    }

    public updateNewQueryId(oldId: string, newId: string) {
        /// <summary>Update the Id in the query hierarchy's lookup table.  Used for new queries.</summary>
        /// <param name="oldId" type="String">The existing key in the query hierarchy lookup table.</param>
        /// <param name="newId" type="String">The new key in the query hierarchy lookup table.</param>
        Diag.Debug.assertParamIsString(oldId, "oldId");
        Diag.Debug.assertParamIsString(newId, "newId");

        this.all[newId] = this.all[oldId];
        delete this.all[oldId];
    }

    public load(data: IQueryHierarchyData) {
        let id: any;
        let item: any;
        let parent: any;

        this.all = {};

        const createItems = (queries: IQueryItemData[], personal: boolean) => {
            let item: QueryItem;

            if (queries) {
                for (let i = 0, l = queries.length; i < l; i++) {
                    const itemData = queries[i];
                    const transformedItemData = QueryHierarchy._transform(itemData);
                    if (itemData.folder) {
                        item = new QueryFolder(this.project, transformedItemData);
                    }
                    else {
                        item = new QueryDefinition(this.project, transformedItemData);
                    }
                    item.parentId = itemData.parent;

                    item.personal = personal;
                    this.all[item.id] = item;
                }
            }
        }

        createItems(data.privateQueries, true);
        createItems(data.publicQueries, false);

        // Add Work Items Assigned to Me node
        this._loadAdHocQueries(data);

        this.clear();

        //make items tree
        for (id in this.all) {
            if (this.all.hasOwnProperty(id)) {
                item = this.all[id];
                parent = this.all[item.parentId];

                if (parent) {
                    parent.add(item);
                }
                else {
                    if (!item.specialQuery) {
                        item.specialFolder = item instanceof QueryFolder;

                        if (item.personal) {
                            this.myQueries = item;
                            item.sortPrefix = 1;
                        }
                        else {
                            this.sharedQueries = item;
                            item.sortPrefix = 2;
                        }
                    }

                    this.add(item);
                }
            }
        }

        $(window).trigger(QueryHierarchy.EVENT_LOADED, this);
    }

    public static beginGetAdHocQueries(project: Project): IPromise<IQueryHierarchyData> {
        /// <summary>Load ad hoc queries</summary>

        const cachedPromise: IPromise<IQueryHierarchyData> = <IPromise<IQueryHierarchyData>>project.relatedData[QueryHierarchy.ADHOC_QUERIES_PROMISE_KEY]

        if (cachedPromise) {
            return cachedPromise;
        }

        const deferredQueries: Q.Deferred<IQueryHierarchyData> = Q.defer<IQueryHierarchyData>();
        project.relatedData[QueryHierarchy.ADHOC_QUERIES_PROMISE_KEY] = deferredQueries.promise;

        const timestampName = "beginGetAdHocQueries";
        Diag.timeStamp(timestampName, Diag.StampEvent.Enter);

        project.store.metadataCacheStampManager.addStampToParams(WITConstants.WITCommonConstants.AdhocQueries, null, (params) => {
            Ajax.getMSJSON(QueryHierarchy.getApiLocation(project, "AdHocQueries"), params,
                (queries: IQueryHierarchyData) => {
                    Diag.timeStamp(timestampName, Diag.StampEvent.Leave);

                    deferredQueries.resolve(queries);
                },
                (error) => deferredQueries.reject(error));
        });
        return deferredQueries.promise;
    }

    public static isHierarchyPopulated(project: Project): boolean {
        const hierarchy = QueryHierarchy.getQueryHierarchy(project);

        return hierarchy != undefined && hierarchy != null;
    }

    public static getQueryHierarchy(project: Project): QueryHierarchy {
        if (!project) {
            return null;
        }

        return project.relatedData[QueryHierarchy.QUERY_HIERARCHY_KEY];
    }

    public static beginGetQueryHierarchy(project: Project): IPromise<QueryHierarchy> {
        /// <summary>Load complete query hierarchy</summary>

        const hierarchyPromise: IPromise<QueryHierarchy> = <IPromise<QueryHierarchy>>project.relatedData[QueryHierarchy.HIERARCHY_PROMISE_KEY];

        if (hierarchyPromise) {
            return hierarchyPromise;
        }

        const deferredHierarchy = Q.defer<QueryHierarchy>();
        project.relatedData[QueryHierarchy.HIERARCHY_PROMISE_KEY] = deferredHierarchy.promise;

        const queryHierarchy: QueryHierarchy = new QueryHierarchy(project, null, QueryHierarchy.QUERY_PREFETCH_DEPTH);

        let adhocQueryData: IQueryHierarchyData,
            queryHierarchyData: WITWebApi.IQueryHierarchyItem;

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERYHIERARCHY_GETHIERARCHY_REQUEST, true);

        const synchronizedPopulate = () => {
            if (adhocQueryData && queryHierarchyData) {
                project.relatedData[QueryHierarchy.QUERY_HIERARCHY_KEY] = queryHierarchy;

                queryHierarchy.updateFromData(queryHierarchyData);
                queryHierarchy._loadAdHocQueries(adhocQueryData);

                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.QUERYHIERARCHY_GETHIERARCHY_REQUEST, false);

                deferredHierarchy.resolve(queryHierarchy);
            }
        };

        QueryHierarchy.beginGetAdHocQueries(project).then(
            (queryData: IQueryHierarchyData) => {
                adhocQueryData = queryData;

                synchronizedPopulate();
            },
            (error) => deferredHierarchy.reject(error)
        );

        QueryHierarchy._beginGetQueryHierarchyRaw(project).then(
            (queryData: WITWebApi.IQueryHierarchyItem) => {
                queryHierarchyData = queryData;

                synchronizedPopulate();
            },
            (error) => deferredHierarchy.reject(error)
        );

        return deferredHierarchy.promise;
    }

    public static beginCreateQueryDefinition(project: Project, name: string, wiql: string, parentIdOrPath: string): IPromise<QueryDefinition> {
        /// <summary>Creates a new query definition under the given parent id</summary>
        /// <param name="name" type="string">Name of the query definition</param>
        /// <param name="wiql" type="string">Wiql of the query definition</param>
        /// <param name="parentIdOrPath" type="string">Path or id to the parent folder</param>

        Diag.Debug.assertParamIsStringNotEmpty(name, "name");
        Diag.Debug.assertParamIsStringNotEmpty(wiql, "wiql");
        Diag.Debug.assertParamIsStringNotEmpty(parentIdOrPath, "parentIdOrPath");

        const httpClient = project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);
        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERY_CREATEQUERY_REQUEST, true);

        return httpClient.beginCreateQueryDefinition(project.guid, name, wiql, parentIdOrPath).then(
            (query: WITWebApi.IQueryHierarchyItem) => {
                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.QUERY_CREATEQUERY_REQUEST, false);
                return <QueryDefinition>QueryItemFactory.create(project, query);
            });
    }

    public static beginCreateQueryFolder(project: Project, name: string, parentIdOrPath: string): IPromise<QueryFolder> {
        Diag.Debug.assertParamIsObject(project, "project");
        Diag.Debug.assertParamIsStringNotEmpty(name, "name");
        Diag.Debug.assertParamIsStringNotEmpty(parentIdOrPath, "parentIdOrPath");

        const httpClient = project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

        return httpClient.beginCreateQueryFolder(project.guid, name, parentIdOrPath).then(
            (query: WITWebApi.IQueryHierarchyItem) => {
                return <QueryFolder>QueryItemFactory.create(project, query);
            });
    }

    public static beginDeleteQueryItem(project: Project, queryId: string): IPromise<void> {
        Diag.Debug.assertParamIsObject(project, "project");
        Diag.Debug.assertParamIsStringNotEmpty(queryId, "queryId");

        const httpClient = project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);
        return httpClient.beginDeleteQueryItem(project.guid, queryId);
    }

    public static beginRenameQueryItem(project: Project, queryId: string, newName: string): IPromise<QueryItem> {
        Diag.Debug.assertParamIsObject(project, "project");
        Diag.Debug.assertParamIsStringNotEmpty(queryId, "queryId");
        Diag.Debug.assertParamIsStringNotEmpty(newName, "newName");

        const httpClient = project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

        return httpClient.beginRenameQueryItem(project.guid, queryId, newName).then(
            (query: WITWebApi.IQueryHierarchyItem) => {
                return QueryItemFactory.create(project, query);
            });
    }

    public static beginMoveQueryItem(project: Project, queryId: string, parentIdOrPath: string): IPromise<QueryItem> {
        Diag.Debug.assertParamIsObject(project, "project");
        Diag.Debug.assertParamIsStringNotEmpty(queryId, "queryId");
        Diag.Debug.assertParamIsStringNotEmpty(parentIdOrPath, "parentIdOrPath");

        const httpClient = project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

        return httpClient.beginMoveQueryItem(project.guid, queryId, parentIdOrPath).then(
            (query: WITWebApi.IQueryHierarchyItem) => {
                return QueryItemFactory.create(project, query);
            });
    }

    public static beginUpdateQueryDefinition(queryDefinition: QueryDefinition): IPromise<QueryDefinition> {
        /// <summary>Updates a query definition's wiql</summary>
        /// <param name="queryDefinition" type="QueryDefinition">Query definition to update</param>
        Diag.Debug.assertParamIsNotNull(queryDefinition, "queryDefinition");
        const deferred = Q.defer<QueryDefinition>();

        const success = (savedQueryDefinition: QueryDefinition) => {
            queryDefinition.id = savedQueryDefinition.id;
            queryDefinition.isDirty = false;

            $(window).trigger(QueryItem.EVENT_SAVED, queryDefinition);

            const queryHierarchy = QueryHierarchy.getQueryHierarchy(queryDefinition.project);

            // If this is a new query saved for the first time, we need to update the queryHierarchy to reflect the new id
            if (queryHierarchy &&
                queryDefinition.newQueryId &&
                queryHierarchy.findQueryById(queryDefinition.name)) {
                queryHierarchy.updateNewQueryId(queryDefinition.name, queryDefinition.id);
            }

            deferred.resolve(savedQueryDefinition);
        };

        if (QueryDefinition.isCustomizableAdHocQuery(queryDefinition)) {
            PerfScenarioManager.addSplitTiming(
                CIConstants.PerformanceEvents.QUERY_UPDATEADHOCQUERY_REQUEST, true);

            Ajax.postMSJSON(
                QueryHierarchy.getApiLocation(queryDefinition.project, "updateAdHocQuery"),
                { "queryId": queryDefinition.id, "wiql": queryDefinition.queryText },
                (savedQueryDefiniton: { id: string, wiql: string }) => {
                    queryDefinition.queryText = savedQueryDefiniton.wiql;
                    PerfScenarioManager.addSplitTiming(
                        CIConstants.PerformanceEvents.QUERY_UPDATEADHOCQUERY_REQUEST, false);
                    success(queryDefinition);
                },
                (error) => deferred.reject(error));
        }
        else {
            const httpClient = queryDefinition.project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

            PerfScenarioManager.addSplitTiming(
                CIConstants.PerformanceEvents.QUERY_UPDATEQUERY_REQUEST, true);

            httpClient
                .beginUpdateQueryDefinition(queryDefinition.project.guid, queryDefinition.id, queryDefinition.queryText).then(
                (query: WITWebApi.IQueryHierarchyItem) => {
                    PerfScenarioManager.addSplitTiming(
                        CIConstants.PerformanceEvents.QUERY_UPDATEQUERY_REQUEST, false);

                    success(<QueryDefinition>QueryItemFactory.create(queryDefinition.project, query));
                },
                (error) => deferred.reject(error));
        }

        return deferred.promise;
    }

    public static beginGetQueryHierarchyNonRoot(parentFolder: QueryFolder): IPromise<WITWebApi.IQueryHierarchyItem> {
        /// <summary>Load non root query hierarchy from a given parent folder with the specified depth</summary>
        /// <param name="parentFolder" type="QueryFolder">Folder to retrieve children for</param>

        const httpClient = parentFolder.project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

        return httpClient.beginGetQueries(parentFolder.project.guid, QueryHierarchy.QUERY_PREFETCH_DEPTH, parentFolder.id);
    }

    /**
     * Gets a query item by given query id or path
     * @param project The project where the query item is from
     * @param idOrPath Query item id or path
     * @param prefetchDepth How many depth to prefetch. This only take effects on query folders
     */
    public static beginGetQueryItemByIdOrPath(project: Project, idOrPath: string, prefetchDepth?: number): IPromise<QueryItem> {
        Diag.Debug.assertParamIsStringNotEmpty(idOrPath, "pathOrId");

        if (typeof prefetchDepth === "undefined") {
            prefetchDepth = QueryHierarchy.QUERY_PREFETCH_DEPTH;
        }

        const httpClient = project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERYHIERARCHY_BEGINGETQUERYBYPATHORID_REQUEST, true);
        return httpClient.beginGetQueries(project.guid, prefetchDepth, idOrPath).then(
            (query: WITWebApi.IQueryHierarchyItem) => {
                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.QUERYHIERARCHY_BEGINGETQUERYBYPATHORID_REQUEST, false);
                return QueryItemFactory.create(project, query);
            });
    }

    public static clearQueryFavoritesCache(project: Project): void {
        delete project.relatedData[QueryHierarchy.QUERY_FAVORITES_PROMISE_KEY];
    }

    public static beginGetQueryFavorites(project: Project, forceRefresh: boolean = false, params?: IDictionaryStringTo<any>): IPromise<IQueryFavoritesData> {
        /// <summary>Get query favorites including my and team</summary>
        /// <param name="forceRefresh" type="boolean" optional="true">If set, a roundtrip to the server will be made in all cases</param>

        if (forceRefresh) {
            project.relatedData[QueryHierarchy.QUERY_FAVORITES_PROMISE_KEY] = null;
        }

        const queryFavoritesPromise: IPromise<IQueryFavoritesData> = <IPromise<IQueryFavoritesData>>project.relatedData[QueryHierarchy.QUERY_FAVORITES_PROMISE_KEY];

        if (queryFavoritesPromise) {
            return queryFavoritesPromise;
        }

        const deferredQueryFavorites = Q.defer<IQueryFavoritesData>();
        project.relatedData[QueryHierarchy.QUERY_FAVORITES_PROMISE_KEY] = deferredQueryFavorites.promise;

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERYHIERARCHY_GETQUERYFAVORITES_REQUEST, true);

        Ajax.getMSJSON(this.getApiLocationIncludingTeam(project, "queryFavorites", params), null,
            (queryFavorites: IQueryFavoritesData) => {
                PerfScenarioManager.addSplitTiming(
                    CIConstants.PerformanceEvents.QUERYHIERARCHY_GETQUERYFAVORITES_REQUEST, false);


                QueryHierarchyCIEvents.publishEvent(
                    QueryHierarchyCIEvents.EVENTS_FAVORITES_POPULATED,
                    {
                        myFavoritesCount: queryFavorites.myFavorites ? queryFavorites.myFavorites.length : 0,
                        teamFavoritesCount: queryFavorites.teamFavorites ? queryFavorites.teamFavorites.length : 0
                    });

                deferredQueryFavorites.resolve(queryFavorites);
            },
            (error) => deferredQueryFavorites.reject(error));

        return deferredQueryFavorites.promise;
    }

    public triggerUpdate() {
        /// <summary>Fire event that query hierarchy has been updated</summary>

        $(window).trigger(QueryHierarchy.EVENT_CHANGED, this);
    }

    private _triggerRefresh() {
        /// <summary>Fire event that complete query hierarchy has been refreshed</summary>

        $(window).trigger(QueryHierarchy.EVENT_REFRESHED, this);
    }

    private static _beginGetQueryHierarchyRaw(project: Project): IPromise<WITWebApi.IQueryHierarchyItem> {
        /// <summary>Load data for query hierarchy using REST api</summary>

        const httpClient = project.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

        return httpClient.beginGetRootQueries(project.guid, QueryHierarchy.ROOT_QUERY_PREFETCH_DEPTH).then(
            (queries: WITWebApi.IQueryHierarchyItem[]) => {
                const queryHierarchyData: WITWebApi.IQueryHierarchyItem = {
                    id: Utils_String.EmptyGuidString,
                    name: "",
                    path: "",
                    hasChildren: true,
                    isFolder: true,
                    isPublic: false,
                    children: queries,
                };

                return queryHierarchyData;
            });
    }

    private _beginGetAdHocQueriesRefreshCache(): IPromise<IQueryHierarchyData> {
        /// <summary>Load ad hoc queries and clean any cache before</summary>

        this.project.relatedData[QueryHierarchy.ADHOC_QUERIES_PROMISE_KEY] = null;

        return QueryHierarchy.beginGetAdHocQueries(this.project);
    }

    private static _transform(old: IQueryItemData): WITWebApi.IQueryHierarchyItem {
        if (!old) {
            return null;
        } else {
            return {
                id: old.id,
                isFolder: old.folder,
                name: old.name,
                wiql: old.query,
                path: null,
                isPublic: false, // Default to false
                hasChildren: false, // Cannot determine, default to false
                children: null // Default to null
            };
        }
    }

    private _loadAdHocQueries(data: IQueryHierarchyData) {
        /// <summary>Loads the special assigned to me and unsaved work items queries from given data</summary>
        /// <param name="data" type="IQueryHierarchyData">Data to load queries from</param>

        // Recycle Bin query
        const item =  new QueryDefinition(this.project, QueryHierarchy._transform(data.recycleBin));
        item.specialQuery = true;
        item.name = Resources.RecycleBin;
        this.all[item.id] = item;
        this.add(item);
    }

    public static getApiLocation(project: Project, action?: string, params?: any): string {
        return QueryHierarchy._getApiLocation(project, false, action, params);
    }

    private static getApiLocationIncludingTeam(project: Project, action?: string, params?: any): string {
        return QueryHierarchy._getApiLocation(project, true, action, params);
    }

    private static _getApiLocation(project: Project, includeTeam: boolean, action?: string, params?: any): string {
        const teamOptions: any = {};
        if (!includeTeam) {
            // Prevent current team from being added to the api location.
            teamOptions.team = "";
        }

        return project.store.getTfsContext().getActionUrl(action || "", "wit", $.extend({ project: project.guid, area: "api" }, teamOptions, params));
    }
}

VSS.initClassPrototype(QueryHierarchy, {
    root: true,
    all: null,
    sortModifier: -1,
    myQueries: null,
    sharedQueries: null,
    assignedToMe: null,
    createdByMe: null,
    unsavedWorkItems: null
});
