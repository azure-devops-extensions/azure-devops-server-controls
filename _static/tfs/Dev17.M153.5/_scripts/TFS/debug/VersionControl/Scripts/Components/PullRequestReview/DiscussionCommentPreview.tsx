import * as React from "react";
import { DefaultButton } from "OfficeFabric/Button";
import { autobind, css } from "OfficeFabric/Utilities";
import VSS_Telemetry = require("VSS/Telemetry/Services");
import { IdentityRef } from "VSS/WebApi/Contracts";
import DiscussionResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Discussion");
import { DiscussionThread as IDiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import DiscussionOM = require("Presentation/Scripts/TFS/TFS.Discussion.OM");
import { DiscussionStatus } from "Presentation/Scripts/TFS/Generated/TFS.Discussion.Constants";
import IdentityImage = require("Presentation/Scripts/TFS/Components/IdentityImage");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export interface IDiscussionCommentPreviewProps {
    thread: IDiscussionThread;
    threadIsResolved?: boolean;
    tfsContext: TfsContext;
    focusReplyBox?: boolean;
    hasPermissionToUpdateCommentStatus: boolean;
}

export class DiscussionCommentPreview extends React.Component<IDiscussionCommentPreviewProps, {}> {
    private _mouseDown: boolean;
    private _input: HTMLInputElement;

    public render(): JSX.Element {
        return (
            <div role={"listitem"} className={"vc-discussion-thread-comment reply"}>
                {this._drawAvatar()}
                <div className={"vc-discussion-inputArea preview"}>
                    {this._drawInputArea()}
                    {this._drawStatusToggleButton()}
                </div>
            </div>
        );
    }

    public componentDidUpdate(prevProps: IDiscussionCommentPreviewProps): void {
        if (this.props.focusReplyBox && this._input) {
            this._input.focus();
        }
    }

    private _drawAvatar(): JSX.Element {
        const author = {
            id: this.props.tfsContext.currentIdentity.id,
            displayName: this.props.tfsContext.currentIdentity.displayName
        }

        return (
            <div aria-hidden>
                <IdentityImage.Component
                    tfsContext={this.props.tfsContext}
                    cssClass={"vc-discussion-comment-identity transparent preview"}
                    size={IdentityImage.imageSizeSmall}
                    identity={author as IdentityRef} />
            </div>);
    }

    private _drawInputArea(): JSX.Element {
        return (
            <div className={"markdowninputwidget-textarea-previewcontainer"}>
                <input ref={this._setInput}
                    className={"markdowninputwidget-textarea"}
                    onMouseDown={this._onMouseDown}
                    onMouseUp={this._onMouseUp}
                    onFocus={this._createComment}
                    onChange={this._createCommentWithContent}
                    placeholder={DiscussionResources.DiscussionCommentHint} />
            </div>
        );
    }

    private _drawStatusToggleButton(): JSX.Element {
        const statusToggleButtonText: string = this.props.threadIsResolved
            ? DiscussionResources.DiscussionCommentReactivate
            : DiscussionResources.DiscussionCommentResolve;

        return (
            <DefaultButton 
                onClick={this._toggleStatus}
                type={"button"}
                disabled={!this.props.hasPermissionToUpdateCommentStatus}
                className={"toggle-status-button"}>
                {statusToggleButtonText}
            </DefaultButton>);
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
    private _createComment(event): void {
        // we track mouse down/up to ensure that this focus swap occured because of a mouse event
        // If we are getting focus because of a mouse click, we want to start a new comment
        // If we are getting focus because of a keyboard event, then ignore it
        if (this._mouseDown) {
            const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
            discussionActionCreator.addComment(this.props.thread);
        }
    }

    @autobind
    private _createCommentWithContent(event: React.FormEvent<HTMLInputElement>): void {
        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.addComment(this.props.thread, undefined, (event.target as HTMLInputElement).value);
    }

    @autobind
    private _toggleStatus(): void {
        const status: DiscussionStatus = this.props.threadIsResolved ? DiscussionStatus.Active : DiscussionStatus.Fixed;

        const telemetryEvent = new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_REPLY_AND_RESOLVE_FEATURE, {
                commit: false,
                oldStatus: this.props.thread.status,
                newStatus: status
            });
        VSS_Telemetry.publishEvent(telemetryEvent);

        const discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        discussionActionCreator.setThreadStatus(this.props.thread, status);
    }

    @autobind
    private _setInput(input: HTMLInputElement): void {
        this._input = input;
    }
}
