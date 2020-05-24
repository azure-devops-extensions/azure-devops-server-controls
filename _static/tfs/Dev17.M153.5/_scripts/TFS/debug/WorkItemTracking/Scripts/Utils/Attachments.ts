import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import VSS = require("VSS/VSS");
import Utils_UI = require("VSS/Utils/UI");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WorkItemTrackingResources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import WITWebApi = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.WebApi");

const getErrorMessage = VSS.getErrorMessage;

export function addAttachment(workItem?: WITOM.WorkItem, options?: any) {
    var form,
        fileUpload,
        dialog,
        dialogContent,
        id,
        comment,
        targetName,
        callbackName,
        dialogTitle,
        attachmentLabel,
        uploadResult,
        showComments,
        validated,
        progressId,
        iframe,
        canceled = false,
        title,
        attachmentChunkSize = 25000000; //25M

    if (!workItem && !(options && options.uploadOnly && $.isFunction(options.formActionDelegate))) {
        return false;
    }

    id = "FileUpload" + Controls.getId();
    targetName = "tgt" + id;
    callbackName = "cb" + targetName;
    title = options && options.title ? options.title : WorkItemTrackingResources.AddAttachmentDialogTitle;
    attachmentLabel = options && options.attachmentLabel ? options.attachmentLabel : WorkItemTrackingResources.AddAttachmentDialogFieldAttachment;

    function shouldContinue(): boolean {
        return !canceled;
    }

    uploadResult = {
        callback: function (uploadContext) {
            var error,
                attachedFile,
                attachment;

            uploadContext = uploadContext || {};

            //delete our iframe
            if (iframe) {
                iframe.remove();
                iframe = null;
            }

            if (progressId) {
                VSS.globalProgressIndicator.actionCompleted(progressId);
                progressId = null;
            }

            //delete our callback
            window[callbackName] = undefined;
            try {
                delete window[callbackName];
            } catch (e) { }

            if (!canceled && uploadContext.success) {
                attachedFile = uploadContext.attachments[0];

                //create the attachment if we haven't explicitly specified not to.
                if ((options && !options.uploadOnly) || !options) {
                    attachment = WITOM.Attachment.create(workItem, attachedFile.Name, attachedFile.Id, comment ? comment.val() : "", attachedFile.Size);

                    //add it to the work item
                    workItem.addLink(attachment);
                }

                //close our dialog
                dialog.close();

                if (options && $.isFunction(options.successCallback)) {
                    options.successCallback(false /* no custom UI needed by the browser */, attachedFile);
                }
            }
            else {
                jQuery("#" + id + "_OK").button("option", "disabled", false);

                if (canceled || uploadContext.canceled) {
                    canceled = true;
                } else {
                    if (uploadContext.clientError) {
                        error = uploadContext.clientError;
                    }
                    else if (uploadContext.error.serverError
                        && uploadContext.error.serverError.value
                        && uploadContext.error.serverError.value.Message) {
                        error = uploadContext.error.serverError.value.Message;
                    }
                    else if (uploadContext.error && uploadContext.error.message) {
                        error = new Error(uploadContext.error.message);
                    }
                    else {
                        error = new Error(WorkItemTrackingResources.AddAttachmentUnknownError);
                    }

                    alert(getErrorMessage(error));
                }
            }
        }
    };

    dialog = Dialogs.show(Dialogs.ModalDialog, {
        title: title,
        cssClass: "attachment-dialog",
        open: function () {
            dialogContent = $("<div></div>").addClass("attachment-dialog");
            $("<label />")
                .text(attachmentLabel)
                .attr("for", id)
                .addClass("label")
                .appendTo(dialogContent);

            form = $("<form />")
                .attr("method", "POST")
                .attr("enctype", "multipart/form-data")
                .attr("encoding", "multipart/form-data")
                .appendTo(dialogContent);

            fileUpload = $("<input />")
                .attr("type", "file")
                .attr("id", id)
                .attr("name", "attachment")
                .attr("contentEditable", "false") //IE 8 allows user to enter text inside editable box. We are disabling it.
                .addClass("file textbox")
                .appendTo(form)
                .keydown(function (e) {
                    if (e.keyCode === Utils_UI.KeyCode.ENTER && Utils_UI.BrowserCheckUtils.isMsie()) {
                        // Handle Enter key on Browse button in IE
                        // Prevent form submit
                        return false;
                    }
                });
            TFS_Core_Ajax.setAntiForgeryToken(form);

            if (options && options.fileType) {
                fileUpload.attr("accept", options.fileType);
            }

            // by default we always show comments
            // options.showComments can override this setting
            showComments = options && options.showComments !== undefined ? options.showComments : true;

            if (showComments) {
                $("<label />")
                    .text(WorkItemTrackingResources.AddAttachmentDialogFieldComment)
                    .attr("for", "comment" + id)
                    .addClass("label")
                    .appendTo(dialogContent);

                comment = $("<input />")
                    .attr("type", "text")
                    .attr("id", "comment" + id)
                    .addClass("comment textbox")
                    .appendTo(dialogContent);
            }

            $(this).append(dialogContent);
            fileUpload.focus();
        },
        close: () => {
            uploadResult.callback({ success: false, canceled: true });
            if (options && options.onClose) {
                options.onClose();
            }
        },
        defaultButton: "OK",
        buttons: {
            "OK": {
                text: WorkItemTrackingResources.OK,
                id: id + "_OK",
                click: function () {
                    var formAction,
                        fileName = fileUpload.val();

                    if (fileName) {
                        // Validate the file type if the dialog caller wants
                        if (options && options.validator && $.isFunction(options.validator.validate)) {

                            validated = options.validator.validate($(fileUpload).val(), options);

                            if (!validated) {
                                uploadResult.callback({ success: false, clientError: { message: options.validator.errorString } });
                            }
                        }
                        else {
                            // No validation required.
                            validated = true;
                        }

                        if (validated) {

                            //create an hidden iframe element. The form upload will post to this iframe.
                            iframe = $("<iframe />", { name: targetName, id: targetName }).hide().bind("error", function (e) {
                                alert(e);
                            }).appendTo(document.body);

                            uploadResult.isCallback = true;
                            window[callbackName] = uploadResult;

                            Utils_Core.delay(this, 0, function () {
                                //post the attachment contents
                                try {
                                    progressId = VSS.globalProgressIndicator.actionStarted("add-attachment-attempt" + Controls.getId());
                                    jQuery("#" + id + "_OK").button("option", "disabled", true);
                                    var file = fileUpload[0].files ? fileUpload[0].files[0] : null;

                                    //Chunk file upload if we are using a browser that supports File slicing
                                    if (file) {
                                        let httpClient = workItem.store.tfsConnection.getHttpClient<WITWebApi.WorkItemTrackingHttpClient>(WITWebApi.WorkItemTrackingHttpClient);
                                        let areaPath = workItem.getComputedFieldValue(WITConstants.CoreField.AreaPath).value;
                                        let chunkSize;

                                        if ($.isFunction(file.slice) && file.size > attachmentChunkSize) {
                                            chunkSize = attachmentChunkSize;
                                        }

                                        httpClient.beginAttachmentUpload(workItem.project.guid, file, areaPath, chunkSize, shouldContinue, file.name).then(
                                            (result: WITWebApi.IAttachmentReference) => {
                                                uploadResult.callback({
                                                    success: true,
                                                    attachments: [{ "Name": file.name, "Size": file.size, "Id": result.id, "Url": result.url }]
                                                });
                                            },
                                            (error) => {
                                                uploadResult.callback({ success: false, error: error });
                                            });
                                    }
                                    dialog.setTitle(dialogTitle);
                                }
                                catch (e) {
                                    uploadResult.callback({ success: false, clientError: e });
                                }
                            });
                        }
                    }
                    else {
                        uploadResult.callback({ success: false, clientError: { message: Utils_String.format(WorkItemTrackingResources.AddAttachmentFileNotFoundError, fileName) } });
                    }
                }
            },
            "Cancel": {
                text: WorkItemTrackingResources.Cancel,
                click: function () {
                    uploadResult.callback({ success: false, canceled: true });
                    dialog.close();
                }
            }
        },
        width: options && options.width ? options.width : "30em",
        height: "auto",
        dynamicSize: false,
        resizable: false
    });
}
