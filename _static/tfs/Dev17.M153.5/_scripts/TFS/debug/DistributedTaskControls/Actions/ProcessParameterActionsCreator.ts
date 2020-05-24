import { ITask } from "DistributedTasksCommon/TFS.Tasks.Types";
import { TaskActionsCreatorBase } from "DistributedTaskControls/Components/Task/TaskActionsCreatorBase";
import { ProcessParameterActions } from "DistributedTaskControls/Actions/ProcessParameterActions";
import {
    IInputControllerActions,
    ITaskInputError,
    ITaskInputValue,
    ICreateProcessParameterPayload,
    IUpdateReferencePayload
} from "DistributedTaskControls/Common/Types";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ProcessParameters } from "TFS/DistributedTaskCommon/Contracts";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { IDeployPhase } from "DistributedTaskControls/Phase/Types";
import { ProcessParameterStore } from "DistributedTaskControls/Stores/ProcessParameterStore";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import * as Utils_String from "VSS/Utils/String";

export class ProcessParameterActionsCreator extends TaskActionsCreatorBase implements IInputControllerActions {

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<ProcessParameterActions>(ProcessParameterActions, instanceId);
        this._instanceId = instanceId;
    }

    public createProcessParameter(parameter: ICreateProcessParameterPayload) {
        this._actions.createProcessParameter.invoke(parameter);
    }

    public removeAllProcessParameters(): void {
        this._actions.removeAllProcessParameters.invoke(null);
    }

    public updateTaskInputError(name: string, errorMessage: string, value: string): void {
        this._actions.updateInputError.invoke({ name: name, message: errorMessage, value: value } as ITaskInputError);
    }

    public updateTaskInputValue(name: string, value: string): void {
        this._actions.updateInput.invoke({ name: name, value: value } as ITaskInputValue);

        if (!this._processParameterStore) {
            this._processParameterStore =
                StoreManager.GetStore<ProcessParameterStore>(ProcessParameterStore, this._instanceId);
        }

        // Reset all dependent input values and options if parent is changed.
        let dependencyToTargetMap = this._processParameterStore.getDependencyToTargetsMap();
        if (dependencyToTargetMap && dependencyToTargetMap.hasOwnProperty(name)) {
            dependencyToTargetMap[name].forEach((target: string) => {
                let state = this._processParameterStore.getTaskInputState(target);
                if (state && state.inputValue) {
                    this._actions.updateInput.invoke({ name: target, value: Utils_String.empty } as ITaskInputValue);
                    this._actions.updateInputOptions.invoke({ name: target, options: null });
                }
            });
        }
    }

    public updateTaskInputOptions(name: string, options: IDictionaryStringTo<string>) {
        this._actions.updateInputOptions.invoke({ name: name, options: options });
    }

    public unlinkProcessParameter(name: string): void {
        this._actions.unlinkProcessParameter.invoke({
            name: name
        });
    }

    public initializeProcessParameters(processParams: ProcessParameters, phaseList: IDeployPhase[], forceUpdate?: boolean): void {
        this._actions.initializeProcessParameters.invoke({
            processParameters: processParams,
            phaseList: phaseList,
            forceUpdate: forceUpdate
        });
    }

    public updateReferenceCount(payload: IUpdateReferencePayload): void {
        this._actions.updateReferenceCount.invoke(payload);
    }

    public static getKey(): string {
        return ActionCreatorKeys.ProcessParameterActionsCreator;
    }

    private _actions: ProcessParameterActions;
    private _processParameterStore: ProcessParameterStore;
    private _instanceId: string;
}