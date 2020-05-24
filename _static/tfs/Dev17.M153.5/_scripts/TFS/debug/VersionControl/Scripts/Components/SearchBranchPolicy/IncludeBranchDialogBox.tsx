/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { autobind } from 'OfficeFabric/Utilities';
import * as Dialog from "OfficeFabric/Dialog";
import { GitVersionSelector, GitVersionSelectorProps } from "VersionControl/Scenarios/Shared/GitVersionSelector";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitBranchVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { ActionCreator } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionCreator";
import { StoresHub } from "VersionControl/Scripts/Components/SearchBranchPolicy/StoresHub";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { ErrorStateEnum } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionsHub";
import { IModalProps } from "OfficeFabric/Modal";

import "VSS/LoaderPlugins/Css!VersionControl/IncludeBranchDialogBox";

export interface IncludeBranchDialogBoxProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    elementToFocusOnDismiss: HTMLElement;
}

export interface IncludeBranchDialogBoxState {
    versionSpec: GitBranchVersionSpec;
    dialogIncludeButtonDisabled: boolean;
    isOpen: boolean;
    errorState: ErrorStateEnum;
}

/**
 * React layer to render include branch dialog.
 */
export class IncludeBranchDialogBox extends React.Component<IncludeBranchDialogBoxProps, IncludeBranchDialogBoxState> {
    private _viewState: IncludeBranchDialogBoxState;

    constructor(props: IncludeBranchDialogBoxProps) {
        super(props);
        this._viewState = {
            versionSpec: null,
            dialogIncludeButtonDisabled: true,
            isOpen: false,
            errorState: ErrorStateEnum.None
        } as IncludeBranchDialogBoxState;
        this.state = this._viewState;
    }

    public componentDidMount(): void {
        this.props.storesHub.includeBranchDialogDataStore.
            addChangedListener(this._onIncludeBranchDialogDataChanged);
    }

    public componentWillReceiveProps(nextProps: IncludeBranchDialogBoxProps): void {
        this._viewState = {
            versionSpec: null,
            dialogIncludeButtonDisabled: true,
            isOpen: false,
            errorState: ErrorStateEnum.None
        } as IncludeBranchDialogBoxState;
        this.setState(this._viewState);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.includeBranchDialogDataStore.
            removeChangedListener(this._onIncludeBranchDialogDataChanged);
    }

    /**
     * Just render the include branch dialog component.
     */
    public render(): JSX.Element {
        let dialogcontentProps: Dialog.IDialogContentProps = {
            title: VCResources.SearchIncludeBranchDialogTitle,
            type: Dialog.DialogType.normal,
            showCloseButton: true,
        };

        let modalProps: IModalProps = {
            containerClassName: "search-branch-include-dialog",
            isBlocking: true,
            elementToFocusOnDismiss: this.props.elementToFocusOnDismiss,
            onDismiss: () => this._closeHandler(),
            isDarkOverlay: false,
        };

        return (
            <Dialog.Dialog hidden={!this.state.isOpen} dialogContentProps={dialogcontentProps} modalProps={modalProps} onDismiss={this._closeHandler}>
                <div className="search-include-branch" aria-describedby="include-branch-dialog-id">
                    <GitVersionSelector
                        {...this.getSourceVersionSelectorProps() } />
                </div>
                <div className="search-include-dialog-error-message">
                    {
                        (this.state.errorState == ErrorStateEnum.UnknownError) &&
                        <span aria-live="assertive">{VCResources.SearchBranchUXUnknownErrorMessage}</span>
                    }
                    {
                        (this.state.errorState == ErrorStateEnum.PermissionError) &&
                        <span aria-live="assertive">{VCResources.SearchBranchUXPermissionErrorMessage}</span>
                    }
                    {
                        (this.state.errorState == ErrorStateEnum.BranchAlreadyConfigured) &&
                        <span aria-live="assertive">{VCResources.SearchBranchAlreadyConfiguredErrorMessage}</span>
                    }
                    {
                        (this.state.errorState == ErrorStateEnum.BranchIndexDelay) &&
                        <span aria-live="assertive" className="branch-index-delay-message">
                            {VCResources.SearchBranchIndexingDelayErrorMessage}
                        </span>
                    }
                </div>
                <Dialog.DialogFooter>
                    <PrimaryButton
                        disabled={this.state.dialogIncludeButtonDisabled}
                        onClick={() => this._includeBranchHandler(this.state.versionSpec.toFullName())}
                        text={VCResources.SearchIncludeBranch}
                        className="btn-cta Include-branch-button"/>
                    <DefaultButton
                        onClick={() => this._closeHandler()}
                        text={VCResources.SearchDialogCloseText} />
                </Dialog.DialogFooter>
            </Dialog.Dialog>
        );
    }

    private getSourceVersionSelectorProps(): GitVersionSelectorProps {
        return {
            repositoryContext: this.props.storesHub.repositoryContextStore.getRepositoryContext(),
            versionSpec: this.state.versionSpec,
            allowEditing: false,
            hasNewBranches: false,
            disableMyBranches: true,
            disableTags: true,
            showCommits: false,
            focusOnLoad: true,
            onBranchChanged: (branchVersionSpec: GitBranchVersionSpec) =>
                this._onSourceBranchChanged(branchVersionSpec),
            ariaLabelledBy: VCResources.SearchIncludeBranchDialogInfo,
            fullPopupWidth: true
        } as GitVersionSelectorProps;
    }

    @autobind
    private _closeHandler(): void {
        this._viewState.isOpen = false;
        this._viewState.errorState = ErrorStateEnum.None;
        this._viewState.versionSpec = null;
        this.setState(this._viewState);
    };

    @autobind
    private _includeBranchHandler(branchToBeIncluded: string): void {
        let latestConfiguredBranchList: string[];
        latestConfiguredBranchList = this.props.storesHub.branchListDataStore.getListOfBranches().slice(0);
        latestConfiguredBranchList.push(branchToBeIncluded);

        this.props.actionCreator.updateSearchableBranches(
            this.props.storesHub.repositoryContextStore.getRepositoryContext(),
            latestConfiguredBranchList, this._handleErrorOnInclude, this._handleSuccessOnInclude);
    };

    @autobind
    private _onSourceBranchChanged(branchVersionSpec: GitBranchVersionSpec) {
        //Get the fullname includeing refs/head
        let branchSelected: string = branchVersionSpec.toFullName();
        let defaultBranch: string = this.props.storesHub.
            repositoryContextStore.getRepositoryContext().getRepository().defaultBranch;

        //if branch store has this branch already included then disable include button
        this._viewState.dialogIncludeButtonDisabled = false;
        this._viewState.errorState = ErrorStateEnum.BranchIndexDelay;


        if (this.props.storesHub.branchListDataStore.getListOfBranches().indexOf(branchSelected) >= 0
            || (branchSelected === defaultBranch)) {
            this._viewState.dialogIncludeButtonDisabled = true;
            this._viewState.errorState = ErrorStateEnum.BranchAlreadyConfigured;
        }

       

        this._viewState.versionSpec = branchVersionSpec;
        //update state
        this.setState(this._viewState);
    }

    @autobind
    private _onIncludeBranchDialogDataChanged(): void {
        let newState = this.props.storesHub.includeBranchDialogDataStore.getIncludeBranchDialogState();
        this._viewState.isOpen = newState.isOpen;
        this._viewState.errorState = newState.errorState;
        this.setState(this._viewState);
    }

    @autobind
    private _handleErrorOnInclude(errorMessage: any): void {
        if (errorMessage.status === 403) {
            this.props.actionCreator.updateIncludeBranchDialogState(true, ErrorStateEnum.PermissionError);
        }
        else {
            this.props.actionCreator.updateIncludeBranchDialogState(true, ErrorStateEnum.UnknownError);
        }
    }

    @autobind
    private _handleSuccessOnInclude(): void {
        this.props.actionCreator.updateIncludeBranchDialogState(false, ErrorStateEnum.None);
    }
}