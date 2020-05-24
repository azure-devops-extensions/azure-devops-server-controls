import { ActionsHubBase } from "DistributedTaskControls/Common/Actions/Base";

import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { ReleaseReportingKeys } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/Constants";
import { IEnvironmentDeployments } from "PipelineWorkflow/Scripts/SharedComponents/ReleaseReporting/ReleaseReportingDialog";

import { Action } from "VSS/Flux/Action";

export class ReleaseReportingActions extends ActionsHubBase {

    public static getKey(): string {
        return ReleaseReportingKeys.ActionHubKey_ReleaseReportingActionHub;
    }

    public initialize(instanceId?: string): void {
        this._initializeDefinition = new Action<PipelineDefinition>();
        this._initializeDeployments = new Action<IEnvironmentDeployments>();
        this._initializeContributions = new Action<Contribution[]>();
    }

    public get initializeDefinition(): Action<PipelineDefinition> {
        return this._initializeDefinition;
    }

    public get initializeContributions(): Action<Contribution[]> {
        return this._initializeContributions;
    }
    
        public get updateErrorMessage(): Action<string> {
        return this._updateErrorMessage;
    }

    public get initializeDeployments(): Action<IEnvironmentDeployments> {
        return this._initializeDeployments;
    }

    private _initializeDefinition: Action<PipelineDefinition>;
    private _initializeContributions: Action<Contribution[]>;
    private _updateErrorMessage: Action<string>;
    private _initializeDeployments: Action<IEnvironmentDeployments>;
}
