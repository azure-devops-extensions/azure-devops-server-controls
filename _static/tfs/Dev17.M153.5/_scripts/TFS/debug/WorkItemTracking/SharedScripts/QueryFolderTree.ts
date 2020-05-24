///<amd-dependency path="VSS/Utils/Draggable"/>

import TFS_Controls_Common = require("Presentation/Scripts/TFS/TFS.UI.Controls.Common");
import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Array = require("VSS/Utils/Array");
import Diag = require("VSS/Diag");
import { MessageDialog } from "VSS/Controls/Dialogs";
import { ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { QueryResultsProvider, SearchResultsProvider, WorkItemsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { QueryUIEvents } from "WorkItemTracking/Scripts/Utils/Events";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { QueryHierarchyCIEvents } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";
import { IQueryFavoriteItem, IQueryFavoritesData, QueryDefinition, QueryFolder, QueryHierarchy, QueryItemFactory, QueryItem } from "WorkItemTracking/SharedScripts/QueryHierarchy";
import Menus = require("VSS/Controls/Menus");
import Navigation_Services = require("VSS/Navigation/Services");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import VSS = require("VSS/VSS");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Events_Handlers = require("VSS/Events/Handlers");
import Events_Services = require("VSS/Events/Services");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import Utils_UI = require("VSS/Utils/UI");
import TreeView = require("VSS/Controls/TreeView");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import Q = require("q");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");

export const HOMEPAGE_PINNING_AREA = "HomePagePinning";

const CommonMenuItems = TFS_Controls_Common.CommonMenuItems;
const handleError = VSS.handleError;
const TfsContext = TFS_Host_TfsContext.TfsContext;
const delegate = Utils_Core.delegate;

export module QueryUtils {
    export function sortChildren(queryItem: QueryItem, childrenToSort: QueryItem[]): QueryItem[] {
        /// <summary>Sorts the given array in relation to the given query item</summary>
        /// <param name="queryItem" type="QueryItem">QueryItem</param>
        /// <param name="childrenToSort" type="QueryItem[]">Array of items to sort</param>
        /// <returns>Sorted copy of the given children</returns>

        // Create a copy of the input array
        const newChildren = [].concat(<any>childrenToSort); // Cast to any to workaround a typescript bug

        newChildren.sort((item1, item2) => {
            if (item1 instanceof QueryFolder) {
                if (!(item2 instanceof QueryFolder)) {
                    // Folders are first
                    return -1 * queryItem.sortModifier;
                }
            }
            else if (item2 instanceof QueryFolder) {
                // Folders are first
                return 1 * queryItem.sortModifier;
            }

            if (item1.sortPrefix === item2.sortPrefix) {
                return Utils_String.localeIgnoreCaseComparer(item1.name, item2.name);
            }

            return item1.sortPrefix - item2.sortPrefix;
        });

        return newChildren;
    }
}

export enum QueryTreeNodeType {
    QueryItem,
    FavoriteItem
}

export class QueryTreeNode extends TreeView.TreeNode {
    public queryItem: QueryItem;

    public queryId: string;
    public queryPath: string;

    public itemId: number;
    public favoriteId: string;
    public favoriteItem: TFS_OM_Common.FavoriteItem;

    public workItemId: number;
    public workItemTempId: number;

    public nodeType: QueryTreeNodeType;

    public parent: QueryTreeNode;
    public children: QueryTreeNode[];

    // Flag indicating whether this node can be dragged (and dragging code needs to be setup)
    public draggable: boolean;

    constructor(text: string) {
        super(text);
    }

    public clear() {
        super.clear();
    }

    public getContributionContext() {
        return <any>{
            query: QueryItemFactory.queryItemToQueryHierarchyItem(this.queryItem)
        };
    }
}

VSS.initClassPrototype(QueryTreeNode, {
    queryItem: null,

    queryId: null,
    queryPath: null,

    itemId: null,
    favoriteId: null,
    favoriteItem: null,

    workItemId: -1,
    workItemTempId: -1,

    nodeType: 0,

    parent: null,
    children: [],

    draggable: false
});

export interface QueryFolderTreeOptions extends TreeView.ITreeOptions {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    errorHandler: any;
    disableDragDrop?: boolean;
}

export class QueryFolderTree extends TreeView.TreeViewO<QueryFolderTreeOptions> {
    public static CONTRIBUTION_ACTION: string = "contribution";

    public static _typeName: string = "tfs.wit.queryfoldertree";

    public static EVENT_HIERARCHY_REFRESHED = "query-hierarchy-refresh-done";

    private _store: WITOM.WorkItemStore;
    private _project: WITOM.Project;
    private _workItemManager: WorkItemManager;
    protected _queryHierarchy: QueryHierarchy;

    private _favItemsMap: { [index: string]: TFS_OM_Common.FavoriteItem };
    private _teamFavItemsMap: { [index: string]: TFS_OM_Common.FavoriteItem };

    private _myFavorites: TFS_OM_Common.FavoriteStore;
    private _teamFavorites: TFS_OM_Common.FavoriteStore;

    private _enableTeamActions: boolean;
    private _queryAction: string;
    private _dirtyWorkItemsCount: number;
    private _workItemChangedDelegate: any;
    private _recentItemsFolderNode: any;

    private _requestedSelectionQueryId: string;

    private _initializeDeferred: Q.Deferred<void> = Q.defer<void>();

    // This tree is based on a strongly typed QueryTreeNode, override field from base class
    public rootNode: QueryTreeNode;

    constructor(options?) {
        /// <summary>Creates new Query Folder Tree Control</summary>

        super(options);

        this.rootNode = new QueryTreeNode('root');
        this.rootNode.root = true;
        this.rootNode.expanded = true; // Root is always expanded

        this._workItemChangedDelegate = Utils_Core.throttledDelegate(this, 200, this._onWorkItemChanged);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />

        options = options || {};

        // append detailed drag/drop settings
        if (!options.disableDragDrop) {
            this._enableDragDrop(options);
        }

        super.initializeOptions($.extend({
            earlyInitialize: false,
            clickToggles: true,
            clickSelects: false,
            sortMenuItems: false,
            contextMenu: {
                executeAction: delegate(this, this._onPopupItemClick),
                "arguments": (contextInfo) => {
                    return {
                        item: contextInfo.item,
                        querydefinition: contextInfo.item, // for save-query-as
                        queryPath: contextInfo.item.queryPath,
                        queryId: contextInfo.item.queryId,
                        isFolder: Boolean(contextInfo.item.folder),
                        project: this._project,
                        source: QueryUIEvents.EVENT_SOURCE_QUERYFOLDERTREE
                    };
                },
                contributionIds: ["ms.vss-work-web.work-item-query-menu"],
                suppressInitContributions: true
            },
            useArrowKeysForNavigation: true,
            setTitleOnlyOnOverflow: true,
            useBowtieStyle: false
        }, options));
    }

    public ensureInitialized() {
        /// <summary>Ensure that the control has been initialized</summary>

        this._ensureInitialized();
    }

    public initialize() {
        let projectId;
        let favoriteData: IQueryFavoritesData;

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERYHIERARCHY_POPULATE, true);

        Diag.Measurement.start("queryHierarchy-initialize", m => {
            projectId = this._options.tfsContext.navigation.projectId;
            Diag.Debug.assert(projectId, "Need a project to work.");

            super.initialize();

            this._attachEvents();

            const synchronizedPopulate = () => {
                if (this._queryHierarchy
                    && (this._myFavorites || favoriteData)
                    && (!this._options.tfsContext.currentTeam || this._teamFavorites || favoriteData)) {

                    if (favoriteData) {
                        this._buildFavoriteStores(favoriteData);
                    }

                    this.populate();

                    Diag.logTracePoint("QueryFolderTree.refresh.complete");

                    // Apply any selection that might have been queued up before the tree had been initialized
                    this._applyRequestedSelection();

                    PerfScenarioManager.addSplitTiming(
                        CIConstants.PerformanceEvents.QUERYHIERARCHY_POPULATE, false);

                    m.finish();
                    this._initializeDeferred.resolve(null);
                    this._fire(QueryFolderTree.EVENT_HIERARCHY_REFRESHED);
                }
            }

            this._store = TFS_OM_Common.ProjectCollection.getConnection(this._options.tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
            this._store.beginGetProject(
                projectId,
                project => {
                    this._project = project;

                    this._workItemManager = WorkItemManager.get(project.store);
                    this._workItemManager.attachWorkItemChanged(this._workItemChangedDelegate);

                    // Get query hierarchy
                    QueryHierarchy.beginGetQueryHierarchy(project).then(
                        (queryHierarchy: QueryHierarchy) => {

                            this._queryHierarchy = queryHierarchy;

                            synchronizedPopulate();
                        },
                        delegate(this, this._errorHandler)
                    );

                    // Enable team favorite actions
                    this._enableTeamActions = Boolean(this._options.tfsContext.currentTeam);

                    // Get favorites independent of query hierarchy
                    QueryHierarchy.beginGetQueryFavorites(project, false, { teamid: this._options.tfsContext.currentTeam.identity.id }).then(
                        (favorites: IQueryFavoritesData) => {
                            favoriteData = favorites;

                            synchronizedPopulate();
                        },
                        delegate(this, this._errorHandler));
                },
                delegate(this, this._errorHandler));
        });
    }

    public getInitializedPromise() {
        return this._initializeDeferred.promise;
    }

    public _dispose() {
        if (this._workItemManager) {
            this._workItemManager.detachWorkItemChanged(this._workItemChangedDelegate);
            this._workItemManager = null;
        }

        this._project = null;
        this._store = null;
        this._queryHierarchy = null;

        super._dispose();
    }

    public beginRefresh(nonStoredQueries, callback, errorCallback?) {
        let favoriteData: IQueryFavoritesData;
        let pendingOperations: number = 0;
        const synchronizedRefresh = () => {
            pendingOperations--;
            if (pendingOperations === 0) {
                afterRefresh();
            }
        }
        const afterRefresh = () => {
            if (nonStoredQueries) {
                this._insertQueries(nonStoredQueries);
            }

            if (favoriteData) {
                this._buildFavoriteStores(favoriteData);
            }

            this.populate();
            this._fire(QueryFolderTree.EVENT_HIERARCHY_REFRESHED);

            if ($.isFunction(callback)) {
                callback.call(this);
            }
        }

        pendingOperations++;
        this._queryHierarchy.beginRefresh().then(synchronizedRefresh, errorCallback);

        pendingOperations++;
        QueryHierarchy.beginGetQueryFavorites(this._project, true).then(
            (favorites: IQueryFavoritesData) => {
                favoriteData = favorites;
                synchronizedRefresh();
            },
            null
        );
    }

    public populate() {
        /// <summary>Populates an initial data set for the QueryFolderTree, prepares the TreeView data and renders it.</summary>

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERYHIERARCHY_POPULATEFOLDERTREE, true);

        this.rootNode.clear();
        this._favItemsMap = {};
        this._teamFavItemsMap = {};

        // Build lookup tables for favorite items
        Utils_UI.walkTree.call(this._myFavorites, (favItem: TFS_OM_Common.FavoriteItem) => {
            if (favItem.type === TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_WIT_QUERYITEM) {
                this._favItemsMap[favItem.data] = favItem;
            }
        });

        if (this._teamFavorites) {
            Utils_UI.walkTree.call(this._teamFavorites, (favItem: TFS_OM_Common.FavoriteItem) => {
                if (favItem.type === TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_WIT_QUERYITEM) {
                    this._teamFavItemsMap[favItem.data] = favItem;
                }
            });
        }

        this._updateTreeNode(this.rootNode, this._queryHierarchy);

        this._draw();

        PerfScenarioManager.addSplitTiming(
            CIConstants.PerformanceEvents.QUERYHIERARCHY_POPULATEFOLDERTREE, false);
    }

    public _updateNode(li: JQuery, treeNode: QueryTreeNode, level: number) {
        // Removing favorites icon with Pinning feature.
        const divNodeContent = super._updateNode(li, treeNode, level);

        return divNodeContent;
    }

    public findNodesByQueryId(queryId: string) {
        return this._findNodesByField(queryId, "queryId");
    }

    public findNodesByWorkItemId(id) {
        if (id === 0 || !this._recentItemsFolderNode) {
            return null;
        }
        else if (id > 0) {
            // Bug 1475956: Since we know that we're searching based on a work item id, search only
            // in sub-trees that contain work items.
            return this._findNodesByField(id, "workItemId", this._recentItemsFolderNode);
        }
        else {
            // Bug 1475956: Only search in work item subtree.
            return this._findNodesByField(id, "workItemTempId", this._recentItemsFolderNode);
        }
    }

    public findNodesByNewQueryId(newQueryId: string) {
        const result = [];
        Utils_UI.walkTree.call(this.rootNode, function (treeNode) {
            if (treeNode.queryItem && !treeNode.queryId && treeNode.queryItem.newQueryId === newQueryId) {
                result.push(treeNode);
            }
        });

        return result;
    }

    public findNodesByQuery(query: QueryItem): QueryTreeNode[] {
        /// <summary>Find existing nodes in this tree for a given query item</summary>
        /// <param name="query" type="QueryItem">QueryItem to find nodes for</param>

        let results = [];

        if (query.id) {
            results = this.findNodesByQueryId(query.id);
        }

        if (results.length === 0 && query.newQueryId) {
            results = this.findNodesByNewQueryId(query.newQueryId);
        }

        return results;
    }

    public updateLinks(action: string, nodeToUpdate?: QueryTreeNode) {
        /// <summary>Updates the link triggered by clicking on a query</summary>
        /// <param name="action" type="string">Action to execute</param>
        /// <param name="nodeToUpdate" type="string">The target tree node to be updated, defaults to the rootNode if not specified</summary>

        const scrollPos = this._element.scrollTop();
        if ((this._queryAction !== action) || nodeToUpdate) {
            this._queryAction = action;

            const targetNode: QueryTreeNode = nodeToUpdate ? nodeToUpdate : this.rootNode;
            this._updateNodeLink(targetNode);
            this._draw();
            this._element.scrollTop(scrollPos);
        }
    }

    public onItemClick(treeNode, nodeElement, e?) {
        let result, $target, workItem;

        $target = $(e.target);

        if ($target.hasClass("quick-delete")) {
            Menus.menuManager.executeCommand(new Events_Handlers.CommandEventArgs("delete-query", {
                project: this._project,
                queryPath: treeNode.queryItem && treeNode.queryItem.path()
            }, null));
            result = false;
        }
        else {
            result = super.onItemClick(treeNode, nodeElement, e);

            if (treeNode && treeNode.folder) {
                e.preventDefault();
            }
            else if (treeNode) {

                const eventProperties = {
                    queryId: treeNode.queryId ? treeNode.queryId : null, // NULL, if not a query node selected
                    favoriteId: treeNode.favoriteId ? treeNode.favoriteId : null
                };

                if (treeNode.favoriteItem && treeNode.favoriteItem.favStore) {
                    // Add favorite store info for favorite item
                    $.extend(eventProperties, { favoriteStore: treeNode.favoriteItem.favStore.name });
                }

                QueryHierarchyCIEvents.publishEvent(QueryHierarchyCIEvents.EVENTS_TREE_NODE_SELECTED, eventProperties);
            }
        }

        return result;
    }

    public toggleMyFavorite(node: QueryTreeNode) {
        /// <summary>If the given node is currently in 'my favorites' it's removed, otherwise it's added to the favorites</summary>
        /// <param name="node" type="QueryTreeNode">Node representing the query item to toggle</param>

        const myFavItem = this._getNodeFavItem(node);
        if (myFavItem) {
            myFavItem.beginDelete();
        }
        else {
            this._myFavorites.beginCreateNewItem(node.text, TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_WIT_QUERYITEM, node.queryItem.id);
        }
    }

    public setSelectedNode(node: TreeView.TreeNode, suppressChangeEvent?: boolean) {
        /// <param name="suppressChangeEvent" type="boolean" optional="true" />
        if (node && node.config && node.config.unselectable) {
            return;
        }

        super.setSelectedNode(node, suppressChangeEvent);
    }

    public setErrorHandler(errorHandler: Function) {
        /// <summary>Set error handler to be called in case an error occurs. Has to be a delegate
        /// to ensure 'this' points to the correct object</summary>

        this._options.errorHandler = errorHandler;
    }

    public requestSelection(queryId: string) {
        /// <summary>Request the query with the given id to be selected once the tree has been initialized</summary>
        /// <param name="queryId" type="string">Id of query to select</param>        

        this._requestedSelectionQueryId = queryId;
    }

    public onShowPopupMenu(node: QueryTreeNode, options?) {
        if (node.nodeType !== QueryTreeNodeType.QueryItem) {
            super.onShowPopupMenu(node, options);
            return;
        }

        const menuItems: Menus.IMenuItemSpec[] = [],
            queryItem: QueryItem = node.queryItem;

        if (queryItem instanceof QueryFolder) {
            menuItems.push(
                { id: "new-query", text: Resources.NewQuery, icon: "bowtie-icon bowtie-math-plus", setTitleOnlyOnOverflow: true },
                { id: "new-query-folder", text: Resources.NewQueryFolder, icon: "bowtie-icon bowtie-folder", setTitleOnlyOnOverflow: true });

            const queryFolder = <QueryFolder>queryItem;
            if (!queryFolder.specialFolder) {
                menuItems.push(
                    { separator: true },
                    { id: "delete-query", text: Resources.DeleteQuery, icon: "bowtie-icon bowtie-edit-delete", setTitleOnlyOnOverflow: true },
                    { id: "rename-query", text: Resources.RenameQuery, icon: "bowtie-icon bowtie-edit-rename", setTitleOnlyOnOverflow: true });
            }

            if (!queryItem.personal) {
                // Enable option to change security settings
                menuItems.push({ separator: true });
                menuItems.push($.extend({ setTitleOnlyOnOverflow: true }, CommonMenuItems.security()));
            }
        } else if (queryItem instanceof QueryDefinition) {
            const queryDefinition = <QueryDefinition>queryItem;

            if (queryDefinition.specialQuery) {
                menuItems.push({ id: "run-query", text: Resources.RunQuery, title: Resources.RunQuery, icon: "bowtie-icon bowtie-status-run" });

                if (this._isUneditableSpecialQuery(queryDefinition)) {
                    menuItems.push(
                        { id: "edit-query", text: Resources.EditQuery, icon: "bowtie-icon bowtie-edit-outline", setTitleOnlyOnOverflow: true },
                        { separator: true },
                        { id: "save-query-as", text: Resources.SaveQueryAs, icon: "bowtie-icon bowtie-save-as", setTitleOnlyOnOverflow: true });
                }
            } else {
                menuItems.push(
                    { id: "run-query", text: Resources.RunQuery, title: Resources.RunQuery, icon: "bowtie-icon bowtie-status-run", setTitleOnlyOnOverflow: true },
                    { id: "edit-query", text: Resources.EditQuery, icon: "bowtie-icon bowtie-edit-outline", setTitleOnlyOnOverflow: true },
                    { separator: true },
                    { id: "delete-query", text: Resources.DeleteQuery, icon: "bowtie-icon bowtie-edit-delete", setTitleOnlyOnOverflow: true });

                if (queryItem.id) {
                    menuItems.push(
                        { id: "rename-query", text: Resources.RenameQuery, icon: "bowtie-icon bowtie-edit-rename", setTitleOnlyOnOverflow: true });
                } else if (queryItem.newQueryId) {
                    menuItems.push(
                        { id: "save-query-as", text: Resources.SaveQueryAs, icon: "bowtie-icon bowtie-save-as", setTitleOnlyOnOverflow: true });
                }
            }
        }

        if (queryItem.id
            && !(queryItem instanceof QueryDefinition && (<QueryDefinition>queryItem).specialQuery)
            && !(queryItem instanceof QueryFolder)) {
            menuItems.push({ separator: true });

            if (this._getNodeFavItem(node)) {
                menuItems.push($.extend({ setTitleOnlyOnOverflow: true }, CommonMenuItems.removeFromMyFavs()));
            }
            else {
                menuItems.push($.extend({ setTitleOnlyOnOverflow: true }, CommonMenuItems.addToMyFavs()));
            }

            if (this._enableTeamActions) {
                if (this._teamFavItemsMap[queryItem.id]) {
                    // Only admins should be able to add and remove from Team Favorites.
                    menuItems.push($.extend({ setTitleOnlyOnOverflow: true }, CommonMenuItems.removeFromTeamFavs(false)));
                } else if (!node.queryItem.personal) {
                    // Only admins should be able to add and remove from Team Favorites.                            
                    menuItems.push($.extend({ setTitleOnlyOnOverflow: true }, CommonMenuItems.addToTeamFavs(false)));
                }
            }

            if (!queryItem.personal) {
                menuItems.push({ separator: true });
                menuItems.push($.extend({ setTitleOnlyOnOverflow: true }, CommonMenuItems.security()));
            }

        }

        options = $.extend({}, options, { items: menuItems });
        super.onShowPopupMenu(node, options);
    }

    private _isUneditableSpecialQuery(queryDefinition: QueryDefinition) {
        return (!(QueryDefinition.isUnsavedWorkItems(queryDefinition) || QueryDefinition.isFollowedWorkItems(queryDefinition)));
    }

    public _toggle(node: QueryTreeNode, nodeElement: any): boolean {
        if (node.expanded === false // Node will be expanded now
            && node.nodeType === QueryTreeNodeType.QueryItem
            && node.folder) {
            const queryFolder = <QueryFolder>node.queryItem;

            if (queryFolder.hasChildren) {
                Diag.logVerbose('prefetching for node ' + node.queryId + ' ' + queryFolder.name);

                node.emptyFolderNodeText = Resources.QueryTree_Loading;

                queryFolder.beginLoadChildren().then(
                    (updatedFolder) => {
                        let focusedNode;
                        if (this._focusedNode) {
                            focusedNode = this._getNode(this._focusedNode);
                        }

                        // Update tree structure
                        this._updateTreeNode(node, updatedFolder);

                        // Update visual representation
                        this.updateNode(node);

                        // Restore selection as a subtree might have been replaced during the update
                        if (focusedNode) {
                            const focusedNodeElement = this._getNodeElement(focusedNode);
                            this._setFocusElement(focusedNodeElement);
                            focusedNodeElement.children("a:first").focus();
                        }

                        // Restore original text
                        node.emptyFolderNodeText = VSS_Resources_Platform.NoItemsInThisFolder;

                        Diag.logVerbose(' done prefetching ' + queryFolder.name);
                    },
                    (error) => this._errorHandler(error)
                );
            }
        }

        return super._toggle(node, nodeElement);
    }

    private _errorHandler(error: any) {
        handleError(error, this._options.errorHandler, this);
    }

    private _applyRequestedSelection() {
        if (this._initialized && this.rootNode && this._requestedSelectionQueryId) {
            this._queryHierarchy.beginFindQueryById(this._requestedSelectionQueryId).then(
                (queryItemToSelect: QueryItem) => {
                    const nodeToSelect = this.findNodesByQueryId(queryItemToSelect.id);

                    if (nodeToSelect && nodeToSelect[0]) {
                        this.setSelectedNode(nodeToSelect[0]);

                        this._requestedSelectionQueryId = "";
                    }
                });
        }
    }

    private _buildFavoriteStores(favoriteData: IQueryFavoritesData) {
        /// <summary>Build favorite stores from externally (i.e., not using the store api) retrieved data</summary>

        const mapFavoriteItemData = (store: TFS_OM_Common.FavoriteStore, favoriteData: IQueryFavoriteItem): TFS_OM_Common.FavoriteItem => {
            const favoriteItem = new TFS_OM_Common.FavoriteItem(store, {
                id: favoriteData.id,
                name: favoriteData.queryItem.name,
                data: favoriteData.queryItem.id,
                type: TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_WIT_QUERYITEM,
                parentId: null
            });

            if (!this._queryHierarchy.all[favoriteData.queryItem.id]) {
                // Item does not exist in hierarchy, yet, save item for now. Later, when the real item in the tree is loaded,
                // it will be overwritten
                this._queryHierarchy.all[favoriteData.queryItem.id] = QueryItemFactory.create(this._project, favoriteData.queryItem)
            }

            return favoriteItem;
        };

        this._myFavorites = TFS_OM_Common.FavoriteStore.getFavoriteStore(
            this._options.tfsContext, TFS_Host_TfsContext.NavigationContextLevels.Project, null,
            TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_QUERIES, TFS_Resources_Presentation.MyFavoritesText);
        if (favoriteData.myFavorites) {
            for (const val of favoriteData.myFavorites) {
                this._myFavorites.add(mapFavoriteItemData(this._myFavorites, val));
            }
        }

        if (favoriteData.teamFavorites && favoriteData.teamFavorites.length > 0) {
            this._teamFavorites = TFS_OM_Common.FavoriteStore.getFavoriteStore(
                this._options.tfsContext, TFS_Host_TfsContext.NavigationContextLevels.Team, this._options.tfsContext.currentTeam.identity.id,
                TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_QUERIES, TFS_Resources_Presentation.TeamFavoritesText);
            for (const val of favoriteData.teamFavorites) {
                this._teamFavorites.add(mapFavoriteItemData(this._teamFavorites, val));
            }
        }
    }

    private _attachEvents() {
        this._bind(
            window,
            [
                QueryItem.EVENT_REMOVED, QueryItem.EVENT_RENAMED, QueryItem.EVENT_CREATED, QueryItem.EVENT_SAVED, QueryItem.EVENT_MOVED,
                QueryHierarchy.EVENT_CHANGED,
                QueryUIEvents.EVENT_FOLDERTREE_SET_FOCUS_ITEM
            ].join(' '),
            delegate(this, this._onQueryHierarchyEvent),
            true);
        this._bind(window, "favorite-item-removed favorite-item-renamed favorite-item-created favorite-item-saved", delegate(this, this._onFavoriteItemEvent), true);
        Events_Services.getService().attachEvent(WorkItemsProvider.EVENT_QUERY_PROVIDER_DIRTY_CHANGED, delegate(this, this._onProviderStateChanged));
    }

    private _enableDragDrop(options?: any) {
        /// <summary>Called to enable JQuery drag and drop mode behavior.</summary>  
        /// <param name="options" type="Object">The control options object.</param>
        Diag.Debug.assertParamIsObject(options, "options");

        const that = this; // Required to work with jQuery event handlers

        options.draggable = $.extend({
            scroll: false,                  // Disable JQuery auto-scrolling.
            dropBehaviour: false,
            appendTo: document.body,        // append to body to allow for free drag/drop                    
            scrollables: [".query-folder-tree"],  // a list of selectors to identify elements that the tile will scroll wile dragging
            distance: 20,                   // start the drag if the mouse moved more than 20px, this will prevent accidential drag/drop
            helper: function (event) { return that._draggableHelper(this, event); },
            start: function (event, ui) {
                ///<summary>JQuery Event handler to start the QueryFolderTree parent control for drag hover style management, and suppress focus styling.</summary>                        

                const treeNode: QueryTreeNode = $(this).data(TreeView.TreeView.NODE_DATA_NAME);
                //Abort drag if this node does not have a persisted ID (New Query).
                if (!treeNode.queryItem.id) {
                    return false;
                }

                that.enableFocusStyling(false);
            },
            stop: function (event, ui) {
                ///<summary>JQuery Event handler to stop the QueryFolderTree parent control drag for hover style management, and re-engage normal focus styling.</summary>                        
                that.enableFocusStyling(true);
            }
        }, options.draggable);

        options.droppable = $.extend({
            hoverClass: "droppable-hover",
            tolerance: "pointer",
            accept: function ($draggable) { return that._droppableAccept(this, $draggable); },
            drop: function (event, ui) { return that._droppableDrop(this, event, ui); },
            greedy: true // ensure that the most local/specific elements get to accept the drop first, not the parents                    
        }, options.droppable);
    }

    private _draggableHelper(draggableTreeNodeElement: any, event: any) {
        /// <summary>Called to create a jQuery draggable helper element for the TreeNode contained by this TreeView.</summary>
        /// <param name="draggableTreeNodeElement" type="Object">The draggable tree node requiring a helper object.</param>
        /// <param name="event" type="Object">The event which initiated this call</param>

        Diag.Debug.assertParamIsObject(draggableTreeNodeElement, "draggableTreeNodeElement");
        Diag.Debug.assertParamIsObject(event, "event");

        let nodeDataClone: any = $.extend({}, $(draggableTreeNodeElement).data(TreeView.TreeView.NODE_DATA_NAME)),
            nodelevel = $(draggableTreeNodeElement).data(TreeView.TreeView.LEVEL_DATA_NAME),
            $li = $("<li />").addClass("tree-drag-tile"),
            divNodeContent;

        // Label as collapsed to ensure children are not rendered
        nodeDataClone.expanded = false;

        // Label as unselected to prevent conflicting style applications
        nodeDataClone.selected = false;

        // Disallow droppable to prevent self-referential drop of folder onto helper
        nodeDataClone.droppable = false;

        // Populate the helper data under this list item 
        divNodeContent = this._updateNode($li, nodeDataClone, nodelevel);

        // Size our helper content to be consistent with the element the user is trying to drag.
        $li.css("width", draggableTreeNodeElement.clientWidth);

        return $li;
    }

    private _droppableAccept(droppableTreeNodeElement: any, $draggable: JQuery) {
        /// <summary>Determine whether the drag/drop pair contained by this TreeView is accepted.</summary>
        /// <param name="droppableTreeNodeElement" type="Object">The droppable TreeNode being tested for for drop by this method.</param>
        /// <param name="$draggable" type="jQuery">The jQuery draggable object being checked for acceptance by this method.</param>

        Diag.Debug.assertParamIsObject(droppableTreeNodeElement, "droppableTreeNodeElement");
        Diag.Debug.assertParamIsJQueryObject($draggable, "$draggable");

        let destTreeNode: QueryTreeNode = $(droppableTreeNodeElement).data(TreeView.TreeView.NODE_DATA_NAME),
            sourceTreeNode: QueryTreeNode = $draggable.data(TreeView.TreeView.NODE_DATA_NAME),
            provider;

        // JQuery Accept method gets called once following a drop, and will fail due to the view reparenting change.
        if (!sourceTreeNode) {
            return false;
        }

        //only folders can accept queries
        if (destTreeNode.folder) {

            //Reject dirty queryItem
            if (sourceTreeNode.queryItem instanceof QueryItem) {
                provider = QueryResultsProvider.peek(sourceTreeNode.queryItem);

                if (provider && provider.isDirty()) {
                    return false;
                }
            }

            if (destTreeNode.favoriteItem instanceof TFS_OM_Common.FavoriteFolder) {
                if (sourceTreeNode.folder) {
                    // Dropping a folder onto a favorite folder is not allowed
                    return false;
                }

                if (destTreeNode.favoriteItem === this._teamFavorites) {
                    // Dropping onto team favorites requires a shared query being dragged and team admin permission
                    if (sourceTreeNode.queryItem.personal) {
                        return false;
                    }
                }
            }

            return true;
        }

        return false;
    }

    private _droppableDrop(droppable: any, event: any, ui: any) {
        /// <summary>Drop the dragged object to the drop point.</summary>
        /// <param name="droppable" type="object">The droppable object which initiated this call.</param>
        /// <param name="event" type="Object">Event data provided from the jQuery drop event.</param>
        /// <param name="ui" type="Object">The draggable object.</param>

        Diag.Debug.assertParamIsObject(droppable, "droppable");
        Diag.Debug.assertParamIsObject(event, "event");
        Diag.Debug.assertParamIsObject(ui, "ui");

        let destNodeElement = $(droppable),
            destTreeNode = destNodeElement.data(TreeView.TreeView.NODE_DATA_NAME),

            sourceNodeElement = ui.draggable[0],
            sourceTreeNode: QueryTreeNode = $(sourceNodeElement).data(TreeView.TreeView.NODE_DATA_NAME),
            oldParent = sourceTreeNode.parent,
            oldText = sourceTreeNode.text,
            newName,
            oldDraggableState,
            myQueriesName,
            teamQueriesName,
            revertStateOnError = (errorFormat, error) => {
                // Revert active save highlight on fail and move node back to old parent.
                sourceTreeNode.text = oldText;
                this._moveTreeNode(sourceTreeNode, oldParent);

                const originalError = error.message ? error.message : error,
                    message = Utils_String.format(errorFormat, oldText, originalError);
                VSS.errorHandler.showError(message);
            },
            applyPreviewState = (name) => {
                // Apply moving query label
                sourceTreeNode.text = Utils_String.format(Resources.MovingQueryLabel, name);
                this.updateNode(sourceTreeNode);
            };

        if (destTreeNode.favoriteItem instanceof TFS_OM_Common.FavoriteFolder) {
            // Add query as a favorite 
            if (destTreeNode.favoriteItem.findByData(sourceTreeNode.queryItem.id) !== null) {
                // No-op when attempting to add an existing favorite.
                return true;
            }

            QueryHierarchyCIEvents.publishEvent(QueryHierarchyCIEvents.ACTIONS_DRAG_AND_DROP_TREE_NODE, { destination: destTreeNode.favoriteItem.name });

            applyPreviewState(sourceTreeNode.text);
            destTreeNode.favoriteItem.beginCreateNewItem(sourceTreeNode.text, TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_WIT_QUERYITEM, sourceTreeNode.queryItem.id,
                () => { },
                (error) => {
                    revertStateOnError(Resources.DragFavoriteFailed, error);
                });
        }
        else if (destTreeNode.folder) {
            oldDraggableState = $(sourceNodeElement).data('ui-draggable');

            if (destTreeNode === sourceTreeNode.parent) {
                // No-op if we are dragging to parent of dragged element
                return true;
            }

            const moveQuery = () => {
                newName = this._createNewItemName(sourceTreeNode, destTreeNode);
                applyPreviewState(newName);

                this._moveTreeNode(sourceTreeNode, destTreeNode);
                this._expandFromRoot(sourceTreeNode);
                this._bringQueryElementToView(sourceTreeNode.queryItem);

                // Temporarily preserve data for ui.plugin.add("draggable", "cursor", ... stop()) 
                // which would otherwise fail due to removed HTML DOM data for old tree element
                $(sourceNodeElement).data('ui-draggable', oldDraggableState);

                sourceTreeNode.queryItem.beginMove(newName, <QueryFolder>destTreeNode.queryItem).then(
                    () => {
                        // On completion of transaction, we can safely remove the draggable data.
                        $(sourceNodeElement).removeData('ui-draggable');
                    },
                    (error) => {
                        revertStateOnError(Resources.DragQueryMoveFailed, error);
                    });
            }

            // When moving a public query to a private one, prompt the user to allow them to consider consequences
            if (!sourceTreeNode.queryItem.personal && destTreeNode.queryItem.personal) {

                // Get the destination base node path name, omitting the global root
                teamQueriesName = sourceTreeNode.queryItem.path(false).split(QueryItem.DEFAULT_PATH_SEPARATOR)[0];
                myQueriesName = destTreeNode.queryItem.path(false).split(QueryItem.DEFAULT_PATH_SEPARATOR)[0];

                MessageDialog.showMessageDialog(Utils_String.format(Resources.QueryConfirmDragDropOperation, teamQueriesName, myQueriesName))
                    .then(moveQuery);
                return true;
            }
            moveQuery();
        }
        return true;
    }

    public _createNewItemName(sourceTreeNode: QueryTreeNode, destTreeNode: QueryTreeNode) {
        /// <summary>Ensures a new unique name for the source tree node to fit within the destination node's children, starting with the original.</summary>
        /// <param name="sourceTreeNode" type="object">The Tree Node being moved.</param>
        /// <param name="destTreeNode" type="object">The destination to reparent the source under.</param>

        Diag.Debug.assertParamIsObject(sourceTreeNode, "sourceTreeNode");
        Diag.Debug.assertParamIsObject(destTreeNode, "destTreeNode");

        Diag.Debug.assert(sourceTreeNode.parent.queryItem instanceof QueryFolder, "Item to be moved not in a folder");

        let newName = sourceTreeNode.queryItem.name,
            originalName = sourceTreeNode.queryItem.name,
            numberSuffix = 1;

        const destQueryFolder = <QueryFolder>destTreeNode.queryItem;
        const srcQueryFolder = <QueryFolder>(sourceTreeNode.parent.queryItem);

        let nameChanged: boolean = false;
        while (destQueryFolder.findByPath(newName) !== null
            || (nameChanged && srcQueryFolder.findByPath(newName) !== null)) {
            newName = Utils_String.format(Resources.CopyNameTemplate, originalName, numberSuffix++);
            nameChanged = true;
        }

        return newName;
    }

    private _moveTreeNode(sourceTreeNode: QueryTreeNode, destTreeNode: QueryTreeNode) {
        /// <summary>Move the specified Tree Node to reside as a child of the destination Tree Node and update the View state accordingly.</summary>
        /// <param name="sourceTreeNode" type="object">The Tree Node being moved.</param>
        /// <param name="destTreeNode" type="object">The destination to reparent the source under.</param>
        Diag.Debug.assertParamIsObject(sourceTreeNode, "sourceTreeNode");
        Diag.Debug.assertParamIsObject(destTreeNode, "destTreeNode");

        const oldParentTreeNode = sourceTreeNode.parent;

        sourceTreeNode.moveTo(destTreeNode);

        // Update the view using the revised state
        this.updateNode(destTreeNode);
        this.updateNode(oldParentTreeNode);
    }

    private _insertQueries(queriesToInsert: QueryItem[]) {
        /// <summary>Inserts the specified queries into the query hierarchy of the QueryFolderTree.</summary>
        /// <param name="queriesToInsert" type="object">The queries to insert.</param>                

        Diag.Debug.assertParamIsObject(queriesToInsert, "queriesToInsert");

        let i, l, query, pos, path, folderName, queryName, folder;

        for (i = 0, l = queriesToInsert.length; i < l; i++) {
            query = queriesToInsert[i];
            path = query.path();
            pos = path.lastIndexOf(QueryItem.DEFAULT_PATH_SEPARATOR);

            if (pos >= 0) {
                folderName = path.substring(0, pos);
                queryName = path.substring(pos + 1);
                folder = this._queryHierarchy.findByPath(folderName);
                if (folder) {
                    folder.add(query);
                }
            }
            else {
                this._queryHierarchy.add(query);
            }
        }
    }

    private _populateTreeNode(parentNode: QueryTreeNode, node): TreeView.TreeNode {
        /// <summary>Creates & initializes the specified TreeView node as a child of the supplied parentNode, using the supplied OM node data.</summary>

        let childItemCount = 0;

        if (node instanceof QueryItem
            && node.id
            && QueryDefinition.isUnsavedWorkItems(<QueryDefinition>node)) {

            childItemCount = this._dirtyWorkItemsCount;
        }

        let treeNode = new QueryTreeNode(node.name);

        treeNode = this._updateTreeNode(treeNode, node, childItemCount);

        if (treeNode) {
            parentNode.add(treeNode);
        }

        return treeNode;
    }

    private static _filterByFolderType(childrenToFilter: QueryItem[], isFolder: boolean): QueryItem[] {
        const filteredItems = [];

        $.each(childrenToFilter, (i: number, item: QueryItem) => {
            if ((item instanceof QueryFolder) === isFolder) {
                filteredItems.push(item);
            }
        });

        return filteredItems;
    }

    private _updateTreeNode(treeNode: QueryTreeNode, node: any, itemCount?: number) {
        /// <summary> Update the specified treenode object using the backing node data</summary>
        /// <param name="treeNode" type="Object">the tree node object to be updated.</param>
        /// <param name="node" type="Object">Supported node types include QueryItem, TFS_OM_Common.FavoriteItem</param>
        /// <param name="itemCount" type="Number" optional="true">number of elements contained within container objects.</param>        

        const css = [];

        if (node instanceof QueryItem) {
            this._updateQueryTreeNode(treeNode, <QueryItem>node, css);
        } else if (node instanceof TFS_OM_Common.FavoriteItem) {
            if (!this._updateFavoriteTreeNode(treeNode, <TFS_OM_Common.FavoriteItem>node, css)) {
                // Return null to prevent this node from being added to the tree, it might
                // be invalid due to some reason.
                return null;
            }
        }

        if (itemCount) {
            treeNode.text = Utils_String.format("{0} ({1})", treeNode.text, itemCount);
            css.push("query-with-count");
        }

        // Ensure that only query documents & query folders are draggable.
        // Never allow root folders or favorites to be dragged. New Queries are draggable, but disabled until saved.
        if (treeNode.queryItem
            && !(treeNode.queryItem.parent instanceof QueryHierarchy)
            && !treeNode.favoriteItem
            && !this._options.disableDragDrop) {
            treeNode.draggable = true;
        }

        treeNode.config.css = css.join(" ");

        return treeNode;
    }

    private _updateQueryTreeNode(treeNode: QueryTreeNode, queryItem: QueryItem, css: string[], itemCount?: number) {
        treeNode.nodeType = QueryTreeNodeType.QueryItem;

        treeNode.text = queryItem.name;

        treeNode.queryItem = queryItem;
        treeNode.queryPath = queryItem.path();
        treeNode.queryId = queryItem.id;

        treeNode.config.unselectable = false;

        if (this._getNodeFavItem(treeNode)) {
            css.push("starred");
        }

        const provider = QueryResultsProvider.peek(queryItem);
        if (provider && provider.isDirty()) {
            css.push("dirty-query");
        }

        if (queryItem instanceof QueryFolder) {
            const queryFolder: QueryFolder = <QueryFolder>queryItem;

            treeNode.folder = true;
            treeNode.config.unselectable = true;
            treeNode.droppable = this._options.disableDragDrop ? false : true;

            // Add separator above 'My Queries'
            if (queryFolder.specialFolder && queryFolder.personal) {
                css.push("top-separator");
            }

            if (queryFolder.children) {
                let children: any[];
                if (queryFolder instanceof QueryHierarchy
                    && this._options.tfsContext.standardAccessMode === true) {
                    // Folder is root folder of query hierarchy

                    // Special root-level queries first
                    children = <any[]>QueryUtils.sortChildren(queryFolder, QueryFolderTree._filterByFolderType(queryFolder.children, false));

                    // Favorites
                    children.push(this._myFavorites);
                    if (this._teamFavorites) {
                        children.push(this._teamFavorites);
                    }

                    // My/Shared Queries
                    children = children.concat(QueryUtils.sortChildren(queryFolder, QueryFolderTree._filterByFolderType(queryFolder.children, true)));
                } else {
                    children = <any[]>QueryUtils.sortChildren(queryFolder, queryFolder.children);
                }

                const updatedChildren = [];
                for (let i = 0, l: number = children.length; i < l; ++i) {
                    const child = children[i];

                    const existingChildNodeIdx = Utils_Array.findIndex(treeNode.children, (a: QueryTreeNode) => {
                        if (a.queryId) {
                            return a.queryId === child.id
                        } else if (a.favoriteId) {
                            return a.favoriteId === child.id;
                        } else if (a.queryItem && a.queryItem.newQueryId) {
                            return a.queryItem.newQueryId === child.newQueryId;
                        }

                        return false;
                    });

                    if (existingChildNodeIdx !== -1) {
                        // Update existing child
                        const existingChildNode = treeNode.children[existingChildNodeIdx];
                        this._updateTreeNode(existingChildNode, child);

                        updatedChildren.push(existingChildNode);
                    } else {
                        // Add new child
                        if (child) {
                            if (child instanceof QueryItem && QueryDefinition.isRecycleBinQuery(child)) {
                                // hide Recycle Bin query
                            }
                            else {
                                const newChildNode = this._populateTreeNode(treeNode, child);
                                updatedChildren.push(newChildNode);
                            }
                        }
                    }
                }

                // Replace children, this way we do not need to check if any of the existing children have 
                // been removed.
                treeNode.children = updatedChildren;
            }
        }
        else {
            this._updateNodeLink(treeNode);
        }
    }

    private _updateFavoriteTreeNode(treeNode: QueryTreeNode, favoriteItem: TFS_OM_Common.FavoriteItem, css: string[]): boolean {
        treeNode.nodeType = QueryTreeNodeType.FavoriteItem;

        treeNode.favoriteId = favoriteItem.id;
        treeNode.favoriteItem = favoriteItem;

        if (favoriteItem instanceof TFS_OM_Common.FavoriteFolder) {
            const favoriteFolder = <TFS_OM_Common.FavoriteFolder>favoriteItem;

            // Clear children, will be regenerated with list of favorite items
            treeNode.clear();

            treeNode.folder = true;
            treeNode.expanded = true;
            treeNode.noContextMenu = true;
            treeNode.config.unselectable = true;
            treeNode.droppable = this._options.disableDragDrop ? false : true;

            if (favoriteFolder.root) {
                if (favoriteItem.favStore === this._myFavorites) {
                    css.push("top-separator");
                    treeNode.emptyFolderNodeText = this._options.disableDragDrop ? VSS_Resources_Platform.NoItemsInThisFolder : Resources.NoMyFavoriteQueries;
                }
                else {
                    treeNode.emptyFolderNodeText = this._options.disableDragDrop ? VSS_Resources_Platform.NoItemsInThisFolder : Resources.NoTeamFavoriteQueries;
                }
            }

            if (favoriteFolder.children) {
                const children: TFS_OM_Common.FavoriteItem[] = new Array<TFS_OM_Common.FavoriteItem>().concat(favoriteFolder.children);
                children.sort(function (item1, item2) {
                    if (item1 instanceof TFS_OM_Common.FavoriteFolder) {
                        if (!(item2 instanceof TFS_OM_Common.FavoriteFolder)) {
                            //folders are first
                            return -1;
                        }
                    }
                    else if (item2 instanceof TFS_OM_Common.FavoriteFolder) {
                        //folders are first
                        return 1;
                    }

                    return Utils_String.localeIgnoreCaseComparer(item1.name, item2.name);
                });

                for (let i = 0, l = children.length; i < l; ++i) {
                    this._populateTreeNode(treeNode, children[i]);
                }
            }
        } else { // No FavoriteFolder
            // Retrieve item from query hierarchy
            const queryInTree = this._queryHierarchy.findQueryById(favoriteItem.data);
            if (!queryInTree) {
                // Referenced item does not exist in the hierarchy, this favorite items links to a non-existing query item,
                // return false to prevent this node from being added to the tree
                return false;
            }

            this._updateTreeNode(treeNode, queryInTree);

            treeNode.itemId = favoriteItem.id;
            treeNode.title = queryInTree.path();

            this.updateNode(treeNode);
        }

        return true;
    }


    private _findNodesByField(id: any, fieldName: string, startNode?: QueryTreeNode) {
        const result = [];

        fieldName = fieldName || "id";

        Utils_UI.walkTree.call(startNode || this.rootNode, (treeNode) => {
            if (Utils_String.localeIgnoreCaseComparer(id, treeNode[fieldName]) === 0) {
                result.push(treeNode);
            }
        });

        return result;
    }

    private _getNodeFavItem(node: QueryTreeNode) {
        let favItem;
        if (node.queryId) {
            favItem = this._favItemsMap[node.queryId];
        }

        return favItem;
    }

    private _onProviderStateChanged(provider?) {
        if (provider.queryDefinition) {
            $.each(this.findNodesByQuery(provider.queryDefinition), (idx: number, node: QueryTreeNode) => {
                if (node.nodeType === QueryTreeNodeType.QueryItem) {
                    this._updateTreeNode(node, provider.queryDefinition);
                    this.updateNode(node, true); // Prevent focus changing when user is editing the query
                }
            });
        }
    }

    private _onQueryHierarchyEvent(e?, item?) {
        // The type of 'item' currently depends on the event that is triggering this handler, therefore no static typing
        // possible right now.
        let favItem;
        switch (e.type) {
            case QueryItem.EVENT_REMOVED:
                Diag.Debug.assertIsNotNull(item, "item should not be null for QueryItem.EVENT_REMOVED");

                let fallbackTarget: QueryTreeNode = null;
                $.each(this.findNodesByQuery(item), (i: number, node: QueryTreeNode) => {
                    if (node.nodeType === QueryTreeNodeType.QueryItem) {
                        /* Find fallback target post delete - priority from high to low 
                            1) The node below the deleted item 
                            2) The node above the deleted item
                            3) Assigned to me query  */
                        if (node.parent && node.parent.children) {
                            let quitFlag = false;
                            node.parent.children.some((value: QueryTreeNode) => {
                                if (value.queryItem instanceof QueryFolder) {
                                    // We are not able to select folders, so skip 
                                    return false;
                                }
                                if (quitFlag) {
                                    fallbackTarget = value;
                                    return true;
                                }
                                else {
                                    if (node.id === value.id) {
                                        quitFlag = true;
                                    }
                                    else {
                                        fallbackTarget = value;
                                    }
                                    return false;
                                }
                            })
                        }

                        this.removeNode(node);
                        if (node.parent) {
                            this.updateNode(node.parent);
                        }

                        // In theory we should confirm the delete is from Query Folder Tree context menu but we lack this ability from OM
                        this.focus();
                    }
                });

                // If a query item is removed, remove from favorites as well
                favItem = this._favItemsMap[item.id];
                if (favItem) {
                    favItem.beginDelete();
                }
                favItem = this._teamFavItemsMap && this._teamFavItemsMap[item.id];
                if (favItem) {
                    favItem.beginDelete();
                }

                const selectedNode = this.getSelectedNode() as QueryTreeNode;
                if (selectedNode && selectedNode.queryItem && item) {
                    // Navigate to the fallback target if the context menu was triggered on the deleted item 
                    const needNavigate = item.id ? Utils_String.equals(selectedNode.queryItem.id, item.id, true) : Utils_String.equals(selectedNode.queryItem.path(), item.path(), true);

                    if (needNavigate) {
                        // ensure focus goes to the new selected item
                        fallbackTarget = fallbackTarget ? fallbackTarget : this.findNodesByQueryId(QueryDefinition.ASSIGNED_TO_ME_ID.toLowerCase())[0];
                        Diag.Debug.assertIsNotNull(fallbackTarget, "fallback target should not be null");
                        this._setFocusElement(this._getNodeElement(fallbackTarget));
                        this.focusOnNode(fallbackTarget);

                        Navigation_Services.getHistoryService().addHistoryPoint("query", {
                            id: fallbackTarget.queryItem.id ? fallbackTarget.queryItem.id : null,
                            path: fallbackTarget.queryItem.id ? null : fallbackTarget.queryItem.path(), // for unsaved query use path
                            witd: null,
                            project: null,
                            triage: null
                        });
                    }
                }
                break;

            case QueryItem.EVENT_SAVED:
                $.each(this.findNodesByQuery(item), (i: number, node: QueryTreeNode) => {
                    this._updateTreeNode(node, item);
                    this.updateNode(node, true); // Keep the focus where it was when saving the query
                });

                break;

            case QueryItem.EVENT_MOVED:
                // Similar to a combined delete-create. 
                // Update the previous and new parent tree and view.
                this._updateChildrenOfQueryParent(item.oldParent, false);
                this._updateChildrenOfQueryParent(item.queryItem.parent, true);
                this._bringQueryElementToView(item.queryItem);

                // Update the associated favorites entries. No need to remove the favorite, as the backing query remains.
                this._updateFavoritesSection(item.queryItem);

                break;

            case QueryItem.EVENT_RENAMED:
            case QueryItem.EVENT_CREATED:
                this._synchronizeFromQueryHierarchy();
                this._updateChildrenOfQueryParent(item.parent, true);
                this._updateFavoritesSection(item);
                break;

            case QueryHierarchy.EVENT_CHANGED:
                this._synchronizeFromQueryHierarchy();
                break;

            case QueryUIEvents.EVENT_FOLDERTREE_SET_FOCUS_ITEM:
                if (item) {
                    const queryNode = this.findNodesByQuery(item)[0];
                    if (queryNode) {
                        this.setSelectedNode(this.getSelectedNode() as QueryTreeNode || queryNode);
                        this.focusOnNode(queryNode);
                    }
                }
                break;
        }
    }

    private _synchronizeFromQueryHierarchy() {
        ///<summary>Repopulates all the hierarchy nodes in cases where the query hierarchy and the TreeControl get out of sync.
        ///  Also updates the DOM since _updateTreeNode() can change id's.
        ///  Maintains the scroll position of the query tree folder </summary>
        const scrollPosition = this._element.scrollTop();
        this._updateTreeNode(this.rootNode, this._queryHierarchy);
        // We shouldn't draw() everytime, in future we should covert to react -> flux model.
        this._draw();
        this._element.scrollTop(scrollPosition);
    }

    private _updateChildrenOfQueryParent(queryParent: any, expand: boolean) {
        ///<summary>Repopulates child Tree Nodes and view state using the query information associated with the supplied query parent.</summary>
        /// <param name="queryParent" type="Object">The backing parent QueryItem describing the TreeNodes to be updated.</param>
        /// <param name="expand" type="Boolean">Specifies if the parent view state should be expanded, or left in existing state.</param>

        Diag.Debug.assertParamIsObject(queryParent, "queryParent");
        Diag.Debug.assertParamIsBool(expand, "expand");

        if (queryParent) {
            $.each(this.findNodesByQueryId(queryParent.id), (i: number, node: QueryTreeNode) => {
                this._updateTreeNode(node, queryParent);
                this.updateNode(node);

                if (expand) {
                    this._expandFromRoot(node);
                }
            });
        }
    }

    private _bringQueryElementToView(query: any) {
        ///<summary>Brings the specified target element into view. Unsupported in Chrome.</summary>
        /// <param name="query" type="any">Query object for element to be brought into scroll view.</param>
        Diag.Debug.assertParamIsObject(query, "query");

        $.each(this.findNodesByQueryId(query.id), (i: number, treeNode: QueryTreeNode) => {
            let $nodeElement;

            $nodeElement = $(this._getNodeElement(treeNode));
            $('#container', this._element).scrollTop($nodeElement.position().top);
        });
    }

    private _expandFromRoot(treeNode: any) {
        ///<summary>Expands the specified TreeNode into view, starting from it's topmost (root) parent.</summary>
        /// <param name="treeNode" type="Object">TreeNode object to use for expanding the view in this Tree.</param>
        Diag.Debug.assertParamIsObject(treeNode, "treeNode");

        if (treeNode.parent !== null) {
            this._expandFromRoot(treeNode.parent);
        }
        this._setNodeExpansion(treeNode, $(this._getNodeElement(treeNode)), true);
    }

    private _updateFavoriteEntry(treeNode, favoriteItem: any) {
        ///<summary>Updates favorites entries to reflect query data associated with the specified query item.</summary>
        /// <param name="node" type="Object">The TreeNode associated with the Favorite.</param>
        /// <param name="favoriteItem" type="Object">The OM data for the Favorite.</param>

        Diag.Debug.assertParamIsObject(treeNode, "treeNode");
        Diag.Debug.assertParamIsObject(favoriteItem, "favoriteItem");

        if (favoriteItem.favStore === this._teamFavorites
            && treeNode.queryItem
            && treeNode.queryItem.personal) {
            favoriteItem.beginDelete();
        }
        else {
            this._updateTreeNode(treeNode, favoriteItem);
            this.updateNode(treeNode);
        }
    }

    private _updateFavoritesSection(queryItem: QueryItem) {
        ///<summary>Updates favorites entries to reflect query data associated with the specified query item.</summary>
        ///<param name="queryItem" type="Object">The backing parent QueryItem describing the relevant favorites entries to be updated.</param>

        Diag.Debug.assertParamIsObject(queryItem, "queryItem");

        let favItem,
            updateFavoritesStore = (favoritesSection) => {
                let i, l, updateEntry = (i, node) => {
                    this._updateFavoriteEntry(node, favItem);
                };

                if (favoritesSection) {
                    for (i = 0, l = favoritesSection.children.length; i < l; i++) {
                        favItem = favoritesSection.children[i];
                        $.each(this._findNodesByField(favItem.id, "favoriteId"), updateEntry);
                    }
                }
            },
            updateFavoritesEntry = () => {
                if (this._favItemsMap && this._teamFavItemsMap) {
                    $.each([this._favItemsMap[queryItem.id], this._teamFavItemsMap[queryItem.id]], (i, favItem) => {
                        if (favItem) {
                            $.each(this._findNodesByField(favItem.id, "favoriteId"), (i, node) => {
                                this._updateFavoriteEntry(node, favItem);
                            });
                        }
                    });
                }
            };

        if (queryItem instanceof QueryFolder) {
            // Any folder movement can impact any queries contained within. Refresh all the favorites.
            updateFavoritesStore(this._myFavorites);
            updateFavoritesStore(this._teamFavorites);
        }
        else {
            // For non-folder query items, update the impacted favorites only.
            updateFavoritesEntry();
        }
    }

    private _onFavoriteItemEvent(e?, item?) {
        switch (e.type) {
            case "favorite-item-removed":
                QueryHierarchy.clearQueryFavoritesCache(this._project);
                if (item.favStore === this._myFavorites) {
                    delete this._favItemsMap[item.data];
                }
                else if (item.favStore === this._teamFavorites) {
                    delete this._teamFavItemsMap[item.data];
                }
                else {
                    Diag.logError("Favorite item is from an unknown store");
                }

                $.each(this._findNodesByField(item.id, "favoriteId"), (i: number, node: QueryTreeNode) => {
                    this.removeNode(node);
                    if (node.parent) {
                        this.updateNode(node.parent);
                    }
                });

                $.each(this._findNodesByField(item.data, "queryId"), (i: number, node: QueryTreeNode) => {
                    const queryItem = this._queryHierarchy.findQueryById(item.data);
                    this._updateTreeNode(node, queryItem);
                    this.updateNode(node);
                });
                break;

            case "favorite-item-renamed":
            case "favorite-item-created":
                QueryHierarchy.clearQueryFavoritesCache(this._project);
                if (item.favStore === this._myFavorites) {
                    this._favItemsMap[item.data] = item;
                }
                else if (item.favStore === this._teamFavorites) {
                    this._teamFavItemsMap[item.data] = item;
                }
                else {
                    Diag.logError("Favorite item is from an unknown store");
                }

                if (item.parent) {
                    $.each(this._findNodesByField(item.parent.id, "favoriteId"), (i: number, node: QueryTreeNode) => {
                        this._updateTreeNode(node, item.parent);
                        this.updateNode(node);
                    });
                }

                $.each(this._findNodesByField(item.data, "queryId"), (i: number, node: QueryTreeNode) => {
                    const queryItem = this._queryHierarchy.findQueryById(item.data);
                    this._updateTreeNode(node, queryItem);
                    this.updateNode(node);
                });
                break;
        }
    }

    private _onWorkItemChanged() {
        let nodes, unsavedNode,
            currentDirtyItemsCount = this._workItemManager.getDirtyWorkItems().length;

        if (currentDirtyItemsCount !== this._dirtyWorkItemsCount) {
            this._dirtyWorkItemsCount = currentDirtyItemsCount;

            nodes = this.findNodesByQueryId(QueryDefinition.UNSAVED_WORKITEMS_ID);
            if (nodes.length > 0) {
                unsavedNode = nodes[0];
                this._updateTreeNode(unsavedNode, unsavedNode.queryItem, currentDirtyItemsCount);
                this.updateNode(unsavedNode, true); // suppress focussing on the node
            }
        }
    }

    private _updateNodeLink(node: QueryTreeNode) {
        const queryItem: QueryDefinition = <QueryDefinition>node.queryItem;
        let action: string;
        const historyService = Navigation_Services.getHistoryService();
        const currentState = historyService.getCurrentState();

        if (queryItem && !(queryItem instanceof QueryFolder)) {
            const isContributionAction = this._queryAction.substr(0, QueryFolderTree.CONTRIBUTION_ACTION.length) === QueryFolderTree.CONTRIBUTION_ACTION;
            if (QueryDefinition.isUneditableQuery(queryItem) && !isContributionAction) {
                action = ActionUrl.ACTION_QUERY;
            }
            else if (isContributionAction) {
                // Contribution action contains additional data after a #
                action = QueryFolderTree.CONTRIBUTION_ACTION;
            }
            else if (this._queryAction) {
                action = this._queryAction;
            }
            else {
                const currentAction = historyService.getCurrentState() && historyService.getCurrentState().action;
                if (Utils_String.equals(currentAction, ActionUrl.ACTION_QUERY_EDIT, true) || Utils_String.equals(currentAction, ActionUrl.ACTION_QUERY_CHARTS, true)) {
                    // if current action is query edit or query chart, then the link should have the same action
                    action = currentAction;
                }
                else {
                    // if the current action is anything else (like workitem url), then the link should have "query" action.
                    action = ActionUrl.ACTION_QUERY;
                }
            }

            const provider = QueryResultsProvider.peek(queryItem);

            const fragmentParameters: any = {};
            if (currentState["contributionId"]) {
                fragmentParameters.contributionId = currentState["contributionId"];
            }
            if (QueryDefinition.isCustomWiqlQuery(queryItem)) {
                // Need to query the original wiql/name due to a bug in IE where the page is fully
                // reloaded on the first hash change (link-click) if the original request was redirected.
                // Redirects are common for custom wiql queries - e.g. when following compat urls
                const tempQueryId = queryItem.tempQueryId;
                if (tempQueryId) {
                    fragmentParameters.tempQueryId = tempQueryId;
                }
                else {
                    fragmentParameters.path = node.queryPath;
                    fragmentParameters.wiql = queryItem.queryText;
                    fragmentParameters.name = queryItem.name;
                }
                node.link = historyService.getFragmentActionLink(action, fragmentParameters);
            }
            else if (provider instanceof SearchResultsProvider) {
                fragmentParameters.path = node.queryPath;
                fragmentParameters.searchText = provider.searchText;

                node.link = historyService.getFragmentActionLink(ActionUrl.ACTION_SEARCH, fragmentParameters);
            }
            else {
                if (node.queryId) {
                    fragmentParameters.id = node.queryId;
                }
                else {
                    fragmentParameters.path = node.queryPath;
                }
                node.link = historyService.getFragmentActionLink(action, fragmentParameters);
            }
        }

        if (node.children) {
            for (let i = 0, l = node.children.length; i < l; ++i) {
                this._updateNodeLink(node.children[i]);
            }
        }
    }

    private _onPopupItemClick(e?) {
        const command = e.get_commandName();
        const commandArgs = e.get_commandArgument();
        let favItem;

        // Checking to see if the command we can handle is executed
        switch (command) {
            case CommonMenuItems.ADD_TO_MY_FAVORITES_ACTION:
                QueryHierarchyCIEvents.publishEvent(QueryHierarchyCIEvents.ACTIONS_CLICK_ADD_TO_MY_FAVORITES_MENU_ITEM);
                this._myFavorites.beginCreateNewItem(commandArgs.item.text, TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_WIT_QUERYITEM, commandArgs.item.queryItem.id);
                return false;

            case CommonMenuItems.REMOVE_FROM_MY_FAVORITES_ACTION:
                favItem = this._getNodeFavItem(commandArgs.item);
                if (favItem) {
                    favItem.beginDelete();
                }
                return false;

            case CommonMenuItems.ADD_TO_TEAM_FAVORITES_ACTION:
                QueryHierarchyCIEvents.publishEvent(QueryHierarchyCIEvents.ACTIONS_CLICK_ADD_TO_TEAM_FAVORITES_MENU_ITEM);
                this._teamFavorites.beginCreateNewItem(commandArgs.item.text, TFS_OM_Common.FavoriteItem.FAVITEM_TYPE_WIT_QUERYITEM, commandArgs.item.queryItem.id, null, delegate(this, this._errorHandler));
                return false;

            case CommonMenuItems.REMOVE_FROM_TEAM_FAVORITES_ACTION:
                favItem = this._teamFavItemsMap[commandArgs.item.queryItem.id];
                if (favItem) {
                    favItem.beginDelete(null, delegate(this, this._errorHandler));
                }
                return false;
        }
    }

    protected _getMyFavorites(): TFS_OM_Common.FavoriteStore {
        return this._myFavorites;
    }

    protected _getMyTeamFavorites(): TFS_OM_Common.FavoriteStore {
        return this._teamFavorites;
    }

    protected _setMyFavorites(value: TFS_OM_Common.FavoriteStore): void {
        this._myFavorites = value;
    }

    protected _setMyTeamFavorites(value: TFS_OM_Common.FavoriteStore): void {
        this._teamFavorites = value;
    }
}

VSS.initClassPrototype(QueryFolderTree, {
    _store: null,
    _project: null,
    _workItemManager: null,
    _queryHierarchy: null,
    _myFavorites: null,
    _favItemsMap: null,
    _teamFavItemsMap: null,
    _teamFavorites: null,
    _enableTeamActions: false,
    _queryAction: "",
    _dirtyWorkItemsCount: 0,
    _workItemChangedDelegate: null,
    _recentItemsFolderNode: null
});

VSS.classExtend(QueryFolderTree, TfsContext.ControlExtensions);

// Deprecated, please don't rely on this enhancement, as it will be removed
export function registerEnhancements() {
    Controls.Enhancement.registerEnhancement(QueryFolderTree, ".query-folder-tree");
}

registerEnhancements();
