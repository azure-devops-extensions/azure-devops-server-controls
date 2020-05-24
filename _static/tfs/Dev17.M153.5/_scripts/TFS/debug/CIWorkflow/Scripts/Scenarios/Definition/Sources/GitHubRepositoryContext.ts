import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { GitServiceRepository } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/GitServiceRepository";
import { GitServiceRepositoryContext } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/GitServiceRepositoryContext";
import { SourceProviderClientService } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/SourceProviderClientService";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { IVersionControlClientService } from "VersionControl/Scripts/IVersionControlClientService";
import { RepositoryType } from "VersionControl/Scripts/RepositoryContext";

export class GitHubRepositoryContext extends GitServiceRepositoryContext {
    private _isEnterprise: boolean;

    constructor(isEnterprise: boolean, tfsContext: TFS_Host_TfsContext.TfsContext, gitRepository: GitServiceRepository) {
        super(tfsContext, RepositoryType.GitHub, gitRepository);
        this._isEnterprise = isEnterprise;
    }

    public static create(gitRepository: GitServiceRepository, tfsContext?: TFS_Host_TfsContext.TfsContext) {
        return new GitHubRepositoryContext(false, tfsContext || TFS_Host_TfsContext.TfsContext.getDefault(), gitRepository);
    }

    public static createEnterpriseContext(gitRepository: GitServiceRepository, tfsContext?: TFS_Host_TfsContext.TfsContext) {
        return new GitHubRepositoryContext(true, tfsContext || TFS_Host_TfsContext.TfsContext.getDefault(), gitRepository);
    }

    public _createClient(): IVersionControlClientService {
        return new SourceProviderClientService(
            this._isEnterprise ? RepositoryTypes.GitHubEnterprise : RepositoryTypes.GitHub);
    }
}
