/// <reference types="react" />

import React = require("react");

import {Icon} from "Build/Scripts/Components/Icon";
import {BuildStatus} from "Build.Common/Scripts/BuildStatus";

import * as BuildContracts from "TFS/Build/Contracts";

export interface Props extends React.Props<any> {
    status: BuildContracts.BuildStatus;
    result?: BuildContracts.BuildResult;
}

export const BuildStatusIcon = (props: Props): JSX.Element => {
    let iconCssClass: string = BuildStatus.getIconClassName(props.status, props.result);
    return <Icon iconClassName={ iconCssClass } />;
};
