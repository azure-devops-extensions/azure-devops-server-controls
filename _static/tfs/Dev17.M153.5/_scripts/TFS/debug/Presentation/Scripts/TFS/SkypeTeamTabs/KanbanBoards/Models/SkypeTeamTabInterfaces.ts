export interface ITeamSettingData {
    /**
     * Setting guid identifier
     */
    id: string;
    /**
     * Tab account name
     */
    account: string;
    /**
     * Current selected project
     */
    project: IFieldShallowReference;
    /**
     * Available project options in dropdown
     */
    projects: IFieldShallowReference[];
    /**
     * Current selected team
     */
    team: IFieldShallowReference;
    /**
     * Available team options in the dropdown
     */
    teams: IFieldShallowReference[];
    /**
     * Current selected backlog level
     */
    backlogLevel: IFieldShallowReference;
    /**
     * Available backlog levels in the dropdown
     */
    backlogLevels: IFieldShallowReference[];
    /**
     * The global message: mainly use is the server error
     */
    message?: string;
}

/**
 * Id and name pair of the field (Project, Team, BacklogLevel)
 */
export interface IFieldShallowReference {
    /**
     * id of the field
     */
    id: string;
    /**
     * Value of the field
     */
    name: string;
    /**
     * Flag indicates is the field value is valid. This property is used for rendering.
     */
    isValid: boolean;
    /**
     * Flag indicates is the field is current loading from server. This property is used for rendering.
     */
    isLoading: boolean;
    /**
     * Flag indicates is the field value has been disabled. This property is used for rendering.
     */
    disabled?: boolean;
}

/**
 * ProjectData: the project id/name pair, and the teams/backlogs according to that project.
 */
export interface IProjectData {
    /**
     * The project id/name pair.
     */
    project: IFieldShallowReference;
    /**
     * The teams the project has
     */
    teams: IFieldShallowReference[];
    /**
     * The backlogs the project has
     */
    allBacklogs: IFieldShallowReference[];
}

export interface ITeamConfiguration {
    /**
     * The team id/name pair.
     */
    team: IFieldShallowReference;
    /**
     * The visible backlogs configured for this team.
     */
    visibleBacklogs: IFieldShallowReference[];
}
