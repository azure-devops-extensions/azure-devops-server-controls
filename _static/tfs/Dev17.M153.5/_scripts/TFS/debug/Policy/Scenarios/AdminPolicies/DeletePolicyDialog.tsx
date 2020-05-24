// libs
import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import { Action } from "VSS/Flux/Action";
// contracts
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
// controls
import { Dialog, DialogFooter } from "OfficeFabric/Dialog";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
// scenario
import { Flux, StoresHub, Actions, ActionCreationSignatures } from "Policy/Scenarios/AdminPolicies/Flux";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface DeletePolicyDialogProps {
    showPolicyDeleteDialog: Action<Actions.ShowPolicyDeleteDialogPayload>;
}

export interface DeletePolicyDialogState {
    // Policy config being deleted
    config?: PolicyConfiguration;

    // Callback if the user confirms deletion
    onDelete?: (config: PolicyConfiguration) => void;

    // Dialog is open
    dialogIsOpen?: boolean;

    // Go back where we came from
    elementToFocusOnDismiss?: HTMLElement;
}

export class DeletePolicyDialog extends React.Component<DeletePolicyDialogProps, DeletePolicyDialogState> {

    constructor(props: DeletePolicyDialogProps) {
        super(props);

        this.state = {};
    }

    public render(): JSX.Element {

        const { config } = this.state;

        if (config == null) {
            return null;
        }

        const addingNewPolicy = (config.id == null);

        return (
            <Dialog
                title={Resources.DeletePolicyDialogTitle}
                hidden={!this.state.dialogIsOpen}
                modalProps={{
                    containerClassName: "policy-delete-dialog-container",
                    isBlocking: true,
                    isDarkOverlay: true
                }}
                onDismiss={this._closeDialog}
                elementToFocusOnDismiss={this.state.elementToFocusOnDismiss}
            >
                <div>{Resources.DeleteDialogAreYouSure}</div>

                <div>{Resources.DeleteDialogNotAskingAgain}</div>

                <DialogFooter>
                    <PrimaryButton onClick={this._okOnClick}>{Resources.Delete}</PrimaryButton>

                    <DefaultButton
                        onClick={this._closeDialog}
                    >
                        {Resources.Cancel}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    @autobind
    private _onShowDialog(payload: Actions.ShowPolicyDeleteDialogPayload): void {
        this.setState({
            dialogIsOpen: true,
            config: payload.config,
            elementToFocusOnDismiss: payload.elementToFocusOnDismiss,
            onDelete: payload.onDelete,
        });
    };

    @autobind
    private _okOnClick(ev: React.MouseEvent<HTMLButtonElement>): void {
        if (this.state.onDelete != null && this.state.config != null) {
            this.state.onDelete(this.state.config);
        }

        this._closeDialog(ev);
    }

    @autobind
    private _closeDialog(ev: React.MouseEvent<HTMLButtonElement>): void {
        this.setState({
            dialogIsOpen: false,
            config: null,
        });
    }

    public componentDidMount(): void {
        this.props.showPolicyDeleteDialog.addListener(this._onShowDialog)
    }

    public componentWillUnmount(): void {
        this.props.showPolicyDeleteDialog.removeListener(this._onShowDialog)
    }
}