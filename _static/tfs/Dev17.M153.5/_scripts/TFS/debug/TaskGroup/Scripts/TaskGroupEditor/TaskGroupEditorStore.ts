import {
    localeComparer as localeStringComparer,
    empty as emptyString,
    ignoreCaseComparer
} from "VSS/Utils/String";
import { findIndex } from "VSS/Utils/Array";

import * as DTContracts from "TFS/DistributedTask/Contracts";

import { getMajorVersionSpec } from "DistributedTasksCommon/TFS.Tasks.Utils";

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { IStoreState, DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { ContributionIds } from "TaskGroup/Scripts/Common/Constants";
import { TasksTabStore } from "TaskGroup/Scripts/TaskGroupEditor/Tasks/TasksTabStore";
import { TaskGroupVersionsStore, ITaskGroupVersionsStoreState } from "TaskGroup/Scripts/TaskGroupEditor/Versions/TaskGroupVersionsStore";
import { getDraftTaskGroup, getTaskGroupDisplayName } from "TaskGroup/Scripts/Utils/TaskGroupUtils";
import { getTaskDefinitionWithVersionSpec, getAllVersionSpecs } from "TaskGroup/Scripts/Utils/TaskVersionUtils";
import { StoreKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface ITaskGroupEditorState extends IStoreState {
    parentDefinitionId: string;
    name: string;
    invalid: boolean;
    dirty: boolean;
    isDraft: boolean;
    isImport: boolean;
    isPreview: boolean;
    fromExtension: boolean;
}

export class TaskGroupEditorStore extends AggregatorDataStoreBase {

    public static getKey(): string {
        return StoreKeys.TaskGroupEditorStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._currentState = {} as ITaskGroupEditorState;

        this._tasksTabStore = StoreManager.GetStore<TasksTabStore>(TasksTabStore, instanceId);

        this._taskGroupVersionsStore = StoreManager.GetStore<TaskGroupVersionsStore>(TaskGroupVersionsStore, instanceId);

        // Not adding this to data store list as this isn't a data store
        this._taskGroupVersionsStore.addChangedListener(this._onTaskGroupVersionStoreChange);

        this.addToStoreList(this._tasksTabStore);
    }

    public disposeInternal(): void {
        this._taskGroupVersionsStore.removeChangedListener(this._onTaskGroupVersionStoreChange);
        super.disposeInternal();
    }

    public getState(): ITaskGroupEditorState {
        this._currentState.name = this._tasksTabStore.getState().name;
        this._currentState.dirty = this.isDirty();
        this._currentState.invalid = !this.isValid();

        const selectedTaskGroupVersion = this._taskGroupVersionsStore.getState().selectedVersion;
        this._setStateFieldsFromSelectedTaskGroup(selectedTaskGroupVersion);
        return this._currentState;
    }

    public updateVisitor(): DTContracts.TaskGroup {
        let updatedTaskGroup = JQueryWrapper.extendDeep({}, this._taskGroupVersionsStore.getState().selectedVersion);
        this.getDataStoreList().forEach((dataStore: DataStoreBase) => {
            dataStore.updateVisitor(updatedTaskGroup);
        });

        return updatedTaskGroup;
    }

    public getCurrentTaskGroup(): DTContracts.TaskGroup {
        return this.updateVisitor();
    }

    public getCurrentTaskGroupAsDraft(): DTContracts.TaskGroup {
        const currentTaskGroup = this.updateVisitor();
        return getDraftTaskGroup(currentTaskGroup);
    }

    public getSelectedTaskGroup(): DTContracts.TaskGroup {
        return this._taskGroupVersionsStore.getState().selectedVersion;
    }

    private _setStateFieldsFromSelectedTaskGroup(taskGroup: DTContracts.TaskGroup): void {
        if (!!taskGroup) {
            this._currentState.parentDefinitionId = taskGroup.parentDefinitionId;
            this._currentState.isDraft = taskGroup.version.isTest;
            this._currentState.isImport = !taskGroup.id;
            this._currentState.isPreview = taskGroup.preview;
            this._currentState.fromExtension = ignoreCaseComparer(taskGroup.contributionIdentifier, ContributionIds.TaskGroupContributionIdentifierKey) === 0;
        }
    }

    private _onTaskGroupVersionStoreChange = () => {
        this.emitChanged();
    }

    private _currentState: ITaskGroupEditorState;
    private _tasksTabStore: TasksTabStore;
    private _taskGroupVersionsStore: TaskGroupVersionsStore;
}