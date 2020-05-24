/// <reference types="react" />

import React = require("react");

import { BuildReason as Reason } from "Build.Common/Scripts/BuildReason";
import { IconButton } from "Build/Scripts/Components/IconButton";

import * as BuildContracts from "TFS/Build/Contracts";

import "VSS/LoaderPlugins/Css!Build/BuildReason";

export interface Props extends React.Props<any> {
    reason: BuildContracts.BuildReason;
    showText?: boolean;
}

export class BuildReason extends React.Component<Props, {}> {
    public render(): JSX.Element {
        let iconCssClass: string = Reason.getIconCssClass(this.props.reason);
        let reason = Reason.getName(this.props.reason, true);

        return <span className="tfs-build-reason">
            <IconButton
                label={reason}
                className={iconCssClass}
            />
            {this.props.showText ? (
                <span>
                    <span>&nbsp; </span>
                    <span className="text" title={reason}>{reason}</span>
                </span>
            ) : null}
        </span>;
    }
}