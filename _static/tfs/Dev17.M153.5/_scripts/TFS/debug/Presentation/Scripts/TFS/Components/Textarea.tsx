import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";

export interface ITextAreaProps extends React.HTMLProps<HTMLTextAreaElement> {
    /**
     * If true then textarea height will grow based on the text content.
     */
    autogrow?: boolean;

    /**
     * If {@link autogrow} is true, sets the initial and minimum textarea height.
     */
    minInputHeight?: number;

    /**
     * If {@link autogrow} is true, sets the max height value the textarea can grow to.
     */
    maxInputHeight?: number;
}

/**
 * Represents a common textarea component that can autogrow based on the text content.
 */
export class TextArea extends React.Component<ITextAreaProps, {}> {
    private _textControl: HTMLTextAreaElement;

    public render() {
        // tslint:disable-next-line:no-unused-variable
        const { onChange, autogrow, maxInputHeight, minInputHeight, ...rest } = this.props;
        return <textarea ref={this._refTextControl}
            {...rest}
            onChange={this._handleChange}
        />;
    }

    public componentDidMount() {
        this._setEditHeight();
    }

    /**
     * Gets the text in the entry field of the textArea element.
     */
    public get value(): string {
        return this._textControl.value;
    }

    /**
     * Gets underlying textarea.
     */
    public getElement(): HTMLTextAreaElement {
        return this._textControl;
    }

    @autobind
    private _refTextControl(textControl: HTMLTextAreaElement): void {
        this._textControl = textControl as HTMLTextAreaElement;
    }

    @autobind
    private _handleChange(event: React.FormEvent<HTMLTextAreaElement>) {
        this._setEditHeight();

        if (this.props.onChange) {
            this.props.onChange(event);
        }
    }

    private _setEditHeight(): void {
        if (this._textControl && this.props.autogrow) {
            // force the browser to determine the minimum height needed when we ask for it...
            this._textControl.style.height = "0";

            // here the +2 prevents the vertical scrollbar from showing up (one pixel on top and one on bottom)
            let scrollHeight: number = this._textControl.scrollHeight + 2;
            let visibleHeight = Math.min(Math.max(scrollHeight, this.props.minInputHeight), this.props.maxInputHeight);

            // hack for IE. If overflow is left to default, then a useless scrollbar shows up in IE
            // if overflow is set to auto, then the scrollbar flashes in IE with each height change
            // So, dynamically set the scrollbar visibility when we need it to be there
            if (visibleHeight < this.props.maxInputHeight) {
                $(this._textControl).css("overflow-y", "hidden");
            } else {
                $(this._textControl).css("overflow-y", "visible");
            }

            this._textControl.style.height = visibleHeight + "px";
        }
    }
}
