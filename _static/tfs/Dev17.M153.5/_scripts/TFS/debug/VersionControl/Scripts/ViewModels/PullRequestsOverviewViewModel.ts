import Utils_String = require("VSS/Utils/String");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import VCContracts = require("TFS/VersionControl/Contracts");
import VCPullRequestResultSetViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsResultSetViewModel");
import VCPullRequestsResultsViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsResultsViewModel");
import VCPullRequestsViewViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsViewViewModel");
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");

import TfsContext = TFS_Host_TfsContext.TfsContext;
/**
 * ViewModel backing the "Overview Pull Requests" tab for the pull requests query page.
 */
class MyPullRequestsOverviewViewModel extends VCPullRequestsResultsViewModel.ResultsViewModel {

    /**
     * Overide of base class method to set up the sections used in the overview page. These sections are:
     *   1) Created by me
     *   2) Assigned to me
     *   3) Assigned to my team
     * @param repositoryContext
     * @param parent
     */
    protected _populateResultSets(repositoryContext: RepositoryContext, parent: VCPullRequestsViewViewModel.ViewViewModel) {

        const tfsContext = TfsContext.getDefault();
         
        const getNextPageAsyncCallback = (sectionViewModel: VCPullRequestResultSetViewModel.ResultSetViewModel) => {
            return this.getNextPageAsync(sectionViewModel);
        };

        this.pullRequestResultSets.push(new VCPullRequestResultSetViewModel.ResultSetViewModel(repositoryContext, parent, {
            pullRequestStatus: VCContracts.PullRequestStatus.Active,
            authorId: tfsContext.currentIdentity.id,
            projectGuid: this.options.projectGuid,
            title: VCResources.PullRequests_ResultHeader_CreatedByMe,
            getNextPageCallback: getNextPageAsyncCallback,
        }));

        this.pullRequestResultSets.push(new VCPullRequestResultSetViewModel.ResultSetViewModel(repositoryContext, parent, {
            pullRequestStatus: VCContracts.PullRequestStatus.Active,
            reviewerId: tfsContext.currentIdentity.id,
            projectGuid: this.options.projectGuid,
            title: VCResources.PullRequests_ResultHeader_AssignedToMe,
            getNextPageCallback: getNextPageAsyncCallback,
        }));

        const assignedToTeamAddFilter: VCPullRequestResultSetViewModel.PullRequestAddFilter = (pullRequest: VCContracts.GitPullRequest) => {
            return this._assignedToTeamAddFilter(pullRequest);
        };

        //if team context exists create result sets for team
        if (tfsContext.currentTeam) {
            this.pullRequestResultSets.push(new VCPullRequestResultSetViewModel.ResultSetViewModel(repositoryContext, parent, {
                pullRequestStatus: VCContracts.PullRequestStatus.Active,
                reviewerId: tfsContext.currentTeam.identity.id,
                projectGuid: this.options.projectGuid,
                title: Utils_String.format(VCResources.PullRequests_ResultHeader_AssignedToTeamWithName, repositoryContext.getTfsContext().currentTeam.name),
                getNextPageCallback: getNextPageAsyncCallback,
                pullRequestAddFilter: assignedToTeamAddFilter
            }));
        }
    }

    /**
     * filter for when adding pull requests to the "Assigned to team" section.
     * This should filter out elements that are:
     *   1) Assigned to me or 2) Requested by me.
     * @param pullRequest
     */
    private _assignedToTeamAddFilter(pullRequest: VCContracts.GitPullRequest): boolean {
        const me = TfsContext.getDefault().currentIdentity.id;

        return (pullRequest.createdBy.id !== me &&
               !pullRequest.reviewers.some(reviewer => reviewer.id === me));
    }
}

export = MyPullRequestsOverviewViewModel;