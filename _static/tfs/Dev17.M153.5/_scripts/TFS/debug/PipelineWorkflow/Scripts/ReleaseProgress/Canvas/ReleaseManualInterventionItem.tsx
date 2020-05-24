/// <reference types="react" />
import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";

import { ReleaseManualInterventionDetailsView } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseManualInterventionDetailsView";
import { ActionTelemetrySource } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseProgressCanvasTelemetryHelper";

export class ReleaseManualInterventionItem implements Item {

    constructor(
        private _instanceId: string,
        private _environmentId: number,
        private _environmentName: string,
        private _hasManageDeploymentsPermissions: boolean) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        return (
            <ReleaseManualInterventionDetailsView
                instanceId={this.getInstanceId()}
                hasManageDeploymentsPermissions={this._hasManageDeploymentsPermissions}
                cssClass={"mi-dv-canvas"}
                invokedSource={ActionTelemetrySource.Canvas}
                environmentId={this._environmentId}
                environmentName={this._environmentName}
            />
        );
    }

    public getKey(): string {
        return `rel-env-mi-${this.getInstanceId()}`;
    }

    public getInstanceId(): string {
        return this._instanceId;
    }
}