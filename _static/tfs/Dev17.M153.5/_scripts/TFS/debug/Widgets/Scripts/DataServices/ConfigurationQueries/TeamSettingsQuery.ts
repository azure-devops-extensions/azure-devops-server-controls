import * as Q from "q";
import { ICacheableQuery } from "Analytics/Scripts/QueryCache/ICacheableQuery"
import * as WorkClient from "TFS/Work/RestClient";
import * as WorkContracts from "TFS/Work/Contracts";
import { TeamContext } from "TFS/Core/Contracts";

/** REST-backed query for team settings.  */
export class TeamSettingsQuery implements ICacheableQuery<WorkContracts.TeamSetting> {

    private projectId: string;
    private teamId: string;

    constructor(projectId: string, teamId: string) {
        this.projectId = projectId;
        this.teamId = teamId;
    }

    public getKey(): string {
        return `${this.getQueryName()}.${this.projectId}.${this.teamId}`;
    }

    public getQueryName(): string {
        return "TeamSettingsQuery";
    }

    public runQuery(): IPromise<WorkContracts.TeamSetting> {
        let teamContext = {
            project: this.projectId,
            team: this.teamId
        } as TeamContext;

        let client = WorkClient.getClient();
        return client.getTeamSettings(teamContext);
    }
}