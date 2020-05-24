import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";
import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import * as VCContracts from "TFS/VersionControl/Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { convertArtifactUriToPublicBuildUrl } from "VersionControl/Scripts/Utils/Build";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { ReviewerUtils } from "VersionControl/Scripts/Utils/ReviewerUtils";

export interface PullRequestStatusCard {
    author: IdentityRef;
    targetUrl: string;
    displayName: string;
    statusContext: string;
    statusStateLabel: string;
    statusStateIconCss: string;
    iterationId: string;
}

export interface PullRequestStatus {
    status: VCContracts.GitPullRequestStatus;
}

export function getPullRequestStatusCard(thread: DiscussionThread): PullRequestStatusCard {
    const statusName: string = ReviewerUtils.getPropertyValue(thread, CodeReviewDiscussionConstants.CodeReviewAssociatedStatusName);
    const contextGenre: string = ReviewerUtils.getPropertyValue(thread, CodeReviewDiscussionConstants.CodeReviewAssociatedStatusContextGenre);
    const contextName: string = ReviewerUtils.getPropertyValue(thread, CodeReviewDiscussionConstants.CodeReviewAssociatedStatusContextName);

    const statusCard = {
        iterationId: ReviewerUtils.getPropertyValue(thread, CodeReviewDiscussionConstants.CodeReviewAssociatedStatusIterationId),
        author: ReviewerUtils.getIdentityRef(
            thread, 
            CodeReviewDiscussionIdentityConstants.CodeReviewAssociatedStatusUpdatedByIdentity,
            CodeReviewDiscussionConstants.CodeReviewAssociatedStatusUpdatedByTfId,
            CodeReviewDiscussionConstants.CodeReviewAssociatedStatusUpdatedByDisplayName),
            
        targetUrl: ReviewerUtils.getPropertyValue(thread, CodeReviewDiscussionConstants.CodeReviewAssociatedStatusTargetUrl),
    } as PullRequestStatusCard;

    const defaultState: string = VCContracts.GitStatusState[VCContracts.GitStatusState.NotSet];
    const stateString: string = ReviewerUtils.getPropertyValue(thread, CodeReviewDiscussionConstants.CodeReviewAssociatedStatus, defaultState);
    const statusState = VCContracts.GitStatusState[stateString];
    statusCard.statusStateLabel = getStatusStateLabel(statusState);
    statusCard.statusStateIconCss = getIconStatusClass(statusState);

    statusCard.displayName = getStatusDisplayName(statusName, contextName, contextGenre);
    statusCard.statusContext = getStatusContext(contextName, contextGenre);

    return statusCard;
}

export function getStatusContext(contextName: string, contextGenre: string): string {
    if (contextGenre) {
        return `${contextGenre}/${contextName}`;
    }
    return contextName;
}

export function getStatusDisplayName(description: string, contextName: string, contextGenre: string): string {
    return description || getStatusContext(contextName, contextGenre);
}

export function getStatusPolicyDisplayName(description: string, defaultDisplayName: string, contextName: string, contextGenre: string): string {
    return description || defaultDisplayName || getStatusContext(contextName, contextGenre);
}

export function getIconStatusClass(statusState: VCContracts.GitStatusState): string {
    switch (statusState) {
        case undefined:
        case VCContracts.GitStatusState.NotSet:
            return "bowtie-icon bowtie-status-waiting";

        case VCContracts.GitStatusState.Pending:
            return "bowtie-icon bowtie-play-fill";

        case VCContracts.GitStatusState.Succeeded:
            return "bowtie-icon bowtie-check";

        case VCContracts.GitStatusState.Error:
        case VCContracts.GitStatusState.Failed:
        default:
            return "bowtie-icon bowtie-math-multiply";
    }
}

export function getStatusStateLabel(statusState: VCContracts.GitStatusState): string {
    switch (statusState) {

        case VCContracts.GitStatusState.NotSet:
            return VCResources.PullRequestStatus_StateLabel_NotSet;

        case VCContracts.GitStatusState.Pending:
            return VCResources.PullRequestStatus_StateLabel_Pending;

        case VCContracts.GitStatusState.Succeeded:
            return VCResources.PullRequestStatus_StateLabel_Succeeded;

        case VCContracts.GitStatusState.Error:
            return VCResources.PullRequestStatus_StateLabel_Error;

        case VCContracts.GitStatusState.Failed:
            return VCResources.PullRequestStatus_StateLabel_Failed;

        default:
            return null;
    }
}

export function compareStatusesByUpdatedDateDescending(a: PullRequestStatus, b: PullRequestStatus): number {
    return a.status.updatedDate < b.status.updatedDate ? 1 : -1;
}

export function toPullRequestStatus(name: string, genre: string): PullRequestStatus {
    const status = {
        context: {
            name: name,
            genre: genre
        },
        creationDate: new Date(),
        state: VCContracts.GitStatusState.NotSet
    } as VCContracts.GitPullRequestStatus;
    return { status };
}

export function buildLatestStatusesListAndResolve(statuses: VCContracts.GitPullRequestStatus[], repoContext: RepositoryContext): PullRequestStatus[] {
    const latestStatuses = buildLatestStatusesList(statuses);
    return resolveTargetUrl(latestStatuses, repoContext);
}

function buildLatestStatusesList(statuses: VCContracts.GitPullRequestStatus[]): VCContracts.GitPullRequestStatus[] {
    if (statuses && statuses.length < 1) {
        return [];
    }

    const latestStatusesLookup: IDictionaryStringTo<VCContracts.GitPullRequestStatus> = {};

    statuses.forEach((status) => {
        const statusKey = getStatusKey(status);

        const existingStatus = latestStatusesLookup[statusKey];
        if (existingStatus) {
            if (existingStatus.creationDate < status.creationDate) {
                latestStatusesLookup[statusKey] = status;
            }
        }
        else {
            latestStatusesLookup[statusKey] = status;
        }
    });

    return Object.keys(latestStatusesLookup).map(key => latestStatusesLookup[key]);
}

function resolveTargetUrl(statuses: VCContracts.GitPullRequestStatus[], repoContext: RepositoryContext): PullRequestStatus[] {
    if (!statuses || statuses.length < 1) {
        return [];
    }

    return statuses.map(status => {
        const newUrl = convertArtifactUriToPublicBuildUrl(status.targetUrl, repoContext);
        status.targetUrl = newUrl;
        return ({ status });
    });
}

function getStatusKey(status: VCContracts.GitPullRequestStatus): string {
    return `${status.context.genre}/${status.context.name}/${status.iterationId}`;
}
