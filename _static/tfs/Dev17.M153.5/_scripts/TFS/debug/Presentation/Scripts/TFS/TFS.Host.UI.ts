/// <reference types="jquery" />

import MultiEntitySearch = require("Presentation/Scripts/TFS/TFS.Host.MultiEntitySearch");
import TFS_Resources_Presentation = require("Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Menus = require("VSS/Controls/Menus");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import VSS = require("VSS/VSS");
import TFS_NotificationEventNames = require("Presentation/Scripts/TFS/TFS.NotificationEventNames");
import Service = require("VSS/Service");
import Events_Action = require("VSS/Events/Action");
import Events_Document = require("VSS/Events/Document");
import Events_Services = require("VSS/Events/Services");
import TFS_WebSettingsService = require("Presentation/Scripts/TFS/TFS.WebSettingsService");
import Utils_UI = require("VSS/Utils/UI");
import Utils_Core = require("VSS/Utils/Core");

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;

export class SearchBox extends Controls.BaseControl {
    public static SET_ERROR_EVENT = "SetInputErrorTip";

    private _searchAdapter: SearchAdapter;
    private _$inputLabel: JQuery;
    private _input: JQuery;
    private _lastInputText: string;
    private _popup: any;
    private _$dropIcon: JQuery;
    private _collection: any;
    private _$popupElement: any;
    private _menuHelpItems: any;
    private _$inlineErrorContainer: JQuery;
    private _$clearTextIcon: JQuery;

    public initialize() {
        this._lastInputText = "";
        this._element.addClass("noDrop");

        this._$inputLabel = $(domElem("label", "searchbox-label hidden"))
            .attr("for", "searchbox")
            .appendTo(this._element);

        this._input = $(domElem("input", "search-text"))
            .attr("type", "text")
            .attr("id", "searchbox")    
            .attr("disabled", "disabled")
            .focus(function () { $(this).parent().addClass("input-focus"); })
            .blur(function () { $(this).parent().removeClass("input-focus"); })
            .keyup(delegate(this, this.onKeyUp))
            .appendTo(this._element);

        this._$inlineErrorContainer = $(domElem("div", "input-error-tip"))
            .text("")
            .attr("aria-live", "assertive")
            .hide()
            .appendTo(this._element);

        this._$clearTextIcon = $(domElem("span", "bowtie-icon bowtie-edit-remove"))
            .attr("title", TFS_Resources_Presentation.ClearTextTooltip)
            .appendTo(this._element)
            .click(delegate(this, this._clearSearchBox));

        $(domElem("span", "bowtie-icon bowtie-search"))
            .appendTo(this._element)
            .click(delegate(this, this.doSearch));

        this._$dropIcon = $(domElem("span", "icon icon-drop"))
            .appendTo(this._element)
            .click(delegate(this, this.showDropdownMenu));

        this._$popupElement = $(domElem("div", "search-popup"))
            .appendTo(this._element);

        // This is required because we want to set error from a search adapter
        this._element.on(SearchBox.SET_ERROR_EVENT, (event: JQueryEventObject, errorMessage: string, searchText: string) => {
            this.setErrorMessage(errorMessage, searchText);
            event.stopPropagation();
        });

        super.initialize();
        Diag.logTracePoint("SearchBox.ctor.complete");
    }

    public setAdapter(adapter: SearchAdapter) {

        var watermarkText: string;

        this._searchAdapter = adapter;

        watermarkText = adapter.getWatermarkText();
        Utils_UI.Watermark(this._input, { watermarkText: watermarkText });
        this._$inputLabel.text(watermarkText);
        this._input.attr("title", adapter.getTooltip());
        this._input.attr("aria-label", this._searchAdapter.getAriaLabel());
        // Enable input now that it is ready
        this._input.removeAttr("disabled");

        // Reset the dropdown menu
        this._element.toggleClass("noDrop", !adapter.hasDropdown());
        this.resetDropdownMenu();
    }

    public getAdapter(): SearchAdapter {
        return this._searchAdapter;
    }

    /**
     * This method sets the inline error message
     * @param {string} error The error to be displayed.
     * @param {string} correspondingSearchText Error message is corresponding to this search text. It is required because performSearch is async and meanwhile a user can change the inupt.
     */
    public setErrorMessage(error: string, correspondingSearchText?: string) {
        if (!error) {
            return;
        }

        if (!correspondingSearchText || correspondingSearchText === $.trim(this._input.val())) {
            this._$inlineErrorContainer.text(error);
            this._$inlineErrorContainer.show();
            this._input.addClass("invalid");
        }
    }

    public clearErrorMessage() {
        this._$inlineErrorContainer.hide();
        this._input.removeClass("invalid");
    }

    private resetDropdownMenu() {
        this._$popupElement.empty();
        this._popup = null;
    }

    private onKeyUp(e?) {
        this._updateClearTextIcon();

        // Error message is cleared as soon as the input changes
        if (this._input.val() !== this._lastInputText) {
            this.clearErrorMessage();
            this._lastInputText = this._input.val();
        }

        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this.doSearch(e);
            return false;
        }
        else if (e.keyCode === Utils_UI.KeyCode.DOWN || e.keyCode === Utils_UI.KeyCode.PAGE_DOWN) {
            this.showDropdownMenu();
            return false;
        }
    }

    private doSearch(e: JQueryEventObject) {
        var searchText = $.trim(this._input.val());
        if (searchText && this._searchAdapter) {
            this._searchAdapter.performSearch(searchText, SearchBoxHelper.openInNewTab(e));
            this.resetDropdownMenu();
        }
    }

    private _updateClearTextIcon(e?): void {
        this._$clearTextIcon.toggle(!!this._input.val());
    }

    private _clearSearchBox(e?): void {
        this._input.val("");
        this.clearErrorMessage();
        this._updateClearTextIcon();
    }

    public showDropdownMenu() {

        if (this._searchAdapter && this._searchAdapter.hasDropdown()) {

            // Recent searches are stored in user registry. Fetch them from server
            // either on first create, or when collection changes.
            if (!this._popup) {
                // First display just search filter helpers while fetching recent searches from server
                this._popup = <Menus.PopupMenu>Controls.BaseControl.createIn(Menus.PopupMenu, this._$popupElement, {
                    align: "right-bottom",
                    items: [{ childItems: this._searchAdapter.getDropdownMenuItems }],
                    executeAction: delegate(this, this._onMenuItemClick)
                });
            }

            this._popup.popup(this._input, this._element);
        }
    }

    private _onMenuItemClick(e?) {
        if (e.get_commandName() === "search-shortcut") {
            // Search shortcuts are added to the textbox
            this._appendShortcut(e.get_commandArgument());
            return false;
        }
        else {
            // MRU search terms replace the text in the texbox and triggers search
            this._input.val(e.get_commandArgument().search);
            this.doSearch(e);
            return false;
        }
    }

    private _appendShortcut(shortcut: any) {
        /// <summary>Appends the short to the search textbox by making the default value selected</summary>
        /// <param name="shortcut" type="Object">Shortcut item to append</param>

        var value,
            defaultValueEnd,
            defaultValueStart;

        value = this._input.val();
        value += value.length > 0 ? " " : "";       // adding a space before shortcut
        value += shortcut.search || "";             // adding shortcut (a, c, s or t)
        value += shortcut.operator || ":";          // adding operator
        value += "\"";                              // starting double quote
        defaultValueStart = value.length;
        value += shortcut.defaultValue || "";       // adding default value
        defaultValueEnd = value.length;
        value += "\"";                              // closing the double quote

        this._input.val(value);

        // Making the default value selected
        this._selectDefaultValue(defaultValueStart, defaultValueEnd);
    }

    private _selectDefaultValue(start: number, end: number) {
        /// <summary>Makes the specified range for the search textbox selected</summary>
        /// <param name="start" type="Integer">Start index</param>
        /// <param name="end" type="Integer">End index</param>
        var range,
            inp = <any>this._input[0];

        if (inp.setSelectionRange) {
            inp.setSelectionRange(start, end);
        }
        else if (inp.createTextRange) { // Necessary for IE8
            range = inp.createTextRange();
            range.move("character", start);
            range.moveEnd("character", end - start);
            range.select();
        }
    }
}

Controls.Enhancement.registerEnhancement(SearchBox, ".search-box");


export interface SearchAdapterOptions {
    tfsContext?: any;
    ariaLabelSearchBox?: string;
}

/**
* Implemented by various alm search related search drop downs to be plugged in with
* the main search box on search page.
*/
export interface ISearchBoxDropdownControl {
    getPopup(): JQuery;
    bind(_$searchBox: JQuery, isLargeSearchBox): void;
    unbind(_$searchBox): void;
}

export class SearchAdapter extends Controls.Enhancement<SearchAdapterOptions> {
    constructor(options?) {
        super(options);
    }

    private _$searchBoxElement: JQuery;

    public _enhance(element: JQuery) {
        var searchBox = <SearchBox>Controls.Enhancement.ensureEnhancement(SearchBox, element);
        if (searchBox) {
            searchBox.setAdapter(this);
            this._$searchBoxElement = searchBox.getElement();
        }
    }

    public hasDropdown(): boolean {
        return false;
    }

    public getAriaLabel(): string {
        return this._options.ariaLabelSearchBox;
    }

    public getDropdownMenuItems(contextInfo, callback, errorCallback) {
        callback([]);
    }

    public getHelpDropdown(callback: any): void {
    }

    public getWatermarkText(): string {
        return "";
    }

    public getTooltip(): string {
        return this.getWatermarkText();
    }

    public performSearch(searchText: string, openInNewTab?: boolean) {
        Diag.Debug.fail("SearchAdapter must override performSearch.");
    }

    public setErrorMessage(error: string, correspondingSearchText: string) {
        if (this._$searchBoxElement && this._$searchBoxElement.length > 0) {
            this._$searchBoxElement.trigger(SearchBox.SET_ERROR_EVENT, [error, correspondingSearchText]);
        }
    }
}

/**
* Interface that defines a new adapter for entity selectable search box control
*/
export class MultiEntitySearchAdapter extends MultiEntitySearch.MultiEntitySearchAdapter {
}

export class SearchBoxHelper {
    /**
     * Checks whether user clicked or entered with Ctrl key pressed in an input control
     * @param e User action event in an input control
     */
    public static openInNewTab(e: JQueryEventObject): boolean {
        return MultiEntitySearch.SearchBoxHelper.openInNewTab(e);
    }
}

Diag.logTracePoint("Host.Navigation.initialization-complete");

$(window).bind("resize.tfs.event.subscription", function (e) {
    if (<any>e.target === window) {
        // We should fire this event only if the target is window
        Events_Services.getService().fire("window-resize");
    }
});

/**
 * Handle dismissal of a notification
 *
 * @param id An identifier for a message
 */
Events_Services.getService().attachEvent(TFS_NotificationEventNames.EventNames.NotificationDismissed, function (id: string, scope: TFS_WebSettingsService.WebSettingsScope = TFS_WebSettingsService.WebSettingsScope.User) {
    Diag.Debug.assertParamIsStringNotEmpty(id, "id");

    function ignoreResult() { }

    Service.getCollectionService<TFS_WebSettingsService.WebSettingsService>(TFS_WebSettingsService.WebSettingsService).beginWriteSetting(
        TFS_Server_WebAccess_Constants.Messages.DismissNotificationRegistryPath + id,
        true,
        scope,
        ignoreResult,
        ignoreResult
    );
});

/**
 * Handle dismissal of a notification
 *
 * @param id An identifier for a message
 */
Events_Services.getService().attachEvent(TFS_NotificationEventNames.EventNames.ClientNotificationDismissed, function (id: string, scope: TFS_WebSettingsService.WebSettingsScope = TFS_WebSettingsService.WebSettingsScope.User) {
    Diag.Debug.assertParamIsStringNotEmpty(id, "id");

    Service.getApplicationService(TFS_WebSettingsService.WebSettingsService)
        .writeLocalSetting(TFS_Server_WebAccess_Constants.Messages.DismissNotificationRegistryPath + id, "true", scope, false);
});

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.Host.UI", exports);
