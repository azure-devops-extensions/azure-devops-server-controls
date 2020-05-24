import * as TestsOM from "TestManagement/Scripts/TFS.TestManagement";
import { RequirementsGridViewActionsHub } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Actions/RequirementsGridViewActionsHub";
import { RequirementsGridViewActionsCreator } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Actions/RequirementsGridViewActionsCreator";
import * as RequirementsGridView from "TestManagement/Scripts/Scenarios/RequirementsGridView/ControllerViews/RequirementsGridView";
import { RequirementsGridViewSource } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Sources/RequirementsGridViewSource";
import { RequirementsGridViewStore } from "TestManagement/Scripts/Scenarios/RequirementsGridView/Stores/RequirementsGridViewStore";

import TCMContracts = require("TFS/TestManagement/Contracts");

export class RequirementsGridViewOptions {
    container: JQuery;
    result: TCMContracts.TestCaseResult;
}

export class RequirementsGridViewHelper {
    constructor() {
        const actionsHub = new RequirementsGridViewActionsHub();
        const source = new RequirementsGridViewSource();
        this._requirementsGridViewStore = new RequirementsGridViewStore(actionsHub);
        this._requirementsGridViewActionsCreator = new RequirementsGridViewActionsCreator(actionsHub, source);
    }
    public renderRequirementsGrid(options: RequirementsGridViewOptions): void {

        let container = document.createElement("div");
        options.container.append(container);
        // Render Grid
        let props: RequirementsGridView.IRequirementsGridViewProps = {
            actionsCreator: this._requirementsGridViewActionsCreator,
            store: this._requirementsGridViewStore,
            testCaseResult: options.result
        };
        RequirementsGridView.renderGrid(container, props);
    }

    private _requirementsGridViewActionsCreator: RequirementsGridViewActionsCreator;
    private _requirementsGridViewStore: RequirementsGridViewStore;
}