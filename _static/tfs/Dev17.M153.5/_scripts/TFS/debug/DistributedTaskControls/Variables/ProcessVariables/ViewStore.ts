import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { VariablesViewStoreBase } from "DistributedTaskControls/Variables/Common/ViewStoreBase";
import { ProcessVariablesStore } from "DistributedTaskControls/Variables/ProcessVariables/DataStore";
import { VariableStoreKeys, VariableConstants } from "DistributedTaskControls/Variables/Common/Constants";
import { IVariable, IScope } from "DistributedTaskControls/Variables/Common/Types";
import { IState } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ProcessVariablesViewActions } from "DistributedTaskControls/Variables/ProcessVariables/Actions/ProcessVariablesViewActions";
import { ProcessVariablesFilterActions } from "DistributedTaskControls/Variables/Filters/ProcessVariablesFilterActions";
import {
    IProcessVariableActionPayload,
    IScopedProcessVariables,
    ICloneScopedProcessVariablesPayload
} from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { VariablesUtils } from "DistributedTaskControls/Variables/Common/VariableUtils";
import { IVariableKeyPayload } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { ProcessVariablesFilterUtility } from "DistributedTaskControls/Variables/Filters/ProcessVariablesFilterUtility";
import { ValidationHelper } from "DistributedTaskControls/Variables/ProcessVariablesV2/ValidationHelper";

import { autobind, assign } from "OfficeFabric/Utilities";

import { Filter, IFilterState } from "VSSUI/Utilities/Filter";
import * as Utils_String from "VSS/Utils/String";

export interface IProcessVariablesViewState extends IState {

    /**
     * Indexes map to dataStore Index
     * It is the order of the variables we want to show in the UI
     * 
     * @type {number[]}
     * @memberof IProcessVariablesViewState
     */
    viewIndexTodataIndexMap: number[];

    /**
     * filter is the current state of filters
     * 
     * @type {IFilter}
     * @memberof IProcessVariablesViewState
     */
    filter: Filter;

    stopAutoFocus: boolean;

    variablesDisabledMode?: boolean;
}

export interface IProcessVariablesViewStoreArgs {
    scopeKey?: number;
}

export class ProcessVariablesViewStore extends VariablesViewStoreBase {
    constructor(args?: IProcessVariablesViewStoreArgs) {
        super();

        if (args) {
            this._scopeKey = args.scopeKey;
        }
    }

    public initialize(instanceId?: string): void {

        this._state = {} as IProcessVariablesViewState;

        this._actionsHub = ActionsHubManager.GetActionsHub<ProcessVariablesViewActions>(ProcessVariablesViewActions, instanceId);

        this._actionsHub.createProcessVariables.addListener(this._createProcessVariables);
        this._actionsHub.updateProcessVariables.addListener(this._updateProcessVariables);
        this._actionsHub.addVariable.addListener(this._addVariable);
        this._actionsHub.addScopedProcessVariables.addListener(this._addScopedVariables);
        this._actionsHub.cloneScopedProcessVariables.addListener(this._cloneScopedVariables);
        this._actionsHub.deleteScope.addListener(this._deleteScope);
        this._actionsHub.deleteVariable.addListener(this._deleteVariable);
        this._actionsHub.resetViewIndexToDataIndexMap.addListener(this._resetViewIndexToDataIndexMap);

        this._filtersActionsHub = ActionsHubManager.GetActionsHub<ProcessVariablesFilterActions>(ProcessVariablesFilterActions, instanceId);
        this._filtersActionsHub.filter.addListener(this._filter);
        this._filtersActionsHub.defaultFilterTrigger.addListener(this._handleDefaultFilterChanged);

        this._dataStore = StoreManager.GetStore<ProcessVariablesStore>(ProcessVariablesStore, instanceId);

        this._dataStore.addChangedListener(this._onDataStoreChanged);

        this._setDefaultFilterOnLoad();

        this._onDataStoreChanged();
    }

    public getState(): IProcessVariablesViewState {
        return this._state;
    }

    public getCurrentVariablesArray(): IVariable[] {
        let variables = this._dataStore.getCurrentVariablesArray();
        let viewIndexTodataIndexMap = this._state.viewIndexTodataIndexMap;
        let filteredVariables = [];

        for (let viewIndex = 0, length = viewIndexTodataIndexMap.length; viewIndex < length; viewIndex++) {
            filteredVariables.push(variables[viewIndexTodataIndexMap[viewIndex]]);
        }

        return filteredVariables;
    }

    public getDuplicateVariableNamesMap(): IDictionaryStringTo<IDictionaryStringTo<number>> {
        let variablesArray = this._dataStore.getCurrentVariablesArray();
        return ValidationHelper.getDuplicateVariableNamesMap(variablesArray, VariableConstants.DefaultScopeKey);
    }

    public getDefaultScopeDuplicateVariableNamesMap(): IDictionaryStringTo<number> {

        let map = this.getDuplicateVariableNamesMap();
        if (map.hasOwnProperty(VariableConstants.DefaultScopeKey)) {
            return map[VariableConstants.DefaultScopeKey];
        }

        return {};
    }

    public shouldShowPermissionWarning(scope: number): boolean {
        return this._dataStore.shouldShowPermissionWarning(scope);
    }

    public getPermissionWarningMessage(): string {
        return this._dataStore.getPermissionWarningMessage();
    }

    public disposeInternal(): void {

        this._actionsHub.createProcessVariables.removeListener(this._createProcessVariables);
        this._actionsHub.updateProcessVariables.removeListener(this._updateProcessVariables);
        this._actionsHub.addVariable.removeListener(this._addVariable);
        this._actionsHub.addScopedProcessVariables.removeListener(this._addScopedVariables);
        this._actionsHub.cloneScopedProcessVariables.removeListener(this._cloneScopedVariables);
        this._actionsHub.deleteScope.removeListener(this._deleteScope);
        this._actionsHub.deleteVariable.removeListener(this._deleteVariable);
        this._actionsHub.resetViewIndexToDataIndexMap.removeListener(this._resetViewIndexToDataIndexMap);
        this._filtersActionsHub.defaultFilterTrigger.removeListener(this._handleDefaultFilterChanged);

        this._filtersActionsHub.filter.removeListener(this._filter);

        this._dataStore.removeChangedListener(this._onDataStoreChanged);
    }

    public static getKey(): string {
        return VariableStoreKeys.StoreKey_VariablesListViewStore;
    }

    private _setDefaultFilterOnLoad(): void {
        if (this._scopeKey) {
            //  Only set these values if scope key is passed, which is the progress scenario. Editor will not pass this.

            this._state.filter = new Filter();

            //  Set new filter
            this._state.filter.setState(this._getDefaultState(this._scopeKey));

            // Post filter set changes, like filtering variables etc.
            this._postFilterSetChanges();
        }
    }

    @autobind
    private _createProcessVariables(payload: IProcessVariableActionPayload) {
        this._state.viewIndexTodataIndexMap = null;
    }

    @autobind
    private _updateProcessVariables(payload: IProcessVariableActionPayload) {
        this._filterVariables();
        this.emitChanged();
    }

    @autobind
    private _addVariable(payload: IEmptyActionPayload) {

        // get the current set of variables
        let currentVariables = this._dataStore.getCurrentVariablesArray();

        // find the position for the new variable
        let indexForVariable = currentVariables.length;

        // add the index to list of indexes we want to show in view
        this._state.viewIndexTodataIndexMap.push(indexForVariable);
    }

    @autobind
    private _addScopedVariables(payload: IScopedProcessVariables) {

        // get the current set of variables
        let currentVariables = this._dataStore.getCurrentVariablesArray();

        // find the first position for the new variables
        let indexForVariable = currentVariables.length;

        let variableList = payload.variableList;

        for (let index = 0, length = variableList.length; index < length; index++) {

            let variable = VariablesUtils.convertDefinitionVariableToModelVariable(variableList[index]);

            // if variable meets the filtered criteria, then add it
            if (ProcessVariablesFilterUtility.doesVariableMatchFilter(variable, this._state.filter)) {
                this._state.viewIndexTodataIndexMap.push(indexForVariable);
            }
            indexForVariable++;
        }
    }

    @autobind
    private _cloneScopedVariables(payload: ICloneScopedProcessVariablesPayload) {

        // get the current set of variables
        let currentVariables = this._dataStore.getCurrentVariablesArray();

        // find the first position for the new variables
        let indexForVariable = currentVariables.length;

        // get the variables to clone
        let sourceVariables = VariablesUtils.getVariablesInScope(currentVariables, payload.sourceScopeKey);
        let clonedVariables = VariablesUtils.cloneScopedProcessVariables(sourceVariables, payload.targetScope);

        for (let index = 0, length = clonedVariables.length; index < length; index++) {

            // if variable meets the filtered criteria, then add it
            if (ProcessVariablesFilterUtility.doesVariableMatchFilter(clonedVariables[index], this._state.filter)) {
                this._state.viewIndexTodataIndexMap.push(indexForVariable);
            }
            indexForVariable++;
        }
    }

    @autobind
    private _deleteScope(scope: IScope) {

        // get the current set of variables
        let currentVariables = this._dataStore.getCurrentVariablesArray();

        let variablesDeleted = 0;
        for (let index = 0, length = currentVariables.length; index < length; index++) {
            let variable = currentVariables[index];

            // perform delete operation if the variable belong to the scope
            if (variable.scope.key === scope.key) {

                // reduce the index by variablesDeleted as the dataStore index would have been reduced by deleting the previous indexes
                this._delete(index - variablesDeleted);
                variablesDeleted++;
            }
        }
    }

    @autobind
    private _deleteVariable(payload: IVariableKeyPayload) {
        this._delete(payload.index);
    }

    private _delete(dataIndex: number) {

        // get the viewIndexTodataIndexMap array
        let viewIndexTodataIndexMap = this._state.viewIndexTodataIndexMap;

        // check the existence of the variable to delete in the viewIndexTodataIndexMap array
        let viewIndex = viewIndexTodataIndexMap.indexOf(dataIndex);

        // remove the reference, if the variable reference exist
        if (viewIndex !== -1) {
            viewIndexTodataIndexMap.splice(viewIndex, 1);
        }

        for (let index = 0, length = viewIndexTodataIndexMap.length; index < length; index++) {

            // when the variable is deleted, all the indexes greater would now be reduced by 1
            if (viewIndexTodataIndexMap[index] > dataIndex) {
                viewIndexTodataIndexMap[index] = viewIndexTodataIndexMap[index] - 1;
            }
        }
    }

    private _initializeDataIndexesOrder(): void {

        if (!this._state.viewIndexTodataIndexMap) {

            // get the current set of variables
            let currentVariables = this._dataStore.getCurrentVariablesArray();

            // get count of variables
            let length = currentVariables.length;

            this._state.viewIndexTodataIndexMap = [];

            // add all the indexes in the viewIndexTodataIndexMap
            for (let index = 0; index < length; index++) {
                this._state.viewIndexTodataIndexMap.push(index);
            }
        }
    }

    @autobind
    private _onDataStoreChanged() {

        this._state.stopAutoFocus = false;

        // one time operation to initialize the dataIndex array if not
        this._initializeDataIndexesOrder();

        // copy over the properties from dataStore to viewStore
        assign(this._state, this._dataStore.getState());

        // update the variables array based on the viewIndexTodataIndexMap array
        this._state.variablesArray = this.getCurrentVariablesArray();

        this.emitChanged();
    }

    @autobind
    private _handleDefaultFilterChanged(scopeKey: number) {
        if (this._scopeKey !== scopeKey) {

            this._state.stopAutoFocus = true;

            if (!this._state.filter) {
                //  Means that release progress view created Variable Store without any scope key as default key (Release variables)
                //  so, we need to initialize the Filter for the env specific
                this._state.filter = new Filter();
            }

            //  Setting current filter state.
            this._state.filter.setState(this._getDefaultState(scopeKey), true);

            this._postFilterSetChanges();

            this._scopeKey = scopeKey;

            this.emitChanged();
        }
    }

    @autobind
    private _filter(filter: Filter) {

        this._state.stopAutoFocus = true;

        // set the filter to new one
        this._state.filter = filter;

        this._postFilterSetChanges();

        // update the variables array based on the viewIndexTodataIndexMap array
        this.emitChanged();
    }

    private _postFilterSetChanges(): void {
        // filter the variables
        this._filterVariables();
    }

    @autobind
    private _resetViewIndexToDataIndexMap() {
        this._state.viewIndexTodataIndexMap = null;
    }

    private _filterVariables() {

        // get the list of variables from dataStore
        let variables = this._dataStore.getCurrentVariablesArray();

        // get the indexes of the variables which satisfy the filter
        this._state.viewIndexTodataIndexMap = ProcessVariablesFilterUtility.filterVariables(variables, this._state.filter);

        this._state.variablesArray = this.getCurrentVariablesArray();
    }

    private _getDefaultState(scopeKey: number): IFilterState {
        let defaultState: IFilterState = null;

        if (scopeKey) {
            let defaultScopes: IScope[] = this._dataStore.getDefaultScopes(scopeKey);

            if (defaultScopes && defaultScopes.length > 0) {
                defaultState = { "keyword": { value: Utils_String.empty }, "scope": { value: defaultScopes } };
            }
        }

        return defaultState;
    }

    private _scopeKey: number;
    private _state: IProcessVariablesViewState;
    private _dataStore: ProcessVariablesStore;
    private _actionsHub: ProcessVariablesViewActions;
    private _filtersActionsHub: ProcessVariablesFilterActions;
}

