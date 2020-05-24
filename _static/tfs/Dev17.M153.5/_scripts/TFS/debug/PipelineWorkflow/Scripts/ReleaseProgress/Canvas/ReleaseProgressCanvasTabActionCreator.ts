import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseProgressActionCreatorKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";
import { ReleaseProgressCanvasTabActionsHub } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTabActionsHub";

export class ReleaseProgressCanvasTabActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return ReleaseProgressActionCreatorKeys.ReleaseProgressCanvasTabActionCreator;
    }

    public initialize(): void {
        this._actionsHub = ActionsHubManager.GetActionsHub<ReleaseProgressCanvasTabActionsHub>(ReleaseProgressCanvasTabActionsHub);
    }


    public showEnvironmentsSummaryView(showEnvironmentsSummaryView: boolean): void {
        this._actionsHub.showEnvironmentsSummaryView.invoke(showEnvironmentsSummaryView);
    }

    private _actionsHub: ReleaseProgressCanvasTabActionsHub;
}