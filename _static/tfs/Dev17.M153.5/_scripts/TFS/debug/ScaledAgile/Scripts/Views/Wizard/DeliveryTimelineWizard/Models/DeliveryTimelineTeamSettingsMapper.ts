import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";
import * as Utils_String from "VSS/Utils/String";

import * as CoreContracts from "TFS/Core/Contracts";
import * as WorkContract from "TFS/Work/Contracts";
import { ITeamSettingData, ITeamConfiguration } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import {IDeliveryTimelineTeamSettingsMapper} from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineTeamSettingsMapper";
import { BacklogConfiguration, IBacklogLevelConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";

export class DeliveryTimelineTeamSettingsMapper implements IDeliveryTimelineTeamSettingsMapper {

    /**
     * map the server returned projects to an array of id/name pair
     * @returns {IFieldShallowReference[]} an array of id/name pair of projects
     */
    public mapProjects(projects: CoreContracts.TeamProjectReference[]): IFieldShallowReference[] {
        if (projects) {
            let result = projects.map(project => { return { id: project.id, name: project.name, valueState: ValueState.ReadyAndValid }; });
            return result.sort(this._sortComparer);
        }
        else {
            return [];
        }
    }

    /**
     * map the server returned teams to an array of id/name pair
     * @returns {IFieldShallowReference[]} an array of id/name pair of teams
     */
    public mapTeams(teams: CoreContracts.WebApiTeam[]): IFieldShallowReference[] {
        if (teams) {
            let result = teams.map(team => { return { id: team.id, name: team.name, valueState: ValueState.ReadyAndValid }; });
            return result.sort(this._sortComparer);
        }
        else {
            return [];
        }
    }

    /**
     * map backlog configuration to an array of id/name pair of backlog levels
     * @returns {IFieldShallowReference[]} an array of id/name pair of backlog levels
     */
    public mapBacklogLevels(processConfiguration: BacklogConfiguration): IFieldShallowReference[] {
        if (processConfiguration && processConfiguration.portfolioBacklogs) {
            let backlogs = processConfiguration.portfolioBacklogs.concat([processConfiguration.requirementBacklog]);
            backlogs.sort((a: IBacklogLevelConfiguration, b: IBacklogLevelConfiguration) => {
                return b.rank - a.rank;
            });
            return backlogs.map(backlog => {
                return {
                    id: backlog.id,
                    name: backlog.name,
                    valueState: ValueState.ReadyAndValid
                } as IFieldShallowReference;
            });
        }
        else {
            return [];
        }
    }

    private _sortComparer(a: IFieldShallowReference, b: IFieldShallowReference): number {
        return Utils_String.localeIgnoreCaseComparer(a.name, b.name);
    }

    /**
     * map the server returned projects/teams/backlogs to initial payload, in order to populate data for wizard experience: three default rows of project/team/backlog selectors.
     * We are geting all teams and backlog levels for the current project.
     * @returns {IDeliveryTimelineWizardData} the initial wizard data
     */
    public mapInitialSetting(projects: IFieldShallowReference[],
        teams: IFieldShallowReference[],
        backlogLevels: IFieldShallowReference[],
        teamContext: CoreContracts.TeamContext): ITeamSettingData {

        let defaultProject = this.getDefaultProject(projects, teamContext);
        let defaultTeam = this.getFirstOrDefaultTeamValue(teams);
        let defaultbacklogLevel = this.getDefaultbacklogLevel(backlogLevels);
        let id = TFS_Core_Utils.GUIDUtils.newGuid();
        return {
            id: id,
            project: defaultProject,
            projects: projects,
            team: defaultTeam,
            teams: teams,
            backlogLevel: defaultbacklogLevel,
            backlogLevels: backlogLevels
        } as ITeamSettingData;
    }

    /**
     * map team setting to team configuration
     * @returns {ITeamConfiguration} a team configuration for the passed team
     */
    public mapTeamConfiguration(team: IFieldShallowReference, teamSetting: WorkContract.TeamSetting, allBacklogs: IFieldShallowReference[]): ITeamConfiguration {
        return {
            team: team,
            visibleBacklogs: allBacklogs.filter(backlog => teamSetting.backlogVisibilities[backlog.id])
        } as ITeamConfiguration;
    }

    /**
     * Get the default project value based on the server data and current team context
     * @returns {IFieldShallowReference} the default project value
     */
    public getDefaultProject(projects: IFieldShallowReference[], projectContext: CoreContracts.TeamContext): IFieldShallowReference {
        if (projectContext) {
            return { id: projectContext.projectId, name: projectContext.project, valueState: ValueState.ReadyAndValid };
        }
        return (projects && projects.length > 0) ? { id: projects[0].id, name: projects[0].name, valueState: ValueState.ReadyAndValid } : { id: "", name: "", valueState: ValueState.ReadyAndValid };
    }

    /**
     * Get the first team in the list provided, or if list is empty, returns a default team value.
     * @returns {IFieldShallowReference} the team value
     */
    public getFirstOrDefaultTeamValue(teams: IFieldShallowReference[]): IFieldShallowReference {
        return (teams && teams.length > 0) ? { id: teams[0].id, name: teams[0].name, valueState: ValueState.ReadyAndValid } : { id: "", name: "", valueState: ValueState.ReadyAndValid };
    }

    /**
      * Get the default backlog level
      * @returns {IFieldShallowReference} the default backlog level
      */
    public getDefaultbacklogLevel(backlogCategories: IFieldShallowReference[]): IFieldShallowReference {
        return { id: "", name: "", valueState: ValueState.ReadyAndValid } as IFieldShallowReference;
    }
}
