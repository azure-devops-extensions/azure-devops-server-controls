import * as Q from "q";
import { getClient } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { getPullRequestUrlUsingRepoId } from "VersionControl/Scripts/VersionControlUrls";
import { GitPullRequestSearchCriteria, PullRequestStatus } from "TFS/VersionControl/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as MentionHelpers from "Mention/Scripts/TFS.Mention.Helpers";
import { PullRequestMention } from "VersionControl/Scripts/Mentions/PullRequestMention";
import { ISearchResult } from "Mention/Scripts/TFS.Mention.Autocomplete";
import * as Utils_Array from "VSS/Utils/Array";

function compareMentions(a: ISearchResult<PullRequestMention>, b: ISearchResult<PullRequestMention>) {
    return a && a.original && b && b.original && a.original.id - b.original.id;
}

/**
 * This data provider is responsible for fetching the initial list of pull request mention suggestions
 * as well as searching them by title search term or pulling more pr data from the server if
 * requesting a specific pull request id that we don't currently have cached
 */
export class PullRequestMentionDataProvider {
    private _gitRestClient: GitHttpClient;
    private _myPRs: IPromise<PullRequestMention[]>;
    private _dataCache: IDictionaryStringTo<IPromise<PullRequestMention>>;
    
    private static _instance: PullRequestMentionDataProvider;
    
    constructor() {
        this._gitRestClient = getClient(GitHttpClient, MentionHelpers.getMainTfsContext().contextData);
        this._dataCache = {};
    }

    public static instance() {
        if(!PullRequestMentionDataProvider._instance) {
            PullRequestMentionDataProvider._instance = new PullRequestMentionDataProvider();
        }
        return PullRequestMentionDataProvider._instance;
    }

    /**
     * Upon first initialization (this happens the first time you try to leave a comment)
     * We query for the last 20 pull requests that you authored or were a reviewer on for any pull request status
     * This starts our initial cache of pull requests for searching though if a pull request is searched for by id,
     * then that pull request will get added to the list
     */
    public initializeMyPullRequests(): void {
        let context = MentionHelpers.getMainTfsContext();
        if(!context.contextData.project || !context.contextData.project.id) {
            // if we don't have a project, we can't fetch pull request suggestions for the current project
            this._myPRs = Q.resolve([]);
            return;
        }

        let createdByMyCriteria: GitPullRequestSearchCriteria = {
            repositoryId: null,
            includeLinks: false,
            status: PullRequestStatus.All,
            creatorId: context.currentIdentity.id,
            reviewerId: null,
            sourceRefName: null,
            targetRefName: null,
            sourceRepositoryId: null
        };
        let assignedToMeCriteria: GitPullRequestSearchCriteria = {
            repositoryId: null,
            includeLinks: false,
            status: PullRequestStatus.All,
            creatorId: null,
            reviewerId: context.currentIdentity.id,
            sourceRefName: null,
            targetRefName: null,
            sourceRepositoryId: null
        };

        let createdByMePromise = this._gitRestClient.getPullRequestsByProject(context.contextData.project.id, createdByMyCriteria, 0, 0, 20).then(prs => {
            return prs.map(pr => {return {
                title: pr.title,
                id: pr.pullRequestId,
                url: getPullRequestUrlUsingRepoId(pr.repository.id, pr.repository.project.id, pr.pullRequestId, context, { project: pr.repository.project.id, includeTeam: false })
            }});
        });
        
        let assignedToMePromise = this._gitRestClient.getPullRequestsByProject(context.contextData.project.id, assignedToMeCriteria, 0, 0, 10).then(prs => {
            return prs.map(pr => {return {
                title: pr.title,
                id: pr.pullRequestId,
                url: getPullRequestUrlUsingRepoId(pr.repository.id, pr.repository.project.id, pr.pullRequestId, context, { project: pr.repository.project.id, includeTeam: false })
            }});
        });

        this._myPRs = Q.allSettled([createdByMePromise, assignedToMePromise]).then(promiseStates => {
            let results = [];
            promiseStates.forEach(promiseState => {
                if(promiseState.state == "fulfilled") {
                    results = Utils_Array.union(results, promiseState.value, compareMentions);
                }
            });
            return results;
        }, error => {
            return [];
        });
    }

    /**
     * Return all pull requests for the given pull request ids, hitting the server if necessary
     */
    public getPullRequests(ids: number[]): IDictionaryNumberTo<IPromise<PullRequestMention>> {
        const promises: IDictionaryNumberTo<IPromise<PullRequestMention>> = {};
        ids.forEach((id) => {
            if(this._dataCache[id.toString()]) {
                promises[id] = this._dataCache[id.toString()] as IPromise<PullRequestMention>;
            }
            else {
                if(id > 0) {
                    promises[id] = this._gitRestClient.getPullRequestById(id).then(pr => { 
                        return {
                            title: pr.title,
                            id: pr.pullRequestId,
                            url: getPullRequestUrlUsingRepoId(pr.repository.id, pr.repository.project.id, pr.pullRequestId, MentionHelpers.getMainTfsContext(), { project: pr.repository.project.id, includeTeam: false })
                        } as PullRequestMention;
                    }, error => {
                        return null;
                    });
                }
                else {
                    promises[id] = Q.resolve(null);
                }
                this._dataCache[id.toString()] = promises[id];
            }
        });

        return promises;
    }

    /**
     * search the currently cached list of pull requests for any whose title matches the provided search term
     */
    public searchPullRequests(searchTerm: string): IPromise<ISearchResult<PullRequestMention>[]> {
        let mentionPromises = Object.keys(this._dataCache).map(k => this._dataCache[k]);
        return Q.allSettled(mentionPromises).then(promises => {
            let foundPRs: ISearchResult<PullRequestMention>[] = [];
            promises.forEach(promiseState => {
                if(promiseState.state === "fulfilled" && promiseState.value) {
                    let pr = promiseState.value;
                    if(this._shouldIncludePR(pr, searchTerm)) {
                        foundPRs.push({original: pr, highlighted: pr});
                    }
                }
            });
            return foundPRs;
        }).then(foundPrs => {
            let foundMyPrs = [];
            return this._myPRs.then(myPrs => {
                myPrs.forEach(pr => {
                    if(this._shouldIncludePR(pr, searchTerm)) {
                        foundMyPrs.push({original: pr, highlighted: pr});
                    }
                });

                return Utils_Array.union(foundPrs, foundMyPrs, compareMentions);
            });
        });
    }

    private _shouldIncludePR(prMention: PullRequestMention, searchTerm: string): boolean {
        return searchTerm === "" || 
               Utils_String.caseInsensitiveContains(prMention.title, searchTerm) ||
               Utils_String.caseInsensitiveContains(prMention.id.toString(), searchTerm);
    }
};
