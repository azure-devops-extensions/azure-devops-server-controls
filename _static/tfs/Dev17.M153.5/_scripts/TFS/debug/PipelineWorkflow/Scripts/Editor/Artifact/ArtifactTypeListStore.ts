/**
 * @brief ArtifactTypeListDataStore
 */

import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { ListDataStoreBase } from "DistributedTaskControls/Common/Stores/ListDataStoreBase";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { PipelineArtifactTypes, PipelineDefinition, PipelineArtifactTypeDefinition, PipelineArtifactDefinitionConstants } from "PipelineWorkflow/Scripts/Common/Types";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { ArtifactTypeListActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListActions";
import { ArtifactTypeStore, IArtifactTypeStoreArgs } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import { ISelectableArtifactType } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import { BuildArtifactTypeStore } from "PipelineWorkflow/Scripts/Editor/Artifact/BuildArtifactTypeStore";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { PipelineArtifactDefinition } from "../Common/Types";

/**
 * @brief The store contains information about ArtifactTypes
 */
export class ArtifactTypeListStore extends ListDataStoreBase<ArtifactTypeStore> {

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._artifactListActions = ActionsHubManager.GetActionsHub<ArtifactTypeListActions>(ArtifactTypeListActions, instanceId);
        this._artifactListActions.updateArtifactTypes.addListener(this._updateArtifactTypeDefinition);
        this._artifactListActions.changeArtifactType.addListener(this._handleChangeArtifactType);
        this._artifactListActions.updateError.addListener(this._updateError);
    }

    public disposeInternal(): void {
        this._artifactListActions.updateArtifactTypes.removeListener(this._updateArtifactTypeDefinition);
        this._artifactListActions.changeArtifactType.removeListener(this._handleChangeArtifactType);
        this._artifactListActions.updateError.removeListener(this._updateError);
        super.disposeInternal();
    }

    /**
     * @brief Returns the store key
     */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineArtifactTypesStoreKey;
    }

    public updateVisitor(visitor: PipelineDefinition) {
        //No implementation is required here.
    }

    public getSelectedArtifactTypeStore(): ArtifactTypeStore {
        return this._selectedArtifactType ? this._artifactsMap[this._selectedArtifactType] : null;
    }

    public getArtifactTypeDataStore(name: string): ArtifactTypeStore {
        return this._artifactsMap[name];
    }

    public getSelectedArtifactType(): string {
        return this._selectedArtifactType;
    }

	public getSelectedArtifactEndpointTypeId(): string {
		return this._selectedArtifactEndpointTypeId;
	}

	public getArtifactTypesList(): ISelectableArtifactType[] {
        let artifactTypes: ISelectableArtifactType[] = [];
        let multiDefinitionArtifactTypes: ISelectableArtifactType[] = [];

        if (this._artifactTypeDefinition) {
            this._artifactTypeDefinition.forEach((artifact) => {
                const artifactDisplayName = artifact.displayName || artifact.name;
                artifactTypes.push({
                    artifactType: artifact.name,
                    displayName: artifactDisplayName,
                    initialValues: {}
                });

                let multiDefinitionTypeInputIndex = Utils_Array.findIndex(artifact.inputDescriptors, (descriptor) => Utils_String.equals(descriptor.id, PipelineArtifactDefinitionConstants.IsMultiDefinitionType, true));
                if (multiDefinitionTypeInputIndex >= 0) {
                    let multiDefinitionArtifactType = {
                        artifactType: artifact.name,
                        displayName: Utils_String.localeFormat(Resources.MultiArtifactTypeDisplayNameFormat, artifactDisplayName),
                        initialValues: {}
                    };
                    multiDefinitionArtifactType.initialValues[PipelineArtifactDefinitionConstants.IsMultiDefinitionType] = true;
                    multiDefinitionArtifactTypes.push(multiDefinitionArtifactType);
                }
            });
        }

        // show multi artifact types at the end
        if (FeatureFlagUtils.areArtifactMultiDefinitionTypesEnabled()) {
            multiDefinitionArtifactTypes.forEach((multiDefinitionArtifactType: ISelectableArtifactType) => {
                artifactTypes.push(multiDefinitionArtifactType);
            });
        }
        
        return artifactTypes;
    }

    public getArtifactTypeDefinition(artifactType: string): PipelineArtifactTypeDefinition {
        let artifactTypeDefiniton: PipelineArtifactTypeDefinition = null;
        artifactTypeDefiniton = Utils_Array.first(this._artifactTypeDefinition,
            (artifactDefinition: PipelineArtifactTypeDefinition): boolean => {
                return (artifactDefinition.name === artifactType);
            });
        
        return artifactTypeDefiniton;
    }

    public getError(): string {
        let store = this.getSelectedArtifactTypeStore();
        return this._error || (store && store.getError());
    }

    public getArtifactTypeStoreInstanceId(artifactType: string): string {
        let store: ArtifactTypeStore = this.getArtifactTypeDataStore(artifactType);
        if (store) {
            return this._getArtifactTypeInstanceId(artifactType);
        }

        return null;
    }

    private _getArtifactTypeInstanceId(artifactType: string): string {
        return this.getInstanceId() + "." + artifactType;
    }

    private _updateArtifactTypeDefinition = (artifactTypeDefinition: PipelineArtifactTypeDefinition[]) => {
        this._artifactTypeDefinition = [];
        this._artifactTypeDefinition = JQueryWrapper.extendDeep(this._artifactTypeDefinition, artifactTypeDefinition);
        this._artifactsMap = {};
        this._artifactsEndpointTypeMap = {};

        if (this._artifactTypeDefinition) {
            this._selectedArtifactType = artifactTypeDefinition[0].name;
	        this._selectedArtifactEndpointTypeId = artifactTypeDefinition[0].endpointTypeId;

            let storeList: ArtifactTypeStore[] = [];
            this._artifactTypeDefinition.forEach((artifactType: PipelineArtifactTypeDefinition) => {
                let artifactTypeDataStore = this._getArtifactTypeDataStore(artifactType);
                storeList.push(artifactTypeDataStore);
                this._artifactsMap[artifactType.name] = artifactTypeDataStore;
	            this._artifactsEndpointTypeMap[artifactType.name] = artifactType.endpointTypeId;
            });

            this.initializeListDataStore(storeList);
            this.emitChanged();
        }
    }

    private _getArtifactTypeDataStore(artifactType: PipelineArtifactTypeDefinition): ArtifactTypeStore {
        let artifactTypeDataStore: ArtifactTypeStore;
        if (artifactType && Utils_String.ignoreCaseComparer(artifactType.name, PipelineArtifactTypes.Build) === 0) {
            artifactTypeDataStore = StoreManager.CreateStore<BuildArtifactTypeStore, IArtifactTypeStoreArgs>(
                BuildArtifactTypeStore, 
                this._getArtifactTypeInstanceId(artifactType.name), 
                {artifactType: artifactType});
        }
        else {                    
            artifactTypeDataStore = StoreManager.CreateStore<ArtifactTypeStore, IArtifactTypeStoreArgs>(
                ArtifactTypeStore, 
                this._getArtifactTypeInstanceId(artifactType.name), 
                {artifactType: artifactType});
        }
        
        return artifactTypeDataStore;
    }

    private _handleChangeArtifactType = (artifactType: string) => {
        if (artifactType) {
            this._selectedArtifactType = artifactType;
	        this._selectedArtifactEndpointTypeId = this._artifactsEndpointTypeMap[artifactType];
            this.emitChanged();
        }
    }

    private _updateError = (error: string) => {
        this._error = error;
        this.emitChanged();
    }

    private _artifactTypeDefinition: PipelineArtifactTypeDefinition[];
    private _artifactsMap: IDictionaryStringTo<ArtifactTypeStore> = {};
    private _artifactsEndpointTypeMap: IDictionaryStringTo<string> = {};
    private _artifactListActions: ArtifactTypeListActions;
    private _selectedArtifactType: string;
    private _selectedArtifactEndpointTypeId: string;
    private _error: string;
}