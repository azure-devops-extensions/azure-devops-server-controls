import { ActionsSet } from "Dashboards/Components/ActionsSet";
import { StoresSet } from "Dashboards/Components/StoresSet";
import { NavigationActionCreator } from "Dashboards/Components/NavigationActionCreator";
import { DashboardsDirectoryActionCreator } from "Dashboards/Components/Directory/DashboardsDirectoryActionCreator";

/**
 * A composite view of the action creators available on the page. 
 */
export class ActionCreatorsSet {
    public readonly navigationActionCreator: NavigationActionCreator;
    public readonly dashboardsDirectoryActionCreator: DashboardsDirectoryActionCreator;

    constructor(actions: ActionsSet, stores: StoresSet) {
        this.navigationActionCreator = new NavigationActionCreator();
        this.dashboardsDirectoryActionCreator = new DashboardsDirectoryActionCreator(actions.DashboardsDirectoryActions);
    }
}
