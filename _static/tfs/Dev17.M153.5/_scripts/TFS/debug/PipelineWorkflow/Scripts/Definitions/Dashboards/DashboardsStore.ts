import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { CommonConstants } from "PipelineWorkflow/Scripts/Common/Constants";
import { IDashboardEntry } from "PipelineWorkflow/Scripts/Definitions/AllDefinitionsContent";
import { DefinitionsStoreKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { DashboardsActionsHub } from "PipelineWorkflow/Scripts/Definitions/Dashboards/DashboardsActions";
import { PermissionHelper, IPermissionCollection } from "PipelineWorkflow/Scripts/SharedComponents/Security/PermissionHelper";

import { DashboardGroupEntry, TeamDashboardPermission } from "TFS/Dashboards/Contracts";

import * as Utils_String from "VSS/Utils/String";

export class DashboardsStore extends StoreBase {

    constructor() {
        super();
    }

    public static getKey(): string {
        return DefinitionsStoreKeys.StoreKey_DashboardsStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
		this._dashboardActions = ActionsHubManager.GetActionsHub<DashboardsActionsHub>(DashboardsActionsHub, instanceId);

		this._dashboardActions.updateDashboardEntries.addListener(this._setDashboardEntries);
		this._dashboardActions.updateDashboardPermissions.addListener(this._updateDashboardPermissions);
    }

    public disposeInternal(): void {
		this._dashboardActions.updateDashboardEntries.removeListener(this._setDashboardEntries);
		this._dashboardActions.updateDashboardPermissions.removeListener(this._updateDashboardPermissions);
    }

	public getDashboardEntries(): IDashboardEntry[] {
		return this._dashboardEntries;
    }

	private _setDashboardEntries = (dashboardEntries: DashboardGroupEntry[]): void => {
		if (this._dashboardEntries && this._dashboardEntries.length > 0) {
			this._dashboardEntries.length = 0;
		}
		this._dashboardEntries = dashboardEntries;
	}

	private _updateDashboardPermissions = (permissionCollection: IPermissionCollection): void => {
		if (!this._dashboardEntries || this._dashboardEntries.length === 0) {
			return;
		}

		this._dashboardEntries.forEach(dashboard => {
			const token = PermissionHelper.createDashBoardToken(dashboard);
			const key = PermissionHelper.getPermissionCollectionKey(CommonConstants.SecurityNameSpaceIdForDashboards, token);

			dashboard.canEdit = permissionCollection[key] && permissionCollection[key][TeamDashboardPermission.Edit] !== undefined
				? permissionCollection[key][TeamDashboardPermission.Edit]
				: true;
		});

		this.emitChanged();
	}

	private _dashboardEntries: IDashboardEntry[];
	private _dashboardActions: DashboardsActionsHub;
}