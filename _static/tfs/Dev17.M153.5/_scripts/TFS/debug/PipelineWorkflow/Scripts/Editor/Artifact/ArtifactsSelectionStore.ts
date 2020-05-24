/**
 * @brief ArtifactsSelectionStore
 */

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { AggregatorDataStoreBase } from "DistributedTaskControls/Common/Stores/AggregatorStoreBase";
import { ArtifactTypes } from "ReleaseManagement/Core/Constants";
import { IDeployPhase, DeployPhaseTypes, IMachineGroupBasedDeployPhase, IAgentBasedDeployPhase } from "DistributedTaskControls/Phase/Types";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { InputValue } from "VSS/Common/Contracts/FormInput";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { ArtifactStoreUtility } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStoreUtility";
import { ArtifactsPickerStore, IArtifactsPickerStoreArgs, IArtifactItem, IArtifactDownloadInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerStore";
import { PipelineArtifactDefinition, 
        PipelineArtifactsDownloadInput, 
        PipelineArtifactDownloadInputBase, 
        PipelineArtifact,
        PipelineBuildArtifactDownloadInput,
        PipelineJenkinsArtifactDownloadInput } from "PipelineWorkflow/Scripts/Common/Types";

import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import * as DtcTypes from "DistributedTaskControls/Phase/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as Utils_String from "VSS/Utils/String";

export interface IArtifactsDownloadInput {
    artifactsDownloadInput: PipelineArtifactsDownloadInput;
    skipArtifactsDownload: boolean;
}

export interface IArtifactInput {
    artifactSource: PipelineArtifactDefinition;
    isSelected: boolean;
    downloadInput: IArtifactDownloadInput;
}

export interface ILinkedArtifact {
    artifactDefinition: PipelineArtifact;
    artifactStoreInstanceId: string;
}

/**
 * @brief The store contains information about ArtifactsSelectionStore
 */
export class ArtifactsSelectionStore extends AggregatorDataStoreBase {

    constructor(artifactsDownloadInput: IArtifactsDownloadInput) {
        super();

        this._artifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._currentState = artifactsDownloadInput;
    }

    /**
    * @brief Returns the store key
    */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineArtifactsSelectionStoreKey;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._initializeStores();
        this._artifactListStore.addChangedListener(this._onArtifactListStoreChange);
    }

    public disposeInternal(): void {
        super.disposeInternal();

        this._artifactListStore.removeChangedListener(this._onArtifactListStoreChange);
    }

    public updateVisitor(visitor: any): void {
    }

    public getValue(): IArtifactsDownloadInput {
        let downloadInputs: PipelineArtifactDownloadInputBase[] = [];
        this.getStores().forEach((store) => {
            let artifactPickerState = (store as ArtifactsPickerStore).getValue();

            if (Utils_String.equals(artifactPickerState.artifactType, ArtifactTypes.BuildArtifactType, true)) {
                let buildDownloadInput: PipelineBuildArtifactDownloadInput = {
                    alias: artifactPickerState.artifactAlias,
                    artifactType: artifactPickerState.artifactType,
                    artifactDownloadMode: artifactPickerState.mode,
                    artifactItems: ArtifactStoreUtility.convertToArtifactDownloadInputArtifactItems(artifactPickerState.artifactItems, artifactPickerState.sourceArtifactItems)
                };
                downloadInputs.push(buildDownloadInput);

            } else if (Utils_String.equals(artifactPickerState.artifactType, ArtifactTypes.JenkinsArtifactType, true)) {
                let jenkinsDownloadInput: PipelineJenkinsArtifactDownloadInput = {
                    alias: artifactPickerState.artifactAlias,
                    artifactType: artifactPickerState.artifactType,
                    artifactDownloadMode: artifactPickerState.mode,
                    artifactItems: ArtifactStoreUtility.convertToArtifactDownloadInputArtifactItems(artifactPickerState.artifactItems, artifactPickerState.sourceArtifactItems)
                };
                downloadInputs.push(jenkinsDownloadInput);
            }
            else {
                let customDownloadInput: PipelineArtifactDownloadInputBase = {
                    alias: artifactPickerState.artifactAlias,
                    artifactType: artifactPickerState.artifactType,
                    artifactDownloadMode: artifactPickerState.mode
                };
                downloadInputs.push(customDownloadInput);
            }
        });

        if (downloadInputs.length === 0) {
            return {
                artifactsDownloadInput: null,
                skipArtifactsDownload: this._currentState.skipArtifactsDownload
            };
        }
        else {
            let artifactsDownloadInput: PipelineArtifactsDownloadInput = {
                downloadInputs: downloadInputs
            };
            
            return {
                artifactsDownloadInput: artifactsDownloadInput,
                skipArtifactsDownload: false
            };
        }
    }

    public reinitialize(newValue: IArtifactsDownloadInput): void {
        this._currentState = newValue;
        this._initializeStores();
    }
    
    private _onArtifactListStoreChange = () => {
        this._currentState = this.getValue();
        this._initializeStores();
    }

    private _initializeStores(): void {
        let storesToDelete: ArtifactsPickerStore[] = [];
        let storesToAdd: ArtifactsPickerStore[] = [];
        let storesToUpdate: ArtifactsPickerStore[] = [];

        let artifactDownloadInputList: IDictionaryStringTo<IArtifactDownloadInput> = {};
        if (this._currentState && this._currentState.artifactsDownloadInput && this._currentState.artifactsDownloadInput.downloadInputs) {
            this._currentState.artifactsDownloadInput.downloadInputs.forEach((artifactInput) => {
                let selectedArtifactItems = [];

                if (Utils_String.equals(artifactInput.artifactType, ArtifactTypes.BuildArtifactType, true)) {
                    selectedArtifactItems = ArtifactStoreUtility.convertFromArtifactDownloadInputArtifactItems((artifactInput as PipelineBuildArtifactDownloadInput).artifactItems);
                } else if (Utils_String.equals(artifactInput.artifactType, ArtifactTypes.JenkinsArtifactType, true)) {
                    selectedArtifactItems = ArtifactStoreUtility.convertFromArtifactDownloadInputArtifactItems((artifactInput as PipelineJenkinsArtifactDownloadInput).artifactItems);
                }

                artifactDownloadInputList[artifactInput.alias] = {
                    artifactAlias: artifactInput.alias,
                    artifactType: artifactInput.artifactType,
                    mode: artifactInput.artifactDownloadMode,
                    artifactItems: selectedArtifactItems || []
                };
            });
        }

        let linkedArtifactsMap: IDictionaryStringTo<ILinkedArtifact> = {};
        this._artifactListStore.getDataStoreList().forEach((artifactStore: ArtifactStore) => {
            let artifact = artifactStore.getState();
            if (artifact && artifact.alias && artifact.type) {
                let artifactStoreInstanceId = artifactStore.getInstanceId();
                let artifactPickersStoreInstanceId = this.getInstanceId() + "-artifactsPicker-" + artifactStoreInstanceId;
                linkedArtifactsMap[artifactPickersStoreInstanceId] = {
                    artifactDefinition: artifact,
                    artifactStoreInstanceId: artifactStoreInstanceId
                };
            }
        });

        let existingStoresMap: IDictionaryStringTo<ArtifactsPickerStore> = {};
        this.getDataStoreList().map((store: ArtifactsPickerStore) => {

            let existingArtifactPickersStoreInstanceId = store.getInstanceId();
            if (linkedArtifactsMap.hasOwnProperty(existingArtifactPickersStoreInstanceId)) {
                storesToUpdate.push(store);
            } else {
                storesToDelete.push(store);
            }

            existingStoresMap[existingArtifactPickersStoreInstanceId] = store;
        });

        Object.keys(linkedArtifactsMap).forEach(artifactPickersStoreInstanceId => {
            let artifactDefinition: PipelineArtifact = linkedArtifactsMap[artifactPickersStoreInstanceId].artifactDefinition;
            let artifactStoreInstanceId: string = linkedArtifactsMap[artifactPickersStoreInstanceId].artifactStoreInstanceId;

            if (!existingStoresMap.hasOwnProperty(artifactPickersStoreInstanceId)) {

                let artifactInput = artifactDownloadInputList[artifactDefinition.alias];
                if (!artifactInput) {
                    artifactInput = this._getDefaultArtifactDownloadInput(this._currentState.skipArtifactsDownload, artifactDefinition);
                }
                let store = this._createArtifactsPickerStore(artifactPickersStoreInstanceId, artifactStoreInstanceId, artifactDefinition, artifactInput);
                storesToAdd.push(store);
            }
        });
        
        storesToDelete.forEach((store: ArtifactsPickerStore) => {
            this.removeFromStoreList(store);
            StoreManager.DeleteStore<ArtifactsPickerStore>(ArtifactsPickerStore, store.getInstanceId());
        });
        
        storesToAdd.forEach((store: ArtifactsPickerStore) => {
            this.addToStoreList(store);
        });

        storesToUpdate.forEach((store: ArtifactsPickerStore) => {
            let artifactInput = artifactDownloadInputList[store.getValue().artifactAlias];
            // newly added artifacts will not have artifactDownloadInput hence checking before re-initializing store
            if (artifactInput) {
                store.reinitializeState(artifactInput.mode, artifactInput.artifactItems);
            }
        });
        
        this.emitChanged();
    }

    private _createArtifactsPickerStore(storeInstanceId: string, artifactStoreInstanceId: string, artifactDefinition: PipelineArtifact, artifactInput: IArtifactDownloadInput): ArtifactsPickerStore {
        let convertToArtifactItems: (values: InputValue[]) => IArtifactItem[];
        let supportsArtifactsInputType: boolean;
        let supportsArtifactItemsInputType: boolean;
        let selectableArtifactsMessage = Utils_String.localeFormat(Resources.CustomSelectiveArtifactsMessage, artifactInput.artifactType);
        let sourceIsNotAccessibleMessage = Utils_String.localeFormat(Resources.CustomSelectiveArtifactsMessage, artifactInput.artifactType);

        switch (artifactInput.artifactType) {
            case ArtifactTypes.BuildArtifactType:
                convertToArtifactItems = this._convertBuildArtifacts;
                supportsArtifactsInputType = true;
                supportsArtifactItemsInputType = true;
                selectableArtifactsMessage = Resources.BuildSelectiveArtifactsMessage;
                sourceIsNotAccessibleMessage = Resources.BuildArtifactsNotAccessibleMessage;
                break;
            case ArtifactTypes.JenkinsArtifactType:            
                convertToArtifactItems = this._convertJenkinsArtifacts;
                supportsArtifactsInputType = true;
                supportsArtifactItemsInputType = false;
                selectableArtifactsMessage = Resources.JenkinsSelectiveArtifactsMessage;
                sourceIsNotAccessibleMessage = Resources.JenkinsArtifactsNotAccessibleMessage;
                break;
            default:
                convertToArtifactItems = null;
                supportsArtifactsInputType = false;
                supportsArtifactItemsInputType = false;
                break;
        }

        let artifactsPickerStore = StoreManager.CreateStore<ArtifactsPickerStore, IArtifactsPickerStoreArgs>(ArtifactsPickerStore, storeInstanceId, 
                            {
                                artifactDefinition: artifactDefinition,
                                artifactStoreInstanceId: artifactStoreInstanceId,
                                convertToArtifactItems: convertToArtifactItems,
                                supportsArtifactsInputType: supportsArtifactsInputType,
                                supportsArtifactItemsInputType: supportsArtifactItemsInputType,
                                mode: artifactInput.mode,
                                artifactItems: artifactInput.artifactItems,
                                selectableArtifactsMessage: selectableArtifactsMessage,
                                sourceIsNotAccessibleMessage: sourceIsNotAccessibleMessage
                            });

        return artifactsPickerStore;
    }

    private _convertBuildArtifacts(values: InputValue[]): IArtifactItem[] {
        let retVal: IArtifactItem[] = [];
        values.forEach((value: InputValue) => {
            retVal.push({
                children: null,
                displayName: value.displayValue || value.value,
                itemPath: value.displayValue,
                isExpanded: false,
                isFolder: true,
                errorMessage: Utils_String.empty
            });
        });

        return retVal;
    }

    private _convertJenkinsArtifacts(values: InputValue[]): IArtifactItem[] {
        let retVal: IArtifactItem[] = [];
        let dict: IDictionaryStringTo<IArtifactItem> = {};

        values.forEach((value: InputValue) => {
            if (value.value) {
                let pathParts = value.value.trim().split("/");
                let pathPartslength = pathParts.length;
                if (pathPartslength > 0) {
                    let itemPath = pathParts[0];
                    if (!dict.hasOwnProperty(itemPath)) {
                        let artifactItem: IArtifactItem = {
                            itemPath: itemPath,
                            displayName: itemPath,
                            errorMessage: Utils_String.empty,
                            isFolder: pathPartslength !== 1,
                            isExpanded: false,
                            children: []
                        };
                        retVal.push(artifactItem);
                        dict[itemPath] = artifactItem;
                    }
                }

                if (pathPartslength > 1) {
                    let partsIndex: number = 1;
                    let childItemPath = pathParts[0];
                    let parentItemPath = childItemPath;
                    while (partsIndex < pathPartslength) {
                        parentItemPath = childItemPath;
                        childItemPath = childItemPath + "/" + pathParts[partsIndex];

                        if (!dict.hasOwnProperty(childItemPath)) {
                            let childItem: IArtifactItem = {
                                itemPath: childItemPath,
                                displayName: pathParts[partsIndex],
                                errorMessage: Utils_String.empty,
                                isFolder: (partsIndex !== pathPartslength - 1),
                                isExpanded: false,
                                children: []
                            };
                            dict[parentItemPath].children.push(childItem);
                            dict[childItemPath] = childItem;
                        }
                        partsIndex++;
                    }
                }
            }
        });

        // handle root level files
        retVal.forEach((artifactItem: IArtifactItem) => {
            if (artifactItem.children.length === 0) {
                artifactItem.isFolder = false;
            }
        });

        return retVal;
    }

    private _getDefaultArtifactDownloadInput(globalSkipArtifactsDownload: boolean, linkedArtifact: PipelineArtifactDefinition): IArtifactDownloadInput {
        let artifactInput: IArtifactDownloadInput = {
            artifactAlias: linkedArtifact.alias,
            artifactType: linkedArtifact.type,
            mode: globalSkipArtifactsDownload ? PipelineTypes.PipelineArtifactDownloadInputConstants.Skip : PipelineTypes.PipelineArtifactDownloadInputConstants.All,
            artifactItems: []
        };

        return artifactInput;
    }

    private _artifactListStore: ArtifactListStore;
    private _currentState: IArtifactsDownloadInput;
}