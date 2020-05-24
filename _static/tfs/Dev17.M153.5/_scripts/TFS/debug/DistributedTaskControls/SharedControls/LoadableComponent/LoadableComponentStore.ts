
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreKeys } from "DistributedTaskControls/Common/Common";
import * as Store from "DistributedTaskControls/Common/Stores/Base";
import { LoadableComponentActionsHub } from "DistributedTaskControls/SharedControls/LoadableComponent/LoadableComponentActionsHub";

export interface ILoadableComponentState {
    isLoading: boolean;
}

export class LoadableComponentStore extends Store.StoreBase {

    constructor() {
        super();
        this._state = {
            isLoading: true
        } as ILoadableComponentState;
    }

    public static getKey(): string {
        return StoreKeys.LoadableComponentStore;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._loadableComponentActionsHub = ActionsHubManager.GetActionsHub<LoadableComponentActionsHub>(LoadableComponentActionsHub, instanceId);
        this._loadableComponentActionsHub.showLoadingExperience.addListener(this._handleShowLoadingExperience);
        this._loadableComponentActionsHub.hideLoadingExperience.addListener(this._handleHideLoadingExperience);
    }

    public getState(): ILoadableComponentState {
        return this._state;
    }

    protected disposeInternal(): void {
        this._loadableComponentActionsHub.showLoadingExperience.removeListener(this._handleShowLoadingExperience);
        this._loadableComponentActionsHub.hideLoadingExperience.removeListener(this._handleHideLoadingExperience);
    }

    private _handleShowLoadingExperience = (): void => {
        this._state.isLoading = true;
        this.emitChanged();
    }

    private _handleHideLoadingExperience = (): void => {
        this._state.isLoading = false;
        this.emitChanged();
    }

    private _state: ILoadableComponentState;
    private _loadableComponentActionsHub: LoadableComponentActionsHub;
}