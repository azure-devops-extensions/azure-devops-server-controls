import { StoreKeys } from "DistributedTaskControls/Common/Common";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { VariableGroupActions, IStatus, Status } from "DistributedTaskControls/Variables/VariableGroup/Actions/VariableGroupActions";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { VariableGroup } from "TFS/DistributedTask/Contracts";

export interface ILinkVariableGroupPanelDataState {
    status: IStatus;
    variableGroups: VariableGroup[];
}

export class LinkVariableGroupPanelDataStore extends StoreBase {

    constructor() {
        super();
        this._state = { variableGroups: [], status: { status: Status.UnKnown } };
    }

    public initialize() {
        this._actionsHub = ActionsHubManager.GetActionsHub<VariableGroupActions>(VariableGroupActions);
        this._actionsHub.fetchLinkableVariableGroups.addListener(this._handleFetchLinkableVariableGroups);
        this._actionsHub.updateFetchLinkableVariableGroupStatus.addListener(this._handleupdateFetchLinkableVariableGroupStatus);
    }

    public static getKey(): string {
        return StoreKeys.LinkVariableGroupPanelDataStore;
    }

    public getState(): ILinkVariableGroupPanelDataState {
        return this._state;
    }

    protected disposeInternal(): void {
        this._actionsHub.fetchLinkableVariableGroups.removeListener(this._handleFetchLinkableVariableGroups);
        this._actionsHub.updateFetchLinkableVariableGroupStatus.removeListener(this._handleupdateFetchLinkableVariableGroupStatus);
    }

    private _handleFetchLinkableVariableGroups = (variableGroups: VariableGroup[]) => {
        this._state.variableGroups = variableGroups;
        this.emitChanged();
    }

    private _handleupdateFetchLinkableVariableGroupStatus = (status: IStatus): void => {
        this._state.status = status;
        this.emitChanged();
    }

    private _actionsHub: VariableGroupActions;
    private _state: ILinkVariableGroupPanelDataState;
}

