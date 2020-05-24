import * as TestsOM from "TestManagement/Scripts/TFS.TestManagement";

import { RunWithOptionsActionsHub } from "TestManagement/Scripts/Scenarios/RunWithOptions/Actions/RunWithOptionsActionsHub";
import { RunWithOptionsActionsCreator } from "TestManagement/Scripts/Scenarios/RunWithOptions/Actions/RunWithOptionsActionsCreator";
import * as RunWithOptionsDialog from "TestManagement/Scripts/Scenarios/RunWithOptions/ControllerViews/RunWithOptionsDialog";
import { RunWithOptionsSource } from "TestManagement/Scripts/Scenarios/RunWithOptions/Sources/RunWithOptionsSource";
import { RunWithOptionsStore } from "TestManagement/Scripts/Scenarios/RunWithOptions/Stores/RunWithOptionsStore";

export class RunWithOptionsDialogOptions {
    requirementId: number;
    showXTRunner: boolean;
    testPoints: TestsOM.ITestPointModel[];

    //TODO: Need to have proper parameters for the callback
    dtrCallBack: () => void;
    oldmtrCallBack: () => void;
    newmtrCallBack: () => void;
    webRunnerCallBack: () => void;
    xtRunnerCallBack: () => void;
    automatedTestRunnerCallBack: () => void;
}

export class RunWithOptionsHelper {

    constructor() {
        const actionsHub = new RunWithOptionsActionsHub();
        const source = new RunWithOptionsSource();
        this._runWithOptionsStore = new RunWithOptionsStore(actionsHub);
        this._runWithOptionsActionsCreator = new RunWithOptionsActionsCreator(actionsHub, source);
    }

    public openRunWithOptionsDialog(options: RunWithOptionsDialogOptions) {
        let container = document.createElement("div");
        // Render Dialog
        let props: RunWithOptionsDialog.IRunWithOptionsDialogProps = {
            testPoints: options.testPoints,
            actionsCreator: this._runWithOptionsActionsCreator,
            store: this._runWithOptionsStore,
            onClose: () => { RunWithOptionsDialog.unmountDialog(container); }
        };
        RunWithOptionsDialog.renderDialog(container, props);
    }

    private _runWithOptionsActionsCreator: RunWithOptionsActionsCreator;
    private _runWithOptionsStore: RunWithOptionsStore;
}