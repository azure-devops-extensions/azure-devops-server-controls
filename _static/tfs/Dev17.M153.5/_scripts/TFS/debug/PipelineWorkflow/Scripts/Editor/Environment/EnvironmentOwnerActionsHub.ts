// Copyright (c) Microsoft Corporation.  All rights reserved.

import { Action } from "VSS/Flux/Action";
import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";

import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as WebApi_Contracts from "VSS/WebApi/Contracts";

/**
 *  Actions for environments properties.
 */
export class EnvironmentOwnerActionsHub extends ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_EnvironmentOwnerActionHub;
    }

    public initialize(): void {
        this._updateEnvironmentOwner = new Action<Identities_Picker_RestClient.IEntity>();
        this._updateEnvironmentOwnerFromService = new Action<WebApi_Contracts.IdentityRef>();
        this._updateUnmaterializedEnvironmentOwner = new Action<string>();
        this._updateMaterializeEnvironmentOwnerError = new Action<string>();
        this._updateMaterializationInProgress = new Action<boolean>();
    }
    

    /**
     * Action to update environment owner
     */
    public get updateEnvironmentOwner(): Action<Identities_Picker_RestClient.IEntity> {
        return this._updateEnvironmentOwner;
    }
    
    /**
     * Action to update environment properties
     */
    public get updateEnvironmentOwnerFromService(): Action<WebApi_Contracts.IdentityRef> {
        return this._updateEnvironmentOwnerFromService;
    }

    /**
     * Action to update the unmaterilized environment owner for identity picker
     */
    public get updateUnmaterializedEnvironmentOwner(): Action<string> {
        return this._updateUnmaterializedEnvironmentOwner;
    }

    /**
     * Action to update the AAD account materialization error for identity picker
     */
    public get updateMaterializeEnvironmentOwnerError(): Action<string> {
        return this._updateMaterializeEnvironmentOwnerError;
    }

    /**
     * Action to update the AAD account materialization in progress flag for identity picker
     */
    public get updateMaterializationInProgress(): Action<boolean> {
        return this._updateMaterializationInProgress;
    }

    private _updateEnvironmentOwner: Action<Identities_Picker_RestClient.IEntity>;
    private _updateEnvironmentOwnerFromService: Action<WebApi_Contracts.IdentityRef>;
    private _updateUnmaterializedEnvironmentOwner: Action<string>;
    private _updateMaterializeEnvironmentOwnerError: Action<string>;
    private _updateMaterializationInProgress: Action<boolean>;
}