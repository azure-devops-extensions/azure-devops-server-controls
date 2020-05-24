import { PropertyDefinition } from "VSSPreview/Config/Framework/PropertyDefinition";

import { BuildDefinition } from 'Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition';
import { Release } from 'Widgets/Scripts/DataServices/ConfigurationQueries/Release';

export type PipelineDefinition = BuildDefinition | Release;

/**
 * Implementation of {PropertyDefinition} for {PipelinePickerBase}
 */
export class PipelinePickerPropertyDefinition implements PropertyDefinition {

    constructor(
        public name: string,
    ) {}

    canSave(properties: { [key: string]: any }): boolean {
        return true;
    }

    getDefaultValue(): PipelineDefinition[] {
        return [ null ];
    }

    overrideSave(pipelines: PipelineDefinition[]): PipelineDefinition[] {
        return pipelines.filter(pipeline => pipeline !== null);
    }
}