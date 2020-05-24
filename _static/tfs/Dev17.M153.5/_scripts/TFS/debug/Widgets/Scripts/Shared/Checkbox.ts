import {BowTieClassNames} from "Dashboards/Scripts/Generated/Constants";
import {Selector} from "Dashboards/Scripts/Selector";

export interface CheckboxOptions {
    /* Change handler to be called when checkbox is toggled */
    onChange?: () => void,

    /* Id for this checkbox */
    checkboxId?: string

    /* Label for the checkbox */
    checkboxLabel?: string,

    /* Header for the checkbox */
    headerText?: string,

    /* custom css class to apply */
    customCssClass?: string;
}

/** Creates a checkbox */
export class Checkbox implements Selector {
    public static get cssClass(): string { return "config-checkbox"; }

    private $wrapper: JQuery;
    private $checkbox: JQuery;

    constructor($container: JQuery, options?: CheckboxOptions) {
        this.$wrapper = $("<div>")
            .addClass(Checkbox.cssClass)
            .addClass(BowTieClassNames.Bowtie);

        if (options.customCssClass) {
            this.$wrapper.addClass(options.customCssClass);
        }

        if (options.headerText) {
            this.$wrapper.append($("<label>").text(options.headerText));
        }

        this.$checkbox = $("<input>")
            .prop("type", "checkbox")
            .appendTo(this.$wrapper);

        if (options != null) {
            if (options.checkboxId) {
                this.$checkbox.attr("id", options.checkboxId);
            }

            if (options.onChange) {
                this.$checkbox.on("change", options.onChange);
            }

            if (options.checkboxLabel) {
                var label = $("<label>")
                    .text(options.checkboxLabel)
                    .appendTo(this.$wrapper);

                if (options.checkboxId) {
                    label.attr("for", options.checkboxId);
                }
            }
        }

        $container.append(this.$wrapper);
    }

    public validate(): string { return null; }

    public getSettings(): boolean { return this.$checkbox.is(":checked"); }

    public setEnabled(value: boolean): void {
        this.$checkbox.prop("disabled", !value);
        this.$wrapper.toggleClass("disabled", !value);
    }

    public setChecked(value: boolean, fireEvent?: boolean): void {
        this.$checkbox.prop("checked", value);

        if (fireEvent) {
            this.$checkbox.change();
        }
    }

    public showElement(): void {
        this.$wrapper.show();
    }

    public hideElement(): void {
        this.$wrapper.hide();
    }
}