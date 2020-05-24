import {ITeamSettingData, IProjectData, IFieldShallowReference, ITeamConfiguration} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";

/**
  * This cache stores the project information and team configuration.
  */
export interface ITeamProjectDataCache {
    /**
     * Get cached project data by project id
     * @param  {string} projectId - the project id
     * @return {IProjectData} The stored project data
     */
    getProjectData(projectId: string): IProjectData;

    /**
     * Set the project data to cache
     * @param {string} projectId - the project id
     * @param {IProjectData} projectData - the project data for the given project
     */
    setProjectData(projectId: string, projectData: IProjectData);

    /**
    * Indicate if we need to do an asynchronous call to get more data from server for the given project
    * @param  {string} projectId - the project id
    * @return {boolean} True if more data needed; False if no need to get more information
    */
    isProjectCached(projectId: string): boolean;

    /**
     * Get cached team configuration by team id
     * @param  {string} teamId - the team id
     * @return {ITeamConfiguration} The stored team configuration
     */
    getTeamConfiguration(teamId: string): ITeamConfiguration;

    /**
     * Set the team configuration to cache
     * @param {string} teamId - the team id
     * @param {ITeamConfiguration} teamConfiguration - the team data for the given team
     */
    setTeamConfiguration(teamId: string, teamConfiguration: ITeamConfiguration);

    /**
     * Indicate if we need to do an asynchronous call to get more data from server for the given team
     * @param  {string} teamId - the team id
     * @return {boolean} True if more data needed; False if no need to get more information
     */
    isTeamConfigurationCached(teamId: string): boolean;
}


export class TeamProjectDataCache implements ITeamProjectDataCache {
    /**
     * The cached project data: A dictionary of project id to IProjectData
     */
    private projects: IDictionaryStringTo<IProjectData>;
    /**
     * The cached team configuration: A dictionary of team id to team configuration
     */
    private teamConfiguration: IDictionaryStringTo<ITeamConfiguration>;

    /**
     * Get cached project data by project id
     * @return {IProjectData} The stored project data
     */
    public getProjectData(projectId: string): IProjectData {
        if (this.projects) {
            return this.projects[projectId];
        }
        return null;
    }

    /**
     * Set the project data to cache
     */
    public setProjectData(projectId: string, projectData: IProjectData) {
        if (!projectId) {
            throw new Error("Invalid project id");
        }
        if (!this.projects) {
            this.projects = {};
        }
        this.projects[projectId] = projectData;
    }

    /**
    * Indicate if we need to do an asynchronous call to get more data from server for the given project
    * @return {boolean} True if more data needed; False if no need to get more information
    */
    public isProjectCached(projectId: string): boolean {
        return this.projects && !!this.projects[projectId];
    }

    /**
     * Get cached team configuration by team id
     * @return {ITeamConfiguration} The stored team configuration
     */
    public getTeamConfiguration(teamId: string): ITeamConfiguration {
        return this.teamConfiguration && this.teamConfiguration[teamId];
    }

    /**
     * Set the team configuration to cache
     */
    public setTeamConfiguration(teamId: string, teamConfiguration: ITeamConfiguration) {
        if (!teamId) {
            throw new Error("Invalid team id");
        }
        if (!this.teamConfiguration) {
            this.teamConfiguration = {};
        }
        this.teamConfiguration[teamId] = teamConfiguration;
    }

    /**
     * Indicate if we need to do an asynchronous call to get more data from server for the given team
     * @return {boolean} True if more data needed; False if no need to get more information
     */
    public isTeamConfigurationCached(teamId: string): boolean {
        return this.teamConfiguration && !!this.teamConfiguration[teamId];
    }
}