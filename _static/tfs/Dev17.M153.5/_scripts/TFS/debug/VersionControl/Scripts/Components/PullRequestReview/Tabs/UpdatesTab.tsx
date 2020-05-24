/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import { autobind } from "OfficeFabric/Utilities";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import Updates = require("VersionControl/Scripts/Components/PullRequestReview/Updates");
import { CommitsList } from "VersionControl/Scripts/Components/PullRequestReview/CommitsList";
import { PullRequestActions } from "VersionControl/Scripts/Stores/PullRequestReview/NavigationStore";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { NotificationBarContainer } from "VersionControl/Scripts/Components/PullRequestReview/NotificationBarContainer";
import Mixins = require("VersionControl/Scripts/Components/PullRequestReview/Mixins");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";   
import Performance = require("VSS/Performance");
import TFS_React = require("Presentation/Scripts/TFS/TFS.React");
import VCContracts = require("TFS/VersionControl/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

/**
 * Rendering engine used to inject comments view into older page lifecycle.
 */
export module UpdatesRenderer {
    export function attachTab(element: HTMLElement): void {
        ReactDOM.render(
            <UpdatesTab />,
            element);
    }
}

interface IUpdatesTabProps extends Mixins.IScenarioComponentProps {
}

interface IUpdatesTabState {
    isLoading: boolean;
    isVisible: boolean;
    pullRequestExists: boolean;
    supportsIterations: boolean;
    iterations: VCContracts.GitPullRequestIteration[];
    sourceRepositoryContext: GitRepositoryContext;
    targetRepositoryContext: GitRepositoryContext;
    tfsContext: TFS_Host_TfsContext.TfsContext;
    sourceBranchName: string;
    targetBranchName: string;
    lastVisit?: Date;
    isCommitsTabHidden: boolean;
    pullRequestId: number;
}

/**
 * The updates tab. Manages state for updates tab rendering children.
 */
class UpdatesTab extends Mixins.TabSingleFrame<IUpdatesTabProps, IUpdatesTabState> {
    constructor(props) {
        super(props);

        this.state = this._getStateFromStores();
    }

    public render(): JSX.Element {
        if (!this.state.pullRequestExists) {
            return <NotificationBarContainer />;
        }

        return this.renderFrame(
            <div>
                <UpdatesMain
                    iterations={this.state.iterations}
                    isLoading={this.state.isLoading}
                    sourceRepositoryContext={this.state.sourceRepositoryContext}
                    targetRepositoryContext={this.state.targetRepositoryContext}
                    tfsContext={this.state.tfsContext}
                    sourceBranchName={this.state.sourceBranchName}
                    targetBranchName={this.state.targetBranchName}
                    supportsIterations={this.state.supportsIterations}
                    lastVisit={this.state.lastVisit}
                    isCommitsTabHidden={this.state.isCommitsTabHidden}
                    pullRequestId={this.state.pullRequestId}
                />
            </div>,
            "pullrequest-updates-content");
    }

    public componentDidMount(): void {
        super.componentDidMount();

        this._notifyContentRendered();

        Flux.instance().storesHub.contextStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestIterationsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.addChangedListener(this._onChange);
    }

    public componentDidUpdate(): void {
        super.componentDidUpdate();

        this._notifyContentRendered();
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();

        Flux.instance().storesHub.contextStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestIterationsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): IUpdatesTabState {
        const isLoading = Flux.instance().storesHub.pullRequestIterationsStore.isLoading() || Flux.instance().storesHub.pullRequestDetailStore.isLoading();
        if (isLoading) {
            return {
                isLoading
            } as IUpdatesTabState;
        }

        const pullRequestDetails = Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail();

        return {
            iterations: Flux.instance().storesHub.pullRequestIterationsStore.getIterations(),
            isLoading,
            isVisible: Flux.instance().storesHub.navigationStore.getCurrentTab() === PullRequestActions.Updates,
            sourceBranchName: pullRequestDetails.sourceFriendlyName,
            targetBranchName: pullRequestDetails.targetFriendlyName,
            sourceRepositoryContext: Flux.instance().storesHub.pullRequestDetailStore.getSourceRepositoryContext() as GitRepositoryContext,
            targetRepositoryContext: Flux.instance().storesHub.contextStore.getRepositoryContext() as GitRepositoryContext,
            tfsContext: Flux.instance().storesHub.contextStore.getTfsContext(),
            supportsIterations: pullRequestDetails.supportsIterations,
            lastVisit: Flux.instance().storesHub.navigationStore.getLastVisit(),
            pullRequestExists: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestExists(),
            pullRequestId: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail().pullRequestId,
            isCommitsTabHidden: Flux.instance().storesHub.featureAvailabilityStore.getCommitsTabReplacementIsEnabled()
        };
    }

    private _notifyContentRendered(): void {
        if (!this.state.isLoading) {
            Flux.instance().actionCreator.notifyMainContentRendered();
        }
    }

    public shouldComponentUpdate(nextProps: IUpdatesTabProps, nextState: IUpdatesTabState): boolean {
        if ((nextState.isLoading && this.state.isLoading) || !nextState.isVisible) {
            // if we are still loading, or if the tab is not currently visible don't bother to re-render
            return false;
        }

        return nextState.isVisible !== this.state.isVisible ||
            nextState.iterations !== this.state.iterations ||
            nextState.lastVisit !== this.state.lastVisit ||
            nextState.sourceBranchName !== this.state.sourceBranchName ||
            nextState.targetBranchName !== this.state.targetBranchName ||
            nextState.targetRepositoryContext !== this.state.targetRepositoryContext ||
            nextState.sourceRepositoryContext !== this.state.sourceRepositoryContext ||
            nextState.tfsContext !== this.state.tfsContext ||
            nextState.supportsIterations !== this.state.supportsIterations ||
            nextState.isCommitsTabHidden !== this.state.isCommitsTabHidden;
    }
}

interface IUpdatesMainProps extends Updates.IUpdateProps {
    isLoading: boolean;
    supportsIterations: boolean;
    isCommitsTabHidden: boolean;
}

class UpdatesMain extends React.Component<IUpdatesMainProps, {}> {
    private static MAX_COMMITS_TO_SHOW = 100;

    public render(): JSX.Element {
        if (this.props.isLoading) {
            return (
                <div>
                    <NotificationBarContainer />
                    <div>{VCResources.LoadingText}</div>
                </div>);
        }
        else if (!this.props.supportsIterations) {
            if (this.props.isCommitsTabHidden && this.props.iterations[0]) {
                //We aren't showing the commits tab so we want to show something here. The server should have returned a single fake iteration
                //containing the current state of the PR that we can show here.
                return <div className="commits-tab-commitList">
                    <CommitsList
                        commits={this.props.iterations[0].commits}
                        sourceCommitId={this.props.iterations[0].sourceRefCommit.commitId}
                        repositoryContext={this.props.sourceRepositoryContext}
                        tfsContext={this.props.tfsContext}
                        maxToShow={UpdatesMain.MAX_COMMITS_TO_SHOW}
                    />
                </div>;
            }
            else {
                return (
                    <div className="empty-tab">
                        <div className="empty-tab-message">{VCResources.PullRequest_UpdatesTab_NotSupported}</div>
                    </div>);
            }
        }

        return (
            <div className="pullrequest-updates-main vc-pullrequest-activity-feed">
                <NotificationBarContainer />
                <Updates.IterationsList
                    iterations={this.props.iterations}
                    targetRepositoryContext={this.props.targetRepositoryContext}
                    sourceRepositoryContext={this.props.sourceRepositoryContext}
                    tfsContext={this.props.tfsContext}
                    sourceBranchName={this.props.sourceBranchName}
                    targetBranchName={this.props.targetBranchName}
                    lastVisit={this.props.lastVisit}
                    pullRequestId={this.props.pullRequestId}
                />
            </div>
        );
    }
}
