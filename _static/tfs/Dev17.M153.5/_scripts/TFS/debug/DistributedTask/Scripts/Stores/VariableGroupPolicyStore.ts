import { VariableGroupPolicyActions, IAuthorizedVariableGroupData } from "DistributedTask/Scripts/Actions/VariableGroupPolicyActions"
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import * as Build from "TFS/Build/Contracts";

import { autobind } from "OfficeFabric/Utilities";

export interface IVariableGroupPolicyState {
    isAccessOnAllPipelines: boolean;
}

export class VariableGroupPolicyStore extends StoreBase {

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<VariableGroupPolicyActions>(VariableGroupPolicyActions);
        this._actions.loadVariableGroupPolicyData.addListener(this._loadPolicyData);
        this._actions.setPolicyForAllPipelinesCheck.addListener(this._setPolicyForAllPipelinesCheck);
        this._actions.setSavedState.addListener(this._setSavedState);

        this._savedState = {
            isAccessOnAllPipelines: true
        } as IVariableGroupPolicyState;

        this._currentState = {
            isAccessOnAllPipelines: true
        } as IVariableGroupPolicyState;

    }

    public static getKey(): string {
        return VariableGroupPolicyStore.StoreKey;
    }

    protected disposeInternal(): void {
        this._actions.loadVariableGroupPolicyData.removeListener(this._loadPolicyData);
        this._actions.setPolicyForAllPipelinesCheck.removeListener(this._setPolicyForAllPipelinesCheck);
        this._actions.setSavedState.removeListener(this._setSavedState);
    }

    public getState(): IVariableGroupPolicyState {
        return this._currentState;
    }

    public isDirty(): boolean {
        if (this._currentState && this._savedState) {
            return !(this._currentState.isAccessOnAllPipelines === this._savedState.isAccessOnAllPipelines);
        }
        return false;
    }

    @autobind
    private _loadPolicyData(variableGroupData: IAuthorizedVariableGroupData): void {
        if (variableGroupData && variableGroupData.originalVariableGroupId) {
            if (variableGroupData.authorizedResources && variableGroupData.authorizedResources.length > 0) {

                // Filter and find the reference with the original end point. This is to make sure reference with correct Id is honored
                const reference: Build.DefinitionResourceReference[] = variableGroupData.authorizedResources.filter(resourceReference => resourceReference.id === variableGroupData.originalVariableGroupId);

                if (reference[0]) {
                    this._savedState.isAccessOnAllPipelines = reference[0].authorized;
                    this._currentState.isAccessOnAllPipelines = reference[0].authorized;
                }
                else {
                    this._savedState.isAccessOnAllPipelines = false;
                    this._currentState.isAccessOnAllPipelines = false;
                }
            }
            else {
                //  If no authorized resource object, set isAccessOnAllPipelines as false
                this._savedState.isAccessOnAllPipelines = false;
                this._currentState.isAccessOnAllPipelines = false;
            }
            this.emitChanged();
        }
    }

    @autobind
    private _setPolicyForAllPipelinesCheck(isEnabled: boolean): void {
        this._currentState.isAccessOnAllPipelines = !!isEnabled;
        this.emitChanged();
    }

    @autobind
    private _setSavedState(toggleValue: boolean): void {
        this._savedState.isAccessOnAllPipelines = toggleValue;
        this.emitChanged();
    }

    private _savedState: IVariableGroupPolicyState;
    private _currentState: IVariableGroupPolicyState;
    private _actions: VariableGroupPolicyActions;
    private static StoreKey = "STORE_KEY_VARIABLE_GROUP_POLICY";
}