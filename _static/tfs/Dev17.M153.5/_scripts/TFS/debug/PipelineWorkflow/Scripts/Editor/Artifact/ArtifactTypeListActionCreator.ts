import * as Q from "q";

import { ActionCreatorManager } from "DistributedTaskControls/Common/Actions/ActionCreatorManager";
import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";

import {
    ArtifactTypeActions,
    IUpdateArtifactTnputPayload,
    IUpdateArtifactInputQueryPayload
} from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeActions";
import { ArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSource";
import { VSTSBuildArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/VSTSBuildArtifactSource";
import { DeployPipelineActionCreatorKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactMode } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { ArtifactTypeListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListStore";
import { ArtifactTypeStore, ISelectableArtifactType } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import { ArtifactInputBase } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import {
    PipelineArtifactTypeDefinition,
    PipelineArtifactDefinitionConstants,
    PipelineArtifact,
    PipelineArtifactSourceReference
} from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactsConstants, WellKnownRepositoryTypes, ArtifactInputState } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { IBuildDefinitionProperties } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactTypeListActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListActions";
import { ArtifactTypeActionCreator } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeActionCreator";

import * as ReleaseTypes from "ReleasePipeline/Scripts/TFS.ReleaseManagement.Types";

import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";
import * as Diag from "VSS/Diag";
import Utils_String = require("VSS/Utils/String");

export class ArtifactTypeListActionCreator extends ActionBase.ActionCreatorBase {

    public static getKey(): string {
        return DeployPipelineActionCreatorKeys.ActionCreatorKey_ArtifactTypeListActionCreator;
    }

    public initialize(instanceId?: string): void {
        this._artifactTypeListActions = ActionsHubManager.GetActionsHub<ArtifactTypeListActions>(ArtifactTypeListActions, instanceId);
        this._artifactTypeListStore = StoreManager.GetStore<ArtifactTypeListStore>(ArtifactTypeListStore, instanceId);
        this._artifactSource = ArtifactSource.instance();
        this._vstsBuildArtifactSource = VSTSBuildArtifactSource.instance();
    }

    public clearError(artifactType: string): void {
        this._artifactTypeListActions.updateError.invoke(null);
        let artifactTypeActionCreator = this._getArtifactTypeActionCreator(artifactType);
        artifactTypeActionCreator.clearError();
    }

    public changeArtifactType(artifactType: string, initialValues: IDictionaryStringTo<string>): IPromise<void> {
        this.clearError(artifactType);

        this._artifactTypeListActions.changeArtifactType.invoke(artifactType);

        let artifactId = this._artifactTypeListStore.getInstanceId();

        let artifactTypeActionCreator = this._getArtifactTypeActionCreator(artifactType);
        return artifactTypeActionCreator.initializeArtifactInput(artifactType, artifactId, initialValues);
    }

    public initializeSchemaAndInputs(artifact: PipelineArtifact, mode: ArtifactMode): IPromise<void> {
        let q = Q.defer<void>();
        this._artifactSource.getArtifactTypesDefinition().then((artifactTypeDefinition: PipelineArtifactTypeDefinition[]) => {
            artifactTypeDefinition = artifactTypeDefinition.filter((artifactDefinition: PipelineArtifactTypeDefinition) => {
                return artifactDefinition.name !== ReleaseTypes.ArtifactTypes.TeamBuildExternalId;
            });
            this._artifactTypeListActions.updateArtifactTypes.invoke(artifactTypeDefinition);

            if (mode === ArtifactMode.Add) {
                this.changeArtifactType(artifact.type, {}); //todo:lovak
            }
            else {
                this._artifactTypeListActions.changeArtifactType.invoke(artifact.type);
                let artifactTypeActionCreator = this._getArtifactTypeActionCreator(artifact.type);
                if (!artifactTypeActionCreator) {
                    artifactTypeActionCreator = this._getArtifactTypeActionCreator(ArtifactsConstants.DefaultArtifactType);
                }
                artifactTypeActionCreator.initializeArtifactInputs(artifact);
            }
            q.resolve(null);
        },
            (error) => {
                this._handleError(error);
                q.reject(error);
            });
        return q.promise;
    }

    private _getArtifactTypeActionCreator(artifactType: string): ArtifactTypeActionCreator {
        let instanceId = this._artifactTypeListStore.getArtifactTypeStoreInstanceId(artifactType);
        if (instanceId) {
            return ActionCreatorManager.GetActionCreator<ArtifactTypeActionCreator>(ArtifactTypeActionCreator, instanceId);
        } 

        return null;
    }

    private _handleError(error): void {
        let errorMessage: string = this._getErrorMessage(error);
        if (errorMessage) {
            Diag.logError(errorMessage);
            this._artifactTypeListActions.updateError.invoke(errorMessage);
        }
    }

    private _getErrorMessage(error): string {
        if (!error) {
            return null;
        }

        return error.message || error;
    }

    private _artifactTypeListActions: ArtifactTypeListActions;
    private _artifactTypeListStore: ArtifactTypeListStore;
    private _artifactSource: ArtifactSource;
    private _vstsBuildArtifactSource: VSTSBuildArtifactSource;
    private _branchAndTagsFetched: boolean = false;
    private _inputsFetched: boolean = false;
    private _updateArtifactInputValuePayload: IUpdateArtifactInputQueryPayload[];
}