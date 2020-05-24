import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DeployPhaseTypes } from "DistributedTaskControls/Phase/Types";

import * as StringUtils from "VSS/Utils/String";
import {
    PipelineDefinition,
    PipelineDeployPhaseTypes,
    PipelineRunOnAgentDeployPhase,
    PipelineEnvironmentApprovals,
    PipelineDefinitionEnvironment
} from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import { ReleaseDeployPhaseHelper } from "PipelineWorkflow/Scripts/Shared/Environment/ReleaseDeployPhaseHelper";

import { IdentityRef } from "VSS/WebApi/Contracts";

export class DefinitionHelper {

    public static normalizeDefinitionForClone(originalDefinition: PipelineDefinition, properties?: IDictionaryStringTo<any>): PipelineDefinition {
        let definition = JQueryWrapper.extendDeep({}, originalDefinition);
        definition.id = 0;
        definition.name = StringUtils.localeFormat(Resources.DefinitionCloneSuffix, originalDefinition.name);
        definition.properties = properties;
        if (definition.environments && definition.environments.length > 0) {
            definition.environments.forEach(function (environment) {
                // Putting the id as 0 for all environments, since negative ids will be assigned when the envs are added to the store
                environment.id = 0;
                environment.owner = null;
            });
        }

        return definition;
    }

    public static normalizeDefinitionForImport(definition: PipelineDefinition): PipelineDefinition {
        let normalizedDefinition = DefinitionHelper.normalizeDefinitionForClone(definition);
        normalizedDefinition.environments.forEach(environment => {
            this._resetPhaseData(environment, DeployPhaseTypes.AgentBasedDeployment);
            this._resetPhaseData(environment, DeployPhaseTypes.MachineGroupBasedDeployment);
            environment.preDeployApprovals = DefinitionHelper.resetApprovers(environment.preDeployApprovals);
            environment.postDeployApprovals = DefinitionHelper.resetApprovers(environment.postDeployApprovals);
            environment.variableGroups = [];
        });

        normalizedDefinition.variableGroups = [];
        return normalizedDefinition;
    }

    public static resetApprovers(approval: PipelineEnvironmentApprovals): PipelineEnvironmentApprovals {
        approval.approvals.forEach(function (approval) {
            if (!approval.isAutomated) {
                approval.approver = <IdentityRef>{ id: StringUtils.empty, displayName: StringUtils.empty };
            }
        });
        return approval;
    }

    private static _resetPhaseData(environment: PipelineDefinitionEnvironment, phaseType: DeployPhaseTypes): void {
        if (environment && environment.deployPhases) {
            let deployPhases = environment.deployPhases.filter(p => ReleaseDeployPhaseHelper.getDTPhaseType(p.phaseType) === phaseType);
            deployPhases.forEach((dp: any) => {
                if (dp && dp.deploymentInput) {
                    dp.deploymentInput.queueId = 0;
                    if (phaseType === DeployPhaseTypes.MachineGroupBasedDeployment) {
                        dp.deploymentInput.tags = [];
                    }
                }
            });
        }
    }
}