
import Store_Base = require("VSS/Flux/Store");

import Actions_Usage = require("Utilization/Scripts/Actions/UsageActions");
import { CommandUsage, UsageSummaryQueryCriteria } from "Utilization/Scripts/Generated/Contracts";

export class UsageStore extends Store_Base.RemoteStore {
    private _data: CommandUsage[];
    private _queryCriteria: UsageSummaryQueryCriteria;

    constructor() {
        super();
        Actions_Usage.StartDataFetch.addListener(this._onStartDataFetch, this);
        Actions_Usage.DataLoad.addListener(this._onLoad, this);
        Actions_Usage.DataLoadError.addListener(this.onError, this);
    }

    public getData(): CommandUsage[] {
        return this._data;
    }

    public getQueryCriteria(): UsageSummaryQueryCriteria {
        return this._queryCriteria;
    }

    protected _onStartDataFetch(queryCriteria: UsageSummaryQueryCriteria): void {
        this._data = null;
        this._queryCriteria = queryCriteria;
        this._error = null;
        this.emitChanged();
    }

    protected _onLoad(payload: { data: CommandUsage[], queryCriteria: UsageSummaryQueryCriteria }): void {
        this._data = payload.data;
        this._queryCriteria = payload.queryCriteria;
        this.emitChanged();
    }

    protected onError(error: any): void {
        this._data = null;
        this._queryCriteria = null;
        super.onError(error);
    }
}

export var UsageData = new UsageStore();
