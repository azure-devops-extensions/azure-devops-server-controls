// Copyright (c) Microsoft Corporation.  All rights reserved.
import * as StoreCommonBase from "DistributedTaskControls/Common/Stores/Base";

import Model = require("DistributedTask/Scripts/DT.VariableGroup.Model");
import Library_Actions = require("DistributedTask/Scripts/Actions/LibraryActions");
import { LibraryStoreKeys } from "DistributedTask/Scripts/Constants";
import { PerfTelemetryManager, TelemetryScenarios } from "DistributedTask/Scripts/Utils/TelemetryUtils";

import * as Utils_Array from "VSS/Utils/Array";

export class VariableGroupListStore extends StoreCommonBase.StoreBase {

    public static getKey(): string {
        return LibraryStoreKeys.StoreKey_VariableGroupListStore;
    }

    public initialize(): void {
        Library_Actions.getVariableGroups.addListener(this.onGetVariableGroups, this);
        Library_Actions.deleteVariableGroup.addListener(this.onDeleteVariableGroup, this);
    }

    protected disposeInternal(): void {
        Library_Actions.getVariableGroups.removeListener(this.onGetVariableGroups);
        Library_Actions.deleteVariableGroup.removeListener(this.onDeleteVariableGroup);

        this._data = null;
    }

    public getData(): Model.VariableGroup[] {
        return this._data;
    }

    public getLastDeletedRowIndex(): number {
        return this._lastDeletedRowIndex;
    }

    public setData(variableGroups: Model.VariableGroup[]): void {
        this._data = variableGroups;
        this.emitChanged();
    }

    private onGetVariableGroups(variableGroups: Model.VariableGroup[]): void {
        this._data = variableGroups;
        PerfTelemetryManager.instance.endScenario(TelemetryScenarios.getVariableGroups);

        this.emitChanged();
    }

    private onDeleteVariableGroup(variableGroupId: number): void {
        if (!this._data) {
            this._data = [];
        }

        this._lastDeletedRowIndex = Utils_Array.findIndex(this._data, obj => (obj.id === variableGroupId));
        this._data = this._data.filter(variableGroup => variableGroup.id !== variableGroupId);
        PerfTelemetryManager.instance.endScenario(TelemetryScenarios.deleteVariableGroup);
        this.emitChanged();
    }

    private _data: Model.VariableGroup[];
    private _lastDeletedRowIndex: number = -1;
}
