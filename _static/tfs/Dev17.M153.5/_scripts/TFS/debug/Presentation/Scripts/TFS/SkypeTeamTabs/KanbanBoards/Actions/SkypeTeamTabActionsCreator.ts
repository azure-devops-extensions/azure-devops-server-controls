import * as VSS from "VSS/VSS";
import * as TFS_Core_Utils from "Presentation/Scripts/TFS/TFS.Core.Utils";

import {SkypeTeamTabActions} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabActions";
import {SkypeTeamTabBusinessLogic} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/SkypeTeamTabBusinessLogic";
import {ISkypeTeamTabRequestCache} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Actions/ServerRequestCache";
import {ISkypeTeamTabDataProvider} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/DataProviders/ISkypeTeamTabDataProvider";
import {ITeamSettingData, IFieldShallowReference, IProjectData, ITeamConfiguration } from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";
import {ITeamProjectDataCache, TeamProjectDataCache} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/DataProviders/TeamProjectDataCache";
import {SkypeTeamTabTelemetry} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Utils/Telemetry";

export interface ISkypeTeamTabActionCreator {
    /**
     * Initialize the delivery timeline tab experience
     * @param {IDictionaryStringTo<any[]>} initialsetting - the initialsetting
     */
    initializeStore(initialSetting: IDictionaryStringTo<any[]>): void;

    /**
     * Change the project selection
     * @param {ITeamSettingData} setting - previous tab setting
     * @param {string} value - project value
     */
    changeProject(setting: ITeamSettingData, value: string): void;

    /**
     * Change the team selection
     * @param {ITeamSettingData} setting - previous tab setting
     * @param {string} value - team value
     */
    changeTeam(setting: ITeamSettingData, value: string): void;

    /**
     * Change the work item type selection
     * @param {ITeamSettingData} setting - previous tab setting
     * @param {string} value - the backlog level value
     */
    changeBacklogLevel(setting: ITeamSettingData, value: string): void;

    /**
     * Set the global page message
     * @param {string} message - page message
     */
    setMessage(message: string): void;
}

export class SkypeTeamTabActionCreator implements ISkypeTeamTabActionCreator {
    private _tabDataProvider: ISkypeTeamTabDataProvider;
    private _actions: SkypeTeamTabActions;
    private _serverRequestCache: ISkypeTeamTabRequestCache;

    protected _teamProjectDataCache: ITeamProjectDataCache;
    protected _logic: SkypeTeamTabBusinessLogic;

    constructor(viewsDataProvider: ISkypeTeamTabDataProvider, actions: SkypeTeamTabActions, cache: ISkypeTeamTabRequestCache) {
        this._tabDataProvider = viewsDataProvider;
        this._actions = actions;
        this._teamProjectDataCache = new TeamProjectDataCache();
        this._logic = SkypeTeamTabBusinessLogic.getInstance();
        this._serverRequestCache = cache;
    }

    /**
     * Initialize the delivery timeline tab experience
     */
    public initializeStore() {
        this._tabDataProvider.getInitialPayload().then((setting: ITeamSettingData) => {
            if (!setting.projects || setting.projects.length === 0) {
                SkypeTeamTabTelemetry.onNoTeamProjectsAvailable();
            }
            this._raiseSettingChanged(setting);
        }, (error: Error) => {
            this._actions.setMessage.invoke(VSS.getErrorMessage(error));
        });
    }

    /**
     * Change the project selection
     * @param {ITeamSettingData} setting - previous tab setttings
     * @param {string} id - id of the tab setting
     * @param {string} value - project value
     */
    public changeProject(setting: ITeamSettingData, value: string) {
        var project = this._logic.tryGetProject(setting, value);
        if (project) {
            this._updateProject(setting, project);
        }
        else {
            // if value not exist in the list of available projects, set project for that setting to be invalid.
            this._logic.updateProjectName(setting, value);
            this._raiseSettingChanged(setting);
        }
    }

    protected _updateProject(setting: ITeamSettingData, project: IFieldShallowReference) {
        if (this._teamProjectDataCache.isProjectCached(project.id)) {
            // If project data exists in the cache
            var projectData = this._teamProjectDataCache.getProjectData(project.id);
            this._logic.updateProject(setting, projectData);
            this._raiseSettingChanged(setting);
        }
        else {
            // if project data not exist in cache
            this._setTeamAndBacklogLoading(setting);
            this._loadProject(setting, project);
        }
    }

    protected _loadProject(setting: ITeamSettingData, project: IFieldShallowReference) {
        // set the lastest project id corresponding to the setting id that will send to get data from server.
        this._serverRequestCache.set(setting.id, project.id);
        this._tabDataProvider.getProjectData(project).then((projectData: IProjectData) => {
            // update cache
            this._teamProjectDataCache.setProjectData(project.id, projectData);
            this._logic.updateProject(setting, projectData);
            if (this._serverRequestCache.get(setting.id) === projectData.project.id) {
                // only invoke setting changed if the project retrieved is the lastest project that was asked for given the setting id.
                this._serverRequestCache.delete(setting.id);
                this._raiseSettingChanged(setting);
            }
        }, (error: Error) => {
            this._serverRequestCache.delete(setting.id);
            this._actions.setMessage.invoke(VSS.getErrorMessage(error));
        });
    }

    /**
     * Change the team selection
     * @param {ITeamSettingData} setting - previous tab setttings
     * @param {string} id - id of the tab setting
     * @param {string} value - team value
     */
    public changeTeam(setting: ITeamSettingData, value: string) {
        var team = this._logic.tryGetTeam(setting, value);
        if (team) {
            this._updateTeam(setting, team);
        }
        else {
            // if value not exist in the list of available teams, set project for that setting to be invalid.
            this._logic.updateTeamName(setting, value);
            this._raiseSettingChanged(setting);
        }
    }

    protected _updateTeam(setting: ITeamSettingData, team: IFieldShallowReference) {
        if (this._teamProjectDataCache.isTeamConfigurationCached(team.id)) {
            // if team exist in cache
            var teamData = this._teamProjectDataCache.getTeamConfiguration(team.id);
            this._logic.updateTeam(setting, teamData);
            this._raiseSettingChanged(setting);
        }
        else {
            // if team setting not exist in cache
            this._setBacklogLoading(setting);
            this._loadTeam(setting, team);
        }
    }

    protected _loadTeam(setting: ITeamSettingData, team: IFieldShallowReference) {
        // set the lastest team id corresponding to the setting id that will send to get data from server.
        this._serverRequestCache.set(setting.id, team.id);
        var project = setting.project;
        var projectData = this._teamProjectDataCache.getProjectData(project.id);
        this._tabDataProvider.getTeamConfiguration(project, team, projectData.allBacklogs)
            .then((teamConfig: ITeamConfiguration) => {
                // update cache
                this._teamProjectDataCache.setTeamConfiguration(team.id, teamConfig);
                this._logic.updateTeam(setting, teamConfig);
                if (this._serverRequestCache.get(setting.id) === teamConfig.team.id) {
                    // only invoke setting changed if the team retrieved is the lastest team that was asked for given the setting id.
                    this._serverRequestCache.delete(setting.id);
                    this._raiseSettingChanged(setting);
                }
            }, (error: Error) => {
                this._actions.setMessage.invoke(VSS.getErrorMessage(error));
            });
    }

    /**
    * Change the work item type selection
    * @param {ITeamSettingData} setting - previous tab setttings
    * @param {string} id - id of the tab setting
    * @param {string} value - the backlog level value
    */
    public changeBacklogLevel(setting: ITeamSettingData, value: string) {
        var backlog = this._logic.tryGetBacklog(setting, value);
        if (!backlog) {
            this._logic.updateBacklogName(setting, value);
        }
        else {
            this._logic.updateBacklogLevel(setting, backlog);
        }
        this._raiseSettingChanged(setting);
    }

    public setMessage(message: string) {
        this._actions.setMessage.invoke(message);
    }

    /**
     * Invoke the tabSettingChanged event that tab is listening to
     * @param {string} setting - the current setting
     */
    private _raiseSettingChanged(setting: ITeamSettingData) {
        this._actions.settingChanged.invoke(setting);
    }

    /**
     * Invoke when setting is changing while waiting for server.
     * @param {string} setting - the current setting
     * @param {string} id - the id of the tab setting.
     */
    private _setTeamAndBacklogLoading(setting: ITeamSettingData) {
        this._logic.setTeamToLoading(setting);
        this._setBacklogLoading(setting);
    }

    private _setBacklogLoading(setting: ITeamSettingData) {
        this._logic.setBacklogToLoading(setting);
        this._raiseSettingChanged(setting);
    }
}