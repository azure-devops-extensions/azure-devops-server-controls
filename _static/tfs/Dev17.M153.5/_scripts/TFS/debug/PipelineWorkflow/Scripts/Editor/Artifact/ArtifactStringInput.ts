/**
 * @brief Base Store for String Artifact Input
 */

import { ValidatorBase } from "PipelineWorkflow/Scripts/Editor/Artifact/Validator";
import { ArtifactInputBase } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";

import * as Utils_String from "VSS/Utils/String";
import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";

export class ArtifactStringInput extends ArtifactInputBase {

    constructor(inputDescriptor: Contracts_FormInput.InputDescriptor, validator: ValidatorBase) {
        super(inputDescriptor, validator);
    }

    public updateValues(values: Contracts_FormInput.InputValues) {
        super.updateValues(values);
        if (values.possibleValues && values.possibleValues.length > 0) {
            let selectedValue: Contracts_FormInput.InputValue = values.possibleValues[0];
            let firstValue = selectedValue.displayValue || selectedValue.value;
            this.setDisplayValue(firstValue);
        }
        else {
            this.setDisplayValue(Utils_String.empty);
        }
    }

    public getInputMode(): InputMode {
        return InputMode.TextBox;
    }

    public getValue(): string {
        //TODO: see if displayValue and actual value could be different here.
        return this.getDisplayValue();
    }
}