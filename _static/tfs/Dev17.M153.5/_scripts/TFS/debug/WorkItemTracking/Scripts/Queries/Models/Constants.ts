export namespace QueryItemFavoriteConstants {
    export const FavoriteArtifactScopeType: string = "Project";
    export const FavoriteOwnerScope: string = "Team";
    export const TeamFavoriteLoadingGroupKey = "TEAM_FAVORITES_LOADING";
}

export namespace QueriesMruConstants {
    export const Scope: string = "Project";
    export const QueriesSettingsKey = "Queries";
    export const FavoriteGroupExpandStatesKey = "FavoriteGroupExpandStates";
}

export namespace DataProviderConstants {
    export const QueryDataProviderId = "ms.vss-work-web.query-data-provider";
    export const QueryTeamFavoriesDataProviderId = "ms.vss-work-web.query-team-favorites-data-provider";
    export const AdhocQueriesDataProviderId = "ms.vss-work-web.migrate-query-data-provider";
}

export namespace QueriesHubConstants {
    export const QueriesHubContext = "QueriesHubContext";
    export const ControllerName = "queries";

    // Page actions
    export const MinePageAction = "mine";
    export const AllQueriesPageAction = "all";
    export const QueryFoldersPageAction = "folder";
    export const DefaultPageAction = QueriesHubConstants.MinePageAction;
    export const IdOptionKey = "id";

    export const WorkItemPaneViewOptionKey = "work-item-pane";
    export const NewQueryViewOptionKey = "newQuery";

    export const MaxQuerySearchResultCount = 50;
    export const SearchKeyword: string = "keyword";
    export const MaxBreadcrumbItemWidth: string = "300px";
    export const PickListMaxWidth: number = 500;
    export const PickListMaxHeight: number = 415;
}

export enum ChevronIconState {
    Collapsed = 0,
    Expanding,
    Expanded
}

export namespace TriageViewPivotsKey {
    export const QueryResults = "query";
    export const QueryEdit = "query-edit";
    export const QueryCharts = "query-charts";
    export const WorkItemEdit = "edit";
    export const NewWorkItem = "new";
}
