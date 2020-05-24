import * as Diag from "VSS/Diag";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import {IVersionControlClientService} from "VersionControl/Scripts/IVersionControlClientService";

export enum RepositoryType {
    Tfvc = 0,
    Git = 1,
    GitHub = 2,
    Bitbucket = 3,
}

export class RepositoryContext {

    private _repositoryType: RepositoryType;
    private _tfsContext: TfsContext;
    private _rootPath: string;
    private _client: IVersionControlClientService;

    constructor(tfsContext: TfsContext, repositoryType: RepositoryType, rootPath: string) {
        this._tfsContext = tfsContext;
        this._repositoryType = repositoryType;
        this._rootPath = rootPath;
    }

    public getRepositoryType() {
        return this._repositoryType;
    }

    public getRepository() {
        return undefined;
    }

    public getTfsContext() {
        return this._tfsContext;
    }

    public getRootPath(): string {
        return this._rootPath;
    }

    public getRepositoryId(): string {
        // This should not really be here, but it is a good convenience method to use until we switch to TS 0.9 with generics
        return undefined;
    }

    public getClient() {
        if (!this._client) {
            this._client = this._createClient();
        }
        return this._client;
    }

    public _createClient(): IVersionControlClientService {
        Diag.Debug.fail("getClient is abstract. Must be implemented in subclasses.");
        return null;
    }

    public comparePaths(a: string, b: string): number {
        Diag.Debug.fail("comparePaths is abstract. Must be implemented in subclasses.");
        return 0;
    }

    public pathStartsWith(path: string, parentPath: string): boolean {
        return (path || "").indexOf(parentPath) === 0;
    }

    public getRepositoryClass(): string {
        return undefined;
    }

    public getProjectId(): string {
        return undefined;
    }
}
