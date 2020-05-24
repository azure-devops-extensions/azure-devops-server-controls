
import { NamedEventCollection } from "VSS/Events/Handlers";
import { getLocalService, ILocalService } from "VSS/Service";

export class EventService implements ILocalService {

    private _events: NamedEventCollection<any, any>;
    private _scopedEvents: IDictionaryStringTo<NamedEventCollection<any, any>> = {};
    
    public fire(eventName: string, sender?: any, eventArgs?: any, scope?: string): boolean {
        // Notifying all the subscribers
        return this._fireEvent(eventName, sender, eventArgs, scope);
    }

    /**
     * Attatch a handler to an event.
     * 
     * @param eventName The event name.
     * @param handler The handler to attach.
     * @param scope The scope of the event.
     */
    public attachEvent(eventName: string, handler: IEventHandler, scope?: string): void {
        const events = this._getNamedEvents(scope);
        events.subscribe(eventName, <any>handler);
    }

    /**
     * Detatch a handler from an event.
     * 
     * @param eventName The event name.
     * @param handler The handler to detach.
     * @param scope The scope of the event.
     */
    public detachEvent(eventName: string, handler: IEventHandler, scope?: string): void {
        const events = this._getNamedEvents(scope);
        events.unsubscribe(eventName, <any>handler);
    }

    public disposeScope(scope: string) {
        if (scope && this._scopedEvents[scope]) {
            this._scopedEvents[scope].unsubscribeAll();
            this._scopedEvents[scope] = null;
        }
    }

    /**
     * Invoke the specified event passing the specified arguments.
     * 
     * @param eventName The event to invoke.
     * @param sender The sender of the event.
     * @param args The arguments to pass through to the specified event.
     * @param scope The scope of the event.
     */
    private _fireEvent(eventName: string, sender?: any, args?: any, scope?: string): boolean {
        const events = this._getNamedEvents(scope);

        if (events) {
            // Invoke handlers until a handler returns false to cancel handler chain.
            let eventBubbleCancelled = false;
            events.invokeHandlers(eventName, sender, args, (result) => {
                if (result === false) {
                    eventBubbleCancelled = true;
                    return true;
                }
            });

            if (eventBubbleCancelled) {
                return false;
            }
        }

        return false;
    }

    private _getNamedEvents(scope?: string) : NamedEventCollection<any, any> {
        if (scope) {
            if (!this._scopedEvents[scope]) {
                this._scopedEvents[scope] = new NamedEventCollection();
            }
            return this._scopedEvents[scope];
        }

        if (!this._events) {
            this._events = new NamedEventCollection();
        }
        return this._events;
    }
}

export function getService(): EventService {
    return getLocalService(EventService);
}