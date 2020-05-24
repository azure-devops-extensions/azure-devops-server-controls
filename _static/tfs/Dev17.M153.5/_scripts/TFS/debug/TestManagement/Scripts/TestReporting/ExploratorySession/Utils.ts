/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");
import * as CommonUtils from "TestManagement/Scripts/TestReporting/Common/Common.Utils";

import Resources = require("TestManagement/Scripts/Resources/Tfs.Resources.TestManagement");
import q = require("q");
import TCMContracts = require("TFS/TestManagement/Contracts");
import WITContracts = require("TFS/WorkItemTracking/Contracts");
import VSS_Common_Contracts = require("VSS/WebApi/Contracts");
import Utils_Array = require("VSS/Utils/Array");
import VSS = require("VSS/VSS");
import Diag = require("VSS/Diag");
import { WorkItemTypeColor } from "TFS/WorkItemTracking/Contracts";

export interface IWorkItemTypeMetaData {
    category: string;
    color: string;
}

export interface IWorkItemCategoryMetaData {
    defaultWorkItemType: string;
}

export interface IExploratorySessionOwnerDetails {
    sessionOwnerName: string;
    count?: number;
    type?: string;
}

export interface IExploratorySessionWorkItemDetails {
    workItemType: string;
    count?: number;
}

export interface IExploratorySessionHeaderChartDetails {
    workItemExploredCount: number;
    workItemExplored: IExploratorySessionWorkItemDetails[];
    unExploredWorkItemCount?: number;
    workItemFiledCount: number;
    workItemFiled: IExploratorySessionWorkItemDetails[];
    sessionOwnersCount: number;
    sessionOwners: IExploratorySessionOwnerDetails[];
    sessionDuration: string;
}

export interface IExploratorySessionSummaryChartDetails {
    bugsFiledCount: number;
    bugsByPriority: IKeyValuePair[];
    bugsByState: IKeyValuePair[];
    tasksFiledCount: number;
    tasksByState: IKeyValuePair[];
}

export interface IKeyValuePair {
    key: string;
    value: number;
}

export interface ISessionQueryParameters {
    groupBy: string;
    filter: string;
}

export interface IWorkItemGridRow {
    id: number;
    type: string;
    title?: string;
    url?: string;
    state?: string;
    assignedTo?: string;
}

/**
* Contract for Grid row when None is selected in groupBy
*
*/
export interface IWorkItemFiledGridRow extends IWorkItemGridRow {
}

/**
* Contract for Grid row when Unexplored Work Item is selected in groupBy
* 
*/
export interface IUnexploredWorkItemGridRow extends IWorkItemGridRow {
}

export interface IWorkItemsFiledDetail {
    bugCount?: number;
    taskCount?: number;
    testCaseCount?: number;
    workItemFiled?: IWorkItemFiledGridRow[];
}

export interface IWorkItemExploredGridRow {
    id?: number;
    type?: string;
    title?: string;
    url?: string;
    sessionOwners?: string[];
    sessionCount?: number;
    sessionDuration?: string;
    workItemsFiledDetail?: IWorkItemsFiledDetail;
}

export interface ISessionGridRow {
    id?: number;
    owner?: TFS_Host_TfsContext.IContextIdentity;
    startTime?: string;
    sessionDuration?: string;
    workItemExplored?: string[];
    workItemsFiledDetail?: IWorkItemsFiledDetail;
}

export interface ISessionOwnerGridRow {
    owner?: TFS_Host_TfsContext.IContextIdentity;
    sessionCount?: number;
    sessionDuration?: string;
    workItemExplored?: string[];
    workItemsFiledDetail?: IWorkItemsFiledDetail;
}

export interface ISessionGridViewModel {
    type?: string;
    id?: number;
    title?: string;
    url?: string;
    state?: string;
    assignedTo?: string;
    priority?: number;
}

export interface ITeam {
    id: string;
    name: string;
}

export interface IProjectTeamsData {
    defaultTeam: ITeam;
    allTeams: ITeam[];
}

export enum GridRowType {
    WorkItemExplored,
    Session,
    SessionOwner,
    FlatWorkItem
}

export class WorkItemCategories {
    public static BugCategory = "Microsoft.BugCategory";
    public static TaskCategory = "Microsoft.TaskCategory";
    public static TestCaseCategory = "Microsoft.TestCaseCategory";
    public static ScenarioCategory = "Microsoft.ScenarioCategory";
    public static EpicCategory = "Microsoft.EpicCategory";
    public static RequirementCategory = "Microsoft.RequirementCategory";
    public static FeatureCategory = "Microsoft.FeatureCategory";
}

export class WorkItemRelations {
    public static relatedLink: string = "System.LinkTypes.Related";
    public static childLink: string = "System.LinkTypes.Hierarchy-Forward";
    public static testedByForward: string = "Microsoft.VSTS.Common.TestedBy-Forward";
    public static testedByReverse: string = "Microsoft.VSTS.Common.TestedBy-Reverse";

}

export class ExploratorySessionConstant {
    public static ExploredWorkItem = "ExploredWorkItem";
    public static AssociatedWorkItem = "AssociatedWorkItem";
    public static OthersWorkItemType = "Others";
    public static showCountExploredWorkItem: number = 3;
    public static showCountFiledWorkItem: number = 3;
    public static showCountSessionOwners: number = 3;
    public static PAGE_SIZE: number = 100;
    public static PAGINATION_DELAY: number = 100;
    public static ZeroSessionViewDelay: number = 100;
    public static NoWorkItemInQueryViewDelay: number = 100;
    public static defaultWorkItemColor = "FFCC293D";
    public static defaultOwnerFilter: string = "All sessions";
    public static defaultPeriodFilter: string = "Last 7 days";
    public static defaultQueryFilter: string = "None";
}

export class SessionGridGroupPivots {
    public static Group_By_ExploredWorkItems = "ExploredWorkitems";
    public static Group_By_UnExploredWorkItems = "UnExploredWorkitems";
    public static Group_By_Sessions = "Sessions";
    public static Group_By_SessionOwners = "SessionOwners";
    public static Group_By_None = "";
}

export class SessionGridOutcomeFilterPivots {
    public static Filter_By_All = "All";
    public static Filter_By_Bug = "Bug";
    public static Filter_By_Task = "Task";
    public static Filter_By_TestCase = "TestCase";
}

export class ExploratorySessionToolbarCommands {
    public static ExpandAll = "expand-all";
    public static CollapseAll = "collapse-all";

    public static GroupByExploredWorkItems = "group-by-explored-workitems";
    public static GroupByUnExploredWorkItems = "group-by-unexplored-workitems";
    public static GroupBySessions = "group-by-sessions";
    public static GroupBySessionOwners = "group-by-session-owners";
    public static GroupByNone = "group-by-none";

    public static FilterByAll = "filter-by-all";
    public static FilterByBug = "filter-by-bug";
    public static FilterByTask = "filter-by-task";
    public static FilterByTestCase = "filter-by-test-case";

    public static mapGroupByCommandToPivot: IDictionaryStringTo<string> = {
        "group-by-explored-workitems": SessionGridGroupPivots.Group_By_ExploredWorkItems,
        "group-by-unexplored-workitems": SessionGridGroupPivots.Group_By_UnExploredWorkItems,
        "group-by-sessions": SessionGridGroupPivots.Group_By_Sessions,
        "group-by-session-owners": SessionGridGroupPivots.Group_By_SessionOwners,
        "group-by-none": SessionGridGroupPivots.Group_By_None
    };

    public static mapFilterByCommandToPivot: IDictionaryStringTo<string> = {
        "filter-by-all": SessionGridOutcomeFilterPivots.Filter_By_All,
        "filter-by-bug": SessionGridOutcomeFilterPivots.Filter_By_Bug,
        "filter-by-task": SessionGridOutcomeFilterPivots.Filter_By_Task,
        "filter-by-test-case": SessionGridOutcomeFilterPivots.Filter_By_TestCase
    };
}

export class ColumnIndices {
    public static ItemType: string = "type";
    public static Id: string = "id";
    public static Title: string = "title";
    public static State: string = "state";
    public static AssignedTo: string = "assignedTo";
    public static BugCount: string = "bugCount";
    public static TaskCount: string = "taskCount";
    public static TestCaseCount: string = "testCaseCount";
    public static Owner: string = "owner";
    public static StartTime: string = "startTime";
    public static OwnerName: string = "ownerName";
    public static SessionId: string = "sessionId";
    public static RowSelector: string = "rowSelector";
}

export class WorkItemField {
    public static workItemType: string = "System.WorkItemType";
    public static id: string = "System.Id";
    public static title: string = "System.Title";
    public static iterationPath: string = "System.IterationPath";
    public static assignedTo: string = "System.AssignedTo";
    public static workItemState: string = "System.State";
    public static acceptanceCriteria: string = "Microsoft.VSTS.Common.AcceptanceCriteria";
    public static description: string = "System.Description";
    public static areaPath: string = "System.AreaPath";
    public static reproSteps: string = "Microsoft.VSTS.TCM.ReproSteps";
    public static systemInfo: string = "Microsoft.VSTS.TCM.SystemInfo";
    public static url: string = "url";
    public static startTime: string = "startTime";
    public static priority: string = "Microsoft.VSTS.Common.Priority";
}

export enum SessionReportColorPaletteName { Palette1, Palette2, Palette3 }

export class SessionReportColorPalette {

    public static getColorCode(type: string) {
        if (!this._colorCodeLookup) {
            this._createLookup();
        }

        return this._colorCodeLookup[type.toLowerCase()];
    }

    public static getColorCodeByPaletteName(paletteName: SessionReportColorPaletteName, index: number) {
        // Default color, in case we run out of range.
        let returnColorCode = "#9999CC";

        // Current supported range is of 6 unique items.
        if (index < 6) {
            switch (paletteName) {
                case SessionReportColorPaletteName.Palette1:
                    returnColorCode = this._colorPalette1[index];
                    break;
                case SessionReportColorPaletteName.Palette2:
                    returnColorCode = this._colorPalette2[index];
                    break;
                case SessionReportColorPaletteName.Palette3:
                    returnColorCode = this._colorPalette3[index];
                    break;
            }
        }
        return returnColorCode;
    }

    private static _createLookup() {
        this._colorCodeLookup = {};

        // lookup for session owners
        this._colorCodeLookup["user1"] = "#00188F";
        this._colorCodeLookup["user2"] = "#007ACC";
        this._colorCodeLookup["user3"] = "#147A7C";

        this._colorCodeLookup["explored"] = "#489B1D";
        this._colorCodeLookup["unexplored"] = "#CA0500";

        this._colorCodeLookup["others"] = "#748189";
        this._colorCodeLookup["default"] = "#009CCC";
    }

    private static _colorCodeLookup: { [type: string]: string };
    private static _colorPalette1 = ["#8E1C2A", "#CC293D", "#D65363", "#E07E8A", "#EAA9B1", "#FFCCCC"];
    private static _colorPalette2 = ["#011E99", "#0033FF", "#325BFF", "#6684FF", "#99ADFF", "#CCD6FF"];
    private static _colorPalette3 = ["#004700", "#006600", "#328432", "#66A366", "#99C199", "#CCE0CC"];
}

export class WorkItemMetaDataCache {

    public static getWorkItemColor(workItemType: string): string {
        if (workItemType === "Others") {
            return SessionReportColorPalette.getColorCode(workItemType);
        }
        let color = this._workItemTypeMetaDataCache[workItemType].color;
        return "#" + (color.length > this._maxColorCodeLength ? color.substring(color.length - this._maxColorCodeLength) : color);
    }

    public static getDefaultWorkItemType(category: string): string {
        return this._workItemCategoryMetaDataCache[category].defaultWorkItemType;
    }

    public static getCategory(workItemType: string): string {
        return this._workItemTypeMetaDataCache[workItemType].category;
    }

    public static setWorkItemMetaData(categories: WITContracts.WorkItemTypeCategory[], workItemColors: WorkItemTypeColor[]): void {
        categories.forEach((category) => {
            this._workItemCategoryMetaDataCache[category.referenceName] = { defaultWorkItemType: category.defaultWorkItemType.name };
            category.workItemTypes.forEach((workItemType) => {
                this._workItemTypeMetaDataCache[workItemType.name] = { category: category.referenceName, color: ExploratorySessionConstant.defaultWorkItemColor };
            });
        });

        workItemColors.forEach((workItemColor) => {
            if (this._workItemTypeMetaDataCache[workItemColor.workItemTypeName]) {
                this._workItemTypeMetaDataCache[workItemColor.workItemTypeName].color = workItemColor.primaryColor;
            }
        });
    }

    private static _maxColorCodeLength: number = 6;
    private static _workItemTypeMetaDataCache: { [id: string]: IWorkItemTypeMetaData } = {};
    private static _workItemCategoryMetaDataCache: { [id: string]: IWorkItemCategoryMetaData } = {};
}

/**
* Api used to make sure workitem is linkable using XT extension or not.
*
* @publicapi
*/
export function isLinkabaleWorkItem(workItemType: string): Boolean {
    if (WorkItemMetaDataCache.getCategory(workItemType) === WorkItemCategories.FeatureCategory ||
        WorkItemMetaDataCache.getCategory(workItemType) === WorkItemCategories.ScenarioCategory ||
        WorkItemMetaDataCache.getCategory(workItemType) === WorkItemCategories.RequirementCategory ||
        WorkItemMetaDataCache.getCategory(workItemType) === WorkItemCategories.TestCaseCategory ||
        WorkItemMetaDataCache.getCategory(workItemType) === WorkItemCategories.EpicCategory) {

        return true;
    } else {
        return false;
    }
}

/**
* Api used to get all exploratory sessions details.
*
* @publicapi
*/
export function getAllExploratorySessions(team: string, period: number, allSessions: boolean): IPromise<TCMContracts.TestSession[]> {
    let deferred: Q.Deferred<TCMContracts.TestSession[]> = q.defer<TCMContracts.TestSession[]>();
    // by default getting all sessions from last 7 days under a team
    Diag.logVerbose("Fetching exploratory sessions for period " + period + " days" + "and ownerfilter: " + allSessions);

    let promise = TMUtils.getTestSessionManager().getTestSessions(team, period, allSessions, true);
    promise.then((testSessions: TCMContracts.TestSession[]) => {
        Diag.logVerbose("Fetched exploratory sessions");
        deferred.resolve(testSessions);
    },
        (error: TfsError) => {
            Diag.logError("Fetch exploratory sessions failed with error " + error.message);
            deferred.reject(error);
        });

    return deferred.promise;
}

/**
* Api used to get sessions which support custom query.
*
* @param testSessions
* @param witIds fetched workitem ids using custom query
* @publicapi
*/
export function getSessionsForCustomQuery(testSessions: TCMContracts.TestSession[], witIds: number[]): TCMContracts.TestSession[] {

    if (witIds) {
        let result: TCMContracts.TestSession[] = [];
        testSessions.forEach((session) => {
            let workItemExploredItems: TCMContracts.TestSessionExploredWorkItemReference[] = getExploredWorkItemInSession(session);

            let isExists: boolean = workItemExploredItems.some((workItem: TCMContracts.TestSessionExploredWorkItemReference) => {
                return witIds.indexOf(workItem.id) !== -1;
            });

            if (isExists) {
                result.push(session);
            }
        });

        return result;
    } else {
        return testSessions;
    }
}

/**
* Api used to get all exploratory sessions view's header charts details.
*
* @param testSessions
* @param witIds fetched workitem ids using custom query
* @publicapi
*/
export function generateExploratorySessionHeaderChartDetailsWithCustomQuery(testSessions: TCMContracts.TestSession[], witIds: number[]): IPromise<IExploratorySessionHeaderChartDetails> {
    Diag.logVerbose("Generating exploratory session details with custom query");

    let deferred: Q.Deferred<IExploratorySessionHeaderChartDetails> = q.defer<IExploratorySessionHeaderChartDetails>();

    let unExploredWorkItemCount: number = 0;

    let sessionDuration: number = 0;

    let workItemExploredCount: number = 0;
    let workItemExplored: IExploratorySessionWorkItemDetails[] = new Array<IExploratorySessionWorkItemDetails>();
    let totalWorkItemExploredItems: TCMContracts.TestSessionExploredWorkItemReference[] = [];
    let workItemExploredStore: { [key: string]: number } = {};

    let workItemFiledCount: number = 0;
    let workItemFiled: IExploratorySessionWorkItemDetails[] = new Array<IExploratorySessionWorkItemDetails>();
    let totalWorkItemFiledItems: TCMContracts.TestSessionWorkItemReference[] = [];
    let workItemFiledStore: { [key: string]: number } = {};

    let sessionOwnersCount: number = 0;
    let sessionOwners: IExploratorySessionOwnerDetails[] = new Array<IExploratorySessionOwnerDetails>();
    let sessionOwnersStore: { [key: string]: number } = {};

    let totalExploredworkItemIds: number[] = getExploredWorkItemIdsInSessions(testSessions, witIds);
    let promise = TMUtils.getWorkItemTrackingManager().getWorkItems(totalExploredworkItemIds, null, null, WITContracts.WorkItemExpand.Relations);
    promise.then((workItems: WITContracts.WorkItem[]) => {

        testSessions.forEach((session) => {

            // workitem explored
            let workItemExploredItems: TCMContracts.TestSessionExploredWorkItemReference[] = getExploredWorkItemInSessionWithCustomQuery(session, witIds);
            Utils_Array.addRange(totalWorkItemExploredItems, workItemExploredItems);

            // workitem explored duration
            workItemExploredItems.forEach((exploredWorkItem: TCMContracts.TestSessionExploredWorkItemReference) => {
                sessionDuration += getWorkItemExploredDuration(exploredWorkItem);
            });

            // workitem filed
            let workItemFiledItems: TCMContracts.TestSessionWorkItemReference[] = getFiledWorkItemInSession(session);
            Utils_Array.addRange(totalWorkItemFiledItems, workItemFiledItems);

            // session owners
            // merging id and name with : seprator to making it unique name
            let uniqueName = getSessionOwnerUniqueName(session.owner);
            if (!sessionOwnersStore[uniqueName]) {
                sessionOwnersStore[uniqueName] = 1;
            } else {
                sessionOwnersStore[uniqueName]++;
            }
        });

        totalWorkItemExploredItems = <TCMContracts.TestSessionExploredWorkItemReference[]>getUniqueWorkItem(totalWorkItemExploredItems);
        workItemExploredCount = totalWorkItemExploredItems.length;
        updateWorkItemStore(workItemExploredStore, totalWorkItemExploredItems, ExploratorySessionConstant.ExploredWorkItem);

        totalWorkItemFiledItems = getFiledWorkItemInSessionsWithCustomQuery(testSessions, workItems);
        workItemFiledCount = totalWorkItemFiledItems.length;
        updateWorkItemStore(workItemFiledStore, totalWorkItemFiledItems, ExploratorySessionConstant.AssociatedWorkItem);

        unExploredWorkItemCount = witIds.length - workItemExploredCount;

        //getting details for explored workItem
        updateWorkItemDetail(workItemExplored, sortList(convertStoreToList(workItemExploredStore)), ExploratorySessionConstant.showCountExploredWorkItem);

        //getting details for filed workItem
        updateWorkItemDetail(workItemFiled, sortList(convertStoreToList(workItemFiledStore)), ExploratorySessionConstant.showCountFiledWorkItem);

        //getting details for session owners
        sessionOwnersCount = testSessions.length;
        updateSessionOwnerDetail(sessionOwners, sortList(convertStoreToList(sessionOwnersStore)), ExploratorySessionConstant.showCountSessionOwners);

        let headerChartDetails: IExploratorySessionHeaderChartDetails = {
            workItemExploredCount: workItemExploredCount,
            unExploredWorkItemCount: unExploredWorkItemCount,
            workItemExplored: workItemExplored,
            workItemFiledCount: workItemFiledCount,
            workItemFiled: workItemFiled,
            sessionOwnersCount: sessionOwnersCount,
            sessionOwners: sessionOwners,
            sessionDuration: CommonUtils.TestReportDataParser.parseDuration(TMUtils.DateUtils.convertMiliSecondsToDurationFormat(sessionDuration))
        };

        deferred.resolve(headerChartDetails);
    }, (error: any) => {
        Diag.logError("Fetch work item data with relations failed with error " + error.message);
        deferred.reject(error);
    });

    return deferred.promise;
}

/**
* Api used to get all exploratory sessions view's header charts details.
*
* @param testSessions
* @publicapi
*/
export function generateExploratorySessionHeaderChartDetails(testSessions: TCMContracts.TestSession[]): IExploratorySessionHeaderChartDetails {
    Diag.logVerbose("Generating exploratory session details");

    let workItemExplored: IExploratorySessionWorkItemDetails[] = new Array<IExploratorySessionWorkItemDetails>();
    let workItemFiled: IExploratorySessionWorkItemDetails[] = new Array<IExploratorySessionWorkItemDetails>();
    let sessionOwners: IExploratorySessionOwnerDetails[] = new Array<IExploratorySessionOwnerDetails>();
    let workItemExploredCount: number = 0;
    let workItemFiledCount: number = 0;
    let sessionOwnersCount: number = 0;
    let sessionDuration: number = 0;
    let totalWorkItemExploredItems: TCMContracts.TestSessionExploredWorkItemReference[] = [];
    let totalWorkItemFiledItems: TCMContracts.TestSessionWorkItemReference[] = [];

    let workItemExploredStore: { [key: string]: number } = {};
    let workItemFiledStore: { [key: string]: number } = {};
    let sessionOwnersStore: { [key: string]: number } = {};

    testSessions.forEach((session) => {

        // session duration
        sessionDuration = sessionDuration + getSessionDuration(session);

        // workitem explored
        let workItemExploredItems: TCMContracts.TestSessionExploredWorkItemReference[] = getExploredWorkItemInSession(session);
        Utils_Array.addRange(totalWorkItemExploredItems, workItemExploredItems);

        // workitem filed
        let workItemFiledItems: TCMContracts.TestSessionWorkItemReference[] = getFiledWorkItemInSession(session);
        Utils_Array.addRange(totalWorkItemFiledItems, workItemFiledItems);

        // session owners
        // merging id and name with : seprator to making it unique name
        let uniqueName = getSessionOwnerUniqueName(session.owner);
        if (!sessionOwnersStore[uniqueName]) {
            sessionOwnersStore[uniqueName] = 1;
        } else {
            sessionOwnersStore[uniqueName]++;
        }
    });

    totalWorkItemExploredItems = <TCMContracts.TestSessionExploredWorkItemReference[]>getUniqueWorkItem(totalWorkItemExploredItems);
    workItemExploredCount = totalWorkItemExploredItems.length;
    updateWorkItemStore(workItemExploredStore, totalWorkItemExploredItems, ExploratorySessionConstant.ExploredWorkItem);

    totalWorkItemFiledItems = getUniqueWorkItem(totalWorkItemFiledItems);
    workItemFiledCount = totalWorkItemFiledItems.length;
    updateWorkItemStore(workItemFiledStore, totalWorkItemFiledItems, ExploratorySessionConstant.AssociatedWorkItem);

    //getting details for explored workItem
    updateWorkItemDetail(workItemExplored, sortList(convertStoreToList(workItemExploredStore)), ExploratorySessionConstant.showCountExploredWorkItem);

    //getting details for filed workItem
    updateWorkItemDetail(workItemFiled, sortList(convertStoreToList(workItemFiledStore)), ExploratorySessionConstant.showCountFiledWorkItem);

    //getting details for session owners
    sessionOwnersCount = testSessions.length;
    updateSessionOwnerDetail(sessionOwners, sortList(convertStoreToList(sessionOwnersStore)), ExploratorySessionConstant.showCountSessionOwners);

    let headerChartDetails: IExploratorySessionHeaderChartDetails = {
        workItemExploredCount: workItemExploredCount,
        workItemExplored: workItemExplored,
        workItemFiledCount: workItemFiledCount,
        workItemFiled: workItemFiled,
        sessionOwnersCount: sessionOwnersCount,
        sessionOwners: sessionOwners,
        sessionDuration: CommonUtils.TestReportDataParser.parseDuration(TMUtils.DateUtils.convertMiliSecondsToDurationFormat(sessionDuration))
    };

    return headerChartDetails;
}

/**
* Api used to fetch workitems explored data for grid.
*
* @param testSessions
* @param witIds fetched workitem ids using custom query
* @publicapi
*/
export function generateWorkItemExploredDataForGrid(testSessions: TCMContracts.TestSession[], witIds: number[]): IPromise<IWorkItemExploredGridRow[]> {
    Diag.logVerbose("Generating work items data for session grid, with and without custom query");

    let deferred: Q.Deferred<IWorkItemExploredGridRow[]> = q.defer<IWorkItemExploredGridRow[]>();
    let exploredWorkItemsForGrid: IWorkItemExploredGridRow[] = [];
    let filedWorkItemMap: { [key: number]: IWorkItemFiledGridRow } = {};
    let totalExploredworkItemIds: number[] = [];
    let exploredDurationMap: { [key: number]: number } = {};
    let sessionCountMap: { [key: number]: number } = {};
    let sessionOwnerMap: { [key: number]: string[] } = {};

    testSessions.forEach((session: TCMContracts.TestSession) => {

        let filedWorkItems: TCMContracts.TestSessionWorkItemReference[] = getFiledWorkItemInSession(session);
        filedWorkItems.forEach((filedWorkItem: TCMContracts.TestSessionWorkItemReference) => {
            if (!filedWorkItemMap[filedWorkItem.id]) {
                filedWorkItemMap[filedWorkItem.id] = {
                    type: filedWorkItem.type,
                    id: filedWorkItem.id
                };
            }
        });

        let exploredworkItemIds: number[] = [];
        let exploredWorkItems: TCMContracts.TestSessionExploredWorkItemReference[];

        // handling custom query scenario
        if (witIds) {
            exploredWorkItems = getExploredWorkItemInSessionWithCustomQuery(session, witIds);
        } else {
            exploredWorkItems = getExploredWorkItemInSession(session);
        }

        exploredWorkItems.forEach((exploredWorkItem: TCMContracts.TestSessionExploredWorkItemReference) => {
            exploredworkItemIds.push(exploredWorkItem.id);
            // creating map for duration of explored workitems
            if (exploredDurationMap[exploredWorkItem.id]) {
                exploredDurationMap[exploredWorkItem.id] += getWorkItemExploredDuration(exploredWorkItem);
            } else {
                exploredDurationMap[exploredWorkItem.id] = getWorkItemExploredDuration(exploredWorkItem);
            }

        });

        // removing duplicate
        exploredworkItemIds = exploredworkItemIds.filter((elem, index, self) => (index === self.indexOf(elem)));

        // creating map for sessionCount and sessionOwners
        exploredworkItemIds.forEach((id: number) => {

            if (sessionCountMap[id]) {
                sessionCountMap[id] = sessionCountMap[id] + 1;
            } else {
                sessionCountMap[id] = 1;
            }

            let uniqueName = getSessionOwnerUniqueName(session.owner);
            if (!sessionOwnerMap[id]) {
                sessionOwnerMap[id] = [];
            }
            sessionOwnerMap[id].push(uniqueName);

        });

        Utils_Array.addRange(totalExploredworkItemIds, exploredworkItemIds);

    });

    // removing duplicate
    totalExploredworkItemIds = totalExploredworkItemIds.filter((elem, index, self) => (index === self.indexOf(elem)));

    if (totalExploredworkItemIds.length > 0) {
        // fetching all explored workitems with relations data
        Diag.logVerbose("Fetching work item relations for " + totalExploredworkItemIds.length + " work items");

        let promise = TMUtils.getWorkItemTrackingManager().getWorkItems(totalExploredworkItemIds, null, null, WITContracts.WorkItemExpand.Relations);
        promise.then((workItems: WITContracts.WorkItem[]) => {
            Diag.logVerbose("Fetched work item data for " + workItems.length + " work items");

            // all explroed work item
            workItems.forEach((workItem: WITContracts.WorkItem) => {
                // map to handle scenario when user is doing search similar bugs on already filedbug under same traceability session
                let similarBugScenarioMap: { [key: number]: boolean } = {};

                let workItemType: string = workItem.fields[WorkItemField.workItemType];
                let workItemId: number = workItem.id;

                let exploredWorkItemForGrid: IWorkItemExploredGridRow = {
                    id: workItemId,
                    type: workItemType,
                    sessionOwners: sessionOwnerMap[workItemId],
                    sessionCount: sessionCountMap[workItemId],
                    sessionDuration: CommonUtils.TestReportDataParser.parseDuration(TMUtils.DateUtils.convertMiliSecondsToDurationFormat(exploredDurationMap[workItemId])),
                    workItemsFiledDetail: createWorkItemsFiledDetail(),
                    url: getEditableWitUrl(workItemId),
                    title: workItem.fields[WorkItemField.title],
                };

                // all relation of explored workitem
                if (workItem.relations) {
                    workItem.relations.forEach((relation: WITContracts.WorkItemRelation) => {
                        let filedWorkItemId = getIdFromWorkItemUrl(relation.url);
                        if (!similarBugScenarioMap[filedWorkItemId]) {
                            similarBugScenarioMap[filedWorkItemId] = true;
                            if (filedWorkItemMap[filedWorkItemId]) {
                                let filedWorkItemType: string = filedWorkItemMap[filedWorkItemId].type;
                                if (isWorkItemRelationSupported(workItemType, filedWorkItemType, relation.rel)) {
                                    updateWorkItemsFiledDetail(exploredWorkItemForGrid.workItemsFiledDetail, filedWorkItemType, filedWorkItemId);
                                }
                            }
                        }
                    });
                }

                exploredWorkItemsForGrid.push(exploredWorkItemForGrid);

            });

            deferred.resolve(exploredWorkItemsForGrid);

        }, (error: any) => {
            Diag.logWarning("Fetch work item data failed with error " + error.message);
            deferred.reject(error);
        });

    } else {
        deferred.resolve(exploredWorkItemsForGrid);
    }

    return deferred.promise;
}


/**
* Api used to generate grid data for unexplored workitems.
*
* @param testSessions
* @param witIds fetched workitem ids using custom query
* @publicapi
*/
export function generateUnExploredWorkItemDataForGridWithCustomQuery(testSession: TCMContracts.TestSession[], witIds: number[]): IUnexploredWorkItemGridRow[] {
    Diag.logVerbose("Generating unexplored workitem data for session grid with custom query");

    let unExploredWorkitemsForGrid: IUnexploredWorkItemGridRow[] = [];
    if (witIds) {
        let totalWorkItemExploredItems: TCMContracts.TestSessionExploredWorkItemReference[] = [];
        testSession.forEach((session) => {
            let workItemExploredItems = getExploredWorkItemInSessionWithCustomQuery(session, witIds);
            Utils_Array.addRange(totalWorkItemExploredItems, workItemExploredItems);
        });

        witIds.forEach((id) => {
            let present: boolean = false;
            totalWorkItemExploredItems.forEach((exploredWotkItem) => {
                if (exploredWotkItem.id === id) {
                    present = true;
                }
            });

            if (!present) {
                let workItem: IUnexploredWorkItemGridRow = {
                    id: id,
                    type: ""
                };
                unExploredWorkitemsForGrid.push(workItem);
            }
        });

    }

    return unExploredWorkitemsForGrid;
}

/**
* Api used to fetch sessions data for grid.
*
* @param testSessions
* @param witIds fetched workitem ids using custom query
* @publicapi
*/
export function generateSessionDataForGridWithCustomQuery(testSessions: TCMContracts.TestSession[], witIds: number[]): IPromise<ISessionGridRow[]> {
    Diag.logVerbose("Generating session data for session grid with custom query");

    let sessionsForGrid: ISessionGridRow[] = [];
    let deferred: Q.Deferred<ISessionGridRow[]> = q.defer<ISessionGridRow[]>();
    let exploredWorkItemMap: { [key: number]: WITContracts.WorkItem } = {};
    let totalExploredworkItemIds: number[] = getExploredWorkItemIdsInSessions(testSessions, witIds);
    let promise = TMUtils.getWorkItemTrackingManager().getWorkItems(totalExploredworkItemIds, null, null, WITContracts.WorkItemExpand.Relations);
    promise.then((workItems: WITContracts.WorkItem[]) => {

        workItems.forEach((workItem: WITContracts.WorkItem) => {
            exploredWorkItemMap[workItem.id] = workItem;
        });

        testSessions.forEach((session: TCMContracts.TestSession) => {
            let sessionForGrid: ISessionGridRow = {
                id: session.id,
                owner: getOwnerIdentity(session.owner),
                startTime: session.startDate.toString(),
                workItemsFiledDetail: createWorkItemsFiledDetail(),
                workItemExplored: []
            };

            let totalDuration = 0;
            let exploredWorkItems: TCMContracts.TestSessionExploredWorkItemReference[] = getExploredWorkItemInSessionWithCustomQuery(session, witIds);
            exploredWorkItems.forEach((workItem) => {
                totalDuration += getWorkItemExploredDuration(workItem);
            });

            sessionForGrid.sessionDuration = CommonUtils.TestReportDataParser.parseDuration(TMUtils.DateUtils.convertMiliSecondsToDurationFormat(totalDuration));
            exploredWorkItems = <TCMContracts.TestSessionExploredWorkItemReference[]>getUniqueWorkItem(exploredWorkItems);
            exploredWorkItems.forEach((exploredWorkItem: TCMContracts.TestSessionExploredWorkItemReference) => {
                sessionForGrid.workItemExplored.push(exploredWorkItem.type);
            });

            let filedWorkItemMap = getFiledWorkItemMapInSession(session);
            // map to handle scenario when user is doing search similar bugs on already filedbug under same traceability session
            let similarBugScenarioMap: { [key: number]: boolean } = {};
            exploredWorkItems.forEach((exploredWorkItem) => {

                let relations = exploredWorkItemMap[exploredWorkItem.id].relations;
                if (relations) {
                    relations.forEach((relation: WITContracts.WorkItemRelation) => {
                        let filedWorkItemId = getIdFromWorkItemUrl(relation.url);
                        if (!similarBugScenarioMap[filedWorkItemId]) {
                            similarBugScenarioMap[filedWorkItemId] = true;
                            if (filedWorkItemMap[filedWorkItemId]) {
                                let filedWorkItemType: string = filedWorkItemMap[filedWorkItemId].type;
                                if (isWorkItemRelationSupported(exploredWorkItem.type, filedWorkItemType, relation.rel)) {
                                    updateWorkItemsFiledDetail(sessionForGrid.workItemsFiledDetail, filedWorkItemType, filedWorkItemId);
                                }
                            }
                        }
                    });
                }
            });

            sessionsForGrid.push(sessionForGrid);

        });

        deferred.resolve(sessionsForGrid);

    }, (error: any) => {
        Diag.logError("Fetch work item data with relations failed with error " + error.message);
        deferred.reject(error);
    });

    return deferred.promise;
}

/**
* Api used to fetch sessions data for grid.
*
* @param testSessions
* @publicapi
*/
export function generateSessionDataForGrid(testSessions: TCMContracts.TestSession[]): ISessionGridRow[] {
    Diag.logVerbose("Generating session data for session grid");

    let sessionsForGrid: ISessionGridRow[] = [];
    if (testSessions.length > 0) {
        testSessions.forEach((session: TCMContracts.TestSession) => {
            let sessionForGrid: ISessionGridRow = {
                id: session.id,
                owner: getOwnerIdentity(session.owner),
                startTime: session.startDate.toString(),
                sessionDuration: CommonUtils.TestReportDataParser.parseDuration(TMUtils.DateUtils.convertMiliSecondsToDurationFormat(getSessionDuration(session))),
                workItemsFiledDetail: createWorkItemsFiledDetail(),
                workItemExplored: []
            };

            let filedWorkItems: TCMContracts.TestSessionWorkItemReference[] = getFiledWorkItemInSession(session);
            filedWorkItems.forEach((filedWorkItem: TCMContracts.TestSessionWorkItemReference) => {
                updateWorkItemsFiledDetail(sessionForGrid.workItemsFiledDetail, filedWorkItem.type, filedWorkItem.id);
            });

            let exploredWorkItems: TCMContracts.TestSessionExploredWorkItemReference[] = getExploredWorkItemInSession(session);
            exploredWorkItems = <TCMContracts.TestSessionExploredWorkItemReference[]>getUniqueWorkItem(exploredWorkItems);
            exploredWorkItems.forEach((exploredWorkItem: TCMContracts.TestSessionExploredWorkItemReference) => {
                sessionForGrid.workItemExplored.push(exploredWorkItem.type);
            });

            sessionsForGrid.push(sessionForGrid);

        });
    }

    return sessionsForGrid;
}

/**
* Api used to fetch sessions owner data for grid.
*
* @param testSessions
* @param witIds fetched workitem ids using custom query
* @publicapi
*/
export function generateSessionOwnersDataForGridWithCustomQuery(testSessions: TCMContracts.TestSession[], witIds: number[]): IPromise<ISessionOwnerGridRow[]> {
    Diag.logVerbose("Generating owners data for session grid with custom query");

    let deferred: Q.Deferred<ISessionOwnerGridRow[]> = q.defer<ISessionOwnerGridRow[]>();
    let sessionOwnersForGrid: ISessionOwnerGridRow[] = [];
    let ownerMap: { [key: string]: ISessionOwnerGridRow } = {};
    let durationMap: { [key: string]: number } = {};
    let exploredWorkItemMap: { [key: string]: TCMContracts.TestSessionExploredWorkItemReference[] } = {};
    let fetchedWorkItemMap: { [key: number]: WITContracts.WorkItem } = {};
    let ownerFiledWorkItemMap: { [key: string]: TCMContracts.TestSessionWorkItemReference[] } = {};
    let totalExploredworkItemIds: number[] = getExploredWorkItemIdsInSessions(testSessions, witIds);
    let promise = TMUtils.getWorkItemTrackingManager().getWorkItems(totalExploredworkItemIds, null, null, WITContracts.WorkItemExpand.Relations);
    promise.then((workItems: WITContracts.WorkItem[]) => {

        workItems.forEach((workItem: WITContracts.WorkItem) => {
            fetchedWorkItemMap[workItem.id] = workItem;
        });

        testSessions.forEach((session: TCMContracts.TestSession) => {

            let sessionOwnerForGrid: ISessionOwnerGridRow;
            let uniqueName = getSessionOwnerUniqueName(session.owner);
            if (!ownerMap[uniqueName]) {
                sessionOwnerForGrid = {
                    sessionCount: 0,
                    workItemExplored: [],
                    workItemsFiledDetail: createWorkItemsFiledDetail()
                };

            } else {
                sessionOwnerForGrid = ownerMap[uniqueName];
            }

            sessionOwnerForGrid.sessionCount++;

            let totalDuration = 0;
            let exploredWorkItems: TCMContracts.TestSessionExploredWorkItemReference[] = getExploredWorkItemInSessionWithCustomQuery(session, witIds);
            exploredWorkItems.forEach((workItem) => {
                totalDuration += getWorkItemExploredDuration(workItem);
            });

            if (durationMap[uniqueName]) {
                durationMap[uniqueName] = durationMap[uniqueName] + totalDuration;
            } else {
                durationMap[uniqueName] = totalDuration;
            }

            if (!exploredWorkItemMap[uniqueName]) {
                exploredWorkItemMap[uniqueName] = [];
            }
            Utils_Array.addRange(exploredWorkItemMap[uniqueName], exploredWorkItems);

            let filedWorkItems: TCMContracts.TestSessionWorkItemReference[] = [];
            let totalFiledWorkItemMap = getFiledWorkItemMapInSession(session);
            exploredWorkItems.forEach((exploredWorkItem) => {
                // map to handle scenario when user is doing search similar bugs on already filedbug under same traceability session
                let similarBugScenarioMap: { [key: number]: boolean } = {};

                let relations = fetchedWorkItemMap[exploredWorkItem.id].relations;
                if (relations) {
                    relations.forEach((relation: WITContracts.WorkItemRelation) => {
                        let filedWorkItemId = getIdFromWorkItemUrl(relation.url);
                        if (!similarBugScenarioMap[filedWorkItemId]) {
                            similarBugScenarioMap[filedWorkItemId] = true;
                            if (totalFiledWorkItemMap[filedWorkItemId]) {
                                let filedWorkItemType: string = totalFiledWorkItemMap[filedWorkItemId].type;
                                if (isWorkItemRelationSupported(exploredWorkItem.type, filedWorkItemType, relation.rel)) {
                                    let workItem: TCMContracts.TestSessionWorkItemReference = {
                                        id: filedWorkItemId,
                                        type: filedWorkItemType
                                    };
                                    filedWorkItems.push(workItem);

                                }
                            }
                        }
                    });
                }
            });

            if (!ownerFiledWorkItemMap[uniqueName]) {
                ownerFiledWorkItemMap[uniqueName] = [];
            }
            Utils_Array.addRange(ownerFiledWorkItemMap[uniqueName], filedWorkItems);

            ownerMap[uniqueName] = sessionOwnerForGrid;

        });


        for (let owner in ownerMap) {
            let sessionOwnerForGrid: ISessionOwnerGridRow = ownerMap[owner];
            sessionOwnerForGrid.owner = getOwnerIdentityFromUniqueName(owner);
            sessionOwnerForGrid.sessionDuration = CommonUtils.TestReportDataParser.parseDuration(TMUtils.DateUtils.convertMiliSecondsToDurationFormat(durationMap[owner]));
            let filedWorkItems = getUniqueWorkItem(ownerFiledWorkItemMap[owner]);
            filedWorkItems.forEach((filedWorkItem: TCMContracts.TestSessionWorkItemReference) => {
                updateWorkItemsFiledDetail(sessionOwnerForGrid.workItemsFiledDetail, filedWorkItem.type, filedWorkItem.id);
            });
            let exploredWorkItems = <TCMContracts.TestSessionExploredWorkItemReference[]>getUniqueWorkItem(exploredWorkItemMap[owner]);
            exploredWorkItems.forEach((exploredWorkItem: TCMContracts.TestSessionExploredWorkItemReference) => {
                sessionOwnerForGrid.workItemExplored.push(exploredWorkItem.type);
            });

            sessionOwnersForGrid.push(sessionOwnerForGrid);
        }

        deferred.resolve(sessionOwnersForGrid);
    }, (error: any) => {
        Diag.logError("Fetch work item data with relations failed with error " + error.message);
        deferred.reject(error);
    });
    return deferred.promise;
}

/**
* Api used to fetch sessions owner data for grid.
*
* @param testSessions
* @publicapi
*/
export function generateSessionOwnersDataForGrid(testSessions: TCMContracts.TestSession[]): ISessionOwnerGridRow[] {
    Diag.logVerbose("Generating owners data for session grid");

    let sessionOwnersForGrid: ISessionOwnerGridRow[] = [];
    let ownerMap: { [key: string]: ISessionOwnerGridRow } = {};
    let durationMap: { [key: string]: number } = {};
    let exploredWorkItemMap: { [key: string]: TCMContracts.TestSessionExploredWorkItemReference[] } = {};
    let ownerFiledWorkItemMap: { [key: string]: TCMContracts.TestSessionWorkItemReference[] } = {};
    if (testSessions.length > 0) {
        testSessions.forEach((session: TCMContracts.TestSession) => {

            let sessionOwnerForGrid: ISessionOwnerGridRow;
            let uniqueName = getSessionOwnerUniqueName(session.owner);
            if (!ownerMap[uniqueName]) {
                sessionOwnerForGrid = {
                    sessionCount: 0,
                    workItemExplored: [],
                    workItemsFiledDetail: createWorkItemsFiledDetail()
                };

            } else {
                sessionOwnerForGrid = ownerMap[uniqueName];
            }

            sessionOwnerForGrid.sessionCount++;

            let filedWorkItems: TCMContracts.TestSessionWorkItemReference[] = getFiledWorkItemInSession(session);
            if (!ownerFiledWorkItemMap[uniqueName]) {
                ownerFiledWorkItemMap[uniqueName] = [];
            }
            Utils_Array.addRange(ownerFiledWorkItemMap[uniqueName], filedWorkItems);

            if (durationMap[uniqueName]) {
                durationMap[uniqueName] = durationMap[uniqueName] + getSessionDuration(session);
            } else {
                durationMap[uniqueName] = getSessionDuration(session);
            }

            let exploredWorkItems: TCMContracts.TestSessionExploredWorkItemReference[] = getExploredWorkItemInSession(session);
            if (!exploredWorkItemMap[uniqueName]) {
                exploredWorkItemMap[uniqueName] = [];
            }
            Utils_Array.addRange(exploredWorkItemMap[uniqueName], exploredWorkItems);

            ownerMap[uniqueName] = sessionOwnerForGrid;

        });
    }

    for (let owner in ownerMap) {
        let sessionOwnerForGrid: ISessionOwnerGridRow = ownerMap[owner];
        sessionOwnerForGrid.owner = getOwnerIdentityFromUniqueName(owner);
        sessionOwnerForGrid.sessionDuration = CommonUtils.TestReportDataParser.parseDuration(TMUtils.DateUtils.convertMiliSecondsToDurationFormat(durationMap[owner]));
        let filedWorkItems = getUniqueWorkItem(ownerFiledWorkItemMap[owner]);
        filedWorkItems.forEach((filedWorkItem: TCMContracts.TestSessionWorkItemReference) => {
            updateWorkItemsFiledDetail(sessionOwnerForGrid.workItemsFiledDetail, filedWorkItem.type, filedWorkItem.id);
        });
        let exploredWorkItems = <TCMContracts.TestSessionExploredWorkItemReference[]>getUniqueWorkItem(exploredWorkItemMap[owner]);
        exploredWorkItems.forEach((exploredWorkItem: TCMContracts.TestSessionExploredWorkItemReference) => {
            sessionOwnerForGrid.workItemExplored.push(exploredWorkItem.type);
        });

        sessionOwnersForGrid.push(sessionOwnerForGrid);
    }

    return sessionOwnersForGrid;
}

/**
* Api used to fetch all filed workitems for grid.
*
* @param testSessions
* @param witIds fetched workitem ids using custom query
* @publicapi
*/
export function generateWorkItemFiledForGridWithCustomQuery(testSessions: TCMContracts.TestSession[], witIds: number[]): IPromise<IWorkItemFiledGridRow[]> {
    Diag.logVerbose("Generating filed work items data for session grid for custom query");
    let deferred: Q.Deferred<IWorkItemFiledGridRow[]> = q.defer<IWorkItemFiledGridRow[]>();
    let filedWorkitemsForGrid: IWorkItemFiledGridRow[] = [];
    let totalFiledWorkItems: TCMContracts.TestSessionWorkItemReference[] = [];
    let totalExploredworkItemIds: number[] = getExploredWorkItemIdsInSessions(testSessions, witIds);
    let promise = TMUtils.getWorkItemTrackingManager().getWorkItems(totalExploredworkItemIds, null, null, WITContracts.WorkItemExpand.Relations);
    promise.then((workItems: WITContracts.WorkItem[]) => {

        totalFiledWorkItems = getFiledWorkItemInSessionsWithCustomQuery(testSessions, workItems);
        totalFiledWorkItems.forEach((filedWorkItem) => {
            let workItem: IWorkItemFiledGridRow = {
                id: filedWorkItem.id,
                type: filedWorkItem.type
            };
            filedWorkitemsForGrid.push(workItem);
        });

        deferred.resolve(filedWorkitemsForGrid);
    }, (error: any) => {
        Diag.logError("Fetch work item data with relations failed with error " + error.message);
        deferred.reject(error);
    });
    return deferred.promise;
}

/**
* Api used to fetch all filed workitems for grid.
*
* @param testSessions
* @publicapi
*/
export function generateWorkItemFiledForGrid(testSessions: TCMContracts.TestSession[]): IWorkItemFiledGridRow[] {
    Diag.logVerbose("Generating filed work items data for session grid");

    let totalFiledWorkItems: TCMContracts.TestSessionWorkItemReference[] = [];
    let filedWorkitemsForGrid: IWorkItemFiledGridRow[] = [];
    if (testSessions.length > 0) {
        testSessions.forEach((session: TCMContracts.TestSession) => {
            let filedWorkItems: TCMContracts.TestSessionWorkItemReference[] = getFiledWorkItemInSession(session);
            Utils_Array.addRange(totalFiledWorkItems, filedWorkItems);
        });
        totalFiledWorkItems = getUniqueWorkItem(totalFiledWorkItems);
        totalFiledWorkItems.forEach((filedWorkItem: TCMContracts.TestSessionWorkItemReference) => {
            let workItemType: string = filedWorkItem.type;
            let workItem: IWorkItemFiledGridRow = {
                id: filedWorkItem.id,
                type: workItemType
            };

            filedWorkitemsForGrid.push(workItem);
        });
    }

    return filedWorkitemsForGrid;
}

/**
* Api used to fetch workitem fields.
*
* @publicapi
*/
export function fetchWorkItemData(ids: number[]): IPromise<ISessionGridViewModel[]> {
    let deferred: Q.Deferred<ISessionGridViewModel[]> = q.defer<ISessionGridViewModel[]>();
    let sesssionGridResults: ISessionGridViewModel[] = [];

    let columns: string[] = [];
    columns.push(WorkItemField.workItemType);
    columns.push(WorkItemField.title);
    columns.push(WorkItemField.id);
    columns.push(WorkItemField.workItemState);
    columns.push(WorkItemField.assignedTo);
    columns.push(WorkItemField.priority);

    Diag.logVerbose("Fetching data for work items with ids " + ids.join(", "));

    let promise = TMUtils.getWorkItemTrackingManager().getWorkItems(ids, columns, new Date());

    promise.then((workItems: WITContracts.WorkItem[]) => {
        if (workItems) {
            Diag.logVerbose("Fetched data for " + workItems.length + "workitems");

            workItems.forEach((workItem) => {
                let sessionGrid: ISessionGridViewModel = {
                    type: workItem.fields[WorkItemField.workItemType],
                    id: workItem.id,
                    title: workItem.fields[WorkItemField.title],
                    url: getEditableWitUrl(workItem.fields[WorkItemField.id]),
                    state: workItem.fields[WorkItemField.workItemState],
                    priority: workItem.fields[WorkItemField.priority],
                    assignedTo: workItem.fields[WorkItemField.assignedTo]
                };
                sesssionGridResults.push(sessionGrid);
            });
        }
        deferred.resolve(sesssionGridResults);
    }, (error: any) => {
        Diag.logError("Fetch workitem data failed with error " + error.message);
        deferred.reject(error);
    });

    return deferred.promise;
}

function getFiledWorkItemInSessionsWithCustomQuery(testSessions: TCMContracts.TestSession[], workItems: WITContracts.WorkItem[]): TCMContracts.TestSessionWorkItemReference[] {

    let result: TCMContracts.TestSessionWorkItemReference[] = [];
    let fetchedWorkItemMap: { [key: number]: WITContracts.WorkItem } = {};
    let totalFiledWorkItems: TCMContracts.TestSessionWorkItemReference[] = [];
    let totalExploredWorkItems: TCMContracts.TestSessionExploredWorkItemReference[] = [];
    let witIds: number[] = [];

    workItems.forEach((workItem: WITContracts.WorkItem) => {
        fetchedWorkItemMap[workItem.id] = workItem;
        witIds.push(workItem.id);
    });

    testSessions.forEach((session: TCMContracts.TestSession) => {

        let filedWorkItems: TCMContracts.TestSessionWorkItemReference[] = getFiledWorkItemInSession(session);
        Utils_Array.addRange(totalFiledWorkItems, filedWorkItems);

        let exploredWorkItems = getExploredWorkItemInSessionWithCustomQuery(session, witIds);
        Utils_Array.addRange(totalExploredWorkItems, exploredWorkItems);
    });

    totalFiledWorkItems = getUniqueWorkItem(totalFiledWorkItems);
    totalExploredWorkItems = <TCMContracts.TestSessionExploredWorkItemReference[]>getUniqueWorkItem(totalExploredWorkItems);

    totalFiledWorkItems.forEach((filedWorkItem) => {
        // map to handle scenario when user is doing search similar bugs on already filedbug under same traceability session
        let similarBugScenarioMap: { [key: number]: boolean } = {};

        totalExploredWorkItems.forEach((exploredWorkItem) => {
            let relations = fetchedWorkItemMap[exploredWorkItem.id].relations;
            if (relations) {
                relations.forEach((relation: WITContracts.WorkItemRelation) => {
                    let filedWorkItemId = getIdFromWorkItemUrl(relation.url);
                    if (!similarBugScenarioMap[filedWorkItemId]) {
                        similarBugScenarioMap[filedWorkItemId] = true;
                        if (filedWorkItemId === filedWorkItem.id) {
                            let filedWorkItemType: string = filedWorkItem.type;
                            if (isWorkItemRelationSupported(exploredWorkItem.type, filedWorkItemType, relation.rel)) {
                                let workItem: TCMContracts.TestSessionWorkItemReference = {
                                    id: filedWorkItem.id,
                                    type: filedWorkItemType
                                };

                                result.push(workItem);
                            }
                        }
                    }
                });
            }
        });
    });

    return result;
}

/**
* Api used to get explored workitems in given session.
*
* @param testSessions
* @param witIds fetched workitem ids using custom query
* @publicapi
*/
function getExploredWorkItemInSessionWithCustomQuery(testSession: TCMContracts.TestSession, witIds: number[]): TCMContracts.TestSessionExploredWorkItemReference[] {
    let result: TCMContracts.TestSessionExploredWorkItemReference[] = getExploredWorkItemInSession(testSession);
    return result.filter((workItem: TCMContracts.TestSessionExploredWorkItemReference) => {
        return witIds.indexOf(workItem.id) !== -1;
    });
}

/**
* Api used to explored workitems ids in all sessions.
*
*/
function getExploredWorkItemIdsInSessions(testSessions: TCMContracts.TestSession[], witIds: number[] = null) {

    let totalExploredworkItems: TCMContracts.TestSessionExploredWorkItemReference[] = [];
    let totalExploredworkItemIds: number[] = [];
    testSessions.forEach((session: TCMContracts.TestSession) => {
        let exploredWorkItems: TCMContracts.TestSessionExploredWorkItemReference[];
        if (witIds) {
            exploredWorkItems = getExploredWorkItemInSessionWithCustomQuery(session, witIds);
        } else {
            exploredWorkItems = getExploredWorkItemInSession(session);
        }
        Utils_Array.addRange(totalExploredworkItems, exploredWorkItems);
    });

    totalExploredworkItems = <TCMContracts.TestSessionExploredWorkItemReference[]>getUniqueWorkItem(totalExploredworkItems);
    totalExploredworkItems.forEach((workItem) => {
        totalExploredworkItemIds.push(workItem.id);
    });

    return totalExploredworkItemIds;
}

/**
* Api used to map for filed workitem in given session.
*
*/
function getFiledWorkItemMapInSession(testSession: TCMContracts.TestSession) {
    let filedWorkItemMap: { [key: number]: IWorkItemFiledGridRow } = {};
    let totalFiledWorkItems: TCMContracts.TestSessionWorkItemReference[] = getFiledWorkItemInSession(testSession);

    totalFiledWorkItems = getUniqueWorkItem(totalFiledWorkItems);
    totalFiledWorkItems.forEach((filedWorkItem: TCMContracts.TestSessionWorkItemReference) => {
        if (!filedWorkItemMap[filedWorkItem.id]) {
            filedWorkItemMap[filedWorkItem.id] = {
                type: filedWorkItem.type,
                id: filedWorkItem.id
            };
        }
    });

    return filedWorkItemMap;
}

// extract displayname from combination of id:displayname
export function getSessionOwnerDisplayName(uniqueName: string): string {
    return uniqueName.split(":")[1];
}

/**
* Api used to create IWorkItemsFiledDetail object.
*
*/
function createWorkItemsFiledDetail(): IWorkItemsFiledDetail {
    let workItemsfiledDetail: IWorkItemsFiledDetail = {
        bugCount: 0,
        taskCount: 0,
        testCaseCount: 0,
        workItemFiled: []
    };

    return workItemsfiledDetail;
}

/**
* Api used to get owner identity object.
*
*/
function getOwnerIdentity(owner: VSS_Common_Contracts.IdentityRef): TFS_Host_TfsContext.IContextIdentity {
    let identity: TFS_Host_TfsContext.IContextIdentity = {
        displayName: owner.displayName,
        id: owner.id,
        isActive: false,
        isContainer: false,
        uniqueName: ""
    };

    return identity;
}

/**
* Api used to get owner identity object.
*
*/
function getOwnerIdentityFromUniqueName(uniqueName: string): TFS_Host_TfsContext.IContextIdentity {
    let identity: TFS_Host_TfsContext.IContextIdentity = {
        displayName: uniqueName.split(":")[1],
        id: uniqueName.split(":")[0],
        isActive: false,
        isContainer: false,
        uniqueName: ""
    };

    return identity;
}

/**
* Api used to get unique session owner name as ownerId:ownerName.
*
*/
function getSessionOwnerUniqueName(owner: VSS_Common_Contracts.IdentityRef): string {
    return owner.id + ":" + owner.displayName;
}

/**
* Api used to get all workitems filed in session.
*
*/
function getFiledWorkItemInSession(session: TCMContracts.TestSession) {
    let filedWorkItems: TCMContracts.TestSessionWorkItemReference[] = [];
    if (session.propertyBag.bag[ExploratorySessionConstant.AssociatedWorkItem]) {
        filedWorkItems = JSON.parse(session.propertyBag.bag[ExploratorySessionConstant.AssociatedWorkItem]);
    }

    return filedWorkItems;
}

/**
* Api used to get all workitems explored in session.
*
*/
function getExploredWorkItemInSession(session: TCMContracts.TestSession) {
    let exploredWorkItems: TCMContracts.TestSessionExploredWorkItemReference[] = [];
    if (session.propertyBag.bag[ExploratorySessionConstant.ExploredWorkItem]) {
        exploredWorkItems = JSON.parse(session.propertyBag.bag[ExploratorySessionConstant.ExploredWorkItem]);
    }

    return exploredWorkItems;
}

/**
* Api used to verify relation between explored and filed workitem type.
*
*/
function isWorkItemRelationSupported(exploredWorkItemType: string, filedWorkItemType: string, relation: string): boolean {
    let exploredWorkItemCategory = WorkItemMetaDataCache.getCategory(exploredWorkItemType);

    if (exploredWorkItemCategory === WorkItemCategories.TestCaseCategory) {
        if (WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.BugCategory) === filedWorkItemType) {
            return (relation === WorkItemRelations.testedByReverse);
        } else if (WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.TaskCategory) === filedWorkItemType) {
            return (relation === WorkItemRelations.testedByReverse);
        } else if (WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.TestCaseCategory) === filedWorkItemType) {
            return (relation === WorkItemRelations.relatedLink);
        } else {
            return false;
        }
    } else if (exploredWorkItemCategory === WorkItemCategories.RequirementCategory) {
        if (WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.BugCategory) === filedWorkItemType) {
            return (relation === WorkItemRelations.childLink || relation === WorkItemRelations.relatedLink);
        } else if (WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.TaskCategory) === filedWorkItemType) {
            return (relation === WorkItemRelations.childLink);
        } else if (WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.TestCaseCategory) === filedWorkItemType) {
            return (relation === WorkItemRelations.childLink);
        } else {
            return false;
        }
    } else {
        if (WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.BugCategory) === filedWorkItemType) {
            return (relation === WorkItemRelations.relatedLink);
        } else if (WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.TaskCategory) === filedWorkItemType) {
            return (relation === WorkItemRelations.relatedLink);
        } else if (WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.TestCaseCategory) === filedWorkItemType) {
            return (relation === WorkItemRelations.testedByForward);
        } else {
            return false;
        }
    }
}

/**
* Api used to get workItemId from url of type:.../_apis/wit/workItems/Id
*
*/
function getIdFromWorkItemUrl(url: string): number {
    return parseInt(url.substring(url.lastIndexOf("/") + 1, url.length));
}

/**
* Api used to update counts and array of workitemfiled
*
*/
function updateWorkItemsFiledDetail(workItemsfiledDetail: IWorkItemsFiledDetail, workItemType: string, workItemId: number) {
    let workItem: IWorkItemFiledGridRow = {
        id: workItemId,
        type: workItemType
    };

    workItemsfiledDetail.workItemFiled.push(workItem);
    if (workItemType === WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.BugCategory)) {
        workItemsfiledDetail.bugCount++;
    } else if (workItemType === WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.TaskCategory)) {
        workItemsfiledDetail.taskCount++;
    } else if (workItemType === WorkItemMetaDataCache.getDefaultWorkItemType(WorkItemCategories.TestCaseCategory)) {
        workItemsfiledDetail.testCaseCount++;
    }
}

/**
* Updating owners details.
* from sorted list we are selecting top element and adding all remaining element as Others.
*
* @param sessionOwners It is object of sessionOwners used to show details on header chart section.
* @param list Sorted list which used to extract top elements.
* @param showCount Number of owners showing as legend on header chart section.
*/
function updateSessionOwnerDetail(sessionOwners: IExploratorySessionOwnerDetails[], list: IKeyValuePair[], showCount: number) {
    let listLength = list.length;
    let totalOwner: number = 0;
    let showingOwner: number = 0;
    for (let i = 0; i < listLength; i++) {
        totalOwner = totalOwner + list[i].value;
        if (i < showCount) {
            let owner: IExploratorySessionOwnerDetails = {
                sessionOwnerName: getSessionOwnerDisplayName(list[i].key),
                count: list[i].value,
                type: "User" + (i + 1)
            };
            showingOwner = showingOwner + list[i].value;
            sessionOwners.push(owner);
        }
    }

    let othersCount = totalOwner - showingOwner;
    if (othersCount > 0) {
        let othersDetail: IExploratorySessionOwnerDetails = {
            sessionOwnerName: ExploratorySessionConstant.OthersWorkItemType,
            count: othersCount,
            type: ExploratorySessionConstant.OthersWorkItemType
        };
        sessionOwners.push(othersDetail);
    }
}

/**
* get workItem editable url
*
*/
function getEditableWitUrl(workItemId: number): string {
    return TFS_Host_TfsContext.TfsContext.getDefault().getPublicActionUrl("edit", "workitems", {
        parameters: workItemId
    });
}

/**
* Updating workitem details.
* from sorted list we are selecting top element and adding all remaining element as Others.
*
* @param workItemDetail It can be either object of filedWorkItem or exploredWorkItem used to show details on header chart section.
* @param list Sorted list which used to extract top elements.
* @param showCount Number of workItemType showing as legend on header chart section.
*/
function updateWorkItemDetail(workItemDetail: IExploratorySessionWorkItemDetails[], list: IKeyValuePair[], showCount: number) {
    let listLength = list.length;
    let totalWorkItem: number = 0;
    let showingWorkItem: number = 0;
    for (let i = 0; i < listLength; i++) {
        totalWorkItem = totalWorkItem + list[i].value;
        if (i < showCount && list[i].key !== ExploratorySessionConstant.OthersWorkItemType) {
            let detail: IExploratorySessionWorkItemDetails = {
                workItemType: list[i].key,
                count: list[i].value
            };
            showingWorkItem = showingWorkItem + list[i].value;
            workItemDetail.push(detail);
        }
    }

    let othersCount = totalWorkItem - showingWorkItem;
    if (othersCount > 0) {
        let othersDetail: IExploratorySessionWorkItemDetails = {
            workItemType: ExploratorySessionConstant.OthersWorkItemType,
            count: othersCount
        };
        workItemDetail.push(othersDetail);
    }
}

/**
* get unique array of TestSessionWorkItemReference.
*
*/
function getUniqueWorkItem(exploredWorkItem: TCMContracts.TestSessionWorkItemReference[]): TCMContracts.TestSessionWorkItemReference[] {
    return exploredWorkItem.sort((a: TCMContracts.TestSessionWorkItemReference, b: TCMContracts.TestSessionWorkItemReference) => {
        return a.id - b.id;
    }).filter((elem, index, self) => {
        return !index || elem.id !== self[index - 1].id;
    });
}

/**
* Sorting list in desending order.
*
*/
export function sortList(list: IKeyValuePair[]): IKeyValuePair[] {
    return list.sort((a, b) => {
        return b.value - a.value;
    });
}

/**
* Converting store object in keyValue Pair object, which can be used to do sorting.
*
*/
export function convertStoreToList(store): IKeyValuePair[] {
    let list: IKeyValuePair[] = [];

    for (let key in store) {
        list.push({
            key: key,
            value: store[key]
        });
    }

    return list;
}

export function bucketArtifacts(artifacts: string[]): IKeyValuePair[] {
    let artifactStore: { [key: string]: number } = {};

    artifacts.forEach((artifact) => {
        if (!artifactStore[artifact]) {
            artifactStore[artifact] = 1;
        } else {
            artifactStore[artifact]++;
        }
    });

    let list = sortList(convertStoreToList(artifactStore));
    return list;
}

export function getTopNKeyValuePairs(list, showCount): IKeyValuePair[] {
    let artifactPairs: IKeyValuePair[] = [];
    let listLength = list.length;
    let othersCount: number = 0;
    for (let i = 0; i < listLength; i++) {
        if (i < showCount) {
            let pair: IKeyValuePair = {
                key: list[i].key,
                value: list[i].value
            };
            artifactPairs.push(pair);
        } else {
            othersCount += list[i].value;
        }
    }

    if (othersCount > 0) {
        let othersPair: IKeyValuePair = {
            key: ExploratorySessionConstant.OthersWorkItemType,
            value: othersCount
        };
        artifactPairs.push(othersPair);
    }

    return artifactPairs;
}

/**
* Update session duration in ms.
*
*/
function getSessionDuration(session: TCMContracts.TestSession): number {
    return Math.abs(new Date(session.endDate.toString()).getTime() - new Date(session.startDate.toString()).getTime());
}

/**
* Get explored duration in ms.
*
*/
function getWorkItemExploredDuration(workItem: TCMContracts.TestSessionExploredWorkItemReference): number {
    return Math.abs(new Date(workItem.endTime.toString()).getTime() - new Date(workItem.startTime.toString()).getTime());
}

/**
* Update workitem store object of type {workItemType, count}.
*
*/
function updateWorkItemStore(workItemStore, workItems: TCMContracts.TestSessionWorkItemReference[], storeType) {
    workItems.forEach((item) => {
        let workItemType = item.type;

        if (!workItemStore[workItemType]) {
            workItemStore[workItemType] = 1;
        } else {
            workItemStore[workItemType]++;
        }
    });
}

/**
* getting error message based on result fetch from queryId
*
*/
export function getErrorMessageFromQueryIdResult(message: string): string {

    if (message.indexOf("404") === 0) {
        // error message contain 404 if query result exceed limit of 200
        return Resources.SessionInsightQueryIdResultExceedText;
    } else {
        // we are consider all other scenarios as deletion or user dont have permission
        return Resources.SessionInsightQueryIdDeletedText;
    }
}

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/Utils", exports);
