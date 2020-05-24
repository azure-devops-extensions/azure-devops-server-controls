import { empty as emptyString } from "VSS/Utils/String";

import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import {
    DeleteTaskGroupDialogActionsHub,
    IDeletedTaskGroupPayload
} from "TaskGroup/Scripts/Common/DeleteTaskGroupDialog/DeleteTaskGroupDialogActionsHub";
import { TaskGroupReferencesStore } from "TaskGroup/Scripts/Common/TaskGroupReferences/TaskGroupReferencesStore";
import { DialogStoreKeys } from "TaskGroup/Scripts/Common/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface ITaskGroupReferenceSummary {
    count: number;
    icon: string;
    displayName: string;
}

export interface IDeleteTaskGroupDialogState extends IStoreState {
    deleteComplete: boolean;
    deleteInProgress: boolean;
    referenceSummaries: ITaskGroupReferenceSummary[];
}

export class DeleteTaskGroupDialogStore extends StoreBase {
    public static getKey(): string {
        return DialogStoreKeys.DeleteTaskGroupDialogStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._state = {
            deleteComplete: false,
            deleteInProgress: false,
            referenceSummaries: null
        };

        this._deleteTaskGroupDialogActionsHub = ActionsHubManager.GetActionsHub<DeleteTaskGroupDialogActionsHub>(DeleteTaskGroupDialogActionsHub);
        this._deleteTaskGroupDialogActionsHub.deleteStarted.addListener(this._onDeleteStarted);
        this._deleteTaskGroupDialogActionsHub.deleteTaskGroup.addListener(this._onDeleteTaskGroup);

        this._taskGroupReferencesStore = StoreManager.GetStore<TaskGroupReferencesStore>(TaskGroupReferencesStore);
        this._taskGroupReferencesStore.addChangedListener(this._onReferencesChanged);
    }

    public disposeInternal(): void {
        this._deleteTaskGroupDialogActionsHub.deleteStarted.removeListener(this._onDeleteStarted);
        this._deleteTaskGroupDialogActionsHub.deleteTaskGroup.removeListener(this._onDeleteTaskGroup);

        this._taskGroupReferencesStore.removeChangedListener(this._onReferencesChanged);
    }

    public getState(): IDeleteTaskGroupDialogState {
        return this._state;
    }

    private _onDeleteStarted = (payload) => {
        this._state.deleteInProgress = true;
        this.emitChanged();
    }

    private _onDeleteTaskGroup = (payload: IDeletedTaskGroupPayload) => {
        if (!!payload.taskGroupId) {
            this._state.deleteComplete = true;
        }

        this._state.deleteInProgress = false;
        this.emitChanged();
    }

    private _onReferencesChanged = () => {
        const taskGroupReferences = this._taskGroupReferencesStore.getState();
        if (!!taskGroupReferences.referenceGroups) {
            this._state.referenceSummaries = [];
            taskGroupReferences.referenceGroups.forEach((referenceGroup) => {
                this._state.referenceSummaries.push({
                    count: referenceGroup.references.length,
                    icon: referenceGroup.referenceIcon,
                    displayName: referenceGroup.displayName
                });
            });
        }
        else {
            this._state.referenceSummaries = null;
        }

        this.emitChanged();
    }

    private _state: IDeleteTaskGroupDialogState;
    private _taskGroupReferencesStore: TaskGroupReferencesStore;
    private _deleteTaskGroupDialogActionsHub: DeleteTaskGroupDialogActionsHub;
}