
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import TestReportingCommon = require("TestManagement/Scripts/TestReporting/Common/Common");
import Resources = require("TestManagement/Scripts/Resources/Tfs.Resources.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Contracts = require("TFS/TestManagement/Contracts");

import Diag = require("VSS/Diag");
import Grids = require("VSS/Controls/Grids");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import Utils_String = require("VSS/Utils/String");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";

export class Constants {
    public static GRID_CSS_CLASS = "testresults-traceability-widget-grid";
    public static GRID_HEADER_CLASS = "testresults-traceability-widget-grid-header";
    public static GRID_EXPANDED_CLASS = "testresults-traceability-expanded";
    public static GRID_CELL_DETAILS = "testresults-traceability-widget-grid-data-cell-details";
    public static GRID_WORKITEM_TITLE_CELL_CSS_CLASS = "testresults-traceability-widget-grid-wit-title-cell";
    public static GRID_RESULTS_COUNT_CELL_CSS_CLASS = "testresults-traceability-widget-grid-results-count-cell";
    public static GRID_WORKITEM_TITLE_COLOR_BAR_CLASS = "workitem-title-color-bar";

    public static GRID_ROW_HEIGHT = 30;
    public static GRID_WORKITEM_TITLE_CELL_WIDTH = 270;
    public static GRID_PASS_PERCENT_CELL_WIDTH = 140;
    public static GRID_RESULTS_COUNT_CELL_WIDTH = 50;
    public static GRID_ROW_HEIGHT_EXPANDED = 35;
    public static GRID_WORKITEM_TITLE_CELL_WIDTH_EXPANDED = 490;
    public static GRID_PASS_PERCENT_CELL_WIDTH_EXPANDED = 240;
    public static GRID_RESULTS_COUNT_CELL_WIDTH_EXPANDED = 115;

    public static GRID_TITLE_CELL_INDEX = "workItemTitle";
    public static GRID_PASS_PERCENT_CELL_INDEX = "passPercent";
    public static GRID_RESULTS_COUNT_CELL_INDEX = "resultsCount";
}

export module Events {
    export let ROW_CLICK_EVENT = "testresults-traceability-widget-row-click-event";
}

export interface ITestResultspassRateHorizontalBar {
    showExpandedView: boolean;
    aggregatedResultsByOutcome: Contracts.AggregatedResultsByOutcome[];
}

export class TestResultsPassRateHorizontalBar {
    constructor(options: ITestResultspassRateHorizontalBar) {
        this._aggregateResultsByOutcome = [];

        if (options.aggregatedResultsByOutcome) {
            this._aggregateResultsByOutcome = options.aggregatedResultsByOutcome;
        }

        if (options.showExpandedView) {
            this._showExpandedView = options.showExpandedView;
        }

    }

    public createHorizontalBarLayout(container: JQuery): void {
        let totalTests: number = this._getTotalTests();
        let otherTests: number = 0;
        let passPercentage: number = 0;
        let percentageWidth: number;
        let leftOffset: number = 0;
        let remainingSections = Object.keys(this._aggregateResultsByOutcome).length;

        //initialize the basic layout
        this._initializeHorizontalBarLayout(container);
        
        if (remainingSections === 0) {
            this._showNoResultsMessageContainer();
        }
        else {
            this._initializeHorizontalBarSVGLayout();
            // create passed / failed sections
            for (let key in this._aggregateResultsByOutcome) {
                if (this._aggregateResultsByOutcome.hasOwnProperty(key)) {
                    let result = this._aggregateResultsByOutcome[key];
                    if (result) {
                        remainingSections--;

                        if (result.outcome === Contracts.TestOutcome.Passed || result.outcome === Contracts.TestOutcome.Failed) {
                            if (result.outcome === Contracts.TestOutcome.Passed) {
                                passPercentage = this._getPercentage(result.count, totalTests);
                            }

                            percentageWidth = this.createHorizontalBarSection(result.outcome, result.count, totalTests, leftOffset, remainingSections === 0);

                            leftOffset += percentageWidth;
                        }
                        else {
                            otherTests += result.count;
                        }
                    }
                }
            }

            // create others section
            if (otherTests > 0) {
                percentageWidth = this.createHorizontalBarSection(Contracts.TestOutcome.Aborted, otherTests, totalTests, leftOffset, true);
                leftOffset += percentageWidth;
            }

            // create percentage section
            this.createPercentageSectionLayout(passPercentage, this._getPassPercentageSectionTextWidth());
        }
    }

    private _initializeHorizontalBarSVGLayout(): void {
        this._$svg = $(document.createElementNS(Common.Namespaces.SVGNamespace, Common.SVGConstants.SVG))
            .attr("class", this._cssHorizontalSection.concat(" horizontalbars-left"))
            .attr("width", this._getMaxHorizontalBarSectionsWidth().toString().concat("%"))
            .attr("height", "100%")
            .appendTo(this._$horizontalBarSectionsContainer);
    }

    public createHorizontalBarSection(outcome: Contracts.TestOutcome, count: number, totalTests: number, leftOffset: number, roundOff: boolean): number {
        let cssColorName: string = this._getHorizontalBarSectionCssColorName(outcome);
        let toolTip: string = this._getHorizontalBarSectionToolTip(outcome, count, totalTests);
       
        let horizontalBarWidth = roundOff ?
            this._maxPassPercentage - leftOffset :
            this._getHorizontalBarWidth(count, totalTests);

        let $rect = $(document.createElementNS(Common.Namespaces.SVGNamespace, Common.SVGConstants.Rect))
            .attr("fill", cssColorName)
            .attr("x", leftOffset.toString().concat("%"))
            .attr("y", "0")
            .attr("width", horizontalBarWidth.toString().concat("%"))
            .attr("height", "100%")
            .appendTo(this._$svg);

        let $title = $(document.createElementNS(Common.Namespaces.SVGNamespace, Common.SVGConstants.Title)).text(toolTip).appendTo($rect);

        return horizontalBarWidth;
    }

    public createPercentageSectionLayout(percentage: number, percentageWidth: number): void {
        let toolTip = Utils_String.format(Resources.PassRateDescription, percentage);

        let element = $("<div />")
            .text(percentage.toString() + "%")
            .addClass(this._cssHorizontalSection)
            .addClass(this._cssPercentage)
            .attr("style", "width:" + percentageWidth.toString() + "%");
        RichContentTooltip.add(toolTip, element);

        element.appendTo(this._$horizontalBarSectionsContainer);
    }

    private _getTotalTests(): number {
        let totalTests: number = 0;

        for (let key in this._aggregateResultsByOutcome) {
            if (this._aggregateResultsByOutcome.hasOwnProperty(key)) {
                let resultByOutcome = this._aggregateResultsByOutcome[key];
                if (resultByOutcome) {
                    totalTests += resultByOutcome.count;
                }
            }
        }

        return totalTests;
    }

    private _initializeHorizontalBarLayout(container: JQuery): void {
        let horizontalBar: JQuery = $(this._horizontalBarTemplate).addClass(this._getHorizontalBarCssName());
        container.append(horizontalBar);

        this._$horizontalBarSectionsContainer = container.find("." + this._cssHorizontalSectionsContainer);
    }

    private _getHorizontalBarCssName(): string {
        if (this._showExpandedView) {
            return this._cssHorizontalBarExpanded;
        }
        else {
            return this._cssHorizontalBar;
        }
    }

    private _getHorizontalBarSectionCssColorName(outcome: Contracts.TestOutcome): string {
        let cssColorName: string = "";

        switch (outcome) {
            case Contracts.TestOutcome.Passed:
                cssColorName = Common.TraceabilityWidgetColorPalette.PassedSection;
                break;

            case Contracts.TestOutcome.Failed:
                cssColorName = Common.TraceabilityWidgetColorPalette.FailedSection;
                break;

            default:
                cssColorName = Common.TraceabilityWidgetColorPalette.OthersSection;
        }

        return cssColorName;
    }

    private _getHorizontalBarWidth(testsCount: number, totalTests: number): number {
        return Math.ceil((100 / totalTests) * testsCount);
    }

    private _getPercentage(testsCount: number, totalTests: number): number {
        return Math.floor((100 / totalTests) * testsCount);
    }

    private _getMaxHorizontalBarSectionsWidth(): number {
        if (this._showExpandedView) {
            return this._maxPassPercentage - this._percentageSectionWidthExpanded;
        }  
        return this._maxPassPercentage - this._percentageSectionWidth;
    }

    private _getPassPercentageSectionTextWidth(): number {
        return this._showExpandedView ? this._percentageSectionWidthExpanded : this._percentageSectionWidth; 
    }

    private _getHorizontalBarSectionToolTip(outcome: Contracts.TestOutcome, count: number, totalTests: number): string {
        let description = "";

        switch (outcome) {
            case Contracts.TestOutcome.Passed:
                description = this._getPassedSectionDescription(count, totalTests);
                break;

            case Contracts.TestOutcome.Failed:
                description = this._getFailedSectionDescription(count, totalTests);
                break;

            case Contracts.TestOutcome.Aborted:
                description = this._getOthersSectionDescription(count, totalTests);
                break;
        }

        return description;
    }

    private _getPassedSectionDescription(count: number, totalTests: number): string {
        return Utils_String.format(Resources.PassedTestsDescription, count, totalTests);
    }

    private _getFailedSectionDescription(count: number, totalTests: number): string {
        return Utils_String.format(Resources.FailedTestsDescription, count, totalTests);
    }

    private _getOthersSectionDescription(count: number, totalTests: number): string {
        return Utils_String.format(Resources.OthersTestsDescription, count, totalTests);
    }

    private _showNoResultsMessageContainer(): void {
        let element = $("<div />")
            .text(Resources.NoLinkedTests)
            .addClass(this._cssHorizontalSection)
            .addClass(this._cssNoResultsMessage)
            .attr("style", "width:100%");

        element.appendTo(this._$horizontalBarSectionsContainer);
    }

    private _aggregateResultsByOutcome: Contracts.AggregatedResultsByOutcome[];
    private _$horizontalBarSectionsContainer: JQuery;
    private _$svg: JQuery;

    private _cssHorizontalSectionsContainer = "testresults-traceability-horizontalbar-sections";
    private _cssHorizontalBarExpanded = "testresults-traceability-horizontalbar-expanded";
    private _cssHorizontalBar = "testresults-traceability-horizontalbar-no-expanded";
    private _cssHorizontalSection = "testresults-traceability-horizontalbar-section";
    private _cssNoResultsMessage = "testresults-traceability-horizontalbar-no-results";
    private _cssPercentage = "testresults-traceability-horizontalbar-percentage-section";
    private _percentageSectionWidth = 20;
    private _percentageSectionWidthExpanded = 15;
    private _maxPassPercentage = 100;
    private _showExpandedView: boolean = false;

    private _horizontalBarTemplate = `<div class='${this._cssHorizontalSectionsContainer}'>        
    </div>`;
}

export interface ITestResultsTraceabilityWidgetGridOptions extends Grids.IGridOptions {
    showExpandedView?: boolean;
    testSummaryData?: Contracts.TestSummaryForWorkItem[];
}

export class TestResultsTraceabilityWidgetGrid extends Grids.GridO<ITestResultsTraceabilityWidgetGridOptions> {

    public initialize() {
        super.initialize();
        this._rowHeight = this._getRowHeight();

        this._setTitleColumnWidth();
        this._setResultsCountColumnWidth();
        this._setPassPercentageColumnWidth();
        
        this.getElement().focusout(() => {
            if (this.getElement().has(":focus").length === 0) {
                this._active = false;
            }
        });
    }

    public initializeOptions(options?: ITestResultsTraceabilityWidgetGridOptions) {
        let testSummaryData: Contracts.TestSummaryForWorkItem[] = null;

        if (options && options.testSummaryData) {
            testSummaryData = options.testSummaryData;
        }

        super.initializeOptions($.extend(<ITestResultsTraceabilityWidgetGridOptions>{
            cssClass: this._getCoreCssClassName(),
            allowMultiSelect: false,
            gutter: {
                contextMenu: false
            },
            columns: this.getColumns(),
            source: testSummaryData
        }, options));
    }

    /**
     * Overwrite. Only apply row selection style if the grid is active, otherwise remove all stylings.
     */
    public _updateRowSelectionStyle(rowInfo, selectedRows, focusIndex) {
        if (this._active) {
            super._updateRowSelectionStyle(rowInfo, selectedRows, focusIndex);
            if (this.getSelectedRowIndex() !== -1) {
                this.getRowInfo(this.getSelectedRowIndex()).row.removeClass("grid-row-selected-blur");
                this.getRowInfo(this.getSelectedRowIndex()).row.removeClass("grid-row-selected");
                this.getRowInfo(this.getSelectedRowIndex()).row.addClass("grid-row-selected-blur");
            }
        }
        return;
    }

    public _onRowClick(event): any {
        return this.onOpenRowDetail(event);
    }

    public setColorsProvider(provider: WorkItemTypeColorAndIconsProvider): void {
        this._colorsProvider = provider;
    }

    public getColumns(): Grids.IGridColumn[] {
        return [
            <Grids.IGridColumn>{
                index: Constants.GRID_TITLE_CELL_INDEX,
                width: this._getTitleCellWidth(),
                text: Resources.WorkItemGridTitleColumnHeader,
                headerCss: Constants.GRID_HEADER_CLASS,
                getCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                    let cell = this._drawCell
                        .apply(this, arguments);

                    let workItem = this.getRowData(dataIndex).workItem;
                    let titleContainer = this._getWorkItemTitleLayout(workItem);

                    titleContainer.prependTo(cell);
                    
                    return cell;
                },
                canSortBy: false
            },
            {
                index: Constants.GRID_RESULTS_COUNT_CELL_INDEX,
                width: this._getResultsCountCellWidth(),
                text: Resources.FailedTests,
                headerCss: Constants.GRID_HEADER_CLASS,
                getCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                    let cell = this._drawCell
                        .apply(this, arguments);

                    let summary: Contracts.AggregatedDataForResultTrend = this.getRowData(dataIndex).summary ? this.getRowData(dataIndex).summary : null;
                    let resultsByOutcome: IDictionaryNumberTo<Contracts.AggregatedResultsByOutcome> = summary ? summary.resultsByOutcome : null;
                    let resultsContext: Contracts.TestResultsContext = summary ? summary.testResultsContext : null;
                    let resultsCountContainer = this._getResultsCountContainer(resultsByOutcome, resultsContext);

                    resultsCountContainer.prependTo(cell);

                    return cell;
                },
                canSortBy: false
            },
            {
                index: Constants.GRID_PASS_PERCENT_CELL_INDEX,
                width: this._getPassPercentageCellWidth(),
                text: Resources.PassRate,
                headerCss: Constants.GRID_HEADER_CLASS,
                getCellContents(rowInfo: any, dataIndex: number, expandedState: number, level: number, column: any, indentIndex: number, columnOrder: number) {
                    let cell = this._drawCell
                        .apply(this, arguments);

                    let resultsByOutcome = this.getRowData(dataIndex).summary ? this.getRowData(dataIndex).summary.resultsByOutcome : null;
                    let horizontalBarRenderer = new TestResultsPassRateHorizontalBar({
                        showExpandedView: (this._options && this._options.showExpandedView) ? this._options.showExpandedView : false,
                        aggregatedResultsByOutcome: resultsByOutcome
                    });
                    let element = horizontalBarRenderer.createHorizontalBarLayout(cell);

                    return cell;
                },
                canSortBy: false
            }
        ];
    }

    private _getColorsProvider(): WorkItemTypeColorAndIconsProvider {
        if (!this._colorsProvider) {
            this._colorsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
        }

        return this._colorsProvider;
    }

    private _setTitleColumnWidth(): void {
        let dataColumns = this._columns.filter((column) => {
            return column.index === Constants.GRID_TITLE_CELL_INDEX;
        });
        let dataColumn = dataColumns[0];
        dataColumn.width = this._getTitleCellWidth();
    }

    private _setPassPercentageColumnWidth(): void {
        let dataColumns = this._columns.filter((column) => {
            return column.index === Constants.GRID_PASS_PERCENT_CELL_INDEX;
        });
        let dataColumn = dataColumns[0];
        dataColumn.width = this._getPassPercentageCellWidth();
    }

    private _setResultsCountColumnWidth(): void {
        let dataColumns = this._columns.filter((column) => {
            return column.index === Constants.GRID_RESULTS_COUNT_CELL_INDEX;
        });
        let dataColumn = dataColumns[0];
        dataColumn.width = this._getResultsCountCellWidth();
    }

    private _getCoreCssClassName(): string {
        let coreCssClass = Constants.GRID_CSS_CLASS;
        if (this._options && this._options.showExpandedView) {
            coreCssClass = coreCssClass + " " + Constants.GRID_EXPANDED_CLASS;
        }

        return coreCssClass;
    }

    private _getRowHeight(): number {
        if (this._options && this._options.showExpandedView) {
            return Constants.GRID_ROW_HEIGHT_EXPANDED;
        }

        return Constants.GRID_ROW_HEIGHT;
    }

    private _getPassPercentageCellWidth(): number {
        if (this._options && this._options.showExpandedView) {
            return Constants.GRID_PASS_PERCENT_CELL_WIDTH_EXPANDED;
        }

        return Constants.GRID_PASS_PERCENT_CELL_WIDTH;
    }

    private _getTitleCellWidth(): number {
        if (this._options && this._options.showExpandedView) {
            return Constants.GRID_WORKITEM_TITLE_CELL_WIDTH_EXPANDED;
        }

        return Constants.GRID_WORKITEM_TITLE_CELL_WIDTH;
    }

    private _getResultsCountCellWidth(): number {
        if (this._options && this._options.showExpandedView) {
            return Constants.GRID_RESULTS_COUNT_CELL_WIDTH_EXPANDED;
        }

        return Constants.GRID_RESULTS_COUNT_CELL_WIDTH;
    }    

    private _getWorkItemTitle(workItem: Contracts.WorkItemReference): string {
        let title = "";
        let id = "";

        if (workItem) {
            if (workItem.id) {
                id = workItem.id;
            }

            if (workItem.name) {
                title = workItem.name;
            }
        }

        return Utils_String.format(Resources.WorkItemTitleFormat, id, title);
    }

    private _getWorkItemColor(workitemTypeName: string): string {
        const projectName = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
        const colorsProvider = WorkItemTypeColorAndIconsProvider.getInstance();
        return colorsProvider.getColor(projectName, workitemTypeName);
    }

    private _getWorkItemTitleLayout(workItem: Contracts.WorkItemReference): JQuery {
        let titleContainer = ($("<div />")
            .addClass(Constants.GRID_CELL_DETAILS));

        let color: string = this._getWorkItemColor(workItem.type);
        let colorBar = $("<div>")
            .addClass(Constants.GRID_WORKITEM_TITLE_COLOR_BAR_CLASS)
            .css("background-color", color);

        let workItemTitle = this._getWorkItemTitle(workItem);
        let editLink = $("<a>")
            .addClass(Constants.GRID_WORKITEM_TITLE_CELL_CSS_CLASS)
            .text(workItemTitle)
            .attr("href", "#")
            .click((e?: JQueryEventObject) => { this._onWorkItemLinkClick(workItem); });

        titleContainer
            .append(colorBar)
            .append(editLink);

        return titleContainer;
    }

    private _onWorkItemLinkClick(workItem: Contracts.WorkItemReference) {
        let workItemUrl = TMUtils.UrlHelper.getWorkItemUrl(parseInt(workItem.id));
        window.open(workItemUrl, "_blank");
    }

    private _getResultsCountContainerText(resultsByOutcome: IDictionaryNumberTo<Contracts.AggregatedResultsByOutcome>): string {
        if (!resultsByOutcome || Object.keys(resultsByOutcome).length === 0) {
            return Resources.ZeroWorkItemCountText;
        }

        let failedTests: number = 0;

        for (let key in resultsByOutcome) {
            if (resultsByOutcome.hasOwnProperty(key)) {
                let result = resultsByOutcome[key];
                if (result) {
                    if (result.outcome === Contracts.TestOutcome.Failed) {
                        failedTests += result.count;
                    }
                }
            }
        }
        return Utils_String.format("{0}", failedTests);
    }

    private _getResultsCountContainer(resultsByOutcome: IDictionaryNumberTo<Contracts.AggregatedResultsByOutcome>, resultsContext: Contracts.TestResultsContext): JQuery {
        let resultsCountContainer = $("<div />")
            .addClass(Constants.GRID_CELL_DETAILS);

        let failureCountText = this._getResultsCountContainerText(resultsByOutcome);
        let toolTip = Utils_String.format(Resources.NumberOfFailedTests, failureCountText);

        let editLink = $("<a>")
            .addClass(Constants.GRID_RESULTS_COUNT_CELL_CSS_CLASS)
            .text(failureCountText)
            .attr("href", "#")
            .click((e?: JQueryEventObject) => { this._onTestResultsLinkClick(resultsContext); });
        RichContentTooltip.add(toolTip, editLink, { setAriaDescribedBy: true });

        resultsCountContainer.append(editLink);

        return resultsCountContainer;
    }

    private _onTestResultsLinkClick(resultsContext: Contracts.TestResultsContext): void {
        if (resultsContext) {
            switch (resultsContext.contextType) {
                case Contracts.TestResultsContextType.Build:
                    let buildId: number = resultsContext.build.id;
                    let buildUrl = TMUtils.UrlHelper.getBuildSummaryUrl(buildId);
                    this._navigateToDefinition(buildUrl, TestReportingCommon.ExtensionNames.TestTabInBuildSummary, TestResultsTraceabilityWidgetGrid._tabLink);
                    break;
                case Contracts.TestResultsContextType.Release:
                    let releaseId: number = resultsContext.release.id;
                    let releaseUrl = TMUtils.UrlHelper.getReleaseSummaryUrl(releaseId);
                    this._navigateToDefinition(releaseUrl, TestReportingCommon.ExtensionNames.TestTabInReleaseSummary, TestResultsTraceabilityWidgetGrid._anchorLink);
                    break;
                default:
                    Diag.logInfo("Invalid context, context should be either build or release");
                    break;
            }
        }
    }

    private _navigateToDefinition(url: string, extensionName: string, linkHeader: string): void {
        let urlWithGroupByRequirement: Utils_String.StringBuilder = new Utils_String.StringBuilder(url);
        urlWithGroupByRequirement.append(linkHeader);
        urlWithGroupByRequirement.append(extensionName);
        urlWithGroupByRequirement.append(TestResultsTraceabilityWidgetGrid._groupByCommand);
        urlWithGroupByRequirement.append(Common.TestResultDetailsCommands.GroupByRequirement);
        window.open(urlWithGroupByRequirement.toString(), "_blank");
    }
    private _colorsProvider: WorkItemTypeColorAndIconsProvider;
    private static _groupByCommand: string = "&testtab-groupby-command=";
    private static _anchorLink: string = "&_a=release-contribution-tab-";
    private static _tabLink: string = "&tab=";
}
