/// <reference types="q" />

/// Imports of 3rd Party ///
import Q = require("q");
/// Imports of VSS ///
import Ajax = require("VSS/Ajax");
import Serialization = require("VSS/Serialization");
import WebApi_Contracts = require("VSS/WebApi/Contracts");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Url = require("VSS/Utils/Url");

/**
* Parameters for sending a WebApi request
*/
export interface VssApiResourceRequestParams {
    
    /**
    * Name of the area for the resource
    */
    area: string;

    /**
    * Unique identifier for the resource's route to issue a request to. Used to lookup the route template
    * for this request if the routeTemplate parameter is not supplied or for version negotiation in S2S calls.
    * This is required to ensure any S2S calls work.
    */
    locationId: string;

    /**
    * Route template that is used to form the request path. If routeTemplate is NOT specified, then locationId 
    * is used to lookup the template via an OPTIONS request.
    */
    routeTemplate?: string;

    /**
    * Name of the resource to use in route template replacements. Only used if routeTemplate is provided.
    */
    resource?: string;

    /**
    * Dictionary of route template replacement values
    */
    routeValues?: { [key: string]: any; };

    /**
    * Data to post. In this case of a GET, this indicates query parameters.
    * For other requests, this is the request body object (which will be serialized
    * into a JSON string unless isRawData is set to true).
    */
    data?: any;

    /**
    * Query parameters to add to the url. In the case of a GET, query parameters can
    * be supplied via 'data' or 'queryParams'. For other verbs such as POST, the
    * data object specifies the POST body, so queryParams is needed to indicate
    * parameters to add to the query string of the url (not included in the post body).
    */
    queryParams?: IDictionaryStringTo<any>;

    /**
    * HTTP verb (GET by default if not specified)
    */
    httpMethod?: string;

    /**
    * The http response (Accept) type. This is "json" (corresponds to application/json Accept header) 
    * unless otherwise specified. Other possible values are "html", "text", "zip", or "binary" or their accept
    * header equivalents (e.g. application/zip).
    */
    httpResponseType?: string;

    /**
    * Contract metadata for the request body. This allows us to do the necessary serialization
    * for the provided 'data' object using VSS serialization settings.
    */
    requestType?: Serialization.ContractMetadata;
    
    /**
    * Contract metadata for the response. This allows us to do the necessary deserialization
    * for the response object using VSS serialization settings.
    */
    responseType?: Serialization.ContractMetadata;
    
    /**
    * Indicates that the response is expected to be a wrapped array, so unwrap the response to
    * a regular array.
    */
    responseIsCollection?: boolean;

    /**
    * Allows the caller to specify custom request headers.
    */
    customHeaders?: { [headerName: string]: any; };
    
    /**
    * Request timeout in milliseconds. The default is 5 minutes.
    */
    timeout?: number;

    /**
    * The api version string to send in the request (e.g. "1.0" or "2.0-preview.2")
    */
    apiVersion?: string;

    /**
    * If true, this indicates that no processing should be done on the 'data' object
    * before it is sent in the request. *This is rarely needed*. One case is when posting
    * an HTML5 File object. 
    */
    isRawData?: boolean;
}

export interface IVssHttpClientOptions {
    /**
     * If true, the progress indicator will be shown while the request is executing. Defaults to true.
     */
    showProgressIndicator?: boolean;

    /**
    * Request timeout in milliseconds. The default is 5 minutes.
    */
    timeout?: number;

    /**
     * Current session id. Defaults to pageContext.diagnostics.sessionId.
     */
    sessionId?: string;

    /**
     * Current command for activity logging.
     */
    command?: string;

    /**
    * If true, include links and urls (typically Uri properties) in the JSON responses. If false (default), then
    * send an excludeUrls=true header to suppress the generation of links in the JSON responses of requests from this client.
    */
    includeUrls?: boolean;

    /**
     * Use the new platform serialization format
     */
    useNewPlatformSerialization?: boolean;
}

interface VssApiResourceLocationLookup {
    [locationId: string]: WebApi_Contracts.ApiResourceLocation;
}

interface AreaToAreaLocationLookupMap {
    [areaName: string]: IPromise<VssApiResourceLocationLookup>;
};

/**
* Base class that should be used (derived from) to make requests to VSS REST apis
*/
export class VssHttpClient {

    private static APIS_RELATIVE_PATH = "_apis";
    private static DEFAULT_REQUEST_TIMEOUT = 300000; // 5 minutes
    private static _legacyDateRegExp: RegExp;
    private static cacheFromJsonIslands: AreaToAreaLocationLookupMap;

    private _locationsByAreaPromises: AreaToAreaLocationLookupMap;

    public _rootRequestPath: string;
    public authTokenManager: IAuthTokenManager<any>;
    private _initializationPromise: IPromise<any>;
    public forceOptionsCallForAutoNegotiate: boolean = true;  // default to true to protect cases where client is created outside of Service.getHttpClient.  Service.getHttpClient will ensure the right value is set.
    protected _options: IVssHttpClientOptions;

    constructor(rootRequestPath: string, options?: IVssHttpClientOptions) {
        this._rootRequestPath = rootRequestPath;
        this._locationsByAreaPromises = VssHttpClient.createLocationsByAreaPromisesCache();

        this._initializationPromise = Q.fcall(() => true);

        this._options = options || {};
    }
    
    /**
     * Sets a promise that is waited on before any requests are issued. Can be used to asynchronously
     * set the request url and auth token manager.
     */
    public _setInitializationPromise(promise: IPromise<any>) {
        if (promise) {
            this._initializationPromise = promise;
        }
    }

    /**
    * Issue a request to a VSS REST endpoint.
    *
    * @param requestParams request options
    * @param useAjaxResult If true, textStatus and jqXHR are added to the success callback. In this case, spread (instead of then) needs to be used
    * @returns Q Promise for the response
    */
    public _beginRequest<T>(requestParams: VssApiResourceRequestParams, useAjaxResult: boolean = false): IPromise<T> {

        if (!this.forceOptionsCallForAutoNegotiate && requestParams.routeTemplate) {
            return this._initializationPromise.then(() => {
                var requestUrl = this.getRequestUrl(requestParams.routeTemplate, requestParams.area, requestParams.resource, requestParams.routeValues, requestParams.queryParams);
                return this._beginRequestToResolvedUrl(requestUrl, requestParams.apiVersion, requestParams, useAjaxResult);
            });
        }
        else {
            return this._beginGetLocation(requestParams.area, requestParams.locationId).then((location: WebApi_Contracts.ApiResourceLocation) => {
                var requestUrl = this.getRequestUrl(location.routeTemplate, location.area, location.resourceName, requestParams.routeValues, requestParams.queryParams);
                var apiVersion = this._autoNegotiateApiVersion(location, requestParams.apiVersion);
                return this._beginRequestToResolvedUrl(requestUrl, apiVersion, requestParams, useAjaxResult);
            });
        }
    }

    public _autoNegotiateApiVersion(location: WebApi_Contracts.ApiResourceLocation, requestedVersion: string): string {
        var negotiatedVersion: string;
        if (requestedVersion) {
            var apiVersionRegEx = new RegExp('(\\d+(\\.\\d+)?)(-preview(\\.(\\d+))?)?');

            // Need to handle 3 types of api versions + invalid apiversion
            // '2.1-preview.1' = ["2.1-preview.1", "2.1", ".1", -preview.1", ".1", "1"]
            // '2.1-preview' = ["2.1-preview", "2.1", ".1", "-preview", undefined, undefined]
            // '2.1' = ["2.1", "2.1", ".1", undefined, undefined, undefined]

            var apiVersion: number;
            var apiVersionString: string;
            var isPreview = false;
            var resourceVersion: number;

            var regExExecArray = apiVersionRegEx.exec(requestedVersion);
            if (regExExecArray) {
                if (regExExecArray[1]) {
                    // we have an api version
                    apiVersion = +regExExecArray[1];
                    apiVersionString = regExExecArray[1];
                    if (regExExecArray[3]) {
                        // requesting preview
                        isPreview = true;
                        if (regExExecArray[5]) { 
                            // we have a resource version
                            resourceVersion = +regExExecArray[5];
                        }
                    }

                    // compare the location version and requestedversion
                    if (apiVersion <= +location.releasedVersion
                        || (!resourceVersion && apiVersion <= +location.maxVersion && isPreview)
                        || (resourceVersion && apiVersion <= +location.maxVersion && resourceVersion <= +location.resourceVersion)) {
                        negotiatedVersion = requestedVersion;
                    }
                    // else fall back to latest version of the resource from location
                }
            }
        }
        if (!negotiatedVersion) {
            // Use the latest version of the resource if the api version was not specified in the request or if the requested version is higher then the location's supported version
            if (apiVersion < +location.maxVersion) {
                negotiatedVersion = apiVersionString + "-preview";
            }
            else if (location.maxVersion === location.releasedVersion) {
                negotiatedVersion = location.maxVersion;
            }
            else {
                negotiatedVersion = location.maxVersion + "-preview." + location.resourceVersion;
            }
        }
        return negotiatedVersion;
    }

    private _beginRequestToResolvedUrl<T>(requestUrl: string, apiVersion: string, requestParams: VssApiResourceRequestParams, useAjaxResult: boolean): IPromise<T> {

        let ajaxOptions: JQueryAjaxSettings = {};
        let acceptType: string;
        let useNewPlatformSerialization = false;

        ajaxOptions.type = requestParams.httpMethod || "GET";

        var requestData = requestParams.data;
        if (!requestParams.isRawData && requestData && requestParams.requestType) {
            requestData = Serialization.ContractSerializer.serialize(requestData, requestParams.requestType, true);
        }

        if (!requestParams.isRawData && requestData && ajaxOptions.type.toUpperCase() !== 'GET') {

            ajaxOptions.data = JSON.stringify(requestData);

            // We've serialized the data ourselves so turn off jquery's processing of the data property
            ajaxOptions.processData = false;

            // Prevent replacing ?? with jsonp callback
            (<any>ajaxOptions).jsonp = false;
        }
        else {
            ajaxOptions.data = requestData;
        }

        if (requestParams.isRawData) {
            ajaxOptions.processData = false;
        }

        if (!requestParams.httpResponseType || requestParams.httpResponseType.toLowerCase() === "json" || requestParams.httpResponseType.toLowerCase() === "application/json") {
            acceptType = "application/json";
            ajaxOptions.dataType = "json";
        }
        else if (requestParams.httpResponseType.toLowerCase() === "zip" || requestParams.httpResponseType.toLowerCase() === "application/zip") {
            acceptType = "application/zip";
            ajaxOptions.dataType = Ajax.CustomTransportDataTypes.Binary;
        }
        else if (requestParams.httpResponseType.toLowerCase() === "binary" || requestParams.httpResponseType.toLowerCase() === "octet-stream" || requestParams.httpResponseType.toLowerCase() === "application/octet-stream") {
            acceptType = "application/octet-stream";
            ajaxOptions.dataType = Ajax.CustomTransportDataTypes.Binary;
        }
        else if (requestParams.httpResponseType.toLowerCase() === "text" || requestParams.httpResponseType.toLowerCase() === "text/plain") {
            acceptType = "text/plain";
            ajaxOptions.dataType = "text";
            ajaxOptions.converters = {}; // Clear out json converters
        }
        else {
            acceptType = "*/*";
            ajaxOptions.dataType = requestParams.httpResponseType;
            ajaxOptions.converters = {}; // Clear out json converters
        }

        if (requestParams.timeout) {
            ajaxOptions.timeout = requestParams.timeout;
        }
        else if (this._options.timeout) {
            ajaxOptions.timeout = this._options.timeout;
        }

        var acceptHeaderValue = acceptType;
        if (apiVersion) {
            acceptHeaderValue += ";api-version=" + apiVersion;
        }
        if (!this._options.includeUrls) {
            acceptHeaderValue += ";excludeUrls=true";
        }
        if (this._options.useNewPlatformSerialization && ajaxOptions.dataType === "json") {
            acceptHeaderValue += ";enumsAsNumbers=true;msDateFormat=true;noArrayWrap=true";
            useNewPlatformSerialization = true;

            // We need the raw text response in order to properly deserialize
            ajaxOptions.dataType = "text";
            ajaxOptions.converters = {};
        }

        ajaxOptions.headers = <any>$.extend({
            "Accept": acceptHeaderValue,
            "Content-Type": requestData && "application/json"
        }, requestParams.customHeaders);

        var promise = <Q.Promise<T>>this._issueAjaxRequest(requestUrl, ajaxOptions, true, {
            showProgressIndicator: this._options.showProgressIndicator,
            sessionId: this._options.sessionId,
            command: this._options.command
        });

        return promise.spread((data: any, textStatus: string, jqXHR: JQueryXHR) => {
            let resolvedData;
            if (useNewPlatformSerialization) {
                resolvedData = Serialization.deserializeVssJsonObject<any>(data);
                if (requestParams.responseIsCollection && data && data.value && Array.isArray(data.value)) {
                    resolvedData = data.value;
                }
            }
            else {
                resolvedData = Serialization.ContractSerializer.deserialize(data, requestParams.responseType, false, requestParams.responseIsCollection);
            }
            return useAjaxResult === true ? [resolvedData, textStatus, jqXHR] : resolvedData;
        });
    }

    /**
    * Issue a request to a VSS REST endpoint and makes sure the result contains jqXHR. Use spread to access jqXHR.
    *
    * @param requestParams request options
    * @returns Q Promise for the response
    */
    public _beginRequestWithAjaxResult<T>(requestParams: VssApiResourceRequestParams): Q.Promise<T> {
        return <Q.Promise<T>>this._beginRequest(requestParams, true);
    }

    /**
     * Issue an AJAX request. This is a wrapper around jquery's ajax method that handles VSS authentication
     * and triggers events that can be listened to by other modules.
     *
     * @param requestUrl Url to send the request to
     * @param ajaxOptions jQuery.ajax options
     * @param useAjaxResult If true, textStatus and jqXHR are added to the success callback. In this case, spread (instead of then) needs to be used.
     */
    public _issueAjaxRequest(requestUrl: string, ajaxOptions: JQueryAjaxSettings, useAjaxResult: boolean = false, vssRequestOptions?: IVssAjaxOptions): IPromise<any> {
        vssRequestOptions = $.extend({ authTokenManager: this.authTokenManager, useAjaxResult: useAjaxResult }, vssRequestOptions);
        return Ajax.issueRequest(requestUrl, ajaxOptions, vssRequestOptions);
    }

    /**
     * Gets information about an API resource location (route template, supported versions, etc.)
     * 
     * @param area resource area name
     * @param locationId Guid of the location to get
     */
    public _beginGetLocation(area: string, locationId: string): IPromise<WebApi_Contracts.ApiResourceLocation> {
        return this._initializationPromise.then(() => {
            return this.beginGetAreaLocations(area);
        }).then((areaLocations: VssApiResourceLocationLookup) => {
            var location = areaLocations[(locationId || "").toLowerCase()];
            if (!location) {
                throw new Error("Failed to find api location for area: " + area + " id: " + locationId);
            }
            return location;
        });
    }

    private static processOptionsRequestResponse(locationsResult?: { value: WebApi_Contracts.ApiResourceLocation[] }, textStatus?: string, jqXHR?: JQueryXHR) {
        var locationsLookup: VssApiResourceLocationLookup = {};
        $.each(locationsResult.value, (index: number, location: WebApi_Contracts.ApiResourceLocation) => {
            locationsLookup[location.id.toLowerCase()] = location;
        });

        return locationsLookup;
    }

    private static initializeLocationsByAreaJsonIslandCacheIfNecessary() {
        if (!VssHttpClient.cacheFromJsonIslands) {
            VssHttpClient.cacheFromJsonIslands = Object.create(null);

            // Initialize from JSON islands if they have been seeded
            let areaLocationsData: {
                value: WebApi_Contracts.ApiResourceLocation[]
            };
            while (areaLocationsData = Utils_Core.parseJsonIsland($(document), ".area-locations", true)) {
                let descriptors: WebApi_Contracts.ApiResourceLocation[] = areaLocationsData.value;
                if (descriptors.length > 0) {
                    let locationLookups = VssHttpClient.processOptionsRequestResponse(areaLocationsData);
                    let area: string = descriptors[0].area;
                    VssHttpClient.cacheFromJsonIslands[area] = Q.resolve(locationLookups);
                }
            }
        }
    }

    private static createLocationsByAreaPromisesCache() {
        VssHttpClient.initializeLocationsByAreaJsonIslandCacheIfNecessary();
        return <typeof VssHttpClient.cacheFromJsonIslands>Object.create(VssHttpClient.cacheFromJsonIslands);
    }

    private beginGetAreaLocations(area: string): IPromise<VssApiResourceLocationLookup> {
        var areaLocationsPromise = this._locationsByAreaPromises[area];
        if (!areaLocationsPromise) {

            var requestUrl = this._rootRequestPath + VssHttpClient.APIS_RELATIVE_PATH + "/" + area;
            areaLocationsPromise = this._issueAjaxRequest(requestUrl, { type: "OPTIONS" }).then(VssHttpClient.processOptionsRequestResponse);

            this._locationsByAreaPromises[area] = areaLocationsPromise;
        }

        return areaLocationsPromise;
    }

    protected getRequestUrl(routeTemplate: string, area: string, resource: string, routeValues: any, queryParams?: IDictionaryStringTo<any>): string {

        // Add area/resource route values (based on the location)
        routeValues = routeValues || {};
        if (!routeValues.area) {
            routeValues.area = area;
        }
        if (!routeValues.resource) {
            routeValues.resource = resource;
        }

        // Replace templated route values
        var url = this._rootRequestPath + Utils_Url.replaceRouteValues(routeTemplate, routeValues);

        if (queryParams) {
            var urlHasQueryParams = url.indexOf("?") !== -1;
            queryParams = $.extend(true, {}, queryParams);  // deep copy so we don't modify the original
            this.convertQueryParamsValues(queryParams);
            var queryString = $.param(queryParams);
            if (queryString) {
                url += (urlHasQueryParams ? "&" : "?") + queryString;
            }
        }

        return url;
    }

    private convertQueryParamsValues(queryParams: IDictionaryStringTo<any>) {
        var keys = Object.keys(queryParams);
        for (var key of keys) {
            var value = queryParams[key];
            if (value instanceof Date) {
                queryParams[key] = value.toJSON(); // properly serialize dates.
            }
            else if (value === null || value === undefined) {
                delete queryParams[key]; // delete null and undefined keys, since we don't want these in the query params
            }
            else if (typeof value === "object") {
                this.convertQueryParamsValues(<IDictionaryStringTo<any>>value); // handles dates and null values deeper in contract properties
            }
        }
    }

    public _getLinkResponseHeaders(xhr: XMLHttpRequest): { [relName: string]: string; } {
        var results: { [relName: string]: string; } = {},
            responseHeadersString = xhr.getAllResponseHeaders(), // cannot use xhr.getResponseHeader('Link') because jquery/IE bug
            rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
            linkRegExp = /\<(.*?)\>;rel=\"(.*?)\"/g,
            headerMatch: any,
            linkMatch: any;

        // In IE, the Link headers will be distinct, where as in Chrome, the Link headers will be comma delimited
        if (responseHeadersString) {
            while (headerMatch = rheaders.exec(responseHeadersString)) {
                if (headerMatch[1].toLowerCase() === 'link') {
                    while (linkMatch = linkRegExp.exec(headerMatch[2])) {
                        results[linkMatch[2]] = linkMatch[1];
                    }
                }
            }
        }

        return results;
    }
}
