/// <reference types="q" />
/// <reference types="requirejs" />

import Context = require("VSS/Context");
import Constants_Platform = require("VSS/Common/Constants/Platform");
import Q = require("q");
import Resources_TFSSeedFileResources = require("VSS/Resources/VSS.Resources.TFSSeedFileResources");

import VSS_Bundling_Async = require("VSS/Bundling");
import VSS_Utils_Html_Async = require("VSS/Utils/Html");

var debug = false;
var useBundles = false;
var unloadRequested = false;
var typeNameCounter = 0;

export var uiCulture: string;
export var errorHandler: ErrorHandler;
export var globalProgressIndicator: GlobalProgressIndicator;
export var globalMessageIndicator: GlobalMessageIndicator;
export var activtyStatsCollector: ActivtyStatsCollector;

var pageContext = Context.getPageContext();
if (pageContext) {
    if (pageContext.globalization) {
        uiCulture = pageContext.globalization.culture;
    }
    if (pageContext.diagnostics) {
        debug = pageContext.diagnostics.debugMode;
        useBundles = pageContext.diagnostics.bundlingEnabled;
    }
}

module moduleExceptions {
    export var ServerException = "TFS.ServerException";
}

/**
 * @param data 
 */
export function queueCallbacks(context: any, callback: IResultCallback, errorCallback: IErrorCallback, data?: any): IQueueCallbacksResult {
    var callbacks: IDictionaryNumberTo<any[]> = {};
    var initialCookie: number;
    var cbCount = 0;
    var callbackCookie = 0;
    var resultArgs: any[];
    var finished = false;
    var failed = false;

    function registerCallbacks(callback: IResultCallback, errorCallback: IErrorCallback, data: any): number {
        var cookie: number;
        if (callback || errorCallback) {
            cookie = callbackCookie++;
            cbCount++;
            callbacks[cookie] = [callback, errorCallback, data];
        }
        return cookie;
    }

    initialCookie = registerCallbacks(callback, errorCallback, data);

    function notify(): boolean {
        var cbCookie: any;
        var cbRecord: any;
        var cbIndex = finished ? 0 : (failed ? 1 : -1);
        var cb: IArgsFunctionR<any>;
        var cbData: any;
        var handled = false;

        if (cbIndex >= 0) {
            for (cbCookie in callbacks) {
                if (callbacks.hasOwnProperty(cbCookie)) {
                    cbRecord = callbacks[cbCookie];

                    cb = cbRecord[cbIndex];
                    if (cb) {
                        cbData = cbRecord[2];
                        cb.apply(context, (resultArgs || []).concat([cbData]));
                        handled = true;
                    }
                }
            }

            callbacks = {};
            cbCount = 0;
        }

        return handled;
    }

    return {
        cookie: initialCookie,
        count: function (): number {
            return cbCount;
        },
        finish: function (/*...args: any[]*/) {
            finished = true;
            resultArgs = Array.prototype.slice.call(arguments, 0);

            notify();
        },
        error: function (/*...args: any[]*/) {
            failed = true;
            resultArgs = Array.prototype.slice.call(arguments, 0);
            if (resultArgs.length === 0) {
                resultArgs = [new Error(Resources_TFSSeedFileResources.UnknownServerErrorMessage)];
            }

            if (!notify()) {
                handleError(resultArgs[0], null, context);
            }
        },
        register: function (callback: IResultCallback, errorCallback: IErrorCallback, data: any): number {
            var cookie = registerCallbacks(callback, errorCallback, data);

            if (cookie) {
                notify();
            }

            return cookie;
        },
        unregister: function (cookie) {
            cbCount--;
            delete callbacks[cookie];
        }
    };
}

export interface IQueueCallbacksResult {
    cookie: number;
    count: IFunctionPR<void, number>;
    finish: IArgsFunctionR<void>;
    error: IArgsFunctionR<void>;
    register: (callback: IResultCallback, errorCallback: IErrorCallback, data: any) => number;
    unregister: (cookie: number) => void;
}

/**
 * Queues a request for a piece of data.  Handles situations where the data has already been
 * retrieved as well as when multiple requests are pending for the same data.  When the data has
 * already been retrieved, the successCallback will be invoked immediately.  When multiple
 * requests are pending for the same data, each of the callers will be notified when the data
 * request has been completed (worker will only be invoked once).
 * 
 * Sample usage:  This will invoke the worker function using the current object as the context.  The "_teamSettings"
 *                property of the current object will be checked for a value before invoking the worker.  If the value
 *                needs to be looked up, the worker will be invoked and it will make a request for the data.  If the
 *                request is completed successfully the data is passed to the succeeded callback.  If there is an error
 *                with the request the failed callback is invoked.
 * 
 *     queueRequest(this, this, "_teamSettings", successCallback, errorCallback,
 *         function (succeeded, failed) {
 *             Ajax.getMSJSON(url, null, function (teamSettings) {
 *                 succeeded(teamSettings);
 *             }, failed);
 *         });
 * 
 * @param context The "this" that the worker and successCallback functions will be invoked with.
 * @param target 
 * The object which the propName property should be checked on to see if the request has already been performed.
 * If the property has a value (that is not a function), then the success callback is invoked immediately with the properties value as the result.
 * If the property does not have a value, the request is processed and the result is stored in the property.
 * 
 * @param propName Name of the property on the target to store the result in and check to see if the request is needed.
 * @param successCallback Function invoked when the request is completed.  The function should take the "result" as its first parameter.
 * @param errroCallback Function invoked when the request has completed with an error. The function should take the "error" as its first parameter.
 * @param worker 
 * This is the which performs the work to retrieve the data.  The function should have the following signature:
 *     function worker(succeeded, failed)
 * 
 * The worker should invoke the "succeeded" function that it is provided passing it the result.  If an error occurs the worker should invoke the
 * "failed" function with the error.
 * 
 * NOTE: It is important to note that the "successCallback" is not the same as the "succeeded" callback provided to the worker
 *       function.  It is important for the worker to invoke the callbacks it is provided with rather than the callbacks which are
 *       provided to the queueRequest method.  The same holds true for the failed callback provided to the worker function.
 * 
 */
export function queueRequest(context: any, target: any, propName: string, successCallback: IResultCallback, errorCallback: IErrorCallback, worker: IResultCallback) {

    var result: any = target[propName];
    var queue: IQueueCallbacksResult;

    function succeeded(result: any) {
        target[propName] = result;
        queue.finish(result);
    }

    function failed(error: Error) {
        target[propName] = null;
        queue.error(error);
    }

    if (worker && result === null || typeof result === "undefined") {
        queue = queueCallbacks(context, successCallback, errorCallback);
        target[propName] = queue.register;

        worker.call(context, succeeded, failed);
    }
    else if ($.isFunction(result)) {
        //result is our queue register function. add our callbacks to the queue
        result(successCallback, errorCallback);
    }
    else if ($.isFunction(successCallback)) {
        successCallback.call(context, result);
    }
}

/**
 * Checks if a queued request has been completed.
 * 
 * @param cachedResult The property passed to queueRequest as target[propName]
 */
export function queuedRequestHasResult(cachedResult: any): boolean {
    return cachedResult !== null && cachedResult !== undefined && !$.isFunction(cachedResult);
}

export function getErrorMessage(errorString: string): string;
export function getErrorMessage(errorFunction: Function): string;
export function getErrorMessage(error: Error): string;
export function getErrorMessage(error: any): string {
    if (error) {
        if (typeof error === "string") {
            return error;
        }
        else if ($.isFunction(error)) {
            return getErrorMessage(error());
        }
        else if (error.message) {
            return error.message;
        }
        else if (error.description) {
            return error.description;
        }
        else {
            return error.toString();
        }
    }
    else {
        return Resources_TFSSeedFileResources.UnknownErrorMessage;
    }
}

export interface errorPublisher {
    publishError(error: TfsError): void;
}

var PromiseErrorCapturePeriod = 5000;

export class ErrorHandler {
    //fields
    public $error: JQuery = null;
    public visible = false;
    private _errorPublishers: errorPublisher[] = [];
    /**
     * Global error handler class which is attached to TFS
     */
    constructor() {
    }
    //methods
    /**
     * (Internal function) Initializes error handler
     */
    public initialize() {

        var that = this;
        this.attachWindowErrorHandler();
        if (!(<any>window)._disableQPromiseErrorHandler) {
            // We do not want to attach this error handler in a L0 Test environment
            this.attachQPromiseErrorHandler();
        }
        this.$error = $(".error-section");
        if (this.$error.length === 0) {
            // If there is no error section defined in the current document, just append one at the end,
            // it's an absolutely positioned overlay.
            this.$error = $("<div>").addClass("error-section").appendTo($("body"));
        }

        this.$error.bind("keydown", function (e: JQueryEventObject) {
            // Closing error panel when escape key is pressed
            if (e.keyCode === 27) { // escape key
                that.hideError();
                return false;
            }
        });
    }

    private attachWindowErrorHandler() {
        var originalHandler: ErrorEventHandler;

        /**
        * Logs the error
        */
        var onerror = (errorMsg: string, source: string, lineNumber: number, columnNumber?: number, errorObject?: any) => {
            if (columnNumber) {
                var details: TfsError = {
                    name: (errorObject && errorObject.name) || errorMsg,
                    message: (errorObject && (errorObject.message || errorObject.description)) || errorMsg,
                    source: source,
                    lineNumber: lineNumber,
                    columnNumber: columnNumber,
                    stack: (errorObject && errorObject.stack) || "",
                    errorType: "UnhandledException"
                };

                this.publishError(details);
            }

            if (originalHandler) {
                return originalHandler.apply(this, [errorMsg, source, lineNumber, columnNumber, errorObject]);
            }

            return false;
        }
        /**
        * Global window error handler class which is attached to TFS
        */
        originalHandler = window.onerror;
        window.onerror = <any>onerror;
    }

    public static get ignoreRejectedPromiseTag(): string { return "__ignoreRejectionOk__"; }

    private attachQPromiseErrorHandler(): void {
        var unhandledQPromiseErrorHandler = () => {
            var reasons = (<any>Q).getUnhandledReasons();
            if (reasons && reasons.length) {
                (<any>Q).resetUnhandledRejections();
                reasons.forEach((e) => {
                    e = e || "";

                    // if the rejection reason (when converted to a string) contains this magic 
                    // value, don't report it
                    if (e.indexOf && e.indexOf(ErrorHandler.ignoreRejectedPromiseTag) >= 0) {
                        return;
                    }

                    var error: TfsError = {
                        name: "UnhandledQRejection",
                        message: (e.message || e.description) || e,
                        stack: e.stack || e,
                        errorType: "UnhandledQRejection"
                    }
                    //log it to console
                    if (window.console) {
                        console.warn(e);
                    }

                    //Publish it to CI
                    this.publishError(error);
                });
            }
            window.setTimeout(unhandledQPromiseErrorHandler, PromiseErrorCapturePeriod);
        }
        unhandledQPromiseErrorHandler();
    }

    private publishError(error: TfsError) {
        $.each(this._errorPublishers, (index, errorPublisher) => {
            errorPublisher.publishError(error);
        });
    }

    /**
     * (Internal function) Checks whether error container exists or not
     */
    public exists(): boolean {
        return this.$error.length > 0;
    }

    /**
     * (Internal function) Shows error in the container
     */
    public showError(message: string, status?: string, stackTrace?: string) {
        var that = this;
        var $c: JQuery;
        var $errorElement: JQuery;
        var sessionId = pageContext && pageContext.diagnostics && pageContext.diagnostics.sessionId || "";

        function $createErrorElement($parent: JQuery) {
            var msg = "";
            if (status) {
                msg = status + ": ";
            }

            if (message) {
                msg = msg + message;
            }

            $errorElement = $("<div />").appendTo($parent);
            const $messageElement = $("<div />");
            const $stackElement = $("<textarea />").attr("readonly", "readonly");
            if (stackTrace) {
                $stackElement.text(stackTrace);
            }
            if (msg) {
                $messageElement.text(msg);
            }
            $messageElement.appendTo($errorElement);
            $stackElement.appendTo($errorElement);
            if (sessionId) {
                $("<pre />").text(Resources_TFSSeedFileResources.SessionInfoMessage.replace("{0}", sessionId)).appendTo($errorElement);
            }
        }

        if (!this.visible) {
            this.visible = true;

            this.$error.empty();

            const $header = $("<div />").addClass("header").appendTo(this.$error);

            // Creating close link
            $("<div tabIndex=0 />").addClass("close").attr("role", "button").attr("aria-label", Resources_TFSSeedFileResources.CloseErrorWindow).text(Resources_TFSSeedFileResources.ErrorPaneCloseLink).appendTo($header)
                .click(function () {
                    that.hideError();
                })
                .keydown(function (e: KeyboardEvent) {
                    // Closing dialog when enter key is pressed when this div has the focus
                    if (e.which === 13 || e.which === 32) { // enter or space key
                        that.hideError();
                        return false;
                    }
                });

            // Creating message panel
            $c = $("<div />").addClass("message").attr("id", "vssGlobalError").appendTo(this.$error);
            $("<h4 />").attr("id", "vssGlobalErrorTitle").text(Resources_TFSSeedFileResources.ErrorPaneHeader).appendTo($c);
            $("<div />").addClass("error-list").appendTo($c);

            // Accessibility
            this.$error.attr({
                role: "alertdialog",
                "aria-describedby": "vssGlobalError",
                "aria-labelledby": "vssGlobalErrorTitle"
            });
        }

        $createErrorElement($("div.error-list", this.$error));

        this.$error.show()
            .focus(); // Setting the focus in case user wants to close this error panel by hitting esc key
    }

    /**
     * (Internal function) Hides the error when clicked
     */
    public hideError() {
        $("p", this.$error).remove();
        this.$error.hide();
        this.visible = false;
    }
    /**
     * Displays error in a container. If no container is found, error
     * message is displayed in an alert dialog
     */
    public show(error: TfsError) {
        error["errorType"] = "ExceptionFromErrorHandler";
        this.publishError(error);
        if (this.exists()) {
            this.showError(error.message || (<any>error).description, error.status, error.stack);
        }
        else {
            alert(error.message);
        }
    }

    /**
     * Add error publisher to ErrorHander class
     */
    public attachErrorPublisher(errorPublisher: errorPublisher) {
        if ($.inArray(errorPublisher, this._errorPublishers) === -1) {
            this._errorPublishers.push(errorPublisher);
        }
    }

    /**
     * Remove error publisher to ErrorHander class
     */
    public detachErrorPublisher(errorPublisher: errorPublisher) {
        var index = $.inArray(errorPublisher, this._errorPublishers);
        if (index !== -1) {
            this._errorPublishers.splice(index, 1);
        }
    }
}

errorHandler = new ErrorHandler();

/**
 * @param callback 
 * @param context 
 */
export function handleError(error: TfsError, callback?: IErrorCallback, context?: any) {

    if ($.isFunction(callback)) {
        callback.call(context, error);
    }
    else {
        errorHandler.show(error);
    }
}

/**Remove in M91 **/
export class ClientActivtyStatistic {
    public name: string;
    public id: string;
    public parentId: string;
    public startOffset: number;
    public duration: number;

    constructor() {

    }
}

export class ActivtyStatistic {
    public name: string;
    public id: string;
    public parentId: string;
    public status: number;
    public actionDate: Date;

    constructor() {

    }
}

export interface ActivtyStatsCollectionAllowedCallback {
    (): boolean;
}

export class ActivtyStatsCollector {
    public static ACTIVITY_COLLECTION_STATUS = "TFS.ActivityCollectionStatus";
    public static ACTIVITY_ID_STORAGE_ITEM = "TFS.ActivityIdStats";
    public static ACTIVITY_CLIENT_STATE_STORAGE_ITEM = "TFS.ClientActivityIdStats";
    public static CURRENT_PAGE = "TFS.CurrentPageActivity";

    /**
     * Global handler for logging activity data
     */
    constructor() {

    }

    public addActivtyStatsCollectionAllowedCallback(activtyStatsCollectionAllowedCallback: ActivtyStatsCollectionAllowedCallback) {

    }

    public actionStarted(name: string): number {
        return 0;
    }

    public actionCompleted(id: number, jqXHR: JQueryXHR) {

    }

    public logActivity(activityId: string, page: string) {

    }

    public getClientStatistics(): IDictionaryStringTo<ClientActivtyStatistic[]> {
        return {};
    }

    public getActivtyStatistics(): ActivtyStatistic[] {
        return [];
    }

    public clearStats() {

    }

    public collectStats(shouldCollect: boolean) {

    }

    public getCurrentPage(): ActivtyStatistic {
        return null;
    }

    public setCurrentPage(currentPage: ActivtyStatistic): void {

    }

    public isCollectingStats(): boolean {
        return false;
    }
}

activtyStatsCollector = new ActivtyStatsCollector();

export class GlobalProgressIndicator {
    //fields
    private _progressPendingActions: IDictionaryNumberTo<string> = null;
    private _progressPendingActionsCount = 0;
    private _progressPendingActionsNewId = 0;
    private _pageProgressElements: JQuery[] = null;
    private _pageProgressDelayShowTimeout: number = null;
    private _pageProgressMinShowTimeout: number = null;
    private _showingProgress = false;

    /**
     * Global handler for displaying progress during page loads, module_ loads, ajax requests, or any other registered long-running operations
     */
    constructor() {

        var that = this;
        this._progressPendingActions = {};
        this._pageProgressElements = [];

        $(function () {
            // Find indicators on the page (by class) on page ready
            var pageProgressIndicators = $(".pageProgressIndicator");
            if (pageProgressIndicators.length > 0) {
                that._addProgressElement(pageProgressIndicators);
            }
        });
    }
    //methods
    public getProgressElements(): JQuery[] {
        return this._pageProgressElements;
    }

    public registerProgressElement(element: JQuery) {
        this._addProgressElement(element);
        if (this._showingProgress) {
            element.css("visibility", "visible");
        }
        else {
            element.css("visibility", "hidden");
        }
    }

    public unRegisterProgressElement(element: JQuery) {
        if (this._pageProgressElements) {
            var i = 0;
            for (i = 0; i < this._pageProgressElements.length; i++) {
                if (this._pageProgressElements[i] === element) {
                    this._pageProgressElements.splice(i, 1);
                    break;
                }
            }
        }
    }

    private _addProgressElement(element: JQuery) {
        this._pageProgressElements.push(element);
    }

    private _showProgressElements() {
        var that = this;
        var progressElements = this._pageProgressElements;

        if (this._progressPendingActionsCount === 0) {
            return;
        }

        this._showingProgress = true;

        if (progressElements.length === 0) {
            return;
        }

        $.each(progressElements, function (i: number, element: JQuery) {
            element.css("visibility", "visible");
        });

        if (!this._pageProgressMinShowTimeout) {
            this._pageProgressMinShowTimeout = window.setTimeout(function () {
                that._pageProgressMinShowTimeout = null;
                if (that._progressPendingActionsCount === 0) {
                    that._hideProgressElements();
                }
            }, 250);
        }
    }

    private _hideProgressElements() {
        this._showingProgress = false;
        $.each(this._pageProgressElements, function (i: number, element: JQuery) {
            element.css("visibility", "hidden");
        });
    }

    public actionStarted(name: string, immediate?: boolean): number {
        var id = ++this._progressPendingActionsNewId;
        this._progressPendingActions[id] = name;

        if (this._progressPendingActionsCount++ === 0) {
            if (immediate === true) {
                if (this._pageProgressDelayShowTimeout) {
                    window.clearTimeout(this._pageProgressDelayShowTimeout);
                    this._pageProgressDelayShowTimeout = null;
                }
                this._showProgressElements();
            }
            else if (!this._pageProgressDelayShowTimeout) {
                this._pageProgressDelayShowTimeout = window.setTimeout(() => {
                    this._pageProgressDelayShowTimeout = null;
                    this._showProgressElements();
                }, 250);
            }
        }

        return id;
    }

    public actionCompleted(id: number) {
        delete this._progressPendingActions[id];
        if (--this._progressPendingActionsCount === 0 && !this._pageProgressMinShowTimeout) {
            this._hideProgressElements();
        }
    }

    public getPendingActions(): string[] {
        var actionNames: string[] = [];
        $.each(this._progressPendingActions, function (id: number, name: string) {
            actionNames.push(id + ": " + name);
        });
        return actionNames;
    }
}

globalProgressIndicator = new GlobalProgressIndicator();

$(window).bind("beforeunload", function () {
    unloadRequested = true;
});

$(function () {
    var actionId = globalProgressIndicator.actionStarted("Initial page load", true);
    errorHandler.initialize();
    globalProgressIndicator.actionCompleted(actionId);
});

export function hasUnloadRequest(): boolean {
    return unloadRequested;
}

const globalMessageClassName = "global-message-section";

export enum GlobalMessagePosition {
    default = 0,
    top = 1
}

export class GlobalMessageIndicator {

    public updateGlobalMessageIfEmpty(message: string, messageLevel = "warning", customIcon?: string, onDismiss?: () => void, position?: GlobalMessagePosition): HTMLElement {

        // No-op on a new platform page. The IGlobalMessagesService should be used in the new platform.
        if (!$("." + globalMessageClassName).length && (!(window as any).LWL || $("body.my-experience-page").length)) {

            let messageLevelClass = "message-level-" + messageLevel;
            let iconClass = customIcon ? customIcon : ("bowtie-status-" + messageLevel);

            let globalMessageSection = $("<div>").addClass(globalMessageClassName).addClass(messageLevelClass).addClass("bowtie-fabric nav-global-message");
            let iconSection = $("<span class='message-level-icon bowtie-icon'></span>").addClass(iconClass);
            let messageSection = $("<span class='message-section' />");

            if (message) {
                requireModules(["VSS/Utils/Html"]).spread((_VssUtilsHtml: typeof VSS_Utils_Html_Async) => {
                    let sanitizedMessage = _VssUtilsHtml.HtmlNormalizer.normalize(message);
                    messageSection.html(sanitizedMessage);
                });
            }

            globalMessageSection.append(iconSection);
            globalMessageSection.append(messageSection);

            // Add a dismiss section if a dimiss handler exists
            if (onDismiss) {
                let dismissSection = $("<span tabIndex=0 class='dimiss-section bowtie-icon bowtie-navigate-close' role='button'></span>")
                    .attr("aria-label", Resources_TFSSeedFileResources.Dismiss)
                    .click(function () {
                        if (onDismiss) {
                            onDismiss();
                        }
                    })
                    .keydown(function (e: KeyboardEvent) {
                        // Closing dialog when enter key is pressed when this element has the focus
                        if (e.which === 13 || e.which === 32) { // enter or space key
                            if (onDismiss) {
                                onDismiss();
                            }
                            return false;
                        }
                    });
                globalMessageSection.append(dismissSection);
            }

            if (position && position === GlobalMessagePosition.top) {
                globalMessageSection.addClass(GlobalMessagePosition[GlobalMessagePosition.top].toLowerCase());
                $("body").prepend(globalMessageSection);
            }
            else {
                globalMessageSection.insertBefore(".main .content-section");
            }

            return globalMessageSection[0];
        }
        else {
            return null;
        }
    }

    public clearGlobalMessages() {
        $(".global-message-section").remove();
    }
}

globalMessageIndicator = new GlobalMessageIndicator();

function wrapFunction(fn: Function, superFn: Function, base: Function, baseConstructor: Function): Function {
    return function () {
        var oldBase = this.base, oldBaseConstructor = this.baseConstructor, oldSuper = this._base;
        this.base = base;
        this.baseConstructor = baseConstructor;

        this._base = function () {
            return superFn.apply(this, Array.prototype.slice.call(arguments, 0));
        };

        try {
            return fn.apply(this, Array.prototype.slice.call(arguments, 0));
        }
        finally {
            this.base = oldBase;
            this.baseConstructor = oldBaseConstructor;
            this._base = oldSuper;
        }
    };
}

function extendMembers(target: any, source: any, base: Function, baseConstructor: Function) {
    var propName: string;
    var prop: any;

    for (propName in source) {

        // The type name property should not be cloned since deriving types should have their own unique type name
        if (propName !== "__name" && source.hasOwnProperty(propName)) {
            prop = source[propName];

            if (base && typeof prop === "function" && typeof base[propName] === "function") {
                target[propName] = wrapFunction(prop, base[propName], base, baseConstructor);
            }
            else {
                target[propName] = prop;
            }
        }
    }

    return target;
}

/**
 * Set up classical style inheritance
 * 
 * @param baseClass Parent object (function)
 * @param newPrototype Child object (function).  Typically an inline function.
 */
Function.prototype["inherit"] = function (baseClass: Function, newPrototype: any) {
    var base: any;
    var thisPrototype: any;
    var baseConstructor: Function;

    //Extend static members
    extendMembers(this, $.extend({}, baseClass, this), baseClass, baseClass);
    this.base = baseClass;
    this._super = baseClass.prototype;

    newPrototype = $.extend({}, this.prototype, newPrototype);

    base = baseClass.prototype;
    base.constructor = baseClass;
    baseConstructor = base.baseConstructor;

    function F() { }

    F.prototype = base;
    thisPrototype = new F();

    //Extend regular members
    extendMembers(thisPrototype, newPrototype, base, baseConstructor);

    this.prototype = thisPrototype;
    this.prototype.constructor = this;

    if (baseConstructor) {
        // If there is a base contructor, wrap it so it get's called when child constructor is called
        this.prototype.baseConstructor = wrapFunction(baseClass, baseConstructor, base, baseConstructor);
    }
    else {
        this.prototype.baseConstructor = baseClass;
    }
};

/**
 * Adds static members to functions.
 * 
 * @param staticMembers An object which properties ultimately be static members of the function.
 */
Function.prototype["extend"] = function (staticMembers: any): any {
    return extendMembers(this, staticMembers, this.base, this.baseConstructor);
};

export function classExtend(ctor: any, members: any): any {
    extendMembers(ctor, members, null, null);
}

export function getTypeName(type: any): string {
    var name: string;
    var f: string;

    if (!type.hasOwnProperty("__name")) {
        type.__name = "_type_" + (typeNameCounter++);

        if (debug) {
            name = type.name;

            if (!name) {
                f = type.toString();
                name = f.substring(9, f.indexOf("("));
            }

            if (name) {
                type.__name += "_" + name;
            }
        }
    }

    return type.__name;
}

export function initClassPrototype(ctor: Function, members: any) {
    var propName: string;
    var prop: any;

    for (propName in members) {
        // The type name property should not be cloned since deriving types should have their own unique type name
        if (propName !== "__name" && members.hasOwnProperty(propName)) {
            prop = members[propName];
            ctor.prototype[propName] = prop;
        }
    }
}

var bases: IDictionaryStringTo<string> = {};

if (typeof _bases !== "undefined" && _bases.length > 0) {
    $.each(_bases, function (i: number, b: IWebAccessPluginBase) {
        bases[b.namespace] = b.base;
    });
}

if (typeof _builtInBases !== "undefined" && _builtInBases.length > 0) {
    $.each(_builtInBases, function (i: number, b: IWebAccessPluginBase) {
        bases[b.namespace] = b.base;
    });
}

export function getModuleBase(moduleName: string): string {
    var base: string;
    var pos: number;

    if (bases) {
        base = bases[moduleName];

        if (!base) {
            pos = moduleName.lastIndexOf(".");
            if (pos > 0) {
                return getModuleBase(moduleName.substring(0, pos));
            }
        }
    }

    return base || "";
}

function getModulePath(moduleName: string): string {
    return getModuleBase(moduleName) + moduleName;
}

var moduleDependencies: IDictionaryStringTo<string[]> = {};
var disabledPluginsMap: IDictionaryStringTo<boolean> = {};
var pluginsMap: IDictionaryStringTo<string> = {};
var loadedModules: IDictionaryStringTo<boolean> = {};

var modulePluginsCallbacks: IDictionaryStringTo<Function[]> = {};
var fullyLoadedModules: IDictionaryStringTo<boolean> = {};

function defineModuleDependency(loadAfter: string, moduleToLoad: string) {
    var modules = moduleDependencies[loadAfter];

    pluginsMap[moduleToLoad] = loadAfter;

    if (!modules) {
        modules = [];
        moduleDependencies[loadAfter] = modules;
    }

    if (moduleToLoad.indexOf("/") < 0) {
        var modulePath = getModulePath(moduleToLoad);
        modules.push(modulePath);
    }
    else {
        modules.push(moduleToLoad);
    }
}

if (typeof _disabledPlugins !== "undefined") {
    $.each(_disabledPlugins, function (i: number, pname: string) {
        disabledPluginsMap[pname] = true;
    });
}

if (typeof _plugins !== "undefined" && _plugins.length > 0) {
    $.each(_plugins, function (i: number, p: IWebAccessPlugin) {
        if (!(p.namespace in disabledPluginsMap)) {
            defineModuleDependency(p.loadAfter, p.namespace);
        }
    });
}

if (typeof _builtinPlugins !== "undefined" && _builtinPlugins.length > 0) {
    $.each(_builtinPlugins, function (i: number, p: IWebAccessPlugin) {
        if (!(p.namespace in disabledPluginsMap)) {
            defineModuleDependency(p.loadAfter, p.namespace);
        }
    });
}

/**
* Options for which modules to include in any dynamic bundle calls for exclusion. The
* default is 'AllLoadedModules' which ensures the minimum set of scripts are included
* in the bundle. This results in smaller bundles, but most-likely unique bundles across
* different pages, as they will likely each have a unique set of already-loaded scripts.
* The 'CommonModules' option ensures that the bundle will be the same across all pages.
*/
export enum DynamicModuleExcludeOptions {
    /**
    * No modules are excluded. The resulting bundle is guaranteed to have the requested script and all dependencies.
    */
    NoExcludes = 0,

    /**
    * Modules from the common bundle are excluded. The resulting bundle should be the same across pages (given that the common bundle is the same across pages).
    */
    CommonModules,

    /**
    * Modules from the common and area bundles are excluded. The resulting bundle should be the same across pages where the same area module is loaded.
    */
    CommonAndAreaModules,

    /**
    * Modules from the common, area and view bundles are excluded. The resulting bundle should be always same on the particular page (may differ in other page).
    */
    AllPageBundles,
}

/**
* Options for async require modules call
*/
export interface IModuleLoadOptions {
    /**
    * Options for which modules to include in any dynamic bundle calls for exclusion.
    */
    excludeOptions?: DynamicModuleExcludeOptions;
}

/**
* Issue a require statement for the specified modules and invoke the given callback method once available.
* This is a wrapper around the requireJS 'require' statement which ensures that the missing modules are
* pulled in via the minimum number of resource requests.
*
* @param moduleNames An array of AMD modules to asynchronously require.
* @param callback Function to invoke when all the specified the modules are loaded.
* @param errorCallback Function to invoke if an error occurs during the load of the modules.
*/
export function using(moduleNames: string[], callback: Function, errorCallback?: Function) {
    if (useBundles) {
        require(["VSS/Bundling"], (VSS_Bundling) => {
            VSS_Bundling.requireModules(moduleNames).spread(function () {
                callback.apply(this, arguments);
            }, errorCallback);
        }, errorCallback);
    }
    else {
        // Bundling disabled - invoke the require method directly
        require(moduleNames, callback, errorCallback);
    }
}

/**
* Issue a require statement for the specified modules and invoke the given callback method once available.
* This is a wrapper around the requireJS 'require' statement which ensures that the missing modules are
* pulled in via the minimum number of resource requests. Rather than taking a callback, this method returns
* a promise for the resolved modules (as an array).
*
* @param moduleNames An array of AMD modules to asynchronously require
*/
export function requireModules(moduleNames: string[], options?: IModuleLoadOptions): Q.Promise<any> {
    return Q.Promise((resolve, reject) => {
        if (useBundles) {
            require(["VSS/Bundling"], (VSS_Bundling: typeof VSS_Bundling_Async) => {
                VSS_Bundling.requireModules(moduleNames, options).spread(function () {
                    resolve(arguments);
                }, reject);
            }, reject);
        }
        else {
            // Bundling disabled - invoke the require method directly
            require(moduleNames, function () {
                resolve(arguments);
            }, reject);
        }
    });
}

exports["module"] = function (moduleName: string, moduleDependencies: string[], moduleFunc: () => any) {
    var deps: string[] = [];

    for (var i = 0; i < moduleDependencies.length; i++) {
        deps.push(getModulePath(moduleDependencies[i]));
    }

    let def = define;
    def(deps, () => {
        var moduleBody = moduleFunc();

        tfsModuleLoaded(moduleName, moduleBody);
    });
};

function defineNamespace(namespace: string, body: any): any {
    var nameParts = namespace.split("."),
        i: number,
        root = window,
        ns: any,
        prop: string;

    for (i = 0; i < nameParts.length; i++) {
        ns = root[nameParts[i]];

        if (!ns) {
            ns = {};
            root[nameParts[i]] = ns;
        }

        root = ns;
    }

    if (ns && body) {
        for (prop in body) {
            if (body.hasOwnProperty(prop)) {
                ns[prop] = body[prop];
            }
        }
    }

    return ns;
}

/**
 * Listen to the load complete of a module's all plugins.
 * 
 * @param moduleName Name of the module (Not the full name, instead the name specified in VSS.tfsModuleLoaded).
 * @param callback A function to execute when all the plugins of a module loaded.
 */
export function modulePluginsLoaded(moduleName: string, callback: Function): void {
    // If no valid function specified, skip
    if (typeof callback !== "function") {
        return;
    }

    // Plugins might have already been loaded (or no plugins exist at all). 
    // Execute the callback immediately in this case
    if (fullyLoadedModules[moduleName] === true) {
        callback();
        return;
    }

    // Plugins not loaded yet, add to the list for later execution
    let callbacks = modulePluginsCallbacks[moduleName];
    if (!Array.isArray(callbacks)) {
        callbacks = [];
        modulePluginsCallbacks[moduleName] = callbacks;
    }

    callbacks.push(callback);
}

/**
 * Function called when all plugins of a module are loaded.
 * 
 * @param moduleName Name of the module.
 */
function moduleFullyLoaded(moduleName: string): void {
    // Mark this module as fully loaded
    fullyLoadedModules[moduleName] = true;

    // Execute any callbacks in the queue
    let callbacks = modulePluginsCallbacks[moduleName];
    if (Array.isArray(callbacks)) {
        callbacks.forEach(cb => cb());

        // Release the callbacks since not needed anymore
        delete modulePluginsCallbacks[moduleName];
    }
}

export function tfsModuleLoaded(moduleName: string, moduleExports: any) {

    var modulesToLoad = moduleDependencies[moduleName];

    loadedModules[moduleName] = true;

    defineNamespace(moduleName, moduleExports);

    if (modulesToLoad) {
        using(modulesToLoad, function () {
            // Perform post load operations after plugins are loaded
            moduleFullyLoaded(moduleName);
        });

        delete moduleDependencies[moduleName];
    }
    else {
        // Perform post load operations even there are no plugins
        moduleFullyLoaded(moduleName);
    }
}

tfsModuleLoaded("TFS", exports);
