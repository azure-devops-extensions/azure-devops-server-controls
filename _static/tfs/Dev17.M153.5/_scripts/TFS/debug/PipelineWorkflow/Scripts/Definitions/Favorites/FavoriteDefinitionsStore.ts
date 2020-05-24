import { ActionsHubManager } from "DistributedTaskControls/Common/Actions/ActionsHubManager";
import { StoreBase } from "DistributedTaskControls/Common/Stores/Base";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";

import { Favorite } from "Favorites/Contracts";

import { PipelineDefinition } from "PipelineWorkflow/Scripts/Common/Types";
import { DefinitionsStoreKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";
import { FavoritesActionsHub, IDeleteFavoritePayload } from "PipelineWorkflow/Scripts/Definitions/Favorites/FavoritesActions";
import { DefinitionsStore } from "PipelineWorkflow/Scripts/Definitions/Stores/DefinitionsStore";

import * as Utils_String from "VSS/Utils/String";

export class FavoriteDefinitionsStore extends StoreBase {

    constructor() {
        super();
        this._definitionsStore = StoreManager.GetStore<DefinitionsStore>(DefinitionsStore);
    }

    public static getKey(): string {
        return DefinitionsStoreKeys.StoreKey_FavoriteDefinitionsStoreKey;
    }

    public initialize(instanceId: string): void {
        super.initialize(instanceId);
        this._favoritesActions = ActionsHubManager.GetActionsHub<FavoritesActionsHub>(FavoritesActionsHub, instanceId);

        this._favoritesActions.fetchFavorites.addListener(this._setFavorites);
        this._favoritesActions.addFavorite.addListener(this._addFavorite);
        this._favoritesActions.removeFavorite.addListener(this._removeFavorite);
    }

    public disposeInternal(): void {
        this._favoritesActions.fetchFavorites.removeListener(this._setFavorites);
        this._favoritesActions.addFavorite.removeListener(this._addFavorite);
        this._favoritesActions.removeFavorite.removeListener(this._removeFavorite);
    }

    public getFavorites(): IDictionaryNumberTo<string> {
        return this._definitionIdToFavoriteIdMap;
    }

    public getFavoriteId(definitionId: number): string {
        if (this._definitionIdToFavoriteIdMap && this._definitionIdToFavoriteIdMap.hasOwnProperty(definitionId)) {
            return this._definitionIdToFavoriteIdMap[definitionId];
        }
        else {
            return Utils_String.empty;
        }
    }

    private _setFavorites = (favorites: Favorite[]): void => {
        if (favorites && favorites.length > 0) {
            for (const favorite of favorites) {
                this._definitionIdToFavoriteIdMap[favorite.artifactId] = favorite.id;
            }
        }
    }

    private _addFavorite = (favorite: Favorite): void => {
        if (favorite) {
            this._definitionIdToFavoriteIdMap[favorite.artifactId] = favorite.id;
        }
    }

    private _removeFavorite = (payload: IDeleteFavoritePayload): void => {
        delete this._definitionIdToFavoriteIdMap[payload.definitionId];
    }

    private _definitionsStore: DefinitionsStore;
    private _favoritesActions: FavoritesActionsHub;
    private _definitionIdToFavoriteIdMap: IDictionaryNumberTo<string> = {};
}