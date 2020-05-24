import * as React from "react";
import { getNavigationHistoryService, StateMergeOptions } from "VSS/Navigation/NavigationHistoryService";
import { combinePaths } from "VSS/Utils/File";
import { BrowserCheckUtils } from "VSS/Utils/UI";

import { IRouteData, TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as SharedSearchConstants from "SearchUI/Constants";
import { onNavigationHandler } from "VersionControl/Scripts/Utils/XhrNavigationUtils";
import { navigateToUrl, setWindowLocation } from "VersionControl/Scripts/Utils/XhrNavigationUtilsNonReact";
import { UrlParameters } from "Wiki/Scenarios/Shared/SharedActionsHub";
import { ContributionKeys, WikiActionIds } from "Wiki/Scripts/CommonConstants";
import { UrlConstants } from "Wiki/Scripts/Generated/Constants";
import { getCurrentHub, getDefaultUrlParameters, getPagePathForUrlCreation } from "Wiki/Scripts/Helpers";
import * as WikiFeatures from "Wiki/Scripts/WikiFeatures";

export function redirectToUrl(url: string, isInternal: boolean = true, targetHubId: string = getCurrentHub()): void {
    if (isInternal) {
        // Xhr navigate to url if internal link
        navigateToUrl(url, targetHubId);
    } else {
        setWindowLocation(url);
    }
}

export function redirectToUrlReact<T extends HTMLElement>(url: string, event: React.SyntheticEvent<T>): void {
    let wikiHubUrlPrefix = TfsContext.getDefault().getPublicActionUrl(null, SharedSearchConstants.WikiControllerName, null);
    if (url.indexOf(wikiHubUrlPrefix) === 0) {
        if (onNavigationHandler<T>(event, getCurrentHub(), url)) {
            setWindowLocation(url);
        }
    } else {
        setWindowLocation(url);
    }
}

export function linkOnClickEventHelper(event: React.MouseEvent<HTMLAnchorElement>, onClickHandler: () => void): boolean {
    const shouldOpenInNewTab = (event.ctrlKey && BrowserCheckUtils.isChrome())
        || (event.metaKey && BrowserCheckUtils.isSafari())
        || (event.button === 1 && BrowserCheckUtils.isFirefox()); // Middle click in firefox;
    const shouldExecuteOnClickHandler = !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey;
    if (!shouldOpenInNewTab && !shouldExecuteOnClickHandler) {
        // Returning true to execute default handler
        return true;
    }

    // Stop default execution
    event.stopPropagation();
    event.preventDefault();

    if (shouldOpenInNewTab) {
        // Open link in new tab for 'ctrl/command + click'. Uses href value to open url in new tab.
        const windowObject = window.open(event.currentTarget.href, "_blank");
        windowObject.opener = null;
    } else if (shouldExecuteOnClickHandler) {
        // Execute provided onClickHandler for just 'click'
        onClickHandler();
    }

    // Returning false to prevent default handler from executing
    return false;
}

export function removeDefaultUrlParams(updatedParameters: UrlParameters): void {
    let defaultUrlParameters = getDefaultUrlParameters();
    defaultUrlParameters = { ...defaultUrlParameters, _a: defaultUrlParameters.action } as any;
    for (const key in defaultUrlParameters) {
        if (updatedParameters[key] === defaultUrlParameters[key]) {
            updatedParameters[key] = undefined;
        }
    }
}

export function getWikiPublishUrl(): string {
    const routeParams = {
        wikiIdentifier: null,
    } as UrlParameters;

    return getWikiUrl(WikiActionIds.Publish, routeParams, StateMergeOptions.routeValues);
}

export function getWikiUpdateUrl(): string {
    return getWikiUrl(WikiActionIds.Update, null, StateMergeOptions.routeValues);
}

export function getWikiPageUrl(
    urlParams: UrlParameters,
    mergeOptions: StateMergeOptions = StateMergeOptions.currentState
): string {
    return getWikiUrl(urlParams.action, urlParams, mergeOptions);
}

export function getWikiPageHistoryUrl(
    urlParams: UrlParameters,
    mergeOptions: StateMergeOptions = StateMergeOptions.currentState
): string {
    return getWikiUrl(WikiActionIds.History, urlParams, mergeOptions);
}

export function getWikiPageViewUrl(
    urlParams: UrlParameters,
    mergeOptions: StateMergeOptions = StateMergeOptions.currentState
): string {
    return getWikiUrl(WikiActionIds.View, urlParams, mergeOptions);
}

export function getWikiPageEditUrl(
    urlParams: UrlParameters,
    mergeOptions: StateMergeOptions = StateMergeOptions.currentState
): string {
    return getWikiUrl(WikiActionIds.Edit, urlParams, mergeOptions);
}

export function getWikiPageCompareUrl(
    urlParams: UrlParameters,
    mergeOptions: StateMergeOptions = StateMergeOptions.currentState
): string {
    return getWikiUrl(WikiActionIds.Compare, urlParams, mergeOptions);
}

export function getHyphenEscapedUrlParam(urlParams: UrlParameters): UrlParameters {
    if (!urlParams) {
        return urlParams;
    }

    if (urlParams.pagePath) {
        urlParams.pagePath = getPagePathForUrlCreation(urlParams.pagePath);
    }

    if (urlParams.latestPagePath) {
        urlParams.latestPagePath = getPagePathForUrlCreation(urlParams.latestPagePath);
    }

    return urlParams;
}

export function getWikiUrl(
    action: string = WikiActionIds.View,
    urlParams: UrlParameters = null,
    mergeOptions: StateMergeOptions = StateMergeOptions.currentState): string {

    const navHistoryService = getNavigationHistoryService();

    urlParams = getHyphenEscapedUrlParam(urlParams);

    // adding '_a' for action passed and undefining 'action' parameter
    // merging urlParams and routeData as both contain non conflicting params
    // Project information is needed when url is formed from outside current project context.
    const routeParams = {
        _a: action || (urlParams && urlParams.action),
        ...urlParams as any,
        action: undefined,
    };

    // Remove default parameters
    removeDefaultUrlParams(routeParams);

    return navHistoryService.generateUrlForRoute(
        navHistoryService.getCurrentRouteId(),
        routeParams,
        mergeOptions);
}

/* External wiki hub URLs to be used when the urls are formed from hubs outside wiki hub. */
export function getExternalWikiHubPageViewUrl(wikiIdentifier: string, urlParams: UrlParameters, routeData?: IRouteData): string {
    return getExternalWikiHubUrl(wikiIdentifier, WikiActionIds.View, urlParams, routeData);
}

export function getExternalWikiHubPageEditUrl(wikiIdentifier: string, urlParams: UrlParameters): string {
    return getExternalWikiHubUrl(wikiIdentifier, WikiActionIds.Edit, urlParams);
}

export function getExternalWikiHubUrl(
    wikiIdentifier: string,
    action: string = WikiActionIds.View,
    urlParams: UrlParameters = null,
    routeData: IRouteData = null): string {

    urlParams = getHyphenEscapedUrlParam(urlParams);

    const routeParams = {
        _a: action || (urlParams && urlParams.action),
        ...urlParams as any,
        ...routeData as any,
        action: undefined,
    };

    removeDefaultUrlParams(routeParams);

    const genericWikiUrl = TfsContext.getDefault().getPublicActionUrl(null, SharedSearchConstants.WikiControllerName, routeParams);
    const urlParts = genericWikiUrl.split("?");

    if (wikiIdentifier && WikiFeatures.isProductDocumentationEnabled()) {
        const relativeUrl: string = combinePaths(UrlConstants.WikisSubArea, wikiIdentifier);
        urlParts[0] = combinePaths(urlParts[0], relativeUrl);
    }

    return urlParts.join("?");
}
