import "VSS/LoaderPlugins/Css!fabric";

import * as React from "react";

import { Spinner } from "OfficeFabric/Spinner";

import * as VSS from "VSS/VSS";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import { uniqueSort } from "VSS/Utils/Array";

import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";

import { IWorkItemDiscussionIterator, IWorkItemDiscussionComment, DISCUSSION_MAX_PAGE_SIZE } from "WorkItemTracking/Scripts/OM/History/Discussion";
import { MessagePreviewComponent } from "WorkItemTracking/Scripts/Form/Mobile/Components/DiscussionComponent/MessagePreviewComponent";
import { autobind } from "OfficeFabric/Utilities";

import { DiscussionTelemetryUtils } from "WorkItemTracking/Scripts/Form/Mobile/MobileTelemetryUtils";

const DISCUSSION_PAGE_SIZE = 50;
const DISCUSSION_PAGE_SCROLLTOP = 50;

// The minimum scrolltop we should set, to avoid problems with scrolling in iOS
const DISCUSSION_MIN_SCROLLTOP = 1;

export interface IWorkItemDiscussionListState {
    items: IWorkItemDiscussionComment[];
    totalCount: number;

    fetchingComments: boolean;
}

export interface IWorkItemDiscussionListProps {
    discussionIterator: IWorkItemDiscussionIterator;
    workItemId: number;
}

export class WorkItemDiscussionList extends React.Component<IWorkItemDiscussionListProps, IWorkItemDiscussionListState> {
    private _currentIterator: IWorkItemDiscussionIterator;
    private _discussionItemsElement: HTMLElement;
    private _allowPageOnScroll: boolean;
    private _scrollPos: number = 0;

    constructor(props: IWorkItemDiscussionListProps) {
        super(props);

        this._currentIterator = this.props.discussionIterator;
        this.state = {
            items: [],
            totalCount: 0,
            fetchingComments: true
        };

        this._disableScroll();
    }

    public render(): JSX.Element {
        return <div className="discussion-items-container" ref={this._setDiscussionElement} onScroll={this._onScroll} onTouchStart={this._touchStartHandler}>
            <div className="discussion-items">
                {
                    this._hasMoreItems() && <div className="discussion-items-loading">
                        {
                            this.state.fetchingComments && <Spinner
                                className="loading-spinner" label={WorkItemTrackingResources.MobileDiscussionLoading} />
                        }
                    </div>
                }
                {
                    this.state.items.map((item: IWorkItemDiscussionComment, index: number) => {
                        const ariaLabel = Utils_String.format(WorkItemTrackingResources.WorkItemDiscussionCommentAriaLabel, (index + 1), this.state.totalCount);
                        return <div className="workitem-discussion-comment" key={item.revision}>
                            <div className="summary-text" role="text" aria-label={ariaLabel} tabIndex={0} />
                            <MessagePreviewComponent comment={item} makeImagesThumbnail={true} />
                        </div>;
                    })
                }
            </div>
        </div>;
    }

    public componentDidMount() {
        this._resetItems(DISCUSSION_PAGE_SIZE, true);
    }

    private _disableScroll() {
        this._allowPageOnScroll = false;

        if (this._discussionItemsElement) {
            // This is to prevent inertial scrolling from causing another page onscroll
            this._discussionItemsElement.style.overflowY = "hidden";
        }
    }

    private _enableScroll() {
        this._allowPageOnScroll = true;

        if (this._discussionItemsElement) {
            this._discussionItemsElement.style.overflowY = "auto";
        }
    }

    @autobind
    private _touchStartHandler() {
        if (!this._discussionItemsElement) {
            return;
        }

        const top = this._discussionItemsElement.scrollTop;
        const totalScroll = this._discussionItemsElement.scrollHeight;
        const currentScroll = top + this._discussionItemsElement.offsetHeight;

        // iOS scrolling workaround, to prevent "scrolling focus" to switch to the document, do not allow scrolling to the very top or bottom.
        if (top === 0) {
            this._discussionItemsElement.scrollTop = DISCUSSION_MIN_SCROLLTOP;
        } else if (currentScroll === totalScroll) {
            this._discussionItemsElement.scrollTop = top - DISCUSSION_MIN_SCROLLTOP;
        }
    }

    public componentWillUpdate() {
        this._scrollPos = this._discussionItemsElement.scrollHeight - this._discussionItemsElement.scrollTop;
    }

    public componentWillReceiveProps(nextProps: IWorkItemDiscussionListProps) {
        const newIterator = nextProps.discussionIterator;
        if (nextProps.workItemId === this.props.workItemId) {
            // update only when it is a new iterator (a comment has been added).
            if (newIterator !== this._currentIterator) {
                let numToPage = Math.max(this.state.items.length, DISCUSSION_PAGE_SIZE);
                numToPage = Math.min(numToPage, DISCUSSION_MAX_PAGE_SIZE);
                this._reset(newIterator, numToPage);
            }
        }
        else {
            this._reset(newIterator, DISCUSSION_PAGE_SIZE, true);
        }
    }

    private _reset(discussionIterator: IWorkItemDiscussionIterator, numToPage: number, isNewWorkItem?: boolean) {
        this._currentIterator = discussionIterator;
        this._resetItems(numToPage, isNewWorkItem);
        // #937635 - WP Edge: give browser some time to recalculate scroll positions before setting it.
        Utils_Core.delay(this, 0, () => {
            this._resetScrollPosition();
        });
    }

    private _setDiscussionElement = (element: HTMLElement) => {
        this._discussionItemsElement = element;
    }

    @autobind
    private _resetScrollPosition() {
        this._setScrollTop(0);
    }

    private _setScrollTop(scrollPosition: number) {
        // iOS workaround: never scroll to the very bottom or top, otherwise "scroll focus" (for lack of a better word) might 
        // switch to the document, making the comment list unscrollable.
        const scrollHeight = this._discussionItemsElement.scrollHeight;
        this._discussionItemsElement.scrollTop = Math.max(Math.min(scrollHeight - scrollPosition, scrollHeight - DISCUSSION_MIN_SCROLLTOP), DISCUSSION_MIN_SCROLLTOP);
        this._enableScroll();
    }

    private _hasMoreItems() {
        return this.state.totalCount > this.state.items.length;
    }

    @autobind
    private _onScroll(e) {
        if (!this._allowPageOnScroll) {
            // Either fetching comments or completing inertial scroll, do nothing
            return;
        }

        if (this._discussionItemsElement.scrollTop <= DISCUSSION_PAGE_SCROLLTOP) {
            // Only start paging if we don't have all comments yet
            if (this._hasMoreItems()) {
                this._disableScroll();

                this._pageItems();
            }
        }
    }

    private _resetItems(numToPage?: number, isNewWorkItem?: boolean) {
        this._currentIterator.reset();
        const messages = this._currentIterator.next(numToPage || DISCUSSION_PAGE_SIZE);

        this.setState({
            fetchingComments: true
        } as IWorkItemDiscussionListState, () => {
            messages.then((result) => {
                this.setState({
                    items: result.comments.reverse(),
                    totalCount: result.totalCount,
                    fetchingComments: false
                }, () => {
                    this._setScrollTop(this._scrollPos);
                });

                // the below will be updated to include the number of @/# mentions
                if (isNewWorkItem) {
                    DiscussionTelemetryUtils.fullScreenOpened(this._getNumberOfUniqueCommenters(this.state.items));
                }
            }, VSS.handleError);
        });
    }

    private _getNumberOfUniqueCommenters(comments: IWorkItemDiscussionComment[]) {
        const users = this.state.items.map((item) => {
            return item.user.identity.uniqueName;
        });

        return uniqueSort(users).length;
    }

    private _pageItems() {
        DiscussionTelemetryUtils.nextDiscussionPageLoading(this.state.totalCount, this.state.items.length);

        const messages = this._currentIterator.next(DISCUSSION_PAGE_SIZE);

        this.setState({
            fetchingComments: true
        } as IWorkItemDiscussionListState, () => {
            // Set the scrolltop to the minimum, to make sure the loading indicator area is visible
            this._discussionItemsElement.scrollTop = DISCUSSION_MIN_SCROLLTOP;

            messages.then((result) => {
                const comments = result.comments.reverse();
                const allComments = comments.concat(this.state.items);

                this.setState({
                    items: allComments,
                    totalCount: result.totalCount,
                    fetchingComments: false
                }, () => {
                    this._setScrollTop(this._scrollPos);
                });

            }, VSS.handleError);
        });
    }
}