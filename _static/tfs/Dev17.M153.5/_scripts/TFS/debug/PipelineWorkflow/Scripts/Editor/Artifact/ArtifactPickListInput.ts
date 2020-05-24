/**
 * @brief Base Store for Combo Artifact Input
 */
import { STRING_BACKSLASH } from "DistributedTaskControls/Common/Common";

import { ValidatorBase } from "PipelineWorkflow/Scripts/Editor/Artifact/Validator";
import { ArtifactComboInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactComboInput";
import { ArtifactsConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { PipelineArtifactDefinitionConstants } from "PipelineWorkflow/Scripts/Common/Types";
import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";
import { DeployPipelineConstants } from "PipelineWorkflow/Scripts/Editor/Constants";

import {
    VisibilityHelper,
    IVisibilityRule
} from "DistributedTaskControls/Components/Task/VisibilityHelper";
import { IInputBaseState } from "DistributedTaskControls/Common/Types";

import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";

import Types = require("ReleasePipeline/Scripts/TFS.ReleaseManagement.Types");

export class ArtifactPickListInput extends ArtifactComboInput {

    public getInputMode(): InputMode {
        return InputMode.PickList;
    }

    /**
    * returns selected value
    */
    public getValue(): string {
        let resultValue: string = Utils_String.empty;
        let inputValues = this.getInputValues();
        if (inputValues && inputValues.possibleValues) {
            let multipleSelectedValues = this.getDisplayValue().split(",");
            let multipleSelectedIds = 
                                    multipleSelectedValues.map(
                                        (selectedValue) => 
                                        { 
                                            let inputValue = Utils_Array.first(inputValues.possibleValues, (possibleValue: Contracts_FormInput.InputValue) => { return possibleValue.displayValue === selectedValue; });
                                            if (inputValue) {
                                                return inputValue.value;
                                            }
                                            else {
                                                return selectedValue;
                                            }
                                        }
                                    ).join(",");

            resultValue = multipleSelectedIds;
        }

        if (resultValue === Utils_String.empty) {
            resultValue = this.getDisplayValue();
        }

        return resultValue;
    }

    protected isValueInPossibleValues(inputPossibleValues: Contracts_FormInput.InputValue[]): boolean {

        let possibleValues: string[] = [];
        inputPossibleValues.forEach((value: Contracts_FormInput.InputValue) => {
            let displayValue = value.displayValue ? value.displayValue : value.value;
            possibleValues.push(displayValue.toLowerCase());
        });

        let displayValue = this.getDisplayValue();
        displayValue = displayValue ? displayValue.toLowerCase() : displayValue;
        let multipleDisplayValues = displayValue.split(",");

        if (possibleValues.length > 0) {
            multipleDisplayValues.forEach((value) => {
                if (possibleValues.indexOf(value) < 0) {
                    return false;
                }
            });

            return true;
        }

        return false;
    }
}