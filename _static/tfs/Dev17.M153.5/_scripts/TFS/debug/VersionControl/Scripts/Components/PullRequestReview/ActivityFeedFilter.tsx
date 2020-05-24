import * as React from "react";
import { PrimaryButton } from "OfficeFabric/Button";
import { autobind } from "OfficeFabric/Utilities";
import { format } from "VSS/Utils/String";
import { DiscussionType } from "VersionControl/Scripts/Stores/PullRequestReview/DiscussionFilter";
import { DiscussionFilter } from "VersionControl/Scripts/Components/PullRequestReview/DiscussionFilter";
import { PullRequest_ActivityFeedFilterClearTooltip } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

// just the selected discussion in the activity feed
export interface IActivityFeedFilterProps extends React.ClassAttributes<void> {
    discussionFilter: DiscussionType;
    discussionCounts: IDictionaryNumberTo<number>;
    hasPermissionToAddComment: boolean;
    hasPermissionToUpdateLastVisit: boolean;
    onFilterSelected(filter: DiscussionType): void;
}

/**
 * Show a filter dropdown to select how the overview/activity feed should be filtered.
 */
export class ActivityFeedFilter extends React.Component<IActivityFeedFilterProps, {}> {

    public render(): JSX.Element {
        const typesToInclude = [
            DiscussionType.All,
            DiscussionType.AllComments,
            DiscussionType.AllActiveComments,
            DiscussionType.AllResolvedComments,
            this.props.hasPermissionToUpdateLastVisit && DiscussionType.New,
            this.props.hasPermissionToAddComment && DiscussionType.Mine,
        ].filter(t => Boolean(t));

        return (
            <div className={"vc-pullrequest-discussion-comment-filter-container"}>
                <DiscussionFilter
                    filter={this.props.discussionFilter}
                    typesToInclude={typesToInclude}
                    threadCounts={this.props.discussionCounts}
                    onFilterSelected={this.props.onFilterSelected} />
                <PrimaryButton
                    iconProps={{iconName: "ClearFilter"}}
                    disabled={this.props.discussionFilter === DiscussionType.All}
                    className={"clear-activity-feed-filter-button"}
                    ariaLabel={PullRequest_ActivityFeedFilterClearTooltip}
                    onClick={this._onFilterClearClicked} />
            </div>
        );
    }

    @autobind
    private _onFilterClearClicked(): void {
        this.props.onFilterSelected(DiscussionType.All);
    }
}

