/// <reference types="react" />

import React = require("react");
import VSS_Events = require("VSS/Events/Services");

// TODO: this Action is identical to the one in VSSPreview/Flux/Actions. convert VC to use that one
export class Action<T> {
    private static DefaultScope = "Default";

    // A mutex to ensure that only one action is executing at any time. 
    // This prevents cascading actions.
    private static Executing: IDictionaryStringTo<boolean> = {};

    private _scope: string;
    private _listeners: ((payload: T) => void)[] = [];

    constructor(scope?: string) {
        this._scope = scope || Action.DefaultScope;
    }

    public invoke(payload: T): void {
        if (Action.Executing[this._scope]) {
            throw new Error("Cannot invoke an action from inside another action.");
        }

        Action.Executing[this._scope] = true;

        try {
            this._listeners.forEach((listener: (payload: T) => void) => {
                listener(payload);
            });
        }
        finally {
            Action.Executing[this._scope] = false;
        }
    }

    public addListener(listener: (payload: T) => void, context?: any): void {
        this._listeners.push(context ? listener.bind(context) : listener);
    }
}

export interface IStoreOptions {
    eventManager?: VSS_Events.EventService;
}

export class Store {
    private _eventManager: VSS_Events.EventService;
    private _changedEvent: string;

    constructor(changedEvent: string, options?: IStoreOptions) {
        this._changedEvent = changedEvent;
        this._eventManager = (options && options.eventManager) ? options.eventManager : VSS_Events.getService();
    }

    public addChangedListener(handler: IEventHandler) {
        this.addListener(this._changedEvent, handler);
    }

    public removeChangedListener(handler: IEventHandler) {
        this.removeListener(this._changedEvent, handler);
    }

    protected emitChanged(data?: any): void {
        this.emit(this._changedEvent, this, data);
    }

    protected emit(eventName: string, sender: any, data?: any): void {
        this._eventManager.fire(eventName, sender, data);
    }

    protected addListener(eventName: string, handler: IEventHandler): void {
        this._eventManager.attachEvent(eventName, handler);
    }

    protected removeListener(eventName: string, handler: IEventHandler): void {
        this._eventManager.detachEvent(eventName, handler);
    }
}

export interface IProps {
    key?: any;
}

export interface IState {
}

export interface ITfsComponentState extends IState {
}

export interface ITfsComponentProps extends IProps {
    containerCssClass?: string;
}

export interface ITfsComponentOptions {
}

export class TfsComponent<TProps extends ITfsComponentProps, TState extends ITfsComponentState> extends React.Component<TProps, TState> {
    constructor(props: TProps, options?: ITfsComponentOptions) {
        super(props);
    }

    public render(): JSX.Element {
        var props: any = {
            "ref": (d: HTMLElement) => this.onRender(d)
        };

        if (this.props.containerCssClass) {
            props["className"] = this.props.containerCssClass;
        }

        return React.createElement("div", props);
    }

    protected onRender(element: HTMLElement) {
    }
}
