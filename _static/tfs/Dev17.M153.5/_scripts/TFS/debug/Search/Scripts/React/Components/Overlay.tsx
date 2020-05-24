/// copyright (c) microsoft corporation. all rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { Spinner, SpinnerType } from "OfficeFabric/Spinner";
import { StoresHub } from "Search/Scripts/React/StoresHub";
import { autobind } from 'OfficeFabric/Utilities';
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import "VSS/LoaderPlugins/Css!Search/React/Components/Overlay";

export interface IOverlayProps {
    storesHub: StoresHub;
}

export interface IOverlayState {
    searchInProgress: boolean;
}

export class Overlay extends React.Component<IOverlayProps, IOverlayState> {
    constructor(props: IOverlayProps) {
        super(props);
        this.state = {
            searchInProgress: this.props.storesHub.searchActionStore.state.excecuting
        }
    }

    public render(): JSX.Element {
        if (this.state.searchInProgress) {
            return (
                <div className="search-inprogress-overlay">
                    <Spinner
                        className="spinner"
                        label={Search_Resources.Loading} type={SpinnerType.large} />
                </div>);
        }
        else {
            return <div />;
        }
    }

    public componentDidMount(): void {
        this.props.storesHub.searchActionStore.addChangedListener(this._onSearchResultsUpdated);
    }

    @autobind
    private _onSearchResultsUpdated(): void {
        this.setState({
            searchInProgress: this.props.storesHub.searchActionStore.state.excecuting
        });
    }
}