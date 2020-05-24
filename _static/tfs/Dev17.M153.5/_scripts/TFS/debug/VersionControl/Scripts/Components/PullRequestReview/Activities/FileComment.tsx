import * as React from "react";
import { MessageBar } from "OfficeFabric/MessageBar";
import Activity = require("VersionControl/Scripts/Components/PullRequestReview/Activities/Activity");
import { GitDiffItem } from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";
import { DiscussionThreadHost } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost";
import { DiscussionThreadUtils } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { FileLink } from "VersionControl/Scripts/Components/PullRequestReview/FileLink";
import { FormattedComponent } from "VersionControl/Scripts/Utils/Format";
import * as StringUtils from "VSS/Utils/String";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { autobind, css } from "OfficeFabric/Utilities";
import { getIconNameForFile } from "VersionControl/Scripts/VersionControlFileIconPicker";
import { getFileName } from "VersionControl/Scripts/VersionControlPath";

export interface FileCommentProps extends Activity.IThreadActivityProps {
    diffItem: GitDiffItem;
}

class FileComment extends Activity.Component<FileCommentProps, Activity.IActivityState> {
    public render(): JSX.Element {
        let notification: JSX.Element = null;
        let iteration: number = null;
        let base: number = null;

        // if we don't have a valid item for this thread anymore the context must not be valid
        // display a notification allowing the user to view the comment in the original context
        if (!this.props.diffItem || !this.props.diffItem.item) {
            notification = 
                <MessageBar
                    key={"notification_threadId_" + this.props.thread.id}
                    className={"notification-message-bar"}>
                    {VCResources.PullRequest_ActivityFeed_CommentContextNotification}
                </MessageBar>;
            iteration = this.props.thread.secondComparingIteration;
            base = DiscussionThreadUtils.getBaseIterationForNav(this.props.thread);
        }

        const fileIcon = <div className={css("file-icon", "bowtie-icon", getIconNameForFile(this.props.thread.itemPath))} />;

        const header = <div className={"file-header"}>
                <div className={"file-link"}>
                    <FileLink 
                        text={getFileName(this.props.thread.itemPath)}
                        cssClass={"file-name"}
                        itemPath={this.props.thread.itemPath}
                        discussionId={this.props.thread.id}
                        iteration={iteration} 
                        base={base} />
                </div>
                <div className={"file-full-path"}>{this.props.thread.itemPath}</div>
            </div>;

        const threadHost =
            <DiscussionThreadHost
                key={"threadHost_threadId_" + this.props.thread.id}
                threadId={this.props.thread.id} />

        return this._renderContainer(
            fileIcon,
            header,
            this.props.thread.publishedDate,
            [notification, threadHost],
            null,
            null,
            "file-comment",
            StringUtils.format(VCResources.PullRequest_CommentOnFile, this.props.thread.itemPath));
    }

    public shouldComponentUpdate(nextProps: FileCommentProps, nextState: Activity.IActivityState): boolean {
        return nextProps.thread !== this.props.thread
            || nextProps.isNew !== this.props.isNew;
    }

    protected _getTimelineIconClass(): string {
        return "bowtie-comment-outline";
    }
}

export function create(props: FileCommentProps): JSX.Element {
    return <FileComment {...props}/>;
}
