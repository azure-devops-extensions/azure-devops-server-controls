import VSS = require("VSS/VSS");

import DistributedTaskContracts = require("TFS/DistributedTask/Contracts");
import DistributedTaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");
import Types = require("DistributedTasksCommon/TFS.Tasks.Types");

export interface ITaskGroupModel {
    type: Types.TaskGroupType;
    displayName: string;
    order: number;
    tasks: Types.ITask[];
    taskGroupPropertiesModel: DistributedTaskModels.ChangeTrackerModel;
}

export interface ITaskGroup extends Types.ITaskListOwner {
    getValue(): ITaskGroupModel;
}

export interface ITaskGroupList {
    // list of task groups
    taskGroups: KnockoutObservableArray<ITaskGroup>;
		
    // whether the groups are visible or not
    visible: KnockoutObservable<boolean>;
		
    // whether the groups are editable or not
    editable: KnockoutObservable<boolean>;
		
    // taskDelegates which will be passed to ITaskList
    taskDelegates: KnockoutObservable<Types.ITaskDelegates>;

    // Get task group view models
    getTaskGroupViewModels(): any;

    // validate whether the given taskGroup can be deleted or not
    canBeDeletedDelegate?: (allTaskGroups: ITaskGroup[], taskGroupToBeDeleted: ITaskGroup) => boolean;

    // Add a task group and also tasks to that taskGroup
    addTaskGroup(taskGroup: ITaskGroupModel): ITaskGroup;

    // removes a task group
    removeTaskGroup(taskGroup: ITaskGroup): boolean;
		
    // move a task group across other task groups
    moveTaskGroup(oldIndex: number, newIndex: number): void;

    getValue(): ITaskGroupModel[];

    // get flat list of tasks
    getTaskList(): Types.ITask[];
	
    // Ignore observed changes
    revert(): void;
		
    // update task groups
    update(taskGroups: ITaskGroupModel[]): void;

    // update tasks with a single task group
    updateTaskList(tasks: Types.ITask[]): void;

    dispose(): void;
}

export interface ITaskGroupListOwner {
    taskGroupList: ITaskGroupList;
}

export var manualInterventionTaskId: string = "bcb64569-d51a-4af0-9c01-ea5d05b3b622";

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Tasks.Types.Internal", exports);
