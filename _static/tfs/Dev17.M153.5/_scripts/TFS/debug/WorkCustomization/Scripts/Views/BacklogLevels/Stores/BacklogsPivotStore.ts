import * as BaseStore from "VSS/Flux/Store";
import { ActionsHub } from "Admin/Scripts/BacklogLevels/Actions/ActionsHub";
import { getWorkItemTypesStore, WorkItemTypesStore } from "WorkCustomization/Scripts/Stores/Process/WorkItemTypesStore";

export class BacklogsPivotStore extends BaseStore.Store {
    private _actionHub: ActionsHub;
    private _workItemTypesStore: WorkItemTypesStore;

    constructor(actionHub: ActionsHub) {
        super();

        this._actionHub = actionHub;
        this._workItemTypesStore = getWorkItemTypesStore();
        this._addListeners();
    }

    public dispose(): void {
        this._removeListeners();
    }

    private _addListeners(): void {
        this._workItemTypesStore.addListenersToBacklogLevels(this._actionHub);
    }

    private _removeListeners(): void {
        this._workItemTypesStore.removeListenersFromBacklogLevels(this._actionHub);
    }
}