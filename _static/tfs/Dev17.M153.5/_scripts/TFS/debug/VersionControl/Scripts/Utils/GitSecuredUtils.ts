import { GitConstants } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";

/**
 * calculates a GitSecuredToken using projectid, repo Id, branchname 
 * @param projectGuid
 * @param repoId
 * @param branchName
 */

export function calculateGitSecuredToken(
    projectGuid: string,
    repoId: string,
    branchName: string = null): string {
    const partialProjectToken = projectGuid ? projectGuid + "/" : "";
    const partialRepoToken = (partialProjectToken && repoId) ? repoId + "/" : "";
    const partialBranchToken = (partialRepoToken && branchName) ? branchName.split("/").join("^") + "/" : "";

    return GitConstants.SecurableRoot + partialProjectToken + partialRepoToken + partialBranchToken;
}