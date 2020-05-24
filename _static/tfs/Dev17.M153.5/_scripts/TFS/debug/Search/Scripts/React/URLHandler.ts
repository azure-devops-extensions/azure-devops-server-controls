import StringUtils = require("VSS/Utils/String");
import {SearchProvider} from "Search/Scripts/React/Models";
import UrlUtils = require("VSS/Utils/Url");
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";

export function getTabUrl(tab: string, urlState: any): string {

    let presentUrl: string = window.location.href,
        entity: string,
        parts: any = StringUtils.singleSplit(presentUrl, "?"),
        uri = UrlUtils.Uri.parse(presentUrl),
        text: string = uri.getQueryParam("text"),
        lp: string = uri.getQueryParam("lp"),
        action: string = "search";

    entity = (tab === SearchProvider.workItem.toString())
        ? SearchConstants.WorkItemEntityTypeId
        : SearchConstants.CodeEntityTypeId;

    let nextUrl = parts.part1;
    if (entity) {
        nextUrl = nextUrl + "?type=" + entity;
    }
    if (text) {
        nextUrl = nextUrl + "&text=" + text;
    }
    if (lp) {
        nextUrl = nextUrl + "&lp=" + lp;
    }
    nextUrl = nextUrl + "&_a=" + action;
    return nextUrl;
}

//Fetches the code element filter from the URL if present. Returns null otherwise.
export function getCodeElementFilter(): string {
    let decodedUrl: string = decodeURI(window.location.href);
    let codeElementIndex = decodedUrl.indexOf("CodeElementFilters");
    if (codeElementIndex > 0) {
        return StringUtils.singleSplit(decodedUrl.substring(codeElementIndex), "&").part1;
    }
    return;
}