import * as TestsOM from "TestManagement/Scripts/TFS.TestManagement";
import { AttachmentsGridViewActionsHub } from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Actions/AttachmentsGridViewActionsHub";
import { AttachmentsGridViewActionsCreator } from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Actions/AttachmentsGridViewActionsCreator";
import * as AttachmentsGridView from "TestManagement/Scripts/Scenarios/AttachmentsGridView/ControllerViews/AttachmentsGridView";
import { AttachmentsGridViewSource } from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Sources/AttachmentsGridViewSource";
import { AttachmentsGridViewStore } from "TestManagement/Scripts/Scenarios/AttachmentsGridView/Stores/AttachmentsGridViewStore";

export class AttachmentsGridViewOptions {
    container: JQuery;
    attachmentSource: string;
    testRunId: number;
    testResultId: number;
    subResultId: number;
}

export class AttachmentsGridViewHelper {
    constructor() {
        const actionsHub = new AttachmentsGridViewActionsHub();
        const source = new AttachmentsGridViewSource();
        this._attachmentsGridViewStore = new AttachmentsGridViewStore(actionsHub);
        this._attachmentsGridViewActionsCreator = new AttachmentsGridViewActionsCreator(actionsHub, source);
    }
    public renderAttachmentsGrid(options: AttachmentsGridViewOptions): void {

        let container = document.createElement("div");
        options.container.append(container);
        // Render Grid
        let props: AttachmentsGridView.IAttachmentsGridViewProps = {
            actionsCreator: this._attachmentsGridViewActionsCreator,
            store: this._attachmentsGridViewStore,
            attachmentSource: options.attachmentSource,
            testRunId: options.testRunId,
            testResultId: options.testResultId,
            subResultId: options.subResultId
        };
        AttachmentsGridView.renderGrid(container, props);
    }

    private _attachmentsGridViewActionsCreator: AttachmentsGridViewActionsCreator;
    private _attachmentsGridViewStore: AttachmentsGridViewStore;
}