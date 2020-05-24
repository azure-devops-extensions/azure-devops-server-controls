// legacy dependency for control rendering
import Controls = require("VSS/Controls");
import { Combo, IComboOptions, ComboTypeOptionsConstants, ComboMultiValueBehavior } from "VSS/Controls/Combos";
import { LegacyComponent, ILegacyComponentProps, ILegacyComponentState } from "Presentation/Scripts/TFS/Components/LegacyComponent";

/**
 * Id and name pair of the field (Project, Team, WorkItemType)
 */
export interface IValueIdPair {
    id: string;
    name: string;
}

/**********************************************************************
 ** Legacy Combo Component **
 **********************************************************************/
export interface ILegacyComboProps extends ILegacyComponentProps {
    /**
     * Values for the control.
     */
    values: IValueIdPair[];
    /**
     * The initial value for the control.
     */
    initialValue: IValueIdPair;
    /**
     * Option for the combo control
     */
    options?: IComboOptions;
    /**
     * The initial value for the control if ComboOption type is "multi-value".
     */
    multiInitialValues?: IValueIdPair[];
}

export interface ILegacyComboState extends ILegacyComponentState {
}

export class LegacyCombo<TProps extends ILegacyComboProps, TState extends ILegacyComboState> extends LegacyComponent<Combo, TProps, TState> {

    /**
     * The lifecycle method of react to decide whether the control should rerender or not
     * @nextProps {TProps} - control next prop
     * @nextState {TState} - control next state
     */
    public shouldComponentUpdate(nextProps: TProps, nextState: TState): boolean {
        const currentValues = this.props.values;
        const nextValues = nextProps.values;
        let reRender = (currentValues.length !== nextValues.length) || !!nextProps.focusOnMount;
        if (!reRender) {
            for (var i = 0; i < currentValues.length; i++) {
                if (currentValues[i].id !== nextValues[i].id || currentValues[i].name !== nextValues[i].name) {
                    reRender = true;
                    break;
                }
            }
        }

        if (!reRender) {
            if (this.isOptionMultiValue()) {
                // if the control has multi-value type, then set new display on input based on multiInitialValue.
                const values = nextProps.multiInitialValues ? nextProps.multiInitialValues.map(x => x.name) : [];
                const value = values.join(ComboMultiValueBehavior.Default_Join_Char);
                this._control.setInputText(value);
            }
            else if (this.props.initialValue.id !== nextProps.initialValue.id) {
                // if the initialValue props has changed, then set new display on the input and not need to rerender.
                this._control.setInputText(nextProps.initialValue.name);
            }
        }

        return reRender;
    }

    /**
     * Implement the creation logic for the LgacyComponent
     * @element {HTMLElement} - Passing down the Html reference to have the WebAccess control hook up
     * @props {TProps} - Properties passed down to the Web access control. Come from the React component.
     * @state {TState} - States passed down to the Web access control. Not used for Legacy Control.
     */
    public createControl(element: HTMLElement, props: TProps, state: TState): Combo {
        return Controls.Control.create(Combo, $(element), this.props.options);
    }

    /**
     * Override the defauled implementation called when rendering the legacy component to react to a state change
     * @element {HTMLElement} element - Passing down the Html reference to have the WebAccess control hook up
     * @props {TProps} props - Properties passed down to the Web access control. Come from the React component.
     * @state {TStates} state - States passed down to the Web access control. Not used for Legacy Control.
     */
    public updateControl(element: HTMLElement, props: TProps, state: TState) {
        if (this._control) {
            super.updateControl(element, props, state);
        }
    }

    protected isOptionMultiValue() {
        return this.props.options && this.props.options.type === ComboTypeOptionsConstants.MultiValueType;
    }
}
