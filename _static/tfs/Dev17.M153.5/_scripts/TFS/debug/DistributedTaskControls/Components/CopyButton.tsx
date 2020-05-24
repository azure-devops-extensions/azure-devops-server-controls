/// <reference types="react" />
import * as React from "react";

import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as Utils_Clipboard from "VSS/Utils/Clipboard";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_UI from "VSS/Utils/UI";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Components/CopyButton";

export interface IState {
    wasCopied: boolean;
    hasMouseLeftSinceFocus: boolean;
}

export interface IProps {
    /**
     * Copy text string.
     */
    copyText: string;

    /**
     * Copy the text as HTML.
     */
    copyAsHtml: boolean;

    /**
     * CSS class to append to component.
     */
    cssClass?: string;

    /**
     * The text to show in the tooltip before the content is copied.  If not specified, the default will be used.
     */
    copyTitle?: string;

    /**
     * The text to show in the tooltip after the content is copied.  If not specified, the default will be used.
     */
    copiedTitle?: string;

    /**
     * The text to show as button title. If not specified, "" will be used as the default value.
     */
    buttonTitle?: string;

    /**
     * true if button is disabled. If not specified, false will be used as the default value.
     */
    disabled?: boolean;
}

/**
 * Simple button that provides an experience to copy to the clipboard.
 */
export class CopyButton extends React.Component<IProps, IState> {
    constructor(props: any, context?: any) {
        super(props, context);
        this.state = { wasCopied: false, hasMouseLeftSinceFocus: false };
    }

    private _element: HTMLElement = null;

    public render(): JSX.Element {
        let ariaLabelText =
            this.state.wasCopied
                ? (this.props.copiedTitle || Resources_Platform.CopiedContentDialogTitle)
                : (this.props.copyTitle || Resources_Platform.CopyContentDialogTitle);
                
        let buttonTitle = this.props.buttonTitle || "";
        let disabled = this.props.disabled || false;
        let buttonClasses = ["copy-button"];

        if (!disabled && !this.state.hasMouseLeftSinceFocus) {
            buttonClasses.push("bowtie-tooltipped", "bowtie-tooltipped-se");

            if (this.state.wasCopied) {
                buttonClasses.push("bowtie-tooltipped-transient");
            }
        }

        if (this.props.cssClass != null) {
            buttonClasses.push(this.props.cssClass);
        }

        return (
            <button
                className={buttonClasses.join(" ") }
                aria-label={ariaLabelText}
                onClick={this._onClick}
                onMouseLeave={this._handleMouseLeave}
                onMouseEnter={this._handleMouseEnter}
                onFocus={this._handleFocus}
                onBlur={this._handleBlur}
                disabled={disabled}
                ref={d => this._element = d}
                >
                <span className="bowtie-icon bowtie-edit-copy"/>
                {buttonTitle}
            </button>
        );
    }

    public shouldComponentUpdate(nextProps: IProps, nextState: IState): boolean {
        return nextProps.copyText !== this.props.copyText
            || nextProps.copyAsHtml !== this.props.copyAsHtml
            || nextProps.cssClass !== this.props.cssClass
            || nextProps.copyTitle !== this.props.copyTitle
            || nextProps.copiedTitle !== this.props.copiedTitle
            || nextProps.buttonTitle !== this.props.buttonTitle
            || nextProps.disabled !== this.props.disabled
            || nextState.hasMouseLeftSinceFocus !== this.state.hasMouseLeftSinceFocus
            || nextState.wasCopied !== this.state.wasCopied;
    }

    private _onClick = () => {
        Utils_Clipboard.copyToClipboard(
            this.props.copyText, {
                copyAsHtml: this.props.copyAsHtml
            });

        this.setState({
            wasCopied: true,
        } as IState);

        // In IE11 the element loses focus after calling copy to clipboard, so manually put focus back to the control.
        if (Utils_UI.BrowserCheckUtils.isIE()) {
            Utils_Core.delay(this, 0, () => {
                this._element.focus();
                this.setState({ wasCopied: true } as IState);
            });
        }
    }

    private _handleFocus = () => {
        this.setState({
            hasMouseLeftSinceFocus: false,
        } as IState);
    }

    private _handleMouseEnter = () => {
        this.setState({
            hasMouseLeftSinceFocus: false,
        } as IState);
    }

    private _handleBlur = () => {
        this.setState({
            wasCopied: false,
        } as IState);
    }

    private _handleMouseLeave = () => {
        this.setState({
            wasCopied: false,
            hasMouseLeftSinceFocus: true,
        } as IState);
    }
}
