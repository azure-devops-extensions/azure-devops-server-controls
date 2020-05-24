// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ViewStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { PipelineEnvironmentExecutionPolicy } from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { QueueSettingsStore, ParallelDeploymentOptions, IQueueSettingsState, DeployOptions } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsStore";

export interface IQueueSettingsViewState extends IStoreState {
    parallelDeploymentType: string;
    parallelDeploymentCount: string;
    showDeployOptions: boolean;
    deployOption?: string;
    showSettingsChangedWarning?: boolean;
}

/**
 * Store to contain state associated with environment queue settings
 */
export class QueueSettingsViewStore extends ViewStoreBase {

    constructor() {
        super();
        this._state = {
            parallelDeploymentCount: "0",
            parallelDeploymentType: ParallelDeploymentOptions.UnlimitedDeployment,
            showDeployOptions: false
        };
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentQueueSettingsViewStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._dataStore = StoreManager.GetStore<QueueSettingsStore>(QueueSettingsStore, instanceId);
        this._dataStore.addChangedListener(this._onDataStoreChanged);
        this._onDataStoreChanged();
    }

    public disposeInternal(): void {
        this._dataStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IQueueSettingsViewState {
        return this._state;
    }

    public isValid(): boolean {
        return this._dataStore.isValid();
    }

    /**
     * Method to react when data store changes
     */
    protected _onDataStoreChanged = (): void => {
        let queueSettingState: IQueueSettingsState = this._dataStore.getState();
        let executionPolicy: PipelineEnvironmentExecutionPolicy = queueSettingState.executionPolicy;
        this._setParallelDeploymentTypeAndCount(queueSettingState.parallelDeploymentCount, queueSettingState.parallelDeploymentType);
        this._setDeployOptionsVisibility();
        this._setDeployOption(executionPolicy);
        this._state.showSettingsChangedWarning = this._dataStore.isDirty();

        this.emitChanged();
    }

    private _setParallelDeploymentTypeAndCount(concurrencyCount: string, parallelDeploymentType: string): void {
        this._state.parallelDeploymentType = parallelDeploymentType;
        this._state.parallelDeploymentCount = concurrencyCount;
    }

    private _setDeployOptionsVisibility(): void {
        if (this._state.parallelDeploymentType === ParallelDeploymentOptions.UnlimitedDeployment) {
            this._state.showDeployOptions = false;
        } else {
            this._state.showDeployOptions = true;
        }
    }

    private _setDeployOption(executionPolicy: PipelineEnvironmentExecutionPolicy) {
        this._state.deployOption = null;
        if (this._state.parallelDeploymentType === ParallelDeploymentOptions.DefiniteParallelDeployments) {
            if (executionPolicy.queueDepthCount > 0) {
                this._state.deployOption = DeployOptions.DeployOnLatest;
            } else {
                this._state.deployOption = DeployOptions.DeployInSequence;
            }
        }
    }

    private _state: IQueueSettingsViewState;
    private _dataStore: QueueSettingsStore;
}