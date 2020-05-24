/**
 * @brief Base Store for String Artifact Input
 */

import { ValidatorBase } from "PipelineWorkflow/Scripts/Editor/Artifact/Validator";
import { ArtifactInputBase } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactInputBase";
import { ArtifactComboInput } from "PipelineWorkflow/Scripts/Editor/Artifact/ArtifactComboInput";
import { ArtifactsConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";
import { InputMode } from "PipelineWorkflow/Scripts/Editor/Common/Types";

import * as Utils_String from "VSS/Utils/String";
import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";

/**
 * @brief helper class for tagging
 */
// tslint:disable-next-line:max-classes-per-file
export class TagUtils {

    /**
     * @brief get tags from display value
     */
    public static getTags(displayValue: string): string[] {
        return displayValue ? displayValue.split(ArtifactsConstants.TagSeparator) : [];
    }


    /**
     * @brief get display value from tags
     */
    public static getDisplayValue(tags: string[]): string {
        return tags ? tags.join(ArtifactsConstants.TagSeparator) : Utils_String.empty;
    }
}

export class ArtifactTagInput extends ArtifactComboInput {

    constructor(inputDescriptor: Contracts_FormInput.InputDescriptor, validator: ValidatorBase) {
        super(inputDescriptor, validator);
    }

    public getInputMode(): InputMode {
        return InputMode.Tags;
    }

    public isInvalid(): boolean {
        return false;
    }

    /**
     * @brief sets display value
     */
    public setDisplayValue(displayValue: string): void {
        this._selectedTags = TagUtils.getTags(displayValue);
    }

    /**
     * @brief get display value
     */
    public getDisplayValue(): string {
        return this.getValue();
    }

    /**
     * @brief get value
     */
    public getValue(): string {
        return TagUtils.getDisplayValue(this._selectedTags);
    }

    /**
     * @brief set tags
     */
    public setTags(tags: string[]): void {
        if (!tags) {
            this.possibleValues = [];
            this._selectedTags = [];
            return;
        }

        this.possibleValues = [];
        tags.forEach((tag: string) => {
            this.possibleValues.push({
                Key: tag,
                Value: tag
            });
        });

        this._selectedTags = [];
    }

    public fixPossibleValues(): boolean {
        return false;
    }

    private _selectedTags: string[];
}