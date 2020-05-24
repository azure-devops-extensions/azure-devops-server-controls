import * as React from "react";

import * as AutoCompleteStateUpdatedCard from "VersionControl/Scripts/Components/PullRequestReview/Activities/AutoCompleteStateUpdatedCard";
import { IsDraftStateUpdatedCard } from "VersionControl/Scripts/Components/PullRequestReview/Activities/IsDraftStateUpdatedCard";
import * as CodeAnalysis from "VersionControl/Scripts/Components/PullRequestReview/Activities/CodeAnalysis";
import * as Commit from "VersionControl/Scripts/Components/PullRequestReview/Activities/Commit";
import { Description } from "VersionControl/Scripts/Components/PullRequestReview/Activities/Description";
import * as FileComment from "VersionControl/Scripts/Components/PullRequestReview/Activities/FileComment";
import * as InlineComment from "VersionControl/Scripts/Components/PullRequestReview/Activities/InlineComment";
import * as Iteration from "VersionControl/Scripts/Components/PullRequestReview/Activities/IterationCard";
import * as Merge from "VersionControl/Scripts/Components/PullRequestReview/Activities/Merge";
import * as PRComment from "VersionControl/Scripts/Components/PullRequestReview/Activities/PRComment";
import * as PRNewComment from "VersionControl/Scripts/Components/PullRequestReview/Activities/PRNewComment";
import * as PullRequestCreatedCard from "VersionControl/Scripts/Components/PullRequestReview/Activities/PullRequestCreatedCard";
import { ResetAllVotesCard } from "VersionControl/Scripts/Components/PullRequestReview/Activities/ResetAllVotesCard";
import { ResetMultipleVotesCard } from "VersionControl/Scripts/Components/PullRequestReview/Activities/ResetMultipleVotesCard";
import * as ReviewersUpdatedCard from "VersionControl/Scripts/Components/PullRequestReview/Activities/ReviewersUpdatedCard";
import * as Policy from "VersionControl/Scripts/Components/PullRequestReview/Activities/Policy";
import * as VoteUpdatedCard from "VersionControl/Scripts/Components/PullRequestReview/Activities/VoteUpdatedCard";
import * as PullRequestStatusChangedCard from "VersionControl/Scripts/Components/PullRequestReview/Activities/PullRequestStatusChangedCard";

import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

import * as ChangeTransformer from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";
import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { DiscussionFilter, DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { ActivityFeedFilter } from "VersionControl/Scripts/Components/PullRequestReview/ActivityFeedFilter";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import * as VCWebAccessContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import * as VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import * as RepositoryContext from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Utils_String from "VSS/Utils/String";
import { GitPullRequestIteration } from "TFS/VersionControl/Contracts";

import { List } from "OfficeFabric/List";
import { autobind } from "OfficeFabric/Utilities";

import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { PullRequestStatusUpdatedCard } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusUpdatedCard";

export interface IActivityFeedProps {
    pullRequest: IPullRequest;
    allThreads: DiscussionThread[];
    filteredThreads: DiscussionThread[];
    threadCounts: IDictionaryNumberTo<number>,
    filter: DiscussionType;
    onFilterSelected(filter: DiscussionType): void;
    selectedThreadId: number;
    selectedCommentId: number;
    latestIterationId: number;
    iterations: GitPullRequestIteration[];
    diffCache: IDictionaryStringTo<VCLegacyContracts.FileDiff>;
    changeList: ChangeTransformer.ChangeList;
    descriptionExpanded: boolean;
    orientation: VCWebAccessContracts.DiffViewerOrientation;
    pendingThread: DiscussionThread;
    lastVisit?: Date;
    isVisible: boolean;
    sourceRepositoryContext: RepositoryContext.RepositoryContext;
    targetRepositoryContext: RepositoryContext.RepositoryContext;
    tfsContext: TfsContext;
    getUniqueFileName(fileName: string): string; // generate a unique storage name based on a file name
    attachmentErrors: IDictionaryStringTo<string>; // file name to error
    validAttachmentTypes: string[];
    hasPermissionToAddComment: boolean;
    hasPermissionToUpdateDescription: boolean;
    hasPermissionToUpdateLastVisit: boolean;
}

export class ActivityFeed extends React.Component<IActivityFeedProps, {}> {
    private scrollTop: number = 0;
    private elementAtFold: Element = null;

    public render(): JSX.Element {
        return (
            <div>
                <div className="vc-pullrequest-activity-feed-description">
                    <Description
                        key="pr_description_activity"
                        pullRequest={this.props.pullRequest}
                        tfsContext={this.props.tfsContext}
                        expanded={this.props.descriptionExpanded}
                        onExpanded={this._onDescriptionExpanded}
                        getUniqueFileName={this.props.getUniqueFileName}
                        attachmentErrors={this.props.attachmentErrors} 
                        hasPermissionToUpdateDescription={this.props.hasPermissionToUpdateDescription} />
                </div>
                <div className="vc-pullrequest-activity-feed-divider" key="pr_activity_feed_divider" />
                <div className={"visually-hidden"} role={"heading"} aria-level={2}>{VCResources.PullRequest_ActivityFeed_AriaLabel}</div>
                <ActivityFeedFilter
                    key={"pr_activity_feed_discussionFilter"}
                    discussionFilter={this.props.filter}
                    discussionCounts={this.props.threadCounts}
                    onFilterSelected={this.props.onFilterSelected}
                    hasPermissionToAddComment={this.props.hasPermissionToAddComment}
                    hasPermissionToUpdateLastVisit={this.props.hasPermissionToUpdateLastVisit} />
                <ActivityList
                    validAttachmentTypes={this.props.validAttachmentTypes}
                    threads={this.props.filteredThreads}
                    filter={this.props.filter}
                    selectedThreadId={this.props.selectedThreadId}
                    selectedCommentId={this.props.selectedCommentId}
                    latestIterationId={this.props.latestIterationId}
                    lastVisit={this.props.lastVisit}
                    orientation={this.props.orientation}
                    iterations={this.props.iterations}
                    diffCache={this.props.diffCache}
                    pullRequest={this.props.pullRequest}
                    changeList={this.props.changeList}
                    sourceRepositoryContext={this.props.sourceRepositoryContext}
                    targetRepositoryContext={this.props.targetRepositoryContext}
                    tfsContext={this.props.tfsContext}
                    pendingThread={this.props.pendingThread}
                    hasPermissionToAddComment={this.props.hasPermissionToAddComment} />
            </div>);
    }

    public componentWillUpdate(nextProps: IActivityFeedProps, nextState: {}): void {
        // if no threads or no visibility, don't bother doing anything
        if (!this.props.allThreads || !nextProps.allThreads || !nextProps.isVisible || !this.props.isVisible) {
            // reset scroll lock behavior if no threads
            this.scrollTop = 0;
            this.elementAtFold = null;
            return;
        }

        // find the topmost element at the scroll line
        const feed = $(".vc-pullrequest-activity-feed");
        const pivot = $(".hub-pivot");

        if (feed[0] && pivot[0]) {
            const x = feed.offset().left + 38; // (38 is the margin size)
            const y = pivot.offset().top + 35; // (34 is header height)
            this.elementAtFold = document.elementFromPoint(x, y);
            if (this.elementAtFold) {
                this.scrollTop = $(this.elementAtFold).offset().top;
            }
        }
    }

    public componentDidUpdate(): void {
        // check for scroll lock behavior
        if (this.scrollTop && this.elementAtFold) {

            const tab = $(".navigation-view-tab");
            const navTab = tab ? tab[0] : null;

            if (navTab) {
                const newTop = $(this.elementAtFold).offset().top;

                // if we added elements then we should lock scrolling
                if (newTop > this.scrollTop) {
                    navTab.scrollTop = navTab.scrollTop + (newTop - this.scrollTop);
                }
            }
        }
    }

    @autobind
    private _onDescriptionExpanded(expanded: boolean) {
        Flux.instance().actionCreator.userPreferenceActionCreator.updateActivityFeedDescriptionExpanded(
            expanded ? VCWebAccessContracts.PullRequestActivityDescriptionExpanded.Expanded : VCWebAccessContracts.PullRequestActivityDescriptionExpanded.Collapsed);
    }
}

export interface IActivityListProps {
    pullRequest: IPullRequest;
    threads: DiscussionThread[];
    filter: DiscussionType;
    selectedThreadId: number;
    selectedCommentId: number;
    latestIterationId: number;
    lastVisit?: Date;
    orientation: VCWebAccessContracts.DiffViewerOrientation;
    iterations: GitPullRequestIteration[];
    diffCache: IDictionaryStringTo<VCLegacyContracts.FileDiff>;
    changeList: ChangeTransformer.ChangeList;
    sourceRepositoryContext: RepositoryContext.RepositoryContext;
    targetRepositoryContext: RepositoryContext.RepositoryContext;
    tfsContext: TfsContext;
    validAttachmentTypes: string[];
    pendingThread: DiscussionThread;
    hasPermissionToAddComment: boolean;
}

export class ActivityList extends React.Component<IActivityListProps, {}> {
    public render(): JSX.Element {
        const items: JSX.Element[] = [];

        if (this.props.hasPermissionToAddComment) {
            items.push(<PRNewComment.PRNewComment
                key="new_pr_comment_activity"
                thread={this.props.pendingThread}
                tfsContext={this.props.tfsContext}
                validAttachmentTypes={this.props.validAttachmentTypes} />);
        }

        const useIterations: boolean =
            ((this.props.filter & DiscussionType.Iteration) || (this.props.filter & DiscussionType.New)) &&
            this.props.pullRequest.pullRequestContract().supportsIterations;
            
        let nextIterationIndex: number = 1;
        if (useIterations) {
            nextIterationIndex = this.props.iterations.length - 1;
        }

        // push thread components by type into the item list
        if (this.props.threads) {
            this.props.threads.forEach((thread, threadIndex) => {
                if (useIterations) {
                    const iterationCards = this._iterationCardsBeforeThread(thread, nextIterationIndex);
                    nextIterationIndex -= iterationCards.length;
                    items.push(...iterationCards);
                }

                const discussionFilter = new DiscussionFilter(this.props.tfsContext);
                const threadType: DiscussionType = discussionFilter.getDiscussionType(thread);

                let card = null;
                if (threadType & DiscussionType.Comment) {
                    card = this._commentCard(thread);
                }
                else if (threadType & DiscussionType.FileComment) {
                    card = this._fileCommentCard(thread);
                }
                else if (threadType & DiscussionType.InlineComment) {
                    card = this._inlineCommentCard(thread);
                }
                else if (threadType & DiscussionType.Commit) {
                    if (!useIterations) {
                        card = this._commitCard(thread);
                    }
                }
                else if (threadType & DiscussionType.Vote) {
                    card = this._voteUpdatedCard(thread);
                }
                else if (threadType & DiscussionType.ResetAllVotes) {
                    card = this._resetAllVotesCard(thread);
                }
                else if (threadType & DiscussionType.ResetMultipleVotes) {
                    card = this._resetMultipleVotesCard(thread);
                }
                else if (threadType & DiscussionType.AutoComplete) {
                    card = this._autoCompleteCard(thread);
                }
                else if (threadType & DiscussionType.IsDraft) {
                    card = this._isDraftCard(thread);
                }
                else if (threadType & DiscussionType.PREvent) {
                    card = this._prEventCard(thread);
                }
                else if (threadType & DiscussionType.Policy) {
                    card = this._policyCard(thread);
                }
                else if (threadType & DiscussionType.CodeAnalysis) {
                    card = this._codeAnalysisCard(thread);
                }
                else if (threadType & DiscussionType.Reviewer) {
                    card = this._reviewerCard(thread);
                }

                if (card) {
                    items.push(card);
                }
            });
        }

        if (useIterations) {
            // concat the rest of the iterations
            items.push(...this._iterationCardsBeforeThread(null, nextIterationIndex));
        }
        
        items.push(<PullRequestCreatedCard.Component
            key="pr_created_card"
            createdBy={this.props.pullRequest.createdBy}
            createdDate={this.props.pullRequest.creationDate}
            isNew={false}
            tfsContext={this.props.tfsContext} />);

        return (<List
            className="vc-pullrequest-activity-feed"
            role="list"
            items={items}
            onRenderCell={this._onRenderCell} />);
    }

    private _commentCard(thread: DiscussionThread): JSX.Element {
        return PRComment.create({
            key: "prThread_" + thread.id,
            thread: thread,
            tfsContext: this.props.tfsContext,
            isNew: thread.hasUnseenContent,
            validAttachmentTypes: this.props.validAttachmentTypes
        });
    }

    private _fileCommentCard(thread: DiscussionThread): JSX.Element {
        const changeAssociatedWithThread = new ChangeTransformer.SelectedTreeItem(
            this.props.pullRequest.branchStatusContract(),
            this.props.changeList,
            thread.itemPath);

        return FileComment.create({
            key: "fileThread_" + thread.id,
            thread: thread,
            diffItem: (changeAssociatedWithThread && changeAssociatedWithThread.gitDiffItem),
            tfsContext: this.props.tfsContext,
            isNew: thread.hasUnseenContent,
            validAttachmentTypes: this.props.validAttachmentTypes
        });
    }

    private _inlineCommentCard(thread: DiscussionThread): JSX.Element {
        const threadItem = new ChangeTransformer.SelectedTreeItem(
            this.props.pullRequest.branchStatusContract(),
            this.props.changeList,
            thread.itemPath);

        return InlineComment.create({
            key: "inlineThread_" + thread.id,
            thread: thread,
            pullRequest: this.props.pullRequest,
            iterations: this.props.iterations,
            change: (threadItem && threadItem.changeResult && threadItem.changeResult.change),
            diffItem: (threadItem && threadItem.gitDiffItem),
            diffCache: this.props.diffCache,
            selectedCommentId: this.props.selectedCommentId,
            latestIterationId: this.props.latestIterationId,
            repositoryContext: this.props.targetRepositoryContext,
            tfsContext: this.props.tfsContext,
            orientation: this.props.orientation,
            isNew: thread.hasUnseenContent,
            validAttachmentTypes: this.props.validAttachmentTypes
        });
    }

    private _commitCard(thread: DiscussionThread): JSX.Element {
        return Commit.create({
            key: "commit_" + thread.id,
            repositoryName: this.props.pullRequest.repositoryName,
            thread: thread,
            tfsContext: this.props.tfsContext,
            targetRef: this.props.pullRequest.targetRefName,
            isNew: thread.hasUnseenContent,
            validAttachmentTypes: this.props.validAttachmentTypes
        });
    }

    private _voteUpdatedCard(thread: DiscussionThread): JSX.Element {
        return <VoteUpdatedCard.Component
            thread={thread}
            tfsContext={this.props.tfsContext}
            key={"vote_" + thread.id}
            isNew={thread.hasUnseenContent} />;
    }

    private _resetAllVotesCard(thread: DiscussionThread): JSX.Element {
        return <ResetAllVotesCard
            thread={thread}
            tfsContext={this.props.tfsContext}
            key={"resetVotes_" + thread.id}
            isNew={thread.hasUnseenContent} />;
    }

    private _resetMultipleVotesCard(thread: DiscussionThread): JSX.Element {
        return <ResetMultipleVotesCard
            thread={thread}
            tfsContext={this.props.tfsContext}
            key={"resetVotes_" + thread.id}
            isNew={thread.hasUnseenContent} />;
    }

    private _autoCompleteCard(thread: DiscussionThread): JSX.Element {
        return <AutoCompleteStateUpdatedCard.Component
            key={"autocomplete_" + thread.id}
            thread={thread}
            tfsContext={this.props.tfsContext}
            isNew={thread.hasUnseenContent} />;
    }

    private _isDraftCard(thread: DiscussionThread): JSX.Element {
        return <IsDraftStateUpdatedCard
            key={"isDraft_" + thread.id}
            thread={thread}
            tfsContext={this.props.tfsContext}
            isNew={thread.hasUnseenContent} />;
    }

    private _prEventCard(thread: DiscussionThread): JSX.Element {
        return <PullRequestStatusChangedCard.Component
            key={"pr_status_changed_" + thread.id}
            thread={thread}
            tfsContext={this.props.tfsContext}
            isNew={thread.hasUnseenContent}
        />;
    }

    private _policyCard(thread: DiscussionThread): JSX.Element {
        return <Policy.Component
            key={"policy_" + thread.id}
            thread={thread}
            tfsContext={this.props.tfsContext}
            isNew={thread.hasUnseenContent}
            validAttachmentTypes={this.props.validAttachmentTypes} />;
    }

    private _codeAnalysisCard(thread: DiscussionThread): JSX.Element {
        return CodeAnalysis.create({
            key: "code_" + thread.id,
            thread: thread,
            tfsContext: this.props.tfsContext,
            isNew: thread.hasUnseenContent,
            validAttachmentTypes: this.props.validAttachmentTypes
        });
    }

    private _reviewerCard(thread: DiscussionThread): JSX.Element {
        return <ReviewersUpdatedCard.Component
            thread={thread}
            key={"reviewer_" + thread.id}
            tfsContext={this.props.tfsContext}
            isNew={thread.hasUnseenContent} />;
    }

    @autobind
    private _onRenderCell(item: JSX.Element): JSX.Element {
        return (
            <div role="listitem">
                {item}
            </div>);
    }

    /**
     * This returns a list of iteration cards that should be shown in the discussion list prior to the thread.
     * The starting iteration index is used to indicate what iteration we should start our search at. This prevents
     * us from checking the same iterations before every thread.
     */
    private _iterationCardsBeforeThread(thread: DiscussionThread, startingIterationIndex: number): JSX.Element[] {
        const iterationCards = [];

        const shouldDisplayIteration = (iteration: GitPullRequestIteration) => {
            if (!thread) {
                return true;
            }

            if (!thread.publishedDate) {
                return false;
            }

            return iteration.createdDate.getTime() > thread.publishedDate.getTime();
        }

        let currentIndex = startingIterationIndex;
        while (currentIndex > 0 &&
            currentIndex < this.props.iterations.length &&
            shouldDisplayIteration(this.props.iterations[currentIndex])) {

            // if we received a last visit date, see if this card is new based on its created date (and whether
            // or not the iteration was pushed by the current user)
            const authorIsNotCurrentUser: boolean =
                (this.props.tfsContext.currentIdentity.id !== this.props.iterations[currentIndex].author.id);

            const cardIsNew: boolean =
                authorIsNotCurrentUser && !!this.props.lastVisit && (this.props.lastVisit < this.props.iterations[currentIndex].createdDate);

            // if we're filtering by iteration, always show iteration cards
            // else if we're filtering by what's new, show the card only if the card is new
            const shouldShowCard: boolean = cardIsNew || !!(this.props.filter & DiscussionType.Iteration);

            // if we're filtering by what's new, only show this iteration if it is new
            if (shouldShowCard) {
                iterationCards.push(<Iteration.Component
                    key={"iteration_" + this.props.iterations[currentIndex].id}
                    iteration={this.props.iterations[currentIndex]}
                    sourceRepositoryContext={this.props.sourceRepositoryContext}
                    targetRepositoryContext={this.props.targetRepositoryContext}
                    tfsContext={this.props.tfsContext}
                    sourceBranchName={this.props.pullRequest.sourceFriendlyName}
                    targetBranchName={this.props.pullRequest.targetFriendlyName}
                    isNew={cardIsNew}
                    pullRequestId={this.props.pullRequest.pullRequestId}
                />);
            }

            currentIndex--;
        }

        return iterationCards;
    }
}

