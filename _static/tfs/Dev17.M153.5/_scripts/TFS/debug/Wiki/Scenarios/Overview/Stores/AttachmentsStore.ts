import { autobind } from "OfficeFabric/Utilities";
import { Store } from "VSS/Flux/Store";
import { PathConstants } from "Wiki/Scripts/Generated/Constants";

import { Attachment } from "Wiki/Scenarios/Shared/SharedActionsHub";

export interface UnsavedAttachmentsState {
    attachments: IDictionaryStringTo<Attachment>;
    totalSizeOfAttachments: number;
}

export class UnsavedAttachmentsStore extends Store {
    public state: UnsavedAttachmentsState = this._defaultAttachmentState;

    public dispose(): void {
        this._clearAttachments();
    }

    public get allowedAttachmentTypes(): string[] {
        return PathConstants.AllowedAttachmentFileTypes;
    }

    @autobind
    public onAttachmentsAdded(attachments: Attachment[]): void {
        attachments.forEach((value: Attachment) => {
            const serverFriendlyAttachmentName: string = value.file.guidSuffixedFileName;
            this.state.attachments[serverFriendlyAttachmentName] = value;
            this.state.totalSizeOfAttachments += value.file.size;
        });

        this.emitChanged();
    }

    @autobind
    public clearAttachments(): void {
        this._clearAttachments();
        this.emitChanged();
    }

    @autobind
    public update(attachment: Attachment): void {
        const serverFriendlyAttachmentName = attachment.file.guidSuffixedFileName;
        this.state.attachments[serverFriendlyAttachmentName] = attachment;

        this.emitChanged();
    }

    private _clearAttachments(): void {
        for (const fileName of Object.keys(this.state.attachments)) {
            const attachment = this.state.attachments[fileName];
            URL.revokeObjectURL(attachment.objectUrl);

            const file = attachment.file;
            if (file.msClose) {
                file.msClose();
            }
        }

        this.state = this._defaultAttachmentState;
    }

    private get _defaultAttachmentState(): UnsavedAttachmentsState {
        return {
            attachments: {},
            totalSizeOfAttachments: 0,
        } as UnsavedAttachmentsState;
    }
}
