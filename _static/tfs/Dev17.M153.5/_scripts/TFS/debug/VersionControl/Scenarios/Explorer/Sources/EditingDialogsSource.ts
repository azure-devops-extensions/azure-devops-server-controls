import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { getGitUIService, ICreateBranchResult } from "VersionControl/Scripts/Services/GitUIService";
import { IGitRefVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

/**
 * Wrap usages to legacy prompt dialogs.
 */
export class EditingDialogsSource {
    constructor(private repositoryContext: RepositoryContext) {
    }

    public showCreateBranch(sourceRef: IGitRefVersionSpec, suggestedFriendlyName?: string): IPromise<ICreateBranchResult> {
        const gitUIService = getGitUIService(this.repositoryContext as GitRepositoryContext);
        return gitUIService.createBranch({
            sourceRef,
            suggestedFriendlyName,
        });
    }
}
