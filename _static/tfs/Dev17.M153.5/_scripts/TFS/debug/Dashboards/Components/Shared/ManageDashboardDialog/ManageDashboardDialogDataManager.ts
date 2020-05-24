import Q = require("q");
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import Core_RestClient = require("TFS/Core/RestClient");
import { TeamContext } from "TFS/Core/Contracts";
import { Dashboard } from "TFS/Dashboards/Contracts";
import { DashboardHttpClientFactory } from "Dashboards/Scripts/Common";

export class ManageDashboardDialogDataManager extends TfsService {
    public manageDashboard(activeDashboard: Dashboard, teamContext: TeamContext): IPromise<Dashboard> {
        return DashboardHttpClientFactory.getClient().replaceDashboard(activeDashboard, teamContext, activeDashboard.id);
    }
}