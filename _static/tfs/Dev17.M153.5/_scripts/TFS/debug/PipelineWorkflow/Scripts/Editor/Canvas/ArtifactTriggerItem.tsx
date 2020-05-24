/// <reference types="react" />

import * as React from "react";
import { ArtifactTriggerView } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTriggerView";

import { Item } from "DistributedTaskControls/Common/Item";

export class ArtifactTriggerItem implements Item {

    constructor(private _id: string) {
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {

        return (
            <div className="artifact-trigger-container" key={this.getKey()}>
                <ArtifactTriggerView
                    instanceId={this._id} />
            </div>);
    }

    public getKey(): string {
        return "artifact-trigger-" + this._id;
    }
}
