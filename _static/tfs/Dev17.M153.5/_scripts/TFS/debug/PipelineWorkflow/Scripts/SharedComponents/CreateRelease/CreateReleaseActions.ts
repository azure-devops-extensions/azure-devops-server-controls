import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { PipelineDefinition, PipelineArtifactVersionQueryResult, PipelineRelease, PipelineDefinitionEnvironment, PipelineEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import { CreateReleaseKeys } from "PipelineWorkflow/Scripts/SharedComponents/CreateRelease/Constants";
import { IEnvironmentAgentPhaseWarningData } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";

import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";
import * as RMContracts from "ReleaseManagement/Core/Contracts";

import { Action } from "VSS/Flux/Action";

export interface IArtifactSelectedVersionPayload {
    artifactIndex: number;
    selectedVersion: string;
}

export interface IDeploymentTriggerSelectedPayload {
    environmentId: number;
    selectedTriggerOptionKey: number;
}

export interface IProjectDataPayload {
    project: RMContracts.ProjectReference;
    releaseDefinitions: RMContracts.ReleaseDefinition[];
}

export interface IInitializeArtifactVersionsPayload {
    versions: PipelineArtifactVersionQueryResult;
    artifacts: RMContracts.Artifact[];
}

export class CreateReleaseActions<T extends PipelineDefinition | PipelineRelease> extends ActionsHubBase {

    public static getKey(): string {
        return CreateReleaseKeys.ActionHubKey_CreateReleaseActionHub;
    }

    public initialize(instanceId?: string): void {
        this._initializeDefinition = new Action<T>();
        this._initializeProject = new Action<IProjectDataPayload>();
        this._initializeEnvironmentsPhasesWarning = new Action<IEnvironmentAgentPhaseWarningData[]>();
        this._initializeEnvironmentsEndpoints = new Action<IDictionaryNumberTo<ServiceEndpoint[]>>();
        this._updateErrorMessage = new Action<string>();
        this._updateDescription = new Action<string>();
        this._updateSelectedDeploymentTrigger = new Action<IDeploymentTriggerSelectedPayload>();
        this._initializeArtifactsVersions = new Action<IInitializeArtifactVersionsPayload>();
        this._updateArtifactSelectedVersion = new Action<IArtifactSelectedVersionPayload>();
        this._toggleDeploymentTrigger = new Action<number>();
        this._updateManualDeploymentTriggers = new Action<string[]>();
    }

    public get initializeDefinition(): Action<T> {
        return this._initializeDefinition;
    }

    public get initializeProject(): Action<IProjectDataPayload> {
        return this._initializeProject;
    }

    public get initializeEnvironmentsPhasesWarning(): Action<IEnvironmentAgentPhaseWarningData[]> {
        return this._initializeEnvironmentsPhasesWarning;
    }

    public get initializeEnvironmentsEndpoints(): Action<IDictionaryNumberTo<ServiceEndpoint[]>> {
        return this._initializeEnvironmentsEndpoints;
    }

    public get updateErrorMessage(): Action<string> {
        return this._updateErrorMessage;
    }

    public get updateDescription(): Action<string> {
        return this._updateDescription;
    }

    public get updateSelectedDeploymentTrigger(): Action<IDeploymentTriggerSelectedPayload> {
        return this._updateSelectedDeploymentTrigger;
    }

    public get initializeDefinitionArtifactsVersions(): Action<IInitializeArtifactVersionsPayload> {
        return this._initializeArtifactsVersions;
    }

    public get updateArtifactSelectedVersion(): Action<IArtifactSelectedVersionPayload> {
        return this._updateArtifactSelectedVersion;
    }

    public get toggleDeploymentTrigger(): Action<number> {
        return this._toggleDeploymentTrigger;
    }

    public get updateManualDeploymentTriggers(): Action<string[]> {
        return this._updateManualDeploymentTriggers;
    }

    private _initializeDefinition: Action<T>;
    private _initializeProject: Action<IProjectDataPayload>;
    private _initializeEnvironmentsPhasesWarning: Action<IEnvironmentAgentPhaseWarningData[]>;
    private _initializeEnvironmentsEndpoints: Action<IDictionaryNumberTo<ServiceEndpoint[]>>;
    private _updateErrorMessage: Action<string>;
    private _updateDescription: Action<string>;
    private _updateSelectedDeploymentTrigger: Action<IDeploymentTriggerSelectedPayload>;
    private _initializeArtifactsVersions: Action<IInitializeArtifactVersionsPayload>;
    private _updateArtifactSelectedVersion: Action<IArtifactSelectedVersionPayload>;
    private _toggleDeploymentTrigger: Action<number>;
    private _updateManualDeploymentTriggers: Action<string[]>;
}
