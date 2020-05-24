import * as React from "react";
import * as ReactDOM from "react-dom";

import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { ReviewerSummaryList } from "VersionControl/Scenarios/Shared/Reviewers/ReviewerSummaryList";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import "VSS/LoaderPlugins/Css!VersionControl/PullRequestListReviewersSection";

export interface ReviewersSectionProps {
    tfsContext: TfsContext;
    reviewers: ReviewerItem[];
    pullRequestId: number;
}

const MaxReviewersToShow = 4;

export class ReviewersSection extends React.Component<ReviewersSectionProps, {}> {
    public shouldComponentUpdate(nextProps: ReviewersSectionProps): boolean {
        return nextProps.reviewers !== this.props.reviewers;
    }

    public render(): JSX.Element {
        return this.props.reviewers && <div className="vc-pullrequest-list-reviewers-section">
                <ReviewerSummaryList tfsContext={this.props.tfsContext}
                    reviewerItems={this.props.reviewers}
                    pullRequestId={this.props.pullRequestId}
                    maxNumReviewersToShow={MaxReviewersToShow}
                    showProfileCards={true} />
            </div>;
    }
}
