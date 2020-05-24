import { QueryHierarchyItemStore } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore";
import { QueryHierarchyStore, QueryHierarchyAdapter } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyStore";
import { QueryFavoriteGroupStore } from "WorkItemTracking/Scripts/Queries/Stores/QueryFavoriteGroupStore";
import { QueryPermissionMetadataStore } from "WorkItemTracking/Scripts/Queries/Stores/QueryPermissionMetadataStore";
import { QueryErrorMessageStore } from "WorkItemTracking/Scripts/Queries/Stores/QueryErrorMessageStore";
import { QueryInfoMessageStore } from "WorkItemTracking/Scripts/Queries/Stores/QueryInfoMessageStore";
import { QueryResultsProviderStore } from "WorkItemTracking/Scripts/Queries/Stores/QueryResultsProviderStore";
import { QuerySearchStore } from "WorkItemTracking/Scripts/Queries/Stores/QuerySearchStore";
import { FavoritesStore } from "Favorites/Controls/FavoritesStore";
import { ActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/ActionsHub";
import { TriageViewActionsHub } from "WorkItemTracking/Scripts/Queries/Actions/TriageViewActionsCreator";
import { ActiveQueryViewStore } from "WorkItemTracking/Scripts/Queries/Stores/ActiveQueryViewStore"; 
import { WorkItemFilterStore } from "WorkItemTracking/Scripts/Queries/Stores/WorkItemFilterStore"; 
import { TempQueryDataStore } from "WorkItemTracking/Scripts/Queries/Stores/TempQueryDataStore"; 
import { QueryFolderStore } from "WorkItemTracking/Scripts/Queries/Stores/QueryFolderStore"; 
import { FavoriteQueriesFilterProvider } from "WorkItemTracking/Scripts/Queries/FavoriteQueriesFilterProvider";
import { FolderQueriesFilterProvider } from "WorkItemTracking/Scripts/Queries/FolderQueriesFilterProvider";

export class StoresHub {
    public queryHierarchyItemStore: QueryHierarchyItemStore;
    public queryHierarchyStore: QueryHierarchyStore<QueryHierarchyAdapter>;
    public queryFavoriteGroupStore: QueryFavoriteGroupStore;
    public queryPermissionMetadataStore: QueryPermissionMetadataStore;
    public queryErrorMessageStore: QueryErrorMessageStore;
    public queryInfoMessageStore: QueryInfoMessageStore;
    public favoritesStore: FavoritesStore;
    public queryResultsProviderStore: QueryResultsProviderStore;
    public querySearchStore: QuerySearchStore;
    public activeQueryViewStore: ActiveQueryViewStore;
    public workItemFilterStore: WorkItemFilterStore;
    public tempQueryDataStore: TempQueryDataStore;
    public queryFolderStore: QueryFolderStore;

    constructor(actions: ActionsHub, triageViewActions: TriageViewActionsHub) {
        this.queryHierarchyItemStore = new QueryHierarchyItemStore(actions);
        this.queryHierarchyStore = new QueryHierarchyStore(new QueryHierarchyAdapter(actions));
        this.queryFavoriteGroupStore = new QueryFavoriteGroupStore(actions, new FavoriteQueriesFilterProvider(this.queryHierarchyItemStore));
        this.queryPermissionMetadataStore = new QueryPermissionMetadataStore(actions);
        this.queryErrorMessageStore = new QueryErrorMessageStore(actions);
        this.queryInfoMessageStore = new QueryInfoMessageStore(actions);
        this.favoritesStore = new FavoritesStore(actions.FavoritesActions);
        this.queryResultsProviderStore = new QueryResultsProviderStore(actions, triageViewActions);
        this.querySearchStore = new QuerySearchStore(actions);
        this.activeQueryViewStore = new ActiveQueryViewStore(actions);
        this.workItemFilterStore = new WorkItemFilterStore(triageViewActions);
        this.tempQueryDataStore = new TempQueryDataStore(triageViewActions);
        this.queryFolderStore = new QueryFolderStore(actions, new FolderQueriesFilterProvider());
    }
}
