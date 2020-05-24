/**
 * @brief ArtifactsPickerStore
 */

import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { PipelineArtifactDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactSource } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactSource";
import { ArtifactsPickerActions } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactsPickerActions";
import { ArtifactSourceReference } from "ReleaseManagement/Core/Contracts";
import { ArtifactStoreUtility } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStoreUtility";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { InputValue, InputValues, InputValuesQuery } from "VSS/Common/Contracts/FormInput";

import * as PipelineTypes from "PipelineWorkflow/Scripts/Common/Types";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Diag from "VSS/Diag";

export interface IArtifactsPickerStoreArgs {
    artifactDefinition: PipelineArtifactDefinition;
    artifactStoreInstanceId: string;
    supportsArtifactsInputType: boolean;
    supportsArtifactItemsInputType: boolean;
    sourceIsNotAccessibleMessage: string;
    selectableArtifactsMessage: string;

    mode: string;
    artifactItems: string[];

    convertToArtifactItems: (values: InputValue[]) => IArtifactItem[];
}

export interface IArtifactItem {
    itemPath: string;
    displayName: string;
    isFolder: boolean;
    isExpanded: boolean;
    children: IArtifactItem[];
    errorMessage: string;
}

export interface IArtifactDownloadInput {
    artifactAlias: string;
    artifactType: string;
    mode: string;
    artifactItems: string[];
}

export interface IArtifactsPickerState extends IArtifactDownloadInput {
    isSourceNotAccessible: boolean;
    sourceIsNotAccessibleMessage: string;
    sourceArtifactItemsInitialized: boolean;
    sourceArtifactItems: IArtifactItem[];
    
    selectableArtifactsMessage: string;
    iconClass: string;
    defaultVersion: string;
    artifactsCountLabel: string;

    isExpanded: boolean;
}

export interface IArtifactsPickerPayload {
    mode: string;
    artifactItems: string[];
}

export class ArtifactsPickerStore extends DataStoreBase {

    constructor(args: IArtifactsPickerStoreArgs) {
        super();
        
        this._supportsArtifactsInputType = args.supportsArtifactsInputType;
        this._supportsArtifactItemsInputType = args.supportsArtifactItemsInputType;
        this._sourceIsNotAccessible = false;
        this._sourceArtifactItemsInitialized = !args.supportsArtifactsInputType;
        this._selectableArtifactsMessage = args.selectableArtifactsMessage;
        this._sourceIsNotAccessibleMessage = args.sourceIsNotAccessibleMessage;
        this._isExpanded = false;
        this._convertToArtifactItems = args.convertToArtifactItems;

        this._artifactStore = StoreManager.GetStore<ArtifactStore>(ArtifactStore, args.artifactStoreInstanceId);
        this._initializeArtifactDefinition(args.artifactDefinition);
        this._initializeState(args.mode, args.artifactItems);
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);

        this._artifactStore.addChangedListener(this._onArtifactStoreChange);

        this._actionsHub = ActionsHubManager.GetActionsHub<ArtifactsPickerActions>(ArtifactsPickerActions, instanceId);
        this._actionsHub.selectArtifactList.addListener(this._selectArtifactList);
        this._actionsHub.selectArtifact.addListener(this._selectArtifact);
        this._actionsHub.unSelectArtifact.addListener(this._unSelectArtifact);
        this._actionsHub.setSelectAll.addListener(this._setSelectAll);
        this._actionsHub.toggleArtifact.addListener(this._toggleArtifact);
        this._actionsHub.toggleArtifactItem.addListener(this._toggleArtifactItem);
    }

    public disposeInternal(): void {
        if (this._artifactStore) {
            this._artifactStore.removeChangedListener(this._onArtifactStoreChange);
        }

        if (this._actionsHub) {
            this._actionsHub.toggleArtifactItem.removeListener(this._toggleArtifactItem);
            this._actionsHub.toggleArtifact.removeListener(this._toggleArtifact);
            this._actionsHub.setSelectAll.removeListener(this._setSelectAll);
            this._actionsHub.unSelectArtifact.removeListener(this._unSelectArtifact);
            this._actionsHub.selectArtifact.removeListener(this._selectArtifact);
            this._actionsHub.selectArtifactList.removeListener(this._selectArtifactList);
        }
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineArtifactsPickerStoreKey;
    }

    public isDirty(): boolean {
        if (!this._currentState || !this._originalState) {
            return false;
        }

        if (!Utils_String.equals(this._currentState.mode, this._originalState.mode)) {
            return true;
        }

        if (!Utils_Array.arrayEquals(this._currentState.artifactItems, this._originalState.artifactItems, 
            (a, b) => Utils_String.localeIgnoreCaseComparer(a, b) === 0)) {
            return true;
        }

        return false;
    }

    public isValid(): boolean {
        return true;
    }

    public updateVisitor(visitor: any): void {
    }

    public getValue(): IArtifactsPickerState {
        return {
            artifactAlias: this._artifactDefinition.alias,
            artifactType: this._artifactDefinition.type,
            artifactItems: this._currentState.artifactItems,
            mode: this._currentState.mode,
            isSourceNotAccessible: this._sourceIsNotAccessible,
            sourceArtifactItemsInitialized: this._sourceArtifactItemsInitialized,
            sourceIsNotAccessibleMessage: this._sourceIsNotAccessibleMessage,
            sourceArtifactItems: this._getSourceArtifactItems(),
            selectableArtifactsMessage: this._selectableArtifactsMessage,
            iconClass: this._iconClass,
            defaultVersion: this._defaultVersion,
            artifactsCountLabel: this._getArtifactsCountLabel(),
            isExpanded: this._isExpanded
        };
    }

    private _initializeState(mode: string, artifactItems: string[]): void {
        let state: IArtifactDownloadInput = {
            artifactAlias: this._artifactDefinition.alias,
            artifactType: this._artifactDefinition.type,
            mode: mode,
            artifactItems: artifactItems || []
        };

        this._currentState = JQueryWrapper.extendDeep({}, state);
        this._originalState = JQueryWrapper.extendDeep({}, state);
    }

    public reinitializeState(mode: string, artifactItems: string[]): void {
        this._initializeState(mode, artifactItems);
    }

    private _toggleArtifact = (): void => {
        this._isExpanded = !this._isExpanded;
        this.emitChanged();
    }

    private _toggleArtifactItem = (artifactItem: IArtifactItem): void => {
        artifactItem.isExpanded = !artifactItem.isExpanded;
        
        if (artifactItem.children
            || !artifactItem.isFolder 
            || !artifactItem.isExpanded
            || !this._supportsArtifactItemsInputType) {
            this.emitChanged();
        } else {
            this._getArtifactItemChildren(artifactItem);
        }
    }
    
    private _setSelectAll = (newValue: boolean): void => {
        if (newValue) {
            this._currentState.mode = PipelineTypes.PipelineArtifactDownloadInputConstants.All;
        } else {
            this._currentState.mode = PipelineTypes.PipelineArtifactDownloadInputConstants.Skip;
        }
        this._currentState.artifactItems = [];

        this.emitChanged();
    }

    private _selectArtifactList = (newValue: string): void => {
        if (newValue) {
            this._currentState.mode = PipelineTypes.PipelineArtifactDownloadInputConstants.Selective;
            this._currentState.artifactItems = newValue.split(";");
        } else {
            this._currentState.mode = PipelineTypes.PipelineArtifactDownloadInputConstants.Skip;
            this._currentState.artifactItems = [];
        }

        this.emitChanged();
    }

    private _selectArtifact = (artifactName: string): void => {
        this._currentState.mode = PipelineTypes.PipelineArtifactDownloadInputConstants.Selective;
        if (!Utils_Array.contains(this._currentState.artifactItems, artifactName)) {
            this._currentState.artifactItems.push(artifactName);
        }

        this.emitChanged();
    }

    private _unSelectArtifact = (artifactName: string): void => {
        if (Utils_String.equals(PipelineTypes.PipelineArtifactDownloadInputConstants.All, this._currentState.mode)) {
            this._getSourceArtifactItems().forEach((artifactItem: IArtifactItem) => {
                if (!Utils_String.equals(artifactName, artifactItem.itemPath)) {
                    this._currentState.artifactItems.push(artifactItem.itemPath);
                }
            });
        } else {
            Utils_Array.remove(this._currentState.artifactItems, artifactName);
        }

        if (this._currentState.artifactItems.length === 0) {
            this._currentState.mode = PipelineTypes.PipelineArtifactDownloadInputConstants.Skip;
        } else {
            this._currentState.mode = PipelineTypes.PipelineArtifactDownloadInputConstants.Selective;
        }

        this.emitChanged();
    }

    private _getArtifactsCountLabel(): string {
        if (Utils_String.equals(PipelineTypes.PipelineArtifactDownloadInputConstants.All, this._currentState.mode, true)) {
            return Resources.SelectedAllArtifactsText;
        }

        if (Utils_String.equals(PipelineTypes.PipelineArtifactDownloadInputConstants.Skip, this._currentState.mode, true)) {
            return Resources.NoneText;
        }

        if (!this._sourceIsNotAccessible && this._sourceArtifactItemsInitialized && this._supportsArtifactsInputType) {
            return Utils_String.localeFormat(Resources.SelectedArtifactsTotalCountText, this._currentState.artifactItems.length, this._sourceArtifactItems.length);
        } else {
            return Utils_String.localeFormat(Resources.SelectedArtifactsCountText, this._currentState.artifactItems.length);
        }
    }

    private _getSourceArtifactItems(): IArtifactItem[] {
        return this._sourceArtifactItemsInitialized ? this._sourceArtifactItems : [];
    }

    private _onArtifactStoreChange = () => {
        this._initializeArtifactDefinition(this._artifactStore.getState());
        
        this.emitChanged();
    }

    private _initializeArtifactDefinition(artifactDefinition: PipelineArtifactDefinition): void {
        this._artifactDefinition = JQueryWrapper.extendDeep({}, artifactDefinition) as PipelineArtifactDefinition;
        this._iconClass = ArtifactUtility.getArtifactBowtieIcon(this._artifactDefinition.type);
        this._defaultVersion = ArtifactStoreUtility.getArtifactDefaultVersion(this._artifactDefinition);
        this._getArtifactItemsFromLatestSource();
    }

    private _getArtifactSourceReferenceValue(definitionReference: IDictionaryStringTo<ArtifactSourceReference>, key: string): string {
        if (definitionReference && definitionReference.hasOwnProperty(key) && definitionReference[key] && definitionReference[key].id) {
            return definitionReference[key].id;
        }

        return Utils_String.empty;
    }

    private _getArtifactItemsFromLatestSource(): void {
        this._sourceArtifactItemsInitialized = !this._supportsArtifactsInputType;
        this._sourceArtifactItems = [];
        if (this._sourceArtifactItemsInitialized) {
            return;
        }

        this._sourceIsNotAccessible = false;
        let dictionary: IDictionaryStringTo<string> = {};
        
        Object.keys(this._artifactDefinition.definitionReference).forEach(key => {
            dictionary[key] = this._getArtifactSourceReferenceValue(this._artifactDefinition.definitionReference, key);
        });
        
        let inputValues: InputValues[] = [];
        inputValues.push({ inputId: ArtifactSource.artifactsDataSourceType } as InputValues);

        let query: InputValuesQuery = {
             currentValues: dictionary,
             inputValues: inputValues,
             resource: this._artifactDefinition.type
        };

        let inputValuesPromise = <Q.Promise<InputValuesQuery>>ArtifactSource.instance().postInputValuesQuery(query);
        inputValuesPromise.then((query: InputValuesQuery) => {
            query.inputValues.forEach((entry: InputValues) => {
                if (entry) {
                    if (entry.error && entry.error.message) {
                        this._sourceIsNotAccessible = true;
                        Diag.logWarning(Utils_String.localeFormat("Artifact source {0} not accessible. Error {1}", this._artifactDefinition.alias, entry.error.message));
                    } 
                    else {
                        if (!entry.possibleValues || entry.possibleValues.length === 0) {
                            this._sourceIsNotAccessible = true;
                            Diag.logWarning(Utils_String.localeFormat("Artifact source {0} not accessible. Error {1}", this._artifactDefinition.alias, "zero possible values returned"));
                        } else {
                            this._sourceArtifactItems = this._convertToArtifactItems(entry.possibleValues);
                        }
                    }
                }
            });
        }, 
        (error) => {
            this._sourceIsNotAccessible = true;
            Diag.logWarning(Utils_String.localeFormat("Artifact source {0} not accessible. Error {1}", this._artifactDefinition.alias, error));

        }).fin(() => {
            this._sourceArtifactItemsInitialized = true;
            this.emitChanged();
        });
    }

    private _getArtifactItemChildren(artifactItem: IArtifactItem): void {
        let dictionary: IDictionaryStringTo<string> = {};
        
        Object.keys(this._artifactDefinition.definitionReference).forEach(key => {
            dictionary[key] = this._getArtifactSourceReferenceValue(this._artifactDefinition.definitionReference, key);
        });
        dictionary["itemPath"] = artifactItem.itemPath;
        let inputValues: InputValues[] = [];
        inputValues.push({ inputId: ArtifactSource.artifactItemsDataSourceType } as InputValues);

        let query: InputValuesQuery = {
            currentValues: dictionary,
            inputValues: inputValues,
            resource: this._artifactDefinition.type
        };

        let inputValuesPromise = <Q.Promise<InputValuesQuery>>ArtifactSource.instance().postInputValuesQuery(query);
        inputValuesPromise.then((output: InputValuesQuery) => {
            output.inputValues.forEach((entry: InputValues) => {
                if (entry) {
                    if (entry.error && entry.error.message) {
                        Diag.logWarning(Utils_String.localeFormat("Artifact source {0} not accessible. Error {1}", artifactItem.itemPath, entry.error.message));
                        artifactItem.errorMessage = Resources.ArtifactSourceIsNotAccessibleText;
                        artifactItem.children = [];
                    } 
                    else {
                        artifactItem.children = [];
                        if (entry.possibleValues) {
                            entry.possibleValues.forEach((value: InputValue) => {
                                if (Utils_String.ignoreCaseComparer(value.value, artifactItem.itemPath) !== 0) {
                                    artifactItem.children.push({
                                        itemPath: value.value,
                                        displayName: value.displayValue || value.value,
                                        isFolder: (Utils_String.ignoreCaseComparer(value.data.itemType, "Folder") === 0),
                                        isExpanded: false,
                                        children: null,
                                        errorMessage: Utils_String.empty
                                    });
                                }
                            });
                        }
                    }
                }
            });
        }, 
        (error) => {
            Diag.logWarning(Utils_String.localeFormat("Artifact source {0} not accessible. Error {1}", artifactItem.itemPath, error));
            artifactItem.errorMessage = Resources.ArtifactSourceIsNotAccessibleText;
            artifactItem.children = [];

        }).fin(() => {
            this.emitChanged();
        });
    }

    private _artifactDefinition: PipelineArtifactDefinition;
    private _supportsArtifactsInputType: boolean;
    private _supportsArtifactItemsInputType: boolean;
    private _sourceIsNotAccessible: boolean;
    private _sourceArtifactItems: IArtifactItem[];
    private _sourceArtifactItemsInitialized: boolean;
    private _selectableArtifactsMessage: string;
    private _sourceIsNotAccessibleMessage: string;
    private _iconClass: string;
    private _defaultVersion: string;
    private _isExpanded: boolean;
    private _convertToArtifactItems: (values: InputValue[]) => IArtifactItem[];
    private _artifactStore: ArtifactStore;
 
    private _actionsHub: ArtifactsPickerActions;
    private _currentState: IArtifactDownloadInput;
    private _originalState: IArtifactDownloadInput;
}