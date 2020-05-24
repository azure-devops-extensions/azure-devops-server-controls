
/*
* This is a legacy module which is a copy of some of the old extensibility controls used
* in the original extensibility model offered only in TFS. All new code should use the new
* app extensibility in VSSF\WebPlatform.
*/

import VSS = require("VSS/VSS");
import Ajax = require("VSS/Ajax");
import Context = require("VSS/Context");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_Core = require("VSS/Utils/Core");
import Diag = require("VSS/Diag");
import Utils_Html = require("VSS/Utils/Html");
import Service = require("VSS/Service");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Controls = require("VSS/Controls");
import Notifications = require("VSS/Controls/Notifications");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import XDM_Host = require("VSS/SDK/XDM");

export enum WebAccessExtensionFrameLoadBehavior {
    Unknown = 0,
    Post = 1,
    Navigate = 2,
}

export enum WebAccessExtensionFrameHandshakeBehavior {
    None = 0,
    Smart = 1,
}

export class ExtensionHost extends Controls.BaseControl {

    public static Actions = {
        SET_CONFIGURATION: "set-configuration",
        EXTENSION_LOADED: "extension-loaded",
        EXTENSION_READY: "extension-ready",
        EXTENSION_LOAD_ERROR: "extension-load-error"
    };
    public static Events = {
        EXTENSION_LOAD_FAILED: "extension-host-load-failed",
        SLOW_LOAD_WARNING: "extension-host-slow-load-warning",
        EXTENSION_MESSAGE_RESIZED: "extension-message-resized"
    };
    public static MAX_WAIT_FOR_LOADED_EVENT: number = 3000;

    private _xdmChannel: IXDMChannel;
    private _$container: JQuery;
    private _$iframe: any;
    private _iframeId: string;
    private _integration: any;
    private _configuration: any;
    private _queuedMessages: any;
    private _receivedReadyEvent: boolean;
    private _receivedLoadedEvent: boolean;
    private _loadFailed: boolean;
    private _messageListeners: any;
    private _$statusContainer: JQuery;
    private _statusControl: any;
    private _messageArea: any;

    /**
     *     Creates a host control (iframe) for an extension's integration point
     * 
     * @param options 
     *     Options of the behavior of the control.
     * 
     *     The following options are required:
     *         integration: Extension integration that contains information about
     *                      the extension point such as the url to post to
     * 
     *     The following options are optional:
     *         postData: Parameters to post to the extension's url
     *         messageListener: XDM message listener to add when creating the control
     *         errorOptions: Optional data for handling errors. errorOptions = {
     *             showSlowLoadWarningMessage: Boolean (default is true)
     *             slowLoadWarningDuration: Integer (default is 10000 == 10 seconds).
     *             showLoadFailedMessage: Boolean (default is true)
     *             formatErrorMessage: Function ($errorMessage, isErrorMessageFromExtension) -
     *                                 Delegate to modify the error content html shown in load failure messages.
     *         }
     * 
     */
    constructor(options?: any) {

        super(options);

        this._queuedMessages = [];
        this._messageListeners = [];
    }

    public getIFrame(): JQuery {
        return this._$iframe;
    }

    public getWindow() {
        return this._$iframe[0].contentWindow;
    }

    public getIntegrationUrl() {
        return this._integration.url;
    }

    private getXdmChannel(): IXDMChannel {
        this.ensureXdmChannelIntialized();
        return this._xdmChannel;
    }

    public ensureXdmChannelIntialized(): void {
        if (!this._xdmChannel) {
            this._xdmChannel = XDM_Host.channelManager.addChannel(this.getWindow(), this._integration.url);
        }
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            integration: null,
            postData: null,
            messageListener: null,
            coreCssClass: "extension-host-control"
        }, options, {
                errorOptions: $.extend({
                    showSlowLoadWarningMessage: true,
                    slowLoadWarningDuration: 20000, // Warn if load takes > 20 seconds
                    showLoadFailedMessage: true,
                    formatErrorMessage: null
                }, options && options.errorOptions)
            }));
    }

    public initialize() {
        var that = this,
            $form;

        this._integration = this._options.integration;
        Diag.Debug.assertIsObject(this._integration, "_options.integration");
        Diag.Debug.assertIsString(this._integration.url, "_options.integration.url");

        this._$container = $("<div />").addClass("extension-host-container").appendTo(this._element);

        this._iframeId = "extensionHost" + Controls.getId();

        if (this._integration.loadBehavior === WebAccessExtensionFrameLoadBehavior.Post) {

            var rawPageContext = Context._getDefaultRawPageContext();
            var rawWebContext = rawPageContext ? rawPageContext.webContext : null;

            $form = $("<form />")
                .attr("method", "post")
                .attr("target", this._iframeId)
                .attr("action", this._integration.url)
                .appendTo(this._$container);

            $("<input />")
                .attr("type", "hidden")
                .attr("name", "requestJson")
                .attr("value", JSON.stringify($.extend({}, this._options.postData, rawWebContext)))
                .appendTo($form);
        }

        this._$iframe = $("<iframe frameborder='0' />")
            .addClass("extension-iframe")
            .attr("id", this._iframeId)
            .attr("name", this._iframeId)
            .appendTo(this._$container);

        if (this._integration.handshake === WebAccessExtensionFrameHandshakeBehavior.Smart) {
            this._$iframe.addClass("loading");

            this._$statusContainer = $("<div />").addClass("status-container").appendTo(this._$container);
            this._statusControl = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._$statusContainer, {
                center: true,
                imageClass: "big-status-progress",
                message: Resources_Platform.ExternalControlLoading
            });
            this._statusControl.start();

            $(window).bind("message." + this._iframeId, Utils_Core.delegate(this, this._handleMessageReceived));

            if ($.isFunction(this._options.messageListener)) {
                this.addMessageListener(this._options.messageListener);
            }

            this._$iframe.load(function (ev) {

                that.cancelDelayedFunction("slowLoadTimeout");

                // Give the extension a few seconds to fire its "loaded" event.
                if (!that._receivedLoadedEvent && !that._loadFailed) {
                    that.delayExecute("waitForLoadedEvent", ExtensionHost.MAX_WAIT_FOR_LOADED_EVENT, true, function () {
                        if (!that._receivedLoadedEvent && !that._disposed && !that._loadFailed) {
                            // Loaded event not received in time. Assume that
                            // there is a problem with this extension integration.
                            that._handleLoadError(null);
                        }
                    });
                }
            });

            this.delayExecute("slowLoadTimeout", this._options.errorOptions.slowLoadWarningDuration, true, function () {
                if (!that._disposed && !that._loadFailed) {
                    if (that._options.errorOptions.showSlowLoadWarningMessage) {
                        that._showExtensionMessage(
                            Notifications.MessageAreaType.Warning,
                            Resources_Platform.ExtensionSlowLoadWarningHeader,
                            Resources_Platform.ExtensionSlowLoadWarningBody,
                            false, // Error message is not from extension
                            false); // Don't expand details
                    }
                    // Firefox/Safari, hide loading progress
                    that._fire(ExtensionHost.Events.SLOW_LOAD_WARNING, [that]);
                }
            });
        }

        if (this._integration.loadBehavior === WebAccessExtensionFrameLoadBehavior.Post) {
            $form[0].submit();
        } else {
            this._$iframe.attr("src", this._integration.url);
        }

        if (this._options.initializeXdmChannel) {
            this.getXdmChannel();
        }
    }

    /**
     *     Sets the integration-specific configuration data for
     *     this extension integration.
     * 
     * @param configurationData 
     *     Hash object of configuration data
     * 
     */
    public setConfiguration(configurationData: any) {
        this._configuration = configurationData;
        if (this._receivedReadyEvent) {
            this.postMessage(ExtensionHost.Actions.SET_CONFIGURATION, configurationData);
        }
    }

    /**
     *     Posts a message via XDM to the extension's iframe
     * 
     * @param actionId 
     *     Id of the action to send
     * 
     * @param actionData 
     *     Hash object of action-specific data to send
     * 
     * @param requestId 
     *     (Optional) Id of the request issued by the extension that triggered this response message
     * 
     */
    public postMessage(actionId: string, actionData?: any, requestId?: number) {

        var messagePackage = {
            actionId: actionId || "",
            actionData: actionData || {},
            requestId: requestId
        };

        if (this._receivedReadyEvent) {
            this._sendMessage(messagePackage);
        }
        else {
            this._queuedMessages.push(messagePackage);
        }
    }

    public postXdmMessage(method: string, params?: any[], success?: (result: any) => void, error?: (message: string) => void) {
        var objectName: string;
        var methodName: string;

        var lastDotIndex = method.lastIndexOf('.');
        if (lastDotIndex > 0) {
            objectName = method.substr(0, lastDotIndex);
            if (objectName) {
                methodName = method.substr(lastDotIndex + 1);
            }
        }

        this.getXdmChannel().invokeRemoteMethod(methodName, objectName, params).then(success, error);
    }

    /**
     *     Adds a listener for messages from this extension/iframe
     * 
     * @param listener 
     *     Function invoked whenever a message is received from this extension iframe.
     *     The received data (hash object) is passed as the only argument to the listener function.
     * 
     */
    public addMessageListener(listener: Function) {
        Diag.Debug.assertIsFunction(listener, "listener");
        this._messageListeners.push(listener);
    }

    public _dispose() {
        $(window).unbind("message." + this._iframeId);
        super._dispose();
    }

    private _showExtensionMessage(messageType, messageTitle, messageContentHtml, isErrorMessageFromExtension, expandDetails) {

        var that = this,
            $errorContent,
            $errorContentBody,
            message;

        if (this._options.errorOptions.showLoadFailedMessage !== false) {

            var normalizedMessageContentHtml = Utils_Html.HtmlNormalizer.normalize(messageContentHtml || "");
            // Message body header
            $errorContent = $("<div />");
            $errorContentBody = $("<div />").html(normalizedMessageContentHtml).appendTo($errorContent);

            if (!isErrorMessageFromExtension) {
                $errorContentBody.find("a").text(this._integration.url).attr("href", this._integration.url).attr("target", "blank");

                // Message body additional steps
                $("<br />").appendTo($errorContent);
                $("<div />").html(Resources_Platform.ExtensionErrorAdditionalSteps).appendTo($errorContent);
            }

            // Message body extension-specific info
            if (this._options.errorOptions && $.isFunction(this._options.errorOptions.formatErrorMessage)) {
                this._options.errorOptions.formatErrorMessage.call(this, $errorContent, isErrorMessageFromExtension);
            }
        }

        message = {
            type: messageType,
            header: messageTitle,
            content: $errorContent
        };

        if (!this._messageArea) {
            this._messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $("<div />").prependTo(this._element), {
                closeable: true,
                expanded: expandDetails,
                message: message
            });

            // Change padding of iframe container so that there is no overlap with the error details
            this._$container.css("padding-top", (this._messageArea._element.height() + 20) + "px");
            this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, function () {
                that._$container.css("padding-top", (that._messageArea._element.height() + 20) + "px");
                that._fire(ExtensionHost.Events.EXTENSION_MESSAGE_RESIZED, [that]);
            });
            this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, function () {
                that._$container.css("padding-top", "0");
                that._messageArea = null;
                that._fire(ExtensionHost.Events.EXTENSION_MESSAGE_RESIZED, [that]);
            });

            this._fire(ExtensionHost.Events.EXTENSION_MESSAGE_RESIZED, [that]);
        }
        else {
            this._messageArea.setMessage(message);
            if (expandDetails) {
                this._messageArea.setErrorDetailsVisibility(true);
            }
        }
    }

    private _hideLoadingIndicator() {

        this._$iframe.removeClass("loading");

        if (this._statusControl) {
            this._statusControl.dispose();
            this._$statusContainer.remove();

            this._statusControl = null;
            this._$statusContainer = null;
        }
    }

    private _sendMessage(messagePackage) {
        if (!this._disposed) {
            this._$iframe[0].contentWindow.postMessage(JSON.stringify(messagePackage), "*");
        }
    }

    public _notifyLoadComplete() {
        this._receivedLoadedEvent = true;
        this._hideLoadingIndicator();
    }

    private _handleMessageReceived(event) {
        var that = this,
            originalEvent = event && event.originalEvent,
            origin = originalEvent && originalEvent.origin,
            message;

        // Filter to only events from this IFrame
        if (!this._disposed && originalEvent && originalEvent.source === this._$iframe[0].contentWindow && origin) {

            // Verify that the source of the message is from the extension's origin
            // (also allow messages from TFS itself as integration urls can be relative urls)
            if (that._integration.url.toLowerCase().indexOf(origin.toLowerCase()) === 0 ||
                (origin.toLowerCase().indexOf((window.location.protocol + "//" + window.location.host).toLowerCase()) === 0)) {

                message = Utils_Core.parseMSJSON(originalEvent.data, false) || {};

                if (!this._receivedLoadedEvent && message.actionId === ExtensionHost.Actions.EXTENSION_LOADED) {
                    this._notifyLoadComplete();
                }
                else if (!this._receivedReadyEvent && message.actionId === ExtensionHost.Actions.EXTENSION_READY) {
                    this._receivedReadyEvent = true;

                    // Send configuration
                    if (this._configuration) {
                        this.postMessage(ExtensionHost.Actions.SET_CONFIGURATION, this._configuration);
                    }

                    // Send queued messages
                    $.each(this._queuedMessages, function (i, queuedMessage) {
                        that._sendMessage(queuedMessage);
                    });
                }
                else if (message.actionId === ExtensionHost.Actions.EXTENSION_LOAD_ERROR) {
                    this._handleLoadError(message.actionData && message.actionData.errorMessage);
                }

                $.each(this._messageListeners, function (i, messageListener) {
                    messageListener.call(that, message);
                });
            }
        }
    }

    public _handleLoadError(errorMessage) {

        var hasFallbackControl = false,
            $fallbackControlElement;

        this._loadFailed = true;

        this._hideLoadingIndicator();

        if ($.isFunction(this._options.errorOptions.getFallbackControl)) {

            $fallbackControlElement = this._options.errorOptions.getFallbackControl.call(this);
            hasFallbackControl = $fallbackControlElement !== null && $fallbackControlElement.length;

            if (hasFallbackControl) {
                $fallbackControlElement.appendTo($("<div />").addClass("fallback-control").appendTo(this._$container));
                this._$iframe.hide();
            }
        }

        if (this._options.errorOptions.showLoadFailedMessage !== false) {
            this._showExtensionMessage(
                hasFallbackControl ? Notifications.MessageAreaType.Warning : Notifications.MessageAreaType.Error,
                Resources_Platform.ExtensionErrorHeader,
                errorMessage || Resources_Platform.ExtensionErrorBody,
                errorMessage ? true : false, // Is error message from the extension
                !hasFallbackControl); // Treat as Error (false as Warning)
        }

        this._fire(ExtensionHost.Events.EXTENSION_LOAD_FAILED, [this]);
    }
}
VSS.classExtend(ExtensionHost, TFS_Host_TfsContext.TfsContext.ControlExtensions);

export class ExternalPart extends ExtensionHost {

    private instanceKey: string;
    private loadedDeferred: JQueryDeferred<any>;

    constructor (options? ) {
        super(options);
    }

    private getInstanceKey() {
        var key: string;

        if (!this.instanceKey) {
            key = this.getIntegrationUrl() || '';

            // Trimming last '/' character
            if (key.charAt(key.length - 1) === '/') {
                key = key.substr(0, key.length - 1);
            }

            this.instanceKey = key;
        }

        return this.instanceKey;
    }

    public initialize() {
        super.initialize();
        this.loadedDeferred = $.Deferred();

        if (this._options.integration.handshake === WebAccessExtensionFrameHandshakeBehavior.Smart) {
            this.ensureXdmChannelIntialized();

            // Register itself for any possible height adjustment
            XDM_Host.globalObjectRegistry.register("VSS.Part[" + this.getInstanceKey() + "]", this);
        }
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({ cssClass: "external-part" }, options));
    }

    /**
     *  Resizes the iframe using the specified height value. 
     */
    public resize(width: number, height: number) {
        this.getIFrame().width(width).height(height);
    }
    
    /**
     *  Complete the initial handshake with the extension by sending the host configuration
     */
    public initialHandshake(notifyLoaded: boolean, success: (webContext: any) => void) {
        if (notifyLoaded) {
            this.notifyLoaded();
        }
        if (success) {
            success.call(this, Context._getDefaultRawPageContext());
        }
    }

    /**
     *  Gets called by the iframe window whenever extension site is loaded 
     */
    public notifyLoaded() {
        this._notifyLoadComplete();
        this.loadedDeferred.resolve();
    }

    /**
     *  Gets called by the iframe window whenever extension site hit an error trying to load
     *  @param error Error describing the failure
     */
    public notifyLoadFailed(error: any) {
        this._handleLoadError(error ? (error.message || error) : null);
        this.loadedDeferred.fail(error);
    }
    
    /**
     *  Returns a promise that is resolved once the extension is loaded
     */
    public loadingPromise(): JQueryPromise<any> {
        return this.loadedDeferred.promise();
    }
}

class ExtensionProgress extends Controls.BaseControl {

    private static PROGRESS_DURATION = 1000;
    private _part: ExternalPart;
    private _loaded: boolean = false;
    private _$statusElement: JQuery;
    private _statusIndicator: StatusIndicator.StatusIndicator;
    private _messageAreaControl: Notifications.MessageAreaControl;

    constructor (options? ) {
        super(options);

        this._part = options.part;
    }

    private getIFrame() { return this._part.getIFrame(); }
    private getUrl() { return this._part.getIntegrationUrl(); }

    public initialize() {
        // Setting up progress indicator
        this.setupProgress();

        // Attaches to iframe load event to get notified when the iframe finishes loading
        this.setupLoadEvent();
    }

    private setupProgress() {
        this.delayExecute("waitForProgress", ExtensionProgress.PROGRESS_DURATION, true, () =>{
            // Displaying overlay on the iframe
            this.getIFrame().addClass("loading");

            this._$statusElement = $("<div />").addClass("status-container").appendTo(this._element);
            this._statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._$statusElement, {
                center: true,
                imageClass: "big-status-progress",
                message: Resources_Platform.ExternalControlLoading
            });
            this._statusIndicator.start();
        });
    }

    private hideProgress() {

        this.getIFrame().removeClass("loading");

        if (this._statusIndicator) {
            this._statusIndicator.dispose();
            this._$statusElement.remove();

            this._statusIndicator = null;
            this._$statusElement = null;
        }
    }

    private setupLoadEvent() {

        this._part._bind(this.getIFrame(), "load", (e) => {

            // When the iframe gets loaded we don't know whether it succeeded or not. If it succeeds, notifyLoaded will be called.
            // At this point, we give the extension 3 seconds for the load notification. 
            // If it does not happen, error message is displayed.
            if (!this._loaded) {
                this.delayExecute("waitForLoadedEvent", ExtensionHost.MAX_WAIT_FOR_LOADED_EVENT, true, () =>{
                    if (!this._loaded) {
                        // No event received from extension site until this point.
                        // We assume that there is problem with the extension site and display error message.
                        this._loaded = true;
                        this.hideProgress();
                        this.showErrorMessage();
                    }
                });
            }
        });
    }

    private showErrorMessage() {

        var $errorContent,
            $errorContentBody,
            message,
            url = this.getUrl();


        // Message body header
        $errorContent = $("<div />");
        $errorContentBody = $("<div />").html(Resources_Platform.ExtensionErrorBody).appendTo($errorContent);

        $errorContentBody.find("a").text(url).attr("href", url).attr("target", "blank");

        // Message body additional steps
        $("<br />").appendTo($errorContent);
        $("<div />").html(Resources_Platform.ExtensionErrorAdditionalSteps).appendTo($errorContent);

        message = {
            type: Notifications.MessageAreaType.Error,
            header: Resources_Platform.ExtensionErrorHeader,
            content: $errorContent
        };

        this._messageAreaControl = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $("<div />").prependTo(this._element), {
            closeable: true,
            expanded: true,
            message: message
        });

        // Change padding of iframe container so that there is no overlap with the error details
        this._element.css("padding-top", (this._messageAreaControl._element.height() + 20) + "px");

        this._messageAreaControl._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, (e) => {
            this._element.css("padding-top", (this._messageAreaControl._element.height() + 20) + "px");
        });

        this._messageAreaControl._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, (e) => {
            this._element.css("padding-top", "0");
            this._messageAreaControl = null;
        });
    }

    private hideErrorMessage() {
        if (this._messageAreaControl) {
            this._messageAreaControl.clear();
            this._messageAreaControl.dispose();
        }
    }

    public loaded() {

        this._loaded = true;

        // Cancel any wait operation
        this.cancelDelayedFunction("waitForProgress");
        this.cancelDelayedFunction("waitForLoadedEvent");

        // Hiding the progress indicator
        this.hideProgress();

        // Hiding the error message if exists
        this.hideErrorMessage();
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Extensions", exports);
