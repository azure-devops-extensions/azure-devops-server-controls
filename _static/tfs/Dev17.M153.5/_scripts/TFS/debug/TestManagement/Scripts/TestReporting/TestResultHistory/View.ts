/// <reference types="react" />
/// <reference types="react-dom" />

import ko = require("knockout");
import ksb = require("knockoutSecureBinding");
import q = require("q");

import * as React from "react";
import ReactDOM = require("react-dom");

import CommonBase = require("TestManagement/Scripts/TestReporting/Common/Common");
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ResultHistoryCommon = require("TestManagement/Scripts/TestReporting/TestResultHistory/Common");
import ResultHistoryControls = require("TestManagement/Scripts/TestReporting/TestResultHistory/Controls");
import ResultHistoryHistogram = require("TestManagement/Scripts/TestReporting/TestResultHistory/Histogram");
import ResultHistoryVM = require("TestManagement/Scripts/TestReporting/TestResultHistory/ViewModel");
import TMService = require("TestManagement/Scripts/TFS.TestManagement.Service");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import TCMTelemetry = require("TestManagement/Scripts/TFS.TestManagement.Telemetry");


import Contracts = require("TFS/TestManagement/Contracts");

import BuildContracts = require("TFS/Build/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");
import {RepositoryTypes} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import * as FilterControl from "TestManagement/Scripts/TestReporting/WebComponents/Components/DropDownFilter";

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Menus = require("VSS/Controls/Menus");
import Performance = require("VSS/Performance");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;
let WITUtils = TMUtils.WorkItemUtils;
let domElement = Utils_UI.domElem;
let options = { attribute: "data-bind", globals: window, bindings: ko.bindingHandlers, noVirtualElements: false };
let TelemetryService = TCMTelemetry.TelemetryService;
ko.bindingProvider.instance = new ksb(options);

export class ResultHistoryData {

    public update(runId: number, resultId: number, selectedGroupBy?: string, resultFilter?: Contracts.ResultsFilter): IPromise<string> {
        this._groupBy = selectedGroupBy ? selectedGroupBy : ResultHistoryCommon.ResultHistoryGroupPivots.Group_By_Branch;

        this.resultHistoryData([]);

        Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TestResultHistory_BeginGetTestResult);

        return this._beginGetTestResult(runId, resultId).then((testCaseResult: Contracts.TestCaseResult) => {

            Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TestResultHistory_EndGetTestResult);
            this._currentResult = testCaseResult;            
            return this.updateTestCaseResultHistory(testCaseResult, resultFilter);
 
        }, (error) => {
            Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultHistory);
            Diag.logError("[TestResultSummaryView.update]: Result API call failed.");
            return q.reject(error);
            });

    }

    public getCurrentResult(): Contracts.TestCaseResult {
        return this._currentResult;
    }

    public getHistogramData(histogramViewModels: ResultHistoryHistogram.ResultHistoryHistogramViewModel[], histogramControls: ResultHistoryHistogram.ResultHistoryHistogramControl[]) {
        let perfScenarios: Performance.IScenarioDescriptor[] = [];
        let service: TMService.ITestResultsService = TMService.ServiceManager.instance().testResultsService();
        $.each(histogramViewModels, (index, viewModel) => {

            perfScenarios[index] = Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultHistory_FetchHistogramTrendReportForResult);

            let query: Contracts.TestResultsQuery = <Contracts.TestResultsQuery>{
                resultsFilter: this._getResultsFilterForGroup(viewModel)
            };

            service.getTestResultsByQuery(query).then((resultQuery: Contracts.TestResultsQuery) => {

                perfScenarios[index].addSplitTiming(TMUtils.TRAPerfScenarios.TestResultHistory_GotResultTrendData);

                histogramViewModels[index].resultTrend(new ResultHistoryHistogram.ResultTrend(resultQuery.results));

                perfScenarios[index].end();
            }, (error) => {

                perfScenarios[index].abort();

                Diag.logError(Utils_String.format("[ResultHistoryData.getHistogramData]: Error fetching histogram trend report for test result (runId: {0}, resultId: {1}). Error: {3}", this._currentResult.testRun.id, this._currentResult.id, error.mesage));
            });
        });       
    }

    protected _sortGroups(resultGroups: Contracts.TestResultHistoryDetailsForGroup[]) {
        Diag.Debug.assert(resultGroups !== null && resultGroups !== undefined);
        resultGroups.sort((group1, group2) => {
            return Utils_Date.defaultComparer(group2.latestResult.completedDate, group1.latestResult.completedDate);
        });
    }

    public updateTestCaseResultHistory(testCaseResult: Contracts.TestCaseResult, testCaseResultFilter?: Contracts.ResultsFilter): IPromise<string> {

        if (!testCaseResult.automatedTestName) {
            Diag.logInfo("[TestResultSummaryView.update]: Not showing history for manual tests.");      

            Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultHistory);
                                   
            return q.reject({ isInfo: true, message: Resources.TestResultHistoryManualResultNotSupportedError });
        }

        if (!testCaseResultFilter) {
            testCaseResultFilter = <Contracts.ResultsFilter>{
                groupBy: this._groupBy,
                automatedTestName: testCaseResult.automatedTestName
            };
        } else {
            testCaseResultFilter.groupBy = testCaseResultFilter.groupBy || this._groupBy;
            testCaseResultFilter.automatedTestName = testCaseResultFilter.automatedTestName || testCaseResult.automatedTestName;
        }

        Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TestResultHistory_BeginGetTestCaseHistory);

        return this._getResultHistoryFromServer(testCaseResultFilter).then((historyPrimaryData: Contracts.TestResultHistory) => {

            Performance.getScenarioManager().split(TMUtils.TRAPerfScenarios.TestResultHistory_EndGetTestCaseHistory);

            let primaryDataVMs: ResultHistoryVM.TestResultHistoryPrimaryDataViewModel[] = [];

            if (testCaseResultFilter.groupBy === this._groupBy) {
                if (historyPrimaryData.resultsForGroup && historyPrimaryData.resultsForGroup.length > 0) {
                    this._sortGroups(historyPrimaryData.resultsForGroup);
                    for (let index = 0, len = historyPrimaryData.resultsForGroup.length; index < len; index++) {
                        primaryDataVMs.push(new ResultHistoryVM.TestResultHistoryPrimaryDataViewModel(
                            historyPrimaryData.resultsForGroup[index],
                            this._groupBy,
                            testCaseResultFilter));
                    }
                } else {
                    Diag.logInfo("[TestResultSummaryView.update]: Server returned no results for selected group.");
                    Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area,
                        TMUtils.TRAPerfScenarios.TestResultHistory);
                    return q.reject({ isInfo: true, message: Resources.TestResultHistoryNoResultsMessage });
                }
            }

            this.resultHistoryData(primaryDataVMs);
            
            Performance.getScenarioManager().endScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultHistory);

            return q.resolve(this._currentResult.testCaseTitle);
        }, (error) => {
            Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultHistory);
            Diag.logError("[TestResultSummaryView.update]: History API call failed");
            return q.reject(error);
        });
    }

    private _getResultsFilterForGroup(viewModel: ResultHistoryHistogram.ResultHistoryHistogramViewModel): Contracts.ResultsFilter {

        let testResultsContext: Contracts.TestResultsContext;

        switch (this._groupBy) {
            case ResultHistoryCommon.ResultHistoryGroupPivots.Group_By_Branch:
                let buildReference: Contracts.BuildReference = <Contracts.BuildReference>{ branchName: viewModel.getGroupKey() };
                testResultsContext = <Contracts.TestResultsContext>{ contextType: Contracts.TestResultsContextType.Build, build: buildReference };
                break;

            case ResultHistoryCommon.ResultHistoryGroupPivots.Group_By_Environment:
                let releaseReference: Contracts.ReleaseReference = <Contracts.ReleaseReference>{ environmentDefinitionId: parseInt(viewModel.getGroupKey()) };
                testResultsContext = <Contracts.TestResultsContext>{ contextType: Contracts.TestResultsContextType.Release, release: releaseReference };
                break;
        }

       return <Contracts.ResultsFilter>{
            automatedTestName: this._currentResult.automatedTestName,
            testResultsContext: testResultsContext,
            resultsCount: ResultHistoryCommon.ResultHistoryContants.ResultCount,
            trendDays: ResultHistoryCommon.ResultHistoryContants.TrendDays,
            branch: (viewModel.filterContext && viewModel.filterContext.branch) ? viewModel.filterContext.branch : Utils_String.empty
        };
    }

    private _beginGetTestResult(runId: number, resultId: number): IPromise<Contracts.TestCaseResult> {
        Diag.logVerbose("[TestResultHistoryViewModel.beginGetTestResult]: method called");
        return TMService.ServiceManager.instance().testResultsService().getResultById(runId, resultId);
    }

    private _getResultHistoryFromServer(historyFilter: Contracts.ResultsFilter): IPromise<Contracts.TestResultHistory> {
        Diag.logVerbose("[TestResultHistoryViewModel._getResultHistoryFromServer]: method called");
        return TMService.ServiceManager.instance().testResultsService().getGroupedResultHistory(historyFilter);
    }

    public resultHistoryData: KnockoutObservableArray<ResultHistoryVM.TestResultHistoryPrimaryDataViewModel> = ko.observableArray(<ResultHistoryVM.TestResultHistoryPrimaryDataViewModel[]>[]);
    private _currentResult: Contracts.TestCaseResult;
    private _groupBy: string;
}

export class TestResultHistoryView extends Controls.BaseControl {

    constructor(options?) {
        super($.extend({
            cssClass: "result-history-view"
        }, options));
    }

    public initialize() {

        if (Performance.getScenarioManager().getScenarios(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultHistory)) {
            Performance.getScenarioManager().abortScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultHistory);
        }            

        Performance.getScenarioManager().startScenario(TMUtils.TRAPerfScenarios.Area, TMUtils.TRAPerfScenarios.TestResultHistory);

        super.initialize();

        //clear these on update or refresh

        //create the viewmodel.
        this._resultHistoryData = new ResultHistoryData();

        //create the view layout and controls.
        this._createLayout();

        //set the message area section to show error/info notifications.
        this._setMessageAreaSection();

        //subscribe for changes on the viewmodel for primary data. When it's available, create same number of views & view models for histogram.
        this._disposalManager.addDisposable(this._resultHistoryData.resultHistoryData.subscribe((primaryDataVMs: ResultHistoryVM.TestResultHistoryPrimaryDataViewModel[]) => {
            this._resultHistoryHistogramVMs = [];
            this._resultHistoryHistogramControls = [];

            Utils_Core.delay(this, 10, () => {
                Diag.logInfo("[resultHistoryData.subscribe]: Populated primary data.");

                $.each(primaryDataVMs, (index: number, primaryDataVM: ResultHistoryVM.TestResultHistoryPrimaryDataViewModel) => {

                    let histogramVM: ResultHistoryHistogram.ResultHistoryHistogramViewModel = new ResultHistoryHistogram.ResultHistoryHistogramViewModel(new ResultHistoryHistogram.ResultTrend([]), primaryDataVM.groupKey, primaryDataVM.filterContext);

                    this._resultHistoryHistogramVMs.push(histogramVM);
                    this._resultHistoryHistogramControls.push(<ResultHistoryHistogram.ResultHistoryHistogramControl>Controls.BaseControl.createIn(ResultHistoryHistogram.ResultHistoryHistogramControl, $(this._layout.find(".history-histogram-container")[index]), histogramVM));
                });
                this._resultHistoryData.getHistogramData(this._resultHistoryHistogramVMs, this._resultHistoryHistogramControls);
            });
        }));

        TelemetryService.publishEvents(TelemetryService.featureRunsHubHistory_Load, {
            "Action": "Direct"
        });
    }

    public showErrorStrip(message: string, isInfo?: boolean) {
        if (isInfo) {
            this._messageAreaViewModel.logInfo(message);
        }
        else {
            this._messageAreaViewModel.logError(message);
        }
    }

    /// <summary>
    /// This is used to change group by pivot in history view.
    /// </summary>
    public updateGroupBy(runId: number, resultId: number, selectedGroupBy?: string): void {
        Diag.logInfo("[TestResultHistoryView.updateGroupBy]: method called");

        this._currentRunId = runId;
        this._currentResultId = resultId;
    
        let newPivot = this._groupByControl.getGroupbyOptionById(selectedGroupBy);
        this._groupByControl._pivotFilter.setSelectedItem(newPivot, false);

        let selectedPivot = this._groupByControl._pivotFilter.getSelectedItem();
        this._groupByControl.groupByOption(selectedPivot.id);
    }

     /// <summary>
    /// This will get called from ExplorerView when history tab is shown -OR- post group by pivot change in history view
    /// </summary>
    public updateResult(runId: number, resultId: number): IPromise<string> {
        Diag.logInfo("[TestResultHistoryView.updateResult]: method called");

        //Clear these on update or refresh
        this._resultHistoryHistogramVMs = [];
        this._resultHistoryHistogramControls = [];

        //Clear the message area section
        this._messageAreaViewModel.clearDelegate();

        //update the view model with this result
        return this._resultHistoryData.update(runId, resultId, this._selectedGroupbyOption);
    }

    public getStatusText(): string {
        return Utils_String.empty;
    }

    /// <summary>
    /// defines the message area section
    /// </summary>
    private _setMessageAreaSection(): void {
        Diag.logVerbose("[TestResultHistoryView._setMessageAreaSection]: method called.");

        let historyView = this._layout.find(".result-history-view");

        if (!historyView) {
            Diag.logWarning("[TestResultHistoryView._setMessageAreaSection]: historyView is null");
            return;
        }

        this._messageAreaViewModel = new MessageArea.MessageAreaViewModel();

        this._messageArea = <MessageArea.MessageAreaView>Controls.BaseControl.enhance(MessageArea.MessageAreaView, this._layout.find(".message-area-part"), {
            viewModel: this._messageAreaViewModel,
            closeable: false
        });

        this._disposalManager.addDisposable(this._messageAreaViewModel.logError.subscribe(() => {
            historyView.hide();
        }));

        this._disposalManager.addDisposable(this._messageAreaViewModel.logInfo.subscribe(() => {
            historyView.hide();
        }));
    }

    /// <summary>
    /// Refresh the view with latest data.
    /// </summary>
    private _refresh() {
        Diag.logInfo("[TestResultHistoryView.refresh] - Called");
        this.updateResult(this._currentRunId, this._currentResultId).then(() => {
        }, (error) => {
            this.showErrorStrip(error.message, error.isInfo);
        });

        TelemetryService.publishEvents(TelemetryService.featureRunsHubHistory_Load, {
            "Action": "ReloadButtonClicked"
        });
    }

    /// <summary>
    /// Handlers for toolbar item click.
    /// </summary>
    private _handleToolbarItemClick(command: string) {
        if (Utils_String.equals(command, ResultHistoryCommon.ResultHistoryCommands.Refresh)) {
            this._refresh();
        }
    }

    /// <summary>
    /// Populate controls in view
    /// <summary>
    private _populateControls() {
        this._groupByControl = <ResultHistoryControls.ResultHistoryGroupByControl>Controls.BaseControl.createIn(ResultHistoryControls.ResultHistoryGroupByControl, this._layout.find(".groupby-section"));
        this._disposalManager.addDisposable(this._groupByControl.groupByOption.subscribe((option: string) => {
            this._handlePivotChanged(option);
        }));

        ReactDOM.render(React.createElement<FilterControl.IDropDownFilterProps>(FilterControl.DropDownFilter,
            <FilterControl.IDropDownFilterProps>{
                filterOptions: this._getFilterOptions()
            }),
            this._layout.find(".filters-section")[0]);

        this._leftToolbar = this._createLeftToolbar();

        this._layout.find(".filters-section").hide();
        this._layout.find(".control-separator").hide();
    }


    /// <summary>
    /// Handler for group pivot change.
    /// </summary>
    private _handlePivotChanged(command: string) {
        this._selectedGroupbyOption = ResultHistoryCommon.ResultHistoryCommands.MapGroupByCommandToPivot[command];

        if (this._selectedGroupbyOption === ResultHistoryCommon.ResultHistoryGroupPivots.Group_By_Environment) {
            this._layout.find(".filters-section").show();
            this._layout.find(".control-separator").show();
            TelemetryService.publishEvents(TelemetryService.featureRunsHubHistory_GroupByEnvironmentSelected, {});
        } else {
            this._layout.find(".filters-section").hide();
            this._layout.find(".control-separator").hide();
            TelemetryService.publishEvents(TelemetryService.featureRunsHubHistory_GroupByBranchSelected, {});
        }

        this.updateResult(this._currentRunId, this._currentResultId).then(() => {
        }, (error) => {
            this.showErrorStrip(error.message, error.isInfo);
        });
    }

    private _createLeftToolbar(options?) {
        let toolbarItems = this._createLeftToolbarItems();
        let $toolbar = this._layout.find(".result-history-toolbar-left");

        let toolbar = <Menus.MenuBar>Controls.BaseControl.createIn(Menus.MenuBar, $toolbar, {
            items: toolbarItems,
            executeAction: delegate(this, this._onToolbarItemClick)
        });

        return toolbar;
    }

    private _createLeftToolbarItems() {
        let items = [];
        items.push({ id: ResultHistoryCommon.ResultHistoryCommands.Refresh, showText: false, title: Resources.Refresh, icon: "bowtie-icon bowtie-navigate-refresh" });
        return items;
    }

    private _onToolbarItemClick(e?) {
        let command = e.get_commandName();
        this._handleToolbarItemClick(command);
    }

    private _createLayout(): void {
        this._element.empty();
        this._element.addClass("result-history-view");

        this._layout = $(
            `<div class='controls-section' >
                <div class='left-section left'>
                    <div class='toolbar-section left' >
                        <div class='toolbar result-history-toolbar-left'>
                        </div>
                    </div>
                </div>
                <div class='right-section right' >
                    <div class='filters-section left' />
                    <div class='control-separator left' />
                    <div class='groupby-section left' />
                    <div class='toolbar-section right' >
                        <div class='toolbar result-history-toolbar'>
                        </div>
                    </div>
                </div>
            </div>

             <div class='result-history-view-container' >
                <div class='message-area-part' />
                <div class='test-result-history-section' >
                     <table class='result-history-table' >
                           <tbody class='result-history-table-body'>

                             <!-- ko foreach: resultHistoryData -->
                                 <tr class='result-history-row' >
                                    <td class='result-history-col-primary' >
                                       <div class='result-history-group-cell' >

                                            <div class='result-history-group-cell-head'>
                                                <div class='result-branch-container'>
                                                    <span data-bind='css: groupIcon'  class='result-history-group-cell-icon bowtie-icon' />
                                                    <span data-bind='text: groupValue' class='result-history-group-cell-title' />
                                                </div>
                                                <div class='result-history-status-container'>
                                                    <span class='result-history-group-cell-status-container'>
                                                        <span data-bind='css: latestResultIcon' class='result-history-group-cell-last-result-outcome bowtie-icon' />
                                                        <span data-bind='text: latestResultOutcome' class='result-history-group-cell-status-text' />
                                                    </span>
                                                    <span data-bind='text: latestResultAgoText' class='result-history-group-cell-subtle-text' />
                                                </div>
                                            </div>
                                            <div class='result-history-group-cell-subtle'>
                                                <div class='latest-result-container'>
                                                    <span data-bind='text: latestResultText' class='result-history-group-cell-latest-result-subtle-text' />
                                                    <span><a data-bind='text: latestResultWorkflowRef, attr: {href: latestResultWorkflowUrl}' target="_blank" rel="nofollow noopener noreferrer"></a>
                                                    </span>
                                                </div>
                                                <div data-bind="visible: showFailingSince" class='failing-since-container'>
                                                    <span data-bind='text: failingSinceText' class='result-history-group-cell-failing-since-subtle-text' />
                                                    <span><a data-bind='text: failingSinceWorkflowRef, attr: {href: failingSinceWorkflowUrl}' target="_blank" rel="nofollow noopener noreferrer"></a>
                                                    </span>
                                                </div>
                                            </div>

                                       </div>
                                    </td>
                                    <td class='result-history-col-history' >
                                       <div class='history-histogram-container' >
                                       </div>
                                    </td>
                                 </tr>
                            <!-- /ko -->

                           </tbody>
                     </table>
                </div>
            </div>`
            );

        this._layout.appendTo(this._element);

        this._populateControls();

        ko.applyBindings(this._resultHistoryData, this._element.find(".result-history-table-body")[0]);
    }

    private _getFilterOptions(): FilterControl.IFilterOptions[] {
        return <FilterControl.IFilterOptions[]>[
            {

                text: Resources.BranchText,
                icon: "bowtie-icon bowtie-tfvc-branch",
                showText: true,
                rank: 1,
                getItemList: delegate(this, this._getBranchList),
                onFilterSelected: delegate(this, this._onFilterChanged)
            }
        ];
    }

    private _getBranchList(): IPromise<CommonBase.IItem[]> {
        let deferred: Q.Deferred<CommonBase.IItem[]> = q.defer<CommonBase.IItem[]>();
        let buildId: number;
        let build: Contracts.ShallowReference;
        build = this._resultHistoryData.getCurrentResult().build;
        if (!build) {
            return q.resolve([]);
        }
        buildId = parseInt(build.id);

        let promise = TMService.ServiceManager.instance().buildService().getBuild(buildId).then((build: BuildContracts.Build) => {

            switch (build.repository.type) {
                case RepositoryTypes.TfsGit:
                    let repoId: string = build.repository.id;
                    return TMService.ServiceManager.instance().gitService().getRefs(repoId).then((refs: VCContracts.GitRef[]) => {
                        return deferred.resolve(<CommonBase.IItem[]>refs.filter((ref: VCContracts.GitRef) => {
                            return !Utils_String.caseInsensitiveContains(ref.name, "refs/pull");
                        }).map((ref: VCContracts.GitRef) => {
                            return <CommonBase.IItem>{
                                name: ref.name
                            };
                        }));
                    }, (error) => {
                        Diag.logWarning(Utils_String.format("No branches found. error: {0}", error.message || error.toString()));
                        deferred.resolve([]);
                    });
                case RepositoryTypes.TfsVersionControl:
                    return TMService.ServiceManager.instance().tfvcService().getBranches(build.project.name).then((branches: VCContracts.TfvcBranch[]) => {
                        return deferred.resolve(<CommonBase.IItem[]>branches.map((branch: VCContracts.TfvcBranch) => {
                            return <CommonBase.IItem>{
                                name: branch.path
                            };
                        }));
                    }, (error) => {
                        Diag.logWarning(Utils_String.format("No branches found. error: {0}", error.message || error.toString()));
                        return deferred.resolve([]);
                    });
                default:
                    Diag.logWarning(Utils_String.format("Unsupported repository type. RepositoryType: {0}", build.repository.type));
                    return deferred.resolve([]);
            }
        }, (error) => {
            Diag.logWarning(Utils_String.format("No branches found. error: {0}", error.message || error.toString()));
            deferred.resolve([]);
        });

        return deferred.promise;
    }

    private _onFilterChanged(item: CommonBase.IItem): void {
        let currentResult: Contracts.TestCaseResult = this._resultHistoryData.getCurrentResult();
        this._resultFilter = <Contracts.ResultsFilter>{
            branch: (item) ? item.name : Utils_String.empty
        };

        if (currentResult) {

            //Clear these on update or refresh
            this._resultHistoryHistogramVMs = [];
            this._resultHistoryHistogramControls = [];

            //Clear the message area section
            this._messageAreaViewModel.clearDelegate();

            this._resultHistoryData.resultHistoryData([]);

            this._resultHistoryData.updateTestCaseResultHistory(currentResult, this._resultFilter).then(() => {
                Diag.logVerbose("Data rows refreshed after filter changed.");
            }, (error) => {
                this.showErrorStrip(error.message, error.isInfo);
            });
        }
    }

    protected _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();

    private _currentRunId: number;
    private _currentResultId: number;

    private _layout: JQuery;
    protected _groupByControl: ResultHistoryControls.ResultHistoryGroupByControl;
    private _leftToolbar: Menus.MenuBar;
    private _messageArea: MessageArea.MessageAreaView;
    private _resultHistoryHistogramControls: ResultHistoryHistogram.ResultHistoryHistogramControl[];

    private _resultFilter: Contracts.ResultsFilter;
    private _resultHistoryData: ResultHistoryData;
    private _resultHistoryHistogramVMs: ResultHistoryHistogram.ResultHistoryHistogramViewModel[];
    private _messageAreaViewModel: MessageArea.MessageAreaViewModel;

    private _selectedGroupbyOption: string;
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("TestResultHistory.View", exports);
