import * as React from "react";
import { CommandButton } from "OfficeFabric/Button";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { autobind, css } from "OfficeFabric/Utilities";
import { first, shallowEquals } from "VSS/Utils/Array";
import { format } from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as  IdentityImage from "Presentation/Scripts/TFS/Components/IdentityImage";
import { DiscussionThread, DiscussionThreadUtils, DiscussionComment } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import {
    PullRequest_DiscussionThreadCollapseWidget_CollapsedDiscussionPreview,
    PullRequest_DiscussionThreadCollapseWidget_SomeCollapsed,
    PullRequest_DiscussionThreadCollapseWidget_AllCollapsed,
    PullRequest_DiscussionThreadCollapseWidget_CollapseDiscussion,
    PullRequest_DiscussionThreadCollapseWidget_ExpandDiscussion,
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/DiscussionThreadCollapseWidget";

export interface IDiscussionThreadCollapseWidgetProps {
    tfsContext: TfsContext;
    thread: DiscussionThread;
    threadGroup: DiscussionThread[];
    onExpand(): void;
    onCollapse(): void;
}

export const MAX_COLLAPSED_DISPLAY_LENGTH: number = 60;
export const MAX_MULTI_COLLAPSED_DISPLAY_LENGTH: number = 120;

/**
 * Dropdown to control thread filtering.
 */
export class DiscussionThreadCollapseWidget extends React.Component<IDiscussionThreadCollapseWidgetProps, {}> {

    private readonly _buttonKey: string = "expand-button";
    private _buttonKeyToggle: boolean = false;
    private _collapseCountChanged: boolean = false;

    public render(): JSX.Element {
        const threadWithCommentsExists: boolean = 
            Boolean(this.props.thread) && Boolean(this.props.thread.comments) && this.props.thread.comments.length > 0;

        // don't show the widget for threads that don't exist, are deleted, or are file-level
        if (!threadWithCommentsExists || this.props.thread.isDeleted || !this.props.thread.position) {
            return null;
        }

        const entireThreadGroup: DiscussionThread[] = [this.props.thread, ...this.props.threadGroup].sort(DiscussionThreadUtils.sortThreadsByDate);
        const collapseCount: number = getCollapsedCount(this.props);
        const showExpandButton: boolean = shouldShowExpandButton(this.props, collapseCount);
        const singleCollapsedThread: DiscussionThread = first(entireThreadGroup, t => t.isCollapsed);
        const groupHasUnseenContent: boolean = entireThreadGroup.some(t => t && t.isCollapsed && t.hasUnseenContent);

        return (
            <div className={css("vc-discussion-thread-collapse-widget", { "stacked": collapseCount > 1, "has-new": groupHasUnseenContent })}>
                {showExpandButton && 
                    <TooltipHost
                        hostClassName={"expand-button-tooltip-host"}
                        calloutProps={{ gapSpace: 8 }}
                        tooltipProps={{ onRenderContent: this._onRenderTooltipContent }}
                        directionalHint={DirectionalHint.rightCenter}
                        setAriaDescribedBy={false}>
                        <CommandButton
                            key={this._buttonKey + this._buttonKeyToggle}
                            className={css("expand-button", { "animate-pulse": this._collapseCountChanged }, {"stacked": collapseCount > 1})}
                            ariaLabel={`${PullRequest_DiscussionThreadCollapseWidget_ExpandDiscussion} ${getTooltipContent(this.props)}`}
                            onClick={this._onExpand}>
                            {groupHasUnseenContent && <span className="expand-has-new-content" />}
                            {collapseCount === 1 &&
                                <IdentityImage.Component
                                    tfsContext={this.props.tfsContext}
                                    identity={singleCollapsedThread.comments[0].author}
                                    cssClass={"expand-identity"}
                                    size={IdentityImage.imageSizeXSmall} />}
                            {collapseCount > 1 && <div className={css("stackCounter", {"small": collapseCount > 9})}>{collapseCount}</div>}
                        </CommandButton>
                    </TooltipHost>}
                {!this.props.thread.isCollapsed &&
                    <CommandButton 
                        className="collapse-button"
                        ariaLabel={PullRequest_DiscussionThreadCollapseWidget_CollapseDiscussion}
                        onClick={this.props.onCollapse}>
                        <span className="collapse-icon bowtie-icon bowtie-fold-less" aria-hidden="true" />
                    </CommandButton>}
            </div>);
    }

    public componentWillReceiveProps(nextProps: IDiscussionThreadCollapseWidgetProps): void {
        const nextCollapseCount: number = getCollapsedCount(nextProps);
        const collapseCountChanged: boolean = nextCollapseCount >= 0 && nextCollapseCount !== getCollapsedCount(this.props);

        // each time the collapsed count changes, toggle this flag so the button key will change (the button will be re-rendered and
        // the pulse animation will be forced to re-run)
        this._buttonKeyToggle = collapseCountChanged ? !this._buttonKeyToggle : this._buttonKeyToggle;
        this._collapseCountChanged = collapseCountChanged;
    }

    public shouldComponentUpdate(nextProps: IDiscussionThreadCollapseWidgetProps): boolean {
        const thisThreads: DiscussionThread[] = [this.props.thread, ...this.props.threadGroup]
            .filter(thread => Boolean(thread))
            .sort(DiscussionThreadUtils.sortThreadsById);

        const nextThreads: DiscussionThread[] = [nextProps.thread, ...nextProps.threadGroup]
            .filter(thread => Boolean(thread))
            .sort(DiscussionThreadUtils.sortThreadsById);

        const thisCollapseIds: number[] = thisThreads.map(thread => thread.id);
        const nextCollapseIds: number[] = nextThreads.map(thread => thread.id);

        const thisIsCollapsed: boolean[] = thisThreads.map(thread => thread.isCollapsed);
        const nextIsCollapsed: boolean[] = nextThreads.map(thread => thread.isCollapsed);

        const thisHasUnseenContent: boolean[] = thisThreads.map(thread => thread.hasUnseenContent);
        const nextHasUnseenContent: boolean[] = nextThreads.map(thread => thread.hasUnseenContent);

        return !shallowEquals(thisCollapseIds, nextCollapseIds) 
            || !shallowEquals(thisIsCollapsed, nextIsCollapsed)
            || !shallowEquals(thisHasUnseenContent, nextHasUnseenContent);
    }

    @autobind
    private _onRenderTooltipContent(): JSX.Element {
        const tooltipContent: string = getTooltipContent(this.props);
        return tooltipContent
            ? <div className="vc-discussion-thread-collapse-widget-tooltip">{tooltipContent}</div>
            : null;
    }

    @autobind
    private _onExpand(): void {
        this.props.onExpand && this.props.onExpand();
    }
}

export function getCollapsedCount(props: IDiscussionThreadCollapseWidgetProps): number {
    if (!props || !props.thread) {
        return -1;
    }
    return [...props.threadGroup, props.thread].filter(t => t && t.isCollapsed).length; 
}

export function getTooltipContent(props: IDiscussionThreadCollapseWidgetProps): string {
    if (!props || !props.thread) {
        return null;
    }

    const collapseCount: number = getCollapsedCount(props);
    const collapsedAuthors: IDictionaryStringTo<boolean> = {};
    let comment: DiscussionComment = null;

    if (props.thread.isCollapsed) {
        comment = props.thread.comments[0];
        collapsedAuthors[comment.author.displayName] = true;
    }

    for (const thread of props.threadGroup) {
        if (thread.isCollapsed) {
            comment = comment || thread.comments[0];
            collapsedAuthors[thread.comments[0].author.displayName] = true;
        }
    }

    if (!comment) {
        return null;
    }

    const content: string = (comment.isDirty && comment.newContent) || comment.content || " ";
    const truncatedContent: string = (content.length > MAX_COLLAPSED_DISPLAY_LENGTH) ? content.substr(0, MAX_COLLAPSED_DISPLAY_LENGTH) + "..." : content;

    let authorText: string = Object.keys(collapsedAuthors).join(", ");
    let tooltipContent: string = format(PullRequest_DiscussionThreadCollapseWidget_CollapsedDiscussionPreview, authorText, truncatedContent);

    if (collapseCount > 1) {
        const tooltipContentTemplate = (collapseCount === props.threadGroup.length + 1)
            ? PullRequest_DiscussionThreadCollapseWidget_AllCollapsed
            : PullRequest_DiscussionThreadCollapseWidget_SomeCollapsed;
        const authorTextAllottedLength: number = MAX_MULTI_COLLAPSED_DISPLAY_LENGTH - tooltipContentTemplate.length;

        authorText = (authorText.length > authorTextAllottedLength) ? authorText.substr(0, authorTextAllottedLength) + "..." : authorText;
        tooltipContent = format(tooltipContentTemplate, collapseCount, authorText);
    }

    return tooltipContent;
}

export function shouldShowExpandButton(props: IDiscussionThreadCollapseWidgetProps, collapseCount: number): boolean {
    return DiscussionThreadUtils.isThreadGroupLeader(props.thread, props.threadGroup) && collapseCount > 0;
}