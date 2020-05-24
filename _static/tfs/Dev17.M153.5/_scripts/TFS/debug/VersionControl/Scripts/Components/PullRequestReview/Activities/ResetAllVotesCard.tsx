import React = require("react");

import DiscussionCommon = require("Presentation/Scripts/TFS/TFS.Discussion.Common");
import {ReviewerUtils, PullRequestVoteStatus} from "VersionControl/Scripts/Utils/ReviewerUtils";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

// Presentational components
import {ActivityCardSubduedTemplate} from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import {FormattedComponent} from "VersionControl/Scripts/Utils/Format";
import InlineIdentity = require("Presentation/Scripts/TFS/Components/InlineIdentity");

export interface IResetAllVotesCardProps {
    tfsContext: TFS_Host_TfsContext.TfsContext;
    thread: DiscussionCommon.DiscussionThread;
    isNew?: boolean;
}

export class ResetAllVotesCard extends React.Component<IResetAllVotesCardProps, {}> {
    public render(): JSX.Element {
        let content: React.ReactNode;

        content = <span className="vote-text">{VCResources.PullRequest_ActivityFeed_ResetAllVotesNoUser}</span>;

        return (
            <ActivityCardSubduedTemplate createdDate={this.props.thread.publishedDate} isNew={this.props.isNew}>
                <i className="vote-action-icon bowtie-icon bowtie-status-waiting"></i>
                {content}
            </ActivityCardSubduedTemplate>
        );
    }

    shouldComponentUpdate(nextProps: IResetAllVotesCardProps, nextState: {}): boolean {
        return (
            this.props.thread !== nextProps.thread
            || this.props.isNew !== nextProps.isNew
        );
    }
}
