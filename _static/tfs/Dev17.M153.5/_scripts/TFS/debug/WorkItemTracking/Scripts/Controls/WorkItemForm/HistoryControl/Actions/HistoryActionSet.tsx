import TFS_React = require("Presentation/Scripts/TFS/TFS.React");
import { WorkItemHistory } from "WorkItemTracking/Scripts/OM/History/WorkItemHistory";

export interface IWorkItemHistoryPayload {
    history: WorkItemHistory;
}

export interface IHistoryUpdateFailurePayload {
    error: any;
}

export class HistoryActionSet {
    private _workItemHistoryUpdateCompleted: TFS_React.Action<IWorkItemHistoryPayload>;
    private _workItemHistoryUpdateStarted: TFS_React.Action<any>;
    private _workItemHistoryUpdateFailed: TFS_React.Action<IHistoryUpdateFailurePayload>;
    private _workItemHistoryClear: TFS_React.Action<any>;

    constructor() {
        this._workItemHistoryUpdateCompleted = new TFS_React.Action<IWorkItemHistoryPayload>();
        this._workItemHistoryUpdateStarted = new TFS_React.Action<any>();
        this._workItemHistoryUpdateFailed = new TFS_React.Action<IHistoryUpdateFailurePayload>();
        this._workItemHistoryClear = new TFS_React.Action<any>();
    }

    public workItemHistoryUpdateCompleted(): TFS_React.Action<IWorkItemHistoryPayload> {
        return this._workItemHistoryUpdateCompleted;
    }

    public workItemHistoryUpdateStarted(): TFS_React.Action<any> {
        return this._workItemHistoryUpdateStarted;
    }

    public workItemHistoryUpdateFailed(): TFS_React.Action<IHistoryUpdateFailurePayload> {
        return this._workItemHistoryUpdateFailed;
    }

    public workItemHistoryClear(): TFS_React.Action<any> {
        return this._workItemHistoryClear;
    }
}