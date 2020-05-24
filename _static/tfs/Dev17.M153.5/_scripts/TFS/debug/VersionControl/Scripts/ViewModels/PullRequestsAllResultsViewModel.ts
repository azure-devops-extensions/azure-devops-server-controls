import Q = require("q");
import Utils_String = require("VSS/Utils/String");
import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCPullRequestQueryCriteria = require("VersionControl/Scripts/PullRequestQueryCriteria");
import VCPullRequestResultSetViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsResultSetViewModel");
import VCPullRequestsViewViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsViewViewModel");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import VCPullRequestsResultsViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsResultsViewModel");

/**
 * ViewModel backing the "Pull Requests" tab for the pull requests query page.
 */
export class AllResultsViewModel extends VCPullRequestsResultsViewModel.ResultsViewModel {

    public updateQueryCriteriaAsync(criteria: VCPullRequestQueryCriteria, forceRefresh: boolean = false): Q.Promise<any> {
        const pullRequestResultSet = this.pullRequestResultSets()[0];

        const criteriaChanged: boolean = pullRequestResultSet.updateQueryCriteria(criteria);

        if (criteriaChanged || forceRefresh) {
            return this.refreshAsync();
        }
        else {
            return Q.resolve(null);
        }
    }

    public setAuthorQueryCriteria(id: string): Q.Promise<any> {
        const criteria: VCPullRequestQueryCriteria = this.queryCriteria();

        criteria.authorId = null;

        return this.updateQueryCriteriaAsync(criteria);
    }

    public setReviewerQueryCriteria(id: string): Q.Promise<any> {
        const criteria: VCPullRequestQueryCriteria = this.queryCriteria();

        criteria.reviewerId = null;

        return this.updateQueryCriteriaAsync(criteria);
    }

    public queryCriteria(): VCPullRequestQueryCriteria {
        return (this.pullRequestResultSets()[0]).pullrequestQueryCriteria();
    }

    /**
     * Overide of base class method to set up the sections used in the overview page. This will
     * be a single section of results based on the filter criteria.
     * @param repositoryContext
     * @param parent
     */
    protected _populateResultSets(repositoryContext: RepositoryContext, parent: VCPullRequestsViewViewModel.ViewViewModel) {
        const getNextPageAsyncCallback = (sectionViewModel: VCPullRequestResultSetViewModel.ResultSetViewModel) => {
            return this.getNextPageAsync(sectionViewModel);
        };

        this.pullRequestResultSets.push(new VCPullRequestResultSetViewModel.ResultSetViewModel(repositoryContext, parent, {
            getNextPageCallback: getNextPageAsyncCallback
        }));
    }

    protected _computePageTitle() {
        const pullRequestSet = this.pullRequestResultSets()[0];

        // based on the current state and # of results
        if (pullRequestSet.totalNumberOfAvailablePullRequests() > 0) {
            const subduedText: string = this._getTitleSubduedText();

            if (subduedText) {
                if (pullRequestSet.hasMore()) {
                    return Utils_String.format(VCResources.PullRequest_ResultsPageTitle_Format_MoreThanResultCount, pullRequestSet.totalNumberOfAvailablePullRequests(), this._statusToDisplayStringMap[pullRequestSet.pullRequestStatus()]);
                } else {
                    return Utils_String.format(VCResources.PullRequest_ResultsPageTitle_Format_ResultCount, pullRequestSet.totalNumberOfAvailablePullRequests(), this._statusToDisplayStringMap[pullRequestSet.pullRequestStatus()]);
                }
            }
        }

        return VCResources.PullRequest_HubName;
    }

    private _getTitleSubduedText() {
        return this._statusToDisplayStringMap[this.pullRequestResultSets()[0].pullRequestStatus()]
    }
}