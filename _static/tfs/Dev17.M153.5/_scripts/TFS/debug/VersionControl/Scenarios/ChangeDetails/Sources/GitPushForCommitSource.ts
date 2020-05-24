import * as Q from "q";
import { GitPush} from "TFS/VersionControl/Contracts";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { GitClientService } from "VersionControl/Scripts/GitClientService";

/**
 * Fetches Push info for given commit
 */
export class GitPushForCommitSource {

    private _gitClient: GitClientService;

    constructor(private _repositoryContext: RepositoryContext) {      
    }

    public fetchGitPushFromId(id: number): IPromise<GitPush> {
        let deferred = Q.defer<GitPush>();
        this.gitClient.beginGetPush(
            this._repositoryContext,
            id,
            0,
            false,
            deferred.resolve,
            deferred.reject);

        return deferred.promise;
    }

    private get gitClient(): GitClientService {
        if (!this._gitClient) {
            this._gitClient = (<GitRepositoryContext>this._repositoryContext).getGitClient();
        }

        return this._gitClient;
    }
}
