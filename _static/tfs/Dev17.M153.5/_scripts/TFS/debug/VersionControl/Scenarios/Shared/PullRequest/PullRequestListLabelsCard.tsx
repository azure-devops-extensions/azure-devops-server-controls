import * as React from "react";

import { GitPullRequest } from "TFS/VersionControl/Contracts";
import { LabelsComponent } from "VersionControl/Scenarios/Shared/LabelsComponent";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestListLabelsCard";

export interface PullRequestListLabelsProps {
    pullRequest: GitPullRequest;
}

/**
 * Max width for labels in PR list.
 * Empiric value for a minimum of 700px in the row (".primary-line ellide-overflow")
 * and 40% max-width of the labels inside it (".vc-pullrequest-labels").
 */
const labelsMaxWidth = 300;

export class PullRequestListLabelsCard extends React.Component<PullRequestListLabelsProps, {}> {
    public render(): JSX.Element {
        if (!this.props.pullRequest.labels){
            return null;
        }

        const labels = this.props.pullRequest.labels.map(l => l.name);

        return (
            <div className="vc-pullrequest-labels" >
                <LabelsComponent
                    labels={labels}
                    selectable={false}
                    maxWidth={labelsMaxWidth}
                />
           </div>);
    }
}
