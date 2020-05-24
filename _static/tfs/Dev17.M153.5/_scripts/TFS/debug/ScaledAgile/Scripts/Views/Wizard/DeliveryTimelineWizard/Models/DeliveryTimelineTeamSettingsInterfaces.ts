import { IModelWithValidation } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { IFieldShallowReference } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";

/**
 * The state of wizard data
 */
export interface IDeliveryTimelineTeamSettingsData extends IModelWithValidation {
    /**
     * The default setting we used for populating the newly added team setting.
     */
    defaultSetting?: ITeamSettingData;
    /**
     * The all current team settings
     */
    settings: ITeamSettingData[];
}

/**
 * What: Selected team's setting
 * Why: Allow to have the user selection
 */
export interface ITeamSelectedSettingData {
    /**
     * Setting guid identifier. This is a temporary setting generated on the fly when the team setting row is generated. The goal
     * of this id is to have a unique identifier on the row to cache data associated with the row. This is never persisted on the
     * server.
     */
    id: string;

    /**
     * Current selected project
     */
    project: IFieldShallowReference;

    /**
    * Current selected team
    */
    team: IFieldShallowReference;

    /**
     * Current selected backlog level
     */
    backlogLevel: IFieldShallowReference;
}

/**
 * Each team setting data
 */
export interface ITeamSettingData extends ITeamSelectedSettingData {

    /**
     * Available project options in dropdown
     */
    projects: IFieldShallowReference[];

    /**
     * Available team options in the dropdown
     */
    teams: IFieldShallowReference[];

    /**
     * Available backlog levels in the dropdown
     */
    backlogLevels: IFieldShallowReference[];
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

export interface IInitialPayload {
    /**
     * The intial setting for the wizard    [This comment means nothing, to change]
     */
    initialSetting: ITeamSettingData;
    /**
     * The intial project's data            [This comment means nothing, to change]
     */
    initialProjectData: IProjectData;
    /**
     * The intial team's configuration      [This comment means nothing, to change]
     */
    initialTeamData: ITeamConfiguration;
}
