// Copyright (c) Microsoft Corporation.  All rights reserved.

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DataStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentNameActionsHub } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameActionsHub";
import { EnvironmentPropertiesConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { IEnvironmentListModel } from "PipelineWorkflow/Scripts/Shared/EnvironmentList/EnvironmentListModel";
import { PipelineDefinitionEnvironment } from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_String from "VSS/Utils/String";

export interface IEnvironmentNameState extends IStoreState {
    environmentName: string;
}

export interface IEnvironmentNameStoreArgs {
    environmentName: string;
    environmentListModel: IEnvironmentListModel<PipelineDefinitionEnvironment>;
}

/**
 * Store to contain environment settings
 */
export class EnvironmentNameStore extends DataStoreBase {

    constructor(args: IEnvironmentNameStoreArgs) {
        super();
        this._environmentListModel = args.environmentListModel;
        this._setInitialStates(args.environmentName);
    }

    /**
     * Returns store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineEnvironmentNameStoreKey;
    }

    /**
     * Initializes actions listeners for Environment settings
     */
    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._actions = ActionsHubManager.GetActionsHub<EnvironmentNameActionsHub>(EnvironmentNameActionsHub, instanceId);
        this._actions.updateEnvironmentName.addListener(this._handleUpdateEnvironmentName);
        this._actions.updateEnvironmentNameFromService.addListener(this._handleUpdateEnvironmentNameFromService);
    }

    /**
     * Disposing actions listeners for Environment settings
     */
    public disposeInternal(): void {
        this._actions.updateEnvironmentName.removeListener(this._handleUpdateEnvironmentName);
        this._actions.updateEnvironmentNameFromService.removeListener(this._handleUpdateEnvironmentNameFromService);
    }

    public updateVisitor(environment: PipelineDefinitionEnvironment): void {
        if (!!environment) {
            environment.name = this._currentState.environmentName;
        }
    }

    /**
     * Check if environment settings store is dirty or not
     */
    public isDirty(): boolean {
        return Utils_String.defaultComparer(this._currentState.environmentName, this._originalState.environmentName) !== 0;
    }

    /**
     * Check if environment settings store is valid or not
     */
    public isValid(): boolean {
        return this._isEnvironmentNameValid();
    }

    /**
     * Return the current state of the environment settings store
     */
    public getState(): IEnvironmentNameState {
        return this._currentState;
    }

    /**
     * Check if environment name is unique
     * @param environmentName
     */
    public isUniqueEnvironmentName(environmentName: string): boolean {
        let environmentIdNameMap: IDictionaryNumberTo<string> = this._environmentListModel.getEnvironmentIdNameMap();
        let currentStoreEnvironmentId = this._environmentListModel.getEnvironmentIdFromInstanceId(this.getInstanceId());
        if (currentStoreEnvironmentId) {
            for (let environmentId in environmentIdNameMap) {
                if (environmentIdNameMap.hasOwnProperty(environmentId)) {
                    if (Utils_String.ignoreCaseComparer(environmentIdNameMap[environmentId], environmentName) === 0 &&
                        environmentId !== currentStoreEnvironmentId.toString()) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    /**
     * Validate the environment name and return error message in case validation failed
     * Empty error message implies no error in environment name validation
     */
    public getEnvironmentNameValidationErrorMessage = (environmentName: string): string => {
        if (DtcUtils.isNullOrWhiteSpace(environmentName)) {
            return Resources.EnvironmentNameValidationError;
        }
        else if (environmentName.length > EnvironmentPropertiesConstants.EnvironmentNameMaxLength) {
            return Resources.EnvironmentNameLengthValidationError;
        }
        else {
            return Utils_String.empty;
        }
    }

    private _isEnvironmentNameValid() {
        let errorMessage = this.getEnvironmentNameValidationErrorMessage(this._currentState.environmentName);
        return (errorMessage === Utils_String.empty);
    }

    private _handleUpdateEnvironmentName = (environmentName: string) => {
        let newEnvironmentName: string = environmentName || Utils_String.empty;
        if (this._currentState.environmentName !== newEnvironmentName) {
            this._currentState.environmentName = newEnvironmentName;
            this.emitChanged();
        }
    }

    private _handleUpdateEnvironmentNameFromService = (environmentName: string) => {
        this._setInitialStates(environmentName);
    }

    private _setInitialStates(environmentName: string) {
        this._currentState =
            {
                environmentName: environmentName || Utils_String.empty
            };
        this._originalState =
            {
                environmentName: environmentName || Utils_String.empty
            };
    }

    private _currentState: IEnvironmentNameState;
    private _originalState: IEnvironmentNameState;
    private _actions: EnvironmentNameActionsHub;
    private _environmentListModel: IEnvironmentListModel<PipelineDefinitionEnvironment>;
}

