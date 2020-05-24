/// <reference types="react" />

import "VSS/LoaderPlugins/Css!Admin/Scripts/BacklogLevels/Components/BacklogLevelDialog";

import * as React from "react";

import { Fabric } from "OfficeFabric/Fabric";
import * as Dialog from "OfficeFabric/Dialog";
import * as Button from "OfficeFabric/Button";

import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import { ActionsCreator } from "Admin/Scripts/BacklogLevels/Actions/ActionsCreator";
import { BacklogLevelDialog } from "Admin/Scripts/BacklogLevels/Components/BacklogLevelDialog";


export interface Props {
    actionsCreator: ActionsCreator;
    title: string;
    message: string;
}

export class SimpleMessageDialog extends React.Component<Props, null> {
    public render(): JSX.Element {
        var dialogProps: Dialog.IDialogProps = {
            isOpen: true,
            type: Dialog.DialogType.close,
            containerClassName: BacklogLevelDialog.BACKLOG_LEVEL_DIALOG_CLASS,
            isBlocking: true,
            title: this.props.title,
            onDismiss: () => this._closeDialog()
        };

        return (
            <Fabric>
                <Dialog.Dialog {...dialogProps}>
                    {this.props.message}
                    <Dialog.DialogFooter>
                        <Button.PrimaryButton onClick={() => this._closeDialog()}>{AdminResources.Close}</Button.PrimaryButton>
                    </Dialog.DialogFooter>
                </Dialog.Dialog>
            </Fabric>
        );
    }

    private _closeDialog() {
        this.props.actionsCreator.closeMessageDialog();
    }
}
