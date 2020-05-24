/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Number= require("VSS/Utils/Number");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

var delegate = Utils_Core.delegate;

export interface BaseValidatorOptions {
    bindtokeystrokes?: boolean;
    invalidCssClass?: string;
    message?: string | (() => string);
    group?: string;
    allowEmptyString?: boolean;
    testEmptyString?: boolean;
}

export class BaseValidator<TOptions extends BaseValidatorOptions> extends Controls.Enhancement<TOptions> {
    public static optionsPrefix: string = "validator";
    public static EVENT_VALIDATE: string = "validate";
    public static EVENT_VALIDATE_STATUS: string = "validate-status";
    public instanceId: any;
    private _onValidationRequiredDelegate: Function;

    /**
     * @param options 
     */
    constructor(options?: TOptions) {

        super(options);

        if (this.getType() === BaseValidator) {
            throw new Error("You cannot instantiate an abstract type.");
        }

        this.instanceId = "val_" + Controls.getId();
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {
        super.initializeOptions(<TOptions>$.extend({
            invalidCssClass: "invalid",
            message: "Invalid input value!",
            group: "*",
            allowEmptyString: false
        }, options));
    }

    public initialize() {
        super.initialize();
        this._bind("change", delegate(this, this.onChanged));
        this._onValidationRequiredDelegate = delegate(this, this.onValidationRequired);
        this._bind(window.document.body, BaseValidator.EVENT_VALIDATE, this._onValidationRequiredDelegate, true);
        if (this._options.bindtokeystrokes) {
            // some controls should validate on each keystroke
            this._bind("keyup", delegate(this, this.onKeyUp));
        }
    }

    public dispose() {
        if (this._onValidationRequiredDelegate) {
            this._unbind(window.document.body, BaseValidator.EVENT_VALIDATE, this._onValidationRequiredDelegate, true);
        }
        super.dispose();
    }

    public getValue() {
        return this._element.val();
    }

    /**
     * @return 
     */
    public isValid(): boolean {

        return true;
    }

    public getValidationGroup() {
        return this._options.group;
    }

    public getMessage() {
        var message = this._options.message;
        if (message) {
            if (typeof message === "function") {
                message = (<any>message).call(this);
            }
        }

        return message;
    }

    public onKeyUp() {
        this.validate();
    }

    public onChanged() {
        this.validate();
    }

    public onValidationRequired(e? , group? ) {
        if (!group || group === "*" || group === this._options.group) {
            this.validate();
        }
    }

    public validate() {
        var valid, group;
        if (!this._disposed) {
            valid = this._testEmptyString() || this.isValid();
            group = this.getValidationGroup();

            this._element.toggleClass(this._options.invalidCssClass, !valid);
            this._fire(BaseValidator.EVENT_VALIDATE_STATUS, [this, group, valid]);
        }
    }

    private _testEmptyString() {
        return this._options.allowEmptyString && this.getValue() === "";
    }
}

VSS.initClassPrototype(BaseValidator, {
    instanceId: null
});

export class RequiredValidator<TOptions extends BaseValidatorOptions> extends BaseValidator<TOptions> {

    public static optionsPrefix: string = "requiredValidator";

    /**
     * @param options 
     */
    constructor (options?: TOptions) {

        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {

        super.initializeOptions(<TOptions>$.extend({
            message: "Input value cannot be empty!"
        }, options));
    }

    /**
     * @return 
     */
    public isValid(): boolean {

        return $.trim(this.getValue()) ? true : false;
    }
}

Controls.Enhancement.registerEnhancement(RequiredValidator, ".validate.required");

export class RangeValidator<TOptions extends BaseValidatorOptions> extends BaseValidator<TOptions> {

    public static optionsPrefix: string = "rangeValidator";

    /**
     * @param options 
     */
    constructor (options?: TOptions) {
        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {
        super.initializeOptions(<TOptions>$.extend({
            message: "Out of range"
        }, options));
    }

    /**
     * @return 
     */
    public isValid(): boolean {

        var val = this.getValue(),
            min = this._element.data("rangeValidator-min"),
            max = this._element.data("rangeValidator-max");

        // Return true if the value is within the range
        return val >= min && val <= max;
    }

    public getMessage() {
        // Use the message in the markup if available

        var val = this.getValue(),
            min = this._element.data("rangeValidator-min"),
            max = this._element.data("rangeValidator-max");

        if (val < min) {
            return "Input cannot be smaller than " + min;
        }
        else if (val > max) {
            return "Input cannot be greater than " + max;
        }
    }
}

Controls.Enhancement.registerEnhancement(RangeValidator, ".validate.range");

export interface RegexValidatorOptions extends BaseValidatorOptions {
    regex?: string | RegExp;
}

export class RegexValidator<TOptions extends RegexValidatorOptions> extends BaseValidator<TOptions> {

    public static optionsPrefix: string = "regexValidator";

    /**
     * @param options 
     */
    constructor(options?: TOptions) {
        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {

        super.initializeOptions(<TOptions>$.extend({
            // Default message for invalid data
            message: "Input value doesn't match regex",
            testEmptyString: true
        }, options));
    }

    /**
     * @return 
     */
    public isValid(): boolean {

        // Get the regular expression from the markup
        var value, regex;

        regex = this._options.regex || this._element.data("regexValidator-regex");

        if (regex) {
            value = this.getValue();

            if (this._options.testEmptyString || $.trim(value)) {
                return new RegExp(regex).test(value);
            }
        }

        return true;
    }

    public getMessage() {
        // Use the message in the markup if available
        return this._element.data("regexValidator-message") || this._options.message;
    }
}

Controls.Enhancement.registerEnhancement(RegexValidator, ".validate.regex");

export interface CustomValidatorOptions extends BaseValidatorOptions {
    validate?: (val: any) => boolean;
}

export class CustomValidator<TOptions extends CustomValidatorOptions> extends BaseValidator<TOptions> {

    public static optionsPrefix: string = "customValidator";

    /**
     *     A validator which checks the text in the input by passing it to a function,
     *     which then returns true if the input is valid, and false if it is invalid.
     * 
     * @param options  Options to apply to the validator:
     *     message: A message logged by the validation summary if the input is invalid / string
     *     testEmptyString: A boolean which indicates whether or not to test the empty string / boolean
     *     validate: The function to validate the input against
     * 
     */
    constructor (options?: TOptions) {

        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions(<TOptions>$.extend({
            // Default message for invalid data
            message: "Input value doesn't satisfy function",
            testEmptyString: true,
            validate: function () { return true; }
        }, options));
    }

    /**
     * Tests if the current input satisfies the function
     * 
     * @return True if the input does satisfy, false if it does not
     */
    public isValid(): boolean {

        var value,
            validateFunction;

        validateFunction = this._options.validate;

        if (typeof validateFunction === "function") {
            value = this.getValue();

            if (this._options.testEmptyString || $.trim(value)) {
                return validateFunction(value);
            }
        }

        return true;
    }

    /**
     *  Set the function the validator tests 
     * 
     * @param newFxn  The new function to test against 
     */
    public setValidate(newValidateFunction) {
        this._options.validate = newValidateFunction;
    }

    /**
     *  Gets the message that would be logged in the validation summary if the input were to be invalid 
     * 
     * @return  The message 
     */
    public getMessage(): string {

        // Use the message in the markup if available
        return this._element.data("customValidator-message") || this._options.message;
    }
}

Controls.Enhancement.registerEnhancement(CustomValidator, ".validate.custom");

export interface DateValidatorOptions extends BaseValidatorOptions {
    parseFormat?: string;
}

export class DateValidator<TOptions extends DateValidatorOptions> extends BaseValidator<TOptions> {

    public static optionsPrefix: string = "dateValidator";

    /**
     * @param options 
     */
    constructor (options?: TOptions) {

        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {

        super.initializeOptions(<TOptions>$.extend({
            // Default message for invalid data
            message: "Input value must be a valid date",
            parseFormat: ""
        }, options));
    }

    /**
     * @return 
     */
    public isValid(): boolean {

        var text = $.trim(this.getValue()), dt;

        if (text) {
            dt = Utils_Date.parseDateString(text, this._options.parseFormat);
        }
        else {
            // Empty text is considered a valid date. To make a date field required, use the required validator.
            return true;
        }

        return ((dt instanceof Date) && !isNaN(dt.getTime()));
    }

    public getMessage() {
        // Use the message in the markup if available
        return this._element.data("dateValidator-message") || this._options.message;
    }
}

Controls.Enhancement.registerEnhancement(DateValidator, ".validate.date");

export interface IntegerRangeValidatorOptions extends BaseValidatorOptions {
    minValue?: number;
    maxValue?: number;
}

export class IntegerRangeValidator<TOptions extends IntegerRangeValidatorOptions> extends BaseValidator<TOptions> {

    public static optionsPrefix: string = "integerRangeValidator";

    /**
     *     A validator that ensures only whole integers between an upper and lower limit are entered.
     * 
     * @param options  Options to apply to the validator:
     *     minValue: The minimum value (inclusive)
     *     maxValue: The maximum value (inclusive)
     * 
     */
    constructor(options?: TOptions) {

        super(options);
    }

    /**
     * OVERRIDE: Determines whether the input control bound to this validator contains valid input
     * 
     * @return True if valid, false otherwise
     */
    public isValid(): boolean {
        var value = this.getValue();
        var bounds = this._getBounds();
        return this.isWithinBounds(value, bounds.max, bounds.min);
    }

    public isWithinBounds(value: string, max: number, min: number): boolean {
        var numericValue = Utils_Number.parseLocale(value);
        var isWithinBounds = false;
        var integerValue = parseInt("" + numericValue, 10);
        var floatValue = parseFloat("" + numericValue);

        if (!isNaN(numericValue) && integerValue === floatValue && isFinite(integerValue)) {
            if (min <= integerValue && max >= integerValue) {
                isWithinBounds = true;
            }
        }
        return isWithinBounds;
    }

    /**
     * OVERRIDE: Gets the error message for display purposes
     * 
     * @return The error message
     */
    public getMessage(): string {
        var bounds = this._getBounds();

        return Utils_String.format(Resources_Platform.Validation_IntegerRange, bounds.min, bounds.max);
    }

    /**
     * Gets the min and max boundaries of the validator
     * 
     * @return {min, max}
     */
    private _getBounds(): any {
        var min,
            max;

        min = this._options.minValue !== undefined ?
                this._options.minValue : Number(this._element.data("integerRangeValidator-min"));

        max = this._options.maxValue !== undefined ?
                this._options.maxValue : Number(this._element.data("integerRangeValidator-max"));

        return {
            min: min,
            max: max
        };
    }
}

Controls.Enhancement.registerEnhancement(IntegerRangeValidator, ".validate.integerRange");

export interface MaxLengthValidatorOptions extends BaseValidatorOptions {
    maxLength?: number;
}

export class MaxLengthValidator<TOptions extends MaxLengthValidatorOptions> extends BaseValidator<TOptions> {

    public static optionsPrefix: string = "maxLengthValidator";

    /**
     * @param options 
     */
    constructor (options?: TOptions) {
        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {

        super.initializeOptions(<TOptions>$.extend({
            message: Utils_String.format("Input cannot exceed {0} characters.", options.maxLength)
        }, options));
    }

    /**
     * @return 
     */
    public isValid(): boolean {

        return this.getValue().length > this._options.maxLength ? false : true;
    }
}

Controls.Enhancement.registerEnhancement(MaxLengthValidator, ".validate.maxlength")

export interface ValidationSummaryOptions {
    context: Node;
    group: string;
}

export class ValidationSummary extends Controls.Control<ValidationSummaryOptions> {

    private _messages: any;
    private _ignoreUIUpdate: boolean;

    // always show validation summary pane at constant height, even when valid
    private _fixedHeight: boolean;

    // only show a single error message
    private _singleMessage: boolean;

    // show as warning rather than as error
    private _showAsWarning: boolean;

    /**
     * @param options 
     */
    constructor (options?: any) {

        super(options);

        this._messages = {};

        if (options.fixedHeight)
            this._fixedHeight = true;

        if(options.singleMessage)
            this._singleMessage = true;

        if (options.showAsWarning)
            this._showAsWarning = true;
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: ValidationSummaryOptions) {

        super.initializeOptions(<ValidationSummaryOptions>$.extend({
            coreCssClass: "validation-summary",
            group: "*"
        }, options));
    }

    public initialize() {
        super.initialize();
        this._bind(this._options.context || window.document.body, BaseValidator.EVENT_VALIDATE_STATUS, delegate(this, this.onValidationStatus), true);
    }

    public onValidationStatus(e? , validator? , group? , valid? ) {
        delete this._messages[validator.instanceId];
        if (!group || group === "*" || group === this._options.group) {
            if (!valid) {
                this._messages[validator.instanceId] = validator.getMessage();
            }

            this._updateUI();
        }
    }

    public validate() {
        try {
            this._messages = {};
            this._ignoreUIUpdate = true;
            this._fire(this._options.context || window.document.body, BaseValidator.EVENT_VALIDATE, [this._options.group]);
        } finally {
            this._ignoreUIUpdate = false;
        }

        this._updateUI();
    }

    private _updateUI() {
        var that = this, invalid = false;
        if (!this._ignoreUIUpdate) {
            this._element.empty();

            $.each(this._messages, function(i, v) {
                invalid = true;
                that._element.append($("<div />").text(v || ""));

                if (that._singleMessage)
                    return false;

                return true;
            });

            var invalidClass: string;

            if (that._showAsWarning)
                invalidClass = "invalid-warning";
            else
                invalidClass = "invalid";

            this._element.toggleClass(invalidClass, invalid);
            this._element.toggleClass("fixed-height", that._fixedHeight);
        }
    }
}

VSS.initClassPrototype(ValidationSummary, {
    _messages: null,
    _ignoreUIUpdate: false,
    _fixedHeight: false,
    _singleMessage: false,
    _showAsWarning: false
});

Controls.Enhancement.registerEnhancement(ValidationSummary, ".validation-summary")

/**
 * @param validationResult 
 * @param context 
 * @return 
 */
export function validateGroup(group, validationResult?: any[], context?: any): boolean {

    var validators = [];

    function record(e, validator? , g? , valid? ) {
        if (!g || g === "*" || g === group) {
            if (!valid) {
                validators.push(validator);
            }
        }
    }

    $(context || window.document.body).bind(BaseValidator.EVENT_VALIDATE_STATUS, record);
    $(context || window.document.body).trigger(BaseValidator.EVENT_VALIDATE, [group]);
    $(context || window.document.body).unbind(BaseValidator.EVENT_VALIDATE_STATUS, record);

    if (validators.length && validationResult) {
        $.each(validators, function (i, v) {
            validationResult.push(v);
        });
    }

    return validators.length === 0;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI.Controls.Validation", exports);
