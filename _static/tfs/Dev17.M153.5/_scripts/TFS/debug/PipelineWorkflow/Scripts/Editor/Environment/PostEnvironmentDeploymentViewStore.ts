// Copyright (c) Microsoft Corporation.  All rights reserved.

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ViewStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import * as Common from "DistributedTaskControls/Common/Common";

import { DeployPipelineStoreKeys, EnvironmentTriggerStoreChangedEvents } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentTriggerStore, IEnvironmentTriggerState } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentTriggerStore";
import { PipelineEnvironmentTriggerCondition, PipelineReleaseSchedule, PipelineEnvironmentTriggerConditionType } from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";

export interface IPostEnvironmentDeploymentTriggerViewState extends IStoreState {
    selectedEnvironments: string[]; // List of selected environment names
    partiallySucceededDeployment: boolean;
    isValid: boolean;
    errorMessage: string;
}

/**
 * View Store for Post Environment Deployment Trigger View
 */
export class PostEnvironmentDeploymentViewStore extends ViewStoreBase {
    constructor() {
        super();
        this._state = { selectedEnvironments: [], partiallySucceededDeployment: false, isValid: true, errorMessage: Utils_String.empty };
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelinePostEnvironmentDeploymentTriggerViewStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._dataStore = StoreManager.GetStore<EnvironmentTriggerStore>(EnvironmentTriggerStore, instanceId);
        this._dataStore.addChangedListener(this._onDataStoreChanged);
        this._dataStore.addListener(EnvironmentTriggerStoreChangedEvents.EnvironmentNameUpdatedEvent, this._onDataStoreChanged);
        this._onDataStoreChanged();
    }

    public disposeInternal(): void {
        this._dataStore.removeChangedListener(this._onDataStoreChanged);
        this._dataStore.removeListener(EnvironmentTriggerStoreChangedEvents.EnvironmentNameUpdatedEvent, this._onDataStoreChanged);
    }

    public getState(): IPostEnvironmentDeploymentTriggerViewState {
        return this._state;
    }

    private _onDataStoreChanged = (): void => {
        let environmentTriggerState: IEnvironmentTriggerState = this._dataStore.getState();
        if (environmentTriggerState) {
            this._updateEnvironmentTriggerState(environmentTriggerState.environmentTriggerConditions);
        }
    }

    private _updateEnvironmentTriggerState(triggerConditions: PipelineEnvironmentTriggerCondition[]) {
        let selectedEnvironmentList: string[] = [];
        let partiallySucceededDeployment: boolean = false;
        let conditionValue: string = Utils_String.empty;
        if (triggerConditions) {
            triggerConditions.forEach((condition) => {
                if (condition && condition.conditionType === PipelineEnvironmentTriggerConditionType.EnvironmentState) {
                    selectedEnvironmentList.push(condition.name);
                    conditionValue = condition.value;
                }
            });
        }

        if (selectedEnvironmentList.length > 0 && conditionValue) {
            // As per current contract, Trigger for partially succeeded checkbox is part of each environment trigger condition
            // However, in UI this is single checkbox which is applicable for all environments, so we can use any condition value
            // for the environment trigger to know the checkbox state. Need to revisit if RM contracts change in future.
            partiallySucceededDeployment = this._isPartiallySucceeded(conditionValue);
        }

        this._setStates(selectedEnvironmentList, partiallySucceededDeployment);
        this.emitChanged();
    }

    private _setStates(selectedEnvironments: string[], partiallySucceededDeployment: boolean) {
        this._state.selectedEnvironments = selectedEnvironments;
        this._state.partiallySucceededDeployment = partiallySucceededDeployment;
        this._state.isValid = true;
        let errorMessage = this._dataStore.getPostDeploymentEnvironmentTriggerErrorMessage();
        this._state.errorMessage = errorMessage;
        if (errorMessage !== Utils_String.empty) {
            this._state.isValid = false;
        }
    }

    private _isPartiallySucceeded(conditionValue: string): boolean {
        return Utils_String.caseInsensitiveContains(conditionValue, this._dataStore.getPartiallySucceededValue());
    }

    private _state: IPostEnvironmentDeploymentTriggerViewState;
    private _dataStore: EnvironmentTriggerStore;
}