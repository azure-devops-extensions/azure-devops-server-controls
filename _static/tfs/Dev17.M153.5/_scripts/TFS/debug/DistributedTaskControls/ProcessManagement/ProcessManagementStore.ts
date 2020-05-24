import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import * as Store from "DistributedTaskControls/Common/Stores/Base";
import { ProcessManagementActions } from "DistributedTaskControls/ProcessManagement/ProcessManagementActions";
import { ProcessManagementUtils } from "DistributedTaskControls/ProcessManagement/ProcessManagementUtils";
import { ProcessManagementCapabilities } from "DistributedTaskControls/ProcessManagement/Types";

export interface IProcessManagementStoreArgs {
    processManagementCapabilities: ProcessManagementCapabilities;
}

export class ProcessManagementStore extends Store.StoreBase {

    constructor(args: IProcessManagementStoreArgs) {
        super();
        this._processManagementCapabilities = args.processManagementCapabilities;
    }

    public initialize(instanceId: string): void {
        this._processManagementActions = ActionsHubManager.GetActionsHub<ProcessManagementActions>(ProcessManagementActions, instanceId);
        this._processManagementActions.updateCapabilities.addListener(this._handleUpdateCapabilities);
    }

    public static getKey(): string {
        return StoreKeys.ProcessManagementStore;
    }

    public get processManagementCapabilities(): ProcessManagementCapabilities {
        return this._processManagementCapabilities;
    }

    public canEditProcess(): boolean {
        // rename env, link/unlink process parameters
        return ProcessManagementUtils.isCapabilitySupported(
            this._processManagementCapabilities, ProcessManagementCapabilities.EditProcess);
    }

    public canEditProcessInputs(): boolean {
        // modify values of process parameters
        return ProcessManagementUtils.isCapabilitySupported(
            this._processManagementCapabilities, ProcessManagementCapabilities.EditProcessInputs);
    }

    public canEditPhases(): boolean {
        // add, remove, reorder, rename of phases
        return ProcessManagementUtils.isCapabilitySupported(
            this._processManagementCapabilities, ProcessManagementCapabilities.EditPhases);
    }

    public canEditPhaseInputs(): boolean {
        // modify any phase related inputs (does not include name)
        return ProcessManagementUtils.isCapabilitySupported(
            this._processManagementCapabilities, ProcessManagementCapabilities.EditPhaseInputs);
    }

    public canEditTasks(): boolean {
        // add, remove, reorder, clone, version change of tasks
        return ProcessManagementUtils.isCapabilitySupported(
            this._processManagementCapabilities, ProcessManagementCapabilities.EditTasks);
    }

    public canEditTaskInputs(): boolean {
        // modify any task related input, control options (does not include link/unlink of process parameters)
        return ProcessManagementUtils.isCapabilitySupported(
            this._processManagementCapabilities, ProcessManagementCapabilities.EditTaskInputs);
    }

    public canEditTaskGroups(): boolean {
        // create task groups
        return ProcessManagementUtils.isCapabilitySupported(
            this._processManagementCapabilities, ProcessManagementCapabilities.EditTaskGroups);
    }

    protected disposeInternal(): void {
        this._processManagementActions.updateCapabilities.removeListener(this._handleUpdateCapabilities);
    }

    /**
     * @brief sets state of process management capabilities
     */
    private _handleUpdateCapabilities = (processManagementCapabilities: ProcessManagementCapabilities) => {
        this._processManagementCapabilities = processManagementCapabilities;
        this.emitChanged();
    }

    private _processManagementCapabilities: ProcessManagementCapabilities;
    private _processManagementActions: ProcessManagementActions;
}

