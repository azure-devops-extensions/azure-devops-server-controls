import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ActionsBase } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { ReleaseEnvironment } from "ReleaseManagement/Core/Contracts";

export enum IDeploymentCancelProgressState {
    DialogNotShown = 0,
    Initial,
    InProgress,
    Error
}

export class DeploymentCancelActions extends ActionBase.ActionsHubBase {
    public static getKey(): string {
        return ReleaseProgressActionKeys.DeploymentCancel;
    }

    public initialize(instanceId: string): void {
        this._updateCancelState = new ActionBase.Action<string>();
        this._updateDialogProgressState = new ActionBase.Action<IDeploymentCancelProgressState>();
    }

    public get updateDialogProgressState(): ActionBase.Action<IDeploymentCancelProgressState> {
        return this._updateDialogProgressState;
    }

    public get updateCancelState(): ActionBase.Action<string> {
        return this._updateCancelState;
    }

    private _updateDialogProgressState: ActionBase.Action<IDeploymentCancelProgressState>;
    private _updateCancelState: ActionBase.Action<string>;
}