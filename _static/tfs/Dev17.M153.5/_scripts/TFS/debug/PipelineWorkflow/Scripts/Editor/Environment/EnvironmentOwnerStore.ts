// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DataStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { Telemetry, Feature } from "DistributedTaskControls/Common/Telemetry";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentOwnerActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentOwnerActionsHub";
import { EnvironmentPropertiesConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { IdentityHelper } from "PipelineWorkflow/Scripts/Shared/Utils/IdentityHelper";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Identities_Picker_RestClient from "VSS/Identities/Picker/RestClient";
import * as Utils_String from "VSS/Utils/String";
import * as WebApi_Contracts from "VSS/WebApi/Contracts";

export interface IEnvironmenOwnerState extends IStoreState {
    environmentOwner: WebApi_Contracts.IdentityRef;
    unmaterializedOwner: string;
    materializeOwnerError: string;
    materializationInProgress: boolean;
}

export interface IEnvironmentOwnerStoreArgs {
    environmentOwner: WebApi_Contracts.IdentityRef;
}

/**
 * Store to contain environment settings
 */
export class EnvironmentOwnerStore extends DataStoreBase {

    constructor(args: IEnvironmentOwnerStoreArgs) {
        super();
        this._setInitialStates(args.environmentOwner);
    }

    /**
     * Returns store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentOwnerStoreKey;
    }

    /**
     * Initializes actions listeners for Environment settings
     */
    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._actions = ActionsHubManager.GetActionsHub<EnvironmentOwnerActionsHub>(EnvironmentOwnerActionsHub, instanceId);
        this._actions.updateEnvironmentOwner.addListener(this._handleUpdateEnvironmentOwner);
        this._actions.updateEnvironmentOwnerFromService.addListener(this._handleUpdateEnvironmentOwnerFromService);
        this._actions.updateUnmaterializedEnvironmentOwner.addListener(this._handleUpdateUnmaterializedEnvironmentOwner);
        this._actions.updateMaterializeEnvironmentOwnerError.addListener(this._handleUpdateMaterializeEnvironmentOwnerError);
        this._actions.updateMaterializationInProgress.addListener(this._handleUpdateMaterilizationInProgress);
    }

    /**
     * Disposing actions listeners for Environment settings
     */
    public disposeInternal(): void {
        this._actions.updateEnvironmentOwner.removeListener(this._handleUpdateEnvironmentOwner);
        this._actions.updateEnvironmentOwnerFromService.removeListener(this._handleUpdateEnvironmentOwnerFromService);
        this._actions.updateUnmaterializedEnvironmentOwner.removeListener(this._handleUpdateUnmaterializedEnvironmentOwner);
        this._actions.updateMaterializeEnvironmentOwnerError.removeListener(this._handleUpdateMaterializeEnvironmentOwnerError);
        this._actions.updateMaterializationInProgress.removeListener(this._handleUpdateMaterilizationInProgress);
    }

    public updateVisitor(environment: PipelineDefinitionEnvironment): void {
        if (!!environment) {
            environment.owner = JQueryWrapper.extend({}, null);
            JQueryWrapper.extendDeep(environment.owner, this._currentState.environmentOwner);
        }
    }

    public isDirty(): boolean {
        return !IdentityHelper.areIdentitiesSame(this._currentState.environmentOwner, this._originalState.environmentOwner);
    }

    public isValid(): boolean {
        return !this._isInvalidEnvironmentOwnerPresent()
            && !this._isUnmaterializedEnvironmentOwnerPresent()
            && !this._isMaterializeEnvironmentOwnerErrorPresent()
            && !this._isMaterilizationInProgress();
    }

    public getState(): IEnvironmenOwnerState {
        return this._currentState;
    }

    public getEnvironmentOwnerId(): string {
        return this._currentState.environmentOwner ? this._currentState.environmentOwner.id : Utils_String.empty;
    }

    public getReasonForInvalidState(): string {
        let reason: string = Utils_String.empty;

        if (this._isMaterilizationInProgress()) {
            reason = Resources.MaterializationInProgressMessage;
        }
        else if (this._isMaterializeEnvironmentOwnerErrorPresent()) {
            reason = Utils_String.format(
                Resources.MaterializeIdentitiesExceptionMessage,
                this._currentState.materializeOwnerError);
        }
        else if (this._isUnmaterializedEnvironmentOwnerPresent()) {
            reason = Utils_String.format(
                Resources.UnmaterializedIdentitiesErrorMessage,
                this._currentState.unmaterializedOwner);
        }
        else if (this._isInvalidEnvironmentOwnerPresent()) {
            reason = Resources.InValidIdentityErrorMessage;
        }

        return reason;
    }

    private _handleUpdateEnvironmentOwner = (environmentOwner: Identities_Picker_RestClient.IEntity) => {
        this._currentState.environmentOwner = IdentityHelper.ConvertToWebIdentityRef(environmentOwner);

        Telemetry.instance().publishEvent(Feature.EnvironmentOwnerUpdate);

        this.emitChanged();
    }

    private _handleUpdateEnvironmentOwnerFromService = (environmentOwner: WebApi_Contracts.IdentityRef) => {
        this._setInitialStates(environmentOwner);
    }

    private _handleUpdateUnmaterializedEnvironmentOwner = (owner: string): void => {
        this._currentState.unmaterializedOwner = owner;
        this.emitChanged();
    }

    private _handleUpdateMaterializeEnvironmentOwnerError = (errorMessage: string): void => {
        this._currentState.materializeOwnerError = errorMessage;
        this.emitChanged();
    }

    private _handleUpdateMaterilizationInProgress = (inProgress: boolean): void => {
        this._currentState.materializationInProgress = inProgress;
        this.emitChanged();
    }

    private _isInvalidEnvironmentOwnerPresent(): boolean {
        return !this._currentState.environmentOwner
            || !this._currentState.environmentOwner.id;
    }

    private _isUnmaterializedEnvironmentOwnerPresent(): boolean {
        return !!this._currentState.unmaterializedOwner;
    }

    private _isMaterializeEnvironmentOwnerErrorPresent(): boolean {
        return !!this._currentState.materializeOwnerError;
    }

    private _isMaterilizationInProgress(): boolean {
        return this._currentState.materializationInProgress;
    }

    private _setInitialStates(environmentOwner: WebApi_Contracts.IdentityRef) {

        this._currentState = {
            environmentOwner: environmentOwner,
            unmaterializedOwner: undefined,
            materializeOwnerError: undefined,
            materializationInProgress: false
        };
        this._originalState = {
            environmentOwner: environmentOwner,
            unmaterializedOwner: undefined,
            materializeOwnerError: undefined,
            materializationInProgress: false
        };
    }

    private _currentState: IEnvironmenOwnerState;
    private _originalState: IEnvironmenOwnerState;
    private _actions: EnvironmentOwnerActionsHub;
}

