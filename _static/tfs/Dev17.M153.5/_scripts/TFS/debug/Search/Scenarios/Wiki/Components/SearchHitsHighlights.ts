import * as  React from "react";

import { htmlEncode, lineFeed, newLine } from "VSS/Utils/String";
import { WikiResult, WikiHit } from "Search/Scripts/Generated/Search.Shared.Contracts";

const WHITE_SPACE_REGEX = /(\s+)/g;
const NEW_LINE_REGEX = /[.]*[\s]*(\n+)/g;
const HIT_HIGHT_LIGHT_HTML_ENCODED_START_TAG_REGEX = /(&lt;highlighthit&gt;)/gi;
const HIT_HIGHT_LIGHT_HTML_ENCODED_END_TAG_REGEX = /(&lt;\/highlighthit&gt;)/gi;
const HIGHLIGHTSTARTTAG = "<highlighthit>";
const HIGHLIGHTENDTAG = "</highlighthit>";
const ELLIPSIS = "...";
const ELLIPSISWITHSPACE = "... ";
//MAXCHARINVIEW is the maximum number of characters that will be displayed before searchHit
const MAXCHARACTERINVIEW = 75;

export function getSearchResultFieldElementWithHighlights(highlights: string[] | undefined, defaultFieldValue: string, shiftHitHighlightWithinView?: boolean): string {
    let concatSearchHighlights = _concatenateHighlightStrings(highlights);

    if (!concatSearchHighlights) {
        concatSearchHighlights = defaultFieldValue;
    }

    if (shiftHitHighlightWithinView) {
        let hitIndex = concatSearchHighlights.indexOf(HIGHLIGHTSTARTTAG);
        concatSearchHighlights = _getHitWithinViewPruneStart(concatSearchHighlights, hitIndex, MAXCHARACTERINVIEW);
        concatSearchHighlights = _getHitWithinViewPruneEnd(concatSearchHighlights, MAXCHARACTERINVIEW);
    }

    return sanitizeHtml(concatSearchHighlights);
}

export function getHighlightArray(hits: WikiHit[], fieldName: string, getFirstHighlight?: boolean): string[] | undefined {

    for (let i = 0; i < hits.length; i++) {
        if (hits[i].fieldReferenceName === fieldName) {
            if (getFirstHighlight && hits[i].highlights && hits[i].highlights.length > 0) {
                return [hits[i].highlights[0]];
            } else {
                return hits[i].highlights;
            }
        }
    }

    return undefined;
}

export function sanitizeHtml(html: string): string {
    // replace multiple return characters with .
    html = html.replace(NEW_LINE_REGEX, ". ");
    // replace multiple white spaces with a single white space.
    html = html.replace(WHITE_SPACE_REGEX, " ");
    let encodedValue = htmlEncode(html);

    return encodedValue
        .replace(HIT_HIGHT_LIGHT_HTML_ENCODED_START_TAG_REGEX, HIGHLIGHTSTARTTAG)
        .replace(HIT_HIGHT_LIGHT_HTML_ENCODED_END_TAG_REGEX, HIGHLIGHTENDTAG);
}

function _concatenateHighlightStrings(highlights: string[] | undefined): string | undefined {
    return highlights && highlights.length > 0 ? highlights.join(ELLIPSISWITHSPACE) : undefined;
}

function _getHitWithinViewPruneStart(concatSearchHighlights: string, hitIndex: number, maxCharInView: number): string {
    let result: string = concatSearchHighlights;
    if (hitIndex > maxCharInView) {
        let spaceIndex: number;
        // searching for a space or linefeed or newline before hit in preceding "maxCharInView" number of characters
        for (spaceIndex = hitIndex - maxCharInView; spaceIndex < hitIndex; spaceIndex++) {
            if (concatSearchHighlights[spaceIndex] === ' ' || _isCharacterNewLineOrLineFeed(concatSearchHighlights, spaceIndex)) {
                spaceIndex++;
                break;
            }
        }

        // if space or linefeed or newline not found, display from the preceding "maxCharInView" number of characters of the hit.
        if (spaceIndex === hitIndex
            && (concatSearchHighlights[spaceIndex - 1] !== ' '
            && !_isCharacterNewLineOrLineFeed(concatSearchHighlights, spaceIndex - 1))) {
            spaceIndex = hitIndex - maxCharInView;
        }
        result = concatSearchHighlights.slice(spaceIndex);
        if (!_isCharacterNewLineOrLineFeed(concatSearchHighlights, spaceIndex - 1)) {
            result = ELLIPSIS.concat(result);
        }
    }
    return result;
}

function _getHitWithinViewPruneEnd(concatSearchHighlights: string, maxCharInView: number): string {
    const totalLength: number = concatSearchHighlights.length;
    const hitIndex = concatSearchHighlights.lastIndexOf(HIGHLIGHTENDTAG) + HIGHLIGHTENDTAG.length;
    let result: string = concatSearchHighlights;

    if (totalLength - hitIndex > maxCharInView) {
        let spaceIndex: number;

        // searching for a space or linefeed or newline before hit in preceding "maxCharInView" number of characters
        for (spaceIndex = hitIndex + maxCharInView; spaceIndex > hitIndex; spaceIndex--) {
            if (concatSearchHighlights[spaceIndex] === ' ' || _isCharacterNewLineOrLineFeed(concatSearchHighlights, spaceIndex)) {
                spaceIndex--;
                break;
            }
        }

        // if space or linefeed or newline not found, display from the preceding "maxCharInView" number of characters of the hit.
        if (spaceIndex === hitIndex
            && (concatSearchHighlights[spaceIndex + 1] !== ' '
            && !_isCharacterNewLineOrLineFeed(concatSearchHighlights, spaceIndex + 1))) {
            spaceIndex = hitIndex + maxCharInView;
        }

        result = concatSearchHighlights.slice(0, spaceIndex + 1);
        if (!_isCharacterNewLineOrLineFeed(concatSearchHighlights, spaceIndex + 1)) {
            result = result.concat(ELLIPSIS);
        }
    }
    return result;
}

function _isCharacterNewLineOrLineFeed(str: string, index: number): boolean {
    return (str[index] === lineFeed || str[index] === newLine);
}