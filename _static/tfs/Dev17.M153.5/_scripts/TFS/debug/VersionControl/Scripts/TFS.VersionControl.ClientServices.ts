import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import VCContracts = require("TFS/VersionControl/Contracts");
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {GitClientService} from "VersionControl/Scripts/GitClientService";
import {GitRepositoryContext} from "VersionControl/Scripts/GitRepositoryContext";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import VSS = require("VSS/VSS");
let cachedGitContexts: { [repositoryId: string]: GitRepositoryContext; } = {};

export function getContext(tfsContext: TFS_Host_TfsContext.TfsContext, gitRepository: VCContracts.GitRepository = null) {
    let repositoryContext: RepositoryContext;
    if (gitRepository) {
        repositoryContext = cachedGitContexts[gitRepository.id];
        if (!repositoryContext) {
            repositoryContext = GitRepositoryContext.create(gitRepository, tfsContext);
        }
    }
    else {
        repositoryContext = TfvcRepositoryContext.create(tfsContext);
    }
    return repositoryContext;
}

export function beginGetContext(
    tfsContext: TFS_Host_TfsContext.TfsContext,
    projectName: string, repositoryId: string,
    callback: (repositoryContext: RepositoryContext) => void,
    errorCallback?: IErrorCallback) {
    let repositoryContext: RepositoryContext;

    if (repositoryId) {
        repositoryContext = cachedGitContexts[repositoryId];
        if (repositoryContext) {
            callback.call(this, repositoryContext);
        }
        else {
            let gitService = <GitClientService>TFS_OM_Common.ProjectCollection.getConnection(tfsContext).getService(GitClientService);
            gitService.beginGetRepository(repositoryId, (repository: VCContracts.GitRepository) => {
                callback.call(this, GitRepositoryContext.create(repository, tfsContext));
            }, errorCallback);
        }
    }
    else {
        callback.call(this, new TfvcRepositoryContext(tfsContext || TFS_Host_TfsContext.TfsContext.getDefault(), projectName));
    }
}

VSS.tfsModuleLoaded("TFS.VersionControl.HttpClient", exports);
