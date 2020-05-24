import React = require("react");

import * as Component_Base from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import * as DTCResources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { MultiLineInputComponent } from "DistributedTaskControls/SharedControls/InputControls/Components/MultilineInputComponent";

import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { css } from "OfficeFabric/Utilities";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/DialogWithMultiLineTextInput";

export interface IProps extends Component_Base.Props {
    titleText: string;
    okButtonText?: string;
    okButtonAriaLabel?: string;
    cancelButtonText?: string;
    cancelButtonAriaLabel?: string;
    multiLineInputLabel?: string;
    onMultiLineInputChanged?: (inputText: string) => void;
    okDisabled?: boolean;
    onCancelButtonClick?: (inputText: string) => void;
    onOkButtonClick: (inputText: string) => void;
    showDialog: boolean;
    additionalCssClass?: string;
    footerInfoMessage?: string;
    subText?: string;
}


export class DialogWithMultiLineTextInput extends Component_Base.Component<IProps, Component_Base.State> {

    public render(): JSX.Element {
        const okButtonClass: string = "dtc-dialog-ok-button";
        const cancelButtonClass: string = "dtc-dialog-cancel-button";

        const okButtonText = this.props.okButtonText ? this.props.okButtonText : DTCResources.OK;
        const okButtonAriaLabel = this.props.okButtonAriaLabel ? this.props.okButtonAriaLabel : okButtonText;
        const cancelButtonText = this.props.cancelButtonText ? this.props.cancelButtonText : DTCResources.Cancel;
        const cancelButtonAriaLabel = this.props.cancelButtonAriaLabel ? this.props.cancelButtonAriaLabel : cancelButtonText;
        const firstFocusableSelector = this.props.okDisabled ? cancelButtonClass : okButtonClass;
        
        return (this.props.showDialog ?
            <Dialog
                hidden={!this.props.showDialog}
                dialogContentProps={{ type: DialogType.close, subText: this.props.subText, className: "dtc-dialog-mutliline-textinput-content" }}
                modalProps={{
                    className: css("dtc-dialog-mutliline-textinput", "bowtie-fabric", this.props.additionalCssClass),
                    isBlocking: true,
                    containerClassName: "dtc-dialog-mutliline-textinput-container"
                }}
                title={this.props.titleText}
                onDismiss={this._onCancelButtonClick}
                firstFocusableSelector={firstFocusableSelector}
                closeButtonAriaLabel={DTCResources.CloseButtonText}>
                {this.props.children}
                <MultiLineInputComponent
                    isNotResizable={true}
                    label={this.props.multiLineInputLabel}
                    value={this._comment}
                    onValueChanged={this._onCommentChanged} />
                {
                    this.props.footerInfoMessage &&
                    <MessageBar
                        messageBarType={MessageBarType.info}>
                        {this.props.footerInfoMessage}
                    </MessageBar>
                }
                <DialogFooter>
                    <PrimaryButton
                        className={okButtonClass}
                        onClick={this._onOkButtonClick}
                        disabled={this.props.okDisabled}
                        ariaLabel={okButtonAriaLabel}
                        aria-disabled={this.props.okDisabled}>
                        {okButtonText}
                    </PrimaryButton>
                    <DefaultButton
                        className={cancelButtonClass}
                        onClick={this._onCancelButtonClick}
                        ariaLabel={cancelButtonAriaLabel}>
                        {cancelButtonText}
                    </DefaultButton>
                </DialogFooter>
            </Dialog>
            : null
        );
    }

    private _onCommentChanged = (newValue: string) => {
        this._comment = newValue;
    }

    private _onOkButtonClick = () => {
        if (this.props.onOkButtonClick) {
            this.props.onOkButtonClick(this._comment);
        }
        this._comment = Utils_String.empty;
    }

    private _onCancelButtonClick = () => {
        if (this.props.onCancelButtonClick) {
            this.props.onCancelButtonClick(this._comment);
        }

        this._comment = Utils_String.empty;
    }

    private _comment: string = Utils_String.empty;
}