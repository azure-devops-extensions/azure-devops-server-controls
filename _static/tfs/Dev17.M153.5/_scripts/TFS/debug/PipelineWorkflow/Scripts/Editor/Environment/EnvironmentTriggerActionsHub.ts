// Copyright (c) Microsoft Corporation.  All rights reserved.

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { IScheduleTriggerOptions } from "DistributedTaskControls/Common/Types";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineEnvironmentTriggerCondition, PipelineReleaseSchedule, PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";

export interface IEnvironmentTriggerSelectionPayload {
    selectedTabItemKey: string;
}

export interface IPostEnvironmentDeploymentTriggerPayload {
    selectedEnvironments: string[]; // List of selected environment ids
    partiallySucceededDeployment: boolean;
    environmentIdToNameMap: IDictionaryStringTo<string>;
}

export interface IUpdateEnvironmentTriggerPayload {
    environmentId: number;
    triggerConditions: PipelineEnvironmentTriggerCondition[];
    triggerSchedules: PipelineReleaseSchedule[];
}

export interface IUpdatePostEnvironmentTriggerPayload {
    environmentId: number;
    triggerConditions: PipelineEnvironmentTriggerCondition[];
}

export interface IEnvironmentPayload {
    environmentId: number;
    environmentName: string;
}

export interface IArtifactAliasPayload {
    index: number;
    artifactAlias: string;
}

export interface IBranchPayload {
    index: number;
    branchName: string;
}

export interface ITagsPayload {
    index: number;
    tags: string[];
}

/**
 *  Actions for environments trigger.
 */
export class EnvironmentTriggerActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_EnvironmentTriggerActionHub;
    }

    public initialize(): void {
        this._selectEnvironmentTrigger = new ActionBase.Action<IEnvironmentTriggerSelectionPayload>();
        this._partiallySucceededCondition = new ActionBase.Action<boolean>();
        this._updateEnvironmentTriggerCondition = new ActionBase.Action<IPostEnvironmentDeploymentTriggerPayload>();
        this._updateEnvironmentSchedule = new ActionBase.Action<IScheduleTriggerOptions>();
        this._updateEnableSchedule = new ActionBase.Action<boolean>();
        this._updateEnvironmentName = new ActionBase.Action<IEnvironmentPayload>();
        this._updateEnvironmentTrigger = new ActionBase.Action<IUpdateEnvironmentTriggerPayload>();
        this._updatePostEnvironmentTrigger = new ActionBase.Action<IUpdatePostEnvironmentTriggerPayload>();
        this._addArtifactCondition = new ActionBase.Action<ActionBase.IEmptyActionPayload>();
        this._deleteArtifactCondition = new ActionBase.Action<number>();
        this._artifactAliasChange = new ActionBase.Action<IArtifactAliasPayload>();
        this._branchChange = new ActionBase.Action<IBranchPayload>();
        this._tagsChanged = new ActionBase.Action<ITagsPayload>();
    }

    /**
     * Select the environment trigger tab
     */
    public get selectEnvironmentTriggerTab(): ActionBase.Action<IEnvironmentTriggerSelectionPayload> {
        return this._selectEnvironmentTrigger;
    }

    /**
     * Update Trigger condition with successful or partially successful deployment
     */
    public get updatePartiallySucceededCondition(): ActionBase.Action<boolean> {
        return this._partiallySucceededCondition;
    }

    /**
     * Update post environment deployment trigger condition
     */
    public get updateEnvironmentTriggerCondition(): ActionBase.Action<IPostEnvironmentDeploymentTriggerPayload> {
        return this._updateEnvironmentTriggerCondition;
    }

    /**
     * Update schedule for environment release trigger
     */
    public get updateEnvironmentSchedule(): ActionBase.Action<IScheduleTriggerOptions> {
        return this._updateEnvironmentSchedule;
    }

    /**
     * Update if schedule is enable/disable for trigger
     */
    public get updateEnableSchedule(): ActionBase.Action<boolean> {
        return this._updateEnableSchedule;
    }

    /**
     * Update environment triggers
     */
    public get updateEnvironmentTrigger(): ActionBase.Action<IUpdateEnvironmentTriggerPayload> {
        return this._updateEnvironmentTrigger;
    }

    /**
     * Update Post environment triggers
     */
    public get updatePostEnvironmentTrigger(): ActionBase.Action<IUpdatePostEnvironmentTriggerPayload> {
        return this._updatePostEnvironmentTrigger;
    }

    /**
     * Environment name update action
     */
    public get updateEnvironmentName(): ActionBase.Action<IEnvironmentPayload> {
        return this._updateEnvironmentName;
    }

    /**
    * Add new artifact trigger condition action
    */
    public get addArtifactCondition(): ActionBase.Action<ActionBase.IEmptyActionPayload> {
        return this._addArtifactCondition;
    }

    /**
    * Delete artifact trigger condition action
    */
    public get deleteArtifactCondition(): ActionBase.Action<number> {
        return this._deleteArtifactCondition;
    }

    /**
    * Artifact alias change action
    */
    public get artifactAliasChange(): ActionBase.Action<IArtifactAliasPayload> {
        return this._artifactAliasChange;
    }

    /**
    * Artifact trigger condition Branch name change action
    */
    public get branchChange(): ActionBase.Action<IBranchPayload> {
        return this._branchChange;
    }

    /**
    * Artifact trigger condition Tags change action
    */
    public get tagsChanged(): ActionBase.Action<ITagsPayload> {
        return this._tagsChanged;
    }

    private _selectEnvironmentTrigger: ActionBase.Action<IEnvironmentTriggerSelectionPayload>;
    private _partiallySucceededCondition: ActionBase.Action<boolean>;
    private _updateEnvironmentTriggerCondition: ActionBase.Action<IPostEnvironmentDeploymentTriggerPayload>;
    private _updateEnvironmentSchedule: ActionBase.Action<IScheduleTriggerOptions>;
    private _updateEnableSchedule: ActionBase.Action<boolean>;
    private _updateEnvironmentName: ActionBase.Action<IEnvironmentPayload>;
    private _updateEnvironmentTrigger: ActionBase.Action<IUpdateEnvironmentTriggerPayload>;
    private _updatePostEnvironmentTrigger: ActionBase.Action<IUpdatePostEnvironmentTriggerPayload>;
    private _artifactAliasChange: ActionBase.Action<IArtifactAliasPayload>;
    private _tagsChanged: ActionBase.Action<ITagsPayload>;
    private _branchChange: ActionBase.Action<IBranchPayload>;
    private _deleteArtifactCondition: ActionBase.Action<number>;
    private _addArtifactCondition: ActionBase.Action<ActionBase.IEmptyActionPayload>;
}