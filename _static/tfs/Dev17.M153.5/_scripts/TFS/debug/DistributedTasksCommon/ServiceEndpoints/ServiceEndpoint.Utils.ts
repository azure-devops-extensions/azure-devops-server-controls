/// <reference types="jquery" />

import Contracts_FormInput = require("VSS/Common/Contracts/FormInput");
import Utils_String = require("VSS/Utils/String");
import Utils_Number = require("VSS/Utils/Number");
import VSS = require("VSS/VSS");

export module GUIDUtils {
    /**
     * Returns a GUID such as xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx.
     * @return New GUID.(UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
     * @notes This code is taken from \WebAccess\Build\Scripts\TFS.BuildvNext.WebApi.ts
     * @notes Disclaimer: This implementation uses non-cryptographic random number generator so absolute uniqueness is not guarantee.
     */
    export function newGuid(): string {
        // c.f. rfc4122 (UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
        // "Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively"
        var clockSequenceHi = (128 + Math.floor(Math.random() * 64)).toString(16);
        return oct(8) + "-" + oct(4) + "-4" + oct(3) + "-" + clockSequenceHi + oct(2) + "-" + oct(12);
    }

    /**
     * Generated non-zero octet sequences for use with GUID generation.
     *
     * @param length Length required.
     * @return Non-Zero hex sequences.
     */
    function oct(length?: number): string {
        if (!length) {
            return (Math.floor(Math.random() * 0x10)).toString(16);
        }

        var result: string = "";
        for (var i: number = 0; i < length; i++) {
            result += oct();
        }

        return result;
    }
}

export class BaseValidator {

    constructor(validation: Contracts_FormInput.InputValidation) {
        this._inputValidation = validation;
    }

    public validate(value: string): boolean {
        return true;
    }

    public getErrorMessage(): string {
        return this._errorMessage;
    }

    protected _getInputValidation(): Contracts_FormInput.InputValidation {
        return this._inputValidation;
    }

    protected _isOptionalAndEmpty(value: string) {
        var result = false;
        if ((!value || (value.trim().length == 0)) && !this._getInputValidation().isRequired) {
            result = true;
        }

        return result;
    }

    protected _errorMessage: string;
    private _inputValidation: Contracts_FormInput.InputValidation;
}

export class StringValidator extends BaseValidator {

    constructor(validation: Contracts_FormInput.InputValidation) {
        super(validation);
        if (validation.minLength !== undefined) {
            this._minLength = validation.minLength;
        }
        else {
            this._minLength = 1;
        }

        if (validation.maxLength !== undefined) {
            this._maxLength = validation.maxLength;
        }

        this._pattern = validation.pattern;
        this._patternMismatchErrorMessage = validation.patternMismatchErrorMessage;
    }

    public validate(value: string): boolean {
        var result = false;

        if (this._isOptionalAndEmpty(value)) {
            return true;
        }

        result = value !== undefined ? value.trim().length >= this._minLength && value.trim().length <= this._maxLength : false;
        if (result) {
            result = this._validatePattern(value, this._pattern);

            if (!result) {
                this._errorMessage = this._patternMismatchErrorMessage;
            }
        }

        return result;
    }

    protected _validatePattern(value: string, pattern: string) {
        var result = true;
        if (pattern) {
            var trimmedPattern = $.trim(pattern);
            var regex = new RegExp(trimmedPattern);
            result = regex.test(value);
        }

        return result;
    }

    private _maxLength: number = Math.pow(2, 31) - 1;
    private _minLength: number = 0;
    private _pattern: string;
    private _patternMismatchErrorMessage: string;
}

export class BooleanValidator extends BaseValidator {

    constructor(validation: Contracts_FormInput.InputValidation) {
        super(validation);
    }

    public validate(value: string): boolean {
        if (this._isOptionalAndEmpty(value)) {
            return true;
        }

        return Utils_String.ignoreCaseComparer(value, "true") === 0 ||
            Utils_String.ignoreCaseComparer(value, "false") === 0;
    }
}

export class NumberValidator extends BaseValidator {

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
        if (this._isOptionalAndEmpty(value)) {
            return true;
        }
        var numericValue = Utils_Number.parseLocale(value),
            isValid = false,
            integerValue = parseInt("" + numericValue, 10),
            floatValue = parseFloat("" + numericValue),
            bounds;

        if (!isNaN(numericValue) && integerValue === floatValue && isFinite(integerValue)) {

            if (integerValue >= this._minValue && integerValue <= this._maxValue) {
                isValid = true;
            }
        }

        return isValid;
    }

    private _minValue: number = -2147483647;
    private _maxValue: number = 2147483647;
}

export class GuidValidator extends StringValidator {
    private guidPatternWithoutBraces: string = "^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}$";
    private guidPatternWithBraces: string = "^\{[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}\}$";

    constructor(validation: Contracts_FormInput.InputValidation) {
        super(validation);
    }

    public validate(value: string): boolean {
        if (this._isOptionalAndEmpty(value)) {
            return true;
        }

        var guidMinLength: number = 36;

        if (!value || value.length < guidMinLength) {
            return false;
        }
        else {
            var trimmedValue = value.trim();
            if (trimmedValue.length === guidMinLength) {
                var pattern = this._getInputValidation().pattern || this.guidPatternWithoutBraces;
            }
            else {
                var pattern = this._getInputValidation().pattern || this.guidPatternWithBraces;
            }

            return this._validatePattern(value, pattern);
        }
    }
}

export class UriValidator extends StringValidator {

    constructor(validation: Contracts_FormInput.InputValidation) {
        super(validation);
    }

    public validate(value: string): boolean {
        if (this._isOptionalAndEmpty(value)) {
            return true;
        }

        if (value == undefined || value.length == 0) {
            return false;
        }
        else {
            var pattern = this._getInputValidation().pattern || "^.+://.+$";
            return this._validatePattern(value, pattern);
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("ServiceEndpoint.Utils", exports);
