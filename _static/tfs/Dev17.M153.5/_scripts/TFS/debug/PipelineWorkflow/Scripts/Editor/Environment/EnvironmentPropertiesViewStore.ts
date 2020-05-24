// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ViewStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentPropertiesConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { EnvironmentNameStore, IEnvironmentNameState } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameStore";
import { EnvironmentOwnerStore, IEnvironmenOwnerState } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentOwnerStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";
import * as WebApi_Contracts from "VSS/WebApi/Contracts";

export interface IEnvironmentPropertiesViewState extends IStoreState {
    environmentOwnerDisplayName: string;
    environmentName: string;
    isValid: boolean;
}

/**
 * View Store for Environment Properties view
 */
export class EnvironmentPropertiesViewStore extends ViewStoreBase {

    constructor() {
        super();
        this._state = {
            environmentOwnerDisplayName: Utils_String.empty,
            environmentName: Utils_String.empty,
            isValid: true
        };
    }

    /**
     * Returns store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentPropertiesViewStoreKey;
    }

    /**
     * Initializes data store change listener and actions listeners for Environment properties
     */
    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._nameStore = StoreManager.GetStore<EnvironmentNameStore>(EnvironmentNameStore, instanceId);
        this._ownerStore = StoreManager.GetStore<EnvironmentOwnerStore>(EnvironmentOwnerStore, instanceId);
        this._nameStore.addChangedListener(this._onDataStoreChanged);
        this._ownerStore.addChangedListener(this._onDataStoreChanged);
        this._onDataStoreChanged();
    }

    /**
     * Disposing actions listeners
     */
    public disposeInternal(): void {
        this._nameStore.removeChangedListener(this._onDataStoreChanged);
        this._ownerStore.removeChangedListener(this._onDataStoreChanged);
    }

    /**
     * Return the state of the environment properties store
     */
    public getState(): IEnvironmentPropertiesViewState {
        return this._state;
    }

    public isValid(): boolean {
        return this._nameStore.isValid() && this._ownerStore.isValid();
    }

    private _onDataStoreChanged = (): void => {

        let nameState = this._nameStore.getState();
        let ownerState = this._ownerStore.getState();

        if (nameState && ownerState) {

            this._state.environmentName = nameState.environmentName;
            if (ownerState.environmentOwner) {
                this._state.environmentOwnerDisplayName = ownerState.environmentOwner.displayName;
            }
            else {
                this._state.environmentOwnerDisplayName = Utils_String.empty;
            }

            this._state.isValid = this.isValid();
            this.emitChanged();
        }
    }

    private _state: IEnvironmentPropertiesViewState;
    private _nameStore: EnvironmentNameStore;
    private _ownerStore: EnvironmentOwnerStore;
}