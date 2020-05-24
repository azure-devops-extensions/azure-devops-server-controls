import * as Q from "q";

import * as VSS from "VSS/VSS";
import * as Contribution_Services from "VSS/Contributions/Services";
import * as Performance from "VSS/Performance";
import * as Serialization from "VSS/Serialization";
import * as VSS_Service from "VSS/Service";
import * as Settings from "VSS/Settings";
import * as Ajax from "VSS/Ajax";
import * as Utils_Core from "VSS/Utils/Core";
import * as VSS_Locations from "VSS/Locations";
import * as Context from "VSS/Context";
import * as VSS_Utils_Uri from "VSS/Utils/Url";
import * as Utils_Array from "VSS/Utils/Array";
import * as Utils_String from "VSS/Utils/String";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import { DataProviderQuery }  from "VSS/Contributions/Contracts";
import * as Contracts_Platform from "VSS/Common/Contracts/Platform";

import Favorites_Contracts = require("Favorites/Contracts");
import {TeamProjectReference, TeamProject, WebApiTeam} from "TFS/Core/Contracts";
import * as Core_RestClient from "TFS/Core/RestClient";
import * as Core_Contracts from "TFS/Core/Contracts";
import * as TFS_Rest_Utils from "Presentation/Scripts/TFS/TFS.Rest.Utils";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import Legacy_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");

import {TeamProjectMru, TeamProjectLineReference, ProjectHubItemTypes} from "MyExperiences/Scenarios/Projects/Contracts";
import * as MyExperiencesResources from "MyExperiences/Scripts/Resources/TFS.Resources.MyExperiences";
import {HubGroupLinksService} from "MyExperiences/Scenarios/Shared/HubGroupLinksService";

export interface WebApiTeamExtended {
    TeamName: string;
    TeamId: string;
    ProjectId: string;
}

export class ProjectDataService extends VSS_Service.VssService {
    private _webPageDataService: Contribution_Services.WebPageDataService;
    private _hubGroupLinksService: HubGroupLinksService;
    private _restClient: Core_RestClient.CoreHttpClient4;
    private _favoritesType: string = "Microsoft.TeamFoundation.Framework.Project";
    private _teamProjectMruContributionId: string = "ms.vss-tfs-web.team-project-mru-provider";
    private _projectTeamsLoaded: IDictionaryStringTo<TeamProjectLineReference[]> = {};
    private _projectsLoaded: TeamProjectLineReference[];
    private _allTeamsLoaded: TeamProjectLineReference[];
    private _searchPromise: IPromise<TeamProjectLineReference[]>;
    private _teamsLoading: IDictionaryStringTo<Q.Promise<TeamProjectLineReference[]>> = {};
    private _projectReferences: IDictionaryStringTo<TeamProjectLineReference> = {};
    private _topCount: number = 500;

    public getMostRecentlyUsed(): TeamProjectLineReference[] {

        let convertMrusToLineReferences = (mrus: TeamProjectMru[]) => {
            let lineReferences: TeamProjectLineReference[] = [];
            mrus && mrus.forEach((mru: TeamProjectMru) => {
                const projectContext: Contracts_Platform.ContextIdentifier = {
                    id: mru.projectId,
                    name: mru.projectName
                };

                let teamContext: Contracts_Platform.ContextIdentifier = null;
                if (mru.isTeam) {
                    teamContext = {
                        id: mru.teamId,
                        name: mru.teamName
                    };
                }

                const lineReference: TeamProjectLineReference = {
                    key: mru.isTeam ? mru.teamId : mru.projectId,
                    type: ProjectHubItemTypes.TeamProject,
                    teamId: mru.teamId,
                    projectId: mru.projectId,
                    teamName: mru.teamName,
                    projectName: mru.projectName,
                    isTeam: mru.isTeam,
                    description: mru.description,
                    lastAccessed: mru.lastAccessed,
                    quickLinks: this._getHubGroupLinksService().getHubGroups(projectContext, teamContext),
                    level: 0,
                    hashCode: mru.hashCode
                };

                lineReferences.push(lineReference);
            });

            return lineReferences;
        };

        const mrus = this._getWebPageDataService().getPageData<TeamProjectMru[]>(this._teamProjectMruContributionId);
        return convertMrusToLineReferences(mrus);
    }

    public areAllTeamsLoaded(): boolean {
        return !!this._allTeamsLoaded;
    }

    public myTeamsAndProjectsForSearch(): IPromise<TeamProjectLineReference[]> {
        if (this._allTeamsLoaded) {
            // Deep-copy refs
            const allTeamsLoadedCopy = $.extend(true, [], this._allTeamsLoaded);
            return Q(allTeamsLoadedCopy);
        }

        // Return promise unless it is rejected (we want to retry search on rejected case)
        if (this._searchPromise && Q.isPromise(this._searchPromise) && !Q.isRejected(this._searchPromise as Q.Promise<TeamProjectLineReference[]>)) {
            return this._searchPromise.then(refs => $.extend(true, [], refs)); // Deep-copy refs
        }

        let settings: JQueryAjaxSettings = {
            type: "GET",
            dataType: "json"
        }

        let url = VSS_Locations.urlHelper.getMvcUrl({
            area: "api",
            controller: "accountSearch",
            action: "getMyTeams"
        })

        this._searchPromise = Ajax.issueRequest(url, settings).then((value) => {
            let myTeams: TeamProjectLineReference[] = [];
            let webApiTeams: WebApiTeamExtended[] = value.teams;
            if (webApiTeams && webApiTeams.length > 0) {
                let teamsToSkip: WebApiTeamExtended[] = [];
                webApiTeams.forEach(webApiTeam => {
                    let projectLineReference = this._projectReferences[webApiTeam.ProjectId];
                    if (!projectLineReference) {
                        // we will just skip adding this one to the search list but add it to the skip
                        teamsToSkip.push(webApiTeam);
                    }
                    else if (projectLineReference && this._projectTeamsLoaded[projectLineReference.projectId]) {
                        teamsToSkip.push(webApiTeam);

                        let teamRef = Utils_Array.first(this._projectTeamsLoaded[projectLineReference.projectId],
                            ref => ref.teamId === webApiTeam.TeamId);
                        myTeams.push(teamRef);
                    }
                });
                teamsToSkip.forEach(x => Utils_Array.remove(webApiTeams, x));

                webApiTeams.forEach((teamReference) => {
                    let projectLineReference = this._projectReferences[teamReference.ProjectId];
                    if (!this._projectTeamsLoaded[projectLineReference.projectId]) {
                        this._projectTeamsLoaded[projectLineReference.projectId] = [];
                    }

                    let lineReference = this.webApiTeamToTeamProjectReference(
                        {
                            id: teamReference.TeamId,
                            name: teamReference.TeamName
                        } as WebApiTeam,
                        projectLineReference);
                    this._projectTeamsLoaded[projectLineReference.projectId].push(lineReference);

                    myTeams.push(lineReference);
                });
            }

            Utils_Array.addRange(myTeams, this._projectsLoaded);

            Utils_Array.sortIfNotSorted(myTeams,
                (x: TeamProjectLineReference, y: TeamProjectLineReference) => {
                    let compare = Utils_String.localeIgnoreCaseComparer(x.projectName, y.projectName);
                    if (compare === 0) {
                        return Utils_String.localeIgnoreCaseComparer(x.teamName, y.teamName);
                    }
                    else return compare;
                });

            this._allTeamsLoaded = myTeams;
            return $.extend(true, [], myTeams); // Deep-copy refs
        });

        return this._searchPromise;
    }

    public getProjectList(): IPromise<TeamProjectLineReference[]> {
        if (this._projectsLoaded) {
            // Deep-copy refs
            const projectsLoadedCopy = $.extend(true, [], this._projectsLoaded);
            return Q(projectsLoadedCopy);
        }

        Performance.getScenarioManager().split("account.projectHub.allProjects.start");

        return this._getProjects().then((references: TeamProjectReference[]) => {

            Performance.getScenarioManager().split("account.projectHub.allProjects.end");

            let lineReferences: TeamProjectLineReference[] = [];

            if(references){
                references.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));

                references.forEach((reference: TeamProjectReference) => {
                    let projectContext: Contracts_Platform.ContextIdentifier = {
                        id: reference.id,
                        name: reference.name
                    };

                    let lineReference: TeamProjectLineReference = {
                        key: reference.id,
                        type: ProjectHubItemTypes.TeamProject,
                        teamId: null,
                        projectId: reference.id,
                        teamName: null,
                        projectName: reference.name,
                        isTeam: false,
                        description: reference.description,
                        lastAccessed: null,
                        quickLinks: this._getHubGroupLinksService().getHubGroups(projectContext),
                        level: 0,
                        isExpandable: true
                    };
                    lineReferences.push(lineReference);
                    this._projectReferences[reference.id] = lineReference;
                });
            }

            this._projectsLoaded = lineReferences;
            return $.extend(true, [], lineReferences); // Deep-copy refs
        });
    }

    public getTeamsForProject(projectId: string): IPromise<TeamProjectLineReference[]> {

        const teams = this._projectTeamsLoaded[projectId];

        if (teams) {
            // sort the teams list of the project in the event that the search populated the data.
            Utils_Array.sortIfNotSorted(teams, (a, b) => Utils_String.localeIgnoreCaseComparer(a.teamName, b.teamName));

            // Deep-copy refs
            let teamsCopy = $.extend(true, [], teams);
            return Q(teamsCopy);
        }

        // Return promise if it isn't rejected (we want to retry loading teams on rejected case)
        const teamPromise = this._teamsLoading[projectId];
        if (teamPromise && !Q.isRejected(teamPromise)) {
            return teamPromise.then(refs => $.extend(true, [], refs)); // Deep-copy refs;
        }

        const projectPromise = this._getRestClient().getProject(projectId);
        const teamsPromise = this._getTeams(projectId);

        this._teamsLoading[projectId] = Q.all([projectPromise, teamsPromise])
            .spread<TeamProjectLineReference[]>((project: TeamProject, teams: WebApiTeam[]) => {
                let lineReferences: TeamProjectLineReference[] = [];

                // Sort alphabetically
                teams.sort((a, b) => Utils_String.localeIgnoreCaseComparer(a.name, b.name));

                teams.forEach((team: WebApiTeam) => {
                    // Omit default team from team list
                    if (team.id !== project.defaultTeam.id) {
                        lineReferences.push(
                            this.webApiTeamToTeamProjectReference(
                                team,
                                this._projectReferences[projectId]
                            ));
                    }
                });

                this._projectTeamsLoaded[projectId] = lineReferences;
                return $.extend(true, [], lineReferences); // Deep-copy refs
            });

        return this._teamsLoading[projectId];
    }

    public removeItemFromMru(hashCode: number): IPromise<void> {
        const tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        const url = tfsContext.getActionUrl("RemoveNavigationMRUEntry", "common", { area: "api" });

        const deferred = Q.defer<void>();
        Legacy_Ajax.postHTML(url, { mruEntryHashCode: hashCode }, deferred.resolve, deferred.reject);
        return deferred.promise;
    }

    private webApiTeamToTeamProjectReference(webApiTeam: WebApiTeam, projectReference: TeamProjectLineReference): TeamProjectLineReference {
        const projectContext: Contracts_Platform.ContextIdentifier = {
            id: projectReference.projectId,
            name: projectReference.projectName
        };

        const teamContext: Contracts_Platform.ContextIdentifier = {
            id: webApiTeam.id,
            name: webApiTeam.name
        };

        const lineReference: TeamProjectLineReference = {
            key: teamContext.id,
            type: ProjectHubItemTypes.TeamProject,
            teamId: teamContext.id,
            projectId: projectContext.id,
            teamName: teamContext.name,
            projectName: projectContext.name,
            isTeam: true,
            description: webApiTeam.description,
            lastAccessed: null,
            quickLinks: this._getHubGroupLinksService().getHubGroups(projectContext, teamContext),
            level: 1
        };
        return lineReference;
    }

    private _getTeams(projectId: string): IPromise<WebApiTeam[]> {
        const restClient = this._getRestClient();
        const getTeams = (top: number, skip: number) => restClient.getTeams(projectId, top, skip);
        return TFS_Rest_Utils.batchGet(getTeams, this._topCount);
    }

    private _getProjects(): IPromise<TeamProjectReference[]> {
        const restClient = this._getRestClient();
        const getProjects = (top: number, skip: number) => restClient.getProjects("WellFormed", top, skip);
        return TFS_Rest_Utils.batchGet(getProjects, this._topCount);
    }

    // public for UT
    public _getWebPageDataService(): Contribution_Services.WebPageDataService {
        if (!this._webPageDataService) {
            this._webPageDataService = VSS_Service.getService(Contribution_Services.WebPageDataService);
        }

        return this._webPageDataService;
    }

    // public for UT
    public _getHubGroupLinksService(): HubGroupLinksService {
        if (!this._hubGroupLinksService) {
            this._hubGroupLinksService = VSS_Service.getService(HubGroupLinksService);
        }

        return this._hubGroupLinksService;
    }

    // public for UT
    public _getRestClient(): Core_RestClient.CoreHttpClient4 {
        if (!this._restClient) {
            this._restClient = VSS_Service.getClient(Core_RestClient.CoreHttpClient4);
        }

        return this._restClient;
    }
}