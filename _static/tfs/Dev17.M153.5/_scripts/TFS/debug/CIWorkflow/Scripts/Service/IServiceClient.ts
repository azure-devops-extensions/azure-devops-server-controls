import { GetDefinitionsOptions, GetDefinitionsResult } from "Build.Common/Scripts/ClientContracts";

import * as BuildContracts from "TFS/Build/Contracts";

/**
 * This interface abstracts the communication with the actual service. All service calls should happen using this interface. This will have concrete
 * implementation for Build and Pipeline service.
 */
export interface IServiceClient {

    createDefinition(definition: BuildContracts.BuildDefinition, definitionToCloneId?: number, definitionToCloneRevision?: number, validateProcessOnly?: boolean): IPromise<BuildContracts.BuildDefinition>;

    updateDefinition(definition: BuildContracts.BuildDefinition, secretsSourceDefinitionId?: number);

    getDefinition(definitionId: number, revision?: number, minMetricsTime?: Date, propertyFilters?: string[]): IPromise<BuildContracts.BuildDefinition>;

    getSettings(): IPromise<BuildContracts.BuildSettings>;

    getDefinitionRevisions(definitionId: number): IPromise<BuildContracts.BuildDefinitionRevision[]>;

    getOptionDefinitions(): IPromise<BuildContracts.BuildOptionDefinition[]>;

    getDefinitionTemplate(templateId: string): IPromise<BuildContracts.BuildDefinitionTemplate>;

    getDefinitionTemplates(): IPromise<BuildContracts.BuildDefinitionTemplate[]>;

    getBranches(serviceEndpointId: string, repositoryType: string, repository?: string): IPromise<string[]>;

    getRepositories(serviceEndpointId: string, repositoryType: string, top: boolean, contiunationToken?: string): IPromise<BuildContracts.SourceRepositories>;

    getRepository(serviceEndpointId: string, repositoryType: string, repositoryName: string): IPromise<BuildContracts.SourceRepository>;

    getSourceProviders(): IPromise<BuildContracts.SourceProviderAttributes[]>;

    getWebhooks(serviceEndpointId: string, repositoryType: string, repositoryName: string): IPromise<BuildContracts.RepositoryWebhook[]>;

    getFileContents(serviceEndpointId: string, repositoryType: string, path: string, repository?: string, commitOrBranch?: string): IPromise<string>;

    getPathContents(serviceEndpointId: string, repositoryType: string, path: string, repository?: string, commitOrBranch?: string): IPromise<BuildContracts.SourceRepositoryItem[]>;

    recreateWebhook(serviceEndpointId: string, repositoryType: string, triggerTypes: BuildContracts.DefinitionTriggerType[], repository?: string): IPromise<void>;

    getFolders(path?: string, queryOrder?: BuildContracts.FolderQueryOrder): IPromise<BuildContracts.Folder[]>;

    putScopedDraft(parentDefinitionId: number, draft: BuildContracts.BuildDefinition, comment: string, replace: boolean): IPromise<BuildContracts.BuildDefinition>;

    deleteDefinition(id: number): IPromise<any>;

    deleteDefinitionTemplate(templateId: string): IPromise<any>;

    getAllDefinitions(refresh?: boolean): IPromise<BuildContracts.DefinitionReference[]>;

    getDefinitions(filter?: GetDefinitionsOptions): IPromise<GetDefinitionsResult>;
}
