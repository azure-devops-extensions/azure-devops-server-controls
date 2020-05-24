/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");

import {QueryResult} from "Build/Scripts/QueryResult";
import {SourceProviderStore, getSourceProviderStore} from "Build/Scripts/Stores/SourceProvider";
import {SourceProviderManager} from "Build/Scripts/SourceProviderManager";

interface Props {
    onRender: (sourceProviderManager: QueryResult<SourceProviderManager>) => JSX.Element;
}

interface State {
    sourceProviderManager: QueryResult<SourceProviderManager>;
}

class SourceProviderComponent extends React.Component<Props, State> {
    private _sourceProviderStore: SourceProviderStore;

    constructor(props: any) {
        super(props);

        this._sourceProviderStore = getSourceProviderStore();

        this.state = {
            sourceProviderManager: this._sourceProviderStore.getSourceProviderManager()
        };
    }

    public render(): JSX.Element {
        return this.props.onRender(this.state.sourceProviderManager);
    }

    public componentDidMount(): void {
        this._sourceProviderStore.addChangedListener(this._onStoresUpdated);
    }

    public componentWillUnmount(): void {
        this._sourceProviderStore.removeChangedListener(this._onStoresUpdated);
    }

    private _onStoresUpdated = () => {
        this.setState({
            sourceProviderManager: this._sourceProviderStore.getSourceProviderManager()
        });
    }
}

export function injectSourceProvider(onRender: (sourceProviderManager: QueryResult<SourceProviderManager>) => JSX.Element): JSX.Element {
    return <SourceProviderComponent onRender={ onRender } />;
}
