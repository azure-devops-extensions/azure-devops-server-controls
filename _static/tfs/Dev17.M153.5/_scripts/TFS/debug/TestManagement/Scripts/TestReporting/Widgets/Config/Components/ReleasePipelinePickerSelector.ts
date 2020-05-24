import { Release } from 'Widgets/Scripts/DataServices/ConfigurationQueries/Release';

export class ReleasePipelinePickerSelector {
    private propertyName: string;

    constructor(propertyName: string) {
        this.propertyName = propertyName;
    }

    public getSelectedReleasePipelines(properties: IDictionaryStringTo<any>): Release[] {
        let releasePipelines = properties[this.propertyName];
        releasePipelines = releasePipelines.filter(pipeline => pipeline != null);
        return releasePipelines as Release[];
    }
}