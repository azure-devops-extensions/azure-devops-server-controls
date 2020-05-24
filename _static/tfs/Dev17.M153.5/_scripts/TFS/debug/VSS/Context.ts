
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Q = require("q");
import Serialization = require("VSS/Serialization");

var defaultRawPageContext: any;
var defaultPageContext: Contracts_Platform.PageContext;
var cssPrefixMappings: IDictionaryStringTo<string>;
var pathsByInstanceType: IDictionaryStringTo<Contracts_Platform.ConfigurationContextPaths>;
var serviceTypesByModulePath: IDictionaryStringTo<string>;
var serviceRootUrls: IDictionaryStringTo<string>;
var contributionPathsByService: IDictionaryStringTo<string[]>;

/**
 * Parse out the web context information found in JSON island data in the given element.
 */
export function parseWebContext($element: JQuery): Contracts_Platform.WebContext {
    var rawData = $element.find("script.tfs-context").eq(0).html();
    if (rawData) {
        var rawWebContext = JSON.parse(rawData);
        return Serialization.ContractSerializer.deserialize(rawWebContext, Contracts_Platform.TypeInfo.WebContext, false);
    }
    else {
        return null;
    }
}

/**
 * Get the raw JSON of the global context of the current page.
 */
export function _getDefaultRawPageContext(): Contracts_Platform.PageContext {
    if (!defaultRawPageContext) {
        defaultRawPageContext = (<any>window).__vssPageContext;
    }
    return defaultRawPageContext;
}

/**
 * Get the default web context for the current page.
 */
export function getDefaultWebContext(): Contracts_Platform.WebContext {
    var pageContext = getPageContext();
    return pageContext ? pageContext.webContext : null;
}

/**
 * Get the global page context for the current page.
 */
export function getPageContext(): Contracts_Platform.PageContext {
    if (!defaultPageContext) {
        var rawContext = _getDefaultRawPageContext();
        if (rawContext) {
            defaultPageContext = Serialization.ContractSerializer.deserialize(rawContext, Contracts_Platform.TypeInfo.PageContext, true);
        }
    }
    return defaultPageContext;
}

/**
* Get the hub context information from the current page
*/
export function getHubsContext(): Contracts_Platform.HubsContext {
    throw "Please use HubsService from 'VSS/Navigation/HubsService' for hub and hubgroup APIs. Usage: 'VSS/Service'.getLocalService(HubsService)";
}

/**
* Get web access paths for the given service
*
* @param serviceInstanceTypeId The id of the service instance type
*/
export function getPathsForService(serviceInstanceTypeId: string): Contracts_Platform.ConfigurationContextPaths {
    var serviceKey = (serviceInstanceTypeId || "").toLowerCase();
    return getServicePathsMap()[serviceKey];
}

/**
 * Get the static content versions for each service currently known by the client.
 */
export function getStaticContentVersionsByService(): IDictionaryStringTo<string> {
    const versionsByService: IDictionaryStringTo<string> = {};
    const pathsMap = getServicePathsMap();
    for (let serviceInstanceTypeId in pathsMap) {
        versionsByService[serviceInstanceTypeId] = pathsMap[serviceInstanceTypeId].staticContentVersion;
    }
    return versionsByService;
}

function registerServicePaths(serviceInstanceTypeId: string, paths: Contracts_Platform.ConfigurationContextPaths) {
    var pathsMap = getServicePathsMap();
    if (paths && !pathsMap[serviceInstanceTypeId]) {
        pathsMap[serviceInstanceTypeId.toLowerCase()] = paths;
    }
}

function getServicePathsMap(): IDictionaryStringTo<Contracts_Platform.ConfigurationContextPaths> {
    if (!pathsByInstanceType) {
        pathsByInstanceType = {};

        var pageContext = getPageContext();
        if (pageContext.serviceInstanceId) {
            pathsByInstanceType[pageContext.serviceInstanceId.toLowerCase()] = pageContext.webAccessConfiguration.paths;
        }
    }
    return pathsByInstanceType;
}

/**
 * Get a lookup of service id to contribution paths that come from that service
 */
export function getContributionPathsForService(serviceInstanceTypeId: string): string[] {
    if (!contributionPathsByService) {
        contributionPathsByService = {};
    }
    var paths = contributionPathsByService[serviceInstanceTypeId];
    if (!paths) {
        paths = [];
        contributionPathsByService[serviceInstanceTypeId] = paths;
    }
    return paths;
}

/**
* Add CSS module mappings to be used by the CSS loader.
*
* @param modulePrefix CSS module prefix to map
* @param url The base static root url used for CSS files for the service that owns that prefix
*/
export function addCssModulePrefixMapping(modulePrefix: string, url: string) {
    var map = getCssModulePrefixMappings();
    if (!map[modulePrefix]) {
        map[modulePrefix] = url;
    }
}

/**
* Get the url for the given CSS module (e.g. VSS/LoaderPlugins/Css!Prefix:ModulePath)
*
* @param modulePrefix CSS module prefix
* @param cssModulePath CSS module name 
* @param theme The CSS theme (e.g. Default or HighContrast to use, defaults to the current theme if omitted)
* @returns The url to the themed css file
*/
export function getCssModuleUrl(modulePrefix: string, cssModulePath: string, theme?: string): string {

    var rootUri: string;
    var pageContext = getPageContext();

    if (modulePrefix) {
        rootUri = getCssModulePrefixMappings()[modulePrefix];
        if (!rootUri && pageContext.webAccessConfiguration.isHosted) {
            if (window.console) {
                console.warn(`No css url was mapped for css module prefix "${modulePrefix}". Requested module: "${modulePrefix}:${cssModulePath}".`);
            }
        }
    }

    if (!rootUri) {
        // Build the default root uri for use in extension iframes. If not iframed, use a relative path
        if (window.top !== window.self) {
            // This is an extension loaded in an iframe. Use absolute URL
            var host = pageContext.webContext.host;
            rootUri = `${host.scheme}://${host.authority}`;
        }
        else {
            // Use a relative url for the parent frame
            rootUri = "";
        }

        // Add the relative path to the static root
        rootUri = _combinePaths(rootUri, pageContext.webAccessConfiguration.paths.staticRootTfs);
    }

    if (!theme) {
        theme = getActiveTheme();
    }

    return _combinePaths(rootUri, `App_Themes/${theme}/${cssModulePath}.css`);
}

/**
 * Because we (try to) automatically detect high contrast mode, the actual theme we're using
 * doesn't always match the theme in pageContext.globalization.theme.
 */
export function getActiveTheme(): string {
    const pageContext = getPageContext();

    if (isHighContrastMode()) {
        return "HighContrast";
    } else if (pageContext.globalization) {
        return pageContext.globalization.theme;
    }

    return "Default";
}

/**
 * Get the root url for the specified service if the service has contributed to
 * the page's configuration context
 *
 * @param serviceInstanceTypeId The id of the service instance type
 */
export function getContributedServiceRootUrl(serviceInstanceTypeId: string): string {
    var serviceKey = (serviceInstanceTypeId || "").toLowerCase();
    return getServiceRootUrls()[serviceKey];
}

function getServiceRootUrls(): IDictionaryStringTo<string> {
    if (!serviceRootUrls) {
        serviceRootUrls = {};

        var pageContext = getPageContext();
        if (pageContext.serviceInstanceId) {
            var pageRootUri = pageContext.webContext.account ? pageContext.webContext.account.uri : pageContext.webContext.host.uri;
            serviceRootUrls[pageContext.serviceInstanceId.toLowerCase()] = pageRootUri;
        }
    }
    return serviceRootUrls;
}

/**
 * Is the current window/frame an extension iframe (not the parent frame and has the VSS.SDK loaded)
 */
export function isExtensionFrame(): boolean {
    return window.top !== window.self && !!((<any>window).VSS && (<any>window).VSS.VssSDKVersion);
}

/**
 * Get the service instace type id of the service that owns the
 * given script module.
 *
 * Returns undefined if the owner is not known.
 * Returns empty string for TFS-owned scripts on-prem.
 *
 * @param module The script module to check (e.g. "VSS/Context")
 */
export function getScriptModuleOwner(module: string): string {

    var owner: string;
    var lookup = getServiceTypesByModulePathLookup();
    var moduleParts = module.split("/");

    while (moduleParts.length > 0) {
        owner = lookup[moduleParts.join("/")];
        if (typeof owner !== "undefined") {
            break;
        }
        moduleParts.pop();
    }


    if (typeof owner === "undefined") {
        if (!isExtensionFrame()) {
            // If we're not an extension frame, then the service hosting the page "owns" the module
            return getPageContext().serviceInstanceId || "";
        }
    }

    return owner;
}

function getServiceTypesByModulePathLookup() {
    if (!serviceTypesByModulePath) {
        serviceTypesByModulePath = {};
        var pageContext = getPageContext();
        if (pageContext.moduleLoaderConfig) {
            addModulePathOwners(serviceTypesByModulePath, pageContext.moduleLoaderConfig, pageContext.serviceInstanceId || "");
        }
    }
    return serviceTypesByModulePath;
}

function addModulePathOwners(lookup: IDictionaryStringTo<string>, loaderConfig: Contracts_Platform.ModuleLoaderConfiguration, serviceInstanceId: string) {
    if (loaderConfig.contributionPaths) {
        $.each(loaderConfig && loaderConfig.contributionPaths, (path) => {
            if (!lookup[path]) {
                lookup[path] = serviceInstanceId;
            }
        });
    }
    if (loaderConfig.paths) {
        $.each(loaderConfig && loaderConfig.paths, (path) => {
            if (!lookup[path]) {
                lookup[path] = serviceInstanceId;
            }
        });
    }
}

var highContrastMode = null;

/**
 * For IE and Edge we can automatically detect HC mode.
 */
export function isAutoHighContrastMode(): boolean {
    // If IE is in high contrast mode, it won't let us change the color of an element.
    let isAutoHighContrast = false;
    const probe = document.createElement("span");
    probe.style.color = "#123456";
    document.body.appendChild(probe);
    const style = getComputedStyle(probe);

    // style is null on Firefox if iframe is invisible (display: none applied on either iframe or one of the parents)
    if (style && style.color.replace(/ /g, "") !== "rgb(18,52,86)"
        && /^rgb\(\d+,\s?\d+,\s?\d+\)$/.test(style.color)) {
        isAutoHighContrast = true;
    }

    probe.parentNode.removeChild(probe); // can't use probe.remove() because IE
    return isAutoHighContrast;
}

export function isHighContrastMode(): boolean {
    highContrastMode = highContrastMode === null ? isAutoHighContrastMode() : highContrastMode;
    return highContrastMode;
}

function getCssModulePrefixMappings(): IDictionaryStringTo<string> {
    if (!cssPrefixMappings) {
        cssPrefixMappings = {};
        var pageContext = getPageContext();
        if (pageContext.cssModulePrefixes) {
            $.each(pageContext.cssModulePrefixes, (i, prefix) => {
                addCssModulePrefixMapping(prefix, pageContext.webAccessConfiguration.paths.staticRootTfs);
            });
        }
    }
    return cssPrefixMappings;
}

export class ContributedServicePathBuilder {
    private appPathParts: string[];
    private serviceRootUrl: string;

    private pathCombiner: (path1: string, path2: string) => string;

    /**
     * Context path builder for contributed services.
     * 
     * @param serviceRootUrl Root URL of the contributed service.
     * @param pathCombiner Utility to combine two paths.
     */
    constructor(serviceRootUrl: string, pathCombiner: (path1: string, path2: string) => string = null) {

        this.appPathParts = [];
        this.serviceRootUrl = serviceRootUrl;
        this.pathCombiner = pathCombiner;

        // Try to figure out whether the service root has app path like /ege/ in https://codedev.ms/ege/
        if (serviceRootUrl) {
            const schemeIndex = serviceRootUrl.indexOf(":");
            if (schemeIndex > 0) {
                let uri = serviceRootUrl.substr(schemeIndex + 1);
                if (uri.substr(0, 2) === "//") {
                    uri = uri.substr(2);
                    const appPathIndex = uri.indexOf("/");
                    if (appPathIndex > 0) {
                        this.appPathParts = uri.substr(appPathIndex).split("/").filter(p => !!p).map(p => "/" + p);
                    }
                }
            }
        }
    }

    /**
     * Get the root URL of the contributed service.
     */
    public getServiceRootUrl(): string {
        return this.serviceRootUrl;
    }

    /**
     * Combines the given relative path to the service root URL. If relative path already starts with app path, 
     * app path is omitted to prevent it to recur.
     * 
     * @param relativePath path to combine contributed service root URL.
     */
    public combinePath(relativePath: string): string {
        if (relativePath) {
            for (let part of this.appPathParts) {
                const lowerPart = part.toLowerCase();
                const lowerRelativePart = relativePath.substr(0, part.length).toLowerCase();
                if (lowerPart === lowerRelativePart) {
                    relativePath = relativePath.substr(part.length);
                }
            }
        }

        const pathCombiner = this.pathCombiner || _combinePaths;
        return pathCombiner.call(this, this.serviceRootUrl, relativePath);
    }
}

/**
* Process the contributed configuration from a particular service
*
* @param context The contributed service context to evaluate
*/
export function processContributedServiceContext(context: Contracts_Platform.ContributedServiceContext): IPromise<any> {

    var pageContext = getPageContext();
    var serviceRootUrl = context.serviceRootUrl;
    
    if (!pageContext.webAccessConfiguration.isHosted) {
        // On-prem, all services share the same root url. Use relative paths.
        serviceRootUrl = "";
    }
    else if (context.serviceTypeId) {
        getServiceRootUrls()[context.serviceTypeId.toLowerCase()] = serviceRootUrl;
    }

    const contributedServicePath = new ContributedServicePathBuilder(serviceRootUrl, _combinePaths);

    // Merge AMD/requireJS configuration
    if (context.moduleLoaderConfig) {
        addModulePathOwners(getServiceTypesByModulePathLookup(), context.moduleLoaderConfig, context.serviceTypeId || "");
        _mergeModuleLoaderConfig(
            pageContext,
            context.moduleLoaderConfig,
            contributedServicePath,
            context.serviceTypeId);
    }

    // Merge feature flags and service locations
    addFeatureAvailability(context.featureAvailability);
    addServiceLocations(context.serviceLocations);

    if (context.cssModulePrefixes && context.paths) {
        _processModulePrefixes(context.cssModulePrefixes, contributedServicePath.combinePath(context.paths.staticRootTfs));
    }

    if (context.paths && context.serviceTypeId) {
        registerServicePaths(context.serviceTypeId, context.paths);
    }

    var deferred = Q.defer();

    if (context.bundles) {
        require(["VSS/Bundling"], (VSS_Bundling) => {
            VSS_Bundling.injectBundles(context.bundles, contributedServicePath).then(deferred.resolve);
        });
    }
    else {
        deferred.resolve(null);
    }

    return deferred.promise;
}

/**
 * Add feature availability data to the current page context
 *
 * @param featureAvailability Feature availability data to merge-in to the current page context's feature data
 */
export function addFeatureAvailability(featureAvailability: Contracts_Platform.FeatureAvailabilityContext) {
    if (featureAvailability && featureAvailability.featureStates) {
        const pageContext = getPageContext();
        if (pageContext.featureAvailability && pageContext.featureAvailability.featureStates) {
            pageContext.featureAvailability.featureStates = $.extend(featureAvailability.featureStates, pageContext.featureAvailability.featureStates);
        }
        else {
            pageContext.featureAvailability = featureAvailability;
        }
    }
}

/**
 * Add to the current page context's list of cached service locations
 *
 * @param serviceLocations Service location data to merge into to the current page context's data
 */
export function addServiceLocations(serviceLocations: Contracts_Platform.ServiceLocations) {
    if (serviceLocations && serviceLocations.locations) {

        const pageContext = getPageContext();

        var servicesLookup = pageContext.serviceLocations;
        if (!pageContext.serviceLocations) {
            servicesLookup = <any>{};
            pageContext.serviceLocations = servicesLookup;
        }

        $.each(serviceLocations.locations, (serviceId, urlByHostType) => {
            if (!servicesLookup.locations[serviceId]) {
                servicesLookup.locations[serviceId] = urlByHostType;
            }
            else {
                $.each(urlByHostType, function (hostType, url) {
                    if (!servicesLookup.locations[serviceId][hostType]) {
                        servicesLookup.locations[serviceId][hostType] = url;
                    }
                });
            }
        });
    }
}

function _processModulePrefixes(modulePrefixes: string[], staticRootUrl: string) {
    // The module mappings are used by the Css loader
    $.each(modulePrefixes, (i, modulePrefix) => {
        addCssModulePrefixMapping(modulePrefix, staticRootUrl);
    });
}

function _mergeModuleLoaderConfig(
    pageContext: Contracts_Platform.PageContext,
    moduleLoaderConfig: Contracts_Platform.ModuleLoaderConfiguration,
    contributedServicePath: ContributedServicePathBuilder,
    serviceInstanceTypeId: string) {

    // Update the loader configuration by merging-in paths from the contribution
    var hasConfigUpdates = false;
    var configBaseUrl = pageContext.moduleLoaderConfig.baseUrl;
    var hostUrl = pageContext.webContext.account ? pageContext.webContext.account.uri : pageContext.webContext.host.uri;

    var moduleConfigUpdates = <Contracts_Platform.ModuleLoaderConfiguration>{
        paths: {}
    };

    var currentLoaderConfig: Contracts_Platform.ModuleLoaderConfiguration;
    if (window.self === window.top) {
        currentLoaderConfig = pageContext.moduleLoaderConfig || <any>{};
    }
    else {
        currentLoaderConfig = (<any>window).__vssModuleLoaderConfig || <any>{};
    }

    if (!currentLoaderConfig.paths) {
        currentLoaderConfig.paths = {};
    }
    if (!currentLoaderConfig.contributionPaths) {
        currentLoaderConfig.contributionPaths = {};
    }
    if (!currentLoaderConfig.shim) {
        currentLoaderConfig.shim = {};
    }

    // Start with the base url root
    let extensionBaseUrl: string = null;
    if (pageContext.webAccessConfiguration.isHosted) {

        extensionBaseUrl = moduleLoaderConfig.baseUrl || "/";

        if (extensionBaseUrl !== configBaseUrl || hostUrl !== contributedServicePath.getServiceRootUrl() || window.top !== window.self) {
            // Make sure paths are absolute and point to the contribution's service
            extensionBaseUrl = contributedServicePath.combinePath(extensionBaseUrl);
        }
    }

    if (moduleLoaderConfig.paths) {
        $.each(moduleLoaderConfig.paths, (key: string, pathValue: string) => {
            if (_ensureModulePath(currentLoaderConfig, key, pathValue, moduleConfigUpdates, extensionBaseUrl, contributedServicePath)) {
                hasConfigUpdates = true;
            }
        });
    }

    if (moduleLoaderConfig.contributionPaths) {
        $.each(moduleLoaderConfig.contributionPaths, (key: string, contributionPath: Contracts_Platform.ContributionPath) => {
            if (_ensureContributionPath(currentLoaderConfig, key, contributionPath.value, moduleConfigUpdates, extensionBaseUrl, contributedServicePath, serviceInstanceTypeId)) {
                hasConfigUpdates = true;
            }
        });
    }

    if (moduleLoaderConfig.shim) {
        moduleConfigUpdates.shim = {};
        $.each(moduleLoaderConfig.shim, (key: string, value: any) => {
            if (!currentLoaderConfig.shim[key]) {
                moduleConfigUpdates.shim[key] = value;
                currentLoaderConfig.shim[key] = value;
                hasConfigUpdates = true;
            }
        });
    }

    if (hasConfigUpdates) {
        (<any>window).require.config(moduleConfigUpdates);
    }
}

function _combinePaths(path1: string, path2: string): string {
    var result = path1 || "";
    if (result[result.length - 1] !== "/") {
        result += "/";
    }
    if (path2) {

        if (path2.match("^https?://")) {
            // path2 is an absolute url. Don't prefix with the root path.
            return path2;
        }

        if (path2[0] === "/") {
            result += path2.substr(1);
        }
        else {
            result += path2;
        }
    }
    return result;
}

function _preparePathValue(
    value: string,
    extensionBaseUrl: string,
    contributedServicePath: ContributedServicePathBuilder): string {

    if (extensionBaseUrl && !value.match("^https?://")) {
        if (value[0] === "/") {
            // Value may be a static folder like /_static/* or /{account}/_static/*. 
            // We need to let service path make the combination.
            return contributedServicePath.combinePath(value);
        }

        // This is the case were value is a script area like ReleasePipeline/Scripts/* rather than
        // a path to static folder. So, a direct combine is sufficient.
        return _combinePaths(extensionBaseUrl, value);
    }

    return value;
}

function _ensureModulePath(
    currentLoaderConfig: Contracts_Platform.ModuleLoaderConfiguration,
    key: string,
    pathValue: string,
    moduleConfigUpdates: Contracts_Platform.ModuleLoaderConfiguration,
    extensionBaseUrl: string,
    contributedServicePath: ContributedServicePathBuilder): boolean {

    // Only add the path mapping if it was not already added (e.g. by another service)
    if (!currentLoaderConfig.paths[key] && !currentLoaderConfig.contributionPaths[key]) {
        var value = _preparePathValue(pathValue, extensionBaseUrl, contributedServicePath);
        moduleConfigUpdates.paths[key] = value;
        currentLoaderConfig.paths[key] = value;

        return true;
    }

    return false;
}

function _ensureContributionPath(
    currentLoaderConfig: Contracts_Platform.ModuleLoaderConfiguration,
    key: string,
    pathValue: string,
    moduleConfigUpdates: Contracts_Platform.ModuleLoaderConfiguration,
    extensionBaseUrl: string,
    contributedServicePath: ContributedServicePathBuilder,
    serviceInstanceTypeId: string): boolean {

    // Only add the contributed path mapping if it was not already added (e.g. by another service)
    if (!currentLoaderConfig.contributionPaths[key]) {
        var value = _preparePathValue(pathValue, extensionBaseUrl, contributedServicePath);

        // We don't have to update the require on this frame with this change.
        // This will be used by VSS.SDK for the iframed extension.
        currentLoaderConfig.contributionPaths[key] = {
            pathType: null, // This really doesn't matter on the client
            value: value
        };

        // Store this contributed path by service instance type id
        if (serviceInstanceTypeId) {
            getContributionPathsForService(serviceInstanceTypeId).push(key);
        }

        // Also add this contributed path if not already added since it might probably be used by 1st party extension as well
        if (!currentLoaderConfig.paths[key]) {
            moduleConfigUpdates.paths[key] = value;
            currentLoaderConfig.paths[key] = value;
            return true;
        }
    }

    return false;
}