import WorkContract = require("TFS/Work/Contracts");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import { ITeamSettingData, ITeamConfiguration } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { IFieldShallowReference } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { BacklogConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";

export interface IDeliveryTimelineTeamSettingsMapper {
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
     * map backlog configuration to an array of id/name pair of backlogs
     * @returns {IFieldShallowReference[]} an array of id/name pair of backlogs
     */
    mapBacklogLevels(processConfiguration: BacklogConfiguration): IFieldShallowReference[];

    /**
     * Get initial payload to populate data for wizard experience
     * We are geting all teams and backlogs for the current project. 
     * @returns {ITeamSettingData} the default team setting
     */
    mapInitialSetting(projects: IFieldShallowReference[], teams: IFieldShallowReference[], backlogLevels: IFieldShallowReference[], projectContext: TFS_Core_Contracts.TeamContext): ITeamSettingData;

    /**
     * map team setting to team configuration
     * @returns {ITeamConfiguration} a team configuration for the passed team
     */
    mapTeamConfiguration(team: IFieldShallowReference, teamSetting: WorkContract.TeamSetting, allBacklogs: IFieldShallowReference[]): ITeamConfiguration;
}
