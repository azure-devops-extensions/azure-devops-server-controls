/**
 * @brief Common types to be used across Definition scenario
 */
import * as ReleaseConstants from "ReleaseManagement/Core/Constants";
import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

import * as ReleaseTypes from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

export type PipelineProcess = ReleaseContracts.PipelineProcess;
export type PipelineDefinition = ReleaseContracts.ReleaseDefinition;
export type PipelineDefinitionRevision = ReleaseContracts.ReleaseDefinitionRevision;
export type PipelineDefinitionEnvironment = ReleaseContracts.ReleaseDefinitionEnvironment;
export type PipelineEnvironment = ReleaseContracts.ReleaseEnvironment;
export type PipelineDeployPhase = ReleaseContracts.DeployPhase;
export type PipelineDeploymentInput = ReleaseContracts.DeploymentInput;
export type PipelineRunOnAgentDeployPhase = ReleaseContracts.AgentBasedDeployPhase;
export type PipelineAgentDeploymentInput = ReleaseContracts.AgentDeploymentInput;
export type PipelineRunOnMachineGroupDeployPhase = ReleaseContracts.MachineGroupBasedDeployPhase;
export type PipelineMachineGroupDeploymentInput = ReleaseContracts.MachineGroupDeploymentInput;
export type PipelineRunOnServerDeployPhase = ReleaseContracts.RunOnServerDeployPhase;
export type PipelineVariable = ReleaseContracts.ConfigurationVariableValue;
export type PipelineWorkflowTask = ReleaseContracts.WorkflowTask;
export type PipelineRetentionPolicy = ReleaseContracts.EnvironmentRetentionPolicy;
export type PipelineSettings = ReleaseContracts.ReleaseSettings;
export type PipelineTriggerBase = ReleaseContracts.ReleaseTriggerBase;
export type PipelineArtifactSourceTrigger = ReleaseContracts.ArtifactSourceTrigger;
export type PipelineSourceRepoTrigger = ReleaseContracts.SourceRepoTrigger;
export type PipelineContainerImageTrigger = ReleaseContracts.ContainerImageTrigger;
export type PipelinePackageTrigger = ReleaseContracts.PackageTrigger;
export type PipelinePullRequestTrigger = ReleaseContracts.PullRequestTrigger;

export type PipelineEnvironmentApprovals = ReleaseContracts.ReleaseDefinitionApprovals;
export type PipelineEnvironmentApprovalStep = ReleaseContracts.ReleaseDefinitionApprovalStep;
export type PipelineEnvironmentExecutionPolicy = ReleaseContracts.EnvironmentExecutionPolicy;
export type PipelineEnvironmentApprovalOptions = ReleaseContracts.ApprovalOptions;
export type PipelineArtifactTypeDefinition = ReleaseContracts.ArtifactTypeDefinition;
export type PipelineArtifactTriggerConfiguration = ReleaseContracts.ArtifactTriggerConfiguration;
export type PipelineArtifactDefinition = ReleaseContracts.Artifact;
export type PipelineArtifactSourceReference = ReleaseContracts.ArtifactSourceReference;
export type PipelineEnvironmentTriggerCondition = ReleaseContracts.Condition;
export type PipelineReleaseSchedule = ReleaseContracts.ReleaseSchedule;
export type PipelineArtifact = ReleaseContracts.Artifact;
export type PipelineArtifactFilter = ReleaseContracts.ArtifactFilter;
export type PipelineDefinitionDeployStep = ReleaseContracts.ReleaseDefinitionDeployStep;
export type PipelineEnvironmentOptions = ReleaseContracts.EnvironmentOptions;
export type PipelineRetentionSettings = ReleaseContracts.RetentionSettings;
export type PipelineDefinitionFolder = ReleaseContracts.Folder;
export type PipelineReleaseApproval = ReleaseContracts.ReleaseApproval;
export type PipelineTagFilter = ReleaseContracts.TagFilter;
export type ProjectReference = ReleaseContracts.ProjectReference;

export type PipelineDefinitionRetentionPolicy = ReleaseContracts.RetentionPolicy;
export type PipelineReference = ReleaseContracts.ReleaseReference;
export type PipelineDefinitionSource_Type = ReleaseContracts.ReleaseDefinitionSource;
export type PipelineArtifactTypes_Type = ReleaseTypes.ArtifactTypes;
export type PipelineReleaseTriggerType = ReleaseContracts.ReleaseTriggerType;
export const PipelineDefinitionRequestCreationSource_Type = ReleaseTypes.ReleaseDefinitionCreationSource;

export const PipelineDefinitionSource = ReleaseContracts.ReleaseDefinitionSource;
export const PipelineTriggerType = ReleaseContracts.ReleaseTriggerType;
export const PipelineEnvironmentTriggerConditionType = ReleaseContracts.ConditionType;

export const PipelineEnvironmentTriggerTypeConstants = ReleaseTypes.EnvironmentDeploymentConditionsTriggerTypeConstants;
export const PipelineEnvironmentTriggerConditionEnvironmentStatus = ReleaseContracts.EnvironmentStatus;

export const PipelineConstants = ReleaseTypes.ReleaseDefinitionConstants;
export const PipelineArtifactConstants = ReleaseTypes.ArtifactDefaultVersionConstants;
export const PipelineArtifactTypes = ReleaseTypes.ArtifactTypes;
export const PipelineArtifactDefinitionConstants = ReleaseConstants.ArtifactDefinitionConstants;

export const PipelineStringConstants = ReleaseTypes.StringConstants;
export const PipelineRunOptionsConstants = ReleaseConstants.RunOptionsConstants;

export type PipelineRelease = ReleaseContracts.Release;
export type PipelineReleaseStartMetadata = ReleaseContracts.ReleaseStartMetadata;
export type PipelineDeploymentAuthorizationInfo = ReleaseContracts.DeploymentAuthorizationInfo;
export const PipelineReleaseEditorActions = ReleaseTypes.ReleaseEditorAction;
export const PipelineDefinitionDesignerActions = ReleaseTypes.DefinitionDesignerActions;
export const EnvironmentSummaryAction = ReleaseTypes.EnvironmentSummaryAction;
export const PipelineExtensionAreas = ReleaseTypes.ExtensionArea;

export type PipelineArtifactVersion = ReleaseContracts.ArtifactVersion;
export type PipelineArtifactVersionQueryResult = ReleaseContracts.ArtifactVersionQueryResult;
export type PipelineBuildVersion = ReleaseContracts.BuildVersion;
export type PipelineArtifactMetadata = ReleaseContracts.ArtifactMetadata;
export type PipelineArtifactsDownloadInput = ReleaseContracts.ArtifactsDownloadInput;
export type PipelineArtifactDownloadInputBase = ReleaseContracts.ArtifactDownloadInputBase;
export type PipelineBuildArtifactDownloadInput = ReleaseContracts.BuildArtifactDownloadInput;
export type PipelineCustomArtifactDownloadInput = ReleaseContracts.CustomArtifactDownloadInput;
export type PipelineGitArtifactDownloadInput = ReleaseContracts.GitArtifactDownloadInput;
export type PipelineGitHubArtifactDownloadInput = ReleaseContracts.GitHubArtifactDownloadInput;
export type PipelineJenkinsArtifactDownloadInput = ReleaseContracts.JenkinsArtifactDownloadInput;
export type PipelineTfvcArtifactDownloadInput = ReleaseContracts.TfvcArtifactDownloadInput;
export const PipelineArtifactDownloadInputConstants = ReleaseConstants.ArtifactDownloadInputConstants;
export const PipelineDeployPhaseTypes = ReleaseContracts.DeployPhaseTypes;
export const ReleaseDefinitionQueryOrder = ReleaseContracts.ReleaseDefinitionQueryOrder;
export const ReleaseDefinitionExpands = ReleaseContracts.ReleaseDefinitionExpands;
export const PipelineDefinitionContractMetadata = ReleaseContracts.TypeInfo.ReleaseDefinition;

export const PipelineAuthorizationHeaderType = ReleaseContracts.AuthorizationHeaderFor;

export const ReleaseDeploymentStatus = ReleaseContracts.DeploymentStatus;
export const ReleaseOperationStatus = ReleaseContracts.DeploymentOperationStatus;
export const ReleaseStatus = ReleaseContracts.ReleaseStatus;
export const ReleaseQueryOrder = ReleaseContracts.ReleaseQueryOrder;
export type ReleaseDeployment = ReleaseContracts.Deployment;
export type ArtifactChange = ReleaseContracts.Change;

export type PipelineEnvironmentGatesOptions = ReleaseContracts.ReleaseDefinitionGatesOptions;
export type PipelineEnvironmentGate = ReleaseContracts.ReleaseDefinitionGate;
export type PipelineEnvironmentGatesStep = ReleaseContracts.ReleaseDefinitionGatesStep;

export const PipelineReleaseCreationSourceConstants = ReleaseTypes.ReleaseCreationSource;

/**
 * @brief Navigation views to be used at page level
 */
export interface INavigationView extends IDisposable {
    canNavigateAway(): boolean;
}

/**
 * @brief Page level navigation state
 */
export interface INavigationState {
    action: string;
    data: any;
    windowTitle: string;
}

export interface IVariablesData {
    definitionId: number;
    definitionPath: string;
    variables: {
        [key: string]: ReleaseContracts.ConfigurationVariableValue;
    };
    environments: IEnvironmentVariablesData[];
}

export interface IEnvironmentVariablesData {
    name: string;
    scopeKey: number;
    definitionId: number;
    variables: {
        [key: string]: ReleaseContracts.ConfigurationVariableValue;
    };
}

/**
 * @brief External interface for a Definition
 */
export interface IDefinition extends INavigationView {
    create(templateId: string): void;
    edit(action: string, definitionId: number, environmentId?: number): void;
}

export interface IBuildDefinitionProperties {
    repositoryId: string;
    repositoryType: string;
}

export interface IArtifactTriggersMap {
    artifact: PipelineArtifact;
    trigger: PipelineTriggerBase;
    pullRequestTrigger: ReleaseContracts.PullRequestTrigger;
    artifactTypeDefinition: PipelineArtifactTypeDefinition;
}

export interface IUpdateArtifactListActionPayload {
    artifactTriggersMap: IArtifactTriggersMap[];
    forcedUpdate: boolean;
}

export interface IEnvironmentTriggerCondition extends PipelineEnvironmentTriggerCondition {
    environmentId?: number;
}

export interface ICancelable {
    isCanceled: boolean;
}

export interface ICancelableReleaseDefinitionsResult extends ICancelable {
    result?: IReleaseDefinitionsResult;
}

export interface ICancelableReleasesResult extends ICancelable {
    result?: IReleasesResult;
}

export interface IReleaseDefinitionsResult {
    definitions: PipelineDefinition[];
    continuationToken?: string;
}

export interface IReleasesResult {
    releases: PipelineRelease[];
    continuationToken?: number;
    queryDefinitionId?: number;
}

export interface IDeploymentResult {
    deployments: ReleaseDeployment[];
    continuationToken?: number;
}

export enum ComputedDeploymentStatus {
    CanceledBeforeExecution = "CanceledBeforeExecution",
    CanceledDuringExecution = "CanceledDuringExecution",
    Cancelling = "Cancelling",
    Deferred = "Deferred",
    Failed = "Failed",
    InProgress = "InProgress",
    ManualInterventionPending = "ManualInterventionPending",
    NotDeployed = "NotDeployed",
    PartiallySucceeded = "PartiallySucceeded",
    PostApprovalPending = "PostApprovalPending",
    PostApprovalRejected = "PostApprovalRejected",
    PreApprovalPending = "PreApprovalPending",
    PreApprovalRejected = "PreApprovalRejected",
    Queued = "Queued",
    QueuedForAgentBeforeDeploy = "QueuedForAgentBeforeDeploy",
    QueuedForPipelineBeforeDeploy = "QueuedForPipelineBeforeDeploy",
    QueuedForAgentDuringDeploy = "QueuedForAgentDuringDeploy",
    QueuedForPipelineDuringDeploy = "QueuedForPipelineDuringDeploy",
    Scheduled = "Scheduled",
    Succeeded = "Succeeded",
    TaskFailedOrManualInterventionRejected = "TaskFailedOrManualInterventionRejected",
    EvaluatingPreDeploymentGates = "EvaluatingPreDeploymentGates",
    PreDeploymentGatesFailed = "PreDeploymentGatesFailed",
    EvaluatingPostDeploymentGates = "EvaluatingPostDeploymentGates",
    PostDeploymentGatesFailed = "PostDeploymentGatesFailed",
    EvaluatingGatesPhase = "EvaluatingGatesPhase",
    Undefined = "Undefined"
}

export class ApprovalTypeKeys {
    public static automaticApprovalTypeKey: string = "automatic-approval";
    public static manualApprovalTypeKey: string = "manual-approval";
}

export class ApprovalOrderKeys {
    public static anyOrderKey: string = "any-order";
    public static sequentialOrderKey: string = "sequential-order";
    public static anyOneUserKey: string = "any-one-user";
}

export enum GatesType {
    PreDeploy = "PreDeploy",
    PostDeploy = "PostDeploy",
    Deploy = "Deploy"
}

export enum FilterOption {
    Include = 1,
    Exclude
}