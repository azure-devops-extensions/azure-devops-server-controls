import { ContributionConstants, BuildTasksVisibilityFilter } from "CIWorkflow/Scripts/Common/Constants";

import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import * as BuildContracts from "TFS/Build/Contracts";
import * as CoreContracts from "TFS/Core/Contracts";
import * as DistributedTasksContracts from "TFS/DistributedTask/Contracts";

import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";

export interface IWebPageData {
    allTemplates: BuildContracts.BuildDefinitionTemplate[];
    selectedTemplate: BuildContracts.BuildDefinitionTemplate;
    buildDefinition: BuildContracts.BuildDefinition;
    taskDefinitions: DistributedTasksContracts.TaskDefinition[];
    isPartialTaskList: boolean;
    taskAgentQueues: DistributedTasksContracts.TaskAgentQueue[];
    taskAgentPools: DistributedTasksContracts.TaskAgentPool[];
    defaultRepository: BuildContracts.BuildRepository;
    timeZones: ITimeZoneInfoModel[];
    retentionSettings: BuildContracts.BuildSettings;
    buildOptionDefinitions: BuildContracts.BuildOptionDefinition[];
    sourceProviderAttributes: BuildContracts.SourceProviderAttributes[];
    projects: CoreContracts.TeamProject[];
}

export interface ITimeZoneInfoModel {
    displayName: string;
    id: string;
}

let TypeInfo = {
    WebPageData: {
        fields: null as any
    }
};

TypeInfo.WebPageData.fields = {
    allTemplates: {
        isArray: true,
        typeInfo: BuildContracts.TypeInfo.BuildDefinitionTemplate
    },
    selectedTemplate: {
        typeInfo: BuildContracts.TypeInfo.BuildDefinitionTemplate
    },
    buildDefinition: {
        typeInfo: BuildContracts.TypeInfo.BuildDefinition
    },
    sourceProviderAttributes: {
        isArray: true,
        typeInfo: BuildContracts.TypeInfo.SourceProviderAttributes
    },
    projects: {
        isArray: true,
        typeInfo: CoreContracts.TypeInfo.TeamProject
    }
};

export class WebPageDataHelper {
    private static _data: IWebPageData;

    public static getAllTemplates(): BuildContracts.BuildDefinitionTemplate[] {
        return this._data ? this._data.allTemplates : null;
    }

    public static getBuildDefinition(): BuildContracts.BuildDefinition {
        return this._data ? this._data.buildDefinition : null;
    }

    public static updateBuildDefinition(buildDefinition: BuildContracts.BuildDefinition): void {
        if (this._data && this._data.buildDefinition && buildDefinition.id === this._data.buildDefinition.id) {
            this._data.buildDefinition = buildDefinition;
        }
    }

    public static getSelectedTemplate(): BuildContracts.BuildDefinitionTemplate {
        return this._data ? this._data.selectedTemplate : null;
    }

    public static getTaskDefinitions(): DistributedTasksContracts.TaskDefinition[] {
        return this._data ? this._data.taskDefinitions : null;
    }

    public static getDefaultRepository(): BuildContracts.BuildRepository {
        return this._data ? this._data.defaultRepository : null;
    }

    public static getTaskAgentQueues(): DistributedTasksContracts.TaskAgentQueue[] {
        return (this._data && this._data.taskAgentQueues && this._data.taskAgentQueues.length > 0) ? this._data.taskAgentQueues : null;
    }

    public static getTaskAgentPools(): DistributedTasksContracts.TaskAgentPool[] {
        return (this._data && this._data.taskAgentPools && this._data.taskAgentPools.length > 0) ? this._data.taskAgentPools : null;
    }

    public static getTimeZones(): ITimeZoneInfoModel[] {
        return (this._data && this._data.timeZones) ? this._data.timeZones : null;
    }

    public static getRetentionSettings(): BuildContracts.BuildSettings {
        return (this._data && this._data.retentionSettings) ? this._data.retentionSettings : null;
    }

    public static updateRetentionSettings(settings: BuildContracts.BuildSettings): void {
        if (this._data) {
            this._data.retentionSettings = settings;
        }
    }

    public static getBuildOptionDefinitions(): BuildContracts.BuildOptionDefinition[] {
        return (this._data && this._data.buildOptionDefinitions) ? this._data.buildOptionDefinitions : null;
    }

    public static updateBuildOptionDefinitions(buildOptionDefinitionList: BuildContracts.BuildOptionDefinition[]): void {
        if (this._data) {
            this._data.buildOptionDefinitions = buildOptionDefinitionList;
        }
    }

    public static getSourceProviderAttributes(): BuildContracts.SourceProviderAttributes[] {
        return this._data ? this._data.sourceProviderAttributes : null;
    }

    public static getProjects(): CoreContracts.TeamProject[] {
        return (this._data && this._data.projects) ? this._data.projects : [];
    }

    public static initialize(): void {
        this._data = Service.getService(Contribution_Services.WebPageDataService).getPageData<IWebPageData>(
            ContributionConstants.BUILD_DEFINITION_DATA_PROVIDER_ID,
            TypeInfo.WebPageData);

        if (this._data) {
            if (this._data.taskDefinitions) {
                TaskDefinitionSource.instance().initializePrefetchedDefinitions(this._data.taskDefinitions, this._data.isPartialTaskList, BuildTasksVisibilityFilter);
            }
        }
    }
}

WebPageDataHelper.initialize();
