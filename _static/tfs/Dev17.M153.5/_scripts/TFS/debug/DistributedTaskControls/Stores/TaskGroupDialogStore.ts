import * as Actions from "DistributedTaskControls/Actions/TaskGroupDialogActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IErrorState } from "DistributedTaskControls/Common/Types";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { MetaTaskManager } from "DistributedTaskControls/Components/Task/MetaTaskManager";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { TaskGroupPropertiesStore } from "DistributedTaskControls/Stores/TaskGroupPropertiesStore";
import { TaskGroupParametersStore } from "DistributedTaskControls/Stores/TaskGroupParametersStore";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface ITaskGroupDialogState extends ComponentBase.IState {
    isShown: boolean;
    isInvalid: boolean;
    isCreateButtonDisabled: boolean;
    creatingTaskGroup: boolean;
    errorState: IErrorState;
}

export class TaskGroupDialogStore extends StoreCommonBase.StoreBase {

    constructor() {
        super();
        this._taskGroupDialogState = this._initializeTaskGroupDialogState();
    }

    public initialize(): void {
        this._taskGroupDialogActions = ActionsHubManager.GetActionsHub<Actions.TaskGroupDialogActions>(Actions.TaskGroupDialogActions);
        this._taskGroupDialogActions.ShowTaskGroupSaveDialog.addListener(this._handleShowTaskGroupSaveDialog);
        this._taskGroupDialogActions.HideTaskGroupSaveDialog.addListener(this._handleHideTaskGroupSaveDialog);
        this._taskGroupDialogActions.CreateMetaTaskGroup.addListener(this._handleAddMetaTask);
        this._taskGroupDialogActions.DismissErrorMessage.addListener(this._handleDismissErrorMessage);

        this._taskGroupPropertiesStore = StoreManager.GetStore<TaskGroupPropertiesStore>(TaskGroupPropertiesStore);
        this._taskGroupParametersStore = StoreManager.GetStore<TaskGroupParametersStore>(TaskGroupParametersStore);
    }

    protected disposeInternal(): void {
        this._taskGroupDialogActions.ShowTaskGroupSaveDialog.removeListener(this._handleShowTaskGroupSaveDialog);
        this._taskGroupDialogActions.HideTaskGroupSaveDialog.removeListener(this._handleHideTaskGroupSaveDialog);
        this._taskGroupDialogActions.CreateMetaTaskGroup.removeListener(this._handleAddMetaTask);
        this._taskGroupDialogActions.DismissErrorMessage.removeListener(this._handleDismissErrorMessage);
    }

    public static getKey(): string {
        return StoreKeys.TaskGroupDialogStore;
    }

    private _handleShowTaskGroupSaveDialog = (): void => {
        this._taskGroupDialogState.isShown = true;
        this.emitChanged();
    }

    private _handleHideTaskGroupSaveDialog = (): void => {
        this._taskGroupDialogState.isShown = false;
        this.emitChanged();
        this._resetTaskGroupDialogState();
    }

    private _handleAddMetaTask = (payload: Actions.ICreateTaskGroupPayload): void => {
        this._taskGroupDialogState.creatingTaskGroup = true;
        this.emitChanged();

        this._onOkClick(payload.onMetaTaskCreated).then(() => {
            this._taskGroupDialogState.isShown = false;
            this.emitChanged();
            this._resetTaskGroupDialogState();
        }, (error: any) => {
            this._taskGroupDialogState.isInvalid = true;
            this._taskGroupDialogState.creatingTaskGroup = false;
            this._taskGroupDialogState.isCreateButtonDisabled = true;
            this._taskGroupDialogState.errorState = {
                errorMessage: error.message,
                errorStatusCode: error.status
            };
            this.emitChanged();
        });
    }

    public getState(): ITaskGroupDialogState {
        return this._taskGroupDialogState;
    }

    private _onOkClick(onMetaTaskCreated: (taskGroupId: string, taskGroupName: string) => void): IPromise<DistributedTaskContracts.TaskGroup> {
        const taskGroupPropertiesState = this._taskGroupPropertiesStore.getState();
        const taskGroupParametersState = this._taskGroupParametersStore.getState();
        let taskInputDefinitions: DistributedTaskContracts.TaskInputDefinition[] = taskGroupParametersState.metaTaskData.metaTaskInputs;
        let taskSetDefinition: DistributedTaskContracts.TaskGroup = MetaTaskManager.instance().generateMetaTaskDefinition(taskGroupPropertiesState.name.trim(), taskGroupPropertiesState.description,
            taskGroupPropertiesState.category, taskGroupParametersState.metaTaskData.tasks, taskInputDefinitions, taskGroupParametersState.metaTaskData.runsOns,
            taskGroupParametersState.metaTaskData.dataSourceBindings, taskGroupParametersState.metaTaskData.groups);
        return MetaTaskManager.instance().onCreateMetaTaskOkCallBack(taskSetDefinition, onMetaTaskCreated);
    }

    private _handleDismissErrorMessage = (): void => {
        this._taskGroupDialogState.errorState = this._initializeErrorState();
        this._taskGroupDialogState.isInvalid = false;
        this._taskGroupDialogState.isCreateButtonDisabled = false;
        this.emitChanged();
    }

    private _initializeTaskGroupDialogState(): ITaskGroupDialogState {
        return (<ITaskGroupDialogState>{
            isShown: false,
            isInvalid: false,
            errorState: this._initializeErrorState(),
            isCreateButtonDisabled: true,
            creatingTaskGroup: false
        });
    }

    private _initializeErrorState(): IErrorState {
        return {
            errorMessage: Utils_String.empty,
            errorStatusCode: null
        };
    }

    private _resetTaskGroupDialogState(): void {
        this._taskGroupDialogState = this._initializeTaskGroupDialogState();
    }

    private _taskGroupDialogActions: Actions.TaskGroupDialogActions;
    private _taskGroupDialogState: ITaskGroupDialogState;
    private _taskGroupPropertiesStore: TaskGroupPropertiesStore;
    private _taskGroupParametersStore: TaskGroupParametersStore;
}