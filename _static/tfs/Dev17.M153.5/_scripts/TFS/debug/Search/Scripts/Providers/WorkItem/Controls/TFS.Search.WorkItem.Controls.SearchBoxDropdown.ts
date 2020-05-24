// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Context = require("Search/Scripts/Common/TFS.Search.Context");
import Controls = require("VSS/Controls");
import { Debug } from "VSS/Diag";
import { DropDownHelper } from "Search/Scripts/Common/TFS.Search.DropDownHelper";
import { getMSJSON } from "Presentation/Scripts/TFS/TFS.Legacy.Ajax";
import Performance = require("VSS/Performance");
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import TelemetryHelper = require("Search/Scripts/Common/TFS.Search.TelemetryHelper");
import TFS_Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import Utils_String = require("VSS/Utils/String");
import { using } from "VSS/VSS";
import Work_Item_Contracts = require("Search/Scripts/Contracts/TFS.Search.WorkItem.Contracts");
import Work_Item_Controls_Contracts = require("Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.Contracts");

import IdentityPicker_NO_REQUIRE =
require("Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.SecurityIdentityPickerControl");

import "VSS/LoaderPlugins/Css!Search/Scripts/TFS.Search.WorkItem.Controls.SearchBoxDropdown";

var domElem = Utils_UI.domElem;
const HELPER_TEXT_MENU_ITEM_LIST: IDictionaryStringTo<string> = {};

class MenuConstants {
    public static WORKITEM_SEARCH_ASSIGNED_TO: string = Search_Resources.WorkItemSearchAssignedToField;
    public static WORKITEM_SEARCH_CREATED_BY: string = Search_Resources.WorkItemSearchCreatedBy;
    public static WORKITEM_SEARCH_STATE: string = Search_Resources.WorkItemSearchStateField;
    public static WORKITEM_SEARCH_WORK_ITEM_TYPE: string = Search_Resources.WorkItemSearchWorkItemTypeField;

    public static DEFAULT_MENU_ITEM_LIST: Array<Work_Item_Controls_Contracts.IMenuItem> = <Array<Work_Item_Controls_Contracts.IMenuItem>>[
        {
            displayName: "a:",
            type: Work_Item_Controls_Contracts.MenuItemTypes.String,
            shortHand: "a",
            helperText: MenuConstants.WORKITEM_SEARCH_ASSIGNED_TO
        },
        {
            displayName: "c:",
            type: Work_Item_Controls_Contracts.MenuItemTypes.String,
            shortHand: "c",
            helperText: MenuConstants.WORKITEM_SEARCH_CREATED_BY
        },
        {
            displayName: "s:",
            type: Work_Item_Controls_Contracts.MenuItemTypes.String,
            shortHand: "s",
            helperText: MenuConstants.WORKITEM_SEARCH_STATE
        },
        {
            displayName: "t:",
            type: Work_Item_Controls_Contracts.MenuItemTypes.String,
            shortHand: "t",
            helperText: MenuConstants.WORKITEM_SEARCH_WORK_ITEM_TYPE
        }
    ];

    public static DEFAULT_OPERATORS_ITEM_LIST: Array<Work_Item_Controls_Contracts.IMenuItem> = <Array<Work_Item_Controls_Contracts.IMenuItem>>[
        {
            displayName: "AND",
            type: Work_Item_Controls_Contracts.MenuItemTypes.Operator,
            shortHand: "AND"
        },
        {
            displayName: "NOT",
            type: Work_Item_Controls_Contracts.MenuItemTypes.Operator,
            shortHand: "NOT"
        },
        {
            displayName: "OR",
            type: Work_Item_Controls_Contracts.MenuItemTypes.Operator,
            shortHand: "OR"
        }
    ];
}


HELPER_TEXT_MENU_ITEM_LIST[MenuConstants.WORKITEM_SEARCH_ASSIGNED_TO.toLocaleLowerCase()] = Search_Resources
    .WorkItemSearchAssignedToHelperText
    .replace("{0}", "a");
HELPER_TEXT_MENU_ITEM_LIST[MenuConstants.WORKITEM_SEARCH_CREATED_BY.toLocaleLowerCase()] = Search_Resources
    .WorkItemSearchCreatedByHelperText
    .replace("{0}", "c");
HELPER_TEXT_MENU_ITEM_LIST[MenuConstants.WORKITEM_SEARCH_STATE.toLocaleLowerCase()] = Search_Resources
    .WorkItemSearchStateHelperText
    .replace("{0}", "s");
HELPER_TEXT_MENU_ITEM_LIST[MenuConstants.WORKITEM_SEARCH_WORK_ITEM_TYPE.toLocaleLowerCase()] = Search_Resources
    .WorkItemSearchWorkItemTypeHelperText
    .replace("{0}", "t");

// For Onprem we need to support all language alphabetic characters. In Java Script there is no such expression at that time, so we went with a logic
// to match all characters which are not supported by WIT form. Below are the characters which are not supported in hosted. Need to work with WITteam for 
// OnPrem non supported characters
const WIT_RESTRICTED_CHARACTERS = "\\.,;'`:~\\\\\/\\*\\|\\?\"&%$!\\+=\\(\\)\\[\\]{}<>-";
const VALUE_RESTRICTED_CHARACTERS = ":|<|>|<=|>=|!=";

/**
* Provides a helper dropdown for work item search
*/
export class SearchBoxDropdown extends Controls.BaseControl implements TFS_Host_UI.ISearchBoxDropdownControl {
    private _$popupContainer: JQuery;
    private _mode: Work_Item_Controls_Contracts.SuggestionDropdownMode;
    private _suggestionsProviders: IDictionaryNumberTo<Work_Item_Controls_Contracts.ISuggestionProvider>;
    private _searchTextBoxCssSelector: string;
    private _documentClickNamespace: string;
    private _isIdentityPickerEnabled: boolean;
    private _$inputSearchBoxElement: JQuery;
    private _dropdownId: string;
    private isEscaped: boolean;

    // If you are using new RegExp() method to create a regular expression we need to use double back slash instead of one which you need to do in normal way
    public static FULL_FORMED_REGEX_FOR_UNPAIRED_QUOTE: RegExp = /(.*)\s*(:|<=|>=|<|>|=|!=)\s*\"([^\"]*)$/; //e.g  AssignedTo:" , :" , >", ::" etc.
    public static FIELD_NAME_REGEX_FOR_UNPAIRED_QUOTE: RegExp = new RegExp("\"[^{0}]*$".replace("{0}", WIT_RESTRICTED_CHARACTERS)); //e.g "Assigned etc.;
    public static OPERATORS_REGEX: RegExp = /(:|<=|>=|<|>|=|!=)/;
    public static FULLFORMED_REGEX: RegExp = new RegExp("([^{0}\\s]+)\\s*(:|<=|>=|<|>|=|!=)\\s*([^{1}\\s]*)$".replace("{0}", WIT_RESTRICTED_CHARACTERS).replace("{1}", VALUE_RESTRICTED_CHARACTERS)); // e.g. ChangedDate: 2012-12-09  or AssignedTo: etc.
    public static ONLYFIELDNAME_REGEX: RegExp = new RegExp("([^{0}\\s]+)(\\s*)$".replace("{0}", WIT_RESTRICTED_CHARACTERS)); // e.g. AssignedTo etc.
    public static FULL_FORMED_REGEX_WITH_QUOTES: RegExp = new RegExp("\"([^{0}]+)\"\\s*(:|<=|>=|<|>|=|!=)\\s*([^{1}\"]*)$".replace("{0}", WIT_RESTRICTED_CHARACTERS).replace("{1}", VALUE_RESTRICTED_CHARACTERS)); //e.g. "ChangedDate" : 2012-12-09 or "AssignedTo": etc.
    public static FIELD_WITHIN_QUOTES_REGEX: RegExp = new RegExp("\"([^{0}]+)\"\\s*$".replace("{0}", WIT_RESTRICTED_CHARACTERS)); // e.g "Assigned To"

    constructor(options: Work_Item_Controls_Contracts.ISearchBoxDropdownOptions) {
        super(options);
        Debug.assertIsNotUndefined(options.searchTextBoxCssSelector, "text box css selector can not be null");

        this._searchTextBoxCssSelector = options.searchTextBoxCssSelector;
        this._documentClickNamespace = options.documentClickNamespace;
        this._isIdentityPickerEnabled = options.isIdentityPickerEnabled;
        this._dropdownId = options.dropdownId;

        this._$popupContainer = $(domElem("div")).addClass("workitem-search-dropdown-container").attr("id", this._dropdownId);
        this._$popupContainer = this.constructDefault(this._$popupContainer);

        this._suggestionsProviders = {};
        this._suggestionsProviders[Work_Item_Controls_Contracts.SuggestionDropdownMode.FieldSuggestion] = new FieldSuggestionProvider();
        this._suggestionsProviders[Work_Item_Controls_Contracts.SuggestionDropdownMode.OperatorSuggestion] = new NumericOperatorSuggestionProvider();
        this._suggestionsProviders[Work_Item_Controls_Contracts.SuggestionDropdownMode.ValueSuggestion] = new DateTimeValueSuggestionProvider();

        this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.StaticDropDownSuggestion;

        this._$popupContainer.hide();
    }

    public bind(_$inputElement: JQuery, isLargeSearchBox: boolean): void {
        if (_$inputElement) {
            this._$inputSearchBoxElement = _$inputElement;
            var ariaAttribute: string = (isLargeSearchBox ? "" : "multi-entity-") + "workitem-dropdown";

            this._$inputSearchBoxElement.attr("aria-owns", ariaAttribute).attr("aria-controls", ariaAttribute);

            _$inputElement
                .unbind("click.searchBoxDropdown")
                .bind("click.searchBoxDropdown", Utils_Core.delegate(this, this._showPopup));

            // this custom event is required to prevent some other actions on $inputElement caused by "click" event.
            _$inputElement
                .unbind("showpopup")
                .bind("showpopup", Utils_Core.delegate(this, this._showPopup));

            _$inputElement
                .unbind("keydown.refineSuggestion")
                .bind("keydown.refineSuggestion", Utils_Core.delegate(this, this._onKeyDown, isLargeSearchBox));

            _$inputElement
                .unbind("keyup.refineSuggestion")
                .bind("keyup.refineSuggestion", Utils_Core.delegate(this, this._onKeyUp, isLargeSearchBox));

            var eventName = "click.{0}".replace("{0}", this._documentClickNamespace);
            $(document)
                .unbind(eventName)
                .bind(eventName, Utils_Core.delegate(this, this._onDocumentClick))

            if (isLargeSearchBox) {
                _$inputElement
                    .unbind("focus.searchBoxDropdown")
                    .bind("focus.searchBoxDropdown", Utils_Core.delegate(this, (e: JQueryEventObject, data: any) => {
                        this._showPopup(e, data);
                        return false;
                    }));
            }
        }
    }

    public getPopup(): JQuery {
        return this._$popupContainer;
    }

    public unbind(_$inputElement: JQuery): void {
        var eventName = "click.{0}".replace("{0}", this._documentClickNamespace);
        $(document).unbind(eventName);

        if (_$inputElement) {
            _$inputElement
                .unbind("click.searchBoxDropdown")
                .unbind("keyup.refineSuggestion")
                .unbind("keydown.refineSuggestion");
        }
    }

    /**
     * Used only by L0 tests to override providers for the purpose of mocking.
     * @param key
     * @param provider
     */
    public setSuggestionProvider(key: Work_Item_Controls_Contracts.SuggestionDropdownMode,
                                 provider: Work_Item_Controls_Contracts.ISuggestionProvider) {
        this._suggestionsProviders[key] = provider;
    }

    /**
     * Returns the current drop down mode. Used only by L0 tests.
     */
    public getMode(): Work_Item_Controls_Contracts.SuggestionDropdownMode {
        return this._mode;
    }

    /**
     * Given the caret position and the input text in the text box the method sets
     * this._mode which essentially determines what type of suggestion drop down to show.
     * It returns the keyword to refine the list of items to be shown in the suggestion dropdown.
     * this._mode is used by refineSuggestions method to get the list of source items on top of which
     * refinement is performed.
     * Method is made public so as to enable writing L0 tests
     * @param caretPosition Position of the cursor in the search box
     * @param inputText The text typed by the user till then
     * @param onGetFilterText Callback to call refineSuggestions with the refined text
     */
    public setModeAndGetTextForFiltering(caretPosition: number, inputText: string, onGetFilterText: Function): void {
        this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.StaticDropDownSuggestion;
        return;
    }

    /**
     * This Method takes fieldName and gets the type of the fieldName and sets mode for Operator Suggestion if fieldName type is 
     * Numeric or DateTime OtherWise Mode is None
     * In case the fields is numeric/datetime we set mode to operatorsuggestion otherwise none
     * @param onGetFilterText Callback to call refineSuggestions with the refined text
     * @param fieldName  Text to define the type of the field name and recommend operators depending on the type
     */
    private setSuggestionModeForFieldName(onGetFilterText: Function, fieldName: any): void {
        var result = "",
            previousMode = this._mode;
        this._suggestionsProviders[Work_Item_Controls_Contracts.SuggestionDropdownMode.FieldSuggestion]
            // Getting type of fieldName to setMode
            .tryGetFieldType(fieldName, Utils_Core.delegate(this, (fieldType) => {
                // If field Type is numeric or date time then mode is operatorSuggesion else mode is none
                if (fieldType !== null && (
                    fieldType === Work_Item_Controls_Contracts.MenuItemTypes.Numeric ||
                    fieldType === Work_Item_Controls_Contracts.MenuItemTypes.DateTime)) {
                    this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.OperatorSuggestion;
                }
                else {
                    this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.StaticDropDownSuggestion;
                }

                if (previousMode !== this._mode) {
                    this._onModeChange();
                }

                onGetFilterText(result);
            }));
    }

    /**
     * Method to  give Suggestions depending on the type of the field and change the mode depending on field type
     * @param onGetFilterText  Callback to call refineSuggestions with the refined text
     * @param probableFieldName Text to define the type of the field name and give suggestions on operators depending on the type
     * @param fieldValue Value to give suggestions on value depending on type of the probableFieldName
     */
    private setSuggestionModeForOperators(onGetFilterText: Function, probableFieldName: string, fieldValue: string): void {
        var result = "",
            previousMode = this._mode;
        if (probableFieldName) {
            probableFieldName = probableFieldName.replace(/\s+/g, "");
        }

        this._suggestionsProviders[Work_Item_Controls_Contracts.SuggestionDropdownMode.FieldSuggestion]
            //Getting field type of probableFieldName to set mode and result value
            .tryGetFieldType(probableFieldName, Utils_Core.delegate(this, (fieldType) => {
                // IfField Type is Date time then mode is Value Suggestion
                if (fieldType !== null &&
                    fieldType === Work_Item_Controls_Contracts.MenuItemTypes.DateTime) {
                    this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.ValueSuggestion;
                    result = fieldValue;
                }
                // If field type is identity then mode is Identity suggestion 
                else if (fieldType !== null &&
                    fieldType === Work_Item_Controls_Contracts.MenuItemTypes.Identity) {
                    this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.IdentitySuggestion;
                    result = fieldValue;
                }
                else {
                    this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.None;
                    result = "";
                }

                if (previousMode !== this._mode) {
                    this._onModeChange();
                }
                onGetFilterText(result);
            }));
    }

    /**
     * Method handles the drop down suggestions when the number of quotes in the Given Text are Even
     * @param onGetFilterText  Callback to call refineSuggestions with the refined text
     * @param textUpToCaret  Text till the Position of the cursor in the search box
     */
    private handleForPairedQuote(onGetFilterText: Function, textUpToCaret: any): void {
        var previousMode: Work_Item_Controls_Contracts.SuggestionDropdownMode = this._mode,
            lastIndexOfQuote = textUpToCaret.lastIndexOf("\""),
            result = "";

        var fullFormRegexDelegate = (regexMatch: any) => {
            var probableFieldName = regexMatch[1],
                value = regexMatch[3];
            this.setSuggestionModeForOperators(onGetFilterText, probableFieldName, value);
        }

        var fieldNameRegexDelegate = (regexMatch: any) => {
            // Checking if more than one space is given or not
            var hasSpace = regexMatch[2] !== null && regexMatch[2].replace(/\s+/, " ") === " ",
                fieldName = regexMatch[1];
            if (hasSpace) {
                this.setSuggestionModeForFieldName(onGetFilterText, fieldName);
                return;
            }
            else {
                this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.FieldSuggestion;
                if (previousMode !== this._mode) {
                    this._onModeChange();
                }

                onGetFilterText(fieldName);
            }
        }
        
        // If there are no Quotes in the text then we need to take care of that particular cases
        if (lastIndexOfQuote < 0) {
            var fullFormRegExMatch = textUpToCaret.match(SearchBoxDropdown.FULLFORMED_REGEX);
            if (fullFormRegExMatch) {
                fullFormRegexDelegate.call(this, fullFormRegExMatch);
                return;
            }

            var fieldNameMatch = textUpToCaret.match(SearchBoxDropdown.ONLYFIELDNAME_REGEX);
            if (fieldNameMatch) {
                fieldNameRegexDelegate.call(this, fieldNameMatch);
                return;
            }

            result = textUpToCaret;
            this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.FieldSuggestion;
            if (previousMode !== this._mode) {
                this._onModeChange();
            }

            onGetFilterText(result);
            return;
        }
        else {
            // Getting text after Quote
            var textAfterQuote = textUpToCaret.substr(lastIndexOfQuote + 1);
            // Checking if Text After Quote is a full form regex 
            fullFormRegExMatch = textAfterQuote.match(SearchBoxDropdown.FULLFORMED_REGEX);
            // e.g   "Accepted" DueDate : 
            if (fullFormRegExMatch) {
                fullFormRegexDelegate.call(this, fullFormRegExMatch);
                return;
            }

            var fullFormedRegexWithQuotesMatch = textUpToCaret.match(SearchBoxDropdown.FULL_FORMED_REGEX_WITH_QUOTES);
            //e.g. "ChangedDate" : 2012-12-09 or "AssignedTo": etc.
            if (fullFormedRegexWithQuotesMatch) {
                // To give suggestions for values if field in quotes is date time
                var probableFieldName = fullFormedRegexWithQuotesMatch[1],
                    value = fullFormedRegexWithQuotesMatch[3];
                this.setSuggestionModeForOperators(onGetFilterText, probableFieldName, value);
                return;
            }

            // To give suggestions to normal fields after quotes e.g "assigned to" priority
            var fieldNameMatch = textAfterQuote.match(SearchBoxDropdown.ONLYFIELDNAME_REGEX);
            if (fieldNameMatch) {
                fieldNameRegexDelegate.call(this, fieldNameMatch);
                return;
            }

            // Operator suggestions for field names in quotes e.g "Priority" 
            var fieldNameWithinQuotesMatch = textUpToCaret.match(SearchBoxDropdown.FIELD_WITHIN_QUOTES_REGEX);
            if (fieldNameWithinQuotesMatch) {
                var probableFieldName = fieldNameWithinQuotesMatch[1],
                    fieldName = probableFieldName.replace(/\s+/g, "");
                this.setSuggestionModeForFieldName(onGetFilterText, fieldName);
                return;
            }

            this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.StaticDropDownSuggestion;
            result = "";
            if (previousMode !== this._mode) {
                this._onModeChange();
            }

            onGetFilterText(result);
        }
    }


    /**
     * Method handles the drop down suggestions when the number of quotes in the Given Text are Odd
     * @param onGetFilterText  Callback to call refineSuggestions with the refined text
     * @param textUpToCaret  Text till the Position of the cursor in the search box
     */
    private handleForUnPairedQuote(onGetFilterText: Function, textUpToCaret: any): void {
        var result: String,
            textAfterQuote,
            fullFormRegExMatch = textUpToCaret.match(SearchBoxDropdown.FULL_FORMED_REGEX_FOR_UNPAIRED_QUOTE),
            fieldnameRegexMatch = textUpToCaret.match(SearchBoxDropdown.FIELD_NAME_REGEX_FOR_UNPAIRED_QUOTE),
            previousMode: Work_Item_Controls_Contracts.SuggestionDropdownMode = this._mode;
        // If Quotes are preceded by an operator then no suggestions need to be given except if the field value is identity picker before Operator
        if (fullFormRegExMatch) {
            //Checking if Operator is Colon or not as Identity Picker Field Value is followed by colon only
            if (fullFormRegExMatch[2] === ":") {  //e.g : "Assigned to" : "Alias" , "Due Date" : 20-10-2016 etc.
                //this to to trim spaces in the match there are cases where spaces are not getting selected seperately
                var fieldValueBeforeColon = fullFormRegExMatch[1].trim(),
                    probableFieldName = "",
                    currentPosition: number;
                var stringLength: number = fieldValueBeforeColon.length;
                //Checking if the field value is given in quotes or not
                if (fieldValueBeforeColon[stringLength - 1] === "\"") {
                    currentPosition = stringLength - 2;
                    //Getting the position of the other Quote that is at the beginning of the field value
                    while (fieldValueBeforeColon.charAt(currentPosition) !== "\"" && currentPosition > 0) {
                        currentPosition--;
                    }

                    //Getting field value before colon to check if it is a identity picker
                    probableFieldName = fieldValueBeforeColon.substring(currentPosition + 1, stringLength - 1);
                }
                else {
                    // Checking if field value is given in a normal way
                    currentPosition = stringLength - 1;
                    //Getting the position of the beginning of the field value
                    //e.g "assignedto":"User, assignedto : "user , "Sometext"Assignedto : "user, some text Assignedto:"User
                    while (fieldValueBeforeColon.charAt(currentPosition) !== " " &&
                        currentPosition > 0) {
                        currentPosition--;
                    }

                    //Condition if the value is given at beginning with out space
                    if (fieldValueBeforeColon.charAt(currentPosition) === " ") {
                        currentPosition++;
                    }

                    probableFieldName = fieldValueBeforeColon.substr(currentPosition);
                }

                this.setSuggestionModeForOperators(onGetFilterText, probableFieldName, fullFormRegExMatch[3]);
                return;
            }
            else {
                this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.None;
                result = "";
                if (previousMode !== this._mode) {
                    this._onModeChange();
                }

                onGetFilterText(result);
                return;
            }
        }

        // If a valid fieldName is preceded by a single quote then we need to remove spaces in filedName and send to filter for suggestions
        if (fieldnameRegexMatch) {
            var lastIndexOfQuote = textUpToCaret.lastIndexOf("\""),
                textAfterQuote = textUpToCaret.substr(lastIndexOfQuote + 1);
            textAfterQuote = textAfterQuote.replace(/\s/g, "");
            // e.g "Assigned to : , "Tags = , ": etc.
            if (!textAfterQuote) {
                this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.StaticDropDownSuggestion;
            }
            else if (textAfterQuote.match(SearchBoxDropdown.OPERATORS_REGEX) !== null) {
                this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.None;
                result = "";
            }
            else {
                this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.FieldSuggestion;
                result = textAfterQuote;
            }

            if (previousMode !== this._mode) {
                this._onModeChange();
            }

            onGetFilterText(result);
            return;
        }

        this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.None;
        result = "";

        if (previousMode !== this._mode) {
            this._onModeChange();
        }

        onGetFilterText(result);
    }

    /**
     * Give the refinement text, this method redraws the suggestion drop down list with the list of qualified suggestions.
     * @param text
     */
    public refineSuggestions(text: string): void {
        var callback: any = this._mode !== Work_Item_Controls_Contracts.SuggestionDropdownMode.IdentitySuggestion
            ? ((text: string) => {
                return Utils_Core.delegate(this, (suggestions: Array<Work_Item_Controls_Contracts.IMenuItem>) => {
                    this._onGetSuggestions(text, suggestions);
                });
            })(text)
            : Utils_Core.delegate(this, (showPopupContainer: boolean = true) => {
                showPopupContainer ? this.show() : this.hide();
            });

        if (this._suggestionsProviders[this._mode]) {
            this._suggestionsProviders[this._mode].getSuggestions(callback, text);
        }
        else if (this._mode === Work_Item_Controls_Contracts.SuggestionDropdownMode.IdentitySuggestion
            && this._isIdentityPickerEnabled) {
            using(["Search/Scripts/Providers/WorkItem/Controls/TFS.Search.WorkItem.Controls.SecurityIdentityPickerControl"],
                Utils_Core.delegate(this, (IdentityPicker: typeof IdentityPicker_NO_REQUIRE) => {
                    let options: Work_Item_Controls_Contracts.IIdentityPickerOptions = {
                        container: this._$popupContainer,
                        searchTextBoxCssSelector: this._searchTextBoxCssSelector,
                        setSearchBoxValue: this._options.setSearchBoxValue
                    };
                    this._suggestionsProviders[Work_Item_Controls_Contracts.SuggestionDropdownMode.IdentitySuggestion] =
                        new IdentityPicker.SecurityIdentityPickerControl(options);
                    this._suggestionsProviders[this._mode].getSuggestions(callback, text);
                })
            );
        }

        else if (this._mode === Work_Item_Controls_Contracts.SuggestionDropdownMode.StaticDropDownSuggestion) {
            this._$popupContainer = this.constructDefault(this._$popupContainer);
            this.show();
        }
        else {
            this._cleanAndHidePopUpContainer();
        }
    }

    public getMenuItem(item: Work_Item_Controls_Contracts.IMenuItem, hitText?: string): JQuery {
        const _$menuItem = $(domElem("div")).addClass("workitem-search-dropdown-menu-item").attr("role","listitem").attr("tabindex","-1");
        const _$contentDiv = $(domElem("div")).css("position", "relative");

        const onClickDelegate = ((suggestion: Work_Item_Controls_Contracts.IMenuItem) => {
                return Utils_Core.delegate(this, (e: JQueryEventObject) => {
                    const _$searchBox = $(this._searchTextBoxCssSelector);
                    const _$item = $(e.target);
                    const _searchBox = <HTMLInputElement>_$searchBox.get(0);
                    const _inputText = _searchBox.value || "";
                    const _numberOfQuotes = _inputText.match(/\"/g);
                    const _unPairedQuotes: boolean = false;
                    let delimiter = DropDownHelper.DELIMITER_CHARACTERS;

                    if (_numberOfQuotes && _numberOfQuotes.length % 2 !== 0) {
                        delimiter = ['"'];
                    }

                    const _suggestionText: string = suggestion.shortHand.replace(/[\s]+/g, "") + ":";

                    const inputObject = DropDownHelper.getSuggestionToBeInsertedIntoSearchBox(
                        _inputText,
                        _inputText.length,
                        _suggestionText,
                        delimiter);

                    _$searchBox.val(inputObject.stringWithSuggestion);
                    DropDownHelper.setCaretPosition(_searchBox, inputObject.caretPosition);

                    TelemetryHelper.TelemetryHelper.traceLog({
                        WorkItemSuggestionDropdownClicked: true
                    });

                    _$item.removeClass("selected");

                    if (this._options.setSearchBoxValue) {
                        this._options.setSearchBoxValue(inputObject.stringWithSuggestion);
                    }

                    // start the suggestion process again.
                    _$searchBox.trigger("showpopup");

                    return false;
                });
            })(item);

        const _boldedText = hitText ? SearchBoxDropdown._getBoldedText(item.displayName, hitText) : item.displayName;
        _$contentDiv.html(_boldedText);
        _$menuItem.append(_$contentDiv);
        _$menuItem
            .unbind("click")
            .bind("click", onClickDelegate);

        if (item.helperText) {
            const _$helperTextSpan = $(domElem("span")).addClass("helpertext");
            _$helperTextSpan.text(item.helperText);
            _$contentDiv.append(_$helperTextSpan);
            if (Utils_String.ignoreCaseComparer(item.helperText, "Work item type") === 0) {
                _$helperTextSpan.css("padding-left", "2px");
            }
        }

        return _$menuItem;
    }

    private insertOperator(e: JQueryEventObject) {
        var _$searchBox = $(this._searchTextBoxCssSelector),
            _searchBox = <HTMLInputElement>_$searchBox.get(0),
            currentCursorPositionInSearchBox: number = DropDownHelper.getCaretPosition(_searchBox),
            searchText: string = _$searchBox.val(),
            clickedFilterText: string;

        if (e.target.childNodes && e.target.childNodes[0]) {
            clickedFilterText = e.target.childNodes[0].textContent;
        }

        if (!searchText) {
            searchText = clickedFilterText + " ";
            currentCursorPositionInSearchBox = searchText.length;
        }
        else {
            searchText = searchText.trim() + " " + clickedFilterText + " ";
            currentCursorPositionInSearchBox = searchText.length;
        }

        _$searchBox.val(searchText);
        DropDownHelper.setCaretPosition(_searchBox, currentCursorPositionInSearchBox);
        // start the suggestion process again.
        _$searchBox.trigger("showpopup");

        if (this._options.setSearchBoxValue) {
            this._options.setSearchBoxValue(searchText);
        }

        TelemetryHelper.TelemetryHelper.traceLog({
            "WorkItemOperatorClickedItem": clickedFilterText
        });

        return false;
    }

    public constructDefault(_$popupContainer: JQuery): JQuery {
        var _$menu = $(domElem("div"))
            .addClass("dropdown-menu")
            .attr("role","list")
            .attr("tabindex", "-1"),
            _$header = $(domElem("div")).addClass("dropdown-header")
                .append($(domElem("span")).text(Search_Resources.WorkItemHelperDropDownFieldFilters).css("font-weight", "bold")),
            _$menuOperators = $(domElem("div"))
                .addClass("workitem-search-dropdown-operators")
                .attr("role","list")
                .attr("tabindex", "-1"),
            _$help = this.createHelpLinkElement();

        for (var i = 0; i < MenuConstants.DEFAULT_MENU_ITEM_LIST.length; i++) {
            var _$menuItem = this.getMenuItem(MenuConstants.DEFAULT_MENU_ITEM_LIST[i]);
            _$menu.append(_$menuItem);
        }

        for (var j = 0; j < MenuConstants.DEFAULT_OPERATORS_ITEM_LIST.length; j++) {
            var _$operatorItem = this.createOperatorElement(MenuConstants.DEFAULT_OPERATORS_ITEM_LIST[j].displayName)
                .unbind('click')
                .bind('click', Utils_Core.delegate(this, this.insertOperator));
            _$menuOperators.append(_$operatorItem);
        }

        _$popupContainer.empty().append(_$header)
            .append(_$menu)
            .append($(domElem("div")).text(Search_Resources.WorkItemDropDownSuggestionText).addClass("suggestion"))
            .append($(domElem("div")).addClass("dropdown-operators")
                .append(this.createFilterTextElement().text(Search_Resources.WorkItemhelperDropDownOperatorsFields))
                .append(_$menuOperators))
            .append(_$help);

        return _$popupContainer;
    }

    /**
     * There can be a latency in the loading of a new suggestion provider as whenever
     * mode changes, there is a change in the suggestion provider. Hence empty the popupContainer
     * and identityPicker to avoid showing the suggestions of the old provider to the user.
     */
    private _onModeChange() {
        this._$popupContainer.empty();
        if (this._suggestionsProviders[Work_Item_Controls_Contracts.SuggestionDropdownMode.IdentitySuggestion]) {
            this._suggestionsProviders[Work_Item_Controls_Contracts.SuggestionDropdownMode.IdentitySuggestion].dispose();
            this._suggestionsProviders[Work_Item_Controls_Contracts.SuggestionDropdownMode.IdentitySuggestion] = null;
        }
    }

    private _onGetSuggestions(text: string, suggestionList: Array<Work_Item_Controls_Contracts.IMenuItem>): void {
        var refinedList = this._filter(text, suggestionList);
        if (refinedList.length > 0) {
            this._populateMenuItems(refinedList, text);
        }
        else {
            this._populateMenuItems([]);
        }

        this.show();
    }

    private _navigateSuggestions(isUp: boolean, _$menuItems: JQuery, _$currentSelectedMenuItem: JQuery): JQuery {
        if (_$currentSelectedMenuItem.length === 0) {
            _$currentSelectedMenuItem = isUp
                ? _$menuItems.last().addClass("selected")
                : _$menuItems.first().addClass("selected");
        }
        else {
            var currentSelectedMenuItemIndex = _$menuItems.index(_$menuItems.filter(".selected"));
            _$currentSelectedMenuItem.removeClass("selected");

            _$currentSelectedMenuItem = isUp
                ? _$menuItems.eq(currentSelectedMenuItemIndex - 1) :
                _$menuItems.eq(currentSelectedMenuItemIndex + 1);

            // select last or first menu item.
            if (_$currentSelectedMenuItem.length > 0) {
                _$currentSelectedMenuItem.addClass("selected");
            }
            else if (isUp) {
                _$currentSelectedMenuItem = _$menuItems.last().addClass("selected");
            }
            else {
                _$currentSelectedMenuItem = _$menuItems.first().addClass("selected")
            }
        }

        // Focus should be on present selected element and subsequent bindings should listen on this element 
        _$currentSelectedMenuItem.focus();
        return _$currentSelectedMenuItem;
    }

    private _showPopup(e: JQueryEventObject, data: any): void {
        if (e.target) {
            this._mode = Work_Item_Controls_Contracts.SuggestionDropdownMode.StaticDropDownSuggestion;
        }
    }

    private _populateMenuItems(items: Array<Work_Item_Controls_Contracts.IMenuItem>, text?: string): void {
        var _$menu = $(domElem("div"))
            .addClass("dropdown-menu")
            .attr("role","list")
            .attr("tabindex", "-1"),
            _$header = $(domElem("div")).addClass("dropdown-header"),
            _$help = this.createHelpLinkElement();

        _$header.append($(domElem("span")).text(Search_Resources.WorkItemHelperDropDownFieldFilters).css("font-weight", "bold"));

        for (var i = 0; i < items.length; i++) {
            var _$menuItem = this.getMenuItem(items[i], text);
            _$menu.append(_$menuItem);
        }

        if (items.length === 0) {
            _$menu.append($(domElem("div")).addClass("workitem-search-dropdown-menu-item").addClass("no-suggestion")
                .attr("role","listitem")
                .attr("tabindex", "-1")
                .text(Search_Resources.WorkItemhelperDropDownNosuggestions));
        }

        if (this._mode === Work_Item_Controls_Contracts.SuggestionDropdownMode.FieldSuggestion ||
            this._mode === Work_Item_Controls_Contracts.SuggestionDropdownMode.None) {
            var _$menuOperators = $(domElem("div"))
                .addClass("workitem-search-dropdown-operators")
                .attr("role","list")
                .attr("tabindex", "-1");

            for (var j = 0; j < MenuConstants.DEFAULT_OPERATORS_ITEM_LIST.length; j++) {
                var _$operatorItem = this.createOperatorElement(MenuConstants.DEFAULT_OPERATORS_ITEM_LIST[j].displayName)
                    .unbind('click')
                    .bind('click', Utils_Core.delegate(this, this.insertOperator));
                _$menuOperators.append(_$operatorItem);
            }

            this._$popupContainer.empty().append(_$header)
                .append(_$menu)
                .append($(domElem("div")).addClass("dropdown-operators")
                    .append(this.createFilterTextElement().text(Search_Resources.WorkItemhelperDropDownOperatorsFields))
                    .append(_$menuOperators))
                .append(_$help);
            return;
        }

        this._$popupContainer.empty().append(_$menu).append(_$help);

    }

    // Binding on esc and tab keys are required only for MainSearchBox as 
    // the bindings required for L1 search box are done in TFS.Host.MultiEntitySearch.ts
    private _onKeyDown(e: JQueryEventObject, isLargeSearchBox: boolean) {
        if (e.keyCode === Utils_UI.KeyCode.DOWN ||
            e.keyCode === Utils_UI.KeyCode.UP) {
            // set the focus on the identity picker so that keydown events can be listened and corresponding actions to be taken
            if (this._mode === Work_Item_Controls_Contracts.SuggestionDropdownMode.IdentitySuggestion) {
                this._suggestionsProviders[this._mode].focus();
                return false;
            }

            // add code to navigate the list of suggestions.
            var _$menuItems = $(this._$popupContainer).find(".workitem-search-dropdown-menu-item"),
                _$currentSelectedMenuItem = $(".workitem-search-dropdown-menu-item.selected", this._$popupContainer);

            _$currentSelectedMenuItem = this._navigateSuggestions(e.keyCode === Utils_UI.KeyCode.UP, _$menuItems, _$currentSelectedMenuItem);

            // reveal in the scroll viewer
            SearchBoxDropdown._reveal(_$currentSelectedMenuItem, e);
            this._bindMenuForKeyEvents(e);
            return false;
        }
        else if (isLargeSearchBox) {
            if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
                this.hide();
                TelemetryHelper.TelemetryHelper.traceLog({
                    "WorkItemSuggestionDropdownDismissed": true
                });

                return false;
            }
            else if (e.keyCode === Utils_UI.KeyCode.TAB) {
                this.hide();

                // Returning true so that the default event handling of tab key is not suppressed.
                return true;
            }
        }
    }

    private _bindMenuForKeyEvents(e: JQueryEventObject): void {
        // set focus on menu
        let _$menu = this._$popupContainer,
            _$menuItems = $(this._$popupContainer).find(".workitem-search-dropdown-menu-item"),
            _$currentSelectedMenuItem = $(".workitem-search-dropdown-menu-item.selected", this._$popupContainer),
            _$operatorItems = $(this._$popupContainer).find(".operator"),
            _$helppageSelector = $(this._$popupContainer).find(".dropdown-helpText");

        // remove focus from input text box.
        (<HTMLInputElement>e.target).blur();

        // bind menu for further key events
        _$menu
            .unbind("keydown.navigateSuggestion")
            .bind("keydown.navigateSuggestion", Utils_Core.delegate(this, (e: JQueryEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.DOWN ||
                    e.keyCode === Utils_UI.KeyCode.UP) {

                    // Navigation between operators happen with left and right arrow keys and if akey down or key up happpens on operators
                    // the navigation should go to help link or to last item in fields items
                    if (!_$currentSelectedMenuItem.hasClass("operator")) {
                        _$currentSelectedMenuItem = this._navigateSuggestions(e.keyCode === Utils_UI.KeyCode.UP, _$menuItems, _$currentSelectedMenuItem);
                    }
                    else {
                        _$currentSelectedMenuItem.removeClass("selected");
                        // When the user clicks the up arrow while the focus is on operators, the focus should shift to the last element of field suggestions.
                        // So we need to get the index of the last item in the fields which removes the no.of operators and help page from total menuitems - 1
                        _$currentSelectedMenuItem = e.keyCode === Utils_UI.KeyCode.UP
                            ? _$menuItems.eq(_$menuItems.length - _$operatorItems.length - _$helppageSelector.length - 1)
                            : _$menuItems.last();

                        _$currentSelectedMenuItem.addClass("selected");
                        // Focus should be on present selected element and subsequent bindings should listen on this element 
                        _$currentSelectedMenuItem.focus();
                    }

                    SearchBoxDropdown._reveal(_$currentSelectedMenuItem, e);
                    return false;
                }
                else if (e.keyCode === Utils_UI.KeyCode.RIGHT ||
                    e.keyCode === Utils_UI.KeyCode.LEFT) {
                    if (_$currentSelectedMenuItem.hasClass("operator")) {
                        _$currentSelectedMenuItem = this._navigateSuggestions(e.keyCode === Utils_UI.KeyCode.LEFT, _$operatorItems, _$currentSelectedMenuItem);
                    }

                }
                else if (e.keyCode === Utils_UI.KeyCode.ESCAPE) {
                    this.hide();
                    this.isEscaped = true;
                    this._$inputSearchBoxElement.focus();
                    TelemetryHelper.TelemetryHelper.traceLog({
                        "WorkItemSuggestionDropdownDismissed": true
                    });

                    return false;
                }
            }));

        // bind to keyup event for enter key press. As binding to keydown event for enter press is causing 
        // the keyup event handler to invoke after the text with suggestion is set in the search text box.
        _$menu
            .unbind("keyup.selectSuggestion")
            .bind("keyup.selectSuggestion", (Utils_Core.delegate(this, (e: JQueryEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.ENTER || e.keyCode === Utils_UI.KeyCode.SPACE) {
                    this._selectFocusedItem(e);
                    return false;
                }
            })));

        // Making KeyDown event for Tab key, as TAB keyup event for input controls doesn't fire as the focus gets away from the control.
        _$menu
            .unbind("keydown.selectSuggestion")
            .bind("keydown.selectSuggestion", (Utils_Core.delegate(this, (e: JQueryEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.TAB) {
                    this._selectFocusedItem(e);
                    return false;
                }
            })));
    }


    // Function to select the focused Item from the menu
    private _selectFocusedItem(e: JQueryEventObject): void {
        var _$currentSelectedMenuItem = $(".dropdown-menu .selected", this._$popupContainer);
        _$currentSelectedMenuItem.click();
        var keyLabel = e.keyCode === Utils_UI.KeyCode.TAB ? "TAB" : "ENTER";
        TelemetryHelper.TelemetryHelper.traceLog({
            "WorkItemSuggestionDropdownItemSelectionMode": keyLabel
        });
    }



    private _onKeyUp(e: JQueryEventObject, isLargeSearchBox: boolean): void {
        if (e.keyCode !== Utils_UI.KeyCode.TAB &&
            e.keyCode !== Utils_UI.KeyCode.UP &&
            e.keyCode !== Utils_UI.KeyCode.DOWN &&
            e.keyCode !== Utils_UI.KeyCode.ESCAPE &&
            e.keyCode !== Utils_UI.KeyCode.ENTER) {
            this.cancelDelayedFunction("WorkItemSearchSuggestionRefinement");
            this.delayExecute("WorkItemSearchSuggestionRefinement", 50, true, Utils_Core.delegate(this, () => {
                var _searchBox = <HTMLInputElement>e.target,
                    caretPosition = DropDownHelper.getCaretPosition(_searchBox),
                    inputText = _searchBox.value;
                if (caretPosition === inputText.length) {
                    this.setModeAndGetTextForFiltering(caretPosition, inputText,
                                                       Utils_Core.delegate(this, (refinementText) => {
                            this.refineSuggestions(refinementText)
                        }));
                }
            }));
        }
        else if (isLargeSearchBox && e.keyCode === Utils_UI.KeyCode.ENTER) {
            this.hide();
        }
    }

    /**
     * Hides the pop up container
     * It is made public beacuse this function is being used in a different file
     * @param e
     */
    public hide(e?): void {
        this._$popupContainer.hide();
        this._$popupContainer.addClass("collapsed");
        if (this._$inputSearchBoxElement) {
            this._$inputSearchBoxElement.attr("aria-expanded", "false");
        }
    }

    // Show the pop up container
    public show(e?): void {
        if (!this.isEscaped) {
            this._$popupContainer.removeClass("collapsed");
            this._$popupContainer.show();
            if (this._$inputSearchBoxElement) {
                this._$inputSearchBoxElement.attr("aria-expanded", "true");
            }
        }
        else {
            this.isEscaped = false;
        }
    }

    private _onDocumentClick(e?: JQueryEventObject) {
        var _$inputTextBox = $(this._searchTextBoxCssSelector).eq(0);
        if (!_$inputTextBox.is(e.target) &&
            _$inputTextBox.has(e.target).length === 0 &&
            !this._$popupContainer.is(e.target) &&
            this._$popupContainer.has(e.target).length === 0) {
            this.hide();
        }
    }

    private _filter(text: string, suggestionList: Array<Work_Item_Controls_Contracts.IMenuItem>): Array<Work_Item_Controls_Contracts.IMenuItem> {
        var filteredSuggestionList: Array<Work_Item_Controls_Contracts.IMenuItem> = new Array<Work_Item_Controls_Contracts.IMenuItem>();

        text = (text != null) ? text.trim() : "";

        for (var i in suggestionList) {
            var substringIndex = suggestionList[i]
                .displayName
                .replace(/[\s]+/g, '')
                .toLowerCase()
                .indexOf(text.toLowerCase());

            // Modify this if condition when substring matches are to be included.
            if (substringIndex === 0) {
                filteredSuggestionList.push(suggestionList[i]);
            }
        }

        return filteredSuggestionList;
    }

    private static _getBoldedText(text: string, hitText: string): string {
        // hitText should be the prefix within text.
        var hitTextLength = hitText.length,
            spacePosition = text.indexOf(" ");
        // This logic is used when text contains space in it
        // If hit text contains characters after space from suggestions then we need to increment 
        // hit text length to show the characters after space in bold correctly
        while (spacePosition > 0) {
            if (hitTextLength > spacePosition) {
                hitTextLength = hitTextLength + 1;
                spacePosition = text.indexOf(" ", spacePosition + 1);
            }
            else {
                break;
            }
        }

        var startIndex = text.toLowerCase().replace(/\s/g, "").indexOf(hitText.toLowerCase());
        return hitText !== "" && startIndex === 0 ? "{0}<b>{1}</b>"
            .replace("{0}", text.substr(startIndex, hitTextLength))
            .replace("{1}", text.substr(startIndex + hitTextLength))
            : text;
    }

    private static _reveal($item: JQuery, e: JQueryEventObject): void {
        var _$scrollable: JQuery = $item.parent();
        if (e.keyCode === Utils_UI.KeyCode.DOWN) {
            Utils_UI.Positioning.scrollIntoViewVertical($item, Utils_UI.Positioning.VerticalScrollBehavior.Bottom);
        }
        else if (e.keyCode === Utils_UI.KeyCode.UP) {
            Utils_UI.Positioning.scrollIntoViewVertical($item, Utils_UI.Positioning.VerticalScrollBehavior.Top);
        }
    }

    // Empty the pop up container and hide the pop up container
    private _cleanAndHidePopUpContainer(): void {
        this._$popupContainer.empty();
        this._$popupContainer.hide();
        this._$popupContainer.addClass("collapsed");
        if (this._$inputSearchBoxElement) {
            this._$inputSearchBoxElement.attr("aria-expanded", "false");
        }
    }

    private createFilterTextElement(): JQuery {
        return $(domElem("div")).addClass("filter-text");
    }

    private createHelpLinkElement(): JQuery {
        return $(domElem("div")).addClass("dropdown-helpText").text(Search_Resources.WorkItemHelperDropDownHelpText)
            .append($(domElem('a'))
                .addClass("workitem-search-dropdown-menu-item")
                .text(Search_Resources.WorkItemSearchHelpPage)
                .attr('target', '_blank')
                .attr('href', SearchConstants.WorkItemLearnMoreLink)
                .attr('tabindex', '-1')
                .attr('alt', Search_Resources.WorkItemHelperDropDownHelpTextDescription)
                .unbind("click")
                .bind("click", () => {
                    TelemetryHelper.TelemetryHelper.traceLog({ "WorkItemDropDownHelpLinkClick": true });
                }));
    }

    private createOperatorElement(text: string): JQuery {
        return $(domElem("div", "workitem-search-dropdown-menu-item")).addClass("operator").attr("role","listitem").attr("tabindex","-1").text(text);
    }
}

/**
* Provides fields suggestions for the helper dropdown for work item search
*/
export class FieldSuggestionProvider implements Work_Item_Controls_Contracts.ISuggestionProvider {
    private _suggestionList: Array<Work_Item_Controls_Contracts.IMenuItem>;

    constructor() {
    }

    private static _getComparer(): (a: Work_Item_Controls_Contracts.IMenuItem, b: Work_Item_Controls_Contracts.IMenuItem) => number {
        return (a: Work_Item_Controls_Contracts.IMenuItem, b: Work_Item_Controls_Contracts.IMenuItem) => {
            return Utils_String.ignoreCaseComparer(a.displayName, b.displayName);
        };
    }

    public getSuggestions(onSuccess: Function): void {
        if (onSuccess && $.isFunction(onSuccess)) {
            onSuccess([]);
        }
    }

    public getSelectedSuggestionText(menuItem: Work_Item_Controls_Contracts.IMenuItem): string {
        var value: string = menuItem.shortHand.replace(/[\s]+/g, "");
        if (menuItem.type === Work_Item_Controls_Contracts.MenuItemTypes.String ||
            menuItem.type === Work_Item_Controls_Contracts.MenuItemTypes.Boolean ||
            menuItem.type === Work_Item_Controls_Contracts.MenuItemTypes.Identity) {
            value += ":";
        }

        return value;
    }

    public dispose(): void {
    }

    public focus(): void {
    }

    public tryGetFieldType(
        name: string,
        callbackOnGettingFieldType: (fieldType: Work_Item_Controls_Contracts.MenuItemTypes) => void)
        : void {
        if (callbackOnGettingFieldType && $.isFunction(callbackOnGettingFieldType)) {

            var callbackOnGettingList: Function = ((name) => {
                return (list: Array<Work_Item_Controls_Contracts.IMenuItem>) => {
                    if (list) {
                        var type: Work_Item_Controls_Contracts.MenuItemTypes,
                            filteredArray = list.filter((item: Work_Item_Controls_Contracts.IMenuItem) => {
                                return (Utils_String.ignoreCaseComparer(item.shortHand.replace(/\s+/g, ""), name) === 0
                                    || Utils_String.ignoreCaseComparer(item.displayName.replace(/\s+/g, ""), name) === 0);
                            });

                        if (filteredArray.length === 1) {
                            type = filteredArray[0].type;
                        }
                        callbackOnGettingFieldType(type);
                    }
                };
            })(name);

            this.getSuggestions(callbackOnGettingList);
        }
    }

    private _getMenuItemType(fieldType: Work_Item_Contracts.FieldType): Work_Item_Controls_Contracts.MenuItemTypes {
        if (fieldType === Work_Item_Contracts.FieldType.Double ||
            fieldType === Work_Item_Contracts.FieldType.Integer) {
            return Work_Item_Controls_Contracts.MenuItemTypes.Numeric;
        }

        if (fieldType === Work_Item_Contracts.FieldType.Guid ||
            fieldType === Work_Item_Contracts.FieldType.History ||
            fieldType === Work_Item_Contracts.FieldType.Html ||
            fieldType === Work_Item_Contracts.FieldType.PlainText ||
            fieldType === Work_Item_Contracts.FieldType.String ||
            fieldType === Work_Item_Contracts.FieldType.TreePath) {
            return Work_Item_Controls_Contracts.MenuItemTypes.String;
        }

        if (fieldType === Work_Item_Contracts.FieldType.Boolean) {
            return Work_Item_Controls_Contracts.MenuItemTypes.Boolean;
        }

        if (fieldType === Work_Item_Contracts.FieldType.DateTime) {
            return Work_Item_Controls_Contracts.MenuItemTypes.DateTime;
        }

        if (fieldType === Work_Item_Contracts.FieldType.Identity) {
            return Work_Item_Controls_Contracts.MenuItemTypes.Identity;
        }
    }

    private static _getHelpTextForKnownItems(displayName: string): string {
        if (HELPER_TEXT_MENU_ITEM_LIST[displayName.toLocaleLowerCase()]) {
            return HELPER_TEXT_MENU_ITEM_LIST[displayName.toLocaleLowerCase()];
        }
    }
}

/**
* Provides operator suggestions for the helper dropdown for work item search
*/
class NumericOperatorSuggestionProvider implements Work_Item_Controls_Contracts.ISuggestionProvider {
    private _suggestionList: Array<Work_Item_Controls_Contracts.IMenuItem>;
    private _newSuggestionList: Array<Work_Item_Controls_Contracts.IMenuItem>;

    constructor() {
        this._newSuggestionList = [
            {
                displayName: "=",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Operator,
                shortHand: "=",
                helperText: ""
            },
            {
                displayName: "!=",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Operator,
                shortHand: "!=",
                helperText: ""
            },
            {
                displayName: ">",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Operator,
                shortHand: ">",
                helperText: ""
            },
            {
                displayName: "<",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Operator,
                shortHand: "<",
                helperText: ""
            },
            {
                displayName: ">=",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Operator,
                shortHand: ">=",
                helperText: ""
            },
            {
                displayName: "<=",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Operator,
                shortHand: "<=",
                helperText: ""
            }
        ];
    }

    public getSuggestions(onSuccess: Function): void {
        if (onSuccess && $.isFunction(onSuccess)) {
            onSuccess(this._newSuggestionList);
        }
    }

    public getSelectedSuggestionText(menuItem: Work_Item_Controls_Contracts.IMenuItem): string {
        return menuItem.shortHand;
    }

    public tryGetFieldType(
        name: string,
        callbackOnGettingFieldType: (fieldType: Work_Item_Controls_Contracts.MenuItemTypes) => void)
        : void {
        var type: Work_Item_Controls_Contracts.MenuItemTypes;
        if (this._suggestionList) {
            var filteredArray = this._suggestionList.filter((item: Work_Item_Controls_Contracts.IMenuItem) => {
                return item.displayName.replace(/\s+/g, "") === name;
            });

            if (filteredArray.length === 1) {
                type = filteredArray[0].type;
            }
        }

        callbackOnGettingFieldType(type);
    }

    public focus(): void {
    }

    public dispose(): void {
    }
}

/**
* Provides date time value suggestions for the helper dropdown for work item search
*/
class DateTimeValueSuggestionProvider implements Work_Item_Controls_Contracts.ISuggestionProvider {
    private _suggestionList: Array<Work_Item_Controls_Contracts.IMenuItem>;

    constructor() {
        // Order of the list populated will be maintained in sort.
        this._suggestionList = [
            {
                displayName: "@Today",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Value,
                shortHand: "@Today",
                helperText: ""
            },
            {
                displayName: "@Today-1",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Value,
                shortHand: "@Today-1",
                helperText: ""
            },
            {
                displayName: "@Today-7",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Value,
                shortHand: "@Today-7",
                helperText: ""
            },
            {
                displayName: "@Today-30",
                type: Work_Item_Controls_Contracts.MenuItemTypes.Value,
                shortHand: "@Today-30",
                helperText: ""
            }
        ];
    }

    public getSuggestions(onSuccess: Function): void {
        if (onSuccess && $.isFunction(onSuccess)) {
            onSuccess(this._suggestionList);
        }
    }

    public getSelectedSuggestionText(menuItem: Work_Item_Controls_Contracts.IMenuItem): string {
        return menuItem.shortHand;
    }

    public tryGetFieldType(
        name: string,
        callbackOnGettingFieldType: (fieldType: Work_Item_Controls_Contracts.MenuItemTypes) => void)
        : void {
        var type: Work_Item_Controls_Contracts.MenuItemTypes;
        if (this._suggestionList) {
            var filteredArray = this._suggestionList.filter((item: Work_Item_Controls_Contracts.IMenuItem) => {
                return item.displayName.replace(/\s+/g, "") === name;
            });

            if (filteredArray.length === 1) {
                type = filteredArray[0].type;
            }
        }

        callbackOnGettingFieldType(type);
    }

    public focus(): void {
    }

    public dispose(): void {
    }
}