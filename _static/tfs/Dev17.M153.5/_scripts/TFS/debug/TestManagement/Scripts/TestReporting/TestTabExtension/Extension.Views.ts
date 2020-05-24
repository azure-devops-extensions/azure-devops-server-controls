

import ko = require("knockout");

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultListVM = require("TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.ResultListViewModel");
import ResultsControls = require("TestManagement/Scripts/TestReporting/TestTabExtension/Controls");
import ResultsDetail = require("TestManagement/Scripts/TestReporting/TestTabExtension/TestResults.ResultDetails");
import ResultsSummaryCharts = require("TestManagement/Scripts/TestReporting/TestTabExtension/Summary");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import TrendCharts = require("TestManagement/Scripts/TestReporting/TestTabExtension/Trend");
import ViewModel = require("TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel");
import * as ViewSettings from "TestManagement/Scripts/TestReporting/Common/View.Settings";
import Notifications = require("VSS/Controls/Notifications");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Performance = require("VSS/Performance");
import Splitter = require("VSS/Controls/Splitter");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let domElement = Utils_UI.domElem;
let delegate = Utils_Core.delegate;
let TelemetryService = TCMTelemetry.TelemetryService;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export interface IContributionView {
    getLayout(): JQuery;
    getViewModel(): IContributionViewModel;
    getTestResultsPart(): JQuery;
}

export interface IContributionViewModel {
    getMessageAreaViewModel(): MessageArea.MessageAreaViewModel;
    getSummaryChartsViewModel(): ResultsSummaryCharts.SummaryChartViewModel;
}

export interface IContributionViewOptions {
    target: Common.TargetPage;
    viewModel: IContributionViewModel;
}

export class ContributionViewBase<IContributionViewOptions> extends Controls.Control<IContributionViewOptions> implements IContributionView {

    public initialize() {
        super.initialize();
        this._createLayout();
        this._setMessageAreaSection();
    }

    public initializeOptions(options: any) {
        let coreCssClass: string = Utils_String.empty;

        switch (options.target) {
            case Common.TargetPage.Build_Summary_Default_Tab:
                coreCssClass = "test-results-in-build-summary-tab";
                break;
            case Common.TargetPage.Build_Summary_Test_Tab:
                coreCssClass = "test-results-in-build-test-tab fixed-section";
                break;
            case Common.TargetPage.Release_Summary_Default_Tab:
                coreCssClass = "test-results-in-release-summary-tab";
                break;
            case Common.TargetPage.Release_Summary_Test_Tab:
                coreCssClass = "test-results-in-release-test-tab fixed-section";
                break;
        }

        super.initializeOptions($.extend({
            coreCssClass: coreCssClass
        }, options));
    }

    /// <summary>
    /// Disposes the disposalManager
    /// </summary>
    public dispose(): void {
        this._disposalManager.dispose();
        super.dispose();
    }

    /// <summary>
    /// This method must be overriden in the derived classes
    /// </summary>
    public getLayout(): JQuery {
        throw new Error(("ContributionViewBase.getLayout(): This method should be overridden"));
    }

    /// <summary>
    /// This method must be overriden in the derived classes
    /// </summary>
    public getViewModel(): IContributionViewModel {
        throw new Error(("ContributionViewBase.getViewModel(): This method should be overridden"));
    }

    /// <summary>
    /// This method must be overriden in the derived classes
    /// </summary>    
    public getTestResultsPart(): JQuery {
        throw new Error(("ContributionViewBase.getTestResultsPart(): This method should be overridden"));
    }

    /// <summary>
    /// creates the layout for the view
    /// </summary>
    private _createLayout(): void {
        Diag.logVerbose("[ContributionViewBase._createLayout]: method called.");

        this._layout = this.getLayout();
        this._element.append(this._layout);
    }

    /// <summary>
    /// defines the message area section
    /// </summary>
    private _setMessageAreaSection(): void {
        Diag.logVerbose("[ContributionViewBase._setMessageAreaSection]: method called.");

        let viewModel = this.getViewModel();
        this._testResultsPart = this.getTestResultsPart();

        if (!this._testResultsPart) {
            Diag.logWarning("[ContributionViewBase._setMessageAreaSection]: _testResultsPart is null");
            return;
        }

        let messageAreaViewModel = viewModel.getMessageAreaViewModel();
        this._disposalManager.addDisposable(messageAreaViewModel.logError.subscribe(() => {
            this._testResultsPart.hide();
        }));

        this._disposalManager.addDisposable(messageAreaViewModel.logInfo.subscribe(() => {
            this._testResultsPart.hide();
        }));

        let summaryChartViewModel = viewModel.getSummaryChartsViewModel();
        this._disposalManager.addDisposable(ko.computed(() => {
            if ((summaryChartViewModel.abortedRuns() > 0 && LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled())
                || summaryChartViewModel.totalTests() > 0
                || (summaryChartViewModel.inProgressRuns() > 0 && LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled())) {
                messageAreaViewModel.clear();
                this._testResultsPart.show();
            } else {
                this._testResultsPart.hide();
            }
        }));
    }

    protected _layout: JQuery;
    protected _testResultsPart: JQuery;
    protected _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
}

export interface ISummaryViewOptions extends IContributionViewOptions {
    selectTab: (tabId: string) => void;
}

/// <summary>
/// Test Results summary section view will be loaded in Build Summary default tab
/// </summary>
export class SummaryView extends ContributionViewBase<ISummaryViewOptions> {

    public initialize() {
        super.initialize();
        this._populateSections();
        this._setEnableTIAMessage();
    }

    public initializeOptions(options: ISummaryViewOptions) {
        super.initializeOptions($.extend({
            cssClass: "test-results-summary-section"
        }, options));
        this._viewModel = <SummaryViewModel>options.viewModel;
        this._targetPage = options.target;
    }

    public dispose() {
        super.dispose();
    }

    /// <summary>
    /// Returns layout skeleton for test results summary section in Build summary tab
    /// </summary>
    public getLayout(): JQuery {
        let content: JQuery;
        let layout = $(
            `<div class='test-results-summary-section-layout' >

                <!-- ko ifnot: hideRunsUnavailableMessage -->
                    <span data-bind="html: testRunsUnavailableMessage" />
                    <!-- ko ifnot: buildDefinitionIsXaml -->
                        <span data-bind="html: enableAutomationMessage"></span>
                    <!-- /ko -->
                <!-- /ko -->                
                <div class='summary-section-part' >
                    <!-- ko ifnot: noImpactedTestsAvailable -->                                                                                           
                        <div class='tia-link' />
                        <div class='test-results-summary-charts-section' />
                        <div class='test-tab-link' />
                    <!-- /ko -->                    
                </div>
                <!-- ko if: noImpactedTestsAvailable -->
                    <span data-bind="html: noImpactedTestsMessage"></span>
                <!-- /ko -->
            </div>`
        );
        content = $(domElement("div")).append(layout);
        ko.applyBindings(this._viewModel.getSummaryChartsViewModel(), content[0]);
        return content;
    }

    public getViewModel(): IContributionViewModel {
        return this._viewModel;
    }

    /// <summary>
    /// Returns results section
    /// </summary>
    public getTestResultsPart(): JQuery {
        return this._layout.find(".summary-section-part");
    }

    /// <summary>
    /// populates the view sections
    /// </summary>
    private _populateSections(): void {
        let testTabLink: JQuery;

        this._summaryCharts = <ResultsSummaryCharts.SummaryCharts>Controls.BaseControl.createIn(
            ResultsSummaryCharts.SummaryCharts,
            this._layout.find(".test-results-summary-charts-section"),
            <ResultsSummaryCharts.ISummaryChartsOptions>({
                target: this._options.target,
                viewModel: this._viewModel.getSummaryChartsViewModel()
            }));

        testTabLink = $("<a />")
            .text(Resources.DetailedReportText)
            .click(() => {
                this._options.selectTab(SummaryView.TestResultsDetailsTabId);
                TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_TestTabDetailedReportClicked,
                    TelemetryService.eventClicked,
                    SummaryView.TestResultsDetailsTabId);
            });
        this._layout.find(".test-tab-link").append(testTabLink);

        if (LicenseAndFeatureFlagUtils.isTIAMessageInBuildSummaryEnabled()) {
            let summaryChartsViewModel = this._viewModel.getSummaryChartsViewModel();
            let tiaLink: JQuery;
            tiaLink = $("<span />").append(Resources.EnableTestImpactAnalysis);
            let tiaMessage = $(tiaLink).on("click", "a", () => {
                summaryChartsViewModel.enableTIAMessageClicked();
            });

            this._notificationArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._layout.find(".tia-link"), {
                showDetailsLink: false,
                showHeader: true,
                showIcon: true
            });

            this._notificationArea._bind(Notifications.MessageAreaControl.EVENT_CLOSE_ICON_CLICKED, (e) => {
                //Adding telemetry point
                TelemetryService.publishEvent(TelemetryService.featureDismissTIALinkClicked, TelemetryService.eventClicked, 1);
                summaryChartsViewModel.dismissTIANotification();
            });

            this._notificationArea.setMessage({
                type: Notifications.MessageAreaType.Info,
                header: tiaMessage
            });
        }
    }

    private _setEnableTIAMessage() {
        let tiaLink: JQuery;
        tiaLink = this._layout.find(".tia-link");
        let summaryChartsViewModel = this._viewModel.getSummaryChartsViewModel();
        this._disposalManager.addDisposable(summaryChartsViewModel.showEnableTestImpactAnalysisMessage.subscribe((enableTIA: boolean) => {
            if (enableTIA) {
                tiaLink.show();
            }
            else {
                tiaLink.hide();
            }
        }));
    }

    public static TestResultsDetailsTabId: string = "ms.vss-test-web.test-result-details";
    private _viewModel: SummaryViewModel;
    private _targetPage: Common.TargetPage;
    private _summaryCharts: ResultsSummaryCharts.SummaryCharts;
    private _messageArea: MessageArea.MessageAreaView;
    private _notificationArea: Notifications.MessageAreaControl;
}

/// <summary>
/// Options for Test tab view
/// </summary>
export interface ITestTabViewOptions extends IContributionViewOptions {
    onFullScreenToggle: (flag: boolean) => void;
}

/// <summary>
/// Test tab view
/// </summary>
export class TestTabView extends ContributionViewBase<ITestTabViewOptions> {
    private readonly testResultsTrendChartsClass = ".test-results-trend-charts-section";

    public initialize() {
        super.initialize();
        this._createMasterDetailsLayout();
        this._populateSections();
        this._setTrendSetCharts();
        this._setResultListMessageArea();
    }

    public initializeOptions(options: ITestTabViewOptions) {
        super.initializeOptions(options);
        this._onFullScreenToggle = options.onFullScreenToggle;
        this._viewModel = <TestTabViewModel>options.viewModel;
    }

    public dispose() {
        super.dispose();
    }

    /// <summary>
    /// This method creates the sections for the view
    /// the view is mainly divided into three horizontal sections (top, middle, bottom)
    ///----------top section--------/
    /// | summary charts |-| trend charts |-| full screen button|
    ///----------middle section------/
    /// | tool bar |-| Group by |-| Filter |
    ///----------bottom section------/
    /// | Results grid |
    /// </summary>
    public getLayout(): JQuery {
        let layout = $(
            `<div class='test-results-layout fixed-section' >
                <div class='message-area-part' />
                <div class='test-results-details-part fixed-section' >
                    <div class='head-section' >
                        <div class='left-section left'>
                            <div class='test-results-summary-charts-section left' />
                        </div>
                        <div class='right-section right' >
                            <div class='test-results-trend-charts-section left'  />
                            <div class='action-control right' >
                                <div class='full-screen-toggle' />
                                <div class='test-results-feedback' />
                            </div>
                        </div>
                    </div>
                    <div class='no-failed-test-message-area' />
                    <div class='body-section fixed-section' />
                </div>
            </div>`
        );

        return layout;
    }

    public getViewModel(): IContributionViewModel {
        return this._viewModel;
    }

    public getTestResultsPart(): JQuery {
        return this._layout.find(".test-results-details-part");
    }

    public applySettings(viewContext: CommonBase.ViewContext) {
        this._viewContext = viewContext;
        this._resultsDetail.applySettings(viewContext);

        // Set the splitter state based on the saved user settings
        this._splitState = ViewSettings.TestReportViewSettings.getInstance().getViewSettings().toggleState;
        this._splitter.toggleExpanded(this._splitState);

        this._rightToolbar.setSplitterExpandedState(this._splitState);
    }

    /// <summary>
    /// defines skeleton for master and details section
    /// </summary>
    private _createMasterDetailsLayout(): void {
        this._master = $(
            `<div class='test-results-left-pane'>
                 <div class='controls-section' >
                    <div class='left-toolbar-section left' />
                    <div class='middle-section right' >
                        <div class='groupby-section left' />
                        <div class='filters-section left' />
                        <div class='right-toolbar-section right' />
                    </div>
                </div>
                <div class='test-view-filter-bar'></div>
                <div class='filter-message-area'></div>
                <div class='no-test-message-area' />
                <div class='no-test-results-image-area' />
                <div class='results-section fixed-section' >
                    <div class='test-results-grid' />
                </div>
            </div> `
        );

        this._details = $(
            `<div class='test-result-details-section fixed-section' >
                <div class='test-result-details-header-section' >
                    <div class='test-result-histogram-history left'>
                        <div class='test-result-histogram' />
                        <div class='test-result-history-link' />
                    </div>
                    <div class='test-result-header'>
                        <div class='test-result-details-test-title' />
                            <div >
                               <span class='test-result-failed-on' />
                               <span class='test-result-console-log'/>
                            </div>
                        <div class='test-result-failing-since' />
                    </div>
                    </div>
                <div class='test-result-details fixed-section' />
            </div>`
        );
    }

    /// <summary>
    /// populates individual sections
    /// </summary>
    /// <param>container element</param>
    private _populateSections() {
        Diag.logVerbose("[CommonView._populateSections]: method called.");
        // Head section //
        // Summary Charts section
        this._summaryCharts = <ResultsSummaryCharts.SummaryCharts>Controls.BaseControl.createIn(
            ResultsSummaryCharts.SummaryCharts,
            this._layout.find(".test-results-summary-charts-section"),
            <ResultsSummaryCharts.ISummaryChartsOptions>({
                target: this._options.target,
                viewModel: (<TestTabViewModel>this._viewModel).getSummaryChartsViewModel()
            }));

        this._messageArea = <MessageArea.MessageAreaView>Controls.BaseControl.enhance(MessageArea.MessageAreaView, this._layout.find(".message-area-part"), {
            viewModel: this._viewModel.getMessageAreaViewModel(),
            closeable: false
        });

        // Body section //
        this._splitter = <Splitter.Splitter>Controls.BaseControl.createIn(Splitter.Splitter, this._layout.find(".body-section"),
            { cssClass: "splitted-section", fixedSide: "right", vertical: false });
        this._splitter.leftPane.append(this._master);
        this._splitter.rightPane.append(this._details);
        this._configureSplitter();

        // Tool bar section
        this._leftToolbar = <ResultsControls.LeftToolbar>Controls.BaseControl.createIn(ResultsControls.LeftToolbar, this._master.find(".left-toolbar-section"));
        this._leftToolbar.onExecuteCommand = delegate(this, this._handleCommand);

        this._setRefreshButtonVisibility();

        this._groupBy = <ResultsControls.GroupBy>Controls.BaseControl.createIn(ResultsControls.GroupBy, this._master.find(".groupby-section"));
        this._disposalManager.addDisposable(this._groupBy.groupByOption.subscribe((option: string) => {
            this._resultsDetail.handlePivotChanged(option, Common.Filters.GroupBy);
        }));
        this._updateGroupByFilterVisibility();

        if (!LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled()) {
            this._filterBy = <ResultsControls.FilterBy>Controls.BaseControl.createIn(ResultsControls.FilterBy, this._master.find(".filters-section"));
            this._disposalManager.addDisposable(this._filterBy.filterByOption.subscribe((option: string) => {
                this._resultsDetail.handlePivotChanged(option, Common.Filters.Outcome);
            }));
        }

        this._rightToolbar = <ResultsControls.RightToolbar>Controls.BaseControl.createIn(ResultsControls.RightToolbar, this._master.find(".right-toolbar-section"), {
            onExecuteCommand: delegate(this, this._handleCommand)
        });

        // Bottom section //
        this._bodySection = this._layout.find(".body-section");

        // No test results info image area
        this._noResultsImageArea = this._layout.find(".no-test-results-image-area");
        let $noTestResultsInfoElement: JQuery = this._getNoTestResultsInfoElement();
        this._noResultsImageArea.append($noTestResultsInfoElement);
        this._getNoResultsImageSection().hide();

        // Test results detail section
        this._resultsDetail = new ResultsDetail.ResultsDetailView({
            container: this._bodySection,
            target: this._options.target,
            viewModel: (<TestTabViewModel>this._viewModel).getResultsDetailViewModel(),
            toolbar: this._rightToolbar
        });

        this._resultsDetail.handleIndexChanged = delegate(this, this._handleIndexChanged);

        // Message area section for result list
        this._resultListMessageArea = <MessageArea.MessageAreaView>Controls.BaseControl.createIn(MessageArea.MessageAreaView, this._bodySection.find(".no-test-message-area"), {
            viewModel: this._viewModel.getResultListMessageAreaViewModel(),
            closeable: false
        });

        <MessageArea.MessageAreaView>Controls.BaseControl.createIn(MessageArea.MessageAreaView, this._bodySection.find(".filter-message-area"), {
            viewModel: this._viewModel.getResultFilterMessageViewModel(),
            closeable: false
        });

        if (LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled()) {
            this._getResultsSection().css("top", "70px"); // Default top + Filter message area
        }

        // Sections that will be shown in Build & Release Summary Test tab
        if (this._options.target === Common.TargetPage.Build_Summary_Test_Tab ||
            (this._options.target === Common.TargetPage.Release_Summary_Test_Tab && LicenseAndFeatureFlagUtils.isTrendChartFeatureForRMEnabled())) {

            this._fullscreen = <ResultsControls.FullScreenToggle>Controls.BaseControl.createIn(ResultsControls.FullScreenToggle, this._layout.find(".full-screen-toggle"));
            this._fullscreen.fullScreenDelegate = delegate(this, this._handleFullScreen);

            // Trend section.
            Controls.Control.enhance(TrendCharts.TrendCharts, this._layout.find(this.testResultsTrendChartsClass), {
                viewModel: (<TestTabViewModel>this._viewModel).getTrendChartsViewModel()
            });
        }

        this._testResultsPart.hide();

        Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TestResultsInBuild_NoResultDetails);
    }

    // Show Trend Set Charts only when Completed Runs are there. Not to show for aborted Runs
    private _setTrendSetCharts() {
        let trendResults = this._layout.find(this.testResultsTrendChartsClass);
        let summaryChartViewModel = this._viewModel.getSummaryChartsViewModel();
        this._disposalManager.addDisposable(ko.computed(() => {
                if (summaryChartViewModel.totalTests() > 0 && !summaryChartViewModel.shouldShowInProgressView()) {
                    trendResults.show();
                } else {
                    trendResults.hide();
                }
            }
        ));
    }

    // Update GroupByFilter Items
    private _updateGroupByFilterVisibility() {
        let summaryChartViewModel = this._viewModel.getSummaryChartsViewModel();
        this._disposalManager.addDisposable(summaryChartViewModel.shouldShowInProgressView.subscribe(() => {
            if (summaryChartViewModel.shouldShowInProgressView()) {
                this._groupBy.hideElement();
            }
            else {
                this._groupBy.showElement();
            }
        }));
    }

    /// <summary>
    /// configures the splitter
    /// </summary>
    private _configureSplitter(): void {
        this._splitter.split();
    }

    /// <summary>
    /// delegates the command from toolbar to results sections
    /// </summary>
    private _handleCommand(command: string): void {
        switch (command) {
            case Common.TestResultDetailsCommands.ToggleDetailsPane:
                this._toggleDetailsPane();
                break;
            case Common.TestResultDetailsCommands.Refresh:
                let resultsDetailViewModel = this._viewModel.getResultsDetailViewModel();
                let summaryChartViewModel = this._viewModel.getSummaryChartsViewModel();
                resultsDetailViewModel.reload();
                summaryChartViewModel.loadData();
                break;
            default:
                this._resultsDetail.handleCommand(command);
        }
    }

    private _handleIndexChanged(selectedItem: ResultListVM.IGridItem): void {
        if (selectedItem) {
            this._leftToolbar.updateStateOfCreateBugAndLinkButton(!selectedItem.isTestCaseItem);
        } else {
            this._leftToolbar.updateStateOfCreateBugAndLinkButton(true);
        }
    }

    private _setRefreshButtonVisibility() {
        if (this._leftToolbar) {
            let summaryChartViewModel = this._viewModel.getSummaryChartsViewModel();
            this._disposalManager.addDisposable(summaryChartViewModel.shouldShowInProgressView.subscribe(() => {
                this._leftToolbar.showRefreshButton(summaryChartViewModel.shouldShowInProgressView());
            }));
        }
    }

    // Toggle splitter state and save it in the user setting to be used later
    private _toggleDetailsPane() {
        this._splitState = !this._splitState;
        this._splitter.toggleExpanded(this._splitState);
        this._rightToolbar.setSplitterExpandedState(this._splitState);
        TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_DetailsPaneToggleClicked, TelemetryService.eventClicked, this._splitState);

        let userSettings = ViewSettings.TestReportViewSettings.getInstance().getViewSettings();
        userSettings.toggleState = (this._splitState) ? true : false;
        ViewSettings.UpdateUserSettings.updateUserSpecificSettings(this._viewContext, userSettings);
    }

    /// <summary>
    /// delegates full screen toggle command to parent host
    /// </summary>
    private _handleFullScreen(isFullScreen: boolean): void {
        if (this._onFullScreenToggle) {
            this._onFullScreenToggle(isFullScreen);
            if (isFullScreen) {
                TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_FullScreenClicked, TelemetryService.eventClicked, 1);
            }
        }
    }

    private _getResultsSection(): JQuery {
        return this._layout.find(".results-section");
    }

    private _getResultsDetailsSection(): JQuery {
        return this._layout.find(".test-result-details-section");
    }

    private _getNoResultsImageSection(): JQuery {
        return this._layout.find(".no-test-results-image-area");
    }

    private _setResultListMessageArea(): void {
        let resultListMessageAreaViewModel = this._viewModel.getResultListMessageAreaViewModel();

        this._disposalManager.addDisposable(resultListMessageAreaViewModel.logInfo.subscribe(() => {
            this._getResultsSection().hide();
            this._getResultsDetailsSection().hide();
            this._getNoResultsImageSection().hide();
        }));

        this._disposalManager.addDisposable(resultListMessageAreaViewModel.logError.subscribe(() => {
            this._getResultsSection().hide();
            this._getResultsDetailsSection().hide();
            this._getNoResultsImageSection().hide();
        }));

        this._disposalManager.addDisposable(resultListMessageAreaViewModel.logInfoJQuery.subscribe(() => {
            this._getResultsSection().hide();
            this._getResultsDetailsSection().hide();
            this._getNoResultsImageSection().hide();
        }));

        let summaryChartViewModel = this._viewModel.getSummaryChartsViewModel();
        let resultsDetailViewModel = this._viewModel.getResultsDetailViewModel();

        this._disposalManager.addDisposable(summaryChartViewModel.totalFailures.subscribe((failedTests: number) => {
            Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_FullyLoadedView);
        }));

        this._disposalManager.addDisposable(resultsDetailViewModel.noTestResultsForTheFilters.subscribe((noTestResults: boolean) => {
            // If there is no test results, we show info that the filters have no test results associated
            if (noTestResults) {
                if (!LicenseAndFeatureFlagUtils.isTestResultsFilterInCICDEnabled()) {
                    resultListMessageAreaViewModel.logInfo(Resources.NoTestsForSelectedFiltersMessageText);
                } else {
                    resultListMessageAreaViewModel.clear();
                    this._getResultsSection().hide();
                    this._getResultsDetailsSection().hide();
                    this._getNoResultsImageSection().show();
                }

                Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultsInBuild_FullyLoadedView);

            } else {
                resultListMessageAreaViewModel.clear();
                this._getNoResultsImageSection().hide();
                this._getResultsSection().show();
                this._getResultsDetailsSection().show();
            }
        }));

        this._disposalManager.addDisposable(resultsDetailViewModel.fetchingData.subscribe((fetching: boolean) => {
            // We want to show loading if the data is loading
            if (fetching) {
                resultListMessageAreaViewModel.logInfo(Resources.LoadingMessage);
            } else {
                if (!resultsDetailViewModel.noTestResultsForTheFilters()) {
                    resultListMessageAreaViewModel.clear();
                }
            }
        }));
    }

    /// <summary>
    /// Returns a div element which shows image and info message when no results are found fulfilling filter values.
    /// </summary>
    private _getNoTestResultsInfoElement(): JQuery {
        let TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let resourceFileName = TfsContext.configuration.getResourcesFile("no-results-image.png");

        let $noResultsDiv: JQuery = $("<div />").addClass("no-results-div");

        let $noResultsImage: JQuery = $("<img />")
            .attr("src", resourceFileName)
            .addClass("no-results-image")
            .appendTo($noResultsDiv);

        let $noResultsMessage = $("<div />")
            .text(Resources.NoResultsMessage)
            .addClass("no-results-message")
            .appendTo($noResultsDiv);

        let $noResultsSuggestionMessage = $("<div />")
            .text(Resources.NoResultsSuggestionMessage)
            .addClass("no-results-suggestion")
            .appendTo($noResultsDiv);

        return $noResultsDiv;
    }

    private _master: JQuery;
    private _details: JQuery;
    private static _splitterMinWidth: number = 800;
    private _resultListMessageArea: MessageArea.MessageAreaView;
    private _noResultsImageArea: JQuery;
    private _fullscreen: ResultsControls.FullScreenToggle;
    private _summaryCharts: ResultsSummaryCharts.SummaryCharts;
    private _leftToolbar: ResultsControls.LeftToolbar;
    private _rightToolbar: ResultsControls.RightToolbar;
    private _columnOptionsDialog: ResultsControls.ColumnOptionsDialog;
    private _resultsDetail: ResultsDetail.ResultsDetailView;
    private _bodySection: JQuery;
    private _groupBy: ResultsControls.GroupBy;
    private _filterBy: ResultsControls.FilterBy;
    private _splitter: Splitter.Splitter;
    private _splitState: boolean = true;
    private _viewContext: CommonBase.ViewContext;
    private _onFullScreenToggle: (flag: boolean) => void;
    private _viewModel: TestTabViewModel;
    private _messageArea: MessageArea.MessageAreaView;
}

/// <summary>
/// Base/common view model functionality
/// </summary>
export class ContributionBaseViewModel extends Adapters_Knockout.TemplateViewModel implements IContributionViewModel {

    constructor(viewModel: ViewModel.ResultsViewModel) {
        super();
    }

    /// <summary>
    /// returns message area view model
    /// </summary>
    public getMessageAreaViewModel(): MessageArea.MessageAreaViewModel {
        if (!this._messageAreaViewModel) {
            this._messageAreaViewModel = new MessageArea.MessageAreaViewModel();
        }
        return this._messageAreaViewModel;
    }

    /// <summary>
    /// returns summary charts view model
    /// </summary>
    public getSummaryChartsViewModel(): ResultsSummaryCharts.SummaryChartViewModel {
        throw new Error("[ContributionBaseViewModel.getSummaryChartsViewModel]: this method must be defined in the child class");
    }

    protected _resultsViewModel: ViewModel.ResultsViewModel;
    protected _messageAreaViewModel: MessageArea.MessageAreaViewModel;
    protected _summaryChartViewModel: ResultsSummaryCharts.SummaryChartViewModel;
}

/// <summary>
/// view model for test tab
/// </summary>
export class TestTabViewModel extends ContributionBaseViewModel {

    constructor(viewModel: ViewModel.ResultsViewModel) {
        super(viewModel);
        this._resultsViewModel = viewModel;
    }

    /// <summary>
    /// returns summary charts view model
    /// </summary>
    public getSummaryChartsViewModel(): ResultsSummaryCharts.SummaryChartViewModel {
        if (!this._summaryChartViewModel) {
            this._summaryChartViewModel = new ResultsSummaryCharts.SummaryChartViewModel(this.getMessageAreaViewModel(), this._resultsViewModel, Common.TargetPage.Build_Summary_Test_Tab);
        }
        return this._summaryChartViewModel;
    }

    /// <summary>
    /// returns results detail view model
    /// </summary>
    public getResultsDetailViewModel(): ResultListVM.ResultListViewModel {
        if (!this._resultsDetailViewModel) {
            this._resultsDetailViewModel = new ResultListVM.ResultListViewModel(this.getResultListMessageAreaViewModel(), this.getResultFilterMessageViewModel(), this._resultsViewModel);
        }
        return this._resultsDetailViewModel;
    }

    public getResultListMessageAreaViewModel(): MessageArea.MessageAreaViewModel {
        if (!this._resultListMessageAreaViewModel) {
            this._resultListMessageAreaViewModel = new MessageArea.MessageAreaViewModel();
        }
        return this._resultListMessageAreaViewModel;
    }

    public getResultFilterMessageViewModel(): MessageArea.MessageAreaViewModel {
        if (!this._resultFilterMessageAreaViewModel) {
            this._resultFilterMessageAreaViewModel = new MessageArea.MessageAreaViewModel();
        }
        return this._resultFilterMessageAreaViewModel;
    }

    public getTrendChartsViewModel(): TrendCharts.TrendChartViewModel {
        if (!this._trendChartsViewModel) {
            this._trendChartsViewModel = new TrendCharts.TrendChartViewModel(this._resultsViewModel);
        }
        return this._trendChartsViewModel;
    }

    private _resultsDetailViewModel: ResultListVM.ResultListViewModel;
    private _resultFilterMessageAreaViewModel: MessageArea.MessageAreaViewModel;
    private _resultListMessageAreaViewModel: MessageArea.MessageAreaViewModel;
    private _trendChartsViewModel: TrendCharts.TrendChartViewModel;
}

/// <summary>
/// Summary section in build summary tab view model
/// </summary>
export class SummaryViewModel extends ContributionBaseViewModel {

    constructor(viewModel: ViewModel.ResultsViewModel) {
        super(viewModel);
        this._resultsViewModel = viewModel;
    }

    /// <summary>
    /// returns summary charts view model
    /// </summary>
    public getSummaryChartsViewModel(): ResultsSummaryCharts.SummaryChartViewModel {
        if (!this._summaryChartViewModel) {
            this._summaryChartViewModel = new ResultsSummaryCharts.SummaryChartViewModel(this.getMessageAreaViewModel(), this._resultsViewModel, Common.TargetPage.Build_Summary_Default_Tab);
        }
        return this._summaryChartViewModel;
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestTabExtension/Extension.Views", exports);
