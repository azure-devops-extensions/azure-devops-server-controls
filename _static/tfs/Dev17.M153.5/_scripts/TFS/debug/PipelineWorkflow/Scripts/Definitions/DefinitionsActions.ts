import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { PipelineDefinition, PipelineDefinitionFolder } from "PipelineWorkflow/Scripts/Common/Types";
import { DefinitionsActionHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { IDefinitionEntry } from "PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";
import { IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";
import { DashboardGroupEntry } from "TFS/Dashboards/Contracts";
import { PinArgs } from "TFSUI/Dashboards/AddToDashboard";

export interface IDefinitionsActionPayload {
    releaseDefinitionsIds: number[];
}

export interface ISearchResultsActionPayload extends IDefinitionsActionPayload {
    isLoading: boolean;
    showSearchResults: boolean;    
}

export interface IFoldersActionPayload {
    folders: PipelineDefinitionFolder[];
}

export interface IFolderNamePayload {
    folderPath: string;
}

export interface IDefinitionDialogPayload {
    showDialog: boolean;
    definitionName: string;
    definitionId: number;
}

export class DefinitionsActionsHub extends ActionBase.ActionsHubBase {
    
    public static getKey(): string {
        return DefinitionsActionHubKeys.ActionHubKey_DefinitionsActionHub;
    }

    public initialize(): void {
        this._setSearchResults = new ActionBase.Action<ISearchResultsActionPayload>();
        this._setDefinitions = new ActionBase.Action<IDefinitionsActionPayload>();
        this._initializeFolders = new ActionBase.Action<IFoldersActionPayload>();
        this._expandFolder = new ActionBase.Action<IFolderNamePayload>();
        this._updateLoadingStatus = new ActionBase.Action<boolean>();
        this._deleteDefinition = new ActionBase.Action<number>();
        this._deleteFolder = new ActionBase.Action<string>();
        this._updateDefinitionsView = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
        this._updateFolderPermissions = new ActionBase.Action<IPermissionCollection>();
        this._updateToolbarPermissions = new ActionBase.Action<IPermissionCollection>();
        this._updateNoResultsImageLoadingStatus = new ActionBase.Action<boolean>();
        this._setAddToDashboardMessageState = new ActionBase.Action<PinArgs>();
    }

    public get setDefinitions(): ActionBase.Action<IDefinitionsActionPayload> {
        return this._setDefinitions;
    }

    public get foldersInitialized(): ActionBase.Action<IFoldersActionPayload> {
        return this._initializeFolders;
    }

    public get expandFolder(): ActionBase.Action<IFolderNamePayload> {
        return this._expandFolder;
    }

    public get setSearchResults(): ActionBase.Action<ISearchResultsActionPayload> {
        return this._setSearchResults;
    }
        
    public get updateLoadingStatus(): ActionBase.Action<boolean> {
        return this._updateLoadingStatus;
    }

    public get deleteDefinition(): ActionBase.Action<number> {
        return this._deleteDefinition;
    }

    public get deleteFolder(): ActionBase.Action<string> {
        return this._deleteFolder;
    }

    public get updateDefinitionsView(): ActionBase.Action<ActionBase.IEmptyActionPayload>  {
        return this._updateDefinitionsView;
    }

    public get updateFolderPermissions(): ActionBase.Action<IPermissionCollection>  {
        return this._updateFolderPermissions;
    }

    public get updateToolbarPermissions(): ActionBase.Action<IPermissionCollection>  {
        return this._updateToolbarPermissions;
    }

    public get updateNoResultsImageLoadingStatus(): ActionBase.Action<boolean> {
        return this._updateNoResultsImageLoadingStatus;
    }

    public get setAddToDashboardMessageState(): ActionBase.Action<PinArgs> {
        return this._setAddToDashboardMessageState;
    }

    private _setSearchResults: ActionBase.Action<ISearchResultsActionPayload>;
    private _setDefinitions: ActionBase.Action<IDefinitionsActionPayload>;
    private _initializeFolders: ActionBase.Action<IFoldersActionPayload>;
    private _expandFolder: ActionBase.Action<IFolderNamePayload>;
    private _updateLoadingStatus: ActionBase.Action<boolean>;
    private _updateFolderPermissions: ActionBase.Action<IPermissionCollection>;
    private _deleteDefinition: ActionBase.Action<number>;
    private _deleteFolder: ActionBase.Action<string>;
    private _updateToolbarPermissions: ActionBase.Action<IPermissionCollection>;
    private _updateDefinitionsView: ActionBase.Action<ActionBase.IEmptyActionPayload>;
    private _updateNoResultsImageLoadingStatus: ActionBase.Action<boolean>;
    private _setAddToDashboardMessageState: ActionBase.Action<PinArgs>;
}