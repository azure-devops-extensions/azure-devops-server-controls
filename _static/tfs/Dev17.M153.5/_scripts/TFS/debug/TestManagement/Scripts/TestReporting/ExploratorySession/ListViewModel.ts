/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

import ko = require("knockout");
import q = require("q");

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import ViewModel = require("TestManagement/Scripts/TestReporting/ExploratorySession/ResultsViewModel");
import Common = require("TestManagement/Scripts/TestReporting/TestTabExtension/Common");
import ManualUtils = require("TestManagement/Scripts/TestReporting/ExploratorySession/Utils");
import MessageArea = require("TestManagement/Scripts/TFS.TestManagement.MessageArea");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import UserSettings = require("TestManagement/Scripts/TestReporting/ExploratorySession/UserSettings");

import Performance = require("VSS/Performance");
import Adapters_Knockout = require("VSS/Adapters/Knockout");
import TCMContracts = require("TFS/TestManagement/Contracts");
import WITContracts = require("TFS/WorkItemTracking/Contracts");
import Grids = require("VSS/Controls/Grids");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");

export interface IGridItem extends Grids.IGridHierarchyItem {
    id?: number;
    workItemType?: string;
    children?: IGridItem[];
    bugCount?: number;
    taskCount?: number;
    testCaseCount?: number;
    sessionOwners?: string[];
    sessionCount?: number;
    owner?: TFS_Host_TfsContext.IContextIdentity;
    startTime?: string;
    duration?: string;
    workItemExplored?: string[];
    sessionId?: number;
    rowType?: ManualUtils.GridRowType;
    filterBy?: string;
    url?: string;
    title?: string;
}

export class SessionListViewModel extends Adapters_Knockout.TemplateViewModel implements ViewModel.IManualResultViewModel {
    public dataSource: KnockoutObservable<Grids.IGridSource> = ko.observable(null);
    public isCollapseEnabled: boolean;
    public showMessageOnGrid: KnockoutObservable<boolean> = ko.observable(false);
    public summaryViewWorkItem: KnockoutObservable<IGridItem> = ko.observable(null);

    private _defaultGroupByOption: string = ManualUtils.SessionGridGroupPivots.Group_By_ExploredWorkItems;
    private _defaultFilterByOption: string = ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_All;
    private _viewContext: Common.IViewContextData;
    private _hierarchicalDatasource: IDictionaryStringTo<Grids.IGridSource>;
    private _mapIdsToWorkItem: { [key: number]: WITContracts.WorkItem } = {};
    private _resultCache: { [key: number]: ManualUtils.ISessionGridViewModel } = {};
    private _messageViewModel: MessageArea.MessageAreaViewModel;
    private _gridmessageViewModel: MessageArea.MessageAreaViewModel;


    constructor(messageViewModel: MessageArea.MessageAreaViewModel, gridMessageViewModel: MessageArea.MessageAreaViewModel, viewModelList: ViewModel.ResultsViewModel) {
        super();
        this.clearCache();
        viewModelList.add(this);
        this._gridmessageViewModel = gridMessageViewModel;

        this._resultCache = {};
        this.isCollapseEnabled = true;
        this._messageViewModel = messageViewModel;
    }

    public load(viewContextdata: Common.IViewContextData): void {

        // load map for default scenario
        // Group_By_ExploredWorkItems + Filter_By_All
        let sessionQueryParam: ManualUtils.ISessionQueryParameters = {
            groupBy: this.loadSavedGroupBySetting(),
            filter: this.loadSavedFilterBySetting()
        };

        this._defaultGroupByOption = sessionQueryParam.groupBy;
        this._defaultFilterByOption = sessionQueryParam.filter;

        this._viewContext = viewContextdata;
        this._loadData(this._viewContext.data, sessionQueryParam);

        Performance.getScenarioManager().endScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.QueryRecentExploratorySessions);
        Performance.getScenarioManager().endScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.GotoRecentExploratorySessions);
    }

    public loadSavedGroupBySetting() {
        let setting = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings().groupBySetting;
        return ManualUtils.ExploratorySessionToolbarCommands.mapGroupByCommandToPivot[setting];
    }

    public loadSavedFilterBySetting() {
        let setting = UserSettings.ExploratorySessionUserSettings.getInstance().getUserSettings().filterBySetting;
        return ManualUtils.ExploratorySessionToolbarCommands.mapFilterByCommandToPivot[setting];
    }

    public handleOnDisplayed(): void {

    }

    /// <summary>
    /// Updates the default filters
    /// </summary>
    public setDefaultFilters(groupBy: string, outcomeFilter: string) {
        Diag.logVerbose("Setting session list view filters. GroupBy option: " + groupBy + "and outcomeFilter " + outcomeFilter);
        this._defaultGroupByOption = groupBy;
        this._defaultFilterByOption = outcomeFilter;
    }

    /// <summary>
    /// Updates data source based on pivot change
    /// </summary>
    public updateDataSource(groupBy: string, outcomeFilter: string): void {
        Diag.logVerbose("Updating session list data source. GroupBy option: " + groupBy + "and outcomeFilter " + outcomeFilter);

        let sessionQueryParam: ManualUtils.ISessionQueryParameters = {
            groupBy: groupBy,
            filter: outcomeFilter
        };
        this._loadData(this._viewContext.data, sessionQueryParam);
    }

    //Getter for unit tests
    public getDefaultGroupByOption() {
        return this._defaultGroupByOption;
    }

    //Getter for unit tests
    public getDefaultFilterByOption() {
        return this._defaultFilterByOption;
    }

    /// <summary>
    /// Updates data source onSort call
    /// </summary>
    public onSortUpdateDataSource(columnIndex: string, sortOrder: string) {
        Diag.logVerbose("Updating session list data source after sorting. columnIndex: " + columnIndex + "and sortOrder " + sortOrder);

        let cacheKey: string = this._getHierarchicalDataSourceCacheKey(this._defaultGroupByOption, this._defaultFilterByOption);
        if (this._hierarchicalDatasource[cacheKey]) {
            let gridItems: IGridItem[] = [];
            gridItems = this._hierarchicalDatasource[cacheKey].getSource();

            // filter based on groupby option, always select parent row
            if (this._defaultGroupByOption !== ManualUtils.SessionGridGroupPivots.Group_By_None &&
                this._defaultGroupByOption !== ManualUtils.SessionGridGroupPivots.Group_By_UnExploredWorkItems) {
                gridItems = gridItems.filter((elem) => {
                    return elem.rowType !== ManualUtils.GridRowType.FlatWorkItem;
                });
            } else {
                gridItems = gridItems.filter((elem) => {
                    return elem.rowType === ManualUtils.GridRowType.FlatWorkItem;
                });
            }

            // maintaining collapse state
            gridItems.forEach((gridItem: IGridItem) => {
                gridItem.collapsed = this.isCollapseEnabled;
            });

            switch (columnIndex) {
            case ManualUtils.ColumnIndices.Id:
                gridItems.sort((item1: IGridItem, item2: IGridItem) => {
                    return this._sortNumber(item1.id, item2.id, sortOrder);
                });
                this.dataSource(new Grids.GridHierarchySource(gridItems));

                break;
            case ManualUtils.ColumnIndices.BugCount:
                gridItems.sort((item1: IGridItem, item2: IGridItem) => {
                    return this._sortNumber(item1.bugCount, item2.bugCount, sortOrder);
                });
                this.dataSource(new Grids.GridHierarchySource(gridItems));

                break;
            case ManualUtils.ColumnIndices.TaskCount:
                gridItems.sort((item1: IGridItem, item2: IGridItem) => {
                    return this._sortNumber(item1.taskCount, item2.taskCount, sortOrder);
                });
                this.dataSource(new Grids.GridHierarchySource(gridItems));

                break;
            case ManualUtils.ColumnIndices.TestCaseCount:
                gridItems.sort((item1: IGridItem, item2: IGridItem) => {
                    return this._sortNumber(item1.testCaseCount, item2.testCaseCount, sortOrder);
                });
                this.dataSource(new Grids.GridHierarchySource(gridItems));

                break;
            case ManualUtils.ColumnIndices.SessionId:
                gridItems.sort((item1: IGridItem, item2: IGridItem) => {
                    return this._sortNumber(item1.sessionId, item2.sessionId, sortOrder);
                });
                this.dataSource(new Grids.GridHierarchySource(gridItems));

                break;
            case ManualUtils.ColumnIndices.Owner:
            case ManualUtils.ColumnIndices.OwnerName:
                gridItems.sort((item1: IGridItem, item2: IGridItem) => {
                    return this._sortString(item1.owner.displayName, item2.owner.displayName, sortOrder);
                });
                this.dataSource(new Grids.GridHierarchySource(gridItems));

                break;
            case ManualUtils.ColumnIndices.ItemType:
                gridItems.sort((item1: IGridItem, item2: IGridItem) => {
                    return this._sortString(item1.workItemType, item2.workItemType, sortOrder);
                });
                this.dataSource(new Grids.GridHierarchySource(gridItems));

                break;
            }
        }
    }

    public getResultFromCache(id: number): ManualUtils.ISessionGridViewModel {
        return id ? this._resultCache[id] : null;
    }

    public addResultToCache(id: number, result: ManualUtils.ISessionGridViewModel) {
        this._resultCache[id] = result;
    }

    public getResultCacheSize(): number {
        return Object.keys(this._resultCache).length;
    }

    public getResultsForGrid(resultIdentifiersToFetch: number[]): IPromise<ManualUtils.ISessionGridViewModel[]> {
        Diag.logVerbose("Getting results for sessions grid. Identifiers to fetch: " + resultIdentifiersToFetch.join(", "));

        let deferred: Q.Deferred<ManualUtils.ISessionGridViewModel[]> = q.defer<ManualUtils.ISessionGridViewModel[]>();
        ManualUtils.fetchWorkItemData(resultIdentifiersToFetch)
            .then((sesssionGridResults: ManualUtils.ISessionGridViewModel[]) => {
                deferred.resolve(sesssionGridResults);
            }, (error) => {
                if (error) {
                    this._messageViewModel.logError(error);
                }
            });
        return deferred.promise;
    }

    /// <summary>
    /// Update right pane of grid whenever row selection change
    /// </summary>
    public clearCache(): void {
        this._hierarchicalDatasource = {};
    }

    private _sortNumber(item1: number, item2: number, sortOrder: string): number {
        if (sortOrder === "asc") {
            return item1 - item2;
        } else if (sortOrder === "desc") {
            return item2 - item1;
        }
    }

    private _sortString(item1: string, item2: string, sortOrder: string): number {
        if (sortOrder === "asc") {
            return Utils_String.localeComparer(item1, item2);
        } else if (sortOrder === "desc") {
            return Utils_String.localeComparer(item2, item1);
        }
    }

    private _getRowDataForWorkItemFiled(workItemFiled: ManualUtils.IWorkItemFiledGridRow[], filter: string) {
        let items: IGridItem[] = [];
        if (workItemFiled) {
            Diag.logVerbose("Getting row data for filed work items");

            workItemFiled.forEach((workItem: ManualUtils.IWorkItemFiledGridRow) => {
                let item: IGridItem = {
                    id: workItem.id,
                    workItemType: workItem.type,
                    rowType: ManualUtils.GridRowType.FlatWorkItem
                };

                switch (filter) {

                    case ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_All:
                        items.push(item);
                        break;

                    case ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_Bug:
                        if (workItem.type === ManualUtils.WorkItemMetaDataCache.getDefaultWorkItemType(ManualUtils.WorkItemCategories.BugCategory)) {
                            items.push(item);
                        }
                        break;

                    case ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_TestCase:
                        if (workItem.type === ManualUtils.WorkItemMetaDataCache.getDefaultWorkItemType(ManualUtils.WorkItemCategories.TestCaseCategory)) {
                            items.push(item);
                        }
                        break;

                    case ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_Task:
                        if (workItem.type === ManualUtils.WorkItemMetaDataCache.getDefaultWorkItemType(ManualUtils.WorkItemCategories.TaskCategory)) {
                            items.push(item);
                        }
                        break;
                }
            });
        }

        return items;
    }

    private _loadWorkItemExploredDataForGrid(testSessions: TCMContracts.TestSession[], witIds: number[], cacheKey: string, filter: string): void {
        let hierarchicalData: Grids.IGridHierarchyItem[] = [];

        Diag.logVerbose("Generating work item explored data for sessions grid");
        ManualUtils.generateWorkItemExploredDataForGrid(testSessions, witIds)
            .then((exploredWorkItemsForGrid: ManualUtils.IWorkItemExploredGridRow[]) => {

                Performance.getScenarioManager().split(TMUtils.TcmPerfScenarios.LoadExploratorySessionGridData);
                Diag.logVerbose("Generated work item explored data for sessions grid.");
                exploredWorkItemsForGrid.forEach((exploredWorkItem: ManualUtils.IWorkItemExploredGridRow) => {
                    let gridItem: IGridItem = {
                        filterBy: this._defaultFilterByOption,
                        id: exploredWorkItem.id,
                        workItemType: exploredWorkItem.type,
                        bugCount: exploredWorkItem.workItemsFiledDetail.bugCount,
                        taskCount: exploredWorkItem.workItemsFiledDetail.taskCount,
                        testCaseCount: exploredWorkItem.workItemsFiledDetail.testCaseCount,
                        sessionOwners: exploredWorkItem.sessionOwners,
                        sessionCount: exploredWorkItem.sessionCount,
                        duration: exploredWorkItem.sessionDuration,
                        rowType: ManualUtils.GridRowType.WorkItemExplored,
                        collapsed: this.isCollapseEnabled,
                        url: exploredWorkItem.url,
                        title: exploredWorkItem.title
                    };
                    gridItem.children = this._getRowDataForWorkItemFiled(exploredWorkItem.workItemsFiledDetail.workItemFiled, filter);
                    hierarchicalData.push(gridItem);
                });

                hierarchicalData.sort((item1: IGridItem, item2: IGridItem) => {
                    return this._sortNumber(item1.id, item2.id, "desc");
                });

                this._hierarchicalDatasource[cacheKey] = new Grids.GridHierarchySource(hierarchicalData);
                this._validateResult(this._hierarchicalDatasource[cacheKey].getSource(), ManualUtils.SessionGridGroupPivots.Group_By_ExploredWorkItems);
                this.dataSource(this._hierarchicalDatasource[cacheKey]);
            }, (error) => {
                this._messageViewModel.logError(error);
                Performance.getScenarioManager().abortScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.QueryRecentExploratorySessions);
                Performance.getScenarioManager().abortScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.GotoRecentExploratorySessions);
            });
    }

    private _loadUnexploredWorkItemDataForGrid(testSessions: TCMContracts.TestSession[], witIds: number[], cacheKey: string, filter: string): void {
        let hierarchicalData: Grids.IGridHierarchyItem[] = [];
        let unExploredWorkItems: ManualUtils.IUnexploredWorkItemGridRow[] = ManualUtils.generateUnExploredWorkItemDataForGridWithCustomQuery(testSessions, witIds);
        Utils_Array.addRange(hierarchicalData, this._getRowDataForWorkItemFiled(unExploredWorkItems, ManualUtils.SessionGridOutcomeFilterPivots.Filter_By_All));

        hierarchicalData.sort((item1: IGridItem, item2: IGridItem) => {
            return this._sortNumber(item1.id, item2.id, "desc");
        });

        this._hierarchicalDatasource[cacheKey] = new Grids.GridHierarchySource(hierarchicalData);
        this._validateResult(this._hierarchicalDatasource[cacheKey].getSource(), ManualUtils.SessionGridGroupPivots.Group_By_UnExploredWorkItems, witIds);
        this.dataSource(this._hierarchicalDatasource[cacheKey]);
    }

    private _loadSessionDataForGrid(testSessions: TCMContracts.TestSession[], witIds: number[], cacheKey: string, filter: string): void {
        Diag.logVerbose("Loading session data for the grid. Number of sessions: " + testSessions.length);
        if (witIds) {
            ManualUtils.generateSessionDataForGridWithCustomQuery(testSessions, witIds)
                .then((sessionsForGrid: ManualUtils.ISessionGridRow[]) => {
                    this._initalizeSessionDataForGrid(sessionsForGrid, cacheKey, filter);
                });
        } else {
            this._initalizeSessionDataForGrid(ManualUtils.generateSessionDataForGrid(testSessions), cacheKey, filter);
        }
    }

    private _initalizeSessionDataForGrid(sessionsForGrid: ManualUtils.ISessionGridRow[], cacheKey: string, filter: string) {
        if (sessionsForGrid && sessionsForGrid.length > 0) {
            let hierarchicalData: Grids.IGridHierarchyItem[] = [];
            sessionsForGrid.forEach((sessionForGrid: ManualUtils.ISessionGridRow) => {

                let gridItem: IGridItem = {
                    filterBy: this._defaultFilterByOption,
                    sessionId: sessionForGrid.id,
                    owner: sessionForGrid.owner,
                    bugCount: sessionForGrid.workItemsFiledDetail.bugCount,
                    taskCount: sessionForGrid.workItemsFiledDetail.taskCount,
                    testCaseCount: sessionForGrid.workItemsFiledDetail.testCaseCount,
                    startTime: sessionForGrid.startTime,
                    duration: sessionForGrid.sessionDuration,
                    workItemExplored: sessionForGrid.workItemExplored,
                    rowType: ManualUtils.GridRowType.Session,
                    collapsed: this.isCollapseEnabled
                };

                gridItem.children = this._getRowDataForWorkItemFiled(sessionForGrid.workItemsFiledDetail.workItemFiled, filter);
                hierarchicalData.push(gridItem);
            });

            hierarchicalData.sort((item1: IGridItem, item2: IGridItem) => {
                return this._sortNumber(item1.sessionId, item2.sessionId, "desc");
            });

            this._hierarchicalDatasource[cacheKey] = new Grids.GridHierarchySource(hierarchicalData);
            this._validateResult(this._hierarchicalDatasource[cacheKey].getSource(), ManualUtils.SessionGridGroupPivots.Group_By_Sessions);
            this.dataSource(this._hierarchicalDatasource[cacheKey]);
        }
    }

    private _loadSessionOwnersDataForGrid(testSessions: TCMContracts.TestSession[], witIds: number[], cacheKey: string, filter: string): void {
        Diag.logVerbose("Loading session owner data for the grid. Number of sessions: " + testSessions.length);
        if (witIds) {
            ManualUtils.generateSessionOwnersDataForGridWithCustomQuery(testSessions, witIds)
                .then((sessionownersForGrid: ManualUtils.ISessionOwnerGridRow[]) => {
                    this._initalizeSessionOwnersDataForGrid(sessionownersForGrid, cacheKey, filter);
                });
        } else {
            this._initalizeSessionOwnersDataForGrid(ManualUtils.generateSessionOwnersDataForGrid(testSessions), cacheKey, filter);
        }
    }

    private _initalizeSessionOwnersDataForGrid(sessionownersForGrid: ManualUtils.ISessionOwnerGridRow[], cacheKey: string, filter: string) {
        if (sessionownersForGrid && sessionownersForGrid.length > 0) {
            let hierarchicalData: Grids.IGridHierarchyItem[] = [];
            
            sessionownersForGrid.forEach((sessionOwnerForGrid: ManualUtils.ISessionOwnerGridRow) => {

                let gridItem: IGridItem = {
                    filterBy: this._defaultFilterByOption,
                    owner: sessionOwnerForGrid.owner,
                    bugCount: sessionOwnerForGrid.workItemsFiledDetail.bugCount,
                    taskCount: sessionOwnerForGrid.workItemsFiledDetail.taskCount,
                    testCaseCount: sessionOwnerForGrid.workItemsFiledDetail.testCaseCount,
                    duration: sessionOwnerForGrid.sessionDuration,
                    workItemExplored: sessionOwnerForGrid.workItemExplored,
                    sessionCount: sessionOwnerForGrid.sessionCount,
                    rowType: ManualUtils.GridRowType.SessionOwner,
                    collapsed: this.isCollapseEnabled
                };

                gridItem.children = this._getRowDataForWorkItemFiled(sessionOwnerForGrid.workItemsFiledDetail.workItemFiled, filter);
                hierarchicalData.push(gridItem);
            });

            hierarchicalData.sort((item1: IGridItem, item2: IGridItem) => {
                return this._sortString(item1.owner.displayName, item2.owner.displayName, "asc");
            });

            this._hierarchicalDatasource[cacheKey] = new Grids.GridHierarchySource(hierarchicalData);
            this._validateResult(this._hierarchicalDatasource[cacheKey].getSource(), ManualUtils.SessionGridGroupPivots.Group_By_SessionOwners);
            this.dataSource(this._hierarchicalDatasource[cacheKey]);
        }
    }

    private _loadWorkItemFiledForGrid(testSessions: TCMContracts.TestSession[], witIds: number[], cacheKey: string, filter: string): void {
        Diag.logVerbose("Loading workitem filed data for the grid. Number of sessions: " + testSessions.length);
        if (witIds) {
            ManualUtils.generateWorkItemFiledForGridWithCustomQuery(testSessions, witIds)
                .then((filedWorkItems: ManualUtils.IWorkItemFiledGridRow[]) => {
                    this._initalizeWorkItemFiledForGrid(filedWorkItems, cacheKey, filter);
                });
        } else {
            this._initalizeWorkItemFiledForGrid(ManualUtils.generateWorkItemFiledForGrid(testSessions), cacheKey, filter);
        }
    }

    private _initalizeWorkItemFiledForGrid(filedWorkItems: ManualUtils.IWorkItemFiledGridRow[], cacheKey: string, filter: string) {
        let hierarchicalData: Grids.IGridHierarchyItem[] = [];
        Utils_Array.addRange(hierarchicalData, this._getRowDataForWorkItemFiled(filedWorkItems, filter));

        hierarchicalData.sort((item1: IGridItem, item2: IGridItem) => {
            return this._sortNumber(item1.id, item2.id, "desc");
        });

        this._hierarchicalDatasource[cacheKey] = new Grids.GridHierarchySource(hierarchicalData);
        this._validateResult(this._hierarchicalDatasource[cacheKey].getSource(), ManualUtils.SessionGridGroupPivots.Group_By_None);
        this.dataSource(this._hierarchicalDatasource[cacheKey]);
    }

    private _loadData(data: Common.IData, sessionQueryParam: ManualUtils.ISessionQueryParameters): void {
        let cacheKey: string = this._getHierarchicalDataSourceCacheKey(sessionQueryParam.groupBy, sessionQueryParam.filter);

        if (!this._hierarchicalDatasource[cacheKey]) {
            Diag.logVerbose("Loading data for session grid");

            let testSessions: TCMContracts.TestSession[] = data.mainData;
            // fetched workitem ids using custom query
            let witIds: number[] = data.subData;
            switch (sessionQueryParam.groupBy) {
            case ManualUtils.SessionGridGroupPivots.Group_By_ExploredWorkItems:
                    this._loadWorkItemExploredDataForGrid(testSessions, witIds, cacheKey, sessionQueryParam.filter);
                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_UnExploredWorkItems:
                    this._loadUnexploredWorkItemDataForGrid(testSessions, witIds, cacheKey, sessionQueryParam.filter);
                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_Sessions:
                    this._loadSessionDataForGrid(testSessions, witIds, cacheKey, sessionQueryParam.filter);
                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_SessionOwners:
                    this._loadSessionOwnersDataForGrid(testSessions, witIds, cacheKey, sessionQueryParam.filter);
                break;
            case ManualUtils.SessionGridGroupPivots.Group_By_None:
                    this._loadWorkItemFiledForGrid(testSessions, witIds, cacheKey, sessionQueryParam.filter);
                break;
            }
        } else {
            Diag.logVerbose("Returning cached data for session grid");

            this._validateResult(this._hierarchicalDatasource[cacheKey].getSource(), sessionQueryParam.groupBy);
            this.dataSource(this._hierarchicalDatasource[cacheKey]);
        }
    }

    private _validateResult(gridItems: IGridItem[], groupBy: string, witIds: number[] = null) {
        if (gridItems.length === 0) {
            this.showMessageOnGrid(true);
            this._setMessageOnResultFound(groupBy, witIds);
        } else {
            this.showMessageOnGrid(false);
        }
    }

    private _setMessageOnResultFound(groupBy: string, witIds: number[]): void {
        switch (groupBy) {
        case ManualUtils.SessionGridGroupPivots.Group_By_ExploredWorkItems:
            this._gridmessageViewModel.logInfo(Resources.SessionGridBanner_NoWorkItemExplored);
            break;
        case ManualUtils.SessionGridGroupPivots.Group_By_None:
            this._gridmessageViewModel.logInfo(Resources.SessionGridBanner_NoWorkItemFiled);
            break;
        case ManualUtils.SessionGridGroupPivots.Group_By_UnExploredWorkItems:
                if (witIds) {
                    this._gridmessageViewModel.logInfo(Resources.SessionGridBanner_NoWorkItemUnExploredWithQuery);
                } else {
                    this._gridmessageViewModel.logInfo(Resources.SessionGridBanner_NoWorkItemUnExploredWithoutQuery);
                }
            break;
        default:
            break;
        }
    }

    private _getHierarchicalDataSourceCacheKey(groupby: string, filterby: string) {
        return Utils_String.format("{0}:{1}", groupby, filterby);
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/ListViewModel", exports);
