import { CoreField } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { Debug } from "VSS/Diag";
import { IAttachmentReference, WorkItemTrackingHttpClient } from "WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi";
import { WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { format } from "VSS/Utils/String";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

const attachmentChunkSize = 25000000; // 25M
const validFileTypeList = ["jpg", "jpeg", "png", "bmp", "gif", "tif", "tiff"];
const fileTypeToExtension = { "image/jpg": "jpg", "image/jpeg": "jpg", "image/png": "png", "image/bmp": "bmp", "image/gif": "gif", "image/tif": "tif", "image/tiff": "tif" };

export class ImageUploader {
    private _workItem: WorkItem;

    public setWorkItem(workItem: WorkItem) {
        this._workItem = workItem;
    }

    public upload(file: File): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            Debug.assert(this._workItem != null, "Associated workitem not specified");
            // post the attachment contents
            try {
                if (!file || !isValidFileType(file.type)) {
                    const error = getInvalidFileTypeMessage();
                    alert(error);
                    reject(error);
                    return;
                }

                const httpClient = this._workItem.store.tfsConnection.getHttpClient<WorkItemTrackingHttpClient>(WorkItemTrackingHttpClient);
                const areaPath = this._workItem.getComputedFieldValue(CoreField.AreaPath).value;
                const shouldContinue = () => true; // No provision to cancel the upload yet, can be added later based on feedback
                let chunkSize;

                // Chunk file upload if we are using a browser that supports File slicing
                if (typeof file.slice === "function" && file.size > attachmentChunkSize) {
                    chunkSize = attachmentChunkSize;
                }

                // IE11 will specify empty file name when pasting
                const fileName = file.name || `image.${fileTypeToExtension[file.type] || "png" }`;
                httpClient.beginAttachmentUpload(this._workItem.project.guid, file, areaPath, chunkSize, shouldContinue, fileName).then(
                    (result: IAttachmentReference) => {
                        resolve(result.url);
                    },
                    reject);
            } catch (e) {
                reject(e);
            }
        });
    }
}

/**
 * Check if the selected file type is supported as an image file
 */
export function isValidFileType(fileType: string): boolean {
    const validFileTypes = new RegExp("^.*(" + validFileTypeList.join("|") + ")$");
    return validFileTypes.test(fileType.toLowerCase());
}

/**
 * Get the error message with a list of image file types supported
 */
export function getInvalidFileTypeMessage(): string {
    return format(WITResources.InsertImageInvalidFileType, validFileTypeList.join(", "));
}
