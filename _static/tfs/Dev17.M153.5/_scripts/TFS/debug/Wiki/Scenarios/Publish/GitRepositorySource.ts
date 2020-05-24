import * as Q from "q";

import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { GitRepository } from "TFS/VersionControl/Contracts";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";

export class GitRepositorySource {
    constructor(
        private _gitHttpClient?: GitHttpClient,
    ) {
        if (!this._gitHttpClient) {
            this._gitHttpClient = ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient>(GitHttpClient);
        }
    }

    public getRepository(repositoryId: string): IPromise<GitRepository> {
        return this._gitHttpClient.getRepository(repositoryId);
    }
}