/// <reference types="q" />

import Authentication_Services = require("VSS/Authentication/Services");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import LocalPageData = require("VSS/Contributions/LocalPageData");
import Locations_Contracts = require("VSS/Locations/Contracts");
import Locations_RestClient = require("VSS/Locations/RestClient");
import Q = require("q");
import Serialization = require("VSS/Serialization");
import Utils_Core = require("VSS/Utils/Core");
import Utils_File = require("VSS/Utils/File");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");
import VSS = require("VSS/VSS");
import WebApi_Constants = require("VSS/WebApi/Constants");


/**
* Options for generating content urls
*/
export interface ContentLocationOptions {

    /**
    * Unique id of the service to generate the url for
    */
    serviceInstanceId?: string;

    /**
    * Specific web context to use when generating the url
    */
    webContext?: Contracts_Platform.WebContext;

    /**
    * Host level to get the url of
    */
    hostType?: Contracts_Platform.ContextHostType;

    /**
    * Relative path to append to the url. This needs to be properly encoded by the consumer.
    */
    relativePath?: string;

    /**
    * Query parameters to add to the url
    */
    queryParams?: IDictionaryStringTo<string>;
}

/**
* Options for generating MVC urls
*/
export interface MvcRouteOptions {

    /**
    * Unique id of the service to generate the url for
    */
    serviceInstanceId?: string;

    /**
    * Specific web context to use when generating the url
    */
    webContext?: Contracts_Platform.WebContext;

    /**
    * Navigation level at which to generate the url (Deployment, Account, Collection, Project, Team)
    */
    level?: Contracts_Platform.NavigationContextLevels;

    /**
    * Route Area (e.g. "admin") or null/undefined for the default
    */
    area?: string;

    /**
    * MVC controller name
    */
    controller?: string;

    /**
    * Controller action
    */
    action?: string;

    /**
    * Array of parameters (path parts) to append to the path (after controller and action)
    */
    parameters?: string[];

    /**
    * Override the project in the web context
    */
    project?: string;

    /**
    * Override the team in the web context
    */
    team?: string;

    /**
    * Query parameters to add to the url
    */
    queryParams?: IDictionaryStringTo<string>;
}

/**
* Helper class for generating urls
*/
export class UrlHelper {
    private _areaPrefix;
    private _controllerPrefix;

    constructor(areaPrefix: string = "_", controllerPrefix: string = "_") {
        this._areaPrefix = areaPrefix;
        this._controllerPrefix = controllerPrefix;
    }

    /**
    * Get the url of particular content. If a service id is specified, its url needs to already be in the cached locations.
    *
    * @param options Url generation options
    * @return The generated url string
    */
    public getContentUrl(options: ContentLocationOptions): string {
        var webContext = options.webContext || Context.getDefaultWebContext();
        var url: string;

        if (options.serviceInstanceId && Context.getPageContext().webAccessConfiguration.isHosted) {
            url = getCachedServiceLocation(options.serviceInstanceId, options.hostType, webContext);
            if (!url) {
                throw new Error("Could not get url for service " + options.serviceInstanceId + " since it is not yet in the cache.");
            }
        }
        else {
            var hostContext: Contracts_Platform.HostContext;

            if (options.hostType === Contracts_Platform.ContextHostType.Organization && webContext.account) {
                hostContext = webContext.account;
            }
            else {
                hostContext = webContext.host;
            }

            if (window.self == window.top) {
                // In top-most frame for default service. Can use relative url
                url = encodeURI(hostContext.relativeUri);
            }
            else {
                // Always use absolute urls in child frames
                url = hostContext.uri;
            }
        }

        if (options.relativePath) {
            url = Utils_File.combinePaths(url, options.relativePath);
        }

        if (options.queryParams) {
            url += "?" + $.param(options.queryParams);
        }

        return url;
    }

    /**
    * Get the url of a versioned _content file from the hosting page's service.
    *
    * @param contentFileName filename relative to "/_static/tfs/{Version}/_content/"
    * @param serviceInstanceTypeId The id of the service instance to generate the content url of
    * @return The generated url string
    */
    public getVersionedContentUrl(contentFileName: string, serviceInstanceTypeId?: string): string {

        let baseUrl: string;
        var pageContext = Context.getPageContext();

        if (window.self == window.top && (!serviceInstanceTypeId || !pageContext.webAccessConfiguration.isHosted)) {
            // In top-most frame for default service. Can use relative url
            baseUrl = pageContext.webAccessConfiguration.paths.resourcesPath;
        }
        else {

            var webContext = Context.getDefaultWebContext();

            // Always use absolute urls in child frames and for remote services
            if (serviceInstanceTypeId && pageContext.webAccessConfiguration.isHosted) {
                var serviceLocation = getCachedServiceLocation(serviceInstanceTypeId, webContext.host.hostType, webContext);
                if (!serviceLocation) {
                    throw new Error(`Could not get url for service ${serviceInstanceTypeId} since it is not yet in the cache.`);
                }
                var servicePaths = Context.getPathsForService(serviceInstanceTypeId);
                if (!servicePaths) {
                    throw new Error(`Could not get web access paths for service ${serviceInstanceTypeId} since it is not yet in page context data.`);
                }

                // This might be a CDN URL
                baseUrl = servicePaths.resourcesPath;
                if (!Utils_Url.isAbsoluteUrl(baseUrl)) {
                    const contributedServicePath = new Context.ContributedServicePathBuilder(serviceLocation, Utils_File.combinePaths);
                    // If not an absolute URL, combine to serviceLocation
                    baseUrl = contributedServicePath.combinePath(baseUrl);
                }
            }
            else {
                // This might be a CDN URL
                baseUrl = pageContext.webAccessConfiguration.paths.resourcesPath;
                if (!Utils_Url.isAbsoluteUrl(baseUrl)) {
                    // Omit relative uri part from the host uri part since resourcesPath already has that information
                    let hostUrl = webContext.host.uri.substr(0, webContext.host.uri.length - (webContext.host.relativeUri || "").length);
                    // If not an absolute URL, combine to hostUrl
                    baseUrl = Utils_File.combinePaths(hostUrl, baseUrl);
                }
            }
        }

        return Utils_File.combinePaths(baseUrl, contentFileName);
    }

    /**
    * Get the url of an MVC endpoint.
    *
    * @param options Url generation options
    * @return Promise which returns the generated url string
    */
    public beginGetMvcUrl(options: MvcRouteOptions): IPromise<string> {

        if (options.serviceInstanceId) {

            // Ensure that the location for the specified service instance is looked up and cached
            var hostType: Contracts_Platform.ContextHostType;
            if (!options.level) {
                hostType = (options.webContext || Context.getDefaultWebContext()).host.hostType;
            }
            else {
                hostType = <any>options.level;
                if (options.level >= Contracts_Platform.NavigationContextLevels.Collection) {
                    hostType = Contracts_Platform.ContextHostType.ProjectCollection;
                }
            }
            return beginGetServiceLocation(options.serviceInstanceId, hostType, options.webContext).then((url) => {
                return this.getMvcUrl(options);
            });
        }
        else {
            // No need to lookup the service url.
            return Q.resolve(this.getMvcUrl(options));
        }
    }

    /**
    * Get the url of an MVC endpoint. If a service id is specified, its url needs to already be in the cached locations.
    *
    * @param options Url generation options
    * @return The generated url string
    */
    public getMvcUrl(options: MvcRouteOptions): string {

        var webContext = options.webContext || Context.getDefaultWebContext();
        var isApiArea = options.area === "api";
        var urlParts: string[] = [];

        var level = options.level;
        if (!level) {
            level = Context.getPageContext().navigation.topMostLevel;
        }

        var hostType: Contracts_Platform.ContextHostType = <any>level;

        if (level >= Contracts_Platform.NavigationContextLevels.Project || options.project) {
            hostType = Contracts_Platform.ContextHostType.ProjectCollection;
            if (options.project) {
                urlParts.push(options.project);
            }
            else if (webContext.project) {
                urlParts.push(isApiArea ? webContext.project.id : webContext.project.name);
            }

            if (level >= Contracts_Platform.NavigationContextLevels.Team || options.team) {
                if (options.team) {
                    urlParts.push(options.team);
                }
                else if (webContext.team) {
                    urlParts.push(isApiArea ? webContext.team.id : webContext.team.name);
                }
            }
        }

        if (options.area) {
            urlParts.push(this._areaPrefix + options.area);
        }

        if (options.controller) {
            urlParts.push(this._controllerPrefix + options.controller);
        }

        if (options.action) {
            urlParts.push(options.action);
        }

        if (options.parameters) {
            urlParts = urlParts.concat(options.parameters);
        }

        return this.getContentUrl({
            hostType: hostType,
            serviceInstanceId: options.serviceInstanceId,
            webContext: webContext,
            relativePath: encodeURI(urlParts.join("/")),
            queryParams: options.queryParams
        });
    }
}

/**
* Url helper which provides methods for generating urls
*/
export var urlHelper = new UrlHelper();

var cachedServicePromises: { [key: number]: IPromise<IDictionaryStringTo<string>>; } = {};
var cachedServicesLookup: { [key: number]: IDictionaryStringTo<string>; } = {};

function getCachedServicesLookupKey(
    hostType: Contracts_Platform.ContextHostType,
    webContext?: Contracts_Platform.WebContext) {

    let hostId = getHostId(webContext || Context.getDefaultWebContext(), hostType);
    return hostType + ";" + hostId;
}

/**
* Get the preferred url for the given service definition
*/
export function getUrlForServiceDefinition(serviceDefinition: Locations_Contracts.ServiceDefinition) {

    if (serviceDefinition && serviceDefinition.locationMappings) {

        // Look for an access mapping with the following priorioty: Public, Server, HostGuid
        let mapping = $.grep(serviceDefinition.locationMappings, (m) => m.accessMappingMoniker === "PublicAccessMapping")[0];
        if (!mapping) {
            mapping = $.grep(serviceDefinition.locationMappings, (m) => m.accessMappingMoniker === "ServerAccessMapping")[0];
            if (!mapping) {
                mapping = $.grep(serviceDefinition.locationMappings, (m) => m.accessMappingMoniker === "HostGuidAccessMapping")[0];
            }
        }

        if (mapping) {
            return Utils_File.ensureTrailingSeparator(mapping.location);
        }
        else {
            return null;
        }
    }
}

function beginGetCachedServiceUrls(
    spsLocationClient: Locations_RestClient.LocationsHttpClient,
    hostType: Contracts_Platform.ContextHostType,
    webContext?: Contracts_Platform.WebContext): IPromise<IDictionaryStringTo<string>> {

    let cacheKey = getCachedServicesLookupKey(hostType, webContext);
    let promise = cachedServicePromises[cacheKey];

    if (!promise) {
        promise = spsLocationClient.getServiceDefinitions("LocationService2")
            .then((locations: Locations_Contracts.ServiceDefinition[]) => {

                var cachedServiceUrls: IDictionaryStringTo<string>;

                if (!cachedServicesLookup[cacheKey]) {
                    cachedServicesLookup[cacheKey] = {};
                }
                cachedServiceUrls = cachedServicesLookup[cacheKey];

                $.each(locations, (i, location: Locations_Contracts.ServiceDefinition) => {
                    let locationUrl = getUrlForServiceDefinition(location);
                    if (locationUrl) {
                        cachedServiceUrls[location.identifier] = locationUrl;
                        cachedServiceUrls[location.parentIdentifier] = locationUrl;
                    }
                });

                return cachedServiceUrls;
            });

        cachedServicePromises[cacheKey] = promise;
    }

    return promise;
}

function getServiceLocationFromLookup(
    lookup: { [serviceId: string]: string; },
    serviceInstanceId: string,
    hostType: Contracts_Platform.ContextHostType,
    webContext: Contracts_Platform.WebContext) {

    var serviceLocation = lookup[serviceInstanceId.toLowerCase()];
    return serviceLocation;
}

function getHostId(
    webContext: Contracts_Platform.WebContext,
    hostType: Contracts_Platform.ContextHostType) {

    if (hostType === Contracts_Platform.ContextHostType.Organization && webContext.account) {
        return webContext.account.id;
    }
    else if (hostType === Contracts_Platform.ContextHostType.ProjectCollection && webContext.collection) {
        return webContext.collection.id;
    }
    else {
        return webContext.host.id;
    }
}


/**
* Get the url for the given service if its location has already been cached
*
* @param serviceInstanceId Unique id for the service
* @param hostType The host level to get the url for
* @param webContext The original context to get the url for
* @return Url if the location could be resolved
*/
export function getCachedServiceLocation(
    serviceInstanceId: string,
    hostType: Contracts_Platform.ContextHostType,
    webContext?: Contracts_Platform.WebContext): string {

    var serviceLocation: string = null;

    // Look in page context data first -- if the web context here is the default web context (the same host)
    var pageContext = Context.getPageContext();
    if (pageContext.serviceLocations && (!webContext || webContext === pageContext.webContext || getHostId(webContext, hostType) === getHostId(pageContext.webContext, hostType))) {
        var service = pageContext.serviceLocations.locations[serviceInstanceId.toLowerCase()];
        if (service) {
            serviceLocation = service[hostType];
        }
    }

    // Look in shared contribution data
    if (!serviceLocation) {
        const locations = LocalPageData.getSharedData<IDictionaryStringTo<IDictionaryNumberTo<string>>>("_locations");
        if (locations) {
            let serviceLocations = locations[serviceInstanceId.toLowerCase()];
            if (serviceLocations) {
                serviceLocation = serviceLocations[hostType];
            }
        }
    }

    // Check for the same instance type as the page context - resolve based on host
    if (!serviceLocation) {
        if (Utils_String.equals(pageContext.serviceInstanceId, serviceInstanceId, true)) {
            if (!webContext || pageContext.webContext.host.id === webContext.host.id) {
                if (hostType === Contracts_Platform.ContextHostType.Deployment && pageContext.webContext.host.hostType === Contracts_Platform.ContextHostType.Deployment) {
                    serviceLocation = pageContext.webContext.host.uri;
                }
                else if (hostType === Contracts_Platform.ContextHostType.Organization && pageContext.webContext.account) {
                    serviceLocation = pageContext.webContext.account.uri;
                }
                else if (hostType === Contracts_Platform.ContextHostType.ProjectCollection && pageContext.webContext.collection) {
                    serviceLocation = pageContext.webContext.collection.uri;
                }
            }
        }
    }

    // Look in cached locations from previous locations ajax lookup
    if (!serviceLocation) {
        let cacheKey = getCachedServicesLookupKey(hostType, webContext);
        if (cachedServicesLookup[cacheKey]) {
            serviceLocation = getServiceLocationFromLookup(cachedServicesLookup[cacheKey], serviceInstanceId, hostType, webContext);
        }
    }

    return serviceLocation;
}

/**
* Set the url for the given service and host type
*
* @param url The Url of the location to add
* @param serviceInstanceId Unique id for the service
* @param hostType The host level of the url
*/
export function addServiceLocation(
    url: string,
    serviceInstanceId: string,
    hostType: Contracts_Platform.ContextHostType): void {

    let cacheKey = getCachedServicesLookupKey(hostType, Context.getDefaultWebContext());

    if (!cachedServicesLookup[cacheKey]) {
        cachedServicesLookup[cacheKey] = {};
    }

    cachedServicesLookup[cacheKey][serviceInstanceId.toLowerCase()] = url;
}

/**
* Get the SPS url at the given host type level.
*/
export function getSpsLocation(
    hostType: Contracts_Platform.ContextHostType,
    webContext?: Contracts_Platform.WebContext,
    authTokenManager?: IAuthTokenManager<any>): IPromise<string> {

    if (!webContext) {
        webContext = Context.getDefaultWebContext();
    }

    let cachedSpsLocation = getCachedServiceLocation(WebApi_Constants.ServiceInstanceTypes.SPS, hostType, webContext);
    if (cachedSpsLocation) {
        return Q.resolve(cachedSpsLocation);
    }
    else if (hostType === Contracts_Platform.ContextHostType.Organization) {
        return getSpsLocation(Contracts_Platform.ContextHostType.Deployment, webContext).then((deploymentSpsUrl) => {
            return getSpsLocationForHostId(
                deploymentSpsUrl,
                Contracts_Platform.ContextHostType.Deployment,
                webContext.account.id,
                Contracts_Platform.ContextHostType.Organization, 
                webContext,
                authTokenManager);
        });
    }
    else if (hostType === Contracts_Platform.ContextHostType.ProjectCollection) {
        return getSpsLocation(Contracts_Platform.ContextHostType.Organization, webContext).then((organizationSpsUrl) => {
            return getSpsLocationForHostId(
                organizationSpsUrl,
                Contracts_Platform.ContextHostType.Organization,
                webContext.collection.id,
                Contracts_Platform.ContextHostType.ProjectCollection,
                webContext,
                authTokenManager);
        });
    }
    else {
        throw new Error("Root SPS Location must exist in the page context's serviceLocations.");
    }
}

/**
* Create a Locations HttpClient pointed to the given SPS location
*/
export function getSpsLocationClient(
    spsLocationUrl: string,
    hostType: Contracts_Platform.ContextHostType,
    authTokenManager?: IAuthTokenManager<any>) {

    const spsLocationClient = new Locations_RestClient.LocationsHttpClient(spsLocationUrl);
    let namedToken: string;
    if (hostType === Contracts_Platform.ContextHostType.Deployment || Context.getPageContext().navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Deployment) {
        namedToken = Authentication_Services.CoreNamedWebSessionTokenIds.Profile;
    }
    spsLocationClient.authTokenManager = authTokenManager || Authentication_Services.getAuthTokenManager(namedToken);

    return spsLocationClient;
}

/**
* Get the SPS url for the child host id (e.g. given an "org" SPS location url, get the SPS location for a "collection" with the specified childHostId)
*/
function getSpsLocationForHostId(
    spsLocationUrl: string,
    hostType: Contracts_Platform.ContextHostType,
    childHostId: string,
    childHostType: Contracts_Platform.ContextHostType,
    childWebContext: Contracts_Platform.WebContext,
    authTokenManager?: IAuthTokenManager<any>) {

    const spsLocationClient = getSpsLocationClient(spsLocationUrl, hostType, authTokenManager);
    return spsLocationClient.getServiceDefinition("LocationService2", childHostId)
        .then((location: Locations_Contracts.ServiceDefinition) => {
            let locationUrl = getUrlForServiceDefinition(location);

            if (locationUrl) {
                let cacheKey = getCachedServicesLookupKey(childHostType, childWebContext);

                if (!cachedServicesLookup[cacheKey]) {
                    cachedServicesLookup[cacheKey] = {};
                }

                let cachedServiceUrls: IDictionaryStringTo<string>;
                cachedServiceUrls = cachedServicesLookup[cacheKey];

                cachedServiceUrls[WebApi_Constants.ServiceInstanceTypes.SPS] = locationUrl;
            }

            return locationUrl;
        });
}

/**
* Get the url for the given service
* @param serviceInstanceId Unique id for the service
* @param hostType The host level to get the url for
* @param webContext The original context to get the url for
* @param faultInMissingHost If true, attempt to fault in the target host if the location's service definition doesn't already exist.
* @param authTokenManager A custom AuthTokenManager to be used when retrieving the SPS location for the host and when talking to the SPS instance subsequently
* @return Promise that resolves to the location string
*/
export function beginGetServiceLocation(
    serviceInstanceId: string,
    hostType: Contracts_Platform.ContextHostType,
    webContext?: Contracts_Platform.WebContext,
    faultInMissingHost: boolean = false,
    authTokenManager?: IAuthTokenManager<any>): IPromise<string> {

    if (!webContext) {
        webContext = Context.getDefaultWebContext();
    }

    if (!Context.getPageContext().webAccessConfiguration.isHosted) {
        // Not hosted. Resolve to default web context location
        if (hostType === Contracts_Platform.ContextHostType.ProjectCollection) {
            if (!webContext.collection) {
                return Q.reject("Cannot get collection location given application context.");
            }
            return Q.resolve(webContext.collection.uri);
        }
        else {
            return Q.resolve(webContext.account.uri);
        }
    }

    var serviceLocation = getCachedServiceLocation(serviceInstanceId, hostType, webContext);
    if (serviceLocation) {
        return Q.resolve(serviceLocation);
    }

    return getSpsLocation(hostType, webContext, authTokenManager).then((spsLocation) => {

        const spsLocationClient = getSpsLocationClient(spsLocation, hostType, authTokenManager);
        return beginGetCachedServiceUrls(spsLocationClient, hostType, webContext).then((cachedLocations) => {
            serviceLocation = getServiceLocationFromLookup(cachedLocations, serviceInstanceId, hostType, webContext);
            if (serviceLocation) {
                return Q.resolve(serviceLocation);
            }
            else {
                // The location could not be found. The host may not be faulted in.
                if (faultInMissingHost) {
                    // Hit the location endpoint directly for the given service instance which will fault-in the host if needed.
                    return spsLocationClient.getServiceDefinition("LocationService2", serviceInstanceId)
                        .then((location: Locations_Contracts.ServiceDefinition) => {
                            let url = getUrlForServiceDefinition(location);
                            if (!url) {
                                throw new Error(`Could not create location for service ${serviceInstanceId}.`);
                            }
                            return url;
                        }, (error) => {
                            throw new Error(`Error getting location for service ${serviceInstanceId}: ${error ? error.message : error}.`);
                        });
                }
                else {
                    throw new Error(`Location for service ${serviceInstanceId} does not exist.`);
                }
            }
        });
    });
}

