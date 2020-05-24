import { Action } from "VSS/Flux/Action";

export class ActionsHub {
    constructor(private _scope?: string) {

    }

    public createAction<T>(): Action<T> {
        return new Action<T>(this._scope);
    }
}