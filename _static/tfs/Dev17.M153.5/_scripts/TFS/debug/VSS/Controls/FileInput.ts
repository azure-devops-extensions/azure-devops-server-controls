/// <amd-dependency path='VSS/LoaderPlugins/Css!VSS.Controls' />

import Controls = require("VSS/Controls");
import Diag = require("VSS/Diag");
import Notifications = require("VSS/Controls/Notifications");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Utils_Core = require("VSS/Utils/Core");
import Utils_File = require("VSS/Utils/File");
import Utils_String = require("VSS/Utils/String");
import Utils_UI = require("VSS/Utils/UI");
import VSS = require("VSS/VSS");

const domElem = Utils_UI.domElem;
const delegate = Utils_Core.delegate;

/**
* Options for the file input control.
*/
export interface FileInputControlOptions {
    /**
     * DEPRECATED. Use initialDrop instead for better experience when folders are dropped.
     */
    initialFiles?: FileList;
    initialDrop?: DataTransfer;
    maximumNumberOfFiles?: number;
    maximumTotalFileSize?: number;
    maximumSingleFileSize?: number;
    detectEncoding?: boolean;
    fileNamesCaseSensitive?: boolean;
    resultContentType?: FileInputControlContentType;
    /**
    * Specifies the allowed file extensions. For example: [ "zip", "exe" ]
    */
    allowedFileExtensions?: string[];
    updateHandler: (updateEvent: FileInputControlUpdateEventData) => void;
    /**
    * Callback executed whenever a user bumps into the limit of the file upload control.
    * @param currentMessage The message provided by the control itself.
    * @param limitEvent The context data about why the limit was hit.
    * @returns A message that will be shown to the user in place of currentMessage.
    */
    limitMessageFormatter?: (currentMessage: string, limitEvent: FileInputControlLimitEventData) => string;
    /**
     * Accessibility: aria-describedby for 'Browse' button
     */
    browseButtonAriaDescribedBy?: string;
}

/**
* File result from files uploaded to the FileInputControl.
*/
export interface FileInputControlResult {
    name: string;
    type: string;
    size: number;
    lastModifiedDate: Date;
    content?: string;
    encoding?: Utils_File.FileEncoding;
    file?: File;
}

export enum FileInputControlContentType {
    Base64EncodedText,
    RawText,
    RawFile
}

/**
* Event data passed to FileInputControl update events.
*/
export interface FileInputControlUpdateEventData {
    loading: boolean;
    files: FileInputControlResult[];
}

/**
* Context for the limit message handler on why the upload limit was reached.
*/
export interface FileInputControlLimitEventData {
    /**
    * Size of the file that was too large, in bytes.
    */
    fileSize?: number;
    /**
    * Total size of all files, if the size was too large, in bytes.
    */
    totalSize?: number;
    /**
    * Number of files the user attempted to upload, if it was capped by maximumNumberOfFiles in the options.
    */
    fileCount?: number;
}

/**
* Information about a row in the file input control
*/
export interface FileInputControlRow {
    $listElement: JQuery;
    $statusElement: JQuery;
    $fileNameElement: JQuery;
    result: FileInputControlResult;
}

interface FileInputControlPendingResult {
    fileReader: FileReader;
    result: FileInputControlResult;
}

/**
* HTML5 based file input control which accepts one or multiple files with
* browse and drag/drop support. Reads content as a base64 encoded string.
*/
export class FileInputControl extends Controls.Control<FileInputControlOptions> {

    private _$fileInputContainer: JQuery;
    private _$fileList: JQuery;
    private _inputOptions: FileInputControlOptions;
    private _results: FileInputControlResult[];
    private _pendingResults: FileInputControlPendingResult[];
    private _rows: FileInputControlRow[];
    private _$overallStatusContainer: JQuery;
    private _$overallStatusText: JQuery;
    private _$errorMessageContainer: JQuery;
    private _$browseButton: JQuery;
    /*
    * Creates a FileInput control within the given container element
    *
    * @param $container Element to create the control in
    * @param options File input control options
    */
    public static createControl($container: JQuery, options: FileInputControlOptions): FileInputControl {
        const control = <FileInputControl>Controls.BaseControl.createIn(FileInputControl, $container, $.extend({}, options));
        return control;
    }

    /**
    * Is this control supported on the current browser? Requires HTML5 FileReader support which
    * is present on all supported browsers except IE9.
    */
    public static isSupported(): boolean {
        return typeof (<any>window).FileReader !== "undefined";
    }

    public initializeOptions(options?) {
        super.initializeOptions(<FileInputControlOptions>$.extend({
            coreCssClass: "core-file-input-control"
        }, options));
    }

    public initialize() {
        super.initialize();

        this._inputOptions = <FileInputControlOptions>this._options;
        this._results = [];
        this._pendingResults = [];
        this._rows = [];

        this._$fileInputContainer = $(domElem("div", "files-drop-target"))
            .appendTo(this._element);

        const $flexContainer = $(domElem('div'))
            .addClass('drag-drop-table')
            .appendTo(this._$fileInputContainer);

        const $labelContainer = $(domElem('div'))
            .addClass('drag-drop-label')
            .append($(domElem("span"))
                .text(this._inputOptions.maximumNumberOfFiles === 1 ? Resources_Platform.FileInputDragDropSingleFileLabel : Resources_Platform.FileInputDragDropLabel))
            .appendTo($flexContainer);

        const fileInputId = Controls.getId();

        const $fileInput = $(domElem("input"))
            .attr({ type: "file", id: fileInputId })
            .css("display", "none")
            .prop("multiple", this._inputOptions.maximumNumberOfFiles !== 1)
            .bind("change", (e: any) => {
                if (e.target.files && e.target.files.length) {
                    this._addFiles({
                        files: e.target.files,
                    } as DataTransfer);

                    if (!this._$fileInputContainer.is(":visible")) {
                        this._getFirstRemoveLink().focus();
                    }
                    e.target.value = "";
                }
            });

        this._$browseButton = $(domElem("button", "browse-container")).text(Resources_Platform.FileInputBrowseButtonLabel)
            .attr("aria-describedby", this._options.browseButtonAriaDescribedBy)
            .click(() => {
                $fileInput.click();
                return false;
            })
            .keypress((e: any) => {
                if (e.which === Utils_UI.KeyCode.ENTER || e.which === Utils_UI.KeyCode.SPACE) {
                    $fileInput.click();
                    return false;
                }
                return true;
            });

        if (this._inputOptions.allowedFileExtensions) {
            const fileExtensions: string[] = [];
            for (let j = 0; j < this._inputOptions.allowedFileExtensions.length; j++) {
                fileExtensions.push('.' + this._inputOptions.allowedFileExtensions[j]);
            }

            $fileInput.attr("accept", fileExtensions.join());

        }

        const $browseButtonContainer = $(domElem('div'))
            .addClass('browse-button')
            .append(this._$browseButton)
            .append($fileInput)
            .appendTo($flexContainer);

        FileDropTarget.makeDropTarget(this._$fileInputContainer, {
            dropCallback: (dataDrop: DataTransfer) => {
                this._addFiles(cloneDataTransfer(dataDrop));
            }
        });

        this._$overallStatusContainer = $(domElem("div", "overall-status-container"))
            .appendTo(this._element)
            .hide();

        this._$overallStatusText = $(domElem("span", "overall-status-message"))
            .appendTo(this._$overallStatusContainer);

        const $overallActionsContainer = $(domElem("span", "overall-status-actions"))
            .appendTo(this._$overallStatusContainer);

        $(domElem("a"))
            .attr("tabindex", 0)
            .attr("role", "button")
            .text(Resources_Platform.FileInputRemoveAll)
            .appendTo($overallActionsContainer)
            .click((e) => {
                this.clear();
                e.preventDefault();
            });

        this._$errorMessageContainer = $(domElem("div", "error-container"))
            .appendTo(this._element);

        this._$fileList = $(domElem("ul", "file-list"))
            .appendTo(this._element);

        if (this._inputOptions.initialDrop) {
            this._addFiles(this._inputOptions.initialDrop);
        } else if (this._inputOptions.initialFiles) {
            this._addFiles({
                files: this._inputOptions.initialFiles,
            } as DataTransfer);
        }
    }

    /**
     * Override default control focus behavior, focus on 'browse' button by default and if not visible then first 'remove' link
     */
    public focus() {
        if (this._$browseButton.length === 1) {
            this._$browseButton.focus();
        }
        else {
            this._getFirstRemoveLink().focus();
        }
    }

    private _triggerUpdateEvent() {

        const canAddMoreFiles = !this._inputOptions.maximumNumberOfFiles ||
            (this._results.length + this._pendingResults.length) < this._inputOptions.maximumNumberOfFiles;

        this._updateOverallStatus();
        this._$fileInputContainer.toggle(canAddMoreFiles);

        if (this._inputOptions.updateHandler) {
            this._inputOptions.updateHandler.call(this, <FileInputControlUpdateEventData>{
                loading: this._pendingResults.length > 0,
                files: this._results
            });
        }
    }

    private _updateOverallStatus() {
        const filesSelected = this._results.length + this._pendingResults.length;
        if ((this._results.length + this._pendingResults.length) > 1) {
            this._$overallStatusContainer.show();
            this._$overallStatusText.text(Utils_String.format(Resources_Platform.FileInputOverallStatusFormat, filesSelected, this._getFriendlySizeString(this._getTotalFilesSize())));
        }
        else {
            this._$overallStatusContainer.hide();
        }
    }

    private _getTotalFilesSize(): number {
        var totalSize = 0;
        for (let i = 0, l = this._results.length; i < l; i++) {
            totalSize += this._results[i].size;
        }
        for (let i = 0, l = this._pendingResults.length; i < l; i++) {
            totalSize += this._pendingResults[i].result.size;
        }
        return totalSize;
    }

    private _addFiles(dataDrop: DataTransfer) {
        this._clearError();

        const { items, files } = dataDrop;

        // Make sure the file type selected is of the allowed file extenstion type
        if (this._inputOptions.allowedFileExtensions && this._inputOptions.allowedFileExtensions.length > 0) {
            for (let i = 0; i < files.length; i++) {
                const fileExtension: string = files[i].name.split('.').pop();
                let isAllowed: boolean = false;
                for (let j = 0; j < this._inputOptions.allowedFileExtensions.length; j++) {
                    if (Utils_String.ignoreCaseComparer(fileExtension, this._inputOptions.allowedFileExtensions[j]) === 0) {
                        isAllowed = true;
                        break;
                    }
                }
                if (!isAllowed) {
                    this._displayError(Utils_String.format(Resources_Platform.FileInputErrorNotAllowedExtensionType, fileExtension, this._inputOptions.allowedFileExtensions.join()));
                    return;
                }
            }
        }

        // Make sure the file names are unique, so build a hash set of names
        const fileNames: { [name: string]: number } = {};
        for (let i = 0, l = this._results.length; i < l; i++) {
            fileNames[this._inputOptions.fileNamesCaseSensitive ? this._results[i].name : this._results[i].name.toLowerCase()] = 1;
        }
        for (let i = 0, l = this._pendingResults.length; i < l; i++) {
            fileNames[this._inputOptions.fileNamesCaseSensitive ? this._pendingResults[i].result.name : this._pendingResults[i].result.name.toLowerCase()] = 1;
        }

        // Loop through each file checking size and name uniqueness
        let totalSize = this._getTotalFilesSize();
        for (let i = 0, l = files.length; i < l; i++) {
            if (this._inputOptions.maximumSingleFileSize && files[i].size > this._inputOptions.maximumSingleFileSize) {

                this._displayLimitError(Utils_String.format(Resources_Platform.FileInputErrorMaxFileSize,
                    files[i].name, this._getFriendlySizeString(files[i].size), this._getFriendlySizeString(this._inputOptions.maximumSingleFileSize)),
                    { fileSize: files[i].size });

                return;
            }
            totalSize += files[i].size;

            const fileNameKey = this._inputOptions.fileNamesCaseSensitive ? files[i].name : files[i].name.toLowerCase();
            if (fileNames[fileNameKey]) {
                this._displayError(Utils_String.format(Resources_Platform.FileInputErrorDuplicateFileName, files[i].name));
                return;
            }
            fileNames[fileNameKey] = 1;
        }

        // Check overall file size
        if (this._inputOptions.maximumTotalFileSize && totalSize > this._inputOptions.maximumTotalFileSize) {
            this._displayLimitError(Utils_String.format(Resources_Platform.FileInputErrorTotalFileSize,
                this._getFriendlySizeString(totalSize), this._getFriendlySizeString(this._inputOptions.maximumTotalFileSize)),
                { totalSize });
            return;
        }

        // Check total number of files
        let fileCount = (this._results.length + this._pendingResults.length + files.length);
        if (this._inputOptions.maximumNumberOfFiles && fileCount > this._inputOptions.maximumNumberOfFiles) {
            const message = this._inputOptions.maximumNumberOfFiles === 1 ?
                Resources_Platform.FileInputErrorSingleFileOnly :
                Utils_String.format(Resources_Platform.FileInputErrorMaxNumFiles, this._inputOptions.maximumNumberOfFiles);

            this._displayLimitError(message, { fileCount });
            return;
        }

        //
        // Add the files (error checks have passed)
        //
        for (let i = 0, l = files.length; i < l; i++) {
            this._addFile(files[i], checkIsFolder(items && items[i]));
        }

        this._triggerUpdateEvent();
    }

    private _addFile(file: File, isFolder: boolean) {

        const result: FileInputControlResult = {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModifiedDate: file.lastModifiedDate,
        };

        let fileReader: FileReader;

        //
        // Setup the row element
        //
        const $li = $(domElem("li"))
            .appendTo(this._$fileList);
        this._$fileList.show();

        const $titleContainer = $(domElem("div", "header-container"))
            .appendTo($li);

        const $fileNameElement = $(domElem("span", "file-name"))
            .text(file.name || "")
            .appendTo($titleContainer);

        const $detailsContainer = $(domElem("div", "details-container"))
            .appendTo($li);

        const $detailsStatus = $(domElem("span", "status"))
            .text(Resources_Platform.Loading)
            .appendTo($detailsContainer);

        const $detailsLinks = $(domElem("span", "links"))
            .appendTo($detailsContainer);

        // Helper functions 
        const _addResult = () => {
            $detailsStatus.text(this._getFriendlySizeString(file.size));
            this._results.push(result);
        }

        $(domElem("a"))
            .text(Resources_Platform.FileInputRemoveFile)
            .attr("tabindex", 0)
            .attr("role", "button")
            .appendTo($detailsLinks)
            .click((e: JQueryMouseEventObject) => {
                let $nextOrPrevLi = $li.next("li").first();
                if ($nextOrPrevLi.length === 0) {
                    $nextOrPrevLi = $li.prev("li").first();
                }

                $li.remove();
                if (fileReader && fileReader.readyState !== (<any>FileReader).DONE) {
                    fileReader.abort();
                }
                this._results = this._results.filter(r => r !== result);
                this._rows = this._rows.filter(r => r.result !== result);
                if (this._rows.length === 0) {
                    this._$fileList.hide();
                }
                this._triggerUpdateEvent();

                if ($nextOrPrevLi.length === 1) {
                    // Focus on the sibiling remove link 
                    $("span.links a", $nextOrPrevLi).first().focus();
                }
                else {
                    Diag.Debug.assert(this._$browseButton.is(":visible"), "Browse button should be visible when no file is selected");
                    this._$browseButton.focus();
                }

                e.preventDefault();
            })
            .keydown(Utils_UI.buttonKeydownHandler);

        const row: FileInputControlRow = {
            $fileNameElement: $fileNameElement,
            $listElement: $li,
            $statusElement: $detailsStatus,
            result: result
        };

        this._rows.push(row);

        const setFileError = (shortMessage: string, longMessage: string): void => {
            $detailsStatus.text(shortMessage);
            $li.addClass("with-error").attr("title", longMessage || "");
        };

        if (isFolder) {
            setFileError(
                Resources_Platform.FileInputErrorFolderNotSupportedTitle,
                Resources_Platform.FileInputErrorFolderNotSupportedMessage);

            return;
        }

        //
        // Setup the read operation
        //

        fileReader = new FileReader();

        const pendingResult: FileInputControlPendingResult = {
            result,
            fileReader,
        };

        this._pendingResults.push(pendingResult);

        fileReader.onload = (e: ProgressEvent) => {

            result.encoding = Utils_File.FileEncoding.Unknown;

            if (this._inputOptions.resultContentType === FileInputControlContentType.RawText) {
                result.content = fileReader.result || "";
            }
            else {
                let dataUrl: string = fileReader.result;

                // If the file is empty, Chrome returns result="data:" and IE returns result=null, so we check for both of these cases.
                if (dataUrl && dataUrl.indexOf(",") > -1) {

                    // Get the base64 content portion of the data url
                    result.content = dataUrl.substr(dataUrl.indexOf(",") + 1);
                    if (result.content.substr(0, 2) === "//" && result.content.length % 4 === 2) {
                        // Trim a leading "//" only if it isn't part of the base64 content itself (base64 length is a multiple of 4).
                        result.content = result.content.substr(2);
                    }
                }
                else {
                    result.content = "";
                }

                if (this._inputOptions.detectEncoding) {
                    result.encoding = Utils_File.tryDetectFileEncoding(result.content);
                }
            }

            _addResult();
        };

        fileReader.onerror = (e: FileReaderProgressEvent) => {
            this._displayError(Utils_String.format(Resources_Platform.FileInputReadErrorFormat, result.name, fileReader.error.message));
            setFileError(Resources_Platform.FileInputErrorLabel, fileReader.error.message);
        };

        const _triggerUpdate = () => {
            this._pendingResults = this._pendingResults.filter(r => r !== pendingResult);

            this._triggerUpdateEvent();
        }

        fileReader.onloadend = (e: any) => {
            _triggerUpdate();
        };

        //
        // Start the read operation
        //
        if (this._inputOptions.resultContentType === FileInputControlContentType.RawText) {
            fileReader.readAsText(file);
        } else if (this._inputOptions.resultContentType === FileInputControlContentType.RawFile) {
            result.encoding = Utils_File.FileEncoding.Unknown;
            result.file = file;

            _addResult();
            _triggerUpdate();
        } else {
            fileReader.readAsDataURL(file);
        }
    }

    /*
    * Get a friendly string representing the length of a file (e.g. "61.2 KB")
    *
    * @param numBytes Number of bytes
    * @param decimalPlaces Number of decimal places to round to. (e.g. 0 -> "61 KB", 1 -> "61.2 KB", 2 -> "61.18 KB")
    */
    private _getFriendlySizeString(numBytes: number, decimalPlaces: number = 1) {
        let divider = Math.pow(10, decimalPlaces);
        if (numBytes < 1024) {
            return Utils_String.format(Resources_Platform.FileSizeBytesFormat, numBytes);
        }
        else if (numBytes < (1024 * 1024)) {
            return Utils_String.format(Resources_Platform.FileSizeKBFormat, Math.round(numBytes / 1024 * 10) / 10);
        }
        else {
            return Utils_String.format(Resources_Platform.FileSizeMBFormat, Math.round(numBytes / (1024 * 1024) * 10) / 10);
        }
    }

    private _clearError() {
        this._$errorMessageContainer.empty();
    }

    private _displayLimitError(errorText: string, limitData: FileInputControlLimitEventData) {
        let message = errorText;

        if (this._options.limitMessageFormatter && $.isFunction(this._options.limitMessageFormatter)) {
            message = this._options.limitMessageFormatter(errorText, limitData);
        }

        this._displayError(message);
    }

    private _displayError(errorText: string) {
        this._$errorMessageContainer.empty();

        const messageArea = <Notifications.MessageAreaControl>Controls.BaseControl.createIn(Notifications.MessageAreaControl, this._$errorMessageContainer, {
            showDetailsLink: false,
            showHeader: false
        });

        const $contentHtml = $(domElem("div")).text(errorText);

        messageArea.setMessage({
            type: Notifications.MessageAreaType.Error,
            content: $contentHtml
        });
    }

    private _getFirstRemoveLink(): JQuery {
        return $("span.links a", this._$fileList).first();
    }

    /*
    * Get the list of all selected files that have been loaded
    */
    public getFiles(): FileInputControlResult[] {
        return this._results;
    }

    /*
    * Are any files currently being loaded
    */
    public isLoadInProgress() {
        return this._pendingResults.length > 0;
    }

    /*
    * Get the list of all file input control rows
    */
    public getRows(): FileInputControlRow[] {
        return this._rows;
    }

    /**
    * Clear all files in the list.
    */
    public clear() {
        this._$fileList.empty();
        this._$fileList.hide();
        this._results = [];
        this._rows = [];
        for (let i = 0, l = this._pendingResults.length; i < l; i++) {
            this._pendingResults[i].fileReader.abort();
        }
        this._triggerUpdateEvent();
    }
}

/*
* Options for a file drop target enhancement
*/
export interface FileDropTargetOptions {

    /*
     * DEPRECATED. Use dropCallback instead for better experience when folders are dropped.
     */
    filesDroppedCallback?: (fileList: FileList) => any;

    /*
     * Callback method invoked when files are dropped into the target. Return false to allow propagation. Otherwise event propagation is stopped.
     */
    dropCallback: (dataDrop: DataTransfer) => any;

    /*
    * Optional callback method invoked when the mouse pointer enters the drop target when dragging a file. Return true to stop propagation.
    */
    dragEnterCallback?: (e: JQueryEventObject) => boolean;

    /*
    * Optional callback method invoked when the mouse pointer leaves the drop target when dragging a file. Return true to stop propagation.
    */
    dragLeaveCallback?: (e: JQueryEventObject) => boolean;

    /*
    * Optional override for the name of the css class used when files are being dragged over the target element. Return true to stop propagation.
    */
    dragOverCssClass?: string;
}

/*
* Enhancement that makes a given element a file drop zone
*/
export class FileDropTarget extends Controls.Enhancement<FileDropTargetOptions> {

    /*
    * Enhances an element as a FileDropTarget so that it can receive drag/dropped files
    *
    * @param $element Element to make the drop target
    * @param options Options for the enhancement
    */
    public static makeDropTarget($element: JQuery, options: FileDropTargetOptions): FileDropTarget {
        return <FileDropTarget>Controls.Enhancement.enhance(FileDropTarget, $element, <FileDropTargetOptions>$.extend({}, options));
    }

    private _dropTargetOptions: FileDropTargetOptions;
    private _dragEventDelegate: (e: JQueryEventObject) => void;
    private _dragLeaveEventDelegate: (e: JQueryEventObject) => void;
    private _dropEventDelegate: (e: JQueryEventObject) => void;
    private _dragOverClassName: string;

    public _enhance($element: JQuery) {
        super._enhance($element);

        this._dropTargetOptions = <FileDropTargetOptions>this._options;
        this._dragOverClassName = this._dropTargetOptions.dragOverCssClass || "drag-over";

        this._dragEventDelegate = delegate(this, this._handleDragEvent);
        this._dragLeaveEventDelegate = delegate(this, this._handleDragLeaveEvent);
        this._dropEventDelegate = delegate(this, this._handleDropEvent);

        $element.addClass("core-file-drop-target");
        $element.bind("dragover", this._dragEventDelegate);
        $element.bind("dragenter", this._dragEventDelegate);
        $element.bind("dragleave", this._dragLeaveEventDelegate);
        $element.bind("drop", this._dropEventDelegate);
    }

    public _dispose() {
        super._dispose();

        const $element = this._element;
        if ($element && $element.length) {
            $element.removeClass("core-file-drop-target");
            $element.unbind("dragover", this._dragEventDelegate);
            $element.unbind("dragenter", this._dragEventDelegate);
            $element.unbind("dragleave", this._dragLeaveEventDelegate);
            $element.unbind("drop", this._dropEventDelegate);
        }
    }

    private _handleDragEvent(e: JQueryEventObject) {
        e.preventDefault();
        (<DragEvent>e.originalEvent).dataTransfer.dropEffect = "copy";
        this._element.addClass(this._dragOverClassName);

        if ($.isFunction(this._dropTargetOptions.dragEnterCallback)) {
            if (this._dropTargetOptions.dragEnterCallback.call(this, e)) {
                e.stopImmediatePropagation();
            }
        }
    }

    private _handleDragLeaveEvent(e: JQueryEventObject) {
        e.preventDefault();
        (<DragEvent>e.originalEvent).dataTransfer.dropEffect = "copy";
        this._element.removeClass(this._dragOverClassName);

        if ($.isFunction(this._dropTargetOptions.dragLeaveCallback)) {
            if (this._dropTargetOptions.dragLeaveCallback.call(this, e)) {
                e.stopImmediatePropagation();
            }
        }
    }

    private _handleDropEvent(e: JQueryEventObject) {
        e.preventDefault();
        this._element.removeClass(this._dragOverClassName);

        const dragEvent = e.originalEvent as DragEvent;
        const fileList = dragEvent.dataTransfer.files;

        if (fileList && fileList.length > 0) {
            if ($.isFunction(this._dropTargetOptions.dropCallback)) {
                if (this._dropTargetOptions.dropCallback.call(this, dragEvent.dataTransfer) !== false) {
                    e.stopImmediatePropagation();
                }
            } else if ($.isFunction(this._dropTargetOptions.filesDroppedCallback)) {
                if (this._dropTargetOptions.filesDroppedCallback.call(this, fileList) !== false) {
                    e.stopImmediatePropagation();
                }
            }
        }
    }
}

/**
 * Clones the DataTransfer in a duck-type instance.
 * DataTransfer is a mutable structure, so we cannot store it
 * because browser would clear it at will.
 * `files` is kept, but `items` is cleared so we need to deeply clone it too.
 */
export function cloneDataTransfer(dataTransfer: DataTransfer): DataTransfer {
    const items: DataTransferItem[] = [];

    if (dataTransfer.items) {
        for (let i = 0; i < dataTransfer.items.length; i++) {
            const item = dataTransfer.items[i];
            const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
            items.push({
                kind: item.kind,
                type: item.type,
                getAsFile: undefined,
                getAsString: undefined,
                webkitGetAsEntry: () => entry,
            } as DataTransferItem);
        }
    }

    return {
        files: dataTransfer.files,
        items: items as any,
    } as DataTransfer;
}

/**
 * Check whether or not the item is a folder.
 * This only works on Chrome (webkit) and Edge.
 */
function checkIsFolder(item: DataTransferItem): boolean {
    const entry = item && item.webkitGetAsEntry && item.webkitGetAsEntry();
    return entry && entry.isDirectory;
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("VSS.UI.Controls.FileInput", exports);
