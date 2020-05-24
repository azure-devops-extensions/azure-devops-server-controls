import { WebContext } from "VSS/Common/Contracts/Platform";
import { getPageContext } from "VSS/Context";
import { ILocalService, getLocalService } from "VSS/Service";
import { combineUrl, getBestRouteMatch, IParsedRoute, isAbsoluteUrl, parseRouteTemplate, replaceRouteValues, Uri } from "VSS/Utils/Url";
import { LocationService } from "./Location";

/**
 * Service to manage browser history and navigation state
 */
export interface INavigationHistoryService {

    /**
     * Updates (replaces) the current history entry, optionally updating the address bar with a new url
     *
     * @param state Optional set of current URL state parameters (route values and query parameters). If not specified, computed from the given url.
     * @param url Optional url to update the address bar with. If not specified, computed from the given state (and current page's route template).
     * @param routeId Optional route id to set for this entry. If not specified, the current page's route id is used.
     * @param navigationElementId Optional id of the navigation element that this entry targets. If not specified the current page's hub id is used.
     */
    replaceState(state: { [key: string]: string }, url?: string, routeId?: string, navigationElementId?: string);

    /**
     * Adds a new history entry, updating the address bar with a new url
     *
     * @param state Optional set of current URL state parameters (route values and query parameters). If not specified, computed from the given url.
     * @param url Optional url to update the address bar with. If not specified, computed from the given state (and current page's route template).
     * @param routeId Optional route id to set for this entry. If not specified, the current page's route id is used.
     * @param navigationElementId Optional id of the navigation element that this entry targets. If not specified the current page's hub id is used.
     * @param forcePush Optional boolean to push state even when the url is same
     */
    pushState(state: { [key: string]: string }, url?: string, routeId?: string, navigationElementId?: string, forcePush?: boolean);

    /**
     * Get the current dictionary of all URL state parameters. This includes route values as well as query parameters.
     */
    getState(): { [key: string]: string };

    /**
     * Generate a URL given the current navigation state values
     *
     * @param state State values (query parameters and route values)
     * @param mergeOptions Options around whether the provided state just provides overrides for the current navigation 
     *        state or a full set of state values. The default is to merge with the current navigation state.
     */
    generateUrl(state: { [key: string]: string }, mergeOptions?: StateMergeOptions): string;

    /**
     * Generate a URL for a given route given the current navigation state values
     *
     * @param routeId Id of the route to generate link for
     * @param state State values (query parameters and route values)
     * @param mergeOptions Options around whether the provided state just provides overrides for the current navigation
     *        state or a full set of state values. The default is to merge with the current navigation state.
     */
    generateUrlForRoute(routeId: string, state: { [key: string]: string }, mergeOptions?: StateMergeOptions): string;

    /**
     * Get the current value for all the routeValues used for the current page.
     */
    getCurrentRouteValues(): { [key: string]: string };

    /**
     * Get the route id for the current page.
     */
    getCurrentRouteId(): string;

    /**
     * Subscribe to pop state events. The provided listener is invoked whenever a forward or back navigation
     * has occurred to a push-state entry that this service is managing.
     *
     * @param listener Method invoked when a forward or back navigation has occurred.
     */
    subscribe(listener: (event: INavigationPopStateEvent) => void);

    /**
     * Remove a pop-state listener.
     *
     * @param listener Listener to remove.
     */
    unsubscribe(listener: (event: INavigationPopStateEvent) => void);

    /**
     * Register that the same code handles the aliasRouteId as hanldes the baseRouteId. Navigation
     * between routes that map to the same baseRouteId won't set isNewRoute on the navigation
     * events.
     */
    registerRouteAlias(baseRouteId: string, aliasRouteId: string): void;
}

/**
 * The state pushed in a single history entry
 */
export interface INavigationHistoryEntry {

    /**
     * Dictionary of all URL state parameters used in this history entry. This includes
     * route values as well as query parameters.
     */
    state: { [key: string]: string; };

    /**
     * The id of the route that this entry is using
     */
    routeId: string;

    /**
     * The contribution id of the selected navigation element (like a hub) for this history entry.
     */
    navigationElementId: string;

    /**
     * The url for this entry
     */
    url: string;
}

/**
 * Event triggered when a browser history entry has been popped (back or forward navigate)
 */
export interface INavigationPopStateEvent {
    /**
     * The previous history entry that we navigated away from
     */
    oldState: INavigationHistoryEntry;

    /**
     * The new/current history entry
     */
    newState: INavigationHistoryEntry;

    /**
     * True if the new state has a different route id than the previous state.
     */
    isNewRouteId: boolean;
}

/**
 * Set of options used when supplying a state dictionary for generating a URL, or when
 * modifying existing state.
 */
export const enum StateMergeOptions {
    /**
     * Don't merge any current values into the state object. The given state object
     * represents all state values to use.
     */
    none,

    /**
     * Merge with the current route values (those defined in the route template).
     * Current query parameters are NOT merged into the given state object. Values for the current route
     * values will be overridden by entries in the given state object.
     */
    routeValues,

    /**
     * Merge with all current navigation state values. The given state just overrides entries in
     * the current navigation state.
     */
    currentState
}

/**
 * Use a unique key in the state we pass to the history service so that we
 * only operate on our "own" entries.
 */
interface IHistoryState {
    __navigationState: INavigationHistoryEntry;
}

/**
* Service to manage browser history and navigation state
*/
class NavigationHistoryService implements ILocalService, INavigationHistoryService {

    private _listeners: { (event: INavigationPopStateEvent): void }[];
    private _currentState: INavigationHistoryEntry;

    private _parsedRouteTemplates: IParsedRoute[];
    private _parsedRouteTemplatesSource: string[];
    private _routeAliases: { [aliasRouteId: string]: string } = {};

    constructor() {
        this._listeners = [];

        window.addEventListener("popstate", this._onPopState.bind(this));
    }

    public replaceState(state: { [key: string]: string }, url?: string, routeId?: string, navigationElementId?: string) {
        this._setState(true, state, url, routeId, navigationElementId);
    }

    public pushState(state: { [key: string]: string }, url?: string, routeId?: string, navigationElementId?: string, forcePush?: boolean) {
        this._setState(false, state, url, routeId, navigationElementId, forcePush);
    }

    public getState(): { [key: string]: string } {

        let state: { [key: string]: string };

        // Get the state from the url
        if (this._currentState && this._currentState.state) {
            state = { ...this._currentState.state };
        }
        else {
            state = this._getStateFromUrl(window.location.href);
        }

        return state;
    }

    private _setState(replace: boolean, state: { [key: string]: string }, url?: string, routeId?: string, navigationElementId?: string, forcePush?: boolean) {

        const pageContext = getPageContext();
        const computeState = !state;

        if (url && !state) {
            // Provided only the url. Get the state from the url parameters
            state = this._getStateFromUrl(url);
        }
        else if (state && !url) {
            // Provided only the state. Set the url based on the state.
            if (routeId) {
                url = this.generateUrlForRoute(routeId, state, StateMergeOptions.none);
            }
            else {
                url = this.generateUrl(state, StateMergeOptions.none);
            }
        }
        else if (!url && !state) {
            // Provided neither a url or state. Don't modify them. Only change routeId/navigationElementId.
            url = window.location.href;

            state = this._currentState && this._currentState.state;
            if (!state) {
                state = this._getStateFromUrl(url);
            }
        }

        if (routeId === null || routeId === undefined) {
            routeId = pageContext.navigation.routeId;
        }

        if (!navigationElementId && pageContext.hubsContext) {
            navigationElementId = pageContext.hubsContext.selectedHubId;
        }

        const navigationState: INavigationHistoryEntry = {
            state,
            routeId,
            navigationElementId,
            url
        };

        const compareUrl = isAbsoluteUrl(url) ? url : combineUrl(window.location.origin, url);
        let mergeExistingState = replace;
        if (forcePush && window.location.href === compareUrl) {
            // Setting the merge state to true if the url has not been changed and force push is true, 
            // this will preserve the existing window state to read extra data
            mergeExistingState = true;
        }

        const historyState = mergeExistingState ? { ...window.history.state, __navigationState: navigationState } : { __navigationState: navigationState };
        this._currentState = navigationState;

        // Don't ever push a new history entry if it is for the same url as the current entry. But if forcePush is true, push state irrespective of the url
        // Forcepush could be used in case of dialogs want to maintain their own state but dont want to pollute urls.
        if (replace || (!forcePush && window.location.href === compareUrl)) {
            window.history.replaceState(historyState, undefined, url);
        }
        else {
            window.history.pushState(historyState, undefined, url);
        }
    }

    private getParsedRoutes(routeTemplates: string[]) {

        if (this._parsedRouteTemplates && this._parsedRouteTemplatesSource === routeTemplates) {
            return this._parsedRouteTemplates;
        }

        let parsedTemplates: IParsedRoute[] = [];
        if (routeTemplates) {

            for (let routeTemplate of routeTemplates) {
                parsedTemplates.push(parseRouteTemplate(routeTemplate));
            }

            this._parsedRouteTemplates = parsedTemplates;
            this._parsedRouteTemplatesSource = routeTemplates;
        }

        return parsedTemplates;
    }

    /**
     * Generate a URL given the current navigation state values
     *
     * @param state State values (query parameters and route values)
     * @param mergeOptions Options around whether the provided state just provides overrides for the current navigation
     *        state or a full set of state values. The default is to merge with the current navigation state.
     */
    public generateUrl(state: { [key: string]: string }, mergeOptions: StateMergeOptions = StateMergeOptions.currentState): string {
        const pageContext = getPageContext();
        const routeTemplates = this.getParsedRoutes(pageContext.navigation.routeTemplates);

        return this._generateUrlFromTemplates(routeTemplates, state, mergeOptions);
    }

    /**
     * Generate a URL for a given route given the current navigation state values
     * 
     * @param routeId Id of the route to generate link for
     * @param state State values (query parameters and route values)
     * @param mergeOptions Options around whether the provided state just provides overrides for the current navigation
     *        state or a full set of state values. The default is to merge with the current navigation state.
     */
    public generateUrlForRoute(routeId: string, state: { [key: string]: string }, mergeOptions: StateMergeOptions = StateMergeOptions.currentState): string {
        const locationService = getLocalService(LocationService);

        return this._generateUrlFromTemplates(locationService.routeTemplates(routeId), state, mergeOptions);
    }

    /**
     * Generate a URL given the current navigation state values and a set of route templates
     *
     * @param routeTemplates Set of route templates to choose from, best match will be determined based on the route values
     * @param state State values (query parameters and route values)
     * @param mergeOptions Options around whether the provided state just provides overrides for the current navigation
     *        state or a full set of state values. The default is to merge with the current navigation state.
     */
    private _generateUrlFromTemplates(routeTemplates: IParsedRoute[], state: { [key: string]: string }, mergeOptions: StateMergeOptions = StateMergeOptions.currentState): string {
        const pageContext = getPageContext();
        const hostUrl = encodeURI(pageContext.webContext.host.relativeUri);
        const routeValues = pageContext.navigation.routeValues;

        let fullState: { [key: string]: string };
        switch (mergeOptions) {
            case StateMergeOptions.currentState:
                fullState = { ...this.getState(), ...state };
                break;

            case StateMergeOptions.routeValues:
                fullState = { ...this.getCurrentRouteValues(), ...state };
                break;

            default:
                fullState = state;
        }

        const matchedRoute = getBestRouteMatch(routeTemplates, fullState);

        let relativeUrl = "";
        if (matchedRoute) {
            relativeUrl = matchedRoute.url;
        }

        const uri = new Uri(combineUrl(hostUrl, relativeUrl));
        if (matchedRoute) {
            // Add state that was not used as a route replacement as a query parameter.
            for (const routeValueKey in fullState) {
                // Skip route values that were matched in the route template
                if (!matchedRoute.matchedParameters[routeValueKey]) {

                    const remainingStateValue = fullState[routeValueKey];
                    if (remainingStateValue !== null && remainingStateValue !== undefined) {

                        // Don't add default route values as query parameters.
                        if (routeValues[routeValueKey] !== remainingStateValue) {
                            uri.addQueryParam(routeValueKey, remainingStateValue);
                        }
                    }
                }
            }
        }

        return uri.absoluteUri;
    }

    /**
     * Get the current value for all the routeValues used for the current page.
     */
    public getCurrentRouteValues(): { [key: string]: string } {

        const pageContext = getPageContext();
        const routeValues: { [key: string]: string } = {};

        const state = this.getState();
        for (let routeValueKey in pageContext.navigation.routeValues) {
            routeValues[routeValueKey] = state[routeValueKey];
        }

        return routeValues;
    }

    /**
     * Get the route id for the current page.
     */
    public getCurrentRouteId(): string {
        if (this._currentState && this._currentState.routeId) {
            return this._currentState.routeId;
        }
        else {
            const pageContext = getPageContext();
            return pageContext.navigation.routeId;
        }
    }

    public registerRouteAlias(baseRouteId: string, aliasRouteId: string): void {
        this._routeAliases[aliasRouteId] = baseRouteId;
        this._routeAliases[baseRouteId] = baseRouteId;
    }

    private _getStateFromUrl(url: string): { [key: string]: string } {

        let state = { ...getPageContext().navigation.routeValues };

        if (url) {
            let uri = new Uri(url);
            for (let queryParameter of uri.queryParameters) {
                state[queryParameter.name] = queryParameter.value;
            }
        }

        return state;
    }

    private _onPopState(e: PopStateEvent) {
        const historyState = e.state as IHistoryState;

        const oldState = this._currentState;

        let newState: INavigationHistoryEntry;
        let isNewRouteId = false;

        if (historyState && historyState.__navigationState) {
            newState = historyState.__navigationState;
            this._currentState = newState;
            isNewRouteId = !!oldState && (!newState.routeId || oldState.routeId !== newState.routeId);
        }

        if (oldState && newState && oldState.navigationElementId && newState.navigationElementId && oldState.navigationElementId !== newState.navigationElementId) {
            // We may have the same route (like fallback route which handles all 3rd-party hubs) but if they target different nav elements (hubs) then
            // we want XHR navigation to kick in.
            isNewRouteId = true;
        }

        if (oldState && newState && this._routeAliases[oldState.routeId] && this._routeAliases[oldState.routeId] === this._routeAliases[newState.routeId]) {
            // Different routes handled by the same code.
            isNewRouteId = false;
        }

        const popStateEvent: INavigationPopStateEvent = {
            oldState,
            newState,
            isNewRouteId
        };

        this.notifyListeners(popStateEvent);
    }

    private notifyListeners(event: INavigationPopStateEvent) {
        for (let listener of this._listeners) {
            listener.call(this, event);
        }
    }

    public subscribe(listener: (event: INavigationPopStateEvent) => void) {
        this._listeners.push(listener);
    }

    public unsubscribe(listener: (event: INavigationPopStateEvent) => void) {
        this._listeners = this._listeners.filter(l => l !== listener);
    }
}

export function getNavigationHistoryService(): INavigationHistoryService {
    return getLocalService(NavigationHistoryService);
}