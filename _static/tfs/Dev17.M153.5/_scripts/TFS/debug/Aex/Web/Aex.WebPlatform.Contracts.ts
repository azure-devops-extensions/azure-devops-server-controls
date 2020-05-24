
//----------------------------------------------------------
// Generated file, DO NOT EDIT.
// To regenerate this file, run "GenerateConstants.cmd" .

// Generated data for the following assemblies:
// Microsoft.Aex.WebPlatform.Client
// Microsoft.TeamFoundation.Server.WebAccess.Platform
//----------------------------------------------------------


export interface BundlingContributionData {
    bundles: DynamicBundlesCollection;
    hostUri: string;
    overrideContributionPaths: { [key: string]: ContributionPath; };
    requiredModules: string[];
}

/**
* Item representing a contribution path. Can be of type default, resource or bundle
*/
export interface ContributionPath {
    /**
    * Type if this contribution path
    */
    pathType: any;
    /**
    * Replace value for this contribution path
    */
    value: string;
}

export interface DynamicBundlesCollection {
    scripts: DynamicScriptBundle[];
    scriptsExcludedByPath: string[];
    styles: any[];
}

export interface DynamicScriptBundle {
    clientId: string;
    contentLength: number;
    integrity: string;
    uri: string;
}

