import { EventManager } from "Build/Scripts/Events/EventManager";

export namespace AllBuildsEvents {
    export const Navigation = "Navigation";
    export const ResultsAvailable = "ResultsAvailable";
}

export type EmptyCallBack = () => void;

// object where we can hook up events to
export class AllBuildsEventManager extends EventManager {
    private _navigationStateChangedCallBack: EmptyCallBack = null;

    public addNavigationStateChangedListener(listener: EmptyCallBack) {
        return this.addEventGroupListener(AllBuildsEvents.Navigation, listener);
    }

    public raiseNavigationStateChanged() {
        this.raiseEvent(AllBuildsEvents.Navigation);
    }

    public dispose() {
        if (this._navigationStateChangedCallBack) {
            this.removeEventGroupListener(AllBuildsEvents.Navigation, this._navigationStateChangedCallBack)
        }
    }
}

var __eventManager: AllBuildsEventManager = null;
export function getAllBuildsEventManager(): AllBuildsEventManager {
    if (!__eventManager) {
        __eventManager = new AllBuildsEventManager();
    }

    return __eventManager;
}

