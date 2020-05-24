import { GitServiceRepository } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/GitServiceRepository";

import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { IVersionControlClientService } from "VersionControl/Scripts/IVersionControlClientService";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";

import * as Utils_String from "VSS/Utils/String";

export abstract class GitServiceRepositoryContext extends RepositoryContext {

    private _gitRepository: GitServiceRepository;
    private _serviceHooksclient: IVersionControlClientService;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, repositoryType: RepositoryType, gitRepository: GitServiceRepository) {
        super(tfsContext, repositoryType, "/");
        this._gitRepository = gitRepository;
    }

    public getRepository() {
        return this._gitRepository;
    }

    public abstract _createClient(): IVersionControlClientService;

    public getClient() {
        if (!this._serviceHooksclient) {
            this._serviceHooksclient = this._createClient();
        }

        return this._serviceHooksclient;
    }

    public getServiceHooksClient() {
        // Convenience method for use until TS generics are supported.
        return this.getClient();
    }

    public comparePaths(a: string, b: string): number {
        return Utils_String.localeComparer(a, b);
    }

    public getRepositoryId(): string {
        return this._gitRepository.id;
    }
}
