import { isDesignerDefinition, getAllSteps } from "Build.Common/Scripts/BuildDefinition";

import { DefinitionUtils } from "CIWorkflow/Scripts/Common/DefinitionUtils";
import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";

import { Telemetry, Feature, Properties } from "DistributedTaskControls/Common/Telemetry";

import { BuildDefinition, BuildTrigger, DefinitionTriggerType, DefinitionQuality } from "TFS/Build/Contracts";

export class TelemetryUtils {

    public static publishBuildDefinitionTelemetryOnSave(definition: BuildDefinition, isNewBuildDefinition: boolean, readOnlyDemandsCount: number) {
        if (definition) {
            let isDraftDefinition = DefinitionUtils.isDraftDefinition(definition.quality);

            // Publish Build Definition telemetry only on save when BD is not draft definition
            if (!isDraftDefinition) {
                let eventProperties: IDictionaryStringTo<any> = {};
                let feature: string = Feature.SaveBuildDefinition;
                if (definition) {
                    eventProperties[Properties.ReadOnlyDemandsCount] = readOnlyDemandsCount;

                    if (isDesignerDefinition(definition)) {
                        eventProperties[Properties.TasksCount] = getAllSteps(definition).length;
                    }

                    if (definition.demands) {
                        eventProperties[Properties.CustomDemandsCount] = definition.demands.length;
                    }

                    if (definition.processParameters && definition.processParameters.inputs) {
                        eventProperties[Properties.ProcessParameterCount] = definition.processParameters.inputs.length;
                    }

                    if (definition.variables) {
                        eventProperties[Properties.VariablesCount] = Object.keys(definition.variables).length;
                    }

                    if (definition.repository) {
                        eventProperties[Properties.SourceVersionType] = definition.repository.type;
                    }

                    if (definition.retentionRules) {
                        eventProperties[Properties.RetentionRulesCount] = definition.retentionRules.length;
                    }

                    if (definition.triggers) {
                        let triggersInfo: string = this._processTriggers(definition.triggers);
                        eventProperties[Properties.TriggersInfo] = triggersInfo;
                    }

                    if (definition.repository) {
                        eventProperties[Properties.SourcesCleanOption] = definition.repository.clean;
                    }

                    eventProperties[Properties.BuildDefinitionId] = definition.id;
                    eventProperties[Properties.IsCommentPresent] = !!definition.comment;

                    if (isNewBuildDefinition) {
                        let source: string = NavigationUtils.getSourceFromUrl();
                        eventProperties[Properties.Source] = source;
                        feature = Feature.NewBuildDefinitionCreation;
                    }
                }

                Telemetry.instance().publishEvent(feature, eventProperties);
            }
        }
    }

    private static _processTriggers(triggers: BuildTrigger[]): string {
        let triggerTypes: DefinitionTriggerType[] = [];
        triggers.forEach((trigger: BuildTrigger) => {
            triggerTypes.push(trigger.triggerType);
        });

        return JSON.stringify(triggerTypes);
    }
}