import { ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { FilterDropdownCombo, IFilterDropdownComboProps, IFilterDropdownComboState } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/FilterDropdownCombo";

export interface ISettingFilterDropdownComboProps extends IFilterDropdownComboProps {
    /**
     * If the combo control is disabled or not.
     */
    disabled?: boolean;
}

export interface ISettingFilterDropdownComboState extends IFilterDropdownComboState {
}

/**
 * A filter dropdown combo used for delivery timeline wizard & settings experience
 */
export class SettingFilterDropdownCombo extends FilterDropdownCombo<ISettingFilterDropdownComboProps, ISettingFilterDropdownComboState> {
    /**
     * Handle the loading scenario. Where we were loading and still load, we do not re-render until we got the data
     * @Override see LegacyCombo 
     */
    public shouldComponentUpdate(nextProps: ISettingFilterDropdownComboProps, nextState: ISettingFilterDropdownComboState): boolean {
        if (nextProps.id !== this.props.id) {
            return true;
        }

        // When switching between loading and not loading (both direction)
        let curtPropIsLoading = this.props.initialValue.valueState === ValueState.IsLoading;
        let nextPropIsLoading = nextProps.initialValue.valueState === ValueState.IsLoading;
        if (nextPropIsLoading !== curtPropIsLoading) {
            let source = nextProps.values.map(x => x.name);
            let enabled = this.shouldEnable(nextProps);
            if (this._control) {
                this._control.setEnabled(enabled);
                this._control.setSource(source);
                this._control.setInputText(nextProps.initialValue.name);
                this._control.setInvalid(nextProps.initialValue.valueState === ValueState.ReadyButInvalid);
            }
            return false;
        }

        return super.shouldComponentUpdate(nextProps, nextState);
    }

    /**
     * This is add condition when the control should be enabled.
     * @Override see FilterDropdownCombo
     */
    public shouldEnable(props: ISettingFilterDropdownComboProps) {
        return (props.initialValue.valueState !== ValueState.IsLoading) && !props.disabled;
    }

    /**
     * This is the condition for when we should validate the input value.
     * @Override see FilterDropdownCombo
     */
    public shouldValidateInput(nextProps: ISettingFilterDropdownComboProps) {
        return nextProps.initialValue.valueState !== ValueState.IsLoading;
    }

    /**
     * This is override how we are going to validate the input value.
     * @Override see FilterDropdownCombo
     */
    public validateInput(nextProps: ISettingFilterDropdownComboProps) {
        return nextProps.initialValue.valueState === ValueState.ReadyAndValid;
    }
}
