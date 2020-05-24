// Copyright (c) Microsoft Corporation.  All rights reserved.

import { Action } from "VSS/Flux/Action";
import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";

import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import * as WebApi_Contracts from "VSS/WebApi/Contracts";

export interface IUpdateEnvironmentRankPayload {
    rank: number;
    forceRefresh?: boolean;
}

/**
 *  Actions for environments properties.
 */
export class EnvironmentStoreActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_EnvironmentStoreActionHub;
    }

    public initialize(): void {
        this._updateEnvironment = new Action<PipelineDefinitionEnvironment>();
        this._markEnvironmentAsPermanent = new Action<void>();
        this._markEnvironmentAsDeleting = new Action<IEmptyActionPayload>();
        this._updateRank = new Action<IUpdateEnvironmentRankPayload>();
        this._togglePullRequestDeployment = new Action<boolean>();
    }
    
    /**
     * Action to update environment
     */
    public get updateEnvironment(): Action<PipelineDefinitionEnvironment> {
        return this._updateEnvironment;
    }

    public get updateRank(): Action<IUpdateEnvironmentRankPayload> {
        return this._updateRank;
    }

    /**
     * Action to mark environment as permanent
     */
    public get markEnvironmentAsPermanent(): Action<void> {
        return this._markEnvironmentAsPermanent;
    }

    /**
   * Action to mark environment to deleting state
   */
    public get markEnvironmentAsDeleting(): Action<IEmptyActionPayload> {
        return this._markEnvironmentAsDeleting;
    }

    /**
   * Action to toggle pr deployment trigger
   */
    public get togglePullRequestDeployment(): Action<boolean> {
        return this._togglePullRequestDeployment;
    }

    private _updateRank: Action<IUpdateEnvironmentRankPayload>;
    private _updateEnvironment: Action<PipelineDefinitionEnvironment>;
    private _markEnvironmentAsPermanent: Action<void>;
    private _markEnvironmentAsDeleting: Action<IEmptyActionPayload>;
    private _togglePullRequestDeployment: Action<boolean>;
}