export namespace DefinitionsHubKeys {
    export const MinePivotItemKey: string = "mine";
    export const AllDefinitionsPivotItemKey: string = "all";
    export const AllDefinitionsSearchKey: string = "search-all-definitions";
}

export namespace DefinitionsActionsCreatorKeys {
    export const ActionCreatorKey_DefinitionsActionsCreator: string = "ACTION_CREATOR_KEY_DEFINITIONS_ACTION_CREATOR";
    export const ActionCreatorKey_ActiveDefinitionsActionsCreator: string = "ACTION_CREATOR_KEY_ACTIVE_DEFINITIONS_ACTION_CREATOR";
    export const ActionCreatorKey_FolderDialogActionsCreator: string = "ACTION_CREATOR_KEY_FOLDER_DIALOG_ACTION_CREATOR";
    export const ActionCreatorKey_FolderPickerActionsCreator: string = "ACTION_CREATOR_KEY_FOLDER_PICKER_ACTION_CREATOR";
    export const ActionCreatorKey_FavoritesActionsCreator: string = "ACTION_CREATOR_KEY_FAVORITES_ACTION_CREATOR";
	export const ActionCreatorKey_ActiveReleasesActionCreator: string = "ACTION_CREATOR_KEY_ACTIVE_RELEASES_ACTION_CREATOR";
	export const ActionCreatorKey_DashboardsActionCreator: string = "ACTION_CREATOR_KEY_DASHBOARDS_ACTION_CREATOR";
}

export namespace DefinitionsActionHubKeys {
    export const ActionHubKey_DefinitionsActionHub: string = "ACTION_HUB_KEY_DEFINITIONS_ACTION_HUB";
    export const ActionHubKey_FolderDialogActionHub: string = "ACTION_HUB_KEY_FOLDER_DIALOG_ACTION_HUB";
    export const ActionHubKey_FolderPickerActionHub: string = "ACTION_HUB_KEY_FOLDER_PICKER_ACTION_HUB";
    export const ActionHubKey_FavoritesActionHub: string = "ACTION_HUB_KEY_FAVORITES_ACTION_HUB";
    export const ActionHubKey_ActiveDefinitionsActionHub: string = "ACTION_HUB_KEY_ACTIVE_DEFINITIONS_ACTION_HUB";
    export const ActionHubKey_CommonDefinitionsActionHub: string = "ACTION_HUB_KEY_COMMON_DEFINITIONS_ACTION_HUB";
	export const ActionHubKey_ActiveReleasesActionsHub: string = "ACTION_HUB_KEY_ACTIVE_RELEASES_ACTIONS_HUB";
	export const ActionHubKey_DashboardsActionsHub: string = "ACTION_HUB_KEY_DASHBOARDS_ACTIONS_HUB";
}

export namespace DefinitionsStoreKeys {
    export const StoreKey_DefinitionsStoreKey: string = "STORE_KEY_DEFINITIONS_STORE";
    export const StoreKey_FoldersStoreKey: string = "STORE_KEY_FOLDERS_STORE";
    export const StoreKey_DefinitionsHubStoreKey: string = "STORE_KEY_DEFINITIONS_HUB_STORE";
    export const StoreKey_DefinitionsViewStoreKey: string = "STORE_KEY_DEFINITIONS_VIEW_STORE";
    export const StoreKey_ActiveDefinitionsStoreKey: string = "STORE_KEY_ACTIVE_DEFINITIONS_STORE";
    export const StoreKey_FolderDialogStoreKey: string = "STORE_KEY_FOLDER_DIALOG_STORE";
    export const StoreKey_FolderPickerStoreKey: string = "STORE_KEY_FOLDER_PICKER_STORE";
    export const StoreKey_FavoriteDefinitionsStoreKey: string = "STORE_KEY_FAVORITE_DEFINITIONS_STORE";
    export const StoreKey_CommonDefinitionsStoreKey: string = "STORE_KEY_COMMON_DEFINITIONS_STORE";
	export const StoreKey_ActiveReleasesStoreKey: string = "STORE_KEY_ACTIVE_RELEASES_STORE";
	export const StoreKey_DashboardsStoreKey: string = "STORE_KEY_DASHBOARDS_STORE";
    export const StoreKey_ActiveReleasesFilterStoreKey: string = "STORE_KEY_ACTIVE_RELEASES_FILTER_STORE";
    export const StoreKey_ActiveReleasesBranchFilterStoreKey: string = "STORE_KEY_ACTIVE_RELEASES_BRANCH_FILTER_STORE";
    export const StoreKey_ActiveReleaseApprovalsStoreKey: string = "STORE_KEY_ACTIVE_RELEASE_APPROVAL_STORE";
}

export namespace ReleasesHubContributionIds {
    export const RELEASES_CD_WORKFLOW_HUB_ID: string = "ms.vss-releaseManagement-web.cd-workflow-hub";
}

export namespace ReleasesHubDataProviderKeys {
    export const RELEASES_HUB_DATA_PROVIDER_ID: string = "ms.vss-releaseManagement-web.hub-explorer-2-data-provider";
    export const ACTIVE_DEFINITIONS_DATA_PROVIDER: string = "ms.vss-releaseManagement-web.active-definitions-data-provider";
    export const ACTIVE_RELEASES_DATA_PROVIDER: string = "ms.vss-releaseManagement-web.active-releases-data-provider";
}

export namespace SessionStorageKeys {
    export const ImportReleaseDefinitionStorageSessionKey = "microsoft.vsts.releasemanagement.importedDefinition";
}

export namespace AllDefinitionsContentKeys {
    export const DefinitionsLatestReleaseColumnHeaderKey: string = "lastRelease";
    export const DefinitionsPathColumnHeaderKey: string = "path";
    export const DefinitionsFavoritesColumnHeaderKey: string = "favorites";
	export const DefinitionsAnalysisColumnHeaderKey: string = "analysis";
    export const CreateReleaseMenuOptionKey: string = "createRelease";
    export const DraftReleaseMenuOptionKey: string = "draftRelease";
    export const EditMenuOptionKey: string = "edit";
    export const RenameMenuOptionKey: string = "rename";
    export const DeleteRdMenuOptionKey: string = "deleteRd";
    export const CloneMenuOptionKey: string = "clone";
    export const ExportMenuOptionKey: string = "export";
    export const AddToDashboardMenuOptionKey: string = "addToDashboard";
    export const MoveMenuOptionKey: string = "moveToFolder";
    export const SecurityMenuOptionKey: string = "security";
    export const MenuDividerKey_1: string = "divider_1";
    export const MenuDividerKey_2: string = "divider_2";
    export const MenuDividerKey_3: string = "divider_3";
    export const PathSeparator: string = "\\";
    export const SecurityTokenSeparator: string = "/";
    export const PinToDashboardSubMenuKey = "dashboardEntry";
    export const RenameDefinitionMenuOptionKey: string = "renameDefinition";

    export const CreateDefinitionMenuOptionKey: string = "createdefinition";
    export const CreateFolderMenuOptionKey: string = "createFolder";
    export const RenameFolderMenuOptionKey: string = "renameFolder";
    export const DeleteFolderMenuOptionKey: string = "deleteFolder";

    export const DefinitionsActionsInstanceId: string = "definitions-actions-instance-id";
}

export namespace ActiveReleasesMenuItemKeys {
    export const OpenMenuItemKey = "open-release-menu-item";
    export const OpenInNewTabMenuItemKey = "open-newtab-release-menu-item";
    export const StartMenuItemKey = "start-release-menu-item";
    export const RetainReleaseMenuItemKey = "retain-release-menu-item";
    export const AbandonReleaseMenuItemKey = "abandon-release-menu-item";
    export const DeleteReleaseMenuItemKey = "delete-release-menu-item";
    export const UndeleteReleaseMenuItemKey = "undelete-release-menu-item";
}

export namespace ActiveDefinitionsContentKeys {
    export const ActiveDefinitionsSearchKey: string = "search-all-definitions-for-mine-page";
    export const ActiveReleasesFilterKey: string = "active-releases-filter-view-action";
    export const ActiveReleasesSearchKey: string = "search-active-releases";
    export const ActiveReleasesAllReleasesActionKey: string = "active-releases-all-rel-viewaction";
}

export namespace ActiveReleaseColumnKeys {
    export const ActiveReleaseNameKey: string = "active-release-name-column";
    export const ActiveReleaseEnvironmentsKey: string = "active-release-environments-column";
    export const ActiveReleaseCreatedKey: string = "active-release-created-column";
    export const ActiveReleaseDescriptionKey: string = "active-release-description-column";
}

export namespace ActiveDefinitionsConstants {
    export const ActiveDefinitionDetailsInstanceId = "active-definitions-details";
}

export namespace MessageBarParentKeyConstants {
    export const DefinitionsHubSuccessMessageBarKey: string = "definitions-hub-success-messagebar-key";
    export const DefinitionsHubErrorMessageBarKey: string = "definitions-hub-error-messagebar-key";
    export const ActiveReleasesWarningMessageBarKey: string = "active-releases-warning-messagebar-key";
}

export class AllDefinitionsFavoriteConstants {
    public static FavoriteType: string = "Microsoft.TeamFoundation.ReleaseManagement.DefinitionEntry";
    public static FavoriteArtifactScope: string = "Project";
}

export namespace Links {
    export const GettingStartedLink = "https://aka.ms/rmhelp";
    export const SetupTriggersLink = "https://docs.microsoft.com/en-us/vsts/pipelines/release/triggers?view=vsts";
}

export namespace ActiveDefinitionsUrlParameterKeys{
    export const Branch = "branch";
    export const State = "state";
}

export namespace ReleasesViewCanvasConstants {
    export const EnvironmentNodeHeight: number = 24;
    export const EnvironmentNodeWidthLarge: number = 108; // has to be in-sync with .pending-approval-container
    export const EnvironmentNodeWidthSmall: number = 30;
}

export namespace DefinitionsHubViewOptionKeys {
    export const AllReleases = "all-releases-view-option-key";
    export const CurrentlyDeployed = "currently-deployed-view-option-key";
}