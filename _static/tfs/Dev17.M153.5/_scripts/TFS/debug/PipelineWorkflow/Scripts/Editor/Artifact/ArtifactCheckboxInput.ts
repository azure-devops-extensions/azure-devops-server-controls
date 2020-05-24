/**
 * @brief Base Store for Checkbox Artifact Input
 */

import { ValidatorBase } from "PipelineWorkflow/Scripts/Editor/Artifact/Validator";
import { ArtifactInputBase } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";

import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";

export class ArtifactCheckboxInput extends ArtifactInputBase {

    constructor(inputDescriptor: Contracts_FormInput.InputDescriptor, validator: ValidatorBase) {
        super(inputDescriptor, validator);
    }

    public getInputMode(): InputMode {
        return InputMode.CheckBox;
    }

    public getValue(): string {
        return this.getDisplayValue();
    }
}