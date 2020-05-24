import * as CoreRestClient from "TFS/Core/RestClient";
import * as DashboardsRestClient from "TFS/Dashboards/RestClient";
import { TeamProjectReference, TeamContext, WebApiTeam } from "TFS/Core/Contracts";
import { DashboardGroup } from "TFS/Dashboards/Contracts";
import * as RestUtils from "Presentation/Scripts/TFS/TFS.Rest.Utils";

export class DashboardDataProvider {

    public getProjects(): IPromise<TeamProjectReference[]> {
        const getProjects = (top: number, skip: number) =>
            CoreRestClient.getClient().getProjects("WellFormed", top, skip);
        return RestUtils.batchGet(getProjects);
    }

    public getTeams(teamContext: TeamContext): IPromise<WebApiTeam[]> {
        const projectId: string = teamContext.projectId ? teamContext.projectId : teamContext.project;
        const getTeams = (top: number, skip: number) => CoreRestClient.getClient().getTeams(projectId, false /*mine*/, top, skip);

        return RestUtils.batchGet(getTeams);
    }

    public getDashboards(teamContext: TeamContext): IPromise<DashboardGroup> {
        return DashboardsRestClient.getClient().getDashboards(teamContext);
    }

}