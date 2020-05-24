import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ProcessVariablesStore } from "DistributedTaskControls/Variables/ProcessVariables/DataStore";
import { VariableStoreKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { IState } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";
import { ProcessVariablesGridViewUtility, IVariablesGridViewState, ILinkedVariable } from "DistributedTaskControls/Variables/ProcessVariableGridView/ProcessVariablesGridViewUtility";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ProcessVariablesFilterActions } from "DistributedTaskControls/Variables/Filters/ProcessVariablesFilterActions";
import { VariablesGridActions } from "DistributedTaskControls/Variables/ProcessVariableGridView/VariablesGridActions";

import { autobind } from "OfficeFabric/Utilities";

import { Filter, IFilterState } from "VSSUI/Utilities/Filter";
import * as Utils_String from "VSS/Utils/String";

export interface IVariablesGridViewStoreArgs {
    scopeKey?: number;
}

export class VariablesGridViewStore extends ViewStoreBase {

    constructor(args?: IVariablesGridViewStoreArgs) {
        super();

        if (args) {
            this._scopeKey = args.scopeKey;
        }
    }

    public initialize(instanceId?: string): void {

        this._state = {} as IVariablesGridViewState;

        this._variablesGridActionsHub = ActionsHubManager.GetActionsHub<VariablesGridActions>(VariablesGridActions, instanceId);
        this._variablesGridActionsHub.setEditVariableInProgessDataIndex.addListener(this._handleSetEditVariableInProgessDataIndex);
        this._variablesGridActionsHub.unsetEditVariableInProgessDataIndex.addListener(this._handleUnsetEditVariableInProgessDataIndex);

        this._filtersActionsHub = ActionsHubManager.GetActionsHub<ProcessVariablesFilterActions>(ProcessVariablesFilterActions, instanceId);
        this._filtersActionsHub.filter.addListener(this._filter);
        this._filtersActionsHub.defaultFilterTrigger.addListener(this._handleDefaultFilterChanged);

        this._dataStore = StoreManager.GetStore<ProcessVariablesStore>(ProcessVariablesStore, instanceId);
        this._dataStore.addChangedListener(this._onDataStoreChanged);

        this._setDefaultFilterOnLoad();

        this._onDataStoreChanged();
    }

    public getState(): IVariablesGridViewState {
        return this._state;
    }

    public disposeInternal(): void {
        this._dataStore.removeChangedListener(this._onDataStoreChanged);
        this._filtersActionsHub.filter.removeListener(this._filter);
        this._filtersActionsHub.defaultFilterTrigger.removeListener(this._handleDefaultFilterChanged);
        this._variablesGridActionsHub.setEditVariableInProgessDataIndex.removeListener(this._handleSetEditVariableInProgessDataIndex);
        this._variablesGridActionsHub.unsetEditVariableInProgessDataIndex.removeListener(this._handleUnsetEditVariableInProgessDataIndex);
    }

    public static getKey(): string {
        return VariableStoreKeys.StoreKey_VariablesGridViewStore;
    }

    @autobind
    private _onDataStoreChanged() {
        this._reDrawGrid();
        this.emitChanged();
    }

    @autobind
    private _handleDefaultFilterChanged(scopeKey: number) {
        if (this._scopeKey !== scopeKey) {

            if (!this._state.filter) {
                //  Means that release progress view created Variable Store without any scope key as default key (Release variables)
                //  so, we need to initialize the Filter for the env specific
                this._state.filter = new Filter();
            }

            //  Setting current filter state.
            this._state.filter.setState(this._getDefaultState(scopeKey), true);

            this._reDrawGrid();

            this._scopeKey = scopeKey;

            this.emitChanged();
        }
    }

    @autobind
    private _filter(filter: Filter) {
        this._state.filter = filter;
        this._reDrawGrid();
        this.emitChanged();
    }

    private _reDrawGrid() {
        let { scopes, variablesArray } = this._dataStore.getState() as IState;

        this._state.scopes = scopes;

        // create the column headers for the grid based on the scopes and filter
        this._state.headers = ProcessVariablesGridViewUtility.getColumnHeaders(this._state.scopes, this._state.filter);

        // create the grid data based on the variables, scopes and the filter
        this._state.gridViewData = ProcessVariablesGridViewUtility.getVariablesGridViewMetaData(variablesArray, this._state.scopes, this._state.filter, this._editInProgressVariableDataIndex);

    }

    private _setDefaultFilterOnLoad(): void {
        if (this._scopeKey) {
            //  Only set these values if scope key is passed, which is the progress scenario. Editor will not pass this.

            this._state.filter = new Filter();

            //  Set new filter
            this._state.filter.setState(this._getDefaultState(this._scopeKey));

            // Post filter set changes, like filtering variables etc.
            this._reDrawGrid();
        }
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

    @autobind
    private _handleSetEditVariableInProgessDataIndex(dataIndex: number) {
        this._editInProgressVariableDataIndex = dataIndex;
    }

    @autobind
    private _handleUnsetEditVariableInProgessDataIndex() {
        delete this._editInProgressVariableDataIndex;
    }

    private _scopeKey: number;
    private _state: IVariablesGridViewState;
    private _dataStore: ProcessVariablesStore;
    private _editInProgressVariableDataIndex: number;

    private _filtersActionsHub: ProcessVariablesFilterActions;
    private _variablesGridActionsHub: VariablesGridActions;
}

