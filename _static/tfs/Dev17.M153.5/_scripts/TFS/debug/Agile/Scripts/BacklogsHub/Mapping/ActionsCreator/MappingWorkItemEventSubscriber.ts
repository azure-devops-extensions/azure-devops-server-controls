import { IMappingActionsCreator } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingActionsCreator";
import { MappingMembershipEvaluator } from "Agile/Scripts/BacklogsHub/Mapping/ActionsCreator/MappingMembershipEvaluator";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WorkItem as IWorkItem } from "TFS/WorkItemTracking/Contracts";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { IWorkItemChangedArgs, WorkItem } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export interface IMappingWorkItemEventSubscriber extends IDisposable {
    initialize: () => void;
}

/**
 * Subscribes to work item update events and notifies Mapping actions creator for work item updates
 */
export class MappingWorkItemEventSubscriber implements IMappingWorkItemEventSubscriber {
    private _actionsCreator: IMappingActionsCreator;
    private _workItemsManager: WorkItemManager;
    private _membershipEvaluator: MappingMembershipEvaluator;

    /**
     * Constructor
     * @param actionsCreator Action Creator
     * @param membershipEvaluator Mapping pane membership evaluator
     * @param workItemsManager Work Item Manager
     */
    constructor(
        actionsCreator: IMappingActionsCreator,
        membershipEvaluator: MappingMembershipEvaluator,
        workItemsManager: WorkItemManager
    ) {

        this._actionsCreator = actionsCreator;
        this._workItemsManager = workItemsManager;
        this._membershipEvaluator = membershipEvaluator;
    }

    public initialize() {
        this._workItemsManager.attachWorkItemChanged(this._workItemChanged);
    }

    public dispose() {
        this._workItemsManager.detachWorkItemChanged(this._workItemChanged);
        this._workItemsManager = null;
        this._actionsCreator = null;
    }

    private _workItemChanged = (source: WorkItemManager, args?: IWorkItemChangedArgs) => {
        if (!args) {
            return;
        }

        switch (args.change) {
            case WorkItemChangeType.SaveCompleted: {
                if (args.workItem && args.workItem.id > 0) {
                    if (this._membershipEvaluator.isValid(args.workItem)) {
                        const workItem: IWorkItem = this._getIWorkItem(args.workItem);
                        this._actionsCreator.workItemChanged(workItem);
                    } else {
                        this._actionsCreator.workItemRemoved(args.workItem.id);
                    }

                }
                break;
            }
            case WorkItemChangeType.Deleted: {
                this._actionsCreator.workItemRemoved(args.workItem.id);
                break;
            }
            default:
                return;
        }
    }

    private _getIWorkItem(workItem: WorkItem): IWorkItem {
        const workItemRevisions = workItem.getRevisions();
        let currentRevision = null;
        if (workItemRevisions && workItemRevisions.length > 0) {
            currentRevision = workItemRevisions[workItemRevisions.length - 1];
        }

        return {
            id: workItem.id,
            fields: {
                [CoreFieldRefNames.Title]: workItem.getFieldValue(CoreFieldRefNames.Title),
                [CoreFieldRefNames.WorkItemType]: workItem.getFieldValue(CoreFieldRefNames.WorkItemType)
            },
            relations: workItem.getWorkItemRelations(),
            rev: currentRevision,
            _links: workItem.getLinks(),
            url: WorkItem.getResourceUrl(TfsContext.getDefault(), workItem.id)
        };
    }
}