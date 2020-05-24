
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { DataStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { ViewStoreBase, IStoreState } from "DistributedTaskControls/Common/Stores/Base";

import Types = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Types");

import * as CommonTypes from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactComboInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactComboInput";
import { ArtifactInputBase, IKeyValuePairWithData } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { ArtifactListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactListStore";
import { ArtifactStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStore";
import { ArtifactTypeStore, ISelectableArtifactType } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeStore";
import { ArtifactTypeListStore } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeListStore";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { GitBranchInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactGitBranchInput";
import { IUpdateDefinitionActionPayload, DefinitionActionsHub } from "PipelineWorkflow/Scripts/Editor/Definition/DefinitionActions";
import { PipelineArtifactDefinitionConstants } from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactsConstants, ArtifactInputState } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { FeatureFlagUtils } from "PipelineWorkflow/Scripts/Shared/Utils/FeatureFlagUtils";
import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";

import { MessageBarType } from "OfficeFabric/MessageBar";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IInputValues {
    name: string;
    value: string;
}

export interface IArtifactInput {
    id: string;
    name: string;
    defaultValue: string;
    description: string;
    selectedValue: string;
    inputMode: InputMode;
    isDisabled: boolean;
    allowEdit: boolean;
    type?: string;
    options?: IKeyValuePairWithData[];
    properties?: IDictionaryStringTo<string>;
    isRequired?: boolean;
    isVisible: boolean;
    initializationNeeded?: boolean;
    isLimitedToPossibleValues: boolean;
    isConnectedService: boolean;
    isSearchable?: boolean;
    isMoreDataAvailable?: boolean;
}

export interface IArtifactType {
    name: string;
    endpointTypeId: string;
    inputs: IArtifactInput[];
    alias: string;
    artifactDetailsMessage: string;
    sourceDefinitionUrl: string;
}

//state
export interface IArtifactTypesData {
    artifactTypes: ISelectableArtifactType[];
    selectedArtifactType: IArtifactType;
    inputState: ArtifactInputState;
    isPrimary: boolean;
    error?: string;
    errorType?: MessageBarType;
    isErrorDismissible?: boolean;
    warning?: string;
    isValid: boolean;
}

export class ArtifactViewStore extends ViewStoreBase {

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._artifactListDataStore = StoreManager.GetStore<ArtifactTypeListStore>(ArtifactTypeListStore, instanceId);
        let artifactListStore: ArtifactListStore = StoreManager.GetStore<ArtifactListStore>(ArtifactListStore);
        this._artifactStore = artifactListStore.getArtifactById(instanceId);
        this._initializeState();
        this._artifactListDataStore.addChangedListener(this._onDataStoreChanged);
        this._artifactStore.addChangedListener(this._onArtifactStoreChanged);
        this._onDataStoreChanged();
    }

    public disposeInternal(): void {
        this._artifactListDataStore.removeChangedListener(this._onDataStoreChanged);
        this._artifactStore.removeChangedListener(this._onArtifactStoreChanged);
    }

    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineArtifactTypeViewStoreKey;
    }

    public getState(): IArtifactTypesData {
        return this._state;
    }

    private _onArtifactStoreChanged = (): void => {
        this._state.isPrimary = this._artifactStore.getState().isPrimary;
        this._state.selectedArtifactType.alias = this._artifactStore.getAlias();
        this._state.selectedArtifactType.sourceDefinitionUrl = this._artifactStore.getSourceDefinitionUrl();
        this._state.warning = this._artifactStore.getWarningMessage();
        this._state.isValid = this._artifactStore.isValid();
        this._updateState();
        this.emitChanged();
    }

    private _onDataStoreChanged = (): void => {
        this._updateState();
        this.emitChanged();
    }

    private _updateState(): void {
        this._state.isPrimary = this._artifactStore.getState().isPrimary;
        let selectedArtifact: string = this._artifactListDataStore.getSelectedArtifactType();
        this._state.artifactTypes = this._artifactListDataStore.getArtifactTypesList();
        this._state.error = this._artifactListDataStore.getError();
        let artifactTypeDataStore: ArtifactTypeStore = this._artifactListDataStore.getArtifactTypeDataStore(selectedArtifact);
        if (artifactTypeDataStore) {
            let artifactInputs: ArtifactInputBase[] = artifactTypeDataStore.getInputs();
            this._state.selectedArtifactType.name = selectedArtifact;
            this._state.selectedArtifactType.endpointTypeId = this._artifactListDataStore.getSelectedArtifactEndpointTypeId();
            this._state.selectedArtifactType.inputs = [];
            this._state.selectedArtifactType.artifactDetailsMessage = artifactTypeDataStore.getArtifactDetailsMessage();

            let artifactInvalidMessage = Utils_String.empty;
            if (this._artifactStore.isTemporary()) {
                artifactInvalidMessage = artifactTypeDataStore.getAddArtifactInvalidMessage();
                if (artifactInvalidMessage) {
                    this._state.errorType = MessageBarType.error;
                }
            } else {
                artifactInvalidMessage = artifactTypeDataStore.getUnauthorizedorDeletedInputsMessage();
                this._state.errorType = MessageBarType.warning;
                if (!artifactInvalidMessage) {
                    artifactInvalidMessage = artifactTypeDataStore.getArtifactInvalidMessage();
                    this._state.errorType = MessageBarType.error;
                }
            }

            this._state.error = artifactInvalidMessage || this._state.error;
            this._state.isErrorDismissible = artifactInvalidMessage ? false : true;
            this._state.inputState = artifactTypeDataStore.getInputState();

            artifactInputs.forEach((input) => {
                let possibleValues: IKeyValuePairWithData[] = [];
                let properties: IDictionaryStringTo<string> = {};
                if (input.getInputMode() === InputMode.Combo
                    || input.getInputMode() === InputMode.Tags
                    || input.getInputMode() === InputMode.PickList) {
                    possibleValues = (<ArtifactComboInput>input).getPossibleValues();

                    if (input.getId() === PipelineArtifactDefinitionConstants.DefaultVersionBranchId) {
                        properties[ArtifactsConstants.BuildRepository] = (<GitBranchInput>input).getRepositoryId();
                    }
                }

                let artifactInput: IArtifactInput = {
                    id: input.getId(),
                    name: input.getArtifactInputName(),
                    defaultValue: input.getDisplayValue() || Utils_String.empty,
                    description: input.getDescription(),
                    type: input.getType(),
                    selectedValue: input.getValue(),
                    options: possibleValues,
                    properties: properties,
                    allowEdit: !input.isDefaultVersionInput(),
                    inputMode: input.getInputMode(),
                    initializationNeeded: input.hasDynamicValues() && input.isRoot(),
                    isVisible: input.isVisible(),
                    isDisabled: (!this._artifactStore.isTemporary() && !input.isEditable(this._getUneditableFieldsList())) || artifactTypeDataStore.containsDeletedorUnauthoredBaseInputs() ||
                    this._disableInputFieldsWhileLoading(),
                    isLimitedToPossibleValues: input.getIsLimitedToPossibleValues(),
                    isConnectedService: input.isConnectedService(),
                    isRequired: input.isRequired(),
                    isSearchable: input.isSearchable(),
                    isMoreDataAvailable: input.isMoreDataAvailable
                };

                this._state.selectedArtifactType.inputs.push(artifactInput);
            });
        }
    }

    private _getUneditableFieldsList(): string[] {
        let artifactType = this._artifactStore.getArtifactType();
        let definition = this._artifactListDataStore.getArtifactTypeDefinition(artifactType);
        let uniqueSourceIdentifierFields;
        if (!!definition) {
            uniqueSourceIdentifierFields = definition.uniqueSourceIdentifier;
            let uniqueSourceIdentifierFieldsInputs = ArtifactUtility.getArtifactInputFieldsInUniqueSourceIdentifier(uniqueSourceIdentifierFields);

            // always make definition identifiers as uneditable
            if (!Utils_Array.contains(uniqueSourceIdentifierFields, PipelineArtifactDefinitionConstants.DefinitionId)) {
                uniqueSourceIdentifierFieldsInputs.push(PipelineArtifactDefinitionConstants.DefinitionId);
            }
            if (!Utils_Array.contains(uniqueSourceIdentifierFields, PipelineArtifactDefinitionConstants.MultipleDefinitionsId)) {
                uniqueSourceIdentifierFieldsInputs.push(PipelineArtifactDefinitionConstants.MultipleDefinitionsId);
            }
            if (!Utils_Array.contains(uniqueSourceIdentifierFields, PipelineArtifactDefinitionConstants.IsMultiDefinitionType)) {
                uniqueSourceIdentifierFieldsInputs.push(PipelineArtifactDefinitionConstants.IsMultiDefinitionType);
            }

            let uneditableInputs = uniqueSourceIdentifierFieldsInputs;

            if (!!uniqueSourceIdentifierFieldsInputs) {
                // make a copy of uniqueSourceIdentifierFieldsInputs
                uneditableInputs = uniqueSourceIdentifierFieldsInputs.slice();
                uniqueSourceIdentifierFieldsInputs.forEach(uniqueSourceIdentifier => {
                    this._addDependentInputs(uniqueSourceIdentifier, uneditableInputs);
                });
            }

            return uneditableInputs;
        }
        
        return ArtifactUtility.getArtifactInputFieldsInUniqueSourceIdentifier("");
    }

    private _addDependentInputs(inputId: string, dependentInputsIds: string[]): void {
        let artifactType = this._artifactStore.getArtifactType();
        let definition = this._artifactListDataStore.getArtifactTypeDefinition(artifactType);

        if (!!definition) {
            let input = definition.inputDescriptors.find(element => element.id === inputId);
            if (!!input && !!input.dependencyInputIds) {
                input.dependencyInputIds.forEach(dependentInputId => {
                    if (dependentInputsIds.indexOf(dependentInputId) === -1) {
                        dependentInputsIds.push(dependentInputId);
                        this._addDependentInputs(dependentInputId, dependentInputsIds);
                    }
                });
            }
        }
    }

    private _disableInputFieldsWhileLoading(): boolean {
        return (this._areInputsLoading());
    }

    private _areInputsLoading(): boolean {
        if (this._state.inputState === ArtifactInputState.Initializing ||
            this._state.inputState === ArtifactInputState.FetchingDependencies) {
            return true;
        }
        else {
            return false;
        }
    }

    private _initializeState() {
        this._state = {
            artifactTypes: [],
            inputState: ArtifactInputState.Uninitialized,
            isPrimary: this._artifactStore.getState().isPrimary,
            selectedArtifactType: {
                name: this._artifactListDataStore.getSelectedArtifactType(),
                endpointTypeId: this._artifactListDataStore.getSelectedArtifactEndpointTypeId(),
                inputs: [],
                alias: Utils_String.empty,
                artifactDetailsMessage: Utils_String.empty,
                sourceDefinitionUrl: Utils_String.empty,
            },
            isErrorDismissible: true,
            warning: this._artifactStore.getWarningMessage(),
            isValid: this._artifactStore.isValid()
        };

        this._updateState();
    }

    private _definitionActionsHub: DefinitionActionsHub;
    private _artifactListDataStore: ArtifactTypeListStore;
    private _artifactStore: ArtifactStore;
    private _dataStore: ArtifactTypeStore;
    private _state: IArtifactTypesData;
}
