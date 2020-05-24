import { VariablesActionCreatorBase } from "DistributedTaskControls/Variables/Common/Actions/VariablesActionCreatorBase";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import {
    ProcessVariablesActions,
    IUpdateScopePermissionsActionPayload,
    ICloneScopedProcessVariablesPayload,
    IProcessVariableActionPayload,
    IScopedProcessVariables,
    ISortOptions,
    IToggleProcessVariableEditModePayload
} from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { VariableActionCreatorKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { IVariableKeyPayload } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { ProcessVariablesViewActions } from "DistributedTaskControls/Variables/ProcessVariables/Actions/ProcessVariablesViewActions";

export class ProcessVariablesActionCreator extends VariablesActionCreatorBase {

    public initialize(instanceId?: string) {
        this._actions = ActionsHubManager.GetActionsHub<ProcessVariablesActions>(ProcessVariablesActions, instanceId);
        this._viewActions = ActionsHubManager.GetActionsHub<ProcessVariablesViewActions>(ProcessVariablesViewActions, instanceId);
    }

    public static getKey(): string {
        return VariableActionCreatorKeys.VariablesSection_ActionCreator;
    }

    public getActionsHub(): ProcessVariablesActions {
        return this._actions;
    }

    public getViewActionsHub(): ProcessVariablesViewActions {
        return this._viewActions;
    }

    /**
     * Raise actions for the variables in case of create definition scenario
     * 
     * @param {IProcessVariableActionPayload} processVariableActionPayload 
     * @memberof ProcessVariablesActionCreator
     */
    public createProcessVariables(processVariableActionPayload: IProcessVariableActionPayload): void {
        this.getViewActionsHub().createProcessVariables.invoke(processVariableActionPayload);
        this.getActionsHub().createProcessVariables.invoke(processVariableActionPayload);
    }

    /**
     * Raise actions for variables in case of update definition (save) scenario
     * 
     * @param {IProcessVariableActionPayload} processVariableActionPayload 
     * @memberof ProcessVariablesActionCreator
     */
    public updateProcessVariables(processVariableActionPayload: IProcessVariableActionPayload): void {

        // reset the viewIndexToDataIndexMap
        this.getViewActionsHub().resetViewIndexToDataIndexMap.invoke({});

        this.getActionsHub().updateProcessVariables.invoke(processVariableActionPayload);

        // Viewstore needs to act on the latest data from server, so first update the datastore and then act on the viewstore 
        this.getViewActionsHub().updateProcessVariables.invoke(processVariableActionPayload);
    }

    /**
     * Raise actions for updating scope permissions of variables.
     * 
     * @param {IUpdateScopePermissionsActionPayload} updateScopePermissionsActionPayload 
     * @memberof ProcessVariablesActionCreator
     */
    public updateScopePermissions(updateScopePermissionsActionPayload: IUpdateScopePermissionsActionPayload): void {
        this.getActionsHub().updateScopePermissions.invoke(updateScopePermissionsActionPayload);
    }

    public toggleEditMode(payload: IToggleProcessVariableEditModePayload): void {
        this.getActionsHub().toggleEditMode.invoke(payload);
    }

    /**
     * Raise actions in case of sort
     * 
     * @param {ISortOptions} sortOptions 
     * @memberof ProcessVariablesActionCreator
     */
    public sort(sortOptions: ISortOptions): void {
        this.getActionsHub().sort.invoke(sortOptions);
    }

    /**
     * Raise actions in case of delete of a variable
     * 
     * @param {IVariableKeyPayload} variableKeyPayload 
     * @memberof ProcessVariablesActionCreator
     */
    public deleteVariable(variableKeyPayload: IVariableKeyPayload): void {

        this.getViewActionsHub().deleteVariable.invoke(variableKeyPayload);
        this.getActionsHub().deleteVariable.invoke(variableKeyPayload);
    }

    /**
     * Raise actions in case of add of a variable
     * 
     * @param {IEmptyActionPayload} emptyActionPayload 
     * @memberof ProcessVariablesActionCreator
     */
    public addVariable(emptyActionPayload: IEmptyActionPayload): void {

        this.getViewActionsHub().addVariable.invoke(emptyActionPayload);
        this.getActionsHub().addVariable.invoke(emptyActionPayload);
    }

    /**
     * Raise actions in case of add of bulk variable with a scope (ex. apply template with in-built variables)
     * 
     * @param {IScopedProcessVariables} scopedProcessVariables 
     * @memberof ProcessVariablesActionCreator
     */
    public addScopedProcessVariables(scopedProcessVariables: IScopedProcessVariables): void {

        this.getViewActionsHub().addScopedProcessVariables.invoke(scopedProcessVariables);
        this.getActionsHub().addScopedProcessVariables.invoke(scopedProcessVariables);
    }

    /**
     * Raise actions in case of copy of bulk variables with a scope (ex. clone environment)
     * 
     * @param {ICloneScopedProcessVariablesPayload} scopedProcessVariables 
     * @memberof ProcessVariablesActionCreator
     */
    public cloneScopedProcessVariables(scopedProcessVariables: ICloneScopedProcessVariablesPayload): void {

        this.getViewActionsHub().cloneScopedProcessVariables.invoke(scopedProcessVariables);
        this.getActionsHub().cloneScopedProcessVariables.invoke(scopedProcessVariables);
    }

    /**
     * Raise actions in case scope properties are updated (ex. rename of environment)
     * 
     * @param {IScope} scope 
     * @memberof ProcessVariablesActionCreator
     */
    public updateScope(scope: IScope): void {
        this.getActionsHub().updateScope.invoke(scope);
    }

    /**
     * Raise actions in case of scope is deleted (ex. delete of environment)
     * 
     * @param {IScope} scope 
     * @memberof ProcessVariablesActionCreator
     */
    public deleteScope(scope: IScope): void {

        this.getViewActionsHub().deleteScope.invoke(scope);
        this.getActionsHub().deleteScope.invoke(scope);
    }

    private _actions: ProcessVariablesActions;
    private _viewActions: ProcessVariablesViewActions;
}