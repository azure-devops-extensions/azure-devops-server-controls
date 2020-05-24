import { realtimeConnectionUpdated } from "Build/Scripts/Actions/Realtime";

import { Store as BaseStore } from "VSS/Flux/Store";

export class RealtimeStore extends BaseStore {
    private _isConnected: boolean = false;
    private _isErrorCondition: boolean = false;

    constructor() {
        super();

        realtimeConnectionUpdated.addListener((payload) => {
            this._isConnected = payload.isConnected;
            this._isErrorCondition = payload.isErrorCondition;

            this.emitChanged();
        });
    }

    public isConnected(): boolean {
        return this._isConnected;
    }

    public isErrorCondition(): boolean {
        return this._isErrorCondition;
    }
}

let _realtimeStore: RealtimeStore = null;
export function getRealtimeStore(): RealtimeStore {
    if (!_realtimeStore) {
        _realtimeStore = new RealtimeStore();
    }
    return _realtimeStore;
}