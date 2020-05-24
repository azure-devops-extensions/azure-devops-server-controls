import { IAgentPhaseJobItem, IJobItem, IPhaseJobItem, JobStates } from "DistributedTaskUI/Logs/Logs.Types";

import { IReleaseEnvironmentGatesRuntimeData, IReleaseEnvironmentGatesData } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentGatesTypes";
import {IReleaseEnvironmentActionInfo } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { GatesType } from "PipelineWorkflow/Scripts/Common/Types";
import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as DistributedTask_Common_Contracts from "TFS/DistributedTaskCommon/Contracts";

export interface IDeploymentActionsProvider {
    getActionHandler( actionInfo: IReleaseEnvironmentActionInfo);
}

export interface IEnvironmentPhasesAndProcessParameters {
    deployPhases: ReleaseContracts.DeployPhase[];
    processParameters?: DistributedTask_Common_Contracts.ProcessParameters;
}

export enum DeployConditionTypeKeys {
    Undefined = "Undefined",
    PreDeploy = "PreDeploy",
    PostDeploy = "PostDeploy",
    All = "All",
}

export interface IDeploymentGroupPhaseJobItem extends IPhaseJobItem {
    jobs: IAgentPhaseJobItem[];
    tags?: string[];
    machineGroupId: number;
}

export interface IManualInterventionJobItem extends IPhaseJobItem {
    manualIntervention: ReleaseContracts.ManualIntervention;
}

export interface IDeploymentStatusJobItem extends IJobItem {
    deploySteps: ReleaseContracts.DeploymentAttempt[];
}

export interface IGatesStatusJobItem extends IJobItem {
    gatesRuntimeData: IReleaseEnvironmentGatesRuntimeData;
    gatesData: IReleaseEnvironmentGatesData;
    gatesType: GatesType;
}

export interface ILogsFilterState {
    filterText: string;
    jobStates: JobStates;
}