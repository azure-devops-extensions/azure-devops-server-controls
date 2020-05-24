import { FoldersActions, IFoldersUpdatedPayload } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/FoldersActions";
import { BuildDefinitionStoreKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";

import { Folder } from "TFS/Build/Contracts";

export class FolderManageDialogStore extends StoreBase {
    private _actions: FoldersActions;
    private _folders: Folder[] = [];

    constructor() {
        super();
    }

    public static getKey(): string {
        return BuildDefinitionStoreKeys.StoreKey_ManageFolderDialogStore;
    }

    public initialize(): void {
        this._actions = ActionsHubManager.GetActionsHub<FoldersActions>(FoldersActions);
        this._actions.FoldersUpdated.addListener(this._foldersUpdated);
    }

    public getFolders(): Folder[] {
        return this._folders;
    }

    protected disposeInternal(): void {
        this._actions.FoldersUpdated.removeListener(this._foldersUpdated);
    }

    private _foldersUpdated = (payload: IFoldersUpdatedPayload) => {
        this._folders = payload.folders;
        this.emitChanged();
    }
}
