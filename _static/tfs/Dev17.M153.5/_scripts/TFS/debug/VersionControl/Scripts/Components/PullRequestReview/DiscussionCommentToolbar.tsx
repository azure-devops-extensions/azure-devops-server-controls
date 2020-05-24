import * as React from "react";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { IconButton, DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { autobind } from "OfficeFabric/Utilities";
import * as VSSDialogs from "VSS/Controls/Dialogs";
import * as VSSTelemetry from "VSS/Telemetry/Services";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as DiscussionResources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { DiscussionThread, DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { DiscussionCommentLikesButton } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionCommentLikesButton";
import { CommentFeedbackDialog, ICommentFeedbackDialogOptions } from "VersionControl/Scripts/Components/PullRequestReview/CommentFeedbackDialog";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export interface IDiscussionCommentToolbarProps extends React.Props<void> {
    tfsContext: TfsContext;
    thread: DiscussionThread,
    comment: DiscussionComment,
    feedbackIsEnabled: boolean,
    commentEditIsEnabled: boolean;
    commentLikesIsEnabled: boolean;
}

export interface IDiscussionCommentToolbarState {
    isConfirmDialogVisible?: boolean;
}

/**
 * This is the collection of actions that can be performed on a discussion comment
 * Edit button: sets the comment as selected which will trigger it to shift to editing mode
 * Delete button: deletes the comment
 * Like button: likes the comment
 */
export class DiscussionCommentToolbar extends React.PureComponent<IDiscussionCommentToolbarProps, IDiscussionCommentToolbarState> {
    public constructor(props: IDiscussionCommentToolbarProps, state: IDiscussionCommentToolbarState) {
        super(props, state);

        this.state = {};
    }

    public render(): JSX.Element {
        const canEdit: boolean = this.props.commentEditIsEnabled && this.props.comment.isEditable;
        const canLeaveFeedback: boolean = this.props.feedbackIsEnabled;
        const canLike: boolean = this.props.commentLikesIsEnabled;

        if (!canEdit && !canLeaveFeedback && !canLike) {
            return null;
        }

        return (
            <span className={"vc-discussion-comment-toolbar"}>
                { canLeaveFeedback &&
                    <IconButton 
                        className={"vc-discussion-comment-toolbarbutton"}
                        title={DiscussionResources.CommentFeedbackActionTooltip}
                        iconProps={{className: "bowtie-icon bowtie-feedback-negative-outline"}}
                        onClick={this._showFeedbackDialog} /> }
                
                { canEdit &&
                    <IconButton 
                        className={"vc-discussion-comment-toolbarbutton"}
                        title={DiscussionResources.DiscussionCommentEdit}
                        iconProps={{className: "bowtie-icon bowtie-edit"}}
                        onClick={this._editComment} /> }

                { this.state.isConfirmDialogVisible &&
                    <Dialog 
                        hidden={false}
                        dialogContentProps={{
                            type: DialogType.close,
                            subText: VCResources.DiscussionCommentDeleteConfirmation,
                            title: VCResources.DiscussionCommentDeleteTitle
                        }}
                        onDismiss={this._cancelDeleteComment}
                        modalProps={{
                            isBlocking: true,
                            className: "deleteCommentDialog",
                            containerClassName: "deleteComment-container",
                        }}
                        closeButtonAriaLabel={VCResources.DiscussionCommentDeleteCancel}>
                        <DialogFooter>
                            <PrimaryButton onClick={this._deleteComment}>{VCResources.DiscussionCommentDeleteConfirm}</PrimaryButton>
                            <DefaultButton onClick={this._cancelDeleteComment}>{VCResources.DiscussionCommentDeleteCancel}</DefaultButton>
                        </DialogFooter>
                    </Dialog>
                }

                { canEdit &&
                    <IconButton 
                        className={"vc-discussion-comment-toolbarbutton"}
                        title={DiscussionResources.DiscussionCommentDelete}
                        iconProps={{className: "bowtie-icon bowtie-edit-delete"}}
                        onClick={this._confirmDeleteComment} /> }

                { canLike &&
                    <DiscussionCommentLikesButton
                        tfsContext={this.props.tfsContext}
                        comment={this.props.comment}
                        onCreateLike={this._createLike}
                        onDeleteLike={this._deleteLike} /> }
            </span>
        );
    }

    @autobind
    private _confirmDeleteComment() {
        this.setState({isConfirmDialogVisible: true});
    }

    @autobind
    private _deleteComment() {
        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.deleteComment(this.props.thread, this.props.comment);
    }

    @autobind
    private _cancelDeleteComment() {
        this.setState({isConfirmDialogVisible: false});
    }

    @autobind
    private _editComment() {
        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.selectComment(this.props.thread.id, this.props.comment.id);
    }

    @autobind
    private _createLike(): void {
        const telemetryEvent = new VSSTelemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_LIKE_COMMENT_FEATURE, {
                like: true,
                likesPrevious: (this.props.comment && this.props.comment.usersLiked && this.props.comment.usersLiked.length),
            });
        VSSTelemetry.publishEvent(telemetryEvent);

        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.createCommentLike(this.props.thread, this.props.comment);
    }

    @autobind
    private _deleteLike(): void {
        const telemetryEvent = new VSSTelemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_LIKE_COMMENT_FEATURE, {
                like: false,
                likesPrevious: (this.props.comment && this.props.comment.usersLiked && this.props.comment.usersLiked.length),
            });
        VSSTelemetry.publishEvent(telemetryEvent);

        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.deleteCommentLike(this.props.thread, this.props.comment);
    }

    @autobind
    private _showFeedbackDialog() {
        VSSDialogs.show(CommentFeedbackDialog, { thread: this.props.thread } as ICommentFeedbackDialogOptions);
    }
}
