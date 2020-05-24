/// <reference types="react" />

import React = require("react");
import Store_Base = require("VSS/Flux/Store");
import Utils_Core = require("VSS/Utils/Core");

export interface Props extends React.Props<any> {
    cssClass?: string;
}

export interface State {
}

var keySeed = 0;

export class Component<TProps extends Props, TState extends State = {}> extends React.Component<TProps, TState> {
    private _changeDelegate: Function;

    constructor(props?: TProps, context?: any) {
        super(props, context);

        this.state = this.getState();
        this._changeDelegate = Utils_Core.delegate(this, this.onChange);
    }

    protected getKey(name: string): string {
        keySeed += 1;
        return `${name}${keySeed}`;
    }

    protected getState(): TState {
        return null;
    }

    protected onChange(): void {
        var newState = this.getState();
        this.setState(newState);
    }

    protected getStore(): Store_Base.Store {
        return null;
    }

    public componentDidMount() {
        let store = this.getStore();
        if (store) {
            // Attach to store listener
            store.addChangedListener(this._changeDelegate);
        }
    }

    public componentWillUnmount() {
        let store = this.getStore();
        if (store) {
            // Detach from store listener
            store.removeChangedListener(this._changeDelegate);
        }
    }
}
