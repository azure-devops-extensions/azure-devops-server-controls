import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ManualIntervention } from "ReleaseManagement/Core/Contracts";

export class ReleaseManualInterventionActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return ReleaseProgressActionKeys.ReleaseManualIntervention;
    }

    public initialize(instanceId: string): void {
        this._updateComment = new ActionBase.Action<string>();
        this._setIsRejectInProgress = new ActionBase.Action<boolean>();
        this._setIsResumeInProgress = new ActionBase.Action<boolean>();
        this._updateManualIntervention = new ActionBase.Action<ManualIntervention>();
        this._setErrorMessage = new ActionBase.Action<string>();
    }

    public get updateComment(): ActionBase.Action<string> {
        return this._updateComment;
    }

    public get setIsRejectInProgress(): ActionBase.Action<boolean> {
        return this._setIsRejectInProgress;
    }

    public get setIsResumeInProgress(): ActionBase.Action<boolean> {
        return this._setIsResumeInProgress;
    }

    public get updateManualIntervention(): ActionBase.Action<ManualIntervention> {
        return this._updateManualIntervention;
    }

    public get setErrorMessage(): ActionBase.Action<string> {
        return this._setErrorMessage;
    }

    private _updateComment: ActionBase.Action<string>;
    private _setIsRejectInProgress: ActionBase.Action<boolean>;
    private _setIsResumeInProgress: ActionBase.Action<boolean>;
    private _updateManualIntervention: ActionBase.Action<ManualIntervention>;
    private _setErrorMessage: ActionBase.Action<string>;
}