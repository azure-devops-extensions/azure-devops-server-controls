import Q = require("q");
import VSS = require("VSS/VSS");

/**
 * Like VSS.using(...) but can only resolve a single module and returns
 * a Q.Promise instead of taking a callback.
 */
export function usingWithPromise<T>(moduleName: string): IPromise<T> {
    return Q.Promise<T>((resolve, reject) => {
        VSS.using([moduleName], (resolvedModule: T) => {
            resolve(resolvedModule);
        });
    });
}