/// <reference path='../VSS/References/SDK.Interfaces.d.ts' />
/// <reference types="q" />
/// <reference types="requirejs" />

import Ajax = require("VSS/Ajax");
import Context = require("VSS/Context");
import Constants_Platform = require("VSS/Common/Constants/Platform");
import Core = require("VSS/Utils/Core");
import CSS_Plugin = require("VSS/LoaderPlugins/Css");
import Diag = require("VSS/Diag");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Q = require("q");
import Utils_Array = require("VSS/Utils/Array");
import Utils_File = require("VSS/Utils/File");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");
import Serialization = require("VSS/Serialization");
import VSS = require("VSS/VSS");

export module DiagnoseUtils {
    export function isDiagnosing(): boolean {
        return Context.getPageContext().diagnostics.diagnoseBundles === true;
    }

    export function markUrlForDiagnose(url: string): string {
        return Utils_Url.replaceUrlParam(url, "diagnose-bundles", "1");
    }
}

module BundleNames {
    export var CommonScript = "common";
    export var AreaScript = "area";
    export var ViewScript = "view";

    export var CommonCss = "commoncss";
    export var AreaCss = "areacss";
    export var ViewCss = "viewcss";

    export function getBundlesToExclude(excludeOptions: VSS.DynamicModuleExcludeOptions, css: boolean = false): string[] {
        let excludes: string[] = [];
        if (excludeOptions >= VSS.DynamicModuleExcludeOptions.CommonModules) {
            excludes.push(css ? CommonCss : CommonScript);
        }

        if (excludeOptions >= VSS.DynamicModuleExcludeOptions.CommonAndAreaModules) {
            excludes.push(css ? AreaCss : AreaScript);
        }

        if (excludeOptions >= VSS.DynamicModuleExcludeOptions.AllPageBundles) {
            excludes.push(css ? ViewCss : ViewScript);
        }

        return excludes;
    }
}

interface IUsingStatement {
    moduleNames: string[];
    completed: IResultCallback;
    failed: IErrorCallback;
    loadOptions?: VSS.IModuleLoadOptions;
}

interface IDynamicBundleRequest {
    initialUsings: IUsingStatement[];
    pendingUsings: IUsingStatement[];
}

var bundledScriptIncludes: IDictionaryStringTo<string[]>;
var bundledCssIncludes: IDictionaryStringTo<string[]>;

var pendingUsingStatements: IUsingStatement[] = [];
var dynamicBundleRequests: IDictionaryStringTo<IDynamicBundleRequest> = {};

var bundledScriptSize: number = 0;
var bundledCssSize: number = 0;
var bundledScriptSizeById: IDictionaryStringTo<number> = {};
var bundledCssSizeById: IDictionaryStringTo<number> = {};
const integrityById: IDictionaryStringTo<string> = {};

// register handler with requirejs to try to add integrity attribute to script tags it adds
(<Require>(<any>window).require).config({
    onNodeCreated: (node, config, moduleName, url) => {
        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.SubresourceIntegrity, false)) {
            const integrity = integrityById[url];
            if (integrity) {
                node.setAttribute("integrity", integrity);
                node.setAttribute("crossorigin", "anonymous"); // there's no reason we couldn't set this on every script tag
            }
            else {
                Diag.logInfo(`Did not find integrity attribute for ${moduleName}`);
            }
        }
    }
});

interface ILegacyContent {
    clientId: string;
    contentType: string;
    url: string;
    bundle: {
        name: string;
        length: number;
        includes: string[];
    }
}

class LegacyBundleData {
    private bundleData: ILegacyContent[];
    private scriptsConsumed = false;
    private styleSheetsConsumed = false;

    constructor() {
        this.bundleData = Serialization.deserializeJsonIsland($(".vss-bundle-data"), null) as ILegacyContent[];
        this.registerLoadedCss();
    }

    private getBundleData(contentType: string): ILegacyContent[] {
        if (this.bundleData) {
            return this.bundleData.filter(c => c.contentType === contentType);
        }

        return [];
    }

    private disposeBundleData(): void {
        if (this.styleSheetsConsumed && this.scriptsConsumed) {
            this.bundleData = null;
        }
    }

    private registerLoadedCss() {
        for (const cssBundle of this.getBundleData("text/css")) {
            if (cssBundle.bundle.includes) {
                for (let includedCss of cssBundle.bundle.includes) {
                    CSS_Plugin.registerLoadedCss(includedCss);
                }
            }
        }
    }

    public getBundledScripts(): ILegacyContent[] {
        const bundledScripts = this.getBundleData("text/javascript");
        this.scriptsConsumed = true;
        this.disposeBundleData();

        return bundledScripts;
    }

    public getBundledStyleSheets(): ILegacyContent[] {
        const bundledStyleScheets = this.getBundleData("text/css");
        this.styleSheetsConsumed = true;
        this.disposeBundleData();

        return bundledStyleScheets;
    }
}

const legacyBundleData = new LegacyBundleData();

function ensureBundledScriptIncludes(): void {
    if (!bundledScriptIncludes) {
        bundledScriptIncludes = {};

        var scriptTags = document.getElementsByTagName('script');
        for (var i = 0, len = scriptTags.length; i < len; i++) {
            const scriptTag = scriptTags[i];
            var bundledScriptsAttr = scriptTag.getAttribute('data-includedscripts');
            if (bundledScriptsAttr) {
                var includes = bundledScriptsAttr.split(';');
                var bundleNameAttr = scriptTag.getAttribute('data-bundlename');
                if (bundleNameAttr) {
                    bundledScriptIncludes[bundleNameAttr] = includes;
                }
            }

            var bundleLengthAttr = scriptTag.getAttribute('data-bundlelength');
            if (bundleLengthAttr) {
                var size = parseInt(bundleLengthAttr);
                bundledScriptSize += size;
                bundledScriptSizeById[scriptTag.getAttribute("src")] = size;
            }
        }

        for (const scriptBundle of legacyBundleData.getBundledScripts()) {
            if (scriptBundle.bundle.includes) {
                bundledScriptIncludes[scriptBundle.bundle.name] = scriptBundle.bundle.includes;
            }
            if (scriptBundle.bundle.length) {
                bundledScriptSize += scriptBundle.bundle.length;
                bundledScriptSizeById[scriptBundle.clientId || scriptBundle.url] = scriptBundle.bundle.length;
            }
        }
    }
}

function isModuleOwnedByService(module: string, serviceInstanceId: string): boolean {
    if (serviceInstanceId === "") {
        // Onprem, return true
        return true;
    }

    const owner = Context.getScriptModuleOwner(module);
    if (!owner) {
        return false;
    }

    return Utils_String.equals(owner, serviceInstanceId, true);
}

function getBundledScriptIncludes(bundleName: string, serviceInstanceId: string): string[] {
    ensureBundledScriptIncludes();
    // Include the scripts from the specified service instance only
    return (bundledScriptIncludes[bundleName] || []).filter(m => isModuleOwnedByService(m, serviceInstanceId));
}

function ensureBundledCssIncludes(): void {
    if (!bundledCssIncludes) {
        bundledCssIncludes = {};

        var linkTags = document.getElementsByTagName('link');
        for (var i = 0, len = linkTags.length; i < len; i++) {
            const linkTag = linkTags[i];
            var bundledStylesAttr = linkTag.getAttribute('data-includedstyles');
            if (bundledStylesAttr) {
                var includes = bundledStylesAttr.split(';');
                var bundleNameAttr = linkTag.getAttribute('data-bundlename');
                if (bundleNameAttr) {
                    bundledCssIncludes[bundleNameAttr] = includes;
                }
            }

            var bundleLengthAttr = linkTag.getAttribute('data-bundlelength');
            if (bundleLengthAttr) {
                var size = parseInt(bundleLengthAttr);
                bundledCssSize += size;
                bundledCssSizeById[linkTag.getAttribute('href')] = size;
            }
        }

        for (const cssBundle of legacyBundleData.getBundledStyleSheets()) {
            if (cssBundle.bundle.includes) {
                bundledCssIncludes[cssBundle.bundle.name] = cssBundle.bundle.includes;
            }
            if (cssBundle.bundle.length) {
                bundledCssSize += cssBundle.bundle.length;
                bundledCssSizeById[cssBundle.clientId || cssBundle.url] = cssBundle.bundle.length;
            }
        }
    }
}

function getBundledCssIncludes(bundleName: string): string[] {
    ensureBundledCssIncludes();
    return bundledCssIncludes[bundleName] || [];
}

function addBundledScriptContentSize(bundleId: string, contentLength: number) {
    ensureBundledScriptIncludes();
    if (contentLength) {
        bundledScriptSize += contentLength;
        bundledScriptSizeById[bundleId] = contentLength;
    }
}

function isScriptBundleAlreadyReferenced(bundleId: string): boolean {
    ensureBundledScriptIncludes();

    var hasMatch = false;
    $.each(bundledScriptSizeById, (id: string) => {
        if (Utils_String.equals(bundleId, id, true)) {
            hasMatch = true;
            return false;
        }
    });

    return hasMatch;
}

/**
 * Gets the content length (in bytes) of all Javascript bundles included on the page
 */
export function getBundledScriptContentSize(): number {
    ensureBundledScriptIncludes();
    return bundledScriptSize;
}

function addBundledCssContentSize(bundleUrl: string, contentLength: number) {
    ensureBundledCssIncludes();
    if (contentLength) {
        bundledCssSize += contentLength;
        bundledCssSizeById[bundleUrl] = contentLength;
    }
}

/**
 * Gets the content length (in bytes) of all CSS bundles included on the page
 */
export function getBundledCssContentSize(): number {
    ensureBundledCssIncludes();
    return bundledCssSize;
}

/**
 * Get the size (in bytes) of a bundle given its url
 *
 * @param bundleUrl Url of the script or CSS bundle
 */
export function getBundleSize(bundleUrl: string): number {
    ensureBundledScriptIncludes();
    ensureBundledCssIncludes();
    return bundledScriptSizeById[bundleUrl] || bundledCssSizeById[bundleUrl];
}


function compressDirName(path1: string, path2: string): string {
    let parts1 = Utils_File.getPathParts(path1);
    let parts1Len = parts1.length;
    let parts2 = Utils_File.getPathParts(path2);
    let parts2Len = parts2.length;

    let ind: number;
    for (ind = 0; ind < parts1Len; ind++) {
        let p1 = parts1[ind];
        let p2 = parts2[ind];
        if (Utils_String.ignoreCaseComparer(p1, p2) !== 0) {
            break;
        }
    }

    if (ind > 0) {
        let prefix = ind === parts1Len ? "*" : parts1.slice(0, ind).map(p => "-").join("");
        return parts2Len > ind ? `${prefix}${parts2.slice(ind).join("/")}/` : prefix;
    }
    else {
        return `${path2}/`;
    }
}

/**
 * Compresses the specified paths by replacing recurring directory names with '*' character.
 *
 * @param paths List of files to compress.
 * @returns {string[]}
 */
export function compressPaths(paths: string[]): string[] {
    let compressedPaths: string[] = [];

    // Make sure, excluded path does not start with '/' or is not absolute URL
    paths = (paths || []).filter((path: string) => {
        return path.charAt(0) !== '/' && !Utils_Url.isAbsoluteUrl(path);
    });

    // Ensure paths and sort
    paths.sort((p1: string, p2: string) => {
        let d1 = Utils_File.getDirectoryName(p1);
        let d2 = Utils_File.getDirectoryName(p2);

        let result = Utils_String.ignoreCaseComparer(d1, d2);
        if (result === 0) {
            return Utils_String.ignoreCaseComparer(p1, p2);
        }

        return result;
    });

    let dirName: string = null;
    for (let p of paths) {
        let pathDirName = Utils_File.getDirectoryName(p);
        if (pathDirName && dirName) {
            compressedPaths.push(`${compressDirName(dirName, pathDirName)}${Utils_File.getFileName(p)}`);
        } else {
            compressedPaths.push(p);
        }

        dirName = pathDirName;
    }

    return compressedPaths;
}

function pathsToRequestParam(paths: string[], compress: boolean): string {
    if (paths && paths.length > 0) {
        if (compress) {
            paths = compressPaths(paths);
        }

        return encodeURIComponent(paths.join(";"));
    }

    return null;
}

export interface IDynamicBundleRequestLocation {
    url?: string;
    contributedServicePath?: Context.ContributedServicePathBuilder;
}

export function getDynamicBundleRequestLocation(scripts: string[], serviceInstanceId: string, excludeOptions: VSS.DynamicModuleExcludeOptions): IDynamicBundleRequestLocation {
    var pageContext = Context.getPageContext();
    var rootPath = pageContext.webAccessConfiguration.paths.staticContentRootPath || "/";
    var staticContentVersion = pageContext.webAccessConfiguration.paths.staticContentVersion || "";
    var excludedPaths: string[] = [];

    let location: IDynamicBundleRequestLocation = {};

    if (serviceInstanceId && (!Utils_String.equals(serviceInstanceId, pageContext.serviceInstanceId, true) || Context.isExtensionFrame())) {
        var servicePaths = Context.getPathsForService(serviceInstanceId);
        if (servicePaths) {
            staticContentVersion = servicePaths.staticContentVersion;

            if (!staticContentVersion) {
                // We're talking to an older service that doesn't support async bundles yet
                return location;
            }

            const serviceRootUrl = Context.getContributedServiceRootUrl(serviceInstanceId);
            location.contributedServicePath = new Context.ContributedServicePathBuilder(serviceRootUrl, Utils_Url.combineUrl);
            rootPath = Utils_Url.combineUrl(serviceRootUrl, servicePaths.rootPath);
        }

        if (!Context.isExtensionFrame()) {
            var contributionPathsForService = Context.getContributionPathsForService(serviceInstanceId);
            excludedPaths = Object.keys(pageContext.moduleLoaderConfig.contributionPaths || {}).filter((contributionPath) => {
                return contributionPathsForService.indexOf(contributionPath) < 0;
            });
        }
    }

    // Compress paths if calling the same service since other services might not have the ability to decompress paths yet.
    let compress = !Utils_Url.isAbsoluteUrl(rootPath);

    // Request the missing bundles (with their dependencies, recursively)
    const scriptsParam = pathsToRequestParam(scripts, compress);
    if (scriptsParam) {
        location.url = rootPath + "_public/_Bundling/DynamicBundles?scripts=" + scriptsParam;
        location.url += "&v=" + encodeURIComponent(staticContentVersion) + (pageContext.diagnostics.debugMode ? "&debug=1" : "");

        if ((window as any).LWL) {
            location.url += "&lwp=true";
        }

        if (excludedPaths.length > 0) {
            location.url += "&excludePaths=" + encodeURIComponent(excludedPaths.join(";"));
        }

        // The server doesn't use the following parameters, but we add them as cache-busting parameters. This way
        // theme or language changes result in different urls
        location.url += "&theme=" + Context.getActiveTheme();
        location.url += "&loc=" + encodeURIComponent(pageContext.globalization.culture);

        if (DiagnoseUtils.isDiagnosing()) {
            location.url = DiagnoseUtils.markUrlForDiagnose(location.url);
        }

        Diag.Debug.logInfo(`Bundling::issueDynamicBundleRequest: scripts: ${scripts.join(",")}.`);

        if (excludeOptions !== VSS.DynamicModuleExcludeOptions.NoExcludes) {
            // Add excluded paths for scripts first
            location.url = appendExcludedPaths(
                location.url,
                BundleNames.getBundlesToExclude(excludeOptions),
                bundle => getBundledScriptIncludes(bundle, serviceInstanceId),
                compress,
                "exclude");

            // Add excluded paths for css next
            location.url = appendExcludedPaths(
                location.url,
                BundleNames.getBundlesToExclude(excludeOptions, true),
                bundle => getBundledCssIncludes(bundle),
                compress,
                "excludeCss");
        }
    }
    else {
        // No scripts exist
        location.url = null;
    }

    return location;
}

function issueDynamicBundleRequest(scripts: string[], serviceInstanceId: string, excludeOptions: VSS.DynamicModuleExcludeOptions): IPromise<DynamicBundlesCollection> {

    let dynamicBundleLocation = getDynamicBundleRequestLocation(scripts, serviceInstanceId, excludeOptions);

    if (!dynamicBundleLocation.url) {
        return Q.resolve(null);
    }

    return Ajax.issueRequest(dynamicBundleLocation.url, { type: "GET", data: "json" })
        .then((bundle: DynamicBundlesCollection) => {
            if (dynamicBundleLocation.contributedServicePath) {
                if (bundle.scripts) {
                    bundle.scripts.forEach((script) => {
                        script.uri = dynamicBundleLocation.contributedServicePath.combinePath(script.uri);
                    });
                }
                if (bundle.styles) {
                    bundle.styles.forEach((style) => {
                        style.uri = dynamicBundleLocation.contributedServicePath.combinePath(style.uri);
                        style.fallbackThemeUri = dynamicBundleLocation.contributedServicePath.combinePath(style.fallbackThemeUri);
                    });
                }
            }

            return bundle;
        });
}

function appendExcludedPaths(
    path: string,
    bundlesToExlude: string[],
    excludePathsExtractor: (bundle: string) => string[],
    compress: boolean,
    paramName: string): string {

    let excludesPathParam = `&${paramName}=`;
    let excludes: string[] = [];
    let excludesToTest: string[] = [];

    for (let bundle of bundlesToExlude) {
        // Extract paths to exclude using the bundle
        let bundleExcludes = excludePathsExtractor(bundle);

        // Add bundle excludes to the test list first
        excludesToTest.push.apply(excludesToTest, bundleExcludes);

        // Check whether path limit is hit or not
        if (isRequestLimitHit(excludesToTest, compress, path, excludesPathParam)) {
            break;
        }

        // Add bundle excludes to the actual list to be added to the path 
        // since the excluded paths for this bundle will not exceed path limit
        excludes.push.apply(excludes, bundleExcludes);
    }

    Diag.Debug.logInfo(`Bundling::issueDynamicBundleRequest: ${paramName}: ${excludes.join(",")}.`);

    // Add all excludes to the path
    var excludesRequestParam = pathsToRequestParam(excludes, compress);
    if (excludesRequestParam) {
        path += excludesPathParam + excludesRequestParam;
    }

    return path;
}

function isRequestLimitHit(paths: string[], compress: boolean, ...additionalPaths: string[]): boolean {
    let pathsToTest = pathsToRequestParam(paths, compress) || "";
    let pathLength = pathsToTest.length;
    for (let p of additionalPaths) {
        pathLength += (p ? p.length : 0);
    }

    return pathLength > Utils_Url.MAX_URL_PATH_LENGTH;
}

function issueDynamicBundleRequests(scripts: string[], excludeOptions: VSS.DynamicModuleExcludeOptions): IPromise<DynamicBundlesCollection> {

    var pageContext = Context.getPageContext();

    // Group the scripts by the service that owns them
    var scriptsByService: IDictionaryStringTo<string[]> = {};
    if (pageContext.webAccessConfiguration.isHosted) {
        scripts.forEach((script) => {
            var serviceId = Context.getScriptModuleOwner(script);
            if (serviceId) {
                serviceId = serviceId.toLowerCase();
                if (!scriptsByService[serviceId]) {
                    scriptsByService[serviceId] = [];
                }
                scriptsByService[serviceId].push(script);
            }
        });
    }
    else {
        scriptsByService[""] = scripts;
    }

    // Request the missing bundles (with their dependencies, recursively). Issue one request to each service
    var requestPromises: IPromise<DynamicBundlesCollection>[] = [];
    $.each(scriptsByService, (serviceInstanceId: string, serviceScripts: string[]) => {
        requestPromises.push(issueDynamicBundleRequest(serviceScripts, serviceInstanceId, excludeOptions));
    });

    // Wait for all the AJAX requests to complete
    return Q.allSettled(requestPromises).then((bundleRequestStates) => {
        return mergeBundleCollections(bundleRequestStates);
    });
}

function mergeBundleCollections(bundleCollections: Q.PromiseState<DynamicBundlesCollection>[]): DynamicBundlesCollection {

    var mergedCollection: DynamicBundlesCollection = {
        scripts: [],
        scriptsExcludedByPath: [],
        styles: []
    };

    for (var bundleCollectionState of bundleCollections) {
        var bundleCollection = bundleCollectionState.value;
        if (bundleCollection) {
            if (bundleCollection.scripts) {
                Utils_Array.addRange(mergedCollection.scripts, bundleCollection.scripts);
            }
            if (bundleCollection.scriptsExcludedByPath) {
                Utils_Array.addRange(mergedCollection.scriptsExcludedByPath, bundleCollection.scriptsExcludedByPath);
            }
            if (bundleCollection.styles) {
                Utils_Array.addRange(mergedCollection.styles, bundleCollection.styles);
            }
        }
    }

    return mergedCollection;
}

function processPendingUsingStatements() {

    if (pendingUsingStatements.length === 0) {
        // Nothing left to process
        return;
    }

    Diag.Debug.logVerbose(`Bundling::processPendingUsingStatements: ${pendingUsingStatements.map(u => u.moduleNames.join(",")).join(";")}`);

    // Pop all items from the queue
    var usingStatements: IUsingStatement[] = [].concat(pendingUsingStatements);
    pendingUsingStatements = [];

    processUsingStatements(usingStatements);
}

function processUsingStatements(usingStatements: IUsingStatement[]) {

    var modulesToExcludeType: IDictionaryStringTo<VSS.DynamicModuleExcludeOptions> = {};
    var excludeTypes: IDictionaryNumberTo<boolean> = {};

    // Produce a combined list of all script modules to fetch
    usingStatements.forEach((usingStatement) => {
        var options = usingStatement.loadOptions;
        var excludeOptions = (options && typeof options.excludeOptions === "number") ? options.excludeOptions : VSS.DynamicModuleExcludeOptions.AllPageBundles;

        excludeTypes[excludeOptions] = true;

        for (let moduleName of usingStatement.moduleNames) {
            modulesToExcludeType[moduleName] = excludeOptions;
        }
    });

    var dynamicBundleRequest: IDynamicBundleRequest = {
        initialUsings: usingStatements,
        pendingUsings: []
    };

    var scriptModules = Object.keys(modulesToExcludeType);
    var unresolvedScriptModules = scriptModules.filter((moduleName) => {
        return !requirejs.specified(moduleName);
    });

    Diag.Debug.logVerbose(`Bundling::processPendingUsingStatements.issueRequest: ${unresolvedScriptModules.join(",")}`);

    unresolvedScriptModules.forEach((unresolvedScriptModule) => {
        dynamicBundleRequests[unresolvedScriptModule] = dynamicBundleRequest;
    });

    // Issue the request to compute bundles and get the url(s) of them
    var requests: IPromise<DynamicBundlesCollection>[] = [];
    for (var excludeTypeString in excludeTypes) {
        var excludeType = parseInt(excludeTypeString, 10);
        var modules = unresolvedScriptModules.filter(m => modulesToExcludeType[m] === excludeType);
        if (modules.length > 0) {
            requests.push(issueDynamicBundleRequests(modules, excludeType));
        }
    }

    var combinedRequest = Q.allSettled(requests).then((states) => {
        var mergedResult = mergeBundleCollections(states);
        if (mergedResult) {
            // Now inject the bundles into the page, effectively ensuring that
            // define calls have been made for each bundle.
            return injectBundlesInternal(mergedResult, null).then(() => {
                // The bundle scripts have been injected, now issue the original require statement
                resolveUsings(dynamicBundleRequest, true, unresolvedScriptModules);
            });
        }
        else {
            resolveUsings(dynamicBundleRequest, false, unresolvedScriptModules);
        }
    });
}

/**
 * Inject all the CSS and Scripts specified in the bundle collection into the page
 *
 * @param bundles Collection of CSS and script bundles
 * @param rootBundleUrl Optional root url to prefix to all bundle paths.
 */
export function injectBundles(bundles: DynamicBundlesCollection, contributedServiceUri?: Context.ContributedServicePathBuilder): IPromise<any> {
    return injectBundlesInternal(bundles, contributedServiceUri);
}

function triggerContentLoadedEvent(isCss: boolean, size: number) {
    if ((window as any).LWL) {
        document.dispatchEvent(new CustomEvent("legacyContentElementLoaded", { cancelable: false, detail: { isCss, size }}));
    }
}

function injectBundlesInternal(bundles: DynamicBundlesCollection, contributedServiceUri: Context.ContributedServicePathBuilder): IPromise<any> {

    var deferred = Q.defer();

    // Inject all style tags first
    var cssPromises: IPromise<any>[] = [];
    if (bundles.styles && bundles.styles.length) {
        bundles.styles.forEach((style) => {
            var styleUri = style.uri;
            if (contributedServiceUri) {
                styleUri = contributedServiceUri.combinePath(style.uri);
            }
            cssPromises.push(CSS_Plugin.injectStylesheet(styleUri, style.fallbackThemeUri, style.cssFiles));
            addBundledCssContentSize(style.clientId || styleUri, style.contentLength);
            triggerContentLoadedEvent(true, style.contentLength);
        });
    }

    Q.allSettled(cssPromises).then(() => {

        // Now require all script bundles and invoke the callback when done
        var urls: string[] = [];
        if (bundles.scripts && bundles.scripts.length) {
            for (var i = 0, l = bundles.scripts.length; i < l; i++) {
                var scriptBundle = bundles.scripts[i];

                let scriptUri: string;
                if (contributedServiceUri) {
                    scriptUri = contributedServiceUri.combinePath(scriptBundle.uri);
                }
                else {
                    scriptUri = scriptBundle.uri;
                }

                let bundleId: string = null;
                if (scriptBundle.clientId) {
                    bundleId = scriptBundle.clientId;
                }
                else {
                    bundleId = scriptUri;
                }

                if (!isScriptBundleAlreadyReferenced(bundleId)) {
                    urls.push(scriptUri);
                    integrityById[bundleId] = scriptBundle.integrity;
                    addBundledScriptContentSize(bundleId, scriptBundle.contentLength);
                    triggerContentLoadedEvent(false, scriptBundle.contentLength);
                }
            }
        }

        if (urls.length > 0) {
            require(urls, () => {
                if (bundles.scriptsExcludedByPath && bundles.scriptsExcludedByPath.length) {

                    // Fetch the scripts excluded by path. Ensure these don't wait for any previously issued
                    // requests or else we can deadlock
                    var unresolvedModules = filterToUnresolvedModules(bundles.scriptsExcludedByPath);
                    if (!unresolvedModules.length) {
                        deferred.resolve(null);
                    }
                    else {
                        var usingStatement: IUsingStatement = {
                            moduleNames: unresolvedModules,
                            completed: () => {
                                deferred.resolve(null);
                            },
                            failed: deferred.reject
                        };
                        processUsingStatements([usingStatement]);
                    }
                }
                else {
                    deferred.resolve(null);
                }
            }, deferred.reject);
        }
        else {
            deferred.resolve(null);
        }
    });

    return deferred.promise;
}

function resolveUsings(dynamicBundleRequest: IDynamicBundleRequest, reprocessPendingUsings: boolean, moduleNames: string[]) {
    moduleNames.forEach((moduleName) => {
        delete dynamicBundleRequests[moduleName];
    });

    // Complete the usings that resulted in this request.
    dynamicBundleRequest.initialUsings.forEach((using) => {
        using.completed();
    });

    // Process usings that came in after this request and specified one or more modules in this bundle
    dynamicBundleRequest.pendingUsings.forEach((using) => {
        if (reprocessPendingUsings) {
            // These need to go back through the pipeline, now that we have resolved one or more modules
            // that this using was waiting on.
            loadModules(using.moduleNames, using.loadOptions).then(() => {
                using.completed();
            }, using.failed);
        }
        else {
            using.completed();
        }
    });
}

function filterToUnresolvedModules(moduleNames: string[]): string[] {

    return (moduleNames || []).filter((moduleName) => {
        if (requirejs.specified(moduleName)) {
            return false;
        }
        else if (typeof (Context.getScriptModuleOwner(moduleName)) === "undefined") {
            return false;
        }
        return true;
    });
}

/**
* Issue a require statement for the specified modules and invoke the given callback method once available.
* This is a wrapper around the requireJS 'require' statement which ensures that the missing modules are
* pulled in via the minimum number of resource requests.
*
* @param moduleNames An array of AMD modules to asynchronously require
* @param callback Method to invoke once the modules have been resolved.
*/
export function requireModules(moduleNames: string[], options?: VSS.IModuleLoadOptions): Q.Promise<any> {

    return loadModules(moduleNames, options).then(() => {
        return Q.Promise((resolve, reject) => {
            require(moduleNames, function () {
                if (typeof options === "function") {
                    // Compat check for old requireModules signature which was not promise based and
                    // took a callback function as its second argument. This shipped in the VSS.SDK
                    // so we are stuck with it.
                    var optionsFunction: Function = <any>options;
                    optionsFunction.apply(this, arguments);
                }
                resolve(arguments);
            }, reject);
        });
    });
}

/**
* Issue a require statement for the specified modules and invoke the given callback method once available.
* This is a wrapper around the requireJS 'require' statement which ensures that the missing modules are
* pulled in via the minimum number of resource requests.
*
* @param moduleNames An array of AMD modules to asynchronously require
* @param callback Method to invoke once the modules have been resolved.
*/
export function loadModules(moduleNames: string[], options?: VSS.IModuleLoadOptions): Q.Promise<void> {

    // Ensure that bundling is actually enabled
    if (!Context.getPageContext().diagnostics.bundlingEnabled) {
        return Q.resolve(<any>null);
    }

    Diag.Debug.logVerbose(`Bundling::requireModules: ${moduleNames.join(",")}`);

    // Get a list of the modules that have not been specified yet.
    var unresolvedModules = filterToUnresolvedModules(moduleNames);

    if (unresolvedModules.length === 0) {
        // If there is nothing we are waiting to resolve, complete the promise immediately.
        return Q.resolve(<any>null);
    }
    else {
        Diag.Debug.logVerbose(`Bundling::requireModules.missing: ${unresolvedModules.join(",")}`);

        var deferred = Q.defer<void>();

        // Create the using definition
        var usingStatement: IUsingStatement = {
            moduleNames: moduleNames,
            completed: deferred.resolve,
            failed: deferred.reject,
            loadOptions: options
        };

        // See if there is already an in-flight request for any of these includes
        for (var i = 0, l = unresolvedModules.length; i < l; i++) {
            var bundleRequest = dynamicBundleRequests[unresolvedModules[i]];
            if (bundleRequest) {
                // We found an in-flight request for one of the unresolved modules. Attach to it, and we're done.
                bundleRequest.pendingUsings.push(usingStatement);
                return deferred.promise;
            }
        }

        // Add to our pending using statements queue and start up a delayed worker. This allows async bundle calls issued at the same time
        // to be combined in the same request.
        pendingUsingStatements.push(usingStatement);
        Core.delay(this, 0, processPendingUsingStatements);

        return deferred.promise;
    }
}