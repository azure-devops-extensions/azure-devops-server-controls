import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { DeployPipelineActionHubKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";

export class ArtifactTypeListActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DeployPipelineActionHubKeys.ActionHubKey_ArtifactTypeListActionHub;
    }

    public initialize(): void {
        this._changeArtifactType = new ActionBase.Action<string>();
        this._updateError = new ActionBase.Action<string>();
        this._updateArtifactTypes = new ActionBase.Action<PipelineTypes.PipelineArtifactTypeDefinition[]>();
    }

    public get changeArtifactType(): ActionBase.Action<string> {
        return this._changeArtifactType;
    }

    public get updateArtifactTypes(): ActionBase.Action<PipelineTypes.PipelineArtifactTypeDefinition[]> {
        return this._updateArtifactTypes;
    }

    public get updateError(): ActionBase.Action<string> {
        return this._updateError;
    }

    private _updateError: ActionBase.Action<string>;
    private _changeArtifactType: ActionBase.Action<string>;
    private _updateArtifactTypes: ActionBase.Action<PipelineTypes.PipelineArtifactTypeDefinition[]>;
}