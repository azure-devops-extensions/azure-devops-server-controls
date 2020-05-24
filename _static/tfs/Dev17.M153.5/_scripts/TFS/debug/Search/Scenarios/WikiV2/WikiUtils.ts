import * as Constants from "SearchUI/Constants";

import { areFiltersEqual } from "Search/Scenarios/Shared/Utils";
import { WikiSearchRequest, WikiResult } from "Search/Scripts/Generated/Search.Shared.Contracts";
import { getWikiPagePathFromGitPath, UrlEscapeConstants } from "SearchUI/Helpers/WikiHelper";
import { htmlEncode } from "VSS/Utils/String";

export function areQueriesEqual(left: WikiSearchRequest, right: WikiSearchRequest): boolean {
    if (left.searchText !== right.searchText) {
        return false;
    }

    if (left.$top !== right.$top) {
        return false;
    }

    return areFiltersEqual(left.filters, right.filters);
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

const WHITE_SPACE_REGEX = /(\s+)/g;
const NEW_LINE_REGEX = /[.]*[\s]*(\n+)/g;
const HIT_HIGHT_LIGHT_HTML_ENCODED_START_TAG_REGEX = /(&lt;highlighthit&gt;)/gi;
const HIT_HIGHT_LIGHT_HTML_ENCODED_END_TAG_REGEX = /(&lt;\/highlighthit&gt;)/gi;
const HIGHLIGHTSTARTTAG = "<highlighthit>";
const HIGHLIGHTENDTAG = "</highlighthit>";

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
