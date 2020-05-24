import { Action } from "VSS/Flux/Action";
import { EventHandlerList, NamedEventCollection } from "VSS/Events/Handlers";

export interface IStore {
    addChangedListener(handler: IEventHandler): void;
    removeChangedListener(handler: IEventHandler): void;
    addListener(eventName: string, handler: IEventHandler): void;
    removeListener(eventName: string, handler: IEventHandler): void;
}

export class Store implements IStore {
    private _changedHandlers = new EventHandlerList();
    private _namedEventCollection = new NamedEventCollection<any, any>();

    public addChangedListener(handler: IEventHandler): void {
        this._changedHandlers.subscribe(handler as any);
    }

    public removeChangedListener(handler: IEventHandler): void {
        this._changedHandlers.unsubscribe(handler as any);
    }

    protected emitChanged(): void {
        this._changedHandlers.invokeHandlers(this);
    }

    protected emit(eventName: string, sender: any, data?: any): void {
        this._namedEventCollection.invokeHandlers(eventName, sender, data);
    }

    public addListener(eventName: string, handler: IEventHandler): void {
        this._namedEventCollection.subscribe(eventName, handler as any);
    }

    public removeListener(eventName: string, handler: IEventHandler): void {
        this._namedEventCollection.unsubscribe(eventName, handler as any);
    }
}

export class DefaultStore<T> extends Store {
    protected _value: T;

    constructor() {
        super();
        var action = this.getAction();
        if (action !== null) {
            action.addListener(this.onChange, this);
        }
    }

    protected getAction(): Action<T> {
        return null;
    }

    protected onChange(payload: T): void {
        this._value = payload;
        this.emitChanged();
    }

    public getValue(): T {
        return this._value;
    }
}

export class RemoteStore extends Store {
    protected _error: any;
    protected _loading: boolean;

    constructor() {
        super();
        this._loading = true;
        this._error = null;
    }

    public isLoading(): boolean {
        return this._loading;
    }

    public hasError(): boolean {
        return this._error !== null;
    }

    public getError(): any {
        return this._error;
    }

    protected onError(error: any): void {
        this._error = error;
        this.emitChanged();
    }
}
