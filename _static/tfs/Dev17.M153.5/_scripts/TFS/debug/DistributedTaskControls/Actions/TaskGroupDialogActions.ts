
import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

import { Action } from "VSS/Flux/Action";

export interface ICreateTaskGroupPayload {
    onMetaTaskCreated: (taskGroupId: string, taskGroupName: string) => void;
}

export class TaskGroupDialogActions extends ActionsHubBase {

    public initialize(): void {
        this._showTaskGroupSaveDialog = new Action<IEmptyActionPayload>();
        this._hideTaskGroupSaveDialog = new Action<IEmptyActionPayload>();
        this._createMetaTaskGroup = new Action<ICreateTaskGroupPayload>();
        this._dismissErrorMessage = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.TaskGroupDialogActions;
    }

    public get ShowTaskGroupSaveDialog(): Action<IEmptyActionPayload> {
        return this._showTaskGroupSaveDialog;
    }

    public get HideTaskGroupSaveDialog(): Action<IEmptyActionPayload> {
        return this._hideTaskGroupSaveDialog;
    }

    public get CreateMetaTaskGroup(): Action<ICreateTaskGroupPayload> {
        return this._createMetaTaskGroup;
    }

    public get DismissErrorMessage(): Action<IEmptyActionPayload> {
        return this._dismissErrorMessage;
    }

    private _showTaskGroupSaveDialog: Action<IEmptyActionPayload>;
    private _hideTaskGroupSaveDialog: Action<IEmptyActionPayload>;
    private _createMetaTaskGroup: Action<ICreateTaskGroupPayload>;
    private _dismissErrorMessage: Action<IEmptyActionPayload>;
}