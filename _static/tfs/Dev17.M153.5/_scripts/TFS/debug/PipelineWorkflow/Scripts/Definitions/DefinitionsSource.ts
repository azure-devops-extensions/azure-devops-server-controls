/**
 * @brief Source for All Definitions
 */
import * as Q from "q";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";
import { ServiceClientManager } from "DistributedTaskControls/Common/Service/ServiceClientManager";

import { Favorite, FavoriteCreateParameters } from "Favorites/Contracts";
import * as Favorites_RestClient from "Favorites/RestClient";
import { canUseFavorites } from "Favorites/FavoritesService";

import { AllDefinitionsContentKeys, AllDefinitionsFavoriteConstants, ReleasesHubDataProviderKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { ReleasesHubServiceDataHelper, IActiveDefinitionReference } from "PipelineWorkflow/Scripts/Definitions/ReleasesHubServiceData";
import { IReleaseDefinitionsResult, ICancelableReleaseDefinitionsResult, PipelineDefinitionFolder, PipelineDefinition, PipelineRelease, PipelineReference, IDeploymentResult, ReleaseQueryOrder, ReleaseDeploymentStatus, ReleaseOperationStatus, ReleaseDeployment } from "PipelineWorkflow/Scripts/Common/Types";
import { IDeployServiceClient } from "PipelineWorkflow/Scripts/ServiceClients/IDeployServiceClient";
import { DeployServiceClient } from "PipelineWorkflow/Scripts/ServiceClients/DeployServiceClient";
import { ensureSingleDelayedCall } from "PipelineWorkflow/Scripts/Definitions/Utils/FolderUtils";
import { ReleaseManagementSourceBase } from "PipelineWorkflow/Scripts/Common/Sources/ReleaseManagementSourceBase";

import * as RMContracts from "ReleaseManagement/Core/Contracts";
import { ReleaseManagementService } from "ReleasePipeline/Scripts/Clients/ReleaseClient";

import * as VssContext from "VSS/Context";
import { ExtensionService, WebPageDataService } from "VSS/Contributions/Services";
import { getService, VssConnection } from "VSS/Service";
import * as Utils_Array from "VSS/Utils/Array";
import { Cancelable } from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as VSS_WebApi_Constants from "VSS/WebApi/Constants";

export interface IReleasesHubActiveDefinitionsData {
    favorites: Favorite[];
    activeDefinitions: IActiveDefinitionReference[];
    recentDefinitions: IActiveDefinitionReference[];
}

export interface IDefinitionSearchParameters {
    searchText: string;
    expands: RMContracts.ReleaseDefinitionExpands;
}

let ReleasesHubActiveDefinitionsTypeInfo = {
    WebPageData: {
        fields: null as any
    },
    ActiveDefinitions: {
        fields: {
            lastDeployment: {
                typeInfo: RMContracts.TypeInfo.Deployment
            },
            pendingApproval: {
                typeInfo: RMContracts.TypeInfo.ReleaseApproval
            },
            releasesList: {
                typeInfo: RMContracts.TypeInfo.Release,
                isArray: true
            }
        }
    }
};

ReleasesHubActiveDefinitionsTypeInfo.WebPageData.fields = {
    favorites: {
        isArray: true
    },
    activeDefinitions: {
        isArray: true,
        typeInfo: ReleasesHubActiveDefinitionsTypeInfo.ActiveDefinitions
    },
};

export class DefinitionsSource extends ReleaseManagementSourceBase {

    constructor() {
        super();
        this._searchHandler = ensureSingleDelayedCall<IDefinitionSearchParameters, ICancelableReleaseDefinitionsResult>((searchParams, deferred) => this._performServerSearch(searchParams, deferred));
    }

    public static getKey(): string {
        return "DefinitionsSource";
    }

    public static instance(): DefinitionsSource {
        return SourceManager.getSource(DefinitionsSource);
    }

    public hasMoreRootFolderDefinitions(): boolean {
        let continuationToken: string = ReleasesHubServiceDataHelper.getContinuationToken();
        if (continuationToken) {
            return true;
        }

        return false;
    }

    public getRootFolderReleaseDefinitions(fetchNextBatch: boolean): IPromise<IReleaseDefinitionsResult> {
        let preFetchedDefinitionsResult = ReleasesHubServiceDataHelper.getReleaseDefinitionResult();
        let continuationToken: string = ReleasesHubServiceDataHelper.getContinuationToken();

        if (fetchNextBatch && continuationToken) {
            return this.getClient().getReleaseDefinitions(null, RMContracts.ReleaseDefinitionExpands.LastRelease, this._rootFolderDefinitionsBatchSize, continuationToken, RMContracts.ReleaseDefinitionQueryOrder.NameAscending, null, null, AllDefinitionsContentKeys.PathSeparator).then((definitions: IReleaseDefinitionsResult) => {
                preFetchedDefinitionsResult.definitions = preFetchedDefinitionsResult.definitions.concat(definitions.definitions);
                ReleasesHubServiceDataHelper.updateReleaseDefinitions(preFetchedDefinitionsResult.definitions);
                ReleasesHubServiceDataHelper.updateContinuationToken(definitions.continuationToken);
                return preFetchedDefinitionsResult;
            });
        }
        else if (!preFetchedDefinitionsResult.definitions) {
            return this.getClient().getReleaseDefinitions(null, RMContracts.ReleaseDefinitionExpands.LastRelease | RMContracts.ReleaseDefinitionExpands.Environments, this._rootFolderDefinitionsBatchSize, continuationToken, RMContracts.ReleaseDefinitionQueryOrder.NameAscending, null, null, AllDefinitionsContentKeys.PathSeparator).then((definitionsResult: IReleaseDefinitionsResult) => {
                ReleasesHubServiceDataHelper.updateReleaseDefinitions(definitionsResult.definitions);
                ReleasesHubServiceDataHelper.updateContinuationToken(definitionsResult.continuationToken);
                return definitionsResult;
            });
        }
        else {
            return Q.resolve(preFetchedDefinitionsResult);
        }

    }

    public getFolderReleaseDefinitions(folderPath: string): IPromise<IReleaseDefinitionsResult> {
        let preFetchedDefinitionsResult = ReleasesHubServiceDataHelper.getReleaseDefinitionResult();
        let definitionWithMatchingPath = Utils_Array.first(preFetchedDefinitionsResult.definitions, def => Utils_String.localeIgnoreCaseComparer(def.path, folderPath) === 0);
        if (definitionWithMatchingPath) {
            return Q.resolve(preFetchedDefinitionsResult);
        }
        else if (!preFetchedDefinitionsResult.definitions) {
            return this.getClient().getReleaseDefinitions(null, RMContracts.ReleaseDefinitionExpands.LastRelease, this._subFolderDefinitionsBatchSize, null, RMContracts.ReleaseDefinitionQueryOrder.NameAscending, null, null, folderPath).then((definitionsResult: IReleaseDefinitionsResult) => {
                ReleasesHubServiceDataHelper.updateReleaseDefinitions(definitionsResult.definitions);
                return definitionsResult;
            });
        }
        else {
            // We do not support automatic scroll for definitions inside subfolders,
            // Hence for expand folder, we fetch the definitions from server limited by a large batch size (= 200)
            return this.getClient().getReleaseDefinitions(null, RMContracts.ReleaseDefinitionExpands.LastRelease, this._subFolderDefinitionsBatchSize, null, RMContracts.ReleaseDefinitionQueryOrder.NameAscending, null, null, folderPath).then((definitions: IReleaseDefinitionsResult) => {
                preFetchedDefinitionsResult.definitions = preFetchedDefinitionsResult.definitions.concat(definitions.definitions);
                ReleasesHubServiceDataHelper.updateReleaseDefinitions(preFetchedDefinitionsResult.definitions);
                return preFetchedDefinitionsResult;
            });
        }
    }

    public searchReleaseDefinitions(searchText: string, expands: RMContracts.ReleaseDefinitionExpands): IPromise<IReleaseDefinitionsResult> {
        // If we are starting a new search cancel any existing one that may be outstanding
        this.cancelActiveSearchRequests();

        // For search definitions, we fetch the definitions from server
        return this._performSearch(searchText, expands);
    }

    public cancelActiveSearchRequests(): void {
        if (this._activeSearchCancelable) {
            this._activeSearchCancelable.cancel();
        }
    }

    public getReleaseDefinitionsByIds(releaseDefinitionIds: number[]): IPromise<PipelineDefinition[]> {
        let definitionIdFilter = Utils_String.empty;

        if (releaseDefinitionIds && releaseDefinitionIds.length > 0) {
            definitionIdFilter = releaseDefinitionIds.join(",");
        }

        return this.getClient().getReleaseDefinitions(null, null, null, null, RMContracts.ReleaseDefinitionQueryOrder.NameAscending, null, definitionIdFilter)
            .then((response: IReleaseDefinitionsResult) => {
                return response.definitions;
            });
    }

    public getFavorites(): IPromise<Favorite[]> {
        if (!canUseFavorites()) {
            return Q.resolve([]);
        }
        else {
            const favorites: Favorite[] = ReleasesHubServiceDataHelper.getFavorites();
            if (favorites) {
                return Q.resolve(favorites);
            }
            else {
                return this._getFavoritesClient().getFavorites(AllDefinitionsFavoriteConstants.FavoriteType, AllDefinitionsFavoriteConstants.FavoriteArtifactScope, VssContext.getDefaultWebContext().project.id)
                    .then((favorites: Favorite[]) => {
                        ReleasesHubServiceDataHelper.setFavorites(favorites);
                        return favorites;
                    });
            }
        }
    }

    public createFavorite(definitionId: number, name: string): IPromise<Favorite> {
        if (!canUseFavorites()) {
            return Q.resolve(null);
        }

        const favoriteParams = this._createNewFavoriteParams(definitionId, name);
        return this._getFavoritesClient().createFavorite(favoriteParams).then((favorite: Favorite) => {
            if (favorite) {
                ReleasesHubServiceDataHelper.addFavorite(favorite);

                let activeDefinitions: IActiveDefinitionReference[] = ReleasesHubServiceDataHelper.getActiveDefinitions();

                // If there are no active items in ReleasesHubServiceData, then we need not do anything here,
                // as it means we have not yet landed on 'Active' page, so the initial data provider call will take care to fetch favorites
                if (activeDefinitions) {
                    let activeDefinitionToUpdate: IActiveDefinitionReference = Utils_Array.first(activeDefinitions, def => def.id === definitionId);
                    // If the favorited Rd is already present in the active definitions, then just update it
                    // If the favorited Rd is not found in current set of active definitions, which means we are favoriting from 'All Definitions',
                    // then need not make api call for last deployment or update cached data, as we will make a call to data provider on tab change
                    if (activeDefinitionToUpdate) {
                        Utils_Array.remove(activeDefinitions, activeDefinitionToUpdate);
                        activeDefinitionToUpdate.favoriteId = favorite.id;
                        activeDefinitions.push(activeDefinitionToUpdate);
                        ReleasesHubServiceDataHelper.setActiveDefinitions(activeDefinitions);
                    }
                }
                return favorite;
            }
        });
    }

    public deleteFavorite(favoriteId: string, definitionId: number): IPromise<void> {
        if (!canUseFavorites()) {
            return Q.resolve();
        }

        return this._getFavoritesClient().deleteFavoriteById(
            favoriteId,
            AllDefinitionsFavoriteConstants.FavoriteType,
            AllDefinitionsFavoriteConstants.FavoriteArtifactScope,
            VssContext.getDefaultWebContext().project.id).then(() => {
                ReleasesHubServiceDataHelper.deleteFavorite(favoriteId, definitionId);
                let activeDefinitionItems: IActiveDefinitionReference[] = ReleasesHubServiceDataHelper.getActiveDefinitions();
                if (activeDefinitionItems) {
                    let activeDefinitionToUpdate: IActiveDefinitionReference = Utils_Array.first(activeDefinitionItems, def => def.id === definitionId);
                    if (activeDefinitionToUpdate) {
                        Utils_Array.remove(activeDefinitionItems, activeDefinitionToUpdate);
                        activeDefinitionToUpdate.favoriteId = null;
                        // Not removing the recently unfavorited as it might have a pending approval/ recent deployment and hence needs to be shown in Active;
                        // If it's not in any of these categories, it will automatically be removed on refresh
                        activeDefinitionItems.push(activeDefinitionToUpdate);
                        ReleasesHubServiceDataHelper.setActiveDefinitions(activeDefinitionItems);
                    }
                }
            });
    }

    public getActiveDefinitions(): IPromise<IReleasesHubActiveDefinitionsData> {
        if (this._fetchCachedActiveDefinitionsData) {
            const favorites = ReleasesHubServiceDataHelper.getFavorites();
            const activeDefinitions = ReleasesHubServiceDataHelper.getActiveDefinitions();
            const recentDefinitions = ReleasesHubServiceDataHelper.getRecentDefinitions();

            this._fetchCachedActiveDefinitionsData = false;
            if (activeDefinitions || recentDefinitions) {
                return Q.resolve({
                    favorites: favorites,
                    activeDefinitions: activeDefinitions,
                    recentDefinitions: recentDefinitions
                });
            }
        }

        // Fetch Active page data from data provider on tab change
        const webPageDataService = getService(WebPageDataService);
        return webPageDataService.invalidateCachedProviderData(ReleasesHubDataProviderKeys.ACTIVE_DEFINITIONS_DATA_PROVIDER, true).then(() => {
            let activeDefinitionsData = webPageDataService.getPageData<IReleasesHubActiveDefinitionsData>(
                ReleasesHubDataProviderKeys.ACTIVE_DEFINITIONS_DATA_PROVIDER,
                ReleasesHubActiveDefinitionsTypeInfo.WebPageData);
            if (activeDefinitionsData) {
                if (activeDefinitionsData.activeDefinitions) {
                    ReleasesHubServiceDataHelper.setActiveDefinitions(activeDefinitionsData.activeDefinitions);
                    ReleasesHubServiceDataHelper.setFavorites(activeDefinitionsData.favorites);
                }

                if (activeDefinitionsData.recentDefinitions) {
                    ReleasesHubServiceDataHelper.setRecentDefinitions(activeDefinitionsData.recentDefinitions);
                }
                return Q.resolve(activeDefinitionsData);
            }
            else {
                return Q.resolve({
                    favorites: [],
                    activeDefinitions: [],
                    recentDefinitions: []
                });
            }
        });
    }

    public resetFetchCachedActiveDefinitionsData() {
        this._fetchCachedActiveDefinitionsData = true;
    }

    public getLastDeployment(rdId: number): IPromise<ReleaseDeployment> {
        const lastDeployment: ReleaseDeployment = ReleasesHubServiceDataHelper.getLastDeploymentForDefinition(rdId);
        if (lastDeployment) {
            return Q.resolve(lastDeployment);
        }

        return this.getClient().getDeployments(rdId, null, null, ReleaseDeploymentStatus.All, ReleaseOperationStatus.All, ReleaseQueryOrder.Descending, 1).then((response: IDeploymentResult) => {
            if (response && response.deployments && response.deployments.length === 1) {
                ReleasesHubServiceDataHelper.setLastDeploymentForDefinition(response.deployments[0]);
                return response.deployments[0];
            }
            else {
                return Q.resolve(null);
            }
        });
    }

    protected disposeInternal(): void {
        if (this._activeSearchCancelable) {
            this._activeSearchCancelable.cancel();
        }

        this._searchHandler = null;
        super.disposeInternal();
    }

    protected _createNewFavoriteParams(definitionId: number, definitionName: string): FavoriteCreateParameters {
        const favorite = {
            artifactId: definitionId.toString(),
            artifactName: definitionName,
            artifactProperties: undefined,
            artifactType: AllDefinitionsFavoriteConstants.FavoriteType,
            artifactScope: {
                id: VssContext.getDefaultWebContext().project.id,
                name: undefined,
                type: AllDefinitionsFavoriteConstants.FavoriteArtifactScope
            },
            owner: undefined
        } as FavoriteCreateParameters;
        return favorite;
    }

    private _getFavoritesClient(): Favorites_RestClient.FavoriteHttpClient {
        if (!this._favoritesClient) {
            const isHosted: boolean = VssContext.getPageContext().webAccessConfiguration.isHosted;
            const webContext = VssContext.getDefaultWebContext();
            const connection = new VssConnection(webContext);
            if (isHosted) {
                this._favoritesClient = connection.getHttpClient<Favorites_RestClient.FavoriteHttpClient>(Favorites_RestClient.FavoriteHttpClient, ReleaseManagementService.serviceInstanceId);
            }
            else {
                this._favoritesClient = connection.getHttpClient<Favorites_RestClient.FavoriteHttpClient>(Favorites_RestClient.FavoriteHttpClient, VSS_WebApi_Constants.ServiceInstanceTypes.TFS);
            }
        }

        return this._favoritesClient;
    }

    private _performSearch(searchText: string, expands: RMContracts.ReleaseDefinitionExpands): IPromise<IReleaseDefinitionsResult> {
        let deferredWrapper = Q.defer<IReleaseDefinitionsResult>();
        const cancelableDeferred = Q.defer<ICancelableReleaseDefinitionsResult>();

        let searchParams: IDefinitionSearchParameters = {
            searchText: searchText,
            expands: expands
        };

        if (this._searchHandler) {
            this._searchHandler(searchParams, cancelableDeferred);
        }

        cancelableDeferred.promise.done((searchResult) => {
            // Only invoke search finished if it was not cancelled and
            // we are in the inProgress state
            if (!searchResult.isCanceled) {
                deferredWrapper.resolve(searchResult.result);
            }
        }, (error) => {
            // Request failed, just ignore
        });

        return deferredWrapper.promise;
    }

    /**
     * The implementation of the search which is used in the throttled delegate
     */
    private _performServerSearch(searchParams: IDefinitionSearchParameters, deferred: Q.Deferred<ICancelableReleaseDefinitionsResult>): void {
        const cancelable = new Cancelable(this);
        this._activeSearchCancelable = cancelable;

        this.getClient().getReleaseDefinitions(searchParams.searchText, searchParams.expands).then((result) => {
            deferred.resolve({ isCanceled: cancelable.canceled, result: result });
        }, deferred.reject);
    }

    public getReleaseDefinitionsFolders(): IPromise<PipelineDefinitionFolder[]> {
        let preFetchedFolders = ReleasesHubServiceDataHelper.getFolders();
        if (preFetchedFolders) {
            return Q.resolve(preFetchedFolders);
        }
        else {
            return this.getClient().getReleaseDefinitionsFolders().then((folders: PipelineDefinitionFolder[]) => {
                ReleasesHubServiceDataHelper.setFolders(folders);
                return folders;
            });
        }
    }

    public createFolder(folder: PipelineDefinitionFolder, path: string): IPromise<PipelineDefinitionFolder> {
        return this.getClient().createFolder(folder, path).then((folder: PipelineDefinitionFolder) => {
            if (folder) {
                ReleasesHubServiceDataHelper.addFolder(folder, path);
                return folder;
            }
        });
    }

    public updateFolder(folder: PipelineDefinitionFolder, oldFolderPath: string): IPromise<PipelineDefinitionFolder> {
        return this.getClient().updateFolder(folder, oldFolderPath).then((folder: PipelineDefinitionFolder) => {
            if (folder) {
                ReleasesHubServiceDataHelper.updateDataOnRenameFolder(oldFolderPath, folder.path);
                return folder;
            }
        });
    }

    public updateDefinitionNameAndPath(id: number, path: string, name: string): IPromise<PipelineDefinition> {
        return this.getClient().getDefinition(id).then((definition: PipelineDefinition) => {
            if (definition) {
                definition.name = name;
                definition.path = path;
                return this.getClient().saveDefinition(definition).then((updatedDefinition: PipelineDefinition) => {
                    // Since we always need show last release reference we need to query RD with last release reference
                    return this.updateDefinitionLastReleaseReference(definition.id).then((updatedDefinitionWithLastReleaseReference: PipelineDefinition) => {
                        return updatedDefinitionWithLastReleaseReference;
                    });
                });
            }
        });
    }

    public updateDefinitionPath(id: number, path: string): IPromise<PipelineDefinition> {
        return this.getClient().getDefinition(id).then((definition: PipelineDefinition) => {
            if (definition) {
                definition.path = path;
                return this.getClient().saveDefinition(definition).then((updatedDefinition: PipelineDefinition) => {
                    // Since we always need show last release reference we need to query RD with last release reference
                    return this.updateDefinitionLastReleaseReference(definition.id).then((updatedDefinitionWithLastReleaseReference: PipelineDefinition) => {
                        return updatedDefinitionWithLastReleaseReference;
                    });
                });
            }
        });
    }

    public updateDefinitionLastReleaseReference(id: number): IPromise<PipelineDefinition> {
        // Using definitionIdFilter in getReleaseDefinitions to fetch the updated definition because getReleaseDefinition does not have the support to pass 'expands' parameter which provides lastRelease
        return this.getClient().getReleaseDefinitions(null, RMContracts.ReleaseDefinitionExpands.LastRelease, 1, null, null, null, Utils_String.numberToString(id)).then((definitionResult: IReleaseDefinitionsResult) => {
            if (definitionResult && definitionResult.definitions) {
                ReleasesHubServiceDataHelper.updateDefinition(definitionResult.definitions[0]);
                return definitionResult.definitions[0];
            }
        });
    }

    public deleteDefinition(id: number, comment: string, forceDelete: boolean): IPromise<any> {
        return this.getClient().deleteDefinition(id, comment, forceDelete).then(() => {
            ReleasesHubServiceDataHelper.deleteDefinition(id);
        });
    }

    public getDefinition(id: number): IPromise<PipelineDefinition> {
        return this.getClient().getDefinition(id);
    }

    public deleteFolder(path: string): IPromise<void> {
        return this.getClient().deleteFolder(path).then(() => {
            ReleasesHubServiceDataHelper.updateDataOnDeleteFolder(path);
        });
    }

    public getArtifactSourceBranches(definitionId: number): IPromise<string[]> {
        return this.getClient().getArtifactSourceBranches(definitionId);
    }

    private _searchHandler: (searchParams: IDefinitionSearchParameters, deferred: Q.Deferred<ICancelableReleaseDefinitionsResult>) => void;

    private _activeSearchCancelable: Cancelable;

    private _rootFolderDefinitionsBatchSize: number = 25;
    private _subFolderDefinitionsBatchSize: number = 200;
    private _favoritesClient: Favorites_RestClient.FavoriteHttpClient;
    private _fetchCachedActiveDefinitionsData: boolean = true;
}