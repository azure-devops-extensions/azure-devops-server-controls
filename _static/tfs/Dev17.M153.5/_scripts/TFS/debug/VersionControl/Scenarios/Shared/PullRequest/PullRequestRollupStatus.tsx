import * as React from "react";
import * as ReactDOM from "react-dom";
import * as RichContentToolTip from "VersionControl/Scripts/Components/PullRequestReview/RichContentToolTip";
import { GitPullRequest, PullRequestStatus } from "TFS/VersionControl/Contracts";
import * as PullRequestUtils from "VersionControl/Scripts/PullRequestUtils";
import { PullRequestStatusState, PullRequestVoteStatus } from "VersionControl/Scripts/PullRequestTypes";

export interface PullRequestRollupStatusProps {
    pullRequest: GitPullRequest;
}

export interface PullRequestRollupStatusState {
    status: PullRequestUtils.IPullRequestRollupStatus;
}

export class PullRequestRollupStatus extends React.Component<PullRequestRollupStatusProps, PullRequestRollupStatusState> {
    constructor(props: PullRequestRollupStatusProps){
        super(props);
        this.state = { status: PullRequestUtils.computeRollupStatus(props.pullRequest) };
    }

    public render(): JSX.Element {
        const statusCss: string = "vc-pullrequest-rollupstatus " + PullRequestUtils.rollupStatusToCssClass(this.state.status);
        const statusLabel: string = (this.state.status && this.state.status.label) || null;
        const statusDescription: string = (this.state.status && this.state.status.description) || statusLabel;

        return statusLabel && <span title={statusDescription} className={statusCss}>{statusLabel}</span>;
    }
}