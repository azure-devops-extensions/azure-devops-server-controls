import { Identity } from "VSS/Identities/Contracts";
import { IdentityRef } from "VSS/WebApi/Contracts";
import { GitPullRequest } from "TFS/VersionControl/Contracts";
import { PullRequestCardInfo } from "VersionControl/Scenarios/Shared/PullRequest/PullRequestCardDataModel";
import { ActionsHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { IdentitiesSource } from "VersionControl/Scenarios/ChangeDetails/Sources/IdentitiesSource";
import { PullRequestSource } from "VersionControl/Scenarios/ChangeDetails/Sources/PullRequestSource";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as VersionControlUrls from "VersionControl/Scripts/VersionControlUrls";

/**
 * Action Creator for pull request artifacts 
 */
export class PullRequestActionCreator {

    constructor(
        private _actionsHub: ActionsHub,
        private _repositoryContext: RepositoryContext,
        private _pullRequestSource?: PullRequestSource,
        private _identitiesSource?: IdentitiesSource) {
    }

    /**
     * Loads data with respect to Pull Request for the commit, and creates an action with payload.
     */
    public loadPullRequestsData = (commitId: string, currentBranchRefName: string): void => {
        const defaultBranch: string = this._repositoryContext.getRepository().defaultBranch;
        let defaultBranchPrIndex: number = -1;
        this.pullRequestSource.getPullRequests(commitId).then(
            (pullRequests: GitPullRequest[]) => {
                let prForCurrentBranch: GitPullRequest;
                let prForDefaultBranch: GitPullRequest;
                if (pullRequests && pullRequests.length > 0) {
                    pullRequests.forEach((item: GitPullRequest, index: number) => {
                        if (item.targetRefName === currentBranchRefName) {
                            prForCurrentBranch = item;
                        }
                        if (item.targetRefName === defaultBranch) {
                            prForDefaultBranch = item;
                            defaultBranchPrIndex = index;
                        }
                    });

                    if (prForCurrentBranch) {
                        this._actionsHub.pullRequestForBranchLoaded.invoke({
                            id: prForCurrentBranch.pullRequestId.toString(),
                            title: prForCurrentBranch.title,
                            url: VersionControlUrls.getPullRequestUrl(this._repositoryContext as GitRepositoryContext, prForCurrentBranch.pullRequestId),
                        });
                    }

                    if (!prForDefaultBranch && pullRequests.length >= 100) {
                        this._fetchDefaultBranchPr(commitId, pullRequests, defaultBranchPrIndex);
                    }
                    else {
                        this._setPullRequestsData(pullRequests);
                        this._setDefaultBranchPrIndex(defaultBranchPrIndex);
                    }
                }
                else {
                    this._actionsHub.pullRequestsDataLoaded.invoke([] as PullRequestCardInfo[]);
                }
            },
            (error: Error) => {
                this._actionsHub.errorRaised.invoke(error);
                this._actionsHub.pullRequestsDataLoaded.invoke([] as PullRequestCardInfo[]);
            });
    }

    public fetchIdentities = (pullRequests: PullRequestCardInfo[]): void => {

        if (pullRequests && pullRequests.length > 0) {
            let identityIds = this.getUniqueIds(pullRequests);

            this.identitiesSource.getIdentities(identityIds).then(
                (identities: Identity[]) => {

                    const identityRefs: IdentityRef[] = identities.map((identity) => {

                        let uniqueName = identity.id;
                        if (identity.properties.Mail && identity.properties.Mail.$value) {
                            uniqueName = identity.properties.Mail.$value;
                        }
                        return {
                            displayName: identity.providerDisplayName,
                            id: identity.id,
                            uniqueName: uniqueName
                        } as IdentityRef;
                    });

                    this._actionsHub.identitiesForPRDataFetched.invoke(identityRefs);
                },
                (error: Error) => {
                    this._actionsHub.identitiesForPRDataFailed.invoke(void 0);
                });
        }
    }

    public getUniqueIds(pullRequests: PullRequestCardInfo[]): string[] {
        let identityIds = pullRequests.map((pr) => { return pr.gitPullRequest.createdBy.id; });
        return identityIds.filter((id, index) => identityIds.indexOf(id) === index);
    }

    private _fetchDefaultBranchPr(commitId: string, pullRequests: GitPullRequest[], defaultBranchPrIndex: number): void {
        this.pullRequestSource.fetchDefaultBranchPullRequest(commitId).then(
            (pullRequest: GitPullRequest) => {
                if (pullRequest) {
                    pullRequests.push(pullRequest);
                    defaultBranchPrIndex = pullRequests.length - 1;
                }
                this._setPullRequestsData(pullRequests);
                this._setDefaultBranchPrIndex(defaultBranchPrIndex);
            },
            (error: Error) => {
                this._actionsHub.errorRaised.invoke(error);
                this._setPullRequestsData(pullRequests);
            }
        );
    }

    private _setPullRequestsData(pullRequests: GitPullRequest[]): void {
        const pullRequestsData: PullRequestCardInfo[] = pullRequests.map(this._getPRDataFromPullRequest);
        this._actionsHub.pullRequestsDataLoaded.invoke(pullRequestsData);
    }

    private _setDefaultBranchPrIndex(defaultBranchPrIndex: number): void {
        if (defaultBranchPrIndex !== -1) {
            this._actionsHub.defaultBranchPrFound.invoke(defaultBranchPrIndex);
        }
    }

    private _getPRDataFromPullRequest = (pullRequest: GitPullRequest): PullRequestCardInfo => {
        pullRequest.creationDate = new Date(pullRequest.creationDate);
        return new PullRequestCardInfo(pullRequest, this._repositoryContext);
    };

    private get pullRequestSource(): PullRequestSource {
        if (!this._pullRequestSource) {
            this._pullRequestSource = new PullRequestSource(this._repositoryContext);
        }

        return this._pullRequestSource;
    }

    private get identitiesSource(): IdentitiesSource {
        if (!this._identitiesSource) {
            this._identitiesSource = new IdentitiesSource(this._repositoryContext);
        }

        return this._identitiesSource;
    }

}
