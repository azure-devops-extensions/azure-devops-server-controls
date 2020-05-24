/// <reference types="react" />

import React = require("react");

import { EnvironmentStore, getEnvironmentStore } from "Build/Scripts/Stores/Environment";

interface Props {
    onRender: (time: Date) => JSX.Element;
}

interface State {
    time: Date
}

class Component extends React.Component<Props, State> {
    private _environmentStore: EnvironmentStore = getEnvironmentStore();

    constructor(props: Props) {
        super(props);

        this.state = this._getState();
    }

    public render(): JSX.Element {
        return this.props.onRender(this.state.time);
    }

    public componentDidMount() {
        this._environmentStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount() {
        this._environmentStore.removeChangedListener(this._onStoresUpdated);
    }

    private _getState(): State {
        return {
            time: this._environmentStore.getTime()
        }
    }

    private _onStoresUpdated = (): void => {
        this.setState(this._getState());
    }
}

export function injectTime(onRender: (time: Date) => JSX.Element): JSX.Element {
    return <Component onRender={ onRender } />;
}
