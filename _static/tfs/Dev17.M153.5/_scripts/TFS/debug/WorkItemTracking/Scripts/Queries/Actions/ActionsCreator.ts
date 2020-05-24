import { Favorite, FavoriteCreateParameters } from "Favorites/Contracts";
import { FavoritesActionsCreator } from "Favorites/Controls/FavoritesActionsCreator";
import { FavoritesDataProvider } from "Favorites/Controls/FavoritesDataProvider";
import { FavoriteItemData } from "Favorites/Controls/FavoritesModels";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";
import * as Favorites_RestClient from "Favorites/RestClient";
import { Async } from "OfficeFabric/Utilities";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Ajax from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItemTrackingHttpBatchClient } from "TFS/WorkItemTracking/BatchRestClient";
import { QueryExpand, QueryHierarchyItem, QueryHierarchyItemsResult, QueryType, TypeInfo } from "TFS/WorkItemTracking/Contracts";
import { WorkItemTrackingHttpClient3 } from "TFS/WorkItemTracking/RestClient";
import { WebPageDataService } from "VSS/Contributions/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Events_Action from "VSS/Events/Action";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as VSS_Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import { ContractSerializer } from "VSS/Serialization";
import { getService } from "VSS/Service";
import * as Telemetry from "VSS/Telemetry/Services";
import * as Utils_Array from "VSS/Utils/Array";
import { getDirectoryName, getRootDirectory } from "VSS/Utils/File";
import * as Utils_String from "VSS/Utils/String";
import { PerformanceEvents, WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { promptMessageDialog } from "WorkItemTracking/Scripts/Dialogs/WITDialogs";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { IQueryParamsExtras } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { DataProviderConstants, QueryItemFavoriteConstants, QueriesHubConstants, QueriesMruConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import {
    ActiveQueryView, ExtendedQueryHierarchyItem,
    QueryContribution, QueryDataProvider,
    QueryFavorite, QueryFavoriteGroup, QueryFavoritesDataProvider,
    QueryItem, QuerySearchStatus, IQueryItemData, IQueryHierarchyData
} from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueryUtilities } from "WorkItemTracking/Scripts/Queries/QueryUtilities";
import { IActiveQueryViewDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/ActiveQueryViewStore";
import { IQueryFavoriteGroupDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryFavoriteGroupStore";
import { IQueryHierarchyItemDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore";
import { IQueryHierarchyDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyStore";
import { IQueryResultsProviderDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QueryResultsProviderStore";
import { IQuerySearchDataProvider } from "WorkItemTracking/Scripts/Queries/Stores/QuerySearchStore";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { Project } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { IQueryHierarchyItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi";
import { isVisualizeFollowsEnabled } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { WITCommonConstants, QueriesConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";
import { getService as getSettingsService, ISettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { delay } from "VSS/Utils/Core";

const tfsContext = TfsContext.getDefault();

const GetQueryDataProviderContributionId = "ms.vss-work-web.get-query-data-provider";
const ADHOC_QUERIES_PROMISE_KEY: string = "query-hierarchy-adhoc-queries-promise";

export class ActionsCreator {
    private _projectId: string;
    private _debouncedPerformSearch: (searchText: string) => void;
    private _debouncedToggleFavoriteGroupMru: (groupKey: string, expand: boolean) => void;
    private _isInitializingFavoriteQueries: boolean;
    private _queryDataProvider: QueryDataProvider;

    public workItemTrackingClient: WorkItemTrackingHttpClient3;
    public workItemTrackingBatchClient: WorkItemTrackingHttpBatchClient;
    public favoriteClient: Favorites_RestClient.FavoriteHttpClient3_1;
    public favoritesDataProvider: FavoritesDataProvider;
    public favoritesActionsCreator: FavoritesActionsCreator;
    public settingsService: ISettingsService;

    constructor(
        private _actionsHub: ActionsHub,
        private _queryHierarchyItemDataProvider: IQueryHierarchyItemDataProvider,
        private _queryHierarchyDataProvider: IQueryHierarchyDataProvider,
        private _queryFavoriteGroupDataProvider: IQueryFavoriteGroupDataProvider,
        private _querySearchDataProvider: IQuerySearchDataProvider,
        private _activeQueryDataProvider: IActiveQueryViewDataProvider,
        private _queryResultsProviderDataProvider: IQueryResultsProviderDataProvider,
        favoritesStore: FavoritesStore) {

        const connection = ProjectCollection.getConnection(tfsContext);
        this.workItemTrackingClient = connection.getHttpClient(WorkItemTrackingHttpClient3);
        this.workItemTrackingBatchClient = connection.getHttpClient(WorkItemTrackingHttpBatchClient);
        this.favoriteClient = Favorites_RestClient.getClient();
        this.settingsService = getSettingsService();
        this._projectId = connection.getWebContext().project.id;
        this.favoritesDataProvider = new FavoritesDataProvider();
        this.favoritesActionsCreator = new FavoritesActionsCreator(this.favoritesDataProvider, favoritesStore, _actionsHub.FavoritesActions);
        this._queryDataProvider = this._getQueryDataProvider();
        this._isInitializingFavoriteQueries = false;

        const asyncUtil = new Async();
        this._debouncedPerformSearch = asyncUtil.debounce(this._performSearch, QueryUtilities.DefaultDebounceWait);
        this._debouncedToggleFavoriteGroupMru = asyncUtil.debounce(this._toggleFavoriteGroupMru, QueryUtilities.DefaultDebounceWait);

        this._handleToggleFavorite();

        this._initializeQueryPermissionMetadata();
        this._initializeAndRunQueryItemFromDataProvider();
        this._initializeFavoritesCreatorFromDataProvider();
    }

    public initializeQuerySearch(): void {
        if (this._querySearchDataProvider.getSearchStatus() === QuerySearchStatus.Pending) {
            this.performSearch(this._querySearchDataProvider.getSearchText());
        }
    }

    public revertAllWorkItemChanges(): void {
        const workItemStore = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);
        const workItemManager = WorkItemManager.get(workItemStore);
        workItemManager.resetDirtyWorkItems();
    }

    public revertQueryChanges(): void {
        const queryResultsProvider = this._queryResultsProviderDataProvider.getValue();
        queryResultsProvider.revertEditInfo(false);
    }

    public checkAndPromptForUnsavedItems(
        noUnsavedItemAction: () => void,
        promptAndProceedAction: () => void,
        promptAndRejectAction: () => void,
        postHandlingAction?: (hasUnsavedItems: boolean) => void,
        checkForWorkItemsOnly?: boolean,
        messageTitle?: string,
        messageContentText?: string,
        proceedButtonText?: string,
        rejectButtonText?: string): void {

        let unsavedItemsMessage: string = undefined;
        let dirtyItemTitles: string[] = [];
        const maxAllowedItemsInMessage = 6;
        const workItemStore = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);
        const workItemManager = WorkItemManager.get(workItemStore);
        const queryResultsProvider = this._queryResultsProviderDataProvider.getValue();

        // Both data source has to be present before checking unsaved items
        if (queryResultsProvider && workItemManager) {
            // Get unsaved query items
            if (!checkForWorkItemsOnly && queryResultsProvider.isDirty()) {
                const queryTitle = Utils_String.format(Resources.QueryDirtyDocumentTitleFormat, queryResultsProvider.getTitle());
                dirtyItemTitles.push(queryTitle);
            }

            // Get unsaved work items
            if (workItemManager.isDirty(true)) {
                dirtyItemTitles = dirtyItemTitles.concat(workItemManager.getDirtyWorkItemTitles(maxAllowedItemsInMessage));
            }

            // Compose prompt message
            if (dirtyItemTitles.length > 0) {
                unsavedItemsMessage = this._createPromptMessageWithDirtyItems(
                    messageContentText || Resources_Platform.UnsavedChangesWithNames,
                    dirtyItemTitles,
                    maxAllowedItemsInMessage);
            }
        }

        if (unsavedItemsMessage) {
            Promise.resolve(promptMessageDialog(
                unsavedItemsMessage,
                messageTitle || Resources_Platform.UnsavedChangesMessageTitle,
                [
                    { id: "leave", text: proceedButtonText || Resources_Platform.UnsavedChangesLeaveButton, reject: false } as IMessageDialogButton,
                    { id: "stay", text: rejectButtonText || Resources_Platform.UnsavedChangesStayButton, reject: true } as IMessageDialogButton
                ])).then(
                    () => {
                        if (promptAndProceedAction) {
                            promptAndProceedAction();
                        }
                    },
                    () => {
                        if (promptAndRejectAction) {
                            promptAndRejectAction();
                        }
                    });
        } else if (noUnsavedItemAction) {
            noUnsavedItemAction();
        }

        if (postHandlingAction) {
            postHandlingAction(!!unsavedItemsMessage);
        }
    }

    private _createPromptMessageWithDirtyItems(messageText: string, dirtyItemTitles: string[], maxAllowedItemsInMessage: number): string {
        const messages: string[] = [];
        for (let index = 0; index < dirtyItemTitles.length; index++) {
            if (messages.length === (maxAllowedItemsInMessage - 1)) {
                messages.push(Resources_Platform.UnsavedChangesMore);
                break;
            }

            let title = dirtyItemTitles[index];
            if (title.length > 55) {
                title = title.substr(0, 52) + "...";
            }
            messages.push(title);
        }

        return messages.length > 0 ? messageText + "\n" + messages.join("\n") : undefined;
    }

    private _queryItemHasSubfolder(queryItem: QueryHierarchyItem): boolean {
        return queryItem && queryItem.hasChildren && queryItem.children && queryItem.children.some(child => child.isFolder);
    }

    public async initializeAllQueries(): Promise<void> {
        if (!this._queryHierarchyDataProvider.isLoaded() ||
            !this._queryHierarchyItemDataProvider.areRootFolderItemsLoaded()) {
            // Fetch query hierarchy data
            PerfScenarioManager.addSplitTiming(
                PerformanceEvents.QUERIESHUB_ACTIONS_GETALLQUERYITEMS_REQUEST, true);
            try {
                const queries = await this.workItemTrackingClient.getQueries(this._projectId, QueryExpand.Wiql, 1);
                PerfScenarioManager.addSplitTiming(
                    PerformanceEvents.QUERIESHUB_ACTIONS_GETALLQUERYITEMS_REQUEST, false);
                // Initialize query hierarchy and item data store
                this._actionsHub.InitializeQueryHierarchyItem.invoke(queries);
                this._actionsHub.InitializeQueryHierarchy.invoke(queries);
                this._actionsHub.InitializeQueryRootHierarchyItem.invoke(queries);

                for (const queryFolder of queries) {
                    if (!queryFolder.hasChildren) {
                        const emptyContent = this._getEmptyFolderContentItem(queryFolder);
                        this._actionsHub.QueryFolderEmptyContentLoaded.invoke(emptyContent);
                    }

                    const hasSubfolder = this._queryItemHasSubfolder(queryFolder);
                    if (!hasSubfolder) {
                        const noSubfolderContent = QueryUtilities.getNoSubfolderContentItem(queryFolder);
                        this._actionsHub.QueryFolderEmptyContentLoaded.invoke(noSubfolderContent);
                    }

                    this._actionsHub.QueryFolderChildrenLoaded.invoke(queryFolder);
                    const queryItem = {
                        ...queryFolder,
                        isChildrenLoaded: true,
                        isEmptyFolderContext: false,
                        depth: 0,
                        expanded: true,
                        expanding: false
                    };
                    this._actionsHub.QueryFolderExpanded.invoke(queryItem);
                }
            } catch (error) {
                error = error as Error;
                this.showErrorMessageForQueriesView(error.message);
            }
        } else {
            // Do nothing if query hierarchy data is already loaded
            this._actionsHub.InitializeQueryHierarchy.invoke(null);
        }

        // Initialize favorites and team queries data 
        return this.initializeFavorites();
    }

    public async ensureRootQueryFolders(): Promise<void> {
        if (!this._queryHierarchyItemDataProvider.areRootFolderItemsLoaded()) {
            PerfScenarioManager.addSplitTiming(
                PerformanceEvents.QUERIESHUB_ACTIONS_ENSUREROOTFOLDERS_REQUEST, true);
            try {
                const queries: QueryHierarchyItem[] = await this.workItemTrackingClient.getQueries(this._projectId, QueryExpand.None, 0);
                PerfScenarioManager.addSplitTiming(
                    PerformanceEvents.QUERIESHUB_ACTIONS_ENSUREROOTFOLDERS_REQUEST, false);
                this._actionsHub.InitializeQueryHierarchyItem.invoke(queries);
                this._actionsHub.InitializeQueryRootHierarchyItem.invoke(queries);
            } catch (error) {
                throw error;
            }
        } else {
            return null;
        }
    }

    public initializeFavorites(): void {
        if (this._queryFavoriteGroupDataProvider.isLoaded()) {
            this._updateFavorites([]);
        } else if (!this._isInitializingFavoriteQueries) {
            if (this._queryDataProvider && this._queryDataProvider.queryFavoriteGroups) {
                // Show loading team favorites only after 500ms.
                delay(this, 500, () => {
                    const teamFavoritesLoadingItem: QueryFavoriteGroup = {
                        favorites: [],
                        id: QueryItemFavoriteConstants.TeamFavoriteLoadingGroupKey,
                        isEmpty: false,
                        isExpanded: true,
                        name: Resources.LoadingTeamFavorites
                    };
                    this._queryDataProvider.queryFavoriteGroups.push(teamFavoritesLoadingItem);
                });

                this._initializeFavorites(this._queryDataProvider.queryFavoriteGroups).then(() => {
                    this._initializeTeamFavorites();
                });
            }
        }
    }

    private _initializeTeamFavorites(): void {
        this._getQueryTeamFavoritesDataProvider().then((queryFavoritesDataProvider: QueryFavoritesDataProvider) => {
            if (queryFavoritesDataProvider && queryFavoritesDataProvider.queryFavoriteGroups) {
                this._initializeFavorites(queryFavoritesDataProvider.queryFavoriteGroups).then(() => {
                    this._actionsHub.QueryFavoriteLoadingGroupRemoved.invoke(this._queryFavoriteGroupDataProvider.get(QueryItemFavoriteConstants.TeamFavoriteLoadingGroupKey));
                });
            }
        });
    }

    private _initializeFavorites(queryFavoriteGroups: QueryFavoriteGroup[]): Promise<void> {
        this._isInitializingFavoriteQueries = true;
        let queriesToLoad: string[] = [];
        let favorites: QueryFavorite[] = [];
        return new Promise((resolve) => {
            if (queryFavoriteGroups) {
                for (const group of queryFavoriteGroups) {
                    favorites = favorites.concat(group.favorites);
                }

                // Parse the favorites & team queries lists and only fetch queries if they are not already in the data store
                if (favorites.length > 0) {
                    queriesToLoad = favorites.reduce((filteredIds: string[], value: Favorite) => {
                        if (value.artifactId && !this._queryHierarchyItemDataProvider.itemExists(value.artifactId)) {
                            filteredIds.push(value.artifactId);
                        }
                        return filteredIds;
                    }, queriesToLoad);
                }

                if (queriesToLoad && queriesToLoad.length) {
                    queriesToLoad = Utils_Array.unique(queriesToLoad);
                    PerfScenarioManager.addSplitTiming(
                        PerformanceEvents.QUERIESHUB_ACTIONS_GETFAVORITEQUERYITEMS_REQUEST, true);
                    Promise.resolve(this._getQueryItems(queriesToLoad, false)).then((queryHierarchyItems: QueryHierarchyItem[]) => {
                        PerfScenarioManager.addSplitTiming(
                            PerformanceEvents.QUERIESHUB_ACTIONS_GETFAVORITEQUERYITEMS_REQUEST, false);

                        this._actionsHub.InitializeQueryHierarchyItem.invoke(queryHierarchyItems);
                        const queryHierarchyIds = queryHierarchyItems.map((queryHierarchyItem: QueryHierarchyItem) => queryHierarchyItem.id);

                        const processedQueryFavoriteGroup: QueryFavoriteGroup[] = [];

                        for (const group of queryFavoriteGroups) {
                            // if any of the query failed to load, then filter it out of favorites data
                            const processedFavorites = group.favorites.filter((favorite: QueryFavorite) => {
                                return !Utils_Array.contains(queriesToLoad, favorite.artifactId, Utils_String.ignoreCaseComparer) ||
                                    Utils_Array.contains(queryHierarchyIds, favorite.artifactId, Utils_String.ignoreCaseComparer);
                            });

                            // The artifactName from the favorites data provider can be stale if the query is renamed,
                            // so we need update it to match what we've read from the query hierarchy item.
                            const processedQueryFavorites: QueryFavorite[] = [];
                            for (const favorite of processedFavorites) {
                                processedQueryFavorites.push({
                                    ...favorite,
                                    artifactName: this._queryHierarchyItemDataProvider.getItem(favorite.artifactId).name
                                });
                            }

                            processedQueryFavoriteGroup.push({
                                ...group,
                                isEmpty: processedFavorites.length === 0,
                                favorites: processedQueryFavorites
                            });
                        }

                        this._updateFavorites(processedQueryFavoriteGroup);
                        this._isInitializingFavoriteQueries = false;
                        resolve(null);
                    });
                } else {
                    this._actionsHub.InitializeQueryHierarchyItem.invoke([]);
                    this._updateFavorites(queryFavoriteGroups);
                    this._isInitializingFavoriteQueries = false;
                    resolve(null);
                }
            }
        });
    }

    /**
     * Changes what the active view is
     * @param newView The new active view
     */
    public setActiveQueryView(newView: ActiveQueryView) {
        if (newView !== this._activeQueryDataProvider.getValue()) {
            this._actionsHub.QueryViewChanged.invoke(newView);
        }
    }

    public expandQueryFolder(queryItem: QueryItem): void {
        if (!queryItem.isFolder) {
            return;
        }

        // immediately start loading animation while doing API call
        this._actionsHub.ExpandQueryFolder.invoke(queryItem);

        // If query folder children are available but not loaded, call API to load them
        if (queryItem.hasChildren && !queryItem.isChildrenLoaded) {
            Promise.resolve(this.workItemTrackingClient.getQuery(this._projectId, queryItem.id, QueryExpand.Wiql, 2).then(
                (queryFolder: QueryHierarchyItem) => {
                    this._actionsHub.QueryFolderChildrenLoaded.invoke(queryFolder);

                    // If the folder does not have any sub-folder, add a "no sub folder" placeholder node
                    if (!this._queryItemHasSubfolder(queryFolder)) {
                        const noSubfolderContent = QueryUtilities.getNoSubfolderContentItem(queryItem);
                        this._actionsHub.QueryFolderEmptyContentLoaded.invoke(noSubfolderContent);
                    }
                },
                (error: Error) => {
                    this.showErrorMessageForQueriesView(error.message);
                })
            ).then(() => this._expandQueryFolder(queryItem));
        } else {
            if (!this._queryItemHasSubfolder(queryItem)) {
                const noSubfolderContent = QueryUtilities.getNoSubfolderContentItem(queryItem);
                this._actionsHub.QueryFolderEmptyContentLoaded.invoke(noSubfolderContent);
            }

            if (!queryItem.hasChildren) {
                const emptyContent = this._getEmptyFolderContentItem(queryItem);
                this._actionsHub.QueryFolderEmptyContentLoaded.invoke(emptyContent);
            }

            this._expandQueryFolder(queryItem);
        }
    }

    public collapseQueryFolder(queryItem: QueryItem): void {
        this._actionsHub.QueryFolderCollapsed.invoke(queryItem);
    }

    public deleteQuery(queryItem: QueryItem): void {
        Promise.resolve(this.workItemTrackingClient.deleteQuery(this._projectId, queryItem.id)).then(() => {
            if (queryItem.isFolder) {
                this._actionsHub.QueryFolderDeleted.invoke(queryItem);
            } else {
                for (const group of this._queryFavoriteGroupDataProvider.getAll()) {
                    const queryFavorite = group.favorites.filter((value) => {
                        return Utils_String.equals(value.artifactId, queryItem.id, true);
                    });

                    if (queryFavorite.length === 1) {
                        this._removeFavorite(group, queryFavorite[0], true);
                    }
                }

                this._actionsHub.QueryDeleted.invoke(queryItem);
            }

            // Update parent folder to no longer reference the deleted query.
            const parentFolder = this._getParentFolder(queryItem.path);
            if (parentFolder) {
                parentFolder.children = parentFolder.children.filter(item => item.id !== queryItem.id);
                parentFolder.isChildrenLoaded = parentFolder.children.length > 0;
                parentFolder.hasChildren = parentFolder.children.length > 0;

                if (!parentFolder.hasChildren) {
                    // Insert empty folder content when there is no more children in the folder
                    const emptyContent = this._getEmptyFolderContentItem(parentFolder);
                    this._actionsHub.QueryFolderEmptyContentLoaded.invoke(emptyContent);
                }

                // If deleted item is folder, check for subfolders in the parent folder
                if (queryItem.isFolder) {
                    const hasSubfolder = this._queryItemHasSubfolder(parentFolder);
                    if (!hasSubfolder) {
                        const noSubfolderContent = QueryUtilities.getNoSubfolderContentItem(parentFolder);
                        this._actionsHub.QueryFolderEmptyContentLoaded.invoke(noSubfolderContent);
                    }
                }

                this._actionsHub.QueryItemUpdated.invoke(parentFolder as QueryItem);
            }
        }, (error: Error) => {
            this.showErrorMessageForQueriesView(error.message);
        });
    }

    public async createQuery(queryItem: QueryItem, parentPath: string): Promise<QueryItem> {
        let parentItem = this._queryHierarchyItemDataProvider.getItem(parentPath);
        const parentId = parentItem ? parentItem.id : parentPath; // Always use id while passing in the url, path may contain characters that are not supported in the url

        try {
            const query = await this.workItemTrackingClient.createQuery(queryItem as QueryHierarchyItem, this._projectId, parentId);
            if (parentItem) {
                parentItem = {
                    ...parentItem,
                };

                const emptyContent = this._queryHierarchyItemDataProvider.getItem(QueryUtilities.getEmptyQueryItemId(parentItem.id));

                // If there is an empty content we need to remove from the store
                if (emptyContent) {
                    this._actionsHub.QueryFolderEmptyContentRemoved.invoke(emptyContent);
                }

                // If new query item is a folder, and a no-subfolders content exists, remove it
                if (queryItem.isFolder) {
                    const noSubfolderContent = this._queryHierarchyItemDataProvider.getItem(QueryUtilities.getNoSubfolderQueryItemId(parentItem.id));
                    if (noSubfolderContent) {
                        this._actionsHub.QueryFolderEmptyContentRemoved.invoke(noSubfolderContent);
                    }
                }

                // the parent item should be updated with the new child
                parentItem.hasChildren = true;
                parentItem.children = (parentItem.children || []).concat(query);
                parentItem.isChildrenLoaded = true;
                this._actionsHub.QueryItemUpdated.invoke(parentItem as QueryItem);
            }
            this._actionsHub.QueryItemCreated.invoke(query as QueryItem);

            return query as QueryItem;
        } catch (error) {
            throw error;
        }
    }

    private _reparentChildren(sourceParentItem: ExtendedQueryHierarchyItem, targetFolderPath: string): QueryItem[] {
        let updatedChildItems: QueryItem[] = [];

        if (sourceParentItem.hasChildren && sourceParentItem.children && sourceParentItem.children.length > 0) {
            // Update children references
            for (const child of sourceParentItem.children) {
                const originalChildQueryItem = this._queryHierarchyItemDataProvider.getItem(child.id);
                const newChildQueryItem = {
                    ...originalChildQueryItem,
                    path: `${targetFolderPath}/${originalChildQueryItem.name}`
                } as QueryItem;

                if (newChildQueryItem.isFolder) {
                    const updatedDecendantItems = this._reparentChildren(originalChildQueryItem, newChildQueryItem.path);
                    updatedChildItems = updatedChildItems.concat(updatedDecendantItems);
                }

                updatedChildItems.push(newChildQueryItem);
            }
        } else if (!sourceParentItem.hasChildren) {
            // If there is an empty content, we need to update its path
            const emptyContent = this._queryHierarchyItemDataProvider.getItem(QueryUtilities.getEmptyQueryItemId(sourceParentItem.id));
            if (emptyContent) {
                updatedChildItems.push({ ...emptyContent, path: `${targetFolderPath}/${emptyContent.name}` } as QueryItem);
            }
        }

        // If there is an no-subfolder content, we need to update its path
        const sourceParentHasSubfolder = this._queryItemHasSubfolder(sourceParentItem);
        if (!sourceParentHasSubfolder) {
            const noSubfolderContent = this._queryHierarchyItemDataProvider.getItem(QueryUtilities.getNoSubfolderQueryItemId(sourceParentItem.id));
            if (noSubfolderContent) {
                updatedChildItems.push({ ...noSubfolderContent, path: `${targetFolderPath}/${noSubfolderContent.name}` } as QueryItem);
            }
        }

        return updatedChildItems;
    }

    /**
     * Update source and target parent folder for the renamed/moved query item.
     * This only update parents that already cached in the query hierarchy item store.
     */
    private _updateQueryParentReferences(updatedQueryItem: QueryItem, sourceParentPath: string, targetParentPath: string): QueryItem[] {
        const isSourceParentCached = this._queryHierarchyItemDataProvider.itemExists(sourceParentPath);
        const isTargetParentCached = this._queryHierarchyItemDataProvider.itemExists(targetParentPath);
        if (!isSourceParentCached && !isTargetParentCached) {
            return [];
        }

        const updatedParentItems: QueryItem[] = [];
        const queryHierarchyItems = this._queryHierarchyDataProvider.getAll();
        const [sourceParentItem] = isSourceParentCached ? QueryUtilities.mergeQueryItems(
            queryHierarchyItems.filter(i => i.fullName === sourceParentPath),
            [this._queryHierarchyItemDataProvider.getItem(sourceParentPath)]) : [null];

        if (sourceParentPath === targetParentPath && sourceParentItem) {
            // Query item change in the same folder
            const updatedSourceParent: QueryItem = {
                ...sourceParentItem,
                children: (sourceParentItem.children || []).filter((value) => { return value.id !== updatedQueryItem.id; }).concat(updatedQueryItem),
            };
            updatedParentItems.push(updatedSourceParent);
        } else if (sourceParentPath !== targetParentPath) {
            // Query item moved to new folder
            if (sourceParentItem) {
                const updatedSourceParent: QueryItem = {
                    ...sourceParentItem,
                    children: (sourceParentItem.children || []).filter((value) => { return value.id !== updatedQueryItem.id; }),
                };
                updatedSourceParent.hasChildren = updatedSourceParent.children.length > 0;
                if (!updatedSourceParent.hasChildren && updatedSourceParent.expanded) {
                    const emptyContent = this._getEmptyFolderContentItem(updatedSourceParent);
                    this._actionsHub.QueryFolderEmptyContentLoaded.invoke(emptyContent);
                }

                // If updated query item is a folder, check for subfolders in the source parent
                if (updatedQueryItem.isFolder) {
                    const parentHasSubfolder = this._queryItemHasSubfolder(updatedSourceParent);
                    if (!parentHasSubfolder) {
                        const noSubfolderContent = QueryUtilities.getNoSubfolderContentItem(updatedSourceParent);
                        this._actionsHub.QueryFolderEmptyContentLoaded.invoke(noSubfolderContent);
                    }
                }

                updatedParentItems.push(updatedSourceParent);
            }
            const [targetParentItem] = isTargetParentCached ? QueryUtilities.mergeQueryItems(
                queryHierarchyItems.filter(i => i.fullName === targetParentPath),
                [this._queryHierarchyItemDataProvider.getItem(targetParentPath)]) : [null];
            if (targetParentItem) {
                const emptyContent = this._queryHierarchyItemDataProvider.getItem(QueryUtilities.getEmptyQueryItemId(targetParentItem.id));
                // If there is an empty content we need to remove from the store
                if (emptyContent) {
                    this._actionsHub.QueryFolderEmptyContentRemoved.invoke(emptyContent);
                }

                // If updated query item is a folder, remove no-subfolder content in target folder, if any
                const noSubfolderContent = this._queryHierarchyItemDataProvider.getItem(QueryUtilities.getNoSubfolderQueryItemId(targetParentItem.id));
                if (updatedQueryItem.isFolder && noSubfolderContent) {
                    this._actionsHub.QueryFolderEmptyContentRemoved.invoke(noSubfolderContent);
                }

                // Updating the updated parent. Adding the new child reference
                const updatedTargetParent: QueryItem = {
                    ...targetParentItem,
                    hasChildren: true,
                    // If target location previously has no child, mark isChildrenLoaded to true to avoid server call to retreive children that would cause race condition with moving items
                    isChildrenLoaded: targetParentItem.hasChildren ? targetParentItem.isChildrenLoaded : true,
                    children: (targetParentItem.children || []).concat(updatedQueryItem)
                };
                updatedParentItems.push(updatedTargetParent);
            }
        }

        return updatedParentItems;
    }

    private _updateQueryReferences(updatedQueryItem: QueryItem): void {
        const originalQueryItem = this._queryHierarchyItemDataProvider.getItem(updatedQueryItem.id);
        const sourceFolder = getDirectoryName(originalQueryItem.path);
        const targetFolder = getDirectoryName(updatedQueryItem.path);
        let updatedQueryItems: QueryItem[] = [updatedQueryItem];

        if (updatedQueryItem.isFolder) {
            // Update children references
            const updatedChildItems = this._reparentChildren(originalQueryItem, updatedQueryItem.path);
            updatedQueryItems = updatedQueryItems.concat(updatedChildItems);
        }

        // Update Parents in query item store
        const updatedParentItems = this._updateQueryParentReferences(updatedQueryItem, sourceFolder, targetFolder);
        updatedQueryItems = updatedQueryItems.concat(updatedParentItems);

        // Save the changes to query item store
        this._actionsHub.QueryItemUpdated.invoke(updatedQueryItems);

        // Update hierarchy store
        if (sourceFolder !== targetFolder && originalQueryItem.name === updatedQueryItem.name) {
            // This is a move
            this._actionsHub.QueryItemMoved.invoke({
                isFolder: updatedQueryItem.isFolder,
                originalPath: originalQueryItem.path,
                updatedPath: updatedQueryItem.path
            });
        } else if (originalQueryItem.name !== updatedQueryItem.name) {
            // This is a rename
            this._actionsHub.QueryItemRenamed.invoke({
                id: updatedQueryItem.id,
                isFolder: updatedQueryItem.isFolder,
                originalPath: originalQueryItem.path,
                renamedPath: updatedQueryItem.path,
                name: updatedQueryItem.name,
            });
        }
    }

    public async updateQuery(queryItem: QueryItem): Promise<QueryItem> {
        // Special casing for saving the recycle bin query
        // since we do not store it in our stores
        if (QueryUtilities.isRecycleBinQuery(queryItem.id)) {
            return new Promise<QueryItem>((resolve, reject) => {
                const queryDefinition = this._queryResultsProviderDataProvider.getValue().queryDefinition;

                PerfScenarioManager.addSplitTiming(
                    PerformanceEvents.QUERY_UPDATEADHOCQUERY_REQUEST, true);
                Ajax.postMSJSON(
                    this._getApiLocation(queryDefinition.project, false, "updateAdHocQuery"),
                    {
                        "queryId": queryItem.id,
                        "wiql": queryItem.wiql
                    },
                    (savedQueryDefiniton: { id: string, wiql: string }) => {
                        PerfScenarioManager.addSplitTiming(
                            PerformanceEvents.QUERY_UPDATEADHOCQUERY_REQUEST, false);

                        queryDefinition.queryText = savedQueryDefiniton.wiql;
                        this._queryResultsProviderDataProvider.getValue().update(queryDefinition);
                        resolve(QueryUtilities.convertQueryDefinintionToQueryItem(queryDefinition));
                    },
                    (error) => { return reject(error); });
            });
        }

        const originalItem = this._queryHierarchyItemDataProvider.getItem(queryItem.id);
        const isRenamed = originalItem.name !== queryItem.name;
        const isWiqlChanged = originalItem.wiql !== queryItem.wiql;

        if (isRenamed) {
            const newItemByPath = this._queryHierarchyItemDataProvider.getItem(queryItem.path);

            // We only allow rename of an item that already exists if it is the same query
            // this means we are changing the case of the query name (e.g. BUGS -> Bugs)
            if (newItemByPath && !Utils_String.equals(queryItem.id, newItemByPath.id, true /* ignore case */)) {
                throw new Error(Resources.QueryMoveOrRename_QueryItemAlreadyExists);
            }

            this._updateQueryReferences(queryItem);
        }

        PerfScenarioManager.addSplitTiming(
            PerformanceEvents.QUERY_UPDATEQUERY_REQUEST, true);

        try {
            const item = await this.workItemTrackingClient.updateQuery(queryItem as QueryHierarchyItem, this._projectId, queryItem.id);
            PerfScenarioManager.addSplitTiming(
                PerformanceEvents.QUERY_UPDATEQUERY_REQUEST, false);

            if (!isRenamed && !isWiqlChanged) {
                // If it wasn't for renaming, we need to make sure query item store is updated
                this._actionsHub.QueryItemUpdated.invoke(item as QueryItem);
            } else if (isWiqlChanged) {
                this._updateQueryReferences(item as QueryItem);
            } else if (this._querySearchDataProvider.getSearchStatus() === QuerySearchStatus.ResultsReady && this._activeQueryDataProvider.getValue() === ActiveQueryView.All) {
                // If we are in the All view we need to kick off a server side search to update the view as a result of rename
                // while the Favorites view is purely client side
                this.performSearch(this._querySearchDataProvider.getSearchText());
            }
            return item as QueryItem;
        } catch (error) {
            if (isRenamed) {
                // Revert hierarchy change
                this._updateQueryReferences(originalItem as QueryItem);
            }
            throw error;
        }
    }

    /**
     * 
     * @param originalQueryItem source queryItem to be moved
     * @param targetFolderItem target queryItem to which source is moved to
     * @param targetFolder If target item is null, then use targetFolder path to specify where the source item needs to move to
     * @param newName Optional, alternate name other than source item
     * @param viaDragDrop Optional, if move called via drag and drop
     */
    public async moveQuery(originalQueryItem: QueryItem, targetFolderItem: QueryItem, targetFolder?: string, newName?: string, viaDragDrop?: boolean): Promise<QueryItem> {
        const sourceFolder = getDirectoryName(originalQueryItem.path) || originalQueryItem.path;
        targetFolder = targetFolder || targetFolderItem.path;

        if (sourceFolder === targetFolder // Try to move to the same location

            // Try to move to its own child folder. We neeed to be careful here to not also block folders that are substring of others.
            // Lets say we have two folder:  SQ/AAAAAA and SQ/AAA, in this case its fine to move AAA into AAAAAA. However, we don't want to be able
            // to move SQ/AAAAAA into SQ/AAAAAA/BBB. The code used to just to targetFolder.indexOf(originalQueryItem.path) which blocks the nesting case, but also
            // blocks moving AAA into AAAAAA. To fix that I only do the check if its a folder and in that case I append a trailing slash to ensure I am matching
            // a folder path and not the leaf query
            || (originalQueryItem.isFolder && targetFolder.indexOf(Utils_String.endsWith(originalQueryItem.path, "/") ? originalQueryItem.path : originalQueryItem.path + "/") === 0)
            || originalQueryItem.path === targetFolder) { // Try to move to itself
            return originalQueryItem;
        }

        const targetFolderRoot = getRootDirectory(targetFolder) || targetFolder;
        const isPublic = targetFolderItem ? targetFolderItem.isPublic : targetFolderRoot !== this._queryHierarchyItemDataProvider.getMyQueriesFolderItem().path;

        // Update query item and store data
        const updatedQueryItem: QueryItem = {
            ...originalQueryItem,
            isPublic: isPublic,
            name: newName || originalQueryItem.name,
            path: `${targetFolder}/${newName || originalQueryItem.name}`
        };

        // For moving, we check if the target already exists before actually updating the stores
        if (this._queryHierarchyItemDataProvider.itemExists(updatedQueryItem.path)) {
            throw new Error(Resources.QueryMoveOrRename_QueryItemAlreadyExists);
        }

        this._updateQueryReferences(updatedQueryItem);
        const parentItem = this._queryHierarchyItemDataProvider.getItem(targetFolder);
        const parentId = parentItem ? parentItem.id : targetFolder; // Always use id while passing in the url, path may contain characters that are not supported in the url

        try {
            const updatedQuery = await this.workItemTrackingClient.createQuery(updatedQueryItem as QueryHierarchyItem, this._projectId, parentId);
            if (this._querySearchDataProvider.getSearchStatus() === QuerySearchStatus.ResultsReady && this._activeQueryDataProvider.getValue() === ActiveQueryView.All) {
                // If we are in the All view we need to kick off a server side search to update the view as a result of rename
                // while the Favorites view is purely client side
                this.performSearch(this._querySearchDataProvider.getSearchText());
            }

            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                    WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_MOVE_QUERY,
                    {
                        "sourcePath": sourceFolder,
                        "targetPath": targetFolder,
                        "viaDragDrop": viaDragDrop,
                        "success": true
                    }), true);

            return updatedQuery as QueryItem;
        } catch (error) {
            // Revert move
            this._updateQueryReferences(originalQueryItem);
            publishErrorToTelemetry(error);
            throw error;
        }
    }

    public showErrorMessageForQueriesView(errorMessage: string | JSX.Element): void {
        this._actionsHub.PushContributionErrorMessage.invoke({ message: errorMessage, contribution: QueryContribution.Directory });
    }

    public showErrorMessageForTriageView(errorMessage: string | JSX.Element): void {
        this._actionsHub.PushContributionErrorMessage.invoke({ message: errorMessage, contribution: QueryContribution.Triage });
    }

    public dismissErrorMessageForQueriesView(): void {
        this._actionsHub.DismissContributionErrorMessage.invoke(QueryContribution.Directory);
    }

    public dismissErrorMessageForTriageView(): void {
        this._actionsHub.DismissContributionErrorMessage.invoke(QueryContribution.Triage);
    }

    public showInfoMessageForQueriesView(infoMessage: string | JSX.Element): void {
        this._actionsHub.PushContributionInfoMessage.invoke({ message: infoMessage, contribution: QueryContribution.Directory });
    }

    public dismissInfoMessageForQueriesView(): void {
        this._actionsHub.DismissContributionInfoMessage.invoke(QueryContribution.Directory);
    }

    private _isTreeLoaded(rootIdOrPath: string, depth: number = 0): boolean {
        if ((!this._queryHierarchyItemDataProvider.itemExists(rootIdOrPath))) {
            return false;
        } else {
            const root = this._queryHierarchyItemDataProvider.getItem(rootIdOrPath);
            if (depth > 0) {
                return root.children && root.children.every(child => this._isTreeLoaded(child.id, depth - 1));
            } else {
                return true;
            }
        }
    }

    public async ensureQueryItem(idOrPath: string, depth: number = 0): Promise<void> {
        if (!this._isTreeLoaded(idOrPath, depth)) {

            try {
                PerfScenarioManager.addSplitTiming(
                    PerformanceEvents.QUERIESHUB_ACTIONS_ENSUREQUERYITEM_REQUEST, true);
                // Temporary fix until we switch to new web platform. Currently in NQE if the query name contains # it will be stripped of by jquery
                // So instead of using rest client, we use data provider to get the desired results
                if (idOrPath.indexOf("#") !== -1) {
                    const parameters = { "queryPath": idOrPath, "depth": depth };
                    const queryItem = await getService(WebPageDataService)
                        .getDataAsync<QueryHierarchyItem>(GetQueryDataProviderContributionId, null, parameters);
                    this.invokeEnsureQueryItemActions(queryItem);
                } else {
                    const queryItem = await this.workItemTrackingClient.getQuery(this._projectId, idOrPath, QueryExpand.Wiql, depth);
                    this.invokeEnsureQueryItemActions(queryItem);
                }
            } catch (error) {
                PerfScenarioManager.addSplitTiming(
                    PerformanceEvents.QUERIESHUB_ACTIONS_ENSUREQUERYITEM_REQUEST, false);
                throw error;
            }
            PerfScenarioManager.addSplitTiming(
                PerformanceEvents.QUERIESHUB_ACTIONS_ENSUREQUERYITEM_REQUEST, false);
        }
    }

    public ensureQueryFolderItem(path: string): Promise<void> {
        this.setFolderPath(path);
        return this.ensureQueryItem(path, 1).then(() => {
            const parent = this._queryHierarchyItemDataProvider.getItem(path);
            this._actionsHub.QueryFolderItemLoaded.invoke(parent);
        });
    }

    public invokeEnsureQueryItemActions(queryItem: QueryHierarchyItem) {
        this._actionsHub.InitializeQueryHierarchyItem.invoke([queryItem]);
        if (queryItem.isFolder && queryItem.hasChildren) {
            this._actionsHub.QueryFolderChildrenLoaded.invoke(queryItem);
        }
    }

    public addTeamFavorite(queryItem: QueryItem, teamId: string, teamName: string): void {
        const favoriteParameters: FavoriteCreateParameters = {
            artifactId: queryItem.id,
            artifactName: queryItem.name,
            artifactProperties: "",
            artifactScope: {
                id: this._projectId,
                type: QueryItemFavoriteConstants.FavoriteArtifactScopeType,
                name: null
            },
            artifactType: FavoriteTypes.WIT_QUERYITEM,
            owner: null
        };

        this.favoriteClient.createFavoriteOfOwner(
            favoriteParameters,
            QueryItemFavoriteConstants.FavoriteOwnerScope,
            teamId).then((value) => {
                if (value) {
                    const favoriteGroup = this._queryFavoriteGroupDataProvider.get(teamId);

                    this._addFavorite(favoriteGroup, {
                        ...value,
                        parentId: teamId,
                        parentName: teamName
                    });
                }
            },
                (error: Error) => {
                    this.showErrorMessageForQueriesView(error.message);
                });
    }

    public removeTeamFavorite(queryFavorite: QueryFavorite): void {
        this.favoriteClient.deleteFavoriteOfOwnerById(queryFavorite.id, QueryItemFavoriteConstants.FavoriteOwnerScope, queryFavorite.parentId, queryFavorite.artifactType, queryFavorite.artifactScope.type, this._projectId)
            .then(() => {
                const favoriteGroup = this._queryFavoriteGroupDataProvider.get(queryFavorite.parentId);
                this._removeFavorite(favoriteGroup, queryFavorite, true);
            },
                (error: Error) => {
                    this.showErrorMessageForQueriesView(error.message);
                });
    }

    public removeUnfavoritedItems(favoriteGroups: QueryFavoriteGroup[]): void {
        if (favoriteGroups && favoriteGroups.length) {
            for (const favoriteGroup of favoriteGroups) {
                this._removeUnfavoritedItemsFromGroup(favoriteGroup);
            }
            this._actionsHub.QueryFavoriteGroupsUpdated.invoke(favoriteGroups);
        }
    }

    public setFolderPath(folderPath: string) {
        this._actionsHub.SetFolderPath.invoke(folderPath);
    }

    /**
     * Set the search text, which will be used to filter or search queries
     * @param searchText the term to be used to filter or search.
     */
    public setSearchText(searchText: string) {
        // Utils_string converts a undefined value to an empty string, so when getSearchText() is undefined we dont want to return immediately
        if (this._querySearchDataProvider.getSearchText() && Utils_String.equals(searchText, this._querySearchDataProvider.getSearchText(), true)) {
            return;
        }

        this._actionsHub.SearchTextChanged.invoke(searchText);

        // If we are in the All view we need to kick off a server side search
        // while the Favorites view is purely client side
        if (this._activeQueryDataProvider.getValue() === ActiveQueryView.All) {
            this.performSearch(this._querySearchDataProvider.getSearchText());
        }
    }

    /**
     * Performs a service query search
     */
    public performSearch(searchText: string) {
        if (searchText) {
            this._actionsHub.QuerySearchStarted.invoke(null);
            this._debouncedPerformSearch(searchText);
        }
    }

    /**
     * The implementation of the search which is used in the throttled delegate
     */
    private _performSearch = (searchText: string): void => {
        this._searchQueryItems(searchText).then((result: QueryHierarchyItemsResult) => {
            if (this._querySearchDataProvider.getSearchStatus() === QuerySearchStatus.InProgress) {
                this._actionsHub.QuerySearchFinished.invoke(result);
            }
        }, (error) => publishErrorToTelemetry(error));
    }

    public getUnsavedItemsMessage(): string {
        return Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_UNLOAD, {}) as string;
    }

    /**
     * Sets the last visited query item
     * @param queryId query item id
     */
    public setLastVisitedQueryItem(queryId: string): void {
        let lastVisitedGroup = this._queryFavoriteGroupDataProvider.get(QueriesConstants.LastVisitedQueryGroupKey);
        const lastVisitedData = {
            artifactId: queryId,
            artifactIsDeleted: false,
            artifactName: Resources.LastVisitedGroupName,
            id: Utils_String.generateUID(),
            parentName: lastVisitedGroup ? lastVisitedGroup.name : Resources.LastVisitedGroupName,
            parentId: lastVisitedGroup ? lastVisitedGroup.id : QueriesConstants.LastVisitedQueryGroupKey
        } as QueryFavorite;

        if (lastVisitedGroup) {
            lastVisitedGroup.favorites = [lastVisitedData];
        } else {
            lastVisitedGroup = {
                favorites: [lastVisitedData],
                isExpanded: true,
                name: Resources.LastVisitedGroupName,
                id: QueriesConstants.LastVisitedQueryGroupKey
            } as QueryFavoriteGroup;
        }

        this._actionsHub.QueryFavoriteGroupUpdated.invoke(lastVisitedGroup);
    }

    private _removeUnfavoritedItemsFromGroup(favoriteGroup: QueryFavoriteGroup) {
        const favorites = favoriteGroup.favorites.filter((value: QueryFavorite) => {
            return !value.isRemoved;
        });
        if (favorites.length === 0 && this._shouldShowEmptyContent(favoriteGroup.id)) {
            favorites.push(this._getEmptyFavoriteContent(favoriteGroup.id, favoriteGroup.name));

            const emptyContent = this._getEmptyQueryItemContent(favoriteGroup.id);
            this._actionsHub.QueryFavoriteEmptyContentAdded.invoke(emptyContent);
        }

        favoriteGroup.favorites = favorites;
        favoriteGroup.isEmpty = QueryUtilities.isEmptyFavoriteGroup(favoriteGroup);
    }

    private _expandQueryFolder(queryItem: QueryItem): void {
        this._actionsHub.QueryFolderExpanded.invoke(queryItem);
    }

    private _handleToggleFavorite(): void {
        this._actionsHub.FavoritesActions.ToggleFavorite.addListener((itemData: FavoriteItemData) => {
            const group = this._queryFavoriteGroupDataProvider.get(QueriesConstants.MyFavoritesGroupKey);

            Promise.resolve().then(() => {
                if (itemData.favorited) {
                    this._addFavorite(group, {
                        ...itemData.favorite,
                        parentId: QueriesConstants.MyFavoritesGroupKey,
                        parentName: Resources.MyFavoritesGroupName
                    });
                } else {
                    this._removeFavorite(group, {
                        ...itemData.favorite,
                        parentId: QueriesConstants.MyFavoritesGroupKey,
                        parentName: Resources.MyFavoritesGroupName
                    }, false);
                }
            });
        });
    }

    private _addFavorite(favoriteGroup: QueryFavoriteGroup, favorite: QueryFavorite) {
        const favorites = favoriteGroup.favorites.filter((value) => {
            return !Utils_String.equals(value.artifactId, QueryUtilities.getEmptyQueryItemId(favoriteGroup.id), true)
                && !Utils_String.equals(value.artifactId, favorite.artifactId, true); // If we unfavorite a query, we still keep it in the store. If we refavorite the query we don't want to add a second copy
        });

        favorites.push(favorite);

        const updatedFavoriteGroup: QueryFavoriteGroup = {
            ...favoriteGroup,
            isEmpty: false,
            favorites: favorites
        };

        this._actionsHub.QueryFavoriteGroupUpdated.invoke(updatedFavoriteGroup);

        const emptyContent = this._queryHierarchyItemDataProvider.getItem(QueryUtilities.getEmptyQueryItemId(favoriteGroup.id));
        if (emptyContent) {
            this._actionsHub.QueryFavoriteEmptyContentRemoved.invoke(emptyContent);
        }
    }

    private _removeFavorite(favoriteGroup: QueryFavoriteGroup, queryFavorite: QueryFavorite, removeFromGroup: boolean) {
        const updatedFavorites: QueryFavorite[] = [];
        for (const favorite of favoriteGroup.favorites) {
            updatedFavorites.push({
                ...favorite,
                isRemoved: favorite.isRemoved || Utils_String.equals(queryFavorite.artifactId, favorite.artifactId, true) // if it's already removed we don't want to un-remove it because we are now trying to remove a second, different favorite
            });
        }

        const updatedGroup: QueryFavoriteGroup = {
            ...favoriteGroup,
            favorites: updatedFavorites,
        };

        if (removeFromGroup) {
            this._removeUnfavoritedItemsFromGroup(updatedGroup);
        }

        this._actionsHub.QueryFavoriteGroupUpdated.invoke(updatedGroup);
    }

    private _getEmptyFavoriteContent(parentId: string, parentName: string): QueryFavorite {
        return {
            artifactId: QueryUtilities.getEmptyQueryItemId(parentId),
            parentId: parentId,
            id: QueryUtilities.getEmptyQueryItemId(parentId),
            parentName: parentName,
            isEmptyFolderContext: true,
        } as QueryFavorite;
    }

    private _getEmptyQueryItemContent(id: string): ExtendedQueryHierarchyItem {
        return {
            id: QueryUtilities.getEmptyQueryItemId(id),
            name: VSS_Resources_Platform.NoItemsInThisFolder,
            isEmptyFolderContext: true
        } as ExtendedQueryHierarchyItem;
    }

    private _shouldShowEmptyContent(id: string): boolean {
        return Utils_String.equals(id, QueriesConstants.MyFavoritesGroupKey, true) ||
            Utils_String.equals(id, QueryItemFavoriteConstants.TeamFavoriteLoadingGroupKey, true);
    }

    private _updateFavorites(favoriteGroups: QueryFavoriteGroup[]): void {
        for (const group of favoriteGroups) {
            if (group.favorites.length === 0 && this._shouldShowEmptyContent(group.id)) {
                const emptyFavoriteContent = this._getEmptyFavoriteContent(group.id, group.name);
                group.favorites.push(emptyFavoriteContent);
                group.isEmpty = true;
                const emptyContent = this._getEmptyQueryItemContent(group.id);

                // Populating for queryhierarchy item store
                this._actionsHub.QueryFavoriteEmptyContentAdded.invoke(emptyContent);
            }
        }

        this._actionsHub.InitializeQueryFavoriteGroups.invoke(favoriteGroups);
    }

    private _getEmptyFolderContentItem(queryFolder: QueryHierarchyItem): QueryItem {
        return {
            id: QueryUtilities.getEmptyQueryItemId(queryFolder.id),
            name: VSS_Resources_Platform.NoItemsInThisFolder,
            path: `${queryFolder.path}/${VSS_Resources_Platform.NoItemsInThisFolder}`,
            isEmptyFolderContext: true,
            isChildrenLoaded: false,
            depth: 0,
            expanded: false,
            expanding: false,
            children: [],
            clauses: null,
            columns: [],
            createdBy: null,
            createdDate: null,
            filterOptions: 0,
            hasChildren: false,
            isDeleted: false,
            isFolder: false,
            isInvalidSyntax: false,
            isPublic: true,
            lastModifiedBy: null,
            lastModifiedDate: null,
            linkClauses: null,
            queryType: QueryType.Flat,
            queryRecursionOption: null,
            sortColumns: [],
            sourceClauses: null,
            targetClauses: null,
            wiql: "",
            _links: null,
            url: "",
            lastExecutedBy: null,
            lastExecutedDate: null
        };
    }



    private _getParentFolder(childItemPath: string): ExtendedQueryHierarchyItem {
        const parentPathLength = childItemPath.lastIndexOf("/");
        if (parentPathLength !== -1) {
            const parentPath = childItemPath.substr(0, parentPathLength);
            const parentFolder = this._queryHierarchyItemDataProvider.getItem(parentPath);
            if (parentFolder) {
                return {
                    ...parentFolder
                };
            }
        }

        return null;
    }

    private async _searchQueryItems(searchText: string): Promise<QueryHierarchyItemsResult> {
        PerfScenarioManager.addSplitTiming(
            PerformanceEvents.QUERIESHUB_ACTIONS_SEARCHQUERYITEMS_REQUEST, true);

        try {
            const result = await this.workItemTrackingClient.searchQueries(this._projectId, searchText, QueriesHubConstants.MaxQuerySearchResultCount, QueryExpand.Wiql);
            PerfScenarioManager.addSplitTiming(
                PerformanceEvents.QUERIESHUB_ACTIONS_SEARCHQUERYITEMS_REQUEST, false);

            if (result && result.value) {
                // Send the results we go to the query hierarchy item store
                this._actionsHub.InitializeQueryHierarchyItem.invoke(result.value);
                return result;
            }

            return { value: [], count: 0, hasMore: false };
        } catch (error) {
            this.showErrorMessageForQueriesView(error.message);
            return { value: [], count: 0, hasMore: false };
        }
    }

    private async _getQueryItems(ids: string[], promptErrorResponse: boolean): Promise<QueryHierarchyItem[]> {
        try {
            const jsonResponse = await this.workItemTrackingBatchClient.getQueriesBatch(ids);
            if (jsonResponse && jsonResponse.value) {
                const queryItems: QueryHierarchyItem[] = jsonResponse.value.reduce((results: QueryHierarchyItem[], value) => {
                    if (value.code === 200) {
                        results.push(this._parseQueryHierarchyItemData(value.body));
                    } else if (promptErrorResponse) { // prompt error message if set to true
                        const data = JSON.parse(value.body);
                        this.showErrorMessageForQueriesView(data.value.Message);
                    }
                    return results;
                }, []);

                // Result contains only the found queries
                return queryItems;
            }

            return [];
        } catch (error) {
            this.showErrorMessageForQueriesView(error.message);
            return [];
        }
    }

    private _initializeQueryPermissionMetadata(): void {
        if (this._queryDataProvider && this._queryDataProvider.queryItemPermissionSet) {
            this._actionsHub.InitializeQueryPermissionMetadata.invoke(this._queryDataProvider.queryItemPermissionSet);
        }
    }

    private _initializeFavoritesCreatorFromDataProvider(): void {
        if (this._queryDataProvider && this._queryDataProvider.queryFavoriteGroups) {
            let favorites: QueryFavorite[] = [];
            for (const group of this._queryDataProvider.queryFavoriteGroups) {
                const isLastVisitedGroup = group.id === QueriesConstants.LastVisitedQueryGroupKey;
                if (!isLastVisitedGroup) {
                    favorites = favorites.concat(group.favorites);
                }
            }

            // to save a server roundtrip, initialize the favorites action
            // creator with the favorites read from the query data provider.
            this.favoritesActionsCreator.initializeStoreFromExistingData(favorites);
        } else {
            this.favoritesActionsCreator.initializeStore(
                [FavoriteTypes.WIT_QUERYITEM],
                {
                    id: tfsContext.navigation.projectId,
                    name: tfsContext.navigation.project,
                    type: QueryItemFavoriteConstants.FavoriteArtifactScopeType,
                }
            );
        }
    }

    private _initializeAndRunQueryItemFromDataProvider(): void {
        if (this._queryDataProvider && this._queryDataProvider.query) {
            const query: QueryHierarchyItem = ContractSerializer.deserialize(this._queryDataProvider.query, TypeInfo.QueryHierarchyItem, false, true);
            this._actionsHub.InitializeQueryHierarchyItem.invoke([query]);

            // we preload the query for both the folder view and results view.  only
            // try and run it if it's not a folder.
            if (!query.isFolder) {
                const workItemStore: WorkItemStore = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);
                const queryParams: IQueryParamsExtras = {
                    persistenceId: query.id
                };
                workItemStore.beginQuery(this._projectId, query.wiql, null, () => { }, queryParams);
            } else {
                // it's a folder, so get all the children in the hierarchy too
                this._actionsHub.QueryFolderChildrenLoaded.invoke(query);
            }
        }
    }

    private _parseQueryHierarchyItemData(json: string): QueryHierarchyItem {
        const data = JSON.parse(json);
        const resolvedData = ContractSerializer.deserialize(data, TypeInfo.QueryHierarchyItem, false, true);
        return resolvedData;
    }

    private _getQueryDataProvider(): QueryDataProvider {
        return getService(WebPageDataService).getPageData<QueryDataProvider>(DataProviderConstants.QueryDataProviderId);
    }

    private _getQueryTeamFavoritesDataProvider(): Promise<QueryFavoritesDataProvider> {
        return getService(WebPageDataService)
            .getDataAsync<QueryFavoritesDataProvider>(DataProviderConstants.QueryTeamFavoriesDataProviderId);
    }

    public getAdhocQueryDefinition(idOrName: string, project: Project, data: IQueryHierarchyData): QueryDefinition {

        let item: QueryDefinition;
        if (Utils_String.localeIgnoreCaseComparer(idOrName, Resources.AssignedToMeQuery) === 0 ||
            Utils_String.ignoreCaseComparer(idOrName, QueryDefinition.ASSIGNED_TO_ME_ID) === 0) {

            item = new QueryDefinition(project, this._transform(data.assignedToMe));
            item.specialQuery = true;
            item.name = Resources.AssignedToMeQuery;
            item.sortPrefix = -100000;
            // Setting the storedpath so that the query result provider will have the path value set
            // Unsaved and recylebin query dont have this set since we dont show editor.
            item.storedPath = Resources.AssignedToMeQuery;
        } else if ((Utils_String.localeIgnoreCaseComparer(idOrName, Resources.FollowedWorkItemsQuery) === 0 ||
            Utils_String.ignoreCaseComparer(idOrName, QueryDefinition.FOLLOWED_WORKITEMS_ID) === 0) &&
            isVisualizeFollowsEnabled(project.store.getTfsContext())) {

            item = new QueryDefinition(project, this._transform(data.followedWorkItems));
            item.specialQuery = true;
            item.name = Resources.FollowedWorkItemsQuery;
            item.sortPrefix = -101;
        } else if (Utils_String.localeIgnoreCaseComparer(idOrName, Resources.RecycleBin) === 0 ||
            Utils_String.ignoreCaseComparer(idOrName, QueryDefinition.RECYCLE_BIN_QUERY_ID) === 0) {

            item = new QueryDefinition(project, this._transform(data.recycleBin));
            item.specialQuery = true;
            item.name = Resources.RecycleBin;
        }

        return item;
    }

    public beginGetAdHocQueries(project: Project): Promise<IQueryHierarchyData> {
        const cachedPromise: Promise<IQueryHierarchyData> = <Promise<IQueryHierarchyData>>project.relatedData[ADHOC_QUERIES_PROMISE_KEY];

        if (cachedPromise) {
            return cachedPromise;
        }

        const adhocQueriesPromise = new Promise<IQueryHierarchyData>((resolve, reject) => {
            project.store.metadataCacheStampManager.addStampToParams(WITCommonConstants.AdhocQueries, null, (params) => {
                Ajax.getMSJSON(this._getApiLocation(project, false, "AdHocQueries"), params,
                    (queries: IQueryHierarchyData) => {
                        resolve(queries);
                    },
                    (error) => reject(error));
            });
        });

        project.relatedData[ADHOC_QUERIES_PROMISE_KEY] = adhocQueriesPromise;
        return adhocQueriesPromise;
    }

    public expandQueryFavoriteGroup(groupId: string): void {
        this._actionsHub.QueryFavoriteGroupExpanded.invoke(groupId);
        this._debouncedToggleFavoriteGroupMru(groupId, true);
    }

    public collapseQueryFavoriteGroup(groupId: string): void {
        this._actionsHub.QueryFavoriteGroupCollapsed.invoke(groupId);
        this._debouncedToggleFavoriteGroupMru(groupId, false);
    }

    private _toggleFavoriteGroupMru = async (targetGroupId: string, expand: boolean): Promise<void> => {
        // In event of lots of actions happened in a short period (see QueryUtilities.DefaultDebounceWait),
        // the debounced function makes sure only the latest attempt can successfully send the request to server.
        try {
            const queriesSettings = await this.settingsService.getEntriesAsync(
                QueriesMruConstants.QueriesSettingsKey,
                SettingsUserScope.Me,
                QueriesMruConstants.Scope,
                this._projectId);

            if (queriesSettings && queriesSettings.value) {
                let favoriteGroupsSettings = queriesSettings.value[QueriesMruConstants.FavoriteGroupExpandStatesKey] as { [key: string]: boolean };
                if (!favoriteGroupsSettings) {
                    favoriteGroupsSettings = {};
                }

                // Clean up non-existed groups
                const groupIdsInSettings = Object.keys(favoriteGroupsSettings);
                for (const groupId of groupIdsInSettings) {
                    if (!this._queryFavoriteGroupDataProvider.get(groupId)) {
                        delete favoriteGroupsSettings[groupId];
                    }
                }

                // Set the state for the current group
                favoriteGroupsSettings[targetGroupId] = expand;

                await this.settingsService.setEntries(
                    {
                        [`${QueriesMruConstants.QueriesSettingsKey}/${QueriesMruConstants.FavoriteGroupExpandStatesKey}`]: favoriteGroupsSettings
                    },
                    SettingsUserScope.Me,
                    QueriesMruConstants.Scope,
                    this._projectId);
            } else {
                throw new Error("Cannot find favorite groups MRU settings for user.");
            }
        } catch (error) {
            // Instead of prompt error, publish it to CI when failed to persist MRU changes.
            publishErrorToTelemetry(error);
        }
    }

    private _getApiLocation(project: Project, includeTeam: boolean, action?: string, params?: any): string {
        const teamOptions: any = {};
        if (!includeTeam) {
            // Prevent current team from being added to the api location.
            teamOptions.team = "";
        }

        return project.store.getTfsContext().getActionUrl(action || "", "wit", $.extend({ project: project.guid, area: "api" }, teamOptions, params));
    }

    private _transform(old: IQueryItemData): IQueryHierarchyItem {
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
}
