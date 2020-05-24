import { WorkItemStore, IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItemManager, WorkItemStoreEventParam } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { WorkItemChangeType, Actions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import * as EventsServices from "VSS/Events/Services";
import { autobind } from "OfficeFabric/Utilities";
import { FollowsService } from "Notifications/Services";

export interface WorkItemEventHandlerOptions {
    onSave: () => void;
    onDelete: (workItemId: number) => void;
    onFollowsStateChanged: () => void;
}

export class LegacyWorkItemEventHandler implements IDisposable {
    private _store: WorkItemStore;
    private _eventService: EventsServices.EventService;

    constructor(private _options?: WorkItemEventHandlerOptions) {
        this._store = ProjectCollection.getDefaultConnection().getService<WorkItemStore>(WorkItemStore);
        this._eventService = EventsServices.getService();

        WorkItemManager.get(this._store).attachWorkItemChanged(this._onWorkItemChanged);
        this._eventService.attachEvent(Actions.WORKITEM_DELETED, this._onWorkItemDeleted);
        this._eventService.attachEvent(FollowsService.FOLLOWS_STATE_CHANGED, this._options.onFollowsStateChanged);
    }

    public dispose(): void {
        WorkItemManager.get(this._store).detachWorkItemChanged(this._onWorkItemChanged);
        this._eventService.detachEvent(Actions.WORKITEM_DELETED,this._onWorkItemDeleted);
        this._eventService.detachEvent(FollowsService.FOLLOWS_STATE_CHANGED, this._options.onFollowsStateChanged);
    }

    @autobind
    private _onWorkItemChanged(sender: any, args: IWorkItemChangedArgs) {
        if ((args.change === WorkItemChangeType.SaveCompleted || args.change === WorkItemChangeType.Reset) &&
            !args.workItem.isNew()) {
            this._options.onSave();
        }
    }

    @autobind
    private _onWorkItemDeleted(store: WorkItemStore, args: WorkItemStoreEventParam) {
        this._options.onDelete(args.workItemId);
    }
}
