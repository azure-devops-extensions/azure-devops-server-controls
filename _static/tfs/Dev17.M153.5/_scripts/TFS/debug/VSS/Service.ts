
import Authentication_Services = require("VSS/Authentication/Services");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Diag = require("VSS/Diag");
import Locations = require("VSS/Locations");
import SDK_Shim = require("VSS/SDK/Shim");
import Utils_Core = require("VSS/Utils/Core");
import Utils_File = require("VSS/Utils/File");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");
import VSS = require("VSS/VSS");
import WebApi_RestClient = require("VSS/WebApi/RestClient");

/**
* A connection to a particular TeamFoundation host
*/
export class VssConnection {

    private static _connectionsCache: IDictionaryStringTo<VssConnection> = {};

    private _webContext: Contracts_Platform.WebContext;
    private _hostType: Contracts_Platform.ContextHostType;
    private _hostContext: Contracts_Platform.HostContext;

    private _services: IDictionaryStringTo<VssService>;
    private _httpClients: IDictionaryStringTo<WebApi_RestClient.VssHttpClient>;

    /**
    * Get a (cached) VssConnection object of the given type
    *
    * @param webContext Specific web context to get the connection for
    * @param hostType Host type to scope the connection to
    */
    public static getConnection(webContext?: Contracts_Platform.WebContext, hostType?: Contracts_Platform.ContextHostType): VssConnection {

        if (!webContext) {
            webContext = Context.getDefaultWebContext();
        }

        if (!hostType) {
            hostType = webContext.host.hostType;
        }

        var cacheKey = hostType + "/" + VssConnection.getHostContext(webContext, hostType).uri;
        if (hostType === Contracts_Platform.ContextHostType.ProjectCollection) {
            // Add project and/or team ids to the cache key so that connections using different web contexts that have different
            // projects or teams are cached differently
            if (webContext.project) {
                cacheKey += "/" + webContext.project.id;
                if (webContext.team) {
                    cacheKey += "/" + webContext.team.id;
                }
            }
        }

        var connection = VssConnection._connectionsCache[cacheKey];

        if (!connection) {
            connection = new VssConnection(webContext, hostType);
            VssConnection._connectionsCache[cacheKey] = connection;
        }

        return connection;
    }

    /**
    * Get the host context information given a web context and the desired host type
    */
    private static getHostContext(webContext: Contracts_Platform.WebContext, hostType: Contracts_Platform.ContextHostType): Contracts_Platform.HostContext {

        var hostContext: Contracts_Platform.HostContext;

        if (hostType === Contracts_Platform.ContextHostType.ProjectCollection) {
            hostContext = webContext.collection;
        }
        else if (hostType === Contracts_Platform.ContextHostType.Organization) {
            hostContext = webContext.account;
        }
        else {
            hostContext = webContext.host;
        }

        if (!hostContext) {
            throw new Error("Desired host type not supported on the given web context");
        }

        return hostContext;
    }

    /**
    * Create a new connection object
    * @param webContext Specific web context to get the connection for
    * @param hostType Host type to scope the connection to
    */
    constructor(webContext: Contracts_Platform.WebContext, hostType?: Contracts_Platform.ContextHostType) {

        this._webContext = webContext || Context.getDefaultWebContext();
        this._hostType = hostType || this._webContext.host.hostType;
        this._hostContext = VssConnection.getHostContext(this._webContext, hostType);

        this._services = {};
        this._httpClients = {};
    }

    /*
    * Gets the web context associated with this connection
    */
    public getWebContext(): Contracts_Platform.WebContext {
        return this._webContext;
    }

    /**
    * Gets the host information that this service is scoped to
    */
    public getHostContext(): Contracts_Platform.HostContext {
        return this._hostContext;
    }

    /**
    * Gets the host type that this service is scoped to
    */
    public getHostType(): Contracts_Platform.ContextHostType {
        return this._hostType;
    }

    /**
    * Gets the service host url for this connection. This is typically
    * a relative url, but it can be absolute in child iframes (e.g. extensions)
    */
    public getHostUrl(): string {
        if (window.self !== window.top) {
            return this._hostContext.uri;
        }
        else {
            return encodeURI(this._hostContext.relativeUri);
        }
    }

    /**
    * Gets a (potentially-cached) service associated with this connection
    */
    public getService<T extends VssService>(serviceType: { new(): T }, useCached = true): T {
        var instance: any;
        var serviceName: string;

        Diag.Debug.assertIsNotNull(serviceType, "serviceType");

        serviceName = "vssService." + VSS.getTypeName(serviceType);
        if (useCached) {
            instance = this._services[serviceName];
        }

        if (!instance) {
            instance = new serviceType();
            instance.initializeConnection(this);
            if (useCached) {
                this._services[serviceName] = instance;
            }
        }

        return <T>instance;
    }

    /**
     * Returns a new or a cached instance of an httpClient for the given type.
     * 
     * @param httpClientType Type of requeested httpClient.
     * @param serviceInstanceId Unique id of the service to scope the http client to
     * @return http client of the specified type (clients are cached for this connection)
     */
    public getHttpClient<T extends WebApi_RestClient.VssHttpClient>(httpClientType: { new (url: string, options?: WebApi_RestClient.IVssHttpClientOptions): T; }, serviceInstanceId?: string, authTokenManager?: IAuthTokenManager<any>, clientOptions?: WebApi_RestClient.IVssHttpClientOptions): T {

        Diag.Debug.assertIsNotNull(httpClientType, "httpClientType");

        if (!serviceInstanceId) {
            serviceInstanceId = (<any>httpClientType).serviceInstanceId;
        }

        if (serviceInstanceId) {
            serviceInstanceId = serviceInstanceId.toLowerCase();
        }

        var serviceInstanceIdContextMismatch = (
            serviceInstanceId &&
            Context.getPageContext().webAccessConfiguration.isHosted &&
            !Utils_String.equals(serviceInstanceId, Context.getPageContext().serviceInstanceId, true));

        var clientTypeName = "vssHttpClient." + VSS.getTypeName(httpClientType);

        if (serviceInstanceIdContextMismatch) {
            clientTypeName += "." + serviceInstanceId;
        }

        if (clientOptions) {
            clientTypeName += "." + JSON.stringify(clientOptions);
        }

        var instance = this._httpClients[clientTypeName];

        if (!instance) {
            var hostUrl = this.getHostUrl();
            if (authTokenManager || !hostUrl) {
                hostUrl = this._hostContext.uri;
            }
            instance = new httpClientType(hostUrl, clientOptions);
            instance.forceOptionsCallForAutoNegotiate = false; // default to false when using clients created from this method.  Default on client is true, to protect those newing up clients directly.

            if (authTokenManager) {
                instance.authTokenManager = authTokenManager;
            }

            if (serviceInstanceIdContextMismatch) {
                // Resolve service location to a potentially different service instance. Fault-in the targeted host if necessary.
                var initializationPromise = this.beginGetServiceUrl(serviceInstanceId, this._hostType, true).then(
                    (serviceUrl: string) => {
                        instance._rootRequestPath = serviceUrl;

                        if ((!Utils_Url.isSameOrigin(serviceUrl, window.location.href) || window.self !== window.top)) {
                            // If the authTokenManager is not provided, set it to the default one
                            if (!authTokenManager) {
                                instance.authTokenManager = Authentication_Services.getAuthTokenManager();
                            }
                        }
                    });

                instance._setInitializationPromise(initializationPromise);
                instance.forceOptionsCallForAutoNegotiate = true; // force options call on s2s rest calls, in case of version mismatch (bug 367237)
            }
            else if (window.self !== window.top &&
                SDK_Shim.isSdkReferenced()) {

                // Extension frames require an auth token manager
                instance.authTokenManager = Authentication_Services.getAuthTokenManager();
            }

            this._httpClients[clientTypeName] = instance;
        }

        return <T>instance;
    }

    /**
    * Get the url for the given service
    *
    * @param serviceInstanceId Unique identifier of the VSTS service to get the url for
    * @param hostType The type of host to get the url for
    * @param faultInMissingHost If true, attempt to fault in the target host if the location's service definition doesn't already exist.
    */
    public beginGetServiceUrl(serviceInstanceId: string, hostType?: Contracts_Platform.ContextHostType, faultInMissingHost: boolean = false): IPromise<string> {

        if (!hostType) {
            hostType = this._hostType;
        }

        return Locations.beginGetServiceLocation(serviceInstanceId, hostType, this._webContext, faultInMissingHost);
    }
}

/**
* A client service which can be cached per TFS connection.
*/
export class VssService {

    private _connection: VssConnection;

    /**
    * Gets the relative location for the service's connection
    */
    public getConnection(): VssConnection {
        return this._connection;
    }

    /*
    * Gets the web context associated with this service's connection
    */
    public getWebContext(): Contracts_Platform.WebContext {
        return this._connection.getWebContext();
    }

    /**
    * Sets the VssConnection to use for this service
    * @param connection VssConnection used by this service
    */
    public initializeConnection(connection: VssConnection) {
        this._connection = connection;
    }
}

export interface ILocalService {
}

class LocalServiceManager {
    private static _services: IDictionaryStringTo<ILocalService> = {};

    public static getService<T extends ILocalService>(serviceType: { new (webContext?: Contracts_Platform.WebContext): T }, useCached: boolean, webContext: Contracts_Platform.WebContext): T {
        Diag.Debug.assertIsNotNull(serviceType, "serviceType");

        // Use cached by default
        useCached = useCached !== false;

        // Use default web context if not specified
        if (!webContext) {
            webContext = Context.getDefaultWebContext();
        }

        var instance: T;
        var serviceName = "vssLocalService." + VSS.getTypeName(serviceType);
        if (useCached) {
            instance = <T>this._services[serviceName];
        }

        if (!instance) {
            // Instantiate the service
            instance = new serviceType(webContext);

            // Cache it if caching is used
            if (useCached) {
                this._services[serviceName] = instance;
            }
        }

        return <T>instance;
    }
}

/**
 * Get a local service.
 * @param serviceType Type of the local service to get.
 * @param webContext optional web context.
 * @returns {ILocalService}
 */
export function getLocalService<T extends ILocalService>(serviceType: { new (): T }, useCached?: boolean, webContext?: Contracts_Platform.WebContext): T {
    return LocalServiceManager.getService(serviceType, useCached, webContext);
}

/**
* Get a collection-level service
* @param serviceType Type of service to get
* @param webContext optional web context to use for the connection
* @return Collection-level service
*/
export function getCollectionService<T extends VssService>(serviceType: { new (): T }, webContext?: Contracts_Platform.WebContext): T {
    return VssConnection.getConnection(webContext, Contracts_Platform.ContextHostType.ProjectCollection).getService(serviceType);
}

/**
* Get an application-level (Account) service
* @param serviceType Type of service to get
* @param webContext optional web context to use for the connection
* @return Application-level service
*/
export function getApplicationService<T extends VssService>(serviceType: { new (): T }, webContext?: Contracts_Platform.WebContext): T {
    return VssConnection.getConnection(webContext, Contracts_Platform.ContextHostType.Organization).getService(serviceType);
}

/**
* Get a service for the web context's default host type
* @param serviceType Type of service to get
* @param webContext optional web context to use for the connection
* @return Collection-level or Application-level service
*/
export function getService<T extends VssService>(serviceType: { new (): T }, webContext?: Contracts_Platform.WebContext): T {
    return VssConnection.getConnection(webContext).getService(serviceType);
}

/**
* Get a collection-level HTTP client
* @param httpClientType Type of http client to get
* @param webContext optional web context to use for the connection
* @return collection-level client
*/
export function getCollectionClient<T extends WebApi_RestClient.VssHttpClient>(httpClientType: { new (url: string, options?: WebApi_RestClient.IVssHttpClientOptions): T; }, webContext?: Contracts_Platform.WebContext, serviceInstanceId?: string, authTokenManager?: IAuthTokenManager<any>, options?: WebApi_RestClient.IVssHttpClientOptions): T {
    return VssConnection.getConnection(webContext, Contracts_Platform.ContextHostType.ProjectCollection).getHttpClient(httpClientType, serviceInstanceId, authTokenManager, options);
}

/**
* Get an organization-level (Organization) HTTP client
* @param httpClientType Type of http client to get
* @param webContext optional web context to use for the connection
* @return application-level client
*/
export function getApplicationClient<T extends WebApi_RestClient.VssHttpClient>(httpClientType: { new (url: string, options?: WebApi_RestClient.IVssHttpClientOptions): T; }, webContext?: Contracts_Platform.WebContext, serviceInstanceId?: string, authTokenManager?: IAuthTokenManager<any>, options?: WebApi_RestClient.IVssHttpClientOptions): T {
    return VssConnection.getConnection(webContext, Contracts_Platform.ContextHostType.Organization).getHttpClient(httpClientType, serviceInstanceId, authTokenManager, options);
}

/**
* Get an http client for the web context's default host type
* @param serviceType Type of http client to get
* @param webContext optional web context to use for the connection
* @return Collection-level or Application-level http client
*/
export function getClient<T extends WebApi_RestClient.VssHttpClient>(httpClientType: { new (url: string, options?: WebApi_RestClient.IVssHttpClientOptions): T; }, webContext?: Contracts_Platform.WebContext, serviceInstanceId?: string, authTokenManager?: IAuthTokenManager<any>, options?: WebApi_RestClient.IVssHttpClientOptions): T {
    return VssConnection.getConnection(webContext).getHttpClient(httpClientType, serviceInstanceId, authTokenManager, options);
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.OM", exports);
