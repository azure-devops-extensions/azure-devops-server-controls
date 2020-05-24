export class CallbackHub<TPayload> {
    private changedCallbacks: ((TPayload) => void)[] = [];

    public subscribe(callback: (TPayload) => void) {
        this.changedCallbacks.push(callback);
    }

    public trigger(payload: TPayload) {
        this.changedCallbacks.forEach(callback => callback(payload));
    }
}