import * as ActionBase from "DistributedTaskControls/Common/Actions/Base";

import { Favorite } from "Favorites/Contracts";

import { DefinitionsActionHubKeys } from "PipelineWorkflow/Scripts/Definitions/Constants";

export interface IDeleteFavoritePayload {
    definitionId: number;
    favoriteId: string;
}

export class FavoritesActionsHub extends ActionBase.ActionsHubBase {

    public static getKey(): string {
        return DefinitionsActionHubKeys.ActionHubKey_FavoritesActionHub;
    }

    public initialize(): void {
        this._addFavorite = new ActionBase.Action<Favorite>();
        this._removeFavorite = new ActionBase.Action<IDeleteFavoritePayload>();
        this._fetchFavorites = new ActionBase.Action<Favorite[]>();
        this._completeFavoriteAddition = new ActionBase.Action<number>();
    }

    public get addFavorite(): ActionBase.Action<Favorite> {
        return this._addFavorite;
    }

    public get removeFavorite(): ActionBase.Action<IDeleteFavoritePayload> {
        return this._removeFavorite;
    }

    public get fetchFavorites(): ActionBase.Action<Favorite[]> {
        return this._fetchFavorites;
    }

    public get completeFavoriteAddition(): ActionBase.Action<number> {
        return this._completeFavoriteAddition;
    }

    private _addFavorite: ActionBase.Action<Favorite>;
    private _removeFavorite: ActionBase.Action<IDeleteFavoritePayload>;
    private _fetchFavorites: ActionBase.Action<Favorite[]>;
    private _completeFavoriteAddition: ActionBase.Action<number>;
}