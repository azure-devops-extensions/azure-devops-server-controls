import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField, ITextField } from "OfficeFabric/TextField";
import { Spinner } from "OfficeFabric/Spinner";
import { autobind } from "OfficeFabric/Utilities";

import * as Utils_String from "VSS/Utils/String";

import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";

import * as React from "react";

import "VSS/LoaderPlugins/Css!Site";
import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/RenameWikiDialog";

export interface RenameWikiDialogProps {
    isOpen: boolean;
    name: string;
    onDismiss(): void;
    onSave(name: string): void;
    errorMessage: string;
    isRenameInProgress: boolean;
}

export interface RenameWikiState {
    value: string;
    isValidName: boolean;
}

export class RenameWikiDialog extends React.Component<RenameWikiDialogProps, RenameWikiState> {

    constructor(props: RenameWikiDialogProps) {
        super(props);
        this.state = {value: "", isValidName: false};
    }

    public render(): JSX.Element {
        return (
            <Dialog
                onDismiss={this.props.onDismiss}
                hidden={!this.props.isOpen}
                dialogContentProps={{
                    type: DialogType.close,
                    title: Utils_String.format(WikiResources.RenameWikiTitle, this.props.name),
                    closeButtonAriaLabel: WikiResources.RenameWikiExitAria,
                }}
                modalProps={{
                    isBlocking: true,
                    containerClassName: "rename-wiki-dialog-container",
                    className: "wiki",
                  }}
                >
                <MessageBar
                    className="rename-wiki-dialog-info"
                    messageBarType={MessageBarType.warning}
                    >
                    {WikiResources.RenameWikiDisclaimer}
                </MessageBar>
                <TextField
                    label={WikiResources.RenameWikiTexteBoxLabel}
                    required={true}
                    disabled={this.props.isRenameInProgress}
                    onChanged={this.onTextChange}
                    errorMessage={this.props.errorMessage}
                    defaultValue={this.props.name}
                    className="newname-container"
                    />
                <DialogFooter>
                    {
                        this.props.isRenameInProgress &&
                        <Spinner  className={"rename-wiki-popup-wait-spinner"}/>
                    }
                    <PrimaryButton
                        disabled={this.props.isRenameInProgress || !this.state.isValidName}
                        ariaDescription={WikiResources.RenameWikiOkAria}
                        onClick={this.handleSubmit}>
                        {WikiResources.RenameWikiOk}
                    </PrimaryButton>
                    <DefaultButton
                        disabled={this.props.isRenameInProgress}
                        ariaDescription={WikiResources.RenameWikiExitAria}
                        onClick={this.props.onDismiss}>
                        {WikiResources.RenameWikiExit}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    @autobind
    private onTextChange(newValue: string): void {
        this.setState({value: newValue, isValidName: newValue  && this.props.name !== newValue});
    }

    @autobind
    private handleSubmit(event: any): void {
        this.props.onSave(this.state.value);
        event.preventDefault();
    }
}
