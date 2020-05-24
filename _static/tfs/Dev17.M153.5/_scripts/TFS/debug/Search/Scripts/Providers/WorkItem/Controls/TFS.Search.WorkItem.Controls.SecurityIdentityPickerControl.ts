// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import { DropDownHelper } from "Search/Scripts/Common/TFS.Search.DropDownHelper";
import Identities_Picker_Controls = require("VSS/Identities/Picker/Controls");
import Identities_Picker_RestClient = require("VSS/Identities/Picker/RestClient");
import Identities_Picker_Services = require("VSS/Identities/Picker/Services");
import { format, localeIgnoreCaseComparer } from "VSS/Utils/String";
import SearchBoxHelper = require("Search/Scripts/Common/TFS.Search.SearchBoxHelper");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");
import { WorkItemCommon } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Common";
import { IMenuItem, MenuItemTypes, ISuggestionProvider, IIdentityPickerOptions }
    from "Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.Contracts";

var delegate = Utils_Core.delegate,
    domElem = Utils_UI.domElem;

/**
* Provides identity suggestions for the helper dropdown for work item search
*/
export class SecurityIdentityPickerControl implements ISuggestionProvider {
    private _identityPickerDropdown: Identities_Picker_Controls.IdentityPickerDropdownControl;
    private _$focusDiv: JQuery;
    private _searchBoxCssSelector: string;
    private _firstItemCssSelector: string;
    private _setSearchBoxValue: Function;

    constructor(options: IIdentityPickerOptions) {
        this._searchBoxCssSelector = options.searchTextBoxCssSelector;
        this._firstItemCssSelector = "li:first";
        this._createIdentityPickerControl(options.container);
        this._$focusDiv = this._getFocusDiv().appendTo(options.container);
        this._setSearchBoxValue = options.setSearchBoxValue;
    }

    private _createIdentityPickerControl(_$container: JQuery): void {
        var operationScope: Identities_Picker_Services.IOperationScope = {
            IMS: true,
            Source: true
        },
            identityType: Identities_Picker_Services.IEntityType = {
                User: true,
                Group: false
            };

        this._identityPickerDropdown = Controls.create(Identities_Picker_Controls.IdentityPickerDropdownControl, _$container,
            <Identities_Picker_Controls.IIdentityPickerDropdownOptions>
            {
                onItemSelect: Utils_Core.delegate(this, this._insertSelectedItem),
                consumerId: "E38B79F4-86E0-46E1-AD29-B71C6232D63D",
                identityType: identityType,
                operationScope: operationScope,
                showContactCard: false,
                showMru: true,
                alignment: {
                    positioningElement: _$container
                },
                extensionData: {
                    extensionId: "5F117E2F-8847-4019-A08E-BD8AF7E732A1",
                    projectScopeName: (Context.SearchContext.getTfsContext().contextData &&
                        Context.SearchContext.getTfsContext().contextData.project) ?
                        Context.SearchContext.getTfsContext().contextData.project.name : null,
                    collectionScopeName: (Context.SearchContext.getTfsContext().contextData &&
                        Context.SearchContext.getTfsContext().contextData.collection) ?
                        Context.SearchContext.getTfsContext().contextData.collection.name : null,
                    constraints: null,
                }
            });
    }

    /**
     * Duplicating the code from getUniquefiedIdentityName function of TFS.WorkItemTracking.Helpers
     * Making it public for L0 testing
     */
    public static getUniqueIdentityName(item: Identities_Picker_RestClient.IEntity): string {
        // Bug 635889: Selecting an identity from the searched list of the identity picker is appending a guid
        // in the search box.
        // This is happening because the getUniquefiedIdentityName function of TFS.WorkItemTracking.Helpers handles
        // AAD and non AAD entities in a different way. Hence duplicating the code of getUniquefiedIdentityName
        // without the handling of AAD entities.
        if (!item) {
            return "";
        }

        var uniqueName = item.signInAddress || item.mail;

        if (uniqueName) {
            if (uniqueName.indexOf("@") === -1 && item.scopeName) {
                // if uniqueName is not an email, use both domain and alias
                return format("{0} {1}{2}\\{3}{4}", item.displayName, "<", item.scopeName, uniqueName, ">");
            }
            else {
                // if uniqueName is an email, only use email
                return format("{0} {1}{2}{3}", item.displayName, "<", uniqueName, ">");
            }
        }
        else {
            return item.displayName || "";
        }
    }

    private _insertSelectedItem(item: Identities_Picker_RestClient.IEntity): void {
        var _$searchBox = $(this._searchBoxCssSelector),
            _searchBox = <HTMLInputElement>_$searchBox.get(0),
            _inputText = _searchBox.value || "",
            _suggestion = '"' + SecurityIdentityPickerControl.getUniqueIdentityName(item) + '"',
            _numberOfQuotes = _inputText.match(/\"/g),
            _delimiter = DropDownHelper.DELIMITER_CHARACTERS;
        if (_numberOfQuotes && _numberOfQuotes.length % 2 !== 0) {
            _delimiter = ['"'];
        }
        var inputObject = DropDownHelper.getSuggestionToBeInsertedIntoSearchBox(_inputText,
            _inputText.length,
            _suggestion,
            _delimiter);

        _$searchBox.val(inputObject.stringWithSuggestion);
        DropDownHelper.setCaretPosition(_searchBox, inputObject.caretPosition);

        this._setSearchBoxValue && this._setSearchBoxValue(inputObject.stringWithSuggestion);

        // Hide the popup container i.e. the parent of identity picker
        this._identityPickerDropdown.getElement().parent().hide();

        TelemetryHelper.TelemetryHelper.traceLog({
            "WorkItemIdentityPickerIdentitySelected": true
        });
        
        _$searchBox.trigger("showpopup");
    }

    private _handleHelperDropdownKeyPressEvent(e: JQueryEventObject): boolean {
        if (this._identityPickerDropdown && this._identityPickerDropdown.isVisible()) {
            if (Utils_String.ignoreCaseComparer(e.type, "keydown") === 0) {
                // If the event is key down then see if it is tab key or not if tab key insert focused item
                if (e.keyCode === Utils_UI.KeyCode.TAB) {
                    if (!this._insertItem()) {
                        // If there is no selected item, call handleKeyEvent method of IdentityPickerDropDown control
                        // because it means that the focus is on the search icon of identity Picker.
                        this._identityPickerDropdown.handleKeyEvent(e);
                    }

                    return false;
                }
                else if (e.keyCode !== Utils_UI.KeyCode.ENTER) {
                    // Else check if it is enterkey or not.If it is not enter key then send it to default key handler like key down, key up.
                    // For enter key no action on key down.
                    // If there is no selected item, call handleKeyEvent method of IdentityPickerDropDown control
                    // because it means that the focus is on the search icon of identity Picker.
                    this._identityPickerDropdown.handleKeyEvent(e);
                    if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
                        $(this._searchBoxCssSelector).focus();
                    }
                }
            }
            else if (Utils_String.ignoreCaseComparer(e.type, "keyup") === 0) {
                // If the event is key up then check if it is enter key or not. If enter key then insert selected item.
                // Else no event.
                // If there is no item to insert for enter send it to default key handler
                if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                    if (!this._insertItem()) {
                        // If there is no selected item, call handleKeyEvent method of IdentityPickerDropDown control
                        // because it means that the focus is on the search icon of identity Picker.
                        this._identityPickerDropdown.handleKeyEvent(e);
                    }
                }
            }
        }
        return false;
    }

    private _insertItem(): boolean {
        // Insert the selected item into the search box if any, otherwise call handleKeyEvent
        // method of IdentityPickerDropDown control (as it just searches for identities on keypress
        // of TAB/Enter) because it means that the focus is on the search icon of identity Picker.
        var item: Identities_Picker_RestClient.IEntity = this._identityPickerDropdown.getSelectedItem();
        if (item) {
            this._insertSelectedItem(item);
            return true;
        }

        return false;
    }

    /**
     * Creating a focus div with tab index '-1' to listen to key up and down
     * events and call the identity picker's handleKeyEvent and _insertSelectedItem
     * accordingly upon key up and down events.
     * Making it public for L0 testing
     */
    public _getFocusDiv(): JQuery {
        var _$focusDiv = $(domElem("div"))
            .attr("tabindex", "-1")
            .unbind("keydown.selectItem")
            .bind("keydown.selectItem", Utils_Core.delegate(this, (e: JQueryEventObject) => {
                return this._handleHelperDropdownKeyPressEvent(e);
            }))
            .unbind("keyup.selectItem")
            .bind("keyup.selectItem", Utils_Core.delegate(this, (e: JQueryEventObject) => {
                return this._handleHelperDropdownKeyPressEvent(e);
            }));
        return _$focusDiv;
    }

    /**
     * Sets focus on the focus div which is a sibling of identity picker so that
     * key up and down events on identity picker can be listened on focus div as
     * as identity picker isn't focussable.
     */
    public focus(): void {
        if (this._$focusDiv) {
            this._$focusDiv.focus();
            var _$element: JQuery = this._identityPickerDropdown.getElement(),
                _$search: JQuery = $('.search', _$element);

            // First item is selected by default in the getIdentities call
            // and since 'selected' class has been explicitly removed,
            // add 'selected' class to the first item if exists, otherwise add to the search icon of identity picker.
            if (this._identityPickerDropdown.getSelectedItem()) {
                $(this._firstItemCssSelector, _$element).addClass("selected");
            }
            else if (_$search.is(":visible")) {
                _$search.addClass("selected");
            }
        }
    }

    public dispose() {
        if (!this._identityPickerDropdown.isDisposed()) {
            this._identityPickerDropdown.dispose();
            this._identityPickerDropdown = null;
        }
    }

    /**
     * Gets the list of identities based on the search text and invoke the
     * success call back with search text.
     * Inside the success call back it is decided to show the popup or not
     * based on the search text being empty or not.
     */
    public getSuggestions(onSuccess: Function, searchText?: string): void {
        if ($.isFunction(onSuccess)) {
            var callback = Utils_Core.delegate(this, (showIdentityPicker?: boolean) => {
                this._identityPickerDropdown.show();
                var _$element: JQuery = this._identityPickerDropdown.getElement(),
                    _$search: JQuery = $('.search', _$element),
                    firstItem: JQuery = $(this._firstItemCssSelector, _$element);
                // Explicitly removing the selected class from the first item,
                // as getIdentities selects the first item by default because _showOnlyMruIdentities is  
                // set to true when showAllMruIdentities is called whenever there is no search text
                // due to which identity picker is drawn with the selectFirstByDefault option defaulting to true.
                if (firstItem.hasClass("selected")) {
                    firstItem.removeClass("selected");
                }
                else if (_$search && _$search.hasClass("selected")) {
                    _$search.removeClass("selected");
                }

                onSuccess(showIdentityPicker);
            });

            if (searchText) {
                // Show the identity picker when the search text isn't modified.
                // Removing this check i.e. always calling 'getIdentities' causes the list of suggestions to toggle for the same
                // search text i.e. when the user continuously clicks on the search box without modifying the search text.
                if (localeIgnoreCaseComparer(this._identityPickerDropdown.getPrefix(), searchText) === 0) {
                    callback();
                }
                // Call getIdentities when search text is modified.
                else {
                    this._identityPickerDropdown.getIdentities(searchText).then(Utils_Core.delegate(this, (entities: Identities_Picker_RestClient.IEntity[]) => {
                        if (searchText) {
                            callback();
                        }
                    }))
                }
            }
            else {
                // Search text for identity picker doesn't get updated due to which search statuses are not reset
                // as getIdentities is not called with empty search text. Hence updating it here
                this._identityPickerDropdown.updatePrefix("");
                this._identityPickerDropdown.showAllMruIdentities().then(Utils_Core.delegate(this, (entities: Identities_Picker_RestClient.IEntity[]) => {
                    if (!searchText) {
                        callback(entities && entities.length > 0);
                    }
                }))
            }
        }
    }

    public getSelectedSuggestionText(menuItem: IMenuItem): string {
        return null;
    }

    public tryGetFieldType(name: string, callbackOnGettingFieldType: (fieldType: MenuItemTypes) => void) {
        return null;
    }
}