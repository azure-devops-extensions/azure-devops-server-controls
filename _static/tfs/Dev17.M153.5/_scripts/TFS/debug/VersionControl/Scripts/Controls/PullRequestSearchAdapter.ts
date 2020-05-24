import HostUI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import VCContracts = require("TFS/VersionControl/Contracts");
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";
import VCResources = require("VersionControl/Scripts/Resources/TFS.Resources.VersionControl");
import * as VSS from "VSS/VSS";

import Git_Client = require("TFS/VersionControl/GitRestClient");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import TfsContext = TFS_Host_TfsContext.TfsContext;

export class SearchAdapter extends HostUI.SearchAdapter {
    private _repositoryContext: GitRepositoryContext;
    private _gitRestClient: Git_Client.GitHttpClient3;

    private static invalidPr: number = -1;
    private static MAX_PR_ID: number = 2147483647; //The server expects a 32 bit integer for pull request ids so we can't have values over 2^31 - 1 

    public constructor(options?) {
        super(options);
        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection().getHttpClient<Git_Client.GitHttpClient3>(Git_Client.GitHttpClient3);
    }

    public getWatermarkText(): string {
        return VCResources.PullRequestSearchWaterMark;
    }

    public getTooltip(): string {
        return VCResources.PullRequestSearchToolTip;
    }

    public setRepository(repositoryContext: GitRepositoryContext) {
        this._repositoryContext = repositoryContext;
    }

    public performSearch(searchText: string) {
        let pullRequestId: number;

        pullRequestId = this.searchTextToID(searchText);
        if (pullRequestId <= 0){
            return;
        }

        this._gitRestClient.getPullRequestById(pullRequestId).then(
            (pullRequest: VCContracts.GitPullRequest) => {
                const tfsContext = TfsContext.getDefault();
                const team = tfsContext.contextData.project.id === pullRequest.repository.project.id ? tfsContext.currentTeam.name : null;

                this.redirect(VersionControlUrls.getPullRequestUrl(GitRepositoryContext.create(pullRequest.repository, tfsContext), pullRequestId,
                    false, null, { project: pullRequest.repository.project.name, team: team}));
            }, (error: any) => {
                // Handle the PR not found error
                if (error && error.status == 404) {
                    this.notifySearchFailed(VCResources.PullRequest_NotFound, pullRequestId.toString());
                }
                else {
                    alert(error.message);
                }
            });
    }

    private searchTextToID(searchText: string): number{
        let matchInteger: string[],
            pullRequestId: number;

        if (searchText) {
            matchInteger = searchText.match(/^\d+$/);
            pullRequestId = matchInteger ? parseInt(matchInteger[0], 10) : SearchAdapter.invalidPr;
            if (pullRequestId <= 0 || pullRequestId > SearchAdapter.MAX_PR_ID){
                this.notifySearchFailed(VCResources.PullRequest_invalidID, searchText);
                pullRequestId = SearchAdapter.invalidPr;
            }
            return pullRequestId;
        }
        return SearchAdapter.invalidPr;
    }
    
    private notifySearchFailed(message: string, searchText: string){
        //search has failed for whatever reason and user should be notified
        //this method is here to facilitate testing
        this.setErrorMessage(message, searchText);
    }
    
    private redirect(url: string){
        //a pull request was found so browser will be redirected
        //this method is here to facilitate testing
        window.location.href = url;
    }
}
