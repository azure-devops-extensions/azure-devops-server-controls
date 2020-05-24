import * as React from "react";
import { autobind } from "OfficeFabric/Utilities";
import { DiscussionThread, DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { OverviewDiscussionCommentHint } from "Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import Activity = require("VersionControl/Scripts/Components/PullRequestReview/Activities/Activity");
import { DiscussionThreadHost } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost";
import { AddCommentAction } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { IdentityRef } from "VSS/WebApi/Contracts";

// This component allows the user to post comments about the pull request from
// the activity feed
export class PRNewComment extends Activity.Component<Activity.IThreadActivityProps, Activity.IActivityState> {
    private _focusCommentArea: boolean;
    private _discussonThreadHost: DiscussionThreadHost;

    constructor(props: Activity.IThreadActivityProps) {
        super(props);
        this.state = { isFocused: false };
    }

    public render(): JSX.Element {
        const comment: DiscussionComment = (this.props.thread.comments && this.props.thread.comments[0]);
        const showComment: boolean = (comment && comment.newContent !== null);

        const discussionHost = <DiscussionThreadHost threadId={this.props.thread.id} key={this.props.thread.id} />;
        const previewElement = <OverviewDiscussionCommentPreview onCreateComment={this._createCommentContent} />

        // TODO: Story #1223092 - make it so tfsContext can serve new graphUrl when appropriate, for now create a fake identity
        const identityFake = { id: this.props.tfsContext.currentIdentity.id } as IdentityRef;

        return this._renderContainer(
            (!showComment && this._tfIdImage(identityFake)) || null,
            (showComment && discussionHost) || previewElement,
            null,
            null,
            null,
            null,
            "discussion-input bowtie",
            AddCommentAction);
    }

    /**
     * Saves the comment with empty newContent to put this component into edit mode
     */
    @autobind
    private _createCommentContent(initialContent?: string) {
        this._focusCommentArea = true;

        if (this.props.thread.comments && this.props.thread.comments[0]) {
            const commentClone = $.extend({}, this.props.thread.comments[0]) as DiscussionComment;
            if (initialContent) {
                commentClone.newContent = initialContent;
                commentClone.isDirty = true;
            }
            else {
                commentClone.newContent = "";
            }
            Flux.instance().actionCreator.discussionActionCreator.saveComment(this.props.thread, commentClone);
            Flux.instance().actionCreator.discussionActionCreator.selectComment(this.props.thread.id, commentClone.id);
        }
    }

    protected _getTimelineIconClass(): string {
        return "bowtie-comment-add";
    }

    protected _getTimelineLineClass(): string {
        return super._getTimelineLineClass() + " dotted";
    }
}

interface IOverviewDiscussionCommentPreviewProps {
    onCreateComment(initialContent?: string): void;
}

/**
 * Component that is displayed to indicate where a new overall discussion comment can be entered.
 * Follows DiscussionCommentPreview, but has enough tweaks that are specific to the activity feed.
 */
class OverviewDiscussionCommentPreview extends React.Component<IOverviewDiscussionCommentPreviewProps, {}> {
    private _mouseDown: boolean;

    constructor(props) {
        super(props);
    }

    public render(): JSX.Element {
        return (
            <div className={"vc-overview-discussion-inputArea"} >
                <input
                    className={"markdowninputwidget-textarea"}
                    onFocus={this._onFocus}
                    onChange={this._onChange}
                    onMouseDown={this._onMouseDown}
                    onMouseUp={this._onMouseUp}
                    aria-label={OverviewDiscussionCommentHint}
                    placeholder={OverviewDiscussionCommentHint} />
            </div>
        );
    }

    @autobind
    private _onMouseDown(): void {
        this._mouseDown = true;
    }

    @autobind
    private _onMouseUp(): void {
        this._mouseDown = false;
    }

    @autobind
    private _onFocus(event: React.FocusEvent<HTMLInputElement>): void {
        // we track mouse down/up to ensure that this focus swap occured because of a mouse event
        // If we are getting focus because of a mouse click, we want to start a new comment
        // If we are getting focus because of a keyboard event, then ignore it
        if(this._mouseDown) {
            this.props.onCreateComment();
        }
    }

    @autobind
    private _onChange(event: React.FormEvent<HTMLInputElement>): void {
        this.props.onCreateComment((event.target as HTMLInputElement).value);
    }
}
