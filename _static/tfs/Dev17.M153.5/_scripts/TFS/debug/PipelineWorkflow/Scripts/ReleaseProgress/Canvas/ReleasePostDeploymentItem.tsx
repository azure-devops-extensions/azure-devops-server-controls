/// <reference types="react" />
import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";

import { ReleaseIndicatorType } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleasePostDeployConditionDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePostDeployConditionDetailsView";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

export interface IReleasePostDeploymentItemArgs {
    instanceId: string;
    environmentName: string;
    sourceLocation: string;
    initialSelectedPivot?: ReleaseIndicatorType;
}

export class ReleasePostDeploymentItem implements Item {

    constructor(private _args: IReleasePostDeploymentItemArgs) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        return (
            <div>
                {
                    <ReleasePostDeployConditionDetailsView
                        instanceId={this._args.instanceId}
                        environmentName={this._args.environmentName}
                        key={this.getKey()}
                        label={Resources.EnvironmentPostDeploymentConditionsHeading}
                        sourceLocation={this._args.sourceLocation}
                        initialSelectedPivot={this._args.initialSelectedPivot} />
                }
            </div>
        );
    }

    public getKey(): string {
        return "release-environment-post-condition-" + this._args.instanceId;
    }

    public getInstanceId(): string {
        return this._args.instanceId;
    }

}