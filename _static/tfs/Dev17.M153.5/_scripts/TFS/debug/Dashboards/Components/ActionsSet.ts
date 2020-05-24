import { FavoritesActions } from "Favorites/Controls/FavoritesActions";
import { DashboardsDirectoryActions } from "Dashboards/Components/Directory/DashboardsDirectoryActionCreator";

/**
 * Represents the set managing the actions on the page. All actions are expected to be available
 * to the components on the page via the actions set. The actions set is available in the dashboard context
 * passed to react components on the page. 
 */
export class ActionsSet {
    public DashboardsDirectoryActions = new DashboardsDirectoryActions();
    public FavoritesActions;

    constructor(favoriteActions: FavoritesActions) {
        this.FavoritesActions = favoriteActions;
    }
}