/// <reference types="react-dom" />
import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { TextField } from "OfficeFabric/TextField";
import { autobind } from "OfficeFabric/Utilities";
import { IdentityPickerSearch } from "Presentation/Scripts/TFS/Components/IdentityPickerSearch";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import * as  VSS_Resources_Common from "VSS/Resources/VSS.Resources.Common";

import "VSS/LoaderPlugins/Css!VersionControl/SharePullRequestDialog";

export interface ISharePullRequestDialogProps {
    isOpen: boolean;
    isSending: boolean;
    isMailEnabled: boolean;
    includeGroups: boolean;
    errorMessage: string;
    defaultRecipients: string[];
    onCancel(): void;
    onSend(message: string, recipients: string[]): void;
    onDismissErrorMessage(): void;
}

export interface ISharePullRequestDialogState {
    message: string;
    recipients: string[];
    invalidRecipientWarning: string;
}

const consumerId = "5914bcc9-0a24-4705-b693-5acfb824df2d"; // randomly generated guid for IdentityPicker telemetry

export class SharePullRequestDialog extends React.Component<ISharePullRequestDialogProps, ISharePullRequestDialogState> {

    constructor(props: ISharePullRequestDialogProps) {
        super(props);
        this.state = {
            recipients: this.props.defaultRecipients,
            message: "",
        } as ISharePullRequestDialogState;
    }

    public render(): JSX.Element {

        return (
            <Dialog
                modalProps={{ containerClassName: "vc-dialog vc-sharePullRequest-dialog", isBlocking: true }}
                dialogContentProps={{
                    type: DialogType.close,
                    subText: VCResources.PullRequest_ShareDialog_Subtext,
                }}
                title={VCResources.PullRequest_Share}
                hidden={!this.props.isOpen}
                onDismiss={this._onCancel}
                closeButtonAriaLabel={VCResources.PullRequest_ShareDialog_CancelButton}
            >
                {!this.props.isMailEnabled &&
                    <MessageBar
                         messageBarType={MessageBarType.severeWarning}>
                         {VSS_Resources_Common.SendMailNotEnabled}
                    </MessageBar>
                }
                {this.props.errorMessage &&
                    <MessageBar
                         onDismiss={this._onDismissErrorMessage}
                         messageBarType={MessageBarType.severeWarning}>
                         {this.props.errorMessage}
                    </MessageBar>
                }
                {this.state.invalidRecipientWarning &&
                    <MessageBar messageBarType={MessageBarType.warning}>{this.state.invalidRecipientWarning}</MessageBar>
                }
                <Label required htmlFor="recipients-edit">{VCResources.PullRequest_ShareDialog_ToLabel}</Label>
                <IdentityPickerSearch
                    consumerId={consumerId}
                    focusOnLoad={false}
                    identitiesUpdated={this._recipientsUpdated}
                    unresolvedIdentitiesUpdated={this._unresolvedIdentitiesUpdated}
                    defaultEntities={this.props.defaultRecipients}
                    inlineSelectedEntities={true}
                    multiIdentitySearch={true}
                    includeGroups={this.props.includeGroups}
                    id="recipients-edit"
                    placeholderText={VCResources.PullRequest_ShareDialog_IdentityPickerPlaceholderText} />
                <TextField
                    label={VCResources.PullRequest_ShareDialog_NoteLabel}
                    maxLength={1024}
                    multiline
                    rows={10}
                    resizable={false}
                    value={this.state.message}
                    onChanged={this._onMessageChange} />
                <DialogFooter>
                    <PrimaryButton
                        onClick={this._onSend}
                        disabled={this.state.recipients.length === 0 || !!this.state.invalidRecipientWarning || this.props.isSending || !this.props.isMailEnabled}>
                        {VCResources.PullRequest_ShareDialog_SendButton}
                    </PrimaryButton>
                    <DefaultButton
                        onClick={this._onCancel}>
                        {VCResources.PullRequest_ShareDialog_CancelButton}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    @autobind
    private _onCancel() {
        if (this.props.onCancel) {
            this.props.onCancel();
        }
    }

    @autobind
    private _onSend() {
        if (this.props.onSend) {
            this.props.onSend(this.state.message, this.state.recipients);
        }
    }

    @autobind
    private _recipientsUpdated(ids: IEntity[]) {
        this.setState({ recipients: ids.map(i => i.localId) } as ISharePullRequestDialogState);
    }

    @autobind
    private _unresolvedIdentitiesUpdated(ids: string[]) {
        const invalidRecipientWarning = ids.length > 0 ? VCResources.PullRequest_ShareDialog_InvalidRecipient : "";
        this.setState({ invalidRecipientWarning } as ISharePullRequestDialogState);
    }

    @autobind
    private _onMessageChange(message: string) {
        this.setState({ message } as ISharePullRequestDialogState);
    }

    @autobind
    private _onDismissErrorMessage() {
        if (this.props.onDismissErrorMessage) {
            this.props.onDismissErrorMessage();
        }
    }
}
