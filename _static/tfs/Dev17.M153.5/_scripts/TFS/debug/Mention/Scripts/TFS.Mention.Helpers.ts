///<amd-dependency path="jQueryUI/autocomplete"/>
/// <reference types="jquery" />

import Core = require("VSS/Utils/Core");
import VSS_UI = require("VSS/Utils/UI");
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import { templateSources } from "knockout";
import * as Utils_String from "VSS/Utils/String";

const MAX_SEARCH_TERMS: number = 10;

export interface ISearchResult {
    found: { [key: string]: boolean };
    highlightedSource: string;
}

export enum SearchBehavior {
    Contains = 0,
    Prefix = 1
}

interface IReplacement {
    start: number;
    end: number;
}

/**
 * @param source string to find replacements in
 * @param terms that should be replaced
 * @param searchBehavior whether to only consider the start of the array
 * @returns where the replacements should occur
 */
function getReplacements(source: string, terms: string[], searchBehavior: SearchBehavior): IReplacement[] {
    terms.sort((a, b) => b.length - a.length);
    source = source.toUpperCase();
    terms = terms.map((t) => t.toUpperCase());

    const matchIdxs = [];
    const replacements: IReplacement[] = [];
    for (const term of terms) {
        let idx = 0;
        while (true) {
            idx = source.indexOf(term, idx);
            // is a match?
            if (idx < 0 || (searchBehavior === SearchBehavior.Prefix && idx > 0))  {
                break;
            }
            const replacement: IReplacement = {
                start: idx,
                end: idx + term.length,
            };
            idx += term.length;
            // does match overlap previous matches?
            if (matchIdxs[replacement.start] || matchIdxs[replacement.end]) {
                break;
            }
            // record match locations for subsequent matches
            for (let i = replacement.start; i < replacement.end; i++) {
                matchIdxs[i] = true;
            }
            replacements.push(replacement);
        }
    }
    return replacements;
}

/**
 * @param source string to check
 * @returns boolean array of which characters are valid to start or stop on when replacing substrings (cannot start or stop in the middle of an escaped character)
 */
function getValidMatchLocations(source: string): boolean[] {
    const locations: boolean[] = [];
    let i = 0;
    for (const c of source) {
        const encoded = Utils_String.htmlEncode(c);
        if (encoded.length === 1) {
            locations[i++] = true;
        } else {
            for (const _ of encoded) {
                locations[i++] = false;
            }
        }
    }
    return locations;
}

/**
 * @param replacements positions where text might be changed
 * @param validLocations where text changes are permitted to start or stop
 * @returns replacements that are permitted to occur
 */
function filterReplacements(replacements: IReplacement[], validLocations: boolean[]): IReplacement[] {
    return replacements.filter(({start, end}) => validLocations[start] || validLocations[end]);
}

/**
 * @param source string to replace terms within
 * @param replacements where in the source string to replace
 * @param highlightSubstitutionPattern what to substitute when replacing
 * @returns source after replacements have occurred
 */
function applyReplacements(source: string, replacements: IReplacement[], highlightSubstitutionPattern: string): string {
    const replacementLookup: {[original: string]: string} = {};
    function getReplacementText({start, end}: IReplacement) {
        const match = source.substr(start, end - start);
        if (!replacementLookup[match]) {
            replacementLookup[match] = highlightSubstitutionPattern.replace("$&", match);
        }
        return replacementLookup[match];
    }
    replacements.sort((a, b) => b.end - a.end);
    let replaced = "";
    let idx = source.length;
    for (const r of replacements) {
        const newText = getReplacementText(r);
        replaced = newText + source.substr(r.end, idx - r.end) + replaced;
        idx = r.start;
    }
    if (idx > 0) {
        replaced = source.substr(0, idx) + replaced;
    }
    return replaced;
}

/**
 * @param source string to check for replacements
 * @param terms which substrings should be replaced
 * @param searchBehavior whether to only check the start of the source string
 * @param highlightSubstitutionPattern what to replace terms with
 * @param shouldHtmlEncode whether to html encode the source string before making replacements.
 */
function highlightSource(source: string, terms: string[], searchBehavior: SearchBehavior, highlightSubstitutionPattern: string, shouldHtmlEncode?: "htmlEncode"): string {
    const text = shouldHtmlEncode ? Utils_String.htmlEncode(source) : source;
    let replacements = getReplacements(text, terms, searchBehavior);
    if (shouldHtmlEncode) {
        const locations = getValidMatchLocations(source);
        replacements = filterReplacements(replacements, locations);
    }
    return applyReplacements(text, replacements, highlightSubstitutionPattern);
}

function findMatches(source: string, terms: string[], searchBehavior: SearchBehavior): {found: {[term: string]: boolean}, atLeastOneMatch: boolean} {
    source = source.toUpperCase();

    const found: {[term: string]: boolean} = {};
    let atLeastOneMatch = false;
    for (const term of terms) {
        const idx = source.indexOf(term.toUpperCase());
        if ((searchBehavior === SearchBehavior.Contains && idx >= 0) || (searchBehavior === SearchBehavior.Prefix && idx === 0)) {
            found[term] = true;
            atLeastOneMatch = true;
        } else {
            found[term] = false;
        }
    }
    return {found, atLeastOneMatch};
}

/**
 * Search the string and make replacements if requested.
 * @param source string to search within
 * @param terms what to look for
 * @param searchBehavior whether to only consider the start of the string
 * @param highlightSubstitutionPattern if provided then replace the matched terms, $& refers to the term that was matched
 * @param shouldHtmlEncode whether to html encode before replacing
 * @returns which terms were found and the string after all replacements have happened (if replacements were requested).
 */
export function searchString(source: string, terms: string[], searchBehavior: SearchBehavior, highlightSubstitutionPattern?: string, shouldHtmlEncode?: "htmlEncode"): ISearchResult {
    if (typeof source === "undefined" || source === null || terms === null || !terms.length) {
        return { found: {}, highlightedSource: source };
    }
    // for safety, limit to a reasonable number of terms
    terms = terms.slice(0, MAX_SEARCH_TERMS);

    const {found, atLeastOneMatch} = findMatches(source, terms, searchBehavior);

    let highlightedSource = source;
    if (atLeastOneMatch && highlightSubstitutionPattern) {
        highlightedSource = highlightSource(source, terms, searchBehavior, highlightSubstitutionPattern, shouldHtmlEncode);
    } else if (shouldHtmlEncode) {
        highlightedSource = Utils_String.htmlEncode(source);
    }

    return { found, highlightedSource };
}

export function hasParentWindow(): boolean {
    return window.parent !== window;
}

export function getMainTfsContext(): TFS_Host_TfsContext.TfsContext {
    try {
        if (hasParentWindow() && (<any>window.parent).TfsMentionHelpers) {
            return (<any>window.parent).TfsMentionHelpers.getDefaultTfsContext();
        }
    }
    catch (e) {
        // Accessing a cross origin frame can cause an exception.  This happens when we are hosted 
        // in an iframe from a different host (microsoft teams integration for example)
    }

    return TfsMentionHelpers.getDefaultTfsContext();
}

export function environmentIsSupported(): boolean {
    var tfsContext;
    try {
        tfsContext = getMainTfsContext();
    }
    catch (ex) {
        tfsContext = null;
    }
    return !!tfsContext;
}

export function delegate<TFunc extends Function>(instance: any, method: TFunc): TFunc {
    return <TFunc><any>Core.delegate(instance, method);
}

export function throttledDelegate<TFunc extends Function>(instance: any, ms: number, method: TFunc): TFunc {
    var lastArguments: any;
    var throttledFunc = Core.throttledDelegate(instance, ms, function() {
        var args = lastArguments;
        lastArguments = null;
        method.apply(instance, args);
    }); 
    return <TFunc><any>function() {
        lastArguments = arguments;
        return throttledFunc();
    };
}

export function getWindowLocation(): Location {
    return window.location;
}

export function convertHtmlToText(html: string): string {
    return $("<div>").html(html).text();
}

export function getWindow(element: HTMLElement): Window {
    if (!element) return null;
    var document = element.ownerDocument;
    if (!document) return null;
    return document.defaultView || (<any>document).parentWindow;
}

export module TfsMentionHelpers {
    export function getDefaultTfsContext() {
        return TFS_Host_TfsContext.TfsContext.getDefault();
    }
}

export function eventHasPrintableCharacter(event: JQueryEventObject) {
    if (!event.charCode) {
        return false;
    }
    return true;
}

(<any>window).TfsMentionHelpers = TfsMentionHelpers;
