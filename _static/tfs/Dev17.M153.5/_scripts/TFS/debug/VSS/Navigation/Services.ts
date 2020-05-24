import Context = require("VSS/Context");
import Events_Handlers = require("VSS/Events/Handlers");
import { FeatureManagementService } from "VSS/FeatureManagement/Services";
import { HubsService } from "VSS/Navigation/HubsService";
import { INavigationHistoryService, INavigationPopStateEvent, getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");


function createHistoryState(action: string, data: any): any {
    var newState: any = {};

    if (data) {
        action = action || data._a || data.action;
        newState = $.extend(newState, data);
        delete newState.action;
        delete newState._a;
    }

    if (action) {
        newState.action = action;
    }

    return newState;
}

/**
* Handler for pop state events.
*/
export interface IPopStateHandler {
    /**
    * Handler for pop state events
    *
    * @param newState The new push state
    * @param oldState The previous push state
    *
    * @returns True if the event was handled. False otherwise.
    */
    (newState: Object, previousState: Object): boolean;
}

/**
* Local service to manage history and navigation state
*/
export class HistoryService implements Service.ILocalService {

    private _namedEvents: Events_Handlers.NamedEventCollection<HistoryService, any>;
    private _usePushState: boolean;
    private _suppressNavigate: boolean;
    private _initialized: boolean;
    private _lastNavigatedHashString: string;
    private _lastNavigatedQueryString: string;
    private _ignoreQueryString: boolean;
    private _onHashChangedDelegate: (e: JQueryEventObject) => void;
    private _navHistoryService: INavigationHistoryService;

    constructor() {
        this._namedEvents = new Events_Handlers.NamedEventCollection();
        this._onHashChangedDelegate = this._onHashChanged.bind(this);
        this._navHistoryService = getNavigationHistoryService();

        if (window.history.pushState) {
            this._usePushState = true;
            this._navHistoryService.subscribe(this._onPopState.bind(this));
        }
    }

    /**
    * Gets the serialized version of the current navigation state.
    */
    public getCurrentFragment(): string {
        if (this._usePushState) {
            return HistoryService.serializeState(this.getCurrentState());
        }
        else {
            return this.getCurrentHashString();
        }
    }

    /**
    * Gets the current url's hash string
    */
    public getCurrentHashString(): string {
        var hash = window.location.hash;
        if (hash && hash[0] === "#") {
            hash = hash.substr(1);
        }
        return hash;
    }

    /**
    * Gets the current url's query string
    */
    public getCurrentQueryString(): string {
        var search = window.location.search;
        if (search && search[0] === "?") {
            search = search.substr(1);
        }
        return search;
    }

    /**
     * Creates a fragment url to be used in flight navigation.
     * This always returns a fragment link, regardless of the browser's capability to handle push state.
     * 
     * @param action The action name
     * @param data Action parameters
     * @return fragment URL in the form of #_a=[action]&routevalue1=routevalue2...
     */
    public getFragmentActionLink(action: string, data?: any): string {
        return "#" + HistoryService.serializeState(createHistoryState(action, data));
    }

    /**
    * Get the current navigation state dictionary. Uses query parameters and hash parameters.
    */
    public getCurrentState(): any {

        // Read state from the query string and the hash fragment. Hash fragment parameters "win"
        // over query string parameters with the same key
        var state = $.extend(
            this._ignoreQueryString ? {} : HistoryService.deserializeState(this.getCurrentQueryString()),
            HistoryService.deserializeState(this.getCurrentHashString()));

        return state;
    }

    /**
    * Replace the current history entry with the given state.
    * The back button will therefore not map to the current url (at the time this call is made), but rather to the previous history entry.
    *
    * @param action The "action" state parameter. This is the _a key in the url or "action" in the current state dictionary
    * @param data The new full set of navigation/history entries. This set completely replaces the current set.
    * @param windowTitle The new window title. A null or empty value indicates to leave the title unchanged.
    * @param suppressNavigate If true, don't trigger any of the attached navigate event handlers due to this update.
    * @param mergeCurrentState If true, the supplied data just modify the existing/current state. If false, they replace all existing key/value pairs.
    */
    public replaceHistoryPoint(action: string, data: any, windowTitle?: string, suppressNavigate?: boolean, mergeCurrentState: boolean = false) {
        this.updateHistoryEntry(action, data, true, mergeCurrentState, windowTitle, suppressNavigate);
    }

    /**
    * Add a new history entry with the given state. Merges data with the current navigation data.
    *
    * @param action The "action" state parameter. This is the _a key in the url or "action" in the current state dictionary
    * @param data New history entries to merge into the current navigation data. Set keys to null/undefined to remove them from the current state.
    * @param windowTitle The new window title. A null or empty value indicates to leave the title unchanged.
    * @param suppressNavigate If true, don't trigger any of the attached navigate event handlers due to this update.
    * @param mergeCurrentState If true, the supplied data just modify the existing/current state. If false, they replace all existing key/value pairs.
    */
    public addHistoryPoint(action: string,
        data?: any,
        windowTitle?: string,
        suppressNavigate?: boolean,
        mergeCurrentState: boolean = true) {
        this.updateHistoryEntry(action, data, false, mergeCurrentState, windowTitle, suppressNavigate);
    }

    /**
    * Update the current history entry
    *
    * @param action The "action" state parameter. This is the _a key in the url or "action" in the current state dictionary
    * @param data The history entry's new state key/value pairs
    * @param replaceHistoryEntry If true, replace the current history entry. Otherwise, add a new history entry.
    * @param mergeWithCurrentState If true, the supplied data just modify the existing/current state. If false, they replace all existing key/value pairs.
    * @param windowTitle The new window title. A null or empty value indicates to leave the title unchanged.
    * @param suppressNavigate If true, don't trigger any of the attached navigate event handlers due to this update.
    */
    public updateHistoryEntry(
        action: string,
        data?: IDictionaryStringTo<any>,
        replaceHistoryEntry?: boolean,
        mergeWithCurrentState?: boolean,
        windowTitle?: string,
        suppressNavigate?: boolean) {

        var state: IDictionaryStringTo<any> = {};

        if (mergeWithCurrentState) {
            state = this.getCurrentState();

            $.each(createHistoryState(action, data), function (key: string, value: any) {
                if (value === null || typeof value === "undefined") {
                    // New data can have entries explicitly set to null/undefined to clear out the existing value
                    delete state[key];
                }
                else {
                    // Replace the existing value
                    state[key] = value;
                }
            });
        }
        else {
            $.each(createHistoryState(action, data), function (name: string, value: any) {
                if (value !== null && typeof value !== "undefined" && value !== "") {
                    state[name] = value;
                }
            });
        }

        var newHash = "";
        var newQueryString = "";

        if (this._usePushState) {
            newQueryString = HistoryService.serializeState(state);
        }
        else {
            newHash = HistoryService.serializeState(state);
        }

        if (newHash !== this.getCurrentHashString() || newQueryString !== this.getCurrentQueryString()) {
            this._suppressNavigate = suppressNavigate === true;

            if (this._usePushState) {
                let url = this._getRootUrl();
                if (newQueryString) {
                    url += "?" + newQueryString;
                }
                if (replaceHistoryEntry) {
                    this._navHistoryService.replaceState(null, url);
                }
                else {
                    this._navHistoryService.pushState(null, url);
                }

                // Call _onNavigate to trigger any history listeners. This isn't needed when updating the hash
                // since we already have a hashchange listner.
                this._onNavigate();
            }
            else {
                if (replaceHistoryEntry) {
                    window.location.replace("#" + newHash);
                }
                else {
                    window.location.hash = newHash;
                }
            }
        }

        if (windowTitle) {
            document.title = windowTitle;
        }
    }

    /**
    * Serialize a navigation data lookup into a string that can be used as a hash or query string.
    *
    * @param state The navigation state dictionary to convert
    */
    public static serializeState(state: IDictionaryStringTo<any>): string {
        var serialized = [];
        $.each(state, (key, value) => {
            if (value !== null && typeof value !== "undefined") {
                var entry = key === "action" ? "_a" : key;
                serialized.push(entry + "=" + encodeURIComponent(value));
            }
        });
        return serialized.join("&");
    }

    /**
    * Deserialize a navigation state string into a navigation data lookup.
    *
    * @param state The serialized navigation state string (hash or query string)
    */
    public static deserializeState(state: string): IDictionaryStringTo<any> {

        var result: IDictionaryStringTo<any> = {};

        var tokens = (state || "").split("&");
        tokens.forEach((token) => {
            var parts = token.split("=", 2);
            if (parts.length === 2) {

                var key = parts[0];
                if (key === "_a") {
                    key = "action";
                }

                // Replace "+" character with %20.
                var value = parts[1].replace(/\+/g, "%20");

                try {
                    result[key] = decodeURIComponent(value);
                }
                catch (error) {
                    result[key] = value;
                }
            }
        });

        return result;
    }

    /**
    * Attach a new navigate handler
    *
    * @param handler The method called whenever a navigation event occurs
    * @param checkCurrentState If true, immediately invoke the handler
    */
    public attachNavigate(handler: IFunctionPPR<any, any, void>, checkCurrentState?: boolean): void;

    /**
    * Attach a new navigate handler
    *
    * @param action The action that the handler applies to
    * @param handler The method called whenever a navigation event occurs with the matching action value
    * @param checkCurrentState If true, immediately invoke the handler if the current state is appropriate (has the matching action value)
    */
    public attachNavigate(action: string, handler: IFunctionPPR<any, any, void>, checkCurrentState?: boolean): void;

    /**
    * Attach a new navigate handler
    *
    * @param action The action that the handler applies to
    * @param handler The method called whenever a navigation event occurs with the matching action value
    * @param checkCurrentState If true, immediately invoke the handler if the current state is appropriate (has the matching action value)
    */
    public attachNavigate(action: any, handler?: any, checkCurrentState?: boolean) {

        if ($.isFunction(action)) {
            // The overload where action is omitted was called.
            this.attachNavigate(null, action, handler || checkCurrentState);
            return;
        }

        if (handler) {

            if (!this._initialized) {

                this._initialized = true;
                this._suppressNavigate = false;
                this._setLastNavigateState();

                $(window).bind("hashchange", this._onHashChangedDelegate);

                if (this._usePushState) {
                    // Push the hash changes to the query string part of the url.
                    this._moveHashStateToQueryParams();
                }
            }

            this._namedEvents.subscribe(action ? action.toString() : "*", handler);

            if (checkCurrentState) {
                var currentState = this.getCurrentState();
                if (!action || (currentState.action && Utils_String.equals(currentState.action, action.toString(), true))) {
                    this._setLastNavigateState();
                    handler(this, currentState);
                }
            }
        }
    }

    /**
    * Remove a navigate handler
    *
    * @param handler The global navigate handler method to remove
    */
    public detachNavigate(handler: IFunctionPPR<any, any, void>): void;

    /**
    * Remove a navigate handler
    *
    * @param action The action that the handler applies to
    * @param handler The method called whenever a navigation event occurs with the matching action value
    */
    public detachNavigate(action: string, handler?: IFunctionPPR<any, any, void>): void;

    /**
    * Remove a navigate handler
    *
    * @param action The action that the handler applies to
    * @param handler The method called whenever a navigation event occurs with the matching action value
    */
    public detachNavigate(action: any, handler?: IFunctionPPR<any, any, void>) {
        if (this._initialized) {
            if ($.isFunction(action)) {
                this._namedEvents.unsubscribe("*", action);
            }
            else if (handler && action) {
                this._namedEvents.unsubscribe(action.toString(), handler);
            }

            if (!this._namedEvents.hasSubscribers()) {
                // No more subscribers, cleanup after our initialization.
                this._initialized = false;
                $(window).unbind("hashchange", this._onHashChangedDelegate);
            }
        }
    }

    /**
     * Add a new history entry to the browser's history (updating the url in the address bar)
     *
     * @param url Url to update the browser's address bar to
     */
    public pushState(url: string) {
        this._lastNavigatedHashString = null;
        this._lastNavigatedQueryString = null;
        this._navHistoryService.pushState(null, url);
    }

    /**
     * Replace the current history entry in the browser's history (updating the url in the address bar)
     *
     * @param url Url to update the browser's address bar to
     */
    public replaceState(url: string) {
        this._lastNavigatedHashString = null;
        this._lastNavigatedQueryString = null;
        this._navHistoryService.replaceState(null, url);
    }

    private _getFullTitle(title: string) {
        if (title) {
            return getDefaultPageTitle(title);
        }
        else {
            return null;
        }
    }

    private _getRootUrl() {
        let url = window.location.href;

        const queryIndex = url.indexOf("?");
        if (queryIndex >= 0) {
            url = url.substr(0, queryIndex);
        }

        const hashIndex = url.indexOf("#");
        if (hashIndex >= 0) {
            url = url.substr(0, hashIndex);
        }

        return url;
    }

    private _moveHashStateToQueryParams() {

        // If a hash fragment is supplied, it fully replaces the existing state. Push it to the 
        // query string part of the url.
        var hash = this.getCurrentHashString();
        if (hash) {
            this._navHistoryService.replaceState(null, this._getRootUrl() + "?" + hash);
        }
    }

    private _onHashChanged(e: JQueryEventObject) {

        if (this._usePushState) {
            // Push the hash changes to the query string part of the url.
            this._moveHashStateToQueryParams();
        }
        else {
            // We're using the hash string as the current navigation state. Any existing query string params
            // should be ignored as part of the navigation state at this point. We will only deal with the hash
            // from this point forward.
            this._ignoreQueryString = true;
        }

        this._onNavigate();
    }

    private _onPopState(popStateEvent: INavigationPopStateEvent) {

        if (this._initialized && !popStateEvent.isNewRouteId) {
            // Push the hash changes to the query string part of the url.
            this._moveHashStateToQueryParams();
            this._onNavigate();
        }
    }

    private _onNavigate() {

        if (this._suppressNavigate) {
            // Skipping this navigate event. Clear the flag.
            this._suppressNavigate = false;
            this._setLastNavigateState();
        }
        else {
            if (this.getCurrentHashString() !== this._lastNavigatedHashString ||
                this.getCurrentQueryString() !== this._lastNavigatedQueryString) {

                this._setLastNavigateState();

                var historyState = this.getCurrentState();

                if (historyState.action) {
                    this._namedEvents.invokeHandlers(historyState.action, this, historyState);
                }

                this._namedEvents.invokeHandlers("*", this, historyState);
            }
        }
    }

    private _setLastNavigateState() {
        this._lastNavigatedHashString = this.getCurrentHashString();
        this._lastNavigatedQueryString = this.getCurrentQueryString();
    }
}

/**
* Gets the instance of the local History service
*/
export function getHistoryService(): HistoryService {
    return Service.getLocalService(HistoryService);
}

/**
* Gets page title using the default page title format
*/
export function getDefaultPageTitle(title: string): string {
    return Utils_String.format(getDefaultPageTitleFormatString(), title || "");
}

/**
* Gets default page title format
*/
export function getDefaultPageTitleFormatString(): string {
    try {
        const featureService = Service.getService(FeatureManagementService);
        if (featureService) {
            const verticalFeatureEnabled = featureService.isFeatureEnabled("ms.vss-tfs-web.vertical-navigation");

            if (verticalFeatureEnabled) {
                var hubsService = Service.getLocalService(HubsService);
                if (hubsService) {
                    var selectedHubGroup = hubsService.getHubGroupById(hubsService.getSelectedHubGroupId());
                    var applicationTitle = selectedHubGroup && selectedHubGroup.name;

                    if (applicationTitle) {
                        return Utils_String.format(Resources_Platform.PageTitleWithApplication, "{0}", applicationTitle);
                    }
                }
            }
        }
    } catch {
        // Ignore exceptions and just return the old title.
    }

    return Context.getPageContext().webAccessConfiguration.isHosted ?
        Resources_Platform.PageTitleWithContent_Hosted : Resources_Platform.PageTitleWithContent;
}