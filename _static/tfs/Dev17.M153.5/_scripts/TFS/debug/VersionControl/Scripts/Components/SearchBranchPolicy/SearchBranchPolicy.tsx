/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { autobind } from "OfficeFabric/Utilities";
import { BranchDetailsList } from "VersionControl/Scripts/Components/SearchBranchPolicy/BranchDetailsList";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { ActionCreator } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionCreator";
import { StoresHub } from "VersionControl/Scripts/Components/SearchBranchPolicy/StoresHub";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { Fabric } from "OfficeFabric/Fabric";

import "VSS/LoaderPlugins/Css!VersionControl/SearchBranchPolicy";

export interface SearchBranchPolicyProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    maxNoOFConfigurableBranchesForSearch: number;
}

export interface SearchBranchPolicyState {
    repositoryContext: GitRepositoryContext;
}

export function renderSearchBranchUX(container: any, repositoryContext: GitRepositoryContext, maxNoOFConfigurableBranchesForSearch: number) {
    let props: SearchBranchPolicyProps = {
        actionCreator: ActionCreator.getInstance(),
        storesHub: StoresHub.getInstance(),
        maxNoOFConfigurableBranchesForSearch: maxNoOFConfigurableBranchesForSearch
    } as SearchBranchPolicyProps;

    ReactDOM.render(<SearchBranchPolicy {...props} />, container);
}

export function updateSearchBranchUX(repositoryContext: GitRepositoryContext, isRepoForksEnabled: boolean) {
    ActionCreator.getInstance().updateRepositoryContext(repositoryContext, isRepoForksEnabled);
}

/**
 * React layer to render search multibranch configuration ux.
 */
export class SearchBranchPolicy extends React.Component<SearchBranchPolicyProps, SearchBranchPolicyState> {
    private _viewState: SearchBranchPolicyState;

    constructor(props: SearchBranchPolicyProps) {
        super(props);
        this._viewState = {
            repositoryContext: null
        } as SearchBranchPolicyState;
        this.state = this._viewState;
    }

    public componentDidMount(): void {
        this.props.storesHub.repositoryContextStore.
            addChangedListener(this._onRepositoryContextStoreChanged);
    }

    public componentWillUnMount(): void {
        this.props.storesHub.repositoryContextStore.
            removeChangedListener(this._onRepositoryContextStoreChanged);
    }

    public render(): JSX.Element {
        return (
            <div>
                {
                    this.state.repositoryContext &&
                    <div className="search-branch-ux-container">
                        <Fabric>
                            <div className="search-branch-policy-container" role="region" aria-label={VCResources.SearchBranchUxTitle}>
                                <div className="search-branch-policy-title"> {VCResources.SearchBranchUxTitle}</div>
                                <BranchDetailsList
                                    actionCreator={this.props.actionCreator}
                                    storesHub={this.props.storesHub}
                                    repositoryContext={this.state.repositoryContext}
                                    maxNoOFConfigurableBranchesForSearch={this.props.maxNoOFConfigurableBranchesForSearch} />
                            </div>
                        </Fabric>
                    </div>
                }
            </div>
        );
    }

    @autobind
    private _onRepositoryContextStoreChanged(): void {
        let repositoryContext: GitRepositoryContext = this.props.storesHub.repositoryContextStore.getRepositoryContext();
        this._viewState.repositoryContext = repositoryContext;
        this.setState(this._viewState);
    }
}