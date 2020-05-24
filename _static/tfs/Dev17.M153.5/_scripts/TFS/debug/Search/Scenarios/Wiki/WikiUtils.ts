"use strict";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";

import { WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";
import * as Constants from "SearchUI/Constants";
import { getWikiPagePathFromGitPath, UrlEscapeConstants } from "SearchUI/Helpers/WikiHelper";

export function areFiltersEqual(sourceFilters: { [key: string]: string[] }, targetFilters: { [key: string]: string[] }): boolean {
    if (Object.keys(sourceFilters).length !== Object.keys(targetFilters).length) {
        return false;
    }

    let areEqual = true;

    $.each(sourceFilters, (key: string, filtersEntries: string[]) => {
        if (!(key in targetFilters) ||
            !Utils_Array.arrayEquals(filtersEntries, targetFilters[key], (s: string, t: string) => {
                return Utils_String.localeIgnoreCaseComparer(s, t) === 0;
            })) {

            areEqual = false;
            return;
        }
    });

    return areEqual;
}


export function constructLinkToProjectWikiContent(result: WikiResult, wikiUrl: string, wikiPath: string): string {
    let resultantURLToWikiHubContent: string;

    resultantURLToWikiHubContent = wikiUrl
        + encodeURIComponent(result.project.name)
        + Constants.RepoConstants.PathSeparator
        + Constants.PathConstants.Underscore
        + encodeURIComponent(Constants.WikiControllerName)
        + Constants.PathConstants.QuestionMark
        + encodeURIComponent(Constants.WikiUrlParameters.PagePath)
        + Constants.PathConstants.Equal
        // '-' in the page path relates to escaped '%2D' in URL.
        + encodeURIComponent(wikiPath.split("\\").join("/").replace(UrlEscapeConstants.HyphenRegExp, UrlEscapeConstants.HyphenEncoding));

    return resultantURLToWikiHubContent;
}

/**
* Constructs file contents url for project and code wikis, which takes the user into wiki hub
*/
export function constructLinkToWikiContent(result: WikiResult, wikiUrl: string, wikiFilePath: string): string {
    let resultantURLToWikiHubContent: string;

    let mappedPath = result.wiki.mappedPath ? result.wiki.mappedPath.split("\\").join("/") : "";
    if (!(mappedPath.length > 0 && mappedPath.charAt(mappedPath.length - 1) == "/")) {
        mappedPath = mappedPath.concat("/");
    }

    const wikiName = result.wiki.name;

    resultantURLToWikiHubContent = wikiUrl
        + encodeURIComponent(result.project.name)
        + Constants.RepoConstants.PathSeparator
        + Constants.PathConstants.Underscore
        + encodeURIComponent(Constants.WikiControllerName)
        + Constants.RepoConstants.PathSeparator
        + encodeURIComponent(Constants.WikiResourceName)
        + Constants.RepoConstants.PathSeparator
        + encodeURIComponent(wikiName)
        + Constants.PathConstants.QuestionMark
        + encodeURIComponent(Constants.WikiUrlParameters.PagePath)
        + Constants.PathConstants.Equal
        // '-' in the page path relates to escaped '%2D' in URL.
        + encodeURIComponent(getWikiPagePathFromGitPath(wikiFilePath.split("\\").join("/").substring(mappedPath.length - 1)).replace(UrlEscapeConstants.HyphenRegExp, UrlEscapeConstants.HyphenEncoding));

    if (result.wiki.version)
    {
        resultantURLToWikiHubContent = resultantURLToWikiHubContent
            + Constants.PathConstants.Ampersand
            + encodeURIComponent(Constants.WikiUrlParameters.WikiVersion)
            + Constants.PathConstants.Equal
            + encodeURIComponent("GB" + result.wiki.version);
    }

    return resultantURLToWikiHubContent;
}
