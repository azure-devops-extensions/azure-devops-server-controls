import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import TFS_FilteredListControl = require("Presentation/Scripts/TFS/FeatureRef/FilteredListControl");
import PopupContent = require("VSS/Controls/PopupContent");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");

var domElem = Utils_UI.domElem;
var delegate = Utils_Core.delegate;

export interface IFilteredListDropdownMenuOptions {
    /**
     * This callback is used to render the html content of the selected item in the textbox
     */
    getSelectedItemContent?: (selectedItem: any) => JQuery;

    /**
     * An optional "aria-labelledby" id to prepend to the item icon and text ids for this control.
     */
    ariaLabelledBy?: string;

    /**
     * An optional "aria-describedby" text for this control.  If specified, a hidden div will be created to contain it.
     */
    ariaDescribedByText?: string;

    /**
    * If true, this ensures that the popup does not extend below the window, particularly with 200% zoom for accessibility.
    */
    setMaxHeightToFitWindow?: boolean;

    /**
     * If true, this ensures that the popup matches the width of the menu that owns it. Defaults to false.
     */
    setPopupWidthToMatchMenu?: boolean;
}

export class ListDropdownMenu extends Controls.BaseControl {
}

export class FilteredListDropdownMenu extends ListDropdownMenu {

    private _$icon: JQuery;
    private _$label: JQuery;
    private _filteredList: TFS_FilteredListControl.FilteredListControl;
    private _selectedItem: any;
    private _popupEnhancement: PopupContent.PopupContentControl;
    private _documentEventDelegate: IArgsFunctionR<any>;  //to hide popup on focus lost using tab click

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "filtered-list-dropdown-menu",
            chevronClass: "bowtie-chevron-down-light",
        }, options));
    }

    public initialize() {
        super.initialize();

        const id = this.getId();
        const idIcon = id + "icon";
        const idLabel = id + "label";
        this._$icon = $(domElem("span", "icon"))
            .attr("id", idIcon)
            .appendTo(this._element);
        this._$label = $(domElem("span", "selected-item-text"))
            .attr("id", idLabel)
            .appendTo(this._element);
        $(domElem("span", "drop-icon bowtie-icon " + this._options.chevronClass))
            .appendTo(this._element);

        this._popupEnhancement = <PopupContent.PopupContentControl>Controls.Enhancement.enhance(PopupContent.PopupContentControl, this._element, $.extend({
            cssClass: "filtered-list-popup",
            content: () => {
                var $container = $(domElem("div"));
                this._filteredList = this._createFilteredList($container);
                if (this._selectedItem) {
                    this._filteredList.setSelectedItem(this._selectedItem);
                }
                $container.bind("selected-item-changed", Utils_Core.delegate(this, this.onItemSelected));
                $container.bind("escape-key-pressed", () => {
                    this._hidePopup();
                    Utils_UI.tryFocus(this._element);
                });

                // Add hidden div to contain screen reader aria-describedby text.
                const id = String(Controls.getId());
                $(domElem("div"))
                    .attr("id", id)
                    .hide()
                    .text(this._filteredList.getAriaDescription())
                    .appendTo($container);
                this._popupEnhancement.getElement().attr("aria-describedby", id);
                return $container;
            },
            menuContainer: this._element.parent()
        }, this._options.popupOptions));

        this._documentEventDelegate = delegate(this, this._handleFocusChanged);

        this._popupEnhancement._element.bind("popup-opened", () => {
            this._setPopupDimensions(this._popupEnhancement._element);
            this._element.addClass("menu-opened");
            this._filteredList.setFocus();
            this._setAriaExpanded(true);

            // Ensure the popup is still displayed (visible) after switching tabs (Favorites - All). No repro if no tabs.
            // Hidding the previous tab in IE moved focus outside, triggering an incomplete hide of the popup.
            // This is a hack for IE11 intended for the short expected life remaining of this legacy control.
            this._showPopup();

            $(document).bind("focusin", this._documentEventDelegate);
        });

        this._popupEnhancement._element.bind("popup-closed", () => {
            this._element.removeClass("menu-opened");
            this._filteredList.clearInput();
            this._setAriaExpanded(false);
            $(document).unbind("focusin", this._documentEventDelegate);
        });

        // ARIA aria-labelledby and aria-describedby attributes
        this._setAriaExpanded(false);
        const ariaLabelledBy = (this._options.ariaLabelledBy || "") + " " + idIcon + " " + idLabel
        this._element.attr("aria-labelledby", ariaLabelledBy);

        // Add hidden div to contain screen reader aria-describedby text.
        if ((<IFilteredListDropdownMenuOptions>this._options).ariaDescribedByText) {
            const idDescribe = id + "describe";
            this._element.attr("aria-describedby", idDescribe);
            $(domElem("div", "visually-hidden"))
                .attr("id", idDescribe)
                .text((<IFilteredListDropdownMenuOptions>this._options).ariaDescribedByText)
                .appendTo(this._element);
        }

        // When used for hosting the FilteredListControl, the popup is not an ARIA tooltip.
        this._popupEnhancement.getElement().find(".popup-content-container[role='tooltip']").removeAttr("role");
        this._popupEnhancement.getElement().find(".popup-content-container[aria-hidden='true']").removeAttr("aria-hidden");

        // Make this element focusable to listen for keyboard events
        this._element
            .attr("tabIndex", "0")
            .bind("keydown", (e) => {

                switch (e.keyCode) {
                    case Utils_UI.KeyCode.DOWN:
                        this._showPopup();
                        return false;
                    case Utils_UI.KeyCode.UP:
                    case Utils_UI.KeyCode.ESCAPE:
                        this._hidePopup();
                        return false;
                    case Utils_UI.KeyCode.ENTER:
                    case Utils_UI.KeyCode.SPACE:
                        this._showPopup();
                        return false;
                }

            });

        this.setSelectedItem(this._options.initialSelectedItem);
    }

    private _handleFocusChanged(e: JQueryEventObject): void {
        var $target = $(e.target);
        if (!this.isDisposed() &&
            !(this._popupEnhancement._element.has(<any>e.target).length > 0 || this._popupEnhancement._element[0] === e.target) &&
            !(this._element.has(<any>e.target).length > 0 || this._element[0] === e.target)
        ) {
            this._hidePopup();
        }
        return;
    }

    public setSelectedItem(item: any) {

        if (this.isDisposed()) {
            return;
        }
        
        var iconClass: string;

        this._selectedItem = item;

        this._$icon.removeClass();
        this._$icon.addClass("icon");

        iconClass = this._getItemIconClass(item);
        if (iconClass) {
            this._$icon.addClass(iconClass);
            this._$icon.removeClass("hidden");
        }
        else {
            this._$icon.addClass("hidden");
        }

        this._$icon.removeAttr("aria-label");
        const iconAriaLabel = this._getItemIconAriaLabel(item);
        if (iconAriaLabel) {
            this._$icon.attr("aria-label", iconAriaLabel);
        }

        if (this._options.getSelectedItemContent) {
            this._$label.empty();
            this._$label.append(this._options.getSelectedItemContent(item));
        }
        else {
            this._$label.text(this._getItemDisplayText(item));
        }

        this._element.attr("title", this._getItemTooltip(item));

        if (this._filteredList) {
            this._filteredList.setSelectedItem(item);
        }
    }

    public _getPopupEnhancement() {
        return this._popupEnhancement;
    }

    public _hidePopup() {
        this._popupEnhancement.hide();
    }

    public _showPopup() {
        this._popupEnhancement.show();
    }

    private _setAriaExpanded(expanded: boolean) {
        this._element.attr("aria-expanded", String(expanded));
    }

    public getFilteredList() {
        return this._filteredList;
    }

    public _createFilteredList($container: JQuery): TFS_FilteredListControl.FilteredListControl {
        return <TFS_FilteredListControl.FilteredListControl>Controls.Enhancement.enhance(this._options.filteredListType, $container, this._options.filteredListOptions || {});
    }

    public _getItemIconClass(item: any): string {
        return "";
    }

    protected _getItemIconAriaLabel(item: any): string {
        return "";
    }

    public _getItemDisplayText(item: any): string {
        return item ? item.toString() : "";
    }

    public _getItemTooltip(item: any): string {
        return this._getItemDisplayText(item);
    }

    public _getSelectedItem(): any {
        return this._selectedItem;
    }

    private onItemSelected(e?: any, args?: any) {

        this.setSelectedItem(args.selectedItem);
        this._hidePopup();
        Utils_UI.tryFocus(this._element);

        if ($.isFunction(this._options.onItemChanged)) {
            this._options.onItemChanged.call(this, this._selectedItem);
        }
    }

    private _setPopupDimensions($popupElement: JQuery) {
        if ($popupElement && $popupElement.length) {
            const { setMaxHeightToFitWindow, setPopupWidthToMatchMenu } = this._options as IFilteredListDropdownMenuOptions;

            let inlineStyle: any = {};
            let adjustStyle: boolean = false;

            if (!!setMaxHeightToFitWindow) {
                const popupTop = $popupElement[0].getBoundingClientRect().top;
                const windowHeight = window.innerHeight;

                // the popup may have been shifted up, with a valid top of 0, so sanity check specifically for undefined
                if (popupTop !== undefined && windowHeight) {
                    $.extend(inlineStyle, {
                        "overflow-y": "auto",
                        "max-height": windowHeight - popupTop,
                    });
                    adjustStyle = true;
                }
            }

            if (!!setPopupWidthToMatchMenu) {
                $.extend(inlineStyle, {
                    "width": this.getElement().outerWidth()
                });
                adjustStyle = true;
            }

            if (adjustStyle) {
                $popupElement.css(inlineStyle);
            }
        }
    }
}

VSS.classExtend(FilteredListDropdownMenu, TFS_Host_TfsContext.TfsContext.ControlExtensions);
