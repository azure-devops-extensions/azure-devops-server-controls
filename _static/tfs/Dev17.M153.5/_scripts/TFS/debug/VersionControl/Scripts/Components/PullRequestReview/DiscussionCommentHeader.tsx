import * as React from "react";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { SavePending } from "Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequest_DiscussionThread_ScreenReaderCommentsUnreadContent } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { UpdatingTimeStamp } from "VersionControl/Scripts/Components/PullRequestReview/UpdatingTimeStamp";
import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionCommentContextButton } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionCommentContextButton";

export interface IDiscussionCommentHeaderProps {
    thread: DiscussionThread;
    date?: Date;
    author: IdentityRef;
    tfsContext: TfsContext;
    showAuthorName: boolean;
    showSpinner: boolean;
    showContext: boolean
    hasUnseenContent: boolean;
}

export class DiscussionCommentHeader extends React.Component<IDiscussionCommentHeaderProps, {}> {
    public render(): JSX.Element {
        return (
            <span className={"vc-discussion-comment-header"}>
                {this._renderAuthorName()}
                {this._renderDate()}
                {this._renderDot()}
                {this._renderSpinner()}
                {this._renderContext()}
            </span>);
    }
    
    private _renderAuthorName(): JSX.Element {
        if (this.props.showAuthorName) {
            return (
                <span className="vc-discussion-comment-author" >
                    {this.props.author.displayName}
                </span>);
        }

        return null;
    }

    private _renderDate(): JSX.Element {
        if (this.props.showSpinner) {
            return (
                <span className="vc-discussion-comment-date"
                    title={SavePending}>
                    {SavePending}
                </span>);
        }
        else if (this.props.date) {
            return <UpdatingTimeStamp className="vc-discussion-comment-date" date={this.props.date} />
        }

        return null;
    }

    private _renderDot(): JSX.Element {
        if (this.props.hasUnseenContent) {
            return <div aria-label={PullRequest_DiscussionThread_ScreenReaderCommentsUnreadContent} className="dot"></div>
        }

        return null;
    }

    private _renderSpinner(): JSX.Element {
        if (this.props.showSpinner) {
            return <span className="vc-discussion-comment-saving-icon status-progress" />
        }

        return null;
    }

    private _renderContext(): JSX.Element {
        if (this.props.showContext) {
            return (
                <DiscussionCommentContextButton
                    thread={this.props.thread}
                    isReadOnly={true} />);
        }

        return null;
    }
}
