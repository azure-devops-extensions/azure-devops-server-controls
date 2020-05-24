import * as React from "react";
import ReactDOM = require("react-dom");
import { autobind, css } from "OfficeFabric/Utilities";
import VSS_Telemetry = require("VSS/Telemetry/Services");
import { DiscussionThread as IDiscussionThread, DiscussionThreadUtils } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { DiscussionThreadIterationContext, IDiscussionsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { DiscussionPermissions, IDiscussionPermissionsStore } from "VersionControl/Scenarios/Shared/Permissions/DiscussionPermissionsStore";
import { DiscussionsStoreEvents } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionsStore";
import { IAttachmentsStore } from "VersionControl/Scripts/Stores/PullRequestReview/IAttachmentsStore";
import { IDiscussionActionCreator } from "VersionControl/Scripts/Actions/PullRequestReview/IDiscussionActionCreator";
import { IDiscussionRepaintStore } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionRepaintStore";
import { ServiceRegistry } from "VersionControl/Scenarios/Shared/ServiceRegistry";
import Mixins = require("VersionControl/Scripts/Components/PullRequestReview/Mixins");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { DiscussionThread } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionThread";
import { DiscussionThreadCollapseWidget } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionThreadCollapseWidget";

/**
 * Interface for a parent that needs to understand the discussion thread it is hosting (primarily monaco)
 */
export interface IDiscussionThreadHostListener {
    /**
     * Notifies the host of a thread that the size of the thread has changed so that the host listener can update itself
     * lockView is a flag to control whether the viewport containing the thread should be ideally 'locked'
     * locked in this case means that the user's perception of their view shouldn't change. In the monaco case, we scroll the view
     * by the same amount that the size changed to cancel out the shift and make the visual frame remain unchanged
     */
    sizeChanged(lockView: boolean): void

    /**
     * called when the given thread should be placed into view. The host listener should use this callback to know
     * when to perform auto scrolling to ensure that this thread is in a good position to be read
     */
    scrollIntoView(): void

    /**
     * called when the discussion thread is being disposed. The host listener, if it called DiscussionThreadHost.createDiscussionThread
     * must use this opportunity to call DiscussionThreadHost.removeDiscussionThread
     */
    hostShouldUnmount(): void
}

export interface IDiscussionThreadHost {
    renderPassFinished(lockView: boolean, sizeChanged: boolean): void;
}

export interface IDiscussionThreadHostState {
    thread: IDiscussionThread;
    threadGroup: IDiscussionThread[];
    permissions: DiscussionPermissions;
    feedbackIsEnabled: boolean;
    collapseWidgetIsEnabled: boolean;
    commentLikesIsEnabled: boolean;
    selected?: boolean;
    selectedCommentId?: number;
    tfsContext: TfsContext;
    validAttachmentTypes: string[];
    focusReplyBox?: boolean;
}

export interface IDiscussionThreadHostProps {
    threadId: number;
    iterationContext?: DiscussionThreadIterationContext;
    hostListener?: IDiscussionThreadHostListener;
    $zone?: JQuery;

    // defaults to false
    // if not hosted and this is true, then when the thread is mounted and selected, call scrollIntoView on its main div
    scrollIntoView?: boolean;
}

export class DiscussionThreadHost extends Mixins.DiagnosticComponent<IDiscussionThreadHostProps, IDiscussionThreadHostState> implements IDiscussionThreadHost {
    private _currentThreadId: number;

    private _discussionStore: IDiscussionsStore;
    private _discussionActionCreator: IDiscussionActionCreator;
    private _paintStore: IDiscussionRepaintStore;

    private _hostElement: HTMLElement;
    private _previousHeight: number = 0;
    private _previousWidth: number = 0;
    private _needScroll: boolean;

    constructor(props) {
        super(props);

        this._currentThreadId = this.props.threadId;
        this.state = this._getState();
    }

    public render(): JSX.Element {
        const threadIsHosted: boolean = Boolean(this.props.hostListener);
        const threadExists: boolean = Boolean(this.state.thread);
        const threadIsFileLevel: boolean = threadExists && this.state.thread.itemPath && !(this.state.thread.position && this.state.thread.position.startLine);
        const renderCollapseWidget: boolean = threadExists && threadIsHosted && this.state.collapseWidgetIsEnabled;
        const threadIsCollapsed: boolean = renderCollapseWidget && this.state.thread.isCollapsed;
        const renderThread: boolean = threadExists && !threadIsCollapsed;
        const currentUserIsAuthor: boolean = threadExists && this.state.thread.comments.length
            ? this.state.tfsContext.currentIdentity.id === this.state.thread.comments[0].author.id
            : false;
        
        return (
            <div 
                className={css("discussion-thread-host", {"is-hosted": threadIsHosted, "is-collapsed": threadIsCollapsed}, {"is-expanded": !threadIsCollapsed})} 
                ref={this._setHostElement}>
                { renderCollapseWidget && 
                    <DiscussionThreadCollapseWidget
                        tfsContext={this.state.tfsContext}
                        thread={this.state.thread}
                        threadGroup={this.state.threadGroup}
                        onExpand={this._onExpandThread}
                        onCollapse={this._onCollapseThread} /> }
                { renderThread && 
                    <DiscussionThread
                        thread={this.state.thread}
                        feedbackIsEnabled={this.state.feedbackIsEnabled}
                        commentLikesIsEnabled={this.state.commentLikesIsEnabled}
                        showAvatar={true}
                        showCancel={true}
                        showContext={threadIsHosted || threadIsFileLevel}
                        host={this}
                        tfsContext={this.state.tfsContext}
                        focusReplyBox={this.state.focusReplyBox}
                        validAttachmentTypes={this.state.validAttachmentTypes} 
                        hasPermissionToAddEditComment={this.state.permissions.addEditComment}
                        hasPermissionToLikeComment={this.state.permissions.likeComment}
                        hasPermissionToUpdateCommentStatus={this.state.permissions.updateCommentStatus || currentUserIsAuthor} /> }
            </div>);
    }

    public componentDidMount(): void {
        super.componentDidMount();

        if (!this.state.thread)
        {
            return;
        }

        this._discussionActionCreator = ServiceRegistry.getService(IDiscussionActionCreator);
        this._discussionStore = ServiceRegistry.getService(IDiscussionsStore);
        this._discussionStore && this._discussionStore.addChangedListener(this._onChange, DiscussionsStoreEvents.DISCUSSION_CHANGED_REALTIME);

        if (this.props.hostListener) {
            this._paintStore = ServiceRegistry.getService(IDiscussionRepaintStore);
            this._paintStore && this._paintStore.addChangedListener(this._onChange);

            // when first creating a thread, whether we should scroll or not depends on whether
            // its default position is in the viewport or not. If it happens to be in view,
            // we don't want to scroll because it might cause the view to jump. But if you are
            // creating a thread on the last visible line, we need to scroll it up so that the newly
            // created comment is visible. Monaco has methods like 'scroll if not in view' but it's based
            // on line number (which always will be in view) and not on zones.
            // If a new thread is mounted due to coming from signalR, lock the view
            this._handleSizeAndScrolling(this.state.selected, true, this.state.thread.id > 0 && !this.state.selected);
        }
        else if (this.props.scrollIntoView && this.state.selected) {
            this._needScroll = true;
        }
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        this._discussionStore && this._discussionStore.removeChangedListener(this._onChange);
        this._discussionStore = null;
        this._discussionActionCreator = null;

        this._paintStore && this._paintStore.removeChangedListener(this._onChange);
        this._paintStore = null;
    }

    public componentDidUpdate(prevProps?: IDiscussionThreadHostProps, prevState?: IDiscussionThreadHostState): void {
        super.componentDidUpdate();

        if (this.props.hostListener) {
            if (!this.state.thread || !this.state.thread.comments || this.state.thread.comments.length === 0 || this.state.thread.isDeleted) {
                this.props.hostListener.hostShouldUnmount();
            }

            const threadExists: boolean = Boolean(this.state.thread);
            const prevThreadExists: boolean = Boolean(prevState.thread);
            const threadCollapseChanged: boolean = threadExists && prevThreadExists && (prevState.thread.isCollapsed !== this.state.thread.isCollapsed);

            const scroll: boolean = this.state.selected && !this.state.selectedCommentId && !prevState.selected;
            const currentHeight: number = (this._hostElement && this._hostElement.clientHeight) || this._previousHeight;
            const currentWidth: number = (this._hostElement && this._hostElement.clientWidth) || this._previousWidth;

            // don't tell the host to handle resizing if nothing resized
            if (threadCollapseChanged || scroll || currentHeight !== this._previousHeight || currentWidth !== this._previousWidth) {
                const lockView: boolean = (!this.state.selected && !prevState.selected) && (!threadExists || !threadCollapseChanged);
                this._handleSizeAndScrolling(scroll, false, lockView);

                this._previousHeight = currentHeight;
                this._previousWidth = currentWidth;
            }
        }
    }

    public renderPassFinished(lockView: boolean, sizeChanged: boolean): void {
        if (this.props.hostListener && sizeChanged) {
            this.props.hostListener.sizeChanged(lockView);
        }
        else if (this._needScroll && this._hostElement) {
            this._needScroll = false;
            this._hostElement.scrollIntoView();
        }
    }

    @autobind
    private _setHostElement(hostElement: HTMLElement): void {
        this._hostElement = hostElement;
    }

    @autobind
    private _onChange(sender: any, data: any): void {
        const currentThread: IDiscussionThread = this._discussionStore.getDiscussionThread(this._currentThreadId, this.props.iterationContext);
        const currentThreadGroupKey: string = DiscussionThreadUtils.getThreadGroupKey(currentThread);

        if (currentThread) {
            this._currentThreadId = currentThread.id;
        }

        if (!data ||
            !currentThread || // thread was probably deleted by a side effect, such as being unselected while empty
            data.threadId === this._currentThreadId ||
            data.threadGroup === null || // re-render if the group the current thread is in changes
            data.threadGroup === currentThreadGroupKey || // re-render if the group the current thread is in changes
            data.selectedThreadId === this._currentThreadId ||
            data.prevSelectedThreadId === this._currentThreadId) {
            this.setState({
                ...this._getState(),
                focusReplyBox: data && data.focusReplyBox
            });
        }
    }

    private _getState(): IDiscussionThreadHostState {
        const attachmentStore = ServiceRegistry.getService(IAttachmentsStore);
        const discussionPermissionsStore = ServiceRegistry.getService(IDiscussionPermissionsStore);
        const discussionsStore = this._discussionStore || ServiceRegistry.getService(IDiscussionsStore);

        const thread = discussionsStore && discussionsStore.getDiscussionThread(this._currentThreadId, this.props.iterationContext);
        const selected = thread && discussionsStore.getSelectedDiscussionId() === thread.id;
        const selectedCommentId = selected ? discussionsStore.getSelectedCommentId() : null;

        const permissions = discussionPermissionsStore
            ? discussionPermissionsStore.getPermissions()
            : {} as DiscussionPermissions;

        return {
            thread: thread,
            threadGroup: discussionsStore && discussionsStore.getDiscussionThreadGroup(thread),
            permissions: permissions,
            feedbackIsEnabled: discussionsStore && discussionsStore.getFeedbackIsEnabled(),
            collapseWidgetIsEnabled: discussionsStore && discussionsStore.getCollapseWidgetIsEnabled(),
            commentLikesIsEnabled: discussionsStore && discussionsStore.getCommentLikesIsEnabled(),
            selected: selected,
            selectedCommentId: selectedCommentId,
            tfsContext: discussionsStore && discussionsStore.getDiscussionContext().tfsContext,
            validAttachmentTypes: (attachmentStore && attachmentStore.getAllowedAttachments()) || [],
        };
    }

    @autobind
    private _onExpandThread(): void {
        const telemetryEvent = new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_TOGGLE_COLLAPSE_DISCUSSION_FEATURE, {
                group: true,
                threadGroupSize: this.state.threadGroup.length,
                thread: DiscussionThreadUtils.copyWithEUIIRedacted(this.state.thread),
                wasCollapsed: Boolean(this.state.thread) && this.state.thread.isCollapsed,
                currentCollapseFilter: this._discussionStore && this._discussionStore.getSelectedDiscussionCollapseFilter(),
            });
        VSS_Telemetry.publishEvent(telemetryEvent);

        this._discussionActionCreator && this._discussionActionCreator.expandThreadGroup(this.state.thread);
    }

    @autobind
    private _onCollapseThread(): void {
        const telemetryEvent = new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_TOGGLE_COLLAPSE_DISCUSSION_FEATURE, {
                thread: DiscussionThreadUtils.copyWithEUIIRedacted(this.state.thread),
                wasCollapsed: Boolean(this.state.thread) && this.state.thread.isCollapsed,
                currentCollapseFilter: this._discussionStore && this._discussionStore.getSelectedDiscussionCollapseFilter(),
            });
        VSS_Telemetry.publishEvent(telemetryEvent);

        this._discussionActionCreator && this._discussionActionCreator.collapseThread(this.state.thread);
    }

    private _handleSizeAndScrolling(scroll: boolean, onlyIfOutOfView: boolean, lockView: boolean): void {
        // componentDidUpdate isn't good enough
        // see second answer of http://stackoverflow.com/questions/26556436/react-after-render-code
        // In my testing, setTimeout seemed good enough and I didn't need to use requestAnimationFrame
        setTimeout(() => {
            this.props.hostListener.sizeChanged(lockView);
            if (scroll && (!onlyIfOutOfView || !this._isInView())) {
                this.props.hostListener.scrollIntoView();
            }
        }, 0);
    }

    private _isInView(): boolean {
        if (!this.props.$zone || this.props.$zone.length == 0) {
            return false;
        }

        const rect = this.props.$zone[0].getBoundingClientRect();

        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || $(window).height()) &&
            rect.right <= (window.innerWidth || $(window).width())
        );
    }

    public static createDiscussionThread($container: JQuery, thread: IDiscussionThread, hostListener: IDiscussionThreadHostListener) {
        ReactDOM.render(
            <div>
                <DiscussionThreadHost threadId={thread.id} hostListener={hostListener} $zone={$container} />
            </div>,
            $container[0]);
    }

    public static removeDiscussionThread($container: JQuery) {
        ReactDOM.unmountComponentAtNode($container[0]);
    }
}
