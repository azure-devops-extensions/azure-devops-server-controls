import * as Contracts_Platform from "VSS/Common/Contracts/Platform";

export interface TeamProjectLineReference extends TeamProjectBaseReference {
    key: string;
    type: ProjectHubItemTypes;
    level?: number;
    parent?: TeamProjectLineReference;
    isExpanded?: boolean;
    isExpandable?: boolean;
}

export interface TeamProjectMru extends TeamProjectBaseReference {
}

export interface TeamProjectBaseReference {
    teamId: string;
    projectId: string;
    teamName: string;
    projectName: string;
    isTeam: boolean;
    description: string;
    lastAccessed?: Date;
    /** Identifier used to get the image of the team /project from the image api. */
    quickLinks?: Contracts_Platform.HubGroup[];
    /** The hashcode identifying the MRU for deletion */
    hashCode?: number;
}

export enum ProjectHubItemTypes {
    TeamProject,
    Loading,
    NoAdditionalTeams,
    ErrorFetchingTeams
}