/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import { autobind } from "OfficeFabric/Utilities";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

// used to retrieve data from our stores
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { ChangeList } from "VersionControl/Scripts/Stores/PullRequestReview/ChangeTransformer";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { DiscussionThreadIterationContext } from "VersionControl/Scripts/Stores/PullRequestReview/IDiscussionsStore";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { PullRequestActions } from "VersionControl/Scripts/Stores/PullRequestReview/NavigationStore";
import { DiscussionFilter } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { PullRequestPermissions } from "VersionControl/Scenarios/PullRequestDetail/Stores/PullRequestPermissionsStore";

// react component libraries
import { RelatedWorkItemsSection } from "VersionControl/Scripts/Components/PullRequestReview/RelatedWorkItems";
import { PullRequestStatusSection } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusSection";
import { PullRequestLabelSection } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestLabelSection";
import Mixins = require("VersionControl/Scripts/Components/PullRequestReview/Mixins");
import { PullRequestCalloutControllerView } from "VersionControl/Scripts/Components/PullRequestReview/PullRequestCalloutControllerView";
import { ReviewerContainer } from "VersionControl/Scripts/Components/PullRequestReview/ReviewersContainer";
import { NotificationBarContainer } from "VersionControl/Scripts/Components/PullRequestReview/NotificationBarContainer";
import { PoliciesSectionContainer } from "VersionControl/Scenarios/PullRequestDetail/Components/PoliciesSectionContainer";

import ActivityFeed = require("VersionControl/Scripts/Components/PullRequestReview/ActivityFeed");
import ActivityFeedLastVisit = require("VersionControl/Scripts/Components/PullRequestReview/ActivityFeedLastVisit");
import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";

// legacy stuff for control rendering
import { IScenarioDescriptor } from "VSS/Performance";
import VCDiscussionManager = require("VersionControl/Scripts/TFS.VersionControl.DiscussionManager");
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import { FileDiff } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import VCWebAccessContracts = require("VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts");
import VSS_Telemetry = require("VSS/Telemetry/Services");
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { getService } from "VSS/Service";

export interface IPullRequestDetailsState {
    tfsContext: TfsContext;
    sourceRepositoryContext: RepositoryContext;
    targetRepositoryContext: RepositoryContext;
    changeList: ChangeList;
    discussionManager: VCDiscussionManager.PullRequestDiscussionManager;
    pullRequest: IPullRequest;
    isLoading: boolean;
}

/**
 * Rendering engine used to inject overview view into older page lifecycle.
 */
export module OverviewRenderer {
    export function attachTab(element: HTMLElement): void {
        ReactDOM.render(
            <OverviewTab />,
            element);
    }
}

/**
 * Our stateful control has to hold state for all of its children that need props.
 */
interface IOverviewTabProps extends Mixins.IScenarioComponentProps {
}

interface IOverviewTabState extends IPullRequestDetailsState {
    allThreads: DiscussionThread[];
    filteredThreads: DiscussionThread[];
    threadCounts: IDictionaryNumberTo<number>,
    filter: DiscussionType;
    iterations: VCContracts.GitPullRequestIteration[];
    diffCache: IDictionaryStringTo<FileDiff>;
    selectedThreadId: number;
    selectedCommentId: number;
    latestIterationId: number;
    orientation: VCWebAccessContracts.DiffViewerOrientation;
    descriptionExpanded: VCWebAccessContracts.PullRequestActivityDescriptionExpanded;
    permissions: PullRequestPermissions;
    pendingPRThread: DiscussionThread;
    lastVisit?: Date;
    showLastVisitBanner?: boolean;
    isVisible: boolean;
    attachmentErrors: IDictionaryStringTo<string>; //file name to error string
    pullRequestExists: boolean;
    validAttachmentTypes: string[];
}

/**
 * The overview tab. Manages state for overview rendering children.
 */
class OverviewTab extends Mixins.TabFrame<IOverviewTabProps, IOverviewTabState> {
    constructor(props) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        if (!this.state.pullRequestExists) {
            return <NotificationBarContainer />;
        }

        return this.renderFrame(
            <OverviewPanel />,
            <OverviewMain
                validAttachmentTypes={this.state.validAttachmentTypes}
                changeList={this.state.changeList}
                discussionManager={this.state.discussionManager}
                isLoading={this.state.isLoading}
                pullRequest={this.state.pullRequest}
                targetRepositoryContext={this.state.targetRepositoryContext}
                sourceRepositoryContext={this.state.sourceRepositoryContext}
                tfsContext={this.state.tfsContext}
                allThreads={this.state.allThreads}
                filteredThreads={this.state.filteredThreads}
                threadCounts={this.state.threadCounts}
                filter={this.state.filter}
                onFilterSelected={this._filterSelectedCallback}
                selectedThreadId={this.state.selectedThreadId}
                selectedCommentId={this.state.selectedCommentId}
                latestIterationId={this.state.latestIterationId}
                iterations={this.state.iterations}
                diffCache={this.state.diffCache}
                orientation={this.state.orientation}
                descriptionExpanded={this.state.descriptionExpanded}
                pendingPRThread={this.state.pendingPRThread}
                lastVisit={this.state.lastVisit}
                showLastVisitBanner={this.state.showLastVisitBanner}
                isVisible={this.state.isVisible}
                attachmentErrors={this.state.attachmentErrors}
                permissions={this.state.permissions} />,
            // only flop the overview if vertical nav is turned on
            !getService(FeatureManagementService).isFeatureEnabled("ms.vss-tfs-web.vertical-navigation"));
    }

    public componentDidMount(): void {
        super.componentDidMount();

        Flux.instance().storesHub.contextStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.codeExplorerStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.discussionsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.userPreferencesStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestIterationsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.attachmentStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._onChange);

        this._notifyContentRendered();
    }

    public shouldComponentUpdate(nextProps: IOverviewTabProps, nextState: IOverviewTabState): boolean {
        if ((nextState.isLoading && this.state.isLoading) || !nextState.isVisible) {
            // if we are still loading, or if the tab is not currently visible don't bother to re-render
            return false; 
        }
        return true;
    }

    public componentDidUpdate(): void {
        super.componentDidUpdate();
        this._notifyContentRendered();
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();

        Flux.instance().storesHub.contextStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.codeExplorerStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.discussionsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.userPreferencesStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.attachmentStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    private _notifyContentRendered(): void {
        if (!this.state.isLoading) {
            Flux.instance().actionCreator.notifyMainContentRendered();
        }
    }

    private _getStateFromStores(): IOverviewTabState {
        const isLoading = Flux.instance().storesHub.contextStore.isLoading()
            || Flux.instance().storesHub.pullRequestDetailStore.isLoading()
            || Flux.instance().storesHub.codeExplorerStore.isLoadingLatest()
            || Flux.instance().storesHub.discussionsStore.isLoading()
            || Flux.instance().storesHub.userPreferencesStore.isLoading()
            || Flux.instance().storesHub.permissionsStore.isLoading();

        if (isLoading) {
            return {
                isLoading
            } as IOverviewTabState;
        }

        const prefsLoading: boolean = Flux.instance().storesHub.userPreferencesStore.isLoading();
        const prefs = prefsLoading ? null : Flux.instance().storesHub.userPreferencesStore.getPreferences();
        const orientation = (prefs && prefs.diffViewerOrientation) ? prefs.diffViewerOrientation : VCWebAccessContracts.DiffViewerOrientation.Inline;
        const descriptionExpanded = prefs ? prefs.pullRequestActivityDescriptionExpanded : VCWebAccessContracts.PullRequestActivityDescriptionExpanded.Expanded;
        const tfsContext: TfsContext = Flux.instance().storesHub.contextStore.getTfsContext();

        const filter: DiscussionType = Flux.instance().storesHub.discussionsStore.getSelectedDiscussionFilter();
        const threadCounts: IDictionaryNumberTo<number> = Flux.instance().storesHub.discussionsStore.getDiscussionCountByType([
            DiscussionType.AllComments,
            DiscussionType.AllActiveComments,
            DiscussionType.AllResolvedComments,
            DiscussionType.New,
            DiscussionType.Mine,
        ], { includePending: true });

        const allThreads: DiscussionThread[] = Flux.instance().storesHub.discussionsStore.getDiscussionThreads({
            includePending: true,
            requestedContext: DiscussionThreadIterationContext.Latest,
        });

        const discussionFilter: DiscussionFilter = new DiscussionFilter(tfsContext);
        const filteredThreads: DiscussionThread[] = discussionFilter.filterDiscussionThreads(allThreads, { types: filter });

        const pullRequest: IPullRequest = Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail();
        const attachmenterrors = Flux.instance().storesHub.attachmentStore.getAttachmentErrors();
        const validAttachmentTypes = Flux.instance().storesHub.attachmentStore.getAllowedAttachments();

        return {
            validAttachmentTypes: validAttachmentTypes,
            tfsContext: tfsContext,
            targetRepositoryContext: Flux.instance().storesHub.contextStore.getRepositoryContext(),
            sourceRepositoryContext: Flux.instance().storesHub.pullRequestDetailStore.getSourceRepositoryContext(),
            pullRequest: pullRequest,
            pullRequestExists: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestExists(),
            changeList: Flux.instance().storesHub.codeExplorerStore.getLatestChangeList(),
            discussionManager: Flux.instance().storesHub.discussionManagerStore.getDiscussionManager(),
            allThreads: allThreads,
            filteredThreads: filteredThreads,
            threadCounts: threadCounts,
            filter: filter,
            selectedThreadId: Flux.instance().storesHub.discussionsStore.getSelectedDiscussionId(),
            selectedCommentId: Flux.instance().storesHub.discussionsStore.getSelectedCommentId(),
            latestIterationId: Flux.instance().storesHub.codeExplorerStore.getLatestIterationId(),
            iterations: Flux.instance().storesHub.pullRequestIterationsStore.getIterations(),
            diffCache: Flux.instance().storesHub.codeExplorerStore.getDiffCache(),
            orientation: orientation,
            descriptionExpanded: descriptionExpanded,
            permissions: Flux.instance().storesHub.permissionsStore.getPermissions(),
            pendingPRThread: Flux.instance().storesHub.discussionsStore.getPendingThread(),
            isVisible: Flux.instance().storesHub.navigationStore.getCurrentTab() == PullRequestActions.Overview,
            lastVisit: Flux.instance().storesHub.navigationStore.getLastVisit(),
            showLastVisitBanner: !Flux.instance().storesHub.navigationStore.getLastVisitBannerDismissed(),
            attachmentErrors: attachmenterrors,
            isLoading
        }
    }

    @autobind
    private _filterSelectedCallback(filter: DiscussionType): void {
        const telemetryEvent = new VSS_Telemetry.TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_FILTER_ACTIVITY_FEATURE, {
                filter: filter,
                filterString: DiscussionType[filter],
            });
        VSS_Telemetry.publishEvent(telemetryEvent);

        Flux.instance().actionCreator.discussionActionCreator.updateDiscussionFilter(filter);
    }
}

interface IOverviewPanelProps {
}

class OverviewPanel extends React.Component<IOverviewPanelProps, {}> {
    public render(): JSX.Element {
        return (
            <div className="overview-tab-pane">
                <PoliciesSectionContainer />
                <PullRequestStatusSection/>
                <RelatedWorkItemsSection />
                <ReviewersSection />
                <PullRequestLabelSection/>
            </div>
        );
    }
}

interface IReviewerSectionProps extends React.Props<void> {
}

interface IReviewerSectionState {
    repositoryContext: RepositoryContext;
    tfsContext: TfsContext;
    reviewerItems: ReviewerItem[];
    pullRequest: IPullRequest;
    permissions: PullRequestPermissions;
    isLoading: boolean;
}

class ReviewersSection extends Mixins.DiagnosticComponent<IReviewerSectionProps, IReviewerSectionState> {
    constructor(props) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        // render nothing until we are done loading
        if (this.state.isLoading || !this.state.pullRequest) {
            return <div />;
        }

        return (
            <div className="vc-pullrequest-leftpane-section">
                <ReviewerContainer
                    repositoryContext={this.state.repositoryContext}
                    isActive={this.state.pullRequest.status == VCContracts.PullRequestStatus.Active}
                    pullRequestId={this.state.pullRequest.pullRequestId}
                    pullRequest={this.state.pullRequest}
                    reviewerItems={this.state.reviewerItems}
                    tfsContext={this.state.tfsContext}
                    hasPermissionToShare={this.state.permissions.share}
                    hasPermissionToUpdateReviewers={this.state.permissions.updateReviewers} />
            </div>);
    }

    public componentDidMount() {
        super.componentDidMount();

        Flux.instance().storesHub.contextStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.reviewersStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        Flux.instance().storesHub.contextStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.reviewersStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    public shouldComponentUpdate(nextProps: IReviewerSectionProps, nextState: IReviewerSectionState): boolean {
        if (nextState.isLoading && this.state.isLoading) {
            return false; // if we are still loading, don't bother to re-render
        }

        return nextState.pullRequest !== this.state.pullRequest
            || nextState.repositoryContext !== this.state.repositoryContext
            || nextState.reviewerItems !== this.state.reviewerItems
            || nextState.tfsContext != this.state.tfsContext
            || nextState.permissions !== this.state.permissions;
    }

    private _getStateFromStores(): IReviewerSectionState {
        return {
            pullRequest: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail(),
            reviewerItems: Flux.instance().storesHub.reviewersStore.getReviewers(),
            repositoryContext: Flux.instance().storesHub.contextStore.getRepositoryContext(),
            tfsContext: Flux.instance().storesHub.contextStore.getTfsContext(),
            permissions: Flux.instance().storesHub.permissionsStore.getPermissions(),
            isLoading:
                Flux.instance().storesHub.reviewersStore.isLoading() ||
                Flux.instance().storesHub.pullRequestDetailStore.isLoading() ||
                Flux.instance().storesHub.contextStore.isLoading() ||
                Flux.instance().storesHub.permissionsStore.isLoading()
        }
    }
}

/**
 * This is the parent controller-view that owns rendering the discussion tab.
 */
interface IOverviewMainProps extends IPullRequestDetailsState, React.Props<void> {
    allThreads: DiscussionThread[];
    filteredThreads: DiscussionThread[];
    threadCounts: IDictionaryNumberTo<number>,
    filter: DiscussionType;
    onFilterSelected(filter: DiscussionType): void;
    selectedThreadId: number;
    selectedCommentId: number;
    latestIterationId: number;
    iterations: VCContracts.GitPullRequestIteration[];
    diffCache: IDictionaryStringTo<FileDiff>;
    orientation: VCWebAccessContracts.DiffViewerOrientation;
    descriptionExpanded: VCWebAccessContracts.PullRequestActivityDescriptionExpanded;
    permissions: PullRequestPermissions;
    pendingPRThread: DiscussionThread;
    lastVisit?: Date;
    showLastVisitBanner?: boolean;
    isVisible: boolean;
    attachmentErrors: IDictionaryStringTo<string>; //filename to error
    validAttachmentTypes: string[];
}

class OverviewMain extends React.Component<IOverviewMainProps, {}> {
    public render(): JSX.Element {

        const callout = <PullRequestCalloutControllerView />;

        let lastVisitBanner = null;
        if (this.props.lastVisit && this.props.showLastVisitBanner) {
            lastVisitBanner = <ActivityFeedLastVisit.Component
                key={"pr_lastvisit_activity"}
                threads={this.props.allThreads}
                iterations={this.props.pullRequest.supportsIterations ? this.props.iterations : null}
                lastVisit={this.props.lastVisit} />
        }

        if (this.props.isLoading) {
            return (
                <div>
                    <NotificationBarContainer />
                    {callout}
                </div>
            );
        }

        return (
            <div>
                <NotificationBarContainer />
                {lastVisitBanner}
                {callout}
                <ActivityFeed.ActivityFeed
                    pullRequest={this.props.pullRequest}
                    allThreads={this.props.allThreads}
                    filteredThreads={this.props.filteredThreads}
                    threadCounts={this.props.threadCounts}
                    filter={this.props.filter}
                    onFilterSelected={this.props.onFilterSelected}
                    selectedThreadId={this.props.selectedThreadId}
                    selectedCommentId={this.props.selectedCommentId}
                    latestIterationId={this.props.latestIterationId}
                    iterations={this.props.iterations}
                    diffCache={this.props.diffCache}
                    changeList={this.props.changeList}
                    descriptionExpanded={this.props.descriptionExpanded == VCWebAccessContracts.PullRequestActivityDescriptionExpanded.Expanded}
                    orientation={this.props.orientation}
                    pendingThread={this.props.pendingPRThread}
                    lastVisit={this.props.lastVisit}
                    isVisible={this.props.isVisible}
                    targetRepositoryContext={this.props.targetRepositoryContext}
                    sourceRepositoryContext={this.props.sourceRepositoryContext}
                    tfsContext={this.props.tfsContext}
                    getUniqueFileName={Flux.instance().storesHub.attachmentStore.getUniqueFileName}
                    attachmentErrors={this.props.attachmentErrors}
                    validAttachmentTypes={this.props.validAttachmentTypes}
                    hasPermissionToAddComment={this.props.permissions.addEditComment}
                    hasPermissionToUpdateDescription={this.props.permissions.updateTitleDescription}
                    hasPermissionToUpdateLastVisit={this.props.permissions.updateVisit} />
            </div>
        );
    }
}