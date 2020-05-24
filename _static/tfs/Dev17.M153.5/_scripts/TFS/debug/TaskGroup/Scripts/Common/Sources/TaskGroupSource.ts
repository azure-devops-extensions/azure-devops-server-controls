import * as Q from "q";

import { localeFormat as localeStringFormat } from "VSS/Utils/String";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";
import { TaskDefinitionSource } from "DistributedTaskControls/Sources/TaskDefinitionSource";

import { DistributedTaskServiceCollectionClient } from "TaskGroup/Scripts/Clients/DistributedTaskClient";
import { TaskGroupsHubDataHelper } from "TaskGroup/Scripts/Common/Sources/TaskGroupsHubDataHelper";
import { TaskGroupEditorHubData } from "TaskGroup/Scripts/Common/Sources/TaskGroupEditorHubData";
import {
    getTaskGroupCreateParameter,
    getTaskGroupUpdateParameter,
    getPublishTaskGroupMetadata,
    getPreviewTaskGroup
} from "TaskGroup/Scripts/Utils/TaskGroupUtils";
import { getLatestVersion } from "TaskGroup/Scripts/Utils/TaskVersionUtils";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export class TaskGroupSource extends Singleton {

    constructor() {
        super();
        this._distributedTaskClient = ServiceClientManager.GetServiceClient<DistributedTaskServiceCollectionClient>(DistributedTaskServiceCollectionClient);
    }

    public static instance(): TaskGroupSource {
        return super.getInstance<TaskGroupSource>(TaskGroupSource);
    }

    public static dispose(): void {
        this.instance()._distributedTaskClient = null;
        super.dispose();
    }

    public fetchTaskGroups(): IPromise<DTContracts.TaskGroup[]> {
        const preFetchedTaskGroupsList = TaskGroupsHubDataHelper.getTaskGroups();
        if (preFetchedTaskGroupsList) {
            return Q.resolve(preFetchedTaskGroupsList);
        }
        else {
            return this._distributedTaskClient.getTaskGroups();
        }
    }

    public getAllVersionsOfTaskGroup(taskGroupId: string, expanded: boolean, forceRefresh: boolean = false): IPromise<DTContracts.TaskGroup[]> {
        const preFetchedTaskGroupVersions = TaskGroupEditorHubData.getAllVersionsOfTaskGroup(taskGroupId);
        if (!!preFetchedTaskGroupVersions && !forceRefresh) {
            return Q.resolve(preFetchedTaskGroupVersions);
        }
        else {
            return this._distributedTaskClient.getAllVersionsOfTaskGroup(taskGroupId, expanded);
        }
    }

    public getTaskDefinitions(taskGroupId: string, forceRefresh: boolean = false) {
        const preFetchedTaskDefinitions = TaskGroupEditorHubData.getTaskDefinitionsInTaskGroup(taskGroupId);
        if (!!preFetchedTaskDefinitions && !forceRefresh) {
            TaskDefinitionSource.instance().initializePrefetchedDefinitions(preFetchedTaskDefinitions, true);
        }

        return TaskDefinitionSource.instance().getTaskDefinitionList(!forceRefresh);
    }

    public getParentTaskGroupReferences(taskGroupId: string): IPromise<DTContracts.TaskGroup[]> {
        return this._distributedTaskClient.getParentTaskGroupReferences(taskGroupId);
    }

    public deleteTaskGroup(taskGroupId: string, comment: string): IPromise<void> {
        return this._distributedTaskClient.deleteTaskGroup(taskGroupId, comment);
    }

    public saveTaskGroup(taskGroup: DTContracts.TaskGroup, comment: string): IPromise<DTContracts.TaskGroup> {
        const taskGroupUpdateParameter = getTaskGroupUpdateParameter(taskGroup, comment);
        return this._distributedTaskClient.saveTaskGroup(taskGroupUpdateParameter);
    }

    public addTaskGroup(taskGroup: DTContracts.TaskGroup): IPromise<DTContracts.TaskGroup> {
        const taskGroupCreateParameter = getTaskGroupCreateParameter(taskGroup);
        return this._distributedTaskClient.addTaskGroup(taskGroupCreateParameter);
    }

    public publishDraftTaskGroup(taskGroup: DTContracts.TaskGroup, comment: string, isPreview: boolean): IPromise<DTContracts.TaskGroup[]> {
        const publishCommentPrefix: string = isPreview ? Resources.PublishDraftTaskGroupAsPreviewPrefix : Resources.PublishDraftTaskGroupPrefix;

        let publishComment = publishCommentPrefix;
        if (!!comment) {
            publishComment = localeStringFormat(Resources.PublishDraftTaskGroupCommentFormat, publishCommentPrefix, comment);
        }

        // Right now, to get the latest parent definition revision, we need to make an API call. 
        return this.getAllVersionsOfTaskGroup(taskGroup.parentDefinitionId, false).then((parentTaskGroups: DTContracts.TaskGroup[]) => {
            const latestParentVersion = getLatestVersion(parentTaskGroups) as DTContracts.TaskGroup;
            const publishTaskGroupMetadata: DTContracts.PublishTaskGroupMetadata = getPublishTaskGroupMetadata(taskGroup, publishComment, latestParentVersion.revision, isPreview);
            return this._distributedTaskClient.publishTaskGroup(publishTaskGroupMetadata, taskGroup.parentDefinitionId);
        });
    }

    public publishPreviewTaskGroup(taskGroup: DTContracts.TaskGroup, comment: string, disablePriorVersions: boolean): IPromise<DTContracts.TaskGroup[]> {
        const publishCommentPrefix: string = Resources.PublishPreviewTaskGroupPrefix;

        let publishComment = publishCommentPrefix;
        if (!!comment) {
            publishComment = localeStringFormat(Resources.PublishPreviewTaskGroupCommentFormat, publishCommentPrefix, comment);
        }

        const previewTaskGroup = getPreviewTaskGroup(taskGroup, publishComment);
        return this._distributedTaskClient.publishPreviewTaskGroup(previewTaskGroup, taskGroup.id, disablePriorVersions);
    }

    private _distributedTaskClient: DistributedTaskServiceCollectionClient;
}