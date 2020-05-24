import { WorkItemStore, IWorkItemChangedArgs } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { WorkItemManager, WorkItemStoreEventParam } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { WorkItemChangeType, Actions } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemsHubTabs } from "WorkItemsHub/Scripts/Generated/Constants";
import * as WorkItemsHubTabUtils from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";
import * as EventsServices from "VSS/Events/Services";
import { ActionsCreator } from "WorkItemsHub/Scripts/Actions/ActionsCreator";
import { autobind } from "OfficeFabric/Utilities";
import { WorkItemsHubDataProvider } from "WorkItemsHub/Scripts/DataProviders/WorkItemsHubDataProvider";
import { FollowsService, IFollowsEventArgs } from "Notifications/Services";

export class WorkItemEventHandler implements IDisposable {
    private _actionsCreator: ActionsCreator;
    private _store: WorkItemStore;
    private _eventService: EventsServices.EventService;

    constructor(actionsCreator: ActionsCreator) {
        this._actionsCreator = actionsCreator;
        this._store = ProjectCollection.getDefaultConnection().getService<WorkItemStore>(WorkItemStore);
        this._eventService = EventsServices.getService();

        WorkItemManager.get(this._store).attachWorkItemChanged(this._onWorkItemChanged);
        this._eventService.attachEvent(Actions.WORKITEM_DELETED, this._onWorkItemDeleted);
        this._eventService.attachEvent(FollowsService.FOLLOWS_STATE_CHANGED, this._onFollowsStateChanged);
    }

    public dispose(): void {
        WorkItemManager.get(this._store).detachWorkItemChanged(this._onWorkItemChanged);
        this._eventService.detachEvent(Actions.WORKITEM_DELETED, this._onWorkItemDeleted);
        this._eventService.detachEvent(FollowsService.FOLLOWS_STATE_CHANGED, this._onFollowsStateChanged);
    }

    @autobind
    private _onFollowsStateChanged(sender: FollowsService, args: IFollowsEventArgs) {
        const followingTabId = WorkItemsHubTabUtils.TabIdByTabEnumValueMap[WorkItemsHubTabs.Following];
        const currentTabId = WorkItemsHubDataProvider.getCurrentTabId();
        if (currentTabId === followingTabId) {
            this._actionsCreator.refreshDataProviderAsync(currentTabId, true);
        }
        else {
            this._actionsCreator.invalidateTabData(followingTabId);
        }
    }

    @autobind
    private _onWorkItemChanged(sender: any, args: IWorkItemChangedArgs) {
        if ((args.change === WorkItemChangeType.SaveCompleted || args.change === WorkItemChangeType.Reset) &&
            !args.workItem.isNew()) {
            const currentTabId = WorkItemsHubDataProvider.getCurrentTabId();
            this._actionsCreator.refreshDataProviderAsync(currentTabId, true);
        }
    }

    @autobind
    private _onWorkItemDeleted(store: WorkItemStore, args: WorkItemStoreEventParam) {
        const currentTabId = WorkItemsHubDataProvider.getCurrentTabId();
        this._actionsCreator.removeWorkItemFromDataProvider(currentTabId, [args.workItemId]);
    }
}
