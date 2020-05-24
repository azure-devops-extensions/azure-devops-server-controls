import * as VSSStore from "VSS/Flux/Store";
import { PullRequestUpdatesInfo, ArtifactStatsInfo } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import * as Utils_String from "VSS/Utils/String";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as VisitsContracts from "CodeReview/Visits/Contracts";

export interface PullRequestArtifactStats {
    pullRequestId: number;
    artifactStats: VisitsContracts.ArtifactStats;
}

const NUMBER_OF_COMMENTS_THRESHOLD: number = 99;

export class PullRequestListUpdatesStore extends VSSStore.Store {
    private _pullRequestInfoMap: IDictionaryNumberTo<PullRequestUpdatesInfo> = {};

    public updatePullRequestArtifactStats(artifactStatsList: PullRequestArtifactStats[]) {
        if (this._updatePullRequestsInfo(artifactStatsList)) {
            this.emitChanged();
        }
    }

    public getStoreState(): IDictionaryNumberTo<PullRequestUpdatesInfo> {
        return this._pullRequestInfoMap;
    }

    private _updatePullRequestsInfo(artifactStatsList: PullRequestArtifactStats[]): boolean {
        let updated: boolean = false;
        artifactStatsList.forEach(stats => {
            if (stats.artifactStats && stats.artifactStats.commentsCount) {
                const commentsCount = stats.artifactStats.commentsCount[VisitsContracts.CommentThreadType.Text];
                const hasNotBeenVisited: boolean = !stats.artifactStats.newCommentsCount;
                const hasNewUpdates: boolean = hasNotBeenVisited || (stats.artifactStats.newCommentsCount[VisitsContracts.CommentThreadType.All] > 0);

                const artifactStatsInfo: ArtifactStatsInfo = {
                    commentsCount: commentsCount,
                    commentsToolTip: getCommentsTooltip(commentsCount),
                    commentsCountText: getNumberOfCommentsText(commentsCount),
                    hasNewUpdates: hasNewUpdates,
                    hasNotBeenVisited: hasNotBeenVisited,
                    lastUpdatedDate: stats.artifactStats.lastUpdatedDate,
                    numberOfUpdatesText: getNumberOfUpdatesText(stats.artifactStats)
                };

                this._pullRequestInfoMap[stats.pullRequestId] = {
                    artifactStatsInfo: artifactStatsInfo
                };
                updated = true;
            }
        });
        return updated;
    }
}

export function getNumberOfCommentsText(commentsCount: number): string {
    if (commentsCount > NUMBER_OF_COMMENTS_THRESHOLD) {
        return Utils_String.format(VCResources.PullRequest_CommentsCount_MoreThanThreshold, NUMBER_OF_COMMENTS_THRESHOLD.toString());
    }

    return commentsCount.toString();
}

export function getCommentsTooltip(commentsCount: number): string {
    if (commentsCount === 0) {
        return VCResources.PullRequest_ZeroComments_Tooltip;
    }
    else if (commentsCount === 1) {
        return VCResources.PullRequest_OneComment_Tooltip;
    }
    else {
        return Utils_String.format(VCResources.PullRequest_MultipleComments_Tooltip, commentsCount.toString());
    }
}

export function getNumberOfUpdatesText(artifactStats: VisitsContracts.ArtifactStats): string {
    if (!artifactStats.newCommentsCount) {
        return VCResources.PullRequest_NewPullRequest;
    }

    const numberOfUpdates: string[] = [];

    const allChanges: number = artifactStats.newCommentsCount[VisitsContracts.CommentThreadType.All];
    const numPushes: number = artifactStats.newCommentsCount[VisitsContracts.CommentThreadType.Iteration];
    const numComments: number = artifactStats.newCommentsCount[VisitsContracts.CommentThreadType.Text];
    const numVotes: number = artifactStats.newCommentsCount[VisitsContracts.CommentThreadType.Vote];

    if (numComments) {
        const template = (numComments === 1) ? VCResources.PullRequest_New_Comment_Singular : VCResources.PullRequest_New_Comment_Plural;
        numberOfUpdates.push(Utils_String.format(template, numComments));
    }

    if (numVotes) {
        const template = (numVotes === 1) ? VCResources.PullRequest_New_Vote_Singular : VCResources.PullRequest_New_Vote_Plural;
        numberOfUpdates.push(Utils_String.format(template, numVotes));
    }

    if (numPushes) {
        const template = (numPushes === 1) ? VCResources.PullRequest_New_Push_Singular : VCResources.PullRequest_New_Push_Plural;
        numberOfUpdates.push(Utils_String.format(template, numPushes));
    }  

    const numOtherChanges: number = allChanges - numPushes - numComments - numVotes;
    if (numOtherChanges) {
        let template = (numOtherChanges === 1) ? VCResources.PullRequest_OtherChange_Singular : VCResources.PullRequest_OtherChange_Plural;
        if (!numberOfUpdates.length) {
            template = (numOtherChanges === 1) ? VCResources.PullRequest_Change_Singular : VCResources.PullRequest_Change_Plural;
        }
        numberOfUpdates.push(Utils_String.format(template, numOtherChanges));
    }

    return numberOfUpdates.join(", ");
}