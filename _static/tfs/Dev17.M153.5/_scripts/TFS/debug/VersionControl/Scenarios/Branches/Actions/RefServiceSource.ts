import {GitRefUpdate, GitRef, GitRefFavorite, RefFavoriteType} from "TFS/VersionControl/Contracts";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";
import * as BranchActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import {FavoriteUpdate} from "VersionControl/Scenarios/Branches/Stores/FavoritesStore";
import {RecreateBranchUpdate} from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import * as Message from "VersionControl/Scenarios/Branches/Actions/Message";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as GitRefService from "VersionControl/Scripts/Services/GitRefService";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {GitBranchVersionSpec, GitCommitVersionSpec} from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

let _gitRefService: GitRefService.IGitRefService = null;

function getGitRefService(repositoryContext: GitRepositoryContext): GitRefService.IGitRefService {
    return _gitRefService ? _gitRefService : GitRefService.getGitRefService(repositoryContext);
}

export function setGitRefService(gitRefService: GitRefService.IGitRefService) {
    _gitRefService = gitRefService;
}

/**
 * Recreates a branch from the objectId
 */
export function recreateBranch(repositoryContext: GitRepositoryContext, refName: string, oldObjectId: string, isCompare: boolean, isDefault: boolean): IPromise<void> {
    const refFriendlyName = GitRefUtility.getRefFriendlyName(refName);
    const createOptions = {
        newRef: new GitBranchVersionSpec(refFriendlyName),
        sourceRef: new GitCommitVersionSpec(oldObjectId)
    } as GitRefService.ICreateRefOptions;

    return getGitRefService(repositoryContext).createRef(createOptions).then<void>(refUpdate => {
        BranchActions.BranchRecreated.invoke({
            refUpdate: {
                name: GitRefUtility.getRefFriendlyName(refUpdate.name), repositoryId: refUpdate.repositoryId, newObjectId: refUpdate.newObjectId
            } as GitRefUpdate,
            isHeaderBranch: isCompare || isDefault
        } as RecreateBranchUpdate);
     }, (error: Error) => {
       Message.Creators.showErrorWithClear(error.message);
    });
}

/**
 * Deletes the branch and sends a notification
 * @param refName
 */
export function deleteBranch(repositoryContext: GitRepositoryContext, refName: string): IPromise<void> {
    const refFriendlyName = GitRefUtility.getRefFriendlyName(refName);
    const deleteOptions = {
        refToDelete: new GitBranchVersionSpec(refFriendlyName)
    } as GitRefService.IDeleteRefOptions;

    return getGitRefService(repositoryContext).deleteRef(deleteOptions).then<void>(refUpdate => {
        BranchActions.BranchDeleted.invoke({
            name: refUpdate.name, repositoryId: refUpdate.repositoryId, newObjectId: refUpdate.newObjectId, oldObjectId: refUpdate.oldObjectId
        } as GitRefUpdate);
    }, (error: Error) => {
        Message.Creators.showErrorWithClear(error.message);
    });
}

/**
* Adds an item to my favorites, we only support refs here not folders
* @param item - Name of the ref
*/
export function addToMyFavorites(
    repositoryContext: GitRepositoryContext,
    item: string,
    isCompare: boolean,
    favoriteType: RefFavoriteType,
    currentBranches: string[]): IPromise<void> {

    const favoriteItem: GitRefFavorite = {
        repositoryId: repositoryContext.getRepositoryId(),
        name: item,
        type: favoriteType
    } as GitRefFavorite;
    return getGitRefService(repositoryContext).createFavorite(
        {
            favorite: favoriteItem
        } as GitRefService.ICreateFavoriteOptions).then<void>(createResult => {
            createResult.name = GitRefUtility.getRefFriendlyName(createResult.name);
            //Add to Favorites Store
            BranchActions.AddFavorites.invoke({
                favorite: createResult,
                currentBranches,
                isCompare
            } as FavoriteUpdate);
        }, (error: Error) => {
            Message.Creators.showErrorWithClear(error.message);
        });
}

/**
 * Removes an item from my favorites
 * @param favorite
 */
export function removeFromMyFavorites(repositoryContext: GitRepositoryContext, favorite: GitRefFavorite, currentBranches: string[]): IPromise<void> {
    const projectId = repositoryContext.getRepository().project.id;
    return getGitRefService(repositoryContext).deleteFavorite({
        projectId: projectId,
        favoriteId: favorite.id
    } as GitRefService.IDeleteFavoriteOptions).then<void>(x => {
        BranchActions.RemoveFavorites.invoke({
            favorite: favorite,
            currentBranches: currentBranches
        } as FavoriteUpdate);
    }, (error: Error) => {
        Message.Creators.showErrorWithClear(error.message);
    });
}

