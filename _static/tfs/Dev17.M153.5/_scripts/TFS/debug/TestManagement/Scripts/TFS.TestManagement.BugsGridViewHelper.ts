import * as TestsOM from "TestManagement/Scripts/TFS.TestManagement";
import { BugsGridViewActionsHub } from "TestManagement/Scripts/Scenarios/BugsGridView/Actions/BugsGridViewActionsHub";
import { BugsGridViewActionsCreator } from "TestManagement/Scripts/Scenarios/BugsGridView/Actions/BugsGridViewActionsCreator";
import * as BugsGridView from "TestManagement/Scripts/Scenarios/BugsGridView/ControllerViews/BugsGridView";
import { BugsGridViewSource } from "TestManagement/Scripts/Scenarios/BugsGridView/Sources/BugsGridViewSource";
import { BugsGridViewStore } from "TestManagement/Scripts/Scenarios/BugsGridView/Stores/BugsGridViewStore";

import TCMContracts = require("TFS/TestManagement/Contracts");

export class BugsGridViewOptions {
    container: JQuery;
    result: TCMContracts.TestCaseResult;
}

export class BugsGridViewHelper {
    constructor() {
        const actionsHub = new BugsGridViewActionsHub();
        const source = new BugsGridViewSource();
        this._bugsGridViewStore = new BugsGridViewStore(actionsHub);
        this._bugsGridViewActionsCreator = new BugsGridViewActionsCreator(actionsHub, source);
    }
    public renderBugsGrid(options: BugsGridViewOptions): void {

        let container = document.createElement("div");
        options.container.append(container);
        // Render Grid
        let props: BugsGridView.IBugsGridViewProps = {
            actionsCreator: this._bugsGridViewActionsCreator,
            store: this._bugsGridViewStore,
            testCaseResult: options.result
        };
        BugsGridView.renderGrid(container, props);
    }

    private _bugsGridViewActionsCreator: BugsGridViewActionsCreator;
    private _bugsGridViewStore: BugsGridViewStore;
}