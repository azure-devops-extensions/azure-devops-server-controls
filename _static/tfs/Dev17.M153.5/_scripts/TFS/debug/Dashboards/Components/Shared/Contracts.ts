import { Dashboard } from "TFS/Dashboards/Contracts";

export interface TeamScope {
    /** teamId that is a container for the dashboard */
    teamId: string;

    /** name of the team corresponding to the team Id */
    teamName: string;
}

export interface DashboardItem {
    /** scope of the container for the dashboard */
    teamScope: TeamScope;

    /** the dashboard payload coming down the wire */
    dashboard: Dashboard;
}