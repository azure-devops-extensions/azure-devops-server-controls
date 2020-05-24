///<amd-dependency path="jQueryUI/droppable"/>
///<reference types="jquery" />

import Agile = require("Agile/Scripts/Common/Agile");
import CustomerIntelligenceConstants = require("Agile/Scripts/Common/CustomerIntelligence");
import {
    DirectoryPivotType
} from "Agile/Scripts/Common/DirectoryPivot";
import AgileProductBacklogResources = require("Agile/Scripts/Resources/TFS.Resources.AgileProductBacklog");
import * as WorkItemTypeIconControl from "Presentation/Scripts/TFS/Components/WorkItemTypeIcon";
import { BacklogConfigurationService, IBacklogLevelConfiguration, WorkItemStateCategory } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import TFS_AgileCommon = require("Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import Q = require("q");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import Tfs_Work_Contracts = require('TFS/Work/Contracts');
import Tfs_Work_WebApi = require('TFS/Work/RestClient');
import { AriaAttributes } from "VSS/Controls";
import Diag = require("VSS/Diag");
import Service = require("VSS/Service");
import Telemetry = require("VSS/Telemetry/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import WitTelemetryUtils = require("WorkItemTracking/Scripts/Utils/TelemetryUtils");
import { beginTrySetWorkItemTeamDefaults } from "WorkItemTracking/Scripts/Utils/WorkItemTeamUtil";
import WITDialogShim = require("WorkItemTracking/SharedScripts/WorkItemDialogShim");

import {
    ErrorUtils as PlatformErrorUtils,
} from "TFSUI/Common/Utils";
import { IDisplayColumnResult } from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { getService } from "VSS/Service";

/**
 * Enables the dragging of a work item to be cancelled when the ESC key is pressed by overriding jQuery UI's drop function.
 */
export function enableDragCancelling(): void {

    var defaultDropFunction = (<any>$.ui).droppable.prototype._drop;

    (<any>$.ui).droppable.prototype._drop = function () {
        var isDropCancelled = $(".ui-draggable-dragging").data("isDropCancelled");

        if (typeof isDropCancelled === "undefined") {
            /*
            If drop opertion is not cancelled, then call the default drop function of jQuery UI.
            */
            return defaultDropFunction.apply(this);
        } else {
            /*
              If the drop opertion is cancelled by pressing ESC key, then remove hoverClass styling
              from the droppable element.
            */
            var cancelDropFunction = this.options.cancelDrop;

            if (this.options.activeClass) {
                this.element.removeClass(this.options.activeClass);
            }
            if (this.options.hoverClass) {
                this.element.removeClass(this.options.hoverClass);
            }

            if (cancelDropFunction) {
                return cancelDropFunction.apply(this.element);
            }
            return false;
        }
    }

    var defaultDropOver = (<any>$.ui).droppable.prototype._over;
    (<any>$.ui).droppable.prototype._over = function () {
        $(".ui-draggable-dragging").removeData("isDropCancelled");
        return defaultDropOver.apply(this);
    };

    $(document).keyup((e: JQueryEventObject) => {
        if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
            $(".ui-draggable-dragging").data("isDropCancelled", true);
            $(".ui-draggable-dragging").trigger("mouseup");
        }
    });
}

/**
 * Define an interface for IIsItemOfRequirementCategory() function.
 * IIsItemOfRequirementCategory() function is defined in VSS.Agile.ProductBacklog.ts file
 */
export interface IIsItemOfRequirementCategory extends Function {
}

export interface IParentWICreateOptions {
    // Workitem ID of the parent workitem.
    id: number;

    // Fields to be copied from the parent workitem
    // _createNewWorkItem in Agile.TaskBoard.ts has a mixed list of WITConstants.CoreField and string ; not disrupting that now.
    fields: any[];
}

/**
 * Interface for WorkItemCreate options
 */
export interface IWorkItemCreateOptions {
    /** Parent field options */
    parenting?: IParentWICreateOptions;

    /** a boolean to indicate if to set default iteration on the workitem, rather than backlog iteration */
    useDefaultIteration?: boolean;
}

export module DatabaseCoreFieldRefName {
    export var AssignedTo = "System.AssignedTo";
    export var Id = "System.Id";
    export var IterationPath = "System.IterationPath";
    export var AreaPath = "System.AreaPath";
    export var State = "System.State";
    export var Title = "System.Title";
    export var WorkItemType = "System.WorkItemType";
    export var Tags = "System.Tags";
    export var CreatedDate = "System.CreatedDate";
    export var ChangedBy = "System.ChangedBy";
}

export module BoardType {
    export var Kanban = "KANBAN";
    export var Taskboard = "TASKBOARD";
}

/** Helper to move work items to an iteration or back  */
export class MoveToIterationHelper {
    /** Determines whether a given workitem can be moved to a given iteration */
    public canMoveToIteration(workItemTypes: string[], areAllItemsOwned: boolean): boolean {
        // Can only move unowned items
        if (!areAllItemsOwned) {
            return false;
        }

        if (!workItemTypes || workItemTypes.every(workItemType => !workItemType)) {
            return false;
        }

        return true;
    }

    /** Determines whether a given workitem can be moved back from an iteration to the backlog */
    public canMoveToBacklog(workItemTypes: string[], areAllItemsOwned: boolean, backlogLevelName: string): boolean {
        // Can only move unowned items
        if (!areAllItemsOwned) {
            return false;
        }

        if (!workItemTypes || workItemTypes.length === 0) {
            return false;
        }

        // Can only move to matching backlog
        let backlogLevelConfig = BacklogConfigurationService.getBacklogConfiguration().getBacklogByDisplayName(backlogLevelName);
        if (!backlogLevelConfig || Utils_Array.contains(BacklogConfigurationService.getBacklogConfiguration().hiddenBacklogs, backlogLevelConfig.id, Utils_String.ignoreCaseComparer)) {
            return false;
        }

        for (let workItemType of workItemTypes) {
            // Check if type can be moved to backlog level
            if (!Utils_Array.contains(backlogLevelConfig.workItemTypes, workItemType, Utils_String.ignoreCaseComparer)) {
                // Item doesn't match the backlog level...
                if (!Utils_String.equals(BacklogConfigurationService.getBacklogConfiguration().requirementBacklog.name, backlogLevelName, true)
                    || !Utils_Array.contains(BacklogConfigurationService.getBacklogConfiguration().taskBacklog.workItemTypes, workItemType, Utils_String.ignoreCaseComparer)) {
                    // ... and is not a task being moved to the requirement level
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Moves work items to a given iteration path.
     * @param workItemIds - Work item ids to move.
     * @param iterationPath - New iteration path.
     * @param sourcePage - Page from where the move request originated.
     */
    public moveToIteration(
        workItemIds: number[],
        iterationPath: string,
        sourcePage: string): IPromise<number[]> {

        var startTime = Date.now();

        // Store the iteration path of the last touched workitem to report to CI
        var prevIterationPath: string = null;

        // Retrieve all work items, then for each workitem, determine whether its children need to
        // updated or not.
        return this._getWorkItems(workItemIds).then(workItems => Q.all(workItems.map(workItem => {

            const updateIterationPath = () => {
                var field = workItem.getField(WITConstants.CoreField.IterationPath);
                prevIterationPath = field.getValue();

                let isBacklogItem = (workItem: WITOM.WorkItem): boolean => BacklogConfigurationService.getBacklogConfiguration().isWorkItemTypeInRequirementBacklog(workItem.workItemType.name);

                if (isBacklogItem(workItem)) {
                    // Work item is a requirement, also move children
                    return WorkItemUtils.beginUpdateChildWorkItemsNoSave(
                        workItem,
                        true, // Include parent in result
                        WITConstants.CoreField.IterationPath,
                        iterationPath,
                        isBacklogItem,
                        WorkItemUtils.getShouldUpdateMethodForIterationAssignment(workItem, iterationPath));
                } else {
                    // Workitem is not a requirement, save only, do not move any children
                    WorkItemUtils.setFieldValueRelative(field, iterationPath);

                    var iterationPathUpdated = field.isDirty() || (Utils_String.localeIgnoreCaseComparer(iterationPath, prevIterationPath) !== 0);
                    if (iterationPathUpdated) {
                        return Q([workItem]);
                    }
                }

                // Nothing needs to be updated
                return Q([]);
            };

            if (workItem.project.nodesCacheManager.isNodesCacheAvailable()) {
                return updateIterationPath();
            }
            return workItem.project.nodesCacheManager.beginGetNodes().then(() => {
                return updateIterationPath();
            });
        }))).then<number[]>((workItemsToSave: WITOM.WorkItem[][]) => {
            // Flatten array of workitems to save
            let workItems: WITOM.WorkItem[] = [].concat.apply([], workItemsToSave);

            // Filter workitems, we cannot save the same item multiple times
            workItems = Utils_Array.unique(workItems, (a, b) => a.id - b.id);

            // Use deferred pattern to interact with WITOM
            let deferredSave = Q.defer<number[]>();

            var store = this._getWorkItemStore();
            store.beginSaveWorkItemsBatch(workItems, (result: WITOM.IWorkItemsBulkSaveSuccessResult) => {
                // Successful save, return ids of updated work items
                deferredSave.resolve(result.workItems.map(x => x.id));

                const workItemTypes = result.workItems ? Utils_Array.unique(result.workItems.map(wi => wi.workItemType.name), Utils_String.ignoreCaseComparer) : [];
                this._logIterationAssignCIData(prevIterationPath, iterationPath, startTime, sourcePage, result.workItems.length, workItemTypes);
            }, (error: { results: WITOM.IWorkItemBulkSaveResult[] }) => {
                // Determine if any of the workitems that failed to save was not in the original set of work items. If
                // it is now, then it was brought in because of the Requirements-Move-Child-Tasks logic and we can show
                // an appropriate error message. Otherwise we show the default.
                // Note: We scan the workItemIds array for each failed workitem. Since this is on the error code path, it's
                // not worth optimizing (and complicating).
                let failedWorkItemWasChild = error.results.some(x => x.error && !Utils_Array.contains(workItemIds, x.workItem.id));

                if (failedWorkItemWasChild) {
                    deferredSave.reject(AgileProductBacklogResources.MoveUserStory_TasksUpdateIterationFailed);
                } else {
                    deferredSave.reject(AgileProductBacklogResources.MoveUserStory_UserStoryUpdateIterationFailed);
                }
            });

            return deferredSave.promise;
        });
    }

    protected _logIterationAssignCIData(
        prevIterationPath: string,
        newIterationPath: string,
        startTime: number,
        sourcePage: string,
        numberOfUpdatedItems: number,
        workItemTypes: string[]
    ) {

        let showParents: boolean;

        const backlogContext = Agile.BacklogContext.getInstance();
        if (backlogContext) {
            showParents = backlogContext.includeParents;
        }

        const ciData: { [key: string]: any } = {
            showParents: showParents,
            PreviousIteration: prevIterationPath,
            NewIteration: newIterationPath,
            SourcePage: sourcePage,
            UpdatedItems: numberOfUpdatedItems,
            UpdatedTypes: workItemTypes
        };

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            numberOfUpdatedItems > 1 ?
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_MULTISELECT_ITERATIONASSIGNMENT :
                CustomerIntelligenceConstants.AgileCustomerIntelligenceFeature.CLIENTSIDEOPERATION_ITERATIONASSIGNMENT,
            ciData,
            startTime));
    }

    protected _getWorkItems(ids: number[]): IPromise<WITOM.WorkItem[]> {
        var deferred = Q.defer<WITOM.WorkItem[]>();

        var store = this._getWorkItemStore();
        WorkItemManager.get(store).beginGetWorkItems(ids, workItems => {
            deferred.resolve(workItems || []);
        }, error => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    protected _getWorkItemStore(): WITOM.WorkItemStore {
        return TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
    }
}

export module WorkItemUtils {
    export var CHILD_LINK_NAME: string = "System.LinkTypes.Hierarchy-Forward";
    export var PARENT_LINK_NAME: string = "System.LinkTypes.Hierarchy-Reverse";
    export var PARENT_LINKTYPE_ID: number = -2;
    export var CHILD_LINKTYPE_ID: number = 2;

    export function setFieldValueRelative(field: WITOM.Field, value: string): void {
        if (field.fieldDefinition.id === WITConstants.CoreField.AreaPath ||
            field.fieldDefinition.id === WITConstants.CoreField.IterationPath) {
            // for area/iteration changing project is not allowed. To be rename safe, we just update the relative paths - ignore the first token (project name)
            // see mseng bug 252874
            var projectName: string = field.workItem.project.name;
            field.setValue(Agile.ClassificationPathUtils.replaceClassificationRoot(value, projectName));
        }
        else {
            field.setValue(value);
        }
    }

    /**
     * Checks whether the state field is complete
     *
     * @param id Id of the work item we are evaluating
     * @return True if the state field is mapped to complete metastate, otherwise false
     */
    export function isStateComplete(id: number, state: string, workItemType: string): boolean {
        let stateCategory = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStateCategory(workItemType, state);

        //return true if the work item state maps to the complete metastate, false otherwise
        if (stateCategory === WorkItemStateCategory.Completed) {
            return true;
        }
        return false;
    }

    export function getStateValueForMetaState(metaState: WorkItemStateCategory, workItemType: string): string {
        // TODO: Ajay: Verify
        let types = BacklogConfigurationService.getBacklogConfiguration().getWorkItemStatesForStateCategory(workItemType, metaState);
        return types[0];
    }

    /**
     * Retrieves the parent work item Id for a given work item
     *
     * @param workItem The work item to get the parent of
     * @return Returns a valid WorkItemLink if the workItem passed in has a parent, otherwise undefined
     */
    export function getWorkItemParentLink(workItem: WITOM.WorkItem): WITOM.WorkItemLink {

        Diag.Debug.assertParamIsObject(workItem, "workItem");

        var i: number, l: number,
            links = <WITOM.WorkItemLink[]>workItem.getLinks(),
            link: WITOM.WorkItemLink,
            parentLink: WITOM.WorkItemLink;

        for (i = 0, l = links.length; i < l; i += 1) {
            link = links[i];

            // filter for parent work item links (excluding other link types such as attachments, hyperlinks, etc)
            if ($.isFunction(link.getLinkTypeEnd) && link.getLinkTypeEnd().immutableName === WorkItemUtils.PARENT_LINK_NAME) {
                parentLink = link;
                break;
            }
        }

        return parentLink;
    }

    /**
     * Converts WorktemTypeName into a string that is appropriate to be used as a key for a dictionary
     * @param workItemTypeName
     */
    export function getKeyFromWorkItemTypeName(workItemTypeName: string): string {
        return workItemTypeName.toUpperCase();
    }

    /**
     * Gets the field definitions asynchronously for the given work item types
     *
     * @param workItemTypes Work item  types for which FieldDefinition is needed
     * @param completedCallback  Method to be invoked with Field definition data
     * @param errorCallback  Error callback
     */
    export function beginGetWorkItemTypeMap(workItemTypes: string[], completedCallback: (workItemTypeMap: IDictionaryStringTo<WITOM.WorkItemType>) => any, errorCallBack?: IResultCallback): void {
        Diag.Debug.assertParamIsArray(workItemTypes, "workItemTypes");
        Diag.Debug.assertParamIsFunction(completedCallback, "completedCallback");

        var store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore),
            workItemTypeMap: IDictionaryStringTo<WITOM.WorkItemType> = {};

        var callback = (wits: WITOM.WorkItemType[]) => {
            $.each(wits, (index, wit) => {
                workItemTypeMap[getKeyFromWorkItemTypeName(wit.name)] = wit;
            });

            completedCallback(workItemTypeMap);
        };

        var handleError = (error: TfsError) => {
            if ($.isFunction(errorCallBack)) {
                errorCallBack(error);
            }
        };

        store.beginGetProject(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId,
            (project: WITOM.Project) => {
                Diag.Debug.assertParamIsObject(project, "project");

                project.beginGetWorkItemTypes(workItemTypes, callback, handleError);
            },
            handleError);
    }

    /**
     * Updates the children of the provided work item with the value for the field provided. Modified work items are saved.
     *
     * @param workItem Work item whose children will be updated.
     * @param includeParent Value indicating whether the parent should be included in the update/save operation.
     * @param fieldId ID of the field to be updated.
     * @param value Value to update the children with.
     * @param stopProcessingChildren It is a callback to isItemOfRequirementCategory() function.
     * @param successCallback
     *   Called when all of the child work items have been updated.
     *   The function will be passed an object containing the array of work item objects in the workItems property { workItems: WorkItem[] }
     *
     * @param errorCallback Called when an error occurs.
     * @param shouldUpdate
     *     This function will be passed the parent workitem and each of its children, one at a time.
     *     The function should determine whether the passed in work item should be updated:
     *         return true if the work item should be updated
     *         return false if the work item should be ignored
     *     DEFAULT: it will return true for any workitem (updating all children)
     *
     * @param preprocessChildrenCallback Optional callback before child items are modified
     */
    export function beginUpdateChildWorkItems(
        workItem: WITOM.WorkItem,
        includeParent: boolean,
        fieldId: any,
        value: string,
        stopProcessingChildren: IIsItemOfRequirementCategory,
        successCallback: (args: { workItems: WITOM.WorkItem[] }) => void,
        errorCallback?: IErrorCallback,
        shouldUpdate: (wi: WITOM.WorkItem) => boolean = (wi: WITOM.WorkItem) => true,
        preprocessChildrenCallback?: (childWorkItems: WITOM.WorkItem[]) => void): void {
        Diag.Debug.assertParamIsNotNull(fieldId, "fieldId");
        Diag.Debug.assertParamIsNotUndefined(value, "value");
        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");

        // Get all of the children work items.
        beginGetLinkedWorkItems(workItem,
            WorkItemUtils.CHILD_LINK_NAME,
            true,
            stopProcessingChildren,
            (childWorkItems: WITOM.WorkItem[]) => {
                var workItemsToSave: WITOM.WorkItem[] = [];

                if (includeParent && shouldUpdate(workItem)) {
                    var fieldParent = workItem.getField(fieldId);
                    setFieldValueRelative(fieldParent, value);
                    workItemsToSave.push(workItem);
                }

                // Update each of the children with the new value.
                childWorkItems.forEach(child => {
                    var field = child.getField(fieldId);

                    // If the child does not have the field, skip it.
                    // Also skip if we should not update it.
                    if (field && shouldUpdate(child)) {
                        setFieldValueRelative(field, value);
                        workItemsToSave.push(child);
                    }
                });

                if ($.isFunction(preprocessChildrenCallback)) {
                    preprocessChildrenCallback(workItemsToSave);
                }

                // Save the changes.
                workItem.store.beginSaveWorkItemsBatch(workItemsToSave, successCallback, errorCallback);
            },
            errorCallback);
    }

    /**
     * Updates the children of the provided work item with the value for the field provided. Work items are not saved,
     * the caller is reponsible for saving/reverting work items.
     *
     * @param workItem Work item whose children will be updated.
     * @param includeParent Value indicating whether the parent should be included in the update/save operation.
     * @param fieldId ID of the field to be updated.
     * @param value Value to update the children with.
     * @param stopProcessingChildren It is a callback to isItemOfRequirementCategory() function.
     * @param shouldUpdate Function to determine whether a workitem should be updated
     *     This function will be passed the parent workitem and each of its children, one at a time.
     *     The function should determine whether the passed in work item should be updated:
     *         return true if the work item should be updated
     *         return false if the work item should be ignored
     *     DEFAULT: it will return true for any workitem (updating all children)
     * @param preprocessChildrenCallback Optional callback before child items are modified
     *
     * @returns Promise resolving to the work items to update
     */
    export function beginUpdateChildWorkItemsNoSave(
        workItem: WITOM.WorkItem,
        includeParent: boolean,
        fieldId: any,
        value: string,
        stopProcessingChildren: IIsItemOfRequirementCategory,
        shouldUpdate: (wi: WITOM.WorkItem) => boolean = (wi: WITOM.WorkItem) => true,
        preprocessChildrenCallback?: (childWorkItems: WITOM.WorkItem[]) => void): IPromise<WITOM.WorkItem[]> {
        Diag.Debug.assertParamIsNotNull(fieldId, "fieldId");
        Diag.Debug.assertParamIsNotUndefined(value, "value");

        var deferred = Q.defer<WITOM.WorkItem[]>();

        // Get all of the children work items.
        beginGetLinkedWorkItems(workItem,
            WorkItemUtils.CHILD_LINK_NAME,
            true,
            stopProcessingChildren,
            (childWorkItems: WITOM.WorkItem[]) => {
                var workItemsToSave: WITOM.WorkItem[] = [];

                if (includeParent && shouldUpdate(workItem)) {
                    var fieldParent = workItem.getField(fieldId);
                    setFieldValueRelative(fieldParent, value);
                    workItemsToSave.push(workItem);
                }

                // Update each of the children with the new value.
                childWorkItems.forEach(child => {
                    var field = child.getField(fieldId);

                    // If the child does not have the field, skip it.
                    // Also skip if we should not update it.
                    if (field && shouldUpdate(child)) {
                        setFieldValueRelative(field, value);
                        workItemsToSave.push(child);
                    }
                });

                if ($.isFunction(preprocessChildrenCallback)) {
                    preprocessChildrenCallback(workItemsToSave);
                }

                deferred.resolve(workItemsToSave);
            },
            (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * This will return the shouldUpdate method to be used with beginUpdateChildWorkItems when assigning a requirement to an iteration
     * Used from the iteration backlog and task board.
     *
     * @param parent The parent work item that the constructed method will be based on
     * @param iterationPath the iteration path the item is moved to
     */
    export function getShouldUpdateMethodForIterationAssignment(parent: WITOM.WorkItem, iterationPath: string): (wi: WITOM.WorkItem) => boolean {

        return (wi: WITOM.WorkItem) => {
            let workItemTypeNames = BacklogConfigurationService.getBacklogConfiguration().taskBacklog.workItemTypes;
            let nonCompleteStates: string[] = [];
            for (let type of workItemTypeNames) {
                nonCompleteStates = nonCompleteStates.concat(BacklogConfigurationService.getBacklogConfiguration().getWorkItemStatesForStateCategory(type, WorkItemStateCategory.Completed));
            }

            // Only move tasks in non closed state (see mseng bug 196592)
            let workItemType = wi.workItemType.name.toUpperCase();
            let isTask = Utils_Array.contains(workItemTypeNames, workItemType, Utils_String.ignoreCaseComparer);
            let isNonCompletedTask = isTask && !Utils_Array.contains(nonCompleteStates, wi.getState(), Utils_String.localeIgnoreCaseComparer);

            return (isNonCompletedTask || wi.id === parent.id) &&
                Utils_String.localeIgnoreCaseComparer(iterationPath, wi.getFieldValue(WITConstants.CoreField.IterationPath)) !== 0;
        };
    }

    /**
     * Gets the child work items of the provided work item.
     *
     * @param workItem The work item to get child work items.
     * @param linkTypeName The name of the link type needed.
     * @param recursive The flag of if look down children recursively.
     * @param stopProcessingChildren It is a callback to isItemOfRequirementCategory() function.
     * @param successCallback
     *   Called when all of the child work items are loaded.  The function will
     *   be passed an array containing the children.
     *
     * @param errorCallback Called when an error occurs.
     */
    export function beginGetLinkedWorkItems(workItem: WITOM.WorkItem, linkTypeName: string, recursive: boolean, stopProcessingChildren: IIsItemOfRequirementCategory, successCallback: IResultCallback, errorCallback?: IErrorCallback): void {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");

        var store = workItem.store,
            childWorkItems: WITOM.WorkItem[] = [],
            fetchCount = 0;

        // This will be called recursively to fetch the children work items.  It is important that this be
        // a nested function rather than invoking the beginGetChildWorkItems recursively directly.  This is
        // because the recursive calls overwrite the closures state.  This causes the fetchCount to be reset
        // to zero for all instances of the closure and we will never complete.
        function getChildren(workItem: WITOM.WorkItem) {
            var wrappedSuccessCallback = function (childWorkItem: WITOM.WorkItem) { // moved declaration outside of loop below for jslint
                // Skip the nested user story child and its tasks
                var skipChildren = $.isFunction(stopProcessingChildren) && stopProcessingChildren(childWorkItem);

                if (!skipChildren) {
                    childWorkItems.push(childWorkItem);

                    // Get the children of the child work item.
                    if (recursive) {
                        getChildren(childWorkItem);
                    }
                }

                // If we have finished fetching the last work item, invoke the success callback.
                fetchCount -= 1;
                if (fetchCount === 0) {
                    successCallback(childWorkItems);
                }
            };

            // We ensure successCallback() is not executed untill all the immediate child are queued. For the cached workItems,
            // beginGetWorkItem() will return immediately and successCallback() will get triggered. But for non-cached workItems
            // beginGetWorkItem() will take some time to return. By incrementing the fetchCount here and then decementing after
            // for() loop, we make sure successCallback() is executed only once for both cached and non-cached workItems.
            fetchCount++;

            workItem
                .getLinks()
                .filter(link => link instanceof WITOM.WorkItemLink)  // only look at work item links
                .forEach((link: WITOM.WorkItemLink) => {
                    // If the link is to a child.
                    if (link.getLinkTypeEnd().immutableName === linkTypeName) {
                        // Increment the fetch count so we know how many work items are still loading.
                        fetchCount += 1;

                        // The link is to a child so fetch the work item.
                        WorkItemManager.get(store).beginGetWorkItem(link.getTargetId(),
                            wrappedSuccessCallback,
                            errorCallback);
                    }
                });

            fetchCount--;

            if (fetchCount === 0) {
                successCallback(childWorkItems);
            }
        }

        // Make sure the link types have been fetched.
        store.beginGetLinkTypes(() => { getChildren(workItem); }, errorCallback);
    }

    /**
     * Creates a work item of the given type
     * @param teamId Id of the team owning the work item
     * @param workItemType The type of the work item to create for the current project
     * @param createOptions Options for creating the work item
     */
    export function beginCreateWorkItem(teamId: string, workItemType: WITOM.WorkItemType, createOptions?: IWorkItemCreateOptions): Promise<WITOM.WorkItem> {
        return new Promise((resolve, reject) => {
            const store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
            const witManager = WorkItemManager.get(store);
            let wi: WITOM.WorkItem;

            let parentId = 0;
            let useDefaultIteration = true;
            let parentFields = null;

            if (createOptions) {
                if (createOptions.parenting) {
                    parentId = createOptions.parenting.id;
                    parentFields = createOptions.parenting.fields;
                }
                if (createOptions.useDefaultIteration !== null && createOptions.useDefaultIteration !== undefined) {
                    useDefaultIteration = createOptions.useDefaultIteration;
                }
            }

            /**
             * Function called twice - once with parent and once with new work item (but will be called only once if
             * the work item to be created is not under any parent). This allows us to retrieve the parent details and the new
             * work item definition in parallel
             *
             * @param workItem Either the parent work item or the new work item
             */
            const addWorkItem = (workItem: WITOM.WorkItem) => {
                Diag.Debug.assertParamIsObject(workItem, "workItem");

                let parentWorkItem: WITOM.WorkItem;
                let newWorkItem: WITOM.WorkItem;

                // store the work item - this could be the parent or the newly created work item
                // depending on which operation completed first.
                if (!wi) {
                    // cache the value and return
                    wi = workItem;

                    if (!parentId) {
                        // orphan work item
                        newWorkItem = wi;
                        beginTrySetWorkItemTeamDefaults(teamId, newWorkItem, useDefaultIteration).then(() => resolve(newWorkItem), reject);
                    }

                    return;
                }

                // second caller checks to see if the saved work item is the parent or new work item
                // and assign values accordingly
                if (wi.id === parentId) {
                    parentWorkItem = wi;
                    newWorkItem = workItem;
                } else {
                    parentWorkItem = workItem;
                    newWorkItem = wi;
                }

                if (parentId) {
                    // add parent/child link
                    newWorkItem.addLinks([WITOM.WorkItemLink.create(newWorkItem, WorkItemUtils.PARENT_LINK_NAME, parentWorkItem.id, "", true)]);

                    const crossProjectLink = newWorkItem.project.id !== parentWorkItem.project.id;
                    if (crossProjectLink) {
                        beginTrySetWorkItemTeamDefaults(teamId, newWorkItem, useDefaultIteration).then(
                            () => {
                                const teamFieldName: string = getTeamFieldRefName(teamId);

                                // Filter out iteration/area node fields
                                const fieldsToCopy = parentFields ? parentFields.filter((fieldId: string | number) => {
                                    const field = parentWorkItem.getField(fieldId);
                                    return !(
                                        field.fieldDefinition.id === WITConstants.CoreField.AreaId
                                        || field.fieldDefinition.id === WITConstants.CoreField.IterationId
                                        || field.fieldDefinition.referenceName === teamFieldName
                                    );
                                }) : [];

                                // Copy the remaining parent fields to the new work item
                                copyWorkItemFields(parentWorkItem, newWorkItem, fieldsToCopy);
                                resolve(newWorkItem);
                            },
                            reject
                        );

                        return;
                    } else {
                        copyWorkItemFields(parentWorkItem, newWorkItem, parentFields);
                    }
                }

                // pass back the new work item (with parent and fields set)
                resolve(newWorkItem);
            };

            // If there is a valid parent work item, start getting it.
            if (parentId) {
                witManager.beginGetWorkItem(parentId, addWorkItem,
                    (error) => { reject(error); }, false, null, true);
            }

            // start getting the work item type for the new work item, and create the new work item
            addWorkItem(witManager.createWorkItem(workItemType));
        });
    }

    export function beginGetWorkItemType(itemType: string): Promise<WITOM.WorkItemType> {
        /// <summary>retrieves the work item type object for the specified work item type name</summary>
        /// <param name="itemType" type="String">The type name of the work item </param>
        /// <return type="JQueryPromise">A promise to return the work item type</param>

        return new Promise((resolve, reject) => {
            const store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

            // start getting the work item type for the new work item, and create the new work item
            store.beginGetProject(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId,
                (project: WITOM.Project) => {
                    Diag.Debug.assertParamIsObject(project, "project");
                    project.beginGetWorkItemType(itemType,
                        (witd: WITOM.WorkItemType) => {
                            resolve(witd);
                        },
                        (error: TfsError) => {
                            reject(error);
                        });
                },
                (error: TfsError) => {
                    reject(error);
                });
        });
    }

    /**
     * set the work item iteration to that of the current agile context iteration
     *
     * @param workItem The work item to be updated
     */
    export function setWorkItemIterationUsingAgileContext(workItem: WITOM.WorkItem): void {

        var agileContext = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<Agile.AgileContext>(Agile.AgileContext).getContext();
        if (agileContext && agileContext.iteration) {
            workItem.setFieldValue(WITConstants.CoreField.IterationPath, agileContext.iteration.path);
        }
    }

    /**
     * Asynchronously create a work item of a specific type and then display the work item form for this work item
     *
     * @param teamId Id of the team owning the work item
     * @param workItemTypeName The type of work item to be created.
     * @param createOptions
     *     Options for parenting the new work item like "id": the work item id of the parent,
     *     and "fields": the (optional) list of fields to copy from the parent to the new work item.
     *
     * @param successCallback The callback that will receive the workItem once it has been created
     * @param errorCallback The callback that be invoked if an error occurs.
     * @param initialize OPTIONAL: Function that allows workitem transforms before the work item is displayed to the user
     * @param closeCallback OPTIONAL: The callback fired when the dialog is closing.  This will always be called regardless if the save, cancel,
     *                   close, or escape key is pressed. The work item is passed to the callback.
     */
    export function beginCreateWorkItemWithForm(
        teamId: string,
        workItemTypeName: string,
        createOptions: IWorkItemCreateOptions,
        successCallback: (workItem: WITOM.WorkItem) => void,
        errorCallback?: IErrorCallback,
        initialize?: Function,
        closeCallback?: (workItem: WITOM.WorkItem) => void): void {

        Diag.Debug.assertParamIsString(workItemTypeName, "workItemTypeName");
        Diag.Debug.assertParamIsObject(createOptions, "createOptions");
        Diag.Debug.assertParamIsFunction(successCallback, "successCallback");
        Diag.Debug.assertParamIsFunction(errorCallback, "errorCallback");

        // Create the work item and display the work item form for it.
        WorkItemUtils.beginGetWorkItemType(workItemTypeName)
            .then(
                (witType: WITOM.WorkItemType) => {
                    beginCreateWorkItem(teamId, witType, createOptions)
                        .then(
                            (workItem: WITOM.WorkItem) => {
                                // Apply any workItem transform set in the options. This allows the caller of the
                                // control to make changes to the work item before it is displayed to the user
                                if ($.isFunction(initialize)) {
                                    initialize(workItem);
                                }
                                // Resetting manual field changes so that we wont get confirm warning on close of dialog if users has not changed anything
                                workItem.resetManualFieldChanges();

                                // Display the Work Item Form
                                WITDialogShim.showWorkItem(workItem, {
                                    save: successCallback,
                                    close: closeCallback
                                });
                            },
                            (error) => { errorCallback(error); });
                },
                (error) => { errorCallback(error); });
    }

    /**
     * Copy fields from one work item to another. Modifies destWorkItem
     * @param sourceWorkItem The work item to copy field values from
     * @param destWorkItem The work item to copy field values to
     * @param fields A list of field ids or names to copy
     */
    export function copyWorkItemFields(sourceWorkItem: WITOM.WorkItem, destWorkItem: WITOM.WorkItem, fields: (string | number)[]): void {
        Diag.Debug.assertIsNotNull(sourceWorkItem, "sourceWorkItem");
        Diag.Debug.assertIsNotNull(destWorkItem, "destWorkItem");
        Diag.Debug.assertIsNotNull(fields, "fields");

        for (let i = 0; i < fields.length; i += 1) {
            let destinationField = destWorkItem.getField(fields[i]);
            if (destinationField) {
                Diag.Debug.assertIsObject(sourceWorkItem.getField(destinationField.fieldDefinition.id), Utils_String.format("Configuration error: Source work item {0} didn't have field {1}", sourceWorkItem.workItemType, destinationField.fieldDefinition.referenceName));

                var parentValue = sourceWorkItem.getFieldValue(destinationField.fieldDefinition.id)
                destinationField.setValue(parentValue);
            }
        }
    }

    /**
     * Lookup the value of a work item field.
     *
     * @param workItem Work item to lookup the value from.
     * @param fieldName Name of the field to be looked up.
     * @return
     * Undefined if the field was not found, otherwise the field value. (NOTE: Work Item field values can not be undefined, only null)
     *
     */
    export function getFieldValueByName(workItem: WITOM.WorkItem, fieldName: string): any {

        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsString(fieldName, "fieldName");

        var value: any,
            field = workItem.getField(fieldName);

        // If the field exists on the work item, then get the value.
        if (field) {
            value = field.getValue();
        }

        return value;
    }

    /**
     * Used to remove the parent link of a work item, and link it to the new parentId.
     * If the new parentId <= 0, simply removes the old parent.
     *
     * @workItem Workitem to reparent
     * @parentId New parent id, pass 0 to unparent
     *
     * @return True if work item has changed, false otherwise
     */
    export function reparentWorkItem(workItem: WITOM.WorkItem, parentId: number): boolean {
        Diag.Debug.assertParamIsObject(workItem, "workItem");
        Diag.Debug.assertParamIsNumber(parentId, "parentId");

        var workItemHasChanged = false;

        var oldParentLink = WorkItemUtils.getWorkItemParentLink(workItem);

        if (oldParentLink) {
            if (oldParentLink.linkData.ID === parentId) {
                return false; // Bail out and return false if parent hasn't changed
            }

            workItem.removeLinks([oldParentLink]);
            workItemHasChanged = true;
        }

        // If we are changing the work item to a new parent add a new link. Don't do anything else if we were removing parent (i.e. moving to root)
        if (parentId > 0) {
            workItem.addLinks([WITOM.WorkItemLink.create(workItem, WorkItemUtils.PARENT_LINK_NAME, parentId, "")]);
            workItemHasChanged = true;
        }

        return workItemHasChanged;
    }

    /**
     * Reparent the given work items to the specified parent
     *
     * @workItemIds work item ids to parent
     * @newParentId id of the new parent work item
     *
     * @returns IPromise<number[]> workitem ids affected by the operation
     */
    export function beginReparentWorkItems(workItemIds: number[], newParentId: number): IPromise<number[]> {
        var deferred = Q.defer<number[]>();

        var workItemManager = WorkItemManager.get(TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore));

        // Open each work item, and change the parent link to the new parent
        workItemManager.beginGetWorkItems(workItemIds,
            (workItems: WITOM.WorkItem[]) => {
                // Change parent link for each workitem
                for (var i = 0, len = workItems.length; i < len; i++) {
                    WorkItemUtils.reparentWorkItem(workItems[i], newParentId);
                }

                workItemManager.store.beginSaveWorkItemsBatch(workItems, (result: WITOM.IWorkItemsBulkSaveSuccessResult) => {
                    deferred.resolve(result.workItems.map(x => x.id));
                }, (error) => {
                    deferred.reject(error);
                });
            },
            (error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * This is used to get the fields that needs to be copied from parent, when creating a task from ProductBacklog and Board.
     *
     * @param teamId Id of the team
     *
     * @return The array of fields to copy from the parent
     */
    export function getParentOptionFields(teamId: string): string[] {
        return [WITConstants.CoreFieldRefNames.IterationId, WITConstants.CoreFieldRefNames.AreaId, getTeamFieldRefName(teamId)];
    }

    /**
     * Get the team field name for the current project
     * 
     * @param teamId Id of the tam
     * 
     * @return The team field reference name
     */
    export function getTeamFieldRefName(teamId: string): string {
        const teamAwarenessService = getService(TFS_TeamAwarenessService.TeamAwarenessService);
        return teamAwarenessService.getTeamSettings(teamId).teamFieldName;
    }
}

export module ControlUtils {
    export function restrictTextInputToIntegers($inputField: JQuery): void {
        /// <summary>Disables entry &amp; pasting of all characters that do not constitute an integer<summary>
        /// <param name="$inputField" type="jQuery">The input field to restrict input on</param>

        Diag.Debug.assertParamIsObject($inputField, "$inputField");

        $inputField.keypress(function (args) {
            // reject any non digit keys
            if (args.keyCode >= 48 && args.keyCode <= 57) {
                return true;
            }
            return false;
        });

        $inputField.bind("paste", function (args) {
            // set a timer to check the value for valid and restore last good value if not
            var lastGoodValue = this.value;

            Utils_Core.delay(this, 0, function () {
                if (!/^[0-9]+$/m.test(this.value)) {
                    this.value = lastGoodValue;
                }
            });
        });
    }

    /**
     * @interface ITextboxCreateOptions
     * Interface for TextBox options
     */
    export interface ITextboxCreateOptions {
        /**
         * id for text box
         */
        id?: string;
        /**
         * label to assign for text box (have to provide id with label)
         */
        label?: string;
        /**
         * a class name to assign to text box
         */
        className?: string;
        /**
         * boolean to indicate if to assign disabled to the text box
         */
        disabled?: boolean;
    }

    /**
     * Create a textbox control styled like web access combo in the provided container and returns it
     *
     * @param $container The container to place the textbox in
     * @param options an object that contain options for TextBox
     * @return
     */
    export function createTextbox($container: JQuery, options?: ITextboxCreateOptions): JQuery {

        Diag.Debug.assertParamIsObject($container, "$container");
        Diag.Debug.assertParamIsObject(options, "options");

        Diag.Debug.assert(Boolean(options.label) && Boolean(options.id) || !Boolean(options.label), "if label is supplied an id need to be supplied");

        //TODO: review:ahakkas
        //why do you need these wrappers for an ordinary text box
        //if it is for styling purposes please remove them this is not the right way.
        var $containerDiv = $("<div/>")
            .addClass("combo"),
            $inputWrap = $("<div/>").addClass("wrap"),
            $textInput = $("<input />")
                .attr("type", "text")
                .css("width", "100%");
        if (options.id) {
            $textInput.attr("id", options.id);
        }
        if (options.disabled) {
            $textInput.prop("disabled", !!options.disabled);
        }
        if (options.className) {
            $textInput.addClass(options.className);
        }

        $inputWrap.append($textInput);

        if (options.label) {
            $inputWrap.append($("<label/>")
                .text(options.label)
                .addClass("hidden")
                .attr("For", options.id));
        }

        $containerDiv.append($inputWrap);
        $container.append($containerDiv);

        return $textInput;
    }

    /**
     * Determine if element is in view
     *
     * @param element element to check
     * @return
     */
    export function isElementInView(element: HTMLElement): boolean {
        var rect = element.getBoundingClientRect();
        return (rect.top >= 0 && rect.left >= 0 &&
            rect.bottom <= $(window).height() && rect.right <= $(window).width());
    }

    /**
     * Calculate the width of scroll bar.
     *
     * @return
     */
    export function widthOfScrollBar(): number {

        var $outerDiv: JQuery,
            $innerDiv: JQuery,
            withScroll: number,
            widthOfOuterDiv: number = 200;

        $outerDiv = $("<div>").css({ "position": "absolute", "left": -2000, "top": -2000, "width": widthOfOuterDiv, "overflow": "scroll" }).appendTo("body");
        $innerDiv = $("<div>").css({ "width": "100%" }).appendTo($outerDiv);

        withScroll = $innerDiv.outerWidth();

        $outerDiv.remove();

        return widthOfOuterDiv - withScroll;
    }

    /**
     * Given a field name, returns if it is WEF field for DoingDone
     * @param fieldReferenceName  The name of the field
     * @return true if it is WEF field for DoingDone, else false
     */
    export function checkIfFieldReferenceNameIsForDoingDone(fieldReferenceName: string): boolean {
        return Utils_String.startsWith(fieldReferenceName, "WEF", Utils_String.ignoreCaseComparer) &&
            Utils_String.endsWith(fieldReferenceName, "Kanban.Column.Done", Utils_String.ignoreCaseComparer);
    }

    /**
     * Given a field name, returns if it is WEF field for Column
     * @param fieldReferenceName  The name of the field
     * @return true if it is WEF field for Column, else false
     */
    export function checkIfFieldReferenceNameIsForColumn(fieldReferenceName: string): boolean {
        return Utils_String.startsWith(fieldReferenceName, "WEF", Utils_String.ignoreCaseComparer) &&
            Utils_String.endsWith(fieldReferenceName, "Kanban.Column", Utils_String.ignoreCaseComparer);
    }

    /**
      * Given a field name, returns if it is WEF field for Swimlane
      * @param fieldReferenceName  The name of the field
      * @return true if it is WEF field for Swimlane, else false
      */
    export function checkIfFieldReferenceNameIsForSwimlane(fieldReferenceName: string): boolean {
        return Utils_String.startsWith(fieldReferenceName, "WEF", Utils_String.ignoreCaseComparer) &&
            Utils_String.endsWith(fieldReferenceName, "Kanban.Lane", Utils_String.ignoreCaseComparer);
    }

    /**
     * Given a field name, returns the name of the parent System field, if applicable
     * @param fieldReferenceName  The name of the field
     * @return name of the parent System field, if applicable, else undefined
     */
    export function getParentFieldReferenceName(fieldReferenceName: string): string {
        var parentFieldReferenceName: string;
        if (checkIfFieldReferenceNameIsForColumn(fieldReferenceName)) {
            parentFieldReferenceName = WITConstants.CoreFieldRefNames.BoardColumn;
        }
        else if (checkIfFieldReferenceNameIsForSwimlane(fieldReferenceName)) {
            parentFieldReferenceName = WITConstants.CoreFieldRefNames.BoardLane;
        }
        else if (checkIfFieldReferenceNameIsForDoingDone(fieldReferenceName)) {
            parentFieldReferenceName = WITConstants.CoreFieldRefNames.BoardColumnDone;
        }
        return parentFieldReferenceName;
    }

    /**
     * Given a work item type, constructs a jquery element whose background color is same as the color for given type
     */
    export function buildColorElement(workItemType: string, ariaAttributes?: AriaAttributes): JQuery {
        const $element = $("<div>");
        const projectName = TFS_Host_TfsContext.TfsContext.getDefault().navigation.project;
        WorkItemTypeIconControl.renderWorkItemTypeIcon(
            $element[0],
            workItemType,
            projectName,
            { ariaAttributes: ariaAttributes, suppressTooltip: true } as WorkItemTypeIconControl.IIconAccessibilityOptions);
        return $($element[0].firstChild);
    }

    /**
     * Unmount work item type icon if exists.
     */
    export function disposeColorElement(element: Element): void {
        if (element && element.parentElement) {
            WorkItemTypeIconControl.unmountWorkItemTypeIcon(element.parentElement);
        }
    }

    /**
     *  Retrieves the specified property from the given CSS class
     *
     * @param className  The name of the CSS class which we want to search
     * @param propertyName  The name of the property within this class.
     * @return
     */
    export function getCSSPropertyValue(className: string, propertyName: string): string {

        var $tempElement: JQuery = $("<div/>").css("display", "none").addClass(className);

        // Append the temp element to the document body so that the className style is actually evaluated
        $("body").append($tempElement);

        var result: string = $tempElement.css(propertyName);
        $tempElement.remove();

        return result;
    }
}

export module WorkItemCategoriesUtils {
    /**
     * Given work item type names, filters out hidden work item type names and returns visible ones
     * @param workItemTypeNames work item type names to filter
     * @return filtered list of work item type names
     */
    export function removeHiddenWorkItemTypeNames(workItemTypeNames: string[]): IPromise<string[]> {
        let deferred = Q.defer<string[]>();
        let store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        store.beginGetProject(TFS_Host_TfsContext.TfsContext.getDefault().navigation.projectId, (project: WITOM.Project) => {
            project.beginGetVisibleWorkItemTypeNames((visibleWorkItemTypeNames: string[]) => {
                let visibleTypeNames = workItemTypeNames.filter(typeName => Utils_Array.contains(visibleWorkItemTypeNames, typeName, Utils_String.localeIgnoreCaseComparer));
                deferred.resolve(visibleTypeNames);
            }, (error) => {
                // return original list incase of error
                deferred.resolve(workItemTypeNames);
            });
        }, (error) => {
            // return original list incase of error
            deferred.resolve(workItemTypeNames);
        });

        return deferred.promise;
    }
}

export module TeamSettingsUtils {
    /** Asynchronously tries to refresh the current team's BacklogVisibilities setting; will gracefully eat any failure. */
    export function tryRefreshTeamBacklogVisibilities(tfsContext: TFS_Host_TfsContext.TfsContext): void {

        // For use in error callbacks.
        var handleError = (reason: any) => { Diag.Debug.fail("Failed to refresh team settings on new-levels banner dismissal." + reason ? ("\n" + reason.toString()) : ""); };

        try {
            var tfsConnection = new Service.VssConnection(tfsContext.contextData);
            var workHttpClient = tfsConnection.getHttpClient<Tfs_Work_WebApi.WorkHttpClient>(Tfs_Work_WebApi.WorkHttpClient);

            var teamContext: TFS_Core_Contracts.TeamContext = { projectId: tfsContext.contextData.project.id, teamId: tfsContext.currentTeam.identity.id, project: undefined, team: undefined };

            workHttpClient.getTeamSettings(teamContext).then(
                (value: Tfs_Work_Contracts.TeamSetting) => {
                    var patch = <Tfs_Work_Contracts.TeamSettingsPatch>{ backlogVisibilities: value.backlogVisibilities };
                    workHttpClient.updateTeamSettings(patch, teamContext).then(
                        (value: Tfs_Work_Contracts.TeamSetting) => {
                            // Do nothing.
                        },
                        (reason) => {
                            handleError(reason);
                        });
                },
                (reason) => {
                    handleError(reason);
                });
        }
        catch (e) {
            handleError(e);
        }
    }

    /**
     * Gets iterations from data island and converts, them to new API format in work contracts
     */
    export function getTeamIterations(tfsContext: TFS_Host_TfsContext.TfsContext): Tfs_Work_Contracts.TeamSettingsIteration[] {
        // Return array with work contracts interface
        var iterations: Tfs_Work_Contracts.TeamSettingsIteration[] = [];

        var teamAwareness = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TFS_TeamAwarenessService.TeamAwarenessService>(TFS_TeamAwarenessService.TeamAwarenessService);
        var teamSettings = teamAwareness.getTeamSettings(tfsContext.currentTeam.identity.id);

        // iterations from data island. Check each for null or undefined before adding
        if (teamSettings.previousIterations && teamSettings.previousIterations.length > 0) {
            iterations = iterations.concat(convertIterations(teamSettings.previousIterations, Tfs_Work_Contracts.TimeFrame.Past));
        }
        if (teamSettings.currentIteration) {
            iterations = iterations.concat(convertIterations([teamSettings.currentIteration], Tfs_Work_Contracts.TimeFrame.Current));
        }
        if (teamSettings.futureIterations && teamSettings.futureIterations.length > 0) {
            iterations = iterations.concat(convertIterations(teamSettings.futureIterations, Tfs_Work_Contracts.TimeFrame.Future));
        }
        return iterations;
    }

    function convertIterations(OMCommonIterations: TFS_AgileCommon.IIterationData[], timeFrame: Tfs_Work_Contracts.TimeFrame) {
        let iterations: Tfs_Work_Contracts.TeamSettingsIteration[] = [];
        //Convert iterations into Work_Contract ersion
        OMCommonIterations.forEach((iterationData: TFS_AgileCommon.IIterationData, index: number) => {
            var iteration: Tfs_Work_Contracts.TeamSettingsIteration = {
                attributes: {
                    startDate: new Date(iterationData.startDate),
                    finishDate: new Date(iterationData.finishDate),
                    timeFrame: timeFrame
                },
                id: iterationData.id,
                name: iterationData.name,
                path: iterationData.path,
                _links: null,
                url: null
            };
            iterations.push(iteration);
        });
        return iterations;
    }

    export function getTeamWeekends(tfsContext: TFS_Host_TfsContext.TfsContext): number[] {
        Diag.Debug.assertIsObject(tfsContext, "tfsContext");

        var teamAwareness = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<TFS_TeamAwarenessService.TeamAwarenessService>(TFS_TeamAwarenessService.TeamAwarenessService);
        var teamSettings = teamAwareness.getTeamSettings(tfsContext.currentTeam.identity.id);

        if (teamSettings.weekends) {
            return teamSettings.weekends.days;
        }

        return [];
    }
}

export module BacklogLevelUtils {

    /**
     *
     * @param levelName
     */
    export function getDescendentBacklogLevelConfigurationForLevelName(levelName: string): IBacklogLevelConfiguration {
        let backlogLevel = BacklogConfigurationService.getBacklogConfiguration().getBacklogByDisplayName(levelName);
        if (!backlogLevel) {
            return null;
        }

        return getDescendentBacklogLevelConfiguration(backlogLevel.rank);
    }

    /**
     *
     * @param workItemType Type of the work item (e.g. "Feature" or "User Story" or "Bug" etc.)
     */
    export function getDescendentBacklogLevelConfigurationForWorkItemType(workItemType: string): IBacklogLevelConfiguration {
        let backlogLevel = BacklogConfigurationService.getBacklogConfiguration().getBacklogByWorkItemTypeName(workItemType);
        if (!backlogLevel) {
            return null;
        }

        return getDescendentBacklogLevelConfiguration(backlogLevel.rank);
    }

    function getDescendentBacklogLevelConfiguration(backlogRank: number): IBacklogLevelConfiguration {
        let allBacklogs = BacklogConfigurationService.getBacklogConfiguration().getAllBacklogLevels(); // backlogs are in descending order of rank
        if (!allBacklogs || !allBacklogs.length) {
            return null;
        }

        for (let backlog of allBacklogs) {
            if (backlog.rank < backlogRank) {
                return backlog;
            }
        }
        return null;
    }
}

export module TelemetryUtils {
    /**
     * Deprecated: Use Performance API - Record initial page load
     *
     * @param pageName Name of loaded page
     */
    export function recordPageLoad(pageName: string): void {

        if (window.performance && window.performance.timing) {
            Telemetry.publishEvent(
                new Telemetry.TelemetryEventData(
                    CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
                    pageName + ".Index",
                    {},
                    window.performance.timing.navigationStart));
        }
    }

    /**
     * Record board field usage on column option
     *
     * @param columns List of columns
     * @feature feature for the telemetry
     */
    export function recordBoardFieldsUsageChange(feature: string, columns: IDisplayColumnResult[]) {
        WitTelemetryUtils.TelemetryUtils.recordBoardFieldsUsageChange(CustomerIntelligenceConstants.AgileCustomerIntelligenceArea.AGILE,
            feature, getBoardFieldUsage(columns));
    }

    function getBoardFieldUsage(columns: IDisplayColumnResult[]): WitTelemetryUtils.TelemetryUtils.BoardFieldUsageData {
        const usage = new WitTelemetryUtils.TelemetryUtils.BoardFieldUsageData();
        columns.forEach((column: IDisplayColumnResult, index: number) => {
            switch (column.id) {
                case WITConstants.CoreField.BoardColumn:
                    usage.column = true;
                    break;
                case WITConstants.CoreField.BoardColumnDone:
                    usage.done = true;
                    break;
                case WITConstants.CoreField.BoardLane:
                    usage.lane = true;
                    break;
                default:
                    break;
            }
        });
        return usage
    }
}

/* always enabled, but individual teams need to cleanup usage of flag before this can go away */
export function isUseNewIdentityControlsEnabled(): boolean {
    return true;
}

export function localeFormatUTC(date: Date, format) {
    /// <summary>Format the UTC value of the date using the locale-specific format string
    ///   e.g. [Sun Dec 31 16:00:00 PST 2000] (== [Mon Jan 1 00:00:00 UMT 2001]) => "1/1/2001"
    /// </summary>
    /// <param name="date" type="Date">The date to base the offset date on</param>

    var utcEquivDate;
    var oneMinute = 60 * 1000;

    utcEquivDate = new Date(date.getTime() + (date.getTimezoneOffset() * oneMinute));

    return Utils_Date.localeFormat(utcEquivDate, format, true);
}

/**
 * Gets the DirectoryPivotType enum value for the pivot name provided.
 * @param pivotName The pivot name.
 * @param defaultValue Optional - DirectoryPivotType to return when pivot name does not match any of the known types.
 */
export function directoryPivotTypeFromString(
    pivotName: string,
    defaultValue?: DirectoryPivotType): DirectoryPivotType {

    let result: DirectoryPivotType = defaultValue;

    if (Utils_String.equals(pivotName, DirectoryPivotType.all, /*ignorecase*/ true)) {
        result = DirectoryPivotType.all;
    }
    else if (Utils_String.equals(pivotName, DirectoryPivotType.mine, /*ignorecase*/ true)) {
        result = DirectoryPivotType.mine;
    }

    return result;
}

/**
 *  Utility methods for TFS-context-related data.
 */
export namespace TfsContextUtils {

    /**
     * Returns the project id from the current TFS context.
     */
    export function getProjectId(): string {
        return TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id;
    }
}

/**
 *  Utility methods getting service instances.
 */
export namespace ServiceUtils {

    /**
     * Returns an instance of the WebSettingsService.
     */
    export function getWebSettingsSvc(): TFS_WebSettingsService.WebSettingsService {

        let result: TFS_WebSettingsService.WebSettingsService = null;
        const tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        try {
            const connection: Service.VssConnection = TFS_OM_Common.ProjectCollection.getConnection(tfsContext);
            result = connection.getService<TFS_WebSettingsService.WebSettingsService>(
                TFS_WebSettingsService.WebSettingsService);
        } catch (error) {
            PlatformErrorUtils.PublishError(
                error,
                /** immediate **/ false,
                "ServiceUtils",
                "ServiceUtils.getWebSettingsSvc");
        }

        return result;
    }
}