import { WorkItemStore, IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItemManager, WorkItemStoreEventParam } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { WorkItemChangeType, Actions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import * as EventsServices from "VSS/Events/Services";
import { convertPotentialIdentityRefFromFieldValue } from "WorkItemTracking/Scripts/Utils/WorkItemIdentityHelper";

// Keep it in sync with Tfs\Web\extensions\wit\vss-work-web\wit-legacywitom-listener\LegacyWITOMListenerSaga.ts
export interface WorkItemEventHandlerCallbacks {
    onWorkItemFieldChanged: (workItemId: number, changedFieldValues: { [fieldRefName: string]: any }) => void;
    onWorkItemDeleted: (workItemId: number) => void;
}

/**
 * Handles Workitem change events notifies the call backs
 */
export class LegacyWorkItemEventHandler implements IDisposable {
    private _store: WorkItemStore;
    private _eventService: EventsServices.EventService;

    constructor(private _callbacks?: WorkItemEventHandlerCallbacks) {

    }

    public initialize() {
        this._store = ProjectCollection.getDefaultConnection().getService<WorkItemStore>(WorkItemStore);
        this._eventService = EventsServices.getService();

        const workItemManager = WorkItemManager.get(this._store);
        workItemManager.attachWorkItemChanged(this._onWorkItemChanged);

        this._eventService.attachEvent(Actions.WORKITEM_DELETED, this._onWorkItemDeleted);
    }

    public dispose(): void {
        WorkItemManager.get(this._store).detachWorkItemChanged(this._onWorkItemChanged);
        this._eventService.detachEvent(Actions.WORKITEM_DELETED, this._onWorkItemDeleted);
    }

    private _onWorkItemChanged = (sender: any, args: IWorkItemChangedArgs) => {
        const {
            change,
            workItem,
            changedFields
        } = args;

        if (change === WorkItemChangeType.SaveCompleted) {
            const workItemId = workItem.id;
            const changedFieldValues: { [fieldRefName: string]: any } = {};
            for (const fieldId in changedFields) {
                if (changedFields.hasOwnProperty(fieldId)) {
                    const field = changedFields[fieldId];
                    const {
                        referenceName,
                        isIdentity
                    } = field.fieldDefinition;
                    let fieldValue = field.getValue();
                    if(isIdentity) {
                        const identityRef = convertPotentialIdentityRefFromFieldValue(fieldValue, /* asIdentityRef */ true);
                        
                        fieldValue = {
                            distinctDisplayName: fieldValue,
                            identityRef
                        };
                    }
                    
                    changedFieldValues[referenceName] = fieldValue;
                }
            }
            this._callbacks.onWorkItemFieldChanged(workItemId, changedFieldValues);
        }
    }

    private _onWorkItemDeleted = (store: WorkItemStore, args: WorkItemStoreEventParam) => {
        this._callbacks.onWorkItemDeleted(args.workItemId);
    }
}
