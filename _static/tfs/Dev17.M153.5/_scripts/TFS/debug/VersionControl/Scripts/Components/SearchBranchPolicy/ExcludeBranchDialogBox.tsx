/// Copyright (c) Microsoft Corporation. All rights reserved.
/// <reference types="react" />
/// <reference types="react-dom" />

"use strict";

import * as React from "react";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { autobind } from 'OfficeFabric/Utilities';
import * as Dialog from "OfficeFabric/Dialog";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import Utils_String = require("VSS/Utils/String");
import { ErrorStateEnum } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionsHub";
import { ActionCreator } from "VersionControl/Scripts/Components/SearchBranchPolicy/ActionCreator";
import { StoresHub } from "VersionControl/Scripts/Components/SearchBranchPolicy/StoresHub";
import { IModalProps } from "OfficeFabric/Modal";

import "VSS/LoaderPlugins/Css!VersionControl/ExcludeBranchDialogBox";

export interface ExcludeBranchDialogBoxProps {
    actionCreator: ActionCreator;
    storesHub: StoresHub;
    elementToFocusOnDismiss: HTMLElement;
}

export interface ExcludeBranchDialogBoxState {
    isOpen: boolean;
    errorState: ErrorStateEnum;
    branchName: string;
}

/**
 * React layer to render exclude branch dialog.
 */
export class ExcludeBranchDialogBox extends React.Component<ExcludeBranchDialogBoxProps, ExcludeBranchDialogBoxState> {
    private _viewState: ExcludeBranchDialogBoxState;

    constructor(props: ExcludeBranchDialogBoxProps) {
        super(props);
        this._viewState = {
            isOpen: false,
            errorState: ErrorStateEnum.None,
            branchName: ""
        } as ExcludeBranchDialogBoxState;
        this.state = this._viewState;
    }

    public componentDidMount(): void {
        this.props.storesHub.excludeBranchDialogDataStore.
            addChangedListener(this._onExcludeBranchDialogDataChanged);
    }

    public componentWillUnmount(): void {
        this.props.storesHub.excludeBranchDialogDataStore.
            removeChangedListener(this._onExcludeBranchDialogDataChanged);
    }

    /**
     * Just render the search box component.
     */
    public render(): JSX.Element {
        let dialogcontentProps: Dialog.IDialogContentProps = {
            title: VCResources.SearchExcludeBranchDialogTitle,
            type: Dialog.DialogType.normal,
            showCloseButton: false
        };

        let modalProps: IModalProps = {
            containerClassName: "search-branch-exclude-dialog",
            isBlocking: true,
            elementToFocusOnDismiss: this.props.elementToFocusOnDismiss,
            onDismiss: () => this._closeHandler(this.state.branchName),
            titleAriaId: "search-branch-exclude-dialog-info"
        }

        let branchDisplayName = this.state.branchName.replace("refs/heads/", "");

        return (
            <Dialog.Dialog hidden={!this.state.isOpen} dialogContentProps={dialogcontentProps} modalProps={modalProps}>

                <div className="search-branch-exclude-dialog-info" id="search-branch-exclude-dialog-info">
                    <span>{VCResources.SearchExcludeBranchDialogInfoStarting}</span>
                    <span className="search-excluding-branch">
                        {Utils_String.format(VCResources.SearchExcludingBranch, branchDisplayName)}
                    </span>
                    <span>{VCResources.SearchExcludeBranchDialogInfoEnding}</span>
                </div>
                <div className="search-exclude-dialog-error-message">
                    {
                        (this.state.errorState === ErrorStateEnum.UnknownError) &&
                        <span aria-live="assertive">{VCResources.SearchBranchUXUnknownErrorMessage}</span>
                    }
                    {
                        (this.state.errorState === ErrorStateEnum.PermissionError) &&
                        <span aria-live="assertive">{VCResources.SearchBranchUXPermissionErrorMessage}</span>
                    }
                </div>

                <Dialog.DialogFooter>
                    <PrimaryButton
                        onClick={() => this._excludeBranchHandler(this.state.branchName)}
                        text={VCResources.SearchExcludeBranchDialogTitle} />
                    <DefaultButton
                        onClick={() => this._closeHandler(this.state.branchName)}
                        text={VCResources.SearchDialogCloseText} />
                </Dialog.DialogFooter>
            </Dialog.Dialog>
        );
    }

    @autobind
    private _closeHandler(branchToBeExcluded: string): void {
        this.props.actionCreator.updateExcludeBranchDialogState(false, ErrorStateEnum.None, branchToBeExcluded);
    };

    @autobind
    private _excludeBranchHandler(branchToBeExcluded: string): void {
        let latestConfiguredBranchList: string[];
        latestConfiguredBranchList = this.props.storesHub.branchListDataStore.getListOfBranches().slice(0);
        let index = latestConfiguredBranchList.indexOf(branchToBeExcluded);
        if (index !== -1) {
            latestConfiguredBranchList.splice(index, 1);
        }

        const _handleErrorOnExclude = (errorMessage: any) => {
            if (errorMessage.status === 403) {
                this.props.actionCreator.updateExcludeBranchDialogState(true, ErrorStateEnum.PermissionError, branchToBeExcluded);
            }
            else {
                this.props.actionCreator.updateExcludeBranchDialogState(true, ErrorStateEnum.UnknownError, branchToBeExcluded);
            }
        }

        const _handleSuccessOnExclude = () => {
            this.props.actionCreator.updateExcludeBranchDialogState(false, ErrorStateEnum.None, branchToBeExcluded);
        }

        this.props.actionCreator.updateSearchableBranches(
            this.props.storesHub.repositoryContextStore.getRepositoryContext(),
            latestConfiguredBranchList, _handleErrorOnExclude, _handleSuccessOnExclude);
    };

    @autobind
    private _onExcludeBranchDialogDataChanged(): void {
        let newState = this.props.storesHub.excludeBranchDialogDataStore.getExcludeBranchDialogState();
        this._viewState.isOpen = newState.isOpen;
        this._viewState.errorState = newState.errorState;
        this._viewState.branchName = newState.branchToBeExcluded;
        this.setState(this._viewState);
    }
}