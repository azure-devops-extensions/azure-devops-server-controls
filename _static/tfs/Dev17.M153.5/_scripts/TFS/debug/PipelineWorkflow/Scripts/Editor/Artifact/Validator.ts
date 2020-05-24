/**
 * @brief Artifact Validators
 */

import * as Contracts_FormInput from "VSS/Common/Contracts/FormInput";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Number from "VSS/Utils/Number";

import { ArtifactsConstants } from "PipelineWorkflow/Scripts/Editor/Common/Constants";

/* tslint:disable: max-classes-per-file*/
export class ValidatorBase {

    constructor(validation: Contracts_FormInput.InputValidation) {
        this._inputValidation = validation;
    }

    public validate(value: string): boolean {
        return true;
    }

    protected getInputValidation(): Contracts_FormInput.InputValidation {
        return this._inputValidation;
    }

    private _inputValidation: Contracts_FormInput.InputValidation;
}

export class StringValidator extends ValidatorBase {

    constructor(validation: Contracts_FormInput.InputValidation) {
        super(validation);
        if (validation.minLength !== undefined) {
            this._minLength = validation.minLength;
        }

        if (validation.maxLength !== undefined) {
            this._maxLength = validation.maxLength;
        }

        if (validation.isRequired) {
            this._isRequired = true;
        }

        this._pattern = validation.pattern;
    }

    public validate(value: string): boolean {
        let result = false;
        result = !!value ? value.length >= this._minLength && value.length <= this._maxLength : !this._isRequired;

        if (!!value && result) {
            result = this.validatePattern(value, this._pattern);
        }

        return result;
    }

    protected validatePattern(value: string, pattern: string) {
        let result = true;
        if (pattern) {
            let trimmedPattern = pattern.trim();
            let regex = new RegExp(trimmedPattern);
            result = regex.test(value);
        }

        return result;
    }

    private _maxLength: number = 1024;
    private _minLength: number = 0;
    private _pattern: string;
    private _isRequired: boolean = false;
}

export class BooleanValidator extends ValidatorBase {

    constructor(validation: Contracts_FormInput.InputValidation) {
        super(validation);
    }

    public validate(value: string): boolean {

        return Utils_String.ignoreCaseComparer(value, "true") === 0 ||
            Utils_String.ignoreCaseComparer(value, "false") === 0;
    }
}

export class NumberValidator extends ValidatorBase {

    constructor(validation: Contracts_FormInput.InputValidation) {
        super(validation);
        if (validation.maxValue !== undefined) {
            this._maxValue = validation.maxValue;
        }

        if (validation.minValue !== undefined) {
            this._minValue = validation.minValue;
        }
    }

    public validate(value: string): boolean {
        let numericValue = Utils_Number.parseLocale(value),
            isValid = false,
            integerValue = parseInt(Utils_String.empty + numericValue, 10),
            floatValue = parseFloat(Utils_String.empty + numericValue),
            bounds;

        if (!isNaN(numericValue) && integerValue === floatValue && isFinite(integerValue)) {

            if (integerValue >= this._minValue && integerValue <= this._maxValue) {
                isValid = true;
            }
        }

        return isValid;
    }

    private _minValue: number = ArtifactsConstants.NumberMinValue;
    private _maxValue: number = ArtifactsConstants.NumberMaxValue;
}

export class GuidValidator extends StringValidator {

    constructor(validation: Contracts_FormInput.InputValidation) {
        super(validation);
    }

    public validate(value: string): boolean {

        let guidMinLength: number = 36;

        if (!value || value.length < guidMinLength) {
            return false;
        }
        else {
            let trimmedValue = value.trim();
            let pattern;
            if (trimmedValue.length === guidMinLength) {
                pattern = this.getInputValidation().pattern || ArtifactsConstants.GuidMinLengthValidationPattern;
            }
            else {
                pattern = this.getInputValidation().pattern || ArtifactsConstants.GuidValidationPattern;
            }

            return this.validatePattern(value, pattern);
        }
    }
}

export class UriValidator extends StringValidator {

    constructor(validation: Contracts_FormInput.InputValidation) {
        super(validation);
    }

    public validate(value: string): boolean {
        if (!value || value.length === 0) {
            return false;
        }
        else {
            let pattern = this.getInputValidation().pattern || ArtifactsConstants.HttpUrlValidationPattern;
            return this.validatePattern(value, pattern);
        }
    }
}
/* tslint:enable: max-classes-per-file*/
