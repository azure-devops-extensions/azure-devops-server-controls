/// <reference types="react" />

import * as React from "react";

import * as ComponentBase from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { autobind, css } from "OfficeFabric/Utilities";

import { FileInput, FileInputResult, FileInputUpdateEventData, FileInputContentType } from "VSSUI/FileInput";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/FileUploadDialog";

export { FileInputContentType, FileInputResult } from "VSSUI/FileInput";

export interface IFileInputDialogProps extends ComponentBase.IProps {
    onDialogClose: () => void;
    onOkClick: (file: FileInputResult) => void;
    maxFileSize?: number;
    resultContentType?: FileInputContentType;
    title?: string;
}

export interface IFileInputDialogState {
    file: FileInputResult;
}

export class FileUploadDialog extends ComponentBase.Component<IFileInputDialogProps, IFileInputDialogState> {

    public render(): JSX.Element {
        let _maxSecureFileSize: number = this.props.maxFileSize || 10 * 1024 * 1024;
        let _resultContentType: FileInputContentType = this.props.resultContentType || FileInputContentType.RawFile;

        return <Dialog
                    hidden={false}
                    title={this.props.title || Resources.FileUploadDialogTitle}
                    modalProps={{
                        containerClassName: css("file-upload-dialog", this.props.cssClass)
                    }}
                    dialogContentProps={{
                        type: DialogType.close
                    }}
                    onDismiss={this._onDialogClose}
                    closeButtonAriaLabel={Resources.CloseButtonText}
                    firstFocusableSelector={"vss-FileInput-browseContainer"}>

                    <div>
                        <FileInput maximumNumberOfFiles={1}
                                maximumSingleFileSize={_maxSecureFileSize}
                                updateHandler={this._onFileInputUpdate}
                                resultContentType={_resultContentType} />

                        <DialogFooter>
                            <PrimaryButton
                                className={css("fabric-style-overrides")}
                                ariaLabel={Resources.OK}
                                onClick={this._onOkClicked}
                                disabled={!this.state.file}
                                aria-disabled={!this.state.file}>
                                {Resources.OK}
                            </PrimaryButton>

                            <DefaultButton
                                ariaLabel={Resources.CancelButtonText}
                                onClick={this._onDialogClose}>
                                {Resources.CancelButtonText}
                            </DefaultButton>
                        </DialogFooter>
                    </div>
                </Dialog>;
    }

    private _closeDialog() {
        if (!!this.props.onDialogClose) {
            this.props.onDialogClose();
        }
    }

    @autobind
    private _onDialogClose(): void {
        this._closeDialog();
    }

    @autobind
    private _onOkClicked(): void {
        if (!!this.props.onOkClick) {
            this.props.onOkClick(this.state.file);
        }
        this._closeDialog();
    }

    @autobind
    private _onFileInputUpdate(updateEvent: FileInputUpdateEventData): void {
        let file: FileInputResult = null;
        if (updateEvent && updateEvent.files && updateEvent.files.length) {
            file = updateEvent.files[0].result;
        }
        this.setState({
            file: file
        });
    }
}