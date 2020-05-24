import * as React from "react";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_String from "VSS/Utils/String";

import * as LinkedArtifacts from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";

import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import { queueModulePreload } from "VersionControl/Scripts/DeferredJobQueue";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import {
    PullRequest_PullRequestDetailsTitle,
    CommitDetails_BranchIndicator_Tooltip,
    CommitDetails_BranchPRTooltip
} from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

import { StatBadge } from "VersionControl/Scenarios/Shared/StatBadge";
import { AvatarImageSize, IAvatarImageProperties } from "VersionControl/Scenarios/Shared/AvatarImageInterfaces";
import { IStakeholdersProps } from "VersionControl/Scenarios/Shared/StakeholdersFlyout";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
import { ActionCreator } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionCreator";
import { BranchStats, IStakeholdersDetails } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { TagsStore, TagsState } from "VersionControl/Scenarios/ChangeDetails/GitCommit/TagsStore";
import { CommitStakeholdersStore } from "VersionControl/Scenarios/ChangeDetails/Stores/CommitStakeholdersStore";
import { BranchStatsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/BranchStatsStore";
import { ContextStore } from "VersionControl/Scenarios/Shared/Stores/ContextStore";
import { BuildStatusStore, BuildStatusState } from "VersionControl/Scenarios/ChangeDetails/Stores/BuildStatusStore";
import { PullRequestInfo, PullRequestStatsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/PullRequestStatsStore";
import { UrlParametersStore } from "VersionControl/Scenarios/ChangeDetails/Stores/UrlParametersStore";
import { WorkItemsStore } from "VersionControl/Scenarios/ChangeDetails/Stores/WorkItemsStore";

import { AssociatedPullRequestsBadge } from "VersionControl/Scenarios/ChangeDetails/Components/AssociatedPullRequestsBadge";
import { AssociatedWorkItemsBadge } from "VersionControl/Scenarios/ChangeDetails/Components/AssociatedWorkItemsBadge";
import { StakeholdersBadge } from "VersionControl/Scenarios/ChangeDetails/Components/StakeholdersBadge";
import * as BuildStatusBadge_Async from "VersionControl/Scenarios/ChangeDetails/Components/BuildStatusBadge";

import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { TagsList } from "VersionControl/Scenarios/Shared/TagsList";
import { CommitArtifact } from "VersionControl/Scripts/CommitArtifact";
import { GitCommitVersionSpec} from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { onClickNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";

import "VSS/LoaderPlugins/Css!VersionControl/LinkBar";

export interface LinkBarProps extends IChangeDetailsPropsBase {
    stakeholdersStore: CommitStakeholdersStore;
    branchStatsStore: BranchStatsStore;
    pullRequestStatsStore: PullRequestStatsStore;
    workItemsStore: WorkItemsStore;
    buildStatusStore: BuildStatusStore;
    contextStore: ContextStore;
    urlParametersStore: UrlParametersStore;
    tagsStore: TagsStore;
    commitId: string;
    actionCreator: ActionCreator;
}

export interface LinkBarState {
    tfsContext: TfsContext;
    gitRepositoryContext: GitRepositoryContext;
    stakeholders: IStakeholdersDetails;
    associatedWorkItemIds: number[];
    branchStats: BranchStats;
    pullRequestsData: PullRequestInfo;
    buildStatusState: BuildStatusState;
    tagsState: TagsState;
    refName: string;
    isLoading: boolean;
    commitStatsStatus: CommitStatsStatus;
}

export interface CommitStatsStatus {
    isTagsLoading: boolean;
    isContextLoading: boolean;
    isPullRequestsLoading: boolean;
    isBranchStatsLoading: boolean;
    isWorkItemsLoading: boolean;
    isBuildStatusLoading: boolean;
}

const AsyncBuildStatusBadge = getAsyncLoadedComponent(
    ["VersionControl/Scenarios/ChangeDetails/Components/BuildStatusBadge"],
    (m: typeof BuildStatusBadge_Async) => m.BuildStatusBadge);

queueModulePreload("VersionControl/Scenarios/ChangeDetails/Components/BuildStatusBadge");

/**
* Container for the ChangeDetails LinkBar, containing the createdBy, pull request id, associated workItems and build status.
*/
export class LinkBar extends React.Component<LinkBarProps, LinkBarState> {
    constructor(props: LinkBarProps, context?: any) {
        super(props, context);

        this.state = {
            tfsContext: this.props.contextStore.getTfsContext(),
            gitRepositoryContext: this.props.contextStore.getRepositoryContext() as GitRepositoryContext,
            stakeholders: this.props.stakeholdersStore.state,
            pullRequestsData: this.props.pullRequestStatsStore.state,
            branchStats: this.props.branchStatsStore.state,
            associatedWorkItemIds: this.props.workItemsStore.state,
            buildStatusState: this.props.buildStatusStore.state,
            tagsState: this.props.tagsStore.state,
            refName: this.props.urlParametersStore.refName,
            commitStatsStatus: this._getCommitStatsStatus(),
            isLoading: this._isLoading()
        };
    }

    public componentDidMount() {
        this.props.stakeholdersStore.addChangedListener(this._onStakeholdersLoaded);
        this.props.contextStore.addChangedListener(this._onContextsLoaded);
        this.props.pullRequestStatsStore.addChangedListener(this._onPullRequestStatsChanged);
        this.props.branchStatsStore.addChangedListener(this._onBranchStatsChanged);
        this.props.workItemsStore.addChangedListener(this._onWorkItemsChanged);
        this.props.buildStatusStore.addChangedListener(this._onBuildStatusChanged);
        this.props.urlParametersStore.addChangedListener(this._onUrlParametersChanged);
        this.props.tagsStore.addChangedListener(this._onTagsChanged);
    }

    public componentWillUnmount() {
        this.props.stakeholdersStore.removeChangedListener(this._onStakeholdersLoaded);
        this.props.contextStore.removeChangedListener(this._onContextsLoaded);
        this.props.pullRequestStatsStore.removeChangedListener(this._onPullRequestStatsChanged);
        this.props.branchStatsStore.removeChangedListener(this._onBranchStatsChanged);
        this.props.workItemsStore.removeChangedListener(this._onWorkItemsChanged);
        this.props.buildStatusStore.removeChangedListener(this._onBuildStatusChanged);
        this.props.urlParametersStore.removeChangedListener(this._onUrlParametersChanged);
        this.props.tagsStore.removeChangedListener(this._onTagsChanged);
    }

    public shouldComponentUpdate(nextProps: LinkBarProps, nextState: LinkBarState): boolean {
        if (nextState.isLoading && this.state.isLoading) {
            return false;
        }

        return true;
    }

    public render(): JSX.Element {
        const loadingStats = this.state.commitStatsStatus;
        return (
            <div className={"vc-change-details-link-bar"}>
                <div className={"stakeholders-container"}>
                    {this._getStakeholdersBadge()}
                </div>
                    {loadingStats.isContextLoading
                        ? undefined
                        : <div className={"commit-meta-data-container"}>
                            {loadingStats.isTagsLoading ? undefined : this._getTagsList()}
                            {loadingStats.isBranchStatsLoading ? undefined : this._getBranchStatsBadge()}
                            {loadingStats.isPullRequestsLoading ? undefined : this._getPullRequestStatsBadge()}
                            {loadingStats.isWorkItemsLoading ? undefined : this._getWorkItemsStatsBadge()}
                            {loadingStats.isBuildStatusLoading ? undefined : this._getBuildStatusBadge()}
                        </div>
                    }
            </div>
        );
    }

    private _onStakeholdersLoaded = (): void => {
        this.setState({ stakeholders: this.props.stakeholdersStore.state } as LinkBarState);
    };

    private _onTagsChanged = (): void => {
        const isLoading = this._isLoading();
        this.setState({
            tagsState: this.props.tagsStore.state,
            commitStatsStatus: { ...this.state.commitStatsStatus, isTagsLoading: this.props.tagsStore.isLoading()},
            isLoading: isLoading,
        } as LinkBarState);
    };

    private _onContextsLoaded = (): void => {
        const isLoading = this._isLoading();
        this.setState({
            tfsContext: this.props.contextStore.getTfsContext(),
            gitRepositoryContext: this.props.contextStore.getRepositoryContext() as GitRepositoryContext,
            commitStatsStatus: { ...this.state.commitStatsStatus, isContextLoading: this.props.contextStore.isLoading()},
            isLoading: isLoading,
        } as LinkBarState);
    };

    private _onPullRequestStatsChanged = (): void => {
        const isLoading = this._isLoading();
        this.setState({
            pullRequestsData: this.props.pullRequestStatsStore.state,
            commitStatsStatus: { ...this.state.commitStatsStatus, isPullRequestsLoading: this.props.pullRequestStatsStore.isLoading()},
            isLoading: isLoading,
        } as LinkBarState);
    };

    private _onBranchStatsChanged = (): void => {
        const isLoading = this._isLoading();
        this.setState({
            branchStats: this.props.branchStatsStore.state,
            commitStatsStatus: { ...this.state.commitStatsStatus, isBranchStatsLoading: this.props.branchStatsStore.isLoading()},
            isLoading: isLoading,
        } as LinkBarState);
    };

    private _onWorkItemsChanged = (): void => {
        const isLoading = this._isLoading();
        this.setState({
            associatedWorkItemIds: this.props.workItemsStore.state,
            commitStatsStatus: { ...this.state.commitStatsStatus, isWorkItemsLoading: this.props.workItemsStore.isLoading()},
            isLoading: isLoading,
        } as LinkBarState);
    };

    private _onBuildStatusChanged = (): void => {
        const isLoading = this._isLoading();
        this.setState({
            buildStatusState: this.props.buildStatusStore.state,
            commitStatsStatus: { ...this.state.commitStatsStatus, isBuildStatusLoading: this.props.buildStatusStore.isLoading()},
            isLoading: isLoading,
        } as LinkBarState);
    };

    private _onUrlParametersChanged = (): void => {
        const isLoading = this._isLoading();
        let branchFullName = this.props.urlParametersStore.refName;
        if (!branchFullName) {
            branchFullName = this.state.gitRepositoryContext.getRepository().defaultBranch;
        }

        this.setState({
            refName: branchFullName,
            commitStatsStatus: this._getCommitStatsStatus(),
            isLoading: isLoading,
        } as LinkBarState);
    }

    private _getTagsList = (): JSX.Element => {
        return (
            <TagsList
                tags={this.state.tagsState.tags}
                itemPath={this.props.urlParametersStore.path}
                repositoryContext={this.state.gitRepositoryContext}
                className={"commit-details-tagslist"}/>
        );
    }

    private _getStakeholdersBadge(): JSX.Element {
        const stakeHoldersState = this.props.stakeholdersStore.state;

        if (!stakeHoldersState || !stakeHoldersState.author) {
            return null;
        }
        const pushUrl = VersionControlUrls.getPushUrl(this.state.gitRepositoryContext, stakeHoldersState.pushId);

        const badgeHeader = $.extend(true, {}, stakeHoldersState.author) as IAvatarImageProperties;
        badgeHeader.size = AvatarImageSize.SmallMinus;

        const badgeProps = { 
            ...stakeHoldersState,
            badgeHeader,
            pushUrl,
            onFlyoutOpen: this.props.actionCreator.onStakeHolderFlyoutOpen,
            flyoutContentClassName: "commit-details-stakeholderflyout",  
    } as IStakeholdersProps;

        return <StakeholdersBadge {...badgeProps} />;
    }

    private _getPullRequestStatsBadge(): JSX.Element {
        const pullRequestsData = this.state.pullRequestsData.pullRequestCardsInfo;

        if (!pullRequestsData || (pullRequestsData.length === 0)) {
            return null;
        }

        return (
            <div className={"stats-badges-container"}>
                <AssociatedPullRequestsBadge
                    associatedPullRequests={pullRequestsData}
                    defaultBranchPrIndex={this.state.pullRequestsData.defaultBranchPrIndex}
                    tfsContext={this.state.tfsContext}
                    fetchIdentitiesCallback={this.props.actionCreator.pullRequestActionCreator.fetchIdentities}
                    pullRequestStatsStore={this.props.pullRequestStatsStore}
                    telemetryEventData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />
            </div>
        );
    }

    private _getBranchStatsBadge(): JSX.Element {
        const branchStats = this.state.branchStats;

        if (!branchStats || !branchStats.name) {
            return null;
        }

        return (
            <div className={"stats-badges-container"}>
                <StatBadge
                    className={"branch-stats-badge"}
                    title={branchStats.name}
                    iconClassName={"bowtie-tfvc-branch"}
                    url={branchStats.url}
                    tooltip={Utils_String.format(CommitDetails_BranchIndicator_Tooltip, branchStats.name)}
                    onLinkClick={
                        (event: React.MouseEvent<HTMLAnchorElement>) =>
                            onClickNavigationHandler(event, CodeHubContributionIds.gitFilesHub, (event.currentTarget as HTMLAnchorElement).href)}
                    badgeName={"BranchStatsBadge"}
                    telemetryEventData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />

                {branchStats.associatedPRStats &&
                    <div className={"pr-for-branch-container"}>
                        (
                        <StatBadge
                            className={"pr-for-branch-badge"}
                            title={"#" + branchStats.associatedPRStats.id}
                            url={branchStats.associatedPRStats.url}
                            tooltip={Utils_String.format(
                                CommitDetails_BranchPRTooltip,
                                branchStats.associatedPRStats.id,
                                branchStats.name)}
                            onLinkClick={
                                (event: React.MouseEvent<HTMLAnchorElement>) =>
                                    onClickNavigationHandler(event, CodeHubContributionIds.pullRequestHub, (event.currentTarget as HTMLAnchorElement).href)}
                            badgeName={"PullRequestForBranchBadge"}
                            telemetryEventData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />
                        )
                   </div>
                }
            </div>
        );
    }

    private _getWorkItemsStatsBadge(): JSX.Element {
    const workItemsIds = this.state.associatedWorkItemIds;

        if (!workItemsIds || workItemsIds.length === 0) {
            return null;
        }

        const projectGuid = this.state.gitRepositoryContext.getProjectId();
        const commitArtifact = new CommitArtifact($.extend({
            projectGuid: projectGuid,
            repositoryId: this.state.gitRepositoryContext.getRepositoryId(),
        }, new GitCommitVersionSpec(this.props.commitId)));

        const hostArtifact: LinkedArtifacts.IHostArtifact = {
            id: commitArtifact.getId(),
            type: commitArtifact.getType(),
            tool: commitArtifact.getTool(),
            additionalData: {
                [LinkedArtifacts.HostArtifactAdditionalData.ProjectId]: projectGuid,
            },
        }

        return (
            <div className={"stats-badges-container"}>
                <AssociatedWorkItemsBadge
                    associatedWorkItemIds={workItemsIds}
                    hostArtifact={hostArtifact}
                    tfsContext={this.state.tfsContext}
                    telemetryEventData={this.props.customerIntelligenceData ? this.props.customerIntelligenceData.clone() : null} />
            </div>
        );
    }

    private _getBuildStatusBadge(): JSX.Element {
        const buildStatusState = this.state.buildStatusState;

        if (!buildStatusState ||
            !buildStatusState.statuses ||
            !buildStatusState.statuses.length) {
            return null;
        }

        return (<AsyncBuildStatusBadge statuses={buildStatusState.statuses} />);
    }

    private _getCommitStatsStatus(): CommitStatsStatus {
        return {
            isPullRequestsLoading: this.props.pullRequestStatsStore.isLoading(),
            isContextLoading: this.props.contextStore.isLoading(),
            isBranchStatsLoading: this.props.branchStatsStore.isLoading(),
            isWorkItemsLoading: this.props.workItemsStore.isLoading(),
            isBuildStatusLoading: this.props.buildStatusStore.isLoading(),
            isTagsLoading: this.props.tagsStore.isLoading(),
        };
    }

    private _isLoading(): boolean {
        return this.props.contextStore.isLoading();
    }
}
