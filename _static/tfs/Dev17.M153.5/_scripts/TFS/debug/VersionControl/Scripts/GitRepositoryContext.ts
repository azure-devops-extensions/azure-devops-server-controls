import Utils_String = require("VSS/Utils/String");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import VCContracts = require("TFS/VersionControl/Contracts");
import {IVersionControlClientService} from "VersionControl/Scripts/IVersionControlClientService";
import {GitClientService} from "VersionControl/Scripts/GitClientService";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";

export class GitRepositoryContext extends RepositoryContext {

    private _gitRepository?: VCContracts.GitRepository;

    constructor(tfsContext: TFS_Host_TfsContext.TfsContext, gitRepository?: VCContracts.GitRepository) {
        super(tfsContext, RepositoryType.Git, "/");
        this._gitRepository = gitRepository;
    }

    public static create(gitRepository?: VCContracts.GitRepository, tfsContext?: TFS_Host_TfsContext.TfsContext) {
        return new GitRepositoryContext(tfsContext || TFS_Host_TfsContext.TfsContext.getDefault(), gitRepository);
    }

    public getRepository() {
        return this._gitRepository;
    }

    public _createClient(): IVersionControlClientService {
        return TFS_OM_Common.ProjectCollection.getConnection(this.getTfsContext()).getService<GitClientService>(GitClientService);
    }

    public getGitClient() {
        // Convenience method for use until TS generics are supported.
        return <GitClientService>this.getClient();
    }

    public comparePaths(a: string, b: string): number {
        return Utils_String.localeComparer(a, b);
    }

    public getRepositoryId(): string {
        // this method gets called with a null _gitRepository when used in conjunction with
        // the "All Repositories" tree entry.  In that case, we need to return a safe guid
        // for the repo id.
        return this._gitRepository ? this._gitRepository.id : "00000000-0000-0000-0000-000000000000";
    }

    public getRepositoryClass(): string {
        return this.getRepository().isFork ? "bowtie-git-fork" : "bowtie-git";
    }

    public getProjectId(): string {
        return this._gitRepository.project.id;
    }
}

