import * as React from "react";

import { autobind, css, getId } from "OfficeFabric/Utilities";
import * as Controls from "VSS/Controls";
import { HtmlNormalizer } from "VSS/Utils/Html";
import * as Utils_String from "VSS/Utils/String";
import { BrowserCheckUtils } from "VSS/Utils/UI";
import { DropOverlay } from "VSSPreview/Flux/Components/DropOverlay";
import { DropTarget } from "VSSPreview/Flux/Components/DropTarget";

import { DiscussionHelpers, IDragDropDataTransferItem } from "Discussion/Scripts/DiscussionHelpers";
import {
    IAutocompletePluginOptions,
    IAutocompleteReplacement,
    MentionType,
} from "Mention/Scripts/TFS.Mention.Autocomplete";
import {
    AutocompleteEnhancement,
    IAutocompleteOptions,
    IAutocompletePluginConfig,
} from "Mention/Scripts/TFS.Mention.Autocomplete.Controls";
import { PersonAutocompleteProvider } from "Mention/Scripts/TFS.Mention.People";
import { WorkItemAutocompleteProvider } from "Mention/Scripts/TFS.Mention.WorkItems";
import "Mention/Scripts/TFS.Mention.WorkItems.Registration";  // to register work-item mention parser and provider
import { GUIDUtils } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import { UrlEscapeConstants } from "SearchUI/Helpers/WikiHelper";
import { getFileExtension } from "VersionControl/Scripts/VersionControlPath";
import {
    MAX_ATTACHMENT_FILE_SIZE,
    MAX_PAGE_CONTENT_SIZE,
    RepoConstants,
    WikiTreeNodeConstants,
} from "Wiki/Scripts/CommonConstants";
import { getDefaultTelemetryPropsForMentionFeatures, PageErrorType } from "Wiki/Scripts/CustomerIntelligenceConstants";
import { isPeopleMentionFeatureEnabled } from "Wiki/Scripts/WikiFeatures";
import { PathConstants as GeneratedPathConstants, SpecialCharEncodings } from "Wiki/Scripts/Generated/Constants";
import {
    getEncodedAttachmentName,
    getLinkFromPath,
    getPageNameFromPath,
    isDragDataTypeFile,
    isDragDataTypeString,
} from "Wiki/Scripts/Helpers";
import * as WikiResources from "Wiki/Scripts/Resources/TFS.Resources.Wiki";
import { WikiLinkAutocompleteProvider } from "Wiki/Scripts/WikiLinkAutoCompleteProvider";

import { GuidSuffixedFile } from "Wiki/Scenarios/Shared/SharedActionsHub";

import { WikiToolbar } from "Wiki/Scenarios/Overview/Components/WikiToolbar";
import { ViewActionCreator } from "Wiki/Scenarios/Overview/ViewActionCreator";

import "VSS/LoaderPlugins/Css!Wiki/Scenarios/Overview/Components/MarkdownEditable";

interface Point {
    x: number;
    y: number;
}

export interface MarkdownEditableProps {
    initialContent: string;
    sizeOfAddedAttachments: number;
    validAttachmentTypes: string[];
    getToolbar(): WikiToolbar;
    onAttach(fileList: GuidSuffixedFile[]): void;
    onChange(): void;
    onError(message: Error | JSX.Element, telemetryMessage: string, errorType: PageErrorType): void;
    onClearError(): void;
    actionCreator: ViewActionCreator,
    className?: string;
}

export interface MarkdownEditableState {
    draggingFileOver?: boolean;
}

export class MarkdownEditable extends React.PureComponent<MarkdownEditableProps, MarkdownEditableState> {
    private _textControl: HTMLTextAreaElement;
    private _shouldSetTextSelection: boolean;
    private _selectionStart = 0;
    private _selectionEnd = 0;
    private _id = "";
    private _mentionEnhancement: Controls.Enhancement<IAutocompleteOptions>;
    private _textEditorMirrorContainerRef: HTMLDivElement;
    private _textEditorMirrorRef: HTMLSpanElement;
    private _positioningElementRef: HTMLDivElement;

    constructor(props: MarkdownEditableProps) {
        super(props);

        this.state = {};
        this._id = getId("text-editor-screenreader");
    }

    public componentWillReceiveProps(nextProps: MarkdownEditableProps): void {
        if (this._shouldSetTextSelection) {
            this._shouldSetTextSelection = false;
            this._textControl.selectionStart = this._selectionStart || 0;
            this._textControl.selectionEnd = this._selectionEnd || 0;
        }
    }

    public componentWillUnmount(): void {
        this._textControl = null;
        this._textEditorMirrorRef = null;
        this._positioningElementRef = null;

        if (this._mentionEnhancement) {
            this._mentionEnhancement.dispose();
            this._mentionEnhancement = null;
        }
    }

    public render(): JSX.Element {
        return (
            <div className={css("markdown-editable", this.props.className)}>
                <DropTarget
                    onDragEnter={this._onDragEnter}
                    onDragLeave={this._onDragLeave}
                    onDrop={this._onDrop}
                    getDropEffect={this._getDropEffect}
                >
                    <DropOverlay showOverlay={this.state.draggingFileOver}>
                        <textarea
                            className={"editable-text"}
                            defaultValue={this.props.initialContent}
                            onChange={this._onChange}
                            onKeyDown={this._onKeyDown}
                            onPaste={this._onPaste}
                            ref={this._refTextControl}
                            aria-label={WikiResources.TextEditor_AriaLabel}
                            aria-describedby={this._id}
                        />
                        <div ref={this._setTextEditorMirrorContainerRef} className={"text-editor-mirror-container"}>
                            <span ref={this._setTextEditorMirrorRef} ></span>
                        </div>
                        <div ref={this._setPositioningElementRef} className={"mentions-positioning-element"}></div>
                        <div className={"text-editor-screenreader"} id={this._id}>This field supports markdown.</div>
                    </DropOverlay>
                </DropTarget >
            </div>
        );
    }

    public componentDidMount(): void {
        if (this._textControl) {
            this._mentionEnhancement = Controls.Enhancement.enhance(AutocompleteEnhancement, $(this._textControl), this._autoCompleteOptions());
        }
    }

    public get textArea(): HTMLTextAreaElement {
        return this._textControl;
    }

    private _autoCompleteOptions(): IAutocompleteOptions {
        const pluginConfigs: IAutocompletePluginConfig<IAutocompletePluginOptions>[] = [];

        pluginConfigs.push({
            factory: (options: IAutocompletePluginOptions) => {
                options.positioningElement = this._getPositioningWIElement;
                return new WorkItemAutocompleteProvider(options);
            }
        });

		pluginConfigs.push({
            factory: (options: IAutocompletePluginOptions) => {
                options.positioningElement = this._getPositioningLinkElement;
                return new WikiLinkAutocompleteProvider(options, this.props.actionCreator.getPagesToFilter);
            }
        });

        if (isPeopleMentionFeatureEnabled()) {
            pluginConfigs.push({
                factory: (options: IAutocompletePluginOptions) => {
                    options.positioningElement = this._getPositioningPeopleElement;
                    return new PersonAutocompleteProvider(options);
                }
            });
        }

        return {
            mentionType: MentionType.WorkItem,
            pluginConfigs: pluginConfigs,
            select: this._onSelectWorkItem,
            defaultTelemetryProperties: getDefaultTelemetryPropsForMentionFeatures(),
        };
    }

    /**
     * Auto-suggestion drop-down should always be placed relative to last '@' symbol before the cursor position.
     */
    @autobind
    private _getPositioningPeopleElement(): JQuery {
        return this._getPositioningElementForLastIndexOf("@");
    }

    @autobind
    private _onSelectWorkItem(replacement: IAutocompleteReplacement): void {
        this._onChange();
    }

    private _getReplacementString(originalString: string, start: number, end: number): string {
        return originalString.substring(start, end).replace(/\n$/, "\n\001");
    }

    /**
     * For WI, searching for # is faster than regex
     * Auto-suggestion drop-down should always be placed relative to last '#' symbol before the cursor position.
     */
    @autobind
    private _getPositioningWIElement(): JQuery {
        return this._getPositioningElementForLastIndexOf("#");
    }

    @autobind
    private _getPositioningElementForLastIndexOf(searchString: string): JQuery {
        const substringLength = this._textControl.value.lastIndexOf(searchString, this._textControl.selectionStart) + 1;
        const replacementString: string = this._getReplacementString(this._textControl.value, 0, substringLength);
        this._textEditorMirrorRef.innerHTML = Utils_String.htmlEncode(replacementString);

        return this._getPositioningElement();
    }

    @autobind
    private _getPositioningLinkElement(): JQuery {
        // Look for link autocomplete
        const linkMentionRegex: RegExp = WikiLinkAutocompleteProvider.wikiStricktlyOpenLinkPattern();
        let linkMatch: RegExpExecArray = null;
        let linkAutoCompleteMatchLocation = -1;
        do {
            linkMatch = linkMentionRegex.exec(this._textControl.value.substring(0, this._textControl.selectionStart));

            if (linkMatch) {
                linkAutoCompleteMatchLocation = linkMatch.index;
            }
        } while (linkMatch !== null);

        if (linkAutoCompleteMatchLocation > 0) {
            const replacementString: string = this._getReplacementString(this._textControl.value, 0, linkAutoCompleteMatchLocation);
            this._textEditorMirrorRef.innerHTML = Utils_String.htmlEncode(replacementString);
        }

        return this._getPositioningElement();
    }

    @autobind
    private _getPositioningElement(): JQuery {
        const lineHeight = 20;
        const suggestionDropDownWidth = 600;

        /**
         * If there is a scroll appearing in original text area the width where the text could be rendered is reduced,
         * this should be reflected in mirror span as well to exactly overlap the original text area.
         */
        if (this._textControl.scrollHeight > this._textControl.clientHeight) {
            this._textEditorMirrorContainerRef.style.overflowY = "scroll";
        } else {
            this._textEditorMirrorContainerRef.style.overflowY = "hidden";
        }

        /**
         * Rectangles cordinates are wrt to viewport (not parent element) in px. However, we need to
         * position the dropdown wrt ".markdown-editable" div which contains the textArea.
         * For this we assume the first character in textArea approximately starts at top left corner of textArea.
         * Then all that needs to done is to find the offset position in px of last '#' before caret relative
         * to first character. We need to make sure we adjust for scrolling as well.
         */
        const caretOffset: Point = this._getCursorOffsetRespectToFirstCharacter();

        this._positioningElementRef.style.width = `${suggestionDropDownWidth}px`;
        this._positioningElementRef.style.height = `${lineHeight}px`;
        this._positioningElementRef.style.top = `${caretOffset.y}px`;

        /**
         * We need to ensure if the drop-down is overflowing ".edit-preview-container" the drop-down's
         * right is aligned with right of ".edit-preview-container".
         */
        const editPreviewContainerWidth: number = document.getElementsByClassName("edit-preview-container")[0].clientWidth;
        const isDropDownOverflowingAlongX: boolean = caretOffset.x + suggestionDropDownWidth > editPreviewContainerWidth;
        if (!isDropDownOverflowingAlongX) {
            this._positioningElementRef.style.left = `${caretOffset.x}px`;
            this._positioningElementRef.style.right = `auto`;
        } else {
            this._positioningElementRef.style.right = `${0}px`;
            this._positioningElementRef.style.left = `auto`;
        }

        this._textEditorMirrorRef.innerHTML = "";
        return $(this._positioningElementRef);
    }

    private _getCursorOffsetRespectToFirstCharacter(): Point {
        const mirrorSpanRects: ClientRectList = this._textEditorMirrorRef.getClientRects();
        const lastRect: ClientRect = mirrorSpanRects[mirrorSpanRects.length - 1];
        const firstRect: ClientRect = mirrorSpanRects[0];

        const topPadding: string = window.getComputedStyle(this._textControl, null).getPropertyValue("padding-top");
        const caretOffsetY: number = lastRect.top - firstRect.top - this._textControl.scrollTop + Number(topPadding.replace("px", ""));
        const caretOffsetX: number = lastRect.left - firstRect.left - this._textControl.scrollLeft + lastRect.width;

        return { x: caretOffsetX, y: caretOffsetY };
    }

    @autobind
    private _setTextEditorMirrorContainerRef(elementRef: HTMLDivElement): void {
        this._textEditorMirrorContainerRef = elementRef;
    }

    @autobind
    private _setTextEditorMirrorRef(elementRef: HTMLSpanElement): void {
        this._textEditorMirrorRef = elementRef;
    }

    @autobind
    private _setPositioningElementRef(elementRef: HTMLDivElement): void {
        this._positioningElementRef = elementRef;
    }

    private get _toolbar(): WikiToolbar {
        return this.props.getToolbar();
    }

    public addAttachments(files: File[]): void {
        const validFiles: GuidSuffixedFile[] = this._getValidAttachments(files) as GuidSuffixedFile[];
        if (!validFiles || validFiles.length === 0) {
            return;
        }

        let markdownText = "";

        for (const file of validFiles) {
            /**
             * The attachment names must adhere server friendly path rules.
             * We do not need client friendly path for attachments since we do not render its name to the user anywhere, except for the links.
             */
            const nameWithoutExtension = file.name.substring(0, file.name.lastIndexOf("."));
            file.guidSuffixedFileName = `${nameWithoutExtension}-${GUIDUtils.newGuid()}.${getFileExtension(file.name)}`;

            let linkText = `[${file.name}](${RepoConstants.AttachmentsFolder}${RepoConstants.RootPath}${getEncodedAttachmentName(file.guidSuffixedFileName)})`;

            if (file.type && file.type.indexOf("image/") === 0) {
                linkText = `!${linkText}`;
            }

            markdownText += linkText;
        }

        if (markdownText && this._toolbar) {
            // (TODO:#1028259) Hack: Using setTimeout to avoid recursive calls of onchange handler for attachment file input element.
            // To enable undo/redo, we need to use insertText which inserts markdown text for attachment files. However, this calls
            // onchange handler of file input element which again generates new guids for attachments which mismatch with previous
            // ones resulting into attachment failure.
            if (BrowserCheckUtils.isEdge()) {
                // Workaround for Edge, text doesnt get added if Markdowntoolbar is empty
                setTimeout(() => this._toolbar.insertText(" ", false), 0);
            }

            setTimeout(() => this._toolbar.insertText(markdownText, true), 0);
        }

        this.props.onAttach(validFiles);
    }

    public setText(text: string, selectionStart: number, selectionEnd: number): void {
        if (text) {
            this._textControl.value = text;
        }

        this._selectionStart = selectionStart;
        this._selectionEnd = selectionEnd;
        this._shouldSetTextSelection = true;

        this.props.onChange();
    }

    private _getValidAttachments = (files: File[]): File[] => {
        const validFiles: File[] = [];
        const invalidAttachmentNames: string[] = [];
        const invalidAttachmentTypes: string[] = [];
        const filesExceedingSizeLimit: string[] = [];
        for (const file of files) {
            const isValidName: boolean = GeneratedPathConstants.AttachmentNameReservedCharacters.every((character: string) => {
                return file.name.indexOf(character) === -1;
            });

            if (!isValidName) {
                invalidAttachmentNames.push(file.name);
                continue;
            }

            const fileType = `.${getFileExtension(file.name)}`;
            if (this.props.validAttachmentTypes.indexOf(fileType.toUpperCase()) === -1) {
                invalidAttachmentTypes.push(Utils_String.format("\"{0}\"", fileType));
                continue;
            }

            if (file.size > MAX_ATTACHMENT_FILE_SIZE) {
                filesExceedingSizeLimit.push(file.name);
                continue;
            }

            validFiles.push(file);
        }

        // Priority for showing attachment error (when multiple applies) is as below:
        // 1. Invalid attachment name
        // 2. Invalid attachment type
        // 3. Individual attachment size exceeds
        // The one which executes last is displayed in UI. So, they are in reverse order below.
        if (invalidAttachmentNames.length > 0) {
            this._showAttachmentNameInvalidError(invalidAttachmentNames);
        }

        if (filesExceedingSizeLimit.length > 0) {
            this._showAttachmentSizeExceedError(filesExceedingSizeLimit);
        }

        if (invalidAttachmentTypes.length > 0) {
            this._showInvalidFileTypeError(invalidAttachmentTypes);
        }

        if (files.length === validFiles.length) {
            this.props.onClearError();
        }

        return validFiles;
    }

    /**
     * Count bytes in a string's UTF-8 representation.
     * Calculation details link: https://en.wikipedia.org/wiki/UTF-8
     */
    private _getPageTextSize(): number {
        const text: string = this._textControl ? this._textControl.value : "";
        let byteLen = 0;
        for (let i = 0; i < text.length; i++) {
            const c = text.charCodeAt(i);
            byteLen += c < (2 ** 7) ? 1 :
                c < (2 ** 11) ? 2 :
                    c < (2 ** 16) ? 3 :
                        c < (2 ** 21) ? 4 : Number.NaN;
        }

        return isNaN(byteLen) ? 0 : byteLen;
    }

    private _showAttachmentNameInvalidError(files: string[]): void {
        const unSupportedCharacters: string[] = [];
        GeneratedPathConstants.AttachmentNameReservedCharacters.forEach((value: string) => {
            unSupportedCharacters.push(Utils_String.format("'{0}'", value));
        });
        const hasUnSupportedCharactersMessage: string = Utils_String.format(
            WikiResources.Attachment_UnSupportedCharactersInName,
            unSupportedCharacters.join(", "));
        const errorMessage: string = hasUnSupportedCharactersMessage + files.join(", ");
        const errorMessageComponent: JSX.Element =
            <div className="file-size-exceed-error">
                <div className="message">{hasUnSupportedCharactersMessage}</div>
                <ol>
                    {files.map((file: string): JSX.Element => <li key={file}>{file}</li>)}
                </ol>
            </div>;
        this.props.onError(errorMessageComponent, errorMessage, PageErrorType.InvalidAttachmentName);
    }

    private _showInvalidFileTypeError(invalidFileTypes: string[]): void {
        let errorMessage: string;

        if (invalidFileTypes.length === 1) {
            errorMessage = Utils_String.format(WikiResources.Attachment_NotSupportedFileType, invalidFileTypes[0]);
        }
        else {
            const lastFileType: string = invalidFileTypes.pop();
            errorMessage = Utils_String.format(WikiResources.Attachment_MultipleNotSupportedFileTypes, invalidFileTypes.join(","), lastFileType);
        }

        this.props.onError(new Error(errorMessage), errorMessage, PageErrorType.InvalidAttachmentExtension);
    }

    private _showAttachmentSizeExceedError(files: string[]): void {
        const attachmentSizeExceedMessage: string = Utils_String.format(
            WikiResources.Attachment_FileSizeExceeded,
            MAX_ATTACHMENT_FILE_SIZE / (1024 * 1024));
        const errorMessage: string = attachmentSizeExceedMessage + files.join(",");
        const errorMessageComponent: JSX.Element =
            <div className="file-size-exceed-error">
                <div className="message">{attachmentSizeExceedMessage}</div>
                <ol>
                    {files.map((file: string): JSX.Element => <li key={file}>{file}</li>)}
                </ol>
            </div>;
        this.props.onError(errorMessageComponent, errorMessage, PageErrorType.AttachmentSizeExceeded);
    }

    private _showPageSizeExceedError(pageSizeInBytes: number): void {
        const pageSizeInMB: number = Math.round((pageSizeInBytes / (1024 * 1024)) * 100) / 100;
        const errorMessage: string = Utils_String.format(
            WikiResources.PageContentSizeExceeded,
            pageSizeInMB,
            MAX_PAGE_CONTENT_SIZE / (1024 * 1024));
        this.props.onError(new Error(errorMessage), errorMessage, PageErrorType.PageSizeExceeded);
    }

    @autobind
    private _onChange(): void {
        const pageSize = this._getPageTextSize();
        if (pageSize > MAX_PAGE_CONTENT_SIZE) {
            this._showPageSizeExceedError(pageSize);
        } else {
            this._selectionStart = this._textControl.selectionStart;
            this._selectionEnd = this._textControl.selectionEnd;
            this._shouldSetTextSelection = true;

            this.props.onChange();
        }
    }

    @autobind
    private _onDragEnter(event: React.DragEvent<HTMLDivElement>): void {
        if (this._getDropEffect(event.dataTransfer) === "copy") {
            this.setState({ draggingFileOver: true });
        }
    }

    @autobind
    private _getDropEffect(dataTransfer: DataTransfer): string {
        if (isDragDataTypeString(dataTransfer)) {
            return "link";
        } else if (isDragDataTypeFile(dataTransfer)) {
            return "copy";
        } else {
            return "none";
        }
    }

    @autobind
    private _onDragLeave(): void {
        this.setState({ draggingFileOver: false });
    }

    private _addLink(path: string): void {
        const link: string = Utils_String.format("[{0}]({1})", getPageNameFromPath(path), getLinkFromPath(path));
        setTimeout(() => this._toolbar.insertText(link, true), 0);
    }

    @autobind
    private _onDrop(dataTransfer: DataTransfer): void {
        if (isDragDataTypeFile(dataTransfer)) {
            const fileArray: File[] = DiscussionHelpers.getFileArrayFromDataTransfer(dataTransfer);
            this.addAttachments(fileArray);
        } else if (isDragDataTypeString(dataTransfer)) {
            try {
                const data = JSON.parse(dataTransfer.getData("text")) as IDragDropDataTransferItem;
                if (data.source === WikiTreeNodeConstants.WikiTreeNodeDragEvent) {
                    this._addLink(data.text);
                }
            } catch (e) {
                // Dropped item is not wiki tree node, Ignore.
            }
        }
    }

    @autobind
    private _onPaste(event: React.ClipboardEvent<HTMLTextAreaElement>): void {
        const data: DataTransfer = event.clipboardData;
        const textPlain: string = "text/plain";
        const textHtml: string = "text/html";
        const image: string = "image/";
        const pasteObjectTypeOrder: string[] = [textPlain, textHtml, image];
        if (this._toolbar.shouldPasteHtml) {
            pasteObjectTypeOrder[0] = textHtml;
            pasteObjectTypeOrder[1] = textPlain;
        }

        if (!data || !data.items) {
            return;
        }

        for (const pasteType of pasteObjectTypeOrder) {
            for (let itemIndex = 0; itemIndex < data.items.length; itemIndex++) {
                if (data.items[itemIndex].type.indexOf(pasteType) === 0) {
                    switch (pasteType) {
                        case textPlain:
                            return;
                        case textHtml:
                            this._pasteHtmlContent(event, data.items[itemIndex]);
                            return;
                        case image:
                            this._pasteImage(event, data.items[itemIndex]);
                            return;
                    }
                }
            }
        }
    }

    private _pasteHtmlContent(event: React.ClipboardEvent<HTMLTextAreaElement>, item: DataTransferItem): void {
        event.stopPropagation();
        event.preventDefault();
        item.getAsString((htmlContent: string) => {
            if (htmlContent && this._toolbar) {
                this._toolbar.insertText(this._getHtmlContentBody(htmlContent), true);
            }
        });
    }

    private _pasteImage(event: React.ClipboardEvent<HTMLTextAreaElement>, item: DataTransferItem): void {
        event.stopPropagation();
        event.preventDefault();
        const file: File = item.getAsFile();
        this.addAttachments([file]);
    }

    private _getHtmlContentBody(htmlContent: string): string {
        let extractedHtmlContent: string = htmlContent;
        const startFragment: string = "<!--StartFragment-->";
        const endFragment: string = "<!--EndFragment-->";

        if (extractedHtmlContent.indexOf(startFragment) !== -1) {
            extractedHtmlContent = extractedHtmlContent.substring(htmlContent.indexOf(startFragment) + startFragment.length, htmlContent.indexOf(endFragment));
        } 

        const trimmedContent: string = extractedHtmlContent.trim();

        return HtmlNormalizer.normalize(trimmedContent);
    }

    private _onKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
        if (!this._toolbar) {
            return;
        }

        this._toolbar.handleKeyPress(event);
    }

    private _refTextControl = (textControl: HTMLTextAreaElement): void => {
        this._textControl = textControl;
    }
}
