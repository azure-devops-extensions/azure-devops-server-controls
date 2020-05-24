import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

export class ReleaseProgressCanvasTabActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return ReleaseProgressActionKeys.ReleaseProgressCanvasTabActions;
    }

    public initialize(instanceId: string): void {
        this._showEnvironmentsSummaryView = new ActionBase.Action<Boolean>();
    }

    public get showEnvironmentsSummaryView(): ActionBase.Action<Boolean> {
        return this._showEnvironmentsSummaryView;
    }

    private _showEnvironmentsSummaryView: ActionBase.Action<Boolean>;
}