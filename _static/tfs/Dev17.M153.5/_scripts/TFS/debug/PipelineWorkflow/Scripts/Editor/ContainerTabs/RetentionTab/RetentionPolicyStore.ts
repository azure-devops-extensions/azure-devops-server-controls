
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { InputState } from "DistributedTaskControls/Common/Common";
import { ItemOverviewState } from "DistributedTaskControls/Common/Item";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { EnvironmentNameStore } from "PipelineWorkflow/Scripts/Editor/Environment/EnvironmentNameStore";
import { RetentionPolicyActionsHub } from "PipelineWorkflow/Scripts/Editor/ContainerTabs/RetentionTab/RetentionPolicyActions";
import { DefinitionSettingsStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionSettingsStore";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import RMContracts = require("ReleaseManagement/Core/Contracts");

import * as Utils_String from "VSS/Utils/String";

export interface IRetentionPolicyState extends ItemOverviewState {
    daysToKeep: string;
    releasesToKeep: string;
    retainBuild: boolean;
}

export interface IRetentionPolicyStoreArgs {
    retentionPolicy: RMContracts.EnvironmentRetentionPolicy;
}

export class RetentionPolicyStore extends DataStoreBase {

    constructor(args: IRetentionPolicyStoreArgs) {
        super();
        this._definitionSettingsStore = StoreManager.GetStore<DefinitionSettingsStore>(DefinitionSettingsStore);
        let currentPolicy = args.retentionPolicy ? args.retentionPolicy : this._definitionSettingsStore.getDefaultRetentionPolicy();
        this._updateStates(currentPolicy);
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._retentionPolicyActionsHub = ActionsHubManager.GetActionsHub<RetentionPolicyActionsHub>(RetentionPolicyActionsHub, instanceId);

        this._retentionPolicyActionsHub.updateDaysToKeepAction.addListener(this._handleUpdateDaysToKeep);
        this._retentionPolicyActionsHub.updateReleasesToKeepAction.addListener(this._handleUpdateReleasesToKeep);
        this._retentionPolicyActionsHub.updateRetainBuildAction.addListener(this._handleUpdateRetainBuild);
        this._retentionPolicyActionsHub.updateRetentionPolicy.addListener(this._handleUpdateRetentionPolicy);

    }

    protected disposeInternal(): void {
        if (this._retentionPolicyActionsHub) {
            this._retentionPolicyActionsHub.updateDaysToKeepAction.removeListener(this._handleUpdateDaysToKeep);
            this._retentionPolicyActionsHub.updateReleasesToKeepAction.removeListener(this._handleUpdateReleasesToKeep);
            this._retentionPolicyActionsHub.updateRetainBuildAction.removeListener(this._handleUpdateRetainBuild);
            this._retentionPolicyActionsHub.updateRetentionPolicy.removeListener(this._handleUpdateRetentionPolicy);
        }

        this._currentState = null;
        this._originalState = null;
        this._retentionPolicyActionsHub = null;
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineRetentionPolicyStoreKey;
    }

    public getState(): IRetentionPolicyState {
        return this._currentState;
    }

    public isDirty(): boolean {
        return (!(
            DtcUtils.areIntegersEqual(this._currentState.daysToKeep, this._originalState.daysToKeep)
            && DtcUtils.areIntegersEqual(this._currentState.releasesToKeep, this._originalState.releasesToKeep)
            && this._currentState.retainBuild === this._originalState.retainBuild
        ));
    }

    public isValid(): boolean {
        return this._isDaysToRetainValid(this._currentState.daysToKeep)
            && this._isReleasesToRetainValid(this._currentState.releasesToKeep);
    }

    public updateVisitor(visitor: CommonTypes.PipelineDefinitionEnvironment): void {
        if (visitor && this.isValid()) {
            visitor.retentionPolicy = {
                daysToKeep: DtcUtils.getInteger(this._currentState.daysToKeep),
                releasesToKeep: DtcUtils.getInteger(this._currentState.releasesToKeep),
                retainBuild: this._currentState.retainBuild
            };
        }
    }

    public getEnvironmentName(): string {
        let environmentName = Utils_String.empty;
        let environmentNameStore: EnvironmentNameStore = StoreManager.GetStore<EnvironmentNameStore>(EnvironmentNameStore, this.getInstanceId());
        if (environmentNameStore) {
            let environmentNameStoreState = environmentNameStore.getState();
            environmentName = environmentNameStoreState.environmentName;
        }
        return environmentName;
    }

    public getItemOverviewState(): IRetentionPolicyState {
        return {
            retainBuild: this._currentState.retainBuild,
            daysToKeep: this._isDaysToRetainValid(this._currentState.daysToKeep) ? this._currentState.daysToKeep : Utils_String.empty,
            releasesToKeep: this._isReleasesToRetainValid(this._currentState.releasesToKeep) ? this._currentState.releasesToKeep : Utils_String.empty,
            isValid: this.isValid()
        } as IRetentionPolicyState;
    }

    public getDaysToKeepErrorMessage(): string {
        let value: string = this._currentState.daysToKeep;
        let errorMessage: string;
        let maximumRetainDays: number = this._definitionSettingsStore.getMaximumRetentionPolicy().daysToKeep;
        if (!value || !value.trim()) {
            errorMessage = Utils_String.format(Resources.RetentionDaysEmptyValueErrorMessage, maximumRetainDays);
        } else if (!this._isDaysToRetainValid(value)) {
            errorMessage = Utils_String.format(Resources.RetentionDaysInvalidValueErrorMessage, maximumRetainDays);
        } else {
            errorMessage = Utils_String.empty;
        }
        return errorMessage;
    }

    public getReleasesToKeepErrorMessage(): string {
        let value: string = this._currentState.releasesToKeep;
        let minimumReleaseRetainCount: number = this._definitionSettingsStore.getMaximumRetentionPolicy().releasesToKeep;
        let errorMessage: string;
        if (!value || !value.trim()) {
            errorMessage = Utils_String.format(Resources.RetentionReleaseCountEmptyValueErrorMessage, minimumReleaseRetainCount);
        } else if (!this._isReleasesToRetainValid(value)) {
            errorMessage = Utils_String.format(Resources.RetentionReleaseCountInvalidValueErrorMessage, minimumReleaseRetainCount);
        } else {
            errorMessage = Utils_String.empty;
        }
        return errorMessage;
    }

    private _isDaysToRetainValid(value: string): boolean {
        return this._checkValidNumberAndRange(value, 1, this._definitionSettingsStore.getMaximumRetentionPolicy().daysToKeep);
    }

    private _isReleasesToRetainValid(value: string): boolean {
        return this._checkValidNumberAndRange(value, 1, this._definitionSettingsStore.getMaximumRetentionPolicy().releasesToKeep);
    }

    private _updateStates(retentionPolicy: RMContracts.EnvironmentRetentionPolicy): void {
        this._currentState = this._getStateFromRetentionPolicy(retentionPolicy);
        this._originalState = this._getStateFromRetentionPolicy(retentionPolicy);
    }

    private _handleUpdateRetentionPolicy = (retentionPolicy: RMContracts.EnvironmentRetentionPolicy): void => {
        this._updateStates(retentionPolicy);
    }

    private _getStateFromRetentionPolicy = (retentionPolicy: RMContracts.EnvironmentRetentionPolicy) => {
        if (retentionPolicy) {
            return ({
                daysToKeep: retentionPolicy.daysToKeep ? retentionPolicy.daysToKeep.toString() : Utils_String.empty,
                releasesToKeep: retentionPolicy.releasesToKeep ? retentionPolicy.releasesToKeep.toString() : Utils_String.empty,
                retainBuild: !!retentionPolicy.retainBuild
            } as IRetentionPolicyState);
        } else {
            return null;
        }
    }

    private _handleUpdateDaysToKeep = (newValue: string) => {
        this._currentState.daysToKeep = newValue;
        this.emitChanged();
    }

    private _handleUpdateReleasesToKeep = (newValue: string) => {
        this._currentState.releasesToKeep = newValue;
        this.emitChanged();
    }

    private _handleUpdateRetainBuild = (newValue: boolean) => {
        this._currentState.retainBuild = newValue;
        this.emitChanged();
    }

    private _checkValidNumberAndRange = (value: string, minValue: number, maxValue: number) => {
        return DtcUtils.isValidNonNegativeIntegerInRange(value, minValue, maxValue) === InputState.Valid;
    }

    private _currentState: IRetentionPolicyState;
    private _originalState: IRetentionPolicyState;
    private _retentionPolicyActionsHub: RetentionPolicyActionsHub;
    private _definitionSettingsStore: DefinitionSettingsStore;
}
