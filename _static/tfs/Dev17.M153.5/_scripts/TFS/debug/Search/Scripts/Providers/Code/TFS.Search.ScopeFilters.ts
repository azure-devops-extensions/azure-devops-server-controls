// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Base_Contracts = require("Search/Scripts/Contracts/TFS.Search.Base.Contracts");
import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Core_Contracts = require("Search/Scripts/Contracts/TFS.Search.Core.Contracts");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import ProjectList = require("Search/Scripts/Providers/Code/TFS.Search.ProjectList");
import Search_Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import ViewBuilder = require("Search/Scripts/Common/TFS.Search.ViewBuilder");
import SearchRepoWebApi = require("Search/Scripts/Providers/Code/TFS.Search.RepositoryClient");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import TFS_Core_Utils = require("Presentation/Scripts/TFS/TFS.Core.Utils");
import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");
import Utils_Core = require("VSS/Utils/Core");
import Q = require("q");

var delegate = Utils_Core.delegate;
var currentTfsContext = Context.SearchContext.getDefaultContext(),
    rootRequestPath = Context.SearchContext.getRootRequestPath();

export class SearchScopeFilters extends Controls.BaseControl {
    // Making the url action change (filter selection change) delay to zero millisecond as in case of scopefilters we are adding delay at the time of drawing filters
    private static SCOPEFILTERSACTION_DELAY_TIME_IN_MS: number = 0;

    private _currentSelectedProjectName: string;
    private _repos: any;

    public _projects: any;
    private filterCategories: Core_Contracts.IFilterCategoryName[];
    private _projectRepoMap = {};

    constructor() {
        super();
        this._currentSelectedProjectName = null;

        // Converting to Project context
        if (Context.SearchContext.isAccountContext()) {
            currentTfsContext.navigation.collection = Context.SearchContext.createCollectionServiceHost("defaultcollection");
        }
    }

    // Sorts the Project or Repo List objects depending upon the type of objects passed as argument
    private sortProjectAndRepoList(projectOrRepoListObject: any) {
        // Both projectList and repoList objects have name as property value
        projectOrRepoListObject.sort((a, b) => {
            var nameA: string = a.name;
            var nameB: string = b.name;

            if (nameA > nameB) {
                return 1;
            }
            if (nameA < nameB) {
                return -1;
            }

            // a must be equal to b
            return 0;
        });
    }

    // Creates a mapping for selected Project or Repo depending upon the type of selected filter passed as argument
    private createMap(listOfProjectOrRepoNames: string[]): any {
        var map = {};

        for (var i in listOfProjectOrRepoNames) {
            map[listOfProjectOrRepoNames[i]] = true;
        }

        return map;
    }

    // Populates project list
    public populateProjectList(callback): void {
        if (!this._projects) {
            this.getAllProjectsPromise().then((allResults: Array<any>) => {
                var allProjects: Array<TFS_Core_Contracts.WebApiProject> = allResults[0];
                if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchCustomVC)) {
                    var sdProjects: Array<string> = allResults[1];
                    sdProjects.forEach((sdProject: string) => {
                        allProjects.push(<TFS_Core_Contracts.WebApiProject>{
                            name: sdProject,
                            id: "",
                            abbreviation: undefined,
                            description: undefined,
                            revision: undefined,
                            state: "wellFormed",
                            url: undefined,
                            collection: undefined,
                            defaultTeam: undefined,
                            capabilities: { "versioncontrol": { "sourceControlType": Constants.SearchConstants.CustomVersionControl } },
                            visibility: undefined,
                            defaultTeamImageUrl: undefined
                        });
                    });
                }

                this._projects = allProjects;
                this.sortProjectAndRepoList(this._projects);
                callback();
            }).catch((error: any) => {
                this.clear();
            });
        }
        else {
            callback();
        }
    }

    private getAllProjectsPromise(): Q.Promise<Array<any>> {
        var projectClient: ProjectList.SearchHttpClient = new ProjectList.SearchHttpClient(rootRequestPath),
            projectsFromTfsPromise: Q.Promise<TFS_Core_Contracts.WebApiProject[]> = this.getProjectsFromTfs();

        if (Helpers.Utils.isFeatureFlagEnabled(ServerConstants.FeatureAvailabilityFlags.WebAccessSearchCustomVC)) {
            var CustomProjectPromise: Q.Promise<Array<string>> = projectClient.beingGetCustomProjects();
            return Q.all([projectsFromTfsPromise, CustomProjectPromise]);
        }

        return Q.all([projectsFromTfsPromise]);
    }

    private getProjectsFromTfs(): Q.Promise<TFS_Core_Contracts.WebApiProject[]> {
        var projectClient: ProjectList.SearchHttpClient = new ProjectList.SearchHttpClient(rootRequestPath),
            deferred: Q.Deferred<TFS_Core_Contracts.WebApiProject[]> = Q.defer<TFS_Core_Contracts.WebApiProject[]>();

        projectClient.beginGetProjects().then((response: TFS_Core_Contracts.WebApiProject[]) => { // Returns a list of project objects 
            var promises: Array<any> = [];

            // promise to fetch the project details(capabilities) along with other metatadata
            response.forEach((project: any) => {
                promises.push(projectClient.beginGetProject(project.id));
            });
                
            // wait till all promises are resolved/ rejected.
            return Q.all(promises);
        }).then((projecList: TFS_Core_Contracts.WebApiProject[]) => {
            deferred.resolve(projecList);
        }, (error: any) => {
            deferred.reject(error);
        });

        return deferred.promise;
    }

    // Constructs filtercategories and then draw filters
    public constructScopeFilters(projectList: TFS_Core_Contracts.WebApiProject[], selectedFilters: Core_Contracts.IFilterCategory[]): void {
        // Updates the global variable with the current selected project if selected project count is one, otherwise updates with null
        
        var projectFilters: Core_Contracts.IFilter[] = new Array<Core_Contracts.IFilter>();
        this.filterCategories = new Array<Core_Contracts.IFilterCategoryName>();

        var projectFilterNameValue = SearchScopeFilters.filterNameValuePairList(selectedFilters, Constants.SearchConstants.ProjectFilters);

        if (projectFilterNameValue && projectFilterNameValue.values) {
            var selectedProjectsMap: any = this.createMap((<Core_Contracts.FilterNameList>projectFilterNameValue).values);
        }

        for (var k in projectList) {
            var isSelected = false;
            if (selectedProjectsMap && selectedProjectsMap[projectList[k].name] === true) {
                isSelected = true;
            }

            projectFilters[k] = new Base_Contracts.Filter(projectList[k].name, projectList[k].name, isSelected, -1);
        }

        this.filterCategories.push(new Base_Contracts.DefaultFilterCategory(projectFilters, Constants.SearchConstants.ProjectFilters));

        var isSingleProjectSelected: boolean = this.isSingleProjectSelected(projectFilterNameValue);
        var prevProjectSelected: string = this._currentSelectedProjectName;

        if (isSingleProjectSelected) {
            this._currentSelectedProjectName = (<Core_Contracts.FilterNameList>projectFilterNameValue).values[0];
        } else {
            this._currentSelectedProjectName = null;
        }

        if (isSingleProjectSelected) {
            var selectedProject: TFS_Core_Contracts.WebApiProject = projectList.filter((project: TFS_Core_Contracts.WebApiProject, index: number) => {
                return project.name === this._currentSelectedProjectName;
            })[0];

            var selectedProjectId = selectedProject.id;
            var selectedProjectType = selectedProject.capabilities["versioncontrol"]["sourceControlType"];

            var selectedRepositories = SearchScopeFilters.filterNameValuePairList(selectedFilters, Constants.SearchConstants.RepoFilters);
            var isSingleRepoSelected: boolean = this.isSingleProjectSelected(selectedRepositories);
            if (prevProjectSelected !== this._currentSelectedProjectName) {
                var onGetProjectRepoDone = delegate(this, (repoList: any[]) => {
                    if (selectedProjectType === Constants.SearchConstants.TfvcVersionControl) {
                        repoList.push({ "Name": "$/" + selectedProject.name, "ProjectName": selectedProject.name });
                    }
                    if (repoList && repoList.length > 0) {
                        var repoNameList: string[] = this.getRepoNameList(repoList);
                        repoNameList.sort();

                        // Caching repo list for a project
                        this._projectRepoMap[this._currentSelectedProjectName] = repoNameList;
                    }

                    if (repoList && repoList.length > 0 && this.getProjectNameFromRepoList(repoList) === this._currentSelectedProjectName) {
                        this.filterCategories.push(this.constructRepoFilters(repoNameList, selectedRepositories));
                    }
                    if (isSingleRepoSelected) {
                        this.filterCategories.push(this.constructPathFilter(this._currentSelectedProjectName, selectedRepositories.values[0], selectedFilters));
                    }
                    this.drawFilters(this.filterCategories);
                });

                var activityId = TFS_Core_Utils.GUIDUtils.newGuid();
                var onGetProjectRepoFail = delegate(this, (error: any) => {
                    return;
                });

                // Checking if the project has corresponding repo list in the cache.
                if (this._projectRepoMap && this._projectRepoMap[this._currentSelectedProjectName]) {
                    this.filterCategories.push(this.constructRepoFilters(this._projectRepoMap[this._currentSelectedProjectName], selectedRepositories));
                }
                else {
                    if (selectedProjectType !== Constants.SearchConstants.CustomVersionControl) {
                        var searchGitRepoClient: SearchRepoWebApi.GitRepositoryClient = new SearchRepoWebApi.GitRepositoryClient();
                        searchGitRepoClient.beginGetProjectRepositories(selectedProjectId, activityId).done(onGetProjectRepoDone).fail(onGetProjectRepoFail);
                    }
                    else {
                        SearchRepoWebApi.CustomClient.beginGetCustomBranch(this._currentSelectedProjectName).then((branchNames: Array<string>) => {
                            this._projectRepoMap[this._currentSelectedProjectName] = branchNames;
                            this.filterCategories.push(this.constructRepoFilters(branchNames, selectedRepositories));
                        }, onGetProjectRepoFail);
                    }
                }


            }
            else {
                this.filterCategories.push(this.constructRepoFilters(this._projectRepoMap[this._currentSelectedProjectName], selectedRepositories));
                if (isSingleRepoSelected) {
                    this.filterCategories.push(this.constructPathFilter(this._currentSelectedProjectName, selectedRepositories.values[0], selectedFilters));
                }
            }
        }

        if (this.filterCategories) {
            this.drawFilters(this.filterCategories);
        }
    }

    private isSingleProjectSelected(projectFilterNameValue: Core_Contracts.IFilterCategory): boolean {
        if (projectFilterNameValue !== undefined && projectFilterNameValue !== null) {
            var selectedProjects = (<Core_Contracts.FilterNameList>projectFilterNameValue).values;
            if (selectedProjects !== null && selectedProjects.length === 1) {
                return true;
            }
            else {
                return false;
            }
        }

        return false;
    }

    // Returns the project name associated for a given list of repositories
    private getProjectNameFromRepoList(repoList: any[]): string {
        return repoList[0].projectName || repoList[0].ProjectName || repoList[0].project.name;
    }

    private drawFilters(filterCategories: Core_Contracts.IFilterCategoryName[]): void {
        // Keeping the delay to 350 milliseconds as this avoids redrawing filter pane for each new request, allowing users to select multiple filters 
        this.delayExecute("DrawFilters", 350, true, () => {
            ViewBuilder.SearchViewBuilder.drawFilters(filterCategories, SearchScopeFilters.SCOPEFILTERSACTION_DELAY_TIME_IN_MS);
        });
    }

    private getRepoNameList(repoList: any[]): string[] {
        var repos: string[] = new Array<string>();
        for (var k in repoList) {
            repos[k] = repoList[k].name || repoList[k].Name;
        }
        return repos;
    }

    // Constructs repo filter category and return them
    private constructRepoFilters(repoList: string[], selectedRepoFilters: Core_Contracts.FilterNameList): Core_Contracts.IDefaultFilterCategory {
        var repoFilters: Core_Contracts.IFilter[] = new Array<Core_Contracts.IFilter>(),
            selectedreposMap: any;

        if (selectedRepoFilters && selectedRepoFilters.values) {
            selectedreposMap = this.createMap(selectedRepoFilters.values);
        }

        for (var k in repoList) {
            repoFilters[k] = new Base_Contracts.Filter(repoList[k], repoList[k], false, -1);

            if (selectedreposMap && selectedreposMap[repoFilters[k].name]) {
                repoFilters[k].selected = true;
            }
        }

        return new Base_Contracts.DefaultFilterCategory(repoFilters, Constants.SearchConstants.RepoFilters);
    }    

    // Constructs path filter category and returns it
    private constructPathFilter(projName: string, repoName: string, selectedFilters: Core_Contracts.IFilterCategory[]): Base_Contracts.PathScopeFilterCategory {
        var pathFilter = SearchScopeFilters.filterNameValuePairList(selectedFilters, Constants.SearchConstants.PathFilters),
            selectedPath: string = null;

        if (pathFilter && pathFilter.values) {
            selectedPath = pathFilter.values.path;
        }
        var vcType: Base_Contracts.VersionControlType = repoName.indexOf("$") >= 0 ? Base_Contracts.VersionControlType.Tfvc : Base_Contracts.VersionControlType.Git;
        return new Base_Contracts.PathScopeFilterCategory(
            Constants.SearchConstants.PathFilters,
            projName,
            repoName,
            selectedPath,
            vcType);
    }

    private clear(): void {
        ViewBuilder.SearchViewBuilder.clearFiltersPane();
        this._projects = null;
        this._repos = null;
    }

    private static filterNameValuePairList(list: Core_Contracts.IFilterCategory[], filterName: string): Core_Contracts.IFilterCategory {
        if (list) {
            var filteredValue = list.filter((nv: Core_Contracts.IFilterCategory, index) => {
                return nv.name === filterName;
            });

            if (filteredValue && filteredValue.length === 1) {
                return filteredValue[0];
            }
        }

        return null;
    }
}
