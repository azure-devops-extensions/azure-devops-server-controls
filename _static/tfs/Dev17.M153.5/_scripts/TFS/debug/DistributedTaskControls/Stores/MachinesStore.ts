
import { MachinesActions } from "DistributedTaskControls/Actions/MachinesActions";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { DeploymentMachine } from "TFS/DistributedTask/Contracts";


export interface IMachines {
    deploymentMachines: DeploymentMachine[];
	deploymentGroupId: number; 
}

export class MachinesStore extends StoreCommonBase.StoreBase {

    constructor(tags?: string[]) {
        super();
        this._deploymentIdMachinesMap = {};
        this._tags = tags || [];
    }

    public static getKey(): string {
        return StoreKeys.MachinesStore;
    }

    public initialize(instanceId: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<MachinesActions>(MachinesActions, instanceId);
        this._actionsHub.updateMachines.addListener(this._handleUpdateMachines);
        this._actionsHub.changeMachineGroup.addListener(this._handleChangedMachineGroup);
        this._actionsHub.updateTags.addListener(this._handleUpdateTags);
        this._actionsHub.clearCache.addListener(this._handleClearCache);
	}

    protected disposeInternal(): void {
		this._actionsHub.updateMachines.removeListener(this._handleUpdateMachines);
        this._actionsHub.changeMachineGroup.removeListener(this._handleChangedMachineGroup);
        this._actionsHub.updateTags.removeListener(this._handleUpdateTags);
        this._actionsHub.clearCache.removeListener(this._handleClearCache);
    }

    public getState(): IMachines {
        return this._currentSelectedMachines;
	}

	private _handleUpdateMachines = (updateMachines: IMachines) => {
        this._updateMapAndCurrentMachines(updateMachines);
        this._updateTags();
        this.emitChanged();
	}

    public getMachinesByGroupId(deploymentGroupId?: number): DeploymentMachine[] {
        let machines: DeploymentMachine[] = [];
        if (deploymentGroupId && this.isMachinesOfDeploymentGroupExistInCache(deploymentGroupId)) {
            machines = this._deploymentIdMachinesMap[deploymentGroupId];
        }

        return machines;
    }

    public isMachinesOfDeploymentGroupExistInCache(deploymentGroupId: number): boolean {
        if (this._deploymentIdMachinesMap && this._deploymentIdMachinesMap.hasOwnProperty(deploymentGroupId)) {
            return true;
        }
        else {
            return false;
        }
    }

    private _handleUpdateTags = (tags: string[]) => {
        this._tags = tags;
        this._updateTags();
        this.emitChanged();
    }

    public getAllTags(deploymentGroupId: number): string[] {
        let machines = this.getMachinesByGroupId(deploymentGroupId);
        let tagsResult: string[] = [];
        const length = machines.length;
        for (let i = 0; i < length; i++) {
            const tags = machines[i].tags;
            if (tags) {
                tagsResult.push(...tags);
            }
        }

        return tagsResult;
    }

    private _updateTags() {
        if (!this._currentSelectedMachines) {
            return;
        }
        let machines = this.getMachinesByGroupId(this._currentSelectedMachines.deploymentGroupId);
        let filterMachines: IMachines = { deploymentGroupId: this._currentSelectedMachines.deploymentGroupId, deploymentMachines: [] };
        const machinesLength = machines.length;
        for (let i = 0; i < machinesLength; i++) {
            if (DtcUtils.isQualifiedMachine(machines[i].tags, this._tags)) {
                filterMachines.deploymentMachines.push(machines[i]);
            }
        }
        this._currentSelectedMachines = filterMachines;
    }

    private _handleChangedMachineGroup = (deploymentGroupId?: number) => {
        this._currentSelectedMachines = {
            deploymentMachines: this.getMachinesByGroupId(deploymentGroupId),
            deploymentGroupId: deploymentGroupId
        };
        this._updateTags();
        this.emitChanged();
	}

	private _updateMapAndCurrentMachines = (machines: IMachines) => {
		if (machines) {
			this._deploymentIdMachinesMap[machines.deploymentGroupId] = machines.deploymentMachines;
			this._currentSelectedMachines = machines;
		}
    }

    private _handleClearCache = () => {
        this._deploymentIdMachinesMap = {};
        this.emitChanged();
    }

    private _actionsHub: MachinesActions;
    private _currentSelectedMachines: IMachines;
    private _deploymentIdMachinesMap: { [DeploymentGroupId: number]: DeploymentMachine[] };
    private _tags: string[];

}