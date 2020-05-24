import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { ReleaseProgressActionKeys } from "PipelineWorkflow/Scripts/ReleaseProgress/Constants";

export interface IVisibilityPayload {
    environmentInstanceId: string;
    extensionid: string;
    isVisible: boolean;
}

export class ReleaseEnvironmentPropertiesContributionsActions extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return ReleaseProgressActionKeys.ReleaseEnvironmentPropertiesContributions;
    }

    public initialize(instanceId: string): void {
        this._updateContributions = new ActionBase.Action<Contribution[]>();
        this._updateVisibility = new ActionBase.Action<IVisibilityPayload>();
    }

    public get updateContributions(): ActionBase.Action<Contribution[]> {
        return this._updateContributions;
    }

    public get updateVisibility(): ActionBase.Action<IVisibilityPayload> {
        return this._updateVisibility;
    }

    private _updateContributions: ActionBase.Action<Contribution[]>;
    private _updateVisibility: ActionBase.Action<IVisibilityPayload>;
}