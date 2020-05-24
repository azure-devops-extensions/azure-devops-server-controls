import { PullRequestStatus } from "TFS/VersionControl/Contracts";
import { GitPullRequest } from "TFS/VersionControl/Contracts";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export class PullRequestListQueryCriteria {
    public static MaxPullRequestsPerQueryCount: number = 51;

    public readonly criteriaTitle: string;

    public readonly status: PullRequestStatus;

    public readonly authorId: string;

    public readonly reviewerId: string;

    public readonly key: string;

    public readonly clientFilter?: (pullRequests: GitPullRequest[]) => GitPullRequest[];
    
    public readonly telemetryGroupName: string;

    // For the time being, we have a divided use of this class. Most things, including the rest api, only support single author/reviewer
    // But for the custom section, we allow matching against multiple authors/reviewers where the data provider just knows what to do
    // Changing authorId and reviewerId to arrays requires a huge amount of churn that is ultimately just deceptive and
    // makes everything harder to read because so much of the machinery will look like it supports something it doesn't
    // So I decided to just keep these separate until we decide to commit to everything supporting multi search which I
    // don't expect to be any time soon. Nothing in customization pays attention to the regular authorId/reviewerId and nothing
    // outside of customization pays attention to these custom members.
    public readonly customSectionAuthorIds: string[];
    public readonly customSectionReviewerIds: string[];

    public tryApplyClientFilter(pullRequests: GitPullRequest[]): GitPullRequest[] {
        if (this.clientFilter) {
            return this.clientFilter(pullRequests);
        }
        return pullRequests;
    }

    constructor(status: PullRequestStatus, authorId: string | string[], reviewerId: string | string[], criteriaTitle: string = null, 
        clientFilter:(pullRequests: GitPullRequest[]) => GitPullRequest[] = null, telemetryGroupName?: string, key?: string) {

        if(typeof authorId === "string" ) {
            this.authorId = authorId;
        }
        else {
            this.customSectionAuthorIds = authorId;
        }

        if(typeof reviewerId === "string" ) {
            this.reviewerId = reviewerId;
        }
        else {
            this.customSectionReviewerIds = reviewerId;
        }

        this.status = status;
        this.criteriaTitle = criteriaTitle;
        this.clientFilter = clientFilter;
        
        this.key = key || `${PullRequestStatus[this.status]}.${this.authorId}.${this.reviewerId}.${this.criteriaTitle}`;
        this.telemetryGroupName = telemetryGroupName || "Generic";
    }

    public serializeCustomCriteria(): string {
        if(this === EmptyCriteria) {
            return "";
        }
    
        let objectToSerialize = {
            criteriaTitle: this.criteriaTitle,
            status: this.status,
            authorIds: this.customSectionAuthorIds || undefined,
            reviewerIds: this.customSectionReviewerIds || undefined,
            version: 1
        };
        return JSON.stringify(objectToSerialize);
    }

    public static parseCustomCriteria(data: string): PullRequestListQueryCriteria {
        if(!data || data === "{}") {
            return EmptyCriteria;
        }
    
        let dataValues = JSON.parse(data);
        let criteria = new PullRequestListQueryCriteria(dataValues.status || PullRequestStatus.All, dataValues.authorIds, dataValues.reviewerIds, dataValues.criteriaTitle, null, CustomizeSectionName, CustomizeSectionName);
        return criteria;
    }
}

export const CustomizeSectionName = "UserView";
export const EmptyCriteria: PullRequestListQueryCriteria = new PullRequestListQueryCriteria(PullRequestStatus.Active, null, null, VCResources.PullRequestListCustomSectionTitle, null, CustomizeSectionName, CustomizeSectionName);