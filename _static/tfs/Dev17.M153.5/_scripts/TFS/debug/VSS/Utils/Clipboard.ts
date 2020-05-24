import Utils_String = require("VSS/Utils/String");
import Utils_Core = require("VSS/Utils/Core");
import VSS = require("VSS/VSS");

import Dialogs_NoRequire = require("VSS/Controls/Dialogs");

var FORMAT_TEXT = "text";

/**
 * Copies the specified data in HTML format using the old execCommand("copy") API
 * 
 * @param data The HTML string to copy.
 * @param copyAsHtml Whether or not copy the data as html.
 */
function nativeCopy(data: string, copyAsHtml: boolean): boolean {
    var success = false;

    if (!copyAsHtml && (<any>window).clipboardData !== undefined) {
        (<any>window).clipboardData.setData(FORMAT_TEXT, data);
        success = true;
    }
    else {
        var range, sel, r;
        // Create an element in the dom with the content to be copied.
        var $copyContent = $("<div/>");
        try {

            //body can have its own background color.
            $copyContent.css("background-color", "white");
            
            if (copyAsHtml) {
                $copyContent.append(data);
            }
            else {
                $copyContent.css("white-space", "pre");
                $copyContent.text(data);
            }

            if ((<any>document.body).createTextRange) {
                // Use prependTo instead of appendTo as this way of copying data has a bug that the copied data will include a new line character
                // Using prependTo fixes this bug. 
                // Note that this bug doesnt appear in the new way of copying data, thats why in the else condition
                // we use appendTo instead
                $copyContent.prependTo($("body"));

                range = (<any>document.body).createTextRange();
                range.moveToElementText($copyContent[0]);
                range.select();
                success = range.execCommand("copy");
            }
            else if (document.createRange && window.getSelection) {
                $copyContent.appendTo($("body"));

                range = document.createRange();
                sel = window.getSelection();
                sel.removeAllRanges();

                range.selectNodeContents($copyContent[0]);
                sel.addRange(range);
                success = (<any>document).execCommand("copy");
            }
        }
        finally {
            // Remove the content from the dom.
            $copyContent.remove();
        }
    }

    return success;
}

/**
 * To support non-IE browser copy, opens a new popup window and writes the table to the window allowing the user to copy manually.
 * 
 * @param data The data to place on the clipboard (via a popup window).
 */
function copyUsingNewWindow(data: string, options?: IClipboardOptions) {
    var dialogOptions: Dialogs_NoRequire.CopyContentDialogOptions;

    if (!options || !options.copyDialogOptions) {
        dialogOptions = {
            data: data
        };
        if (options) {
            dialogOptions.copyAsHtml = options.copyAsHtml;
        }
    } else {
        dialogOptions = options.copyDialogOptions;
        dialogOptions.data = data;
        dialogOptions.copyAsHtml = options.copyAsHtml
    }

    VSS.using(["VSS/Controls/Dialogs"], (_Dialogs: typeof Dialogs_NoRequire) => {
        _Dialogs.show(_Dialogs.CopyContentDialog, dialogOptions);
    });
}


/**
 * Copies the specified data to the clipboard in the TEXT format using a progressively degrading experience.
 * 
 * @param data The data to copy.
 */
export function copyToClipboard(data: string, options?: IClipboardOptions) {
    if (data && typeof data === "string") {
        if (options && options.showCopyDialog) {
            // force show copy dialog to avoid confusing behavior in certain use cases
            copyUsingNewWindow(data, options);
        }
        else {
            var dataCopied = false;
            if (options && options.copyAsHtml) {
                // HTML Copy
                if (supportsNativeHtmlCopy()) {
                    try {
                        dataCopied = nativeCopy(data, true);
                    }
                    catch (ex) { }
                }
            }
            else {
                // Plain text copy
                if (supportsNativeCopy()) {
                    try {
                        dataCopied = nativeCopy(data, false);
                    }
                    catch (ex) { }
                }
            }

            if (!dataCopied) {
                copyUsingNewWindow(data, options);
            }
        }
    }
}

/**
 * Gets a boolean value indicating whether the current browser supports native clipboard access.
 */
export function supportsNativeCopy(): boolean {
    return document.queryCommandSupported("copy") || (<any>window).clipboardData !== undefined;
}

/**
 * Gets a boolean value indicating whether the current browser supports native clipboard access for HTML content.
 */
export function supportsNativeHtmlCopy(): boolean {
    return (<any>document.body).createTextRange !== undefined
        || (document.queryCommandSupported("copy") && document.createRange !== undefined);
}

/**
 * Options for Copy To Clipboard feature
 */
export interface IClipboardOptions {
    /**
     * Boolean specifying whether the data should be copied as plain text or html
     */
    copyAsHtml?: boolean;

    /**
     * Option for always using copy to clipboard dialog or browser native feature (if present)
     */
    showCopyDialog?: boolean;

    /**
     * Options passed to copy dialog if needed
     */
    copyDialogOptions?: Dialogs_NoRequire.CopyContentDialogOptions
}
