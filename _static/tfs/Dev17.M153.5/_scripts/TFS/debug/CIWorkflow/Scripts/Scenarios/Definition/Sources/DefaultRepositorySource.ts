import * as Q from "q";

import { RepositoryTypes } from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import { ContributionConstants, TfvcConstants } from "CIWorkflow/Scripts/Common/Constants";
import * as WebPageData from "CIWorkflow/Scripts/Scenarios/Definition/Sources/WebPageData";

import {Singleton} from "DistributedTaskControls/Common/Factory";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as BuildContracts from "TFS/Build/Contracts";
import { SourceControlTypes, ProjectVisibility, TeamProject, TeamProjectReference } from "TFS/Core/Contracts";
import { CoreHttpClient } from "TFS/Core/RestClient";

import { ContextHostType } from "VSS/Common/Contracts/Platform";
import * as Context from "VSS/Context";
import { DataProviderQuery }  from "VSS/Contributions/Contracts";
import { ContributionsHttpClient } from "VSS/Contributions/RestClient";
import * as Service from "VSS/Service";

export interface ProjectInfo {
    defaultSourceControlType: SourceControlTypes;
    project: TeamProjectReference;
    supportsGit: boolean;
    supportsTFVC: boolean;
}

export class DefaultRepositorySource extends SourceBase {
    private _contributionClient: ContributionsHttpClient;
    private _coreClient: CoreHttpClient;
    private _defaultRepositoryPromise: IPromise<BuildContracts.BuildRepository>;
    private _getProjectInfoPromise: IPromise<ProjectInfo>;
    private _getProjectsPromises: IDictionaryStringTo<IPromise<ProjectInfo>> = {};
    private _projects: ProjectInfo[] = [];

    constructor() {
        super();

        this._projects = WebPageData.WebPageDataHelper.getProjects().map((project) => {
            return this._getProjectInfo(project);
        });
    }

    public static getKey(): string {
        return "DefaultRepositorySource";
    }

    public static instance(): DefaultRepositorySource {
        return SourceManager.getSource(DefaultRepositorySource);
    } 

    public getDefaultRepositoryForProject(): IPromise<BuildContracts.BuildRepository> {
        if (!this._defaultRepositoryPromise) { 
            let deferred = Q.defer<BuildContracts.BuildRepository>();

            this.getProjectInfo().then((projectInfo: ProjectInfo) => {
                if (projectInfo.defaultSourceControlType === SourceControlTypes.Git) {
                    let preFetchedDefaultRepository = WebPageData.WebPageDataHelper.getDefaultRepository();
                    if (preFetchedDefaultRepository && preFetchedDefaultRepository.id) {
                        return deferred.resolve(preFetchedDefaultRepository);
                    }
                    else {
                        let contributionsClient = this._getContributionsClient();

                        if (!contributionsClient) {
                            deferred.resolve(null);
                        }
                        else {
                            let query: DataProviderQuery = this._getDataProviderQuery();
                            contributionsClient.queryDataProviders(query).then((contributionDataResult: DataProviderResult) => {
                                let pageData = contributionDataResult.data[ContributionConstants.BUILD_DEFINITION_DATA_PROVIDER_ID] || {};
                                let searchResult: WebPageData.IWebPageData = pageData as WebPageData.IWebPageData;

                                if (searchResult.defaultRepository) {
                                    deferred.resolve(searchResult.defaultRepository);
                                }
                                else {
                                    deferred.resolve(null);
                                }
                            }, (error: Error) => {
                                deferred.reject(error);
                            });
                        }
                    }
                }
                else {
                    let tfsContext: TfsContext = TfsContext.getDefault();
                    deferred.resolve({
                        type: RepositoryTypes.TfsVersionControl,
                        rootFolder: TfvcConstants.DefaultTfvcPrefix + tfsContext.navigation.project,
                        url: tfsContext.navigation.collection.uri,
                        name: tfsContext.navigation.project
                    } as BuildContracts.BuildRepository);
                }
            });

            this._defaultRepositoryPromise = deferred.promise;
        }

        return this._defaultRepositoryPromise;
    }

    public getProjectInfos(): ProjectInfo[] {
        return this._projects;
    }

    public getProjectInfo(): IPromise<ProjectInfo> {
        if (!this._getProjectInfoPromise) {
            this._getProjectInfoPromise = this._getCoreClient().getProject(Context.getDefaultWebContext().project.id, true).then((project: TeamProject) => {
                return this._getProjectInfo(project);
            });
        }

        return this._getProjectInfoPromise;
    }

    public getProjectInfoById(projectId: string): IPromise<ProjectInfo> {
        if (!this._getProjectsPromises[projectId]) {
            this._getProjectsPromises[projectId] = this._getCoreClient().getProject(projectId, true).then((project: TeamProject) => {
                return this._getProjectInfo(project);
            });
        }

        return this._getProjectsPromises[projectId];
    }

    public getProjectVisibility(projectId: string): ProjectVisibility | undefined {
        const projects = this._projects.filter(p => p.project.id === projectId);
        if (projects.length > 0)
        {
            return projects[0].project.visibility;
        }
        
        return undefined;
    }

    public getDefaultRepositoryType(): IPromise<string> {
        return this.getProjectInfoById(TfsContext.getDefault().contextData.project.id).then((project: ProjectInfo) => {
            return project && project.supportsGit ? RepositoryTypes.TfsGit : RepositoryTypes.TfsVersionControl;
        },
        () => {
            return RepositoryTypes.TfsGit;
        });
    }

    private _getDataProviderQuery(): DataProviderQuery {
        let query: DataProviderQuery = {
            context: {
                properties: {
                    "defaultSourcesForProject": Context.getDefaultWebContext().project.id
                }
            },
            contributionIds: [ContributionConstants.BUILD_DEFINITION_DATA_PROVIDER_ID]
        };

        return query;
    }

    private _getContributionsClient(): ContributionsHttpClient {
        if (!this._contributionClient) {
            let connection = Service.VssConnection.getConnection(TfsContext.getDefault().contextData, ContextHostType.ProjectCollection);
            this._contributionClient = connection.getHttpClient(ContributionsHttpClient);
        }
        return this._contributionClient;
    }

    private _getCoreClient(): CoreHttpClient {
        if (!this._coreClient) {
            let connection = Service.VssConnection.getConnection(TfsContext.getDefault().contextData, ContextHostType.ProjectCollection);
            this._coreClient = connection.getHttpClient<CoreHttpClient>(CoreHttpClient);
        }
        return this._coreClient;
    }

    private _getProjectInfo(project: TeamProject): ProjectInfo {
        const capabilities = project.capabilities["versioncontrol"];
        return {
            project: project,
            supportsGit: capabilities["gitEnabled"] === "True",
            supportsTFVC: capabilities["tfvcEnabled"] === "True",
            defaultSourceControlType: capabilities["sourceControlType"] === "Git" ? SourceControlTypes.Git : SourceControlTypes.Tfvc
        };
    }
}
