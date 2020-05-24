import * as VSSStore from  "VSS/Flux/Store";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/Actions/ActionsHub";

/**
 * A store that contains WorkItems data associated with a commit
 */
export class WorkItemsStore extends VSSStore.RemoteStore {
    private _state: number[] = [];

    constructor(private _actionsHub: ActionsHub) {
        super();

        this._actionsHub.workItemsUpdated.addListener(this._onWorkItemsUpdated);
    }

    public get state(): number[]{
        return this._state;
    }

    public dispose(): void {
        if (this._actionsHub) {
            this._actionsHub.workItemsUpdated.removeListener(this._onWorkItemsUpdated);
            this._actionsHub = null;
        }

        this._state = null;
    }

    private _onWorkItemsUpdated = (workItems: number[]) => {
        if (workItems) {
            this._state = workItems;
        }
        this._loading = false;
        this.emitChanged();
    }
}
