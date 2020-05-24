import * as TestsOM from "TestManagement/Scripts/TFS.TestManagement";
import { PreviewAttachmentActionsHub } from "TestManagement/Scripts/Scenarios/PreviewAttachments/Actions/PreviewAttachmentActionsHub";
import { PreviewAttachmentActionsCreator } from "TestManagement/Scripts/Scenarios/PreviewAttachments/Actions/PreviewAttachmentActionsCreator";
import * as PreviewAttachmentDialog from "TestManagement/Scripts/Scenarios/PreviewAttachments/ControllerViews/PreviewAttachmentDialog";
import { PreviewAttachmentSource } from "TestManagement/Scripts/Scenarios/PreviewAttachments/Sources/PreviewAttachmentSource";
import { PreviewAttachmentStore } from "TestManagement/Scripts/Scenarios/PreviewAttachments/Stores/PreviewAttachmentStore";

export class PreviewAttachmentDialogOptions {
    attachmentSource: string;
    testRunId: number;
    testResultId: number;
    subResultId: number;
    filename: string;
    selectedAttachmentId: number;
}

export class PreviewAttachmentHelper {
    constructor() {
        const actionsHub = new PreviewAttachmentActionsHub();
        const source = new PreviewAttachmentSource();
        this._previewAttachmentStore = new PreviewAttachmentStore(actionsHub);
        this._previewAttachmentActionsCreator = new PreviewAttachmentActionsCreator(actionsHub, source);
    }
    public openPreviewAttachmentDialog(options: PreviewAttachmentDialogOptions): void {


        let container = document.createElement("div");
        // Render Dialog
        let props: PreviewAttachmentDialog.IPreviewAttachmentDialogProps = {
            actionsCreator: this._previewAttachmentActionsCreator,
            store: this._previewAttachmentStore,
            attachmentSource: options.attachmentSource,
            testRunId: options.testRunId,
            testResultId: options.testResultId,
            subResultId: options.subResultId,
            filename: options.filename,
            selectedAttachmentId: options.selectedAttachmentId,
            onClose: () => { PreviewAttachmentDialog.unmountDialog(container); }
        };
        PreviewAttachmentDialog.renderDialog(container, props);
    }
    private _previewAttachmentActionsCreator: PreviewAttachmentActionsCreator;
    private _previewAttachmentStore: PreviewAttachmentStore;
}