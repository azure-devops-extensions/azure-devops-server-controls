import * as React from "react";
import { Spinner } from "OfficeFabric/Spinner";

import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

import { WorkItemDiscussionFactory, IWorkItemDiscussionIterator, IWorkItemDiscussionComment } from "WorkItemTracking/Scripts/OM/History/Discussion";
import { WorkItemBindableComponent } from "WorkItemTracking/Scripts/Form/React/Components/WorkItemBindableComponent";
import { MessagePreviewComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/DiscussionComponent/MessagePreviewComponent";
import { WorkItemDiscussionComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/DiscussionComponent/WorkItemDiscussionComponent";
import { DiscussionAvatarComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/DiscussionComponent/DiscussionAvatarComponent";
import { FormContextItems, IOpenFullScreen } from "WorkItemTracking/Scripts/Form/Mobile/Interfaces";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { DiscussionTelemetryUtils } from "WorkItemTracking/Scripts/Form/Mobile/MobileTelemetryUtils";
import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as Utils_String from "VSS/Utils/String";

export interface IWorkItemDiscussionPreviewState {
    message: IWorkItemDiscussionComment;
    unsaved: boolean;
    totalCount: number;
    previewState: PreviewState;
}

export enum PreviewState {
    Loading,
    Unsaved,
    MessagePreview
}

export class WorkItemDiscussionPreviewComponent extends WorkItemBindableComponent<{}, IWorkItemDiscussionPreviewState> {
    private _discussionIterator: IWorkItemDiscussionIterator;
    private _comments: IWorkItemDiscussionComment[];
    private _contentRenderer: { [previewState: number]: () => JSX.Element } = {};

    constructor(props, context) {
        super(props, context);
        this._comments = [];
        this.state = {
            message: null,
            totalCount: -1,
            unsaved: false,
            previewState: PreviewState.Loading
        };

        this._subscribeToWorkItemFieldChanges(WITConstants.CoreFieldRefNames.History);
        this._subscribeToWorkItemChanges();

        this._contentRenderer[PreviewState.Loading] = this._getLoadingComponent;
        this._contentRenderer[PreviewState.Unsaved] = this._getUnsavedComponent;
        this._contentRenderer[PreviewState.MessagePreview] = this._getMessageComponent;
    }

    public render(): JSX.Element {
        return <div>
            <button className="mobile-discussion-preview" onClick={this._onClick} >
                {this._contentRenderer[this.state.previewState]()}
            </button>
        </div>;
    }

    protected _bind(workItem: WITOM.WorkItem, isDisabledView?: boolean) {
        this._discussionIterator = WorkItemDiscussionFactory.getDiscussionIterator(workItem);
        const messages = this._discussionIterator.next(1);

        messages.then((result) => {
            const latestComment = result.comments && result.comments.length > 0 ? result.comments[0] : null;
            if (!this.state.message || (this.state.message !== latestComment)) {
                this.setState({
                    message: latestComment,
                    totalCount: result.totalCount,
                    unsaved: this.state.unsaved,
                    previewState: this.state.unsaved ? PreviewState.Unsaved : PreviewState.MessagePreview
                });
            }
        });
    }

    protected _unbind() {
        this._discussionIterator = null;

        this.setState({
            message: null,
            totalCount: -1,
            unsaved: false,
            previewState: PreviewState.Loading
        });
    }

    protected _workItemFieldChanged(field: WITOM.Field) {
        if (field.fieldDefinition.referenceName === WITConstants.CoreFieldRefNames.History) {
            const unsaved = field.getValue().length !== 0;
            this.setState({
                message: this.state.message,
                totalCount: this.state.totalCount,
                unsaved: unsaved,
                previewState: unsaved ? PreviewState.Unsaved : PreviewState.MessagePreview
            });
        }
    }

    protected _workItemChanged(change?: WITOM.IWorkItemChangedArgs) {
        if (change === WorkItemChangeType.SaveCompleted) {
            this._tryBind(this._formContext.workItem);
        }
    }

    private _getLoadingComponent = () => {
        return <Spinner className="mobile-discussion-loading" label={WorkItemTrackingResources.MobileDiscussionLoading} />;
    }

    private _getUnsavedComponent = () => {
        const identity = this._formContext.workItemType.store.getTfsContext().currentIdentity;
        return <div className="mobile-discussion-info" role="text" aria-label={WorkItemTrackingResources.WorkItemUnsavedDiscussionAriaLabel}>
            <DiscussionAvatarComponent identity={identity} />
            <div className="unsaved">
                <span className="bowtie-icon bowtie-status-info-outline" />
                <span>{WorkItemTrackingResources.MobileDiscussionUnsaved}</span>
            </div>
        </div>;
    }

    private _getMessageComponent = () => {
        const { totalCount } = this.state;

        if (totalCount > 0) {
            let commentCountText: string;
            if (totalCount > 1) {
                commentCountText = Utils_String.format(WorkItemTrackingResources.MobileDiscussionViewNumberOfComments, this.state.totalCount);
            } else {
                commentCountText = WorkItemTrackingResources.MobileDiscussionViewNumberOfCommentsSingle;
            }

            const discussionPreviewAriaLabel = Utils_String.format(WorkItemTrackingResources.WorkItemDiscussionPreviewAriaLabel, this.state.totalCount);
            return <div role="text" aria-label={discussionPreviewAriaLabel}>
                <MessagePreviewComponent comment={this.state.message} makeImagesThumbnail={false} />
                <div className="comments-count">
                    <span className="bowtie-icon bowtie-comment-discussion" />
                    {commentCountText}
                    <span className="icon bowtie-icon bowtie-chevron-right chevron" />
                </div>
            </div>;
        }
        else {
            return this._getZeroDataComponent();
        }
    }

    private _getZeroDataComponent = () => {
        const identity = this._formContext.workItemType.store.getTfsContext().currentIdentity;
        return <div className="mobile-discussion-info" role="text" aria-label={WorkItemTrackingResources.WorkItemZeroDataDiscussionAriaLabel}>
            <DiscussionAvatarComponent identity={identity} />
            <div className="zero-data">
                <span>{WorkItemTrackingResources.MobileDiscussionZeroData}</span>
            </div>
        </div>;
    }

    private _onClick = (event: React.MouseEvent<HTMLElement>) => {
        if (!this._formContext || !this._formContext.workItem) {
            return;
        }

        DiscussionTelemetryUtils.previewClicked(this.state.totalCount, PreviewState[this.state.previewState]);

        const fsInvoke: IOpenFullScreen = this._formContext.items[FormContextItems.FullScreenInvoke];
        if (fsInvoke) {
            fsInvoke(
                WorkItemTrackingResources.WorkItemDiscussionLabel,
                (closeFullscreen: () => void): JSX.Element => {
                    return <WorkItemDiscussionComponent />;
                }, () => {
                    this.state.unsaved && DiscussionTelemetryUtils.discussionViewLeftUnsaved();
                });
        }
    }
}
