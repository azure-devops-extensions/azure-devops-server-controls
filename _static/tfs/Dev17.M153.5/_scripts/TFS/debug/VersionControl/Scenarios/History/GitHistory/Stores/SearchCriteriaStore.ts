import * as VSSStore from  "VSS/Flux/Store";
import { GitHistorySearchCriteria } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionsHub";


export interface SearchCriteriaState {
    searchCriteria: GitHistorySearchCriteria;
}

/**
 * A store containing the state of the currently displayed version (changeset or commit).
 */
export class SearchCriteriaStore extends VSSStore.Store {
    public state = {
        searchCriteria: {}
    } as SearchCriteriaState;

    public updateSearchCriteria = (payload: GitHistorySearchCriteria): void => {
        if (this.state.searchCriteria !== payload) {
            this.state.searchCriteria = payload;
            this.emitChanged();
        }
    }

}
