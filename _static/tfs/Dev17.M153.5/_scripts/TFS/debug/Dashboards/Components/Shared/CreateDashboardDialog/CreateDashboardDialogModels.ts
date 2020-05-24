import { Dashboard } from "TFS/Dashboards/Contracts";
import TFS_Core_Contracts = require("TFS/Core/Contracts");

export interface CreateDashboardState {
    // dashboard that was created.
    dashboard: CreatedDashboardItem;

    // error message if the dashboard was created unsuccessfully or the teams failed to load. 
    error: string;

    // teams loaded for the picker. 
    teamsLoaded: boolean;
    teamsMine: TFS_Core_Contracts.WebApiTeam[];
    teamsAll: TFS_Core_Contracts.WebApiTeam[];
}

export interface CreatedDashboardItem extends Dashboard, TFS_Core_Contracts.TeamContext {
}