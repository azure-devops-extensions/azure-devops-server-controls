import * as VSSStore from "VSS/Flux/Store";
import * as Models from "Search/Scripts/React/Models";
import Service = require("VSS/Service");
import Settings = require("VSS/Settings");
import { UserPreferenceScope } from "Search/Scripts/UserPreferences/TFS.Search.UserPreferences";
import { WorkItemConstants } from "Search/Scripts/Providers/WorkItem/TFS.Search.WorkItem.Constants";
import { SearchConstants } from "Search/Scripts/Common/TFS.Search.Constants";

export interface IResultsViewSortCriteriaStoreState {
    sortOptions: Models.ISortOption[]
}

export class SortCriteriaStore extends VSSStore.Store {
    private state: IResultsViewSortCriteriaStoreState;
    private localSettingsService: Settings.LocalSettingsService;

    constructor(localSettingsService?: Settings.LocalSettingsService) {
        super();
        this.state = { sortOptions: this._getInitialState(null) };
        this.localSettingsService = localSettingsService || Service.getLocalService(Settings.LocalSettingsService);
    }
    
    public initialize(currentSearchProvider: Models.SearchProvider) {
        this.state.sortOptions = this._getInitialState(currentSearchProvider);
        this.emitChanged();
    }

    public changeResultsSortCriteria(sortOptions: Models.ISortOption[], currentSearchProvider: Models.SearchProvider) {
        if (sortOptions &&
            currentSearchProvider === Models.SearchProvider.code) {
            this.localSettingsService.write(
                SearchConstants.CODE_SEARCH_SORT_PREF_KEY,
                sortOptions,
                Settings.LocalSettingsScope.Global);     
        }
        
        this.state.sortOptions = sortOptions || this._getInitialState(currentSearchProvider);
        this.emitChanged();
    }
    
    public get sortOptions(): Models.ISortOption[] {
        return this
            .state
            .sortOptions;
    }

    public get firstSortOption(): Models.ISortOption {
        return this
            .state
            .sortOptions[0];
    }

    private _getInitialState(currentSearchProvider: Models.SearchProvider): Models.ISortOption[] {
        // This is to pertain sort option preference in case of Code Search Client-side sorting.       
        if (currentSearchProvider !== null &&
            currentSearchProvider === Models.SearchProvider.code) {
            let sortOptionPreference = this.localSettingsService.read(
                SearchConstants.CODE_SEARCH_SORT_PREF_KEY,
                null,
                Settings.LocalSettingsScope.Global);

            if (sortOptionPreference) {
                return sortOptionPreference;
            }
        }

        return [{
            field: WorkItemConstants.RELEVANCE_FIELD_REFERENCE_NAME,
            sortOrder: "desc"
        }];
    }
}


