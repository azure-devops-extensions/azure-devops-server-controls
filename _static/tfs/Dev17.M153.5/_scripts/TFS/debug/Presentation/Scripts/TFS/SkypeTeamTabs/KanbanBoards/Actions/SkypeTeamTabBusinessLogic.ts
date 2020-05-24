import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import {
    IFieldShallowReference,
    IProjectData,
    ITeamConfiguration,
    ITeamSettingData,
} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { EmbeddedBoardRouteParameters } from "Presentation/Scripts/TFS/SkypeTeamTabs/RouteConstants";
import { getNavigationHistoryService, StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";
import { empty } from "VSS/Utils/String";

export class SkypeTeamTabBusinessLogic {
    private static instance: SkypeTeamTabBusinessLogic;

    /**
     * Singleton Pattern. we do not need multiple instances of this class.
     */
    public static getInstance(): SkypeTeamTabBusinessLogic {
        if (SkypeTeamTabBusinessLogic.instance == null) {
            SkypeTeamTabBusinessLogic.instance = new SkypeTeamTabBusinessLogic();
        }

        return SkypeTeamTabBusinessLogic.instance;
    }

    private constructor() { }

    // This is a dummy field used for setting that a field is currently loading from server. The isLoading property is used for rendering.
    public static loadingDummyField = { id: "", name: Resources.Loading, isLoading: true, isValid: true, hasValueChanged: false };

    /**
     * Convert the setting to url. This is the url that will be used in the tab. It provides an authentication redirect if needed.
     * @param {ITeamSettingData} setting - the current tab setting
     */
    public toPageUrl(settings: ITeamSettingData): string {
        if (settings == null) {
            throw new Error("tab setting cannot be null");
        }

        const boardUri = this._getBoardUri(settings);
        const authRedirectUri = `${settings.account}_integrationredirect/authenticationRedirect?&replyto=`;
        return `${authRedirectUri}${encodeURIComponent(boardUri)}`;
    }

    /**
     * Convert the settings to a website url. This is the url that will be used when the user clicks "Go to website" which launches the uri outside of the Skype Team Tab.
     * There is no authentication redirect here - we use the normal vsts page auth and don't use the embedded version of the board.
     * @param {ITeamSettingData} settings - the current tab setting
     */
    public toWebsiteUrl(settings: ITeamSettingData): string {
        if (settings == null) {
            throw new Error("tab setting cannot be null");
        }

        return this._getBoardUri(settings, "false");
    }

    /**
     * Validate the setting are valid or not
     * @param {string} setting - the current tab setting
     */
    public validateSetting(setting: ITeamSettingData): boolean {
        if (setting == null) {
            return false;
        }

        if (!setting.account || !setting.project || !setting.team || !setting.team.id || !setting.backlogLevel) {
            return false;
        }

        var isLoading = setting.project.isLoading || setting.team.isLoading;
        if (isLoading) {
            return false;
        }

        var isValid = setting.project.isValid && setting.team.isValid;
        if (!isValid) {
            return false;
        }

        var isCategoryValid = this._validateBacklogLevel(setting.backlogLevel);
        if (!isCategoryValid) {
            return false;
        }

        return true;
    }

    public generateName(setting: ITeamSettingData) {
        return setting.team.name + " " + setting.backlogLevel.name + " Board";
    }

    private _validateBacklogLevel(level: IFieldShallowReference) {
        return level.id && !level.isLoading && level.isValid;
    }

    /**
     * Update the project name only and set it as invalid
     * @param {string} setting - the current tab setting
     * @param {string} id - the id of tab setting that has change
     * @param {string} value - the current value of the project in setting
     */
    public updateProjectName(setting: ITeamSettingData, projectName: string) {
        if (projectName != null) {
            setting.project.name = projectName;
        }
        setting.project.isValid = false;
        setting.team = { id: "", name: "", isValid: true, isLoading: false, disabled: true };
        setting.teams = [];
        setting.backlogLevel = { id: "", name: "", isValid: true, isLoading: false, disabled: true };
        setting.backlogLevels = [];
    }

    /**
     * Update the project in setting
     * @param {string} teamSetting - the current tab setting
     * @param {IProjectData} projectData - the new project Data
     * @param {string} value - the current value of the project in setting
     */
    public updateProject(teamSetting: ITeamSettingData, projectData: IProjectData) {
        let projectDeepCopy = this._cloneFieldRef(projectData.project);
        let teams = this._cloneFieldRefArray(projectData.teams);
        projectDeepCopy.isLoading = false;
        projectDeepCopy.isValid = true;
        teamSetting.project = projectDeepCopy;
        teamSetting.team = { id: "", name: "", isValid: true, isLoading: false, disabled: false };
        teamSetting.backlogLevels = [];
        teamSetting.teams = teams;
        teamSetting.backlogLevel = { id: "", name: "", isValid: true, isLoading: false, disabled: true };
    }

    /**
     * Update the team name only and set it as invalid
     * @param {string} setting - the current tab setting
     * @param {string} id - the id of tab setting that has change
     * @param {string} value - the current value of the team in setting
     */
    public updateTeamName(setting: ITeamSettingData, teamName: string) {
        if (teamName != null) {
            setting.team.name = teamName;
        }
        setting.team.isValid = false;
        setting.backlogLevel = { id: "", name: "", isValid: true, isLoading: false, disabled: true };
        setting.backlogLevels = [];
    }

    /**
     * Update the team
     * @param {string} setting - the current tab setting
     * @param {string} id - the id of tab setting that has change
     * @param {ITeamConfiguration} teamData - the new team configuration
     * @param {string} value - the current value of the team in setting
     */
    public updateTeam(teamSetting: ITeamSettingData, teamData: ITeamConfiguration) {
        var teamDeepCopy = this._cloneFieldRef(teamData.team);
        var backlogLevels = this._cloneFieldRefArray(teamData.visibleBacklogs);
        teamDeepCopy.isValid = true;
        teamDeepCopy.isLoading = false;
        teamSetting.team = teamDeepCopy;
        teamSetting.backlogLevels = backlogLevels;
        teamSetting.backlogLevel = { id: "", name: "", isValid: true, isLoading: false, disabled: false };
    }

    /**
     * Update the project in setting
     * @param {string} teamSetting - the current tab setting
     * @param {IFieldShallowReference} backlogLevel - the new backlog level
     * @param {string[]} value - the current value of the backlog level in setting
     */
    public updateBacklogLevel(teamSetting: ITeamSettingData, backlogLevel: IFieldShallowReference, value?: string) {
        var levelDeepCopy = this._cloneFieldRef(backlogLevel);
        teamSetting.backlogLevel = levelDeepCopy;
        teamSetting.backlogLevel.isLoading = false;
        teamSetting.backlogLevel.isValid = true;
    }

    /**
     * Update the backlog name only and set it as invalid
     * @param {string} teamSetting - the current tab setting
     * @param {string} id - the id of tab setting that has change
     * @param {string} value - the current value of the backlog in setting
     */
    public updateBacklogName(teamSetting: ITeamSettingData, backlogName: string) {
        if (backlogName != null) {
            teamSetting.backlogLevel.name = backlogName;
        }
        teamSetting.backlogLevel.isValid = false;
    }

    /**
     * set the team to loading status
     * @param {string} setting - the current tab setting
     * @param {string} id - the id of tab setting that has change
     * @param {string} value - the current value of the team in setting
     */
    public setTeamToLoading(teamSetting: ITeamSettingData) {
        teamSetting.team = SkypeTeamTabBusinessLogic.loadingDummyField;
        teamSetting.teams = [SkypeTeamTabBusinessLogic.loadingDummyField];
    }

    /**
     * set the team to loading status
     * @param {string} teamSetting - the current tab setting
     * @param {string} id - the id of tab setting that has change
     * @param {string} value - the current value of the team in setting
     */
    public setBacklogToLoading(teamSetting: ITeamSettingData) {
        teamSetting.backlogLevel = SkypeTeamTabBusinessLogic.loadingDummyField;
        teamSetting.backlogLevels = [SkypeTeamTabBusinessLogic.loadingDummyField];
    }

    private _indexOfAnyCharCode(text: string, charCodes: number[]) {
        if (text) {
            for (let i = 0, length = text.length; i < length; ++i) {
                if (charCodes.indexOf(text.charCodeAt(i)) > -1) {
                    return i;
                }
            }
        }
        return -1;
    }

    /**
     * Validate if the value exist in the list of available projects in the setting.
     * @param {ITeamSettingData} setting - previous tab setting
     * @param {string} id - id of the tab setting
     * @param {string} value - the project value to verify
     */
    public tryGetProject(setting: ITeamSettingData, value: string): IFieldShallowReference {
        return this._tryGetValue(setting.projects, value);
    }

    /**
     * Validate if the value exist in the list of available teams in the setting.
     * @param {ITeamSettingData} setting - previous tab setting
     * @param {string} id - id of the tab setting
     * @param {string} value - the team value to verify
     */
    public tryGetTeam(setting: ITeamSettingData, value: string): IFieldShallowReference {
        return this._tryGetValue(setting.teams, value);
    }

    /**
     * Validate if the value exist in the list of available types in the setting.
     * @param {ITeamSettingData} setting - previous tab setting
     * @param {string} id - id of the tab setting
     * @param {string} value - the backlog value to verify
     */
    public tryGetBacklog(setting: ITeamSettingData, value: string): IFieldShallowReference {
        return this._tryGetValue(setting.backlogLevels, value);
    }

    private _tryGetValue(setting: IFieldShallowReference[], value: string): IFieldShallowReference {
        var item = setting.filter(x => x.name === value);
        if (item && item.length > 0) {
            return item[0];
        }
        return null;
    }

    /**
     * Get the board uri from a settings. This does not include the embedded flag.
     * @param settings - Team settings - must be defined and not null
     */
    private _getBoardUri(settings: ITeamSettingData, isEmbedded = "true"): string {
        if (settings == null) {
            throw new Error("tab setting cannot be null");
        }

        const { project, team, backlogLevel } = settings;
        const relativePath = getNavigationHistoryService().generateUrlForRoute(
            "ms.vss-work-web.microsoft-teams-board-tab-content-route",
            {
                [EmbeddedBoardRouteParameters.Project]: project.id,
                [EmbeddedBoardRouteParameters.Team]: team.id,
                [EmbeddedBoardRouteParameters.TeamName]: team.id,
                [EmbeddedBoardRouteParameters.Pivot]: EmbeddedBoardRouteParameters.BoardPivot,
                [EmbeddedBoardRouteParameters.BacklogLevel]: backlogLevel.name,
                [EmbeddedBoardRouteParameters.Embedded]: isEmbedded
            },
            StateMergeOptions.none
        );
        return `${window.location.origin}${relativePath}`;
    }

    /**
     * Create and return a deep copy of a given setting with new id.
     * @param {ITeamSettingData} setting - tab setting
     * @return Return a deep copy of a given setting with new id.
     */
    public cloneTeamSetting(setting: ITeamSettingData): ITeamSettingData {
        var id = GUIDUtils.newGuid();
        var project = this._cloneFieldRef(setting.project);
        var team = this._cloneFieldRef(setting.team);
        var backlogLevel = this._cloneFieldRef(setting.backlogLevel);
        var projects = this._cloneFieldRefArray(setting.projects);
        var teams = this._cloneFieldRefArray(setting.teams);
        var backlogLevels = this._cloneFieldRefArray(setting.backlogLevels);
        var settingDeepCopy = <ITeamSettingData>{
            id: id,
            account: setting.account,
            project: project,
            projects: projects,
            team: team,
            teams: teams,
            backlogLevel: backlogLevel,
            backlogLevels: backlogLevels,
        };

        return settingDeepCopy;
    }

    private _cloneFieldRef(fieldRef: IFieldShallowReference): IFieldShallowReference {
        return <IFieldShallowReference>$.extend({}, fieldRef);
    }

    private _cloneFieldRefArray(fieldRefs: IFieldShallowReference[]): IFieldShallowReference[] {
        var clone: IFieldShallowReference[] = [];
        fieldRefs.forEach(x => {
            clone.push(this._cloneFieldRef(x));
        });

        return clone;
    }
}
