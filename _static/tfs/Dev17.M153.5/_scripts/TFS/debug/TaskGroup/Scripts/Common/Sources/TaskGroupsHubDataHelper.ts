import * as Contribution_Services from "VSS/Contributions/Services";
import * as Service from "VSS/Service";

import { TaskGroupsHubDataProviderKeys } from "TaskGroup/Scripts/Common/Constants";
import * as DTContracts from "TFS/DistributedTask/Contracts";

export interface ITaskGroupsHubData {
    taskGroupsList: DTContracts.TaskGroup[];
}

let TypeInfo = {
    ITaskGroupsHubData: {
        fields: <any>null
    }
};

TypeInfo.ITaskGroupsHubData.fields = {
    taskGroupsList: {
        isArray: true,
        typeInfo: DTContracts.TypeInfo.TaskGroup
    }
};

export class TaskGroupsHubDataHelper {

    public static getTaskGroups(): DTContracts.TaskGroup[] {
        return (this._data && this._data.taskGroupsList) ? this._data.taskGroupsList : null;
    }

    public static initialize(): void {
        this._data = Service.getService(Contribution_Services.WebPageDataService).getPageData<ITaskGroupsHubData>(
            TaskGroupsHubDataProviderKeys.TaskGroupsHubDataProviderId,
            TypeInfo.ITaskGroupsHubData);
    }

    private static _data: ITaskGroupsHubData;
}