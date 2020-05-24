import * as Q from "q";
import * as CoreContracts from "TFS/Core/Contracts";
import * as CoreRestClient from "TFS/Core/RestClient";
import * as TFS_Core_Contracts from "TFS/Core/Contracts";
import * as VSSService from "VSS/Service";
import * as WorkRestClient from "TFS/Work/RestClient";
import * as WorkContracts from "TFS/Work/Contracts";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import {ISkypeTeamTabMapper} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/ISkypeTeamTabMapper";
import {ITeamSettingData, IFieldShallowReference, IProjectData, ITeamConfiguration} from "Presentation/Scripts/TFS/SkypeTeamTabs/KanbanBoards/Models/SkypeTeamTabInterfaces";

export class SkypeTeamTabDataProvider {
    public static TOP_TEAM_COUNT = 500;
    public static PROJECT_MAX_REQUEST_COUNT = 1000;
    private _mapper: ISkypeTeamTabMapper;
    private _coreHttpClient: CoreRestClient.CoreHttpClient2_3;
    private _workHttpClient: WorkRestClient.WorkHttpClient3;

    constructor(mapper: ISkypeTeamTabMapper) {
        this._mapper = mapper;
    }

    /**
     * Get the http REST client for Agile Work
     * @return {WorkHttpClient3} The agile http client
     */
    protected getWorkHttpClient(): WorkRestClient.WorkHttpClient3 {
        if (!this._workHttpClient) {
            var tfsConnection: VSSService.VssConnection = new VSSService.VssConnection(TFS_Host_TfsContext.TfsContext.getDefault().contextData);
            this._workHttpClient = tfsConnection.getHttpClient<WorkRestClient.WorkHttpClient3>(WorkRestClient.WorkHttpClient3);
        }
        return this._workHttpClient;
    }

    /**
     * Get the http REST client for Core
     * @return {WorkHttpClient3} The core http client
     */
    protected getCoreHttpClient() {
        if (!this._coreHttpClient) {
            var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            var tfsConnection: VSSService.VssConnection = new VSSService.VssConnection(tfsContext.contextData);
            this._coreHttpClient = tfsConnection.getHttpClient<CoreRestClient.CoreHttpClient2_3>(CoreRestClient.CoreHttpClient2_3);
        }
        return this._coreHttpClient;
    }

    /**
     * Get all projects for the collection
     * @returns {IFieldShallowReference[]} the array of projects
     */
    protected getProjects(): IPromise<IFieldShallowReference[]> {
        // Promise to be reolved when we have all the projects
        let promiseAllProjectsReady = Q.defer<IFieldShallowReference[]>();

        let allProjects: TFS_Core_Contracts.TeamProjectReference[] = [];

        let getProjectsComplete = (projects: TFS_Core_Contracts.TeamProjectReference[]) => {
            allProjects = allProjects.concat(projects);

            // If we got back the max number of projects, there might be more, so make another call
            if(projects.length === SkypeTeamTabDataProvider.PROJECT_MAX_REQUEST_COUNT) {
                this.getCoreHttpClient().getProjects(null, SkypeTeamTabDataProvider.PROJECT_MAX_REQUEST_COUNT, allProjects.length)
                    .then(getProjectsComplete, function (err) {promiseAllProjectsReady.reject(err)});
                return;
            }

            // We have all the projects, map them and resolve the prommise
            const result: IFieldShallowReference[] = this._mapper.mapProjects(allProjects);
            promiseAllProjectsReady.resolve(result);
        };

        this.getCoreHttpClient().getProjects(null, SkypeTeamTabDataProvider.PROJECT_MAX_REQUEST_COUNT, 0)
            .then(getProjectsComplete, function (err) {promiseAllProjectsReady.reject(err)});
        return promiseAllProjectsReady.promise;
    }

    /**
     * Get all teams based on a given project id
     * @param {string} projectId the id of project
     * @returns {IFieldShallowReference[]} the array of teams under the given projects
     */
    public getTeams(projectId: string): IPromise<IFieldShallowReference[]> {
        return this._getTeamsInternal(projectId, SkypeTeamTabDataProvider.TOP_TEAM_COUNT, 0).then((result) => {
            var teams = this._mapper.mapTeams(result);
            return teams;
        });
    }

    /**
    * Get all teams based on a given project id starting from skip to retrieving all teams.
    * @param {string} projectId the id of project
    * @param {number} top - number of teams to retrieve from server at one time.
    * @param {number} skip - number to skip teams being retrieved.
    * @returns {IFieldShallowReference[]} the array of teams under the given projects
    */
    private _getTeamsInternal(projectId: string, top: number, skip: number): IPromise<CoreContracts.WebApiTeam[]> {
        var startTime = Date.now();
        var allResult: CoreContracts.WebApiTeam[] = [];
        return this.getCoreHttpClient().getTeams(projectId, top, skip)
            .then((teams: CoreContracts.WebApiTeam[]) => {
                // get all teams by recursively increasing skip number until no more team to retrieve.
                allResult = teams;

                // recursive case
                if (teams && teams.length >= top) {
                    skip += teams.length;
                    return this._getTeamsInternal(projectId, top, skip);
                }

                // base case
                var serverHitCount = skip / top;
                var totalItemsRetrieved = teams ? (serverHitCount * top) + teams.length : (serverHitCount * top);
                return Q.resolve([]);
            })
            .then((teams: CoreContracts.WebApiTeam[]) => {
                // merge teams by looping from the recursion.
                allResult.push(...teams);
                return allResult;
            });
    }

    /**
     * Get all backlog levels based on a given project id
     * @param {string} projectId the id of project
     * @returns {IFieldShallowReference[]} the array of backlog levels for the given projects
     */
    public getBacklogLevels(projectId: string): IPromise<IFieldShallowReference[]> {
        const teamContext: TFS_Core_Contracts.TeamContext = { projectId: projectId, teamId: null, project: null, team: null };
        return this.getWorkHttpClient().getBacklogConfigurations(teamContext).then((backlogConfig: WorkContracts.BacklogConfiguration) => {
            return this._mapper.mapBacklogLevels(backlogConfig);
        });
    }

    /**
     * Get project data given a project id and name
     * @returns {IProjectData} the teams and their backlog Levels for the given project
     */
    public getProjectData(project: IFieldShallowReference): IPromise<IProjectData> {
        return Q.all([this.getTeams(project.id), this.getBacklogLevels(project.id)]).then((result: IFieldShallowReference[][]) => {
            return <IProjectData>{
                project: project,
                teams: result[0],
                allBacklogs: result[1]
            };
        });
    }

    /**
     * Get initial payload to populate data for wizard experience
     * We are geting all teams and backlog levels for the current project.
     * @returns {ITeamSettingData} the initial payload
     */
    public getInitialPayload(): IPromise<ITeamSettingData> {
        return this.getProjects().then((projects: IFieldShallowReference[]) => {
            if (projects && projects.length > 0) {
                var currentProjectId = projects[0].id;
                return Q.all([this.getTeams(currentProjectId), this.getBacklogLevels(currentProjectId)]).spread((teams: IFieldShallowReference[], allbacklogs: IFieldShallowReference[]) => {
                    return this._mapper.mapInitialSetting(projects, teams, allbacklogs);
                });
            }
            else {
                return this._mapper.mapInitialSetting([], [], []);
            }
        });

    }

    /**
     * Get all backlog levels based on a given project id
     * @param {string} projectId the id of project
     * @returns {IFieldShallowReference[]} the array of backlog levels for the given projects
     */
    public getTeamConfiguration(project: IFieldShallowReference, team: IFieldShallowReference, allBacklogs: IFieldShallowReference[]): IPromise<ITeamConfiguration> {
        const options = {
            projectId: project.id,
            project: project.name,
            teamId: team.id,
            team: team.name
        };
        return this.getWorkHttpClient().getTeamSettings(options).then((teamSetting: WorkContracts.TeamSetting) => {
            return this._mapper.mapTeamConfiguration(team, teamSetting, allBacklogs);
        });
    }
}