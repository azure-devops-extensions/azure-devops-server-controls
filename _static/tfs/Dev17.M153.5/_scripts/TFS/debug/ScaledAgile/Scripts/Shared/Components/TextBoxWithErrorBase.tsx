/// <reference types="react" />

import * as React from "react";
import { Label } from "OfficeFabric/Label";

export interface ITextBoxWithErrorBaseProps extends React.Props<void> {
    /**
     * id for the control.
     */
    id?: string;
    /**
     * Label for the input box.
     */
    label?: string;
    /**
     * Flag to indicate if the value is required.
     */
    required?: boolean;
    /**
     * Value in the input box.
     */
    value: string;
    /**
     * If the text box is disabled or not.
     */
    disabled?: boolean;
    /**
     * Change handler of the input box.
     */
    onChange: (value: string) => void;
    /**
     * class name for the control.
     */
    className?: string;
    /**
     * Flag indicate if the control is valid. If not set, default to true.
     */
    isValid?: boolean;
    /**
     * Error message to display.
     */
    errorMessage?: JSX.Element;
    /**
     * dynamic style for the control.
     */
    style?: React.CSSProperties;
    /**
     * Placeholder text shown on input.
     */
    placeholderText?: string;
    /**
     * Whether to put focus on the text box after component mounts
     */
    focusOnMount?: boolean;
}

export interface ITextBoxWithErrorBaseState {
}

/**
 * Base for TextBox and MultilineTextBox so we don't have to copy/pasted code. If other components want to have the same sort of error handling a better base class should be created.
 */
export abstract class TextBoxWithErrorBase<P extends ITextBoxWithErrorBaseProps, S extends ITextBoxWithErrorBaseState> extends React.Component<P, S> {
    public static INVALID_CLASS = "invalid";
    public static INPUT_ERROR_TIP_CLASS = "input-error-tip";

    public render(): JSX.Element {
        const isValid = this._isValid();

        const errorMessage: JSX.Element = isValid ? null : <div aria-live="assertive" className={TextBoxWithErrorBase.INPUT_ERROR_TIP_CLASS} hidden={isValid}>{this.props.errorMessage}</div>;
        const label = this.props.label ? <Label required={!!this.props.required} htmlFor={this.props.id}>{this.props.label}</Label> : null;

        return <div className={this.props.className} style={this.props.style}>
            {label}
            {this._getTextBoxElement()}
            {errorMessage}
        </div>;
    }

    protected _isValid() {
        return this.props.isValid == null || this.props.isValid;
    }

    public componentDidMount() {
        if (this.props.focusOnMount) {
            this.focus();
        }
    }

    public abstract focus(): void;

    protected abstract _getTextBoxElement(): JSX.Element;
}
