/// <amd-dependency path="jQueryUI/autocomplete"/>
/// <reference types="jquery" />

import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Diag = require("VSS/Diag");
import VSS_Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Utils_UI = require("VSS/Utils/UI");
import Notifications = require("VSS/Controls/Notifications");
import StatusIndicator = require("VSS/Controls/StatusIndicator");
import TFS_Server_WebAccess_Constants = require("Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants");
import Events_Services = require("VSS/Events/Services");
import TFS_OM_Identities = require("Presentation/Scripts/TFS/TFS.OM.Identities");
import Utils_Html = require("VSS/Utils/Html");
import FeatureAvailability_Services = require("VSS/FeatureAvailability/Services");
import Telemetry = require("VSS/Telemetry/Services");
import { RichContentTooltip } from "VSS/Controls/PopupContent";
import { IdentityMru, BaseIdentityProvider } from "Presentation/Scripts/TFS/TFS.OM.Identities.Mru";

var delegate = Utils_Core.delegate;
var domElem = Utils_UI.domElem;
var keyCode = Utils_UI.KeyCode;

export class MruIdentityPickerControl extends Controls.BaseControl {
    public static IDENTITY_PICKER_PAGE_SIZE = 8;
    private static DefaultUnsetIdentityImageResource = "notassigned-user.svg";

    private _identityMru: IdentityMru;
    private _searchTerm: string;
    private _prevSearchTerm: string;
    private _searchMode: IdentitySearchMode;
    private _input: JQuery;
    private _identityPickerListView: IdentityPickerListViewControl;
    private _items: TFS_OM_Identities.IIdentityReference[];
    private _searchItems: TFS_OM_Identities.IIdentityReference[];
    private _selectedItem: TFS_OM_Identities.IIdentityReference;
    private _dropdownVisible: boolean;
    private _resolvedIdentityImage: JQuery;
    private _unsetIdentityImage: JQuery;
    private _unsetIdentityImageResource: string;
    private _showUnsetImage: boolean;
    private _watermarkText: string;
    private _$wrapper: JQuery;
    private _enabled: boolean;
    private _mruRefreshedDelegate: any;
    private _listContainer: JQuery;
    private _dropButton: JQuery;
    private _identityFilter: TFS_OM_Identities.IdentityFilter;
    private _deleteItemsQueue: TFS_OM_Identities.IIdentityReference[];
    private _deletingTimeout: any;
    private _identityProvider: BaseIdentityProvider;
    private _tfsContext: TFS_Host_TfsContext.TfsContext;

    constructor(options?) {
        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            coreCssClass: "mru-identity-picker input-text-box",
            pageSize: MruIdentityPickerControl.IDENTITY_PICKER_PAGE_SIZE,
            showDrop: true,
            showSelectionAvatar: true,
            enableTfsSearch: true,
            enableAadSearch: FeatureAvailability_Services.FeatureAvailabilityService.isFeatureEnabled(TFS_Server_WebAccess_Constants.FeatureAvailabilityFlags.WorkItemTrackingAADSupport) && TFS_Host_TfsContext.TfsContext.getDefault().isAADAccount,
            identityProvider: new BaseIdentityProvider()
        }, options));
    }

    public initialize() {
        super.initialize();

        this._identityMru = this._options.identityMru;
        this._selectedItem = this._options.selectedItem;
        this._enabled = typeof this._options.enabled === "boolean" ? this._options.enabled : true;
        this._searchItems = [];
        this._identityFilter = this._options.identityFilter || TFS_OM_Identities.IdentityFilter.All;
        this._searchTerm = "";
        this._prevSearchTerm = "";
        this._searchMode = this._getDefaultSearchMode();
        this._deleteItemsQueue = [];
        this._identityProvider = this._options.identityProvider;
        this._tfsContext = this._options.tfsContext;

        var items = this._options.items || this._identityMru.getMruItems().slice(0);
        this._items = this._filterItems(items);

        this._mruRefreshedDelegate = delegate(this, this.setSource);
        this._identityMru.attachMruRefreshed(this._mruRefreshedDelegate);

        this._$wrapper = $("<div>").addClass("wrap");
        this._$wrapper.bind("click", (event) => {
            if (this._enabled && !$(event.target).hasClass("mru-identity-picker-input")) {
                this._input.focus();
            }
        });
        this._input = $("<input>").attr("type", "text")
            .addClass("mru-identity-picker-input")
            .appendTo($("<div>").addClass("text-wrapper").appendTo(this._$wrapper));

        if (this._options.id) {
            this._input.attr("id", this._options.id + "_txt");
        }

        this._showUnsetImage = this._options.showUnsetImage === true;
        this._watermarkText = this._options.watermark !== undefined && typeof this._options.watermark === "string" ?
            this._options.watermark :
            VSS_Resources_Platform.MruIdentityPickerWatermark;
        this._unsetIdentityImageResource = this._options.unsetIdentityImageResource !== undefined && typeof this._options.unsetIdentityImageResource === "string" ?
            this._options.unsetIdentityImageResource :
            MruIdentityPickerControl.DefaultUnsetIdentityImageResource;
        if (this._enabled) {
            Utils_UI.Watermark(this._input, { watermarkText: this._watermarkText });
        }

        this._input.attr("title", VSS_Resources_Platform.MruIdentityPickerTooltip);
        if (!this._enabled) {
            this.setEnabled(this._enabled);
        }

        this._input.attr("autocomplete", "off");
        this._bind(this._input, "keydown", delegate(this, this._onInputKeyDown));

        // Add focus as well as mousedown event to ensure the focus.
        // In some situations, container might intercept the mousedown event which can possibly prevent Edge/IE from setting focus.
        this._input.focus((event: JQueryEventObject) => {
            if (this._enabled) {
                this._onInputFocus();
            }
        });
        this._input.mousedown((event: JQueryEventObject) => {
            if (this._enabled && !this._input.is(":focus")) {
                this._input.focus();
            }
        });

        this._bind(this._input, "blur", delegate(this, this._onInputBlur));

        if (this._options.showDrop) {
            this._dropButton = $(domElem("div", "drop")).appendTo(this.getElement());
            this._bind(this._dropButton, "click", delegate(this, this._onDropClick));
            this._dropButton.on('mousedown', function (event) {
                event.preventDefault();
            });
            if (!this._enabled) {
                this._dropButton.hide();
            }
            else {
                this._element.addClass("drop");
            }
        }

        // Only append to underlying element at the end to minimze DOM interaction
        this._$wrapper.appendTo(this.getElement());

        this._listContainer = this._options.pickerContainer || this.getElement();
        this._identityPickerListView = <IdentityPickerListViewControl>Controls.BaseControl.createIn(IdentityPickerListViewControl, this._listContainer,
            {
                identityMru: this._identityMru,
                pageSize: this._options.pageSize,
                items: this._items,
                onItemSelect: (item: TFS_OM_Identities.IIdentityReference) => {
                    this._selectItem(item, { highlightText: true });
                },
                onItemDelete: (item: TFS_OM_Identities.IIdentityReference) => {
                    this._removeItem(item);
                },
                onTfsIdentitySearch: () => {
                    this._beginTfsIdentitySearch(this._searchTerm);
                },
                onAadIdentitySearch: () => {
                    this._beginAadIdentitySearch(this._searchTerm);
                }
            });

        if (this._selectedItem) {
            this.setValue(this._selectedItem);
        }

        this._hideDropDown();

        if (TFS_Host_TfsContext.TfsContext.getDefault().isHosted && this._options.enableAadSearch) {
            this._checkForGuestUsers();
        }


    }

    private _checkForGuestUsers() {
        var that = this;
        function successCallback(result: any) {
            that._options.enableAadSearch = !result.isGuest;
        }

        function errorCallback() {
            that._options.enableAadSearch = false;
        }

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
        var url = tfsContext.getActionUrl("IsGuestAadUser", "identity", { project: "", team: "", area: "api" });
        Ajax.getMSJSON(url, { userEmail: tfsContext.currentIdentity.email }, successCallback, errorCallback);
    }

    public dispose() {
        this._identityMru.detachMruRefreshed(this._mruRefreshedDelegate);
        super.dispose();
    }

    public getItems() {
        return this._items;
    }

    public setSource(items: TFS_OM_Identities.IIdentityReference[]) {
        // We combine the items parameter with the items already there in the control so the user doesnt have to search for someone again.
        this._items = this._filterItems(TFS_OM_Identities.IdentityHelper.union(items, this._items));
    }

    public focus() {
        this._input.focus();
    }

    public getIdentityMru(): IdentityMru {
        return this._identityMru;
    }

    /**
     * Toggle enable/disable on the control
     */
    public setEnabled(enabled: boolean) {
        if (enabled) {
            this._input.removeAttr("readonly");
            this._input.removeClass("disabled");
            this.getElement().removeClass("readonly");
            Utils_UI.Watermark(this._input, { watermarkText: this._watermarkText });
            if (this._options.showDrop) {
                this._dropButton.show();
                this._element.addClass("drop");
            }
        }
        else {
            Utils_UI.Watermark(this._input, { watermarkText: "" });
            this._input.attr("readonly", "readonly");
            this._input.addClass("disabled");
            this.getElement().addClass("readonly");
            if (this._options.showDrop) {
                this._dropButton.hide();
                this._element.addClass("drop");
            }
        }

        this._enabled = enabled;
    }

    /**
     * Gets the input element of control
     * 
     * @return 
     */
    public getInput(): JQuery {
        return this._input;
    }

    /**
     * Returns the text of input element
     * 
     * @return 
     */
    public getInputText(): string {
        return $.trim(this._input.val());
    }

    /**
     * Sets the input text and fire a search based on the input text
     */
    public setInputText(text: string, fireChange: boolean) {
        this._input.val(text);
       
        // we need to fire blur event on the input to force show the watermark when we set empty text using val() function.
        if ($.trim(text) === "") {
            this._input.trigger("blur");
        }

        this._searchTerm = text;

        this._hideDropDown();

        if (fireChange) {
            this._fireChange({ selectedItem: this._selectedItem });
        }
    }

    /**
     * Returns the selected identity
     * 
     * @return 
     */
    public getValue(): TFS_OM_Identities.IIdentityReference {
        if (this._selectedItem) {
            return this._selectedItem;
        }
        else {
            return {
                id: "",
                displayName: this.getInputText(),
                uniqueName: ""
            };
        }
    }

    /**
     * Sets the selected identity by name or identity ref object
     */
    public setValue(value: any, fireChange: boolean = true) {
        if (value) {
            if (typeof value === "string") {
                value = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(value);
            }
            if (value.id || value.uniqueName) {
                this._items = TFS_OM_Identities.IdentityHelper.union(this._items, [value]);
            }
            this._selectItem(value, { fireChange: fireChange });
        }
        else {
            this.clear();
        }
    }

    public setInvalid(value: boolean) {
        this._element.toggleClass("invalid", value);
        this._input.attr("aria-invalid", value ? "true" : "false");
    }

    /**
     * Clears the control
     */
    public clear(fireChange: boolean = true) {
        this._selectedItem = null;
        this._searchItems = [];
        this._markUnresolved();
        this.setInputText("", fireChange);
        this._input.attr("title", VSS_Resources_Platform.MruIdentityPickerTooltip);
        this._searchTerm = "";
    }

    /**
     * Does a prefix search for searchTerm in the items list and return matching items.
     */
    public getSearchResult(items: TFS_OM_Identities.IIdentityReference[], searchTerm: string): TFS_OM_Identities.IIdentityReference[] {
        if (searchTerm === "") {
            return [];
        }
        var encodedSearchTerm = $.ui.autocomplete.escapeRegex(searchTerm);

        var matcher = new RegExp("(^)" + encodedSearchTerm, "i");
        var searchResult = $.grep(items, function (item: TFS_OM_Identities.IIdentityReference, index) {
            var uniqName = item.uniqueName || "";
            if (uniqName.indexOf("\\") >= 0) {
                // if uniqueName is in format "domain\alias", we just want to search the alias part
                uniqName = uniqName.substr(uniqName.indexOf("\\") + 1);
            }
            return matcher.test(item.displayName) || matcher.test(uniqName);
        });

        return searchResult;
    }

    private _filterItems(items: TFS_OM_Identities.IIdentityReference[]): TFS_OM_Identities.IIdentityReference[] {
        switch (this._identityFilter) {
            case TFS_OM_Identities.IdentityFilter.Users:
                return $.map(items, (item: TFS_OM_Identities.IIdentityReference) => {
                    return !item.isContainer ? item : null;
                });
            case TFS_OM_Identities.IdentityFilter.Groups:
                return $.map(items, (item: TFS_OM_Identities.IIdentityReference) => {
                    return item.isContainer ? item : null;
                });
            default:
                return items;
        }
    }

    private _beginAadIdentitySearch(searchTerm: string) {
        var that = this;
        Diag.logTracePoint("IdentityPicker.AadIdentitySearchStart");

        this._prevSearchTerm = searchTerm;
        this._identityPickerListView.showLoading();

        var cidata: { [key: string]: any } = { "searchTerm": searchTerm.length };
        Telemetry.publishEvent(new Telemetry.TelemetryEventData("IdentityPicker", "AadIdentitySearch", cidata));

        var tStart = new Date();
        function successCallback(searchResult: TFS_OM_Identities.IIdentityReference[]) {
            var tEnd = new Date();

            that._searchItems = TFS_OM_Identities.IdentityHelper.union(searchResult, that._searchItems);
            that._search({ force: true, showDropDown: true, searchMode: IdentitySearchMode.None, fireChange: false });

            cidata = { "elapsedTime": tEnd.getTime() - tStart.getTime() };
            Telemetry.publishEvent(new Telemetry.TelemetryEventData("IdentityPicker", "AadIdentitySearchTime", cidata));
            Diag.logTracePoint("IdentityPicker.AadIdentitySearchEnd");
        }

        function errorCallback() {
            that._identityPickerListView.showError(VSS_Resources_Platform.AADServiceUnavailable);
            Diag.logTracePoint("IdentityPicker.AadIdentitySearchEnd");
        }

        // There is an AAD issue where it doesnt escape the ' character when it runs the sql. So we have to escape this character (double quotes for sql) from here.
        // Note. This might break if the AAD fixes this issue at their end later on. In which case we can safely remove this replace statement
        searchTerm = searchTerm.replace("'", "''");
        this._identityProvider.beginAadIdentitySearch(searchTerm, this._identityFilter, successCallback, errorCallback, this._tfsContext);
    }

    private _beginTfsIdentitySearch(searchTerm: string) {
        var that = this;
        Diag.logTracePoint("IdentityPicker.TfsIdentitySearchStart");

        this._prevSearchTerm = searchTerm;
        this._identityPickerListView.showLoading();

        var cidata: { [key: string]: any } = { "searchTerm": searchTerm.length };
        Telemetry.publishEvent(new Telemetry.TelemetryEventData("IdentityPicker", "IdentitySearch", cidata));

        var tStart = new Date();
        function successCallback(searchResult: TFS_OM_Identities.IIdentityReference[]) {
            var tEnd = new Date();

            TFS_OM_Identities.IdentityHelper.preProcessIdentities(searchResult);

            that._searchMode = that._options.enableAadSearch ? IdentitySearchMode.SearchAad : IdentitySearchMode.None;
            that._searchItems = searchResult;
            that._search({ force: true, showDropDown: true, searchMode: that._searchMode, fireChange: false });

            cidata = { "elapsedTime": tEnd.getTime() - tStart.getTime() };
            Telemetry.publishEvent(new Telemetry.TelemetryEventData("IdentityPicker", "IdentitySearchTime", cidata));
            Diag.logTracePoint("IdentityPicker.TfsIdentitySearchEnd");
        }

        function errorCallback() {
            that._identityPickerListView.showError();
            Diag.logTracePoint("IdentityPicker.TfsIdentitySearchEnd");
        }

        this._identityProvider.beginTfsIdentitySearch(searchTerm, this._identityFilter, successCallback, errorCallback, this._tfsContext);
    }

    private _hideDropDown() {
        this._dropdownVisible = false;
        this._identityPickerListView.hideElement();
        this._detachGlobalEvents();
    }

    private _showDropDown() {
        this._dropdownVisible = true;
        this._identityPickerListView.showElement();
        this._identityPickerListView.setPosition();
        this._attachGlobalEvents();
    }

    private _selectItem(item: TFS_OM_Identities.IIdentityReference, options?: any) {
        if (item) {
            var fireChange = true;
            if (options && typeof options.fireChange === "boolean") {
                fireChange = options.fireChange;
            }

            this._markUnresolved();
            this._selectedItem = item;
            this.setInputText(item.displayName, fireChange);

            this._input.attr("aria-owns", "items-container-id");
            this._input.attr("aria-autocomplete", "list");
            this._input.attr("role", "combobox");

            this._input.attr("title", TFS_OM_Identities.IdentityHelper.getFriendlyDistinctDisplayName(item));
            var imageUrl = TFS_OM_Identities.IdentityHelper.getIdentityImageUrl(item, TFS_OM_Identities.IdentityImageMode.ShowGenericImage);
            if (this._options.showSelectionAvatar && imageUrl && item.showGenericImage !== false) {
                this._resolvedIdentityImage = $("<div>").addClass("img-container loading").prependTo(this._$wrapper);
                var img = $("<img>").attr("alt", item.displayName)
                    .attr("title", TFS_OM_Identities.IdentityHelper.getFriendlyDistinctDisplayName(item))
                    .appendTo(this._resolvedIdentityImage);

                img.one("load", () => {
                    this._resolvedIdentityImage.removeClass("loading");
                });
                img.one("error", () => {
                    this._resolvedIdentityImage.removeClass("loading");
                    var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
                    img.attr("src", tfsContext.configuration.getResourcesFile('User.svg'));
                });
                img.attr("src", imageUrl);
                this._$wrapper.addClass("resolved");
            }

            if (options && options.highlightText) {
                this._input.select();
            }

            if ($.isFunction(this._options.selectionChanged)) {
                this._options.selectionChanged(item);
            }
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onInputKeyDown(e?: JQueryEventObject): any {
        var that = this;

        function searchIdentity(): boolean {
            if (that._identityPickerListView.searchMode === IdentitySearchMode.SearchAad) {
                that._beginAadIdentitySearch(that._searchTerm);
                return true;
            }
            else if (that._identityPickerListView.searchMode === IdentitySearchMode.SearchTfs) {
                that._beginTfsIdentitySearch(that._searchTerm);
                return false;
            }
        }

        if (e.ctrlKey && (e.keyCode === 89 || e.keyCode === 90)) { //CTRL + Z or CTRL + Y disable undo/redo
            return false;
        }

        switch (e.keyCode) {
            case keyCode.UP:
                if (this._dropdownVisible) {
                    let selectedPrev = this._identityPickerListView.selectPrev();
                    let selectedItem = this._identityPickerListView.getSelectedItem();
                    if (selectedItem) {
                        this._input.attr("aria-activedescendant", selectedItem.id);
                    }
                    return selectedPrev;
                }
            case keyCode.DOWN:
                if (this._dropdownVisible) {
                    let selectedNext = this._identityPickerListView.selectNext();
                    let selectedItem = this._identityPickerListView.getSelectedItem();
                    if (selectedItem) {
                        this._input.attr("aria-activedescendant", selectedItem.id);
                    }
                    return selectedNext;
                }
                else { // either Down or Alt+Down should expand the MRU list
                    this._openDropdownAndHideSelection();
                }
            case keyCode.PAGE_UP:
                if (this._dropdownVisible) {
                    return this._identityPickerListView.prevPage();
                }
            case keyCode.PAGE_DOWN:
                if (this._dropdownVisible) {
                    return this._identityPickerListView.nextPage();
                }
            case keyCode.TAB:
                if (this._dropdownVisible) {
                    var selectedItem = this._identityPickerListView.getSelectedItem();
                    if (selectedItem) {
                        Utils_Core.delay(this, 0, () => {
                            this._selectItem(selectedItem);
                        });
                    }
                    this._hideDropDown();
                }
                return true;
            case keyCode.ENTER:
                if (this._dropdownVisible) {
                    var selectedItem = this._identityPickerListView.getSelectedItem();
                    if (selectedItem) {
                        this._selectItem(selectedItem, { highlightText: true });
                    }
                    else {
                        searchIdentity();
                    }
                    return false;
                }
                return true;
            case keyCode.ESCAPE:
                if (this._selectedItem) {
                    this._selectItem(this._selectedItem);
                }
                this._hideDropDown();
                return false;
            case keyCode.DELETE:
                if (this._dropdownVisible) {
                    var selectedItem = this._identityPickerListView.getSelectedItem();
                    if (selectedItem && this._identityMru.isItemInMru(selectedItem) && this._getCaretPosition() === this._input.val().length) {
                        this._removeItem(selectedItem);
                        this._identityPickerListView.removeItem(this._identityPickerListView.getSelectedIndex());;
                        return false;
                    }
                    else {
                        Utils_Core.delay(this, 0, () => {
                            this._selectedItem = null;
                            this._markUnresolved();
                            this._search({ showDropDown: this._dropdownVisible });
                        });
                        return true;
                    }
                }
                else {
                    Utils_Core.delay(this, 0, () => {
                        this._selectedItem = null;
                        this._markUnresolved();
                        this._search({ showDropDown: true });
                    });
                }
                return true;
            case keyCode.QUESTION_MARK:
                if (this._dropdownVisible && e.ctrlKey) {
                    searchIdentity();
                }
            default:
                var prevText = this.getInputText();
                Utils_Core.delay(this, 0, () => {
                    if (prevText !== this.getInputText()) {
                        if (this._prevSearchTerm && this.getInputText().indexOf(this._prevSearchTerm) !== 0) {
                            this._prevSearchTerm = "";  // reset previous search term
                            this._searchMode = this._getDefaultSearchMode();
                        }
                        this._selectedItem = null;
                        this._markUnresolved();
                        this._search({ showDropDown: true });
                    }
                });
                return true;
        }
    }

    private _markUnresolved() {
        if (this._resolvedIdentityImage) {
            this._resolvedIdentityImage.remove();
            this._resolvedIdentityImage = null;
        }

        this._hideUnassignedIdentityImage(false);

        this._$wrapper.removeClass("resolved");
    }

    private _hideUnassignedIdentityImage(markUnresolved: boolean) {
        if (this._unsetIdentityImage) {
            this._unsetIdentityImage.remove();
            this._unsetIdentityImage = null;

            if (markUnresolved && this._$wrapper.hasClass("resolved")) {
                this._$wrapper.removeClass("resolved");
            }
        }
    }

    private _getCaretPosition() {
        var input: any = this._input[0];
        return input.selectionStart;
    }

    private _removeItem(item: TFS_OM_Identities.IIdentityReference) {
        if (item && this._identityMru.isItemInMru(item)) {
            this._deleteItemsQueue.push(item);
            if (this._deletingTimeout !== null) {
                clearTimeout(this._deletingTimeout);
                this._deletingTimeout = null;
            }

            this._deletingTimeout = setTimeout(() => {
                this._identityMru.removeItems(this._deleteItemsQueue);
                this._deleteItemsQueue = [];
            }, 500);

            this._items = TFS_OM_Identities.IdentityHelper.subtract(this._items, [item]);
            this._searchItems = TFS_OM_Identities.IdentityHelper.subtract(this._searchItems, [item]);
        }
    }

    private _openDropdownAndHideSelection() {
        this._search({ force: true, showDropDown: false, fireChange: false });
        this._markUnresolved();
        this._showDropDown();
        Utils_Core.delay(this, 0, () => {
            this._input.select();
        });
        if (this._selectedItem) {
            this._input.attr("aria-activedescendant", this._selectedItem.id);
        }
    }

    private _onDropClick(e?: JQueryEventObject): any {
        if (this._dropdownVisible) {
            this._hideDropDown();
            if (this._selectedItem) {
                this._selectItem(this._selectedItem);
            }
        }
        else {
            this._openDropdownAndHideSelection();
            // on drop click, put focus back on the input control
            this._enabled = false;
            this._input.focus();
            this._enabled = true;
        }
    }

    /**
     * @param e 
     * @return 
     */
    public _onInputFocus(e?: JQueryEventObject): any {
        this._element.addClass("focus");
        if (this.getInputText()) {
            this._openDropdownAndHideSelection();
        } else {
            this._hideUnassignedIdentityImage(true);
        }

        if ($.isFunction(this._options.onInputFocus)) {
            this._options.onInputFocus();
        }
    }

    /**
     * @param e 
     * @return 
     */
    private _onInputBlur(e?: JQueryEventObject): any {
        this._element.removeClass("focus");

        // NOTE: This is an IE bug where the blur event is fired on input text when scroll bar is clicked.
        // To fix this we would check if the mouse is over the dropdown, in which case we wont hide the dropdown and put the focus back on the input
        if ($('.identity-picker-list-view:hover', this._element).length === 0) {
            this._hideDropDown();
            if (this._selectedItem) {
                this._selectItem(this._selectedItem);
            }
            else if (this._enabled && this._showUnsetImage) {
                this._hideUnassignedIdentityImage(true);

                var imageUrl = this._tfsContext.configuration.getResourcesFile(this._unsetIdentityImageResource);
                this._unsetIdentityImage = $("<div>").addClass("img-container").prependTo(this._$wrapper);
                var img = $("<img>").attr("title", this._watermarkText).appendTo(this._unsetIdentityImage).attr("src", imageUrl);
                this._$wrapper.addClass("resolved");
            }

            if ($.isFunction(this._options.onInputBlur)) {
                this._options.onInputBlur();
            }
        }
        else {
            // we dont want to refresh the control UI when we put focus to input.
            // Setting enabled to false will prevent the control's focus handler to be called
            this._enabled = false;
            this._input.focus();

            // Let the event queue purge before setting enabled to true
            Utils_Core.delay(this, 0, () => {
                this._enabled = true;
            });
        }
    }

    private _getDefaultSearchMode(): IdentitySearchMode {
        return this._options.enableTfsSearch ? IdentitySearchMode.SearchTfs : (this._options.enableAadSearch ? IdentitySearchMode.SearchAad : IdentitySearchMode.None);
    }

    private _search(options?: any) {
        Diag.logTracePoint("IdentityPicker.SearchStarted");

        var getSearchMode = () => {
            if (!this._searchTerm) {
                return IdentitySearchMode.None;
            }
            if (options && options.searchMode) {
                return options.searchMode;
            }

            // if we are adding more characters to the last AAD search term, keep the same search mode (dont switch to TFS search mode)
            if (this._prevSearchTerm && this._searchTerm.indexOf(this._prevSearchTerm) === 0) {
                return this._searchMode;
            }
            return this._getDefaultSearchMode();
        }

        if ((options && options.force) || this._searchTerm !== this.getInputText()) {
            this._searchTerm = this.getInputText();
            var searchMode = getSearchMode();

            var filteredItems = this._items;

            if (!this._searchTerm) {
                this._searchItems = [];
            }
            else {
                var searchableItems = TFS_OM_Identities.IdentityHelper.union(this._searchItems, this._items);
                filteredItems = this.getSearchResult(searchableItems, this._searchTerm);
            }


            this._identityPickerListView.update(filteredItems, this._searchTerm, searchMode);

            if (!this._selectedItem) {
                this._input.attr("title", this._searchTerm === "" ? VSS_Resources_Platform.MruIdentityPickerTooltip : this._searchTerm);
            }
            if (options && options.showDropDown && this._searchTerm) {
                this._showDropDown();
            }
            else {
                this._hideDropDown();
            }

            var fireChange = true;
            if (options && typeof options.fireChange === "boolean") {
                fireChange = options.fireChange;
            }
            if (fireChange) {
                this._fireChange({ selectedItem: this._selectedItem });
            }

            Diag.logTracePoint("IdentityPicker.SearchEnd");
        }
    }

    public _fireChange(args?: any) {
        if ($.isFunction(this._options.change)) {
            this._options.change(args);
        }
    }

    private _attachGlobalEvents() {
        this._bind(this.getElement().parents(), "scroll", delegate(this, this._hideDropDown));
        this._bind(this.getElement().parents(), "resize", delegate(this, this._hideDropDown));
        Events_Services.getService().attachEvent("dialog-move", delegate(this, this._hideDropDown));
    }

    private _detachGlobalEvents() {
        this._unbind(this.getElement().parents(), "scroll", delegate(this, this._hideDropDown));
        this._unbind(this.getElement().parents(), "resize", delegate(this, this._hideDropDown));
        Events_Services.getService().detachEvent("dialog-move", delegate(this, this._hideDropDown));
    }
}

export enum IdentitySearchMode {
    None = 1,
    SearchTfs = 2,
    SearchAad = 3
};

class IdentityPickerListViewControl extends Controls.BaseControl {

    private static AVATAR_WIDTH = 40;
    private static TEXT_MARGIN = 25;
    private static MIN_WIDTH = 250;
    public static enhancementTypeName: string = "tfs.identityPickerListViewControl";

    private _identityMru: IdentityMru;
    private _itemsContainer: any;
    private _items: TFS_OM_Identities.IIdentityReference[];
    private _selectedIndex: number;
    private _numItemsDisplayed: number;
    private _scrollTimeout: any = null;
    private _highlightTerm: string;
    private _$itemsStatus: JQuery;
    private _itemsUIArr: JQuery[];
    public searchMode: IdentitySearchMode;

    constructor(options?) {

        super(options);
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            coreCssClass: "identity-picker-list-view",
            pageSize: 10
        }, options));
    }

    public initialize() {
        super.initialize();

        this._identityMru = this._options.identityMru;
        this._element.on('mousedown', function (event) {
            event.preventDefault();
        });

        this._element.attr("role", "menu");
        this._element.attr('aria-hidden', 'true');

        this.update(this._options.items, this._options.highlightTerm);
    }

    public setPosition() {
        var width = this._element.parent().outerWidth() - 2; //considering 1px border on both ends
        this._element.width(width < IdentityPickerListViewControl.MIN_WIDTH ? IdentityPickerListViewControl.MIN_WIDTH : width);

        Utils_UI.Positioning.position(this.getElement(), this._element.parent(), {
            elementAlign: "left-top",
            baseAlign: "left-bottom"
        });

        var topOffsetParent = this._element.parent().offset().top;
        var topOffsetList = this._element.offset().top;
        var ht = this._element.height();

        // if there is not enough space at top, reduce the height
        if (topOffsetList < topOffsetParent && topOffsetParent < ht) {
            var currentHt = this._itemsContainer.height();
            this._itemsContainer.height(currentHt - (ht - topOffsetParent));
        }
    }

    /**
     * Updates the list according to given items
     * 
     * @return 
     */
    public update(mruItems: TFS_OM_Identities.IIdentityReference[], highlightTerm: string, searchMode: IdentitySearchMode = IdentitySearchMode.SearchTfs): void {
        this._items = mruItems || [];
        this._highlightTerm = highlightTerm || "";
        this._itemsUIArr = [];
        this._selectedIndex = null;
        this.searchMode = searchMode;
        this._render();
        this.setSelectedIndex(0, false);
    }

    public getListItems(): TFS_OM_Identities.IIdentityReference[] {
        return this._items;
    }

    public showLoading() {
        var $search = $(".search", this._element).empty();
        var statusIndicator = <StatusIndicator.StatusIndicator>Controls.BaseControl.createIn(StatusIndicator.StatusIndicator, $search, { center: true, message: VSS_Resources_Platform.Loading });
        statusIndicator.start();
    }

    public showError(errorMsg?: string) {
        var $search = $(".search", this._element).empty().addClass("search-error").unbind("click").removeClass("search-tfs-noresult");

        this.searchMode = IdentitySearchMode.None;
        var errorMessage = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, $search, {
            closeable: false,
            message: {
                header: $("<span>").html(errorMsg || VSS_Resources_Platform.MruIdentityPickerError),
                type: Notifications.MessageAreaType.Warning
            },
            showIcon: true
        });
    }

    /**
     * Selects the next item on the list
     * 
     * @return 
     */
    public nextPage(): boolean {
        var index = this._selectedIndex + this._options.pageSize;
        this._loadNextPage(true);

        this.setSelectedIndex(index < this._itemsUIArr.length ? index : (this.searchMode === IdentitySearchMode.None ? this._itemsUIArr.length - 1 : -1), true, Utils_UI.Positioning.VerticalScrollBehavior.Top);
        return false;
    }

    /**
     * Selects the previous item on the list
     * 
     * @return 
     */
    public prevPage(): boolean {
        var index = this._selectedIndex - this._options.pageSize;
        this.setSelectedIndex(index >= 0 ? index : 0, true, Utils_UI.Positioning.VerticalScrollBehavior.Top);
        return false;
    }

    /**
     * Selects the next item on the list
     * 
     * @return 
     */
    public selectNext(): boolean {
        if (this._selectedIndex < this._numItemsDisplayed - 1 || this._selectedIndex === this._items.length - 1) {
            this.setSelectedIndex(this._selectedIndex + 1, true);
        }

        return false;
    }

    /**
     * Selects the previous item on the list
     * 
     * @return 
     */
    public selectPrev(): boolean {
        if (this._selectedIndex > 0) {
            this.setSelectedIndex(this._selectedIndex - 1, true, Utils_UI.Positioning.VerticalScrollBehavior.Top);
        }
        return false;
    }

    /**
     * Returns the index of the selected item on the list
     * 
     * @return 
     */
    public getSelectedIndex(): number {
        return this._selectedIndex;
    }

    /**
     * Returns the selected item in the list
     * 
     * @return 
     */
    public getSelectedItem(): TFS_OM_Identities.IIdentityReference {
        if (this._selectedIndex >= this._items.length) {
            return null;
        }
        return this._items[this._selectedIndex];
    }

    public setSelectedIndex(selectedIndex: number, scrollIntoView: boolean, position: Utils_UI.Positioning.VerticalScrollBehavior = Utils_UI.Positioning.VerticalScrollBehavior.Bottom) {
        if (selectedIndex >= 0 && selectedIndex < this._itemsUIArr.length) {
            this._selectedIndex = selectedIndex;
            $("li", this._itemsContainer).removeClass("selected");
            $("li").attr('aria-selected', 'false');
            $(".search", this._element).removeClass("selected");
            this._itemsUIArr[this._selectedIndex].addClass("selected");

            if (this._element.css('display') !== 'none') {
                this._itemsUIArr[this._selectedIndex].attr('aria-selected', 'true');
            }

            if (scrollIntoView) {
                this._scrollItemIntoView(this._selectedIndex, position);
            }
        }
    }

    /**
     * Deletes an item from the list
     */
    public removeItem(index: number) {
        if (index < this._items.length && index >= 0) {
            this._itemsUIArr[index].remove();
            this._items.splice(index, 1);
            this._itemsUIArr.splice(index, 1);
            this._numItemsDisplayed--;
            this._loadNextPage();  // load next page if reached the bottom of scroll container

            if (index === this._selectedIndex) {
                this.setSelectedIndex(index, true); // re-select the item at same index as the rest of the items would move 1 step back after removal of given item
            }

            if (this._numItemsDisplayed > 0 && this._numItemsDisplayed < this._items.length) {
                this._$itemsStatus.text(Utils_String.format(VSS_Resources_Platform.MruIdentityPickerStatus, this._items.length));
            }
            else {
                this._$itemsStatus.hide();
            }

            this.setPosition();
        }
    }

    public hideElement(): void {
        this._element.attr('aria-hidden', 'true');
        super.hideElement();
    }

    public showElement(): void {
        this._element.attr('aria-hidden', 'false');
        super.showElement();
    }

    private _render(): void {

        //Grab parent element to re-attach to later
        var parent = this._element.parent();
        this._element.detach();
        this._element.empty();

        this._itemsContainer = $(domElem("ul", "items"));
        this._itemsContainer.attr("id", "items-container-id");
        this._element.append(this._itemsContainer);
        this._itemsContainer.scroll((e) => { this._onScroll(e); });

        if (this._items.length == 0) {
            this._numItemsDisplayed = 0;
        }
        else {
            this._numItemsDisplayed = Math.min(this._items.length, this._options.pageSize);
            for (var i = 0; i < Math.min(this._items.length, this._options.pageSize); i++) {
                this._itemsContainer.append(this._createItem(i));
            }
        }

        this._$itemsStatus = $("<div>").addClass("search-result-status").appendTo(this._element);

        if (this._numItemsDisplayed > 0 && this._numItemsDisplayed < this._items.length) {
            this._$itemsStatus.text(Utils_String.format(VSS_Resources_Platform.MruIdentityPickerStatus, this._items.length));
        }
        else {
            this._$itemsStatus.hide();
        }

        var $search: JQuery;

        if (this.searchMode !== IdentitySearchMode.None) {
            var searchTitle = this.searchMode === IdentitySearchMode.SearchTfs ? VSS_Resources_Platform.MruIdentityPickerTfsSearchTitle : VSS_Resources_Platform.MruIdentityPickerAadSearchTitle;
            $search = $("<div>").addClass("search").attr("title", searchTitle).attr("role", "menu");

            if (this.searchMode === IdentitySearchMode.SearchAad && this._items.length == 0) {
                var searchText = VSS_Resources_Platform.MruIdentityPickerNoResult;
                $search = $search.addClass("search-tfs-noresult").text(searchText).append("<br />").append(searchTitle).appendTo(this._element);
            }
            else {
                $search = $search.text(searchTitle).appendTo(this._element);
            }

            $search.append($("<span>").addClass("bowtie-icon bowtie-search"));
            $search.click(() => {
                if (this.searchMode === IdentitySearchMode.SearchTfs && $.isFunction(this._options.onTfsIdentitySearch)) {
                    this._options.onTfsIdentitySearch();
                }
                else if (this.searchMode === IdentitySearchMode.SearchAad && $.isFunction(this._options.onAadIdentitySearch)) {
                    this._options.onAadIdentitySearch();
                }
            });

            this._itemsUIArr.push($search);

            $search.hover(() => {
                $search.addClass("hover");
            }, () => {
                $search.removeClass("hover");
            });
        }
        else if (this._items.length === 0) {
            $search = $("<div>").addClass("no-result").text(VSS_Resources_Platform.MruIdentityPickerNoResult).appendTo(this._element);
        }

        // Re-attach element to the DOM
        parent.append(this._element);
    }

    private _createItem(index: number): JQuery {
        var item: TFS_OM_Identities.IIdentityReference = this._items[index];
        var template = '<li title="${tooltip}" class="${itemClass} list-item"  id="${id}" role="menuitem" alt="${tooltip}">' +
            '   <div class="item-image-container loading ${imgClass}" aria-hidden="true">' +
            '       <img alt="${alt}" class="identity-picture small" />' +
            '   </div>' +
            '   <div class="item-text-container">' +
            '       <div class="title" >{{html title}}</div>' +
            '       <div class="subtitle" >{{html subtitle}}</div>' +
            '   </div>' +
            '   <div class="icon icon-delete-small" title="${iconTitle}" aria-hidden="true"></div>' +
            '</li>';
        var encodedHighlightTerm = $.ui.autocomplete.escapeRegex(this._highlightTerm);
        var matcher = new RegExp("(^)" + encodedHighlightTerm, "i");
        var matcherUniqName = new RegExp("(^)" + encodedHighlightTerm, "i");

        var uniqName = TFS_OM_Identities.IdentityHelper.getFriendlyUniqueName(item);
        if (uniqName.indexOf("\\") >= 0) {
            matcherUniqName = new RegExp("(\\\\)" + encodedHighlightTerm, "i");
        }

        var title = item.displayName
            .replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(matcher, function (term) {
                return "<b>" + term + "</b>";
            });
        var subtitle = uniqName.replace(matcherUniqName, function (term) {
            if (uniqName.indexOf("\\") >= 0) {
                term = term.replace("\\", "");
                return "\\" + "<b>" + term + "</b>";
            }
            return "<b>" + term + "</b>";
        });

        var imageUrl = TFS_OM_Identities.IdentityHelper.getIdentityImageUrl(item, TFS_OM_Identities.IdentityImageMode.ShowGenericImage);
        var itemUI = $(Utils_Html.TemplateEngine.tmpl(template, {
            id: item.id,
            title: title,
            subtitle: subtitle,
            alt: item.displayName,
            tooltip: TFS_OM_Identities.IdentityHelper.getFriendlyDistinctDisplayName(item),
            iconTitle: VSS_Resources_Platform.MruIdentityPickerRemoveItemTitle,
            imgClass: imageUrl && item.showGenericImage !== false ? "" : "hidden",
            itemClass: this._identityMru.isItemInMru(item) ? "mru-item" : "non-mru-item"
        }));
        this._itemsUIArr.push(itemUI);

        var img = itemUI.find("img.identity-picture");
        var imgContainer = itemUI.find("div.item-image-container");

        img.one("load", () => {
            imgContainer.removeClass("loading");
        });
        img.one("error", () => {
            imgContainer.removeClass("loading");
            var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
            img.attr("src", tfsContext.configuration.getResourcesFile('User.svg'));
        });

        img.attr("src", imageUrl);

        $(".icon.icon-delete-small", itemUI).click((e) => {
            if ($.isFunction(this._options.onItemDelete)) {
                this._options.onItemDelete(item);
                this.removeItem(itemUI.index());
            }
            return false;
        });

        itemUI.click((e) => {
            if ($.isFunction(this._options.onItemSelect)) {
                this._options.onItemSelect(item);
            }
        });
        itemUI.hover(() => {
            itemUI.addClass("hover");
        }, () => {
            itemUI.removeClass("hover");
        });

        return itemUI;
    }

    private _scrollItemIntoView(index: number, position: Utils_UI.Positioning.VerticalScrollBehavior): void {
        Utils_UI.Positioning.scrollIntoViewVertical(this._itemsUIArr[index], position);
    }

    private _onScroll(e?) {
        if (this._scrollTimeout !== null) {
            clearTimeout(this._scrollTimeout);
            this._scrollTimeout = null;
        }
        this._scrollTimeout = setTimeout(delegate(this, this._loadNextPage), 100);

        return false;
    }

    private _loadNextPage(force: boolean = false) {
        if (force || this._isCloseToBottom()) {
            for (var i = this._numItemsDisplayed; i < this._numItemsDisplayed + Math.min(this._items.length - this._numItemsDisplayed, this._options.pageSize); i++) {
                var $search: JQuery;
                if (this.searchMode !== IdentitySearchMode.None) {
                    $search = this._itemsUIArr.pop(); // make space to push in more items before search
                }
                this._itemsContainer.append(this._createItem(i));
                if ($search) {
                    this._itemsUIArr.push($search);
                }
            }

            this._numItemsDisplayed += Math.min(this._items.length - this._numItemsDisplayed, this._options.pageSize);
            if (this._numItemsDisplayed > 0 && this._numItemsDisplayed < this._items.length) {
                this._$itemsStatus.text(Utils_String.format(VSS_Resources_Platform.MruIdentityPickerStatus, this._items.length));
            }
        }

        if (this._scrollTimeout !== null) {
            clearTimeout(this._scrollTimeout);
            this._scrollTimeout = null;
        }
    }

    /**
     * Checks if the list view is scrolled all the way to the bottom
     */
    private _isCloseToBottom(): boolean {
        return this._itemsContainer.scrollTop() + this._itemsContainer.outerHeight() >= this._itemsContainer[0].scrollHeight - 5;
    }
}

export interface IIdentityViewControlOptions {
    identifier?: any;
    showTooltip?: boolean;
    showImage?: boolean;
    size?: TFS_OM_Identities.IdentityImageSize;
}

export interface IIdentityTooltipInfo {
    tooltipText?: string;
    showOnOverflow?: boolean;
}

export class IdentityViewControl extends Controls.Control<IIdentityViewControlOptions> {

    public tooltipInfo: IIdentityTooltipInfo;

    public static getIdentityViewElement(identifier: any, options?: any): JQuery {
        var $container = $("<div>");
        var control = <IdentityViewControl>Controls.BaseControl.createIn(IdentityViewControl, $container, $.extend({ identifier: identifier }, options));
        return control.getElement();
    }

    /**
     * Generate the cell contents for a identity column in a grid. This will create readonly IdentityControl.
     */
    public static renderIdentityCellContents(grid: any, rowInfo: any, dataIndex: number, expandedState: any, level: any, column: any, indentIndex: any, columnOrder: number, showAvatar: boolean = false): any {
        var $gridCell = grid._drawCell(rowInfo, dataIndex, expandedState, level, column, indentIndex, columnOrder);
        var value = grid.getColumnText(dataIndex, column, columnOrder);

        if ($gridCell) {
            $gridCell.addClass("identity-grid-cell");
            $gridCell.empty();
            let identityControl = Controls.create(IdentityViewControl, $gridCell, { identifier: value, showImage: showAvatar, showTooltip: false });
            if (identityControl.tooltipInfo && identityControl.tooltipInfo.tooltipText) {
                $gridCell.data("tooltip-text", identityControl.tooltipInfo.tooltipText);
                $gridCell.data("tooltip-show-on-overflow", identityControl.tooltipInfo.showOnOverflow);
            }
        }

        return $gridCell;
    }

    /**
     * @param options 
     */
    public initializeOptions(options?: any) {

        super.initializeOptions($.extend({
            coreCssClass: "identity-view-control",
            showImage: true
        }, options));
    }

    public initialize() {
        super.initialize();

        this.tooltipInfo = { tooltipText: "", showOnOverflow: false };
        let options = this._options;
        let element = this.getElement();
        let identity: any = null;

        if ($.isPlainObject(options.identifier)) {
            identity = options.identifier;
        }
        else if (typeof options.identifier === "string") {
            identity = TFS_OM_Identities.IdentityHelper.parseUniquefiedIdentityName(options.identifier);
        }

        let displayName = "";
        let distinctNameDifferent = false;
        if (identity) {
            displayName = identity.displayName;
            let distinctName = TFS_OM_Identities.IdentityHelper.getFriendlyDistinctDisplayName(identity);
            let distinctNameDifferent = Utils_String.localeIgnoreCaseComparer(displayName, distinctName) !== 0;
            if (options.showTooltip !== false) {
                RichContentTooltip.add(distinctName, element, displayName === distinctName ? { onlyShowWhenOverflows: element } : undefined);
            } 
            else if (distinctName) {
                this.tooltipInfo.tooltipText = distinctName;
                this.tooltipInfo.showOnOverflow = !distinctNameDifferent;
            }
        }

        let showImage = false;
        if (options.showImage && identity) {
            let imageUrl = TFS_OM_Identities.IdentityHelper.getIdentityImageUrl(identity, undefined, options.size);
            if (imageUrl) {
                showImage = true;
                let $image = $("<img />").attr("src", imageUrl);
                $image.appendTo(element);

                if (options.showTooltip !== false) {
                    RichContentTooltip.add(displayName, $image);
                }
            }
        }

        if (!showImage) {
            element.addClass("no-image");
        }

        $("<span>").text(displayName).appendTo(element);
    }
}
