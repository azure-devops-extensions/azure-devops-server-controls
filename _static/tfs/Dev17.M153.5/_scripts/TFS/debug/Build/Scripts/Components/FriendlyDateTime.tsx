/// <reference types="react" />

import React = require("react");

import { EnvironmentStore, getEnvironmentStore } from "Build/Scripts/Stores/Environment";

import * as Utils_Date from "VSS/Utils/Date";

export interface Props {
    time: Date;
}

export interface State {
    // not actually used, because Utils_Date.friendly figures it out
    time: Date
}

export class Component extends React.Component<Props, State> {
    private _environmentStore: EnvironmentStore = getEnvironmentStore();

    constructor(props: Props) {
        super(props);

        this.state = this._getState();
    }

    public render(): JSX.Element {
        if (this.props.time) {
            let title = Utils_Date.localeFormat(this.props.time, "f");
            return <span title={title} aria-label={title}>{Utils_Date.friendly(this.props.time)}</span>;
        }
        else {
            return null;
        }
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
