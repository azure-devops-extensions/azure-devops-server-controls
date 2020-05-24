/// <reference types="knockout" />

import q = require("q");
import ko = require("knockout");

import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";
import * as DataProviderCommon from "TestManagement/Scripts/TestReporting/DataProviders/Common";
import { DataProvider } from "TestManagement/Scripts/TestReporting/Common/Extension.DataProvider";
import ChartsBase = require("TestManagement/Scripts/TestReporting/Charts/ChartBase");
import DetailedTrendDialog = require("TestManagement/Scripts/TestReporting/TestTabExtension/DetailedTrendDialog");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ViewModel = require("TestManagement/Scripts/TestReporting/TestTabExtension/ViewModel");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");

import BuildContracts = require("TFS/Build/Contracts");
import Contracts = require("TFS/TestManagement/Contracts");
import RMContracts = require("ReleaseManagement/Core/Contracts");

import Controls = require("VSS/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import HistogramControl = require("VSS/Controls/Histogram");
import * as Diag from "VSS/Diag";
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let TelemetryService = TCMTelemetry.TelemetryService;

export class TrendChartsOptions {
    public viewModel: TrendChartViewModel;
}

export class TrendCharts extends Controls.Control<TrendChartsOptions>{

    public initialize() {
        super.initialize();
        this._load();
    }

    private _load(): void {
        // Add list of charts to summary section
        Controls.Control.create<FailureTrendChart, TrendChartsOptions>(FailureTrendChart, this._element, this._options, { cssClass: "failure-trend left chart" });
        $("<div />").addClass("separator").appendTo(this._element);
        Controls.Control.create<DurationTrendChart, TrendChartsOptions>(DurationTrendChart, this._element, this._options, { cssClass: "duration-trend left chart" });
    }
}

export interface ITrendChart {
    getHeader(): string;
    getObservable(): KnockoutObservableArray<HistogramControl.HistogramBarData>;
    getChartConfigOptions(): ChartsBase.ChartConfigurationOptions;
    getChartView(): string;
    getChartType(): string;
}

export class TrendChartBase extends Controls.Control<TrendChartsOptions> implements ITrendChart {
    private readonly DialogChartUIDiv = ".ui-dialog-legacy.ui-dialog";

    public initializeOptions(options: TrendChartsOptions) {
        this._viewModel = options.viewModel;
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();

        $("<div class='chart-heading' />").text(this.getHeader()).appendTo(this.getElement());
        this._createHistogramControl();
    }

    public dispose() {
        super.dispose();
        this._disposalManager.dispose();
    }

    public getHeader(): string {
        throw new Error("_getObservable should be implemented in derived classes");
    }

    public getObservable(): KnockoutObservableArray<HistogramControl.HistogramBarData> {
        throw new Error("_getObservable should be implemented in derived classes");
    }
    
    public getChartConfigOptions(): ChartsBase.ChartConfigurationOptions {
        this._chartConfigOptions = <ChartsBase.ChartConfigurationOptions>{};
        this._chartConfigOptions.title = this.getHeader();
        this._chartConfigOptions.chartType = this.getChartType();

        let viewContextdata = this.getViewModel().getViewContextData();

        if (viewContextdata.viewContext === CommonBase.ViewContext.Build) {
            let build: BuildContracts.Build = viewContextdata.data.mainData;
            if (build && build.definition) {
                this._chartConfigOptions.buildDefinition = build.definition;
            }

            this._chartConfigOptions.context = Contracts.TestResultsContextType.Build;
        }
        else if (viewContextdata.viewContext === CommonBase.ViewContext.Release) {
            let release = viewContextdata.data.mainData;
            if (release) {
                let releaseDefinition: RMContracts.ReleaseDefinition = release.releaseDefinition;
                this._chartConfigOptions.releaseDefinition = releaseDefinition;
            }

            let selectedEnvironment = (viewContextdata.data.subData) ? viewContextdata.data.subData.environment as RMContracts.ReleaseEnvironment : null;
            if (selectedEnvironment) {
                this._chartConfigOptions.releaseEnvironment = this._getShallowObjectOfReleaseEnvironment(selectedEnvironment.definitionEnvironmentId, selectedEnvironment.name);
            }
            
            this._chartConfigOptions.context = Contracts.TestResultsContextType.Release;
        }

        return this._chartConfigOptions;
    }

    public getChartView(): string {
        throw new Error("_getChartView should be implemented in derived classes");
    }

    public getChartType(): string {
        throw new Error("_getChartType should be implemented in derived classes");
    }

    /*
        This is needed because there is limit of 4000 chars in widget settings and ReleaseEnvironment object crosses this limit. 
    */
    private _getShallowObjectOfReleaseEnvironment(releaseEnvironmentId: number, releaseEnvironmentName: string): RMContracts.ReleaseEnvironment {
        let releaseEnvironment;

        releaseEnvironment = {
            definitionEnvironmentId: releaseEnvironmentId, name: releaseEnvironmentName
        };

        return releaseEnvironment;
    }

    private _createHistogramControl() {
        let histogramOptions: HistogramControl.IHistogramOptions = {
            renderDefaultBars: true,
            barCount: Common.Constants.BuildTrendCount,
            barHeight: 55,
            allowInteraction: true,
            selectedState: "selected"
        };

        this._histogram = <HistogramControl.Histogram>Controls.BaseControl.createIn(HistogramControl.Histogram, this.getElement(),
            $.extend({
                cssClass: "trend-histogram definition-histogram"
            }, histogramOptions));

        this._histogram._element.attr("tabindex", "1");

        this._disposalManager.addDisposable(this.getObservable().subscribe((histogramData: HistogramControl.HistogramBarData[]) => {
            this._histogram.refresh(histogramData);
        }));

        // TODO: Task 487716: Enable keyboard accessibility for this. 
        this._histogram._bind(this._histogram.getElement(), "click keypress", (e) => {

            if (e && (e.which === Common.Constants.EnterKeyCode || e.type === "click")) {
                let chartView: string = this.getChartView();
                let chartConfigOptions = this.getChartConfigOptions();
                chartConfigOptions.width = 500;
                chartConfigOptions.height = 500;

                // Update the widget title before launching the dialog
                chartConfigOptions.title = Utils_String.format("{0}: {1}", this.getHeader(), this._getDataTitle());

                // Add margins for the dialog size.
                let dialog = Dialogs.Dialog.create(DetailedTrendDialog.DetailedChartsDialog, {
                    chartConfig: chartConfigOptions,
                    chartData: this._viewModel.getData(),
                    view: chartView,
                    title: chartConfigOptions.title,
                    width: chartConfigOptions.width + 40,
                    height: chartConfigOptions.height + 40
                });

                // Set overflow property of Dialog chart to "Visible" for Safari Browser to Show "AddToDashBoard" icon.
                this._setOverflowProperty(dialog);

                dialog.show();

                switch (chartView) {
                    case ChartsBase.ChartViews.FailureTrend:
                        TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_OpenFailureTrend, TelemetryService.eventClicked, 1);
                        break;
                    case ChartsBase.ChartViews.DurationTrend:
                        TelemetryService.publishEvent(TelemetryService.featureTestTabInBuildSummary_OpenDurationTrend, TelemetryService.eventClicked, 1);
                        break;
                    default:
                        throw new Error(Utils_String.format("[TrendChartBase._createHistogramControl]: Unsupported chart view: {0}", chartView));
                }
            }
        });
    }

    // Set overflow property of dialog chart for Safari Browser
    private _setOverflowProperty(dialogChart: DetailedTrendDialog.DetailedChartsDialog) {
        const isSafari = Utils_UI.BrowserCheckUtils.isSafari();

        // Only for Safari browser overflow needs to be set.
        if (isSafari) {
            const $dialogDivElement = dialogChart.getElement().closest(this.DialogChartUIDiv);
            $dialogDivElement.css("overflow", "visible");
        }
    }

    protected getViewModel(): TrendChartViewModel {
        return this._viewModel;
    }

    private _getDataTitle(): string {
        let dataTitle: string,
            viewContext: Common.IViewContextData;

        viewContext = this.getViewModel().getViewContextData();

        switch (viewContext.viewContext) {
            case CommonBase.ViewContext.Build:
                if (viewContext && viewContext.data) {
                    dataTitle = (<BuildContracts.Build>viewContext.data.mainData).definition.name;
                }
                break;
            case CommonBase.ViewContext.Release:
                if (viewContext && viewContext.data && viewContext.data.subData) {
                    let selectedEnvironment = (viewContext.data.subData) ? viewContext.data.subData.environment as RMContracts.ReleaseEnvironment : null;
                    if (selectedEnvironment && selectedEnvironment.name) {
                        dataTitle = selectedEnvironment.name;
                    }
                }
                else if (viewContext && viewContext.data && viewContext.data.mainData) {
                    let releaseData = viewContext.data.mainData;
                    if (releaseData.releaseDefinition) {
                        dataTitle = releaseData.releaseDefinition.name;
                    }
                }
                break;
            default:
                throw new Error("ViewContext - Release not supported yet");
        }

        return dataTitle;
    }

    protected _chartConfigOptions: ChartsBase.ChartConfigurationOptions;
    private _histogram: HistogramControl.Histogram;
    private _viewModel: TrendChartViewModel;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
}

export class FailureTrendChart extends TrendChartBase implements ITrendChart {

    public getHeader(): string {
        return Resources.TestFailuresTrendHeader;
    }

    public getObservable(): KnockoutObservableArray<HistogramControl.HistogramBarData> {
        return this.getViewModel().failureTrend;
    }

    public getChartConfigOptions(): ChartsBase.ChartConfigurationOptions {
        super.getChartConfigOptions();

        this._chartConfigOptions.yAxisOptions = {
            seriesType: ChartsBase.SeriesTypes.FailedTests
        };
        this._chartConfigOptions.secondaryYAxisOptions = {
            seriesType: ChartsBase.SeriesTypes.PassPercentage
        };

        return this._chartConfigOptions;
    }

    public getChartView(): string {
        TelemetryService.publishEvents(TelemetryService.featureTestTab_TrendChartViewed, {
            "ChartType": Resources.TestFailuresTrendHeader
        });
        return ChartsBase.ChartViews.FailureTrend;
    }

    public getChartType(): string {
        return ChartsBase.ChartTypes.ColumnLineCombo;
    }
}

export class DurationTrendChart extends TrendChartBase implements ITrendChart {
    
    public getHeader(): string {
        return Resources.TestDurationTrendHeader;
    }

    public getObservable(): KnockoutObservableArray<HistogramControl.HistogramBarData> {
        return this.getViewModel().durationTrend;
    }

    public getChartConfigOptions(): ChartsBase.ChartConfigurationOptions {
        super.getChartConfigOptions();

        this._chartConfigOptions.yAxisOptions = {
            seriesType: ChartsBase.SeriesTypes.Duration
        };
        this._chartConfigOptions.secondaryYAxisOptions = {
            seriesType: ChartsBase.SeriesTypes.TotalTests
        };

        return this._chartConfigOptions;
    }

    public getChartView(): string {
        TelemetryService.publishEvents(TelemetryService.featureTestTab_TrendChartViewed, {
            "ChartType": Resources.TestDurationTrendHeader
        });
        return ChartsBase.ChartViews.DurationTrend;
    }

    public getChartType(): string {
        return ChartsBase.ChartTypes.ColumnLineCombo;
    }
}

export class TrendChartViewModel implements ViewModel.IResultsViewModel {

    constructor(viewModel: ViewModel.ResultsViewModel) {
        viewModel.add(this);
    }

    public failureTrend: KnockoutObservableArray<HistogramControl.HistogramBarData> = ko.observableArray<HistogramControl.HistogramBarData>([]);
    public durationTrend: KnockoutObservableArray<HistogramControl.HistogramBarData> = ko.observableArray<HistogramControl.HistogramBarData>([]);

    public load(viewContextdata: Common.IViewContextData): void {
        let queryParameter = DataProvider.getTestQueryParameter(viewContextdata.viewContext, viewContextdata.data);

        this._viewContextdata = viewContextdata;

        if (viewContextdata.viewContext === CommonBase.ViewContext.Build) {
            DataProvider.getDataProvider(viewContextdata.viewContext).then((dataProvider) => {
                dataProvider.getViewContextData(queryParameter, DataProviderCommon.DataType.BuildResultsTrend)
                    .then(
                    (aggregateResultsForBuild: Contracts.AggregatedDataForResultTrend[]) => {
                        this._data = Utils_Array.clone(aggregateResultsForBuild);
                        this._data.reverse();
                        this._populateTrendData(viewContextdata, aggregateResultsForBuild, queryParameter.viewContextData.mainData.id);
                    },
                    (error) => {
                        // If there is an error while fetching trend data, we need to find a mechanism of showing it to the user.
                        Diag.logError(Utils_String.format("failed to get trend data for build workflow. Error: {0}", (error.message || error)));
                    });
            }, (error) => {
                Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
            });
        }
        else if (viewContextdata.viewContext === CommonBase.ViewContext.Release) {
            DataProvider.getDataProvider(viewContextdata.viewContext).then((dataProvider) => {
                dataProvider.getViewContextData(queryParameter, DataProviderCommon.DataType.ReleaseResultsTrend)
                    .then(
                    (aggregateResultsForRelease: Contracts.AggregatedDataForResultTrend[]) => {
                        this._data = Utils_Array.clone(aggregateResultsForRelease);
                        this._data.reverse();
                        this._populateTrendData(viewContextdata, aggregateResultsForRelease, queryParameter.viewContextData.mainData.id);
                    },
                    (error) => {
                        // If there is an error while fetching trend data, we need to find a mechanism of showing it to the user.
                        Diag.logError(Utils_String.format("failed to get trend data for release workflow. Error: {0}", (error.message || error)));
                    });
            }, (error) => {
                Diag.logError(Utils_String.format("failed to get data provider. Error: {0}", (error.message || error)));
            });
        }
    }

    public handleOnDisplayed(): void {
        // Do nothing...
    }

    public getData(): Contracts.AggregatedDataForResultTrend[] {
        return this._data;
    }

    public getViewContextData(): Common.IViewContextData {
        return this._viewContextdata;
    }

    private _populateTrendData(viewContextdata: Common.IViewContextData, aggregateResults: Contracts.AggregatedDataForResultTrend[], currentWorkflowDataId: number) {
        this.failureTrend(new FailureTrendDataConverter(viewContextdata, aggregateResults, currentWorkflowDataId).convert());
        this.durationTrend(new DurationTrendDataConverter(viewContextdata, aggregateResults, currentWorkflowDataId).convert());
    }

    private _viewContextdata: Common.IViewContextData;
    private _data: Contracts.AggregatedDataForResultTrend[] = [];
}

export class FailureTrendDataConverter {

    constructor(viewContextdata: Common.IViewContextData, aggregateResultsForSelectedWorkflow: Contracts.AggregatedDataForResultTrend[], currentWorkflowDataId: number) {
        this._aggregatedResultsForSelectedWorkflow = aggregateResultsForSelectedWorkflow;
        this._currentWorkflowDataId = currentWorkflowDataId;
        this._viewContextdata = viewContextdata;
    }

    public convert(): HistogramControl.HistogramBarData[] {
        let maxValue = 1;
        const FailedDataState: string = "failed";
        this._aggregatedResultsForSelectedWorkflow.forEach((result: Contracts.AggregatedDataForResultTrend) => {
            let count = this._getFailureCount(result);

            if (count > maxValue) {
                maxValue = count;
            }
        });

        let failureTrend: HistogramControl.HistogramBarData[] = [];

        if (this._viewContextdata.viewContext === CommonBase.ViewContext.Build) {
            this._aggregatedResultsForSelectedWorkflow.forEach((buildResult: Contracts.AggregatedDataForResultTrend) => {
                let data: HistogramControl.HistogramBarData = {};
                let count = this._getFailureCount(buildResult);
                data.value = Math.floor((count * 100) / maxValue);
                data.title = Utils_String.localeFormat(Resources.FailureCountTrendTooltip, count.toLocaleString(), buildResult.testResultsContext.build.number);
                data.state = FailedDataState;
                data.selected = buildResult.testResultsContext.build.id === this._currentWorkflowDataId;
                failureTrend.unshift(data);
            });
        }
        else if (this._viewContextdata.viewContext === CommonBase.ViewContext.Release) {
            this._aggregatedResultsForSelectedWorkflow.forEach((releaseResult: Contracts.AggregatedDataForResultTrend) => {
                let data: HistogramControl.HistogramBarData = {};
                let count = this._getFailureCount(releaseResult);
                data.value = Math.floor((count * 100) / maxValue);
                data.title = Utils_String.localeFormat(Resources.FailureCountTrendTooltip, count.toLocaleString(), releaseResult.testResultsContext.release.name);
                data.state = FailedDataState;
                data.selected = releaseResult.testResultsContext.release.id === this._currentWorkflowDataId; 
                failureTrend.unshift(data);
            });
        }
        

        return failureTrend;
    }

    private _getFailureCount(buildResult: Contracts.AggregatedDataForResultTrend): number {

        let failedRecord = buildResult.resultsByOutcome[Contracts.TestOutcome.Failed];
        let count = 0;
        if (failedRecord) {
            count = failedRecord.count;
        }

        return count;
    }

    private _aggregatedResultsForSelectedWorkflow: Contracts.AggregatedDataForResultTrend[];
    private _currentWorkflowDataId: number;
    private _viewContextdata: Common.IViewContextData;
}

export class DurationTrendDataConverter {

    constructor(viewContextdata: Common.IViewContextData, aggregateResultsForSelectedWorkflow: Contracts.AggregatedDataForResultTrend[], currentWorkflowDataId: number) {
        this._aggregatedResultsForSelectedWorkflow = aggregateResultsForSelectedWorkflow;
        this._currentWorkflowDataId = currentWorkflowDataId;
        this._viewContextdata = viewContextdata;
    }

    public convert(): HistogramControl.HistogramBarData[] {
        let maxValue = 1;
        const DurationDataState: string = "duration";
        if (this._viewContextdata.viewContext === CommonBase.ViewContext.Build) {
            let durationMap = this._aggregatedResultsForSelectedWorkflow.map((buildResult: Contracts.AggregatedDataForResultTrend) => {
                return {
                    durationInMs: CommonUtils.TestReportDataParser.getDurationInMilliseconds(buildResult.duration),
                    displayText: Utils_String.localeFormat(Resources.DurationTrendTooltip, CommonUtils.TestReportDataParser.parseDuration(buildResult.duration), buildResult.testResultsContext.build.number),
                    isCurrentBuild: buildResult.testResultsContext.build.id === this._currentWorkflowDataId
                };
            });

            durationMap.forEach((durationTuple) => {
                let duration = durationTuple.durationInMs;
                if (duration > maxValue) {
                    maxValue = duration;
                }
            });

            let durationTrend: HistogramControl.HistogramBarData[] = [];

            durationMap.forEach((durationTuple) => {
                let data: HistogramControl.HistogramBarData = {};
                let duration = durationTuple.durationInMs;
                data.value = Math.floor((duration * 100) / maxValue);
                data.title = durationTuple.displayText;
                data.state = DurationDataState;
                data.selected = durationTuple.isCurrentBuild;
                durationTrend.unshift(data);
            });

            return durationTrend;
        }
        else if (this._viewContextdata.viewContext === CommonBase.ViewContext.Release) {
            let durationMap = this._aggregatedResultsForSelectedWorkflow.map((buildResult: Contracts.AggregatedDataForResultTrend) => {
                return {
                    durationInMs: CommonUtils.TestReportDataParser.getDurationInMilliseconds(buildResult.duration),
                    displayText: Utils_String.localeFormat(Resources.DurationTrendTooltip, CommonUtils.TestReportDataParser.parseDuration(buildResult.duration), buildResult.testResultsContext.release.name),
                    isCurrentBuild: buildResult.testResultsContext.release.id === this._currentWorkflowDataId
                };
            });

            durationMap.forEach((durationTuple) => {
                let duration = durationTuple.durationInMs;
                if (duration > maxValue) {
                    maxValue = duration;
                }
            });

            let durationTrend: HistogramControl.HistogramBarData[] = [];

            durationMap.forEach((durationTuple) => {
                let data: HistogramControl.HistogramBarData = {};
                let duration = durationTuple.durationInMs;
                data.value = Math.floor((duration * 100) / maxValue);
                data.title = durationTuple.displayText;
                data.state = DurationDataState;
                data.selected = durationTuple.isCurrentBuild;
                durationTrend.unshift(data);
            });

            return durationTrend;
        }
    }

    private _aggregatedResultsForSelectedWorkflow: Contracts.AggregatedDataForResultTrend[];
    private _currentWorkflowDataId: number;
    private _viewContextdata: Common.IViewContextData;
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestTabExtension/TrendCharts", exports);
