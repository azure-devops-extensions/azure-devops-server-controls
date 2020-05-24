import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { SaveStatusActionsHub, SaveStatus } from "DistributedTaskControls/Actions/SaveStatusActionsHub";
import { StoreKeys } from "DistributedTaskControls/Common/Common";

export class SaveStatusStore extends StoreBase {

    constructor() {
        super();
        this._saveStatusActionsHub = ActionsHubManager.GetActionsHub<SaveStatusActionsHub>(SaveStatusActionsHub);
    }

    public static getKey(): string {
        return StoreKeys.SaveStatusStore;
    }

    public initialize(instanceId: string): void {
        this._saveStatusActionsHub.updateSaveStatus.addListener(this._handleUpdateSaveStatus);
    }

    public disposeInternal(): void {
        this._saveStatusActionsHub.updateSaveStatus.removeListener(this._handleUpdateSaveStatus);
    }
    
    public isSaveInProgress(): boolean {
        return this._saveStatus === SaveStatus.InProgress;
    }

    public hasSaveCompleted(): boolean {
        return this._saveStatus === SaveStatus.Success || this._saveStatus === SaveStatus.Failure;
    }
    
    private _handleUpdateSaveStatus = (status: SaveStatus) => {
        this._saveStatus = status;
        this.emitChanged();
    }

    private _saveStatus: SaveStatus;
    private _saveStatusActionsHub: SaveStatusActionsHub;
}