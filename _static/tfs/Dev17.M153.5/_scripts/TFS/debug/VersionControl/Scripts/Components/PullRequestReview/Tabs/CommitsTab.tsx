/// <reference types="react-dom" />

import React = require("react");
import ReactDOM = require("react-dom");
import { autobind } from "OfficeFabric/Utilities";
import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";
import { PullRequestActions } from "VersionControl/Scripts/Stores/PullRequestReview/NavigationStore";
import { CommitsList } from "VersionControl/Scripts/Components/PullRequestReview/CommitsList";
import { NotificationBarContainer } from "VersionControl/Scripts/Components/PullRequestReview/NotificationBarContainer";
import Mixins = require("VersionControl/Scripts/Components/PullRequestReview/Mixins");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import VCContracts = require("TFS/VersionControl/Contracts");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VersionControlUrls = require("VersionControl/Scripts/VersionControlUrls");

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestReviewCommitsTab";
/**
 * Rendering engine used to inject comments view into older page lifecycle.
 */
export module CommitsRenderer {
    export function attachTab(element: HTMLElement): void {
        ReactDOM.render(
            <CommitsTab />,
            element);
    }
}

interface ICommitsTabProps extends Mixins.IScenarioComponentProps {
}

interface ICommitsTabState extends ICommitsMainState {
    pullRequestExists: boolean;
}

interface ICommitsMainState {
    isLoading: boolean;
    isVisible: boolean;
    pullRequestId: number;
    sourceCommitId: string;
    sourceBranchName: string;
    commits: VCContracts.GitCommitRef[];
    repositoryContext: GitRepositoryContext;
    tfsContext: TFS_Host_TfsContext.TfsContext;
}

/**
 * The commits tab. Manages state for commits tab rendering children.
 */
class CommitsTab extends Mixins.TabSingleFrame<ICommitsTabProps, ICommitsTabState> {
    constructor(props) {
        super(props);

        this.state = this._getStateFromStores();

        // load commits if they haven't been loaded yet
        Flux.instance().actionCreator.pullRequestActionCreator.queryPullRequestCommits(this.state.pullRequestId);
    }

    public render(): JSX.Element {
        if (!this.state.pullRequestExists) {
            return <NotificationBarContainer />;
        }

        return this.renderFrame(
            <CommitsMain
                commits={this.state.commits}
                sourceCommitId={this.state.sourceCommitId}
                isLoading={this.state.isLoading}
                isVisible={this.state.isVisible}
                pullRequestId={this.state.pullRequestId}
                repositoryContext={this.state.repositoryContext}
                tfsContext={this.state.tfsContext}
                sourceBranchName={this.state.sourceBranchName}
            />,
            "pullrequest-commits-content");
    }

    public componentDidMount(): void {
        super.componentDidMount();

        this._notifyContentRendered();

        Flux.instance().storesHub.pullRequestCommitsStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.addChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.addChangedListener(this._onChange);
    }

    public componentDidUpdate(): void {
        super.componentDidUpdate();

        this._notifyContentRendered();
    }

    public componentWillUnmount(): void {
        super.componentWillUnmount();

        Flux.instance().storesHub.pullRequestCommitsStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.pullRequestDetailStore.removeChangedListener(this._onChange);
        Flux.instance().storesHub.navigationStore.removeChangedListener(this._onChange);
    }

    @autobind
    private _onChange(): void {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): ICommitsTabState {
        const isLoading = Flux.instance().storesHub.pullRequestCommitsStore.isLoading() || Flux.instance().storesHub.pullRequestDetailStore.isLoading();
        if (isLoading) {
            return {
                isLoading
            } as ICommitsTabState
        }

        const context = Flux.instance().storesHub.pullRequestDetailStore.getTargetRepositoryContext() as GitRepositoryContext;
        const pullRequest = Flux.instance().storesHub.pullRequestDetailStore.getPullRequestDetail();

        return {
            commits: Flux.instance().storesHub.pullRequestCommitsStore.getCommits(),
            pullRequestId: pullRequest.pullRequestId,
            sourceCommitId: pullRequest.lastMergeSourceCommitId,
            isLoading,
            isVisible: Flux.instance().storesHub.navigationStore.getCurrentTab() === PullRequestActions.Commits,
            sourceBranchName: pullRequest.sourceFriendlyName,
            pullRequestExists: Flux.instance().storesHub.pullRequestDetailStore.getPullRequestExists(),
            repositoryContext: context,
            tfsContext: Flux.instance().storesHub.contextStore.getTfsContext()
        }
    }

    private _notifyContentRendered(): void {
        if (!this.state.isLoading) {
            Flux.instance().actionCreator.notifyMainContentRendered();
        }
    }
    
    public shouldComponentUpdate(nextProps: ICommitsTabProps, nextState: ICommitsTabState): boolean {
        if ((nextState.isLoading && this.state.isLoading) || !nextState.isVisible) {
            // if we are still loading, or if the tab is not currently visible don't bother to re-render
            return false;
        }

        return nextState.pullRequestId !== this.state.pullRequestId
            || nextState.commits !== this.state.commits
            || nextState.isLoading !== this.state.isLoading
            || nextState.isVisible !== this.state.isVisible;
    }
}

class CommitsMain extends React.Component<ICommitsMainState, {}> {
    // The PR API returns a max of 100 commits, but doesn't paginate, so we have no way of differentiating between the case where there are
    // exactly 100 commits and the case where there are 100+. Instead, just cut it to 75 (which is still a pretty lengthy list) and the CommitList
    // component will render a link to view the branch history for the remainder.
    private static readonly MAX_COMMITS_TO_SHOW: number = 75;

    public render(): JSX.Element {
        if (this.props.isLoading) {
            return (
                <div>
                    <NotificationBarContainer />
                    <div>{VCResources.LoadingText}</div>
                </div>);
        }
        else if (this.props.commits.length === 0) {
            return (
                <div className="empty-tab">
                    <div className="empty-tab-message">{VCResources.PullRequest_CommitsTab_NoCommits}</div>
                </div>);
        }

        let footer = null;
        if (this.props.commits.length > CommitsMain.MAX_COMMITS_TO_SHOW) {
            const branchUrl = VersionControlUrls.getBranchHistoryUrl(this.props.repositoryContext as GitRepositoryContext, this.props.sourceBranchName);
            footer = <div className="vc-pullrequest-commits-footer">
                <a href={branchUrl}>{VCResources.PullRequest_CommitsTruncated_ViewAll}</a>
            </div>;
        }

        return (
            <div className="pullrequest-commits-main">
                <NotificationBarContainer />
                <CommitsList
                    headerVisible={true}
                    commits={this.props.commits}
                    sourceCommitId={this.props.sourceCommitId}
                    repositoryContext={this.props.repositoryContext}
                    tfsContext={this.props.tfsContext}
                    maxToShow={CommitsMain.MAX_COMMITS_TO_SHOW}
                />
                {footer}
            </div>
        );
    }
}