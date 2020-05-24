
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.TeamFoundation.Server.WebAccess.Platform
// Microsoft.VisualStudio.Services.ExtensionManagement.Sdk.Plugins
//----------------------------------------------------------

import VSS_Contributions_Contracts = require("VSS/Contributions/Contracts");

/**
* Model to represent a public access uri
*/
export interface AccessPointModel {
    /**
    * Host name and port number of the url
    */
    authority: string;
    /**
    * Url scheme (http, https, ...)
    */
    scheme: string;
    /**
    * Full url
    */
    uri: string;
}

/**
* Data related to Active Extensions
*/
export interface ActiveExtensionsData {
    /**
    * Dictionary mapping extension ids to their active status
    */
    extensions: { [key: string]: boolean; };
}

/**
* Model used to configure how TFS reports usage data to Application Insights
*/
export interface AppInsightsConfiguration {
    /**
    * If true, automatically call "trackPage" when the page is loaded
    */
    autoTrackPage: boolean;
    /**
    * Optional data used to override the default values sent to trackPage
    */
    customTrackPageData: AppInsightsCustomTrackPageData;
    /**
    * Set to false if app insights reporting is not enabled/configured
    */
    enabled: boolean;
    /**
    * The url from which to retrieve app insights scripts
    */
    insightsScriptUrl: string;
    /**
    * The instrumentation key used to track this deployment's usage
    */
    instrumentationKey: string;
    /**
    * If true, include collection, project, and team info in the track-page urls
    */
    trackProjectInfo: boolean;
}

/**
* Model that can be used to customize the values sent to AppInsights via "trackPage"
*/
export interface AppInsightsCustomTrackPageData {
    alias: string;
    metrics: { [key: string]: any; };
    pageName: string;
    properties: { [key: string]: string; };
}

/**
* Web Access configuration data. This information is used to process requests on the server.  This data is also placed in a json island on each page in order for JavaScript to know key configuration data required to things like construct proper urls
*/
export interface ConfigurationContext {
    /**
    * MVC api configuration
    */
    api: ConfigurationContextApis;
    /**
    * Optional name of the client (e.g. TEE) hosting the page
    */
    clientHost: string;
    isHosted: boolean;
    /**
    * Current mail settings for TFS
    */
    mailSettings: TfsMailSettings;
    /**
    * Server resource paths
    */
    paths: ConfigurationContextPaths;
    /**
    * Indicates what URL format to use.
    */
    useCodexDomainUrls: boolean;
}

/**
* MVC api configuration
*/
export interface ConfigurationContextApis {
    /**
    * Specifies the path prefix for the area
    */
    areaPrefix: string;
    /**
    * Specifies the path prefix for the controller
    */
    controllerPrefix: string;
    /**
    * Api-version for legacy rpc-style web access api controllers See WebApiVersionClient for the version coming from the client/browser.  The return value is a positive whole number >= 1.
    */
    webApiVersion: string;
}

/**
* Paths to server resources
*/
export interface ConfigurationContextPaths {
    /**
    * Path (no CDN) to versioned static content
    */
    cdnFallbackStaticRootTfs: string;
    /**
    * Relative path to the _content path of the web application
    */
    resourcesPath: string;
    /**
    * Relative path to the root of the web application
    */
    rootPath: string;
    /**
    * Absolute path to build static content URLs from. May be relative or fully-qualified.
    */
    staticContentRootPath: string;
    /**
    * Static content version stamp
    */
    staticContentVersion: string;
    /**
    * Relative path to unversioned 3rd party static content
    */
    staticRoot3rdParty: string;
    /**
    * Relative path to versioned static content
    */
    staticRootTfs: string;
}

export enum ContextHostType {
    Unknown = 0,
    /**
    * The Deployment Host
    */
    Deployment = 1,
    /**
    * A legacy name for the Organization host. Use ContextHostType.Organization instead.
    */
    Application = 2,
    /**
    * The Organization host
    */
    Organization = 2,
    /**
    * The Project Collection
    */
    ProjectCollection = 4,
}

export interface ContextIdentifier {
    id: string;
    name: string;
}

/**
* Page context configuration that can be contributed by remote services (different VSTS services delivering content to the page)
*/
export interface ContributedServiceContext {
    /**
    * Dynamic bundles to include from this service
    */
    bundles: DynamicBundlesCollection;
    /**
    * Specifies the prefixes for CSS modules that should map to the current service. e.g. "VSS/LoaderPlugins/Css!EMS:ExtensionManagement" would map to ExtensionManagement.css under the themed content path of this service if "EMS" is in the CSSModulePrefixes list.
    */
    cssModulePrefixes: string[];
    /**
    * Feature flag states to include by default in page data (avoids AJAX lookup)
    */
    featureAvailability: FeatureAvailabilityContext;
    /**
    * Module loader configuration which may be merged-in with the parent host (if injected into the DOM) Because the config may be merged with the host config, each root area path must be explicitly defined here rather than relying on basePath as a catch-all.
    */
    moduleLoaderConfig: ModuleLoaderConfiguration;
    /**
    * Paths to resources on this service
    */
    paths: ConfigurationContextPaths;
    /**
    * Lookup of urls for different services (at different host levels)
    */
    serviceLocations: ServiceLocations;
    /**
    * The root url of the service that can be used to resolve relative links when this content is hosted in another site.
    */
    serviceRootUrl: string;
    /**
    * Instance id of the service
    */
    serviceTypeId: string;
}

/**
* Item representing a contribution path. Can be of type default, resource or bundle
*/
export interface ContributionPath {
    /**
    * Type if this contribution path
    */
    pathType: ContributionPathType;
    /**
    * Replace value for this contribution path
    */
    value: string;
}

/**
* Type of the contribution path
*/
export enum ContributionPathType {
    Default = 0,
    Resource = 1,
    ThirdParty = 2,
}

export interface ContributionsPageData {
    contributions: PageContribution[];
    providerDetails: { [key: string]: PageContributionProviderDetails; };
    queriedContributionIds: string[];
}

/**
* Contains lists of script and css references that need to be included on the page in order for the controls used by the page to work.
*/
export interface CoreReferencesContext {
    /**
    * Core 3rd party javascript bundle reference
    */
    coreScriptsBundle: JavascriptFileReference;
    /**
    * Core VSS javascript bundle reference for extension frames
    */
    extensionCoreReferences: JavascriptFileReference;
    /**
    * Core javascript files referenced on a page
    */
    scripts: JavascriptFileReference[];
    /**
    * Core CSS files referenced on a page
    */
    stylesheets: StylesheetReference[];
}

export interface DaylightSavingsAdjustmentEntry {
    /**
    * Millisecond adjustment from UTC
    */
    offset: number;
    /**
    * Date that the offset adjustment starts
    */
    start: Date;
}

export interface DiagnosticsContext {
    /**
    * Id of the current activity
    */
    activityId: string;
    allowStatsCollection: boolean;
    /**
    * Whether or not to enable static content bundling. This is on by default but the value can be overridden with a TFS-BUNDLING cookie or registry entry.
    */
    bundlingEnabled: boolean;
    /**
    * True if the CDN feature flag is enabled.
    */
    cdnAvailable: boolean;
    /**
    * True if the CDN feature flag is enabled and the user has not disabled CDN with a cookie.
    */
    cdnEnabled: boolean;
    clientLogLevel: number;
    debugMode: boolean;
    /**
    * Whether or not to diagnose the bundles.
    */
    diagnoseBundles: boolean;
    inExtensionFallbackMode: boolean;
    isDevFabric: boolean;
    serviceVersion: string;
    sessionId: string;
    tracePointCollectionEnabled: boolean;
    tracePointProfileEnd: string;
    tracePointProfileStart: string;
    /**
    * Denotes the version of the web platform consumed by this service. Of the form M###.
    */
    webPlatformVersion: string;
}

export interface DynamicBundlesCollection {
    scripts: DynamicScriptBundle[];
    scriptsExcludedByPath: string[];
    styles: DynamicCSSBundle[];
}

export interface DynamicCSSBundle {
    clientId: string;
    contentLength: number;
    cssFiles: string[];
    fallbackThemeUri: string;
    uri: string;
}

export interface DynamicScriptBundle {
    clientId: string;
    contentLength: number;
    integrity: string;
    uri: string;
}

export interface ExtendedHostContext {
    authority: string;
    hostType: ContextHostType;
    id: string;
    isAADAccount: boolean;
    name: string;
    relativeUri: string;
    scheme: string;
    uri: string;
}

export interface FeatureAvailabilityContext {
    featureStates: { [key: string]: boolean; };
}

export interface GlobalizationContext {
    culture: string;
    /**
    * Gets the explicitly-set theme, or the empty string if a theme was not explicitly set. An explicitly-set theme is set either in the query string (?theme=[themename]) or in the user's profile. However, the default theme set in the profile is not considered to be an explicitly-set theme.
    */
    explicitTheme: string;
    theme: string;
    timeZoneId: string;
    timezoneOffset: number;
    typeAheadDisabled: boolean;
}

export interface HostContext {
    id: string;
    name: string;
    relativeUri: string;
    uri: string;
}

/**
* Model representing a hub in VSTS pages' navigation menu
*/
export interface Hub {
    ariaLabel: string;
    builtIn: boolean;
    groupId: string;
    hidden: boolean;
    icon: string;
    id: string;
    isSelected: boolean;
    name: string;
    order: any;
    supportsXHRNavigate: boolean;
    uri: string;
}

/**
* Model representing a hub group in VSTS pages' navigation menu
*/
export interface HubGroup {
    builtIn: boolean;
    hasHubs: boolean;
    hidden: boolean;
    icon: string;
    id: string;
    name: string;
    nonCollapsible: boolean;
    order: any;
    uri: string;
}

/**
* Context information containing the relevant hubs and hub groups for a given context
*/
export interface HubsContext {
    allHubs: Hub[];
    hubGroups: HubGroup[];
    hubGroupsCollectionContributionId: string;
    hubs: Hub[];
    pinningPreferences: PinningPreferences;
    selectedHubGroupId: string;
    selectedHubId: string;
    selectedNavigationIds: string[];
}

/**
* Model to represent a TeamFoundationIdentity
*/
export interface IdentityModel {
    /**
    * Custom display name
    */
    customDisplayName: string;
    /**
    * Display name
    */
    displayName: string;
    /**
    * Email address
    */
    email: string;
    /**
    * Unique team foundation id
    */
    id: string;
    /**
    * Is the identity active
    */
    isActive: boolean;
    /**
    * Is the identity a group/team
    */
    isContainer: boolean;
    /**
    * The provider's display name for this identity
    */
    providerDisplayName: string;
    /**
    * Unique name for this identity
    */
    uniqueName: string;
}

/**
* Reference to a javascript file to include on a page
*/
export interface JavascriptFileReference {
    /**
    * Condition to check in the case that Url lives on a CDN. The fallback script will be included if this check fails.
    */
    fallbackCondition: string;
    /**
    * Fallback url to use in case Url lives on a CDN
    */
    fallbackUrl: string;
    /**
    * Id of the reference (JQuery, JQueryUI, MicrosoftAjax, etc.)
    */
    identifier: string;
    /**
    * Is this a core javascript file that needs to be included in all child extension frames
    */
    isCoreModule: boolean;
    /**
    * Url of the javascript reference
    */
    url: string;
}

/**
* Class used to wrap arrays in an object.
*/
export interface JsonArrayWrapper {
    __wrappedArray: string;
}

export interface MicrosoftAjaxConfig {
    cultureInfo: any;
}

/**
* AMD javascript module loader configuration
*/
export interface ModuleLoaderConfiguration {
    baseUrl: string;
    contributionPaths: { [key: string]: ContributionPath; };
    paths: { [key: string]: string; };
    shim: { [key: string]: ModuleLoaderShimConfiguration; };
    /**
    * The maximum amount of time (in seconds) the AMD loader will wait for scripts to load.
    */
    waitSeconds: number;
}

/**
* AMD javascript module loader shim configuration
*/
export interface ModuleLoaderShimConfiguration {
    deps: string[];
    exports: string;
}

/**
* Structure to specify current navigation context of the executing request. The navigation context content's are generally obtained from the request URL. Some context specifiers such as "Account" can be implicit and might come from current IVssServiceHost.
*/
export interface NavigationContext {
    /**
    * A token to show which area the request has been targeted to. By default there are two areas "Admin" and "Api". They can be specified in the URL as _admin and _api respectively.
    */
    area: string;
    /**
    * Command name for the current request's route. Used in telemetry and reporting.
    */
    commandName: string;
    /**
    * Current action route value
    */
    currentAction: string;
    /**
    * Current controller route value
    */
    currentController: string;
    /**
    * Current parameters route value (the path after the controller and action in the url)
    */
    currentParameters: string;
    /**
    * The id of the matched route
    */
    routeId: string;
    /**
    * The templates for the matched route
    */
    routeTemplates: string[];
    /**
    * The set of route values for this request
    */
    routeValues: { [key: string]: string; };
    /**
    * Flag to show top most navigation context. For example the URL http://server:port/collection/project/_controller/action sets the Project bit while the URL http://server:port/collection/project/_admin/_controller/action sets also sets the area property to Admin.
    */
    topMostLevel: NavigationContextLevels;
}

/**
* Flags to show which tokens of the navigation context are present in the current request URL. The request url's context part are formed like http://server:port[/{collection}[/{project}[/{team}]]][/_admin]/_{controller}/{action} The tokens {collection}, {project} and {team} are navigation level tokens whereas _admin segment is a switch to show admin areas of the site.
*/
export enum NavigationContextLevels {
    None = 0,
    /**
    * Root level in Azure.
    */
    Deployment = 1,
    /**
    * Root level in on premises. Neither of {collection}, {project} and {team} tokens have information
    */
    Application = 2,
    /**
    * Flag to show {collection} token has information.
    */
    Collection = 4,
    /**
    * Flag to show {project} token has information.
    */
    Project = 8,
    /**
    * Flag to show {team} token has information.
    */
    Team = 16,
    /**
    * Sugar for all application levels.
    */
    ApplicationAll = 30,
    /**
    * Sugar for all levels
    */
    All = 31,
}

/**
* Global context placed on each VSSF web page (through json island data) which gives enough information for core TypeScript modules/controls on the page to operate
*/
export interface PageContext {
    /**
    * Configuration for reporting telemetry/usage data to App Insights
    */
    appInsightsConfiguration: AppInsightsConfiguration;
    /**
    * Core javascript and css references
    */
    coreReferences: CoreReferencesContext;
    /**
    * Specifies the prefixes for CSS modules that should map to the current service. e.g. "VSS/LoaderPlugins/Css!EMS:ExtensionManagement" would map to ExtensionManagement.css under the themed content path of this service if "EMS" is in the CSSModulePrefixes list.
    */
    cssModulePrefixes: string[];
    /**
    * Diagnostic related information for the current page
    */
    diagnostics: DiagnosticsContext;
    /**
    * Feature flag states to include by default in page data (avoids AJAX lookup)
    */
    featureAvailability: FeatureAvailabilityContext;
    /**
    * Globalization data for the current page based on the current user's settings
    */
    globalization: GlobalizationContext;
    /**
    * Cached set of hubs and hub groups for the given request/navigation-context
    */
    hubsContext: HubsContext;
    /**
    * Configuration needed for Microsoft.Ajax library
    */
    microsoftAjaxConfig: MicrosoftAjaxConfig;
    /**
    * The (AMD) module configuration
    */
    moduleLoaderConfig: ModuleLoaderConfiguration;
    /**
    * Current navigation context.
    */
    navigation: NavigationContext;
    /**
    * The service instance type id for the VSTS service serving this page
    */
    serviceInstanceId: string;
    serviceLocations: ServiceLocations;
    /**
    * Contains global time zone configuration information (e.g. which dates DST changes)
    */
    timeZonesConfiguration: TimeZonesConfiguration;
    /**
    * Web Access configuration
    */
    webAccessConfiguration: ConfigurationContext;
    /**
    * The web context information for the given page request
    */
    webContext: WebContext;
}

export interface PageContribution {
    id: string;
    includes: string[];
    properties: any;
    targets: string[];
    type: string;
}

export interface PageContributionProviderDetails {
    displayName: string;
    name: string;
    properties: { [key: string]: string; };
}

export interface PageXHRData {
    activityId: string;
    bundles: DynamicBundlesCollection;
    contributionsData: ContributionsPageData;
    dataProviderData: VSS_Contributions_Contracts.DataProviderResult;
    featureAvailability: FeatureAvailabilityContext;
    navigation: NavigationContext;
    performanceTimings: { [key: string]: any; };
    serviceLocations: ServiceLocations;
    staticContentVersion: string;
}

export interface PinningPreferences {
    pinnedHubGroupIds: string[];
    pinnedHubs: { [key: string]: string[]; };
    unpinnedHubGroupIds: string[];
    unpinnedHubs: { [key: string]: string[]; };
}

/**
* Holds a lookup of urls for different services (at different host levels)
*/
export interface ServiceLocations {
    locations: { [key: string]: { [key: number]: string; }; };
}

/**
* Reference to a CSS file to include on a page
*/
export interface StylesheetReference {
    /**
    * Url of the high-contrast version of the CSS file
    */
    highContrastUrl: string;
    /**
    * Is this a core stylesheet that needs to be included in child frames
    */
    isCoreStylesheet: boolean;
    /**
    * Url of the CSS file
    */
    url: string;
}

export interface TeamContext {
    id: string;
    name: string;
}

/**
* Data contract to represent a given team foundation service host (account, collection, deployment)
*/
export interface TeamFoundationServiceHostModel {
    /**
    * Type of host (deployment, account, collection)
    */
    hostType: any;
    /**
    * Unique id of the host (collection id, account id, etc.)
    */
    instanceId: string;
    /**
    * Name of the host (collection name, account name, etc.)
    */
    name: string;
    /**
    * Path of the service host, relative to the root virtual directory (e.g. DefaultCollection)
    */
    relVDir: string;
    /**
    * Path of the service host relative to the web application root (e.g. /tfs/DefaultCollection)
    */
    vDir: string;
}

export interface TfsMailSettings {
    enabled: boolean;
}

/**
* Internal structure to describe IVssServiceHost
*/
export interface TfsServiceHostDescriptor {
    hostType: any;
    id: string;
    name: string;
    relVdir: string;
    vdir: string;
}

export interface TimeZonesConfiguration {
    daylightSavingsAdjustments: DaylightSavingsAdjustmentEntry[];
}

export interface UserContext {
    email: string;
    id: string;
    limitedAccess: boolean;
    name: string;
    subjectId: string;
    subjectType: string;
    uniqueName: string;
}

/**
* Context information for all web access requests
*/
export interface WebContext {
    account: HostContext;
    /**
    * Information about the Collection used in the current request (may be null)
    */
    collection: HostContext;
    /**
    * Information about the current request context's host
    */
    host: ExtendedHostContext;
    /**
    * Information about the project used in the current request (may be null)
    */
    project: ContextIdentifier;
    /**
    * Information about the team used in the current request (may be null)
    */
    team: TeamContext;
    /**
    * Information about the current user
    */
    user: UserContext;
}

/**
* Contextual data for web-page-related data providers about the originating (host/source) page
*/
export interface WebPageDataProviderPageSource {
    /**
    * List of paths contributed by the host which are available to 3rd party extension developers through VSS.SDK
    */
    contributionPaths: string[];
    /**
    * Diagnostics context (debug mode, activity id, etc.) of the source page
    */
    diagnostics: DiagnosticsContext;
    /**
    * Globalization context (theme, time zone, etc.) of the source page
    */
    globalization: WebPageGlobalizationContext;
    /**
    * The navigation context for the host page that is loading the data provider
    */
    navigation: NavigationContext;
    /**
    * The project context for the host page that is loading the data provider
    */
    project: ContextIdentifier;
    /**
    * Currently selected hubgroup id
    */
    selectedHubGroupId: string;
    /**
    * Currently selected hub id
    */
    selectedHubId: string;
    /**
    * The team context for the host page that is loading the data provider
    */
    team: ContextIdentifier;
    /**
    * The url of the host page that is loading the data provider
    */
    url: string;
}

/**
* Lightweight globalization context for web-page-related data providers
*/
export interface WebPageGlobalizationContext {
    /**
    * UI Culture of the host page
    */
    culture: string;
    /**
    * Theme of the host page
    */
    theme: string;
}

export var TypeInfo = {
    ContextHostType: {
        enumValues: {
            "unknown": 0,
            "deployment": 1,
            "application": 2,
            "organization": 2,
            "projectCollection": 4,
        }
    },
    ContributedServiceContext: {
        fields: <any>null
    },
    ContributionPath: {
        fields: <any>null
    },
    ContributionPathType: {
        enumValues: {
            "default": 0,
            "resource": 1,
            "thirdParty": 2,
        }
    },
    DaylightSavingsAdjustmentEntry: {
        fields: <any>null
    },
    ExtendedHostContext: {
        fields: <any>null
    },
    ModuleLoaderConfiguration: {
        fields: <any>null
    },
    NavigationContext: {
        fields: <any>null
    },
    NavigationContextLevels: {
        enumValues: {
            "none": 0,
            "deployment": 1,
            "application": 2,
            "collection": 4,
            "project": 8,
            "team": 16,
            "applicationAll": 30,
            "all": 31,
        }
    },
    PageContext: {
        fields: <any>null
    },
    PageXHRData: {
        fields: <any>null
    },
    ServiceLocations: {
        fields: <any>null
    },
    TimeZonesConfiguration: {
        fields: <any>null
    },
    WebContext: {
        fields: <any>null
    },
    WebPageDataProviderPageSource: {
        fields: <any>null
    }
}

TypeInfo.ContributedServiceContext.fields = {
    serviceLocations: {
        typeInfo: TypeInfo.ServiceLocations
    },
    moduleLoaderConfig: {
        typeInfo: TypeInfo.ModuleLoaderConfiguration
    }
}
TypeInfo.ContributionPath.fields = {
    pathType: {
        enumType: TypeInfo.ContributionPathType
    }
}
TypeInfo.DaylightSavingsAdjustmentEntry.fields = {
    start: {
        isDate: true
    }
}
TypeInfo.ExtendedHostContext.fields = {
    hostType: {
        enumType: TypeInfo.ContextHostType
    }
}
TypeInfo.ModuleLoaderConfiguration.fields = {
    contributionPaths: {
        isDictionary: true,
        dictionaryValueTypeInfo: TypeInfo.ContributionPath,
    }
}
TypeInfo.NavigationContext.fields = {
    topMostLevel: {
        enumType: TypeInfo.NavigationContextLevels
    }
}
TypeInfo.PageContext.fields = {
    webContext: {
        typeInfo: TypeInfo.WebContext
    },
    moduleLoaderConfig: {
        typeInfo: TypeInfo.ModuleLoaderConfiguration
    },
    timeZonesConfiguration: {
        typeInfo: TypeInfo.TimeZonesConfiguration
    },
    navigation: {
        typeInfo: TypeInfo.NavigationContext
    },
    serviceLocations: {
        typeInfo: TypeInfo.ServiceLocations
    }
}
TypeInfo.PageXHRData.fields = {
    navigation: {
        typeInfo: TypeInfo.NavigationContext
    },
    serviceLocations: {
        typeInfo: TypeInfo.ServiceLocations
    }
}
TypeInfo.ServiceLocations.fields = {
    locations: {
        isDictionary: true,
        dictionaryValueFieldInfo: {
            isDictionary: true,
            dictionaryKeyEnumType: TypeInfo.ContextHostType,
        }
    }
}
TypeInfo.TimeZonesConfiguration.fields = {
    daylightSavingsAdjustments: {
        isArray: true,
        typeInfo: TypeInfo.DaylightSavingsAdjustmentEntry
    }
}
TypeInfo.WebContext.fields = {
    host: {
        typeInfo: TypeInfo.ExtendedHostContext
    }
}
TypeInfo.WebPageDataProviderPageSource.fields = {
    navigation: {
        typeInfo: TypeInfo.NavigationContext
    }
}


