import { urlHelper } from "VSS/Locations";
import { IFavoriteItem } from "Favorites/Controls/FavoriteItemPicker";
import { ArtifactScope, Favorite } from "Favorites/Contracts";
import { WorkItemTrackingHttpClient, getClient } from "TFS/WorkItemTracking/RestClient";
import { QueryHierarchyItem, QueryExpand, QueryType } from "TFS/WorkItemTracking/Contracts";

export interface IQueryFavoriteItem extends IFavoriteItem {
    url?: string;
    path?: string;
    modifiedBy?: string;
    modifiedDate?: string;
    properties?: any;
}

export function getAllQueryFavoriteItems(projectId: string): IPromise<IQueryFavoriteItem[]> {
    return getClient().getQueries(projectId, QueryExpand.All, 2, false).then((queries) => {
        let items: IQueryFavoriteItem[] = [];
        flattenFavorites(queries, items);
        return items;
    });
}

export function getAllQueryItems(projectId: string): IPromise<QueryHierarchyItem[]> {
    return getClient().getQueries(projectId, QueryExpand.All, 2, false).then((queries) => {
        let items: QueryHierarchyItem[] = [];
        flattenQueries(queries, items);
        return items;
    });
}

export function getInitialQueriesForPicker(projectId: string): IPromise<QueryHierarchyItem[]> {
    // Go fetch the first 10 queries, with maximum depth of 2.
    return getClient().getQueries(projectId, QueryExpand.All, 2, false).then((queries) => {
        let items: QueryHierarchyItem[] = [];
        flattenQueries(queries, items);
        return items.splice(0, 10);
    });
}

export function searchQueries(projectId: string, searchText: string): IPromise<QueryHierarchyItem[]> {
    return getClient().searchQueries(projectId, searchText, 100, QueryExpand.All, false).then((result) => {
        let items: QueryHierarchyItem[] = [];
        flattenQueries(result.value, items);
        return items;
    });
}

export function mapQueryToQueryFavoriteItem(q: QueryHierarchyItem): IQueryFavoriteItem {
    return {
        id: q.id,
        name: q.name,
        path: q.path,
        url: q.url,
        modifiedDate: q.lastModifiedDate.toGMTString(),
        modifiedBy: q.lastModifiedBy.name,
        properties: { queryType: q.queryType }
    };
}

export function mapQueryFavoriteToQuery(favorite: IQueryFavoriteItem): QueryHierarchyItem {
    return {
        id: favorite.id,
        name: favorite.name,
        path: favorite.path,
        url: favorite.url,
        lastModifiedDate: new Date(favorite.modifiedDate),
        lastModifiedBy: { name: favorite.modifiedBy },
        queryType: favorite.properties.queryType
    } as QueryHierarchyItem;
}

export function mapFavoriteToQuery(favorite: Favorite): QueryHierarchyItem {
    return {
        id: favorite.artifactId,
        name: favorite.artifactName,
        path: favorite.artifactProperties["QueryPath"],
        url: favorite._links ? favorite._links["page"] : undefined,
        queryType: QueryType.Flat
    } as QueryHierarchyItem;
}

export function mapQueryToFavorite(q: QueryHierarchyItem, artifactScope: ArtifactScope): Favorite {
    return {
        artifactId: q.id,
        artifactName: q.name,
        artifactProperties: {
            "QueryPath": q.path
        },
        artifactType: "Microsoft.TeamFoundation.WorkItemTracking.QueryItem",
        artifactScope: artifactScope,
        artifactIsDeleted: false,
        creationDate: undefined,
        id: undefined,
        owner: undefined,
        url: undefined,
        _links: undefined
    } as Favorite;
}

export function getQueryIcon(type: QueryType): string {
    if (type === QueryType.Tree) {
        return "view-list-tree";
    }
    else if (type === QueryType.OneHop) {
        return "view-list-group";
    }

    return "view-list";
}

function flattenFavorites(queries: QueryHierarchyItem[], items: IQueryFavoriteItem[]): void {
    for (let q of queries) {
        if (!q.isFolder) {
            items.push(mapQueryToQueryFavoriteItem(q));
        }
        else if (q.children) {
            flattenFavorites(q.children, items);
        }
    }
}

function flattenQueries(queries: QueryHierarchyItem[], items: QueryHierarchyItem[]): void {
    for (let q of queries) {
        if (!q.isFolder) {
            items.push(q);
        }
        else if (q.children) {
            flattenQueries(q.children, items);
        }
    }
}

