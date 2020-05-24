import React = require("react");

import Activity = require("VersionControl/Scripts/Components/PullRequestReview/Activities/Activity");

import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

class Component extends Activity.Component<Activity.IThreadActivityProps, Activity.IActivityState> {
    public render(): JSX.Element {
        return this._renderContainer(
            this._systemImage(),
            this._message(),
            this.props.thread.publishedDate,
            null,
            null,
            null,
            null,
            this._message());
    }

    private _message(): string {
        if (Utils_String.localeIgnoreCaseComparer(this.getThreadPropertyValue("CodeReviewMergeStatus"), "Succeeded") == 0) {
            return VCResources.PullRequest_SystemMergeSucceeded;
        }
        return VCResources.PullRequest_SystemMergeFailed;
    }

    protected _getTimelineIconClass() {
        return "bowtie-tfvc-merge";
    }
}

export function create(props: Activity.IThreadActivityProps): JSX.Element {
    return <Component {...props}/>;
}
