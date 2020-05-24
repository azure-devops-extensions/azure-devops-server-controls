import * as React from "react";

import { IButton } from "OfficeFabric/Button";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { IIconProps } from "OfficeFabric/Icon";
import { autobind } from "OfficeFabric/Utilities";

import { MoreActionsButton } from "VSSUI/ContextualMenuButton";
import { IVssContextualMenuItemProvider } from "VSSUI/VssContextualMenu";
import { ContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider"

// stores
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";

// contracts and controls
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";
import * as  VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { announce } from "VSS/Utils/Accessibility";

import * as AsyncRefOperationActionCreator from "VersionControl/Scripts/Actions/AsyncGitOperation/AsyncRefOperationActionCreator";
import { AsyncRefOperationType } from "VersionControl/Scripts/Actions/AsyncGitOperationActions"
import Utils_String = require("VSS/Utils/String");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");

import { publishEvent, TelemetryEventData } from "VSS/Telemetry/Services";
import { PullRequestAsyncStatus, PullRequestStatus } from "TFS/VersionControl/Contracts";
import { PullRequestFollowStatus } from "VersionControl/Scripts/PullRequestFollowStatus";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";

import { Flux } from "VersionControl/Scenarios/PullRequestDetail/View/PullRequestDetail.Flux";

export interface IPullRequestEllipsisButton {
    focus(): void;
}

export interface PullRequestEllipsisMenuProps {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    pullRequest: IPullRequest;
    followStatus: PullRequestFollowStatus;
    reviewerItems: ReviewerItem[];
    mailSettingsEnabled: boolean;
    liveUpdateEnabled: boolean;
    componentRef?: (component: IPullRequestEllipsisButton) => void;

    // Permissions
    hasPermissionToAddComment: boolean;
    hasPermissionToCherryPickRevert: boolean;
    hasPermissionToFollow: boolean;
    hasPermissionToRestartMerge: boolean;
    hasPermissionToShare: boolean;
    hasPermissionToLiveUpdate: boolean;

    // PR actions
    follow(artifactId: string): void;
    unfollow(artifactId: string): void;
    commitAllComments(): void;
    retryMergePullRequest(pullRequestId: number): void;
    onViewCommit(commitId: string, event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>): void;
    setLiveUpdate(shouldUpdate: boolean): void;
}

export class PullRequestEllipsisMenu extends React.Component<PullRequestEllipsisMenuProps, {}> {
    private static MENU_CONTRIBUTION_ID = "ms.vss-code-web.pull-request-action-menu";

    public static MENU_ITEM_SHARE: string = "menu-share";
    public static MENU_ITEM_SAVE_COMMENTS: string = "menu-savecomments";
    public static MENU_ITEM_FOLLOW: string = "menu-follow";
    public static MENU_ITEM_UNFOLLOW: string = "menu-unfollow";
    public static MENU_ITEM_RESTART_MERGE: string = "menu-restart-merge";
    public static MENU_ITEM_CHERRY_PICK: string = "menu-cherry-pick";
    public static MENU_ITEM_REVERT: string = "menu-revert";
    public static MENU_ITEM_LIVE_UPDATE: string = "menu-live-update";
    public static MENU_ITEM_SEPARATOR: string = "menu-separator";
    public static MENU_ITEM_VIEW_MERGE: string = "menu-view-merge-commit";

    public shouldComponentUpdate(nextProps: PullRequestEllipsisMenuProps, nextState: undefined): boolean {
        return this.props.pullRequest !== nextProps.pullRequest
            || this.props.reviewerItems !== nextProps.reviewerItems
            || this.props.tfsContext !== nextProps.tfsContext
            || this.props.repositoryContext !== nextProps.repositoryContext
            || this.props.followStatus !== nextProps.followStatus
            || this.props.liveUpdateEnabled !== nextProps.liveUpdateEnabled
            || this.props.hasPermissionToAddComment !== nextProps.hasPermissionToAddComment
            || this.props.hasPermissionToCherryPickRevert !== nextProps.hasPermissionToCherryPickRevert
            || this.props.hasPermissionToFollow !== nextProps.hasPermissionToFollow
            || this.props.hasPermissionToRestartMerge !== nextProps.hasPermissionToRestartMerge
            || this.props.hasPermissionToShare !== nextProps.hasPermissionToShare
            || this.props.hasPermissionToLiveUpdate !== nextProps.hasPermissionToLiveUpdate;
    }

    public render(): JSX.Element {
        const showMenu = this.props.hasPermissionToAddComment
            || this.props.hasPermissionToCherryPickRevert
            || this.props.hasPermissionToFollow
            || this.props.hasPermissionToRestartMerge
            || this.props.hasPermissionToShare
            || this.props.hasPermissionToLiveUpdate;

        // do not show menu if not enough permissions
        // ignore View merge commit option in this case on purpose
        if (!showMenu) {
            return null;
        }

        return (
            <MoreActionsButton
                ref={this._refHandler}
                getItems={this._getMenuOptions}
                getItemProviders={this._getMenuitemProviders}
            />);
    }

    @autobind
    private _refHandler(moreActionsButton: MoreActionsButton): void {
        if (moreActionsButton && this.props.componentRef) {
            this.props.componentRef(moreActionsButton.contextualMenuRef);
        }
    }

    @autobind
    private _getMenuitemProviders(): IVssContextualMenuItemProvider[] {
        return [new ContributableMenuItemProvider([PullRequestEllipsisMenu.MENU_CONTRIBUTION_ID], { pullRequest: this.props.pullRequest })];
    }

    @autobind
    private _getMenuOptions(): IContextualMenuItem[] {
        const items: IContextualMenuItem[] = [];

        // share PR dialog
        if (this.props.hasPermissionToShare) {
            items.push({
                key: PullRequestEllipsisMenu.MENU_ITEM_SHARE,
                name: VCResources.PullRequest_Share,
                iconProps: this._getMenuIcon("bowtie-mail-message-fill"),
                onClick: () => {
                    this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.Share);
                    Flux.instance().actionCreator.sharePullRequestActionCreator.showShareDialog(this.props.reviewerItems);
                },
            } as IContextualMenuItem);
        }

        // save all comments
        if (this.props.hasPermissionToAddComment) {
            items.push({
                key: PullRequestEllipsisMenu.MENU_ITEM_SAVE_COMMENTS,
                name: VCResources.PullRequest_SaveAllComments,
                iconProps: this._getMenuIcon("bowtie-save-all"),
                onClick: () => {
                    this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.SaveComments);
                    this.props.commitAllComments();
                },
            } as IContextualMenuItem);
        }

        // toggle live updates
        if (this.props.hasPermissionToLiveUpdate) {
            items.push({
                key: PullRequestEllipsisMenu.MENU_ITEM_LIVE_UPDATE,
                name: this.props.liveUpdateEnabled ? VCResources.PullRequest_DisableLiveUpdates : VCResources.PullRequest_EnableLiveUpdates,
                iconProps: this.props.liveUpdateEnabled ?
                    this._getMenuIcon("bowtie-live-update-feed-off") :
                    this._getMenuIcon("bowtie-live-update-feed"),
                onClick: () => {
                    this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.LiveUpdate);
                    announce(this.props.liveUpdateEnabled ? VCResources.PullRequest_DisabledLiveUpdates : VCResources.PullRequest_EnabledLiveUpdates);
                    // swap the state of live update
                    this.props.setLiveUpdate(!this.props.liveUpdateEnabled);
                },
            } as IContextualMenuItem);
        }

        // follow/unfollow
        this._addFollowMenuOptions(items);

        if (items.length > 1) {
            items.push({
                key: PullRequestEllipsisMenu.MENU_ITEM_SEPARATOR + "2",
                name: "-",
            });
        }

        if (this.props.pullRequest.status === PullRequestStatus.Active) {
            items.push({
                key: PullRequestEllipsisMenu.MENU_ITEM_VIEW_MERGE,
                name: VCResources.ViewMergeCommit,
                iconProps: this._getMenuIcon("bowtie-tfvc-commit"),
                disabled: !this.props.pullRequest.lastMergeCommitId,
                onClick: event => {
                    this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.ViewMergeCommit);
                    this.props.onViewCommit(this.props.pullRequest.lastMergeCommitId, event);
                },
            } as IContextualMenuItem);
        }

        // restart merge
        if (this.props.pullRequest.status === PullRequestStatus.Active
            && this.props.pullRequest.mergeStatus !== PullRequestAsyncStatus.Queued
            && this.props.hasPermissionToRestartMerge) {

            items.push({
                key: PullRequestEllipsisMenu.MENU_ITEM_RESTART_MERGE,
                name: VCResources.RestartMerge,
                iconProps: this._getMenuIcon("bowtie-tfvc-merge"),
                onClick: () => {
                    this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.RestartMerge);
                    this.props.retryMergePullRequest(this.props.pullRequest.pullRequestId);
                },
            } as IContextualMenuItem);
        }

        // cherry-pick, revert
        this._addCherryPickRevertMenuOptions(items);

        if (items.length > 0 && items[items.length - 1].name !== "-") {
            items.push({
                key: PullRequestEllipsisMenu.MENU_ITEM_SEPARATOR + "3",
                name: "-",
            });
        }

        return items;
    }

    private _addFollowMenuOptions(items: IContextualMenuItem[]): void {
        if (this.props.mailSettingsEnabled
            && this.props.followStatus !== PullRequestFollowStatus.Disabled
            && this.props.hasPermissionToFollow) {

            if (items.length > 0) {
                items.push({
                    key: PullRequestEllipsisMenu.MENU_ITEM_SEPARATOR + "1",
                    name: "-",
                });
            }

            if (this.props.followStatus === PullRequestFollowStatus.NotFollowed || this.props.followStatus === PullRequestFollowStatus.Loading) {
                items.push({
                    key: PullRequestEllipsisMenu.MENU_ITEM_FOLLOW,
                    disabled: this.props.followStatus === PullRequestFollowStatus.Loading,
                    name: VCResources.PullRequest_Follow,
                    iconProps: this._getMenuIcon("bowtie-watch-eye"),
                    onClick: () => {
                        this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.Follow);
                        this.props.follow(this.props.pullRequest.artifactId);
                    },
                });
            } else {
                items.push({
                    key: PullRequestEllipsisMenu.MENU_ITEM_UNFOLLOW,
                    name: VCResources.PullRequest_Following,
                    iconProps: this._getMenuIcon("bowtie-watch-eye-fill"),
                    onClick: () => {
                        this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.Unfollow);
                        this.props.unfollow(this.props.pullRequest.artifactId);
                    },
                });
            }
        }
    }

    private _addCherryPickRevertMenuOptions(items: IContextualMenuItem[]): void {
        if (this.props.hasPermissionToCherryPickRevert) {
            items.push({
                key: PullRequestEllipsisMenu.MENU_ITEM_CHERRY_PICK,
                name: VCResources.PullRequest_CherryPick,
                iconProps: this._getMenuIcon("bowtie-tfvc-shelveset"),
                onClick: () => {
                    this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.CherryPick);
                    AsyncRefOperationActionCreator.ActionCreator.startDesigningAsyncRefOperation(
                        this.props.repositoryContext as GitRepositoryContext,
                        this.props.pullRequest.sourceFriendlyName,
                        Utils_String.format(VCResources.CherryPick_Dialog_Title_PullRequest, this.props.pullRequest.pullRequestId),
                        AsyncRefOperationType.CherryPick);
                },
            } as IContextualMenuItem);
        }

        if (this.props.pullRequest.status === PullRequestStatus.Completed
            && this.props.hasPermissionToCherryPickRevert) {
            items.push({
                key: PullRequestEllipsisMenu.MENU_ITEM_REVERT,
                name: VCResources.PullRequest_Revert,
                iconProps: this._getMenuIcon("bowtie-edit-undo"),
                onClick: () => {
                    this._publishTelemetry(CustomerIntelligenceConstants.PullRequestActionMenuOption.Revert);
                    AsyncRefOperationActionCreator.ActionCreator.startDesigningAsyncRefOperation(
                        this.props.repositoryContext as GitRepositoryContext,
                        this.props.pullRequest.sourceFriendlyName,
                        Utils_String.format(VCResources.Revert_Dialog_Title_PullRequest, this.props.pullRequest.pullRequestId),
                        AsyncRefOperationType.Revert,
                        new VCSpecs.GitBranchVersionSpec(this.props.pullRequest.targetFriendlyName));
                },
            } as IContextualMenuItem);
        }
    }

    private _getMenuIcon(name: string): IIconProps {
        return { className: "bowtie-icon " + name, iconName: undefined };
    }

    private _publishTelemetry = (option: CustomerIntelligenceConstants.PullRequestActionMenuOption) => {
        publishEvent(new TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUEST_ACTION_DROP_MENU_ACTION,
            {
                menuOption: option,
                pullRequestId: this.props.pullRequest.pullRequestId,
            }));
    }
}
