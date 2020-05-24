import * as Q from "q";
import { DataProviderQuery } from "VSS/Contributions/Contracts";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { WebPageDataService } from "VSS/Contributions/Services";
import { SecurityService } from "VSS/Security/Services";
import * as VSSService from "VSS/Service";
import * as VSSContext from "VSS/Context";
import { GitVersionDescriptor } from "TFS/VersionControl/Contracts";
import { WikiCreateParametersV2, WikiType, WikiV2 } from "TFS/Wiki/Contracts";
import { WikiHttpClient } from "TFS/Wiki/WikiRestClient";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { GitConstants, GitRepositoryPermissions } from "VersionControl/Scripts/Generated/TFS.VersionControl.Common";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { calculateGitSecuredToken } from "VersionControl/Scripts/Utils/GitSecuredUtils";
import { WikiPermissions } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { ContributionKeys, DataProviderDataFlags } from "Wiki/Scripts/CommonConstants";
import { GitRepositoryData } from "Wiki/Scripts/Contracts";
import { deserializeToWiki, deserializeToWikiVersion } from "Wiki/Scripts/DeserializationHelper";

export interface WikiMetadata {
    landingWiki: WikiV2;
    landingWikiVersion: GitVersionDescriptor;
    wikiVersionError: string;
    wikiRepositoryData: GitRepositoryData;
    signalrHubUrl: string;
    isTfvcOnlyProject: boolean;
    isProjectWikiExisting: boolean;
    isStakeholder: boolean;
    isBrokenLinksHandlingEnabled: boolean;
    draftVersions?: GitVersionDescriptor[];
}

export class WikiRepoSource {
    private _wikiHttpClient: WikiHttpClient;
    private _contributionsHttpClient: ContributionsHttpClient;
    private _webPageDataService: WebPageDataService;

    public createWiki(): IPromise<WikiV2> {
        return this._wikiClient.createWiki(
            {
                type: WikiType.ProjectWiki,
                projectId: VSSContext.getPageContext().webContext.project.id,
            } as WikiCreateParametersV2);
    }

    public getWikiMetadata(): IPromise<WikiMetadata> {
        return this._getWikiMetadataFromIsland();
    }

    public getWikiPermissionData(projectId: string, repositoryId: string, isStakeholder: boolean): IPromise<WikiPermissions> {
        const deferred = Q.defer<WikiPermissions>();
        const securityService: SecurityService = VSSService.getLocalService(SecurityService);

        const hasCreateWikiPermission = !isStakeholder && this._hasPermission(
            securityService,
            projectId,
            null,
            GitRepositoryPermissions.CreateRepository);

        const hasWikiContributePermission = !isStakeholder && this._hasPermission(
            securityService,
            projectId,
            repositoryId,
            GitRepositoryPermissions.GenericContribute);

        const hasWikiReadPermission = this._hasPermission(
            securityService,
            projectId,
            repositoryId,
            GitRepositoryPermissions.GenericRead);

        const hasWikiManagePermission = !isStakeholder && this._hasPermission(
            securityService,
            projectId,
            repositoryId,
            GitRepositoryPermissions.ManagePermissions);

        const hasWikiRenamePermission = !isStakeholder && this._hasPermission(
            securityService,
            projectId,
            repositoryId,
            GitRepositoryPermissions.RenameRepository
        );

        const wikiPermissions: WikiPermissions = {
            hasCreatePermission: hasCreateWikiPermission,
            hasContributePermission: hasWikiContributePermission,
            hasReadPermission: hasWikiReadPermission,
            hasRenamePermission: hasWikiRenamePermission,
            hasManagePermission: hasWikiManagePermission,
        }

        return Promise.resolve(wikiPermissions);
    }

    private get _wikiPageDataService(): WebPageDataService {
        if (!this._webPageDataService) {
            this._webPageDataService = VSSService.getService(WebPageDataService);
        }

        return this._webPageDataService;
    }

    private get _wikiClient(): WikiHttpClient {
        if (!this._wikiHttpClient) {
            this._wikiHttpClient = VSSService.getClient(WikiHttpClient);
        }

        return this._wikiHttpClient;
    }

    private get _contributionClient(): ContributionsHttpClient {
        if (!this._contributionsHttpClient) {
            this._contributionsHttpClient = ProjectCollection.getConnection().getHttpClient(ContributionsHttpClient);
        }

        return this._contributionsHttpClient;
    }

    private _getFetchErrorIfAny(resolvedProviders: ResolvedDataProvider[]): Error {
        let fetchError: Error = null;
        if (!!resolvedProviders) {
            $.each(resolvedProviders, (index: number, provider: ResolvedDataProvider) => {
                if (provider.id === ContributionKeys.WikiTreeDataProvider && !!provider.error) {
                    fetchError = new Error(provider.error);
                    return;
                }
            });
        }
        return fetchError;
    }  

    private _hasPermission (securityService: SecurityService, projectId: string, repoId: string, permission: number): boolean {
        return securityService.hasPermission(GitConstants.GitSecurityNamespaceId, calculateGitSecuredToken(projectId, repoId), permission);
    }

    private _getDataProviderQuery(fetchWikiPages: string): DataProviderQuery {
        const dataProviderDataFlags: DataProviderDataFlags = {
            fetchWikiPages: fetchWikiPages,
        } as DataProviderDataFlags;

        const query: DataProviderQuery = {
            context: {
                properties: {
                    // TODO: Project Id should be available at server and should not be passed by client.
                    "projectId": VSSContext.getPageContext().webContext.project.id,
                    ...dataProviderDataFlags,
                },
            },
            contributionIds: [ContributionKeys.WikiTreeDataProvider],
        };

        return query;
    }

    private _getWikiMetadataFromIsland = (): IPromise<WikiMetadata> => {
        const deferred = Q.defer<WikiMetadata>();
        let error: Error = this._getFetchErrorIfAny(this._wikiPageDataService["_resolvedProviders"]);
        let data = (this._wikiPageDataService.getPageData<WikiMetadata>(ContributionKeys.WikiTreeDataProvider));
        if (!!error) {
            deferred.reject(error);
        } else {
            data.landingWiki = deserializeToWiki(data.landingWiki);
            data.landingWikiVersion = deserializeToWikiVersion(data.landingWikiVersion);
            deferred.resolve(data);
        }
        return deferred.promise;
    }
}
