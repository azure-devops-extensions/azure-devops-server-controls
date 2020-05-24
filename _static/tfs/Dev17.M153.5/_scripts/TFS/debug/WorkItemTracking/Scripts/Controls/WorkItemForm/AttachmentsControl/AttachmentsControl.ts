/// <amd-dependency path="jQueryUI/button"/>
/// <amd-dependency path="jQueryUI/dialog"/>
/// <amd-dependency path="jQueryUI/tabs"/>
/// <reference types="jquery" />

import "VSS/LoaderPlugins/Css!Controls/WorkItemForm/AttachmentsControl/AttachmentsControl";

import { IButtonProps } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IconType } from "OfficeFabric/Icon";
import { AddNewItemComponent, IAddNewItemProps } from "Presentation/Scripts/TFS/Components/AddNewItem";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { StatusIndicatorOverlayHelper } from "Presentation/Scripts/TFS/TFS.UI.SpinnerOverlay";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { Dialog, show } from "VSS/Controls/Dialogs";
import { publishErrorToTelemetry } from "VSS/Error";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { getLocalService } from "VSS/Service";
import { LocalSettingsScope, LocalSettingsService } from "VSS/Settings";
import { ProgressAnnouncer } from "VSS/Utils/Accessibility";
import { AttachmentsGrid } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsGrid";
import { AttachmentIconToggles, IAttachmentIconTogglesProps } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsIconToggles";
import { AttachmentsModal } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentsModal";
import { AttachmentDocumentCardContainer, IAttachmentDocumentCardContainerProps } from "WorkItemTracking/Scripts/Controls/WorkItemForm/AttachmentsControl/AttachmentThumbnailView";
import { IWorkItemAttachmentsControlOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm/Interfaces";
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { CommonErrorDialog } from "WorkItemTracking/Scripts/Dialogs/CommonErrorDialog";
import { DeleteAttachmentsDialog } from "WorkItemTracking/Scripts/Dialogs/DeleteAttachmentsDialog";
import { EditCommentDialog } from "WorkItemTracking/Scripts/Dialogs/EditCommentDialog";
import { IZeroDataProps, ZeroDataComponent } from "WorkItemTracking/Scripts/Form/React/Components/ZeroDataComponent";
import { EditActionSet } from "WorkItemTracking/Scripts/OM/History/EditActionSet";
import { WorkItemHistory } from "WorkItemTracking/Scripts/OM/History/WorkItemHistory";
import { WITFileHelper } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.Helpers";
import { useNewDragDrop, WitFormModeUtility } from "WorkItemTracking/Scripts/Utils/WitControlMode";
import { AttachmentsControlCIEvents, AttachmentsControlUIViewMode } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingCIEventHelper";

import VSS_Controls = require("VSS/Controls");
import VSS_Controls_FileInput = require("VSS/Controls/FileInput");
import VSS_Utils_Core = require("VSS/Utils/Core");
import VSS_Utils_String = require("VSS/Utils/String");

import WitResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import FormModels = require("WorkItemTracking/Scripts/Form/Models");
import FormTabs = require("WorkItemTracking/Scripts/Form/Tabs");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITWebApi = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");

enum ViewMode {
    /** No attachments, show zero data view */
    ZeroData,

    /** Show attachments grid */
    Grid,

    /** Show thumbnail Grid */
    Thumbnail
}

export class AttachmentsControl extends WorkItemControl {
    public _options: IWorkItemAttachmentsControlOptions;
    public supportedImageTypes = ["jpg", "jpeg", "png", "jif", "jfif", "jpx", "fpx", "pcd", "bmp", "img", "eps", "psd", "wmf", "gif"];
    public supportedVideoTypes = ["mp4", "mov", "m4v", "webm"];
    private static _attachmentChunkSize: number = 5000000;
    private static _fileThrottleCount: number = 20;
    private static readonly ADD_ATTACHMENT_MENUITEM_REF = "add-attachment";

    private _settingService = getLocalService(LocalSettingsService);
    private _$addAttachmentsToolbarContainer: JQuery;
    private _attachmentsGrid: AttachmentsGrid;
    private _attachmentsCards: AttachmentDocumentCardContainer;
    private _autoFitAvailableSpace: boolean;

    private _viewMode: ViewMode;
    private _$fullUiContainer: JQuery;
    private _$documentCardContainer: JQuery;
    private _$zeroData: JQuery;
    private _$fileUploader: JQuery;
    private _$addNewItemContainer: JQuery;
    private _$changeAttachmentView: JQuery;
    private _$previewContainer: JQuery;
    private _$editCommentDialogContainer: JQuery;
    private _$deleteAttachmentsDialogContainer: JQuery;
    private _editCommentDialog: EditCommentDialog;
    private _deleteAttachmentsDialog: DeleteAttachmentsDialog;
    private _zeroDataComponent: ZeroDataComponent;
    private _attachmentHistory: EditActionSet[];
    private _attachmentsModal: AttachmentsModal;
    private _disposed: boolean;
    private _onControlResizedHandler: () => void;
    private _dropTarget: VSS_Controls_FileInput.FileDropTarget;

    constructor(container: JQuery, options?: IWorkItemAttachmentsControlOptions, workItemType?: WITOM.WorkItemType) {
        super(container, options, workItemType);
    }

    public dispose() {
        super.dispose();

        if (this._onControlResizedHandler) {
            this._container.off(FormTabs.WorkItemFormTabEvents.WorkItemFormTabSelected, this._onControlResizedHandler);
        }

        if (this._$zeroData) {
            ReactDOM.unmountComponentAtNode(this._$zeroData[0]);
            this._$zeroData.remove();
        }
        if (this._attachmentsGrid) {
            this._attachmentsGrid.dispose();
        }
        if (this._attachmentsModal) {
            this._attachmentsModal = null;
        }
        if (this._useNewAttachmentsPreview()) {
            ReactDOM.unmountComponentAtNode(this._$previewContainer[0]);
            this._$previewContainer.remove();
            this._$previewContainer = null;
        }
        if (this._$addAttachmentsToolbarContainer) {
            ReactDOM.unmountComponentAtNode(this._$addAttachmentsToolbarContainer[0]);
        }
        if (this._useThumbnailAttachmentView()) {
            ReactDOM.unmountComponentAtNode(this._$documentCardContainer[0]);
            this._$documentCardContainer.remove();
            this._$documentCardContainer = null;
            ReactDOM.unmountComponentAtNode(this._$addNewItemContainer[0]);
            this._$addNewItemContainer.remove();
        }

        if (this._dropTarget) {
            this._dropTarget.dispose();
        }

        ReactDOM.unmountComponentAtNode(this._$editCommentDialogContainer[0]);
        ReactDOM.unmountComponentAtNode(this._$deleteAttachmentsDialogContainer[0]);

        this._disposed = true;
    }

    public get isDisposed(): boolean {
        return this._disposed;
    }

    /** @override */
    public _init() {
        this._fieldName = this._fieldName || WITConstants.DalFields.AttachedFiles.toString();

        super._init();

        this._$fullUiContainer = $("<div></div>").addClass("attachments-control-main");
        this._$documentCardContainer = $("<div></div>").addClass("attachments-thumbnail-view");
        this._$zeroData = $("<div></div>");

        this._$editCommentDialogContainer = $("<div></div>").addClass("attachments-dialog");
        this._$editCommentDialogContainer.hide().appendTo(this._$fullUiContainer);
        this._$deleteAttachmentsDialogContainer = $("<div></div>").addClass("attachments-dialog");
        this._$deleteAttachmentsDialogContainer.hide().appendTo(this._$fullUiContainer);
        if (this._useNewAttachmentsPreview()) {
            this._$previewContainer = $("<div></div>").addClass("attachments-previewer");
            this._$previewContainer.hide().appendTo(this._$fullUiContainer);
        }
        this._renderZeroData();
        this._createAttachmentsGrid();
        if (!useNewDragDrop()) {
            this._createAttachmentsDropTarget();
        }

        this._viewMode = ViewMode.ZeroData;
        this._$zeroData.appendTo(this._container);
        this._$fullUiContainer.hide().appendTo(this._container);
        this._$documentCardContainer.hide().appendTo(this._$fullUiContainer);
    }

    public bind(workItem: WITOM.WorkItem) {
        const needToUpdateToolbar = workItem.isReadOnly() !== this.isReadOnly();
        super.bind(workItem);
        if (needToUpdateToolbar) {
            if (workItem.isReadOnly()) {
                this._removeAttachmentsToolbar();
            } else {
                if (!this._$addAttachmentsToolbarContainer) {
                    this._createAttachmentsToolbar();
                }

            }
        }
        if (this._useThumbnailAttachmentView()) {
            this._initializeThumbnailViewToolbar();
        } else {
            this._initializeGridViewToolbar();
        }
    }

    private _renderZeroData() {
        ReactDOM.render(
            React.createElement(ZeroDataComponent, {
                label: WorkItemTrackingResources.AttachmentsZeroData,
                iconClassName: "bowtie-attach",
                ref: z => this._zeroDataComponent = z,
                cta: !this.isReadOnly() ? {
                    label: WorkItemTrackingResources.AddAttachment,
                    buttonProps: {
                        onClick: () => this._showFilePicker()
                    }
                } : null
            } as IZeroDataProps),
            this._$zeroData[0]
        );
    }

    private async _renderDocumentCard() {
        if (!this._attachmentHistory) {
            const history = await WorkItemHistory.getHistoryAsync(this._workItem);
            this._attachmentHistory = history.getActions();
        }
        const dataSource = this._getActiveAttachments(this._workItem);
        this._attachmentsCards = ReactDOM.render(
            React.createElement(AttachmentDocumentCardContainer,
                {
                    cardWorkItem: this._workItem,
                    attachments: dataSource,
                    attachmentsHistory: this._attachmentHistory,
                    attachmentsControl: this
                } as IAttachmentDocumentCardContainerProps),
            this._$documentCardContainer[0]
        );
    }

    private _createAttachmentsToolbar(): void {
        this._$addAttachmentsToolbarContainer = $("<div/>")
            .prependTo(this._$fullUiContainer);

        this._$fileUploader = $("<input />")
            .attr("type", "file")
            .attr("multiple", "multiple")
            .attr("style", "display: none")
            .bind("change", (eventArgs) => {
                if (eventArgs && eventArgs.target && eventArgs.target instanceof HTMLInputElement) {
                    const fileList: FileList = (<HTMLInputElement>eventArgs.target).files;
                    if (fileList && fileList.length > 0) {
                        this._filterAndUploadFiles(
                            fileList, this._workItem,
                            (attachedFiles: WITOM.Attachment[], oversizedFileNames: string[], rejectedFileNames: string[]) => {
                                AttachmentsControlCIEvents.publishEvent(
                                    AttachmentsControlCIEvents.ACTIONS_ADD,
                                    {
                                        isDragDrop: false,
                                        numOfFilesDropped: fileList.length,
                                        numOfFilesAttached: attachedFiles.length,
                                        numOfOversizedFiles: oversizedFileNames.length,
                                        numOfRejectedFiles: rejectedFileNames.length,
                                        oversizedFileExtNames: WITFileHelper.getExtensionNames(oversizedFileNames),
                                        rejectedFileExtNames: WITFileHelper.getExtensionNames(rejectedFileNames),
                                        inputFileExtNames: WITFileHelper.getExtensionNamesFromFileList(fileList),
                                        workItemSessionId: this._workItem.sessionId
                                    });
                            });
                    }
                }
            })
            .appendTo(this._$addAttachmentsToolbarContainer);

        if (!this.isReadOnly()) {
            if (this._options.showBrowseButton) {
                // For Mobile view
                const content = $("<button>")
                    .addClass("add-attachment-button");

                $("<span>")
                    .attr("class", "add-attachment-icon icon bowtie-icon bowtie-math-plus")
                    .appendTo(content);

                $("<div />")
                    .addClass("add-attachment-div")
                    .text(WorkItemTrackingResources.AddAttachment)
                    .appendTo(content);

                content
                    .bind("click", () => {
                        this._showFilePicker();
                    })
                    .appendTo(this._$addAttachmentsToolbarContainer);
            } else {
                // For Desktop view
                this._$addNewItemContainer = $("<div/>").appendTo(this._$addAttachmentsToolbarContainer);
                if (this._useThumbnailAttachmentView()
                    && !this._options.showBrowseButton) {
                    this._$changeAttachmentView = $("<div/>").appendTo(this._$addAttachmentsToolbarContainer);
                }
            }
        }
    }

    public _removeAttachmentsToolbar(): void {
        this._$addAttachmentsToolbarContainer.remove();
    }

    private _showFilePicker() {
        // First clear the file uploader, otherwise trying to upload
        // the same file won't trigger the onChange event
        this._$fileUploader.val("").click();
    }

    private _useNewAttachmentsPreview(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.UseNewAttachmentPreview);
    }

    private _useThumbnailAttachmentView(): boolean {
        return FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.AttachmentThumbnailView);
    }

    public downloadAttachment(attachment: WITOM.Attachment): void {
        attachment.save();

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.ACTIONS_SAVE,
            {
                fileExtName: WITFileHelper.getExtensionName(attachment.getName())
            });
    }

    private _isHidden(): boolean {
        return (this._workItem && this._workItem.isReadOnly());
    }

    public deleteAttachments(attachments: WITOM.Attachment[]): void {
        if (!this._isHidden()) {
            if (!this._deleteAttachmentsDialog) {
                this._deleteAttachmentsDialog = ReactDOM.render(
                    React.createElement(
                        DeleteAttachmentsDialog,
                        {
                            attachmentContent: attachments,
                            hideDialog: false
                        }),
                    this._$deleteAttachmentsDialogContainer[0]);
            } else {
                this._deleteAttachmentsDialog.showDeleteAttachmentsDialog(attachments);
            }
        }
    }

    public showEditCommentDialog(attachments: WITOM.Attachment[]) {
        if (!this._editCommentDialog) {
            this._editCommentDialog = ReactDOM.render(
                React.createElement(
                    EditCommentDialog,
                    {
                        attachmentContent: attachments,
                        hideDialog: false
                    }),
                this._$editCommentDialogContainer[0]);
        } else {
            this._editCommentDialog.showEditCommentDialog(attachments);
        }
    }

    private _openAttachment(attachment: WITOM.Attachment) {
        const fileName = attachment.getName().toLowerCase();
        const extension = WITFileHelper.getExtensionName(fileName);
        if (extension.length > 0 && extension[0].search("htm") === 0) {
            // Do not open HTML directly since it could be malicious
            attachment.save();
        } else {
            attachment.open();
        }

        AttachmentsControlCIEvents.publishEvent(
            AttachmentsControlCIEvents.ACTIONS_OPEN,
            {
                fileExtName: WITFileHelper.getExtensionName(attachment.getName())
            });
    }

    public getAdjacentAttachment(attachment: WITOM.Attachment, isNext: boolean, shouldTraverse?: boolean) {
        if (this._viewMode === ViewMode.Grid) {
            return this._attachmentsGrid.getAdjacentAttachment(attachment, isNext, shouldTraverse);
        } else if (this._viewMode === ViewMode.Thumbnail) {
            return this._attachmentsCards.getAdjacentAttachment(attachment, isNext, shouldTraverse);
        }
        return null;
    }

    public truncateTitle(documentName: string, maxLength: number): string {
        if (documentName.length > maxLength) {
            const truncatedTitleFirstPiece = documentName.slice(0, maxLength / 2 + 5);
            const truncatedTitleSecondPiece = documentName.slice(documentName.length - (maxLength / 2 - 5));
            return `${truncatedTitleFirstPiece}...${truncatedTitleSecondPiece}`;
        } else {
            return documentName;
        }
    }

    private _initializeModal(attachment: WITOM.Attachment): void {
        this._attachmentsModal = ReactDOM.render(
            React.createElement(AttachmentsModal, {
                attachmentContent: attachment,
                isOpen: true,
                attachmentsControl: this
            }),
            this._$previewContainer[0]);
    }

    public tryPreviewAttachment(attachment: WITOM.Attachment): void {

        if (this._useNewAttachmentsPreview()) {
            this._previewAttachment(attachment);
        } else {
            if (this.isAttachmentPreviewable(attachment)) {
                this._previewAttachment(attachment);
            } else {
                this._openAttachment(attachment);
            }
        }
    }

    public isAttachmentPreviewable(attachment: WITOM.Attachment): boolean {
        if (this._useNewAttachmentsPreview()) {
            return true;
        } else {
            const extension = WITFileHelper.getExtensionName(attachment.getName()).toLowerCase();
            return (this.supportedImageTypes.indexOf(extension) !== -1);
        }
    }

    private _previewAttachment(attachment: WITOM.Attachment): void {
        if (this._useNewAttachmentsPreview()) {
            if (this._attachmentsModal === undefined) {
                this._initializeModal(attachment);
            } else {
                this._attachmentsModal.changeAttachment(attachment);
            }
        } else {
            const comment = attachment.getComment() || "";
            const $previewDialogContent = $("<div/>").addClass("attachment-preview-dialog-content");

            const $image = $("<img>")
                .addClass("attachment-preview-image invisible")
                .attr("src", attachment.getUri(true))
                .attr("alt", comment)
                .appendTo($previewDialogContent);

            let loadProgressOverlay = new StatusIndicatorOverlayHelper($previewDialogContent);
            const dismissProgressOverlay = () => {
                if (loadProgressOverlay) {
                    loadProgressOverlay.stopProgress();
                    loadProgressOverlay = null;
                }
            };

            const loadCompleteCallback = (eventObject?: JQueryEventObject) => {
                // Dismiss overlay if not already dismissed
                dismissProgressOverlay();

                // Show image element
                $image.removeClass("invisible");

                const maxImageWidth = $(window).width() * 0.8;
                const maxImageHeight = $(window).height() * 0.8;

                // Set max width and height bounds for the image
                $image.css({ maxWidth: maxImageWidth, maxHeight: maxImageHeight });

                // Set the dimensions of the dialog to fit the image
                $image.closest(".ui-dialog").css({ width: "auto", height: "auto" });

                // Center the dialog vertically and horizontally in the center of the window
                dialog.centerDialog();

                $dialog.removeClass("invisible");

                // Focus on the dialog so it can receive keyboard input, since no element than close button on this dialog can set focus it goes to the jQuery UI dialog
                // The '.ui-dialog' has tabIndex = -1 which is not focusable through keyboard but programmatically.
                dialog.getElement().closest(".ui-dialog").focus();
            };
            $image.bind("load", loadCompleteCallback);

            const dialog = show(Dialog, {
                title: attachment.getName(),
                content: $previewDialogContent,
                noFocusOnClose: true,
                resizable: false,
                dynamicSize: false,
                preventAutoResize: true,
                // setting the dialog to invisible until we resize it correctly (prevents flickering during resize)
                dialogClass: "attachment-preview-dialog invisible",
                close: () => {
                    // Dismiss overlay if not already dismissed
                    dismissProgressOverlay();
                    // Unbind all handlers attached to image
                    $image.unbind();
                }
            });
            const $dialog = dialog.getElement().closest(".attachment-preview-dialog");
            dialog.getElement().attr("aria-describedby", comment);

            // Start load progress overlay with a default delay
            // For small image and fast download speed, no progress indicator will show
            // For large image and slow download speed, we will see the progress
            setTimeout(() => {
                if (loadProgressOverlay) {
                    loadProgressOverlay.startProgress(0);
                    $dialog.removeClass("invisible");

                    // Focus on the dialog so it can receive keyboard input.
                    // Since no element other than close button is on this dialog, we set focus to the jQuery UI dialog
                    // The '.ui-dialog' has tabIndex = -1 which is not focusable through keyboard but programmatically.
                    dialog.getElement().closest(".ui-dialog").focus();
                }
            }, 200);
        }
    }

    private _getActiveAttachments(workItem: WITOM.WorkItem): WITOM.Attachment[] {
        const dataSource = [];
        const links = workItem ? workItem.getLinks() : [];
        for (const link of links) {
            if (link instanceof WITOM.Attachment) {
                dataSource.push($.extend(link, { noContextMenu: link.getPlaceholderStatus() }));
            }
        }
        return dataSource;
    }

    private _createAttachmentsGrid(): void {
        this._attachmentsGrid = <AttachmentsGrid>VSS_Controls.BaseControl.createIn(
            AttachmentsGrid,
            this._$fullUiContainer,
            {
                gutter: false,
                width: "100%",
                minHeight: 300,
                autoSort: true,
                showNameColumnOnly: this._options.showNameColumnOnly,
                hideActions: this._options.hideActions,
                clickCellToOpen: this._options.clickCellToOpen,
                onChange: () => this._refocus(),
                attachmentsControl: this
            });

        // Determine if we should auto fit available grid space
        this._autoFitAvailableSpace = this._options.autoFitFormHeight === true;

        this.onControlResized();

        // Execute on tab navigation
        // Do this to ensure grid is properly drawn on becoming visible
        this._onControlResizedHandler = () => this.onControlResized();
        this._container.on(FormTabs.WorkItemFormTabEvents.WorkItemFormTabSelected, this._onControlResizedHandler);
    }

    protected onControlResized() {
        this.getAvailableSpace().then(this._resize);
    }

    private _createAttachmentsDropTarget(): void {
        if (!this.isReadOnly()) {
            this._dropTarget = VSS_Controls_FileInput.FileDropTarget.makeDropTarget(
                this._container,
                {
                    dropCallback: (dataDrop: DataTransfer) => {
                        this._filterAndUploadFiles(
                            dataDrop.files, this._workItem,
                            (attachedFiles: WITOM.Attachment[], oversizedFileNames: string[], rejectedFileNames: string[]) => {
                                AttachmentsControlCIEvents.publishEvent(
                                    AttachmentsControlCIEvents.ACTIONS_ADD,
                                    {
                                        isDragDrop: true,
                                        numOfFilesDropped: dataDrop.files.length,
                                        numOfFilesAttached: attachedFiles.length,
                                        numOfOversizedFiles: oversizedFileNames.length,
                                        numOfRejectedFiles: rejectedFileNames.length,
                                        oversizedFileExtNames: WITFileHelper.getExtensionNames(oversizedFileNames),
                                        rejectedFileExtNames: WITFileHelper.getExtensionNames(rejectedFileNames),
                                        inputFileExtNames: WITFileHelper.getExtensionNamesFromFileList(dataDrop.files),
                                        workItemSessionId: this._workItem.sessionId
                                    });
                            });
                    }
                });
        }
    }

    private _removeAttachementsDropTarget(): void {
        this._dropTarget = null;
    }

    private _filterAndUploadFiles(
        files: FileList,
        workItem: WITOM.WorkItem,
        completedCallback?: (attachedFiles: WITOM.Attachment[], oversizedFileNames: string[], rejectedFileNames: string[]) => void): void {

        const oversizedFileNames: string[] = [];
        const filesToUpload: File[] = [];

        const beginUpload = () => {
            this._beginUploadFiles(
                filesToUpload, workItem,
                (attachedFiles: WITOM.Attachment[], rejectedFileNames: string[]) => {
                    if (completedCallback) {
                        completedCallback(attachedFiles, oversizedFileNames, rejectedFileNames);
                    }
                });
        };

        if (files && files.length > 0) {
            for (let index = 0; index < files.length; index++) {
                const file = files[index];
                if (file.size > WitFormModeUtility.maxAttachmentSize) {
                    oversizedFileNames.push(file.name);
                } else {
                    filesToUpload.push(file);
                }
            }

            if (oversizedFileNames.length > 0) {
                const maxAttachmentSize = (WitFormModeUtility.maxAttachmentSize / 1048576).toFixed(2);
                // alert user about files that are too large
                CommonErrorDialog.showDialog(
                    WorkItemTrackingResources.AttachmentsOversizedDialogTitle,
                    VSS_Utils_String.format(WorkItemTrackingResources.FilesUploadedExceedMaxMb,
                        maxAttachmentSize,
                        oversizedFileNames.join(", ")),
                    () => {
                        beginUpload();
                    },
                    () => {
                        if (completedCallback) {
                            completedCallback([], oversizedFileNames, []);
                        }
                    },
                );
            } else {
                beginUpload();
            }
        }
    }

    private _beginUploadFiles(
        files: File[], workItem: WITOM.WorkItem,
        completedCallback?: (attachedFiles: WITOM.Attachment[], rejectedFileNames: string[]) => void): void {

        if (files && files.length > 0) {
            if (files.length > AttachmentsControl._fileThrottleCount) {
                CommonErrorDialog.showDialog(
                    WorkItemTrackingResources.FileThrottleDialogTitle,
                    VSS_Utils_String.format(WorkItemTrackingResources.FileThrottleMessage, AttachmentsControl._fileThrottleCount),
                    () => undefined);
                return;
            }
            const uploadAnnouncer: ProgressAnnouncer = new ProgressAnnouncer({
                announceStartMessage: WorkItemTrackingResources.AttachmentUploadingStart,
                announceEndMessage: WorkItemTrackingResources.AttachmentUploadingEnd,
                announceErrorMessage: WorkItemTrackingResources.AttachmentUploadingError,
                announceStartDelay: 0
            });

            const attachedFiles: WITOM.Attachment[] = [];
            const failedFileNames: string[] = [];
            let attachmentsToProcessCount = files.length;

            const tryFinish = (statusCode?: string) => {
                if (this.isDisposed) {
                    return;
                }
                attachmentsToProcessCount--;
                if (attachmentsToProcessCount === 0) {
                    if (failedFileNames.length > 0) {
                        uploadAnnouncer.announceError();

                        // If statusCode is 403 we know its a permission issue versus an issue with the files
                        CommonErrorDialog.showDialog(
                            WorkItemTrackingResources.AttachmentUploadFailDialogTitle,
                            Number(statusCode) === 403 ? WorkItemTrackingResources.AttachmentUploadFailPermissionsMessage : VSS_Utils_String.format(WorkItemTrackingResources.AttachmentUploadFailMessage, failedFileNames.join(", ")),
                            () => undefined);
                    } else {
                        uploadAnnouncer.announceCompleted();
                    }

                    // Focus again on the control in case it was lost
                    this._refocus();

                    if (completedCallback) {
                        completedCallback(attachedFiles, failedFileNames);
                    }
                }
            };

            const attachmentUploadCallback = (result: WITWebApi.IAttachmentReference, file: File, attachment: WITOM.Attachment) => {
                // File.lastModifiedDate is deprecated (https://developer.mozilla.org/en-US/docs/Web/API/File/lastModifiedDate#Browser_compatibility),
                // but Edge (as of 42.17134.1.0) returns null for File.lastModified
                const lastModified = (file.lastModified && new Date(file.lastModified)) || file.lastModifiedDate;

                attachment.resolvePlaceholder(result.id, null, lastModified);
                attachedFiles.push(attachment);

                tryFinish();
            };

            const attachmentUploadErrorCallback = (error: TfsError & ProgressEvent, file: File, attachment: WITOM.Attachment) => {
                failedFileNames.push(file.name);
                attachment.remove();

                tryFinish(error && error.status);
            };

            for (const file of files) {
                // Create and display place holder in grid
                const attachment = WITOM.Attachment.create(workItem, file.name, "", "", file.size, null, null, true);
                workItem.addLink(attachment);

                // Pause before uploading files to enable smoother UI transition between placeholder row and actual row in drag & drop
                VSS_Utils_Core.delay(this, 250, function () {

                    const httpClient = workItem.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);

                    const result = workItem.getComputedFieldValue(WITConstants.CoreField.AreaPath);
                    let areaPath = "";
                    if (result && result.value) {
                        areaPath = result.value;
                    }

                    // Chunk the file if browser supports file slicing
                    if (file.size > AttachmentsControl._attachmentChunkSize && $.isFunction(file.slice)) {
                        httpClient.beginAttachmentUpload(workItem.project.guid, file, areaPath, AttachmentsControl._attachmentChunkSize, () => { return !workItem.isReset(); }, file.name).then(
                            (uploadResult: WITWebApi.IAttachmentReference) => {
                                attachmentUploadCallback(uploadResult, file, attachment);
                            },
                            (error) => {
                                attachmentUploadErrorCallback(error, file, attachment);
                            }
                        );
                    } else {
                        httpClient.beginAttachmentUploadSimple(workItem.project.guid, file, areaPath, file.name).then(
                            (uploadResult: WITWebApi.IAttachmentReference) => {
                                attachmentUploadCallback(uploadResult, file, attachment);
                            },
                            (error) => {
                                attachmentUploadErrorCallback(error, file, attachment);
                            }
                        );
                    }
                });
            }
        }
    }

    private _resize = (availableDrawSpace: FormModels.IAvailableDrawSpace): void => {
        // _resize might have been called asynchronously, so check if the control was disposed before proceeding
        if (this._autoFitAvailableSpace && !this.isDisposed) {
            if (this._viewMode === ViewMode.Grid) {
                // Subtract
                //     4px for ".form-grid .work-item-control" left padding
                //     1px*2 for ".grid" left/right border
                this._attachmentsGrid._element.width(availableDrawSpace.width - 4 - 1 * 2);
                // Subtract 2 to account for the 1px transparent borders for high contrast mode
                this._attachmentsGrid._element.height(availableDrawSpace.height - 2);

                this._attachmentsGrid.layout();
            } else {
                this._$documentCardContainer.width(availableDrawSpace.width - 4 - 1 * 2);
                // Subtract additional 7 to account for padding
                this._$documentCardContainer.height(availableDrawSpace.height - 12);
            }
        }
    }

    /** @override */
    public invalidate(flushing: boolean) {
        if (this.isReadOnly()) {
            this._container.attr("disabled", "disabled");
            if (this._dropTarget) {
                this._removeAttachementsDropTarget();
            }
        } else {
            this._container.removeAttr("disabled");
            if (!this._dropTarget) {
                if (!useNewDragDrop()) {
                    this._createAttachmentsDropTarget();
                }
            }
        }
        this._toggleViews();
        super.invalidate(flushing);
    }

    private _toggleViews(): void {
        if (this._getAttachmentCount(this._workItem) !== 0) {
            const value = this._settingService.read("ToggleAttachmentViewMode", ViewMode.Grid, LocalSettingsScope.Global) as ViewMode;
            if (value === ViewMode.Grid) {
                this._viewMode = ViewMode.Grid;
            } else if (value === ViewMode.Thumbnail) {
                this._viewMode = ViewMode.Thumbnail;
            } else {
                publishErrorToTelemetry({
                    name: "UndefinedAttachmentViewMode",
                    message: "Attachment view mode's value was an unexpected value."
                });
                this._viewMode = ViewMode.Grid;
            }
        }

        if (this._getAttachmentCount(this._workItem) === 0) {
            this._viewMode = ViewMode.ZeroData;
            this._$fullUiContainer.hide();
            this._$documentCardContainer.hide();
            this._$zeroData.show();
            this._renderZeroData();
        } else if (this._useThumbnailAttachmentView()
            && this._viewMode === ViewMode.Thumbnail
            && !this._options.showBrowseButton) {
            this._viewMode = ViewMode.Thumbnail;
            this._$zeroData.hide();
            this._$fullUiContainer.show();
            this._attachmentsGrid.hideElement();
            this._$documentCardContainer.show();
            this._initializeThumbnailViewToolbar();
            this._renderDocumentCard();
            if (!this._$addAttachmentsToolbarContainer) {
                this._createAttachmentsToolbar();
            }
        } else {
            this._viewMode = ViewMode.Grid;
            this._$fullUiContainer.show();
            this._$documentCardContainer.hide();
            this._$zeroData.hide();
            this._attachmentsGrid.showElement();
            if (this._useThumbnailAttachmentView()) {
                this._initializeThumbnailViewToolbar();
            }
            if (!this._$addAttachmentsToolbarContainer) {
                this._createAttachmentsToolbar();
            }
            // We need to call getAvailableSpace here
            // to account for the case when we go from 0 attachments to 1
            // since we create the toolbar, so there is less
            // space for the attachment grid
            this.getAvailableSpace().then(availableDrawSpace => {
                this._resize(availableDrawSpace);
                if (!this.isDisposed) {
                    this._attachmentsGrid.invalidate(this._workItem);
                }
            });
        }
    }

    private _refocus() {
        if (this._getAttachmentCount(this._workItem) === 0) {
            this._zeroDataComponent.focus();
        } else {
            this._attachmentsGrid.focus();
        }
    }

    /** @override */
    protected isReadOnlyIconHidden(): boolean {
        return true;
    }

    /** @override */
    public getAvailableSpace(): IPromise<FormModels.IAvailableDrawSpace> {
        return super.getAvailableSpace().then(availableSpace => {
            // There is no need to make these calculations if control has been disposed
            if (!this.isDisposed) {
                // To adjust height for tool bar
                const toolbarHeight = this._$addAttachmentsToolbarContainer ? this._$addAttachmentsToolbarContainer.outerHeight(true) : 0;

                if (this._options.calculateHeightWidth) {
                    // When the control is used with a non-fixed layout, use a different measurement mode
                    const $collapsibleContent = this._container.closest(".control");

                    // Width
                    availableSpace.width = $collapsibleContent.width();

                    // Height
                    const controlLayoutGaps = $collapsibleContent.outerHeight(true) - $collapsibleContent.height();
                    availableSpace.height = $(window).height() - $collapsibleContent.offset().top // Available window space for control
                        - (controlLayoutGaps ? controlLayoutGaps : 0) // Adjust for outer margin/border/padding
                        - toolbarHeight; // Adjust for toolbar height
                } else {
                    if (this._$addAttachmentsToolbarContainer) {
                        // Adjust for tool bar area
                        availableSpace.height -= toolbarHeight;
                    }
                }
            }

            return availableSpace;
        });
    }

    /** @override */
    public clear() {
        this._attachmentsGrid.clear();
    }

    /** @override */
    protected isEmpty(): boolean {
        return this._getAttachmentCount(this._workItem) === 0;
    }

    private _getAttachmentCount(workItem: WITOM.WorkItem) {
        const links = workItem ? workItem.getLinks() : [];
        return links.filter(link => link instanceof WITOM.Attachment).length;
    }

    private _initializeThumbnailViewToolbar() {
        if (this._$addNewItemContainer && this._$addNewItemContainer.length > 0 && this._$changeAttachmentView) {
            const addNewItemProps: IAddNewItemProps = {
                className: "add-new-item-container",
                items: [{
                    key: AttachmentsControl.ADD_ATTACHMENT_MENUITEM_REF,
                    name: WorkItemTrackingResources.AddAttachment,
                    onClick: () => this._showFilePicker(),
                    disabled: this.isReadOnly()
                } as IContextualMenuItem],
                displayText: WorkItemTrackingResources.AddAttachment,
                disabledTooltip: WorkItemTrackingResources.LinksControlAddLinkDisabledTooltip
            };
            let thumbnailClassName = "selected";
            let gridClassName = "unselected";
            if (this._viewMode === ViewMode.Grid) {
                thumbnailClassName = "unselected";
                gridClassName = "selected";
            }
            const gridViewButtonProps: IButtonProps = {
                onClick: () => {
                    if (this._viewMode === ViewMode.Thumbnail) {
                        this._viewMode = ViewMode.Grid;
                        this._settingService.write("ToggleAttachmentViewMode", ViewMode.Grid, LocalSettingsScope.Global);
                        this.invalidate(false);

                        AttachmentsControlCIEvents.publishEvent(
                            AttachmentsControlCIEvents.UI_CHANGE_VIEW_MODE,
                            {
                                viewMode: AttachmentsControlUIViewMode.GRID
                            }
                        );
                    }
                },
                disabled: this.isReadOnly(),
                iconProps: {
                    className: gridClassName,
                    iconType: IconType.default,
                    iconName: "AlignJustify"
                },
                className: "toggle-view-button",
                ariaLabel: WitResources.AttachmentsGridViewIconAriaLabel,
            };
            const thumbnailViewButtonProps: IButtonProps = {
                onClick: () => {
                    if (this._viewMode === ViewMode.Grid) {
                        this._viewMode = ViewMode.Thumbnail;
                        this._settingService.write("ToggleAttachmentViewMode", ViewMode.Thumbnail, LocalSettingsScope.Global);
                        this.invalidate(false);

                        AttachmentsControlCIEvents.publishEvent(
                            AttachmentsControlCIEvents.UI_CHANGE_VIEW_MODE,
                            {
                                viewMode: AttachmentsControlUIViewMode.THUMBNAIL
                            }
                        );
                    }
                },
                disabled: this.isReadOnly(),
                iconProps: {
                    className: thumbnailClassName,
                    iconType: IconType.default,
                    iconName: "GridViewSmall"
                },
                className: "toggle-view-button",
                ariaLabel: WitResources.AttachmentsThumbnailViewIconAriaLabel,
            };
            const addAttachmentButton = React.createElement<IAddNewItemProps>(
                AddNewItemComponent,
                addNewItemProps);
            const changeViewButtons = React.createElement(AttachmentIconToggles, {
                gridIconProps: gridViewButtonProps,
                thumbnailIconProps: thumbnailViewButtonProps
            } as IAttachmentIconTogglesProps);
            const toolbarButtons = React.createElement("div", { className: "attachments-toolbar-buttons" }, addAttachmentButton, changeViewButtons);
            ReactDOM.render(toolbarButtons, this._$addNewItemContainer[0]);
        }
    }

    private _initializeGridViewToolbar() {
        if (this._$addNewItemContainer && this._$addNewItemContainer.length > 0) {
            const addNewItemProps: IAddNewItemProps = {
                items: [{
                    key: AttachmentsControl.ADD_ATTACHMENT_MENUITEM_REF,
                    name: WorkItemTrackingResources.AddAttachment,
                    onClick: () => this._showFilePicker(),
                    disabled: this.isReadOnly()
                } as IContextualMenuItem],
                displayText: WorkItemTrackingResources.AddAttachment,
                disabledTooltip: WorkItemTrackingResources.LinksControlAddLinkDisabledTooltip
            };

            // Calling render() replaces the props if the element already has been rendered once.
            ReactDOM.render(
                React.createElement<IAddNewItemProps>(
                    AddNewItemComponent,
                    addNewItemProps),
                this._$addNewItemContainer[0]);
        }
    }
}
