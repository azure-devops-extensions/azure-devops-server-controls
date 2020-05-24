import * as React from "react";
import Activity = require("VersionControl/Scripts/Components/PullRequestReview/Activities/Activity");
import { DiscussionThreadHost } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost";
import { format } from "VSS/Utils/String";
import { PullRequest_ActivityFeed_Commented } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

class PRComment extends Activity.Component<Activity.IThreadActivityProps, Activity.IActivityState> {
    public render(): JSX.Element {
        const commenterName: string = this.props.thread.comments[0].author.displayName;
        const commentTitle: string = format(PullRequest_ActivityFeed_Commented, commenterName);

        return this._renderContainer(
            null,
            null,
            null,
            <DiscussionThreadHost scrollIntoView={true} threadId={this.props.thread.id} />,
            null,
            null,
            "overview-comment",
            commentTitle);
    }

    public shouldComponentUpdate(nextProps: Activity.IThreadActivityProps, nextState: Activity.IActivityState): boolean {
        return this.props.isNew !== nextProps.isNew;
    }

    private _image(): JSX.Element {
        if (this.props.thread.id < 0) {
            return <span className="icon status-progress vc-pullrequest-activity-item"/>;
        }

        return this._identityImage(this.props.thread.comments[0].author);
    }

    protected _getTimelineIconClass(): string {
        return "bowtie-comment-outline";
    }
}

export function create(props: Activity.IThreadActivityProps): JSX.Element {
    return <PRComment {...props}/>;
}
