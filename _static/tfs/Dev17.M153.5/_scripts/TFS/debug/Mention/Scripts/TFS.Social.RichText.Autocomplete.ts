import "Mention/Scripts/TFS.Mention.People.Registration"; // to register people mention parser and provider
import "Mention/Scripts/TFS.Mention.WorkItems.Registration"; // to register work-item mention parser and provider

import * as MentionResources from 'Mention/Scripts/Resources/TFS.Resources.Mention';
import * as Mention from "Mention/Scripts/TFS.Mention";
import * as MentionAutocomplete from "Mention/Scripts/TFS.Mention.Autocomplete";
import * as MentionAutocompleteControls from "Mention/Scripts/TFS.Mention.Autocomplete.Controls";
import * as MentionHelpers from "Mention/Scripts/TFS.Mention.Helpers";
import * as MentionPeople from "Mention/Scripts/TFS.Mention.People";
import { getMentionPlugins, MentionPluginType } from "Mention/Scripts/TFS.Mention.PluginRegistration";
import * as MentionWorkItems from "Mention/Scripts/TFS.Mention.WorkItems";
import * as Controls from "VSS/Controls";
import * as Diag from "VSS/Diag";
import * as Events_Services from "VSS/Events/Services";
import { IdentityPickerDropdownControl, UpdateActiveDescendantEventData } from "VSS/Identities/Picker/Controls";
import * as Accessibility from "VSS/Utils/Accessibility";
import * as Array_Utils from "VSS/Utils/Array";
import * as Core from "VSS/Utils/Core";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import * as UI from "VSS/Utils/UI";

export type ElementNode = HTMLElement;
export type TextNode = Text;
export type JQueryEventHandler = (e: JQueryEventObject) => void;
export type Editable = HTMLElement;

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertRequired(value: any, name: string) {
    assert(!!value, `${name} is required`);
}

export interface ITextAtCursor {
    editable: Editable;
    parent: ElementNode;
    prevSibling?: Node;
    nextSibling?: Node;
    nodes: TextNode[];
    text: string;
    cursorPosition: number;
}

export interface ISelection {
    startContainer: Node;
    startPosition: number;
}

export module Dom {
    export function isSameNode(x: Node, y: Node, nullsAreEqual: boolean = false): boolean {
        if (!nullsAreEqual && !x && !y) return false;
        return x === y;
    }

    export function insertNode(parent: ElementNode, prevSibling: Node, nextSibling: Node, node: Node): void {
        assertRequired(parent, "parent");
        assertRequired(node, "node");
        assert(!prevSibling || prevSibling.parentNode === parent, "prevSibling's parent matches the parent argument");
        assert(!nextSibling || nextSibling.parentNode === parent, "nextSibling's parent matches the parent argument");
        assert(!prevSibling || prevSibling.nextSibling === nextSibling, "prevSibling.nextSibling matches the nextSibling parameter");
        assert(!nextSibling || nextSibling.previousSibling === prevSibling, "nextSibling.previousSibling matches the prevSibling parameter");
        if (nextSibling) {
            parent.insertBefore(node, nextSibling);
        }
        else {
            parent.appendChild(node);
        }
    }

    export function areAllChildrenTextNodes(node: ElementNode): boolean {
        assertRequired(node, "node");
        var childNodes = createArrayFromNodeList(node.childNodes);
        return childNodes.every((n) => isTextNode(n));
    }

    export function createArrayFromNodeList(nodeList: NodeList): Node[] {
        return [].slice.apply(nodeList);
    }

    export function isTextNode(node: Node): boolean {
        assertRequired(node, "node");
        return node.nodeType === Node.TEXT_NODE;
    }

    export function isElementNode(node: Node): boolean {
        assertRequired(node, "node");
        return node.nodeType === Node.ELEMENT_NODE;
    }

    export function createTextNode(editable: Editable, text: string): TextNode {
        assertRequired(editable, "editable");
        return EditableHelpers.getDocument(editable).createTextNode(text);
    }

    export function createSpanElement(editable: Editable): ElementNode {
        assertRequired(editable, "editable");
        return EditableHelpers.getDocument(editable).createElement("SPAN");
    }

    export function getParent(node: Node): ElementNode {
        assertRequired(node, "node");
        const parent = node.parentNode;
        assert(!parent || parent.nodeType == Node.ELEMENT_NODE, "expected parent to be an element node");
        return <ElementNode>parent;
    }

    export function getIndexInParent(node: Node): number {
        assertRequired(node, "node");
        const parent = Dom.getParent(node);
        assert(!!parent, "node must have a parent");
        const childrenOfParent = createArrayFromNodeList(parent.childNodes);
        var index = Array_Utils.findIndex(childrenOfParent, (n) => n === node);
        if (index === -1) {
            throw new Error("child not found in parent's childNodes");
        }
        return index;
    }
}

export module Selection {
    export function setCursor(editable: Editable, cursorNode: Node, cursorPosition: number) {
        setCursorBase(editable, cursorNode, (range: Range) => {
            range.setStart(cursorNode, cursorPosition);
            range.setEnd(cursorNode, cursorPosition);
        });
    }

    export function setCursorSelectNode(editable: Editable, cursorNode: Node) {
        setCursorBase(editable, cursorNode, (range: Range) => {
            range.setStartBefore(cursorNode);
            range.setEndAfter(cursorNode);
        });
    }

    export function setCursorAtEnd(editable: Editable, cursorNode: ElementNode) {
        setCursorBase(editable, cursorNode, (range: Range) => {
            range.selectNodeContents(cursorNode);
            range.collapse(false);
        });
    }

    function setCursorBase(editable: Editable, cursorNode: Node, setCursorCallback) {
        assertRequired(editable, "editable");
        assertRequired(cursorNode, "cursorNode");
        const editorDoc = EditableHelpers.getDocument(editable);
        const selection = EditableHelpers.getWindow(editable).getSelection();
        assert(!!selection, "window selection is not null");
        const range = editorDoc.createRange();

        setCursorCallback(range);

        selection.removeAllRanges();
        selection.addRange(range);
    }

    export function setCursorImmediatelyAfter(editable: Editable, node: Node) {
        assertRequired(editable, "editable");
        assertRequired(node, "node");

        const parent = Dom.getParent(node);
        assert(!!parent, "node must have a parent");

        const getCursorPosition = () => {
            const childNodes = Dom.createArrayFromNodeList(parent.childNodes);
            const foundIndex = Array_Utils.indexOf(childNodes, node);
            if (foundIndex >= 0) {
                return foundIndex + 1;
            }
            return childNodes.length;
        };

        const cursorPosition = getCursorPosition();

        setCursor(editable, parent, cursorPosition);
    }

    export function collapseSelectionToEnd(editable: Editable) {
        assertRequired(editable, "editable");
        const editorDoc = EditableHelpers.getDocument(editable);
        const selection = EditableHelpers.getWindow(editable).getSelection();
        assert(!!selection, "window selection is not null");
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.collapse(false);

            selection.removeAllRanges();
            selection.addRange(range);
        }
    }

    export function getCurrentSelection(editable: Editable): ISelection {
        assertRequired(editable, "editable");
        const selection = EditableHelpers.getWindow(editable).getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            return { startContainer: range.startContainer, startPosition: range.startOffset };
        }
        return null;
    }

    export function clearCursorFormatting(editable: Editable) {
        assertRequired(editable, "editable");
        // Need to clear the formatting associated with the cursor when the autocomplete highlight is removed. 
        // Otherwise, the next time the user types a character, the browser will wrap the text with a span and
        // explicitly set the background of the text to the background color of the autocomplete highlight. 
        // (It will look like autocomplete is active, but it actually isn't.)
        const formattingResetter = Dom.createSpanElement(editable);
        const editorDoc = EditableHelpers.getDocument(editable);
        const editorBody = editorDoc.body;
        formattingResetter.innerText = " ";
        editorBody.appendChild(formattingResetter);
        Selection.setCursorSelectNode(editable, formattingResetter);
        editorDoc.execCommand("removeFormat");
        $(formattingResetter).remove();
    }
}

export module TextAtCursor {

    export function areSameTextBlock(x: ITextAtCursor, y: ITextAtCursor, nullsAreEqual: boolean = false) {
        if (!x && !y) {
            return nullsAreEqual;
        }
        if (!x || !y) {
            return false;
        }
        if (x === y) {
            return true;
        }

        // handle RoosterJS scenario, going from initial empty state to non-empty (i.e. 
        // <editable><br/></editable> => <editable><div>just typed</div></editable>)
        if (x.parent === x.editable && x.text === "") {
            return true;
        }

        return Dom.isSameNode(x.parent, y.parent) && Dom.isSameNode(x.prevSibling, y.prevSibling, true);
    }

    export function clone(textAtCursor: ITextAtCursor): ITextAtCursor {
        assertRequired(textAtCursor, "textAtCursor");
        return {
            editable: textAtCursor.editable,
            parent: textAtCursor.parent,
            prevSibling: textAtCursor.prevSibling,
            nextSibling: textAtCursor.nextSibling,
            nodes: textAtCursor.nodes.slice(),
            text: textAtCursor.text,
            cursorPosition: textAtCursor.cursorPosition,
        };
    }

    export function extractCursorNodeAndPosition(textAtCursor: ITextAtCursor): { node: Node, position: number } {
        assertRequired(textAtCursor, "textAtCursor");
        let curNode: Node;
        if (!textAtCursor.parent.childNodes.length) {
            return {
                node: textAtCursor.parent,
                position: 0
            };
        }
        if (textAtCursor.nodes.length === 0) {
            let cursorPosition: number = 0;
            if (textAtCursor.prevSibling) {
                cursorPosition = Dom.getIndexInParent(textAtCursor.prevSibling) + 1;
            }
            return {
                node: textAtCursor.parent,
                position: cursorPosition
            };
        }
        if (textAtCursor.prevSibling) {
            curNode = <TextNode>textAtCursor.prevSibling.nextSibling;
        }
        else {
            curNode = textAtCursor.parent.childNodes[0];
        }
        let prevNodesTextLength: number = 0;
        let curNodeTextLength = curNode.textContent.length;
        while (curNode && prevNodesTextLength + curNodeTextLength < textAtCursor.cursorPosition) {
            prevNodesTextLength += curNodeTextLength;
            curNode = <TextNode>curNode.nextSibling;
            curNodeTextLength = curNode.textContent.length;
        }
        return {
            node: curNode,
            position: textAtCursor.cursorPosition - prevNodesTextLength
        };
    }

    export function getFromCurrentSelection(editable: Editable): ITextAtCursor {
        assertRequired(editable, "editable");
        const selection = Selection.getCurrentSelection(editable);
        if (!selection) {
            console.log("selection was null");
            return null;
        }
        const container: Node = selection.startContainer;
        let textAtCursor: ITextAtCursor;
        if (Dom.isTextNode(container)) {
            textAtCursor = getExpanded({
                editable: editable,
                parent: Dom.getParent(container),
                prevSibling: container.previousSibling,
                nextSibling: container.nextSibling,
                nodes: [<TextNode>container],
                text: container.textContent,
                cursorPosition: selection.startPosition,
            });
        }
        else if (Dom.isElementNode(container)) {
            textAtCursor = getFromElementAndPosition(
                editable,
                <ElementNode>container,
                selection.startPosition
            );
        }
        else if(container.nodeType === Node.COMMENT_NODE) {
            // comment node can come from new rich editor's image resize plugin
            return null;
        }
        else {
            Diag.logWarning("unexpected node type");
            return null;
        }
        return textAtCursor;
    }

    function getFromElementAndPosition(editable: Editable, container: ElementNode, cursorPosition: number): ITextAtCursor {
        assertRequired(editable, "editable");
        assertRequired(container, "container");
        const containerChildren = (container).childNodes;
        if (cursorPosition > containerChildren.length) {
            Diag.logWarning("selection cursorPosition doesn't make sense");
            return null;
        }
        let prevSibling: ElementNode | TextNode;
        let nextSibling: ElementNode | TextNode;
        if (cursorPosition <= 0) {
            prevSibling = null;
        }
        else {
            prevSibling = <ElementNode>containerChildren[cursorPosition - 1];
        }
        if (cursorPosition >= containerChildren.length) {
            nextSibling = null;
        }
        else {
            nextSibling = <ElementNode>containerChildren[cursorPosition];
        }
        return getExpanded({
            editable: editable,
            parent: container,
            prevSibling: prevSibling,
            nextSibling: nextSibling,
            nodes: [],
            text: "",
            cursorPosition: 0
        });
    }

    function getExpanded(textAtCursor: ITextAtCursor): ITextAtCursor {
        assertRequired(textAtCursor, "textAtCursor");
        textAtCursor = clone(textAtCursor);
        const prevNodes = [];
        while (textAtCursor.prevSibling && Dom.isTextNode(textAtCursor.prevSibling)) {
            const prevText = (<TextNode>textAtCursor.prevSibling).textContent;
            prevNodes.push(textAtCursor.prevSibling);
            textAtCursor.text = prevText + textAtCursor.text;
            textAtCursor.cursorPosition += prevText.length;
            textAtCursor.prevSibling = <ElementNode>textAtCursor.prevSibling.previousSibling;
        }
        if (prevNodes.length > 0) {
            prevNodes.reverse();
            textAtCursor.nodes = prevNodes.concat(textAtCursor.nodes);
        }
        const nextNodes = [];
        while (textAtCursor.nextSibling && Dom.isTextNode(textAtCursor.nextSibling)) {
            const nextText = (<TextNode>textAtCursor.nextSibling).textContent;
            nextNodes.push(textAtCursor.nextSibling);
            textAtCursor.text = textAtCursor.text + nextText;
            textAtCursor.nextSibling = <ElementNode>textAtCursor.nextSibling.nextSibling;
        }
        textAtCursor.nodes = textAtCursor.nodes.concat(nextNodes);
        return textAtCursor;
    }
}

export module EditableHelpers {
    export function getFrame(editable: Editable): ElementNode {
        assertRequired(editable, "editable");
        return <ElementNode>getWindow(editable).frameElement;
    }

    export function getDocument(editable: Editable): Document {
        assertRequired(editable, "editable");
        return editable.ownerDocument;
    }

    export function getWindow(editable: Editable): Window {
        assertRequired(editable, "editable");
        return getDocument(editable).defaultView;
    }
}

interface IStashedHighlight {
    placeholderNode: TextNode;
    cursorNode: Node;
    cursorPosition: number;
}

export class RichTextAutocompleteHighlight {
    static AUTOCOMPLETE_HIGHLIGHT_CSS_CLASS = "richtext-autocomplete-highlight";

    private _element: ElementNode;
    private _editor: Editable;
    private _stashedHighlight: IStashedHighlight;

    public getElement(): ElementNode {
        return this._element;
    }

    public getEditable(): Editable {
        return this._editor;
    }

    public isInHighlight(textAtCursor: ITextAtCursor) {
        return this._isHighlightElement(textAtCursor && textAtCursor.parent);
    }

    public deleteHighlightAndContents(textAtCursor: ITextAtCursor) {
        if (this._element) {
            const elementParent = Dom.getParent(this._element);
            assert(!!parent, "this._element must have a parent");
            const elementIndex = Dom.getIndexInParent(this._element);
            $(this._element).removeClass(RichTextAutocompleteHighlight.AUTOCOMPLETE_HIGHLIGHT_CSS_CLASS);
            $(this._element).remove();
            Selection.clearCursorFormatting(textAtCursor.editable);

            if (this._editor) {
                Selection.setCursor(this._editor, elementParent, elementIndex);
            }
        }

        this._element = null;
        this._editor = null;
    }

    public checkForAndDeleteOrphanedHighlight(textAtCursor?: ITextAtCursor): boolean {
        if (this._element && !Dom.getParent(this._element)) {
            if (textAtCursor && textAtCursor.editable === this._editor) {
                const cursorNodeAndPosition = TextAtCursor.extractCursorNodeAndPosition(textAtCursor);
                Selection.clearCursorFormatting(textAtCursor.editable);
                Selection.setCursor(textAtCursor.editable, cursorNodeAndPosition.node, cursorNodeAndPosition.position);
            }
            this._element = null;
            this._editor = null;
            return true;
        }
        return false;
    }

    public replaceHighlightWithHtml(html: string) {
        if (this._element) {
            const $html = $.parseHTML(html, this._element.ownerDocument);
            /* For a person mention, $html is always an anchor node followed by a text element. this._element is always a span element
             * that would be replaced by $html. In cases like bug# 1222108, we need to make sure that the parent of this._element is body
             * and not another person mention. If that's the case, we should replace the parent mention itself with the selected identity
             * else we'll end up with two mentions when user actually sees only one identiy being selected in discussions.
             */
            if ($html && $html.length === 2 && $html[0].nodeName === "A" &&
                this._isElementAPersonMention($html[0]) && this._isElementAPersonMention(this._element.parentElement)) {
                $(this._element.parentElement).replaceWith($html);
            } else {
                $(this._element).replaceWith($html);
            }
            const replacements = $html;
            if (replacements.length > 0) {
                Selection.setCursorImmediatelyAfter(this._editor, replacements[replacements.length - 1]);
            }
        }
        this._element = null;
        this._editor = null;
    }

    public createHighlightFromTextSegment(textBlock: ITextAtCursor, start: number, end: number) {
        assert(!this._element && !this._editor, "a selection is already active");
        for (let i = 0; i < textBlock.nodes.length; i++) {
            const node = textBlock.nodes[i];
            $(node).remove();
        }
        let prevSibling = textBlock.prevSibling;
        if (start > 0) {
            const textNodeBefore = Dom.createTextNode(textBlock.editable, textBlock.text.substr(0, start));
            Dom.insertNode(textBlock.parent, prevSibling, textBlock.nextSibling, textNodeBefore);
            prevSibling = textNodeBefore;
        }
        this._editor = textBlock.editable;
        this._element = Dom.createSpanElement(textBlock.editable);
        $(this._element).addClass(RichTextAutocompleteHighlight.AUTOCOMPLETE_HIGHLIGHT_CSS_CLASS);

        this._element.textContent = textBlock.text.substr(start, end - start);
        Dom.insertNode(textBlock.parent, prevSibling, textBlock.nextSibling, this._element);
        prevSibling = this._element;
        if (end < textBlock.text.length) {
            const textNodeAfter = Dom.createTextNode(textBlock.editable, textBlock.text.substr(end));
            Dom.insertNode(textBlock.parent, prevSibling, textBlock.nextSibling, textNodeAfter);
        }
        Selection.setCursorAtEnd(this._editor, this._element);
    }

    public revertHighlightToTextSegment(textAtCursor?: ITextAtCursor) {
        if (!this._element) return;
        if (this.checkForAndDeleteOrphanedHighlight(textAtCursor)) return;
        const parent = Dom.getParent(this._element);
        if (!this._element.childNodes.length) {
            this.deleteHighlightAndContents(textAtCursor);
            return;
        }
        let cursorNodeAndPosition: { node: Node, position: number };
        if (textAtCursor && this._editor && textAtCursor.editable === this._editor) {
            cursorNodeAndPosition = TextAtCursor.extractCursorNodeAndPosition(textAtCursor);
        }
        $(this._element).replaceWith(Dom.createArrayFromNodeList(this._element.childNodes));
        if (cursorNodeAndPosition) {
            Selection.clearCursorFormatting(textAtCursor.editable);
            if (this._editor) {
                // In firefox it seems that the above call to clearCursorFormatting executes a browser command
                // called 'removeFormat' which will allow other events to fire, eventually causing this._editor to be
                // nulled out.
                Selection.setCursor(this._editor, cursorNodeAndPosition.node, cursorNodeAndPosition.position);
            }
        }

        this._element = null;
        this._editor = null;
    }

    public stashHighlight(textAtCursor?: ITextAtCursor) {
        assert(!!this._element, "requires an active selection");

        if (!this._element || this.checkForAndDeleteOrphanedHighlight(textAtCursor)) return;
        if (!textAtCursor || !Dom.isSameNode(textAtCursor.parent, this._element)) {
            this.revertHighlightToTextSegment(textAtCursor);
            return;
        }

        const cursorNodeAndPosition = TextAtCursor.extractCursorNodeAndPosition(textAtCursor);
        const placeholder = this._editor.ownerDocument.createTextNode(this._element.textContent);
        $(this._element).replaceWith(placeholder);
        this._stashedHighlight = {
            placeholderNode: placeholder,
            cursorNode: cursorNodeAndPosition.node,
            cursorPosition: cursorNodeAndPosition.position
        };
    }

    public unstashHighlight() {
        const stash = this._stashedHighlight;
        if (!stash) return;
        this._stashedHighlight = null;
        assert(!Dom.getParent(this._element), "stashed element should not have a parent");
        const parent = Dom.getParent(stash.placeholderNode);
        if (!parent) return;
        $(stash.placeholderNode).replaceWith(this._element);
        Selection.setCursor(this._editor, stash.cursorNode, stash.cursorPosition);
    }

    private _isHighlightElement(x: ElementNode) {
        if (!x) return false;
        const result = Dom.isElementNode(x) && $(x).hasClass(RichTextAutocompleteHighlight.AUTOCOMPLETE_HIGHLIGHT_CSS_CLASS);
        if (result && this._element && !Dom.isSameNode(x, this._element)) {
            Diag.logWarning("found autocomplete selection node which does not match the stored one");
        }
        return result;
    }

    private _isElementAPersonMention(element: HTMLElement): boolean {
        if (element &&
            element.nodeName === "A") {
            const mentionAttributeValue = element.getAttribute(Mention.Constants.HTML_MENTION_ATTR_NAME);
            if (mentionAttributeValue) {
                return ((Utils_String.startsWith(mentionAttributeValue, Mention.Constants.HTML_MENTION_VERSION_10) && Utils_String.startsWith(element.getAttribute("href"), Mention.Constants.HTML_MENTION_LEGACY_FORMAT_HREF)) || //For On-Prem that still has old mentions format
                    MentionPeople.Helpers.REGEX_PERSON_MENTION_IN_WORKITEM_DISC.test(mentionAttributeValue));
            }
        }
        return false;
    }
}

export class RichTextAutocompleteHighlightShadow {
    private static CHANGE_DELAY_MS: number = 400;
    private _$element: JQuery;

    constructor(private _autocompleteHighlight: RichTextAutocompleteHighlight, private _width: string) {
        this._$element = $("<div>")
            .css("position", "absolute")
            .css("visibility", "hidden");
    }

    public initialize($container: JQuery) {
        this._$element.appendTo($container);
    }

    public getElement(): JQuery {
        return this._$element;
    }

    public update: () => void = Utils_Core.throttledDelegate(this, RichTextAutocompleteHighlightShadow.CHANGE_DELAY_MS, () => {
        let element = this._autocompleteHighlight.getElement();
        const editable = this._autocompleteHighlight.getEditable();
        if (!element || !editable) return;
        const editorFrame = EditableHelpers.getFrame(editable);
        const editorDoc = EditableHelpers.getDocument(editable);
        if (!editorDoc) {
            Diag.logWarning("editable does not have a document. aborting operation.");
            return;
        };

        const $editorFrame = editorFrame ? $(editorFrame) : null;
        const $highlightDoc = $(editorDoc);
        const highlightScroll = {
            top: $highlightDoc.scrollTop(),
            left: $highlightDoc.scrollLeft(),
        };

        // When undoing, elements may be recycled and reference become stale,
        // so we need to check to see if element is stale (no longer contained in the editable)
        // and if so, we get the current selection
        if (!editable.contains(element)) {
            const textAtCursor = TextAtCursor.getFromCurrentSelection(editable);
            if (textAtCursor) {
                element = textAtCursor.parent;
            }
        }
        const highlightRect = element.getBoundingClientRect();
        const zIndex = editorFrame ? (<any>$editorFrame).zIndex() : $(editable).zIndex();
        const frameOffset = editorFrame ? $editorFrame.offset() : { left: 0, top: 0 };
        this._$element.css({
            width: this._width,
            height: highlightRect.height,
            left: frameOffset.left + highlightRect.left - highlightScroll.left,
            top: frameOffset.top + highlightRect.top - highlightScroll.top,
            "z-index": zIndex || ""
        });
    }, undefined, Utils_Core.ThrottledDelegateOptions.Immediate + Utils_Core.ThrottledDelegateOptions.QueueNext);
}

/**
 * Singleton control, when attached to a RichText instance (via {@link RichEditorAutocompleteExtension}), provides mentions
 * autocomplete functionality. It basically subscribes to input events and delegates them to {@link AutocompleteManager}.
 */
export class RichTextAutocompleteControl extends Controls.Control<MentionAutocompleteControls.IAutocompleteOptions> {
    /**
     * With the singleton model, this custom event will be triggered against the contenteditable element when there is
     * an autocomplete selection.
     */
    public static SELECTED_EVENT_NAME = "autocompleteSelect";

    private static MENU_WIDTH = "300px";
    private static INTERCEPTED_EVENT_KEYCODES = [UI.KeyCode.ESCAPE, UI.KeyCode.TAB, UI.KeyCode.ENTER];
    private static MANUAL_EVENT: JQueryEventObject = jQuery.Event("manual");

    private static _instance: RichTextAutocompleteControl;

    private _autocompleteHighlight: RichTextAutocompleteHighlight;
    private _autocompleteManager: MentionAutocompleteControls.AutocompleteManager;
    private _autocompleteHighlightShadow: RichTextAutocompleteHighlightShadow;

    private _lastKeydownTextAtCursor: ITextAtCursor;
    private _lastHandleEventEditor: Editable;
    private _inComposition: boolean = false;
    private _isFirstAnnounce: boolean = true;

    private _artifactContextStack: MentionAutocomplete.IMentionArtifactContext[] = [];

    private static _createAutocompleteManager(options: MentionAutocompleteControls.IAutocompleteSessionManagerOptions,
        pluginOptions: MentionAutocomplete.IAutocompletePluginOptions): MentionAutocompleteControls.AutocompleteManager {
        return new MentionAutocompleteControls.AutocompleteManager(options, pluginOptions);
    }

    private static _createRichTextAutocompleteHighlight(): RichTextAutocompleteHighlight {
        return new RichTextAutocompleteHighlight();
    }

    private static _createRichTextAutocompleteHighlightShadow(autocompleteHighlight: RichTextAutocompleteHighlight, width: string): RichTextAutocompleteHighlightShadow {
        return new RichTextAutocompleteHighlightShadow(autocompleteHighlight, width);
    }

    private static _getDocument(): JQuery {
        return $(document);
    }

    private static _getWindow(): JQuery {
        return $(window);
    }

    private static _getBody(): JQuery {
        return $(document.body);
    }

    private static _isInlineEditor(editable: HTMLElement) {
        return editable && editable.classList.contains("text-element");
    }

    public static getInstance() {
        if (!RichTextAutocompleteControl._instance) {
            const options = RichTextAutocompleteControl._getAutocompleteOptions();
            // Fix for Bug 479190: Page navigation interrupts typing in work item form (keyboard shortcuts)
            //   which is caused by JQuery UI bug https://bugs.jqueryui.com/ticket/9166
            // This is a temporary work-around until we can upgrade to JQuery UI 1.11.0 in which this bug is fixed.
            // The root cause is that the JQuery UI Dialog widget will move any DOM elements after it in the body 
            //   to before it. The move causes the selection / focus issue. By inserting our container before the 
            //   .ui-dialog element, we avoid triggering the move.   
            var $container = $("<div>");
            var $uiDialog = RichTextAutocompleteControl._getBody().find("> .ui-dialog");
            if ($uiDialog.length) {
                $container.insertBefore($uiDialog);
            }
            else {
                $container.appendTo(RichTextAutocompleteControl._getBody());
            }
            // ---
            RichTextAutocompleteControl._instance = <RichTextAutocompleteControl>Controls.Control.createIn(RichTextAutocompleteControl, $container, options);
        }
        return RichTextAutocompleteControl._instance;
    }

    private static _getAutocompleteOptions(): MentionAutocompleteControls.IAutocompleteOptions {
        const pluginConfigs: MentionAutocompleteControls.IAutocompletePluginConfig<any>[] = getMentionPlugins([MentionPluginType.Person, MentionPluginType.PullRequest]);
        pluginConfigs.push({
            factory: options => new MentionWorkItems.WorkItemAutocompleteProvider(options),
            options: {
                allowHorizontalShift: true
            }
        });
        return { pluginConfigs };
    }

    constructor(options?: MentionAutocompleteControls.IAutocompleteOptions) {
        super(options);

        this._autocompleteHighlight = RichTextAutocompleteControl._createRichTextAutocompleteHighlight();

        this._autocompleteManager = RichTextAutocompleteControl._createAutocompleteManager({
            pluginConfigs: this._options.pluginConfigs,
            open: MentionHelpers.delegate(this, this._sessionOpen),
            close: MentionHelpers.delegate(this, this._sessionClose),
            select: MentionHelpers.delegate(this, this._sessionSelect),
            getMentionArtifactContext: () => {
                return this.getCurrentArtifactContext();
            },
            focus: MentionHelpers.delegate(this, this._workItemMentionFocusChange),
        }, {
                menuContainer: MentionHelpers.delegate(this, this.getElement),
                positioningElement: () => this._autocompleteHighlightShadow.getElement(),
                isMenuWidthOverridable: true,
                textElement: (): JQuery => {
                    const editable = this._lastHandleEventEditor;
                    if (RichTextAutocompleteControl._isInlineEditor(editable)) {
                        return $(editable);
                    }

                    return this._autocompleteHighlightShadow.getElement();
                }
            });

        this._autocompleteHighlightShadow = RichTextAutocompleteControl._createRichTextAutocompleteHighlightShadow(
            this._autocompleteHighlight,
            RichTextAutocompleteControl.MENU_WIDTH
        );
    }

    public initialize() {
        super.initialize();
        this._autocompleteManager.initialize();
        this._autocompleteHighlightShadow.initialize(this.getElement());
        this._attachContainerDocumentAndWindowEvents();
    }

    public prefetch() {
        this._autocompleteManager.prefetch();
    }

    public pushArtifactContext(context: MentionAutocomplete.IMentionArtifactContext) {
        this._artifactContextStack.push(context);
    }

    public popArtifactContext() {
        this._artifactContextStack.pop();
    }

    /*
    * Currently this only supports discussion context by maintaing a discussion context stack. Ideally should be changed to
    * something more generic, potentially by using Editable to hold the artifact context.
    */
    public getCurrentArtifactContext(): MentionAutocomplete.IMentionArtifactContext {
        if (this._artifactContextStack.length > 0) {
            return this._artifactContextStack[this._artifactContextStack.length - 1];
        }

        return undefined;
    }

    public attachToEditable(editable: Editable) {
        assertRequired(editable, "editable");
        assert(editable.isContentEditable, "editable must be contenteditable");
        assert(!!EditableHelpers.getDocument(editable), "editable must be attached to a Document");
        assert(!!EditableHelpers.getWindow(editable), "editable must be attached to a Window");
        this._attachEditorEvents(editable);
    }

    public resetEditable(event: JQueryEventObject, editable: Editable) {
        if (this._autocompleteHighlight.getEditable() === editable) {
            this._forceCancelAutocomplete(event);
        }
    }

    public stashHighlight(editable: Editable) {
        if (editable !== this._autocompleteHighlight.getEditable()) return;
        const textAtCursor = TextAtCursor.getFromCurrentSelection(editable);
        if (!textAtCursor) return;
        this._autocompleteHighlight.stashHighlight(textAtCursor);
    }

    public unstashHighlight(editable: Editable) {
        if (editable !== this._autocompleteHighlight.getEditable()) return;
        this._autocompleteHighlight.unstashHighlight();
    }

    public cleanUpEditor(editable: Editable) {
        const selectedEditor = this._autocompleteHighlight.getEditable();
        if (selectedEditor && selectedEditor.id === editable.id) {
            const event = $.Event("editorCleanUp"); // Event is only used for telemetry purposes.
            this._forceCancelAutocomplete(event);
        }
    }

    public closeActiveAutocomplete() {
        this._forceCancelAutocomplete(RichTextAutocompleteControl.MANUAL_EVENT);
    }

    public suggest(editable: Editable) {
        assertRequired(editable, "editable");

        const textAtCursor = TextAtCursor.getFromCurrentSelection(editable);
        if (!textAtCursor) {
            return;
        }

        const textBeforeSelection = textAtCursor.text.substring(0, textAtCursor.cursorPosition);
        const inputText: MentionAutocomplete.IInputText = {
            textBeforeSelection,
            textInSelection: "",
            textAfterSelection: "",
        };

        this._handleEvent(RichTextAutocompleteControl.MANUAL_EVENT, textAtCursor, inputText);
    }

    private _sessionOpen(range: MentionAutocomplete.IRange) {
        this._isFirstAnnounce = true;
        if (this._lastHandleEventEditor) {
            const textAtCursor = TextAtCursor.getFromCurrentSelection(this._lastHandleEventEditor);
            this._autocompleteHighlight.createHighlightFromTextSegment(textAtCursor, range.start, range.end);
            this._autocompleteHighlightShadow.update();
        }

        Events_Services.getService()
            .attachEvent(IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, this._updatePeopleActiveDescendantHandler);

        if (this._options.open) {
            this._options.open(range);
        }
    }

    private _sessionClose() {
        if (this._lastHandleEventEditor) {
            const textAtCursor = TextAtCursor.getFromCurrentSelection(this._lastHandleEventEditor);
            this._autocompleteHighlight.revertHighlightToTextSegment(textAtCursor);
        }

        Events_Services.getService()
            .detachEvent(IdentityPickerDropdownControl.UPDATE_ACTIVE_DESCENDANT_ID, this._updatePeopleActiveDescendantHandler);

        if (this._options.close) {
            this._options.close();
        }
    }

    private _sessionSelect(replacement: MentionAutocomplete.IAutocompleteReplacement) {
        const highlightEditor = this._autocompleteHighlight.getEditable();
        this._autocompleteHighlight.replaceHighlightWithHtml(replacement.getHtml());
        Selection.collapseSelectionToEnd(highlightEditor);
        highlightEditor.dispatchEvent(new CustomEvent(RichTextAutocompleteControl.SELECTED_EVENT_NAME));
    }

    /**
     * This event handler is used by #mentions to handle active descendant change.
     * * @see {@link _updatePeopleActiveDescendantHandler} for @mentions.
     */
    private _workItemMentionFocusChange(replacement: MentionAutocomplete.IAutocompleteReplacement) {
        const mentionItemText = $(replacement.getHtml()).text();
        this._announceSelection(mentionItemText);
    }

    private _attachContainerDocumentAndWindowEvents() {
        RichTextAutocompleteControl._getDocument().on("scroll", (e) => {
            this._forceCancelAutocomplete(e);
        });
        RichTextAutocompleteControl._getWindow().on("resize", (e) => {
            this._forceCancelAutocomplete(e);
        });
    }

    private _attachEditorEvents(editable: Editable) {
        const $editable = $(editable);
        $editable.on("keyup keydown keypress input click", (e) => {
            /** Samsung keyboard uses composition events to provide autocomplete experience. We don't want to disable it
             * in all the cases since language IME also uses the same set of events. So when we encounter key code being
             * 'Unidentified' that seems to be unique to autocomplete experience, we break out of the composition mode.
             */
            if (e.key === "Unidentified") {
                this._inComposition = false;
            }
            if (!this._inComposition) {
                return this._handleEditorUserInputEvent(e, editable);
            }
            e.stopPropagation();
        });
        $editable.on("compositionstart", (e) => {
            this._inComposition = true;
        });
        $editable.on("compositionend", (e) => {
            this._inComposition = false;
        });

        $editable.on("blur", (e) => {
            // Fix Bug 1136627: IE11: Auto completes (#, @mentions) clicking on scroll button closes picker
            // IE11 fires blur event when scrollbar in the pickers was clicked
            const $activeElement = $(document.activeElement);
            if ($activeElement.is(".identity-picker-dropdown") || $activeElement.is(".mention-autocomplete-menu")) {
                return;
            }

            this._forceCancelAutocomplete(e);
        });

        $editable.on("focus", (e) => {
            this.prefetch();
        });
        $editable.on("paste", (e) => {
            return this._handleEditorPasteEvent(e, editable);
        });
        const $document = $(EditableHelpers.getDocument(editable));
        $document.on("scroll", (e) => {
            this._forceCancelAutocomplete(e);
        });
    }

    /**
     * This event handler is used by @mentions to handle active descendant change.
     * @see {@link _workItemMentionFocusChange} for #mentions.
     */
    private _updatePeopleActiveDescendantHandler = (args: UpdateActiveDescendantEventData): void => {
        const $activeDescendant = $(`#${args.activeDescendantId}`);
        const text = `${$activeDescendant.find(".title").text()}. ${$activeDescendant.find(".subtitle").text()}`;
        this._announceSelection(text);
    }

    /**
     * Announce the selected mention item.
     * @param mentionText text of the selected mention item.
     */
    private _announceSelection(mentionItemText: string) {
        if (RichTextAutocompleteControl._isInlineEditor(this._lastHandleEventEditor)) {
            return; // inline editor has correct aria attributes and doesn't need manual announce
        }

        if (mentionItemText) {
            const label = Utils_String.format(MentionResources.WorkItemMentionOptionSelected, mentionItemText);
            let assertive = true;
            if (this._isFirstAnnounce) {
                // Due to our incompatible use of autocomplete and richtext, screen reader will say things like up/down, #, @, etc.
                // To prevent those from overriding what we want to announce, we need to use an assertive announce.
                // For the first announce, reading of the footer ("n suggestions") is assertive, and we want to follow that by
                // announcing the selected item politely here. From there, we want to make sure announcing of selected item is assertive.
                assertive = false;
                this._isFirstAnnounce = false;
            }

            Core.delay(this, 0, () => Accessibility.announce(label, assertive)); // queue up an announce
        }
    }

    /**
     * Force cancels the current auto complete session and optionally ignores resetting the current cursor
     * position.
     */
    private _forceCancelAutocomplete(event: JQueryEventObject): boolean | void {
        return this._autocompleteManager.close(event, {
            textBeforeSelection: "",
            textInSelection: "",
            textAfterSelection: ""
        });
    }

    private _handleEvent(event: JQueryEventObject, textAtCursor: ITextAtCursor, newValue?: MentionAutocomplete.IInputText): boolean | void {
        this._lastHandleEventEditor = textAtCursor.editable;
        const wasActive = this._autocompleteManager.isActive();
        const result = this._autocompleteManager.handleEvent(event, newValue);
        if (wasActive && RichTextAutocompleteControl.INTERCEPTED_EVENT_KEYCODES.some(keyCode => keyCode === event.keyCode)) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
        return result;
    }

    private _handleEditorUserInputEvent(event: JQueryEventObject, editable: Editable): boolean | void {
        assertRequired(editable, "editable");
        const textAtCursor = TextAtCursor.getFromCurrentSelection(editable);

        if (this._autocompleteHighlight.checkForAndDeleteOrphanedHighlight(textAtCursor)) {
            this._forceCancelAutocomplete(event);
        }

        if (event.type === "keydown") {
            this._lastKeydownTextAtCursor = textAtCursor;
        } else if (event.type === "keyup") {
            if (this._autocompleteHighlight.isInHighlight(textAtCursor)) {
                if (!textAtCursor.text) {
                    return this._forceCancelAutocomplete(event);
                } else if (this._lastKeydownTextAtCursor.text !== textAtCursor.text) {
                    const inputText: MentionAutocomplete.IInputText = {
                        textBeforeSelection: textAtCursor.text,
                        textInSelection: "",
                        textAfterSelection: "",
                    }
                    this._autocompleteHighlightShadow.update();
                    return this._handleEvent(event, textAtCursor, inputText);
                }
            } else if (TextAtCursor.areSameTextBlock(this._lastKeydownTextAtCursor, textAtCursor) && this._lastKeydownTextAtCursor.text !== textAtCursor.text) {
                const textBeforeSelection = textAtCursor.text.substring(0, textAtCursor.cursorPosition);
                const inputText: MentionAutocomplete.IInputText = {
                    textBeforeSelection,
                    textInSelection: "",
                    textAfterSelection: "",
                };
                return this._handleEvent(event, textAtCursor, inputText);
            } else {
                return this._forceCancelAutocomplete(event);
            }
        } else if (event.type === "click") {
            if (!this._autocompleteHighlight.isInHighlight(textAtCursor)) {
                return this._forceCancelAutocomplete(event);
            }
        }

        if (this._autocompleteManager.isActive()) {
            return this._handleEvent(event, textAtCursor);
        }
    }

    private _handleEditorPasteEvent(event: JQueryEventObject, editable: Editable): void | boolean {
        const textAtCursor = TextAtCursor.getFromCurrentSelection(editable);
        if (!this._autocompleteHighlight.isInHighlight(textAtCursor)) {
            return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();

        var originalEvent = <any>event;
        while (originalEvent.originalEvent) {
            originalEvent = originalEvent.originalEvent;
        }

        if (!originalEvent.clipboardData) {
            return;
        }

        var pastedText = originalEvent.clipboardData.getData("text/plain");

        if (!pastedText) {
            return;
        }

        var nodeAndPosition = TextAtCursor.extractCursorNodeAndPosition(textAtCursor);
        var currentNode = <TextNode>nodeAndPosition.node;
        var currentPosition = nodeAndPosition.position;

        assert(Dom.isTextNode(currentNode), "Expected cursor to be in a text node.");
        currentNode.data = currentNode.data.substring(0, currentPosition) + pastedText + currentNode.data.substring(currentPosition);

        Selection.setCursor(editable, currentNode, currentPosition + pastedText.length);

        const inputText: MentionAutocomplete.IInputText = {
            textBeforeSelection: currentNode.data,
            textInSelection: "",
            textAfterSelection: ""
        };

        this._autocompleteHighlightShadow.update();
        return this._handleEvent(event, textAtCursor, inputText);
    }
}
