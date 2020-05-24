import { Team, TeamBuilder } from "Agile/Scripts/Models/Team";
import { batchGet } from "Presentation/Scripts/TFS/TFS.Rest.Utils";
import { getClient as getCoreClient } from "TFS/Core/RestClient";
import { getService as getSettingsService, SettingsUserScope } from "VSS/Settings/Services";
import { WebApiTeam } from "TFS/Core/Contracts";
import { toNativePromise } from "VSSPreview/Utilities/PromiseUtils";
import { getDefaultWebContext } from "VSS/Context";

export interface ITeamSource {
    fetchTeamsForCurrentProject(pageSize?: number): Promise<Team[]>;
    fetchMemberTeams(): Promise<Team[]>;
    /**
     * Fetch and page all teams for a given project
     * @param projectId The project ID
     * @param pageSize The page size. @default 1000
     */
    fetchTeamsForProject(projectId: string, pageSize?: number): Promise<Team[]>;
}

export const TEAM_PAGE_SIZE_KEY = "Agile/TeamSource/TeamPageSize";
export const TEAM_PAGE_SIZE = 1000;

/** 
 * The team source contains REST API calls relating to Teams
 */
export class TeamSource implements ITeamSource {
    public fetchTeamsForCurrentProject(pageSize?: number): Promise<Team[]> {
        const projectId = getDefaultWebContext().project.id;
        return this.fetchTeamsForProject(projectId, pageSize);
    }

    public fetchMemberTeams(): Promise<Team[]> {
        const restClient = getCoreClient();
        const projectId = getDefaultWebContext().project.id;
        return toNativePromise(
            restClient.getTeams(projectId, true /* mine */)
            .then(
                (teamResources: WebApiTeam[]) => {
                    return teamResources.map((teamResource) => TeamBuilder.fromWebApiTeam(teamResource));
                }
            )
        );
    }

    public fetchTeamsForProject(projectId: string, pageSize?: number): Promise<Team[]> {
        if (pageSize == null) {
            const settingsService = getSettingsService();
            pageSize = settingsService.getEntry<number>(TEAM_PAGE_SIZE_KEY, SettingsUserScope.Host) || TEAM_PAGE_SIZE;
        }

        const restClient = getCoreClient();
        const getTeams = (top: number, skip: number) => restClient.getTeams(projectId, false, top, skip);

        return toNativePromise(
            batchGet(getTeams, pageSize).then(
                (teamResources: WebApiTeam[]) => {
                    return teamResources.map((teamResource) => TeamBuilder.fromWebApiTeam(teamResource));
                }
            )
        );
    }
}