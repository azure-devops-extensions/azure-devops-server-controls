import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import { ReleaseEnvironmentPropertiesPanel } from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ReleaseEnvironmentPropertiesPanel";

export class ReleaseEnvironmentPropertiesItem implements Item {

    constructor(
        private _instanceId: string,
        private _environmentId: number,
        private _environmentDefinitionId: number,
        private _environmentName: string) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        return (
            <ReleaseEnvironmentPropertiesPanel
                key={this.getKey()}
                instanceId={this.getInstanceId()}
                environmentId={this._environmentId}
                environmentName={this._environmentName}
                environmentDefinitionId={this._environmentDefinitionId} />
        );
    }

    public getKey(): string {
        return "cd-release-environment-properties-" + this.getInstanceId();
    }

    public getInstanceId(): string {
        return this._instanceId;
    }
}
