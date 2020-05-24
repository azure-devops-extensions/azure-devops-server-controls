/// <reference types="jquery" />
import { Selection } from "OfficeFabric/DetailsList";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { AttachmentsViewActionsHub } from "TestManagement/Scripts/Scenarios/Common/DetailsPanel/Actions/AttachmentsViewActionsHub";
import * as TCMPermissionUtils from "TestManagement/Scripts/Utils/TFS.TestManagement.PermissionUtils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VCBuiltInExtensions from "VersionControl/Scripts/BuiltInExtensions";
import { Store } from "VSS/Flux/Store";
import * as Utils_String from "VSS/Utils/String";
import * as AttachmentOM from "TestManagement/Scripts/Scenarios/LogStore/TestAttachmentModel";

export interface IAttachmentsViewState {
    errorMessage: string;
    attachments: AttachmentOM.TestAttachmentModel;
    extensionHost: VCBuiltInExtensions.BuiltInExtensionHost;
    selection: Selection;
    logStoreSelection: Selection;
    isAttachmentsListLoading: boolean;
    isLogStoreAttachmentsListLoading: boolean;
    isAttachmentPreviewLoading: boolean;
    contextMenuOpenIndex: number;
    setKey: string;
    hasPublishTestResultsPermission: boolean;
    shouldInvokeFirstItem: boolean;
    lastSelectedAttachment: TCMContracts.TestAttachment;
}

export class AttachmentsViewStore extends Store {

    private _state: IAttachmentsViewState;

    constructor(private _actionsHub: AttachmentsViewActionsHub) {
        super();
        this._initialize();
    }

    public getState(): IAttachmentsViewState {
        return this._state;
    }

    private _initialize(): void {
        this._state = this._getDefaultState();

        this._actionsHub.setDefaultState.addListener(this._setDefaultState);
        this._actionsHub.onError.addListener(this._onErrorListener);
        this._actionsHub.attachmentsLoaded.addListener(this._attachmentsLoadedListener);
        this._actionsHub.setExtensionHost.addListener(this._setExtensionHost);
        this._actionsHub.showAttachmentPreview.addListener(this._showAttachmentPreview);
        this._actionsHub.setLastSelectedAttachment.addListener(this._setLastSelectedAttachment);
        this._actionsHub.setAttachmentContentLoading.addListener(this._setAttachmentContentLoading);
        this._actionsHub.updateContextMenuOpenIndex.addListener(this._updateContextMenuOpenIndexListener);
        this._actionsHub.closeErrorMessage.addListener(this._closeErrorMessage);
    }

    private _getDefaultState(): IAttachmentsViewState {
        return {
            errorMessage: null,
            attachments: null,
            extensionHost: null,
            selection: new Selection(),
            logStoreSelection: new Selection(),
            isAttachmentsListLoading: true,
            isLogStoreAttachmentsListLoading: true,
            isAttachmentPreviewLoading: false,
            contextMenuOpenIndex: -1,
            setKey: "set",
            hasPublishTestResultsPermission: false,
            shouldInvokeFirstItem: false,
            lastSelectedAttachment: null
        };
    }

    private _setDefaultState = (): void => {
        this._state = this._getDefaultState();
        this.emitChanged();
    }
    
    private _onErrorListener = (errorMessage: string): void => {
        this._state.errorMessage = errorMessage;
        this._state.isAttachmentsListLoading = false;
        this._state.isLogStoreAttachmentsListLoading = false;
        this.emitChanged();
    }

    private _closeErrorMessage = (): void => {
        this._state.errorMessage = null;
        this.emitChanged();
    }

    private _attachmentsLoadedListener = (attachments: AttachmentOM.TestAttachmentModel): void => {
        this._state.attachments = attachments;
        this._state.isAttachmentsListLoading = false;
        this._state.isLogStoreAttachmentsListLoading = false;
        this._state.isAttachmentPreviewLoading = true;
        this._state.selection.setAllSelected(false);
        this._state.logStoreSelection.setAllSelected(false);
        this._state.setKey = Utils_String.generateUID();
        this._state.hasPublishTestResultsPermission = TCMPermissionUtils.PermissionUtils.hasPublishResultPermission(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId);
        if ((attachments.getLegacyAttachments() && attachments.getLegacyAttachments().length > 0) || 
            (attachments.getLogStoreAttachments() && attachments.getLogStoreAttachments().length > 0)) {
            this._state.shouldInvokeFirstItem = true;
        }
        
        this.emitChanged();
    }

    private _updateContextMenuOpenIndexListener = (openIndex: number): void => {
        this._state.contextMenuOpenIndex = openIndex;
        this.emitChanged();
    }

    private _showAttachmentPreview = (attachmentContent: string): void => {
        this._state.extensionHost.setConfiguration({
            content: attachmentContent,
            lineNumbers: true,
            skipResource: true
        });
        this._state.isAttachmentPreviewLoading = false;

        this.emitChanged();
    }

    private _setLastSelectedAttachment = (attachment: TCMContracts.TestAttachment): void => {
        this._state.lastSelectedAttachment = attachment;
        this._state.isAttachmentPreviewLoading = false;
        this._state.shouldInvokeFirstItem = false;

        this.emitChanged();
    }

    private _setAttachmentContentLoading = (showAttachmentContentLoadingSpinner: boolean): void => {
        this._state.isAttachmentPreviewLoading = showAttachmentContentLoadingSpinner;
        this.emitChanged();
    }

    private _setExtensionHost = (extHost: VCBuiltInExtensions.BuiltInExtensionHost): void => {
        this._state.extensionHost = extHost;
        this.emitChanged();
    }
}
