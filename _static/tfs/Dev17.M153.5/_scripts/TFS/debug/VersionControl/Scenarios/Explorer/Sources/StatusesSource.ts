import * as Q from "q";

import { using } from "VSS/VSS";
import { ContextHostType } from "VSS/Common/Contracts/Platform";
import { HubsService } from "VSS/Navigation/HubsService";
import { getService, VssConnection } from "VSS/Service";
import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import { Uri } from "VSS/Utils/Url";
import { format, equals, EmptyGuidString } from "VSS/Utils/String"
import { getCachedServiceLocation } from "VSS/Locations"

import * as _LocationContracts from "VSS/Locations/Contracts";
import * as _LocationsRestClient from "VSS/Locations/RestClient";
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";
import * as _Authentication_Contracts from "VSS/Authentication/Contracts";
import * as _Authentication_RestClient from "VSS/Authentication/RestClient";
import * as _Authentication_Services from "VSS/Authentication/Services";
import { getService as getUserClaimsService, UserClaims } from "VSS/User/Services";

import { GitStatus } from "TFS/VersionControl/Contracts";
import { CodeHubContributionIds } from "VersionControl/Scripts/CodeHubContributionIds";
import * as _TFSGitRestClient from "TFS/VersionControl/GitRestClient";
import * as _RMContracts from "ReleaseManagement/Core/Contracts";
import * as _RMConstants from "ReleaseManagement/Core/Constants";
import * as _RMRestClient from "ReleaseManagement/Core/RestClient";
import { BuildHttpClient } from "TFS/Build/RestClient";
import { DefinitionReference, DefinitionQueryOrder } from "TFS/Build/Contracts";
import { usingWithPromise } from "Presentation/Scripts/TFS/TFS.Using";
import { VersionSpec, IGitRefVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { RepositoryContext, RepositoryType } from "VersionControl/Scripts/RepositoryContext";
import { getStringRepoType, convertArtifactUriToPublicUrl } from "VersionControl/Scripts/Utils/Build";

/**
 * A source of data from the status services.
 */
const ReleaseManagementServiceId: string = "0000000D-0000-8888-8000-000000000000";

export class StatusesSource {
    private tfsConnection: VssConnection;
    private isHosted: boolean;
    private readonly hubService = new HubsService();

    constructor(private repositoryContext: RepositoryContext) {
        this.tfsConnection = new VssConnection(repositoryContext.getTfsContext().contextData);
        this.isHosted = repositoryContext.getTfsContext().isHosted;
    }

    public isNewBuildAvailable(): boolean {
        return Boolean(this.hubService.getHubById(CodeHubContributionIds.newBuildEditorContributionId));
    }

    public getBuildDefinitions = (projectId: string): IPromise<DefinitionReference[]> => {
        const buildClient = this.tfsConnection.getHttpClient(BuildHttpClient);

        const repoType = getStringRepoType(this.repositoryContext.getRepositoryType());
        return buildClient.getDefinitions(
            projectId,
            undefined,
            this.repositoryContext.getRepositoryId(),
            repoType,
            DefinitionQueryOrder.LastModifiedDescending);
    }

    public getHasReleaseDefinitions = (projectId: string, buildDefinitionIds: number[]): IPromise<boolean> => {
        /* For anonymous, and public users, do not show the button 

           We are not using permissions here, because in order to query permissions from RM, we would end up provisioning accounts
           which were not previously provisioned. We are querying location service for service definitions and checking the
           status of RM's, and there is a failure in creating auth tokens for it. A non-member will never have enough permissions
           to create release pipelines, so the user claims is a good enough check in this regard. (see # 1268633)
        */
        if (!getUserClaimsService().hasClaim(UserClaims.Member)) {
            return Q.resolve(true);
        }

        return this._hasRMServiceProvisioned().then((provisioned: boolean) => {
            if (provisioned) {
                return this._loadReleaseManagementDataProviders().then(() => {
                    let rdExistsData: any = getService(WebPageDataService).getPageData("ms.vss-releaseManagement-web.release-definitions-exists-data-provider");
                    if (!rdExistsData) {
                        // The data provider couldn't be loaded. Show nothing
                        return Q.resolve(true);
                    }

                    if (rdExistsData && (!rdExistsData.provisioned || !rdExistsData.exists)) {
                        // Both the above 2 cases imply there aren't any RDs
                        return Q.resolve(false);
                    }
                    else {
                        return this._loadReleaseManagemementModulesAndFetchDefinitions(projectId, buildDefinitionIds);
                    }
                },
                    error => true /*In case of an error, don't show the button*/);
            }
            else {
                return Q.resolve(false); // If RM is not provisioned, show the button
            }
        },
            error => true /*In case of an error, don't show the button*/);
    }

    public fetchCreateReleaseDefinitionUrl(): IPromise<string> {
        return Promise.resolve(this._getLinkToNewReleaseDefinitionEditor());
    }

    public getBuildStatusForBranch = (projectId: string, version: string): IPromise<GitStatus[]> => {
        return this.getGitHttpClient().then(gitClient => {
            const branchName = this.getBranchName(projectId, version);

            return gitClient.getRefs(this.repositoryContext.getRepositoryId(), projectId, branchName.replace("refs/", ""), false, true)
                .then(refs => refs && refs.filter(ref => ref.name === branchName))
                .then(refs => this.getFirstOrUndefined(refs))
                .then(ref => ref ? ref.statuses : []);
        });
    }

    private getGitHttpClient(): IPromise<_TFSGitRestClient.GitHttpClient> {
        return usingWithPromise<typeof _TFSGitRestClient>("TFS/VersionControl/GitRestClient")
            .then(tfsGitRestClient => this.tfsConnection.getHttpClient(tfsGitRestClient.GitHttpClient));
    }

    public convertArtifactUriToPublicUrl = (statuses: GitStatus[]): GitStatus[] => {
        return convertArtifactUriToPublicUrl(statuses, this.repositoryContext);
    }

    public openCreateBuildDefinitionWindow(): void {
        const gitRepository = this.repositoryContext ? this.repositoryContext.getRepository() : null;
        const repositoryName = gitRepository ? gitRepository.name : null;
        const repositoryId = gitRepository ? gitRepository.id : null;
        const branchName = gitRepository ? gitRepository.defaultBranch : null;
        const repositoryType = this.repositoryContext ? this.repositoryContext.getRepositoryType() : null;
        const buildEditorUrl = this._getLinkToNewBuildEditor(repositoryName, repositoryId, branchName, repositoryType);
        let newTab = window.open();
        newTab.opener = null;
        newTab.location.href = buildEditorUrl;
    }

    private _getLinkToNewReleaseDefinitionEditor(): string {
        const hubUrl = this._getUrlForHubContribution(CodeHubContributionIds.newReleaseDefinitionEditorContributionId);
        if (hubUrl) {
            const uri = Uri.parse(hubUrl);
            uri.addQueryParam("_a", "action-create-definition");
            uri.addQueryParam("source", "code");
            uri.addQueryParam("definitionId", "0");
            return uri.absoluteUri;
        }
    }

    private _getLinkToNewBuildEditor(repositoryName: string, repositoryId: string, branchName: string, repositoryType: RepositoryType): string {
        const hubUrl = this._getUrlForHubContribution(CodeHubContributionIds.newBuildEditorContributionId);
        if (hubUrl) {
            const uri = Uri.parse(hubUrl);
            uri.addQueryParam("_a", "build-definition-getting-started");
            uri.addQueryParam("source", "code");
            if (repositoryName) {
                uri.addQueryParam("repository", repositoryName);
            }

            if (repositoryId) {
                uri.addQueryParam("repositoryId", repositoryId);
            }

            if (branchName) {
                uri.addQueryParam("branchName", branchName);
            }

            if (repositoryType) {
                uri.addQueryParam("repositoryType", getStringRepoType(repositoryType));
            }
            return uri.absoluteUri;
        }
    }

    private _getUrlForHubContribution(hubContributionId: string): string {
        const hub = this.hubService.getHubById(hubContributionId);
        if (hub) {
            return hub.uri;
        }

        return null;
    }

    private getBranchName(projectId: string, version: string): string {
        if (this.isGit()) {
            const gitRefVersionSpec = VersionSpec.parse(version) as IGitRefVersionSpec;
            return gitRefVersionSpec.toFullName();
        } else {
            return "$/" + projectId;
        }
    }

    private isGit(): boolean {
        return this.repositoryContext.getRepositoryType() === RepositoryType.Git;
    }

    private getFirstOrUndefined<T>(items: T[]): T {
        return items && items.length && items[0];
    }

    private _loadReleaseManagementDataProviders(): IPromise<boolean> {
        const dataProviders: string[] = [
            "ms.vss-releaseManagement-web.release-service-data-external",
            "ms.vss-releaseManagement-web.release-definitions-exists-data-provider"
        ];
        return getService(ExtensionService).getContributions(dataProviders, true, false)
            .then(contributions => true, error => {
                // swallow. There are follow up checks that will prevent issues
            });
    }

    private _loadReleaseManagemementModulesAndFetchDefinitions(projectId: string, buildDefinitionIds: number[]): IPromise<boolean> {
        let modulesLoadDefer = Q.defer<boolean>();
        const modules: string[] = [
            "ReleaseManagement/Core/Contracts",
            "ReleaseManagement/Core/Constants",
            "ReleaseManagement/Core/RestClient"
        ];

        using(modules,
            (Contracts: typeof _RMContracts,
                Constants: typeof _RMConstants,
                Client: typeof _RMRestClient) => {
                let rmClient = this.tfsConnection.getHttpClient(Client.ReleaseHttpClient);

                let buildRDsPromise = this._getHasReleaseDefintionsWithBuildArtifacts(
                    projectId,
                    buildDefinitionIds,
                    rmClient,
                    Contracts,
                    Constants
                );

                let gitRDsPromise = this._getHasReleaseDefintionsWithGitArtifacts(
                    projectId,
                    this.repositoryContext.getRepositoryId(),
                    rmClient,
                    Contracts,
                    Constants
                );

                Q.spread([buildRDsPromise, gitRDsPromise], (hasBuildRDs, hasGitRDs) => {
                    modulesLoadDefer.resolve(hasBuildRDs || hasGitRDs);
                },
                    (error) => {
                        modulesLoadDefer.reject(error);
                    });
            },
            error => modulesLoadDefer.reject(error));

        return modulesLoadDefer.promise;
    }

    private _getHasReleaseDefintionsWithBuildArtifacts(
        projectId: string,
        buildDefinitionIds: number[],
        rmClient: _RMRestClient.ReleaseHttpClient,
        Contracts: typeof _RMContracts,
        Constants: typeof _RMConstants
    ): IPromise<boolean> {
        return rmClient.getReleaseDefinitions(
            projectId,
            null,
            Contracts.ReleaseDefinitionExpands.None,
            Constants.ArtifactTypes.BuildArtifactType,
            buildDefinitionIds.map(id => id.toString(10)).join(","),
            1).then(definitions => !!(definitions && definitions.length > 0));
    }

    private _getHasReleaseDefintionsWithGitArtifacts(
        projectId: string,
        repositoryId: string,
        rmClient: _RMRestClient.ReleaseHttpClient,
        Contracts: typeof _RMContracts,
        Constants: typeof _RMConstants
    ): IPromise<boolean> {
        return rmClient.getReleaseDefinitions(
            projectId,
            null,
            Contracts.ReleaseDefinitionExpands.None,
            Constants.ArtifactTypes.GitArtifactType,
            format("{0}:{1}", projectId, repositoryId),
            1).then(definitions => !!(definitions && definitions.length > 0));
    }

    // The same code exists in both RM, and build typescript code.
    // We should move it to a common place, and looks like framework is a good place
    private _hasRMServiceProvisioned(): IPromise<boolean> {
        var deferred: Q.Deferred<boolean> = Q.defer<boolean>();

        // OnPrem, RMO is always provisioned
        if (!this.isHosted) {
            deferred.resolve(true);
        }
        else {
            let modulesToLoad: string[] = [
                "VSS/Locations/Contracts",
                "VSS/Locations/RestClient",
                "VSS/Authentication/Contracts",
                "VSS/Authentication/RestClient",
                "VSS/Authentication/Services"
            ];

            using(modulesToLoad,
                (LocationContracts: typeof _LocationContracts,
                    LocationsRestClient: typeof _LocationsRestClient,
                    Authentication_Contracts: typeof _Authentication_Contracts,
                    Authentication_RestClient: typeof _Authentication_RestClient,
                    Authentication_Services: typeof _Authentication_Services) => {

                    let rmServiceProvisioned: boolean = false;
                    let spsLocation = getCachedServiceLocation(ServiceInstanceTypes.SPS, ContextHostType.ProjectCollection);
                    let locationClient: _LocationsRestClient.LocationsHttpClient3 = new LocationsRestClient.LocationsHttpClient3(spsLocation);

                    let authClient = this.tfsConnection.getHttpClient(Authentication_RestClient.AuthenticationHttpClient)

                    let tokenToCreate = <_Authentication_Contracts.WebSessionToken>{
                        appId: EmptyGuidString,
                        force: false,
                        name: EmptyGuidString,
                        tokenType: Authentication_Contracts.DelegatedAppTokenType.Session,
                        namedTokenId: null,
                        validTo: null,
                        token: null
                    };

                    let tokenResult: Q.Deferred<string> = Q.defer<string>();
                    let getTokenPromise = tokenResult.promise.then((token: string) => {
                        locationClient.authTokenManager = new Authentication_Services.BearerAuthTokenManager(token);
                    });

                    authClient.createSessionToken(tokenToCreate).then((createdToken: _Authentication_Contracts.WebSessionToken) => {
                        tokenResult.resolve(createdToken.token);
                    }, (error) => {
                        tokenResult.reject(error);
                    });

                    locationClient._setInitializationPromise(getTokenPromise);

                    let locationClientPromise: Q.Promise<_LocationContracts.ServiceDefinition[]> = <Q.Promise<_LocationContracts.ServiceDefinition[]>>locationClient.getServiceDefinitions("LocationService2");
                    locationClientPromise.then((serviceDefinitions: _LocationContracts.ServiceDefinition[]) => {
                        // Absence of 'status' field or value of Active indicates service is provisioned
                        rmServiceProvisioned = !!serviceDefinitions
                            && serviceDefinitions.length > 0
                            && serviceDefinitions.some(definition => (equals(definition.identifier, ReleaseManagementServiceId, true)
                                && (definition.status == null || definition.status === LocationContracts.ServiceStatus.Active)));
                    }).fin(() => {
                        // Error is not handled, rmServiceProvisioned is false by default, so returning the same
                        deferred.resolve(rmServiceProvisioned);
                    });
                },
                error => deferred.reject(error));
        }

        return deferred.promise;
    }
}
