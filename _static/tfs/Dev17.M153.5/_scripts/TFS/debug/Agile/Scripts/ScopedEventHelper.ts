import Events_Services = require("VSS/Events/Services");
import { Debug } from "VSS/Diag";

export class ScopedEventHelper {
    private _scope: string;
    private _eventSvc: Events_Services.EventService = null;
    public constructor(scope) {
        this._scope = scope;
        this._eventSvc = Events_Services.getService();
    }

    public attachEvent(eventName: string, handler: IEventHandler): void {
        Debug.assertIsNotNull(this._eventSvc, "EventService instance should have been initialized.");

        if (this._eventSvc) {
            this._eventSvc.attachEvent(eventName, handler, this._scope);
        }
    }

    public fire(eventName: string, sender?: any, eventArgs?: any): boolean {
        Debug.assertIsNotNull(this._eventSvc, "EventService instance should have been initialized.");

        if (this._eventSvc) {
            return this._eventSvc.fire(eventName, sender, eventArgs, this._scope);
        }
    }

    public detachEvent(eventName: string, handler: IEventHandler): void {
        if (this._eventSvc) {
            this._eventSvc.detachEvent(eventName, handler, this._scope);
        }
    }

    public dispose() {
        if (this._scope) {
            this._eventSvc.disposeScope(this._scope);
            this._scope = null;
            this._eventSvc = null;
        }
    }

    public getScope() {
        return this._scope;
    }
}