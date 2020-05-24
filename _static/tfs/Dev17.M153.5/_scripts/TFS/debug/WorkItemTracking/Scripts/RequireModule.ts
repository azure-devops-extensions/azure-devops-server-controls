import * as Q from "q";
import VSSContext = require("VSS/Context");
import VSS = require("VSS/VSS");

export function requireModules<T>(
    moduleNames: string[],
    action: (modules: any[]) => T
): IPromise<T> {
    let allModulesDefined = true;
    const loadedModules = [];
    for (const moduleName of moduleNames) {
        let moduleLoaded = false;
        if (require.defined(moduleName)) {
            const loadedModule = require(moduleName);
            if (Object.keys(loadedModule).length === 0) {
                const pageContext = VSSContext.getPageContext();
                if (pageContext.diagnostics.bundlingEnabled === true && !pageContext.diagnostics.debugMode) {
                    if (window.console && window.console.warn) {
                        window.console.warn(`LocalRequire returned an empty module for ${moduleName}. Please check for circular dependencies.`);
                    }
                }
            } else {
                loadedModules.push(loadedModule);
                moduleLoaded = true;
            }
        }
        if (!moduleLoaded) {
            allModulesDefined = false;
            break;
        }
    }

    if (allModulesDefined) {
        return Q(action(loadedModules));
    } else {
        const deferred = Q.defer<T>();
        VSS.using(moduleNames,
            (...modules) => {
                deferred.resolve(action(modules));
            });

        return deferred.promise;
    }
}
