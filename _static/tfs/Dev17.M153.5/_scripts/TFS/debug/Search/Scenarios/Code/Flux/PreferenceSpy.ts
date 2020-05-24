import { ActionsHub } from "Search/Scenarios/Code/Flux/ActionsHub";
import { SearchStartedPayload } from "Search/Scenarios/Shared/Base/ActionsHub";
import { SearchQuery } from "Search/Scenarios/WebApi/Code.Contracts";
import { LocalFilterPreferenceStorage } from "Search/Scenarios/Code/Flux/LocalPreferenceStorage";

export class PreferenceSpy {
    private disposeActions: Function[] = [];

    constructor(actionsHub: ActionsHub, private localFilterPreferenceStorage: LocalFilterPreferenceStorage) {
        actionsHub.searchStarted.addListener(this.onSearchStarted);

        this.disposeActions.push(() => actionsHub.searchStarted.removeListener(this.onSearchStarted));
    }

    public dispose = (): void => {
        this.disposeActions.forEach(action => action());
    }

    private onSearchStarted = (payload: SearchStartedPayload<SearchQuery>): void => {
        if (payload.filterApplication) {
            this.localFilterPreferenceStorage.writeLocalPreference(payload.query.searchFilters);
        }
    }
}