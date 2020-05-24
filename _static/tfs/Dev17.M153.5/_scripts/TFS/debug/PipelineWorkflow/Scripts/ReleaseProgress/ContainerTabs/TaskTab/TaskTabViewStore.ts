import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseEnvironmentListStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironmentList/ReleaseEnvironmentListStore";

export interface ITaskTabViewState {
    canShowTasks: boolean;
}

export class TaskTabViewStore extends ViewStoreBase {
     
    public static getKey(): string {
        return ReleaseProgressStoreKeys.TaskTabViewStore;
    }

    public getState(): ITaskTabViewState {
        return this._viewState;
    }

    protected disposeInternal(): void {
        this._releaseEnvironmentListStore.removeChangedListener(this._handleStoreChanged);
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._releaseEnvironmentListStore = StoreManager.GetStore<ReleaseEnvironmentListStore>(ReleaseEnvironmentListStore, instanceId);
        this._releaseEnvironmentListStore.addChangedListener(this._handleStoreChanged);
        this._handleStoreChanged();
    }

    private _handleStoreChanged = () => {
        const canShowTasks = this._releaseEnvironmentListStore.areTaskDefinitionsInitialized();
        if (canShowTasks !== this._viewState.canShowTasks) {
            this._viewState.canShowTasks = canShowTasks;
            this.emitChanged();
        }
    }

    private _releaseEnvironmentListStore: ReleaseEnvironmentListStore;
    private _viewState: ITaskTabViewState = { canShowTasks: false};
}