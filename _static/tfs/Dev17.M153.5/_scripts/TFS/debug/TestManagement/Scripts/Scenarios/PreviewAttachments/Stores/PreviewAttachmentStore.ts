/// <reference types="jquery" />
import { findIndex } from "OfficeFabric/Utilities";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    IAttachmentsInfo,
    IAttachmentsLoadedOptions,
    PreviewAttachmentActionsHub,
} from "TestManagement/Scripts/Scenarios/PreviewAttachments/Actions/PreviewAttachmentActionsHub";
import * as CommonUtils from "TestManagement/Scripts/Scenarios/Common/CommonUtils";
import * as VCBuiltInExtensions from "VersionControl/Scripts/BuiltInExtensions";
import { Store } from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";

export interface IPreviewAttachmentState {
    showDialog: boolean;
    errorMessage: string;
    extensionHost: VCBuiltInExtensions.BuiltInExtensionHost;
    unableToPreview: boolean;
    unableToPreviewErrorMessage: string;
    loading: boolean;
    dialogTitle: string;
    comboBoxValue: number;
    previousButtonDisabled: boolean;
    nextButtonDisabled: boolean;
    currentIndex: number;
    attachments: CommonUtils.IExtendedComboBoxOption[];
    downloadUrl: string;
    filename: string;
}

export class PreviewAttachmentStore extends Store {

    constructor(private _actionsHub: PreviewAttachmentActionsHub) {
        super();
        this._initialize();
    }

    private _initialize(): void {
        this._state = this._getDefaultState();
        this._actionsHub.closeDialog.addListener(this._closeDialogListener);
        this._actionsHub.onError.addListener(this._onErrorListener);
        this._actionsHub.onErrorMessageClose.addListener(this._onErrorMessageCloseListener);
        this._actionsHub.attachmentsLoaded.addListener(this._attachmentsLoadedListener);
        this._actionsHub.beforeAttachmentContentFetched.addListener(this._beforeAttachmentContentFetchedListener);
        this._actionsHub.afterAttachmentContentFetched.addListener(this._afterAttachmentContentFetchedListener);
        this._actionsHub.setLoadingState.addListener(this._setLoadingStateListener);
        this._actionsHub.setUnableToPreviewState.addListener(this._setUnableToPreviewStateListener);
        this._actionsHub.setExtensionHostConfiguration.addListener(this._setExtensionHostConfigurationListener);
        this._actionsHub.updateCurrentIndex.addListener(this._updateCurrentIndexListener);
        this._actionsHub.updateUnableToPreviewErrorMessage.addListener(this._updateUnableToPreviewErrorMessageListener);
    }

    public getState(): IPreviewAttachmentState {
        return this._state;
    }

    private _updateStateOfNextAndPreviousAttachmentButtons = (): void => {
        if (this._state.currentIndex >= this._state.attachments.length - 1) {
            this._state.nextButtonDisabled = true;
        } else {
            this._state.nextButtonDisabled = false;
        }

        if (this._state.currentIndex <= 0) {
            this._state.previousButtonDisabled = true;
        } else {
            this._state.previousButtonDisabled = false;
        }
        this.emitChanged();
    }

    private _attachmentsLoadedListener = (attachmentsLoadedOptions: IAttachmentsLoadedOptions): void => {
        this._state.extensionHost = attachmentsLoadedOptions.extensionHost;
        this._state.comboBoxValue = attachmentsLoadedOptions.selectedAttachmentId;
        this._state.attachments = attachmentsLoadedOptions.attachments;
        this.emitChanged();
    }

    private _beforeAttachmentContentFetchedListener = (attachmentInfo: IAttachmentsInfo): void => {
        this._state.loading = true;
        this._state.comboBoxValue = attachmentInfo.attachmentId;
        let params = {
            attachmentId: attachmentInfo.attachmentId
        };
        let url: string = attachmentInfo.url;
        this._state.downloadUrl = url;
        if (this._state.attachments.length !== 0) {
            let attachmentObjIndex = findIndex(this._state.attachments, attachment => attachment.key === attachmentInfo.attachmentId);
            let attachmentObj = this._state.attachments[attachmentObjIndex];
            this._state.filename = attachmentObj.text;
        } else {
            this._state.filename = attachmentInfo.filename;
        }
        this.emitChanged();
    }

    private _afterAttachmentContentFetchedListener = (attachmentInfo: IAttachmentsInfo): void => {
        this._state.dialogTitle = Utils_String.format(Resources.PreviewAttachment, attachmentInfo.filename);
        this._state.comboBoxValue = attachmentInfo.attachmentId;
        this._state.currentIndex = findIndex(this._state.attachments, attachment => attachment.key === attachmentInfo.attachmentId);
        this.emitChanged();
    }

    private _setExtensionHostConfigurationListener = (attachmentContent: string): void => {
        this._state.extensionHost.setConfiguration({
                content: attachmentContent,
                lineNumbers: true,
                skipResource: true
        });
        this._state.loading = false;
        this.emitChanged();
    }

    private _setLoadingStateListener = (loading: boolean): void => {
        this._state.loading = loading;
        this.emitChanged();
    }

    private _setUnableToPreviewStateListener = (unableToPreview: boolean): void => {
        this._state.unableToPreview = unableToPreview;
        this.emitChanged();
    }

    private _updateUnableToPreviewErrorMessageListener = (errorMessage: string): void => {
        this._state.unableToPreviewErrorMessage = errorMessage;
        this.emitChanged();
    }

    private _updateCurrentIndexListener = (newIndex: number): void => {
        this._state.currentIndex = newIndex;
        this._updateStateOfNextAndPreviousAttachmentButtons();
        this.emitChanged();
    }

    private _closeDialogListener = (): void => {
        this._state = { showDialog: false } as IPreviewAttachmentState;
        this.emitChanged();
    }

    private _onErrorListener = (errorMessage: string): void => {
        this._state.errorMessage = errorMessage;
        this.emitChanged();
    }

    private _onErrorMessageCloseListener = (): void => {
        this._state.errorMessage = null;
        this.emitChanged();
    }

    private _getDefaultState(): IPreviewAttachmentState {
        return {
            showDialog: true
        } as IPreviewAttachmentState;
    }

    private _state: IPreviewAttachmentState;
}
