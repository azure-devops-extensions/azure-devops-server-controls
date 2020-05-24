import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DashboardGroupEntry } from "TFS/Dashboards/Contracts";

import { DefinitionsActionHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

export class DashboardsActionsHub extends ActionBase.ActionsHubBase {

	public static getKey(): string {
		return DefinitionsActionHubKeys.ActionHubKey_DashboardsActionsHub;
	}

	public initialize(): void {
		this._updateDashboardEntries = new ActionBase.Action<DashboardGroupEntry[]>();
		this._updateDashboardPermissions = new ActionBase.Action<IPermissionCollection>();
	}

	public get updateDashboardEntries(): ActionBase.Action<DashboardGroupEntry[]> {
		return this._updateDashboardEntries;
	}

	public get updateDashboardPermissions(): ActionBase.Action<IPermissionCollection> {
		return this._updateDashboardPermissions;
	}

	private _updateDashboardEntries: ActionBase.Action<DashboardGroupEntry[]>;
	private _updateDashboardPermissions: ActionBase.Action<IPermissionCollection>;
}