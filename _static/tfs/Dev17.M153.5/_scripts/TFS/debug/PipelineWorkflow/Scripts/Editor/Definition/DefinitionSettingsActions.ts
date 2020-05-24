import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineSettings } from "PipelineWorkflow/Scripts/Common/Types";

import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

export class DefinitionSettingsActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_DefinitionSettingsActionHub;
    }

    public initialize(): void {
        this._updateMaxAndDefaultRetentionPolicy = new ActionBase.Action<PipelineSettings>();
    }

    public get updateMaxAndDefaultRetentionPolicy(): ActionBase.Action<PipelineSettings> {
        return this._updateMaxAndDefaultRetentionPolicy;
    }

    private _updateMaxAndDefaultRetentionPolicy: ActionBase.Action<PipelineSettings>;
}
