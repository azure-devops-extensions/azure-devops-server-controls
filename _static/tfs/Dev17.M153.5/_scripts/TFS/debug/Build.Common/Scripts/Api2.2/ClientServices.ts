/// <reference types="jquery" />

import Q = require("q");

import { toBuildDefinition3_2, toBuildDefinition } from "Build.Common/Scripts/BuildDefinition";
import ClientContracts = require("Build.Common/Scripts/ClientContracts");
import XamlBuildCommon = require("Build.Common/Scripts/Generated/TFS.Build.Xaml.Common");
import XamlBuildWebApi = require("Build.Common/Scripts/Generated/TFS.Build.Xaml.WebApi");
import { IBuildClient } from "Build.Common/Scripts/IBuildClient";
import { getAssociatedWorkItems } from "Build.Common/Scripts/WorkItems";

import {Build2ResourceIds, ProcessType} from "Build.Common/Scripts/Generated/TFS.Build2.Common";

import MachineManagementClient = require("MachineManagement/RestClient");
import MachineManagement = require("MachineManagement/Contracts")

import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import TFS_OM_Common = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");
import TFSWorkItemTrackingConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");

import Build_Client = require("TFS/Build/RestClient");
import BuildContracts = require("TFS/Build/Contracts");
import DT_Client = require("TFS/DistributedTask/TaskRestClient");
import DTA_Client = require("TFS/DistributedTask/TaskAgentRestClient");
import DTContracts = require("TFS/DistributedTask/Contracts");
import TMClient_NO_REQUIRE = require("TFS/TestManagement/RestClient");
import TMContracts = require("TFS/TestManagement/Contracts");
import VCContracts = require("TFS/VersionControl/Contracts");
import WITClient_NO_REQUIRE = require("TFS/WorkItemTracking/RestClient");
import WITContracts_NO_REQUIRE = require("TFS/WorkItemTracking/Contracts");

import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import FC_Client = require("VSS/FileContainer/RestClient");
import FCContracts = require("VSS/FileContainer/Contracts");
import FileContainerServices = require("VSS/FileContainer/Services");
import FeatureAvailability = require("VSS/FeatureAvailability/Services");
import Serialization = require("VSS/Serialization");
import ServerConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Service = require("VSS/Service");
import SHCommon = require("VSS/Common/Contracts/FormInput");
import Utils_Date = require("VSS/Utils/Date");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import WebApi_Contracts = require("VSS/WebApi/Contracts");

export class BuildClientService extends TFS_Service.TfsService implements IBuildClient {

    // Build area clients
    private _collectionHttpClient: BuildHttpClient;
    private _collectionHttpXamlClient: XamlBuildWebApi.BuildHttpClient;

    // other clients
    private _collectionHttpWitLazyClient: WITClient_NO_REQUIRE.WorkItemTrackingHttpClient4;

    private _collectionHttpFileContainerClient: FC_Client.FileContainerHttpClient;
    private _collectionHttpDTClient: DT_Client.TaskHttpClient;
    private _collectionHttpDTAClient: DTA_Client.TaskAgentHttpClient;

    private _hubName: string = "Build";

    /**
     * Initializes the TFS service with a connection
     * @param tfsConnection The connection
     */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);

        this._collectionHttpClient = this.getConnection().getHttpClient(BuildHttpClient);
        this._collectionHttpXamlClient = this.getConnection().getHttpClient(XamlBuildWebApi.BuildHttpClient);
        this._collectionHttpFileContainerClient = this.getConnection().getHttpClient(FC_Client.FileContainerHttpClient);
        this._collectionHttpDTClient = this.getConnection().getHttpClient(DT_Client.TaskHttpClient);
        this._collectionHttpDTAClient = this.getConnection().getHttpClient(DTA_Client.TaskAgentHttpClient);
    }

    /**
     * Gets the build with the specified id
     * @param buildId The build id
     */
    public getBuild(buildId: number): IPromise<BuildContracts.Build> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuild(buildId, projectId)
            .then((build: BuildContracts.Build) => {
                // some of the useful utility functions in BuildTextConverter use this
                (<any>build).finished = isBuildFinished(build);

                return build;
            });
    }

    /**
     * Gets the build report with the specified id
     * @param buildId The build id
     */
    public getBuildReport(buildId: number): IPromise<BuildContracts.BuildReportMetadata> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildReport(projectId, buildId);
    }

    /**
     * Gets builds matching a filter
     * @param filter The filter
     */
    public getBuilds(filter: ClientContracts.IBuildFilter): IPromise<ClientContracts.GetBuildsResult> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuilds2(projectId, filter)
            .then((result: ClientContracts.GetBuildsResult) => {
                $.each(result.builds, (build: BuildContracts.Build, index: number) => {
                    // some of the useful utility functions in BuildTextConverter use this
                    (<any>build).finished = isBuildFinished(build);
                });

                return result;
            });
    }

    /**
     * Gets an artifact
     * @param buildId The build id
     * @param artifactName The artifact name
     */
    public getBuildArtifact(buildId: number, artifactName: string): IPromise<BuildContracts.BuildArtifact> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getArtifact(buildId, artifactName, projectId);
    }

    /**
     * Gets build artifacts
     * @param buildId The build id
     */
    public getBuildArtifacts(buildId: number): IPromise<BuildContracts.BuildArtifact[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getArtifacts(buildId, projectId);
    }

    /**
     * Gets build changes
     * @param buildId The build id
     * @param top The number of changes to return
     * @param includeSourceChange Gets at least the source change
     */
    public getBuildChanges(buildId: number, top?: number, includeSourceChange?: boolean): IPromise<BuildContracts.Change[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildChanges(projectId, buildId, null, top, includeSourceChange);
    }

    /**
     * Gets build workitems
     * @param buildId The build id
     * @param commitIds Array of commitIds
     */
    public getBuildWorkItems(buildId: number, commitIds: string[]): IPromise<VCContracts.AssociatedWorkItem[]> {
        let deferred = Q.defer<VCContracts.AssociatedWorkItem[]>();

        let projectId = this.getTfsContext().contextData.project.id;
        this._collectionHttpClient.getBuildWorkItemsRefsFromCommits(commitIds, projectId, buildId).then(
            (workitemRefs: WebApi_Contracts.ResourceRef[]) => {
                let workItemIds = workitemRefs.map(wiRef => parseInt(wiRef.id));
                if (workItemIds.length == 0) {
                    deferred.resolve([]);
                }
                else {
                    VSS.using(["TFS/WorkItemTracking/RestClient"], (WITClient: typeof WITClient_NO_REQUIRE) => {
                        if (!this._collectionHttpWitLazyClient) {
                            this._collectionHttpWitLazyClient = this.getConnection().getHttpClient(WITClient.WorkItemTrackingHttpClient4);
                        }

                        let fieldsToPage = [TFSWorkItemTrackingConstants.CoreFieldRefNames.AssignedTo, TFSWorkItemTrackingConstants.CoreFieldRefNames.State, TFSWorkItemTrackingConstants.CoreFieldRefNames.Title, TFSWorkItemTrackingConstants.CoreFieldRefNames.WorkItemType];

                        return this._collectionHttpWitLazyClient.getWorkItems(workItemIds, fieldsToPage, undefined, undefined, undefined, projectId).then(
                            (workItems: WITContracts_NO_REQUIRE.WorkItem[]) => {
                                deferred.resolve(getAssociatedWorkItems(workItems));
                            }, (err: any) => {
                                deferred.reject(err);
                            });
                    });
                }
            }, (err: any) => {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    /**
     * Queries for input values
     * @param query The query
     */
    public beginQueryInputValues(query: SHCommon.InputValuesQuery): IPromise<{}> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.queryInputValues(projectId, query);
    }

    /**
    * Gets a definition template
    * @param templateId The template id
    */
    public beginGetDefinitionTemplate(templateId: string): IPromise<BuildContracts.BuildDefinitionTemplate3_2> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getTemplate(projectId, templateId);
    }

    /**
     * Gets a definition, optionally at a specific revision
     * @param definitionId The definition id
     * @param revision The revision number
     */
    public getDefinition(definitionId: number, revision?: number, minMetricsTime?: Date, propertyFilters?: string[]): IPromise<BuildContracts.DefinitionReference> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getDefinition(definitionId, projectId, revision).then((definition: BuildContracts.DefinitionReference) => {
            if (definition.type === BuildContracts.DefinitionType.Xaml) {
                return Serialization.ContractSerializer.deserialize(definition, BuildContracts.TypeInfo.XamlBuildDefinition, false);
            }
            return Serialization.ContractSerializer.deserialize(definition, BuildContracts.TypeInfo.BuildDefinition, false);
        });
    }

    /**
     * Gets a XAML definition
     * @param definitionId The definition id
     */
    public beginGetXamlDefinition(definitionId: number): IPromise<BuildContracts.XamlBuildDefinition> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getDefinition(definitionId, projectId, null, null, BuildContracts.DefinitionType.Xaml).then((definition: BuildContracts.DefinitionReference) => {
            return Serialization.ContractSerializer.deserialize(definition, BuildContracts.TypeInfo.XamlBuildDefinition, false);
        });
    }

    /**
     * Gets deployments environments for azureConnection task input type
     */
    public beginGetSubscriptionNames(project: string): IPromise<ClientContracts.ConnectedServiceMetadata[]> {
        return this._collectionHttpClient.getSubscriptionNames(project);
    }

    /**
     * Gets all definitions, optionally filtered to a specific type
     * @param definitionType The definition type
     */
    public beginGetDefinitions(definitionType?: BuildContracts.DefinitionType): IPromise<BuildContracts.DefinitionReference[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getDefinitions(projectId, "*", definitionType).then((definitions: BuildContracts.DefinitionReference[]) => {

            definitions = definitions || [];

            return definitions.map((definition: BuildContracts.DefinitionReference) => {
                if (definition.type === BuildContracts.DefinitionType.Xaml) {
                    return Serialization.ContractSerializer.deserialize(definition, BuildContracts.TypeInfo.XamlBuildDefinition, false);
                }
                return Serialization.ContractSerializer.deserialize(definition, BuildContracts.TypeInfo.BuildDefinition, false);
            });
        });
    }

    /**
     * Gets all revisions of a definition
     * @param definitionId The definition id
     */
    public beginGetDefinitionRevisions(definitionId: number): IPromise<BuildContracts.BuildDefinitionRevision[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getDefinitionRevisions(projectId, definitionId);
    }

    /**
     * Creates a new definition
     * @param definition The definition
     * @param comment A comment for the revision history
     * @param definitionToCloneId The id of the definition being cloned
     * @param definitionToCloneRevision The revision of the definition being cloned
     */
    public beginPostDefinition(definition: BuildContracts.BuildDefinition, comment: string, definitionToCloneId?: number, definitionToCloneRevision?: number): IPromise<BuildContracts.BuildDefinition> {
        let projectId = this.getTfsContext().contextData.project.id;
        definition.quality = BuildContracts.DefinitionQuality.Definition;
        definition.comment = comment;

        return this._collectionHttpClient.createDefinition(toBuildDefinition3_2(definition), projectId, definitionToCloneId, definitionToCloneRevision)
            .then((newDefinition) => toBuildDefinition(newDefinition));
    }

    /**
     * Updates an existing definition
     * @param definition The definition
     * @param comment A comment for the revision history
     */
    public beginPutDefinition(definition: BuildContracts.BuildDefinition, comment: string, secretsSourceDefinitionId?: number): IPromise<BuildContracts.BuildDefinition> {
        let projectId = this.getTfsContext().contextData.project.id;
        definition.comment = comment;
        return this._collectionHttpClient.updateDefinition(toBuildDefinition3_2(definition), definition.id, projectId, secretsSourceDefinitionId)
            .then((newDefinition) => toBuildDefinition(newDefinition));
    }

    /**
     * Puts a definition template
     * @param templateId The template id
     */
    public beginPutDefinitionTemplate(templateId: string, template: BuildContracts.BuildDefinitionTemplate3_2): IPromise<BuildContracts.BuildDefinitionTemplate3_2> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.saveTemplate(template, projectId, templateId);
    }

    /**
     * Deletes a definition 
     * @param templateId The template id
     */
    public beginDeleteDefinition(definitionId: number): IPromise<any> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.deleteDefinition(definitionId, projectId);
    }

    /**
     * Deletes a definition template
     * @param templateId The template id
     */
    public beginDeleteDefinitionTemplate(templateId: string): IPromise<any> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.deleteTemplate(projectId, templateId);
    }

    /**
     * Creates a new draft definition
     * @param draft The draft
     * @param comment A comment for the revision history
     */
    public beginPostDraft(draft: BuildContracts.BuildDefinition, comment: string, replace: boolean = false): IPromise<BuildContracts.BuildDefinition> {
        let projectId = this.getTfsContext().contextData.project.id;
        draft.quality = BuildContracts.DefinitionQuality.Draft;
        draft.comment = comment;

        if (replace) {
            return this._collectionHttpClient.updateDefinition(toBuildDefinition3_2(draft), draft.id, projectId)
                .then((newDefinition) => toBuildDefinition(newDefinition));
        }
        else {
            // the draft is a clone of the original, so pass its id and revision as the clone parameters
            return this._collectionHttpClient.createDefinition(toBuildDefinition3_2(draft), projectId, draft.id, draft.revision)
                .then((newDefinition) => toBuildDefinition(newDefinition));;
        }
    }

    /**
     * Creates a draft of an existing definition
     * @param parentDefinitionId The id of the parent definition
     * @param draft The draft
     * @param comment A comment for the revision history
     */
    public beginPutScopedDraft(parentDefinitionId: number, draft: BuildContracts.BuildDefinition, comment: string, replace: boolean): IPromise<BuildContracts.BuildDefinition> {
        // creating a new draft scoped to a parent definition
        draft.draftOf = <BuildContracts.DefinitionReference>{
            id: parentDefinitionId
        };
        return this.beginPostDraft(draft, comment, replace);
    }

    /**
     * Gets agent pool queues
     */
    public beginGetAgentPoolQueues(): IPromise<BuildContracts.AgentPoolQueue[]> {
        return this._collectionHttpClient.getQueues().then((queues: BuildContracts.AgentPoolQueue[]) => {
            return queues.sort((a, b) => {
                return Utils_String.defaultComparer(a.name, b.name);
            });
        });
    }

    /**
     * Gets build controllers
     */
    public beginGetBuildControllers(): IPromise<BuildContracts.BuildController[]> {
        return this._collectionHttpClient.getBuildControllers();
    }

    /**
    * Delete queue with specified ID
    * @param id The queue id
    */
    public beginDeleteQueue(id: number): IPromise<any> {
        return this._collectionHttpClient.deleteQueue(id);
    }

    /**
     * Queues a build
     * @param build The build
     * @param ignoreWarnings Whether to ignore validation warnings
     */
    public beginQueueBuild(build: BuildContracts.Build, ignoreWarnings: boolean = false): IPromise<BuildContracts.Build> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.queueBuild(build, projectId, ignoreWarnings);
    }

    /**
     * Gets all build option definitions
     */
    public beginGetBuildOptionDefinitions(): IPromise<BuildContracts.BuildOptionDefinition[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildOptionDefinitions(projectId);
    }

    /**
     * Gets all build definition templates
     */
    public beginGetDefinitionTemplates(): IPromise<BuildContracts.BuildDefinitionTemplate3_2[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getTemplates(projectId);
    }

    /**
     * Deletes a build in vNext
     * @param buildId The build id
     */
    public deleteBuild(buildId: number): IPromise<any> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.deleteBuild(buildId, projectId);
    }

    /**
     * Cancels a build in vNext
    * @param buildId The build id
    */
    public beginCancelBuild2(buildId: number): IPromise<any> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.cancelBuild2(projectId, buildId);
    }

    /**
     * Cancels a build
     * @param buildId buildId
     */
    public cancelBuild(buildId: number): IPromise<BuildContracts.Build> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.cancelBuild2(projectId, buildId);
    }

    /**
     * Updates the status of a build
     * @param buildId The build id
     * @param newStatus The new status
     */
    public beginUpdateBuildStatus(buildId: number, newStatus: BuildContracts.BuildStatus): IPromise<any> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.updateBuildStatus(projectId, buildId, newStatus);
    }

    /**
     * Updates the quality of a xaml build
     * @param buildId The build id
     * @param quality The quality to update
     */
    public updateXamlBuildQuality(buildId: number, quality: string): IPromise<any> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.updateXamlBuildQuality(projectId, buildId, quality);
    }

    /**
     * Updates the retain flag of a build
     * @param buildId The build id
     * @param keepForever The flag
     */
    public updateBuildRetainFlag(buildId: number, keepForever: boolean): IPromise<BuildContracts.Build> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.updateBuildRetainFlag(projectId, buildId, keepForever);
    }

    /**
     * Adds a tag to a build
     * @param buildId The build id
     * @param tag The tag
     */
    public addBuildTag(buildId: number, tag: string): IPromise<string[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.addBuildTag(projectId, buildId, tag).then((tags) => {
            return tags;
        }, (error) => {
            VSS.handleError(error);
        });
    }

    /**
     * Removes a tag from a build
     * @param buildId The build id
     * @param tag The tag
     */
    public deleteBuildTag(buildId: number, tag: string): IPromise<string[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.deleteBuildTag(projectId, buildId, tag);
    }

    /**
     * Gets suggested tags for the current project
     */
    public getSuggestedTags(): IPromise<string[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getTags(projectId);
    }

    /**
     * Creates a queue
     * @param queue The queue
     */
    public beginCreateQueue(queue: BuildContracts.AgentPoolQueue): IPromise<BuildContracts.AgentPoolQueue> {
        return this._collectionHttpClient.createQueue(queue);
    }

    /**
     * Gets the default retention policy
     */
    public beginGetBuildSettings(): IPromise<BuildContracts.BuildSettings> {
        return this._collectionHttpClient.getBuildSettings();
    }

    /**
     * Updates the default retention policy
     * @param policy The new policy
     */
    public beginUpdateBuildSettings(settings: BuildContracts.BuildSettings): IPromise<BuildContracts.BuildSettings> {
        return this._collectionHttpClient.updateBuildSettings(settings);
    }

    /**
     * Gets timelines for a build
     * @param buildId The build id
     */
    public beginGetTimelines(buildId: number): IPromise<BuildContracts.TimelineReference[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getTimelines(projectId, buildId);
    }

    /**
     * Gets a timeline
     * @param buildId The build id
     * @param timelineId The timeline id
     * @param changeId The earliest change to retrieve
     */
    public getTimeline(buildId: number, timelineId: string, changeId: number = 0, planId: string): IPromise<BuildContracts.Timeline> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildTimeline(projectId, buildId, timelineId, changeId, planId).then((timeline: BuildContracts.Timeline) => {
            return timeline;
        });
    }

    /**
     * Gets information nodes for a build
     * @param buildId The build id
     * @param types The types of information nodes to get
     * @param skip
     * @param top
     */
    public getInformationNodes(buildId: number, types?: string[], skip?: number, top?: number): IPromise<BuildContracts.InformationNode[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpXamlClient.getDetails(buildId, types, projectId, top, skip);
    }

    /**
     * Gets Build deployments information
     * @param buildId The build id
     */
    public getBuildDeployments(buildId: number): IPromise<BuildContracts.Deployment[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildDeployments(projectId, buildId);
    }

    /**
     * Gets Xaml Qualities
     */
    public beginGetXamlQualities(): IPromise<any[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpXamlClient.getQualities(projectId);
    }

    /**
     * Updates Xaml Qualities
     * @param toAdd qualities to add
     * @param toRemove qualities to remove
     */
    public updateXamlQualities(toAdd: string[], toRemove: string[]): IPromise<any[]> {
        let deferred = Q.defer<any[]>();

        let method = this.getTfsContext().getActionUrl("updateBuildQualities", "build", { area: "api" });
        let updates = <any>{};
        updates.itemsAdded = toAdd || [];
        updates.itemsRemoved = toRemove || [];

        Ajax.postHTML(method, updates,
            () => {
                deferred.resolve(null);
            }, (error) => {
                VSS.handleError(error);
                deferred.reject(error);
            });

        return deferred.promise;
    }

    /**
     * Get all logs for a build
     * @param buildId The build id
     */
    public beginGetLogs(buildId: number): IPromise<BuildContracts.BuildLog[]> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildLogs(projectId, buildId);
    }

    /**
         * Gets log lines
         * @param buildId The build id
         * @param logId The log id
         * @param startLine The first line to retrieve
         * @param endLine The last line to retrieve
         */
    public beginGetLog(buildId: number, logId: number, startLine?: number, endLine?: number): IPromise<string> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildLogStream(projectId, buildId, logId, startLine, endLine);
    }

    /**
         * Gets items from file container for a particular build
         * @param buildId The build id
         * @param itemPath Optional itemPath
         */
    public beginGetBuildContainerItems(buildId: number, itemPath?: string, includeOnlyFiles: boolean = true): IPromise<FCContracts.FileContainerItem[]> {
        let buildUri = Artifacts_Services.LinkingUtilities.encodeUri({
                tool: Artifacts_Constants.ToolNames.TeamBuild,
                type: Artifacts_Constants.ArtifactTypeNames.Build,
                id: buildId.toString()
            });
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpFileContainerClient.getContainers(projectId, buildUri).then((containers: FCContracts.FileContainer[]) => {
            // usually there should be only one container per build, but this doesn't make any such assumption..
            let containerPromises: Q.IPromise<FCContracts.FileContainerItem[]>[] = [];
            $.each(containers, (index: number, value: FCContracts.FileContainer) => {
                // don't send itemPath to getItems since if the path is not found it goes 404, we don't want such noise
                // use itemPath to filter later instead ..
                containerPromises.push(this._collectionHttpFileContainerClient.getItems(value.id, projectId));
            });
            return Q.all(containerPromises).then((items: FCContracts.FileContainerItem[][]) => {
                let containerItems: FCContracts.FileContainerItem[] = [];
                $.each(items, (index, value: FCContracts.FileContainerItem[]) => {
                    let itemsToAdd = value;
                    if (includeOnlyFiles) {
                        itemsToAdd = itemsToAdd.filter((value: FCContracts.FileContainerItem) => {
                            return value.itemType === FCContracts.ContainerItemType.File;
                        });
                    }
                    if (itemPath) {
                        itemsToAdd = itemsToAdd.filter((value: FCContracts.FileContainerItem) => {
                            return Utils_String.caseInsensitiveContains(value.path || "", itemPath);
                        });
                    }
                    containerItems = containerItems.concat(itemsToAdd);
                });
                return containerItems;
            });
        });
    }

    /**
     * Gets attachments for a build.
     * @param buildId The build id
     * @param type The type of attachment
     */
    public getAttachments(buildId: number, type: string): IPromise<BuildContracts.Attachment[]> {
        return Q([]);
    }

    public beginGetBuildContainerItemsWithContainerId(containerId: number, scope: string, itemPath: string, tfsContext?: any): IPromise<FCContracts.FileContainerItem[]> {
        return this._collectionHttpClient.getBuildContainerItemsWithContainerId(containerId, scope, itemPath, tfsContext);
    }
}

class ArrayCachePromise<T> {
    public promise: IPromise<T[]>;
    public array: T[];
}

/**
 * A cache of definitions, grouped by type (XAML, Build) and quality (draft, definition)
 */
export class DefinitionCache {
    private _buildClient: BuildClientService;

    private _allDefinitionsPromise: IPromise<BuildContracts.DefinitionReference[]>;

    private _xamlDefinitionsPromise: ArrayCachePromise<BuildContracts.BuildDefinitionReference> = new ArrayCachePromise<BuildContracts.BuildDefinitionReference>();
    private _buildDefinitionsAndDraftsPromise: ArrayCachePromise<BuildContracts.BuildDefinitionReference> = new ArrayCachePromise<BuildContracts.BuildDefinitionReference>();
    private _buildDefinitionsPromise: ArrayCachePromise<BuildContracts.BuildDefinitionReference> = new ArrayCachePromise<BuildContracts.BuildDefinitionReference>();
    private _buildDraftsPromise: ArrayCachePromise<BuildContracts.BuildDefinitionReference> = new ArrayCachePromise<BuildContracts.BuildDefinitionReference>();

    private _subsetPromises: ArrayCachePromise<any>[];

    constructor(buildClient: BuildClientService) {
        this._buildClient = buildClient;

        this._subsetPromises = [
            this._xamlDefinitionsPromise,
            this._buildDefinitionsAndDraftsPromise,
            this._buildDefinitionsPromise,
            this._buildDraftsPromise
        ];
    }

    /**
     * Gets all definitions
     * @param refresh Whether to refresh the cache from the server
     */
    public getAllDefinitions(refresh: boolean = false): IPromise<BuildContracts.DefinitionReference[]> {
        if (refresh || !this._allDefinitionsPromise) {
            $.each(this._subsetPromises, (index: number, subsetPromise: ArrayCachePromise<any>) => {
                subsetPromise.promise = null;
                subsetPromise.array = [];
            });

            this._allDefinitionsPromise = this._buildClient.beginGetDefinitions();

            let processPromise: IPromise<any> = this._allDefinitionsPromise
                .then((allDefinitions: BuildContracts.DefinitionReference[]) => {
                    $.each(allDefinitions, (index: number, definition: BuildContracts.DefinitionReference) => {
                        switch (definition.type) {
                            case BuildContracts.DefinitionType.Xaml:
                                this._xamlDefinitionsPromise.array.push(<BuildContracts.BuildDefinitionReference>definition);
                                break;
                            case BuildContracts.DefinitionType.Build:
                                // determine whether the definition is a draft
                                let buildDefinitionReference: BuildContracts.BuildDefinitionReference = <BuildContracts.BuildDefinitionReference>definition;
                                if (buildDefinitionReference.quality === BuildContracts.DefinitionQuality.Draft) {
                                    this._buildDraftsPromise.array.push(buildDefinitionReference);
                                }
                                else {
                                    this._buildDefinitionsPromise.array.push(buildDefinitionReference);
                                }

                                this._buildDefinitionsAndDraftsPromise.array.push(buildDefinitionReference);
                                break;
                        }
                    });
                });

            $.each(this._subsetPromises, (index: number, subsetPromise: ArrayCachePromise<any>) => {
                subsetPromise.promise = processPromise
                    .then(() => {
                        return subsetPromise.array;
                    });
            });
        }
        return this._allDefinitionsPromise;
    }

    /**
     * Gets all XAML definitions
     * @param refresh Whether to refresh the cache from the server
     */
    public getXamlDefinitions(refresh: boolean = false): IPromise<BuildContracts.DefinitionReference[]> {
        if (refresh || !this._xamlDefinitionsPromise.promise) {
            this._xamlDefinitionsPromise.array = [];
            this._xamlDefinitionsPromise.promise = this._buildClient.beginGetDefinitions(BuildContracts.DefinitionType.Xaml)
                .then((definitions) => {
                    definitions.forEach((definition) => {
                        this._xamlDefinitionsPromise.array.push(<BuildContracts.BuildDefinitionReference>definition);
                    });

                    return this._xamlDefinitionsPromise.array;
                });
        }
        return this._xamlDefinitionsPromise.promise;
    }

    /**
     * Gets all Build definitions
     * @param refresh Whether to refresh the cache from the server
     */
    public getBuildDefinitionsAndDrafts(refresh: boolean = false): IPromise<BuildContracts.DefinitionReference[]> {
        if (refresh || !this._buildDefinitionsAndDraftsPromise.promise) {
            this.getAllDefinitions(refresh);
        }
        return this._buildDefinitionsAndDraftsPromise.promise;
    }

    /**
     * Gets all Build definitions, excluding drafts
     * @param refresh Whether to refresh the cache from the server
     */
    public getBuildDefinitions(refresh: boolean = false): IPromise<BuildContracts.DefinitionReference[]> {
        if (refresh || !this._buildDefinitionsPromise.promise) {
            this.getAllDefinitions(refresh);
        }
        return this._buildDefinitionsPromise.promise;
    }

    /**
     * Gets all Build draft definitions
     * @param refresh Whether to refresh the cache from the server
     */
    public getBuildDefinitionDrafts(refresh: boolean = false): IPromise<BuildContracts.DefinitionReference[]> {
        if (refresh || !this._buildDraftsPromise.promise) {
            this.getAllDefinitions(refresh);
        }
        return this._buildDraftsPromise.promise;
    }
}

/**
 * Caches agent pool queues and build controllers
 */
export class QueueCache {
    private _buildClient: BuildClientService;
    private _queueClient: DTA_Client.TaskAgentHttpClient;

    private _buildControllersPromise: IPromise<BuildContracts.BuildController[]>;
    private _agentQueuesPromise: IPromise<DTContracts.TaskAgentQueue[]>;
    private _projectId: string;

    constructor(buildClient: BuildClientService) {
        this._buildClient = buildClient;
        this._queueClient = Service.getCollectionClient(DTA_Client.TaskAgentHttpClient, buildClient.getTfsContext().contextData);
        this._projectId = buildClient.getTfsContext().contextData.project.id;
    }

    /**
     * Gets all BuildControllers
     * @param refresh Whether to refresh the cache from the server
     */
    public getBuildControllers(refresh: boolean = false): IPromise<BuildContracts.BuildController[]> {
        if (refresh || !this._buildControllersPromise) {
            this._buildControllersPromise = this._buildClient.beginGetBuildControllers().then((buildControllers: BuildContracts.BuildController[]) => {
                return buildControllers;
            });
        }
        return this._buildControllersPromise;
    }

    /**
     * Gets all AgentPoolQueues
     * @param refresh Whether to refresh the cache from the server
     */
    public getAgentQueues(refresh: boolean = false): IPromise<DTContracts.TaskAgentQueue[]> {
        if (refresh || !this._agentQueuesPromise) {
            this._agentQueuesPromise = this._queueClient.getAgentQueues(this._projectId, null, DTContracts.TaskAgentQueueActionFilter.Use).then((queues) => {
                return queues.sort((a, b) => {
                    return Utils_String.ignoreCaseComparer(a.name, b.name);
                });
            });
        }
        return this._agentQueuesPromise;
    }
}

export class BuildHttpClient extends Build_Client.BuildHttpClient2_2 {
    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    public getBuildContainerItemsWithContainerId(
        containerId: number,
        scope: string,
        itemPath: string,
        tfsContext?: any): IPromise<FCContracts.FileContainerItem[]>
    {
        let fileContainerService = TFS_OM_Common.Application.getConnection(tfsContext).getService<FileContainerServices.FileContainerService>(FileContainerServices.FileContainerService);
        return fileContainerService.beginGetItems(containerId, scope, itemPath);
    }

    /**
     * Gets a log
     *
     * @param {string} project - Project ID or project name
     * @param {number} buildId
     * @param {number} logId
     * @param {number} startLine
     * @param {number} endLine
     * @param {Contracts.DefinitionType} type
     * @return IPromise<string>
     */
    public getBuildLogStream(
        project: string,
        buildId: number,
        logId: number,
        startLine?: number,
        endLine?: number,
        type?: BuildContracts.DefinitionType
    ): IPromise<string> {

        let queryValues: any = {
            startLine: startLine,
            endLine: endLine,
            type: type,
        };

        return this._beginRequest<string>({
            httpMethod: "GET",
            httpResponseType: "text/plain",
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.BuildLogs,
            resource: Build2ResourceIds.BuildLogsResource,
            routeTemplate: "{project}/_apis/{area}/builds/{buildId}/{resource}/{logId}",
            responseIsCollection: false,
            routeValues: {
                project: project,
                buildId: buildId,
                logId: logId,
            },
            queryParams: queryValues,
            apiVersion: "2.3-preview"
        });
    }

    /**
     * Gets a build
     * @param {number} buildId
     * @param {string} project - Project ID or project name
     * @param {string} propertyFilters - A comma-delimited list of properties to include in the results
     * @param {Contracts.DefinitionType} type
     * @return IPromise<Contracts.Build>
     */
    public getBuild(buildId: number, project?: string, propertyFilters?: string, type?: BuildContracts.DefinitionType): IPromise<BuildContracts.Build> {
        let queryValues: any = {
            propertyFilters: propertyFilters,
            type: type,
        };

        return this._beginRequest<BuildContracts.Build>({
            httpMethod: "GET",
            area: "build",
            locationId: "0cd358e1-9217-4d94-8269-1c1ee6f93dcf",
            resource: "builds",
            routeTemplate: "{project}/_apis/build/{resource}/{buildId}",
            responseType: BuildContracts.TypeInfo.Build,
            responseIsCollection: false,
            routeValues: {
                project: project,
                buildId: buildId,
            },
            queryParams: queryValues,
            apiVersion: "2.2;res-version=3"
        });
    }

    /**
     * Gets builds matching a filter
     * @param projectId The project id
     * @param filter The filter
     */
    public getBuilds2(projectId: string, filter?: ClientContracts.IBuildFilter): IPromise<ClientContracts.GetBuildsResult> {
        return this._beginRequestWithAjaxResult<BuildContracts.Build[]>({
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.Builds,
            responseType: BuildContracts.TypeInfo.Build,
            responseIsCollection: true,
            apiVersion: "2.2;res-version=3",
            routeValues: {
                project: projectId
            },
            data: filter
        }).spread(
            (builds: BuildContracts.Build[], textStatus: string, jqXHR: JQueryXHR) => {
                return {
                    builds: builds,
                    continuationToken: jqXHR.getResponseHeader("x-ms-continuationtoken")
                };
            });
    }

    /**
     * Queries for input values
     * @param projectId The project id
     * @param query The query
     */
    public queryInputValues(projectId: string, query: SHCommon.InputValuesQuery): IPromise<{}> {
        return this._beginRequest({
            httpMethod: "POST",
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.InputValuesQuery,
            data: query,
            apiVersion: "2.2",
            routeValues: {
                project: projectId
            }
        });
    }

    /**
    * Gets connected services subscriptions for the azureConnection task input type
   */
    public getSubscriptionNames(project: string): IPromise<ClientContracts.ConnectedServiceMetadata[]> {
        return this._beginRequest<ClientContracts.ConnectedServiceMetadata[]>(
            {
                area: XamlBuildCommon.BuildResourceIds.AreaName,
                locationId: XamlBuildCommon.BuildResourceIds.AzureSubscriptions,
                responseIsCollection: true,
                apiVersion: "2.2",
                routeValues: {
                    project: project
                }
            });
    }

    /** 
    * Cancel a Build
    * @param projectId The project id
    * @param buildId Id of the build
    */
    public cancelBuild2(projectId: string, buildId: number): IPromise<any> {
        return this._updateBuild(projectId, buildId, {
            status: BuildContracts.BuildStatus.Cancelling
        });
    }

    /**
     * Updates the status of a build
     * @param projectId The project id
     * @param buildId The build id
     * @param newStatus The new status
     */
    public updateBuildStatus(projectId: string, buildId: number, newStatus: BuildContracts.BuildStatus): IPromise<any> {
        return this._beginRequest({
            httpMethod: "PATCH",
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.Builds,
            apiVersion: "2.2",
            routeValues: {
                project: projectId,
                buildId: buildId
            },
            data: {
                status: newStatus
            }
        });
    }

    /**
     * Updates the quality for a xaml build
     * @param projectId The project id
     * @param buildId The build id
     * @param quality The new quality
     */
    public updateXamlBuildQuality(projectId: string, buildId: number, quality: string): IPromise<any> {
        return this._updateBuild(projectId, buildId, {
            quality: quality
        });
    }

    /**
     * Updates the KeepForever flag for a build
     * @param projectId The project id
     * @param buildId The build id
     * @param keepForever The new value
     */
    public updateBuildRetainFlag(projectId: string, buildId: number, keepForever: boolean): IPromise<any> {
        return this._updateBuild(projectId, buildId, {
            keepForever: keepForever
        });
    }

    /**
     * Gets timelines for a build
     * @param projectId The project id
     * @param buildId The build id
     */
    public getTimelines(projectId: string, buildId: number): IPromise<BuildContracts.TimelineReference[]> {
        return this._beginRequest<BuildContracts.TimelineReference[]>({
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.Timelines,
            responseIsCollection: true,
            apiVersion: "2.2",
            routeValues: {
                project: projectId,
                buildId: buildId
            }
        });
    }

    /**
     * [Preview API] Queues a build
     * 
     * @param {Contracts.Build} build
     * @param {string} project - Project ID or project name
     * @param {boolean} ignoreWarnings
     * @return IPromise<Contracts.Build>
     */
    public queueBuild(
        build: BuildContracts.Build,
        project?: string,
        ignoreWarnings?: boolean
    ): IPromise<BuildContracts.Build> {

        let deferred = Q.defer<BuildContracts.Build>();
        super.queueBuild(build, project, ignoreWarnings).then(
            (request: BuildContracts.Build) => {
                deferred.resolve(request);
            },
            (error: any) => {
                let exception;
                if (error.responseText) {
                    exception = JSON.parse(error.responseText);
                }
                if (exception && exception.ValidationResults) {
                    // simulate wrapped json array
                    let validationResults = {
                        value: exception.ValidationResults
                    };
                    deferred.reject(Serialization.ContractSerializer.deserialize(validationResults, BuildContracts.TypeInfo.BuildRequestValidationResult, false, true));
                }
                else {
                    deferred.reject(error);
                }
            });

        return deferred.promise;
    }

    public getTemplate(projectId: string, templateId: string): IPromise<BuildContracts.BuildDefinitionTemplate3_2> {
        return this._beginRequest<BuildContracts.BuildDefinitionTemplate3_2>({
            httpMethod: "GET",
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.Templates,
            resource: Build2ResourceIds.TemplatesResource,
            routeTemplate: "{project}/_apis/{area}/definitions/{resource}/{templateId}",
            responseType: BuildContracts.TypeInfo.BuildDefinitionTemplate,
            routeValues: {
                project: projectId,
                templateId: templateId,
            },
            apiVersion: "3.2"
        });
    }

    public getTemplates(projectId: string): IPromise<BuildContracts.BuildDefinitionTemplate3_2[]> {
        return this._beginRequest<BuildContracts.BuildDefinitionTemplate3_2[]>({
            httpMethod: "GET",
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.Templates,
            resource: Build2ResourceIds.TemplatesResource,
            routeTemplate: "{project}/_apis/{area}/definitions/{resource}/{templateId}",
            responseType: BuildContracts.TypeInfo.BuildDefinitionTemplate,
            responseIsCollection: true,
            routeValues: {
                project: projectId,
            },
            apiVersion: "3.2"
        });
    }

    private _updateBuild(projectId: string, buildId: number, data: any): IPromise<BuildContracts.Build> {
        return this._beginRequest<BuildContracts.Build>({
            httpMethod: "PATCH",
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.Builds,
            responseType: BuildContracts.TypeInfo.Build,
            apiVersion: "2.2",
            routeValues: {
                project: projectId,
                buildId: buildId
            },
            data: data
        });
    }
}

/**
 * Determines whether a build is finished.
 * The build is considered finished when its status is Failed, PartiallySucceeded, Stopped or Succeeded,
 * or when it has a finishTime that is not the minimum date value.
 * @param build The build id
 */
function isBuildFinished(build: BuildContracts.Build) {
    return !!build &&
        ((!!build.finishTime && !Utils_Date.isMinDate(build.finishTime))
            || build.status === BuildContracts.BuildStatus.Completed);
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("ClientServices", exports);
