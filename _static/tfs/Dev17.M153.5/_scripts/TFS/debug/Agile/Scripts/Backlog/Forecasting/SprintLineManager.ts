import * as TFS_Agile_ProductBacklog_DM from "Agile/Scripts/Backlog/ProductBacklogDataManager";
import * as TFS_Agile_Utils from "Agile/Scripts/Common/Utils";
import * as AgileProductBacklogResources from "Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog";
import { BacklogConfigurationService, WorkItemStateCategory } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import * as TFS_AgileCommon from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Diag from "VSS/Diag";
import * as Events_Handlers from "VSS/Events/Handlers";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
var WorkItemUtils = TFS_Agile_Utils.WorkItemUtils;

/** Interface for forecasting data, to be kept in sync with EffortDataViewModel.cs */
export interface IEffortData {
    ids: number[];
    efforts: number[];
    effortFieldName: string;
}

/** Interface for sprint line information */
export interface ISprintLineInfo {

    /** name of the iteration*/
    name: string;

    /** flag indicating whether this workitem is the last one in planning */
    isLastWorkItemInPlanning?: boolean;

    /** flag indicating whether this workitem is the last one in this sprint */
    isLastWorkItemInSprint?: boolean;
}

export class SprintLineManager {

    public static EVENT_LINES_UPDATED: string = "lines-updated";
    public static EVENT_ENABLED_UPDATED: string = "enabled-updated";
    public static SCHEDULEUPDATELINES_DELAYTIME_MS = 50;

    /**
     * Create sprint line manager from data on json island on page
     *
     * @param gridDataManager grid Data Manager
     * @param teamSettings team settings
     * @param effortData effort data
     * @param isWorkItemOfRequirementCategory helper to determine if a workitem is of requirement category
     * @return
     */
    public static createSprintLineManager(gridDataManager: any, teamSettings: TFS_AgileCommon.ITeamSettings, effortData: IEffortData, isWorkItemOfRequirementCategory: (id: number) => boolean): SprintLineManager {
        Diag.Debug.assertParamIsObject(gridDataManager, "gridDataManager");
        Diag.Debug.assertParamIsObject(teamSettings, "teamSettings");
        Diag.Debug.assertParamIsObject(effortData, "effortData");

        return new SprintLineManager(effortData, gridDataManager, teamSettings, isWorkItemOfRequirementCategory);
    }

    protected _events: Events_Handlers.NamedEventCollection<any, any>;
    protected _workItemEffort: any;
    protected _gridDataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager;
    protected _effortFieldName: string;
    protected _iterations: TFS_AgileCommon.IIterationData[];
    protected _linesLookup: IDictionaryStringTo<ISprintLineInfo>;
    protected _sprintVelocity: number;
    protected _enabled: boolean = false;
    protected _updateLinesDelayedFunction: Utils_Core.DelayedFunction;

    /**
     * Sprint line manager that will manage calculate sprint lines
     *
     * @param effortData effort Data
     * @param gridDataManager grid Data Manager
     * @param teamSettings team Settings
     * @param _isWorkItemOfRequirementCategory helper to determine if a workitem is of requirement category
     */
    constructor(
        effortData: IEffortData,
        gridDataManager: TFS_Agile_ProductBacklog_DM.ProductBacklogDataManager,
        teamSettings: TFS_AgileCommon.ITeamSettings,
        protected _isWorkItemOfRequirementCategory: (workItemId: number) => boolean) {

        Diag.Debug.assertParamIsObject(effortData, "effortData");
        Diag.Debug.assertParamIsObject(gridDataManager, "gridDataManager");
        Diag.Debug.assertParamIsObject(teamSettings, "teamSettings");

        this._events = new Events_Handlers.NamedEventCollection();
        this._gridDataManager = gridDataManager;

        // Process effort data
        this._processEffortData(effortData);

        // listen to workitem saved and update based on it
        const store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        this._iterations = teamSettings.futureIterations;

        WorkItemManager.get(store).attachWorkItemChanged(this._workItemChangedHandler);

        // we won't send redraw flag with updates responding to data manager as it will send its own refresh event to all subscribers
        this._gridDataManager.attachNewItem(this.newItemHandler);

        this._gridDataManager.attachMoveItems(this.updateLinesWithoutRedraw);
        this._gridDataManager.attachRemovedItem(this.updateLinesWithoutRedraw);
        this._gridDataManager.attachIdChange(this.idChangedHandler);
    }

    public dispose() {
        const store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        WorkItemManager.get(store).detachWorkItemChanged(this._workItemChangedHandler);

        if (this._gridDataManager) {
            this._gridDataManager.detachNewItem(this.newItemHandler);
            this._gridDataManager.detachMoveItems(this.updateLinesWithoutRedraw);
            this._gridDataManager.detachRemovedItem(this.updateLinesWithoutRedraw);
            this._gridDataManager.detachIdChange(this.idChangedHandler);
        }
        this._gridDataManager = null;
    }

    private _workItemChangedHandler = (sender, args) => {
        if (args.change === WorkItemChangeType.Saved || args.change === WorkItemChangeType.Opened) {
            this._beginUpdateWorkItemEffort(args.workItem, null, () => {
                if (args.change === WorkItemChangeType.Saved) {
                    this.scheduleDelayedUpdateLines(true);
                }
            });
        }
    }

    private idChangedHandler = (source, args) => {
        // new id has been populated by workitem saved so just delete the old one
        delete this._workItemEffort[args.oldId];
        if (this._linesLookup && this._linesLookup.hasOwnProperty(args.oldId)) {
            this._linesLookup[args.newId] = this._linesLookup[args.oldId];
            delete this._linesLookup[args.oldId];
        }
    }

    private updateLinesWithoutRedraw = () => {
        this.updateLines(false);
    }

    private newItemHandler = (source, args) => {
        if (args.workItem) { // workitem is only sent with background save
            this._beginUpdateWorkItemEffort(args.workItem, args.workItemId, () => {
                this.updateLines(false);
            });
        }
        else {
            this.updateLines(false);
        }
    }

    /**
     * Reconfigure the underlying data source
     * 
     * @param effortData Effort data
     */
    public reconfigure(effortData: IEffortData) {
        this._processEffortData(effortData);
    }

    /**
     * update sprint lines
     *
     * @param sendRedraw whether to send redraw flag with update event
     */
    public updateLines(sendRedraw: boolean) {
        Diag.Debug.assertParamIsBool(sendRedraw, "sendRedraw");

        const workItemIds = this._getWorkItemIdsForForecasting();
        const iterationCount = this._iterations.length;

        let errorMessage = Utils_String.empty;
        if (iterationCount === 0) {
            errorMessage = AgileProductBacklogResources.Forecast_NoSprints;
        }
        else if (workItemIds.length === 0) {
            errorMessage = AgileProductBacklogResources.Forecast_NoBacklog;
        }

        let size = this._sprintVelocity;
        let iterationIndex = 0;
        let effort = 0;
        let index = 0;
        let prevWorkItemId = 0;
        let lastWorkItemId = -1;
        let totalEffort = 0; // effort included in the iteration so far
        let workItemsInSprintCount = 0;
        const lookup: IDictionaryStringTo<ISprintLineInfo> = {};

        while (iterationIndex < iterationCount && index < workItemIds.length) {

            if (workItemsInSprintCount === 0) {
                workItemsInSprintCount += 1;
                let lookupId = workItemIds[index];
                lookup[lookupId] = {
                    name: this._iterations[iterationIndex].name,
                    isLastWorkItemInSprint: false
                } as ISprintLineInfo;
                while ((lookupId = this._gridDataManager.getParentIdFromWorkItemId(lookupId)) !== 0) {
                    lookup[lookupId] = {
                        name: this._iterations[iterationIndex].name
                    };
                }
            }

            if (!this._workItemEffort.hasOwnProperty(workItemIds[index])) {
                index += 1;
                workItemsInSprintCount += 1;
                continue;
            }
            effort = this._workItemEffort[workItemIds[index]] || 0;
            if ((effort + totalEffort) <= size) { // current work item fit in the sprint
                totalEffort += effort;
                prevWorkItemId = workItemIds[index];
                index += 1;
                workItemsInSprintCount += 1;
            }
            else {
                // We have run out of space in the current iteration, so move to the next one.

                // If there were work items added to the iteration, save off the information on where
                // to draw the sprint line at each level of expansion.
                if (prevWorkItemId !== 0 && workItemsInSprintCount > 0) {
                    let lookupId = this._gridDataManager.getLastLeafWorkItemId(prevWorkItemId);
                    while (lookupId !== 0) {
                        lookup[lookupId] = {
                            name: this._iterations[iterationIndex].name,
                            isLastWorkItemInSprint: true
                        };
                        lookupId = this._gridDataManager.getParentIdFromWorkItemId(lookupId);
                    }
                    lastWorkItemId = prevWorkItemId;
                }
                prevWorkItemId = 0;
                size = size - totalEffort + this._sprintVelocity; // size of new sprint will include the remaining effort not used by old sprint
                iterationIndex += 1;
                totalEffort = 0;
                workItemsInSprintCount = 0;
            }
        }

        if (!errorMessage && index === 0) {
            errorMessage = AgileProductBacklogResources.Forecast_ItemTooBig;
        }

        // we could exit the loop because we ran out of Work Items so we need to add the last iteration
        if (iterationIndex < iterationCount && totalEffort <= size && prevWorkItemId) {
            var lookupId = this._gridDataManager.getLastLeafWorkItemId(prevWorkItemId);
            lookup[lookupId] = { name: this._iterations[iterationIndex].name };
            lastWorkItemId = prevWorkItemId;
            iterationIndex += 1;
        }

        // set the last Work if all iterations were scanned
        var workItemIdOfLastRowWithLine = lastWorkItemId > 0 ?
            this._gridDataManager.getLastLeafWorkItemId(lastWorkItemId) : lastWorkItemId;
        if (lookup.hasOwnProperty(String(workItemIdOfLastRowWithLine)) && iterationIndex >= iterationCount) {
            lookup[workItemIdOfLastRowWithLine].isLastWorkItemInPlanning = true;
        }

        this._linesLookup = lookup;
        this._raiseLinesUpdated({
            redraw: sendRedraw,
            errorMessage: errorMessage
        });
    }

    /**
     * Schedule a delayed update for the sprint lines.
     * @param  sendRedraw  Whether to send redraw flag with update event.
     */
    public scheduleDelayedUpdateLines(sendRedraw: boolean) {
        Diag.Debug.assertParamIsBool(sendRedraw, "sendRedraw");

        if (!this._updateLinesDelayedFunction) {
            this._updateLinesDelayedFunction = new Utils_Core.DelayedFunction(this, SprintLineManager.SCHEDULEUPDATELINES_DELAYTIME_MS, "updateLinesDelayedFunction", () => {
                this.updateLines(sendRedraw);
            });
            this._updateLinesDelayedFunction.start();
        } else {
            this._updateLinesDelayedFunction.reset();
        }
    }

    /**
     * set value for sprint velocity
     *
     * @param value new sprint size
     */
    public setSprintVelocity(value: number) {
        Diag.Debug.assertParamIsNumber(value, "value");

        const oldSprintVelocity = this._sprintVelocity;
        if (value > 0) {
            this._sprintVelocity = Math.floor(value);

            // Update the lines if the sprint velocity has changed
            if (this._sprintVelocity !== oldSprintVelocity) {
                this.updateLines(true);
            }
        }
    }

    /**
     * Get sprint velocity
     *
     * @return 
     */
    public getSprintVelocity(): number {
        return this._sprintVelocity;
    }

    /**
     * Sets flag indicating if sprint lines are enabled.
     *
     * @param enabled True indicates sprint lines are on and false is off.
     */
    public setEnabled(enabled: boolean) {

        Diag.Debug.assertParamIsBool(enabled, "enabled");

        this._enabled = enabled;

        // Let listeners know the enabled state has changed.
        this._raiseEnabledUpdated();
    }

    /**
     * Gets flag indicating if sprint lines are enabled.
     *
     * @return True indicates sprint lines are on and false is off.
     */
    public getEnabled(): boolean {

        return this._enabled;
    }

    /**
     * return the effort field name
     *
     * @return 
     */
    public getEffortFieldName(): string {
        return this._effortFieldName;
    }

    /**
     * Gets the sprint line info for the provided work item id.  If there are no sprint lines
     * associated with the work item, undefined is returned.
     *
     * @param workItemId ID of the work item to get the sprint line info for.
     */
    public getSprintLineInfo(workItemId: number): ISprintLineInfo {

        Diag.Debug.assertParamIsNumber(workItemId, "workItemId");

        return this._linesLookup[workItemId];
    }

    /**
     *  Gets the sprint line info 
     */
    public getSprintLineLookup(): IDictionaryStringTo<ISprintLineInfo> {
        return this._linesLookup;
    }

    /**
     * Get list of forecasting iterations
     */
    public getForecastingIterations(): TFS_AgileCommon.IIterationData[] {
        return this._iterations;
    }

    /**
     *  Attach a handler for the EVENT_LINES_UPDATED event. 
     * 
     * @param handler 
     * The handler to attach. The handler should have the following signature:
     *     handler (sender, args)
     * The arguments passed to the handler have the following structure:
     *     {
     *         redraw: [flag indicating if the view should be refreshed],
     *         errorMessage: [any errors which have occurred while recalculating the lines]
     *     }
     * 
     */
    public attachLinesUpdated(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(SprintLineManager.EVENT_LINES_UPDATED, <any>handler);
    }

    /**
     * Remove a handler for the EVENT_LINES_UPDATED event
     * 
     * @param handler The handler to remove
     */
    public detachLinesUpdated(handler: IEventHandler) {
        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(SprintLineManager.EVENT_LINES_UPDATED, <any>handler);
    }

    /**
     * Attach a handler for when the enabled state changes.
     * 
     * @param handler 
     * The handler to attach. The handler should have the following signature:
     *     handler (sender, args)
     * The arguments passed to the handler have the following structure:
     *     {
     *         enabled: [boolean]
     *     }
     * 
     */
    public attachEnabledUpdated(handler: IEventHandler) {

        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.subscribe(SprintLineManager.EVENT_ENABLED_UPDATED, <any>handler);
    }

    /**
     * Remove a handler enabled state changes.
     *
     * @param handler The handler to remove
     */
    public detachEnabledUpdated(handler: IEventHandler) {

        Diag.Debug.assertParamIsFunction(handler, "handler");

        this._events.unsubscribe(SprintLineManager.EVENT_ENABLED_UPDATED, <any>handler);
    }

    /**
     * Checks if the effort for this work item is ignored when calculating sprint line locations.
     *
     * @param workItemId Work item id to check for
     * @return True if the work item is not included when calculating sprint line locations.
     */
    public workItemEffortIsExcluded(workItemId: number) {
        return (this._workItemEffort.hasOwnProperty(workItemId) === false);
    }

    /**
     * Protected for testing only
     */
    protected _getWorkItemsForSprintLines(): number[] {
        let workItemIds = this._gridDataManager.getWorkItemIds() || [];

        if (workItemIds.length > 0) {
            let workItemIdsMap: IDictionaryNumberTo<boolean> = {};

            $.each(workItemIds, (idx, id) => {
                if (this._workItemEffort.hasOwnProperty(id.toString(10))) {
                    id = id || 0;
                    workItemIdsMap[id] = true;
                    const descendents = this._gridDataManager.getDescendantWorkItemIds(id);
                    $.each(descendents, (descendentIndex, descendentValue) => {
                        if (this._workItemEffort.hasOwnProperty(descendentValue) && this._isWorkItemOfRequirementCategory(descendentValue)) {
                            workItemIdsMap[id] = false;
                            return false;
                        }
                    });
                }
            });

            workItemIds = workItemIds.filter(id => workItemIdsMap[id]);
        }

        return workItemIds;
    }

    /**
     * set workitem effort
     * 
     * @param workItem workItem
     * @param workItemId Workitem Id for the cases where the workitem object does not have the right id
     * @param callback Function to callback when complete
     */
    protected _beginUpdateWorkItemEffort(workItem: any, workItemId: number, callback: Function) {

        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsFunction(callback, "callback");

        const id = workItemId || workItem.id;
        const workItemState = workItem.getFieldValue(WITConstants.CoreFieldRefNames.State);
        const workItemType = workItem.getFieldValue(WITConstants.CoreFieldRefNames.WorkItemType);
        const backlogConfig = BacklogConfigurationService.getBacklogConfiguration();

        Diag.Debug.assertIsObject(backlogConfig, "SprintLineManager - Backlog configuration cannot be null");
        const metaState = backlogConfig.getWorkItemStateCategory(workItemType, workItemState);

        if (metaState === WorkItemStateCategory.Proposed) {
            this._workItemEffort[id] = WorkItemUtils.getFieldValueByName(workItem, this._effortFieldName) || 0;
        }
        else {
            delete this._workItemEffort[id];
        }

        callback();
    }

    /**
     * Notifies listeners that a request has completed
     * 
     * @param args object sent to consumers
     */
    protected _raiseLinesUpdated(args?: any) {
        Diag.Debug.assertIsObject(args, "args");

        // If sprint lines are enabled, raise the updated event.
        if (this._enabled) {
            this._events.invokeHandlers(SprintLineManager.EVENT_LINES_UPDATED, this, args);
        }
    }

    /**
     * Notifies listeners that the enabled state has changed.
     */
    protected _raiseEnabledUpdated() {
        this._events.invokeHandlers(SprintLineManager.EVENT_ENABLED_UPDATED, this, {
            enabled: this._enabled
        });
    }

    /**
     * Iterates over effort data and populates 'workitem -> effort' dictionary
     * @param effortData of type IEffortData
     */
    protected _processEffortData(effortData: IEffortData) {
        this._workItemEffort = {};

        for (let i = 0, l = effortData.ids.length; i < l; i++) {
            this._workItemEffort[effortData.ids[i]] = effortData.efforts[i];
        }

        this._effortFieldName = effortData.effortFieldName.toUpperCase();
    }

    /**
     * Get workitem Ids for forecasting. Excludes parent items if their children has effort
     */
    protected _getWorkItemIdsForForecasting(): number[] {
        const workItemIds = this._gridDataManager.getWorkItemIds();
        if (workItemIds && workItemIds.length > 0) {
            const workItemIdsMap: { [id: number]: boolean } = {};

            for (let id of workItemIds) {
                if (this._workItemEffort.hasOwnProperty(id)) {
                    workItemIdsMap[id] = true;
                }
            }

            for (let id of workItemIds) {
                if (workItemIdsMap.hasOwnProperty(id.toString(10))) {
                    id = id || 0;
                    const descendents = this._gridDataManager.getDescendantWorkItemIds(id);
                    for (let descendent of descendents) {
                        if (workItemIdsMap.hasOwnProperty(descendent) && this._isWorkItemOfRequirementCategory(descendent)) {
                            workItemIdsMap[id] = false;
                            break;
                        }
                    }
                }
            }

            return workItemIds.filter(id => !!workItemIdsMap[id]);
        }
        return [];
    }
}