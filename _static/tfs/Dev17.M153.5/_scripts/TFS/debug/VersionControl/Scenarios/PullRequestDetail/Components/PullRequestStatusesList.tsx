import * as React from "react";

import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { List } from "OfficeFabric/List";
import { autobind } from "OfficeFabric/Utilities";
import { PullRequestStatusContributions } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusContributions";
import { PullRequestStatusesListItem } from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusesListItem";
import * as PullRequestStatusUtils from "VersionControl/Scenarios/PullRequestDetail/Components/PullRequestStatusUtils";
import { IPullRequest } from "VersionControl/Scripts/Stores/PullRequestReview/PullRequestDetailStore";

import { MoreActionsButton } from "VSSUI/ContextualMenuButton";
import { IVssContextualMenuItemProvider } from "VSSUI/VssContextualMenu";

export interface IPullRequestStatusesProps extends React.Props<void> {
    pullRequestStatuses: PullRequestStatusUtils.PullRequestStatus[];
    pullRequest: IPullRequest;
    contributions: PullRequestStatusContributions;
    hasPermissionToPerformPolicyActions: boolean;
}

export class PullRequestStatusesList extends React.Component<IPullRequestStatusesProps, {}> {
    public render(): JSX.Element {
        return (
            <div className="policies-section">
                {this._optionalSection()}
            </div>
        );
    }

    private _optionalSection(): JSX.Element {
        if (this.props.pullRequestStatuses.length === 0) {
            return null;
        }

        return <List className="vc-pullrequest-merge-policy-status-list"
            items={this.props.pullRequestStatuses}
            onRenderCell={this._createStatusesListItem} />;
    }

    private _createStatusesListItem = (pullRequestStatus: PullRequestStatusUtils.PullRequestStatus) => {
        const statusContext = PullRequestStatusUtils.getStatusContext(pullRequestStatus.status.context.name, pullRequestStatus.status.context.genre);
        return <PullRequestStatusesListItem
            key={statusContext}
            pullRequestStatus={pullRequestStatus.status}
            pullRequest={this.props.pullRequest}
            hasPermissionToPerformPolicyActions={this.props.hasPermissionToPerformPolicyActions}
            statusContributionIds={this.props.contributions.getContributionIds(pullRequestStatus.status)} />;
    }
}
