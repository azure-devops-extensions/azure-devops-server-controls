import Combos = require("VSS/Controls/Combos");

// simple bowtie-ing of existing controls can all go here, complex controls should be in separate files

export interface IErrorMessageControl {
    setErrorMessage(message: string, enabled: boolean): boolean;
    hasErrorMessage() : boolean;
}

export interface ICheckBoxOptions {
    id: string;
    legend?: string;
    text?: string;
}

export class ComboWithErrorMessage extends Combos.Combo implements IErrorMessageControl {
    private _$errorMessage: JQuery;
    private _hasErrorMessage: boolean;

    constructor(options?: Combos.IComboOptions) {
        super(options);
    }

    public initialize() {
        this._$errorMessage = $('<div class="input-error-tip">')
            .hide()
            .insertAfter(this._element);
        this._hasErrorMessage = false;

        super.initialize();
    }

    public setErrorMessage(message: string, enabled: boolean = true): boolean {
        message = message == null ? '' : message.trim();
        enabled = enabled && message.length > 0;

        this._$errorMessage.text(message).toggle(enabled);
        this.setInvalid(enabled);
        this._hasErrorMessage = enabled;

        return enabled;
    }

    public hasErrorMessage() : boolean {
        return this._hasErrorMessage;
    }
}

export class CheckBox {
    private _options: ICheckBoxOptions;
    private $_container: JQuery;
    private $_fieldSet: JQuery;
    private $_control: JQuery;

    constructor($container: JQuery, options: ICheckBoxOptions, onChange?: (boolean) => void) {
        this._options = options;
        onChange = onChange == null ? _ => { } : onChange;
        this.$_container = $container;
        var $fieldSet = $("<fieldset>").addClass("wit-checkbox-fieldset");
        $fieldSet.append(`<legend>${options.legend}</legend>`);
        $fieldSet.append(`<input type="checkbox" id=${options.id} /><label for=${options.id}>${options.text}</label>`);
        $container.append($fieldSet);
        this.$_control = $(`#${this._options.id}`, this.$_fieldSet);
        this.$_control.change(() => {
            onChange(this.checked());
        });
        this.$_fieldSet = $fieldSet;
    }

    public show(): void {
        this.$_fieldSet.show();
    }

    public hide(): void {
        this.$_fieldSet.hide();
    }

    public checked(): boolean {
        return this.$_control.prop('checked');
    }

    public setChecked(checked: boolean): void {
        this.$_control.prop('checked', checked);
    }
}