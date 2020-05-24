import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import * as BuildContracts from "TFS/Build/Contracts";

import { Action } from "VSS/Flux/Action";

export interface IFoldersUpdatedPayload {
    folders: BuildContracts.Folder[];
}

export class FoldersActions extends ActionsHubBase {
    private _foldersUpdated: Action<IFoldersUpdatedPayload>;

    public initialize(): void {
        this._foldersUpdated = new Action<IFoldersUpdatedPayload>();
    }

    public static getKey(): string {
        return "CI.FoldersActions";
    }

    public get FoldersUpdated(): Action<IFoldersUpdatedPayload> {
        return this._foldersUpdated;
    }
}
