import { WebPageDataService } from "VSS/Contributions/Services";
import { GitRef, GitRefFavorite, RefFavoriteType, GitCommitRef } from "TFS/VersionControl/Contracts";
import * as Git_Client from "TFS/VersionControl/GitRestClient";
import * as BranchActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import * as DataProviderSource from "VersionControl/Scenarios/Branches/Actions/DataProviderSource";
import * as GitClientSource from "VersionControl/Scenarios/Branches/Actions/GitClientSource";
import * as Message from "VersionControl/Scenarios/Branches/Actions/Message";
import * as RefServiceSource from "VersionControl/Scenarios/Branches/Actions/RefServiceSource";
import * as UIServiceSource from "VersionControl/Scenarios/Branches/Actions/UIServiceSource";
import * as Branches from "VersionControl/Scenarios/Branches/Stores/BranchesStore";
import { BranchPermissions } from "VersionControl/Scenarios/Branches/Stores/BranchPermissionsStore";
import { AggregateState } from "VersionControl/Scenarios/Branches/Stores/StoresHub";
import * as SmartTree from "Presentation/Scripts/TFS/Stores/TreeStore";
import * as KeyValue from "Presentation/Scripts/TFS/Stores/DictionaryStore";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as GitRefService from "VersionControl/Scripts/Services/GitRefService";
import * as GitUIService from "VersionControl/Scripts/Services/GitUIService";

export module Creators {

    let _gitRepoContext: GitRepositoryContext = null;

    export function initialize(
        repoContext: GitRepositoryContext,
        all?: boolean,
        getAggregateState?: () => AggregateState,
    ): IPromise<{}> {
        _gitRepoContext = repoContext;
        BranchActions.RepositoryContextChange.invoke(repoContext);
        return DataProviderSource.initialize(repoContext, all, getAggregateState);
    }

    export function dispose(): void {
        DataProviderSource.reset();
    }

    export function initializeMyBranches(): void {
        DataProviderSource.initializeMyBranches();
    }

    export function initializeAllBranches(): IPromise<void> {
        return DataProviderSource.initializeAllBranches();
    }

    export function initializeStaleBranches(): IPromise<void> {
        return DataProviderSource.initializeStaleBranches();
    }

    export function getMoreStaleBranches(stalePage: number): IPromise<void> {
        return DataProviderSource.getMoreStaleBranches(stalePage);
    }

    export function getAllFolderNodes(folderName: string, folderPage: number): IPromise<boolean> {
        return DataProviderSource.getAllFolderNodes(folderName, folderPage);
    }

    export function lockBranch(branch: GitRef): IPromise<void> {
        return GitClientSource.lockBranch(_gitRepoContext, branch);
    }

    export function unlockBranch(branch: GitRef): IPromise<void> {
        return GitClientSource.unlockBranch(_gitRepoContext, branch);
    }

    export function addToMyFavorites(item: string, isCompare: boolean, favoriteType: RefFavoriteType, currentBranches: string[]): IPromise<void> {
        return RefServiceSource.addToMyFavorites(_gitRepoContext, item, isCompare, favoriteType, currentBranches).then<void>(result => {
            if (favoriteType == RefFavoriteType.Folder) {
                DataProviderSource.refreshMyBranches(currentBranches);
            }
        });
    }

    export function removeFromMyFavorites(favorite: GitRefFavorite, currentBranches: string[]): IPromise<void> {
        return RefServiceSource.removeFromMyFavorites(_gitRepoContext, favorite, currentBranches).then<void>(result => {
            DataProviderSource.refreshMyBranches(currentBranches);
        });
    }

    export function setCompareBranch( newCompareBranch: GitRef, newCompareIsMine: boolean, oldCompareBranch: GitRef, oldCompareIsMine: boolean, oldCompareIsDefault: boolean, metaData: GitCommitRef[]): IPromise<void> {
        return DataProviderSource.setCompareBranch(_gitRepoContext, newCompareBranch, newCompareIsMine, oldCompareBranch, oldCompareIsMine, oldCompareIsDefault, metaData);
    }

    export function createNewBranch(parentBranch: string, objectId: string): IPromise<void> {
        return UIServiceSource.createNewBranch(_gitRepoContext, parentBranch);
    }

    export function showBranchSecurityPermissions(branchName: string, projectGuid: string, repositoryPermissionSet: string) {
        return UIServiceSource.showBranchSecurityPermissions(_gitRepoContext, branchName, projectGuid, repositoryPermissionSet);
    }

    export function filterBranch(filterText: string,
        allBranches: KeyValue.DictionaryStore<Branches.GitRefWithState>,
        filterTreeStore: SmartTree.TreeStore,
        tabTree: SmartTree.TreeStore,
        filterStoreText: string,
        currentAction: string,
        defaultBranch: GitRef,
        compareBranch: GitRef) {
        return DataProviderSource.filterBranch(filterText,
            allBranches,
            filterTreeStore,
            tabTree,
            filterStoreText,
            currentAction,
            compareBranch);
    }

    export function deleteBranch(refName: string): IPromise<void> {
        return RefServiceSource.deleteBranch(_gitRepoContext, refName);
    }

    export function recreateBranch(refName: string, oldObjectId: string, isCompare: boolean, isDefault: boolean): IPromise<void> {
        return RefServiceSource.recreateBranch(_gitRepoContext, refName, oldObjectId, isCompare, isDefault);
    }

    export function resetFilter() {
        DataProviderSource.resetFilter();
    }

    export function dismissMessage(key: number) {
        Message.Creators.dismissMessage(key);
    }

    /**
      * Override page data service for testing purposes only.
      */
    export function testOverride(webPageDataService: WebPageDataService,
        gitClient?: Git_Client.GitHttpClient,
        gitUIService?: GitUIService.IGitUIService,
        gitRefService?: GitRefService.IGitRefService,
        gitRepoContext?: GitRepositoryContext) {
        DataProviderSource.testOverride(webPageDataService, gitRepoContext);
        RefServiceSource.setGitRefService(gitRefService);
        UIServiceSource.setGitUIService(gitUIService);
        GitClientSource.setGitHttpClient(gitClient);
    }
}
