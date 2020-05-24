import * as Utils_String from "VSS/Utils/String";
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as VSS_Common_Contracts from "VSS/WebApi/Contracts";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { tryParseMSJSON } from "VSS/Utils/Core";
import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { CodeReviewDiscussionIdentityConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { CodeReviewDiscussionConstants } from "CodeReview/Client/CodeReview.Common";

export enum PullRequestVoteStatus {
    APPROVE = 10,
    APPROVE_WITH_COMMENT = 5,
    NONE = 0,
    NOT_READY = -5,
    REJECT = -10
}

/**
 * Helper methods for reviewers / identities that are used in multiple places
 */
export class ReviewerUtils {

    public static GenerateIdentityRefWithVote(id: string, displayName: string, isContainer: boolean, uniqueName: string, vote: number): VCContracts.IdentityRefWithVote {

        const identityRefWithVote = <VCContracts.IdentityRefWithVote>{
            isRequired: false,
            reviewerUrl: "",
            vote: vote,
            votedFor: [],

            id: id,
            displayName: displayName,
            isContainer: isContainer,
            uniqueName: uniqueName,

            imageUrl: "",
            isAadIdentity: false,
            profileUrl: "",
            url: "",
            inactive: false,
            directoryAlias: null
        }

        return identityRefWithVote
    }

    /**
     * Generate an identity ref type from inputs
     * @param id
     * @param displayName
     * @param isContainer
     * @param uniqueName
     */
    public static GenerateIdentityRef(id: string, displayName: string, isContainer: boolean, uniqueName: string): VSS_Common_Contracts.IdentityRef {

        const identityRef = <VSS_Common_Contracts.IdentityRef>{
            id: id,
            displayName: displayName,
            isContainer: isContainer,
            uniqueName: uniqueName,

            imageUrl: "",
            isAadIdentity: false,
            profileUrl: "",
            url: "",
            inactive: false,
            directoryAlias: null
        }

        return identityRef
    }

    public static hasPropertyValue(objWithProps: DiscussionThread, propName: string): boolean {
        return propName in objWithProps.properties;
    }

    public static getPropertyValue(objWithProps: DiscussionThread, propName: string, defaultValue: string = null): string {
        if (objWithProps.properties[propName]) {
            return objWithProps.properties[propName].$value;
        }
        return defaultValue;
    }

    public static identityRefWithVoteUIComparer(a: VCContracts.IdentityRefWithVote, b: VCContracts.IdentityRefWithVote): number {
        if (a.isRequired && !b.isRequired) {
            return -1;
        }

        if (!a.isRequired && b.isRequired) {
            return 1;
        }

        if (a.vote !== 0 && b.vote === 0) {
            return -1;
        }

        if (a.vote === 0 && b.vote !== 0) {
            return 1;
        }

        if (a.isContainer && !b.isContainer) {
            return -1;
        }

        if (!a.isContainer && b.isContainer) {
            return 1;
        }

        if (a.vote != b.vote) {
            return a.vote - b.vote;
        }

        return Utils_String.localeIgnoreCaseComparer(ReviewerUtils.getDisplayName(a), ReviewerUtils.getDisplayName(b));
    }

    public static getDisplayName(reviewer: VCContracts.IdentityRefWithVote): string {
        if (reviewer.isContainer) {
            let lastBackSlash = reviewer.displayName.lastIndexOf('\\');
            if (lastBackSlash < 0) {
                lastBackSlash = reviewer.displayName.lastIndexOf('/');
            }

            if (lastBackSlash >= 0 && reviewer.displayName.length > lastBackSlash) {
                return reviewer.displayName.substring(lastBackSlash + 1);
            }
        }

        return reviewer.displayName;
    }

    public static getSortedReviewers(
        pullRequest: VCContracts.GitPullRequest,
        comparer: (a: VCContracts.IdentityRefWithVote, b: VCContracts.IdentityRefWithVote) => number): ReviewerItem[] {
        const reviewers = pullRequest.reviewers || [];

        // build up list of delegate reviewers
        const sortedReviewers: VCContracts.IdentityRefWithVote[] = reviewers.sort(comparer);

        // find containers and put them into a dictionary
        // loop through reviewers, and if they voted for a group, put them in the container
        const reviewerGroupMap: { [id: string]: VCContracts.IdentityRefWithVote[] } = ReviewerUtils.generateDelegateReviewersMap(sortedReviewers);

        const reviewerItems: ReviewerItem[] = [];
        for (const reviewer of sortedReviewers) {
            const delegateReviewers = reviewerGroupMap[reviewer.id];
            const reviewerItem = ReviewerItem.from(pullRequest, reviewer, delegateReviewers);
            reviewerItems.push(reviewerItem);
        }
        return reviewerItems;
    }

    public static getIdentityRef(
        thread: DiscussionThread, 
        identityPropertyName: string,
        tfIdPropertyName: string,
        displayNamePropertyName: string) : IdentityRef {

        if (ReviewerUtils.hasPropertyValue(thread, identityPropertyName)) {        
            return thread.identities[ReviewerUtils.getPropertyValue(thread, identityPropertyName)];
        }
        else if (ReviewerUtils.hasPropertyValue(thread, tfIdPropertyName)){
            return {
                id: ReviewerUtils.getPropertyValue(thread, tfIdPropertyName),
                displayName: ReviewerUtils.getPropertyValue(thread, displayNamePropertyName)
            } as IdentityRef;
        }
        else {
            return null;
        }
    }

    public static getExampleIdentities(
        thread: DiscussionThread,
        identityPropertyName: string,
        tfIdPropertyName: string,
        displayNamePropertyName: string) : IdentityRef[] {

        let result : IdentityRef[] = [];
        if (ReviewerUtils.hasPropertyValue(thread, identityPropertyName)) {        
            const exampleReviewerKeys = tryParseMSJSON(ReviewerUtils.getPropertyValue(thread, identityPropertyName));
            exampleReviewerKeys.forEach(key => result.push(thread.identities[key]));
        }
        else {
            const exampleReviewerDisplayNames = tryParseMSJSON(ReviewerUtils.getPropertyValue(thread, displayNamePropertyName));
            const exampleReviewerIds = tryParseMSJSON(ReviewerUtils.getPropertyValue(thread, tfIdPropertyName));
            
            for(let i = 0; i < exampleReviewerIds.length; i++) { 
                result.push({
                    id: exampleReviewerIds[i],
                    displayName: exampleReviewerDisplayNames[i]
                } as IdentityRef);
            }
        }
        
        return result;
    }
    
    protected static generateDelegateReviewersMap(reviewers: VCContracts.IdentityRefWithVote[]): { [id: string]: VCContracts.IdentityRefWithVote[] } {
        // find containers and put them into a dictionary
        // loop through reviewers, and if they voted for a group, put them in the container
        const reviewerGroupMap: { [id: string]: VCContracts.IdentityRefWithVote[] } = {};
        const reviwerGroupKeys = [];
        for (const reviewer of reviewers) {
            if (reviewer.isContainer && reviewer.vote !== 0) {
                reviewerGroupMap[reviewer.id] = [];
                reviwerGroupKeys.push(reviewer.id);
            }
        }

        for (const reviewer of reviewers) {
            if (!reviewer.isContainer && reviewer.vote !== 0 && reviewer.votedFor) {
                for (const votedFor of reviewer.votedFor) {
                    const delegateReviewers = reviewerGroupMap[votedFor.id];
                    if (delegateReviewers) {
                        delegateReviewers.push(reviewer);
                    }
                }
            }
        }

        return reviewerGroupMap;
    }
}

export class ReviewerItem {

    public displayName: string;
    public statusText: string;
    public delegateReviewersDisplayName: string;
    public accessibleStatusText: string;
    public hasVote: boolean;

    public identity: VCContracts.IdentityRefWithVote;
    public delegateReviewers: ReviewerItem[];

    public static from(pullRequest: VCContracts.GitPullRequest, reviewer: VCContracts.IdentityRefWithVote, delegateReviewers: VCContracts.IdentityRefWithVote[]): ReviewerItem {
        const statusText = ReviewerItem._calculateStatusDisplayText(pullRequest.status === VCContracts.PullRequestStatus.Active, reviewer.vote);
        const displayName = ReviewerUtils.getDisplayName(reviewer);

        if (!reviewer.isContainer) {
            return <ReviewerItem>{
                displayName: displayName,
                statusText: statusText,
                hasVote: reviewer.vote !== 0,
                delegateReviewersDisplayName: "",
                accessibleStatusText: Utils_String.format(VCResources.PullRequest_ReviewerFullStatus, displayName, statusText),

                identity: reviewer,
                delegateReviewers: null,
            }
        }
        else {
            const delegateReviewersDisplayName = ReviewerItem._generateDelegateReviewersDisplayName(delegateReviewers);
            return <ReviewerItem>{
                displayName: displayName,
                statusText: statusText,
                hasVote: reviewer.vote !== 0,
                delegateReviewersDisplayName: delegateReviewersDisplayName,
                accessibleStatusText:
                    delegateReviewersDisplayName ?
                    Utils_String.format(VCResources.PullRequest_ReviewerGroupFullStatus, displayName, statusText, delegateReviewersDisplayName) : 
                    Utils_String.format(VCResources.PullRequest_ReviewerFullStatus, displayName, statusText),
                identity: reviewer,
                delegateReviewers: delegateReviewers ? delegateReviewers.map(delegateReviewer => ReviewerItem.from(pullRequest, delegateReviewer, null)) : null
            };
        }
    }

    public static NonParticapatingReviewer(reviewer: TFS_Host_TfsContext.IContextIdentity): ReviewerItem {

        // The identity type returned by TFS context is not the same
        // identity type returned in VC contracts. We do a translation
        // here.
        const fakeIdentityRefWithVote: VCContracts.IdentityRefWithVote = ReviewerUtils.GenerateIdentityRefWithVote(reviewer.id, reviewer.displayName, reviewer.isContainer, reviewer.uniqueName, 0);

        return <ReviewerItem>{
            displayName: reviewer.displayName,
            hasVote: false,
            statusText: VCResources.PullRequest_ReviewerFeedback_NoResponse,
            delegateReviewersDisplayName: "",

            identity: fakeIdentityRefWithVote,
            delegateReviewers: null,
        }
    }

    protected static _calculateStatusDisplayText(isActive: boolean, vote: number): string {

        let statusText: string = "";

        switch (vote) {
            case 10:
                statusText = VCResources.PullRequest_Approve;
                break;
            case 5:
                statusText = VCResources.PullRequest_ApproveWithComment;
                break;
            case 0:
                if (isActive) {
                    statusText = VCResources.PullRequest_ReviewerFeedback_AwaitingResponse;
                } else {
                    statusText = VCResources.PullRequest_ReviewerFeedback_NoResponse;
                }
                break;
            case -5:
                statusText = VCResources.PullRequest_NotReady;
                break;
            case -10:
                statusText = VCResources.PullRequest_Reject;
                break;
        }

        return statusText;
    }

    private static _generateDelegateReviewersDisplayName(delegateReviewers: VCContracts.IdentityRefWithVote[]): string {
        if (!delegateReviewers || delegateReviewers.length === 0) {
            return;
        }

        if (delegateReviewers.length === 1) {
            return delegateReviewers[0].displayName;
        } else if (delegateReviewers.length === 2) {
            return Utils_String.format(VCResources.PullRequest_DelegateReviewerTwoPeople, delegateReviewers[0].displayName);
        } else if (delegateReviewers.length > 2) {
            return Utils_String.format(VCResources.PullRequest_DelegateReviewerThreePlusPeople, delegateReviewers[0].displayName, delegateReviewers.length - 1);
        }

        return "";
    }
}
