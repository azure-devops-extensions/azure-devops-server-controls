import { empty as emptyString } from "VSS/Utils/String";

import { IStoreState, StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import {
    IErrorMessagePayload,
    TabActionsHub
} from "TaskGroup/Scripts/TaskGroupEditor/TabContentContainer/TabActionsHub";
import { StoreKeys } from "TaskGroup/Scripts/TaskGroupEditor/Constants";

export interface ITabStoreState extends IStoreState {
    errorMessage: string;
}

export class TabStore extends StoreBase {

    public static getKey(): string {
        return StoreKeys.TaskGroupTabStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._state = {
            errorMessage: emptyString
        };

        this._tabActionsHub = ActionsHubManager.GetActionsHub<TabActionsHub>(TabActionsHub, instanceId);
        this._tabActionsHub.updateErrorMessage.addListener(this._onUpdateErrorMessage);
    }

    public disposeInternal(): void {
        this._tabActionsHub.updateErrorMessage.removeListener(this._onUpdateErrorMessage);
    }

    public getState(): ITabStoreState {
        return this._state;
    }

    private _onUpdateErrorMessage = (payload: IErrorMessagePayload) => {
        this._state.errorMessage = payload.errorMessage;
        this.emitChanged();
    }

    private _state: ITabStoreState;
    private _tabActionsHub: TabActionsHub;
}