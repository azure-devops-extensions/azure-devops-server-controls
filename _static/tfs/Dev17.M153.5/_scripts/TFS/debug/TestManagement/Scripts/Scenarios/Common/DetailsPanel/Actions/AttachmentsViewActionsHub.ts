import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as VCBuiltInExtensions from "VersionControl/Scripts/BuiltInExtensions";
import { Action } from "VSS/Flux/Action";
import * as AttachmentOM from "TestManagement/Scripts/Scenarios/LogStore/TestAttachmentModel";

export class AttachmentsViewActionsHub {
    static readonly CHILD_SCOPE = "CHILD_SCOPE";

    public setDefaultState = new Action<void>(AttachmentsViewActionsHub.CHILD_SCOPE);
    public onError = new Action<string>(AttachmentsViewActionsHub.CHILD_SCOPE);
    public attachmentsLoaded = new Action<AttachmentOM.TestAttachmentModel>(AttachmentsViewActionsHub.CHILD_SCOPE);
    public setExtensionHost = new Action<VCBuiltInExtensions.BuiltInExtensionHost>(AttachmentsViewActionsHub.CHILD_SCOPE);
    public showAttachmentPreview = new Action<string>(AttachmentsViewActionsHub.CHILD_SCOPE);
    public setLastSelectedAttachment = new Action<TCMContracts.TestAttachment>(AttachmentsViewActionsHub.CHILD_SCOPE);
    public setAttachmentContentLoading = new Action<boolean>(AttachmentsViewActionsHub.CHILD_SCOPE);
    public closeErrorMessage = new Action<void>(AttachmentsViewActionsHub.CHILD_SCOPE);
    public updateContextMenuOpenIndex = new Action<number>(AttachmentsViewActionsHub.CHILD_SCOPE);
}
