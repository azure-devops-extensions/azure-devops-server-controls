import * as Q from "q";
import {
    ChangeList,
    ChangeQueryResults,
    GitCommit,
    GitObjectReference,
} from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

import {
    ActionsHub,
    IChangeListMoreChangesPayload,
    IGitMergeCommitParentChangeListLoadedPayload,
    IGitMergeCommitParentChangeListSelectedPayload,
    ItemDetails,
} from "VersionControl/Scenarios/ChangeDetails/GitCommit/ActionsHub";
import { findChange } from "VersionControl/Scenarios/ChangeDetails/ChangeDetailsUtils";
import { CommitDetailsDataProviderSource } from "VersionControl/Scenarios/ChangeDetails/Sources/CommitDetailsDataProviderSource";
import { ChangeListSource } from "VersionControl/Scenarios/ChangeDetails/Sources/ChangeListSource";
import { GitCommitSource } from "VersionControl/Scenarios/ChangeDetails/Sources/GitCommitSource";
import { ChangeListActionCreator } from "VersionControl/Scenarios/ChangeDetails/Actions/ChangeListActionCreator";
import { StoresHub } from "VersionControl/Scenarios/ChangeDetails/GitCommit/StoresHub";

/**
 * Action Creator for ChangeList
 */
export class GitChangeListActionCreator extends ChangeListActionCreator {
    constructor(
        protected _actionsHub: ActionsHub,
        protected _storesHub: StoresHub,
        _repositoryContext: RepositoryContext,
        _changeListSource?: ChangeListSource,
        private _gitCommitSource?: GitCommitSource,
        private _commitDetailsDataProviderSource?: CommitDetailsDataProviderSource) {
        super(_actionsHub, _storesHub, _repositoryContext, _changeListSource);
    }

    /**
    * Fetch meta info like comment and author
    */
    public fetchGitCommitParentDetails(): void {
        const gitCommit = this._storesHub.changeListStore.originalChangeList as GitCommit;
        this.gitCommitSource.fetchGitCommitDetails(gitCommit.parents.map((parent: GitObjectReference) => parent.objectId.full)).then(
            (gitCommits: GitCommit[]) => {
                this._actionsHub.gitCommitParentDetailsLoaded.invoke(gitCommits);
            },
            (error: Error) => {
                this._actionsHub.errorRaised.invoke(error);
            });
    }

    /**
     * Loads change list data and invokes relevant actions.
     */
    public loadCommitDetailsPageData = (): IPromise<void> => {
        const deferred = Q.defer<void>();

        this.commitDetailsDataProviderSource.getCommitDetailsPageData(this._repositoryContext).then(
            (commitDetailsPageData) => {

                this._actionsHub.changeListLoaded.invoke({
                    originalChangeList: commitDetailsPageData.commitDetails,
                });

                if (commitDetailsPageData.diffParentDetails) {
                    this._actionsHub.gitMergeCommitParentChangeListLoaded.invoke({
                        gitMergeChangeList: commitDetailsPageData.diffParentDetails.diffParent,
                        gitMergeParentId: commitDetailsPageData.diffParentDetails.parentId,
                    });

                    this._actionsHub.gitMergeCommitParentChangeListSelected.invoke({
                        gitMergeParentId: commitDetailsPageData.diffParentDetails.parentId,
                    });
                }

                if (commitDetailsPageData.selectedItemDetails) {
                    const change = findChange(this._storesHub.changeListStore.currentChangeList, commitDetailsPageData.selectedItemDetails.serverItem);
                    if (change) {
                        const itemDetails = {
                            itemVersion: commitDetailsPageData.commitDetails.version,
                            item: commitDetailsPageData.selectedItemDetails,
                            change: change,
                        } as ItemDetails;

                        this._actionsHub.changeListItemDetailsLoaded.invoke({
                            itemDetails: itemDetails,
                        });
                    }
                }
                deferred.resolve(null);
            },
            (error: Error) => {
                deferred.reject(error);
            })
        return deferred.promise;
    }

    public changeDiffParent = (newParent: string): void => {
        this.stopLoadAllChanges();
    }

    /**
     * Override loadchanges to handle gitMergeCommit case.
     * Uses getCommitFileDiffAsync() from GitCommitSource for getting more diff in case of GIT merge commits.
     * Uses loadMoreChanges() from ChangeListActionCreator to get more changes for other cases.
     * Returns a promise to fetch next 'maxChangesToInclude' 
     */
    protected loadChanges(
        changeList: ChangeList,
        baseVersion: string,
        targetVersion: string,
        maxChangesToInclude: number,
        skipCount: number): IPromise<IChangeListMoreChangesPayload> {

        if (!changeList) {
            return Q<IChangeListMoreChangesPayload>(null);
        }

        if (this._storesHub.changeListStore.isGitMergeCommit) {
            return Q.Promise((resolve, reject) => {
                this.gitCommitSource.getCommitFileDiffAsync(
                    baseVersion,
                    targetVersion,
                    maxChangesToInclude,
                    skipCount)
                    .then(commitWithMoreChanges => {
                        const moreChanges = {
                            changes: commitWithMoreChanges.changes,
                            allChangesIncluded: commitWithMoreChanges.allChangesIncluded,
                            changeCounts: commitWithMoreChanges.changeCounts,
                        } as IChangeListMoreChangesPayload;
                        resolve(moreChanges);
                    }, error => {
                        reject(error);
                    });
            });
        }
        else {
            return super.loadChanges(
                changeList,
                baseVersion,
                targetVersion,
                maxChangesToInclude,
                skipCount
            );
        }
    }

    /**
     * Updates change list in the store if it doesn't already exist when user switches parent for Git Merge Commit.
     */
    public loadGitMergeCommitParentChangeList = (gitMergeParentId: string): IPromise<void> => {
        const deferred = Q.defer<void>();

        if (!!this._storesHub.changeListStore.getParentIdToChangeList(gitMergeParentId)) {
            deferred.resolve(null);
        } else {
            const compareToVersionSpec = this._storesHub.changeListStore.getParentIdToVersionSpec(gitMergeParentId);

            this.gitCommitSource.getCommitFileDiffAsync(
                compareToVersionSpec.toVersionString(),
                this._storesHub.changeListStore.versionSpec.toVersionString(),
                GitChangeListActionCreator.INITIAL_MAX_CHANGES_TO_FETCH,
                0
            ).then((changeList: GitCommit) => {

                const gitMergeCommitParentChangeListLoadedPayload: IGitMergeCommitParentChangeListLoadedPayload = {
                    gitMergeChangeList: changeList,
                    gitMergeParentId: gitMergeParentId,
                };
                this._actionsHub.gitMergeCommitParentChangeListLoaded.invoke(gitMergeCommitParentChangeListLoadedPayload);

                deferred.resolve(null);

            }).then(null, (error: Error) => {
                deferred.reject(error);
            });
        }

        return deferred.promise;
    };

    /**
     * Selects change list when user switches parent for Git Merge Commit. This action expects the changelist
     * be available in the store. If it's not there, call the updateChangeListForGitMergeCommit before calling this method
     */
    public selectGitMergeCommitParentChangeList = (gitMergeParentId: string): void => {
        if (gitMergeParentId !== this._storesHub.changeListStore.currentGitMergeParentId) {
            const changeList = this._storesHub.changeListStore.getParentIdToChangeList(gitMergeParentId);
            if (changeList) {
                const gitMergeCommitParentChangeListSelectedPayload: IGitMergeCommitParentChangeListSelectedPayload = {
                    gitMergeParentId: gitMergeParentId,
                };
                this._actionsHub.gitMergeCommitParentChangeListSelected.invoke(gitMergeCommitParentChangeListSelectedPayload);
            }
        }
    };

    public onSearchInBranchesDialogStateUpdated(dialogLoading: boolean): void {
        this._actionsHub.searchInBranchesDialogLoading.invoke(dialogLoading);
    }

    protected appendLoadMoreChanges(): boolean {
        return this._storesHub.changeListStore.loadAllParentId === this._storesHub.changeListStore.currentGitMergeParentId;
    }

    private get commitDetailsDataProviderSource(): CommitDetailsDataProviderSource {
        if (!this._commitDetailsDataProviderSource) {
            this._commitDetailsDataProviderSource = new CommitDetailsDataProviderSource();
        }

        return this._commitDetailsDataProviderSource;
    }

    private get gitCommitSource(): GitCommitSource {
        if (!this._gitCommitSource) {
            this._gitCommitSource = new GitCommitSource(this._repositoryContext as GitRepositoryContext);
        }

        return this._gitCommitSource;
    }
}
