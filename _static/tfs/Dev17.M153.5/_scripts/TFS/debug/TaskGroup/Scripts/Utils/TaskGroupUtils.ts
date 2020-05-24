import { empty as emptyString, localeFormat } from "VSS/Utils/String";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";
import { getTaskGroupInstanceNameFormat } from "DistributedTasksCommon/TFS.Tasks.Utils";
import * as TaskResources from "DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export function getITaskArrayFromTaskGroup(taskGroup: DTContracts.TaskGroup): ITask[] {
    return taskGroup.tasks.map((taskGroupStep: DTContracts.TaskGroupStep, index: number) => {
        return getITaskFromTaskGroupStep(taskGroupStep, index);
    });
}

export function getITaskFromTaskGroupStep(taskGroupStep: DTContracts.TaskGroupStep, order: number): ITask {
    return {
        displayName: taskGroupStep.displayName,
        refName: taskGroupStep.displayName.replace(/[\s|\W]+/g, "_") + order, // Define refName in TaskGroupStep to expose this. Putting a temp value here
        enabled: taskGroupStep.enabled,
        continueOnError: taskGroupStep.continueOnError,
        timeoutInMinutes: taskGroupStep.timeoutInMinutes,
        alwaysRun: taskGroupStep.alwaysRun,
        order: order,
        inputs: taskGroupStep.inputs,
        task: taskGroupStep.task,
        condition: taskGroupStep.condition,
        environment: taskGroupStep.environment
    };
}

export function getDraftTaskGroup(originalTaskGroup: DTContracts.TaskGroup): DTContracts.TaskGroup {
    let draftTaskGroup: DTContracts.TaskGroup = JQueryWrapper.extendDeep({}, originalTaskGroup);
    draftTaskGroup.version = {
        isTest: true,
        major: 1,
        minor: 0,
        patch: 0
    };

    draftTaskGroup.id = emptyString;
    draftTaskGroup.parentDefinitionId = originalTaskGroup.id;
    draftTaskGroup.preview = false;

    return draftTaskGroup;
}

export function getTaskGroupDisplayName(taskGroupName: string, isTest: boolean, isPreview: boolean) {
    if (isTest) {
        return localeFormat(Resources.TaskGroupDisplayNameFormat, taskGroupName, TaskResources.DraftText);
    }

    if (isPreview) {
        return localeFormat(Resources.TaskGroupDisplayNameFormat, taskGroupName, TaskResources.TaskGroup_Preview);
    }

    return taskGroupName;
}

export function prepareTaskGroupForImport(taskGroup: DTContracts.TaskGroup): void {
    taskGroup.id = null;
    taskGroup.version = {
        isTest: false,
        major: 1,
        minor: 0,
        patch: 0
    };

    taskGroup.parentDefinitionId = null;

    taskGroup.name = localeFormat(Resources.ImportedTaskGroupNameFormat, taskGroup.name);
    taskGroup.friendlyName = localeFormat(Resources.ImportedTaskGroupNameFormat, taskGroup.friendlyName);
    taskGroup.instanceNameFormat = getTaskGroupInstanceNameFormat(taskGroup.name, taskGroup.inputs);

    // Initialize some required fields if not present to handle empty json
    if(taskGroup.tasks == null)
    {
        taskGroup.tasks = []
    }

    if(taskGroup.groups == null)
    {
        taskGroup.groups = []
    }

    if(taskGroup.inputs == null)
    {
        taskGroup.inputs = []
    }

    if(taskGroup.dataSourceBindings == null)
    {
        taskGroup.dataSourceBindings = []
    }

    // Clear contribution identifier
    taskGroup.contributionIdentifier = null;
}

export function getTaskGroupCreateParameter(taskGroup: DTContracts.TaskGroup): DTContracts.TaskGroupCreateParameter {
    return {
        author: taskGroup.author,
        category: taskGroup.category,
        description: taskGroup.description,
        friendlyName: taskGroup.friendlyName,
        iconUrl: taskGroup.iconUrl,
        inputs: taskGroup.inputs,
        instanceNameFormat: taskGroup.instanceNameFormat,
        name: taskGroup.name,
        parentDefinitionId: taskGroup.parentDefinitionId,
        runsOn: taskGroup.runsOn,
        tasks: taskGroup.tasks,
        version: taskGroup.version
    };
}

export function getTaskGroupUpdateParameter(taskGroup: DTContracts.TaskGroup, comment: string): DTContracts.TaskGroupUpdateParameter {
    return {
        comment: comment,
        author: taskGroup.author,
        category: taskGroup.category,
        description: taskGroup.description,
        friendlyName: taskGroup.friendlyName,
        iconUrl: taskGroup.iconUrl,
        id: taskGroup.id,
        inputs: taskGroup.inputs,
        instanceNameFormat: taskGroup.instanceNameFormat,
        name: taskGroup.name,
        parentDefinitionId: taskGroup.parentDefinitionId,
        revision: taskGroup.revision,
        runsOn: taskGroup.runsOn,
        tasks: taskGroup.tasks,
        version: taskGroup.version
    };
}

export function getPublishTaskGroupMetadata(taskGroup: DTContracts.TaskGroup, comment: string, parentDefinitionRevision: number, isPreview: boolean): DTContracts.PublishTaskGroupMetadata {
    return {
        comment: comment,
        parentDefinitionRevision: parentDefinitionRevision,
        preview: isPreview,
        taskGroupId: taskGroup.id,
        taskGroupRevision: taskGroup.revision
    };
}

export function getPreviewTaskGroup(taskGroup: DTContracts.TaskGroup, comment: string): DTContracts.TaskGroup {
    return {
        comment: comment,
        preview: false,
        version: taskGroup.version,
        revision: taskGroup.revision
    } as DTContracts.TaskGroup;
}