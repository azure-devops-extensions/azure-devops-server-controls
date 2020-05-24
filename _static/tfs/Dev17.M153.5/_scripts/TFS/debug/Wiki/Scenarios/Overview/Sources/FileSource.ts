import * as Q from "q";
import { Attachment, GuidSuffixedFile } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { MAX_ATTACHMENT_FILE_SIZE } from "Wiki/Scripts/CommonConstants";

export class FileSource {
    public static CREATE_ATTACHMENT(file: GuidSuffixedFile): Attachment {
        const attachment = { file: file } as Attachment;
        if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
            attachment.error = new Error("Exceeded maximum allowed size limit.");
        }

        try {
            attachment.blob = new Blob([file]);
            attachment.objectUrl = URL.createObjectURL(attachment.blob);
        } catch (e) {
            attachment.error = e;
        }

        return attachment;
    }

    public readContent(attachment: Attachment): IPromise<Attachment> {
        const deferred = Q.defer<Attachment>();
        if (attachment.error) {
            deferred.resolve(attachment);
        }

        const reader = new FileReader();
        reader.onabort = this._onAbort.bind(this, attachment, deferred);
        reader.onerror = this._onAbort.bind(this, attachment, deferred);
        reader.onloadend = this._onLoadEnd.bind(this, attachment, deferred, reader);

        try {
            reader.readAsDataURL(attachment.blob);
        } catch (e) {
            attachment.error = e;
            deferred.resolve(attachment);
        }

        return deferred.promise;
    }

    private _onAbort(
        attachment: Attachment,
        deferred: Q.Deferred<Attachment>,
    ): void {
        attachment.error = new Error("Error converting blob to base64");
        deferred.resolve(attachment);
    }

    private _onLoadEnd(
        attachment: Attachment,
        deferred: Q.Deferred<Attachment>,
        reader: FileReader,
    ): void {
        const dataUrl: string = reader.result;
        // If the file is empty, Chrome returns result="data:" and IE returns result=null, so we check for both of these cases.
        if (dataUrl) {
            const startIndex = dataUrl.indexOf(",");
            if (startIndex >= 0) {
                let content = dataUrl.substr(startIndex + 1); // Get the base64 content portion of the data url
                // Trim a leading "//" only if it isn't part of the base64 content itself (base64 length is a multiple of 4).
                if (content.substr(0, 2) === "//" && content.length % 4 === 2) {
                    content = content.substr(2);
                }

                attachment.base64Content = content;
            }
        }

        deferred.resolve(attachment);
    }
}
