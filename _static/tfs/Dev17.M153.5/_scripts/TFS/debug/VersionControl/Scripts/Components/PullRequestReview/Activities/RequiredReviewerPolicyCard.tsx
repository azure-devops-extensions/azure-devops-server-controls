import React = require("react");

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as VersionControlPath from "VersionControl/Scripts/VersionControlPath";

import { ActivityCardSubduedTemplate } from "VersionControl/Scripts/Components/PullRequestReview/Activities/ActivityCardTemplate";
import { FileLink } from "VersionControl/Scripts/Components/PullRequestReview/FileLink";
import Format = require("VersionControl/Scripts/Utils/Format");
import InlineIdentity = require("Presentation/Scripts/TFS/Components/InlineIdentity");
import { IdentityRef } from "VSS/WebApi/Contracts";

// Subdued card style
// Timeline icon: policy icon
// [person avatar] [Person added ] was added as a [required?] reviewer for [path][?and x other files]

export interface IRequiredReviewerPolicyCardProps extends React.ClassAttributes<any> {
    identities: IdentityRef[];
    numReviewers: number;
    filePath: string;
    numFiles: number;
    areReviewersRequired: boolean;
    publishDate: Date;
    tfsContext: TfsContext;
    isNew: boolean;
    message: string;
}

export class Component extends React.Component<IRequiredReviewerPolicyCardProps, any> {

    //Formats organized so that they can be found using the formula min(numReviewers-1,2)*8 + (areReviewersRequired ? 1 : 0)*4 + min(numFiles,3)
    private static _textFormat = [
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_1Reviewer_0Files,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_1Reviewer_1File,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_1Reviewer_2Files,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_1Reviewer_ManyFiles,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_1Reviewer_0Files,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_1Reviewer_1File,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_1Reviewer_2Files,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_1Reviewer_ManyFiles,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_2Reviewers_0Files,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_2Reviewers_1File,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_2Reviewers_2Files,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_2Reviewers_ManyFiles,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_2Reviewers_0Files,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_2Reviewers_1File,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_2Reviewers_2Files,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_2Reviewers_ManyFiles,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_ManyReviewers_0Files,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_ManyReviewers_1File,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_ManyReviewers_2Files,
        VCResources.PullRequest_ActivityFeed_OptionalReviewer_ManyReviewers_ManyFiles,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_ManyReviewers_0Files,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_ManyReviewers_1File,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_ManyReviewers_2Files,
        VCResources.PullRequest_ActivityFeed_RequiredReviewer_ManyReviewers_ManyFiles];

    public render(): JSX.Element {
        if (!this.props.identities) {
            return (
                <ActivityCardSubduedTemplate createdDate={this.props.publishDate} isNew={this.props.isNew}>
                    {VCResources.PullRequest_ActivityFeed_Generic_Reviewers_Added}
                </ActivityCardSubduedTemplate>
            );
        }

        const reviewerPart = this._generateReviewerComponent(this._getReviewer(0));
        const fileListPart = this._generateFileComponent();
        const fmt = this._lookupResourceString();

        let content = null;

        let numOtherFiles = this.props.numFiles - 1;

        if (this.props.numFiles < 1 && this.props.numReviewers <= 1) {
            // <Reviewer> was added
            content = <Format.FormattedComponent format={fmt}>
                {reviewerPart}
            </Format.FormattedComponent>;
        } else if ( this.props.numFiles <= 2 && this.props.numReviewers <= 1 ) {
            // <Reviewer> was added for <File> [and 1 other file]
            content = <Format.FormattedComponent format={fmt}>
                {reviewerPart}
                {fileListPart}
            </Format.FormattedComponent>;
        } else if (this.props.numFiles > 2 && this.props.numReviewers <= 1 ) {
            // <Reviewer> was added for <File> and <n> other files
            content = <Format.FormattedComponent format={fmt}>
                {reviewerPart}
                {fileListPart}
                {numOtherFiles}
            </Format.FormattedComponent>;
        } else if (this.props.numFiles < 1 && this.props.numReviewers == 2) {
            // <Reviewer 1> and <Reviewer 2> were added for <File> [and 1 other file]

            content = <Format.FormattedComponent format={fmt}>
                {reviewerPart}
                {this._generateReviewerComponent(this._getReviewer(1))}
                {fileListPart}
            </Format.FormattedComponent>;
        } else if ( this.props.numFiles <= 2 && this.props.numReviewers == 2 ) {
            // <Reviewer 1> and <Reviewer 2> were added for <File> [and 1 other file]
            content = <Format.FormattedComponent format={fmt}>
                {reviewerPart}
                {this._generateReviewerComponent(this._getReviewer(1))}
                {fileListPart}
            </Format.FormattedComponent>;
        } else if ( this.props.numFiles > 2 && this.props.numReviewers == 2 ) {
            // <Reviewer 1> and <Reviewer 2> were added for <File> and <n> other files
            content = <Format.FormattedComponent format={fmt}>
                {reviewerPart}
                {this._generateReviewerComponent(this._getReviewer(1))}
                {fileListPart}
                {numOtherFiles}
            </Format.FormattedComponent>;
        } else if (this.props.numFiles < 1 && this.props.numReviewers > 2) {
            // <Reviewer> and <n> other reviewers were added
            content = <Format.FormattedComponent format={fmt}>
                {reviewerPart}
                {this.props.numReviewers - 1}
                {fileListPart}
            </Format.FormattedComponent>;
        } else if (this.props.numFiles <= 2 && this.props.numReviewers > 2) {
                // <Reviewer> and <n> other reviewers were added for <File> [and 1 other file]
                content = <Format.FormattedComponent format={fmt}>
                    {reviewerPart}
                    {this.props.numReviewers - 1}
                    {fileListPart}
                </Format.FormattedComponent>;
        } else {
            // <Reviewer> and <n> other reviewers were added for <File> and <n> other files
            content = <Format.FormattedComponent format={fmt}>
                {reviewerPart}
                {this.props.numReviewers - 1}
                {fileListPart}
                {numOtherFiles}
            </Format.FormattedComponent>;
        }

        return (
            <ActivityCardSubduedTemplate createdDate={this.props.publishDate} isNew={this.props.isNew}>
                {content}
                {this.props.message && <div className="required-reviewer-policy-card-message">{this.props.message}</div>}
            </ActivityCardSubduedTemplate>
        );
    }

    private _getReviewer(index: number) : IdentityRef {
        return this.props.identities[index];
    }

    private _generateReviewerComponent(reviewerIdentity: IdentityRef) {
        return <InlineIdentity.Component identity={reviewerIdentity} tfsContext={this.props.tfsContext} />;
    }

    private _generateFileComponent() {
        if (this.props.numFiles === 0 || !this.props.filePath) {
            return null;
        }

        const fileName = VersionControlPath.getFileName(this.props.filePath);
        return <FileLink text={fileName} cssClass={"file-name"} itemPath={this.props.filePath} />;
    }

    private _lookupResourceString() {
        let otherReviewerTerm = 0;
        if (this.props.numReviewers === 2) {
            otherReviewerTerm = 1;
        } else if (this.props.numReviewers > 2) {
            otherReviewerTerm = 2;
        }

        let numFilesTerm: number;

        switch (this.props.numFiles) {
            case 0:
            case 1:
            case 2:
                numFilesTerm = this.props.numFiles;
                break;

            default:
                numFilesTerm = 3;
                break;
        }

        const index = otherReviewerTerm * 8 + (this.props.areReviewersRequired ? 1 : 0) * 4 + numFilesTerm;
        return Component._textFormat[index];
    }

}