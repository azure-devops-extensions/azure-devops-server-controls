
// *********************************************************************************
//
// *** IMPORTANT ***
//
// This module is deprecated. All Api calls should go through a WebApi http client.
// This exists only to reference old Web Access MVC api endpoints. All new features
// should contribute WebApi REST endpoint.
//
// No additional consumers should reference this module.
//
// *********************************************************************************

import Service = require("VSS/Service");
import Diag_Services = require("VSS/Diag/Services");
import VSS = require("VSS/VSS");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");

export interface IAjaxRequestContext {
    isComplete: boolean;
    requestId: number;
    options?: IAjaxRequestContextOptions;
    progressActionId?: number;
    showTimer?: Utils_Core.DelayedFunction;
    xhr?: any;
}

export interface IAjaxRequestContextOptions extends JQueryAjaxSettings {
    wait?: IAjaxWaitOptions;
    showGlobalProgressIndicator?: boolean;
    tracePoint?: string;
    callback?: IArgsFunctionR<any>;
}

export interface IAjaxWaitOptions {
    entireWindow?: boolean;
    element?: JQuery;
    msgElement?: JQuery;
    target?: JQuery;
    showDelay?: number;
    end?: IArgsFunctionR<void>;
    fade?: boolean;
    timeout?: Utils_Core.DelayedFunction;
    image?: string;
    message?: string;
    backgroundcolor?: string;
    minLifetime?: number;
}

export var unloading = false;
export var unloadRequested = false;
var requestId = 1;
var defaultTimeout = 300000;
var timeout = defaultTimeout;
var handleError = VSS.handleError;
var requests: IDictionaryNumberTo<IAjaxRequestContext>;
export var startWait: IFunctionPR<IAjaxRequestContext, void>;
export var endWait: IFunctionPR<IAjaxRequestContext, void>;
var showWait: IFunctionPR<IAjaxRequestContext, void>;
var globalAjaxConfig = {
    allowArrayResult: false,
    byPassAntiForgery: false
};
var httpClientActivityIdsByRequest: IDictionaryNumberTo<number> = {};


export module Exceptions {
    export var AjaxException = "TFS.Core.Ajax.AjaxException";
    export var AjaxTimeoutException = "TFS.Core.Ajax.AjaxTimeoutException";
    export var NetworkException = "TFS.Core.Ajax.NetworkException";
}

requests = {};

var Error_ajax = function (xhr: JQueryXHR, status: string): Error {
    var err: any = new Error(Utils_String.format(VSS_Resources_Common.AjaxRequestFailedWithStatus, status));
    err.name = Exceptions.AjaxException;
    err.response = xhr.responseText;
    err.xhr = xhr;
    return err;
};

var Error_ajaxTimeout = function (xhr: JQueryXHR): Error {
    var err: any = new Error(VSS_Resources_Common.AjaxRequestTimedOut);
    err.name = Exceptions.AjaxTimeoutException;
    err.status = xhr.status;
    err.xhr = xhr;
    return err;
};

var Error_network = function (xhr: JQueryXHR): Error {
    var err: any = new Error(VSS_Resources_Common.NetworkConnectionUnavailable);
    err.name = Exceptions.NetworkException;
    err.status = xhr.status;
    err.xhr = xhr;
    return err;
};

/**
 * Determine if the response came from a location that was not the actual content we requested.
 *  Note: X-Tfs-Location will have the actual location the content was returned from.
 */
export function endRequest(data: any, textStatus: string, xhr: JQueryXHR, callback: IResultCallback, requestContext: IAjaxRequestContext) {


    var targetLocation: string;
    var replyLocationStart: number;
    var replyLocationEnd: number;
    var newLocation: string;

    Diag.logTracePoint("Ajax.response-received", requestContext.requestId);

    //finsh logging activity data
    Service.getLocalService(Diag_Services.ActivityStatsCollector).actionCompleted(httpClientActivityIdsByRequest[requestContext.requestId], xhr);
    delete httpClientActivityIdsByRequest[requestId];

    // Mark the request as being complete.
    requestContext.isComplete = true;

    delete requests[requestContext.requestId];

    // End any active wait session associated with this request
    if (requestContext.options !== null && requestContext.options !== undefined &&
        requestContext.options.wait !== null && requestContext.options.wait !== undefined) {
        endWait(requestContext);
    }

    // Determine if the response came from a location that was
    // not the actual content we requested.
    // Note: X-Tfs-Location will have the actual location the
    // content was returned from.
    if (textStatus !== 'timeout' && xhr && xhr.status === 203) {

        targetLocation = xhr.getResponseHeader('X-Tfs-Location');
        if (targetLocation) {

            // If the document contains a replyTo we need to replace
            // it with our location
            replyLocationStart = targetLocation.indexOf('reply_to=');
            if (replyLocationStart !== -1) {
                replyLocationEnd = targetLocation.indexOf('&', replyLocationStart);

                // Replace the current reply with the current location
                newLocation = targetLocation.substring(0, replyLocationStart);
                if (replyLocationEnd !== -1) {
                    newLocation += targetLocation.substring(replyLocationEnd);
                }

                // Trim an trailing &'s from the current URL.
                while (newLocation.charAt(newLocation.length - 1) === '&') {
                    newLocation = newLocation.substring(0, newLocation.length - 1);
                }

                // Add the current reply_to location
                targetLocation = newLocation + '&reply_to=' + encodeURIComponent(window.location.href);
            }

            // Navigate the page to the targetLocation
            window.location.href = targetLocation;
            return;
        }
    }

    if (callback) {
        try {
            callback(data, textStatus, xhr);
        }
        catch (ex) {
            Diag.logTracePoint("Ajax.callback-exception", ex);
            handleError(ex);
        }
    }

    Diag.logTracePoint("Ajax.callback-complete", requestContext.requestId);
    if (requestContext.progressActionId) {
        VSS.globalProgressIndicator.actionCompleted(requestContext.progressActionId);
    }

    // Log a specific trace point one was specified
    if (requestContext.options && requestContext.options.tracePoint) {
        Diag.logTracePoint(requestContext.options.tracePoint);
    }
}


export function wrapSuccessCallback(requestContext: IAjaxRequestContext, callback: IResultCallback): IFunctionPPPR<any, string, JQueryXHR, any> {
    return function (data: any, textStatus: string, xhr: JQueryXHR) {
        endRequest(data, textStatus, xhr, callback, requestContext);
    };
}


export function wrapErrorCallback(requestContext: IAjaxRequestContext, callback: IErrorCallback): IFunctionPPPR<JQueryXHR, string, any, any> {
    return function (xhr: JQueryXHR, textStatus: string, errorThrown: any) {

        endRequest(null, textStatus, xhr, function () {
            //not a non authoritative response then handle it regular way
            var serverError: any;

            if (textStatus === "timeout") {
                handleError(Error_ajaxTimeout(xhr), callback);
            }
            else if (xhr.status === 0) {
                if (!unloadRequested && !unloading) {
                    Utils_Core.delay(this, 2000, function () {
                        //defer error event for 2 seconds
                        //This is a temporary remedy caused by a Chrome bug
                        //When browsers back and forward buttons are used Chrome cancels our requests with status == 0
                        //before firing unbeforeunload event. This causes an annoyance in our pages due to network error message.
                        //http://code.google.com/p/chromium/issues/detail?id=4422
                        if (!unloadRequested && !unloading) {
                            handleError(Error_network(xhr), callback);
                        }
                    });
                }
            }
            else if (xhr.status >= 12000 && xhr.status < 13000) {
                if (!unloadRequested && !unloading) {
                    handleError(Error_network(xhr), callback);
                }
            } else {
                if (unloading && textStatus === "abort") {
                    return;
                }

                try {
                    serverError = Utils_Core.parseMSJSON(xhr.responseText, false);
                }
                catch (exc) {
                }

                if (serverError) {
                    handleError(new Error(serverError.message), callback);
                }
                else {
                    handleError(Error_ajax(xhr, errorThrown || xhr.statusText || xhr.status), callback);
                }
            }
        }, requestContext);
    };
}


export function beginRequest(url: string, data: any, options?: IAjaxRequestContextOptions): IAjaxRequestContext {

    var requestContext: IAjaxRequestContext, actionName: string;

    // Create an object that contains context for this request
    requestContext = {

        // Mark the request as not being complete
        isComplete: false,

        // Assign the request a request Id
        requestId: requestId++,

        // If the client asked for a wait animation we will start it now.
        options: options
    };

    if (options && options.wait) {
        startWait(requestContext);
    }

    actionName = url + " (" + requestContext.requestId + ")";
    Diag.logTracePoint("Ajax.request-started", actionName);
    var actionId = Service.getLocalService(Diag_Services.ActivityStatsCollector).actionStarted(url);
    httpClientActivityIdsByRequest[requestContext.requestId] = actionId;

    if (!options || options.showGlobalProgressIndicator !== false) {
        requestContext.progressActionId = VSS.globalProgressIndicator.actionStarted(actionName);
    }

    requests[requestContext.requestId] = requestContext;

    return requestContext;
}


function resizeWait(requestContext: IAjaxRequestContext) {

    var wait = requestContext.options.wait;

    // Update the size and position of the wait element to cover the target properly.
    if (!wait.entireWindow) {

        wait.element.css('margin-top', -parseInt(wait.target.css('padding-top'), 10));
        wait.element.css('margin-left', -parseInt(wait.target.css('padding-left'), 10));
        wait.element.height(wait.target.outerHeight());
        wait.element.width(wait.target.outerWidth());
    }

    // Update the position of the message element if one is shown
    if (wait.msgElement) {
        wait.msgElement.css('top', wait.element.position().top +
            (wait.element.height() - wait.msgElement.height()) / 2 +
            parseInt(wait.element.css('margin-top'), 10));
        wait.msgElement.css('left', wait.element.position().left +
            (wait.element.width() - wait.msgElement.width()) / 2 +
            parseInt(wait.element.css('margin-left'), 10));
    }
}


startWait = function (requestContext: IAjaxRequestContext) {
    var wait = requestContext.options.wait;

    // Hook up the function used to end the wait
    wait.end = function () {
        if (wait.element) {

            // If it is complete when the timer goes off kill the waitElement
            if (requestContext.isComplete && !wait.timeout) {

                if (wait.fade !== false) {
                    wait.element.css('cursor', 'auto');  // see vstspioneer bug 884483: Cursor is not reset in browsers when element is removed until a mousemove
                    wait.element.fadeOut('fast', function () {
                        wait.element.remove();
                        wait.element = null;
                    });

                    if (wait.msgElement) {
                        wait.msgElement.css('cursor', 'auto');
                        wait.msgElement.fadeOut('fast', function () {
                            wait.msgElement.remove();
                            wait.msgElement = null;
                        });
                    }
                }
                else {
                    wait.element.css('cursor', 'auto');
                    wait.element.remove();
                    wait.element = null;

                    if (wait.msgElement) {
                        wait.msgElement.css('cursor', 'auto');
                        wait.msgElement.remove();
                        wait.msgElement = null;
                    }
                }

                // Remove the resize binder for moving the wait element
                $(window).unbind('resize.' + requestContext.requestId);
            }
        }
    };

    // Make sure we have a showDelay set
    if (!wait.showDelay) {
        wait.showDelay = 250;
    }

    // If no target was specified use the entire window as the wait target
    if (!wait.target) {
        wait.entireWindow = true;
        wait.target = $('body');

        // TODO: Is this obsolete code?
        //extraStyles = "height:100%; width:100%;";
    }

    // Hide any existing waits on children
    wait.target.children('.wait-element').hide();
    wait.target.children('.wait-box').hide();

    // If a showDelay is specified, call showWait after showDelay time
    if (wait.showDelay !== 0) {
        requestContext.showTimer = Utils_Core.delay(this, wait.showDelay, function () {
            delete requestContext.showTimer;
            showWait(requestContext);
        });
    }
    else {
        showWait(requestContext);
    }
};

endWait = function (requestContext: IAjaxRequestContext) {
    requestContext.options.wait.end();

    // Clear delayed show timer
    if (requestContext.showTimer) {
        requestContext.showTimer.cancel();
        delete requestContext.showTimer;
    }
};

showWait = function (requestContext: IAjaxRequestContext) {
    var msgContent = '';
    var extraStyles = '';
    var wait = requestContext.options.wait;

    // Determine what content is required for wait message
    if (wait.image) {
        msgContent += '<img class="wait-image" src="' + wait.image + '" />';
    }

    if (wait.message) {
        msgContent += '<div class="wait-message">' + wait.message + '</div>';
    }

    // If the caller wants animation and or a message we need to configure it
    if (msgContent.length > 0) {

        wait.target.prepend('<div class="wait-box">' + msgContent + '</div>');
        wait.msgElement = wait.target.children('.wait-box').first();
    }

    // Set the custom background color if one was specified
    if (wait.backgroundcolor) {
        extraStyles += 'background-color: ' + wait.backgroundcolor + ';';
    }

    // Build the waitElement and make sure it is sized properly
    wait.target.prepend('<div class="wait-element" style="' + extraStyles + '"></div>');
    wait.element = wait.target.children('.wait-element').first();

    // Make sure the wait element is laid out properly
    resizeWait(requestContext);

    // Attach to the window resize event to update our position
    $(window).bind('resize.' + requestContext.requestId, function () {
        resizeWait(requestContext);
    });

    // Make sure we have at least a minimal lifetime if it wasn't explicitly set
    if (!wait.minLifetime) {
        wait.minLifetime = 100;
    }

    // Don't allow the session to expire until the timeout.
    // This prevents flashing.
    wait.timeout = Utils_Core.delay(this, wait.minLifetime, function () {
        delete wait.timeout;
        wait.end();
    });
};

export function msJSONFilter(data: any, type: any): any {
    var parsedData: any;
    //Bug 814852, Security: unicode character  'LINE SEPARATOR' (U+2028) can break queries, work items, alerts page, and maybe others
    //Eval based JSON parser is broken when unicode line separator is observed in strings.
    if (typeof data === "string") {
        data = data.replace(/\u2028/g, "\\u2028");
    }

    parsedData = Utils_Core.parseMSJSON(data, false);

    // If the data object has a wrapped array property, then unwrap the array.
    // The SecureJsonResult on the server will wrap any arrays that are being sent
    // back to the client in an object to prevent JSON Hijacking attacks.  To make
    // it this transparent to the code consuming the results on the client, we
    // unwrap the array here.
    if (parsedData.hasOwnProperty("__wrappedArray")) {
        parsedData = parsedData.__wrappedArray;
    }

    return parsedData;
}


function beforeUnload() {
    unloadRequested = true;
    Utils_Core.delay(this, 2000, function () {
        // reset the unload requested flag, as the user could cancel the unload
        // (e.g. in the case of a dirty document which causes a Stay on this page? prompt.)
        unloadRequested = false;
    });
}


$(window).bind("beforeunload", beforeUnload);

$(window).bind("unload", function () {
    unloading = true;

    $.each(requests, function (reqId: number, requestContext: IAjaxRequestContext) {
        if (requestContext.xhr) {
            try {
                //abort in-progress requests to prevent memory leak in IE.
                requestContext.xhr.abort();
            }
            catch (ex) {
            }
        }
    });
});

/**
 * @param url 
 * @param data 
 * @param callback 
 * @param errorCallback 
 * @param ajaxOptions 
 */
export function getMSJSON(url: string, data?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: IAjaxRequestContextOptions): IAjaxRequestContext {


    // Perform any pre work needed for the reuqest.
    var requestContext = beginRequest(url, data, ajaxOptions);
    var defaultOptions: any = {
        type: "GET",
        data: data,
        success: wrapSuccessCallback(requestContext, callback),
        error: wrapErrorCallback(requestContext, errorCallback),
        dataType: "json",
        traditional: true,
        timeout: timeout
    };

    if (!globalAjaxConfig.allowArrayResult) {
        defaultOptions.converters = { "text json": msJSONFilter };
    }

    requestContext.xhr = jQuery.ajax(url, $.extend(defaultOptions, ajaxOptions));

    return requestContext;
}


/**
 * @param url 
 * @param data 
 * @param callback 
 * @param errorCallback 
 * @param ajaxOptions
 * @param multipart 
 */
export function postMSJSON(url: string, data?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: IAjaxRequestContextOptions, multipart?: boolean): IAjaxRequestContext {

    var token2: string;
    var requestContext: IAjaxRequestContext;
    var defaultOptions: any;

    if (!globalAjaxConfig.byPassAntiForgery) {
        data = $.extend(data || {}, { __RequestVerificationToken: getAntiForgeryTokenValue() });

        token2 = getAntiForgeryTokenValue2();
        if (token2) {
            data = $.extend(data, { __RequestVerificationToken2: token2 });
        }
    }

    // Perform any pre work needed for the reuqest.
    requestContext = beginRequest(url, data, ajaxOptions);

    if (ajaxOptions && ajaxOptions.timeout) {
        timeout = ajaxOptions.timeout;
    }

    defaultOptions = {
        type: "POST",
        data: data,
        success: wrapSuccessCallback(requestContext, callback),
        error: wrapErrorCallback(requestContext, errorCallback),
        dataType: "json",
        traditional: true,
        timeout: timeout
    };

    if (!globalAjaxConfig.allowArrayResult) {
        defaultOptions.converters = { "text json": msJSONFilter };
    }

    if (multipart) {
        // Set up for a multipart/form-data POST
        defaultOptions.contentType = false;
        defaultOptions.processData = false;
        defaultOptions.data = new FormData();
        var keys = Object.keys(data);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            defaultOptions.data.append(key, data[key]);
        }
    }

    try {
        requestContext.xhr = jQuery.ajax(url, $.extend(defaultOptions, ajaxOptions));
    }
    catch (exception) {
        // Exceptions can be thrown by jQuery.ajax for things like invalid characters being sent in the data stream.
        errorCallback(exception);
    }

    return requestContext;
}

/**
 * @param url 
 * @param data 
 * @param callback 
 * @param errorCallback 
 * @param ajaxOptions 
 */
export function multipartPostMSJSON(url: string, data?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: IAjaxRequestContextOptions): IAjaxRequestContext {
    return postMSJSON(url, data, callback, errorCallback, ajaxOptions, true);
}


/**
 * @param url 
 * @param data 
 * @param callback 
 * @param errorCallback 
 * @param ajaxOptions 
 */
export function postHTML(url: string, data?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: IAjaxRequestContextOptions): IAjaxRequestContext {

    var token2: string;
    var requestContext: IAjaxRequestContext;

    data = $.extend(data, { __RequestVerificationToken: getAntiForgeryTokenValue() });

    token2 = getAntiForgeryTokenValue2();
    if (token2) {
        data = $.extend(data, { __RequestVerificationToken2: token2 });
    }

    // Perform any pre work needed for the reuqest.
    requestContext = beginRequest(url, data, ajaxOptions);

    requestContext.xhr = jQuery.ajax(url, $.extend({
        type: "POST",
        data: data,
        ajaxHandler: this,
        success: wrapSuccessCallback(requestContext, callback),
        error: wrapErrorCallback(requestContext, errorCallback),
        dataType: "html",
        traditional: true,
        cache: false
    }, ajaxOptions));

    return requestContext;
}


/**
 * @param url 
 * @param data 
 * @param callback 
 * @param errorCallback 
 * @param ajaxOptions 
 */
export function getHTML(url: string, data?: any, callback?: IResultCallback, errorCallback?: IErrorCallback, ajaxOptions?: IAjaxRequestContextOptions): IAjaxRequestContext {

    // Perform any pre work needed for the reuqest.
    var requestContext = beginRequest(url, data, ajaxOptions);

    requestContext.xhr = jQuery.ajax(url, $.extend({
        type: "GET",
        data: data,
        success: wrapSuccessCallback(requestContext, callback),
        error: wrapErrorCallback(requestContext, errorCallback),
        dataType: "html",
        traditional: true,
        cache: false
    }, ajaxOptions));

    return requestContext;
}


/**
 * @param ajaxOptions 
 */
export function getJSONp(ajaxOptions: IAjaxRequestContextOptions): IAjaxRequestContext {

    // Perform any pre work needed for the reuqest.
    var requestContext = beginRequest(
        ajaxOptions && ajaxOptions.url,
        ajaxOptions && ajaxOptions.data,
        ajaxOptions);

    requestContext.xhr = jQuery.ajax(ajaxOptions && ajaxOptions.url, $.extend({
        type: "GET",
        dataType: "jsonp",
        traditional: true,
        success: wrapSuccessCallback(requestContext, ajaxOptions && ajaxOptions.callback)
    }, ajaxOptions));

    return requestContext;
}

var antiForgeryToken: string;
var antiForgeryToken2: string;

/**
 * Gets the anti-forgery token value.
 * 
 * @return The INPUT element that holds the token value.
 */
export function getAntiForgeryTokenValue(): string {

    if (!antiForgeryToken) {
        antiForgeryToken = $("input[name=__RequestVerificationToken]").val();
    }
    return antiForgeryToken;
}

/**
 * Get the anti-forgery token value (version 2).
 * 
 * @return The INPUT element that holds the token value.
 */
export function getAntiForgeryTokenValue2(): string {

    if (!antiForgeryToken2) {
        antiForgeryToken2 = $("input[name=__RequestVerificationToken2]").val();
    }
    return antiForgeryToken2;
}

/**
 * Creates elements to hold the anti-forgery tokens.
 * 
 * @return The INPUT elements that holds the token values.
 */
function getAntiForgeryToken(): JQuery {

    var $token: JQuery;
    var tokenValue2: string;

    $token = $("<input />").attr("type", "hidden").attr("name", "__RequestVerificationToken").val(getAntiForgeryTokenValue());
    tokenValue2 = getAntiForgeryTokenValue2();
    if (tokenValue2) {
        $token.after($("<input />").attr("type", "hidden").attr("name", "__RequestVerificationToken2").val(getAntiForgeryTokenValue2()));
    }
    return $token;
}

/**
 * Set a token on the specified to the current anti-forgery token. Expects an INPUT element with a specific name - __RequestVerificationToken
 * 
 * @param form The form on which to look for the INPUT element.
 * @return The form value (if the token was set), otherwise undefined.
 */
export function setAntiForgeryToken(form: JQuery): JQuery {

    var $form = $(form);

    if ($form.find("input[name=__RequestVerificationToken]").length === 0) {
        return $form.append(getAntiForgeryToken());
    }
}