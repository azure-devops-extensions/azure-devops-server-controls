/// <reference types="react" />

import React = require("react");

import * as BuildResources from "Build/Scripts/Resources/TFS.Resources.Build";
import { IconButton } from "Build/Scripts/Components/IconButton";
import * as Constants from "Build/Scripts/Constants";

import { css } from "OfficeFabric/Utilities";

import * as BuildContracts from "TFS/Build/Contracts";

import * as VSS_Events from "VSS/Events/Services";

import "VSS/LoaderPlugins/Css!Build/BuildRetain";

export interface Props extends React.Props<any> {
    build: BuildContracts.Build;
    className?: string;
    showText?: boolean;
    canToggleRetained?: boolean;
}

export class BuildRetain extends React.Component<Props, {}> {
    public render(): JSX.Element {
        let retained = this.props.build.keepForever;
        let retainedByRelease = this.props.build.retainedByRelease;

        let title: string = BuildResources.RetainIndefinitely;
        let text = "";

        if (retained) {
            title = BuildResources.StopRetainingIndefinitely;
            text = BuildResources.RetainedText;
        }
        else if (retainedByRelease) {
            title = BuildResources.RetainedByRelease;
            text = BuildResources.RetainedByReleaseText;
        }

        // if the build is not retained, and the user can't retain it, don't show the icon at all
        if (!retained && !retainedByRelease && !this.props.canToggleRetained) {
            return null;
        }

        return <span className={css("tfs-build-retain", { "disabled": !this.props.canToggleRetained })}>
            <IconButton
                label={title}
                className={css("icon retain-icon bowtie-icon", this.props.className, {
                    "bowtie-security-lock-fill visible retained": retained,
                    "bowtie-security-lock-fill visible retained-by-release": retainedByRelease,
                    "bowtie-security-lock": !retained && !retainedByRelease
                })}
                onClick={this.props.canToggleRetained && this._onToggleIconClicked}
                toggleState={this.props.build.keepForever}
            />
            {this.props.showText ? (
                <span>
                    <span>&nbsp;</span>
                    <span className="text" title={text}>{text}</span
                    ></span>
            ) : null}
        </span>;
    }

    private _onToggleIconClicked = (event: React.SyntheticEvent<HTMLElement>) => {
        let eventName = this.props.build.keepForever ? Constants.UserActions.StopRetainingBuild : Constants.UserActions.RetainBuild;
        VSS_Events.getService().fire(eventName, this, { build: this.props.build });
    }
}
