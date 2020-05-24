import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as Actions from "CIWorkflow/Scripts/Scenarios/Definition/Actions/BuildDefinitionActions";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import { Store } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/Base";

import { MaxPositiveNumber, InputState } from "DistributedTaskControls/Common/Common";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import { BuildDefinition, BuildAuthorizationScope } from "TFS/Build/Contracts";
import { ProjectVisibility } from "TFS/Core/Contracts";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as Utils_String from "VSS/Utils/String";

export interface IBuildJobState {
    jobTimeoutInMinutes: string;
    jobCancelTimeoutInMinutes: string;
    jobAuthorizationScope: number;
    projectVisibility: ProjectVisibility;
}

export class BuildJobStore extends Store {
    private _currentState: IBuildJobState;
    private _originalState: IBuildJobState;
    private _actions: Actions.BuildDefinitionActions;
    private _requiredScope: BuildAuthorizationScope;

    constructor() {
        super();
        this._currentState = {} as IBuildJobState;
        this._originalState = {} as IBuildJobState;
    }

    /**
     * @returns Unique key to the store
     */
    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_BuildJobStore;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<Actions.BuildDefinitionActions>(Actions.BuildDefinitionActions);
        this._actions.createBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.updateBuildDefinition.addListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.updateScope.addListener(this._updateScope);
        this._actions.updateBuildJobTimeout.addListener(this._updateBuildJobTimeout);
        this._actions.updateBuildJobCancelTimeout.addListener(this._updateBuildJobCancelTimeout);
    }

    protected disposeInternal(): void {
        this._actions.createBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.updateBuildDefinition.removeListener(this._handleCreateAndUpdateBuildDefinition);
        this._actions.updateScope.removeListener(this._updateScope);
        this._actions.updateBuildJobTimeout.removeListener(this._updateBuildJobTimeout);
        this._actions.updateBuildJobCancelTimeout.removeListener(this._updateBuildJobCancelTimeout);
    }

    public updateVisitor(buildDefinition: BuildDefinition): BuildDefinition {
        buildDefinition.jobAuthorizationScope = this._currentState.jobAuthorizationScope;
        buildDefinition.jobTimeoutInMinutes = DtcUtils.getInteger(this._currentState.jobTimeoutInMinutes);
        buildDefinition.jobCancelTimeoutInMinutes = DtcUtils.getInteger(this._currentState.jobCancelTimeoutInMinutes);
        return buildDefinition;
    }

    public isDirty(): boolean {
        return (this._currentState.jobAuthorizationScope !== this._originalState.jobAuthorizationScope)
            || !DtcUtils.areIntegersEqual(this._currentState.jobTimeoutInMinutes, this._originalState.jobTimeoutInMinutes)
            || !DtcUtils.areIntegersEqual(this._currentState.jobCancelTimeoutInMinutes, this._originalState.jobCancelTimeoutInMinutes);
    }

    public isValid(): boolean {
        return this.isValidJobAuthorizationScope(this._currentState.jobAuthorizationScope) 
            && this.isValidJobTimeoutValue(this._currentState.jobTimeoutInMinutes)
            && this.isValidJobCancelTimeoutValue(this._currentState.jobCancelTimeoutInMinutes);
    }

    public setRequiredScope(scope: BuildAuthorizationScope) {
        this._requiredScope = scope;
        this.emitChanged();
    }

    public getState(): IBuildJobState {
        return this._currentState;
    }

    public isValidJobAuthorizationScope(scope: BuildAuthorizationScope): boolean {
        return (!this._requiredScope || this._requiredScope === scope);
    }

    public isValidJobTimeoutValue(val: string): boolean {
        return this._isValidValue(val, 0, MaxPositiveNumber);
    }

    public isValidJobCancelTimeoutValue(val: string): boolean {
        return this._isValidValue(val, 1, 60);
    }

    private _isValidValue(value: string, minValue: number, maxValue: number): boolean {
        if (!!value) {
            value = value.trim();
        }

        return (value === Utils_String.empty ||
            DtcUtils.isValidNonNegativeIntegerInRange(value, minValue, maxValue) === InputState.Valid);
    }

    private _handleCreateAndUpdateBuildDefinition = (definition: BuildDefinition) => {
        this._updateStates(definition);
        this.emitChanged();
    }

    private _updateBuildJobTimeout = (value: string) => {
        this._currentState.jobTimeoutInMinutes = value;
        this.emitChanged();
    }

    private _updateBuildJobCancelTimeout = (value: string) => {
        this._currentState.jobCancelTimeoutInMinutes = value;
        this.emitChanged();
    }

    private _updateScope = (scopeId: number) => {
        this._currentState.jobAuthorizationScope = scopeId;
        this.emitChanged();
    }

    private _updateStates(definition: BuildDefinition) {
        this._updateState(definition, this._originalState);
        this._updateState(definition, this._currentState);
    }
  
    private _updateState(buildDefinition: BuildDefinition, state: IBuildJobState): void {
        state.jobAuthorizationScope = buildDefinition.jobAuthorizationScope ? buildDefinition.jobAuthorizationScope : 1;
        state.jobTimeoutInMinutes = buildDefinition.jobTimeoutInMinutes ? buildDefinition.jobTimeoutInMinutes.toString() : "0";
        state.jobCancelTimeoutInMinutes = buildDefinition.jobCancelTimeoutInMinutes ? buildDefinition.jobCancelTimeoutInMinutes.toString() : "5";
        state.projectVisibility = DefaultRepositorySource.instance().getProjectVisibility(TfsContext.getDefault().contextData.project.id);
    }
}
