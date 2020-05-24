/// <reference types="knockout" />

import ko = require("knockout");
import * as q from "q";

import Charting_Contracts = require("Charting/Scripts/Contracts");
import PieControls = require("Charting/Scripts/Controls/PieChart");
import ChartCore = require("Charts/Contracts");
import Context = require("Build/Scripts/Context");


import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import { DataProvider, TIAEnabledDefinitionsDataProvider } from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import TCMLicenseAndFeatureFlagUtils = require("TestManagement/Scripts/Utils/TFS.TestManagement.LicenseAndFeatureFlagUtils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TcmUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");
import ViewModel = require("TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel");
import { PieChart } from "TestManagement/Scripts/TestReporting/Charts/ChartFactory";
import { ServiceManager as TMServiceManager } from "TestManagement/Scripts/TFS.TestManagement.Service";
import BuildContracts = require("TFS/Build/Contracts");
import RMContracts_LAZY_LOAD = require("ReleaseManagement/Core/Contracts");
import ReleaseHelper_LAZY_LOAD = require("TestManagement/Scripts/Utils/TFS.TestManagement.ReleaseStatusHelper");
import RMUtils_LAZY_LOAD = require("ReleaseManagement/Core/Utils");
import TCMContracts = require("TFS/TestManagement/Contracts");
import * as TIAContracts from "TFS/TestImpact/Contracts";

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Performance = require("VSS/Performance");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import StatusIndicator = require("VSS/Controls/StatusIndicator");

import domElement = Utils_UI.domElem;
let TelemetryService = TCMTelemetry.TelemetryService;
let LicenseAndFeatureFlagUtils = TCMLicenseAndFeatureFlagUtils.LicenseAndFeatureFlagUtils;

export interface ISummaryChartsOptions {
    target: Common.TargetPage;
    viewModel: SummaryChartViewModel;
}

/// <summary>
/// Test results summary charts section control for TestResults extension page
/// </summary>
export class SummaryCharts extends Controls.Control<ISummaryChartsOptions> {

    constructor(options: ISummaryChartsOptions) {
        super(options);
        this._viewModel = options.viewModel;
    }

    public initialize() {
        super.initialize();
        this._load();
        this._showHideIncrementValue();
        this._setSummaryChartsBindings();
    }

    /// <summary>
    /// Disposes the disposalManager
    /// </summary>
    public dispose(): void {
        this._disposalManager.dispose();
        super.dispose();
    }

    private _load(): void {
        const layout = $(
            `<div>
            <span class='completed-runs-charts' data-bind="visible : shouldShowCompletedRunsCharts"></span>
            <span class='in-progress-runs-chart' data-bind="visible : shouldShowInProgressView"></span>
            <span class='aborted-runs-separator' data-bind="visible : shouldShowSeparator"></span>
            <span class='aborted-runs-summary' data-bind="visible: shouldShowAbortedRuns"></span>
            </div>`
        ).appendTo(this._element);

        if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled()) {
            $(`<div class='build-status-text'>
            <span class='tests-running' data-bind="visible : shouldShowInProgressView"></span>
            <span class='tests-in-progress-text' data-bind="visible : shouldShowInProgressView"></span>
            </div>`).prependTo(layout);
        }

        let completedRunsChartRootNode = layout.find(".completed-runs-charts");

        $(`<div class='build-status-text'>
            <span class='completed-runs-text'></span>
            </div>`).prependTo(completedRunsChartRootNode);

        let completedRunsStatus = layout.find(".completed-runs-text");
        completedRunsStatus.text(Resources.CompletedRunsText);

        let completedRunsChartRootNodeForInProgress = layout.find(".in-progress-runs-chart");

        if (LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled()) {
            let iconLoadingIndicator = layout.find(".tests-running");
            let statusIndicator = <StatusIndicator.StatusIndicator>Controls.Control.enhance(
                StatusIndicator.StatusIndicator,
                layout.find(".tests-running"),
                { imageClass: "status-progress" });
            statusIndicator.start();

            let testsInProgressStatus = layout.find(".tests-in-progress-text");
            testsInProgressStatus.text(Resources.TestsInProgressText);

            // Add list of charts to summary section
            Controls.Control.create<TotalTestsChart, SummaryChartViewModel>(TotalTestsChart,
                completedRunsChartRootNodeForInProgress,
                this._viewModel);
        }

        Controls.Control.create<TotalTestsChart, SummaryChartViewModel>(TotalTestsChart, completedRunsChartRootNode, this._viewModel);
        $("<div />").addClass("separator").appendTo(completedRunsChartRootNode);

        if (this._options.target === Common.TargetPage.Build_Summary_Default_Tab || this._options.target === Common.TargetPage.Build_Summary_Test_Tab) {
            Controls.Control.create<FailedTestsChart, SummaryChartViewModel>(FailedTestsChart, completedRunsChartRootNode, this._viewModel);
            $("<div />").addClass("separator").appendTo(completedRunsChartRootNode);
        }

        Controls.Control.create<PassPercentChart, SummaryChartViewModel>(PassPercentChart, completedRunsChartRootNode, this._viewModel);
        $("<div />").addClass("separator").appendTo(completedRunsChartRootNode);
        Controls.Control.create<RunDurationChart, SummaryChartViewModel>(RunDurationChart, completedRunsChartRootNode, this._viewModel);

        if (LicenseAndFeatureFlagUtils.isReportCustomizationFeatureEnabled()) {
            $("<div />").addClass("separator").appendTo(completedRunsChartRootNode);
            Controls.Control.create<NotReportedTestsChart, SummaryChartViewModel>(NotReportedTestsChart,
                completedRunsChartRootNode,
                this._viewModel);
        }

        if (LicenseAndFeatureFlagUtils.isAbortedRunsFeatureEnabled()) {
            let abortedRunsRootNode = layout.find(".aborted-runs-summary");

            $("<div />").addClass("separator").appendTo(layout.find(".aborted-runs-separator"));
            Controls.Control.create<AbortedRunsChart, SummaryChartViewModel>(AbortedRunsChart,
                abortedRunsRootNode,
                this._viewModel);
        }

        // set css for IE browser
        if (Utils_UI.BrowserCheckUtils.isIE()) {
            this._setCSSForCompletedCharts(completedRunsChartRootNode);
            this._setCSSForInProgressTotalCharts(completedRunsChartRootNodeForInProgress);
        }

        ko.applyBindings(this._viewModel, this._element[0]);
    }

    private _showHideIncrementValue(): void {
        if (this._options.target === Common.TargetPage.Release_Summary_Test_Tab || this._options.target === Common.TargetPage.Release_Summary_Default_Tab) {
            this.getElement().find(".increment-value").hide();
        }
    }

    // Set Summary charts bindings
    private _setSummaryChartsBindings() {
        this._disposalManager.addDisposable(ko.computed(() => {
            let abortedRuns = this._viewModel.abortedRuns();
            let totalTests = this._viewModel.totalTests();

            // set bindings for separator
            if (abortedRuns > 0 && totalTests > 0) {
                this._viewModel.shouldShowSeparator(true);
            } else {
                this._viewModel.shouldShowSeparator(false);
            }

            // set bindings for Completed Runs Charts
            if (this._viewModel.shouldShowInProgressView()) {
                this._viewModel.shouldShowCompletedRunsCharts(false);
            } else {
                if (totalTests > 0) {
                    this._viewModel.shouldShowCompletedRunsCharts(true);
                } else {
                    this._viewModel.shouldShowCompletedRunsCharts(false);
                }
            }

            // set bindings for aborted runs charts
            if (abortedRuns > 0) {
                this._viewModel.shouldShowAbortedRuns(true);
            } else {
                this._viewModel.shouldShowAbortedRuns(false);
            }
        }));
    }

    // Set Css for completed Charts
    // TODO TASK 1153909: Remove this when Highcharts version is upgraded.
    private _setCSSForCompletedCharts(layout: JQuery) {
        this._disposalManager.addDisposable(ko.computed(() => {
            if (this._viewModel.shouldShowInProgressView()) {
                layout.attr("style", "display: none");
            } else {
                if (this._viewModel.totalTests() <= 0) {
                    layout.attr("style", "display: none");
                } else {
                    layout.attr("style", "display: block");
                }
            }
        }));
    }

    private _setCSSForInProgressTotalCharts(layout: JQuery) {
        this._disposalManager.addDisposable(ko.computed(() => {
            if (this._viewModel.shouldShowInProgressView()) {
                layout.attr("style", "display: block");
            } else {
                layout.attr("style", "display: none");
            }
        }));
    }

    private _viewModel: SummaryChartViewModel;
    protected _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
}

export class BaseSummaryChart extends Controls.Control<ViewModel.IResultsViewModel> {

    public initialize() {
        super.initialize();
        this._createBaseView();
        this._initializeSubscriptions();
    }

    public initializeOptions(viewModel: ViewModel.IResultsViewModel) {
        super.initializeOptions(viewModel);
        this._viewModel = viewModel;
    }

    public dispose() {
        if (this._differenceSubscription) {
            this._differenceSubscription.dispose();
        }

        super.dispose();
    }

    protected _getDifferenceObservable(): KnockoutObservable<IDifference> {
        throw new Error("_getDifferenceObservable method must be overridden in the derived classes");
    }

    private _initializeSubscriptions() {
        let differenceObservable = this._getDifferenceObservable();
        this._differenceSubscription = differenceObservable.subscribe((newValue: IDifference) => {
            this._applyFormattingBasedOnDifferenceType(newValue.diffType);
        });
    }

    private _applyFormattingBasedOnDifferenceType(diffType: DifferenceType) {
        let $mainValue = this._content.find(".increment-value");
        if (diffType === DifferenceType.Worsened) {
            $mainValue.addClass("fail-indicator").removeClass("pass-indicator");
        } else if (diffType === DifferenceType.Improved) {
            $mainValue.addClass("pass-indicator").removeClass("fail-indicator");
        } else {
            $mainValue.removeClass("pass-indicator").removeClass("fail-indicator");
        }
    }

    private _createBaseView(): void {
        this._heading = $("<div class='chart-heading' />");
        this._content = $(domElement("div"))
            .addClass("chart-content");
        this._element.append(this._heading).append(this._content);
    }

    protected _heading: JQuery;
    protected _content: JQuery;
    protected _viewModel: ViewModel.IResultsViewModel;

    private _differenceSubscription: KnockoutSubscription<IDifference>;
}

export class PieChartContainer extends BaseSummaryChart {

    protected _createOrUpdateCharts(data: Charting_Contracts.PieChartDataPoint[], showLegend: boolean) {
        if (!this._resultChart) {
            this._resultChart = Controls.Control.create<PieControls.PieChart, Charting_Contracts.PieChartOptions>(
                PieControls.PieChart,
                this._content.find(".chart-surface"),
                this._getPieChartOptions(data));

            if (showLegend) {
                this._legend = Controls.Control.create<PieLegend, PieLegendOptions>(
                    PieLegend,
                    this._content.find(".legend-surface"),
                    {
                        data: data
                    }
                );
            }
        } else {
            this._updateCharts(data);
        }
    }

    protected _showCharts() {
        if (this._resultChart) {
            this._resultChart.showElement();
        }

        if (this._legend) {
            this._legend.showElement();
        }
    }

    protected _hideCharts() {
        if (this._resultChart) {
            this._resultChart.hideElement();
        }

        if (this._legend) {
            this._legend.hideElement();
        }
    }

    private _updateCharts(data: Charting_Contracts.PieChartDataPoint[]) {
        if (this._resultChart) {
            this._resultChart.update(data);
        }

        if (this._legend) {
            this._legend.updateData(data);
        }
    }

    private _getPieChartOptions(data: Charting_Contracts.PieChartDataPoint[]): Charting_Contracts.PieChartOptions {
        return {
            height: 75,
            width: 75,
            tooltipOptions: {
                enabled: false,
            },
            spacing: [0, 0, 0, 0],
            margin: [0, 0, 0, 0],
            data: data,
            innerSizePercentage: "65%",
            enableHover: false,
            dataLabelOptions: {
                enabled: false
            }
        };
    }

    private _resultChart: PieControls.PieChart;
    private _legend: PieLegend;
}

export class TotalTestsChart extends PieChartContainer {

    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "total-tests-chart chart"
        }, options));
    }

    public dispose() {
        super.dispose();
        if (this._totalTestsSubscription) {
            this._totalTestsSubscription.dispose();
            this._totalTestsSubscription = null;
        }
    }

    public getChartData(): Charting_Contracts.PieChartDataPoint[] {
        return this._data;
    }

    protected _getDifferenceObservable(): KnockoutObservable<IDifference> {
        return (<SummaryChartViewModel>this._viewModel).totalTestsDifference;
    }

    /// <summary>
    /// create the view for the control
    /// </summary>
    private _createView(): void {
        this._heading.text(Resources.TotalTestsHeading);

        this._content.append($("<div class='chart-surface' />"));

        let valueSurface = $("<div class='value-surface' />");
        $("<div class='main-value' data-bind='text: totalTests' />").appendTo(valueSurface);
        $("<div class='increment-value' data-bind='text: totalTestsDifference().value' />").appendTo(valueSurface);

        this._content.append(valueSurface);

        this._content.append($("<div class='legend-surface' />"));

        ko.applyBindings(this._viewModel, this._content[0]);

        let totalTestsViewModel = <SummaryChartViewModel>this._viewModel;
        this._totalTestsSubscription = totalTestsViewModel.totalTests.subscribe((newValue: number) => {
            //I don't know why this is called multiple times
            this.renderChart(totalTestsViewModel, newValue);
        });
    }

    private renderChart(totalTestsViewModel: SummaryChartViewModel, newValue: number): void {
        this._data = this._getPieChartData(totalTestsViewModel);

        this.renderPieChart(totalTestsViewModel);
        this.renderPieLegend(this._data);
    }

    private _applyFormattingBasedOnValue(value: number) {
        let $mainValue = this._content.find(".main-value");
        if (value > 0) {
            $mainValue.addClass("fail-indicator").removeClass("pass-indicator");
        } else {
            $mainValue.addClass("pass-indicator").removeClass("fail-indicator");
        }
    }

    private _getPieChartData(viewModel: SummaryChartViewModel): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];
        let otherTests: number = viewModel.totalTests() - (viewModel.totalPassed() + viewModel.totalFailures());
        let passedOnRerunText: string = Resources.TestResultsFilterByOutcomePassedOnRerun + " (" + viewModel.passedOnRerun().toString()
            + "/" + viewModel.totalPassed().toString() + ")";

        if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy()) {
            otherTests = otherTests - viewModel.totalNonImpactedTests();
        }

        pieChartData.push({
            name: Resources.PassedText,
            value: viewModel.totalPassed(),
            color: Common.TestReportColorPalette.Passed
        });

        if (LicenseAndFeatureFlagUtils.isNewOutcomeFiltersForRerunEnabled() && viewModel.passedOnRerun() > 0) {
            pieChartData.push({
                name: passedOnRerunText,
                value: 0
            });
        }

        pieChartData.push({
            name: Resources.FailedText,
            value: viewModel.totalFailures(),
            color: Common.TestReportColorPalette.Failed
        });

        if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy() && viewModel.totalNonImpactedTests() > 0) {
            pieChartData.push({
                name: Resources.NotImpactedLegendText,
                value: viewModel.totalNonImpactedTests(),
                color: Common.TestReportColorPalette.NotImpacted
            });
        }

        pieChartData.push({
            name: Resources.OthersText,
            value: otherTests,
            color: Common.TestReportColorPalette.OtherOutcome
        });

        return pieChartData;
    }

    private renderPieLegend(pieChartData: Charting_Contracts.PieChartDataPoint[]) {
        let container = this._content.find(".legend-surface");
        container.empty();

        Controls.Control.create<PieLegend, PieLegendOptions>(
            PieLegend,
            container,
            {
                data: pieChartData
            }
        );
    }

    private renderPieChart(viewModel: SummaryChartViewModel) {
        let series = <ChartCore.DataSeries>{
            name: Resources.TotalTestsHeading,
            data: <ChartCore.Datum[]>[]
        };
        let otherTests: number = viewModel.totalTests() - (viewModel.totalPassed() + viewModel.totalFailures());

        if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy()) {
            otherTests = otherTests - viewModel.totalNonImpactedTests();
        }

        series.data.push(<ChartCore.Datum>{
            name: Resources.PassedText,
            y: viewModel.totalPassed(),
            color: Common.TestReportColorPalette.Passed
        });

        series.data.push(<ChartCore.Datum>{
            name: Resources.FailedText,
            y: viewModel.totalFailures(),
            color: Common.TestReportColorPalette.Failed
        });

        if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy() && viewModel.totalNonImpactedTests() > 0) {
            series.data.push(<ChartCore.Datum>{
                name: Resources.NotImpactedLegendText,
                y: viewModel.totalNonImpactedTests(),
                color: Common.TestReportColorPalette.NotImpacted
            });
        }

        series.data.push(<ChartCore.Datum>{
            name: Resources.OthersText,
            y: otherTests,
            color: Common.TestReportColorPalette.OtherOutcome
        });

        let container = this._content.find(".chart-surface");
        container.empty();

        PieChart.create(container, series);
    }

    private _totalTestsSubscription: IDisposable;
    private _data: Charting_Contracts.PieChartDataPoint[];
}

class FailedTestsChart extends PieChartContainer {

    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "failed-tests-chart chart"
        }, options));
    }

    public dispose() {
        super.dispose();
        if (this._failedTestSubscription) {
            this._failedTestSubscription.dispose();
            this._failedTestSubscription = null;
        }
    }

    protected _getDifferenceObservable(): KnockoutObservable<IDifference> {
        return (<SummaryChartViewModel>this._viewModel).totalFailuresDifference;
    }

    /// <summary>
    /// create the view for the control
    /// </summary>
    private _createView(): void {
        this._heading.text(Resources.FailedTestsHeading);

        this._content.append($("<div class='chart-surface' />"));

        let valueSurface = $("<div class='value-surface' />");
        $("<div class='main-value' data-bind='text: totalFailures' />").appendTo(valueSurface);
        $("<div class='increment-value' data-bind='text: totalFailuresDifference().value' />").appendTo(valueSurface);

        this._content.append(valueSurface);

        this._content.append($("<div class='legend-surface' />"));

        ko.applyBindings(this._viewModel, this._content[0]);

        let failedTestsViewModel = <SummaryChartViewModel>this._viewModel;
        this._failedTestSubscription = failedTestsViewModel.totalFailures.subscribe((newValue: number) => {
            this.renderChart(failedTestsViewModel, newValue);
        });
    }

    private renderChart(failedTestsViewModel: SummaryChartViewModel, newValue: number): void {
        this.renderPieChart(failedTestsViewModel);
        this.renderPieLegend(failedTestsViewModel);
    }

    private _applyFormattingBasedOnValue(value: number) {
        let $mainValue = this._content.find(".main-value");
        if (value > 0) {
            $mainValue.addClass("fail-indicator").removeClass("pass-indicator");
        } else {
            $mainValue.addClass("pass-indicator").removeClass("fail-indicator");
        }
    }

    private _getPieChartData(viewModel: SummaryChartViewModel): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];

        pieChartData.push({
            name: Resources.NewFailuresLegendText,
            value: viewModel.newFailures(),
            color: Common.TestReportColorPalette.Failed
        });

        pieChartData.push({
            name: Resources.ExistingFailuresLegendText,
            value: viewModel.existingFailures(),
            color: Common.TestReportColorPalette.ExisitingFailures
        });

        return pieChartData;
    }

    private renderPieLegend(viewModel: SummaryChartViewModel) {
        let container = this._content.find(".legend-surface");
        container.empty();

        Controls.Control.create<PieLegend, PieLegendOptions>(
            PieLegend,
            container,
            {
                data: this._getPieChartData(viewModel)
            }
        );
    }

    private renderPieChart(viewModel: SummaryChartViewModel) {
        let series = <ChartCore.DataSeries>{
            name: Resources.FailedTestsHeading,
            data: <ChartCore.Datum[]>[]
        };

        series.data.push(<ChartCore.Datum>{
            name: Resources.NewFailuresLegendText,
            y: viewModel.newFailures(),
            color: Common.TestReportColorPalette.Failed
        });

        series.data.push(<ChartCore.Datum>{
            name: Resources.ExistingFailuresLegendText,
            y: viewModel.existingFailures(),
            color: Common.TestReportColorPalette.ExisitingFailures
        });

        let container = this._content.find(".chart-surface");
        container.empty();

        PieChart.create(container, series);
    }

    private _failedTestSubscription: IDisposable;
}

class PassPercentChart extends BaseSummaryChart {

    // #region public method section                      
    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "pass-percent-chart chart"
        }, options));
    }

    protected _getDifferenceObservable(): KnockoutObservable<IDifference> {
        return (<SummaryChartViewModel>this._viewModel).passPercentageDifference;
    }

    /// <summary>
    /// create the view for the control
    /// </summary>
    private _createView(): void {
        this._heading.text(Resources.PassPercentHeading);

        let valueSurface = $("<div class='value-surface' />");
        $("<div class='main-value' data-bind='text: passPercentageText' />").appendTo(valueSurface);
        if (LicenseAndFeatureFlagUtils.isTIAUIEnabledInBuildSummaryAndGroupBy()) {
            $("<!-- ko if: totalNonImpactedTests() === 0 --> <div class='increment-value' data-bind='text: passPercentageDifference().value'/> <!-- /ko -->").appendTo(valueSurface);
        }
        else {
            $("<div class='increment-value' data-bind='text: passPercentageDifference().value' />").appendTo(valueSurface);
        }

        this._content.append(valueSurface);

        ko.applyBindings(this._viewModel, this._content[0]);
    }
}

class RunDurationChart extends BaseSummaryChart {

    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "run-duration-chart chart"
        }, options));
    }

    protected _getDifferenceObservable(): KnockoutObservable<IDifference> {
        return (<SummaryChartViewModel>this._viewModel).totalDurationDifference;
    }

    /// <summary>
    /// create the view for the control
    /// </summary>
    private _createView(): void {
        this._heading.text(Resources.RunDurationHeading);

        let valueSurface = $("<div class='value-surface' />");
        $("<div class='main-value' data-bind='text: runDuration' />").appendTo(valueSurface);
        $("<div class='increment-value' data-bind='text: totalDurationDifference().value' />").appendTo(valueSurface);

        this._content.append(valueSurface);

        ko.applyBindings(this._viewModel, this._content[0]);
    }
}

export class AbortedRunsChart extends BaseSummaryChart {

    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "aborted-runs-chart chart"
        }, options));
    }

    protected _getDifferenceObservable(): KnockoutObservable<IDifference> {
        return (<SummaryChartViewModel>this._viewModel).abortedRunsDifference;
    }

    /// <summary>
    /// create the view for the control
    /// </summary>
    private _createView(): void {
        let abortedRunIcon = $("<div class='icon bowtie-icon bowtie-status-stop'/>");
        abortedRunIcon.addClass("aborted-runs-icon");

        this._heading.text(Resources.AbortedRunsHeading);
        this._heading.prepend(abortedRunIcon);

        let valueSurface = $("<div class='value-surface' />");
        valueSurface.prepend(abortedRunIcon);

        $("<span class='main-value' data-bind='text: abortedRuns' />").appendTo(valueSurface);
        this._content.append(valueSurface);

        ko.applyBindings(this._viewModel, this._content[0]);
    }
}

export class NotReportedTestsChart extends BaseSummaryChart {

    public initialize() {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "not-reported-chart chart"
        }, options));
    }

    protected _getDifferenceObservable(): KnockoutObservable<IDifference> {
        return (<SummaryChartViewModel>this._viewModel).notReportedTestsDifference;
    }

    /// <summary>
    /// create the view for the control
    /// </summary>
    private _createView(): void {
        this._heading.text(Resources.NotReportedHeading);

        let valueSurface = $("<div class='value-surface' />");
        $("<div class='main-value' data-bind='text: notReportedTests' />").appendTo(valueSurface);
        $("<div class='increment-value' data-bind='text: notReportedTestsDifference().value' />").appendTo(valueSurface);

        this._content.append(valueSurface);

        ko.applyBindings(this._viewModel, this._content[0]);
    }
}

export enum DifferenceType {
    Improved,
    Worsened,
    Unchanged
}

export interface IDifference {
    value: string;
    diffType: DifferenceType;
}

export class SummaryChartViewModel implements ViewModel.IResultsViewModel {

    constructor(messageViewModel: MessageArea.MessageAreaViewModel, viewModelList: ViewModel.ResultsViewModel, target: Common.TargetPage) {
        viewModelList.add(this);
        this._messageViewModel = messageViewModel;

        let defaultDifference = {
            value: Resources.TestResultsDeltaValueNotApplicable,
            diffType: DifferenceType.Unchanged
        };

        let nullDifference = {
            value: Utils_String.empty,
            diffType: DifferenceType.Unchanged
        };

        this.totalTestsDifference(defaultDifference);
        this.totalFailuresDifference(defaultDifference);
        this.passPercentageDifference(defaultDifference);
        this.totalDurationDifference(defaultDifference);
        this.notReportedTestsDifference(nullDifference);
        this.abortedRunsDifference(nullDifference);
        this._targetPage = target;
    }

    public totalTests: KnockoutObservable<number> = ko.observable(0);
    public notReportedTests: KnockoutObservable<number> = ko.observable(0);
    public newFailures: KnockoutObservable<number> = ko.observable(0);
    public existingFailures: KnockoutObservable<number> = ko.observable(0);
    public totalFailures: KnockoutObservable<number> = ko.observable(0);
    public totalPassed: KnockoutObservable<number> = ko.observable(0);
    public passedOnRerun: KnockoutObservable<number> = ko.observable(0);
    public passPercentageText: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public passPercentage: KnockoutObservable<number> = ko.observable(0);
    public runDuration: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public totalTestsDifference: KnockoutObservable<IDifference> = ko.observable(null);
    public notReportedTestsDifference: KnockoutObservable<IDifference> = ko.observable(null);
    public totalFailuresDifference: KnockoutObservable<IDifference> = ko.observable(null);
    public passPercentageDifference: KnockoutObservable<IDifference> = ko.observable(null);
    public totalDurationDifference: KnockoutObservable<IDifference> = ko.observable(null);
    public abortedRunsDifference: KnockoutObservable<IDifference> = ko.observable(null);
    public hideRunsUnavailableMessage: KnockoutObservable<boolean> = ko.observable(false);
    public noImpactedTestsAvailable: KnockoutObservable<boolean> = ko.observable(false);
    public showEnableTestImpactAnalysisMessage: KnockoutObservable<boolean> = ko.observable(false);
    public buildDefinitionIsXaml: KnockoutObservable<boolean> = ko.observable(true);
    public totalNonImpactedTests: KnockoutObservable<number> = ko.observable(0);
    public testRunsUnavailableMessage: string = Resources.BuildDetailsSummaryNoTestRuns;
    public enableAutomationMessage = Resources.EnableAutomatedTests;
    public noImpactedTestsMessage = Resources.NoImpactedTestsText;
    public abortedRuns: KnockoutObservable<number> = ko.observable(0);
    public shouldShowAbortedRuns: KnockoutObservable<boolean> = ko.observable(false);
    public shouldShowSeparator: KnockoutObservable<boolean> = ko.observable(false);
    public shouldShowCompletedRunsCharts: KnockoutObservable<boolean> = ko.observable(false);
    public shouldShowInProgressView: KnockoutObservable<boolean> = ko.observable(false);
    public inProgressRuns: KnockoutObservable<number> = ko.observable(0);

    public load(viewContextdata: Common.IViewContextData): void {
        this._storeContextData(viewContextdata);
        this.loadData();
    }

    public loadData() {
        let testQueryParam: DataProviderCommon.ITestsQueryParameters;

        this._messageViewModel.logInfo(Resources.TestReportFetchInProgressText);
        testQueryParam = DataProvider.getTestQueryParameter(this._viewContextData.viewContext, this._viewContextData.data);

        if (this._viewContextData.viewContext === CommonBase.ViewContext.Build) {
            this._currentDefinitionId = testQueryParam.viewContextData.mainData.definition.id;
            this.buildDefinitionIsXaml(testQueryParam.viewContextData.mainData.definition.type === BuildContracts.DefinitionType.Xaml);
        }

        this.setInProgressSummaryBinding(this._viewContextData, testQueryParam).then(() => {
            Performance.getScenarioManager().split(TcmUtils.TRAPerfScenarios.TestResultsInBuild_BeginFetchSummaryData);

            this._fetchData(this._viewContextData, testQueryParam);
        }).then(undefined, (reason: any) => {
            Diag.logError(Utils_String.format("Failed to Set InProgress Bindings or Fetching Data for Summary. Error: {0}", (reason)));
        });
    }

    public handleOnDisplayed(): void {
        // Do nothing...
    }

    public showAddTestTaskDialog() {
        //Adding telemetry point
        TelemetryService.publishEvent(TelemetryService.featureAddTestTaskLinkInBuildSummaryClicked, TelemetryService.eventClicked, 1);
        Context.viewContext.showAddTaskDialog(this._currentDefinitionId, "Test");
    }

    public onEnterPressed(data, event): boolean {
        if (event.keyCode === Utils_UI.KeyCode.ENTER) {
            $(event.target).click();
            return false;
        }

        return true;
    }

    private getAggregatedTotalTests(resultsByOutcome: { [key: number]: TCMContracts.AggregatedResultsByOutcome }): number {

        let retVal: number = 0;

        if (resultsByOutcome) {

            for (let key in resultsByOutcome) {
                retVal += resultsByOutcome[key].count;
            }
        }

        return retVal;
    }

    private setInProgressSummaryBinding(viewContext: Common.IViewContextData, testQueryParam: DataProviderCommon.ITestsQueryParameters): IPromise<void> {
        if (!LicenseAndFeatureFlagUtils.isInProgressFeatureEnabled()) {
            return new Promise<void>((resolve, reject) => {
                resolve();
            });
        }

        return new Promise<void>((resolve, reject) => {
            if (viewContext.viewContext === CommonBase.ViewContext.Build) {
                let build = testQueryParam.viewContextData.mainData;

                if (build.status === BuildContracts.BuildStatus.InProgress) {
                    this.shouldShowInProgressView(true);
                } else if (build.status === BuildContracts.BuildStatus.Completed) {
                    this.shouldShowInProgressView(false);
                }
                resolve();
            } else if (viewContext.viewContext === CommonBase.ViewContext.Release) {
                let release = testQueryParam.viewContextData.mainData;
                let filters = testQueryParam.viewContextData.subData;
                let selectedEnvironment = (filters && filters.environment) ? filters.environment : null;

                if (!selectedEnvironment || selectedEnvironment.id === 0) {
                    this.setInProgressBindingOnReleaseStatus(release).then(() => {
                        resolve();
                    }, (reason) => {
                        reject(reason);
                    });
                }
                else {
                    this.setInProgressBindingOnReleaseEnvironmentStatus(selectedEnvironment).then(() => {
                        resolve();
                    }, (reason) => {
                        reject(reason);
                    });
                }
            }
        });
    }

    private setInProgressBindingOnReleaseEnvironmentStatus(selectedEnvironment: any): IPromise<void> {
        return new Promise<void>((resolve, reject) => {
            VSS.using(["ReleaseManagement/Core/Contracts", "ReleaseManagement/Core/Utils"], (RMContracts: typeof RMContracts_LAZY_LOAD, RMUtils: typeof RMUtils_LAZY_LOAD) => {
                if (selectedEnvironment.status === RMContracts.EnvironmentStatus.InProgress) {
                    this.shouldShowInProgressView(true);
                }
                else if (RMUtils.ReleaseEnvironmentStatusHelper.isEnvironmentCompleted(selectedEnvironment)) {
                    this.shouldShowInProgressView(false);
                }
                resolve();
            }, () => { reject("Failed to load release scripts"); });
        });
    }

    private setInProgressBindingOnReleaseStatus(release: any): IPromise<void> {
        return new Promise<void>((resolve, reject) => {
            VSS.using(["TestManagement/Scripts/Utils/TFS.TestManagement.ReleaseStatusHelper"],
                (ReleaseHelper: typeof ReleaseHelper_LAZY_LOAD) => {
                    this.shouldShowInProgressView(ReleaseHelper.ReleaseStatusHelper.getComputedReleaseStatus(release) === ReleaseHelper.ComputedReleaseStatus.InProgress);
                    resolve();
                },
                () => {
                    reject("Failed to load release scripts");
                }
            );
        });
    }

    public update(testReport: TCMContracts.TestResultSummary): void {
        Diag.logVerbose("[TotalTestsViewModel.update]: method called");
        let testFailures: Common.ITestFailureData;
        let percent: number;

        if (testReport) {
            if (testReport.aggregatedResultsAnalysis) {

                //Set the default values for charts. This is to ensure that chart gets updated with default values even if they are not updated below.
                this._initializeDefaultValues();

                this.totalTests(this.getAggregatedTotalTests(testReport.aggregatedResultsAnalysis.resultsByOutcome));

                this.notReportedTests(this.getAggregatedTotalTests(testReport.aggregatedResultsAnalysis.notReportedResultsByOutcome));

                // This needs to be raised even when the value has not changes as the subscribers are dependent on the value.
                this.totalTests.valueHasMutated();

                // Updating Aborted Runs
                if (testReport.aggregatedResultsAnalysis.runSummaryByState && testReport.aggregatedResultsAnalysis.runSummaryByState[TCMContracts.TestRunState.Aborted]) {
                    this.abortedRuns(testReport.aggregatedResultsAnalysis.runSummaryByState[TCMContracts.TestRunState.Aborted].runsCount);
                }
                else {
                    this.abortedRuns(0);
                }

                this.abortedRuns.valueHasMutated();

                // Updating InProgress Runs
                if (testReport.aggregatedResultsAnalysis.runSummaryByState && testReport.aggregatedResultsAnalysis.runSummaryByState[TCMContracts.TestRunState.InProgress]) {
                    this.inProgressRuns(testReport.aggregatedResultsAnalysis.runSummaryByState[TCMContracts.TestRunState.InProgress].runsCount);
                }
                else {
                    this.inProgressRuns(0);
                }

                this.inProgressRuns.valueHasMutated();

                if (testReport.aggregatedResultsAnalysis.resultsByOutcome && testReport.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.Failed]) {
                    this.totalFailures(testReport.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.Failed].count);
                }
                // This is defined for newer builds and undefined older builds (older builds are those which are created before we started calculating run summary and insights for runs of build. This can be 'XAML' or 'VNext' build)
                if (testReport.testFailures) {
                    testFailures = CommonUtils.TestReportDataParser.parseFailureData(testReport.testFailures);
                    this.newFailures(testFailures.newFailures);
                    this.existingFailures(testFailures.existingFailures);
                } else {
                    this.existingFailures(this.totalFailures());
                }

                this.totalFailures.valueHasMutated(); // This can be removed after we start showing passed results

                this.runDuration(CommonUtils.TestReportDataParser.parseDuration(testReport.aggregatedResultsAnalysis.duration));

                if (testReport.aggregatedResultsAnalysis.resultsByOutcome && testReport.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.Passed]) {
                    this.totalPassed(testReport.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.Passed].count);
                    if (testReport.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.Passed].rerunResultCount) {
                        this.passedOnRerun(testReport.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.Passed].rerunResultCount);
                    }
                }

                if (testReport.aggregatedResultsAnalysis.resultsByOutcome && testReport.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.NotImpacted]) {
                    this.totalNonImpactedTests(testReport.aggregatedResultsAnalysis.resultsByOutcome[TCMContracts.TestOutcome.NotImpacted].count);
                }
                else {
                    this.totalNonImpactedTests(0);
                }
                this.totalNonImpactedTests.valueHasMutated();

                this.totalTests.valueHasMutated();

                if (!LicenseAndFeatureFlagUtils.isSummaryEnabledForAllNotImpactedTests()) {
                    if (testReport.aggregatedResultsAnalysis.totalTests === 0 && this.totalNonImpactedTests() !== 0) {
                        this.noImpactedTestsAvailable(true);
                        this._messageViewModel.logInfo(this.noImpactedTestsMessage);
                    }
                }

                // This is defined for newer builds and undefined older builds (older builds are those which are created before we started calculating run summary and insights for runs of build. This can be 'Xaml' or 'VNext' build)
                if (testReport.aggregatedResultsAnalysis.resultsDifference) {

                    let totalIncrease: number = testReport.aggregatedResultsAnalysis.resultsDifference.increaseInOtherTests +
                        testReport.aggregatedResultsAnalysis.resultsDifference.increaseInFailures +
                        testReport.aggregatedResultsAnalysis.resultsDifference.increaseInPassedTests;

                    this.totalTestsDifference(this._getDifference(totalIncrease, true));
                    this.totalFailuresDifference(this._getDifference(testReport.aggregatedResultsAnalysis.resultsDifference.increaseInFailures, false));
                    this.totalDurationDifference(this._getDurationDifference(testReport.aggregatedResultsAnalysis.resultsDifference.increaseInDuration));
                }

                if (testReport.aggregatedResultsAnalysis.totalTests) {
                    this.passPercentage(((this.totalPassed()) / (testReport.aggregatedResultsAnalysis.totalTests)) * 100);
                    this.passPercentageText(Utils_String.format("{0}%", (this.passPercentage() === Math.round(this.passPercentage())) ? this.passPercentage() : CommonUtils.TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(this.passPercentage(), 2)));

                    if (testFailures) {
                        this.passPercentageDifference(this._getPassPercentageDifference(this.passPercentage(), testReport.aggregatedResultsAnalysis, testFailures));
                    }
                }
            }
        }
    }

    private _storeContextData(viewContextdata: Common.IViewContextData) {
        this._viewContextData = viewContextdata;
    }

    private _updateSummaryForInProgress(testResultDetails: TCMContracts.TestResultsDetails): void {
        Diag.logVerbose("[TotalTestsViewModel.update]: method called");
        var testFailures: Common.ITestFailureData;
        var percent: number;

        if (testResultDetails && testResultDetails.resultsForGroup && testResultDetails.resultsForGroup.length > 0) {
            //Set the default values for charts. This is to ensure that chart gets updated with default values even if they are not updated below.
            this._initializeDefaultValues();
            let totalTests = 0;
            let abortedRuns = 0;
            let passedTests = 0;
            let FailedTests = 0;
            let notImpactedTests = 0;
            let inProgressRuns = 0;

            for (let resultForGroup of testResultDetails.resultsForGroup) {
                totalTests += this.getAggregatedTotalTests(resultForGroup.resultsCountByOutcome);

                if (resultForGroup.groupByValue.state) {
                    if (ValueMap.TestRunState.getStateToEnum(resultForGroup.groupByValue.state) === ValueMap.TestRunState.Aborted) {
                        abortedRuns++;
                    } else if (ValueMap.TestRunState.getStateToEnum(resultForGroup.groupByValue.state) === ValueMap.TestRunState.InProgress) {
                        inProgressRuns++;
                    }
                }

                if (resultForGroup.resultsCountByOutcome && resultForGroup.resultsCountByOutcome[TCMContracts.TestOutcome.Passed]) {
                    passedTests += resultForGroup.resultsCountByOutcome[TCMContracts.TestOutcome.Passed].count;
                }

                if (resultForGroup.resultsCountByOutcome && resultForGroup.resultsCountByOutcome[TCMContracts.TestOutcome.Failed]) {
                    FailedTests += resultForGroup.resultsCountByOutcome[TCMContracts.TestOutcome.Failed].count;
                }

                if (resultForGroup.resultsCountByOutcome && resultForGroup.resultsCountByOutcome[TCMContracts.TestOutcome.NotImpacted]) {
                    notImpactedTests += resultForGroup.resultsCountByOutcome[TCMContracts.TestOutcome.NotImpacted].count;
                }
            }

            // Updating Total Tests
            this.totalTests(totalTests);
            this.totalTests.valueHasMutated();

            // Updating Aborted Runs
            this.abortedRuns(abortedRuns);
            this.abortedRuns.valueHasMutated();

            // Updating InProgress Runs
            this.inProgressRuns(inProgressRuns);
            this.inProgressRuns.valueHasMutated();

            // Updating Total Fail
            this.totalFailures(FailedTests);
            this.totalFailures.valueHasMutated();

            // Updating Total Passed Tests
            this.totalPassed(passedTests);
            this.totalPassed.valueHasMutated();

            // Updating Total Impacted Tests
            this.totalNonImpactedTests(notImpactedTests);
            this.totalNonImpactedTests.valueHasMutated();

            this.totalTests.valueHasMutated();
        }
    }

    public _getPassPercentageDifference(currentPassPercent: number, aggregatedResults: TCMContracts.AggregatedResultsAnalysis, failureData: Common.ITestFailureData): IDifference {

        let prevTotalTests = aggregatedResults.totalTests - aggregatedResults.resultsDifference.increaseInTotalTests;
        let prevPassedTests = this.totalPassed() - aggregatedResults.resultsDifference.increaseInPassedTests;

        let prevPassPercentage: number = 0;
        if (prevTotalTests !== 0) {
            prevPassPercentage = (prevPassedTests / prevTotalTests) * 100;
        }

        let differenceInPassPercentage = (currentPassPercent - prevPassPercentage);
        return this._getDifference(differenceInPassPercentage, true, (val: number) => {
            return (val === Math.round(val)) ? val.toString() : CommonUtils.TestReportDataParser.getCustomizedDecimalValueInCurrentLocale(val, 1);
        }, "%");
    }

    private _initializeDefaultValues() {
        let defaultDifference = {
            value: Resources.TestResultsDeltaValueNotApplicable,
            diffType: DifferenceType.Unchanged
        };

        this.totalTestsDifference(defaultDifference);
        this.totalFailuresDifference(defaultDifference);
        this.totalDurationDifference(defaultDifference);
        this.passPercentageDifference(defaultDifference);

        this.newFailures(0);
        this.existingFailures(0);
        this.totalPassed(0);
        this.passedOnRerun(0);
    }

    private _getDurationDifference(durationDifference: string): IDifference {

        let difference: IDifference;
        if (CommonUtils.TestReportDataParser.isZeroDuration(durationDifference)) {
            difference = {
                value: Utils_String.localeFormat("(+{0})", 0),
                diffType: DifferenceType.Unchanged
            };
        } else if (Utils_String.startsWith(durationDifference, "-")) {
            difference = {
                value: Utils_String.localeFormat("(-{0})", CommonUtils.TestReportDataParser.parseDuration(durationDifference)),
                diffType: DifferenceType.Improved
            };
        } else {
            difference = {
                value: Utils_String.localeFormat("(+{0})", CommonUtils.TestReportDataParser.parseDuration(durationDifference)),
                diffType: DifferenceType.Worsened
            };
        }

        return difference;
    }

    private _getDifference(differenceValue: number,
        increaseInValueIndicatesImprovement: boolean,
        stringConverter?: (val: number) => string,
        stringToAppend?: string): IDifference {

        let difference: IDifference;
        if (!stringToAppend) {
            stringToAppend = Utils_String.empty;
        }

        if (!stringConverter) {
            stringConverter = (val: number) => {
                return val.toString();
            };
        }

        if (differenceValue < 0) {
            difference = {
                value: Utils_String.localeFormat("({0}{1})", stringConverter(differenceValue), stringToAppend),
                diffType: increaseInValueIndicatesImprovement ? DifferenceType.Worsened : DifferenceType.Improved
            };
        } else if (differenceValue > 0) {
            difference = {
                value: Utils_String.localeFormat("(+{0}{1})", stringConverter(differenceValue), stringToAppend),
                diffType: increaseInValueIndicatesImprovement ? DifferenceType.Improved : DifferenceType.Worsened
            };
        } else {
            difference = {
                value: Utils_String.localeFormat("(+{0}{1})", stringConverter(0), stringToAppend),
                diffType: DifferenceType.Unchanged
            };
        }

        return difference;
    }

    private _fetchData(viewContext: Common.IViewContextData, testQueryParam: DataProviderCommon.ITestsQueryParameters): void {
        if (this.shouldShowInProgressView()) {
            testQueryParam.includeResults = false;
            testQueryParam.isInProgress = true;
            testQueryParam.groupBy = Common.TestResultsGroupPivots.Group_By_Test_Run;
            DataProvider.getDataProvider(viewContext.viewContext).then((dataProvider) => {
                dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.TestResults)
                    .then((resultDetails: TCMContracts.TestResultsDetails) => {
                        Performance.getScenarioManager().split(TcmUtils.TRAPerfScenarios.TestResultsInBuild_EndFetchSummaryData);

                        this.hideRunsUnavailableMessage(true);
                        this._updateSummaryForInProgress(resultDetails);
                    },
                    (reason) => {
                        this.totalTests(0);
                        this._handleFetchDataError(reason);
                    });
            }, (error) => {
                Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
            });
        } else {
            DataProvider.getDataProvider(viewContext.viewContext).then((dataProvider) => {
                dataProvider.getViewContextData(testQueryParam, DataProviderCommon.DataType.TestReport)
                    .then((testReport: TCMContracts.TestResultSummary) => {

                        Performance.getScenarioManager().split(TcmUtils.TRAPerfScenarios.TestResultsInBuild_EndFetchSummaryData);

                        this.hideRunsUnavailableMessage(true);
                        this.update(testReport);

                        if (LicenseAndFeatureFlagUtils.isTIAMessageInBuildSummaryEnabled()) {
                            this.getEnableTIAMessage(testReport);
                        }

                        if (this._targetPage && this._targetPage === Common.TargetPage.Build_Summary_Test_Tab) {
                            //Telemetry Section to get total tests, passed tests, failed tests on Page Load in BuildSummary Page
                            Common.TelemetryWrapperService.publishEvents(viewContext.viewContext, TelemetryService.featureTestTab_TestTabPageLoad, {
                                [TelemetryService.totalTests]: this.totalTests(),
                                [TelemetryService.failedTests]: this.totalFailures(),
                                [TelemetryService.passedTests]: this.totalPassed()
                            });
                        }
                        Performance.getScenarioManager().endScenario(TcmUtils.TRAPerfScenarios.Area, TcmUtils.TRAPerfScenarios.TestResultsInBuild_NoResultDetails);
                    },
                    (reason) => {
                        this._handleFetchDataError(reason);
                    });
            }, (error) => {
                Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
            });
        }
    }

    private _handleFetchDataError(reason: any) {
        Diag.logWarning(Utils_String.format("[SummaryChartsViewModel.load]: No data available"));

        if (reason) {
            if (reason.errorCode === DataProviderCommon.DataProviderErrorCodes.ScenarioNotCompleted) {
                if (reason.info) {
                    this._messageViewModel.logInfo(reason.info);
                }
                Performance.getScenarioManager().abortScenario(TcmUtils.TRAPerfScenarios.Area, TcmUtils.TRAPerfScenarios.TestResultsInBuild_NoResultDetails);
                return;
            } else {
                let message = $("<span />").append(reason.info);
                if (reason.errorCode === DataProviderCommon.DataProviderErrorCodes.NoTestResultsInScenario) {

                    let currentDefinitionId = this._currentDefinitionId;
                    let showAddTestDialogWhenClicked = $(message).on("click", "a", () => {
                        //Adding telemetry point
                        TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_AddTestTaskLinkClicked, TelemetryService.eventClicked, 1);
                        Context.viewContext.showAddTaskDialog(currentDefinitionId, "Test");
                    });
                    this._messageViewModel.logInfoJQuery(showAddTestDialogWhenClicked);
                } else {
                    this._messageViewModel.logInfoJQuery(message);
                }
            }
        } else {
            this._messageViewModel.logError(Resources.BuildDetailSummaryCouldNotRetrieveTestRuns);
        }

        Performance.getScenarioManager().abortScenario(TcmUtils.TRAPerfScenarios.Area, TcmUtils.TRAPerfScenarios.TestResultsInBuild_NoResultDetails);
        Performance.getScenarioManager().abortScenario(TcmUtils.TRAPerfScenarios.Area, TcmUtils.TRAPerfScenarios.TestResultsInBuild_PopulateResultsInGrid);
    }

    public getEnableTIAMessage(testReport: TCMContracts.TestResultSummary): void {
        if (testReport) {
            if (testReport.aggregatedResultsAnalysis) {

                this.showEnableTestImpactAnalysisMessage(this._targetPage === Common.TargetPage.Build_Summary_Default_Tab &&
                    !this.buildDefinitionIsXaml() &&
                    CommonUtils.TestReportDataParser.getDurationInMinutes(testReport.aggregatedResultsAnalysis.duration) >= SummaryChartViewModel.maxRunDurationInMinutesForEnableTIAMessage);

                if (this._targetPage === Common.TargetPage.Build_Summary_Default_Tab) {

                    TIAEnabledDefinitionsDataProvider.isTIANotificationDismissed(this._currentDefinitionId).then(isDissmissed => {
                        if (isDissmissed) {
                            this.showEnableTestImpactAnalysisMessage(false);
                        }
                    });

                    TcmUtils.getTestImpactManager().beginGetTIAEnabledInfo(testReport.testResultsContext.build.id).then((tiaType) => {
                        if (TIAContracts.TypeInfo.BuildType.enumValues[tiaType] !== TIAContracts.BuildType.TestImpactOff) {
                            this.showEnableTestImpactAnalysisMessage(false);
                            this.dismissTIANotification();
                        }
                    }, (error) => {

                    });
                }

                this.showEnableTestImpactAnalysisMessage.valueHasMutated();
            }
        }
    }

    public enableTIAMessageClicked() {
        //Adding telemetry point
        TelemetryService.publishEvent(TelemetryService.featureEnableTIALinkClicked, TelemetryService.eventClicked, 1);
        TIAEnabledDefinitionsDataProvider.dismissEnableTIANotification(this._currentDefinitionId);
        window.open(
            "https://aka.ms/tialearnmore",
            "_blank"
        );
    }

    public dismissTIANotification() {
        TIAEnabledDefinitionsDataProvider.isTIANotificationDismissed(this._currentDefinitionId).then(isDissmissed => {
            if (!isDissmissed) {
                TIAEnabledDefinitionsDataProvider.dismissEnableTIANotification(this._currentDefinitionId);
            }
        }, (error) => {
            TIAEnabledDefinitionsDataProvider.dismissEnableTIANotification(this._currentDefinitionId);
        });
    }

    private _targetPage: Common.TargetPage;
    private _currentDefinitionId: number;
    private _messageViewModel: MessageArea.MessageAreaViewModel;
    private static maxRunDurationInMinutesForEnableTIAMessage = 10;
    private _viewContextData: Common.IViewContextData;
}

export interface PieLegendOptions {
    data: Charting_Contracts.PieChartDataPoint[];
}

//// The size at which the TRA summary charts are shown (75px x 75px), the 
// standard 'highchart' legends do not show properly. Therefore we are 
// creating a custom legend control 
export class PieLegend extends Controls.Control<PieLegendOptions> {

    public initialize() {
        this._createLegend(this._options.data);
    }

    public updateData(data: Charting_Contracts.PieChartDataPoint[]) {
        this.getElement().empty();
        this._createLegend(data);
    }

    private _createLegend(data: Charting_Contracts.PieChartDataPoint[]) {
        let legendContainer = $("<div />").addClass("legend-container");
        data.forEach((rowData: Charting_Contracts.PieChartDataPoint) => {
            this._appendLegendRow(rowData, legendContainer);
        });

        legendContainer.appendTo(this.getElement());
    }

    private _appendLegendRow(rowData: Charting_Contracts.PieChartDataPoint, container: JQuery) {
        if (rowData.name.indexOf(Resources.TestResultsFilterByOutcomePassedOnRerun) !== -1) {
            let legendRow = $("<div />").addClass("legend-row").addClass("passed-on-rerun-div").appendTo(container);

            $("<span />").addClass("legend-text").addClass("passed-on-rerun-text").text(rowData.name).appendTo(legendRow);
            $("<div />").appendTo(legendRow);
            return;
        }

        let legendRow = $("<div />").addClass("legend-row").appendTo(container);

        let $svg = this._getColorRectangles(rowData.color);
        $svg.appendTo(legendRow);

        $("<span />").addClass("legend-text").text(rowData.name).appendTo(legendRow);
        $("<span />").addClass("legend-value").text("(" + rowData.value.toString() + ")").appendTo(legendRow);
        $("<div />").appendTo(legendRow);
    }

    private _getColorRectangles(rectColor: string): JQuery {
        let $svg = $(document.createElementNS(Common.Namespaces.SVGNamespace, Common.SVGConstants.SVG)).attr("class", "color-rectangle-container");
        $svg.attr("width", "10");
        $svg.attr("height", "10");

        let $rect = $(document.createElementNS(Common.Namespaces.SVGNamespace, Common.SVGConstants.Rect)).attr("class", "color-rectangle").appendTo($svg);
        $rect.attr("fill", rectColor);
        $rect.attr("x", "0");
        $rect.attr("y", "0");
        $rect.attr("width", "8");
        $rect.attr("height", "8");
        $rect.attr("fill", rectColor);

        return $svg;
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestTabExtension/Summary", exports);
