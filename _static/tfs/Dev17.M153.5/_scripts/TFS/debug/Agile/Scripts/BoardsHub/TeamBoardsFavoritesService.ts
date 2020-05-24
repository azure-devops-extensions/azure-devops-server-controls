
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_Service from "Presentation/Scripts/TFS/TFS.Service";
import * as Favorites_RestClient from "Favorites/RestClient";
import { Favorite, FavoriteCreateParameters } from "Favorites/Contracts";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";

export class TeamBoardsFavoritesService extends TFS_Service.TfsService {
    private readonly _artifactScopeType: string = "Project";

    /**
     * Get all board set favorites
     * @param includeExtendedDetails - If true, retrieves additional metadata for each favorite
     */
    public getFavorites(includeExtendedDetails: boolean): IPromise<Favorite[]> {
        return this._getFavoritesClient().getFavorites(
            FavoriteTypes.WORK_TEAMBOARD,
            this._artifactScopeType,
            this._getProjectIdFromContext(),
            includeExtendedDetails);
    }

    /**
     * Favorites a new item
     * @param teamId
     * @param teamName
     */
    public createFavorite(teamId: string, teamName: string): IPromise<Favorite> {
        const favoriteParams = this._createNewFavoriteParams(teamId, teamName);
        return this._getFavoritesClient().createFavorite(favoriteParams);
    }

    /**
     * Removes item from favorites
     * @param favoriteId
     */
    public deleteFavorite(favoriteId: string): IPromise<void> {
        return this._getFavoritesClient().deleteFavoriteById(
            favoriteId,
            FavoriteTypes.WORK_TEAMBOARD,
            this._artifactScopeType,
            this._getProjectIdFromContext());
    }

    /**
     * Returns favorite params to use with favorites service
     * @param teamId
     * @param backlogId
     */
    protected _createNewFavoriteParams(teamId: string, teamName: string): FavoriteCreateParameters {
        return {
            artifactId: teamId,
            artifactProperties: {},
            artifactName: teamName,
            artifactType: FavoriteTypes.WORK_TEAMBOARD,
            artifactScope: {
                id: this._getProjectIdFromContext(),
                type: this._artifactScopeType,
                name: null
            },
            owner: null
        } as FavoriteCreateParameters;
    }

    /**
     * Get favorites client
     */
    private _getFavoritesClient(): Favorites_RestClient.FavoriteHttpClient4 {
        return Favorites_RestClient.getClient();
    }

    /**
     * Get project id from context
     */
    private _getProjectIdFromContext(): string {
        return TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id;
    }
}