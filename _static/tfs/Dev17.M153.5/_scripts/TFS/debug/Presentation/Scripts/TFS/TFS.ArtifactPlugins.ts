
import Q = require("q");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Diag = require("VSS/Diag");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

/** Enumeration for Artifact Icon Type */
export enum ArtifactIconType {
    /** Renders icon from an icon class */
    icon,
    
    /** Renders a color bar */
    colorBar,
    
    /** Renders a color circle */
    colorCircle
}

/** Defines an artifact icon */
export interface IArtifactIcon {
    /** Type of the icon  */
    type: ArtifactIconType;

    /** Descriptor based on type e.g. icon-class, color */
    descriptor: string;

    /** Tooltip for the icon  */
    title: string;
}

/** Defines the Title row for Artifact */
export interface IRelatedArtifactPrimaryData {
    /** Type icon */
    typeIcon: IArtifactIcon;
    
    /** Information about the user */
    user: {
        /** Any prefix we want in the title/tooltip e.g. Assigned To or Created By  */
        titlePrefix?: string,
        /** User's display name */
        displayName: string,
        /** User's TFIS/VSID */
        id?: string,
        /** User's email address */
        email?: string,
        /** User's unique name */
        uniqueName?: string
    };
    
    /** Artifact display id */
    displayId?: string;
    
    /** Artifact title */
    title: string;
    
    /** Artifact href */
    href: string;

    /** Callback  */
    callback?: (miscData: any, hostArtifact?: Artifacts_Services.IArtifactData) => void;

    /** Any misc data need to be passed to callback */
    miscData?: any;
}


/** Plugin to handle retrieving data */
export interface IRelatedArtifactsPlugin {    
    /** Tool the plugin supports e.g. git, build, workitemtracking */
    supportedTool: string;

    /** Required features for showing Call to Actions e.g. ["2FF0A29B-5679-44f6-8FAD-F5968AE3E32E"] */
    requiredFeaturesForActions?: string[];
        
    /** Called for retrieving artifact data
     * @param artifacts Raw artifacts
     * @param tfsContext The current tfs context (this can be used to generate correct href etc with the current team)
     * @param hostArtifact The host artifact, it will be falsy when the host artifact is new (e.g. New Work Item)
     * @returns Display data needed for rendering etc.
    */
    beginGetDisplayData(artifacts: Artifacts_Services.IArtifactData[], tfsContext: TFS_Host_TfsContext.TfsContext, hostArtifact?: Artifacts_Services.IArtifactData): IPromise<IArtifactDisplayData[]>;
    
    /** Called for getting display string for given artifact type and count
     * @param count Count of artifacts
     * @param artifactType Type of the artifact e.g. Ref, PullRequestId, WorkItem
     * @returns display name e.g. 2 Pull Requests 1 Branch
     */
    getArtifactDisplayString(count: number, artifactType: string): string;
    
    /**
    * Compares two Artifacts
    * @param a The object to compare
    * @param b The object to compare with
    * @returns 0: if they are equal, 1: if a > b, -1: if a < b
     */
    comparer(a: IArtifactDisplayData, b: IArtifactDisplayData): number;
}

/** Defines additional information for the artifact   */
export interface IRelatedArtifactAdditionalData {
    /** Optional icon */
    icon?: IArtifactIcon;
    
    /** Text for the artifact */
    text?: string;
    
    /** Tooltip */
    title?: string;
}

/** Defines artifact calls to actions */
export interface IRelatedArtifactAction extends IRelatedArtifactAdditionalData {
   
    /** Action href */
    href?: string;
    
    /** Callback  */
    callback?: (miscData: any, hostArtifact?: Artifacts_Services.IArtifactData) => void;
    
    /** Any misc data need to be passed to callback */
    miscData: any;
}

/** This interface represents a related artifact */
export interface IArtifactDisplayData extends Artifacts_Services.IArtifactData {
    
    /** Title row for the artifact */
    primaryData?: IRelatedArtifactPrimaryData;
    
    /** Zero or more additional data */
    additionalData?: IRelatedArtifactAdditionalData[];
    
    /** Optional action */
    action?: IRelatedArtifactAction;

    /** any other data the plugin want to stash for later processing */
    miscData?: any;

    /** Any error associated with the artifact */
    error?: Error;
}

export type artifactPluginType = { new (): IRelatedArtifactsPlugin; };
var globalArtifactPlugins: IDictionaryStringTo<(pluginType: artifactPluginType) => void> = {};

/** Interface to define artifact tool and type */
export interface IArtifactType {
    /** Tool */
    tool: string;
    
    /** Type */
    type: string;
}


/**
 * Register plugin for rendering artifacts
 * @param tool Tool for the plugin
 * @param callback The callback that will return type of the plugin when called
 */
export function registerArtifactPluginAsync(tool: string, callback: (pluginType: artifactPluginType) => void) {
    Diag.Debug.assert(!!tool, "Tool should not be empty.");
    tool = tool.toLowerCase();
    Diag.Debug.assert(!globalArtifactPlugins[tool], "Tool already registered");
    globalArtifactPlugins[tool] = callback;
}

/**
 * Registers the artifact plugin type as callback
 */
function _registerArtifactPluginAsCallback(tool: string, pluginType: artifactPluginType) {
    registerArtifactPluginAsync(tool, (callback: any) => { callback(pluginType); });
}

/**
 * Gets all artifactplugins
 */
export function getGlobalArtifactPlugins(): IDictionaryStringTo<(pluginType: artifactPluginType) => void> {
    return globalArtifactPlugins;
}

/**
 * Get artifact plugin of given type and call the callback specified
 * @param name Name of the plugin
 * @param callback Calls this function with the plugin type
 */
function _getArtifactPlugin(tool: string, callback: (pluginType: artifactPluginType) => void) {
    var asyncGetFormMethod: any;

    tool = tool.toLowerCase();
    asyncGetFormMethod = globalArtifactPlugins[tool];

    if (asyncGetFormMethod) {
        asyncGetFormMethod(callback);
    }
    else {
        callback(null);
    }
}

/**
 * Adapter for _getArtifactPlugin which supports IPromise with the plugin type
 * @param tool The tool of the plugin
 * @returns IPromise of artifactPluginType
 */
export function beginGetArtifactPlugin(tool: string): IPromise<artifactPluginType> {
    var deferred = Q.defer<artifactPluginType>();

    _getArtifactPlugin(tool, (pluginType: artifactPluginType) => {
        if (pluginType) {
            deferred.resolve(pluginType);
        }
        else {
            deferred.reject("Could not create plug-in of type " + tool);
        }
    });
    return deferred.promise;
}

/** combines tool and type of the artifact
* @param artifact The artifact whose tool and type to be combined
* @returns Combined tool and type
*/
export function combineArtifactToolAndType(artifact: Artifacts_Services.IArtifactData): string {
    return combineToolAndType(artifact.tool, artifact.type);
}

/** Combines tool and type
* @param tool The tool value
* @param type The type value
* @returns Combined tool and type
*/
export function combineToolAndType(tool: string, type: string): string {
    return (tool + "/" + type).toLowerCase();
}

/** Combines tool and type of the IArtifactType
* @param artifactType The artifactType whose tool and type to be combined
* @returns Combined tool and type
*/
export function combineArtifactType(artifactType: IArtifactType): string {
    return combineToolAndType(artifactType.tool, artifactType.type);
}

