import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseActionsHub } from "PipelineWorkflow/Scripts/ReleaseProgress/Release/ReleaseActionsHub";
import { ReleaseGatesActions } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseGatesActions";
import { ReleaseGatesActionsSource } from "PipelineWorkflow/Scripts/ReleaseProgress/Sources/ReleaseGatesActionsSource";
import { ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { IgnoredGate, ReleaseGates } from "ReleaseManagement/Core/Contracts";
import { ReleaseGateHelper } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseGateHelper";

import { equals } from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

export class ReleaseGatesActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.ReleaseGates;
    }

    public initialize(instanceId?: string): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseGatesActions>(ReleaseGatesActions, instanceId);
        this._releaseActionsHub = ActionsHubManager.GetActionsHub<ReleaseActionsHub>(ReleaseActionsHub);
    }

    public ignoreGate(id: number, name: string, comment: string): void {
        this._releaseActionsHub.updateErrorMessage.invoke(null);
        ReleaseGatesActionsSource.instance().ignoreGate(id, { gatesToIgnore: [name], comment: comment }).then((releaseGates: ReleaseGates) => {
            const ignoredGate: IgnoredGate = ReleaseGateHelper.getIgnoredGate(releaseGates, name);
            this._actionsHub.updateReleaseGate.invoke(ignoredGate);
        }, (error: any) => {
            this._releaseActionsHub.updateErrorMessage.invoke({ errorMessage: error.message || error, errorStatusCode: error.status });
        });
    }

    private _actionsHub: ReleaseGatesActions;
    private _releaseActionsHub: ReleaseActionsHub;
}