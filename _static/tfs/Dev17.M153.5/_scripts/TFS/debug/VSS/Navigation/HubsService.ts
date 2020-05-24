/// <reference path='../../VSS/References/SDK.Interfaces.d.ts' />

import Ajax = require("VSS/Ajax");
import Bundling = require("VSS/Bundling");
import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Events_Action = require("VSS/Events/Action");
import Events_Services = require("VSS/Events/Services");
import Locations = require("VSS/Locations");
import PlatformContracts = require("VSS/Common/Contracts/Platform");
import Serialization = require("VSS/Serialization");
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import Utils_Url = require("VSS/Utils/Url");

/**
 * Hub-related event names
 */
export module HubEventNames {
    /**
     * Event fired when xhr navigate is initiated.  This will fire prior to PreXHRNavigate.
     */
    export const XHRNavigateStarted = "hub-navigate-started";

    /**
     * Event fired before the AJAX call is made to get data for the hub being navigated to
     */
    export const PreXHRNavigate = "hub-navigate-pre-xhr";

    /**
     * Event fired after the XHR request of a navigation has completed, allowing services to update their context.
     */
    export const ProcessXHRNavigate = "hub-navigate-process";

    /**
     * Event fired after an XHR navigation has completed. UI can update itself with the new hub's UI on this event
     */
    export const PostXHRNavigate = "hub-navigate-post-xhr";

    /**
     * Event fired when the selected hub has changed. The navigation-related UI should update itself when this event is fired
     */
    export const SelectedHubChanged = "selected-hub-changed";
}

/**
* Argument data passed to hub events
*/
export interface IHubEventArgs {

    /**
    * The id of the hub that the event corresponds to
    */
    hubId?: string;

    /**
    * The hub that the event corresponds to
    */
    hub?: Hub;

    /**
    * The page json data from 
    */
    pageXHRData?: PlatformContracts.PageXHRData;
}

/**
 * Service for managing the hubs on the current page
 */
export class HubsService implements Service.ILocalService {

    private static LOCAL_STORAGE_KEY = "LastUsedHubs";

    private _hubsContext: Contracts_Platform.HubsContext;
    private _pinningPreferences: PinningPreferences;

    constructor() {

        this._hubsContext = Context.getPageContext().hubsContext || <Contracts_Platform.HubsContext>{};
        this._pinningPreferences = this._hubsContext.pinningPreferences || <PinningPreferences>{};

        if (!this._pinningPreferences.pinnedHubGroupIds) {
            this._pinningPreferences.pinnedHubGroupIds = [];
        }
        if (!this._pinningPreferences.unpinnedHubGroupIds) {
            this._pinningPreferences.unpinnedHubGroupIds = [];
        }
        if (!this._pinningPreferences.pinnedHubs) {
            this._pinningPreferences.pinnedHubs = {};
        }
        if (!this._pinningPreferences.unpinnedHubs) {
            this._pinningPreferences.unpinnedHubs = {};
        }
    }

    /**
     * Get the id of the selected hub group
     */
    public getSelectedHubGroupId(): string {
        return this._hubsContext.selectedHubGroupId;
    }

    /**
     * Get the id of the selected hub
     */
    public getSelectedHubId(): string {
        return this._hubsContext.selectedHubId;
    }

    /**
     * Gets all hub groups
     */
    public getHubGroups() {
        return this._hubsContext.hubGroups || [];
    }

    /**
     * Get the hubs in the specified hub group
     *
     * @param id Id of the hub group
     * @param excludeContributed If true, exclude contributed hubs
     * @param excludeBuiltIn If true, exclude built-in hubs
     * @param includeHidden If true, exclude hidden hubs
     */
    public getHubsByGroupId(id: string, excludeContributed: boolean = false, excludeBuiltIn: boolean = false, includeHidden: boolean = false): Hub[] {
        let hubs = this._hubsContext.allHubs || [];
        return hubs.filter(h => Utils_String.defaultComparer(id, h.groupId) === 0 && (!excludeContributed || Boolean(h.builtIn)) && !(excludeBuiltIn && Boolean(h.builtIn)) && (!h.hidden || includeHidden));
    }

    /**
     * Gets the hub group by its id.
     *
     * @param id Id of the hub group to return.
     * @returns {HubGroup}
     */
    public getHubGroupById(id: string): HubGroup {
        let hubGroups = this._hubsContext.hubGroups || [];
        return Utils_Array.first(hubGroups, hg => Utils_String.ignoreCaseComparer(id, hg.id) === 0);
    }

    /**
     * Gets the hub by its id
     *
     * @param id Id of the hub to return
     */
    public getHubById(id: string): Hub {
        let hubs = this._hubsContext.allHubs || [];
        return Utils_Array.first(hubs, h => Utils_String.ignoreCaseComparer(id, h.id) === 0);
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Pinning
    /////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Gets non-built in, pinned hubs.
     *
     * @param hubGroupId Id of the hub group
     */
    public getPinnedHubsByGroupId(hubGroupId: string): { pinnedHubs: Hub[], unpinnedHubs: Hub[] } {
        let allHubs = this.getHubsByGroupId(hubGroupId, false, true).sort((a, b) => a.order - b.order);
        let pinnedHubIds = this._pinningPreferences.pinnedHubs[hubGroupId] || [];
        let unpinnedHubIds = this._pinningPreferences.unpinnedHubs[hubGroupId] || [];

        let pinnedHubs = allHubs.filter(h => pinnedHubIds.indexOf(h.id) >= 0 && !h.hidden);
        let unpinnedHubs = allHubs.filter(h => unpinnedHubIds.indexOf(h.id) >= 0 && !h.hidden);
        // hubs that aren't explicitly unpinned are assumed to be pinned
        let defaultHubs = allHubs.filter(h => pinnedHubIds.indexOf(h.id) === -1 && unpinnedHubIds.indexOf(h.id) === -1 && !h.hidden);

        // sort pinned hubs in the order they were pinned
        let orders: { [hubGroupId: string]: number } = {};
        pinnedHubIds.forEach((id, i) => { orders[id] = i; });
        pinnedHubs.sort((a, b) => orders[a.id] - orders[b.id]);

        return { pinnedHubs: pinnedHubs.concat(defaultHubs), unpinnedHubs: unpinnedHubs };
    }

    /**
     * Is the specified hub group explicitly pinned by the user?
     *
     * @param hubGroup The hub group to check
     */
    public isHubGroupPinned(hubGroup: HubGroup): boolean {
        return this._pinningPreferences.pinnedHubGroupIds.indexOf(hubGroup.id) !== -1;
    }

    /**
     * Is the specified hub group explicitly unpinned by the user?
     *
     * @param hubGroup Hub group to check
     */
    public isHubGroupUnpinned(hubGroup: HubGroup): boolean {
        return this._pinningPreferences.unpinnedHubGroupIds.indexOf(hubGroup.id) !== -1;
    }

    /**
     * Pin the hub group for the current user
     *
     * @param hubGroup Hub group to pin
     */
    public pinHubGroup(hubGroup: HubGroup) {
        this._pinningPreferences.pinnedHubGroupIds.push(hubGroup.id);
        Utils_Array.remove(this._pinningPreferences.unpinnedHubGroupIds, hubGroup.id);
    }

    /**
     * Unpin the hub group for the current user
     *
     * @param hubGroup Hub group to unpin
     */
    public unpinHubGroup(hubGroup: HubGroup) {
        this._pinningPreferences.unpinnedHubGroupIds.push(hubGroup.id);
        Utils_Array.remove(this._pinningPreferences.pinnedHubGroupIds, hubGroup.id);
    }

    /**
     * Returns true if the specified hub has not been explicitly unpinned by the current user
     *
     * @param hub The hub to check
     */
    public isHubPinned(hub: Hub): boolean {
        // default is pinned, so only check if unpinned
        const unpinned = this._pinningPreferences && this._pinningPreferences.unpinnedHubs[hub.groupId] || [];
        return unpinned.indexOf(hub.id) === -1;
    }

    /**
     * Pin the specified hub for the current user
     *
     * @param hub Hub to pin
     */
    public pinHub(hub: Hub) {
        if (!this._pinningPreferences.pinnedHubs[hub.groupId]) {
            this._pinningPreferences.pinnedHubs[hub.groupId] = [];
        }
        this._pinningPreferences.pinnedHubs[hub.groupId].push(hub.id);

        if (this._pinningPreferences.unpinnedHubs[hub.groupId]) {
            Utils_Array.remove(this._pinningPreferences.unpinnedHubs[hub.groupId], hub.id);
        }
    }

    /**
     * Unpin the specified hub for the current user
     *
     * @param hub Hub to unpin
     */
    public unpinHub(hub: Hub) {
        if (this._pinningPreferences.pinnedHubs[hub.groupId]) {
            Utils_Array.remove(this._pinningPreferences.pinnedHubs[hub.groupId], hub.id);
        }

        if (!this._pinningPreferences.unpinnedHubs[hub.groupId]) {
            this._pinningPreferences.unpinnedHubs[hub.groupId] = [];
        }
        this._pinningPreferences.unpinnedHubs[hub.groupId].push(hub.id);
    }

    public getPinningPreferences() {
        return this._pinningPreferences;
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Hub group's last-hub
    /////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Get the default hub to use for the specified hub group
     *
     * @param hubGroup The hub group whose default hub to return
     * @param hubGroupHubs Optional list of the hubs to consider for the group.
     */
    public getDefaultHubForHubGroup(hubGroup: HubGroup, hubGroupHubs?: Hub[]): Hub {

        const storageService = Service.getLocalService(Settings.LocalSettingsService);
        const mruHubId = storageService.read(`${HubsService.LOCAL_STORAGE_KEY}/${hubGroup.id}`, null);

        if (!hubGroupHubs) {
            hubGroupHubs = this.getHubsByGroupId(hubGroup.id, false, false, true);
        }

        let defaultHub: Hub = null;

        if (mruHubId) {
            for (let i = 0; i < hubGroupHubs.length; ++i) {
                if (hubGroupHubs[i].id === mruHubId) {
                    defaultHub = hubGroupHubs[i];
                    break;
                }
            }
        }

        if (!defaultHub && hubGroupHubs.length) {
            defaultHub = hubGroupHubs[0];
            for (let i = 1; i < hubGroupHubs.length; ++i) {
                if (hubGroupHubs[i].order < defaultHub.order) {
                    defaultHub = hubGroupHubs[i];
                }
            }
        }

        return defaultHub;
    }

    /**
     * Saves details of the current route to Local Storage, keyed off of the Hub Group ID.
     *
     * @param hubGroupId The id of the hub group
     * @param hubId The id of the hub to save/remember as the default hub for the hub group for this user
     */
    public saveDefaultHubForGroup(hubGroupId: string, hubId: string) {
        const storageService = Service.getLocalService(Settings.LocalSettingsService);
        storageService.write(`${HubsService.LOCAL_STORAGE_KEY}/${hubGroupId}`, hubId);
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // Hub navigation
    /////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Trigger the global selected-hub-changed event, letting the system know that the current hub
     * has changed, so all navigation-related elements should be updated appropriately.
     *
     * @param hubId The id of the newly selected hub
     */
    public triggerSelectedHubChangedEvent(hubId: string) {
        Events_Services.getService().fire(HubEventNames.SelectedHubChanged, this, { hubId: hubId });
    }

    /**
     * Navigate the page to the specified hub
     *
     * @param hubId Id of the hub to navigate to
     * @param url (Optional) Specific url to navigate to. The hub's default url if not specified.
     */
    public navigateToHub(hubId: string, url?: string) {
        let handled = Events_Action.getService().performAction("handle-hub-navigate", { hubId: hubId, url: url });
        if (!handled) {
            if (!url) {
                const hub = this.getHubById(hubId);
                if (hub) {
                    url = hub.uri;
                }
            }
            if (url) {
                window.location.href = url;
            }
        }
    }

    /**
     * Replace current hub state
     *
     * @param hubId Id of the hub to navigate to
     * @param url (Optional) Specific url to navigate to. The hub's default url if not specified.
     */
    public replaceCurrentHubState(hubId: string, url?: string) {
        Events_Action.getService().performAction("handle-hub-state-replace", { hubId: hubId, url: url });
    }

    /**
     * Get an event handler to navigate to the specified hub
     *
     * @param hubId Id of the hub to navigate to
     * @param url Optional specific url for the hub (the hub's default url if not specified)
     */
    public getHubNavigateHandler(hubId: string, url?: string) {
        return (e) => {
            // Return false to indicate that the event was handled and to stop propagation and prevent the default handler.
            // Otherwise return true to let other event handlers and/or the default handler run.
            let actionHandled;

            if (e && (e.ctrlKey || e.metaKey || e.shiftKey || e.which === 2)) {
                // Don't do the XHR hub navigate if this is a ctrl-click, command-click, shift-click, or middle-click event.
                actionHandled = false;
            }
            else {
                actionHandled = Events_Action.getService().performAction("handle-hub-navigate", { hubId: hubId, url: url });
            }

            return !actionHandled;
        };
    }
}