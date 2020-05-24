/// <reference types="react" />

import * as React from "react";

import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { IEnvironmentReference } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/OptionsTab/EnvironmentCheckListStore";
import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

export interface IEnvironmentReferencePayload {
    environmentId: number;
    status: boolean;
}

export class EnvironmentCheckListActionsHub extends ActionsBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_EnvironmentCheckListActionHub;
    }

    public initialize(): void {
        this._updateMasterCheckBoxStatus = new ActionsBase.Action<boolean>();
        this._updateEnvironmentStatus = new ActionsBase.Action<IEnvironmentReferencePayload>();
        this._updateEnvironments = new ActionsBase.Action<IEnvironmentReference[]>();
    }

    public get updateMasterCheckBoxStatus(): ActionsBase.Action<boolean> {
        return this._updateMasterCheckBoxStatus;
    }

    public get updateEnvironmentStatus(): ActionsBase.Action<IEnvironmentReferencePayload> {
        return this._updateEnvironmentStatus;
    }

    public get updateEnvironments(): ActionsBase.Action<IEnvironmentReference[]> {
        return this._updateEnvironments;
    }

    private _updateMasterCheckBoxStatus: ActionsBase.Action<boolean>;
    private _updateEnvironmentStatus: ActionsBase.Action<IEnvironmentReferencePayload>;
    private _updateEnvironments: ActionsBase.Action<IEnvironmentReference[]>;
}