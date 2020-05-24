import { GitRefUpdate } from "TFS/VersionControl/Contracts";
import * as BranchActions from "VersionControl/Scenarios/Branches/Actions/BranchesActions";
import * as Message from "VersionControl/Scenarios/Branches/Actions/Message";
import * as GitRefUtility from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import * as GitUIService from "VersionControl/Scripts/Services/GitUIService";

let _gitUIService: GitUIService.IGitUIService = null;

function getGitUIService(repositoryContext: GitRepositoryContext): GitUIService.IGitUIService {
    return _gitUIService ? _gitUIService : GitUIService.getGitUIService(repositoryContext);
}

export function setGitUIService(gitUIService: GitUIService.IGitUIService) {
    _gitUIService = gitUIService;
}

/**
 * Creates a new branch based off the parent and sends a notification
 * @param parentBranch
 */
export function createNewBranch(repositoryContext: GitRepositoryContext, parentBranch: string): IPromise<void> {
    return getGitUIService(repositoryContext).createBranch({
        sourceRef: GitRefUtility.refNameToVersionSpec(parentBranch)
    } as GitUIService.ICreateBranchOptions).then(
        createResult =>
            !createResult.cancelled &&
            BranchActions.BranchCreated.invoke({
                name: createResult.selectedFriendlyName,
                newObjectId: createResult.newObjectId,
                repositoryId: createResult.repositoryContext.getRepositoryId(),
            } as GitRefUpdate),
        (error: Error) => {
            Message.Creators.showErrorWithClear(error.message);
    });
}

export function showBranchSecurityPermissions(repositoryContext: GitRepositoryContext, branchName: string, projectGuid: string, repositoryPermissionSet: string) {
    return getGitUIService(repositoryContext).showBranchSecurityPermissions(branchName, projectGuid, repositoryPermissionSet);
}
