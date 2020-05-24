import React = require("react");

import Activity = require("VersionControl/Scripts/Components/PullRequestReview/Activities/Activity");

import * as CommitIdHelper from "VersionControl/Scripts/CommitIdHelper";
import Utils_String = require("VSS/Utils/String");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import Navigation_Services = require("VSS/Navigation/Services");
import {domElem} from "VSS/Utils/UI";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { ReviewerUtils } from "VersionControl/Scripts/Utils/ReviewerUtils";

export interface Props extends Activity.IThreadActivityProps {
    repositoryName: string;
    targetRef: string;
}

class Component extends Activity.Component<Props, Activity.IActivityState> {
    public static MAX_COMMITS_TO_DISPLAY = 3;

    public render(): JSX.Element {
        const updater: IdentityRef = ReviewerUtils.getIdentityRef(
            this.props.thread, 
            CodeReviewDiscussionIdentityConstants.CodeReviewRefUpdatedByIdentity,
            CodeReviewDiscussionConstants.CodeReviewRefUpdatedByTfId,
            CodeReviewDiscussionConstants.CodeReviewRefUpdatedByDisplayName);
            
        const updaterDisplayName: string = updater ? updater.displayName : "";

        const branchName: string = this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewRefName);
        const headCommit: string = this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewRefNewHeadCommit);

        const numCommits: number = parseInt(this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewRefNewCommitsCount, "0"));
        const commitIds: string[] = (numCommits > 0) ? this.getThreadPropertyValue(CodeReviewDiscussionConstants.CodeReviewRefNewCommits).split(';') : [];
        let updateTitle: string;

        let content: JSX.Element = null;

        const $branchLink = $(domElem("div")).append($(domElem("a"))
            .attr("href", VersionControlUrls.getGitActionUrl(null, this.props.repositoryName, "branches", {}, true) +
                Navigation_Services.getHistoryService().getFragmentActionLink("commits", {
                    baseVersion: new VCSpecs.GitBranchVersionSpec(GitRefUtility.getRefFriendlyName(this.props.targetRef)).toVersionString(),
                    targetVersion: new VCSpecs.GitCommitVersionSpec(headCommit).toVersionString()
                }))
            .text(GitRefUtility.getRefFriendlyName(branchName)));

        if (numCommits == 0) {
            updateTitle = Utils_String.format(VCResources.PullRequest_ActivityFeed_Pushed_Zero, updaterDisplayName);
        } else if (numCommits == 1) {
            updateTitle = Utils_String.format(VCResources.PullRequest_ActivityFeed_Pushed_One, updaterDisplayName);

            const $commitChangeLink = $(domElem("div")).append($(domElem("a"))
                .attr("href", VersionControlUrls.getGitActionUrl(null, this.props.repositoryName, "commit", { parameters: commitIds[0] }, true))
                .text(CommitIdHelper.getShortCommitId(commitIds[0])));

            content = <span dangerouslySetInnerHTML={ {
                __html: Utils_String.format(VCResources.PullRequest_SystemRefUpdateSingleCommit, $commitChangeLink.html(), $branchLink.html())
            } } />
        }
        else {
            updateTitle = Utils_String.format(VCResources.PullRequest_ActivityFeed_Pushed, updaterDisplayName, numCommits);

            let commitsLinksInHTML: string = "";
            $.each(commitIds, (i, commit) => {
                if (i < commitIds.length - 1) {
                    commitsLinksInHTML += $(domElem("div"))
                        .append($(domElem("a", "change-link"))
                            .attr("href", VersionControlUrls.getGitActionUrl(null, this.props.repositoryName, "commit", { parameters: commit }, true))
                            .text(CommitIdHelper.getShortCommitId(commit))).html();
                    if (i < commitIds.length - 2) {
                        commitsLinksInHTML += ", ";
                    }
                }
            });

            let afterAndLinkInHTML: string;
            if (numCommits > Component.MAX_COMMITS_TO_DISPLAY) {
                afterAndLinkInHTML = $(domElem("div"))
                    .append($(domElem("a", "change-link"))
                        .attr("href", VersionControlUrls.getGitActionUrl(null, this.props.repositoryName, "commits", {}, true) +
                        Navigation_Services.getHistoryService().getFragmentActionLink(null, { itemVersion: new VCSpecs.GitBranchVersionSpec(GitRefUtility.getRefFriendlyName(branchName)).toVersionString() }))
                        .text(VCResources.More)).html();
            }
            else {
                const commit = commitIds[commitIds.length - 1];
                afterAndLinkInHTML = $(domElem("div"))
                    .append($(domElem("a", "change-link"))
                        .attr("href", VersionControlUrls.getGitActionUrl(null, this.props.repositoryName, "commit", { parameters: commit }, true))
                        .text(CommitIdHelper.getShortCommitId(commit))).html();
            }

            content = <span dangerouslySetInnerHTML={ {
                __html: Utils_String.format(VCResources.PullRequest_SystemRefUpdateMultipleCommits, commitsLinksInHTML, afterAndLinkInHTML, $branchLink.html())
            } } />
        }

        return this._renderContainer(
            this._tfIdImage(updater),
            updateTitle,
            this.props.thread.publishedDate,
            content,
            null,
            null,
            "commit",
            updateTitle);
    }

    protected _getTimelineIconClass() {
        return "bowtie-tfvc-commit";
    }
}

export function create(props: Props): JSX.Element {
    return <Component {...props}/>;
}
