/// <reference types="react" />
import * as React from "react";

import { Item } from "DistributedTaskControls/Common/Item";
import {
    ApproveMultipleEnvironmentsPanel,
} from "PipelineWorkflow/Scripts/ReleaseProgress/Canvas/ApproveMultipleEnvironmentsPanel";

export class ApproveMultipleEnvironmentsPanelItem implements Item {
    constructor(private _instanceId: string) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        return (
            <ApproveMultipleEnvironmentsPanel 
                key={this.getKey()}
                instanceId={this._instanceId}/>
        );
    }

    public getKey(): string {
        return "cd-release-multiple-environment-approval-" + this._instanceId;
    }

    public getInstanceId(): string {
        return this._instanceId;
    }
}