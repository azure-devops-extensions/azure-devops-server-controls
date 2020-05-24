import { FavoritesActions } from "Favorites/Controls/FavoritesActions";
import * as PivotView from "Presentation/Scripts/TFS/Components/PivotView";
import { QueryHierarchyItem, QueryHierarchyItemsResult } from "TFS/WorkItemTracking/Contracts";
import { Action } from "VSS/Flux/Action";
import { ActiveQueryView, ContributionMessage, ExtendedQueryHierarchyItem,
    MovedQueryItem, QueryContribution, QueryFavoriteGroup, QueryItem, RenamedQueryItem} from "WorkItemTracking/Scripts/Queries/Models/Models";

export class ActionsHub {

    // Active view
    public QueryViewChanged = new Action<ActiveQueryView>();

    // Query hierarchy store actions
    public InitializeQueryHierarchy = new Action<QueryHierarchyItem[]>();
    public ExpandQueryFolder = new Action<QueryItem>();
    public QueryFolderExpanded = new Action<QueryItem>();
    public QueryFolderCollapsed = new Action<QueryItem>();

    // Query hierarchy item store actions
    public InitializeQueryHierarchyItem = new Action<QueryHierarchyItem[]>();
    public InitializeQueryRootHierarchyItem = new Action<QueryHierarchyItem[]>();
    public QueryDeleted = new Action<QueryItem>();
    public QueryItemCreated = new Action<QueryItem>();
    public QueryItemUpdated = new Action<QueryItem | QueryItem[]>();
    public QueryItemMoved = new Action<MovedQueryItem>();
    public QueryItemRenamed = new Action<RenamedQueryItem>();
    public QueryFolderDeleted = new Action<QueryItem>();
    public QueryFolderChildrenLoaded = new Action<QueryHierarchyItem>();
    public QueryFolderEmptyContentLoaded = new Action<ExtendedQueryHierarchyItem>();
    public QueryFolderEmptyContentRemoved = new Action<ExtendedQueryHierarchyItem>();
    public QueryFolderItemLoaded = new Action<QueryHierarchyItem>();

    // Favorites store actions
    public InitializeQueryFavoriteGroups = new Action<QueryFavoriteGroup[]>();
    public QueryFavoriteGroupUpdated = new Action<QueryFavoriteGroup>();
    public QueryFavoriteLoadingGroupRemoved = new Action<QueryFavoriteGroup>();
    public QueryFavoriteGroupsUpdated = new Action<QueryFavoriteGroup[]>();
    public QueryFavoriteGroupExpanded = new Action<string>();
    public QueryFavoriteGroupCollapsed = new Action<string>();

    // Query Item Empty Favorite actions
    public QueryFavoriteEmptyContentAdded = new Action<ExtendedQueryHierarchyItem>();
    public QueryFavoriteEmptyContentRemoved = new Action<ExtendedQueryHierarchyItem>();

    // Query Permission actions
    public InitializeQueryPermissionMetadata = new Action<string>();

    // Error message actions
    public PushContributionErrorMessage = new Action<ContributionMessage>();
    public DismissContributionErrorMessage = new Action<QueryContribution>();

    // Info message actions
    public PushContributionInfoMessage = new Action<ContributionMessage>();
    public DismissContributionInfoMessage = new Action<QueryContribution>();

    // Search / Filter
    public SearchTextChanged = new Action<string>();
    public QuerySearchStarted = new Action<void>();
    public QuerySearchFinished = new Action<QueryHierarchyItemsResult>();

    // Other ActionsHub
    public PivotViewActions = new PivotView.ActionsHub();
    public FavoritesActions = new FavoritesActions();

    // Folder store actions
    public SetFolderPath = new Action<string>();
}