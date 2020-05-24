import { css } from "OfficeFabric/Utilities";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { QueryHierarchyItem, QueryType } from "TFS/WorkItemTracking/Contracts";
import { Debug } from "VSS/Diag";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import * as Telemetry from "VSS/Telemetry/Services";
import { getDirectoryName, getFileName } from "VSS/Utils/File";
import * as Utils_String from "VSS/Utils/String";
import { IViewOptionsValues } from "VSSUI/Utilities/ViewOptions";
import { ActionParameters, ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { SearchResultsProvider } from "WorkItemTracking/Scripts/Controls/WorkItemsProvider";
import { WITCustomerIntelligenceArea, WITCustomerIntelligenceFeature, WITPerformanceScenario } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { QueryDefinition } from "WorkItemTracking/Scripts/OM/QueryItem";
import { IQueriesHubContext } from "WorkItemTracking/Scripts/Queries/Components/QueriesHubContext";
import { ChevronIconState, QueriesHubConstants } from "WorkItemTracking/Scripts/Queries/Models/Constants";
import { ExtendedQueryHierarchyItem, FavoriteQueryItem, IQueryParameters, QueryFavorite, QueryItem, QueryFavoriteGroup } from "WorkItemTracking/Scripts/Queries/Models/Models";
import { QueriesViewState } from "WorkItemTracking/Scripts/Queries/QueriesViewState";
import { QueryHierarchyItemStore } from "WorkItemTracking/Scripts/Queries/Stores/QueryHierarchyItemStore";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { QueriesConstants } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";

export class QueryUtilities {
    public static readonly DefaultDebounceWait = 200;

    public static getContributedQueryMenuItemContext(queryItem: QueryItem): QueryHierarchyItem {
        return <QueryHierarchyItem>{
            id: queryItem.id,
            name: queryItem.name,
            isPublic: queryItem.isPublic,
            wiql: queryItem.wiql,
            path: queryItem.path
        };
    }

    public static getContributedQueryMenuItemContextFromQueryDefinition(queryItem: QueryDefinition): QueryHierarchyItem {
        return <QueryHierarchyItem>{
            id: queryItem.id,
            name: queryItem.name,
            isPublic: !queryItem.personal,
            wiql: queryItem.queryText,
            path: queryItem.storedPath
        };
    }

    public static convertQueryDefinintionToQueryItem(queryDefinition: QueryDefinition): QueryItem {
        return <QueryItem>{
            id: queryDefinition.id,
            name: queryDefinition.name,
            isPublic: !queryDefinition.personal,
            wiql: queryDefinition.queryText,
            path: queryDefinition.storedPath
        };
    }

    public static updatedQueryDefinitionFromQueryItem(targetQueryDefinition: QueryDefinition, queryItem: QueryItem): void {
        targetQueryDefinition.id = queryItem.id;
        targetQueryDefinition.name = queryItem.name;
        targetQueryDefinition.parentPath = getDirectoryName(queryItem.path);
        targetQueryDefinition.personal = !queryItem.isPublic;
        targetQueryDefinition.queryText = queryItem.wiql;
        targetQueryDefinition.queryType = QueryType[queryItem.queryType];
        targetQueryDefinition.storedPath = queryItem.path;
    }

    public static getChevronIconClassName(expandState: ChevronIconState): string {
        let className = "bowtie-icon";

        if (expandState === ChevronIconState.Expanded) {
            className += " bowtie-chevron-right expanded";
        } else {
            className += " bowtie-chevron-right";
        }

        return className;
    }

    public static getQueryItemExpandState(queryItem: QueryItem): ChevronIconState {
        if (queryItem.expanding) {
            return ChevronIconState.Expanding;
        } else if (queryItem.expanded) {
            return ChevronIconState.Expanded;
        } else {
            return ChevronIconState.Collapsed;
        }
    }

    public static getQueryIconClassName(query: QueryDefinition, hasError?: boolean): string {
        if (query) {

            // If a query has invalid wiql, then show an error symbol, else if it doesn't have a query type then render a empty icon to avoid flickering
            if (hasError) {
                return "query-type-icon bowtie-icon bowtie-status-error-outline";
            } else if (this.isRecycleBinQuery(query.id || query.name)) {
                return "query-type-icon bowtie-icon bowtie-recycle-bin";
            } else if (!query.queryType) {
                return "query-type-icon query-type-empty-icon bowtie-icon query-type-icon bowtie-icon bowtie-view-list";
            }

            return this.getQueryTypeIconClassName(QueryType[query.queryType]);
        }

        return "";
    }

    public static getQueryTypeIconClassName(queryType: QueryType, includeBowtieIconClass: boolean = true): string {
        switch (queryType) {
            case QueryType.Tree:
                return css("bowtie-view-list-tree", includeBowtieIconClass && "query-type-icon bowtie-icon");
            case QueryType.OneHop:
                return css("bowtie-view-list-group", includeBowtieIconClass && "query-type-icon bowtie-icon");
            case QueryType.Flat:
                return css("bowtie-view-list", includeBowtieIconClass && "query-type-icon bowtie-icon");
            default: // This can happen if the wiql is invalid, rest api doesnt populate queryType
                return css("bowtie-status-error-outline", includeBowtieIconClass && "query-type-icon bowtie-icon");
        }
    }

    public static getQueryTypeShortText(queryType: QueryType, hasError?: boolean): string {
        if (hasError) {
            return Resources.InvalidQuery;
        }

        switch (queryType) {
            case QueryType.Tree:
                return Resources.TreeLinksQuery;
            case QueryType.OneHop:
                return Resources.DirectLinksQuery;
            default:
                return Resources.FlatQuery;
        }
    }

    public static getParentQueryItem(queryItem: QueryItem, queryHierarchyItemStore: QueryHierarchyItemStore): ExtendedQueryHierarchyItem {
        // A queryItem won't have a path if it
        // is the empty GROUP item
        if (!queryItem || !queryItem.path) {
            return null;
        }

        const parentPath = getDirectoryName(queryItem.path) || queryItem.path;
        return queryHierarchyItemStore.getItem(parentPath);
    }

    public static getEmptyQueryItemId(id: string): string {
        return `${id}-EmptyContent`;
    }

    public static isEmptyFavoriteGroup(favoriteGroup: QueryFavoriteGroup) {
        const favorites = favoriteGroup.favorites;
        return favorites.length === 0 || (favorites.length === 1 && favorites[0].id.indexOf("EmptyContent") !== -1);
    }

    public static getNoSubfolderQueryItemId(id: string): string {
        return `${id}-NoSubfolders`;
    }
    
    public static getNoSubfolderContentItem(queryFolder: QueryHierarchyItem): QueryItem {
        const name = Resources.NoQueryFolderChildren;
        return {
            id: QueryUtilities.getNoSubfolderQueryItemId(queryFolder.id),
            name,
            path: `${queryFolder.path}/${name}`,
            isEmptyFolderContext: true,
            isNoSubfolderContext: true,
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

    /**
     * Generates a new path name for the reparent operation
     * @param sourcePath The complete path of the item to move
     * @param targetFolderPath The folder where the item will be moved to
     */
    public static reparentToFolderPath(sourcePath: string, targetFolderPath: string): string {
        return targetFolderPath + "/" + getFileName(sourcePath);
    }

    public static convertPathForStore(path: string): string {
        return path ? path.replace("\\", "/")
            .replace(/[\\\/]+/g, "/")
            .replace(/\/+$/, "")
            .toLocaleLowerCase() : path;
    }

    public static getEllipsisPath(path: string, lengthCap?: number): string {
        if (!path) {
            return path;
        }

        const pathLengthCapForDisplay = lengthCap || 90;

        if (path.length <= pathLengthCapForDisplay) {
            return path;
        } else {
            const pathSegments = path.split("/");
            let pathForDisplay;

            Debug.assert(pathSegments.length > 1, "Path is expected to have at least two segments.");

            if (pathSegments.length === 1) {
                // We are doing debug assert for this condition but...
                // ... we will still ellipses the path if it happens for UI
                pathForDisplay = `${path.slice(0, pathLengthCapForDisplay)}...`;
            } else if (pathSegments.length === 2) {
                const rootFolder = `${pathSegments[0]}/`;
                pathForDisplay = `${rootFolder}${pathSegments[1].slice(0, pathLengthCapForDisplay - rootFolder.length)}...`;
            } else {
                const folderEllipsis = ".../";
                pathForDisplay = `${pathSegments[0]}/${folderEllipsis}`;

                let lengthToShrink = path.length - pathLengthCapForDisplay;
                for (let index = 1; index < pathSegments.length - 1; index++) {
                    if (lengthToShrink > 0) {
                        // Shrink length for "[folder]/"
                        lengthToShrink -= pathSegments[index].length + 1;
                    } else {
                        pathForDisplay += `${pathSegments[index]}/`;
                    }
                }

                const nameSegment = pathSegments[pathSegments.length - 1];
                pathForDisplay += lengthToShrink > 0 ?
                    `${nameSegment.slice(0, nameSegment.length - lengthToShrink)}...` :
                    nameSegment;
            }

            return pathForDisplay;
        }
    }

    public static sortFavorites(favorites: QueryFavorite[]): QueryFavorite[] {
        return favorites.sort((x: QueryFavorite, y: QueryFavorite) => {

            const isXLastVisistedGroup = Utils_String.equals(x.parentId, QueriesConstants.LastVisitedQueryGroupKey, true);
            const isYLastVisistedGroup = Utils_String.equals(y.parentId, QueriesConstants.LastVisitedQueryGroupKey, true);
            const isXMyFavoriteGroup = Utils_String.equals(x.parentId, QueriesConstants.MyFavoritesGroupKey, true);
            const isYMyFavoriteGroup = Utils_String.equals(y.parentId, QueriesConstants.MyFavoritesGroupKey, true);

            if (isXLastVisistedGroup && !isYLastVisistedGroup) {
                return -1;
            } else if (!isXLastVisistedGroup && isYLastVisistedGroup) {
                return 1;
            } else if (isXMyFavoriteGroup && !isYMyFavoriteGroup) {
                return -1;
            } else if (!isXMyFavoriteGroup && isYMyFavoriteGroup) {
                return 1;
            } else {
                return Utils_String.ignoreCaseComparer(x.parentName, y.parentName) || Utils_String.ignoreCaseComparer(x.artifactName, y.artifactName);
            }
        });
    }

    public static getQueryItemsFromFavorites(favorites: QueryFavorite[], queryHierarchyItemStore: QueryHierarchyItemStore): FavoriteQueryItem[] {
        return favorites.map((value: QueryFavorite, index: number): FavoriteQueryItem => {
            return {
                ...queryHierarchyItemStore.getItem(value.artifactId),
                depth: 1,
                expanded: false,
                expanding: false,
                itemIndex: index,
                groupId: value.parentId,
            };
        });
    }

    /**
     * Add depth and expand information to a copy of hierarchy items
     * @param items to get depth and expand information from
     * @param hierarchyItems to copy
     */
    public static mergeQueryItems(items: IItem[], hierarchyItems: ExtendedQueryHierarchyItem[]): QueryItem[] {
        const hierarchyMap: { [fullName: string]: ExtendedQueryHierarchyItem } = {};
        for (const item of hierarchyItems) {
            hierarchyMap[item.path] = item;
        }
        return items.filter(i => i.fullName in hierarchyMap).map((value) => {
            return {
                ...hierarchyMap[value.fullName],
                depth: value.depth,
                expanded: value.expanded,
                expanding: value.expanding
            };
        });

    }

    public static getPivotWindowTitle() {
       return Resources.Queries;
    }

    public static isQueriesHubPivot(pivot: string): boolean {
        return pivot === QueriesHubConstants.MinePageAction || pivot === QueriesHubConstants.AllQueriesPageAction;
    }

    public static isQueriesFolderPivot(pivot: string): boolean {
        return pivot === QueriesHubConstants.QueryFoldersPageAction;
    }

    public static isSpecialQueryId(idOrPath: string): boolean {
        if (!idOrPath) {
            return false;
        }

        const upperId = idOrPath.toUpperCase();

        return (upperId === QueryDefinition.SEARCH_RESULTS_ID
            || upperId === QueryDefinition.CUSTOM_WIQL_QUERY_ID
            || upperId === QueryDefinition.RECYCLE_BIN_QUERY_ID
            || upperId === Resources.RecycleBin.toUpperCase());
    }

    public static isRecycleBinQuery(idOrPath: string): boolean {
        if (!idOrPath) {
            return false;
        }

        const upperId = idOrPath.toUpperCase();

        return (upperId === QueryDefinition.RECYCLE_BIN_QUERY_ID
            || upperId === Resources.RecycleBin.toUpperCase());
    }

    public static isCustomQuery(id: string): boolean {
        if (!id) {
            return false;
        }

        return id.toUpperCase() === QueryDefinition.CUSTOM_WIQL_QUERY_ID;
    }

    public static isSearchTextQuery(id: string): boolean {
        if (!id) {
            return false;
        }

        return id.toUpperCase() === QueryDefinition.SEARCH_RESULTS_ID;
    }

    public static isNewQuery(queryData: QueryDefinition): boolean {
        return queryData && Utils_String.isEmptyGuid(queryData.id);
    }

    public static getViewStateFromQueryResultsProvider(queriesHubContext: IQueriesHubContext, viewState: QueriesViewState): IViewOptionsValues {
        const queryResultsProvider = queriesHubContext && queriesHubContext.stores.queryResultsProviderStore.getValue();
        if (!queryResultsProvider || !queryResultsProvider.queryDefinition) {
            return {};
        }

        const newViewState: IViewOptionsValues = {};
        const queryId = queryResultsProvider.getUniqueId();

        // Choose pivot view on the provider data
        newViewState[ActionParameters.VIEW] = queryResultsProvider.isDirty() ? ActionUrl.ACTION_QUERY_EDIT : ActionUrl.ACTION_QUERY;
        if (queryResultsProvider instanceof SearchResultsProvider) {
            const querySearchProvider = <SearchResultsProvider>queryResultsProvider;
            newViewState[ActionParameters.SEARCHTEXT] = querySearchProvider.searchText;
        }

        if (QueryUtilities.isNewQuery(queryResultsProvider.queryDefinition)) {
            // New query params
            newViewState[ActionParameters.NEW_QUERY] = true;

            let parentId: string = queryResultsProvider.queryDefinition.parentId;
            if (!parentId && queryResultsProvider.queryDefinition.parentPath) {
                const parentItem = queriesHubContext.stores.queryHierarchyItemStore.getItem(queryResultsProvider.queryDefinition.parentPath);
                parentId = parentItem && parentItem.id;
            }
            newViewState[ActionParameters.PARENTID] = parentId;
        } else {
            // Query with id
            newViewState[queryResultsProvider.isCustomQuery() ? ActionParameters.TEMPQUERYID : ActionParameters.ID] = queryId;
        }

        if (viewState) {
            newViewState[ActionParameters.FULLSCREEN] = viewState.viewOptions.getViewOption(ActionParameters.FULLSCREEN);
        }

        return newViewState;
    }

    public static formatGroupKey(queryId: string, isSpecialQuery: boolean, userId: string): string {
        // All Query Configuration groups are keyed based on query Id.
        // "special" queries with known guids include the Identity guid to ensure uniquess.

        if (isSpecialQuery) {
            return `${userId}_${queryId}_${isSpecialQuery}`;
        } else {
            return queryId;
        }
    }

    public static createUrlForQuery(queryId: string): string {
        return `${TfsContext.getDefault().getPublicActionUrl("", QueriesHubConstants.ControllerName)}/query/${queryId}`;
    }

    public static createUrlForQueryFolderById(queryId: string): string {
        return `${TfsContext.getDefault().getPublicActionUrl("", QueriesHubConstants.ControllerName)}/${QueriesHubConstants.QueryFoldersPageAction}/${queryId}`;
    }

    public static createUrlForQueryFolderByPath(queryPath: string): string {
        return `${TfsContext.getDefault().getPublicActionUrl("", QueriesHubConstants.ControllerName)}/${QueriesHubConstants.QueryFoldersPageAction}/?path=${queryPath}`;
    }

    public static getQueryParametersFromViewOptions(viewState: QueriesViewState): IQueryParameters {
        const state = getNavigationHistoryService().getState();
        return {
            // For folders view dont parse the id param
            id: state[ActionParameters.VIEW] !== QueriesHubConstants.QueryFoldersPageAction ? viewState.viewOptions.getViewOption(ActionParameters.ID) : null,
            wiql: viewState.viewOptions.getViewOption(ActionParameters.WIQL),
            name: viewState.viewOptions.getViewOption(ActionParameters.NAME),
            path: viewState.viewOptions.getViewOption(ActionParameters.PATH),
            parentId: viewState.viewOptions.getViewOption(ActionParameters.PARENTID),
            witd: viewState.viewOptions.getViewOption(ActionParameters.WITD),
            templateId: viewState.viewOptions.getViewOption(ActionParameters.TEMPLATEID),
            newQuery: !!viewState.viewOptions.getViewOption(ActionParameters.NEW_QUERY),
            isVSOpen: !!viewState.viewOptions.getViewOption(ActionParameters.ISVSOPEN),
            workItemId: viewState.viewOptions.getViewOption(ActionParameters.WORKITEMID),
            queryContextId: viewState.viewOptions.getViewOption(ActionParameters.CONTEXT),
            triage: !!viewState.viewOptions.getViewOption(ActionParameters.TRIAGE),
            tempQueryId: viewState.viewOptions.getViewOption(ActionParameters.TEMPQUERYID),
            searchText: viewState.viewOptions.getViewOption(ActionParameters.SEARCHTEXT)
        };
    }

    public static isTriageViewPivot(queryParameters: IQueryParameters): boolean {
        // We check query params from view state instead of view since it is not always available (or up to date)
        return !!((queryParameters.id && Utils_String.isGuid(queryParameters.id))
            || queryParameters.tempQueryId
            || queryParameters.path
            || queryParameters.wiql
            || queryParameters.newQuery
            || queryParameters.searchText
            || queryParameters.triage);
    }

    /**
     * Resets all query performance scenarios
     */
    public static resetQueryPerformanceScenarios(): void {
        PerfScenarioManager.abortScenario(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENQUERYRESULTS);
        PerfScenarioManager.abortScenario(WITPerformanceScenario.QUERIESHUB_QUERIESVIEW_OPENFAVORITESPIVOT);
        PerfScenarioManager.abortScenario(WITPerformanceScenario.QUERIESHUB_TRIAGEVIEW_OPENWORKITEM);
        PerfScenarioManager.abortScenario(WITPerformanceScenario.QUERIESHUB_QUERIESVIEW_OPENFAVORITESPIVOT);
        PerfScenarioManager.abortScenario(WITPerformanceScenario.QUERIESHUB_QUERIESVIEW_OPENALLQUERIESPIVOT);
    }

    public static sortQueryFolderItems<T extends QueryHierarchyItem>(items: QueryHierarchyItem[]): void {
        QueryUtilities.sortFolderItems(items, (item) => item.name, (item) => item.isFolder);
    }

    public static sortFolderItems<T>(items: T[], getName: (item: T) => string, isFolder: (item: T) => boolean): void {
        items.sort((a, b) => {
            const result = +!!isFolder(b) - +!!isFolder(a);
            if (!result) {
                return Utils_String.localeIgnoreCaseComparer(getName(a), getName(b));
            }
            return result;
        });
    }

    public static getQueryHubDefaultAction(): string {
        return QueriesHubConstants.DefaultPageAction;
    }

    /**
     * @param isRoot Optional boolean to specify whether the query item clicked is a root breadcrumb or not
     */
    public static recordBreadcrumbTelemetry(isRoot: boolean = false): void {
        Telemetry.publishEvent(
            new Telemetry.TelemetryEventData(
                WITCustomerIntelligenceArea.NEW_QUERIES_EXPERIENCE,
                WITCustomerIntelligenceFeature.NEWQUERYEXPERIENCE_BREADCRUMB_CLICKED,
                {
                    "type": isRoot ? "Root" : "Children"
                }), false);
    }
}
