/// <reference types="react" />

import * as React from "react";
import * as ReactDOM from "react-dom";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { DialogType, IDialogContentProps } from "OfficeFabric/components/Dialog/DialogContent.types";
import { DialogFooter } from "OfficeFabric/components/Dialog/DialogFooter";
import { IModalProps } from "OfficeFabric/Modal";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import * as TestsOM from "TestManagement/Scripts/TFS.TestManagement";
import { RunWithOptionsStore, IRunWithOptionsState } from "TestManagement/Scripts/Scenarios/RunWithOptions/Stores/RunWithOptionsStore";
import { RunWithOptionsActionsCreator } from "TestManagement/Scripts/Scenarios/RunWithOptions/Actions/RunWithOptionsActionsCreator";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";

import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/RunWithOptions/ControllerViews/RunWithOptionsDialog";

export interface IRunWithOptionsDialogProps extends ComponentBase.Props{
    actionsCreator: RunWithOptionsActionsCreator;
    testPoints: TestsOM.ITestPointModel[];
    store: RunWithOptionsStore;
    onOkClick?: () => void;
    onClose?: () => void;
}

export function renderDialog(element: HTMLElement, RunWithOptionsDialogProps: IRunWithOptionsDialogProps): void {
    ReactDOM.render(<RunWithOptionsDialog { ...RunWithOptionsDialogProps } />, element);
}

export function unmountDialog(element: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(element);
}

export class RunWithOptionsDialog extends ComponentBase.Component<IRunWithOptionsDialogProps, IRunWithOptionsState> {

    public componentWillMount(): void {
        this._handleStoreChange();
        this.props.store.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._handleStoreChange);
    }

    public render(): JSX.Element {
        let okButtonClassName = "run-with-options-dialog-ok-btn";
        let dialogcontentProps: IDialogContentProps = {
            title: Resources.RunWithOptionDialogTitle,
            className: "run-with-options-dialog-content",
            closeButtonAriaLabel: Resources.CloseText,
            type: DialogType.close,
            showCloseButton: true
        };
        let modalProps: IModalProps = {
            className: "run-with-options-dialog bowtie-fabric",
            containerClassName: "run-with-options-dialog-container",
            isBlocking: true
        };
        return (
            <Dialog
                dialogContentProps={dialogcontentProps}
                modalProps={modalProps}
                hidden={!this.state.showDialog}
                onDismiss={this._onCancelClick}
                firstFocusableSelector={okButtonClassName}>
                {
                    this.state.errorMessage ?
                        <TooltipHost content={this.state.errorMessage}>
                            <MessageBar
                                messageBarType={MessageBarType.error}
                                dismissButtonAriaLabel={Resources.ClearErrorMessage}
                                className="test-plan-settings-error-bar"
                                isMultiline={false}
                                onDismiss={this._onErrorMessageDismiss}>
                                {this.state.errorMessage}
                            </MessageBar>
                        </TooltipHost>
                        :
                        Utils_String.empty
                }
                <DialogFooter>
                    <PrimaryButton
                        onClick={this._onOkClick}
                        disabled={this.state.disableOkButton}
                        className={okButtonClassName}>
                        {Resources.OkText}
                    </PrimaryButton>
                    <DefaultButton
                        onClick={this._onCancelClick}>
                        {Resources.CloseText}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
        );
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.store.getState());
    }

    private _onOkClick = () => {
        this._closeDialog();
    }

    private _onCancelClick = () => {
        this._closeDialog();
    }

    private _onErrorMessageDismiss = () => {
        this.props.actionsCreator.closeErrorMessage();
    }

    private _closeDialog(): void {
        this.props.actionsCreator.closeDialog();
        if (this.props.onClose) {
            this.props.onClose();
        }
    }
}