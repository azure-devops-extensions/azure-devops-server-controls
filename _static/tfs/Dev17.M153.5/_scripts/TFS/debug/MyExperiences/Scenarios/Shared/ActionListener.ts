import { Action } from "VSS/Flux/Action";

/*
* Takes care of listening and disposing actions
*/
export class ActionListener {
    private _disposeActions: Function[] = [];

    public addListener<TPayload>(action: Action<TPayload>, handle: (payload: TPayload) => void): void {
        action.addListener(handle);
        this._disposeActions.push(() => action.removeListener(handle));
    }

    public disposeActions(): void {
        if (this._disposeActions) {
            this._disposeActions.map(dispose => dispose());
            this._disposeActions = undefined;
        }
    }
}
