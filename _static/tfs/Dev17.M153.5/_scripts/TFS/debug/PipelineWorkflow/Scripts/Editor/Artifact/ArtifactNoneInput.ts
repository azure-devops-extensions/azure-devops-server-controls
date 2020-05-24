/**
 * @brief Base Store for None Artifact Input
 */

import { ValidatorBase } from "PipelineWorkflow/Scripts/Editor/Artifact/Validator";
import { ArtifactInputBase } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";

import * as Utils_String from "VSS/Utils/String";
import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";

export class ArtifactNoneInput extends ArtifactInputBase {

    public getInputMode(): InputMode {
        return InputMode.None;
    }

    public isInvalid(): boolean {
        return false;
    }

    public getValue(): string {
        return this.getDisplayValue();
    }
}