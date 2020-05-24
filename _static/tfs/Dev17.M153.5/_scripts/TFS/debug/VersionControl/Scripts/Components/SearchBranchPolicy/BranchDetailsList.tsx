/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";
import * as React from 'react';
import { autobind, css, getRTLSafeKeyCode, KeyCodes } from 'OfficeFabric/Utilities';
import { CommandButton } from "OfficeFabric/Button";
import { ExcludeBranchDialogBox } from "VersionControl/Scripts/Components/SearchBranchPolicy/ExcludeBranchDialogBox";
import { ActionCreator } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionCreator";
import { StoresHub } from "VersionControl/Scripts/Components/SearchBranchPolicy/StoresHub";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import Utils_String = require("VSS/Utils/String");
import { ErrorStateEnum } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionsHub";
import { List } from "OfficeFabric/List";
import { FocusZone, FocusZoneDirection } from "OfficeFabric/FocusZone";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { IncludeBranchButton } from "VersionControl/Scripts/Components/SearchBranchPolicy/IncludeBranchButton";

import "VSS/LoaderPlugins/Css!VersionControl/BranchDetailsList";

export interface IBranchDetailsListState {
    items: IBranchInfoItem[];
}

export interface IBranchDetailsListProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    repositoryContext: GitRepositoryContext;
    maxNoOFConfigurableBranchesForSearch: number;
}

export interface IBranchInfoItem {
    branchName: string;
    branchStatus: string;
    exlcludeActionOnBranch: boolean;
}

/**
 * React layer to render the configured + default branch list.
 */
export class BranchDetailsList extends React.Component<IBranchDetailsListProps, IBranchDetailsListState> {
    private _viewState: IBranchDetailsListState;

    constructor(props: IBranchDetailsListProps) {
        super(props);
        this._viewState = {
            items: []
        } as IBranchDetailsListState;
        this.state = this._viewState;
    }

    public componentDidMount(): void {
        this.props.storesHub.branchListDataStore.
            addChangedListener(this._onBranchListDataStoreChanged);
        this.props.actionCreator.getSearchableBranches(this.props.repositoryContext);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.branchListDataStore.
            removeChangedListener(this._onBranchListDataStoreChanged);
    }

    public componentWillReceiveProps(nextProps: IBranchDetailsListProps): void {
        // Update branch list only if repository context is different.
        if (this.props.repositoryContext !== nextProps.repositoryContext) {
            this.props.actionCreator.getSearchableBranches(nextProps.repositoryContext);
        }
    }

    public render(): JSX.Element {
        let defaultBranchName: string = this.props.repositoryContext.getRepository().defaultBranch;

        // Add configured branches + default branch (default branch at the start of the list)
        let items: IBranchInfoItem[] = this
            .state
            .items
            .filter(
            item => {
                if (item.branchName) {
                    // if the branch is same as the default branch do not add it to item list.
                    return defaultBranchName !== item.branchName;
                }

                // if branch name is not proper do not add it to the list.
                return false;
            })
            .sort((a, b) => a.branchName.localeCompare(b.branchName));

        if (defaultBranchName) {
            items = [
                {
                    branchName: defaultBranchName,
                    exlcludeActionOnBranch: false,
                    branchStatus: VCResources.SearchDefaultBranch
                }, ...items
            ];
        }

        let className = "configured-branches-list-container";
        let resultView =
            <div>
                <div className="search-no-of-configuredbranches-message">
                    <span> {Utils_String.format(VCResources.SearchNoOfConfiguredBranchesMessage, this.props.maxNoOFConfigurableBranchesForSearch, this.state.items.length)} </span>
                </div> 
                <IncludeBranchButton
                    repositoryContext={this.props.repositoryContext}
                    actionCreator={this.props.actionCreator}
                    storesHub={this.props.storesHub}
                    maxNoOFConfigurableBranchesForSearch={this.props.maxNoOFConfigurableBranchesForSearch} />
                <div className={className}>
                    <FocusZone direction={FocusZoneDirection.vertical} isInnerZoneKeystroke={this._isInnerZoneKeyStroke}>
                        <List items={items} onRenderCell={this._onRenderCell} />
                    </FocusZone>
                </div>
                <ExcludeBranchDialogBox
                    actionCreator={this.props.actionCreator}
                    storesHub={this.props.storesHub}
                    elementToFocusOnDismiss={$(".search-branch-list-data")[0]} />
                   
            </div>
        return resultView;
    }

    @autobind
    private _isInnerZoneKeyStroke(ev: React.KeyboardEvent<HTMLElement>) {
        return ev.which === getRTLSafeKeyCode(KeyCodes.right);
    }

    @autobind
    private _onRenderCell(item?: any, index?: number): JSX.Element {
        let itemBranchDisplayName: string = item.branchName.replace("refs/heads/", "");
        let branchStatus: string = (item.branchStatus == null || item.branchStatus.trim() === '') ? "" : item.branchStatus;

        return (

            <div className="search-branch-list-data" role="listitem" data-is-focusable={true}
                aria-label={Utils_String.format("{0} {1} {2}", itemBranchDisplayName, branchStatus, VCResources.SearchBranchName)}>
                <div className="branch-icon-name-status">
                    <span className={css("bowtie-icon", "bowtie-tfvc-branch")}></span>
                    <div className="branch-name">
                        <TooltipHost
                            overflowMode={TooltipOverflowMode.Parent}
                            content={itemBranchDisplayName}
                            directionalHint={DirectionalHint.bottomCenter}>
                            <span>{itemBranchDisplayName}</span>
                        </TooltipHost>
                    </div>
                    {
                        (item.branchStatus == null || item.branchStatus.trim() === '')
                            ? null
                            : <span aria-label={item.branchStatus} className="branch-name-status-content">{item.branchStatus}</span>
                    }
                </div>
                <FocusZone direction={FocusZoneDirection.horizontal}>
                    <TooltipHost
                        content={item.exlcludeActionOnBranch ? VCResources.ExcludeBranchMessage : VCResources.DefaultExcludeBranchMessage}
                        directionalHint={ DirectionalHint.bottomCenter }>
                        <CommandButton
                        iconProps={{ className: css("bowtie-icon", "bowtie-math-multiply-light") }}
                        disabled={!item.exlcludeActionOnBranch}
                        onClick={() => { this._onExcludeClick(item) }}
                        ariaLabel={item.exlcludeActionOnBranch ? VCResources.ExcludeBranchMessage : VCResources.DefaultExcludeBranchMessage}   
                        className="branch-exclude-action ">
                        </CommandButton>
                    </TooltipHost>
                </FocusZone>
            </div >

        );
    }

    @autobind
    private _onExcludeClick(item: IBranchInfoItem) {
        this.props.actionCreator.updateExcludeBranchDialogState(true, ErrorStateEnum.None, item.branchName);
    }

    @autobind
    private _onBranchListDataStoreChanged(): void {
        let branchList: string[] = this.props.storesHub.branchListDataStore.getListOfBranches(),
            branchesToBeDrawn: IBranchInfoItem[] = branchList.map(branch => {
                return { branchName: branch, exlcludeActionOnBranch: true, branchStatus: "" }
            });

        this._viewState.items = branchesToBeDrawn;
        this.setState(this._viewState);
    }
}