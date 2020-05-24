import { Favorite } from "Favorites/Contracts";
import { QueryHierarchyItem } from "TFS/WorkItemTracking/Contracts";
import { ITreeItem } from "VSSUI/Tree";

export interface QueryDataProvider {
    queryFavoriteGroups: QueryFavoriteGroup[];
    queryItemPermissionSet: string;
    query?: QueryItem;
}

export interface QueryFavoritesDataProvider {
    queryFavoriteGroups: QueryFavoriteGroup[];
}

export interface QueryFavoriteGroup {
    id: string;
    name: string;
    favorites: QueryFavorite[];
    isExpanded: boolean;
    isEmpty: boolean;
}

export interface QueryFavorite extends Favorite {
    parentId: string;
    parentName: string;
    isEmptyFolderContext?: boolean;
    isRemoved?: boolean;
}

export interface ExtendedQueryHierarchyItem extends QueryHierarchyItem {
    isChildrenLoaded: boolean;
    isEmptyFolderContext: boolean;
    isNoSubfolderContext?: boolean;
}

export interface QueryItem extends ExtendedQueryHierarchyItem {
    depth: number;
    expanded: boolean;
    expanding: boolean;
    itemIndex?: number;
}

export interface FavoriteQueryItem extends QueryItem {
    groupId: string;
}

export interface QueryTreeItem extends ITreeItem<ExtendedQueryHierarchyItem> {
    children: QueryTreeItem[];
    depth: number;
}

export interface ContributionMessage {
    contribution: QueryContribution;
    message: string | JSX.Element;
}

export enum QueryLoadingState {
    Loading,
    Loaded
}

export enum QuerySaveDialogMode {
    NewQuery,
    NewFolder,
    RenameQuery,
    RenameFolder,
    SaveAs
}

export enum QueryContribution {
    Directory,
    Triage
}

export namespace QueriesColumnKey {
    export const Title = "title";
    export const Folder = "folder";
    export const LastModifiedBy = "lastModifiedBy";
}

export interface MovedQueryItem {
    updatedPath: string;
    originalPath: string;
    isFolder: boolean;
}

export interface RenamedQueryItem {
    id: string;
    originalPath: string;
    renamedPath: string;
    name: string;
    isFolder: boolean;
}

export enum QuerySearchStatus {
    None,
    Pending,
    InProgress,
    ResultsReady
}

export enum ActiveQueryView {
    Mine,
    All
}

export interface TempQuery {
    tempId: string;
    wiql: string;
    queryType: string;
}

export interface IQueryCommandContributionContext {
    /** Query object. Returns null if query doesn't have an id yet (i.e. not saved) */
    query?: QueryHierarchyItem;

    /** Query wiql. If a saved query has been changed/is dirty, wiql != wiql of saved query */
    queryText: string;

    /** Array of selected work item ids */
    workItemIds: number[];
}

export interface IQueryPivotContributionContext {
    /** Query object. Returns null if query doesn't have an id yet (i.e. not saved) */
    query?: QueryHierarchyItem;
}

export interface IQueryParameters {
    id?: string;
    wiql?: string;
    path?: string;
    parentId?: string;
    witd?: string;
    templateId?: string;
    newQuery?: boolean;
    isVSOpen?: boolean;
    workItemId?: string;
    queryContextId?: string;
    triage?: boolean;
    tempQueryId?: string;
    searchText?: string;
    name?: string;
}

/**
 * Interface for the data contract used to create and consume temporary query.
 */
export interface ITemporaryQueryData {
    /**
     * WIQL query for the temporary query
     */
    queryText: string;

    /**
     * Type of the query
     */
    queryType?: string;
}

export interface IQueryStatus {
    primaryStatus: string;
    secondaryStatus: string;
}

export interface IQueryItemData {
    id: string;
    name: string;
    parent: string;
    folder: boolean;
    query?: string;
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