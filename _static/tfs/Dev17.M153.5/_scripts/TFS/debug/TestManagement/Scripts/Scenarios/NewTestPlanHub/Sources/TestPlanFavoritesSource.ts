import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as Service from "VSS/Service";
import * as Favorites_RestClient from "Favorites/RestClient";
import { Favorite, FavoriteCreateParameters } from "Favorites/Contracts";
import { FavoriteTypes } from "TfsCommon/Scripts/Favorites/Constants";

export class TestPlanFavoritesSource {

    public static getInstance() {
        if (!TestPlanFavoritesSource._instance) {
            TestPlanFavoritesSource._instance = new TestPlanFavoritesSource();
        }
        return TestPlanFavoritesSource._instance;
    }
    private static _instance: TestPlanFavoritesSource;
    private readonly _artifactScopeType: string = "Project";

    /**
     * Get all test plan favorites
     * @param includeExtendedDetails If true, retrieves additional metadata for each favorite. 
     * Additional metadata includes artifactName, links, and other server side computed values. 
     * Not includingExtendedDetails may result in stale data. 
     */
    public getFavorites(includeExtendedDetails: boolean): IPromise<Favorite[]> {
        return this._getFavoritesClient().getFavorites(
                        FavoriteTypes.TEST_PLAN,
                        this._artifactScopeType,
                        this._getProjectIdFromContext(),
                        includeExtendedDetails)
                    .then(favs => favs.filter(fav => !fav.artifactIsDeleted));
    }

    /**
     * Favorites a new item
     * @param teamId
     * @param backlogId
     */
    public createFavorite(title: string, id: string): IPromise<Favorite> {
        const favoriteParams = this._createNewFavoriteParams(title, id);
        return this._getFavoritesClient().createFavorite(favoriteParams);
    }

    /**
     * Removes item from favorites
     * @param favoriteId
     */
    public deleteFavorite(favoriteId: string): IPromise<void> {
        return this._getFavoritesClient().deleteFavoriteById(
            favoriteId,
            FavoriteTypes.TEST_PLAN,
            this._artifactScopeType,
            this._getProjectIdFromContext());
    }

    /**
     * Returns favorite params to use with favorites service
     * @param teamId
     * @param backlogId
     */
    private _createNewFavoriteParams(title: string, id: string): FavoriteCreateParameters {
        return {
            artifactId: id,
            artifactProperties: {},
            artifactName: title,
            artifactType: FavoriteTypes.TEST_PLAN,
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
    private _getFavoritesClient(): Favorites_RestClient.FavoriteHttpClient {
        return Service.getClient(Favorites_RestClient.FavoriteHttpClient);
    }

    /**
     * Get project id from context
     */
    private _getProjectIdFromContext(): string {
        return TFS_Host_TfsContext.TfsContext.getDefault().contextData.project.id;
    }
}