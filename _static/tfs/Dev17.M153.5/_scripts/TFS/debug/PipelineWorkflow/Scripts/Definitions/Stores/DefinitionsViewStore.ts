import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { FriendlyDate, PastDateMode } from "DistributedTaskControls/Common/FriendlyDate";

import { MessageBarType } from "OfficeFabric/MessageBar";

import { IFolderEntry, IDefinitionEntry, ISearchResultDefinitionEntry, IAllDefinitionsState, IAddToDashboardState } from "PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";
import { DefinitionsStoreKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { DashboardsStore } from "PipelineWorkflow/Scripts/Definitions/Dashboards/DashboardsStore";
import { DefinitionsActionsHub, IFolderNamePayload, IDefinitionsActionPayload, ISearchResultsActionPayload } from "PipelineWorkflow/Scripts/Definitions/DefinitionsActions";
import { FavoriteDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoriteDefinitionsStore";
import { FavoritesActionsHub, IDeleteFavoritePayload } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoritesActions";
import { Favorite } from "Favorites/Contracts";
import { CommonDefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/CommonDefinitionsStore";
import { DefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/DefinitionsStore";
import { FoldersStore } from "PipelineWorkflow/Scripts/Definitions/Stores/FoldersStore";
import { DefinitionsUtils } from "PipelineWorkflow/Scripts/Definitions/Utils/DefinitionsUtils";
import { SecurityUtils } from "PipelineWorkflow/Scripts/Editor/Common/SecurityUtils";
import { IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { ReleaseUrlUtils } from "PipelineWorkflow/Scripts/ReleaseProgress/Utilities/ReleaseUrlUtils";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseManagementSecurityPermissions, ReleaseManagementUISecurityPermissions } from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import { PinArgs } from "TFSUI/Dashboards/AddToDashboard";

import { announce } from "VSS/Utils/Accessibility";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

export class DefinitionsViewStore extends StoreBase {

    constructor() {
        super();
        this._definitionsStore = StoreManager.GetStore<DefinitionsStore>(DefinitionsStore);
        this._foldersStore = StoreManager.GetStore<FoldersStore>(FoldersStore);
        this._favoriteDefinitionsStore = StoreManager.GetStore<FavoriteDefinitionsStore>(FavoriteDefinitionsStore);
        this._commonDefinitionsStore = StoreManager.GetStore<CommonDefinitionsStore>(CommonDefinitionsStore);
        this._dashboardsStore = StoreManager.GetStore<DashboardsStore>(DashboardsStore);
        this._initializeState();
    }

    public static getKey(): string {
        return DefinitionsStoreKeys.StoreKey_DefinitionsViewStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);

        this._definitionsActionsHub = ActionsHubManager.GetActionsHub<DefinitionsActionsHub>(DefinitionsActionsHub, instanceId);
        this._favoritesActionsHub = ActionsHubManager.GetActionsHub<FavoritesActionsHub>(FavoritesActionsHub);

        this._definitionsActionsHub.updateDefinitionsView.addListener(this._updateDefinitionsView);
        this._definitionsActionsHub.setSearchResults.addListener(this._setSearchResults);
        this._definitionsActionsHub.updateNoResultsImageLoadingStatus.addListener(this._updateNoResultsImageLoadingStatus);
        this._favoritesActionsHub.addFavorite.addListener(this._addFavorite);
        this._favoritesActionsHub.removeFavorite.addListener(this._removeFavorite);

        this._definitionsActionsHub.expandFolder.addListener(this._expandFolder);
        this._definitionsActionsHub.updateLoadingStatus.addListener(this._updateLoadingStatus);
        this._definitionsActionsHub.setAddToDashboardMessageState.addListener(this._setAddToDashboardMessageState);

        this._dashboardsStore.addChangedListener(this._setDashboardEntries);
    }

    public disposeInternal(): void {
        if (this._definitionsActionsHub) {
            this._definitionsActionsHub.updateLoadingStatus.removeListener(this._updateLoadingStatus);
            this._definitionsActionsHub.expandFolder.removeListener(this._expandFolder);
            this._definitionsActionsHub.setSearchResults.removeListener(this._setSearchResults);
            this._definitionsActionsHub.updateDefinitionsView.removeListener(this._updateDefinitionsView);
            this._definitionsActionsHub.updateNoResultsImageLoadingStatus.removeListener(this._updateNoResultsImageLoadingStatus);
            this._definitionsActionsHub.setAddToDashboardMessageState.removeListener(this._setAddToDashboardMessageState);
        }

        if (this._favoritesActionsHub) {
            this._favoritesActionsHub.addFavorite.removeListener(this._addFavorite);
            this._favoritesActionsHub.removeFavorite.removeListener(this._removeFavorite);
        }

        this._dashboardsStore.removeChangedListener(this._setDashboardEntries);
    }

    public getState(): IAllDefinitionsState {
        return this._state;
    }

    public getFolderPath(folderId: number): string {
        return this._foldersStore.getFolderPath(folderId);
    }

    private _initializeState(): void {
        this._state = {
            folders: [],
            definitions: [],
            searchResultsLoading: false,
            searchResultFolders: [],
            searchResultDefinitions: [],
            showSearchResults: false,
            isLoadingDefinitions: true,
            dashboardEntries: [],
            canCreateFolder: true,
            canCreateReleaseDefinition: true,
            canManagePermissions: true,
            isNoResultsImageLoaded: false,
            addToDashboardState: undefined
        };
    }

    private _updateDefinitionsView = (): void => {
        let folders = this._foldersStore.getFolders();
        let folderPermissions: IPermissionCollection = this._foldersStore.getPermissions();
        let definitions = this._definitionsStore.getDefinitions();
        let definitionPermissions: IPermissionCollection = this._definitionsStore.getPermissions();

        let updatedFolders: IFolderEntry[] = [];
        let folderPathToFolderIdMap: IDictionaryStringTo<number> = {};
        if (!!folders && folders.length > 0) {
            for (const folder of folders) {
                const token: string = SecurityUtils.getCompleteSecurityToken(SecurityUtils.createFolderPathSecurityToken(folder.path));
                let folderEntry = <IFolderEntry>{
                    id: folder.id,
                    path: folder.path,
                    hasMoreChildItems: !Utils_Array.contains(this._folderIdsForWhichDefinitionsAreFetched, folder.id)
                };

                this._updateFolderPermissions(folderPermissions, folderEntry);
                updatedFolders.push(folderEntry);
                folderPathToFolderIdMap[folder.path] = folder.id;
            }
        }

        let updatedDefinitions: IDefinitionEntry[] = [];
        let favoritedDefinitionsMap: IDictionaryNumberTo<string> = this._favoriteDefinitionsStore.getFavorites();
        if (!!definitions && definitions.length > 0) {
            for (const definition of definitions) {
                const isFavorite: boolean = favoritedDefinitionsMap.hasOwnProperty(definition.id) ? true : false;
                const favoriteId: string = favoritedDefinitionsMap.hasOwnProperty(definition.id) ? favoritedDefinitionsMap[definition.id] : Utils_String.empty;
                let definitionRow: IDefinitionEntry = <IDefinitionEntry>{
                    name: definition.name,
                    id: definition.id,
                    url: ReleaseUrlUtils.getReleaseLandingPageUrl(definition.id),
                    navigationHubId: this._getRDNavigationHubId(),
                    lastRelease: definition.lastRelease,
                    lastReleaseCreatedOn: this._getFriendlyCreatedOnDate(definition.lastRelease),
                    parentFolderId: (folderPathToFolderIdMap[definition.path] ? folderPathToFolderIdMap[definition.path] : 0),
                    folderId: (folderPathToFolderIdMap[definition.path] ? folderPathToFolderIdMap[definition.path] : 0),
                    isFavorite: isFavorite,
                    favoriteId: favoriteId,
                    path: definition.path
                };

                this._updateDefinitionPermissions(definitionPermissions, definitionRow);
                updatedDefinitions.push(definitionRow);
            }
        }

        this._state.folders = updatedFolders;
        this._state.definitions = updatedDefinitions;

        if (this._state.showSearchResults) {
            this._updateSearchResults(folderPathToFolderIdMap);
        }

        this.emitChanged();
    }

    private _updateSearchResults(folderPathToFolderIdMap: IDictionaryStringTo<number>): void {
        let updatedDefinitions: ISearchResultDefinitionEntry[] = [];
        let favoritedDefinitionsMap: IDictionaryNumberTo<string> = this._favoriteDefinitionsStore.getFavorites();
        let definitionPermissions: IPermissionCollection = this._commonDefinitionsStore.getPermissions();
        const definitions: PipelineTypes.PipelineDefinition[] = this._commonDefinitionsStore.getDefinitions(this._searchResultDefinitionIds);
        if (!!definitions && definitions.length > 0) {
            for (const definition of definitions) {
                const isFavorite: boolean = favoritedDefinitionsMap.hasOwnProperty(definition.id) ? true : false;
                const favoriteId: string = favoritedDefinitionsMap.hasOwnProperty(definition.id) ? favoritedDefinitionsMap[definition.id] : Utils_String.empty;
                let definitionRow: ISearchResultDefinitionEntry = <ISearchResultDefinitionEntry>{
                    name: definition.name,
                    id: definition.id,
                    url: ReleaseUrlUtils.getReleaseLandingPageUrl(definition.id),
                    navigationHubId: this._getRDNavigationHubId(),
                    lastRelease: definition.lastRelease,
                    lastReleaseCreatedOn: this._getFriendlyCreatedOnDate(definition.lastRelease),
                    parentFolderId: (folderPathToFolderIdMap[definition.path] ? folderPathToFolderIdMap[definition.path] : 0),
                    folderId: (folderPathToFolderIdMap[definition.path] ? folderPathToFolderIdMap[definition.path] : 0),
                    path: definition.path,
                    isFavorite: isFavorite,
                    favoriteId: favoriteId,
                };

                this._updateDefinitionPermissions(definitionPermissions, definitionRow);
                updatedDefinitions.push(definitionRow);
            }
        }

        this._state.searchResultDefinitions = updatedDefinitions;
    }

    private _addFavorite = (favorite: Favorite): void => {
        this._updateFavorite(parseInt(favorite.artifactId), true, favorite.id);
        this.emitChanged();
    }

    private _removeFavorite = (payload: IDeleteFavoritePayload): void => {
        this._updateFavorite(payload.definitionId, false, Utils_String.empty);
        this.emitChanged();
    }

    private _updateFolderPermissions = (permissionCollection: IPermissionCollection, folder: IFolderEntry): void => {
        if (!permissionCollection || !folder) {
            return;
        }

        const token: string = SecurityUtils.getCompleteSecurityToken(SecurityUtils.createFolderPathSecurityToken(folder.path));

        folder.canEdit = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.EditReleaseDefinition);
        folder.canDelete = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.DeleteReleaseDefinition);
        folder.canManagePermissions = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.AdministerReleasePermissions);
    }

    private _updateDefinitionPermissions = (permissionCollection: IPermissionCollection, definition: IDefinitionEntry): void => {
        if (!permissionCollection || !definition) {
            return;
        }

        const token: string = SecurityUtils.getCompleteSecurityToken(SecurityUtils.createDefinitionSecurityToken(definition.path, definition.id));
        const canExportReleaseDefinition = DefinitionsUtils.readUIPermissionFromCollection(permissionCollection, ReleaseManagementUISecurityPermissions.ExportReleaseDefinition);
        const canViewCDWorkflow = DefinitionsUtils.readUIPermissionFromCollection(permissionCollection, ReleaseManagementUISecurityPermissions.ViewCDWorkflowEditor);
        const canViewReleaseDefinition = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.ViewReleaseDefinition);

        definition.canViewReleaseDefinition = canViewReleaseDefinition && canViewCDWorkflow;
        definition.canExportReleaseDefinition = canViewReleaseDefinition && canExportReleaseDefinition;
        definition.canEditReleaseDefinition = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.EditReleaseDefinition);
        definition.canCreateRelease = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.QueueReleases);
        definition.canDeleteReleaseDefinition = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.DeleteReleaseDefinition);
        definition.canManagePermissions = DefinitionsUtils.readPermissionFromCollection(permissionCollection, token, ReleaseManagementSecurityPermissions.AdministerReleasePermissions);
    }

    private _updateFavorite = (definitionId: number, isFavorite: boolean, favoriteId: string): void => {
        if (this._state && this._state.definitions) {
            this._state.definitions.forEach((def: IDefinitionEntry) => {
                if (def.id === definitionId) {
                    def.isFavorite = isFavorite;
                    def.favoriteId = favoriteId;
                }
            });
        }

        if (this._state && this._state.searchResultDefinitions) {
            this._state.searchResultDefinitions.forEach((def: ISearchResultDefinitionEntry) => {
                if (def.id === definitionId) {
                    def.isFavorite = isFavorite;
                    def.favoriteId = favoriteId;
                }
            });
        }
    }

    private _expandFolder = (folderPayload: IFolderNamePayload): void => {
        if (folderPayload) {
            let expandedFolder = Utils_Array.first(this._state.folders, (folder) => { return folder.path === folderPayload.folderPath; });
            if (expandedFolder) {
                if (!Utils_Array.contains(this._folderIdsForWhichDefinitionsAreFetched, expandedFolder.id)) {
                    this._folderIdsForWhichDefinitionsAreFetched.push(expandedFolder.id);
                }
                expandedFolder.hasMoreChildItems = false;
            }
        }
    }

    private _getRDNavigationHubId(): string {
        return PipelineTypes.PipelineExtensionAreas.ReleaseExplorer2;
    }

    private _getFriendlyCreatedOnDate = (lastRelease: PipelineTypes.PipelineReference): string => {
        let friendlyDate: string = (lastRelease && lastRelease.createdOn) ? new FriendlyDate(new Date(lastRelease.createdOn), PastDateMode.ago, true).toString() : Utils_String.empty;
        return friendlyDate;
    }

    private _updateLoadingStatus = (isLoading: boolean): void => {
        if (this._state.isLoadingDefinitions !== isLoading) {
            this._state.isLoadingDefinitions = isLoading;
        }
    }

    private _setDashboardEntries = (): void => {
        this._state.dashboardEntries = this._dashboardsStore.getDashboardEntries();
        this.emitChanged();
    }

    private _setSearchResults = (payload: ISearchResultsActionPayload): void => {
        if (this._state.showSearchResults !== payload.showSearchResults
            || this._state.searchResultsLoading !== payload.isLoading
            || !Utils_Array.arrayEquals(this._searchResultDefinitionIds, payload.releaseDefinitionsIds)) {

            this._state.showSearchResults = payload.showSearchResults;
            this._state.searchResultsLoading = payload.isLoading;
            this._searchResultDefinitionIds = Utils_Array.clone(payload.releaseDefinitionsIds);

            if (this._state.searchResultsLoading) {
                this._state.isNoResultsImageLoaded = false;
            }

            let folders = this._foldersStore.getFolders();
            let folderPathToFolderIdMap: IDictionaryStringTo<number> = {};
            if (!!folders && folders.length > 0) {
                for (const folder of folders) {
                    folderPathToFolderIdMap[folder.path] = folder.id;
                }
            }

            this._updateSearchResults(folderPathToFolderIdMap);

            const announceMessage = Utils_String.localeFormat(Resources.FilteredDefinitionsAnnounceMessage, this._searchResultDefinitionIds.length);
            announce(announceMessage);

            this.emitChanged();
        }
    }

    private _updateNoResultsImageLoadingStatus = (imageLoaded: boolean): void => {
        this._state.isNoResultsImageLoaded = imageLoaded;
        this.emitChanged();
    }

    private _setAddToDashboardMessageState = (args: PinArgs): void => {
		if (args) {
			this._state.addToDashboardState = {
				dashboardName: args.commandArgs.dashboardName,
                dashboardId: args.commandArgs.dashboardId,
                groupId: args.commandArgs.groupId,
				widgetName: args.commandArgs.widgetData.name,
				messageType: (args.response && args.response.outcome === 0) ? MessageBarType.success : MessageBarType.error
			};
		}
		else {
			this._state.addToDashboardState = undefined;
		}
		this.emitChanged();
	}

    private _definitionsStore: DefinitionsStore;
    private _foldersStore: FoldersStore;
    private _definitionsActionsHub: DefinitionsActionsHub;
    private _favoritesActionsHub: FavoritesActionsHub;
    private _folderIdsForWhichDefinitionsAreFetched: number[] = [1]; // root folder definitions are fetched on initial loading
    private _state: IAllDefinitionsState;
    private _favoriteDefinitionsStore: FavoriteDefinitionsStore;
    private _searchResultDefinitionIds: number[];
    private _commonDefinitionsStore: CommonDefinitionsStore;
    private _dashboardsStore: DashboardsStore;
}