/**
 * @brief This file contains list of All actions related to Build Definition Scenario
 */

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineDefinition, PipelineSettings } from "PipelineWorkflow/Scripts/Common/Types";

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

export interface IUpdateDefinitionActionPayload extends ActionBase.IActionPayload {
    definition: PipelineDefinition;
    forceUpdate?: boolean;
}

export interface IChangeDefinitionNamePayload extends ActionBase.IEmptyActionPayload {
    name: string;
    defaultName: string;
}

export enum CreateReleaseStatus {
    Success,
    Failure,
    InProgress
}

export class DefinitionActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_DefinitionActionHub;
    }

    public initialize(): void {
        this._createDefinition = new ActionBase.Action<PipelineDefinition>();
        this._updateDefinition = new ActionBase.Action<IUpdateDefinitionActionPayload>();
        this._changeDefinitionName = new ActionBase.Action<IChangeDefinitionNamePayload>();
        this._updateCreateReleaseStatus = new ActionBase.Action<CreateReleaseStatus>();
    }

    public get createDefinition(): ActionBase.Action<PipelineDefinition> {
        return this._createDefinition;
    }

    public get updateDefinition(): ActionBase.Action<IUpdateDefinitionActionPayload> {
        return this._updateDefinition;
    }   

    public get changeDefinitionName(): ActionBase.Action<IChangeDefinitionNamePayload> {
        return this._changeDefinitionName;
    }

    public get updateCreateReleaseStatus(): ActionBase.Action<CreateReleaseStatus> {
        return this._updateCreateReleaseStatus;
    }

    private _createDefinition: ActionBase.Action<PipelineDefinition>;
    private _updateDefinition: ActionBase.Action<IUpdateDefinitionActionPayload>;
    private _changeDefinitionName: ActionBase.Action<IChangeDefinitionNamePayload>;
    private _updateCreateReleaseStatus: ActionBase.Action<CreateReleaseStatus>;
}
