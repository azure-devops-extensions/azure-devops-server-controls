import * as WorkContract from "TFS/Work/Contracts";
import * as TFS_Core_Contracts from "TFS/Core/Contracts";
import { ITeamSettingData, IFieldShallowReference, IProjectData, ITeamConfiguration } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";

export interface ISkypeTeamTabMapper {
    /**
     * map the server returned projects to an array of id/name pair
     * @returns {IFieldShallowReference[]} an array of id/name pair of projects
     */
    mapProjects(projects: TFS_Core_Contracts.TeamProjectReference[]): IFieldShallowReference[];

    /**
     * map the server returned teams to an array of id/name pair
     * @returns {IFieldShallowReference[]} an array of id/name pair of teams
     */
    mapTeams(teams: TFS_Core_Contracts.WebApiTeam[]): IFieldShallowReference[];

    /**
     * map process configuration to an array of id/name pair of backlogs
     * @returns {IFieldShallowReference[]} an array of id/name pair of backlogs
     */
    mapBacklogLevels(processConfiguration: WorkContract.BacklogConfiguration): IFieldShallowReference[];

    /**
     * Get initial payload to populate data for wizard experience
     * We are geting all teams and backlogs for the current project.
     * @returns {ITeamSettingData} the default team setting
     */
    mapInitialSetting(projects: IFieldShallowReference[], teams: IFieldShallowReference[], backlogLevels: IFieldShallowReference[]): ITeamSettingData;

    /**
     * map team setting to team configuration
     * @returns {ITeamConfiguration} a team configuration for the passed team
     */
    mapTeamConfiguration(team: IFieldShallowReference, teamSetting: WorkContract.TeamSetting, allBacklogs: IFieldShallowReference[]): ITeamConfiguration;
}