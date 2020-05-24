/// <reference types="react" />

import React = require("react");

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { vssLWPPageContext } from "Build/Scripts/Context";

import { BuildLinks } from "Build.Common/Scripts/Linking";

import { BuildReference } from "TFS/Build/Contracts";

import { getLWPModule } from "VSS/LWP";
const FPS = getLWPModule("VSS/Platform/FPS");

import * as Utils_String from "VSS/Utils/String";

export interface IBuildDetailLinkProps {
    build: BuildReference;
    className?: string;
    buildNumberFormat?: string;
}

export class BuildDetailLink extends React.Component<IBuildDetailLinkProps, {}> {

    public render(): JSX.Element {
        const buildNumber = this.props.buildNumberFormat ? Utils_String.format(this.props.buildNumberFormat, this.props.build.buildNumber) : this.props.build.buildNumber;
        return <a
            className={this.props.className}
            href={BuildLinks.getBuildDetailLink(this.props.build.id)}
            aria-label={Utils_String.format(BuildResources.BuildDetailLinkTooltip, buildNumber)}
            onClick={this._onClick}>
            {buildNumber}
        </a>;
    }

    private _onClick = (e) => {
        FPS.onClickFPS(vssLWPPageContext, BuildLinks.getBuildDetailLink(this.props.build.id), true, e);
    }

    public shouldComponentUpdate(nextProps: IBuildDetailLinkProps): boolean {
        return this.props.className !== nextProps.className
            || this.props.buildNumberFormat !== nextProps.buildNumberFormat
            || this.props.build.buildNumber !== nextProps.build.buildNumber
            || this.props.build.id !== nextProps.build.id;
    }
}
