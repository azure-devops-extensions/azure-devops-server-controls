import { IColumn } from "OfficeFabric/DetailsList";
import { Action } from "VSS/Flux/Action";

export interface IAttachmentDetails {
    id: number;
    name: string;
    size: number;
    creationDate: Date;
    comment: string;
    url: string;
}

export class AttachmentsGridViewActionsHub {
    public onError = new Action<string>();
    public onErrorMessageClose = new Action<void>();
    public attachmentsLoaded = new Action<IAttachmentDetails[]>();
    public initializeSelection = new Action<void>();
    public initializeColumns = new Action<IColumn[]>();
    public dismissContextMenu = new Action<IColumn[]>();
    public afterAttachmentDeleted = new Action<IAttachmentDetails[]>();
    public updateContextMenuOpenIndex = new Action<number>();
    public afterSort = new Action<IAttachmentDetails[]>();
    public clearState = new Action<void>();
}