
import Q = require("q");

import Build_Actions = require("Build/Scripts/Actions/Actions");
import { definitionDeleted } from "Build/Scripts/Actions/Definitions";
import BuildModelsCommon = require("Build/Scripts/Constants");
import { raiseTfsError } from "Build/Scripts/Events/MessageBarEvents";
import Favorites = require("Build/Scripts/Favorites");
import {OneTimeActionCreator} from "Build/Scripts/OneTimeActionCreator";

import {getDefinitionUri} from "Build.Common/Scripts/DefinitionReference";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_React = require("Presentation/Scripts/TFS/TFS.React");

import { BuildDefinitionReference } from "TFS/Build/Contracts";

import {Action} from "VSS/Flux/Action";

import Artifact_Services = require("VSS/Artifacts/Services");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import { IdentityRef } from "VSS/WebApi/Contracts";

var favoriteItemType = "Microsoft.TeamFoundation.Build.Definition";

export interface IDefinitionFavoriteStoreOptions extends TFS_React.IStoreOptions {
    tfsContext?: TFS_Host_TfsContext.TfsContext;
    favouriteStore?: TFS_OM_Common.FavoriteStore;
}

export interface InitializeDefinitionFavoriteStorePayload {
    favorites: Favorites.FavoriteOwnerMapping[];
    teams: IdentityRef[];
}
export var _initializeDefinitionFavoriteStore = new Action<InitializeDefinitionFavoriteStorePayload>();
export var initializeDefinitionFavoriteStore = new OneTimeActionCreator(_initializeDefinitionFavoriteStore);

interface IFavoriteStoreMapEntry {
    id: string;
    store: IPromise<TFS_OM_Common.FavoriteStore>;
}

class FavoriteStoreMap {
    private _favoriteStores: IFavoriteStoreMapEntry[];

    constructor() {
        this._favoriteStores = [];
    }

    public getFavoriteStore(id: string): IPromise<TFS_OM_Common.FavoriteStore> | null {
        if (this._favoriteStores) {
            for (let i = 0; i < this._favoriteStores.length; i++) {
                if (this._favoriteStores[i].id === id) {
                    return this._favoriteStores[i].store;
                }
            }
        }
        return null;
    }

    public containsFavoriteStore(id: string): boolean {
        if (this._favoriteStores) {
            for (let i = 0; i < this._favoriteStores.length; i++) {
                if (this._favoriteStores[i].id === id) {
                    return true;
                }
            }
        }
        return false;
    }

    public addFavoriteStore(id: string, store: IPromise<TFS_OM_Common.FavoriteStore>) {
        if (this.containsFavoriteStore(id)) {
            // TODO: error case, map already has this key
            return;
        }

        this._favoriteStores.push({
            id: id,
            store: store
        });
    }
}

interface IFavoriteOwnerMapping {
    definitionId: number;
    owners: string[];
}

export class DefinitionFavoritesActionCreator {
    static addDefinitionToFavorites(definition: BuildDefinitionReference, ownerId: string) {
        let store: DefinitionFavoriteStore = getDefinitionFavoriteStore();
        store.addDefinitionToFavoriteStore(definition, ownerId);
    }

    static removeDefinitionFromFavorites(definition: BuildDefinitionReference, ownerId: string) {
        let store: DefinitionFavoriteStore = getDefinitionFavoriteStore();
        store.removeDefinitionFromFavoriteStore(definition, ownerId);
    }
}

export class DefinitionFavoriteStore extends TFS_React.Store {
    private _teamFavoriteDefinitionIds: number[] = [];
    private _myFavoriteDefinitionIds: number[] = [];

    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    private _favoriteStores: FavoriteStoreMap;
    private _teams: IdentityRef[];
    private _favorites: IFavoriteOwnerMapping[];

    constructor(options?: IDefinitionFavoriteStoreOptions) {
        super(BuildModelsCommon.StoreChangedEvents.DefinitionFavoriteStoreUpdated, options);

        this._tfsContext = (options && options.tfsContext) ? options.tfsContext : TFS_Host_TfsContext.TfsContext.getDefault();

        this._favoriteStores = new FavoriteStoreMap();
        this._favorites = [];

        _initializeDefinitionFavoriteStore.addListener((payload: InitializeDefinitionFavoriteStorePayload) => {
            this._teamFavoriteDefinitionIds = [];
            this._myFavoriteDefinitionIds = [];
            this._favorites = [];

            if (payload.favorites) {
                payload.favorites.forEach((entry) => {
                    let isTeamFavorite = false;
                    for (let i = 0; i < entry.value.length; i++) {
                        if (entry.value[i] === this._tfsContext.contextData.user.id) {
                            this._myFavoriteDefinitionIds.push(entry.key.id);
                        }
                        else if (this._tfsContext.currentTeam && this._tfsContext.currentTeam.identity.id === entry.value[i]) {
                            if (!isTeamFavorite) {
                                this._teamFavoriteDefinitionIds.push(entry.key.id);
                                isTeamFavorite = true;
                            }
                        }
                        else if (!this._tfsContext.currentTeam) {
                            if (!isTeamFavorite) {
                                this._teamFavoriteDefinitionIds.push(entry.key.id);
                                isTeamFavorite = true;
                            }
                        }
                    }

                    this._favorites.push({
                        definitionId: entry.key.id,
                        owners: entry.value
                    });
                });
            }

            
            if (this._tfsContext.currentTeam && payload.teams) {
                this._teams = payload.teams.filter((team: IdentityRef) => {
                    return (team.id === this._tfsContext.currentTeam.identity.id);
                });
            }
            else {
                this._teams = payload.teams;
            }

            if (!this._teams) {
                this._teams = [];
            }

            this.emitChanged();
        });

        Build_Actions.favoriteStoresUpdated.addListener((payload: Build_Actions.FavoriteStoresUpdatedPayload) => {
            payload.stores.forEach((favoriteStore) => {
                // STEP 1: Remove existing favorites that match favoriteStore.name
                this._favorites.forEach((favorite: IFavoriteOwnerMapping) => {
                    for (let i = 0; i < favorite.owners.length; i++) {
                        if (favoriteStore.name === favorite.owners[i]) {
                            favorite.owners.splice(i, 1);
                            break;
                        }
                    }
                });
                
                // STEP 2: Add new set of favorites
                favoriteStore.children.forEach((item: TFS_OM_Common.FavoriteItem) => {
                    // check for the type before proceeding further, since store can have other types too
                    if (item.type !== favoriteItemType) {
                        return;
                    }
                    let definitionId = parseInt(Artifact_Services.LinkingUtilities.decodeUri(item.data).id);
                    
                    let added = false;
                    for (let i = 0; i < this._favorites.length; i++) {
                        if (this._favorites[i].definitionId === definitionId) {
                            this._favorites[i].owners.push(favoriteStore.name);
                            added = true;
                            break;
                        }
                    }
                    if (!added) {
                        this._favorites.push({
                            definitionId: definitionId,
                            owners: [favoriteStore.name]
                        });
                    }
                });

                // STEP 3: Recalculate _myFavoriteDefinitionIds and _teamFavoriteDefinitionIds
                this._myFavoriteDefinitionIds = [];
                this._teamFavoriteDefinitionIds = [];
                this._favorites.forEach((favorite: IFavoriteOwnerMapping) => {
                    let isTeamFavorite = false;
                    for (let i = 0; i < favorite.owners.length; i++) {
                        if (favorite.owners[i] === this._tfsContext.contextData.user.id) {
                            this._myFavoriteDefinitionIds.push(favorite.definitionId);
                        }
                        else if (this._tfsContext.currentTeam && this._tfsContext.currentTeam.identity.id === favorite.owners[i]) {
                            if (!isTeamFavorite) {
                                this._teamFavoriteDefinitionIds.push(favorite.definitionId);
                                isTeamFavorite = true;
                            }
                        }
                        else if (!this._tfsContext.currentTeam) {
                            if (!isTeamFavorite) {
                                this._teamFavoriteDefinitionIds.push(favorite.definitionId);
                                isTeamFavorite = true;
                            }
                        }
                    }
                });
            });

            this.emitChanged();
        });

        definitionDeleted.addListener((definition: BuildDefinitionReference) => {
            let favoriteOwners: string[] = [];

            for (let i = 0; i < this._favorites.length; i++) {
                if (this._favorites[i].definitionId === definition.id) {
                    favoriteOwners = this._favorites[i].owners;
                    break;
                }
            }

            favoriteOwners.forEach((identity: string) => {
                this._removeDefinitionFavorite(definition, identity);
            });
        });
    }

    public getTeamFavoriteDefinitionIds(): number[] {
        return this._teamFavoriteDefinitionIds;
    }

    public getMyFavoriteDefinitionIds(): number[] {
        return this._myFavoriteDefinitionIds;
    }

    public getAllFavoriteDefinitionIds(): number[] {
        return Utils_Array.unique(this._teamFavoriteDefinitionIds.concat(this._myFavoriteDefinitionIds));
    }

    public isTeamFavoriteDefinition(definitionId: number): boolean {
        return Utils_Array.contains(this._teamFavoriteDefinitionIds, definitionId);
    }

    public isMyFavoriteDefinition(definitionId: number): boolean {
        return Utils_Array.contains(this._myFavoriteDefinitionIds, definitionId);
    }

    public getFavoriteInfo(definitionId: number): Favorites.FavoriteDefinitionInfo {
        let favoriteOwners: string[] = [];

        for (let i = 0; i < this._favorites.length; i++) {
            if (this._favorites[i].definitionId === definitionId) {
                favoriteOwners = this._favorites[i].owners;
                break;
            }
        }

        return {
            userId: this._tfsContext.contextData.user.id,
            userTeams: this._teams,
            favoriteOwnerIds: favoriteOwners
        };
    }

    public addDefinitionToFavoriteStore(definition: BuildDefinitionReference, ownerId: string) {
        if (Utils_String.equals(ownerId, this._tfsContext.contextData.user.id, true)) {
            this._getMyFavoriteStore().then((store) => {
                Favorites.addDefinitionToFavoriteStore(definition, store).then(() => {
                    Build_Actions.favoriteStoresUpdated.invoke({ stores: [store] });
                }, raiseTfsError);
            }, raiseTfsError);
        }
        else {
            this._getTeamFavoriteStore(ownerId).then((store) => {
                Favorites.addDefinitionToFavoriteStore(definition, store).then(() => {
                    Build_Actions.favoriteStoresUpdated.invoke({ stores: [store] });
                }, raiseTfsError);
            }, raiseTfsError);
        }

        this.emitChanged();
    }

    public removeDefinitionFromFavoriteStore(definition: BuildDefinitionReference, ownerId: string) {
        this._removeDefinitionFavorite(definition, ownerId);
        this.emitChanged();
    }

    private _getTeamFavoriteStore(id: string): IPromise<TFS_OM_Common.FavoriteStore> {
        let teamFavoritesStore = this._favoriteStores.getFavoriteStore(id);
        if (!teamFavoritesStore) {
            let progressId = VSS.globalProgressIndicator.actionStarted(BuildModelsCommon.StoreChangedEvents.DefinitionFavoriteStoreUpdated + "getTeamFavoriteStore", true);
            let deferred = Q.defer<TFS_OM_Common.FavoriteStore>();
            TFS_OM_Common.FavoriteStore.beginGetFavoriteStore(this._tfsContext, TFS_Host_TfsContext.NavigationContextLevels.Team, id, TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_BUILD_DEFINITIONS, id, false,
                (favoriteStore: TFS_OM_Common.FavoriteStore) => {
                    deferred.resolve(favoriteStore);
                    VSS.globalProgressIndicator.actionCompleted(progressId);
                }, (err: any) => {
                    deferred.reject(err);
                    VSS.globalProgressIndicator.actionCompleted(progressId);
                }
            );
            teamFavoritesStore = deferred.promise;
            this._favoriteStores.addFavoriteStore(id, teamFavoritesStore);
        }
        return teamFavoritesStore;
    }

    private _getMyFavoriteStore(): IPromise<TFS_OM_Common.FavoriteStore> {
        let myFavoriteStore = this._favoriteStores.getFavoriteStore(this._tfsContext.contextData.user.id);
        if (!myFavoriteStore) {
            let progressId = VSS.globalProgressIndicator.actionStarted(BuildModelsCommon.StoreChangedEvents.DefinitionFavoriteStoreUpdated + "getMyFavoriteStore", true);
            let deferred = Q.defer<TFS_OM_Common.FavoriteStore>();
            TFS_OM_Common.FavoriteStore.beginGetFavoriteStore(this._tfsContext, TFS_Host_TfsContext.NavigationContextLevels.Project, null, TFS_OM_Common.FavoriteStore.FAVORITE_STORE_SCOPE_FAVORITE_BUILD_DEFINITIONS, this._tfsContext.contextData.user.id, false,
                (favoriteStore: TFS_OM_Common.FavoriteStore) => {
                    deferred.resolve(favoriteStore);
                    VSS.globalProgressIndicator.actionCompleted(progressId);
                }, (err: any) => {
                    deferred.reject(err);
                    VSS.globalProgressIndicator.actionCompleted(progressId);
                }
            );
            myFavoriteStore = deferred.promise;
            this._favoriteStores.addFavoriteStore(this._tfsContext.contextData.user.id, myFavoriteStore);
        }
        return myFavoriteStore;
    }

    private _removeDefinitionFavorite(definition: BuildDefinitionReference, ownerId: string) {
        if (Utils_String.equals(ownerId, this._tfsContext.contextData.user.id, true)) {
            this._getMyFavoriteStore().then((store) => {
                var uri = getDefinitionUri(definition);
                var favoriteItem = Favorites.getFavoriteItemFromStore(uri, store);
                if (favoriteItem) {
                    Favorites.removeFavoriteItemFromStore(favoriteItem).then(() => {
                        Build_Actions.favoriteStoresUpdated.invoke({ stores: [store] });
                    }, raiseTfsError);
                }
            }, raiseTfsError);

        }
        else {
            this._getTeamFavoriteStore(ownerId).then((store) => {
                var uri = getDefinitionUri(definition);
                var favoriteItem = Favorites.getFavoriteItemFromStore(uri, store);
                if (favoriteItem) {
                    Favorites.removeFavoriteItemFromStore(favoriteItem).then(() => {
                        Build_Actions.favoriteStoresUpdated.invoke({ stores: [store] });
                    }, raiseTfsError);
                }
            }, raiseTfsError);
        }
    }
}

var _definitionFavoriteStore: DefinitionFavoriteStore = null;

export function getDefinitionFavoriteStore(options?: IDefinitionFavoriteStoreOptions): DefinitionFavoriteStore {
    if (!_definitionFavoriteStore) {
        _definitionFavoriteStore = new DefinitionFavoriteStore(options);
    }
    return _definitionFavoriteStore;
}
