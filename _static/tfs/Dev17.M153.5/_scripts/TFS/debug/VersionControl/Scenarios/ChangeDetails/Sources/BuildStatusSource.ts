import * as Q from "q";
import { DefinitionQueryOrder } from "TFS/Build/Contracts";
import { BuildHttpClient } from "TFS/Build/RestClient";
import { GitStatus } from "TFS/VersionControl/Contracts";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { getStringRepoType } from "VersionControl/Scripts/Utils/Build";
import { VssConnection } from "VSS/Service";

/**
 * A Source of data for build status
 */
export class BuildStatusSource {
    private _tfsConnection: VssConnection;
    private _buildClient: BuildHttpClient;
    private _gitClient: GitHttpClient;

    constructor(private _repositoryContext: RepositoryContext) {
    }

    /**
     * Fetches Build status for the given commit from server.
     */
    public getBuildStatusesForCommit(commitId: string): IPromise<GitStatus[]> {
        const deferred = Q.defer<GitStatus[]>();
        const tfsContext = this._repositoryContext.getTfsContext();
        const projectId = this._repositoryContext.getProjectId() || tfsContext.navigation.projectId;

        this.gitClient.getStatuses(commitId,
            this._repositoryContext.getRepositoryId(),
            projectId)
            .then((statuses: GitStatus[]) => {
                deferred.resolve(statuses);
            },
            (error: Error) => {
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * Fetches whether any build defiinition is defined for the repository.
     */
    public getHasBuildDefinition = (): IPromise<boolean> => {
        const repoType = getStringRepoType(this._repositoryContext.getRepositoryType());

        return this.buildClient.getDefinitions(
            this._repositoryContext.getTfsContext().navigation.projectId,
            undefined,
            this._repositoryContext.getRepositoryId(),
            repoType,
            DefinitionQueryOrder.LastModifiedDescending,
            1)
            .then(definitions => definitions && definitions.length > 0);
    }

    private get gitClient(): GitHttpClient {
        if (!this._gitClient) {
            this._gitClient = this.tfsConnection.getHttpClient(GitHttpClient);
        }
        return this._gitClient;
    }

    private get buildClient(): BuildHttpClient {
        if (!this._buildClient) {
            this._buildClient = this.tfsConnection.getHttpClient(BuildHttpClient);
        }
        return this._buildClient;
    }

    private get tfsConnection(): VssConnection {
        if (!this._tfsConnection) {
            this._tfsConnection = new VssConnection(this._repositoryContext.getTfsContext().contextData);
        }
        return this._tfsConnection;
    }
}
