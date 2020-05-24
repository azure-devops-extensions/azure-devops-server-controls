
import VSS = require("VSS/VSS");
import Ajax = require("VSS/Ajax");
import Context = require("VSS/Context");
import Navigation_Service = require("VSS/Navigation/Services");
import Utils_Core = require("VSS/Utils/Core");
import Diag = require("VSS/Diag");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");

/*
* Obsolete: This class is moved from VSSF to support existing TFS code. New code should leverage web context from VSS.Context.
*/

var imageTimeStamp: number;

export function setImageTimestamp() {
    imageTimeStamp = $.now();
}

export interface IConfigurationOptions {
    rootPath: string;
    theme?: string;
    resourcesPath: string;
    staticRootTfs: string;
    staticRoot3rdParty: string;
    webApiVersion: string;
    mailSettings: IMailSettings;
}

export interface IMailSettings {
    enabled: boolean;
}

export class Configuration {

    private _options: IConfigurationOptions;

    /**
     * Holds configuration information such as rootPath, theme, etc.
     * 
     * @param configData 
     */
    constructor(configData?: IConfigurationOptions) {

        this._options = configData || <any>{}; // Casting to any to avoid compiler errors regarding {} not conforming to interface. Not willing to change code at this time.
    }

    /**
     * Gets the root path of the application
     * 
     * @return 
     */
    public getRootPath(): string {
        return this._options.rootPath || "/";
    }

    /**
     * Gets the current theme name
     * 
     * @return 
     */
    public getTheme(): string {
        return this._options.theme || "Default";
    }

    /**
     * Gets the current resource path where images, css files, etc. live
     * 
     * @return 
     */
    public getResourcesPath(): string {
        return this._options.resourcesPath || (this.getRootPath() + "_content/");
    }

    /**
     * Converts the given the file into a resource relative path 
     * 
     * @param file File to convert
     * @return 
     */
    public getResourcesFile(file: string): string {
        return this.getResourcesPath() + encodeURIComponent(file);
    }

    /**
     * Returns URL path to TFS static files
     * 
     * @return 
     */
    public getTfsStaticRootPath(): string {
        return this._options.staticRootTfs || "/tfs/_static/tfs/12/";
    }

    /**
     * Returns URL path to 3rdParty static files
     * 
     * @return 
     */
    public get3rdPartyStaticRootPath(): string {
        return this._options.staticRoot3rdParty || "/tfs/_static/3rdParty/";
    }

    /**
     * Converts the given the file into a theme relative path
     * 
     * @param file File to convert
     * @return 
     */
    public getThemedFile(file: string): string {
        return this.getTfsStaticRootPath() +
            "App_Themes/" +
            encodeURIComponent(this.getTheme()) + "/" +
            encodeURIComponent(file);
    }

    /**
     * Get Web Api version for TFS 
     * 
     * @return 
     */
    public getWebApiVersion(): string {
        return this._options.webApiVersion || "1";
    }

    public getMailSettings() {
        return this._options.mailSettings;
    }
}


export enum NavigationContextLevels {
    None = 0x00,
    Deployment = 0x01,
    Application = 0x02,
    Collection = 0x04,
    Project = 0x08,
    Team = 0x10,
    ApplicationAll = 0x0f,
    All = 0x1f,
}

export enum TeamFoundationHostType {
    Parent = -1,
    Unknown = 0,
    Deployment = 1,
    Application = 2,
    ProjectCollection = 4,
}

export interface IContextIdentity {
    id: string;  // TeamFoundationId (Guid)
    isContainer: boolean;
    isActive: boolean;
    displayName: string;
    uniqueName: string;
    email?: string;
}

export interface ITeam {
    identity: IContextIdentity;
    name: string;
}

export interface IServiceHost {
    instanceId: string; // GUID
    name: string;
    hostType: number;
    vDir: string;
    relVDir: string;
    uri?: string;
}

export interface INavigation {
    topMostLevel: number;
    area: string;
    areaPrefix: string;
    currentController: string;
    currentAction: string;
    controllerPrefix: string;
    serviceHost: IServiceHost;
    applicationServiceHost: IServiceHost;
    collection: IServiceHost;
    project: string;
    projectId: string;
    team: string;
    teamId: string;
    publicAccessPoint: { uri: string; scheme: string; authority: string };
}

/*
 * Class containing context information about the current page: identity, navigation, configuration data, etc.
 */
export class TfsContext {

    private static _DEFAULT_CONTROLLER_NAME = "home";
    private static _DEFAULT_ACTION_NAME = "index";
    private static _CLIENTHOST = "clientHost";
    private static _VERSION = "__v";
    private static _LANGUAGE = "__loc";
    private static _PERMALINK_PREFIX = "_permalink";

    private static _API = "api";
    private static _defaultTfsContext: TfsContext;

    /*
     * Control extension that populates the tfsContext option when applied to a control class
     */
    public static ControlExtensions = {
        initializeEnhancementOptions: function ($element: JQuery, baseOptions: any /* TODO: Type this to base interface for Control Options when that gets converted */) {

            return $.extend({}, baseOptions, {
                tfsContext: TfsContext.getContextOrDefault($element)
            });
        }
    };

    private static getContextOrDefault($element: JQuery): TfsContext {
        var contextData = Context.parseWebContext($element);
        if (contextData) {
            return new TfsContext(contextData);
        }
        else {
            return TfsContext.getDefault();
        }
    }

    /*
     * Get the default tfs context for the current page (populated through JSON island data on the page).
     * Throws if the page does not contain default context information
     */
    public static getDefault(): TfsContext {
        if (!TfsContext._defaultTfsContext) {
            var defaultContextData = Context.getDefaultWebContext();
            if (!defaultContextData) {
                throw new Error("Default context information is missing.");
            }
            TfsContext._defaultTfsContext = new TfsContext(defaultContextData);
        }
        return TfsContext._defaultTfsContext;
    }

    /*
     * Get the default tfs context for the current page (populated through JSON island data on the page).
     * Returns null if the page does not contain default context information
     */
    public static tryGetDefaultContext(): TfsContext {
        if (typeof TfsContext._defaultTfsContext === "undefined") {
            var defaultContextData = Context.getDefaultWebContext();
            TfsContext._defaultTfsContext = defaultContextData ? new TfsContext(defaultContextData) : null;
        }
        return TfsContext._defaultTfsContext;
    }

    public contextData: Contracts_Platform.WebContext;
    public configuration: Configuration;
    public navigation: INavigation;
    public currentUser: string;
    public currentIdentity: IContextIdentity;
    public currentTeam: ITeam;
    public standardAccessMode: boolean;
    public isHosted: boolean;
    public isDevfabric: boolean;
    public isAADAccount: boolean;
    public allowStatsCollection: boolean;
    public activityId: string;
    private sessionId: string;
    private isSameHost: boolean;

    constructor(contextData: Contracts_Platform.WebContext) {

        this.contextData = contextData;
        var defaultPageContext = Context.getPageContext();

        this.navigation = {
            applicationServiceHost: TfsContext.createServiceHost(contextData.account, Contracts_Platform.ContextHostType.Application, contextData, defaultPageContext.webAccessConfiguration.paths.rootPath),
            area: defaultPageContext.navigation.area,
            areaPrefix: defaultPageContext.webAccessConfiguration.api.areaPrefix,
            collection: TfsContext.createServiceHost(contextData.collection, Contracts_Platform.ContextHostType.ProjectCollection, contextData, defaultPageContext.webAccessConfiguration.paths.rootPath),
            controllerPrefix: defaultPageContext.webAccessConfiguration.api.controllerPrefix,
            currentAction: defaultPageContext.navigation.currentAction,
            currentController: defaultPageContext.navigation.currentController,
            project: null,
            projectId: null,
            publicAccessPoint: {
                authority: contextData.host.authority,
                scheme: contextData.host.scheme,
                uri: contextData.account ? contextData.account.uri : contextData.host.uri
            },
            serviceHost: TfsContext.createServiceHost(contextData.host, contextData.host.hostType, contextData, defaultPageContext.webAccessConfiguration.paths.rootPath),
            topMostLevel: defaultPageContext.navigation.topMostLevel,
            team: null,
            teamId: null
        };

        if (this.navigation.publicAccessPoint.uri[this.navigation.publicAccessPoint.uri.length - 1] !== "/") {
            this.navigation.publicAccessPoint.uri += "/";
        }

        if (contextData.project) {
            this.navigation.project = contextData.project.name;
            this.navigation.projectId = contextData.project.id;
        }

        if (contextData.team && defaultPageContext.navigation.topMostLevel === Contracts_Platform.NavigationContextLevels.Team) {
            this.navigation.team = contextData.team.name;
            this.navigation.teamId = contextData.team.id;
        }

        this.configuration = new Configuration({
            mailSettings: defaultPageContext.webAccessConfiguration.mailSettings,
            resourcesPath: defaultPageContext.webAccessConfiguration.paths.resourcesPath,
            rootPath: defaultPageContext.webAccessConfiguration.paths.rootPath,
            staticRoot3rdParty: defaultPageContext.webAccessConfiguration.paths.staticRoot3rdParty,
            staticRootTfs: defaultPageContext.webAccessConfiguration.paths.staticRootTfs,
            theme: defaultPageContext.globalization.theme,
            webApiVersion: defaultPageContext.webAccessConfiguration.api.webApiVersion
        });

        this.isHosted = !!defaultPageContext.webAccessConfiguration.isHosted;
        this.allowStatsCollection = !!defaultPageContext.diagnostics.allowStatsCollection;
        this.activityId = defaultPageContext.diagnostics.activityId;
        this.sessionId = defaultPageContext.diagnostics.sessionId;
        this.isAADAccount = !!contextData.host.isAADAccount;
        this.isSameHost = window.self == window.top;

        if (contextData.user) {
            this.currentUser = contextData.user.name;
            this.standardAccessMode = !contextData.user.limitedAccess;
            this.currentIdentity = {
                displayName: contextData.user.name,
                email: contextData.user.email,
                id: contextData.user.id,
                isActive: true,
                isContainer: false,
                uniqueName: contextData.user.uniqueName
            };
        }

        if (contextData.team) {
            this.currentTeam = {
                name: contextData.team.name,
                identity: {
                    displayName: contextData.team.name,
                    id: contextData.team.id,
                    isActive: true,
                    isContainer: true,
                    email: null,
                    uniqueName: null
                }
            };
        }
    }

    private static createServiceHost(
        host: Contracts_Platform.HostContext,
        hostType: Contracts_Platform.ContextHostType,
        context: Contracts_Platform.WebContext,
        rootPath: string): IServiceHost {

        if (host) {
            var serviceHost = {
                hostType: hostType,
                name: host.name,
                instanceId: host.id,
                uri: host.uri,
                relVDir: this.trimVirtualPath(host.relativeUri, rootPath),
                vDir: host.relativeUri,
            };
            return serviceHost;
        }
        else {
            return null;
        }
    }

    /* similar to C# PlatformHelpers.TrimVirtualPath -- rips out application virtual path and leading/trailing slashes */
    private static trimVirtualPath(
        virtualPath: string,
        rootPath: string): string {

        if (!virtualPath || virtualPath.length === 0) {
            return virtualPath;
        }

        if (virtualPath.toLowerCase().indexOf(rootPath.toLowerCase()) === 0) {
            virtualPath = virtualPath.substr(rootPath.length);
        }

        while (virtualPath.length > 0 && virtualPath[0] === "/") {
            virtualPath = virtualPath.substr(1);
        }

        while (virtualPath.length > 0 && virtualPath[virtualPath.length - 1] === "/") {
            virtualPath = virtualPath.substr(0, virtualPath.length - 1);
        }

        return virtualPath;
    }

    public getSessionId(): string {
        var result: string;
        result = this.sessionId;
        var cookies = document.cookie ? document.cookie.split('; ') : [];
        for (var i = 0, l = cookies.length; i < l; i++) {
            var parts = cookies[i].split('=');
            if (parts && parts.length === 2 && parts[0] === 'Tfs-SessionId') {
                result = parts[1];
                break;
            }
        }
        this.sessionId = result;
        return result;
    }


    public getHostUrl(): string {
        return this.navigation.publicAccessPoint.scheme + "://" + this.navigation.publicAccessPoint.authority;
    }

    public getServiceHostUrl() {
        return this.navigation.serviceHost.vDir;
    }

    /**
     * Constructs absolute action url using specified parameters and current TFS context
     * 
     * @param action Controller action
     * @param controller Controller
     * @param routeData 
     * OPTIONAL: Information to use in constructing the url.  The object has the following structure:
     *  {
     *     team: OPTIONAL: Defaulted to the current team in the navigation system if not provided.
     *     project: OPTIONAL: Defaulted to the current project in the navigation system if not provided.
     *     serviceHost: OPTIONAL: Defaulted to the current serviceHost (collection) in the navigation system if not provided.
     *     area: OPTIONAL: Defaulted to the current area in the navigation system if not provided. Ex: "admin", or "api".
     *     includeVersion: OPTIONAL: When set to true, the web client version will be included as part of the query string for the generated URL.
     *                      This should only be used when generating URL's which will not show up in the address bar.
     *                      NOTE: This is implicitly done when generating URL's in the API area.
     *     useApiUrl: OPTIONAL: When set to true and project and team information should be added to the uri, 
     *                          project and team ids instead of names will be used.
     *                          NOTE: Similar to 'includeVersion', this is done automatically for the API area if useApi Url is either not given,
     *                          or not explicitly set to false.
     *  }
     * 
     * @return 
     */
    public getPublicActionUrl(action: string, controller: string, routeData?: any): string {
        var actionUrl = this._constructActionUrl(action, controller, routeData);
        return this.getHostUrl() + this.configuration.getRootPath() + actionUrl;
    }

    /**
     * Constructs relative action url using specified parameters and current TFS context
     * 
     * @param action Controller action
     * @param controller Controller
     * @param routeData See routeData param on getPublicActionUrl.
     * @return 
     */
    public getActionUrl(action?: string, controller?: string, routeData?: any): string {
        if (!this.isSameHost) {
            return this.getPublicActionUrl(action, controller, routeData);
        }
        var actionUrl = this._constructActionUrl(action, controller, routeData);
        return this.configuration.getRootPath() + actionUrl;
    }

     /**
     * Use this function to navigate within the same iframe
     * Constructs relative extension action url using specified parameters and current TFS context
     * 
     * @param action Controller action
     * @param queryParameters Query parameters
     * @return 
     */
    public getExtensionActionUrl(action?: any, queryParameters?: any): string {
        return this._getExtensionActionUrlFragment(action, queryParameters);
    }

     /**
     * Use this function to navigate in a new tab (ex: url opens in a new tab)
     * Constructs relative extension action full url using specified parameters and current TFS context
     * 
     * @param contributionId Contribution Id
     * @param action Controller action
     * @param queryParameters Query parameters
     * @return 
     */
    public getExtensionActionFullUrl(contributionId: string, action?: any, queryParameters?: any): string {
        var baseUri: string = this.getActionUrl();

        return this._getExtensionActionFullUrlFragment(baseUri, contributionId, action, queryParameters);
    }

    /**
     * Gives the complete url to an action in an extension hub
     * eg https://abc.visualstudio.com/DefaultCollection/projectId/_apps/hub/contributionId?_a=action&param1=queryParam[0]
     *
     * @param contributionId contribution id
     * @param action primary page action
     * @param queryParameters query params for the url
     */
    public getExtensionActionHostUrl(contributionId: string, action?: any, queryParameters?: any): string {
        var serviceHostUrl = this.navigation.serviceHost.uri;
        var projectUrl = serviceHostUrl + this.contextData.project.id + "/";

        return this._getExtensionActionFullUrlFragment(serviceHostUrl, contributionId, action, queryParameters); 
    }

    /**
     * Constructs action url using specified parameters and current TFS context
     * 
     * @param collectionName collection name
     * @param action Controller action
     * @param controller Controller
     * @param routeData See routeData param on getPublicActionUrl.
     * @return 
     */
    public getCollectionActionUrl(collectionName: string, action: string, controller?: string, routeData?: any): string {

        var actionUrl = this._constructActionUrl(action, controller, routeData);
        return this.configuration.getRootPath() + collectionName + "/" + actionUrl;
    }

    /**
     * Returns a duplicate tfscontext overriding the service host
     * 
     * @param serviceHost serviceHost
     * @return 
     */
    public getCollectionTfsContext(serviceHost: IServiceHost): TfsContext {
        Diag.Debug.assertParamIsNotNull(serviceHost, "serviceHost is null");
        var collectionTfsContext = <TfsContext>$.extend(true, {}, this);
        collectionTfsContext.navigation.serviceHost = serviceHost;
        collectionTfsContext.navigation.collection = serviceHost;

        // Update the TfsContext's webContext object
        collectionTfsContext.contextData = <Contracts_Platform.WebContext>$.extend(true, {}, collectionTfsContext.contextData);
        collectionTfsContext.contextData.host.id = serviceHost.instanceId;
        collectionTfsContext.contextData.host.name = serviceHost.name;
        collectionTfsContext.contextData.host.uri = serviceHost.uri;
        collectionTfsContext.contextData.host.relativeUri = serviceHost.vDir;
        collectionTfsContext.contextData.host.hostType = Contracts_Platform.ContextHostType.ProjectCollection;
        collectionTfsContext.contextData.collection = collectionTfsContext.contextData.host;

        return collectionTfsContext;
    }

    /**
     * Constructs permalink url using specified parameters and current TFS context
     * 
     * @param action Controller action
     * @param controller Controller
     * @param routeData See routeData param on getPublicActionUrl.
     * @return 
     */
    public getPermalinkUrl(action: string, controller?: string, routeData?: any): string {

        var permalinkUrl = this._constructPermalinkUrl(action, controller, routeData);
        return this.configuration.getRootPath() + permalinkUrl;
    }

    /**
     * @param identityId 
     * @param urlParams 
     * @return 
     */
    public getIdentityImageUrl(identityId: string, urlParams?: any): string {
        var defaultParams = {
            area: TfsContext._API,
            project: "",
            id: identityId,
            t: imageTimeStamp
        };

        return this.getActionUrl("IdentityImage", "common", $.extend(defaultParams, urlParams));
    }

    /**
     * Returns true if embedded in non browser host (e.g. TEE)
     * 
     * @return 
     */
    public isEmbedded(): boolean {
        return !!this.getClientHost();
    }

    /**
     * Get client host if any.  In normal browser
     * scenario this is null.  If Web Access is running in
     * context of a different host (e.g. TEE) this will have
     * a value.
     * 
     * @return 
     */
    public getClientHost(): string {
        return Context.getPageContext().webAccessConfiguration.clientHost;
    }

    /**
     * Constructs action url using specified parameters and current TFS context
     * 
     * @param action Controller action
     * @param controller Controller
     * @param routeData See routeData param on getPublicActionUrl.
     * @return 
     */
    private _constructActionUrl(action?: string, controller?: string, routeData?: any): string {
        var navigation = this.navigation;
        var urlParts: string[] = [];
        var serviceHost: IServiceHost;
        var project: string;
        var team: string;
        var routeParams: any;
        var parameters: any;
        var queryString: string;
        var areaPrefix: string;
        var controllerPrefix: string;

        areaPrefix = navigation.areaPrefix || "";
        controllerPrefix = navigation.controllerPrefix || "";

        routeParams = $.extend({}, routeData);

        var area: string = routeParams.area;
        if (typeof area === "undefined") {
            area = navigation.area;
        }

        delete routeParams.area;

        // --- BEGIN TFS Navigation Context
        serviceHost = routeParams.serviceHost;

        if (typeof serviceHost === "undefined") {
            serviceHost = navigation.serviceHost;
        }

        if (serviceHost) {
            if (serviceHost.relVDir) {
                urlParts.push(encodeURI(serviceHost.relVDir));
            }

            if (serviceHost.hostType === TeamFoundationHostType.ProjectCollection) {
                // Determine whether project and team names should be used or ids, if not explicitly given by caller
                var useApiUrl = this._shouldBuildApiUrl(area, routeParams);

                project = routeParams.project;

                if (typeof project === "undefined") {
                    if (useApiUrl) {
                        project = navigation.projectId;
                    } else {
                        project = navigation.project;
                    }
                }

                if (project) {
                    urlParts.push(encodeURIComponent(project));

                    team = routeParams.team;

                    if (typeof team === "undefined") {
                        if (useApiUrl) {
                            team = navigation.teamId;
                        } else {
                            team = navigation.team;
                        }
                    }

                    if (team) {
                        urlParts.push(encodeURIComponent(team));
                    }
                }
            }
        }

        //delete these navigation params so that url should not have them as query params
        delete routeParams.serviceHost;
        delete routeParams.project;
        delete routeParams.team;

        // --- END TFS Navigation Context

        if (area) {
            // There might be multiple areas specified like apis and profile
            if ($.isArray(area)) {
                var areas: string[] = <any>area; // Casting because variable can be string or string[]
                if (areas.length > 0) {
                    urlParts.push(encodeURIComponent(areaPrefix + areas[0]));
                }

                // Successive areas
                for (var i = 1; i < areas.length; i++) {
                    urlParts.push(encodeURIComponent(areas[i]));
                }
            }
            else {
                // Single area like api, admin, oi
                urlParts.push(encodeURIComponent(areaPrefix + area));
            }
        }

        if (!controller) {
            controller = routeParams.controller;
        }

        delete routeParams.controller;

        if (!action) {
            action = routeParams.action;
        }

        delete routeParams.action;

        parameters = routeParams.parameters;
        delete routeParams.parameters;

        if (parameters) {
            // If the parameters are passed but no controller or no action then set defaults
            if (!controller) {
                controller = TfsContext._DEFAULT_CONTROLLER_NAME;
            }

            if (!action) {
                action = TfsContext._DEFAULT_ACTION_NAME;
            }
        }

        if (controller) {
            urlParts.push(encodeURIComponent(controllerPrefix + controller));

            if (action) {
                urlParts.push(encodeURIComponent(action));

                if (parameters) {
                    if ($.isArray(parameters)) {
                        urlParts.push.apply(urlParts, $.map(parameters, encodeURIComponent));
                    }
                    else {
                        urlParts.push(encodeURIComponent(parameters));
                    }
                }
            }
        }

        if (routeParams.includeVersion || area === TfsContext._API) {
            routeParams[TfsContext._VERSION] = this.configuration.getWebApiVersion();
        }

        if (routeParams.includeLanguage && VSS.uiCulture) {
            routeParams[TfsContext._LANGUAGE] = VSS.uiCulture;
        }

        delete routeParams.includeVersion;

        // Add on client host query parameter if previously specified
        if (routeParams.area !== TfsContext._API && this.getClientHost()) {
            routeParams[TfsContext._CLIENTHOST] = this.getClientHost();
        }

        queryString = $.param(routeParams);

        return urlParts.join("/") + (queryString ? ("?" + queryString) : "");
    }

    /**
     * Constructs permalink url using specified parameters and current TFS context
     * 
     * @param action Controller action
     * @param controller Controller
     * @param routeData See routeData param on getPublicActionUrl.
     * @return 
     */
    private _constructPermalinkUrl(action: string, controller?: string, routeData?: any): string {

        var navigation = this.navigation;
        var urlParts: string[] = [];
        var routeParams: any = $.extend({}, routeData);
        var queryString: string;
        var controllerPrefix = navigation.controllerPrefix || "";
        var controllerName: string = controller || routeParams.controller || TfsContext._DEFAULT_CONTROLLER_NAME;
        var actionName: string = action || routeParams.action || TfsContext._DEFAULT_ACTION_NAME;
        var parameters: any = routeParams.parameters;

        urlParts.push(TfsContext._PERMALINK_PREFIX);
        urlParts.push(encodeURIComponent(controllerPrefix + controllerName));
        urlParts.push(encodeURIComponent(actionName));

        delete routeParams.controller;
        delete routeParams.action;
        delete routeParams.parameters;

        if (parameters) {
            if ($.isArray(parameters)) {
                urlParts.push.apply(urlParts, $.map(parameters, encodeURIComponent));
            }
            else {
                urlParts.push(encodeURIComponent(parameters));
            }
        }

        queryString = $.param(routeParams);

        return urlParts.join("/") + (queryString ? ("?" + queryString) : "");
    }

    /**
     * Helper function to determine whether an API url should be constructed for given area and router parameters.
     *
     * @param routeArea Area to build route for. If an array is given, the first value will be considered.
     * @param routeParams Parameters for route
     * @return Value indicating whether an API url should be constructed
     */
    private _shouldBuildApiUrl(routeArea: any, routeParams: any): boolean {
        var area: string;

        if (routeArea) {
            // Area definitions might be arrays, in that case check the first one
            if ($.isArray(routeArea)) {
                area = routeArea[0];
            } else {
                area = routeArea;
            }
        }

        // If an API url is explicitly requested, 
        // or the area is a an API area and an API url has not been explicitly prohibited
        return routeParams.useApiUrl
            || (area === TfsContext._API && (typeof (routeParams.useApiUrl) === "undefined" || routeParams.useApiUrl));
    }


    private _getExtensionActionUrlFragment(action: any, queryParameters?: any): string {
        var fragementActionLink = Navigation_Service.getHistoryService().getFragmentActionLink(action, queryParameters);

        return fragementActionLink;
    }

    private _getExtensionActionFullUrlFragment(baseUri: string, contributionId: string, action: any, queryParameters?: any): string {
        var fragementActionLink = Navigation_Service.getHistoryService().getFragmentActionLink(action, queryParameters);

        return baseUri + this._getExtensionFullUrl(contributionId) + fragementActionLink;
    }

    private _getExtensionFullUrl(contributionId: string): string {
        return `/_apps/hub/${contributionId}`;
    }
}
