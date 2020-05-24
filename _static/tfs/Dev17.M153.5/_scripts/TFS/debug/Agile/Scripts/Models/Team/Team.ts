import { equals } from "VSS/Utils/String";

export interface ITeam {
    id: string;
    name: string;
}

export interface ITeamParams extends ITeam {
    description?: string;
    projectId?: string;
    projectName?: string;
}

export class Team {
    public readonly id: string;
    public readonly name: string;
    public readonly description?: string;
    public readonly projectId?: string;
    public readonly projectName?: string;

    constructor(params: ITeamParams) {
        this.id = params.id;
        this.name = params.name;
        this.description = params.description;
        this.projectId = params.projectId;
        this.projectName = params.projectName;
    }

    public equals(team: Team): boolean {
        return equals(team.id, this.id, true /*ignore case*/);
    }
}