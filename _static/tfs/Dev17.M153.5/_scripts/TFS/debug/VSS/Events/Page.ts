
import Diag = require("VSS/Diag");

export module CommonPageEvents {
    export var PageInteractive = "page-interactive";
    export var InitialScriptsLoaded = "initial-scripts-loaded";
}

export interface IPageEventService {
    /**
     * Enables to subscribe a page event. 
     * Specify '*' as eventName to subscribe all events.
     *
     * @param eventName Name of the page event to subscribe.
     * @param callback Callback to invoke when the event is fired.
     */
    subscribe(eventName: string, callback: IPageEventCallback): void;

    /**
     * Enables to unsubscribe from a page event. 
     * Specify '*' as eventName to unsubscribe from all events.
     *
     * @param eventName Name of the page event to unsubscribe.
     * @param callback Callback to invoke when the event is fired.
     */
    unsubscribe(eventName: string, callback: IPageEventCallback): void;

    /**
     * Fires a page event.
     *
     * @param eventName Name of the page event to fire.
     * @param eventArgs Optional event arguments.
     */
    fire(eventName: string, eventArgs?: any): void;

    /**
     * Resets the specified event like it is not fired yet.
     */
    reset(eventName: string): void;

    /**
     * Clears all the subscriptions.
     */
    clear(): void;
}

export interface IPageEvent {
    /**
     * Name of the page event.
     */
    name: string;

    /**
     * Event arguments specified when the page event is fired.
     */
    args: any;
}

/**
 * Defines a page event callback.
 */
export interface IPageEventCallback {
    (event: IPageEvent): void;
}

class PageEventService implements IPageEventService {

    private _firedEvents: IDictionaryStringTo<IPageEvent> = {};
    private _eventCallbacks: IDictionaryStringTo<IPageEventCallback[]> = {};
    private _globalCallbacks: IPageEventCallback[] = [];

    public subscribe(eventName: string, callback: IPageEventCallback): void {
        if (!callback) {
            return;
        }

        if (eventName === '*') {
            this._subscribeAll(callback);
        }
        else {
            this._subscribeEvent(eventName, callback);
        }
    }

    private _subscribeEvent(eventName: string, callback: IPageEventCallback): void {
        let eventArgs = this._firedEvents[eventName];
        if (eventArgs) {
            // This event already fired, invoke callback
            callback(eventArgs);
        }
        else {
            // Still waiting for the event to be fired
            let callbacks = this._eventCallbacks[eventName];
            if (!callbacks) {
                callbacks = [];
                this._eventCallbacks[eventName] = callbacks;
            }

            callbacks.push(callback);
        }
    }

    private _subscribeAll(callback: IPageEventCallback): void {
        // First invoke any previously fired events
        let firedEvents = this._firedEvents;
        for (let eName in firedEvents) {
            if (firedEvents.hasOwnProperty(eName)) {
                callback(firedEvents[eName]);
            }
        }

        // Add to global callbacks
        this._globalCallbacks.push(callback);
    }

    public unsubscribe(eventName: string, callback: (eventArgs: IPageEvent) => void): void {
        if (!callback) {
            return;
        }

        let callbacks: IPageEventCallback[];
        if (eventName === '*') {
            callbacks = this._globalCallbacks;
        }
        else {
            callbacks = this._eventCallbacks[eventName] || [];
        }

        // Remove callback from the list
        let index = callbacks.indexOf(callback);
        if (index >= 0) {
            callbacks.splice(index, 1);
        }
    }

    public fire(eventName: string, args?: any): void {
        let callbacks = this._eventCallbacks;
        let eventArgs: IPageEvent = { name: eventName, args: args };

        // Invoke global callbacks as well as callbacks listening to this particular event
        let eventCallbacks = [].concat(callbacks[eventName] || [], this._globalCallbacks);
        for (let ecb of eventCallbacks) {
            if (ecb) {
                ecb(eventArgs);
            }
        }

        // These callbacks no longer needed
        delete callbacks[eventName];

        // Save args for later subscriptions
        this._firedEvents[eventName] = eventArgs;

        Diag.logInfo(`Page event fired: ${eventName}`);
    }

    public reset(eventName: string): void {
        delete this._firedEvents[eventName];
    }

    public clear(): void {
        this._firedEvents = {};
        this._eventCallbacks = {};
        this._globalCallbacks = [];
    }
}

var service = new PageEventService();

/**
 * Gets the singleton instance of the page event service.
 */
export function getService(): IPageEventService {
    return service;
}
