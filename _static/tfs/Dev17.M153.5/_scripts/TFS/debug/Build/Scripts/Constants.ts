import VSS = require("VSS/VSS");

export var DefaultClientPageSizeMax = 25;
export var DefaultServerPageSizeMax = 25;
export var HistogramSize = 10;
export var DefaultPageSize = 10;
export var BuildDefinitionRootPath: string = "\\";
export var OthersSource: string = "others";

export class UserActions {
    public static AddToMyFavorites: string = "ADD_TO_MY_FAVORITES";
    public static AddToTeamFavorites: string = "ADD_TO_TEAM_FAVORITES";
    public static ApplyBuiltFilter: string = "APPLY_BUILT_FILTER";
    public static CancelBuild: string = "CANCEL_BUILD";
    public static CloneDefinition: string = "CLONE_DEFINITION";
    public static EnableDefinition: string = "ENABLE_DEFINITION";
    public static ExportDefinition: string = "EXPORT_DEFINITION";
    public static DeleteBuild: string = "DELETE_BUILD";
    public static DeleteDefinition: string = "DELETE_DEFINITION";
    public static EditDefinition: string = "EDIT_DEFINITION";
    public static FolderClicked: string = "FOLDER_CLICKED";
    public static GetMoreMyFavorites: string = "MORE_MY_FAVORITES";
    public static GetMoreTeamFavorites: string = "MORE_TEAM_FAVORITES";
    public static GetMoreMyBuilds: string = "MORE_MY_BUILDS";
    public static GetMoreRecentBuilds: string = "MORE_RECENT_BUILDS";
    public static GetMoreAllDefinitions: string = "MORE_ALLDEFINITIONS";
    public static Help: string = "HELP";
    public static MoveDefinition: string = "MOVE_DEFINITION";
    public static NewDefinition: string = "NEW_DEFINITION";
    public static NewAgent: string = "NEW_AGENT";
    public static PauseDefinition: string = "PAUSE_DEFINITION";
    public static PinToDashboard: string = "PIN_DASHBOARD";
    public static QueueBuild: string = "QUEUE_BUILD";
    public static RemoveFromMyFavorites: string = "REMOVE_FROM_MY_FAVORITES";
    public static RemoveFromTeamFavorites: string = "REMOVE_FROM_TEAM_FAVORITES";
    public static RenameDefinition: string = "RENAME_DEFINITION";
    public static RetainBuild: string = "RETAIN_BUILD";
    public static SaveDefinitionAsTemplate: string = "SAVE_DEFINITION_TEMPLATE";
    public static SearchDefinitions: string = "SEARCH_DEFINITIONS";
    public static SortDefinitions: string = "SORT_DEFINITIONS";
    public static StopRetainingBuild: string = "STOP_RETAINING_BUILD";
    public static ToggleFavoritesFirst: string = "TOGGLE_FAVORITES_FIRST";
    public static ViewBuild: string = "VIEW_BUILD";
    public static ViewDefinition: string = "VIEW_DEFINITION";
    public static ViewDefinitionSecurity: string = "VIEW_DEFINITION_SECURITY";
    public static ViewFolderSecurity: string = "VIEW_FOLDER_SECURITY";
}

export class StoreChangedEvents {
    public static AllDefinitionsStoreUpdated: string = "ALLDEFINITIONS_STORE_UPDATED";
    public static BreadCrumbsStoreUpdated: string = "BREADCRUMBS_STORE_UPDATED";
    public static BuildStoreUpdated: string = "BUILD_STORE_UPDATED";
    public static ChangesStoreUpdated: string = "CHANGES_STORE_UPDATED";
    public static DefinitionFavoriteStoreUpdated: string = "DEFINITION_FAVORITE_STORE_UPDATED";
    public static DefinitionMetricStoreUpdated: string = "DEFINITION_METRIC_STORE_UPDATED";
    public static DefinitionStoreUpdated: string = "DEFINITION_STORE_UPDATED";
    public static FavoritesStoreUpdated: string = "FAVORITES_STORE_UPDATED";
    public static FolderStoreUpdated: string = "FOLDER_STORE_UPDATED";
    public static MyDefinitionsStoreUpdated: string = "MYDEFINITIONS_STORE_UPDATED";
    public static QueuesStoreUpdated: string = "QUEUES_STORE_UPDATED";
    public static SourceProviderStoreUpdated: string = "SOURCEPROVIDER_STORE_UPDATED";
    public static DefinitionSummaryStoreUpdated: string = "DEFINITIONSUMMARY_STORE_UPDATED";
    public static FolderManageStoreUpdated: string = "FOLDERMANAGE_STORE_UPDATED";
}

export class FavoriteStoreNames {
    public static MyFavorites: string = "My Favorites";
    public static TeamFavorites: string = "Team Favorites";
}

export class WellKnownViewFilters {
    public static AllDefinitionsViewBuiltFilter: string = "ALLDEFINITIONS_BUILT_FILTER";
    public static AllDefinitionsViewSortFilter: string = "ALLDEFINITIONS_SORT_FILTER";
}

export class WellKnownBuiltFilterValues {
    public static AnyTime: string = "ALLDEFINITIONS_BUILT_FILTER_ANYTIME";
    public static Today: string = "ALLDEFINITIONS_BUILT_FILTER_TODAY";
    public static Yesterday: string = "ALLDEFINITIONS_BUILT_FILTER_YESTERDAY";
    public static Last7Days: string = "ALLDEFINITIONS_BUILT_FILTER_LAST7DAYS";
    public static Last30Days: string = "ALLDEFINITIONS_BUILT_FILTER_LAST30DAYS";
    public static NotInLast7Days: string = "ALLDEFINITIONS_BUILT_FILTER_NOTLAST7DAYS";
    public static NotInLast30Days: string = "ALLDEFINITIONS_BUILT_FILTER_NOTLAST30DAYS";
    public static Never: string = "ALLDEFINITIONS_BUILT_FILTER_NEVER";
}

export class WellKnownClassNames {
    public static AllDefinitionsFolderMoveDialog: string = "build-alldefinitions-move-component-foldermanage";
    public static LazyComponentHolder: string = "build-lazy-dom-component-holder";
    public static RenameDefinitionDialog: string = "build-common-component-renamedefinition";
    public static SaveDefinitionDialog: string = "build-common-component-savedefinition";
    public static HubTitleContent: string = "build-titleArea";

    public static HubTitleContentSelector: string = "." + WellKnownClassNames.HubTitleContent;
}

export class WellKnownSortFilterValues {
    public static Name: string = "ALLDEFINITIONS_SORT_FILTER_NAME";
    public static Favorites: string = "ALLDEFINITIONS_SORT_FILTER_Favorites";
}

export class FilterTypes {
    public static Branch: string = "branch";
    public static Path: string = "path";
}

export class FlashMessageContentTypes {
    public static Information: string = "info";
    public static Success: string = "success";
    public static Failure: string = "failure";
    public static Warning: string = "warning";
}

export class Events {
    public static ClearComboControlInput: string = "CLEAR_COMBOCONTROL_INPUT";
}

export class WellKnownProperties {
    public static HostedAgentImageIdKey: string = "HostedAgentImageIdKey";
}

export class DataProvider {
    public static AllDefinitions: string = "ms.vss-build-web.build-definitions-hub-mine-tab-data-provider";
    public static MyDefinitions: string = "ms.vss-build-web.build-definitions-hub-alldefinitions-tab-data-provider";
    public static QueuedDefinition: string = "ms.vss-build-web.build-definitions-hub-queued-tab-data-provider";
}

export class CIOptinConstants {
    public static ImportDefinitionRelativeUrl: string = "/_apps/hub/ms.vss-ciworkflow.build-ci-hub?_a=import-build-definition";
}

export class ImportConstants {
    public static ImportStorageKey: string = "TFS-Build-Import";
}

export class IdentityPickerConstants {
    //https://vsowiki.com/index.php?title=Common_Identity_Picker#Consumer_IDs just to make consumer unique for telemetry
    public static ConsumerId = "02FBBA08-3314-4795-837F-163586888E9B";
}