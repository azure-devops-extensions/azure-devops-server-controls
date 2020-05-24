import * as React from "react";

import { ago } from "VSS/Utils/Date";
import { format } from "VSS/Utils/String";

import { BranchDetail } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestBranchDetail";
import { ISuggestionObject } from "VersionControl/Scenarios/Shared/Suggestion";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import { FpsLink } from "VersionControl/Scenarios/Shared/FpsLink";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";

export interface Props {
    suggestion: ISuggestionObject;
}

/**
 * A component to display a suggestion to create a new pull request from a recent branch.
 */
export const CreatePullRequestSuggestionBanner = (props: Props): JSX.Element => {

    if (!props.suggestion || !props.suggestion.repositoryContext) {
        return null;
    }

    const sourceRepositoryContext = props.suggestion.sourceRepositoryContext ? props.suggestion.sourceRepositoryContext : props.suggestion.repositoryContext;

    return (
        <span className="vc-pullrequest-suggestion">
            <span>{VCResources.PullRequest_SuggestionBranchPushed1}</span>
            <BranchDetail
                key="suggestionBranchDetail"
                showRepository={sourceRepositoryContext.getRepositoryId() !== props.suggestion.repositoryContext.getRepositoryId()}
                className={"vc-suggestion-branchDetail"}
                repositoryUrl={props.suggestion.explorerRepositoryUrl}
                repositoryName={sourceRepositoryContext.getRepository().name}
                repositoryClass={sourceRepositoryContext.getRepositoryClass()}
                branchExplorerUrl={props.suggestion.explorerBranchUrl}
                branchName={props.suggestion.sourceBranch}
                branchLabel={format(VCResources.PullRequest_SuggestionBranchTitle, props.suggestion.sourceBranch)}
            />
            <span>{format(VCResources.PullRequest_SuggestionBranchPushed2, ago(props.suggestion.pushDate))}</span>
            <FpsLink
                targetHubId={CodeHubContributionIds.pullRequestHub}
                href={props.suggestion.createPullRequestURL}>
                {VCResources.CreatePullRequestLabel}
            </FpsLink>
        </span>
    );
};
