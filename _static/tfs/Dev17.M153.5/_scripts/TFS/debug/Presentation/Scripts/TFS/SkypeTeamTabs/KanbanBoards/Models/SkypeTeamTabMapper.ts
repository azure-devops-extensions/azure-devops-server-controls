import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";
import * as Utils_String from "VSS/Utils/String";

import * as CoreContracts from "TFS/Core/Contracts";
import * as HostTfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as WorkContract from "TFS/Work/Contracts";
import {ITeamSettingData, IFieldShallowReference, IProjectData, ITeamConfiguration } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";
import {ISkypeTeamTabMapper} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/ISkypeTeamTabMapper";

export class SkypeTeamTabMapper implements ISkypeTeamTabMapper {

    /**
     * map the server returned projects to an array of id/name pair
     * @returns {IFieldShallowReference[]} an array of id/name pair of projects
     */
    public mapProjects(projects: CoreContracts.TeamProjectReference[]): IFieldShallowReference[] {
        if (projects) {
            var result = projects.map(project => { return { id: project.id, name: project.name, isValid: true, isLoading: false }; });
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
            var result = teams.map(team => { return { id: team.id, name: team.name, isValid: true, isLoading: false }; });
            return result.sort(this._sortComparer);
        }
        else {
            return [];
        }
    }

    /**
     * map process configuration to an array of id/name pair of backlog levels
     * @returns {IFieldShallowReference[]} an array of id/name pair of backlog levels
     */
    public mapBacklogLevels(backlogConfig: WorkContract.BacklogConfiguration): IFieldShallowReference[] {
        if (backlogConfig && backlogConfig.portfolioBacklogs) {
            let backlogs = backlogConfig.portfolioBacklogs;
            if (backlogConfig.requirementBacklog) {
                backlogs = backlogs.concat([backlogConfig.requirementBacklog]);
            }
            return backlogs.map(backlog => {
                return <IFieldShallowReference>{
                    id: backlog.id,
                    name: backlog.name,
                    isValid: true,
                    isLoading: false
                };
            });
        } else {
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
        backlogLevels: IFieldShallowReference[]): ITeamSettingData {

        var defaultProject = { id: "", name: "", isValid: true, isLoading: false};
        var defaultTeam = { id: "", name: "", isValid: true, isLoading: false, disabled: true };
        var defaultbacklogLevel = { id: "", name: "", isValid: true, isLoading: false, disabled: true };
        var id = TFS_Core_Utils.GUIDUtils.newGuid();
        return <ITeamSettingData>{
            id: id,
            account: HostTfsContext.TfsContext.getDefault().contextData.account.uri,
            project: defaultProject,
            projects: projects,
            team: defaultTeam,
            teams: teams,
            backlogLevel: defaultbacklogLevel,
            backlogLevels: backlogLevels,
        };
    }

    /**
     * map team setting to team configuration
     * @returns {ITeamConfiguration} a team configuration for the passed team
     */
    public mapTeamConfiguration(team: IFieldShallowReference, teamSetting: WorkContract.TeamSetting, allBacklogs: IFieldShallowReference[]): ITeamConfiguration {
        var visibleBacklogs = [];
        if (allBacklogs && allBacklogs.length > 0) {
            visibleBacklogs = allBacklogs.filter(backlog => teamSetting.backlogVisibilities[backlog.id])
        }
        return <ITeamConfiguration>{
            team: team,
            visibleBacklogs: visibleBacklogs
        };
    }
}