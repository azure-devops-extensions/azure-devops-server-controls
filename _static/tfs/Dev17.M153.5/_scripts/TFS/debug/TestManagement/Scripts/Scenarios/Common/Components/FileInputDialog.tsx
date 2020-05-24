/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Common/Components/FileInputDialog";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dialog, DialogFooter, DialogType, IDialogContentProps } from "OfficeFabric/Dialog";
import { IModalProps } from "OfficeFabric/Modal";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { BaseControl } from "VSS/Controls";
import {
    FileInputControl,
    FileInputControlContentType,
    FileInputControlResult,
    FileInputControlUpdateEventData,
} from "VSS/Controls/FileInput";
import * as ComponentBase from "VSS/Flux/Component";
import { announce } from "VSS/Utils/Accessibility";
import Utils_String = require("VSS/Utils/String");

export interface IFileInputDialogOptions {
    title: string;
    maximumNumberOfFiles: number;
    maximumTotalFileSize: number;
    onOkClick: (files: FileInputControlResult[]) => void;
}

export interface IFileInputDialogProps extends ComponentBase.Props, IFileInputDialogOptions {
    onClose: () => void;
}

export interface IFileInputDialogState extends ComponentBase.State {
    okEnabled: boolean;
}

export class FileInputDialog extends ComponentBase.Component<IFileInputDialogProps, IFileInputDialogState> {

    private _fileInputControl: FileInputControl;

    constructor(props: IFileInputDialogProps) {
        super(props);
        this.state = {
            okEnabled: false
        };
    }

    public componentDidMount(): void {
        this._fileInputControl = this._createFileControl();
        // Set focus on the browse button by default
        $(".browse-container").focus(10);
    }

    public componentWillUnmount(): void {
        if (this._fileInputControl) {
            this._fileInputControl.dispose();
            this._fileInputControl = null;
        }
    }

    public render(): JSX.Element {
        let dialogcontentProps: IDialogContentProps = {
            title: this.props.title,
            closeButtonAriaLabel: Resources.CloseText,
            type: DialogType.close
        };
        let modalProps: IModalProps = {
            className: "file-input-dialog bowtie-fabric",
            containerClassName: "file-input-dialog-container",
            isBlocking: true
        };
        return (<Dialog
            dialogContentProps={dialogcontentProps}
            modalProps={modalProps}
            hidden={false}
            onDismiss={this._closeDialog}>
            <div ref="file-input-holder">
            </div>
            <DialogFooter>
                <PrimaryButton
                    className={"tcm-ok"}
                    onClick={this._onOkClick}
                    disabled={!this.state.okEnabled}
                    ariaLabel={Resources.OkText}>
                    {Resources.OkText}
                </PrimaryButton>
                <DefaultButton
                    className={"tcm-cancel"}
                    onClick={this._closeDialog}
                    ariaLabel={Resources.CancelText}>
                    {Resources.CancelText}
                </DefaultButton>
            </DialogFooter>

        </Dialog>);
    }

    private _createFileControl(): FileInputControl {
        let options = {
            maximumNumberOfFiles: this.props.maximumNumberOfFiles,
            maximumTotalFileSize: this.props.maximumTotalFileSize,
            resultContentType: FileInputControlContentType.Base64EncodedText,
            updateHandler: (updateEvent: FileInputControlUpdateEventData) => {
                if (updateEvent.loading) {
                    this._updateOkButtonState(false);
                    let uploadingStatus = Resources.Loading;
                    if (updateEvent.files.length > 0) {
                        uploadingStatus = uploadingStatus.concat(Utils_String.format(Resources.LoadingStatus, updateEvent.files.length));
                    }

                    announce(uploadingStatus);
                } else {
                    if (updateEvent.files.length > 0 && updateEvent.files[0].content) {
                        this._updateOkButtonState(true);
                        announce(Utils_String.format(Resources.LoadingCompleted, updateEvent.files.length));
                    }
                    else {
                        this._updateOkButtonState(false);
                    }
                }
            }
        };
        return BaseControl.enhance(FileInputControl, this.refs["file-input-holder"] as HTMLElement, options) as FileInputControl;
    }

    private _updateOkButtonState(enabled: boolean) {
        this.setState({ okEnabled: enabled });
    }

    private _onOkClick = () => {
        if (this.props.onOkClick) {
            this.props.onOkClick(this._fileInputControl.getFiles());
        }
        this._closeDialog();
    }

    private _closeDialog = () => {
        if (this.props.onClose) {
            this.props.onClose();
        }
    }
}

export function openFileInputDialog(options: IFileInputDialogOptions) {
    // Render Dialog
    let container = document.createElement("div");
    let props: IFileInputDialogProps = $.extend({}, options, {
        onClose: () => {
            ReactDOM.unmountComponentAtNode(container);
        }
    });
    ReactDOM.render(React.createElement(FileInputDialog, props), container);
}
