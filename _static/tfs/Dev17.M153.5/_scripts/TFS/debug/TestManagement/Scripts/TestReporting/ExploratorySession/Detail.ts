/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/
import ko = require("knockout");

import SessionListVM = require("TestManagement/Scripts/TestReporting/ExploratorySession/ListViewModel");
import ViewModel = require("TestManagement/Scripts/TestReporting/ExploratorySession/ViewModel");
import SessionGrid = require("TestManagement/Scripts/TestReporting/ExploratorySession/GridView");
import * as CommonBase from "TestManagement/Scripts/TestReporting/Common/Common";
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import WITForm = require("WorkItemTracking/Scripts/Controls/WorkItemForm");
import ManualUtils = require("TestManagement/Scripts/TestReporting/ExploratorySession/Utils");

import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import ExploratorySessionSummaryViewModel = ViewModel.ExploratorySessionSummaryViewModel;
import Charts = require("TestManagement/Scripts/TestReporting/ExploratorySession/Charts");

export interface ISessionDetailViewOptions {
    container: JQuery;
    viewModel: SessionListVM.SessionListViewModel;
}

/// <summary>
/// View which populate session grid and right pane summary both..
/// </summary>
export class SessionDetailView {
    private _bodySection: JQuery;
    private _viewModel: SessionListVM.SessionListViewModel;
    private _sessionGridView: SessionGrid.SessionGridView;
    private _sessionSummaryViewWrapper: SessionSummaryViewWrapper;
    private _summaryViewWorkItemSubscription: IDisposable;

    constructor(options: ISessionDetailViewOptions) {
        this._bodySection = options.container;
        this._viewModel = options.viewModel;
        this._populate();
    }

    public handleCommand(command: string): void {
        this._sessionGridView.handleCommand(command);
    }

    public handlePivotChanged(option: string, filterType: Common.Filters): void {
        this._sessionGridView.handlePivotChanged(option, filterType);
    }

    public applySettings(): void {
        this._sessionGridView.applySettings();
    }

    public dispose(): void {
        if (this._sessionGridView) {
            this._sessionGridView.dispose();
            this._sessionGridView = null;
        }
        if (this._sessionSummaryViewWrapper) {
            this._sessionSummaryViewWrapper.dispose();
            this._sessionSummaryViewWrapper = null;
        }
        if (this._summaryViewWorkItemSubscription) {
            this._summaryViewWorkItemSubscription.dispose();
            this._summaryViewWorkItemSubscription = null;
        }
    }

    private _populate(): void {
        Diag.logVerbose("[SessionDetailView._populate]: Creating session grid and details pane");

        this._sessionGridView = <SessionGrid.SessionGridView>Controls.BaseControl.enhance(SessionGrid.SessionGridView, this._bodySection.find(".exploratory-session-grid"), <SessionGrid.ISessionGridViewOptions>{
            viewModel: this._viewModel
        });

        this._summaryViewWorkItemSubscription = this._viewModel.summaryViewWorkItem.subscribe((summaryViewWorkItem: SessionListVM.IGridItem) => {
            this._sessionSummaryViewWrapper = <SessionSummaryViewWrapper>Controls.BaseControl.enhance<ISessionSummaryViewWrapperOptions>(SessionSummaryViewWrapper, this._bodySection.find(".exploratory-session-result-section"), {
                viewModel: this._viewModel.summaryViewWorkItem
            });
        });
    }
}

export interface ISessionSummaryViewWrapperOptions {
    viewModel: KnockoutObservable<SessionListVM.IGridItem>;
}

/// <summary>
/// View for right pane summary.
/// </summary>
export class SessionSummaryViewWrapper extends Controls.BaseControl {
    public viewModel: KnockoutObservable<SessionListVM.IGridItem>;
    private _workItemForm: any;
    private _summaryForm: any;
    private _viewModelSubscription: IDisposable;

    public initializeOptions(options: ISessionSummaryViewWrapperOptions) {
        this.viewModel = options.viewModel;
        super.initializeOptions(options);
    }

    public initialize() {
        super.initialize();
        this._viewModelSubscription = this.viewModel.subscribe((sessionSummaryWorkItem: SessionListVM.IGridItem) => {
            this._refreshView(sessionSummaryWorkItem);
        });
        this._refreshView(this.viewModel());
    }

    public dispose(): void {
        if (this._summaryForm) {
            this._summaryForm.dispose();
            this._summaryForm = null;
        }
        if (this._workItemForm) {
            this._workItemForm.dispose();
            this._workItemForm = null;
        }
        if (this._viewModelSubscription) {
            this._viewModelSubscription.dispose();
            this._viewModelSubscription = null;
        }
        $(".work-item-section").remove();
        $(".summary-section").remove();
        super.dispose();
    }

    private _refreshView(sessionSummaryWorkItem: SessionListVM.IGridItem) {
        let workItemDiv = this._element.find(".work-item-section");
        let summaryDiv = this._element.find(".summary-section");

        switch (this.viewModel().rowType) {

            case ManualUtils.GridRowType.Session:
            case ManualUtils.GridRowType.SessionOwner:
            case ManualUtils.GridRowType.WorkItemExplored:
                if (this._summaryForm) {
                    this._summaryForm.setViewModel(sessionSummaryWorkItem);
                } else {
                    this._summaryForm = Controls.Enhancement.enhance(SessionSummaryView, summaryDiv, { selectedRow: sessionSummaryWorkItem });
                }
                if (this._workItemForm) {
                     this._workItemForm.hideElement();
                }
                else {
                    if (workItemDiv) {
                        workItemDiv.hide();
                    }
                }
                this._summaryForm.showElement();
                break;

            case ManualUtils.GridRowType.FlatWorkItem:
                if (this.viewModel().id > 0) {
                    this._loadWorkItemForm(workItemDiv, () => {
                        this._workItemForm.beginShowWorkItem(sessionSummaryWorkItem.id, () => {
                        });
                    });
                }
                if (this._summaryForm) {
                    this._summaryForm.hideElement();
                }
                else {
                    if (summaryDiv) {
                        summaryDiv.hide();
                    }
                }
                this._workItemForm.showElement();
                break;
        }
    }

    private _loadWorkItemForm(detailsDiv: JQuery, callback: any) {
        if (this._workItemForm) {
            if (callback) {
                callback();
            }
        } else {
            Diag.logVerbose("[SessionSummaryViewWrapper]: Creating workitem form control");

            this._workItemForm = Controls.Enhancement.enhance(WITForm.WorkItemForm, detailsDiv, {
                tfsContext: this._options.tfsContext,
                toolbar: {
                    inline: true
                },
                close: function() {
                    return false;
                }
            });

            if (callback) {
                callback();
            }
        }
    }
}

export interface ISessionSummaryViewOptions {
    selectedRow: SessionListVM.IGridItem;
}

export class SessionSummaryView extends Controls.BaseControl {

    private _viewModel: ViewModel.ISessionSummaryViewModel;
    private _layout: JQuery;
    private _bugsByPriorityChart: Charts.BugsByPriorityChart;
    private _bugsByStateChart: Charts.BugsByStateChart;
    private _tasksByStateChart: Charts.TasksByStateChart;

    public initializeOptions(options: ISessionSummaryViewOptions) {
        super.initializeOptions(options);
        this.setViewModel(options.selectedRow);
    }

    public initialize() {
        super.initialize();

        this._createlayout();

        this._enhanceControls();

        ko.applyBindings(this._viewModel, this._element[0]);
    }

    public dispose(): void {
        if (this._bugsByPriorityChart) {
            this._bugsByPriorityChart.dispose();
            this._bugsByPriorityChart = null;
        }
        if (this._bugsByStateChart) {
            this._bugsByStateChart.dispose();
            this._bugsByStateChart = null;
        }
        if (this._tasksByStateChart) {
            this._tasksByStateChart.dispose();
            this._tasksByStateChart = null;
        }
        if (this._viewModel.tile1ViewModel()) {
            this._viewModel.tile1ViewModel(null);
        }
        if (this._viewModel.tile2ViewModel()) {
            this._viewModel.tile2ViewModel(null);
        }
        if (this._viewModel.tile3ViewModel()) {
            this._viewModel.tile3ViewModel(null);
        }
        super.dispose();
    }

    public setViewModel(selectedRow: SessionListVM.IGridItem) {
        if (!this._viewModel) {
            this._viewModel = new ExploratorySessionSummaryViewModel(selectedRow);
        } else {
            let viewContextData: Common.IViewContextData = {
                viewContext: null,
                data: { mainData: selectedRow }
            };
            this._viewModel.load(viewContextData);
        }
    }

    private _enhanceControls() {
        this._bugsByPriorityChart = <Charts.BugsByPriorityChart>Controls.Control.enhance(Charts.BugsByPriorityChart, this._element.find(".bugs-by-priority"), <ExploratorySessionSummaryViewModel>this._viewModel);
        this._bugsByStateChart = <Charts.BugsByStateChart>Controls.Control.enhance(Charts.BugsByStateChart, this._element.find(".bugs-by-state"), <ExploratorySessionSummaryViewModel>this._viewModel);
        this._tasksByStateChart = <Charts.TasksByStateChart>Controls.Control.enhance(Charts.TasksByStateChart, this._element.find(".tasks-by-state"), <ExploratorySessionSummaryViewModel>this._viewModel);
    }

    private _createlayout() {
        this._layout = $(
            `<div class='exploratory-session-summary'>
                
                <div class='details'>
                    <div class='count-area'>
                        <div class='header' data-bind='text: header'></div>
                        <div class='sub-header' data-bind='html: subHeader'></div>
                        <div class='summary-tile'>
                            <div class='title' data-bind='text: tile1ViewModel().title()'></div>
                            <div class='highlighted-content' data-bind='text: tile1ViewModel().highlightedContent()'></div>
                            <div class='content' data-bind='text: tile1ViewModel().content()'></div>
                        </div>
                        <div class='separator'></div>
                        <div class='summary-tile'>
                            <div class='title' data-bind='text: tile2ViewModel().title()'></div>
                            <div class='highlighted-content' data-bind='text: tile2ViewModel().highlightedContent()'></div>
                            <div class='content' data-bind='text: tile2ViewModel().content()'></div>
                        </div>
                        <div class='separator'></div>
                        <div class='summary-tile'>
                            <div class='title' data-bind='text: tile3ViewModel().title()'></div>
                            <div class='highlighted-content' data-bind='text: tile3ViewModel().highlightedContent()'></div>
                            <div class='content' data-bind='text: tile3ViewModel().content()'></div>
                        </div>
                    </div>
                    <div data-bind='visible: showBugsCharts()' class='chart-table-row'>
                        <div class='bugs-by-priority chart'></div>
                        <div class='bugs-by-state chart'></div>
                    </div>
                    <div data-bind='visible: showTasksCharts()' class='tasks-by-state chart'></div>
                </div>
            </div>`
        );

        this._element.append(this._layout);
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/Detail", exports);
