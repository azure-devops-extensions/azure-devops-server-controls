/// <reference types="react-dom" />

import { Fabric } from "OfficeFabric/Fabric";
import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import * as ReactDOM from "react-dom";

// stores
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { BranchFavoriteStatus, getBranchFavorite } from "VersionControl/Scripts/Stores/PullRequestReview/RefFavoritesStore";

// action creator for this page
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

// react component libraries
import Mixins = require("VersionControl/Scripts/Components/PullRequestReview/Mixins");
import { PullRequestDetails, ShortPullRequestDetails } from "VersionControl/Scripts/Components/PullRequestReview/PullRequestDetails";
import { LoadingMessageArea } from "VersionControl/Scripts/Components/PullRequestReview/LoadingMessageArea";
import { DiagnosticComponent } from "VersionControl/Scripts/Components/PullRequestReview/Mixins";
import { SharePullRequestContainer } from "VersionControl/Scripts/Components/PullRequestReview/SharePullRequestContainer";

// contracts
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequestFollowStatus } from "VersionControl/Scripts/PullRequestFollowStatus";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import * as Utils_String from "VSS/Utils/String";
import { PullRequestStatus } from "TFS/VersionControl/Contracts";

/**
 * Rendering engine used to inject main view components into older page lifecycle.
 */
export namespace MainRenderer {
    let _isLoading = false; // track whether or not we have loaded yet

    export function attachTitle(element: HTMLElement): void{
        ReactDOM.render(
            (<div>
                <DocumentTitleContainer />
                <PullRequestDetailsTitle />
            </div>),
            element);
    }

    export function attachShortTitle(element: HTMLElement): void {
        ReactDOM.render(
            (<div>
                <ShortPullRequestDetailsTitle />
            </div>),
            element);
    }

    export function attachTabError(element: HTMLElement, error: string): void {
        ReactDOM.render(
            (<div className="tab-error">
                {error}
            </div>),
            element);
    }

    export function attachDialogs(element: HTMLElement): React.Component<any, {}> {
        return ReactDOM.render(<SharePullRequestContainer/>, element) as React.Component<any, {}>;
    }

    export function startLoading(element: HTMLElement): void {
        _isLoading = true;

        // only render loading after 2 seconds have passed
        // (to prevent screen flicker)
        setTimeout(
            () => {
                // we only want to render loading if we are still actually loading
                if (_isLoading) {
                    ReactDOM.render(<LoadingMessageArea />, element);
                }
            },
            2000);
    }

    export function loadingComplete(element: HTMLElement): void {
        // stop loading and unmount the loading control, if it exists
        _isLoading = false;
        ReactDOM.unmountComponentAtNode(element);
    }
}

// -- React components and interfaces start here --

interface IPullRequestDetailsTitleState {
    pullRequest: IPullRequest;
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    summaryReviewers: ReviewerItem[];
    followStatus: PullRequestFollowStatus;
    loading: boolean;
    pullRequestExists: boolean;
    isVotePrimaryAction: boolean;
    hasPermissionToUpdateTitle: boolean;
    sourceBranchFavorite: BranchFavoriteStatus;
    targetBranchFavorite: BranchFavoriteStatus;
    allowRetargeting: boolean;
    retargetInProgress: boolean;
    autoCompleteSet: boolean;
}

/**
 * Controller view base for pull request details titles (short and long).
 */
abstract class PullRequestDetailsTitleBase extends DiagnosticComponent<{}, IPullRequestDetailsTitleState> {
    constructor(props: {}) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public componentDidMount() {
        super.componentDidMount();

        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.reviewersStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.contextStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.followsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.refFavoritesStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.reviewersStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.contextStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.followsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.permissionsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.refFavoritesStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    public shouldComponentUpdate(nextProps: {}, nextState: IPullRequestDetailsTitleState): boolean {
        if (nextState.loading && this.state.loading) {
            return false; // if we are still loading, don't bother to re-render
        }

        return nextState.pullRequest !== this.state.pullRequest
            || nextState.tfsContext !== this.state.tfsContext
            || nextState.summaryReviewers !== this.state.summaryReviewers
            || nextState.followStatus !== this.state.followStatus
            || nextState.pullRequestExists !== this.state.pullRequestExists
            || nextState.hasPermissionToUpdateTitle !== this.state.hasPermissionToUpdateTitle
            || nextState.sourceBranchFavorite !== this.state.sourceBranchFavorite
            || nextState.targetBranchFavorite !== this.state.targetBranchFavorite;
    }

    private _getStateFromStores(): IPullRequestDetailsTitleState {
        const loading = Flux.instance().storesHub.contextStore.isLoading() || Flux.instance().storesHub.pullRequestDetailStore.isLoading();
        if (loading) {
            return {
                loading
            } as IPullRequestDetailsTitleState;
        }

        const permissions = Flux.instance().storesHub.permissionsStore.getPermissions();
        const pullRequest = Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail();
        const branchStatus = pullRequest.branchStatusContract();
        const refFavoritesState = Flux.instance().storesHub.refFavoritesStore.state;
        const allowRetargeting = Flux.instance().storesHub.featureAvailabilityStore.getAllowRetargeting() &&
                                 permissions.retarget &&
                                 pullRequest.status === PullRequestStatus.Active;
        const retargetInProgress = Flux.instance().storesHub.pullRequestDetailStore.retargetInProgress();    
        const autoCompleteSet = Flux.instance().storesHub.autoCompleteStore.state.isAutoCompleteSet;

        const sourceBranchFavorite = branchStatus &&
            permissions.updateFavorites &&
            getBranchFavorite(branchStatus.sourceBranchStatus, refFavoritesState);

        return {
            pullRequest,
            tfsContext: Flux.instance().storesHub.contextStore.getTfsContext(),
            repositoryContext: Flux.instance().storesHub.contextStore.getRepositoryContext(),
            summaryReviewers: Flux.instance().storesHub.reviewersStore.getSummaryReviewers(),
            isVotePrimaryAction: Flux.instance().storesHub.reviewersStore.isVotePrimaryAction(),
            followStatus: Flux.instance().storesHub.followsStore.getFollowStatus(),
            hasPermissionToUpdateTitle: permissions.updateTitleDescription,
            loading,
            pullRequestExists:
                Flux.instance().storesHub.pullRequestDetailStore.getPullRequestExists() ||
                Flux.instance().storesHub.pullRequestDetailStore.isLoading(), // assume it exists until we are done loading
            sourceBranchFavorite,
            targetBranchFavorite: undefined,
            allowRetargeting,
            retargetInProgress,
            autoCompleteSet
        };
    }

    protected wrapWithFabric(element: JSX.Element): JSX.Element {
        return (
            <Fabric className="bowtie-fabric">
                {element}
            </Fabric>
        );
    }
}

/**
 * Controller-view for handling top bar of pull request details
 */
class PullRequestDetailsTitle extends PullRequestDetailsTitleBase {

    constructor(props: {}) {
        super(props);
    }

    public render(): JSX.Element {
        if (this.state.loading) {
            return null;
        }

        return this.wrapWithFabric(<PullRequestDetails
            isVotePrimaryAction={this.state.isVotePrimaryAction}
            pullRequest={this.state.pullRequest}
            repositoryContext={this.state.repositoryContext}
            tfsContext={this.state.tfsContext}
            summaryReviewers={this.state.summaryReviewers}
            followStatus={this.state.followStatus}
            pullRequestExists={this.state.pullRequestExists}
            hasPermissionToUpdateTitle={this.state.hasPermissionToUpdateTitle}
            sourceBranchFavorite={this.state.sourceBranchFavorite}
            targetBranchFavorite={this.state.targetBranchFavorite}
            allowRetargeting={this.state.allowRetargeting}
            retargetInProgress={this.state.retargetInProgress}
            autoCompleteSet={this.state.autoCompleteSet}
        />);
    }
}

class ShortPullRequestDetailsTitle extends PullRequestDetailsTitleBase {

    constructor(props: {}) {
        super(props);
    }

    public render(): JSX.Element {
        if (this.state.loading) {
            return null;
        }

        return this.wrapWithFabric(<ShortPullRequestDetails
            pullRequest={this.state.pullRequest}
            repositoryContext={this.state.repositoryContext}
            tfsContext={this.state.tfsContext}
            pullRequestExists={this.state.pullRequestExists} />);
    }
}

interface IDocumentTitleContainerState {
    pullRequestId: number;
    pullRequestExists: boolean;
    title: string;
    loading: boolean;
    hasUnsavedComments: boolean;
}

/**
 * Container for handling top bar of pull request details
 */
class DocumentTitleContainer extends DiagnosticComponent<{}, IDocumentTitleContainerState> {
    constructor(props: {}) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        if (!this.state.loading) {
            // never update doc title until we are done loading
            document.title = DocumentTitleContainer._computeTitle(this.state);
        }
        return null;
    }

    public componentDidMount() {
        super.componentDidMount();

        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.contextStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.discussionsStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();

        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.contextStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.discussionsStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    public shouldComponentUpdate(nextProps: {}, nextState: IDocumentTitleContainerState): boolean {
        if (nextState.loading) {
            // don't update the title while we are loading
            return false;
        }

        if (!nextState.loading && this.state.loading) {
            // if the component has loaded, we want to reset the title no matter what
            return true;
        }

        const oldTitle = DocumentTitleContainer._computeTitle(this.state);
        const newTitle = DocumentTitleContainer._computeTitle(nextState);

        // only re-render if the title changed
        return newTitle && newTitle !== oldTitle;
    }

    private static _computeTitle(state: IDocumentTitleContainerState): string {
        if (!state.pullRequestExists) {
            return Utils_String.format(VCResources.PullRequest_NotFound, "");
        }

        if (state.pullRequestId) {
            const pullrequestIdString = state.hasUnsavedComments ? state.pullRequestId + "*" : state.pullRequestId;

            return Utils_String.format(
                VCResources.PullRequest_PullRequestDetailsTitle,
                pullrequestIdString,
                state.title);
        }

        return null;
    }

    private _getStateFromStores(): IDocumentTitleContainerState {
        const pullRequest = Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail();

        const anyDirty = Flux.instance().storesHub.discussionsStore.getUnsavedCommentCount() > 0;

        return {
            pullRequestId: pullRequest.pullRequestId,
            title: pullRequest.title,
            loading: Flux.instance().storesHub.pullRequestDetailStore.isLoading(),
            pullRequestExists: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestExists(),
            hasUnsavedComments: anyDirty
        };
    }
}
