import { FavoriteItemData } from "Favorites/Controls/FavoritesModels";
import {FavoriteHubItem} from "MyExperiences/Scenarios/Favorites/FavoriteItem";
import {BaseFavoriteHubItemContribution} from "MyExperiences/Scenarios/Favorites/BaseFavoriteHubItemContribution";

/** Favoritable item on favorites hub, taking care of multiple favorite types, progressive loading and contributed renderers */
export interface FavoriteHubItemData extends FavoriteItemData {
    /** Contribution definition for the renderer of this type of favorite */
    contribution?: Contribution;
    /** An instance of rendering contribution */
    contributionInstance?: BaseFavoriteHubItemContribution<FavoriteHubItem>;
}