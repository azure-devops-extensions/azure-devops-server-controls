import Q = require("q");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import WorkContract = require("TFS/Work/Contracts");
import Context = require("VSS/Context");
import { ScaledAgileTelemetry, ViewPerfScenarioManager } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";
import { BaseDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/BaseDataProvider";
import { IDeliveryTimelineTeamSettingsDataProviders } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/DataProviders/IDeliveryTimelineTeamSettingsDataProviders";
import { IProjectData, IInitialPayload, ITeamConfiguration, ITeamSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { IFieldShallowReference } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { IDeliveryTimelineTeamSettingsMapper } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineTeamSettingsMapper";
import { BacklogConfigurationService, BacklogConfiguration } from "Presentation/Scripts/TFS/FeatureRef/BacklogConfiguration/Service";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

export class DeliveryTimelineTeamSettingsDataProviders extends BaseDataProvider implements IDeliveryTimelineTeamSettingsDataProviders {
    public static TOP_TEAM_COUNT = 500;
    public static PROJECT_MAX_REQUEST_COUNT = 1000;
    private _mapper: IDeliveryTimelineTeamSettingsMapper;

    constructor(mapper: IDeliveryTimelineTeamSettingsMapper) {
        super();
        this._mapper = mapper;
    }

    /**
     * Get all projects for the collection
     * CoreHttpClient().getProjects allows a maximum of 1000 projects per call,
     * so we have to query the projects in multiple calls and then return the
     * combined result
     * @returns {IFieldShallowReference[]} the array of projects
     */
    public getProjects(): IPromise<IFieldShallowReference[]> {
        // Promise to be reolved when we have all the projects
        let promiseAllProjectsReady = Q.defer<IFieldShallowReference[]>();

        let allProjects: TFS_Core_Contracts.TeamProjectReference[] = [];

        let getProjectsComplete = (projects: TFS_Core_Contracts.TeamProjectReference[]) => {
            allProjects = allProjects.concat(projects);

            // If we got back the max number of projects, there might be more, so make another call
            if (projects.length === DeliveryTimelineTeamSettingsDataProviders.PROJECT_MAX_REQUEST_COUNT) {
                this._getCoreHttpClient().getProjects(null, DeliveryTimelineTeamSettingsDataProviders.PROJECT_MAX_REQUEST_COUNT, allProjects.length)
                    .then(getProjectsComplete, function (err) { promiseAllProjectsReady.reject(err) });
                return;
            }

            // We have all the projects, map them and resolve the prommise
            const result: IFieldShallowReference[] = this._mapper.mapProjects(allProjects);
            promiseAllProjectsReady.resolve(result);
        };

        this._getCoreHttpClient().getProjects(null, DeliveryTimelineTeamSettingsDataProviders.PROJECT_MAX_REQUEST_COUNT, 0)
            .then(getProjectsComplete, function (err) { promiseAllProjectsReady.reject(err) });
        return promiseAllProjectsReady.promise;
    }

    /**
     * Get all teams based on a given project id
     * @param {string} projectId the id of project
     * @returns {IFieldShallowReference[]} the array of teams under the given projects
     */
    public getTeams(projectId: string): IPromise<IFieldShallowReference[]> {
        return this._getTeamsInternal(projectId, DeliveryTimelineTeamSettingsDataProviders.TOP_TEAM_COUNT, 0).then((result) => {
            return this._mapper.mapTeams(result);
        });
    }

    /**
    * Get all teams based on a given project id starting from skip to retrieving all teams.
    * @param {string} projectId the id of project
    * @param {number} top - number of teams to retrieve from server at one time.
    * @param {number} skip - number to skip teams being retrieved.
    * @returns {IFieldShallowReference[]} the array of teams under the given projects
    */
    private _getTeamsInternal(projectId: string, top: number, skip: number): IPromise<TFS_Core_Contracts.WebApiTeam[]> {
        let startTime = Date.now();
        let allResult: TFS_Core_Contracts.WebApiTeam[] = [];
        return this._getCoreHttpClient().getTeams(projectId, top, skip)
            .then((teams: TFS_Core_Contracts.WebApiTeam[]) => {
                // get all teams by recursively increasing skip number until no more team to retrieve.
                allResult = teams;

                // recursive case
                if (teams && teams.length >= top) {
                    skip += teams.length;
                    return this._getTeamsInternal(projectId, top, skip);
                }

                // base case
                let serverHitCount = skip / top;
                let totalItemsRetrieved = teams ? (serverHitCount * top) + teams.length : (serverHitCount * top);
                ScaledAgileTelemetry.onGetAllTeams(totalItemsRetrieved, top, serverHitCount + 1, startTime);
                return Q.resolve([]);
            })
            .then<TFS_Core_Contracts.WebApiTeam[]>((teams: TFS_Core_Contracts.WebApiTeam[]) => {
                // merge teams by looping from the recursion.
                allResult.push(...teams);
                return Q.resolve(allResult);
            });
    }

    /**
     * Get all backlog levels based on a given project id
     * @param {string} projectId the id of project 
     * @returns {IFieldShallowReference[]} the array of backlog levels for the given projects
     */
    public getBacklogLevels(projectId: string): IPromise<IFieldShallowReference[]> {
        // Note: We can move this call from project level to team level
        // Then the backlog visibility for the selected team will be taken into consideration in one call.
        // With that, we can remove the seperate get team setting ajax call.
        ViewPerfScenarioManager.split("Wizard_LoadBacklogConfigurationStart");
        const projectLevelContext = $.extend({}, Context.getDefaultWebContext(), {
            project: {
                id: projectId,
                name: null
            },
            team: null
        }) as WebContext;
        // Since this is project level context, we do not need to pass team information.
        return this.beginGetBacklogConfiguration(new TfsContext(projectLevelContext)).then((backlogConfiguration: BacklogConfiguration) => {
            ViewPerfScenarioManager.split("Wizard_LoadBacklogConfigurationEnd");
            return this._mapper.mapBacklogLevels(backlogConfiguration);
        });
    }

    /**
     * Get project data given a project id and name
     * @returns {IProjectData} the teams and their backlog Levels for the given project
     */
    public getProjectData(project: IFieldShallowReference): IPromise<IProjectData> {
        return Q.all([this.getTeams(project.id), this.getBacklogLevels(project.id)]).then((result: IFieldShallowReference[][]) => {
            return {
                project: project,
                teams: result[0],
                allBacklogs: result[1]
            } as IProjectData;
        });
    }

    /**
     * Get initial payload to populate data for wizard experience
     * We are geting all teams and backlog levels for the current project. 
     * @returns {ITeamSettingData} the initial payload
     */
    public getInitialPayload(): IPromise<IInitialPayload> {
        let teamContext = this._getTeamContext();
        let currentProjectId = teamContext.projectId;
        return Q.all([this.getProjects(), this.getTeams(currentProjectId), this.getBacklogLevels(currentProjectId)])
            .spread((projects: IFieldShallowReference[], teams: IFieldShallowReference[], allbacklogs: IFieldShallowReference[]) => {
                let initialSetting = this._mapper.mapInitialSetting(projects, teams, allbacklogs, teamContext);
                return this._constructInitialPayload(initialSetting, teams, allbacklogs);
            });
    }

    /**
     * Get backlog configuration asynchronously using BacklogConfigurationService.beginGetBacklogConfiguration.
     * Wrapped in a separate method to mock it for unit testing.
     * @param tfsContext
     */
    public beginGetBacklogConfiguration(tfsContext: TfsContext): IPromise<BacklogConfiguration> {
        return BacklogConfigurationService.beginGetBacklogConfiguration(null, tfsContext);
    }

    private _constructInitialPayload(initialSetting: ITeamSettingData, teams: IFieldShallowReference[], allbacklogs: IFieldShallowReference[]): IPromise<IInitialPayload> {
        return this.getTeamConfiguration(initialSetting.project, initialSetting.team, allbacklogs).then((teamConfig: ITeamConfiguration) => {
            initialSetting.backlogLevels = teamConfig.visibleBacklogs;
            return {
                initialSetting: initialSetting,
                initialTeamData: teamConfig,
                initialProjectData: {
                    project: initialSetting.project,
                    teams: teams,
                    allBacklogs: allbacklogs
                }
            };
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
        return this._getWorkHttpClient().getTeamSettings(options).then((teamSetting: WorkContract.TeamSetting) => {
            return this._mapper.mapTeamConfiguration(team, teamSetting, allBacklogs);
        });
    }

}
