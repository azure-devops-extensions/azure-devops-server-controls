import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { autobind } from "OfficeFabric/Utilities";

import { FilesTree, FilesTreeProps } from "VersionControl/Scenarios/Shared/FilesTree";
import { IItem } from "Presentation/Scripts/TFS/Stores/TreeStore";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Integration/FilePicker/FilePicker";

export interface FilePickerProps {
    title: string;
    isOpen: boolean;
    ctaText: string;
    repositoryContext: GitRepositoryContext;
    selectedPath: string;
    versionSpec: VersionSpec;
    onCTA(selectedPagePath: string): void;
    onDismiss(): void;
}

export interface FilePickerState {
    error: Error;
    selectedPath: string;
    isCTADisabled: boolean;
}

export class FilePicker extends React.Component<FilePickerProps, FilePickerState> {

    constructor(props: FilePickerProps) {
        super(props);

        this.state = {
            error: null,
            selectedPath: this.props.selectedPath,
            isCTADisabled: true,
        };
    }

    public render(): JSX.Element {
        return <Dialog
            hidden={!this.props.isOpen}
            modalProps={{
                className: "file-picker-dialog",
                containerClassName: "file-picker-container",
                isBlocking: true,
            }}
            dialogContentProps={{
                type: DialogType.close,
                showCloseButton: true,
                closeButtonAriaLabel: WikiResources.DialogCloseButtonAriaLabel,
            }}
            title={this.props.title}
            onDismiss={this.props.onDismiss}>
            {this._getContent()}
            {this._getFooter()}
        </Dialog>;        
    }

    private _getContent(): JSX.Element {
        // Show information message if provided version is null.
        if (!this.props.versionSpec) {
            return this._getInvalidVersionContent();
        }

        if (this.state.error) {
            return this._getErrorStateContent(this.state.error);
        } else {
            return this._getTreeContent();
        }
    }

    private _getInvalidVersionContent(): JSX.Element {
        return <MessageBar
            className={"invalid-version-message-bar"}
            messageBarType={MessageBarType.info}>
            {VCResources.VersionSelectorNoBranches}
        </MessageBar>;
    }
    
    private _getErrorStateContent(error: Error): JSX.Element {
        return <MessageBar
            className={"error-message-bar"}
            messageBarType={MessageBarType.error}>
            {error.message}
        </MessageBar>;
    }

    private _getTreeContent(): JSX.Element {
        const filesTreeProps: FilesTreeProps = {
            repositoryContext: this.props.repositoryContext,
            selectedFullPath: this.state.selectedPath,
            versionSpec: this.props.versionSpec,
            onItemSelected: this._onPathSelected,
            onError: this._onError,
            getItemHasCommands: this._getItemHasCommands,
            getItemIsDisabled: this._getItemIsDisabled,
        };

        return (
            <div className="file-picker">
                <FilesTree {...filesTreeProps} />
            </div>
        );
    }
    
    private _getFooter(): JSX.Element {
        return <DialogFooter>
            <PrimaryButton
                onClick={this._onCTA}
                disabled={this.state.isCTADisabled}>
                {this.props.ctaText}
            </PrimaryButton>
            <DefaultButton
                onClick={this.props.onDismiss}>
                {WikiResources.CancelButtonText}
            </DefaultButton>
        </DialogFooter>;
    }

    @autobind
    private _onCTA(): void {
        this.props.onCTA(this.state.selectedPath);

        this.setState({
            isCTADisabled: false,
        });

        this.props.onDismiss();
    }

    @autobind
    private _onPathSelected(path: string): void {
        this.setState({
            selectedPath: path,
            isCTADisabled: false,
        });
    }

    @autobind
    private _onError(error: Error): void {
        this.setState({
            error: error,
        });
    }

    @autobind
    private _getItemHasCommands(item: IItem): boolean {
        return false;
    }

    @autobind
    private _getItemIsDisabled(item: IItem): boolean {
        if (!item.isFolder) {
            return true;
        }

        return false;
    }
}
