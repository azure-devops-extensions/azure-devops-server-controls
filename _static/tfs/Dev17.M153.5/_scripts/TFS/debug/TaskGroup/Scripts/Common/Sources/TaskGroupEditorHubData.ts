import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";

import { TaskGroupsHubDataProviderKeys } from "TaskGroup/Scripts/Common/Constants";
import * as DTContracts from "TFS/DistributedTask/Contracts";

interface ITaskGroupEditorHubData {
    taskGroupId: string;
    taskDefinitionList: DTContracts.TaskDefinition[];
    allTaskGroupVersions: DTContracts.TaskGroup[];
}

let TypeInfo = {
    ITaskGroupEditorHubData: {
        fields: <any>null
    }
};

TypeInfo.ITaskGroupEditorHubData.fields = {
    taskDefinitionList: {
        isArray: true
    },
    allTaskGroupVersions: {
        isArray: true,
        typeInfo: DTContracts.TypeInfo.TaskGroup
    }
};

export class TaskGroupEditorHubData {
    public static getAllVersionsOfTaskGroup(taskGroupId: string): DTContracts.TaskGroup[] {
        if (this._data && this._data.taskGroupId === taskGroupId) {
            return this._data.allTaskGroupVersions;
        }

        return null;
    }

    public static getTaskDefinitionsInTaskGroup(taskGroupId: string): DTContracts.TaskDefinition[] {
        if (this._data && this._data.taskGroupId === taskGroupId) {
            return this._data.taskDefinitionList;
        }
    }

    public static initialize(): void {
        this._data = getService(WebPageDataService).getPageData<ITaskGroupEditorHubData>(
            TaskGroupsHubDataProviderKeys.TaskGroupEditorHubDataProviderId,
            TypeInfo.ITaskGroupEditorHubData);
    }

    private static _data: ITaskGroupEditorHubData;
}