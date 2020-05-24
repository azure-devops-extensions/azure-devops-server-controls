import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { ScmUtils } from "CIWorkflow/Scripts/Common/ScmUtils";
import * as Resources from "CIWorkflow/Scripts/Resources/TFS.Resources.CIWorkflow";
import { BitbucketComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/BitbucketComponentProvider";
import { ExternalGitComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ExternalGitComponentProvider";
import { GitHubComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/GitHubComponentProvider";
import { GitHubEnterpriseComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/GitHubEnterpriseComponentProvider";
import { ScmComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/ScmComponentProvider";
import { SvnComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/SvnComponentProvider";
import { TfGitComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/TfGitComponentProvider";
import { TfvcComponentProvider } from "CIWorkflow/Scripts/Scenarios/Definition/Components/SourceProviders/TfvcComponentProvider";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import { SubversionStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/SubversionStore";
import { TfGitStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfGitStore";
import { TfvcStore } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/TfvcStore";
import { VersionControlStoreBase } from "CIWorkflow/Scripts/Scenarios/Definition/Stores/VersionControlStoreBase";

import { ServiceEndpointType } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { EndpointAuthorizationSchemes } from "DistributedTasksCommon/ServiceEndpoints/ServiceEndpoint.Common";

import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { BuildRepository, SourceProviderAttributes, SupportedTrigger, DefinitionTriggerType, SupportLevel } from "TFS/Build/Contracts";
import { ProjectVisibility } from "TFS/Core/Contracts";
import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";
import { GitRepository, VersionControlProjectInfo } from "TFS/VersionControl/Contracts";
import * as GitRestClient from "TFS/VersionControl/GitRestClient";

import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

import * as Context from "VSS/Context";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as Utils_Array from "VSS/Utils/Array";

export namespace SourceProviderCapabilities {
    export const createLabel: string = "createLabel";
    export const discoverExistingYamlDefinitions: string = "discoverExistingYamlDefinitions";
    export const manageOnExternal: string = "manageOnExternal";
    export const queryBranches: string = "queryBranches";
    export const queryFileContents: string = "queryFileContents";
    export const queryPathContents: string = "queryPathContents";
    export const queryRepositories: string = "queryRepositories";
    export const queryTopRepositories: string = "queryTopRepositories";
    export const queryWebhooks: string = "queryWebhooks";
    export const sourceLinks: string = "sourceLinks";
    export const yamlDefinition: string = "yamlDefinition";
}

export namespace TriggerCapabilities {
    export const batchChanges: string = "batchChanges";
    export const pathFilters: string = "pathFilters";
    export const branchFilters: string = "branchFilters";
    export const buildForks: string = "buildForks";
}

export  namespace TriggerNotificationTypes {
    export const polling: string = "polling";
    export const webhook: string = "webhook";
    export const none: string = "none";
}

export class SourceProviderUtils {
    public static getIconClass(repositoryType: string, isTabIcon?: boolean): string {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(repositoryType);
        return properties && properties.getIconClass(isTabIcon);
    }

    public static getComponentProvider(repositoryType: string): ScmComponentProvider {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(repositoryType);
        return properties && properties.getComponentProvider();
    }

    public static getCleanHelp(repositoryType: string): string {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(repositoryType);
        return properties && properties.getCleanHelp();
    }

    public static getCleanLink(repositoryType: string): string {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(repositoryType);
        return properties && properties.getCleanLink();
    }

    public static getDefaultPathFilter(repositoryType: string, repository: BuildRepository): string {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(repositoryType);
        return properties && properties.getDefaultPathFilter(repository);
    }

    public static getManageRepositoriesLink(repositoryType: string): string {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(repositoryType);
        return properties && properties.getManageRepositoriesLink();
    }
}

export class SourceProvider {
    private _attributes: SourceProviderAttributes;

    constructor(attributes: SourceProviderAttributes) {
        this._attributes = attributes;
    }

    public getRepositoryType(): string {
        return this._attributes.name;
    }

    public getTabOrder(): number {
        const properties = _getSourceProviderProperties(this._attributes.name);
        return properties && properties.getTabOrder();
    }

    public getServiceEndpointType(): string {
        const properties = _getSourceProviderProperties(this._attributes.name);
        return properties && properties.getServiceEndpointType();
    }

    public getProjects(): VersionControlProjectInfo[] {
        const properties = _getSourceProviderProperties(this._attributes.name);
        return properties && properties.getProjects();
    }

    public getTitle(): string {
        const properties = _getSourceProviderProperties(this._attributes.name);
        return properties && properties.getTitle();
    }

    public usableInPublicProjects(): boolean {
        const properties = _getSourceProviderProperties(this._attributes.name);
        return properties && properties.usableInPublicProjects();
    }

    public canDiscoverExistingYamlDefinitions(): boolean {
        return this._attributes.supportedCapabilities[SourceProviderCapabilities.discoverExistingYamlDefinitions];
    }

    public canBrowsePath(): boolean {
        return this._attributes.supportedCapabilities[SourceProviderCapabilities.queryPathContents];
    }

    public canViewFileContents(): boolean {
        return this._attributes.supportedCapabilities[SourceProviderCapabilities.queryFileContents];
    }

    public isYamlSupported(): boolean {
        return this._attributes.supportedCapabilities[SourceProviderCapabilities.yamlDefinition];
    }

    public isProjectSupported(project: VersionControlProjectInfo): boolean {
        const projects = this.getProjects();
        if (projects.length > 0) {
            return projects.filter(p => p.project.id === project.project.id).length > 0 ;
        }
        return true;
    }

    public canQueryBranches(): boolean {
        return this._attributes.supportedCapabilities[SourceProviderCapabilities.queryBranches];
    }

    public canQueryRepositories(): boolean {
        return this._attributes.supportedCapabilities[SourceProviderCapabilities.queryRepositories];
    }

    public canQueryTopRepositories(): boolean {
        return this._attributes.supportedCapabilities[SourceProviderCapabilities.queryTopRepositories];
    }

    public canQueryWebhooks(serviceEndpoint?: ServiceEndpoint): boolean {
        // Some service endpoints do not support querying webhooks, even if the provider generally supports it.
        // If specified, the endpoint can disable support for querying webhooks.

        // If the provider doesn't support it, we're done
        if (!this._attributes.supportedCapabilities[SourceProviderCapabilities.queryWebhooks]) {
            return false;
        }

        // Check if there's an endpoint that should override the provider's support.
        if (!serviceEndpoint) {
            // No connection was given, so it's supported
            return true;
        }

        const properties = _getSourceProviderProperties(this._attributes.name);
        if (!properties || !properties.connectionSupportsQueryingWebhooks) {
            // No opinion on the specific service endpoint, so it's supported
            return true;
        }

        return properties.connectionSupportsQueryingWebhooks(serviceEndpoint);
    }

    public canCreateLabel(): boolean {
        return this._attributes.supportedCapabilities[SourceProviderCapabilities.createLabel];
    }

    public containsPollingIntervalTrigger(): boolean {
        return !!this._findTriggerByNotification(TriggerNotificationTypes.polling);
    }

    public containsWebhookTrigger(): boolean {
        return !!this.getSupportedTriggers().some((trigger) => {
            return trigger.notificationType === TriggerNotificationTypes.webhook;
        });
    }

    public getTriggerByType(type: DefinitionTriggerType): SupportedTrigger {
        return Utils_Array.first(this.getSupportedTriggers(), (trigger) => { return trigger.type === type; });
    }

    public getSupportedTriggers(): SupportedTrigger[] {
        return this._attributes.supportedTriggers || [];
    }

    public getBranchFilterSupportLevel(): SupportLevel {
        const trigger: SupportedTrigger = this.getSupportedTriggers()[0];
        if (trigger) {
            return trigger.supportedCapabilities[TriggerCapabilities.branchFilters];
        }
        return SupportLevel.Unsupported;
    }

    public getPathFilterSupportLevel(): SupportLevel {
        const trigger: SupportedTrigger = this.getSupportedTriggers()[0];
        if (trigger) {
            return trigger.supportedCapabilities[TriggerCapabilities.pathFilters];
        }
        return SupportLevel.Unsupported;
    }

    public getBatchChangesSupportLevel(type: DefinitionTriggerType): SupportLevel {
        const trigger: SupportedTrigger = this.getTriggerByType(type);
        if (trigger) {
            return trigger.supportedCapabilities[TriggerCapabilities.batchChanges];
        }
        return SupportLevel.Unsupported;
    }

    public getYamlEditFileLink(yamlFileInfo: YamlFileInfo): IPromise<string> {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(this.getRepositoryType());
        return properties && properties.getYamlFileEditLink(yamlFileInfo);
    }

    public getCleanHelp(): string {
        return SourceProviderUtils.getCleanHelp(this.getRepositoryType());
    }

    public getCleanLink(): string {
        return SourceProviderUtils.getCleanLink(this.getRepositoryType());
    }

    public getDefaultPathFilter(repository: BuildRepository): string {
        return SourceProviderUtils.getDefaultPathFilter(this.getRepositoryType(), repository);
    }

    public getIconClass(isTabIcon?: boolean): string {
        return SourceProviderUtils.getIconClass(this.getRepositoryType(), isTabIcon);
    }
    public getComponentProvider(): ScmComponentProvider {
        return SourceProviderUtils.getComponentProvider(this.getRepositoryType());
    }

    public getStore(): VersionControlStoreBase {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(this._attributes.name);
        return properties && properties.getStore();
    }

    public _findTriggerByNotification(type: string) {
        return !!Utils_Array.first(this.getSupportedTriggers(), ((trigger) => { return trigger.notificationType === type; }));
    }

    public isTriggerSupported(type: DefinitionTriggerType): boolean {
        return !!this.getTriggerByType(type);
    }

    public isBuildForksSupported(type: DefinitionTriggerType): boolean {
        const trigger: SupportedTrigger = this.getTriggerByType(type);
        return !!trigger && trigger.supportedCapabilities[TriggerCapabilities.buildForks] !== SupportLevel.Unsupported;
    }

    // Are fork builds enabled by default upon build definition creation (currently only GitHub & GHE)
    public isBuildForksDefault(): boolean {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(this._attributes.name);
        return properties && properties.defaultBuildForks();
    }

    // Are fork builds passed secrets by default upon build definition creation (currently only GHE)
    public isPassForkSecretsDefault(): boolean {
        const properties: ISourceProviderProperties = _getSourceProviderProperties(this._attributes.name);
        return properties && properties.defaultBuildForks() && properties.defaultPassForkSecrets();
    }

    public isTriggerNotificationType(type: DefinitionTriggerType, notificationType: string): boolean {
        const trigger: SupportedTrigger = this.getTriggerByType(type);
        return !!trigger && trigger.notificationType === notificationType;
    }

    public isBranchFilterSupported(type?: DefinitionTriggerType): boolean {
        // TODO: this is hard-coded to the CI for 'default'
        type = type || DefinitionTriggerType.ContinuousIntegration;
        const trigger: SupportedTrigger = this.getTriggerByType(type);
        return !!trigger && trigger.supportedCapabilities[TriggerCapabilities.branchFilters] !== SupportLevel.Unsupported;
    }

    public isPathFilterSupported(type: DefinitionTriggerType): boolean {
        const trigger: SupportedTrigger = this.getTriggerByType(type);
        return !!trigger && trigger.supportedCapabilities[TriggerCapabilities.pathFilters] !== SupportLevel.Unsupported;
    }
}

interface ISourceProviderProperties {
    getCleanHelp: () => string;
    getCleanLink: () => string;
    getComponentProvider: () => ScmComponentProvider;
    getDefaultPathFilter: (repository: BuildRepository) => string;
    getIconClass: (isTabIcon?: boolean) => string;
    getManageRepositoriesLink: () => string;
    getServiceEndpointType: () => string;
    getStore: () => VersionControlStoreBase;
    getTabOrder: () => number;
    getTitle: () => string;
    getProjects: () => VersionControlProjectInfo[];
    usableInPublicProjects: () => boolean;
    getYamlFileEditLink: (yamlFileInfo: YamlFileInfo) => IPromise<string>;
    connectionSupportsQueryingWebhooks?: (serviceEndpoint: ServiceEndpoint) => boolean;
    defaultBuildForks: () => boolean;
    defaultPassForkSecrets: () => boolean;
}

function _getSourceProviderProperties(repositoryType: string): ISourceProviderProperties {
    const currentProjectId = TfsContext.getDefault().contextData.project.id;
    const projectVisibility = DefaultRepositorySource.instance().getProjectVisibility(currentProjectId);
    const projects = DefaultRepositorySource.instance().getProjectInfos();
    // for public projects we only display the current project
    const gitProjects = projects ? projects.filter(p => p.supportsGit && (projectVisibility === ProjectVisibility.Private || currentProjectId === p.project.id)) : [];
    const tfvcProjects = projects ? projects.filter(p => p.supportsTFVC  && (projectVisibility === ProjectVisibility.Private || currentProjectId === p.project.id)) : [];
    // If there are no projects then the rest call to get projects could have failed so show both tfvc and git
    const hasGitProjects = !projects || projects.length === 0 ? true : gitProjects.length > 0;
    const hasTfvcProjects = !projects || projects.length === 0 ? true : tfvcProjects.length > 0;

    switch (ScmUtils.convertRepoTypeToWellKnownRepoType(repositoryType)) {
        case RepositoryTypes.Bitbucket:
            return {
                getServiceEndpointType: () => ServiceEndpointType.Bitbucket,
                getTabOrder: () => _getTabOrder(6, hasGitProjects, hasTfvcProjects),
                getTitle: () => Resources.BitbucketTabItemTitle,
                getCleanHelp: () => Resources.GitCleanHelpMarkdown,
                getCleanLink: () => Resources.GitCleanHelpLink,
                getDefaultPathFilter: (repository: BuildRepository) => "",
                getIconClass: (isTabIcon?: boolean) => "bowtie-brand-bitbucket",
                getComponentProvider: () => new BitbucketComponentProvider(),
                getManageRepositoriesLink: () => "https://bitbucket.org",
                getStore: () => null,
                getProjects: () => [],
                usableInPublicProjects: () => true,
                getYamlFileEditLink: (yamlFileInfo: YamlFileInfo) => Promise.resolve(""),
                defaultBuildForks: () => false,
                defaultPassForkSecrets: () => false
            };
        case RepositoryTypes.Git:
            return {
                getServiceEndpointType: () => ServiceEndpointType.ExternalGit,
                getTabOrder: () => _getTabOrder(7, hasGitProjects, hasTfvcProjects),
                getTitle: () => Resources.ExternalGitTabItemTitle,
                getCleanHelp: () => Resources.GitCleanHelpMarkdown,
                getCleanLink: () => Resources.GitCleanHelpLink,
                getDefaultPathFilter: (repository: BuildRepository) => "",
                getIconClass: (isTabIcon?: boolean) => "bowtie-brand-git",
                getComponentProvider: () => new ExternalGitComponentProvider(),
                getManageRepositoriesLink: () => null,
                getStore: () => null,
                getProjects: () => [],
                usableInPublicProjects: () => true,
                getYamlFileEditLink: (yamlFileInfo: YamlFileInfo) => Promise.resolve(""),
                defaultBuildForks: () => false,
                defaultPassForkSecrets: () => false
            };
        case RepositoryTypes.GitHub:
            return {
                getServiceEndpointType: () => ServiceEndpointType.GitHub,
                getTabOrder: () => _getTabOrder(3, hasGitProjects, hasTfvcProjects),
                getTitle: () => Resources.GitHubTabItemTitle,
                getCleanHelp: () => Resources.GitCleanHelpMarkdown,
                getCleanLink: () => Resources.GitCleanHelpLink,
                getDefaultPathFilter: (repository: BuildRepository) => "",
                getIconClass: (isTabIcon?: boolean) => "bowtie-brand-github",
                getComponentProvider: () => new GitHubComponentProvider(),
                getManageRepositoriesLink: () => "https://github.com",
                getStore: () => null,
                getProjects: () => [],
                usableInPublicProjects: () => true,
                getYamlFileEditLink: (yamlFileInfo: YamlFileInfo) => {
                    const link = yamlFileInfo.repositoryUrl + "/blob/" + yamlFileInfo.branchString + "/" + yamlFileInfo.yamlPath;
                    return Promise.resolve(link);
                },
                connectionSupportsQueryingWebhooks: (serviceEndpoint: ServiceEndpoint) => {
                    // Check the Service Endpoint configuration to see if webHooks are blocked for this endpoint (Tabby/Cheshire scenarios)
                    // if (Scheme == Token) then block webhooks
                    if (serviceEndpoint &&
                        serviceEndpoint.authorization &&
                        serviceEndpoint.authorization.scheme === EndpointAuthorizationSchemes.Token) {
                            return false;
                    }
                    return true;
                },
                defaultBuildForks: () => true,
                defaultPassForkSecrets: () => false
            };
        case RepositoryTypes.GitHubEnterprise:
            return {
                getServiceEndpointType: () => ServiceEndpointType.GitHubEnterprise,
                getTabOrder: () => _getTabOrder(4, hasGitProjects, hasTfvcProjects),
                getTitle: () => Resources.GitHubEnterpriseTabItemTitle,
                getCleanHelp: () => Resources.GitCleanHelpMarkdown,
                getCleanLink: () => Resources.GitCleanHelpLink,
                getDefaultPathFilter: (repository: BuildRepository) => "",
                getIconClass: (isTabIcon?: boolean) => "bowtie-brand-github",
                getComponentProvider: () => new GitHubEnterpriseComponentProvider(),
                getManageRepositoriesLink: () => null,
                getStore: () => null,
                getProjects: () => [],
                usableInPublicProjects: () => true,
                getYamlFileEditLink: (yamlFileInfo: YamlFileInfo) => Promise.resolve(""),
                defaultBuildForks: () => true,
                defaultPassForkSecrets: () => true
            };
        case RepositoryTypes.Svn:
            return {
                getServiceEndpointType: () => ServiceEndpointType.Subversion,
                getTabOrder: () => _getTabOrder(5, hasGitProjects, hasTfvcProjects),
                getTitle: () => Resources.SubversionTabItemTitle,
                getCleanHelp: () => Resources.GitCleanHelpMarkdown,
                getCleanLink: () => Resources.GitCleanHelpLink,
                getDefaultPathFilter: (repository: BuildRepository) => repository.defaultBranch,
                getIconClass: (isTabIcon?: boolean) => "bowtie-brand-svn",
                getComponentProvider: () => new SvnComponentProvider(),
                getManageRepositoriesLink: () => null,
                getStore: () => StoreManager.GetStore<SubversionStore>(SubversionStore),
                getProjects: () => [],
                usableInPublicProjects: () => true,
                getYamlFileEditLink: (yamlFileInfo: YamlFileInfo) => Promise.resolve(""),
                defaultBuildForks: () => false,
                defaultPassForkSecrets: () => false
            };
        case RepositoryTypes.TfsGit:
            return {
                getServiceEndpointType: () => null,
                getTabOrder: () => { const order = hasGitProjects ? 1 : -1; return order; },
                getTitle: () => Resources.TfGitSourcesTabItemHostedTitle,
                getCleanHelp: () => Resources.GitCleanHelpMarkdown,
                getCleanLink: () => Resources.GitCleanHelpLink,
                getDefaultPathFilter: (repository: BuildRepository) => "",
                getIconClass: (isTabIcon?: boolean) => "bowtie-brand-visualstudio",
                getComponentProvider: () => new TfGitComponentProvider(),
                getManageRepositoriesLink: () => null,
                getStore: () => StoreManager.GetStore<TfGitStore>(TfGitStore),
                getProjects: () => gitProjects,
                usableInPublicProjects: () => true,
                getYamlFileEditLink: (yamlFileInfo: YamlFileInfo) => {
                    const gitRestClient = GitRestClient.getClient();
                    const version = yamlFileInfo.branchOrCommit ? yamlFileInfo.branchOrCommit.toVersionString() : yamlFileInfo.branchString;
                    return gitRestClient.getRepository(yamlFileInfo.repositoryId, yamlFileInfo.projectId).then((repository: GitRepository) => {
                        return repository._links["web"].href + "?path=" + yamlFileInfo.yamlPath + "&version=" + version;
                    }, () => {
                        return "";
                    });
                },
                defaultBuildForks: () => false,
                defaultPassForkSecrets: () => false
            };
        case RepositoryTypes.TfsVersionControl:
            return {
                getServiceEndpointType: () => null,
                getTabOrder: () => { const order = hasTfvcProjects && hasGitProjects ? 2 : hasTfvcProjects ? 1 : -1; return order; },
                getTitle: () => Resources.TfvcSourcesTabItemTitle,
                getCleanHelp: () => Resources.TfvcCleanHelpMarkdown,
                getCleanLink: () => Resources.TfvcCleanHelpLink,
                getDefaultPathFilter: (repository: BuildRepository) => repository.rootFolder,
                getIconClass: (isTabIcon?: boolean) => "bowtie-tfvc-repo",
                getComponentProvider: () => new TfvcComponentProvider(),
                getManageRepositoriesLink: () => null,
                getStore: () => StoreManager.GetStore<TfvcStore>(TfvcStore),
                getProjects: () => tfvcProjects,
                usableInPublicProjects: () => true,
                getYamlFileEditLink: (yamlFileInfo: YamlFileInfo) => Promise.resolve(""),
                defaultBuildForks: () => false,
                defaultPassForkSecrets: () => false
            };
    }
    return null;
}

function _getTabOrder(originalOrder: number, hasGitProjects: boolean, hasTfvcProjects: boolean) {
    if (hasGitProjects && hasTfvcProjects)
    {
        return originalOrder;
    }
    // in case there are only tfvc or git projects then one source provider will be added for tfs
    // (so all tabs will shift in order)
    else if (hasGitProjects || hasTfvcProjects)
    {
        return originalOrder - 1;
    }

    // in case there are not any tfvc or git projects, then it must be that the call to getProjects failed
    // so we present both source providers tfvc and git
    return originalOrder;

}

export class YamlFileInfo {
    public repositoryId?: string;
    public projectId?: string;
    public repositoryType?: string;
    public yamlPath?: string;
    public serviceEndPoint?: string;
    public branchOrCommit?: VersionSpec;
    public branchString?: string;
    public repositoryUrl?: string;
}

