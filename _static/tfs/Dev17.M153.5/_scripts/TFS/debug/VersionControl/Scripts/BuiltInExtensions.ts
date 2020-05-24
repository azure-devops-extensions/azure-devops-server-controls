import Context = require("VSS/Context");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Notifications = require("VSS/Controls/Notifications");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS_Context = require("VSS/Context");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");

import Extensions = require("Presentation/Scripts/TFS/TFS.Extensions");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import VCControlsCommon = require("VersionControl/Scripts/Controls/ControlsCommon");

import domElem = Utils_UI.domElem;

/**
 * This class mimics the behavor of the legacy TFS.Extensions ExtensionHost that hosts extensions in an iframe.
 * However, this will host the extension in a div within the same page, and mimic the asynchronous messaging.
 * This will be used for the Monaco Code Editor (the only legacy extension) to help improve performance
 * without changing the behavior or requiring any reaction work for the existing consumers of it.
 */
export class BuiltInExtensionHost extends Controls.BaseControl {

    // This path to the Monaco code editor files should match what's specified in
    // Tfs\Service\WebAccess\BuiltInExtensions\CodeEditor\CodeEditorHtmlExtensions.cs
    private _BUILT_IN_EDITOR_PATH = "Extensions/CodeEditor/0.13.1";

    private _$container: JQuery;
    private _$messagesIn: JQuery;
    private _$messagesOut: JQuery;

    private _$builtInExtensionDiv: JQuery;
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
     *     Creates a host control (div) for a built-in extension's integration point.
     *     Specifically, this is to be used to bring the Monaco editor into the current page, not in an iFrame.
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
     *         messageListener: message listener to add when creating the control
     *         errorOptions: Optional data for handling errors. errorOptions = {
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

    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            integration: null,
            postData: null,
            messageListener: null,
            coreCssClass: "extension-host-control"
        }, options, {
                errorOptions: $.extend({
                    showLoadFailedMessage: true,
                    formatErrorMessage: null
                }, options && options.errorOptions)
            }));
    }

    public initialize() {

        // Update RequireJS configuration to find the Monaco Code Editor files.
        let pageContext = Context.getPageContext();
        (<any>window).require.config({
            paths: {
                "vs": "../../../../../3rdParty/_content/" + this._BUILT_IN_EDITOR_PATH + "/vs",
                "BuiltInExtensions/Scripts": "../../Extensions" + (pageContext.diagnostics.debugMode ? "/debug" : "/min")
            }
        });

        // Add the Monaco Code Editor theme stylesheet.  This is required primarily for supporting High Contrast mode.
        // As of v0.1.0, all Monaco styles now reside in a single file:  editor.main.css.  Options include vs, vs-dark, hc-black.
        let tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        let thirdPartyUrl = tfsContext.configuration.get3rdPartyStaticRootPath();
        let codeEditorThemeName = (Utils_String.caseInsensitiveContains((VSS_Context.getPageContext().globalization.theme || ""), "HighContrast")) ? "hc-black" : "vs";
        let codeEditorCss = Utils_String.format("{0}_content/{1}/vs/editor/editor.main.css", thirdPartyUrl, this._BUILT_IN_EDITOR_PATH);
        Utils_UI.injectStylesheets([codeEditorCss]);

        // Create the host container and messaging DOM elments.
        this._$container = $("<div />").addClass("extension-host-container");
        let $builtInMessages = $(domElem("div", "built-in-extension-messages")).hide();
        this._$messagesIn = $(domElem("div", "built-in-exension-messages-in"));
        this._$messagesIn.appendTo($builtInMessages);
        this._$messagesOut = $(domElem("div", "built-in-exension-messages-out"));
        this._$messagesOut.appendTo($builtInMessages);

        // Add a listener for messages coming out from the non-iframe extension.
        this._$messagesOut.on("message", (event: JQueryEventObject, params: any) => {
            this._handleMessageReceived(params);
        });

        $builtInMessages.appendTo(this._$container);
        this._$builtInExtensionDiv = $(domElem("div", "built-in-extension-div loading"));
        this._$builtInExtensionDiv.appendTo(this._$container);

        // Create the JSON island for the expected initial editor configuration options (mimicking  the legacy iframe behavior),
        // adding the webContext as before to ensure compatibility with any existing code that requires it.
        let rawPageContext = Context._getDefaultRawPageContext();
        let rawWebContext = rawPageContext ? rawPageContext.webContext : null;
        let editorConfig = $.extend({}, this._options.postData, rawWebContext);
        let hostIdClass = "code-editor-hostId-" + this.getId();
        $(domElem("script", "code-editor-options " + hostIdClass))
            .attr("type", "application/json")
            .html(JSON.stringify(editorConfig))
            .appendTo(this._$builtInExtensionDiv);

        $(domElem("div", "errors-host " + hostIdClass)).hide().appendTo(this._$builtInExtensionDiv);
        $(domElem("div", "code-editor-host " + hostIdClass)).appendTo(this._$builtInExtensionDiv);
        this._$container.appendTo(this._element);

        // Create and initialize the built-in Monaco "extension", communicating via the messagesIn and messagesOut elements.
        require(["BuiltInExtensions/Scripts/TFS.Extension"], (TFS_Extension) => {
            if (this._options.end_point === VCControlsCommon.VersionControlExtensionEndPoints.FILE_VIEWER) {
                TFS_Extension.VersionControlExtension.createBuiltInCodeEditor(this._$messagesIn, this._$messagesOut, this.getId());
            }
            else if (this._options.end_point === VCControlsCommon.VersionControlExtensionEndPoints.DIFF_VIEWER) {
                TFS_Extension.VersionControlExtension.createBuiltInDiffEditor(this._$messagesIn, this._$messagesOut, this.getId());
            }
            else {
                throw new Error("Only the Monaco code editor may be hosted as a legacy built-in extension");
            }
        });

        if ($.isFunction(this._options.messageListener)) {
            this.addMessageListener(this._options.messageListener);
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
            this.postMessage(Extensions.ExtensionHost.Actions.SET_CONFIGURATION, configurationData);
        }
    }

    /**
     *     Posts a message to the built-in extension.
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

        let messagePackage = {
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

    /**
     *     Adds a listener for messages from this built-in extension.
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

    /**
     * Disposes of this control.  It's expected that the DOM element for this extension will also be removed
     * following this call to trigger the full disposal of the Monaco models and editor.
     */
    public _dispose() {
        this._$messagesOut.off("message");
        super._dispose();
    }

    private _showExtensionMessage(messageType, messageTitle, messageContentHtml, isErrorMessageFromExtension, expandDetails) {

        let that = this,
            $errorContent,
            $errorContentBody,
            message;

        if (this._options.errorOptions.showLoadFailedMessage !== false) {

            let normalizedMessageContentHtml = Utils_Html.HtmlNormalizer.normalize(messageContentHtml || "");
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
                that._fire(Extensions.ExtensionHost.Events.EXTENSION_MESSAGE_RESIZED, [that]);
            });
            this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, function () {
                that._$container.css("padding-top", "0");
                that._messageArea = null;
                that._fire(Extensions.ExtensionHost.Events.EXTENSION_MESSAGE_RESIZED, [that]);
            });

            this._fire(Extensions.ExtensionHost.Events.EXTENSION_MESSAGE_RESIZED, [that]);
        }
        else {
            this._messageArea.setMessage(message);
            if (expandDetails) {
                this._messageArea.setErrorDetailsVisibility(true);
            }
        }
    }

    private _hideLoadingIndicator() {

        this._$builtInExtensionDiv.removeClass("loading");

        if (this._statusControl) {
            this._statusControl.dispose();
            this._$statusContainer.remove();

            this._statusControl = null;
            this._$statusContainer = null;
        }
    }

    private _sendMessage(messagePackage) {
        if (!this._disposed) {
            let message = JSON.stringify(messagePackage);
            setTimeout(() => {
                this._$messagesIn.triggerHandler("message", [{ data: message }]);
            }, 0);
        }
    }

    public _notifyLoadComplete() {
        this._receivedLoadedEvent = true;
        this._hideLoadingIndicator();
    }

    private _handleMessageReceived(params: any) {
        let that = this;

        if (!this._disposed) {

            let message = Utils_Core.parseMSJSON(params.data, false) || {};

            if (!this._receivedLoadedEvent && message.actionId === Extensions.ExtensionHost.Actions.EXTENSION_LOADED) {
                this._notifyLoadComplete();
            }
            else if (!this._receivedReadyEvent && message.actionId === Extensions.ExtensionHost.Actions.EXTENSION_READY) {
                this._receivedReadyEvent = true;

                // Send configuration
                if (this._configuration) {
                    this.postMessage(Extensions.ExtensionHost.Actions.SET_CONFIGURATION, this._configuration);
                }

                // Send queued messages
                $.each(this._queuedMessages, function (i, queuedMessage) {
                    that._sendMessage(queuedMessage);
                });
            }
            else if (message.actionId === Extensions.ExtensionHost.Actions.EXTENSION_LOAD_ERROR) {
                this._handleLoadError(message.actionData && message.actionData.errorMessage);
            }

            $.each(this._messageListeners, function (i, messageListener) {
                messageListener.call(that, message);
            });
        }
    }

    public _handleLoadError(errorMessage) {

        let hasFallbackControl = false,
            $fallbackControlElement;

        this._loadFailed = true;

        this._hideLoadingIndicator();

        if ($.isFunction(this._options.errorOptions.getFallbackControl)) {

            $fallbackControlElement = this._options.errorOptions.getFallbackControl.call(this);
            hasFallbackControl = $fallbackControlElement !== null && $fallbackControlElement.length;

            if (hasFallbackControl) {
                $fallbackControlElement.appendTo($("<div />").addClass("fallback-control").appendTo(this._$container));
                this._$builtInExtensionDiv.hide();
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

        this._fire(Extensions.ExtensionHost.Events.EXTENSION_LOAD_FAILED, [this]);
    }
}
