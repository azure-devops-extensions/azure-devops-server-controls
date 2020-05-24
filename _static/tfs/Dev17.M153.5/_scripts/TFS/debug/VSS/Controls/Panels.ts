/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Ajax = require("VSS/Ajax");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

const domElem = Utils_UI.domElem;
const getErrorMessage = VSS.getErrorMessage;

export interface ICollapsiblePanelOptions extends Controls.EnhancementOptions {
    collapsed?: boolean;
    headerText?: string;
    headerContent?: string | JQuery;
    /**
     * A positive number to set the aria-level of the header to. Default is 2. Negative values will
     * cause the role="heading" attribute to be omitted. Does not work with headerContent or
     * appendHeader(), in these cases users will have to place role="heading" in their HTML content
     * as appropriate.
     */
    headingLevel?: number;
    expandCss?: string;
    headerCss?: string;
    contentCss?: string;
    hoverCss?: string;
    iconCss?: string;
    collapseCss?: string;
    iconCollapseCss?: string;
    iconExpandCss?: string;
    onToggleCallback?: Function;
    customToggleIcon?: JQuery;
    /**
     * Set headerNotFocusable to true if you need multiple focusable element in headers,
     * screen reader does not work well with nested focusable element.
     */
    headerNotFocusable?: boolean;
}

export class CollapsiblePanel extends Controls.Control<ICollapsiblePanelOptions> {

    public static EVENT_CONTENT_EXPANDED = "collapsible-panel-expanded";
    public static EVENT_CONTENT_COLLAPSED = "collapsible-panel-collapsed";

    public static enhancementTypeName: string = "tfs.collapsiblepanel";

    private static _defaultToggleIconOverrideClass = "custom-toggle-icon";

    private _dynamicContents: (string | Function | JQuery)[];
    private _header: JQuery;
    private _content: JQuery;
    private _$toggleIcon: JQuery;
    private _isDisabled: boolean;

    /**
     * @param options
     */
    public initializeOptions(options?: ICollapsiblePanelOptions): void {

        super.initializeOptions($.extend(<ICollapsiblePanelOptions>{
            collapsed: true,
            iconCss: "icon",
            iconCollapseCss: "bowtie-icon bowtie-toggle-tree-collapsed",
            iconExpandCss: "bowtie-icon bowtie-toggle-tree-expanded"
        }, options));
    }

    private _swapDefaultToggleIconForCustom($customToggleIcon: JQuery): void {
        this._$toggleIcon.remove();
        this._$toggleIcon = $customToggleIcon;
        this._header.addClass(CollapsiblePanel._defaultToggleIconOverrideClass);
    }

    private _createControl(): JQuery {
        var options: ICollapsiblePanelOptions = this._options;
        this._isDisabled = false;

        if (options.hoverCss) {
            this.getElement().hover(function (): void {
                $(this).addClass(options.hoverCss);
            },
                function (): void {
                    $(this).removeClass(options.hoverCss);
                });
        }

        this._header = $(domElem("div", "tfs-collapsible-header"));

        if (this._options.headerNotFocusable) {
            this._header.attr("role", "presentation");
        } else {
            this._header.attr({
                tabIndex: "0",
                role: "button",
                "aria-expanded": String(this.isExpanded())
            });
        }

        if (options.headerCss) {
            this._header.addClass(options.headerCss);
        }

        this._header.bind("click.CollapsiblePanel", () => {
            return this.toggleExpandedState();
        });

        this._header.bind("keydown", (e) => {
            if (e.target === e.currentTarget
                && (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE)
                && !Utils_UI.KeyUtils.isModifierKey(e)) {
                return this.toggleExpandedState();
            }
        });

        this._header.bind("mouseenter focus", (e) => {
            e.preventDefault();
            this._header.addClass("focus");
            return false;
        });

        this._header.bind("mouseleave blur", (e) => {
            e.preventDefault();
            this._header.removeClass("focus");
            return false;
        });

        this._$toggleIcon = $(domElem("span", "tfs-collapsible-collapse"))
            .attr("aria-hidden", "true")
            .addClass(options.iconCss)
            .addClass(options.collapsed ? options.iconCollapseCss : options.iconExpandCss);

        if (options.collapseCss) {
            this._$toggleIcon.addClass(options.collapseCss);
        }

        this._header.append(this._$toggleIcon);

        this.getElement().append(this._header);

        this._content = $(domElem("div", "tfs-collapsible-content"));
        if (options.contentCss) {
            this._content.addClass(options.contentCss);
        }

        if (options.collapsed) {
            this._content.hide();
        }

        this.getElement().append(this._content);

        return this.getElement();
    }

    public _createIn(container: JQuery): void {
        super._createIn(container);
        this._createControl();
    }

    /**
     * @param element
     */
    public _enhance(element: JQuery): void {
        this._options.collapsed = element.hasClass("collapsed");

        this._createElement();
        this._createControl();

        element.after(this.getElement());
        this.appendContent(element);

        if (this._options.headerText) {
            this.appendHeaderText(this._options.headerText);
        } else if (this._options.headerContent) {
            this.appendHeader(this._options.headerContent);

            if (this._options.customToggleIcon) {
                this._swapDefaultToggleIconForCustom(this._options.customToggleIcon);
            }
        } else {
            var title: string = element.attr("title");

            if (title) {
                if (element.hasClass("header")) {
                    element.removeClass("header");
                    this._header.addClass("header");
                }

                this.appendHeader(title);
            }
        }
    }

    /**
     * Appends the specified plain text to the header section of the CollapsiblePanel
     *
     * @param header Content to append to the header section
     * @return
     */
    public replaceHeaderTextIfPresent(headerText: string): JQuery {
        return $("span.tfs-collapsible-text", this._header).text(headerText);
    }

    /**
     * Appends the specified plain text to the header section of the CollapsiblePanel
     *
     * @param headerText Content to append to the header section
     * @return
     */
    public appendHeaderText(headerText: string): CollapsiblePanel {
        this._header.attr("title", headerText);
        const elem: JQuery = $("<span/>").text(headerText).addClass("tfs-collapsible-text");
        if (this._options.headingLevel === undefined || this._options.headingLevel > 0) {
            elem.attr({
                role: "heading",
                "aria-level": this._options.headingLevel ? String(this._options.headingLevel) : "2"
            });
        }
        return this.appendHeader(elem);
    }

    /**
     * Appends the specified HTML, DOM element or jQuery object to the
     * header section of the CollapsiblePanel
     *
     * @param element Content to append to the header section (JQuery object or HTML string)
     * @return
     */
    public appendHeader(element: string | JQuery): CollapsiblePanel {
        this._header.append(element);
        return this;
    }

    /**
     * Prepends the specified HTML, DOM element or jQuery object to the
     * header section of the CollapsiblePanel
     *
     * @param element Content to prepend to the header section (JQuery object or HTML string)
     * @return
     */
    public prependHeader(element: string | JQuery): CollapsiblePanel {
        this._header.prepend(element);
        return this;
    }

    /**
     * Appends the specified content to the display content of the control
     *
     * @param content This might be a jQuery selector or function.
     * If a function is provided, that function will be executed whenever collapse icon is clicked.
     * The function should return a content
     * @return
     */
    public appendContent(element: string | JQuery | Function): CollapsiblePanel {
        let options: ICollapsiblePanelOptions = this._options;
        let content: string | Function | JQuery;

        if ($.isFunction(element)) {
            if (options.collapsed) {
                // if the specified content is a function, we'll add it to the internal
                // list to be executed later when the collapse icn is clicked
                if (!this._dynamicContents) {
                    this._dynamicContents = [];
                }

                this._dynamicContents.push(element);
            } else {
                content = (<Function>element).call(this);
            }
        } else {
            content = element;
        }

        if (content && typeof content !== "function") {
            this._content.append(content);
            this.getElement().removeClass("collapsed");
        }

        return this;
    }

    public isExpanded(): boolean {
        return this._options.collapsed ? false : true;
    }

    public expand(): void {
        if (!this.isExpanded()) {
            this.toggleExpandedState();
        }
    }

    public collapse(): void {
        if (this.isExpanded()) {
            this.toggleExpandedState();
        }
    }

    public toggleExpandedState(): boolean {

        const options: ICollapsiblePanelOptions = this._options;
        const $content: JQuery = this._content;
        const contents: (string | Function | JQuery)[] = this._dynamicContents;

        if (this._isDisabled) {
            return false;
        }

        // changing the state of the control
        options.collapsed = !options.collapsed;

        // changing the icon of the control
        const $icon: JQuery = this._$toggleIcon;
        $icon.removeClass(options.iconCollapseCss + " " + options.iconExpandCss);
        $icon.addClass(options.collapsed ? options.iconCollapseCss : options.iconExpandCss);

        if (!this._options.headerNotFocusable) {
            this._header.attr("aria-expanded", String(!options.collapsed));
        }

        // working on the content
        if (options.collapsed) {
            // hiding the content
            $content.hide();

            if (options.expandCss) {
                this.getElement().removeClass(options.expandCss);
            }

            this._fire(CollapsiblePanel.EVENT_CONTENT_COLLAPSED);
        } else {
            // checking whether any dynamic content is remained to add to the content
            if (contents) {
                for (const contentFunc of contents) {
                    if (typeof contentFunc === "function") {
                        // running the function and adding the returning content to the
                        // display content of the control
                        $content.append(contentFunc.apply(undefined));
                    }
                }
                // resetting inner content list
                this._dynamicContents = null;
            }

            // showing the content
            $content.show();

            if (options.expandCss) {
                this.getElement().addClass(options.expandCss);
            }

            this._fire(CollapsiblePanel.EVENT_CONTENT_EXPANDED);
        }

        if (this._options.onToggleCallback && $.isFunction(this._options.onToggleCallback)) {
            this._options.onToggleCallback(this.isExpanded());
        }

        return false;
    }

    public setDisabled(isDisabled: boolean): void {
        if (this._isDisabled !== isDisabled) {
            if (isDisabled) {
                this._header.addClass("disabled");
                this._$toggleIcon.hide();
                this._header.removeAttr("tabindex");
            } else {
                this._header.removeClass("disabled");
                this._$toggleIcon.show();
                this._header.attr("tabindex", "0");
            }

            this._isDisabled = isDisabled;
        }
    }

    public isCollapsiblePanelDisabled(): Boolean {
        return this._isDisabled;
    }
}

Controls.Enhancement.registerJQueryWidget(CollapsiblePanel, "collapsible");
Controls.Enhancement.registerEnhancement(CollapsiblePanel, ".tfs-collapsible");

/**
 * @publicapi
 */
export interface IAjaxPanelOptions {
    /**
     * Url to load the content from.
     */
    url?: string;

    /**
     * Url request paremeters.
     */
    urlParams?: any;

    /**
     * Callback executed if the load succeeds.
     */
    success?: Function;

    /**
     * Callback executed if the load fails.
     */
    error?: Function;

    /**
     * Determines whether status indicator is displayed or not.
     * @defaultvalue true.
     */
    showStatusIndicator?: boolean;

    cache?: boolean;
    replaceContent?: boolean;
}

/**
 * @publicapi
 */
export class AjaxPanelO<TOptions extends IAjaxPanelOptions> extends Controls.Control<TOptions> {

    public static enhancementTypeName: string = "tfs.ajaxPanel";

    private _cancelable: Utils_Core.Cancelable;

    /**
     * @param options
     */
    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            cssClass: "ajax-panel",
            replaceContent: true,
            cache: true
        }, options));
    }

    public initialize(): void {
        var url: string = this._options.url;
        super.initialize();
        if (url) {
            this.beginLoad(url, this._options.urlParams, this._options.success, this._options.error);
        }
    }

    public _dispose(): void {
        this._cancelPendingLoad();
        super._dispose();
    }

    /**
     * Begins loading the content using the specified arguments.
     *
     * @param url Url to load the content from.
     * @param params Url request paremeters.
     * @param callback Callback executed if the load succeeds.
     * @param errorcallback Callback executed if the load fails.
     * @publicapi
     */
    public beginLoad(url: string, params?: any, callback?: Function, errorcallback?: Function): void {
        Diag.logTracePoint("AjaxPanel.beginLoad.start");

        this._cancelPendingLoad();

        let cancelable: any = new Utils_Core.Cancelable(this);
        this._cancelable = cancelable;

        this.getElement().empty();

        if (this._options.showStatusIndicator !== false) {
            const statusIndicator: StatusIndicator.StatusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(
                StatusIndicator.StatusIndicator, this.getElement(),
                {
                    center: true,
                    imageClass: "big-status-progress",
                    message: Resources_Platform.Loading
                }
            );

            statusIndicator.start();
        }

        this._element.attr("aria-busy", "true");

        Ajax.issueRequest(url, {
            type: "GET",
            data: params,
            dataType: "html",
            traditional: true,
            cache: this._options.cache
        })
            .then(cancelable.wrap((content) => {
                this.onLoadCompleted(content);

                if ($.isFunction(callback)) {
                    callback.call(self, content);
                }
            }), cancelable.wrap((error) => {
                let handled: boolean;
                if ($.isFunction(errorcallback)) {
                    handled = errorcallback.call(self, error) === true;
                }

                this.onLoadError(error, handled);
            }));
    }

    public onLoadCompleted(content: string): void {
        if (this.getElement() && this._options.replaceContent) {
            this.getElement().empty();
            this.getElement().html(content);

            // this makes sure that the controls existing in the html are initialized.
            Controls.Enhancement.ensureEnhancements(this.getElement());
        }

        this._element.removeAttr("aria-busy");

        Diag.logTracePoint("AjaxPanel.beginLoad.complete");
    }

    public onLoadError(error, handled: boolean): void {
        if (!handled) {
            this.showError(error);
        }

        this._element.removeAttr("aria-busy");

        Diag.logTracePoint("AjaxPanel.beginLoad.complete");
    }

    public showError(error): void {
        this.getElement().empty();
        $(domElem("div", "error")).appendTo(this.getElement()).text(getErrorMessage(error));
    }

    private _cancelPendingLoad(): void {
        if (this._cancelable) {
            this._cancelable.cancel();
            this._cancelable = null;
        }
    }
}

export class AjaxPanel extends AjaxPanelO<IAjaxPanelOptions> { }
