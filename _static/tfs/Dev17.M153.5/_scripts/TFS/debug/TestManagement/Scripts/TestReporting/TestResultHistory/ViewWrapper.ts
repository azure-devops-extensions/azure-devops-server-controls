import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import ExplorerView = require("TestManagement/Scripts/TFS.TestManagement.RunsView.RunExplorer.View");
import ResultHistory = require("TestManagement/Scripts/TestReporting/TestResultHistory/View");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let TfsContext = TFS_Host_TfsContext.TfsContext;

export class ResultHistoryViewWrapper implements ExplorerView.IViewWrapper {


    public constructor() {
        this.name = ValueMap.RunExplorerViewTabs.ResultHistory;
    }

    public initializeView(explorerView: ExplorerView.RunExplorerView, $parentContainer: JQuery, previousView: ExplorerView.IViewWrapper): void {
        Diag.logTracePoint("[ResultHistoryViewWrapper.initializeView]: method called");
        // Set/Create div container
        this.setContainer($parentContainer);
        // Instantiate view object
        this.triageView = <ResultHistory.TestResultHistoryView>Controls.BaseControl.createIn(ResultHistory.TestResultHistoryView, this.$container);
    }

    public setState(explorerView: ExplorerView.RunExplorerView): void {
        Diag.logTracePoint("[ResultHistoryViewWrapper.setState]: method called");
        this.triageView.updateResult(explorerView.getCurrentRunId(), explorerView.getCurrentResultId()).then((testCaseTitle: string) => {
            explorerView.bindResultSummaryInfoBar(this.triageView, testCaseTitle);
        }, (error) => {
            this.triageView.showErrorStrip(error.message);
        });
    }

    public getEnabledState(): boolean {
        Diag.logTracePoint("[ResultHistoryViewWrapper.getEnabledState]: method called");
        return this.isEnabled;
    }

    public setStateEnabled(isEnabled: boolean): void {
        this.isEnabled = isEnabled;
    }

    public show() {
        if (this.$container) {
            this.$container.show();
        }
    }

    public hide() {
        if (this.$container) {
            this.$container.hide();
        }
    }

    private setContainer($parentContainer: JQuery): JQuery {
        Diag.logTracePoint("[ResultHistoryViewWrapper.setContainer]: method called");

        if (!this.$container) {
            this.$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this.$container.empty();
        return this.$container;
    }

    public name: string;

    protected $container: JQuery;
    protected triageView: ResultHistory.TestResultHistoryView;

    private isEnabled: boolean;
}

VSS.initClassPrototype(ResultHistoryViewWrapper, {
    isEnabled: false,
    name: ValueMap.RunExplorerViewTabs.ResultHistory,
    triageView: null
});

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestResultHistory.ViewWrapper", exports);
