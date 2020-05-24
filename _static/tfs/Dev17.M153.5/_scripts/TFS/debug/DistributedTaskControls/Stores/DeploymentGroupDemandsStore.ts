import { DemandCondition, StoreKeys } from "DistributedTaskControls/Common/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { MachinesStore } from "DistributedTaskControls/Stores/MachinesStore";
import { TaskListStore } from "DistributedTaskControls/Stores/TaskListStore";

import { TaskAgent } from "TFS/DistributedTask/Contracts";
import { DeploymentMachine } from "TFS/DistributedTask/Contracts";

import * as Utils_String from "VSS/Utils/String";

export interface IMachineMissingDemandData {
    machineNameMissingDemand: string;
    machineIdMissingDemand: number;
}

export interface IDeploymentGroupDemandData {
    name: string;
    value: string;
    machinesMissingDemand: IMachineMissingDemandData[];
}

export interface IDeploymentGroupDemandsState {
    deploymentGroupDemands: IDeploymentGroupDemandData[];
}

export interface IDeploymentGroupDemandsStoreArgs {
    deploymentGroupDemandsData: IDeploymentGroupDemandData[];
}

export class DeploymentGroupDemandsStore extends StoreBase {

    /**
     * Passing DeploymentGroupDemandsData in case of edit release definition
     */
    constructor(args: IDeploymentGroupDemandsStoreArgs) {
        super();
        let deploymentGroupDemandsData = args.deploymentGroupDemandsData || [];
        this._currentDemands = <IDeploymentGroupDemandsState>{
            deploymentGroupDemands: JQueryWrapper.extendDeep([], deploymentGroupDemandsData)
        };

    }

    public static getKey(): string {
        return StoreKeys.DeploymentGroupDemandsStore;
    }

    public initialize(instanceId: string): void {
        this._taskListStore = StoreManager.GetStore<TaskListStore>(TaskListStore, instanceId);
        this._machinesStore = StoreManager.GetStore<MachinesStore>(MachinesStore, instanceId);

        this._machinesStore.addChangedListener(this._handleChange);
        this._taskListStore.addChangedListener(this._handleChange);

    }

    protected disposeInternal(): void {
        this._currentDemands = null;
        this._taskListStore.removeChangedListener(this._handleChange);
        this._machinesStore.removeChangedListener(this._handleChange);
    }

    public getState(): IDeploymentGroupDemandsState {
        return this._currentDemands;
    }

    private _getMachines = () => {
        let machines: DeploymentMachine[] = [];
        if (this._machinesStore.getState()) {
            machines = this._machinesStore.getState().deploymentMachines;
        }
        return machines;
    }

    protected _handleChange = () => {
        this._currentDemands.deploymentGroupDemands = DtcUtils.convertSerializedDemandToDeploymentGroupDemandData(this._taskListStore.getReadOnlyDemands());
        this._updateMachinesMissingDemands(this._currentDemands.deploymentGroupDemands, this._getMachines());
        this.emitChanged();
    }

    public isAnyDemandsNotMet(): boolean {
        let isDemandNotMet: boolean = false;
        if (this._currentDemands) {
            this._currentDemands.deploymentGroupDemands.forEach((deploymentGroupDemand: IDeploymentGroupDemandData) => {
                if (deploymentGroupDemand.machinesMissingDemand && deploymentGroupDemand.machinesMissingDemand.length > 0) {
                    isDemandNotMet = true;
                }
            });
        }

        return isDemandNotMet;
    }

    public getQueueId(): number {
        return this._machinesStore.getState() ? this._machinesStore.getState().deploymentGroupId : null;
    }

    private _updateMachinesMissingDemands(demands: IDeploymentGroupDemandData[], machines: DeploymentMachine[]): void {
        demands.forEach((demand: IDeploymentGroupDemandData) => {
            let machinesMissingDemand: IMachineMissingDemandData[] = [];
            machines.forEach((machine: DeploymentMachine) => {
                const agent: TaskAgent = machine.agent;
                if (agent) {
                    let agentCapabilitiesOriginal = agent.systemCapabilities;
                    let agentCapabilities = {};
                    for (let key in agentCapabilitiesOriginal) {
                        if (agentCapabilitiesOriginal.hasOwnProperty(key)) {
                            agentCapabilities[key.toLocaleLowerCase()] = agentCapabilitiesOriginal[key].toLocaleLowerCase();
                        }
                    }
                    if (this._isDemandMissing(demand, agentCapabilities.hasOwnProperty(demand.name.toLocaleLowerCase()) ? agentCapabilities[demand.name.toLocaleLowerCase()] : null)) {
                        machinesMissingDemand.push({
                            machineNameMissingDemand: agent.name,
                            machineIdMissingDemand: machine.id
                        });
                    }
                }
            });
            demand.machinesMissingDemand = machinesMissingDemand;
        });
    }

    private _isDemandMissing(demand: IDeploymentGroupDemandData, agentCapability: string): boolean {
        return (demand.value !== DemandCondition.Exists &&
            Utils_String.localeIgnoreCaseComparer(demand.value, agentCapability) !== 0) ||
            (demand.value === DemandCondition.Exists && !agentCapability);
    }

    private _currentDemands: IDeploymentGroupDemandsState;
    private _taskListStore: TaskListStore;
    private _machinesStore: MachinesStore;
}
