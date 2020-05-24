import { empty as emptyString } from "VSS/Utils/String";

import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import {
    SaveTaskGroupDialogActionsHub,
    ISaveCommentUpdatedPayload
} from "TaskGroup/Scripts/Common/SaveTaskGroupDialog/SaveTaskGroupDialogActionsHub";
import { TaskGroupReferencesStore } from "TaskGroup/Scripts/Common/TaskGroupReferences/TaskGroupReferencesStore";
import { DialogStoreKeys } from "TaskGroup/Scripts/Common/Constants";
import * as Resources from "TaskGroup/Scripts/Resources/TFS.Resources.TaskGroup";

export interface ISaveTaskGroupDialogState extends IStoreState {
    saveInProgress: boolean;
    saveComplete: boolean;
    comment: string;
}

export class SaveTaskGroupDialogStore extends StoreBase {
    public static getKey(): string {
        return DialogStoreKeys.SaveTaskGroupDialogStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._state = {
            saveInProgress: false,
            saveComplete: false,
            comment: emptyString,
        };

        this._saveTaskGroupDialogActionsHub = ActionsHubManager.GetActionsHub<SaveTaskGroupDialogActionsHub>(SaveTaskGroupDialogActionsHub);
        this._saveTaskGroupDialogActionsHub.updateComment.addListener(this._onUpdateComment);
        this._saveTaskGroupDialogActionsHub.notifySaveComplete.addListener(this._onSaveComplete);
        this._saveTaskGroupDialogActionsHub.notifySaveStarted.addListener(this._onSaveStarted);
        this._saveTaskGroupDialogActionsHub.notifySaveFailed.addListener(this._onSaveFailed);
    }

    public disposeInternal(): void {
        this._saveTaskGroupDialogActionsHub.updateComment.removeListener(this._onUpdateComment);
        this._saveTaskGroupDialogActionsHub.notifySaveComplete.removeListener(this._onSaveComplete);
        this._saveTaskGroupDialogActionsHub.notifySaveStarted.removeListener(this._onSaveStarted);
        this._saveTaskGroupDialogActionsHub.notifySaveFailed.removeListener(this._onSaveFailed);
    }

    public getState(): ISaveTaskGroupDialogState {
        return this._state;
    }

    private _onUpdateComment = (payload: ISaveCommentUpdatedPayload) => {
        this._state.comment = payload.comment;
        this.emitChanged();
    }

    private _onSaveComplete = (payload: {}) => {
        this._state.saveComplete = true;
        this.emitChanged();
    }

    private _onSaveStarted = (paylaod: {}) => {
        this._state.saveInProgress = true;
        this.emitChanged();
    }

    private _onSaveFailed = (payload: {}) => {
        this._state.saveInProgress = false;
        this.emitChanged();
    }

    private _state: ISaveTaskGroupDialogState;
    private _saveTaskGroupDialogActionsHub: SaveTaskGroupDialogActionsHub;
}