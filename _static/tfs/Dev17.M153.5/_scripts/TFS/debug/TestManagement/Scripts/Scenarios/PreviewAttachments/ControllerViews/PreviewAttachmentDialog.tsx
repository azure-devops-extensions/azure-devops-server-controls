/// <reference types="react" />
import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/PreviewAttachments/ControllerViews/PreviewAttachmentDialog";

import { CommandButton } from "OfficeFabric/Button";
import { ComboBox } from "OfficeFabric/ComboBox";
import { DialogType, IDialogContentProps } from "OfficeFabric/components/Dialog/DialogContent.types";
import { Dialog } from "OfficeFabric/Dialog";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { IModalProps } from "OfficeFabric/Modal";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { TooltipHost } from "VSSUI/Tooltip";
import { autobind } from "OfficeFabric/Utilities";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import * as CommonUtils from "TestManagement/Scripts/Scenarios/Common/CommonUtils";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    PreviewAttachmentActionsCreator,
} from "TestManagement/Scripts/Scenarios/PreviewAttachments/Actions/PreviewAttachmentActionsCreator";
import {
    IPreviewAttachmentState,
    PreviewAttachmentStore,
} from "TestManagement/Scripts/Scenarios/PreviewAttachments/Stores/PreviewAttachmentStore";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import * as VCBuiltInExtensions from "VersionControl/Scripts/BuiltInExtensions";
import { BaseControl } from "VSS/Controls";
import * as ComponentBase from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Html from "VSS/Utils/Html";

export interface IPreviewAttachmentDialogProps extends ComponentBase.Props {
    actionsCreator: PreviewAttachmentActionsCreator;
    store: PreviewAttachmentStore;
    attachmentSource: string;
    testRunId: number;
    testResultId: number;
    subResultId: number;
    filename: string;
    selectedAttachmentId: number;
    onOkClick?: () => void;
    onClose?: () => void;
}

export function renderDialog(element: HTMLElement, PreviewAttachmentDialogProps: IPreviewAttachmentDialogProps): void {
    ReactDOM.render(<PreviewAttachmentDialog { ...PreviewAttachmentDialogProps } />, element);
}

export function unmountDialog(element: HTMLElement): void {
    ReactDOM.unmountComponentAtNode(element);
}

export class PreviewAttachmentDialog extends ComponentBase.Component<IPreviewAttachmentDialogProps, IPreviewAttachmentState> {

    public componentWillMount(): void {
        this._handleStoreChange();
        this.props.store.addChangedListener(this._handleStoreChange);
    }

    public componentWillUnmount(): void {
        this.props.store.removeChangedListener(this._handleStoreChange);
    }

    public componentDidMount(): void {
        this._createExtensionHost();
    }

    public render(): JSX.Element {

        let dialogcontentProps: IDialogContentProps = {
            title: (this.state.dialogTitle) ? this.state.dialogTitle : Utils_String.format(Resources.PreviewAttachment, this.props.filename),
            className: "preview-dialog-content",
            closeButtonAriaLabel: Resources.CloseText,
            type: DialogType.close,
            showCloseButton: true
        };
        let modalProps: IModalProps = {
            className: "preview-dialog bowtie-fabric",
            containerClassName: "preview-dialog-container",
            isBlocking: true
        };
        return (
            /* tslint:disable:react-no-dangerous-html */
            <Dialog
                dialogContentProps={dialogcontentProps}
                modalProps={modalProps}
                hidden={false}
                onDismiss={this._onCancelClick}>
                {
                    this.state.errorMessage ?
                        <TooltipHost content={this.state.errorMessage}>
                            <MessageBar
                                messageBarType={MessageBarType.error}
                                dismissButtonAriaLabel={Resources.ClearErrorMessage}
                                className="preview-attachment-error-bar"
                                isMultiline={false}
                                onDismiss={this._onErrorMessageDismiss}>
                                {this.state.errorMessage}
                            </MessageBar>
                        </TooltipHost>
                        :
                        Utils_String.empty
                }
                <div className="topbar">
                    <ComboBox
                        className="attachmentsComboBox ms-Grid-col ms-sm6 ms-md4 ms-lg3"
                        selectedKey={this.state.comboBoxValue}
                        id="Attachments"
                        ariaLabel={Resources.AttachmentsHeaderText}
                        autoComplete="on"
                        options={this.state.attachments}
                        onChanged={this._onChanged}
                    />
                    <div className = "button-panel">
                        <TooltipHost content={Resources.Download}>
                            <CommandButton
                                className="preview-attachment-dialog-panel-button"
                                onClick={this._downloadAttachment}
                                disabled={false}
                                iconProps={{ iconName: "Download" }}
                                ariaLabel={Resources.DownloadAttachment}
                            >
                                {Resources.Download}
                            </CommandButton>
                        </TooltipHost>
                        <TooltipHost content={Resources.Previous}>
                            <CommandButton
                                className="preview-attachment-dialog-panel-button"
                                onClick={this._previousAttachment}
                                disabled={this.state.previousButtonDisabled}
                                iconProps={{ iconName: "Up" }}
                                ariaLabel={Resources.Previous}
                            >
                            </CommandButton>
                        </TooltipHost>
                        <TooltipHost content={Resources.Next}>
                            <CommandButton
                                className="preview-attachment-dialog-panel-button"
                                onClick={this._nextAttachment}
                                disabled={this.state.nextButtonDisabled}
                                iconProps={{ iconName: "Down" }}
                                ariaLabel={Resources.Next}
                            >
                            </CommandButton>
                        </TooltipHost>
                    </div>
                </div>
                <div
                    className="loading-spinner"
                    hidden={!this.state.loading}
                >
                    <Spinner size={ SpinnerSize.large } />
                </div>
                <div
                    className="preview-error-message unable-to-preview"
                    hidden={!this.state.unableToPreview}
                    dangerouslySetInnerHTML={{ __html: this.state.unableToPreviewErrorMessage ? Utils_Html.HtmlNormalizer.normalize(this.state.unableToPreviewErrorMessage) : Utils_String.empty }}
                >
                </div>
                <div className="fileviewer-holder" ref="file-viewer-holder"
                    hidden={this.state.loading || this.state.unableToPreview}
                >
                </div>
            </Dialog>
            /* tslint:enable:react-no-dangerous-html */
        );
    }

    private _createExtensionHost(): void {
        let extHost: VCBuiltInExtensions.BuiltInExtensionHost;
        let options = {
            tfsContext: TFS_Host_TfsContext.TfsContext.getDefault(),
            end_point: "tfs.source-control.file-viewer",
            cssClass: "attachment-viewer-host",
            integration: {
                end_point: "tfs.source-control.file-viewer"
            }
        };
        extHost = BaseControl.enhance(VCBuiltInExtensions.BuiltInExtensionHost, this.refs["file-viewer-holder"] as HTMLElement, options) as VCBuiltInExtensions.BuiltInExtensionHost;
        this.props.actionsCreator.getAttachments(this.props.testRunId, this.props.testResultId, this.props.subResultId,
            this.props.selectedAttachmentId, this.props.attachmentSource, this.props.filename, extHost);
    }

    private _downloadAttachment = (): void => {
        TelemetryService.publishEvent(TelemetryService.featurePreviewAttachment_DownloadClicked, TelemetryService.downloadButtonClickedInPreviewAttachmentsDialog, 1);
        this.props.actionsCreator.downloadAttachment(this.state.downloadUrl);
    }

    private _nextAttachment = (): void => {
        TelemetryService.publishEvent(TelemetryService.featurePreviewAttachment_Next, TelemetryService.nextButtonClickedInPreviewAttachmentsDialog, 1);
        if (this.state.currentIndex < this.state.attachments.length - 1) {
            this.props.actionsCreator.updatePreviewContent(this.state.currentIndex + 1, this.props.testRunId, this.props.testResultId, this.props.subResultId, this.props.attachmentSource, this.state.attachments);
        }
    }

    private _previousAttachment = (): void => {
        TelemetryService.publishEvent(TelemetryService.featurePreviewAttachment_Previous, TelemetryService.previousButtonClickedInPreviewAttachmentsDialog, 1);
        if (this.state.currentIndex > 0) {
            this.props.actionsCreator.updatePreviewContent(this.state.currentIndex - 1, this.props.testRunId, this.props.testResultId, this.props.subResultId, this.props.attachmentSource, this.state.attachments);
        }
    }

    @autobind
    private _onChanged(option: CommonUtils.IExtendedComboBoxOption, index: number, value: string): void {
        TelemetryService.publishEvent(TelemetryService.featurePreviewAttachment_DropdownAttachmentSelected, TelemetryService.dropdownAttachmentSelectedInPreviewAttachmentsDialog, 1);
        this.props.actionsCreator.updatePreviewContent(index, this.props.testRunId, this.props.testResultId, this.props.subResultId, this.props.attachmentSource, this.state.attachments);
    }

    private _handleStoreChange = (): void => {
        this.setState(this.props.store.getState());
    }

    private _onCancelClick = () => {
        this._closeDialog();
    }

    private _closeDialog(): void {
        this.props.actionsCreator.closeDialog();
        if (this.props.onClose) {
            this.props.onClose();
        }
    }

    private _onErrorMessageDismiss = () => {
        this.props.actionsCreator.closeErrorMessage();
    }
}