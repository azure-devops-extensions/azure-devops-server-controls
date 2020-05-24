/// <reference types="jquery" />

import VSS = require("VSS/VSS");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import Controls = require("VSS/Controls");
import Q = require("q");
import Artifacts_Constants = require("VSS/Artifacts/Constants");
import Artifacts_Services = require("VSS/Artifacts/Services");
import Performance = require("VSS/Performance");
import Context = require("VSS/Context");
import Utils_Core = require("VSS/Utils/Core");
import Telemetry = require("VSS/Telemetry/Services");
import VSSError = require("VSS/Error");
import Events_Handlers = require("VSS/Events/Handlers");
import PresentationResources = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import TFS_OM = require("Presentation/Scripts/TFS/TFS.OM.Common");
import TFS_FeatureLicenseService = require("Presentation/Scripts/TFS/TFS.FeatureLicenseService");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_ArtifactPlugins = require("Presentation/Scripts/TFS/TFS.ArtifactPlugins");

var delegate = Utils_Core.delegate;
var getErrorMessage = VSS.getErrorMessage;

/**
 * Interfaces that need to be implemented by the Extension
 */

/**
 * ================================================================================================================
 *  Controls and their responsibilities
 * ================================================================================================================
 * 1. The host data provider  
 *    The responsibilities of data provider are as follows
 *        a. Providing list of links that it wants to be displayed
 *        b. Notifing the RelatedArtifactsControl when links are added/removed
 *        c. Notifing the RelatedArtifactsControl when the context changes (e.g. In triage view when user moves to next/previous work item)
 *        d. Adding removing links from the Host object (E.g. Adding removing links from WorkItem or PR)
 *        e. [Optional] Maintaining a cache of the data and keeping it safe during context changes (e.g. we store the cached data on Work Item object, 
 *           so when it is refreshed the cache is refreshed as well) 
 *        f. [Optional] Handling zero data experience 
 *        g. [Optional] Stating default number of items  to render -Options
 *        h. [Optional] Decide how to handle errors (handle, handle and ignore, use default) -Options
 *        i. [Optional] Decide how to handle loading (handle, handle and ignore, use default) -Options
 *        j. [Optional] Providing order of artifact type e.g. First PR then Branch then Commit etc.   -Options
 * 2. Individual Plug-in (e.g. git, build, workitemtracking)
 *    Plug-in is responsible for following
 *        a. Fetching data needed for rendering/actions from server
 *            1. Primary Data - (typeIconInfo, userInfo, id?, title, href)
 *            2. Collection of secondary data - (iconInfo?, text, tooltip)
 *            3. Actions - (iconInfo?, text, callback?, href?) 
 *        b. Providing order of the artifacts of given type
 *        c. Providing information about features required for displaying call to action
 *        d. [Optional] Providing a renderer
 * 3. RelatedArtifactsControl has list of Plug-ins, There is one plug-in per tool type e.g. Git, Build, WorkItemTracking
 *    The responsibilites of RelatedArtifactsControl are as follows
 *        a. Getting list of links from Host control and co-ordinating with plugin to fetch detailed data about the links
 *        b. Determining the final sort order based on criteria from host control and plugin
 *        c. Rendering artifacts
 *             1. Determining format of rendering e.g. List
 *             2. Rendering the artifct using the renderer
 *             3. Honoring the max limit of items as provided by Host
 *             4. Displaying summary and additional action when there are more items to display than limited by host 
 *                     a. Actions for show more/less
 *             5. Providing default renderer for artifact
 *             6. Error handling
 *                  1. If host decided to display errors then bubbling up the errors
 *                  2. If host did not decide to display errors then displaying the errors 
 *             7. Loading Indicator
 *                  1. If host decided to show loading indicator then bubbling up the loading event
 *                  2. If host did not decide to show loading indicator then displaying the loading indicator 
 *        d. Handle Add/Remove artifact messages from Host
 *        e. Bubble up add/remove messages to Host        
 * 4. DefaultArtifactRenderer
 *    The responsibilities of default artifact renderer are as follows
 *    a. Render the artifact as per the structure (TitleRow, AdditionalRows, Action)
 *          1. Providing css classes etc for rendering
 *          2. Layout on resize, wrapping etc.
 *    b. Showing/Hiding the call to action based on required features provided by Plugin (e.g. Code feature by git)       
 * 5. RelatedArtifactsListControl is a utility class that has common list functionality that can be used by RelatedArtifactsControl
 *     a. Manage usual list view operations
 *     b. Displaying the remove icon and notify the container
 * ================================================================================================================
 *  High level flow
 * ================================================================================================================
 * 1. When Work Item is bound
 *    a. WorkItemFormRelatedArtifactsHostControl calls beginSetContext on RelatedArtifactsHostControl
 *    b. RelatedArtifactsHostControl gets the ArtifactsData from Work Item and asks the applicable plug-ins to fetch data from server (the data is cached for scenarios e.g. triage view)
 *    c. Based on the tool order specified by WorkItemFormRelatedArtifactsHostControl,  RelatedArtifactsHostControl calls render on plugins
 *    d. Summary is updated and shown/hidden based on total number of artifacts
 * 2. When an artifact is added using LinksGrid
 *    a. WorkItemFormRelatedArtifactsHostControl's onWorkItemUpdate is called
 *    b. WorkItemFormRelatedArtifactsHostControl identifies the added Artifact and calls beginAddArtifacts on RelatedArtifactsHostControl
 *    c. RelatedArtifactsHostControl asks the Plug-in to fetch the data from server
 *    d. RelatedArtifactsHostControl updates the artifacts rendered 
 * 3. When an artifact is removed using LinksGrid
 *    a. WorkItemFormRelatedArtifactsHostControl's onWorkItemUpdate is called
 *    b. WorkItemFormRelatedArtifactsHostControl identifies the removed Artifact and calls beginRemoveArtifacts on RelatedArtifactsHostControl
 *    d. RelatedArtifactsHostControl updates the artifacts rendered
 * 4. When an artifact is removed using Related Artifact Control
 *    a. ListControl calls remove on RelatedArtifactsHostControl
 *    b. RelatedArtifactsHostControl notifies the host
 *    c. And the flow continue similar to what happens when artifact is removed using LinksGrid 
 */








/** Interface to store host context specific data */
export interface IRelatedArtifactsCachedData {
    /** Artifact dictionary */
    rawArtifacts: IDictionaryStringTo<Artifacts_Services.IArtifactData>;
    
    /** Display artifacts dictionary */
    displayArtifacts: IDictionaryStringTo<TFS_ArtifactPlugins.IArtifactDisplayData>;
}

/** Host context interface */
export interface IRelatedArtifactHostContext {
    /** Unique context id */
    contextId: string;
    
    /** The host artifact for the Related Artifacts control (e.g. this will be vstfs:///WorkItemTracking/WorkItem/<id> for Work Item form) */
    hostArtifact?: Artifacts_Services.IArtifactData;

    /** Gets the artifacts to be rendered */
    beginGetArtifacts(): IPromise<Artifacts_Services.IArtifactData[]>;

    /** Remove the given artifacts
    * @param artifacts The Artifacts to remove
    */
    beginRemoveArtifacts(artifacts: Artifacts_Services.IArtifactData[]): IPromise<void>;

    ///**
    //* Add the given artifact
    //*/
    //beginAddArtifact(artifact: IRelatedArtifactData): IPromise<void>;

    /** Get the cached data */
    getCachedData(): any;

    /** Set the given data for cache
    * @param data Data to be cached
    */
    setCachedData(data: any): void;
}

/** Options for RelatedArtifactsHostControl */
export interface IRelatedArtifactsControlOptions {
    
    /** Order in which the artifacts to be rendered by tool name e.g. git/pullrequestid, git/ref, workitemtracking/workitem or build/build  */
    artifactOrder: TFS_ArtifactPlugins.IArtifactType[];
    
    /** Max artifacts to show, when the total artifacts are more than this value a summary is shown. */
    maxArtifactsToShow?: number;
    
    /** Page size for showing more data. */
    pageSizeForIncrement?: number;

    /** Current tfs context */
    tfsContext: TFS_Host_TfsContext.TfsContext;

    /** Callback to report errors if any 
    @param error The error message
    */
    errorCallback?: (error: string) => void;
    
    /** Call back to report loading events
    * @param started True when loading starts, False when it ends
    */
    loadingCallback?: (started: boolean) => void;

    /** Called when user clicks on show more
    @param shownItems Total artifacts currently shown
    @param totalItems Total number of artifacts
     */
    showMoreCallback?: (shownItems: number, totalItems: number) => void;

    /** list item options */
    artifactListOptions?: IRelatedArtifactsListOptions;
}


export interface IArtifactRenderer {
    render(artifact: TFS_ArtifactPlugins.IArtifactDisplayData, hostAritfact: Artifacts_Services.IArtifactData, showAction: boolean): JQuery;
}

export class RelatedArtifactsControl extends Controls.Control<IRelatedArtifactsControlOptions> {
    protected _plugins: IDictionaryStringTo<TFS_ArtifactPlugins.IRelatedArtifactsPlugin> = {};
    protected _failedplugins: string[] = [];
    protected _hostContext: IRelatedArtifactHostContext = null;
    private _artifactOrder: IDictionaryStringTo<number>;
    private _cachedData: IRelatedArtifactsCachedData;
    private _defaultRenderer: IArtifactRenderer;
    private _maxArtifactsToShow: number;

    private _excludedArtifact = 99999;
    private _defaultPageSize = 5;
    private _defaultMaxArtifactsToShow = 99999;
    private CLASS_LOADING = "ra-progress-spinner";

    /*
    Hierarchy of containers
    this._element
       A. _errorContainer - Error
       B. _loadingContainer - Loading indicator
       C. _rootContentContainer
         - C.1 _artifactContainer - List of artifacts
         - C.2 _summaryContainer - Summary
    */

    private _$artifactContainer: JQuery = null;
    private _$errorContainer: JQuery = null;
    private _$loadingContainer: JQuery = null;

    private _$rootContentContainer: JQuery = null;
    private _$summaryContainer: JQuery = null;
    private _contentContainersCreated: boolean = false;
    private _rootContainersCreated: boolean = false;

    private _featureActiveState: IDictionaryStringTo<boolean> = null;

    private _artifactList: RelatedArtifactsList = null;
    private _loading: boolean = false;
    private _processingContextChanged: boolean;
    private _contextChanged: string = "context changed";

    private _onDeleteHandler: IRelatedArtifactDeleteHandler = (sender: RelatedArtifactsList, eventArgs: { key: string; }) => {
        try {
            var hostContext = this._hostContext;
            // Resolve key to artifact
            var rawArtifact = this._cachedData.rawArtifacts[eventArgs.key];
            var displayArtifact = this._cachedData.displayArtifacts[eventArgs.key];
            if (rawArtifact) {
                //remove the artifact from UI immediatly.
                this.removeArtifacts([rawArtifact]);

                // Begin removing the artifact
                this._hostContext.beginRemoveArtifacts([rawArtifact]).then(
                    () => {
                        //Do nothing the item is removed from UI already
                    },
                    (reason) => {
                        this._handleError(hostContext, reason);
                        if (rawArtifact && displayArtifact) {
                            this._addArtifacts(hostContext, [rawArtifact], [displayArtifact]);
                        }
                    });
            }
        }
        catch (error) {
            this._handleError(hostContext, error);
            if (rawArtifact && displayArtifact) {
                this._addArtifacts(hostContext, [rawArtifact], [displayArtifact]);
            }
        }
    };

    constructor(options: IRelatedArtifactsControlOptions) {
        super(options);
        this._artifactOrder = {};
        for (var i = 0; i < this._options.artifactOrder.length; i++) {
            var tooltype = TFS_ArtifactPlugins.combineArtifactType(this._options.artifactOrder[i]);
            this._artifactOrder[tooltype] = i;
        }
        this._defaultRenderer = new DefaultArtifactRenderer();
    }

    /** During set context the plugins are initialized, data is fetched and rendered */
    public beginSetContext(context: IRelatedArtifactHostContext): IPromise<void> {
        Diag.Debug.assert(!!context, "Context should be provided");
        Diag.Debug.assert(!!context.contextId, "ContextId should be provided");

        try {
            var clearContents: boolean = !this._hostContext || this._hostContext.contextId !== context.contextId;
            this._cachedData = context.getCachedData();
            this._hostContext = context;
            this._processingContextChanged = true;
            this._maxArtifactsToShow = this._options.maxArtifactsToShow || this._defaultMaxArtifactsToShow;

            this._ensureRootContainers(false);
            this._clearLoadingAndErrorContainers();

            //We clean the content containers if the host context is changed
            if (clearContents) {
                this._clearContentContainers();
            }

            //The loading starts after delay of 100 milliseconds, we want to call this function here so incase if the set context takes longer we show the loading indicator
            this._startLoading();        

      
            //Initialize artifact plugins 
            var promise = this._beginEnsureArtifactPlugins().then(() => {
                if (this._hostContext.contextId !== context.contextId) {
                    throw this._contextChanged;
                }
                else {
                    //Get the context specific data for the artifacts
                    return this._beginGetContextSpecificData().then((contextSpecificData: IRelatedArtifactsCachedData) => {
                        if (this._hostContext.contextId !== context.contextId) {
                            throw this._contextChanged;
                        }

                        this._setCachedData(contextSpecificData);

                        //Render the artifacts
                        this._render(true);
                    });
                }
            });

            return promise.then((value: any) => {
                this._processingContextChanged = false;
                this._endLoading(context);
                return null;
            }, (reason) => {
                this._processingContextChanged = false;
                this._endLoading(context);
                this._handleError(context, reason);
                return Q.reject(reason);
            });
        }
        catch (error) {
            this._processingContextChanged = false;
            this._endLoading(context);
            this._handleError(context, error);
            return Q.reject<void>(error);
        }
    }

    private _setCachedData(data: IRelatedArtifactsCachedData): void {
        this._cachedData = data;
        this._hostContext.setCachedData(data);
    }

    /** Resets the context and clears contents */
    public clearContext() {
        this._hostContext = null;
        this._clearLoadingAndErrorContainers();
        this._clearContentContainers();
    }
    
    /**
    * This cleans up the content containers
    */
    protected _clearContentContainers() {
        this._contentContainersCreated = false;
        this._$rootContentContainer.empty();
        this._$artifactContainer = null;
        if (this._artifactList) {
            this._artifactList.detachDeleteHandler(this._onDeleteHandler);
            this._artifactList.clear();
        }

        this._artifactList = null;
        this._$summaryContainer = null;
    }

    /**
    * Adds artifacts to the control
    * @param artifactsToAdd The Raw artifacts to add
    * @returns Promise which will be resolved with number of artifacts added
    */
    public beginAddArtifacts(artifactsToAdd: Artifacts_Services.IArtifactData[]): IPromise<number> {
        var hostContext = this._hostContext;
        try {
            if (artifactsToAdd && artifactsToAdd.length > 0) {

                this._startLoading();
                artifactsToAdd = artifactsToAdd.filter((val) => { return val !== null && !this.artifactExists(val); });
                if (artifactsToAdd.length > 0) {
                
                    //Get the artifact details 
                    var promise = this._beginResolveArtifacts(artifactsToAdd).then((resolvedArtifacts: TFS_ArtifactPlugins.IArtifactDisplayData[]) => {
                        return this._addArtifacts(hostContext, artifactsToAdd, resolvedArtifacts);

                    });

                    return promise.then((count: number) => {
                        this._endLoading(hostContext);
                        return count;
                    }, (reason) => {
                        this._endLoading(hostContext);
                        this._handleError(hostContext, reason);
                        throw reason;
                    });
                }
            }
        } catch (error) {
            this._endLoading(hostContext);
            this._handleError(hostContext, error);
            return Q.reject(error);
        }
        return Q(0);
    }

    /** Checks if artifact already exists
    * @param artifact Artifact to check
    * @returns True if artifact already exists, false otherwise
    */
    public artifactExists(artifact: Artifacts_Services.IArtifactData): boolean {
        var key = this._getArtifactKey(artifact);
        return !!this._cachedData.displayArtifacts[key];
    }

    /**
     * Returns number of artifacts
     */
    public artifactCount(): number {
        if (!this._cachedData || !this._cachedData.displayArtifacts) {
            return 0;
        }
        return Object.keys(this._cachedData.displayArtifacts).length;
    }

    private _addArtifacts(hostContext: IRelatedArtifactHostContext, rawArtifacts: Artifacts_Services.IArtifactData[], displayArtifacts: TFS_ArtifactPlugins.IArtifactDisplayData[]): number {
        //If the contextId is changed then discard the artifacts
        if (hostContext.contextId === this._hostContext.contextId && displayArtifacts && displayArtifacts.length > 0) {

            //If setContext is called (with the same context id) when we were calling the server then exit
            if (this._processingContextChanged) {
                return 0;
            }

            var cachedData = this._cachedData;
            for (var i = 0; i < rawArtifacts.length; i++) {
                let key = this._getArtifactKey(rawArtifacts[i]);
                cachedData.rawArtifacts[key] = rawArtifacts[i];
            }

            for (let i = 0; i < displayArtifacts.length; i++) {
                let key = this._getArtifactKey(displayArtifacts[i]);
                        
                //We do not allow calculated links
                Diag.Debug.assert(!!cachedData.rawArtifacts[key], "The raw artifact must exist.");
                if (cachedData.rawArtifacts[key]) {
                    cachedData.displayArtifacts[key] = displayArtifacts[i];
                }
            }

            this._setCachedData(cachedData);
            this._render(false);

            return displayArtifacts.length;
        }
        else {
            throw this._contextChanged;
        }
    }

    /** Removes artifacts
     * @param artifactsToRemove Artifacts to remove 
    */
    public removeArtifacts(artifactsToRemove: Artifacts_Services.IArtifactData[]): void {
        try {
            var artifactsRemoved: Artifacts_Services.IArtifactData[] = [];
            if (artifactsToRemove && artifactsToRemove.length > 0) {
                artifactsToRemove = artifactsToRemove.filter(function (val) { return val !== null; });
                var cachedData = this._cachedData;

                //Updating the cache
                for (var i = 0; i < artifactsToRemove.length; i++) {
                    let artifactToRemove = artifactsToRemove[i];
                    let key = this._getArtifactKey(artifactToRemove);
                    let hostArtifact = cachedData.rawArtifacts[key];
                    let resolvedArtifact = cachedData.rawArtifacts[key];

                    if (hostArtifact) {
                        delete cachedData.rawArtifacts[key];
                    }

                    if (resolvedArtifact) {
                        delete cachedData.displayArtifacts[key];
                        artifactsRemoved.push(artifactToRemove);
                    }
                }

                this._setCachedData(cachedData);
                this._render(false);
            }
        } catch (error) {
            this._handleError(this._hostContext, error);
        }
    }


    protected _handleError(context: IRelatedArtifactHostContext, error: string) {

        if (this._hostContext.contextId === context.contextId && !this._processingContextChanged) {
            if (this._options.errorCallback) {
                this._options.errorCallback(error);
            } else {
                this._defaultErrorCallback(error);
            }
        }
    }

    protected _defaultErrorCallback(error: string) {
        var $errorIcon = $("<span></span>").addClass("icon icon-error-exclamation ra-error-icon");
        var $errorText = $("<div></div>").text(error).addClass("ra-error-text");
        this._$errorContainer.empty();
        this._$errorContainer.append($errorIcon).append($errorText).removeClass("ra-hidden");
    }

    protected _startLoading() {
        this._loading = true;
        this.delayExecute("showHideLoadingOverlay", 750, true, delegate(this, () => {
            if (this._loading) {
                if (this._options.loadingCallback) {
                    this._options.loadingCallback(true);
                }
                else {
                    this._defaultLoadingCallBack(true);
                }
            }
        }));
    }

    protected _endLoading(context: IRelatedArtifactHostContext) {
        //Ignore if context changed.
        if (this._hostContext.contextId === context.contextId && !this._processingContextChanged) {
            this._loading = false;
            if (this._options.loadingCallback) {
                this._options.loadingCallback(false);
            }
            else {
                this._defaultLoadingCallBack(false);
            }
        }
    }

    protected _defaultLoadingCallBack(loading: boolean) {
        if (loading) {
            this._$loadingContainer.addClass(this.CLASS_LOADING).removeClass("ra-hidden");
        }
        else {
            this._$loadingContainer.removeClass(this.CLASS_LOADING).addClass("ra-hidden");
        }
    }

    private _ensureRootContainers(forceCreate: boolean) {

        if (!forceCreate && this._rootContainersCreated) {
            return;
        }

        this._element.empty();
        this._$errorContainer = $("<div></div>").addClass("ra-error-container").addClass("ra-hidden");
        this._element.append(this._$errorContainer);
        this._$loadingContainer = $("<div></div>").addClass("ra-hidden");
        this._element.append(this._$loadingContainer);
        this._$rootContentContainer = $("<div></div>");
        this._element.append(this._$rootContentContainer);
        this._rootContainersCreated = true;
    }

    private _clearLoadingAndErrorContainers() {
        if (this._rootContainersCreated) {
            this._$errorContainer.addClass("ra-hidden");
            this._$loadingContainer.addClass("ra-hidden")
            this._$errorContainer.empty();
            this._$loadingContainer.empty();
        }
    }

    private _ensureContentContainers(forceCreate: boolean): void {
        if (!forceCreate && this._contentContainersCreated) {
            return;
        }

        this._clearContentContainers();

        this._$artifactContainer = $("<div></div>");
        this._$summaryContainer = $("<div></div>");

        this._artifactList = new RelatedArtifactsList(this._options.artifactListOptions);
        this._artifactList.attachDeleteHandler(this._onDeleteHandler);
        this._artifactList.setContainer(this._$artifactContainer);

        this._$rootContentContainer.append(this._$artifactContainer);
        this._$rootContentContainer.append(this._$summaryContainer);

        this._contentContainersCreated = true;
    }

    protected _render(force: boolean): void {
        var cachedData = this._cachedData;

        var resolvedArtifacts = cachedData.displayArtifacts;
        if (!resolvedArtifacts) {
            resolvedArtifacts = {};
        }

        var artifacts = Object.keys(resolvedArtifacts).map(key => resolvedArtifacts[key]);
        if (artifacts.length === 0) {
            this._ensureContentContainers(true);
        }
        else {
            this._ensureContentContainers(force);
            artifacts.sort((a, b) => this._comparer(a, b));
            var renderIndex = 0;

            var maxArtifactsToShow = this._maxArtifactsToShow;
            var artifactsRenderedByType: IDictionaryStringTo<number> = {};
            artifacts = artifacts.slice(0, maxArtifactsToShow);

            // Remove artifacts no longer in view
            let itemsToRemove = this._artifactList.getItems().filter(key => !artifacts.some(artifact => this._getArtifactKey(artifact) === key));
            for (let itemToRemove of itemsToRemove) {
                this._artifactList.remove(itemToRemove);
            }

            for (var i = 0; i < artifacts.length; i++) {
                var artifact = artifacts[i];
                var tool = artifact.tool.toLowerCase();
                var plugin = this._plugins[tool];
                if (plugin) {
                    var showAction: boolean = plugin.requiredFeaturesForActions && plugin.requiredFeaturesForActions.length > 0 ?
                        this._areAllFeaturesActive(plugin.requiredFeaturesForActions) : true;

                    if (maxArtifactsToShow > 0 && this._getArtifactOrder(artifact) !== this._excludedArtifact) {
                        this._renderArtifact(plugin, artifact, renderIndex, showAction);
                        maxArtifactsToShow = maxArtifactsToShow - 1;
                        renderIndex++;
                        var fullType: string = TFS_ArtifactPlugins.combineArtifactToolAndType(artifact);
                        if (!artifactsRenderedByType[fullType]) {
                            artifactsRenderedByType[fullType] = 0;
                        }
                        artifactsRenderedByType[fullType] = artifactsRenderedByType[fullType] + 1;
                    }
                }

                if (maxArtifactsToShow <= 0) {
                    this._renderSummary(artifactsRenderedByType);
                }
                else {
                    this._$summaryContainer.empty();
                }
            }
        }
    }
    
    /** Checks if all the features asked for are active. 
    * @param features An array of features to check
    * @returns True when all features are active, false otherwise
    */
    public _areAllFeaturesActive(features: string[]): boolean {
        if (!features || features.length === 0) {
            return true;
        }

        if (!this._featureActiveState) {
            this._featureActiveState = {};
        }

        return features.every((feature) => {
            if (typeof (this._featureActiveState[feature]) !== "boolean") {
                this._featureActiveState[feature] = this._isFeatureActive(feature);
            }
            return this._featureActiveState[feature];
        });
    }

    protected _isFeatureActive(featureName: string): boolean {
        return TFS_FeatureLicenseService.FeatureLicenseService.isFeatureActive(featureName);
    }

    private _getArtifactOrder(artifact: Artifacts_Services.IArtifactData): number {
        var toolType = TFS_ArtifactPlugins.combineArtifactToolAndType(artifact);
        var order = this._artifactOrder[toolType];

        if (typeof (order) !== "number") {
            return this._excludedArtifact;
        }

        return order;
    }

    private _comparer(a: TFS_ArtifactPlugins.IArtifactDisplayData, b: TFS_ArtifactPlugins.IArtifactDisplayData): number {
        var diff = this._getArtifactOrder(a) - this._getArtifactOrder(b);
        if (diff !== 0) {
            return diff;
        }
        
        //If the order is same it means the tool and type are same now call plugin comparer
        var plugin = this._plugins[a.tool.toLowerCase()];
        Diag.Debug.assert(!!plugin, "Plugin not found for " + a.tool.toLowerCase());
        return plugin.comparer(a, b);
    }


    protected _getArtifactKey(artifact: Artifacts_Services.IArtifactData): string {
        return RelatedArtifactsControl.getArtifactKey(artifact);
    }

    private _renderArtifact(plugin: TFS_ArtifactPlugins.IRelatedArtifactsPlugin, artifact: TFS_ArtifactPlugins.IArtifactDisplayData, index: number, showAction: boolean): void {
        var key = this._getArtifactKey(artifact);
        var existingItem = this._artifactList.get(key);
        if (!existingItem) {
            var listItemOptions = this._getListItemOptions(plugin, artifact, showAction);
            this._artifactList.insertAtIndex(index, key, listItemOptions);
        }
    }

    private _getListItemOptions(plugin: TFS_ArtifactPlugins.IRelatedArtifactsPlugin, artifact: TFS_ArtifactPlugins.IArtifactDisplayData, showAction: boolean): IRelatedArtifactsListItemOptions {
        var options: IRelatedArtifactsListItemOptions = null;
        options = {
            iconCssClass: artifact.primaryData.typeIcon.descriptor,
            iconTitle: artifact.primaryData.title,
            isRemovable: true,
            $content: this._defaultRenderer.render(artifact, this._hostContext.hostArtifact, showAction)
        };
        return options;
    }

    private _renderSummary(artifactsRendered: IDictionaryStringTo<number>): void {
        this._$summaryContainer.empty();
        //Show summary only when we have more artifacts to show than available
        if (Object.keys(this._cachedData.rawArtifacts).length > this._maxArtifactsToShow) {
            var resolvedArtifactsByType = this._getArtifactsByType(this._cachedData.displayArtifacts);
            var summaries: string[] = [];
            var shownCount = 0;
            var totalCount = 0;

            for (var i = 0; i < this._options.artifactOrder.length; i++) {
                var tool = this._options.artifactOrder[i].tool.toLowerCase();
                var plugin = this._plugins[tool];
                if (plugin) {

                    var fullType = TFS_ArtifactPlugins.combineArtifactType(this._options.artifactOrder[i]);

                    if (resolvedArtifactsByType[fullType] && resolvedArtifactsByType[fullType].length > 0) {
                        var length = resolvedArtifactsByType[fullType].length - (artifactsRendered[fullType] || 0);
                        shownCount += (artifactsRendered[fullType] || 0);
                        totalCount += resolvedArtifactsByType[fullType].length;
                        if (length > 0) {
                            summaries.push(plugin.getArtifactDisplayString(length, fullType));
                        }
                    }
                }
            }

            var summary = "";
            if (summaries && summaries.length > 0) {
                summary = summaries[0];
                for (var k = 1; k < summaries.length; k++) {
                    summary = Utils_String.format(PresentationResources.RelatedArtifacts_SummaryDelimiter, summary, summaries[k]);
                }
                summary = Utils_String.format(PresentationResources.RelatedArtifacts_SummaryNotShown, summary);
            }

            if (summary) {
                var $allSummary = $("<div></div>");
                
                var $showMoreContainer = $("<div></div>").addClass("ra-show-more-container").appendTo($allSummary);
                var $link = $("<div></div>").addClass("ra-show-more").text(PresentationResources.RelatedArtifacts_ShowMore).bind("click", () => {
                    this._showMore(shownCount, totalCount);
                }).appendTo($showMoreContainer);
                var $shown = $("<div></div>").addClass("ra-shown-count").text(Utils_String.format(PresentationResources.RelatedArtifacts_RemainingCount, shownCount, totalCount)).appendTo($showMoreContainer);
                
                var $notShown = $("<div></div>").text(summary).addClass("ra-not-shown-count");                
                this._$summaryContainer.append($allSummary);
                this._$summaryContainer.append($notShown);
            }
        }
    }

    private _showMore(shownCount: number, totalCount: number) {
        this._maxArtifactsToShow = this._maxArtifactsToShow + (this._options.pageSizeForIncrement || this._defaultPageSize);
        this._render(false);
        if (this._options.showMoreCallback) {
            this._options.showMoreCallback(shownCount, totalCount);
        }
    }

    /**
    * Maps resolved artifacts by artifact type and return the dictionary 
    */
    private _getArtifactsByType<ArtifactData extends Artifacts_Services.IArtifactData>(artifacts: IDictionaryStringTo<ArtifactData>): IDictionaryStringTo<ArtifactData[]> {
        var artifactsByType: IDictionaryStringTo<ArtifactData[]> = {};
        for (var key in artifacts) {
            if (artifacts.hasOwnProperty(key)) {
                var resolvedArtifact = artifacts[key];
                var fullType: string = TFS_ArtifactPlugins.combineArtifactToolAndType(resolvedArtifact);

                if (!artifactsByType[fullType]) {
                    artifactsByType[fullType] = [];
                }
                artifactsByType[fullType].push(resolvedArtifact);
            }
        }
        return artifactsByType;
    }


    private static _getArtifactsByTool<ArtifactData extends Artifacts_Services.IArtifactData>(artifacts: ArtifactData[]): IDictionaryStringTo<ArtifactData[]> {
        var artifactsByTool: IDictionaryStringTo<ArtifactData[]> = {};
        
        //arrange artifacts by tool
        for (var i = 0; i < artifacts.length; i++) {
            var artifact: ArtifactData = artifacts[i];
            var tool = artifact.tool.toLowerCase();
            if (!artifactsByTool[tool]) {
                artifactsByTool[tool] = [];
            }
            artifactsByTool[tool].push(artifact);
        }

        return artifactsByTool;
    }

    /**
    * Gets context specific data
    */
    private _beginGetContextSpecificData(): IPromise<IRelatedArtifactsCachedData> {
        var currentContext = this._hostContext;
        var cachedData = this._cachedData;
        //If we have already fetched context specific data let us return
        if (!cachedData) {
            cachedData = <IRelatedArtifactsCachedData>{
                rawArtifacts: {},
                displayArtifacts: {}
            };
        }
        else {
            cachedData = jQuery.extend(true, {}, cachedData);
        }

        var contextSpecificData: IRelatedArtifactsCachedData = cachedData;

        return currentContext.beginGetArtifacts().then((hostArtifactData: Artifacts_Services.IArtifactData[]) => {
            if (hostArtifactData && hostArtifactData.length > 0) {
                
                //Filter any null values
                hostArtifactData = hostArtifactData.filter((val) => val !== null);
                
                //Exclude the host artifacts for which we already have data
                hostArtifactData = hostArtifactData.filter((val) => !cachedData.displayArtifacts[this._getArtifactKey(val)]);

                for (let i = 0; i < hostArtifactData.length; i++) {
                    let key = this._getArtifactKey(hostArtifactData[i]);
                    contextSpecificData.rawArtifacts[key] = hostArtifactData[i];
                }
                
                //Resolve the Artifacts              
                return this._beginResolveArtifacts(hostArtifactData).then((resolvedArtifacts: TFS_ArtifactPlugins.IArtifactDisplayData[]) => {
                    for (let i = 0; i < resolvedArtifacts.length; i++) {
                        let key = this._getArtifactKey(resolvedArtifacts[i]);

                        Diag.Debug.assert(!!contextSpecificData.rawArtifacts[key], "Calculated links are not allowed.");
                        if (contextSpecificData.rawArtifacts[key]) {
                            contextSpecificData.displayArtifacts[key] = resolvedArtifacts[i];
                        }
                    }
                    return contextSpecificData;
                });

            }
            else {
                return contextSpecificData;
            }
        });
    }

    /**
    * Initializes the Artifact Plug ins 
    */
    protected _beginEnsureArtifactPlugins(): IPromise<void> {

        //This lists all the globally available tools and corresponding registration modules
        //When necessary we load only the modules required by the page, e.g. on Git PR page we only load the WIT registration plugin if  not already loaded.
        let artifactsPluginModules: IDictionaryStringTo<string> = {};
        artifactsPluginModules[Artifacts_Constants.ToolNames.WorkItemTracking.toLowerCase()] = "WorkItemTracking/Scripts/TFS.WorkItemTracking.Global.Registration";
        artifactsPluginModules[Artifacts_Constants.ToolNames.Git.toLowerCase()] = "VersionControl/Scripts/TFS.VersionControl.Registration.Artifacts";

        let modulesToBeLoaded = [];

        //Prepare a list of modules to be loaded based on artifactOrder of host and the plugins not loaded yet
        this._options.artifactOrder.forEach((order) => {
            let tool = order.tool.toLowerCase();
            let globalArtifactPlugins = TFS_ArtifactPlugins.getGlobalArtifactPlugins();
            if (!globalArtifactPlugins[tool]) {
                let modulePath = artifactsPluginModules[tool];
                //Ensure that in future if a new artifact type is introduced we do not forget to add the plugin module above
                if (!modulePath) {
                    Diag.Debug.fail(Utils_String.localeFormat("Could not find module for {0} please add to the list before continuing.", tool));
                }
                else {
                    modulesToBeLoaded.push(modulePath); //This might contain duplicates but it is ok as the check is quick in require
                }
            }
        });

        if (modulesToBeLoaded.length > 0) {
            let deferred = Q.defer<void>();

            //Load the modules
            VSS.using(modulesToBeLoaded, () => {
                this._getPluginObjects().then(() => {
                    deferred.resolve(null);
                }, (reason) => {
                    deferred.reject(reason);
                });
            });
            return deferred.promise;
        }
        else {
            return this._getPluginObjects();
        }
    }


    private _getPluginObjects(): IPromise<void> {
        let allpromises: IPromise<TFS_ArtifactPlugins.artifactPluginType>[] = [];
        let key: string;

        //Get the plugin
        let globalArtifactPlugins = TFS_ArtifactPlugins.getGlobalArtifactPlugins();
        for (key in globalArtifactPlugins) {
            if (globalArtifactPlugins.hasOwnProperty(key) && !this._plugins[key]) {
                allpromises.push(TFS_ArtifactPlugins.beginGetArtifactPlugin(key));
            }
        }

        return Q.allSettled(allpromises).then((pluginPromiseStates: Q.PromiseState<TFS_ArtifactPlugins.artifactPluginType>[]) => {
            let count: number = 0;
            let failedCount: number = 0;
            for (var i = 0; i < pluginPromiseStates.length; i++) {
                if (pluginPromiseStates[i].state === "fulfilled") {
                    var plugin = new pluginPromiseStates[i].value();
                    Diag.Debug.assert(!!plugin.supportedTool, "Supported tool is not set.");
                    if (plugin.supportedTool) {
                        var tool = plugin.supportedTool.toLowerCase();
                        if (!this._plugins[tool]) {
                            this._plugins[tool] = plugin;
                            count++;
                        }
                    }
                }
                else {
                    failedCount++;
                    VSSError.publishErrorToTelemetry({
                        name: "FailedToLoadArtifactPlugin",
                        message: pluginPromiseStates[i].reason
                    });
                }
            }
            if (failedCount > 0) {
                throw ("Failed to load some plugins.");
            }

        });
    }
    
    public static getArtifactKey(artifact: Artifacts_Services.IArtifactData): string {
        var key = artifact.uri;
        if (!key) {
            key = Artifacts_Services.LinkingUtilities.encodeUri(artifact);
        }

        return Utils_String.htmlEncode(key.toLowerCase());
    }

    /**
    * Processes the artifacts by calling individual plugins beginGetData functions
    * @param artifacts The artifacts returned by the host
    * @returns List of resolved Artifacts
    */
    private _beginResolveArtifacts(artifacts: Artifacts_Services.IArtifactData[]): IPromise<TFS_ArtifactPlugins.IArtifactDisplayData[]> {
        if (!artifacts || artifacts.length === 0 || !this._plugins) {
            return Q([]);
        }

        var hostArtifactsByTool: IDictionaryStringTo<Artifacts_Services.IArtifactData[]> = RelatedArtifactsControl._getArtifactsByTool(artifacts);

        var beginGetDataPromises: IPromise<TFS_ArtifactPlugins.IArtifactDisplayData[]>[] = [];
        for (let tool in this._plugins) {
            if (this._plugins.hasOwnProperty(tool)) {
                var plugin: TFS_ArtifactPlugins.IRelatedArtifactsPlugin = this._plugins[tool];
                if (hostArtifactsByTool[tool] && hostArtifactsByTool[tool].length > 0) {
                    beginGetDataPromises.push(plugin.beginGetDisplayData(hostArtifactsByTool[tool], this._options.tfsContext, this._hostContext.hostArtifact));
                }
            }
        }

        var resolvedArtifacts: TFS_ArtifactPlugins.IArtifactDisplayData[] = [];

        return Q.allSettled(beginGetDataPromises).then((resolutions) => {
            resolutions.forEach((resolution) => {
                if (resolution.state === "fulfilled") {
                    resolvedArtifacts = resolvedArtifacts.concat(resolution.value);
                }
                else if (resolution.state === "rejected") {
                    //Log the resolution errors
                    Diag.Debug.logInfo("beginGetData from plugin failed with error " + resolution.reason);
                    VSSError.publishErrorToTelemetry({
                        name: "UnexpectedException",
                        message: resolution.reason
                    });

                    //Not throw during context change(e.g. we throw when adding artifacts)
                    if (!this._processingContextChanged) {
                        throw resolution.reason;
                    }
                }
            });
            resolvedArtifacts = resolvedArtifacts.filter(val => val !== null);

            var resolvedArtifactsWithErrors = resolvedArtifacts.filter(val => !!val.error);
            if (resolvedArtifactsWithErrors && resolvedArtifactsWithErrors.length > 0) {
                var message = "";
                resolvedArtifactsWithErrors.forEach((resolvedArtifact: TFS_ArtifactPlugins.IArtifactDisplayData) => {
                    message = Utils_String.format("{0}Artifact: {1} - Error: {2}\n", message, resolvedArtifact.uri, JSON.stringify(resolvedArtifact.error));
                });
                VSSError.publishErrorToTelemetry({
                    name: "CouldNotResolveArtifacts",
                    message: message
                });
            }

            //filter any resolved artifacts that have errors
            resolvedArtifacts = resolvedArtifacts.filter(val => !val.error);
            
            if (resolvedArtifacts.some(val => !val.primaryData)) {
                Diag.Debug.fail("There should not be any artifacts without primary data.");
                //filter any resolved without primary data
                resolvedArtifacts = resolvedArtifacts.filter(val => !!val.primaryData);
            }

            return resolvedArtifacts;
        });
    }
}

/** The Default Artifact Renderer */
export class DefaultArtifactRenderer implements IArtifactRenderer {
    public static RA_PRIMARY_ICON_CLASS = "ra-primary-icon";
    public static RA_DATA_CLASS = "ra-artifact-data";
    public static RA_PRIMARY_DATA_CLASS = "ra-primary-data";
    public static RA_PRIMARY_DATA_ID_CLASS = "ra-primary-data-id";
    public static RA_ADDITIONAL_DATA_CLASS = "ra-additional-data";
    public static RA_ADDITIONAL_DATA_ITEM_CLASS = "ra-additional-data-item";
    public static RA_ACTION_CLASS = "ra-action";

    /**
    * Renders the given artifact
    * @param artifact The artifact to render
    * @param showAction Show action associated with the artifact
    * @returns JQuery element of rendered artifact
    */
    public render(artifact: TFS_ArtifactPlugins.IArtifactDisplayData, hostArtifact: Artifacts_Services.IArtifactData,  showAction: boolean): JQuery {
        // Container for rendered artifact
        var $artifactContainer = $("<div></div>");

        // Primary Icon
        $("<div></div>").addClass(DefaultArtifactRenderer.RA_PRIMARY_ICON_CLASS)
            .append(this._getIconSpan(artifact.primaryData.typeIcon))
            .appendTo($artifactContainer);

        // Hold rest of content for left align against primary icon
        var $dataContainer = $("<div></div>").addClass(DefaultArtifactRenderer.RA_DATA_CLASS);

        // Primary, Secondary, and Action in overridable protected methods for customization in subclasses
        // Primary Data
        this._renderPrimaryData(hostArtifact, artifact.primaryData).appendTo($dataContainer);

        // Secondary Data
        this._renderAdditionalData(artifact.additionalData).appendTo($dataContainer);

        // Optional Action
        if (showAction && artifact.action) {
            this._renderAction(artifact.action, hostArtifact).appendTo($dataContainer);
        }

        //Append data to container
        $dataContainer.appendTo($artifactContainer);
                
        return $artifactContainer;
    }

    /**
    * Renders the given data
    * @param hostArtifact The host artifact
    * @param primaryData The primary data to render
    * @returns JQuery element of rendered primaryData
    */
    protected _renderPrimaryData(hostArtifact: Artifacts_Services.IArtifactData, primaryData: TFS_ArtifactPlugins.IRelatedArtifactPrimaryData): JQuery {
        // Set up primary data container
        var $primaryData = $("<div></div>").addClass(DefaultArtifactRenderer.RA_PRIMARY_DATA_CLASS);

        // Add Identity Image
        var $imageContainer = $("<div></div>").addClass("ra-user-icon").appendTo($primaryData);
        var identity: TFS_OM_Identities.IIdentityReference;

        Diag.Debug.assert(!!primaryData.user, "primaryData.user cannot be null or undefined");
        if (primaryData.user) {
            identity = {
                id: primaryData.user.id,
                displayName: primaryData.user.displayName,
                uniqueName: primaryData.user.uniqueName
            };
        }
        else {
            identity = {
                id: "",
                displayName: "",
                uniqueName: ""
            };
        }

        // Get image url
        var imageUrl = "";
        if (identity.id || identity.uniqueName) {
            imageUrl = TFS_OM_Identities.IdentityHelper.getIdentityImageUrl(identity, TFS_OM_Identities.IdentityImageMode.ShowGenericImage, TFS_OM_Identities.IdentityImageSize.Small);
        }
        else if (primaryData.user && primaryData.user.email) {
            // Fallback to email
            // Safe to use default context here since it is just for identity image. Further use of context will require passing in from plugin 
            imageUrl = TFS_Host_TfsContext.TfsContext.getDefault().getIdentityImageUrl(null, { email: primaryData.user.email });
        }
        else {
            imageUrl = TFS_OM_Identities.IdentityHelper.getIdentityImageUrl(identity, TFS_OM_Identities.IdentityImageMode.ShowGenericImage, TFS_OM_Identities.IdentityImageSize.Small);
        }
        
        if (imageUrl) {
            let userImage = $("<img>").attr("src", imageUrl);
            if (primaryData.user) {
                var titlePrefix = "";
                if (primaryData.user.titlePrefix) {
                    titlePrefix = primaryData.user.titlePrefix + " ";
                }
                if (primaryData.user.email) {
                    userImage.attr("title", Utils_String.format("{0}{1} <{2}>", titlePrefix, identity.displayName, primaryData.user.email));
                }
                else {
                    userImage.attr("title", Utils_String.format("{0}{1}", titlePrefix, identity.displayName));
                }
            }
            userImage.appendTo($imageContainer);
        }
             
        // Optional Artifact Display Id
        if (primaryData.displayId) {
            $("<div></div>").addClass(DefaultArtifactRenderer.RA_PRIMARY_DATA_ID_CLASS)
                .attr("title", primaryData.displayId)
                .text(primaryData.displayId)
                .appendTo($primaryData);
        }

        // Title of artifact
        var $link = $("<a />").text(primaryData.title)
            .attr("title", primaryData.title)
            .attr("href", primaryData.href)
            .appendTo($primaryData);

        // add optional callback
        if (primaryData.callback) {
            $link.click(() => {
                primaryData.callback(primaryData.miscData, hostArtifact);
            });
        }

        return $primaryData;
    }

    /**
    * Renders all the given additionalData objects
    * @param additionalData array of additional data to render
    * @returns JQuery element of rendered primaryData
    */
    protected _renderAdditionalData(additionalData: TFS_ArtifactPlugins.IRelatedArtifactAdditionalData[]): JQuery {
        var $additionalDataContainer = $("<div></div>").addClass(DefaultArtifactRenderer.RA_ADDITIONAL_DATA_CLASS);

        // Add all additional Data items
        additionalData.forEach((additionalDataItem, index) => {
            var $additionalData = $("<div></div>").addClass(DefaultArtifactRenderer.RA_ADDITIONAL_DATA_ITEM_CLASS)
                .appendTo($additionalDataContainer);

            // Optional icon
            if (additionalDataItem.icon) {
                this._getIconSpan(additionalDataItem.icon).appendTo($additionalData);
            }

            // Additional Data text
            var textDiv = $("<div></div>").addClass("ra-text").attr("title", additionalDataItem.title);
            if (index === additionalData.length - 1) {
                textDiv.text(additionalDataItem.text);
            }
            else {
                // Using html for trailing space
                textDiv.html(Utils_String.format("{0},&nbsp;",additionalDataItem.text));
            }

            textDiv.appendTo($additionalData);
        });
        return $additionalDataContainer;
    }

    /**
    * Renders the given action. Override in subclass for action section customization.
    * @param additionalData array of additional data to render
    * @returns JQuery element of rendered primaryData
    */
    protected _renderAction(action: TFS_ArtifactPlugins.IRelatedArtifactAction, hostArtifact: Artifacts_Services.IArtifactData): JQuery {
        var $actionsContainer = $("<div></div>").addClass(DefaultArtifactRenderer.RA_ACTION_CLASS);
        
        // add action link
        var actionLink = $("<a />").text(action.text)
            .attr("title", action.title)
            .attr("href", action.href).appendTo($actionsContainer)

        // add optional callback
        if (action.callback) {
            actionLink.click(() => {
                action.callback(action.miscData, hostArtifact);
            });
        }
        return $actionsContainer;
    }

    /**
    * Renders the given artifact icon
    * @param artifactIcon The artifact icon to render
    * @returns JQuery element of rendered icon
    */
    protected _getIconSpan(artifactIcon: TFS_ArtifactPlugins.IArtifactIcon): JQuery {
        Diag.Debug.assert(!!artifactIcon, "artifactIcon");
        Diag.Debug.assert(!!artifactIcon.descriptor, "artifactIconDescriptor");

        var $span: JQuery = $("<span />");
        if (artifactIcon && artifactIcon.descriptor) {
            switch (artifactIcon.type) {
                case TFS_ArtifactPlugins.ArtifactIconType.colorBar: {
                    $span.addClass("ra-color-bar").css("background-color", artifactIcon.descriptor);
                    break;
                }
                case TFS_ArtifactPlugins.ArtifactIconType.colorCircle: {
                    $span.addClass("ra-color-circle").css("background-color", artifactIcon.descriptor);
                    break;
                }
                case TFS_ArtifactPlugins.ArtifactIconType.icon: {
                    $span.addClass("icon " + artifactIcon.descriptor);
                    break;
                }
                default: Diag.Debug.fail("Unsupported artifact state icon type");
            }
            if (artifactIcon.title) {
                $span.attr("title", artifactIcon.title)
            }
        }
        return $span;
    }
}

/** Options for RelatedArtifacts List Control */
export interface IRelatedArtifactsListContext {
    /** Item with key to be removed e.g. User clicked on remove icon 
     * @param key Key for the item
     */
    remove(key: string);
}

/** Control options for RelatedArtifactsList */
export interface IRelatedArtifactsListOptions {
    /** Tooltip for delete item icon */
    removeItemToolTip?: string;
}

/** Event handler signature for related artifact list control delete event  */
export interface IRelatedArtifactDeleteHandler extends IEventHandler {
    (sender: RelatedArtifactsList, eventArgs: { key: string; }): void;
}

export interface IRelatedArtifactsListItemOptions {
    /** CSS class for artifact icon to be shown */
    iconCssClass: string;

    /** Title text for artifact icon */
    iconTitle: string;

    /** Content for this list element */
    $content: JQuery;

    /** Value indicating whether a remove button should be shown for this item */
    isRemovable: boolean;
}

/** List control that provides common functionality e.g. Hover Style, Remove Icon and common List operations */
export class RelatedArtifactsList {
    private static DELETE_EVENT = "ra-delete";

    private static LIST_CLASS = "ra-list";
    private static ICON_CLASS = "ra-item-icon";
    private static ITEM_CLASS = "ra-item";
    private static ITEM_FOCUS_CLASS = "ra-item-focus";
    private static ITEM_WRAPPER_CLASS = "ra-item-wrapper";
    private static DELETE_CLASS = "ra-item-delete";

    private static ITEM_IDENTIFIER = "ra-list-key";

    private _events = new Events_Handlers.NamedEventCollection<RelatedArtifactsList, any>();

    private _$container: JQuery;
    private _options: IRelatedArtifactsListOptions;

    /**
     * Creates new instance of RelatedArtifactsListControl
     * @param $container Container to create control in
     * @param options Control options
     */

    constructor(options?: IRelatedArtifactsListOptions) {
        this._options = options || {};
        // Set default container to prevent null refs
        this._$container = $("<div></div>");
    }

    public setContainer($container: JQuery) {
        this._$container = $container;

        // Ensure container has the list class
        this._$container.addClass(RelatedArtifactsList.LIST_CLASS);
    }

    /** Attach handler for artifact delete event */
    public attachDeleteHandler(handler: IRelatedArtifactDeleteHandler) {
        this._events.subscribe(RelatedArtifactsList.DELETE_EVENT, handler);
    }

    /** Detach handler for artifact delete event */
    public detachDeleteHandler(handler: IRelatedArtifactDeleteHandler) {
        this._events.unsubscribe(RelatedArtifactsList.DELETE_EVENT, handler);
    }
    
    /** Removes the item by given key from the view
     * @param key Key for the item to be removed
     * @returns True if item could be removed, false otherwise
     */
    public remove(key: string): boolean {
        Diag.Debug.assertIsStringNotEmpty(key, "key");

        // Remove element from DOM
        var $item = this._getItem(key);
        if (!$item) {
            return false;
        }

        $item.remove();

        return true;
    }

    /** Gets the item by given key from the list
     * @param key Key for the item to be removed
     * @returns Item by the given key or null
     */
    public get(key: string): JQuery {
        return this._getItem(key);
    }
    
    /** Clears the list */
    public clear(): void {
        this._$container.empty();
    }
    
    /** Append the given item at the end 
     * @param key Key of the item to be appaned
     * @param item The item to be appended
     */
    public append(key: string, item: IRelatedArtifactsListItemOptions): void {
        Diag.Debug.assertIsStringNotEmpty(key, "key");
        Diag.Debug.assertIsNotNull(item, "item");

        if (this._itemExists(key)) {
            throw new Error(PresentationResources.RelatedArtifacts_DuplicateKey);
        }

        var $element = this._wrapItem(key, item);
        this._$container.append($element);
    }

    /** Inserts the item before the successor
     * @param index Index of item to be inserted
     * @param key Key of the item to be inserted
     * @param item The item to be appended
     */
    public insertAtIndex(index: number, key: string, item: IRelatedArtifactsListItemOptions): void {
        Diag.Debug.assertIsInteger(index, "index");
        Diag.Debug.assertIsStringNotEmpty(key, "key");
        Diag.Debug.assertIsNotNull(item, "item");

        if (this._itemExists(key)) {
            throw new Error(PresentationResources.RelatedArtifacts_DuplicateKey);
        }

        var $element = this._wrapItem(key, item);

        if (index === 0 || this.getCount() === 0) {
            $element.prependTo(this._$container);
        } else {
            $element.insertAfter(this._getItems().eq(index - 1));
        }
    }
    
    /** Gets the count of items in the list */
    public getCount(): number {
        return this.getItems().length;
    }

    /** Get list of keys in list */
    public getItems(): string[] {
        return <any>this._getItems().map(function () { return $(this).data(RelatedArtifactsList.ITEM_IDENTIFIER) }).get() || [];
    }

    protected _getItems(): JQuery {
        return this._$container.find(`.${RelatedArtifactsList.ITEM_CLASS}`);
    }

    protected _getItem(key: string): JQuery {
        var $selectedItem = this._$container.find(`div[data-${RelatedArtifactsList.ITEM_IDENTIFIER}='${key}']`).eq(0);

        return $selectedItem.length && $selectedItem || null;
    }

    protected _itemExists(key: string): boolean {
        return !!this._getItem(key);
    }

    protected _wrapItem(key: string, item: IRelatedArtifactsListItemOptions): JQuery {
        /*
        The logical generated structure is (indent means child):
            item
                [delete button]
                innerWrapper
                    content
        */

        var $listItem = $("<div></div>")
            .addClass(RelatedArtifactsList.ITEM_CLASS)
            .attr(`data-${RelatedArtifactsList.ITEM_IDENTIFIER}`, key);

        // Content
        var $innerWrapper = $("<div></div>")
            .addClass(RelatedArtifactsList.ITEM_WRAPPER_CLASS);

        $innerWrapper.append(item.$content);

        $listItem.append($innerWrapper);

        // Optional delete button
        if (item.isRemovable) {
            var $deleteButton = $("<div></div>")
                .addClass(RelatedArtifactsList.DELETE_CLASS)
                .attr("title", this._options.removeItemToolTip || PresentationResources.RelatedArtifacts_RemoveLink);

            var $deleteLink = $(`<a href="#"></a>`);
            $deleteLink.click((e: JQueryMouseEventObject) => {
                this._raiseDeleteEvent(key);

                e.preventDefault();
            });

            var $deleteIcon = $(`<span class="bowtie-icon bowtie-navigate-close"></span>`);
            $deleteLink.append($deleteIcon);

            $deleteButton.append($deleteLink);
            $listItem.append($deleteButton);
        }

        // Setup manual focus/unfocus handlers in order to react to keyboard events
        $listItem.focusin(() => {
            $listItem.addClass(RelatedArtifactsList.ITEM_FOCUS_CLASS);
        });
        $listItem.focusout(() => {
            $listItem.removeClass(RelatedArtifactsList.ITEM_FOCUS_CLASS);
        });

        return $listItem;
    }

    protected _raiseDeleteEvent(key: string) {
        this._events.invokeHandlers(RelatedArtifactsList.DELETE_EVENT, this, { key: key });
    }
}
// TFS plug-in model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.UI.Controls.ArtifactPlugins.ts", exports);
