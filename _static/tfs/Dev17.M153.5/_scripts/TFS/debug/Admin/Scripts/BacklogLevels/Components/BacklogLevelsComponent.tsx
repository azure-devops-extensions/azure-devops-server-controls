/// <reference types="react" />
/// <reference types="react-dom" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!Admin/Scripts/BacklogLevels/Components/BacklogLevelsComponent";

import * as React from "react";
import * as ReactDOM from "react-dom";

import { Store } from "Admin/Scripts/BacklogLevels/Stores/Store";
import { ActionsCreator } from "Admin/Scripts/BacklogLevels/Actions/ActionsCreator";
import * as Interfaces from "Admin/Scripts/BacklogLevels/Interfaces";
import { BacklogTypeGrid } from "Admin/Scripts/BacklogLevels/Components/BacklogTypeGrid";
import * as BacklogLevelDialog from "Admin/Scripts/BacklogLevels/Components/BacklogLevelDialog";
import * as MessageDialog from "Admin/Scripts/BacklogLevels/Components/MessageDialog";
import * as ErrorComponent from "Admin/Scripts/BacklogLevels/Components/ErrorComponent";

import * as Button from "OfficeFabric/Button";
import * as Dialog from "OfficeFabric/Dialog";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import * as Utils_String from "VSS/Utils/String";

export interface IBacklogLevelsComponentProps {
    /**
     * The store
     */
    store: Store;

    /**
     * The action creator which holds the state associated with project creation
     */
    actionsCreator: ActionsCreator;
}

export class BacklogLevelsComponent extends React.Component<IBacklogLevelsComponentProps, Interfaces.IBacklogLevelsComponentState> {
    public static render(container: HTMLElement, props: IBacklogLevelsComponentProps): void {
        ReactDOM.render(
            <BacklogLevelsComponent {...props} />,
            container);
    }

    public static unmount(container: HTMLElement) {
        ReactDOM.unmountComponentAtNode(container);
    }

    constructor(props: IBacklogLevelsComponentProps) {
        super(props);
        this.state = this.props.store.state;
        this.props.actionsCreator.initialize();
    }

    public componentDidMount(): void {
        this.props.store.addChangedListener(this._onStoreChanged);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._onStoreChanged);
    }

    private _onStoreChanged = (): void => {
        this.setState(this.props.store.state);
    }

    public render(): JSX.Element {
        if (this.state.hierarchy) {
            return (
                <div className="backlog-levels-component">
                    {this._getDialog() }
                    {this.state.error ? <ErrorComponent.ErrorMessageBar errors={this.state.error.errors} onDismiss={() => this.props.actionsCreator.dismissPageError() } /> : null}
                    {
                        this.state.hierarchy.groups.map((group) => {
                            return <BacklogTypeGrid
                                key={group.name}
                                group={group}
                                actionsCreator={this.props.actionsCreator}
                                canEdit={this.state.canEdit}
                                isInherited={this.state.isInherited}
                                />;
                        })
                    }
                </div>
            );
        }
        else {
            // We are asumming that the page loads fast enough that a fancy loading experience is not neccessary
            return null;
        }
    }

    private _closeDialog() {
        let dialog = this.state.dialogState;
        if (dialog.mode === Interfaces.DialogMode.Delete) {
            this.props.actionsCreator.cancelDeleteConfirmationDialog();
        }
        else if (dialog.mode === Interfaces.DialogMode.Reset) {
            this.props.actionsCreator.cancelResetConfirmationDialog();
        }
        else {
            this.props.actionsCreator.cancelEditDialogClicked();
        }
    }

    private _deleteBacklogLevel(level: Interfaces.IBacklogLevel) {
        this.props.actionsCreator.deleteBacklogLevel(level);
    }

    private _resetBacklogLevel(level: Interfaces.IBacklogLevel) {
        this.props.actionsCreator.resetBacklogLevel(level);
    }

    private _getDialog(): JSX.Element {
        if (this.state.messageDialog) {
            return (
                <MessageDialog.SimpleMessageDialog actionsCreator={this.props.actionsCreator} {...this.state.messageDialog} />
            );
        }
        else {
            let dialog = this.state.dialogState;
            if (dialog && dialog.mode === Interfaces.DialogMode.Delete) {
                var dialogProps: Dialog.IDialogProps = {
                    isOpen: true,
                    type: Dialog.DialogType.normal,
                    containerClassName: BacklogLevelDialog.BacklogLevelDialog.BACKLOG_LEVEL_DIALOG_CLASS,
                    isBlocking: true,
                    title: AdminResources.BacklogLevels_Deletebacklog_DialogTitle,
                    onDismiss: () => this._closeDialog()
                };
                return (
                    <Dialog.Dialog {...dialogProps}>
                        {Utils_String.format(AdminResources.BacklogLevels_DeleteConfirmationDialogMessage, dialog.backlogLevel.name)}
                        <Dialog.DialogFooter>
                            <Button.PrimaryButton onClick={() => this._deleteBacklogLevel(dialog.backlogLevel)}>{AdminResources.Delete}</Button.PrimaryButton>
                            <Button.DefaultButton onClick={() => this._closeDialog()}>{AdminResources.Cancel}</Button.DefaultButton>
                        </Dialog.DialogFooter>
                    </Dialog.Dialog>
                );
            }
            else if (dialog && dialog.mode === Interfaces.DialogMode.AddEdit) {
                var props: BacklogLevelDialog.Props = {
                    actionsCreator: this.props.actionsCreator,
                    dialogData: this.state.dialogState,
                    hierarchy: this.state.hierarchy
                };

                return (
                    <BacklogLevelDialog.BacklogLevelDialog {...props} />
                );
            }
            else if (dialog && dialog.mode === Interfaces.DialogMode.Reset) {
                const dialogProps: Dialog.IDialogProps = {
                    isOpen: true,
                    type: Dialog.DialogType.normal,
                    containerClassName: BacklogLevelDialog.BacklogLevelDialog.BACKLOG_LEVEL_DIALOG_CLASS,
                    isBlocking: true,
                    title: AdminResources.BacklogLevels_Resetbacklog_DialogTitle,
                    onDismiss: () => this._closeDialog()
                };
                return (
                    <Dialog.Dialog {...dialogProps}>
                        {Utils_String.format(AdminResources.BacklogLevels_ResetConfirmationDialogMessage, dialog.backlogLevel.name) }
                        <Dialog.DialogFooter>
                            <Button.PrimaryButton onClick={() => this._resetBacklogLevel(dialog.backlogLevel) }>{AdminResources.Reset}</Button.PrimaryButton>
                            <Button.DefaultButton onClick={() => this._closeDialog() }>{AdminResources.Cancel}</Button.DefaultButton>
                        </Dialog.DialogFooter>
                    </Dialog.Dialog>
                );
            }
            return null;
        }
    }
}