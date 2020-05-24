import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { DefinitionsActionHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

export interface ICommonDefinitionsActionPayload {
    releaseDefinitions: PipelineDefinition[];
}

export class CommonDefinitionsActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DefinitionsActionHubKeys.ActionHubKey_CommonDefinitionsActionHub;
    }

    public initialize(): void {
        this._initializeDefinitions = new ActionBase.Action<ICommonDefinitionsActionPayload>();
        this._deleteDefinition = new ActionBase.Action<number>();
        this._updateDefinition = new ActionBase.Action<PipelineDefinition>();
        this._deleteDefinitionsInFolder = new ActionBase.Action<string>();
        this._updateDefinitionsPermissions = new ActionBase.Action<IPermissionCollection>();
    }

    public get setDefinitions(): ActionBase.Action<ICommonDefinitionsActionPayload> {
        return this._initializeDefinitions;
    }

    public get deleteDefinition(): ActionBase.Action<number> {
        return this._deleteDefinition;
    }

    public get updateDefinition(): ActionBase.Action<PipelineDefinition> {
        return this._updateDefinition;
    }

    public get deleteFolder(): ActionBase.Action<string> {
        return this._deleteDefinitionsInFolder;
    }

    public get updateDefinitionsPermissions(): ActionBase.Action<IPermissionCollection>  {
        return this._updateDefinitionsPermissions;
    }

    private _initializeDefinitions: ActionBase.Action<ICommonDefinitionsActionPayload>;
    public _deleteDefinition: ActionBase.Action<number>;
    public _updateDefinition: ActionBase.Action<PipelineDefinition>;
    public _deleteDefinitionsInFolder: ActionBase.Action<string>;
    private _updateDefinitionsPermissions: ActionBase.Action<IPermissionCollection>;
}