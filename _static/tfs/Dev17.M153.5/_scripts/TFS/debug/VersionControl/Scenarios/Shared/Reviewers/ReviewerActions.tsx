import * as React from "react";

import { IconButton } from "OfficeFabric/Button";
import { autobind } from "OfficeFabric/Utilities";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { announce } from "VSS/Utils/Accessibility";
import { format } from "VSS/Utils/String";

export interface IReviewerActionsProps extends React.Props<void> {
    reviewerId: string;
    reviewerDisplayName: string;
    pullRequestId: number;
    canDelete: boolean;
    onDelete?(reviewerId: string): void;
}

export class ReviewerActions extends React.Component<IReviewerActionsProps, {}> {
    public render(): JSX.Element {
        if (!this.props.canDelete) {
            return null;
        }

        const label = format(
            VCResources.PullRequest_RemoveReviewer,
            this.props.reviewerDisplayName);

        return (
            <div className="vc-pullrequest-delete-reviewer-container">
                <IconButton
                    iconProps={{ iconName: null }}
                    ariaLabel={label}
                    className="vc-pullrequest-delete-reviewer-button bowtie-icon bowtie-edit-delete"
                    onClick={this._onClick} />
            </div>);
    }

    @autobind
    private _onClick(event: React.MouseEvent<HTMLButtonElement>): void {
        if (this.props.onDelete) {
            this.props.onDelete(this.props.reviewerId);
        }

        event.preventDefault();
    }
}
