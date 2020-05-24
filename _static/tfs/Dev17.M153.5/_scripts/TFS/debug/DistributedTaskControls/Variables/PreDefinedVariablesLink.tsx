/// <reference types="react" />

import * as React from "react";

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { ExternalLink } from "DistributedTaskControls/Components/ExternalLink";

import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import "VSS/LoaderPlugins/Css!DistributedTaskControls/Variables/PreDefinedVariablesLink";

export interface IProps extends Base.IProps {
    href: string;
}

export class PreDefinedVariablesLink extends Base.Component<IProps, Base.IStateless> {
    public render(): JSX.Element {
        return (
            <div className="dtc-predefined-variables-link">
                <ExternalLink
                    href={this.props.href}
                    newTab={true}
                    text={Resources.PredefinedVariables} />
            </div>
        );
    }
}