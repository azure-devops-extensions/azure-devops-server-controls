import Q = require("q");

import Git_Client = require("TFS/VersionControl/GitRestClient");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import VCContracts = require("TFS/VersionControl/Contracts");

export class AsyncRefOperationServerSource {
    private _gitRestClient: Git_Client.GitHttpClient;

    constructor() {
        this._gitRestClient = TFS_OM_Common.ProjectCollection.getDefaultConnection()
            .getHttpClient<Git_Client.GitHttpClient>(Git_Client.GitHttpClient);
    }

    public createCherryPick(projectId: string, repositoryId: string, cherryPick: VCContracts.GitAsyncRefOperationParameters): IPromise<VCContracts.GitCherryPick> {
        return this._gitRestClient.createCherryPick(cherryPick, projectId, repositoryId);
    }

    public createRevert(projectId: string, repositoryId: string, revert: VCContracts.GitAsyncRefOperationParameters): IPromise<VCContracts.GitRevert> {
        return this._gitRestClient.createRevert(revert, projectId, repositoryId);
    }

    public getCherryPickByRefName(projectId: string, repositoryId: string, refName: string): IPromise<VCContracts.GitCherryPick> {
        return this._gitRestClient.getCherryPickForRefName(projectId, repositoryId, refName);
    }

    public getCherryPickById(projectId: string, repositoryId: string, id: number): IPromise<VCContracts.GitCherryPick> {
        return this._gitRestClient.getCherryPick(projectId, id, repositoryId);
    }

    public getRevertById(projectId: string, repositoryId: string, id: number): IPromise<VCContracts.GitRevert> {
        return this._gitRestClient.getRevert(projectId, id, repositoryId);
    }
}
