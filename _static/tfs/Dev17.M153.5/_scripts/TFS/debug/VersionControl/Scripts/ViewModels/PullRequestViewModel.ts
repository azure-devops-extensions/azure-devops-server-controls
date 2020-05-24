import Q = require("q");
import ko = require("knockout");

import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import Utils_String = require("VSS/Utils/String");
import Utils_Date = require("VSS/Utils/Date");
import Service = require("VSS/Service");
import { HubsService } from "VSS/Navigation/HubsService";

import VCContracts = require("TFS/VersionControl/Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCPullRequestsControls = require("VersionControl/Scripts/Controls/PullRequest");
import VCSpecs = require("VersionControl/Scripts/TFS.VersionControl.VersionSpecs");
import * as VCDateUtils from "VersionControl/Scripts/Utils/VersionControlDateUtils";
import {PullRequestStatusState, PullRequestVoteStatus} from "VersionControl/Scripts/PullRequestTypes";
import * as PullRequestUtils from "VersionControl/Scripts/PullRequestUtils";

export interface IBranchStatus {
    headOutOfDate: boolean;
    headCommitId: string;
}

export interface IDeleteSourceBranchReason {
    canDelete: boolean; // is the branch deletable?
    reasonHint: string; // translated reason the branch cannot be deleted (null if it is deletable)
}

const NUMBER_OF_COMMENTS_THRESHOLD: number = 99;
const AUTHOR_HTML_FORMAT = "<span class='vc-pullrequest-author-name'>{0}</span>";
const BRANCH_HTML_FORMAT = `
    <a class="vc-pullrequest-entry-branch" href="{0}" title="{1}">
    <span class="bowtie-icon bowtie-tfvc-branch vc-pullrequest-branch-icon"></span>{2}</a>{3}`;

const REPOSITORY_HTML_FORMAT = `
    <span class="secondary-text">{0}</span>
    <span class="bowtie-icon bowtie-git"></span>
    <a href="{1}" title="{2}">{3}</a>`;

/**
 * ViewModel backing the result entry for a single pull requests.
 */
export class ViewModel extends VCViewModel.VersionControlViewModel {
    private _pullRequest: VCContracts.GitPullRequest;

    public commentsAvailable: KnockoutObservable<boolean>;
    public numberOfComments: KnockoutObservable<number>;
    public numberOfCommentsText: KnockoutComputed<string>;
    public commentsTooltip: KnockoutComputed<string>;

    public numberOfUpdatesText: KnockoutObservable<string>;
    public isNew: KnockoutObservable<boolean>;
    public lastUpdatedDate: KnockoutObservable<Date>;
    public lastUpdatedDateString: KnockoutComputed<string>;
    public dateString: KnockoutComputed<string>;
    
    public sourceBranchNameFriendlyString: KnockoutComputed<string>;
    public sourceBranchExplorerUrl: KnockoutObservable<string>;
    public repositoryNameFriendlyString: string;

    public targetBranchNameFriendlyString: KnockoutComputed<string>;
    public targetBranchExplorerUrl: KnockoutObservable<string>;
    public repositoryUrl: string;
    public repositoryToolTip: string;

    public pullRequestHref: KnockoutComputed<string>;

    public title: KnockoutObservable<string>;
    public description: KnockoutObservable<string>;
    public status: KnockoutObservable<VCContracts.PullRequestStatus>;
    public mergeStatus: KnockoutObservable<VCPullRequestsControls.PullRequestAsyncStatusExtended>;

    public lastMergeSourceCommitId: KnockoutObservable<string>;
    public lastMergeTargetCommitId: KnockoutObservable<string>;
    public lastMergeCommitId: KnockoutObservable<string>;
    public pullRequestId: KnockoutObservable<number>;
    public codeReviewId: KnockoutObservable<number>;

    public isActive: KnockoutComputed<boolean>;

    public rollupStatusText: KnockoutObservable<string> = ko.observable(null);
    public rollupStatusState: KnockoutObservable<number> = ko.observable(null);
    public rollupStatusTextCssClass: KnockoutObservable<string> = ko.observable(null);
    public rollupStatusIconCssClass: KnockoutObservable<string> = ko.observable(null);
    public showRepositoryDetails: boolean = false;

    public intoText = VCResources.Into;
    public inText = VCResources.In;

    /*
     * HTML meant to supplement the title for the pull request
     */
    public subInfoHtml: KnockoutComputed<string>;

    private _rollupStatus: PullRequestUtils.IPullRequestRollupStatus;

    constructor(repositoryContext: RepositoryContext, parent: VCViewModel.VersionControlViewModel, options?) {
        super(repositoryContext, parent, options);

        this._pullRequest = options.pullRequest;

        //if the repositorycontext is not provided create one for this PR and show repository details
        if (!this.repositoryContext) {
            this.showRepositoryDetails = true;
            this.repositoryContext = new GitRepositoryContext(TFS_Host_TfsContext.TfsContext.getDefault(), this._pullRequest.repository);
        }
        this.pullRequestId = ko.observable(this._pullRequest.pullRequestId);
        this.codeReviewId = ko.observable(this._pullRequest.codeReviewId);

        this.dateString = ko.computed(this._computeDateString, this);
        
        this.sourceBranchNameFriendlyString = ko.computed(this._computeSourceBranchNameFriendlyString, this);
        this.sourceBranchExplorerUrl = ko.observable(VersionControlUrls.getExplorerUrl(this.repositoryContext, null, null, { version: new VCSpecs.GitBranchVersionSpec(this.sourceBranchNameFriendlyString()).toVersionString() }, this._getRouteData()));
        
        this.repositoryNameFriendlyString = this._computeRepositoryNameString();
        this.repositoryUrl = this._computeRepositoryUrl();
        this.repositoryToolTip = this._computeRepositoryToolTip();

        this.targetBranchNameFriendlyString = ko.computed(this._computeTargetBranchNameFriendlyString, this);
        this.targetBranchExplorerUrl = ko.observable(VersionControlUrls.getExplorerUrl(this.repositoryContext, null, null, { version: new VCSpecs.GitBranchVersionSpec(this.targetBranchNameFriendlyString()).toVersionString() }, this._getRouteData()));

        this.subInfoHtml = ko.computed(this._computeSubInfoHtml, this);

        this.pullRequestHref = ko.computed(this._computePullRequestHref, this);

        this.title = ko.observable(this._pullRequest.title);
        this.description = ko.observable(this._pullRequest.description);
        this.status = ko.observable(this._pullRequest.status);
        this.mergeStatus = ko.observable(<VCPullRequestsControls.PullRequestAsyncStatusExtended>(<number>this._pullRequest.mergeStatus));

        this.lastMergeSourceCommitId = ko.observable(this._pullRequest.lastMergeSourceCommit ? this._pullRequest.lastMergeSourceCommit.commitId : null);
        this.lastMergeTargetCommitId = ko.observable(this._pullRequest.lastMergeTargetCommit ? this._pullRequest.lastMergeTargetCommit.commitId : null);
        this.lastMergeCommitId = ko.observable(this._pullRequest.lastMergeCommit ? this._pullRequest.lastMergeCommit.commitId : null);

        this.commentsAvailable = ko.observable(false);
        this.numberOfComments = ko.observable(0);
        this.numberOfCommentsText = ko.computed(this._getNumberOfCommentsText, this);
        this.commentsTooltip = ko.computed(this._getCommentsTooltip, this);

        this.lastUpdatedDate = ko.observable(new Date(0));
        this.isNew = ko.observable(false);
        this.lastUpdatedDateString = ko.computed(this._getLastUpdatedDateString, this);
        this.numberOfUpdatesText = ko.observable("");

        this.isActive = ko.computed(this._computeIsActive, this);

        this._rollupStatus = PullRequestUtils.computeRollupStatus(this._pullRequest);

        if (this._rollupStatus) {
            this.rollupStatusText = ko.observable(this._rollupStatus.description);
            this.rollupStatusState = ko.observable(this._rollupStatus.state);
            this.rollupStatusTextCssClass(this._rollupStateToCssClass());
            this.rollupStatusIconCssClass(this._rollupStateToIconCssClass());
        }
    }

    public handleXhrNavigate = (item, event): boolean => {
        const handler = Service.getLocalService(HubsService).getHubNavigateHandler("ms.vss-code-web.pull-request-hub", this.pullRequestHref());
        return handler(event);
    }

    private _computeRepositoryNameString(): string {
        if (!this._pullRequest || !this._pullRequest.repository) {
            return "";
        }
        return this._pullRequest.repository.name;
    }

    private _computeRepositoryUrl(): string {
        if (!this._pullRequest || !this._pullRequest.repository) {
            return "";
        }
        return VersionControlUrls.getExplorerUrl(this.repositoryContext, null, null, null, this._getRouteData());
    }

    private _computeRepositoryToolTip(): string {
        if (!this._pullRequest || !this._pullRequest.repository || !this._pullRequest.repository.project) {
            return "";
        }
        return this._pullRequest.repository.project.name + "\\" + this._computeRepositoryNameString();
    }

    private _getNumberOfCommentsText(): string {
        if (this.numberOfComments() > NUMBER_OF_COMMENTS_THRESHOLD) {
            return Utils_String.format(VCResources.PullRequest_CommentsCount_MoreThanThreshold, NUMBER_OF_COMMENTS_THRESHOLD.toString());
        }

        return this.numberOfComments().toString();
    }

    private _getCommentsTooltip(): string {
        if (this.numberOfComments() === 0) {
            return VCResources.PullRequest_ZeroComments_Tooltip;
        }
        else if (this.numberOfComments() === 1) {
            return VCResources.PullRequest_OneComment_Tooltip;
        }
        else {
            return Utils_String.format(VCResources.PullRequest_MultipleComments_Tooltip, this.numberOfComments().toString());
        }
    }

    private _getLastUpdatedDateString(): string {
        const dateToUse: Date = this.lastUpdatedDate().getTime() ? this.lastUpdatedDate() : this._pullRequest.creationDate;
        const isDateRecent: boolean = VCDateUtils.isDateRecent(dateToUse);

        return Utils_String.format(VCResources.PullRequest_Updated, VCDateUtils.getDateString(dateToUse, isDateRecent));
    }

    private _computeIsActive(): boolean {
        if (!this._pullRequest) {
            return false;
        }

        if (this._pullRequest.status === VCContracts.PullRequestStatus.Active) {
            return true;
        }

        return false;
    }

    private _rollupStateToCssClass() : string {
        if (this._rollupStatus) {
            switch (this._rollupStatus.state) {
                case PullRequestStatusState.Success:
                    return "vc-pullrequest-rollupstatus-success-text";
                case PullRequestStatusState.Pending:
                    return "vc-pullrequest-rollupstatus-pending-text";
                case PullRequestStatusState.Failure:
                    return "vc-pullrequest-rollupstatus-failure-text";
                case PullRequestStatusState.Waiting:
                    return "vc-pullrequest-rollupstatus-waiting-text";
                case PullRequestStatusState.Info:
                    return "vc-pullrequest-rollupstatus-info-text";
            }
        }

        return null;
    }

    private _rollupStateToIconCssClass(): string {
        if (this._rollupStatus) {
            switch (this._rollupStatus.state) {
                case PullRequestStatusState.Success:
                    return "bowtie-icon bowtie-check vc-pullrequest-rollupstatus-success";
                case PullRequestStatusState.Pending:
                    return "bowtie-icon bowtie-status-waiting bowtie-status-waiting-response vc-pullrequest-rollupstatus-pending";
                case PullRequestStatusState.Failure:
                    return "bowtie-icon bowtie-math-multiply vc-pullrequest-rollupstatus-failure";
                case PullRequestStatusState.Waiting:
                    return "bowtie-icon bowtie-status-waiting vc-pullrequest-rollupstatus-waiting";
            }
        }

        return null;
    }

    public static getBranchFriendlyName(branchRef: string) {
        if ((branchRef || "").indexOf("refs/heads/") === 0) {
            return branchRef.substr("refs/heads/".length);
        }
        else {
            return branchRef;
        }
    }

    public getPullRequestId(): number {
        return this._pullRequest.pullRequestId;
    }

    public getRepository(): VCContracts.GitRepository {
        return this._pullRequest.repository;
    }

    public getCreatedBy(): any {
        return this._pullRequest.createdBy;
    }

    public getCreationDate(): Date {
        return this._pullRequest.creationDate;
    }

    public getClosedDate(): Date {
        return this._pullRequest.closedDate;
    }

    public getSourceRefName(): string {
        return this._pullRequest.sourceRefName;
    }

    public getTargetRefName(): string {
        return this._pullRequest.targetRefName;
    }

    public getCurrentReviewers(): VCContracts.IdentityRefWithVote[] {
        return this._pullRequest.reviewers;
    }

    public getLastMergeSourceCommit(): VCContracts.GitCommitRef {
        return this._pullRequest.lastMergeSourceCommit;
    }

    public getPullRequestCompletionOptions(): VCContracts.GitPullRequestCompletionOptions {
        return this._pullRequest.completionOptions;
    }

    public getSupportsIterations(): boolean {
        return this._pullRequest.supportsIterations;
    }

    public setPullRequestCompletionOptions(completionOptions: VCContracts.GitPullRequestCompletionOptions) {
        this._pullRequest.completionOptions = completionOptions;
    }

    /**
     * Handle the default onclick behavior for this pull request. The default action is to navigate to
     * the page for the pull request.
     */
    public onClick(data, event) {

        // If the middle mouse button (button ==1) or ctrl key is pressed, then open in new window.
        if (event.button === 1 || event.ctrlKey) {
            window.open(this.pullRequestHref());
        } else {
            window.location.href = this.pullRequestHref();
        }
    }

    public update(pullRequest: VCContracts.GitPullRequest) {
        if (pullRequest) {
            this._pullRequest.title = pullRequest.title;
            this.title(pullRequest.title);

            this._pullRequest.description = pullRequest.description;
            this.description(pullRequest.description);

            this._pullRequest.status = pullRequest.status;
            this.status(<any>pullRequest.status);

            this._pullRequest.mergeStatus = pullRequest.mergeStatus;
            this.mergeStatus(<any>pullRequest.mergeStatus);

            this._pullRequest.lastMergeSourceCommit = pullRequest.lastMergeSourceCommit;
            this.lastMergeSourceCommitId(pullRequest.lastMergeSourceCommit ? pullRequest.lastMergeSourceCommit.commitId : null);

            this._pullRequest.lastMergeTargetCommit = pullRequest.lastMergeTargetCommit;
            this.lastMergeTargetCommitId(pullRequest.lastMergeTargetCommit ? pullRequest.lastMergeTargetCommit.commitId : null);

            this._pullRequest.lastMergeCommit = pullRequest.lastMergeCommit;
            this.lastMergeCommitId(pullRequest.lastMergeCommit ? pullRequest.lastMergeCommit.commitId : null);
        }
    }

    public updateReviewers(reviewers: VCContracts.IdentityRefWithVote[]) {
        this._pullRequest.reviewers = reviewers;
    }

    /**
      * Check source branch status for this PR and tell us if it has a head commit id and whether that is still up to date.
      */
    public static checkBranchStatus(
        repositoryContext: GitRepositoryContext,
        branchRefName: string,
        lastBranchMergeCommitId: string):
        Q.Promise<IBranchStatus> {

        const deferred = Q.defer<IBranchStatus>();

        repositoryContext.getGitClient().beginGetGitRef(
            repositoryContext.getRepository(),
            branchRefName,
            (gitRefs: VCContracts.GitRef[]) => {
                // create success result first
                const result: IBranchStatus = {
                    headOutOfDate: false,
                    headCommitId: null
                };

                if (gitRefs && gitRefs.length > 0) {

                    // The refs endpoint matches ref name that start with the ref requested
                    // In 99% of the cases the array will have only one ref, it will have more 
                    // than one incase there is a ref called "refs/heads/bug" && "refs/heads/bugfixes"
                    let ref: VCContracts.GitRef = null;
                    $.each(gitRefs, (index, gitRef: VCContracts.GitRef) => {
                        if (Utils_String.localeComparer(gitRef.name, branchRefName) === 0) {
                            ref = gitRef;
                            return false;
                        }
                    });

                    if (ref) {
                        const commitId = ref.objectId;
                        const currentCommitId = lastBranchMergeCommitId;

                        result.headOutOfDate = Utils_String.localeIgnoreCaseComparer(commitId, currentCommitId) !== 0;
                        result.headCommitId = commitId;
                    }
                }
                
                deferred.resolve(result);

            }, (error: any) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }
    
    /**
      * Return an array of promises that return true if this PR source branch has another active pull request on it.
      */
    public sourceHasActivePullRequest(): Q.Promise<boolean> {
        const promises: Q.Promise<boolean>[] = [];
        let numToCheck: number = 1;

        if (this.status() === VCContracts.PullRequestStatus.Active) {
            numToCheck++; // active pull requests need to check for one more than themselves
        }

        // now push PR checks converted to delete results
        promises.push(ViewModel._hasActivePullRequests(this.repositoryContext, this.getSourceRefName(), null, numToCheck));
        promises.push(ViewModel._hasActivePullRequests(this.repositoryContext, null, this.getSourceRefName(), 1));

        return Q.all(promises)
            .then(results => {
                for (let i = 0, len = results.length; i < len; i++) {
                    if (results[i]) {
                        return results[i]; // break out, we found a PR
                    }
                }

                // no PRs found
                return false;
            });
    }

    /**
      * Tell us if there are any active pull reqeuests for the given source/target branches and return the resulting promise.
      */
    private static _hasActivePullRequests(
        repositoryContext: RepositoryContext,
        sourceBranchName: string,
        targetBranchName: string,
        mostAllowedActive: number): Q.Promise<boolean> {

        const deferred = Q.defer<boolean>();

        repositoryContext.getClient().beginGetPullRequests(repositoryContext,
            VCContracts.PullRequestStatus.Active,
            null,
            null,
            sourceBranchName,
            targetBranchName,
            mostAllowedActive,
            null,
            (resultPullRequests: VCContracts.GitPullRequest[]) => {
                // tell us if we have active PRs or not
                deferred.resolve(resultPullRequests && resultPullRequests.length > (mostAllowedActive - 1));
            }, (error: any) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

   
    private _computeDateString(): string {
        let dateToUse: Date = this._pullRequest.creationDate;
        let strToUse: string = VCResources.PullRequest_Created;

        if (this._pullRequest.status === VCContracts.PullRequestStatus.Completed) {
            dateToUse = this._pullRequest.closedDate;
            strToUse = VCResources.PullRequest_Completed;
        }

        return Utils_String.format(strToUse, Utils_Date.friendly(dateToUse));
    }

    private _computeSourceBranchNameFriendlyString(): string {
        return ViewModel.getBranchFriendlyName(this._pullRequest.sourceRefName);
    }

    private _computeTargetBranchNameFriendlyString(): string {
        const result = ViewModel.getBranchFriendlyName(this._pullRequest.targetRefName);

        return result;
    }

    private _computeSubInfoHtml(): string {
        const dateToUse: Date = this._pullRequest.creationDate;
        const isDateRecent: boolean = VCDateUtils.isDateRecent(dateToUse);

        const formatString: string = VCResources.PullRequestSummary_PullRequest_Created;

        const authorNameToUse = Utils_String.format(AUTHOR_HTML_FORMAT, Utils_String.htmlEncode(this.getCreatedBy().displayName));

        let repositoryNameToUse = "";
        if (this.showRepositoryDetails) {
            const cleanRepositoryName = Utils_String.htmlEncode(this.repositoryNameFriendlyString);
            repositoryNameToUse = Utils_String.format(REPOSITORY_HTML_FORMAT, VCResources.In, this.repositoryUrl, this.repositoryToolTip, cleanRepositoryName);
        }

        const cleanBranchName = Utils_String.htmlEncode(this.targetBranchNameFriendlyString());
        const branchNameToUse = Utils_String.format(BRANCH_HTML_FORMAT, this.targetBranchExplorerUrl(), cleanBranchName, cleanBranchName, repositoryNameToUse);

        return Utils_String.format(formatString, authorNameToUse, this.pullRequestId(), branchNameToUse, VCDateUtils.getDateString(dateToUse, isDateRecent));
    }

    private _computePullRequestHref(): string {
        return VersionControlUrls.getPullRequestUrl(<GitRepositoryContext>this.repositoryContext, this._pullRequest.pullRequestId, null, null, this._getRouteData());
    }

    private _getRouteData(): any {
        if (!this._pullRequest || !this._pullRequest.repository || !this._pullRequest.repository.project) {
            return null;
        }

        return {
            project: this._pullRequest.repository.project.name
        };

    }
}
