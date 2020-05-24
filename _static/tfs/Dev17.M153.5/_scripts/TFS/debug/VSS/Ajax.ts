/// <reference types="q" />

/// Imports of 3rd Party ///
import Q = require("q");
/// Imports of VSS ///
import Context = require("VSS/Context");
import Diag = require("VSS/Diag");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

//
// Keep track of whether or not the document is being unloaded. Without this logic, when a user
// clicks a link to navigate to a new page, we will show an error due to cancelled ajax requests.
//
var unloading = false;
var unloadRequested = false;
var eventListeners: IVssAjaxEventListener[] = [];
var outstandingRequestActionIds: IDictionaryNumberTo<number> = {};
var globalRequestId: number = 0;

export interface JQueryAjaxResult {
    jqXHR: JQueryXHR;
    textStatus: string;
}

export interface JQueryAjaxSuccessResult extends JQueryAjaxResult {
    data: any;
}

export interface JQueryAjaxErrorResult extends JQueryAjaxResult {
    errorThrown: any;
}

/**
* Custom DataTypes that can be used in addition to jQuery's default text, json, xml, etc. types.
* This module provides custom ajaxTransports for these types
*/
export module CustomTransportDataTypes {
    /**
    * Raw binary data returned as an ArrayBuffer
    */
    export var Binary = "arraybuffer";
}

/**
* Custom ajax transports
*/
module CustomTransports {
    var registered = false;

    /**
    * Ensure that the custom transports are registered
    */
    export function register() {
        if (!registered) {
            _doRegistration();
            registered = true;
        }
    }

    function _doRegistration() {
        (<any>$).ajaxTransport(CustomTransportDataTypes.Binary, function (options: any, originalOptions: any, jqXHR: JQueryXHR) {
            if (options.dataType === CustomTransportDataTypes.Binary && options.async) {
                return {
                    send: function (headers, completeCallback) {

                        var xhr = new XMLHttpRequest();

                        xhr.addEventListener('load', function () {
                            var result = {};
                            result[CustomTransportDataTypes.Binary] = xhr.response;
                            completeCallback(xhr.status, xhr.statusText, result, xhr.getAllResponseHeaders());
                        });

                        xhr.open(options.type, options.url, true);
                        xhr.responseType = "arraybuffer";

                        for (var headerName in headers) {
                            xhr.setRequestHeader(headerName, headers[headerName]);
                        }

                        xhr.send(options.data || null);
                    },
                    abort: function () {
                        jqXHR.abort();
                    }
                };
            }
        });
    }
}

$(window).bind("unload", function () {
    unloading = true;
});

$(window).bind("beforeunload", () => {
    unloadRequested = true;
    window.setTimeout(function () {
        // reset the unload requested flag, as the user could cancel the unload
        // (e.g. in the case of a dirty document which causes a Stay on this page? prompt.)
        unloadRequested = false;
    }, 2000);
});

function _getFailedRequestError(xhr: JQueryXHR, textStatus: string, errorThrown: any) {
    //not a non authoritative response then handle it regular way
    var serverError: any,
        errorMessage: string,
        error: Error;

    if (!xhr) {
        error = new Error(Utils_String.format(Resources_Platform.WebApiUndefinedRequestError, 0, errorThrown || ""));
        error.name = "TFS.WebApi.Exception";
        return error;
    }

    if (textStatus !== "abort") {
        try {
            serverError = JSON.parse(xhr.responseText);
            if (serverError && serverError.message) {
                errorMessage = serverError.message;
            }
        }
        catch (exc) {
        }
    }

    if (!errorMessage) {
        if (xhr.status === 0) {
            errorMessage = Utils_String.format(Resources_Platform.WebApiUndefinedRequestError, xhr.status, textStatus);
        }
        else {
            errorMessage = xhr.status + ": " + textStatus;
        }
    }

    error = new Error(errorMessage);
    error.name = "TFS.WebApi.Exception";
    (<any>error).status = xhr.status;
    (<any>error).responseText = xhr.responseText;

    if (serverError) {
        (<any>error).serverError = serverError;
    }

    if (errorThrown == "timeout") {
        error.name = "TFS.WebApi.Exception.Timeout";
    }

    return error;
}

interface IRequestFailureHandler {
    (jqXHR: JQueryXHR, textStatus: string, errorThrown: string, requestId: number, deferred: Q.Deferred<any>): void;
}

function _handleRequestFailure(jqXHR: JQueryXHR, textStatus: string, errorThrown: string, requestId: number, deferred: Q.Deferred<any>, handler: IRequestFailureHandler) {
    // chrome will invoke .fail when the browser refreshes or navigates away
    //  and it happens before the onbeforeunload event
    // in this case, jqXHR.status is 0, jqXHR.readyState is 0,
    // jqXHR.getAllResponseHeaders() is "", jqXHR.statusText is "error",
    // textStatus is "error", errorThrown is ""
    if (jqXHR && jqXHR.status === 0) {
        if (!unloadRequested && !unloading) {
            // give the unload events a chance to fire
            Utils_Core.delay(this, 2000, () => {
                if (!unloadRequested && !unloading) {
                    handler(jqXHR, textStatus, errorThrown, requestId, deferred);
                }
            });
        }
    }
    else {
        handler(jqXHR, textStatus, errorThrown, requestId, deferred);
    }
}

function _issueJQueryAjaxRequest(requestUrl: string, ajaxOptions: JQueryAjaxSettings, vssRequestOptions: IVssAjaxOptions, retryDeferred?: Q.Deferred<any>): IPromise<any> {
    var deferred = retryDeferred || Q.defer();

    // Ensure custom transports are registered
    CustomTransports.register();

    // Add a X-VSS-ReauthenticationAction header to all AJAX requests
    if (!ajaxOptions) {
        ajaxOptions = {};
    }
    if (!ajaxOptions.headers) {
        ajaxOptions.headers = {};
    }
    ajaxOptions.headers["X-VSS-ReauthenticationAction"] = "Suppress";

    // Add current sessionId and command for correlation
    let sessionId: string, command: string;
    if (vssRequestOptions) {
        sessionId = vssRequestOptions.sessionId;
        command = vssRequestOptions.command;
    }
    if (!sessionId) {
        const pageContext = Context.getPageContext();
        if (pageContext && pageContext.diagnostics && pageContext.diagnostics.sessionId) {
            sessionId = pageContext.diagnostics.sessionId;
        }
    }
    if (sessionId) {
        if (command) {
            ajaxOptions.headers["X-TFS-Session"] = sessionId + "," + command;
        }
        else {
            ajaxOptions.headers["X-TFS-Session"] = sessionId;
        }
    }

    if (vssRequestOptions && vssRequestOptions.authTokenManager) {
        // Token manager exists, we need to include auth token in the request header
        var retry = !!retryDeferred;
        var authTokenPromise = vssRequestOptions.authTokenManager.getAuthToken(retry);

        // Get session token before making the call
        authTokenPromise.then((sessionToken: any) => {
            if (sessionToken) {
                // Attach to before send event to modify request header
                ajaxOptions = $.extend(ajaxOptions, {
                    beforeSend: (request: XMLHttpRequest) => {

                        // Set auhorization header
                        var authHeader = vssRequestOptions.authTokenManager.getAuthorizationHeader(sessionToken);
                        request.setRequestHeader("Authorization", authHeader);
                        request.setRequestHeader("X-TFS-FedAuthRedirect", "Suppress");
                    }
                });

                // Need to process the request if it is being made for IE 9 cors request
                requestUrl = processRequestForCorsSupport(vssRequestOptions.authTokenManager, requestUrl, ajaxOptions, sessionToken);

                // Perform ajax call
                jQuery.ajax(requestUrl, ajaxOptions).then(
                    (data: any, textStatus: string, jqXHR: JQueryXHR) => {
                        deferred.resolve(<JQueryAjaxSuccessResult>{ data: data, jqXHR: jqXHR, textStatus: textStatus });
                    },
                    (jqXHR: JQueryXHR, textStatus: string, errorThrown: any) => {
                        if (jqXHR && jqXHR.status === 401 && !retry) { // Unauthorized
                            // Specifying existing deferred will cause to issue a new token
                            _issueJQueryAjaxRequest(requestUrl, ajaxOptions, vssRequestOptions, deferred);
                        }
                        else {
                            // If other error or 401 after retry, reject the request
                            deferred.reject(<JQueryAjaxErrorResult>{ errorThrown: errorThrown, jqXHR: jqXHR, textStatus: textStatus });
                        }
                    });
            }
            else {
                // Make sure adding X-TFS-FedAuthRedirect header to prevent redirecting to login page
                ajaxOptions = $.extend(ajaxOptions, {
                    beforeSend: (request: XMLHttpRequest) => {
                        request.setRequestHeader("X-TFS-FedAuthRedirect", "Suppress");
                    }
                });

                // No token meaning user is anonymous or public, perform request without auth header
                _issueAjaxRequestWithoutAuthHeader(requestUrl, ajaxOptions, deferred);
            }

        }, deferred.reject);
    }
    else {
        _issueAjaxRequestWithoutAuthHeader(requestUrl, ajaxOptions, deferred);
    }

    return deferred.promise;
}

function _issueAjaxRequestWithoutAuthHeader(requestUrl: string, ajaxOptions: JQueryAjaxSettings, deferred: Q.Deferred<any>): void {
    jQuery.ajax(requestUrl, ajaxOptions).then(
        (data: any, textStatus: string, jqXHR: JQueryXHR) => {
            deferred.resolve(<JQueryAjaxSuccessResult>{ data: data, jqXHR: jqXHR, textStatus: textStatus });
        },
        (jqXHR: JQueryXHR, textStatus: string, errorThrown: any) => {
            deferred.reject(<JQueryAjaxErrorResult>{ errorThrown: errorThrown, jqXHR: jqXHR, textStatus: textStatus });
        });
}

function processRequestForCorsSupport(authTokenManager: IAuthTokenManager<any>, requestUrl: string, ajaxOptions: JQueryAjaxSettings, sessionToken: string): string {
    //determine if this is an ie9 cors request
    if (_isCorsSupported()) {
        return requestUrl;
    }

    // We will add parameters to request to indicate to server how to process the request
    var legacyParams = {
        "legacyCorsMethod": ajaxOptions.type.toUpperCase()
    };

    var urlQueryParams = requestUrl.indexOf("?");
    var apiVersionSet = false;
    var additionalQueryString;

    // check to see if api-version is set in current query string.  if it is not set yet, we need to check
    // the headers and for a get request, the passed in data property.
    if (urlQueryParams > -1 && requestUrl.length > urlQueryParams) {
        var currentQueryString = requestUrl.substring(urlQueryParams + 1);
        var queryParams: string[] = currentQueryString.split('&');
        queryParams.forEach((value: string, index: number, array: string[]) => {
            var item = array[index].split('=');
            var key = item[0];

            // if the version is already set, then no need to add anything
            if (key === "api-version") {
                apiVersionSet = true;
            }
        });
    }

    // If the api version is not set, check the headers
    if (!apiVersionSet && ajaxOptions && ajaxOptions.headers && ajaxOptions.headers["Accept"]) {
        // Parese the Accept header
        var acceptHeaders: string[] = ajaxOptions.headers["Accept"].split(";");

        // look for api-version
        if (acceptHeaders && acceptHeaders.length > 0) {
            var versionHeader;
            acceptHeaders.some((value: string) => {
                if (value && value.indexOf("api-version") > -1) {
                    var pair = value.split("=");
                    if (pair && pair.length === 2) {
                        versionHeader = pair[1];
                        return true;
                    }
                }
                return false;
            });

            // If version found move it from header to query string since headers will not be passed
            if (versionHeader) {
                legacyParams["api-version"] = versionHeader;
                apiVersionSet = true;
            }
        }
    }

    // Auth token will be added to the body
    var authOptions: any = {
        "__authToken": authTokenManager.getAuthorizationHeader(sessionToken)
    };

    if (ajaxOptions.type.toUpperCase() === 'GET') {
        // First check to see if data set
        var data = ajaxOptions.data;

        // If data set, move to query string
        if (data) {
            additionalQueryString = $.param(data);
        }

        // Change to Post
        ajaxOptions.type = "POST";

        // Add the auth information into the body
        _addAuthInformationToBody(ajaxOptions, authOptions);
    } else {
        // If not a GET and data is already set, then we need to deserialize the data and add the auth info
        if (ajaxOptions.data) {
            // Deserialize to add the auth header
            var requestBody = ajaxOptions.data;
            if (typeof requestBody === 'string') {
                requestBody = JSON.parse(requestBody);
            }

            // If the body is an array, move the auth options to first position in array
            if ($.isArray(requestBody) && requestBody.length > 0) {
                requestBody[0] = <any>$.extend(authOptions, requestBody[0]);
            } else {
                requestBody = <any>$.extend(authOptions, requestBody);
            }

            // Serialize data again
            ajaxOptions.data = JSON.stringify(requestBody);
        } else {
            // If there was no body, the add the auth information
            // Add the auth information into the body
            _addAuthInformationToBody(ajaxOptions, authOptions);
        }

        // look to see if content type has been set as a header.  if it has then move to query string        
        if (ajaxOptions && ajaxOptions.headers && ajaxOptions.headers["Content-Type"]) {
            legacyParams["legacyContentType"] = ajaxOptions.headers["Content-Type"];
        }

        // Set the method to POST
        ajaxOptions.type = "POST";
    }

    // Add on the legacy query string params
    var legacyQueryString = $.param(legacyParams);
    requestUrl += (urlQueryParams > -1 ? "&" : "?") + legacyQueryString;

    // Add any additional query params
    if (additionalQueryString) {
        requestUrl += "&" + additionalQueryString;
    }

    return requestUrl;

}

function _addAuthInformationToBody(ajaxOptions: JQueryAjaxSettings, authOptions: any): void {
    // Add the auth information into the body
    ajaxOptions.data = JSON.stringify(authOptions);

    // We've serialized the data ourselves so turn off jquery's processing of the data property
    ajaxOptions.processData = false;

    // Prevent replacing ?? with jsonp callback
    (<any>ajaxOptions).jsonp = false;
}

function _issueRequest(requestUrl: string, ajaxOptions: JQueryAjaxSettings, vssRequestOptions?: IVssAjaxOptions): IPromise<any> {
    var deferred = Q.defer<any>();
    var requestId = ++globalRequestId;
    var useAjaxResult = vssRequestOptions && vssRequestOptions.useAjaxResult;

    $.each(eventListeners, (i: number, listener: IVssAjaxEventListener) => {
        if (listener.beforeRequest) {
            listener.beforeRequest.call(this, requestId, requestUrl, ajaxOptions, vssRequestOptions);
        }
    });

    _issueJQueryAjaxRequest(requestUrl, ajaxOptions, vssRequestOptions).then(
        (result: JQueryAjaxSuccessResult) => {
            $.each(eventListeners, (i: number, listener: IVssAjaxEventListener) => {
                if (listener.responseReceived) {
                    listener.responseReceived.call(this, requestId, result.data, result.textStatus, result.jqXHR, vssRequestOptions);
                }
            });

            try {
                if (useAjaxResult === true) {
                    // We don't want xhr object to be thennable since q will resolve it.
                    // In this case, we need xhr object itself.
                    delete result.jqXHR.then;
                    deferred.resolve([result.data, result.textStatus, result.jqXHR]);
                } else {
                    deferred.resolve(result.data);
                }

                deferred.resolve(useAjaxResult === true ? [result.data, result.textStatus, result.jqXHR] : result.data);
            }
            finally {
                $.each(eventListeners, (i: number, listener: IVssAjaxEventListener) => {
                    if (listener.postResponseCallback) {
                        listener.postResponseCallback.call(this, requestId, result.data, result.textStatus, result.jqXHR, vssRequestOptions);
                    }
                });
            }
        },
        (result: JQueryAjaxErrorResult) => {
            _handleRequestFailure(result.jqXHR, result.textStatus, result.errorThrown, requestId, deferred,
                (jqXHR: JQueryXHR, textStatus: string, errorThrown: string, requestId: number, deferred: Q.Deferred<any>) => {
                    var error = _getFailedRequestError(jqXHR, textStatus, errorThrown);

                    $.each(eventListeners, (i: number, listener: IVssAjaxEventListener) => {
                        if (listener.responseReceived) {
                            listener.responseReceived.call(this, requestId, error, textStatus, jqXHR, vssRequestOptions);
                        }
                    });

                    try {
                        deferred.reject(error);
                    }
                    finally {
                        $.each(eventListeners, (i: number, listener: IVssAjaxEventListener) => {
                            if (listener.postResponseCallback) {
                                listener.postResponseCallback.call(this, requestId, error, textStatus, jqXHR, vssRequestOptions);
                            }
                        });
                    }
                });
        });

    return deferred.promise;
}

/**
* Is CORS supported by the current browser
*/
function _isCorsSupported(): boolean {
    // Checking to see CORS features are available
    if (typeof XMLHttpRequest != "undefined") {
        var xhr = new XMLHttpRequest();
        // This property used to notify server to set cookies. If this is missing, CORS won't work.
        if ("withCredentials" in xhr) {
            return true;
        }
    }

    return false;
}

/**
* Issue an AJAX request. This is a wrapper around jquery's ajax method that handles VSS authentication
* and triggers events that can be listened to by other modules.
*
* @param requestUrl Url to send the request to
* @param ajaxOptions jQuery.ajax options
* @param vssRequestOptions VSS specific request options
* @param useAjaxResult If true, textStatus and jqXHR are added to the success callback. In this case, spread (instead of then) needs to be used
*/
export function issueRequest(requestUrl: string, ajaxOptions: JQueryAjaxSettings, vssRequestOptions?: IVssAjaxOptions): IPromise<any> {
    return _issueRequest(requestUrl, ajaxOptions, vssRequestOptions);
}

/**
* Add a listener that gets notified whenever requests from this client begin/end/etc.
*
* @param listener HttpClient listener to add
*/
export function addGlobalListener(listener: IVssAjaxEventListener) {
    eventListeners.push(listener);
}

/**
* Remove a listener that gets notified whenever requests from this client begin/end/etc.
*
* @param listener HttpClient listener to remove
*/
export function removeGlobalListener(listener: IVssAjaxEventListener) {
    eventListeners = $.grep(eventListeners, (l: IVssAjaxEventListener) => { return l !== listener; });
}

//
// Add default global listener for tracking Ajax event progress
//
addGlobalListener({
    beforeRequest: (requestId: number, requestUrl: string, ajaxOptions: JQueryAjaxSettings, vssRequestOptions?: IVssAjaxOptions) => {
        var actionId;
        var showProgressIndicator = !vssRequestOptions || vssRequestOptions.showProgressIndicator !== false;

        if (showProgressIndicator) {
            actionId = VSS.globalProgressIndicator.actionStarted("http " + requestId + " " + requestUrl);
            outstandingRequestActionIds[requestId] = actionId;
        }
        Diag.logTracePoint("Ajax.request-started", actionId);
    },
    responseReceived: (requestId: number, data: any, textStatus: string, jqXHR: JQueryXHR) => {
        if (requestId in outstandingRequestActionIds) {
            VSS.globalProgressIndicator.actionCompleted(outstandingRequestActionIds[requestId]);
        }
    },
    postResponseCallback: (requestId: number, data: any, textStatus: string, jqXHR: JQueryXHR) => {
        var actionId: Number;
        if (requestId in outstandingRequestActionIds) {
            actionId = outstandingRequestActionIds[requestId];
            delete outstandingRequestActionIds[requestId];
        }
        Diag.logTracePoint("Ajax.callback-complete", actionId);
    }
});

//
// Add default global listener for handling global message
//
addGlobalListener({
    responseReceived: (requestId: number, data: any, textStatus: string, jqXHR: JQueryXHR) => {
        if (jqXHR && jqXHR.getResponseHeader) {
            const globalMessageWarningHeader = jqXHR.getResponseHeader("X-VSS-GlobalMessage");
            if (globalMessageWarningHeader) {
                try {
                    const banner = JSON.parse(globalMessageWarningHeader);
                    let message = banner.message;
                    if (banner.messageFormat && banner.messageLinks) {
                        message = Utils_String.format(banner.messageFormat, ...banner.messageLinks.map((link) => {
                            return $("<span>").append($("<a>").text(link.name || "").attr("href", link.href || "").attr("target", "_blank")).html();
                        }));
                    }
                    VSS.globalMessageIndicator.updateGlobalMessageIfEmpty(message);
                    if ((window as any).LWL) {
                        document.body.dispatchEvent(new CustomEvent("legacyGlobalMessage", { detail: banner }));
                    }
                }
                catch (ex) {
                    console.warn("Failed to deserialize X-VSS-GlobalMessage header: " + ex);
                }
            }
        }
    }
});