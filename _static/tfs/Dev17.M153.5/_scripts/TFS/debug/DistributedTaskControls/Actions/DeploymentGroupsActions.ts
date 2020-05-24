
import { Action } from "VSS/Flux/Action";

import { ActionsHubBase, IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ActionsKeys } from "DistributedTaskControls/Common/Common";

import { DeploymentGroup } from "TFS/DistributedTask/Contracts";

export interface IRefreshDeploymentGroupsPayload {
    permissibleDeploymentGroups: DeploymentGroup[];
    isFirstBatch: boolean;
}

export class DeploymentGroupsActions extends ActionsHubBase {

    public initialize(): void {
        this._updatePermissibleDeploymentGroups = new Action<DeploymentGroup[]>();
        this._updateNonPermissibleDeploymentGroups = new Action<DeploymentGroup[]>();
        this._manageDeploymentGroups = new Action<number>();
        this._refreshDeploymentGroups = new Action<IRefreshDeploymentGroupsPayload>();
        this._addDeploymentGroups = new Action<DeploymentGroup[]>();
    }

    public static getKey(): string {
        return ActionsKeys.DeploymentGroupsActions;
    }

    public get updatePermissibleDeploymentGroups(): Action<DeploymentGroup[]> {
        return this._updatePermissibleDeploymentGroups;
    }

    public get updateNonPermissibleDeploymentGroups(): Action<DeploymentGroup[]> {
        return this._updateNonPermissibleDeploymentGroups;
    }

    public get manageDeploymentGroups(): Action<number> {
        return this._manageDeploymentGroups;
    }

    public get refreshDeploymentGroups(): Action<IRefreshDeploymentGroupsPayload> {
        return this._refreshDeploymentGroups;
    }

    public get addDeploymentGroups(): Action<DeploymentGroup[]> {
        return this._addDeploymentGroups;
    }

    private _addDeploymentGroups: Action<DeploymentGroup[]>;
    private _refreshDeploymentGroups: Action<IRefreshDeploymentGroupsPayload>;
    private _updatePermissibleDeploymentGroups: Action<DeploymentGroup[]>;
    private _updateNonPermissibleDeploymentGroups: Action<DeploymentGroup[]>;
    private _manageDeploymentGroups: Action<number>;
}