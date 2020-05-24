export namespace BoardsHubClientConstants {
    export const CONTENT_PIVOT_KEY = "boards_hub_board_pivot_key";
    export const QUERY_PARAM_CONTRIBUTIONID = "contributionid";
    export const TEAM_PROFILE_CARD_CONSUMER = "BoardsContentHeader";
}

export namespace BoardsHubPerformanceTelemetryConstants {
    export const PIVOT_CHANGED = "BoardsHub_PivotChanged";
    export const PivotKey = "Pivot";

    export const BOARDS_REGISTRATION_LOAD_DIRECTORY = "BoardsRegistration_LoadBoardDirectory";
    export const BOARDS_START_LOADCONTENTVIEW = "BoardsHub_Start_LoadContentView";

    export const ACTIONSCREATOR_TOGGLE_LIVEUPDATE = "ActionsCreator_ToggleAutoUpdate";
    export const ACTIONSCREATOR_CONTENT_PIVOT_CHANGED = "ActionsCreator_ContentPivotChanged";
    export const Boards_LevelChange = "Boards.LevelChange";
    export const ACTIONSCREATOR_INITIALIZE_VISIBLE_WORKITEMTYPES = "ActionsCreator_InitializeVisibleWorkItemTypes";
    export const ACTIONSCREATOR_CONTENT_DATA_FETCHED = "ActionsCreator_ContentDataFetched";

    export const ACTIONSCREATOR_REFRESH_DIRECTORY_FAVORITES = "ActionsCreator_InitializeDirectoryFavorites";
    export const ACTIONSCREATOR_DIRECTORY_PIVOT_CHANGED = "ActionsCreator_DirectoryPivotChanged";

}

export namespace BoardsHubUsageTelemetryConstants {
    export const FAVORITE_BOARD_COUNT = "BoardsHub_FavoriteBoardCount";
    export const FAVORITE_TEAMS_COUNT = "BoardsHub_FavoriteTeamsCount";

    export const SWITCH_BOARD_USING_FAVORITE = "BoardsHub_SwitchBoardUsingFavorite";
    export const MANUALREFRESHREQUIRED = "BoardsHub_ManualRefreshRequired";

    export const SWITCH_TO_MATCHING_BACKLOG = "BoardsHub_SwitchToMatchingBacklog";

    // Directory

    // Features
    export const BOARDSDIRECTORY_VIEWINITIALIZED = "BoardsDirectory_ViewInitialized";
    export const BOARDSDIRECTORY_VIEWINITIALIZED_FILTER_USAGE = "BoardsDirectory_ViewInitializedFilterUsage";
    export const BOARDSDIRECTORY_FILTER_INITIALIZED = "BoardsDirectory_FilterInitialized";
    export const BOARDSDIRECTORY_PIVOT_SWITCHED = "BoardsDirectory_PivotSwitched";
    export const BOARDSDIRECTORY_NAVIGATEACTION = "BoardsDirectoryNavigateAction";

    export const BOARDSDIRECTORY_FILTERMANAGER_CURRENT_PIVOT = "BoardsDirectory_FilterManagerCurrentPivot";

    // Params
    export const BOARDSDIRECTORY_NEW_PIVOT = "BoardsDirectory_NewPivot";
    export const BOARDSDIRECTORY_SELECTEDPIVOT = "BoardsDirectory_SelectedPivot";
}

export namespace BoardsDirectoryConstants {
    export const ComponentName: string = "BoardsDirectory";
    export const ImmediateErrorPublishing: boolean = false;

    export const BOARD_DIRECTORY_ALL_DATA_PROVIDER = "ms.vss-work-web.boards-hub-directory-all-tab-data-provider";
    export const BOARD_DIRECTORY_MINE_DATA_PROVIDER = "ms.vss-work-web.boards-hub-directory-mine-tab-data-provider";
}