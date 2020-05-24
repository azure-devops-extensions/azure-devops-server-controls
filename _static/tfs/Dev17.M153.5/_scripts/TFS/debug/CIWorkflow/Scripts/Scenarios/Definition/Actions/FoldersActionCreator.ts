import { FoldersActions } from "CIWorkflow/Scripts/Scenarios/Definition/Actions/FoldersActions";
import { ActionCreatorKeys } from "CIWorkflow/Scripts/Scenarios/Definition/Common";
import { IServiceClient } from "CIWorkflow/Scripts/Service/IServiceClient";
import { ServiceClientFactory } from "CIWorkflow/Scripts/Service/ServiceClientFactory";

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionsBase from "DistributedTaskControls/Common/Actions/Base";

import { Folder } from "TFS/Build/Contracts";

import { handleError } from "VSS/VSS";

export class FoldersActionCreator extends ActionsBase.ActionCreatorBase {
    private _buildService: IServiceClient;
    private _actions: FoldersActions;

    public initialize() {
        this._actions = ActionsHubManager.GetActionsHub<FoldersActions>(FoldersActions);
        this._buildService = ServiceClientFactory.getServiceClient();
    }

    public static getKey(): string {
        return ActionCreatorKeys.Folders_ActionCreator;
    }

    public getFolders(path?: string, replace?: boolean): IPromise<Folder[]> {
        return this._buildService.getFolders(path).then((folders) => {
            this._actions.FoldersUpdated.invoke({
                folders: folders
            });

            return folders;
        }, (error) => {
            handleError(error);
        });
    }
}
