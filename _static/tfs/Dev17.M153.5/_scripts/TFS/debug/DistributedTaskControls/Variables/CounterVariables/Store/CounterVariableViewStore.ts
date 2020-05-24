import { CounterVariableActions } from "../Actions/CounterVariableActions";
import { ICounterVariableReference } from "../Types";
import { CounterVariableDataStore, ICounterVariableItem } from "./CounterVariableDataStore";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IEmptyActionPayload } from "DistributedTaskControls/Common/Actions/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { CounterVariableColumnKeys, VariableStoreKeys } from "DistributedTaskControls/Variables/Common/Constants";
import { IVariablesState } from "DistributedTaskControls/Variables/Common/DataStoreBase";
import { IVariable } from "DistributedTaskControls/Variables/Common/Types";
import { VariablesViewStoreBase } from "DistributedTaskControls/Variables/Common/ViewStoreBase";
import { ISortOptions } from "DistributedTaskControls/Variables/ProcessVariables/Actions/Actions";

import { autobind } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";
import { CounterVariableActionsCreator } from "../Actions/CounterVariableActionsCreator";

export interface ICounterVariableViewState extends IVariablesState {
    items: ICounterVariableItem[];

    isSortedDescending: boolean;
}

export class CounterVariableViewStore extends VariablesViewStoreBase {
    public initialize(): void {
        this._state = { items: [], isSortedDescending: false } as ICounterVariableViewState;

        this._dataStore = StoreManager.GetStore<CounterVariableDataStore>(CounterVariableDataStore);
        this._dataStore.addChangedListener(this._onDataStoreChanged);
        this._onDataStoreChanged();

        this._actionsHub = ActionsHubManager.GetActionsHub<CounterVariableActions>(CounterVariableActions);
        this._actionsHub.sort.addListener(this._sort);
    }

    public disposeInternal(): void {
        this._dataStore.removeChangedListener(this._onDataStoreChanged);

        this._actionsHub.sort.removeListener(this._sort);
    }

    public getState(): ICounterVariableViewState {
        return this._state;
    }

    public getCurrentVariablesArray(): IVariable[] {
        return [];
    }

    public getVariableNameCounts(): IDictionaryStringTo<number> {
        return this._dataStore.getVariableNameCounts();
    }

    public static getKey(): string {
        return VariableStoreKeys.StoreKey_CounterVariableViewStore;
    }

    @autobind
    private _sort(options: ISortOptions) {
        if (!!options) {
            if (options.columnKey === CounterVariableColumnKeys.Name) {
                this._state.items.sort((a: ICounterVariableReference, b: ICounterVariableReference) => {
                    const result = Utils_String.localeComparer(a.name, b.name);
                    return options.isSortedDescending ? -result : result;
                });
                this._state.isSortedDescending = options.isSortedDescending;

                this.emitChanged();
            }
        }
    }

    @autobind
    private _onDataStoreChanged(): void {
        this._updateState();
        this.emitChanged();
    }

    private _updateState(): void {
        this._state.items = this._dataStore.counters;
    }

    private _actionsHub: CounterVariableActions;

    private _state: ICounterVariableViewState;

    private _dataStore: CounterVariableDataStore;
}
