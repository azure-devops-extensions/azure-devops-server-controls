import { HistoryActionsHub } from "Wiki/Scenarios/History/HistoryActionsHub";
import { SharedState, SharedStoresHub } from "Wiki/Scenarios/Shared/Stores/SharedStoresHub";

export interface AggregateState {
    sharedState: SharedState;
}

export class HistoryStoresHub implements IDisposable {

    constructor(
        private _sharedStoresHub: SharedStoresHub,
        private _actionsHub: HistoryActionsHub, ) {
    }

    public dispose(): void {
        this._sharedStoresHub = null;
        this._actionsHub = null;
    }

    public get state(): AggregateState {
        return {
            sharedState: this._sharedStoresHub.state,
        };
    }
}
