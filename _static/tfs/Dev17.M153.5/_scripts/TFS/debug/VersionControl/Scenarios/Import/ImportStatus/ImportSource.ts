
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { GitImportRequest, GitAsyncOperationStatus} from "TFS/VersionControl/Contracts";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";

export class ImportSource {

    private static gitHttpClient = null;

    constructor(
        private projectInfoId: string,
        private repositoryId: string,
        private operationId: number) {
    }

    public getImport(): IPromise<GitImportRequest> {
        return ImportSource.getGitHttpClient().getImportRequest(
            this.projectInfoId,
            this.repositoryId,
            this.operationId);
    }

    public cancelImport(): IPromise<GitImportRequest> {

        let importRequestUpdateObject = {
            status: GitAsyncOperationStatus.Abandoned
        } as any as GitImportRequest;

        return ImportSource.getGitHttpClient().updateImportRequest(
            importRequestUpdateObject,
            this.projectInfoId,
            this.repositoryId,
            this.operationId);
    }

    public retryImport(): IPromise<GitImportRequest> {

        let importRequestUpdateObject = {
            status: GitAsyncOperationStatus.Queued
        } as any as GitImportRequest;

        return ImportSource.getGitHttpClient().updateImportRequest(
            importRequestUpdateObject,
            this.projectInfoId,
            this.repositoryId,
            this.operationId);
    }

    private static getGitHttpClient(): GitHttpClient {
        if (!ImportSource.gitHttpClient) {
            ImportSource.gitHttpClient = ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient>(GitHttpClient);
        }
        return ImportSource.gitHttpClient;
    }
}
