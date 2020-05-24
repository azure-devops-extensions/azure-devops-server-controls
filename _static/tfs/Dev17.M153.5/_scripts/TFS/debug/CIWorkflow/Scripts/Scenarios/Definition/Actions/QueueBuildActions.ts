import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { Build, BuildDefinition } from "TFS/Build/Contracts";

import { Action } from "VSS/Flux/Action";

export interface ISourceEditorCallbacks {
    onSourceBranchChanged: (sourceBranch: string) => void;
    onSourceVersionChanged: (sourceVersion: string) => void;
}

export interface IQueueBuildPayload {
    definitionId: number;
    enableSaveBeforeQueue?: boolean;
    definition?: BuildDefinition;
    cloneId?: number;
    cloneRevision?: number;
    saveComment?: string;
    onBuildSaved?: (buildDefinition: BuildDefinition) => void;
    agentQueueId: number;
    projectId: string;
    sourceBranch?: string;
    sourceVersion?: string;
    parameters?: string;
    demands?: string[];
    ignoreWarnings: boolean;
    onSuccess?: (url: string, buildNumber: string, build: Build) => void;
}

export interface IBuildQueuedPayload {
    build: Build;
    error?: string;
    warning?: string;
}

export class QueueBuildActions extends ActionsHubBase {
    private _updateAgentQueue: Action<number>;
    private _updateSourceBranch: Action<string>;
    private _updateSourceVersion: Action<string>;
    private _queueBuild: Action<IQueueBuildPayload>;
    private _buildQueued: Action<IBuildQueuedPayload>;
    private _updateSaveComment: Action<string>;
    private _saveBuildDefinition: Action<void>;
    private _buildDefinitionSaved: Action<BuildDefinition>;
    private _buildDefinitionSaveFailed: Action<string>;
    private _dismissSuccessMessage: Action<void>;

    public initialize(): void {
        this._updateAgentQueue = new Action<number>();
        this._updateSourceBranch = new Action<string>();
        this._updateSourceVersion = new Action<string>();
        this._queueBuild = new Action<IQueueBuildPayload>();
        this._buildQueued = new Action<IBuildQueuedPayload>();
        this._updateSaveComment = new Action<string>();
        this._saveBuildDefinition = new Action<void>();
        this._buildDefinitionSaved = new Action<BuildDefinition>();
        this._buildDefinitionSaveFailed = new Action<string>();
        this._dismissSuccessMessage = new Action<void>();
    }

    public static getKey(): string {
        return "CI.QueueBuildActions";
    }

    public get updateAgentQueue(): Action<number> {
        return this._updateAgentQueue;
    }

    public get updateSourceBranch(): Action<string> {
        return this._updateSourceBranch;
    }

    public get updateSourceVersion(): Action<string> {
        return this._updateSourceVersion;
    }

    public get updateSaveComment(): Action<string> {
        return this._updateSaveComment;
    }

    public get saveBuildDefinition(): Action<void> {
        return this._saveBuildDefinition;
    }

    public get buildDefinitionSaved(): Action<BuildDefinition> {
        return this._buildDefinitionSaved;
    }

    public get buildDefinitionSaveFailed(): Action<string> {
        return this._buildDefinitionSaveFailed;
    }

    public get queueBuild(): Action<IQueueBuildPayload> {
        return  this._queueBuild;
    }

    public get buildQueued(): Action<IBuildQueuedPayload> {
        return this._buildQueued;
    }

    public get dismissSuccessMessage(): Action<void> {
        return this._dismissSuccessMessage;
    }

}
