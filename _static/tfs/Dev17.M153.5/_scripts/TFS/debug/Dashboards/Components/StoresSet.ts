import { DashboardsDirectoryStore } from "Dashboards/Components/Directory/DashboardsDirectoryStore";
import { ActionsSet } from "Dashboards/Components/ActionsSet";

/**
 * A composite view of the stores available on the page. 
 */
export class StoresSet {
    public readonly dashboardDirectoryStore: DashboardsDirectoryStore;

    constructor(actions: ActionsSet) {
        this.dashboardDirectoryStore = new DashboardsDirectoryStore(actions.DashboardsDirectoryActions, actions.FavoritesActions);
    }
}
