import * as React from "react";
import { GitStatus } from "TFS/VersionControl/Contracts";
import { StatusTextIcon } from "VersionControl/Scenarios/Shared/StatusBadge";

export interface IBuildStatusBadgeProps {
    statuses: GitStatus[];
}

/**
 * Rendering container for the build status badge 
 */
export class BuildStatusBadge extends React.Component<IBuildStatusBadgeProps, {}> {

    public render(): JSX.Element {
        return (
            <StatusTextIcon
                className={"vc-build-status-badge"}
                statuses={this.props.statuses}
                isSetupExperienceVisible={false}
                isSetupReleaseExperienceVisible={false} />
        );
    }
}
