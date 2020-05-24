/// <reference types="jquery" />
/// <reference types="react" />
/// <reference types="react-dom" />

import React = require("react");

import { combineClassNames } from "Build/Scripts/ClassNames";
import { IconButton } from "Build/Scripts/Components/IconButton";
import BuildResources = require("Build/Scripts/Resources/TFS.Resources.Build");

import { BuildStatus as BuildStatusHelper } from "Build.Common/Scripts/BuildStatus";

import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import * as BuildContracts from "TFS/Build/Contracts";

export interface PureProps {
    className: string;
    iconClassName: string;
    textClassName: string;
    statusText: string;
    hideText: boolean;
}

export const BuildStatusPure = (props: PureProps): JSX.Element => {
    let containerClassName = combineClassNames("build-status-container", props.className);
    let textClassName = combineClassNames("build-status-text", props.textClassName);
    let textElement = <span>&nbsp; <span title={props.statusText} className={textClassName}>{props.statusText}</span></span>;

    return <span className={containerClassName}>
        <IconButton
            label={props.statusText}
            className={props.iconClassName}
        />
        {!props.hideText && textElement}
    </span>;
};

export interface Props {
    className?: string;
    build: BuildContracts.BuildReference;
    hideText?: boolean;
}

export class BuildStatus extends React.Component<Props, TFS_React.IState> {
    public render(): JSX.Element {
        if (!this.props.build) {
            return null;
        }

        let iconClassName = BuildStatusHelper.getIconClassName(this.props.build.status, this.props.build.result);
        let textClassName = BuildStatusHelper.getTextClassName(this.props.build.status, this.props.build.result);
        let statusText = BuildStatusHelper.getDisplayText(this.props.build.status, this.props.build.result);

        return <BuildStatusPure
            className={this.props.className}
            iconClassName={iconClassName}
            textClassName={textClassName}
            statusText={statusText}
            hideText={this.props.hideText} />
    }
}
