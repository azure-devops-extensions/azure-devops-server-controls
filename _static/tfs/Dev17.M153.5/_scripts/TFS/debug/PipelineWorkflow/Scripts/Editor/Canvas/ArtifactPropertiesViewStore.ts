import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { StoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { PipelineArtifactDefinition, PipelineArtifactDefinitionConstants } from "PipelineWorkflow/Scripts/Common/Types";

export interface IArtifactPropertiesViewState extends IStoreState {

    alias: string;

    type: string;

    id: string;

    isValid: boolean;

    isPrimary: boolean;

    sourceDefinitionUrl: string;

    isTemporary: boolean;

    isDeleting: boolean;
}

export class ArtifactPropertiesViewStore extends StoreBase {

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineCanvasArtifactPropertiesViewStore;
    }

    public initialize(artifactId: string): void {
        let artifactListStore: ArtifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._artifactStore = artifactListStore.getArtifactById(artifactId);
        this._artifactStore.addChangedListener(this._onDataStoreChanged);
        this._state = {} as IArtifactPropertiesViewState;
        this._updateState();
    }

    public disposeInternal(): void {
        this._artifactStore.removeChangedListener(this._onDataStoreChanged);
    }

    public getState(): IArtifactPropertiesViewState {
        return this._state;
    }

    public getTemporaryArtifactInstance(): string {
        if (this._artifactStore.isTemporary()) {
            return this._artifactStore.getInstanceId();
        }
        else {
            return null;
        }
    }

    private _onDataStoreChanged = (): void => {
        this._updateState();
        this.emitChanged();
    }

    private _updateState(): void {
        let dataStoreState: PipelineArtifactDefinition = this._artifactStore.getState();
        this._state.alias = dataStoreState.alias;
        this._state.type = dataStoreState.type;
        this._state.id = this._artifactStore.getInstanceId();
        this._state.isValid = this._artifactStore.isArtifactPropertiesValid();
        this._state.isPrimary = this._artifactStore.getState().isPrimary;
        this._state.isTemporary = this._artifactStore.isTemporary();
        this._state.isDeleting = this._artifactStore.isArtifactDeleting();

        let artifactDefinitionReference = this._artifactStore.getState().definitionReference;
        if (!!artifactDefinitionReference && !!artifactDefinitionReference[PipelineArtifactDefinitionConstants.ArtifactSourceDefinitionUrl]) {
            this._state.sourceDefinitionUrl = artifactDefinitionReference[PipelineArtifactDefinitionConstants.ArtifactSourceDefinitionUrl].id;
        }
        else {
            this._state.sourceDefinitionUrl = null;
        }        
    }

    private _state: IArtifactPropertiesViewState;
    private _artifactStore: ArtifactStore;
}