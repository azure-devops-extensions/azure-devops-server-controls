
import { ActionCreatorBase } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";
import * as DistributedTaskContract from "TFS/DistributedTask/Contracts";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { MachinesActions } from "DistributedTaskControls/Actions/MachinesActions";

export class MachinesActionsCreator extends ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.MachinesActionsCreator;
    }

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<MachinesActions>(MachinesActions, instanceId); 
	}

    public updateMachines(deploymentGroupId: number): void {
        AgentsSource.instance().getTargets(deploymentGroupId, null, true).then((deploymentMachines: DistributedTaskContract.DeploymentMachine[]) => {
			this._actions.updateMachines.invoke({ deploymentGroupId: deploymentGroupId, deploymentMachines: deploymentMachines });
        }, (error) => {
                this._actions.changeMachineGroup.invoke(null);
            });
    }

	public changeMachines(machinesGroupId: number) {
		this._actions.changeMachineGroup.invoke(machinesGroupId);
    }

    public updateTags(newValue: string[]) {
        this._actions.updateTags.invoke(newValue);
    }

    public clearCache() {
        this._actions.clearCache.invoke(null);
    }

    private _actions: MachinesActions;
}