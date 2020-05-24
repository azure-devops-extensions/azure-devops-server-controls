import { IProjectData, ITeamConfiguration } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";

/**
  * This cache stores the project information and team configuration.
  */
export interface ITeamProjectDataCache {
    /**
     * Initialize cache with default project and default team data
     * @param {IProjectData} initialProjectData - deafult project data
     * @param {ITeamConfiguration} initialTeamData - deafult team data
     */
    initialize(initialProjectData: IProjectData, initialTeamData: ITeamConfiguration);

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

    /**
     * Indicates if we are currently requesting a teams configuration
     * @param  {string} teamId - the team id
     * @return {boolean} True if the data is being requested; False if it is not
     */
    isTeamConfigurationBeingRequested(teamId: string): boolean;

    /**
     * Gets a teams configuration request promise to be waited on
     * @param  {string} teamId - the team id
     * @return {IPromise<ITeamConfiguration>} The promise that will be resolved when the team config request is complete
     */
    getTeamConfigurationBeingRequest(teamId: string): IPromise<ITeamConfiguration>;

    /**
     * Stores a teams configuration request so that other team settings rows may wait on the same promise
     * @param  {string} teamId - the team id
     * @param  {IPromise<ITeamConfiguration>} promise - The promise that will be resolved when the teams configuration request is completed
     */
    setTeamConfigurationRequest(teamId: string, promise: IPromise<ITeamConfiguration>): void;

    /**
     * Removes a team configuration request from the cache as it has been resolved
     * @param  {string} teamId - the team id
     */
    clearTeamConfigurationRequest(teamId: string): void;
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
    * The cached team configuration requests: A dictionary of team id to IPromise<ITeamConfiguration> which are resolved when the request is complete
    */
    private teamConfigurationRequests: IDictionaryStringTo<IPromise<ITeamConfiguration>> = {};

    /**
     * Initialize cache with default project and default team data
     */
    public initialize(initialProjectData: IProjectData, initialTeamData: ITeamConfiguration) {
        if (!initialProjectData || !initialTeamData) {
            throw new Error("initial project or team data cannot be null");
        }
        this.projects = { [initialProjectData.project.id]: initialProjectData };
        this.teamConfiguration = { [initialTeamData.team.id]: initialTeamData };
    }

    /**
     * Get cached project data by project id
     * @return {IProjectData} The stored project data
     */
    public getProjectData(projectId: string): IProjectData {
        return this.projects[projectId];
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
        return !!this.projects[projectId];
    }

    /**
     * Get cached team configuration by team id
     * @return {ITeamConfiguration} The stored team configuration
     */
    public getTeamConfiguration(teamId: string): ITeamConfiguration {
        return this.teamConfiguration[teamId];
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
        return !!this.teamConfiguration[teamId];
    }


    /**
     * Indicates if we are currently requesting a teams configuration
     * @param  {string} teamId - the team id
     * @return {boolean} True if the data is being requested; False if it is not
     */
    public isTeamConfigurationBeingRequested(teamId: string): boolean {
        return !!this.teamConfigurationRequests[teamId];
    }

    /**
     * Gets a teams configuration request promise to be waited on
     * @param  {string} teamId - the team id
     * @return {IPromise<ITeamConfiguration>} The promise that will be resolved when the team config request is complete
     */
    public getTeamConfigurationBeingRequest(teamId: string): IPromise<ITeamConfiguration> {
        return this.teamConfigurationRequests[teamId];
    }

    /**
     * Stores a teams configuration request so that other team settings rows may wait on the same promise
     * @param  {string} teamId - the team id
     * @param  {IPromise<ITeamConfiguration>} promise - The promise that will be resolved when the teams configuration request is completed
     */
    public setTeamConfigurationRequest(teamId: string, promise: IPromise<ITeamConfiguration>): void {
        this.teamConfigurationRequests[teamId] = promise;
    }

    /**
     * Removes a team configuration request from the cache as it has been resolved
     * @param  {string} teamId - the team id
     */
    public clearTeamConfigurationRequest(teamId: string): void {
        delete this.teamConfigurationRequests[teamId];
    }
}