// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Constants = require("Search/Scripts/Common/TFS.Search.Constants");
import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import PopupContent = require("VSS/Controls/PopupContent");
import Helpers = require("Search/Scripts/Common/TFS.Search.Helpers");
import Search_Resources = require("Search/Scripts/Resources/TFS.Resources.Search");
import Utils_Core = require("VSS/Utils/Core");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

import domElem = Utils_UI.domElem;

/**
* Helper class for customizing and working with search box
*/
export class SearchBoxHelper {

    private static DEFAULT_SEARCHBOX_CSS_SELECTOR: string = ".search-box";
    private static ICON_CANCEL_CSS_CLASS_SELECTOR: string = ".bowtie-edit-remove";
    private static MAIN_SEARCH_BOX_WRAPPER_CSS_SELECTOR: string = ".main-search-box";
    private static MAIN_SEARCH_BOX_SEARCH_ICON: string = ".main-search-box .bowtie-icon.bowtie-search";
    private static SEARCHBOX_INPUT_TEXT_CSS_SELECTOR: string = ".search-text";
    private static MAIN_SEARCH_BOX_CSS_SELECTOR: string = ".large-search-box";
    private static LARGE_SEARCH_BOX_INPUT_TEXT_CSS_SELECTOR: string = ".large-search-box > .search-text";

    private static SEARCH_BOX_SELECTOR_ID: string = "#searchbox";

    private static DEFAULT_SEARCH_BOX_CLASS: string = "header-search";
    private static MAIN_SEARCH_BOX_CSS_CLASS: string = "large-search-box";
    private static MAIN_SEARCH_BOX_ADAPTER_CSS_SELECTOR: string = ".search-adapter-search";

    /**
    * Search box at the top right is detacted and attched as main search box in our portal page
    */
    public static customizeSearchBox(): void {
        var $cancel: JQuery,
            $searchTextBox: JQuery,
            $searchBox: JQuery = $(SearchBoxHelper.DEFAULT_SEARCHBOX_CSS_SELECTOR).last().detach();

        $searchBox.removeClass(SearchBoxHelper.DEFAULT_SEARCH_BOX_CLASS).addClass(SearchBoxHelper.MAIN_SEARCH_BOX_CSS_CLASS);

        // Append a new span for cancel search icon
        $(SearchBoxHelper.ICON_CANCEL_CSS_CLASS_SELECTOR)
            .unbind("click")
            .bind("click", Utils_Core.delegate(this, SearchBoxHelper.clearSearchBox));

        // Prepend to container as appending causes the helper dropdown container to preceed the search text box div.
        // But Ideally the helper dropdown container should come after the search box div in the DOM.
        $(SearchBoxHelper.MAIN_SEARCH_BOX_WRAPPER_CSS_SELECTOR).prepend($searchBox);

        $(SearchBoxHelper.MAIN_SEARCH_BOX_SEARCH_ICON)
            .attr('tabindex', '0')
            .attr('aria-label', Search_Resources.SearchLabel)
            .attr("role", "button")
            .keydown(Utils_Core.delegate(this, (e: JQueryEventObject) => {
                if (e.keyCode === Utils_UI.KeyCode.ENTER) {
                    $(e.target).click();
                }
            }));
        // Select the input box and attach to keypress/onFocus event to change the cancel icon.
        // Removing spellcheck attribute to the search Text Box to remove red squiggly lines in the search text box  for successful reults.
        $searchTextBox = $(SearchBoxHelper.SEARCHBOX_INPUT_TEXT_CSS_SELECTOR)
            .attr("spellcheck", "false")
            .attr("role", "combobox")
            .removeAttr("title")
            .attr("aria-autocomplete", "list")
            .attr("aria-expanded", "false");

        // Removing label for accessibility
        $(SearchBoxHelper.SEARCH_BOX_SELECTOR_ID).prev().remove();

        $searchTextBox
            .unbind("keyup.updateCancelIcon")
            .bind("keyup.updateCancelIcon", Utils_Core.delegate(this, SearchBoxHelper.updateCancelIcon))
            .unbind("focusin.updateCancelIcon")
            .bind("focusin.updateCancelIcon", Utils_Core.delegate(this, SearchBoxHelper.updateCancelIcon));

        if (Helpers.Utils.isIE()) {
            SearchBoxHelper.setupMultiLineInputFromClipBoardHandler();
        }
    }
    

    public static registerSearchBoxToAnEntityType(entityTypeId: string, callback?: Function): void {
        var $adapterElement: JQuery = $(SearchBoxHelper.MAIN_SEARCH_BOX_ADAPTER_CSS_SELECTOR).attr("role","search");

        if (entityTypeId === Constants.SearchConstants.ProjectEntityTypeId) {
            // Register search box to projectsearch adapter
            if ($adapterElement.length) {
                VSS.using(["Search/Scripts/Providers/Project/TFS.Search.Registration.ProjectSearchAdapter"], (_SearchAdapters: any) => {
                    Controls.Enhancement.registerEnhancement(_SearchAdapters.ProjectSearchAdapter, SearchBoxHelper.MAIN_SEARCH_BOX_ADAPTER_CSS_SELECTOR);
                    if (callback && $.isFunction(callback)) {
                        callback($adapterElement);
                    }
                });
            }
        }
        else if (entityTypeId === Constants.SearchConstants.CodeEntityTypeId) {
            // Register search box to codesearch adapter
            if ($adapterElement.length) {
                VSS.using(["Search/Scripts/Providers/Code/TFS.Search.Registration.SearchAdapters"], (_SearchAdapters: any) => {
                    Controls.Enhancement.registerEnhancement(_SearchAdapters.SearchSearchAdapter, SearchBoxHelper.MAIN_SEARCH_BOX_ADAPTER_CSS_SELECTOR);
                    $(SearchBoxHelper.SEARCH_BOX_SELECTOR_ID).removeAttr("title");
                    if (callback && $.isFunction(callback)) {
                        callback($adapterElement);
                    }
                });
            }
        }
        else if (entityTypeId === Constants.SearchConstants.WorkItemEntityTypeId) {
            // Register search box to workitem adapter
            if ($adapterElement.length) {
                VSS.using(["Search/Scripts/Providers/WorkItem/TFS.Search.Registration.WorkItemSearchAdapter"], (_SearchAdapters: any) => {
                    Controls.Enhancement.registerEnhancement(_SearchAdapters.SearchWorkItemSearchAdapter, SearchBoxHelper.MAIN_SEARCH_BOX_ADAPTER_CSS_SELECTOR);
                    $(SearchBoxHelper.SEARCH_BOX_SELECTOR_ID).removeAttr("title");
                    if (callback && $.isFunction(callback)) {
                        callback($adapterElement);
                    }
                });
            }
        }
    }

    /**
    * Sets up handler for intercepting Ctrl + V (paste) operation from clipboard in IE.
    * This allows us to convert multi line search snippets into a single string by replacing
    * new lines with space (IE's text input element accepts only one line).
    *
    * Note: Other browsers doesn't suffer from this issue as they do the same thing internally
    */
    private static setupMultiLineInputFromClipBoardHandler(): void {
        var $searchBox: JQuery = SearchBoxHelper.getSearchBoxJqueryObject(),
            searchBoxElement: HTMLInputElement = SearchBoxHelper.getSearchBoxElement($searchBox);
        if (searchBoxElement) {
            searchBoxElement.onpaste = function (e) {
                var windowClipBoardData = (<any>window).clipboardData;

                if (windowClipBoardData && windowClipBoardData.getData && windowClipBoardData.getData('Text').split("\r\n").length > 1) {
                    var caretPos: number = SearchBoxHelper.getCaretPosition(searchBoxElement),
                        currentString: string = $searchBox.val(),
                        preString: string = currentString.substring(0, caretPos),
                        postString: string = currentString.substring(caretPos, currentString.length),
                        clipboardData: string = windowClipBoardData.getData('Text').split("\r\n").join(" "),
                        newString: string = preString + clipboardData + postString;

                    caretPos = preString.length + clipboardData.length;
                    $searchBox.val(newString);
                    SearchBoxHelper.setCaretPosition(searchBoxElement, caretPos);

                    return false; // Prevent the default handler from running.
                }
                else {
                    return true; // If not multiline default handler is called.
                }
            };
        }
    }

    /**
    * @return Returns Jquery object of search box.
    */
    public static getSearchBoxJqueryObject(searchBoxCss: string = SearchBoxHelper.MAIN_SEARCH_BOX_CSS_SELECTOR): JQuery {
        Diag.Debug.assertIsNotNull($(searchBoxCss), "CSS selector isn't working");
        return $(searchBoxCss).find(SearchBoxHelper.SEARCH_BOX_SELECTOR_ID);
    }

    /**
    * @return search box element from search page.
    */
    public static getSearchBoxElement($searchBox: JQuery): HTMLInputElement {
        if ($searchBox) {
            return <HTMLInputElement>$searchBox.get(0);
        }
    }

    /**
    * Sets the focus in Search box
    */
    public static setFocusInSearchBox(): void {
        $(SearchBoxHelper.LARGE_SEARCH_BOX_INPUT_TEXT_CSS_SELECTOR).focus();
    }

    /** 
    * Sets the current cursor position inside the search box
    * @param Search-box HTMLInputElement
    * @param Current caret position in search-box
    */
    public static setCaretPosition(searchBoxElement: HTMLInputElement, caretPos: number): void {
        if (searchBoxElement.setSelectionRange) { //Only use if IE version supports 
            searchBoxElement.focus();
            searchBoxElement.setSelectionRange(caretPos, caretPos);
        }
        else if ((<any>searchBoxElement).createTextRange) {
            var range = (<any>searchBoxElement).createTextRange();
            range.collapse(true);
            range.moveEnd('character', caretPos);
            range.moveStart('character', caretPos);
            range.select();
        }
    }
    /** 
    * @param Search-box HTMLInputElement
    * @return Returns the current cursor position inside the search box
    */
    public static getCaretPosition(searchBoxElement: HTMLInputElement): number {
        var position = 0;
        const ieSearchBoxElement = searchBoxElement;
        // Firefox support
        if ('selectionStart' in searchBoxElement) {
            position = searchBoxElement.selectionStart;
        }
        // IE Support
        else if (Utils_Core.documentSelection && Utils_Core.documentSelection.createRange) {
            ieSearchBoxElement.focus();
            var sel = Utils_Core.documentSelection.createRange();
            var selLength = Utils_Core.documentSelection.createRange().text.length;
            sel.moveStart('character', -ieSearchBoxElement.value.length);
            position = sel.text.length - selLength;
        }
        return position;
    }

    private static updateCancelIcon(e?): void {
        var $searchBox: JQuery = SearchBoxHelper.getSearchBoxJqueryObject(),
            $icon: JQuery,
            searchText = $searchBox.val();

        searchText = $.trim(searchText);
        $icon = $(SearchBoxHelper.MAIN_SEARCH_BOX_WRAPPER_CSS_SELECTOR)
            .find(SearchBoxHelper.ICON_CANCEL_CSS_CLASS_SELECTOR);

        if (searchText && $icon.length > 0) {
            $icon.css("display", "inline");
        }
        else {
            $icon.css("display", "none");
        }
        $icon.removeAttr("title");
    }

    private static clearSearchBox(e?): void {
        var $searchBox: JQuery = SearchBoxHelper.getSearchBoxJqueryObject();
        $searchBox.val("");
        $searchBox.blur();
        SearchBoxHelper.updateCancelIcon();
    }
}