/// <reference types="react" />

import * as React from "react";

import { TextBoxWithErrorBase, ITextBoxWithErrorBaseProps, ITextBoxWithErrorBaseState } from "ScaledAgile/Scripts/Shared/Components/TextBoxWithErrorBase";

export interface ITextBoxProps extends ITextBoxWithErrorBaseProps { }

export interface ITextBoxState extends ITextBoxWithErrorBaseState { }

export class TextBox extends TextBoxWithErrorBase<ITextBoxProps, ITextBoxState> {
    private _textBoxInputRef: HTMLElement;

    protected _getTextBoxElement(): JSX.Element {
        const onChange = (event: any) => {
            this.props.onChange(event.target.value);
        };

        let invalidClassName = this._isValid() ? "" : TextBoxWithErrorBase.INVALID_CLASS;

        return <input type="text" 
                    ref={(element) => { this._textBoxInputRef = element; } }
                    disabled={this.props.disabled} 
                    aria-disabled={this.props.disabled}
                    aria-required={!!this.props.required}
                    aria-invalid={!this._isValid()}
                    id={this.props.id} 
                    value={this.props.value} 
                    onChange={onChange} 
                    className={invalidClassName} 
                    placeholder={this.props.placeholderText} />;
    }

    public focus() {
        this._textBoxInputRef.focus();
    }
}
