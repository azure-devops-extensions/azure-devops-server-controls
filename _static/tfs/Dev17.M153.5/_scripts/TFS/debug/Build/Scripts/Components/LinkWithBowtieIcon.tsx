/// <reference types="react" />

import React = require("react");

import { vssLWPPageContext } from "Build/Scripts/Context";

import { Link, ILinkProps } from "OfficeFabric/Link";

import "VSS/LoaderPlugins/Css!Build/LinkWithBowtieIcon";

import { getLWPModule } from "VSS/LWP";
const FPS = getLWPModule("VSS/Platform/FPS");

export interface ILinkWithBowtieIconProps extends ILinkProps {
    iconClassName: string;
}

export class LinkWithBowtieIcon extends React.Component<ILinkWithBowtieIconProps, {}> {
    public render(): JSX.Element {
        const { iconClassName, label, onClick, ...rest } = this.props;
        return <span className="build-link-with-bowtie-icon">
            <span className={`bowtie-icon ${iconClassName}`}></span>
            &nbsp;
            <Link
                {...rest}
                onClick={this._onClick}>
                {label}
            </Link>
        </span>;
    }

    private _onClick = (event) => {
        FPS.onClickFPS(vssLWPPageContext, this.props.href, true, event);
    }
}
