/// <reference types="jquery" />

import Q = require("q");

import BuildClientV2 = require("Build.Common/Scripts/Api2.2/ClientServices");
import BuildClient = require("Build.Common/Scripts/ClientServices");
import { toBuildDefinitionTemplate, toBuildDefinitionTemplate3_2 } from "Build.Common/Scripts/BuildDefinitionTemplate";

import BuildDefinitionModel = require("Build/Scripts/BuildDefinitionModel");
import BuildDefinitionViewModel = require("Build/Scripts/BuildDefinitionViewModel");
import Constants = require("Build/Scripts/Constants");
import HostedImagesCache = require("Build/Scripts/HostedImagesCache");
import DistributedTaskModels = require("Build/Scripts/Models.DistributedTask");
import RepositoryFactory = require("Build/Scripts/RepositoryFactory");
import SourceProviderManager = require("Build/Scripts/SourceProviderManager");
import XamlDefinitionModel = require("Build/Scripts/XamlDefinitionModel");

import TaskModels = require("DistributedTasksCommon/TFS.Tasks.Models");

import MachineManagement = require("MachineManagement/Contracts")

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import BuildCommon = require("TFS/Build/Contracts");
import { TeamProjectReference } from "TFS/Core/Contracts";
import DistributedTask = require("TFS/DistributedTask/Contracts");
import { GitRef, GitRepository, VersionControlProjectInfo } from "TFS/VersionControl/Contracts";

import VCWebApi = require("VersionControl/Scripts/TFS.VersionControl.WebApi");

import Service = require("VSS/Service");
import VSS = require("VSS/VSS");

type TaskDocumentationMap = { [taskVersion: string]: IPromise<string>; };

interface ITaskDefinitionMap {
    [key: string]: DistributedTask.TaskDefinition;
};

export class BuildDefinitionManager {
    public tfsContext: TFS_Host_TfsContext.TfsContext;

    /**
     * The queue cache
     */
    public queueCache: BuildClientV2.QueueCache;

    /**
     * The definition cache
     */
    public definitionCache: BuildClientV2.DefinitionCache;
	
	/**
     * The image cache
     */
    public hostedImagesCache: HostedImagesCache.HostedImagesCache;  

    private _sourceProviderManager: SourceProviderManager.SourceProviderManager;

    private _buildClientV2: BuildClientV2.BuildClientService;
    private _buildClient: BuildClient.BuildClientService;
    private _gitHttpClient: VCWebApi.GitHttpClient;
    private _taskAgentCollectionClient: TaskModels.TaskAgentClientService;

    private _taskDefinitionsPromise: IPromise<TaskModels.TaskDefinitionsResult>;
    private _gitBranchesRepoId: string;
    private _gitBranchesPromise: IPromise<GitRef[]>;
    private _gitRepositoriesPromise: IPromise<GitRepository[]>;
    private _optionDefinitionsPromise: IPromise<BuildCommon.BuildOptionDefinition[]>;
    private _templatesPromise: IPromise<BuildCommon.BuildDefinitionTemplate[]>;
    private _taskDefinitionMapPromise: IPromise<ITaskDefinitionMap>;

    constructor(sourceProviderManager: SourceProviderManager.SourceProviderManager, options?: any) {
        this._sourceProviderManager = sourceProviderManager;

        if (!!options) {
            this.tfsContext = options.tfsContext || TFS_Host_TfsContext.TfsContext.getDefault();
            this._buildClient = options.buildClient;
            this._buildClientV2 = options.buildClientV2;
            this._gitHttpClient = options.gitHttpClient;
            this._taskAgentCollectionClient = options.taskAgentCollectionClient;
        }
        else {
            this.tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        }

        let _connection: Service.VssConnection = null;
        const getConnection = () => {
            if (!_connection) {
                _connection = new Service.VssConnection(this.tfsContext.contextData);
            }
            return _connection;
        };

        if (!this._buildClient) {
            this._buildClient = getConnection().getService<BuildClient.BuildClientService>(BuildClient.BuildClientService);
        }

        if (!this._buildClientV2) {
            this._buildClientV2 = getConnection().getService<BuildClientV2.BuildClientService>(BuildClientV2.BuildClientService);
        }

        if (!this._gitHttpClient) {
            this._gitHttpClient = getConnection().getHttpClient<VCWebApi.GitHttpClient>(VCWebApi.GitHttpClient);
        }

        if (!this._taskAgentCollectionClient) {
            this._taskAgentCollectionClient = getConnection().getHttpClient(TaskModels.TaskAgentClientService);
        }

        this.queueCache = new BuildClientV2.QueueCache(this._buildClientV2);
        this.definitionCache = new BuildClientV2.DefinitionCache(this._buildClientV2);
        this.hostedImagesCache = new HostedImagesCache.HostedImagesCache();
    }

    /**
     * Gets a definition, optionally at a specific revision
     * @param id The definition id
     * @param revision The revision number
     */
    public getDefinition(id: number, revision?: number,  propertyFilters?: string[]): IPromise<BuildCommon.BuildDefinition> {
        // we use this in $.when calls, and the result is actually [result, status, jqXHR]
        // so coerce the promise to a single-value result
        return this._buildClient.getDefinition(id, revision, undefined, propertyFilters)
            .then((definition: BuildCommon.DefinitionReference) => {
                return <BuildCommon.BuildDefinition>definition;
            });
    }

    /**
     * Gets a XAML definition
     * @param id The definition id
     */
    public getXamlDefinition(id: number): IPromise<BuildCommon.XamlBuildDefinition> {
        return this._buildClientV2.beginGetXamlDefinition(id);
    }

    /**
    * Deletes a definition
    * @param id The definition id
    */
    public deleteDefinition(id: number): IPromise<any> {
        return this._buildClient.deleteDefinition(id);
    }

    /**
    * Deletes a xaml definition
    * @param id The definition id
    */
    public deleteXamlDefinition(id: number): IPromise<any> {
        return this._buildClientV2.beginDeleteDefinition(id);
    }

    /**
     * Gets revisions for a definition
     * @param definitionId The definition id
     */
    public getDefinitionRevisions(definitionId: number): IPromise<BuildCommon.BuildDefinitionRevision[]> {
        return this._buildClient.getDefinitionRevisions(definitionId);
    }

    /**
     * Gets all task definitions
     * @param refresh Whether to refresh the list from the server
     */
    public getTaskDefinitions(refresh: boolean = false): IPromise<TaskModels.TaskDefinitionsResult> {
        if (!this._taskDefinitionsPromise || refresh) {

            var taskDefinitions = this._taskAgentCollectionClient.getTaskDefinitions2(null, ["Build"]); // string should not be localized

            var definitions = Q.defer<TaskModels.TaskDefinitionsResult>();
            var metaTaskManager = new TaskModels.MetaTaskManager();
            var metaTaskDefinitions = metaTaskManager.getDefinitions();

            Q.all([taskDefinitions, metaTaskDefinitions]).spread((taskResult: TaskModels.TaskDefinitionsResult, metaTasks: DistributedTask.TaskGroup[]) => {
                taskResult.tasks = taskResult.tasks.concat(metaTasks);
                definitions.resolve(taskResult);
            });

            this._taskDefinitionsPromise = definitions.promise;
        }
        return this._taskDefinitionsPromise;
    }

    public beginQueryEndpoint(taskEndpoint: DistributedTask.TaskDefinitionEndpoint): IPromise<string[]> {
        // We might change this code to start accepting project-ids as scope.
        taskEndpoint.scope = this.tfsContext.navigation.projectId;
        return this._taskAgentCollectionClient.queryEndpoint(taskEndpoint);
    }

    /**
     * Get the definition template from REST API
     * @param templateId Id of the template to get
     */
    public getDefinitionTemplate(templateId: string): IPromise<BuildCommon.BuildDefinitionTemplate> {
        // we use this in $.when calls, and the result is actually [result, status, jqXHR]
        // so coerce the promise to a single-value result
        return this._buildClientV2.beginGetDefinitionTemplate(templateId)
            .then((template: BuildCommon.BuildDefinitionTemplate3_2) => {
                return toBuildDefinitionTemplate(template);
            });
    }

    /**
     * Put the definition template 
     * @param templateId Id of the template to get
     */
    public putDefinitionTemplate(templateId: string, template: BuildCommon.BuildDefinitionTemplate): IPromise<BuildCommon.BuildDefinitionTemplate> {
        return this._buildClientV2.beginPutDefinitionTemplate(templateId, toBuildDefinitionTemplate3_2(template))
            .then((result) => {
                return toBuildDefinitionTemplate(result);
            });
    }

    /**
     * Gets a task definition at a specific version
     * @param taskId The task id
     * @param versionSpec The version
     * @param refresh Whether to refresh the tasks from the server
     */
    public getTaskDefinition(taskId: string, versionSpec: string, refresh: boolean = false): IPromise<DistributedTask.TaskDefinition> {
        if (!this._taskDefinitionMapPromise || refresh) {
            this._taskDefinitionMapPromise = this.getTaskDefinitions(refresh)
                .then((taskDefinitions: TaskModels.TaskDefinitionsResult) => {
                    var taskDefinitionMap: ITaskDefinitionMap = {};

                    $.each(taskDefinitions.tasks, (index: number, taskDefinition: DistributedTask.TaskDefinition) => {
                        var key: string = this._getTaskDefinitionKey(taskDefinition.id, DistributedTaskModels.getVersionSpec(taskDefinition.version));
                        taskDefinitionMap[key] = taskDefinition;

                        if (!taskDefinition.version.isTest) {
                            // task definitions come back in order, so the last non-test should be "latest"
                            var majorKey: string = this._getTaskDefinitionKey(taskDefinition.id, taskDefinition.version.major + ".*");
                            taskDefinitionMap[majorKey] = taskDefinition;

                            var latestKey: string = this._getTaskDefinitionKey(taskDefinition.id, TaskModels.LatestVersionSpec);
                            taskDefinitionMap[latestKey] = taskDefinition;
                        }
                    });

                    return taskDefinitionMap;
                });
        }
        return this._taskDefinitionMapPromise.then((taskDefinitionMap: ITaskDefinitionMap) => {
            var key: string = this._getTaskDefinitionKey(taskId, versionSpec || TaskModels.LatestVersionSpec);

            return taskDefinitionMap[key];
        });
    }

    private _getTaskDefinitionKey(taskId: string, versionSpec: string): string {
        return taskId.toLowerCase() + ":" + versionSpec;
    }

    /**
     * Gets all branches for the specified repository id
     */
    public getGitBranches(repositoryId: string): IPromise<GitRef[]> {
        return this._gitHttpClient.beginGetGitRefs(repositoryId)
            .then((branches: GitRef[]) => {
                return branches;
            });
    }

    /**
     * Gets all build option definitions
     */
    public getBuildOptionDefinitions(refresh: boolean = false): IPromise<BuildCommon.BuildOptionDefinition[]> {
        if (refresh || !this._optionDefinitionsPromise) {
            this._optionDefinitionsPromise = this._buildClientV2.beginGetBuildOptionDefinitions()
                .then((optionDefinitions: BuildCommon.BuildOptionDefinition[]) => {
                    return optionDefinitions;
                });
        }
        return this._optionDefinitionsPromise;
    }

    /**
     * Gets all build definition templates
     */
    public getDefinitionTemplates(refresh: boolean = false): IPromise<BuildCommon.BuildDefinitionTemplate[]> {
        if (refresh || !this._templatesPromise) {
            this._templatesPromise = this._buildClientV2.beginGetDefinitionTemplates()
                .then((templates) => {
                    return templates.map((template) => {
                        return toBuildDefinitionTemplate(template);
                    });
                });
        }
        return this._templatesPromise;
    }

    /**
    * Delete definition template
    */
    public deleteDefinitionTemplate(templateId: string): IPromise<any> {
        return this._buildClientV2.beginDeleteDefinitionTemplate(templateId);
    }

    /**
     * Gets information about the current team project
     */
    public getProjectInfo(): IPromise<VersionControlProjectInfo> {
        return this._sourceProviderManager.getProjectInfo();
    }

    /**
     * Ensures that a definition view model is fully populated and not just a reference
     * @param viewModel The view model
     */
    public ensureFullViewModel(viewModel: BuildDefinitionModel.BuildDefinitionModel): IPromise<BuildDefinitionViewModel.BuildDefinitionViewModel> {
        if (viewModel) {
            if (viewModel instanceof BuildDefinitionViewModel.BuildDefinitionViewModel) {
                return Q(viewModel);
            }
            else {
                var definitionPromise = null;
                var tasksPromise = this.getTaskDefinitions();
                var queuesPromise = this.queueCache.getAgentQueues();
                var optionsPromise = this.getBuildOptionDefinitions();
                var repositoryFactoriesPromise = this._sourceProviderManager.getRepositoryFactories();
                var imagesPromise = this.hostedImagesCache.getPoolFriendlyImageNameList();

                if (viewModel.isFullViewModel()) {
                    definitionPromise = Q(viewModel.value);
                }
                else if (viewModel.id() > 0) {
                    definitionPromise = this.getDefinition(viewModel.id(), undefined, [Constants.WellKnownProperties.HostedAgentImageIdKey])
                        .then((fullDefinition: BuildCommon.BuildDefinition) => {
                            viewModel.update(fullDefinition);
                            return fullDefinition;
                        });
                }

                return Q.all([definitionPromise, tasksPromise, queuesPromise, optionsPromise, repositoryFactoriesPromise, imagesPromise]).spread(
                    (fullDefinition: BuildCommon.BuildDefinition, taskDefinitionResult: TaskModels.TaskDefinitionsResult, queues: DistributedTask.TaskAgentQueue[], options: BuildCommon.BuildOptionDefinition[], repositoryFactories: RepositoryFactory.RepositoryFactory[], images: MachineManagement.FriendlyImageName[]) => {
                        return new BuildDefinitionViewModel.BuildDefinitionViewModel(fullDefinition, taskDefinitionResult.tasks, options, repositoryFactories, queues, images);
                    }, (error: any) => {
                        VSS.handleError(error);
                        return null;
                    });
            }
        }
        else {
            return Q(null);
        }
    }

    /**
     * Ensures that a xaml definition view model is fully populated and not just a reference
     * @param viewModel The view model
     */
    public ensureFullXamlViewModel(viewModel: XamlDefinitionModel.XamlDefinitionModel): IPromise<XamlDefinitionModel.XamlDefinitionModel> {
        if (viewModel) {
            if (viewModel instanceof XamlDefinitionModel.XamlDefinitionModel && viewModel.isFullViewModel()) {
                return Q(viewModel);
            }
            else if (viewModel.id() > 0) {
                return this.getXamlDefinition(viewModel.id()).then(
                    (fullDefinition: BuildCommon.XamlBuildDefinition) => {
                        if (viewModel instanceof XamlDefinitionModel.XamlDefinitionModel) {
                            viewModel.update(fullDefinition);
                            return viewModel;
                        }
                        else {
                            return new XamlDefinitionModel.XamlDefinitionModel(fullDefinition);
                        }
                    });
            }
        }
        else {
            return Q(null);
        }
    }

    private _setProjectId(definition: BuildCommon.BuildDefinition): IPromise<BuildCommon.BuildDefinition> {
        return this.getProjectInfo().then(
            (projectInfo: VersionControlProjectInfo) => {
                definition.project = <TeamProjectReference>{
                    id: projectInfo.project.id
                };

                return definition;
            });
    }

    /**
     * Saves a new definition
     * @param definition The definition
     * @param comment A comment for the revision history
     * @param definitionToCloneId The id of the definition being cloned
     * @param definitionToCloneRevision The revision of the definition being cloned
     */
    public saveNewDefinition(definition: BuildCommon.BuildDefinition, comment: string, definitionToCloneId?: number, definitionToCloneRevision?: number): IPromise<BuildCommon.BuildDefinition> {
        return this._setProjectId(definition).then((d: BuildCommon.BuildDefinition) => {
            d.comment = comment;
            return this._buildClient.createDefinition(d, definitionToCloneId, definitionToCloneRevision);
        });
    }

    /**
     * Updates a definition
     * @param definition The definition
     * @param comment A comment for the revision history
     */
    public updateDefinition(definition: BuildCommon.BuildDefinition, comment: string): IPromise<BuildCommon.BuildDefinition> {
        return this._setProjectId(definition).then((d: BuildCommon.BuildDefinition) => {
            d.comment = comment;
            return this._buildClient.updateDefinition(d);
        });
    }

    /**
     * Saves a definition as a draft
     * @param definition The definition
     * @param comment A comment for the revision history
     * @param replace Whether to replace existing draft
     */
    public saveDefinitionAsDraft(definition: BuildCommon.BuildDefinition, comment: string, replace: boolean): IPromise<BuildCommon.BuildDefinition> {
        return this._setProjectId(definition).then((d: BuildCommon.BuildDefinition) => {
            return this._buildClient.putScopedDraft(definition.id, definition, comment, replace);
        });
    }

    /**
     * Updates the parent definition and then deletes the draft definition by draftId
     * @param parentDefinition The definition being updated
     * @param draftId The Id of the draft to delete
     * @param comment A comment for the revision history
     */
    public publishParentDefinition(parentDefinition: BuildCommon.BuildDefinition, draftId: number, comment: string): IPromise<BuildCommon.BuildDefinition> {
        // Update the definition of the draft (which is the parent)
        parentDefinition.comment = comment;
        return this._buildClient.updateDefinition(parentDefinition, draftId).then(
            (savedDefinition: BuildCommon.BuildDefinition) => {
                return this.deleteDefinition(draftId)
                    .then(() => {
                        return savedDefinition;
                    });
            });
    }

    /**
     * Gets the build settings
     */
    public getBuildSettings(): IPromise<BuildCommon.BuildSettings> {
        return this._buildClientV2.beginGetBuildSettings();
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("DefinitionManager", exports);
