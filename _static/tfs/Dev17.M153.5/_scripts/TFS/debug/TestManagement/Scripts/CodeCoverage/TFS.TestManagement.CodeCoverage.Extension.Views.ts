
import ko = require("knockout");

import * as React from "react";
import * as ReactDOM from "react-dom";

import BuildCodeCoverage = require("TestManagement/Scripts/CodeCoverage/TFS.TestManagement.CodeCoverage.BuildCodeCoverage");
import SummaryCharts = require("TestManagement/Scripts/CodeCoverage/TFS.TestManagement.CodeCoverage.SummaryCharts");
import CommonModel = require("TestManagement/Scripts/CodeCoverage/TFS.TestManagement.CodeCoverage.CommonCodeCoverageViewModel");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TCMMessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
import ViewModel = require("TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel");

export interface ICodeCoverageViewOptions {
    viewModel: CodeCoverageViewModel;
}

export class CodeCoverageView extends Controls.Control<ICodeCoverageViewOptions> {

    public initialize() {
        super.initialize();
        this._createLayout();
    }

    public initializeOptions(options: ICodeCoverageViewOptions) {
        super.initializeOptions(options);
        this._codeCoverageViewModel = options.viewModel;
    }

    private _createLayout(): void {

        Diag.logInfo("[CodeCoverageView._createLayout]: entered _createLayout");

        let layout: JQuery;
        layout = $(
            `    <div class='code-coverage-layout' >
                    <div class='message-area-part' />
                    <div class='code-coverage-build-part' />
                 </div>`);

        this._populateSections(layout);
        this._element.append(layout);

        ko.applyBindings(this._codeCoverageViewModel.getCommonCodeCoverageViewModel(), this._element[0]);
    }

    private _populateSections(layout: JQuery) {

        let messageAreaViewModel = this._codeCoverageViewModel.getMessageAreaViewModel();
        this._messageArea = <TCMMessageArea.MessageAreaView>Controls.BaseControl.enhance(TCMMessageArea.MessageAreaView, layout.find(".message-area-part"), {
            viewModel: messageAreaViewModel,
            closeable: false
        });

        messageAreaViewModel.logInfoJQuery($("<span>" + Resources.BuildDetailsSummaryNoCodeCoverageNoLink + "</span>"));

        const container = layout.find(".code-coverage-build-part").get(0);

        //Unmount any component inside container.
        ReactDOM.unmountComponentAtNode(container);

        //Render report component inside container with initially default props/state with store.
        ReactDOM.render(React.createElement(BuildCodeCoverage.BuildCodeCoverageView, {
            viewModel: this._codeCoverageViewModel.getCommonCodeCoverageViewModel()
        }), container);
    }

    private _messageArea: TCMMessageArea.MessageAreaView;

    private _codeCoverageViewModel: CodeCoverageViewModel;
}

export class CodeCoverageViewModel extends Adapters_Knockout.TemplateViewModel {

    constructor(viewModel: ViewModel.ResultsViewModel) {
        Diag.logInfo("[CodeCoverageViewModel._constructor]: creating view models");
        super();
        this._messageAreaViewModel = new TCMMessageArea.MessageAreaViewModel();
        this._commonCodeCoverageViewModel = new CommonModel.CommonCodeCoverageViewModel(this._messageAreaViewModel, viewModel);
    }

    public getMessageAreaViewModel(): TCMMessageArea.MessageAreaViewModel {
        return this._messageAreaViewModel;
    }

    public getCommonCodeCoverageViewModel(): CommonModel.CommonCodeCoverageViewModel {
        return this._commonCodeCoverageViewModel;
    }

    private _messageAreaViewModel: TCMMessageArea.MessageAreaViewModel;
    private _commonCodeCoverageViewModel: CommonModel.CommonCodeCoverageViewModel;
}

export class CodeCoverageSummaryView extends Controls.Control<CodeCoverageSummaryViewModel> {

    public initialize() {
        super.initialize();
        this._createLayout();
    }

    public initializeOptions(options: CodeCoverageSummaryViewModel) {
        super.initializeOptions(options);
        this._codeCoverageSummaryViewModel = options;
    }

    private _createLayout(): void {

        Diag.logInfo("[CodeCoverageSummaryView._createLayout]: entered _createLayout");

        let layout: JQuery;
        layout = $(
            `    <div class='code-coverage-summary-layout' >
                    <!-- ko if: showUnavailabiltyMessage -->
                       <span data-bind="html: coverageDataUnavailableMessage" />
                    <!-- /ko -->
                    <div class='message-area-part' />
                    <div class='code-coverage-summary-charts-section' />             
                 </div>`);

        this._populateSections(layout);
        this._element.append(layout);

        ko.applyBindings(this._codeCoverageSummaryViewModel.getCodeCoverageSummaryChartViewModel(), this._element[0]);
    }

    private _populateSections(layout: JQuery) {

        let messageAreaViewModel = this._codeCoverageSummaryViewModel.getMessageAreaViewModel();
        this._messageArea = <TCMMessageArea.MessageAreaView>Controls.BaseControl.enhance(TCMMessageArea.MessageAreaView, layout.find(".message-area-part"), {
            viewModel: messageAreaViewModel,
            closeable: false
        });

        let summaryChartsViewModel = this._codeCoverageSummaryViewModel.getCodeCoverageSummaryChartViewModel();
        this._codeCoverageSummaryChartsView = <SummaryCharts.CodeCoverageSummaryCharts>Controls.BaseControl.createIn(
            SummaryCharts.CodeCoverageSummaryCharts, layout.find(".code-coverage-summary-charts-section"),
            summaryChartsViewModel);
    }

    private _messageArea: TCMMessageArea.MessageAreaView;
    private _codeCoverageSummaryChartsView: SummaryCharts.CodeCoverageSummaryCharts;

    private _codeCoverageSummaryViewModel: CodeCoverageSummaryViewModel;
}

export class CodeCoverageSummaryViewModel extends Adapters_Knockout.TemplateViewModel {

    constructor(viewModel: ViewModel.ResultsViewModel) {
        Diag.logInfo("[CodeCoverageSummaryViewModel._constructor]: creating view models");
        super();
        this._messageAreaViewModel = new TCMMessageArea.MessageAreaViewModel();
        this._codeCoverageSummaryChartViewModel = new SummaryCharts.CodeCoverageSummaryChartViewModel(this._messageAreaViewModel, viewModel );
    }

    public getMessageAreaViewModel(): TCMMessageArea.MessageAreaViewModel {
        return this._messageAreaViewModel;
    }

    public getCodeCoverageSummaryChartViewModel(): SummaryCharts.CodeCoverageSummaryChartViewModel {
        return this._codeCoverageSummaryChartViewModel;
    }

    private _messageAreaViewModel: TCMMessageArea.MessageAreaViewModel;
    private _codeCoverageSummaryChartViewModel: SummaryCharts.CodeCoverageSummaryChartViewModel;
}

VSS.tfsModuleLoaded("TFS.TestManagement.CodeCoverage.Extension.Views", exports);