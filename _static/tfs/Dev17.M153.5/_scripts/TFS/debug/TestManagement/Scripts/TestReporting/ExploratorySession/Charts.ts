/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

import ko = require("knockout");
import ksb = require("knockoutSecureBinding");
import ViewModel = require("TestManagement/Scripts/TestReporting/ExploratorySession/ViewModel");
import ManualUtils = require("TestManagement/Scripts/TestReporting/ExploratorySession/Utils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultSummary = require("TestManagement/Scripts/TestReporting/TestTabExtension/Summary");

import { PieChart } from "TestManagement/Scripts/TestReporting/Charts/ChartFactory";

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
import Charting_Contracts = require("Charting/Scripts/Contracts");
import ChartCore = require("Charts/Contracts");

let options = { attribute: "data-bind", globals: window, bindings: ko.bindingHandlers, noVirtualElements: false };
ko.bindingProvider.instance = new ksb(options);

export interface IExploratorySessionChartsOptions {
    viewModel: ViewModel.ExploratorySessionChartsViewModel;
}

export class ExploratorySessionCharts extends Controls.Control<IExploratorySessionChartsOptions>{
    private _viewModel: ViewModel.ExploratorySessionChartsViewModel;

    constructor(options: IExploratorySessionChartsOptions) {
        super(options);
        this._viewModel = options.viewModel;
    }

    public initialize() {
        super.initialize();
        this._load();
    }

    public dispose(): void {
        if (this._workItemExploredItemsChart) {
            this._workItemExploredItemsChart.dispose();
            this._workItemExploredItemsChart = null;
        }
        if (this._workItemFiledItemsChart) {
            this._workItemFiledItemsChart.dispose();
            this._workItemFiledItemsChart = null;
        }
        if (this._sessionOwnersChart) {
            this._sessionOwnersChart.dispose();
            this._sessionOwnersChart = null;
        }
        if (this._sessionDurationChart) {
            this._sessionDurationChart.dispose();
            this._sessionDurationChart = null;
        }

        super.dispose();
    }

    private _load() {
        // Add list of charts to summary section

        this._workItemUnExploredCountChart = Controls.Control.create<WorkItemUnExploredCountChart, ViewModel.ExploratorySessionChartsViewModel>(WorkItemUnExploredCountChart, this._element, this._viewModel);
        $("<div />").addClass("separator").appendTo(this._element);

        this._workItemExploredItemsChart = Controls.Control.create<WorkItemExploredItemsChart, ViewModel.ExploratorySessionChartsViewModel>(WorkItemExploredItemsChart, this._element, this._viewModel);
        $("<div />").addClass("separator").appendTo(this._element);

        this._workItemFiledItemsChart = Controls.Control.create<WorkItemFiledItemsChart, ViewModel.ExploratorySessionChartsViewModel>(WorkItemFiledItemsChart, this._element, this._viewModel);
        $("<div />").addClass("separator").appendTo(this._element);

        this._sessionOwnersChart = Controls.Control.create<SessionOwnersChart, ViewModel.ExploratorySessionChartsViewModel>(SessionOwnersChart, this._element, this._viewModel);
        $("<div />").addClass("separator").appendTo(this._element);

        this._sessionDurationChart = Controls.Control.create<SessionDurationChart, ViewModel.ExploratorySessionChartsViewModel>(SessionDurationChart, this._element, this._viewModel);
    }

    private _workItemUnExploredCountChart: WorkItemUnExploredCountChart;
    private _workItemExploredItemsChart: WorkItemExploredItemsChart;
    private _workItemFiledItemsChart: WorkItemFiledItemsChart;
    private _sessionOwnersChart: SessionOwnersChart;
    private _sessionDurationChart: SessionDurationChart;
}

export class WorkItemUnExploredCountChart extends ResultSummary.PieChartContainer {
    private _data: Charting_Contracts.PieChartDataPoint[];
    private _updateViewFlagSubscription: IDisposable;

    public initialize() {
        super.initialize();
        this._createView();
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "workitem-unexplore-chart chart"
        }, options));
    }

    public dispose(): void {
        $(".workitem-unexplore-chart").remove();
        if (this._updateViewFlagSubscription) {
            this._updateViewFlagSubscription.dispose();
            this._updateViewFlagSubscription = null;
        }
        super.dispose();
    }

    /**
     * Get pie chart data.
     *
     * @publicapi
     */
    public getChartData(): Charting_Contracts.PieChartDataPoint[] {
        return this._data;
    }

    // only used to inherit base class and doing nothing here
    protected _getDifferenceObservable(): KnockoutObservable<ResultSummary.IDifference> {
        let diffObject: KnockoutObservable<ResultSummary.IDifference> = ko.observable({ value: "temp", diffType: ResultSummary.DifferenceType.Improved });
        return diffObject;
    }

    private _createView() {
        Diag.logVerbose("[WorkItemUnExploredCountChart._createView]: WorkItemUnExploredCountChart creation started");

        this._heading.text(Resources.WorkItemUnExploredHeading);


        let totalChartSurface = $(
            `<div class='chart-surface' /> 
                <div class='value-surface'>
                    <div class='main-value' data-bind='text: totalCustomQueryWorkItemCount'></div>
                </div>
                <div class='legend-surface' />`);
        this._content.append(totalChartSurface);
        ko.applyBindings(this._viewModel, this._content[0]);

        let witExploredViewModel = <ViewModel.ExploratorySessionChartsViewModel>this._viewModel;
        this._updateViewFlagSubscription = witExploredViewModel.updateViewFlag.subscribe((newValue: boolean) => {
            if (witExploredViewModel.showUnExploredChart()) {
                $(".workitem-unexplore-chart").show();
                $($(".exploratory-sessions-summary-charts-section .separator")[0]).show();
                this._renderChart(witExploredViewModel);
            } else {
                $(".workitem-unexplore-chart").hide();
                $($(".exploratory-sessions-summary-charts-section .separator")[0]).hide();
            }
        });
    }

    private _renderChart(witExploredViewModel: ViewModel.ExploratorySessionChartsViewModel): void {
        this._renderPieChart(witExploredViewModel);
        this._renderPieLegend(witExploredViewModel);
    }

    private _getPieChartData(viewModel: ViewModel.ExploratorySessionChartsViewModel): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];

        pieChartData.push({
            name: Resources.ExploredText,
            value: viewModel.totalworkItemExplored(),
            color: ManualUtils.SessionReportColorPalette.getColorCode("explored")
        });
        pieChartData.push({
            name: Resources.UnexploredText,
            value: viewModel.unExploredWorkItemCount(),
            color: ManualUtils.SessionReportColorPalette.getColorCode("unexplored")
        });

        return pieChartData;
    }

    private _renderPieLegend(viewModel: ViewModel.ExploratorySessionChartsViewModel) {
        Diag.logVerbose("Rendering WorkItemUnExploredCountChart legend");

        let container = this._content.find(".legend-surface");
        container.empty();

        Controls.Control.create<ResultSummary.PieLegend, ResultSummary.PieLegendOptions>(
            ResultSummary.PieLegend,
            container,
            {
                data: this._getPieChartData(viewModel)
            }
        );
    }

    private _renderPieChart(viewModel: ViewModel.ExploratorySessionChartsViewModel) {
        Diag.logVerbose("Rendering WorkItemUnExploredCountChart");

        let series = <ChartCore.DataSeries>{
            name : Resources.WorkItemUnExploredHeading,
            data: <ChartCore.Datum[]>[]
        };

        series.data.push(<ChartCore.Datum>{
            name: Resources.ExploredText,
            y: viewModel.totalworkItemExplored(),
            color: ManualUtils.SessionReportColorPalette.getColorCode("explored")
        });
        series.data.push(<ChartCore.Datum>{
            name: Resources.UnexploredText,
            y: viewModel.unExploredWorkItemCount(),
            color: ManualUtils.SessionReportColorPalette.getColorCode("unexplored")
        });

        let container = this._content.find(".chart-surface");
        container.empty();

        PieChart.create(container, series);
    }
}

export class WorkItemExploredItemsChart extends ResultSummary.PieChartContainer {
    private _data: Charting_Contracts.PieChartDataPoint[];
    private _updateViewFlagSubscription: IDisposable;

    public initialize() {
        super.initialize();
        this._createView();
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "workitem-explore-chart chart"
        }, options));
    }

    public dispose(): void {
        $(".workitem-explore-chart").remove();
        if (this._updateViewFlagSubscription) {
            this._updateViewFlagSubscription.dispose();
            this._updateViewFlagSubscription = null;
        }
        super.dispose();
    }

    /**
     * Get pie chart data.
     *
     * @publicapi
     */
    public getChartData(): Charting_Contracts.PieChartDataPoint[] {
        return this._data;
    }

    // only used to inherit base class and doing nothing here
    protected _getDifferenceObservable(): KnockoutObservable<ResultSummary.IDifference> {
        let diffObject: KnockoutObservable<ResultSummary.IDifference> = ko.observable({ value: "temp", diffType: ResultSummary.DifferenceType.Improved });
        return diffObject;
    }

    private _createView() {
        Diag.logVerbose("[WorkItemExploredItemsChart._createView]: WorkItemExploredItemsChart creation started");

        this._heading.text(Resources.WorkItemExploredHeading);


        let totalChartSurface = $(
            `<div data-bind='visible: totalworkItemExplored()>0'>
                <div class='chart-surface' /> 
                <div class='value-surface'>
                    <div class='main-value' data-bind='text: totalworkItemExplored'></div>
                </div>
                <div class='legend-surface' />
             </div>
            <div class='zero-workitem' data-bind='visible: totalworkItemExplored() == 0 '>
                <div data-bind='text: noWorkItemExploredText'></div>
            </div>`);
        this._content.append(totalChartSurface);
        ko.applyBindings(this._viewModel, this._content[0]);

        let witExploredViewModel = <ViewModel.ExploratorySessionChartsViewModel>this._viewModel;
        this._updateViewFlagSubscription = witExploredViewModel.updateViewFlag.subscribe((newValue: boolean) => {
            if (witExploredViewModel.workItemExplored().length > 0) {
                this._renderChart(witExploredViewModel);
            }
        });
    }

    private _renderChart(witExploredViewModel: ViewModel.ExploratorySessionChartsViewModel): void {
        this._renderPieChart(witExploredViewModel);
        this._renderPieLegend(witExploredViewModel);
    }

    private _getPieChartData(viewModel: ViewModel.ExploratorySessionChartsViewModel): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];

        viewModel.workItemExplored().forEach((workItem) => {
            pieChartData.push({
                name: workItem.workItemType,
                value: workItem.count,
                color: ManualUtils.WorkItemMetaDataCache.getWorkItemColor(workItem.workItemType)
            });
        });

        return pieChartData;
    }

    private _renderPieLegend(viewModel: ViewModel.ExploratorySessionChartsViewModel) {
        Diag.logVerbose("Rendering WorkItemExploredItemsChart legend");

        let container = this._content.find(".legend-surface");
        container.empty();

        Controls.Control.create<ResultSummary.PieLegend, ResultSummary.PieLegendOptions>(
            ResultSummary.PieLegend,
            container,
            {
                data: this._getPieChartData(viewModel)
            }
        );
    }

    private _renderPieChart(viewModel: ViewModel.ExploratorySessionChartsViewModel) {
        Diag.logVerbose("Rendering WorkItemExploredItemsChart");

        let series = <ChartCore.DataSeries>{
            name : Resources.WorkItemExploredHeading,
            data: <ChartCore.Datum[]>[]
        };

        viewModel.workItemExplored().forEach((workItem) => {
            series.data.push(<ChartCore.Datum>{
                name: workItem.workItemType,
                y: workItem.count,
                color: ManualUtils.WorkItemMetaDataCache.getWorkItemColor(workItem.workItemType)
            });
        });

        let container = this._content.find(".chart-surface");
        container.empty();

        PieChart.create(container, series);
    }
}

export class WorkItemFiledItemsChart extends ResultSummary.PieChartContainer {
    private _data: Charting_Contracts.PieChartDataPoint[];
    private _updateViewFlagSubscription: IDisposable;

    public initialize() {
        super.initialize();
        this._createView();
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "workitem-filed-chart chart"
        }, options));
    }

    public dispose(): void {
        $(".workitem-filed-chart").remove();
        if (this._updateViewFlagSubscription) {
            this._updateViewFlagSubscription.dispose();
            this._updateViewFlagSubscription = null;
        }
        super.dispose();
    }

    /**
     * Get pie chart data.
     *
     * @publicapi
     */
    public getChartData(): Charting_Contracts.PieChartDataPoint[] {
        return this._data;
    }

    // only used to inherit base class and doing nothing here
    protected _getDifferenceObservable(): KnockoutObservable<ResultSummary.IDifference> {
        let diffObject: KnockoutObservable<ResultSummary.IDifference> = ko.observable({ value: "temp", diffType: ResultSummary.DifferenceType.Improved });
        return diffObject;
    }

    private _createView() {
        Diag.logVerbose("[WorkItemFiledItemsChart._createView]: WorkItemFiledItemsChart creation started");

        this._heading.text(Resources.WorkItemFiledHeading);


        let totalChartSurface = $(
            `<div data-bind='visible: totalworkItemFiled()>0'>
                <div class='chart-surface' /> 
                <div class='value-surface'>
                    <div class='main-value' data-bind='text: totalworkItemFiled'></div>
                </div>
                <div class='legend-surface' />
             </div>
            <div class='zero-workitem' data-bind='visible: totalworkItemFiled() == 0 '>
                <div data-bind='text: noWorkItemFiledText'></div>
            </div>`);
        this._content.append(totalChartSurface);
        ko.applyBindings(this._viewModel, this._content[0]);

        let witFiledViewModel = <ViewModel.ExploratorySessionChartsViewModel>this._viewModel;
        this._updateViewFlagSubscription = witFiledViewModel.updateViewFlag.subscribe((newValue: boolean) => {
            this._renderChart(witFiledViewModel);
        });
    }

    private _renderChart(witExploredViewModel: ViewModel.ExploratorySessionChartsViewModel): void {
        this._renderPieChart(witExploredViewModel);
        this._renderPieLegend(witExploredViewModel);
    }

    private _getPieChartData(viewModel: ViewModel.ExploratorySessionChartsViewModel): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];

        viewModel.workItemFiled().forEach((workItem) => {
            pieChartData.push({
                name: workItem.workItemType,
                value: workItem.count,
                color: ManualUtils.WorkItemMetaDataCache.getWorkItemColor(workItem.workItemType)
            });
        });

        return pieChartData;
    }

    private _renderPieLegend(viewModel: ViewModel.ExploratorySessionChartsViewModel) {
        Diag.logVerbose("Rendering WorkItemFiledItemsChart legend");
        let container = this._content.find(".legend-surface");
        container.empty();

        Controls.Control.create<ResultSummary.PieLegend, ResultSummary.PieLegendOptions>(
            ResultSummary.PieLegend,
            container,
            {
                data: this._getPieChartData(viewModel)
            }
        );
    }

    private _renderPieChart(viewModel: ViewModel.ExploratorySessionChartsViewModel) {
        Diag.logVerbose("Rendering WorkItemFiledItemsChart");
        let series = <ChartCore.DataSeries>{
            name : Resources.WorkItemFiledHeading,
            data: <ChartCore.Datum[]>[]
        };

        viewModel.workItemFiled().forEach((workItem) => {
            series.data.push(<ChartCore.Datum>{
                name: workItem.workItemType,
                y: workItem.count,
                color: ManualUtils.WorkItemMetaDataCache.getWorkItemColor(workItem.workItemType)
            });
        });

        let container = this._content.find(".chart-surface");
        container.empty();

        PieChart.create(container, series);
    }
}

export class SessionOwnersChart extends ResultSummary.PieChartContainer {
    private _data: Charting_Contracts.PieChartDataPoint[];
    private _updateViewFlagSubscription: IDisposable;

    public initialize() {
        super.initialize();
        this._createView();
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "owner-chart chart"
        }, options));
    }

    public dispose(): void {
        $(".owner-chart").remove();
        if (this._updateViewFlagSubscription) {
            this._updateViewFlagSubscription.dispose();
            this._updateViewFlagSubscription = null;
        }
        super.dispose();
    }

    /**
     * Get pie chart data.
     *
     * @publicapi
     */
    public getChartData(): Charting_Contracts.PieChartDataPoint[] {
        return this._data;
    }

    // only used to inherit base class and doing nothing here
    protected _getDifferenceObservable(): KnockoutObservable<ResultSummary.IDifference> {
        let diffObject: KnockoutObservable<ResultSummary.IDifference> = ko.observable({ value: "temp", diffType: ResultSummary.DifferenceType.Improved });
        return diffObject;
    }

    private _createView() {
        Diag.logVerbose("[SessionOwnersChart._createView]: SessionOwnersChart creation started");

        this._heading.text(Resources.SessionOwnerHeading);

        this._content.append($("<div class='chart-surface' />"));

        let valueSurface = $("<div class='value-surface' />");
        $("<div class='main-value' data-bind='text: sessionOwnersCount' />").appendTo(valueSurface);

        this._content.append(valueSurface);

        this._content.append($("<div class='legend-surface' />"));
        ko.applyBindings(this._viewModel, this._content[0]);

        let ownerViewModel = <ViewModel.ExploratorySessionChartsViewModel>this._viewModel;
        this._updateViewFlagSubscription = ownerViewModel.updateViewFlag.subscribe((newValue: boolean) => {
            this._renderChart(ownerViewModel);
        });
    }

    private _renderChart(witExploredViewModel: ViewModel.ExploratorySessionChartsViewModel): void {
        this._renderPieChart(witExploredViewModel);
        this._renderPieLegend(witExploredViewModel);
    }

    private _getPieChartData(viewModel: ViewModel.ExploratorySessionChartsViewModel): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];

        viewModel.sessionOwners().forEach((owner) => {
            pieChartData.push({
                name: owner.sessionOwnerName,
                value: owner.count,
                color: ManualUtils.SessionReportColorPalette.getColorCode(owner.type)
            });
        });

        return pieChartData;
    }

    private _renderPieLegend(viewModel: ViewModel.ExploratorySessionChartsViewModel) {
        Diag.logVerbose("Rendering SessionOwnersChart legend");
        let container = this._content.find(".legend-surface");
        container.empty();

        Controls.Control.create<ResultSummary.PieLegend, ResultSummary.PieLegendOptions>(
            ResultSummary.PieLegend,
            container,
            {
                data: this._getPieChartData(viewModel)
            }
        );
    }

    private _renderPieChart(viewModel: ViewModel.ExploratorySessionChartsViewModel) {
        Diag.logVerbose("Rendering SessionOwnersChart");
        let series = <ChartCore.DataSeries>{
            name : Resources.SessionOwnerHeading,
            data: <ChartCore.Datum[]>[]
        };

        viewModel.sessionOwners().forEach((owner) => {
            series.data.push(<ChartCore.Datum>{
                name: owner.sessionOwnerName,
                y: owner.count,
                color: ManualUtils.SessionReportColorPalette.getColorCode(owner.type)
            });
        });

        let container = this._content.find(".chart-surface");
        container.empty();

        PieChart.create(container, series);
    }
}

export class SessionDurationChart extends ResultSummary.BaseSummaryChart {

    public initialize() {
        super.initialize();
        this._createView();
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "session-duration-chart chart"
        }, options));
    }

    public dispose(): void {

        $(".session-duration-chart").remove();
        super.dispose();
    }

    // only used to inherit base class and doing nothing here
    protected _getDifferenceObservable(): KnockoutObservable<ResultSummary.IDifference> {
        let diffObject: KnockoutObservable<ResultSummary.IDifference> = ko.observable({ value: "temp", diffType: ResultSummary.DifferenceType.Improved });
        return diffObject;
    }

    private _createView(): void {
        Diag.logVerbose("[SessionDurationChart._createView]: SessionDurationChart creation started");

        this._heading.text(Resources.TotalDurationText);

        let valueSurface = $("<div class='duration-value' />");
        $("<div class='main-value' data-bind='text: sessionDuration' />").appendTo(valueSurface);
        this._content.append(valueSurface);

        ko.applyBindings(this._viewModel, this._content[0]);
    }
}

export class BugsByPriorityChart extends ResultSummary.PieChartContainer {
    private _data: Charting_Contracts.PieChartDataPoint[];
    private _updateViewFlagSubscription: IDisposable;

    public initialize() {
        super.initialize();
        this._createView();
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "bugs-by-priority-chart chart"
        }, options));
    }

    public dispose(): void {
        $(".bugs-by-priority-chart").remove();
        if (this._updateViewFlagSubscription) {
            this._updateViewFlagSubscription.dispose();
            this._updateViewFlagSubscription = null;
        }
        super.dispose();
    }

    /**
     * Get pie chart data.
     *
     * @publicapi
     */
    public getChartData(): Charting_Contracts.PieChartDataPoint[] {
        return this._data;
    }

    // only used to inherit base class and doing nothing here
    protected _getDifferenceObservable(): KnockoutObservable<ResultSummary.IDifference> {
        let diffObject: KnockoutObservable<ResultSummary.IDifference> = ko.observable({ value: "temp", diffType: ResultSummary.DifferenceType.Improved });
        return diffObject;
    }

    private _createView() {
        this._heading.text(Resources.SessionInsightBugsByPriority);

        let viewModel = <ViewModel.ExploratorySessionSummaryViewModel>this._viewModel;
        let totalChartSurface = $(
            `<div data-bind='visible: bugsFiledCount()>0'>
                <div class='chart-surface' /> 
                <div class='value-surface'>
                    <div class='main-value' data-bind='text: bugsFiledCount'></div>
                </div>
                <div class='legend-surface' />
             </div>
            <div class='zero-workitem-detail-pane' data-bind='visible: bugsFiledCount() == 0 '>
                <div data-bind='text: noBugFiledText'></div>
            </div>`);

        this._content.append(totalChartSurface);
        ko.applyBindings(viewModel, this._content[0]);

        this._updateViewFlagSubscription = viewModel.updateViewFlag.subscribe((newValue: boolean) => {
            this._renderChart(viewModel);
        });
    }

    private _renderChart(witExploredViewModel: ViewModel.ExploratorySessionSummaryViewModel): void {
        this._renderPieChart(witExploredViewModel);
        this._renderPieLegend(witExploredViewModel);
    }

    private _getPieChartData(viewModel: ViewModel.ExploratorySessionSummaryViewModel): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];

        viewModel.bugsByPriority().forEach((element, index) => {
            pieChartData.push({
                name: element.key,
                value: element.value,
                color: ManualUtils.SessionReportColorPalette.getColorCodeByPaletteName(ManualUtils.SessionReportColorPaletteName.Palette1, index)
            });
        });

        return pieChartData;
    }

    private _renderPieLegend(viewModel: ViewModel.ExploratorySessionSummaryViewModel) {
        let container = this._content.find(".legend-surface");
        container.empty();

        Controls.Control.create<ResultSummary.PieLegend, ResultSummary.PieLegendOptions>(
            ResultSummary.PieLegend,
            container,
            {
                data: this._getPieChartData(viewModel)
            }
        );
    }

    private _renderPieChart(viewModel: ViewModel.ExploratorySessionSummaryViewModel) {
        let series = <ChartCore.DataSeries>{
            name : Resources.SessionInsightBugsByPriority,
            data: <ChartCore.Datum[]>[]
        };
        let i = 0;
        viewModel.bugsByPriority().forEach((element, index) => {
            series.data.push(<ChartCore.Datum>{
                name: element.key,
                y: element.value,
                color: ManualUtils.SessionReportColorPalette.getColorCodeByPaletteName(ManualUtils.SessionReportColorPaletteName.Palette1, index)
            });
        });

        let container = this._content.find(".chart-surface");
        container.empty();

        PieChart.create(container, series);
    }
}

export class BugsByStateChart extends ResultSummary.PieChartContainer {
    private _data: Charting_Contracts.PieChartDataPoint[];
    private _updateViewFlagSubscription: IDisposable;

    public initialize() {
        super.initialize();
        this._createView();
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "bugs-by-state-chart chart"
        }, options));
    }

    public dispose(): void {
        $(".bugs-by-state-chart").remove();
        if (this._updateViewFlagSubscription) {
            this._updateViewFlagSubscription.dispose();
            this._updateViewFlagSubscription = null;
        }
        super.dispose();
    }

    /**
     * Get pie chart data.
     *
     * @publicapi
     */
    public getChartData(): Charting_Contracts.PieChartDataPoint[] {
        return this._data;
    }

    // only used to inherit base class and doing nothing here
    protected _getDifferenceObservable(): KnockoutObservable<ResultSummary.IDifference> {
        let diffObject: KnockoutObservable<ResultSummary.IDifference> = ko.observable({ value: "temp", diffType: ResultSummary.DifferenceType.Improved });
        return diffObject;
    }

    private _createView() {
        this._heading.text(Resources.SessionInsightBugsByState);

        let viewModel = <ViewModel.ExploratorySessionSummaryViewModel>this._viewModel;
        let totalChartSurface = $(
            `<div data-bind='visible: bugsFiledCount() > 0'>
                <div class='chart-surface' /> 
                <div class='value-surface'>
                    <div class='main-value' data-bind='text: bugsFiledCount'></div>
                </div>
                <div class='legend-surface' />
             </div>
            <div class='zero-workitem-detail-pane' data-bind='visible: bugsFiledCount() == 0 '>
                <div data-bind='text: noBugFiledText'></div>
            </div>`);

        this._content.append(totalChartSurface);
        ko.applyBindings(viewModel, this._content[0]);


        this._updateViewFlagSubscription = viewModel.updateViewFlag.subscribe((newValue: boolean) => {
            this._renderChart(viewModel);
        });
    }

    private _renderChart(witExploredViewModel: ViewModel.ExploratorySessionSummaryViewModel): void {
        this._renderPieChart(witExploredViewModel);
        this._renderPieLegend(witExploredViewModel);
    }

    private _getPieChartData(viewModel: ViewModel.ExploratorySessionSummaryViewModel): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];

        viewModel.bugsByState().forEach((element, index) => {
            pieChartData.push({
                name: element.key,
                value: element.value,
                color: ManualUtils.SessionReportColorPalette.getColorCodeByPaletteName(ManualUtils.SessionReportColorPaletteName.Palette2, index)
            });
        });

        return pieChartData;
    }

    private _renderPieLegend(viewModel: ViewModel.ExploratorySessionSummaryViewModel) {
        let container = this._content.find(".legend-surface");
        container.empty();

        Controls.Control.create<ResultSummary.PieLegend, ResultSummary.PieLegendOptions>(
            ResultSummary.PieLegend,
            container,
            {
                data: this._getPieChartData(viewModel)
            }
        );
    }

    private _renderPieChart(viewModel: ViewModel.ExploratorySessionSummaryViewModel) {
        let series = <ChartCore.DataSeries>{
            name : Resources.SessionInsightBugsByState,
            data: <ChartCore.Datum[]>[]
        };

        viewModel.bugsByState().forEach((element, index) => {
            series.data.push(<ChartCore.Datum>{
                name: element.key,
                y: element.value,
                color: ManualUtils.SessionReportColorPalette.getColorCodeByPaletteName(ManualUtils.SessionReportColorPaletteName.Palette2, index)
            });
        });

        let container = this._content.find(".chart-surface");
        container.empty();

        PieChart.create(container, series);
    }
}

export class TasksByStateChart extends ResultSummary.PieChartContainer {
    private _data: Charting_Contracts.PieChartDataPoint[];
    private _updateViewFlagSubscription: IDisposable;

    public initialize() {
        super.initialize();
        this._createView();
    }

    /**
     * @param options
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            cssClass: "tasks-by-state-chart chart"
        }, options));
    }

    public dispose(): void {
        $(".tasks-by-state-chart").remove();
        if (this._updateViewFlagSubscription) {
            this._updateViewFlagSubscription.dispose();
            this._updateViewFlagSubscription = null;
        }
        super.dispose();
    }

    /**
     * Get pie chart data.
     *
     * @publicapi
     */
    public getChartData(): Charting_Contracts.PieChartDataPoint[] {
        return this._data;
    }

    // only used to inherit base class and doing nothing here
    protected _getDifferenceObservable(): KnockoutObservable<ResultSummary.IDifference> {
        let diffObject: KnockoutObservable<ResultSummary.IDifference> = ko.observable({ value: "temp", diffType: ResultSummary.DifferenceType.Improved });
        return diffObject;
    }

    private _createView() {
        this._heading.text(Resources.SessionInsightTasksByState);

        let viewModel = <ViewModel.ExploratorySessionSummaryViewModel>this._viewModel;
        let totalChartSurface = $(
            `<div data-bind='visible: tasksFiledCount()>0'>
                <div class='chart-surface' /> 
                <div class='value-surface'>
                    <div class='main-value' data-bind='text: tasksFiledCount'></div>
                </div>
                <div class='legend-surface' />
             </div>
            <div class='zero-workitem-detail-pane' data-bind='visible: tasksFiledCount() == 0 '>
                <div data-bind='text: noTaskFiledText'></div>
            </div>`);

        this._content.append(totalChartSurface);
        ko.applyBindings(viewModel, this._content[0]);
        this._updateViewFlagSubscription = viewModel.updateViewFlag.subscribe((newValue: boolean) => {
            this._renderChart(viewModel);
        });
    }

    private _renderChart(witExploredViewModel: ViewModel.ExploratorySessionSummaryViewModel): void {
        this._renderPieChart(witExploredViewModel);
        this._renderPieLegend(witExploredViewModel);
    }

    private _getPieChartData(viewModel: ViewModel.ExploratorySessionSummaryViewModel): Charting_Contracts.PieChartDataPoint[] {
        let pieChartData: Charting_Contracts.PieChartDataPoint[] = [];

        viewModel.tasksByState().forEach((element, index) => {
            pieChartData.push({
                name: element.key,
                value: element.value,
                color: ManualUtils.SessionReportColorPalette.getColorCodeByPaletteName(ManualUtils.SessionReportColorPaletteName.Palette3, index)
            });
        });

        return pieChartData;
    }

    private _renderPieLegend(viewModel: ViewModel.ExploratorySessionSummaryViewModel) {
        let container = this._content.find(".legend-surface");
        container.empty();

        Controls.Control.create<ResultSummary.PieLegend, ResultSummary.PieLegendOptions>(
            ResultSummary.PieLegend,
            container,
            {
                data: this._getPieChartData(viewModel)
            }
        );
    }

    private _renderPieChart(viewModel: ViewModel.ExploratorySessionSummaryViewModel) {
        let series = <ChartCore.DataSeries>{
            name : Resources.SessionInsightTasksByState,
            data: <ChartCore.Datum[]>[]
        };

        viewModel.tasksByState().forEach((element, index) => {
            series.data.push(<ChartCore.Datum>{
                name: element.key,
                y: element.value,
                color: ManualUtils.SessionReportColorPalette.getColorCodeByPaletteName(ManualUtils.SessionReportColorPaletteName.Palette3, index)
            });
        });

        let container = this._content.find(".chart-surface");
        container.empty();

        PieChart.create(container, series);
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/Charts", exports);