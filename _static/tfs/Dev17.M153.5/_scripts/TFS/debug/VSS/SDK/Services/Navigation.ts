/// <reference path='../../References/VSS.SDK.Interfaces.d.ts' />
/// <reference types="q" />

import Q = require("q");

import Context = require("VSS/Context");
import Resources_Platform = require("VSS/Resources/VSS.Resources.Platform");
import SDK_Shim = require("VSS/SDK/Shim");
import Utils_String = require("VSS/Utils/String");
import Navigation_Services = require("VSS/Navigation/Services");

/**
* Service which allows interaction with the browser location and navigation of the host frame
* @serviceId "ms.vss-web.navigation-service"
*/
export class HostNavigationService implements IHostNavigationService {

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

        Navigation_Services.getHistoryService().updateHistoryEntry(action, data, replaceHistoryEntry, mergeWithCurrentState, windowTitle, suppressNavigate);
    }

    /**
    * Get the current navigation state dictionary. Uses query parameters and hash parameters.
    */
    public getCurrentState() {
        return Navigation_Services.getHistoryService().getCurrentState();
    }


    /**
    * Attach a new navigate handler
    *
    * @param action The action that the handler applies to (or null to listen for all events)
    * @param handler The method called whenever a navigation event occurs with the matching action value
    * @param checkCurrentState If true, immediately invoke the handler if the current state is appropriate (has the matching action value)
    */
    public attachNavigate(action: string, handler: IFunctionPPR<any, any, void>, checkCurrentState?: boolean): void {
        Navigation_Services.getHistoryService().attachNavigate(action, handler, checkCurrentState);
    }

    /**
    * Remove a navigate handler
    *
    * @param action The action that the handler applies to (or null for global handlers)
    * @param handler The method called whenever a navigation event occurs with the matching action value
    */
    public detachNavigate(action: string, handler?: IFunctionPPR<any, any, void>): void {
        Navigation_Services.getHistoryService().detachNavigate(action, handler);
    }

    /**
    * Add a callback to be invoked each time the hash navigation has changed
    *
    * @param callback Method invoked on each navigation hash change
    */
    public onHashChanged(callback: (hash: string) => void) {
        if (callback) {
            $(window).bind("hashchange", () => {
                callback(this._getHash());
            });
        }
    }

    private _getHash(): string {
        return Navigation_Services.getHistoryService().getCurrentHashString();
    }

    /**
    * Gets the current hash.
    */
    public getHash() {
        return Q.resolve(this._getHash());
    }

    /**
     * Reloads the parent frame
     */
    public reload() {
        window.location.reload();
    }

    /**
    * Sets the provided hash from the hosted content.
    */
    public setHash(hash: string) {
        window.location.hash = hash;
    }

    /**
    * Replace existing hash with the provided hash from the hosted content.
    */
    public replaceHash(hash: string) {
        window.location.replace("#" + hash);
    }

    /**
    * Update the host document's title (appears as the browser tab title).
    *
    * @param title The new title of the window
    */
    public setWindowTitle(title: string) {
        document.title = Navigation_Services.getDefaultPageTitle(title);
    }

    /**
     * Open a new window to the specified url
     *
     * @param url Url of the new window
     * @param features Comma-separated list of features/specs sent as the 3rd parameter to window.open. For example: "height=400,width=400".
     */
    public openNewWindow(url: string, features: string) {
        var win = window.open(url, "_blank", features);
        (<any>win).opener = null;
    }

    /**
     * Navigate the parent page to the specified url
     *
     * @param url Url to navigate to
     */
    public navigate(url: string) {
        window.location.href = url;
    }
}

SDK_Shim.VSS.register("ms.vss-web.navigation-service", new HostNavigationService());
SDK_Shim.VSS.register("navigation-service", new HostNavigationService());
