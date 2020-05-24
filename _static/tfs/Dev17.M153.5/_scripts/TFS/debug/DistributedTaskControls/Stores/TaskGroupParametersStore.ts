import {
    TaskGroupParametersActions,
    IMetaTaskPayload,
    IStringInputValuePayload,
    IInputHelpMarkdownPayload,
    IEndpointOptionsPayload
} from "DistributedTaskControls/Actions/TaskGroupParametersActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { MetaTaskManager } from "DistributedTaskControls/Components/Task/MetaTaskManager";
import { TaskListStore } from "DistributedTaskControls/Stores/TaskListStore";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { InputControlType } from "DistributedTaskControls/SharedControls/InputControls/Common";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import { DataSourceBinding } from "TFS/ServiceEndpoint/Contracts";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";

export interface ITaskGroupParametersState {
    metaTaskData: IMetaTaskPayload;
}

export class TaskGroupParametersStore extends DataStoreBase {

    constructor() {
        super();
        this._originalState = this._initializeTaskGroupDialogState();
        this._currentState = this._initializeTaskGroupDialogState();
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._taskGroupParametersActions = ActionsHubManager.GetActionsHub<TaskGroupParametersActions>(TaskGroupParametersActions, instanceId);
        this._taskGroupParametersActions.SetMetaTaskInput.addListener(this._handleMetaTaskInput);
        this._taskGroupParametersActions.ChangeTaskGroupMetaInputValue.addListener(this._handleChangeTaskGroupMetaInputValue);
        this._taskGroupParametersActions.ChangeTaskGroupMetaInputHelpMarkDown.addListener(this._handleChangeTaskGroupMetaInputHelpMarkDown);
        this._taskGroupParametersActions.ChangeTaskGroupEndpointInputOptions.addListener(this._handleChangeTaskGroupEndpointInputOptions);

        if (!!instanceId) {
            try {
                this._taskListStore = StoreManager.GetStore<TaskListStore>(TaskListStore, instanceId);

                // We are avoiding updating the inputs here from the task list store, and depending only on the listener
                // The reason is that we want the saved state of the TG to be available to the customer
                // Only a change should trigger recompute
                this._taskListStore.addChangedListener(this._updateTaskGroupInputs);
            }
            catch (err) {
                Diag.logError(err);
            }
        }
    }

    protected disposeInternal(): void {
        this._taskGroupParametersActions.SetMetaTaskInput.removeListener(this._handleMetaTaskInput);
        this._taskGroupParametersActions.ChangeTaskGroupMetaInputValue.removeListener(this._handleChangeTaskGroupMetaInputValue);
        this._taskGroupParametersActions.ChangeTaskGroupMetaInputHelpMarkDown.removeListener(this._handleChangeTaskGroupMetaInputHelpMarkDown);
        this._taskGroupParametersActions.ChangeTaskGroupEndpointInputOptions.removeListener(this._handleChangeTaskGroupEndpointInputOptions);

        if (!!this._taskListStore) {
            this._taskListStore.removeChangedListener(this._updateTaskGroupInputs);
        }
    }

    public static getKey(): string {
        return StoreKeys.TaskGroupParametersStore;
    }

    public getState(): ITaskGroupParametersState {
        return this._currentState;
    }

    public isValid(): boolean {
        return true;
    }

    public isDirty(): boolean {
        if (this._originalState.metaTaskData.metaTaskInputs.length !== this._currentState.metaTaskData.metaTaskInputs.length) {
            return true;
        }

        let isDirty = false;
        Utils_Array.first(this._originalState.metaTaskData.metaTaskInputs, (input: DistributedTaskContracts.TaskInputDefinition) => {
            if (!(this._currentState.metaTaskData.metaTaskInputs.some((newInput: DistributedTaskContracts.TaskInputDefinition) => {
                return input.name === newInput.name
                    && input.type === newInput.type
                    && input.defaultValue === newInput.defaultValue
                    && input.helpMarkDown === newInput.helpMarkDown;
            }))) {
                isDirty = true;
                return true;
            }

            return false;
        });

        return isDirty;
    }

    public updateVisitor(taskGroup: DistributedTaskContracts.TaskGroup): void {
        taskGroup.inputs = this._currentState.metaTaskData.metaTaskInputs.map(input => { return { ...input }; });
        taskGroup.inputs.forEach(
            input => {
                // Clear options for connectedservice types, because these options do not belong to the task group
                // They are always fetched using the connected service
                if (input.type && DtcUtils.getTaskInputType(input) === InputControlType.INPUT_TYPE_CONNECTED_SERVICE) {
                    input.options = {};
                }
            });

        taskGroup.dataSourceBindings = this._currentState.metaTaskData.dataSourceBindings;
    }

    private _handleMetaTaskInput = (metaTaskData: IMetaTaskPayload): void => {
        const oldInputs = this._currentState.metaTaskData.metaTaskInputs;
        this._originalState = this._getStateFromMetaTaskPayload(metaTaskData);
        this._currentState = this._getStateFromMetaTaskPayload(metaTaskData);

        // Preserve options for connected service endpoints. Otherwise the fetched options will be overridden
        oldInputs.forEach(inp => {
            if (inp.type && DtcUtils.getTaskInputType(inp) === InputControlType.INPUT_TYPE_CONNECTED_SERVICE) {

                const currentMatch = this._currentState.metaTaskData.metaTaskInputs.find(inp1 => inp1.name === inp.name);
                if (currentMatch) {
                    currentMatch.options = inp.options;
                }
            }
        });

        this.emitChanged();
    }

    private _handleChangeTaskGroupMetaInputValue = (payload: IStringInputValuePayload): void => {
        if (this._indexToOptionsUpdatedMap[payload.index]) {
            // We have received onValueChanged after onOptionsChanged
            delete this._indexToOptionsUpdatedMap[payload.index];

            // The case we want to prevent will have value as empty, because the call takes place before the actual value is set
            // Don't return for non-empty values. They are legitimate
            if (!payload.value) {
                return;
            }
        }

        this._currentState.metaTaskData.metaTaskInputs[payload.index].defaultValue = payload.value;
        this.emitChanged();
    }

    private _handleChangeTaskGroupMetaInputHelpMarkDown = (payload: IInputHelpMarkdownPayload): void => {
        this._currentState.metaTaskData.metaTaskInputs[payload.index].helpMarkDown = payload.value;
        this.emitChanged();
    }

    private _handleChangeTaskGroupEndpointInputOptions = (payload: IEndpointOptionsPayload): void => {
        this._currentState.metaTaskData.metaTaskInputs[payload.index].options = payload.value;

        // Connected service endpoints fetch options and invoke onValueChanged. But the promise resolution takes place with 
        // value as empty. To prevent that for default values, we are keeping a track
        //
        // OnOptionsChanged is called before onValueChanged
        this._indexToOptionsUpdatedMap[payload.index] = true;
        this.emitChanged();
    }

    private _updateTaskGroupInputs = (): void => {
        if (!!this._taskListStore) {
            try {
                let { taskGroupInputs, dataSourceBindings }
                    = MetaTaskManager.instance().
                        getTaskGroupInputsAndDataSourceBindings(this._taskListStore.getTaskItemList());

                this._currentState.metaTaskData.metaTaskInputs = MetaTaskManager.instance().updateTaskGroupInputValues(taskGroupInputs, this._currentState.metaTaskData.metaTaskInputs);

                this._currentState.metaTaskData.dataSourceBindings = dataSourceBindings;

                this.emitChanged();
            }
            catch (err) {
                Diag.logError(err);
            }
        }
    }

    private _getStateFromMetaTaskPayload(metaTaskData: IMetaTaskPayload): ITaskGroupParametersState {
        const clonedDataSourceBindings = metaTaskData.dataSourceBindings.map((dsb) => JQueryWrapper.extendDeep({}, dsb) as DataSourceBinding);

        const clonedGroups = metaTaskData.groups.map((group) => JQueryWrapper.extendDeep({}, group) as DistributedTaskContracts.TaskGroupDefinition);

        const clonedMetaTaskInputs = metaTaskData.metaTaskInputs.map((input) => JQueryWrapper.extendDeep({}, input as DistributedTaskContracts.TaskInputDefinition))
            .sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));

        const clonedTasks = metaTaskData.tasks.map((task) => JQueryWrapper.extendDeep({}, task as DistributedTaskContracts.TaskGroupStep));

        return {
            metaTaskData: {
                dataSourceBindings: clonedDataSourceBindings,
                groups: clonedGroups,
                metaTaskInputs: clonedMetaTaskInputs,
                runsOns: metaTaskData.runsOns,
                tasks: clonedTasks
            } as IMetaTaskPayload
        };
    }

    private _initializeTaskGroupDialogState(): ITaskGroupParametersState {
        return {
            metaTaskData: {
                metaTaskInputs: [],
                dataSourceBindings: []
            } as IMetaTaskPayload,
        };
    }

    private _originalState: ITaskGroupParametersState;
    private _currentState: ITaskGroupParametersState;
    private _taskGroupParametersActions: TaskGroupParametersActions;
    private _taskListStore: TaskListStore;
    private _indexToOptionsUpdatedMap: IDictionaryNumberTo<boolean> = {};
}