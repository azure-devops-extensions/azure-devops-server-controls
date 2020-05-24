/// <reference types="requirejs"/>

import * as VssBundling from "VSS/Bundling";
import { getPageContext } from "VSS/Context";
import { WebPageDataService } from "VSS/Contributions/Services";
import { getService } from "VSS/Service";
import { isAbsoluteUrl } from "VSS/Utils/Url";

import { BundlingContributionData } from "Aex/Web/Aex.WebPlatform.Contracts";

declare interface IRequireJS extends Require {
    s: {
        contexts: {
            _: {
                config: RequireConfig;
                defined: IDictionaryStringTo<any>;
            },
            [contextName: string]: {
                defined: IDictionaryStringTo<any>;
            },
        },
    };
}

declare const requirejs: IRequireJS;

function combineUri(base: string, path?: string) {
    if (!path) {
        return base;
    }
    if (isAbsoluteUrl(path)) {
        return path;
    }
    if (base.charAt(base.length - 1) === "/" && path.charAt(0) === "/") {
        return base + path.slice(1);
    }
    return base + path;
}

function filterToUnresolvedModules(moduleNames: string[], req: Require): string[] {
    return (moduleNames || [])
        .filter((moduleName) => !req.specified(moduleName));
}


export interface IRequire<T> extends Require {
    /**
     * @override
     */
    (modules: string[], ready: (module: T) => void): void;
}

export type ICallbackRequire<T> = (req: IRequire<T>, requiredModules: string[]) => void;

function buildRequire(
    contextName: string,
    bundlingContributionData: BundlingContributionData): Promise<Require> {
    return new Promise<Require>((resolve) => {
        let req: Require;
        const dataService: WebPageDataService = getService(WebPageDataService);
        const { bundles, hostUri, overrideContributionPaths } = bundlingContributionData;
        const paths: IDictionaryStringTo<string> = {};
        const defaultContext = requirejs.s.contexts._;
        const defaultConfig = defaultContext.config;
        const defaultPaths = defaultConfig.paths;
        if (defaultPaths) {
            for (const path in defaultPaths) {
                if (defaultPaths[path]) {
                    paths[path] = defaultPaths[path];
                }
            }
        }
        for (const path in overrideContributionPaths) {
            if (hostUri) {
                paths[path] = combineUri(hostUri, overrideContributionPaths[path].value);
            }
        }
        req = requirejs.config({
            baseUrl: defaultConfig.baseUrl,
            context: contextName,
            paths,
            shim: defaultConfig.shim,
        });

        const requireJsContext = requirejs.s.contexts[contextName];
        for (const moduleId in defaultContext.defined) {
            if (defaultContext.defined[moduleId]) {
                let toLoad: boolean = true;
                for (const path in overrideContributionPaths) {
                    // We need VSS bundling to be loaded through context require
                    if (moduleId.indexOf(path) === 0 || moduleId === "VSS/Bundling") {
                        toLoad = false;
                        break;
                    }
                }
                if (toLoad) {
                    requireJsContext.defined[moduleId] = defaultContext.defined[moduleId];
                }
            }
        }

        if (hostUri && bundles) {
            // load bundled scripts
            if (bundles.scripts) {
                bundles.scripts.forEach((bundle) => {
                    bundle.uri = combineUri(hostUri, bundle.uri);
                });
            }
            if (bundles.styles) {
                bundles.styles.forEach((bundle) => {
                    bundle.uri = combineUri(hostUri, bundle.uri);
                });
            }
            const modulesRequired = filterToUnresolvedModules(bundles.scriptsExcludedByPath, req);
            if (modulesRequired && modulesRequired.length) {
                req(["VSS/Bundling"], (vssBundling: typeof VssBundling) => {
                    // load additional scripts
                    vssBundling.injectBundles(bundles)
                        .then(() => {
                            resolve(req);
                        });
                });
            } else {
                req(bundles.scripts.map((bundle) => bundle.uri), () => {
                    resolve(req);
                });
            }
        } else {
            resolve(req);
        }
    });
}

const contextRequires: IDictionaryStringTo<[Promise<Require>, string[]]> = {};

/**
 * get require for context
 * @param contextName name of the requireJS module loader context
 * @param contributionId contribution ID
 * @param callback call back providing a local requireJS require for the specified context
 * @param T type of the module intreface
 */
export function getRequireForContext<T = any>(contextName: string, contributionId: string, callback: ICallbackRequire<T>): void {
    if (!contextRequires[contextName]) {
        const dataService: WebPageDataService = getService(WebPageDataService);
        const bundlingContributionData: BundlingContributionData = dataService.getPageData<BundlingContributionData>(contributionId);
        contextRequires[contextName] = [buildRequire(contextName, bundlingContributionData), bundlingContributionData.requiredModules];
    }
    const [reqPromise, requiredModules] = contextRequires[contextName];
    reqPromise.then((req) => {
        callback(req, requiredModules);
    });
}
