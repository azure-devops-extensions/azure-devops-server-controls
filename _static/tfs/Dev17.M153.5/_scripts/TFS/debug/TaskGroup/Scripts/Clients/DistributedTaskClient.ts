import { VssConnection, getCollectionService } from "VSS/Service";
import { getDefaultWebContext } from "VSS/Context";
import { ContextHostType } from "VSS/Common/Contracts/Platform";

import { TaskAgentHttpClient } from "TFS/DistributedTask/TaskAgentRestClient";
import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Initializable as IInitializable } from "DistributedTaskControls/Common/Factory";

import { ServiceClientKeys } from "TaskGroup/Scripts/Clients/Constants";

export class DistributedTaskServiceCollectionClient implements IInitializable {

    public static getKey(): string {
        return ServiceClientKeys.DistributedTaskClient;
    }

    public initialize(instanceId?: string): void {
        const webContext = getDefaultWebContext();
        const connection = new VssConnection(webContext, ContextHostType.ProjectCollection);
        this._client = connection.getHttpClient<TaskAgentHttpClient>(TaskAgentHttpClient);
    }

    public getTaskGroups(): IPromise<DTContracts.TaskGroup[]> {
        return this._client.getTaskGroups(this.projectId);
    }

    public getTaskGroup(taskGroupId: string, expanded: boolean): IPromise<DTContracts.TaskGroup> {
        return this._client.getTaskGroups(this.projectId, taskGroupId, expanded)
            .then((taskGroups: DTContracts.TaskGroup[]) => {
                return !!taskGroups && taskGroups.length > 0 && taskGroups[0];
            });
    }

    public getAllVersionsOfTaskGroup(taskGroupId: string, expanded: boolean): IPromise<DTContracts.TaskGroup[]> {
        return this._client.getTaskGroups(this.projectId, taskGroupId, expanded);
    }

    public deleteTaskGroup(taskGroupId: string, comment: string): IPromise<void> {
        return this._client.deleteTaskGroup(this.projectId, taskGroupId, comment);
    }

    public getParentTaskGroupReferences(taskId: string): IPromise<DTContracts.TaskGroup[]> {
        return this._client.getTaskGroups(this.projectId, null, false, taskId);
    }

    public getTaskGroupRevision(taskGroupId: string, revision: number): IPromise<string> {
        return this._client.getTaskGroupRevision(this.projectId, taskGroupId, revision);
    }

    public getTaskGroupHistory(taskGroupId: string): IPromise<DTContracts.TaskGroupRevision[]> {
        return this._client.getTaskGroupHistory(this.projectId, taskGroupId);
    }

    public getTaskDefinitions(): IPromise<DTContracts.TaskDefinition[]> {
        return this._client.getTaskDefinitions();
    }

    public saveTaskGroup(taskGroupUpdateParameter: DTContracts.TaskGroupUpdateParameter): IPromise<DTContracts.TaskGroup> {
        return this._client.updateTaskGroup(taskGroupUpdateParameter, this.projectId);
    }

    public addTaskGroup(taskGroupCreateParameter: DTContracts.TaskGroupCreateParameter): IPromise<DTContracts.TaskGroup> {
        return this._client.addTaskGroup(taskGroupCreateParameter, this.projectId);
    }

    public publishTaskGroup(publishTaskGroupMetadata: DTContracts.PublishTaskGroupMetadata, parentTaskGroupId: string): IPromise<DTContracts.TaskGroup[]> {
        return this._client.publishTaskGroup(publishTaskGroupMetadata, this.projectId, parentTaskGroupId);
    }

    public publishPreviewTaskGroup(previewTaskGroup: DTContracts.TaskGroup, taskGroupId: string, disablePriorVersions: boolean): IPromise<DTContracts.TaskGroup[]> {
        return this._client.publishPreviewTaskGroup(previewTaskGroup, this.projectId, taskGroupId, disablePriorVersions);
    }

    private get projectId(): string {
        return getDefaultWebContext().project.id;
    }

    private _client: TaskAgentHttpClient;
}
