import { BuildDefinition } from "Widgets/Scripts/DataServices/ConfigurationQueries/BuildDefinition";

export class BuildPipelinePickerSelector {
    private propertyName: string;

    constructor(propertyName: string) {
        this.propertyName = propertyName;
    }

    public getSelectedBuildPipelines(properties: IDictionaryStringTo<any>): BuildDefinition[] {
        const buildPipelines = properties[this.propertyName];
        return buildPipelines ? buildPipelines.filter(buildPipeline => buildPipeline != null) as BuildDefinition[] : null;
    }
}