// Copyright (c) Microsoft Corporation. All rights reserved.

"use strict";

import Utils_Core = require("VSS/Utils/Core");

export class DropDownHelper {
    public static DELIMITER_CHARACTERS: Array<string> = [' ', '<', '>', ':', '=', '"', "!"];

    /**
    * Given the input text and the caret position this method returns the final string with
    * suggestion text substituted along with the caret position to be set in the main search box.
    * Method is made public so that is it L0 testable.
    * @param inputText
    * @param caretPosition
    * @param suggestion
    * @param delimiters
    */
    public static getSuggestionToBeInsertedIntoSearchBox(inputText: string, currentCaretPosition: number, suggestionText: string, delimiters: Array<string>): any {
        if (suggestionText) {
            var _caretInfoObject = this.getTextUnderCarret(currentCaretPosition, inputText, delimiters),
                startIndex = _caretInfoObject.startIndex,
                endIndex = _caretInfoObject.endIndex,
                _numberOfQuotes = inputText.match(/\"/g);
            //Removing Single Quote from the string if it contains odd number of quotes
            //As suggested text contains quotes surrounded which will give extra quote in resukted string
            if (startIndex > 0 && inputText.charAt(startIndex - 1) === "\"" && _numberOfQuotes && _numberOfQuotes.length % 2 !== 0) {
                inputText = inputText.slice(0, startIndex - 1) + inputText.slice(startIndex);
                startIndex--;
                endIndex--;
            }
            var prevSubString = inputText.substr(0, startIndex).trim(),
                nextSubString = inputText.substr(endIndex + 1).trim(),
                stringUptoSuggestion = prevSubString + (prevSubString !== "" ? " " : "") + suggestionText + " ",
                stringWithSuggestion = stringUptoSuggestion + nextSubString;
            return {
                stringWithSuggestion: stringWithSuggestion,
                caretPosition: stringUptoSuggestion.length
            }
        }
    }

    /**
     * Given the caret position and the text in the text box. The method returns and object
     * with information about the text under caret.
     * "content" is the string token under caret.
     * "startIndex" is the index(0 based) from where the token substring starts.
     * "endIndex" is the index where the token substring ends in the input text.
     * @param pos
     * @param str
     */
    public static getTextUnderCarret(pos: number, str: string, delimiters: Array<string>): any {
        var tokenStart = pos - 1,
            tokenEnd = pos;
        // get the start Index
        while (tokenStart > 0 &&
            delimiters.indexOf(str.charAt(tokenStart)) === -1) {
            tokenStart--;
        }

        // get the end Index
        while (tokenEnd < str.length - 1 &&
            delimiters.indexOf(str.charAt(tokenEnd)) === -1) {
            tokenEnd++;
        }

        var startIndex = tokenStart > 0 ? tokenStart + 1 : 0,
            endIndex = tokenEnd < str.length - 1 ? tokenEnd - 1 : tokenEnd;
        return {
            startIndex: startIndex,
            endIndex: endIndex,
            content: str.substr(startIndex, endIndex - startIndex + 1)
        };
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
}