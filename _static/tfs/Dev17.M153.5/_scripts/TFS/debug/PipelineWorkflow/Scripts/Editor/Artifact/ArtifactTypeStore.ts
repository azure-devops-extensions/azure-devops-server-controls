/**
 * @brief ArtifactTypeDataStore
 */

import { DataStoreBase, ChangeTrackerStoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";

import { DeployPipelineStoreKeys } from "PipelineWorkflow/Scripts/Editor/Constants";
import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { ArtifactInputBase } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { ArtifactComboInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactComboInput";
import { ArtifactCheckboxInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactCheckboxInput";
import { ArtifactStringInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStringInput";
import { ArtifactNoneInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactNoneInput";
import { ArtifactTagInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTagInput";
import { ArtifactPickListInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactPickListInput";
import { ArtifactStoreUtility } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactStoreUtility";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { GitBranchInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactGitBranchInput";
import { InputDependencyManager } from "PipelineWorkflow/Scripts/Editor/Artifact/InputDependencyManager";
import * as Resources from "PipelineWorkflow/Scripts/Resources/TFS.Resources.PipelineWorkflow";
import * as  Validator from "PipelineWorkflow/Scripts/Editor/Artifact/Validator";
import {
    ArtifactTypeActions,
    IUpdateArtifactInputQueryPayload,
    IUpdateArtifactInputOptionsPayload
} from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactTypeActions";
import {
    PipelineArtifactTypeDefinition,
    PipelineArtifactDefinitionConstants,
    PipelineArtifactConstants,
    PipelineArtifactTypes
} from "PipelineWorkflow/Scripts/Common/Types";
import { ArtifactsConstants, ArtifactInputState } from "PipelineWorkflow/Scripts/Editor/Common/Constants";

import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";

export interface IArtifactTypeStoreArgs {
    artifactType: PipelineArtifactTypeDefinition;
}

export interface ISelectableArtifactType {
    artifactType: string;
    displayName: string;
    initialValues: IDictionaryStringTo<string>;
}

/**
 * @brief The store contains information about ArtifactType
 */
export class ArtifactTypeStore extends DataStoreBase {

    constructor(args: IArtifactTypeStoreArgs) {
        super();
        this._artifactType = args.artifactType;
    }

    public initialize(instanceId?: string): void {
        super.initialize(instanceId);
        this._inputState = ArtifactInputState.Uninitialized;
        this._name = this._artifactType.name;
        this._displayName = this._artifactType.displayName;
        this._inputsMap = {};
        this._inputs = [];

        this._artifactType.inputDescriptors.forEach((element: Contracts_FormInput.InputDescriptor) => {
            let input = this._createInput(element);
            this._inputs.push(input);
            this._inputsMap[element.id] = input;
        });

        this._inputDependencyManager = new InputDependencyManager(this._artifactType, this._inputs);

        // initialize visibility rule
        this._inputs.forEach(input => {
            this._inputDependencyManager.handleVisibility(input);
	        this._inputDependencyManager.handleContentVisibility(input);
        });

        this._artifactActions = ActionsHubManager.GetActionsHub<ArtifactTypeActions>(ArtifactTypeActions, instanceId);
        this._artifactActions.updateArtifactInputValue.addListener(this._handleUpdateArtifactInputValue);
        this._artifactActions.updateArtifactInput.addListener(this._handleUpdateArtifactInput);
        this._artifactActions.updateArtifactInputState.addListener(this._handleUpdateArtifactInputState);
        this._artifactActions.updateArtifactInputOptions.addListener(this._handleUpdateArtifactInputOptions);
        this._artifactActions.updateError.addListener(this._updateError);
    }

    public getArtifactType(): PipelineArtifactTypeDefinition {
        return this._artifactType;
    }

    public getInputValueQuery(input: ArtifactInputBase, updatedValue: string): Contracts_FormInput.InputValuesQuery {
        return this._inputDependencyManager.getInputValueQuery(input, updatedValue);
    }

    public isDirty(): boolean {
        // TODO
        return true;
    }

    public isValid(): boolean {
        let isValid = true;

        if (this._inputState === ArtifactInputState.Uninitialized) {
            return false;
        }
        if (this._inputState !== ArtifactInputState.Initialized) {
            return true;
        }

        if (this.containsDeletedOrUnauthorizedInputs()) {
            return true;
        }

        this._inputs.forEach((input: ArtifactInputBase) => {
            if (input.isVisible()) {
                isValid = isValid && !input.isInvalid();
            }
        });

        return isValid;
    }

    public updateVisitor(visitor: any): void {
    }

    public isArtifactIdValid(): boolean {
        let isValid: boolean = true;
        let artifactInput: ArtifactInputBase = this.getInput(PipelineArtifactDefinitionConstants.ArtifactId);
        if (artifactInput) {
            isValid = !artifactInput.isInvalid();
        }
        return isValid;
    }

    public getError(): string {
        return this._error;
    }

    public getUnauthorizedorDeletedInputsMessage(): string {
        if (this._inputState === ArtifactInputState.Initialized) {
            let invalidInputIds: string[] = [];
            let invalidInputNames: string[] = [];

            this._inputs.forEach((input: ArtifactInputBase) => {
                if (input.containsDeletedOrUnauthorizedValues() && input.isVisible()) {
                    invalidInputIds.push(input.getId());
                    invalidInputNames.push(input.getArtifactInputName());
                }
            });

            if (invalidInputIds && invalidInputIds.length > 0) {
                return Utils_String.localeFormat(Resources.ArtifactTypeDeletedOrUnauthoriedMessage, invalidInputNames.join(Resources.CommaSeparator + " "));
            }
        }

        return Utils_String.empty;
    }

    public getArtifactInvalidMessage(): string {
        let message: string = Utils_String.empty;
        if (this._inputState === ArtifactInputState.Initialized) {
            let invalidInputIds: string[] = [];
            let invalidInputNames: string[] = [];
            this._inputs.forEach((input: ArtifactInputBase) => {
                if (input.isInvalid() && ((input.getId() === PipelineArtifactDefinitionConstants.ArtifactId) || input.isVisible())) {
                    invalidInputIds.push(input.getId());
                    invalidInputNames.push(input.getArtifactInputName());
                }
            });

            if (invalidInputIds && invalidInputIds.length > 0) {
                if (invalidInputIds.indexOf(PipelineArtifactDefinitionConstants.DefinitionId) >= 0) {
                    message = Resources.ArtifactTypeFieldDeletedErrorMessage;
                } else if (invalidInputIds.indexOf(PipelineArtifactDefinitionConstants.MultipleDefinitionsId) >= 0) {
                    message = Resources.ArtifactTypeFieldDeletedErrorMessage;
                } else if (invalidInputIds.indexOf(PipelineArtifactDefinitionConstants.DefaultVersionBranchId) >= 0) {
                    message = Resources.ArtifactTypeFieldBranchDeletedErrorMessage;
                }
                if (message) {
                    message = Utils_String.localeFormat(message, invalidInputNames.join(Resources.CommaSeparator + " "));
                }
            }
        }
        return message;
    }

    public getAddArtifactInvalidMessage(): string {
        let message: string = Utils_String.empty;
        if (this._inputState === ArtifactInputState.Initialized) {
            let allInputsValid: boolean = true;
            let artifactInputInvalid: boolean = false;
            this._inputs.forEach((input: ArtifactInputBase) => {
                if (input.getId() === PipelineArtifactDefinitionConstants.ArtifactId && input.isInvalid()) {
                    artifactInputInvalid = true;
                }
                else if (input.isVisible()) {
                    allInputsValid = allInputsValid && !input.isInvalid();
                }
            });
            if (allInputsValid && artifactInputInvalid) {
                message = Utils_String.localeFormat(Resources.ArtifactTypeInvalidFieldsErrorMessage, this.getInput(PipelineArtifactDefinitionConstants.ArtifactId).getArtifactInputName());
            }
        }
        return message;
    }

    public disposeInternal(): void {
        this._artifactActions.updateArtifactInputValue.removeListener(this._handleUpdateArtifactInputValue);
        this._artifactActions.updateArtifactInput.removeListener(this._handleUpdateArtifactInput);
        this._artifactActions.updateArtifactInputState.removeListener(this._handleUpdateArtifactInputState);
        this._artifactActions.updateArtifactInputOptions.removeListener(this._handleUpdateArtifactInputOptions);
        this._artifactActions.updateError.removeListener(this._updateError);
    }

    /**
    * @brief Returns the store key
    */
    public static getKey(): string {
        return DeployPipelineStoreKeys.StoreKey_DeployPipelineArtifactTypeStoreKey;
    }

    public getInputs(): ArtifactInputBase[] {
        return this._inputs;
    }

    public getInput(id: string): ArtifactInputBase {
        return this._inputsMap[id];
    }

    public getName(): string {
        return this._name;
    }

    public getDisplayName(): string {
        return this._displayName;
    }

    public doesArtifactInputIdExistInDescriptors(): boolean {
        let artifactInputIdExists: boolean = false;
        this._artifactType.inputDescriptors.forEach((descriptor: Contracts_FormInput.InputDescriptor) => {
            if (descriptor.id === PipelineArtifactDefinitionConstants.ArtifactId) {
                artifactInputIdExists = true;
            }
        });
        return artifactInputIdExists;
    }

    public getArtifactDetailsMessage(): string {
        return this._artifactMessage;
    }

    /**
     * @brief gets the state of the input
     */
    public getInputState(): ArtifactInputState {
        return this._inputState;
    }

    public containsDeletedOrUnauthorizedInputs(): boolean {
        let inputIds: string[] = this._getDeletedOrUnauthorizedInputIds();
        return inputIds.length > 0;
    }

    public containsDeletedorUnauthoredBaseInputs(): boolean {
        let inputIds: string[] = this._getDeletedOrUnauthorizedInputIds();
        for (let id of inputIds) {
            if (id === PipelineArtifactDefinitionConstants.ProjectId ||
                ArtifactUtility.isDefinitionInput(id)) {
                return true;
            }
        }

        return false;
    }

    protected _updateArtifactInput(payload: IUpdateArtifactInputQueryPayload): void {
        if (!payload || !payload.inputChangeMetaData || !payload.inputChangeMetaData.inputId) {
            return;
        }

        if (payload.inputChangeMetaData.type !== this._name) {
            return;
        }

        let input: ArtifactInputBase = this._inputsMap[payload.inputChangeMetaData.inputId];
        if (input) {
            input.setDisplayValue(payload.inputChangeMetaData.displayValue);
            this._inputDependencyManager.handleVisibility(input);
            this._inputDependencyManager.clearDependents(input);
        }

        if (payload.inputQueryValues && payload.inputQueryValues.inputValues) {
            payload.inputQueryValues.inputValues.forEach((inputValue: Contracts_FormInput.InputValues) => {
                if (inputValue.inputId) {
                    let input: ArtifactInputBase = this._inputsMap[inputValue.inputId];
                    if (input) {
                        let isSearchCall = "name" in payload.inputQueryValues.currentValues && !!payload.inputQueryValues.currentValues["name"];
                        input.isMoreDataAvailable = isSearchCall || Utils_String.equals(payload.inputQueryValues.currentValues["callbackRequired"], "True", true);
                        input.updateValues(inputValue);
                    }

                    if (input.getId() === PipelineArtifactDefinitionConstants.ArtifactId) {
                        this._artifactMessage = this._getArtifactMessage(payload.inputQueryValues.inputValues);
                    }
                }
            });
        }

        if (input) {
            this._inputDependencyManager.handleContentVisibility(input);
        }

        this._updateTagInputPossibleValues(payload);
        this._updateGitBranch(payload);
        if (!payload.isRecursiveFetchingOn) {
            this._inputState = ArtifactInputState.Initialized;
        }
    }

    /**
    * @brief updates stores on change on artifact input
    */
    protected _handleUpdateArtifactInput = (payload: IUpdateArtifactInputQueryPayload): void => {
        this._updateArtifactInput(payload);
        this.emitChanged();
    }

    protected _setInputState(inputState: ArtifactInputState): void {
        this._inputState = inputState;
    }

    protected _updateArtifactInputValue(payload: IUpdateArtifactInputQueryPayload): void {
        if (Utils_String.ignoreCaseComparer(payload.inputChangeMetaData.type, this._name) !== 0) {
            return;
        }
        let input: ArtifactInputBase = this._inputsMap[payload.inputChangeMetaData.inputId];

        if (payload.inputQueryValues && payload.inputQueryValues.inputValues) {
            payload.inputQueryValues.inputValues.forEach((inputValue: Contracts_FormInput.InputValues) => {
                if (inputValue.inputId) {
                    let artifactInput: ArtifactInputBase = this._inputsMap[inputValue.inputId];
                    if (artifactInput) {
                        artifactInput.updateValues(inputValue);
                    }
                }
            });
        }

        if (payload.inputChangeMetaData.inputId === PipelineArtifactDefinitionConstants.ArtifactId) {
		    this._artifactMessage = this._getArtifactMessage(payload.inputQueryValues.inputValues, payload.sourceDefinitionUrl);
        }

        this._updateTagInputPossibleValues(payload);
        this._updateGitBranch(payload);

        if (input) {
            let displayValue: string;
            if (payload.inputChangeMetaData.type === PipelineArtifactTypes.Build
                && payload.inputChangeMetaData.value
                && payload.inputQueryValues
                && payload.inputQueryValues.inputValues
                && payload.inputQueryValues.inputValues[0].possibleValues
                && payload.inputQueryValues.inputValues[0].possibleValues.length > 0) {

                if (payload.inputChangeMetaData.inputId === PipelineArtifactDefinitionConstants.DefinitionId) {
                    let buildDefinitionArtifact = Utils_Array.first(payload.inputQueryValues.inputValues[0].possibleValues, (definitionArtifact: Contracts_FormInput.InputValue) => {
                        return Utils_String.localeIgnoreCaseComparer(definitionArtifact.value, payload.inputChangeMetaData.value) === 0;
                    });
                    if (buildDefinitionArtifact && buildDefinitionArtifact.displayValue) {
                        displayValue = buildDefinitionArtifact.displayValue;
                    }
                }

                if (payload.inputChangeMetaData.inputId === PipelineArtifactDefinitionConstants.MultipleDefinitionsId) {
                    let multipleDefinitionIds = payload.inputChangeMetaData.value.split(PipelineArtifactDefinitionConstants.MultipleDefinitionIdsDelimiter);
                    let multipleDefinitionsDisplayValues = multipleDefinitionIds.map((definitionId: string) => {
                                    let definitionValue = Utils_Array.first(payload.inputQueryValues.inputValues[0].possibleValues, (definitionArtifact: Contracts_FormInput.InputValue) => {
                                        return Utils_String.localeIgnoreCaseComparer(definitionArtifact.value, definitionId) === 0;
                                    });

                                    if (definitionValue) {
                                        return definitionValue.value;
                                    }

                                    return Utils_String.empty;
                                }).join(",");
                    
                    if (multipleDefinitionIds && multipleDefinitionsDisplayValues) {
                        displayValue = multipleDefinitionsDisplayValues;
                    }
                }
            }

            input.setDisplayValue(displayValue ? displayValue : payload.inputChangeMetaData.displayValue);
            let comboInput = input as ArtifactComboInput;
            if (comboInput.getInputMode() === InputMode.Combo 
                || comboInput.getInputMode() === InputMode.Tags
                || comboInput.getInputMode() === InputMode.PickList) {
                const updateValues = !comboInput.isEditable(ArtifactUtility.getArtifactInputFieldsInUniqueSourceIdentifier(this._artifactType.uniqueSourceIdentifier));
                comboInput.fixPossibleValues(updateValues);
            }

            this._inputDependencyManager.handleVisibility(input);
            this._inputDependencyManager.handleContentVisibility(input);
        }
    }

    /**
    * @brief updates stores during edit artifact initialization
    */
    protected _handleUpdateArtifactInputValue = (payloads: IUpdateArtifactInputQueryPayload[]): void => {
        if (payloads && payloads.length > 0) {
            payloads.forEach((payload: IUpdateArtifactInputQueryPayload) => {
                if (payload && payload.inputChangeMetaData) {
                    this._updateArtifactInputValue(payload);
                }
            });

            this._inputState = ArtifactInputState.Initialized;
            this.emitChanged();
        }
    }

    private _getDeletedOrUnauthorizedInputIds(): string[] {
        let inputIds: string[] = [];
        this._inputs.forEach((input: ArtifactInputBase) => {
            if (input.containsDeletedOrUnauthorizedValues() && input.isVisible()) {
                inputIds.push(input.getId());
            }
        });

        return inputIds;
    }

    private _handleUpdateArtifactInputState = (state: ArtifactInputState) => {
        this._inputState = state;
        this.emitChanged();
    }

    private _updateError = (error: string) => {
        this._error = error;
        this.emitChanged();
    }

    private _getArtifactMessage(inputValues: Contracts_FormInput.InputValues[], sourceDefinitionUrl?: string): string {
        let values: string[] = [];
        let message: string = Utils_String.empty;
        let artifactInputValues: Contracts_FormInput.InputValues;
        inputValues.forEach((inputValue) => {
            if (inputValue.inputId === PipelineArtifactDefinitionConstants.ArtifactId) {
                artifactInputValues = inputValue;
            }
        });
        if (artifactInputValues && artifactInputValues.possibleValues) {
            artifactInputValues.possibleValues.forEach((value) => {
                values.push(value.displayValue || value.value);
            });

            let definitionInput: ArtifactInputBase = this.getInput(PipelineArtifactDefinitionConstants.DefinitionId);
            let isMultiDefinitionType = this.getInput(PipelineArtifactDefinitionConstants.IsMultiDefinitionType);
            if (isMultiDefinitionType && Utils_String.equals(isMultiDefinitionType.getValue(), "true", true)) {
                definitionInput = this.getInput(PipelineArtifactDefinitionConstants.MultipleDefinitionsId);
            }
            
            let definitionName: string = Utils_String.empty;
            if (definitionInput) {
                definitionName = definitionInput.getDisplayValue();
            }
            let defaultVersionTypeInput: ArtifactInputBase = this.getInput(PipelineArtifactDefinitionConstants.DefaultVersionTypeId);
            if (defaultVersionTypeInput) {
                message = this._getArtifactDetailsMessageWithDefaultVersion(values, definitionName, defaultVersionTypeInput, sourceDefinitionUrl);
            }
            else {
                message = ArtifactStoreUtility.getArtifactDetailsMessage(values, definitionName);
            }
        }
        return message;
    }

    private _getArtifactDetailsMessageWithDefaultVersion(values: string[], definitionName: string, defaultVersionInput: ArtifactInputBase, sourceDefinitionUrl: string): string {
        let defaultVersionTypeId: string = defaultVersionInput ? defaultVersionInput.getValue() : Utils_String.empty;
        let defaultVersionBranchInput: ArtifactInputBase = this.getInput(PipelineArtifactDefinitionConstants.DefaultVersionBranchId);
        let defaultVersionTagsInput: ArtifactInputBase = this.getInput(PipelineArtifactDefinitionConstants.DefaultVersionTagsId);
        let defaultVersionSpecificInput: ArtifactInputBase = this.getInput(PipelineArtifactDefinitionConstants.DefaultVersionSpecificId);
        let defaultVersionBranch: string = this._getInputDisplayValue(defaultVersionBranchInput);
        let defaultVersionTags: string = this._getInputDisplayValue(defaultVersionTagsInput);
        let defaultVersionSpecific: string = this._getInputDisplayValue(defaultVersionSpecificInput);
        return ArtifactStoreUtility.getArtifactDetailsMessage(values, definitionName, defaultVersionTypeId, defaultVersionBranch, defaultVersionTags, defaultVersionSpecific, sourceDefinitionUrl);
    }

    private _getInputDisplayValue(input: ArtifactInputBase): string {
        let displayValue: string = Utils_String.empty;
        if (input) {
            displayValue = input.getDisplayValue();
        }
        return displayValue;
    }

    /**
    * @brief updates stores on change on artifact input
    */
    private _handleUpdateArtifactInputOptions = (payload: IUpdateArtifactInputOptionsPayload): void => {
        if (!payload || !payload.inputId) {
            return;
        }

        let input: ArtifactComboInput = this._inputsMap[payload.inputId] as ArtifactComboInput;
        if (input) {
            input.setPossibleValues(payload.options);
            if (input.getDisplayValue() !== payload.displayValue) {
                input.setDisplayValue(payload.displayValue);
                this._inputDependencyManager.handleVisibility(input);
                this._inputDependencyManager.clearDependents(input);
	            this._inputDependencyManager.handleContentVisibility(input);
            }
        }
        this.emitChanged();
    }

    private _updateTagInputPossibleValues(payload: IUpdateArtifactInputQueryPayload): void {
        let tagsInput: ArtifactTagInput = this._inputsMap[PipelineArtifactDefinitionConstants.DefaultVersionTagsId] as ArtifactTagInput;
        if (tagsInput && payload.data && payload.data[ArtifactsConstants.PossbileTagsKey]) {
            tagsInput.setTags(payload.data[ArtifactsConstants.PossbileTagsKey]);
        }
    }

    private _updateGitBranch(payload: IUpdateArtifactInputQueryPayload): void {
        let gitBranchInput: GitBranchInput = this._inputsMap[PipelineArtifactDefinitionConstants.DefaultVersionBranchId] as GitBranchInput;
        if (gitBranchInput && payload && payload.data && payload.data[ArtifactsConstants.BuildRepository]) {
            gitBranchInput.updateRepository(payload.data[ArtifactsConstants.BuildRepository]);
        }
    }

    private _createInput(inputDescriptor: Contracts_FormInput.InputDescriptor): ArtifactInputBase {
        let validator: Validator.ValidatorBase = this._getValidator(inputDescriptor.validation);
        let input: ArtifactInputBase;

        if (inputDescriptor.inputMode === Contracts_FormInput.InputMode.Combo) {
            if (Utils_String.ignoreCaseComparer(inputDescriptor.id, PipelineArtifactConstants.DefaultVersionTags) === 0) {
                input = new ArtifactTagInput(inputDescriptor, validator);
            }
            else if (Utils_String.ignoreCaseComparer(inputDescriptor.id, PipelineArtifactConstants.DefaultVersionBranch) === 0) {
                input = new GitBranchInput(inputDescriptor, validator);
            }
            else {
                input = new ArtifactComboInput(inputDescriptor, validator);
            }
        }
        else if (inputDescriptor.inputMode === Contracts_FormInput.InputMode.CheckBox) {
            input = new ArtifactCheckboxInput(inputDescriptor, validator);
        }
        else if (inputDescriptor.inputMode === Contracts_FormInput.InputMode.None) {
            if (inputDescriptor.type === "picklist") {
                input = new ArtifactPickListInput(inputDescriptor, validator);
            }
            else {
                input = new ArtifactNoneInput(inputDescriptor, validator);
            }
        }
        else {
            input = new ArtifactStringInput(inputDescriptor, validator);
        }

        return input;
    }

    private _getValidator(validation: Contracts_FormInput.InputValidation) {
        let validator: Validator.ValidatorBase;
        switch (validation.dataType) {

            case Contracts_FormInput.InputDataType.String:
                validator = new Validator.StringValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.Guid:
                validator = new Validator.GuidValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.Number:
                validator = new Validator.NumberValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.Uri:
                validator = new Validator.UriValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.Boolean:
                validator = new Validator.BooleanValidator(validation);
                break;

            case Contracts_FormInput.InputDataType.None:
            default:
                validator = new Validator.ValidatorBase(validation);
                break;
        }

        return validator;
    }

    private _name: string;
    private _displayName: string;
    private _inputs: ArtifactInputBase[] = [];
    private _inputsMap: IDictionaryStringTo<ArtifactInputBase> = {};
    private _inputDependencyManager: InputDependencyManager;
    private _artifactActions: ArtifactTypeActions;
    private _artifactMessage: string = Utils_String.empty;
    private _inputState: ArtifactInputState;
    private _error: string;
    private _artifactType: PipelineArtifactTypeDefinition;
}