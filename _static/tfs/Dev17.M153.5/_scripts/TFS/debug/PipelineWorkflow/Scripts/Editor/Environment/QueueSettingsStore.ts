// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { InputState, MaxPositiveNumber } from "DistributedTaskControls/Common/Common";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DataStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { PipelineDefinitionEnvironment, PipelineEnvironmentExecutionPolicy } from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { IUpdateQueueSettingPayload, QueueSettingsActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/QueueSettingsActionsHub";

export namespace ParallelDeploymentOptions {
    export const UnlimitedDeployment: string = "unlimited";
    export const DefiniteParallelDeployments: string = "definite";
}

export namespace DeployOptions {
    export const DeployInSequence: string = "sequence";
    export const DeployOnLatest: string = "latest";
}

export interface IQueueSettingsState extends IStoreState {
    executionPolicy: PipelineEnvironmentExecutionPolicy;
    parallelDeploymentType: string;
    parallelDeploymentCount: string;
}

export interface IQueueSettingsStoreArgs {
    executionPolicy: PipelineEnvironmentExecutionPolicy;
}

/**
 * Store to contain queue settings associated with environment
 */
export class QueueSettingsStore extends DataStoreBase {

    constructor(args: IQueueSettingsStoreArgs) {
        super();
        this._currentState = this._getInitialState(args.executionPolicy);
        this._originalState = this._getInitialState(args.executionPolicy);
    }

    /**
     * Returns store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentQueueSettingsStoreKey;
    }

    /**
     * Initializes actions listeners for Environment queue settings
     */
    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._actions = ActionsHubManager.GetActionsHub<QueueSettingsActionsHub>(QueueSettingsActionsHub, instanceId);
        this._actions.updateParallelDeploymentType.addListener(this._handleUpdateParallelDeploymentType);
        this._actions.updateDeployOptions.addListener(this._handleUpdateDeployOption);
        this._actions.updateParallelDeploymentCount.addListener(this._handleUpdateConcurrencyCount);
        this._actions.updateQueueSettings.addListener(this._handleUpdateQueueSettings);
    }

    protected disposeInternal(): void {
        this._actions.updateParallelDeploymentType.removeListener(this._handleUpdateParallelDeploymentType);
        this._actions.updateDeployOptions.removeListener(this._handleUpdateDeployOption);
        this._actions.updateParallelDeploymentCount.removeListener(this._handleUpdateConcurrencyCount);
        this._actions.updateQueueSettings.removeListener(this._handleUpdateQueueSettings);
    }

    public updateVisitor(environment: PipelineDefinitionEnvironment): void {
        if (!!environment && this.isValid()) {
            environment.executionPolicy = JQueryWrapper.extendDeep({}, null);
            if (this._currentState.parallelDeploymentType === ParallelDeploymentOptions.UnlimitedDeployment) {
                environment.executionPolicy.queueDepthCount = QueueSettingsStore._defaultQueueDepthCount;
                environment.executionPolicy.concurrencyCount = QueueSettingsStore._unlimitedConcurrencyCount;
            } else {
                environment.executionPolicy.concurrencyCount = DtcUtils.getInteger(this._currentState.parallelDeploymentCount);
                environment.executionPolicy.queueDepthCount = this._currentState.executionPolicy.queueDepthCount;
            }
        }
    }

    /**
     * Method to check if queue settings store is dirty
     */
    public isDirty(): boolean {
        return (this._currentState.parallelDeploymentType !== this._originalState.parallelDeploymentType ||
            this._isParallelOptionsDirty());
    }

    /**
     * Method to check validity of store.
     */
    public isValid(): boolean {
        return QueueSettingsStore.isParallelDeploymentCountValid(this._currentState.parallelDeploymentType, this._currentState.parallelDeploymentCount);
    }

    /**
     * Method to check if parallelDeploymentCount is valid
     */
    public static isParallelDeploymentCountValid(parallelDeploymentType: string, parallelDeploymentCount: string) {
        if (parallelDeploymentType === ParallelDeploymentOptions.UnlimitedDeployment) {
            return true;
        } else {
            let inputState: InputState = DtcUtils.isValidNonNegativeIntegerInRange(parallelDeploymentCount, 1, MaxPositiveNumber);
            return inputState === InputState.Valid;
        }
    }

    /**
     * Method to get current state
     */
    public getState(): IQueueSettingsState {
        return this._currentState;
    }

    private _isParallelOptionsDirty(): boolean {
        if (this._currentState.parallelDeploymentType === ParallelDeploymentOptions.UnlimitedDeployment) {
            return false;
        } else {
            return !(DtcUtils.areIntegersEqual(this._currentState.parallelDeploymentCount, this._originalState.parallelDeploymentCount) &&
                this._currentState.executionPolicy.queueDepthCount === this._originalState.executionPolicy.queueDepthCount);
        }
    }

    private _handleUpdateParallelDeploymentType = (parallelDeploymentType: string): void => {
        this._currentState.parallelDeploymentType = parallelDeploymentType;
        if (parallelDeploymentType === ParallelDeploymentOptions.DefiniteParallelDeployments &&
            this._currentState.parallelDeploymentCount === QueueSettingsStore._unlimitedConcurrencyCount.toString()) {
            this._currentState.parallelDeploymentCount = QueueSettingsStore._definiteConcurrencyCount.toString();
        }
        this.emitChanged();
    }

    private _handleUpdateConcurrencyCount = (count: string): void => {
        this._currentState.parallelDeploymentCount = count;
        this.emitChanged();
    }

    private _handleUpdateDeployOption = (deployOption: string): void => {
        if (deployOption === DeployOptions.DeployInSequence) {
            this._setQueueDepthCount(QueueSettingsStore._defaultQueueDepthCount);
        } else {
            this._setQueueDepthCount(1);
        }

        this.emitChanged();
    }

    private _handleUpdateQueueSettings = (updateQueueSettingPayload: IUpdateQueueSettingPayload): void => {
        this._currentState = this._getInitialState(updateQueueSettingPayload.executionPolicy);
        this._originalState = this._getInitialState(updateQueueSettingPayload.executionPolicy);
    }

    private _setQueueDepthCount(queueDepthCount: number): void {
        if (this._currentState.executionPolicy) {
            this._currentState.executionPolicy.queueDepthCount = queueDepthCount;
        }
    }

    private _getUnlimitedDeploymentsExecutionPolicy(): PipelineEnvironmentExecutionPolicy {
        let unlimitedDeploymentsExecutionPolicy: PipelineEnvironmentExecutionPolicy = {
            concurrencyCount: QueueSettingsStore._unlimitedConcurrencyCount,
            queueDepthCount: QueueSettingsStore._defaultQueueDepthCount
        };
        return unlimitedDeploymentsExecutionPolicy;
    }

    private _getInitialParallelDeploymentType(executionPolicy: PipelineEnvironmentExecutionPolicy): string {
        if (executionPolicy && executionPolicy.concurrencyCount > 0) {
            return ParallelDeploymentOptions.DefiniteParallelDeployments;
        } else {
            return ParallelDeploymentOptions.UnlimitedDeployment;
        }
    }

    private _getInitialParallelDeploymentCount(executionPolicy: PipelineEnvironmentExecutionPolicy): string {
        if (executionPolicy && executionPolicy.concurrencyCount >= 0) {
            return executionPolicy.concurrencyCount.toString();
        } else {
            return QueueSettingsStore._unlimitedConcurrencyCount.toString();
        }
    }

    private _getInitialState(executionPolicy: PipelineEnvironmentExecutionPolicy): IQueueSettingsState {
        let originalExecutionPolicy: PipelineEnvironmentExecutionPolicy = JQueryWrapper.extendDeep({}, executionPolicy);
        let initialParallelDeploymentType: string = this._getInitialParallelDeploymentType(executionPolicy);
        let initialParallelDeploymentCount: string = this._getInitialParallelDeploymentCount(executionPolicy);
        let state: IQueueSettingsState = {
            executionPolicy: originalExecutionPolicy ? originalExecutionPolicy : this._getUnlimitedDeploymentsExecutionPolicy(),
            parallelDeploymentType: initialParallelDeploymentType,
            parallelDeploymentCount: initialParallelDeploymentCount
        };
        return state;
    }

    private _currentState: IQueueSettingsState;
    private _originalState: IQueueSettingsState;
    private _actions: QueueSettingsActionsHub;
    private static readonly _unlimitedConcurrencyCount: number = 0;
    private static readonly _definiteConcurrencyCount: number = 1;
    private static readonly _defaultQueueDepthCount: number = 0;
}
