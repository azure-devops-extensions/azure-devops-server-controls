import { Favorite } from "Favorites/Contracts";
import { Plan } from "TFS/Work/Contracts";

export interface IPlanHubFavoritesDataProvider {
    /**
     * Create a new favorite for the given plan.
     */
    createFavorite(plan: Plan): IPromise<Favorite>;

    /**
     * Delete the favorite with the given id.
     */
    deleteFavorite(favoriteId: string): IPromise<void>;

    /**
     * Get all the favorites.
     */
    getFavorites(includeExtendedDetails?: boolean): IPromise<Favorite[]>;
}
