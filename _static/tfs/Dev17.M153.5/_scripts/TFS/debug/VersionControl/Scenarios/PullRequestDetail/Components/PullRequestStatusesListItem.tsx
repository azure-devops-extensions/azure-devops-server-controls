import * as React from "react";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { Link } from "OfficeFabric/Link";
import { TooltipHost, DirectionalHint } from "VSSUI/Tooltip";

import { GitPullRequestStatus, GitPullRequest, PullRequestStatus, GitStatusState } from "TFS/VersionControl/Contracts";
import * as PullRequestStatusUtils from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusUtils";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";

import { ContributableMenuItemProvider } from "VSSPreview/Providers/ContributableMenuItemProvider";
import { MoreActionsButton } from "VSSUI/ContextualMenuButton";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestStatusesListItem";

export interface MenuItemContext {
    status: GitPullRequestStatus;
    pullRequest: GitPullRequest;
}

export interface IPullRequestStatusProps {
    pullRequestStatus: GitPullRequestStatus;
    pullRequest: IPullRequest;
    statusContributionIds: string[];
    hasPermissionToPerformPolicyActions: boolean;
    displayName?: string;
}

export interface IPullRequestStatusState {
    menuItems: IContextualMenuItem[];
}

export class PullRequestStatusesListItem extends React.PureComponent<IPullRequestStatusProps, IPullRequestStatusState> {

    public constructor(props: IPullRequestStatusProps) {
        super(props);
        this.state = { menuItems: [] };
    }

    public render(): JSX.Element {
        const targetUrl = this.props.pullRequestStatus.targetUrl;
        let state = this.props.pullRequestStatus.state;
        const displayName = this._getDisplayName();

        // Override the pull request status state if the pull request status state is still pending and the pull request is completed (or abandoned)
        // (e.g. a "final" status like "succeeded" or "failed" was not posted to this pull request before it was completed or abandoned).
        // We do this primarily to avoid showing the "play" icon which can give the impression of on-going policy evaluation activity.
        if (state === GitStatusState.Pending
            && (this.props.pullRequest.status === PullRequestStatus.Completed
                || this.props.pullRequest.status === PullRequestStatus.Abandoned)){
            state = GitStatusState.NotSet;
        }

        return (
            <div className="vc-pullrequest-status-item">
                <i className={PullRequestStatusUtils.getIconStatusClass(state)} aria-label={PullRequestStatusUtils.getStatusStateLabel(state)} />
                <div className="ellide-overflow">
                    <TooltipHost
                        directionalHint={DirectionalHint.bottomCenter}
                        tooltipProps={{ onRenderContent: this._onRenderContent }}>
                        {targetUrl ?
                            <Link className="actionLink" href={targetUrl} rel="noopener noreferrer">{displayName}</Link> :
                            <span className="statusText">{displayName}</span>}
                    </TooltipHost>
                </div>
                {
                    this.props.hasPermissionToPerformPolicyActions && this.state.menuItems.length > 0 &&
                    <MoreActionsButton
                        className="more-status-actions-button"
                        getItems={this._getMenuItems} />
                }
            </div>
        );
    }

    public componentDidMount() {
        this._loadMenuItems();
    }

    public componentDidUpdate(prevProps: IPullRequestStatusProps) {
        if (prevProps.pullRequest !== this.props.pullRequest
            || prevProps.pullRequestStatus !== this.props.pullRequestStatus
            || prevProps.statusContributionIds !== this.props.statusContributionIds) {
            this._loadMenuItems();
        }
    }

    private _loadMenuItems() {
        const extensionContext: MenuItemContext = {
            status: this.props.pullRequestStatus,
            pullRequest: this.props.pullRequest.pullRequestContract(),
        };

        const menuItemProvider = new ContributableMenuItemProvider(this.props.statusContributionIds, extensionContext);
        menuItemProvider.loadItems(items =>
            this.setState({
                menuItems: items || [],
            }));
    }

    private _onRenderContent = (): JSX.Element => {
        const { context } = this.props.pullRequestStatus;
        const contextText = PullRequestStatusUtils.getStatusContext(context.name, context.genre);
        const displayName = this._getDisplayName();

        const areDifferent = contextText !== displayName;

        return <div className="vc-pullrequest-status-tooltip-content">
            {areDifferent && <span className="status-tooltip-displayName">{displayName}</span>}
            <span className="status-tooltip-context">{contextText}</span>
        </div>;
    }

    private _getMenuItems = (): IContextualMenuItem[] => {
        return this.state.menuItems;
    }

    private _getDisplayName(): string {
        const { description, context } = this.props.pullRequestStatus;
        return this.props.displayName || PullRequestStatusUtils.getStatusDisplayName(description, context.name, context.genre);
    }
}
