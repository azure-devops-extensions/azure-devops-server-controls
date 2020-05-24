

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";

import RMContracts = require("ReleaseManagement/Core/Contracts");

export interface ICreateEnvironmentListActionPayload {
    environments: CommonTypes.PipelineDefinitionEnvironment[];
}

export interface ICreateEnvironmentActionPayload {
    parentEnvironmentId?: number;
    template: RMContracts.ReleaseDefinitionEnvironmentTemplate;
    isTemporary: boolean;
}

export interface IUpdateEnvironmentListActionPayload {
    environments: CommonTypes.PipelineDefinitionEnvironment[];
    force?: boolean;
}

export class EnvironmentListActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_EnvironmentListActionHub;
    }

    public initialize(): void {
        this._createEnvironmentList = new ActionBase.Action<ICreateEnvironmentListActionPayload>();
        this._updateEnvironmentList = new ActionBase.Action<IUpdateEnvironmentListActionPayload>();
        this._createEnvironment = new ActionBase.Action<ICreateEnvironmentActionPayload>();
        this._deleteEnvironment = new ActionBase.Action<number>();
        this._cloneEnvironment = new ActionBase.Action<number>();
        this._refreshEnvironmentsCanvas = new ActionBase.Action<void>();
    }

    public get createEnvironmentList(): ActionBase.Action<ICreateEnvironmentListActionPayload> {
        return this._createEnvironmentList;
    }

    public get updateEnvironmentList(): ActionBase.Action<IUpdateEnvironmentListActionPayload> {
        return this._updateEnvironmentList;
    }

    public get deleteEnvironment(): ActionBase.Action<number> {
        return this._deleteEnvironment;
    }

    public get cloneEnvironment(): ActionBase.Action<number> {
        return this._cloneEnvironment;
    }

    public get createEnvironment(): ActionBase.Action<ICreateEnvironmentActionPayload> {
        return this._createEnvironment;
    }

    public get refreshEnvironmentsCanvas(): ActionBase.Action<void> {
        return this._refreshEnvironmentsCanvas;
    }

    private _cloneEnvironment: ActionBase.Action<number>;
    private _deleteEnvironment: ActionBase.Action<number>;
    private _createEnvironmentList: ActionBase.Action<ICreateEnvironmentListActionPayload>;
    private _updateEnvironmentList: ActionBase.Action<IUpdateEnvironmentListActionPayload>;
    private _createEnvironment: ActionBase.Action<ICreateEnvironmentActionPayload>;
    private _refreshEnvironmentsCanvas: ActionBase.Action<void>;
}
