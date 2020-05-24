import * as VSSStore from "VSS/Flux/Store";
import { PushesSearchFilterData } from "VersionControl/Scenarios/Pushes/ActionsHub";
import { PushesLocalStorageHelper } from "VersionControl/Scenarios/Pushes/Sources/PushesLocalStorageHelper";

export interface SearchCriteriaState {
    searchCriteria: PushesSearchFilterData;
    isFilterPanelVisible: boolean;
    isFilterApplied?: boolean;
}

/**
 * A store containing the state of the current searches of pushes page.
 */
export class SearchCriteriaStore extends VSSStore.RemoteStore {
    private _state = {} as SearchCriteriaState;

    constructor() {
        super();
        this._state = {
            searchCriteria: {},
            isFilterPanelVisible: PushesLocalStorageHelper.getFilterPaneVisibility(),
        }
    }

    public changeSearchCriteria = (searchCriteria: PushesSearchFilterData): void => {
        if (!this._state.searchCriteria || this._state.searchCriteria !== searchCriteria) {
            this._state.searchCriteria = searchCriteria;
            this._state.isFilterApplied = this._isFilterApplied(searchCriteria);
            this.emitChanged();
        }
    }

    public toggleFilterPanelVisibility = (): void => {
        this._state.isFilterPanelVisible = !this._state.isFilterPanelVisible;
        this.emitChanged();
    }

    public getState = (): SearchCriteriaState => {
        return this._state;
    }

    private _isFilterApplied = (searchCriteria: PushesSearchFilterData): boolean => {
        return(
            !!searchCriteria.fromDate   ||
            !!searchCriteria.toDate     ||
            !!searchCriteria.userId     ||
            !!searchCriteria.userName   ||
            !!searchCriteria.excludeUsers
        );
    }
}