import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { ReleaseProgressStoreKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseEnvironmentListActionsHub } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironmentList/ReleaseEnvironmentListActionsHub";
import { ReleaseEnvironmentListStore } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironmentList/ReleaseEnvironmentListStore";
import { ReleaseEnvironmentPropertiesContributionsStore } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesContributionsStore";
import { EnvironmentsCanvasViewStore } from "PipelineWorkflow/Scripts/SharedComponents/EnvironmentsCanvas/EnvironmentsCanvasViewStore";

import * as ReleaseContracts from "ReleaseManagement/Core/Contracts";

export class ReleaseEnvironmentsCanvasViewStore extends EnvironmentsCanvasViewStore<ReleaseContracts.ReleaseEnvironment> {

    public static getKey(): string {
        return ReleaseProgressStoreKeys.ReleaseEnvironmentsCanvas;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._releaseEnvironmentsListActions = ActionsHubManager.GetActionsHub(ReleaseEnvironmentListActionsHub);
        this._releaseEnvironmentPropertiesContributionsStore = StoreManager.GetStore<ReleaseEnvironmentPropertiesContributionsStore>(ReleaseEnvironmentPropertiesContributionsStore);
        
        this._releaseEnvironmentsListActions.mergeEnvironments.addListener(this._handleMergeEnvironments);
        this._releaseEnvironmentPropertiesContributionsStore.addChangedListener(this._handleContributionStoreUpdated);
    }

    public getVisibleContributions(environmentInstanceId: string): number {
        return this._visibleContributions[environmentInstanceId] ? this._visibleContributions[environmentInstanceId] : 0;
    }

    protected _getEnvironmentListStore(): ReleaseEnvironmentListStore {
        return StoreManager.GetStore<ReleaseEnvironmentListStore>(ReleaseEnvironmentListStore);
    }

    protected disposeInternal(): void {
        this._releaseEnvironmentsListActions.mergeEnvironments.removeListener(this._handleMergeEnvironments);
        this._releaseEnvironmentPropertiesContributionsStore.removeChangedListener(this._handleContributionStoreUpdated);        
        super.disposeInternal();
    }

    protected _onEnvironmentListStoreChanged = (): void => {
        // environment name/rank and connections cannot be changed in release view
        if (!this._isInitialized()) {
            this._updateState();
        }
    }

    private _handleMergeEnvironments = () => {
        this._updateState();
    }

    private _handleContributionStoreUpdated = (): void => {
        this._visibleContributions = this._releaseEnvironmentPropertiesContributionsStore.getVisibleContributions();
        this.emitChanged();
    }

    private _releaseEnvironmentsListActions: ReleaseEnvironmentListActionsHub;
    private _visibleContributions: IDictionaryStringTo<number> = {};
    private _releaseEnvironmentPropertiesContributionsStore: ReleaseEnvironmentPropertiesContributionsStore;
}