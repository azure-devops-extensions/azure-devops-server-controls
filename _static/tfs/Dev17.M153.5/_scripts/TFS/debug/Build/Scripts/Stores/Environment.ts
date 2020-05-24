import {timerTicked} from "Build/Scripts/Actions/Environment";

import {Store} from "VSS/Flux/Store";

export class EnvironmentStore extends Store {
    private _time: Date = new Date();

    constructor() {
        super();

        timerTicked.addListener((payload) => {
            this._time = payload.time;

            this.emitChanged();
        });
    }

    public getTime(): Date {
        return this._time;
    }
}

let _environmentStore: EnvironmentStore = new EnvironmentStore();
export function getEnvironmentStore(): EnvironmentStore {
    return _environmentStore;
}