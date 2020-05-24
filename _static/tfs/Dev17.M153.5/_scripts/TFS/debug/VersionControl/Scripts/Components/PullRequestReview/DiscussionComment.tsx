import * as React from "react";
import { CSSTransitionGroup } from "react-transition-group";
import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { autobind, css } from "OfficeFabric/Utilities";
import Diag = require("VSS/Diag");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import DiscussionResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion");
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { 
    DiscussionAttachment,
    DiscussionThread as IDiscussionThread,
    DiscussionComment as IDiscussionComment,
    DiscussionCommentUtils 
} from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionWebApiConstants, DiscussionStatus } from "Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants";
import IdentityImage = require("Presentation/Scripts/TFS/Components/IdentityImage");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IDiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { IAttachmentsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IAttachmentsStore";
import { IAttachmentActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IAttachmentActionCreator";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import Mixins = require("VersionControl/Scripts/Components/PullRequestReview/Mixins");
import { DiscussionCommentToolbar } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionCommentToolbar";
import { DiscussionThreadStatusMenu } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadStatusMenu";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { RenderedContent } from "Discussion/Scripts/Components/RenderedContent/RenderedContent";
import { MarkdownInputWidget } from "Discussion/Scripts/Components/MarkdownInputWidget/MarkdownInputWidget"
import { IDiscussionThreadHost } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadHost";
import { DiscussionCommentHeader } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionCommentHeader";

export interface IDiscussionCommentProps {
    thread: IDiscussionThread;
    comment: IDiscussionComment;
    threadIsResolved?: boolean;
    commentLikesIsEnabled?: boolean;
    feedbackIsEnabled?: boolean;
    key: number;
    tfsContext: TfsContext;
    isFirstComment: boolean;
    showAvatar: boolean;
    showCancel: boolean;
    showContext: boolean;
    onCancel?(): void;
    onSave?(): void;
    ref?: any;
    host?: IDiscussionThreadHost;
    validAttachmentTypes: string[];
    hasPermissionToAddEditComment: boolean;
    hasPermissionToLikeComment: boolean;
    hasPermissionToUpdateCommentStatus: boolean;
}

export interface IDiscussionCommentState {
    selected?: boolean;
    attachmentUploadError?: boolean;
    validationError?: string;
    statusMenuExpanded?: boolean;
}

export interface IDiscussionThreadRenderPassData {
    lockView: boolean;
}

export class DiscussionComment extends Mixins.DiagnosticComponent<IDiscussionCommentProps, IDiscussionCommentState> {
    private _textControl: HTMLInputElement = null;
    private _everRendered: boolean;
    private _ignoreFocusChange: boolean;
    private _mounted: boolean = false;
    private _discussionStore: IDiscussionsStore;
    private _attachmentStore: IAttachmentsStore;

    constructor(props) {
        super(props);

        this._everRendered = false;
        this._ignoreFocusChange = false;
        this.state = this._getState();
    }

    public render(): JSX.Element {
        const comment: IDiscussionComment = this.props.comment;
        const commentClassName: string = css("vc-discussion-thread-comment", {
            "reply": !this.props.isFirstComment,
            "showBorder": this.props.isFirstComment && comment.id > 0,
            "isnew": comment.hasUnseenContent,
        });

        if (comment.isDeleted) {
            return this._drawDeletedComment(commentClassName);
        }

        const showInputArea: boolean = this._showInputArea();
        const showStatus: boolean = this.props.isFirstComment && this.props.thread.id > 0 && !showInputArea;

        let header: JSX.Element = null;
        if (!showInputArea) {
            header = <DiscussionCommentHeader
                thread={this.props.thread}
                date={this.props.comment.lastContentUpdatedDate}
                tfsContext={this.props.tfsContext}
                author={this.props.comment.author}
                showAuthorName={true}
                showSpinner={this.props.comment.isComitting}
                showContext={this.props.showContext && showStatus}
                hasUnseenContent={this.props.comment.hasUnseenContent} />;
        }

        const showToolbar: boolean = this.props.comment.id > 0 && !showInputArea && !comment.isComitting;
        const attachmentsEnabled: boolean = this._attachmentsEnabled();
        const clickableTaskLists = this.props.hasPermissionToAddEditComment && this.props.comment.isEditable && !showInputArea && !this.props.comment.isComitting;

        const commentArea = <div className={commentClassName} role={"listitem"}>
            {this.props.showAvatar && this._drawAvatar()}
            <div className={css("vc-discussion-thread-comment-content", { "noavatar": !this.props.showAvatar }, { "relative": !showInputArea })}>
                {header}
                {this._drawInputArea(showInputArea, attachmentsEnabled)}
                <RenderedContent 
                    content={this._commentContent()}
                    className={"vc-discussion-thread-renderparent"}
                    render={ServiceRegistry.getService(IDiscussionsStore).getDiscussionRenderer().render}
                    renderPassData={{ lockView: this.props.thread.id > 0 && this.props.comment.cameFromSignalR }}
                    renderPassFinished={this._renderPassFinished}
                    taskItemClicked={clickableTaskLists && this._onTaskItemClicked}/>
                <div className={css("vc-discussion-thread-status-area", { "forceShowButtons": this.state.statusMenuExpanded })}>
                    {showToolbar && 
                        <DiscussionCommentToolbar
                            tfsContext={this.props.tfsContext}
                            thread={this.props.thread}
                            comment={this.props.comment}
                            feedbackIsEnabled={this.props.feedbackIsEnabled && this.props.isFirstComment && !!this.props.thread.trackingCriteria}
                            commentEditIsEnabled={this.props.hasPermissionToAddEditComment}
                            commentLikesIsEnabled={this.props.hasPermissionToLikeComment && this.props.commentLikesIsEnabled} />}
                    {showStatus &&
                        <DiscussionThreadStatusMenu
                            thread={this.props.thread}
                            isDisabled={!this.props.hasPermissionToUpdateCommentStatus}
                            onMenuExpanded={this._onStatusMenuExpanded}
                            onMenuCollapsed={this._onStatusMenuCollapsed} />}
                </div>
            </div>
        </div>;

        return commentArea;
    }

    public shouldComponentUpdate(nextProps: IDiscussionCommentProps, nextState: IDiscussionCommentState): boolean {
        const changed = this.state.selected !== nextState.selected ||
            this.props.comment !== nextProps.comment ||
            this.props.thread !== nextProps.thread ||
            this.props.isFirstComment !== nextProps.isFirstComment ||
            this.props.showCancel !== nextProps.showCancel ||
            this.props.showAvatar !== nextProps.showAvatar ||
            this.props.hasPermissionToAddEditComment !== nextProps.hasPermissionToAddEditComment ||
            this.props.hasPermissionToLikeComment !== nextProps.hasPermissionToLikeComment ||
            this.props.hasPermissionToUpdateCommentStatus !== nextProps.hasPermissionToUpdateCommentStatus ||
            this.state.attachmentUploadError !== nextState.attachmentUploadError ||
            this.state.validationError !== nextState.validationError ||
            this.state.statusMenuExpanded !== nextState.statusMenuExpanded;            
        return changed;
    }

    public componentDidMount(): void {
        super.componentDidMount();

        this._mounted = true;
        this._discussionStore = ServiceRegistry.getService(IDiscussionsStore);
        if (this._discussionStore) {
            this._discussionStore.addChangedListener(this._onChange);
        }
        this._attachmentStore = ServiceRegistry.getService(IAttachmentsStore);
        if (this._attachmentStore) {
            this._attachmentStore.addChangedListener(this._onChange);
        }

        if (this._textControl) {
            // When first mounting discussion input, move the cursor to the end
            // This was naturally happening for most browsers but IE likes to be special
            let selectionEnd = this._textControl.textContent ? this._textControl.textContent.length : 0;
            this._textControl.selectionStart = this._textControl.selectionEnd = selectionEnd;
        }

        this.componentDidUpdate();
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        this._mounted = false;

        if (this._discussionStore) {
            this._discussionStore.removeChangedListener(this._onChange);
            this._discussionStore = null;
        }

        if (this._attachmentStore) {
            this._attachmentStore.removeChangedListener(this._onChange);
            this._attachmentStore = null;
        }
    }

    public componentDidUpdate(prevProps?: IDiscussionCommentProps, prevState?: IDiscussionCommentState): void {
        super.componentDidUpdate();

        const wasSelected = prevState && prevState.selected;
        if (this.state.selected && !wasSelected && this._textControl) {
            this._ignoreFocusChange = true;
            this._textControl.focus();
            this._ignoreFocusChange = false;
        }

    }

    private _getState(): IDiscussionCommentState {
        const discussionsStore = ServiceRegistry.getService(IDiscussionsStore);
        const attachmentStore = ServiceRegistry.getService(IAttachmentsStore);
        const pendingAttachmentNames = this.props.comment.pendingAttachments;
        const attachments = (attachmentStore && attachmentStore.getAttachmentsByName(pendingAttachmentNames)) || [];
        const anyError = attachments.filter(a => a.error != undefined).length > 0;

        return {
            selected: discussionsStore.getSelectedDiscussionId() == this.props.thread.id
                && discussionsStore.getSelectedCommentId() == this.props.comment.id,
            attachmentUploadError: anyError
        };
    }

    private _drawAvatar(): JSX.Element {
        const className = "vc-discussion-comment-identity cursor-hover-card";
        return <div>
            <IdentityImage.Component
                tfsContext={this.props.tfsContext}
                cssClass={className}
                size={IdentityImage.imageSizeSmall}
                identity={this.props.comment.author}
                showProfileCardOnClick={true}
                isTabStop={true}
            />
        </div>;
    }

    private _drawDeletedComment(className: string): JSX.Element {
        return <div className={className + " deleted"} role={"listitem"}>
            <span className={"deletedCommentCircle"} />
            <span className={"deletedCommentText"}>{DiscussionResources.DiscussionCommentDeleted}</span>
        </div>
    }

    private _drawInputArea(showInputArea: boolean, attachmentsEnabled: boolean): JSX.Element {

        if (!showInputArea) {
            // always build in the input area even if its hidden so that autocomplete can attach to it and begin its initialization

            // previous I had the above comment. But this gets difficult not that I've refactored parts of this out of this file
            // experimenting with not rendering input area to see how it really feels
            // not re-writing this to just not call _drawInputArea just yet because I want to see how it feels on mseng and if I get complaints
            // about mention perf dropping.
            return null;
        }

        const content = this._commentContent();

        const inputContainerClass = showInputArea ? "vc-discussion-inputArea" : "vc-discussion-inputArea-hidden";

        let saveButtonText: string = null;
        let saveAndToggleStatusButtonText: string = null;

        if (this.props.comment.id > 0) {
            saveButtonText = DiscussionResources.DiscussionCommentUpdate;
            saveAndToggleStatusButtonText = this.props.threadIsResolved
                ? DiscussionResources.DiscussionCommentUpdateAndReactivate
                : DiscussionResources.DiscussionCommentUpdateAndResolve;

        }
        else {
            if (this.props.isFirstComment) {
                saveButtonText = DiscussionResources.DiscussionCommentSave;
            }
            else {
                saveButtonText = DiscussionResources.DiscussionCommentReply;
                saveAndToggleStatusButtonText = this.props.threadIsResolved
                    ? DiscussionResources.DiscussionCommentReplyAndReactivate
                    : DiscussionResources.DiscussionCommentReplyAndResolve;
            }
        }

        let saveAndToggleStatusButton: JSX.Element = null;
        if (saveAndToggleStatusButtonText) {
            saveAndToggleStatusButton =
                <DefaultButton
                    className={"vc-discussion-button"}
                    onClick={this._commitCommentAndToggleStatus}
                    onKeyPress={this._commitCommentAndToggleStatus}
                    disabled={!DiscussionCommentUtils.hasNewContent(this.props.comment) || !this.props.hasPermissionToUpdateCommentStatus}>
                    {saveAndToggleStatusButtonText}
                </DefaultButton>;
        }

        let cancelButton: JSX.Element = null;
        if (this.props.showCancel) {
            cancelButton =
                <DefaultButton
                    className={"vc-discussion-button"}
                    onClick={this._cancelComment}>
                    {DiscussionResources.DiscussionCommentCancel}
                </DefaultButton>;
        }

        let errorString: string = null;
        let retryAction: JSX.Element = null;
        if (this.state.validationError) {
            errorString = this.state.validationError;
        }
        else if (this.state.attachmentUploadError) {
            errorString = VCResources.AttachmentError;
            retryAction = 
                <DefaultButton 
                    className={"vc-discussion-retry-button"} 
                    onClick={ () => this._retryAttachments() } >
                        {VCResources.AttachmentRetry}
                </DefaultButton>
        }

        const buttonArea = <span className="vc-discussion-thread-buttonarea">
            <PrimaryButton className={"cta vc-discussion-button"}
                onClick={this._commitComment}
                onKeyPress={this._commitComment}
                disabled={!DiscussionCommentUtils.hasNewContent(this.props.comment)}
                title={Utils_String.format(VCResources.DiscussionCommentSaveTooltip, saveButtonText)}>
            {saveButtonText}</PrimaryButton>
            {saveAndToggleStatusButton}
            {cancelButton}
        </span>

        let showAnimation = !this.props.isFirstComment && this.props.comment.id < 0;

        return <div className={inputContainerClass}>
            <CSSTransitionGroup transitionName={"discussion-input-expand"} transitionEnter={false} transitionLeave={false} transitionAppear={showAnimation} transitionAppearTimeout={300} >
                <MarkdownInputWidget
                    textAreaRef={this._refTextControl}
                    artifactUri={this.props.thread.artifactUri}
                    onTextChange={this._textChanged}
                    onFocus={this._onFocus}
                    value={content}
                    maxLength={DiscussionWebApiConstants.MaxCommentContentLength}
                    onKeyDown={this._onKeyDown}
                    onAttachmentsAdded={this._addAttachments}
                    error={errorString}
                    dismissError={this.state.validationError && this._clearError}
                    statusBarActions={retryAction}
                    enableAttachments={attachmentsEnabled}
                    aria-label={VCResources.PullRequest_CommentTextAreaAriaLabel}
                    validAttachmentTypes={this.props.validAttachmentTypes}
                    buttonArea={buttonArea}/>
            </CSSTransitionGroup>
        </div>;
    }

    private _attachmentsEnabled(): boolean {
        const attachmentActionCreator = ServiceRegistry.getService(IAttachmentActionCreator);
        return !!attachmentActionCreator;
    }

    /**
     * Focus this control (focus the comment input text area).
     */
    public focus() {
        if (this._textControl) {
            Utils_UI.tryFocus(this._textControl);
        }
    }

    private _drawDivider(): JSX.Element {
        return (<div className="vc-discussion-thread-renderdivider"></div>);
    }

    @autobind
    private _clearError() {
        this.setState({ validationError: undefined } as any);
    }

    @autobind
    private _onFocus(event) {
        if (!this._ignoreFocusChange) {
            this._selectComment(event);
        }
    }

    private _selectComment(event) {
        if (this.props.comment.isEditable) {
            const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
            discussionActionCreator.selectComment(this.props.thread.id, this.props.comment.id);
        }
    }

    private _unselectComment(event) {
        if (this.state.selected) {
            const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
            discussionActionCreator.selectComment(null, null);
        }
    }

    @autobind
    private _textChanged(value: string): void {
        const commentClone = { ...this.props.comment } as IDiscussionComment;
        commentClone.isDirty = true;
        commentClone.newContent = value;
        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.saveComment(this.props.thread, commentClone);
    }

    @autobind
    private _onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (event.ctrlKey && event.key === "Enter" && DiscussionCommentUtils.hasNewContent(this.props.comment)) {

            // force blur the text control before processing ctrl+enter to work around an edge bug
            if (this._textControl) {
                this._textControl.blur();
            }

            this._commitComment(event);
        }
        else if (event.key == "Escape") {
            //Cancel if no changes have been made
            if (!DiscussionCommentUtils.hasNewContent(this.props.comment)) {
                this._cancelComment(event);
            }
        }
    }

    @autobind
    private _addAttachments(files: File[]) {
        if (!files || files.length === 0) {
            return;
        }

        let markdownText = "";
        const commentClone = $.extend({}, this.props.comment) as IDiscussionComment;

        let error: string;
        for (const file of files) {
            const isImage = file.type.indexOf("image/") === 0;
            let fileName = file.name;

            //file.name should only be undefined when pasting images
            //browse and drag/drop will supply a file name
            if (!fileName) {
                Diag.Debug.assert(isImage);
                const imageType = file.type.substring("image/".length);
                fileName = GUIDUtils.newGuid() + "." + imageType;
            }

            const attachmentStore = ServiceRegistry.getService(IAttachmentsStore);
            const validation = attachmentStore.validateFile(fileName, file);
            if (!validation.valid) {
                error = validation.errorMsg;
                continue;
            }
            const uniqueName = attachmentStore.getUniqueFileName(fileName);

            const blob = new Blob([file], { type: file.type });
            const blobUrl = URL.createObjectURL(blob);
            markdownText += (isImage ? "![" : "[") + fileName + "](" + blobUrl + ") ";

            const newAttachment: DiscussionAttachment = {
                fileName: uniqueName,
                file: file,
                url: blobUrl,
                uploadFinished: false
            };
            const attachmentActionCreator = ServiceRegistry.getService(IAttachmentActionCreator);
            attachmentActionCreator.addAttachment(newAttachment);
            commentClone.pendingAttachments = commentClone.pendingAttachments || [];
            commentClone.pendingAttachments.push(newAttachment.fileName);
        }

        if (markdownText && this._textControl) {
            const selectionStart = this._textControl.selectionStart;
            const selectionEnd = this._textControl.selectionEnd;
            const currentText = this._textControl.textContent;

            const firstPart = currentText.substring(0, selectionStart);
            const endPart = currentText.substring(selectionEnd);
            const newText = firstPart + markdownText + endPart;

            commentClone.isDirty = true;
            commentClone.newContent = newText;

            const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
            discussionActionCreator.saveComment(this.props.thread, commentClone);
        }

        if (error != this.state.validationError) {
            this.setState({ validationError: error } as any);

            const telemEvent = new VSS_Telemetry.TelemetryEventData(
                CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
                CustomerIntelligenceConstants.PULL_REQUEST_CREATE_ATTACHMENT_ERROR, {
                    location: "comment",
                    error: error
                });
            VSS_Telemetry.publishEvent(telemEvent);
        }
    }

    private _retryAttachments(): void {
        const attachmentActionCreator = ServiceRegistry.getService(IAttachmentActionCreator);
        attachmentActionCreator.commitAttachments(this._commentContent());
    }
    
    private _toolbarTextChange(newText: string, selectionStart: number, selectionEnd: number): void {
        if (newText) {
            const commentclone = { ...this.props.comment }
            commentclone.isDirty = true;
            commentclone.newContent = newText;

            const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
            discussionActionCreator.saveComment(this.props.thread, commentclone);
        }
    }
    
    @autobind
    private _commitCommentAndToggleStatus(event) {
        const status: DiscussionStatus = this.props.threadIsResolved ? DiscussionStatus.Active : DiscussionStatus.Fixed;

        const telemetryEvent = new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_REPLY_AND_RESOLVE_FEATURE, {
                commit: true,
                oldStatus: this.props.thread.status,
                newStatus: status
            });
        VSS_Telemetry.publishEvent(telemetryEvent);

        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.commitCommentAndChangeStatus(this.props.thread, this.props.comment, status, event.type === "keypress");
        this._postCommitComment(event);
    }

    @autobind
    private _commitComment(event): void {
        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.commitComment(this.props.thread, this.props.comment, undefined, event.type === "keypress");
        this._postCommitComment(event);
    }

    private _postCommitComment(event): void {
        this._unselectComment(event);

        if (this.props.onSave) {
            this.props.onSave();
        }
    }

    @autobind
    private _cancelComment(event) {
        if (this.props.onCancel) {
            // If a cancel function was provided - then we want to clear the comment and call back into this function.
            // This is to support using this component in the Activity Feed Discussion Comment input.
            const commentClone = $.extend({}, this.props.comment) as IDiscussionComment;
            commentClone.newContent = null;
            commentClone.isDirty = false;
            const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
            discussionActionCreator.saveComment(this.props.thread, commentClone);

            this.props.onCancel();
        }
        else {
            const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
            discussionActionCreator.cancelComment(this.props.thread, this.props.comment);
        }
        this._unselectComment(event);
    }

    @autobind
    private _onChange(): void {
        if (this._mounted) {
            this.setState(this._getState());
        }
    }
    
    private _showInputArea(): boolean {
        const content = this._commentContent();
        const comment = this.props.comment;
        return this.state.selected || !comment || !content || (comment.isDirty && !comment.isComitting);
    }

    @autobind
    private _refTextControl(textControl: HTMLElement): void {
        this._textControl = textControl as HTMLInputElement;
    }

    @autobind
    private _commentContent(): string {
        // empty string is valid new content
        const haveNewContent = this.props.comment.newContent !== null && this.props.comment.newContent !== undefined;
        return haveNewContent ? this.props.comment.newContent : this.props.comment.content;
    }

    @autobind
    private _onStatusMenuExpanded(): void {
        this.setState({ statusMenuExpanded: true });
    }

    @autobind
    private _onStatusMenuCollapsed(): void {
        this.setState({ statusMenuExpanded: false });
    }

    @autobind
    private _renderPassFinished(renderPassData: IDiscussionThreadRenderPassData, sizeChanged: boolean): void {
        this.props.host && this.props.host.renderPassFinished(renderPassData.lockView, sizeChanged);
    }
    
    @autobind
    private _onTaskItemClicked(newContent: string): void {
        const commentclone = { ...this.props.comment }
        commentclone.content = newContent;
        commentclone.newContent = newContent;
        commentclone.isDirty = true;

        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.commitComment(this.props.thread, commentclone);
    }
}
