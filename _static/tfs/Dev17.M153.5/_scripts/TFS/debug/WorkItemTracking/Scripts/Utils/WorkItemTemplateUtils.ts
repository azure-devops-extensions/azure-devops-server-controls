
import Q = require("q");

import VSS = require("VSS/VSS");
import Service = require("VSS/Service");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import { WorkItemTemplateService } from "WorkItemTracking/Scripts/Services/WorkItemTemplateService";
import { BulkOperation } from "WorkItemTracking/Scripts/Utils/BulkOperation";
import WITContracts = require("TFS/WorkItemTracking/Contracts");
import WITOM = require("WorkItemTracking/Scripts/TFS.WorkItemTracking");
import { IFieldIdValue, IWorkItemInfoText } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import WITConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import Events_Services = require("VSS/Events/Services");
import Navigation_Services = require("VSS/Navigation/Services");
import BulkEdit_NO_REQUIRE = require("WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit");
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { WorkItemEvents } from "WorkItemTracking/Scripts/Utils/Events";
import { WorkItemInfoBar } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemInfoBar";
import { getInvariantOperator, getLocalizedOperator, getInvariantTodayMacro, getLocalizedTodayMacro, isTodayMacro, isCurrentIterationMacro, isMeMacro } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import VSS_Telemetry = require("VSS/Telemetry/Services");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Number = require("VSS/Utils/Number");

const eventSvc = Events_Services.getService();
const historySvc = Navigation_Services.getHistoryService();

export namespace TemplatesTelemetry {
    // All telemetry for the Work Item Templates FEature will be under this area
    export const Area = "WorkItemTemplates";

    // Apply template using context menu
    export const FeatureContextMenu = "ContextMenu";

    // Create work item with template using Url
    export const FeatureCreateWorkItem = "CreateWorkItem";

    // Create a new template (Capture)
    export const FeatureCreateTemplate = "CreateTemplate";

    // Create a new template (Admin)
    export const FeatureCreateTemplateAdmin = "CreateTemplateAdmin";

    // Copy template (Admin)
    export const FeatureCopyTemplateAdmin = "CopyTemplateAdmin";

    // Delete template (Admin)
    export const FeatureDeleteTemplateAdmin = "DeleteTemplateAdmin";

    // Update an existing template
    export const FeatureReplaceTemplate = "ReplaceTemplate";

    // Properties

    // Work Item Type
    export const PropType = "Type";

    // Number of fields that dialog was populated with
    export const PropNumOfInitialFields = "NumOfInitialFields";

    // Number of the initial fields that were removed before saving
    export const PropNumOfRemovedFields = "NumOfRemovedFields";

    // Wether user clicked on remove unmodified before saving
    export const RemoveUnmodifiedClicked = "RemoveUnmodifiedClicked";

    // Number of work items the template is applied to
    export const PropNumOfWorkItems = "NumOfWorkItems";

    // Context, where it was applied from form or grid
    export const PropContext = "Context";
}

export namespace WorkItemTemplatesHelper {

    /**
     * Returns the Work Item Template Service
     * @param context Current tfs context
     */
    function getWorkItemTemplateService(tfsContext: TFS_Host_TfsContext.TfsContext): WorkItemTemplateService {
        tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        const connection: Service.VssConnection = TFS_OM_Common.ProjectCollection.getConnection(tfsContext);
        return connection.getService<WorkItemTemplateService>(WorkItemTemplateService);
    }

    function getWorkItemStore(tfsContext: TFS_Host_TfsContext.TfsContext): WITOM.WorkItemStore {
        tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        const connection: Service.VssConnection = TFS_OM_Common.ProjectCollection.getConnection(tfsContext);
        return connection.getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
    }

    /**
     * Returns a workitem template promise
     * @param context Current tfs context
     * @param ownerId WorkItemTemplate owner id
     * @param templateId Id of the template to fetch
     */
    export function getWorkItemTemplate(context: TFS_Host_TfsContext.TfsContext, ownerId: string, templateId: string): IPromise<WITContracts.WorkItemTemplate> {
        const tfsContext = context || TFS_Host_TfsContext.TfsContext.getDefault();
        const service = getWorkItemTemplateService(context);
        const projectId = tfsContext.contextData.project.id;

        return service.getWorkItemTemplate(projectId, ownerId, templateId);
    }

    /**
     * Gets a template and applies it to the new unsaved workitem.
     * Note: This helper will not save the workitem
     * @param context Current tfs context
     * @param workItem Workitem to update
     * @param templateId Id of the template to fetch
     */
    export function getAndApplyWorkItemTemplateForNewWorkItem(tfsContext: TFS_Host_TfsContext.TfsContext, workItem: WITOM.WorkItem, ownerId: string, templateId: string): void {
        const props: IDictionaryStringTo<any> = {};
        props[TemplatesTelemetry.PropType] = workItem.workItemType.name;
        const event: VSS_Telemetry.TelemetryEventData = new VSS_Telemetry.TelemetryEventData(
            TemplatesTelemetry.Area,
            TemplatesTelemetry.FeatureCreateWorkItem,
            props);
        VSS_Telemetry.publishEvent(event);

        getProcessedFieldChangesForTemplate(tfsContext, ownerId, templateId).done(
            (templateFieldChanges: IFieldIdValue[]) => {
                BulkOperation.processWorkItemFieldChangesForMacros(tfsContext, [workItem], templateFieldChanges, ownerId).then(
                    (appliedFieldChanges: IFieldIdValue[]) => {
                        BulkOperation.updateWorkItemFields(workItem, appliedFieldChanges);
                    },
                    (error: Error) => {
                        fireWorkItemTemplateErrorForInfoBar([workItem.id], VSS.getErrorMessage(error));
                    }
                );
            },
            (error: Error) => {
                fireWorkItemTemplateErrorForInfoBar([workItem.id], Resources.WorkItemTemplateDoesNotExist);
            }
        );
    }

    /**
     * Removes templateId parameter from the query string.
     */
    export function removeTemplateIdFromNavigationState() {
        const currentState = historySvc.getCurrentState();
        const currentAction = currentState && currentState.action;
        historySvc.replaceHistoryPoint(
            currentAction,
            $.extend({}, currentState, { templateId: null, ownerId: null }), // remove templateId & ownerId
            null,
            true
        );
    }

    export interface IWorkItemTemplateBulkUpdateItemsOptions {
        /** Current tfs context */
        tfsContext: TFS_Host_TfsContext.TfsContext;
        
        /** workitem object to update (can be null if workItemIds is used) */
        workItem: WITOM.WorkItem;

        /** Ids of workitems to update (can be null if workItem is used) */
        workItemIds: number[];

        /** Id of the template to fetch */
        templateId: string;

        /** WorkItemTemplate ownerId */
        ownerId: string;

        /** Optional flag indicating if workitems are to be saved immediately */
        immediateSave?: boolean;
    }

    /**
     * Gets a template and applies it to the specified workitems.
     * @param options typeof IWorkItemTemplateBulkUpdateItemsOptions
     */
    export function getWorkItemTemplateAndBulkUpdateWorkItems(options: IWorkItemTemplateBulkUpdateItemsOptions): void {
        // Show form busy overlay
        eventSvc.fire(WorkItemActions.ACTION_SHOW_WORKITEM_FORM_BUSY);

        const errorCallback = (error: Error) => {
            eventSvc.fire(WorkItemEvents.BULK_EDIT_ERROR, error);
        };
        const immediateSave = !!options.immediateSave;

        getProcessedFieldChangesForTemplate(options.tfsContext, options.ownerId, options.templateId).done(
            (fieldChanges: IFieldIdValue[]) => {
                if (immediateSave) {
                    eventSvc.fire(WorkItemEvents.BEFORE_BULK_EDIT);
                }

                try {
                    if (options.workItem) {
                        BulkOperation.processWorkItemFieldChangesForMacros(options.tfsContext, [options.workItem], fieldChanges, options.ownerId).then(
                            (changes) => {
                                BulkOperation.updateWorkItemFields(options.workItem, changes);
                                if (immediateSave) {
                                    eventSvc.fire(WorkItemEvents.AFTER_BULK_EDIT, { workItems: [options.workItem], changes: changes });
                                }
                            },
                            (error) => {
                                fireWorkItemTemplateErrorForInfoBar(options.workItemIds, Resources.WorkItemTemplateNotApplied);
                                errorCallback(error);
                            }
                        );
                    } else {
                        VSS.using(["WorkItemTracking/Scripts/TFS.WorkItemTracking.Controls.BulkEdit"], (bulkEdit: typeof BulkEdit_NO_REQUIRE) => {
                            bulkEdit.bulkUpdateWorkItems(options.tfsContext,
                                options.workItemIds,
                                fieldChanges,
                                {
                                    immediateSave: immediateSave,
                                    afterSave: (workItems, changes) => {
                                        eventSvc.fire(WorkItemEvents.AFTER_BULK_EDIT, { workItems: workItems, changes: changes });
                                    },
                                    teamId: options.ownerId
                                },
                                errorCallback);
                        });
                    }
                } catch (error) {
                    fireWorkItemTemplateErrorForInfoBar(options.workItemIds, Resources.WorkItemTemplateNotApplied);
                    errorCallback(error);
                }
                finally {
                    eventSvc.fire(WorkItemActions.ACTION_HIDE_WORKITEM_FORM_BUSY);
                }
            },
            (error: Error) => {
                errorCallback(error);
                fireWorkItemTemplateErrorForInfoBar(options.workItemIds, Resources.WorkItemTemplateDoesNotExist);
                eventSvc.fire(WorkItemActions.ACTION_HIDE_WORKITEM_FORM_BUSY);
            }
        );
    }

    function fireWorkItemTemplateErrorForInfoBar(workItemIds: number[], errorMessage: string) {
        const infoText: IWorkItemInfoText = {
            invalid: true,
            text: errorMessage
        };
        for (const id of workItemIds) {
            eventSvc.fire(WorkItemInfoBar.ACTION_INFOBAR_SHOW_INFO, null, { workItemId: id, info: infoText });
        }
    }

    function getProcessedFieldChangesForTemplate(tfsContext: TFS_Host_TfsContext.TfsContext, ownerId: string, templateId: string): Q.Promise<IFieldIdValue[]> {
        return Q(getWorkItemTemplate(tfsContext, ownerId, templateId))
            .then((template: WITContracts.WorkItemTemplate) => {
                const fields = getWorkItemStore(tfsContext).fieldMap;
                const fieldChanges = template.fields;

                const result: IFieldIdValue[] = [];
                const fieldRefNames = Object.keys(fieldChanges) || [];

                // Ensure state field change is the first item in the result
                const stateFieldRefName = WITConstants.CoreFieldRefNames.State;
                if (!!fieldChanges[stateFieldRefName]) {
                    result.push({
                        fieldName: stateFieldRefName,
                        value: fieldChanges[stateFieldRefName]
                    });
                    fieldRefNames.splice(fieldRefNames.indexOf(stateFieldRefName), 1);
                }

                for (const fieldRefName of fieldRefNames) {
                    result.push({
                        fieldName: fieldRefName,
                        value: _getLocalizedFieldValue(fields, fieldRefName, fieldChanges[fieldRefName])
                    });
                }

                return result;
            });
    }

    /**
     * converts Invariant Field Values to Localized Field Values
     *
     * THIS METHOD IS EXPORTED --ONLY-- FOR TESTING PURPOSES
     *
     * @param fieldDefinitions - Map from Field Ref Name (Upper Case) to Field Definition
     * @param fieldRefName
     * @param fieldValue
     */
    export function _getLocalizedFieldValue(fieldDefinitions: IDictionaryStringTo<WITOM.FieldDefinition>, fieldRefName: string, fieldValue: string): Date | string | number {
        const upperFieldRefName = fieldRefName.toUpperCase();

        if (fieldDefinitions[upperFieldRefName]) {
            switch (fieldDefinitions[upperFieldRefName].type) {
                case WITConstants.FieldType.DateTime:
                    // false means not localized
                    if (isTodayMacro(fieldValue, false)) {
                        return getLocalizedTodayMacro(fieldValue);
                    }

                    const date = BulkOperation.parseDate(fieldValue);
                    if (!date) {
                        return fieldValue;
                    }
                    return Utils_Core.convertValueToDisplayString(date, "d");
                case WITConstants.FieldType.Double:
                    const parsedNumber = Utils_Number.parseInvariant(fieldValue);
                    if (!isNaN(parsedNumber)) {
                        return parsedNumber;
                    }
                    return fieldValue;
            }
        }

        const isIdentity = fieldDefinitions[upperFieldRefName] && fieldDefinitions[upperFieldRefName].isIdentity;
        if (isIdentity && isMeMacro(fieldValue, false)) {
            return getLocalizedOperator(fieldValue);
        }

        const isIteration = Utils_String.equals(fieldRefName, WITConstants.CoreFieldRefNames.IterationPath, true);
        if (isIteration && isCurrentIterationMacro(fieldValue, false)) {
            return getLocalizedOperator(fieldValue);
        }

        return fieldValue;
    }

    export function generateTemplateUrl(workItemType: string, ownerId: string, templateId: string, tfsContext?: TFS_Host_TfsContext.TfsContext): string {
        const parameters = {
            area: "",
            templateId: templateId,
            parameters: workItemType,
            ownerId
        };

        // Generate url similar to http://{host}:{port}/tfs/{collection}/{project}/{team}/_workitems/create/{workitemtype}?templateId={templateId}
        tfsContext = tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
        return tfsContext.getPublicActionUrl("create", "workitems", parameters);
    }
}
