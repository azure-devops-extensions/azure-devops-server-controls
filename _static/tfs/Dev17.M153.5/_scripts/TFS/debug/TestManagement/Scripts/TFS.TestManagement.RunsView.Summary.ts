/// <reference types="jquery" />


import q = require("q");
import TCMConstants = require("Presentation/Scripts/TFS/Generated/TFS.TestManagement.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import TCMControlsCharts = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Controls.Charts");
import TcmService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import TestManagementResources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TestsOM = require("TestManagement/Scripts/TFS.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TRACommonControls = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Common.Controls");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");
import RunsControlsQueries = require("TestManagement/Scripts/TFS.TestManagement.RunsView.Controls.Queries");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import PreviewAttachmentHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.PreviewAttachmentHelper");
import AttachmentsGridViewHelper_LAZY_LOAD = require("TestManagement/Scripts/TFS.TestManagement.AttachmentsGridViewHelper");

import * as Common from "TestManagement/Scripts/TestReporting/Common/Common";
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import TestTabExtensionCommon = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import ChartsBase = require("TestManagement/Scripts/TestReporting/Charts/ChartBase");
import Dialogs = require("VSS/Controls/Dialogs");
import DetailedTrendDialog = require("TestManagement/Scripts/TestReporting/TestTabExtension/DetailedTrendDialog");
import BuildContracts = require("TFS/Build/Contracts");
import ReleaseDataHelper = require("TestManagement/Scripts/Utils/TFS.TestManagement.ReleaseDataHelper");
import RMContracts = require("ReleaseManagement/Core/Contracts");
import { RichContentTooltip } from "VSS/Controls/PopupContent";

import TCMContracts = require("TFS/TestManagement/Contracts");

import Controls = require("VSS/Controls");
import HistogramControl = require("VSS/Controls/Histogram");
import { MarkdownRenderer } from "ContentRendering/Markdown";
import { MarkdownRendererOptions } from "ContentRendering/MarkdownItPlugins";
import Menus = require("VSS/Controls/Menus");
import Performance = require("VSS/Performance");
import Splitter = require("VSS/Controls/Splitter");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");

let TfsContext = TFS_Host_TfsContext.TfsContext;
let TelemetryService = TCMTelemetry.TelemetryService;
let TelemetryHelper = TCMTelemetry.TelemetryHelper;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

// Summary: Implements Test Run Summary view
export class TestRunSummaryView extends Controls.BaseControl {

    private readonly hubPivotContentClass = ".hub-pivot-content";
    private readonly rightHubContentClass = ".right-hub-content";

    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _splitter: Splitter.Splitter;
    private _runSummaryToolBar: TestRunSummaryToolBar;
    private _summaryTextSection: TestRunSummaryTextView;
    private _chartSection: TCMControlsCharts.TestRunSummaryChartsView;
    private _query: any;

    constructor(options?) {
        super(<any>$.extend({
            cssClass: "test-run-summary-view",
            showTitle: true
        }, options));
    }

    public initialize() {
        super.initialize();
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this.populateControls();
        new RunsControlsQueries.TestRunSummaryShortcutGroup(this);
    }

    // Adding controls and layout to TestRun Summary view
    private populateControls() {
        Diag.logTracePoint("[TestSummaryView.populateControls]: method called.");

        // Add the refresh control
        this._runSummaryToolBar = <TestRunSummaryToolBar>Controls.BaseControl.createIn(TestRunSummaryToolBar,
            this._element,
            { cssClass: "test-run-summary-toolbar" });
        Diag.logVerbose("[TestSummaryView.populateControls] - Added TestRunSummaryToolBar controls");

        // Set Overflow Property Visible so that zoom in page donot hide RunSummaryToolbar
        this.setOverflow();

        // Add splitter control
        this._splitter = <Splitter.Splitter><any>Controls.BaseControl.createIn(Splitter.Splitter,
            this._element,
            { cssClass: "content", fixedSide: "left" });
        Diag.logVerbose("[TestSummaryView.populateControls] - Added Splitter controls");

        this._splitter.horizontal();
        this._splitter.resize("50%");

        // Add Summary control to left of splitter
        this._summaryTextSection = <TestRunSummaryTextView>Controls.BaseControl.createIn(TestRunSummaryTextView,
            this._splitter.leftPane,
            { runId: this._options.runId, tfsContext: this._tfsContext, updateLeftPaneAndTitle: this._options.updateLeftPaneAndTitleFunc });
        this._summaryTextSection.loadSummaryTextView(null);
        Diag.logVerbose("[TestRunSummaryView.populateControls] - Added TestRunSummaryText view");

        // Add Chart control to right of splitter
        this._chartSection = <TCMControlsCharts.TestRunSummaryChartsView>Controls.BaseControl.createIn(TCMControlsCharts.TestRunSummaryChartsView,
            this._splitter.rightPane,
            {
                tfsContext: this._tfsContext,
                runId: this._options.runId,
                toolBar: this._runSummaryToolBar
            });
        Diag.logVerbose("[TestRunSummaryView.populateControls] - Added TestRunSummaryCharts view");

        this._runSummaryToolBar.bind(this._summaryTextSection, this._chartSection);
        Diag.logVerbose("[TestSummaryView.populateControls] - Added TestRunSummaryToolBar controls");
    }

    public IsControlPopulationDone(): boolean {
        return ((this._runSummaryToolBar != null) &&
            (this._splitter != null) &&
            (this._summaryTextSection != null) &&
            (this._chartSection != null));
    }

    public getStatusText(): string {
        Diag.logTracePoint("[TestSummaryView.getStatusText]: method called.");
        return Utils_String.empty;
    }

    public setQuery(query: any) {
        Diag.logTracePoint("[TestSummaryView.setQuery]: method called.");
        this._query = query;
        this._fire("statusUpdate", ["", false]);
    }

    public getQueryTitle() {
        Diag.logTracePoint("[TestSummaryView.getQueryTitle]: method called.");
        return this._query ? this._query.name : "";
    }

    private setOverflow() {
        const $hubPivotContentElement = this._element.closest(this.hubPivotContentClass);
        $hubPivotContentElement.css("overflow", "visible");

        const $rightHubContentElement = this._element.closest(this.rightHubContentClass);
        $rightHubContentElement.css("overflow", "visible");
    }
}

VSS.initClassPrototype(TestRunSummaryView, {
    _tfsContext: null,
    _splitter: null,
    _grid: null
});

// Summary: Implements the toolbar in Test Run Summary view
class TestRunSummaryToolBar extends Controls.BaseControl {
    private _menuBar: Menus.MenuBar;
    private _updateDelegate: any;
    private _runSummaryTextView: TestRunSummaryTextView;
    private _runSummaryChartView: TCMControlsCharts.TestRunSummaryChartsView;
    public static _refreshCommand: string = "refresh-run-summary";
    public static _updateComment: string = "update-run-comment";
    public static _addAttachment: string = "add-run-attachment";

    constructor(options?) {
        super(options);
    }

    public initializeOptions(options?: any) {
        /// <param name="options" type="any" />
        super.initializeOptions($.extend({
            coreCssClass: "toolbar test-run-summary-toolbar"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._menuBar = this._createMenuBar(this._element);
    }

    public bind(runSummaryTextView: any, runSummaryChartView: any) {
        this._runSummaryTextView = runSummaryTextView;
        this._runSummaryChartView = runSummaryChartView;
    }

    private _createMenuBar($containerElement: JQuery): Menus.MenuBar {
        let menuBar: Menus.MenuBar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $containerElement, {
            items: this._createMenubarItems(),
            executeAction: Utils_Core.delegate(this, this._onMenubarItemClick)
        });
        return menuBar;
    }

    private _createMenubarItems(): Menus.IMenuItemSpec[] {
        let items = [];

        items.push({ id: TestRunSummaryToolBar._refreshCommand, title: TestManagementResources.Refresh, showText: false, icon: "bowtie-icon bowtie-navigate-refresh" });

        if (LicenseAndFeatureFlagUtils.isUpdateRunCommentEnabled()) {
            items.push({ separator: true });
            items.push({ id: TestRunSummaryToolBar._updateComment, text: TestManagementResources.UpdateCommentMenuItem, showText: true, icon: "bowtie-icon bowtie-edit" });
        }

        if (LicenseAndFeatureFlagUtils.isAddAttachmentToRunsOrResultsEnabled()) {
            items.push({ separator: true });
            items.push({ id: TestRunSummaryToolBar._addAttachment, text: TestManagementResources.AddAttachmentText, showText: true, icon: "bowtie-icon bowtie-attach" });
        }

        return items;
    }

    private _onMenubarItemClick(e?: any) {
        let command = e.get_commandName();
        this._handleMenubarItemClick(command);
    }

    public _handleMenubarItemClick(command: string) {
        switch (command) {
            case TestRunSummaryToolBar._refreshCommand:
                this._refresh();
                break;
            case TestRunSummaryToolBar._updateComment:
                this._onUpdateCommentClicked();
                break;
            case TestRunSummaryToolBar._addAttachment:
                this._onAddAttachmentClicked();
                break;
        }
    }

    private _refresh() {
        if (this._runSummaryTextView) {
            this._runSummaryTextView.refresh();
        }
        if (this._runSummaryChartView) {
            this._runSummaryChartView.refresh();
        }
    }

    private _onUpdateCommentClicked(): void {
        TRACommonControls.RunExplorerDialogs.updateRunComment(this._getTestRun(), {
            onOkClick: () => {
                this._runSummaryTextView.refresh();
            }
        });
    }

    private _onAddAttachmentClicked(): void {
        TRACommonControls.RunExplorerDialogs.openAddRunAttachmentDialog(this._getTestRun(), () => {
            this._runSummaryTextView.refresh();
        });
    }

    private _getTestRun() {
        return this._runSummaryTextView.getModel().getTestRun();
    }
}

// Summary: Implements the Test Run Summary Text view
export class TestRunSummaryTextView extends Controls.BaseControl {

    private _$loadControl: JQuery;
    private _$summaryTextView: JQuery;
    private _$summaryTextViewContainer: JQuery;
    private _model: TestRunSummaryTextViewModel;
    private _histogram: HistogramControl.Histogram;
    private _resultToHistogramDataMap: IDictionaryStringTo<HistogramControl.HistogramBarData[]> = {};
    private _workflowTrendDataCache: IDictionaryStringTo<TCMContracts.AggregatedDataForResultTrend[]> = {};
    private _markdownRenderer: MarkdownRenderer = null;
    private static testManagementMarkdownClass: string = "testmanagement-rendered-markdown";
    private _chartConfigOptions: ChartsBase.ChartConfigurationOptions;
    private _releaseDataHelper: ReleaseDataHelper.ReleaseDataHelper;
    private _previewAttachmentHelper: PreviewAttachmentHelper_LAZY_LOAD.PreviewAttachmentHelper;
    private _attachmentsGridViewHelper: AttachmentsGridViewHelper_LAZY_LOAD.AttachmentsGridViewHelper;

    constructor(options?) {
        super(options);
        this._releaseDataHelper = new ReleaseDataHelper.ReleaseDataHelper();
    }

    // Public methods

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "test-run-summary-text"
        }, options));
    }

    public initialize(showRunProperties: boolean = true) {
        this._model = new TestRunSummaryTextViewModel(this._options.runId, this._options.tfsContext);
        this._$summaryTextViewContainer = this.getElement();
        this._options.showSummary = showRunProperties;
        this._markdownRenderer = new MarkdownRenderer(this._getDefaultMarkdownOptions());
    }

    public getModel(): TestRunSummaryTextViewModel {
        return this._model;
    }

    public loadSummaryTextView(histogram: HistogramControl.Histogram) {
        Diag.logTracePoint("[TestRunSummaryTextView.loadSummuryTextView]: method called");

        if (!this._histogram && histogram) {
            this._histogram = histogram;
        }

        if (this._histogram) {
            this._histogram._unbind("click keypress");
            this._bindClickEventForHistogram();
        }

        this._$summaryTextView = $("<div class='test-run-summary-text-view-container' />");
        this._$summaryTextViewContainer.append(this._$summaryTextView);

        if (this._options.showSummary) {
            // Summary title
            let $summaryTitle = $("<h2 class='test-section-header' />");
            $summaryTitle.text(TestManagementResources.TestRunSummaryTextViewLabel);
            this._$summaryTextView.append($summaryTitle);
        }

        this._model.beginInitialize(Utils_Core.delegate(this, this._createLayout), Utils_Core.delegate(this, this._errorHandler));
        this._showLoadingMessage();
    }

    public unloadSummaryTextView() {
        Diag.logTracePoint("[TestRunSummaryTextView.unloadSummaryTextView]: method called");
        if (this._$summaryTextView) {
            this._$summaryTextView.remove();
        }
    }

    public refresh() {
        Diag.logTracePoint("[TestRunSummaryTextView.refresh]: method called");
        this.unloadSummaryTextView();
        this.loadSummaryTextView(this._histogram);
    }

    private _bindClickEventForHistogram(): void {
        this._histogram._bind(this._histogram.getElement(), "click keypress", (e: JQueryEventObject) => {
            if (e && (e.which === TestTabExtensionCommon.Constants.EnterKeyCode || e.type === "click")) {
                let chartView: string = ChartsBase.ChartViews.FailureTrend;
                let chartConfigOptions = this._getChartConfigOptions();
                chartConfigOptions.width = 500;
                chartConfigOptions.height = 500;

                // Add margins for the dialog size.
                let dialog = Dialogs.Dialog.create(DetailedTrendDialog.DetailedChartsDialog, {
                    chartConfig: chartConfigOptions,
                    chartData: this._getTrendData().reverse(),
                    view: chartView,
                    title: chartConfigOptions.title,
                    width: chartConfigOptions.width + 40,
                    height: chartConfigOptions.height + 40
                });

                dialog.show();
            }
        });
    }

    private _populateHistogram($container: JQuery): void {

        let histogramOptions: HistogramControl.IHistogramOptions = {
            renderDefaultBars: true,
            barCount: 10,
            barHeight: 37,
            allowInteraction: true
        };

        if (!this._histogram) {
            this._histogram = <HistogramControl.Histogram>Controls.BaseControl.createIn(HistogramControl.Histogram, $container,
                $.extend({
                    cssClass: "test-results-histogram definition-histogram"
                }, histogramOptions));
            this._bindClickEventForHistogram();
        }

        if (this._model.getTestRunBuildDefinitionIds() && this._model.getTestRunTitle()) {
            this._updateHistogram(this._model.getTestRunTitle());
        }
    }

    private _getChartConfigOptions(): ChartsBase.ChartConfigurationOptions {
        this._chartConfigOptions = <ChartsBase.ChartConfigurationOptions>{};
        this._chartConfigOptions.chartType = ChartsBase.ChartTypes.ColumnLineCombo;
        let testRunTitle = this._model.getTestRunTitle();

        if (testRunTitle) {
            this._chartConfigOptions.testRunTitle = testRunTitle;
            this._chartConfigOptions.title = Utils_String.format("{0}: {1}", TestManagementResources.TestFailuresTrendHeader, testRunTitle);
        }

        if (this._model.getReleaseName()) {
            let releaseDef = { id: this._model.getReleaseDefinitionId(), name: this._model.getReleaseDefinitionName() } as RMContracts.ReleaseDefinition;
            this._chartConfigOptions.releaseDefinition = releaseDef;
            this._chartConfigOptions.context = TCMContracts.TestResultsContextType.Release;
        }
        else {
            this._chartConfigOptions.buildDefinition = this._model.getTestRunBuildDefinition();
            this._chartConfigOptions.context = TCMContracts.TestResultsContextType.Build;
        }

        this._chartConfigOptions.yAxisOptions = {
            seriesType: ChartsBase.SeriesTypes.FailedTests
        };
        this._chartConfigOptions.secondaryYAxisOptions = {
            seriesType: ChartsBase.SeriesTypes.PassPercentage
        };

        return this._chartConfigOptions;
    }

    private _getTrendData(): TCMContracts.AggregatedDataForResultTrend[] {
        let testResultIdentifierString: string;
        if (this._model.getReleaseName()) {
            testResultIdentifierString = this._model.getTestRunTitle() + this._model.getReleaseDefinitionId() + this._model.getReleaseEnvironmentName();
            if (this._workflowTrendDataCache[testResultIdentifierString]) {
                return this._workflowTrendDataCache[testResultIdentifierString];
            }
        }
        else {
            testResultIdentifierString = this._model.getTestRunTitle() + this._model.getTestRunBuildDefinitionIds() + this._model.getTestRunBuildNumber();
            if (this._workflowTrendDataCache[testResultIdentifierString]) {
                return this._workflowTrendDataCache[testResultIdentifierString];
            }
        }

        return new Array();
    }

    private _updateHistogram(testRunTitle: string): void {

        if (!this._histogram) { return; }
        let testResultIdentifierString: string;
        let filter: TCMContracts.TestResultTrendFilter = <TCMContracts.TestResultTrendFilter>{
            branchNames: null,
            testRunTitles: [testRunTitle],
            buildCount: Common.Constants.BuildTrendCount
        };

        if (this._model.getReleaseName()) {
            testResultIdentifierString = testRunTitle + this._model.getReleaseDefinitionId() + this._model.getReleaseEnvironmentName();
            if (this._resultToHistogramDataMap[testResultIdentifierString]) {
                this._histogram.refresh(this._resultToHistogramDataMap[testResultIdentifierString]);
            }
            else {
                filter.definitionIds = [this._model.getReleaseDefinitionId()];
                TcmService.ServiceManager.instance().testResultsService().getReleaseResultsTrend(filter).then((resultQuery: TCMContracts.AggregatedDataForResultTrend[]) => {
                    this._workflowTrendDataCache[testResultIdentifierString] = resultQuery;
                    this._resultToHistogramDataMap[testResultIdentifierString] = this._getHistogramDataFromResultTrend(resultQuery);
                    this._histogram.refresh(this._resultToHistogramDataMap[testResultIdentifierString]);
                }).then(undefined, (error) => {
                    Diag.logError(Utils_String.format("[TestRunSummaryView._updateHistogram]: Error fetching histogram trend report for test run (testRunTitle: {0}). Error: {1}", testRunTitle, error.mesage));
                });
            }
        }
        else {
            testResultIdentifierString = testRunTitle + this._model.getTestRunBuildDefinitionIds() + this._model.getTestRunBuildNumber();
            if (this._resultToHistogramDataMap[testResultIdentifierString]) {
                this._histogram.refresh(this._resultToHistogramDataMap[testResultIdentifierString]);
            }
            else {
                filter.definitionIds = [this._model.getTestRunBuildDefinitionIds()];
                TcmService.ServiceManager.instance().testResultsService().getBuildResultsTrend(filter).then((resultQuery: TCMContracts.AggregatedDataForResultTrend[]) => {
                    this._workflowTrendDataCache[testResultIdentifierString] = resultQuery;
                    this._resultToHistogramDataMap[testResultIdentifierString] = this._getHistogramDataFromResultTrend(resultQuery);
                    this._histogram.refresh(this._resultToHistogramDataMap[testResultIdentifierString]);
                }).then(undefined, (error) => {
                    Diag.logError(Utils_String.format("[TestRunSummaryView._updateHistogram]: Error fetching histogram trend report for test run (testRunTitle: {0}). Error: {1}", testRunTitle, error.mesage));
                });
            }
        }
    }

    private _getHistogramDataFromResultTrend(resultTrend: TCMContracts.AggregatedDataForResultTrend[]): HistogramControl.HistogramBarData[] {
        let histogramData: HistogramControl.HistogramBarData[] = [];
        let trendData: HistogramControl.HistogramBarData;
        let maxValue: number = 1; // Max value should be atleast 1 or otherwise we will get divide by zero error
        for (let trend in resultTrend) {
            resultTrend[trend].duration = (resultTrend[trend].duration) ? resultTrend[trend].duration : 1;
            let duration = CommonUtils.TestReportDataParser.getDurationInMilliseconds(resultTrend[trend].duration);
            maxValue = Math.max(maxValue, duration);
        }

        for (let trend in resultTrend) {
            // For Aborted Runs Show Black Colour
            if (resultTrend[trend].runSummaryByState && resultTrend[trend].runSummaryByState[TCMContracts.TestRunState.Aborted]) {
                trendData = this._setHistogramDataForAbortedRun(resultTrend[trend]);
            } else {
                let duration = CommonUtils.TestReportDataParser.getDurationInMilliseconds(resultTrend[trend].duration);
                trendData = this._getRunOutcome(resultTrend[trend].resultsByOutcome,
                    resultTrend[trend].testResultsContext);
                if (duration > 0) {
                    trendData.value = Math.floor((duration * 100) / maxValue);
                } else {
                    trendData.value = 1;
                }
            }

            histogramData.unshift(trendData);
        }

        return histogramData;
    }

    // Set Histogram data for Aborted Runs
    private _setHistogramDataForAbortedRun(resultTrend: TCMContracts.AggregatedDataForResultTrend): HistogramControl.HistogramBarData {
        const histogramStateCanceled = "canceled";
        let histogramData: HistogramControl.HistogramBarData = {};

        histogramData.state = histogramStateCanceled; // For black colour state is marked canceled.
        histogramData.value = 1;
        histogramData.title = TestManagementResources.AbortedRunTrendTooltip;

        return histogramData;
    }

    private _getRunOutcome(runOutComes: { [key: number]: TCMContracts.AggregatedResultsByOutcome }, testResultsContext: TCMContracts.TestResultsContext): HistogramControl.HistogramBarData {
        let finalOutCome: string;
        let tempOutCome: number;
        let data: HistogramControl.HistogramBarData = {};
        let totalFailedTestsCount: number = 0;
        const succeeded = "succeeded";
        const partiallysucceeded = "partiallysucceeded";
        const failed = "failed";

        for (let outcome in runOutComes) {
            if (!tempOutCome) {
                tempOutCome = Number(outcome);
            }

            switch (Number(outcome)) {
                case TCMContracts.TestOutcome.Passed:
                    if (tempOutCome === TCMContracts.TestOutcome.Passed) {
                        finalOutCome = succeeded;
                    }
                    else {
                        tempOutCome = TCMContracts.TestOutcome.Inconclusive;
                        finalOutCome = partiallysucceeded;
                    }
                    break;
                case TCMContracts.TestOutcome.Failed:
                    if (tempOutCome === TCMContracts.TestOutcome.Failed) {
                        finalOutCome = failed;
                    }
                    else {
                        tempOutCome = TCMContracts.TestOutcome.Inconclusive;
                        finalOutCome = partiallysucceeded;
                    }

                    totalFailedTestsCount += runOutComes[outcome].count;
                    break;
                default:
                    tempOutCome = TCMContracts.TestOutcome.Inconclusive;
                    finalOutCome = partiallysucceeded;
                    break;
            }
        }

        let failureTitle: string;
        if (testResultsContext.build && this.getModel().getTestRunBuildDefinition()) {
            failureTitle = Utils_String.localeFormat(TestManagementResources.FailureCountTrendTooltip, totalFailedTestsCount, this.getModel().getTestRunBuildDefinition().name);
        }
        else if (testResultsContext.release && this.getModel().getReleaseDefinitionName()) {
            failureTitle = Utils_String.localeFormat(TestManagementResources.FailureCountTrendTooltipForRelease, totalFailedTestsCount, this.getModel().getReleaseDefinitionName());
        }

        data.state = finalOutCome;
        data.title = failureTitle;

        return data;
    }


    // Private methods
    private _showLoadingMessage(): void {
        Diag.logTracePoint("[TestRunSummaryTextView._showLoadingMessage]: method called");
        this._$loadControl = $("<div />").addClass("message-block").appendTo(this._$summaryTextView);
        let statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._$loadControl,
            { imageClass: "big-status-progress", message: "loading" });
        statusIndicator.start();
    }

    private _hideLoadingMessage(): void {
        Diag.logTracePoint("[TestRunSummaryTextView._hideLoadingMessage]: method called");
        if (this._$loadControl) {
            this._$loadControl.hide();
        }
    }

    private _hideResultsLayout(): void {
        // Some time when we change filter and colapse at the same time, testresult details and test run details 
        // get display at same place as a result of which UI get garbled.
        // Detailed info: https://mseng.visualstudio.com/VSOnline/_workitems/edit/1153982 
        this.getElement().parents().find(".result-summary-view-container").remove();
        this.getElement().parents().find(".test-result-failing-since").empty();
    }

    private _errorHandler(message?: string): void {
        Diag.logTracePoint("[TestRunSummaryTextView._errorHandler]: method called");
        this._hideLoadingMessage();
        Diag.logWarning("[TestRunSummaryTextView._errorHandler]: " + message);
    }

    private _createLayout(): void {
        Diag.logTracePoint("[TestRunSummaryTextView._createLayout]: method called.");

        this._$summaryTextView.find("*").not(Utils_String.format(".test-section-header:contains('{0}')", TestManagementResources.TestRunSummaryTextViewLabel)).remove();

        this._hideLoadingMessage();
        this._hideResultsLayout();

        // Update title and Left Pane
        if ($.isFunction(this._options.updateLeftPaneAndTitle)) {
            this._options.updateLeftPaneAndTitle(this.getModel().getTestRunTitle());
        }

        if (this._options.showSummary) {
            // state with icon and text
            this._addRunState();
            // Table
            this._addRunSummaryInfo();
        }

        // Comment
        this._addCommentSection();
        // Error section
        this._addErrorMessageSection();

        // Attachment title
        this._addAttachmentSection();

        // Histogram element
        let histogramElement: JQuery;
        histogramElement = $(".test-result-histogram");
        this._populateHistogram(histogramElement);
    }

    private _addRunState(): void {
        Diag.logTracePoint("[TestRunSummaryTextView._addStatus]: method called.");

        let _$state = $("<div class='test-run-summary-text-view-state' />");

        let state = this._model.getTestRunState();
        let text = this._getStatusString(state);
        let iconClassName = ValueMap.TestRunState.getIconClassName(state, this._model.getTestRunPartialPassState());
        let $resultSummary = $("<span class='result-summary-icon' />").addClass(iconClassName);
        RichContentTooltip.add(ValueMap.TestRunState.getFriendlyName(state), $resultSummary, { setAriaDescribedBy: true });
        _$state.append($resultSummary);
        $("<span class='test-run-summary-status-duration'/>").text(text).appendTo(_$state);

        this._$summaryTextView.append(_$state);

        Diag.logVerbose("[TestRunSummaryTextView._addStatus]: Added status to TestRunSummaryTextView");
    }

    public addRunState(section: JQuery): void {
        Diag.logTracePoint("[TestRunSummaryTextView.addRunState]: method called.");

        let _$state = $("<div class='test-run-summary-text-view-state' />");
        //var text = Utils_Date.ago(this._model.getTestRunCompletedDate());
        let state = this._model.getTestRunState();
        let text = this._getStatusString(state);
        $("<span class='test-run-summary-status-duration'/>").text(text).attr("title", text).appendTo(_$state);
        section.append(_$state);

        Diag.logVerbose("[TestRunSummaryTextView..addRunState]: Added status to TestRunSummaryTextView in InContext Report");
    }

    private _addRunSummaryInfo(): void {
        Diag.logTracePoint("[TestRunSummaryTextView._addRunSummaryInfo]: method called.");

        let _$summaryContent = $("<div class='test-run-summary-text-view-content' />");

        let releaseName = Utils_String.empty;
        let releaseEnvironmentName = Utils_String.empty;
        let releaseSummaryUrl = Utils_String.empty;
        let releaseSummaryTestTabWithEnvironmentUrl = Utils_String.empty;
        let releaseId = this._model.getReleaseId();
        let releaseEnvironmentId = this._model.getReleaseEnvironmentId();
        let releaseEnvironmentDefinitionId = this._model.getReleaseEnvironmentDefinitionId();

        if (releaseId) {
            releaseName = this._model.getReleaseName();
            releaseSummaryUrl = TMUtils.UrlHelper.getReleaseSummaryUrl(releaseId);
            if (releaseEnvironmentId && releaseEnvironmentId) {
                releaseEnvironmentName = this._model.getReleaseEnvironmentName();
                releaseSummaryTestTabWithEnvironmentUrl = TMUtils.UrlHelper.getReleaseSummaryTestTabWithEnvironmentUrl(releaseId, releaseEnvironmentDefinitionId, releaseEnvironmentId);
            }
        }

        TRACommonControls.TRAHelper.getRowValueForSummary(TestManagementResources.RunTypeText, this._model.getTestRunType(), TestManagementResources.NotAvailableText).appendTo(_$summaryContent);
        TRACommonControls.TRAHelper.getRowValueForSummary(TestManagementResources.Owner, this._model.getTestRunOwner(), TestManagementResources.NotAvailableText).appendTo(_$summaryContent);
        TRACommonControls.TRAHelper.getRowValueWithLinkForSummary(TestManagementResources.TestedBuildText, this._model.getTestRunBuildNumber(), TestManagementResources.NotAvailableText, this._model.getTestRunBuildUrl()).appendTo(_$summaryContent);
        this._getReleaseNameRowValueWithLinkForSummary(releaseId, releaseName, releaseSummaryUrl, !!releaseId).appendTo(_$summaryContent);
        TRACommonControls.TRAHelper.getRowValueWithLinkForSummary(TestManagementResources.ReleaseStageText, releaseEnvironmentName, TestManagementResources.NotAvailableText, releaseSummaryTestTabWithEnvironmentUrl).appendTo(_$summaryContent);
        TRACommonControls.TRAHelper.getRowValueForSummary(TestManagementResources.BuildPlatformText, this._model.getTestRunBuildPlatform(), TestManagementResources.NotAvailableText).appendTo(_$summaryContent);
        TRACommonControls.TRAHelper.getRowValueForSummary(TestManagementResources.BuildFlavorText, this._model.getTestRunBuildFlavor(), TestManagementResources.NotAvailableText).appendTo(_$summaryContent);
        TRACommonControls.TRAHelper.getRowValueForSummary(TestManagementResources.TestSettingsText, this._model.getTestRunTestSettings(), TestManagementResources.TestRunSummaryDefaultText).appendTo(_$summaryContent);
        TRACommonControls.TRAHelper.getRowValueForSummary(TestManagementResources.MTMLabEnvironment, this._model.getTestRunTestEnvironment(), TestManagementResources.NotAvailableText).appendTo(_$summaryContent);

        this._$summaryTextView.append(_$summaryContent);
        Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.OpenTestRunSummary_RunSummaryViewRendered);
    }

    private _getReleaseNameRowValueWithLinkForSummary(releaseId: number, releaseName: string, releaseSummaryUrl: string, addViewLogsLabel: boolean): JQuery {
        let releaseNameRow = TRACommonControls.TRAHelper.getRowValueWithLinkForSummary(TestManagementResources.ReleaseText, releaseName, TestManagementResources.NotAvailableText, releaseSummaryUrl);
        if (addViewLogsLabel) {
            let viewLogsLabel = $("<a class='test-run-summary-content'/>").text("(" + TestManagementResources.ViewLogsText + ")").attr("href", TMUtils.UrlHelper.getReleaseLogsUrl(releaseId));
            viewLogsLabel.prepend("&nbsp;");
            releaseNameRow.append(viewLogsLabel);
        }
        return releaseNameRow;
    }

    private _addCommentSection(): void {
        $("<h2 class='test-section-header' />").text(TestManagementResources.CommentsText).appendTo(this._$summaryTextView);
        let comments = this._model.getTestRunComments();
        if (comments) {
            if (LicenseAndFeatureFlagUtils.isRenderMarkDownCommentEnabled()) {
                let $commentRow = $("<div class='test-run-summary-markdown-comments' />");
                let $markDownContainer = $("<div />").addClass(TestRunSummaryTextView.testManagementMarkdownClass);
                let renderedComment = this._markdownRenderer.renderHtml(comments);
                $markDownContainer.append($(renderedComment));
                $("a", $markDownContainer).each(function () {
                    $(this).attr("rel", "noreferrer noopener");
                });
                $commentRow.append($markDownContainer);
                $commentRow.appendTo(this._$summaryTextView);
            }
            else {
                $("<div class='test-run-summary-comments' />").text(comments).appendTo(this._$summaryTextView);
            }
        }
        else {
            $("<span class='test-run-summary-no-content'/>").text(TestManagementResources.RunSummaryNoCommentsText).appendTo(this._$summaryTextView);
        }
    }

    private _addErrorMessageSection(): void {
        $("<h2 class='test-section-header' />").text(TestManagementResources.ErrorMessageLabel).appendTo(this._$summaryTextView);
        let errorMessage = this._model.getTestRunError();
        if (errorMessage) {
            $("<div class='test-run-summary-errors' />").text(errorMessage).appendTo(this._$summaryTextView);
        }
        else {
            $("<span class='test-run-summary-no-content'/>").text(TestManagementResources.RunSummaryNoErrorMessageText).appendTo(this._$summaryTextView);
        }
    }

    private _addAttachmentSection(): void {
        let _$attachment = $("<h2 class='test-section-header' />");

        // Create the main table
        let $layoutTable = $("<table class ='run-attachment-table' />");

        let $headerRowWithColoumns = this._addAttachmentColoumnHeadersRow();
        let attachmentCount = 0;

        if (LicenseAndFeatureFlagUtils.isGridViewOfRunsOrResultsAttachmentsEnabled()) {
            VSS.using(["TestManagement/Scripts/TFS.TestManagement.AttachmentsGridViewHelper"], (
                AttachmentsGridViewHelperModule: typeof AttachmentsGridViewHelper_LAZY_LOAD
            ) => {
                if (!this._attachmentsGridViewHelper) {
                    this._attachmentsGridViewHelper = new AttachmentsGridViewHelperModule.AttachmentsGridViewHelper();
                }
                let options: AttachmentsGridViewHelper_LAZY_LOAD.AttachmentsGridViewOptions = {
                    container: $layoutTable,
                    attachmentSource: TMUtils.AttachmentSource.testRun,
                    testRunId: this._options.runId,
                    testResultId: parseInt(TestManagementResources.NullValue),
                    subResultId: 0
                };
                this._attachmentsGridViewHelper.renderAttachmentsGrid(options);
            },
                (error) => {
                    Diag.logWarning(TestManagementResources.UnableToRenderGrid);
                }
            );
        } else {

            TMUtils.getTestRunManager().getTestRunAttachments(this._options.runId, (testRunAttachment) => {

                Diag.logTracePoint("[TestRunAttachment: successfully fetched TestRun Attachments");

                //Display attachments for all iterations. For a test case with-out iterations, attachments will be in first iteration.
                for (let i = 0; i < testRunAttachment.length; i++) {
                    attachmentCount += 1;
                    if (attachmentCount == 1) {
                        $layoutTable.append($headerRowWithColoumns);
                    }

                    let attachment = new TestsOM.AttachmentInfo(testRunAttachment[i].attachmentId, testRunAttachment[i].attachmentName, testRunAttachment[i].attachmentSize, testRunAttachment[i].attachmentComment);
                    this._addAttachmentRow($layoutTable, attachment, attachmentCount);

                }
                _$attachment.text(Utils_String.format(TestManagementResources.AttachmentsLabel, attachmentCount));
                if (attachmentCount == 0) {
                    let $noAttachments = $("<span class='result-attachments-noitems'/>").text(TestManagementResources.ResultNoAttachments);
                    $noAttachments.appendTo($layoutTable);
                }

                Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.OpenTestRunSummary);
            }, (error) => {
                Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.OpenTestRunSummary);
                Diag.logError("[TestRunAttachment: FAILED fetching TestRun Attachments");
            });
        }
        this._$summaryTextView.append(_$attachment);
        this._$summaryTextView.append($layoutTable);
    }

    private _addAttachmentRow($layoutTable: JQuery, attachment: TestsOM.AttachmentInfo, attachmentCount: number) {
        let $layoutRow = $("<tr/>");
        let params = {
            attachmentId: attachment.getId()
        };

        let fileName: string = attachment.getName();
        let fileNameExtension: string;
        if (fileName.indexOf(".") !== -1) {
            fileNameExtension = fileName.substring(fileName.lastIndexOf("."));
        }

        let url = TMUtils.getTestResultManager().getApiLocation("DownloadAttachment", params);
        let column: JQuery = $("<a />").appendTo($("<td />").appendTo($layoutRow)).text(attachment.getName());

        if (!LicenseAndFeatureFlagUtils.isPreviewAttachmentsOfRunsOrResultsEnabled() || !TMUtils.getTestResultManager().isAttachmentPreviewable(fileNameExtension)) {
            column.attr("href", url).attr("target", "_blank").attr("rel", "nofollow noopener noreferrer");
        }
        RichContentTooltip.add(Utils_String.htmlEncode(attachment.getComment()), column, { setAriaDescribedBy: true });

        let attachmentSizeString = Utils_String.format(TestManagementResources.AttachmentSizeValueInKB, Math.ceil(attachment.getSize() / 1024));
        $("<td />").appendTo($layoutRow).text(attachmentSizeString);

        $layoutTable.append($layoutRow);

        column.click(() => {
            if (TMUtils.getTestResultManager().isAttachmentPreviewable(fileNameExtension)) {
                if (LicenseAndFeatureFlagUtils.isPreviewAttachmentsOfRunsOrResultsEnabled()) {
                    this._openPreviewAttachmentDialog(attachment);
                }
            } else {
                TelemetryHelper.logTelemetryForPreviewAttachments(TMUtils.AttachmentSource.testRun, TelemetryService.featureDownloadTestResultOrRunAttachment, fileNameExtension, attachment.getSize());
            }
        });
    }

    private _addAttachmentColoumnHeadersRow() {
        let $headerRow = $("<tr/>");

        let $coloumnHeader = $("<th width='40%'></th>");
        $coloumnHeader.append(TestManagementResources.AttachmentName);

        $headerRow.append($coloumnHeader);

        $coloumnHeader = $("<th width='10%'></th>");
        $coloumnHeader.append(TestManagementResources.AttachmentSize);

        $headerRow.append($coloumnHeader);

        return $headerRow;
    }

    private _getStatusString(state: number): string {
        Diag.logVerbose("[TestRunSummaryView._getStatusString] - Called");
        let sb = new Utils_String.StringBuilder();

        if (state === ValueMap.TestRunState.NeedsInvestigation) {
            sb.append(TestManagementResources.RunSummaryCompletedWithFailuresText);
        } else {
            sb.append(ValueMap.TestRunState.getFriendlyName(state));
        }
        sb.append(" ");

        let startDate = this._model.getTestRunStartedDate(), completeDate = this._model.getTestRunCompletedDate();

        switch (state) {
            case TCMConstants.TestRunState.NeedsInvestigation:
            case TCMConstants.TestRunState.Completed:
            case TCMConstants.TestRunState.Aborted:
                //the date value we got from server will be in clients(machine) time zone. ago wil get string comparing date in client time zone.
                let agoString: string = Utils_Date.ago(completeDate);
                if (agoString) {
                    sb.append(agoString);
                }
                break;
        }

        let ranForString: string = null, duration: string, timeDiff: number;
        switch (state) {
            case TCMConstants.TestRunState.NeedsInvestigation:
            case TCMConstants.TestRunState.Completed:
            case TCMConstants.TestRunState.Aborted:
                ranForString = TestManagementResources.RunSummaryRanForText;
                //In case of aborted runs due to on demand scenario failure the started date comes out to be undefined as we go from 'not started' to 'aborted' state
                timeDiff = startDate ? Utils_Date.defaultComparer(completeDate, startDate) : 0;
                Diag.Debug.assert(timeDiff >= 0 ? true : false, "CompleteDate of run is smaller than StartDate.");
                timeDiff = timeDiff < 0 ? 0 : timeDiff;
                duration = TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForRunSummary(timeDiff);
                break;
            case TCMConstants.TestRunState.InProgress:
                ranForString = TestManagementResources.RunSummaryRunningForText;
                //start date is in client time zone. for getting difference convert to user time zone.
                let nowdate: Date = Utils_Date.getNowInUserTimeZone();
                let startDateInUserTimeZone: Date = Utils_Date.convertClientTimeToUserTimeZone(startDate);
                timeDiff = Utils_Date.defaultComparer(nowdate, startDateInUserTimeZone);
                Diag.Debug.assert(timeDiff >= 0 ? true : false, "StartDate is ahead of today.");
                timeDiff = timeDiff < 0 ? 0 : timeDiff;
                duration = TRACommonControls.TRAHelper.ConvertMilliSecondsToReadableFormatForRunSummary(timeDiff);
                break;
        }

        if (ranForString && duration != null) {
            sb.append(", ");
            sb.append(ranForString);
            sb.append(" ");
            sb.append(duration);
        }

        return sb.toString();
    }

    private _openPreviewAttachmentDialog(attachment: TestsOM.AttachmentInfo): void {

        let fileName: string = attachment.getName();
        let fileNameExtension: string;
        if (fileName.indexOf(".") != -1) {
            fileNameExtension = fileName.substring(fileName.lastIndexOf("."));
        }

        VSS.using(["TestManagement/Scripts/TFS.TestManagement.PreviewAttachmentHelper"], (
            PreviewAttachmentHelperModule: typeof PreviewAttachmentHelper_LAZY_LOAD
        ) => {
            if (!this._previewAttachmentHelper) {
                this._previewAttachmentHelper = new PreviewAttachmentHelperModule.PreviewAttachmentHelper();
            }
            let options: PreviewAttachmentHelper_LAZY_LOAD.PreviewAttachmentDialogOptions = {
                attachmentSource: TMUtils.AttachmentSource.testRun,
                testRunId: this._options.runId,
                testResultId: parseInt(TestManagementResources.NullValue),
                subResultId: 0,
                filename: fileName,
                selectedAttachmentId: attachment.getId()
            };
            this._previewAttachmentHelper.openPreviewAttachmentDialog(options);
            TelemetryHelper.logTelemetryForPreviewAttachments(TMUtils.AttachmentSource.testRun, TelemetryService.featurePreviewAttachment_DialogOpened, fileNameExtension, attachment.getSize());

        },
            (error) => {
                Diag.logError(TestManagementResources.FailedToOpenPreviewDialog);
                TelemetryHelper.logTelemetryForPreviewAttachments(TMUtils.AttachmentSource.testRun, TelemetryService.featurePreviewAttachment_DialogOpenFailed, fileNameExtension, attachment.getSize());
            }
        );
    }

    private _getDefaultMarkdownOptions(): MarkdownRendererOptions {
        let options: MarkdownRendererOptions;
        options = {
            validateLink: validateLinkProtocol
        };
        return options;
    }
}

VSS.initClassPrototype(TestRunSummaryTextView, {
    _$loadControl: null,
    _$summaryTextView: null,
    _$summaryTextViewContainer: null,
    _model: null
});

// ObjectModel for TestRunSummaryTextView
export class TestRunSummaryTextViewModel {

    private _currentRun: TCMContracts.TestRun;
    private _currentRunId: number;
    private _buildUrl: string;
    private _buildDefinitionId: number;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;
    private _buildDefinition: BuildContracts.DefinitionReference;
    private _releaseDefinition: RMContracts.ReleaseDefinition;
    private _releaseDataHelper: ReleaseDataHelper.ReleaseDataHelper;

    constructor(runId, tfsContext) {
        this._currentRunId = runId;
        this._tfsContext = tfsContext || TfsContext.getDefault();
        if (!this._releaseDataHelper) {
            this._releaseDataHelper = new ReleaseDataHelper.ReleaseDataHelper();
        }
    }

    // Public Methods
    public beginInitialize(successCallback: Function, errorCallback?: Function): void {
        Diag.logTracePoint("[TestRunSummaryTextViewModel.beginInitialize]: method called.");

        Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.OpenTestRunSummary_BeginGetTestRunDetails);
        
        TcmService.ServiceManager.instance().testResultsService().getTestRunById(this._currentRunId).then(
            (run: TCMContracts.TestRun) => {

                Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.OpenTestRunSummary_EndGetTestRunDetails);

                Diag.logVerbose(Utils_String.format("[TestRunSummaryTextViewModel.beginInitialize]: Successfully fetched TestRun for runId:{0}", this._currentRunId));
                this._currentRun = run;

                if (this._currentRun.build) {
                    // Fetch the Build to get the build link
                    let buildService = TcmService.ServiceManager.instance().buildService();
                    buildService.getBuild(parseInt(this._currentRun.build.id)).then(
                        (buildObject) => {
                            this._buildUrl = buildObject._links.web.href;
                            this._buildDefinitionId = buildObject.definition.id;
                            this._buildDefinition = buildObject.definition;
                            Diag.logVerbose(Utils_String.format("BuildUrl: {0}", this._buildUrl));

                            if (this._currentRun.release) {
                                this._releaseDataHelper.getReleaseDefinition(this._currentRun.release.definitionId).then((rd: RMContracts.ReleaseDefinition) => {
                                    this._releaseDefinition = rd;
                                    successCallback();
                                }).then(undefined, error => {
                                    if ($.isFunction(errorCallback)) {
                                        errorCallback("Failed to get current TestRun object");
                                    }
                                });
                            }
                            else if ($.isFunction(successCallback)) {
                                successCallback();
                            }
                        },
                        (error) => {
                            Diag.logError(JSON.stringify(error));
                            if ($.isFunction(successCallback)) {
                                successCallback();
                            }
                        });
                }
                else if ($.isFunction(successCallback)) {
                    successCallback();
                }
            }, (reason: any) => {
                Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.OpenTestRunSummary);
                Diag.logWarning(Utils_String.format("[TestRunSummaryTextViewModel.beginInitialize]: Unable to fetch run object for runId:{0}. Error:{1}", this._currentRunId, JSON.stringify(reason)));
                if ($.isFunction(errorCallback)) {
                    errorCallback("Failed to get current TestRun object");
                }
            });
    }

    public getTestRun(): TCMContracts.TestRun {
        return this._currentRun;
    }

    public getTestRunState(): number {
        return (TCMConstants.TestRunState[this._currentRun.state]) ? TCMConstants.TestRunState[this._currentRun.state] : TCMConstants.TestRunState.Unspecified;
    }

    public getTestRunPartialPassState(): boolean {
        return (this._currentRun.passedTests !== this._currentRun.totalTests);
    }

    public getTestRunType(): string {
        return (this._currentRun.isAutomated) ? TestManagementResources.AutomatedText : TestManagementResources.ManualText;
    }

    public getTestRunOwner(): string {
        return (this._currentRun.owner) ? this._currentRun.owner.displayName : null;
    }

    public getTestRunTestEnvironment(): string {
        let environmentName: string = Utils_String.empty,
            subStrings: string[],
            index: number;

        if (this._currentRun.testEnvironment) {
            environmentName = this._currentRun.testEnvironment.environmentName;
        }

        return environmentName;
    }

    public getTestRunBuildNumber(): string {
        return (this._currentRun.build) ? this._currentRun.build.name : null;
    }

    public getTestRunBuildDefinition(): BuildContracts.DefinitionReference {
        return (this._buildDefinition) ? this._buildDefinition : null;
    }

    public getTestRunBuildDefinitionIds(): number {
        return this._buildDefinitionId;
    }

    public getTestRunBuildUrl(): string {
        return this._buildUrl;
    }

    public getTestRunTestSettings(): string {
        return (this._currentRun.testSettings) ? this._currentRun.testSettings.name : null;
    }

    public getTestRunBuildPlatform(): string {
        return (this._currentRun.buildConfiguration) ? this._currentRun.buildConfiguration.platform : null;
    }

    public getTestRunBuildFlavor(): string {
        return (this._currentRun.buildConfiguration) ? this._currentRun.buildConfiguration.flavor : null;
    }

    public getTestRunComments(): string {
        return (this._currentRun.comment) ? this._currentRun.comment : null;
    }

    public getTestRunError(): string {
        return (this._currentRun.errorMessage) ? this._currentRun.errorMessage : null;
    }

    public getTestRunStartedDate(): Date {
        return this._currentRun.startedDate;
    }

    public getTestRunCompletedDate(): Date {
        return this._currentRun.completedDate;
    }

    public getTestRunTitle(): string {
        if (this._currentRun.name) {
            let runTitle = this._currentRun.name.replace(/^\s\s*/, "").replace(/\s\s*$/, "");
            return runTitle;
        }
        else {
            return null;
        }
    }

    public getTestRunId(): number {
        return this._currentRun.id;
    }

    public getReleaseId() {
        return (this._currentRun.release) ? this._currentRun.release.id : null;
    }

    public getReleaseName() {
        return (this._currentRun.release) ? this._currentRun.release.name : Utils_String.empty;
    }

    public getReleaseEnvironmentName() {
        return (this._currentRun.release) ? this._currentRun.release.environmentName : Utils_String.empty;
    }

    public getReleaseEnvironmentId() {
        return (this._currentRun.release) ? this._currentRun.release.environmentId : null;
    }

    public getReleaseEnvironmentDefinitionId() {
        return (this._currentRun.release) ? this._currentRun.release.environmentDefinitionId : null;
    }

    public getReleaseDefinitionId() {
        return (this._currentRun.release) ? this._currentRun.release.definitionId : null;
    }

    public getReleaseDefinitionName() {
        return (this._releaseDefinition) ? this._releaseDefinition.name : null;
    }
}

VSS.initClassPrototype(TestRunSummaryTextViewModel, {
    _currentRun: null,
    _currentRunId: null,
    _buildUrl: null,
    _tfsContext: null,
    _buildClientService: null
});

// Inspect the provided urls for all protocols we want to prevent
// The markdown-it defaults are to allow the data protocol if it is an image but
// we don't want to allow embeded images that we'll have to scan for malicious content
const BAD_PROTOCOLS = /^(vbscript|javascript|file|data):/;
export function validateLinkProtocol(url) {
    var str = url.trim().toLowerCase();
    return !BAD_PROTOCOLS.test(str);
}
