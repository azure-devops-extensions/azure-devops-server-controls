import { GitPullRequest }from "TFS/VersionControl/Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import * as Utils_String from "VSS/Utils/String";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VCSpecs from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { ReviewerItem } from "VersionControl/Scripts/Utils/ReviewerUtils";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { PullRequestListStatus } from "VersionControl/Scenarios/PullRequestList/Stores/PullRequestListStore";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";

export interface PullRequestUpdatesInfo {
    artifactStatsInfo: ArtifactStatsInfo;
}

export interface ArtifactStatsInfo {
    commentsCount: number;
    commentsCountText: string;
    commentsToolTip: string;
    hasNewUpdates: boolean;
    hasNotBeenVisited: boolean;
    lastUpdatedDate: Date;
    numberOfUpdatesText: string;
}

export interface PullRequestListSectionInfo {
    id: string;
    criteria: PullRequestListQueryCriteria;
    cssClass?: string;
    isCollapsed?: boolean;
    isTeam?: boolean
    customizeable?: boolean;
}

export interface PullRequestListSection {
    sectionInfo: PullRequestListSectionInfo;
    items: PullRequestSummaryDetails[];
    status: PullRequestListStatus;
    hasMore: boolean;
    initialLoad: boolean;
}

export class PullRequestSummaryDetails {
    public primaryInfo: PullRequestCardInfo;
    public updatesInfo: PullRequestUpdatesInfo;
    public sortedReviewers: ReviewerItem[];

    constructor(primaryInfo: PullRequestCardInfo, updatesInfo: PullRequestUpdatesInfo, sortedReviewers: ReviewerItem[]) {
        this.primaryInfo = primaryInfo;
        this.updatesInfo = updatesInfo;
        this.sortedReviewers = sortedReviewers;
    }

    /**
     * Return whether or not the item contains new updates the user has not seen
     */
    public hasNewUpdates() : boolean {
        return this.updatesInfo && this.updatesInfo.artifactStatsInfo && this.updatesInfo.artifactStatsInfo.hasNewUpdates;
    }

    /**
     * Return true if the current user has never visited this item
     */
    public hasNotBeenVisited(): boolean {
        return this.updatesInfo && this.updatesInfo.artifactStatsInfo && this.updatesInfo.artifactStatsInfo.hasNotBeenVisited;
    }

    /**
     * Return true if the current user has approved this item
     */
    public hasCurrentUserApproved(): boolean {
        if (!this.sortedReviewers || !this.sortedReviewers.length) {
            return false;
        }
        
        const currentUserId: string = TfsContext.getDefault().currentIdentity.id;

        for (const reviewer of this.sortedReviewers) {
            const reviewerId: string = (reviewer.identity && reviewer.identity.id) || null;
            const isApproved: boolean = (reviewer.identity && reviewer.identity.vote > 0) || false;

            if (reviewerId === currentUserId && isApproved) {
                return true;
            }
        }

        return false;
    }

    /**
     * Return unique row id
     */
    public getId(): string {
        return this.primaryInfo.gitPullRequest.pullRequestId.toString();
    }

    /**
     * Return true if favorite line matches the query, and when the query string is empty.
     * @param query
     */
    public isMatch(query: string): boolean {
        return false;
    }

    /**
     * Returns true if favorited item was deleted
     */
    public isDisabled(): boolean {
        return false;
    }
}

