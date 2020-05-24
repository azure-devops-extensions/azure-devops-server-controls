/// <reference types="react" />
import * as React from "react";
import * as Number from "VSS/Utils/Number";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VCContainer from  "VersionControl/Scenarios/Explorer/Components/Container";

/**
 * Displays the repo stats plus the build/CI statuses.
 */
export const BadgesRowContainer = VCContainer.create(
    ["path", "repositoryBadges"],
    ({ repositoryBadgesState, pathState }) => {
        if (!pathState.isGit || !pathState.isRoot || repositoryBadgesState.omitStats) {
            return null;
        }
        return (
            <div className="vc-explorer-badges-row bowtie">
                <StatBadge
                    count={repositoryBadgesState.pullRequestsCount}
                    title={VCResources.RepoStatsActivePullRequestsTitle}
                    url={repositoryBadgesState.pullRequestsUrl}
                    iconClassName="bowtie-tfvc-pull-request"
                    />
                <StatBadge
                    count={repositoryBadgesState.branchesCount}
                    title={VCResources.RepoStatsBranchesTitle}
                    url={repositoryBadgesState.branchesUrl}
                    iconClassName="bowtie-tfvc-branch"
                    />
                <StatBadge
                    count={repositoryBadgesState.commitsCount}
                    title={VCResources.RepoStatsCommitsTitle}
                    url={repositoryBadgesState.commitsUrl}
                    iconClassName="bowtie-tfvc-commit"
                    />
            </div>);
    });

const StatBadge = (props: { count: number; title: string; url: string; iconClassName: string }) =>
    <a className="stat-badge" key={props.title} href={props.url}>
        <span className={"bowtie-icon " + props.iconClassName} />
        <span className="stat-text">{typeof props.count === "number" ? Number.toDecimalLocaleString(props.count, true) : ""}</span>
        <span className="stat-text">{props.title}</span>
    </a>;
