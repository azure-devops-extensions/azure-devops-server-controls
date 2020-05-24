
import { Action } from "VSS/Flux/Action";

import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { IMachines } from "DistributedTaskControls/Stores/MachinesStore";

export class MachinesActions extends ActionsHubBase {

    public initialize(): void {
        this._updateMachines = new Action<IMachines>();
        this._changeMachineGroup = new Action<number>();
        this._updateTags = new Action<string[]>();
        this._clearCache = new Action<IEmptyActionPayload>();
    }

    public static getKey(): string {
        return ActionsKeys.MachinesActions;
    }

    /**
    *@brief to update machines first calling to server and then populating in machinesstore
    */
	public get updateMachines(): Action<IMachines> {
        return this._updateMachines;
	}

    /**
    *@brief to change machines without calling to server
    */
	public get changeMachineGroup(): Action<number> {
        return this._changeMachineGroup;
    }

    public get updateTags(): Action<string[]> {
        return this._updateTags;
    }

    public get clearCache(): Action<IEmptyActionPayload> {
        return this._clearCache;
    }

    private _updateMachines: Action<IMachines>;
    private _changeMachineGroup: Action<number>;
    private _updateTags: Action<string[]>;
    private _clearCache: Action<IEmptyActionPayload>;
}