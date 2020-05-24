
/// Imports of 3rd Party ///
import Q = require("q");
/// Imports of VSS ///
import Ajax = require("VSS/Ajax");
import Authentication_Contracts = require("VSS/Authentication/Contracts");
import Authentication_Services = require("VSS/Authentication/Services");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Constants_Platform = require("VSS/Common/Constants/Platform");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Services = require("VSS/Contributions/Services");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Locations = require("VSS/Locations");
import LWP = require("VSS/LWP");
import Notifications = require("VSS/Controls/Notifications");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import SDK_Host = require("VSS/SDK/Host");
import SDK_Shim = require("VSS/SDK/Shim");
import SDK_XDM = require("VSS/SDK/XDM");
import Serialization = require("VSS/Serialization");
import Service = require("VSS/Service");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Array = require("VSS/Utils/Array");
import Utils_Core = require("VSS/Utils/Core");
import Utils_File = require("VSS/Utils/File");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Url = require("VSS/Utils/Url");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import VSS = require("VSS/VSS");
import { ServiceInstanceTypes } from "VSS/WebApi/Constants";

// Used for async require
import Gallery_RestClientAsync = require("VSS/Gallery/RestClient");

/**
* Common interface between internal and external contribution hosts
*/
export interface IExtensionHost {

    /**
    * Get an instance of a registered object in an extension
    *
    * @param instanceId Id of the instance to get
    * @param contextData Optional data to pass to the extension for it to use when creating the instance
    * @return Promise that is resolved to the instance (or a proxy object that talks to the instance in the iframe case)
    */
    getRegisteredInstance<T>(instanceId: string, contextData?: any): IPromise<T>;

    /**
    * Gets the promise that is resolved when the host is loaded, and rejected when the load fails or times out.
    */
    getLoadPromise(): IPromise<any>;

    /**
    * Dispose the host control
    */
    dispose(): void;
}

/**
* Interface for extension hosts that support reuse
*/
interface IReusableExtensionHost extends IExtensionHost {
    /**
    * Handle an extension being reused by a different contribution that points to the same endpoint (for pooled extension hosts)
    *
    * @param contribution The contribution causing the extension to be reused
    */
    reuseHost(contribution: Contributions_Contracts.Contribution);
}

/** The resize options for a contribution host */
export enum ResizeOptions {
    /**
     * Default resize option which means both height and width resizing are allowed 
     */
    Default = 0,

    /**
     * The height of the host cannot be changed
     */
    FixedHeight = 2,

    /**
     * The width of the host cannot be changed
     */
    FixedWidth = 4
}

/**
* Options for the host control to toggle progress indication or error/warning handling. 
*/
export interface IContributionHostBehavior {
    /**
    * Show the loading indicator for the extension. Defaults to true if unspecified.
    */
    showLoadingIndicator?: boolean;

    /**
    * Show the error indicator for the extension. Defaults to true if unspecified.
    */
    showErrorIndicator?: boolean;

    /**
    * Time to wait in milliseconds (ms) before the slow warning indicator for the extension is displayed. 
    * If unspecified, The default timeout period is used. 
    */
    slowWarningDurationMs?: number;

    /**
    * Time to wait in milliseconds (ms) before erroring when waiting for loaded event handshake
    * If unspecified, the default timeout period is used. 
    */
    maxHandshakeDurationMs?: number;

    /**
     * The resize options for the host. By default both height and width and be resized but this can be changed to only allow one direction of resizing
     */
    resizeOptions?: ResizeOptions;
    callbacks?: IContributionHostBehaviorCallbacks;
}

export interface IContributionHostBehaviorCallbacks {
    success(): void;
    failure(message?: string): void;
    slow(): void;
}

/**
* Options for contribution host controls
*/
interface ContributionHostOptions {

    /**
    * Uri that the child frame points to
    */
    uri: string;

    /**
    * Secondary Uri that the child frame points to
    */
    fallbackUri: string;

    /**
    * The contribution that is initially causing the extension to load
    */
    contribution: Contributions_Contracts.Contribution;

    /**
    * If undefined, perform a GET request to obtain the iframe content. If postContent is specified it will be POST'ed to the child iframe url
    */
    postContent?: any;

    /**
    * Initial configuration/options to be passed to the content as part of the XDM handshake
    */
    initialConfig?: any;

    /**
    * Options to pass to the host control to toggle displaying progress indication and error/warning handling. If undefined, the options to show loading or error indicator
    * defaults to ON (true) and the default timeout period for the slow load warning is used. 
    */
    contributionHostBehavior?: IContributionHostBehavior;
}

/**
* Options for the external content host control
*/
interface ExternalContentHostOptions extends ContributionHostOptions {

    /**
    * If true, setup an XDM channel with the child frame (this flag indicates that the child frame uses VSS.SDK).
    */
    interactive?: boolean;
}

/**
 * Contains the new width and height of the contribution host after it is resized
 */
export interface IExternalContentHostResizedEventArgs {
    width: number;
    height: number;
    host: IExtensionHost;
}

export module ExternalContentHostEvents {
    export var SLOW_LOAD_WARNING = "external-content-host-slow-load-warning";
    export var EXTENSION_MESSAGE_RESIZED = "external-content-host-message-resized";
    export var EXTENSION_HOST_RESIZED = "external-content-host-resized";
};

/**
* A control that hosts external content via iframe
*/
class ExternalContentHost extends Controls.Control<ExternalContentHostOptions> implements IReusableExtensionHost {

    public static DEFAULT_SLOW_LOAD_DURATION: number = 10000; // 10 seconds
    public static MAX_WAIT_FOR_HANDSHAKE_EVENT: number = 5000; // 5 seconds
    public static EXTENSION_FLAGS_TRUSTED: number = 2;

    private static EXTENSION_DISPLAY_NAME_PROPERTY = "ExtensionDisplayName";
    private static SANDBOXED_STORAGE_SETTINGS_PREFIX = "extension-data:";
    private static SANDBOXED_STORAGE_SIZE_LIMIT = 250000; // 250 KB per publisher

    private _xdmChannel: IXDMChannel;
    private _receivedHandshake: boolean;
    private _receivedLoadedEvent: boolean;
    private _loadFailed: boolean;
    private _loadedDeferred: Q.Deferred<any>;
    private _contributions: Contributions_Contracts.Contribution[];
    private _extensionReusedCallback: (contribution: Contribution) => void;
    private _galleryUrlPromise: IPromise<string>;

    private _$container: JQuery;
    private _$iframe: JQuery;
    private _$statusContainer: JQuery;
    private _statusControl: StatusIndicator.StatusIndicator;
    private _messageArea: Notifications.MessageAreaControl;
    private _showingErrorDetails: boolean;
    private _sandboxedIframe: boolean;
    private _errorResizeDelegate: (JQueryEventObject) => any;
    private _contributionHostBehavior: IContributionHostBehavior;
    private _srcUri: string;
    private _usingFallback: boolean = false;
    private _usingTheme: boolean = false;

    constructor(options?: ExternalContentHostOptions) {
        super(options);
        this.setEnhancementOptions({
            coreCssClass: "external-content-host"
        });
        this._contributions = [];

        // default the host behaviour to be ON.
        this._contributionHostBehavior = {
            showErrorIndicator: true,
            showLoadingIndicator: true,
            slowWarningDurationMs: ExternalContentHost.DEFAULT_SLOW_LOAD_DURATION,
            maxHandshakeDurationMs: ExternalContentHost.MAX_WAIT_FOR_HANDSHAKE_EVENT,
            resizeOptions: ResizeOptions.Default
        };
    }

    /**
    * Gets the promise that is resolved when the host is loaded, and rejected when the load fails or times out.
    */
    public getLoadPromise(): IPromise<any> {
        return this._loadedDeferred.promise;
    }

    public initialize() {

        Diag.Debug.assertIsNotNull(this._options.uri, "url");
        Diag.Debug.assertIsNotNull(this._options.contribution, "contribution");

        this._srcUri = this._options.uri;
        if (FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.UseGalleryCdn) && this._options.fallbackUri && this._isGalleryCdnDisabled()) {
            this._srcUri = this._options.fallbackUri;
            this._usingFallback = true;
        } else {
            this._deleteFallbackCookie();
        }

        let hostBehavior = this._options.contributionHostBehavior;
        if (hostBehavior) {
            if (hostBehavior.showErrorIndicator !== undefined && hostBehavior.showErrorIndicator !== null) {
                this._contributionHostBehavior.showErrorIndicator = hostBehavior.showErrorIndicator;
            }

            if (hostBehavior.showLoadingIndicator !== undefined && hostBehavior.showLoadingIndicator !== null) {
                this._contributionHostBehavior.showLoadingIndicator = hostBehavior.showLoadingIndicator;
            }
            if (hostBehavior.slowWarningDurationMs !== undefined && hostBehavior.slowWarningDurationMs !== null) {
                this._contributionHostBehavior.slowWarningDurationMs = hostBehavior.slowWarningDurationMs;
            }
            if (hostBehavior.maxHandshakeDurationMs !== undefined && hostBehavior.maxHandshakeDurationMs !== null) {
                this._contributionHostBehavior.maxHandshakeDurationMs = hostBehavior.maxHandshakeDurationMs;
            }
            if (hostBehavior.resizeOptions !== undefined && hostBehavior.resizeOptions !== null) {
                this._contributionHostBehavior.resizeOptions = hostBehavior.resizeOptions;
            }
            if (hostBehavior.callbacks) {
                this._contributionHostBehavior.callbacks = hostBehavior.callbacks;
            }
        }

        this._$container = $("<div />").addClass("external-content-host-container").appendTo(this._element);

        this._loadedDeferred = Q.defer();

        // We can not show extensions for onpremise if browser version is less than or equal to IE9
        if (!Context.getPageContext().webAccessConfiguration.isHosted && Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE9() && !FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.VisualStudioServicesContributionUnSecureBrowsers, false)) {
            this._showExtensionMessage(Notifications.MessageAreaType.Warning, VSS_Resources_Platform.ExtensionsNotAvailableOnpremOldIE, false, null, false);
        } else {
            this._getInDomPromise().then(() => {
                this._finishInitialization();
            });
        }
    }

    private _finishInitialization() {

        if (this.isDisposed()) {
            return;
        }

        var $form: JQuery;
        var iframeId = "externalContentHost" + Controls.getId();;

        if (this._options.postContent) {

            $form = $("<form />")
                .attr("method", "post")
                .attr("target", iframeId)
                .attr("action", this._srcUri)
                .appendTo(this._$container);

            $("<input />")
                .attr("type", "hidden")
                .attr("name", "requestJson")
                .attr("value", JSON.stringify(this._options.postContent))
                .appendTo($form);
        }

        this._$iframe = $("<iframe frameborder='0' />")
            .addClass("external-content-iframe")
            .attr({
                id: iframeId,
                name: iframeId,
                role: "presentation",
            })
            .appendTo(this._$container);

        if (this._options.interactive) {

            this._$iframe.hide();
            this._$iframe.addClass("loading");

            if (this._contributionHostBehavior.showLoadingIndicator) {
                this._$statusContainer = $("<div />").addClass("status-container").appendTo(this._$container);
                this._statusControl = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, this._$statusContainer, {
                    center: true,
                    imageClass: "big-status-progress",
                    message: Resources_Platform.ExternalControlLoading
                });
                this._statusControl.start();
            }

            if (this._contributionHostBehavior.slowWarningDurationMs > 0) {
                this.delayExecute("slowLoadTimeout", this._contributionHostBehavior.slowWarningDurationMs, true, () => {
                    if (!this._disposed && !this._loadFailed && !this._receivedLoadedEvent) {
                        if (this._shouldAttemptFallback()) {
                            this._loadFallback();
                        } else {
                            this._showExtensionMessage(Notifications.MessageAreaType.Warning, Resources_Platform.ExternalContentSlowLoadFormat, true);
                            if (this._contributionHostBehavior.callbacks) {
                                this._contributionHostBehavior.callbacks.slow();
                            }
                        }
                    }
                });
            }
        }

        this._$iframe.load((ev) => {

            if (this._options.interactive) {

                // Give the extension a few seconds to fire its "loaded" event.
                if (!this._receivedHandshake && !this._receivedLoadedEvent && !this._loadFailed && !this._disposed) {
                    this.delayExecute("waitForHandshake", this._contributionHostBehavior.maxHandshakeDurationMs, true, function () {
                        if (!this._receivedHandshake && !this._receivedLoadedEvent && !this._loadFailed && !this._disposed) {
                            // Handhake request not received in a reasonable amount of time. Assume that there is a problem with this extension.
                            if (this._shouldAttemptFallback()) {
                                this._loadFallback();
                            } else {
                                this._handleLoadError(null);
                            }
                        }
                    });
                }
            }
            else {
                this._loadedDeferred.resolve(null);
            }
        });

        // Need to sandbox onprem extensions if they are from the same domain.
        if (!Context.getPageContext().webAccessConfiguration.isHosted
            && Utils_Url.isSameOrigin(this._srcUri, window.location.href)
            && !(FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.VisualStudioServicesContributionUnSecureBrowsers, false) && Utils_UI.BrowserCheckUtils.isLessThanOrEqualToIE9())) {

            this._$iframe.attr('sandbox', 'allow-forms allow-modals allow-pointer-lock allow-popups allow-scripts allow-top-navigation');
            this._sandboxedIframe = true;
        }

        if (this._options.postContent) {
            (<any>$form[0]).submit();
        } else {
            this._$iframe.attr("src", this._srcUri);
        }

        if (this._options.interactive) {
            this._xdmChannel = null;
            this.ensureXdmChannelIntialized();
        }
    }

    private _shouldAttemptFallback(): boolean {
        return !this._usingFallback && this._options.fallbackUri && FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(Constants_Platform.WebPlatformFeatureFlags.UseGalleryCdn);
    }

    private _loadFallback(): void {
        this._enableFallbackCookie();
        this._usingFallback = true;
        this._srcUri = this._options.fallbackUri;

        this._$iframe.remove();
        this._hideLoadingIndicator();
        this._finishInitialization();
    }

    private _isGalleryCdnDisabled() {
        var useFallbackCookie = this._getCookie("GALLERY-CDN");
        return useFallbackCookie && useFallbackCookie === "disabled";
    }

    private _enableFallbackCookie() {
        if (Context.getPageContext().webAccessConfiguration.isHosted) {
            var useFallbackCookie = this._getCookie("GALLERY-CDN");
            if (!useFallbackCookie) {
                var cookieDuration = 60 * 60;  // disable cdn use for one hour
                this._setFallbackCookie(cookieDuration, "disabled");
            }
        }
    }

    private _deleteFallbackCookie() {
        if (Context.getPageContext().webAccessConfiguration.isHosted) {
            var useFallbackCookie = this._getCookie("GALLERY-CDN");

            if (useFallbackCookie) {
                this._setFallbackCookie(0, "");
            }
        }
    }

    private _setFallbackCookie(maxage: number, value: string) {
        if (Context.getPageContext().webAccessConfiguration.isHosted) {
            var secureFlag = "";
            if (window.location.protocol.indexOf("https") !== -1) {
                secureFlag = ";secure";
            }

            document.cookie = "GALLERY-CDN" + "=" + value + ";max-age=" + maxage + ";path=/" + secureFlag;
        }
    }

    private _getCookie(cookieName: string): string {
        if (Context.getPageContext().webAccessConfiguration.isHosted && document.cookie.length > 0) {
            var cookieStart = document.cookie.indexOf(cookieName + "=");
            if (cookieStart !== -1) {
                cookieStart = cookieStart + cookieName.length + 1;
                var cookieEnd = document.cookie.indexOf(";", cookieStart);
                if (cookieEnd === -1) {
                    cookieEnd = document.cookie.length;
                }

                return decodeURIComponent(document.cookie.substring(cookieStart, cookieEnd));
            }
        }

        return "";
    }

    private _handleLoadSuccess() {

        this._receivedLoadedEvent = true;
        this._hideLoadingIndicator();
        this._loadedDeferred.resolve(null);
        if (this._contributionHostBehavior.callbacks) {
            this._contributionHostBehavior.callbacks.success();
        }
    }

    private _handleLoadError(error: any) {

        this._loadFailed = true;
        this._hideLoadingIndicator();
        this._loadedDeferred.reject(error);

        if (this._contributionHostBehavior.showErrorIndicator) {
            var errorMessage = (error && error.message) ? error.message : error;
            this._showExtensionMessage(Notifications.MessageAreaType.Error, Resources_Platform.ExternalContentErrorFormat, false, errorMessage);
            if (this._contributionHostBehavior.callbacks) {
                this._contributionHostBehavior.callbacks.failure(errorMessage);
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

    private _getExtensionUrl(): IPromise<string> {

        if (!this._galleryUrlPromise) {
            var contribution = this._options.contribution;
            var deferred = Q.defer<string>();
            this._galleryUrlPromise = deferred.promise;
            VSS.using(["VSS/Gallery/RestClient"], (Gallery_RestClient: typeof Gallery_RestClientAsync) => {
                Locations.beginGetServiceLocation(Gallery_RestClient.GalleryHttpClient.serviceInstanceId, Contracts_Platform.ContextHostType.Deployment).then((galleryUrl) => {
                    let galleryWebUrl = Context.getPageContext().webAccessConfiguration.isHosted ? galleryUrl : (Utils_File.combinePaths(galleryUrl, "_gallery"));
                    deferred.resolve(Utils_File.combinePaths(galleryWebUrl, "items/" + Contributions_Services.ExtensionHelper.getPublisherId(contribution) + "." + Contributions_Services.ExtensionHelper.getExtensionId(contribution)));
                });
            });
        }
        return this._galleryUrlPromise;
    }

    private _showExtensionMessage(messageType: Notifications.MessageAreaType, messageFormat: string, dismissible: boolean, errorDetails?: string, includeLearnMore: boolean = true) {

        const contribution = this._options.contribution;
        const extensionService = Service.getService(Contributions_Services.ExtensionService);
        const providerDisplayName = extensionService.getProviderDisplayName(contribution) || Contributions_Services.ExtensionHelper.getPublisherId(contribution);
        const extensionName = extensionService.getProviderProperty(contribution, ExternalContentHost.EXTENSION_DISPLAY_NAME_PROPERTY) || Contributions_Services.ExtensionHelper.getExtensionId(contribution);

        var extensionText = Utils_String.format(
            Resources_Platform.ExtensionDisplayNameFormat,
            extensionName,
            providerDisplayName);

        var $messageTitle = $("<div />");
        $("<span />").appendTo($messageTitle).text(Utils_String.format(messageFormat, extensionText));

        if (includeLearnMore) {
            this._getExtensionUrl().then((url) => {

                var $help = $("<span />")
                    .addClass("help-text")
                    .appendTo($messageTitle)
                    .html(Resources_Platform.ExternalContentErrorLearnMoreContent);

                $help.find("a").attr("href", url).attr("target", "_blank");

                this._handleMessageAreaResize();
            });
        }

        var $details: JQuery;

        this._showingErrorDetails = !!errorDetails;
        if (this._showingErrorDetails) {
            $details = $("<div />").text(errorDetails);
        }

        var message = {
            type: messageType,
            header: $messageTitle,
            content: $details
        };

        if (this._messageArea) {
            this._messageArea.dispose();
        }

        this._messageArea = <Notifications.MessageAreaControl>Controls.Enhancement.enhance(Notifications.MessageAreaControl, $("<div />").prependTo(this._element), {
            closeable: dismissible,
            showIcon: true,
            expanded: !!errorDetails,
            showDetailsLink: false,
            message: message
        });

        // Change padding of iframe container so that there is no overlap with the error details
        this._handleMessageAreaResize();
        this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_COMPLETE, () => {
            this._handleMessageAreaResize();
            this._fire(ExternalContentHostEvents.EXTENSION_MESSAGE_RESIZED, [this]);
        });
        this._messageArea._bind(Notifications.MessageAreaControl.EVENT_DISPLAY_CLEARED, () => {
            this._messageArea = null;
            this._handleMessageAreaResize();
            this._fire(ExternalContentHostEvents.EXTENSION_MESSAGE_RESIZED, [this]);
        });

        this._fire(ExternalContentHostEvents.EXTENSION_MESSAGE_RESIZED, [this]);

        if (!this._errorResizeDelegate) {
            this._errorResizeDelegate = (e: JQueryEventObject) => {
                this._handleMessageAreaResize();
            }
            $(window).bind("resize", this._errorResizeDelegate);
        }
    }

    public dispose() {
        super.dispose();

        if (this._$iframe) {
            // When the element is removed from the DOM, set the src to about:blank to work around
            // IE focus issues. Still needed on IE11. See bugs: mseng #144840, microsoft OSG: #1142940
            if (Utils_UI.BrowserCheckUtils.isIEVersion(11)) {
                this._$iframe.attr("src", "about:blank");
            }
            this._$iframe = null;
        }

        if (this._errorResizeDelegate) {
            $(window).unbind("resize", this._errorResizeDelegate);
        }

        if (this._xdmChannel) {
            SDK_XDM.channelManager.removeChannel(this._xdmChannel);
            this._xdmChannel = null;
        }

        if (this._usingTheme) {
            const themeService = LWP.getLWPService("IVssThemeService");
            themeService.unsubscribe(this._onThemeChanged, "themeChanged");
        }

        // Edge still holds on to iframe even we set _$iframe to null. Clearing the _$container would solve it
        this._$container = null;
    }

    private _handleMessageAreaResize() {
        var topOffset = "0";
        if (this._messageArea) {
            topOffset = (this._messageArea._element.outerHeight() + (this._showingErrorDetails ? 20 : 0)) + "px";
        }

        this._$container.css("padding-top", topOffset);
        if (this._$statusContainer) {
            this._$statusContainer.css("top", topOffset);
        }
    }

    /**
    * Gets the XDM channel used to communicate with the child iframe
    */
    private getXdmChannel(): IXDMChannel {
        this.ensureXdmChannelIntialized();
        return this._xdmChannel;
    }

    /**
    * Initialize the XDM channel if we haven't already done so
    */
    private ensureXdmChannelIntialized(): void {
        if (!this._xdmChannel) {
            const extensionService = Service.getService(Contributions_Services.ExtensionService);
            const fallbackBaseUri = extensionService.getFallbackUri(this._options.contribution);
            const baseUri = extensionService.getBaseUri(this._options.contribution);

            this._xdmChannel = SDK_XDM.channelManager.addChannel((<any>this._$iframe[0]).contentWindow, this._srcUri);

            const hostControl = this.getHostControl();
            this._xdmChannel.getObjectRegistry().register("VSS.HostControl", hostControl);
            this._xdmChannel.getObjectRegistry().register("DevOps.HostControl", hostControl);

            this._xdmChannel.getObjectRegistry().register("vss.hostManagement", new SDK_Host.HostManagementService({
                baseUri: this._usingFallback && fallbackBaseUri ? fallbackBaseUri : baseUri,
                publisherId: Contributions_Services.ExtensionHelper.getPublisherId(this._options.contribution),
                extensionId: Contributions_Services.ExtensionHelper.getExtensionId(this._options.contribution),
                contributionId: Contributions_Services.ExtensionHelper.getFullContributionId(this._options.contribution),
                version: Service.getService(Contributions_Services.ExtensionService).getVersion(this._options.contribution),
                registrationId: Service.getService(Contributions_Services.ExtensionService).getRegistrationId(this._options.contribution),
                initialConfig: this._options.initialConfig
            }));
        }
    }

    /**
    * Get an instance of a registered object in an extension
    *
    * @param instanceId Id of the instance to get
    * @param contextData Optional data to pass to the extension for it to use when creating the instance
    * @return Promise that is resolved to the instance (or a proxy object that talks to the instance in the iframe case)
    */
    public getRegisteredInstance<T>(instanceId: string, contextData?: any): IPromise<T> {

        return this._loadedDeferred.promise.then(() => {
            return Q.Promise((resolve, reject) => {

                var relativeCheckTimeout: Utils_Core.DelayedFunction;
                var fullyQualifiedRequestHandled = false;

                // Send the supplied id as the first request. This request will manage both success and failure
                // While the back-compat request only manages success.
                this.getXdmChannel().getRemoteObjectProxy<T>(instanceId, contextData).then(
                    (value) => {
                        fullyQualifiedRequestHandled = true;
                        if (relativeCheckTimeout) {
                            relativeCheckTimeout.cancel();
                            relativeCheckTimeout = null;
                        }
                        // The promise has the potential to resolve() more than once. The if-condition below
                        // will fail if the instanceId is obtained through a contribution property, such as
                        // registeredObjectId, meaning that the if-condition above will fail because there is no
                        // available timeout object. The A+ Promise spec guarantees that subsequent resolutions
                        // of a promise will have no effect.
                        resolve(value);
                    },
                    (reason: any) => {
                        fullyQualifiedRequestHandled = true;
                        if (!relativeCheckTimeout) {
                            reject(reason);
                        }
                    }
                );

                // If you specified the fully-qualified contribution identifier we will give the 
                // contribution 250 ms to respond with a background instance. If we havent heard
                // back after 250 ms we will start another request with the relative Id. This is
                // for back-compat since this was the old model. If the fully-qualified request
                // is responded too in time we will not start this one. Also in either case if
                // either request responds successfully we will ignore the other.
                const hostContributionIdentifiers = this._options.contribution.id.split("."),
                    localContributionIdentifiers = instanceId.split(".");

                if (hostContributionIdentifiers.length >= 2 &&
                    localContributionIdentifiers.length >= 2 &&
                    hostContributionIdentifiers[0] === localContributionIdentifiers[0] &&
                    hostContributionIdentifiers[1] === localContributionIdentifiers[1]) {

                    relativeCheckTimeout = Utils_Core.delay(this, 250, () => {
                        var relativeId = localContributionIdentifiers.slice(2).join(".");

                        // Note: reject is not called in this case, if the caller doesnt have the short form
                        //  that is ok, we will let the fully qualified request manage failures.
                        this.getXdmChannel().getRemoteObjectProxy<T>(relativeId, contextData).then(
                            (value) => {
                                if (relativeCheckTimeout) {
                                    relativeCheckTimeout = null;
                                    resolve(value);
                                }
                            },
                            (reason: any) => {
                                relativeCheckTimeout = null;
                                if (fullyQualifiedRequestHandled) {
                                    reject(reason);
                                }
                            }
                        );
                    });
                }
            });
        });
    }

    /**
    * Handle an extension being reused by a different contribution that points to the same endpoint (for pooled extension hosts)
    *
    * @param contribution The contribution causing the extension to be reused
    */
    public reuseHost(contribution: Contributions_Contracts.Contribution) {
        this._loadedDeferred.promise.then(() => {
            if (this._contributions.indexOf(contribution) < 0) {
                if ($.isFunction(this._extensionReusedCallback)) {
                    this._extensionReusedCallback(<Contribution>(<any>contribution));
                }
                this._contributions.push(contribution);
            }
        });
    }

    private _onThemeChanged = (value: any) => {
        if (this._xdmChannel) {
            // Fire an event in the extension iframe that the external content can listen to in order to update its themed values.
            this._xdmChannel.invokeRemoteMethod("dispatchEvent", "DevOps.SdkClient", ["themeChanged", { detail: value }]);
        }
    };

    /**
     * Get the host control object which the VSS.SDK can interact with to
     * for initial handshake, resizinig, etc. 
     */
    private getHostControl() {
        return {

            /**
             *  Resizes the iframe using the specified height value. 
             */
            resize: (width: number, height: number) => {

                // The contributionHostBehavior.resizeOptions is ensured to be defined during initialize
                // if not specified it is set to ResizeOptions.Default

                if ((this._contributionHostBehavior.resizeOptions & ResizeOptions.FixedHeight) === 0) {
                    this._$iframe.height(height);
                }

                if ((this._contributionHostBehavior.resizeOptions & ResizeOptions.FixedWidth) === 0) {
                    this._$iframe.width(width);
                }

                SDK_Shim.VSS.resize();

                // Fire event to notify that the contribution was resized
                var args: IExternalContentHostResizedEventArgs = {
                    height: height,
                    width: width,
                    host: this
                };

                this._fire(ExternalContentHostEvents.EXTENSION_HOST_RESIZED, args);
            },

            /**
             *  Complete the initial handshake with the extension by sending the host configuration
             */
            initialHandshake: async (handshakeData: IExtensionHandshakeData) => {

                this._receivedHandshake = true;
                this._$iframe.show();

                let themeData: { [varName: string]: string } | undefined;
                let useNewSdk = false;
                let markLoaded = false;

                if (handshakeData) {
                    useNewSdk = (handshakeData as any).sdkVersion > 0;
                    if (handshakeData.notifyLoadSucceeded || (useNewSdk && (handshakeData as any).loaded !== false)) {
                        markLoaded = true;                        
                    }
                    this._extensionReusedCallback = handshakeData.extensionReusedCallback;

                    const applyTheme = useNewSdk ? handshakeData.applyTheme !== false : handshakeData.applyTheme === true;

                    if (applyTheme) {
                        const themeService = LWP.getLWPService("IVssThemeService");

                        if(themeService) {
                            const theme = themeService.getCurrentTheme();
                            if (theme) {
                                themeData = theme.data;
                            }

                            themeService.subscribe(this._onThemeChanged, "themeChanged");
                            this._usingTheme = true;
                        }
                        
                    }
                    else {
                        this._$iframe.addClass("themeless");
                    }
                }

                var contribution = this._options.contribution;

                let pageContext = Context.getPageContext();
                if (!pageContext.webContext.team && pageContext.webContext.project) {
                    const teamContextDataProviderContributionId = "ms.vss-tfs-web.team-context-data-provider";
                    // For back compat reasons we want to provide the team to 3rd party extensions even when it is not set in the webContext:
                    // - If there is no team present in the context, check if the page placed a resolved team using the data provider, and 
                    //   send in the pageContext we send to the iframe.
                    const teamContextContribution = {
                        id: teamContextDataProviderContributionId,
                        properties: {
                            serviceInstanceType: ServiceInstanceTypes.TFS,
                        },
                    } as Contribution;

                    const WebPageDataService = Service.getService(Contributions_Services.WebPageDataService);
                    await WebPageDataService.ensureDataProvidersResolved([teamContextContribution], /*refreshIfExpired */ true);                    
                    const teamContextData: { id: string; name: string; } = WebPageDataService.getPageData(teamContextDataProviderContributionId);
                    if (teamContextData) {
                        // Clone relevant part of the page context and include team information for extensions
                        pageContext = {
                            ...pageContext,
                            webContext: {
                                ...pageContext.webContext,
                                team: {
                                    ...teamContextData
                                }
                            }
                        };
                    }
                }

                this._contributions.push(contribution);

                const extensionService = Service.getService(Contributions_Services.ExtensionService);
                const fallbackUri = extensionService.getFallbackUri(this._options.contribution);
                const baseUri = extensionService.getBaseUri(this._options.contribution);
                const publisherId = Contributions_Services.ExtensionHelper.getPublisherId(this._options.contribution);
                const extensionId = Contributions_Services.ExtensionHelper.getExtensionId(this._options.contribution);

                var hostHandshakeData = <IHostHandshakeData>{
                    pageContext: <any>pageContext,
                    initialConfig: this._options.initialConfig,
                    extensionContext: {
                        extensionId: extensionId,
                        publisherId: publisherId,
                        version: Service.getService(Contributions_Services.ExtensionService).getVersion(this._options.contribution),
                        baseUri: this._usingFallback && fallbackUri ? fallbackUri : baseUri
                    },
                    contribution: <Contribution>(<any>contribution),
                    themeData
                };

                if (this._sandboxedIframe && publisherId) {
                    hostHandshakeData.sandboxedStorage = {};
                    try {
                        var storage = window.localStorage.getItem(ExternalContentHost.SANDBOXED_STORAGE_SETTINGS_PREFIX + publisherId);
                        if (storage) {
                            hostHandshakeData.sandboxedStorage = JSON.parse(storage);
                        }
                    }
                    catch (ex) {
                    }
                }

                if (useNewSdk) {
                    // New extension model
                    this._xdmChannel.getObjectRegistry().register("DevOps.ServiceManager", {
                        getService: (serviceContributionId: string) => {
                            const contributionService = LWP.getLWPService("IVssContributionService");
                            return contributionService ? contributionService.getService(serviceContributionId, true) : undefined;
                        }
                    });

                    (hostHandshakeData as any).contributionId = contribution.id;

                    const pageService = LWP.getLWPService("IVssPageService");
                    if (pageService) {
                        const pageData = pageService.getData();
                        (hostHandshakeData as any).context = {
                            host: {
                                id: pageData.hostId,
                                name: pageData.hostName,
                                type: pageData.hostType
                            },
                            user: {
                                id: pageData.user.id,
                                name: pageData.user.uniqueName,
                                displayName: pageData.user.displayName,
                                imageUrl: pageData.user.imageUrl
                            },
                            extension: {
                                id: `${publisherId}.${extensionId}`,
                                publisherId,
                                extensionId
                            }
                        };
                    }
                }

                if (markLoaded) {
                    // Delay this call to allow the handshake message to be sent back to the extension frame
                    // before resolving this control's loading deferred.
                    window.setTimeout(() => {
                        this._handleLoadSuccess();
                    }, 0);
                }

                return hostHandshakeData;
            },

            /**
             *  Gets called by the iframe window whenever extension site is loaded 
             */
            notifyLoadSucceeded: () => {
                this._handleLoadSuccess();
            },

            /**
             *  Gets called by the iframe window whenever extension site hit an error trying to load
             *  @param error Error describing the failure
             */
            notifyLoadFailed: (error: any) => {
                this._handleLoadError(error);
            },

            getAccessToken: (): IPromise<Authentication_Contracts.WebSessionToken> => {
                var registrationId = Service.getService(Contributions_Services.ExtensionService).getRegistrationId(this._options.contribution);
                var scoped = !Contributions_Services.ExtensionHelper.isContributionTrusted(this._options.contribution);
                return Authentication_Services.getToken(registrationId, null, null, scoped);
            },
            getAppToken: (): IPromise<Authentication_Contracts.WebSessionToken> => {
                var registrationId = Service.getService(Contributions_Services.ExtensionService).getRegistrationId(this._options.contribution);
                return Authentication_Services.getAppToken(registrationId);
            },

            /**
             * Gets called by a sandboxed iframe window in order to update the sandboxed-storage settings for the extension's publisher.
             * @param storage New storage value
             */
            updateSandboxedStorage(storage: ISandboxedStorage) {
                if (storage && this._sandboxedIframe && window.localStorage) {
                    var publisherId = Contributions_Services.ExtensionHelper.getPublisherId(this._options.contribution);
                    if (publisherId) {
                        var serializedValue = JSON.stringify(storage);
                        if (serializedValue.length > 250000) {
                            Diag.logWarning(`Failed to update sandboxed storage for extension publisher ${publisherId}. The overall storage size ${serializedValue.length} exceeds the maximum limit of ${ExternalContentHost.SANDBOXED_STORAGE_SIZE_LIMIT}.`);
                        }
                        else {
                            window.localStorage.setItem(ExternalContentHost.SANDBOXED_STORAGE_SETTINGS_PREFIX + publisherId, serializedValue);
                        }
                    }
                }
            }
        };
    }
}

interface IContentProperties {
    contributionIds?: string[];
    initialize?: string;
    require?: string[];
    targetType?: string;
}

/**
* A control that hosts internal content by injecting it into the parent DOM
*/
class InternalContentHost implements IExtensionHost {
    private static ModuleContentType = "ms.vss-web.module-content";
    private _loadPromise: IPromise<any>;
    private _localRegistry: IXDMObjectRegistry;
    private _$container: JQuery;
    private _isDisposed: boolean;
    private _registeredObject: any;
    private _registeredObjectId: string;

    constructor(contribution: Contributions_Contracts.Contribution, initialConfig: any, $container: JQuery, webContext: Contracts_Platform.WebContext) {
        let directContent: IContentProperties = contribution.properties["content"];
        if (!directContent && contribution.type === InternalContentHost.ModuleContentType) {
            directContent = contribution.properties;
        }
        if (directContent) {
            // Content specified directly on this contribution
            let contributionsLoadPromise = Q([]) as IPromise<Contribution[]>;
            if (directContent.contributionIds && directContent.contributionIds.length > 0) {
                const contributionsSvc = Service.getService(Contributions_Services.ExtensionService, webContext);
                contributionsLoadPromise = contributionsSvc.queryContributions(directContent.contributionIds, Contributions_Services.ContributionQueryOptions.IncludeAll);
            }
            this._loadPromise = contributionsLoadPromise.then(() => {
                return this._loadContribution(contribution, directContent.require || [], directContent.initialize ? [directContent.initialize] : [], initialConfig, $container);
            });
        }
        else {
            // Check if any module-content is targeting this contribution and intending to be included
            const contributionsSvc = Service.getService(Contributions_Services.ExtensionService, webContext);
            this._loadPromise = contributionsSvc.queryContributions(
                [contribution.id],
                Contributions_Services.ContributionQueryOptions.IncludeRecursiveTargets,
                InternalContentHost.ModuleContentType).then(contentContributions => {

                    const requireModules: string[] = [];
                    const initializeMethods: string[] = [];
                    const contributionsToLoad: string[] = [];

                    for (const contentContribution of contentContributions) {
                        const content: IContentProperties = contentContribution.properties;
                        if (!content.targetType || Utils_String.equals(content.targetType, contribution.type, true)) {
                            if (content.require) {
                                Utils_Array.addRange(requireModules, content.require);
                            }
                            if (content.initialize) {
                                initializeMethods.push(content.initialize);
                            }
                            if (content.contributionIds) {
                                Utils_Array.addRange(contributionsToLoad, content.contributionIds);
                            }
                        }
                    }
                    let contributionsLoadPromise = Q([]) as IPromise<Contribution[]>;
                    if (contributionsToLoad.length > 0) {
                        contributionsLoadPromise = contributionsSvc.queryContributions(Utils_Array.unique(contributionsToLoad), Contributions_Services.ContributionQueryOptions.IncludeAll);
                    }
                    return contributionsLoadPromise.then(() => {
                        return this._loadContribution(contribution, requireModules, initializeMethods, initialConfig, $container);
                    });
                });
        }
    }

    private _loadContribution(
        contribution: Contributions_Contracts.Contribution,
        requireModules: string[],
        initializeMethods: string[],
        initialConfig: any,
        $container: JQuery): IPromise<any> {

        if (this._isDisposed) {
            return Q.resolve(null);
        }

        if (!initialConfig) {
            initialConfig = {};
        }

        return this._getRequiredModules(requireModules).then(() => {

            if (this._isDisposed) {
                return;
            }

            for (var initId of initializeMethods) {
                var $hostContainer: JQuery;
                if ($container) {
                    if (initialConfig.ownsContainer === true) {
                        $hostContainer = $container;
                    }
                    else {
                        $hostContainer = $('<div class="internal-content-host" />').appendTo($container);
                    }

                    this._$container = $hostContainer;
                    this._$container.bind("remove", this.dispose.bind(this));
                }

                var renderOptions = {
                    $container: $hostContainer,
                    container: $hostContainer ? $hostContainer[0] : undefined,
                    options: initialConfig,
                    registerInstance: this._registerLocalInstance.bind(this)
                };

                if (typeof initialConfig.onBeforeRender === "function") {
                    initialConfig.onBeforeRender();
                }

                var renderResult = SDK_Shim.VSS.getRegisteredObject(initId, renderOptions);
                if (renderResult && $.isFunction((<any>renderResult).then)) {
                    return (<any>renderResult).then((asyncResult) => {
                        if (initialConfig.contributedControlInstanceId) {
                            SDK_Shim.VSS.register(initialConfig.contributedControlInstanceId, asyncResult);
                            this._registeredObjectId = initialConfig.contributedControlInstanceId;
                        }
                        this._registeredObject = asyncResult;
                    });
                }
                else if (renderResult) {
                    if (initialConfig.contributedControlInstanceId) {
                        SDK_Shim.VSS.register(initialConfig.contributedControlInstanceId, renderResult);
                        this._registeredObjectId = initialConfig.contributedControlInstanceId;
                    }
                    this._registeredObject = renderResult;
                }
            }
        });
    }

    private _registerLocalInstance(instanceId: string, instance: Object | { (contextData?: any): Object; }) {
        if (!this._localRegistry) {
            this._localRegistry = SDK_XDM.createObjectRegistry();
        }
        this._localRegistry.register(instanceId, instance);
    }

    private _getRequiredModules(modules: string[]): IPromise<any> {
        if (!modules || !modules.length) {
            return Q.resolve(null);
        }

        var deferred = Q.defer();
        VSS.using(modules, () => {
            deferred.resolve(null);
        });
        return deferred.promise;
    }

    /**
    * Dispose the host control
    */
    public dispose(): void {
        if (this._$container) {
            this._$container.unbind("remove");
            this._$container.remove();
            this._$container = null;
        }
        if (this._registeredObjectId) {
            SDK_Shim.VSS.unregister(this._registeredObjectId);
        }
        if (this._registeredObject) {
            if (typeof this._registeredObject.dispose === "function") {
                this._registeredObject.dispose();
            }
            this._registeredObject = null;
        }
        this._isDisposed = true;
    }

    /**
    * Gets the promise that is resolved when the host is loaded, and rejected when the load fails or times out.
    */
    public getLoadPromise(): IPromise<any> {
        return this._loadPromise;
    }

    /**
    * Get an instance of a registered object in an extension
    *
    * @param instanceId Id of the instance to get
    * @param contextData Optional data to pass to the extension for it to use when creating the instance
    * @return Promise that is resolved to the instance (or a proxy object that talks to the instance in the iframe case)
    */
    public getRegisteredInstance<T>(instanceId: string, contextData?: any): IPromise<T> {
        return this._loadPromise.then(() => {
            var resolvedObject;
            if (this._localRegistry) {
                resolvedObject = this._localRegistry.getInstance(instanceId, contextData);
            }
            if (!resolvedObject) {
                resolvedObject = SDK_Shim.VSS.getRegisteredObject(instanceId, contextData);
            }
            return resolvedObject;
        });
    }
}

var nextContributedControlInstanceId = 0;

/**
* Instantiate a contributed control through an internal or external contribution host.
*
* @param $container The jQuery element to place the control in
* @param contribution The contribution (or its id) which contains the details of the contributed control
* @param initialConfig Initial configuration/options to pass to the control
* @param webContext The web context to use when fetching contributions and resolving uris
* @param instanceId Id of the registered object in the contribution's host
* @param contributionHostBehavior options for the host control to toggle behavior on progress indication and error/warning handling. 
* @return Proxied instance of the control
*/
export function createContributedControl<T>(
    $container: JQuery,
    contribution: Contributions_Contracts.Contribution | string,
    initialConfig?: any,
    webContext: Contracts_Platform.WebContext = null,
    instanceId?: string,
    contributionHostBehavior: IContributionHostBehavior = null): IPromise<T> {

    if (!instanceId) {
        instanceId = "__contributedControlInstance" + (nextContributedControlInstanceId++);
        initialConfig = $.extend({}, initialConfig, {
            contributedControlInstanceId: instanceId
        });
    }

    return createExtensionHost($container, contribution, initialConfig || {}, webContext, null, null, "uri", false, contributionHostBehavior).then((extensionHost) => {
        return extensionHost.getRegisteredInstance<T>(instanceId);
    });
}

/**
* Instantiate a contributed control through an internal or external contribution host.
*
* @param $container The jQuery element to place the control in
* @param contributionId The contribution (or its id) which contains the details of the contributed control
* @param initialConfig Initial configuration/options to pass to the control
* @param webContext The web context to use when fetching contributions and resolving uris
* @param postContent Optional data to post to the contribution url (if not specified, a GET is performed)
* @param uriReplacementProperties Replacement object to use when resolving the content uri
* @param uriPropertyName Name of the uri property to lookup in the contribution's properties
* @param iframeFirstPartyContent: Set to true if the content should be iframed, even if it is first-party content.
* @param contributionHostBehavior options for the host control to toggle behavior on progress indication and error/warning handling. 
* @return IExtensionHost
*/
export function createExtensionHost(
    $container: JQuery,
    contribution: Contributions_Contracts.Contribution | string,
    initialConfig?: any,
    webContext: Contracts_Platform.WebContext = null,
    postContent?: any,
    uriReplacementProperties: any = null,
    uriPropertyName: string = "uri",
    iframeFirstPartyContent: boolean = false,
    contributionHostBehavior: IContributionHostBehavior = null): IPromise<IExtensionHost> {

    if (!webContext) {
        webContext = Context.getDefaultWebContext();
    }

    if (!uriReplacementProperties) {
        uriReplacementProperties = webContext;
    }

    var createHost = (resolvedContribution: Contributions_Contracts.Contribution) => {
        return Contributions_Services.ExtensionHelper.resolveUriTemplateProperty(resolvedContribution, uriReplacementProperties, uriPropertyName).then((uri) => {
            var fallbackBasekUri: string = Service.getService(Contributions_Services.ExtensionService).getFallbackUri(resolvedContribution);
            if (fallbackBasekUri) {
                return Contributions_Services.ExtensionHelper.resolveUriTemplateProperty(resolvedContribution, uriReplacementProperties, uriPropertyName, fallbackBasekUri).then((fallbackUri) => {
                    return createExtensionHostForContribution($container, uri, resolvedContribution, initialConfig, postContent, iframeFirstPartyContent, contributionHostBehavior, fallbackUri);
                });
            } else {
                return createExtensionHostForContribution($container, uri, resolvedContribution, initialConfig, postContent, iframeFirstPartyContent, contributionHostBehavior);
            }
        });
    }

    if (typeof contribution === "string") {
        return Service.getService(Contributions_Services.ExtensionService, webContext).getContribution(contribution).then((resolvedContribution) => {
            return createHost(resolvedContribution);
        });
    }
    else {
        return createHost(contribution);
    }
}

/**
* Instantiate a contributed control through an internal or external contribution host.
*
* @param $container The jQuery element to place the control in
* @param uri The uri of the contribution content
* @param contribution The contribution which contains the details of the contributed control
* @param initialConfig Initial configuration/options to pass to the control
* @param postContent: Optional data to post to the contribution url (if not specified, a GET is performed)
* @param iframeFirstPartyContent: Set to true if the content should be iframed, even if it is first-party content.
* @param contributionHostBehavior options for the host control to toggle behavior on progress indication and error/warning handling. 
* @return IExtensionHost
*/
export function createExtensionHostForContribution(
    $container: JQuery,
    uri: string,
    contribution: Contributions_Contracts.Contribution,
    initialConfig?: any,
    postContent?: any,
    iframeFirstPartyContent: boolean = false,
    contributionHostBehavior: IContributionHostBehavior = null,
    fallbackUri: string = null): IExtensionHost {

    return _createExtensionHost($container, contribution, uri, fallbackUri, initialConfig, postContent, false, iframeFirstPartyContent, contributionHostBehavior, Context.getDefaultWebContext());
}

/**
* Instantiate a contributed background host (no UI) through an internal or external contribution host.
*
* @param contribution The contribution (or full id of the contribution) which contains the details of the contributed control
* @param webContext The web context to use when fetching contributions and resolving uris
* @param uriReplacementProperties Replacement object to use when resolving the content uri
* @param uriPropertyName Name of the uri property to lookup in the contribution's properties
* @return IExtensionHost
*/
export function getBackgroundHost(
    contribution: Contributions_Contracts.Contribution | string,
    webContext: Contracts_Platform.WebContext = null,
    uriReplacementProperties: any = null,
    uriPropertyName: string = "uri"): IPromise<IExtensionHost> {

    if (!webContext) {
        webContext = Context.getDefaultWebContext();
    }

    if (!uriReplacementProperties) {
        uriReplacementProperties = webContext;
    }

    var getHost = (contribution) => {
        return Contributions_Services.ExtensionHelper.resolveUriTemplateProperty(contribution, uriReplacementProperties, uriPropertyName).then((uri) => {
            var fallbackBasekUri: string = Service.getService(Contributions_Services.ExtensionService).getFallbackUri(contribution);
            if (fallbackBasekUri) {
                return Contributions_Services.ExtensionHelper.resolveUriTemplateProperty(contribution, uriReplacementProperties, uriPropertyName, fallbackBasekUri).then((fallbackUri) => {
                    return _createExtensionHost(null, contribution, uri, fallbackUri, { host: { background: true } }, null, true, false, null, webContext);
                });
            } else {
                return _createExtensionHost(null, contribution, uri, null, { host: { background: true } }, null, true, false, null, webContext);
            }
        });
    };

    if (typeof contribution === "string") {
        return Service.getService(Contributions_Services.ExtensionService, webContext).getContribution(contribution).then((resolvedContribution) => {
            return getHost(resolvedContribution);
        });
    }
    else {
        return getHost(contribution);
    }
}

/**
* Instantiate a registered background/service instance (no UI) through an internal or external contribution host.
*
* @param contribution The contribution (or full id of the contribution) which contains the details of the contributed control
* @param instanceId Id of the registered object in the contribution's host
* @param contextData Context data/options to pass to the registered object factory method
* @param webContext The web context to use when fetching contributions and resolving uris
* @param timeout Timeout in milliseconds for the instance creation
* @param timeoutMessage Message to reject the promise with if the fetch times out
* @param uriReplacementProperties Replacement object to use when resolving the content uri
* @param uriPropertyName Name of the uri property to lookup in the contribution's properties
* @return IExtensionHost
*/
export function getBackgroundInstance<T>(
    contribution: Contributions_Contracts.Contribution | string,
    instanceId: string,
    contextData?: any,
    webContext: Contracts_Platform.WebContext = null,
    timeout?: number,
    timeoutMessage?: string,
    uriReplacementProperties: any = null,
    uriPropertyName: string = "uri"): IPromise<T> {

    var promise = getBackgroundHost(contribution, webContext, uriReplacementProperties, uriPropertyName).then((host) => {
        return host.getRegisteredInstance<T>(instanceId, contextData);
    });

    if (timeout > 0) {
        promise = Q.timeout(<Q.Promise<T>>promise, timeout, timeoutMessage);
    }

    return promise;
}

/**
* Instantiate a contributed control through an internal or external contribution host.
*
* @param $container The jQuery element to place the control in
* @param contribution The contribution which contains the details of the contributed control
* @param uri The uri of the contribution content
* @param initialConfig Initial configuration/options to pass to the control
* @param postContent: Optional data to post to the contribution url (if not specified, a GET is performed)
* @param usePooledBackgroundHost: Set to true if the host will not be shown in the UI and we want to re-use an existing pooled host that points to the same endpoint.
* @param iframeFirstPartyContent: Set to true if the content should be iframed, even if it is first-party content.
* @param contributionHostBehavior options for the host control to toggle behavior on progress indication and error/warning handling. 
* @return IExtensionHost
*/
function _createExtensionHost(
    $container: JQuery,
    contribution: Contributions_Contracts.Contribution,
    uri: string,
    fallbackUri: string,
    initialConfig: any,
    postContent: any,
    usePooledBackgroundHost: boolean,
    iframeFirstPartyContent: boolean,
    contributionHostBehavior: IContributionHostBehavior,
    webContext: Contracts_Platform.WebContext): IExtensionHost {

    var trustedExtension = Contributions_Services.ExtensionHelper.isContributionTrusted(contribution);
    var useInternalHost = false;

    // To use an internal host (non-iframed), we must have a trusted extension and must be in
    // the top frame ourselves (i.e. not an extension)
    if (trustedExtension && (contribution.properties["content"] || !uri)) {
        useInternalHost = true;
    }
    else if (!uri) {
        throw new Error(`No uri was specified for contribution "${contribution.id}". Cannot create extension host.`);
    }

    if (usePooledBackgroundHost) {
        return backgroundHostPool.getHost(uri, fallbackUri, contribution, useInternalHost, initialConfig, postContent);
    }
    else {
        if (useInternalHost) {
            return new InternalContentHost(contribution, initialConfig, $container, webContext);
        }
        else {
            return Controls.create(ExternalContentHost, $container, <ExternalContentHostOptions>{
                uri: uri,
                fallbackUri: fallbackUri,
                contribution: contribution,
                interactive: !contribution.properties["external"],
                initialConfig: initialConfig,
                postContent: postContent,
                contributionHostBehavior: contributionHostBehavior
            });
        }
    }
}

/**
 * Manages a pool of hosts (iframes) used for making RPCs to various app implementations
 */
class BackgroundHostPool {

    private _hostsContainer: JQuery;
    private _hosts: { [key: string]: IReusableExtensionHost };

    constructor() {
        this._hosts = {};
    }

    /**
     * Retrieve the container that background host iframes live in
     * @return JQuery
     */
    private getHostsContainer(): JQuery {
        if (!this._hostsContainer) {
            this._hostsContainer = $("<div/>").addClass("vs-app-hosts-container").prependTo(document.body);
        }
        return this._hostsContainer;
    }

    /**
    * Gets an IExtensionHost for the given contribution. May re-use old hosts, 
    * return an existing host for this contribution, or create a new one.
    * @return IExtensionHost
    */
    public getHost(
        uri: string,
        fallbackUri: string,
        contribution: Contributions_Contracts.Contribution,
        useInternalHost: boolean,
        initialConfig: any,
        postContent: any): IExtensionHost {

        if (!uri && !useInternalHost) {
            throw new Error(Utils_String.format("Could not resolve the uri for contribution {0}", contribution.id));
        }

        var hostKey = (useInternalHost ? "int." : "ext.") + (uri || "").toLowerCase() + (fallbackUri || "").toLowerCase();

        var host = this._hosts[hostKey];
        if (host) {
            host.reuseHost(contribution);
            return host;
        }
        else {
            return this.createBackgroundHost(hostKey, uri, fallbackUri, contribution, useInternalHost, initialConfig, postContent);
        }
    }

    /**
     * Creates a new host that is hidden in the UI (for RPCs)
     */
    private createBackgroundHost(
        hostKey: string,
        uri: string,
        fallbackUri: string,
        contribution: Contributions_Contracts.Contribution,
        useInternalHost: boolean,
        initialConfig?: any,
        postContent?: any): IExtensionHost {

        if (useInternalHost) {
            return new InternalContentHost(contribution, initialConfig, this.getHostsContainer(), Context.getDefaultWebContext());
        }
        else {
            var externalHost = Controls.create(ExternalContentHost, this.getHostsContainer(), <ExternalContentHostOptions>{
                uri: uri,
                fallbackUri: fallbackUri,
                contribution: contribution,
                interactive: true,
                initialConfig: initialConfig,
                postContent: postContent
            });
            this._hosts[hostKey] = externalHost;
            return externalHost;
        }
    }
}

/**
* Default pool of background (non-UI) external host/iframes used for communicating with extensions
*/
var backgroundHostPool = new BackgroundHostPool();
