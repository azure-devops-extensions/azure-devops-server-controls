// CSS
import "VSS/LoaderPlugins/Css!Controls/WorkItemForm/AttachmentsControl/AttachmentsModal";

import * as React from "react";
import { Modal } from "OfficeFabric/Modal";
import { IconButton, PrimaryButton } from "OfficeFabric/Button";
import { CommandBar } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WITFileHelper } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { delay, DelayedFunction } from "VSS/Utils/Core";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { css } from "OfficeFabric/Utilities";
import { Icon, IIconProps } from "OfficeFabric/Icon";
import { AttachmentsControlCIEvents, AttachmentsControlUIActionSource } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";


// Get browser information
import * as Utils_UI from "VSS/Utils/UI";
import { AttachmentsControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsControl";

export interface IAttachmentsModalProps {
    attachmentContent: WITOM.Attachment;
    isOpen: boolean;
    attachmentsControl: AttachmentsControl;
}
export interface IAttachmentsModalState {
    attachmentFile: WITOM.Attachment;
    showModal: boolean;
    isLoading: boolean;
    hasLoaded: boolean;
}

export class AttachmentsModal extends React.Component<IAttachmentsModalProps, IAttachmentsModalState> {
    private _delayedShowFunction: DelayedFunction;

    public constructor(props: IAttachmentsModalProps) {
        super(props);
        this.state = {
            showModal: props.isOpen,
            attachmentFile: props.attachmentContent,
            isLoading: false,
            hasLoaded: false
        };
    }

    public render(): JSX.Element {

        return (
            <div onClick={this._closeModal}
                onKeyUp={this._handleKeyUpModalCenter}
                tabIndex={0}
            >

                <Modal
                    isOpen={this.state.showModal}
                    isBlocking={false}
                    containerClassName="attachment-preview-container"
                    firstFocusableSelector="attachment-preview-modal-center"
                >

                    {this._getToolbar()}

                    <div className="attachment-preview-modal-center"
                        tabIndex={0}
                        onDrop={(e) => { e.preventDefault(); return false; }}
                        onDragOver={(e) => { e.preventDefault(); return false; }}
                        aria-label={this.state.attachmentFile.getComment() || this.state.attachmentFile.getName()}
                    >
                        <IconButton className={css(!this._hasAdjacentAttachment(false) && "hidden-carousel-traverse-button", "carousel-traverse-button")}
                            iconProps={{ className: "carousel-traversal-icon", iconName: "ChevronLeft" }}
                            onClick={this._traversePrevious}
                        />
                        {this._getPreview()}
                        <IconButton className={css(!this._hasAdjacentAttachment(true) && "hidden-carousel-traverse-button", "carousel-traverse-button")}
                            iconProps={{ className: "carousel-traversal-icon", iconName: "ChevronRight" }}
                            onClick={this._traverseNext}
                        />
                    </div>
                </Modal>
            </div>
        );
    }

    private _traversePrevious = (event: React.MouseEvent<any>): void => {
        this._traverseAttachments(false);
        event.stopPropagation();

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.UI_PREVIEW_TRAVERSE,
            {
                left: true,
                right: false,
                mouse: true,
                keyboard: false,
            }
        );
    }

    private _traverseNext = (event: React.MouseEvent<any>): void => {
        this._traverseAttachments(true);
        event.stopPropagation();

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.UI_PREVIEW_TRAVERSE,
            {
                left: false,
                right: true,
                mouse: true,
                keyboard: false,
            }
        );
    }

    private _closeModal = (): void => {
        if (this._delayedShowFunction) {
            this._delayedShowFunction.cancel();
        }
        this.setState({
            showModal: false,
            isLoading: false,
            hasLoaded: false
        });
    }
    private _getSpinner = (): JSX.Element => {
        return (<Spinner size={SpinnerSize.large} label={WorkItemTrackingResources.AttachmentLoading} />);
    }
    private _beginSpinnerOverlay(waitTime: number) {
        if (this._delayedShowFunction) {
            this._delayedShowFunction.cancel();
        }

        this._delayedShowFunction = delay(this, waitTime, this._showSpinnerOverlay);
    }
    private _showSpinnerOverlay = (): void => {
        this.setState({ isLoading: true });
    }
    private _hideSpinnerOverlay = (): void => {
        this.setState({
            isLoading: false,
            hasLoaded: true
        });
    }
    private _getPreview = (): JSX.Element => {

        let previewContentHolder: JSX.Element = null;
        const extension = WITFileHelper.getExtensionName(this.state.attachmentFile.getName());

        if (this.props.attachmentsControl.supportedImageTypes.indexOf(extension) !== -1) {
            previewContentHolder = (
                <img src={this.state.attachmentFile.getUri(true)}
                    className="attachment-preview-media"
                    onClick={this._stopPropagation}
                    onLoad={this._hideSpinnerOverlay}
                />
            );
        } else if (this.props.attachmentsControl.supportedVideoTypes.indexOf(extension) !== -1) {
            if (!Utils_UI.BrowserCheckUtils.isSafari()) {
                // NOTE: must check if inner statement for back up unhandled preview can be replaced with "null"
                previewContentHolder = (
                    <video
                        className="attachment-preview-media"
                        controls
                        onClick={this._stopPropagation}
                        onLoadStart={this._hideSpinnerOverlay}
                    >
                        <source src={this.state.attachmentFile.getUri(false)} type="video/mp4" />
                        {this._getPreviewUnhandled(extension)}
                    </video>
                );
            }
        } else if (extension === "pdf") {
            previewContentHolder = (
                <object data={this.state.attachmentFile.getUri(false) + "#toolbar=0"}
                    className="attachment-preview-window-content"
                    type="application/pdf"
                    onClick={this._stopPropagation}
                    onKeyUp={this._stopPropagation}
                    onLoad={this._hideSpinnerOverlay}
                >
                    <iframe src={this.state.attachmentFile.getUri(false) + "#toolbar=0"}
                        className="attachment-preview-window-content"
                        onLoad={this._hideSpinnerOverlay}
                    />
                </object>
            );
        }
        if (previewContentHolder === null) {
            return this._getPreviewUnhandled(extension);
        }
        let spinner: JSX.Element = null;
        if (!this.state.isLoading && !this.state.hasLoaded && this.state.showModal) {
            this._beginSpinnerOverlay(250);
        } else if (this.state.isLoading && !this.state.hasLoaded) {
            spinner = (
                <div className="loading-spinner-overlay" onClick={this._stopPropagation}>
                    {this._getSpinner()}
                </div>);
        }
        return (
            <>
                {spinner}
                <div className={css(!this.state.hasLoaded && "hidden-attachment-preview-content")}>
                    {previewContentHolder}
                </div>
            </>
        );
    }
    private _getToolbar = (): JSX.Element => {

        const titleItem: IContextualMenuItem[] = [{
            key: "attachmentTitle",
            className: "attachment-preview-title",
            name: this.props.attachmentsControl.truncateTitle(this.state.attachmentFile.getName(), 40),
            onClick: this._stopPropagation
        }];

        const editCommentButton: IContextualMenuItem = {
            key: "attachmentPreviewEditCommentButton",
            className: "attachment-preview-toolbar-button-editComment",
            name: WorkItemTrackingResources.EditComment,
            iconProps: { className: "ms-Icon ms-Icon--Comment" },
            onClick: (e) => {
                this.props.attachmentsControl.showEditCommentDialog([this.state.attachmentFile]);
                e.stopPropagation();

                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.UI_EDIT_COMMENT,
                    {
                        source: AttachmentsControlUIActionSource.UI_PREVIEW_CONTEXT_MENU
                    }
                );
            }
        };

        const downloadButton: IContextualMenuItem = {
            key: "attachmentPreviewDownloadButton",
            className: "attachment-preview-toolbar-button-download",
            name: WorkItemTrackingResources.DownloadAttachment,
            iconProps: { iconName: "Download" },
            onClick: (e) => {
                this.props.attachmentsControl.downloadAttachment(this.state.attachmentFile);
                e.stopPropagation();

                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.UI_DOWNLOAD,
                    {
                        source: AttachmentsControlUIActionSource.UI_PREVIEW_CONTEXT_MENU
                    }
                );
            }
        };

        const deleteButton: IContextualMenuItem = {
            key: "attachmentPreviewDeleteButton",
            className: "attachment-preview-toolbar-button-delete",
            name: WorkItemTrackingResources.Delete,
            iconProps: { iconName: "Delete" },
            onClick: (e) => {
                this.props.attachmentsControl.deleteAttachments([this.state.attachmentFile]);
                this._closeModal();
                e.stopPropagation();

                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.UI_DELETE,
                    {
                        source: AttachmentsControlUIActionSource.UI_PREVIEW_CONTEXT_MENU
                    }
                );
            }
        };

        const closeButton: IContextualMenuItem = {
            key: "attachmentPreviewCloseButton",
            className: "attachment-preview-toolbar-button-close",
            name: "",
            iconProps: { iconName: "ChromeClose" },
            onClick: this._closeModal
        };

        const buttonItems: IContextualMenuItem[] = [
            editCommentButton,
            downloadButton,
            deleteButton,
            closeButton
        ];

        const commandBar = new CommandBar({
            items: titleItem,
            farItems: buttonItems,
            className: "attachment-preview-toolbar"
        });

        return (
            <div
                className="attachment-preview-menu-container"
                onKeyUp={this._handleKeyUpBasic}
                onClick={this._stopPropagation}
            >
                {commandBar.render()}
            </div>);
    }

    /** @param isNext: boolean
     * isNext=true if the action is to traverse to the next attachment, false to go to the previous attachment
     */
    private _traverseAttachments = (isNext: boolean): void => {
        const nextAttachment = this.props.attachmentsControl.getAdjacentAttachment(this.state.attachmentFile, isNext, true);
        if (nextAttachment !== null) {
            this.changeAttachment(nextAttachment);
        }
    }

    private _hasAdjacentAttachment = (isNext: boolean): boolean => {
        return (this.props.attachmentsControl.getAdjacentAttachment(this.state.attachmentFile, isNext) !== null);
    }

    private _getPreviewUnhandled = (extension: string): JSX.Element => {
        const fileBugIconProps : IIconProps = {
            iconName: "FileBug",
            iconType: 0
        }
        return (
            <div className="attachment-preview-unhandled"
                onClick={this._stopPropagation}
            >
                <Icon className="file-preview-unhandled-icon" aria-hidden="true" {...fileBugIconProps}></Icon>
                <p>
                    {WorkItemTrackingResources.PreviewUnhandled}
                </p>
                <PrimaryButton
                    primary={true}
                    iconProps={{ iconName: "Download" }}
                    onClick={() => { this.props.attachmentsControl.downloadAttachment(this.state.attachmentFile); }}
                    text={WorkItemTrackingResources.DownloadAttachment}
                />
            </div>
        );
    }

    public changeAttachment = (newAttachment: WITOM.Attachment): void => {
        this.setState({
            attachmentFile: newAttachment,
            showModal: true,
            isLoading: false,
            hasLoaded: false
        });
    }
    private _handleKeyUpModalCenter = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        // NOTE: keyCode may be deprecated soon, should possibly switch to key
        switch (event.keyCode) {
            case Utils_UI.KeyCode.LEFT:
                this._traverseAttachments(false);
                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.UI_PREVIEW_TRAVERSE,
                    {
                        left: true,
                        right: false,
                        mouse: false,
                        keyboard: true,
                    }
                );
                break;
            case Utils_UI.KeyCode.RIGHT:
                this._traverseAttachments(true);
                AttachmentsControlCIEvents.publishEvent(
                    AttachmentsControlCIEvents.UI_PREVIEW_TRAVERSE,
                    {
                        left: false,
                        right: true,
                        mouse: false,
                        keyboard: true,
                    }
                );
                break;
            default:
                this._handleKeyUpBasic(event);
                break;
        }
    }
    private _handleKeyUpBasic = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        // NOTE: keyCode may be deprecated soon, should possibly switch to key
        switch (event.keyCode) {
            case Utils_UI.KeyCode.ESCAPE:
                this._closeModal();
                event.stopPropagation();
                break;
            case Utils_UI.KeyCode.DELETE:
                this.props.attachmentsControl.deleteAttachments([this.state.attachmentFile]);
                event.stopPropagation();
                break;
            default:
                break;
        }
    }
    private _stopPropagation = (event: React.KeyboardEvent<any> | React.MouseEvent<any>): void => {
        event.stopPropagation();
    }
}
