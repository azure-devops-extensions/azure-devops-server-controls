import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { IEnvironmentAgentPhaseWarningData } from "PipelineWorkflow/Scripts/Shared/Utils/ReleaseEnvironmentUtils";
import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";
import { ServiceEndpoint } from "TFS/DistributedTask/Contracts";

import { IStatusProps } from "VSSUI/Status";

export interface IEnvironmentSkeleton {
    id: number;
    name: string;
}

export enum IEnvironmentDeployProgressState {
    Initial,
    InProgress,
    Error
}

export interface ICurrentlyDeployedReleaseEnvironmentTuple {
    currentlyDeployedRelease: ICurrentlyDeployedRelease;
    environmentId: number;
}

export interface ICurrentlyDeployedRelease {
    id: number;
    name: string;
    deploymentStatus: string;
    deploymentStatusIconProps: IStatusProps;
    completedOn: string;
    isRollback: boolean;
}

export class DeployEnvironmentsPanelActions extends ActionBase.ActionsHubBase {
    public static readonly SOURCE_KEY_MULTIPLE = "multiple-environment-deploy";
    public static readonly SOURCE_KEY_INDIVIDUAL = "environment-deploy";
    public static getKey(): string {
        return ReleaseProgressActionKeys.DeployEnvironmentsPanel;
    }

    public initialize(instanceId: string): void {
        this._updateErrorInFetchingRelease = new ActionBase.Action<boolean>();
        this._updateReleaseToCompare = new ActionBase.Action<ICurrentlyDeployedReleaseEnvironmentTuple>();
        this._updateDemands = new ActionBase.Action<IEnvironmentAgentPhaseWarningData[]>();
        this._updateErrorInDeploy = new ActionBase.Action<string>();
        this._updateDeployState = new ActionBase.Action<IEnvironmentDeployProgressState>();
        this._updateDeployableEnvironments = new ActionBase.Action<ReleaseEnvironment[]>();
        this._updateDeploymentOption = new ActionBase.Action<string>();
    }

    public get updateReleaseToCompare(): ActionBase.Action<ICurrentlyDeployedReleaseEnvironmentTuple> {
        return this._updateReleaseToCompare;
    }

    public get updateDemands(): ActionBase.Action<IEnvironmentAgentPhaseWarningData[]> {
        return this._updateDemands;
    }

    public get updateErrorInFetchingRelease(): ActionBase.Action<boolean> {
        return this._updateErrorInFetchingRelease;
    }

    public get updateDeployState(): ActionBase.Action<IEnvironmentDeployProgressState> {
        return this._updateDeployState;
    }

    public get updateErrorInDeploy(): ActionBase.Action<string> {
        return this._updateErrorInDeploy;
    }

    public get updateDeployableEnvironments(): ActionBase.Action<ReleaseEnvironment[]> {
        return this._updateDeployableEnvironments;
    }

    public get updateDeploymentOption(): ActionBase.Action<string> {
        return this._updateDeploymentOption;
    }

    private _updateDeployableEnvironments: ActionBase.Action<ReleaseEnvironment[]>;
    private _updateReleaseToCompare: ActionBase.Action<ICurrentlyDeployedReleaseEnvironmentTuple>;
    private _updateDemands: ActionBase.Action<IEnvironmentAgentPhaseWarningData[]>;
    private _updateDeployState: ActionBase.Action<IEnvironmentDeployProgressState>;
    private _updateErrorInDeploy: ActionBase.Action<string>;
    private _updateErrorInFetchingRelease: ActionBase.Action<boolean>;
    private _updateDeploymentOption: ActionBase.Action<string>;
}