import { GitRef, GitRefFavorite, RefFavoriteType, GitPushSearchCriteria, GitPush, GitRefUpdate} from "TFS/VersionControl/Contracts";
import {IdentityRef} from "VSS/WebApi/Contracts";
import * as VSS_Service from "VSS/Service";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as Git_Client from "TFS/VersionControl/GitRestClient";
import Q = require("q");
import * as BranchActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import * as Message from "VersionControl/Scenarios/Branches/Actions/Message";
import {MyBranchesUpdate} from "VersionControl/Scenarios/Branches/Stores/BranchesTreeStore";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import * as BranchResources from "VersionControl/Scripts/Resources/TFS.Resources.Branches";

let _gitClient: Git_Client.GitHttpClient = null;


export function getGitHttpClient(): Git_Client.GitHttpClient {
    if (!_gitClient) {
        _gitClient = ProjectCollection.getDefaultConnection().getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);
    }
    return _gitClient;
}
    
export function setGitHttpClient(gitClient: Git_Client.GitHttpClient) {
    _gitClient = gitClient;
}

/**
 * Lock the Branch
 * @param branch
 */
export function lockBranch(repositoryContext: GitRepositoryContext, branch: GitRef) {
    return Q.Promise<void>((resolve, reject) => {
        repositoryContext.getGitClient().beginLockGitRef(repositoryContext.getRepository(), branch.name, () => resolve(null), reject);
    }).then(result => {
        const newBranchRef: GitRef = $.extend({}, branch);
        const currentIdentity = repositoryContext.getTfsContext().currentIdentity;
        const isLockedyBy = {
            id: currentIdentity.id,
            uniqueName: currentIdentity.uniqueName,
            displayName: currentIdentity.displayName
        } as IdentityRef;
        newBranchRef.isLockedBy = isLockedyBy;
        BranchActions.LockBranch.invoke(newBranchRef);
    }, (error: Error) => {
        Message.Creators.showErrorWithClear(error.message);
    });
}

/**
 * UnLock the Branch
 * @param branch
 */
export function unlockBranch(repositoryContext: GitRepositoryContext, branch: GitRef) {
    return Q.Promise<void>((resolve, reject) => {
        repositoryContext.getGitClient().beginUnlockGitRef(repositoryContext.getRepository(), branch.name, () => resolve(null), reject);
    }).then(result => {
        const newBranchRef: GitRef = $.extend({}, branch);
        newBranchRef.isLockedBy = undefined;
        BranchActions.UnLockBranch.invoke(newBranchRef);
    }, (error: Error) => {
        Message.Creators.showErrorWithClear(error.message);
    });
}

/**
 * Find deleted branch
 * @param branch
 */
export function searchForDeletedBranch(repositoryContext: GitRepositoryContext, branchName: string, cancelDeletedBranchesSearch: () => void): IPromise<void> {
    const refName = GitRefUtility.getFullRefNameFromBranch(branchName);

    let searchCriteria: GitPushSearchCriteria = {
        refName,
        includeRefUpdates: true
    } as GitPushSearchCriteria;

    // Loading Branches
    Message.Creators.showInfoNoAction(
        BranchResources.BranchesLoading,
        "status-progress",
        Message.LOADING_BRANCHES_MESSAGE_NUM
    );

    return getGitHttpClient()
        .getPushes(repositoryContext.getRepositoryId(), repositoryContext.getProjectId(), 0, 1, searchCriteria)
        .then<void>((pushes: GitPush[]) => {
            // Remove loading message
            Message.Creators.dismissMessage(Message.LOADING_BRANCHES_MESSAGE_NUM);

            const EMPTY_OBJECT_ID = "0000000000000000000000000000000000000000";

            let refUpdate: GitRefUpdate;

            // Verify branch existed and was deleted
            if (pushes.length === 1 && pushes[0].refUpdates) {
                refUpdate = pushes[0].refUpdates.find(r => r.name == refName);
            }

            if (refUpdate && refUpdate.newObjectId === EMPTY_OBJECT_ID) {
                Message.Creators.showInfo({
                    key: Message.FILTER_MESSAGE_NUM,
                    text: BranchResources.FilterFoundExactMatch,
                    actionLabel: BranchResources.BackToSearchAllBranches,
                    actionCallback: cancelDeletedBranchesSearch,
                    actionAutoFocus: true,
                });

                // Add to push dictionary
                BranchActions.InitializePush.invoke(pushes[0]);

                // Set up deleted branches results
                BranchActions.DeletedBranchSearch.invoke({
                    name: branchName,
                    repositoryId: repositoryContext.getRepository().id,
                    newObjectId: refUpdate.newObjectId,
                    oldObjectId: refUpdate.oldObjectId,
                    isLocked: false
                } as GitRefUpdate);
            }
            else {
                Message.Creators.showInfo({
                    key: Message.FILTER_MESSAGE_NUM,
                    text: BranchResources.FilterNoExactMatch,
                    actionLabel: BranchResources.BackToSearchAllBranches,
                    actionCallback: cancelDeletedBranchesSearch,
                    actionAutoFocus: true,
                });

                // Reset Results to Empty
                BranchActions.DeletedBranchSearch.invoke(null);
            }
        }, (error: Error) => {
            Message.Creators.showErrorWithClear(error.message);
        });
}
