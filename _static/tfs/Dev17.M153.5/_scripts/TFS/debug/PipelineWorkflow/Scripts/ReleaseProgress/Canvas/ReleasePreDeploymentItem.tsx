/// <reference types="react" />
import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";

import { ReleaseIndicatorType } from "PipelineWorkflow/Scripts/ReleaseProgress/ReleaseEnvironment/ReleaseEnvironmentTypes";
import { ReleasePreDeployConditionDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleasePreDeployConditionDetailsView";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

export interface IReleasePreDeploymentItemArgs {
    instanceId: string;
    environmentName: string;
    sourceLocation: string;
    initialSelectedPivot?:  ReleaseIndicatorType;
}

export class ReleasePreDeploymentItem implements Item {

    constructor(private _args: IReleasePreDeploymentItemArgs) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        return (
            <div>
                {
                    <ReleasePreDeployConditionDetailsView
                        instanceId={this._args.instanceId}
                        environmentName={this._args.environmentName}
                        key={this.getKey()}
                        label={Resources.EnvironmentPreDeploymentConditionHeading}
                        sourceLocation={this._args.sourceLocation}
                        initialSelectedPivot={this._args.initialSelectedPivot} />
                }
            </div>
        );
    }

    public getKey(): string {
        return "release-environment-pre-condition-" + this._args.instanceId;
    }

    public getInstanceId(): string {
        return this._args.instanceId;
    }
}