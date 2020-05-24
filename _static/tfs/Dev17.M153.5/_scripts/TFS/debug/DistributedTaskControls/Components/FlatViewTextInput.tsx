/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ICellIndex } from "DistributedTaskControls/Common/FlatViewTableTypes";
import { FlatViewText } from "DistributedTaskControls/Components/FlatViewText";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";
import { HighContrastSelectionClass } from "DistributedTaskControls/Common/FlatViewTableTypes";

import { CommandButton } from "OfficeFabric/Button";
import { Async, css, KeyCodes, autobind } from "OfficeFabric/Utilities";
import { Label } from "OfficeFabric/Label";
import { TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";

import * as Utils_String from "VSS/Utils/String";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Styles/FabricStyleOverrides";
import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/FlatViewTextInput";

export const noUnderLine: string = "flat-view-table-input-row";
export const hoverUnderLine: string = "flat-view-table-input-row-hover";
export const selectedUnderLine: string = "flat-view-table-input-row-selected";
export const errorUnderLine: string = "flat-view-table-input-row-error";
export const focus: string = "flat-view-table-input-row-focus";
export const editInline: string = "flat-view-table-input-edit-inline";

export interface IFlatViewTextInputCellProps extends Base.IProps {
    value: string;
    cellIndex: ICellIndex;
    onValueChanged: (value: string | number, cellIndex: ICellIndex) => void;
    type?: string;
    cssClass?: string;
    rowHighLighted?: boolean;
    rowHasErrors?: boolean;
    controlIconClassName?: string;
    controlTitle?: string;
    disabled?: boolean;
    onControlClicked?: (cellIndex: ICellIndex) => void;
    ariaLabel?: string;
    placeHolder?: string;
    ignoreParentHighlight?: boolean;
}

export interface ICellSelectedState extends Base.IState {
    value: string;
    isSelected: boolean;
    editInline?: boolean;
}

export class FlatViewTextInputCell extends Base.Component<IFlatViewTextInputCellProps, ICellSelectedState> {

    public constructor(props: IFlatViewTextInputCellProps) {
        super(props);
        this.state = {
            value: this.props.value,
            isSelected: false
        };
        this._flatViewTextInputAriaDescribedById = Utils_String.generateUID();
    }

    public componentWillReceiveProps(nextProps: IFlatViewTextInputCellProps): void {

        this.setState((prevState: ICellSelectedState) => {
            return {
                value: nextProps.value,
                isSelected: prevState.isSelected
            };
        });
    }

    public render(): JSX.Element {

        this._updateInputProperties();

        this._underLineRow(this.props.rowHighLighted);

        // className "propagate-keydown-event" is required so that ENTER keypress work when 
        // flatviewtable is used inside VSSF dialog
        return (
            <div className={css("flat-view-text-input-container")} ref={(element: HTMLDivElement) => { this._flatViewTextInput = $(element); }}>
                {!this.state.editInline &&
                    <div>
                        <div 
                            className={"propagate-keydown-event"}
                            data-is-focusable="true"
                            tabIndex={0}
                            role="button"
                            aria-label={this._getAriaLabel()}
                            aria-disabled={this.props.disabled}
                            aria-describedby={!this.props.disabled ? this._flatViewTextInputAriaDescribedById : null}
                            onClick={this._onReadOnlyInputClicked}
                            onKeyDown={this._onReadOnlyInputKeyDown}
                            onFocus={this._onInputFocus}
                            onBlur={this._onReadOnlyInputBlur}
                            ref={(element: HTMLElement) => {
                                this._readOnlyInput = $(element);
                            }}>
                            {this._getReadonlyInput()}
                        </div>
                        <div id={this._flatViewTextInputAriaDescribedById} className="hidden">
                            {Resources.FlatViewTextInputCellDescription}
                        </div>
                    </div>
                }
                {this.state.editInline && this._getEditableInputWithControlIcons()}
            </div>
        );
    }

    public componentDidMount(): void {
        this._underLineRow(this.props.rowHighLighted);
        this._asyncUtil = new Async();
        this._delayedInputChanged = this._asyncUtil.debounce(this.props.onValueChanged, FlatViewTextInputCell.c_defaultDeferredOnChangeTime);
    }

    public componentWillUnmount(): void {
        this._removeStylesFromParentElement();

        if (this._asyncUtil) {
            this._asyncUtil.dispose();
        }
        this._asyncUtil = null;
    }

    private _getAriaLabel(): string {
        if (this._isInputSecret()) {
            return Resources.SecretValueText;
        }
        else {
            return this._inputValue ? this._inputValue.toString() : Resources.EmptyText;
        }
    }

    private _updateInputProperties(): void {
        this._inputValue = (!this.state.value) ? Utils_String.empty : this.state.value;
    }

    private _delayedInputChanged: (value: string, cellIndex: ICellIndex) => void;

    @autobind
    private _onInputChanged(event: React.SyntheticEvent<HTMLInputElement>) {
        let newValue = $(event.target).val();
        this.setState((prevState: ICellSelectedState) => {
            return {
                value: newValue,
                isSelected: prevState.isSelected
            };
        });
        this._delayedInputChanged(newValue, this.props.cellIndex);
    }

    @autobind
    private _onInputFocus(ev: React.FocusEvent<HTMLElement>) {

        this._hasFocus = true;
        this.setState((prevState: ICellSelectedState) => {
            return {
                value: prevState.value,
                isSelected: true
            };
        });
    }

    @autobind
    private _onReadOnlyInputBlur(ev: React.FocusEvent<HTMLDivElement>) {

        let container = this._readOnlyInput[0] as HTMLElement;
        if (!container.contains(ev.relatedTarget as HTMLElement || document.activeElement)) {

            this._hasFocus = false;
            this.setState((prevState: ICellSelectedState) => {
                return {
                    value: prevState.value,
                    isSelected: false
                };
            });
        }
    }

    @autobind
    private _onReadOnlyInputClicked() {

        // If control input is disabled, we don't want to go into the edit mode 
        if (!!this.props.disabled) {
            return;
        }

        this._setFocusOnEditableInput();
    }

    @autobind
    private _onControlClicked(event: React.MouseEvent<HTMLButtonElement>) {
        if (this.props.onControlClicked) {
            this.props.onControlClicked(this.props.cellIndex);
        }

        event.stopPropagation();
    }

    @autobind
    private _onControlIconsMouseDown(ev: React.MouseEvent<HTMLElement>) {
        this.setState({ editInline: true } as ICellSelectedState);
    }

    @autobind
    private _onControlIconsKeyDown(ev: React.KeyboardEvent<HTMLElement>) {

        switch (ev.which) {

            // We don't want to go out of the editable input mode, when right key is pressed on control icon
            case KeyCodes.right:
                ev.stopPropagation();
                break;

            // We don't want to go out of the editable input mode, when enter key is pressed on control icon
            case KeyCodes.enter:
                ev.stopPropagation();
                break;

            default:
                break;
        }
    }

    @autobind
    private _onReadOnlyInputKeyDown(ev: React.KeyboardEvent<HTMLElement>) {

        switch (ev.which) {

            // We want to enter the editable input mode when enter key is pressed in non edit mode
            case KeyCodes.enter:

                // If control input is disabled, we don't want to go into the edit mode 
                if (!!this.props.disabled) {
                    return;
                }

                this._setFocusOnEditableInput();
                ev.stopPropagation();
                break;

            default:
                break;
        }
    }

    @autobind
    private _onEditableInputMouseDown(ev: React.MouseEvent<HTMLElement>) {
        this._setFocusOnEditableInput();
    }

    @autobind
    private _onEditableInputKeyDown(ev: React.KeyboardEvent<HTMLElement>) {

        switch (ev.which) {

            // Focus zone will move the focus to first and last element on the row on home and end key respectively
            // but if we are inside editable input mode, we want it to go to first and last character of the input respectively
            case KeyCodes.home:
            case KeyCodes.end:
                ev.stopPropagation();
                break;

            // We want to enter the non edit mode when enter key is pressed in edit mode
            case KeyCodes.enter:
            case KeyCodes.escape:
                this._setFocusOnReadOnlyInput();
                ev.stopPropagation();
                ev.preventDefault();
                break;

            // We don't want the left keypress event to bubble if we are in the edit mode
            case KeyCodes.left:
                ev.stopPropagation();
                break;

            // We don't want the right keypress event to bubble if we are in the edit mode
            // unless there is control icon, where we want focus to go in case of right key press
            case KeyCodes.right:
                if (!this.props.controlIconClassName) {
                    ev.stopPropagation();
                }
                break;

            default:
                break;
        }
    }

    /**
     * Set focus on the control input [goes into non edit mode]
     * 
     * @private
     * @memberof FlatViewTextInputCell
     */
    private _setFocusOnReadOnlyInput(): void {

        if (this.state.editInline === false) {
            return;
        }

        this.setState({ editInline: false } as ICellSelectedState, () => {
            this._readOnlyInput.focus();
        });
    }

    /**
     * Set focus on the editable input [goes into edit mode]
     * 
     * @private
     * @memberof FlatViewTextInputCell
     */
    private _setFocusOnEditableInput(): void {

        this.setState({ editInline: true } as ICellSelectedState, () => {
            this._editableInput.focus();
        });
    }

    /**
     * Get the read only input
     * It has two scenarios:
     * [secret] -> just label
     * [non-secret] -> label with tooltip
     * 
     * @private
     * @returns {JSX.Element} 
     * @memberof FlatViewTextInputCell
     */
    private _getReadonlyInput(): JSX.Element {

        const readonlyInput = (children: JSX.Element) => {
            return (
                <div className={(!!this.props.cssClass) ? css(this._cellStyleClass, this.props.cssClass) : this._cellStyleClass}>
                    {children}
                </div>
            );
        };

        const disabledCssStyle = this.props.disabled ? "flat-view-text-input-read-only-disabled" : Utils_String.empty;

        // get label for the secret type
        if (this._isInputSecret()) {

            const maskedLabel = (
                <Label
                    disabled={this.props.disabled}
                    className={css("flat-view-text-input-read-only", HighContrastSelectionClass, disabledCssStyle)}>{"********"}</Label>
            );
            return readonlyInput(maskedLabel);
        }

        // get label for the non secret type
        else {
            // Convert input value to string to avoid react error as value can be of type object also.
            const inputValue: string = this._inputValue.toString();

            const labelWithToolTip = (
                <FlatViewText
                    text={inputValue}
                    disabled={this.props.disabled} />
            );
            return readonlyInput(labelWithToolTip);
        }
    }

    /**
     * Get input which supports inline edit and can have control icons
     * 
     * @private
     * @returns {JSX.Element} 
     * @memberof FlatViewTextInputCell
     */
    private _getEditableInputWithControlIcons(): JSX.Element {
        return (
            <div             
                ref={(element: HTMLElement) => {
                    this._editableInputWithControlIcon = $(element);
                }}                
                onFocus={this._onInputFocus}
                onBlur={this._onInputBlur} 
                className={(!!this.props.cssClass) ? css(this._cellStyleClass, this.props.cssClass) : this._cellStyleClass}>
                    {this._getEditableInput()}
                    {this._getControlIcons()}
            </div>
        );
    }

    @autobind
    private _onInputBlur(ev: React.FocusEvent<HTMLElement>) {

        let container = this._editableInputWithControlIcon[0] as HTMLElement;
        if (!container.contains(ev.relatedTarget as HTMLElement || document.activeElement)) {

            this._hasFocus = false;
            this.setState((prevState: ICellSelectedState) => {
                return {
                    value: prevState.value,
                    isSelected: false,
                    editInline: false
                };
            });
        }
    }

    /**
     * Get input which supports inline edit
     * 
     * @private
     * @returns {JSX.Element} 
     * @memberof FlatViewTextInputCell
     */
    private _getEditableInput(): JSX.Element {

        // className "propagate-keydown-event" is required so that ENTER keypress work when 
        // flatviewtable is used inside VSSF dialog
        let className = css("flat-view-text-input propagate-keydown-event", HighContrastSelectionClass, { "flat-view-text-input-padding": !!this.props.controlIconClassName });

        return (
            <input className={className}
                ref={(element: HTMLElement) => {
                    this._editableInput = $(element);
                }} 
                onMouseDown={this._onEditableInputMouseDown}
                onKeyDown={this._onEditableInputKeyDown}
                aria-disabled={this.props.disabled}
                disabled={this.props.disabled}
                type={this.props.type || "text"}
                spellCheck={false}
                value={this._inputValue}
                // we are using 'onInput' as 'onChange' misses X button callback in IE family
                onInput={this._onInputChanged}
                // empty 'onchange' handler to avoid react.js warning. https://github.com/facebook/react/issues/1118
                onChange={() => { }}
                tabIndex={0}
                placeholder={this._getPlaceHolder()}
                aria-label={this.props.ariaLabel} />
        );
    }

    /**
     * Get editable input icons
     * 
     * @private
     * @returns {JSX.Element} 
     * @memberof FlatViewTextInputCell
     */
    private _getControlIcons(): JSX.Element {

        let controlIconClassName = css("control-button", { "hide": !this._isInputHighlighted(this.props.rowHighLighted, this.props.ignoreParentHighlight) });

        return (
            this.props.controlIconClassName &&
            <span
                onKeyDown={this._onControlIconsKeyDown} 
                onMouseDown={this._onControlIconsMouseDown}               
                className="input-control-button-container">
                <CommandButton
                    className={css(controlIconClassName, "control-button-icon")}
                    iconProps={{ iconName: this.props.controlIconClassName }}
                    ariaLabel={this.props.controlTitle}
                    tabIndex={0}
                    disabled={!!(this.props.disabled)}
                    onClick={this._onControlClicked}
                    aria-disabled={!!(this.props.disabled)} />
            </span>
        );
    }

    private _underLineRow(rowHighlighted: boolean): void {

        let parentElement = this._getParentElement();

        if (parentElement) {

            // default case, no underline
            let className: string = noUnderLine;

            if (!!this.props.rowHasErrors) {

                // if there are errors, show the error underline
                className = errorUnderLine;
            } else if (!!this.state.isSelected) {

                // if input is selected, show the selected underline
                className = selectedUnderLine;

                // show hover underline if input parent has focus (ex. row has focus) unless ignoreParentHighlight
                // is provided, in that case it is only done on focus on the input
            } else if (this._isInputHighlighted(rowHighlighted, this.props.ignoreParentHighlight) ||

                // we want to show, hoverunderline when there is no value filled except for secret values
                // this is to help user to see where all the values are not filled
                (!this._isInputSecret() && this.state.value === Utils_String.empty)) {
                className = hoverUnderLine;
            }

            if (!!this.state.isSelected) {
                className = css(className, focus);
            }

            if (this.state.editInline) {
                className = css(className, editInline);
            }

            this._removeStylesFromParentElement();
            parentElement.addClass(className);
        }
    }

    private _isInputHighlighted(parentHighlighted: boolean, ignoreParentHighlight: boolean): boolean {
        return this.state.isSelected || (parentHighlighted && !ignoreParentHighlight);
    }

    private _getPlaceHolder(): string {
        if (this._isInputSecret()) {
            return "********";
        }
        else if (this._hasFocus) {
            return this.props.placeHolder;
        }

        return Utils_String.empty;
    }

    private _isInputSecret(): boolean {
        return (Utils_String.localeIgnoreCaseComparer((this.props.type || "text"), "password") === 0);
    }

    private _getParentElement() {
        return this._flatViewTextInput && this._flatViewTextInput.closest(".flat-view-table-cell");
    }

    private _removeStylesFromParentElement() {

        let parentElement = this._getParentElement();

        if (parentElement) {
            parentElement.removeClass(noUnderLine);
            parentElement.removeClass(errorUnderLine);
            parentElement.removeClass(hoverUnderLine);
            parentElement.removeClass(selectedUnderLine);
            parentElement.removeClass(focus);
            parentElement.removeClass(editInline);
        }
    }

    private _editableInput: JQuery;
    private _editableInputWithControlIcon: JQuery;
    private _readOnlyInput: JQuery;
    private _flatViewTextInput: JQuery;

    private _inputValue: string;
    private _hasFocus: boolean;
    private _asyncUtil: Async;
    private _cellStyleClass: string = "input-cell-style";
    private _flatViewTextInputAriaDescribedById: string;

    private static c_defaultDeferredOnChangeTime = 500;
}