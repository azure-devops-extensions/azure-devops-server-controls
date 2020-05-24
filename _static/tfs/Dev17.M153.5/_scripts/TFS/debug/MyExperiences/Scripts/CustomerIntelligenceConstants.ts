export namespace AREAS {
    export const MyExperiences: string = "MyExperiences";
}

export namespace FEATURES {
    // WIT CI events
    export const Favorite_WIT_QueryPath_Parse_Exception = "WITQuery_Path_Parsing";

    // Project Creation CI events
    export const NEW_PROJECT_CREATE_ACTION = "NewProject_CreateAction";
    export const NEW_PROJECT_CANCEL_ACTION = "NewProject_CancelAction";

    // Framework CI events
    export const FILTER_CLICK_ACTION = "Filter_Click";
    export const HEADER_COLLAPSE_TOGGLE = "HeaderCollapseToggle";
    export const TIME_TO_INTERACTION = "TimeToInteract";
    export const NAVIGATION = "Navigation";
    export const HUB_LOAD = "HubLoad";
    export const HUB_SWITCH = "HubSwitch";

    // MyWork CI Events
    export const MYWORKCOMPONENT_MOUNTED = "MyWorkComponentMounted";
    export const MYWORK_GROUPDATA_LOADED = "MyWorkGroupDataLoaded";
    export const MYWORK_ROWDEFAULT_ACTION = "MyWorkRowDefaultAction";
    export const MYWORK_TITLE_ACTION = "MyWorkTitleAction";
    export const MYWORK_PROJECT_ACTION = "MyWorkProjectAction";
    export const MYWORK_FOLLOW_ACTION = "MyWorkFollowAction";
    export const MYWORK_UNFOLLOW_ACTION = "MyWorkUnfollowAction";
    export const MYWORK_SWITCHPIVOT = "MyWorkSwitchPivot";
    export const MYWORK_FILTERED = "MyWorkFiltered";
    export const MYWORK_SEARCHALL = "MyWorkSearchAll";

    // Projects / Favorites CI events
    export const FILTER_CHANGED = "FilterChanged";
    export const PROJECT_LINK_CLICK = "ProjectLinkClick";
    export const PROJECT_TOGGLE_EXPAND = "ProjectToggleExpand";
    export const PROJECT_HUB_LINK_CLICK = "ProjectHubLinkClick";
    export const FAVORITE_LINK_CLICK = "FavoriteLinkClick";
    export const FAVORITE_PROJECT_LINK_CLICK = "FavoriteProjectLinkClick";
    export const FAVORITE_TOGGLE_CLICK = "ToggleFavoriteClick";
    export const FAVORITE_DELETE_CLICK = "DeleteFavoriteClick";
    export const PROJECT_REMOVE_ITEM_FROM_MRU = "ProjectRemoveItemFromMru";
    export const PROJECTS_HUB_NEW_PROJECT_BUTTON_CLICK = "NewProjectButtonClick";
}

export namespace PROPERTIES {
    export const INITIAL_PIVOT = "InitialPivot";
    export const NUM_ITEMS = "NumItems";
    export const NUM_PROJECTS = "NumProjects";
    export const INDEX = "Index";
    export const PIVOT = "Pivot";
    export const PIVOT_NAME = "PivotName";
    export const GROUP = "Group";
    export const PROJECT_HUB_GROUP_RECENT = "Recent";
    export const PROJECT_HUB_GROUP_ALL = "All";
    export const FAVORITE_HUB_GROUP_PROJECT = "Project";
    export const MOBILE = "Mobile";
    export const ACCOUNT_HOME_PAGE = "AccountHomePage";
}

export namespace URL_PARAMETER_KEYS {
    export const TRACKING_DATA = "tracking_data";
}
