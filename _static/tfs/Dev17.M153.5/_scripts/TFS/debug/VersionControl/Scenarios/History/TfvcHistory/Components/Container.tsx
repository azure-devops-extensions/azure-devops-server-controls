/// <reference types="react" />
import * as React from "react";
import { Store } from "VSS/Flux/Store";

/**
 * Base container class that listens to one or more stores given by props.
 */
export abstract class Container<TProps, TState> extends React.Component<TProps, TState> {
    constructor(props: TProps) {
        super(props);

        this.state = this.getStateFromStores(props);
    }

    public componentDidMount(): void {
        for (const store of this._getStores()) {
            store.addChangedListener(this._onStoreChanged);
        }
    }

    public componentWillUnmount(): void {
        for (const store of this._getStores()) {
            store.removeChangedListener(this._onStoreChanged);
        }
    }

    protected abstract getStateFromStores(props: TProps): TState;

    private _onStoreChanged = (): void => {
        this.setState(this.getStateFromStores(this.props));
    }

    private _getStores(): Store[] {
        return getObjectValues(this.props).filter(value => value instanceof Store);
    }
}

function getObjectValues(object: any): any[] {
    return Object.keys(object).map(key => object[key]);
}
