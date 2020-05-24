import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { PipelineArtifactTypes } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactTriggerUtils } from "PipelineWorkflow/Scripts/Editor/Common/ArtifactTriggerUtils";
import { DefinitionScheduleTriggerStore } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionScheduleTriggerStore";

import { Artifact, ArtifactSourceTrigger, SourceRepoTrigger, ReleaseTriggerBase, ReleaseTriggerType } from "ReleaseManagement/Core/Contracts";

import * as ArrayUtils from "VSS/Utils/Array";

export interface IArtifactAndTrigger {
    artifactId: string;
    showTrigger: boolean;
    isTemporary: boolean;
}

export interface IArtifactsCanvasViewState extends IStoreState {
    artifactAndTriggers: IArtifactAndTrigger[];
}

export class ArtifactsCanvasViewStore extends StoreBase {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineCanvasArtifactsCanvasViewStore;
    }

    public initialize(instanceId: string): void {
        this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._releaseScheduleTriggerStore = StoreManager.GetStore<DefinitionScheduleTriggerStore>(DefinitionScheduleTriggerStore);
        this._artifactListStore.addChangedListener(this._onDataStoreChanged);
        this._releaseScheduleTriggerStore.addChangedListener(this._onReleaseScheduleTriggerStoreChanged);
        this._updateState();
    }

    public disposeInternal(): void {
        this._artifactListStore.removeChangedListener(this._onDataStoreChanged);
        this._releaseScheduleTriggerStore.removeChangedListener(this._onReleaseScheduleTriggerStoreChanged);
    }

    public getState(): IArtifactsCanvasViewState {
        return this._state;
    }

    public isValid(): boolean {
        let isValid: boolean = this._artifactListStore.isValid();

        if (this._releaseScheduleTriggerStore) {
            isValid = isValid && this._releaseScheduleTriggerStore.isValid();
        }

        return isValid;
    }

    private _initializeAndGetArtifactsAndTriggers(): IArtifactAndTrigger[] {
        let artifactAndTriggers: IArtifactAndTrigger[] = [];
        let artifactStores: ArtifactStore[] = this._artifactListStore.getStores();
        let primaryArtifactIndex: number = -1;

        if (artifactStores) {
            artifactStores.forEach((artifactStore: ArtifactStore, index: number) => {
                if (artifactStore.isPrimary()) {
                    primaryArtifactIndex = index;
                }

                artifactAndTriggers.push({
                    artifactId: artifactStore.getInstanceId(),
                    showTrigger: ArtifactTriggerUtils.isReleaseTriggerSupportedInArtifact(artifactStore.getArtifactType(), artifactStore.getArtifactTriggerConfiguration()),
                    isTemporary: false
                });
            });
        }

        this._handlePrimaryArtifact(primaryArtifactIndex, artifactAndTriggers);
        this._handleTemporaryArtifact(artifactAndTriggers);
        return artifactAndTriggers;
    }

    private _onDataStoreChanged = (): void => {
        this._updateState();
        this.emitChanged();
    }

    private _onReleaseScheduleTriggerStoreChanged = (): void => {
        this.emitChanged();
    }

    private _handlePrimaryArtifact(primaryArtifactIndex: number, artifactAndTriggers: IArtifactAndTrigger[]): void {
        if (primaryArtifactIndex > 0) {
            // swap the values
            let primaryArtifactDetails: IArtifactAndTrigger = artifactAndTriggers[primaryArtifactIndex];
            artifactAndTriggers[primaryArtifactIndex] = artifactAndTriggers[0];
            artifactAndTriggers[0] = primaryArtifactDetails;
        }
    }

    private _handleTemporaryArtifact(artifactAndTriggers: IArtifactAndTrigger[]): void {
        let instanceId = this._artifactListStore.getTemporaryArtifactInstanceId();
        for (let artifactAndTrigger of artifactAndTriggers) {
            artifactAndTrigger.isTemporary = artifactAndTrigger.artifactId === instanceId ? true : false;
        }
    }

    private _updateState(): void {
        this._state = {
            artifactAndTriggers: this._initializeAndGetArtifactsAndTriggers()
        } as IArtifactsCanvasViewState;
    }

    private _state: IArtifactsCanvasViewState;
    private _artifactListStore: ArtifactListStore;
    private _releaseScheduleTriggerStore: DefinitionScheduleTriggerStore;
}

