import { RepositoryProperties } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { SourceProvider } from "CIWorkflow/Scripts/Scenarios/Definition/SourceProvider";
import { IRepository, IRepositoryItem, IRepositoryWebhook } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/VersionControlInterfaces";
import { ServiceClientFactory } from "CIWorkflow/Scripts/Service/ServiceClientFactory";

import { DefinitionTriggerType, SourceRepository, SourceRepositoryItem } from "TFS/Build/Contracts";

export class VersionControlSource {
    public getRepositories(provider: SourceProvider, connectionId: string, top: boolean): IPromise<IRepository[]> {
        if (provider && provider.canQueryRepositories()) {
            return ServiceClientFactory.getServiceClient().getRepositories(connectionId, provider.getRepositoryType(), top).then(
                results => results && results.repositories.map(this.createRepository));
        }
        else if (provider) {
            return ServiceClientFactory.getServiceClient().getRepository(connectionId, provider.getRepositoryType(), null).then(
                result => [this.createRepository(result)]);
        }
        else {
            // we don't expect any providers to use that
            const repo = {
                id: connectionId,
                name: "repository",
                url: null,
                data: null
            };
            return Promise.resolve([repo]);
        }
    }

    public getRepositoryBranches(provider: SourceProvider, connectionId: string, repository: IRepository): IPromise<String[]> {
        if (connectionId && provider && provider.canQueryBranches()) {
            return ServiceClientFactory.getServiceClient().getBranches(connectionId, provider.getRepositoryType(), repository.id);
        }

        return Promise.resolve([]);
    }

    public getRepository(provider: SourceProvider, connectionId: string, repositoryName: string): IPromise<IRepository> {
        if (connectionId && provider && provider.canQueryRepositories()) {
            return this.getExternalRepository(provider.getRepositoryType(), connectionId, repositoryName);
        }

        return Promise.resolve(null);
    }

    public getRepositoryWebhooks(provider: SourceProvider, connectionId: string, repository: IRepository): IPromise<IRepositoryWebhook[]> {
        if (connectionId && provider && provider.containsWebhookTrigger()) {
            return this.getExternalWebhooks(provider.getRepositoryType(), connectionId, repository);
        }

        return Promise.resolve([]);
    }

    public restoreRepositoryWebhook(repositoryType: string, connectionId: string, repository: IRepository, triggerTypes: DefinitionTriggerType[]): IPromise<void> {
        return this.restoreExternalWebhook(repositoryType, connectionId, repository, triggerTypes);
    }

    public getRepositoryFileContent(provider: SourceProvider, connectionId: string, repository: IRepository, commitOrBranch: string, path: string): IPromise<string> {
        if (connectionId && provider.canViewFileContents()) {
            return ServiceClientFactory.getServiceClient().getFileContents(connectionId, provider.getRepositoryType(), path, repository.id, commitOrBranch);
        }

        return Promise.resolve(null);
    }

    public getRepositoryPathContent(provider: SourceProvider, connectionId: string, repository: IRepository, commitOrBranch: string, path: string): IPromise<IRepositoryItem[]> {
        if (connectionId && provider.canBrowsePath()) {
            return ServiceClientFactory.getServiceClient().getPathContents(connectionId, provider.getRepositoryType(), path, repository.id, commitOrBranch).then(
                items => items && items.map(this.createRepositoryItem)
            );
        }

        return Promise.resolve(null);
    }

    protected getExternalRepository(repositoryType: string, connectionId: string, repositoryName: string): IPromise<IRepository> {
        return ServiceClientFactory.getServiceClient().getRepository(connectionId, repositoryType, repositoryName).then(
            repository => repository ? this.createRepository(repository) : null);
    }

    protected getExternalWebhooks(repositoryType: string, connectionId: string, repository: IRepository): IPromise<IRepositoryWebhook[]> {
        return ServiceClientFactory.getServiceClient().getWebhooks(connectionId, repositoryType, repository.id).then(
            webhooks => webhooks.map(h => {
                return {
                    repositoryUrl: repository.url,
                    types: h.types
                };
            }));
    }

    protected restoreExternalWebhook(repositoryType: string, connectionId: string, repository: IRepository, triggerTypes: DefinitionTriggerType[]): IPromise<void> {
        return ServiceClientFactory.getServiceClient().recreateWebhook(connectionId, repositoryType, triggerTypes, repository.id);
    }

    private createRepository(sourceRepository: SourceRepository): IRepository {
        const name = sourceRepository.properties[RepositoryProperties.Fullname] || sourceRepository.name;
        const cloneUrl = sourceRepository.properties[RepositoryProperties.CloneUrl] || sourceRepository.url;
        return {
            id: sourceRepository.id,
            name: name,
            url: cloneUrl,
            data: sourceRepository.properties
        };
    }

    private createRepositoryItem(sourceRepositoryItem: SourceRepositoryItem): IRepositoryItem {
        return {
            isContainer: sourceRepositoryItem.isContainer,
            path: sourceRepositoryItem.path
        };
    }
}
