// legacy dependency for control rendering
import Controls = require("VSS/Controls");
import { LegacyCombo, ILegacyComboProps, ILegacyComboState } from "Presentation/Scripts/TFS/Components/LegacyCombo";
import { Combo, IComboOptions, ComboMultiValueBehavior } from "VSS/Controls/Combos";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";

/**********************************************************************
 ** FilterDropdownCombo Component **
 **********************************************************************/
export interface IFilterDropdownComboProps extends ILegacyComboProps {
    /**
     * Unique guid identifier of the control 
     */
    id: string;
    /**
     * The callback when input changes
     */
    onInputChange: (value: string) => void;
    /**
     * Values for the control.
     */
    values: IFieldShallowReference[];
    /**
     * The initial value for the control.
     */
    initialValue: IFieldShallowReference;
    /**
     * The initial value for the control if ComboOption type is "multi-value".
     */
    multiInitialValues?: IFieldShallowReference[];
    /**
     * The css class for input element in control.
     */
    inputCss?: string;
    /**
     * The css class for invalid state control.
     */
    invalidCss?: string;
    /**
     * Optional input validator. If provided, it will override the default input validation logic. 
     */
    inputValidator?: (nextProps: IFilterDropdownComboProps) => boolean;
    /**
     * Optional indicator. If defined, the aria-required attribute will be specified.
     */
    required?: boolean;
    /**
     * Optional. If defined, the aria-label attribute will be specified.
     */
    ariaLabel?: string;
}

export interface IFilterDropdownComboState extends ILegacyComboState {
}

/**
 * A filter dropdown combo is a dropdown that allow user to type to filter the choices available
 */
export class FilterDropdownCombo<TProps extends IFilterDropdownComboProps = IFilterDropdownComboProps, TState extends IFilterDropdownComboState = IFilterDropdownComboState> extends LegacyCombo<TProps, TState> {
    public static FILTER_DROPDOWN_INPUT = "field-filter-input";
    public static FILTER_DROPDOWN_INVALID = "invalid";

    private _inputValidator: (nextProps: IFilterDropdownComboProps) => boolean;

    /**
     * Handle the loading scenario. Where we were loading and still load, we do not re-render until we got the data
     * @Override see LegacyCombo 
     */
    public shouldComponentUpdate(nextProps: TProps, nextState: TState): boolean {
        if (nextProps.id !== this.props.id) {
            return true;
        }
        let shouldUpdate = super.shouldComponentUpdate(nextProps, nextState);

        if (!shouldUpdate && this._control && this.shouldValidateInput(nextProps)) {
            this._control.setInvalid(!this._inputValidator(nextProps));
        }

        return shouldUpdate;
    }

    /**
     * This is executed at mount level
     * @Override see LegacyCombo 
     */
    public createControl(element: HTMLElement, props: TProps, state: TState): Combo {
        if (!props.values) {
            return null;
        }
        let source = props.values.map(x => x.name);
        let value = props.initialValue.name;
        if (this.props.multiInitialValues && this.isOptionMultiValue()) {
            // get initial value for "multi-value" combo type.
            value = props.multiInitialValues.map(x => x.name).join(ComboMultiValueBehavior.Default_Join_Char);
        }
        let enabled = this.shouldEnable(props);
        let options: IComboOptions = {
            id: this.props.id,
            source: source,
            value: value,
            enabled: enabled,
            enableFilter: true,
            maxAutoExpandDropWidth: 198,
            inputCss: props.inputCss ? props.inputCss : FilterDropdownCombo.FILTER_DROPDOWN_INPUT,
            invalidCss: props.invalidCss ? props.invalidCss : FilterDropdownCombo.FILTER_DROPDOWN_INVALID,
            change: () => { this._onInputChange(); }
        };
        $.extend(options, this.props.options);

        this._inputValidator = $.isFunction(props.inputValidator) ? props.inputValidator : this.validateInput;

        let control = Controls.Control.create(Combo, $(element), options, {
            ariaAttributes: {
                disabled: !enabled,
                invalid: props.initialValue.valueState === ValueState.ReadyButInvalid,
                required: !!props.required,
                label: props.ariaLabel
            }
        });
        control.setInvalid(props.initialValue.valueState === ValueState.ReadyButInvalid);

        return control;
    }

    protected shouldValidateInput(nextProps: TProps) {
        return true;
    }

    protected validateInput(nextProps: TProps): boolean {
        let comboText = this._getComboTextValue();
        return this._validate(comboText);
    }

    protected shouldEnable(props: TProps) {
        return true;
    }

    private _onInputChange(): void {
        let input = this._control.getElement().find("input");
        let value = input.val();
        if ($.isFunction(this.props.onInputChange)) {
            this.props.onInputChange(value);
        }
    }

    /**
     * Determine if the control should be in an invalid state. This mean that the selected value or the value typed is not
     * a proper final value
     */
    private _validate(value: string): boolean {
        let items: IFieldShallowReference[] = [];
        if (this.isOptionMultiValue()) {
            let splitValues = value.split(ComboMultiValueBehavior.Default_Join_Char);
            for (let i = 0; i < splitValues.length; i++) {
                let item = this.props.values.filter(v => v.name === splitValues[i]);
                if (item && item.length > 0) {
                    items.push(item[0]);
                }
                else {
                    // item not found
                    return false;
                }
            }
        }
        else {
            items = this.props.values.filter(x => x.name === value);
        }
        return items && items.length > 0;
    }

    private _getComboTextValue(): string {
        if (this._control) {
            let input = this._control.getElement().find("." + FilterDropdownCombo.FILTER_DROPDOWN_INPUT);
            let value = input.val();
            return value;
        }
        return "";
    }
}
