/**
 *  This file implements actions related to Environment
 */

import * as Q from "q";

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DeployPhaseListActionsCreator } from "DistributedTaskControls/Phase/Actions/DeployPhaseListActionsCreator";
import * as DeployPhaseTypes from "DistributedTaskControls/Phase/Types";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { MessageHandlerActions } from "DistributedTaskControls/Actions/MessageHandlerActions";
import { ProcessParameterActionsCreator } from "DistributedTaskControls/Actions/ProcessParameterActionsCreator";
import { ProcessVariablesActionCreator } from "DistributedTaskControls/Variables/ProcessVariables/Actions/ProcessVariablesActionCreator";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";
import { VariableGroupActionsCreator } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActionsCreator";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";

import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { ArtifactTriggerConditionStore, IArtifactTriggerConditionOptions } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerConditionStore";
import { ArtifactTriggerConditionActionsCreator } from "PipelineWorkflow/Scripts/SharedComponents/ArtifactTriggerCondition/ArtifactTriggerConditionActionsCreator";
import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { DeployPipelineDefinitionSource } from "PipelineWorkflow/Scripts/Editor/Sources/DeployPipelineDefinitionSource";
import { EnvironmentApprovalPoliciesActionCreator } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesActionCreator";
import { EnvironmentApprovalPoliciesUtils } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesUtils";
import { EnvironmentArtifactTriggerStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerStore";
import { EnvironmentArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/EnvironmentArtifactTriggerUtils";
import { EnvironmentArtifactTriggerActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentArtifactTriggerActionsCreator";
import { EnvironmentAutoRedeployTriggerActionsCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAutoRedeployTriggerActionsCreator";
import { EnvironmentListStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentListStore";
import { EnvironmentNameActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameActionCreator";
import { EnvironmentOwnerActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentOwnerActionCreator";
import { EnvironmentStoreActionsHub, IUpdateEnvironmentRankPayload } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStoreActionsHub";
import { EnvironmentTriggerActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerActionCreator";
import { EnvironmentUtils } from "PipelineWorkflow/Scripts/Shared/Utils/EnvironmentUtils";
import { IEnvironmentApprovalPoliciesStoreArgs } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesStore";
import { IUpdatePoliciesActionPayload } from "PipelineWorkflow/Scripts/Shared/Environment/EnvironmentApprovalPoliciesActionsHub";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import { PreDeploymentGatesActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/PreDeploymentGatesActionCreator";
import { PostDeploymentGatesActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/PostDeploymentGatesActionCreator";
import { QueueSettingsActionCreator } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsActionCreator";
import { RetentionPolicyActionsCreator } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyActionsCreator";
import { DefinitionVariablesUtils } from "PipelineWorkflow/Scripts/Editor/Common/DefinitionVariablesUtils";
import { PostApprovalConditionsActionCreator } from "PipelineWorkflow/Scripts/Shared/Environment/PostApprovalConditionsActionCreator";
import { PreApprovalConditionsActionCreator } from "PipelineWorkflow/Scripts/Shared/Environment/PreApprovalConditionsActionCreator";

import RMContracts = require("ReleaseManagement/Core/Contracts");

import { TaskDefinition } from "TFS/DistributedTask/Contracts";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

/**
 * @brief Raises actions related to Environment
 */
export class EnvironmentActionsCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_EnvironmentActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._environmentListStore = StoreManager.GetStore<EnvironmentListStore>(EnvironmentListStore);
        this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);

        this._deployPhaseListActionsCreator = ActionCreatorManager.GetActionCreator<DeployPhaseListActionsCreator>(DeployPhaseListActionsCreator, instanceId);
        this._preApprovalConditionsActionCreator = ActionCreatorManager.GetActionCreator<PreApprovalConditionsActionCreator>(PreApprovalConditionsActionCreator, instanceId);
        this._postApprovalConditionsActionCreator = ActionCreatorManager.GetActionCreator<PostApprovalConditionsActionCreator>(PostApprovalConditionsActionCreator, instanceId);
        this._approvalPoliciesActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentApprovalPoliciesActionCreator>(EnvironmentApprovalPoliciesActionCreator, instanceId);
        this._environmentTriggerActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentTriggerActionCreator>(EnvironmentTriggerActionCreator, instanceId);
        this._environmentNameActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentNameActionCreator>(EnvironmentNameActionCreator, instanceId);
        this._environmentOwnerActionCreator = ActionCreatorManager.GetActionCreator<EnvironmentOwnerActionCreator>(EnvironmentOwnerActionCreator, instanceId);
        this._queueSettingsActionCreator = ActionCreatorManager.GetActionCreator<QueueSettingsActionCreator>(QueueSettingsActionCreator, instanceId);
        this._environmentStoreActionHub = ActionsHubManager.GetActionsHub<EnvironmentStoreActionsHub>(EnvironmentStoreActionsHub, instanceId);
        this._messageHandlerActions = ActionsHubManager.GetActionsHub<MessageHandlerActions>(MessageHandlerActions);
        this._processVariablesActioncreator = ActionCreatorManager.GetActionCreator<ProcessVariablesActionCreator>(ProcessVariablesActionCreator);
        this._procParamActionCreator = ActionCreatorManager.GetActionCreator<ProcessParameterActionsCreator>(ProcessParameterActionsCreator, instanceId);
        this._retentionPolicyActionCreator = ActionCreatorManager.GetActionCreator<RetentionPolicyActionsCreator>(RetentionPolicyActionsCreator, instanceId);
        this._environmentArtifactTriggerActionsCreator = ActionsHubManager.GetActionsHub<EnvironmentArtifactTriggerActionsCreator>(EnvironmentArtifactTriggerActionsCreator, instanceId);
        this._variableGroupActionCreator = ActionCreatorManager.GetActionCreator<VariableGroupActionsCreator>(VariableGroupActionsCreator);
        this._environmentArtifactTriggerStore = StoreManager.GetStore<EnvironmentArtifactTriggerStore>(EnvironmentArtifactTriggerStore, instanceId);
        this._preDeploymentGatesActionCreator = ActionCreatorManager.GetActionCreator<PreDeploymentGatesActionCreator>(PreDeploymentGatesActionCreator, instanceId);
        this._postDeploymentGatesActionCreator = ActionCreatorManager.GetActionCreator<PostDeploymentGatesActionCreator>(PostDeploymentGatesActionCreator, instanceId);
        this._autoRedeployTriggerActionsCreator = ActionCreatorManager.GetActionCreator<EnvironmentAutoRedeployTriggerActionsCreator>(EnvironmentAutoRedeployTriggerActionsCreator, instanceId);
    }

    public applyTemplate(templateId: string, temporaryEnvironment: RMContracts.ReleaseDefinitionEnvironment): IPromise<void> {
        // fetch the tasks definitions if they are not prefetched
        return Q.all([
            DeployPipelineDefinitionSource.instance().getEnvironmentTemplate(templateId),
            TaskDefinitionSource.instance().getTaskDefinitionList(true)
        ]).spread((template: RMContracts.ReleaseDefinitionEnvironmentTemplate, taskDefn: TaskDefinition[]) => {
            let environment: CommonTypes.PipelineDefinitionEnvironment = JQueryWrapper.extendDeep({}, template.environment);
            this._applyTemplateOnTemporaryEnvironment(temporaryEnvironment, environment);
        });
    }

    public updateEnvironment(environment: CommonTypes.PipelineDefinitionEnvironment, force?: boolean): void {

        // update environment corresponding to store
        this._environmentStoreActionHub.updateEnvironment.invoke(environment);

        // update action for DeployPhaseListActionsCreator
        let deployPhases = EnvironmentUtils.getDeployPhases(environment.deployPhases);

        // update process parameters for this environment.
        this._procParamActionCreator.initializeProcessParameters(environment.processParameters, deployPhases);

        this._deployPhaseListActionsCreator.updatePhases(deployPhases, force);

        // update action for PreApprovalConditionsActionCreator
        this._preApprovalConditionsActionCreator.updateApprovals(environment.preDeployApprovals);

        // update action for PostApprovalConditionsActionCreator
        this._postApprovalConditionsActionCreator.updateApprovals(environment.postDeployApprovals);

        // update action for EnvironmentPoliciesActionCreator
        let environmentApprovalPoliciesArg: IEnvironmentApprovalPoliciesStoreArgs = EnvironmentApprovalPoliciesUtils.getEnvironmentApprovalPoliciesArgs(environment.preDeployApprovals, environment.postDeployApprovals);
        this._approvalPoliciesActionCreator.updatePolicies(environmentApprovalPoliciesArg as IUpdatePoliciesActionPayload);

        // update action for pre deployment gates and options
        const preApprovalOptions: PipelineTypes.PipelineEnvironmentApprovalOptions = environment.preDeployApprovals.approvalOptions;
        const postApprovalOptions: PipelineTypes.PipelineEnvironmentApprovalOptions = environment.postDeployApprovals.approvalOptions;
        const preApprovalExecutionOrder: RMContracts.ApprovalExecutionOrder = preApprovalOptions && !!preApprovalOptions.executionOrder
            ? preApprovalOptions.executionOrder : RMContracts.ApprovalExecutionOrder.BeforeGates;
        this._preDeploymentGatesActionCreator.updateGatesData({
            gatesStep: environment.preDeploymentGates || {} as PipelineTypes.PipelineEnvironmentGatesStep,
            approvalExecutionOrder: preApprovalExecutionOrder
        });

        // update action for post deployment gates and options
        const postApprovalExecutionOrder: RMContracts.ApprovalExecutionOrder = postApprovalOptions && !!postApprovalOptions.executionOrder
            ? postApprovalOptions.executionOrder : RMContracts.ApprovalExecutionOrder.AfterSuccessfulGates;
        this._postDeploymentGatesActionCreator.updateGatesData({
            gatesStep: environment.postDeploymentGates || {} as PipelineTypes.PipelineEnvironmentGatesStep,
            approvalExecutionOrder: postApprovalExecutionOrder
        });

        // update action for EnvironmentTriggerActionCreator
        this._environmentTriggerActionCreator.updateEnvironmentTrigger(environment.id, environment.conditions, environment.schedules);

        // update action for EnvironmentNameActionCreator
        this._environmentNameActionCreator.updateEnvironmentNameFromService(environment.name);

        // update action for EnvironmentOwnerActionCreator
        this._environmentOwnerActionCreator.updateEnvironmentOwnerFromService(environment.owner);

        // update action for queueSettingsActionCreator
        this._queueSettingsActionCreator.updateQueueSettings(environment.executionPolicy);

        // Update retention policy for an environment
        this._retentionPolicyActionCreator.updateRetentionPolicy(environment.retentionPolicy);

        // Update environment artifact trigger conditions
        this._updateEnvironmentArtifactTriggerConditions(environment.conditions);

        // update action for EnvironmentAutoRedeployTriggerActionsCreator
        this._autoRedeployTriggerActionsCreator.updateAutoRedeployTriggerData(environment.environmentTriggers);
    }

    public updateEnvironmentRank(payload: IUpdateEnvironmentRankPayload): void {
        this._environmentStoreActionHub.updateRank.invoke(payload);
    }

    public markEnvironmentAsDeleting(): void {
        this._environmentStoreActionHub.markEnvironmentAsDeleting.invoke(null);
    }

    public togglePullRequestDeployment(value: boolean): void {
        this._environmentStoreActionHub.togglePullRequestDeployment.invoke(value);
    }

    private _updateEnvironmentArtifactTriggerConditions(environmentTriggerConditions: CommonTypes.PipelineEnvironmentTriggerCondition[]) {
        let artifactTriggerConditions: CommonTypes.PipelineEnvironmentTriggerCondition[] = EnvironmentArtifactTriggerUtils.filterArtifactTriggerConditionsFromEnvironmentTriggerConditions(environmentTriggerConditions);
        let artifactContainers = EnvironmentArtifactTriggerUtils.getArtifactTriggerContainers(artifactTriggerConditions);
        this._environmentArtifactTriggerActionsCreator.updateArtifactTriggers(artifactContainers);
        let dataStores: ArtifactTriggerConditionStore[] = this._environmentArtifactTriggerStore.getDataStoreList() as ArtifactTriggerConditionStore[];
        artifactContainers.forEach(container => {
            let artifactStore: ArtifactStore = this._artifactListStore.getArtifactByAlias(container.alias);
            dataStores.forEach(dataStore => {
                if (Utils_String.localeIgnoreCaseComparer(dataStore.getAlias(), container.alias) === 0) {
                    let artifactTriggerConditionActionCreator = ActionsHubManager.GetActionsHub<ArtifactTriggerConditionActionsCreator>(ArtifactTriggerConditionActionsCreator, dataStore.getInstanceId());
                    artifactTriggerConditionActionCreator.updateTriggerConditions(container.triggerConditions);
                }
            });
        });
        this._environmentArtifactTriggerActionsCreator.resetToggleState((artifactContainers && artifactContainers.length > 0) ? true : false);
    }

    private _applyTemplateOnTemporaryEnvironment(temporaryEnvironment: RMContracts.ReleaseDefinitionEnvironment, templateEnvironment: RMContracts.ReleaseDefinitionEnvironment): void {
        templateEnvironment.id = temporaryEnvironment.id;
        templateEnvironment.name = temporaryEnvironment.name;
        templateEnvironment.rank = temporaryEnvironment.rank;
        templateEnvironment.conditions = temporaryEnvironment.conditions;
        this._environmentListStore.fillDataOnNewEnvironment(templateEnvironment, null, false, false, false, false, true);
        this.updateEnvironment(templateEnvironment, true);

        // add the variables for the environment
        this._addEnvironmentVariables(templateEnvironment);
        this._environmentStoreActionHub.markEnvironmentAsPermanent.invoke(null);
    }

    private _addEnvironmentVariables(environment: RMContracts.ReleaseDefinitionEnvironment): void {
        this._processVariablesActioncreator.addScopedProcessVariables(DefinitionVariablesUtils.getScopedProcessVariables(environment));
        this._variableGroupActionCreator.addScopedVariableGroups(
            environment.variableGroups,
            {
                key: environment.id,
                value: environment.name
            } as IScope);
    }

    private _defaultTaskRefName = "Task";
    private _preDeploymentGatesActionCreator: PreDeploymentGatesActionCreator;
    private _postDeploymentGatesActionCreator: PostDeploymentGatesActionCreator;
    private _deployPhaseListActionsCreator: DeployPhaseListActionsCreator;
    private _preApprovalConditionsActionCreator: PreApprovalConditionsActionCreator;
    private _postApprovalConditionsActionCreator: PostApprovalConditionsActionCreator;
    private _approvalPoliciesActionCreator: EnvironmentApprovalPoliciesActionCreator;
    private _environmentTriggerActionCreator: EnvironmentTriggerActionCreator;
    private _environmentNameActionCreator: EnvironmentNameActionCreator;
    private _environmentOwnerActionCreator: EnvironmentOwnerActionCreator;
    private _queueSettingsActionCreator: QueueSettingsActionCreator;
    private _environmentStoreActionHub: EnvironmentStoreActionsHub;
    private _messageHandlerActions: MessageHandlerActions;
    private _environmentListStore: EnvironmentListStore;
    private _environmentArtifactTriggerStore: EnvironmentArtifactTriggerStore;
    private _artifactListStore: ArtifactListStore;
    private _processVariablesActioncreator: ProcessVariablesActionCreator;
    private _procParamActionCreator: ProcessParameterActionsCreator;
    private _retentionPolicyActionCreator: RetentionPolicyActionsCreator;
    private _environmentArtifactTriggerActionsCreator: EnvironmentArtifactTriggerActionsCreator;
    private _variableGroupActionCreator: VariableGroupActionsCreator;
    private _autoRedeployTriggerActionsCreator: EnvironmentAutoRedeployTriggerActionsCreator;
}