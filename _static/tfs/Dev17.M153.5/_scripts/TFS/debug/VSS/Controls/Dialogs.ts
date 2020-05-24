/// <amd-dependency path="jQueryUI/core"/>
/// <amd-dependency path="jQueryUI/button"/>
/// <amd-dependency path="jQueryUI/dialog"/>
/// <reference types="jqueryui" />
/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Services = require("VSS/Events/Services");
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import Panels = require("VSS/Controls/Panels");
import PopupContent = require("VSS/Controls/PopupContent");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Accessibility = require("VSS/Utils/Accessibility");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");
import Q = require("q");

// This is fetched via async require
import RichEditor_Async = require("VSS/Controls/RichEditor");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

// The jquery ui dialog includes logic to restrict focus to its contents, once it's opened. This causes problems
// when opening a popup/callout from a dialog. Typically these are placed as children of the body element, i.e.,
// outside of the dialog. In order to allow them to receive focus we have to override an internal method of the
// jquery ui dialog, allowing a specific set of selectors to take focus, even if outside of the dialog's dom
// structure.
(function applyFocusWorkaround() {
    // Selectors of elements that should be allowed to receive focus even if a jquery ui dialog is open
    const selectorsToAllowTakingFocus = [".ms-Layer"];

    $.widget("ui.dialog", $.ui.dialog, {
        _allowInteraction: function (event) {
            // Apply default logic
            if (this._super(event)) {
                return true;
            }

            // On firefox, tabbing out of a rich editor creates a focusin event with 
            // target as document while all other browsers use the correct event
            // This creates an issue where tabbing out on firefox will go to the last
            // focused element. Returning true here will cause the JQuery dialog
            // to not try and focus on the previously focused dialog
            // See Bug 1007221
            if (Utils_UI.BrowserCheckUtils.isFirefox() && event.type === "focusin" && event.target == document) {
                return true;
            }

            for (const selector of selectorsToAllowTakingFocus) {
                if ($(event.target).closest(selector).length) {
                    return true;
                }
            }
        }
    });
})();

/**
 * Prevents clicking diabled buttons which happens in Edge.
 * See Bug 380864: Inactive "OK" button is clickable on EDGE
 */
export function preventClickingDisabledButtons(dialogElement: JQuery, buttons: any): void {
    if (buttons && Utils_UI.BrowserCheckUtils.isEdge()) {
        $.each(buttons, function (index: any, btn: any) {
            var click = btn.click;
            if (click) {
                btn.click = function (e) {
                    // Apply click if the button is not disabled.
                    if (e && !$(e.currentTarget).is(":disabled")) {
                        click.apply(dialogElement[0], arguments);
                    }
                }
            }
        });
    }
}

/**
 * @publicapi
 */
export interface IDialogOptions extends Panels.IAjaxPanelOptions {
    /**
     * Content of the dialog. It can be either a jQuery selector or a jQuery object.
     */
    content?: string | JQuery;

    /**
     * Text to add to the close button tooltip.
     */
    closeText?: string;

    /**
     * Text to be displayed in the dialog as the content.
     */
    contentText?: string;

    /**
     * Title of the dialog.
     */
    title?: string;

    /**
     * Subtitle of the dialog.
     */
    subtitle?: string;

    /**
     * Specifies where the dialog should be displayed when opened. This option is conveyed to underlying jQuery UI Dialog. See http://api.jqueryui.com/dialog/#option-position for more details.
     */
    position?: string;

    attachResize?: boolean;

    /**
     * Indicates whether the dialog is resizable or not.
     * @defaultvalue true
     */
    resizable?: boolean;

    /**
     * Determines whether or not the dialog resizes automatically when the
     * window is resized.
     * @defaultvalue true
     */
    dynamicSize?: boolean;

    /**
     * Delegate to be executed when the dialog is opened.
     */
    open?: (eventArgs: any) => any;

    /**
     * Delegate to be executed before the dialog is closed.
     */
    beforeClose?: (eventArgs: any) => any;

    /**
     * Delegate to be executed when the dialog is closed.
     */
    close?: (eventArgs: any) => any;

    /**
     * Delegate to be executed when the dialog is initialized completely (including sizing and positioning).
     */
    initialize?: () => void;

    defaultButton?: string;

    /**
     * Specifies which buttons should be displayed on the dialog. This option is conveyed to underlying jQuery UI Dialog. See http://api.jqueryui.com/dialog/#option-buttons for more details.
     */
    buttons?: any;

    /**
     * Specifies the jQuery selector for the default element to be focused initially. 
     * @defaultvalue "First tabbable element"
     */
    initialFocusSelector?: string;

    /**
     * Indicates whether global progress indicator is enabled for the dialog or not.
     * @defaultvalue true
     */
    hasProgressElement?: boolean;

    /**
     * Specifies whether the dialog should be displayed when closed.
     * @defaultvalue true
     */
    disposeOnClose?: boolean;
    noFocusOnClose?: boolean;

    /**
     * Width of the dialog in px or %.
     * @defaultvalue 500
     */
    width?: number | string;

    /**
     * Height of the dialog in px or %.
     * @defaultvalue "auto"
     */
    height?: number | string;

    /**
     * Determines if the standard 24-px margin will be applied to all content.
     * @defaultvalue true
     */
    contentMargin?: boolean;

    /**
     * An optional boolean to specify whether or not to use the Bowtie styling for this Dialog.
     * @privateapi
     */
    useBowtieStyle?: boolean;

    /**
     * An optional variable to specify the version of Bowtie styling for this Dialog.
     * Defaults to 1, but 2 should be used for the updated styling in TFS 
     * @privateapi
     */
    bowtieVersion?: number;

    /**
     * Additional class to apply to the container dialog element.
     */
    dialogClass?: string;

    /**
     * An optional boolean to indicate that the leftmost dialog button should not get
     * the "cta" (call to action) style applied automatically.
     * @defaultvalue false
     * @privateapi
     */
    noAutoCta?: boolean;

    /**
     * An optional variable to specify that the dialog should take on legacy UI styles
     * Defaults to false.
     * @privateapi
     */
    useLegacyStyle?: boolean;

    widthPct?: number;
    heightPct?: number;

    /**
     * Hide the X button.
     * @defaultValue "false"
     */
    hideCloseButton?: boolean;

    /**
     * Min height of the dialog in px.
     * @defaultvalue "auto"
     */
    minHeight?: number | string;

    /**
     * Min width of the dialog in px.
     * @defaultvalue "auto"
     */
    minWidth?: number | string;

    /**
     * Max height of the dialog in px.
     * @defaultvalue "auto"
     */
    maxHeight?: number | string;

    /**
     * Max width of the dialog in px.
     * @defaultvalue "auto"
     */
    maxWidth?: number | string;

    /*
     * Prevent default dialog behavior of resizing the dialog.
     * @defaultvalue "false"
     * @privateapi
     */
    preventAutoResize?: boolean;
}

/**
 * @publicapi
 */
export class DialogO<TOptions extends IDialogOptions> extends Panels.AjaxPanelO<TOptions> {

    public static enhancementTypeName: string = "tfs.dialog";
    public static _dialogActionInProgress = false;

    /**
     * The maximum width as specified in the options when the dialog was created.
     */
    private _specifiedMaxWidth: number;
    /**
     * The maximum height as specified in the options when the dialog was created.
     */
    private _specifiedMaxHeight: number;

    /**
     *     This should be used in cases where you don't want the user to execute more than 1 particular action involving a Dialog
     *     in parallel. For example, clicking a link that does some server processing before opening a dialog. On slow connections
     *     the user may be able to click the link several times before the first dialog ever opens.
     * 
     * @param actionDelegate 
     *     The function to execute which will involve initializing a Dialog. It takes a single optional
     *     paramater which is a cancellation routine. Call this when you encounter a situation (such as an error)
     *     where you wish to cancel the operation and have subsequent dialog actions execute without being blocked.
     * 
     */
    public static beginExecuteDialogAction(actionDelegate: Function) {
        Diag.Debug.assertParamIsFunction(actionDelegate, "actionDelegate");

        if (!Dialog._dialogActionInProgress) {
            Dialog._dialogActionInProgress = true;
            actionDelegate(function () {
                Dialog._dialogActionInProgress = false;
            });
        }
    }

    public static create<T extends Controls.Control<any>>(dialogType: { new(options: any): T }, options?): T {
        var content = (options && options.content) || $("<div />");

        if (options && options.contentText) {
            content.text(options.contentText);
        }

        // z-index of dialogs was removed in jQuery 1.10.2, but our UI's depend upon it, so we'll adjust it here to put the dialog on top.
        const enhancement = <T>Controls.Enhancement.enhance(dialogType, content, options);
        const zIndex = this._getNextDialogZIndex();

        enhancement._element.parent().css("z-index", zIndex);

        // If a modal dialog, then also set the widget-overlay element to be directly behind it.
        // In JQuery - UI 1.11.x, this element is added immediately after the dialog.
        if ((<any>enhancement._options).modal) {
            const overlayLeft = enhancement._element.parent().next('div.ui-widget-overlay').css("z-index", zIndex - 1);

            // There is a rendering bug in IE/Edge that causes the screen to blank sometimes when the overlay
            // is full width. To work around this, we make two overlays, each covering half the screen.
            if (Utils_UI.BrowserCheckUtils.isIE() || Utils_UI.BrowserCheckUtils.isEdge()) {
                const overlayRight = overlayLeft.clone().insertAfter(overlayLeft);
                overlayLeft.css("width", "50%");
                overlayRight.css({
                    "z-index": zIndex - 1,
                    width: "50%",
                    left: "50%",
                });
                (enhancement as any)._secondOverlay = overlayRight;
            }
        }

        // jQuery UI 1.10.2 removed ui-icon-grip-diagonal-se from the resizable handle (instead having only ui-icon-gripsmall-diagonal-se).
        // We'll add ui-icon-grip-diagonal-se to maintain the larger resizable handle that we're used to seeing.
        enhancement._element.parent().children('div.ui-icon-gripsmall-diagonal-se').addClass('ui-icon-grip-diagonal-se');

        return <T>enhancement;
    }

    // Gets the next even z-index value to stack above other dialogs, at least 10002 as used before.
    private static _getNextDialogZIndex(): number {
        var thisZ, nextZ, maxZ = 0;
        $('div.ui-dialog').each(function () {
            thisZ = Number($(this).css("z-index"));
            if (!isNaN(thisZ) && (thisZ > maxZ)) {
                maxZ = thisZ;
            }
        });

        if (maxZ < 10001) {
            nextZ = 10002;
        }
        else {
            nextZ = maxZ + 2;
            if (nextZ % 2 !== 0) {
                nextZ++;
            }
        }
        return nextZ;
    }

    public static show<T extends Dialog>(dialogType: { new(options: any): T }, options?): T {
        return this.create(dialogType, $.extend({ autoOpen: true }, options));
    }

    private _title: string;
    private _subtitle: string;
    private _progressElement: JQuery;
    private _dialogResult: any;
    private _onWindowResizeDelegate: any;
    private _onHubNavigateDelegate: Function;
    private _secondOverlay: JQuery;
    private _closeTooltip: PopupContent.RichContentTooltip;
    private _resizeIconTooltip: PopupContent.RichContentTooltip;
    protected _closedByNavigation: boolean = false;
    private _resizing: boolean = false;

    private static RESIZE_STEP = 25;

    /**
     * Creates a new dialog with the provided options
     */
    constructor(options?) {

        super(options);

        this._onWindowResizeDelegate = delegate(this, this._onWindowResize);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {
        this._options = this._options || <TOptions>{};
        super.initializeOptions($.extend({
            coreCssClass: "dialog",
            widthPct: 0.8,
            heightPct: 0.8,
            modal: true,
            draggable: true,
            resizable: true,
            autoOpen: false,
            dynamicSize: true,
            disposeOnClose: true,
            closeText: Resources_Platform.CloseButtonLabelText
        }, options));

        const dialogOptions = this._options;
        const $window = $(window);
        if (dialogOptions.height === "auto") {
            dialogOptions.height = null;
        }

        dialogOptions.minWidth = Math.max(240, parseInt(<string>dialogOptions.minWidth, 10) || 0);
        dialogOptions.minHeight = Math.max(192, parseInt(<string>dialogOptions.minHeight, 10) || 0);

        this._specifiedMaxWidth = parseInt(<string>dialogOptions.maxWidth, 10);
        this._specifiedMaxHeight = parseInt(<string>dialogOptions.maxHeight, 10);
        this._setMaxSize();

        this._ensureCtaButton();

        if (dialogOptions.dynamicSize) {
            dialogOptions.width = $window.width() * dialogOptions.widthPct;
            dialogOptions.height = $window.height() * dialogOptions.heightPct;
        } else {
            if (!dialogOptions["useLegacyStyle"] && dialogOptions.height) {
                // Bowtie style is 66px taller than legacy
                let bowtieHeightDifference = 66;
                if (dialogOptions["subtitle"]) {
                    bowtieHeightDifference += 22;
                }

                let dialogHeight = typeof dialogOptions.height === "number" ? <number>dialogOptions.height : parseInt(<string>dialogOptions.height, 10);
                dialogHeight += bowtieHeightDifference;
                dialogOptions.height = dialogHeight;
            }
        }

        // Make sure the dialog is not taller or wider than the screen. In that case, the user is stuck
        // with no way to scroll.
        if (dialogOptions.height && !isNaN(<number>dialogOptions.height)) {
            dialogOptions.height = Math.min(<number>dialogOptions.height, $window.height());
        }
        if (dialogOptions.width && !isNaN(<number>dialogOptions.width)) {
            dialogOptions.width = Math.min(<number>dialogOptions.width, $window.width());
        }

        if (dialogOptions.hideCloseButton) {
            dialogOptions.dialogClass = addClassNamesToString("no-close", dialogOptions.dialogClass);
        }

        if (this._options.useLegacyStyle) {
            dialogOptions.dialogClass = addClassNamesToString("ui-dialog-legacy", dialogOptions.dialogClass);
        }
    }

    public initialize() {
        super.initialize();

        var self = this;
        var $window = $(window);
        var dialogOptions = $.extend({}, this._options);

        // The jQuery dialog code (https://github.com/jquery/jquery-ui/blob/master/ui/dialog.js)
        // sets title using the safe DOM's createTextNode method so there is no need for explicit
        // string encoding here (our encoding method uses the same createTextNode too).
        dialogOptions.title = this.getTitle();

        dialogOptions.close = (e) => {
            if (this._options.close) {
                this._options.close({ ...e, closedByNavigation: this._closedByNavigation });
            }

            this._removeSecondOverlay();

            this.onClose(e);
        };

        dialogOptions.beforeClose = (e) => {
            if(this._options.beforeClose) {
                return this._options.beforeClose({ ...e, closedByNavigation: this._closedByNavigation });
            }
        };

        dialogOptions.open = function (e) {
            if (self._options.open) {
                self._options.open.call(this, e);
            }

            self.onOpen(e);
        };

        this._bind("dialogdragstart dialogdragstop", (e) => {
            Events_Services.getService().fire("dialog-move", this);
            this._onDialogMove();
        });

        if (this._options.attachResize) {
            this._bind("dialogresizestop", this.onDialogResize.bind(this));
        }

        if (this._options.resizable) {
            this._bind("dialogresize", this._onDialogResizing.bind(this));
            this._bind("dialogresizestart", this._onDialogResizeStart.bind(this));
            this._bind("dialogresizestop", this._onDialogResizeStop.bind(this));
        }

        if (dialogOptions.dynamicSize) {
            Events_Services.getService().attachEvent("window-resize", this._onWindowResizeDelegate);
            this._bind("dialogclose", function (e, ui) {
                var eventSvc = Events_Services.getService();
                eventSvc.fire("dialog-close", self);
                eventSvc.detachEvent("window-resize", self._onWindowResizeDelegate);
            });
        }

        if (!dialogOptions.url) {
            Diag.logTracePoint("Dialog.initialize.complete");
        }

        preventClickingDisabledButtons(this.getElement(), dialogOptions.buttons);

        if (this._options.contentMargin === false) {
            this.getElement().addClass("no-margin");
        }

        this.getElement().dialog(dialogOptions);

        if (!this._options.useLegacyStyle) {
            let parentElement = this.getElement().parent();
            let titleBar = parentElement.find(".ui-dialog-titlebar");
            titleBar.addClass("bowtie").append($("<div />").addClass("ui-dialog-subtitle"));
            const titleSpan: JQuery = $("span.ui-dialog-title", titleBar);
            titleSpan.attr({
                "role": "heading",
                "aria-level": 1
            });
            Utils_UI.tooltipIfOverflow(titleSpan[0], { titleTarget: titleSpan[0], titleText: this.getTitle() });
            parentElement.find(".ui-dialog-buttonpane").addClass("bowtie");

            // Massage the close button because JQUI isn't great.
            const closeButton = parentElement.find("button.ui-dialog-titlebar-close");
            this._closeTooltip = PopupContent.RichContentTooltip.add(this._options.closeText, closeButton);
            closeButton.removeAttr("title");
            closeButton.attr("aria-label", this._options.closeText);
            closeButton.find(".ui-button-icon-primary").addClass("bowtie-icon bowtie-navigate-close");
            if (this._options.useBowtieStyle || this._options.bowtieVersion > 0) {
                parentElement.addClass("bowtie-style");
            }
        }

        this.setSubtitle(this.getSubtitle());

        this.getElement().keydown(function (event) {
            var button,
                buttonOptions,
                $eventTarget;
            if (event.keyCode === $.ui.keyCode.ENTER) {
                $eventTarget = $(event.target);
                // When mixing Office Fabric controls with the legacy dialog, we cannot rely
                // on the legacy logic for filtering events.  In this case we always want
                // enter on a combo box to propogate.
                if ($eventTarget.attr("role") === "combobox") {
                    return true;
                }

                if ((!event.shiftKey && $eventTarget.is("input[type='text']")) || ($eventTarget.is("textarea") && event.ctrlKey)) {
                    // if only ENTER is hit in a text <input>, which all our text input
                    // controls (including the combobox) "inherit" from
                    if (self._options.defaultButton && self._options.buttons) {
                        button = self._options.buttons[self._options.defaultButton];
                        if (button) {
                            // NOTE: There was a regression in jquery UI 1.8.14, .button("option", "disabled")
                            // does not return a boolean value by default anymore (because the option is undefined)
                            buttonOptions = $("#" + button.id).button("option");
                            if (!buttonOptions.disabled) {
                                button.click.apply(this, [event]);
                            }
                        }
                        return false;
                    }
                }
                if (!$eventTarget.is("textarea") && !$eventTarget.is("a") && !$eventTarget.is("button") && !$eventTarget.hasClass("propagate-keydown-event")) {
                    return false;
                }
            }
        });

        if (this._options.resizable) {
            this._addResizeKeydownHandler();
        }

        // Re-position the dialog since bowtie classes may move everything around. 
        // Use setTimeout to allow derived dialogs to finish initialization.
        setTimeout(() => {
            this._autoSizeAndPosition();
            this.onInitialize();
        }, 0);

        // Allow other dialog actions to be executed
        Dialog._dialogActionInProgress = false;

        // Close the dialog when navigating to a new hub
        this._onHubNavigateDelegate = (sender: any, args: IHubEventArgs) => {
            this._closedByNavigation = true;
            this.close();
        };
        Events_Services.getService().attachEvent(HubEventNames.PreXHRNavigate, this._onHubNavigateDelegate);

        // Attach to resize to reposition dialog when the window is resized        
        Utils_UI.attachResize(this.getElement(), delegate(this, this._onWindowResize));
    }

    private _addResizeKeydownHandler(): void {
        const element = this.getElement();
        const resizeIcon = element.siblings(".ui-icon-gripsmall-diagonal-se");
        if (resizeIcon.length > 0) {
            // Ensure proper attributes are set
            resizeIcon.attr({ "tabindex": 0, "role": "button", "aria-label": Resources_Platform.DialogResizeLabel });
            this._resizeIconTooltip = PopupContent.RichContentTooltip.add(Resources_Platform.DialogResizeLabel, resizeIcon);
            resizeIcon.removeAttr("title");

            const minWidth = element.dialog("option", "minWidth") || 150;
            const minHeight = element.dialog("option", "minHeight") || 150;
            const maxWidth = element.dialog("option", "maxWidth") || Number.MAX_VALUE;
            const maxHeight = element.dialog("option", "maxHeight") || Number.MAX_VALUE;

            resizeIcon.keydown((e: JQueryEventObject) => {
                switch (e.keyCode) {
                    case Utils_UI.KeyCode.LEFT: {
                        this._resize("width", false, minWidth, Math.max);
                        Utils_Accessibility.announce(Resources_Platform.DialogSizeDecreased);
                        break;
                    }

                    case Utils_UI.KeyCode.RIGHT: {
                        this._resize("width", true, maxWidth, Math.min);
                        Utils_Accessibility.announce(Resources_Platform.DialogSizeIncreased);
                        break;
                    }

                    case Utils_UI.KeyCode.UP: {
                        this._resize("height", false, minHeight, Math.max);
                        Utils_Accessibility.announce(Resources_Platform.DialogSizeDecreased);
                        break;
                    }

                    case Utils_UI.KeyCode.DOWN: {
                        this._resize("height", true, maxHeight, Math.min);
                        Utils_Accessibility.announce(Resources_Platform.DialogSizeIncreased);
                        break;
                    }

                    default:
                        break;
                }
            });
        }
    }

    private _resize(type: string, increase: boolean, limit: number, limitFunction: (...values: number[]) => number): void {
        const element = this.getElement();
        let size = element.dialog("option", type);
        if (size === "auto") {
            // Height can be specified as "auto", in this case we need find the height ourselves
            size = element.parent().height();
        }

        const newSize = limitFunction(size + (DialogO.RESIZE_STEP * (increase ? 1 : -1)), limit);
        element.dialog("option", type, newSize);

        // Fire dialogresizestop for listeners
        element.trigger("dialogresizestop", {
            size: {
                width: element.dialog("option", "width"),
                height: element.dialog("option", "height")
            }
        });
    }

    private _autoSizeAndPosition() {
        const $elem = this.getElement();
        const dialogOptions = this._options;

        // Skip if not in the DOM. Maybe it was removed?
        if ($elem && $elem.length > 0 && $.contains(document.body, $elem[0])) {
            if (!dialogOptions.preventAutoResize) {
                if (dialogOptions["position"]) {
                    $elem.dialog("option", "position", dialogOptions["position"]);
                }
                if (dialogOptions["height"]) {
                    $elem.dialog("option", "height", dialogOptions["height"]);
                } else {
                    $elem.dialog("option", "height", "auto");
                }
                this._setMaxHeight();
            }
            $elem.show();
        }
    }

    /**
     * Ensure there is at least one CTA button (left-most default) unless:
     * - There are no buttons, or
     * - There is at least one warning button
     * - The dialog sets the noAutoCta property to true
     * @param dialogOptions
     */
    private _ensureCtaButton() {
        const dialogOptions = this._options;
        if (dialogOptions.noAutoCta === true) {
            return;
        }
        const ctaClassRe = /(^cta$)|(^cta\ )|(\ cta\ )|( cta$)/;
        const warningClassRe = /(^warning$)|(^warning\ )|(\ warning\ )|( warning$)/;
        if (
            $.isArray(dialogOptions.buttons) &&
            dialogOptions.buttons.length > 0 &&
            !dialogOptions.buttons.some(b => ctaClassRe.test(b.class)) &&
            !dialogOptions.buttons.some(b => warningClassRe.test(b.class))
        ) {
            const existingClass = dialogOptions.buttons[0].class || "";
            dialogOptions.buttons[0].class = existingClass + " cta";
        } else if (dialogOptions.buttons && typeof dialogOptions.buttons === "object") {
            const keys = Object.keys(dialogOptions.buttons);
            if (keys.length > 0) {
                if (
                    !keys.some(k => ctaClassRe.test(dialogOptions.buttons[k].class)) &&
                    !keys.some(k => warningClassRe.test(dialogOptions.buttons[k].class))
                ) {
                    const existingClass = dialogOptions.buttons[keys[0]].class || "";
                    dialogOptions.buttons[keys[0]].class = existingClass + " cta";
                }
            }
        }
    }

    public onLoadCompleted(content) {
        super.onLoadCompleted(content);

        // jQuery Dialog tries to set the focus initially but for the cases where
        // the content is loaded async, we need another attempt to set the focus
        // on the new content
        this.setInitialFocus();

        Diag.logTracePoint("Dialog.initialize.complete");
    }

    /**
     * Tries to set the focus using the specified or default selector
     */
    public setInitialFocus() {
        var focusSelector = this._options.initialFocusSelector || ":visible:tabbable";
        this.getElement().find(focusSelector).first().focus();
    }

    /**
     * Sets focus on the first enabled input element in the dialog. 
     * 
     * @param field The field to set focus.
     */
    public setFormFocusDelayed($field) {

        Diag.Debug.assertParamIsObject($field, "$field");

        // NOTE:
        // It's noticed that after appending the form elements to DOM, there's
        // a delay for browser to render the UI.
        // This behavior is also not consistent among browsers. Specifying a
        // 300 milli-sec delay is our workaround to make sure the default focus
        // (and thus the tabbing) behavior is consistent among supported ones.
        Utils_Core.delay(this, 300, function () {
            $field.eq(0)
                .focus()
                .select();
        });
    }

    /**
     * Sets a new title for the dialog.
     *
     * @param title New title value.
     * @publicapi
     */
    public setTitle(title: string): void {
        this._title = title;
        this._updateTitle();
    }

    /**
     * Gets the current title of the dialog.
     *
     * @returns {string}
     * @publicapi
     */
    public getTitle(): string {
        return this._title || this._options.title || this.getElement().attr("title") || "";
    }

    /**
     * Sets a new subtitle for the dialog
     * @param subtitle
     */
    public setSubtitle(subtitle: string): void {
        this._subtitle = subtitle;
        this._updateSubtitle();
    }

    /**
     * Gets the current subtitle of the dialog
     */
    public getSubtitle(): string {
        let subtitle = this._subtitle;
        if (subtitle === null || subtitle === undefined) {
            subtitle = this._options.subtitle;
        }
        return subtitle || "";
    }

    public centerDialog(): void {
        this.getElement().dialog("option", "position", { my: "center", at: "center", of: window });
        this._setMaxHeight();
    }

    /**
     * Gets the current dialog result which will be used when ok button is clicked.
     * 
     * @returns {any}
     * @publicapi
     */
    public getDialogResult(): any {
        return this._dialogResult;
    }

    /**
     * Sets the dialog result.
     *
     * @param dialogResult Result object used when ok button is clicked.
     * @publicapi
     */
    public setDialogResult(dialogResult: any): void {
        this._dialogResult = dialogResult;
    }

    /**
     * Shows the dialog.
     */
    public show(): void {
        this.getElement().dialog("open");
    }

    /**
     * @param e 
     * @return 
     */
    public onOpen(e?: JQueryEventObject): any {
        if (!this._options || this._options.hasProgressElement !== false) {
            var progressContainer = $("<div />")
                .addClass("ui-dialog-titlebar-progress-container")
                .appendTo(this.getElement().parent().find(".ui-dialog-titlebar"));

            this._progressElement = $("<div />")
                .addClass("ui-dialog-titlebar-progress-element")
                .appendTo(progressContainer);

            VSS.globalProgressIndicator.registerProgressElement(this._progressElement);
        }

        Events_Services.getService().fire("dialog-open", this);
    }

    /**
     * @param e 
     * @return 
     */
    public onClose(e?: JQueryEventObject): any {

        Events_Services.getService().fire("dialog-close", this);

        if (this._progressElement) {
            VSS.globalProgressIndicator.unRegisterProgressElement(this._progressElement);
        }

        this._removeSecondOverlay();

        if (this._options.disposeOnClose) {
            this.dispose();
        }

        // Try to focus on topmost dialog
        var dialogToFocus = $('.ui-dialog').slice(-1);
        if (dialogToFocus.length && !this._options.noFocusOnClose) {
            dialogToFocus.focus();
        }
    }

    /**
     * Called when the initialization is completed including the sizing and positioning where all
     * element in the dialog are visible.
     */
    protected onInitialize(): void {
        if (typeof this._options.initialize === "function") {
            this._options.initialize.call(this);
        }
    }

    /**
     * Closes the dialog.
     * @publicapi
     */
    public close(): void {
        if (this.getElement()) {
            this.getElement().dialog("close");
        }
    }

    public dispose() {
        this._removeSecondOverlay();
        Events_Services.getService().detachEvent(HubEventNames.PreXHRNavigate, this._onHubNavigateDelegate);
        Utils_UI.detachResize(this.getElement());

        if (this._closeTooltip) {
            this._closeTooltip.dispose();
            this._closeTooltip = null;
        }

        if (this._resizeIconTooltip) {
            this._resizeIconTooltip.dispose();
            this._resizeIconTooltip = null;
        }

        super.dispose();
    }

    /**
     * Remove the second overlay added as an Edge/IE hack (see comment in create() method).
     * We call this several times because there are several different ways that people use to close dialogs,
     * and onClose() can even be overridden.
     */
    private _removeSecondOverlay() {
        if (this._secondOverlay) {
            this._secondOverlay.remove();
            this._secondOverlay = null;
        }
    }

    private _updateSubtitle() {
        if (this._initialized && this.getElement()) {
            const $subtitleElem = this.getElement().parent().find(".ui-dialog-subtitle");
            const subtitle = this.getSubtitle() || "";
            $subtitleElem.text(subtitle);
            Utils_UI.tooltipIfOverflow($subtitleElem[0], { titleTarget: $subtitleElem[0], titleText: subtitle });
            $subtitleElem.toggle(subtitle.length > 0);
        }
    }

    /**
     * @param e 
     * @return 
     */
    public onDialogResize(e?: JQueryEventObject): any {

    }

    private _updateTitle() {
        if (this._initialized && this.getElement()) {
            // We make the element check here because the dialog might be disposed when the
            // title is set asynchronously.

            // The jQuery dialog code (https://github.com/jquery/jquery-ui/blob/master/ui/dialog.js)
            // sets title using the safe DOM's createTextNode method so there is no need for explicit
            // string encoding here (our encoding method uses the same createTextNode too).
            let dialog = this.getElement().dialog("option", "title", this.getTitle());
            let titleSpan = $("span.ui-dialog-title", dialog.parent());
            Utils_UI.tooltipIfOverflow(titleSpan[0], { titleTarget: titleSpan[0], titleText: this.getTitle() });
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onWindowResize(e?: JQueryEventObject): any {

        if (this._resizing) {
            // If this dialog is resized explicitly, don't react
            return;
        }

        const $window = $(window);
        const options = this._options;

        if (options.dynamicSize) {
            this._setMaxSize();

            // Resetting width and height
            this.getElement().dialog("option", {
                width: $window.width() * options.widthPct,
                height: $window.height() * options.heightPct,
                maxHeight: parseInt(<string>this._options.maxHeight, 10),
                maxWidth: parseInt(<string>this._options.maxWidth, 10),
            });
        }

        // We need to set the position option separately again because
        // jQuery UI dialog tries to resize the dialog when width or height
        // is set in the options. This prevents the dialog to be repositioned centered.
        // Perform reposition to the center of the window
        this.getElement().dialog("option", "position",
        { 
            my: "center", 
            at: "center", 
            of: window 
        });
    }

    /**
     * @param e 
     * @return 
     */
    private _onDialogResizing(e?: JQueryEventObject, ui?): any {

        // Make sure the dialog size does not push it beyond the bottom/right of the screen.
        var $window = $(window),
            boundedDialogHeight,
            boundedDialogWidth;

        if (!ui || !ui.position || !ui.size) {
            return;
        }

        boundedDialogHeight = Math.min(ui.size.height, $window.height() - ui.position.top);
        boundedDialogWidth = Math.min(ui.size.width, $window.width() - ui.position.left);

        if (boundedDialogHeight !== ui.size.height || boundedDialogWidth !== ui.size.width) {
            // Dialog is being sized such that it is outside of the window bounds, reset the size.
            this.getElement().dialog("option", {
                width: boundedDialogWidth,
                height: boundedDialogHeight
            });
        }
    }

    /**
     * The JQuery UI Dialog unfortunately sets an explicit height for the dialog when it is moved,
     * meaning it will no longer auto-size when the contents are adjusted. However, the dialog
     * contents container will still have "auto" for its height. Ensure that the dialog contents
     * container gets set to an explicit height as well so that if its contents adjust, we show
     * a scrollbar instead of overflowing the dialog container.

     * Furthermore, we want to set the maximum height to be the distance between the current
     * top of the dialog to the bottom edge of the window. Dialogs will only grow down when
     * being auto-sized, so the dialog should not grow below the bottom of the window.
     * @param e
     * @param ui
     */
    private _onDialogMove(e?: JQueryEventObject, ui?: { position: any, pageXOffset: any }) {
        if (!this._options.preventAutoResize) {
            this._setMaxHeight();
            this._ensureDialogContentHeight();
        }

        this._hideCloseButtonTooltip();
        this._hideResizeIconTooltip();
    }

    private _onDialogResizeStart(e?: JQueryEventObject, ui?: any): any {
        this._resizing = true;
        this._hideCloseButtonTooltip();
        this._hideResizeIconTooltip();
    }

    private _onDialogResizeStop(e?: JQueryEventObject, ui?: any): any {
        this._resizing = false;
    }

    private _ensureDialogContentHeight() {
        // If the dialog container has an explicit height set, ensure that the content container does too.
        const containerHeightCss = this.getElement().parent().css("height");
        if (containerHeightCss !== "auto") {
            this.getElement().css("height", this.getElement().outerHeight());
        } else {
            this.getElement().css("height", "auto");
        }
    }

    /**
     * Set the css maximum height of the dialog.
     */
    private _setMaxHeight() {
        const headerAndFooterHeight = this.getElement().prev().outerHeight(true) + this.getElement().next().outerHeight(true);
        this.getElement().css("maxHeight", window.innerHeight - this.getElement().parent().position().top - headerAndFooterHeight);
    }

    /**
     * Set the maximum size jQueryUI will allow the dialog to be.
     */
    private _setMaxSize() {
        // No dialogs larger than the window.
        this._options.maxWidth = Math.min(window.innerWidth, this._specifiedMaxWidth || Infinity);
        this._options.maxHeight = Math.min(window.innerHeight, this._specifiedMaxHeight || Infinity);
    }

    private _hideCloseButtonTooltip(): void {
        if (this._closeTooltip) {
            this._closeTooltip.hide();
        }
    }

    private _hideResizeIconTooltip(): void {
        if (this._resizeIconTooltip) {
            this._resizeIconTooltip.hide();
        }
    }
}

export class Dialog extends DialogO<IDialogOptions> { }

/**
 * Takes a space-separated list of class names (target) and adds to it. Result has unique class names.
 * @param classNames
 * @param target
 */
function addClassNamesToString(classNames: string | string[], target: string): string {
    let targetStr = target || "";
    let classNamesArr: string[];
    if (typeof classNames === "string") {
        classNamesArr = classNames.split(" ");
    } else {
        classNamesArr = classNames;
    }

    return targetStr.split(" ").concat(classNamesArr).filter((value, index, arr) => arr.indexOf(value) === index).join(" ");
}

/**
 * @publicapi
 */
export interface IModalDialogOptions extends IDialogOptions {
    /**
     * Display text for ok button.
     * @defaultvalue "ok"
     */
    okText?: string;

    /**
     * Delegate executed when ok button is clicked and a dialog result is available.
     */
    okCallback?: Function;

    /**
     * Display text for cancel button.
     * @defaultvalue "cancel"
     */
    cancelText?: string;

    /**
     * Delegate executed when cancel button is clicked.
     */
    cancelCallback?: Function;
}

/**
 * @publicapi
 */
export class ModalDialogO<TOptions extends IModalDialogOptions> extends DialogO<TOptions> {
    public static enhancementTypeName: string = "tfs.modaldialog";
    public static EVENT_BUTTON_STATUS_CHANGE: string = "buttonStatusChange";

    /**
     * @param options 
     */
    public initializeOptions(options?: TOptions) {
        super.initializeOptions($.extend({
            coreCssClass: "dialog modal-dialog",
            modal: true,
            dynamicSize: false,
            width: 500,
            height: "auto",
            defaultButton: "ok",
            buttons: {
                "ok": {
                    id: "ok",
                    text: (options && options.okText) || Resources_Platform.ModalDialogOkButton,
                    click: delegate(this, this.onOkClick),
                    class: "cta",
                    disabled: "disabled"
                },
                "cancel": {
                    id: "cancel",
                    text: (options && options.cancelText) || Resources_Platform.ModalDialogCancelButton,
                    click: delegate(this, this.onCancelClick)
                }
            }
        }, options));
    }

    public initialize() {
        this._bind(ModalDialog.EVENT_BUTTON_STATUS_CHANGE, delegate(this, this.onButtonStatusChange));
        this._bind("resultReady", delegate(this, this.onResultReady));

        super.initialize();
    }

    /**
     * Updates the enabled state of the ok button.
     *
     * @param enabled True if enabled, otherwise false.
     * @publicapi
     */
    public updateOkButton(enabled: boolean): void {
        if (this.getElement()) {
            this.getElement().trigger(ModalDialog.EVENT_BUTTON_STATUS_CHANGE, { enabled: enabled === true });
        }
    }

    public processResult(result) {
        var callback = this._options.okCallback;

        if (result) {
            if ($.isFunction(callback)) {
                callback.call(this, result);
                Diag.logTracePoint(this.getTypeName() + ".callback-complete");
            }

            this.close();
        }
    }

    /**
     * @param e 
     * @return 
     */
    public onOkClick(e?: JQueryEventObject): any {
        Diag.logTracePoint(this.getTypeName() + ".OkClicked");
        this.processResult(this.getDialogResult());
    }

    /**
     * @param e 
     * @return 
     */
    public onResultReady(e?: JQueryEventObject, args?): any {

        this.processResult(args);
    }

    /**
     * @param e 
     * @return 
     */
    public onCancelClick(e?: JQueryEventObject): any {

        if ($.isFunction(this._options.cancelCallback)) {
            this._options.cancelCallback();
        }
        this.close();
    }

    /**
     * @param e 
     * @return 
     */
    public onButtonStatusChange(e?: JQueryEventObject, args?): any {
        // If no button is specified, trying to change the status of OK button
        let buttonElement = this.getElement().siblings(".ui-dialog-buttonpane").find("#" + (args.button || "ok"));

        buttonElement.button("option", "disabled", args.enabled ? "" : "disabled");
        this.setAttribute("aria-disabled", args.enabled ? "false" : "true", buttonElement);
    }
}

export class ModalDialog extends ModalDialogO<IModalDialogOptions> { }

export interface IConfirmationDialogOptions extends IModalDialogOptions {
    successCallback: Function;
}

export class ConfirmationDialogO<TOptions extends IConfirmationDialogOptions> extends ModalDialogO<TOptions> {
    public $errorContainer: JQuery;

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            width: 400,
            height: 200,
            resizable: false,
            cssClass: 'confirmation-dialog'
        }, options));
    }

    public initialize() {
        super.initialize();

        this.$errorContainer = $(domElem('div')).addClass('confirmation-dialog-error').prependTo(this.getElement()).hide();
        this.updateOkButton(true);
    }

    public _onSuccess(data) {
        this._fire('resultReady', true);
        var callback = this._options.successCallback;
        if ($.isFunction(callback)) {
            callback.apply(this, arguments);
            Diag.logTracePoint(this.getTypeName() + ".callback-complete");
        }
    }

    public _onError(error) {
        this.$errorContainer.text(error.message).show();
    }

    /**
     * @param e 
     * @return 
     */
    public onOkClick(e?: JQueryEventObject): any {
        this.updateOkButton(false);
        super.onOkClick(e);
    }
}

export class ConfirmationDialog extends ConfirmationDialogO<IConfirmationDialogOptions> { }

/**
 * Represents a button used in MessageDialog.
 *
 * Mirrored in VSS.SDK.Interfaces.
 */
export interface IMessageDialogButton {
    /**
     * Used as HTML id of the button.
     */
    id: string;
    /**
     * Text to display on the button.
     */
    text: string;
    /**
     * When true, the dialog's promise is rejected instead of resolved when this button is clicked.
     */
    reject?: boolean;
    /**
     * Specifies how the button should look. 
     * Possible values: 
     *   (undefined) - Default
     *   "warning" - Red
     */
    style?: string;
}

/**
 * Used by MessageDialogO.showDialog().
 *
 * Mirrored in VSS.SDK.Interfaces as IOpenMessageDialogOptions.
 */
export interface IShowMessageDialogOptions {
    /**
     * Array of buttons to show. Default is [Button.Ok, Button.Cancel]
     */
    buttons?: IMessageDialogButton[];
    /**
     * Button to use when the user presses the Esc key. Default is the last button.
     */
    escapeButton?: IMessageDialogButton;
    /**
     * If this is set, the user will be presented with a text box. Non-rejecting buttons will be disabled until the user types in this string.
     */
    requiredTypedConfirmation?: string;
    /**
     * Text for the title bar of the dialog.
     */
    title?: string;
    /**
     * Width of dialog in px.
     */
    width?: number;
    /**
     * Height of dialog in px.
     */
    height?: number;
    /**
     * Use Bowtie styling. Default is true.
     */
    useBowtieStyle?: boolean;

    /**
     * Option to override default focus setting (which sets focus to the next dialog when the current dialog is closed).
     */
    noFocusOnClose?: boolean;
    /**
    * Optional delegate that can be called when a dialog button is clicked. This can be used to get a value from UI in the dialog before it is removed from the DOM.
    */
    beforeClose?: (button: IMessageDialogButton) => void;
}

/**
 * Result returned when a MessageDialog is closed.
 *
 * Mirrored in VSS.SDK.Interfaces.
 */
export interface IMessageDialogResult {
    /**
     * Button that was clicked to dismiss the dialog.
     */
    button: IMessageDialogButton;
}

class MessageDialogResult implements IMessageDialogResult {
    public button: IMessageDialogButton;

    public constructor(button: IMessageDialogButton) {
        this.button = button;
    }

    public toString(): string {
        // We add (ignoreRejectionOk) because if a user of MessageDialog doesn't handle rejection
        // of the promise (as is likely common), then there is code (attachQPromiseErrorHandler()
        // in VSS/VSS.ts) which detects the unhandled rejection and logs it. The Q library, in its
        // wisdom, stores the rejection by converting the reason for the rejection to a string. So
        // we add a tag to our toString() that the unhandled rejection logging code can look for 
        // and know it should just let it go.
        // tl;dr: This is here for a reason.
        return "MessageDialogResult: Button: " + (this.button ? this.button.id : "?") + " (" + VSS.ErrorHandler.ignoreRejectedPromiseTag + ")";
    }
}

/**
 * Used internally by MessageDialogO.
 */
export interface IMessageDialogOptions extends IDialogOptions {
    buttons?: IMessageDialogButton[] | any;
    escapeButton?: IMessageDialogButton;

    /**
    * If set to true, no button is highlighted as the default button. Otherwise, the first button is the default.
    */
    noDefaultButton?: boolean;

    requiredTypedConfirmation?: string;
    /**
    * Optional delegate that can be called when a dialog button is clicked. This can be used to get a value from UI in the dialog before it is removed from the DOM.
    */
    beforeClose?: (button: IMessageDialogButton) => void;
}

/**
 * Class for creating simple dialog boxes. Use MessageDialog.showDialog().
 */
export class MessageDialogO<TOptions extends IMessageDialogOptions> extends DialogO<TOptions> {
    private _deferred: Q.Deferred<IMessageDialogResult>;
    private _textbox: JQuery;

    public initializeOptions(options?: TOptions) {
        var dialogOptions = <IModalDialogOptions>$.extend(
            <IModalDialogOptions>{
                width: 500,
                height: "auto",
                hideCloseButton: true,
                coreCssClass: "dialog modal-dialog message-dialog",
                modal: true,
                dynamicSize: false,
            },
            options
        );

        if (dialogOptions.buttons instanceof Array && dialogOptions.buttons.length > 0) {
            // transform from array of Button objects to dictionary keyed by button id that parent classes expect
            var buttons = {};
            dialogOptions.buttons.forEach((b: IMessageDialogButton) => {
                buttons[b.id] = this.getButtonOptions(b);
            });

            // default button is the first button
            if (!options.noDefaultButton) {
                dialogOptions.defaultButton = dialogOptions.buttons[0].id;
            }

            // default escape button is the last button
            this.setDialogResult(dialogOptions.buttons[dialogOptions.buttons.length - 1]);

            dialogOptions.buttons = buttons;
        }

        // set the button returned when the user presses Esc
        if (options.escapeButton) {
            this.setDialogResult(options.escapeButton);
        }

        super.initializeOptions(dialogOptions);
    }

    public initialize() {
        super.initialize();

        if (this._options.requiredTypedConfirmation) {
            this.initializeTypedConfirmation();
        }

        for (var i in this._options.buttons) {
            var b = this._options.buttons[i];
            if (b.style) {
                $('#' + b.id).addClass(b.style);
            }
        }
    }

    private initializeTypedConfirmation() {
        var content = this.getElement();
        var textbox: JQuery = $("<input type='text' class='textbox message-dialog-confirm-textbox no-match' />");
        var buttons: JQuery = $(); // all non-rejecting buttons

        for (var i in this._options.buttons) {
            if (!this._options.buttons[i].reject) {
                buttons = buttons.add($('#' + this._options.buttons[i].id));
            }
        }

        var handler = (e: JQueryEventObject) => {
            if (Utils_String.ignoreCaseComparer(textbox.val(), this._options.requiredTypedConfirmation) == 0) {
                textbox.removeClass('no-match').addClass('match');
                buttons.button('option', 'disabled', '');
            }
            else {
                textbox.addClass('no-match').removeClass('match');
                buttons.button('option', 'disabled', 'disabled');
            }
        };

        textbox.bind('input keyup', handler);
        content.append($("<div class='message-dialog-confirm'></div>").append(textbox));

        handler(null);

        Utils_Core.delay(this, 100, function () {
            textbox.focus();
            textbox.select();
        });
    }

    /**
     * Returns a promise that is resolved or rejected when the dialog is closed.
     */
    public getPromise(): Q.Promise<IMessageDialogResult> {
        if (!this._deferred) {
            this._deferred = Q.defer<IMessageDialogResult>();
        }
        return this._deferred.promise;
    }

    /**
     * Show a MessageDialog.
     * @param message the message to display in the dialog. If it's a string, the message is displayed as plain text (no html). For HTML display, pass in a jQuery object.
     * @param methodOptions options affecting the dialog
     * @returns a promise that is resolved when the user accepts the dialog (Ok, Yes, any button with Button.reject===false), or rejected if the user does not (Cancel, No, any button with Button.reject===true).
     */
    public static showMessageDialog(message: string | JQuery, methodOptions?: IShowMessageDialogOptions): Q.Promise<IMessageDialogResult> {
        methodOptions = methodOptions || {};
        var dialogOptions: IMessageDialogOptions = $.extend(
            <IMessageDialogOptions>{
                buttons: [MessageDialog.buttons.ok, MessageDialog.buttons.cancel],
                useBowtieStyle: true,
                minWidth: methodOptions.width,
                minHeight: methodOptions.height,
                title: Resources_Platform.Confirm,
            },
            methodOptions);

        if (typeof message === "string") {
            dialogOptions.content = $("<div />").text(message);
        }
        else {
            dialogOptions.content = message;
        }

        var dialog = show(MessageDialog, dialogOptions);
        return dialog.getPromise();
    }

    public onClose(e?: JQueryEventObject): any {
        if (this._deferred) {
            var result = new MessageDialogResult(<IMessageDialogButton>this.getDialogResult());

            if (this._options.beforeClose) {
                this._options.beforeClose(result.button);
            }

            if (result.button.reject) {
                this._deferred.reject(result);
            }
            else {
                this._deferred.resolve(result);
            }
        }

        return super.onClose(e);
    }

    /**
     * Returns an object suitable for initializing the given button for our parent Dialog.
     * @param button
     */
    private getButtonOptions(button: IMessageDialogButton): any {
        return $.extend({
            click: (event: any) => {
                this.setDialogResult(button);
                this.close();
            }
        },
            button);
    }

    /**
    * Common message dialog buttons
    */
    public static buttons: MessageDialogButtons = {
        ok: <IMessageDialogButton>{ id: "ok", text: Resources_Platform.ModalDialogOkButton, reject: false },
        cancel: <IMessageDialogButton>{ id: "cancel", text: Resources_Platform.ModalDialogCancelButton, reject: true },
        yes: <IMessageDialogButton>{ id: "yes", text: Resources_Platform.ModalDialogYesButton, reject: false },
        no: <IMessageDialogButton>{ id: "no", text: Resources_Platform.ModalDialogNoButton, reject: true },
        close: <IMessageDialogButton>{ id: "close", text: Resources_Platform.CloseButtonLabelText, reject: true },
    }
}

/**
* Common message dialog buttons
*/
export interface MessageDialogButtons {
    /** OK button */
    ok: IMessageDialogButton;
    /** Cancel button */
    cancel: IMessageDialogButton;
    /** Yes button */
    yes: IMessageDialogButton;
    /** No button */
    no: IMessageDialogButton;
    /** Close button */
    close: IMessageDialogButton;
}

export class MessageDialog extends MessageDialogO<IMessageDialogOptions> { }

export interface CopyContentDialogOptions extends IModalDialogOptions {
    dialogLabel?: string;
    dialogLabelExtend?: any;
    excludeTextPanel?: boolean;
    copyAsHtml?: boolean;
    data?: any;
    textAreaCopyClass?: string;
    pageHtml?: string;
    disableEdit?: boolean;
}

export class CopyContentDialog extends ModalDialogO<CopyContentDialogOptions> {

    public static enhancementTypeName: string = "CopyContentDialog";

    private _$textArea: any;

    constructor(options?) {
        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            width: options.width || 600,
            minWidth: 400,
            height: options.height || 450,
            minHeight: 200,
            attachResize: true,
            defaultButton: "close",
            buttons: [{
                id: "close",
                text: Resources_Platform.CloseButtonLabelText,
                click: delegate(this, this.close)
            }]
        }, options));
    }

    /**
     * Initializes the dialog.
     */
    public initialize() {
        super.initialize();
        this.setTitle(Resources_Platform.CopyContentDialogTitle);

        this._decorate();
    }

    /**
     * Initializes the dialog UI.
     */
    private _decorate() {
        var $element = this.getElement();
        var $textPanel;
        var $dialogLabel = $("<div>").text(this._options.dialogLabel || this._getDefaultLabelText());

        if (this._options.dialogLabelExtend) {
            $dialogLabel.append(this._options.dialogLabelExtend);
        }

        var $layoutPanel = $("<div class='copy-dialog-container'>")
            .append($dialogLabel)
            .append($("<p>"));

        if (!this._options.excludeTextPanel) {
            $textPanel = $("<div>");
            $layoutPanel.append($textPanel);

            if (this._options.copyAsHtml) {
                this._initializeRichEditor($textPanel)
            } else {
                this._initializeTextPanel($textPanel);
                Utils_Core.delay(this, 100, function () {
                    this._$textArea.focus();
                    this._$textArea.select();
                });
            }

            this._bind("dialogresize", () => {
                $textPanel.css("height", ($layoutPanel.height() - $dialogLabel.height() - 40) + "px");
            });
        }

        $element.append($layoutPanel);

        if (!this._options.excludeTextPanel) {
            $textPanel.css("height", ($layoutPanel.height() - $dialogLabel.height() - 40) + "px");
        }
    }

    private _getDefaultLabelText() {
        return Utils_UI.BrowserCheckUtils.isMacintosh()
            ? Resources_Platform.CopyContentMacintoshHelpText
            : Resources_Platform.CopyContentPcHelpText;
    }

    private _initializeRichEditor($container: JQuery) {
        VSS.using(['VSS/Controls/RichEditor'], (_Rich_Editor: typeof RichEditor_Async) => {
            var editor = <RichEditor_Async.RichEditor>Controls.BaseControl.createIn(_Rich_Editor.RichEditor, $container, {
                noToolbar: true,
                height: "100%",
                pageHtml: this._options.pageHtml,
                internal: true
            });
            editor.ready(() => {
                editor.setValue(this._options.data);

                editor.bindOnCopy(delegate(this, function () {
                    Utils_Core.delay(this, 0, function () {
                        this.close();
                    });
                }));

                // Focus and select all in the editor
                Utils_Core.delay(this, 100, function () {
                    editor.selectText();

                    // Disable editor after the text selection otherwise the focus will not be set correctly
                    editor.setEnabled(false);
                });
            });
        });
    }

    /**
     * Initializes the text area panel
     * 
     * @param $container The text area panel container.
     */
    private _initializeTextPanel($container: JQuery) {
        Diag.Debug.assertParamIsObject($container, "$container");

        var textAreaClass = "copy-content-textarea";

        if (this._options.textAreaCopyClass) {
            textAreaClass = this._options.textAreaCopyClass;
        }

        this._$textArea = $("<textarea/>").addClass(textAreaClass)
            .text(this._options.data);

        if (this._options.disableEdit)
        {
            this._$textArea.attr("readonly", "readonly");
        }

        this._$textArea[0].oncopy = delegate(this, function () {
            Utils_Core.delay(this, 0, function () {
                this.close();
            });
        });

        $container.append(this._$textArea);
    }
}


/**
 * Shows the specified dialog type using specified options.
 * 
 * @param dialogType Type of the dialog to show.
 * @param options Options of the dialog.
 * @returns {Dialog}.
 */
export function show<TDialog extends Dialog>(dialogType: new (options: any) => TDialog, options?: any): TDialog {
    return <TDialog>Dialog.show(dialogType, options);
}
/**
 * Show a MessageDialog.
 * @param message the message to display in the dialog. If it's a string, the message is displayed as plain text (no html). For HTML display, pass in a jQuery object.
 * @param methodOptions options affecting the dialog
 * @returns a promise that is resolved when the user accepts the dialog (Ok, Yes, any button with Button.reject===false), or rejected if the user does not (Cancel, No, any button with Button.reject===true).
 */
export function showMessageDialog(message: string | JQuery, options?: IShowMessageDialogOptions): Q.Promise<IMessageDialogResult> {
    return MessageDialog.showMessageDialog(message, options);
}

export function showConfirmNavigationDialog(message: string, title?: string): Q.Promise<IMessageDialogResult> {
    return showMessageDialog(message, {
        title: title || Resources_Platform.UnsavedChangesMessageTitle,
        noDefaultButton: true,
        buttons: [
            { id: "leave", text: Resources_Platform.UnsavedChangesLeaveButton, reject: false },
            { id: "stay", text: Resources_Platform.UnsavedChangesStayButton, reject: true },
        ]
    });
}
