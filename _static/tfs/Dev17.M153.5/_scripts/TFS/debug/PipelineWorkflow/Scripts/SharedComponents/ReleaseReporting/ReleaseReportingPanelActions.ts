import { Action } from "VSS/Flux/Action";
import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";
import { ReleaseReportingKeys } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Constants";

export class ReleaseReportingPanelActions extends ActionsHubBase {

    public static getKey(): string {
        return ReleaseReportingKeys.ActionHubKey_ReleaseReportingPanelActionHub;
    }

    public initialize(instanceId?: string): void {
        this._initializeContributions = new Action<Contribution[]>();
    }

    public get initializeContributions(): Action<Contribution[]> {
        return this._initializeContributions;
    }
    
    public get updateErrorMessage(): Action<string> {
        return this._updateErrorMessage;
    }

    private _initializeContributions: Action<Contribution[]>;
    private _updateErrorMessage: Action<string>;
}
