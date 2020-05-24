/**
 * @brief Common types to be used across Definition scenario
 */

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";
import * as ReleaseTypes from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";
import * as ReleaseConstants from "ReleaseManagement/Core/Constants";

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
export type PipelineEnvironmentApprovals = ReleaseContracts.ReleaseDefinitionApprovals;
export type PipelineEnvironmentApprovalStep = ReleaseContracts.ReleaseDefinitionApprovalStep;
export type PipelineEnvironmentExecutionPolicy = ReleaseContracts.EnvironmentExecutionPolicy;
export type PipelineEnvironmentApprovalOptions = ReleaseContracts.ApprovalOptions;
export type PipelineArtifactTypeDefinition = ReleaseContracts.ArtifactTypeDefinition;
export type PipelineArtifactDefinition = ReleaseContracts.Artifact;
export type PipelineArtifactSourceReference = ReleaseContracts.ArtifactSourceReference;
export type PipelineEnvironmentTriggerCondition = ReleaseContracts.Condition;
export type PipelineReleaseSchedule = ReleaseContracts.ReleaseSchedule;
export type PipelineArtifact = ReleaseContracts.Artifact;
export type PipelineArtifactFilter = ReleaseContracts.ArtifactFilter;
export type PipelineDefintionDeployStep = ReleaseContracts.ReleaseDefinitionDeployStep;
export type PipelineEnvironmentOptions = ReleaseContracts.EnvironmentOptions;
export type PipelineRetentionSettings = ReleaseContracts.RetentionSettings;
export type PipelineDefinitionFolder = ReleaseContracts.Folder;

export type PipelineDefinitionRetentionPolicy = ReleaseContracts.RetentionPolicy;
export type PipelineReference = ReleaseContracts.ReleaseReference;
export type PipelineDefinitionSource_Type = ReleaseContracts.ReleaseDefinitionSource;
export type PipelineArtifactTypes_Type = ReleaseTypes.ArtifactTypes;
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
export const PipelineExtensionAreas = ReleaseTypes.ExtensionArea;

export type PipelineArtifactVersion = ReleaseContracts.ArtifactVersion;
export type PipelineArtifactVersionQueryResult = ReleaseContracts.ArtifactVersionQueryResult;
export type PipelineBuildVersion = ReleaseContracts.BuildVersion;
export type PipelineArtifactMetadata = ReleaseContracts.ArtifactMetadata;
export const PipelineDeployPhaseTypes = ReleaseContracts.DeployPhaseTypes;
export const ReleaseDefinitionQueryOrder = ReleaseContracts.ReleaseDefinitionQueryOrder;
export const ReleaseDefinitionExpands = ReleaseContracts.ReleaseDefinitionExpands;
export const PipelineDefinitionContractMetadata = ReleaseContracts.TypeInfo.ReleaseDefinition;
export const PipelinePullRequestTriggerContractMetadata = ReleaseContracts.TypeInfo.PullRequestTrigger;
export const PipelineAuthorizationHeaderType = ReleaseContracts.AuthorizationHeaderFor;
export const DeploymentGatesPhaseTypeString = "DeploymentGates";
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
    triggers: PipelineTriggerBase[];
}

export interface IUpdateArtifactListActionPayload {
    artifactTriggersMap: IArtifactTriggersMap[];
    forcedUpdate: boolean; 
}

export interface IEnvironmentTriggerCondition extends PipelineEnvironmentTriggerCondition {
    environmentId?: number;
}

export interface IReleaseDefinitionsResult {
    definitions: PipelineDefinition[];
    continuationToken?: string;
}

// since enums cannot be expanded making a copy of Vssf InputMode and added more values to it
export enum InputMode {
    /**
     * This input should not be shown in the UI
     */
    None = 0,
    /**
     * An input text box should be shown
     */
    TextBox = 10,
    /**
     * An password input box should be shown
     */
    PasswordBox = 20,
    /**
     * A select/combo control should be shown
     */
    Combo = 30,
    /**
     * Radio buttons should be shown
     */
    RadioButtons = 40,
    /**
     * Checkbox should be shown(for true/false values)
     */
    CheckBox = 50,
    /**
     * A multi-line text area should be shown
     */
    TextArea = 60,
    /**
     * A pick list should be shown
     */
    PickList = 70,
    /**
     * A tag picker should be shown
     */
    Tags = 80
}