import Q = require("q");

import { GetBuildsResult, GetDefinitionsResult, IBuildFilter, IBuildFilterBase, GetDefinitionsOptions } from "Build.Common/Scripts/ClientContracts";
import { Build2ResourceIds } from "Build.Common/Scripts/Generated/TFS.Build2.Common";
import { IBuildClient } from "Build.Common/Scripts/IBuildClient";
import { getAssociatedWorkItems } from "Build.Common/Scripts/WorkItems";

import ArtifactHttpClient = require("ArtifactServices/RestClient");

import TFSWorkItemTrackingConstants = require("Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");

import BuildContracts = require("TFS/Build/Contracts");
import BuildClient = require("TFS/Build/RestClient");
import DTContracts = require("TFS/DistributedTask/Contracts");
import * as VCContracts from "TFS/VersionControl/Contracts";
import * as WITContracts_NO_REQUIRE from "TFS/WorkItemTracking/Contracts";
import WITClient_NO_REQUIRE = require("TFS/WorkItemTracking/RestClient");

import VSS = require("VSS/VSS");
import SHCommon = require("VSS/Common/Contracts/FormInput");
import Serialization = require("VSS/Serialization");
import Service = require("VSS/Service");
import VSS_WebApi = require("VSS/WebApi/RestClient");
import Utils_Date = require("VSS/Utils/Date");
import Utils_Array = require("VSS/Utils/Array");
import WebApi_Contracts = require("VSS/WebApi/Contracts");
import { string, any, number } from "prop-types";
import { base64Encode } from "VSS/Utils/String";

/**
 * An extension to ArtifactHttpClient5, adding the capability to return a URI for downloading contents under a path.
 */
class ArtifactHttpClient5_Ext extends ArtifactHttpClient.ArtifactHttpClient5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    public getDownloadUri(
        account: string, projectId: string, buildId: number, artifactName: string, path: string, artifactId: string)
        : IPromise<string> {
        let artIdRaw: string = "pipelineartifact://" + account + "/projectId/" + projectId + "/buildId/" + buildId + "/artifactName/" + artifactName;
        // Encoding is done based on this algorithm https://dev.azure.com/mseng/_git/AzureDevOps?path=%2FVssf%2FClient%2FCommon%2FUtility%2FUrlEncodingUtility.cs&version=GBmaster - method UrlTokenEncode.
        // Step 1 : Do Base64 encoding.
        let artId: string = window.btoa(artIdRaw);
        //Step 2: Find out how many padding characters are present in the end.
        var arr = artId.split('');
        let countPaddingChars: number = 0;
        for (var i = arr.length - 1; i >= 0; i--) {
            if (arr[i] != '=') {
                break;
            }
            countPaddingChars++;
        }
        //Step 3: Transform the "+" to "-", and "/" to "_" and append a char to indicate how many padding chars are needed.
        artId = artId.replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "");
        artId += countPaddingChars.toString();

        let routeValues: any = {
            artifactId: artId,
            content: buildId
        };

        const queryValues: any = {
            format: "zip",
            subPath: path
        };

        return this._beginGetLocation("artifact", "F2984867-8EBD-433E-8FFF-6E19D7C68C60").then(
            (location: WebApi_Contracts.ApiResourceLocation) => {
                return this.getRequestUrl(location.routeTemplate, location.area, location.resourceName, routeValues, queryValues);
            }
        );
    }
}

/**
 * An extension to BuildHttpClient5, adding the capability to return a file URI.
 */
class BuildHttpClient5_Ext extends BuildClient.BuildHttpClient5 {

    constructor(rootRequestPath: string, options?: VSS_WebApi.IVssHttpClientOptions) {
        super(rootRequestPath, options);
    }

    public getFileUri(buildId: number, artifactName: string, dedupId: string, fileName: string, project?: string): IPromise<string> {
        let routeValues: any = {
            project: project,
            buildId: buildId
        };

        const queryValues: any = {
            artifactName: artifactName,
            fileId: dedupId,
            fileName: fileName,
			"api-version": this.templatesApiVersion
        };

        return this._beginGetLocation(Build2ResourceIds.AreaName, Build2ResourceIds.Artifacts).then(
            (location: WebApi_Contracts.ApiResourceLocation) => {
                return this.getRequestUrl(location.routeTemplate, location.area, location.resourceName, routeValues, queryValues);
            }
        );
    }
}

// TypeScript definition for TextDecoder (https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder)
interface TextDecoder {
    decode(input?: ArrayBufferView, options?: any): string;
}
interface TextDecoderCtor {
    new(label?: string, options?: any): TextDecoder;
}
declare const TextDecoder: TextDecoderCtor;

export class BuildHttpClient extends BuildClient.BuildHttpClient {
    constructor(rootRequestPath: string) {
        super(rootRequestPath);
    }

    /**
     * Cancel a Build
     * @param projectId The project id
     * @param buildId Id of the build
     */
    public cancelBuild(projectId: string, buildId: number): IPromise<BuildContracts.Build> {
        return this.updateBuild(<BuildContracts.Build>{
            status: BuildContracts.BuildStatus.Cancelling
        }, buildId, projectId);
    }

    /**
     * Gets builds matching a filter
     * @param projectId The project id
     * @param filter The filter
     */
    public getBuilds2(projectId: string, filter?: IBuildFilter): IPromise<GetBuildsResult> {
        return this._beginRequestWithAjaxResult<BuildContracts.Build[]>({
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.Builds,
            responseType: BuildContracts.TypeInfo.Build,
            responseIsCollection: true,
            routeValues: {
                project: projectId
            },
            queryParams: filter
        }).spread(
            (builds: BuildContracts.Build[], textStatus: string, jqXHR: JQueryXHR) => {
                return {
                    builds: builds,
                    continuationToken: jqXHR.getResponseHeader("x-ms-continuationtoken")
                };
            });
    }

    /**
     * Gets definitions matching a filter
     * @param projectId The project id
     * @param filter The filter
     */
    public getDefinitions2(projectId: string, filter?: GetDefinitionsOptions): IPromise<GetDefinitionsResult> {
        return this._beginRequestWithAjaxResult<BuildContracts.BuildDefinition[]>({
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.Definitions,
            responseType: BuildContracts.TypeInfo.BuildDefinition,
            responseIsCollection: true,
            routeValues: {
                project: projectId
            },
            queryParams: filter
        }).spread(
            (definitions: BuildContracts.BuildDefinition[], textStatus: string, jqXHR: JQueryXHR) => {
                return {
                    definitions: definitions,
                    continuationToken: jqXHR.getResponseHeader("x-ms-continuationtoken")
                };
            });
    }

    /**
     * Updates the KeepForever flag for a build
     * @param projectId The project id
     * @param buildId The build id
     * @param keepForever The new value
     */
    public updateBuildRetainFlag(projectId: string, buildId: number, keepForever: boolean): IPromise<any> {
        return this.updateBuild(<BuildContracts.Build>{
            keepForever: keepForever
        }, buildId, projectId);
    }

    /**
     * Queues a build
     *
     * @param {Contracts.Build} build
     * @param {string} project - Project ID or project name
     * @param {boolean} ignoreWarnings
     * @return IPromise<Contracts.Build>
     */
    public queueBuild(build: BuildContracts.Build, project?: string, ignoreWarnings?: boolean): IPromise<BuildContracts.Build> {
        return super.queueBuild(build, project, ignoreWarnings).then(
            (queuedBuild: BuildContracts.Build) => {
                return queuedBuild;
            },
            (error: any) => {
                let exception;
                if (error.responseText) {
                    exception = JSON.parse(error.responseText);
                }
                if (exception && exception.customProperties && exception.customProperties.ValidationResults) {
                    // simulate wrapped json array
                    const validationResults = {
                        value: exception.customProperties.ValidationResults
                    };
                    return Promise.reject(Serialization.ContractSerializer.deserialize(validationResults, BuildContracts.TypeInfo.BuildRequestValidationResult, false, true));
                }
                else {
                    return Promise.reject(error);
                }
            }
        );
    }

    /**
     * Queries for input values
     * @param projectId The project id
     * @param query The query
     */
    public queryInputValues(projectId: string, query: SHCommon.InputValuesQuery): IPromise<SHCommon.InputValuesQuery> {
        return this._beginRequest({
            httpMethod: "POST",
            area: Build2ResourceIds.AreaName,
            locationId: Build2ResourceIds.InputValuesQuery,
            data: query,
            apiVersion: "5.0-preview.2",
            routeValues: {
                project: projectId
            }
        });
    }
}

export class BuildClientService extends TFS_Service.TfsService implements IBuildClient {
    private _collectionHttpClient: BuildHttpClient;
    private _collectionHttpWitLazyClient: WITClient_NO_REQUIRE.WorkItemTrackingHttpClient4;
    // A 5.0 client providing API for pipeline artifact manifest/file retrieval. To be initialized lazily.
    private _collectionHttpClient5: () => BuildHttpClient5_Ext;
    // A 5.0 client providing API for pipeline artifact directory retrieval. To be initialized lazily.
    private _collectionArtifactHttpClient5: () => ArtifactHttpClient5_Ext;
    private _hostUrl: string;

    /**
     * Initializes the TFS service with a connection
     * @param connection The connection
     */
    public initializeConnection(connection: Service.VssConnection) {
        super.initializeConnection(connection);

        let conn: Service.VssConnection = this.getConnection();
        this._collectionHttpClient = conn.getHttpClient(BuildHttpClient);
        this._hostUrl = conn.getHostContext().uri;
        this._collectionHttpClient5 = function () {
            let _client: BuildHttpClient5_Ext;
            return function () {
                if (!_client) {
                    _client = conn.getHttpClient(BuildHttpClient5_Ext);
                }

                return _client;
            }
        }();
        this._collectionArtifactHttpClient5 = function () {
            let _client: ArtifactHttpClient5_Ext;
            return function () {
                if (!_client) {
                    _client = conn.getHttpClient(ArtifactHttpClient5_Ext);
                }

                return _client;
            }
        }();
    }

    /**
     * Adds a tag to a build
     * @param buildId The build id
     * @param tag The tag
     */
    public addBuildTag(buildId: number, tag: string): IPromise<string[]> {
        const projectId = this.getTfsContext().contextData.project.id;
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
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.deleteBuildTag(projectId, buildId, tag);
    }

    /**
     * Gets an artifact
     * @param buildId The build id
     * @param artifactName The artifact name
     */
    public getBuildArtifact(buildId: number, artifactName: string): IPromise<BuildContracts.BuildArtifact> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getArtifact(projectId, buildId, artifactName);
    }

    /**
     * Gets build artifacts
     * @param buildId The build id
     */
    public getBuildArtifacts(buildId: number): IPromise<BuildContracts.BuildArtifact[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getArtifacts(buildId, projectId);
    }

    /**
     * Gets the build (dedup) drop's manifest
     * 
     * @param buildId The build id
     * @param artifactName The artifact name
     * @param manifestId The manifest id for this build drop
     */
    public getBuildDropManifest(buildId: number, artifactName: string, manifestId: string): IPromise<any> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient5().getFile(buildId, artifactName, manifestId, "manifest", projectId) // File name is not important here
            .then(buffer => {
                let barray: Uint8Array = new Uint8Array(buffer);
                let contents: string = "";

                if (typeof (TextDecoder) === "undefined") {
                    try {
                        // On Internet Explorer/Edge, TextDecoder is unavailable. So we parse the contents using String.fromCharCode.
                        // Unfortunately, this function can easily crash if the contents are too large. Therefore split the string 
                        // and build up the result accumulatively. (WARNING: This approach needs some futher refinement to ensure 
                        // that we split at the right charcode boundary)
                        let sindex: number = 0, eindex: number = 0;
                        while (sindex < barray.length) {
                            let eindex = sindex + 1024;
                            let slice: Uint8Array = barray.slice(sindex, eindex);
                            contents += String.fromCharCode.apply(null, slice);
                            sindex = eindex;
                        }
                    }
                    catch (e) {
                        // What happens in try block is our best-efforts, since IE or Edge doesn't have access to TextDecoder.
                        console.error("Couldn't parse Artifact's manifest. The input is too large. Try a browser that is not Internet Explorer or Edge.");
                        throw e;
                    }
                }
                else {
                    let decoder: TextDecoder = new TextDecoder("ascii");
                    contents = decoder.decode(barray);
                }

                let result: any = JSON.parse(contents);
                return result.items;
            });
    }

    /**
     * Gets the URL for a build (dedup) drop's file.
     * @param projectId The project id
     * @param buildId The build id
     * @param artifactName The artifact name
     * @param fileName The file name - used as content disposition name in response
     * @param dedupId the file's dedup id
     */
    public getPipelineArtifactFileUri(projectId: string, buildId: number, artifactName: string, fileName: string, dedupId: string): IPromise<string> {
        let hostUrl: string = this._hostUrl;
        let buildHttpClient5: BuildHttpClient5_Ext = this._collectionHttpClient5();

        let fileUrl: IPromise<string> = buildHttpClient5.getFileUri(
            buildId, artifactName, dedupId, fileName, projectId).then(urlString => {
                let tempHostUrl = hostUrl.split("/");
                let tempHostUrlLength = tempHostUrl.length;
                let lastHostUrlItem = tempHostUrl[tempHostUrlLength - 1];
                if (lastHostUrlItem == "") {
                    lastHostUrlItem = tempHostUrl[tempHostUrlLength - 2];
                }
                let tempUrlString = urlString.split("/");
                let firstUrlStringItem = (urlString.startsWith('/') ? tempUrlString[1] :tempUrlString[0] );
                let host = hostUrl;
                let temp = urlString;
                if (!!lastHostUrlItem && lastHostUrlItem == firstUrlStringItem) {
                    temp = urlString.substr(firstUrlStringItem.length + (urlString.startsWith('/') ? 1 : 0));
                }
                if (host.endsWith('/')) {
                    host = host.substr(0, hostUrl.length - 1);
                }
                host += temp;
                return host;
            });

        return fileUrl;
    }

    /**
     * Gets the URL for a build (dedup) drop's directory.
     * @param account The account name
     * @param projectId The project id
     * @param buildId The build id
     * @param artifactName The artifact name
     * @param dirPath The directory path
     */
    public getPipelineArtifactDirectoryUri(
        projectId: string, buildId: number, artifactName: string, dirPath: string, artifactId: string): IPromise<string> {
        const account: string = this.getTfsContext().contextData.host.name;
        let artifactHttpClient5: ArtifactHttpClient5_Ext = this._collectionArtifactHttpClient5();

        let dirUrl: IPromise<string> = artifactHttpClient5.getDownloadUri(
            account, projectId, buildId, artifactName, dirPath, artifactId).then(url => {
                return url;
            });

        return dirUrl;
    }

    /**
     * Cancels a build
     * @param buildId buildId
     */
    public cancelBuild(buildId: number): IPromise<BuildContracts.Build> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.cancelBuild(projectId, buildId);
    }

    /**
     * Creates a folder
     * @param path path to create folder
     * @param folder folder object
     */
    public createFolder(path: string, folder: BuildContracts.Folder): IPromise<BuildContracts.Folder> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.createFolder(folder, projectId, path);
    }

    /**
     * Updates a folder
     * @param path path to create folder
     * @param folder folder object
     */
    public updateFolder(path: string, folder: BuildContracts.Folder): IPromise<BuildContracts.Folder> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.updateFolder(folder, projectId, path);
    }

    /**
     * Gets builds
     * @param filter filter
     */
    public getBuilds(filter: IBuildFilter): IPromise<GetBuildsResult> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuilds2(projectId, filter);
    }

    /**
     * Gets all builds
     * @param filter filter
     */
    public getAllBuilds(filter: IBuildFilterBase): IPromise<GetBuildsResult> {
        const projectId = this.getTfsContext().contextData.project.id;
        let buildFilter: IBuildFilter = filter || {};
        buildFilter.statusFilter = BuildContracts.BuildStatus.All;
        return this._collectionHttpClient.getBuilds2(projectId, buildFilter);
    }

    /**
     * Gets completed builds
     * @param filter filter
     */
    public getCompletedBuilds(filter: IBuildFilterBase): IPromise<GetBuildsResult> {
        const projectId = this.getTfsContext().contextData.project.id;
        let buildFilter: IBuildFilter = filter || {};
        buildFilter.statusFilter = BuildContracts.BuildStatus.Completed;
        return this._collectionHttpClient.getBuilds2(projectId, buildFilter);
    }

    /**
     * Gets running builds
     * @param filter filter
     */
    public getRunningBuilds(filter: IBuildFilterBase): IPromise<GetBuildsResult> {
        const projectId = this.getTfsContext().contextData.project.id;
        let buildFilter: IBuildFilter = filter || {};
        buildFilter.statusFilter = BuildContracts.BuildStatus.InProgress;
        return this._collectionHttpClient.getBuilds2(projectId, buildFilter);
    }

    /**
     * Gets queued builds that hasn't started
     * @param filter filter
     */
    public getQueuedBuilds(filter: IBuildFilterBase): IPromise<GetBuildsResult> {
        const projectId = this.getTfsContext().contextData.project.id;
        let buildFilter: IBuildFilter = filter || {};
        buildFilter.statusFilter = BuildContracts.BuildStatus.NotStarted;
        return this._collectionHttpClient.getBuilds2(projectId, buildFilter);
    }

    /**
     * Gets the build with the specified id
     * @param buildId The build id
     */
    public getBuild(buildId: number): IPromise<BuildContracts.Build> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuild(buildId, projectId);
    }

    /**
     * Gets definitions
     * @param filter filter
     */
    public getDefinitions(filter?: GetDefinitionsOptions): IPromise<GetDefinitionsResult> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getDefinitions2(projectId, filter);
    }

    /**
     * Gets a definition, optionally at a specific revision
     * @param definitionId The definition id
     * @param revision The revision number
     * @param minMetricsTime Minimum metrics time
     */
    public getDefinition(definitionId: number, revision?: number, minMetricsTime?: Date, propertyFilters?: string[]): IPromise<BuildContracts.BuildDefinition> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getDefinition(definitionId, projectId, revision, minMetricsTime, propertyFilters);
    }

    /**
     * Gets definition metrics
     * @param definitionId The definition id
     * @param minMetricsTime The time from which to retrieve metrics
     */
    public getDefinitionMetrics(definitionId: number, minMetricsTime?: Date): IPromise<BuildContracts.BuildMetric[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getDefinitionMetrics(projectId, definitionId, minMetricsTime);
    }

    /**
     * Gets build changes
     * @param buildId The build id
     * @param top The number of changes to return
     * @param includeSourceChange Gets at least the source change
     */
    public getBuildChanges(buildId: number, top?: number, includeSourceChange?: boolean): IPromise<BuildContracts.Change[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildChanges(projectId, buildId, null, top, includeSourceChange);
    }

    /**
     * Gets all revisions of a definition
     * @param definitionId The definition id
     */
    public getDefinitionRevisions(definitionId: number): IPromise<BuildContracts.BuildDefinitionRevision[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getDefinitionRevisions(projectId, definitionId);
    }

    /**
     * Gets folders
     * @param path path
     */
    public getFolders(path?: string, queryOrder: BuildContracts.FolderQueryOrder = BuildContracts.FolderQueryOrder.FolderAscending): IPromise<BuildContracts.Folder[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getFolders(projectId, path, queryOrder);
    }

    /**
     * Gets suggested tags for the current project
     */
    public getSuggestedTags(): IPromise<string[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getTags(projectId);
    }

    /**
     * Updates the retain flag of a build
     * @param buildId The build id
     * @param keepForever The flag
     */
    public updateBuildRetainFlag(buildId: number, keepForever: boolean): IPromise<BuildContracts.Build> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.updateBuildRetainFlag(projectId, buildId, keepForever);
    }

    /**
     * Deletes a build in vNext
     * @param buildId The build id
     */
    public deleteBuild(buildId: number): IPromise<any> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.deleteBuild(buildId, projectId);
    }

    /**
     * Creates a new definition
     * @param definition The definition
     * @param definitionToCloneId The id of the definition being cloned
     * @param definitionToCloneRevision The revision of the definition being cloned
     */
    public createDefinition(definition: BuildContracts.BuildDefinition, definitionToCloneId?: number, definitionToCloneRevision?: number): IPromise<BuildContracts.BuildDefinition> {
        const projectId = this.getTfsContext().contextData.project.id;
        definition.quality = BuildContracts.DefinitionQuality.Definition;

        return this._collectionHttpClient.createDefinition(definition, projectId, definitionToCloneId, definitionToCloneRevision);
    }

    /**
     * Deletes a definition in vNext
     * @param definition The definition id
     */
    public deleteDefinition(definitionId: number): IPromise<any> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.deleteDefinition(definitionId, projectId);
    }

    /**
     * Deletes a folder
     * @param path Path to delete
     */
    public deleteFolder(path: string): IPromise<any> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.deleteFolder(projectId, path);
    }

    /**
     * Deletes a definition template
     * @param templateId The template id
     */
    public deleteDefinitionTemplate(templateId: string): IPromise<void> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.deleteTemplate(projectId, templateId);
    }

    /**
     * Updates a definition
     * @param definition The definition
     * @param secretsSourceDefinitionId The secrets source definition id
     */
    public updateDefinition(definition: BuildContracts.BuildDefinition, secretsSourceDefinitionId?: number) {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.updateDefinition(definition, definition.id, projectId, secretsSourceDefinitionId);
    }

    /**
     * Puts a definition template
     * @param templateId The template id
     * @param template The template to update
     */
    public putDefinitionTemplate(templateId: string, template: BuildContracts.BuildDefinitionTemplate): IPromise<BuildContracts.BuildDefinitionTemplate> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.saveTemplate(template, projectId, templateId);
    }

    /**
     * Creates a draft of an existing definition
     * @param parentDefinitionId The id of the parent definition
     * @param draft The draft
     * @param comment A comment for the revision history
     */
    public putScopedDraft(parentDefinitionId: number, draft: BuildContracts.BuildDefinition, comment: string, replace: boolean): IPromise<BuildContracts.BuildDefinition> {
        // creating a new draft scoped to a parent definition
        draft.draftOf = <BuildContracts.DefinitionReference>{
            id: parentDefinitionId
        };
        return this.postDraft(draft, comment, replace);
    }

    /**
     * Creates a new draft definition
     * @param draft The draft
     * @param comment A comment for the revision history
     */
    public postDraft(draft: BuildContracts.BuildDefinition, comment: string, replace: boolean = false): IPromise<BuildContracts.BuildDefinition> {
        const projectId = this.getTfsContext().contextData.project.id;
        draft.quality = BuildContracts.DefinitionQuality.Draft;
        draft.comment = comment;

        if (replace) {
            return this._collectionHttpClient.updateDefinition(draft, draft.id, projectId);
        }
        else {
            // the draft is a clone of the original, so pass its id and revision as the clone parameters
            return this._collectionHttpClient.createDefinition(draft, projectId, draft.id, draft.revision);
        }
    }

    /**
     * Gets all build definition templates
     */
    public getDefinitionTemplates(): IPromise<BuildContracts.BuildDefinitionTemplate[]> {
        var projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getTemplates(projectId);
    }

    /**
     * Gets all build definition templates
     */
    public getDefinitionTemplate(templateId: string): IPromise<BuildContracts.BuildDefinitionTemplate> {
        var projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getTemplate(projectId, templateId);
    }

    /**
     * Gets all build definition options
     */
    public getOptionDefinitions(): IPromise<BuildContracts.BuildOptionDefinition[]> {
        var projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildOptionDefinitions(projectId);
    }

    /**
     * Gets all branches for the given service endpoint and repository.
     * @param serviceEndpointId The service endpoint to query.
     * @param repositoryType The type of repository the service endpoint represents.
     * @param repository The identifier or name of the repository to query.
     */
    public getBranches(serviceEndpointId: string, repositoryType: string, repository?: string): IPromise<string[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.listBranches(projectId, repositoryType, serviceEndpointId, repository);
    }

    /**
     * Gets all repositories for the given service endpoint.
     * @param serviceEndpointId The service endpoint to query.
     * @param repositoryType The type of repository the service endpoint represents.
     * @param top show the top results only
     * @param continuationToken a specific page of results
     */
    public getRepositories(serviceEndpointId: string, repositoryType: string, top: boolean, continuationToken?: string): IPromise<BuildContracts.SourceRepositories> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.listRepositories(
            projectId,
            repositoryType,
            serviceEndpointId,
            null,
            top ? BuildContracts.ResultSet.Top : BuildContracts.ResultSet.All,
            false, // TODO: support paging
            null);
    }

    /**
     * Gets a repository for the given service endpoint.
     * @param serviceEndpointId The service endpoint to query.
     * @param repositoryType The type of repository the service endpoint represents.
     * @param repository The identifier or name of the repository.
     */
    public getRepository(serviceEndpointId: string, repositoryType: string, repository: string): IPromise<BuildContracts.SourceRepository> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.listRepositories(projectId, repositoryType, serviceEndpointId, repository).then(
            repositories => Utils_Array.first(repositories.repositories));
    }

    /**
     * Gets all the attributes for the source providers.
     */
    public getSourceProviders(): IPromise<BuildContracts.SourceProviderAttributes[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.listSourceProviders(projectId);
    }

    /**
     * Gets all webhooks for the given service endpoint and repository.
     * @param serviceEndpointId The service endpoint to query.
     * @param repositoryType The type of repository the service endpoint represents.
     * @param repository The identifier or name of the repository to query.
     */
    public getWebhooks(serviceEndpointId: string, repositoryType: string, repository?: string): IPromise<BuildContracts.RepositoryWebhook[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.listWebhooks(projectId, repositoryType, serviceEndpointId, repository);
    }

    /**
     * Gets the contents of a file for the given service endpoint and repository.
     * @param serviceEndpointId The service endpoint to query.
     * @param repositoryType The type of repository the service endpoint represents.
     * @param repository The identifier or name of the repository to query.
     * @param commitOrBranch The commit or branch to retrieve the file from.
     * @param path The path to the file.
     */
    public getFileContents(serviceEndpointId: string, repositoryType: string, path: string, repository?: string, commitOrBranch?: string): IPromise<string> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getFileContents(projectId, repositoryType, serviceEndpointId, repository, commitOrBranch, path);
    }

    /**
     * Gets the contents of a directory for the given service endpoint and repository.
     * @param serviceEndpointId The service endpoint to query.
     * @param repositoryType The type of repository the service endpoint represents.
     * @param repository The identifier or name of the repository to query.
     * @param commitOrBranch The commit or branch to retrieve the directory from.
     * @param path The path to the directory.
     */
    public getPathContents(serviceEndpointId: string, repositoryType: string, path: string, repository?: string, commitOrBranch?: string): IPromise<BuildContracts.SourceRepositoryItem[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getPathContents(projectId, repositoryType, serviceEndpointId, repository, commitOrBranch, path);
    }

    /**
     * Queries for input values
     * @param query The query
     */
    public queryInputValues(query: SHCommon.InputValuesQuery): IPromise<SHCommon.InputValuesQuery> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.queryInputValues(projectId, query);
    }

    /**
     * Queries for input values
     * @param query The query
     */
    public recreateWebhook(serviceEndpointId: string, repositoryType: string, triggerTypes: BuildContracts.DefinitionTriggerType[], repository?: string): IPromise<void> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.restoreWebhooks(triggerTypes, projectId, repositoryType, serviceEndpointId, repository);
    }

    /**
     * Queues a build
     *
     * @param {Contracts.Build} build
     * @param {boolean} ignoreWarnings
     * @return IPromise<Contracts.Build>
     */
    public queueBuild(
        build: BuildContracts.Build,
        ignoreWarnings?: boolean
    ): IPromise<BuildContracts.Build> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.queueBuild(build, projectId, ignoreWarnings);
    }

    /**
     * Gets the build report with the specified id
     * @param buildId The build id
     */
    public getBuildReport(buildId: number): IPromise<BuildContracts.BuildReportMetadata> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildReport(projectId, buildId);
    }

    /**
     * Gets the default retention policy
     */
    public getBuildSettings(): IPromise<BuildContracts.BuildSettings> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildSettings(projectId);
    }

    /**
     * Gets a timeline
     * @param buildId The build id
     * @param timelineId The timeline id
     * @param changeId The earliest change to retrieve
     */
    public getTimeline(buildId: number, timelineId: string, changeId: number = 0, planId: string): IPromise<BuildContracts.Timeline> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildTimeline(projectId, buildId, timelineId, changeId, planId).then((timeline: BuildContracts.Timeline) => {
            return timeline;
        });
    }

    /**
     * Gets build workitems
     * @param buildId The build id
     * @param commitIds Array of commitIds
     */
    public getBuildWorkItems(buildId: number, commitIds: string[]): IPromise<VCContracts.AssociatedWorkItem[]> {
        let deferred = Q.defer<VCContracts.AssociatedWorkItem[]>();

        const projectId = this.getTfsContext().contextData.project.id;
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

                        // we are not defining asof, expand and errorPolicy
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
     * Gets attachments for a build.
     * @param buildId The build id
     * @param type The type of attachment
     */
    public getAttachments(buildId: number, type: string): IPromise<BuildContracts.Attachment[]> {
        const projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getAttachments(projectId, buildId, type);
    }

    /**
     * Get all logs for a build
     * @param buildId The build id
     */
    public getLogs(buildId: number): IPromise<BuildContracts.BuildLog[]> {
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
    public getBuildLog(buildId: number, logId: number, startLine?: number, endLine?: number): IPromise<string> {
        let projectId = this.getTfsContext().contextData.project.id;
        return this._collectionHttpClient.getBuildLog(projectId, buildId, logId, startLine, endLine);
    }

    public getInformationNodes(buildId: number, types?: string[], skip?: number, top?: number): IPromise<BuildContracts.InformationNode[]> {
        return Q.resolve([]);
    }

    public getBuildDeployments(buildId: number): IPromise<BuildContracts.Deployment[]> {
        return Q.resolve([]);
    }

    public updateXamlBuildQuality(buildId: number, quality: string): IPromise<any> {
        return Q.resolve({});
    }

    public updateXamlQualities(toAdd: string[], toRemove: string[]): IPromise<any[]> {
        return Q.resolve([]);
    }
}
