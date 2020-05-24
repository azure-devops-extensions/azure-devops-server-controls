
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Services = require("VSS/Contributions/Services");
import Events_Page = require("VSS/Events/Page");
import Events_Services = require("VSS/Events/Services");
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import SDK_Shim = require("VSS/SDK/Shim");
import Service = require("VSS/Service");
import Utils_Array = require("VSS/Utils/Array");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

class PageEventSubscriptionsManager {
    private _firedEvents: string[] = [];
    private _firedEventArgs: any = {};

    private _notifiedSubscriptions: IDictionaryStringTo<boolean> = {};
    private _subscriptionsPromise: IPromise<Contributions_Contracts.Contribution[]>;

    public static start(): PageEventSubscriptionsManager {
        return new PageEventSubscriptionsManager();
    }

    constructor() {
        // Subscribe to all page events
        Events_Page.getService().subscribe('*', (e: Events_Page.IPageEvent) => {
            this._eventFired(e.name, e.args);
        });

        Events_Services.getService().attachEvent(HubEventNames.ProcessXHRNavigate, (sender: any, args: IHubEventArgs) => {
            // Clear the subscriptions promise so that we load any new subscriptions from new content.
            this._subscriptionsPromise = null;
        });
    }

    private _getSubscriptions(): IPromise<Contributions_Contracts.Contribution[]> {
        if (!this._subscriptionsPromise) {
            this._subscriptionsPromise = Service.getService(Contributions_Services.ExtensionService).getLoadedContributionsOfType("ms.vss-web.page-event-subscription");
        }

        return this._subscriptionsPromise;
    }

    private _getSubscriptionId(subscription: Contributions_Contracts.Contribution): string {
        let contentProperties: any = subscription.properties["content"] || {};
        return contentProperties["initialize"] || subscription.id;
    }

    private _getSubscriptionModules(subscription: Contributions_Contracts.Contribution): string[] {
        let contentProperties: any = subscription.properties["content"] || {};
        return contentProperties["require"];
    }

    private _isReadyToNotify(subscriptionEvents: string[]): boolean {
        subscriptionEvents = subscriptionEvents || [];
        const firedEvents = this._firedEvents || [];
        if (subscriptionEvents.length === 0 || firedEvents.length === 0) {
            return false;
        }

        return subscriptionEvents.every(e => firedEvents.indexOf(e) >= 0);
    }

    private _notifySubscriptions(subscriptions: Contributions_Contracts.Contribution[], events: string[], args: any): void {
        // Iterate through subscriptions which have not been notified yet
        for (let subscription of subscriptions.filter(s => this._notifiedSubscriptions[this._getSubscriptionId(s)] !== true)) {
            if (Contributions_Services.ExtensionHelper.hasInternalContent(subscription)) {
                let events: string[] = subscription.properties["events"];
                if (this._isReadyToNotify(events)) {
                    var requireModules = this._getSubscriptionModules(subscription);
                    if (requireModules) {
                        let id = this._getSubscriptionId(subscription);
                        // Mark this subscription as loaded
                        this._notifiedSubscriptions[id] = true;

                        let excludeOptions = <VSS.DynamicModuleExcludeOptions>subscription.properties["bundleExcludeOptions"];
                        if (isNaN(excludeOptions)) {
                            excludeOptions = VSS.DynamicModuleExcludeOptions.CommonModules;
                        }

                        VSS.requireModules(requireModules, { excludeOptions: excludeOptions }).then(() => {
                            // Ensure that registrars are notified about this event(s)
                            SDK_Shim.VSS.getRegisteredObject(id, args);
                        });
                    }
                }
            }
        }
    }

    private _eventFired(eventName: string, args?: any): void {
        this._getSubscriptions().then((subscriptions: Contributions_Contracts.Contribution[]) => {

            const firedEvents = this._firedEvents;
            const firedEventArgs = this._firedEventArgs;

            // Fire event if it's not fired already
            if (firedEvents.indexOf(eventName) < 0) {
                firedEvents.push(eventName);
                $.extend(firedEventArgs, args);
                this._notifySubscriptions(subscriptions, firedEvents, firedEventArgs);
            }
        });
    }
}

PageEventSubscriptionsManager.start();

