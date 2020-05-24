import { GetDefinitionsOptions, GetDefinitionsResult } from "Build.Common/Scripts/ClientContracts";
import { BuildClientService } from "Build.Common/Scripts/ClientServices";
import { DefinitionCache } from "Build.Common/Scripts/DefinitionCache";

import { IServiceClient } from "CIWorkflow/Scripts/Service/IServiceClient";

import { Singleton } from "DistributedTaskControls/Common/Factory";

import * as BuildContracts from "TFS/Build/Contracts";

import * as Context from "VSS/Context";
import { VssConnection, getCollectionService } from "VSS/Service";

export class BuildServiceClient extends Singleton implements IServiceClient  {
    private _vssConnection: VssConnection;
    private _buildClient: BuildClientService;
    private _definitionCacheClient: DefinitionCache;

    constructor(){
        super();
        this._buildClient = this._getVssConnection().getService<BuildClientService>(BuildClientService);
        this._definitionCacheClient = new DefinitionCache(this._buildClient);
    }

    public createDefinition(definition: BuildContracts.BuildDefinition, definitionToCloneId?: number, definitionToCloneRevision?: number): IPromise<BuildContracts.BuildDefinition> {
        return this._buildClient.createDefinition(definition, definitionToCloneId, definitionToCloneRevision);
    }

    public updateDefinition(definition: BuildContracts.BuildDefinition, secretsSourceDefinitionId?: number) {
        return this._buildClient.updateDefinition(definition, secretsSourceDefinitionId);
    }

    public getAllDefinitions(refresh?: boolean): IPromise<BuildContracts.DefinitionReference[]> {
        return this._definitionCacheClient.getAllDefinitions(refresh);
    }

    public putScopedDraft(parentDefinitionId: number, draft: BuildContracts.BuildDefinition, comment: string, replace: boolean): IPromise<BuildContracts.BuildDefinition> {
        return this._buildClient.putScopedDraft(parentDefinitionId, draft, comment, replace);
    }

    public getDefinition(definitionId: number, revision?: number, minMetricsTime?: Date, propertyFilters?: string[]): IPromise<BuildContracts.BuildDefinition> {
        return this._buildClient.getDefinition(definitionId, revision, minMetricsTime, propertyFilters);
    }

    public getSettings(): IPromise<BuildContracts.BuildSettings> {
        return this._buildClient.getBuildSettings();
    }

    public getDefinitionRevisions(definitionId: number): IPromise<BuildContracts.BuildDefinitionRevision[]> {
        return this._buildClient.getDefinitionRevisions(definitionId);
    }

    public getOptionDefinitions(): IPromise<BuildContracts.BuildOptionDefinition[]> {
        return this._buildClient.getOptionDefinitions();
    }

    public deleteDefinition(id: number): IPromise<any> {
        return this._buildClient.deleteDefinition(id);
    }

    public deleteDefinitionTemplate(templateId: string): IPromise<any> {
        return this._buildClient.deleteDefinitionTemplate(templateId);
    }

    public getDefinitionTemplate(templateId: string): IPromise<BuildContracts.BuildDefinitionTemplate> {
        return this._buildClient.getDefinitionTemplate(templateId);
    }

    public getDefinitionTemplates(): IPromise<BuildContracts.BuildDefinitionTemplate[]> {
        return this._buildClient.getDefinitionTemplates();
    }

    public getFolders(path?: string, queryOrder: BuildContracts.FolderQueryOrder = BuildContracts.FolderQueryOrder.FolderAscending): IPromise<BuildContracts.Folder[]> {
        return this._buildClient.getFolders(path, queryOrder);
    }

    public getBranches(serviceEndpointId: string, repositoryType: string, repository?: string): IPromise<string[]> {
        return this._buildClient.getBranches(serviceEndpointId, repositoryType, repository);
    }

    public getRepositories(serviceEndpointId: string, repositoryType: string, top: boolean, continuationToken?: string): IPromise<BuildContracts.SourceRepositories> {
        return this._buildClient.getRepositories(serviceEndpointId, repositoryType, top, continuationToken);
    }

    public getRepository(serviceEndpointId: string, repositoryType: string, repositoryName: string): IPromise<BuildContracts.SourceRepository> {
        return this._buildClient.getRepository(serviceEndpointId, repositoryType, repositoryName);
    }

    public getSourceProviders(): IPromise<BuildContracts.SourceProviderAttributes[]> {
        return this._buildClient.getSourceProviders();
    }

    public getWebhooks(serviceEndpointId: string, repositoryType: string, repositoryName: string): IPromise<BuildContracts.RepositoryWebhook[]> {
        return this._buildClient.getWebhooks(serviceEndpointId, repositoryType, repositoryName);
    }

    public getFileContents(serviceEndpointId: string, repositoryType: string, path: string, repository?: string, commitOrBranch?: string): IPromise<string> {
        return this._buildClient.getFileContents(serviceEndpointId, repositoryType, path, repository, commitOrBranch);
    }

    public getPathContents(serviceEndpointId: string, repositoryType: string, path: string, repository?: string, commitOrBranch?: string): IPromise<BuildContracts.SourceRepositoryItem[]> {
        return this._buildClient.getPathContents(serviceEndpointId, repositoryType, path, repository, commitOrBranch);
    }

    public recreateWebhook(serviceEndpointId: string, repositoryType: string, triggerTypes: BuildContracts.DefinitionTriggerType[], repository?: string): IPromise<void> {
        return this._buildClient.recreateWebhook(serviceEndpointId, repositoryType, triggerTypes, repository);
    }

    public getDefinitions(filter?: GetDefinitionsOptions): IPromise<GetDefinitionsResult> {
        return this._buildClient.getDefinitions(filter);
    }

    public static instance(): BuildServiceClient {
        return super.getInstance<BuildServiceClient>(BuildServiceClient);
    }

    private _getVssConnection(): VssConnection {
        if (!this._vssConnection) {
            this._vssConnection = new VssConnection(Context.getDefaultWebContext());
        }
        return this._vssConnection;
    }
}
