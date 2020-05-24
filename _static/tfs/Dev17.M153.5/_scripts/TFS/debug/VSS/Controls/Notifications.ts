/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

export enum MessageAreaType {
    None = 0,
    Info = 1,
    Warning = 2,
    Error = 3,
}

export interface IMessageAreaControlOptions {
    message?: any;
    type?: MessageAreaType;
    closeable?: boolean;
    expanded?: boolean;
    hidden?: boolean;
    showHeader?: boolean;
    showDetailsLink?: boolean;
    showIcon?: boolean;
    noHeaderNoLinkJustIcon?: boolean;
    fillVertical?: boolean;
}

export class MessageAreaControlO<TOptions extends IMessageAreaControlOptions> extends Controls.Control<TOptions> {

    public static EVENT_CLOSE_ICON_CLICKED: string = "event-close-icon-clicked";
    public static EVENT_DISPLAY_COMPLETE: string = "event-display-complete";
    public static EVENT_DISPLAY_CLEARED: string = "event-display-cleared";
    public static ERROR_DETAILS_TOGGLED: string = "error-details-toggled";

    private _errorHeader: JQuery;
    private _errorContent: JQuery;
    private _messageType: MessageAreaType;
    private _showErrorLink: JQuery;
    private _iconDiv: JQuery;

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {
        super.initializeOptions($.extend(<IMessageAreaControlOptions>{
            closeable: true,
            expanded: false,
            showIcon: false,
            showDetailsLink: true,
            showHeader: true,
            noHeaderNoLinkJustIcon: false
        }, options));
    }

    public initialize(): void {
        var errorHeaderDiv, that = this;
        this.getElement().addClass('message-area-control');
        this.getElement().addClass('bowtie');
        this.getElement().attr("role","alert");

        var type = this._options.message ? this._options.message.type : this._options.type;

        if (this._options.showIcon) {
            this._iconDiv = $(domElem('div'))
                .appendTo(this.getElement())
                .addClass('message-icon');

            $("<span>").addClass("bowtie-icon").appendTo(this._iconDiv);

            this._setMessageTypeIcon(type);
        }
        if (this._options.showHeader) {
            errorHeaderDiv = $(domElem('div'))
                .appendTo(this.getElement())
                .addClass('message-header');
            this._errorHeader = $(domElem('span')).appendTo(errorHeaderDiv);
        }

        const errorContentId = '' + Controls.getId();
        this._errorContent = $(domElem('div'))
            .attr('id', errorContentId)
            .appendTo(this.getElement());
        if (!this._options.noHeaderNoLinkJustIcon) {
            this._errorContent.addClass('error-content');
        }

        if (this._options.showDetailsLink) {
            this._showErrorLink = $(domElem('a')).appendTo(errorHeaderDiv)
                .addClass('linkAction show-details-action')
                .attr({
                    href: '#',
                    role: 'button',
                    'aria-controls': errorContentId,
                })
                .click(function () {
                    that._toggle();
                    return false;
                });
        }
        
        var closeIcon = $(domElem('div'))
            .appendTo(this.getElement())
            .addClass('close-action bowtie-icon bowtie-navigate-close ')
            .attr({
                "aria-label": Resources_Platform.MessageAreaControl_CrossIconTooltip,
                role: 'button',
            })
            .click(delegate(this, this._onCloseIconClicked));

        Utils_UI.accessible(closeIcon, delegate(this, this._onCloseIconClicked));

        this.getElement().hide();

        this._messageType = MessageAreaType.None;

        if (this._options.message) {
            this.setMessage(this._options.message);
        }

        if (this._options.fillVertical) {
            this.getElement().css("height", "100%");
        }
    }

    /**
     * Set the message
     * 
     * @param message Message string (plain text), jQuery (html) or
     *     message = {
     *         type: MessageAreaType,
     *         header: String for plain text or jQuery for html,
     *         content: String for plain text or jQuery for html,
     *         click: function
     *     }
     * 
     * @param messageType Type of message
     */
    public setMessage(message: any, messageType?: MessageAreaType) {
        if (typeof (message) === 'string' || (message && message.jquery)) {
            message = {
                header: message
            };
        }
        Diag.Debug.assertParamIsObject(message, 'message');

        if (!message.type) {
            message.type = messageType || MessageAreaType.Error;
        }

        this._setDisplayMessage(message);
    }

    /**
     * Set the error message
     * 
     * @param message Message string (plain text), jQuery (html) or
     *     message = {
     *         type: MessageAreaType,
     *         header: String for plain text or jQuery for html,
     *         content: String for plain text or jQuery for html,
     *         click: function
     *     }
     * 
     * @param clickCallback Click callback function
     */
    public setError(message: any, clickCallback?: Function) {

        if (typeof (message) === 'string' || (message && message.jquery)) {
            message = {
                header: message
            };
        }
        Diag.Debug.assertParamIsObject(message, 'message');

        // Set type to Error
        message.type = MessageAreaType.Error;

        if (!message.click && $.isFunction(clickCallback)) {
            message.click = clickCallback;
        }

        this.setMessage(message);
    }

    /**
     * Gets the current message type.
     */
    public getMessageType(): MessageAreaType {
        return this._messageType;
    }

    /**
     * Clear the shown message
     */
    public clear() {
        this._clear(true);
    }

    /**
     * Set the display message
     * 
     * @param message 
     *     message = {
     *         type: MessageAreaType,
     *         header: String,
     *         content: html String OR jQuery,
     *         click: function
     *     }
     * 
     */
    private _setDisplayMessage(message: any) {

        var that = this, handler;

        Diag.Debug.assertParamIsObject(message, 'message');

        if (this._options.closeable) {
            this.getElement().addClass('closeable');
        }
        else {
            this.getElement().removeClass('closeable');
        }

        this._clear(false);
        this._messageType = (this._options.message && this._options.message.type) ? this._options.message.type : message.type;
        if (this._options.showHeader) {
            if (message.header && message.header.jquery) {
                this._errorHeader.append(message.header);
            }
            else {
                this._errorHeader.text(message.header);
            }
        }

        if (message.content) {
            if (message.content.jquery) {
                this._errorContent.append(message.content);
            }
            else {
                this._errorContent.text(message.content);
            }
            if (this._options.showDetailsLink) {
                this.setErrorDetailsVisibility(this._options.expanded);
                this._showErrorLink.show();
            }
        }
        else {
            this._errorContent.hide();
            if (this._options.showDetailsLink) {
                this._showErrorLink.hide();
            }
        }

        switch (this._messageType) {
            case MessageAreaType.Info:
                this.getElement().addClass('info-message');
                break;
            case MessageAreaType.Warning:
                this.getElement().addClass('warning-message');
                break;
            case MessageAreaType.Error:
                this.getElement().addClass('error-message');
                break;
            default:
                Diag.Debug.fail(Utils_String.format('Unexpected MessageAreaType {0}', this._messageType));
                break;
        }

        this._setMessageTypeIcon(this._messageType);

        if (!this._options.hidden) {
            this.getElement().addClass('visible');
            this.getElement().show();
        }

        if (message.click) {
            Diag.Debug.assertParamIsFunction(message.click, 'message.click');

            handler = function () {
                message.click();
                that.clear(); // as we took action we need to clear the control
            };

            this._errorHeader.addClass('clickable');

            this._errorHeader.click(handler);

            this._errorHeader.keydown(function (e) {
                if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                    handler();
                    return false;
                }
            });
        }

        // Notify listeners that the message area has been updated.
        this._raiseDisplayComplete();      
    }

    private _onCloseIconClicked() {
        this.clear();
        this._fire(MessageAreaControl.EVENT_CLOSE_ICON_CLICKED);
    }

    private _setMessageTypeIcon(messageType: MessageAreaType) {
        if (!this._options.showIcon) {
            return;
        }

        if (messageType === MessageAreaType.None) {
            this._iconDiv.hide();
        }
        else {
            var iconClass: string;
            var $icon = $('.bowtie-icon', this._iconDiv);
            $icon.toggleClass('bowtie-status-info-outline', (messageType === MessageAreaType.Info));
            $icon.toggleClass('bowtie-status-warning', (messageType === MessageAreaType.Warning));
            $icon.toggleClass('bowtie-status-failure', (messageType === MessageAreaType.Error));
            this._iconDiv.show();
        }
    }

    private _toggle() {
        if (this._errorContent.is(':visible')) {
            this.setErrorDetailsVisibility(false);
            this._fire(MessageAreaControl.ERROR_DETAILS_TOGGLED, { show: false });
        }
        else {
            this.setErrorDetailsVisibility(true);
            this._fire(MessageAreaControl.ERROR_DETAILS_TOGGLED, { show: true });
        }
        this._raiseDisplayComplete();
    }

    public setErrorDetailsVisibility(show) {
        if (show) {
            this._showErrorLink
                .text(Resources_Platform.HideDetails)
                .attr("aria-expanded", "true");
            this._errorContent.show();
        }
        else {
            this._showErrorLink
                .text(Resources_Platform.ShowDetails)
                .attr("aria-expanded", "false");
            this._errorContent.hide();
        }
    }

    /**
     * Clear the shown message
     * 
     * @param raiseDisplayCompleteEvent Indicates if the display complete event should be raised.
     */
    private _clear(raiseDisplayCompleteEvent: boolean) {
        Diag.Debug.assertParamIsBool(raiseDisplayCompleteEvent, "raiseDisplayCompleteEvent");

        // Don't need to do anything if the message has already been cleared.
        // This helps with perf in the cases when display-complete event listeners are expensive.
        if (this._options.showHeader) {
            if (this._errorHeader.text().length === 0) {
                return;
            }
            this._errorHeader.text('');
            this._errorHeader.unbind('click');
            this._errorHeader.removeClass('clickable');
        }
        switch (this._messageType) {
            case MessageAreaType.Info:
                this.getElement().removeClass('info-message');
                break;
            case MessageAreaType.Warning:
                this.getElement().removeClass('warning-message');
                break;
            case MessageAreaType.Error:
                this.getElement().removeClass('error-message');
                break;
            default:
                break;
        }
        this._messageType = MessageAreaType.None;

        this._errorContent.text('');
        this.getElement().removeClass('visible');
        this.getElement().hide();

        if (raiseDisplayCompleteEvent) {
            // Notify listeners that the message area has been updated.
            this._raiseDisplayComplete();
        }
        this._fire(MessageAreaControl.EVENT_DISPLAY_CLEARED);
        Events_Services.getService().fire(MessageAreaControl.EVENT_DISPLAY_CLEARED);
    }

    private _raiseDisplayComplete() {
        this._fire(MessageAreaControl.EVENT_DISPLAY_COMPLETE);
    }
}

export class MessageAreaControl extends MessageAreaControlO<IMessageAreaControlOptions> { }

export interface IInformationAreaControlOptions {
    caption?: string;
    expandedIconClass?: string;
    collapsedIconClass?: string;
}

export class InformationAreaControlO<TOptions extends IInformationAreaControlOptions> extends Controls.Control<TOptions> {

    private _$collapseIndicator: JQuery;
    private _$content: JQuery;
    private _$caption: JQuery;
    private _collapsed: boolean;

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        if (options) {
            this._collapsed = !!options.collapsed;
        }

        super.initializeOptions($.extend({
            coreCssClass: "information-area-control",
            expandedIconClass: "content-expanded",
            collapsedIconClass: "content-collapsed"
        }, options));
    }

    public initialize() {
        var that = this;

        var $header = $(domElem("div", "information-header"))
            .appendTo(this.getElement())
            .click((eventObject: JQueryEventObject) => {
                this._updateCollapsedState(!this._collapsed);
            });

        this._$collapseIndicator = $(domElem("div", "icon collapse-indicator"))
            .attr("role", "button")
            .attr("tabindex", "0")
            .keydown(Utils_UI.buttonKeydownHandler)
            .appendTo($header);

        this._$caption = $(domElem("div", "information-caption"))
            .appendTo($header)
            .text(this._options.caption);

        this._$content = $(domElem("div", "information-content"))
            .appendTo(this.getElement());

        this._updateCollapsedState(this._collapsed);
    }

    public appendDetailHeaderContent($headerContent: JQuery) {
        $(domElem("div", "detail-header"))
            .appendTo(this._$content)
            .append($headerContent);
    }

    public appendDetailContent($detailContent: JQuery) {
        $(domElem("div", "detail-content"))
            .appendTo(this._$content)
            .append($detailContent);
    }

    public appendCodeContent($codeContent: JQuery) {
        $(domElem("div", "code-content"))
            .appendTo(this._$content)
            .append($codeContent);
    }

    public appendDetailHeaderHtml(headerHtml: string) {
        $(domElem("div", "detail-header"))
            .appendTo(this._$content)
            .html(headerHtml);
    }

    public appendDetailHtml(detailHtml: string) {
        $(domElem("div", "detail-content"))
            .appendTo(this._$content)
            .html(detailHtml);
    }

    public appendCodeHtml(codeHtml: string) {
        $(domElem("div", "code-content"))
            .appendTo(this._$content)
            .html(codeHtml);
    }

    public _updateCollapsedState(collapsed: boolean) {
        if (collapsed) {
            this._$collapseIndicator.removeClass(this._options.expandedIconClass);
            this._$collapseIndicator.addClass(this._options.collapsedIconClass);
            this._$collapseIndicator.attr("aria-label", Utils_String.format(Resources_Platform.InformationAreaControlExpand, this._options.caption));
            this._$collapseIndicator.attr("aria-expanded", "false");
            this._$content.hide();
        }
        else {
            this._$collapseIndicator.removeClass(this._options.collapsedIconClass);
            this._$collapseIndicator.addClass(this._options.expandedIconClass);
            this._$collapseIndicator.attr("aria-label", Utils_String.format(Resources_Platform.InformationAreaControlCollapse, this._options.caption));
            this._$collapseIndicator.attr("aria-expanded", "true");
            this._$content.show();
        }
        this._collapsed = collapsed;
    }
}

export class InformationAreaControl extends InformationAreaControlO<IInformationAreaControlOptions> { }


/**
 * This class affords showing a toast-style notification which fades in, 
 * appears for a certain amount of time and then fades out.
 */
export class ToastNotification extends Controls.BaseControl {

    private _messageArea: MessageAreaControl;
    private _fadeInTime: number;
    private _fadeOutTime: number;
    private _toastTime: number;
    private _toasting: boolean;
    private _delayedFunction: Utils_Core.DelayedFunction;

    constructor(options?) {
        super(options);
    }

    public initialize() {
        var $element = this.getElement();
        $element.hide(); // When created this control should not be visible

        this._processOptions();

        var $messageAreaElement = $("<div>").appendTo($element);

        this._messageArea = <MessageAreaControl>Controls.Enhancement.enhance(MessageAreaControl, $messageAreaElement, {
            closeable: false,
            fillVertical: true
        });

        this._toasting = false;

        // Cancels the fadeout until mouse is out of the toast notification
        this._bind($element, "mouseover", (e: JQueryEventObject) => {
            this._delayedFunction.cancel();
            $element.stop(true);
            $element.fadeIn(0);
        });

        // Restarts fadeout when the mouse is out of toast notification
        this._bind($element, "mouseout", (e: JQueryEventObject) => {
            this._delayedFunction = Utils_Core.delay(this, this._toastTime, () => {
                $element.fadeOut(this._fadeOutTime, () => {
                    this._toasting = false;
                });
            });
        });
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "toast-notification"
        }, options));
    }

    private _processOptions() {
        var options = this._getOptions();

        var $element = this.getElement();

        $element.width(options.width);
        $element.css("min-height", options.minHeight);

        this._fadeInTime = options.fadeInTime;
        this._fadeOutTime = options.fadeOutTime;
        this._toastTime = options.toastTime;
    }

    private _getOptions(): any {
        return $.extend(this._getDefaultOptions(), this._options);
    }

    private _getDefaultOptions() {
        return {
            width: 280,
            fadeInTime: 1000,
            fadeOutTime: 1000,
            toastTime: 5000
        };
    }

    /**
     * Pop up a toast with the supplied message
     * 
     * @param message This can be a string or JQuery object
     * @param messageType The type of message area you want displayed. Defaults to Info.
     */
    public toast(message: any, messageType: MessageAreaType = MessageAreaType.Info) {
        this._ensureNoActiveToast();

        this._toasting = true;

        this._messageArea.setMessage(message, messageType);

        var $element = this.getElement();
        $element.fadeIn(this._fadeInTime);

        this._delayedFunction = Utils_Core.delay(this, this._toastTime, () => {
            $element.fadeOut(this._fadeOutTime, () => {
                this._toasting = false;
            });
        });
    }

    /**
     * If toasting ensure we cancel all in-progress toasting activities
     */
    private _ensureNoActiveToast() {
        if (this._toasting) {
            this.getElement().stop().hide();
            this._delayedFunction.cancel();
        }
    }
}
