

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultListVM = require("TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.ResultListViewModel");
import ResultsGrid = require("TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.Grid");
import ResultsViewSummary = require("TestManagement/Scripts/TFS.TestManagement.ResultsView.Summary");
import RunsViewSummary = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Summary");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import { LicenseAndFeatureFlagUtils } from "TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils";
import TestResultsControls = require("TestManagement/Scripts/TestReporting/TestTabExtension/Controls");
import { FilterBarProvider } from "TestManagement/Scripts/TestReporting/TestTabExtension/Filtering/TestResults.FilterBarProvider";
import TestsRelatedRequirementsControl = require("TestManagement/Scripts/TestReporting/TestTabExtension/RelatedRequirementsControl");
import Contracts = require("TFS/TestManagement/Contracts");
import HistogramControl = require("VSS/Controls/Histogram");

import Controls = require("VSS/Controls");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import Grids = require("VSS/Controls/Grids");
import Dialogs = require("VSS/Controls/Dialogs");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
let delegate = Utils_Core.delegate;
let domElem = Utils_UI.domElem;
let TfsContext = TFS_Host_TfsContext.TfsContext;

let TelemetryService = TCMTelemetry.TelemetryService;

export interface IResultsDetailViewOptions {
    container: JQuery;
    target: Common.TargetPage;
    viewModel: ResultListVM.ResultListViewModel;
    toolbar: TestResultsControls.RightToolbar;
}

export interface IShowColumnOptions {
    tfsContext: typeof TFS_Host_TfsContext.TfsContext;
    simpleMode: boolean;
    allowSort: boolean;
    displayColumns: any[];
    allColumns: Grids.IGridColumn[];
    okCallback: Function;
}

interface IDisplayColumns {
    text: string;
    index: number;
    width: number;
}

export class RelatedRequirementsHandler {

    constructor(viewModel: ResultListVM.ResultListViewModel) {
        this._viewModel = viewModel;
    }

    public handleCommand(resultModels: ResultsGrid.IResultViewModel[]) {    
        return Dialogs.show(TestsRelatedRequirementsControl.TestResultsRelatedRequirementsDialog, {
            height: 370,
            width: 570,
            hideCloseButton: true,
            okText: Resources.RequirementDialogOkText,
            resultModels: resultModels,
            close: delegate(this, this._update)
        });
    }

    private _update() {
        this._viewModel.selectedTestCaseResult.valueHasMutated();
    }

    private _viewModel: ResultListVM.ResultListViewModel;
}

export class ColumnOptionsHandler {
 
    //Constructor to initialise target and viewmodel
    constructor(view: ResultListVM.ResultListViewModel, target: Common.TargetPage, resultsGridView: ResultsGrid.ResultsGridView) {
        this._columnTarget = target;
        this._columnViewModel = view;
        this._resultsGridView = resultsGridView;
    }


    public handleColumnCommand(): void {
        this._launchColumnOptionsDialog();
    }

    //Getter method to get displayed columns other than fixed columns(outcome, test are fixed)
    public _getDisplayedColumns(): Grids.IGridColumn[] {
        return this._getDisplayColumns();
    }

    private _launchColumnOptionsDialog(): void {
        /// <summary>Launch the column options dialog</summary>
        this._showColumnOptions({
            tfsContext: TfsContext,
            simpleMode: true,
            allowSort: false,
            displayColumns: this._getDisplayColumns(),
            allColumns: this._getAvailableColumns(),
            okCallback: (result) => {
                this._refresh(result.display);
            }
        });
    }

    private _showColumnOptions(options?: IShowColumnOptions): TestResultsControls.ColumnOptionsDialog {
        return Dialogs.show(TestResultsControls.ColumnOptionsDialog, $.extend(options, {
            width: 560,
            minHeight: 300,
            height: 350,
            simpleMode: true,
            allColumns: options.allColumns,
            cssClass: "test-results-column-options-host simple",
            initialFocusSelector: "select",
            target: this._columnTarget,
            okCallback: options.okCallback,
        }));
    }

    private _getDisplayColumns(): Grids.IGridColumn[] {
        /// <summary>Gets the list of columns that are being displayed on the Grid</summary>
        let allGridColumns: Grids.IGridColumn[] = this._resultsGridView.getColumns();
        let displayColumns: Grids.IGridColumn[] = [];
        for (let index = 0, len = allGridColumns.length; index < len; index++) {
            if (!allGridColumns[index].hidden && !this._isFixedField(allGridColumns[index])) {
                displayColumns.push(this._getColumnsList(allGridColumns[index]));
           }
        }
        return displayColumns;
    }

    private _getColumnsList(col: Grids.IGridColumn): Grids.IGridColumn {
        let newCol: Grids.IGridColumn = {
            text: col.text,
            index: col.index,
            width: col.width
        };
        return newCol;
    }

    private _getAvailableColumns(): Grids.IGridColumn[] {
        let columns: Grids.IGridColumn[];
        columns = Common.AvailableColumns.availableColumns(this._columnTarget);
        return columns;
    }

    private _isFixedField(field: Grids.IGridColumn): boolean {
        let fixedFields = this._getFixedFields(this._columnTarget);

        for (let i = 0, len = fixedFields.length; i < len; i++) {
            if (field.index === fixedFields[i].index) {
                return true;
            }
        }
        return false;
    }

    private _refresh(columns: Grids.IGridColumn[]): void {
        this._savedColumns = columns;
        this._resultsGridView.setNewColumns(this._columnTarget, this._savedColumns);
        this._resultsGridView.fetchResults();
        this._columnViewModel.dataSource.valueHasMutated();
    }

    // This is used to filter out the fixed fields in the left side of column options dialog. So we need to know exactly what column options should not be shown on the left side.
    private _getFixedFields(target: Common.TargetPage): Grids.IGridColumn[] {
        let fields = [
            {
                index: Common.ColumnIndices.Test,
            }];

        return fields;
    }

    //Members
    private _columnTarget: Common.TargetPage;
    private _columnViewModel: ResultListVM.ResultListViewModel;
    private _resultsGridView: ResultsGrid.ResultsGridView;
    private _savedColumns: Grids.IGridColumn[];

}

export class ResultsDetailView {

    constructor(options: IResultsDetailViewOptions) {
        this._bodySection = options.container;
        this._viewModel = options.viewModel;
        this._rightToolbar = options.toolbar;
        this._populate(options.target);
        this._target = options.target;
    }

    public handleCommand(command: string): void {
        switch (command) {
            case Common.TestResultDetailsCommands.ColumnOptions:
                this._columnOptionsHandler = new ColumnOptionsHandler(this._viewModel, this._target, this._resultsGridView);
                this._columnOptionsHandler.handleColumnCommand();
                break;
            case Common.TestResultDetailsCommands.RelatedRequirements:
                this._relatedRequirementsHandler = this.getRelatedRequirementsHandler();
                let resultModels: ResultsGrid.IResultViewModel[] = this.getResultViewModelForSelectedTestMethods();
                this._relatedRequirementsHandler.handleCommand(resultModels);
                break;
            case Common.TestResultDetailsCommands.ToggleFilterBar:
                this._filterBarProvider.toggleFilterBar();
                break;
            default:
                this._resultsGridView.handleCommand(command);
                break;
        }
    }
    
    public handlePivotChanged(option: string, filterType: Common.Filters): void {
        this._resultsGridView.handlePivotChanged(option, filterType);
    }

    public applySettings(view: CommonBase.ViewContext) {
        this._resultsGridView.applySettings(view);
    }

    public getResultViewModelForSelectedTestMethods(): ResultsGrid.IResultViewModel[] {
        let indices: number[] = this._resultsGridView.getSelectedDataIndices();
        let resultModel: ResultsGrid.IResultViewModel[] = [];
        indices.forEach((index) => {
            let rowData: ResultListVM.IGridItem = this._resultsGridView.getRowData(index);

            if (rowData.isTestCaseItem) {
                let resultIdentifier: string = new Common.TestCaseResultIdentifier(rowData.runId, rowData.resultId).toString();
                resultModel.push(this._viewModel.getResultFromCache(resultIdentifier));
            }
        });
        return resultModel;
    }

    public getRelatedRequirementsHandler(): RelatedRequirementsHandler{
        return new RelatedRequirementsHandler(this._viewModel);
    }

    public handleIndexChanged: (selectedItem: ResultListVM.IGridItem) => void;

    private _populate(target: Common.TargetPage): void {
        this._resultsGridView = <ResultsGrid.ResultsGridView>Controls.BaseControl.enhance(ResultsGrid.ResultsGridView, this._bodySection.find(".test-results-grid"), <ResultsGrid.IResultGridViewOptions>{
            target: target,
            viewModel: this._viewModel
        });

        this._resultSummaryViewWrapper = <ResultSummaryViewWrapper>Controls.BaseControl.enhance<IResultSummaryViewWrapperOptions>(ResultSummaryViewWrapper, this._bodySection.find(".test-result-details-section"), {
            viewModel: this._viewModel, gridView: this._resultsGridView
        });

         this._runSummaryViewWrapper = <RunSummaryViewWrapper>Controls.BaseControl.enhance<IRunSummaryViewWrapperOptions>(RunSummaryViewWrapper, this._bodySection.find(".test-result-details-section"), {
            gridView: this._resultsGridView
        });

         this._resultsGridView.handleIndexChanged = delegate(this, this._handleIndexChanged);
         if (LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled()) {
             this._filterBarProvider = new FilterBarProvider(this._bodySection, this._resultsGridView, this._viewModel, this._rightToolbar);
         }
    }

    private _handleIndexChanged(selectedItem: ResultListVM.IGridItem): void {
        this.handleIndexChanged(selectedItem);
    }

    private _bodySection: JQuery;
    private _columnOptionsHandler: ColumnOptionsHandler;
    private _target: Common.TargetPage;
    private _availableColumns: Common.AvailableColumns;
    private _viewModel: ResultListVM.ResultListViewModel;
    private _resultsGridView: ResultsGrid.ResultsGridView;
    private _resultSummaryViewWrapper: ResultSummaryViewWrapper;
    private _runSummaryViewWrapper: RunSummaryViewWrapper;
    private _relatedRequirementsHandler: RelatedRequirementsHandler;
    private _filterBarProvider: FilterBarProvider;
    private _rightToolbar: TestResultsControls.RightToolbar;
}

///--------------------- Run Summary section -------------------------------///
export interface IRunSummaryViewWrapperOptions {
    gridView: ResultsGrid.ResultsGridView;
}

export class RunSummaryViewWrapper extends Controls.Control<IRunSummaryViewWrapperOptions> {

     public initializeOptions(options: IRunSummaryViewWrapperOptions) {
        super.initializeOptions(options);
        this._gridView = options.gridView;
    }

    public initialize() {
        super.initialize();
        this._createView();
        this._disposalManager.addDisposable(this._gridView.selectedRun.subscribe((runId: number) => {
            this._updateView(runId, this._gridView.histogram);          
        }));

    }

    public dispose() {
        this._disposalManager.dispose();
        super.dispose();
    }

    private _createView(): void {
        this._testRunTitle = $("<a/>");
        this.getElement().find(".test-result-details-test-title").append(this._testRunTitle);
        this.runSummaryView = <RunsViewSummary.TestRunSummaryTextView>Controls.BaseControl.createIn(RunsViewSummary.TestRunSummaryTextView, this.getElement().find(".test-result-details"), {
            showTitle: false,
            showToolbar: false,
            showSummary: false,
            showAnalysis: false,
            showShortcut: false,
        });
    }

    private _updateView(newRunId: number, histogram: HistogramControl.Histogram): void {
        this.runSummaryView.unloadSummaryTextView();

        if (!newRunId) { return; }
        
        this.runSummaryView.initializeOptions({runId: newRunId, 
            tfsContext: TfsContext.getDefault(), 
            updateLeftPaneAndTitle: (runTitle: string) => {
                this._updateTitle(runTitle);
        }});

        let showRunProperties = false;
        this.runSummaryView.initialize(showRunProperties);
        this.runSummaryView.loadSummaryTextView(histogram);
    }
    
    private _updateTitle(runTitle: string)
    {
        let runId = this.runSummaryView.getModel().getTestRunId();
        let url = TMUtils.UrlHelper.getRunsUrl("runCharts", [
            {
                parameter: "runId",
                value: runId.toString()
            }]);

        this._testRunTitle.text(runTitle)
            .attr("title", runTitle)
            .attr("href", url)
            .attr("target", "_blank")
            .attr("rel", "nofollow noopener noreferrer")
            .on("click", () => {
            TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_TestRunTitleClick, TelemetryService.eventClicked, 1);
        });

        this.getElement().find(".test-result-details-test-title").empty().append(this._testRunTitle);
        let statusSection = this.getElement().find(".test-result-failed-on").empty();
        this.runSummaryView.addRunState(statusSection);
    }

    private _testRunTitle: JQuery;
    public runSummaryView: RunsViewSummary.TestRunSummaryTextView;
    private _gridView: ResultsGrid.ResultsGridView;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
}


///--------------------- Result Summary section ----------------------------///

export interface IResultSummaryViewWrapperOptions {
    viewModel: ResultListVM.ResultListViewModel;
    gridView: ResultsGrid.ResultsGridView;
}

export class ResultSummaryViewWrapper extends Controls.Control<IResultSummaryViewWrapperOptions> {

    public initializeOptions(options: IResultSummaryViewWrapperOptions) {
        super.initializeOptions(options);
        this._resultListViewModel = options.viewModel;
        this._gridView = options.gridView;
    }

    public initialize() {
        super.initialize();
        this._createView();
        this._disposalManager.addDisposable(this._resultListViewModel.selectedTestCaseResult.subscribe((testCaseResult: Contracts.TestCaseResult) => {
            let viewContext: CommonBase.ViewContext = this._resultListViewModel.getViewContext();
            this._updateResult(testCaseResult, viewContext, this._gridView.histogram);
        }));
    }

    public dispose() {
        this._disposalManager.dispose();
        super.dispose();
    }

    private _createView(): void {
        this._testCaseTitle = $("<a />");
        this.getElement().find(".test-result-details-test-title").append(this._testCaseTitle);
        this._resultSummaryView = <ResultsViewSummary.TestResultSummaryView>Controls.BaseControl.createIn(ResultsViewSummary.TestResultSummaryView, this.getElement().find(".test-result-details"), {
            showTitle: false,
            showToolbar: false,
            showSummary: false,
            showAnalysis: false,
            showShortcut: false
        });
    }

    private _updateResult(testCaseResult: Contracts.TestCaseResult, viewContext: CommonBase.ViewContext, histogram: HistogramControl.Histogram): void {
        let headerSection: JQuery;
        headerSection = this.getElement().find(".test-result-details-header-section");

        if (!testCaseResult) {
            this._resultSummaryView.unloadResult(headerSection);
            return;
        }
        
        this._resultSummaryView.updateResult(testCaseResult, viewContext, histogram);

        let url = TMUtils.UrlHelper.getRunsUrl("resultSummary", [
            {
                parameter: "runId",
                value: testCaseResult.testRun.id.toString()
            },
            {
                parameter: "resultId",
                value: testCaseResult.id.toString()
            }]);
        this._testCaseTitle.text(testCaseResult.testCase.name)
            .attr("href", url)
            .attr("target", "_blank")
            .attr("rel", "nofollow noopener noreferrer")
            .on("click", () => {
            TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_TestResultTitleClick, TelemetryService.eventClicked, 1);
        });
        RichContentTooltip.add(testCaseResult.automatedTestName, this._testCaseTitle, { setAriaDescribedBy: true });

        this.getElement().find(".test-result-details-test-title").empty().append(this._testCaseTitle);
        this._resultSummaryView.updateHeaderSectionForBuild(headerSection);
    }

    public _testCaseTitle: JQuery;
    private _resultListViewModel: ResultListVM.ResultListViewModel;
    private _gridView: ResultsGrid.ResultsGridView;
    private _resultSummaryView: ResultsViewSummary.TestResultSummaryView;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
}

///---------------------End of Result Summary section ----------------------------///

//// TFS Plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestTabExtension/TestResults.ResultDetails", exports);

