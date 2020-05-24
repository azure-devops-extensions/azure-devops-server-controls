import * as React from "react";
import { format } from "VSS/Utils/String";
import { htmlEncode } from "VSS/Utils/UI";

import { SaveInfo } from "VersionControl/Scenarios/Explorer/Stores/NotificationStore";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { VersionSpec, GitBranchVersionSpec, GitCommitVersionSpec, ChangesetVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { getChangesetUrl, getCommitUrl, getCreatePullRequestUrl, getPullRequestUrl } from "VersionControl/Scripts/VersionControlUrls";

import { FpsLink } from "VersionControl/Scenarios/Shared/FpsLink";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";

export interface SaveInfoBannerProps {
    saveInfo: SaveInfo;
    versionSpec: VersionSpec;
    repositoryContext: GitRepositoryContext;
    canCreatePullRequest: boolean;
}

export const SaveInfoBanner = (props: SaveInfoBannerProps): JSX.Element => {
    const branchName = getBranchName(props);
    const pullRequestCreateUrl = branchName &&
        props.canCreatePullRequest &&
        getCreatePullRequestUrl(props.repositoryContext, branchName);

    const hasSecondPart = pullRequestCreateUrl || props.saveInfo.existingPullRequest;

    return (
        <span className="commit-success-message">
            <CommitLink {...getCommitLinkProps(props)} />
            {hasSecondPart && " — "}
            {
                pullRequestCreateUrl &&
                <PullRequestCreateLink url={pullRequestCreateUrl}/>
            }
            {
                props.saveInfo.existingPullRequest &&
                <PullRequestViewLink {...props} />
            }
        </span>);
};

interface CommitLinkProps {
    url: string;
    targetHubId: string;
    text: string;
    tooltip: string;
    prefixMessage: string;
}

const CommitLink = ({ prefixMessage, url, tooltip, text, targetHubId }: CommitLinkProps) =>
    <span className="limited-text">
        {prefixMessage}
        <FpsLink targetHubId={targetHubId} href={url} title={tooltip}>
            <div className="bowtie-icon bowtie-tfvc-commit"/>
            <span>{text}</span>
        </FpsLink>
    </span>;

const PullRequestCreateLink = ({ url }: { url: string }): JSX.Element =>
    <FpsLink targetHubId={CodeHubContributionIds.pullRequestHub} className="limited-text" href={url}>
        {VCResources.CreatePullRequestLabel}
    </FpsLink>;

const PullRequestViewLink = (props: SaveInfoBannerProps): JSX.Element => {
    const existingPullRequest = props.saveInfo.existingPullRequest;

    return (existingPullRequest &&
        <span>
        {VCResources.UpdatedExistingPullRequestAfterCommit}
        <FpsLink
            targetHubId={CodeHubContributionIds.pullRequestHub}
            className="limited-text"
            href={
                getPullRequestUrl(
                    GitRepositoryContext.create(existingPullRequest.repository, props.repositoryContext.getTfsContext()),
                    existingPullRequest.pullRequestId)
            }>
            <span className="bowtie-icon bowtie-tfvc-pull-request"/>
            {existingPullRequest.title}
        </FpsLink>
    </span>);
};

function getCommitLinkProps(props: SaveInfoBannerProps): CommitLinkProps {
    if (props.repositoryContext.getRepositoryType() === RepositoryType.Git) {
        const commitSpec = props.saveInfo.newRealVersionSpec as GitCommitVersionSpec;

        return {
            url: getCommitUrl(props.repositoryContext, commitSpec.commitId),
            targetHubId: CodeHubContributionIds.historyHub,
            text: format(VCResources.CommitSuccessLinkFormat, commitSpec.getShortCommitId(), props.saveInfo.comment),
            tooltip: VCResources.CommitTooltipMessage,
            prefixMessage: props.saveInfo.newBranchVersionSpec
                ? format(VCResources.CommitToNewBranchSuccessMessageHtml, htmlEncode(props.saveInfo.newBranchVersionSpec.branchName))
                : VCResources.CommitSuccessMessageHtml,
        };
    } else {
        const changesetSpec = props.saveInfo.newRealVersionSpec as ChangesetVersionSpec;

        return {
            url: getChangesetUrl(changesetSpec.changeset),
            targetHubId: CodeHubContributionIds.changesetsHub,
            text: format(VCResources.CheckinSuccessLinkFormat, changesetSpec.changeset, props.saveInfo.comment),
            tooltip: VCResources.CheckinSuccessfulMessage,
            prefixMessage: VCResources.CheckinSuccessMessageHtml,
        };
    }
}

function getBranchName(props: SaveInfoBannerProps): string {
    if (props.repositoryContext.getRepositoryType() === RepositoryType.Git) {
        if (props.saveInfo.newBranchVersionSpec) {
            return props.saveInfo.newBranchVersionSpec.branchName;
        } else if (!props.saveInfo.existingPullRequest) {
            return (props.versionSpec as GitBranchVersionSpec).branchName;
        }
    }
}
