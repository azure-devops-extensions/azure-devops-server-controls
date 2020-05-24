/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import { DefaultButton } from "OfficeFabric/Button";
import { autobind, css } from 'OfficeFabric/Utilities';
import { IncludeBranchDialogBox } from "VersionControl/Scripts/Components/SearchBranchPolicy/IncludeBranchDialogBox";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { ActionCreator } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionCreator";
import { StoresHub } from "VersionControl/Scripts/Components/SearchBranchPolicy/StoresHub";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { ErrorStateEnum } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionsHub";

import "VSS/LoaderPlugins/Css!VersionControl/IncludeBranchButton";

export interface IncludeBranchButtonProps {
    repositoryContext: GitRepositoryContext;
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    maxNoOFConfigurableBranchesForSearch: number;
}

export interface IncludeBranchButtonState {
    disabled: boolean;
}

/**
 * React layer to render include branch to search button.
 */
export class IncludeBranchButton extends React.Component<IncludeBranchButtonProps, IncludeBranchButtonState> {
    private _viewState: IncludeBranchButtonState;

    constructor(props: IncludeBranchButtonProps) {
        super(props);
        this._viewState = {
            disabled: true,
        } as IncludeBranchButtonState;

        this.state = this._viewState;
    }

    public componentDidMount(): void {
        this.props.storesHub.branchListDataStore.
            addChangedListener(this._onBranchListDataStoreChanged);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.branchListDataStore.
            removeChangedListener(this._onBranchListDataStoreChanged);
    }

    /**
     * Just render the include button component.
     */
    public render(): JSX.Element {
        return <div>
            <div className='search-includebranch-buttoncontainer'>
                <DefaultButton
                    iconProps={{ className: css("bowtie-icon", "bowtie-math-plus") }}
                    disabled={this.state.disabled}
                    onClick={() => { this._onIncludeClick() }}
                    className={"search-includebranch-commandbutton"}>
                    {VCResources.SearchIncludeBranch}
                </DefaultButton>
            </div>
            <IncludeBranchDialogBox
                actionCreator={this.props.actionCreator}
                storesHub={this.props.storesHub}
                elementToFocusOnDismiss={$(".search-includebranch-commandbutton")[0]} />
        </div>
    }

    @autobind
    private _onIncludeClick() {
        this.props.actionCreator.updateIncludeBranchDialogState(true, ErrorStateEnum.None);
    }

    @autobind
    private _onBranchListDataStoreChanged(): void {
        let branchList: string[] = this.props.storesHub.branchListDataStore.getListOfBranches();
        let isIncludeButtonDisabled: boolean = false;

        if (branchList.length >= this.props.maxNoOFConfigurableBranchesForSearch) {
            isIncludeButtonDisabled = true;
        }

        this._viewState.disabled = isIncludeButtonDisabled;
        this.setState(this._viewState);
    }
}