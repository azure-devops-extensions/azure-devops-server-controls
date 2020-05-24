import { ArtifactTypeStore, IArtifactTypeStoreArgs } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import { ArtifactsConstants, ArtifactInputState } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { IUpdateArtifactInputQueryPayload } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeActions";

import * as Utils_String from "VSS/Utils/String";

export class BuildArtifactTypeStore extends ArtifactTypeStore {

    constructor(args: IArtifactTypeStoreArgs) {
        super(args);
    }

    public getBuildArtifactSourceType(): string {
        return this._buildArtifactSourceType;
    }

    protected _handleUpdateArtifactInput = (payload: IUpdateArtifactInputQueryPayload): void => {
        this._updateArtifactInput(payload);
        this._updateBuildArtifactSourceType(payload);
        this.emitChanged();
    }
    
    protected _handleUpdateArtifactInputValue = (payloads: IUpdateArtifactInputQueryPayload[]): void => {
        if (payloads && payloads.length > 0) {
            payloads.forEach((payload: IUpdateArtifactInputQueryPayload) => {
                if (payload && payload.inputChangeMetaData) {
                    this._updateArtifactInputValue(payload);
                }

                this._updateBuildArtifactSourceType(payload);
            });

            this._setInputState(ArtifactInputState.Initialized);
            this.emitChanged();
        }
    }

    private _updateBuildArtifactSourceType(payload: IUpdateArtifactInputQueryPayload): void {
        if (payload && payload.data && payload.data[ArtifactsConstants.BuildArtifactSourceType]) {
            this._buildArtifactSourceType = payload.data[ArtifactsConstants.BuildArtifactSourceType];
        }
    }

    private _buildArtifactSourceType: string = Utils_String.empty;
}