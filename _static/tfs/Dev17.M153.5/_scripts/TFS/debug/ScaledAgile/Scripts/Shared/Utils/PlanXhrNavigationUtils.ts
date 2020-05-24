/// <reference types="react" />
/// <reference types="react-dom" />

import { INavigationHistoryService, INavigationPopStateEvent } from "VSS/Navigation/NavigationHistoryService";

import { Constants } from "ScaledAgile/Scripts/Generated/TFS.ScaledAgile.Constants";
import { HubsService } from "VSS/Navigation/HubsService";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { WebPageDataHelper } from "ScaledAgile/Scripts/Shared/Utils/WebPageDataHelper";

import * as Service from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Core from "VSS/Utils/Core";

import Context = require("VSS/Context");

/**
 * Handles the navigation event without page refresh, if "VisualStudio.Services.WebAccess.XHRHubSwitching" flag has been enabled.
 * @param {string} url - Url of the page where the user should be navigated
 * @param {string} nativeEvent - Optional. If specified and if the event has been handled by the HubNavigateHandler, then the propagation of this event will be stopped.
 *                               This is required to enusre we don't get navigated away by the browser's default click handler.
 * @returns{boolean} Boolean indicating whether the hub navigation handler has handled this event or not.
                     False if handled and no propagation of the event is required, true if this handler resulted in a no-op.
 */
export function onClickNavigationHandler(url: string, nativeEvent?: Event | __React.MouseEvent<HTMLElement>): boolean {
    const handler = Service.getLocalService(HubsService).getHubNavigateHandler(Constants.PlansHubContributionId, url);

    // Prevent the native event from double-triggering a navigation, one correctly with ?_xhr=true and another without.
    const result = handler(nativeEvent);
    if (!result && nativeEvent) {
        nativeEvent.stopPropagation();
        nativeEvent.preventDefault();
    }

    return result;
}

/**
 * Updates the history service's state to point to a Plans URL with an updated parameter.
 * @param historyService The service instance to use to perform the update
 * @param newParameter The new value for the last segment of the URL
 */
export function updateLocationState(historyService: INavigationHistoryService, newParameter: string) {
    historyService.replaceState({ ...historyService.getState(), [Constants.PlansRouteParameterKey]: newParameter });
}

/**
 * Gets the plan URL for the given plan ID. This is to ensure that the logic for generating URLs resides at a single place.
 * @param {string} planId - Id of the plan
 * @returns{string} URL of the plan
 */
export function getPlanURL(planId: string): string {
    return TfsContext.getDefault().getActionUrl(planId, "plans");
}

export function getLastVisitedPlansDirectoryPivot(): string {
    return WebPageDataHelper.getMruTab() || Constants.PlansDirectoryPageAllPivot;
}

export function getPlansDirectoryUrl(pivotKey?: string): string {
    if (!pivotKey) {
        pivotKey = getLastVisitedPlansDirectoryPivot();
    }

    return TfsContext.getDefault().getActionUrl(pivotKey, "plans");
}

export function isWithinPlansHub(navigationElementId: string) {
    return navigationElementId === Constants.PlansHubContributionId;
}

export function isDirectoryPage(stateParam: string, navigationElementId?: string): boolean {
    if (navigationElementId && !isWithinPlansHub(navigationElementId)) {
        return false;
    }

    return Utils_String.equals(stateParam, Constants.PlansDirectoryPageFavoritesPivot, true)
        || Utils_String.equals(stateParam, Constants.PlansDirectoryPageAllPivot, true);
}

export function isNewPlanPage(stateParam: string, navigationElementId?: string): boolean {
    if (navigationElementId && !isWithinPlansHub(navigationElementId)) {
        return false;
    }

    return Utils_String.equals(stateParam, Constants.CreateWizardViewId, true);
}

export function isContentPage(stateParam: string, navigationElementId?: string): boolean {
    if (navigationElementId && !isWithinPlansHub(navigationElementId)) {
        return false;
    }

    return !isNewPlanPage(stateParam) && !isDirectoryPage(stateParam);
}

export function isDifferentPage(oldStateParam: string, newStateParam: string): boolean {
    return isDirectoryPage(oldStateParam) !== isDirectoryPage(newStateParam)
        || isNewPlanPage(oldStateParam) !== isNewPlanPage(newStateParam)
        // Each plan is considered its own page and requires page nav
        || (isContentPage(newStateParam) && !Utils_String.equals(oldStateParam, newStateParam, true));
}

export function requireNavigation(e: INavigationPopStateEvent): boolean {
    if (!e.oldState || !e.newState) {
        return false;
    }

    if (!isWithinPlansHub(e.newState.navigationElementId)) {
        return false;
    }

    const oldRouteParam = e.oldState.state[Constants.PlansRouteParameterKey];
    const newRouteParam = e.newState.state[Constants.PlansRouteParameterKey];
    return e.isNewRouteId || isDifferentPage(oldRouteParam, newRouteParam);
}

/**
 * 1. Replace action "_a" in state if exists. This is especially for directory page back compact support.
 * 2. Drop the parameters mru in state coming from project switch since plan is project scoped.
 * @param state - The current State
 */
export function shouldReplaceState(state: { [key: string]: string; }) {
    const PLANS_OLD_ROUTE_ACTION_KEY = "_a";
    const pageContext = Context.getPageContext();
    const routeparam = pageContext.navigation.currentParameters;
    const stateParam = state[PLANS_OLD_ROUTE_ACTION_KEY];
    if (!routeparam && isDirectoryPage(stateParam)) {
        state[Constants.PlansRouteParameterKey] = stateParam;
        delete state[PLANS_OLD_ROUTE_ACTION_KEY];
        return true;
    }
    if (routeparam !== state[Constants.PlansRouteParameterKey]) {
        delete state[Constants.PlansRouteParameterKey];
        return true;
    }
    return false;
}
