// Copyright (c) Microsoft Corporation.  All rights reserved.

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ViewStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { DeployEnvironmentStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentStore";
import { DeployPhaseListStore } from "DistributedTaskControls/Phase/Stores/DeployPhaseListStore";
import { EnvironmentAutoRedeployTriggerStore, IAutoRedeployTriggerState } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentAutoRedeployTriggerStore";
import { DeployPhaseTypes } from "ReleaseManagement/Core/Contracts";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";

export interface IEnvironmentAutoRedeployTriggerViewSate extends IStoreState, IAutoRedeployTriggerState {
    isVisible: boolean;
}

/**
 * View Store for EnvironmentAutoRedeployTrigger
 */
export class EnvironmentAutoRedeployTriggerViewStore extends ViewStoreBase {

    constructor() {
        super();
        this._isEnvironmentRedeployTriggerEnabled = FeatureFlagUtils.isRedeployTriggerEnabled() || FeatureFlagUtils.isRollbackTriggerEnabled();
        this._state.isVisible = this._isEnvironmentRedeployTriggerEnabled;
    }

    /**
     * Initializes view store change listener for - phase list store and data store
     */
    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._deployPhaseListStore = StoreManager.GetStore(DeployPhaseListStore, instanceId);
        this._environmentAutoRedeployTriggerStore = StoreManager.GetStore(EnvironmentAutoRedeployTriggerStore, instanceId);
        this._deployPhaseListStore.addChangedListener(this._onDataStoreChanged);
        this._environmentAutoRedeployTriggerStore.addChangedListener(this._onDataStoreChanged);
        this._onDataStoreChanged();
    }

    public disposeInternal(): void {
        this._deployPhaseListStore.removeChangedListener(this._onDataStoreChanged);
        this._environmentAutoRedeployTriggerStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IEnvironmentAutoRedeployTriggerViewSate {
        return this._state;
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineAutoRedeployTriggerViewStoreKey;
    }

    public isDirty(): boolean {
        return this._environmentAutoRedeployTriggerStore.isDirty();
    }

    public isValid(): boolean {
        return this._environmentAutoRedeployTriggerStore.isValid();
    }

    public isAnyDgPhaseWithEnvironment(): boolean {
        return this._environmentAutoRedeployTriggerStore.isAnyDgPhaseWithEnvironment();
    }

    private _onDataStoreChanged = (): void => {
        this._state.isVisible = (this._isEnvironmentRedeployTriggerEnabled && this._environmentAutoRedeployTriggerStore.isAnyDgPhaseWithEnvironment())
            || (FeatureFlagUtils.isRollbackTriggerEnabled());

        if (this._state.isVisible)
        {
            let dataStoreState = this._environmentAutoRedeployTriggerStore.getState();

            this._state.isEnabled = dataStoreState.isEnabled;
            this._state.triggerContent = dataStoreState.triggerContent;
        }
        this.emitChanged();
    }

    private _isEnvironmentRedeployTriggerEnabled: boolean = false;
    private _state: IEnvironmentAutoRedeployTriggerViewSate = {} as IEnvironmentAutoRedeployTriggerViewSate;    
    private _deployPhaseListStore: DeployPhaseListStore;
    private _environmentAutoRedeployTriggerStore: EnvironmentAutoRedeployTriggerStore;
}