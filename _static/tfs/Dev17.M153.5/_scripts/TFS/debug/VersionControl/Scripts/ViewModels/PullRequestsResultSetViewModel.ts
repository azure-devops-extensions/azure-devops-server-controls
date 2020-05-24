import ko = require("knockout");

import Controls = require("VSS/Controls");
import PopupContent = require("VSS/Controls/PopupContent");
import IdentityImage = require("Presentation/Scripts/TFS/TFS.IdentityImage");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import StatusIndicator = require("VSS/Controls/StatusIndicator");

import VCContracts = require("TFS/VersionControl/Contracts");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCViewModel = require("VersionControl/Scripts/TFS.VersionControl.ViewModel");
import VCPullRequestQueryCriteria = require("VersionControl/Scripts/PullRequestQueryCriteria");
import VCPullRequestReviewersControl = require("VersionControl/Scripts/Controls/PullRequestQueryViewReviewersControl");
import VCPullRequestViewModel = require("VersionControl/Scripts/ViewModels/PullRequestViewModel");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

export interface PullRequestAddFilter {
    (pullrequest: VCContracts.GitPullRequest): boolean;
}

const TOOLTIP_CREATED_KEY = "tooltipCreated";
const TOOLTIP_DELAYLOADTIME_IN_MILLISECONDS: number = 250;

/**
 * ViewModel containing a set of pull requests from a particular query
 * (pull request status, filter parameters).
 */
export class ResultSetViewModel extends VCViewModel.VersionControlViewModel {

    /**
     * The list of pull requests in this section
     */
    public pullRequests: KnockoutObservableArray<VCPullRequestViewModel.ViewModel>;

    /**
     * Title of the section
     */
    public title: KnockoutObservable<string> = ko.observable(null);

    /**
     * The display text of the number of pull requests
     */
    public numberOfPullRequestsDisplayText: KnockoutComputed<string>;

    /**
     * Is this section visible
     */
    public isVisible: KnockoutComputed<boolean>;

    public totalNumberOfAvailablePullRequests: KnockoutObservable<number> = ko.observable(null);

    /**
     * bool indicating whether there are more pull requests available on the server
     * that are not included in this result set.
     */
    public hasMore: KnockoutObservable<boolean>;

    /**
     * bool indicating whether the show more link should be shown or not.
     */
    public showMoreLinkVisibility: KnockoutComputed<boolean>;

    /**
     * Get the next page of results from the server.
     */
    public getNextPage: (data: any, event: JQueryEventObject) => void;

    /**
     * Pull request status (active, closed, completed) used to query this pull request result set.
     */
    public pullRequestStatus: KnockoutObservable<VCContracts.PullRequestStatus>;

    public addFilter: PullRequestAddFilter;

    public showMoreText = VCResources.ShowMore;

    /**
     * bool indicating whether the show more query is in progress or not.
     */
    private showMoreQueryInProgress: KnockoutObservable<boolean>;

    private _requestedById: string = null;
    private _reviewerId: string = null;

    private _pageSize: number = 50;
    private _currentPage: number = 0;

    private _nextPageCallback: any = null;
    private _tooltipTimeout: number;

    /**
     * @param options
     *     pullRequestAddFilter: (PullRequestAddFilter) Function to filter the pull requests that are added to the table.
     */
    constructor(repositoryContext: RepositoryContext, parent: VCViewModel.VersionControlViewModel, options?) {
        super(repositoryContext, parent, options);

        // null check the options object.
        if (!this.options) {
            this.options = {};
        }

        this.pullRequestStatus = ko.observable(null);

        this.pullRequests = ko.observableArray(<VCPullRequestViewModel.ViewModel[]>[]);

        this.hasMore = ko.observable(false);
        this.showMoreQueryInProgress = ko.observable(false);

        this.showMoreLinkVisibility = ko.computed(this._getShowMoreLinkVisibility, this);

        this.isVisible = ko.computed(this._computeVisibility, this);

        this.getNextPage = (data: any, event: JQueryEventObject) => {
            this._getNextPage(data, event);
        };

        if (this.options.title) {
            this.title(this.options.title);
        }

        if (this.options.pullRequestStatus != null) {
            this.pullRequestStatus(this.options.pullRequestStatus);
        }

        if (this.options.authorId) {
            this._requestedById = this.options.authorId;
        }

        if (this.options.reviewerId) {
            this._reviewerId = this.options.reviewerId;
        }

        if (this.options.pullRequestAddFilter) {
            this.addFilter = this.options.pullRequestAddFilter;
        }

        if (this.options.getNextPageCallback) {
            this._nextPageCallback = this.options.getNextPageCallback;
        }

        this.numberOfPullRequestsDisplayText = ko.computed(this._computeNumberOfPullRequestsDisplayText, this);
    }

    /**
     * Update the criteria used to populate the pull requests in this result set.
     *
     * @param criteria
     */
    public updateQueryCriteria(criteria: VCPullRequestQueryCriteria) :boolean {
        let criteriaChanged: boolean = false;

        if (criteria.status && criteria.status !== this.pullRequestStatus()) {
            criteriaChanged = true;
            this.pullRequestStatus(criteria.status);
        }

        if (criteria.authorId !== this._requestedById) {
            criteriaChanged = true;
            this._requestedById = criteria.authorId;
        }

        if (criteria.reviewerId !== this._reviewerId) {
            criteriaChanged = true;
            this._reviewerId = criteria.reviewerId;
        }

        return criteriaChanged;
    }

    /**
     * Get the query criteria used to back this result set.
     */
    public pullrequestQueryCriteria(): VCPullRequestQueryCriteria {

        return <VCPullRequestQueryCriteria>{
            authorId: this._requestedById,
            reviewerId: this._reviewerId,
            status: this.pullRequestStatus(),
            top: this._pageSize + 1,
            skip: this._currentPage * this._pageSize
        }
    }

    /**
     * Update state to indicate we are now showing another page of results, and get the
     * query criteria to retrieve the next page of results.
     */
    public nextPageQueryParameters(): VCPullRequestQueryCriteria {
        this._currentPage++;

        return this.pullrequestQueryCriteria();
    }

    /**
     * Clear the results. Does not reset the query parameters.
     */
    public clearResults() {
        this.totalNumberOfAvailablePullRequests(null);
        this.pullRequests.removeAll();
        this.hasMore(false);
        this._currentPage = 0;
    }

    private _getNextPage(data: any, event: JQueryEventObject) {
        if (this._nextPageCallback) {
            const self = this;
            const parentElement: JQuery = $(event.target.parentElement);

            const result = this._nextPageCallback(this);

            // Here, we are adding the "StatusIndicator" (spinner and the corresponding message) to the parent element of "Show more" link element.
            // Once the results are fetched, we will delete the "StatusIndicator" element.
            const statusControl = Controls.Control.create(StatusIndicator.StatusIndicator, parentElement, {
                center: false,
                imageClass: "status-progress vc-pullrequest-listview-spinner",
                message: VCResources.LoadingText
            });

            this.showMoreQueryInProgress(true);
            statusControl.start();

            result.done(() => {
                self.showMoreQueryInProgress(false);
                statusControl.complete();
                parentElement.find(".status-indicator").remove();
            });
        }
    }

    /**
     * Append new results into this result set.
     *
     * @param pullRequests
     */
    public appendPullRequests(pullRequests: VCPullRequestViewModel.ViewModel[], hasMore: boolean) {
        $.each(pullRequests, (index, prViewModel) => {
            this.pullRequests.push(prViewModel);
        });
        this.hasMore(hasMore);
        this.totalNumberOfAvailablePullRequests(this.pullRequests().length);
    }

    private _onPullRequestAfterRender(element, data: VCPullRequestViewModel.ViewModel) {
        const picContainer = $(element).find(".vc-pullrequest-entry-user-image");
        const reviewersContainer = $(element).find(".vc-pullrequest-entry-reviewers");

        IdentityImage.identityImageElement(data.repositoryContext.getTfsContext(), data.getCreatedBy().id, null, 'vc-pr')
            .appendTo(picContainer);
            
        <VCPullRequestReviewersControl.reviewerControl>Controls.BaseControl.createIn(VCPullRequestReviewersControl.reviewerControl,
                reviewersContainer, {
                    data: data,
                });
    }

    private _handleMouseEnter(data: VCPullRequestViewModel.ViewModel, event: JQueryEventObject): void {
        const tooltipText = data.rollupStatusText();
        const targetContainer = $(event.target);
        this._tooltipTimeout = setTimeout(() => {
            if (!targetContainer.data(TOOLTIP_CREATED_KEY)) {
                const $tooltipContent = $(Utils_UI.domElem('div')).text(tooltipText);

                const tooltip = <PopupContent.RichContentTooltip>Controls.Enhancement.enhance(PopupContent.RichContentTooltip, targetContainer, {
                    cssClass: "delegate-rich-content-tooltip vc-pullrequest-tooltip",
                    html: $tooltipContent,
                    openCloseOnHover: true,
                });

                tooltip.show();
                targetContainer.data(TOOLTIP_CREATED_KEY, true);
            }
        }, TOOLTIP_DELAYLOADTIME_IN_MILLISECONDS);
    }

    private _handleMouseLeave(): void {
        clearTimeout(this._tooltipTimeout);
    }

    private _computeNumberOfPullRequestsDisplayText() {

       const numPullRequests : number = this.totalNumberOfAvailablePullRequests();
       let displayText : string = null;
       
       if (numPullRequests === null || numPullRequests === 0) {
           displayText = null;
       } else if (this.hasMore()) {
           displayText = Utils_String.format(VCResources.PullRequest_NumberOfPullRequests_MoreThanCount, numPullRequests);
       } else {
           displayText = Utils_String.format(VCResources.PullRequest_NumberOfPullRequests_Count, numPullRequests);
       }

       return displayText;
    }

    private _getShowMoreLinkVisibility(): boolean {
        return this.hasMore() && (!this.showMoreQueryInProgress());
    }

    private _computeVisibility(): boolean {
        return (this.totalNumberOfAvailablePullRequests() > 0) || this.hasMore();
    }
}