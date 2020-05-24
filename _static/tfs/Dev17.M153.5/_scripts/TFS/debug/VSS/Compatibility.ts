import Diag = require("VSS/Diag");

function consoleLog(verbosity: Diag.LogVerbosity, message: string): void {
    if (window.console) {
        switch (verbosity) {
            case Diag.LogVerbosity.Error:
                console.error(message);
                break;
            case Diag.LogVerbosity.Warning:
                console.warn(message);
                break;
            default:
                console.log(message);
                break;
        }
    }
}

export function moved(name: string, fromPath: string, toPath: string, description = null): void {
    consoleLog(Diag.LogVerbosity.Warning, `${name} moved from ${fromPath} to ${toPath}. Please switch to using ${toPath}/${name}.${description ? description : ""}`);
}

export function removed(name: string, internalUsage: boolean = false) {
    if (!internalUsage) {
        // Removed for extensions and VSTS services out of VSTS repo consuming web platform
        consoleLog(Diag.LogVerbosity.Warning, `${name} is deprecated and will be removed soon.`);
    }
}

export function deprecated(name: string, version: string): void {
 
}