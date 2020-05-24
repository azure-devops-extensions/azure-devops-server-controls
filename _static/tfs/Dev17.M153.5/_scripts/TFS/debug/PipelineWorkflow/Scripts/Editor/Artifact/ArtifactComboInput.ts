/**
 * @brief Base Store for Combo Artifact Input
 */
import { STRING_BACKSLASH } from "DistributedTaskControls/Common/Common";

import { ValidatorBase } from "PipelineWorkflow/Scripts/Editor/Artifact/Validator";
import { ArtifactUtility } from "PipelineWorkflow/Scripts/Common/ArtifactUtility";
import { ArtifactInputBase, IKeyValuePairWithData } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { ArtifactsConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { PipelineArtifactDefinitionConstants } from "PipelineWorkflow/Scripts/Common/Types";
import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { DeployPipelineConstants } from "PipelineWorkflow/Scripts/Editor/Constants";

import {
    VisibilityHelper,
    IVisibilityRule
} from "DistributedTaskControls/Components/Task/VisibilityHelper";
import { IInputBaseState } from "DistributedTaskControls/Common/Types";

import * as Utils_String from "VSS/Utils/String";
import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";

import Types = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Types");

export class ArtifactComboInput extends ArtifactInputBase {

    constructor(inputDescriptor: Contracts_FormInput.InputDescriptor, validator: ValidatorBase) {
        super(inputDescriptor, validator);
        if (!!inputDescriptor && !!inputDescriptor.values && !!inputDescriptor.values.possibleValues && inputDescriptor.values.possibleValues.length > 0) {
            this.possibleValues = [];
            inputDescriptor.values.possibleValues.forEach((value: Contracts_FormInput.InputValue) => {
                this.possibleValues.push({
                    Key: value.value || value.displayValue,
                    Value: value.displayValue || value.value,
                    Data: value.data
                });

                this._updatePossibleValuesProperties(value);

                if (!!inputDescriptor.values.defaultValue && Utils_String.ignoreCaseComparer(inputDescriptor.values.defaultValue, value.value) === 0) {
                    this.setDisplayValue(value.displayValue || value.value);
                }
            });
        }
    }

    /**
    * updates value for comboInput
    */
    public updateValues(inputValues: Contracts_FormInput.InputValues) {
        let values: IKeyValuePairWithData[] = [];
		this.setDisplayValue(Utils_String.empty);

        if (inputValues.possibleValues && inputValues.possibleValues.length > 0) {
            if (ArtifactUtility.isDefinitionInput(inputValues.inputId)) {
                inputValues.possibleValues.forEach((value: Contracts_FormInput.InputValue) => {
                    if (!!value.data) {
                        //In case of build definition update the display value with folderPath contained in value.data
                        value.displayValue = this._getBuildDefinitionPath(value);
                    }
                });
            }
            inputValues.possibleValues.forEach((value: Contracts_FormInput.InputValue) => {
                values.push({
                    Key: value.value,
                    Value: value.displayValue ? value.displayValue : value.value,
                    Data: value.data
                });

                this._updatePossibleValuesProperties(value);

                if (!!inputValues.defaultValue && Utils_String.ignoreCaseComparer(inputValues.defaultValue, value.value) === 0) {
                    this.setDisplayValue(value.displayValue || value.value);
                }
            });
        }

        super.updateValues(inputValues);

        if (!inputValues.possibleValues || inputValues.possibleValues.length < 1) {
            this.setDisplayValue(Utils_String.empty);
            this.possibleValues = [];
            return;
        }

        let selectedIndex: number = -1;
        let selectedValue: string = Utils_String.empty;

        this.possibleValues = values;
    }

    public clear(): void {
        super.clear();
        this.possibleValues = [];
        this.filteredPossibleValues = [];
        this.possibleValuesProperties = {};
        this.contentVisibilityUpdated = false;
    }

    public getInputMode(): InputMode {
        return InputMode.Combo;
    }

    /**
    * returns selected value
    */
    public getValue(): string {
        let resultValue: string = Utils_String.empty;
        let inputValues = this.getInputValues();
        if (inputValues && inputValues.possibleValues) {
            inputValues.possibleValues.forEach((value: Contracts_FormInput.InputValue): void => {
                if (!!value.displayValue ? value.displayValue === this.getDisplayValue() : value.value === this.getDisplayValue()) {
                    resultValue = value.value;
                }
            });
        }

        if (resultValue === Utils_String.empty) {
            resultValue = this.getDisplayValue();
        }

        return resultValue;
    }

    public setContentVisibility(visibilityDefiningInputs: ArtifactInputBase[]): void {
        this._updateContentVisibility(visibilityDefiningInputs);
    }

    public getPossibleValues(): IKeyValuePairWithData[] {
        return this.contentVisibilityUpdated === true ? this.filteredPossibleValues : this.possibleValues;
    }

    public getContentVisibleRules(): IVisibilityRule[] {
        let result: IVisibilityRule[] = [];

        if (!!this.possibleValues && this.possibleValues.length > 0 && !!this.possibleValuesProperties && Object.keys(this.possibleValuesProperties).length > 0) {
            this.possibleValues.forEach((possibleValue: IKeyValuePairWithData) => {
                if (this.possibleValuesProperties.hasOwnProperty(possibleValue.Key)) {

                    let visibleRule: IVisibilityRule = VisibilityHelper.getVisibilityRule(this.possibleValuesProperties[possibleValue.Key][DeployPipelineConstants.PipelineConstant_artifactVisibleRule]);
                    if (!!visibleRule) {
                        result.push(visibleRule);
                    }
                }
            });
        }

        return result;
    }

    public setPossibleValues(possibleValues: IKeyValuePairWithData[]) {
        this.possibleValues = possibleValues;
        let input: Contracts_FormInput.InputValues = this.getInputValues();
        if (input) {
            input.possibleValues = [];
            possibleValues.forEach((value: IKeyValuePairWithData) => {
                input.possibleValues.push({
                    displayValue: value.Value,
                    value: value.Key,
                    data: value.Data
                });
            });
            super.updateValues(input);
        }       
    }

    /**
    * checks validity of combo input
    */
    public isInvalid(): boolean {
        let inputValues = this.getInputValues();
        if (inputValues &&
            inputValues.possibleValues &&
            inputValues.possibleValues.length > 0 &&
            inputValues.isLimitedToPossibleValues) {
            if (this.isValueInPossibleValues(inputValues.possibleValues)) {
                return super.isInvalid();
            }
            else {
                return true;
            }
        }
            
        return super.isInvalid();
    }

    public fixPossibleValues(updateValues: boolean): boolean {
        super.fixPossibleValues(updateValues);
        let inputValues = this.getInputValues();
        const displayValue = this.getDisplayValue();
        if (displayValue &&
            inputValues &&
            inputValues.possibleValues &&
            inputValues.isLimitedToPossibleValues) {
            if (!this.isValueInPossibleValues(inputValues.possibleValues)) {
                if (updateValues) {
                    this.possibleValues.push({
                        Key: displayValue,
                        Value: displayValue
                    });
                    inputValues.possibleValues.push({
                        data: null,
                        value: displayValue,
                        displayValue: displayValue
                    });
                }
                this.containsDeletedOrUnauthorizedValue = true;
                return true;
            }
        } else {
            this.containsDeletedOrUnauthorizedValue = false;
        }

        return false;
    }

    private _updateContentVisibility(visibilityDefiningInputs: ArtifactInputBase[]): void {
        let selectedPossibleValues: IKeyValuePairWithData[] = [];

        if (!!this.possibleValues && this.possibleValues.length > 0 && !!this.possibleValuesProperties && Object.keys(this.possibleValuesProperties).length > 0) {
            this.possibleValues.forEach((possibleValue: IKeyValuePairWithData) => {
                if (this.possibleValuesProperties.hasOwnProperty(possibleValue.Key)) {
                    let isVisible: boolean = true;

                    let visibleRule = VisibilityHelper.getVisibilityRule(this.possibleValuesProperties[possibleValue.Key][DeployPipelineConstants.PipelineConstant_artifactVisibleRule]);
                    if (!!visibleRule) {
                        this.contentVisibilityUpdated = true;

                        let convertedInputs: IInputBaseState[] = this.convertToIInputBaseState(visibilityDefiningInputs);
                        isVisible = VisibilityHelper.getVisibility(visibleRule, convertedInputs);
                    }

                    if (isVisible) {
                        selectedPossibleValues.push(possibleValue);
                    }
                }
                else {
                    selectedPossibleValues.push(possibleValue);
                }
            });

            this.filteredPossibleValues = selectedPossibleValues;
        }
    }

    private _updatePossibleValuesProperties(value: Contracts_FormInput.InputValue) {
        if (!!value && !!value.data) {
            const keys: string[] = Object.keys(value.data);
            if (!!keys) {
                if (!this.possibleValuesProperties.hasOwnProperty(value.value)) {
                    this.possibleValuesProperties[value.value] = {};
                }

                keys.forEach((key: string) => {
                    this.possibleValuesProperties[value.value][key] = value.data[key];
                });
            }
        }
    }

    protected isValueInPossibleValues(inputPossibleValues: Contracts_FormInput.InputValue[]): boolean {

        let possibleValues: string[] = [];
        inputPossibleValues.forEach((value: Contracts_FormInput.InputValue) => {
            let displayValue = value.displayValue ? value.displayValue : value.value;
            possibleValues.push(displayValue.toLowerCase());
        });

        let displayValue = this.getDisplayValue();
        displayValue = displayValue ? displayValue.toLowerCase() : displayValue;

        if (possibleValues.length > 0 &&
            possibleValues.indexOf(displayValue) >= 0) {
            return true;
        }

        return false;
    }

    private _getBuildDefinitionPath(value: Contracts_FormInput.InputValue): string {
        // The folder path begins with \ even if the folder does not exist
        // Removing the \ character in the beginning of folderPath
        let definitionfolderPath: string = value.data[ArtifactsConstants.BuildDefinitionFolderPath] ? value.data[ArtifactsConstants.BuildDefinitionFolderPath].substr(1) : Utils_String.empty;
        if (Utils_String.localeIgnoreCaseComparer(definitionfolderPath, Utils_String.empty) === 0 || 
            Utils_String.localeIgnoreCaseComparer(definitionfolderPath, Utils_String.empty) !== 0 && Utils_String.startsWith(value.displayValue, definitionfolderPath, Utils_String.localeIgnoreCaseComparer)) {
            return value.displayValue;
        }
        else {
            return Utils_String.localeFormat("{0}{1}{2}", definitionfolderPath, STRING_BACKSLASH, value.displayValue);
        }
    }

 
    protected possibleValues: IKeyValuePairWithData[] = [];

    private filteredPossibleValues: IKeyValuePairWithData[] = [];
    private possibleValuesProperties: IDictionaryStringTo<IDictionaryStringTo<string>> = {};
    private contentVisibilityUpdated: boolean = false;
}