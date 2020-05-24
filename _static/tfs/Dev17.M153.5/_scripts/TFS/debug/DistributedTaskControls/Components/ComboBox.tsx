/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";

import { css } from "OfficeFabric/Utilities";

import { Combo as ComboControl, IComboOptions, IComboDropOptions } from "VSS/Controls/Combos";

import * as Platform_Component from "VSS/Flux/PlatformComponent";
import * as Controls from "VSS/Controls";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/ComboBox";

/*
    Editable: Accept any value, either present in the source of combo box or not
    Searchable: Accept a value which is present in the source only. Error is thrown if the provided value does not match with any value in the source.

    If "allowEdit" is set to false, both "Editable" and "Searchable" behaves in the same way (just like a dropdown) except that every time when
    focus is lost from combo box, a validity check call is made in case of "Seachable" (which will never throw an error as we are always selecting
    from a valid set of values), so it is better to use editable in that case.
*/
export enum ComboBoxType {
    Editable = 1,
    Searchable
}

export interface IProps extends Platform_Component.Props<IComboOptions>, IComboOptions {
    comboBoxType?: number;
    comboBoxStyle?: string;
    errorMessage?: string;
    hideErrorMessage?: boolean;
    required?: boolean;
    textfieldOnEmptySource?: boolean;
    onChange?: (newValue: string) => void;
    ariaLabel?: string;
}

export interface IState extends Base.IState {
    isValid: boolean;
    isFocussed: boolean;
}

export class ComboBox extends Base.Component<IProps, Base.IStateless> {

    public render(): JSX.Element {

        let comboDropStyling: IComboDropOptions = {
            itemCss: "combo-box-item"
        };

        return (<ComboBoxComponent
            invalidCss={"invalid-css"}
            enableFilter={true}
            autoComplete={false}
            cssClass={"combo-box-container"}
            inputCss={"combo-box-input"}
            dropOptions={comboDropStyling}
            enabled={true}
            required={false}
            textfieldOnEmptySource={false}
            {...this.props} />);
    }
}

class ComboBoxComponent extends Platform_Component.Component<ComboControl, IProps, IState> {

    constructor(props: IProps) {
        super(props);

        this.state = { isValid: true, isFocussed: false };

        this._checkValidity = this._checkValidity.bind(this);
    }

    protected createControl(element: JQuery): ComboControl {
        if (!this._control) {
            let props = JQueryWrapper.extend({}, this.props);
            props.change = this._handleInputChange;

            this._control = Controls.create<ComboControl, IComboOptions>(ComboControl, element, props);
        }
        return this._control;
    }

    public render(): JSX.Element {
        let props: any = {
            ref: (element: HTMLElement) => {
                this.onRef(element);
            }
        };

        return (
            <div className={css(this.props.comboBoxStyle, "combo-box-with-error-container")}>
                <div className={"combo-box-container-parent" + (this.state.isFocussed ? (" " + "combo-box-focus") : Utils_String.empty) + (!this.state.isValid ? (" " + "invalid-css") : Utils_String.empty) +
                    (!this.props.enabled ? (" " + "is-disabled") : Utils_String.empty)} {...props}>
                    {this.props.children}
                </div>
                {
                    this.props.hideErrorMessage ? null :
                        (<div className={"combo-error-message" + (this.state.isValid ? (" " + "visibility-hidden") : Utils_String.empty)}>
                            {this.props.errorMessage ? this.props.errorMessage : Resources.ComboBoxInvalidErrorMessage}
                        </div>)
                }
            </div>
        );
    }

    public componentWillReceiveProps(nextProps: IProps) {

        if (this._control) {

            // sets the source
            this._control.setSource(nextProps.source);

            // sets the value
            this._control.setText(nextProps.value);

            // enable/disable input
            this._control.setEnabled(nextProps.enabled);

            this._checkValidity();
        }
    }

    private _expandComboBox = (): void => {
        if (!this._control.isDropVisible()) {
            this._control.setInvalid(false);
            this.setState({ isValid: true, isFocussed: true });
            this._control.getBehavior().showDropPopup();
        }
    }

    public shouldComponentUpdate(nextProps: IProps, nextState: IState) {
        return true;
    }

    public componentDidMount() {
        super.componentDidMount();

        if (!!this.props.value) {
            this._control.setInputText(this.props.value);
        }
        this._checkValidity();

        this._control.getInput().click(() => {

            if (!!this.props.enabled) {
                if (this._control.getBehavior().getDataSource().getItems().length !== 0) {
                    this._expandComboBox();
                }
                else {
                    this._control.hideDropPopup();
                }
            }
        });


        this._control.getInput().blur(() => {
            this._checkValidity();
            this.setState({ isValid: this.state.isValid, isFocussed: false });
        });

        this._control.getInput().keyup((event) => {
            if (!!this.props.enabled) {
                switch (event.keyCode) {

                    // Handling the case when ESCAPE is pressed, the dropdown should close then
                    case Utils_UI.KeyCode.ESCAPE:
                        this._control.hideDropPopup();
                        break;

                    case Utils_UI.KeyCode.ENTER:
                        break;

                    // Any key (except the enter), should open the combo box
                    default:
                        if (this._control.getBehavior().getDataSource().getItems().length !== 0) {
                            this._expandComboBox();
                        }
                        else {
                            this._control.hideDropPopup();
                        }
                        break;
                }
            }
        });

        // Handles key press events for combo box chevron drop icon
        this._control.getDropButton().keyup((event) => {
            if (!!this.props.enabled) {
                switch (event.keyCode) {

                    // Handles the ENTER key press on the drop icon of combo box
                    case Utils_UI.KeyCode.ENTER:
                        // If combo box is open, pressing enter should close it
                        // Else open it
                        if (this._control.isDropVisible()) {
                            this._control.hideDropPopup();
                        }
                        else {
                            this._expandComboBox();
                        }
                        break;

                    // Handles the ESCAPE key press on the drop icon
                    case Utils_UI.KeyCode.ESCAPE:
                        this._control.hideDropPopup();
                        break;
                }
            }
        });
    }

    public componentWillUnmount() {
        this._control.getInput().unbind("click");
        this._control.getInput().unbind("blur");
        this._control.getInput().unbind("keyup");
        this._control.getDropButton().unbind("keyup");
        super.componentWillUnmount();
    }

    private _checkValidity = (): void => {
        // Check validity of input in combo box if it is searchable from available sources
        // If combo box is editable, check is done for empty string in combo box, only when required property is set
        if (!this._isValid()) {
            this._control.setInvalid(true);
            this.setState({ isValid: false, isFocussed: this.state.isFocussed });
        }
        else {
            this._control.setInvalid(false);
            this.setState({ isValid: true, isFocussed: this.state.isFocussed });
        }
    }

    // If combo box is searchable, then check if the input in box matches with exactly one of the items
    // If combo box is editable and field is requierd, check if the combo box contains any value or not
    private _isValid = (): boolean => {
        if (this._isComboBoxSearchable() && this._control.getInputText().length > 0) {
            if (!!this.props.textfieldOnEmptySource && this._control.getBehavior().getDataSource().getCount() === 0) {
                return true;
            }
            if (this._control.getBehavior().getDataSource().getItemIndex(this._control.getInputText()) !== -1) {
                return true;
            }
            return false;
        }
        else if (!!this.props.required && this._control.getInputText().length === 0) {
            return false;
        }
        return true;
    }

    private _isComboBoxSearchable = (): boolean => {
        if (!!this.props.comboBoxType && this.props.comboBoxType === ComboBoxType.Searchable) {
            return true;
        }
        return false;
    }

    public getValue(): any {
        return this._control.getValue();
    }

    private _handleInputChange = () => {
        if (this.props.onChange) {
            this.props.onChange(this.getValue());
        }
    }
}