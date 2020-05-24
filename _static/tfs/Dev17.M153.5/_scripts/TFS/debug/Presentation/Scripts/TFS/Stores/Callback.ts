export type Listener<TPayload> = (payload: TPayload) => void;

/**
 * A simple callback wrapper to avoid null-checking in consuming code.
 */
export class Callback<T> {
    private _callback: Listener<T> = null;

    /**
     * Register a callback.
     * @param callback The function to be executed.
     * @param thisArg The context that will be bound to `this` in the callback.
     */
    public register(callback: Listener<T>, thisArg: any = null) {
        this._callback = thisArg ? callback.bind(thisArg) : callback;
    }

     /**
     * Unregister a callback.  Used to reclaim memory.
     */
    public unregister() {
        this._callback = null;
    }

    /**
     * Invoke the callback, if it's non-null.
     * @param payload The payload to be passed to the callback.
     */
    public invoke(payload: T) {
        if (this._callback) {
            this._callback(payload);
        }
    }
}
