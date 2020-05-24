import Controls = require("VSS/Controls");

import { ModefulValueSetting } from "Widgets/Scripts/Shared/ModefulValueSetting";
import { SettingsField } from "Dashboards/Scripts/SettingsField";
import { SelectorControl } from "Dashboards/Scripts/Selector";

/**
 * Type retrieved from RadioSettingsFieldPicker when getting the selected settings.
 * Provides an interface for identifying the type of settings information stored in
 * the object.
 */
export interface RadioSettingsFieldPickerSettings<TSettings> extends ModefulValueSetting<string, TSettings> {}

/**
 * Options for the RadioFieldSelector.
 */
export interface RadioSettingsFieldPickerOptions {
    /** Called when the selected radio button changes. Arguments are the selected field and its identifier. */
    onChange: (fieldIdentifier: string, field: SettingsField<SelectorControl>) => void;
    /** The name to use for grouping the radio buttons. */
    radioButtonGroupName?: string;
    /**
     * The settings fields and their identifiers.
     * These settings fields become the options to choose from in the rendered RadioSettingsFieldPicker control.
     * The control adds the settings fields to the DOM.
     */
    settingsFields?: IDictionaryStringTo<SettingsField<SelectorControl>>;
    /** (Optional) Text to render as a label for the control. */
    labelText?: string;
}

/**
 * Presents a user with a choice between two or more settings fields by radio buttons.
 * The control returns the settings for whichever field is associated with the checked radio button.
 * The fields of the unchecked radio buttons are disabled. The field of the checked radio button is enabled.
 */
export abstract class RadioSettingsFieldPickerO<TOptions extends RadioSettingsFieldPickerOptions, TSettings> extends Controls.Control<TOptions> {
    private radioButtons: IDictionaryStringTo<JQuery>;
    private activeField: SettingsField<SelectorControl>;
    private activeFieldIdentifier: string;

    public initializeOptions(options?: TOptions) {
        if (!options.radioButtonGroupName) {
            throw "Must define radio button group name to use control";
        }

        super.initializeOptions($.extend({
            coreCssClass: "radio-settings-field-picker bowtie"      
        }, options));
    }

    public initialize() {
        this.radioButtons = {};        

        this.setRole('radiogroup');

        // Append label
        let labelId = `${this.getId()}-label`;
        if (this._options.labelText) {
            var $label = $("<label>")
                .attr('id', labelId)
                .text(this._options.labelText);
            this.getElement().append($label);
        }
        this.getElement().attr('aria-labelledby', labelId);

        // Append fields
        var fieldIdentifiers = this.getFieldIdentifiers();
        fieldIdentifiers.forEach((fieldIdentifier, index) => {
            var field = this._options.settingsFields[fieldIdentifier];
            var $radio = this.createRadioButton(fieldIdentifier, field);

            // Append controls
            var $container = $("<div>")
                .append($radio)
                .append(field.getElement())
                .appendTo(this.getElement());

            // Enable the first field and disable the rest
            if (index === 0) {
                this.activeField = field;
                this.activeFieldIdentifier = fieldIdentifier;
                $radio.prop("checked", true);
                field.getControl().setEnabled(true);
            } else {
                field.getControl().setEnabled(false);
            }
        });
    }

    /**
     * Checks the radio button of the settings field associated with the given identifier.
     * Enables the newly selected/active field and disables the previously selected field.
     * @param fieldIdentifier of the settings field to select.
     * @param fireEvent fires the onChange method passed as an option to this control if set to true.
     */
    public selectField(fieldIdentifier: string, fireEvent?: boolean): void {
        var field = this._options.settingsFields[fieldIdentifier];
        if (field != null) {
            var $radio = this.radioButtons[fieldIdentifier];
            $radio.prop("checked", true);

            var fieldIdentifiers = this.getFieldIdentifiers();
            fieldIdentifiers.forEach((identifier, index) => {
                var iField = this._options.settingsFields[identifier];
                if (identifier !== fieldIdentifier) {
                    iField.getControl().setEnabled(false);
                }
            });

            this.onChange(fieldIdentifier, field, fireEvent);
        }
    }

    /**
     * Retrieves the settings of the active settings field control.
     * Bundles the settings with the identifier defined for the active field.
     * @returns the identifier of the active settings field and its settings.
     */
    public getSettings(): RadioSettingsFieldPickerSettings<TSettings> {
        var settings: RadioSettingsFieldPickerSettings<TSettings> = {
            identifier: this.activeFieldIdentifier,
            settings: this.activeField.getControl().getSettings()
        }

        return settings;
    }

    /**
     * Validates the active settings field by calling the validate
     * method of the active settings field and returns its return value.
     * @returns the error message returned by the active settings field control's validate method.
     */
    public validate(): string {
        return this.activeField.getControl().validate();
    }

    /**
     * Enables/disables the radio button related to a field identifier
     * @param fieldIdentifier
     * @param toggleValue
     */
    public toggleRadioButton(fieldIdentifier: string, toggleValue: boolean): void {
        if (toggleValue) {
            this.radioButtons[fieldIdentifier].removeAttr('disabled');
        } else {
            this.radioButtons[fieldIdentifier].attr('disabled', 'disabled');
        }
    }

    private getFieldIdentifiers(): string[] {
        var fieldIdentifiers: string[] = [];

        for (var fieldIdentifier in this._options.settingsFields) {
            if (this._options.settingsFields.hasOwnProperty(fieldIdentifier)) {
                fieldIdentifiers.push(fieldIdentifier);
            }
        }

        return fieldIdentifiers;
    }

    private createRadioButton(fieldIdentifier: string, field: SettingsField<SelectorControl>): JQuery {
        var $radio = $("<input>")
            .attr("aria-labelledby", field.getLabelId())
            .prop("type", "radio")
            .prop("name", this._options.radioButtonGroupName);

        $radio.on("change", () => this.onChange(fieldIdentifier, field, true));
        this.radioButtons[fieldIdentifier] = $radio;

        return $radio;
    }

    private onChange(fieldIdentifier: string, field: SettingsField<SelectorControl>, fireEnableEvent: boolean) {
        // Disable current active field
        this.activeField.getControl().setEnabled(false);
        this.activeField.hideError();

        // Enable selected field and set as active
        field.getControl().setEnabled(true);
        this.activeField = field;
        this.activeFieldIdentifier = fieldIdentifier;

        if (fireEnableEvent && $.isFunction(this._options.onChange)) {
            this._options.onChange(fieldIdentifier, field);
        }
    }
}

/**
 * Presents a user with a choice between two or more settings fields by radio buttons.
 * The control returns the settings for whichever field is associated with the checked radio button.
 * The fields of the unchecked radio buttons are disabled. The field of the checked radio button is enabled.
 */
export class RadioSettingsFieldPicker<TSettings> extends RadioSettingsFieldPickerO<RadioSettingsFieldPickerOptions, TSettings> { }