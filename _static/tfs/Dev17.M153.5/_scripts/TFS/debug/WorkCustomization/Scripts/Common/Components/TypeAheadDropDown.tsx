// legacy dependency for control rendering
import Controls = require("VSS/Controls");
import { LegacyCombo, ILegacyComboProps, ILegacyComboState } from "Presentation/Scripts/TFS/Components/LegacyCombo";
import { OpenDropDownOnFocusCombo, IOpenDropDownOnFocusComboOptions } from "Presentation/Scripts/TFS/TFS.UI.Controls.OpenDropDownCombo";
import { Combo, IComboOptions, ComboMultiValueBehavior } from "VSS/Controls/Combos";
import * as CoreUtils from "VSS/Utils/Core";

/**********************************************************************
 ** TypeAheadDropDown Component **
 **********************************************************************/
export interface ITypeAheadDropDownProps extends ILegacyComboProps {
    /**
     * The callback when input changes
     */
    onInputChange: (value: string, isValid: boolean) => void;

    /**
     * The css class for input element in control.
     */
    inputCss?: string;
    /**
     * The css class for invalid state control.
     */
    invalidCss?: string;
    /**
     * Optional indicator. If defined, the aria-required attribute will be specified.
     */
    required?: boolean;
    /**
     * Optional. If defined, the aria-label attribute will be specified.
     */
    ariaLabel?: string;

    placeholderText?: string;

    disabled?: boolean;

    isAlwaysValid?: boolean;
}

/**
 * A typeahead dropdown combo is a dropdown that allow user to type to filter the choices available
 */
export class TypeAheadDropDown extends LegacyCombo<ITypeAheadDropDownProps, ILegacyComboState> {
    /**
     * This is executed at mount level
     * @Override see LegacyCombo 
     */
    public createControl(element: HTMLElement, props: ITypeAheadDropDownProps, state: ILegacyComboState): Combo {
        if (!props.values) {
            return null;
        }
        let source = props.values.map(x => x.name);

        let changeTimeout: CoreUtils.DelayedFunction = null;

        let options: IOpenDropDownOnFocusComboOptions = {
            source: source,
            enableFilter: true,
            maxAutoExpandDropWidth: 198,
            inputCss: props.inputCss ? props.inputCss : null,
            invalidCss: props.invalidCss ? props.invalidCss : "invalid",
            change: () => {
                if (changeTimeout) {
                    changeTimeout.reset();
                    return false;
                }
                changeTimeout = CoreUtils.delay(this, 200, () => {
                    this._onInputChange();
                });
            },
            placeholderText: props.placeholderText,
            dropOptions: {
                setTitleOnlyOnOverflow: true
            },
            disableOpenOnKeyboardFocus: true,
            enabled: !this.props.disabled
        };
        $.extend(options, this.props.options);

        if (props.initialValue) {
            options.value = props.initialValue.name;
        }

        let control = Controls.Control.create(OpenDropDownOnFocusCombo, $(element), options, {
            ariaAttributes: {
                required: !!props.required,
                label: props.ariaLabel
            }
        });

        return control;
    }


    private _onInputChange(): void {
        let input = this._control.getElement().find("input");
        let value = input.val();
        let isValid = this._validate(value) || this.props.isAlwaysValid;
        this._control.setInvalid(!isValid);
        if (this.props.onInputChange) {
            this.props.onInputChange(value, isValid);
        }
    }

    /**
     * Determine if the control should be in an invalid state. This mean that the selected value or the value typed is not
     * a proper final value
     */
    private _validate(value: string): boolean {
        const items = this.props.values.filter(x => x.name === value);

        return items && items.length > 0;
    }

}
