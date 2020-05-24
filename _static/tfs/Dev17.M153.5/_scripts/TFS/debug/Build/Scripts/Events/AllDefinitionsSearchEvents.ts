import { EventManager } from "Build/Scripts/Events/EventManager";
import { logError } from "VSS/Diag";

var eventManager: AllDefinitionsSearchEventManager = null;

export class AllDefinitionsSearchEvents {
    public static SEARCH_RESULTS_AVAILABLE = "MESSAGE_SEARCH_RESULTS_AVAILABLE_TEXT";
}

export function getAllDefinitionsSearchEventManager(): AllDefinitionsSearchEventManager {
    if (eventManager == null) {
        eventManager = new AllDefinitionsSearchEventManager();
    }

    return eventManager;
}

export function raiseSearchResultsAvailableMessage(message: string) {
    if (eventManager == null) {
        // this means no one hooked up to listen yet (getAllDefinitionsSearchEventManager should have been called)
        logError("raiseSearchResultsAvailableMessage: No aria-live messages would be displayed to the user, since event was raised before someone listens on this...this is no-op");
    }
    else {
        eventManager.raiseEvent(AllDefinitionsSearchEvents.SEARCH_RESULTS_AVAILABLE, message);
    }
}

// object where we can hook up events to
export class AllDefinitionsSearchEventManager extends EventManager {
}