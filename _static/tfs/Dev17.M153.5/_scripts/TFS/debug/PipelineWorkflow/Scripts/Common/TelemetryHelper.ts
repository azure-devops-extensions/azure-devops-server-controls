import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";
import { IVariable, VariableList, IDefinitionVariableReference } from "DistributedTaskControls/Variables/Common/Types";
import { VariableConstants as DTCVariableConstants } from "DistributedTaskControls/Variables/Common/Constants";

import { VariablesUtils } from "PipelineWorkflow/Scripts/Shared/Utils/VariablesUtils";
import { PipelineArtifact, PipelineDefinition, PipelineTriggerBase, PipelineRunOnAgentDeployPhase, PipelineDeployPhaseTypes, PipelineVariable } from "PipelineWorkflow/Scripts/Common/Types";

export class TelemetryHelper {

    public static publishEditDefinitionTelemetry(definition: PipelineDefinition) {

        let eventProperties: IDictionaryStringTo<any> = {};
        if (definition) {
            if (definition.environments) {
                eventProperties[Properties.EnvironmentCount] = definition.environments.length;
                let phasesCount: number = 0;
                let environmentVariablesCount: number = 0;
                let processParameterCount: number = 0;
                let tasksCount: number = 0;
                let customDemandsCount: number = 0;
                eventProperties[Properties.OverridableEnvironmentVariables] = 0;
                eventProperties[Properties.OverridableReleaseVariables] = 0;

                definition.environments.forEach((environment) => {
                    if (environment.processParameters && environment.processParameters.inputs) {
                        processParameterCount += environment.processParameters.inputs.length;
                    }

                    if (environment.variables) {
                        environmentVariablesCount += Object.keys(environment.variables).length;
                        eventProperties[Properties.OverridableEnvironmentVariables] += this._getOverridableVariablesCount(environment.variables);
                    }

                    if (environment.deployPhases) {
                        phasesCount += environment.deployPhases.length;
                        
                        environment.deployPhases.forEach((phase) => {
                            if (phase.workflowTasks) {
                                tasksCount += phase.workflowTasks.length;                                
                            }
                            if (phase.phaseType === PipelineDeployPhaseTypes.AgentBasedDeployment) {
                                let agentPhase: PipelineRunOnAgentDeployPhase = phase as PipelineRunOnAgentDeployPhase;
                                customDemandsCount += agentPhase.deploymentInput.demands ? agentPhase.deploymentInput.demands.length : 0;
                            }
                        });
                    }
                });

                eventProperties[Properties.ProcessParameterCount] = processParameterCount;
                eventProperties[Properties.EnvironmentVariablesCount] = environmentVariablesCount;
                eventProperties[Properties.PhasesCount] = phasesCount;
                eventProperties[Properties.TasksCount] = tasksCount;
                eventProperties[Properties.CustomDemandsCount] = customDemandsCount;
            }

            if (definition.artifacts) {
                let artifactSourceTypes: string = this._processArtifactsSource(definition.artifacts);
                eventProperties[Properties.ArtifactSourceTypes] = artifactSourceTypes;
            }

            if (definition.triggers) {
                let triggersInfo: string = this._processTriggers(definition.triggers);
                eventProperties[Properties.TriggersInfo] = triggersInfo;
            }

            if (definition.variables) {
                eventProperties[Properties.ReleaseVariablesCount] = Object.keys(definition.variables).length;
                eventProperties[Properties.OverridableReleaseVariables] = this._getOverridableVariablesCount(definition.variables);
            }

            if (definition.variableGroups) {
                eventProperties[Properties.VariableGroupCount] = definition.variableGroups.length;
            }

            eventProperties[Properties.ReleaseDefinitionId] = definition.id;
        }

        Telemetry.instance().publishEvent(Feature.EditReleaseDefinition, eventProperties);
    }

    public static publishReleaseTimeVariablesTelemetry(definition: PipelineDefinition, variables: VariableList) {
        let eventProperties: IDictionaryStringTo<any> = {};
        eventProperties[Properties.ReleaseDefinitionId] = definition.id;
        eventProperties[Properties.OverridableReleaseVariables] = this._getOverridableVariablesCount(definition.variables);
        eventProperties[Properties.OverridableEnvironmentVariables] = 0;
        eventProperties[Properties.OverridenReleaseVariables] = 0;
        eventProperties[Properties.OverridenEnvironmentVariables] = 0;

        definition.environments.forEach((environment) => {
            eventProperties[Properties.OverridableEnvironmentVariables] += this._getOverridableVariablesCount(environment.variables);
        });

        (variables || []).forEach((variable) => {
            if (this._isVariableValueModified(definition, variable)) {
                if (variable.variable.scope.key === DTCVariableConstants.DefaultScopeKey) {
                    eventProperties[Properties.OverridenReleaseVariables]++;
                } else {
                    eventProperties[Properties.OverridenEnvironmentVariables]++;
                }
            }
        });

        Telemetry.instance().publishEvent(Feature.SettableAtReleaseTime, eventProperties);
    }

    private static _isVariableValueModified(definition: PipelineDefinition, variable: IDefinitionVariableReference): boolean {
        let definitionVariables: IDictionaryStringTo<PipelineVariable> = this._getVariablesOfAScope(definition, variable.variable.scope.key);

        if (definitionVariables 
            && definitionVariables[variable.name] 
            && definitionVariables[variable.name].value !== variable.variable.value) {
            
            return true;
        }

        return false;
    }

    private static _getVariablesOfAScope(definition: PipelineDefinition, scopeKey: number): IDictionaryStringTo<PipelineVariable> {
        if (scopeKey === DTCVariableConstants.DefaultScopeKey) {
            return definition.variables;
        } else {
            let env = definition.environments.find((environment) => { return environment.id === scopeKey; });

            if (!!env) {
                return env.variables;
            }
        }

        return null;
    }

    private static _getOverridableVariablesCount(variables: IDictionaryStringTo<PipelineVariable>): number {
        let count = 0;
        if (!variables) {
            return count;
        }

        Object.keys(variables).forEach((key: string) => {
            if (variables[key].allowOverride) {
                count++;
            }
        });

        return count;
    }

    private static _processArtifactsSource(artifacts: PipelineArtifact[]): string {
        let artifactSourceType: IDictionaryStringTo<number> = {};
        artifacts.forEach((artifact: PipelineArtifact) => {
            let type = artifact.type;
            if (artifactSourceType[type]) {
                artifactSourceType[type] += 1;
            }
            else {
                artifactSourceType[type] = 1;
            }
        });

        return JSON.stringify(artifactSourceType);
    }

    private static _processTriggers(triggers: PipelineTriggerBase[]): string {
        let triggerTypes: IDictionaryStringTo<number> = {};
        triggers.forEach((trigger: PipelineTriggerBase) => {
            let type = trigger.triggerType.toString();
            if (triggerTypes[type]) {
                triggerTypes[type] += 1;
            }
            else {
                triggerTypes[type] = 1;
            }
        });

        return JSON.stringify(triggerTypes);
    }
}

