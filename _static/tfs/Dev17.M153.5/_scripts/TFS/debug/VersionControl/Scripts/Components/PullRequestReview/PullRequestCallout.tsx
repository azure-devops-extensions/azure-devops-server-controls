import * as React from "react";

import { css } from "OfficeFabric/Utilities";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface PullRequestCalloutProps {
    className?: string;
    buttons?: JSX.Element[];
}

export class PullRequestCallout extends React.Component<PullRequestCalloutProps, {}> {
    public render(): JSX.Element {
        if (!this.props.children) {
            return (
                <div className="visually-hidden">{VCResources.PullRequest_NoCalloutMessage}</div>
            );
        }

        return (
            <div className={css("callout", this.props.className)}>
                <div key="buttons" className="callout-buttons">
                    {this.props.buttons}
                </div>
                {this.props.children}
            </div>
        );
    }
}
