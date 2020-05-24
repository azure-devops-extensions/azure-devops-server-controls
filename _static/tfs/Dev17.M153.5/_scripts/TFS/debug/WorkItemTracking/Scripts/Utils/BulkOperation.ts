import Q = require("q");
import CIConstants = require("WorkItemTracking/Scripts/CustomerIntelligence");
import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { TagUtils } from "WorkItemTracking/Scripts/Utils/TagUtils";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import TFS_TeamAwarenessService = require("Presentation/Scripts/TFS/FeatureRef/TFS.TeamAwarenessService");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import Telemetry = require("VSS/Telemetry/Services");
import { WiqlOperators, getInvariantOperator, isTodayMacro, isCurrentIterationMacro, isMeMacro } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import { IFieldIdValue } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { getDefaultWebContext } from "VSS/Context";
import { Utils } from "VSS/Utils/Html";

export class BulkOperation {
    public static SCRIPT_RELIEF_TIMEOUT: number = 10;

    public static parseDate(value: string): Date {
        if (!value) {
            return null;
        }

        let date = Utils_Date.parseDateString(value);

        if (!date || isNaN(date.getTime())) {
            date = new Date(value);
        }

        if (!date || isNaN(date.getTime())) {
            return null
        }
        return date;
    }

    public static updateWorkItemFields(workItem: WITOM.WorkItem, changes: IFieldIdValue[]): number {
        /// <summary>Updates work item with the specified changes, invoking. return the number of tag changes made for telemtry </summary>
        /// <param name="workItem" type="Object">WorkItem object</param>
        /// <param name="changes" type="Object">A data object describing the changes to make. The object contains a sequence of name/value pairs where the
        /// name is the reference name of the field in which to modify and the value is the new value to modify.</param>       
        Diag.Debug.assertParamIsArray(changes, "changes");

        let workItemTypeChanged = false;
        var newFieldValue: string;
        var tagsRemovedOrAdded = 0;

        $.each(changes, (index, change) => {
            try {
                let field = workItem.getField(change.fieldName);

                if (field) {
                    // Bulk work item type change
                    if (field.fieldDefinition.id === WITConstants.CoreField.WorkItemType) {

                        let newWorkItemType: WITOM.WorkItemType = change.value;
                        if (workItem.workItemType !== newWorkItemType) {
                            workItemTypeChanged = true;
                            let projectChanged = (newWorkItemType.project !== workItem.project);
                            projectChanged ? workItem.fireWorkItemProjectChanging() : workItem.fireWorkItemTypeChanging();
                        }

                        // suppress events in order to fire WorkItemProjectChanged/WorkItemTypeChanged event after updating all fields
                        // this is to ensure all changes to a work item object are applied when the event is fired
                        workItem.changeWorkItemType(newWorkItemType, undefined, true);
                    }

                    // TODO [ryanvog]: the field.setValue() method should be more aware of the read only state of the
                    // field so that we perhaps prevent invoking the rules engine when we know
                    // the value cannot change.
                    if (!field.isReadOnly() && field.isEditable()) {
                        // If we are updating the History field, prepend our text
                        // so we don't kill off any transient text added since the last change.

                        if (field.fieldDefinition.id === WITConstants.CoreField.History) {
                            const previousValue = field.getValue();
                            newFieldValue = `${change.value}${Utils.isEmpty(previousValue) ? "" : "<BR>" + previousValue}`;
                        }
                        else if (field.fieldDefinition.type === WITConstants.FieldType.DateTime) {
                            newFieldValue = change.value;
                            if (newFieldValue) {
                                let date = BulkOperation.parseDate(newFieldValue);
                                if (date) {
                                    newFieldValue = Utils_Core.convertValueToDisplayString(date);
                                }
                            }
                        }
                        else {
                            newFieldValue = change.value;
                        }

                        field.setValue(newFieldValue);
                    }
                }
                else {
                    tagsRemovedOrAdded = TagUtils.tryProcessTagsChanges(workItem, change);
                }
            }
            catch (e) {
                Diag.log(Diag.LogVerbosity.Error, "An error occurred while bulk-editing a work item: " + VSS.getErrorMessage(e));
            }
        });

        if (workItemTypeChanged) {
            if (workItem.hasTeamProjectChanged()) {
                workItem.fireWorkItemProjectChanged();
            }
            else if (workItem.hasWorkItemTypeChanged()) {
                workItem.fireWorkItemTypeChanged();
            }
        }

        return tagsRemovedOrAdded;
    }

    /**
     * Processes fieldChanges and resolves supported macros (@me, @today and @currentIteration)
     * @param tfsContext current tfsContext to fetch identity and currentIteration
     * @param workItems workItems being updated
     * @param changes fieldChanges
     * @param teamId the team Id
     */
    public static processWorkItemFieldChangesForMacros(tfsContext: TFS_Host_TfsContext.TfsContext, workItems: WITOM.WorkItem[], changes: IFieldIdValue[], teamId?: string): IPromise<IFieldIdValue[]> {
        Diag.Debug.assertIsNotNull(tfsContext, "Context cannot be empty");
        Diag.Debug.assertIsArray(workItems, "Expected workitems to be an array");
        Diag.Debug.assertIsArray(changes, "Expected fieldChanges to be an array");

        let tryGetFieldFromWorkItems = (fieldName: number | string) => {
            for (let item of workItems) {
                let field = item.getField(fieldName);
                if (field) {
                    return field;
                }
            }
            return null;
        };

        let currentIterationFieldIndex: number = undefined;

        for (let idx = 0; idx < changes.length; idx++) {

            let field = tryGetFieldFromWorkItems(changes[idx].fieldName);
            let fieldValue = changes[idx].value;

            if (field && fieldValue) {
                if (field.fieldDefinition.isIdentity) {
                    let invariantValue = getInvariantOperator(fieldValue);
                    if (invariantValue && isMeMacro(invariantValue, false)) {
                        // If '@me' macro is used, get current user from tfsContext
                        let displayName = tfsContext.contextData.user.name;
                        let uniqueName = tfsContext.contextData.user.uniqueName;
                        let uniquifiedName = TFS_OM_Identities.IdentityHelper.getDistinctDisplayName(displayName, uniqueName);
                        changes[idx].value = uniquifiedName;
                    }
                }
                else if (field.fieldDefinition.id === WITConstants.CoreField.IterationPath) {
                    let invariantValue = getInvariantOperator(fieldValue);
                    if (invariantValue && isCurrentIterationMacro(invariantValue, false)) {
                        currentIterationFieldIndex = idx;
                    }
                }
                else if (field.fieldDefinition.type === WITConstants.FieldType.DateTime) {
                    let invariantValue = getInvariantOperator(fieldValue);
                    if (invariantValue && isTodayMacro(invariantValue, false)) {
                        let macroToday = getInvariantOperator(WiqlOperators.MacroToday);
                        let expression = invariantValue.substring(macroToday.length).trim();
                        let macroTodayRegex = /[-+]\040?[0-9]+$/;

                        let setDate = (dateToUpdate: Date) => {
                            date = BulkOperation.parseDate(date.toDateString());
                            if (date) {
                                changes[idx].value = Utils_Core.convertValueToDisplayString(date, "d");
                            }
                        }
                        let date = new Date();

                        if (!expression) {
                            setDate(date);
                        }
                        else if (macroTodayRegex.exec(expression)) {
                            let count = expression.replace(/[-+]/, "").trim();

                            if (Utils_String.equals(expression.charAt(0), "+")) {
                                date.setDate(date.getDate() + Number(count));
                            }
                            else {
                                date.setDate(date.getDate() - Number(count));
                            }
                            setDate(date);
                        }
                    }
                }
            }
        }

        if (currentIterationFieldIndex >= 0) {
            return Q.Promise<IFieldIdValue[]>((resolve, reject) => {
                const teamAwarenessService = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService(TFS_TeamAwarenessService.TeamAwarenessService);
                const team = teamId ? teamId : getDefaultWebContext().team.id;
                teamAwarenessService.beginGetTeamSettings(team).then(
                    (teamSettings) => {
                        if (teamSettings.currentIteration) {
                            changes[currentIterationFieldIndex].value = teamSettings.currentIteration.friendlyPath;
                        }
                        resolve(changes);
                    },
                    (error: Error) => {
                        reject(error);
                    }
                );
            });
        }
        else {
            return Q(changes);
        }
    }

    public beginUpdateWorkItems(tfsContext: TFS_Host_TfsContext.TfsContext, workItemIds: number[], changes: IFieldIdValue[], operationCompletedCallback: IResultCallback, errorCallback?: IErrorCallback, options?: any) {
        /// <summary>Updates each work item in the list of workItemIds with the specified changes, invoking
        /// the operationCompletedCallback when completed successfully and errorCallback when an error is encountered.</summary>
        /// <param name="workItemIds" type="Array">An array of work item IDs.  All work items with IDs in this array will be paged into the current session.</param>
        /// <param name="changes" type="Object">A data object describing the changes to make. The object contains a sequence of name/value pairs where the
        /// name is the reference name of the field in which to modify and the value is the new value to modify.</param>
        /// <param name="operationCompletedCallback" type="IResultCallback">A function invoked upon successful (or canceled) completion of the bulk operation.</param>
        /// <param name="errorCallback" type="IErrorCallback">A function invoked when an error is thrown during the bulk operation.</param>
        /// <param name="options" type="Object">Additional options.</param>

        Diag.Debug.assertParamIsArray(workItemIds, "workItemIds");
        Diag.Debug.assertParamIsArray(changes, "changes");

        Diag.logTracePoint("VSS.WorkItemTracking.BulkOperation.beginUpdateWorkItems.start");

        var store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        var workItemManager = WorkItemManager.get(store);

        options = $.extend({
            pageOperationCallback: (workItems: WITOM.WorkItem[]) => {
                var delayCount = 0;

                var tagsAdded: number;
                var tagsRemoved: number;
                var updateFields = (workItem: WITOM.WorkItem, fieldChanges: IFieldIdValue[]) => {

                    // Performing bulk move updates while preserving work item type in the target project 
                    // requires applying different changes based on that work item type.  
                    // This is required for bulk move team project operations that keep the types the same.  
                    if (options.bulkMoveChanges) {
                        fieldChanges = options.bulkMoveChanges[workItem.workItemType.name];
                    }

                    let tagsRemovedOrAdded = BulkOperation.updateWorkItemFields(workItem, fieldChanges);

                    if (tagsRemovedOrAdded < 0) {
                        tagsRemoved = -tagsRemovedOrAdded;
                    }
                    else if (tagsRemovedOrAdded > 0) {
                        tagsAdded = tagsRemovedOrAdded;
                    }
                };

                var tryImmediateSave = (workItems: WITOM.WorkItem[], fieldChanges: IFieldIdValue[]) => {
                    if (options && options.immediateSave) {
                        this._saveWorkItems(tfsContext, workItems, fieldChanges, errorCallback, options);
                    }
                };

                Diag.logTracePoint("VSS.WorkItemTracking.BulkOperation.beginUpdateWorkItems.page-start");

                // Process workitem field changes for macros
                const processFieldChanges = () => BulkOperation.processWorkItemFieldChangesForMacros(tfsContext, workItems, changes, options.teamId).then(
                    (changes: IFieldIdValue[]) => {
                        $.each(workItems, (index, workItem) => {
                            updateFields(workItem, changes);
                        });

                        tryImmediateSave(workItems, changes);

                        if (workItems && (tagsAdded > 0 || tagsRemoved > 0)) {
                            Telemetry.publishEvent(new Telemetry.TelemetryEventData(
                                CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
                                CIConstants.WITCustomerIntelligenceFeature.BULK_EDIT_TAGS,
                                {
                                    "NumberOfWorkItemsModified": workItems.length,
                                    "NumberOfTagsAdded": tagsAdded,
                                    "NumberOfTagsRemoved": tagsRemoved
                                }));
                        }
                    },
                    (error: Error) => {
                        if ($.isFunction(errorCallback)) {
                            errorCallback(error);
                        }
                    }
                );

                //We should fetch nodes in case when Iteration Path and/or Area Path are updated
                const shouldFetchNodes = changes.some((change: IFieldIdValue) => {
                    if (typeof change.fieldName === "number") {
                        return change.fieldName === WITConstants.CoreField.IterationPath || change.fieldName === WITConstants.CoreField.AreaPath;
                    }
                    return Utils_String.equals(change.fieldName, WITConstants.CoreFieldRefNames.IterationPath, true) ||
                        Utils_String.equals(change.fieldName, WITConstants.CoreFieldRefNames.AreaPath, true);
                });

                if (shouldFetchNodes) {
                    const promises = workItems.map((workItem) => {
                        if (workItem.project.nodesCacheManager.isNodesCacheAvailable()) {
                            return Q(null);
                        }
                        return workItem.project.nodesCacheManager.beginGetNodes();
                    });
                    Q.all(promises).then(() => {
                        processFieldChanges();
                    },
                        (error: Error) => {
                            if ($.isFunction(errorCallback)) {
                                errorCallback(error);
                            }
                        });
                }
                else {
                    processFieldChanges();
                }

                Diag.logTracePoint("VSS.WorkItemTracking.BulkOperation.beginUpdateWorkItems.page-complete");
            }
        }, options);

        var wrapCompleted = () => {
            Diag.logTracePoint("VSS.WorkItemTracking.BulkOperation.beginUpdateWorkItems.complete");

            if ($.isFunction(operationCompletedCallback)) {
                operationCompletedCallback();
            }
        };

        // Page in the work items needed for the bulk operation, modifying each page as it is streamed in.
        workItemManager.beginGetWorkItems(workItemIds, wrapCompleted, errorCallback, options);
    }

    private _saveWorkItems(tfsContext: TFS_Host_TfsContext.TfsContext, workItems: WITOM.WorkItem[], changes: IFieldIdValue[], errorCallback?: IErrorCallback, options?: any) {
        /// <summary>Saves the specified work items in a batch.</summary>
        /// <param name="workItems" type="Array">An array of work item objects to be saved.</param>
        /// <param name="changes" type="Array">An array of changes applied to the specified list of work items.</param>
        /// <param name="errorCallback" type="IErrorCallback">A function invoked when an error occurs.</param>
        /// <param name="options" type="Object">Additional options.</param>

        Diag.Debug.assertParamIsArray(workItems, "workItems");
        Diag.Debug.assertParamIsArray(changes, "changes");

        var store = TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);

        if (options && $.isFunction(options.beforeSave)) {
            options.beforeSave(workItems);
        }

        store.beginSaveWorkItemsBatch(workItems, function () {
            if (options && $.isFunction(options.afterSave)) {
                options.afterSave(workItems, changes);
            }
        }, errorCallback);
    }
}
