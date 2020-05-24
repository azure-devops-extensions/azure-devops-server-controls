import Q = require("q");
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import Core_RestClient = require("TFS/Core/RestClient");
import Core_Contracts = require("TFS/Core/Contracts");
import { Dashboard } from "TFS/Dashboards/Contracts";
import { DashboardPageExtension, DashboardHttpClientFactory } from "Dashboards/Scripts/Common";

export class CreateDashboardDialogDataManager extends TfsService {
    public getTeams(): IPromise<Core_Contracts.WebApiTeam[]> {
        return DashboardPageExtension.getTeamsMembersOf();
    }

    public createDashboard(dashboard: Dashboard, teamContext: Core_Contracts.TeamContext): IPromise<Dashboard> {
        return DashboardHttpClientFactory.getClient().createDashboard(dashboard, teamContext);
    }
}