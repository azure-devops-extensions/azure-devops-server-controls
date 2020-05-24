
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Service = require("VSS/Service");
import Utils_Url = require("VSS/Utils/Url");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

export interface IArtifactData {
    uri?: string;
    tool: string;
    type: string;
    id: string;
}

export class Artifact {

    public static _execute(artifact: Artifact, webContext: Contracts_Platform.WebContext) {
        var url: string = artifact.getUrl(webContext);

        if (url) {
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                url: url,
                target: "_blank"
            });
        } else {
            alert(Utils_String.format(Resources_Platform.UnknownArtifactType, artifact.getType()));
        }
    }

    public static ACTION_ARTIFACT_EXECUTE: string = "artifact-execute";

    public _data: any;
    public _error: any;

    constructor(data: IArtifactData) {
        this._data = data;
        if (!this._data.uri) {
            this._data.uri = LinkingUtilities.encodeUri({ tool: this.getTool(), type: this.getType(), id: this.getId() });
        }
    }

    public getUri(): string {
        return this._data.uri;
    }

    public getTool(): string {
        return this._data.tool;
    }

    public getType(): string {
        return this._data.type;
    }

    public getId(): string {
        return this._data.id;
    }

    /**
     * @return 
     */
    public getTitle(): string {

        return this.getUri();
    }

    public setError(error: any) {
        this._error = error;
    }

    public getError(): any {
        return this._error;
    }

    public execute(webContext: Contracts_Platform.WebContext) {
        return Events_Action.getService().performAction(Artifact.ACTION_ARTIFACT_EXECUTE, {
            artifact: this,
            webContext: webContext
        });
    }

    /**
     * @return 
     */
    public getUrl(webContext: Contracts_Platform.WebContext): string {
        return null;
    }
}

Events_Action.getService().registerActionWorker(Artifact.ACTION_ARTIFACT_EXECUTE, function (actionArgs: any, next: IResultCallback) {
    return Artifact._execute(actionArgs.artifact, actionArgs.webContext);
});

export class LinkingUtilities {

    public static VSTFS: string = "vstfs:///";
    public static URI_SEPARATOR: string = '/';

    /**
     * Creates an artifact URI using specified artifact.
     * 
     * @param artifact Artifact should have the following properties:
     *     - tool: Artifact tool name
     *     - type: Artifact type
     *     - id: Artifact tool specific id
     * @return 
     */
    public static encodeUri(artifact: any): string {

        Diag.Debug.assertIsNotNull(artifact, "Artifact should not be null");
        Diag.Debug.assertParamIsString(artifact.tool, "Artifact tool should be string");
        Diag.Debug.assertParamIsString(artifact.type, "Artifact type should be string");
        Diag.Debug.assertParamIsString(artifact.id, "Artifact ID should be string");

        return LinkingUtilities.VSTFS + [encodeURIComponent(artifact.tool), encodeURIComponent(artifact.type), encodeURIComponent(artifact.id)].join(LinkingUtilities.URI_SEPARATOR);
    }

    /**
     * Decodes the specified artifact URI and creates artifact object which has tool, type and id properties.
     * 
     * @param artifactUri URI to decode
     * @return 
     */
    public static decodeUri(artifactUri: string): IArtifactData {

        var vstfs: string;
        var parts: string[];

        Diag.Debug.assertParamIsString(artifactUri, "Artifact URI should be string");

        if (artifactUri.length > LinkingUtilities.VSTFS.length) {
            vstfs = artifactUri.substr(0, LinkingUtilities.VSTFS.length).toLowerCase();
            if (vstfs === LinkingUtilities.VSTFS) {
                parts = artifactUri.substr(LinkingUtilities.VSTFS.length).split(LinkingUtilities.URI_SEPARATOR);
                if (parts.length >= 3) {

                    const tool = parts[0];
                    const type = parts[1];
                    const id = parts.slice(2).join("/");
                    return {
                        uri: artifactUri,

                        // IMPORTANT! Not using decodeURIComponent directly here is by design to keep backwards compatibility
                        // and symmetry with encoding of artifact URIs from the rich client and VS2010 and earlier clients.
                        tool: LinkingUtilities.legacyDecodeURIComponent(tool),
                        type: LinkingUtilities.legacyDecodeURIComponent(type),
                        id: LinkingUtilities.legacyDecodeURIComponent(id)
                    };
                }
            }
        }

        throw new Error(Utils_String.format(Resources_Platform.InvalidArtifactUri, artifactUri));
    }

    /**
     * Decodes a uri component, maintaining backwards compatibility with how URIs were encoded
     * from the rich client and in VS2010 and earlier versions.
     * 
     * @param encodedURIComponent URI component to decode
     * @return 
     */
    public static legacyDecodeURIComponent(encodedURIComponent: string): string {

        var result: string;

        Diag.Debug.assertParamIsString(encodedURIComponent, "encodedURIComponent should be string");

        // KLUDGE: Special case handling of the encoded '+' sign (denotes a space), use regex with /g to replace all occurrences
        result = encodedURIComponent.replace(/\+/g, ' ');
        result = decodeURIComponent(result);

        return result;
    }
}

function ensureToolName(toolName: string): string {
    return toolName.toLowerCase();
}

var artifactResolvers: IDictionaryStringTo<any /* Note: We may want to have a Resolver type */> = {};

function groupArtifactsByTool(artifactUris: string[]): IDictionaryStringTo<IArtifactData[]> {
    var i: number;
    var l: number;
    var toolArtifacts: IDictionaryStringTo<IArtifactData[]> = {};
    for (i = 0, l = artifactUris.length; i < l; i++) {

        var artifactId = LinkingUtilities.decodeUri(artifactUris[i]);
        var toolName = ensureToolName(artifactId.tool);

        if (!toolArtifacts[toolName]) {
            toolArtifacts[toolName] = [];
        }

        toolArtifacts[toolName].push(artifactId);
    }

    return toolArtifacts;
}

export class ClientLinking extends Service.VssService {

    public static MODE_TRANSLATEURL: string = "translateURL";

    public static registerArtifactResolver(toolName: string, resolver: any) {
        artifactResolvers[ensureToolName(toolName)] = resolver;
    }

    public static getArtifactResolver(toolName: string): any {
        return artifactResolvers[ensureToolName(toolName)];
    }

    constructor() {
        super();
    }

    public beginResolveArtifacts(artifactUris: string[], options?: any, callback?: IResultCallback, errorCallback?: IErrorCallback): void {
        var webContext = this.getWebContext();
        var resolverOptions: any = $.extend({ webContext: webContext }, options);
        var job = { results: [], resolving: 0 };

        function createDefaultArtifacts(ids: IArtifactData[], error: any) {
            var i: number;
            var l: number;
            var artifacts: Artifact[] = [];
            for (i = 0, l = ids.length; i < l; i++) {
                var artifact = new Artifact(ids[i]);
                if (error) {
                    artifact.setError(error);
                }

                artifacts.push(artifact);
            }

            return artifacts;
        }

        function finalize() {
            if (job.resolving === 0) {
                // Execute callback which indicates all jobs are finished
                callback(job.results);

                // This makes sure that result callback is executed only once
                job.resolving -= 1;
            }
        }

        function processTool(toolResult: any, ids: IArtifactData[]) {
            job.resolving -= 1;
            job.results = job.results.concat(toolResult.success ? toolResult.artifacts : createDefaultArtifacts(ids, toolResult.error));

            finalize();
        }

        function beginResolveTool(tool: string, ids: IArtifactData[]) {
            var resolver = ClientLinking.getArtifactResolver(tool);

            if (resolver) {
                resolver(ids, resolverOptions, function (result: any) {
                    processTool(result, ids);
                }, function (error: any) {
                    processTool({ success: false, error: error }, ids);
                });

                return true;
            }

            return false;
        }

        // Grouping artifacts by tool name
        var toolArtifacts = groupArtifactsByTool(artifactUris);

        // Set the pending-resolve count to the number of distinct tool names
        $.each(toolArtifacts, function (toolName: string, artifactIds: IArtifactData[]) {
            job.resolving += 1;
        });

        $.each(toolArtifacts, function (toolName: string, artifactIds: IArtifactData[]) {
            if (!beginResolveTool(toolName, artifactIds)) {
                processTool({ success: false, error: new Error("NoResolver") }, artifactIds);
            }
        });

        finalize();
    }
}

Utils_Url.getTranslatorService().registerUrlTranslator(function (url: string, options: any, callback: IResultCallback, errorCallback: IErrorCallback, nextTranslator: IResultCallback) {
    var webContext: Contracts_Platform.WebContext;

    if (url && Utils_String.startsWith(url, LinkingUtilities.VSTFS, Utils_String.ignoreCaseComparer)) {
        webContext = (options && options.webContext) || Context.getDefaultWebContext();

        Service.getCollectionService(ClientLinking, webContext).beginResolveArtifacts([url], { mode: ClientLinking.MODE_TRANSLATEURL }, function (artifacts: Artifact[]) {
            if (artifacts && artifacts.length === 1 && !artifacts[0].getError()) {
                callback(artifacts[0].getUrl(webContext));
            }
            else {
                nextTranslator();
            }
        }, errorCallback);
    }
    else {
        nextTranslator();
    }
});

VSS.tfsModuleLoaded("VSS.OM.Artifacts", exports);
