import Q = require("q");
import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";
import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";
import * as DistributedTaskAgentClient from "TFS/DistributedTask/TaskAgentRestClient";
import { GitRepository, GitImportRequest, GitImportRequestParameters, ImportRepositoryValidation} from "TFS/VersionControl/Contracts";
import { GitHttpClient } from "TFS/VersionControl/GitRestClient";
import {ProjectCollection} from "Presentation/Scripts/TFS/TFS.OM.Common";
import * as ImportResources from "VersionControl/Scripts/Resources/TFS.Resources.ImportDialog";

let _gitClient: GitHttpClient = null;
let _distributedTaskHttpClient: DistributedTaskAgentClient.TaskAgentHttpClient = null;

export class ServicesClient {
    constructor() {
    }

    public createGitRepository(gitRepositoryToCreate: GitRepository, project?: string): IPromise<GitRepository> {
        return ServicesClient._getGitHttpClient().createRepository(gitRepositoryToCreate, project);
    }

    public queueImport(requestParams: GitImportRequestParameters, projectId: string, repositoryName: string): IPromise<GitImportRequest> {
        const importRequest = {
            parameters: requestParams
        } as any as GitImportRequest;

        return ServicesClient._getGitHttpClient().createImportRequest(importRequest, projectId, repositoryName);
    }

    public validateCloneUrl(requestParams: ImportRepositoryValidation, projectId: string): IPromise<ImportRepositoryValidation> {
        return ServicesClient._getGitHttpClient().validateRemoteRepository(requestParams, projectId);
    }

    public createServiceEndpoint(
        username: string,
        password: string,
        projectId: string,
        cloneUrl: string): IPromise<DistributedTaskContracts.ServiceEndpoint> {
        const endpoint = {} as DistributedTaskContracts.ServiceEndpoint;

        endpoint.name = Math.random().toString(36).substring(7);;
        endpoint.type = "git";
        endpoint.url = cloneUrl;

        endpoint.authorization = {
            parameters: {
                username: username,
                password: password
            },
            scheme: "UsernamePassword"
        };

        return ServicesClient._getDistributedTaskHttpClient().createServiceEndpoint(endpoint, projectId);
    }

    private static _getGitHttpClient(): GitHttpClient {
        if (!_gitClient) {
            _gitClient = ProjectCollection.getDefaultConnection().getHttpClient<GitHttpClient>(GitHttpClient);
        }

        return _gitClient;
    }

    private static _getDistributedTaskHttpClient(): DistributedTaskAgentClient.TaskAgentHttpClient {
        if (!_distributedTaskHttpClient) {
            _distributedTaskHttpClient = ProjectCollection.getDefaultConnection().getHttpClient<DistributedTaskAgentClient.TaskAgentHttpClient>(DistributedTaskAgentClient.TaskAgentHttpClient);
        }

        return _distributedTaskHttpClient;
    }
}