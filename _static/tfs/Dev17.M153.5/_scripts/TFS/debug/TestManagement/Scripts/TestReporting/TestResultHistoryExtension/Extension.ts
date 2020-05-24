import Controls = require("VSS/Controls");
import SDK = require("VSS/SDK/Shim");
import ResultHistory = require("TestManagement/Scripts/TestReporting/TestResultHistory/View");
import Navigation_Services = require("VSS/Navigation/Services");

export interface ITestResultHistoryExtension {
}

export class TestResultHistoryExtension extends Controls.Control<ITestResultHistoryExtension>{

    public initialize(): void {
        this.triageView = <ResultHistory.TestResultHistoryView>Controls.BaseControl.createIn(ResultHistory.TestResultHistoryView, this._element);
        this._draw();
    }

    private _draw(): void {
        //Getting the state of the URL
        let state = Navigation_Services.getHistoryService().getCurrentState();
        if (state.runId && state.resultId) {
            //set state of the view
            this.triageView.updateGroupBy(state.runId, state.resultId, state.selectedGroupBy);
        }
    }
    private triageView: ResultHistory.TestResultHistoryView;
}

// Registering "TestResultHistoryExtension" class with Extension host
SDK.registerContent("TestResultHistory.extension.initialize", (context: SDK.InternalContentContextData) => {
    return Controls.create<TestResultHistoryExtension, ITestResultHistoryExtension>(TestResultHistoryExtension, context.$container, {});
});