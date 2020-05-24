/// <reference types="react" />
import * as React from "react";

export interface Props extends React.Props<ColoredButton> {
    buttonText: string;
    buttonClass?: string;
    iconClass?: string;
    onClick(e?: React.MouseEvent<HTMLButtonElement>): void;
    isCta?: boolean;
    toolTip?: string;
    disabled?: boolean;
}

export interface Stateless { }

export class ColoredButton extends React.Component<Props, Stateless> {
    public render(): JSX.Element {
        let buttonFullClass = (this.props.isCta ? "btn-cta " : "");
        if (this.props.buttonClass) {
            buttonFullClass = buttonFullClass + this.props.buttonClass;
        }

        let iconSpan;
        if (this.props.iconClass) {
            iconSpan = <i className={this.props.iconClass}/>;
        } else {
            buttonFullClass += " colored-button-no-icon";
        }

        return (
            <button className={buttonFullClass} onClick={this.props.onClick} title={this.props.toolTip || ""} disabled={this.props.disabled}>
                { iconSpan }
                { this.props.buttonText }
            </button>
        );
    }
}
