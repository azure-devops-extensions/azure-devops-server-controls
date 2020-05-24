import * as Controls from "VSS/Controls";
import { Checkbox } from "Widgets/Scripts/Shared/Checkbox";
import Combos = require("VSS/Controls/Combos");
import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import * as StringUtils from "VSS/Utils/String";
import { Selector } from "Dashboards/Scripts/Selector";


export interface ToggleableNumericInputValues {
    /* Off is default state, such that input will be disabled by default. */
    toggleOn?: boolean;

    /** 0 is default starting value.*/
    inputValue?: number;
}

export interface ToggleableNumericInputOptions extends ToggleableNumericInputValues {
    /** User facing text for toggle button */
    toggleLabel: string;

    /** User facing text for input field */
    inputLabel: string;

    /** Called when the checkbox checked value is changed or the numeric input value is changed. */
    onChange?: () => void;

    /**
     * The largest value that is considered valid input.
     * Used for control validation only. Doesn't prevent users from entering numbers exceeding this limit.
     * Not validated if this option is null or undefined.
     */
    maxValue?: number;

    /**
     * The smallest value that is considered valid input.
     * Used for control validation only. Doesn't prevent users from entering numbers below this limit.
     * Not validated if this option is null or undefined.
     */
    minValue?: number;
}

/** Provides standard rendering for a checkbox driven input with labelling for checkbox and textbox   */
export class ToggleableNumericInput extends Controls.Control<ToggleableNumericInputOptions> implements Selector {
    private checkboxAndLabel: Checkbox;

    //inputLabel element exists in DOM, but we don't need to modify it after creation, so we don't hold a ref.
    private inputBox: NumericInput;

    public initializeOptions(options: ToggleableNumericInputOptions) {
        super.initializeOptions($.extend({
            cssClass: "toggleable-numeric-input"
        }, options));
    }

    public initialize() {

        let $container = this.getElement();
        // Use local Checkbox implementation
        this.checkboxAndLabel = new Checkbox($container, {
            headerText: null,
            checkboxId: this.getId() + "-Checkbox",
            checkboxLabel: this._options.toggleLabel,
            onChange: () => {
                const isChecked = this.checkboxAndLabel.getSettings();
                this.inputBox.setEnabled(isChecked);
                this._options.onChange();
            }
        });

        this.inputBox = NumericInput.create(NumericInput, $container, {
            label: this._options.inputLabel,
            initialValue: this._options.inputValue,
            onChange: this._options.onChange,
            maxValue: this._options.maxValue,
            minValue: this._options.minValue
        });

        // Set initial checked state
        this.checkboxAndLabel.setChecked(this._options.toggleOn, false);
        this.inputBox.setEnabled(this._options.toggleOn);
    }

    public validate(): string {
        let errorMessage = null;
        const settings = this.getSettings();

        if (settings.toggleOn) {
            errorMessage = this.inputBox.validate();
        }

        return errorMessage;
    }

    // Required by selector pattern, but not used with this control.
    public setEnabled(value: boolean): void {
        this.checkboxAndLabel.setEnabled(value);
        this.inputBox.setEnabled(value);
    }

    public getSettings(): ToggleableNumericInputValues {
        return {
            inputValue: this.inputBox.getSettings(),
            toggleOn: this.checkboxAndLabel.getSettings()
        };
    }
}

export interface NumericInputOptions {
    /** 0 is default starting value.*/
    initialValue?: number;

    /** User facing text for input field */
    label?: string;

    /** Called when the numeric input value is changed. */
    onChange?: () => void;

    /**
     * The largest value that is considered valid input.
     * Used for control validation only. Doesn't prevent users from entering numbers exceeding this limit.
     * Not validated if this option is null or undefined.
     */
    maxValue?: number;

    /**
     * The smallest value that is considered valid input.
     * Used for control validation only. Doesn't prevent users from entering numbers below this limit.
     * Not validated if this option is null or undefined.
     */
    minValue?: number;
}

export class NumericInput extends Controls.Control<NumericInputOptions> implements Selector {
    private inputBox: Combos.Combo;

    public initializeOptions(options: NumericInputOptions) {
        super.initializeOptions($.extend({
            cssClass: "numeric-input"
        }, options));
    }

    public initialize() {
        const labelHtmlId = Controls.getHtmlId();
        let $container = this.getElement();

        const initialValue = (this._options.initialValue != null) ? this._options.initialValue.toString() : null;
        this.inputBox = Controls.Control.create(
            Combos.Combo,
            null,
            {
                mode: "text",
                value: initialValue,
                change: this._options.onChange
            },
            {
                ariaAttributes: {
                    labelledby: labelHtmlId
                }
            }
        );

        if (this._options.label != null) {
            $("<div>")
                .addClass("numeric-input-description-label")
                .text(this._options.label)
                .attr("id", labelHtmlId)
                .appendTo($container);
        }

        this.inputBox.getElement().appendTo($container);
    }

    public validate(): string {
        let errorMessage = null;
        const settings = this.getSettings();

        if (isNaN(settings) || !isFinite(settings) || settings % 1 !== 0) {
            errorMessage = WidgetResources.NumericInput_InvalidInputError;
        } else if (this._options.maxValue != null && settings > this._options.maxValue) {
            errorMessage = StringUtils.format(WidgetResources.NumericInput_MaxAllowableIterationsErrorFormat, this._options.maxValue);
        } else if (this._options.minValue != null && settings < this._options.minValue) {
            errorMessage = StringUtils.format(WidgetResources.NumericInput_MinAllowableIterationsErrorFormat, this._options.minValue);;
        }

        return errorMessage;
    }

    public setValue(value: number, fireEvent?: boolean): void {
        this.inputBox.setText(value.toString(), fireEvent);
    }

    public setEnabled(value: boolean): void {
        this.inputBox.setEnabled(value);
    }

    public getSettings(): number {
        const val = this.inputBox.getValue();
        return $.isNumeric(val) ? +val : Number.NaN;
    }
}