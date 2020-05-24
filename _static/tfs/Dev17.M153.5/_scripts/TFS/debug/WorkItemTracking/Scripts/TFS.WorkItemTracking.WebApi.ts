import Q = require("q");
import Diag = require("VSS/Diag");
import WebApi_RestClient = require("VSS/WebApi/RestClient");
import WebApi_Contracts = require("VSS/WebApi/Contracts");
import TFSWebAccessWITConstants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.WorkItemTracking.Constants");

// Note: This client currently manually implements operations using the new REST API, in the future we would 
// like to use the shared client generator infrastructure (spyglass / swagger) and implement more operations

export interface IQueryHierarchyItem {
    id: string;
    name: string;
    path: string;
    isFolder: boolean;
    isPublic: boolean;
    hasChildren: boolean;
    children?: IQueryHierarchyItem[];
    wiql?: string;

    queryType?: string;
}

export interface IWorkItemTypeFieldtem {
    dependentFields: IWorkItemTypeDependentFieldItem[];
    _links: IWorkItemTypeFieldLinkItem;
}

export interface IWorkItemTypeDependentFieldItem {
    referenceName: string;
    name: string;
    url: string;
}

export interface IWorkItemRuleEnginePayload {
    rulesFrom: string[];
    fields: string[];
    fieldValues: IDictionaryStringTo<any>;
    fieldUpdates: IDictionaryStringTo<any>;
}

export interface IWorkItemTypeFieldLinkItem {
    parent: IUrlItem;
    self: IUrlItem;
}

export interface IUrlItem {
    href: string;
}

export interface IAttachmentReference {
    id: string;
    url: string;
}

interface IQueryData {
    name?: string;
    wiql?: string;
    isFolder?: boolean;
}

interface IQueryPostData extends IQueryData {
    id?: string;
}

interface IQueryPatchData extends IQueryData {
    id: string;
}

enum WorkItemTrackingHttpClientRequestType {
    Queries = 0,
    WorkItemTypeFields = 1,
    WorkItemRuleEngine = 2,
    Attachments = 3
}

export module AttachmentUploadType {
    export var Simple = "Simple";
    export var Chunked = "Chunked";
}

export var DefaultAttachmentChunkSize = 5000000; //5MB
export var AttachmentsLocationId = "E07B5FA4-1499-494D-A496-64B860FD64FF";


export class WorkItemTrackingHttpClient extends WebApi_RestClient.VssHttpClient {
    private static QueryLocation: WebApi_Contracts.ApiResourceLocation = {
        id: TFSWebAccessWITConstants.WitConstants.QueriesLocationId,
        area: TFSWebAccessWITConstants.WitConstants.AreaName,
        maxVersion: "2.0",
        minVersion: "2.0",
        releasedVersion: "2.0",
        resourceName: "queries",
        resourceVersion: 2,
        routeTemplate: "{project}/_apis/{area}/{resource}/{*query}"
    };

    private static WorkItemTypeFieldsLocation: WebApi_Contracts.ApiResourceLocation = {
        id: TFSWebAccessWITConstants.WitConstants.WorkItemTypeFieldsLocationId,
        area: TFSWebAccessWITConstants.WitConstants.AreaName,
        maxVersion: "2.0",
        minVersion: "1.0",
        releasedVersion: "1.0",
        resourceName: "workItemTypesField",
        resourceVersion: 1,
        routeTemplate: "{project}/_apis/{area}/workitemtypes/{type}/fields/{field}"
    };

    private static WorkItemRuleEngineLocation: WebApi_Contracts.ApiResourceLocation = {
        id: TFSWebAccessWITConstants.WitConstants.WorkItemRuleEngineLocationId,
        area: TFSWebAccessWITConstants.WitConstants.AreaName,
        resourceName: "ruleEngine",
        routeTemplate: "_apis/{area}/${resource}",
        resourceVersion: 1,
        minVersion: "1.0",
        maxVersion: "2.0",
        releasedVersion: "1.0"
    };

    private static AttachmentsLocation: WebApi_Contracts.ApiResourceLocation = {
        id: AttachmentsLocationId,
        area: TFSWebAccessWITConstants.WitConstants.AreaName,
        resourceName: "attachments",
        routeTemplate: "{project}/_apis/{area}/{resource}/{id}",
        resourceVersion: 1,
        minVersion: "1.0",
        maxVersion: "2.0",
        releasedVersion: "1.0"
    };

    private _baseRootRequestPath: string;

    constructor(rootRequestPath: string) {
        super(rootRequestPath);

        this._baseRootRequestPath = rootRequestPath;
    }

    public beginGetRootQueries(projectNameOrId: string, depth: number): IPromise<IQueryHierarchyItem[]> {
        /// <summary>Get query hierarchy root</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="depth" type="number">Depth of hierarchy to retrieve</param>
        /// <returns>Promise</returns>

        Diag.Debug.assertParamIsStringNotEmpty(projectNameOrId, "projectNameOrId");
        Diag.Debug.assertParamIsInteger(depth, "depth");

        var responseOptions: WebApi_RestClient.VssApiResourceRequestParams = this._getQueryRequestOptions(projectNameOrId, depth);

        // We expect a number of root level queries
        responseOptions.responseIsCollection = true;

        return this._beginRequest<IQueryHierarchyItem[]>(responseOptions);
    }

    public beginGetQueries(projectNameOrId: string, depth: number, queryIdOrPath: string): IPromise<IQueryHierarchyItem> {
        /// <summary>Get query hierarchy starting from a given query item</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="depth" type="number">Depth of hierarchy to retrieve</param>
        /// <param name="queryIdOrPath" type="string">Id or path of query item to retrieve</param>
        /// <returns>Promise</returns>

        Diag.Debug.assertParamIsStringNotEmpty(projectNameOrId, "projectNameOrId");
        Diag.Debug.assertParamIsInteger(depth, "depth");
        Diag.Debug.assertParamIsStringNotEmpty(queryIdOrPath, "queryIdOrPath");

        var requestOptions = this._getQueryRequestOptions(projectNameOrId, depth, {
            "query": queryIdOrPath
        });

        return this._beginRequest<IQueryHierarchyItem>(requestOptions);
    }

    public beginGetQueriesByPath(projectNameOrId: string, depth: number, path: string): IPromise<IQueryHierarchyItem> {
        /// <summary>Get query hierarchy starting from a given query path</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="depth" type="number">Depth of hierarchy to retrieve</param>
        /// <param name="path" type="string">Path of query item to retrieve</param>
        /// <returns>Promise</returns>

        Diag.Debug.assertParamIsStringNotEmpty(projectNameOrId, "projectNameOrId");
        Diag.Debug.assertParamIsInteger(depth, "depth");
        Diag.Debug.assertParamIsStringNotEmpty(path, "path");

        var requestOptions = this._getQueryRequestOptions(projectNameOrId, depth);
        $.extend(requestOptions.data, {
            "query": path
        });

        return this._beginRequest<IQueryHierarchyItem>(requestOptions);
    }

    public beginCreateQueryDefinition(projectNameOrId: string, name: string, wiql: string, parentIdOrPath: string): IPromise<IQueryHierarchyItem> {
        /// <summary>Create a new query definition</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="name" type="string">Name of new query definition</param>
        /// <param name="wiql" type="string">Wiql of new query definition</param>
        /// <param name="parentIdOrPath" type="string">Path or id of parent folder</param>
        /// <returns>Promise</returns>

        Diag.Debug.assertParamIsStringNotEmpty(name, "name");
        Diag.Debug.assertParamIsStringNotEmpty(wiql, "wiql");
        Diag.Debug.assertParamIsStringNotEmpty(parentIdOrPath, "parentIdOrPath");

        return this._postQueryItem(projectNameOrId, {
            name: name,
            wiql: wiql,
            isFolder: false
        }, parentIdOrPath);
    }

    public beginCreateQueryFolder(projectNameOrId: string, name: string, parentIdOrPath: string): IPromise<IQueryHierarchyItem> {
        /// <summary>Create a new query folder</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="name" type="string">Name of new query folder</param>
        /// <param name="parentIdOrPath" type="string">Path or id of parent folder</param>
        /// <returns>Promise</returns>

        return this._postQueryItem(projectNameOrId, {
            name: name,
            isFolder: true
        }, parentIdOrPath);
    }

    public beginMoveQueryItem(projectNameOrId: string, queryId: string, newParentIdOrPath: string): IPromise<IQueryHierarchyItem> {
        /// <summary>Move a query item to a query folder</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="queryId" type="string">Id of query item to move</param>
        /// <param name="newParentIdOrPath" type="string">Path or id of parent folder</param>
        /// <returns>Promise</returns>

        return this._postQueryItem(projectNameOrId, {
            id: queryId
        }, newParentIdOrPath);
    }

    public beginUpdateQueryDefinition(projectNameOrId: string, queryId: string, wiql: string): IPromise<IQueryHierarchyItem> {
        /// <summary>Update a query definition</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="queryId" type="string">Id of query definition to update</param>
        /// <param name="wiql" type="string">Updated wiql</param>
        /// <returns>Promise</returns>

        return this._patchQueryItem(projectNameOrId, {
            id: queryId,
            wiql: wiql
        });
    }

    public beginRenameQueryItem(projectNameOrId: string, queryId: string, name: string): IPromise<IQueryHierarchyItem> {
        /// <summary>Rename a query item</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="queryId" type="string">Id of query item to rename</param>
        /// <param name="name" type="string">New name of query item</param>
        /// <returns>Promise</returns>

        return this._patchQueryItem(projectNameOrId, {
            id: queryId,
            name: name
        });
    }

    public beginDeleteQueryItem(projectNameOrId: string, queryId: string): IPromise<any> {
        /// <summary>Delete a query item</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="queryId" type="string">If of query item to delete</param>
        /// <returns>Promise</returns>

        var requestOptions = this._getRequestOptions(WorkItemTrackingHttpClientRequestType.Queries, "DELETE", null, {
            "query": queryId,
            "project": projectNameOrId
        });

        return this._beginRequest(requestOptions);
    }

    public _beginGetLocation(area: string, locationId: string): IPromise<any> {
        /// <summary>Gets information about an API resource location (route template, supported versions, etc.)</summary>
        /// <param name="area" type="String">resource area name</param>
        /// <param name="locationId" type="String">Guid of the location to get</param>

        // Use a cached location here to avoid an additional OPTIONS request for the queries to further improve performance
        var deferred = Q.defer();
        switch (locationId) {
            case WorkItemTrackingHttpClient.WorkItemTypeFieldsLocation.id:
                deferred.resolve(WorkItemTrackingHttpClient.WorkItemTypeFieldsLocation);
                break;
            case WorkItemTrackingHttpClient.QueryLocation.id:
                deferred.resolve(WorkItemTrackingHttpClient.QueryLocation);
                break;
            case WorkItemTrackingHttpClient.WorkItemRuleEngineLocation.id:
                deferred.resolve(WorkItemTrackingHttpClient.WorkItemRuleEngineLocation);
                break;
            case WorkItemTrackingHttpClient.AttachmentsLocation.id:
                deferred.resolve(WorkItemTrackingHttpClient.AttachmentsLocation);
                break;
        }

        return deferred.promise;
    }

    private _postQueryItem(projectNameOrId: string, data: IQueryPostData, parentIdOrPath: string): IPromise<IQueryHierarchyItem> {
        var requestOptions = this._getRequestOptions(WorkItemTrackingHttpClientRequestType.Queries, "POST", data, {
            "query": parentIdOrPath,
            "project": projectNameOrId
        });
        return this._beginRequest(requestOptions);
    }

    private _patchQueryItem(projectNameOrId: string, data: IQueryPatchData): IPromise<IQueryHierarchyItem> {
        var requestOptions = this._getRequestOptions(WorkItemTrackingHttpClientRequestType.Queries, "PATCH", data, {
            "query": data.id,
            "project": projectNameOrId
        });

        return this._beginRequest(requestOptions);
    }

    private _getRequestOptions(requestType: WorkItemTrackingHttpClientRequestType, httpMethod: string, data?: any, routeValues?: any): WebApi_RestClient.VssApiResourceRequestParams {
        switch (requestType) {
            case WorkItemTrackingHttpClientRequestType.Queries:
                return <WebApi_RestClient.VssApiResourceRequestParams>{
                    httpMethod: httpMethod,
                    area: TFSWebAccessWITConstants.WitConstants.AreaName,
                    locationId: TFSWebAccessWITConstants.WitConstants.QueriesLocationId,
                    routeValues: routeValues,
                    data: $.extend(this._getDefaultParameters(), data),
                    responseIsCollection: false
                };
            case WorkItemTrackingHttpClientRequestType.WorkItemTypeFields:
                return <WebApi_RestClient.VssApiResourceRequestParams>{
                    httpMethod: httpMethod,
                    area: TFSWebAccessWITConstants.WitConstants.AreaName,
                    locationId: TFSWebAccessWITConstants.WitConstants.WorkItemTypeFieldsLocationId,
                    routeValues: routeValues,
                    data: $.extend(this._getDefaultParameters(), data),
                    responseIsCollection: false
                };
            case WorkItemTrackingHttpClientRequestType.WorkItemRuleEngine:
                return <WebApi_RestClient.VssApiResourceRequestParams>{
                    httpMethod: httpMethod,
                    area: TFSWebAccessWITConstants.WitConstants.AreaName,
                    locationId: TFSWebAccessWITConstants.WitConstants.WorkItemRuleEngineLocationId,
                    routeValues: routeValues,
                    queryParams: {
                        "api-version": TFSWebAccessWITConstants.WitConstants.DefaultPreviewApiVersion
                    },
                    data: data,
                    responseIsCollection: false
                };
            case WorkItemTrackingHttpClientRequestType.Attachments:
                return <WebApi_RestClient.VssApiResourceRequestParams>{
                    httpMethod: httpMethod,
                    area: TFSWebAccessWITConstants.WitConstants.AreaName,
                    locationId: AttachmentsLocationId,
                    routeValues: routeValues,
                    data: $.extend(this._getDefaultParameters(), data),
                    responseIsCollection: false
                };
        }
    }

    private _getQueryRequestOptions(projectNameOrId: string, depth: number, routeValues?: any): WebApi_RestClient.VssApiResourceRequestParams {
        return this._getRequestOptions(WorkItemTrackingHttpClientRequestType.Queries, "GET", {
            "$depth": depth,
            "$expand": "minimal"
        }, $.extend({
            "project": projectNameOrId
        }, routeValues));
    }

    /**
        ** WORK ITEM TYPE FIELDS 
    **/
    public beginGetWorkItemTypeFields(projectNameOrId: string, workItemTypeName: string, fieldName: string): IPromise<IWorkItemTypeFieldtem> {
        /// <summary>Get work item type fields</summary>
        /// <param name="projectNameOrId" type="string">Name or id of project</param>
        /// <param name="workItemTypeName" type="string">Name of work item type</param>
        /// <param name="fieldName" type="number">Field name to retrieve</param>
        /// <returns>Promise</returns>
        Diag.Debug.assertParamIsStringNotEmpty(projectNameOrId, "projectNameOrId");
        Diag.Debug.assertParamIsStringNotEmpty(workItemTypeName, "workItemTypeName");
        Diag.Debug.assertParamIsStringNotEmpty(fieldName, "fieldName");

        var requestOptions = this._getRequestOptions(WorkItemTrackingHttpClientRequestType.WorkItemTypeFields, "GET", null, {
            project: projectNameOrId,
            type: workItemTypeName,
            field: fieldName
        });

        return this._beginRequest<IWorkItemTypeFieldtem>(requestOptions);
    }

    /**
        ** WORK ITEM RULE ENGINE
    **/
    public beginRunRuleEngine(workItemTypeUrl: string, fields: string[], originalFieldValues: IDictionaryStringTo<any>, newFieldValues: IDictionaryStringTo<any>): IPromise<any> {
        /// <summary>Run work item type rule engine on given set of fields and field updates</summary>
        /// <param name="workItemTypeUrl" type="string">The rest url for work item type</param>
        /// <param name="fields" type="Array">Fields to validate</param>
        /// <param name="originalFieldValues" type="object">Original field values</param>
        /// <param name="newFieldValues" type="object">New field values</param>
        /// <returns>Promise</returns>

        Diag.Debug.assertParamIsStringNotEmpty(workItemTypeUrl, "workItemTypeUrl");

        var data: IWorkItemRuleEnginePayload = {
            rulesFrom: [workItemTypeUrl],
            fields: fields,
            fieldValues: originalFieldValues,
            fieldUpdates: newFieldValues
        };

        var requestOptions = this._getRequestOptions(WorkItemTrackingHttpClientRequestType.WorkItemRuleEngine, "POST", data);

        return this._beginRequest<IWorkItemTypeFieldtem>(requestOptions);
    }

    public getAttachmentUrl(projectNameOrId: string, id: string, fileName?: string, download?: boolean): string {
        const routeValues = {
            "id": id,
            "project": projectNameOrId
        };
        const attachmentsLocation = WorkItemTrackingHttpClient.AttachmentsLocation;

        const attachmentUrl = this.getRequestUrl(attachmentsLocation.routeTemplate, attachmentsLocation.area, attachmentsLocation.resourceName, routeValues, {
            "fileName": fileName,
            "download" : download,
            "api-version": "5.0-preview.2" // required for anonymous access
        });

        return attachmentUrl;
    }

    /**
        ** ATTACHMENTS
    **/
    public beginAttachmentUpload(projectNameOrId: string, file: File, areaPath: string, chunkSize?: number, shouldContinue?: any, fileName?: string): IPromise<any> {

        Diag.Debug.assertParamIsObject(file, "file");

        var attachmentChunkSize: number = chunkSize ? chunkSize : DefaultAttachmentChunkSize;
        //if we provide a chunk size, use that; otherwise, use the default chunk size
        if (file.size > attachmentChunkSize) {
            return this.beginAttachmentUploadChunked(projectNameOrId, file, areaPath, attachmentChunkSize, shouldContinue, fileName);
        }
        else {
            return this.beginAttachmentUploadSimple(projectNameOrId, file, areaPath, fileName);
        }
    }

    public beginAttachmentUploadChunked(projectNameOrId: string, file: File, areaPath?: string, chunkSize?: number, shouldContinue?: any, fileName?: string): IPromise<any> {

        Diag.Debug.assertParamIsObject(file, "file");
        Diag.Debug.assert($.isFunction(file.slice), "Uploading files in chunks is not supported from older browsers.");
        var deferred = jQuery.Deferred();

        this._registerAttachment(projectNameOrId, file, areaPath, fileName).then(
            (result: IAttachmentReference) => {
                this._uploadAttachment(projectNameOrId, result.id, file, chunkSize, shouldContinue, fileName, areaPath).then(
                    () => deferred.resolve(result),
                    (error) => deferred.reject(error));
            });

        return deferred.promise();
    }

    public beginAttachmentUploadSimple(projectNameOrId: string, file: File, areaPath: string, fileName?: string): IPromise<any> {
        Diag.Debug.assertParamIsObject(file, "file");

        var deferred = jQuery.Deferred();
        var reader = new FileReader();
        var fileErrorTriggered = false;

        var catchFileErrorCallback = (e) => {
            fileErrorTriggered = true;
            deferred.reject(e);
        };

        try {
            reader.readAsArrayBuffer(file);
        }
        catch (e) {
            //for Edge, where browser doesn't trigger onerror event
            catchFileErrorCallback(e);
        }

        //error handling for other browsers, where readAsArrayBuffer doesn't throw an exception
        reader.onerror = (e) => {
            catchFileErrorCallback(e);
        }

        reader.onloadend = () => {
            if (!fileErrorTriggered) {
                if (reader.readyState === reader.DONE) {
                    var binaryFileData = new Uint8Array(reader.result);
                    var requestParams = <WebApi_RestClient.VssApiResourceRequestParams>$.extend(this._getAttachmentUploadRequestParams("POST", projectNameOrId, AttachmentUploadType.Simple, areaPath, null, fileName), {
                        data: binaryFileData,
                        isRawData: true
                    });
                    this._beginRequest(requestParams).then(
                        (result: IAttachmentReference) => deferred.resolve(result),
                        (error) => deferred.reject(error));
                }
            }
        }
        return deferred.promise();
    }

    private _registerAttachment(projectNameOrId: string, file: File, areaPath: string, fileName?: string): IPromise<any> {

        var requestParams = this._getAttachmentUploadRequestParams("POST", projectNameOrId, AttachmentUploadType.Chunked, areaPath, null, fileName);

        return this._beginRequest(requestParams);
    }

    private _uploadAttachment(projectNameOrId: string, attachmentId: string, file: File, chunkSize?: number, shouldContinue?: any, fileName?: string, areaPath?: string): IPromise<any> {
        Diag.Debug.assertParamIsObject(file, "file");
        var deferred = jQuery.Deferred();

        if (!chunkSize || chunkSize <= 0) {
            chunkSize = DefaultAttachmentChunkSize;
        }

        var fileSize = file.size;
        var start = 0;
        var end = Math.min(chunkSize, fileSize) - 1;

        var uploadRequest: WebApi_RestClient.VssApiResourceRequestParams = this._getAttachmentUploadRequestParams("PUT", projectNameOrId, AttachmentUploadType.Chunked, areaPath, attachmentId, fileName);
        var that = this;

        sendChunk();

        function sendChunk() {
            var blob: Blob;
            if ($.isFunction(file.slice) && (!shouldContinue || shouldContinue())) {
                //File.Slice() reads the file from byte value start to end, where end is exclusive
                blob = file.slice(start, end + 1);
            }
            else {
                deferred.reject();
            }

            var reader = new FileReader();
            var fileErrorTriggered = false;

            var catchFileErrorCallback = (e) => {
                fileErrorTriggered = true;
                deferred.reject(e);
            };

            try {
                reader.readAsArrayBuffer(blob);
            }
            catch (e) {
                //for Edge, where browser doesn't trigger onerror event
                catchFileErrorCallback(e);
            }

            //error handling for other browsers, where readAsArrayBuffer doesn't throw an exception
            reader.onerror = (e) => {
                catchFileErrorCallback(e);
            }

            reader.onloadend = () => {
                if (!fileErrorTriggered) {
                    if (reader.readyState === reader.DONE) {
                        var requestParams = <WebApi_RestClient.VssApiResourceRequestParams>$.extend(uploadRequest, {
                            data: new Uint8Array(reader.result),
                            isRawData: true,
                            customHeaders: {
                                "Content-Range": "bytes " + start + "-" + end + "/" + fileSize
                            }
                        });

                        that._beginRequest(requestParams).then(
                            () => {
                                if (end < fileSize - 1) {
                                    start += chunkSize;
                                    end = Math.min(end + chunkSize, fileSize - 1);
                                    sendChunk();
                                }
                                else {
                                    deferred.resolve();
                                }

                                return null;
                            },
                            (error) => deferred.reject(error));
                    }
                }
            }
        }

        return deferred.promise();
    }

    private _getAttachmentUploadRequestParams(httpMethod: string, projectNameOrId: string, uploadType: string, areaPath?: string, id?: string, fileName?: string): WebApi_RestClient.VssApiResourceRequestParams {
        var requestParams = <WebApi_RestClient.VssApiResourceRequestParams>{
            area: TFSWebAccessWITConstants.WitConstants.AreaName,
            locationId: AttachmentsLocationId,
            queryParams: {
                uploadType: uploadType,
                areaPath: areaPath,
                fileName: fileName
            },
            routeValues: {
                "project": projectNameOrId
            },
            httpMethod: httpMethod,
            apiVersion: TFSWebAccessWITConstants.WitConstants.DefaultReleaseApiVersion
        };

        if (id) {
            return <WebApi_RestClient.VssApiResourceRequestParams>$.extend(requestParams, {
                routeValues: {
                    "id": id,
                    "project": projectNameOrId
                }
            });
        }

        return requestParams;
    }

    private _getDefaultParameters(): any {
        return {
            "api-version": TFSWebAccessWITConstants.WitConstants.DefaultReleaseApiVersion
        };
    }
}