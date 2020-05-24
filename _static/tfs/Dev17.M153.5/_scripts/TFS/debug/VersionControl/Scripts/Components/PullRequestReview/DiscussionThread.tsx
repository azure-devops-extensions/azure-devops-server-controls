import * as React from "react";
import { autobind, css } from "OfficeFabric/Utilities";
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import { DiscussionThread as IDiscussionThread, DiscussionComment as IDiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionThreadIterationContext } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import {  DiscussionStatus } from "Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { getFileName } from "VersionControl/Scripts/VersionControlPath";
import { IDiscussionThreadHost } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost";
import { DiscussionComment } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionComment";
import { DiscussionCommentPreview } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionCommentPreview";

export interface IDiscussionThreadProps {
    thread: IDiscussionThread;
    feedbackIsEnabled?: boolean;
    commentLikesIsEnabled?: boolean;
    tfsContext: TfsContext;
    showAvatar: boolean;
    showCancel: boolean;
    showContext: boolean;
    host?: IDiscussionThreadHost;
    validAttachmentTypes: string[];
    focusReplyBox?: boolean;
    hasPermissionToAddEditComment: boolean;
    hasPermissionToLikeComment: boolean;
    hasPermissionToUpdateCommentStatus: boolean;
}

export class DiscussionThread extends React.Component<IDiscussionThreadProps, {}> {
    private _debugId: number;
    private static _debugIdCurrent: number = 1;
    private _focusReplyBox: boolean;

    constructor(props) {
        super(props);

        this._debugId = DiscussionThread._debugIdCurrent++;
    }

    public render(): JSX.Element {

        if (!this.props.thread || this.props.thread.isDeleted || !this.props.thread.comments || this.props.thread.comments.length === 0) {
            return null;
        }

        const items = [];
        this.props.thread.comments.forEach((comment, index) => {
            items.push(<DiscussionComment
                comment={comment}
                thread={this.props.thread}
                feedbackIsEnabled={this.props.feedbackIsEnabled}
                commentLikesIsEnabled={this.props.commentLikesIsEnabled}
                threadIsResolved={this._threadIsResolved()}
                key={comment.originalId || comment.id} // if the comment is saved, use originalId for key so that react understands this is the same comment
                host={this.props.host}
                tfsContext={this.props.tfsContext}
                isFirstComment={index === 0}
                showAvatar={this.props.showAvatar}
                showCancel={this.props.showCancel}
                showContext={this.props.showContext}
                validAttachmentTypes={this.props.validAttachmentTypes} 
                hasPermissionToAddEditComment={this.props.hasPermissionToAddEditComment}
                hasPermissionToLikeComment={this.props.hasPermissionToLikeComment}
                hasPermissionToUpdateCommentStatus={this.props.hasPermissionToUpdateCommentStatus} />);
        });

        const comments: IDiscussionComment[] = this.props.thread.comments;
        const lastComment: IDiscussionComment = (comments && comments.length) ? comments[comments.length - 1] : null;
        const showCommentPreview: boolean = this.props.hasPermissionToAddEditComment && lastComment.id > 0;
        const showWhatsNew: boolean = this.props.thread.hasUnseenContent;
        const screenReaderSummary: string = this._buildScreenReaderSummary();

        return (
            <div 
                className={css("vc-discussion-thread-box bowtie", { "isnew": showWhatsNew }, { "iscollapsed": this.props.thread.isCollapsed })}
                role={"list"}>
                <div className={"visually-hidden"}>{screenReaderSummary}</div>
                <div className="vc-discussion-comments" >{items}</div>
                { showCommentPreview &&
                    <DiscussionCommentPreview
                        thread={this.props.thread}
                        threadIsResolved={this._threadIsResolved()}
                        tfsContext={this.props.tfsContext}
                        focusReplyBox={this.props.focusReplyBox} 
                        hasPermissionToUpdateCommentStatus={this.props.hasPermissionToUpdateCommentStatus} />}
            </div>
        );
    }

    private _threadIsResolved(): boolean {
        return !!this.props.thread && !!this.props.thread.status &&
            this.props.thread.status !== DiscussionStatus.Active &&
            this.props.thread.status !== DiscussionStatus.Pending;
    }

    private _buildScreenReaderSummary(): string {
        const thread = this.props.thread;
        const comments = thread.comments;
        let screenReaderSummary = "";
        const separator = ", ";

        if (thread.hasUnseenContent) {
            screenReaderSummary = VCResources.PullRequest_DiscussionThread_ScreenReaderCommentsUnreadContent + separator;
        }

        if (thread.itemPath) {
            const fileName = getFileName(thread.itemPath);

            screenReaderSummary += fileName + separator;

            if (thread.position && thread.position.endLine) {
                if (thread.position.startLine !== thread.position.endLine) {
                    screenReaderSummary += Utils_String.format(VCResources.PullRequest_DiscussionThread_ScreenReaderLineRangeSummary, thread.position.startLine, thread.position.endLine) + separator;
                }
                else {
                    screenReaderSummary += Utils_String.format(VCResources.PullRequest_DiscussionThread_ScreenReaderLineSummary, thread.position.endLine) + separator;
                }
            }
        }

        screenReaderSummary += this._buildScreenReaderCommentSummary();

        return screenReaderSummary;
    }

    private _buildScreenReaderCommentSummary(): string {
        const comments = this.props.thread.comments;
        return comments.length > 1 ? Utils_String.format(VCResources.PullRequest_DiscussionThread_ScreenReaderCommentsSummaryPlural, comments.length) :
            Utils_String.format(VCResources.PullRequest_DiscussionThread_ScreenReaderCommentsSummary, comments.length);
    }
}
