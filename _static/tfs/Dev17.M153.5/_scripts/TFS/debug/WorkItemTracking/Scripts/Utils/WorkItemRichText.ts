import { TfsContext, IRouteData } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import RichEditor = require("VSS/Controls/RichEditor");
import Utils_Core = require("VSS/Utils/Core");
import { WorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemControl";
import { MaximizableWorkItemControl } from "WorkItemTracking/Scripts/Controls/WorkItemForm/MaximizableWorkItemControl";
import { addAttachment } from "WorkItemTracking/Scripts/Utils/Attachments";
import { isValidFileType, getInvalidFileTypeMessage } from "WorkItemTracking/Scripts/Utils/ImageUploader";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

const delegate = Utils_Core.delegate;

export namespace WorkItemRichText {
    function buildInlineImageConfig(control: any) {
        /// <summary>Builds the configuration options needed to add inline image support to a toolbar.</summary>
        /// <param name="control" type="object">The control that owns the toolbar in which to place the inline image button.</param>

        const insertImageConfig = {  // Use this to add inline image support to your controls' toolbar.
            groupName: "image",
            commands: [{
                name: WorkItemTrackingResources.InsertImageName,
                command: RichEditor.RichEditor.INSERT_IMAGE_COMMAND,
                execute: delegate(control, function (commandInfo, editor) {
                    const options = {
                        title: WorkItemTrackingResources.InsertImageName,
                        attachmentLabel: WorkItemTrackingResources.InsertImageEditLabel,
                        uploadingTitle: WorkItemTrackingResources.InsertImageUploadingDialogTitle,
                        showComments: false,
                        uploadOnly: true,
                        successCallback: delegate(control, function (showUserInterface, attachedFile) {
                            editor.insertImage(attachedFile.Url);
                        }),
                        validator: {
                            validate: isValidFileType,
                            errorString: getInvalidFileTypeMessage()
                        }
                    };

                    addAttachment(control._workItem, options);
                })
            }]
        };

        return insertImageConfig;
    }

    export function getCustomCommandGroups(control: MaximizableWorkItemControl) {
        var commandGroups = [buildInlineImageConfig(control)];
        return commandGroups;
    }

    export function getUploadAttachmentApiLocation(control: WorkItemControl) {
        var areaId: number,
            apiLocation = "";

        if (control._workItem) {
            areaId = control._workItem.getField(WITConstants.CoreField.AreaId).getValue();
            apiLocation = control.getTfsContext().getActionUrl("UploadAttachmentBinary", "wit", { area: "api", areaId: areaId } as IRouteData);
        }
        return apiLocation;
    }
}
