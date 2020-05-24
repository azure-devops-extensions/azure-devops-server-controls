import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ActionsBase } from "DistributedTaskControls/Variables/Common/Actions/ActionsBase";
import { IgnoredGate } from "ReleaseManagement/Core/Contracts";

export class ReleaseGatesActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return ReleaseProgressActionKeys.ReleaseGates;
    }

    public initialize(instanceId: string): void {
        this._updateReleaseGate = new ActionBase.Action<IgnoredGate>();
    }

    public get updateReleaseGate(): ActionBase.Action<IgnoredGate> {
        return this._updateReleaseGate;
    }

    private _updateReleaseGate: ActionBase.Action<IgnoredGate>;
}