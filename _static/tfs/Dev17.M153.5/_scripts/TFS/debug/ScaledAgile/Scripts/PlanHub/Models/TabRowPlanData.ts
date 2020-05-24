import { Plan } from "TFS/Work/Contracts";
import { Favorite } from "Favorites/Contracts";

/**
 * Data needed for each plan row on the tabs (the plan data).
 * We could have a limited interface instead of extending plan - but for simplicity we are doing this for now.
 */
export interface TabRowPlanData extends Plan {
    /**
     * Should we show this plan on the favorites tab - the play may no longer be favorited and we want to still show it there in case they accidentally clicked unfavorite.
     */
    showOnFavorites: boolean;

    /**
     * Favorite data for this plan. Will be undefined if this plan is not favorited (or we don't know yet if it is favorited).
     */
    favorite: Favorite;

    /**
     * Are we currently changing the favorite state for this plan (disables clicking until the action resolves).
     */
    isChangingFavoriteState: boolean;

    /**
     * If the plan row represents a plan that has been deleted.
     */
    isDeleted: boolean;
}
