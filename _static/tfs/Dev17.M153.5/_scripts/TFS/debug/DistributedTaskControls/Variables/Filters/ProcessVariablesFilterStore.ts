import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ViewStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { VariableStoreKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { ProcessVariablesFilterActions } from "DistributedTaskControls/Variables/Filters/ProcessVariablesFilterActions";
import { VariableConstants as DTCVariableConstants } from "DistributedTaskControls/Variables/Common/Constants";
import { IScope } from "DistributedTaskControls/Variables/Common/Types";
import { ProcessVariablesV2Store } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";
import { IState } from "DistributedTaskControls/Variables/ProcessVariablesV2/DataStore";
import { ListGridPivotViewActions } from "DistributedTaskControls/Variables/ProcessVariablesPivotView/ListGridPivotViewActions";
import { autobind } from "OfficeFabric/Utilities";

import { Filter, IFilterState } from "VSSUI/Utilities/Filter";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

export interface IProcessVariablesFilterState {
    filter: Filter;
    scopes: IScope[];
}

export interface IProcessVariablesFilterStoreArgs {
    scopeKey?: number;
}

export class ProcessVariablesFilterStore extends ViewStoreBase {

    public constructor(args?: IProcessVariablesFilterStoreArgs) {
        super();

        if (args) {
            this._scopeKey = args.scopeKey;
        }
    }

    public initialize(instanceId?: string): void {

        this._processVariablesStore = StoreManager.GetStore<ProcessVariablesV2Store>(ProcessVariablesV2Store, instanceId);
        let { scopes } = this._processVariablesStore.getState() as IState;

        this._processVariablesStore.addChangedListener(this._handleProcessVariablesStoreChanged);

        const filter = new Filter();
        this._state = { filter: filter, scopes: scopes } as IProcessVariablesFilterState;

        //  Set by default Filter state value
        this._setOnLoadFilterState(this._scopeKey);

        this._actionsHub = ActionsHubManager.GetActionsHub<ProcessVariablesFilterActions>(ProcessVariablesFilterActions, instanceId);
        this._actionsHub.filter.addListener(this._handleFilter);
        this._actionsHub.defaultFilterTrigger.addListener(this._handleDefaultFilterChanged);

        this._listGridPivotActionsHub = ActionsHubManager.GetActionsHub<ListGridPivotViewActions>(ListGridPivotViewActions, instanceId);
        this._listGridPivotActionsHub.selectPivot.addListener(this._handleSelectPivot);
    }

    public disposeInternal(): void {
        this._actionsHub.filter.removeListener(this._handleFilter);
        this._actionsHub.defaultFilterTrigger.removeListener(this._handleDefaultFilterChanged);
        this._listGridPivotActionsHub.selectPivot.removeListener(this._handleSelectPivot);
    }

    public getState(): IProcessVariablesFilterState {
        return this._state;
    }

    public static getKey(): string {
        return VariableStoreKeys.StoreKey_ProcessVariablesFilterStore;
    }

    public getSelectedView(): string {
        return this._seletedPivotKey;
    }

    public getDefaultScopes(): IScope[] {
        return this._processVariablesStore.getDefaultScopes(this._scopeKey);
    }

    public getActiveScopeKey(): number {
        return this._scopeKey;
    }

    private _setOnLoadFilterState(scopeKey: number) {
        if (scopeKey) {
            //  Only setting on load filter value, if coming from progress view, not from Editor
            this._state.filter.setState(this._getDefaultState(scopeKey));
        }
    }

    @autobind
    private _handleDefaultFilterChanged(scopeKey: number) {
        //  Setting current state with supression so that action within action does not occur
        if (this._scopeKey !== scopeKey && this._state.filter) {

            this._state.filter.setState(this._getDefaultState(scopeKey), true);
            this._scopeKey = scopeKey;

            this.emitChanged();
        }
    }

    @autobind
    private _handleFilter(filter: Filter) {
        this._state.filter = filter;
        this.emitChanged();
    }

    @autobind
    private _handleProcessVariablesStoreChanged() {
        let { scopes } = this._processVariablesStore.getState() as IState;
        this._state.scopes = scopes;
        this.emitChanged();
    }

    @autobind
    private _handleSelectPivot(key: string) {
        this._seletedPivotKey = key;
    }

    private _getDefaultState(scopeKey: number): IFilterState {
        let defaultState: IFilterState = null;

        if (scopeKey) {
            let defaultScopes: IScope[] = this._processVariablesStore.getDefaultScopes(scopeKey);

            if (defaultScopes && defaultScopes.length > 0) {
                defaultState = { "keyword": { value: Utils_String.empty }, "scope": { value: defaultScopes } };
            }
        }

        return defaultState;
    }

    private _actionsHub: ProcessVariablesFilterActions;
    private _state: IProcessVariablesFilterState;

    private _listGridPivotActionsHub: ListGridPivotViewActions;
    private _processVariablesStore: ProcessVariablesV2Store;

    private _seletedPivotKey: string = Utils_String.empty;
    private _scopeKey: number;
}

