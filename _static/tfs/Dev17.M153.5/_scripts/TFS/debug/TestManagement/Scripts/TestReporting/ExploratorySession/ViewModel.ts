/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

import ko = require("knockout");
import q = require("q");

import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import ViewModel = require("TestManagement/Scripts/TestReporting/ExploratorySession/ResultsViewModel");
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import ManualUtils = require("TestManagement/Scripts/TestReporting/ExploratorySession/Utils");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import SessionListVM = require("TestManagement/Scripts/TestReporting/ExploratorySession/ListViewModel");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Adapters_Knockout = require("VSS/Adapters/Knockout");
import TCMContracts = require("TFS/TestManagement/Contracts");
import Performance = require("VSS/Performance");
import VSS = require("VSS/VSS");

export class ExploratorySessionChartsViewModel implements ViewModel.IManualResultViewModel {

    // WorkItem explored
    public workItemExplored: KnockoutObservableArray<ManualUtils.IExploratorySessionWorkItemDetails> = ko.observableArray<ManualUtils.IExploratorySessionWorkItemDetails>([]);
    public totalworkItemExplored: KnockoutObservable<number> = ko.observable(0);
    public totalCustomQueryWorkItemCount: KnockoutObservable<number> = ko.observable(0);
    public unExploredWorkItemCount: KnockoutObservable<number> = ko.observable(0);
    public showUnExploredChart: KnockoutObservable<boolean> = ko.observable(false);
    public noWorkItemExploredText: string = Resources.NoWorkItemExploredText;

    // WorkItem filed
    public workItemFiled: KnockoutObservableArray<ManualUtils.IExploratorySessionWorkItemDetails> = ko.observableArray<ManualUtils.IExploratorySessionWorkItemDetails>([]);
    public totalworkItemFiled: KnockoutObservable<number> = ko.observable(0);
    public noWorkItemFiledText: string = Resources.NoWorkItemFiledText;

    // Session owners
    public sessionOwners: KnockoutObservableArray<ManualUtils.IExploratorySessionOwnerDetails> = ko.observableArray<ManualUtils.IExploratorySessionOwnerDetails>([]);
    public sessionOwnersCount: KnockoutObservable<number> = ko.observable(0);

    // Session duration
    public sessionDuration: KnockoutObservable<string> = ko.observable("0.00");

    public updateViewFlag: KnockoutObservable<boolean> = ko.observable(false);

    private _messageViewModel: MessageArea.MessageAreaViewModel;

    constructor(messageViewModel: MessageArea.MessageAreaViewModel, viewModelList: ViewModel.ResultsViewModel) {
        viewModelList.add(this);
        this._messageViewModel = messageViewModel;
    }

    /**
     * Load data to update exploratory session view.
     *
     * @param viewContextdata View model object binded to exploratory session view.
     * @publicapi
     */
    public load(viewContextdata: Common.IViewContextData): IPromise<void> {
        let witIds: number[] = viewContextdata.data.subData;
        let deferred: Q.Deferred<void> = q.defer<void>();
        
        let testSessions: TCMContracts.TestSession[] = viewContextdata.data.mainData;
        if (witIds) {
            ManualUtils.generateExploratorySessionHeaderChartDetailsWithCustomQuery(testSessions, witIds)
                .then((chartsDetails: ManualUtils.IExploratorySessionHeaderChartDetails) => {
                    this._initalize(chartsDetails, witIds);
                    deferred.resolve(null);
                });
        } else {
            let chartsDetails: ManualUtils.IExploratorySessionHeaderChartDetails = ManualUtils.generateExploratorySessionHeaderChartDetails(testSessions);
            this._initalize(chartsDetails, null);
            deferred.resolve(null);
        }
        return deferred.promise;
    }

    /**
     * Doing nothing here.
     *
     * @publicapi
     */
    public handleOnDisplayed(): void {
        // Do nothing...
    }

    private _initalize(chartsDetails: ManualUtils.IExploratorySessionHeaderChartDetails, witIds: number[]) {
        this._loadData(chartsDetails, witIds);
        this.updateViewFlag(!this.updateViewFlag());
        Performance.getScenarioManager().split(TMUtils.TcmPerfScenarios.LoadExploratorySessionHeaderCharts);
    }

    private _loadData(details: ManualUtils.IExploratorySessionHeaderChartDetails, witIds: number[]) {

        // load workitem explroed
        this.workItemExplored(details.workItemExplored);
        this.totalworkItemExplored(details.workItemExploredCount);

        // load unexplored workitem
        if (witIds) {
            this.showUnExploredChart(true);
            this.totalCustomQueryWorkItemCount(details.unExploredWorkItemCount + details.workItemExploredCount);
            this.unExploredWorkItemCount(details.unExploredWorkItemCount);
        } else {
            this.showUnExploredChart(false);
        }
        

        // load workitem filed
        this.workItemFiled(details.workItemFiled);
        this.totalworkItemFiled(details.workItemFiledCount);

        // load session owners
        this.sessionOwners(details.sessionOwners);
        this.sessionOwnersCount(details.sessionOwnersCount);

        // load session Duration
        this.sessionDuration(details.sessionDuration);
    }
}

export class ExploratorySessionViewModel extends Adapters_Knockout.TemplateViewModel {
    private _exploratorySessionChartsViewModel: ExploratorySessionChartsViewModel;
    private _messageAreaViewModel: MessageArea.MessageAreaViewModel;
    private _sessionListMessageAreaViewModel: MessageArea.MessageAreaViewModel;
    private _resultsViewModel: ViewModel.ResultsViewModel;
    private _sessionListViewModel: SessionListVM.SessionListViewModel;

    constructor(viewModel: ViewModel.ResultsViewModel) {
        super();
        this._resultsViewModel = viewModel;
    }

    /**
     * Get view model object for exploratory session charts.
     *
     * @publicapi
     */
    public getExploratorySessionChartsViewModel(): ExploratorySessionChartsViewModel {
        if (!this._exploratorySessionChartsViewModel) {
            this._exploratorySessionChartsViewModel = new ExploratorySessionChartsViewModel(this.getMessageAreaViewModel(), this._resultsViewModel);
        }
        return this._exploratorySessionChartsViewModel;
    }

    /**
     * Get view model object for message area.
     *
     * @publicapi
     */
    public getMessageAreaViewModel(): MessageArea.MessageAreaViewModel {
        if (!this._messageAreaViewModel) {
            this._messageAreaViewModel = new MessageArea.MessageAreaViewModel();
        }
        return this._messageAreaViewModel;
    }

    /**
     * Get view model object for grid.
     *
     * @publicapi
     */
    public getSessionListViewModel(): SessionListVM.SessionListViewModel {
        if (!this._sessionListViewModel) {
            this._sessionListViewModel = new SessionListVM.SessionListViewModel(this.getMessageAreaViewModel(), this.getSessionListMessageAreaViewModel(), this._resultsViewModel);
        }
        return this._sessionListViewModel;
    }


    /**
     * Get view model object for grid list message area.
     *
     * @publicapi
     */
    public getSessionListMessageAreaViewModel(): MessageArea.MessageAreaViewModel {
        if (!this._sessionListMessageAreaViewModel) {
            this._sessionListMessageAreaViewModel = new MessageArea.MessageAreaViewModel();
        }
        return this._sessionListMessageAreaViewModel;
    }
}

export interface ISessionSummaryViewModel extends ViewModel.IManualResultViewModel {
    id?: KnockoutObservable<number>;
    header?: KnockoutObservable<string>;
    subHeader?: KnockoutObservable<string>;
    owner?: KnockoutObservable<string>;
    duration?: KnockoutObservable<string>;
    bugsByPriority?: KnockoutObservableArray<ManualUtils.IKeyValuePair>;
    bugsFiledCount?: KnockoutObservable<number>;
    bugsByState?: KnockoutObservableArray<ManualUtils.IKeyValuePair>;
    tasksByState?: KnockoutObservableArray<ManualUtils.IKeyValuePair>;
    tasksFiledCount?: KnockoutObservable<number>;
    tile1ViewModel?: KnockoutObservable<SessionSummaryTileViewModel>;
    tile2ViewModel?: KnockoutObservable<SessionSummaryTileViewModel>;
    tile3ViewModel?: KnockoutObservable<SessionSummaryTileViewModel>;
    showBugsChart?: KnockoutObservable<boolean>;
    showTasksChart?: KnockoutObservable<boolean>;
    load(viewContextdata: Common.IViewContextData): void;
}

export class SessionSummaryTileViewModel {
    title: KnockoutObservable<string> = ko.observable("");
    content: KnockoutObservable<string> = ko.observable("");
    highlightedContent: KnockoutObservable<string> = ko.observable("");
}

export class ExploratorySessionSummaryViewModel extends Adapters_Knockout.TemplateViewModel implements ISessionSummaryViewModel {
    public id: KnockoutObservable<number> = ko.observable(0);
    public owner: KnockoutObservable<string> = ko.observable("");
    public duration: KnockoutObservable<string> = ko.observable("0.00");
    public header: KnockoutObservable<string> = ko.observable("");
    public subHeader: KnockoutObservable<string> = ko.observable("");
    public tile1ViewModel: KnockoutObservable<SessionSummaryTileViewModel> = ko.observable(new SessionSummaryTileViewModel());
    public tile2ViewModel: KnockoutObservable<SessionSummaryTileViewModel> = ko.observable(new SessionSummaryTileViewModel());
    public tile3ViewModel: KnockoutObservable<SessionSummaryTileViewModel> = ko.observable(new SessionSummaryTileViewModel()); 
    public showBugsCharts: KnockoutObservable<boolean> = ko.observable(true);
    public showTasksCharts: KnockoutObservable<boolean> = ko.observable(true);

    // Bugs by priority and state
    public bugsByPriority: KnockoutObservableArray<ManualUtils.IKeyValuePair> = ko.observableArray<ManualUtils.IKeyValuePair>([]);
    public bugsFiledCount: KnockoutObservable<number> = ko.observable(0);
    public bugsByState: KnockoutObservableArray<ManualUtils.IKeyValuePair> = ko.observableArray<ManualUtils.IKeyValuePair>([]);
    public noBugFiledText: string = Resources.NoBugFiledText;

    // Tasks by state 
    public tasksByState: KnockoutObservableArray<ManualUtils.IKeyValuePair> = ko.observableArray<ManualUtils.IKeyValuePair>([]);
    public tasksFiledCount: KnockoutObservable<number> = ko.observable(0);
    public noTaskFiledText: string = Resources.NoTaskFiledText;

    public updateViewFlag: KnockoutObservable<boolean> = ko.observable(false);

    constructor(rowData: SessionListVM.IGridItem) {
        super();
        this._loadData(rowData);
    }
    
    /**
     * Load data to update exploratory session view.
     *
     * @param viewContextdata View model object binded to exploratory session view.
     * @publicapi
     */
    public load(viewContextdata: Common.IViewContextData): void {
        let rowData: SessionListVM.IGridItem = viewContextdata.data.mainData;
        this._loadData(rowData);
    }
    
    /**
    * Doing nothing here.
    *
     * @publicapi
    */
    public handleOnDisplayed(): void {
        // Do nothing...
    }

    private _loadData(rowData: SessionListVM.IGridItem): void {
        if (rowData) {
            let bugsByPriority: ManualUtils.IKeyValuePair[] = [];
            let bugsByState: ManualUtils.IKeyValuePair[] = [];
            let tasksByState: ManualUtils.IKeyValuePair[] = [];
            let bugsFiledCount = 0;
            let tasksFiledCount = 0;
            let workItemsFiled: Array<number> = [];
            let ownerName = rowData.owner ? rowData.owner.displayName : "";

            this.id(rowData.sessionId);
            this.owner(ownerName);
            this.duration(rowData.duration);

            if (rowData.children) {
                rowData.children.map((value, index) => {
                    workItemsFiled.push(value.id);
                });
            }
            
            if (workItemsFiled && workItemsFiled.length > 0) {
                this.fetchWorkItemData(workItemsFiled, (workItems: ManualUtils.ISessionGridViewModel[]) => {
                    workItems.map((workItem, index) => {
                        if (this.checkWorkItemCategory(workItem, ManualUtils.WorkItemCategories.BugCategory)) {
                            bugsFiledCount++;
                            let filteredBugs = bugsByPriority.filter((keyValPair, index, array) => {
                                if (keyValPair.key === workItem.priority.toString()) {
                                    keyValPair.value++;
                                    return true;
                                }
                                return false;
                            });
                            if (filteredBugs.length < 1) {
                                bugsByPriority.push({ key: workItem.priority.toString(), value: 1 });
                            }
                            filteredBugs = bugsByState.filter((keyValPair, index, array) => {
                                if (keyValPair.key === workItem.state) {
                                    keyValPair.value++;
                                    return true;
                                }
                                return false;
                            });
                            if (filteredBugs.length < 1) {
                                bugsByState.push({ key: workItem.state, value: 1 });
                            }
                        } else if (this.checkWorkItemCategory(workItem, ManualUtils.WorkItemCategories.TaskCategory)) {
                            tasksFiledCount++;
                            let filteredTasks = tasksByState.filter((keyValPair, index, array) => {
                                if (keyValPair.key === workItem.state) {
                                    keyValPair.value++;
                                    return true;
                                }
                                return false;
                            });
                            if (filteredTasks.length < 1) {
                                tasksByState.push({ key: workItem.state, value: 1 });
                            }
                        }
                    });
                    this._refreshView(rowData, bugsByPriority, bugsByState, tasksByState, bugsFiledCount, tasksFiledCount);
                });
            } else {
                this._refreshView(rowData, bugsByPriority, bugsByState, tasksByState, bugsFiledCount, tasksFiledCount);
            }
        }
    }

    private fetchWorkItemData(workItemsFiled: Array<number>, onSuccess): void {
        let promise = ManualUtils.fetchWorkItemData(workItemsFiled);
        promise.then((workItems: ManualUtils.ISessionGridViewModel[]) => {
            onSuccess(workItems);
        });
    }

    private checkWorkItemCategory(workItem, category): boolean {
        return ManualUtils.WorkItemMetaDataCache.getCategory(workItem.type) === category;
    }

    private _refreshView(rowData, bugsByPriority, bugsByState, tasksByState, bugsFiledCount, tasksFiledCount) {
        let ownerName = rowData.owner ? rowData.owner.displayName : "";
        let rowTypeString = ManualUtils.GridRowType[rowData.rowType];
        this.showBugsCharts(false);
        this.showTasksCharts(false);

        if (rowData.filterBy === ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_All) {
            this.showBugsCharts(true);
            this.showTasksCharts(true);
        }
        else if (rowData.filterBy === ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_Bug) {
            this.showBugsCharts(true);
        }
        else if (rowData.filterBy === ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_Task) {
            this.showTasksCharts(true);
        }

        switch (rowData.rowType) {
            case ManualUtils.GridRowType.SessionOwner:
                this.header(Resources.SessionInsightSessionOwnerHeader);
                this.subHeader(ownerName);
                this.tile1ViewModel().title(Resources.SessionInsightSessionCountTitle);
                this.tile1ViewModel().highlightedContent(rowData.sessionCount.toString());
                this.tile1ViewModel().content("");
                this.tile2ViewModel().title(Resources.SessionInsightTotalDurationTitle);
                this.tile2ViewModel().highlightedContent(rowData.duration);
                this._populateWorkItemsExploredVM(rowData);
                break;

            case ManualUtils.GridRowType.WorkItemExplored:
                this.header(Resources.SessionInsightExploredWorkItemHeader);
                this.subHeader(this._populateWorkItemSubHeader(rowData));
                this.tile1ViewModel().title(Resources.SessionInsightSessionCountTitle);
                this.tile1ViewModel().highlightedContent(rowData.sessionCount.toString());
                this.tile1ViewModel().content("");
                this.tile2ViewModel().title(Resources.SessionInsightTotalDurationTitle);
                this.tile2ViewModel().highlightedContent(rowData.duration);
                let artifacts = ManualUtils.bucketArtifacts(rowData.sessionOwners);
                this.tile3ViewModel().title(Resources.SessionInsightSessionOwnersTitle);
                this.tile3ViewModel().highlightedContent(artifacts.length.toString());
                let topKeyValuePairs = ManualUtils.getTopNKeyValuePairs(artifacts, 3);
                let multiLineContent = "";
                topKeyValuePairs.map((element, index) => {
                    if (multiLineContent !== "") {
                        multiLineContent += ", ";
                    }
                    multiLineContent += ManualUtils.getSessionOwnerDisplayName(element.key) + " (" + element.value + ")";
                });
                this.tile3ViewModel().content(multiLineContent);
                break;

            case ManualUtils.GridRowType.Session:
                this.header(Resources.SessionInsightSessionHeader);
                this.subHeader(rowTypeString + " " + rowData.sessionId.toString());
                this.tile1ViewModel().title(Resources.SessionInsightSessionOwnerTitle);
                this.tile1ViewModel().content(ownerName);
                this.tile1ViewModel().highlightedContent("");
                this.tile2ViewModel().title(Resources.SessionInsightTotalDurationTitle);
                this.tile2ViewModel().highlightedContent(rowData.duration);
                this._populateWorkItemsExploredVM(rowData);
                break;
        }

        this.bugsByPriority(bugsByPriority);
        this.bugsByState(bugsByState);
        this.tasksByState(tasksByState);
        this.bugsFiledCount(bugsFiledCount);
        this.tasksFiledCount(tasksFiledCount);
        this.updateViewFlag(!this.updateViewFlag());
    }

    private _populateWorkItemSubHeader(rowData: SessionListVM.IGridItem): string {
        let $workItemUrl = $("<div class='workitem-url' />").append($("<a />").attr({ "href": rowData.url, "target": "_blank", "rel": "nofollow noopener noreferrer" }).text(rowData.workItemType + " " + rowData.id));
        let $workItemTitle = $("<div class='workitem-title' />").text(rowData.title);
        let $subHeader = $("<div />").append($workItemUrl).append($workItemTitle);
        return $subHeader[0].innerHTML;
    }

    private _populateWorkItemsExploredVM(rowData): void {
        let artifacts = ManualUtils.bucketArtifacts(rowData.workItemExplored);
        this.tile3ViewModel().title(Resources.SessionInsightWorkItemsExploredTitle);
        this.tile3ViewModel().highlightedContent(rowData.workItemExplored.length.toString());
        let topKeyValuePairs = ManualUtils.getTopNKeyValuePairs(artifacts, 3);
        let multiLineContent = "";
        topKeyValuePairs.map((element, index) => {
            if (multiLineContent !== "") {
                multiLineContent += ", ";
            }
            multiLineContent += " " + element.key + " (" + element.value + ")";
        });
        this.tile3ViewModel().content(multiLineContent);
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/ViewModel", exports);
