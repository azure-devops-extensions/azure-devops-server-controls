import { WebApiTeam } from "TFS/Core/Contracts";
import { Team } from "Agile/Scripts/Models/Team/Team";

export namespace TeamBuilder {
    /**
     * Create Team from the TeamWebApi response
     * @param teamData The team from the web api
     * @return A constructed Team object
     */
    export function fromWebApiTeam(teamData: WebApiTeam): Team {
        if (teamData) {
            return new Team({
                name: teamData.name,
                id: teamData.id,
                description: teamData.description,
                projectId: teamData.projectId,
                projectName: teamData.projectName
            });
        }
    }
}