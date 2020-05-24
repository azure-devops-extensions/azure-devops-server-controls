/// <reference types="react" />

import * as React from "react";

import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { Item } from "DistributedTaskControls/Common/Item";

import { ArtifactControllerView } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactControllerView";
import { ArtifactMode } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";

export interface IArtifactPropertiesItemArgs {
    instanceId: string;
    mode: ArtifactMode;
}

export class ArtifactPropertiesItem implements Item {

    constructor(private _args: IArtifactPropertiesItemArgs) {
        this._artifactStore = StoreManager.GetStore<ArtifactStore>(ArtifactStore, this._args.instanceId);
    }

    public getOverview(instanceId?: string): JSX.Element {
        return null;
    }

    public getDetails(): JSX.Element {
        if (this._artifactStore && this._artifactStore.isTemporary()) {
            return null;
        }

        return (
            <div key={this.getKey()}>
                <ArtifactControllerView {...this._args}/>
            </div>
        );
    }

    public getKey(): string {
        return "artifact-properties-" + this._args.instanceId;
    }

    private _artifactStore: ArtifactStore;
}