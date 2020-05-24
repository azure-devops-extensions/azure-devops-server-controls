import * as Q from "q";
import { errorHandler } from "VSS/VSS";

import { GitRef } from "TFS/VersionControl/Contracts";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IProjectRepository } from "Presentation/Scripts/TFS/TFS.Welcome.Documents";
import { EMPTY_OBJECT_ID } from "VersionControl/Scripts/CommitIdHelper";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { getFullRefNameFromBranch } from "VersionControl/Scripts/GitRefUtility";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { GitProjectRepository, TfvcProjectRepository, GitDocumentProvider, TfvcDocumentProvider } from "Welcome/Scripts/TFS.Welcome.WelcomeProviders";
import { IFileViewerModel, FileViewerModelBuilder, GitFileViewerModelBuilder, TfvcFileViewerModelBuilder } from "Welcome/Scripts/TFS.Welcome.FileViewerModelBuilder";

export function getDefaultContentItem(repositoryContext: RepositoryContext): IFileViewerModel {
    const tfsContext = repositoryContext.getTfsContext();
    let projectRepository: IProjectRepository;
    if (repositoryContext.getRepositoryType() === RepositoryType.Git) {
        let repository = (repositoryContext as GitRepositoryContext).getRepository();
        projectRepository = new GitProjectRepository(
            repository.name,
            repository.id,
            repository.defaultBranch,
            tfsContext.navigation.project);
    } else {
        projectRepository = new TfvcProjectRepository(tfsContext.navigation.project);
    }

    const file = projectRepository.createDefaultDocument();
    const model = {
        file: file,
        newFile: true,
        repositoryExists: true,
        repositoryContext: repositoryContext,
    };

    const modelBuilder = getFileViewerModelBuilder(tfsContext, repositoryContext.getRepositoryType());
    return modelBuilder.createDefaultContentModel(model, repositoryContext, file);
}

function getFileViewerModelBuilder(tfsContext: TfsContext, repositoryType: RepositoryType): FileViewerModelBuilder {
    if (repositoryType === RepositoryType.Git) {
        const provider = new GitDocumentProvider(true);
        return new GitFileViewerModelBuilder(tfsContext, provider);
    } else {
        const provider = new TfvcDocumentProvider();
        return new TfvcFileViewerModelBuilder(tfsContext, provider);
    }
}

export function getLatestGitRef(gitContext: GitRepositoryContext, branchName: string): IPromise<GitRef> {
    const deferred = Q.defer<GitRef>();

    const fullRefName = getFullRefNameFromBranch(branchName);
    gitContext.getGitClient().beginGetGitRef(
        gitContext.getRepository(),
        fullRefName,
        (gitRefs: GitRef[]) => {
            const refMatch: GitRef = $.grep(gitRefs, (gitRef: GitRef) => { return gitRef.name === fullRefName; })[0];
            if (refMatch) {
                // ... we just need the latest commitId in this branch.
                deferred.resolve({
                    name: fullRefName,
                    objectId: refMatch.objectId,
                } as GitRef);
            } else {
                // ... into a new branch to be created from scratch.
                deferred.resolve({
                    name: fullRefName,
                    objectId: EMPTY_OBJECT_ID,
                } as GitRef);
            }
        },
        (error: Error) => {
            errorHandler.show(error);
        });

    return deferred.promise;
}
