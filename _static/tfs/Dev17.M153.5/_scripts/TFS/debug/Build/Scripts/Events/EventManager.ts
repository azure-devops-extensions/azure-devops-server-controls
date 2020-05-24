import { EventGroup } from 'OfficeFabric/Utilities';

// object where we can hook up events to
export class EventManager {
    private _eventGroup: EventGroup;

    constructor() {
        this._eventGroup = new EventGroup(this);
    }

    public raiseEvent(eventName: string, args?: any) {
        this._eventGroup.raise(eventName, args);
    }

    public addEventGroupListener(eventName: string, callBack: (args: any) => void) {
        this._eventGroup.on(this, eventName, callBack);
    }

    public removeEventGroupListener(eventName: string, callBack: (args: any) => void) {
        this._eventGroup.off(this, eventName, callBack);
    }
}