/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Compat = require("VSS/Compatibility");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Events_Action = require("VSS/Events/Action");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Core = require("VSS/Utils/Core");
import Utils_Url = require("VSS/Utils/Url");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Html = require("VSS/Utils/Html");
import Utils_String = require("VSS/Utils/String");
import Telemetry = require("VSS/Telemetry/Services");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { MobileOperatingSystem, getMobileOperatingSystem } from "VSS/Utils/Mobile";
import { TelemetryEventData, publishEvent } from "VSS/Telemetry/Services";
import Utils_Accessibility = require("VSS/Utils/Accessibility");

const delegate = Utils_Core.delegate;
const domElem = Utils_UI.domElem;
const log = Diag.log;
const verbose = Diag.LogVerbosity.Verbose;
const telemetryAreaName = "RichEditor";

interface IRichEditorToolbarOptions {
    name: string;
    command?: string;
}

class RichEditorToolbarItem {

    public _options: IRichEditorToolbarOptions;
    public _element: JQuery;

    constructor(options: IRichEditorToolbarOptions) {
        this._options = $.extend({}, options);
        this._init();
    }

    public _init() {
    }

    public appendTo(container: JQuery) {
        this._element.appendTo(container);
    }
}

class RichEditorToolbarButton extends RichEditorToolbarItem {
    private static _commandToIconClass;

    public static create(name: string, command: string): RichEditorToolbarButton {
        let result: RichEditorToolbarButton = void 0;
        switch (command) {
            case "fore-color":
            case "back-color":
                // Create a different kind of toolbar item like drop down
                break;
            default:
                result = new RichEditorToolbarButton({ name: name, command: command });
                break;
        }
        return result;
    }

    constructor(options: IRichEditorToolbarOptions) {
        super(options);
    }

    public _init() {
        super._init();
        const richEditorClass = "richeditor-toolbar-" + this._options.command;

        const toolbarIcon = $(domElem("span"))
            .attr("unselectable", "on");

        this._initializeIconClasses();

        if (RichEditorToolbarButton._commandToIconClass[this._options.command]) {
            toolbarIcon.addClass("icon");
            toolbarIcon.addClass(RichEditorToolbarButton._commandToIconClass[this._options.command]);
        }

        this._element = $("<button />").append(toolbarIcon)
            .addClass(richEditorClass)
            .addClass("richeditor-toolbar-button")
            .click(() => this._onClick())
            .bind("keydown", (args) => this._onKeyDown(args))
            .attr("aria-label", this._options.name)
            .attr("tabindex", -1);

        RichContentTooltip.add(this._options.name, this._element);
    }

    private _initializeIconClasses() {
        if (!RichEditorToolbarButton._commandToIconClass) {
            RichEditorToolbarButton._commandToIconClass = {};
            RichEditorToolbarButton._commandToIconClass[RichEditor.BOLD_COMMAND] = "bowtie-icon bowtie-format-bold";
            RichEditorToolbarButton._commandToIconClass[RichEditor.ITALIC_COMMAND] = "bowtie-icon bowtie-format-italic";
            RichEditorToolbarButton._commandToIconClass[RichEditor.UNDERLINE_COMMAND] = "bowtie-icon bowtie-format-underline";
            RichEditorToolbarButton._commandToIconClass[RichEditor.REMOVE_FORMATTING_COMMAND] = "bowtie-icon bowtie-format-clear";
            RichEditorToolbarButton._commandToIconClass[RichEditor.INSERT_UNORDERED_LIST_COMMAND] = "bowtie-icon bowtie-format-list-unordered";
            RichEditorToolbarButton._commandToIconClass[RichEditor.INSERT_ORDEREDLIST_COMMAND] = "bowtie-icon bowtie-format-list-ordered";
            RichEditorToolbarButton._commandToIconClass[RichEditor.INDENT_COMMAND] = "bowtie-icon bowtie-format-indent-increase";
            RichEditorToolbarButton._commandToIconClass[RichEditor.OUTDENT_COMMAND] = "bowtie-icon bowtie-format-indent-decrease";
            RichEditorToolbarButton._commandToIconClass[RichEditor.CREATE_LINK_COMMAND] = "bowtie-icon bowtie-link";
            RichEditorToolbarButton._commandToIconClass[RichEditor.UNLINK_COMMAND] = "bowtie-icon bowtie-link-remove";
            RichEditorToolbarButton._commandToIconClass[RichEditor.INSERT_IMAGE_COMMAND] = "bowtie-icon bowtie-image";
            RichEditorToolbarButton._commandToIconClass[RichEditor.MAXIMIZE_COMMAND] = "bowtie-icon bowtie-view-full-screen";
            RichEditorToolbarButton._commandToIconClass[RichEditor.RESTORE_COMMAND] = "bowtie-icon bowtie-view-full-screen-exit";
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onClick(e?: JQueryEventObject): any {

        // Firing toolbarButtonClick event so that, rich editor can handle toolbar command itself
        this._element.trigger("toolbarButtonClick", { command: this._options.command });
        return false;
    }

    /**
     * @param e 
     * @return 
     */
    private _onKeyDown(e?: JQueryEventObject): any {
        let nextFocusedElement;

        if (e && (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE)) {
            return this._onClick();
        }
        else if (e && e.keyCode === Utils_UI.KeyCode.RIGHT) {
            nextFocusedElement = this._element.next(".richeditor-toolbar-button");
        }
        else if (e && e.keyCode === Utils_UI.KeyCode.LEFT) {
            nextFocusedElement = this._element.prev(".richeditor-toolbar-button");
        }

        if (nextFocusedElement && nextFocusedElement.length > 0) {
            nextFocusedElement.focus();
            e.preventDefault();
        }
    }
}

class RichEditorToolbarButtonGroup {
    private _buttons: RichEditorToolbarButton[];

    public static create(name: string, createCallback?: (result: RichEditorToolbarButtonGroup) => void) {
        const result = new RichEditorToolbarButtonGroup({ name: name });

        switch (name) {
            case "fontstyle":
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorBold, "bold"));
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorItalic, "italic"));
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorUnderline, "underline"));
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorRemoveFormatting, "removeformatting"));
                break;
            case "list":
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorBulletedList, "insertunorderedlist"));
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorNumberedList, "insertorderedlist"));
                break;
            case "indentation":
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorDecreaseIndent, "outdent"));
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorIncreaseIndent, "indent"));
                break;
            case "hyperlink":
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorCreateLink, "createlink"));
                result.addButton(RichEditorToolbarButton.create(Resources_Platform.EditorRemoveLink, "unlink"));
                break;
            default:
                if (createCallback && $.isFunction(createCallback)) {
                    createCallback(result);
                }
                break;
        }
        return result;
    }

    constructor(options: IRichEditorToolbarOptions) {
        this._buttons = [];
    }

    public addButton(button: RichEditorToolbarButton) {
        this._buttons.push(button);
    }

    public appendTo(container: JQuery) {
        for (let i = 0, len = this._buttons.length; i < len; i++) {
            this._buttons[i].appendTo(container);
        }
    }
}

export interface RichEditorAttachmentRequestData {
    fileName: string;
    binaryData: any;
}

export interface RichEditorAttachmentOperationResult {
    attachments: RichEditorAttachmentResult[];
}

export interface RichEditorAttachmentResult {
    Url: string;
}

export interface RichEditorAttachmentHandler {
    (attachment: RichEditorAttachmentRequestData): JQueryPromise<RichEditorAttachmentOperationResult>;
}

export type IRichEditorCommandHandler = (commandInfo: any, editor: RichEditor) => void;

export interface IRichEditorCommand {
    name: string;
    command: string;
    execute: IRichEditorCommandHandler;
}

export interface IRichEditorCommandGroup {
    groupName: string;
    commands: IRichEditorCommand[]
}

export enum RichEditorExternalLinkMode {
    CtrlClick,
    SingleClick
}

export interface IRichEditorOptions extends Controls.EnhancementOptions {
    id?: string;
    buttonGroups?: string[];
    customCommandGroups?: IRichEditorCommandGroup[];
    change?: Function;
    enabled?: boolean;
    waterMark?: string;
    altKeyShortcuts?: number[];
    ctrlKeyShortcuts?: number[];
    fireOnEveryChange?: boolean;
    linkClickHandler?: Function;
    noToolbar?: boolean;
    blankPageUrl?: string;
    pageHtml?: string;
    internal: boolean;

    /**
     * Locale - set as lang attribute on the rich editor
     */
    locale?: string;

    /**
     * Value for aria-label to apply to the richeditor
     */
    ariaLabel?: string;

    /**
     * Value for help text for accessibility
     */
    helpText?: string;

    /**
     * Function callback when the richeditor gains focus
     */
    focusIn?: Function;

    /**
     * Function callback when richeditor loses focus
     */
    focusOut?: Function;

    /**
     * Allows a single click on an image to open the image.
     */
    enableSingleClickImageOpen?: boolean;

    /**
     * Determines how to open external links. Defaults to CtrlClick
     */
    externalLinkMode?: RichEditorExternalLinkMode;
}

/**
 * @exemptedapi
 */
export class RichEditor extends Controls.Control<IRichEditorOptions> {

    public static enhancementTypeName: string = "tfs.richeditor";

    public static BOLD_COMMAND = "bold";
    public static ITALIC_COMMAND = "italic";
    public static UNDERLINE_COMMAND = "underline";
    public static INSERT_UNORDERED_LIST_COMMAND = "insertunorderedlist";
    public static INSERT_ORDEREDLIST_COMMAND = "insertorderedlist";
    public static INDENT_COMMAND = "indent";
    public static OUTDENT_COMMAND = "outdent";
    public static CREATE_LINK_COMMAND = "createlink";
    public static REMOVE_FORMATTING_COMMAND = "removeformatting";
    public static UNLINK_COMMAND = "unlink";
    public static INSERT_IMAGE_COMMAND: string = "insertImage";
    public static RESTORE_COMMAND: string = "restore";
    public static MAXIMIZE_COMMAND: string = "maximize";
    public static IMAGE_AUTOFIT_SCALE_FACTOR: number = 0.85;
    public static WATERMARK_CSS_CLASS = "watermark";
    public static ISEMPTY_MINIMAL_CONTENT_LENGTH = Utils_Html.Utils.ISEMPTY_MINIMAL_CONTENT_LENGTH;

    private _iframe: HTMLFrameElement;
    private _window: Window;
    private _textArea: JQuery;
    private _isReady: boolean;
    private _readyList: Array<() => void>;
    private _editable: boolean;
    private _toolbar: JQuery;
    private _urlToolTip: JQuery;
    private _hasFocus: boolean;
    private _explicitFocus: boolean;
    private _keyDownInDocument: boolean;
    private _customCommandHandlersMap: { [key: string]: IRichEditorCommandHandler; };
    private _currentValue: any;
    private _textAreaId: string;
    private _hasWaterMark: boolean;
    private _uploadAttachmentHandler: RichEditorAttachmentHandler;

    /**
     * Creates a new rich editor with the provided options
     */
    constructor(options: IRichEditorOptions) {
        // VSTS repo consumers set internal true
        Compat.removed("RichEditor", options && options.internal === true);
        super(options);
        this._customCommandHandlersMap = {};
    }

    /**
     * @param options 
     */

    public initializeOptions(options?: IRichEditorOptions) {
        super.initializeOptions($.extend({
            height: "200px",
            buttonGroups: ["fontstyle", "hyperlink", "list", "indentation"],
            externalLinkMode: RichEditorExternalLinkMode.CtrlClick
        }, options));
    }

    public hasFocus(): boolean {
        return this._hasFocus;
    }

    public _createIn(container) {
        const startTime = Date.now();
        super._createIn(container);
        this._textArea = $("<textarea />").appendTo(this.getElement());

        if (this._options.id) {
            this._textAreaId = this._options.id + "_txt";
            this._textArea
                .attr("id", this._textAreaId)
                .bind("focus", () => {
                    this.focus();
                });
        }

        this._decorate();
        const elapsedTime = Date.now() - startTime;
        publishEvent(new TelemetryEventData(telemetryAreaName, "RichEditorCreate", { elapsedTime }));
    }

    /**
     * @param element 
     */
    public _enhance(element: JQuery) {

        this._createElement();
        this._textArea = element;
        element.after(this.getElement());
        this.getElement().append(element);
        this._decorate();
    }

    public ready(fn) {
        let list = this._readyList;

        if (!this._isReady) {
            if (!list) {
                list = this._readyList = [];
            }
            list.push(fn);
        }
        else if ($.isFunction(fn)) {
            fn.call(this);
        }
    }

    public isReady(): boolean {
        return !!this._window && !!this._window.document && !!this._window.document.body;
    }

    public setEnabled(value: boolean) {
        this._ensureControlReadiness();
        this._setEditable(value);
        if (value && !this._options.noToolbar) {
            this._enableToolbar();
        }
        else {
            this._disableToolbar();
        }
    }

    public getValue(): string {
        if (!this._window || !this._window.document) {
            return "";
        }
        const doc = this._window.document;
        let value = "";

        this._ensureControlReadiness();

        if (!this._hasWaterMark && doc.body) {
            value = this._normalizeValue(doc.body.innerHTML);
        }

        return value;
    }

    /**
     * Checks whether rich editor is visually empty.
     *
     * Since the control uses contentEditable on real HTML, the actual DOM has many formatting and content left when it is visually empty.
     * This function provides a "best effort" check on whether it is visually empty by:
     * 1. Not empty if content length is over the minimal threshold. See RichEditor.ISEMPTY_MINIMAL_CONTENT_LENGTH.
     * 2. If content length is less than the minimal threshold, we remove the formatting before checking whether it matches any "empty" case.
     */
    public isEmpty(value: string): boolean {
        return Utils_Html.Utils.isEmpty(value);
    }

    public setValue(value) {
        const startTime = Date.now();
        this._ensureControlReadiness();

        const doc = this._window.document;

        if (doc.body) {

            doc.body.innerHTML = value;
            this._trySettingWaterMark(value);

            this._currentValue = this._normalizeValue(doc.body.innerHTML);
        }
        else {
            this._currentValue = this._normalizeValue(value);
        }

        const contentLength = this._currentValue.length;
        const elapsedTime = Date.now() - startTime;
        publishEvent(new TelemetryEventData(telemetryAreaName, "RichEditorSetValue", { elapsedTime, contentLength }));
    }

    /**
     * Inserts an image tag pointing to the specified url at the current caret position if possible.
     * If the current caret position cannot be determined, the image tag is inserted at the editor root node.
     * 
     * @param url The url containing an image in which to link to the document. 
     */
    public insertImage(url: string) {

        Diag.Debug.assertParamIsString(url, "url");

        Diag.logTracePoint("RichEditor.InlineImage.insertion.start");

        this._ensureControlReadiness();
        // Blur the iframe, as IE has a bug where execCommand("insertimage", ...) fails if the iframe itself has focus
        this._iframe.blur();
        this._window.document.body.focus();

        this._window.document.execCommand(RichEditor.INSERT_IMAGE_COMMAND, false, url);
        this._resizeImageOnLoadComplete(url);
    }

    public focus() {
        if (this._iframe.contentDocument && this._iframe.contentDocument.body) {
            this._iframe.contentDocument.body.focus();
        }
        else {
            this._iframe.focus();
        }
    }

    public static getOffsetForLastElementSelection(lastElement: Element): number {
        if (!lastElement) {
            throw new Error("lastElement is required");
        }
        if (lastElement.childNodes.length > 0) {
            if (lastElement.childElementCount > 0 && lastElement.lastElementChild.tagName === "BR") {
                return lastElement.childNodes.length - 1;
            }
            return lastElement.childNodes.length;
        }
        return 0;
    }

    public selectText(collapseToEnd?: boolean) {
        const editorDoc = this._iframe.contentDocument;
        const editorWin = this._iframe.contentWindow;
        if (editorDoc && editorWin) {
            this.focus();

            const range = editorDoc.createRange();
            range.selectNodeContents(editorDoc.body);
            if (collapseToEnd) {
                range.collapse(false);
            }

            // Fix for Bug 424710: Extra whitespace added when maximizing RichEditor and then typing
            // The problem is that sometimes the cursor needs to be placed slightly before the end of the last element
            const lastElement = editorDoc.body.lastElementChild;
            if (lastElement) {
                const offset = RichEditor.getOffsetForLastElementSelection(lastElement);
                range.setEnd(lastElement, offset);
            }

            const selection = editorWin.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    public bindOnCopy(handler: any) {
        if (this._window.document && this._window.document.body) {
            this._window.document.body.oncopy = handler;
        }
    }

    public getWindow(): Window {
        return this._window;
    }

    /**
     * Force enables the toolbar
     */
    public enableToolbar(): void {
        this._options.noToolbar = false;
        this._enableToolbar();
    }

    /**
     * Force disables the toolbar
     */
    public disableToolbar(): void {
        this._options.noToolbar = true;
        this._disableToolbar();
    }

    /**
     * Enables and shows the rich editor toolbar
     */
    private _enableToolbar(): void {
        this._showToolbar(0.35);
    }

    /**
     * Disables and hides the rich editor toolbar.
     */
    private _disableToolbar(): void {
        this._hideToolbar();
    }


    private _resizeImageOnLoadComplete(url: string, loadCompleteCallback?: IResultCallback) {

        // NOTE: this is an expensive selector but since we are using the execCommand
        // infrastructure we don't have a dom element that refers to the image so we have
        // to go find it using the only natural key we have: the url.

        const $imgElement = $('img[src="' + url + '"]', this._window.document);

        const endResizeImageOnLoadComplete = () => {
            // Setting the width here will respect the aspect ratio of the image
            // so there is no need to adjust the height.
            $imgElement.width(Math.min($imgElement.width(), $(this._window.document.body).width() * RichEditor.IMAGE_AUTOFIT_SCALE_FACTOR));

            // The browser won't fire the change event of the TEXTAREA by default when an image
            // or other complex object is inserted.  Instead, we will forcibly mark the field as dirty
            // once we have inserted the image tag.

            if ($.isFunction(this._options.change)) {
                this._options.change();
            }

            if (loadCompleteCallback) {
                loadCompleteCallback($imgElement);
            }

            Diag.logTracePoint("RichEditor.InlineImage.insertion.complete");
        }

        // KLUDGE: The size of the image isn't known until it has finished rendering.  Wait
        // until then to adjust the extents to avoid overtaking the description field.
        $imgElement.bind("load", delegate(this, function (e) {

            const width = $imgElement.width();
            if (width <= 28) {
                // IE11 and Edge have a bug around widths of images at the time the 'load' event fires.  
                // IE11 returns 28px which is the width of the image-not-found placeholder.
                // Edge sometimes returns 0px.
                // By delaying the setting of the width, we can get the correct width.
                Utils_Core.delay(this, 0, endResizeImageOnLoadComplete);
            } else {
                endResizeImageOnLoadComplete();
            }
        }));
    }

    public setInvalid(isInvalid: boolean, styleTextArea: boolean = false) {
        if (styleTextArea) {
            // Bug 531755: Typing in repro steps slow on microsoft account
            // When using toggleClass, unexpected style recalculation happens after each field changed event fired (KeyUp->FieldChanged->Flush->SetInvalid)
            // This causes huge perf impact when page has many UI elements (e.g. dashboard page with 20 charts)
            if (this._iframe) {
                const iframeBody = $(this._iframe).contents().find("body");
                const markedInvalid = iframeBody.hasClass("invalid");

                if (isInvalid && !markedInvalid) {
                    iframeBody.addClass("invalid");
                } else if (!isInvalid && markedInvalid) {
                    iframeBody.removeClass("invalid");
                }
            }
        } else {
            this.getElement().toggleClass("invalid", isInvalid);
        }
    }

    public setUploadAttachmentHandler(handler: RichEditorAttachmentHandler) {
        this._uploadAttachmentHandler = handler;
    }

    public getTextAreaId() {
        return this._textAreaId;
    }

    /**
     * Checks whether the value of the control is changed or not and fires the CHANGE event if it has
     */
    public checkModified() {
        const newValue = this.getValue();
        if (this._currentValue !== newValue) {

            // Fire change if transitioning from clean to dirty (or vice versa)
            this._currentValue = newValue;
            this._showUrlToolTip(null, false);
            this._fireChange(this._textArea);
        }
    }

    /**
     * Gets the outerHeight of the control
     */
    public getOuterHeight(includeMargin?: boolean): number {
        return this.getElement().outerHeight(includeMargin);
    }

    /**
     * Gets the height of the control
     */
    public getHeight(): number {
        return this.getElement().height();
    }

    /**
     * Sets the height of the control
     */
    public setHeight(newHeight: number): void {
        this.getElement().height(newHeight);
    }


    private _pasteImage(url: string) {
        const html = '<img src = "' + url + '" /><br />';

        this._ensureControlReadiness();
        this._window.focus();

        Utils_UI.HtmlInsertionUtils.pasteHtmlAtCaret(html, this._window);

        this._resizeImageOnLoadComplete(url, ($imgElement: JQuery) => {
            if ($imgElement && $imgElement.length > 0) {
                const $editorDocument = $(this._window.document);
                $editorDocument.scrollTop($imgElement.offset().top + $imgElement[0].scrollHeight);
            }
        });
    }

    private _getToolbar(): JQuery {
        if (!this._toolbar) {
            this._toolbar = this._createToolbar();
        }
        return this._toolbar;
    }

    private _onFocusToolbar(e: JQueryEventObject) {
        const $toolbar = this._getToolbar();
        $toolbar.find(".richeditor-toolbar-button:first").focus();
        $toolbar.attr("tabindex", -1);
    }

    private _onFocusOutToolbar(e: JQueryEventObject) {
        const $toolbar = this._getToolbar();
        if (!$.contains($toolbar.get(0), e.relatedTarget)) {
            $toolbar.attr("tabindex", 0);
        }
    }

    private _createToolbar(): JQuery {
        const buttonGroups = this._options.buttonGroups || [];
        const customGroups = this._options.customCommandGroups || [];

        const $toolbar = $(domElem("div", "richeditor-toolbar")).prependTo(this.getElement());

        buttonGroups.forEach((buttonGroup) => {
            RichEditorToolbarButtonGroup.create(buttonGroup).appendTo($toolbar);
        });

        customGroups.forEach((customGroup) => {
            this._createToolbarButtonGroup(customGroup).appendTo($toolbar);
        });

        $toolbar.attr("tabindex", 0)
            .attr("role", "toolbar")
            .attr("aria-label", Resources_Platform.EditorToolbar)
            .bind("focus", (e) => {
                this._onFocusToolbar(e);
            })
            .bind("focusout", (e) => {
                this._onFocusOutToolbar(e);
            });

        $toolbar.find(".richeditor-toolbar-button")
            .bind("focus", (e) => {
                this._onFocusIn(e);
            })
            .bind("blur", (e) => {
                this._explicitFocus = false;
                this._onFocusOut(e);
            });

        if (Utils_UI.BrowserCheckUtils.isMsie()) {
            // IE loses selection of the document in iframe when focus is out. Thus, we disable getting focus
            // for toolbar buttons in IE so that focus is not lost when toolbar button is clicked
            Utils_UI.makeElementUnselectable($toolbar[0]);
        }

        return $toolbar;
    }

    /**
     * Creates a toolbar button group.
     * 
     * @param customGroup An object representing a toolbar button group.
     */
    private _createToolbarButtonGroup(customGroup: IRichEditorCommandGroup): RichEditorToolbarButtonGroup {
        Diag.Debug.assertParamIsObject(customGroup, "customGroup");

        return RichEditorToolbarButtonGroup.create(customGroup.groupName, (toolbarGroup) => {
            customGroup.commands.forEach((command) => {
                // Dereference each command into an index by command name for easy retrieval during _executeCommand().
                this._customCommandHandlersMap[command.command] = command.execute;

                toolbarGroup.addButton(RichEditorToolbarButton.create(command.name, command.command));
            });
        });
    }

    private _showPanel(panel: JQuery, opacity?: number) {

        panel.stop(true, true);

        if (opacity === 0) {
            panel.fadeOut('slow');
        }
        else {
            panel.css("opacity", typeof (opacity) === "number" ? opacity : 1);
            panel.fadeIn('slow');
        }
    }

    /**
     * @param opacity 
     */
    private _showToolbar(opacity?: number) {
        const element = this.getElement();
        // Perform showing toolbar when the control is not disposed
        if (element) {
            log(verbose, "(richeditor) Showing toolbar (opacity=" + opacity + ")");
            this._showPanel(this._getToolbar(), opacity);
            element.removeClass("no-toolbar");
        }
    }

    private _hideToolbar() {
        log(verbose, "(richeditor) Hiding toolbar");
        this.getElement().addClass("no-toolbar");
        if (this._toolbar) {
            this._toolbar.hide();
        }
    }

    private _getUrlToolTip(): JQuery {
        // Get url tool tip, creating on demand
        if (!this._urlToolTip) {
            this._urlToolTip = this._createUrlToolTip().hide();
        }

        return this._urlToolTip;
    }

    private _createUrlToolTip(): JQuery {
        // Create url tool tip
        return $(domElem("span", "richeditor-urltooltip")).appendTo(this.getElement());
    }

    private _showUrlToolTip(e?: JQueryEventObject, doShow: boolean = true) {
        // show/hide URL tooltip

        // update urlToolTip
        if (doShow && e) {
            let toolTipContent: string = "";
            const linkNode = this._getNodeAncestor(e && e.target, "A");
            const urlString = (linkNode && linkNode.href) || "";

            // no tooltip to show if there isn't a link
            if (!urlString) {
                return;
            }

            if ($(linkNode).hasClass("not-a-link")) {
                return;
            }

            if (Utils_Url.isSafeProtocol(urlString)) {
                // On OS X, Cntrl+Click is the shortcut for right click (context menu) so instead
                // use Command+Click which is what users expect.
                if (Utils_UI.BrowserCheckUtils.isMacintosh()) {
                    toolTipContent = urlString + "<br/>" + Resources_Platform.CommandClickToOpen;
                } else {
                    toolTipContent = urlString + "<br/>" + Resources_Platform.CtrlClickToOpen;
                }
            } else {
                toolTipContent = Resources_Platform.DisallowedProtocol + "<br/>" + urlString;
            }

            // position element invisibly in top left corner
            this._getUrlToolTip()
                .empty()
                .css('top', 0)
                .css('left', 0)
                .append(toolTipContent);

            // display object with visibility hidden
            this._urlToolTip.css('visibility', 'hidden');
            this._urlToolTip.show();

            // useful nodes include linkNode, the tooltip (tipNode) and parent document body
            const tipNode = this._urlToolTip[0];
            const linkNodeOffset = $(linkNode).offset();

            // parent offset information
            const doc = this._window.document;
            // doc.documentElement generally contains scroll information in IE/Firefox 
            // while doc.body contains scroll information in Chrome/Opera. 
            const parentOffsetWidth = doc.documentElement.offsetWidth || doc.body.offsetWidth;

            // get left and top coordinates
            let left = Math.min(linkNodeOffset.left + linkNode.offsetWidth, parentOffsetWidth) - tipNode.offsetWidth; // right-aligned
            if (left < 0) {
                left = linkNodeOffset.left; // left-aligned
            }

            let top = linkNodeOffset.top - tipNode.offsetHeight - 10;
            if (top < 0) {
                top = linkNodeOffset.top + linkNode.offsetHeight + 10;
            }

            // hide and reposition
            this._urlToolTip.hide();
            this._urlToolTip.css('visibility', 'visible');
            this._urlToolTip.css('left', left).css('top', top);
        }

        if (this._urlToolTip) {
            log(verbose, "(richeditor) " + (doShow ? "Showing" : "Hiding") + " url tool tip");
            this._showPanel(this._urlToolTip, doShow ? 1 : 0);
        }
    }

    private _decorate() {
        const options = this._options;

        this.getElement().addClass("richeditor-container")
            .addClass("propagate-keydown-event")
            .keydown((e: JQueryKeyEventObject) => {
                // Handle tab event when wrap (TAB on last or SHIFT+TAB on first tabbable element) 
                // JQuery dialog does not handle scenario the event is bubbled from the iframe element as the source of event different than tabbable element.
                if (e.keyCode === Utils_UI.KeyCode.TAB) {
                    const jQueryDialog = $(e.target).closest(".ui-dialog");
                    if (jQueryDialog.length > 0) {
                        const tabbables = jQueryDialog.find(":tabbable");
                        const firstTabbable = tabbables.filter(":first");
                        const lastTabbable = tabbables.filter(":last");
                        if (!e.shiftKey && $.contains(e.target, lastTabbable[0])) { // Tab on last tabbable RichEditor control
                            firstTabbable.focus();
                            e.stopPropagation();
                            e.preventDefault();
                        }
                        else if (e.shiftKey && $.contains(e.target, firstTabbable[0])) { // Shift+Tab on first tabble RichEditor control 
                            lastTabbable.focus();
                            e.stopPropagation();
                            e.preventDefault();
                        }
                    }
                }
            });

        this._bind("toolbarButtonClick", delegate(this, this._onToolbarButtonClick));

        // Creating iframe
        const iframe = $("<iframe />")
            .attr("frameBorder", "no");

        if (options.ariaLabel) {
            const ariaLabelAttribute = "aria-label";
            // move the aria-label to iframe's body (contenteditable)
            this.getElement().removeAttr(ariaLabelAttribute);
            // Without role and label, Narrator announces "about:blank", presentation role suppresses this behavior
            iframe.attr("role", "presentation");
        }

        if (options.blankPageUrl) {
            iframe.attr("src", options.blankPageUrl);
        }
        else if (options.pageHtml || options.waterMark) {
            // This has to happen after "load" (As #document is null and 'head' doesn't exist)
            iframe.bind("load", () => {
                const $head: JQuery = iframe.contents().find("head");

                if (options.pageHtml) {
                    $head.html(options.pageHtml);
                }

                if (options.waterMark) {
                    $head.append(`<style>.watermark:before { content: "${Utils_String.htmlEncode(options.waterMark)}"; }</style>`);
                }
            });
        }

        iframe.bind("load", delegate(this, this._initialize));
        iframe.bind("remove", delegate(this, this._cleanUp));

        this._iframe = iframe[0] as HTMLFrameElement;
        iframe.appendTo($(domElem("div", "richeditor-editarea")).appendTo(this.getElement()));

        // There is no reason to display textarea because iframe replaces it.
        // Hiding textarea also improves the performance significantly especially when
        // the html content is huge. Setting a huge amount of text into a visible
        // textarea causes IE to freeze (See bug #743473)
        this._textArea.hide();
    }

    private _initialize() {
        // Getting reference of iframe window
        this._window = this._iframe.contentWindow;
        if (!this._options.noToolbar) {
            this._showToolbar(0.35);
        } else {
            this._hideToolbar();
        }
        $(this._window.document).ready(delegate(this, this._onDocumentReady));
    }

    private _cleanUp() {
        this._detachEvents();

        if (this._options) {
            this._options = null;
        }

        if (this._iframe) {
            // When the element is removed from the DOM, set the src to about:blank to work around
            // IE focus issues. Still needed on IE11. See bugs: mseng #144840, microsoft OSG: #1142940
            $(this._iframe).attr("src", "about:blank");
            this._iframe = null;
        }

        this._toolbar = null;
        this._textArea = null;
    }

    /**
     * Attaches necessary events to catch the changes if the control is enabled
     */
    private _attachEvents() {
        this._bind(this._iframe, "blur", delegate(this, this._onFocusOut));
        this._bind(this._iframe, "focus", delegate(this, this._onFocusIn));

        if (!Utils_UI.BrowserCheckUtils.isMsie()) {
            this._bind(this._window, "blur", delegate(this, this._onFocusOut));
            this._bind(this._window, "focus", delegate(this, this._onFocusIn));
        }

        this._bind(this._window.document, "click", delegate(this, this._onClick));
        this._bind(this._window.document, "mouseup", delegate(this, this._onMouseUp));
        this._bind(this._window.document, "mousedown", delegate(this, this._onMouseDown));
        this._bind(this._window.document, "keyup", delegate(this, this._onKeyUp));
        this._bind(this._window.document, "keydown", delegate(this, this._onKeyDown));
        this._bind(this._window.document, "keypress", delegate(this, this._onKeyPress));
        this._bind(this._window.document, "input", delegate(this, this._onInput));

        this._bind(this._window.document, "dblclick", delegate(this, this._onDblClick));

        this._bind(this._window.document, "paste", delegate(this, this._onPaste));

        if ($.isFunction(this._options.change)) {
            this._bind(this._textArea, "change", this._options.change);
        }

        if (this._options.externalLinkMode === RichEditorExternalLinkMode.CtrlClick) {
            $(this._window.document).on({
                mouseenter: (e: JQueryEventObject) => {
                    this._showUrlToolTip(e);
                },
                mouseleave: (e: JQueryEventObject) => {
                    this._showUrlToolTip(e, false);
                }
            }, "a");
        }
    }

    private _detachEvents() {
        this._unbind(this._iframe, "blur");
        this._unbind(this._iframe, "focus");

        if (!Utils_UI.BrowserCheckUtils.isMsie()) {
            this._unbind(this._window, "blur");
            this._unbind(this._window, "focus");
        }

        // double click is a read only handler so there is no need to unbind it here.

        this._unbind(this._window.document, "mouseup");
        this._unbind(this._window.document, "mousedown");
        this._unbind(this._window.document, "keyup");
        this._unbind(this._window.document, "paste");

        if ($.isFunction(this._options.change)) {
            this._unbind(this._textArea, "change");
        }
        this._unbind(this._textArea, "focus");

        $(this._window.document).off("mouseenter mouseleave", "a");
    }

    /**
     * @param e 
     * @return 
     */
    private _onDblClick(e?: JQueryEventObject): any {

        if (e) {
            // The only double-click gesture that makes sense in the rich editor is to launch
            // inline images in a new tab/window.  Make sure that we only take action on images.
            this._openImage(e.target);
        }
    }

    /**
     * Attempts to launch a new browser window from the specified element if the element is an 'img' tag.
     * @param element
     */
    private _openImage(element: Element) {

        const $src = $(element);

        // for src url with starting with data use alt to open attachment
        if ($src.is('img') && $src.attr("src")) {
            const srcUrl = $src.attr("src");
            const altUrl = $src.attr("alt");
            let url = srcUrl.toLowerCase();

            if (url.indexOf("data") === 0) {
                url = altUrl.toLowerCase();
            }

            const openedWindow = this._window.open(url, "_blank");

            if (openedWindow) {
                // Ensure no hijacking is possible.
                openedWindow.opener = null;
            }
        }
    }

    private _onDocumentReady() {
        this._isReady = true;
        this._window.document.body.innerHTML = this._textArea.val();
        this._trySettingWaterMark(this._textArea.val());
        this._setEditable(this._options.enabled !== false);
        this._processReadyList();

        if (this._options.locale) {
            this._window.document.documentElement.setAttribute("lang", this._options.locale);
        }
    }

    private _trySettingWaterMark(val: string) {
        if (this.isEmpty(val) && this._options.waterMark && !this._hasFocus) {
            $(this._window.document.body).addClass(RichEditor.WATERMARK_CSS_CLASS);
            this._hasWaterMark = true;
        } else {
            this._clearWaterMark();
        }
    }

    private _clearWaterMark() {
        if (this._hasWaterMark) {
            $(this._window.document.body).removeClass(RichEditor.WATERMARK_CSS_CLASS);
            this._hasWaterMark = false;
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onFocusIn(e?: JQueryEventObject): any {
        if (!this._explicitFocus) {
            if (e && e.currentTarget) {
                log(verbose, "(richeditor) focus in " + e.currentTarget.nodeType);
            }
            if (this._options && !this._options.noToolbar) {
                this._showToolbar();
            }
        }
        this._hasFocus = true;
        if (this._hasWaterMark && this._options.helpText) {
            Utils_Accessibility.announce(this._options.helpText, true);
        }
        this._clearWaterMark();

        if (this._options && this._options.focusIn) {
            this._options.focusIn();

            // Triggering focusIn event to bubble up to parent
            if (e) {
                e.target = this.getElement()[0];
                this.getElement().trigger("focusin");
            }
        }
        this.getElement().addClass("focus-rich-text");
    }

    /**
     * @param e 
     * @return 
     */
    private _onFocusOut(e?: JQueryEventObject): any {
        Utils_Core.delay(this, 250, function () {
            if (!this._explicitFocus && !this._hasFocus) { 
                if (this._options && !this._options.noToolbar) {
                    this._showToolbar(0.35);
                }
            }
            else {
                this._explicitFocus = false;
            }
        });

        this._hasFocus = false;
        this.checkModified();
        this._trySettingWaterMark(this.getValue());

        if (this._options && this._options.focusOut) {
            this._options.focusOut();
            // Triggering focusOut event to bubble up to parent
            if (e) {
                e.target = this.getElement()[0];
                this.getElement().trigger("focusout");
            }
        }
        this.getElement().removeClass("focus-rich-text");
    }

    private _onPaste(e?): any {
        const clipboardItems = e && e.originalEvent && e.originalEvent.clipboardData;
        let items;
        let item;
        let reader: FileReader;
        let file = null;

        if (!this._uploadAttachmentHandler) {
            return;
        }

        // The modern browsers will give multiple items of different types. For example, if you put an image on your clipboard by right-clicking
        // in a browser and choosing "copy" and then pasting into Chrome you will get two types of items: text/html and image/png.
        // In this case we need to choose one (or in the future give the user a choice). Below we decide that as long as there is a
        // text/string option we will always allow that to be handled otherwise if there is a file we will use that. This helps handle the case
        // of programs like onenote which populate both Image and Text types even though most people want the text.
        if (clipboardItems && !this._doesStringItemExist(clipboardItems.items)) { // Chrome & Firefox & Edge
            items = clipboardItems.items;
            item = this._getImageItem(items);
            if (item) {
                file = item.getAsFile();
            }
        }

        else if ((<any>window).clipboardData) { // IE11
            items = (<any>window).clipboardData.files;
            file = this._getImageItem(items);
        }

        // Load image if there is a pasted image and file.size is greater than 0.
        // Note: When pasting from certain windows applications (e.g., Outlook) in non-IE browsers, it might occur that a file with 
        // size 0 is received here. We could return false to abort the paste process in that case but decided against it for now.
        // See mseng-#155321
        if (file && file.size > 0) {
            reader = new FileReader();

            reader.onloadend = delegate(this, this._onFileReadComplete, file.type);

            reader.readAsDataURL(file);

            // For IE11 we need to prevent the default behavior - In IE11, paste of image automatically happens in a contenteditable div with the img src as dataURI for a local file.
            return false;
        }
    }

    private _doesStringItemExist(items?: any[]): boolean {
        if (items) {
            const length = items.length;
            for (let i = 0; i < length; i++) {

                // Find a string item that is not RTF since browsers won't render that on paste
                if (items[i].kind === "string" && items[i].type.indexOf("text/rtf") < 0) {
                    return true;
                }
            }
        }

        return false;
    }

    private _getImageItem(items?: any[]) {
        if (items) {
            const length = items.length;
            for (let i = 0; i < length; i++) {
                if (items[i].type.indexOf("image") === 0) {
                    return items[i];
                }
            }
        }
        return null;
    }

    private _getRandomFileName(fileType?: string): string {
        const date = new Date();
        let extension = "png"; // Default to png

        if (fileType) {
            if (fileType.indexOf("jpg") !== -1
                || fileType.indexOf("jpeg") !== -1) {
                extension = "jpg";
            }
        }

        // Hardcoding "temp" so that it is not localized to an invalid filename.
        return "temp" + date.getTime() + "." + extension;
    }

    private _onFileReadComplete(e, fileType?: string) {
        if (e.target && e.target.result) {
            const fileToUpload = { fileName: this._getRandomFileName(fileType), binaryData: e.target.result };
            this._uploadAttachment(fileToUpload);
        }
    }

    private _uploadAttachment(attachment: RichEditorAttachmentRequestData) {
        if (this._uploadAttachmentHandler) {
            this._uploadAttachmentHandler(attachment)
                .done((result: RichEditorAttachmentOperationResult) => this._onUploadComplete(result))
                .fail((e) => this._onUploadError(e));
        }
    }

    private _onUploadComplete(result: RichEditorAttachmentOperationResult) {
        if (result.attachments.length > 0) {
            this._pasteImage(result.attachments[0].Url);
        }
    }

    private _onUploadError(error) {
        alert(error.message);
    }

    /**
     * @param e 
     * @return 
     */
    private _onClick(e?: JQueryEventObject): any {

        // disable CTRL-click handler (i.e. on Firefox)
        if (e && e.ctrlKey && !e.altKey && !e.shiftKey && this._getNodeAncestor(e.target, "A")) {
            e.preventDefault();
        }
        // If in readonly mode, if there is an anchor tag launch the url when user clicks
        // so that it avoids opening the link in the iframe
        else if (this._editable === false && e && this._getNodeAncestor(e.target, "A")) {
            this._launchHref(e);
            e.preventDefault();
        }
        else if (e && this._options.enableSingleClickImageOpen) {
            this._openImage(e.target);
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onMouseUp(e?: JQueryEventObject): any {

        if (this._options.fireOnEveryChange === true) {
            this.checkModified();
        }

        this._checkForHrefClick(e);
    }

    /**
     * @param e 
     * @return 
     */
    private _onMouseDown(e?: JQueryEventObject): any {

        // disable CTRL-mousedown handler (which on IE selects entire paragraph)
        if (e && e.ctrlKey && !e.altKey && !e.shiftKey && this._getNodeAncestor(e.target, "A")) {
            e.preventDefault();
        }
    }

    private _reTriggerKeyboardEvent(e?: JQueryEventObject) {
        // dispatchEvent call is crashing browsers on iOS (version >= 10.12.5)
        // We can remove the iOS check once the issue gets fixed.
        // We re-trigger for modifier keys / escape key, since these often are part of keyboard shortcuts
        const isRetriggerKeyPressed = e && (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.keyCode === Utils_UI.KeyCode.ESCAPE);
        if (isRetriggerKeyPressed && (getMobileOperatingSystem() !== MobileOperatingSystem.iOS)) {
            const domElement = this.getElement()[0];

            // Set an attribute on the target element indicating we only want
            // global keyboard shortcuts processed. We do this because we are trying to fire
            // an event from the rich editor in the iframe out to the parent frame.
            // When we do this the target element is no longer an input box which would let 
            // keyboard shortcuts like "s" run which we don't want when you are typing in a editor
            domElement.setAttribute("data-onlyglobalshortcuts", "true");

            // If the browser is IE11 we need to create a new keyboard event since
            // it does not allow dispatching existing events
            const domEvent = Utils_UI.BrowserCheckUtils.isIE()
                ? this._buildSyntheticKeyboardEvent(<KeyboardEvent>e.originalEvent)
                : e.originalEvent;

            // We want to re-fire this event on the parent frame. Since we are currently in an event
            // we need to do a setTimeout to let the current event finish and fire a new one
            window.setTimeout(() => { domElement.dispatchEvent(domEvent); }, 0);
        }
    }

    /**
     * Create a synthetic keyboard event. This is needed to dispatch
     * an event in IE11 since it doesn't allow re-dispatching of existing events
     * @param domEvent A dom keyboard event
     */
    private _buildSyntheticKeyboardEvent(domEvent: KeyboardEvent) {
        const keyboardEvent = document.createEvent("KeyboardEvent")
        const modifiers = ["Alt", "AltGraph", "CapsLock", "Control", "Meta", "NumLock", "Scroll", "Shift", "Win"];
        const modifierArgs = modifiers.reduce((prev, curr) => { return domEvent.getModifierState(curr) ? prev + " " + curr : prev }, "");
        let key = domEvent.key;

        // For IE, for special characters key is not identified so a hack to get the char code of comma and period 
        // to make workitemform keyboard shortcuts to work
        if (key === "Unidentified") {
            if (domEvent.keyCode === 188) {
                key = ",";
            }
            else if (domEvent.keyCode === 190) {
                key = ".";
            }
        }

        keyboardEvent.initKeyboardEvent(
            domEvent.type, domEvent.bubbles, domEvent.cancelable,
            domEvent.view, key, domEvent.location,
            modifierArgs, domEvent.repeat, (domEvent as any).locale);

        return keyboardEvent;
    }

    /**
     * @param e 
     * @return 
     */
    private _onKeyDown(e?: JQueryEventObject): any {
        let needReTrigger = true;
        // detect Enter key and launch hyperlink if appropriate
        if (e && e.which === Utils_UI.KeyCode.ENTER && e.ctrlKey && !e.altKey && !e.shiftKey) {
            const linkNode = this._getNodeUnderCaret("A");
            if (linkNode && linkNode.href) {
                this._processAndLaunchHref(linkNode, e);
                e.preventDefault();
                needReTrigger = false;
            }
        }

        function isShortcut(keyCode): boolean {
            return keyCode === e.which;
        }

        // Prevent default on these ctrl shortcuts on Windows or CMD shortcuts on Mac/iOS to avoid browser conflicts
        if ((Utils_UI.KeyUtils.shouldUseMetaKeyInsteadOfControl() && e && e.metaKey && !e.altKey && this._options.ctrlKeyShortcuts)
            || (e && e.ctrlKey && !e.altKey && this._options.ctrlKeyShortcuts)) {
            if (this._options.ctrlKeyShortcuts.some(isShortcut)) {
                e.preventDefault();
            }
        }

        // Prevent default on these alt shortcuts to avoid browser conflicts
        if (e && e.altKey && !e.ctrlKey && this._options.altKeyShortcuts) {
            if (this._options.altKeyShortcuts.some(isShortcut)) {
                e.preventDefault();
            }
        }

        // Edge treats ctr+enter like enter but all other browsers ignore it.
        // Make edge ignore it too b/c we use ctr+enter as a hotkey.
        if (e && e.ctrlKey && e.keyCode === Utils_UI.KeyCode.ENTER) {
            e.preventDefault();
        }

        // note: our commands are CTRL based, AltGraph will be CTRL+ALT so ignore when ALT is pressed
        if (e && e.ctrlKey && !e.altKey) {
            // detect ctrl + Space for remove formatting option
            if (e.which === Utils_UI.KeyCode.SPACE) {
                this._executeCommand({ command: RichEditor.REMOVE_FORMATTING_COMMAND });
                e.preventDefault();
                return;
            }

            // detect ctrl + k for create link
            if (e.which === Utils_UI.KeyCode.K) {
                this._executeCommand({ command: RichEditor.CREATE_LINK_COMMAND });
                e.preventDefault();
                return;
            }

            if (e.which === Utils_UI.KeyCode.B) {
                this._executeCommand({ command: RichEditor.BOLD_COMMAND });
                e.preventDefault();
                return;
            }

            if (e.which === Utils_UI.KeyCode.I) {
                this._executeCommand({ command: RichEditor.ITALIC_COMMAND });
                e.preventDefault();
                return;
            }

            if (e.which === Utils_UI.KeyCode.U) {
                this._executeCommand({ command: RichEditor.UNDERLINE_COMMAND });
                e.preventDefault();
                return;
            }
        }

        if (e.keyCode === Utils_UI.KeyCode.TAB) {
            this._explicitFocus = this._hasFocus;
        }

        // Raise event on RichEditor control
        if (needReTrigger) {
            this._reTriggerKeyboardEvent(e);
        }

        this._keyDownInDocument = true;
    }

    /**
     * @param e 
     * @return 
     */
    private _onKeyPress(e?: JQueryEventObject): any {

        // Raise event on RichEditor control
        this._reTriggerKeyboardEvent(e);
    }

    /**
     * @param e 
     * @return 
     */
    private _onKeyUp(e?: JQueryEventObject): any {

        if (this._options.fireOnEveryChange === true) {
            this.checkModified();
        }

        this._keyDownInDocument = false;

        // Raise event on RichEditor control
        this._reTriggerKeyboardEvent(e);
    }

    /**
     * @param e 
     * @return 
     */
    private _onInput(e?: JQueryEventObject): any {

        // Keystrokes will be handled by keydown/keyup. Handle this special case
        // where input is changing with no keypress. This can happen in webkit browsers
        // if you trigger the Undo action (from the menu or press ctrl-Z with focus outside this field)
        if (!this._keyDownInDocument) {
            if (this._options.fireOnEveryChange === true) {
                this.checkModified();
            }
        }
    }

    /**
     * @param e 
     */
    private _onToolbarButtonClick(e?: JQueryEventObject, args?) {

        log(verbose, "(richeditor) toolbar click" + this._window.document.readyState);

        // We need to set this only for non-IE browsers because in IE case, window doesn't lose focus
        // when toolbar button is clicked because we made toolbar unselectable for IE
        this._explicitFocus = !Utils_UI.BrowserCheckUtils.isMsie() && this._hasFocus;
        this._executeCommand(args);

        // need to check this._disposed because some commands will end up disposing this control
        if (!this._disposed && this._options.fireOnEveryChange === true) {
            this.checkModified();
        }
    }

    private _getNodeUnderCaret(tagName) {
        let node;
        let resultNode = null;
        const range = this._getTextRange();

        if (range) {
            if (range.parentElement) {
                node = range.parentElement();
            }
            else if (range.commonAncestorContainer) {
                node = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentNode : range.commonAncestorContainer;
            }

            if (node) {
                resultNode = this._getNodeAncestor(node, tagName);
            }
        }
        return resultNode;
    }

    /**
     * Finds the node in the ancestors with the specified tag name
     */
    private _getNodeAncestor(node, tagName) {

        // Tag names will always be in caps.
        tagName = tagName.toUpperCase();

        // Walk up the DOM until we find the node with the provided tag name
        while (node && node.tagName !== "BODY") {
            if (node.tagName === tagName) {
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    /**
     *  Gets a W3C Range or Microsoft TextRange object depending on the running browser.
     * These object types are completely incompatible, so the caller must branch
     * on platform or simply compare for equality.
     */
    private _getTextRange() {
        let range;
        let selection;

        if (this._window.getSelection) {
            // W3C Standard

            selection = this._window.getSelection();
            if (selection.getRangeAt) {
                // Most browsers
                if (selection.rangeCount > 0) {
                    return selection.getRangeAt(0);
                }

                return null;
            }
            else {
                // Safari
                range = this._window.document.createRange();
                range.setStart(selection.anchorNode, selection.anchorOffset);
                range.setEnd(selection.focusNode, selection.focusOffset);
                return range;
            }
        }
        else if ((this._window.document as any).selection) {
            // IE
            return (this._window.document as any).selection.createRange();
        }
    }

    /**
     * Checks whether clicked element is a link and launches url
     * 
     * @param e 
     */
    private _checkForHrefClick(e?: JQueryEventObject) {
        if (e) {
            // on mac, control + click is actually right click so we'll also handle command + click.
            if (this._options.externalLinkMode === RichEditorExternalLinkMode.CtrlClick
                && (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey)) {
                return;
            }

            this._launchHref(e);
        }
    }


    private _launchHref(e?: JQueryEventObject): void {
        // try getting anchor from event target
        let linkNode = this._getNodeAncestor(e.target, "A");
        if (!linkNode) {
            // try getting from caret
            linkNode = this._getNodeUnderCaret("A");
        }
        if (linkNode && linkNode.href) {
            this._processAndLaunchHref(linkNode, e);
        }
    }

    /**
     * launch the Url associated with a linkNode
     */
    private _processAndLaunchHref(linkNode?: HTMLAnchorElement, e?: JQueryEventObject) {

        const linkClickHandler = this._options.linkClickHandler;

        const launchHref = (href) => {
            if (href) {
                let handlerResult;
                if ($.isFunction(linkClickHandler)) {
                    handlerResult = linkClickHandler(e);
                }

                if (handlerResult !== false) {
                    Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_OPEN, {
                        url: href,
                        target: "_blank"
                    });
                }
            } else {
                log(verbose, "(richeditor) Unable to launch link");
            }
        };

        if (linkNode) {
            Utils_Url.getTranslatorService().beginTranslateUrl(linkNode.href, this._options, launchHref, (error) => {
                launchHref(null);
            });
        } else {
            launchHref(null);
        }
    }

    private _executeCommand(commandInfo) {
        const command = commandInfo.command;
        let args = commandInfo.args || null;
        let link;
        let url;
        let lowerCaseUrl;
        let customHandler;
        const that = this;

        Telemetry.publishEvent(new Telemetry.TelemetryEventData(
            "RichEditor",
            "ToolbarButtonClick",
            {
                "command": command
            }));

        if (command === "createlink") {

            const link: HTMLAnchorElement = this._getNodeUnderCaret("a");
            const url: string = prompt(Resources_Platform.EditorEnterAddress, (link) ? link.href : "http://");

            if ((url) && (url !== "")) {
                args = url;
            }

            if (args) {
                const lowerCaseUrl = args.toLowerCase();

                // Check the url to see if it's just the scheme.
                // Chrome will convert http[s]: to a fully qualified path based on the current document + blank.htm
                // so add the // (Chrome will strip that off, but it will not add the path).
                if (lowerCaseUrl === "http:" || lowerCaseUrl === "http:/") {
                    args = "http://";
                } else if (lowerCaseUrl === "https:" || lowerCaseUrl === "https:/") {
                    args = "https://";
                }
            }

            this._explicitFocus = false;
        }
        else if (command === RichEditor.REMOVE_FORMATTING_COMMAND) {
            this._removeFormatting();
            this._explicitFocus = false;
            return;
        }

        if (!Utils_UI.BrowserCheckUtils.isMsie()) {

            // Chrome uses incorrect style tag for underline only
            // Use HTML tag for underline instead 
            // useCSS is deprecated, use styleWithCSS instead in try block to avoid errors
            const useTag = commandInfo.command === "underline";
            this._window.document.execCommand("useCSS", false, useTag); // legacy command, value is actually inversed
            try {
                this._window.document.execCommand("styleWithCSS", false, !useTag);
            }
            catch (_) {}
        }

        customHandler = this._customCommandHandlersMap[command];

        if ($.isFunction(customHandler)) {
            customHandler(commandInfo, that);
        } else {
            this._window.document.body.blur();
            this._window.document.body.focus();
            if (command === "createlink") {
                if (typeof args === "string") {
                    this._createHyperlink(args);
                }
                else {
                    // Do nothing if action is createlink but the link is not a string, Chrome has an issue inserting a 'null' link there, see bug 506442
                }
            } else {
                this._window.document.execCommand(command, false, args);
            }
        }
    }

    /**
     * Creates a hyperlink in this window and selects the new link.
     * 
     * @param args The new link address.
     */
    private _createHyperlink(args: string) {
        let text = null;
        const range = this._getTextRange();

        // extract the selected text if there is any, and clear
        // the range of text so that we can replace it with a link
        if (range.endOffset - range.startOffset !== 0) {
            text = range.toString();
            range.deleteContents();
        }

        // create the new link node and insert it into the document
        const link = this._window.document.createElement('a');
        const ariaLabel = Utils_Url.isSafeProtocol(args)
            ? Resources_Platform.CtrlEnterToOpen + " "
            : "";

        // This will perform necessary encoding/decoding
        const linkUrl = Utils_Url.Uri.parse(args).absoluteUri;

        $(link).attr('href', linkUrl)
            .attr('aria-label', ariaLabel + linkUrl)
            .text(text || linkUrl);

        range.insertNode(link);

        // set the window selection to highlight the new link
        this._highlightRange(range)
    }

    private _removeFormatting() {
        const range = this._getTextRange();

        if (!range) {
            return;
        }

        const textContainer = document.createElement("span");
        textContainer.innerHTML = this.getValue();

        const content = range.extractContents();

        if (content == null) {
            return;
        }

        range.deleteContents();

        const root = document.createElement("span");
        const container = document.createElement("span");
        root.appendChild(container);
        container.appendChild(content);
        const htmlString = root.innerHTML;

        const html = Utils_Html.HtmlNormalizer.removeFormatting(htmlString);

        // we check if this a select all + remove formating option so we can completely
        // replace the html. The reason why we do this and not just replace range is because is some
        // browsers even though you select all text, the range does not include the wrappers around
        // the content and you are still left with some formating. 
        // Also while checking if this is a select all, we need to compare the text of the range to the text
        // value of the control since the range doesnt include all html so doing a html comparison will not work
        // in this case.
        if (root.textContent === textContainer.textContent) {
            const doc = this._window.document;
            if (doc.body) {
                doc.body.innerHTML = html;
            }
            this.selectText();
            this.checkModified();
        }
        else {
            const fragment = range.createContextualFragment(html);
            range.insertNode(fragment);
            this._highlightRange(range);
        }
    }

    private _highlightRange(range) {
        if ($.isFunction(this._window.getSelection)) {
            const sel = this._window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
        else if ((this._window.document as any).selection && $.isFunction(range.select)) {
            range.select();
        }
    }

    private _setEditable(value: boolean) {
        if (this._editable !== value) {
            const $body = $(this._window.document.body);
            this._editable = value;
            if (value) {
                this._window.document.body.contentEditable = "true";
                $body.attr("role", "textbox")
                    .attr("aria-multiline", "true");

                this._attachEvents();

                this.getElement().find(".richeditor-toolbar-button").removeAttr("disabled");
                this.getElement().find(".richeditor-toolbar").removeAttr("disabled");
            }
            else {
                this._window.document.body.contentEditable = "false";
                this._detachEvents();
                this.getElement().find(".richeditor-toolbar").attr("disabled", "disabled");
                this.getElement().find(".richeditor-toolbar-button").attr("disabled", "disabled");
            }
            if (this._options.ariaLabel) {
                $body.attr("aria-label", this._options.ariaLabel);
            }
        }
    }

    private _processReadyList() {
        const self = this;
        if (this._readyList) {
            $.each(this._readyList, function () {
                if ($.isFunction(this)) {
                    this.call(self);
                }
            });

            delete this._readyList;
        }
    }

    private _ensureControlReadiness() {
        if (!this._isReady) {
            throw new Error(Resources_Platform.RichEditorControlNotReadyWarning);
        }
    }

    private _normalizeValue(value) {
        return this.isEmpty(value) ? "" : value;
    }
}

Controls.Enhancement.registerJQueryWidget(RichEditor, "richEditor");
