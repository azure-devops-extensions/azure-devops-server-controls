import ko = require("knockout");
import Q = require("q");

import Controls = require("VSS/Controls");
import VSS_Serialization = require("VSS/Serialization");
import VSS_Service = require("VSS/Service");
import VSS_Settings = require("VSS/Settings");
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import Contribution_Services = require("VSS/Contributions/Services");
import { DiscussionThread } from "Presentation/Scripts/TFS/TFS.Discussion.Common";
import DiscussionWebApi = require("Presentation/Scripts/TFS/TFS.Discussion.WebApi");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_String = require("VSS/Utils/String");
import VCContracts = require("TFS/VersionControl/Contracts");
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { PullRequestArtifact } from "VersionControl/Scripts/PullRequestArtifact";
import { CodeReviewArtifact } from "VersionControl/Scripts/TFS.VersionControl";
import VCPullRequestNotificationControlViewModel = require("VersionControl/Scripts/ViewModels/PullRequestNotificationControlViewModel");
import VCPullRequestQueryCriteria = require("VersionControl/Scripts/PullRequestQueryCriteria");
import VCPullRequestResultSetViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsResultSetViewModel");
import VCPullRequestsViewViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsViewViewModel");
import VCPullRequestViewModel = require("VersionControl/Scripts/ViewModels/PullRequestViewModel");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { GitClientService } from "VersionControl/Scripts/GitClientService";
import VisitsClient = require("CodeReview/Visits/RestClient");
import VisitsContracts = require("CodeReview/Visits/Contracts");

import TfsContext = TFS_Host_TfsContext.TfsContext;

const PULLREQUEST_SPINNER_DELAY_IN_MILLISECONDS: number = 500;

/**
 * Common base class for Results view models (Overview, Active, Closed, Abandoned view models).
 */
export class ResultsViewModel extends VCViewModel.VersionControlViewModel {

    public pullRequestResultSets: KnockoutObservableArray<VCPullRequestResultSetViewModel.ResultSetViewModel>;

    public notificationViewModel: VCPullRequestNotificationControlViewModel.NotificationViewModel;

    // Should align with  VCContracts.PullRequestStatus
    protected _statusToDisplayStringMap: { [status: number]: string; } = {};

    private _initialCachedResults: { [key: string]: VCContracts.GitPullRequest[] } = null;
    private _visitsLookup: IDictionaryNumberTo<VisitsContracts.ArtifactVisit> = {};

    private static DATA_ISLAND_CACHE_PREFIX: string = "TFS.VersionControl.PullRequestsListProvider";
    private static DATA_ISLAND_CACHE_ENTRY: string = "ms.vss-code-web.pull-requests-list-data-provider";

    public pageTitle: KnockoutComputed<string>;
    public isResultSetEmpty: KnockoutObservable<boolean>;

    constructor(repositoryContext: RepositoryContext, parent: VCPullRequestsViewViewModel.ViewViewModel, options?) {
        super(repositoryContext, parent, options);

        // Set up the pull request status to title string map.
        this._statusToDisplayStringMap[VCContracts.PullRequestStatus.Active] = VCResources.PullRequest_Title_Active;
        this._statusToDisplayStringMap[VCContracts.PullRequestStatus.Completed] = VCResources.PullRequest_Title_Completed;
        this._statusToDisplayStringMap[VCContracts.PullRequestStatus.Abandoned] = VCResources.PullRequest_Title_Abandoned;

        this.pullRequestResultSets = ko.observableArray([]);
        this._populateResultSets(repositoryContext, parent);

        this.notificationViewModel = new VCPullRequestNotificationControlViewModel.NotificationViewModel();

        this.pageTitle = ko.computed<string>(this._computePageTitle, this);
        this.isResultSetEmpty = ko.observable<boolean>(false);

        // on load check for initial state from data island
        // Retrieve results for each section and collect promises.
        const sections = this.pullRequestResultSets();
        const requests = [];
        
        this._initialCachedResults = {};
        this._visitsLookup = {};

        const pullRequestsListData = VSS_Service.getService(Contribution_Services.WebPageDataService).getPageData<any>(ResultsViewModel.DATA_ISLAND_CACHE_ENTRY);
        if (pullRequestsListData) {
            for (let i = 0; i < sections.length; i++) {
                const key: string = this._computeCacheKey(sections[i].pullrequestQueryCriteria());
                this._initialCachedResults[key] = VSS_Serialization.ContractSerializer.deserialize(pullRequestsListData[key], VCContracts.TypeInfo.GitPullRequest);
            }
        }
    }

    /**
     * Subclasses can override to populate default query criteria.
     * @param repositoryContext
     * @param parent
     */
    protected _populateResultSets(repositoryContext: RepositoryContext, parent: VCPullRequestsViewViewModel.ViewViewModel) { }

    /**
     * Retrieve the pull requests for the given criteria.
     * @param criteria
     */
    private _retrievePullRequestsAsync(criteria: VCPullRequestQueryCriteria): Q.Promise<VCContracts.GitPullRequest[]> {
        const gitClient = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault()).getService<GitClientService>(GitClientService);
     
        return Q.Promise<VCContracts.GitPullRequest[]>((resolve, reject) => {
            gitClient.beginGetPullRequests(this.repositoryContext,
                VCContracts.PullRequestStatus[criteria.status],
                criteria.authorId,
                criteria.reviewerId,
                null, null,
                criteria.top, criteria.skip,
                (resultPullRequests: VCContracts.GitPullRequest[], status: any, creatorId: any, reviewerId: any) => {
                    resolve(resultPullRequests);
                }, (error: any) => {
                    reject(error);
                });
        });
    }

    private _pullRequestViewModels = [];
    private _pullRequestViewModelIds = [];
    private _pullRequestViewModelMap: { [index: number]: VCPullRequestViewModel.ViewModel } = {};

    /**
     * This is an id that tracks the current request "context" for the page. When there is a new page refresh, we increment
     * this value, so if there were other outstanding network requests (that were initiated from before the page refresh), we
     * can ignore those results.
     */
    private _currentRequestId: number = 0;

    /**
     * Refresh the data in the tab
     */
    public refreshAsync(): Q.Promise<any> {
        this._reset();

        // Retrieve results for each section and collect promises.
        const sections = this.pullRequestResultSets();
        const requests = [];

        for (let i = 0; i < sections.length; i++) {
            const requestData = {
                resultSet: sections[i],
                criteria: sections[i].pullrequestQueryCriteria(),
            }

            requests.push(requestData);
        }

        // Here, we are adding CSS margin top property to the div with the CSS class "vc-pullrequests-spinner-container".
        // This is needed for the spinner and message elements combined.
        // Even if we add this property to "StatusIndicator" that we are creating,
        // it will be applicable only to the spinner and not to the text alongside the spinner.
        const spinnerContainer: JQuery = $(".vc-pullrequests-spinner-container").addClass("vc-pullrequest-spinner-with-message");

        const statusControl = Controls.Control.create(StatusIndicator.StatusIndicator, spinnerContainer, {
            center: false,
            imageClass: "status-progress vc-pullrequest-listview-spinner",
            message: VCResources.FetchingResultsText
        });

        statusControl.delayStart(PULLREQUEST_SPINNER_DELAY_IN_MILLISECONDS);

        return this.getResults(requests).then(() => {
            statusControl.complete();
            spinnerContainer.removeClass("vc-pullrequest-spinner-margin-top");
            spinnerContainer.find(".status-indicator").remove();
        });
    }

    /**
     * Get the next page of results for a section
     */
    public getNextPageAsync(section: VCPullRequestResultSetViewModel.ResultSetViewModel): Q.Promise<any> {
        const requests = [];

        requests.push({
            resultSet: section,
            criteria: section.nextPageQueryParameters()
        });

        return this.getResults(requests);
    }

    /**
     * Get and process the results from a series of "requests contexts".
     * This will:
     *    1) Wait for the pull requests results from each request to come back
     *    2) discard duplicates from pull requests returned from multiple queries
     *    3) distribute results to appropriate sections
     *    4) retrieve comment thread counts for pull requests (that do not have this data already)
     *    5) Update the notification indicating that there are no results, if necessary
     *
     * @param requestData
     */
    protected getResults(requestData: any[]): Q.Promise<any> {
        const requestId: number = this._currentRequestId;
        const promises: Q.Promise<any>[] = [];

        // Retrieve results for each section and collect promises.
        for (let i = 0; i < requestData.length; i++) {
            const request = requestData[i];
            let cachedResults: VCContracts.GitPullRequest[] = null; 

            if (this._initialCachedResults) {
                cachedResults = this._initialCachedResults[this._computeCacheKey(request.criteria)];
            }

            if (cachedResults) {
                promises.push(Q.resolve(cachedResults));
            }
            else {
                promises.push(this._retrievePullRequestsAsync(request.criteria));
            }
        }

        // clear the initial cached results after 1st refresh
        this._initialCachedResults = null;

        const promise = Q.all(promises).then(results => {

            // If this is not the current request id, then do not continue processing...
            if (requestId !== this._currentRequestId) {
                return Q.resolve(false);
            }

            // List of new pull requests that are from this request
            const newPullRequestIds: number[] = [];

            for (let i = 0; i < results.length; i++) {
                const resultSet = results[i];

                for (let k = 0; k < resultSet.length; k++) {
                    const pr: VCContracts.GitPullRequest = resultSet[k];

                    if (!this._pullRequestViewModelMap[pr.pullRequestId]) {

                        const prViewModel = new VCPullRequestViewModel.ViewModel(this.repositoryContext, this, { pullRequest: pr });
                        this._pullRequestViewModelMap[pr.pullRequestId] = prViewModel;
                        this._pullRequestViewModelIds.push(pr.pullRequestId);
                        newPullRequestIds.push(pr.pullRequestId);
                    }
                }
            }

            // Append results to sections
            for (let i = 0; i < results.length; i++) {
                let filteredPullRequests = [];

                if (requestData[i].resultSet.addFilter) {
                    filteredPullRequests = results[i].filter(requestData[i].resultSet.addFilter);
                }
                else {
                    filteredPullRequests = results[i];
                }

                // Top is pagesize + 1. If we have received 'top' entries,
                // then there is more than a pagesize worth of results.
                const pageSize = requestData[i].criteria.top - 1;
                const hasMore: boolean = results[i].length > pageSize;

                // If the "filtered" results are more than a page worth of results, splice off the
                // extra results.
                if (filteredPullRequests.length > pageSize) {
                    filteredPullRequests.splice(pageSize);
                }

                const filteredModels = filteredPullRequests.map((prResult) => { return this._pullRequestViewModelMap[prResult.pullRequestId]; });

                requestData[i].resultSet.appendPullRequests(filteredModels, hasMore);
            }

            // Construct stats objects for querying
            const artifactIdToViewModel: IDictionaryStringTo<VCPullRequestViewModel.ViewModel> = {};
            const artifactStatsList: VisitsContracts.ArtifactStats[] = [];

            for (let prIndex = 0; prIndex < newPullRequestIds.length; prIndex++) {
                const pr: VCPullRequestViewModel.ViewModel = this._pullRequestViewModelMap[newPullRequestIds[prIndex]];

                if (pr === null) {
                    continue;
                }
                
                const pullRequestArtifactId: string = new PullRequestArtifact({
                    projectGuid: pr.getRepository().project.id,
                    repositoryId: pr.getRepository().id,
                    pullRequestId: pr.pullRequestId(),
                }).getUri();

                const discussionsArtifactId: string = new CodeReviewArtifact({
                    projectGuid: this.options.projectGuid || pr.getRepository().project.id,
                    pullRequestId: pr.pullRequestId(),
                    codeReviewId: pr.codeReviewId(),
                    supportsIterations: pr.getSupportsIterations()
                }).getUri();

                const artifactStats = {
                    artifactId: pullRequestArtifactId
                } as VisitsContracts.ArtifactStats;

                if (pullRequestArtifactId !== discussionsArtifactId) {
                    artifactStats.discussionArtifactId = discussionsArtifactId;
                }

                artifactIdToViewModel[discussionsArtifactId.toLocaleLowerCase()] = pr;
                artifactStatsList.push(artifactStats);
            }

            // query for artifact stats data for the PR list
            this._queryPullRequestsArtifactStats(artifactStatsList, artifactIdToViewModel);

        }).then(() => {
            // If this is not the current request id, then do not continue processing...
            if (requestId !== this._currentRequestId) {
                return Q.resolve(false);
            }
            const isEmpty = (this.pullRequestResultSets().map(
                (val, index, arr) => {
                    return val.totalNumberOfAvailablePullRequests()
                }).reduce(function (prev, curr, index, array) { return prev + curr; }) === 0);
            this.isResultSetEmpty(isEmpty);

        }).catch((reason: any) => {

            // If this is not an error for the current request, then do not display it to the user.
            if (requestId !== this._currentRequestId) {
                return Q.resolve(false);
            }

             this._handleError(reason);
             throw reason;
        });

        return promise;
    }

    /**
     * Query for artifact stats
     * @param artifactStatsList
     * @param artifactIdToViewModel
     */
    private _queryPullRequestsArtifactStats(
        artifactStatsList: VisitsContracts.ArtifactStats[],
        artifactIdToViewModel: IDictionaryStringTo<VCPullRequestViewModel.ViewModel>): void {

        const requestId = this._currentRequestId;

        if (artifactStatsList && artifactStatsList.length > 0) {
            const visitsClient: VisitsClient.VisitsHttpClient =
                TFS_OM_Common.ProjectCollection.getConnection(TfsContext.getDefault()).getHttpClient(VisitsClient.VisitsHttpClient);

            visitsClient.getStats(artifactStatsList, true).then((resultVisits: VisitsContracts.ArtifactStats[]) => {
                if (requestId === this._currentRequestId && resultVisits && resultVisits.length > 0) {
                    this._processArtifactStatsResults(resultVisits, artifactIdToViewModel);
                }
            }, (error: any) => {
                if (requestId === this._currentRequestId) {
                    this._handleError(error);
                }
            });
        }
    }

    /**
     * Process results of artifact stats queries
     * @param artifactStatsList
     * @param artifactIdToViewModel
     */
    private _processArtifactStatsResults(
        artifactStatsList: VisitsContracts.ArtifactStats[],
        artifactIdToViewModel: IDictionaryStringTo<VCPullRequestViewModel.ViewModel>): void {

        for (const stats of artifactStatsList) {
            const artifactId: string = stats.discussionArtifactId || stats.artifactId;
            const pullRequestEntry: VCPullRequestViewModel.ViewModel = artifactIdToViewModel[artifactId.toLocaleLowerCase()];

            if (pullRequestEntry && stats.commentsCount) {
                pullRequestEntry.numberOfComments(stats.commentsCount[VisitsContracts.CommentThreadType.Text]);
                pullRequestEntry.commentsAvailable(true);
                pullRequestEntry.lastUpdatedDate(stats.lastUpdatedDate);
                pullRequestEntry.isNew(!stats.newCommentsCount || stats.newCommentsCount[VisitsContracts.CommentThreadType.All] > 0);
                pullRequestEntry.numberOfUpdatesText(this._getNumberOfCommentsText(stats));
            }
        }
    }

    /**
     * Get the number of updates string for a given pull request
     * @param pullRequestId
     * @param threads
     */
    private _getNumberOfCommentsText(stats: VisitsContracts.ArtifactStats): string {
        const numberOfUpdates: string[] = [];

        const numPushes: number = (stats.newCommentsCount && stats.newCommentsCount[VisitsContracts.CommentThreadType.Iteration]) || 0;
        const numComments: number = (stats.newCommentsCount && stats.newCommentsCount[VisitsContracts.CommentThreadType.Text]) || 0;
        const numVotes: number = (stats.newCommentsCount && stats.newCommentsCount[VisitsContracts.CommentThreadType.Vote]) || 0;

        if (numPushes) {
            const template = (numPushes === 1) ? VCResources.PullRequest_New_Push_Singular : VCResources.PullRequest_New_Push_Plural;
            numberOfUpdates.push(Utils_String.format(template, numPushes));
        }

        if (numComments) {
            const template = (numComments === 1) ? VCResources.PullRequest_New_Comment_Singular : VCResources.PullRequest_New_Comment_Plural;
            numberOfUpdates.push(Utils_String.format(template, numComments));
        }

        if (numVotes) {
            const template = (numVotes === 1) ? VCResources.PullRequest_New_Vote_Singular : VCResources.PullRequest_New_Vote_Plural;
            numberOfUpdates.push(Utils_String.format(template, numVotes));
        }

        return numberOfUpdates.join(", ");
    }

    protected _handleError(error) {
        if (typeof error === "string") {
            this.notificationViewModel.addError(error);
        }
        else {
            this.notificationViewModel.addError(error.message);
        }
    }

    protected _writeError(msg: string) {
        this.notificationViewModel.addError(msg);
    }

    protected _reset() {

        // Increment the current request ID on refresh
        this._currentRequestId++;

        this.pullRequestResultSets().forEach((element, index, arr) => {
            element.clearResults();
        });

        // Clear data on refresh
        this._pullRequestViewModels = [];
        this._pullRequestViewModelIds = [];
        this._pullRequestViewModelMap = {};

        this.notificationViewModel.clear();
        this.isResultSetEmpty(false);
    }

    protected _computePageTitle() {
        return VCResources.PullRequest_HubName;
    }

    private _computeCacheKey(criteria: VCPullRequestQueryCriteria): string {
        // see extension TFS.VersionControl.PullRequestsListProvider for cache key format
        let key: string = ResultsViewModel.DATA_ISLAND_CACHE_PREFIX + "." + criteria.top + "." + criteria.skip;
        key += "." + VCContracts.PullRequestStatus[criteria.status];
        key += "." + criteria.authorId;
        key += "." + criteria.reviewerId;

        return key;
    }
}
