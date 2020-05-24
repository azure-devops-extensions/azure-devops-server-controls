/// <reference types="react" />

import * as React from "react";

import { TextBoxWithErrorBase, ITextBoxWithErrorBaseProps, ITextBoxWithErrorBaseState } from "ScaledAgile/Scripts/Shared/Components/TextBoxWithErrorBase";

export interface IMultilineTextBoxProps extends ITextBoxWithErrorBaseProps { }

export interface IMultilineTextBoxState extends ITextBoxWithErrorBaseState { }

export class MultilineTextBox extends TextBoxWithErrorBase<IMultilineTextBoxProps, IMultilineTextBoxState> {

    private _textBoxInputRef: HTMLElement;
    protected _getTextBoxElement(): JSX.Element {
        const onChange = (event: any) => {
            this.props.onChange(event.target.value);
        };

        let invalidClassName = this._isValid() ? "" : TextBoxWithErrorBase.INVALID_CLASS;

        return <textarea style={{ resize: "none" }} 
                    ref={(element) => { this._textBoxInputRef = element; } }
                    disabled={this.props.disabled} 
                    aria-disabled={this.props.disabled} 
                    aria-invalid={!this._isValid()}
                    aria-required={!!this.props.required}
                    id={this.props.id}
                    value={this.props.value} 
                    onChange={onChange} 
                    className={invalidClassName} 
                    placeholder={this.props.placeholderText}>
                </textarea>;
    }

    public focus() {
        this._textBoxInputRef.focus();
    }
}
