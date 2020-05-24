import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { SaveStatusActionsHub, SaveStatus } from "DistributedTaskControls/Actions/SaveStatusActionsHub";
import { ActionCreatorKeys } from "DistributedTaskControls/Common/Common";

export class SaveActionsCreator extends ActionsBase.ActionCreatorBase {

    public static getKey(): string {
        return ActionCreatorKeys.SaveStatusActionsCreator;
    }

    public initialize(): void {
        this._saveDefinitionActions = ActionsHubManager.GetActionsHub<SaveStatusActionsHub>(SaveStatusActionsHub);
    }

    public updateSaveDefinitionStatus(status: SaveStatus): void {
        this._saveDefinitionActions.updateSaveStatus.invoke(status);
    }

    private _saveDefinitionActions: SaveStatusActionsHub; 
}