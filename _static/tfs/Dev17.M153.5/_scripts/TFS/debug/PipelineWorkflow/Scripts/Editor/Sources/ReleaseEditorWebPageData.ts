import { Singleton } from "DistributedTaskControls/Common/Factory";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import { IWebPageData, WebPageDataHelper } from "PipelineWorkflow/Scripts/Shared/Sources/WebPageData";

import RMContracts = require("ReleaseManagement/Core/Contracts");

import * as DistributedTasksContracts from "TFS/DistributedTask/Contracts";

import * as Serialization from "VSS/Serialization";
import * as Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";

import * as Utils_String from "VSS/Utils/String";

export interface IReleaseEditorWebPageData extends IWebPageData {

    taskDefinitions: DistributedTasksContracts.TaskDefinition[];

    isPartialTaskList: boolean;

    releaseDefinition: RMContracts.ReleaseDefinition;

    releaseSettings: RMContracts.ReleaseSettings;

    templates: RMContracts.ReleaseDefinitionEnvironmentTemplate[];

    emptyEnvironmentTemplate: RMContracts.ReleaseDefinitionEnvironmentTemplate;

    artifactTypeDefinitions: RMContracts.ArtifactTypeDefinition[];
}

let ReleaseEditorTypeInfo = {
    WebPageData: {
        fields: null as any
    }
};

ReleaseEditorTypeInfo.WebPageData.fields = {
    releaseDefinition: {
        typeInfo: RMContracts.TypeInfo.ReleaseDefinition
    }
};

export class ReleaseEditorWebPageDataHelper extends WebPageDataHelper {

    public static instance(): ReleaseEditorWebPageDataHelper {
        return super.getInstance(ReleaseEditorWebPageDataHelper);
    }

    public static dispose(): void {
        super.getInstance(ReleaseEditorWebPageDataHelper)._data = null;
        super.dispose();
    }

    public initializeData(dataProviderId: string): void {
        if (!this._data) {
            this._data = Service.getService(Contribution_Services.WebPageDataService).getPageData<IReleaseEditorWebPageData>(
                dataProviderId,
                ReleaseEditorTypeInfo.WebPageData);

            if (this._data && this._data.taskDefinitions) {
                super.initializeTaskDefinitions(this._data.taskDefinitions, this._data.isPartialTaskList);
            }
        }
    }

    protected getData(): IWebPageData {
        return this._data;
    }

    public getReleaseDefinition(): RMContracts.ReleaseDefinition {
        return this._data ? this._data.releaseDefinition : null;
    }

    public updateReleaseDefinition(releaseDefinition: RMContracts.ReleaseDefinition): void {
        if (this._data && this._data.releaseDefinition && releaseDefinition.id === this._data.releaseDefinition.id) {
            this._data.releaseDefinition = releaseDefinition;
        }
    }

    public getReleaseSettings(): RMContracts.ReleaseSettings {
        return this._data ? this._data.releaseSettings : null;
    }

    public getEmptyEnvironmentTemplate(): RMContracts.ReleaseDefinitionEnvironmentTemplate {
        return this._data
            ? Serialization.ContractSerializer.deserialize(this._data.emptyEnvironmentTemplate, RMContracts.TypeInfo.ReleaseDefinitionEnvironmentTemplate)
            : null;
    }

    public getReleaseDefinitionEnvironmentTemplates(): RMContracts.ReleaseDefinitionEnvironmentTemplate[] {
        return this._data ? this._data.templates : null;
    }

    public getArtifactTypeDefinitions(): RMContracts.ArtifactTypeDefinition[] {
        return this._data ? this._data.artifactTypeDefinitions : null;
    }

    private _data: IReleaseEditorWebPageData;
}
