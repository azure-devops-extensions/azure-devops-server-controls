import { IPlanningActionsCreator } from "Agile/Scripts/BacklogsHub/Planning/ActionsCreator/PlanningActionsCreator";
import { IPlanningWorkItem } from "Agile/Scripts/BacklogsHub/Planning/PlanningContracts";
import { IBacklogMembershipEvaluator } from "Agile/Scripts/Common/IBacklogMembershipEvaluator";
import { CoreField } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Diag from "VSS/Diag";
import { getService as getEventService } from "VSS/Events/Services";
import * as Utils_String from "VSS/Utils/String";
import { Actions, WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager, WorkItemStoreEventParam } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { IWorkItemChangedArgs, WorkItem, WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export interface IPlanningWorkItemEventSubscriber extends IDisposable {
    initialize: () => void;
}

interface IFieldIds {
    effortFieldId: number;
    teamFieldId: number;
}

/**
 * Subscribes to work item update events and notifies planning actions creator for work item updates
 */
export class PlanningWorkItemEventSubscriber implements IPlanningWorkItemEventSubscriber {

    private _actionsCreator: IPlanningActionsCreator;
    private _workItemsManager: WorkItemManager;
    private _membershipEvaluatorBuilder: () => IBacklogMembershipEvaluator;
    private _teamFieldRefName: string;
    private _effortFieldRefName: string;

    private _requirementWorkItemTypes: string[];

    /**
     * Constructor
     * @param actionsCreator Action Creator
     * @param membershipEvaluatorBuilder Should return Backlog membership evaluator
     * @param workItemsManager Work Item Manager
     * @param teamFieldRefName Reference name for the team field
     * @param effortsFieldRefName Reference name of the Efforts Field
     * @param requirementWorkItemTypes Work Item Type names for requirements 
     *                                 (Efforts for these only these work item types will be tracked)
     */
    constructor(
        actionsCreator: IPlanningActionsCreator,
        membershipEvaluatorBuilder: () => IBacklogMembershipEvaluator,
        workItemsManager: WorkItemManager,
        teamFieldRefName: string,
        effortsFieldRefName: string,
        requirementWorkItemTypes: string[]) {

        this._actionsCreator = actionsCreator;
        this._workItemsManager = workItemsManager;
        this._membershipEvaluatorBuilder = membershipEvaluatorBuilder;

        this._teamFieldRefName = teamFieldRefName;
        this._effortFieldRefName = effortsFieldRefName;

        this._requirementWorkItemTypes = requirementWorkItemTypes;
    }

    public initialize() {
        this._workItemsManager.attachWorkItemChanged(this._workItemChanged);

        // Delete events for items not in the manager will come from here. Otherwise we would
        // have to beginGet the work item before deleting it, which isn't necessary.
        getEventService().attachEvent(Actions.WORKITEM_DELETED, this._workItemDeletedHandler);
    }

    public dispose() {
        this._workItemsManager.detachWorkItemChanged(this._workItemChanged);
        getEventService().detachEvent(Actions.WORKITEM_DELETED, this._workItemDeletedHandler);
        this._workItemsManager = null;
        this._actionsCreator = null;
    }

    /**
     * Public for unit testing
     */
    public _handleWorkItemFieldChange(args: IWorkItemChangedArgs) {

        const {
            effortFieldId,
            teamFieldId
        } = this._getFieldIds(args.workItem);

        const changedFields = args.changedFields;

        // Check to see if we are interested in the update
        if (changedFields[CoreField.IterationPath] ||
            (teamFieldId && changedFields[teamFieldId]) ||
            (effortFieldId && changedFields[effortFieldId]) ||
            changedFields[CoreField.State]) {

            const planningWorkItem: IPlanningWorkItem = this._getPlanningWorkItem(args.workItem, effortFieldId);
            this._actionsCreator.workItemChanged(planningWorkItem);
        }
    }

    /**
     * Public for unit testing
     */
    public _workItemChanged = (source: WorkItemManager, args?: IWorkItemChangedArgs) => {
        if (!args) {
            return;
        }

        switch (args.change) {
            case WorkItemChangeType.FieldChange: {
                if (args.workItem && args.workItem.id > 0) {
                    const membershipEvaluator = this._membershipEvaluatorBuilder();
                    membershipEvaluator.evaluate(args.workItem, (isMember) => {
                        if (isMember) {
                            this._handleWorkItemFieldChange(args);
                        } else {
                            this._actionsCreator.workItemRemoved(args.workItem.id);
                        }
                    });
                }
                break;
            }
            case WorkItemChangeType.Deleted: {
                this._actionsCreator.workItemRemoved(args.workItem.id);
                break;
            }
        }
    }

    private _workItemDeletedHandler = (store: WorkItemStore, args: WorkItemStoreEventParam) => {
        this._actionsCreator.workItemRemoved(args.workItemId);
    }

    private _getPlanningWorkItem(workItem: WorkItem, effortFieldId: number): IPlanningWorkItem {
        const getValue = (fieldId) => {
            // If the fieldId is invalid
            if (fieldId === null || fieldId === undefined) {
                Diag.Debug.fail("Invalid field id.");
                return null;
            }

            return workItem.getFieldValue(fieldId);
        };

        return {
            id: workItem.id,
            iterationPath: getValue(CoreField.IterationPath),
            effort: this._shouldTrackEffort(workItem.workItemType.name) ? getValue(effortFieldId) : 0,
            state: getValue(CoreField.State),
            workItemType: workItem.workItemType.name
        };
    }

    private _shouldTrackEffort(workItemTypeName: string) {
        return this._requirementWorkItemTypes.some((reqType) => Utils_String.equals(reqType, workItemTypeName, /* ignore case*/ true));
    }

    /**
     * Converts field ref names to ids
     */
    private _getFieldIds(workItem: WorkItem): IFieldIds {
        return {
            effortFieldId: this._getFieldId(workItem, this._effortFieldRefName),
            teamFieldId: this._getFieldId(workItem, this._teamFieldRefName)
        };
    }

    private _getFieldId(workItem: WorkItem, fieldRefName: string): number {
        const field = workItem.getField(fieldRefName);
        if (field) {
            return field.fieldDefinition.id;
        }
        return null;
    }
}