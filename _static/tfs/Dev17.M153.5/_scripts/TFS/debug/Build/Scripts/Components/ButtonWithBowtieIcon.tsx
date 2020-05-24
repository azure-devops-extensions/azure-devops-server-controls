/// <reference types="react" />

import React = require("react");

import { DefaultButton } from "OfficeFabric/components/Button/DefaultButton/DefaultButton";
import { PrimaryButton } from "OfficeFabric/components/Button/PrimaryButton/PrimaryButton";
import { IButtonProps } from "OfficeFabric/components/Button/Button.types";

import "VSS/LoaderPlugins/Css!Build/ButtonWithBowtieIcon";

export interface IButtonWithBowtieIconProps extends IButtonProps {
    iconClassName: string;
    isCta?: boolean;
}

export class ButtonWithBowtieIcon extends React.Component<IButtonWithBowtieIconProps, {}> {
    public render(): JSX.Element {
        const {iconClassName, label, isCta, ...rest} = this.props;
        const className = this.props.className || "";
        const iconElement = <span className="ms-Button-label">
            <span className={`bowtie-icon ${iconClassName}`}></span>
            &nbsp;
                {label}
        </span>;

        if (this.props.isCta) {
            return <PrimaryButton
                ariaLabel={label}
                className={`${className} build-bowtie-cta cta`}
                {...rest}>
                {iconElement}
            </PrimaryButton>;
        }
        else {
            return <DefaultButton
                ariaLabel={label}
                className={className}
                {...rest}>
                {iconElement}
            </DefaultButton>;
        }
    }
}
