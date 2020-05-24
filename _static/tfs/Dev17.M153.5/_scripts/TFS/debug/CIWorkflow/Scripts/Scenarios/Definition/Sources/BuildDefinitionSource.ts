import * as Q from "q";

import { getAllSteps } from "Build.Common/Scripts/BuildDefinition";
import { GetDefinitionsOptions, GetDefinitionsResult } from "Build.Common/Scripts/ClientContracts";

import { PerfScenarios } from "CIWorkflow/Scripts/Common/Constants";
import { NavigationUtils } from "CIWorkflow/Scripts/Common/NavigationUtils";
import { BuildTemplatesSource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildTemplatesSource";
import { BuildDefinitionNameHelper } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/BuildDefinitionNameHelper";
import { DefaultRepositorySource } from "CIWorkflow/Scripts/Scenarios/Definition/Sources/DefaultRepositorySource";
import * as WebPageData from "CIWorkflow/Scripts/Scenarios/Definition/Sources/WebPageData";
import { IServiceClient } from "CIWorkflow/Scripts/Service/IServiceClient";
import { ServiceClientFactory } from "CIWorkflow/Scripts/Service/ServiceClientFactory";

import { DefinitionType } from "DistributedTasksCommon/TFS.Tasks.Types";

import { Singleton } from "DistributedTaskControls/Common/Factory";
import { Properties } from "DistributedTaskControls/Common/Telemetry";
import { StoreManager } from "DistributedTaskControls/Common/Stores/StoreManager";
import { JQueryWrapper } from "DistributedTaskControls/Common/JQueryWrapper";
import { PerfUtils } from "DistributedTaskControls/Common/PerfUtils";
import { AgentsSource } from "DistributedTaskControls/Sources/AgentsSource";
import { SourceBase } from "DistributedTaskControls/Common/Sources/SourceBase";
import { SourceManager } from "DistributedTaskControls/Common/Sources/SourceManager";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import * as BuildContracts from "TFS/Build/Contracts";
import { TeamProject } from "TFS/Core/Contracts";
import { CoreHttpClient } from "TFS/Core/RestClient";
import * as DTContracts from "TFS/DistributedTask/Contracts";

import * as Context from "VSS/Context";
import { VssConnection } from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";

export interface IProvideCurrentBuildRepository {
    getCurrentBuildRepository(repositoryType: string, repositoryName: string): IPromise<BuildContracts.BuildRepository>;
}

export class BuildDefinitionSource extends SourceBase {

    private _buildClient: IServiceClient;
    private _optionsDefinitionPromise: IPromise<BuildContracts.BuildOptionDefinition[]>;
    private _retentionSettingsPromise: IPromise<BuildContracts.BuildSettings>;

    constructor() {
        super();
        this._buildClient = ServiceClientFactory.getServiceClient();
    }

    public static getKey(): string {
        return "BuildDefinitionSource";
    }

    public create(templateId: string, repositoryName?: string, repositoryType?: string, provideCurrentBuildRepository?: IProvideCurrentBuildRepository): IPromise<BuildContracts.BuildDefinition> {
        let deferred = Q.defer<BuildContracts.BuildDefinition>();

        // Get the build template by its ID
        BuildTemplatesSource.instance().getBuildDefinitionTemplate(templateId).then((buildDefinitionTemplate: BuildContracts.BuildDefinitionTemplate) => {
            // Log perf for retrieving the build template
            PerfUtils.instance().splitScenario(PerfScenarios.Split_GetBuildDefinitionTemplateComplete);

            // Retrieve the available agent queues and pools
            Q.all([AgentsSource.instance().getTaskAgentQueues(), AgentsSource.instance().getTaskAgentPools()])
            .spread((queues, pools) => {
                // If the template specifies a default hosted queue, attempt to find it in the available queues
                let defaultHostedQueue = null;
                if (pools &&
                    queues &&
                    buildDefinitionTemplate.defaultHostedQueue &&
                    !Utils_String.equals(buildDefinitionTemplate.defaultHostedQueue.trim(), Utils_String.empty)) {

                    // Get all hosted poolIds
                    let hostedPoolIds = pools.filter((pool) => {
                        return pool.isHosted;
                    }).map((pool) => {
                        return pool.id;
                    });

                    // Get the first queue matching the specified name that also has a hosted pool
                    let matchingQueues = queues.filter((queue: DTContracts.TaskAgentQueue) => {
                        return Utils_String.equals(queue.name, buildDefinitionTemplate.defaultHostedQueue) &&
                            hostedPoolIds.some((id: number) => {
                                return id === queue.pool.id;
                            });
                    });
                    if (matchingQueues.length > 0) {
                        // Use the first (and expectedly only) hosted queue
                        defaultHostedQueue = matchingQueues[0];
                    }
                }

                const webContext = Context.getDefaultWebContext();
                this._getTeamProject(TfsContext.getDefault(), webContext.project.id).then((teamProject: TeamProject) => {
                    // Create a build definition based on the build template
                    const buildDefinition: BuildContracts.BuildDefinition = JQueryWrapper.extend(buildDefinitionTemplate.template, {
                        project: teamProject,
                        id: -1,
                        queue: defaultHostedQueue,
                        name: BuildDefinitionNameHelper.getDefaultBuildDefinitionName(teamProject.name, buildDefinitionTemplate.id, buildDefinitionTemplate.name),
                        properties: {}
                    }) as BuildContracts.BuildDefinition;

                    // Save template id and category for further telemetry.
                    buildDefinition.properties[Properties.TemplateId] = buildDefinitionTemplate.id;
                    buildDefinition.properties[Properties.TemplateCategory] = buildDefinitionTemplate.category;

                    // Ensure a definitionType is set for each step of the build definition
                    getAllSteps(buildDefinition).forEach((step: BuildContracts.BuildDefinitionStep) => {
                        if (!step.task.definitionType || Utils_String.equals(step.task.definitionType.trim(), Utils_String.empty)) {
                            step.task.definitionType = DefinitionType.task;
                        }
                    });

                    // Is the repository name available?
                    if (!repositoryName && !repositoryType) {
                        // Get the project's default repository
                        DefaultRepositorySource.instance().getDefaultRepositoryForProject().then((repository: BuildContracts.BuildRepository) => {
                            // Log perf for retrieving the project's default repository
                            PerfUtils.instance().splitScenario(PerfScenarios.Split_GetDefaultRepositoryForProjectComplete);

                            // Set the build definition to use the default repository
                            buildDefinition.repository = repository;
                            deferred.resolve(buildDefinition);
                        }, (error) => {
                            deferred.resolve(buildDefinition);
                        });
                    }
                    else if (repositoryName && provideCurrentBuildRepository) {
                        provideCurrentBuildRepository.getCurrentBuildRepository(repositoryType, repositoryName).then((buildRepository: BuildContracts.BuildRepository) => {
                            buildDefinition.repository = buildRepository;
                            deferred.resolve(buildDefinition);
                        }, (error) => {
                            buildDefinition.repository = { type: repositoryType } as BuildContracts.BuildRepository;
                            deferred.resolve(buildDefinition);
                        });
                    }
                    else {
                        buildDefinition.repository = { type: repositoryType } as BuildContracts.BuildRepository;
                        deferred.resolve(buildDefinition);
                    }
                });
            });
        });

        return deferred.promise;
    }

    public save(definition: BuildContracts.BuildDefinition, definitionToCloneId?: number, definitionToCloneRevision?: number, validateOnly?: boolean): IPromise<BuildContracts.BuildDefinition> {
        if (!definition.id || definition.id <= 0 || validateOnly) {
            // make sure we persist the source for telemetry
            definition.properties = definition.properties || {};
            definition.properties[Properties.Source] = NavigationUtils.getSourceFromUrl();
            return this._buildClient.createDefinition(definition, definitionToCloneId, definitionToCloneRevision, validateOnly);
        }
        else {
            return this._buildClient.updateDefinition(definition);
        }

    }

    /*
     * Saves a definition as a draft
     * @param definition The definition
     * @param comment A comment for the revision history
     * @param replace Whether to replace existing draft
     */
    public saveDefinitionAsDraft(definition: BuildContracts.BuildDefinition, comment: string, replace: boolean): IPromise<BuildContracts.BuildDefinition> {
        return this._buildClient.putScopedDraft(definition.id, definition, comment, replace);
    }

    /*
     * Updates the parent definition and then deletes the draft definition by draftId
     * @param parentDefinition The definition being updated
     * @param draftId The Id of the draft to delete
     * @param comment A comment for the revision history
     */
    public publishDefinition(parentDefinition: BuildContracts.BuildDefinition, draftId: number, comment: string): IPromise<BuildContracts.BuildDefinition> {
        let q = Q.defer<BuildContracts.BuildDefinition>();
        // Update the Parent definition
        parentDefinition.comment = comment;
        this._buildClient.updateDefinition(parentDefinition, draftId).then(
            (savedDefinition: BuildContracts.BuildDefinition) => {
                // Delete the Draft definition
                this.deleteDefinition(draftId);
                q.resolve(savedDefinition);
            },
            (error) => {
                q.reject(error);
            });
        return q.promise;
    }

    /*
     * Deletes a definition
     * @param id The definition id
     */
    public deleteDefinition(id: number): IPromise<any> {
        return this._buildClient.deleteDefinition(id);
    }

    public get(id: number): IPromise<BuildContracts.BuildDefinition> {
        let preFetchedBuildDefinition = WebPageData.WebPageDataHelper.getBuildDefinition();
        if (preFetchedBuildDefinition && preFetchedBuildDefinition.id === id) {
            return Q.resolve(preFetchedBuildDefinition);
        }
        else {
            return this._buildClient.getDefinition(id);
        }
    }

    /*
     * Returns the quality/status of definition (Draft or Definition)
     * @param id Id of the definition for which the quality is required
     */
    public getDefinitionQuality(id: number): IPromise<number> {
        let preFetchedBuildDefinition = WebPageData.WebPageDataHelper.getBuildDefinition();
        if (preFetchedBuildDefinition && preFetchedBuildDefinition.id === id) {
            return Q.resolve(preFetchedBuildDefinition.quality);
        }
        else {
            return this._buildClient.getDefinition(id).then((definiton: BuildContracts.BuildDefinition) => {
                return Q.resolve(definiton.quality);
            });
        }
    }

    public getAllDefinitions(refresh?: boolean): IPromise<BuildContracts.DefinitionReference[]> {
        return this._buildClient.getAllDefinitions(refresh);
    }

    public getRetentionSettings(): IPromise<BuildContracts.BuildSettings> {
        let preFetchedSettings = WebPageData.WebPageDataHelper.getRetentionSettings();
        if (preFetchedSettings) {
            return Q.resolve(preFetchedSettings);
        }
        else {
            if (!this._retentionSettingsPromise) {
                this._retentionSettingsPromise = this._buildClient.getSettings();
            }

            return this._retentionSettingsPromise;
        }
    }

    public fetchRevisionData(id: number): IPromise<BuildContracts.BuildDefinitionRevision[]> {
        if (id > 0) {
            return this._buildClient.getDefinitionRevisions(id);
        }
        else {
            return Q.resolve([]);
        }
    }

    public getDefinitions(filter: GetDefinitionsOptions): IPromise<GetDefinitionsResult> {
        return this._buildClient.getDefinitions(filter);
    }

    public getBuildOptionDefinitions(): IPromise<BuildContracts.BuildOptionDefinition[]> {
        let preFetchedSettings = WebPageData.WebPageDataHelper.getBuildOptionDefinitions();
        if (preFetchedSettings) {
            return Q.resolve(preFetchedSettings);
        }
        else {
            if (!this._optionsDefinitionPromise) {
                this._optionsDefinitionPromise = this._buildClient.getOptionDefinitions();
            }

            return this._optionsDefinitionPromise;
        }
    }

    public getBuildDefinitionRevision(buildDefinitionId: number, revision: number): IPromise<BuildContracts.BuildDefinition> {
        return this._buildClient.getDefinition(buildDefinitionId, revision).then(
            (buildDefinition: BuildContracts.DefinitionReference) => {
                return buildDefinition as BuildContracts.BuildDefinition;
            });
    }

    public getRevisionDocument(buildDefinitionId: number, revision: number): IPromise<string> {
        return this.getBuildDefinitionRevision(buildDefinitionId, revision).then(
            (buildDefinition: BuildContracts.BuildDefinition) => {
                return JSON.stringify(buildDefinition, null, 2);
            });
    }

    public static instance(): BuildDefinitionSource {
        return SourceManager.getSource(BuildDefinitionSource);
    }

    private _getTeamProject(tfsContext: TfsContext, projectId: string): IPromise<TeamProject> {
        const tfsConnection = VssConnection.getConnection(tfsContext.contextData);
        const coreHttpClient = tfsConnection.getHttpClient<CoreHttpClient>(CoreHttpClient);
        return coreHttpClient.getProject(projectId);
    }
}
