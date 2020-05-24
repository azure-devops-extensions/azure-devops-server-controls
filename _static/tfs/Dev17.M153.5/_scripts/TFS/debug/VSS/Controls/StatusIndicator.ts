/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Locations = require("VSS/Locations");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

var delegate = Utils_Core.delegate;

export interface IStatusIndicatorOptions {
    message?: string;
    eventTarget?: any;
    imageClass?: string;
    center?: boolean;
    throttleMinTime?: number;
    statusStartEvent?: string;
    statusCompleteEvent?: string;
    statusErrorEvent?: string;
    /**
     * If true (the default), announce through the screen reader (if present) when the progress
     * indicator is loading and has completed loading.
     */
    announceProgress?: boolean;
}

export class StatusIndicatorO<TOptions extends IStatusIndicatorOptions> extends Controls.Control<TOptions> {

    public static getActiveCount() {
        let active = 0;
        for (const i of StatusIndicatorO._allIndicators) {
            if (i.isActive() && i._options.announceProgress !== false) {
                active++;
            }
        }
        return active;
    }
    
    public static enhancementTypeName: string = "tfs.statusIndicator";
    /** list of all StatusIndicatorO objects */
    private static _allIndicators: StatusIndicatorO<IStatusIndicatorOptions>[] = [];
    private static _announcer = new Utils_Accessibility.MultiProgressAnnouncer({
        announceStartMessage: Resources_Platform.ContentLoading,
        announceEndMessage: Resources_Platform.ContentLoaded,
        getActiveCount: StatusIndicatorO.getActiveCount,
    });

    private _statusDiv: JQuery;
    private _image: JQuery;
    private _throttleMinTime: number;
    private _delayStart: Utils_Core.DelayedFunction;
    private _lastError: Error;
    private _active: boolean = false;

    public isActive() {
        return this._active && this._element.is(":visible");
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            coreCssClass: "status-indicator"
        }, options));
    }

    public initialize(): void {
        super.initialize();

        if (this._options.center === true) {
            this.getElement().addClass("center");
        }

        //If no min time specified, then default to 100ms before showing indicator
        this._throttleMinTime = this._options.throttleMinTime || 100;

        //Bind to start, complete and error events if specified
        this._bindEvents();

        StatusIndicatorO._allIndicators.push(this);
    }

    public _dispose(): void {
        const i = StatusIndicatorO._allIndicators.indexOf(this);
        if (i >= 0) {
            StatusIndicatorO._allIndicators.splice(i, 1);
        }
        StatusIndicatorO._announcer.update();
        
        this._clearTimeout();
        super._dispose();
    }

    /**
     * @param event 
     */
    public start(options?: IStatusIndicatorOptions): void {
        this._clearTimeout();

        // Merge in new options
        $.extend(this._options, options);

        this._start();
    }

    /**
     * @param delay 
     */
    public delayStart(delay: number): void {
        if (this._delayStart) {
            this._delayStart.cancel();
        }

        this._delayStart = Utils_Core.delay(this, delay, this._start);
    }

    public complete(): void {
        if (this._delayStart) {
            this._delayStart.cancel();
            this._delayStart = null;
        }

        this._clearTimeout();
        this.hideElement();
        this._active = false;
        StatusIndicatorO._announcer.update();
    }

    public error(error: Error) {
        this._lastError = error;
        this._clearTimeout();
        this.hideElement();
    }

    public setMessage(message: string): void {
        var $span = this.getElement().find("#indicator_message");
        $span.text(message);
    }

    public showElement(): void {
        // Override base since we dont want element.show() here
        this.getElement().css("display", "");
    }

    public hideElement(): void {
        // Override base since we dont want element.hide() here
        this.getElement().css("display", "none");
    }

    private _draw(): void {
        var element = this.getElement();
        var messageContainer: JQuery;

        this.hideElement();
        
        element.empty();
        this._statusDiv = $("<div />").appendTo(element).addClass("status").attr("aria-busy", "true");

        if (!this._options.center) {
            this._statusDiv.addClass("status-inline");
            element.addClass("inline");
            this._image = $("<span />").appendTo(element);
            messageContainer = element;
        } else {
            // if we need to center the indicator, we will put it in a 1 cell table
            var table = $("<table />").appendTo(this._statusDiv);
            var tr = $("<tr />").appendTo(table);
            var td = $("<td />").appendTo(tr);
            this._image = $("<span />").appendTo(td);
            messageContainer = td;
        }

        // If an image class is specified then use it.  Default to small progress indicator
        this._setImageClass();

        // Add a message if one is specified
        if (this._options.message) {
            $("<span id='indicator_message' />").appendTo(messageContainer).text(this._options.message);
        }
    }

    private _start(): void {
        if (!this._statusDiv) {
            // Not drawn before, draw first
            this._draw();
        } else {
            // Update the image
            this._setImageClass();
        }

        this._active = true;

        this.showElement();

        StatusIndicatorO._announcer.update();
    }

    private _onClick(): void {
        if (this._lastError) {
            alert(this._lastError);
        }
    }

    private _setImageClass(): void {
        this._image.removeClass();
        if (this._options.imageClass) {
            this._image.addClass("icon");
            this._image.addClass(this._options.imageClass);
        } else {
            this._image.addClass("status-progress");
        }
    }

    private _bindEvents(): void {
        var eventTarget = this._options.eventTarget || window;
        if (this._options.statusStartEvent) {
            this._bind(eventTarget, this._options.statusStartEvent, delegate(this, this._startHandler), true);
        }

        if (this._options.statusCompleteEvent) {
            this._bind(eventTarget, this._options.statusCompleteEvent, delegate(this, this.complete), true);
        }

        if (this._options.statusErrorEvent) {
            this._bind(eventTarget, this._options.statusErrorEvent, delegate(this, this.error), true);
        }

        this._bind("click", delegate(this, this._onClick));
    }

    private _error(e?: any, xhr?: any, settings?: any, exception?: Error): void {
        this._lastError = exception;
        this.hideElement();
    }

    private _startHandler(event, options?) {
        this.delayExecute("start", this._throttleMinTime, true, function () {
            this.start(event, options);
        });
    }

    private _clearTimeout() {
        this.cancelDelayedFunction("start");
    }
}

export class StatusIndicator extends StatusIndicatorO<IStatusIndicatorOptions> {
}

Controls.Enhancement.registerJQueryWidget(StatusIndicator, "statusIndicator");

export class LongRunningOperation {

    private _cancelable: Utils_Core.Cancelable;
    private _options: any;
    private _$rootElement: any;
    private _waitControl: WaitControl;
    private _state: any;
    private _cancelled: boolean;

    /**
     * Creates a new long running operation, showing a blocking indicator in a cancellable means overtop the specified container until the operation has completed.
     * 
     * @param container A DOM object that contains the control on the page in which to overlay the progress indicator.
     * @param options A collection of configuration name/value pairs.  The following are supported:
     *     Name                  Type        Value
     *     cancellable           boolean     Boolean value indicating whether the operation may be cancelled while it is running.
     * 
     */
    constructor(container: any, options?: any) {

        Diag.Debug.assertParamIsObject(container, "container");

        this._$rootElement = $(container);
        this._options = options || {};

        this._initialize();
    }

    /**
     * Begins the long running operation, invoking the specified operationCallback when necessary.
     * 
     * @param operationCallback An operation that may take a long time to complete.
     */
    public beginOperation(operationCallback: IResultCallback) {

        var cancelable = this.getCancellableOperation();

        this._cancelable = cancelable;

        Diag.Debug.assertParamIsFunction(operationCallback, "operationCallback");

        if ($.isFunction(this._options.beginOperationCallback)) {
            this._options.beginOperationCallback();
        }

        this._waitControl.startWait(cancelable);

        // Wait to make sure that the spinner has time to download if it
        // hasn't been downloaded yet.
        Utils_Core.delay(this, 100, function () {
            operationCallback(cancelable);
        });
    }

    protected createWaitControl(options: IWaitControlOptions): WaitControl {
        return Controls.create(WaitControl, this._$rootElement[0]._element, options);
    }

    protected getCancellableOperation(): Utils_Core.Cancelable {
        return new Utils_Core.Cancelable(this);
    }

    public getWaitControl(): WaitControl {
        return this._waitControl;
    }

    /**
     * Signals the completion of a long running operation.
     */
    public endOperation() {
        this._waitControl.endWait();

        if ($.isFunction(this._options.endOperationCallback)) {
            this._options.endOperationCallback();
        }
    }

    /**
     * Gets a boolean value indicating whether the current operation has a pending cancel request.
     */
    public isCancelled() {

        return this._cancelled;
    }

    /**
     * Cancels the current operation.
     */
    public cancelOperation() {

        if (this._options && this._options.cancellable) {
            this._cancelled = true;
        }

        this.endOperation();
    }

    /**
     * Initializes the long running operation.
     */
    private _initialize() {
        this._state = {
            message: this._options && this._options.message ? this._options.message : Resources_Platform.DefaultWaitMessage,
            target: this._$rootElement[0]._element,
            cancellable: this._options && this._options.cancellable,
            showDelay: (this._options && this._options.showDelay !== null) ? this._options.showDelay : null
        };

        this._waitControl = this.createWaitControl(this._state);
    }
}

export enum WaitingState {
    NotStarted,
    Waiting,
    Ending,
    Ended,
    Cancelling,
    Cancelled
}

/**
 * @publicapi
 */
export interface IWaitControlOptions extends Controls.EnhancementOptions {
    /**
     * Target element in which an overlay and a message box is displayed. If not specified, whole window is used.
     * @defaultvalue window
     */
    target?: JQuery;

    /**
     * Text to be displayed in the message box.
     */
    message?: string;

    /**
     * Message format used if the cancellable is true. Defaut value is {message}({cancelText}).
     */
    messageFormat?: string;

    /**
     * Specifies whether this is control is cancellable or not. If yes, a cancel link is displayed in the message box.
     * @defaultvalue false
     */
    cancellable?: boolean;

    /**
     * Cancel text format used when displaying cancel text.
     * @defaultvalue "Press {0} to cancel"
     */
    cancelTextFormat?: string;

    /**
     * Callback executed when the control is cancelled.
     */
    cancelCallback?: Function;

    /**
     * Sepcifies whether to fade out the message box when the operation is cancelled or ended.
     * @defaultvalue true
     */
    fade?: boolean;

    /**
     * Specifies the amount of delay in milliseconds when the message box is displayed.
     * @defaultvalue 250
     */
    showDelay?: number;

    /**
     * Overlay color.
     */
    backgroundColor?: string;

    /**
     * Progress image to be displayed.
     */
    image?: string;

    messageElement?: JQuery;
    element?: JQuery;
    entireWindow?: boolean;
    cancelLinkId?: string;
    extraStyles?: string;
    minLifetime?: number;
    minLifeSpanBlocking?: boolean;
}

export interface WaitContext {
    instanceId?: string;
    options?: { wait: IWaitControlOptions };
    cancellable?: Utils_Core.Cancelable;
    showTimer?: Utils_Core.DelayedFunction;
}

/**
 * @publicapi
 */
export class WaitControlO<TOptions extends IWaitControlOptions> extends Controls.Control<TOptions> {

    private static _instanceIdSeed: number = 1;

    public static DefaultShowDelay: number = 250;
    public static MinLifeTime: number = 100;

    private _originalFocusElement: JQuery;
    private _context: WaitContext;
    private _state = WaitingState.NotStarted;
    private _keyDownEventHandler: any;

    /**
     * Constructs a WaitControl object.
     * 
     * @param options The options to initialize the control. It has the following properties:
     *   {
     *       image: hostConfig.getResourcesFile('big-progress.gif'),   // optional
     *       message: "Please wait...",                                // optional
     *       target: $('.feedbackrequest-form-container')              // optional
     *       cancellable: true                                         // optional
     *       cancelCallback: function() { // do something }            // optional and only effective when cancellable is true
     *   }
     * 
     * @return A WaitControl object.
     */
    constructor(options?: TOptions) {
        super(options);
    }

    initializeOptions(options: TOptions): void {
        super.initializeOptions($.extend(<IWaitControlOptions>{
            image: Locations.urlHelper.getVersionedContentUrl("big-progress.gif"),
            showDelay: WaitControl.DefaultShowDelay
        }, options));
    }

    initialize(): void {
        super.initialize();
    }

    /**
     * Starts waiting by displaying message box and overlay in the target element.
     * 
     * @param cancelable A VSS.Core.Cancelable object for additional cancel state signaling.
     * @publicapi
     */
    public startWait(cancellable?: Utils_Core.Cancelable): void {
        if (this._canStartWait()) {
            this._context = {
                // Assign a unique instance Id for resize event binding
                instanceId: "waitControl_" + WaitControl._instanceIdSeed++,
                cancellable: cancellable,
                options: {
                    wait: this._options
                }
            };

            this._startWait();
        }
    }

    /**
     * Ends waiting by removing message box and overlay.
     * @publicapi
     */
    public endWait(): void {
        if (this._canEndWait()) {
            this._state = WaitingState.Ending;
            this._tryEndWait();
        }
    }

    /**
     * Cancels waiting by removing message box and overlay.
     * @publicapi
     */
    public cancelWait(): void {
        if (this._canCancelWait()) {
            this._state = WaitingState.Cancelling;
            this._tryCancelWait();
        }
    }

    /**
     * Sets a new message for the displayed message box.
     *
     * @param message Message to be displayed.
     * @publicapi
     */
    public setMessage(message: string): void {
        if (this._context) {
            var wait = this._context.options.wait;
            if (wait.messageElement) {
                // Set new message
                wait.messageElement.find(".wait-message-text").text(message);

                // Resize wait message box
                this._resizeWait();

                // Refocus esc link
                if (wait.cancellable) {
                    Utils_UI.tryFocus(wait.messageElement.find("#" + wait.cancelLinkId));
                }
            }
        }
    }

    /**
     * Indicates whether the operation is cancelled or not.
     *
     * @returns {boolean}
     * @publicapi
     */
    public isCancelled(): boolean {
        return this._state === WaitingState.Cancelled;
    }

    /**
     * Determines if the current waiting session can be started.
     */
    private _canStartWait(): boolean {
        return this._state === WaitingState.NotStarted ||
            this._state === WaitingState.Ended ||
            this._state === WaitingState.Cancelled;
    }

    /**
     * Determines if the current waiting session can be ended.
     */
    private _canEndWait(): boolean {
        return this._context &&
            (this._state === WaitingState.Waiting || this._state === WaitingState.Ending);
    }

    /**
     * Determines if the current waiting session can be cancelled.
     */
    private _canCancelWait(): boolean {
        return this._context &&
            this._context.options.wait.cancellable &&
            (this._state === WaitingState.Waiting || this._state === WaitingState.Cancelling);
    }

    /**
     * Starts the waiting.
     */
    private _startWait(): void {
        var wait = this._context.options.wait;
        this._state = WaitingState.Waiting;

        // Make sure we have a showDelay set
        if (wait.showDelay === null) {
            wait.showDelay = WaitControl.DefaultShowDelay;
        }

        // If no target was specified, use the entire window as the wait target
        if (!wait.target) {
            wait.entireWindow = true;
            wait.target = $("body");
            wait.extraStyles = "height:100%; width:100%;";
        }

        // Hide any existing waits on children
        wait.target.children('.wait-element').hide();
        wait.target.children('.wait-box').hide();

        // If a showDelay is specified, call showWait after showDelay time
        if (!wait.showDelay) {
            this._showWait();
        }
        else {
            this._context.showTimer = Utils_Core.delay(this, wait.showDelay, this._showWait);
        }
    }

    /**
     * Ends the waiting.
     */
    private _tryEndWait(): void {
        Diag.Debug.assertIsObject(this._context, "this._waitContext is not an object");
        var wait = this._context.options.wait;

        // If wait is marked to be ended and the timer's gone off, end the wait.
        if (this._state === WaitingState.Ending && !wait.minLifeSpanBlocking) {
            this._state = WaitingState.Ended;
            this._reset();
        }
    }

    /**
     * Cancels the waiting.
     */
    private _tryCancelWait(): void {
        Diag.Debug.assertIsObject(this._context, "this._waitContext is not an object");
        var wait = this._context.options.wait,
            cancelCallback = wait.cancelCallback,
            cancellable = this._context.cancellable;

        // If wait is marked to be cancelled and the timer's gone off, cancel the wait.
        if (this._state === WaitingState.Cancelling && !wait.minLifeSpanBlocking) {
            this._state = WaitingState.Cancelled;
            this._reset();

            if (cancelCallback) {
                cancelCallback();
            }

            if (cancellable && cancellable.cancel && $.isFunction(cancellable.cancel)) {
                cancellable.cancel();
            }
        }
    }

    /**
     * Resets this wait control.
     */
    private _reset(): void {
        this._unbindKeydownEvent();

        this._removeWaitElement();
        if (this._originalFocusElement) {
            this._originalFocusElement.focus();
            this._originalFocusElement = null;
        }

        this._removeShowTimer();
        this._context = null;
    }

    protected updateWaitElements(wait: IWaitControlOptions): void {
        wait.messageElement = wait.target.children('.wait-box').first();
    }

    /**
     * Shows the wait control.
     */
    private _showWait() {
        Diag.Debug.assertIsObject(this._context, "this._waitContext is not an object");
        var messageContent = "",
            wait = this._context.options.wait,
            extraStyles = wait.extraStyles || '',
            that = this,
            waitMessage: string;

        // Determine what content is required for wait message
        if (wait.image) {
            messageContent += Utils_String.format('<img class="wait-image" src="{0}" />', wait.image);
        }

        waitMessage = this._getWaitMessage(wait);
        if (waitMessage) {
            messageContent += Utils_String.format('<div class="wait-message">{0}</div>', waitMessage);
        }

        // If the caller wants animation and or a message we need to configure it
        if (messageContent.length > 0) {
            wait.target.prepend(Utils_String.format('<div class="wait-box">{0}</div>', messageContent));
            this.updateWaitElements(wait);
        }

        // Set the custom background color if one was specified
        if (wait.backgroundColor) {
            extraStyles += Utils_String.format('background-color:{0};', wait.backgroundColor);
        }

        // Build the waitElement and make sure it is sized properly
        wait.target.prepend(Utils_String.format('<div class="wait-element" style="{0}"></div>', extraStyles));
        wait.element = wait.target.children('.wait-element').first();

        // Make sure the wait element is laid out properly
        this._resizeWait();

        // Attach to the window resize event to update our position
        $(window).bind(this._getResizeEventId(this._context.instanceId), delegate(this, this._resizeWait));

        if (wait.cancellable) {
            Diag.Debug.assertIsStringNotEmpty(wait.cancelLinkId, "wait.cancelLinkId is empty");
            this._bindKeydownEvent(wait.cancelLinkId);
            $("#" + wait.cancelLinkId).click(delegate(this, this._handleCancelEvent));

            // Save the current focus before stealing it, so that we can restore it when ending the wait operation.
            this._originalFocusElement = $(document.activeElement);
            $("#" + wait.cancelLinkId).focus();
        }

        // Make sure we have at least a minimal lifetime if it wasn't explicitly set
        if (!wait.minLifetime) {
            wait.minLifetime = WaitControl.MinLifeTime;
        }

        // Don't allow the session to expire until the minLifeSpan timeout. This prevents flashing.
        wait.minLifeSpanBlocking = true;
        Utils_Core.delay(this, wait.minLifetime, function () {
            // Clear the minLifeSpanTimeout timer on the object
            wait.minLifeSpanBlocking = false;

            if (that._state === WaitingState.Ending) {
                that._tryEndWait();
            }
            else if (that._state === WaitingState.Cancelling) {
                that._tryCancelWait();
            }
        });
    }

    protected getWaitingState(): WaitingState {
        return this._state;
    }

    protected getWaitingContext(): WaitContext {
        return this._context;
    }

    /**
     * Resizes the waiting control.
     */
    private _resizeWait(): void {
        Diag.Debug.assertIsObject(this._context, "this._waitContext is not an object");
        var wait = this._context.options.wait,
            waitElementMarginTop, waitElementMarginLeft;

        Diag.Debug.assertIsObject(wait.element, "wait.element is not an object");

        // Update the size and position of the wait element to cover the target properly.
        if (!wait.entireWindow) {
            wait.element.css('margin-top', -parseInt(wait.target.css('padding-top'), 10));
            wait.element.css('margin-left', -parseInt(wait.target.css('padding-left'), 10));
            wait.element.height(wait.target.outerHeight() - 2);
            wait.element.width(wait.target.outerWidth() - 2);
        }

        // Update the position of the message element if one is shown
        if (wait.messageElement) {
            waitElementMarginTop = parseInt(wait.element.css('margin-top'), 10);
            waitElementMarginLeft = parseInt(wait.element.css('margin-left'), 10);

            // Note that the following normalization is only required for IE8, where
            //   calling css on the wait element returns NaN.
            if (!waitElementMarginTop || isNaN(waitElementMarginTop)) {
                waitElementMarginTop = 0;
            }

            if (!waitElementMarginLeft || isNaN(waitElementMarginLeft)) {
                waitElementMarginLeft = 0;
            }

            var elementHeight = wait.element.outerHeight();
            var elementWidth = wait.element.outerWidth();
            var messageHeight = wait.messageElement.outerHeight();
            var messageWidth = wait.messageElement.outerWidth();
            if (messageWidth > elementWidth) {
                messageWidth = elementWidth - 4;
                wait.messageElement.outerWidth(messageWidth);
            }

            wait.messageElement.css('top', wait.element.position().top +
                (elementHeight - messageHeight) / 2 +
                waitElementMarginTop);
            wait.messageElement.css('left', wait.element.position().left +
                (elementWidth - messageWidth) / 2 +
                waitElementMarginLeft);
        }
    }

    /**
     * Handles the keydown event.
     * 
     * @param e 
     * @return 
     */
    private _onKeyDown(e?: JQueryEventObject): any {
        var keyCode = Utils_UI.KeyCode;
        if (e.keyCode === keyCode.ESCAPE) {
            this._handleCancelEvent(e);
            return false;
        }
    }

    /**
     * Handles the events to cancel wait.
     * 
     * @param e 
     * @return 
     */
    private _handleCancelEvent(e?: JQueryEventObject): any {

        this._unbindKeydownEvent();
        this.cancelWait();

        // This handler is registered to the Esc hyperlink click event.
        // Return false to prevent the handled event from bubbling, so that
        // the default hyperlink click behavior, i.e. navigation, is suppressed.
        return false;
    }

    /**
     * Binds the keydown event
     * 
     * @param cancelLinkId The id of the cancel hyperlink.
     */
    private _bindKeydownEvent(cancelLinkId: string): void {
        Diag.Debug.assertParamIsString(cancelLinkId, "cancelLinkId");
        if (!this._keyDownEventHandler) {
            this._keyDownEventHandler = delegate(this, this._onKeyDown);
            $("#" + cancelLinkId).keydown(this._keyDownEventHandler);
        }
    }

    /**
     * Unbinds the keydown event
     */
    private _unbindKeydownEvent(): void {
        if (this._context) {
            var wait = this._context.options.wait;
            if (this._keyDownEventHandler && wait.cancelLinkId) {
                $("#" + wait.cancelLinkId).unbind("keydown", this._keyDownEventHandler);
                this._keyDownEventHandler = null;
            }
        }
    }

    /**
     * Removes the wait element.
     */
    private _removeWaitElement(): void {
        /**
         * Removes the wait element
         */
        function removeWaitElement(w: IWaitControlOptions) {
            if (w.element) {
                w.element.remove();
                w.element = null;
            }
        }

        /**
         * Removes the wait message element
         */
        function removeMessageElement(w: IWaitControlOptions) {
            if (w.messageElement) {
                w.messageElement.remove();
                w.messageElement = null;
            }
        }

        if (this._context) {
            var wait = this._context.options.wait;
            if (wait.element) {
                if (wait.fade !== false) {
                    wait.element.fadeOut('fast', () => { removeWaitElement(wait) });
                    wait.messageElement.fadeOut('fast', () => { removeMessageElement(wait); });
                }
                else {
                    removeWaitElement(wait);
                    removeMessageElement(wait);
                }

                // Remove the resize binder for moving the wait element
                $(window).unbind(this._getResizeEventId(this._context.instanceId));
            }
        }
    }

    /**
     * Removes the timers used by this controls.
     */
    private _removeShowTimer(): void {
        if (this._context && this._context.showTimer) {
            this._context.showTimer.cancel();
            delete this._context.showTimer;
        }
    }

    /**
     * Gets the unique resize event id for the wait control.
     * 
     * @return The resize event id.
     */
    private _getResizeEventId(instanceId): string {
        Diag.Debug.assertParamIsString(instanceId, "instanceId");
        return 'resize.' + instanceId;
    }

    /**
     * Gets the text message to show in the wait control.
     * 
     * @param wait The wait options.
     */
    private _getWaitMessage(wait: IWaitControlOptions): string {
        Diag.Debug.assertParamIsObject(wait, "wait is not an object");

        var cancelAdvice = "";
        if (wait.cancellable) {
            wait.cancelLinkId = "cancelLink_" + this._context.instanceId;
            cancelAdvice = Utils_String.format(wait.cancelTextFormat || Resources_Platform.CancelWaitAdvice, Utils_String.format('<a href="" class="wait-link" tabindex="0" id="{0}">ESC</a>', wait.cancelLinkId));
        }

        var message = "";
        if (wait.message) {
            message = Utils_String.format("<span class=\"wait-message-text\">{0}</span>", wait.message);
            message = (wait.cancellable ? Utils_String.format(this.getWaitMessageFormatString(), message, cancelAdvice) : message);
        } else if (wait.cancellable) {
            message = cancelAdvice;
        }

        return message;
    }

    public getWaitMessageFormatString(): string {
        return this._options.messageFormat || "{0}({1})";
    }
}

export class WaitControl extends WaitControlO<IWaitControlOptions> { }