/// <reference types="react" />

import * as React from "react";
import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { InputBase } from "DistributedTaskControls/SharedControls/InputControls/Components/InputComponentBase";
import {
    IInputControlPropsBase,
    IInputControlStateBase,
    InputControlType
} from "DistributedTaskControls/SharedControls/InputControls/Common";

import { Icon } from "OfficeFabric/Icon";
import { Async, css } from "OfficeFabric/Utilities";

import { Combo as ComboControl, IComboOptions, IComboDropOptions, BaseComboBehavior } from "VSS/Controls/Combos";
import * as Diag from "VSS/Diag";
import * as Platform_Component from "VSS/Flux/PlatformComponent";
import * as Controls from "VSS/Controls";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_UI from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/SharedControls/InputControls/Components/ComboBoxInputComponent";

const ComboBoxContainer = ({ comboBoxContainerCssClass, props }) => (

    <div className={comboBoxContainerCssClass} {...props}>
    </div>
);

const ComboBoxErrorMessage = ({ hideErrorMessage, errorMessageCss, errorMessageString, isComboBoxSearchable, required, value, errorMessageId, errorMessageKey, isValid }) => (
    <div role="alert">
        {(isComboBoxSearchable || (required && !(value && value.trim()))) && !hideErrorMessage && !isValid && (<div className={errorMessageCss}>
            <Icon iconName="Error" className="combobox-input-component-error-icon" />
            <span id={errorMessageId} key={errorMessageKey} >{errorMessageString ? errorMessageString : Resources.ComboBoxInvalidErrorMessage}</span>
        </div>)}
    </div>
);

/*
    Editable: Accept any value, either present in the source of combo box or not
    Searchable: Accept a value which is present in the source only. Error is thrown if the provided value does not match with any value in the source.

    If "allowEdit" is set to false, both "Editable" and "Searchable" behaves in the same way (just like a dropdown) except that every time when
    focus is lost from combo box, a validity check call is made in case of "Searchable" (which will never throw an error as we are always selecting
    from a valid set of values), so it is better to use editable in that case.
*/
export enum ComboBoxType {
    Editable = 1,
    Searchable
}

export interface IComboBoxDropOptions extends IComboDropOptions {
}

export interface IProps extends Platform_Component.Props<IComboOptions>, IComboOptions, IInputControlPropsBase<string> {
    comboBoxType?: ComboBoxType;
    comboBoxStyle?: string;
    hideErrorMessage?: boolean;
    textfieldOnEmptySource?: boolean;
    comboBoxDropOptions?: IComboBoxDropOptions;
    blur?: (string) => void;
    isCaseSensitive?: boolean;
    onValidation?: (isValid: boolean) => void;
    deferredOnChangeTime?: number;
    disabled?: boolean;
}

export class ComboBoxInputComponent extends InputBase<string, IProps, IInputControlStateBase<string>> {

    public getType(): string {
        return InputControlType.INPUT_TYPE_COMBO_BOX;
    }

    protected getControl(): JSX.Element {
        Diag.logVerbose("[ComboBoxInputComponent.getControl]: Method called.");

        return (
            <ComboBox
                ref={this._resolveRef("_comboBox")}
                required={false}
                enabled={!this.props.disabled}
                ariaDescribedBy={this.props.ariaDescribedBy || this.getInputFieldDescriptionElementId()}
                {...this.props} />
        );
    }

    public getBehavior(): BaseComboBehavior {
        return this._comboBox.getBehavior();
    }

    public getDropButton(): JQuery {
        return this._comboBox.getDropButton();
    }

    private _comboBox: ComboBox;
}

export interface IState extends Base.IState {
    isValid: boolean;
    isFocussed: boolean;
}

export class ComboBox extends Platform_Component.Component<ComboControl, IProps, IState> {

    constructor(props: IProps) {
        super(props);
        this.state = { isValid: true, isFocussed: false };
        this._errorMessageKey = Utils_String.generateUID();
    }

    protected createControl(element: JQuery): ComboControl {
        if (!this._control) {

            let defaultDropOptions: IComboDropOptions = {
                itemCss: css("combo-box-item", this._getDefaultValueOnUndefined<string>(this.props.comboBoxDropOptions ? this.props.comboBoxDropOptions.itemCss : null, Utils_String.empty)),
                maxRowCount: this._getDefaultValueOnUndefined<number>(this.props.comboBoxDropOptions ? this.props.comboBoxDropOptions.maxRowCount : undefined, undefined)
            };

            let dropOptionsProps = JQueryWrapper.extend(this.props.comboBoxDropOptions, defaultDropOptions);

            let defaultProps: IComboOptions = {
                type: this.props.type,
                enableFilter: this._getDefaultValueOnUndefined<boolean>(this.props.enableFilter, true),
                autoComplete: this._getDefaultValueOnUndefined<boolean>(this.props.autoComplete, false),
                enabled: this._getDefaultValueOnUndefined<boolean>(this.props.enabled, true),
                invalidCss: css("invalid-css", this._getDefaultValueOnUndefined<string>(this.props.invalidCss, Utils_String.empty)),
                cssClass: css("combo-box-container", this._getDefaultValueOnUndefined<string>(this.props.cssClass, Utils_String.empty)),
                inputCss: css("combo-box-input", this._getDefaultValueOnUndefined<string>(this.props.inputCss, Utils_String.empty)),
                value: this._getDefaultValueOnUndefined<string>(this.props.value, Utils_String.empty),
                dropOptions: dropOptionsProps,
                onKeyDown: this._handleKeydown,
                ariaAttributes: {
                    ...(this.props.ariaLabel && { label: this.props.ariaLabel }),
                    ...(this.props.ariaLabelledBy && { labelledby: this.props.ariaLabelledBy }),
                    ...(this.props.ariaDescribedBy && { describedby: this.props.ariaDescribedBy }),
                    ...(this.props.required && { required: this.props.required })
                },

            } as IComboOptions;

            let props = JQueryWrapper.extend(defaultProps, this.props);
            props.change = this._handleInputChange;

            this._control = Controls.create<ComboControl, IComboOptions>(ComboControl, element, props);
        }
        return this._control;
    }

    public getBehavior(): BaseComboBehavior {
        return this._control.getBehavior();
    }

    public getDropButton(): JQuery {
        return this._control.getDropButton();
    }

    public render(): JSX.Element {

        let props: any = {
            ref: (element: HTMLElement) => {
                this.onRef(element);
            }
        };
        let errorMessageId: string = this._errorMessageId + this._comboBoxId;
        let enabled = this._getDefaultValueOnUndefined<boolean>(this.props.enabled, true);
        let comboBoxContainerCssClass: string = css("combo-box-container-parent", { "combo-box-focus": this.state.isFocussed }, { "is-disabled": !enabled }, { "invalid-css": !this.state.isValid });

        let errorMessageCss: string = "combo-error-message";
        return (
            <div className={this.props.comboBoxStyle} aria-describedby={this._comboBoxDescribedById}>

                <ComboBoxContainer
                    comboBoxContainerCssClass={comboBoxContainerCssClass}
                    props={props}
                    aria-describedby={errorMessageId} />

                <div className="hidden" id={this._comboBoxDescribedById}>{this.props.ariaDescription}</div>

                <ComboBoxErrorMessage
                    errorMessageKey={this._errorMessageKey}
                    errorMessageId={errorMessageId}
                    errorMessageCss={errorMessageCss}
                    isValid={this.state.isValid}
                    errorMessageString={this.props.errorMessage}
                    hideErrorMessage={this.props.hideErrorMessage}
                    isComboBoxSearchable={this._isComboBoxSearchable()}
                    required={this.props.required}
                    value={this.props.value} />

            </div>);
    }

    public componentWillReceiveProps(nextProps: IProps) {

        if (this._control && !this._control.isDisposed()) {

            this._errorMessageKey = this.props.value !== nextProps.value
                ? Utils_String.generateUID()
                : this._errorMessageKey;

            // sets the source only when the new source is different from old source. 
            //Otherwise, in case of searchable combo it would end up re-setting the source from filtered list to entire list.
            if (!Utils_Core.equals(this.props.source, nextProps.source)) {
                this._control.setSource(nextProps.source);
            }

            // sets the value
            this._control.setText(this._getDefaultValueOnUndefined<string>(nextProps.value, Utils_String.empty));

            // enable/disable input
            this._control.setEnabled(this._getDefaultValueOnUndefined<boolean>(nextProps.enabled, true));

            // sets the aria-label attribute
            this._setAriaLabel(nextProps.ariaLabel);

            this._checkValidity();
        }
    }

    public shouldComponentUpdate(nextProps: IProps, nextState: IState) {
        if (this.props.allowEdit !== false && this.props.deferredOnChangeTime !== 0 && this._async && !Utils_Array.arrayEquals(this.props.source, nextProps.source)) {
            this._delayedOnChange = this._async.debounce(this.props.onValueChanged, this.props.deferredOnChangeTime || ComboBox.c_defaultDeferredOnChangeTime);
        }

        return true;
    }

    public componentDidMount() {
        super.componentDidMount();

        this._checkValidity();

        this._control.getInput().focus(() => {
            if (this._control.getEnabled()) {
                this._onFocus();
            }
        });

        this._control.getInput().blur(() => {
            if (this._control.getEnabled()) {
                this._onFocusLost();
            }
        });

        this._control.getInput().attr({
            "aria-describedby": this.props.ariaDescribedBy
        });
    }

    public componentWillUnmount() {
        this._control.getInput().unbind("focus");
        this._control.getInput().unbind("blur");
        if (this._async) {
            this._async.dispose();
        }
        super.componentWillUnmount();
    }

    public componentWillMount(): void {
        if (this.props.allowEdit !== false && this.props.deferredOnChangeTime !== 0) {
            this._async = new Async();
            this._delayedOnChange = this._async.debounce(this.props.onValueChanged, this.props.deferredOnChangeTime || ComboBox.c_defaultDeferredOnChangeTime);
        }
    }

    public getValue(): any {
        return this._control.getValue();
    }

    private _setAriaLabel(ariaLabel: string) {
        this._control.getInput().attr("aria-label", ariaLabel);
    }

    private _handleKeydown = (e: JQueryKeyEventObject) => {
        // Fix for Bug 1042852: MAS violation: Focus trap in variable editor
        // If the combo-box is not editable, clear the selection of the text
        // so that focus zone can move focus out of the input. 
        if (this.props.comboBoxType !== ComboBoxType.Editable) {
            if (e.which === Utils_UI.KeyCode.LEFT) {
                const input = this._control.getInput()[0] as HTMLInputElement;
                if (input.setSelectionRange) {
                    input.setSelectionRange(0, 0);
                }
            }
            else if (e.which === Utils_UI.KeyCode.RIGHT) {
                const input = this._control.getInput()[0] as HTMLInputElement;
                let length = input.value ? input.value.length : 0;
                if (input.setSelectionRange) {
                    input.setSelectionRange(length, length);
                }
            }
        }
    }

    /*
        Update value function is now called only 3 times:
        1. When enter is pressed with focus on input
        2. When item is clicked in dropdown
       3. When focus is lost from combo box
    */
    private _handleInputChange = (): void => {
        if (this.props.onValueChanged) {
            if (this.props.allowEdit !== false && this._delayedOnChange) {
                this._delayedOnChange(this.getValue());
            }
            else {
                this.props.onValueChanged(this.getValue());
            }
        }
    }

    private _getDefaultValueOnUndefined<T>(option: T, defaultValueOnUndefined: T): T {
        return option === undefined ? defaultValueOnUndefined : option;
    }

    private _isComboBoxSearchable(): boolean {
        return this.props.comboBoxType === ComboBoxType.Searchable;
    }

    private _checkValidity(): void {
        if (this._control.getEnabled()) {
            // Check validity of input in combo box if it is searchable from available sources
            // If combo box is editable, check is done for empty string in combo box, only when required property is set
            if (!this._isValid()) {
                this._updateStateValidityInParent(false);
                this._control.setInvalid(true);
                this.setState({ isValid: false, isFocussed: this.state.isFocussed });
            }
            else {
                this._updateStateValidityInParent(true);
                this._control.setInvalid(false);
                this.setState({ isValid: true, isFocussed: this.state.isFocussed });
            }

        }
    }

    private _updateStateValidityInParent(isValid: boolean) {
        if (this.props.onValidation) {
            this.props.onValidation(isValid);
        }
    }

    // If combo box is searchable, then check if the input in box matches with exactly one of the items
    // If combo box is editable and field is required, check if the combo box contains any value or not
    private _isValid = (): boolean => {
        if (this._isComboBoxSearchable() && this._control.getInputText().length > 0) {
            if (!!this.props.textfieldOnEmptySource && this._control.getBehavior() && this._control.getBehavior().getDataSource().getCount() === 0) {
                return true;
            }
            if (!this.props.isCaseSensitive && this._control.getBehavior() && this._control.getBehavior().getDataSource().getItemIndex(this._control.getInputText()) !== -1) {
                return true;
            }
            else if (this.props.isCaseSensitive) {
                return this._isValidWithCaseSensitive();
            }
            return false;
        }
        else if (!!this.props.required && this._control.getInputText().trim().length === 0) {
            return false;
        }
        return true;
    }

    private _isValidWithCaseSensitive(): boolean {
        let options: string[] = this.props.source;
        let currentValue: string = this._control.getInputText();
        if (options) {
            return !!Utils_Array.first(options, (option: string) => {
                return Utils_String.equals(currentValue, option, false);
            });
        }
        return false;
    }

    private _onFocus = (): void => {
        this.setState({ isFocussed: true });
    }

    private _onFocusLost = (): void => {
        this._checkValidity();
        this.setState({ isFocussed: false, isValid: this.state.isValid });
    }

    private _comboBoxDescribedById: string = "combo-box-description";
    private _errorMessageId: string = "combo-error-message";
    private _delayedOnChange: (string) => void;
    private static readonly c_defaultDeferredOnChangeTime = 300;
    private _comboBoxId: string = Utils_String.generateUID();
    private _async: Async;
    private _errorMessageKey: string;
}