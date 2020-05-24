import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { GitConflict } from "TFS/VersionControl/Contracts";

export interface IConflictSource {
    getPullRequestConflictsAsync(
        pullRequestId: number,
        skip?: number,
        top?: number,
        includeObsolete?: boolean,
        excludeResolved?: boolean,
        onlyResolved?: boolean
    ): IPromise<GitConflict[]>;
}

export class ConflictSource implements IConflictSource {
    private _gitRestClient: GitHttpClient;
    private _repositoryId: string;
    private _projectId: string;

    constructor(projectId: string, repositoryId: string) {
        this._repositoryId = repositoryId;
        this._projectId = projectId;
    }

    public getPullRequestConflictsAsync(
        pullRequestId: number,
        skip?: number,
        top?: number,
        includeObsolete?: boolean,
        excludeResolved?: boolean,
        onlyResolved?: boolean
    ): IPromise<GitConflict[]> {
        if (!this._gitRestClient) {
            this._gitRestClient = ProjectCollection.getDefaultConnection()
                .getHttpClient<GitHttpClient>(GitHttpClient);
        }

        return this._gitRestClient.getPullRequestConflicts(this._repositoryId, pullRequestId, this._projectId,
            skip,
            top,
            includeObsolete,
            excludeResolved,
            onlyResolved);
    }
}
