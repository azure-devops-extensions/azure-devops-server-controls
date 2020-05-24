import * as BaseActionsHub from "Search/Scenarios/Shared/Base/ActionsHub";
import * as EventsServices from "VSS/Events/Services";
import * as SearchEvents from "Search/Scenarios/Shared/Events";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as Utils from "Search/Scenarios/Shared/Utils";
import { ActionsHub } from "Search/Scenarios/ExtensionStatus/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/ExtensionStatus/Flux/StoresHub";
import { getHistoryService } from "VSS/Navigation/Services";

/**
 * Creates event to update results count on pivots based on actions in install code search page.
 */
export class CountSpy {
  
    constructor(private actionsHub: ActionsHub, private storesHub: StoresHub) {
        this.registerActionsHubHandlers();
    }

    public dispose(): void {
        this.disposeActionsHubHandlers();
    }

    private registerActionsHubHandlers(): void {
        this.actionsHub.extensionStateDataLoadStarted.addListener(this.onExtensionDataLoadStarted);
        this.actionsHub.extensionStateDataLoaded.addListener(this.onExtensionDataLoaded);
    }

    private disposeActionsHubHandlers(): void {
        this.actionsHub.extensionStateDataLoadStarted.removeListener(this.onExtensionDataLoadStarted);
        this.actionsHub.extensionStateDataLoaded.removeListener(this.onExtensionDataLoaded);
    }

    private onExtensionDataLoaded = (): void => {
        const resultsCount = 0,
              currentParams = getHistoryService().getCurrentState() as _NavigationHandler.UrlParams,
              filters = Utils.deserialize<{ [id: string]: string[] }>(currentParams.filters) || {};
        if (currentParams !== null && currentParams.text && currentParams.text !== "") {
            EventsServices.getService().fire(SearchEvents.ENTITY_SEARCH_COMPLETED, this, {
                resultsCount,
                searchFilters: filters,
                searchText: currentParams.text,
            } as SearchEvents.ISearchResultsPayload);
        }
    }

	private onExtensionDataLoadStarted = (): void => {
        const currentParams = getHistoryService().getCurrentState() as _NavigationHandler.UrlParams,
              filters = Utils.deserialize<{ [id: string]: string[] }>(currentParams.filters) || {};
        if (currentParams !== null && currentParams.text && currentParams.text !== "") {
            EventsServices.getService().fire(SearchEvents.ENTITY_SEARCH_STARTED, this, {
                searchFilters: filters,
                searchText: currentParams.text,
            } as SearchEvents.ISearchStartedPayload);
        }
    } 
}
