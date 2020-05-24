import Q = require("q");

import { Store } from "VSS/Flux/Store";

import { ContributionKeys } from "Build/Scenarios/CI/Constants";
import { RealtimeEvents } from "Build/Scenarios/CI/SignalRConstants";
import {
    ContributionActionCreator,
    ContributionActionHub,
    DataParser
} from "Build/Scripts/CI/Actions/Contribution";
import {
    BuildsActionCreator,
    BuildsActionHub,
    IBuildData,
    IDefinitionFavoritePair
} from "Build/Scripts/CI/Actions/Builds";
import {
    CINavigationService,
    getCINavigationService
} from "Build/Scripts/CI/Navigation";
import { CIDataProviderKeys } from "Build/Scripts/Generated/TFS.Build.Plugins";
import { DefinitionUpdatedPayload } from "Build/Scripts/Actions/Definitions";

import {
    BuildDefinition,
    BuildUpdatedEvent,
    Build,
    BuildStatus,
    DefinitionQuality
} from "TFS/Build/Contracts";

import {
    IActiveDefinitionsStoreOptions,
    IActiveDefinitionsProviderData,
    IActiveDefinitionData
} from "./ActiveDefinitions.types";

import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import VSS = require("VSS/VSS");
import { FavoriteStoreNames } from "Build/Scripts/Constants";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Favorites = require("Build/Scripts/Favorites");
import { getDefinitionUri } from "Build.Common/Scripts/DefinitionReference";
import Artifact_Services = require("VSS/Artifacts/Services");
import Utils_Array = require("VSS/Utils/Array");

export namespace DefinitionCategory {
    export const Featured = 0;
    export const Draft = 1;
    export const Favorite = 2;
    export const Recent = 3;
}

export class ActiveDefinitionsStore extends Store {
    private _contributionActionCreator: ContributionActionCreator<IActiveDefinitionsProviderData>;
    private _contributionActionHub: ContributionActionHub<IActiveDefinitionsProviderData>;

    private _buildsActionCreator: BuildsActionCreator;
    private _buildsActionHub: BuildsActionHub;

    private _navigationService: CINavigationService;

    private _definitions: BuildDefinition[] = [];
    private _favorites: IKeyValuePair<BuildDefinition, string[]>[] = [];
    private _groupedDefinitions: IActiveDefinitionData[] = null;
    private _favoriteIds: number[] = [];
    private _builds: Build[] = [];
    private _currentDef: number = -1;
    private _selectedDefinition: BuildDefinition = null;
    private _myFavoriteStore: IPromise<TFS_OM_Common.FavoriteStore>;

    constructor(options: IActiveDefinitionsStoreOptions) {
        super();
        this._contributionActionHub = options.contributionHub || new ContributionActionHub();
        this._contributionActionCreator = new ContributionActionCreator({
            actionHub: this._contributionActionHub,
            dataParser: this._dataParser
        });

        this._buildsActionHub = options.buildsActionHub || new BuildsActionHub();
        this._buildsActionCreator = options.buildsActionCreator || new BuildsActionCreator({
            actionHub: this._buildsActionHub
        });

        this._contributionActionHub.contributionDataAvailable.addListener(this._contributionDataAvailable);
        this._buildsActionHub.buildsAvailable.addListener(this._buildsAvailable);
        this._buildsActionHub.buildDeleted.addListener(this._buildDeleted);
        this._buildsActionHub.definitionDeleted.addListener(this._definitionDeleted);
        this._buildsActionHub.definitionSelected.addListener(this._definitionSelected);
        this._buildsActionHub.definitionUpdated.addListener(this._definitionUpdated);
        this._buildsActionHub.definitionAddedToFavorites.addListener(this._definitionAddedToFavorites);
        this._buildsActionHub.definitionRemovedFromFavorites.addListener(this._definitionRemovedFromFavorites);

        this._navigationService = options.navigationService || getCINavigationService();

        options.signalRActionCreator.subscribeToEvents(this._navigationService.getProjectId(), [RealtimeEvents.BuildUpdate]);

        options.signalRActionHub.getEventPayloadAvailableAction<BuildUpdatedEvent>(RealtimeEvents.BuildUpdate).addListener(this._onBuildUpdateEvent);
    }

    public fetchData(refresh?: boolean, postActionCallback?: () => any) {
        this._contributionActionCreator.fetchContributionData(ContributionKeys.CIHubDataProviderId, undefined, refresh, postActionCallback);
    }

    public dispose() {
        this._contributionActionHub.contributionDataAvailable.removeListener(this._contributionDataAvailable);
        this._buildsActionHub.buildsAvailable.removeListener(this._buildsAvailable);
        this._buildsActionHub.buildDeleted.removeListener(this._buildDeleted);
        this._buildsActionHub.definitionDeleted.removeListener(this._definitionDeleted);
        this._buildsActionHub.definitionSelected.removeListener(this._definitionSelected);
        this._buildsActionHub.definitionUpdated.removeListener(this._definitionUpdated);
        this._buildsActionHub.definitionAddedToFavorites.removeListener(this._definitionAddedToFavorites);
        this._buildsActionHub.definitionRemovedFromFavorites.removeListener(this._definitionRemovedFromFavorites);
    }

    public getDefinitions(): IActiveDefinitionData[] {
        this._groupDefinitions();
        return this._groupedDefinitions;
    }

    private _groupDefinitions() {
        let data: IActiveDefinitionData[] = [];
        this._definitions.forEach((definition: BuildDefinition, index: number) => {
            let favorite = false;
            for (let i = 0; i < this._favoriteIds.length; i++) {
                if (definition.id === this._favoriteIds[i]) {
                    favorite = true;
                    break;
                }
            }

            let category = DefinitionCategory.Recent;
            if (definition.quality === DefinitionQuality.Draft) {
                category = DefinitionCategory.Draft;
            }
            else if (favorite) {
                category = DefinitionCategory.Favorite;
            }

            data.push({
                definition: definition,
                isFavorite: favorite,
                category: category
            } as IActiveDefinitionData);
        });

        data.sort((a: IActiveDefinitionData, b: IActiveDefinitionData) => {
            return a.category - b.category;
        });

        this._groupedDefinitions = data;
    }

    public getFavorites() {
        return this._favorites;
    }

    public getSelectedDefinition(): BuildDefinition {
        return this._selectedDefinition;
    }

    public getBuilds(definitionId: number): Build[] {
        if (this._currentDef === definitionId) {
            return this._builds ? this._builds.slice() : null;
        }
        else {
            return null;
        }
    }

    private fetchBuilds(definitionId: number): Build[] {
        if (this._currentDef === definitionId) {
            return this._builds ? this._builds.slice() : null;
        }
        else {
            this._currentDef = definitionId;
            this._builds = null;
            this.emitChanged();

            this._buildsActionCreator.fetchBuilds(definitionId);

            return null;
        }
    }

    private _dataParser: DataParser<IActiveDefinitionsProviderData> = (data) => {
        let providerData: IActiveDefinitionsProviderData = {
            definitions: [],
            favorites: []
        };

        if (data) {
            providerData.definitions = (data.definitions || []) as BuildDefinition[];
            providerData.favorites = (data.favorites || null) as IKeyValuePair<BuildDefinition, string[]>[];
        }

        return providerData;
    }

    private _onBuildUpdateEvent = (event: BuildUpdatedEvent) => {
        if (event.build && event.build.definition) {
            if (event.build.definition.id === this._currentDef) {
                let found: boolean = false;
                for (let i = 0; i < this._builds.length; i++) {
                    if (event.build.id === this._builds[i].id) {
                        this._builds[i] = event.build;
                        found = true;
                        break;
                    }
                }
                if (found) {
                    this.emitChanged();
                }
                else {
                    // For now add newer builds to the top of the list, eventually show a new builds notice instead
                    if (event.build.id > this._builds[0].id) {
                        this._builds.splice(0, 0, event.build);
                    }
                }
            }
            this._definitions.forEach((definition: BuildDefinition) => {
                if (definition.id === event.build.definition.id) {
                    if (event.build.status === BuildStatus.Completed && (!definition.latestCompletedBuild || event.build.finishTime > definition.latestCompletedBuild.finishTime)) {
                        definition.latestCompletedBuild = event.build;
                        this.emitChanged();
                    }
                }
            });
        }
    }

    private _contributionDataAvailable = (data: IActiveDefinitionsProviderData) => {
        if (data) {
            this._definitions = data.definitions || [];
            this._favorites = data.favorites || [];
            this._favoriteIds = this._favorites.map((favorite: IKeyValuePair<BuildDefinition, string[]>) => {
                return favorite.key.id;
            });

            this._definitions = this._definitions.concat(
                this._favorites.map((favorite: IKeyValuePair<BuildDefinition, string[]>) => {
                    return favorite.key;
                }));
        }
        if (this._definitions.length > 0) {
            this._groupDefinitions();
            this._selectedDefinition = this._groupedDefinitions[0].definition;
            this.fetchBuilds(this._selectedDefinition.id);
        }

        this.emitChanged();
    }

    private _definitionSelected = (selectedDefinition: BuildDefinition) => {
        this._selectedDefinition = selectedDefinition;
        this.fetchBuilds(this._selectedDefinition.id);
        this.emitChanged();
    }

    private _buildsAvailable = (data: IBuildData) => {
        if (data && data.definitionId === this._currentDef) {
            this._builds = data.builds;
        }
        this.emitChanged();
    }

    private _buildDeleted = (deletedBuild: Build) => {
        if (deletedBuild) {
            let found: boolean = false;
            for (let i = 0; i < this._builds.length; i++) {
                if (deletedBuild.id === this._builds[i].id) {
                    this._builds.splice(i, 1);
                    found = true;
                    break;
                }
            }
            if (found) {
                this.emitChanged();
            }
        }
    }

    private _definitionDeleted = (deletedDefinition: BuildDefinition) => {
        if (deletedDefinition) {
            let found: boolean = false;
            for (let i = 0; i < this._definitions.length; i++) {
                if (deletedDefinition.id === this._definitions[i].id) {
                    this._definitions.splice(i, 1);
                    found = true;
                    break;
                }
            }
            if (this._selectedDefinition && this._selectedDefinition.id === deletedDefinition.id) {
                this._selectedDefinition = null;
                if (this._definitions.length > 0) {
                    this._groupDefinitions();
                    this._selectedDefinition = this._groupedDefinitions[0].definition;
                    this.fetchBuilds(this._selectedDefinition.id);
                }
            }
            if (found) {
                this.emitChanged();
            }
        }
    }

    private _definitionUpdated = (payload: DefinitionUpdatedPayload) => {
        if (payload && payload.definition) {
            let found: boolean = false;
            for (let i = 0; i < this._definitions.length; i++) {
                if (payload.definition.id === this._definitions[i].id) {
                    let latestBuild = payload.definition.latestCompletedBuild;
                    if (latestBuild == null) {
                        latestBuild = this._definitions[i].latestCompletedBuild;
                    }
                    this._definitions[i] = payload.definition;
                    this._definitions[i].latestCompletedBuild = latestBuild;
                    found = true;
                    break;
                }
            }
            if (found) {
                this.emitChanged();
            }
        }
    }

    private _definitionAddedToFavorites = (payload: IDefinitionFavoritePair) => {
        // Disabling interacting with favorites for now until team favorites work

        /*this._getMyFavoritesStore().then((store) => {
            Favorites.addDefinitionToFavoriteStore(payload.definition, store).then(() => {
                // TODO: Use an action here...
                this._favoriteIds.push(payload.definition.id);
                this.emitChanged();
            }, VSS.handleError);
        }, VSS.handleError);*/
    }

    private _definitionRemovedFromFavorites = (payload: IDefinitionFavoritePair) => {
        // Disabling interacting with favorites for now until team favorites work

        /*this._getMyFavoritesStore().then((store) => {
            var uri = getDefinitionUri(payload.definition);
            var favoriteItem = Favorites.getFavoriteItemFromStore(uri, store);
            if (favoriteItem) {
                Favorites.removeFavoriteItemFromStore(favoriteItem).then(() => {
                    // TODO: Use an action here...
                    for (let i = 0; i < this._favoriteIds.length; i++) {
                        if (this._favoriteIds[i] === payload.definition.id) {
                            this._favoriteIds.splice(i, 1);
                            break;
                        }
                    }
                    this.emitChanged();
                }, VSS.handleError);
            }
        }, VSS.handleError);*/
    }

    private _getMyFavoritesStore(): IPromise<TFS_OM_Common.FavoriteStore> {
        if (!this._myFavoriteStore) {

            let deferred = Q.defer<TFS_OM_Common.FavoriteStore>();
            TFS_OM_Common.FavoriteStore.beginGetFavoriteStore(TFS_Host_TfsContext.TfsContext.getDefault(), TFS_Host_TfsContext.NavigationContextLevels.Project, null, TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_BUILD_DEFINITIONS, FavoriteStoreNames.MyFavorites, false,
                (favoriteStore: TFS_OM_Common.FavoriteStore) => {
                    deferred.resolve(favoriteStore);
                }, (err: any) => {
                    deferred.reject(err);
                });

            this._myFavoriteStore = deferred.promise;
        }
        return this._myFavoriteStore;
    }
}
