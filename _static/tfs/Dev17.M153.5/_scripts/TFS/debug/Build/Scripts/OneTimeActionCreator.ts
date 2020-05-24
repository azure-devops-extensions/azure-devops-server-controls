import {Action} from "VSS/Flux/Action";

export class OneTimeActionCreator<T> {
    private _invoked: boolean = false;
    private _action: Action<T> = null;

    constructor(action: Action<T>) {
        this._action = action;
    }

    public invoke(payloadGenerator: () => T): void {
        if (!this._invoked) {
            this._invoked = true;

            if (this._action) {
                let payload: T = payloadGenerator();
                this._action.invoke(payload);
            }
        }
    }

    public reset(): void {
        this._invoked = false;
    }
}