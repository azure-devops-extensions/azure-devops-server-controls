// Copyright (c) Microsoft Corporation.  All rights reserved.
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { CodeRepositoryReference, PullRequestFilter, PullRequestTrigger } from "ReleaseManagement/Core/Contracts";
import { BuildDefinition } from "TFS/Build/Contracts";

export interface IChangeFilterArgs {
    index: number;
    filter: PullRequestFilter;
}

export interface IInitializeBuildProperties {
    allTags: string[];
    buildDefinition: BuildDefinition;
    codeRepositoryReference: CodeRepositoryReference;
}

/**
 *  Actions for Pull Request Triggers 
 */
export class PullRequestTriggerActions extends ActionBase.ActionsHubBase {

    
    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionCreatorKey_PullRequestTriggerActionHub;
    }

    public initialize(): void {
        this._toggleChanged = new ActionBase.Action<boolean>();
        this._updateTrigger = new ActionBase.Action<PullRequestTrigger>();
        this._addFilter = new ActionBase.Action<void>();
        this._deleteFilter = new ActionBase.Action<number>();
        this._updateCodeRepositoryReference = new ActionBase.Action<CodeRepositoryReference>();
        this._initializeBuildProperties = new ActionBase.Action<IInitializeBuildProperties>();
        this._changeFilter = new ActionBase.Action<IChangeFilterArgs>();
        this._updateUseArtifactReference = new ActionBase.Action<boolean>();
        this._updatePullRequestTriggerSupported = new ActionBase.Action<boolean>();
    }

    public get toggleChanged(): ActionBase.Action<boolean> {
        return this._toggleChanged;
    }

    public get updateTrigger(): ActionBase.Action<PullRequestTrigger> {
        return this._updateTrigger;
    }

    public get deleteFilter(): ActionBase.Action<number> {
        return this._deleteFilter;
    }

    public get addFilter(): ActionBase.Action<void> {
        return this._addFilter;
    }

    public get updateCodeRepositoryReference(): ActionBase.Action<CodeRepositoryReference>{
        return this._updateCodeRepositoryReference;
    }

    public get changeFilter(): ActionBase.Action<IChangeFilterArgs> {
        return this._changeFilter;
    }

    public get initializeBuildProperties(): ActionBase.Action<IInitializeBuildProperties> {
        return this._initializeBuildProperties;
    }

    public get updateUseArtifactReference(): ActionBase.Action<boolean> {
        return this._updateUseArtifactReference;
    }

    public get updatePullRequestTriggerSupported(): ActionBase.Action<boolean> {
        return this._updatePullRequestTriggerSupported;
    }

    private _toggleChanged: ActionBase.Action<boolean>;
    private _updateTrigger: ActionBase.Action<PullRequestTrigger>;
    private _addFilter: ActionBase.Action<void>;
    private _deleteFilter: ActionBase.Action<number>;
    private _updateCodeRepositoryReference: ActionBase.Action<CodeRepositoryReference>;
    private _initializeBuildProperties: ActionBase.Action<IInitializeBuildProperties>;
    private _changeFilter: ActionBase.Action<IChangeFilterArgs>;
    private _updateUseArtifactReference: ActionBase.Action<boolean>;
    private _updatePullRequestTriggerSupported: ActionBase.Action<boolean>;
}