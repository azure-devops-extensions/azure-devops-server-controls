/// <reference types="jquery" />
import { IColumn, Selection } from "OfficeFabric/DetailsList";
import { removeIndex } from "OfficeFabric/Utilities";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import {
    AttachmentsGridViewActionsHub,
    IAttachmentDetails,
} from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Actions/AttachmentsGridViewActionsHub";
import { Store } from "VSS/Flux/Store";
import { announce } from "VSS/Utils/Accessibility";


export interface IAttachmentsGridViewState {
    errorMessage: string;
    attachments: IAttachmentDetails[];
    columns: IColumn[];
    selection: Selection;
    selectionDetails: IAttachmentDetails[];
    isContextMenuVisible: boolean;
    contextMenuOpenIndex: number;
}

export class AttachmentsGridViewStore extends Store {

    constructor(private _actionsHub: AttachmentsGridViewActionsHub) {
        super();
        this._initialize();
    }

    private _initialize(): void {
        this._state = this._getDefaultState();
        this._actionsHub.onError.addListener(this._onErrorListener);
        this._actionsHub.onErrorMessageClose.addListener(this._onErrorMessageCloseListener);
        this._actionsHub.attachmentsLoaded.addListener(this._attachmentsLoadedListener);
        this._actionsHub.initializeColumns.addListener(this._initializeColumnsListener);
        this._actionsHub.dismissContextMenu.addListener(this._onDismissContextMenuListener);
        this._actionsHub.afterAttachmentDeleted.addListener(this._attachmentDeletedListener);
        this._actionsHub.updateContextMenuOpenIndex.addListener(this._updateContextMenuOpenIndexListener);
        this._actionsHub.afterSort.addListener(this._attachmentsSortedListener);
        this._actionsHub.clearState.addListener(this._clearState);
    }

    public getState(): IAttachmentsGridViewState {
        return this._state;
    }

    private _clearState = (): void => {
        this._state = this._getDefaultState();
    }

    private _initializeSelectionListener = (): void => {
        this._state.selection = new Selection({
            onSelectionChanged: () => {
                let previousSelectionLength: number;
                if (this._state.selectionDetails) {
                    previousSelectionLength = this._state.selectionDetails.length;
                } else {
                    previousSelectionLength = 0;
                }
                this._state.selectionDetails = this._getSelectionDetails();
                this.emitChanged();
                if (this._state.selectionDetails.length > previousSelectionLength) {
                    announce(Resources.AnnounceSelected);
                } else {
                    announce(Resources.AnnounceDeselected);
                }
            }
        });
        this.emitChanged();
    }

    private _initializeColumnsListener = (columns: IColumn[]): void => {
        this._state.columns = columns;
        if (this._state.selection){
            this._state.selectionDetails = this._getSelectionDetails();
        }
        this.emitChanged();
    }

    private _getSelectionDetails(): IAttachmentDetails[] {
        return (this._state.selection.getSelection() as IAttachmentDetails[]);
    }

    private _attachmentsLoadedListener = (attachments: IAttachmentDetails[]): void => {
        this._state.attachments = attachments;
        this._initializeSelectionListener();
        this.emitChanged();
    }

    private _attachmentsSortedListener = (attachments: IAttachmentDetails[]): void => {
        this._state.attachments = attachments;
        this.emitChanged();
    }

    private _attachmentDeletedListener = (attachments: IAttachmentDetails[]): void => {
        attachments.forEach((attachment) => {
            let index = this._state.attachments.indexOf(attachment);
            this._state.attachments = removeIndex(this._state.attachments, index);
        });
        this._state.selection.setAllSelected(false);
        this.emitChanged();
    }

    private _onDismissContextMenuListener = (columns: IColumn[]): void => {
        this._state.isContextMenuVisible = false;
        this._state.columns = columns;
        this.emitChanged();
    }

    private _updateContextMenuOpenIndexListener = (openIndex: number): void => {
        this._state.contextMenuOpenIndex = openIndex;
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

    private _getDefaultState(): IAttachmentsGridViewState {
        return {
        } as IAttachmentsGridViewState;
    }

    private _state: IAttachmentsGridViewState;
}
