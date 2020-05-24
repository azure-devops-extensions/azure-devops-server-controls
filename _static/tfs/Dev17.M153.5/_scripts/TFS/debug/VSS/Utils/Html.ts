
import Diag = require("VSS/Diag");
import * as Utils_Array from "VSS/Utils/Array";
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");

module TagHelper {

    export interface TagReplacement {
        /**
         * Tag to replace with
         */
        tagToReplace: string;

        /**
         * Text to add after the close tag
         */
        afterTagText?: string;
    }

    interface TagInfo {
        attributes: Object;
        eolBefore: boolean;
        eolAfter: boolean;
    }

    var hashAllowed: { [key: string]: TagInfo };
    var hashSpecial;
    var hashAttributes: { [key: string]: any };
    var hashProtocolAttributes;
    var hashCustomProtocolFilters;
    var hashAllowedStyles;
    var hashFormatting: IDictionaryStringTo<TagReplacement>;

    /**
     * Adds attributes to given object
     */
    function addAttributes(obj: { [key: string]: number }, attributes: any): void {
        if (!attributes) {
            return;
        }

        if (Array.isArray(attributes)) {
            for (let i = 0; i < attributes.length; i++) {
                obj[attributes[i].toUpperCase()] = 0;
            }

            return;
        }

        for (const attrName of Object.keys(attributes)) {
            const value = attributes[attrName];
            obj[attrName.toUpperCase()] = value ? value : 0;
        }
    }

    /**
     * Adds attributes to common attribute hashmap
     */
    function addCommonAttributes(attributes: any): void {
        addAttributes(hashAttributes, attributes);
    }

    /**
     * Adds a single tags to hashmap
     * 
     * @param attributes 
     */
    function addTag(tag: string, eolBefore: boolean, eolAfter: boolean, attributes?: any): void {
        const tagInfo = {
            attributes: {},
            eolBefore: eolBefore,
            eolAfter: eolAfter
        };
        hashAllowed[tag.toUpperCase()] = tagInfo;
        addAttributes(tagInfo.attributes, attributes);
    }

    /**
     * Adds tags to hashmap
     */
    function addTags(tags: string[]) {
        (tags || []).forEach(t => addTag(t, false, false));
    }

    /**
     * Adds special tags to hashmap
     */
    function addSpecialTags(tags: string[]): void {
        (tags || []).forEach(t => hashSpecial[t.toUpperCase()] = 0);
    }

    function ensureAllowedTags() {
        if (!hashAllowed) {
            hashAllowed = {};

            // add tags with specific attributes
            addTag("a", false, false, { charset: 0, href: 0, hreflang: 0, name: 0, rel: 0, rev: 0, shape: 0, tabindex: 0, target: { _BLANK: 0 }, type: 0 });
            addTag("blockquote", true, true, ["cite"]);
            addTag("br", false, true, ["clear"]);
            addTag("caption", true, true, ["align"]);
            addTag("col", true, true, ["align", "char", "charoff", "span", "valign", "width"]);
            addTag("colgroup", true, true, ["align", "char", "charoff", "span", "valign", "width"]);
            addTag("del", false, false, ["cite", "datetime"]);
            addTag("dir", true, true, ["compact"]);
            addTag("div", true, true, ["align"]);
            addTag("dl", true, true, ["compact"]);
            addTag("font", false, false, ["color", "face", "size"]);
            addTag("h1", true, true, ["align"]);
            addTag("h2", true, true, ["align"]);
            addTag("h3", true, true, ["align"]);
            addTag("h4", true, true, ["align"]);
            addTag("h5", true, true, ["align"]);
            addTag("h6", true, true, ["align"]);
            addTag("hr", true, true, ["align", "size", "width"]);
            addTag("img", false, false, ["align", "alt", "border", "height", "hspace", "ismap", "longdesc", "name", "src", "usemap", "vspace", "width", "alt2", "src2"]);
            addTag("video", true, true, ["border", "height", "src", "width", "controls", "poster", "muted", "loop"]);
            addTag("ins", false, false, ["cite", "datetime"]);
            addTag("li", true, true, ["type", "value"]);
            addTag("map", false, false, ["name"]);
            addTag("menu", true, true, ["compact"]);
            addTag("input", true, true, { checked: 0, disabled: 0, type: { CHECKBOX: 0, TEXT: 0 } });
            addTag("ol", true, true, ["compact", "start", "type"]);
            addTag("p", true, true, ["align"]);
            addTag("pre", true, true, ["width"]);
            addTag("q", false, false, ["cite"]);
            addTag("table", true, true, ["align", "border", "cellpadding", "cellspacing", "frame", "rules", "summary", "width", "caption"]);
            addTag("tbody", false, false, ["align", "char", "charoff", "valign"]);
            addTag("td", true, true, ["abbr", "align", "axis", "char", "charoff", "colspan", "headers", "height", "nowrap", "rowspan", "scope", "valign", "width"]);
            addTag("tfoot", true, true, ["align", "char", "charoff", "valign"]);
            addTag("th", true, true, ["abbr", "align", "axis", "char", "charoff", "colspan", "headers", "height", "nowrap", "rowspan", "scope", "valign", "width"]);
            addTag("thead", true, true, ["align", "char", "charoff", "valign"]);
            addTag("tr", true, true, ["align", "char", "charoff", "valign"]);
            addTag("ul", true, true, ["compact", "type"]);
            addTag("dd", true, true, []);
            addTag("dt", true, true, []);

            // add tags without attributes
            addTags(["abbr", "acronym", "address", "b", "bdo", "big", "center", "cite", "code", "dfn", "em", "i"]);
            addTags(["kbd", "s", "samp", "small", "span", "strike", "strong", "sub", "sup", "tt", "u", "var"]);
            addTags(["annotation", "math", "mfrac", "mi", "mn", "mo", "mover", "mrel", "mrow", "mspace", "msqrt", "mstyle", "msub", "msubsup", "msup", "mtext", "semantics"]);
        }
    }

    function ensureFormattingTags() {
        if (!hashFormatting) {
            hashFormatting = {};

            var removalTags = ["b", "i", "u", "em", "small", "strong", "sub", "sup", "ins",
                "del", "mark", "font", "code", "pre", "h1", "h2", "h3", "h4", "h5", "h6",
                "strike", "ul", "ol", "dl", "table", "tbody", "colgroup",
                "col", "tfoot", "thead"];

            var replacementTags: { [key: string]: TagReplacement } = {
                "li": { tagToReplace: "p" },
                "dt": { tagToReplace: "p" },
                "dd": { tagToReplace: "p" },
                "tr": { tagToReplace: "div" },
                "th": { tagToReplace: "span", afterTagText: " " },
                "td": { tagToReplace: "span", afterTagText: " " }
            };

            for (var i = 0; i < removalTags.length; i++) {
                hashFormatting[removalTags[i].toUpperCase()] = { tagToReplace: "" };
            }

            for (let item of Object.keys(replacementTags)) {
                hashFormatting[item.toUpperCase()] = replacementTags[item];
            }
        }
    }

    function ensureSpecialTags() {
        if (!hashSpecial) {
            hashSpecial = {};

            // add special tags (to ignore entire body)
            addSpecialTags(["script", "style", "option", "select", "textarea"]);
        }
    }

    function ensureCommonAttributes() {
        if (!hashAttributes) {
            hashAttributes = {};

            // add attributes for all tags
            addCommonAttributes(["dir", "lang", "title", "style", "id", "class", "contenteditable"]);

            // add role attribute for known values
            addCommonAttributes({
                "role": {
                    BUTTON: 0, CHECKBOX: 0, CELL: 0, COLUMNHEADER: 0, COMBOBOX: 0, GRID: 0, GRIDCELL: 0, HEADING: 0, LINK: 0,
                    LISTBOX: 0, MENU: 0, MENUBAR: 0, MENUITEM: 0, MENUITEMCHECKBOX: 0, MENUITEMRADIO: 0, OPTION: 0,
                    RADIO: 0, RADIOGROUP: 0, ROW: 0, ROWGROUP: 0, ROWHEADER: 0, SWITCH: 0, TAB: 0, TABLIST: 0, TOOLTIP: 0,
                    TREE: 0, TREEGRID: 0, TREEITEM: 0
                }
            });

            // add aria attributes for all tags
            addCommonAttributes(["aria-label", "aria-labelledby", "aria-describedby"]);

            // add aria attributes with scoped values
            addCommonAttributes({ "aria-hidden": { TRUE: 0, FALSE: 0 } });

            // add aria attributes with scoped values
            addCommonAttributes({ "aria-disabled": { TRUE: 0, FALSE: 0 } });
        }
    }

    function ensureProtocolAttributes() {
        if (!hashProtocolAttributes) {
            hashProtocolAttributes = {};
            addAttributes(hashProtocolAttributes, ["src", "href", "cite", "longdesc"]);
            addAttributes(hashProtocolAttributes, ["background-image", "list-style-image"]);
        }
    }

    function ensureCustomProtocolFilters() {
        if (!hashCustomProtocolFilters) {
            hashCustomProtocolFilters = {};

            const isImageSource = function (tagName: string, attributeName: string): boolean {
                return tagName && tagName.toUpperCase() === "IMG" && attributeName && attributeName.toUpperCase() === "SRC";
            };

            // Blob protocol is allowed for image src
            hashCustomProtocolFilters.BLOB = function (tagName: string, attributeName: string, attributeValue: string): boolean {
                if (!isImageSource(tagName, attributeName)) {
                    return false;
                }

                const firstColonIndex: number = attributeValue.indexOf(":");
                const blobUrl: string = attributeValue.substr(firstColonIndex + 1);

                return blobUrl.indexOf(":") >= 0 ? Utils_Url.isSafeProtocol(blobUrl) : true;
            };

            // Data protocol is allowed for image src
            hashCustomProtocolFilters.DATA = function (tagName: string, attributeName: string, attributeValue: string): boolean {
                return isImageSource(tagName, attributeName)
                    ? attributeValue.toUpperCase().search("DATA:IMAGE/\\w+;") === 0 // Only allow data explicitly provided with image/* content type
                    : false;
            };
        }
    }

    function ensureAllowedStyles() {
        if (!hashAllowedStyles) {
            hashAllowedStyles = {};
            addAttributes(hashAllowedStyles, [
                "background", "background-attachment", "background-color", "background-image",
                "background-position", "background-repeat", "border", "border-bottom", "border-bottom-color",
                "border-bottom-style", "border-bottom-width", "border-collapse", "border-color", "border-left",
                "border-left-color", "border-left-style", "border-left-width", "border-right", "border-right-color",
                "border-right-style", "border-right-width", "border-spacing", "border-style", "border-top",
                "border-top-color", "border-top-style", "border-top-width", "border-width", "caption-side",
                "clear", "color", "float", "font", "font-family", "font-size", "font-style", "font-variant",
                "font-weight", "height", "letter-spacing", "line-height", "list-style", "list-style-image",
                "list-style-position", "list-style-type", "margin", "margin-bottom", "margin-left", "margin-right",
                "margin-top", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top",
                "table-layout", "text-align", "text-decoration", "text-indent", "text-transform", "vertical-align",
                "white-space", "width", "word-spacing"
            ]);
        }
    }

    /**
     * Helper method to compare two tag names
     */
    export function areTagsEqual(tag1, tag2) {
        if (tag1 && tag2) {
            return tag1.toUpperCase() === tag2.toUpperCase();
        }
        return false;
    }

    /**
     * Checks if the given tag is allowed
     */
    export function isAllowedTag(tag) {

        if (tag) {
            ensureAllowedTags();
            return tag.toUpperCase() in hashAllowed;
        }
        return false;
    }

    export function shouldAddEolBeforeTag(tag: string): boolean {
        return _shouldAddEol(tag, true);
    }

    export function shouldAddEolAfterTag(tag: string): boolean {
        return _shouldAddEol(tag, false);
    }

    function _shouldAddEol(tag: string, before: boolean): boolean {
        if (tag) {
            ensureAllowedTags();

            var tagUpper = tag.toUpperCase();

            if (tagUpper in hashAllowed) {
                if (before) {
                    return hashAllowed[tagUpper].eolBefore;
                }
                else {
                    return hashAllowed[tagUpper].eolAfter;
                }
            }
        }

        return false;
    }

    /**
     * Checks if the given tag is a formatting removal tag
     */
    export function isFormattingRemovalTag(tag: string) {
        if (tag) {
            ensureFormattingTags();
            var existingTag = hashFormatting[tag.toUpperCase()];

            if (existingTag !== undefined
                && existingTag.tagToReplace != null
                && existingTag.tagToReplace.length === 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Checks if the given tag is a formatting replace tag
     */
    export function getFormattingReplacementTag(tag: string): TagReplacement {
        if (tag) {
            ensureFormattingTags();
            var existingTag = hashFormatting[tag.toUpperCase()];

            if (existingTag && existingTag.tagToReplace && existingTag.tagToReplace.length > 0) {
                return existingTag;
            }
        }

        return null;
    }

    /**
     * Checks if the given tag is special
     */
    export function isSpecialTag(tag) {

        if (tag) {
            ensureSpecialTags();
            return tag.toUpperCase() in hashSpecial;
        }
        return false;
    }

    /**
     * Checks if the given attribute is allowed
     */
    export function isAllowedAttribute(tag: string, attribute: string, parseContext: ParseContext): boolean {

        if (attribute) {
            ensureCommonAttributes();

            const normalizedAttribute = attribute.toUpperCase();
            const additionalInvalidAttributes = parseContext.invalidAttributes;
            const additionalValidAttributes = parseContext.validAttributes;

            if (additionalInvalidAttributes && additionalValidAttributes &&
                normalizedAttribute in additionalInvalidAttributes && normalizedAttribute in additionalValidAttributes) {
                throw new Error(`${normalizedAttribute} is specified in additionalInvalidAttributes and additionalValidAttributes. Attributes may only appear in either the whitelist or blacklist.`)
            }

            if (additionalValidAttributes && normalizedAttribute in additionalValidAttributes) {
                return true;
            }

            // Checking whether the attribute is in common attribute hash
            if (normalizedAttribute in hashAttributes) {

                // For displaying user specified html we need to remove 'CLASS' attributes as they may refer to classes that we 
                // define in our own CSS which causes many issues.
                if (additionalInvalidAttributes &&
                    normalizedAttribute in additionalInvalidAttributes) {
                    return false;
                }

                return true;
            }

            if (tag) {
                // If not in the common hash, checking to see it exists in the 
                // attributes of the given tag
                ensureAllowedTags();
                var tagAttributes = hashAllowed[tag.toUpperCase()];
                if (tagAttributes) {
                    return normalizedAttribute in tagAttributes.attributes;
                }
            }
        }
        return false;
    }

    function isAllowedValue(tag: string, attribute: string, value: string): boolean {
        const attributeKey = attribute.toUpperCase();
        let allowedValues = hashAllowed[tag.toUpperCase()].attributes[attributeKey];
        if (allowedValues) {
            return value.toUpperCase() in allowedValues;
        }

        // Check globally allowed attributes for certaion values now
        allowedValues = hashAttributes[attributeKey];
        if (allowedValues) {
            return value.toUpperCase() in allowedValues;
        }

        return true;
    }

    function isProtocolAttribute(attribute) {
        if (attribute) {
            ensureProtocolAttributes();
            if (attribute.toUpperCase() in hashProtocolAttributes) {
                return true;
            }
        }
        return false;
    }

    function isSafeProtocolAttribute(tagName, attributeName, attributeValue, parseContext: ParseContext) {
        var protocolFilterMethod, colonIndex, scheme;

        colonIndex = attributeValue.indexOf(":");
        if (colonIndex < 0 || Utils_Url.isSafeProtocol(attributeValue)) {
            return true;
        }

        scheme = attributeValue.substr(0, colonIndex);
        if(parseContext.invalidProtocols && scheme.toUpperCase() in parseContext.invalidProtocols) {
            return false;
        }

        ensureCustomProtocolFilters();

        protocolFilterMethod = hashCustomProtocolFilters[scheme.toUpperCase()];
        if ($.isFunction(protocolFilterMethod)) {
            if (protocolFilterMethod(tagName, attributeName, attributeValue) === true) {
                return true;
            }
        }

        return false;
    }

    function isAllowedStyle(styleAttribute, parseContext: ParseContext) {
        if (styleAttribute) {
            ensureAllowedStyles();

            styleAttribute = styleAttribute.toUpperCase();

            // Check for explicitly specified invalid styles first
            if (parseContext.invalidStyles && styleAttribute in parseContext.invalidStyles) {
                return false;
            }

            // Check for explicitly specified valid styles next
            if (parseContext.validStyles && styleAttribute in parseContext.validStyles) {
                return true;
            }

            // Check the default
            if (styleAttribute in hashAllowedStyles) {
                return true;
            }
        }

        return false;
    }

    function htmlAttributeEncode(input) {
        var result = input;

        if (!result) {
            return "";
        }

        result = result.replace(/&/g, "&amp;");
        result = result.replace(/"/g, "&quot;");
        result = result.replace(/>/g, "&gt;");
        result = result.replace(/</g, "&lt;");
        return result;
    }

    function htmlAttributeDecode(attributeName, attributeValue, quoteChar) {
        quoteChar = quoteChar || "\"";

        var $elem = $("<div bogusAttribute=" + quoteChar + attributeValue + quoteChar + ">");
        return $elem.attr("bogusAttribute");
    }

    function cleanStyles(tagName: string, style: string, parseContext: ParseContext) {
        const styles: string[] = [];
        (style.split(";") || []).forEach(singleStyle => {
            singleStyle = (singleStyle || "").trim();
            if (singleStyle) {
                const singleStyleParts = singleStyle.split(":", 2);
                const styleName = (singleStyleParts[0] || "").trim();
                const normalizedStyleName = styleName.toUpperCase();
                if (singleStyleParts.length === 2 && isAllowedStyle(styleName, parseContext) &&
                    (!isProtocolAttribute(styleName) || isSafeProtocolAttribute(tagName, styleName, (singleStyleParts[1] || "").trim(), parseContext))) {

                    styles.push(singleStyle);
                }
            }
        });

        const stylesValue = styles.join(";");
        if (stylesValue) {
            return "style=\"" + htmlAttributeEncode(stylesValue) + "\"";
        }
        else {
            return "";
        }
    }

    function uriEncodeAttributeValue(attribute: string, value: string): string {
        if (attribute && value) {
            // we decode the attribute value for escaped characters and then use Url Utils to parse
            // As part of parsing, Url Utils encodes value to make sure it is a safe uri.
            // Also Url Utils understands the query string parameters and handles them appropriately during decoding and encoding
            // htmlAtrributeEncode is there to double ensure, special characters are encoded, even if they are missed during Url Utils parsing.
            try {
                const decodedValue = htmlAttributeDecode(attribute, value, "");
                const absoluteUri = Utils_Url.Uri.parse(decodedValue).absoluteUri;
                return attribute.replace(value, htmlAttributeEncode(absoluteUri));
            }
            catch (e) {
                // decodeURI within parse of uri utils can throw since there is no guarantee that the uri is well formed.
                Diag.Debug.logInfo("Invalid uri attribute: " + value);
                return attribute.replace(value, "Invalid uri value");
            }
        }

        return attribute;
    }

    export function cleanAttribute(
        tagName: string,
        attributeName: string,
        attribute: string,
        attrValueStartIndex: number,
        attrValueLength: number,
        quoteChar: string,
        parseContext: ParseContext,
        writer?: IHtmlBuilder,
    ): string {
        const attrValue = attribute.substr(attrValueStartIndex, attrValueLength);

        // Protect user from malicious attributes that could run javascript or other bad protocols
        if (isProtocolAttribute(attributeName)) {
            if (isSafeProtocolAttribute(tagName, attributeName, $.trim(htmlAttributeDecode(attributeName, attrValue, quoteChar)), parseContext)) {
                return uriEncodeAttributeValue(attribute, attrValue);
            }
        } else if (attributeName.toUpperCase() === "STYLE") {
            return cleanStyles(tagName, attrValue, parseContext);
        } else if (isAllowedValue(tagName, attributeName, attrValue)) {
            if (writer
                && "A" === tagName.toUpperCase()
                && "TARGET" === attributeName.toUpperCase()
                && "_BLANK" === attrValue.toUpperCase()
            ) {
                writer.updateAttribute("rel", "noopener noreferrer");
            }

            return attribute;
        }

        return "";
    }

}

module HtmlFilter {
    var noWhiteSpaceRegex = /\S/g;
    var whiteSpaceTagCloseRegex = /[\s|>]/g;
    var noNameRegex = /[^\w\:\-]/g;

    function isLetterOrDigit(c) {
        if ((c >= '0' && c <= '9') ||      // DIGITS (0-9)
            (c >= 'A' && c <= 'Z') ||      // LATIN CAPITAL LETTERS (A-Z)
            (c >= 'a' && c <= 'z')) {      // LATIN SMALL LETTERS (a-z)
            return true;
        }
        return false;
    }

    /**
     * Skips the white spaces, returns new value of string offset i
     * 
     * @return 
     */
    function skipWhiteSpaces(html, offset): number {

        noWhiteSpaceRegex.lastIndex = offset;
        var m = noWhiteSpaceRegex.exec(html);
        if (m) {
            return m.index;
        }

        // End of html, returning length as offset
        return html.length;
    }

    /**
     * Skips the white spaces, returns new value of string offset i
     * 
     * @return 
     */
    function skipUntilWhiteSpaceOrTagClose(html, offset): number {

        whiteSpaceTagCloseRegex.lastIndex = offset;
        var m = whiteSpaceTagCloseRegex.exec(html);
        if (m) {
            return m.index;
        }

        // End of html, returning length as offset
        return html.length;
    }

    /**
     * Skips until terminator c1, returns new value of string offset i
     * 
     * @return 
     */
    function skipUntil(html, offset, terminator): number {
        var index = html.indexOf(terminator, offset);
        if (index >= 0) {
            return index + terminator.length;
        }

        // End of html, returning length as offset
        return html.length;
    }

    /**
     * Scans name into output string, returns new value of string offset i and the scanned name
     * 
     * @return 
     */
    function scanName(html, offset): any {
        noNameRegex.lastIndex = offset;
        var m = noNameRegex.exec(html);
        if (m) {
            return { offset: m.index, name: html.substr(offset, m.index - offset) };
        }

        return { offset: html.length, name: html.substr(offset, html.length - offset) };
    }

    export function parse(
        html: string,
        writer: IHtmlBuilder,
        parseContext: ParseContext) {
        // iterate characters in the string
        var n: number = html.length,    // end index
            i: number = 0,              // current index
            c: string,
            i0: number,
            i1: number,
            i2: number,
            endTag: boolean,
            scanResult: { offset: number; name: string; },
            tag: string,
            etag: string,
            attr: string,
            term: string,
            cleanAttribute: string;

        while (i < n) {
            // scan text until the tag
            i0 = i;
            i = html.indexOf('<', i);
            if (i < 0) {
                i = n;
            }

            // copy text to output
            if (i > i0) {
                writer.writeText(html, i0, i - i0);
                continue; // next item
            }

            // assert(i < n && html.charAt(i) === '<');

            // scan the tag
            i0 = i++;    // mark and skip '>'

            c = html.charAt(i);
            // check for '<!' section
            if (i < n && c === '!') {
                i++; // skip '!'

                // check for HTML comment syntax: '<!-- ... -->'
                if ((i + 1) < n && html.substr(i, 2) === "--") {
                    i += 2; // skip '--'
                    i = skipUntil(html, i, "-->");
                    continue;   // next syntax element
                }

                // check for CDATA section: '<![CDATA[ ... ]]>'
                if ((i + 6) < n && html.substr(i, 7) === "[CDATA[") {
                    i += 7; // skip '[CDATA['
                    i = skipUntil(html, i, "]]>");
                    continue;   // next syntax element
                }

                // skip other DTD sections: '<! ... >'
                i = skipUntil(html, i, '>');
                continue;   // next syntax element
            }

            // check for '<?' section
            if (i < n && c === '?') {
                i++; // skip '?'
                i = skipUntil(html, i, '>');
                continue;   // next syntax element
            }

            // check for '/' character
            endTag = false;
            if (i < n && c === '/') {
                endTag = true;
                i++;    // skip '/'
            }

            i = skipWhiteSpaces(html, i);

            // scan tag name
            scanResult = scanName(html, i);
            i = scanResult.offset;
            tag = scanResult.name;

            // special handling of script tag: script until </script>
            if (TagHelper.isSpecialTag(tag)) {
                // skip until end of tag
                i = skipUntil(html, i, '>');

                while (i < n) {
                    // wait for tag start
                    i = skipUntil(html, i, '<');

                    // check for comment
                    if ((i + 2) < n && html.substr(i, 3) === "!--") {
                        i = skipUntil(html, i, "-->");
                    }
                    // check for end tag
                    else if (i < n && html.charAt(i) === '/') {
                        i++; // skip '/'
                        i = skipWhiteSpaces(html, i);
                        scanResult = scanName(html, i);
                        i = scanResult.offset;
                        etag = scanResult.name;
                        if (TagHelper.areTagsEqual(tag, etag)) {
                            i = skipUntil(html, i, '>');
                            break;
                        }
                    }
                    // something, skip it
                    else if (i < n) {
                        i++;
                    }
                }

                continue; // next syntax element
            }

            if (!TagHelper.isAllowedTag(tag) || (parseContext.removeFormatting && TagHelper.isFormattingRemovalTag(tag))) {
                // skip or encode entire tag
                if (!parseContext.encodeUnknownText) {
                    i = skipUntil(html, i, '>');
                    continue;
                }
                else {
                    writer.writeEncodedText(html, i0, i - i0);
                    continue;
                }
            }

            let tagToUse = tag;
            let replacementTag: TagHelper.TagReplacement = null;

            // if remove formatting is enabled and the tag is a tag that needs to be replaced, then get the replacement tag
            // and use that instead of the current tag.
            if (parseContext.removeFormatting) {
                replacementTag = TagHelper.getFormattingReplacementTag(tag);
                if (replacementTag && replacementTag.tagToReplace.length !== 0) {
                    tagToUse = replacementTag.tagToReplace;

                    // Advance past all attributes of element we are replacing 
                    // since it does not make sense to persist them on the new element
                    i = skipUntil(html, i, '>');
                    writer.writeTag(html, i0, tagToUse, endTag);


                    // If the replacement tag defines text to come after the tag insert it
                    if (endTag && replacementTag.afterTagText != null && replacementTag.afterTagText.length > 0) {
                        writer.writeText(replacementTag.afterTagText, 0, replacementTag.afterTagText.length);
                    }

                    continue;
                }
            }

            // allowed tag: write down proceeded part
            writer.writeTag(html, i0, tagToUse, endTag);

            // loop attributes
            while (i < n) {
                i0 = i; // new starting point

                i = skipWhiteSpaces(html, i);

                // end of tag?
                if (i < n && html.charAt(i) === '/') {
                    i++; // skip '/'
                }

                // end tag?
                if (i < n && html.charAt(i) === '>') {
                    i++; // skip '>'
                    writer.writeEndOfTag(html, i0, i - i0, tagToUse);
                    break;
                }

                // attribute?
                if (i < n && isLetterOrDigit(html.charAt(i))) {
                    // scan tag name
                    scanResult = scanName(html, i);
                    i = scanResult.offset;
                    attr = scanResult.name;

                    i = skipWhiteSpaces(html, i);

                    i1 = 0; // start of attribute value
                    i2 = 0; // end of attribute value

                    // check value part
                    if (i < n && html.charAt(i) === '=') {
                        i++; // skip '='

                        i = skipWhiteSpaces(html, i);

                        i1 = i; // attribute value starts here

                        c = html.charAt(i);
                        term = null;
                        if (i < n && (c === '\'' || c === '"')) {
                            term = c; // save terminator
                            i++; //skip it
                            i1 = i;   // the attribute starts just here

                            // skip until end terminator
                            while (i < n && html.charAt(i) !== term) {
                                i++;
                            }

                            i2 = i; // attribute ends here

                            // skip terminator
                            if (i < n && html.charAt(i) === term) {
                                i++;
                            }
                        }
                        else {
                            // skip while not whitespace or end
                            i = skipUntilWhiteSpaceOrTagClose(html, i);
                            i2 = i; // attribute ends here
                        }
                    }

                    // and of attribute: check it
                    if (TagHelper.isAllowedAttribute(tag, attr, parseContext)) {
                        cleanAttribute = TagHelper.cleanAttribute(
                            tag,
                            attr,
                            html.substr(i0, i - i0), // attribute
                            i1 - i0, // attrValueStartIndex
                            i2 - i1, // attrValueLength
                            term, // quoteChar
                            parseContext,
                            writer,
                        );

                        if (cleanAttribute) {
                            writer.writeAttribute(cleanAttribute);
                        }
                    }

                    continue; // next attribute
                }

                // unknown character - skip it
                if (i < n && html.charAt(i) !== '>') {
                    i++;
                }
            }
        }

        // end of loop: i==n
    }

}

class HtmlTextElement {

    public text: any;

    /**
     * Represents text areas inside the tag elements (innerText)
     */
    constructor(text) {
        this.text = text;
    }

    /**
     * Renders this text element into the given output
     * 
     * @param output 
     */
    public render(output: StringBuilder) {
        output.append(this.text);
    }
}

class HtmlTagElement {

    private static _emptyTags: any;

    /**
     * Initializes and gets the list of empty tags
     */
    private static _getEmptyTags() {
        if (!HtmlTagElement._emptyTags) {
            var emptyTags = {};
            emptyTags["AREA"] = true;
            emptyTags["BASE"] = true;
            emptyTags["BASEFONT"] = true;
            emptyTags["BGSOUND"] = true;
            emptyTags["BR"] = true;
            emptyTags["COL"] = true;
            emptyTags["EMBED"] = true;
            emptyTags["FRAME"] = true;
            emptyTags["HR"] = true;
            emptyTags["IMG"] = true;
            emptyTags["INPUT"] = true;
            emptyTags["ISINDEX"] = true;
            emptyTags["LINK"] = true;
            emptyTags["META"] = true;
            emptyTags["PARAM"] = true;
            emptyTags["WBR"] = true;

            emptyTags["IFRAME"] = false;
            emptyTags["MARQUEE"] = false;
            HtmlTagElement._emptyTags = emptyTags;
        }
        return HtmlTagElement._emptyTags;
    }

    /**
     * Determines whether the element with the given tag
     * should have an ending tag or not
     * 
     * @return 
     */
    public static hasEndTag(tag): boolean {
        var emptyTags = this._getEmptyTags(),
            result = true;

        if (tag in emptyTags) {
            result = !emptyTags[tag];
        }
        return result;
    }

    /**
     * Determines whether the element with the given tag
     * can have child elements or not
     * 
     * @return 
     */
    public static canTagHaveChild(tag): boolean {
        var emptyTags = this._getEmptyTags();
        return !(tag in emptyTags);
    }

    private _tagUpper: any;
    private _children: any;
    private _attributes: any;

    public root: boolean;
    public tag: any;
    public empty: boolean;
    public tagClosed: boolean;

    /**
     * Represents a tag element in an html. (div, a, span, etc.)
     * 
     * @param tag 
     * @param root 
     */
    constructor(tag: string, root?: boolean) {

        // assert(tag != null);
        this.tag = tag.toUpperCase();
        this.root = root === true;
    }

    /**
     * Gets the children of this element
     */
    public getChildren() {
        if (!this._children) {
            this._children = [];
        }
        return this._children;
    }

    /**
     * Gets the attributes of this element
     */
    public getAttributes() {
        if (!this._attributes) {
            this._attributes = [];
        }
        return this._attributes;
    }

    /**
     * Gets whether this element has a closing tag or not
     */
    public getHasClosingTag() {
        if (this.empty === true) {
            return false;
        }
        return HtmlTagElement.hasEndTag(this.tag);
    }

    /**
     * Gets whether this element can have children or not
     */
    public getCanHaveChildren() {
        if (this.tagClosed === true) {
            return false;
        }
        return HtmlTagElement.canTagHaveChild(this.tag);
    }

    /**
     * Renders this text element into the given output
     * 
     * @param output 
     */
    public render(output: StringBuilder) {
        var i, len, attributes, children, childrenExists = false;

        if (this.tag) {
            // Starting to write the starting tag 
            output.append('<');
            output.append(this.tag);

            // If any attributes exist write them too before closing the tag
            attributes = this.getAttributes();
            for (i = 0, len = attributes.length; i < len; i++) {
                output.append(' ');
                output.append($.trim(attributes[i]));
            }
        }

        children = this.getChildren();
        if (children.length > 0) {
            childrenExists = true;
            // If there is children of this element, close the starting tag
            if (this.tag) {
                output.append('>');
            }

            // Rendering the child elements
            for (i = 0, len = children.length; i < len; i++) {
                children[i].render(output);
            }
        }

        if (this.tag) {
            if (childrenExists) {
                // If children exists, write the closing tag
                output.append('</');
                output.append(this.tag);
                output.append('>');
            }
            else if (!this.getHasClosingTag()) {
                // If no children exists and no closing tags needed, close the starting tag
                output.append('/>');
            }
            else {
                // If no children exists and a closing tag is needed, 
                // close the starting tag and then write the closing tag too
                output.append('></');
                output.append(this.tag);
                output.append('>');
            }
        }
    }
}

class StringBuilder {

    private _strings: any;

    /**
     * Represents a mutable string of characters
     */
    constructor() {
        this._strings = [];
    }

    /**
     * Appends the given string to the end of this instance
     * 
     * @param value The string to append
     * @return 
     */
    public append(value: string): StringBuilder {
        var strings = this._strings;
        if (value) {
            strings[strings.length] = value;
        }
        return this;
    }

    /**
     * Removes everything from the current instance
     * 
     * @return 
     */
    public clear(): StringBuilder {
        this._strings = [];
        return this;
    }

    /**
     * Converts the value of this instance to a string
     * 
     * @return 
     */
    public toString(): string {
        return this._strings.join("");
    }
}

interface IHtmlBuilder {
    writeText(text, offset, length);
    writeEncodedText(text: string, offset: number, length: number);
    writeTag(text, offset, tag, endTag);
    writeEndOfTag(text, offset, length, tag);
    writeAttribute(attribute);
    updateAttribute(attributeName: string, attributeValue: string);
    finish();
    toString(): string;
}

class HtmlPlainTextBuilder implements IHtmlBuilder {
    private _textAccumulator: string;
    private _lastWriteWasEol: boolean;

    constructor() {
        this._textAccumulator = "";
        this._lastWriteWasEol = true;  // Very first write to the string should not be a newline.
    }

    public writeText(text, offset, length) {
        this._textAccumulator += text.substr(offset, length);
        this._lastWriteWasEol = false;
    }

    public writeEncodedText(text: string, offset: number, length: number) {
        this._textAccumulator += Utils_String.htmlEncode(text.substr(offset, length));
        this._lastWriteWasEol = false;
    }

    public writeTag(text, offset, tag, endTag) {
        var tagUpper = tag.toUpperCase();

        // Write out EOL's for tags that generally cause newlines
        if (endTag ? TagHelper.shouldAddEolAfterTag(tag) : TagHelper.shouldAddEolBeforeTag(tag)) {
            this._writeEols();
        }
    }

    public writeEndOfTag(text, offset, length, tag) {
    }

    public writeAttribute(attribute) {
    }

    // tslint:disable-next-line:no-empty
    public updateAttribute(attributeName: string, attributeValue: string) {
    }

    public finish() {
    }

    public toString(): string {
        // replace "&nbsp;\r\n" by \r\n, 
        // the Html combination "<p>&nbsp;</p>" is added by IE control, when user press Enter.
        return this._textAccumulator.replace("\xa0\r\n", "\r\n").trim();
    }

    private _writeEols() {
        // Do not write back to back eols, not trying to preserve spacing.
        if (!this._lastWriteWasEol) {
            this._textAccumulator += "\r\n";
            this._lastWriteWasEol = true;
        }
    }
}


class HtmlTreeBuilder implements IHtmlBuilder {

    private root: any;
    private elements: any;

    constructor() {
        this.root = new HtmlTagElement("", true);
        this.elements = [];
    }

    public writeText(text, offset, length) {
        var elements = this.elements;
        elements[elements.length] = new HtmlTextElement(text.substr(offset, length));
    }

    public writeEncodedText(text: string, offset: number, length: number) {
        var elements = this.elements;
        elements[elements.length] = new HtmlTextElement(Utils_String.htmlEncode(text.substr(offset, length)));
    }

    public writeTag(text, offset, tag, endTag) {
        var tagElement,
            element,
            elements = this.elements,
            eChildren,
            children,
            tagUpper = tag.toUpperCase();

        if (endTag === true) {
            children = [];
            while (elements.length > 0) {
                element = elements.pop();
                if (element instanceof HtmlTextElement) {
                    children[children.length] = element;
                }
                else {
                    tagElement = element;
                    if (tagElement.tag === tagUpper && !tagElement.tagClosed) {
                        break;
                    }
                    else {
                        if (tagElement.getCanHaveChildren()) {
                            eChildren = element.getChildren();
                            while (children.length > 0) {
                                eChildren[eChildren.length] = children.pop();
                            }
                        }
                        children[children.length] = tagElement;
                        tagElement = null;
                    }
                }
            }

            if (!tagElement) {
                tagElement = new HtmlTagElement(tag);
            }

            eChildren = tagElement.getChildren();
            while (children.length > 0) {
                eChildren[eChildren.length] = children.pop();
            }
        }
        else {
            tagElement = new HtmlTagElement(tag);
        }

        tagElement.tagClosed = endTag;
        elements[elements.length] = tagElement;
    }

    public writeEndOfTag(text, offset, length, tag) {
        var element, fragment,
            elements = this.elements,
            tagUpper = tag.toUpperCase();

        if (length > 1) {
            fragment = text.substr(offset, length);
            if (fragment.charAt(fragment.length - 2) === '/') {
                if (elements.length > 0) {
                    element = elements[elements.length - 1];
                    if ((element instanceof HtmlTagElement) && element.tag === tagUpper) {
                        element.empty = true;
                        element.tagClosed = true;
                    }
                }
            }
        }
    }

    public writeAttribute(attribute) {
        var element, elements = this.elements;
        if (elements.length > 0) {
            element = elements[elements.length - 1];
            if (element instanceof HtmlTagElement) {
                element.getAttributes().push(attribute);
            }
        }
    }

    public updateAttribute(attributeName: string, attributeValue: string) {
        const elements = this.elements;
        const currentElement = elements[elements.length - 1];

        if (currentElement instanceof HtmlTagElement) {
            const attributes: string[] = currentElement.getAttributes();
            const existingAttributeIndex: number = Utils_Array.findIndex(attributes, (attr: string) => Utils_String.startsWith(attr.trim().toUpperCase(), attributeName.toUpperCase()));
            const attribute = ` ${attributeName}="${attributeValue}"`;

            if (existingAttributeIndex === -1) {
                attributes.push(attribute);
            } else {
                attributes[existingAttributeIndex] = attribute;
            }
        }
    }

    public finish() {
        var element, elements = this.elements,
            root = this.root, children = [], eChildren, rChildren;

        while (elements.length > 0) {
            element = elements.pop();
            if (element instanceof HtmlTextElement) {
                children[children.length] = element;
            }
            else {
                if (element.getCanHaveChildren()) {
                    eChildren = element.getChildren();
                    while (children.length > 0) {
                        eChildren[eChildren.length] = children.pop();
                    }
                }
                children[children.length] = element;
            }
        }

        rChildren = root.getChildren();
        while (children.length > 0) {
            rChildren[rChildren.length] = children.pop();
        }
    }

    public toString(): string {
        var result = new StringBuilder();
        this.root.render(result);
        return result.toString();
    }
}

interface ParseContext {
    validAttributes?: { [key: string]: number };
    invalidAttributes?: { [key: string]: number };
    validStyles?: { [key: string]: number };
    invalidStyles?: { [key: string]: number };
    removeFormatting?: boolean;
    encodeUnknownText?: boolean;
    invalidProtocols?: { [key: string]: number };
}

interface ParseContextArgs {
    additionalInvalidAttributes?: string[];
    additionalValidAttributes?: string[];
    additionalValidStyles?: string[];
    additionalInvalidStyles?: string[];
    removeFormatting?: boolean;
    encodeUnknownText?: boolean;
    additionalInvalidProtocols?: string[];
}

export module HtmlNormalizer {
    function listToMap(list: string[]): { [key: string]: number } {
        let map: { [key: string]: number } = null;
        if (list) {
            map = {};
            for (let item of list) {
                map[item.toUpperCase()] = 0;
            }
        }

        return map;
    }

    function getParseContext(args: ParseContextArgs = {}): ParseContext {
        return {
            invalidAttributes: listToMap(args.additionalInvalidAttributes),
            validAttributes: listToMap(args.additionalValidAttributes),
            invalidStyles: listToMap(args.additionalInvalidStyles),
            validStyles: listToMap(args.additionalValidStyles),
            removeFormatting: args.removeFormatting || false,
            encodeUnknownText: args.encodeUnknownText || false,
            invalidProtocols: listToMap(args.additionalInvalidProtocols)
        };
    }

    /**
     * Normalizes the given html by removing the attributes like script and fixing incomplete tags.
     * 
     * @param html Html to normalize.
     * @return {string}
     */
    export function normalize(html: string): string {
        const writer = new HtmlTreeBuilder();
        return process(html, writer, getParseContext());
    }

    /**
     * Normalizes the given html by removing the attributes like script and fixing incomplete tags.
     * Also allows the caller to specify additional attributes to remove, like 'class'
     *
     * @param html Html to normalize
     * @param additionalInvalidAttributes Additional attributes to remove
     * @param additionalValidAttributes Additional attributes to keep
     * @param additionalInvalidStyles Additional styles to remove
     * @param additionalValidStyles Additional styles to keep
     * @param encodeUnknownText
     * @param additionalInvalidProtocols Specify what link protocols to block (eg data to stop embedded images that may contain malicious content)
     * @return {string}
     */
    export function normalizeStripAttributes(
        html: string,
        additionalInvalidAttributes: string[],
        additionalValidAttributes?: string[],
        additionalInvalidStyles?: string[],
        additionalValidStyles?: string[],
        encodeUnknownText?: boolean,
        additionalInvalidProtocols?: string[]): string {

        const writer = new HtmlTreeBuilder();
        return process(html, writer, getParseContext({ additionalInvalidAttributes, additionalValidAttributes, additionalInvalidStyles, additionalValidStyles, encodeUnknownText, additionalInvalidProtocols }));
    }

    /**
     * Sanitizes the specified HTML by removing also all formatting.
     * 
     * @param html Html to sanitize and remove formatting.
     * @return {string}
     */
    export function removeFormatting(html: string) {
        const writer = new HtmlTreeBuilder();
        return process(html, writer, getParseContext({ additionalInvalidAttributes: ["CLASS", "STYLE"], removeFormatting: true }));
    }

    /**
     * Sanitizes the given html by fixing incomplete tags and encoding unsafe text.
     * 
     * @param html Html to sanitize.
     * @return {string}
     */
    export function sanitize(html: string): string {
        const writer: HtmlTreeBuilder = new HtmlTreeBuilder();
        return process(html, writer, getParseContext({ encodeUnknownText: true }));
    }

    /**
     * Removes all tags from the specified html and attempts keep newlines in the proper places (best effort).
     *
     * @param html Html to convert to plain text.
     * @returns {string}
     */
    export function convertToPlainText(html: string): string {
        const writer = new HtmlPlainTextBuilder();
        return process(html, writer, getParseContext({ encodeUnknownText: true }));
    }

    function process(
        html: string,
        writer: IHtmlBuilder,
        parseContext: ParseContext): string {

        HtmlFilter.parse(html, writer, parseContext);
        writer.finish();
        return writer.toString();
    }
}

export class TemplateEngine {

    /**
     * Replaces simple tokens, such as ${Foo}, in the input HTML template.
     * 
     * @param template The HTML markup or text to use as a a template.
     * @param data The data to render.
     * @return The HTML string with template replacements.
     */
    private static _replaceSimpleTemplateTokens(template: string, data: any) {
        /*jslint regexp: false*/ /* TODO: Identify whether the usage of ^ is desired */
        var result = template,
            regex = /\$\{([^\$\}]+)\}/ig,      // Matches e.g. ${property} or ${property.path}
            match, propertyName, propertyValue;
        /*jslint regexp: true*/

        while ((match = regex.exec(result)) !== null) {
            propertyName = match[1];
            propertyValue = TemplateEngine._getEncodedTextPropertyValue(data, propertyName);
            result = TemplateEngine._replaceMatch(result, match, propertyValue);
            regex.lastIndex = match.index + propertyValue.length;
        }

        return result;
    }

    /**
     * Replaces simple tokens which will not be HTML encoded, such as {{html Foo}}, in the input HTML template.
     * 
     * @param template The HTML markup or text to use as a a template.
     * @param data The data to render.
     * @return The HTML string with template replacements.
     */
    private static _replaceUnencodedTemplateTokens(template: string, data: any) {
        /*jslint regexp: false*/ /* TODO: Identify whether the usage of ^ is desired */
        var result = template,
            regex = /\{\{html ([^\$\}]+)\}\}/ig,      // Matches e.g. {{html property}} or {{html property.path}}
            match, propertyName, propertyValue;
        /*jslint regexp: true*/

        while ((match = regex.exec(result)) !== null) {
            propertyName = match[1];
            propertyValue = TemplateEngine._getTextPropertyValue(data, propertyName);
            result = TemplateEngine._replaceMatch(result, match, propertyValue);
            regex.lastIndex = match.index + propertyValue.length;
        }

        return result;
    }

    /**
     * Replaces foreach style tokens, such as {{each Foo}}, in the input HTML template.
     * 
     * @param template The HTML markup or text to use as a a template.
     * @param data The data to render.
     * @return The HTML string with template replacements.
     */
    private static _replaceForEachTemplateTokens(template: string, data: any) {

        /*jslint regexp: false*/ /* TODO: Identify whether the usage of ^ and . is desired */
        var result = template,
            regex = /\{\{each \s*([^ \}]+)\}\}((?:.|\r|\n)*)\{\{\/each\}\}/ig,  // Matches e.g. {{each Items}}content{{/each}}
            subRegex = /\$\{\$value(?:\.([^\}]+))?\}/ig, // Matches e.g. ${$value} or ${$value.property.path}
            match, propertyName, subTemplate, replacement, arrayProperty, subMatch, subPropertyName, subPropertyValue, subReplacement, i, l;
        /*jslint regexp: true*/

        while ((match = regex.exec(result)) !== null) {
            propertyName = match[1];
            subTemplate = match[2];
            replacement = "";
            arrayProperty = TemplateEngine._getPropertyValue(data, propertyName);

            if ($.isArray(arrayProperty)) {
                for (i = 0, l = arrayProperty.length; i < l; i += 1) {
                    subReplacement = subTemplate;
                    subRegex.lastIndex = 0;

                    while ((subMatch = subRegex.exec(subReplacement)) !== null) {
                        subPropertyName = subMatch[1];
                        subPropertyValue = TemplateEngine._getEncodedTextPropertyValue(arrayProperty[i], subPropertyName);
                        subReplacement = TemplateEngine._replaceMatch(subReplacement, subMatch, subPropertyValue);
                        subRegex.lastIndex = subMatch.index + subPropertyValue.length;
                    }

                    replacement += subReplacement;
                }
            }

            result = TemplateEngine._replaceMatch(result, match, replacement);
            regex.lastIndex = match.index + replacement.length;
        }

        return result;
    }

    /**
     * Replaces a Regex match within some text with a replacement.
     * 
     * @param text The original text.
     * @param match A regex match within that text.
     * @param replacement The replacement string.
     * @return The updated string.
     */
    private static _replaceMatch(text: string, match: any, replacement: string) {

        return text.substring(0, match.index) + replacement + text.substring(match.index + match[0].length);
    }

    private static _getEncodedTextPropertyValue(data, propertyPath) {
        var propertyValue = TemplateEngine._getPropertyValue(data, propertyPath);
        return (propertyValue === undefined) ? "" : Utils_String.htmlEncode(propertyValue.toString());
    }

    private static _getTextPropertyValue(data, propertyPath) {
        var propertyValue = TemplateEngine._getPropertyValue(data, propertyPath);
        return (propertyValue === undefined) ? "" : propertyValue.toString();
    }

    /**
     * Obtains a value from a given data object using a string property path.
     * 
     * @param data An object.
     * @param propertyPath A dot separrated property path. Undefined or empty string returns the plain data object.
     * @return The resolved data property value or undefined if property was not found.
     */
    private static _getPropertyValue(data: any, propertyPath: string) {

        if (propertyPath === undefined || propertyPath.length === 0) {
            // No property resolution to be performed
            return data;
        }

        var tokens = propertyPath.split('.'),
            result = data;

        while (tokens.length > 0 && result !== undefined) {
            result = result[tokens.shift()];
        }

        return result;
    }

    /**
     * A poor man's implementation of $.tmpl() from jquery templates. Renderes the
     * specified HTML content as a template, using the specified data.
     * 
     * @param template The HTML markup or text to use as a a template.
     * @param data The data to render.
     * @return A jquery element.
     */
    public static tmpl(template: string, data: any) {

        var result = template;

        // In an ideal world, we'd be using $.tmpl(). While we are not consuming it, this is a very poor man's implementation
        // of its minimal instructions that we care about. Don't abuse it!
        // result = $.tmpl(template, data);
        result = TemplateEngine._replaceSimpleTemplateTokens(result, data);
        result = TemplateEngine._replaceUnencodedTemplateTokens(result, data);
        result = TemplateEngine._replaceForEachTemplateTokens(result, data);

        return result;
    }

    /**
     * A static template engine for applying JS objects to a "jquery-tmpl" like template.
     */
    constructor() {
    }
}

export module Utils {
    export const ISEMPTY_MINIMAL_CONTENT_LENGTH = 500;
    /**
     * Checks whether html is visually empty.
     * 1. Not empty if content length is over the minimal threshold. See ISEMPTY_MINIMAL_CONTENT_LENGTH.
     * 2. If content length is less than the minimal threshold, we remove the formatting before checking whether it matches any "empty" case.
     */
    export function isEmpty(value: string): boolean {
        if (value === null || value === undefined) {
            return true;
        }
        // If content length is over the minimal threshold, consider editor as not empty.
        // It will not cause any regression since it is the current behavior as well.
        if (value.length >= ISEMPTY_MINIMAL_CONTENT_LENGTH) {
            return false;
        }
        // If content length is less than minimal threshold, remove all formatting before checking the DOM content.
        // This should not have perf impact on lower than 500 content length. According to perf tools, it took avg 0.13 ms.
        var normalizedValue = HtmlNormalizer.removeFormatting(value);
        // Best effort: check normalized value and see if it match any "empty" case below
        return normalizedValue === ""
            || normalizedValue === "<BR>"
            || normalizedValue === "<BR/>"
            || normalizedValue === "<P>&nbsp;</P>"
            || normalizedValue === "<P></P>"
            || normalizedValue === "<P><BR/></P>"
            || normalizedValue === "<BR>\r\n"
            || normalizedValue === "<BR\>\r\n"
            || normalizedValue === "<DIV><BR/></DIV>"
            || normalizedValue === "<DIV><DIV><BR/></DIV></DIV>";
    }
}
