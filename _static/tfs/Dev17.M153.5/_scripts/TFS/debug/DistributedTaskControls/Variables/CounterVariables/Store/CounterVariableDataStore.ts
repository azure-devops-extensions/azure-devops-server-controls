import { NamedCounterVariables, CounterVariableList, ICounterVariable, ICounterVariableReference } from "../Types";
import { CounterVariableActions, IVariableAtIndexUpdate } from "../Actions/CounterVariableActions";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { IEmptyActionPayload, } from "DistributedTaskControls/Common/Actions/Base";
import { ChangeTrackerStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { IVariableKeyPayload, IVariableValuePayload } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { VariableStoreKeys, CounterVariableColumnKeys } from "DistributedTaskControls/Variables/Common/Constants";

import { autobind } from "OfficeFabric/Utilities";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { CounterVariablesUtils, ICounterVariableValidation } from "../Utils";

export interface ICounterVariableItem extends ICounterVariableReference {
    hasVariableBeenUpdatedByUser: boolean;

    hasValueBeenReset: boolean;
}

export class CounterVariableDataStore extends ChangeTrackerStoreBase {
    constructor() {
        super();

        this._actionsHub = ActionsHubManager.GetActionsHub<CounterVariableActions>(CounterVariableActions);

        this._originalCounters = [];
        this._currentCounters = [];
    }

    public static getKey(): string {
        return VariableStoreKeys.StoreKey_CounterVariableDataStore;
    }

    public initialize(): void {
        this._actionsHub.setVariables.addListener(this._replaceVariables);
        this._actionsHub.addVariable.addListener(this._addVariable);
        this._actionsHub.deleteVariable.addListener(this._deleteVariable);
        this._actionsHub.updateVariableName.addListener(this._updateVariableName);
        this._actionsHub.updateVariableSeed.addListener(this._updateVariableSeed);
        this._actionsHub.resetVariableValue.addListener(this._resetVariableValue);
    }

    protected disposeInternal(): void {
        this._actionsHub.setVariables.removeListener(this._replaceVariables);
        this._actionsHub.addVariable.removeListener(this._addVariable);
        this._actionsHub.deleteVariable.removeListener(this._deleteVariable);
        this._actionsHub.updateVariableName.removeListener(this._updateVariableName);
        this._actionsHub.updateVariableSeed.removeListener(this._updateVariableSeed);
        this._actionsHub.resetVariableValue.removeListener(this._resetVariableValue);

        this._originalCounters = null;
        this._currentCounters = null;
    }

    public isDirty(): boolean {
        if (this._currentCounters.length !== this._originalCounters.length) {
            return true;
        }

        return !Utils_Array.arrayEquals(
            this._currentCounters,
            this._originalCounters,
            (a: ICounterVariableItem, b: ICounterVariableItem) => {
                return a.name === b.name &&
                    a.counter.seed === b.counter.seed &&
                    a.counter.value === b.counter.value;
            });
    }

    public isValid(): boolean {
        if (this._currentCounters.length > 0) {
            const nameCounts = this.getVariableNameCounts();

            return !this._currentCounters
                .map((variable: ICounterVariableItem) => {
                    if (variable.hasVariableBeenUpdatedByUser) {
                        const nameValidation = CounterVariablesUtils.validateName(variable, nameCounts);
                        if (nameValidation.hasError) {
                            return nameValidation;
                        }
                    }

                    return CounterVariablesUtils.validateSeed(variable.counter);
                })
                .some((validation: ICounterVariableValidation) => validation.hasError);
        }

        return true;
    }

    public get counters(): ICounterVariableItem[] {
        return this._currentCounters;
    }

    public getVariableNameCounts(): IDictionaryStringTo<number> {
        return this._currentCounters
            .map(item => item.name.trim().toLowerCase())
            .reduce(
                (acc: IDictionaryStringTo<number>, cur: string, idx: number, arr: string[]) => {
                    acc[cur] = 1 + (acc[cur] || 0);
                    return acc;
                },
                {});
    }

    @autobind
    private _replaceVariables(counters: IDictionaryStringTo<ICounterVariable>): void {
        this._currentCounters = Object.keys(counters).map((name) => ({
            name: name,
            hasValueBeenReset: false,
            hasVariableBeenUpdatedByUser: false,
            counter: counters[name]
        }));

        this._originalCounters = this._currentCounters.map(x => ({
            counter: {
                id: x.counter.id,
                seed: x.counter.seed,
                value: x.counter.value
            },
            hasValueBeenReset: x.hasValueBeenReset,
            hasVariableBeenUpdatedByUser: x.hasVariableBeenUpdatedByUser,
            name: x.name
        }));
        this.emitChanged();
    }

    @autobind
    private _addVariable(): void {
        if (Utils_Array.findIndex(this._currentCounters, (counter) => counter.name === Utils_String.empty) === -1) {
            this._currentCounters.push({
                name: Utils_String.empty,
                counter: { id: 0, seed: "0", value: "0" },
                hasValueBeenReset: true,                // starting with `true` causes Value to update if they edit Seed before save
                hasVariableBeenUpdatedByUser: true
            });
            this.emitChanged();
        }
    }

    @autobind
    private _deleteVariable(payload: IVariableKeyPayload): void {
        this._currentCounters.splice(payload.index, 1);
        this.emitChanged();
    }

    @autobind
    private _updateVariableName(update: IVariableAtIndexUpdate) {
        this._currentCounters[update.index].name = update.newValue;
        this._currentCounters[update.index].hasVariableBeenUpdatedByUser = true;
        this.emitChanged();
    }

    @autobind
    private _updateVariableSeed(update: IVariableAtIndexUpdate) {
        this._currentCounters[update.index].counter.seed = update.newValue;
        this._currentCounters[update.index].hasVariableBeenUpdatedByUser = true;

        if (this._currentCounters[update.index].hasValueBeenReset || this._currentCounters[update.index].counter.value < update.newValue) {
            this._currentCounters[update.index].counter.value = update.newValue;
        }

        this.emitChanged();
    }

    @autobind
    private _resetVariableValue(index: number) {
        this._currentCounters[index].counter.value = this._currentCounters[index].counter.seed;
        this._currentCounters[index].hasVariableBeenUpdatedByUser = true;
        this._currentCounters[index].hasValueBeenReset = true;
        this.emitChanged();
    }

    private _actionsHub: CounterVariableActions;

    private _originalCounters: ICounterVariableItem[];
    private _currentCounters: ICounterVariableItem[];
}
